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
 *      ⚠️ 册300 起 **P4-A 市井层不在此列**：七表 + 散列/刷名/选槽/归岗由 **S34** 独立对表
 *      （轻量沙箱，不背全链；见件尾 S34 组）。剩 P4-B/C/E/F 仍在册。
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
const combat = require(path.join(GAME_DIR, 'systems', 'combat.js'));
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
  ['const', 'STEWARDS_BONUS_DESC'],
  ['const', 'LIFE_PATHS_DB'],
  ['const', 'LEGACY_PERKS_DB'],
  ['const', 'SAVE_KEY'], ['const', 'LEGACY_STORAGE_KEY'],
  ['var', 'QUNXIA_RESULT_KEY'],
  ['let', 'tempScrollProposition'], ['let', 'tempSelectedTalents'], ['let', 'tempSelectedVow'],
  ['let', 'rerollCount'], ['let', 'isJackpotRoll'],
  ['const', 'FORM_META'], ['const', 'SHI_META'], ['const', 'FORM_SHI_COMBO_NAMES'],
  ['let', 'duelState'], ['let', 'tutorialBattle'], ['let', 'showAllDuelCards'],
  ['let', 'duelLogOpen'], ['let', 'duelDrawerOpen'], ['let', 'duelInfoId']
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
  'pickRandomFrom', 'rerollOpeningTalents', 'selectOrigin',
  /* M1 八格动作 + 本境经济（systems/tiles.js 对表集） */
  'checkRealmPromotion', 'commitLocalTileMove', 'meditateRest', 'tavernDrinkRest', 'tavernPostBounty',
  'buyMarketItem', 'forgeEquipment', 'sectPractice', 'sectChallengeGuardian', 'shrineCultivate',
  'exploreSecretCave', 'strollLocalSpot', 'triggerRoadEncounter', 'selectEncounterChoice',
  'startBountyDuel', 'joinWorldCrisis', 'getRegionalTradeGood', 'getBestTradeDeal',
  'buyTradeGood', 'sellTradeGood', 'doEscortConvoy', 'collectTileActions', 'pickPrimaryActions',
  /* M2 三招对决（systems/combat.js 对表集） */
  'startDuel', 'pickEnemyIntentStance', 'playDuelCard', 'finishDuel', 'duelMeditate',
  /* M2 尾批：首局教学（册277 · 拍板 = 逐字复刻） */
  'startTutorialComboBattle', 'advanceTutorialStep', 'nameTutorialForm', 'renderTutorialFormPicker', 'lockTutorialCards',
  /* M4 深度系统（systems/deep.js 对表集） */
  'getArtUpgradeCost', 'getMaxAllowedArtLevel', 'upgradeArt', 'unlockAcupoint', 'equipInnerArt', 'toggleEquipMove', 'upgradeEstateBuilding', 'assignEstateSteward', 'doEstateWork', 'claimCanonicalSecretReward',
  /* M5 名宿交互（systems/masters.js 对表集） */
  'chatWithMaster', 'learnFromMaster', 'duelMaster', 'resolveMasterStoryStage',
  /* M6 终局/周目（systems/endings.js 对表集） */
  'startNewGamePlus', 'claimPathVictoryAndReincarnate', 'toggleLegacyPerk',
  /* M5 名宿交互（systems/masters.js 对表集） */
  'chatWithMaster', 'learnFromMaster', 'duelMaster', 'resolveMasterStoryStage',
  /* M6 终局/周目（systems/endings.js 对表集） */
  'startNewGamePlus', 'claimPathVictoryAndReincarnate', 'toggleLegacyPerk',
  /* M5 名宿交互（systems/masters.js 对表集） */
  'chatWithMaster', 'learnFromMaster', 'duelMaster', 'resolveMasterStoryStage',
  /* M6 终局/周目（systems/endings.js 对表集） */
  'startNewGamePlus', 'claimPathVictoryAndReincarnate', 'toggleLegacyPerk',
  'getMoveFormShi', 'isLegalShiSequence', 'synthesizeComboName', 'pickRecommendedDuelCards', 'sceneLine'
];

/* 原版有声明、但本对表要替换成 stub 的函数（在切片之后注入，覆盖原版体）：
 *   startDuel = 三招对决引擎 M2 接；triggerCanonicalSecretRealm = 传世秘境 M4 接；
 *   openBountyPosterModal / spawnFloatingText / closeEventModal / renderDrawer = 纯表现（豁免 ③）。 */
const STUB_AFTER = [
  'triggerCanonicalSecretRealm', 'openBountyPosterModal',
  'spawnFloatingText', 'closeEventModal', 'renderDrawer',
  'renderHud', 'renderLocalGridTiles', 'renderInspector',
  'renderDuelStage', 'suspendStreetRumor', 'showComboFloatTip', 'flashComboFx'
];

/* state 形状（逐字节 body，用于重置：`state = <body>;`） */
const stateBody = lib.sliceDecl(gameSrc, 'state', 'let').text
  .replace(/^\s*let\s+state\s*=\s*/, '').replace(/;\s*$/, '');

function buildSandbox(seed) {
  const ctx = {
    /* toast-container 须回 null（showToast 早退）；其余元素给通用桩（forge 的 drawer-modal
     * contains→true 跳过 renderDrawer；roadEncounter 的 event-modal 族用可写桩） */
    document: {
      body: { classList: { add: function () {}, remove: function () {}, contains: function () { return true; } } },
      getElementById: function (id) {
        if (id === 'toast-container') return null;
        return {
          classList: { add: function () {}, remove: function () {}, contains: function () { return true; } },
          textContent: '', innerHTML: '', style: {}, src: '', value: ''
        };
      },
      createElement: function () {
        return { className: '', textContent: '', style: {}, appendChild: function () {}, remove: function () {} };
      }
    },
    window: { addEventListener: function () {} },
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
    setTimeout: function () {},
    clearTimeout: function () {},
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
  /* 切片后注入 stub（覆盖原版体——两侧同置的引擎/弹窗豁免面） */
  STUB_AFTER.forEach(f => { runPiece('function ' + f + '() {}', 'stub ' + f); });
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
    tryOpenAftermath: function () { return false; },
    /* M2：startDuel 走真 initDuel（意图掷骰消耗随机序列，与原版 startDuel 对齐；
      * duelState 弃用——state 面等价即可） */
    startDuel: function (s, params) { combat.initDuel(s, params, { rand: rand }); },
    canonicalSecret: function () {},
    openBountyPoster: function () {},
    openRoadEncounter: function () {}
  };
}

