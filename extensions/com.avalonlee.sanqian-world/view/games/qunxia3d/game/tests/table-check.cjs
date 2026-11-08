/* table-check.cjs — 数值对表单制度（计划书铁律 3）
 * 「每迁一个纯函数，建对表用例（同输入 → 原版值 vs 新版值 逐字段相等）」。
 * 原版值来自 game.html 的逐字节切片在 vm 沙箱里实跑（数据表 + 函数 + 最小 stub）；
 * 新版值来自 game/core + game/systems（node require）。
 * 两边用同一种子 mulberry32 驱动 Math.random（沙箱改写上下文内 Math.random，
 * 新版侧临时替换本进程 global Math.random），同调用序 ⇒ 同轨迹，逐字段比对。
 *
 * 显式豁免（偏差登记，随 P4 迁移批 M7+ 收口）：
 *   ① settleCourtOnNewTurn / settleHallOnNewTurn / ensureP4A~C / Romance / Hall / Signpost
 *      ——沙箱不注入（typeof 守卫跳过）⇔ 新版未迁（计划书 §四 #14：P4 = M7+）
 *   ② markPlayerSeenNode / noteSignpostHere / resolveXiangyangLetter（同上，P4 街面/路牌）
 *   ③ openExclusiveEventModal / tryOpenAftermathIfPresent / triggerRoadEncounter /
 *      renderAll / renderMiniLogs / closeOriginModal / playCloudZoomTransition /
 *      renderOriginCreationModal / playGuqinNote —— 纯表现，两侧同置 noop
 *   ④ saveGame 落点：原版函数尾自存 localStorage（stub），新版由调用方存——state 逐字段
 *      等价不受影响，存储行为由 S6 存取 roundtrip 单独核验
 * 判据：末行 TABLE_CHECK_ALL_GREEN <passed>/<total>（进 run-dod --sim 之外的手跑通道，
 * M0 起每批收口必跑）。
 */
'use strict';
const path = require('path');
const vm = require('vm');
const fs = require('fs');

const GAME_DIR = path.resolve(__dirname, '..');
const EXT_ROOT = path.resolve(GAME_DIR, '..', '..', '..', '..');
const lib = require(path.join(GAME_DIR, 'scripts', 'lib.cjs'));
const coreData = require(path.join(GAME_DIR, 'core', 'data.js'));
const coreState = require(path.join(GAME_DIR, 'core', 'state.js'));
const coreTime = require(path.join(GAME_DIR, 'core', 'time.js'));
const corePlayer = require(path.join(GAME_DIR, 'core', 'player.js'));
const sysTravel = require(path.join(GAME_DIR, 'systems', 'travel.js'));
const D = coreData.D;

const gameSrc = lib.loadSrc('view/games/qunxia/game.html').text;

/* ── 计数 ─────────────────────────────────────────────────────────────── */
let passed = 0, failed = 0;
const failures = [];
function check(label, ok, detail) {
  if (ok) passed++; else { failed++; failures.push(label + (detail ? ' · ' + detail : '')); }
}
function deepEq(a, b, pathStr) {
  if (a === b) return null;
  if (typeof a === 'function' || typeof b === 'function') {
    return String(a) === String(b) ? null : (pathStr + ' (函数体不等)');
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return pathStr + ' (' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b) + ')';
  }
  if (Array.isArray(a) !== Array.isArray(b)) return pathStr + ' (数组性不等)';
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return pathStr + ' (键数 ' + ka.length + ' ≠ ' + kb.length + ')';
  for (const k of ka) {
    const r = deepEq(a[k], b[k], pathStr + '.' + k);
    if (r) return r;
  }
  return null;
}

/* ── 定种 RNG（两侧同算法同种子）────────────────────────────────────────── */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── 原版沙箱 ─────────────────────────────────────────────────────────── */
function slice(kind, name) { return lib.sliceDecl(gameSrc, name, kind).text; }

