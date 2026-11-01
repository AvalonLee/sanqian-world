/* .tests/sim-wuxia.cjs — 武侠数值内核定种仿真（册160 · S3-a）
 * 标准玩家 200 章（10 卷 × 20 章）零干预，全走真实世界包入口（pack.claim / pack.narrative.advance），
 * 验证 = 数值与经济 §十 验收表（本件是那一张表「可仿真」的落地件）：
 *   ① 境界行逐卷对表：三流 / 二流 / 一流 / 一流 / 绝顶 / 绝顶 / 绝顶 / 宗师 / 宗师 / 大宗师；
 *   ② 两个卡点：卷 4 / 卷 7 卷末功力缺口 ∈ (200, 900]（§五「一次奇遇就能补上」的量级。
 *      正典草算 667/455 是整层倍数取整的近似——实测值随仿真钉死并勘正进 §十，验的是带不是数）；
 *   ③ 零干预违和恒 0（干预与代价 §三 验收硬线）；内伤恒 0（仿真无战斗）；终局功力 ≈ 30,345（±2%）；
 *   ④ 一局游戏内跨度 18~22 年（双时钟 §二；360 游戏日 = 1 年）。
 * 学艺日程（层数 / 到访 / 关系按卷直设）＝「标准玩家」模型——修习/游历的**操作循环**属后续批，
 * 本仿真验的是产出曲线 / 封顶 / 心境门槛 / 卡点投放这套**内核账**，不是修习界面（卷首注如实记）。
 * 定种与锚：全链不调 Math.random（章号散列），同参数逐位可复现；SQ_ANCHOR=1 时把逐卷读数行
 *   md5 对表在册锚（末行 marker 不参与哈希）。改锚必须写归因（AGENTS.md §4.42 纪律）。
 * 用法：node .tests/sim-wuxia.cjs            （链内跑，快；参数无副作用，锚种子恒定）
 *       SQ_ANCHOR=1 node .tests/sim-wuxia.cjs（锚对表跑）
 * 输出：逐卷读数行 + WUXIA_SIM_ALL_GREEN n/n ‖ 锚对表相同 <md5> / WUXIA_SIM_FAILED n。
 */
'use strict';
const crypto = require('crypto');
const { load } = require('./sandbox.cjs');
const { sandbox } = load([]);
const SQ = sandbox.window.SQ;

const pack = SQ.Worlds.wuxia.pack;
const D = pack.data;
const ARC_CHAPS = pack.narrative.arcChaps || 20;
const SEED = String(process.argv[2] || '20261101');
const ANCHOR_ON = process.env.SQ_ANCHOR === '1';
/* 在册锚（册160 首钉）：标准玩家 200 章零干预的逐卷读数指纹（种子 20261101）。
 * 🆕 首钉归因（册160 · S3-a）：本件与卡点投放机制（ARC_GAIN 两笔投放 / 心境门槛真谓词 /
 *   advance 卷事务）同批建立，锚值 = 建批首跑实测；三连跑指纹逐位相同自证可复现。
 * 改锚先复跑归因，别顺手换值（AGENTS.md §4.42）。 */
const ANCHOR_MD5 = '420764d84f11658efb41c0f7fed95677';

const fails = [];
function chk(no, cond, detail) {
  const tag = cond ? 'ok' : 'FAIL';
  console.log(`  ${tag} ${no} ${detail || ''}`);
  if (!cond) fails.push(no);
}

/* ── 标准玩家日程：卷下标 → 该卷期间的总层数拆分 / 累计到访数 / 关系补点 ──────────
 * 拆分原则（写死，不许随机）：neigong_basic 打够各心境门槛（7 层给绝顶、9 层给大宗师 artsMin），
 * yg_jiuyin（天阶）卷 8 起学、卷 10 满层（tian_full）；quan_basic 补总层数到 §五 加成行的整层近似。
 * 到访 = 首发 10 界内按卷推进（13 界全表，13 界 × 2 = 26 见闻 + 6 熟人 = 32 恰好摸到化境门——
 * 实际只需大宗师 32 ⇒ 第 10 卷前到位即可）；关系 = 卷 8 起 3 位（宗门门槛 sect3）、卷 9 起 6 位（见闻凑 32）。 */
