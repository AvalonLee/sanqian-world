/* ui/lazy.js — 按需装载器（册320 · 容量复核批）
 *
 * 立因：载入面（index.html 挂载的 script 字节和）在 P4 五站（册300~318）之后到 **1,443.7KB**，
 * 已越过册278 校准的「~1.3MB 终态」。第一批把**点了才会用到**的五件从首屏摘掉，改由本件注入：
 *   · ui/creation.js      创角向导（只有创角态需要）        10.1KB
 *   · ui/drawer.js        五抽屉（只有点「行囊」需要）      10.5KB
 *   · ui/settings.js      设置中心（只有点 ⚙️ 需要）          6.7KB
 *   · ui/gazette.js       邸报合集（只有点 📰 需要）          2.9KB
 *   · ui/endings-ui.js    终局面板（到旬数才点 🏆）           4.1KB
 * 合计 **34.3KB**（载入面 1,443.7 → 1,409.4KB）。
 *
 * 纪律（写在这里供下任判断该不该继续扩）：
 *   ① 只动「首屏不需要」的件。**热路径不动**——`systems/combat` / `ui/duel` / `systems/side` /
 *      `systems/tiles` 各自在十几个动作回调里被同步调用，异步化等于改对决与在场契约，收益不抵风险；
 *   ② 同 URL 只注入一次（in-flight 去重 + loaded 标记 + failed 不重试）：失败只 toast，宁可这次
 *      打不开，也不要半初始化出一个白弹窗；
 *   ③ 追加时 `async=false`：同批多件按序执行。这些件顶层有 `const`/`var`，跨件顺序错会 ReferenceError；
 *   ④ 只挂 `document.head`，不碰其它 script（首屏那批仍由 index.html 静态声明，便于读）。
 * 走查：Q3D24a~d（首屏不含五件 → 点 ⚙️/📰/抽屉后对应 script 才进 DOM 且面板照常开）。
 */
(function (root) {
  'use strict';
  var doc = root.document;
  var state = {};    /* url → 'loading' | 'loaded' | 'failed' */
  var waiters = {};  /* url → [settle] */

  function toast(msg) {
    try {
      if (root.QX3D_APP && root.QX3D_APP.env) root.QX3D_APP.env().showToast(msg, 'amber');
    } catch (e) {}
  }

  /* ensure(urls, cb)：全部就绪后回调一次；有任一件失败则不回调（只提示） */
  function ensure(urls, cb) {
    var list = (urls || []).slice();
    var left = list.length;
    var broken = null;
    if (!left) { if (cb) cb(); return; }

    function settle() {
      if (--left > 0) return;
      if (broken) { toast('这一页没载上（' + broken + '）。'); return; }
      if (cb) cb();
    }

    list.forEach(function (u) {
      if (state[u] === 'loaded') { settle(); return; }
      if (state[u] === 'loading') { (waiters[u] = waiters[u] || []).push(settle); return; }
      state[u] = 'loading';
      var s = doc.createElement('script');
      s.src = u;
      s.async = false;
      s.onload = function () {
        state[u] = 'loaded';
        var w = waiters[u] || [];
        delete waiters[u];
        w.forEach(function (f) { f(); });
        settle();
      };
      s.onerror = function () {
        state[u] = 'failed';
        broken = u;
        var w = waiters[u] || [];
        delete waiters[u];
        w.forEach(function (f) { f(); });
        settle();
      };
      doc.head.appendChild(s);
    });
  }

  function loaded(url) { return state[url] === 'loaded'; }

  var api = { ensure: ensure, loaded: loaded, _state: function () { return state; } };
  if (typeof root.QX3D === 'undefined') root.QX3D = {};
  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.lazy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