/* 新版侧 stub localStorage（与沙箱内同构） */
const stubStore = (function () {
  const m = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; },
    /* 队列比对是「场景内」断言——stubStore 为全件共享，子场景起点须清防跨场景残留
     * （S24c 首跑被 S24b 的 we_test 残留污染，实测红） */
    clear: function () { Object.keys(m).forEach(k => delete m[k]); }
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
    ['masters.js', ['MASTERS_INIT']],
    ['masters-stories.js', ['MASTER_STAGE_REQS', 'MASTER_STORIES'], true],
    ['side-cast.js', ['SIDE_CAST'], true],
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
    if (p[2]) {
      /* lazy/占位件简化核验：导出键在位 + SIDE_CAST 零 base64（册278） */
      p[1].forEach(name => {
        const got = mod[name];
        const noB64 = JSON.stringify(got || {}).indexOf('base64') < 0;
        check('数据等价 ' + p[0] + '.' + name + ' (lazy)', got != null && (name !== 'SIDE_CAST' || noB64),
          got == null ? '键缺失' : (name === 'SIDE_CAST' && !noB64 ? 'base64 残留' : undefined));
      });
      return;
    }
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

/* ══ M1：八格动作 + 本境经济对表（systems/tiles.js）══════════════════════ */
/* 通用建场：创角 sword_wanderer×vow_homestead 固定命格（两侧同种子） */
function m1pair(seed) {
  const sb = buildSandbox(seed);
  sb.run('tempSelectedTalents = ["t_good_tough","t_norm_farmer","t_bad_meridian"]; tempSelectedVow = "vow_homestead";');
  sb.run('selectOrigin("sword_wanderer");');
  const nst = { st: coreState.initialState(), rand: mulberry32(seed) };
  coreState.applyOrigin(nst.st, 'sword_wanderer', {
    name: '沈青锋', talents: ['t_good_tough', 't_norm_farmer', 't_bad_meridian'],
    vow: 'vow_homestead', storage: stubStore, env: { rand: nst.rand }
  });
  return { sb: sb, nst: nst };
}
const tiles = require(path.join(GAME_DIR, 'systems', 'tiles.js'));

/* S7 吐纳过旬（meditateRest） */
[71, 72].forEach(seed => {
  const p = m1pair(seed);
  p.sb.run('state.hp = 40; state.mp = 20;');
  p.sb.run('meditateRest();');
  p.nst.st.hp = 40; p.nst.st.mp = 20;
  tiles.meditateRest(p.nst.st, newEnv(p.nst.rand, seed));
  compareStates(p.sb, p.nst, 'S7 吐纳过旬 seed=' + seed);
});

/* S8 酒肆小酌 + 限次拒 */
(function S8() {
  const p = m1pair(81);
  p.sb.run('state.currentTileIdx = 1;');
  p.sb.run('tavernDrinkRest(); tavernDrinkRest();');
  p.nst.st.currentTileIdx = 1;
  tiles.tavernDrinkRest(p.nst.st, newEnv(p.nst.rand, 81));
  tiles.tavernDrinkRest(p.nst.st, newEnv(p.nst.rand, 81));
  compareStates(p.sb, p.nst, 'S8 酒肆小酌 + 本旬限饮拒');
})();

/* S9 揭榜悬赏（生成种子面：tileIdx/恶徒名/架势 + 冷却 + 移位）。
 * 初始 state 自带两桩悬赏（luoyang/huashan，:3024）——先清空才走到生成路径
 * （带既有恶徒的 early-return 直出榜文分支由 S9b 覆盖） */
[91, 92, 93].forEach(seed => {
  const p = m1pair(seed);
  p.sb.run('state.bounties = []; state.currentTileIdx = 1;');
  p.sb.run('tavernPostBounty();');
  p.nst.st.bounties = [];
  p.nst.st.currentTileIdx = 1;
  tiles.tavernPostBounty(p.nst.st, newEnv(p.nst.rand, seed));
  compareStates(p.sb, p.nst, 'S9 揭榜悬赏 seed=' + seed);
});

/* S9b 揭榜 early-return：既有恶徒 ⇒ 直出榜文、不扣精力、无冷却 */
(function S9b() {
  const p = m1pair(95);
  p.sb.run('state.currentTileIdx = 1;');
  p.sb.run('tavernPostBounty();');
  p.nst.st.currentTileIdx = 1;
  tiles.tavernPostBounty(p.nst.st, newEnv(p.nst.rand, 95));
  compareStates(p.sb, p.nst, 'S9b 揭榜既有恶徒 early-return');
})();

/* S10 市集购入三分支（equip 佩挂重算上限 / scroll 习得 / pill 入行囊 + 限购） */
(function S10() {
  const p = m1pair(101);
  p.sb.run('state.gold = 5000; state.currentTileIdx = 2;');
  p.sb.run('buyMarketItem("qingtong_jian"); buyMarketItem("scroll_dugu"); buyMarketItem("jinchuang_yao"); buyMarketItem("jinchuang_yao");');
  const nenv = newEnv(p.nst.rand, 101);
  p.nst.st.gold = 5000; p.nst.st.currentTileIdx = 2;
  tiles.buyMarketItem(p.nst.st, 'qingtong_jian', nenv);
  tiles.buyMarketItem(p.nst.st, 'scroll_dugu', nenv);
  tiles.buyMarketItem(p.nst.st, 'jinchuang_yao', nenv);
  tiles.buyMarketItem(p.nst.st, 'jinchuang_yao', nenv);
  compareStates(p.sb, p.nst, 'S10 市集购入三分支 + 限购');
})();

/* S11 淬炼双价表（90/60 → 180/120）+ 满级拒 */
(function S11() {
  const p = m1pair(111);
  p.sb.run('state.gold = 2000; state.exp = 600; state.currentTileIdx = 2;');
  p.sb.run('forgeEquipment("weapon"); forgeEquipment("weapon");');
  p.sb.run('state.forgeLevels.weapon = 5; forgeEquipment("weapon");');
  const nenv = newEnv(p.nst.rand, 111);
  p.nst.st.gold = 2000; p.nst.st.exp = 600; p.nst.st.currentTileIdx = 2;
  tiles.forgeEquipment(p.nst.st, 'weapon', nenv);
  tiles.forgeEquipment(p.nst.st, 'weapon', nenv);
  p.nst.st.forgeLevels.weapon = 5;
  tiles.forgeEquipment(p.nst.st, 'weapon', nenv);
  compareStates(p.sb, p.nst, 'S11 淬炼双价表 + 满级拒');
})();

/* S12 演武/灵脉 + 门槛拒（精力 0 / 内息不足） */
(function S12() {
  const p = m1pair(121);
  p.sb.run('state.currentRegion = "shaolin"; state.currentTileIdx = 2;');
  p.sb.run('sectPractice();');
  p.sb.run('state.currentTileIdx = 6; shrineCultivate();');
  const nenv = newEnv(p.nst.rand, 121);
  p.nst.st.currentRegion = 'shaolin'; p.nst.st.currentTileIdx = 2;
  tiles.sectPractice(p.nst.st, nenv);
  p.nst.st.currentTileIdx = 6;
  tiles.shrineCultivate(p.nst.st, nenv);
  compareStates(p.sb, p.nst, 'S12 演武 + 灵脉闭关');
  /* 门槛拒：ap=0 → sectPractice 拒；mp<15 → 拒 */
  p.sb.run('state.ap = 0; state.turnFlags.sectPracticeDone = false; sectPractice();');
  p.sb.run('state.ap = 5; state.mp = 10; sectPractice();');
  p.nst.st.ap = 0; p.nst.st.turnFlags.sectPracticeDone = false;
  tiles.sectPractice(p.nst.st, nenv);
  p.nst.st.ap = 5; p.nst.st.mp = 10;
  tiles.sectPractice(p.nst.st, nenv);
  compareStates(p.sb, p.nst, 'S12b 演武门槛拒（精力/内息）');
})();

/* S13 寻幽/探秘 + 奇遇四支效果（事件抽取定种 + 选择应用） */
[131, 132, 133, 134].forEach(seed => {
  const p = m1pair(seed);
  p.sb.run('state.currentTileIdx = 5;');
  p.sb.run('strollLocalSpot();');
  p.sb.run('selectEncounterChoice(0);');
  p.sb.run('state.turnFlags.exploredRegions = {}; state.currentTileIdx = 6;');
  p.sb.run('exploreSecretCave();');
  p.sb.run('selectEncounterChoice(1);');
  const nenv = newEnv(p.nst.rand, seed);
  p.nst.st.currentTileIdx = 5;
  var ev1 = tiles.strollLocalSpot(p.nst.st, nenv).encounter;
  tiles.applyRoadEncounterChoice(p.nst.st, ev1, 0, nenv);
  p.nst.st.turnFlags.exploredRegions = {}; p.nst.st.currentTileIdx = 6;
  var r2 = tiles.exploreSecretCave(p.nst.st, nenv);
  tiles.applyRoadEncounterChoice(p.nst.st, r2.encounter, 1, nenv);
  compareStates(p.sb, p.nst, 'S13 寻幽+探秘 奇遇效果 seed=' + seed);
});

/* S14 行商（购入特产 ×2 → 跨州 → 异地倾销 + 最优抛售单） */
(function S14() {
  const p = m1pair(141);
  p.sb.run('state.gold = 300; state.currentTileIdx = 0;');
  p.sb.run('buyTradeGood("good_wine"); buyTradeGood("good_wine");');
  p.sb.run('commitTravelToRegion("shaolin", false);');
  p.sb.run('sellTradeGood("good_wine", getRegion(state.currentRegion).zone);');
  const nenv = newEnv(p.nst.rand, 141);
  p.nst.st.gold = 300; p.nst.st.currentTileIdx = 0;
  tiles.buyTradeGood(p.nst.st, 'good_wine', nenv);
  tiles.buyTradeGood(p.nst.st, 'good_wine', nenv);
  sysTravel.commitTravelToRegion(p.nst.st, 'shaolin', false, nenv);
  tiles.sellTradeGood(p.nst.st, 'good_wine', coreTime.getRegion(p.nst.st.currentRegion).zone, nenv);
  compareStates(p.sb, p.nst, 'S14 行商购入跨州倾销');
  /* getBestTradeDeal 形状对表（data 面深比） */
  p.sb.run('buyTradeGood("good_iron");');
  tiles.buyTradeGood(p.nst.st, 'good_iron', nenv);
  const sbDeal = JSON.parse(p.sb.run('JSON.stringify(getBestTradeDeal())'));
  const newDeal = tiles.getBestTradeDeal(p.nst.st);
  const r = deepEq(sbDeal, newDeal, 'deal');
  check('S14b getBestTradeDeal 形状', r === null, r || undefined);
})();

/* S15 走镖两态（45% 劫匪 / 平安 +24文+14修为）定种 */
[151, 152, 153].forEach(seed => {
  const p = m1pair(seed);
  p.sb.run('state.currentTileIdx = 0;');
  p.sb.run('doEscortConvoy();');
  const nenv = newEnv(p.nst.rand, seed);
  p.nst.st.currentTileIdx = 0;
  tiles.doEscortConvoy(p.nst.st, nenv);
  compareStates(p.sb, p.nst, 'S15 走镖 seed=' + seed);
});

/* S16 境界突破（阈值表 + 上限增量 + 回满） */
(function S16() {
  const p = m1pair(161);
  p.sb.run('state.exp = 200; checkRealmPromotion();');
  p.sb.run('state.exp = 950; checkRealmPromotion();');
  const nenv = newEnv(p.nst.rand, 161);
  p.nst.st.exp = 200;
  tiles.checkRealmPromotion(p.nst.st, nenv);
  p.nst.st.exp = 950;
  tiles.checkRealmPromotion(p.nst.st, nenv);
  compareStates(p.sb, p.nst, 'S16 境界突破两级');
})();

/* S17 八格动作菜单对表（语义字段全等；onclick/act = 表现层接线差异，豁免） */
(function S17() {
  [['luoyang', 1], ['luoyang', 2], ['shaolin', 2], ['shaolin', 6], ['luoyang', 5], ['luoyang', 0], ['luoyang', 6]].forEach(tc => {
    const p = m1pair(171);
    p.sb.run('state.currentRegion = ' + JSON.stringify(tc[0]) + '; state.currentTileIdx = ' + tc[1] + ';');
    const sbActions = JSON.parse(p.sb.run('JSON.stringify(collectTileActions(getRegion(state.currentRegion), getRegion(state.currentRegion).tiles[state.currentTileIdx]).map(function(a){return {id:a.id,tier:a.tier,priority:a.priority,label:a.label,sub:a.sub,cost:a.cost,disabled:a.disabled};}))'));
    const nst = p.nst.st;
    nst.currentRegion = tc[0]; nst.currentTileIdx = tc[1];
    const newActions = tiles.collectTileActions(nst, coreTime.getRegion(nst.currentRegion), coreTime.getRegion(nst.currentRegion).tiles[nst.currentTileIdx])
      .map(a => ({ id: a.id, tier: a.tier, priority: a.priority, label: a.label, sub: a.sub, cost: a.cost, disabled: a.disabled }));
    const r = deepEq(sbActions, newActions, 'actions');
    check('S17 动作菜单 ' + tc[0] + '#' + tc[1], r === null, r ? String(r).slice(0, 200) : undefined);
    /* 主行动三槽（group=shop 不进） */
    const sbPrim = JSON.parse(p.sb.run('JSON.stringify(pickPrimaryActions(collectTileActions(getRegion(state.currentRegion), getRegion(state.currentRegion).tiles[state.currentTileIdx])).primary.map(function(a){return a.id;}))'));
    const newPrim = tiles.pickPrimaryActions(tiles.collectTileActions(nst, coreTime.getRegion(nst.currentRegion), coreTime.getRegion(nst.currentRegion).tiles[nst.currentTileIdx])).primary.map(a => a.id);
    const r2 = deepEq(sbPrim, newPrim, 'primary');
    check('S17b 主行动三槽 ' + tc[0] + '#' + tc[1], r2 === null, r2 || undefined);
  });
})();

/* S18 本境移步（邻格 -4内息 / 跨街 -1行脚）+ 门槛拒 */
(function S18() {
  const p = m1pair(181);
  p.sb.run('state.currentTileIdx = 0; commitLocalTileMove(1, true);');
  p.sb.run('commitLocalTileMove(3, false);');
  const nenv = newEnv(p.nst.rand, 181);
  p.nst.st.currentTileIdx = 0;
  tiles.commitLocalTileMove(p.nst.st, 1, true, nenv);
  tiles.commitLocalTileMove(p.nst.st, 3, false, nenv);
  compareStates(p.sb, p.nst, 'S18 本境移步邻格+跨街');
  const rej1 = tiles.canMoveToTile(p.nst.st, 0); /* mp 不足（-4×2 后 <4）视种子而定，只判形状 */
  check('S18b canMoveToTile 返回形状', !!rej1 && typeof rej1.ok === 'boolean');
})();

/* ══ M2：三招对决对表（systems/combat.js）═══════════════════════════════ */

/* S19 形/势判定与成招名 */
(function S19() {
  const p = m1pair(191);
  const sbFs = p.sb.run('JSON.stringify([getMoveFormShi(MARTIAL_DB.taizu_changquan), getMoveFormShi({id:"__ult__",name:"绝",stance:"inner",comboRole:"zhuan",isUlt:true}), getMoveFormShi(MARTIAL_DB.lingbo_weibu), getMoveFormShi({id:"x",stance:"qiao"})])');
  const newFs = JSON.stringify([
    combat.getMoveFormShi(D.MARTIAL_DB.taizu_changquan),
    combat.getMoveFormShi({ id: "__ult__", name: "绝", stance: "inner", comboRole: "zhuan", isUlt: true }),
    combat.getMoveFormShi(D.MARTIAL_DB.lingbo_weibu),
    combat.getMoveFormShi({ id: "x", stance: "qiao" })
  ]);
  check('S19a getMoveFormShi', sbFs === newFs, sbFs + ' vs ' + newFs);
  const seqs = [["break","chase"],["break","parry","chase"],["chase","break"],["break"],["break","chase","chase"]];
  const sbLeg = p.sb.run('JSON.stringify(' + JSON.stringify(seqs) + '.map(function(x){return isLegalShiSequence(x);}))');
  const newLeg = JSON.stringify(seqs.map(x => combat.isLegalShiSequence(x)));
  check('S19b isLegalShiSequence', sbLeg === newLeg, sbLeg + ' vs ' + newLeg);
  const chains = [
    [{form:"fist",shi:"break",name:"a"},{form:"fist",shi:"chase",name:"b"}],
    [{form:"sword",shi:"break",name:"a"},{form:"sword",shi:"parry",name:"b"},{form:"sword",shi:"chase",name:"c"}],
    [{form:"qinggong",shi:"chase",name:"a"}],
    [{form:"fist",shi:"parry",name:"a"}]
  ];
  p.sb.run('globalThis.__chains = ' + JSON.stringify(chains) + ';');
  const sbNames = p.sb.run('JSON.stringify(__chains.map(function(c){return synthesizeComboName(c);}))');
  const newNames = JSON.stringify(chains.map(c => combat.synthesizeComboName(c)));
  check('S19c synthesizeComboName', sbNames === newNames, sbNames + ' vs ' + newNames);
})();

/* 通用对决建场：创角 + 开局（两侧同种子） */
function duelPair(seed, cfgExtra) {
  const p = m1pair(seed);
  const cfg = Object.assign({
    enemyName: '测试敌', enemyTitle: 't', enemyStance: 'gang', enemyPower: 60, enemyHp: 140,
    rewardGold: 32, rewardFame: 15, rewardExp: 26, contextTitle: '对表对决'
  }, cfgExtra || {});
  p.sb.run('startDuel(' + JSON.stringify(cfg) + ');');
  const d = combat.initDuel(p.nst.st, cfg, { rand: p.nst.rand });
  return { sb: p.sb, nst: p.nst, d: d, cfg: cfg };
}
function compareDuel(p, d, label) {
  const sbD = p.sb.run('JSON.stringify(duelState)');
  const r = deepEq(JSON.parse(sbD), JSON.parse(JSON.stringify(d)), label);
  check(label, r === null, r ? String(r).slice(0, 300) : undefined);
}

/* S20 开局（印记初始化 + 羁绊 + 意图定种） */
[201, 202].forEach(seed => {
  const p = duelPair(seed);
  compareStates(p.sb, p.nst, 'S20 开局后 state seed=' + seed);
  compareDuel(p, p.d, 'S20 开局 duelState seed=' + seed);
});

/* S21 三招全流程（逐轮出招 + 终局奖励） */
[211, 212, 213].forEach(seed => {
  const p = duelPair(seed);
  const nenv = newEnv(p.nst.rand, seed);
  const cards = ['taizu_changquan', 'songfeng_jian', 'wuhu_dao'];
  for (let i = 0; i < 3; i++) {
    p.sb.run('playDuelCard(' + JSON.stringify(cards[i]) + ');');
    combat.playDuelCard(p.nst.st, p.d, cards[i], nenv);
    compareStates(p.sb, p.nst, 'S21 第' + (i + 1) + '招后 state seed=' + seed);
    compareDuel(p, p.d, 'S21 第' + (i + 1) + '招后 duelState seed=' + seed);
  }
  /* 原版第 3 招内部已 finishDuel（:7651）——不再显式二调（会双发奖励） */
  const sbRes = JSON.parse(p.sb.run('JSON.stringify({gold:state.gold,fame:state.fame,exp:state.exp,finished:duelState.finished})'));
  compareStates(p.sb, p.nst, 'S21 终局后 state seed=' + seed);
  compareDuel(p, p.d, 'S21 终局后 duelState seed=' + seed);
  check('S21 终局读数一致 seed=' + seed, sbRes.finished === true, JSON.stringify(sbRes));
});

/* S22 引爆与三才（预置印记 + zhuan 收束） */
(function S22() {
  const p = duelPair(221);
  p.sb.run('duelState.tokens = {jianyi:2,bagang:1,taiji:0,beiming:0}; duelState.comboChain=["qi","cheng"]; duelState.round=3;');
  p.d.tokens = { jianyi: 2, bagang: 1, taiji: 0, beiming: 0 };
  p.d.comboChain = ["qi", "cheng"]; p.d.round = 3;
  p.sb.run('playDuelCard("wuhu_dao");');
  combat.playDuelCard(p.nst.st, p.d, "wuhu_dao", newEnv(p.nst.rand, 221));
  compareStates(p.sb, p.nst, 'S22 引爆+三才 state');
  compareDuel(p, p.d, 'S22 引爆+三才 duelState');
})();

/* S23 调息（每招一次 + 二次拒） */
(function S23() {
  const p = duelPair(231);
  p.sb.run('duelMeditate(); duelMeditate();');
  const nenv = newEnv(p.nst.rand, 231);
  combat.duelMeditate(p.nst.st, p.d, nenv);
  combat.duelMeditate(p.nst.st, p.d, nenv);
  compareStates(p.sb, p.nst, 'S23 调息 state');
  compareDuel(p, p.d, 'S23 调息 duelState');
})();

/* S24 终局分支（缉拿 splice / 大事胜 alt 回流 / 败局 lose+失败代价掷） */
(function S24() {
  stubStore.clear();
  /* 胜 + bountyIndex splice */
  const p1 = duelPair(241);
  p1.sb.run('duelState.bountyIndex = 0;');
  p1.d.bountyIndex = 0;
  p1.sb.run('playDuelCard("taizu_changquan"); playDuelCard("songfeng_jian"); playDuelCard("wuhu_dao"); finishDuel();');
  const nenv1 = newEnv(p1.nst.rand, 241);
  combat.playDuelCard(p1.nst.st, p1.d, "taizu_changquan", nenv1);
  combat.playDuelCard(p1.nst.st, p1.d, "songfeng_jian", nenv1);
  combat.playDuelCard(p1.nst.st, p1.d, "wuhu_dao", nenv1);
  combat.finishDuel(p1.nst.st, p1.d, nenv1);
  compareStates(p1.sb, p1.nst, 'S24a 缉拿胜 state');
  check('S24a 缉拿 splice', p1.nst.st.bounties.length === JSON.parse(p1.sb.run('JSON.stringify(state.bounties.length)')));

  stubStore.clear();
  /* 大事胜：we_ id crisis → alt 队列 + 邸报 + crises 移除 */
  const p2 = duelPair(242);
  p2.sb.run('state.crises.push({id:"we_test",region:"luoyang",title:"测试大事",remainTurns:3,enemyName:"匪",tileIdx:3}); duelState.crisisId="we_test";');
  p2.nst.st.crises.push({ id: "we_test", region: "luoyang", title: "测试大事", remainTurns: 3, enemyName: "匪", tileIdx: 3 });
  p2.d.crisisId = "we_test";
  p2.sb.run('playDuelCard("taizu_changquan"); playDuelCard("songfeng_jian"); playDuelCard("wuhu_dao"); finishDuel();');
  const nenv2 = newEnv(p2.nst.rand, 242);
  combat.playDuelCard(p2.nst.st, p2.d, "taizu_changquan", nenv2);
  combat.playDuelCard(p2.nst.st, p2.d, "songfeng_jian", nenv2);
  combat.playDuelCard(p2.nst.st, p2.d, "wuhu_dao", nenv2);
  combat.finishDuel(p2.nst.st, p2.d, nenv2);
  compareStates(p2.sb, p2.nst, 'S24b 大事胜 state');
  const sbQueue = p2.sb.run('localStorage.getItem("qunxia-result-queue-v1")');
  const newQueue = stubStore.getItem('qunxia-result-queue-v1');
  check('S24b alt 回流队列一致', sbQueue === newQueue && /"outcome":"alt"/.test(newQueue || ''), sbQueue + ' vs ' + newQueue);

  stubStore.clear();
  /* 大事终局：canon 败代价区间定种掷 + 回流（胜负按实局定，两侧同序必然同局） */
  const p3 = duelPair(243);
  p3.sb.run('CANON_EVENTS_SCHEDULE.push({id:"we_t2",title:"测试败",region:"luoyang",failInjury:[2,4],failRenown:[-10,-5],enemyName:"匪",loseText:"败叙事"});');
  (D.CANON_EVENTS_SCHEDULE || []).push({ id: "we_t2", title: "测试败", region: "luoyang", failInjury: [2, 4], failRenown: [-10, -5], enemyName: "匪", loseText: "败叙事" });
  p3.sb.run('state.crises.push({id:"we_t2",region:"luoyang",title:"测试败",remainTurns:3,enemyName:"匪",tileIdx:3}); duelState.crisisId="we_t2";');
  p3.nst.st.crises.push({ id: "we_t2", region: "luoyang", title: "测试败", remainTurns: 3, enemyName: "匪", tileIdx: 3 });
  p3.d.crisisId = "we_t2";
  p3.sb.run('playDuelCard("taizu_changquan"); playDuelCard("songfeng_jian"); playDuelCard("wuhu_dao"); finishDuel();');
  const nenv3 = newEnv(p3.nst.rand, 243);
  combat.playDuelCard(p3.nst.st, p3.d, "taizu_changquan", nenv3);
  combat.playDuelCard(p3.nst.st, p3.d, "songfeng_jian", nenv3);
  combat.playDuelCard(p3.nst.st, p3.d, "wuhu_dao", nenv3);
  combat.finishDuel(p3.nst.st, p3.d, nenv3);
  compareStates(p3.sb, p3.nst, 'S24c 大事终局 state');
  const sbQueue3 = p3.sb.run('localStorage.getItem("qunxia-result-queue-v1")');
  const newQueue3 = stubStore.getItem('qunxia-result-queue-v1');
  check('S24c 回流队列一致（alt/lose 按实局）', sbQueue3 === newQueue3, sbQueue3 + ' vs ' + newQueue3);
})();

/* S25 推荐手牌（逐轮打分排序） */
(function S25() {
  const p = duelPair(251);
  p.sb.run('globalThis.__hand = (function(){ var inner = MARTIAL_DB[state.equippedInner] || MARTIAL_DB.zixia_shengong; return state.equippedMoves.map(function(id){return MARTIAL_DB[id];}).filter(Boolean).concat([{id:"__ult__",name:inner.ultName,stance:"inner",comboRole:"zhuan",form:"sword",shi:"chase",power:inner.ultPower,mpCost:inner.ultCost,isUlt:true}]); })();');
  const sbPick = p.sb.run('JSON.stringify(pickRecommendedDuelCards(__hand, duelState, STANCE_META[duelState.nextEnemyStance].beatenBy).recommended.map(function(c){return c.id;}))');
  const hand = combat.buildHand(p.nst.st, p.d);
  const newPick = JSON.stringify(combat.pickRecommendedDuelCards(hand, p.d, D.STANCE_META[p.d.nextEnemyStance].beatenBy).recommended.map(c => c.id));
  check('S25 推荐手牌', sbPick === newPick, sbPick + ' vs ' + newPick);
})();

/* 共享真 D 快照/还原：payload 合并场景会往真表里塞扩展条目（原版「只增不覆盖」语义），
 * 沙箱每场从源重建、真 D 跨场景累积——两侧起点必须同源，段末还原。 */
const M3_SNAP = {
  martial: JSON.parse(JSON.stringify(D.MARTIAL_DB)),
  items: JSON.parse(JSON.stringify(D.ITEMS_DB)),
  sects: JSON.parse(JSON.stringify(D.SECTS_DB)),
  masters: D.MASTERS_INIT.length,
  canon: D.CANON_EVENTS_SCHEDULE.length,
  hadKnots: !!D.KNOT_SCENES
};
function restoreM3() {
  D.MARTIAL_DB = M3_SNAP.martial;
  D.ITEMS_DB = M3_SNAP.items;
  D.SECTS_DB = M3_SNAP.sects;
  D.MASTERS_INIT.length = M3_SNAP.masters;
  D.CANON_EVENTS_SCHEDULE.length = M3_SNAP.canon;
  if (!M3_SNAP.hadKnots) delete D.KNOT_SCENES;
}

/* ══ M3：payload 内容桥对表（systems/payload.js ⇔ content-merge.js QUNXIA_MERGE）══ */
/* content-merge.js 是 IIFE 整文件：给 window/localStorage/数据表/SIDE_CAST=[]/ROMANCE_CAST=[]
 * 桩后整体 eval，取 window.QUNXIA_MERGE 与 window.QUNXIA_CRISIS_REWARD 作原版对照。
 * B/C 配角池（SIDE_CAST push 分支）= P4-B 豁免：两侧同置空池（新版不接 B/C，沙箱同）。 */
const payloadSys = require(path.join(GAME_DIR, 'systems', 'payload.js'));
function buildMergeSandbox() {
  const c = {
    window: { addEventListener: function () {} },
    document: { getElementById: function () { return null; } },
    localStorage: { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} },
    Math: Object.create(Math),
    console: console,
    MARTIAL_DB: JSON.parse(JSON.stringify(D.MARTIAL_DB)),
    ITEMS_DB: JSON.parse(JSON.stringify(D.ITEMS_DB)),
    SECTS_DB: JSON.parse(JSON.stringify(D.SECTS_DB)),
    MASTERS_INIT: JSON.parse(JSON.stringify(D.MASTERS_INIT)),
    CANON_EVENTS_SCHEDULE: JSON.parse(JSON.stringify(D.CANON_EVENTS_SCHEDULE)),
    SIDE_CAST: [],
    ROMANCE_CAST: [],
    renderAll: function () {},
    addLog: function () {},
    state: null
  };
  vm.createContext(c);
  const cmText = lib.loadSrc('view/games/qunxia/content-merge.js').text;
  vm.runInContext(cmText, c, { filename: 'content-merge.js' });
  /* content-merge 把函数挂 window（浏览器里 window 即全局）——vm 里需提升为上下文全局 */
  c.QUNXIA_MERGE = c.window.QUNXIA_MERGE;
  c.QUNXIA_CRISIS_REWARD = c.window.QUNXIA_CRISIS_REWARD;
  /* 原版 sceneLine（game.html :10896）切进同上下文，供当场戏对表 */
  vm.runInContext(lib.sliceDecl(gameSrc, 'sceneLine', 'function').text, c);
  return c;
}
const MERGE_FIXTURE = {
  gen: 3,
  arts: [
    { id: 'yg_taixuan_ext', name: '太玄经·刊', k: 'neigong', nat: 'yin', t: 'tian', f: 300, s: ['xiake'] },
    { id: 'ext_fist_a', name: '开碑手·刊', k: 'quan', nat: 'gang', t: 'xuan', f: 80, s: ['gaibang_ext'] },
    { id: 'ext_fist_b', name: '锁喉拴·刊', k: 'quan', nat: 'xie', t: 'huang', f: 40, s: ['gaibang_ext'] },
    { id: 'taizu_changquan', name: '太祖长拳', k: 'quan', t: 'huang', f: 500 }
  ],
  sects: [
    { id: 'gaibang_ext', name: '丐帮·刊', camp: 'zheng' },
    { id: 'shaolin', name: '少林派', camp: 'zheng' }
  ],
  cast: [
    { id: 'ext_s1', name: '化子头·刊', t: 'S', role: 'chief', sec: 'gaibang_ext', bio: '衣衫褴褛双目如电。' },
    { id: 'ext_a1', name: '青竹竿·刊', t: 'A', role: 'elder', sec: 'gaibang_ext', bio: '竹竿在手，天下我有。' },
    { id: 'ext_b1', name: '泼皮三·刊', t: 'B', role: 'member', sec: 'gaibang_ext', bio: '' },
    { id: 'xiaofeng', name: '萧峰', t: 'S', role: 'chief', sec: 'gaibang' }
  ],
  blades: [
    { id: 'wp_ext_a', name: '青罡剑·刊', k: 2 },
    { id: 'wp_ext_b', name: '铁背刀·刊', k: 0 }
  ],
  manuals: [
    { id: 'mnl_ext_a', name: '开碑手谱·刊', art: 'ext_fist_a' },
    { id: 'mnl_ext_b', name: '无名残页', art: 'nonexist_art' }
  ],
  events: [
    { id: 'we_wangpan', name: '王盘山扬威', z: null, boss: 'ext_s1', reward: { kind: 'blade', id: 'wp_ext_a' }, fail: { injury: [2, 5], renown: [-20, -10] }, lose: '败走窄路。' },
    { id: 'we_ext_new', name: '丐帮大校武', z: 'luoyang', boss: 'ext_a1', desc: '丐帮秋操，群丐夺魁。' }
  ],
  knots: { we_wangpan: { cast: ['化子头·刊', '青竹竿·刊'], opts: [{ k: 'join', label: '夺魁' }, { k: 'watch', label: '旁观' }] } }
};

