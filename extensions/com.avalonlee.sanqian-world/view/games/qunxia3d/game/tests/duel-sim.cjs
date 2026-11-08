/* duel-sim.cjs — 三招对决定种轨迹锚（M6 余量 · 计划书「锚进 CI 心态，漂移必归因」）
 *
 * 立因（册291 · 承册290 勘察）：duel 链路此前只有 table-check 的逐字段对表（两侧同输入同值），
 * 没有一件「定种完整打几场对决 → stdout 整块 md5」的轨迹锚——改 combat/tiles/masters/时间结算
 * 任何一枚进结算的数都会换 md5，红 = 提醒归因（工程规范 §4.42），不是事故。
 *
 * 用法（在扩展目录跑）：
 *   node view/games/qunxia3d/game/tests/duel-sim.cjs              # 常规定种跑（本件无随机参数，
 *                                                                  # 普通跑与锚跑同种子同形状；
 *                                                                  # 末行打「轨迹锚候选」作钉值取证）
 *   SQ_ANCHOR=1 node view/games/qunxia3d/game/tests/duel-sim.cjs  # 锚跑：额外在末行 marker 前对表
 * 判据：末行 `DUEL_SIM_ALL_GREEN n/n`；锚开时附 ` ‖ 锚对表相同 xxxxxxxx`，漂即
 *   `FAIL 轨迹锚漂移 …` 且退码 1。末行 marker 不参与哈希（避免自指，先例 = sim-playthrough）。
 *
 * 锚四要件（照 .tests/sim-playthrough.cjs「锚态由显式开关说了算」块注）：
 *   ① SQ_ANCHOR=1 强制走在册种子（本件普通跑即同种子，开关只决定是否对表）；
 *   ② 逐场读数收 TRAJ 数组 → join('\n') md5 在末行 marker 前对表；
 *   ③ 换锚必写归因（§4.42：哪一批改了结算/掉率/呈现计数），不许顺手改新值；
 *   ④ 锚不在门禁链自动跑（不进 run-dod.cjs，册290 勘察既定口径）。
 *
 * 轨迹口径（全真引擎路径，零手工对手、零字面量 id）：
 *   创角 sword_wanderer × vow_homestead（table-check m1pair 命格）→
 *   ① 切磋萧峰（st.masters[0]，masters.duelMaster 真路径）→ 吐纳过旬推旬绕切磋 CD →
 *   ② 切磋令狐冲（st.masters[1]）→ ③④ 官府悬赏两场（st.bounties 初始两条真海捕，
 *      tiles.startBountyDuel freeAp 真路径）→ 吐纳推旬至第 5 旬 → ⑤ 危机·费彬
 *      （checkAndSpawnCanonWorldEvent 旬结算自动排程 CANON_EVENTS_SCHEDULE 第 1 案，
 *      tiles.joinWorldCrisis 'join' 真路径）→ 推旬至第 10 旬 → ⑥ 危机·聚贤庄（第 2 案）。
 *   场间恢复一律走 tiles.meditateRest（真引擎吐纳过旬：hp/mp 回、ap 满、turn+1），
 *   不做状态直设——「标准玩家」只调函数不伸手改字段。
 *   出牌策略（确定性）：每轮出「首个内息付得起的已装备招式」（equippedMoves 表序），全付不起 →
 *   调息（combat.duelMeditate）；三招打完 combat.finishDuel 判胜。
 *
 * 随机纪律（册273）：mulberry32 单实例覆写 Math.random 贯穿全程（创角 + 吐纳旬结算 + 出牌
 * 敌方回合共吃一条序列），窗口结束 finally 还原——中途换种子 = 轨迹失同步，锚必漂。
 */
'use strict';
const path = require('path');
const crypto = require('crypto');

const GAME_DIR = path.resolve(__dirname, '..');
const coreData = require(path.join(GAME_DIR, 'core', 'data.js'));
const coreState = require(path.join(GAME_DIR, 'core', 'state.js'));
const combat = require(path.join(GAME_DIR, 'systems', 'combat.js'));
const tiles = require(path.join(GAME_DIR, 'systems', 'tiles.js'));
const masters = require(path.join(GAME_DIR, 'systems', 'masters.js'));
const D = coreData.D;

