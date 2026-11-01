/* view/wuxia-book.js — 武侠「先睹」书界面（册159 · S1-e）
 *
 * 入口：创角屏择界卡的 coming 世界（有 pack.narrative 的）给一枚「先睹」钮 →
 *   `dispatch('wuxiaPreview', worldId)` → 本件 `actPreview(ctx(), worldId)`。
 *
 * **预览不落档**：会话态（假 ws / 章号 / 分支选择）全在件内私有，合上即散——
 *   `coming` 的语义（不可投生）一字不改，书界面只是「把引擎已经能生成的章摆出来看」。
 *
 * 打字机三纪律（原型 `设计稿-武侠/原型-第一章-渡口.html` §四，照抄）：
 *   ① 只 `appendChild` / 改 `textContent`，**不重建正文区 innerHTML**（册147 闪烁教训的文面版）；
 *   ② 点纸面即跳过（当前句补全 + 余句直出）；
 *   ③ 定时器族集中在件内私有 `timers`，合上时**逐枚 clear**（册147 教训的定时器版）。
 *
 * 词表纪律：本件不写裸中文常量（文案全走 `SQ.t`；通用界面键在 common 卷 `ui.book.*`，
 *   人名/地界/场景/桥段/分支标签按 worldId 走武侠分卷）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.UI = SQ.UI || {};

  /* 件内私有会话与定时器族 */
  var S = { open: false, worldId: null, ws: null, chapNo: 1, el: null, timers: [], skip: false, fork: null };

  function T(fn, ms) { var id = setTimeout(fn, ms); S.timers.push(id); return id; }
  function Tclear() { for (var i = 0; i < S.timers.length; i++) clearTimeout(S.timers[i]); S.timers = []; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tw(key, vars) { return SQ.t(key, vars || null, null); }

  /* ── 浮层骨架（一次性 innerHTML；此后正文区只 appendChild）──────────────────
   * 册164：先睹钮开放给 live 叙事世界（试读腔调，预览不落档语义不变）⇒ 提示语分档：
   * live 用「试读 · {name}」，coming 沿用「尚未开启」。 */
  function build(worldId) {
    var wname = SQ.t('world.' + worldId + '.name', null, worldId);
    var live = SQ.Worlds[worldId] && SQ.Worlds[worldId].status === 'live';
    var hintText = live ? SQ.t('ui.book.hintlive', { name: wname }, null)
                        : SQ.t('ui.book.hint', { name: wname }, null);
    var root = document.createElement('div');
    root.className = 'bkwrap';
    root.id = 'bk-wrap';
    root.innerHTML =
      '<div class="bk-book">' +
      '  <div class="bk-head"><span id="bk-chap"></span><span class="bk-hint">' + esc(hintText) + '</span></div>' +
      '  <div class="bk-paper" id="bk-paper"></div>' +
      '  <div class="bk-fork hide" id="bk-fork"></div>' +
      '  <div class="bk-notes hide" id="bk-notes"></div>' +
      '  <div class="bk-foot"><span class="bk-status" id="bk-status"></span><button class="btn ghost" id="bk-close">' + esc(tw('ui.book.close', null)) + '</button></div>' +
      '</div>';
    document.body.appendChild(root);
    S.el = root;
    document.getElementById('bk-close').onclick = function () { close(); };           /* 监听体一句（D15①） */
    document.getElementById('bk-paper').onclick = function () { S.skip = true; };     /* 监听体一句（D15①） */
    return root;
  }

  /* ── 页边批注（册161 · S3-b）：六枚轴向 chip，1 墨 + 违和 +1 + 性格轴 ±3 ──────
   * 批注是「参与」不是「决策」：不改剧情走向，只调主角的心性与文风（干预与代价 §五）。 */
  var AXES = [
    { axis: 'xia', d: 3, key: 'ui.book.axis.xia.p' },
    { axis: 'xia', d: -3, key: 'ui.book.axis.xia.m' },
    { axis: 'kuang', d: 3, key: 'ui.book.axis.kuang.p' },
    { axis: 'kuang', d: -3, key: 'ui.book.axis.kuang.m' },
    { axis: 'du', d: 3, key: 'ui.book.axis.du.p' },
    { axis: 'du', d: -3, key: 'ui.book.axis.du.m' }
  ];
  function statusText() {
    var inkN = (S.ws && S.ws.ink && S.ws.ink.n) || 0;
    var disN = (S.ws && S.ws.discord) || 0;
    return tw('ui.book.ink', { n: inkN }) + ' · ' + tw('ui.book.discord', { n: disN });
  }
  function renderNotes() {
    var box = document.getElementById('bk-notes');
    if (!box) return;
    box.innerHTML = '<div class="bk-note-row"><span class="bk-note-label">' +
      esc(tw('ui.book.annotate', null)) + '</span></div>' +
      '<div class="bk-note-hint" id="bk-note-hint"></div>';
    var row = box.firstChild;
    AXES.forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn ghost bk-opt bk-ax';
      b.dataset.axis = a.axis;
      b.dataset.d = String(a.d);
      b.textContent = SQ.t(a.key, null, null);
      b.onclick = function () { doAnnotate(b); };     /* 监听体一句（D15①） */
      row.appendChild(b);
    });
    box.classList.remove('hide');
    updateStatus();
  }
  function updateStatus() {
    var st = document.getElementById('bk-status');
    if (st) st.textContent = statusText();
  }
  function doAnnotate(btn) {
    var pk = SQ.Worlds[S.worldId] && SQ.Worlds[S.worldId].pack;
    if (!pk || !pk.narrative || !pk.narrative.annotate) return;
    var r = pk.narrative.annotate(S.ws, { axis: btn.dataset.axis, d: parseInt(btn.dataset.d, 10) }, {});
    var hint = document.getElementById('bk-note-hint');
    if (r && r.err === 'ink') { if (hint) hint.textContent = tw('ui.book.noink', null); return; }
    if (r && r.mo) { showMo(); return; }
    if (hint) hint.textContent = '';
    updateStatus();
  }
  /* 墨厄呈报（干预与代价 §三 ≥100）：本卷重写——确定后重读此卷（预览会话内自洽） */
  function showMo() {
    var box = document.getElementById('bk-fork');
    box.innerHTML = '<div class="bk-mark bk-mo">※</div><div class="bk-title">' +
      esc(tw('ui.book.mo.title', null)) + '</div><div class="bk-motext">' +
      esc(tw('ui.book.mo.text', null)) + '</div>';
    var row = document.createElement('div');
    row.className = 'bk-opts';
    var no = (S.ws.narrative.chapNo || 1);
    var b = document.createElement('button');
    b.className = 'btn ghost bk-opt';
    b.textContent = tw('ui.book.chapter', { no: no });
    b.onclick = function () { remount(); };           /* 监听体一句（D15①） */
    row.appendChild(b);
    box.appendChild(row);
    box.classList.remove('hide');
    var nb = document.getElementById('bk-notes');
    if (nb) nb.classList.add('hide');
    updateStatus();
  }
  function remount() {
    document.getElementById('bk-fork').classList.add('hide');
    showChapter();
  }

  /* ── 打字机（append-only；点纸面跳过）────────────────────────────────────────
   * 册163 参数化：bag = {open, skip, typing}（预览传 S、真档传 R）——机器一份，两种生命周期。 */
  function typeLines(bag, T, paper, lines, onDone) {
    var li = 0;
    function flushRest() {
      while (li < lines.length) {
        var p = document.createElement('p');
        p.className = 'bk-line';
        p.textContent = lines[li++];
        paper.appendChild(p);
      }
      bag.typing = false;
      onDone();
    }
    function typeOne() {
      if (!bag.open) return;                         /* 浮层已关：定时器自然死 */
      if (bag.skip) { flushRest(); return; }
      var text = lines[li];
      var cur = document.createElement('p');
      cur.className = 'bk-line';
      paper.appendChild(cur);
      var ci = 0;
      var tick = function () {
        if (!bag.open) return;
        if (bag.skip) { cur.textContent = text; li++; flushRest(); return; }
        ci += 2;                                     /* 一次两字：手感与可跳过之间取中 */
        cur.textContent = text.slice(0, ci);
        if (ci < text.length) T(tick, 28);
        else { li++; if (bag.skip) { flushRest(); return; } if (li < lines.length) T(typeOne, 240); else { bag.typing = false; onDone(); } }
      };
      T(tick, 60);
    }
    if (!lines.length) { onDone(); return; }
    bag.typing = true;
    typeOne();
  }

  /* ── 章推进 ────────────────────────────────────────────────────────────────── */
  function showChapter() {
    S.skip = false;                                  /* 每章重置跳过标记 */
    var pk = SQ.Worlds[S.worldId].pack;
    /* 册161 起 advance 是会话账的主（章号/arcArts/墨都在里面），预览不再覆盖 narrative */
    var no = (S.ws.narrative && S.ws.narrative.chapNo) || 1;
    var ch = pk.narrative.chapter(S.ws, pk, {});
    var r = pk.narrative.render(ch, S.ws);
    S.fork = r.fork;
    document.getElementById('bk-chap').textContent = SQ.t('ui.book.chapter', { no: no }, null) + ' · ' +
      SQ.t('zone.' + S.ws.place + '.name', null, S.worldId);
    var paper = document.getElementById('bk-paper');
    while (paper.firstChild) paper.removeChild(paper.firstChild);   /* 清章（append-only 指打字过程；换章清屏是翻页） */
    document.getElementById('bk-fork').classList.add('hide');
    typeLines(S, T, paper, r.lines, function () { renderNotes(); showFork(); });
  }
  function showFork() {
    if (!S.fork) return;
    var box = document.getElementById('bk-fork');
    box.innerHTML = '<div class="bk-mark">※</div><div class="bk-title">' +
      esc(SQ.t(S.fork.title, null, S.worldId)) + '</div>';
    var row = document.createElement('div');
    row.className = 'bk-opts';
    for (var i = 0; i < S.fork.opts.length; i++) {
      (function (o) {
        var b = document.createElement('button');
        b.className = 'btn ghost bk-opt';
        b.textContent = o.ink > 0
          ? SQ.t('ui.book.optfmt', { label: SQ.t(o.label, null, S.worldId), n: o.ink }, null)
          : SQ.t('ui.book.optfree', { label: SQ.t(o.label, null, S.worldId) }, null);
        b.onclick = function () { pick(o); };         /* 监听体一句（D15①） */
        row.appendChild(b);
      })(S.fork.opts[i]);
    }
    box.appendChild(row);
    var foot = document.createElement('div');
    foot.className = 'bk-next';
    foot.textContent = tw('ui.book.forknote', null);
    box.appendChild(foot);
    box.classList.remove('hide');
  }
  /* 点分支：**预览会话内也走真账**（册161）——advance 扣墨/违和/性格轴，墨厄当场呈报；
   * 不落档的立身之本不变（会话态全在件内，合上即散）。 */
  function pick(o) {
    var pk = SQ.Worlds[S.worldId].pack;
    var r = pk.narrative.advance(S.ws, o || null, {});
    if (r && r.mo) { showMo(); return; }
    if (r && r.err === 'ink') {
      /* 批注花掉了墨又点了「改」：不翻章，提示后仍可选 0 墨保守项（任何数值下都有得选） */
      var hint = document.getElementById('bk-note-hint');
      if (hint) hint.textContent = tw('ui.book.noink', null);
      return;
    }
    var zs = (pk.data.ZONES || []);
    if (zs.length) S.ws.place = zs[S.ws.narrative.chapNo % zs.length].i;
    document.getElementById('bk-fork').classList.add('hide');
    showChapter();
  }

  /* ── 入口 / 关闭 ───────────────────────────────────────────────────────────── */
  function actPreview(c, worldId) {
    void c;
    var entry = SQ.Worlds[worldId];
    if (!entry || !entry.pack || !entry.pack.narrative || S.open) return;
    S.open = true; S.worldId = worldId; S.skip = false;
    S.ws = entry.pack.normalize(entry.pack.initialState());   /* normalize 即给 narrative.chapNo=1，章号以会话账为主 */
    build(worldId);
    showChapter();
  }
  function close() {
    Tclear();
    if (S.el && S.el.parentNode) S.el.parentNode.removeChild(S.el);
    S.open = false; S.el = null; S.ws = null; S.fork = null; S.timers = [];
  }

  SQ.UI.wuxia = { actPreview: actPreview, mountReal: mountReal, refreshReal: refreshReal };   /* D14 只认被引用的导出 */

  /* ══ 真档主界面（册163 · S3-c）：worldView==='book' 的世界进主界面即书 ══════════
   * 与「先睹」预览共用打字机的**形态**，但账全部走真档（SQ.mutate）：翻章 = advance 落档 ‖
   * 批注 = annotate 落档 ‖ 附录 = 功谱（修习槽 / 强行冲关）/ 舆图 / 人物。
   * 本节与预览节的叉状处理器**有意不共享**——两边生命周期不同（会话态 vs 落档），
   * 共用会把「预览不落档」的立身之本搅进真档路径。tick 每秒只刷状态行，不打扰打字机。 */
  var R = { on: false, timers: [], skip: false, wid: null };

  function RT(fn, ms) { var id = setTimeout(fn, ms); R.timers.push(id); return id; }
  function RTclear() { for (var i = 0; i < R.timers.length; i++) clearTimeout(R.timers[i]); R.timers = []; }

  /* 页脚状态行（叙事引擎 §一：数值只在此出现）：境界 · 功力/封顶 · 银两 · 侠名 · 墨 · 违和 */
  function fmtStones(n) {
    var v = Math.max(0, Math.round(n || 0));
    var liang = Math.floor(v / 1000), rem = v % 1000;
    var qian = Math.floor(rem / 100), wen = rem % 100;
    var out = [];
    if (liang) out.push(SQ.t('ui.book.liang', { n: liang }, null));
    if (qian) out.push(SQ.t('ui.book.qian', { n: qian }, null));
    if (wen || !out.length) out.push(SQ.t('ui.book.wen', { n: wen }, null));
    return out.join(' ');
  }
  function realStatus(ws) {
    var pk = SQ.Worlds[R.wid] && SQ.Worlds[R.wid].pack;
    var realmName = SQ.t('realm.' + (ws.realm || 0), null, R.wid);
    var nx = (pk.data.REALMS || []).filter(function (r) { return r.r === (ws.realm | 0) + 1; })[0];
    return SQ.t('ui.book.statusfmt', {
      realm: realmName,
      qi: Math.floor(ws.qi || 0),
      cap: nx ? nx.need : '—',
      stones: fmtStones(ws.stones),
      renown: (ws.renown >= 0 ? '+' : '') + (ws.renown || 0),
      ink: (ws.ink && ws.ink.n) || 0,
      discord: ws.discord || 0
    }, null);
  }
  function realDrawStatus(ws) {
    var st = document.getElementById('bkr-status');
    if (st) st.textContent = realStatus(ws);
  }

  function mountReal(c) {
    var host = document.getElementById('book-main');
    if (!host || !c.w || !c.p) return;
    RTclear();
    R.on = true; R.open = true; R.skip = false; R.wid = c.p.worldId;
    host.innerHTML =
      '<div class="bk-book bk-real">' +
      '  <div class="bk-head"><span id="bkr-chap"></span><span class="bk-hint" id="bkr-hint"></span></div>' +
      '  <div class="bk-paper" id="bkr-paper"></div>' +
      '  <div class="bk-fork hide" id="bkr-fork"></div>' +
      '  <div class="bk-notes hide" id="bkr-notes"></div>' +
      '  <div class="bk-drawer hide" id="bkr-drawerbox"></div>' +
      '  <div class="bk-foot"><span class="bk-status" id="bkr-status"></span><button class="btn ghost" id="bkr-drawer">' + esc(tw('ui.book.drawer', null)) + '</button></div>' +
      '</div>';
    var pr = c.s.profile || {};
    document.getElementById('bkr-hint').textContent = pr.hao ? tw('ui.book.hao', { name: pr.name, hao: pr.hao }) : (pr.name || '');
    document.getElementById('bkr-paper').onclick = function () { R.skip = true; };   /* 监听体一句（D15①） */
    document.getElementById('bkr-drawer').onclick = function () { realDrawer(c.fresh()); };   /* 监听体一句（D15①） */
    var dg = c.w.narrative && c.w.narrative.digest;
    if (dg && dg.lines && dg.lines.length) realDigest(c, dg);
    else realChapter(c);
  }

  /* 每秒 tick 的书侧入口：只刷状态行（打字机/分岔/批注一概不碰——机器不打断读书人） */
  function refreshReal(c) {
    if (!R.on || !c.w) return;
    realDrawStatus(c.w);
  }

  /* 回归呈报（册165 · 叙事引擎 §八）：离线提要逐行（章号@地界 id → 取词渲染），确定后清档开读 */
  function realDigest(c, dg) {
    var box = document.getElementById('bkr-fork');
    var rows = dg.lines.map(function (ln) {
      var parts = ln.split('@');
      var zn = parts[1] ? SQ.t('zone.' + parts[1] + '.name', null, R.wid) : '';
      if (zn.indexOf('zone.') === 0) zn = parts[1];
      return SQ.t('ui.book.chapter', { no: parseInt(parts[0], 10) || 0 }, null) + (zn ? ' · ' + zn : '');
    });
    box.innerHTML = '<div class="bk-mark">※</div><div class="bk-title">' + esc(tw('ui.book.digest.title', null)) + '</div>' +
      '<div class="bk-motext">' + rows.map(function (r) { return esc(r); }).join('<br>') +
      (dg.dropped > 0 ? '<br>' + esc(tw('ui.book.digest.dropped', { n: dg.dropped })) : '') + '</div>';
    var row = document.createElement('div');
    row.className = 'bk-opts';
    var b = document.createElement('button');
    b.className = 'btn bk-opt';
    b.textContent = tw('ui.book.digest.ok', null);
    b.onclick = function () { realDigestOk(c); };      /* 监听体一句（D15①） */
    row.appendChild(b);
    box.appendChild(row);
    box.classList.remove('hide');
  }
  function realDigestOk(c) {
    SQ.mutate(c.s, function (s) { s.worlds[R.wid].narrative.digest = null; });
    document.getElementById('bkr-fork').classList.add('hide');
    realChapter(c.fresh());
  }

  function realChapter(c) {
    R.skip = false;
    var ws = c.w, pk = c.p;
    var no = (ws.narrative && ws.narrative.chapNo) || 1;
    var arc = Math.floor((no - 1) / (pk.narrative.arcChaps || 20)) + 1;
    var ch = pk.narrative.chapter(ws, pk, {});
    var r = pk.narrative.render(ch, ws);
    document.getElementById('bkr-chap').textContent =
      SQ.t('ui.book.arkfmt', { arc: arc }, null) + ' · ' +
      SQ.t('ui.book.chapter', { no: no }, null) + ' · ' +
      SQ.t('zone.' + ws.place + '.name', null, R.wid);
    var paper = document.getElementById('bkr-paper');
    while (paper.firstChild) paper.removeChild(paper.firstChild);
    document.getElementById('bkr-fork').classList.add('hide');
    document.getElementById('bkr-drawerbox').classList.add('hide');
    realDrawStatus(ws);
    typeLines(R, RT, paper, r.lines, function () {
      realNotes(c);
      realFork(c, r.fork);
    });
  }

  /* 批注行（真档版）：chip 点击走 SQ.mutate → annotate 落档；无分岔时行尾给「翻页」
   * （章完结 = advance 落档——书模式没有 fork 也要能翻页，否则卡死在第一章）。 */
  function realNotes(c) {
    var box = document.getElementById('bkr-notes');
    if (!box) return;
    box.innerHTML = '<div class="bk-note-row"><span class="bk-note-label">' +
      esc(tw('ui.book.annotate', null)) + '</span></div>' +
      '<div class="bk-note-hint" id="bkr-note-hint"></div>';
    var row = box.firstChild;
    AXES.forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn ghost bk-opt bk-ax';
      b.dataset.axis = a.axis;
      b.dataset.d = String(a.d);
      b.textContent = SQ.t(a.key, null, null);
      b.onclick = function () { realAnnotate(c, b); };   /* 监听体一句（D15①） */
      row.appendChild(b);
    });
    var next = document.createElement('button');
    next.className = 'btn bk-opt';
    next.id = 'bkr-next';
    next.textContent = tw('ui.book.next', null);
    next.onclick = function () { realPick(c, null); };   /* 监听体一句（D15①） */
    row.appendChild(next);
    box.classList.remove('hide');
  }

  async function realAnnotate(c, btn) {
    var pk = SQ.Worlds[R.wid].pack;
    if (!pk.narrative.annotate) return;
    var res = null;
    await SQ.mutate(c.s, function (s) {
      res = pk.narrative.annotate(s.worlds[R.wid], { axis: btn.dataset.axis, d: parseInt(btn.dataset.d, 10) }, {});
    });
    var cf = c.fresh();
    var hint = document.getElementById('bkr-note-hint');
    if (res && res.err === 'ink') { if (hint) hint.textContent = tw('ui.book.noink', null); realDrawStatus(cf.w); return; }
    if (res && res.mo) { realMo(cf); return; }
    if (hint) hint.textContent = '';
    realDrawStatus(cf.w);
  }

  /* 分岔（真档版）：选支 = advance 落档；保守项 0 墨（主角自选） */
  function realFork(c, fork) {
    if (!fork) return;
    var box = document.getElementById('bkr-fork');
    box.innerHTML = '<div class="bk-mark">※</div><div class="bk-title">' +
      esc(SQ.t(fork.title, null, R.wid)) + '</div>';
    var row = document.createElement('div');
    row.className = 'bk-opts';
    for (var i = 0; i < fork.opts.length; i++) {
      (function (o) {
        var b = document.createElement('button');
        b.className = 'btn ghost bk-opt';
        b.textContent = o.ink > 0
          ? SQ.t('ui.book.optfmt', { label: SQ.t(o.label, null, R.wid), n: o.ink }, null)
          : SQ.t('ui.book.optfree', { label: SQ.t(o.label, null, R.wid) }, null);
        b.onclick = function () { realPick(c, o); };   /* 监听体一句（D15①） */
        row.appendChild(b);
      })(fork.opts[i]);
    }
    box.appendChild(row);
    var foot = document.createElement('div');
    foot.className = 'bk-next';
    foot.textContent = '';
    box.appendChild(foot);
    box.classList.remove('hide');
  }

  async function realPick(c, o) {
    var pk = SQ.Worlds[R.wid].pack;
    var res = null;
    await SQ.mutate(c.s, function (s) {
      res = pk.narrative.advance(s.worlds[R.wid], o || null, {});
    });
    var cf = c.fresh();
    if (res && res.mo) { realMo(cf); return; }
    if (res && res.err === 'ink') {
      var hint = document.getElementById('bkr-note-hint');
      if (hint) hint.textContent = tw('ui.book.noink', null);
      return;
    }
    var zs = (pk.data.ZONES || []);
    if (zs.length) {
      await SQ.mutate(c.s, function (s) {
        s.worlds[R.wid].place = zs[s.worlds[R.wid].narrative.chapNo % zs.length].i;
      });
      cf = c.fresh();
    }
    realChapter(cf);
  }

  /* 墨厄呈报（真档）：重罚已由 advance/annotate 落档——呈报后重读此卷 */
  function realMo(c) {
    var box = document.getElementById('bkr-fork');
    box.innerHTML = '<div class="bk-mark bk-mo">※</div><div class="bk-title">' +
      esc(tw('ui.book.mo.title', null)) + '</div><div class="bk-motext">' +
      esc(tw('ui.book.mo.text', null)) + '</div>';
    var row = document.createElement('div');
    row.className = 'bk-opts';
    var no = (c.w.narrative.chapNo || 1);
    var b = document.createElement('button');
    b.className = 'btn ghost bk-opt';
    b.textContent = tw('ui.book.chapter', { no: no });
    b.onclick = function () { realRemount(c); };      /* 监听体一句（D15①） */
    row.appendChild(b);
    box.appendChild(row);
    box.classList.remove('hide');
    var nb = document.getElementById('bkr-notes');
    if (nb) nb.classList.add('hide');
    realDrawStatus(c.w);
  }
  function realRemount(c) {
    document.getElementById('bkr-fork').classList.add('hide');
    realChapter(c.fresh());
  }

  /* ── 附录抽屉（真档）：功谱（修习槽 / 冲关）· 舆图 · 人物 ──────────────────────── */
  function realDrawer(c) {
    var box = document.getElementById('bkr-drawerbox');
    if (!box) return;
    if (!box.classList.contains('hide')) { box.classList.add('hide'); return; }   /* 开合切换 */
    var ws = c.w, pk = c.p, D = pk.data;
    var h = '';
    /* 功谱 */
    h += '<h4>' + esc(tw('ui.book.gong', null)) + '</h4><div class="bk-row">';
    var lv = ws.artsLevels || {};
    for (var aid in lv) {
      var aname = SQ.t('arts.' + aid + '.name', null, R.wid);
      if (aname.indexOf('arts.') === 0) aname = aid;
      var inSlot = (ws.artsSlots || []).indexOf(aid) >= 0;
      var prac = Math.min(99, Math.round((ws.artsPractice || {})[aid] || 0));
      h += '<span class="bk-cell">' + esc(SQ.t('ui.book.layer', { name: aname, lv: lv[aid] }, null)) +
        ' · ' + esc(SQ.t('ui.book.pracfull', { p: prac }, null)) + '</span>' +
        '<button class="btn ghost bk-opt" data-aid="' + aid + '">' +
        esc(tw(inSlot ? 'ui.book.stop' : 'ui.book.tostudy', null)) + '</button>';
    }
    h += '</div>';
    /* 冲关行：功力到门槛且心境未过时附录手动点（数值与经济 §四） */
    var r0 = ws.realm | 0;
    var nx = (D.REALMS || []).filter(function (x) { return x.r === r0 + 1; })[0];
    if (nx && (ws.qi || 0) >= nx.need) {
      var canB = pk.canBreak(ws);
      if (!canB) {
        h += '<div class="bk-row" style="margin-top:8px"><button class="btn bk-opt" id="bkr-break">' +
          esc(tw('ui.book.breaktry', { p: '…' })) + '</button></div>';
      }
    }
    /* 舆图 */
    h += '<h4>' + esc(tw('ui.book.map', null)) + '</h4><div class="bk-row">';
    (D.ZONES || []).forEach(function (z) {
      var seen = (ws.visited || []).indexOf(z.i) >= 0;
      h += '<span class="bk-cell">' + (seen ? '<b>✓</b> ' : '') +
        esc(SQ.t('zone.' + z.i + '.name', null, R.wid)) + '</span>';
    });
    h += '</div>';
    /* 人物 */
    h += '<h4>' + esc(tw('ui.book.people', null)) + '</h4><div class="bk-row">';
    var rel = ws.relations || {};
    var relKeys = Object.keys(rel);
    if (!relKeys.length) {
      h += '<span class="bk-cell">' + esc(tw('ui.book.norelation', null)) + '</span>';
    } else {
      relKeys.forEach(function (nid) {
        var nm = SQ.t('cast.' + nid + '.name', null, R.wid);
        if (nm.indexOf('cast.') === 0) nm = nid;
        h += '<span class="bk-cell">' + esc(nm) + ' · ' + (rel[nid].kind || '') + ' ' + (rel[nid].affinity || 0) + '</span>';
      });
    }
    h += '</div>';
    box.innerHTML = h;
    /* 功谱钮：修习槽开合（≤6 槽；mutate 事务） */
    Array.prototype.forEach.call(box.querySelectorAll('button[data-aid]'), function (b) {
      b.onclick = function () { realToggleSlot(c, b.dataset.aid); };   /* 监听体一句（D15①） */
    });
    var bb = document.getElementById('bkr-break');
    if (bb) bb.onclick = function () { realBreak(c); };   /* 监听体一句（D15①） */
    box.classList.remove('hide');
  }

  async function realToggleSlot(c, aid) {
    await SQ.mutate(c.s, function (s) {
      var w = s.worlds[R.wid];
      var slots = w.artsSlots || [];
      var at = slots.indexOf(aid);
      if (at >= 0) slots.splice(at, 1);
      else if (slots.length < 6) slots.push(aid);
      w.artsSlots = slots;
    });
    realDrawer(c.fresh());
  }

  async function realBreak(c) {
    var pk = SQ.Worlds[R.wid].pack;
    var res = null;
    await SQ.mutate(c.s, function (s) {
      res = pk.attemptBreak(s.worlds[R.wid]);
    });
    var cf = c.fresh();
    var box = document.getElementById('bkr-drawerbox');
    var note = document.createElement('div');
    note.className = 'bk-note-hint';
    note.textContent = res && res.win ? tw('ui.book.breakwin', null) : (res && res.ok ? tw('ui.book.breakfail', null) : tw('ui.book.breakno', null));
    box.appendChild(note);
    realDrawStatus(cf.w);
  }
})();
