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
        if (ui.audio) ui.audio.autoAdaptBgmToContext('duel'); /* 册289：战斗自动奏《难念的经》 */
        ui.duel.open(s, d, function () {
          if (ui.audio) ui.audio.autoAdaptBgmToContext('duel_end'); /* 册289：落幕还原战前曲 */
          afterAction();
        });
      },
      /* M4：传世秘境内容接入点 */
      canonicalSecret: function (s, regId, secret) { ui.panels.openSecretPending(regId, secret); },
      /* M3：世界事件当场戏 + 主奖励 */
      sceneLine: function (crisis) { return systems.payload.sceneLine(crisis); },
      crisisReward: function (id) { return systems.payload.crisisReward(st, id, env()); },
      openBountyPoster: function (bounty) { ui.panels.openBountyPoster(st, bounty, core.player, core.time.getRegion, function (b) { runAction('bounty_duel'); }); },
      openRoadEncounter: function (ev, reg) { ui.panels.openRoadEncounter(ev, reg, function (idx) { systems.tiles.applyRoadEncounterChoice(st, ev, idx, env()); afterAction(); }); },
      /* 册301 P4-C：过旬结算钩子（core/time.advanceTime 调用） */
      settleCourtOnNewTurn: function () { systems.court.settleOnNewTurn(st); },
      /* 册317 P4-F F2：本门每旬结算（core/time.advanceTime 调用）；弹窗留到 afterAction 统一开 */
      settleHallOnNewTurn: function () {
        var ev = systems.hall.settleOnNewTurn(st);
        if (ev && (ev.collapsed || ev.wanted || ev.seized)) pendingHallEvent = ev;
      },
      /* 册307 P4-B：配角对决结果回流（combat.finishDuel 调用；册313 补 info.rival） */
      onSideDuelResult: function (s, kind, victory, info) { systems.side.applyDuelResult(s, kind, victory, info); }
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
    if (ui.audio) ui.audio.autoAdaptBgmToContext('scene', st, core.time.getRegion); /* 册289：场景自适应换曲 */
    flushHallEvent(); /* 册317：本门每旬事件（破产 / 通缉 / 抄家）在动作收尾时弹 */
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
    document.getElementById('btn-sound').style.display = has ? '' : 'none'; /* 册289：琴音开关（入世后显） */
    document.getElementById('btn-bgm').style.display = has ? '' : 'none';   /* 册289：换曲钮 */
    document.getElementById('btn-settings').style.display = has ? '' : 'none'; /* 册292：设置中心（入世后显） */
    document.getElementById('btn-gazette').style.display = has ? '' : 'none';  /* 册293：邸报合集（入世后显） */
    var endingReady = has && st.turn >= st.maxTurns;
    document.getElementById('btn-ending').style.display = endingReady ? '' : 'none';
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
    systems.street.ensureState(st, core.time.getRegion);
    systems.side.ensureState(st);
    systems.romance.ensureState(st);
    systems.hall.ensureState(st);
    ui.panels.openActionPanel(st, curReg, curTile, runAction, openStreetNpc, openSideCast, openRomanceCast, openHall);
  }

  /* ── 本门（P4-F · 册316 F1）：立号检定 / 概览 ─────────────────────────────── */
  function openHall() {
    var h = systems.hall;
    h.ensureState(st);
    if (st.faction.founded) { openHallOverview(); return; }
    ui.panels.openHallFound(st, {
      gaps: h.foundingGaps(st),
      met: h.foundingMetLabels(st),
      banditOpen: h.banditPathOpen(st)
    }, function (which, name) {
      if (which === 1) return;
      var r = h.found(st, { bandit: which === 2, name: name });
      if (!r.ok) { ui.hud.toast(r.why || '这会儿立不了号。', 'amber'); return; }
      core.time.addLog(st, r.log);
      ui.hud.toast(r.toast, r.tone);
      afterAction();
    });
  }
  function hallInfo() {
    var h = systems.hall;
    h.ensureState(st);
    var region = core.time.getRegion(st.currentRegion);
    return {
      name: st.faction.name || '本门',
      fameWord: h.fameWord(st),
      doctrine: st.faction.doctrine || '行侠',
      people: h.disciples(st).length,
      cap: h.cap(st),
      houses: h.houses(st),
      wifeLine: h.wifeLine(st),
      ledger: st.faction.lastLedger || '',
      lastEvent: st.faction.lastEvent || '',
      jinLine: '隐庐' + h.jinWord(h.estateJin(st)) + '。分舵 ' + h.openBranches(st) + '。山寨 ' + h.camps(st) + '。',
      seized: !!st.faction.seized,
      bandit: !!st.faction.bandit,
      banditOpen: h.banditPathOpen(st),
      official: !!st.faction.official,
      canOfficial: h.canOfficial(st),
      changedThisTurn: st.faction.doctrineTurn === st.turn,
      hasBranch: (st.faction.branches || []).some(function (b) { return b.regionId === st.currentRegion; }),
      branchGaps: h.branchGaps(st, st.currentRegion),
      regionName: region.name
    };
  }
  function openHallOverview() {
    ui.panels.openHallOverview(st, hallInfo(), function (page) {
      if (page === 'ground') openHallGround();
      else if (page === 'rule') openHallRule();
      else if (page === 'gazette') openHallGazette();
    });
  }
  function openHallGround() {
    ui.panels.openHallGround(st, hallInfo(), function (act) {
      var h = systems.hall;
      var r;
      if (act === 'branch_open') r = h.openBranch(st, st.currentRegion);
      else if (act === 'branch_close') r = h.closeBranch(st, st.currentRegion);
      else r = h.raiseBandit(st);
      if (!r.ok) { ui.hud.toast(r.why || '这会儿办不了。', 'amber'); return; }
      if (r.toast) ui.hud.toast(r.toast, r.tone);
      afterAction();
      openHallOverview();
    });
  }
  function openHallRule() {
    ui.panels.openHallRule(st, hallInfo(), function (id) {
      var r = systems.hall.setDoctrine(st, id);
      if (!r.ok) { ui.hud.toast(r.why, 'amber'); return; }
      ui.hud.toast(r.toast, r.tone);
      afterAction();
      openHallOverview();
    });
  }
  function openHallGazette() {
    ui.panels.openHallGazette(st, hallInfo(), function (act) {
      if (act === 'flow') { ui.hud.toast(st.faction.lastLedger || '还没有流水。', 'amber'); openHallOverview(); return; }
      var r = systems.hall.goOfficial(st);
      if (!r.ok) { ui.hud.toast(r.why, 'amber'); return; }
      ui.hud.toast(r.toast, r.tone);
      afterAction();
      openHallOverview();
    });
  }
  /* 每旬门派事件（破产两旬 / 通缉警告 / 抄家）——结算只置旗，弹窗归 app（铁律 1） */
  var pendingHallEvent = null;
  function flushHallEvent() {
    if (!pendingHallEvent) return;
    var ev = pendingHallEvent;
    pendingHallEvent = null;
    if (ev.collapsed) {
      ui.panels.openCourtChoices('本门', '饷银见底', '连续两旬',
        '饷银连着见底。可以垫银、遣散一人，或散伙。',
        ['垫银（30 两）', '遣散一人', '散伙'],
        function (i) {
          var h = systems.hall;
          var r = i === 0 ? h.propUp(st) : (i === 1 ? h.dismissOne(st) : h.dissolveHall(st));
          if (!r.ok) { ui.hud.toast(r.why, 'amber'); return; }
          ui.hud.toast(r.toast, r.tone);
          afterAction();
        });
      return;
    }
    if (ev.wanted) {
      ui.panels.openCourtChoices('通缉', '本门犯险', '官差',
        '通缉高了。可以洗白、落草，或先躲。',
        ['洗白（40 两）', '落草', '躲一旬'],
        function (i) {
          var h = systems.hall;
          var r = i === 0 ? h.washWanted(st) : (i === 1 ? h.raiseBandit(st) : h.hideWanted(st));
          if (!r.ok) { ui.hud.toast(r.why, 'amber'); return; }
          ui.hud.toast(r.toast, r.tone);
          afterAction();
        });
      return;
    }
    if (ev.seized) {
      ui.panels.openCourtChoices('抄家', '余波', '本门',
        '抄家的风到了。房舍先扣一处，声望也沉。可以抗、散财求情，或逃。',
        ['抗', '散财求情（30 两）', '逃'],
        function (i) {
          var h = systems.hall;
          var r = i === 0 ? h.resistSeizure(st) : (i === 1 ? h.paySeizure(st) : h.fleeSeizure(st));
          if (!r.ok) { ui.hud.toast(r.why, 'amber'); return; }
          ui.hud.toast(r.toast, r.tone);
          afterAction();
        });
    }
  }

  /* ── 情缘（P4-E · 册314 E3b）：名册 → 人卡 → 动作/三选弹窗 ───────────────── */
  function openRomanceBadge() {
    if (!st || !st.hasCreatedChar) return;
    systems.romance.ensureState(st);
    ui.panels.openRomanceList(st, systems.romance.visibleList(st), openRomanceCast);
  }
  function openRomanceCast(id) {
    var rom = systems.romance;
    rom.ensureState(st);
    var p = rom.person(st, id);
    if (!p.known) { ui.hud.toast('册上没有这个人。', 'amber'); return; }
    var r = rom.castOf(id);
    if (!r) return;
    var sc = systems.side.castOf(id) || {};
    var cast = {
      name: r.name,
      title: (sc.title || '江湖人') + ' · ' + rom.stageWord(rom.stage(st, id)),
      lines: sc.lines || []
    };
    ui.panels.openRomanceNpc(st, cast, rom.note(st, id), rom.actionsFor(st, id) || [], function (actionId) {
      runRomanceAction(id, actionId);
    });
  }
  function runRomanceAction(id, actionId) {
    var r = systems.romance.act(st, id, actionId);
    if (!r.ok) { ui.hud.toast(r.why || '这会儿做不了。', 'amber'); return; }
    if (r.dialog) { showRomanceDialog(id, r.dialog); return; }
    if (r.log) core.time.addLog(st, r.log);
    if (r.toast) ui.hud.toast(r.toast, r.tone);
    afterAction();
  }
  /* 三选弹窗（表白 / 成亲 / 纳妾 / 寻仇四张同形；面板复用朝廷那套纸面壳） */
  function showRomanceDialog(id, dialog) {
    ui.panels.openCourtChoices(dialog.tag, dialog.title, dialog.loc, dialog.desc,
      dialog.choices.map(function (c) { return c.label; }), function (i) {
        var c = dialog.choices[i];
        if (!c) return;
        var r = systems.romance.pick(st, id, dialog.id, c.id, env());
        if (!r.ok) { ui.hud.toast(r.why || '这一支走不通。', 'amber'); return; }
        if (r.dialog) { showRomanceDialog(id, r.dialog); return; }
        if (r.log) core.time.addLog(st, r.log);
        if (r.toast) ui.hud.toast(r.toast, r.tone);
        afterAction();
      });
  }

  /* ── 配角（P4-B · 册303）：在场浮层 + 动作/三支弹窗 ───────────────────────── */
  function openSideCast(castId) {
    var curReg = core.time.getRegion(st.currentRegion);
    var cast = systems.side.castOf(castId);
    var here = systems.side.castHere(st, curReg);
    if (!cast || !here.some(function (c) { return c.id === castId; })) { ui.hud.toast('人已经不在这一处了。', 'amber'); return; }
    ui.panels.openSideNpc(st, cast, function (actionId) { runSideAction(castId, actionId, null); }, systems.side.actsFor(st, cast));
  }
  function runSideAction(castId, actionId, choice) {
    var cast = systems.side.castOf(castId);
    var r = systems.side.act(st, cast, actionId, choice, env({ checkRealmPromotion: systems.tiles.checkRealmPromotion }));
    if (r.choices) {
      ui.panels.openCourtChoices('配角', cast.name, cast.title || '', '这条路上怎么处置？', r.choices, function (i) {
        runSideAction(castId, actionId, i);
      });
      return;
    }
    if (!r.ok) { ui.hud.toast(r.why || '这会儿做不了。', 'red'); return; }
    if (r.log) core.time.addLog(st, r.log);
    if (r.toast) ui.hud.toast(r.toast, r.tone);
    afterAction();
  }

  /* ── 市井（P4-A · 册300）：在场人浮层 + 动作派发 ──────────────────────────── */
  function openStreetNpc(npcId) {
    var curReg = core.time.getRegion(st.currentRegion);
    var npc = systems.street.findNpc(st, curReg, npcId);
    if (!npc || npc.tileIdx !== st.currentTileIdx) { ui.hud.toast('人已经不在这一处了。', 'amber'); return; }
    /* 官差三支（朝廷线）按原版 syncOfficerJobActions 前置：洗通缉 / 领悬赏 / 交人犯 */
    var extra = npc.jobId === 'officer' ? systems.court.officerActions(st) : [];
    ui.panels.openStreetNpc(st, npc, function (actionId) { runStreetAction(npcId, actionId); }, extra);
  }
  function runStreetAction(npcId, actionId) {
    var curReg = core.time.getRegion(st.currentRegion);
    var npc = systems.street.findNpc(st, curReg, npcId);
    var r = systems.court.isCourtAction(actionId)
      ? systems.court.actOfficer(st, npc, actionId)
      : systems.street.act(st, npc, actionId, env({
        getRegion: core.time.getRegion,
        checkRealmPromotion: systems.tiles.checkRealmPromotion
      }));
    if (!r.ok) { ui.hud.toast(r.why || '这会儿做不了。', 'red'); return; }
    if (r.log) core.time.addLog(st, r.log);
    if (r.toast) ui.hud.toast(r.toast, r.tone);
    /* 册303：交人犯 → 海捕销名（P4-B markBountyCleared 的第一处消费面） */
    if (actionId === 'court_turnin' && systems.side) {
      systems.side.markBountyCleared(st, (st.court && st.court.flags && st.court.flags.bountyAccepted) || 'generic');
    }
    afterAction();
  }

  /* ── 朝廷风声（P4-C · 册301）：顶栏角标 → 结论体 / 五类选择 ───────────────── */
  function courtOfficerHere() {
    var reg = core.time.getRegion(st.currentRegion);
    var here = systems.street.npcsHere(st, reg);
    for (var i = 0; i < here.length; i++) if (here[i].jobId === 'officer') return here[i];
    return null;
  }
  function courtApply(r) {
    if (!r) return;
    if (r.log) core.time.addLog(st, r.log);
    if (r.toast) ui.hud.toast(r.toast, r.tone);
    afterAction();
    if (r.openOfficer) openStreetNpc(r.openOfficer);
  }
  function openCourtBadge(id) {
    var c = systems.court.ensureRumors(st);
    if (id === 'court') {
      var edict = systems.court.findRumor(st, 'edict');
      ui.panels.openCourtChoices('朝廷', '功名与通缉', '顶栏',
        '功名：' + systems.court.meritWord(c.merit) + '。通缉：' + systems.court.wantedWord(c.wanted) +
        '。' + (edict ? edict.line : '眼下没有未决诏令。'),
        ['去看置顶风声', '找脚下的官差', '已知'],
        function (i) {
          if (i === 0) {
            var pin = systems.court.findRumor(st, c.pinId) || edict;
            if (pin) openCourtRumor(pin.id);
          } else if (i === 1) {
            courtApply(systems.court.wantedChoice(st, 'wash', { officerHere: courtOfficerHere }));
          }
        });
    } else if (id === 'xia') {
      ui.panels.openCourtChoices('西夏', '边谊', '顶栏',
        '边谊：' + systems.court.borderWord(c.border) + '。细作嫌疑：' + (c.spy ? '有' : '无') + '。',
        ['再打听边市', '已知'],
        function (i) {
          if (i !== 0) return;
          st.pendingRumor = { grade: 'stale', text: '边市还在边关一带做，没人报出商胡的名字和落脚的格子。', aboutId: 'xia' };
          core.time.addLog(st, '【朝廷】' + st.pendingRumor.text);
          ui.hud.toast('只有这一句边市。', 'amber');
          afterAction();
        });
    } else {
      ui.panels.openCourtChoices('辽', '燕云', '顶栏',
        systems.court.yanyunWord(c.yanyun) + '。本旬邸报：边警起了，武林有人议盟，没有点出使者站在哪。',
        ['关注盟约', '已知'],
        function (i) { if (i === 0) courtApply(systems.court.yanyunChoice(st, 'watch')); });
    }
  }
  function openCourtRumor(id) {
    var r = systems.court.findRumor(st, id);
    if (!r) return;
    var open = function (tag, title, loc, labels, fn) {
      ui.panels.openCourtChoices(tag, title, loc, r.line, labels, fn);
    };
    if (r.type === 'edict') {
      open('诏令', '驿站诏令', '邸报', ['应召', '拒诏', '拖延'], function (i) {
        courtApply(systems.court.answerEdict(st, ['yes', 'no', 'delay'][i]));
      });
    } else if (r.type === 'border') {
      open('边报', '西夏商胡', '边关一带', ['护送', '回避', '再打听'], function (i) {
        courtApply(systems.court.borderChoice(st, ['escort', 'avoid', 'ask'][i]));
      });
    } else if (r.type === 'merit') {
      open('悬赏·功名', '海捕告示', '告示', ['接赏', '查看线索', '搁置'], function (i) {
        courtApply(systems.court.meritChoice(st, ['take', 'clue', 'hold'][i]));
      });
    } else if (r.type === 'wanted') {
      open('悬赏·通缉', '尔名在官', '告示', ['去衙署洗白', '先躲', '已知'], function (i) {
        courtApply(systems.court.wantedChoice(st, ['wash', 'hide', 'known'][i], { officerHere: courtOfficerHere }));
      });
    } else if (r.type === 'yanyun') {
      open('燕云邸报', '边警', '邸报', ['关注盟约', '南避', '已知'], function (i) {
        courtApply(systems.court.yanyunChoice(st, ['watch', 'south', 'known'][i]));
      });
    }
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
    systems.street.ensureState(st, core.time.getRegion); /* 册300：旧档补市井七字段 */
    systems.court.ensureState(st);                       /* 册301：旧档补朝廷态 */
    systems.side.ensureState(st);                        /* 册303：旧档补配角旗标 */
    systems.romance.ensureState(st);                     /* 册311：旧档补情缘态 */
    systems.payload.mergeStateMasters(st); /* 旧档收到扩展 S/A 名宿（content-merge :141 语义） */
    if (res.genAction.action === 'reload') {
      /* 扩展侧已转世：存档已清，刷新回创角封面（原 reconcileWorldGen :3218） */
      root.location.reload();
      return;
    }
    root.QX3D_APP.state = st;
    if (ui.audio) ui.audio.bindAutoStart(); /* 册289：首次手势起奏（浏览器自播放策略） */
    if (!st.hasCreatedChar) {
      ui.creation.open(st);
      ui.hud.renderLogs(st);
    } else {
      ui.hud.render(st);
      syncBoardLayer();
    }
    syncChrome();

    /* 按钮 */
    document.getElementById('btn-turn').addEventListener('click', function () {
      if (ui.audio) ui.audio.sfx(523.25, 'pluck'); /* 册289：吐纳落弦音 */
      onTurnAdvance();
    });
    document.getElementById('btn-sound').addEventListener('click', function () {
      if (ui.audio) ui.audio.toggleSound();
    });
    document.getElementById('btn-bgm').addEventListener('click', function () {
      if (ui.audio) ui.audio.cycleBgmSuite();
    });
    document.getElementById('btn-settings').addEventListener('click', function () {
      if (ui.settings) ui.settings.open(); /* 册292：设置中心（audio prefs 四键上屏） */
    });
    document.getElementById('btn-gazette').addEventListener('click', function () {
      if (ui.gazette && st) ui.gazette.open(st); /* 册293：邸报合集（canonEventReports 翻阅面） */
    });
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
    /* 顶栏朝廷角标（册301）：委托到 #hud-court，重渲不丢监听 */
    var courtHost = document.getElementById('hud-court');
    if (courtHost) {
      courtHost.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-court]') : null;
        if (b) openCourtBadge(b.getAttribute('data-court'));
      });
    }
    /* 顶栏情缘角标（册314）：委托到 #hud-romance，同上 */
    var romanceHost = document.getElementById('hud-romance');
    if (romanceHost) {
      romanceHost.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-romance]') : null;
        if (b) openRomanceBadge();
      });
    }
    /* 顶栏本门角标（册316）：委托到 #hud-hall，同上 */
    var hallHost = document.getElementById('hud-hall');
    if (hallHost) {
      hallHost.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('[data-hall]') : null;
        if (b) openHallOverview();
      });
    }
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
    openCourtBadge: openCourtBadge,
    openCourtRumor: openCourtRumor,
    openStreetNpc: openStreetNpc,
    openRomanceBadge: openRomanceBadge,
    openRomanceCast: openRomanceCast,
    openHall: openHall,
    openHallOverview: openHallOverview,
    openHallGround: openHallGround,
    openHallRule: openHallRule,
    openHallGazette: openHallGazette,
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
    rebirthDone: function (meta) {
      /* 周目结算/道途铭刻后：清档 → 刷新回创角（门环重定向自动接管） */
      ui.hud.toast('🏆 周目结算完成！+碑点已入碑林。即将开启新周目…', 'emerald');
      setTimeout(function () { root.location.reload(); }, 1500);
    },
    env: env,
    afterTutorial: function () { if (st) ui.hud.render(st); },
    rebirthDone: function (meta) {
      /* 周目结算/道途铭刻后：清档 → 刷新回创角（门环重定向自动接管） */
      ui.hud.toast('🏆 周目结算完成！+碑点已入碑林。即将开启新周目…', 'emerald');
      setTimeout(function () { root.location.reload(); }, 1500);
    },
    save: save,
    renderHud: function () { ui.hud.render(st); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
