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
      '  <div class="bk-foot"><button class="btn ghost" id="bk-close">' + esc(tw('ui.book.close', null)) + '</button></div>' +
      '</div>';
    document.body.appendChild(root);
    S.el = root;
    document.getElementById('bk-close').onclick = function () { close(); };           /* 监听体一句（D15①） */
    document.getElementById('bk-paper').onclick = function () { S.skip = true; };     /* 监听体一句（D15①） */
    return root;
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
    S.ws.narrative = { chapNo: S.chapNo, beatNo: 0 };
    var ch = pk.narrative.chapter(S.ws, pk, {});
    var r = pk.narrative.render(ch, S.ws);
    S.fork = r.fork;
    document.getElementById('bk-chap').textContent = SQ.t('ui.book.chapter', { no: S.chapNo }, null) + ' · ' +
      SQ.t('zone.' + S.ws.place + '.name', null, S.worldId);
    var paper = document.getElementById('bk-paper');
    while (paper.firstChild) paper.removeChild(paper.firstChild);   /* 清章（append-only 指打字过程；换章清屏是翻页） */
    document.getElementById('bk-fork').classList.add('hide');
    typeLines(paper, r.lines, showFork);
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
        b.textContent = SQ.t('ui.book.optfmt', { label: SQ.t(o.label, null, S.worldId), n: o.ink }, null);
        b.onclick = function () { pick(); };         /* 监听体一句（D15①） */
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
  /* 预览里点分支：只推进**预览会话**（章号 +1、换一个地界的味道），不落档 */
  function pick() {
    S.chapNo++;
    var zs = (SQ.Worlds[S.worldId].pack.data.ZONES || []);
    if (zs.length) S.ws.place = zs[S.chapNo % zs.length].i;
    document.getElementById('bk-fork').classList.add('hide');
    showChapter();
  }

  /* ── 入口 / 关闭 ───────────────────────────────────────────────────────────── */
  function actPreview(c, worldId) {
    void c;
    var entry = SQ.Worlds[worldId];
    if (!entry || !entry.pack || !entry.pack.narrative || S.open) return;
    S.open = true; S.worldId = worldId; S.chapNo = 1; S.skip = false;
    S.ws = entry.pack.normalize(entry.pack.initialState());
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
