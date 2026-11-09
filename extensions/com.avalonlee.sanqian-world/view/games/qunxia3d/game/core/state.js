/* core/state.js — state 形状 + 存档 + gen 对账 + 创角应用（源规格 §四 #1）
 * 迁移源（view/games/qunxia/game.html，行号为 2026-11-08 工作树实测）：
 *   state 形状   :2906–:3035（逐字节抽取件 data/state-init.js，本件只做深拷贝实例化）
 *   saveGame     :3132–:3144   loadGame :3160–:3203   reconcileWorldGen :3210–:3223
 *   selectOrigin :9211–:9380（state 应用部分；UI 演出留在 ui/creation.js）
 *   rerollOpeningTalents :9041–:9081（概率分布原样；DOM 调用剥离）
 *   drawScrollProposition :6552–:6566   applyScrollPropositionToNewGame :6767–:6799
 *   getLegacyMeta :9622–:9633（键 jianghu_legacy_meta_v1，:9620）
 * 存档新键 = shanqian3d_save_v1（计划书铁律 4）；payload 双键契约（读 qunxia-payload-v1 的
 * gen / 写 qunxia-result-queue-v1 由 time 层经 env 钩子）不动。
 * P4 六族（A/B/C/E/F/Signpost）默认填充的迁移状态：A/B/C/E/F1 已随批迁入 systems/*，
 * 由 app 入口调用；**Hall 每旬结算随 F2、Signpost 仍未迁**——table-check 沙箱按同一位置 stub。
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE；副作用经显式参数（storage / env 钩子）注入。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.core = root.QX3D.core || {}; root.QX3D.core.state = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('./data.js').D
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));

  var SAVE_KEY = 'shanqian3d_save_v1';
  var PAYLOAD_KEY = 'qunxia-payload-v1';
  var LEGACY_STORAGE_KEY = 'jianghu_legacy_meta_v1';

  /* state 形状：data/state-init.js 逐字节搬运的字面量，每次实例化深拷贝 */
  function initialState() {
    return JSON.parse(JSON.stringify(D.QX3D_STATE_INIT));
  }

  /* ── 创角摇池（rerollOpeningTalents :9041–:9078 的概率骨架，DOM 剥离）────── */
  function pickRandomFrom(arr, count) {
    const copy = [...arr];
    const out = [];
    while (out.length < count && copy.length > 0) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  /* 返回 { talents, jackpot }；rand 可注入（对表/仿真用），缺省 Math.random */
  function rollOpeningTalents(rand, hasLuckPerk) {
    const rng = rand || Math.random;
    const pool = D.TALENTS_POOL || [];
    const godList = pool.filter(t => t.grade === 'god');
    const goodList = pool.filter(t => t.grade === 'good');
    const normList = pool.filter(t => t.grade === 'norm');
    const badList = pool.filter(t => t.grade === 'bad');

    const roll = rng();
    const luck = hasLuckPerk === true; /* perk_luck：0.32（原 :9052）；M0 无碑林遗泽恒 false */
    if (roll < (luck ? 0.32 : 0.028)) {
      return { talents: pickRandomFrom(godList, 3).map(t => t.id), jackpot: true };
    } else if (roll < 0.18) {
      const p1 = pickRandomFrom(godList, 1)[0].id;
      const p2 = pickRandomFrom([...goodList, ...normList], 1)[0].id;
      const p3 = pickRandomFrom(badList, 1)[0].id;
      return { talents: [p1, p2, p3], jackpot: false };
    } else if (roll < 0.65) {
      const p1 = pickRandomFrom(goodList, 1)[0].id;
      const p2 = pickRandomFrom(normList, 1)[0].id;
      const p3 = pickRandomFrom(badList, 1)[0].id;
      return { talents: [p1, p2, p3], jackpot: false };
    } else {
      const p1 = pickRandomFrom([...goodList, ...normList], 1)[0].id;
      const bads = pickRandomFrom(badList, 2).map(t => t.id);
      return { talents: [p1].concat(bads), jackpot: false };
    }
  }

  /* ── 碑林遗泽元数据（getLegacyMeta :9622；M0 只读不写，二周目属 M6）──────── */
  function getLegacyMeta(storage) {
    try {
      const raw = storage.getItem(LEGACY_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { cycleCount: 1, legacyPoints: 0, unlockedPaths: [], activePerks: [] };
  }

  /* ── 残卷命题（drawScrollProposition :6552 / applyScroll :6767）──────────── */
  function drawScrollProposition(st, env) {
    const e = env || {};
    const pool = (D.SCROLL_PROPOSITIONS_DB || []).slice();
    const relic = (st && st.carryRelic) || null;
    if (relic === 'juxian_tie') {
      pool.push(scrollById('qingzhai'), scrollById('chousha'));
    } else if (relic === 'broken_sword') {
      pool.push(scrollById('jianyi'), scrollById('jianyi'));
    }
    const carried = (st && st.relicCarry) || [];
    if (typeof e.relicBiasScrolls === 'function') {
      e.relicBiasScrolls(carried).forEach(scroll => { if (scroll) pool.push(scroll); });
    }
    return pool[Math.floor((e.rand || Math.random)() * pool.length)];
  }
  function scrollById(id) {
    return (D.SCROLL_PROPOSITIONS_DB || []).find(s => s.id === id) || null;
  }

  function applyScrollPropositionToNewGame(st, scroll) {
    if (!scroll) return;
    st.scrollProposition = {
      id: scroll.id,
      name: scroll.name,
      hook: scroll.hook,
      summary: scroll.summary,
      endingHint: scroll.endingHint
    };
    /* 名宿态度偏置（数值藏后台；前台至少改对话前缀） */
    const bias = scroll.masterBias || {};
    (st.masters || []).forEach(m => {
      const tags = D.MASTER_SCROLL_TAGS[m.id] || [];
      let delta = 0;
      Object.keys(bias).forEach(tag => {
        if (tags.includes(tag)) delta += bias[tag] * 8;
      });
      if (delta) {
        m.affinity = Math.max(0, Math.min(100, (m.affinity || 10) + delta));
        m.scrollGreeting = delta > 0
          ? `（残卷·${scroll.name}）多看你一眼：`
          : `（残卷·${scroll.name}）语气带刺：`;
      }
    });
    if (scroll.id === 'qiyu') {
      st._scrollRoadBonus = 0.25;
    } else {
      st._scrollRoadBonus = 0;
    }
    if (scroll.id === 'jianyi') {
      st._scrollEarlyArena = true;
    }
  }

  /* ── 创角应用（selectOrigin :9211–:9370 的 state 部分）────────────────────
   * opts = { name, talents, vow, scroll（预摇残卷，可空）, legacyMeta（可空）,
   *          carriedRelicIds（碑林携宝，M0 恒 []）, applyCarriedRelics/env 钩子 } */
  function applyOrigin(st, originId, opts) {
    const o = (D.ORIGINS || []).find(x => x.id === originId);
    if (!o) return false;
    const op = opts || {};

    st.hasCreatedChar = true;
    st.originId = o.id;
    st.playerName = (op.name && op.name.trim()) ? op.name.trim() : '沈青锋';
    st.talents = [...(op.talents || [])];
    st.openingVow = op.vow;

    st.sectId = o.sectId || 'none';
    st.sectRankIdx = 0;
    st.sectMerit = o.sectId && o.sectId !== 'none' ? 20 : 0;
    st.sectName = o.sect || '无门无派·小虾米';
    st.realmIdx = 0; // 初窥门径
    st.turn = 1;
    st.mainQuestStep = 0;
    st.endingUnlocked = false;
    st.karma = { ...o.karma };
    st.hp = o.stats.hp;
    st.maxHp = o.stats.maxHp;
    st.mp = o.stats.mp;
    st.maxMp = o.stats.maxMp;
    st.ap = 5;
    st.maxAp = 5;
    st.gold = o.stats.gold;
    st.fame = o.stats.fame;
    st.exp = o.stats.exp;
    st.currentRegion = o.startRegion;
    st.currentTileIdx = 1;
    st.viewLayer = 'world';

    st.turnFlags = {
      drankTavern: false,
      sectTaskDone: false,
      sectPracticeDone: false,
      shrineDone: false,
      guardianDuelDone: false,
      midRoadEventDone: false,
      exploredRegions: {}
    };
    st.bountyCooldownUntil = {};
    st.purchasedCounts = {};
    st.unlockedAcupoints = [];
    st.forgeLevels = { weapon: 0, armor: 0, charm: 0 };
    st.equipment = { weapon: 'rusty_sword', armor: 'cloth_robe', charm: null };
    st.inventory = {};

    /* 洛水隐庐：开局一片荒芜（0级），真正从零建设！ */
    st.estate = {
      herbs: 0,
      iron: 0,
      stewardId: null,
      workDoneThisTurn: false,
      buildings: { winery: 0, herbGarden: 0, smithy: 0, academy: 0 }
    };

    st.learnedArts = {};
    st.learnedArts[o.innerArt] = 1;
    (o.moves || []).forEach(m => { st.learnedArts[m] = 1; });
    st.equippedInner = o.innerArt;
    st.equippedMoves = [...o.moves];
    st.masters = JSON.parse(JSON.stringify(D.MASTERS_INIT));
    // 降低名宿初始好感（小虾米初出茅庐无人识）
    st.masters.forEach(m => { m.affinity = 10; });

    // 应用昆仑雪夜三问微幅起步资粮
    if (st.openingVow === 'vow_hero') {
      st.karma.xiayi += 15;
      st.inventory.jinchuang_yao = 1;
    } else if (st.openingVow === 'vow_supreme') {
      st.karma.kuangao += 15;
      st.exp += 35;
    } else {
      st.karma.xiaoyao += 15;
      st.gold += 20;
      st.estate.herbs += 1;
    }

    // 应用随机摇出的吉凶先天命格（含好与坏）
    st.talents.forEach(tId => {
      if (tId === 'talent_prodigy') st.exp += 30;
      if (tId === 'talent_sword_heart') { st.maxHp += 15; st.hp += 15; st.maxMp += 15; st.mp += 15; }
      if (tId === 'talent_hercules') { st.maxHp += 35; st.hp += 35; st.estate.iron += 1; }
      if (tId === 'talent_tao_nature') { st.maxMp += 30; st.mp += 30; st.unlockedAcupoints.push('baihui'); }
      if (tId === 't_good_tough') { st.maxHp += 18; st.hp += 18; }
      if (tId === 't_good_agile') { st.maxMp += 15; st.mp += 15; }
      if (tId === 'talent_wealthy') { st.gold += 20; }
      if (tId === 'talent_chivalrous') {
        st.fame += 12;
        st.masters.forEach(m => { m.affinity += 6; });
      }
      if (tId === 't_norm_farmer') { st.estate.herbs += 1; st.fame = Math.max(0, st.fame - 4); }
      if (tId === 't_norm_apprentice') { st.estate.iron += 1; st.maxMp = Math.max(20, st.maxMp - 10); st.mp = st.maxMp; }
      if (tId === 't_norm_gambler') { st.gold += 15; st.maxHp = Math.max(40, st.maxHp - 10); st.hp = st.maxHp; }
      if (tId === 't_bad_meridian') { st.maxMp = Math.max(20, st.maxMp - 20); st.mp = st.maxMp; }
      if (tId === 't_bad_sickly') { st.maxHp = Math.max(40, st.maxHp - 22); st.hp = st.maxHp; }
      if (tId === 't_bad_poor') { st.gold = 0; }
      if (tId === 't_bad_infamy') {
        st.fame = 0;
        st.masters.forEach(m => { m.affinity = Math.max(0, m.affinity - 10); });
      }
    });

    // 应用多周目武道碑林前世遗泽 (LEGACY_PERKS)
    const meta = op.legacyMeta || getLegacyMeta(op.storage || null);
    const activePerks = (meta && meta.activePerks) || [];
    if (activePerks.includes('perk_estate')) {
      st.estate.buildings.winery = 1;
      st.estate.buildings.herbGarden = 1;
      st.gold += 80;
    }
    if (activePerks.includes('perk_sword')) {
      st.equipment.weapon = 'xuantie_jian';
      st.equipment.charm = 'yupei_charm';
    }
    if (activePerks.includes('perk_taixuan')) {
      st.learnedArts.taixuan_jing = 1;
      st.learnedArts.douzhuan_xingyi = 1;
      st.equippedInner = 'taixuan_jing';
      if (!st.equippedMoves.includes('douzhuan_xingyi')) st.equippedMoves.push('douzhuan_xingyi');
    }
    st.hardMode = activePerks.includes('perk_hard');

    /* 初始日志（原 :9336–:9339；人名与资粮随 state） */
    const talentNames = st.talents.map(id => {
      const t = (D.TALENTS_POOL || []).find(x => x.id === id);
      return t ? t.name : '';
    }).join(' ');
    st.logs = [
      { time: getDateStrOf(st), text: `【初出茅庐】无名小卒「${st.playerName}」身负先天命格${talentNames}，着粗布衣、持杂铁剑、揣 ${st.gold} 文铜钱踏入洛阳，开启从零苦修之路！` }
    ];

    st.hideRookieBanner = false;
    st.crises = [];
    st.canonEventsTriggered = {};
    st.canonEventReports = [];
    st.inspectorTab = 'local';
    st.streetSpawn = {};
    st.intelTier = 0;
    st.playerKnownNode = null;
    st.rumorReliability = null;
    st.pendingRumor = null;
    st.streetActTurn = {};
    st.sidePresence = {};
    st.sideFlags = {};
    st.sideScrollBias = {};
    st.outcomeFlags = null;
    st.romance = null;
    st.court = null;
    st.faction = null;
    st.streetFavor = {};
    st.signpost = null;
    st.tutorialComboDone = false;
    st.scrollResultSeeds = [];
    st.aftermathDoneIds = {};
    st.relicCarry = (op.carriedRelicIds || []);
    st.relics = null;
    if (op.scroll) {
      applyScrollPropositionToNewGame(st, op.scroll);
    } else if (!st.scrollProposition) {
      applyScrollPropositionToNewGame(st, drawScrollProposition(st, op.env));
    }
    return true;
  }

  /* getDateStr 局部替身（创角日志用；正式版在 core/time，避免环 require） */
  var SEASONS = D.SEASONS || ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬'];
  var XUNS = D.XUNS || ['上旬', '中旬', '下旬'];
  function getDateStrOf(st) {
    const sIdx = Math.floor(((st.turn - 1) / 3) % SEASONS.length);
    const xIdx = (st.turn - 1) % 3;
    return `第${st.turn}/${st.maxTurns}旬 · ${SEASONS[sIdx]}${XUNS[xIdx]}`;
  }

  /* ── 存档（saveGame :3132；新键 shanqian3d_save_v1，铁律 4）──────────────── */
  function saveGame(st, storage) {
    var raw;
    try {
      raw = JSON.stringify(st);
    } catch (e) {
      return false;
    }
    try {
      storage.setItem(SAVE_KEY, raw);
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearSave(storage) {
    try { storage.removeItem(SAVE_KEY); } catch (e) {}
  }

  /* ── 载档（loadGame :3160–:3203；P4 ensure 六族缓议，见头注）──────────────── */
  function loadGame(storage) {
    var st = initialState();
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.currentRegion && parsed.masters) {
          st = Object.assign(st, parsed);
          if (!st.karma) st.karma = { xiayi: 20, kuangao: 15, xiaoyao: 15 };
          if (!st.unlockedAcupoints) st.unlockedAcupoints = ['baihui'];
          if (!st.forgeLevels) st.forgeLevels = { weapon: 0, armor: 0, charm: 0 };
          if (!st.turnFlags) {
            st.turnFlags = { drankTavern: false, sectTaskDone: false, sectPracticeDone: false, shrineDone: false, guardianDuelDone: false, midRoadEventDone: false, exploredRegions: {} };
          }
          if (!st.bountyCooldownUntil) st.bountyCooldownUntil = {};
          if (!st.purchasedCounts) st.purchasedCounts = { qingtong_jian: 1, yupei_charm: 1 };
          if (!st.talents) st.talents = ['talent_prodigy', 'talent_sword_heart'];
          if (!st.openingVow) st.openingVow = 'vow_homestead';
          if (!st.estate) {
            st.estate = {
              herbs: 4, iron: 2, stewardId: null, workDoneThisTurn: false,
              buildings: { winery: 1, herbGarden: 1, smithy: 0, academy: 0 }
            };
          }
          /* ensureP3StateDefaults（:6568–:6576 逐字） */
          if (typeof st.tutorialComboDone !== 'boolean') st.tutorialComboDone = false;
          if (!st.scrollProposition) st.scrollProposition = null;
          if (!st.scrollResultSeeds) st.scrollResultSeeds = [];
          if (!st.aftermathDoneIds) st.aftermathDoneIds = {};
          if (!st.carryRelic) st.carryRelic = null;
          if (!st.rumorsHeard) st.rumorsHeard = [];
          /* P4 各族的 ensure* 已随批迁进 systems/*（A 市井 册300 · C 朝廷 册301 · B 配角 册303 ·
           * E 情缘 册311 · F 立号 册316），由 app 的入口函数调用；core 不反向依赖 systems。
           * 仍在册：Hall 的每旬结算（settleHallOnNewTurn）随 F2、Signpost 未迁。 */
        }
      }
    } catch (e) {
      /* Ignore */
    }
    var act = reconcileWorldGen(st, storage);
    return { state: st, genAction: act };
  }

  /* ── gen 对账（reconcileWorldGen :3210–:3223；原版 location.reload 由 UI 层执行）
   * 返回 { action: 'none'|'reload'|'record', gen }：
   *   reload = payload gen 变大（扩展侧已转世）⇒ 存档已清，UI 层刷新回创角封面；
   *   record = gen 相同或变小（主档重装丢失）⇒ 仅记值防反复。 */
  function reconcileWorldGen(st, storage) {
    try {
      const pl = JSON.parse(storage.getItem(PAYLOAD_KEY) || 'null');
      const gen = pl && typeof pl.gen === 'number' ? pl.gen : null;
      if (gen == null) return { action: 'none', gen: null };
      if (typeof st.worldGen === 'number' && gen > st.worldGen) {
        clearSave(storage);
        st.worldGen = gen;
        return { action: 'reload', gen: gen };
      }
      st.worldGen = gen;
      return { action: 'record', gen: gen };
    } catch (e) {
      return { action: 'none', gen: null };
    }
  }

  return {
    SAVE_KEY: SAVE_KEY,
    PAYLOAD_KEY: PAYLOAD_KEY,
    LEGACY_STORAGE_KEY: LEGACY_STORAGE_KEY,
    initialState: initialState,
    pickRandomFrom: pickRandomFrom,
    rollOpeningTalents: rollOpeningTalents,
    getLegacyMeta: getLegacyMeta,
    drawScrollProposition: drawScrollProposition,
    applyScrollPropositionToNewGame: applyScrollPropositionToNewGame,
    applyOrigin: applyOrigin,
    saveGame: saveGame,
    clearSave: clearSave,
    loadGame: loadGame,
    reconcileWorldGen: reconcileWorldGen
  };
});