const ART_PLAN = [
  /* vol: [ [artId, layer]... ]（卷初直设） */
  { layers: { quan_basic: 1, neigong_basic: 1 }, visited: 1, friends: 0 },
  { layers: { quan_basic: 1, neigong_basic: 4 }, visited: 2, friends: 0 },
  { layers: { quan_basic: 1, neigong_basic: 6 }, visited: 4, friends: 0 },
  { layers: { quan_basic: 3, neigong_basic: 7 }, visited: 5, friends: 0 },
  { layers: { quan_basic: 4, neigong_basic: 9 }, visited: 7, friends: 0 },
  { layers: { quan_basic: 7, neigong_basic: 11 }, visited: 9, friends: 0 },
  { layers: { quan_basic: 9, neigong_basic: 14 }, visited: 10, friends: 0 },
  { layers: { quan_basic: 9, neigong_basic: 16, yg_jiuyin: 3 }, visited: 11, friends: 3 },
  { layers: { quan_basic: 9, neigong_basic: 18, yg_jiuyin: 6 }, visited: 12, friends: 6 },
  { layers: { quan_basic: 9, neigong_basic: 20, yg_jiuyin: 9 }, visited: 13, friends: 6 }
];
/* 关系补点的人物（非同门散人 / 外家门派代表，affinity 30 越过「熟人」线 20） */
const FRIEND_IDS = ['ling_huohung', 'zhou_botong', 'huang_rong', 'guo_jing', 'yang_guo', 'xiao_feng'];
/* 到访序列：首发 10 界 id（ZONES launch=1），不足 13 的卷继续补非首发界 */
const ZONE_SEQ = (D.ZONES || []).map(function (z) { return z.i; });

/* ── 跑 200 章 ──────────────────────────────────────────────────────────────── */
const ws = pack.normalize(pack.initialState());
const volRows = [];
const inkMid = [];
for (let v = 0; v < 10; v++) {
  /* 卷初：标准玩家日程直设（修习循环属后续批，卷首注已记） */
  ws.artsLevels = Object.assign({}, ART_PLAN[v].layers);
  ws.artsKnown = Object.keys(ART_PLAN[v].layers);
  ws.visited = ZONE_SEQ.slice(0, ART_PLAN[v].visited);
  ws.relations = {};
  for (let f = 0; f < ART_PLAN[v].friends; f++) {
    ws.relations[FRIEND_IDS[f]] = { affinity: 30, kind: 'friend' };
  }
  const startQi = ws.qi;
  for (let c = 0; c < ARC_CHAPS; c++) {
    const r1 = pack.claim(ws, 36 * 60000, 0, {}, {});       /* 36 现实分钟/章 = 720 分/卷（§五 每卷验算口径） */
    if (r1 && r1.broke > 2) { chk('claim-连破', false, `卷${v + 1} 章章内连破 ${r1.broke} 档`); }
    pack.narrative.advance(ws, null, {});                    /* 零干预：不落笔 */
    if (c === 2) inkMid.push(ws.ink ? ws.ink.n : -1);        /* 卷中读墨（第 3 章完结后）= 本卷上限 */
  }
  const nx = (D.REALMS || []).find(function (r) { return r.r === ws.realm + 1; });
  volRows.push({
    vol: v + 1,
    realm: ws.realm,
    qi: Math.round(ws.qi * 10) / 10,
    gap: nx ? Math.round((nx.need - ws.qi) * 10) / 10 : 0,
    discord: ws.discord,
    injury: ws.injury,
    ink: ws.ink ? ws.ink.n : -1,
    days: ws.worldDay,
    gain: Math.round((ws.qi - startQi) * 10) / 10
  });
}

/* 逐卷读数行（锚参与哈希的就是这些行） */
for (const r of volRows) {
  console.log(`卷${r.vol} 境界=${r.realm} 功力=${r.qi} 距下档=${r.gap} 违和=${r.discord} 内伤=${r.injury} 墨=${r.ink} 卷增=${r.gain} 世界日=${r.days}`);
}

