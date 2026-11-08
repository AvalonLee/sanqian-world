/* app.js — qunxia3d 游戏化装配层（M0）
 * 职责：载档/创角/存档/行脚/过旬的 UI 编排；core+systems 的 env 注入点。
 * 表现层（board3d / hud / creation）只读 state 调系统函数（计划书铁律 1）。
 * payload 双键契约：gen 对账在 core.state.loadGame 内完成；qunxia-result-queue-v1
 * 写口在本件（与原版 queueWorldResult :3146–:3158 逐字同构，含 we_ 前缀过滤）。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var systems = root.QX3D && root.QX3D.systems;
  var ui = root.QX3D && root.QX3D.ui;
  if (!core || !systems || !ui) throw new Error('app: QX3D.core/systems/ui 未加载');

  var st = null;

  /* 世界大事终局回流队列（原 :3150–:3158 逐字同构） */
  function queueWorldResult(crisisId, outcome) {
    if (!crisisId || crisisId.indexOf('we_') !== 0) return;
    try {
      var q = JSON.parse(root.localStorage.getItem('qunxia-result-queue-v1') || '[]');
      if (!Array.isArray(q)) q = [];
      q.push({ id: crisisId, outcome: outcome });
      root.localStorage.setItem('qunxia-result-queue-v1', JSON.stringify(q));
    } catch (e) {}
  }

  /* core/env 公共注入 */
  function env(extra) {
    return Object.assign({ showToast: ui.hud.toast, queueWorldResult: queueWorldResult }, extra || {});
  }

  function save() { core.state.saveGame(st, root.localStorage); }

  function afterAction() {
    save();
    ui.hud.render(st);
    syncChrome();
  }

  /* HUD/日志/过旬钮随创角状态显隐 */
  function syncChrome() {
    var has = !!(st && st.hasCreatedChar);
    document.getElementById('hud-bar').classList.toggle('show', has);
    document.getElementById('logs-panel').classList.toggle('show', has);
    document.getElementById('btn-turn').style.display = has ? '' : 'none';
  }

  /* ── 吐纳过旬（过 1 旬 + 精力回满，advanceTime(1, resetAp=true)）──────────── */
  function onTurnAdvance() {
    if (!st || !st.hasCreatedChar) return;
    core.time.advanceTime(st, 1, true, env());
    afterAction();
    ui.hud.toast('🧘 吐纳过旬 · 精力回满', 'emerald');
  }

  /* ── 行脚（世界层，邻接地界徒步；快马跨州 M1 接）────────────────────────── */
  function onTravel(targetRegionId) {
    if (!st || !st.hasCreatedChar) return;
    var cur = core.time.getRegion(st.currentRegion);
    if (targetRegionId === cur.id) return;
    if (!cur.neighbors.includes(targetRegionId)) {
      ui.hud.toast('跨州远行须逐城行脚（快马跨州 M1 接入）。', 'amber');
      return;
    }
    if (!systems.travel.canAffordTravel(st, false, env())) return;
    systems.travel.commitTravelToRegion(st, targetRegionId, false, env({
      tryOpenAftermath: function () { return false; } /* M0 无余波弹窗；state 等价于原版无余波在场 */
    }));
    afterAction();
    var qx = root.__QX;
    if (qx && qx.focusRegion) qx.focusRegion(targetRegionId);
    syncTravelButton(targetRegionId);
  }

  /* ── board3d 钩子：信息卡显示地界时同步行脚钮与事件条 ────────────────────── */
  function onRegionShown(id) {
    if (!st || !st.hasCreatedChar) return;
    syncTravelButton(id);
  }
  function syncTravelButton(id) {
    var btn = document.getElementById('ic-travel');
    if (!btn) return;
    var cur = st ? core.time.getRegion(st.currentRegion) : null;
    var isCur = st && id === st.currentRegion;
    var isNeighbor = cur && cur.neighbors.includes(id);
    btn.classList.toggle('show', !!(isNeighbor && !isCur && st.ap >= 1));
    var target = (root.QX3D_DATA.REGIONS || []).find(function (r) { return r.id === id; });
    btn.textContent = '行脚至此 · ' + (target ? target.name : '') + '（过 1 旬，-1行脚）';
    btn.onclick = function () { onTravel(id); };
  }
  /* 演示占位事件换成真 crises（M3 起赴会；M0 只上事件条） */
  function regionEvent(id) {
    if (!st || !st.hasCreatedChar) return null;
    var c = (st.crises || []).find(function (x) { return x.region === id; });
    if (c) return { label: (c.title || '').replace(/^【|】/g, ''), remain: c.remainTurns, kind: 'event' };
    return null;
  }

  /* ── 启动 ───────────────────────────────────────────────────────────────── */
  function boot() {
    var res = core.state.loadGame(root.localStorage);
    st = res.state;
    core.data.bindRuntimeState(st);
    if (res.genAction.action === 'reload') {
      /* 扩展侧已转世：存档已清，刷新回创角封面（原 reconcileWorldGen :3218） */
      root.location.reload();
      return;
    }
    root.QX3D_APP.state = st;
    if (!st.hasCreatedChar) {
      ui.creation.open(st);
      ui.hud.renderLogs(st);
    } else {
      ui.hud.render(st);
    }
    syncChrome();

    /* 按钮 */
    document.getElementById('btn-turn').addEventListener('click', onTurnAdvance);
    document.getElementById('btn-create').addEventListener('click', function () {
      if (st && st.hasCreatedChar) { ui.hud.toast('本世已入江湖（重开世走扩展轮回）。', 'amber'); return; }
      ui.creation.open(st);
    });
    document.getElementById('btn-creation-reroll').addEventListener('click', ui.creation.reroll);
    document.getElementById('btn-creation-submit').addEventListener('click', function () {
      ui.creation.submit(function (s2) { ui.hud.render(s2); syncChrome(); });
    });
  }

  root.QX3D_APP = {
    state: null,
    boot: boot,
    onRegionShown: onRegionShown,
    regionEvent: regionEvent,
    onTravel: onTravel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
