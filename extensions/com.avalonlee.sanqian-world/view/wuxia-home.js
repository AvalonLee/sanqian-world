/* view/wuxia-home.js — 武侠 tab 主壳（册214 · P1 骨架；册215 · P2 核心循环操作化）
 *
 * 书形态（view/wuxia-book.js，已摘挂载）退役后，武侠世界进主界面走本件。
 * P2 新增：修习页（修习槽管理 + 已知武学 + 资质三轴）、主页破关/强行冲关钮、
 *          精力条与恢复显示（主动动作闸：入槽/换槽 2 · 强行冲关 20）。
 *
 * 纪律（承 P1）：
 *   1. 取数一律走内核 ctx() 桥（渲染器形参名钉死 `c`，D7 逐键对账）；
 *   2. 本件不写裸中文常量（文案全走 `SQ.t(key, vars, WID)`，键族 wh.* 在 lexicon.js）；
 *   3. 事件用 onclick 赋值（一个元素一个 handler，件内态不进 D15① 射程）；
 *   4. 整页 innerHTML 每秒重建（tick 走 refresh）——入场动画不挂元素本身（册147 口径）；
 *   5. 写档一律 `SQ.mutate(c.s, fn)` 事务口（直写内存态会被下一次 claim 覆盖）。 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  /* 世界分卷名走桥的 wid（D12 封闭性：本件不写世界 id 字面量；mount/refresh 先行设定） */
  var WID = null;
  function tw(key, vars) { return SQ.t(key, vars || null, WID); }
  var cur = 'home';

  /* 页签（IA 十页 · 方案卷 §六）：实装页 = home / arts；其余 wip 占位（P3~P7 逐批填）。 */
  var TABS = [
    { id: 'home', key: 'wh.tab.home' },
    { id: 'arts', key: 'wh.tab.arts' },
    { id: 'zones', key: 'wh.tab.zones' },
    { id: 'sect', key: 'wh.tab.sect' },
    { id: 'people', key: 'wh.tab.people' },
    { id: 'shop', key: 'wh.tab.shop' },
    { id: 'jianghu', key: 'wh.tab.jianghu' },
    { id: 'book', key: 'wh.tab.book' },
    { id: 'gear', key: 'wh.tab.gear' },
    { id: 'settings', key: 'wh.tab.settings' }
  ];

  function esc(s2) { return String(s2 == null ? '' : s2).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  void esc;

  /* ── 动作（事务口）────────────────────────────────────────────────────────────
   * mutate 后取新快照重渲（直写内存态会被下一次 claim 覆盖；改档后桥快照是旧的）。 */
  function act(slot, fn, done) {
    SQ.mutate(slot.s, fn).then(function () { done(slot.fresh ? slot.fresh() : slot); },
      function () { slot.toast(tw('wh.err.save', null)); });
  }
  /* 入槽/出槽（精力 2；修习槽 ≤6，练习度制 30 分/层 × 悟性） */
  function toggleSlot(slot, aid) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var i = (w.artsSlots || []).indexOf(aid);
      if (i >= 0) { w.artsSlots.splice(i, 1); return; }
      if ((w.stamina | 0) < 2) { slot.toast(tw('wh.err.stamina', null)); return; }
      if ((w.artsSlots || []).length >= 6) { slot.toast(tw('wh.err.slots', null)); return; }
      w.stamina -= 2;
      w.artsSlots.push(aid);
    }, function (f) { refresh(f); });
  }
  /* 闯荡一步（精力 3）：推进/遇敌/撞剧情——战报落 lastReport */
  function doTravel(slot) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      var r = pk.travel(w, {});
      if (r && r.err === 'stamina') { slot.toast(tw('wh.rep.stamina', null)); return; }
      if (r && r.err === 'hurt') { slot.toast(tw('wh.rep.hurt', null)); return; }
      if (r && r.err) return;
      if (r.kind === 'battle') {
        var foeName = tw('event.' + r.foe + '.name', null);
        if (r.win) SQ.Log.push(w, 'sys', tw('wh.rep.battle.win', { foe: foeName, loot: r.loot }));
        else if (r.big) SQ.Log.push(w, 'sys', tw('wh.rep.battle.big', { foe: foeName, n: w.injury }));
        else SQ.Log.push(w, 'sys', tw('wh.rep.battle.lose', { foe: foeName, n: w.injury }));
      }
    }, function (f) { refresh(f); });
  }
  /* 前往地界（精力 3，册239 起与「闯荡一步」同价）：visited 记见闻——到达给三处反馈（册231）：
   * ① 浮层「到了 X」即时一行 ② 战报卡 arrive 态（写景正文）③ 行走页当前地常驻写景。
   * 三处各管一段：即时感 / 回看 / 常驻，不重复堆在同一屏。事件赴会也走同一脚价（引擎内扣）。 */
  function goZone(slot, zid) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      if (!pk.zoneUnlocked(w, zid)) { slot.toast(tw('wh.zone.locked', null)); return; }
      if ((w.stamina | 0) < 3) { slot.toast(tw('wh.rep.stamina', null)); return; }
      w.stamina = Math.max(0, (w.stamina | 0) - 3);
      w.place = zid;
      if ((w.visited || []).indexOf(zid) < 0) w.visited.push(zid);
      var sc = pk.zoneSceneOf ? pk.zoneSceneOf(zid) : null;
      w.lastReport = { kind: 'arrive', place: zid, scene: sc ? sc.i : null };
      slot.toast(tw('wh.rep.arrive', { place: tw('zone.' + zid + '.name', null) }));
    }, function (f) { refresh(f); });
  }
  /* 剧情直选（批书语义摘除：玩家直接选支） */
  function chooseKnot(slot, knotId, optK) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      pk.knotChoose(w, knotId, optK);
    }, function (f) { refresh(f); });
  }
  /* 拜师 / 学艺 / 任务 / 供奉 / 叛门 / 买 / 研读（册217 P4+P6） */
  function doSect(slot, actName, arg) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      var r = null;
      if (actName === 'join') r = pk.joinSect(w, arg);
      else if (actName === 'learn') r = pk.learnArt(w, arg);
      else if (actName === 'task') r = pk.sectTask(w);
      else if (actName === 'donate') r = pk.donateSect(w, 100);
      else if (actName === 'betray') r = pk.betraySect(w);
      else if (actName === 'study') r = pk.studyManual(w, arg);
      else if (actName === 'buy') r = pk.buyItem(w, arg);
      if (r && r.err === 'renown') { slot.toast(tw('wh.sect.joingate', { gate: r.gate, have: r.have })); return; }
      if (r && r.err === 'stones') { slot.toast(tw('wh.shop.poor', null)); return; }
      if (r && r.err === 'contribution') { slot.toast(tw('wh.sect.contribution', { n: r.have })); return; }
      if (r && r.err) { slot.toast(tw('wh.err.save', null)); return; }
      if (actName === 'buy' || actName === 'study') slot.toast(tw('wh.shop.bought', null));
    }, function (f) { refresh(f); });
  }
  /* 主奖励行（册228 · 世界事件卷 §七）：三种载体各一句，重复处置各表各的 */
  function rewardLine(rw) {
    if (!rw) return '';
    if (rw.kind === 'art') {
      var nm = tw('art.' + rw.id + '.name', null);
      if (rw.capped) return tw('wh.reward.art.cap', { name: nm });
      if (rw.fresh) return tw('wh.reward.art', { name: nm });
      return tw('wh.reward.art.up', { name: nm, n: rw.level });
    }
    if (rw.kind === 'blade') {
      var bn = tw('wp.' + rw.id + '.name', null);
      return rw.dupe ? tw('wh.reward.blade.dupe', { name: bn, n: rw.cash }) : tw('wh.reward.blade', { name: bn });
    }
    if (rw.kind === 'manual') return tw('wh.reward.manual', { name: tw('manual.' + rw.id + '.name', null) });
    return '';
  }
  /* 世界事件赴会 / 结交 / 退隐（册218 P5+P7） */
  function doEvent(slot, id, mode, alt) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      var r = pk.attendEvent(w, id, mode, alt);
      if (r && r.err === 'realm') { slot.toast(tw('wh.err.gate', null)); return; }
      if (r && r.err === 'locked') { slot.toast(tw('wh.zone.locked', null)); return; }
      if (r && r.err === 'stamina') { slot.toast(tw('wh.rep.stamina', null)); return; }
      if (r && r.err === 'watched') { slot.toast(tw('wh.err.watched', null)); return; }
      if (r && r.err) { slot.toast(tw('wh.err.save', null)); return; }
      if (r && r.trip) slot.toast(tw('wh.rep.arrive', { place: tw('zone.' + r.trip + '.name', null) }));
      /* 主导对赌（册228）：胜 = 结局 + 主奖励，败 = 力战而竭（结局 'lose'，无奖励）——
       * 结果落战报卡（挂主页），与闯荡战报同构；join/watch 不产战报。 */
      if (mode === 'lead') {
        var rep = { kind: 'duel', event: id, win: r.win !== false, reward: r.reward || null, injury: r.injury || 0 };
        /* 挂接案主导成功仍演戏：场面分支塞进同一条战报（败局无戏——人已被抬下去） */
        if (r.scene) { rep.knot = r.scene.knot; rep.opts = r.scene.opts; }
        w.lastReport = rep;
        cur = 'home';
        SQ.Log.push(w, 'sys', tw(r.win === false ? 'wh.rep.duel.lose' : 'wh.rep.duel.win',
          { ev: tw('we.' + id + '.name', null), n: r.injury || 0 }));
        return;
      }
      /* 场面执行器挂接（册222）：挂接案赴会 → 战报卡复用 knot 态渲染「当场那段戏」，
       * 分支直选走现成 data-knot → knotChoose 链（轴微调 + knotDone，travel 同源不重写）；
       * 有戏可看时切回主页（战报卡挂主页——「大事毕、回主厅看戏」） */
      if (r && r.scene) {
        w.lastReport = { kind: 'knot', knot: r.scene.knot, title: 'knot.' + r.scene.knot + '.name', opts: r.scene.opts };
        cur = 'home';
      }
      SQ.Log.push(w, 'sys', tw('we.' + id + '.name', null) + ' · ' + (r.alt ? tw('wh.jianghu.fate.alt', null) : tw('wh.jianghu.fate.canon', null)));
      /* 卷入轻败（册231）：被波及要留一行账——否则玩家只看到侠名掉了，不知道为什么 */
      if (mode === 'join' && r && r.win === false) {
        SQ.Log.push(w, 'sys', tw('wh.jianghu.join.lose', { ev: tw('we.' + id + '.name', null), n: r.injury || 0 }));
      }
    }, function (f) { refresh(f); });
  }
  /* 悬赏 / 押镖（册226 · 数值与经济 §收入） */
  function doBounty(slot, k) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var r = SQ.Worlds[s.profile.worldId].pack.bountyTake(w, k);
      if (r && r.err === 'renown') { slot.toast(tw('wh.bounty.gate', { n: r.need })); return; }
      if (r && r.err === 'stamina') { slot.toast(tw('wh.rep.stamina', null)); return; }
      if (r && r.err) { slot.toast(tw('wh.err.save', null)); return; }
      SQ.Log.push(w, 'sys', tw(r.win ? 'wh.bounty.log.win' : 'wh.bounty.log.lose', { n: r.win ? r.loot : r.injury }));
    }, function (f) { refresh(f); });
  }
  function doEscort(slot) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var r = SQ.Worlds[s.profile.worldId].pack.escortTake(w);
      if (r && r.err === 'busy') { slot.toast(tw('wh.escort.on', null)); return; }
      if (r && r.err === 'stamina') { slot.toast(tw('wh.rep.stamina', null)); return; }
      if (r && r.err) { slot.toast(tw('wh.err.save', null)); return; }
      SQ.Log.push(w, 'sys', tw('wh.escort.log', { n: r.pay }));
    }, function (f) { refresh(f); });
  }
  /* 行装：换上 / 卸下（册227；gid = 兵刃 id，null = 卸下）。旧件由内核回库，件内不碰 stash。 */
  function doEquip(slot, eqSlot, gid) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var r = SQ.Worlds[s.profile.worldId].pack.equipGear(w, eqSlot, gid);
      if (r && r.err) { slot.toast(tw('wh.err.save', null)); return; }
    }, function (f) { refresh(f); });
  }
  function doBefriend(slot, castId) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      SQ.Worlds[s.profile.worldId].pack.befriend(w, castId);
    }, function (f) { refresh(f); });
  }
  function doRetire(slot) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var r = SQ.Worlds[s.profile.worldId].pack.retire(w);
      if (r && r.err) { slot.toast(tw('wh.err.gate', null)); return; }
      SQ.Log.push(w, 'sys', tw('wh.home.retire', null));
    }, function (f) { refresh(f); });
  }
  /* 模态切换（闯荡 0.6 / 闭关 1.0） */
  function toggleMode(slot) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      w.mode = w.mode === 'seclude' ? 'travel' : 'seclude';
    }, function (f) { refresh(f); });
  }
  /* 设置页自动开关（册240）：写档走 mutate，开关即时生效。 */
  function toggleSetting(slot, key) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      if (key === 'autoSlotArt') w.autoSlotArt = !w.autoSlotArt;
      else if (key === 'autoEquipGear') w.autoEquipGear = !w.autoEquipGear;
    }, function (f) { refresh(f); });
  }
  /* 强行冲关（数值卷 §四 唯一失败路径；精力 20；p = 0.5×(见闻/门槛)×(1+心性/400)） */
  function doForceBreak(slot) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      if ((w.stamina | 0) < 20) { slot.toast(tw('wh.err.stamina2', null)); return; }
      var pk = SQ.Worlds[s.profile.worldId].pack;
      w.stamina -= 20;
      var r = pk.attemptBreak(w);
      if (r && r.ok && r.win) SQ.Log.push(w, 'sys', tw('wh.log.force.win', { realm: tw('realm.' + w.realm, null) }));
      else if (r && r.ok) SQ.Log.push(w, 'sys', tw('wh.log.force.lose', { n: w.injury }));
    }, function (f) { refresh(f); });
  }

  /* ── 渲染 ─────────────────────────────────────────────────────────────────── */
  function staminaBar(w, pk) {
    var cap = pk.staminaCapOf(w);
    var n = Math.min(cap, Math.floor(w.stamina || 0));
    var pct = cap > 0 ? Math.round(n / cap * 100) : 0;
    return '<div class="wh-row"><span class="wh-cell">' + tw('wh.stat.stamina', null) + ' <b>' + n + '/' + cap + '</b></span>' +
      '<div class="wh-bar" style="flex:1 1 120px"><i style="width:' + pct + '%"></i></div></div>';
  }
  function homeBody(cf) {
    var w = cf.w, p = cf.p;
    var cap = p.capOf(w);
    var nx = (p.realms || [])[(w.realm | 0) + 1];
    var pct = cap > 0 ? Math.min(100, Math.round((w.qi || 0) / cap * 100)) : 0;
    var inj = w.injury || 0;
    var h = '';
    h += '<div class="wh-card"><h3>' + tw('wh.home.state', null) + '</h3><div class="wh-row">' +
      '<span class="wh-cell">' + tw('wh.stat.realm', null) + ' <b>' + tw('realm.' + (w.realm | 0), null) + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.stat.qi', null) + ' <b>' + Math.floor(w.qi || 0) + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.stat.stones', null) + ' <b>' + tw('wh.fmt.wen', { n: Math.floor(w.stones || 0) }) + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.stat.renown', null) + ' <b>' + (w.renown > 0 ? '+' : '') + (w.renown || 0) + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.stat.exp', null) + ' <b>' + (w.exp || 0) + '</b></span>' +
      (inj > 0 ? '<span class="wh-cell">' + tw('wh.stat.injury', null) + ' <b>' + inj + '</b></span>' : '') +
      '</div>';
    if (nx) {
      h += '<div class="wh-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="wh-muted">' + tw('wh.home.next', { realm: tw('realm.' + nx.r, null), pct: pct }) + '</div>';
    }
    h += '</div>';
    /* 精力 + 强行冲关（P2）：破关走 claim 自动推进（双条件足即破，放置本体）——
     * 主页不设破关钮（册215 回退：与自动破重叠）；强行冲关是唯一主动破关口（心境差硬闯，精力 20）。 */
    h += '<div class="wh-card"><h3>' + tw('wh.home.vitals', null) + '</h3>' + staminaBar(w, p);
    h += '<div class="wh-row"><button class="btn" id="wh-force">' + tw('wh.act.force', null) + '</button>' +
      '</div><div class="wh-muted">' + tw('wh.act.forcenote', null) + '</div></div>';
    if (p.canBreak(w)) h += '<div class="wh-muted">' + tw('wh.home.breakReady', null) + '</div>';
    /* 挂机态卡（P3：模态切换 + 闯荡钮） */
    h += '<div class="wh-card"><h3>' + tw('wh.home.idle', null) + '</h3><div class="wh-row">' +
      '<span class="wh-cell">' + tw('wh.mode.cur', { m: tw(w.mode === 'seclude' ? 'wh.mode.seclude' : 'wh.mode.travel', null) }) + '</span>' +
      '<button class="btn" id="wh-mode">' + tw('wh.mode.toggle', null) + '</button>' +
      '<button class="btn primary" id="wh-travel">' + tw('wh.zone.travel', null) + '</button>' +
      '</div><div class="wh-muted">' + tw('wh.mode.note', null) + '</div></div>';
    /* 战报卡（最近一次闯荡） */
    h += reportBody(w);
    /* 修习槽一览 */
    h += slotsBody(w, true);
    return h;
  }
  /* 战报卡（册216 P3）：battle/knot/quiet 三态 + 剧情抉择钮组 */
  function reportBody(w) {
    var r = w.lastReport;
    if (!r || !r.kind) return '';
    var h = '<div class="wh-card"><h3>' + tw('wh.rep.title', null) + '</h3>';
    if (r.kind === 'battle') {
      var foeName = tw('event.' + r.foe + '.name', null);
      if (r.robbed) h += '<div class="wh-row">' + tw('wh.rep.escort.robbed', { foe: foeName }) + '</div>';
      else if (r.delivered) h += '<div class="wh-row">' + tw('wh.rep.escort.done', { pay: r.delivered }) + '</div>';
      else h += '<div class="wh-row">' + (r.win ? tw('wh.rep.battle.win', { foe: foeName, loot: r.loot })
        : (r.big ? tw('wh.rep.battle.big', { foe: foeName, n: w.injury }) : tw('wh.rep.battle.lose', { foe: foeName, n: w.injury }))) + '</div>';
      /* 夺兵（册227）：胜战夺下名兵 / 谱上已有折价——只在真的掷中时出这一行 */
      if (r.blade) {
        h += '<div class="wh-row">' + (r.bladeDupe
          ? tw('wh.gear.bladeDupe', { name: tw('wp.' + r.blade + '.name', null), n: r.bladeDupe })
          : tw('wh.gear.bladeWin', { name: tw('wp.' + r.blade + '.name', null) })) + '</div>';
      }
    } else if (r.kind === 'knot') {
      h += '<div class="wh-row">' + tw('wh.rep.knot.ask', { title: tw(r.title, null) }) + '</div><div class="wh-row">';
      for (var i = 0; i < (r.opts || []).length; i++) {
        h += '<button class="btn" data-knot="' + r.knot + '" data-opt="' + r.opts[i].k + '">' + tw('wh.chose.' + r.opts[i].k, null) + '</button>';
      }
      h += '</div>';
    } else if (r.kind === 'knotDone') {
      h += '<div class="wh-row">' + tw('wh.rep.knotDone', { chose: tw('wh.chose.' + r.chose, null) }) + '</div>';
    } else if (r.kind === 'duel') {
      /* 主导对赌（册228）：结局句 + 主奖励行（败无奖励）+ 挂接案当场那段戏的分支钮 */
      h += '<div class="wh-row">' + (r.win
        ? tw('wh.rep.duel.win', { ev: tw('we.' + r.event + '.name', null) })
        : tw('wh.rep.duel.lose', { ev: tw('we.' + r.event + '.name', null), n: r.injury })) + '</div>';
      if (r.reward) h += '<div class="wh-row">' + rewardLine(r.reward) + '</div>';
      if (r.win && r.knot && (r.opts || []).length) {
        h += '<div class="wh-row"><span class="wh-muted">' + tw('wh.rep.knot.ask', { title: tw('knot.' + r.knot + '.name', null) }) + '</span></div><div class="wh-row">';
        for (var q = 0; q < r.opts.length; q++) {
          h += '<button class="btn" data-knot="' + r.knot + '" data-opt="' + r.opts[q].k + '">' + tw('wh.chose.' + r.opts[q].k, null) + '</button>';
        }
        h += '</div>';
      }
    } else if (r.kind === 'arrive') {
      /* 到达（册231）：一句「到了 X」+ 当地写景——写景正文与行走页常驻那份同源（event.<scene>.desc） */
      h += '<div class="wh-row">' + tw('wh.rep.arrive', { place: tw('zone.' + r.place + '.name', null) }) + '</div>';
      if (r.scene) h += '<div class="wh-muted">' + tw('event.' + r.scene + '.desc', null) + '</div>';
    } else if (r.kind === 'quiet') {
      h += r.delivered
        ? '<div class="wh-row">' + tw('wh.rep.escort.done', { pay: r.delivered }) + '</div>'
        : '<div class="wh-row">' + tw('wh.rep.quiet', { place: tw('zone.' + r.place + '.name', null), n: r.scene, loot: 0 }) + '</div>';
      /* 拾遗（册229 · gain 条落消费点）：与平安步分行记，不与「风平浪静」混成一句 */
      if (r.gain) {
        h += '<div class="wh-row">' + tw('wh.rep.gain', { place: tw('zone.' + r.place + '.name', null), loot: r.loot || 0 }) + '</div>';
      }
    }
    return h + '</div>';
  }
  /* 行走页（册216 P3）：十三地列表（解锁态/进度/前往） */
  function zonesBody(cf) {
    var w = cf.w, p = cf.p;
    var Z = (p.data && p.data.ZONES) || [];
    var h = '<div class="wh-card"><h3>' + tw('wh.zone.title', null) + '</h3>';
    for (var i = 0; i < Z.length; i++) {
      var z = Z[i];
      var unlocked = p.zoneUnlocked(w, z.i);
      var here = w.place === z.i;
      var prog = (w.sceneProg || {})[z.i] | 0;
      var total = (z.scenes || ['1']).length;
      h += '<div class="wh-row">' +
        '<span class="wh-cell"><b>' + tw('zone.' + z.i + '.name', null) + '</b>' + (here ? tw('wh.zone.cur', null) : '') + '</span>' +
        '<span class="wh-muted">' + (unlocked ? tw('wh.zone.scene', { n: Math.min(prog, total), t: total }) : tw('wh.zone.locked', null)) + '</span>' +
        (unlocked && !here ? '<button class="btn" data-zone="' + z.i + '"' + ((w.stamina | 0) < 3 ? ' disabled' : '') + '>' + tw('wh.zone.go', null) + '</button>' : '') +
        '</div>';
      /* 到达写景（册229 · scene 条落消费点）：只在「当前所在」那一行下挂一句——
       * 写景属转场氛围，不改数值，也不单独占卡片（一屏一主事：行走页主事仍是地界列表）。 */
      if (here && p.zoneSceneOf) {
        var sc = p.zoneSceneOf(z.i);
        if (sc) h += '<div class="wh-muted">' + tw('event.' + sc.i + '.desc', null) + '</div>';
      }
      /* 地界侧世界事件入口（册235）：此地此刻有可赴的大事的，就地挂一句 + 「往江湖页」——
       * 事件选项（旁观/卷入/主导）仍在江湖页，这里只做提示与跳转，不另开一套按钮。 */
      if (here && p.worldEventsAt) {
        var wes = p.worldEventsAt(w, z.i);
        for (var q = 0; q < wes.length; q++) {
          h += '<div class="wh-row"><span class="wh-muted">' +
            tw('wh.zone.weHere', { name: tw('we.' + wes[q].i + '.name', null) }) + '</span>' +
            '<button class="btn" data-we-go="1">' + tw('wh.zone.weGo', null) + '</button></div>';
        }
      }
    }
    return h + '</div>';
  }
  /* 修习槽卡：full = 主页只读版；否则带出槽操作 */
  function slotsBody(w, full) {
    var slots = (w.artsSlots || []).slice(0, 6);
    var prac = w.artsPractice || {}, lv = w.artsLevels || {};
    var h = '<div class="wh-card"><h3>' + tw('wh.home.slots', null) + '</h3>';
    if (!slots.length) {
      h += '<div class="wh-muted">' + tw('wh.home.slotsEmpty', null) + '</div>';
    } else {
      for (var i = 0; i < slots.length; i++) {
        var aid = typeof slots[i] === 'string' ? slots[i] : (slots[i] && slots[i].id);
        if (!aid) continue;
        var pv = Math.min(99, Math.floor(prac[aid] || 0));
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('art.' + aid + '.name', null) + '</b> · ' +
          tw('wh.home.layer', { n: lv[aid] || 1 }) + '</span>' +
          '<div class="wh-bar" style="flex:1 1 120px"><i style="width:' + Math.round(pv) + '%"></i></div>' +
          '<span class="wh-muted">' + tw('wh.home.practice', { n: pv }) + '</span>' +
          (full ? '' : '<button class="btn" data-slot="' + aid + '">' + tw('wh.act.out', null) + '</button>') +
          '</div>';
      }
    }
    return h + '</div>';
  }
  /* 修习页：资质三轴 + 修习槽管理 + 已知武学全列表（入槽） */
  function artsBody(cf) {
    var w = cf.w, p = cf.p;
    var a = w.atts || { zhi: 50, gu: 50, xing: 50 };
    var known = (w.artsKnown || []).slice();
    var inSlot = {};
    (w.artsSlots || []).forEach(function (x) { inSlot[typeof x === 'string' ? x : (x && x.id)] = 1; });
    var h = '';
    h += '<div class="wh-card"><h3>' + tw('wh.arts.atts', null) + '</h3><div class="wh-row">' +
      '<span class="wh-cell">' + tw('wh.atts.zhi', null) + ' <b>' + a.zhi + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.atts.gu', null) + ' <b>' + a.gu + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.atts.xing', null) + ' <b>' + a.xing + '</b></span>' +
      /* 内力四性（册232）：由主修内功定——修什么内功 = 走哪一路，与「学最高级的」形成取舍 */
      '<span class="wh-cell">' + tw('wh.arts.nat', { name: tw('nat.' + (p.myNat ? p.myNat(w) : 'zhong'), null) }) + '</span>' +
      '</div><div class="wh-muted">' + tw('wh.arts.attsnote', null) + '</div>' +
      '<div class="wh-muted">' + tw('wh.arts.natNote', null) + '</div></div>';
    h += slotsBody(w, false);
    /* 走火入魔红警（册233）：槽里同时挂相冲两性 ⇒ 每行功日内伤 +1。
     * 播报口径分两档：刚起（fireDays < 3）只提示「撤一部方解」；连走 ≥3 日加重（正典「濒死预警」）。 */
    var clash = p.natClash ? p.natClash(w) : null;
    if (clash && clash.clash) {
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('wh.arts.clashWarn', {
        a: tw('nat.' + clash.a, null), b: tw('nat.' + clash.b, null)
      }) + '</b></span></div>';
      var fd = (w.world && w.world.fireDays) | 0;
      if (fd >= 3) {
        h += '<div class="wh-row"><span class="wh-cell">' + tw('wh.arts.fireAlert', { n: fd, inj: Math.round(w.injury || 0) }) + '</span></div>';
      }
    }
    /* 辟邪自伤（册237）：在槽即折寿——把暗扣摆到明面上，玩家撤槽前有权知道代价 */
    if (inSlot['yg_bixie']) {
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('wh.arts.bixieWarn', null) + '</b>' +
        ' · ' + tw('wh.arts.bixieCut', { n: w.lifeCut | 0 }) + '</span></div>';
    }
    h += '<div class="wh-card"><h3>' + tw('wh.arts.known', null) + '</h3>';
    if (!known.length) h += '<div class="wh-muted">' + tw('wh.home.slotsEmpty', null) + '</div>';
    for (var i = 0; i < known.length; i++) {
      var aid = known[i];
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('art.' + aid + '.name', null) + '</b> · ' +
        tw('wh.home.layer', { n: (w.artsLevels || {})[aid] || 1 }) + '</span>' +
        (inSlot[aid] ? '<span class="wh-muted">' + tw('wh.arts.inslot', null) + '</span>'
          : '<button class="btn" data-slot="' + aid + '">' + tw('wh.act.in', null) + '</button>') +
        '</div>';
    }
    h += '</div>';
    return h;
  }
  /* 门派页（册217 P4）：未拜师 = 名录拜师；已拜 = 师门面板 */
  function sectBody(cf) {
    var w = cf.w, p = cf.p;
    var h = '<div class="wh-card"><h3>' + tw('wh.sect.title', null) + '</h3>';
    if (w.sect && w.sect.id && !w.sect.betrayed) {
      h += '<div class="wh-row">' +
        '<span class="wh-cell"><b>' + tw('sect.' + w.sect.id + '.name', null) + '</b></span>' +
        '<span class="wh-cell">' + tw('wh.sect.contribution', { n: w.sect.contribution | 0 }) + '</span>' +
        '<span class="wh-cell">' + tw('wh.sect.rank', { n: p.sectRankOf(w.sect.contribution | 0) }) + '</span>' +
        '</div><div class="wh-row">' +
        '<button class="btn" id="wh-task">' + tw('wh.sect.task', null) + '</button>' +
        '<button class="btn" id="wh-donate">' + tw('wh.sect.donate', null) + '</button>' +
        '<button class="btn" id="wh-betray">' + tw('wh.sect.betray', null) + '</button>' +
        '</div>';
      var learn = p.learnableArts(w);
      h += '<div class="wh-muted">' + tw('wh.sect.learn', null) + '</div>';
      for (var i = 0; i < learn.length; i++) {
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('art.' + learn[i].id + '.name', null) + '</b> · ' + tw('wh.sect.tier.' + learn[i].t, null) + '</span>' +
          (learn[i].known ? '<span class="wh-muted">' + tw('wh.sect.known', null) + '</span>'
            : '<button class="btn" data-learn="' + learn[i].id + '">' + tw('wh.sect.learnbtn', { c: learn[i].cost }) + '</button>') +
          '</div>';
      }
    } else {
      if (w.sect && w.sect.betrayed) h += '<div class="wh-muted">' + tw('wh.sect.betrayed', null) + '</div>';
      else h += '<div class="wh-muted">' + tw('wh.sect.none', null) + '</div>';
      var S = (p.data && p.data.SECTS) || [];
      for (var j = 0; j < S.length; j++) {
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('sect.' + S[j].id + '.name', null) + '</b> · ' + tw('wh.sect.camp.' + S[j].camp, null) + '</span>' +
          '<button class="btn" data-join="' + S[j].id + '">' + tw('wh.sect.join', null) + '</button></div>';
      }
    }
    return h + '</div>';
  }
  /* 市集页（册217 P6）：静态货架 + 研读架 */
  function shopBody(cf) {
    var w = cf.w, p = cf.p;
    var h = '<div class="wh-card"><h3>' + tw('wh.shop.title', null) + '</h3>';
    var L = p.shopList || [];
    for (var i = 0; i < L.length; i++) {
      var it = L[i];
      /* 册227：兵刃项改名族 wp.<id>.name（货架两件已并入 WEAPONS 表）；药类补上了既有缺键 shop.<id>.name */
      var name = it.kind === 'manual' ? tw('manual.' + it.i + '.name', null)
        : (it.kind === 'gear' ? tw('wp.' + it.i + '.name', null) : tw('shop.' + it.i + '.name', null));
      h += '<div class="wh-row"><span class="wh-cell"><b>' + name + '</b></span>' +
        '<button class="btn" data-buy="' + it.i + '">' + tw('wh.shop.buy', { c: it.cost }) + '</button></div>';
    }
    h += '</div>';
    h += '<div class="wh-card"><h3>' + tw('wh.arts.shelf', null) + '</h3>';
    var shelf = w.shelf || [];
    if (!shelf.length) h += '<div class="wh-muted">' + tw('wh.home.slotsEmpty', null) + '</div>';
    for (var k = 0; k < shelf.length; k++) {
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('manual.' + shelf[k] + '.name', null) + '</b></span>' +
        '<button class="btn" data-study="' + shelf[k] + '">' + tw('wh.arts.study', null) + '</button></div>';
    }
    return h + '</div>';
  }
  /* 江湖页（册218 P5）：江湖风闻（册224 G17 预告）+ 可赴世界事件 + 已写结局 */
  function jianghuBody(cf) {
    var w = cf.w, p = cf.p;
    var h = '<div class="wh-card"><h3>' + tw('wh.jianghu.title', null) + '</h3>';
    var rms = p.worldRumors ? p.worldRumors(w) : [];
    if (rms.length) {
      h += '<div class="wh-row"><span class="wh-muted"><b>' + tw('wh.rumor.title', null) + '</b></span></div>';
      for (var r = 0; r < rms.length; r++) {
        h += '<div class="wh-row"><span class="wh-cell"><span class="wh-muted">' + tw('we.' + rms[r].i + '.rumor', null) +
          (rms[r].soon ? ' <b>' + tw('wh.rumor.soon', null) + '</b>' : '') + '</span></span></div>';
      }
    } else {
      h += '<div class="wh-row"><span class="wh-muted">' + tw('wh.rumor.none', null) + '</span></div>';
    }
    var evs = p.worldEvents(w);
    /* 悬赏榜与押镖（册226 · 数值与经济 §收入） */
    if (p.bountyBoard) {
      var bd = p.bountyBoard(w);
      h += '<div class="wh-row"><span class="wh-muted"><b>' + tw('wh.bounty.title', null) + '</b></span></div>';
      for (var bi = 0; bi < bd.length; bi++) {
        var b0 = bd[bi];
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('wh.bounty.' + b0.k, null) + '</b>' +
          '<span class="wh-muted">' + tw('wh.bounty.pay', { n: b0.reward }) + (b0.gate ? ' · ' + tw('wh.bounty.gate', { n: b0.need }) : '') + '</span></span>' +
          (b0.gate ? '' : '<button class="btn" data-bounty="' + b0.k + '">' + tw('wh.bounty.take', null) + '</button>') +
          '</div>';
      }
      var es = w.escort;
      if (es) {
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('wh.escort.on', null) + '</b>' +
          '<span class="wh-muted">' + tw('wh.escort.prog', { n: es.steps | 0, pay: es.pay }) + '</span></span></div>';
      } else {
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('wh.escort.title', null) + '</b></span>' +
          '<button class="btn" data-escort="1">' + tw('wh.escort.take', null) + '</button></div>';
      }
    }
    if (!evs.length) h += '<div class="wh-muted">' + tw('wh.jianghu.none', null) + '</div>';
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      /* 主导门槛之外再给一条「对上谁」的线索（数值卷 §八 第 3 条「门槛必须可推断」）；
       * e.boss = CAST id，名走 cast 词族——不给胜算数字（正文不给数字，江湖自己掂量）。 */
      var foeTip = e.boss ? ' · ' + tw('wh.jianghu.lead.foe', { name: tw('cast.' + e.boss + '.name', null) }) : '';
      /* 按钮三态（册235/239）：门槛/精力不足置灰（判据在引擎，这里只给不可点的样子）；
       * 旁观记过 ⇒ 显示「已旁观」并锁住（join/lead 仍可赴——旁听一次不影响落子）。
       * 册239：有地界的事件人在别处时要多付一脚程（精力 3），按钮门槛按 3+本档计。 */
      var watched = p.watchDone ? p.watchDone(w, e) : false;
      var st = w.stamina | 0;
      var away = e.z && w.place !== e.z;
      var trip = away ? 3 : 0;
      var awayTip = away ? ' · ' + tw('wh.jianghu.away', { place: tw('zone.' + e.z + '.name', null) }) : '';
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('we.' + e.i + '.name', null) + '</b>' +
        '<span class="wh-muted">' + tw('we.' + e.i + '.desc', null) + foeTip + awayTip + '</span></span>' +
        '<button class="btn" data-we="' + e.i + '" data-mode="watch"' + (watched || st < 3 + trip ? ' disabled' : '') + '>' +
        (watched ? tw('wh.jianghu.watched', null) : tw('wh.jianghu.watch', null)) + '</button>' +
        '<button class="btn" data-we="' + e.i + '" data-mode="join"' + ((w.realm | 0) < e.tier.join || st < 5 + trip ? ' disabled' : '') + '>' + tw('wh.jianghu.join', { n: e.tier.join }) + '</button>' +
        '<button class="btn" data-we="' + e.i + '" data-mode="lead"' + ((w.realm | 0) < e.tier.lead || st < 10 + trip ? ' disabled' : '') + '>' + tw('wh.jianghu.lead', { n: e.tier.lead }) + '</button>' +
        '</div>';
    }
    var fate = (w.world && w.world.wefate) || {};
    var fk = Object.keys(fate);
    for (var k = 0; k < fk.length; k++) {
      var fkMode = fate[fk[k]];
      /* 错过回声（册223）：echo = 江湖传言收场——正文读 we.<id>.echo，括注 tag.echo；
       * 力战而竭（册228）：lose = 主导对赌败局——正文读 we.<id>.fate.lose，括注 tag.lose。 */
      var isEcho = fkMode === 'echo';
      var isLose = fkMode === 'lose';
      var fbody = isEcho ? tw('we.' + fk[k] + '.echo', null)
        : (isLose ? tw('we.' + fk[k] + '.fate.lose', null) : tw('we.' + fk[k] + '.fate.' + (fkMode === 'alt' ? 'alt' : 'canon'), null));
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('we.' + fk[k] + '.name', null) + '</b>' +
        '<span class="wh-muted">' + fbody + tw('wh.jianghu.fate.tag.' + (isEcho ? 'echo' : (isLose ? 'lose' : fkMode)), null) + '</span></span></div>';
    }
    /* 江湖格局（册236 · 写回四写口的展示面）：人物去向 / 门派声望 / 余波句——只读派生，不写档 */
    var wbc = (w.world && w.world.wbcast) || {};
    var wbs = (w.world && w.world.wbsect) || {};
    var aft = p.aftermathOf ? p.aftermathOf(w) : [];
    var wbk = Object.keys(wbc), wsk = Object.keys(wbs);
    if (wbk.length || wsk.length || aft.length) {
      h += '<div class="wh-row"><span class="wh-muted"><b>' + tw('wh.jianghu.wb', null) + '</b></span></div>';
      for (var wc = 0; wc < wbk.length; wc++) {
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('cast.' + wbk[wc] + '.name', null) + '</b>' +
          ' · <span class="wh-muted">' + tw('wh.castState.' + wbc[wbk[wc]], null) + '</span></span></div>';
      }
      for (var wsx = 0; wsx < wsk.length; wsx++) {
        var n = wbs[wsk[wsx]] | 0;
        h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('sect.' + wsk[wsx] + '.name', null) + '</b>' +
          ' · <span class="wh-muted">' + tw('wh.jianghu.rep', { n: (n > 0 ? '+' : '') + n }) + '</span></span></div>';
      }
      for (var wa = 0; wa < aft.length; wa++) {
        h += '<div class="wh-row"><span class="wh-muted">' + tw('we.' + aft[wa].i + '.wb.' + aft[wa].outcome, null) + '</span></div>';
      }
    }
    if ((w.realm | 0) >= 9) h += '<div class="wh-row"><button class="btn primary" id="wh-retire">' + tw('wh.home.retire', null) + '</button></div>';
    return h + '</div>';
  }
  /* 人物页（册218 P7）：已识之人 + 结交钮 */
  function peopleBody(cf) {
    var w = cf.w;
    var rel = w.relations || {};
    var h = '<div class="wh-card"><h3>' + tw('wh.people.title', null) + '</h3>';
    var rk = Object.keys(rel);
    if (!rk.length) h += '<div class="wh-muted">' + tw('wh.people.none', null) + '</div>';
    for (var i = 0; i < rk.length; i++) {
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('cast.' + rk[i] + '.name', null) + '</b></span>' +
        '<span class="wh-muted">' + tw('wh.people.aff', { n: rel[rk[i]].affinity || 0 }) + '</span>' +
        '<button class="btn" data-befriend="' + rk[i] + '">' + tw('wh.people.befriend', null) + '</button></div>';
    }
    return h + '</div>';
  }
  function wipBody(id) {
    return '<div class="wh-card"><h3>' + tw('wh.tab.' + id, null) + '</h3><div class="wh-muted">' +
      tw('wh.wip', { tab: tw('wh.tab.' + id, null) }) + '</div></div>';
  }
  /* 行装页（册227 兵器槽 + 神兵谱；册230 补齐暗器/护身/鞋履三槽）
   * 四槽一行一件（在手件 + 该件效果 + 卸下）‖ 兵器库（兵刃按乘区标、行头按效果标）‖ 神兵谱（18 名兵）。
   * **两类件的加成不是一种东西**：兵刃进 `powerOf` 的乘区（战力）；行头三槽只挂判定点
   * （战利品概率 / 败战减伤 / 避遇敌），**不进战力**——数值卷 §六 的 1.86 上限不给它开口子。
   * 谱上「有」≠「在手」：收集面只回答得没得过，战力只看 gear.weapon。 */
  var GEAR_SLOT_LIST = ['weapon', 'ranged', 'armor', 'boots'];
  function gearName(row) { return row.slot ? tw('gm.' + row.i + '.name', null) : tw('wp.' + row.i + '.name', null); }
  function gearEff(row) {
    if (!row.slot) return tw('wh.gear.tier.' + row.k, null) + ' · ' + tw('wh.gear.mult', { n: row.mul.toFixed(2) });
    var lv = row.lv | 0;
    if (row.slot === 'ranged') return tw('wh.gear.eff.loot', { n: 20 * lv });
    if (row.slot === 'armor') return tw('wh.gear.eff.injury', { n: lv });
    if (row.slot === 'boots') return tw('wh.gear.eff.evade', { n: 5 * lv });
    return '';
  }
  function gearBody(cf) {
    var w = cf.w, p = cf.p;
    var G = p.weapons || [], M = p.gearMisc || [];
    var idx = {};
    for (var i = 0; i < G.length; i++) idx[G[i].i] = G[i];
    for (var m = 0; m < M.length; m++) idx[M[m].i] = M[m];
    var gear = w.gear || {};
    var cur = gear.weapon || null;
    var curRow = cur && cur.i ? idx[cur.i] : null;
    var h = '<div class="wh-card"><h3>' + tw('wh.gear.title', null) + '</h3>';
    /* 四槽：每槽一行——在手件名 + 效果 / 未着 + 卸下 */
    for (var s = 0; s < GEAR_SLOT_LIST.length; s++) {
      var sl = GEAR_SLOT_LIST[s];
      var it = gear[sl] || null;
      var row = it && it.i ? idx[it.i] : null;
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('wh.gear.slot.' + sl, null) + '</b> · ' +
        (row ? '<b>' + gearName(row) + '</b> <span class="wh-muted">' + gearEff(row) + '</span>'
          : (sl === 'weapon' ? tw('wh.gear.empty', null) : tw('wh.gear.open', null))) +
        '</span>' +
        (row ? '<button class="btn" data-uneq="' + sl + '">' + tw('wh.gear.unequip', null) + '</button>' : '') +
        '</div>';
    }
    h += '<div class="wh-muted">' + tw('wh.gear.note', null) + '</div></div>';
    /* 兵器库：只列认得的件（表外脏 id 静默略过）——兵刃与行头同库，按件自身 slot 定装备位 */
    h += '<div class="wh-card"><h3>' + tw('wh.gear.stash', null) + '</h3>';
    var st = w.stash || [];
    var any = false;
    for (var k = 0; k < st.length; k++) {
      var it2 = idx[st[k]];
      if (!it2) continue;
      any = true;
      var slotOf = it2.slot || 'weapon';
      var onBody = !!(gear[slotOf] && gear[slotOf].i === it2.i);
      h += '<div class="wh-row"><span class="wh-cell"><b>' + gearName(it2) + '</b> <span class="wh-muted">' + gearEff(it2) + '</span></span>' +
        (onBody ? '<span class="wh-muted">' + tw('wh.gear.onbody', null) + '</span>'
          : '<button class="btn" data-eq="' + slotOf + '" data-gid="' + it2.i + '">' + tw('wh.gear.equip', null) + '</button>') +
        '</div>';
    }
    if (!any) h += '<div class="wh-muted">' + tw('wh.gear.stashEmpty', null) + '</div>';
    h += '</div>';
    var prog = p.bladeProgress ? p.bladeProgress(w) : { owned: 0, total: 0 };
    var own = {};
    for (var b = 0; b < (w.blades || []).length; b++) own[w.blades[b]] = 1;
    h += '<div class="wh-card"><h3>' + tw('wh.gear.codex', null) +
      ' <span class="wh-muted">' + tw('wh.gear.codexProg', { n: prog.owned, t: prog.total }) + '</span></h3>';
    for (var g = 0; g < G.length; g++) {
      if (G[g].k !== 2) continue;
      var got = own[G[g].i] === 1;
      var isOn = !!(curRow && curRow.i === G[g].i);
      h += '<div class="wh-row"><span class="wh-cell">' +
        (got ? '<b>' + tw('wp.' + G[g].i + '.name', null) + '</b>' : '<span class="wh-muted">' + tw('wh.gear.codexUnknown', null) + '</span>') +
        (got ? ' <span class="wh-muted">' + (isOn ? tw('wh.gear.onbody', null) : tw('wh.gear.owned', null)) + '</span>' : '') +
        '</span></div>';
    }
    h += '</div>';
    return h;
  }

  /* 书笺页（册240）：侠名录五谱 + 本世传记——全部由当前存档派生，零新增落盘字段。
   * 「谱」回答的是「见过没有」：已得的列名字，未得的只进分母；传记是活人传，随时可读。 */
  function bookRow(titleKey, ids, total, nameOf) {
    var got = ids || [];
    var names = [];
    for (var i = 0; i < got.length && i < 8; i++) names.push(nameOf(got[i]));
    if (got.length > 8) names.push(tw('wh.book.more', { n: got.length - 8 }));
    return '<div class="wh-row"><span class="wh-cell"><b>' + tw(titleKey, null) + '</b> ' +
      (names.length ? names.join(' · ') : '<span class="wh-muted">' + tw('wh.book.empty', null) + '</span>') +
      '</span><span class="wh-muted">' + tw('wh.book.count', { n: got.length, t: total }) + '</span></div>';
  }
  function bookBody(cf) {
    var w = cf.w, p = cf.p;
    var D = p.data || {};
    var artsTotal = (D.ARTS || []).length;
    var bladesTotal = (D.WEAPONS || []).filter(function (x) { return x.k === 2; }).length;
    var peopleTotal = (D.CAST || []).length;
    var zonesTotal = (D.ZONES || []).length;
    var weTotal = (p.WORLD_EVENTS || []).length;
    var fate = (w.world && w.world.wefate) || {};
    var knownWe = Object.keys(fate);
    var h = '<div class="wh-card"><h3>' + tw('wh.book.album', null) + '</h3>';
    h += bookRow('wh.book.face.art', w.artsKnown, artsTotal, function (id) { return tw('art.' + id + '.name', null); });
    h += bookRow('wh.book.face.blade', w.blades, bladesTotal, function (id) { return tw('wp.' + id + '.name', null); });
    h += bookRow('wh.book.face.people', Object.keys(w.relations || {}), peopleTotal, function (id) { return tw('cast.' + id + '.name', null); });
    h += bookRow('wh.book.face.zone', w.visited, zonesTotal, function (id) { return tw('zone.' + id + '.name', null); });
    h += '</div>';
    /* 江湖大事单独一块：谱上要看得见「守了旧局 / 改了结局」，只数个数不够 */
    h += '<div class="wh-card"><h3>' + tw('wh.book.face.we', null) +
      ' <span class="wh-muted">' + tw('wh.book.count', { n: knownWe.length, t: weTotal }) + '</span></h3>';
    if (!knownWe.length) h += '<div class="wh-muted">' + tw('wh.book.empty', null) + '</div>';
    for (var i = 0; i < knownWe.length; i++) {
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('we.' + knownWe[i] + '.name', null) + '</b></span>' +
        '<span class="wh-muted">' + tw('wh.book.fate.' + fate[knownWe[i]], null) + '</span></div>';
    }
    h += '</div>';
    /* 本世传记：名字 / 境界 / 年岁 + 师门 / 武学 / 足迹 / 人脉 / 大事 + 当下状态 */
    var prof = cf.s && cf.s.profile ? cf.s.profile : {};
    var age = p.worldSystems && p.worldSystems.lifeInfo ? p.worldSystems.lifeInfo(w, p, D).age : 16;
    var bio = tw('wh.book.bio.intro', { name: prof.name || '', realm: tw('realm.' + (w.realm | 0), null), age: age });
    if (w.sect && w.sect.id && !w.sect.betrayed) {
      bio += tw('wh.book.bio.sect', {
        sect: tw('sect.' + w.sect.id + '.name', null),
        rank: tw('wh.sect.rank', { n: p.sectRankOf(w.sect.contribution | 0) })
      });
    }
    bio += tw('wh.book.bio.arts', { n: (w.artsKnown || []).length, b: (w.blades || []).length });
    bio += tw('wh.book.bio.travel', { n: (w.visited || []).length });
    bio += tw('wh.book.bio.people', { n: Object.keys(w.relations || {}).length });
    if (knownWe.length) bio += tw('wh.book.bio.events', { n: knownWe.length });
    bio += (w.heritage && (w.heritage.gen | 0) > 1) ? tw('wh.book.bio.retired', null) : tw('wh.book.bio.walking', null);
    h += '<div class="wh-card"><h3>' + tw('wh.book.bio', null) + '</h3><div class="wh-muted">' + bio + '</div></div>';
    return h;
  }

  /* 设置页（册240）：自动开关族（真实写档）+ 离线效率说明 + 本世存档信息。
   * 说明文字只复述引擎口径（模式系数与离线封顶），不另造第二份数值。 */
  function settingsBody(cf) {
    var w = cf.w, p = cf.p;
    var yr = p.worldYearOf ? p.worldYearOf(w) + 1 : 1;
    var age = p.worldSystems && p.worldSystems.lifeInfo ? p.worldSystems.lifeInfo(w).age : 16;
    var h = '<div class="wh-card"><h3>' + tw('wh.set.offline', null) + '</h3>' +
      '<div class="wh-muted">' + tw('wh.mode.note', null) + '</div>' +
      '<div class="wh-muted">' + tw('wh.set.offline.stamina', null) + '</div>' +
      '<div class="wh-muted">' + tw('wh.set.offline.clock', null) + '</div></div>';
    h += '<div class="wh-card"><h3>' + tw('wh.set.auto', null) + '</h3>' +
      '<div class="wh-row"><span class="wh-cell">' + tw('wh.set.auto.slot', null) + '</span>' +
      '<button class="btn" data-wset="autoSlotArt">' + tw(w.autoSlotArt ? 'wh.set.on' : 'wh.set.off', null) + '</button></div>' +
      '<div class="wh-muted">' + tw('wh.set.auto.slotNote', null) + '</div>' +
      '<div class="wh-row"><span class="wh-cell">' + tw('wh.set.auto.gear', null) + '</span>' +
      '<button class="btn" data-wset="autoEquipGear">' + tw(w.autoEquipGear ? 'wh.set.on' : 'wh.set.off', null) + '</button></div>' +
      '<div class="wh-muted">' + tw('wh.set.auto.gearNote', null) + '</div>' +
      '<div class="wh-muted">' + tw('wh.set.auto.note', null) + '</div></div>';
    h += '<div class="wh-card"><h3>' + tw('wh.set.save', null) + '</h3>' +
      '<div class="wh-row"><span class="wh-cell">' + tw('wh.set.save.line', { y: yr, age: age }) + '</span></div>' +
      '<div class="wh-muted">' + tw('wh.set.save.note', null) + '</div></div>';
    return h;
  }

  function render(cf) {
    var w = cf.w, p = cf.p;
    var inj = w.injury || 0;
    /* 年份/年岁（册235）：worldDay 已活（册234）⇒ 把「第几年 · 多少岁」摆到顶栏——
     * 窗口型事件与寿元判势都按它走，玩家得看得见这本钟。 */
    var yr = p.worldYearOf ? p.worldYearOf(w) + 1 : 1;
    var age = p.worldSystems && p.worldSystems.lifeInfo ? p.worldSystems.lifeInfo(w).age : 16;
    var top = '<div class="wh-top"><span class="wh-id">' + tw('wh.title', null) + ' · ' + tw('realm.' + (w.realm | 0), null) + ' · ' +
      tw('wh.stat.year', { y: yr, age: age }) +
      (inj >= 12 ? ' · ' + tw('wh.stat.hurt', null) : '') + '</span>' +
      '<span class="wh-stats">' + tw('wh.stat.qi', null) + ' ' + Math.floor(w.qi || 0) + ' · ' +
      tw('wh.stat.stones', null) + ' ' + tw('wh.fmt.wen', { n: Math.floor(w.stones || 0) }) + ' · ' +
      tw('wh.stat.stamina', null) + ' ' + Math.min(p.staminaCapOf(w), Math.floor(w.stamina || 0)) + ' · ' +
      tw('wh.stat.renown', null) + ' ' + (w.renown > 0 ? '+' : '') + (w.renown || 0) + '</span></div>';
    var tabs = '<div class="wh-tabs">';
    for (var i = 0; i < TABS.length; i++) {
      tabs += '<button data-v="' + TABS[i].id + '"' + (cur === TABS[i].id ? ' class="on"' : '') + '>' +
        tw(TABS[i].key, null) + '</button>';
    }
    tabs += '</div>';
    var body = '<div class="wh-body">' + (cur === 'home' ? homeBody(cf) : (cur === 'arts' ? artsBody(cf) : (cur === 'zones' ? zonesBody(cf) : (cur === 'sect' ? sectBody(cf) : (cur === 'shop' ? shopBody(cf) : (cur === 'jianghu' ? jianghuBody(cf) : (cur === 'people' ? peopleBody(cf) : (cur === 'book' ? bookBody(cf) : (cur === 'gear' ? gearBody(cf) : (cur === 'settings' ? settingsBody(cf) : wipBody(cur))))))))))) + '</div>';
    return top + tabs + body;
  }

  /* 挂载：首帧 + 单一委托（挂 #shell-main 宿主——tick 每秒重建 innerHTML，
   * 挂内节点的 handler 会随节点销毁而失灵；宿主节点不换，onclick 赋值不进 D15① 射程）。 */
  function mount(cf) {
    WID = (typeof cf.wid === 'function' ? cf.wid() : cf.wid) || null;   /* 世界分卷名（D12；漏带即全屏裸键名——册215 实测两次） */
    var host = document.getElementById("shell-main");
    host.innerHTML = render(cf);
    host.onclick = function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest("button") : null;
      if (!b) return;
      var tab = b.getAttribute("data-v");
      var slot = b.getAttribute("data-slot");
      var f2 = null;
      if (tab) { cur = tab || "home"; refresh(cf.fresh ? cf.fresh() : cf); return; }   /* 切页读新快照 */
      if (b.disabled) return;
      f2 = cf.fresh ? cf.fresh() : cf;
      if (b.id === "wh-force") doForceBreak(f2);
      else if (b.id === "wh-travel") doTravel(f2);
      else if (b.id === "wh-mode") toggleMode(f2);
      else if (b.getAttribute("data-zone")) goZone(f2, b.getAttribute("data-zone"));
      else if (b.getAttribute("data-knot")) chooseKnot(f2, b.getAttribute("data-knot"), b.getAttribute("data-opt"));
      else if (b.getAttribute("data-bounty")) doBounty(f2, b.getAttribute("data-bounty"));
      else if (b.getAttribute("data-escort")) doEscort(f2);
      else if (b.getAttribute('data-join')) doSect(f2, 'join', b.getAttribute('data-join'));
      else if (b.getAttribute('data-learn')) doSect(f2, 'learn', b.getAttribute('data-learn'));
      else if (b.getAttribute('data-buy')) doSect(f2, 'buy', b.getAttribute('data-buy'));
      else if (b.getAttribute('data-study')) doSect(f2, 'study', b.getAttribute('data-study'));
      else if (b.id === 'wh-task') doSect(f2, 'task', null);
      else if (b.id === 'wh-donate') doSect(f2, 'donate', null);
      else if (b.id === 'wh-betray') doSect(f2, 'betray', null);
      else if (b.getAttribute('data-we')) doEvent(f2, b.getAttribute('data-we'), b.getAttribute('data-mode'), false);
      else if (b.getAttribute('data-we-go')) { cur = 'jianghu'; refresh(f2); }
      else if (b.getAttribute('data-eq')) doEquip(f2, b.getAttribute('data-eq'), b.getAttribute('data-gid'));
      else if (b.getAttribute('data-uneq')) doEquip(f2, b.getAttribute('data-uneq'), null);
      else if (b.getAttribute('data-wset')) toggleSetting(f2, b.getAttribute('data-wset'));
      else if (b.getAttribute('data-befriend')) doBefriend(f2, b.getAttribute('data-befriend'));
      else if (b.id === 'wh-retire') doRetire(f2);
      else if (slot) toggleSlot(f2, slot);
    };
  }
  function refresh(cf) {
    WID = (typeof cf.wid === 'function' ? cf.wid() : cf.wid) || null;
    var host = document.getElementById('shell-main');
    if (host && !host.classList.contains('hide')) host.innerHTML = render(cf);
  }

  SQ.UI.wuxiaHome = { mount: mount, refresh: refresh };
})();
