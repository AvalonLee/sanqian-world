/* sheet.js — qxm 纸面弹窗壳公共件（册293 抽取）
 *
 * 立因：panels.js 的 openSheet/shell 是私有内部函数未导出（册292 settings 首跑实测红因），
 * settings.js 当时自绘了一份 qxm-sheet 同构壳；册293 邸报合集是第二个消费者 ⇒ 抽成本件，
 * settings.js 同批改挂（回归面由 Q3D13 两判守着）。HTML 结构逐字保持 panels.shell 同构
 * （qxm-sheet / qxm-head / qxm-tag / qxm-title / qxm-close / qxm-body），关闭走已导出的
 * panels.closeModal 保队列语义；单实例独占（modal 在场时拒绝打开，返回 false）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  var document = root.document;

  function panelsOf() {
    return (root.QX3D && root.QX3D.ui && root.QX3D.ui.panels) || null;
  }

  /* 打开一张 qxm-sheet；返回 modal 元素（可继续 querySelector 绑控件），独占失败返回 false */
  function openSheet(tag, title, bodyHtml) {
    var panels = panelsOf();
    if (!panels || !document) return false;
    var m = document.getElementById('qx-modal');
    if (!m || !m.classList.contains('hidden')) return false;

    m.innerHTML =
      '<div class="qxm-sheet">' +
      '<div class="qxm-head"><span class="qxm-tag">' + tag + '</span><b class="qxm-title">' + title + '</b>' +
      '<button class="qxm-close" data-qxm-close>✕</button></div>' +
      '<div class="qxm-body">' + bodyHtml + '</div>' +
      '</div>';
    m.querySelector('[data-qxm-close]').addEventListener('click', function () { panels.closeModal(); });
    m.classList.remove('hidden');
    return m;
  }

  var api = { openSheet: openSheet };
  if (typeof root.QX3D === 'undefined') root.QX3D = {};
  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.sheet = api;
  return api;
});