/* 数据表（按源名） */
const TABLES = [
  ['const', 'STANCE_META'], ['const', 'COMBO_ROLE_META'], ['const', 'TOKEN_META'],
  ['const', 'MARTIAL_DB'], ['const', 'SYNERGIES_DB'], ['const', 'ACUPOINTS_DB'],
  ['const', 'SECTS_DB'], ['const', 'ITEMS_DB'], ['const', 'ESTATE_BUILDINGS_DB'],
  ['const', 'TRADE_GOODS_DB'], ['const', 'MASTER_STAGE_REQS'], ['const', 'MASTERS_INIT'],
  ['const', 'MASTER_STORIES'], ['const', 'ORIGINS'], ['const', 'ENDINGS_DB'],
  ['const', 'TALENTS_POOL'], ['const', 'OPENING_VOWS_DB'],
  ['const', 'MID_ROAD_EVENTS'], ['const', 'SECRET_REALMS_DB'],
  ['const', 'CANON_EVENTS_SCHEDULE'], ['const', 'REALM_NAMES'], ['const', 'MAIN_QUEST_CHAPTERS'],
  ['const', 'SEASONS'], ['const', 'XUNS'], ['const', 'REGIONS'],
  ['const', 'SCROLL_PROPOSITIONS_DB'], ['const', 'MASTER_SCROLL_TAGS'],
  ['const', 'SAVE_KEY'], ['const', 'LEGACY_STORAGE_KEY'],
  ['var', 'QUNXIA_RESULT_KEY'],
  ['let', 'tempScrollProposition'], ['let', 'tempSelectedTalents'], ['let', 'tempSelectedVow'],
  ['let', 'rerollCount'], ['let', 'isJackpotRoll']
];
/* 函数（按源名） */
const FNS = [
  'getRegion', 'getCurrentMainChapter', 'getDateStr', 'addLog', 'addKarma', 'getActiveSynergies',
  'showToast', 'clearOldSaves', 'saveGame', 'queueWorldResult', 'loadGame', 'reconcileWorldGen',
  'calcPlayerStats', 'calcPlayerCombatPower', 'getPowerTierLabel', 'comparePowerVerdict',
  'advanceTime', 'maybeEnterCrisisAftermath', 'checkAndSpawnCanonWorldEvent', 'handleExpiredCanonEvent',
  'canAffordTravel', 'commitTravelToRegion',
  'getScrollById', 'drawScrollProposition', 'applyScrollPropositionToNewGame',
  'getLegacyMeta', 'carriedRelicIds', 'ensureP3StateDefaults',
  'pickRandomFrom', 'rerollOpeningTalents', 'selectOrigin'
];

/* state 形状（逐字节 body，用于重置：`state = <body>;`） */
const stateBody = lib.sliceDecl(gameSrc, 'state', 'let').text
  .replace(/^\s*let\s+state\s*=\s*/, '').replace(/;\s*$/, '');

function buildSandbox(seed) {
  const ctx = {
    document: { getElementById: function () { return null; } },
    window: {},
    location: { reload: function () {} },
    localStorage: (function () {
      var m = {};
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
        setItem: function (k, v) { m[k] = String(v); },
        removeItem: function (k) { delete m[k]; }
      };
    })(),
    Math: Object.create(Math),
    console: console
  };
  /* 纯表现 stub（豁免 ③） */
  ctx.playGuqinNote = function () {};
  ctx.renderMiniLogs = function () {};
  ctx.renderAll = function () {};
  ctx.closeOriginModal = function () {};
  ctx.playCloudZoomTransition = function () {};
  ctx.renderOriginCreationModal = function () {};
  ctx.openExclusiveEventModal = function () {};
  ctx.tryOpenAftermathIfPresent = function () { return false; };
  ctx.triggerRoadEncounter = function () {};
  vm.createContext(ctx);
  const run = function (code) { return vm.runInContext(code, ctx, { filename: 'sandbox.js' }); };
  /* 注入定种 rng（上下文自己的 Math） */
  ctx.__makeRng = mulberry32;
  run('Math.random = __makeRng(' + seed + ');');
  const runPiece = function (code, tag) {
    try { run(code); } catch (e) {
      throw new Error('沙箱切片运行失败 [' + tag + '] ' + e.message);
    }
  };
  TABLES.forEach(t => { runPiece(slice(t[0], t[1]) + '\n', t[0] + ' ' + t[1]); });
  FNS.forEach(f => { runPiece(slice('function', f) + '\n', 'function ' + f); });
  runPiece('state = ' + stateBody + ';\n', 'state 形状');
  return { ctx: ctx, run: run };
}

