/* systems/endings.js — 终局六道途 + 周目结算 + 碑林轮回（源规格 §四 #12 · M6）
 * 迁移源（view/games/qunxia/game.html）：
 *   evaluateBestEnding → ENDINGS_DB isDone 扫描（六判词取首个达成）
 *   startNewGamePlus :5795–:5805   claimPathVictoryAndReincarnate :9748–:9761
 *   toggleLegacyPerk :9720–:9746   LIFE_PATHS_DB :9641–:9710（抽取件 · isDone/progressText 闭包）
 *   LEGACY_PERKS_DB :9712–:9718（抽取件）  getLegacyMeta :9622–:9633
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE；storage 显式传参。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.endings = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var core = (typeof module !== 'undefined' && module.exports)
    ? { time: require('../core/time.js'), data: require('../core/data.js'), state: require('../core/state.js') }
    : (root.QX3D && root.QX3D.core) || {};
  var D = core.data ? core.data.D : (root.QX3D_DATA || {});

  function log(st, env, text) { (env && env.addLog || core.time.addLog)(st, text); }
  function toast(env, msg, tone) { if (env && env.showToast) env.showToast(msg, tone); }

  /* ── 终局评判（ENDINGS_DB isDone 扫描取首个达成）─────────────────────────── */
  function evaluateBestEnding(st) {
    var endings = D.ENDINGS_DB || [];
    for (var i = 0; i < endings.length; i++) {
      if (endings[i].isDone && endings[i].isDone(st)) return endings[i];
    }
    /* 无匹配 → 走默认（最末条 or 构造） */
    return endings[endings.length - 1] || { title: '江湖过客', poem: '三十六旬弹指过，无名无姓亦无碑。' };
  }

  /* ── 六道途进度（LIFE_PATHS_DB isDone/progressText 扫描）────────────────── */
  function evaluatePaths(st) {
    var paths = D.LIFE_PATHS_DB || [];
    return paths.map(function (p) {
      return { id: p.id, name: p.name, tag: p.tag, desc: p.desc, done: !!p.isDone(st), progress: p.progressText(st), endingIdx: p.endingIdx };
    });
  }

  /* ── 碑林遗泽元数据（getLegacyMeta :9622）──────────────────────────────── */
  function getLegacyMeta(storage) {
    return core.state.getLegacyMeta(storage);
  }
  function saveLegacyMeta(storage, meta) {
    try { storage.setItem(core.state.LEGACY_STORAGE_KEY, JSON.stringify(meta)); } catch (e) {}
  }

  /* ── 周目结算（startNewGamePlus :5795–:5805 逐式）───────────────────────── */
  function startNewGamePlus(st, storage, env) {
    var meta = getLegacyMeta(storage);
    meta.cycleCount = (meta.cycleCount || 1) + 1;
    meta.legacyPoints = (meta.legacyPoints || 0) + 60;
    saveLegacyMeta(storage, meta);
    core.state.clearSave(storage);
    log(st, env, `🔄【周目结算】第 ${meta.cycleCount - 1} 周目落幕，获保底 60 碑点。轮回碑林已刻，下周目遗泽待启。`);
    toast(env, `第 ${meta.cycleCount - 1} 周目结算完成！+60 保底碑点。`, 'emerald');
    return meta;
  }

  /* ── 道途铭刻（claimPathVictoryAndReincarnate :9748–:9761 逐式）───────────── */
  function claimPathVictory(st, pathId, storage, env) {
    var pathObj = (D.LIFE_PATHS_DB || []).find(function (p) { return p.id === pathId; });
    var meta = getLegacyMeta(storage);
    meta.cycleCount = (meta.cycleCount || 1) + 1;
    meta.legacyPoints = (meta.legacyPoints || 0) + 120;
    if (pathObj && !(meta.unlockedPaths || []).includes(pathObj.id)) {
      meta.unlockedPaths.push(pathObj.id);
    }
    saveLegacyMeta(storage, meta);
    core.state.clearSave(storage);
    log(st, env, `🏆 恭贺圆满达成${pathObj ? pathObj.name : '本世道途'}！获赠 +120 轮回碑点，正式开启第 ${meta.cycleCount} 周目！`);
    toast(env, `🏆 圆满达成！+120 轮回碑点，第 ${meta.cycleCount} 周目开启！`, 'emerald');
    return meta;
  }

  /* ── 碑林遗泽开关（toggleLegacyPerk :9720–:9746 逐式）────────────────────── */
  function toggleLegacyPerk(storage, perkId, env) {
    var meta = getLegacyMeta(storage);
    var perk = (D.LEGACY_PERKS_DB || []).find(function (p) { return p.id === perkId; });
    if (!perk) return meta;
    if (!meta.activePerks) meta.activePerks = [];

    if (meta.activePerks.includes(perkId)) {
      meta.activePerks = meta.activePerks.filter(function (x) { return x !== perkId; });
      meta.legacyPoints += perk.cost;
    } else {
      if (meta.legacyPoints < perk.cost) {
        toast(env, `轮回武道碑点不足 ${perk.cost} 点（当前剩余 ${meta.legacyPoints} 点）！`, 'red');
        return meta;
      }
      meta.legacyPoints -= perk.cost;
      meta.activePerks.push(perkId);
    }
    saveLegacyMeta(storage, meta);
    return meta;
  }

  return {
    evaluateBestEnding: evaluateBestEnding,
    evaluatePaths: evaluatePaths,
    getLegacyMeta: getLegacyMeta,
    saveLegacyMeta: saveLegacyMeta,
    startNewGamePlus: startNewGamePlus,
    claimPathVictory: claimPathVictory,
    toggleLegacyPerk: toggleLegacyPerk
  };
});