/* ── 锚四要件①：开关与在册种子 ───────────────────────────────────────── */
const ANCHOR_ON = process.env.SQ_ANCHOR === '1';
const ANCHOR_SEED = 20261109;
/* 锚四要件②：在册锚值（末行「轨迹锚候选」行的 md5 整值）。首钉 = 册291 本件首跑
 * （种子 20261109 · 22 断言全绿 · 双跑逐字同值自证后落笔）。换锚纪律（§4.42）：
 * 改锚必须写归因，不许顺手改新值。 */
const ANCHOR_MD5 = '4bc7f3d2cea2e102661c5870a33806a4';

/* mulberry32（照 table-check.cjs:63 同款实现） */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* 内存 stub 存档（applyOrigin 落盘口径；不读不写真档） */
const stubStore = (() => {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    clear: () => { m.clear(); }
  };
})();

/* env（照 table-check newEnv 形状：表现类 noop，rand 传贯穿实例） */
function newEnv(rand) {
  return {
    showToast: function () {},
    queueWorldResult: function (crisisId, outcome) {
      if (!crisisId || crisisId.indexOf('we_') !== 0) return;
      const q = JSON.parse(stubStore.getItem('qunxia-result-queue-v1') || '[]');
      q.push({ id: crisisId, outcome: outcome });
      stubStore.setItem('qunxia-result-queue-v1', JSON.stringify(q));
    },
    roadEncounter: function () {},
    tryOpenAftermath: function () { return false; },
    rand: rand
  };
}

/* ── 计数与轨迹 ─────────────────────────────────────────────────────── */
let passed = 0, failed = 0;
const failures = [];
const TRAJ = [];
function check(label, ok, detail) {
  if (ok) passed++; else { failed++; failures.push(label + (detail ? ' · ' + detail : '')); }
}

/* 随机窗口：buildRun 覆写、主轨迹 finally 还原（册273「窗口结束后立刻还原」） */
let realRandom = null;
function buildRun(seed) {
  const rand = mulberry32(seed);
  realRandom = Math.random;
  Math.random = rand; /* 单实例贯穿全程：创角 / 吐纳旬结算 / 出牌敌方回合共吃一条序列 */
  const st = coreState.initialState();
  coreState.applyOrigin(st, 'sword_wanderer', {
    name: '沈青锋',
    talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
    vow: 'vow_homestead',
    storage: stubStore,
    env: { rand: rand }
  });
  return { st: st, rand: rand };
}

/* 打一场（三招对决：每轮「首个内息付得起的已装备招式」，全付不起 → 调息） */
function playOne(run, env, params, label) {
  const st = run.st;
  const d = combat.initDuel(st, params, env);
  const enemyHp0 = d.enemyMaxHp;
  check(label + ' initDuel', d && d.maxRounds === 3 && !d.finished,
    d && d.maxRounds === 3 && !d.finished ? undefined : '开局态异常');

  let roundsPlayed = 0;
  for (let r = 1; r <= d.maxRounds; r++) {
    if (d.finished) break;
    const moves = (st.equippedMoves || []).map(id => D.MARTIAL_DB[id]).filter(Boolean);
    const card = moves.find(c => st.mp >= (c.mpCost || 0));
    if (card) combat.playDuelCard(st, d, card.id, env);
    else combat.duelMeditate(st, d, env);
    roundsPlayed = r;
  }
  if (!d.finished) combat.finishDuel(st, d, env);
  check(label + ' finish', d.finished === true, d.finished ? undefined : '终局未落');

  TRAJ.push([label, 'turn' + st.turn, params.enemyName, 'hp0=' + enemyHp0,
    'rounds=' + roundsPlayed, 'victory=' + (d.enemyCurHp <= 0 || d.playerWins >= d.enemyWins),
    'enemyHpEnd=' + d.enemyCurHp, 'stHp=' + st.hp, 'stMp=' + st.mp,
    'logs=' + d.logs.length].join('|'));
  console.log('  ' + TRAJ[TRAJ.length - 1]);
}