/* ── 新版侧 env ───────────────────────────────────────────────────────── */
function newEnv(rand, seed) {
  return {
    showToast: function () {},
    queueWorldResult: function (crisisId, outcome) {
      if (!crisisId || crisisId.indexOf('we_') !== 0) return;
      /* 与原版 queueWorldResult 同构；走本进程 stub localStorage */
      const q = JSON.parse(stubStore.getItem('qunxia-result-queue-v1') || '[]');
      q.push({ id: crisisId, outcome: outcome });
      stubStore.setItem('qunxia-result-queue-v1', JSON.stringify(q));
    },
    rand: rand,
    roadEncounter: function () {},
    tryOpenAftermath: function () { return false; }
  };
}

/* 新版侧 stub localStorage（与沙箱内同构） */
const stubStore = (function () {
  const m = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; }
  };
})();

/* 新版侧跑一段带定种 Math.random 的事（travel/残卷里裸 Math.random 也要定种） */
function withSeededRandom(seed, fn) {
  const orig = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = orig; }
}

/* ══ 1. 数据等价（生成物 vs 源切片实跑）══════════════════════════════════ */
(function dataParity() {
  const pairs = [
    ['martial.js', ['STANCE_META', 'COMBO_ROLE_META', 'TOKEN_META', 'MARTIAL_DB', 'SYNERGIES_DB', 'ACUPOINTS_DB']],
    ['sects.js', ['SECTS_DB']],
    ['items.js', ['ITEMS_DB', 'ESTATE_BUILDINGS_DB', 'TRADE_GOODS_DB']],
    ['masters.js', ['MASTER_STAGE_REQS', 'MASTERS_INIT', 'MASTER_STORIES']],
    ['origins.js', ['ORIGINS', 'ENDINGS_DB', 'TALENTS_POOL', 'OPENING_VOWS_DB']],
    ['encounters.js', ['MID_ROAD_EVENTS', 'SECRET_REALMS_DB']],
    /* world-events.js 不在此对表：源在扩展引擎 assets/worlds/wuxia/index.js +
     * content-merge.js（非 game.html），由下方 worldEventsParity 专属块覆盖 */
    ['canon.js', ['CANON_EVENTS_SCHEDULE']],
    ['regions.js', ['REALM_NAMES', 'MAIN_QUEST_CHAPTERS', 'SEASONS', 'XUNS', 'REGIONS']],
    ['scrolls.js', ['SCROLL_PROPOSITIONS_DB', 'MASTER_SCROLL_TAGS']],
    ['state-init.js', ['QX3D_STATE_INIT']]
  ];
  pairs.forEach(p => {
    const mod = require(path.join(GAME_DIR, 'data', p[0]));
    p[1].forEach(name => {
      let srcVal;
      try {
        const c = { console };
        vm.createContext(c);
        if (name === 'QX3D_STATE_INIT') {
          /* state 字面量引用 MASTERS_INIT，先注入数据表再求值 */
          vm.runInContext(lib.sliceDecl(gameSrc, 'MASTERS_INIT', 'const').text + '\n', c);
        }
        const text = lib.sliceDecl(gameSrc, name === 'QX3D_STATE_INIT' ? 'state' : name,
          name === 'QX3D_STATE_INIT' ? 'let' : (name === 'EV_TURN_MAP' || name === 'WB_STATE' ? 'var' : 'const')).text;
        vm.runInContext(text + '\nglobalThis.__v = ' +
          (name === 'QX3D_STATE_INIT' ? 'state' : name) + ';', c);
        srcVal = c.__v;
      } catch (e) {
        check('数据等价 ' + p[0] + '.' + name, false, '源切片求值失败 ' + e.message);
        return;
      }
      const got = mod[name];
      const r = deepEq(srcVal, got, name);
      check('数据等价 ' + p[0] + '.' + name, r === null, r || undefined);
    });
  });
})();

