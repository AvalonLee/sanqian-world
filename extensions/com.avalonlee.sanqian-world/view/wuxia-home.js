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
  /* 前往地界（免费；visited 记见闻） */
  function goZone(slot, zid) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      if (!pk.zoneUnlocked(w, zid)) { slot.toast(tw('wh.zone.locked', null)); return; }
      w.place = zid;
      if ((w.visited || []).indexOf(zid) < 0) w.visited.push(zid);
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
  /* 世界事件赴会 / 结交 / 退隐（册218 P5+P7） */
  function doEvent(slot, id, mode, alt) {
    act(slot, function (s) {
      var w = s.worlds[s.profile.worldId];
      var pk = SQ.Worlds[s.profile.worldId].pack;
      var r = pk.attendEvent(w, id, mode, alt);
      if (r && r.err === 'realm') { slot.toast(tw('wh.err.gate', null)); return; }
      if (r && r.err === 'stamina') { slot.toast(tw('wh.rep.stamina', null)); return; }
      if (r && r.err) { slot.toast(tw('wh.err.save', null)); return; }
      /* 场面执行器挂接（册222）：挂接案赴会 → 战报卡复用 knot 态渲染「当场那段戏」，
       * 分支直选走现成 data-knot → knotChoose 链（轴微调 + knotDone，travel 同源不重写）；
       * 有戏可看时切回主页（战报卡挂主页——「大事毕、回主厅看戏」） */
      if (r && r.scene) {
        w.lastReport = { kind: 'knot', knot: r.scene.knot, title: 'knot.' + r.scene.knot + '.name', opts: r.scene.opts };
        cur = 'home';
      }
      SQ.Log.push(w, 'sys', tw('we.' + id + '.name', null) + ' · ' + (r.alt ? tw('wh.jianghu.fate.alt', null) : tw('wh.jianghu.fate.canon', null)));
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
      h += '<div class="wh-row">' + (r.win ? tw('wh.rep.battle.win', { foe: foeName, loot: r.loot })
        : (r.big ? tw('wh.rep.battle.big', { foe: foeName, n: w.injury }) : tw('wh.rep.battle.lose', { foe: foeName, n: w.injury }))) + '</div>';
    } else if (r.kind === 'knot') {
      h += '<div class="wh-row">' + tw('wh.rep.knot.ask', { title: tw(r.title, null) }) + '</div><div class="wh-row">';
      for (var i = 0; i < (r.opts || []).length; i++) {
        h += '<button class="btn" data-knot="' + r.knot + '" data-opt="' + r.opts[i].k + '">' + tw('wh.chose.' + r.opts[i].k, null) + '</button>';
      }
      h += '</div>';
    } else if (r.kind === 'knotDone') {
      h += '<div class="wh-row">' + tw('wh.rep.knotDone', { chose: tw('wh.chose.' + r.chose, null) }) + '</div>';
    } else if (r.kind === 'quiet') {
      h += '<div class="wh-row">' + tw('wh.rep.quiet', { place: tw('zone.' + r.place + '.name', null), n: r.scene, loot: r.loot || 0 }) + '</div>';
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
      var cur = w.place === z.i;
      var prog = (w.sceneProg || {})[z.i] | 0;
      var total = (z.scenes || ['1']).length;
      h += '<div class="wh-row">' +
        '<span class="wh-cell"><b>' + tw('zone.' + z.i + '.name', null) + '</b>' + (cur ? tw('wh.zone.cur', null) : '') + '</span>' +
        '<span class="wh-muted">' + (unlocked ? tw('wh.zone.scene', { n: Math.min(prog, total), t: total }) : tw('wh.zone.locked', null)) + '</span>' +
        (unlocked && !cur ? '<button class="btn" data-zone="' + z.i + '">' + tw('wh.zone.go', null) + '</button>' : '') +
        '</div>';
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
    var w = cf.w;
    var a = w.atts || { zhi: 50, gu: 50, xing: 50 };
    var known = (w.artsKnown || []).slice();
    var inSlot = {};
    (w.artsSlots || []).forEach(function (x) { inSlot[typeof x === 'string' ? x : (x && x.id)] = 1; });
    var h = '';
    h += '<div class="wh-card"><h3>' + tw('wh.arts.atts', null) + '</h3><div class="wh-row">' +
      '<span class="wh-cell">' + tw('wh.atts.zhi', null) + ' <b>' + a.zhi + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.atts.gu', null) + ' <b>' + a.gu + '</b></span>' +
      '<span class="wh-cell">' + tw('wh.atts.xing', null) + ' <b>' + a.xing + '</b></span>' +
      '</div><div class="wh-muted">' + tw('wh.arts.attsnote', null) + '</div></div>';
    h += slotsBody(w, false);
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
      var name = it.kind === 'manual' ? tw('manual.' + it.i + '.name', null) : tw('shop.' + it.i + '.name', null);
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
  /* 江湖页（册218 P5）：可赴世界事件 + 已写结局 */
  function jianghuBody(cf) {
    var w = cf.w, p = cf.p;
    var h = '<div class="wh-card"><h3>' + tw('wh.jianghu.title', null) + '</h3>';
    var evs = p.worldEvents(w);
    if (!evs.length) h += '<div class="wh-muted">' + tw('wh.jianghu.none', null) + '</div>';
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('we.' + e.i + '.name', null) + '</b>' +
        '<span class="wh-muted">' + tw('we.' + e.i + '.desc', null) + '</span></span>' +
        '<button class="btn" data-we="' + e.i + '" data-mode="watch">' + tw('wh.jianghu.watch', null) + '</button>' +
        '<button class="btn" data-we="' + e.i + '" data-mode="join">' + tw('wh.jianghu.join', { n: e.tier.join }) + '</button>' +
        '<button class="btn" data-we="' + e.i + '" data-mode="lead">' + tw('wh.jianghu.lead', { n: e.tier.lead }) + '</button>' +
        '</div>';
    }
    var fate = (w.world && w.world.wefate) || {};
    var fk = Object.keys(fate);
    for (var k = 0; k < fk.length; k++) {
      var fkMode = fate[fk[k]];
      /* 错过回声（册223）：echo = 江湖传言收场——正文读 we.<id>.echo，括注 tag.echo */
      var isEcho = fkMode === 'echo';
      h += '<div class="wh-row"><span class="wh-cell"><b>' + tw('we.' + fk[k] + '.name', null) + '</b>' +
        '<span class="wh-muted">' + (isEcho ? tw('we.' + fk[k] + '.echo', null) : tw('we.' + fk[k] + '.fate.' + (fkMode === 'alt' ? 'alt' : 'canon'), null)) +
        tw('wh.jianghu.fate.tag.' + (isEcho ? 'echo' : fkMode), null) + '</span></span></div>';
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

  function render(cf) {
    var w = cf.w, p = cf.p;
    var inj = w.injury || 0;
    var top = '<div class="wh-top"><span class="wh-id">' + tw('wh.title', null) + ' · ' + tw('realm.' + (w.realm | 0), null) +
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
    var body = '<div class="wh-body">' + (cur === 'home' ? homeBody(cf) : (cur === 'arts' ? artsBody(cf) : (cur === 'zones' ? zonesBody(cf) : (cur === 'sect' ? sectBody(cf) : (cur === 'shop' ? shopBody(cf) : (cur === 'jianghu' ? jianghuBody(cf) : (cur === 'people' ? peopleBody(cf) : wipBody(cur)))))))) + '</div>';
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
      else if (b.getAttribute('data-join')) doSect(f2, 'join', b.getAttribute('data-join'));
      else if (b.getAttribute('data-learn')) doSect(f2, 'learn', b.getAttribute('data-learn'));
      else if (b.getAttribute('data-buy')) doSect(f2, 'buy', b.getAttribute('data-buy'));
      else if (b.getAttribute('data-study')) doSect(f2, 'study', b.getAttribute('data-study'));
      else if (b.id === 'wh-task') doSect(f2, 'task', null);
      else if (b.id === 'wh-donate') doSect(f2, 'donate', null);
      else if (b.id === 'wh-betray') doSect(f2, 'betray', null);
      else if (b.getAttribute('data-we')) doEvent(f2, b.getAttribute('data-we'), b.getAttribute('data-mode'), false);
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
