/* core/data.js — 数据访问器（core 层统一取数口）
 * 浏览器：11 张 data/*.js 经 classic script 顶层 const/let 全局词法绑定 + 各文件导出垫片
 *   汇入 window.QX3D_DATA；本件直接引用。
 * node（table-check / 未来 duel-sim）：逐件 require 合并为同一平面。
 * core/systems 禁碰 DOM/THREE（计划书铁律 1）——本件是 core 唯一允许的「数据源入口」。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.core = root.QX3D.core || {}; root.QX3D.core.data = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D;
  if (typeof module !== 'undefined' && module.exports) {
    var r = function (f) { return require('../data/' + f); };
    D = Object.assign({},
      r('martial.js'), r('sects.js'), r('items.js'), r('masters.js'), r('masters-stories.js'), r('origins.js'),
      r('encounters.js'), r('world-events.js'), r('canon.js'), r('regions.js'),
      r('scrolls.js'), r('state-init.js'), r('combo.js'), r('endings.js'), r('street.js'), r('court.js'),
      r('side-cast.js'), r('romance.js'));
  } else {
    D = root.QX3D_DATA || {};
  }

  /* canon.js 数据表内的 onCanonExpire 闭包逐字引用全局 `state`（槽位见 data/canon.js
   * 头注）——每次当前 st 换代（载档/创角）由 state 层调本函数回填。 */
  function bindRuntimeState(st) {
    if (typeof D.setRuntimeState === 'function') D.setRuntimeState(st);
    if (typeof module === 'undefined' || !module.exports) {
      /* 浏览器侧：canon.js 的 `var state` 即 window.state，垫片函数写的就是它 */
    }
  }

  return { D: D, bindRuntimeState: bindRuntimeState };
});