/* world-events 三表源在扩展引擎（assets/worlds/wuxia/index.js）+ content-merge */
(function worldEventsParity() {
  const wsrc = lib.loadSrc('assets/worlds/wuxia/index.js').text;
  const csrc = lib.loadSrc('view/games/qunxia/content-merge.js').text;
  const mod = require(path.join(GAME_DIR, 'data', 'world-events.js'));
  [['WORLD_EVENTS', wsrc, 'var'], ['WB_STATE', wsrc, 'var'], ['WRITEBACK', wsrc, 'var'],
   ['FAIL', wsrc, 'var'], ['EV_TURN_MAP', csrc, 'var']].forEach(t => {
    const c = { console };
    vm.createContext(c);
    vm.runInContext(lib.sliceDecl(t[1], t[0], t[2]).text + '\nglobalThis.__v = ' + t[0] + ';', c);
    const r = deepEq(c.__v, mod[t[0]], t[0]);
    check('数据等价 world-events.js.' + t[0], r === null, r || undefined);
  });
})();

/* ══ 2. 场景对表 ════════════════════════════════════════════════════════ */
/* 通用驱动：两侧各建一份 state，执行 scenario(sbx, runSandbox / nst, runNew)，
 * 之后全字段比对。 */
function compareStates(sbNst, nst, label) {
  const sbJson = sbNst.run('JSON.stringify(state)');
  if (sbJson === undefined || sbJson === 'undefined') {
    throw new Error('沙箱 state 不可读 [' + label + '] typeof=' + sbNst.run('typeof state') +
      ' hasOwnProperty=' + sbNst.run('JSON.stringify(Object.getOwnPropertyNames(globalThis).filter(function(k){return k.indexOf("stat")>=0 || k==="state";}))'));
  }
  const newJson = JSON.stringify(nst.st);
  const a = JSON.parse(sbJson), b = JSON.parse(newJson);
  const r = deepEq(a, b, 'state');
  check(label, r === null, r ? String(r).slice(0, 400) : undefined);
}

const ORIGIN_IDS = ['sword_wanderer', 'palm_hero', 'taoist_scholar', 'snow_swordswoman', 'ng_gumu_heir', 'ng_murong_scion'];
const VOW_IDS = ['vow_hero', 'vow_supreme', 'vow_homestead'];

/* S2：创角对表 —— 6 出身 × 3 誓言 × 固定命格（跨出身同一随机序列难保，逐场景独立种子） */
ORIGIN_IDS.forEach((oid, oi) => {
  VOW_IDS.forEach((vid, vi) => {
    const seed = 1000 + oi * 10 + vi;
    const sb = buildSandbox(seed);
    sb.run('tempSelectedTalents = ["t_good_tough","t_norm_farmer","t_bad_meridian"]; tempSelectedVow = ' + JSON.stringify(vid) + ';');
    sb.run('selectOrigin(' + JSON.stringify(oid) + ');');

    const nst = { st: coreState.initialState() };
    withSeededRandom(seed, function () {
      coreState.applyOrigin(nst.st, oid, {
        name: '沈青锋', talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
        vow: vid, storage: stubStore
      });
    });
    compareStates(sb, nst, 'S2 创角 ' + oid + '×' + vid);
  });
});

/* S2b：创角随机命格（同种子重摇路径）—— selectOrigin 不掷骰，命格由摇池定；单独对摇池 */
(function S2b() {
  for (let seed = 1; seed <= 12; seed++) {
    const sb = buildSandbox(seed);
    sb.run('rerollOpeningTalents();');
    const sbTalents = JSON.parse(sb.run('JSON.stringify(tempSelectedTalents)'));
    const sbJack = JSON.parse(sb.run('JSON.stringify(isJackpotRoll)'));
    const nst = withSeededRandom(seed, function () {
      return coreState.rollOpeningTalents(null, false);
    });
    const r1 = deepEq(sbTalents, nst.talents, 'talents');
    check('S2b 摇池 seed=' + seed, r1 === null && sbJack === nst.jackpot, r1 || (sbJack !== nst.jackpot ? 'jackpot 不等' : undefined));
  }
})();