(function S26() {
  const c = buildMergeSandbox();
  c.MERGE_FIXTURE = MERGE_FIXTURE;
  vm.runInContext('QUNXIA_MERGE(MERGE_FIXTURE);', c);
  c.KNOT_SCENES = c.window.KNOT_SCENES; /* merge 运行后才挂 window，此刻提升 */
  const newD = D;
  /* 对拍前先跑新版合并（用同一份 fixture；新版操作 QX3D_DATA 真表——
   * 为可重复对表，本场景断言用「增量键集」而不是全表比对） */
  const preCounts = {
    martial: Object.keys(D.MARTIAL_DB).length,
    items: Object.keys(D.ITEMS_DB).length,
    sects: Object.keys(D.SECTS_DB).length,
    masters: D.MASTERS_INIT.length,
    canon: D.CANON_EVENTS_SCHEDULE.length
  };
  payloadSys.mergePayload(MERGE_FIXTURE);
  const cmp = (label, sbVal, newVal) => {
    const r = deepEq(JSON.parse(JSON.stringify(sbVal)), JSON.parse(JSON.stringify(newVal)), label);
    check(label, r === null, r ? String(r).slice(0, 300) : undefined);
  };
  cmp('S26a 武学桥（只增不覆盖）',
    [c.MARTIAL_DB.yg_taixuan_ext, c.MARTIAL_DB.ext_fist_a, c.MARTIAL_DB.ext_fist_b],
    [D.MARTIAL_DB.yg_taixuan_ext, D.MARTIAL_DB.ext_fist_a, D.MARTIAL_DB.ext_fist_b]);
  check('S26a-2 已有武学不被覆盖', D.MARTIAL_DB.taizu_changquan && Object.keys(D.MARTIAL_DB).length === preCounts.martial + 3);
  cmp('S26b 名兵/秘籍桥',
    [c.ITEMS_DB.wp_ext_a, c.ITEMS_DB.wp_ext_b, c.ITEMS_DB.mnl_ext_a, c.ITEMS_DB.mnl_ext_b || null],
    [D.ITEMS_DB.wp_ext_a, D.ITEMS_DB.wp_ext_b, D.ITEMS_DB.mnl_ext_a, D.ITEMS_DB.mnl_ext_b || null]);
  cmp('S26c 门派桥（regionOf/领袖/top3）', c.SECTS_DB.gaibang_ext, D.SECTS_DB.gaibang_ext);
  check('S26c-2 已有门派 id 不覆盖', !D.SECTS_DB.shaolin || D.SECTS_DB.shaolin.name !== '少林派');
  const sbNewMasters = c.MASTERS_INIT.slice(-2); /* S/A 两具（B/C 走 SIDE_CAST，P4-B 豁免） */
  const newNewMasters = D.MASTERS_INIT.slice(-2);
  cmp('S26d 名宿桥（S/A 进池）', sbNewMasters, newNewMasters);
  const sbEv = c.CANON_EVENTS_SCHEDULE.filter(x => x.id === 'we_wangpan' || x.id === 'we_ext_new');
  const newEv = D.CANON_EVENTS_SCHEDULE.filter(x => x.id === 'we_wangpan' || x.id === 'we_ext_new');
  cmp('S26e 事件桥（EV_TURN_MAP/EV_REGION/tier 折算）', sbEv, newEv);
  check('S26e-2 we_wangpan 旬位 = 3（v3.0 排期）', newEv.find(x => x.id === 'we_wangpan').triggerTurn === 3);
  const sbScene = vm.runInContext('sceneLine({id: "we_wangpan"})', c);
  const newScene = payloadSys.sceneLine({ id: 'we_wangpan' });
  check('S26f sceneLine 当场戏一致', sbScene === newScene && /当场：/.test(newScene) && /只在一念之间/.test(newScene), sbScene + ' vs ' + newScene);
})();

