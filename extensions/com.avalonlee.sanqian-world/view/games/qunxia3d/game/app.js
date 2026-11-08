/* app.js — qunxia3d 游戏化装配层（M0 载档/创角 + M1 八格动作/本境经济）
 * 职责：载档/创角/存档/行脚/过旬/本境动作的 UI 编排；core+systems 的 env 注入点。
 * 表现层（board3d / hud / creation / panels）只读 state 调系统函数（计划书铁律 1）。
 * payload 双键契约：gen 对账在 core.state.loadGame 内完成；qunxia-result-queue-v1
 * 写口在本件（与原版 queueWorldResult :3146–:3158 逐字同构，含 we_ 前缀过滤）。
 * M2 接入点：env.startDuel（现 openDuelPending 占位卡）；M4：env.canonicalSecret；
 * M3：crisis_join/aftermath 动作赴会面。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var systems = root.QX3D && root.QX3D.systems;
  var ui = root.QX3D && root.QX3D.ui;
  if (!core || !systems || !ui) throw new Error('app: QX3D.core/systems/ui 未加载');

  var st = null;
  var shownTileIdx = null;

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
    return Object.assign({
      showToast: ui.hud.toast,
      queueWorldResult: queueWorldResult,
      addLog: core.time.addLog,
      /* M2：三招对决引擎接入（拍板演出 = 半屏出招卡 + 3D 背景糊化） */
      startDuel: function (s, params) {
        var d = systems.combat.initDuel(s, params, env());
        ui.duel.open(s, d, function () { afterAction(); });
      },
      /* M4：传世秘境内容接入点 */
      canonicalSecret: function (s, regId, secret) { ui.panels.openSecretPending(regId, secret); },
      /* M3：世界事件当场戏 + 主奖励 */
      sceneLine: function (crisis) { return systems.payload.sceneLine(crisis); },
      crisisReward: function (id) { return systems.payload.crisisReward(st, id, env()); },
      openBountyPoster: function (bounty) { ui.panels.openBountyPoster(st, bounty, core.player, core.time.getRegion, function (b) { runAction('bounty_duel'); }); },
      openRoadEncounter: function (ev, reg) { ui.panels.openRoadEncounter(ev, reg, function (idx) { systems.tiles.applyRoadEncounterChoice(st, ev, idx, env()); afterAction(); }); }
    }, extra || {});
  }

  function save() { core.state.saveGame(st, root.localStorage); }

  function afterAction() {
    save();
    ui.hud.render(st);
    syncChrome();
    syncBoardLayer();
    syncTileButtons();
    syncTravelButton(st.currentRegion);
  }

  /* state.viewLayer ⇔ board3d 层对账（M1 集成缝）：行脚到达主线章地点会切 local
   * （原 :4534–:4549 语义），3D 板须同步钻入；反向回世界层同理。diving/rising 过渡态
   * 由 board3d 自己的 mode 守卫挡重复触发。 */
  function syncBoardLayer() {
    var qx = root.__QX;
    if (!qx || !st || !st.hasCreatedChar) return;
    var mode = qx.mode;
    if (st.viewLayer === 'local' && mode === 'world') qx.enterRegion(st.currentRegion);
    else if (st.viewLayer === 'world' && mode === 'local') qx.exitRegion();
  }

  /* 首局教学调度（原 scheduleFirstTutorialIfNeeded :7126–:7147 语义：
   * 未成招且首 4 旬 ⇒ 1.2s 后独占邀请弹窗 ⇒ 教学战） */
  function scheduleTutorial() {
    if (!st || st.tutorialComboDone) return;
    if (st.turn > 4) return;
    setTimeout(function () {
      if (!st || st.tutorialComboDone) return;
      var ov = document.getElementById('duel-overlay');
      if (ov && !ov.classList.contains('hidden')) return;
      ui.panels.openRoadEncounter({
        tag: '首局必修',
        title: '洛阳近郊 · 酒肆后巷',
        desc: '巷口醉汉武师拦路叫阵。此战将教会你「形×势」连招——可跳过旁白，不可跳过一次成功成招。',
        choices: [{ label: '进入教学战 ➔' }]
      }, { name: '洛阳' }, function () {
        var tut = systems.combat.initTutorial(st, env());
        if (!tut) return;
        systems.combat.tutorialAdvance(tut.tb, st, 'intro', { d: tut.d });
        ui.duel.open(st, tut.d, null, tut.tb);
      });
    }, 1200);
  }

  /* HUD/日志/过旬钮随创角状态显隐 */
  function syncChrome() {
    var has = !!(st && st.hasCreatedChar);
    document.getElementById('hud-bar').classList.toggle('show', has);
    document.getElementById('logs-panel').classList.toggle('show', has);
    document.getElementById('btn-turn').style.display = has ? '' : 'none';
    document.getElementById('btn-drawer').style.display = has ? '' : 'none';
  }

  /* ── 吐纳过旬（原版 meditateRest :5806：回复 + 过旬 + 精力回满）───────────── */
  function onTurnAdvance() {
    if (!st || !st.hasCreatedChar) return;
    systems.tiles.meditateRest(st, env());
    afterAction();
  }

  /* ── 行脚（世界层，邻接地界徒步；快马跨州 M1 未接入口）────────────────────── */
  function onTravel(targetRegionId) {
    if (!st || !st.hasCreatedChar) return;
    var cur = core.time.getRegion(st.currentRegion);
    if (targetRegionId === cur.id) return;
    if (!cur.neighbors.includes(targetRegionId)) {
      ui.hud.toast('跨州远行须逐城行脚（快马跨州入口 M1+ 接入）。', 'amber');
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

  /* ── 本境层切换（enter_local 动作 / board3d 回到山河）────────────────────── */
  function onLayerChange(layer) {
    if (!st) return;
    if (st.viewLayer !== layer) {
      st.viewLayer = layer;
      save();
    }
    syncTileButtons();
    syncTravelButton(st.currentRegion);
  }

  /* ── 格卡钩子（board3d showTileInfo → 同步移步/办事钮）────────────────────── */
  function onTileShown(idx) {
    shownTileIdx = idx;
    syncTileButtons();
  }
  function syncTileButtons() {
    var moveBtn = document.getElementById('ic-move');
    var actBtn = document.getElementById('ic-act');
    if (!moveBtn || !actBtn) return;
    var inLocal = st && st.hasCreatedChar && st.viewLayer === 'local';
    var hasTile = shownTileIdx != null && shownTileIdx !== st.currentTileIdx;
    if (inLocal && hasTile) {
      var chk = systems.tiles.canMoveToTile(st, shownTileIdx);
      moveBtn.classList.add('show');
      moveBtn.disabled = !chk.ok;
      moveBtn.textContent = '移步至此（' + (chk.isAdj ? '-4内息' : '-1行脚') + '）' + (chk.ok ? '' : ' · 资源不足');
      moveBtn.onclick = function () {
        var curReg = core.time.getRegion(st.currentRegion);
        systems.tiles.commitLocalTileMove(st, shownTileIdx, chk.isAdj, env());
        afterAction();
        if (root.__QX && root.__QX.focusTile) root.__QX.focusTile(shownTileIdx);
        onTileShown(shownTileIdx);
      };
    } else {
      moveBtn.classList.remove('show');
    }
    actBtn.classList.toggle('show', !!inLocal);
    if (inLocal) {
      actBtn.onclick = function () { openActions(); };
    }
  }
  function openActions() {
    var curReg = core.time.getRegion(st.currentRegion);
    var curTile = curReg.tiles[st.currentTileIdx];
    ui.panels.openActionPanel(st, curReg, curTile, runAction);
  }

  /* ── 动作派发（collectTileActions.act → systems.tiles）───────────────────── */
  function runAction(actId) {
    if (!st || !st.hasCreatedChar) return;
    var e = env();
    var curReg = core.time.getRegion(st.currentRegion);
    var zone = curReg.zone;
    if (actId === 'enter_local') {
      st.viewLayer = 'local';
      save();
      if (root.__QX && root.__QX.enterRegion) root.__QX.enterRegion(st.currentRegion);
      afterAction();
      return;
    }
    if (actId === 'tavern_drink') systems.tiles.tavernDrinkRest(st, e);
    else if (actId === 'tavern_bounty') systems.tiles.tavernPostBounty(st, e);
    else if (actId === 'forge_weapon') systems.tiles.forgeEquipment(st, 'weapon', e);
    else if (actId.indexOf('buy_') === 0 && actId !== 'buy_trade') systems.tiles.buyMarketItem(st, actId.slice(4), e);
    else if (actId === 'sect_hall') ui.hud.toast('掌门大殿 · 拜师/晋升/名宿交互 M5 接入。', 'amber');
    else if (actId === 'sect_practice') systems.tiles.sectPractice(st, e);
    else if (actId === 'sect_guardian') systems.tiles.sectChallengeGuardian(st, e);
    else if (actId === 'shrine_cultivate') systems.tiles.shrineCultivate(st, e);
    else if (actId === 'explore_secret') systems.tiles.exploreSecretCave(st, e);
    else if (actId === 'escort') systems.tiles.doEscortConvoy(st, e);
    else if (actId === 'buy_trade') systems.tiles.buyTradeGood(st, systems.tiles.getRegionalTradeGood(zone).id, e);
    else if (actId === 'sell_best') {
      var deal = systems.tiles.getBestTradeDeal(st);
      if (deal) systems.tiles.sellTradeGood(st, deal.good.id, zone, e);
    }
    else if (actId === 'stroll') systems.tiles.strollLocalSpot(st, e);
    else if (actId === 'meditate') systems.tiles.meditateRest(st, e);
    else if (actId === 'bounty_duel') {
      var lb = (st.bounties || []).find(function (b) { return b.region === st.currentRegion; });
      if (lb) systems.tiles.startBountyDuel(st, st.currentRegion, lb.tileIdx, e, true);
    }
    else if (actId === 'crisis_join') {
      var lc = (st.crises || []).find(function (c) { return c.region === st.currentRegion; });
      if (lc) systems.tiles.joinWorldCrisis(st, lc.id, e);
    }
    else if (actId === 'crisis_aftermath') ui.hud.toast('余波介入 M3 接入（赴会三档与余波种子）。', 'amber');
    else return;
    afterAction();
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
  /* crisis 事件条（M3 起赴会；M1 上事件条 + 入局占位） */
  function regionEvent(id) {
    if (!st || !st.hasCreatedChar) return null;
    var c = (st.crises || []).find(function (x) { return x.region === id; });
    if (c) return { label: (c.title || '').replace(/^【|】/g, ''), remain: c.remainTurns, kind: 'event' };
    return null;
  }

  /* ── 启动 ───────────────────────────────────────────────────────────────── */
  function boot() {
    /* payload 内容桥（M3）：主壳导航前写 qunxia-payload-v1（gen + arts/sects/cast/
     * events/knots/blades/manuals），boot 自读合并（只增不覆盖；36 案按 EV_TURN_MAP
     * 注入日程）——与原版 content-merge.js load 自读同语义，先合并再载档（gen 对账
     * 读同一 payload）。 */
    try {
      var pl = JSON.parse(root.localStorage.getItem('qunxia-payload-v1') || 'null');
      if (pl) systems.payload.mergePayload(pl);
    } catch (e) {}
    var res = core.state.loadGame(root.localStorage);
    st = res.state;
    core.data.bindRuntimeState(st);
    systems.payload.mergeStateMasters(st); /* 旧档收到扩展 S/A 名宿（content-merge :141 语义） */
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
      syncBoardLayer();
    }
    syncChrome();

    /* 按钮 */
    document.getElementById('btn-turn').addEventListener('click', onTurnAdvance);
    document.getElementById('btn-drawer').addEventListener('click', function () {
      if (!st || !st.hasCreatedChar) return;
      ui.drawer.open(st);
    });
    document.getElementById('btn-create').addEventListener('click', function () {
      if (st && st.hasCreatedChar) { ui.hud.toast('本世已入江湖（重开世走扩展轮回）。', 'amber'); return; }
      ui.creation.open(st);
    });
    document.getElementById('btn-creation-reroll').addEventListener('click', ui.creation.reroll);
    document.getElementById('btn-creation-submit').addEventListener('click', function () {
      ui.creation.submit(function (s2) { ui.hud.render(s2); syncChrome(); scheduleTutorial(); });
    });
  }

  root.QX3D_APP = {
    state: null,
    boot: boot,
    onRegionShown: onRegionShown,
    onTileShown: onTileShown,
    onLayerChange: onLayerChange,
    regionEvent: regionEvent,
    onTravel: onTravel,
    runAction: runAction,
    openActions: openActions,
    /* M4 深度系统动作口 */
    runMaster: function (act) {
      if (!st || !st.hasCreatedChar) return;
      var e = env();
      var us = systems.masters;
      if (act.indexOf("chat_") === 0) us.chatWithMaster(st, act.slice(5), e);
      else if (act.indexOf("learn_") === 0) us.learnFromMaster(st, act.slice(6), e);
      else if (act.indexOf("duel_") === 0) us.duelMaster(st, act.slice(5), e);
      else if (act.indexOf("story_") === 0) {
        var parts = act.slice(6).split("_");
        us.resolveMasterStoryStage(st, parts[0], parseInt(parts[1]) || 0, "A", e);
      }
      save();
      ui.hud.render(st);
    },
    runDeep: function (act) {
      if (!st || !st.hasCreatedChar) return;
      var e = env();
      if (act.indexOf("upgradeArt_") === 0) systems.deep.upgradeArt(st, act.slice(11), e);
      else if (act.indexOf("equipInner_") === 0) systems.deep.equipInnerArt(st, act.slice(11), e);
      else if (act.indexOf("toggleMove_") === 0) systems.deep.toggleEquipMove(st, act.slice(11), e);
      else if (act.indexOf("acupoint_") === 0) systems.deep.unlockAcupoint(st, act.slice(9), e);
      else if (act.indexOf("estate_") === 0) systems.deep.upgradeEstateBuilding(st, act.slice(7), e);
      else if (act.indexOf("work_") === 0) systems.deep.doEstateWork(st, act.slice(5), e);
      save();
      ui.hud.render(st);
    },
    afterTutorial: function () { if (st) ui.hud.render(st); },
    env: env,
    afterTutorial: function () { if (st) ui.hud.render(st); },
    save: save,
    renderHud: function () { ui.hud.render(st); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