/* ── 验收断言 ───────────────────────────────────────────────────────────────── */
const CANON_REALMS = [1, 2, 3, 3, 4, 4, 4, 5, 5, 6];   /* 数值与经济 §十 境界行 */
const realmRow = CANON_REALMS.every(function (r, i) { return volRows[i].realm === r; });
chk('R1', realmRow, `境界行逐卷对表 ${JSON.stringify(volRows.map(function (r) { return r.realm; }))} vs 正典 ${JSON.stringify(CANON_REALMS)}`);

const STUCK_VOLS = [4, 7];                              /* 正典 §十 两个卡点 */
for (const sv of STUCK_VOLS) {
  const g = volRows[sv - 1].gap;
  chk(`K${sv}`, g > 200 && g <= 900, `卷${sv} 卡点缺口 ${g} ∈ (200,900]`);
}

const zeroDiscord = volRows.every(function (r) { return r.discord === 0; });
chk('R2', zeroDiscord, '零干预违和恒 0（干预与代价 §三 验收硬线）');

const zeroInjury = volRows.every(function (r) { return r.injury === 0; });
chk('R3', zeroInjury, '内伤恒 0（仿真无战斗通道）');

const endQi = volRows[9].qi;
chk('R4', Math.abs(endQi - 30345) / 30345 <= 0.02, `终局功力 ${endQi} ≈ 30,345（±2%）`);
chk('R5', volRows[9].realm === 6, '终局 = 大宗师（§五 收在最后一卷刚好破）');

const spanYears = volRows[9].days / 360;
chk('R6', spanYears >= 18 && spanYears <= 22, `一局跨度 ${spanYears.toFixed(1)} 年 ∈ [18,22]（双时钟 §二）`);

/* 墨上限按卷解锁：卷中读数 = 2/3/3/3/4/4/4/5/5/5（干预与代价 §二，度量感情不按等级） */
const INK_CAPS = [2, 3, 3, 3, 4, 4, 4, 5, 5, 5];
const inkOk = INK_CAPS.every(function (c, i) { return inkMid[i] === c; });
chk('R7', inkOk, `墨上限按卷 ${JSON.stringify(inkMid)} vs 正典 ${JSON.stringify(INK_CAPS)}`);

/* ── 锚对表 + 末行 ──────────────────────────────────────────────────────────── */
const lines = [];
{
  /* 从 volRows 重放读数行（与上方打印逐字同源，不依赖 console 劫持） */
  for (const r of volRows) {
    lines.push(`卷${r.vol} 境界=${r.realm} 功力=${r.qi} 距下档=${r.gap} 违和=${r.discord} 内伤=${r.injury} 墨=${r.ink} 卷增=${r.gain} 世界日=${r.days}`);
  }
}
const digest = crypto.createHash('md5').update(lines.join('\n'), 'utf8').digest('hex');
if (ANCHOR_ON) {
  if (!ANCHOR_MD5) {
    console.log(`FAIL 锚对表：ANCHOR_MD5 在册值为空——首次钉锚请把本次 digest 填进本件并附归因（种子 ${SEED}）`);
    fails.push('anchor');
  } else if (digest !== ANCHOR_MD5) {
    console.log(`FAIL 轨迹锚漂移：本跑 ${digest} ≠ 在册 ${ANCHOR_MD5}（种子 ${SEED}）。改了产出/门槛/投放类代码？先归因再改锚。`);
    fails.push('anchor');
  } else {
    console.log(`ok 锚对表相同 ${digest}`);
  }
} else {
  console.log(`读数指纹 ${digest}（SQ_ANCHOR=1 可对表在册锚）`);
}

const marker = fails.length
  ? `WUXIA_SIM_FAILED ${fails.length}`
  : `WUXIA_SIM_ALL_GREEN ${7 + STUCK_VOLS.length}/${7 + STUCK_VOLS.length}`;
console.log(marker);
process.exit(fails.length ? 1 : 0);
