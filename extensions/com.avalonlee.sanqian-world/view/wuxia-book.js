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

  /* ── 浮层骨架（一次性 innerHTML；此后正文区只 appendChild）────────────────── */
  function build(worldId) {
    var wname = SQ.t('world.' + worldId + '.name', null, worldId);
    var root = document.createElement('div');
    root.className = 'bkwrap';
    root.id = 'bk-wrap';
    root.innerHTML =
      '<div class="bk-book">' +
      '  <div class="bk-head"><span id="bk-chap"></span><span class="bk-hint">' + esc(SQ.t('ui.book.hint', { name: wname }, null)) + '</span></div>' +
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

  /* ── 打字机（append-only；点纸面跳过）──────────────────────────────────────── */
  function typeLines(paper, lines, onDone) {
    var li = 0;
    function flushRest() {
      while (li < lines.length) {
        var p = document.createElement('p');
        p.className = 'bk-line';
        p.textContent = lines[li++];
        paper.appendChild(p);
      }
      S.typing = false;
      onDone();
    }
    function typeOne() {
      if (!S.open) return;                           /* 浮层已关：定时器自然死 */
      if (S.skip) { flushRest(); return; }
      var text = lines[li];
      var cur = document.createElement('p');
      cur.className = 'bk-line';
      paper.appendChild(cur);
      var ci = 0;
      var tick = function () {
        if (!S.open) return;
        if (S.skip) { cur.textContent = text; li++; flushRest(); return; }
        ci += 2;                                     /* 一次两字：手感与可跳过之间取中 */
        cur.textContent = text.slice(0, ci);
        if (ci < text.length) T(tick, 28);
        else { li++; if (S.skip) { flushRest(); return; } if (li < lines.length) T(typeOne, 240); else { S.typing = false; onDone(); } }
      };
      T(tick, 60);
    }
    if (!lines.length) { onDone(); return; }
    S.typing = true;
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
    typeLines(paper, r.lines, function () { renderNotes(); showFork(); });
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

  SQ.UI.wuxia = { actPreview: actPreview };   /* close 是件内私有（合上走浮层内按钮）；D14 只认被引用的导出 */
})();