/* ── 主轨迹：创角 → 切磋×2 → 悬赏×2 → 危机×2（全程真引擎路径）──────── */
try {
  const run = buildRun(ANCHOR_SEED);
  const env = newEnv(run.rand);
  const st = run.st;

  check('创角可行', st.hp >= 35 && st.ap >= 1 && (st.bounties || []).length >= 2 && (st.masters || []).length >= 2,
    'hp=' + st.hp + ' ap=' + st.ap + ' bounties=' + (st.bounties || []).length);
  TRAJ.push(['创角', 'sword_wanderer×vow_homestead', 'hp=' + st.hp, 'mp=' + st.mp, 'ap=' + st.ap,
    'turn=' + st.turn, 'moves=' + (st.equippedMoves || []).length,
    'masters=' + (st.masters || []).length, 'bounties=' + (st.bounties || []).length].join('|'));
  console.log('  ' + TRAJ[TRAJ.length - 1]);

  /* ① 切磋萧峰（st.masters[0]，满血满足 hp≥35 门槛） */
  const m0 = st.masters[0];
  let params = masters.duelMaster(st, m0.id, env);
  check('①切磋' + m0.name + ' 成局', !!params, params ? undefined : 'duelMaster 返回 null');
  if (params) playOne(run, env, params, '①切磋');

  /* 场间吐纳过旬（真恢复路径；turn+1 绕切磋 CD） */
  tiles.meditateRest(st, env);

  /* ② 切磋令狐冲（st.masters[1]） */
  const m1 = st.masters[1];
  params = masters.duelMaster(st, m1.id, env);
  check('②切磋' + m1.name + ' 成局', !!params, params ? undefined : 'duelMaster 返回 null（可能 CD/气血未过）');
  if (params) playOne(run, env, params, '②切磋');

  tiles.meditateRest(st, env);

  /* ③④ 官府悬赏两场（st.bounties 初始真海捕，freeAp 真路径） */
  (st.bounties || []).slice(0, 2).map(b => b.region).forEach((regionId, i) => {
    const p = tiles.startBountyDuel(st, regionId, undefined, env, true);
    check('③④悬赏' + (i + 1) + ' 成局', !!p, p ? undefined : 'startBountyDuel 返回 null');
    if (p) playOne(run, env, p, '③④悬赏' + (i + 1));
  });

  /* ⑤⑥ 危机两场：吐纳推旬至 triggerTurn，旬结算自动排程（真路径），joinWorldCrisis 入局 */
  (D.CANON_EVENTS_SCHEDULE || []).slice(0, 2).forEach((ev, i) => {
    while (st.turn < ev.triggerTurn) tiles.meditateRest(st, env);
    check('⑤⑥危机' + (i + 1) + ' 自动排程', (st.crises || []).some(c => c.id === ev.id),
      'turn=' + st.turn + ' crises=' + JSON.stringify((st.crises || []).map(c => c.id)));
    const p = tiles.joinWorldCrisis(st, ev.id, env, 'join');
    check('⑤⑥危机' + (i + 1) + ' 成局', !!p && !p.aftermath, p ? undefined : 'joinWorldCrisis 返回 null');
    if (p && !p.aftermath) playOne(run, env, p, '⑤⑥危机' + (i + 1) + '(' + ev.id + ')');
  });

  check('轨迹七行', TRAJ.length === 1 + 6, 'TRAJ 行数=' + TRAJ.length);

  /* 锚四要件②：末行 marker 前对表 */
  const gotMd5 = crypto.createHash('md5').update(TRAJ.join('\n')).digest('hex');
  let anchorTxt = '';
  if (ANCHOR_ON) {
    if (gotMd5 !== ANCHOR_MD5) {
      failed++;
      failures.push('轨迹锚漂移 got=' + gotMd5 + ' want=' + ANCHOR_MD5 + '（换值必写归因 §4.42）');
      anchorTxt = '锚对表漂移 ' + gotMd5.slice(0, 8);
      console.log('  FAIL 轨迹锚漂移 got=' + gotMd5 + ' want=' + ANCHOR_MD5);
    } else {
      anchorTxt = '锚对表相同 ' + gotMd5.slice(0, 8);
    }
  }

  /* 末行 marker（不参与哈希） */
  console.log('DUEL_SIM_ALL_GREEN ' + passed + '/' + (passed + failed)
    + ' · 轨迹行 ' + TRAJ.length + ' · 种子 ' + ANCHOR_SEED
    + ' ‖ 轨迹锚候选 ' + gotMd5 + (ANCHOR_ON ? ' ‖ ' + anchorTxt : ''));
  if (failed > 0) {
    failures.forEach(f => console.log('  FAIL ' + f));
    process.exitCode = 1;
  }
} finally {
  /* 随机纪律：窗口结束立刻还原 Math.random */
  if (realRandom !== null) Math.random = realRandom;
}
