/* systems/travel.js — 跨州行脚 · 结算层（源规格 §四 #5 的 M0 切片）
 * 迁移源（view/games/qunxia/game.html）：
 *   canAffordTravel :4503–:4520   commitTravelToRegion :4522–:4565（结算部分）
 * M0 缓议（后续里程碑接）：
 *   · beginTravelAnim / mapTravel 滑行动画与途中奇遇掷判（0.32/0.18）＝表现层，M1 随
 *     systems/travel 状态机全量迁移（源 :4042–:4470）
 *   · markPlayerSeenNode / noteSignpostHere / resolveXiangyangLetter / triggerRoadEncounter
 *     / tryOpenAftermathIfPresent ＝ P4 街面/路牌/主线信/路遇钩子，经 env 注入，M0 缺省 noop
 *     （state 逐字段等价在「P4 未启用」前提下成立，tests/table-check.cjs 同位置 stub）
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.travel = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var core = (typeof module !== 'undefined' && module.exports)
    ? { time: require('../core/time.js'), data: require('../core/data.js') }
    : (root.QX3D && root.QX3D.core) || {};

  function canAffordTravel(st, isCarriage, env) {
    if (!isCarriage) {
      if (st.ap < 1) {
        if (env && env.showToast) env.showToast('本旬行脚精力已耗尽！请点击右上角【🧘 吐纳过旬】恢复精力。', 'red');
        return false;
      }
      return true;
    }
    if (st.gold < 22) {
      if (env && env.showToast) env.showToast('盘缠不足 22 文，无法雇佣跨州驿站快马！', 'red');
      return false;
    }
    if (st.ap < 2) {
      if (env && env.showToast) env.showToast('跨州长途快马需消耗 2 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return false;
    }
    return true;
  }

  /* 行脚结算：徒步 -1行脚/-8内息(保底10)；快马 -22文/-2行脚；行脚本身过 1 旬。
   * 到位格解析：主线章当前地 → 追踪名宿所在地 → 格 0（原 :4534–:4549）。
   * env: { showToast, markPlayerSeenNode, noteSignpostHere, resolveXiangyangLetter,
   *        tryOpenAftermath, roadEncounter }（M0 除 showToast 外均缺省不接） */
  function commitTravelToRegion(st, targetRegionId, isCarriage, env) {
    const e = env || {};
    const time = core.time;
    const targetReg = time.getRegion(targetRegionId);
    if (isCarriage) {
      st.gold -= 22;
      st.ap -= 2;
    } else {
      st.ap -= 1;
      st.mp = Math.max(10, st.mp - 8);
    }

    st.currentRegion = targetReg.id;
    const mainCh = time.getCurrentMainChapter(st);
    if (st.mainQuestStep < 7 && mainCh.region === targetReg.id) {
      st.currentTileIdx = mainCh.tileIdx;
      st.viewLayer = 'local';
    } else if (st.trackedMasterId) {
      const tracked = st.masters.find(m => m.id === st.trackedMasterId);
      if (tracked && tracked.region === targetReg.id) {
        st.currentTileIdx = tracked.tileIdx;
        st.viewLayer = 'local';
        st.trackedMasterId = null;
      } else {
        st.currentTileIdx = 0;
      }
    } else {
      st.currentTileIdx = 0;
    }

    time.advanceTime(st, 1, false, e);
    if (typeof e.markPlayerSeenNode === 'function') e.markPlayerSeenNode();
    if (typeof e.noteSignpostHere === 'function') e.noteSignpostHere();
    if (typeof e.resolveXiangyangLetter === 'function') e.resolveXiangyangLetter();
    time.addLog(st, `跋涉一旬抵达【${targetReg.name} · ${targetReg.tiles[st.currentTileIdx].name}】。`);
    if (e.showToast) e.showToast(`已行脚至【${targetReg.name}】（过 1 旬）`, 'emerald');

    /* 余波弹窗优先，与路遇互斥（原 :4560–:4564）；M0 无余波弹窗，env.tryOpenAftermath
     * 缺省返回 false ⇒ 行为与原版「无余波在场」一致。 */
    var aftermathOpened = false;
    if (typeof e.tryOpenAftermath === 'function') aftermathOpened = !!e.tryOpenAftermath();
    if (!aftermathOpened && !isCarriage && st.mainQuestStep < 7 && mainCh.region !== targetReg.id && Math.random() < 0.35) {
      if (typeof e.roadEncounter === 'function') e.roadEncounter(targetReg);
    }
    return { region: targetReg };
  }

  return {
    canAffordTravel: canAffordTravel,
    commitTravelToRegion: commitTravelToRegion
  };
});
