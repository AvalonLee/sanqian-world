/* systems/romance.js — P4-E 情缘（册311 · E1 基建八件 · 纯逻辑）
 * 迁移源 = view/games/qunxia/game.html :13921–:14739（头注：相识→成亲·正妻；无倾心不入口；
 * 不推进多房；不加攻击气血）。本刀只落**状态与查询**：ensureState / person / stage / meet /
 * here / intel / visibleList / hasBadge；交互（actionsFor/act/gain/once/penalty）随 E2，
 * 后院与差事（concubine/household/duty）随 E3。
 *
 * 偏差（显式登记）：
 *   ① `romanceHere` 复用本仓 `systems.side.castHere(st, region)`（原版 `sideCastHere()` 无参取全局）。
 *   ② 头像不渲染（同 A/B 拍板），`art` 已由生成器占位化为空串。
 *   ③ 前台只出阶段词（ROMANCE_STAGE_WORD），**好感数值不出屏**——漏出即 bug。
 * 副作用纪律：只改传入 st；存档/重渲由 app 负责。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.QX3D = root.QX3D || {};
    root.QX3D.systems = root.QX3D.systems || {};
    root.QX3D.systems.romance = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../data/romance.js')
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));
  var LIST = D.ROMANCE_CAST || [];
  var STAGE_WORD = D.ROMANCE_STAGE_WORD || { met: '相识', warm: '好感', love: '倾心', pledge: '有约', wife: '娘子', side: '侧室' };
  var BY_ID = {};
  LIST.forEach(function (r) { BY_ID[r.id] = r; });

  function sideMod() {
    if (typeof module !== 'undefined' && module.exports) return require('./side.js');
    return root.QX3D && root.QX3D.systems ? root.QX3D.systems.side : null;
  }

  function ensureState(st) {
    var host = st;
    if (!host) return null;
    if (!host.romance || typeof host.romance !== 'object') host.romance = { wifeId: null, people: {} };
    if (!host.romance.people) host.romance.people = {};
    if (host.romance.wifeId === undefined) host.romance.wifeId = null;
    if (!Array.isArray(host.romance.concubines)) host.romance.concubines = [];
    host.romance.concubineCount = host.romance.concubines.length;
    if (host.romance.jealousy === undefined) host.romance.jealousy = null;
    if (typeof host.romance.crisisWeight !== 'number') host.romance.crisisWeight = 0;
    if (host.romance.haremPath === undefined) host.romance.haremPath = null;
    if (host.romance.jealousy === 'delayed' && (host.turn || 1) >= (host.romance.crisisDueTurn || 0)) host.romance.jealousy = 'open';
    return host.romance;
  }

  function person(st, id) {
    ensureState(st);
    if (!st.romance.people[id]) st.romance.people[id] = { affection: 0, known: false, intel: false, pledged: false, act: {} };
    var p = st.romance.people[id];
    p.affection = Math.max(0, Math.min(6, p.affection || 0));
    return p;
  }

  /* 阶段：wife > side > pledge > love(4) > warm(2) > met(known) > unknown */
  function stage(st, id) {
    var p = person(st, id);
    if (st.romance.wifeId === id) return 'wife';
    if ((st.romance.concubines || []).some(function (c) { return c.id === id; })) return 'side';
    if (p.pledged) return 'pledge';
    if (p.affection >= 4) return 'love';
    if (p.affection >= 2) return 'warm';
    if (p.known) return 'met';
    return 'unknown';
  }

  function stageWord(stageId) { return STAGE_WORD[stageId] || '未识'; }

  function meet(st, id) { if (!BY_ID[id]) return; person(st, id).known = true; }

  /* 在场：同地界同格且在本旬在场名单里（复用 P4-B side.castHere） */
  function here(st, id) {
    var s = sideMod();
    if (!s || !s.castOf(id)) return false;
    var region = { id: st.currentRegion };
    return s.castHere(st, region).some(function (c) { return c.id === id; });
  }

  /* 情报：已打探，或阶段已到 love 及以上 */
  function intel(st, id) {
    var sg = stage(st, id);
    var p = person(st, id);
    return !!(p.intel || sg === 'love' || sg === 'pledge' || sg === 'wife' || sg === 'side');
  }

  /* 可见列表：已知 + (在场或已得情报) */
  function visibleList(st) {
    ensureState(st);
    return LIST.filter(function (r) {
      var p = st.romance.people && st.romance.people[r.id];
      if (!p || !p.known) return false;
      return here(st, r.id) || intel(st, r.id);
    });
  }

  function hasBadge(st) {
    ensureState(st);
    return LIST.some(function (r) {
      var s = stage(st, r.id);
      return s === 'love' || s === 'pledge' || s === 'wife' || s === 'side';
    });
  }

  return {
    list: LIST,
    castOf: function (id) { return BY_ID[id] || null; },
    ensureState: ensureState,
    person: person,
    stage: stage,
    stageWord: stageWord,
    meet: meet,
    here: here,
    intel: intel,
    visibleList: visibleList,
    hasBadge: hasBadge
  };
});