/* S3：旬时间机定种长跑（创角 sword_wanderer×vow_homestead 固定命格 → 连推 36 旬，里程碑比对） */
[20261008, 777, 42].forEach(seed => {
  const sb = buildSandbox(seed);
  sb.run('tempSelectedTalents = ["t_good_tough","t_norm_farmer","t_bad_meridian"]; tempSelectedVow = "vow_homestead";');
  sb.run('selectOrigin("sword_wanderer");');

  const nst = { st: coreState.initialState() };
  /* 单一 rng 贯穿（与沙箱同种子同序列）：创角摇残卷 + 每旬名宿游走共用同一实例，
   * 不许中途换种子——轨迹失同步即全字段红（本件 2026-11-08 首跑踩过）。 */
  const nrand = mulberry32(seed);
  coreState.applyOrigin(nst.st, 'sword_wanderer', {
    name: '沈青锋', talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
    vow: 'vow_homestead', storage: stubStore, env: { rand: nrand }
  });
  /* 长跑：逐段推进并按里程碑全字段比对（两边各自推进 1 旬后比一次） */
  for (let t = 1; t <= 36; t++) {
    sb.run('advanceTime(1, true);');
    coreTime.advanceTime(nst.st, 1, true, newEnv(nrand, seed));
    if ([2, 3, 6, 8, 9, 12, 16, 24, 32, 36].indexOf(t + 1) >= 0) {
      compareStates(sb, nst, 'S3 过旬定种 seed=' + seed + ' 第' + (t + 1) + '旬');
    }
  }
});

/* S4：行脚结算（徒步邻州 + 快马跨州；逐场景独立沙箱） */
[
  { from: 'luoyang', to: 'shaolin', carriage: false, seed: 31 },
  { from: 'luoyang', to: 'changan', carriage: true, seed: 32 },
  { from: 'luoyang', to: 'huashan', carriage: false, seed: 33 }
].forEach(tc => {
  const sb = buildSandbox(tc.seed);
  sb.run('tempSelectedTalents = ["t_good_tough","t_norm_farmer","t_bad_meridian"]; tempSelectedVow = "vow_homestead";');
  sb.run('selectOrigin("sword_wanderer");');
  sb.run('state.currentRegion = ' + JSON.stringify(tc.from) + '; state.currentTileIdx = 1;');
  sb.run('commitTravelToRegion(' + JSON.stringify(tc.to) + ', ' + (tc.carriage ? 'true' : 'false') + ');');

  const nst = { st: coreState.initialState() };
  withSeededRandom(tc.seed, function () {
    coreState.applyOrigin(nst.st, 'sword_wanderer', {
      name: '沈青锋', talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
      vow: 'vow_homestead', storage: stubStore
    });
    nst.st.currentRegion = tc.from;
    nst.st.currentTileIdx = 1;
    sysTravel.commitTravelToRegion(nst.st, tc.to, tc.carriage, newEnv(null, tc.seed));
  });
  compareStates(sb, nst, 'S4 行脚 ' + tc.from + '→' + tc.to + (tc.carriage ? ' 快马' : ' 徒步') + ' seed=' + tc.seed);

  /* canAffordTravel 判定对表（精力不足 / 盘缠不足） */
  sb.run('state.ap = 0; state.gold = 15;');
  const sbAffordWalk = sb.run('canAffordTravel(false)');
  const sbAffordCar = sb.run('JSON.stringify(canAffordTravel(true))');
  nst.st.ap = 0; nst.st.gold = 15;
  const newAffordWalk = sysTravel.canAffordTravel(nst.st, false, newEnv(null, tc.seed));
  const newAffordCar = sysTravel.canAffordTravel(nst.st, true, newEnv(null, tc.seed));
  check('S4 canAfford 徒步(精力0) ' + tc.seed, sbAffordWalk === false && newAffordWalk === false);
  check('S4 canAfford 快马(盘缠15) ' + tc.seed, sbAffordCar === 'false' && newAffordCar === false);
});