/* 第二份 fixture：真 D 是全件共享且「只增不覆盖」（原版语义），S26 已并第一份，
 * S27 须用全新 id/name 才能走到合并+活档补齐的活路径（幂等跳过 = 首跑红因）。 */
const MERGE_FIXTURE2 = {
  gen: 5,
  cast: [
    { id: 'ext2_s1', name: '丐二侠·刊二', t: 'S', role: 'chief', sec: 'gaibang_ext', bio: '再入江湖的化子头。' },
    { id: 'ext2_a1', name: '竹二青·刊二', t: 'A', role: 'elder', sec: 'gaibang_ext', bio: '二度出山的竹竿客。' }
  ],
  events: [
    { id: 'we_ext2_new', name: '丐帮重开秋操', z: 'luoyang', boss: 'ext2_s1', desc: '丐帮再开秋操大校。' }
  ]
};
/* S27 旧档收 payload + 主奖励（blade 型）——按原版 load 时序：
 * content-merge 在活档上下文里跑（state.masters push + CANON 注入），随后主奖励 */
(function S27() {
  stubStore.clear();
  restoreM3(); /* S26 已往真 D 并过 fixture1——S27 创角基线须回到 24 表（与新鲜沙箱同源） */
  const p = m1pair(271);
  /* 沙箱侧：SIDE_CAST/ROMANCE_CAST 桩 + 整载 content-merge + 合并（活档名宿同步 push） */
  p.sb.run('var SIDE_CAST = []; var ROMANCE_CAST = [];');
  p.sb.run(lib.loadSrc('view/games/qunxia/content-merge.js').text);
  p.sb.run('QUNXIA_MERGE = window.QUNXIA_MERGE; QUNXIA_CRISIS_REWARD = window.QUNXIA_CRISIS_REWARD; MERGE_FIXTURE2 = ' + JSON.stringify(MERGE_FIXTURE2) + ';');
  p.sb.run('QUNXIA_MERGE(MERGE_FIXTURE2);');
  /* 新版侧：表合并（真 D 幂等只增不覆盖）+ 活档名宿补齐 */
  payloadSys.mergePayload(MERGE_FIXTURE2);
  payloadSys.mergeStateMasters(p.nst.st);
  /* 主奖励 blade 型对拍 */
  p.sb.run('QUNXIA_CRISIS_REWARD("we_ext2_new");');
  payloadSys.crisisReward(p.nst.st, 'we_ext2_new', newEnv(p.nst.rand, 271));
  compareStates(p.sb, p.nst, 'S27 旧档合并+主奖励 blade 型');
})();

