/* gazette.js — qunxia3d 江湖邸报合集（册293 · M6 余量「邸报合集」）
 *
 * 立因：st.canonEventReports 有三个真实写入口却无翻阅面——
 *   ① core/time.js handleExpiredCanonEvent（错过 ⇒ participated:false + 原著走向 summary）
 *   ② systems/combat.js 终局胜（亲历 alt ⇒ participated:true + 改写结局 summary）
 *   ③ systems/combat.js 终局败（亲历 lose ⇒ participated:true + 力战不敌 summary）
 * 条目只沉在存档数组与一条日志流里，玩家没有「回看这桩大事走到哪了」的入口。
 * 本件 = 合集浮层：倒序（新在上）+ 亲历/错过徽记 + 则数标签；空态句不做假数据。
 *
 * 口径：只读 st.canonEventReports 原样呈现，不做任何写回（合集是看板不是账房）；
 * 壳走 ui/sheet.js 公共件（册293 抽取，panels 私有函数不再复刻）；st 由 app.js 传参
 * （外置件取数一律走内核/引擎现值，不直读全局）。title/summary 过 escapeHtml 后上屏。
 *
 * 走查：verify-ui-qunxia3d Q3D14a/14b（合集开 + 徽记两态 + 倒序 + 则数标签）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  var document = root.document;

  function sheetOf() {
    return (root.QX3D && root.QX3D.ui && root.QX3D.ui.sheet) || null;
  }
  function panelsOf() {
    return (root.QX3D && root.QX3D.ui && root.QX3D.ui.panels) || null;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function open(st) {
    var sheet = sheetOf();
    var panels = panelsOf();
    if (!sheet || !panels || !document) return false;

    var reports = (st && Array.isArray(st.canonEventReports)) ? st.canonEventReports : [];
    var item = function (r) {
      var mine = !!r.participated;
      return '<div class="qxm-gaz-item' + (mine ? ' mine' : '') + '">' +
        '<div class="qxm-gaz-head"><b>' + escapeHtml(r.title) + '</b>' +
        '<span class="qxm-gaz-badge">' + (mine ? '亲历' : '错过') + '</span></div>' +
        '<div class="qxm-gaz-sum">' + escapeHtml(r.summary) + '</div></div>';
    };
    var body = '<div class="qxm-gaz">' +
      (reports.length
        ? reports.slice().reverse().map(item).join('')
        : '<div class="qxm-gaz-empty">江湖暂安，尚无邸报——大事错过或亲历之后，自有邸报传抄四方。</div>') +
      '</div>';

    return sheet.openSheet('江湖邸报', '合集 · ' + reports.length + ' 则', body);
  }

  var api = { open: open };
  if (typeof root.QX3D === 'undefined') root.QX3D = {};
  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.gazette = api;
  return api;
});
