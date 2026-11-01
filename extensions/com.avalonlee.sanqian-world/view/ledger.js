/* 财柱总账浮层渲染器（第册一百三十五批 2026-10-22 · 自 view/index.html 内联块整段搬出 · N82/A2）
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账，不许自取内核私有量）。
 * ⚠️ 本件的回调参数一律不可叫 `c`：原代码里 `cats.map(function (c) …` 会把桥挡住——
 *    这类「搬家后变量名撞车」静态判据照不到，只有渲染结果会说话（走查）。
 * 依赖：`SQ.Ledger`（引擎，assets 段先于本件加载）‖ 桥键 `w` / `t` / `esc` / `$`（D7 在册）。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 印章档界（原内联常量；UI §3.3 v2.5：主线六福地总投入 552 万 / ×10） */
  var LEDGER_SEAL_2 = 5520000, LEDGER_SEAL_3 = 55200000;

  /* 收支八行条形（区内归一）+ 占比 + 字段小注 —— cx = 桥快照 */
  function ledgerRows(cx, dir, cats, max) {
    var w = cx.w, l = w.ledger || { in: {}, out: {} };
    return cats.map(function (cat) {
      var v = (l[dir] && l[dir][cat]) || 0;
      var pctv = max > 0 ? (v / max) * 100 : 0;
      return '<div class="lgrow ' + (dir === 'in' ? 'in' : 'out') + '">' +
        '<div class="lgl"><span class="nm">' + cx.esc(cx.t('ledger.cat.' + cat)) + '</span>' +
        '<span class="vl">' + SQ.fmt(v) + (v > 0 ? ' · ' + cx.esc(cx.t('ledger.share', { p: Math.round(pctv) })) : '') + '</span></div>' +
        '<div class="lgb"><i style="width:' + pctv.toFixed(1) + '%"></i></div>' +
        '<div class="lgn">' + cx.esc(cx.t('ledger.field', { dir: cx.t('ledger.dir.' + dir), cat: cx.t('ledger.cat.' + cat) })) + '</div></div>';
    }).join('');
  }

  /* 财柱总账：恒等式置顶 + 收支八行 + 印章分档 */
  function renderLedger(c) {
    var w = c.w, s = SQ.Ledger.sums(w);
    c.$('mlg-title').textContent = c.t('ledger.title');
    c.$('mlg-ident').textContent = c.t('ledger.ident', {
      start: SQ.Ledger.START_STONES, inn: SQ.fmt(s.inn), out: SQ.fmt(s.out), now: SQ.fmt(w.stones)
    });
    c.$('mlg-identnote').textContent = c.t('ledger.identnote');
    c.$('mlg-intitle').textContent = c.t('ledger.in.title');
    c.$('mlg-outtitle').textContent = c.t('ledger.out.title');
    var inMax = Math.max.apply(null, SQ.Ledger.IN_CATS.map(function (x) { return (w.ledger.in[x] || 0); }).concat([1]));
    var outMax = Math.max.apply(null, SQ.Ledger.OUT_CATS.map(function (x) { return (w.ledger.out[x] || 0); }).concat([1]));
    c.$('mlg-in').innerHTML = ledgerRows(c, 'in', SQ.Ledger.IN_CATS, inMax);
    c.$('mlg-out').innerHTML = ledgerRows(c, 'out', SQ.Ledger.OUT_CATS, outMax);
    var tier = s.inn >= LEDGER_SEAL_3 ? 3 : (s.inn >= LEDGER_SEAL_2 ? 2 : 1);
    /* 印章分档：初档「白手起家」文案不再展示，仅中/高两档留存里程碑印记 */
    c.$('mlg-seal').textContent = tier >= 2 ? c.t('ledger.epitaph.' + tier) : '';
    var empty = s.inn === 0 && s.out === 0;
    c.$('mlg-empty').textContent = empty ? c.t('ledger.empty') : '';
    c.$('mlg-empty').classList.toggle('hide', !empty);
    c.$('mlg-close').textContent = c.t('ui.close');
  }

  function openLedger(c) { renderLedger(c); c.$('modal-ledger').classList.remove('hide'); }

  SQ.UI = SQ.UI || {};
  /* 只导出**被外部引用**的那一枚（审计 D14：导出面 ⇔ 引用面双向对表，多导一枚即判「死面」）——
   * `renderLedger` 由件内 `openLedger` 自用，不外露。 */
  SQ.UI.ledger = { openLedger: openLedger };
})();