/* ══ M2 尾批：首局教学对表（systems/combat.js 教学状态机）══════════════ */
restoreM3(); /* S26/S27 已并 fixture 进真 D——教学场景的创角基线须回 24 表 */
/* 通用教学建场：创角 + 开局（两侧同种子；沙箱 advanceTutorialStep 的 DOM 面走通用桩） */
function tutorialPair(seed) {
  const p = m1pair(seed);
  p.sb.run('startTutorialComboBattle();');
  const tut = combat.initTutorial(p.nst.st, { rand: p.nst.rand });
  return { sb: p.sb, nst: p.nst, tb: tut.tb, d: tut.d };
}
function compareTb(p, tb, label) {
  const sbTb = p.sb.run('JSON.stringify(tutorialBattle)');
  const r = deepEq(JSON.parse(sbTb), JSON.parse(JSON.stringify(tb)), label);
  check(label, r === null, r ? String(r).slice(0, 300) : undefined);
}

/* S28a 教学战全脚本：点名三形 → force_break 出破防 → force_chase 出追击 → 成招 ×1.35 →
 * combo_success 强制终局（enemyCurHp=0 + finishDuel）→ outro（tutorialComboDone=true） */
(function S28a() {
  [281, 282].forEach(seed => {
    const p = tutorialPair(seed);
    const nenv = newEnv(p.nst.rand, seed);
    nenv.tb = p.tb;
    nenv.d = p.d;
    nenv.tutorialAdvance = function (step) { combat.tutorialAdvance(p.tb, p.nst.st, step, { d: p.d, save: function () {} }); };
    /* intro 步进（原版 startTutorialComboBattle 尾部 advanceTutorialStep('intro')） */
    combat.tutorialAdvance(p.tb, p.nst.st, 'intro', { d: p.d });
    compareTb(p, p.tb, 'S28a intro tb seed=' + seed);
    /* 点名三形（nameTutorialForm 状态面 = formsNamed[f]=true） */
    p.sb.run('nameTutorialForm("fist"); nameTutorialForm("sword"); nameTutorialForm("qinggong");');
    ['fist', 'sword', 'qinggong'].forEach(f => { p.tb.formsNamed[f] = true; });
    p.sb.run('advanceTutorialStep("force_break");');
    combat.tutorialAdvance(p.tb, p.nst.st, 'force_break', { d: p.d });
    /* force_break 段出破防招（taizu_changquan = break）→ 内部步进 force_chase */
    p.sb.run('playDuelCard("taizu_changquan");');
    combat.playDuelCard(p.nst.st, p.d, 'taizu_changquan', nenv);
    compareTb(p, p.tb, 'S28a 破防后 tb seed=' + seed);
    compareStates(p.sb, p.nst, 'S28a 破防后 state seed=' + seed);
    /* force_chase 段出追击招（songfeng_jian = chase）→ 教学成招 ×1.35 + combo_success + 强制终局 */
    p.sb.run('playDuelCard("wuhu_dao");'); /* wuhu_dao = sword|chase（初始三招中唯一 chase） */
    combat.playDuelCard(p.nst.st, p.d, 'wuhu_dao', nenv);
    compareTb(p, p.tb, 'S28a 成招后 tb seed=' + seed);
    compareStates(p.sb, p.nst, 'S28a 成招后 state seed=' + seed);
    compareDuel(p, p.d, 'S28a 成招后 duelState seed=' + seed);
    check('S28a 教学终局 seed=' + seed,
      p.nst.st.tutorialComboDone === true && p.d.finished === true && JSON.parse(p.sb.run('JSON.stringify(state.tutorialComboDone)')) === true);
  });
})();

/* S28b 错序门禁：force_chase 段出非追击招 ⇒ blocked + 重置本段回 force_break，不扣伤害 */
(function S28b() {
  const p = tutorialPair(283);
  const nenv = newEnv(p.nst.rand, 283);
  nenv.tb = p.tb;
  nenv.d = p.d;
  nenv.tutorialAdvance = function (step) { combat.tutorialAdvance(p.tb, p.nst.st, step, { d: p.d, save: function () {} }); };
  combat.tutorialAdvance(p.tb, p.nst.st, 'intro', { d: p.d });
  p.sb.run('advanceTutorialStep("force_break");');
  combat.tutorialAdvance(p.tb, p.nst.st, 'force_break', { d: p.d });
  p.sb.run('playDuelCard("taizu_changquan");');
  combat.playDuelCard(p.nst.st, p.d, 'taizu_changquan', nenv); /* → force_chase */
  p.sb.run('playDuelCard("taizu_changquan");'); /* 错序：break ≠ chase */
  const r1 = combat.playDuelCard(p.nst.st, p.d, 'taizu_changquan', nenv);
  check('S28b 错序 blocked', r1 && r1.outcome === 'blocked' && p.tb.step === 'force_break',
    JSON.stringify({ outcome: r1 && r1.outcome, step: p.tb.step }));
  compareTb(p, p.tb, 'S28b 错序重置后 tb');
  compareStates(p.sb, p.nst, 'S28b 错序不扣伤害 state');
})();

/* S28c 三招不成招重置（intro 段 allowedShi=null ⇒ 门禁放行，三招耗尽 ⇒ round 重置/敌回满） */
(function S28c() {
  const p = tutorialPair(284);
  const nenv = newEnv(p.nst.rand, 284);
  nenv.tb = p.tb;
  nenv.d = p.d;
  nenv.tutorialAdvance = function (step) { combat.tutorialAdvance(p.tb, p.nst.st, step, { d: p.d, save: function () {} }); };
  combat.tutorialAdvance(p.tb, p.nst.st, 'intro', { d: p.d });
  ['taizu_changquan', 'songfeng_jian', 'wuhu_dao'].forEach(c => {
    p.sb.run('playDuelCard(' + JSON.stringify(c) + ');');
    combat.playDuelCard(p.nst.st, p.d, c, nenv);
  });
  check('S28c 未成招重置', p.d.round === 1 && p.d.enemyCurHp === p.d.enemyMaxHp && p.tb.step === 'force_break',
    JSON.stringify({ round: p.d.round, hp: p.d.enemyCurHp, step: p.tb.step }));
  compareTb(p, p.tb, 'S28c 重置后 tb');
  compareStates(p.sb, p.nst, 'S28c 重置后 state');
})();


/* ══ M4：深度系统对表（systems/deep.js）═══════════════════════════════ */
const deep = require(path.join(GAME_DIR, 'systems', 'deep.js'));

/* S29a 武学升级价（tier 公式：t1 40+lv*28 / t2 85+lv*55 / t3 140+lv*85；天赋调价）*/
(function S29a() {
  const p = m1pair(291);
  const sbCosts = p.sb.run('JSON.stringify([getArtUpgradeCost("taizu_changquan"), getArtUpgradeCost("songfeng_jian"), getArtUpgradeCost("wuhu_dao")])');
  const newCosts = JSON.stringify(['taizu_changquan', 'songfeng_jian', 'wuhu_dao'].map(id => deep.getArtUpgradeCost(p.nst.st, id)));
  check('S29a 武学升级价 t1', sbCosts === newCosts, sbCosts + ' vs ' + newCosts);
  /* 境界上限 */
  const sbCap = p.sb.run('getMaxAllowedArtLevel()');
  const newCap = deep.getMaxAllowedArtLevel(p.nst.st);
  check('S29a-2 境界上限', Number(sbCap) === newCap, sbCap + ' vs ' + newCap);
})();

