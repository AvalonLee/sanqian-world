/* view/wuxia-home.js — 武侠 tab 主壳（册214 · P1 契约改版）
 *
 * 书形态（view/wuxia-book.js，已摘挂载封存）退役后，武侠世界进主界面走本件：
 * tab 页签 + 主页状态卡（IA 草案 = 放置RPG改造方案 §六；P1 立骨架，内容逐批填实）。
 *
 * 纪律（承 wuxia-book.js 同款）：
 *   1. 取数一律走内核 ctx() 桥（渲染器形参名钉死 `c`，D7 逐键对账）；
 *   2. 本件不写裸中文常量（文案全走 `SQ.t(key, vars, 'wuxia')`，新键族 wh.* 在 lexicon.js）；
 *   3. 事件用 onclick 赋值（一个元素一个 handler，件内态不进 D15① 射程）；
 *   4. 整页 innerHTML 每秒重建（tick 走 refresh）——入场动画不许挂在元素本身（册147 口径），
 *      本件 P1 骨架无动画。
 *
 * P1 范围：主页只读状态（境界进度 / 修习槽一览）+ 十页签骨架（未实装页 wip 占位）。
 *   修习操作 / 破关钮 / 精力闸 = P2；地界行走 = P3；门派师承 = P4；世界事件 = P5；
 *   市集经济 = P6；结交/书笺 = P7。 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  /* 世界分卷名走桥的 wid（D12 封闭性：本件不写世界 id 字面量；mount/refresh 先行设定） */
  var WID = null;
  function tw(key, vars) { return SQ.t(key, vars || null, WID); }

  /* 页签（IA 十页 · 方案卷 §六）：P1 全部立签，实装页 = home；其余 wip 占位。 */
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
  var cur = 'home';

  /* 主页：状态卡 + 境界进度 + 修习槽一览（只读；操作随 P2） */
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
    /* 挂机态卡（P2 接模式开关与精力闸；P1 如实呈报挂机在进行） */
    h += '<div class="wh-card"><h3>' + tw('wh.home.idle', null) + '</h3><div class="wh-row">' +
      '<span class="wh-cell">' + tw('wh.home.modes', { place: tw('zone.' + (w.place || 'luoyang') + '.name', null) }) + '</span></div>' +
      '<div class="wh-muted">' + tw('wh.home.idlenote', null) + '</div></div>';
    /* 修习槽一览（只读）：练习度条 + 心境卡层提示；操作（入槽/出槽/换槽）随 P2 */
    var slots = (w.artsSlots || []).slice(0, 6);
    var prac = w.artsPractice || {}, lv = w.artsLevels || {};
    h += '<div class="wh-card"><h3>' + tw('wh.home.slots', null) + '</h3>';
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
          '<span class="wh-muted">' + tw('wh.home.practice', { n: pv }) + '</span></div>';
      }
    }
    h += '<div class="wh-muted">' + (p.canBreak(w) ? tw('wh.home.breakReady', null) : tw('wh.home.breakLocked', null)) + '</div></div>';
    return h;
  }

  /* wip 占位页（P3~P7 逐批接续） */
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
      tw('wh.stat.renown', null) + ' ' + (w.renown > 0 ? '+' : '') + (w.renown || 0) + '</span></div>';
    var tabs = '<div class="wh-tabs">';
    for (var i = 0; i < TABS.length; i++) {
      tabs += '<button data-v="' + TABS[i].id + '"' + (cur === TABS[i].id ? ' class="on"' : '') + '>' +
        tw(TABS[i].key, null) + '</button>';
    }
    tabs += '</div>';
    var body = '<div class="wh-body">' + (cur === 'home' ? homeBody(cf) : wipBody(cur)) + '</div>';
    return top + tabs + body;
  }

  /* 挂载：首帧 + 页签委托（onclick 赋值，件内态；切页取新桥快照防旧数） */
  function mount(cf) {
    WID = (typeof cf.wid === "function" ? cf.wid() : cf.wid) || null;
    var host = document.getElementById('shell-main');
    host.innerHTML = render(cf);
    var bar = host.querySelector('.wh-tabs');
    if (bar) {
      bar.onclick = function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest('button[data-v]') : null;
        if (!b) return;
        cur = b.getAttribute('data-v') || 'home';
        refresh(cf.fresh ? cf.fresh() : cf);   /* 桥的 fresh 键（freshCtx）：切页必须读新快照 */
      };
    }
  }
  function refresh(cf) {
    WID = cf.wid || null;
    var host = document.getElementById('shell-main');
    if (host && !host.classList.contains('hide')) host.innerHTML = render(cf);
  }

  SQ.UI.wuxiaHome = { mount: mount, refresh: refresh };
})();