/* S5：残卷抽取与应用（定种同种子 → 同命题；应用后名宿好感偏置一致） */
(function S5() {
  for (let seed = 51; seed <= 56; seed++) {
    const sb = buildSandbox(seed);
    sb.run('state.carryRelic = null; state.relicCarry = [];');
    sb.run('var sc = drawScrollProposition(state.carryRelic); globalThis.__scId = sc ? sc.id : null;');
    sb.run('applyScrollPropositionToNewGame(getScrollById(__scId));');
    const sbAff = JSON.parse(sb.run('JSON.stringify(state.masters.map(function(m){return [m.id, m.affinity, m.scrollGreeting || null];}))'));
    const sbBonus = sb.run('JSON.stringify(state._scrollRoadBonus)');

    const nst = { st: coreState.initialState() };
    nst.st.carryRelic = null; nst.st.relicCarry = [];
    let sc;
    withSeededRandom(seed, function () {
      sc = coreState.drawScrollProposition(nst.st, {});
    });
    coreState.applyScrollPropositionToNewGame(nst.st, sc);
    const newAff = nst.st.masters.map(function (m) { return [m.id, m.affinity, m.scrollGreeting || null]; });
    const r1 = deepEq(sb.run('JSON.stringify(__scId)'), JSON.stringify(sc ? sc.id : null), 'scId');
    const r2 = deepEq(sbAff, newAff, 'masters affinity');
    check('S5 残卷 seed=' + seed, r1 === null && r2 === null && sbBonus === JSON.stringify(nst.st._scrollRoadBonus),
      r1 || r2 || undefined);
  }
})();

/* S6：存档 roundtrip + gen 对账 */
(function S6() {
  /* 6a 新版 save→load 逐字段相等 */
  const st1 = coreState.initialState();
  withSeededRandom(99, function () {
    coreState.applyOrigin(st1, 'palm_hero', {
      name: '试档', talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
      vow: 'vow_hero', storage: stubStore
    });
    coreTime.advanceTime(st1, 3, true, newEnv(null, 99));
  });
  stubStore.setItem(coreState.SAVE_KEY, JSON.stringify(st1));
  const loaded = coreState.loadGame(stubStore);
  const r = deepEq(st1, loaded.state, 'roundtrip');
  check('S6a 存取 roundtrip 逐字段', r === null, r || undefined);

  /* 6b 原版 save→load 对照（同输入走原版 loadGame） */
  const sb = buildSandbox(99);
  sb.run('tempSelectedTalents = ["t_good_tough","t_norm_farmer","t_bad_meridian"]; tempSelectedVow = "vow_hero";');
  sb.run('selectOrigin("palm_hero"); state.playerName = "试档";');
  sb.run('advanceTime(3, true);');
  const sbSaved = sb.run('JSON.stringify(state)');
  sb.run('state = ' + stateBody + '; loadGame();');
  const sbJsonAfter = sb.run('JSON.stringify(state)');
  const r2 = deepEq(JSON.parse(sbSaved), JSON.parse(sbJsonAfter), '原版 roundtrip');
  check('S6b 原版存取 roundtrip', r2 === null, r2 || undefined);

  /* 6c gen 对账：payload gen 变大 ⇒ 清档 + reload；变小/相同 ⇒ 记值 */
  const st2 = coreState.initialState();
  st2.hasCreatedChar = true; st2.worldGen = 2;
  stubStore.setItem(coreState.SAVE_KEY, JSON.stringify(st2));
  stubStore.setItem(coreState.PAYLOAD_KEY, JSON.stringify({ gen: 5 }));
  const act1 = coreState.reconcileWorldGen(JSON.parse(JSON.stringify(st2)), stubStore);
  check('S6c gen 变大 ⇒ reload', act1.action === 'reload' && stubStore.getItem(coreState.SAVE_KEY) === null && act1.gen === 5);

  const st3 = coreState.initialState();
  st3.hasCreatedChar = true; st3.worldGen = 9;
  stubStore.setItem(coreState.SAVE_KEY, JSON.stringify(st3));
  stubStore.setItem(coreState.PAYLOAD_KEY, JSON.stringify({ gen: 5 }));
  const st3b = JSON.parse(stubStore.getItem(coreState.SAVE_KEY));
  const act2 = coreState.reconcileWorldGen(st3b, stubStore);
  check('S6c gen 变小 ⇒ 记值不清档', act2.action === 'record' && st3b.worldGen === 5 && stubStore.getItem(coreState.SAVE_KEY) !== null);
})();

/* ══ 末行 ═══════════════════════════════════════════════════════════════ */
failures.slice(0, 8).forEach(f => console.log('FAIL ' + f));
if (failed === 0) {
  console.log('TABLE_CHECK_ALL_GREEN ' + passed + '/' + (passed + failed));
} else {
  console.log('TABLE_CHECK_FAIL ' + passed + '/' + (passed + failed));
  process.exit(1);
}