/* S29b 武学升级（exp 足/不足/境界封顶） */
(function S29b() {
  const p = m1pair(292);
  p.sb.run('state.exp = 500;');
  p.nst.st.exp = 500;
  p.sb.run('upgradeArt("taizu_changquan");');
  deep.upgradeArt(p.nst.st, 'taizu_changquan', newEnv(p.nst.rand, 292));
  compareStates(p.sb, p.nst, 'S29b 武学升级 lv2');
  /* 境界封顶：realmIdx=0 ⇒ cap=2，连续升到 cap 后拒绝 */
  p.sb.run('upgradeArt("taizu_changquan"); upgradeArt("taizu_changquan");');
  deep.upgradeArt(p.nst.st, 'taizu_changquan', newEnv(p.nst.rand, 292));
  deep.upgradeArt(p.nst.st, 'taizu_changquan', newEnv(p.nst.rand, 292));
  compareStates(p.sb, p.nst, 'S29b-2 境界封顶');
})();

/* S29c 穴位冲关（百会 acu.cost 合规 ⇒ exp 扣/上限增） */
(function S29c() {
  const p = m1pair(293);
  p.sb.run('state.exp = 300; state.realmIdx = 2;');
  p.nst.st.exp = 300; p.nst.st.realmIdx = 2;
  p.sb.run('unlockAcupoint("danzhong");');
  deep.unlockAcupoint(p.nst.st, 'danzhong', newEnv(p.nst.rand, 293));
  compareStates(p.sb, p.nst, 'S29c 穴位冲关');
})();

/* S29d 隐庐建筑升级（cost 表 + guojing 折扣） */
(function S29d() {
  const p = m1pair(294);
  p.sb.run('state.gold = 2000; state.estate.buildings.winery = 0;');
  p.nst.st.gold = 2000; p.nst.st.estate.buildings.winery = 0;
  p.sb.run('upgradeEstateBuilding("winery");');
  deep.upgradeEstateBuilding(p.nst.st, 'winery', newEnv(p.nst.rand, 294));
  compareStates(p.sb, p.nst, 'S29d 隐庐建筑升级');
})();

/* S29e 隐庐六劳作（forage/alchemy_jade/clinic/qingxiu 四支定种） */
[295, 296].forEach(seed => {
  const p = m1pair(seed);
  p.sb.run('state.estate.herbs = 5; state.estate.iron = 5;');
  p.nst.st.estate.herbs = 5; p.nst.st.estate.iron = 5;
  p.sb.run('doEstateWork("forage");');
  deep.doEstateWork(p.nst.st, 'forage', newEnv(p.nst.rand, seed));
  p.sb.run('doEstateWork("alchemy_jade");');
  deep.doEstateWork(p.nst.st, 'alchemy_jade', newEnv(p.nst.rand, seed));
  p.sb.run('doEstateWork("clinic");');
  deep.doEstateWork(p.nst.st, 'clinic', newEnv(p.nst.rand, seed));
  compareStates(p.sb, p.nst, 'S29e 隐庐劳作 forage+alchemy+clinic seed=' + seed);
});

/* S29f 传世秘境奖励（无量山：北冥神功+凌波微步+exp） */
(function S29f() {
  const p = m1pair(297);
  p.sb.run('claimCanonicalSecretReward("wuliang");');
  deep.claimCanonicalSecretReward(p.nst.st, 'wuliang', newEnv(p.nst.rand, 297));
  compareStates(p.sb, p.nst, 'S29f 传世秘境奖励 wuliang');
  check('S29f-2 北冥神功入身', p.nst.st.learnedArts.beiming_shengong === 1);
})();



/* ══ M5：名宿交互对表（systems/masters.js）═════════════════════════════ */
restoreM3(); /* M5 场景须从清洁表起步 */
const mastersSys = require(path.join(GAME_DIR, 'systems', 'masters.js'));

/* S30a 把酒论交（好感+12/银-8/名+4/修为+10/限一次） */
(function S30a() {
  const p = m1pair(301);
  p.sb.run('state.currentRegion = "luoyang"; chatWithMaster("xiaofeng"); chatWithMaster("xiaofeng");');
  mastersSys.chatWithMaster(p.nst.st, 'xiaofeng', newEnv(p.nst.rand, 301));
  mastersSys.chatWithMaster(p.nst.st, 'xiaofeng', newEnv(p.nst.rand, 301));
  compareStates(p.sb, p.nst, 'S30a 把酒+限一次');
})();

/* S30b 请益授艺（好感>=55 + exp>=40 ⇒ 学艺 + taughtOnce；再点拒） */
(function S30b() {
  const p = m1pair(302);
  p.sb.run('state.exp = 200; state.masters.find(function(m){return m.id==="xiaofeng";}).affinity = 60;');
  p.nst.st.exp = 200;
  p.nst.st.masters.find(function (m) { return m.id === 'xiaofeng'; }).affinity = 60;
  p.sb.run('learnFromMaster("xiaofeng"); learnFromMaster("xiaofeng");');
  deep; /* noop */
  mastersSys.learnFromMaster(p.nst.st, 'xiaofeng', newEnv(p.nst.rand, 302));
  mastersSys.learnFromMaster(p.nst.st, 'xiaofeng', newEnv(p.nst.rand, 302));
  compareStates(p.sb, p.nst, 'S30b 请益授艺+taughtOnce');
})();

/* S30c 切磋参数构造（冷却/HP 门槛） */
(function S30c() {
  const p = m1pair(303);
  p.sb.run('state.masters.find(function(m){return m.id==="xiaofeng";}).lastDuelTurn = state.turn - 5;');
  p.nst.st.masters.find(function (m) { return m.id === 'xiaofeng'; }).lastDuelTurn = p.nst.st.turn - 5;
  /* 原版 duelMaster 不返回参数（startDuel 即调用），截 startDuel 参数对拍 */
  p.sb.run('window.__lastDuel = null; startDuel = function(cfg) { window.__lastDuel = cfg; };');
  p.sb.run('duelMaster("xiaofeng");');
  var sbDp = JSON.parse(p.sb.run('JSON.stringify(window.__lastDuel)'));
  var dp = mastersSys.duelMaster(p.nst.st, 'xiaofeng', newEnv(p.nst.rand, 303));
  var r = deepEq(sbDp, JSON.parse(JSON.stringify(dp)), 'duelParams');
  check('S30c 切磋参数', r === null, r || undefined);
})();

/* S30d 三幕传记（resolveMasterStoryStage 步进 + rewardArt） */
(function S30d() {
  const p = m1pair(304);
  p.sb.run('state.ap = 5; state.exp = 100; state.realmIdx = 2; state.masters.find(function(m){return m.id==="xiaofeng";}).affinity = 85;');
  p.nst.st.ap = 5; p.nst.st.exp = 100; p.nst.st.realmIdx = 2;
  p.nst.st.masters.find(function (m) { return m.id === 'xiaofeng'; }).affinity = 85;
  /* 第 1 幕 */
  p.sb.run('resolveMasterStoryStage("xiaofeng", 0, "A");');
  mastersSys.resolveMasterStoryStage(p.nst.st, 'xiaofeng', 0, 'A', newEnv(p.nst.rand, 304));
  compareStates(p.sb, p.nst, 'S30d 第1幕后');
  /* 第 2 幕（branch B → 无对决路径） */
  p.sb.run('resolveMasterStoryStage("xiaofeng", 1, "B");');
  mastersSys.resolveMasterStoryStage(p.nst.st, 'xiaofeng', 1, 'B', newEnv(p.nst.rand, 304));
  compareStates(p.sb, p.nst, 'S30d 第2幕后');
  /* 第 3 幕（rewardArt 授艺） */
  p.sb.run('resolveMasterStoryStage("xiaofeng", 2, "A", MASTER_STAGE_REQS[2].apCost);');
  mastersSys.resolveMasterStoryStage(p.nst.st, 'xiaofeng', 2, 'A', newEnv(p.nst.rand, 304));
  compareStates(p.sb, p.nst, 'S30d 第3幕后');
  check('S30d 传记奖励 art', p.nst.st.learnedArts.xianglong_zhang >= 1,
    JSON.stringify({ xianglong: p.nst.st.learnedArts.xianglong_zhang }));
})();


/* ══ M6：终局/周目/碑林对表（systems/endings.js）══════════════════════ */
restoreM3(); /* M6 场景从清洁表起步 */
const endingsSys = require(path.join(GAME_DIR, 'systems', 'endings.js'));

/* S31a 六道途进度（isDone/progressText 扫描） */
(function S31a() {
  const p = m1pair(311);
  p.sb.run('state.karma.xiayi = 60; state.masters[0].affinity = 85; state.masters[1].affinity = 85; state.masters[0].storyStage = 3; state.masters[1].storyStage = 3;');
  p.nst.st.karma.xiayi = 60; p.nst.st.masters[0].affinity = 85; p.nst.st.masters[1].affinity = 85; p.nst.st.masters[0].storyStage = 3; p.nst.st.masters[1].storyStage = 3;
  var newPaths = endingsSys.evaluatePaths(p.nst.st);
  var doneCount = newPaths.filter(function(p) { return p.done; }).length;
  check('S31a 六道途 isDone 扫描', newPaths.length === 6 && doneCount >= 1,
    JSON.stringify({ total: newPaths.length, doneCount: doneCount }));
})();

/* S31b 终局评判（ENDINGS_DB isDone 取首个达成） */
(function S31b() {
  const p = m1pair(312);
  p.sb.run('state.karma.xiayi = 60; state.masters[0].affinity = 85; state.masters[0].storyStage = 3; state.masters[1].affinity = 85; state.masters[1].storyStage = 3;');
  p.nst.st.karma.xiayi = 60; p.nst.st.masters[0].affinity = 85; p.nst.st.masters[0].storyStage = 3; p.nst.st.masters[1].affinity = 85; p.nst.st.masters[1].storyStage = 3;
  var newEnding = endingsSys.evaluateBestEnding(p.nst.st);
  check('S31b 终局评判', newEnding && newEnding.title, JSON.stringify({ title: newEnding.title }));
})();

/* S31c 周目结算（直验：cycle++ + legacyPoints+60 + save 清） */
(function S31c() {
  stubStore.clear();
  stubStore.removeItem('jianghu_legacy_meta_v1');
  var p = m1pair(313);
  var newMeta = endingsSys.startNewGamePlus(p.nst.st, stubStore, newEnv(p.nst.rand, 313));
  check('S31c 周目结算 cycle++/碑点+60', newMeta.cycleCount === 2 && newMeta.legacyPoints === 60,
    JSON.stringify(newMeta));
  check('S31c-2 存档清空', stubStore.getItem(coreState.SAVE_KEY) === null);
})();
/* S31d 道途铭刻（claimPathVictory：cycle++ + 120 碑点 + unlockedPaths push） */
(function S31d() {
  stubStore.removeItem('jianghu_legacy_meta_v1'); /* 重置 legacy（S31c 残留） */
  const p = m1pair(314);
  var newMeta = endingsSys.claimPathVictory(p.nst.st, 'path_sword', stubStore, newEnv(p.nst.rand, 314));
  check('S31d 道途铭刻', newMeta.cycleCount === 2 && newMeta.legacyPoints === 120 && newMeta.unlockedPaths.includes('path_sword'),
    JSON.stringify(newMeta));
})();

/* S31e 碑林遗泽开关（toggleLegacyPerk 激活/取消/点不足） */
(function S31e() {
  var storage = { _m: {}, getItem: function (k) { return this._m[k] || null; }, setItem: function (k, v) { this._m[k] = String(v); }, removeItem: function (k) { delete this._m[k]; } };
  var meta = endingsSys.toggleLegacyPerk(storage, 'perk_luck', {}); /* 点不足（0 < 50） => 不变 */
  check('S31e-1 碑点不足拒', meta.legacyPoints === 0 && !meta.activePerks.includes('perk_luck'));
  storage.setItem('jianghu_legacy_meta_v1', JSON.stringify({ cycleCount: 2, legacyPoints: 100, unlockedPaths: [], activePerks: [] }));
  meta = endingsSys.toggleLegacyPerk(storage, 'perk_luck', {}); /* 激活（100 >= 50） => -50 */
  check('S31e-2 激活', meta.legacyPoints === 50 && meta.activePerks.includes('perk_luck'));
  meta = endingsSys.toggleLegacyPerk(storage, 'perk_luck', {}); /* 取消 => +50 退回 */
  check('S31e-3 取消', meta.legacyPoints === 100 && !meta.activePerks.includes('perk_luck'));
})();



/* ══ M6 尾：BGM 五曲合成器对表（game/ui/audio.js · 计划书 §四 #13）════════ */
/* 显式豁免（audio.js 件头注已登记）：prefs 件内化 / 自选原声与设置模态不移植——判「乐谱原样 + 行为等价」，不判源码逐字 */
restoreM3();
const audioSys = require(path.join(GAME_DIR, 'ui', 'audio.js'));

/* S32 五曲乐谱原样（BGM_SUITES 数据逐曲深比；沙箱切片 = N_* 音高表 + BGM_SUITES） */
(function S32() {
  var src = [
    ['const', 'N_REST'],

    ['const', 'N_E3'], ['const', 'N_C4'], ['const', 'N_C5'],
    ['const', 'BGM_SUITES']
  ].map(function (t) { return slice(t[0], t[1]); }).join('\n');
  var ctx = {}; vm.runInNewContext(src + '\n;var __SUITES = BGM_SUITES;', ctx); /* const 词法声明不挂 vm 全局对象，var 桥接读出 */
  var orig = ctx.__SUITES, mine = audioSys.BGM_SUITES;
  check('S32 五曲曲数一致', orig.length === 5 && mine.length === 5,
    JSON.stringify({ orig: orig.length, mine: mine.length }));
  for (var i = 0; i < Math.min(orig.length, mine.length); i++) {
    var diff = deepEq(orig[i], mine[i], 'suite');
    check('S32 乐谱原样 #' + i + ' ' + (orig[i] ? orig[i].id : '?'), !diff, diff || (orig[i] && orig[i].name));
  }
})();

/* S33 场景映射对表（原版 autoAdaptBgmToContext 沙箱实跑 vs suiteIdxForRegion + duel 往返） */
(function S33() {
  var fsrc = slice('function', 'autoAdaptBgmToContext');
  var ctx = { soundEnabled: true, gameSettings: { autoSwitchBgm: true, bgmVolume: 0.65 }, usingCustomAudioFile: false,
    bgmStepIdx: 0, restartBgmTimer: function () {}, getRegion: function (id) { return { id: id }; },
    state: { currentRegion: 'luoyang' } };
  vm.runInNewContext(fsrc + '\n;var __F = autoAdaptBgmToContext;', ctx);
  check('S33 原版切片可载入', typeof ctx.__F === 'function', String(typeof ctx.__F));
  var cases = [['gumu', 3], ['huashan', 2], ['dali', 1], ['xiangyang', 0], ['luoyang', 4]];
  cases.forEach(function (c) {
    ctx.bgmSuiteIdx = 0; ctx.state.currentRegion = c[0]; ctx.__F('scene');
    var mine = audioSys.suiteIdxForRegion(c[0]);
    check('S33 场景映射 ' + c[0], ctx.bgmSuiteIdx === c[1] && mine === c[1],
      JSON.stringify({ region: c[0], orig: ctx.bgmSuiteIdx, mine: mine, expect: c[1] }));
  });
  /* duel → 1 难念的经；duel_end → 还原战前曲 */
  ctx.bgmSuiteIdx = 3; ctx.__F('duel');
  var afterDuel = ctx.bgmSuiteIdx;
  ctx.__F('duel_end');
  check('S33 duel→难念的经 + duel_end 还原', afterDuel === 1 && ctx.bgmSuiteIdx === 3,
    JSON.stringify({ afterDuel: afterDuel, restored: ctx.bgmSuiteIdx }));
})();

/* ══ S34 P4-A 市井层（册300）：七表 + 散列/刷名/选槽/归岗 对表 ═══════════
 * 轻量沙箱：只切 STREET 七表 + 四个纯函数（不背 9MB 全链，也不含 base64 以外的
 * 状态机）——base64 art 由生成器占位化为空串，对表两侧同置 '<P>' 后逐字段比。 */
function buildStreetSandbox() {
  const ctx = { Math: Object.create(Math), console: console };
  vm.createContext(ctx);
  const run = function (code) { return vm.runInContext(code, ctx, { filename: 'street-sandbox.js' }); };
  ['STREET_ZONE_BLUR', 'STREET_INTEL_LABEL', 'STREET_SURNAMES', 'STREET_GIVEN',
    'STREET_SCENE_RULES', 'STREET_TILE_BIND', 'STREET_JOBS', 'STREET_JOB_BY_ID']
    .forEach(n => run(slice('const', n) + '\n'));
  ['streetHash', 'zoneBlur', 'otherZoneBlur', 'matchStreetJob', 'planStreetSlots', 'rollStreetName']
    .forEach(f => run(slice('function', f) + '\n'));
  return { run: run };
}

(function S34() {
  const street = require(path.join(GAME_DIR, 'systems', 'street.js'));
  const sb = buildStreetSandbox();
  const normJobs = (list) => list.map(j => { const c = Object.assign({}, j); c.art = '<P>'; return c; });

  let r = deepEq(normJobs(sb.run('STREET_JOBS')), normJobs(D.STREET_JOBS), 'jobs');
  check('S34a 市井岗位表（6 岗 · art 占位化后逐字段）', r === null, r ? String(r).slice(0, 180) : undefined);

  ['STREET_ZONE_BLUR', 'STREET_INTEL_LABEL', 'STREET_SURNAMES', 'STREET_GIVEN', 'STREET_TILE_BIND'].forEach((n) => {
    const rr = deepEq(sb.run(n), D[n], n);
    check('S34b ' + n, rr === null, rr || undefined);
  });
  const sbRules = sb.run('JSON.stringify(STREET_SCENE_RULES.map(function(x){return [x.jobId, x.type || null, String(x.re || null)]}))');
  const nRules = JSON.stringify(D.STREET_SCENE_RULES.map(x => [x.jobId, x.type || null, String(x.re || null)]));
  check('S34c 场景规则（岗/类型/正则源）', sbRules === nRules, sbRules + ' ≠ ' + nRules);

  const regionIds = (D.REGIONS || []).map(x => x.id);
  let badSlot = null, badName = null, badMatch = null, badHash = null;

  regionIds.forEach((id) => {
    const region = coreTime.getRegion(id);
    const sbSlots = sb.run('JSON.stringify(planStreetSlots(' + JSON.stringify(region) + '))');
    const nSlots = JSON.stringify(street.planStreetSlots(region));
    if (sbSlots !== nSlots && !badSlot) badSlot = id + ': ' + sbSlots + ' ≠ ' + nSlots;
    ['waiter', 'escort', 'apothecary', 'bookseller', 'officer', 'beggar'].forEach((job) => {
      const x = sb.run('rollStreetName(' + JSON.stringify(id) + ',' + JSON.stringify(job) + ')');
      const y = street.rollStreetName(id, job);
      if (x !== y && !badName) badName = id + '/' + job + ': ' + x + ' ≠ ' + y;
    });
    (region.tiles || []).forEach((tile, idx) => {
      const x = sb.run('matchStreetJob(' + JSON.stringify(tile) + ')');
      const y = street.matchStreetJob(tile);
      if (x !== y && !badMatch) badMatch = id + '#' + idx + ': ' + x + ' ≠ ' + y;
    });
  });
  ['luoyang', 'luoyang:waiter', 'shaolin:beggar', ''].forEach((s) => {
    const x = sb.run('streetHash(' + JSON.stringify(s) + ')');
    const y = street.streetHash(s);
    if (x !== y && !badHash) badHash = s + ': ' + x + ' ≠ ' + y;
  });
  check('S34d 选槽 planStreetSlots ×' + regionIds.length + ' 地', badSlot === null, badSlot || undefined);
  check('S34e 刷名 ×' + regionIds.length + ' 地 ×6 岗（同区域同岗恒同名）', badName === null, badName || undefined);
  check('S34f 归岗 matchStreetJob ×全格', badMatch === null, badMatch || undefined);
  check('S34g FNV 散列 streetHash', badHash === null, badHash || undefined);
})();

/* ══ S35 P4-C 朝廷风声（册301）：短词 / 风声池 / 角标 / 过旬结算 对表 ═══════
 * 轻量沙箱：只切两张地界表 + 朝廷函数族，state 由本件按用例注入。 */
function buildCourtSandbox() {
  const ctx = { Math: Object.create(Math), console: console };
  vm.createContext(ctx);
  const run = function (code) { return vm.runInContext(code, ctx, { filename: 'court-sandbox.js' }); };
  ['COURT_BORDER_REGIONS', 'COURT_NORTH_REGIONS'].forEach(n => run(slice('const', n) + '\n'));
  ['ensureP4CStateDefaults', 'clampCourt', 'meritWord', 'wantedWord', 'borderWord', 'yanyunWord',
    'courtScrollIsCourt', 'courtBountyTarget', 'buildCourtRumorPool', 'ensureCourtRumors',
    'settleCourtOnNewTurn', 'courtBadgeModel', 'courtState'].forEach(f => run(slice('function', f) + '\n'));
  return { run: run };
}

(function S35() {
  const court = require(path.join(GAME_DIR, 'systems', 'court.js'));
  const sb = buildCourtSandbox();

  /* ① 短词逐档（原 meritWord / wantedWord / borderWord / yanyunWord） */
  let badWord = null;
  [-100, -60, -25, -24, -1, 0, 1, 24, 25, 59, 60, 100].forEach((n) => {
    const pairs = [
      ['meritWord', n, sb.run('meritWord(' + n + ')'), court.meritWord(n)],
      ['borderWord', n, sb.run('borderWord(' + n + ')'), court.borderWord(n)],
      ['wantedWord', Math.max(0, Math.min(5, n)), sb.run('wantedWord(' + Math.max(0, Math.min(5, n)) + ')'), court.wantedWord(Math.max(0, Math.min(5, n)))],
      ['yanyunWord', n, sb.run('yanyunWord(Math.max(0,Math.min(2,' + n + ')))'), court.yanyunWord(Math.max(0, Math.min(2, n)))]
    ];
    pairs.forEach((p) => { if (p[2] !== p[3] && !badWord) badWord = p[0] + '(' + p[1] + '): ' + p[2] + ' ≠ ' + p[3]; });
  });
  check('S35a 朝廷短词逐档（功名/通缉/边谊/燕云）', badWord === null, badWord || undefined);

  /* ② 风声池 + 角标 + 过旬结算（三态：初入江湖 / 北地通缉细作 / 功名在身） */
  const cases = [
    { turn: 1, currentRegion: 'luoyang', scrollProposition: null, sideScrollBias: {}, sideFlags: {}, court: null },
    { turn: 5, currentRegion: 'yanmenguan', scrollProposition: { id: 'chaoting' }, sideScrollBias: { chousha: 1, bounty: 1 }, sideFlags: { mu: 'alive' }, court: { merit: -5, wanted: 2, border: 0, spy: true, yanyun: 1, flags: {}, rumorTurn: 0, rumors: [], pinId: null } },
    { turn: 9, currentRegion: 'heimuya', scrollProposition: { id: 'x' }, sideScrollBias: {}, sideFlags: { fengBounty: 'cleared' }, court: { merit: 30, wanted: 1, border: -12, spy: false, yanyun: 0, flags: { delayBoost: 2 }, rumorTurn: 0, rumors: [], pinId: null } }
  ];
  cases.forEach((c, i) => {
    const sbState = JSON.parse(JSON.stringify(c));
    sb.run('state = ' + JSON.stringify(sbState) + ';');
    const sbPool = JSON.parse(sb.run('JSON.stringify(ensureCourtRumors().rumors.map(function(r){return [r.id,r.type,r.weight];}))'));
    const sbBadges = JSON.parse(sb.run('JSON.stringify(courtBadgeModel())'));
    const sbSettle = JSON.parse(sb.run('settleCourtOnNewTurn(); JSON.stringify({m:state.court.merit,w:state.court.wanted,b:state.court.border,y:state.court.yanyun})'));

    const st = JSON.parse(JSON.stringify(c));
    court.ensureState(st);
    const nPool = court.ensureRumors(st).rumors.map(r => [r.id, r.type, r.weight]);
    const nBadges = court.badgeModel(st);
    court.settleOnNewTurn(st);
    const nSettle = { m: st.court.merit, w: st.court.wanted, b: st.court.border, y: st.court.yanyun };

    const r1 = deepEq(sbPool, nPool, 'pool');
    const r2 = deepEq(sbBadges, nBadges, 'badges');
    const r3 = deepEq(sbSettle, nSettle, 'settle');
    check('S35b 风声池 case' + i, r1 === null, r1 || undefined);
    check('S35c 顶栏角标 case' + i, r2 === null, r2 || undefined);
    check('S35d 过旬结算 case' + i, r3 === null, r3 || undefined);
  });

  /* ③ 海捕目标（sideFlags 五态） */
  const flagCases = [
    {}, { mu: 'down' }, { mu: 'down', fengBounty: 'cleared' },
    { mu: 'down', fengBounty: 'cleared', tian: 'repelled' },
    { mu: 'down', fengBounty: 'cleared', tian: 'repelled', yun: 'fled', eyu: 'down' }
  ];
  let badTarget = null;
  flagCases.forEach((f, i) => {
    sb.run('state = { sideFlags: ' + JSON.stringify(f) + ', court: ' + JSON.stringify({ merit: 0, wanted: 0, border: 0, spy: false, yanyun: 0, flags: {}, rumorTurn: 0, rumors: [], pinId: null }) + ' };');
    const a = sb.run('JSON.stringify(courtBountyTarget())');
    const b = JSON.stringify(court.bountyTarget({ sideFlags: f }));
    if (a !== b && !badTarget) badTarget = 'case' + i + ': ' + a + ' ≠ ' + b;
  });
  check('S35e 海捕目标链（五态）', badTarget === null, badTarget || undefined);
})();

/* ══ S36 P4-B 配角包（册304 B1b）：在场/权重/偏置 对表 ═══════════════════
 * SIDE_CAST 源里 3.5MB 是 base64，先剥 art 再进 vm（剥法与抽取器同规则）。 */
function buildSideSandbox() {
  const ctx = { Math: Object.create(Math), console: console };
  vm.createContext(ctx);
  const run = function (code) { return vm.runInContext(code, ctx, { filename: 'side-sandbox.js' }); };
  const cast = slice('const', 'SIDE_CAST').replace(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g, '');
  run(cast + '\n');
  run('const SIDE_BY_ID = Object.fromEntries(SIDE_CAST.map(function(c){return [c.id, c];}));\n');
  ['ensureP4BStateDefaults', 'ensureOutcomeFlags', 'sideFlags', 'addSideBias', 'sideScrollWeight', 'sideSpawnWeight', 'ensureSidePresence', 'streetHash', 'sideActList']
    .forEach(f => run(slice('function', f) + '\n'));
  run('function isRookiePeriod(){ return state.turn <= 4; }\n');
  return { run: run };
}

(function S36() {
  const side = require(path.join(GAME_DIR, 'systems', 'side.js'));
  const sb = buildSideSandbox();
  const states = [
    { turn: 3, currentRegion: 'luoyang', sidePresence: {}, sideScrollBias: {}, sideFlags: {} },
    { turn: 12, currentRegion: 'huashan', sidePresence: {}, sideScrollBias: { romance: 2, chousha: 1, court: 1 }, sideFlags: { bullyIntel: true } }
  ];
  let badPresence = null, badWeight = null, badScroll = null;
  states.forEach((raw, si) => {
    sb.run('state = ' + JSON.stringify(raw) + ';');
    ['luoyang', 'huashan', 'yanziwu'].forEach((rid) => {
      const a = sb.run('JSON.stringify(ensureSidePresence({id:' + JSON.stringify(rid) + '}).map(function(c){return c.id}))');
      const st = JSON.parse(JSON.stringify(raw));
      side.ensureState(st);
      const b = JSON.stringify(side.ensurePresence(st, { id: rid, tiles: [] }).map(c => c.id));
      if (a !== b && !badPresence) badPresence = 's' + si + '/' + rid + ': ' + a + ' ≠ ' + b;
    });
    (side.list || []).slice(0, 12).forEach((c) => {
      const a = sb.run('JSON.stringify(sideSpawnWeight(SIDE_CAST[' + side.list.indexOf(c) + ']))');
      const b = JSON.stringify(side.spawnWeight(JSON.parse(JSON.stringify(raw)), c));
      if (a !== b && !badWeight) badWeight = c.id + ': ' + a + ' ≠ ' + b;
    });
    [['romance'], ['chousha', 'court'], ['nothing']].forEach((tags) => {
      const a = sb.run('sideScrollWeight(' + JSON.stringify(tags) + ')');
      const b = side.scrollWeight(JSON.parse(JSON.stringify(raw)), tags);
      if (Math.abs(a - b) > 1e-9 && !badScroll) badScroll = tags.join('+') + ': ' + a + ' ≠ ' + b;
    });
  });
  check('S36a 每旬在场（2 态 ×3 地界）', badPresence === null, badPresence || undefined);
  check('S36b 出场权重（前 12 人 ×2 态）', badWeight === null, badWeight || undefined);
  check('S36c 卷轴偏置权重（三组标签 ×2 态）', badScroll === null, badScroll || undefined);

  /* S36d 动作清单（册305 起已接 10 人）：id 与顺序逐人对表 */
  sb.run('state = ' + JSON.stringify(states[0]) + ';');
  const ids10 = ['ping4', 'zheng_e', 'xiaoer', 'laodenuo', 'cheng', 'wangui', 'zhike', 'shuang', 'qu', 'yilin',
    'feng', 'tang', 'tian', 'mu', 'lu', 'yue', 'zhuli', 'eyu', 'yun',
    'hebi', 'yin', 'yaren', 'guofu', 'yelv'];
  let badList = null;
  ids10.forEach((id) => {
    const a = sb.run('JSON.stringify(sideActList(SIDE_BY_ID[' + JSON.stringify(id) + ']).map(function(x){return x.id}))');
    const b = JSON.stringify(side.actsFor(JSON.parse(JSON.stringify(states[0])), side.castOf(id)).map((x) => x.id));
    if (a !== b && !badList) badList = id + ': ' + a + ' ≠ ' + b;
  });
  check('S36d 动作清单 ×15 人（id 同序）', badList === null, badList || undefined);
})();

/* ══ 末行 ═══════════════════════════════════════════════════════════════ */
failures.slice(0, 8).forEach(f => console.log('FAIL ' + f));
if (failed === 0) {
  console.log('TABLE_CHECK_ALL_GREEN ' + passed + '/' + (passed + failed));
} else {
  console.log('TABLE_CHECK_FAIL ' + passed + '/' + (passed + failed));
  process.exit(1);
}
