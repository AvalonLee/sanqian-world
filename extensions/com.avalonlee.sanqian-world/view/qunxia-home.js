/* qunxia-home.js — 武侠世界主壳（山河棋盘 · 自包含子应用）
 * 宿主只负责全屏挂载、生命周期与内容桥；正文、样式、存档都在 games/qunxia/ 内自成一体。
 * 内容桥：从 ctx().d（世界包数据）+ 当前世界词表拼出 {arts, sects, cast}，iframe load 后注入。
 * 游戏侧 QUNXIA_MERGE 只增不覆盖；名称/正文由子应用自己渲染。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.UI = SQ.UI || {};
  var frame = null;
  var payload = null;

  /* 缺键时 SQ.t 会回显键名，这里按「回显 === 键」判空 */
  function label(cf, key) {
    try {
      var v = cf.t(key, null);
      return v && v !== key ? v : '';
    } catch (e) { return ''; }
  }

  function buildPayload(cf) {
    var D = cf.d || {};
    var arts = (D.ARTS || []).map(function (a) {
      var name = label(cf, 'art.' + a.i + '.name');
      return name ? { id: a.i, name: name, k: a.k, nat: a.nat, t: a.t, f: a.f || 0, s: a.s || [] } : null;
    }).filter(Boolean);
    var sects = (D.SECTS || []).map(function (s) {
      var name = label(cf, 'sect.' + s.id + '.name');
      return name ? { id: s.id, name: name, camp: s.camp, launch: !!s.launch } : null;
    }).filter(Boolean);
    var cast = (D.CAST || []).map(function (p) {
      var name = label(cf, 'cast.' + p.i + '.name');
      if (!name) return null;
      var bio = label(cf, 'cast.' + p.i + '.bio');
      return { id: p.i, name: name, t: p.t, sec: p.sec || '', role: p.role || '', align: p.align || '', bio: bio };
    }).filter(Boolean);
    var events = ((cf.p && cf.p.WORLD_EVENTS) || []).map(function (e) {
      var name = label(cf, 'we.' + e.i + '.name');
      if (!name) return null;
      return {
        id: e.i, name: name,
        desc: label(cf, 'we.' + e.i + '.desc'),
        rumor: label(cf, 'we.' + e.i + '.rumor'),
        canon: label(cf, 'we.' + e.i + '.fate.canon'),
        boss: e.boss || '', z: e.z || '',
        reward: e.reward || null
      };
    }).filter(Boolean);
    return { arts: arts, sects: sects, cast: cast, events: events };
  }

  function inject() {
    if (!frame || !payload) return;
    try {
      /* postMessage 不走同源直读：file:// 预览与 http 宿主同一路径 */
      frame.contentWindow.postMessage({ __qunxia: 1, payload: payload }, '*');
    } catch (e) {}
  }

  function mount(cf) {
    var host = document.getElementById('shell-main');
    if (!host) return;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'qunxia-frame';
      frame.src = 'games/qunxia/game.html';
      frame.setAttribute('title', 'jianghu board');
      frame.style.cssText = 'flex:1;width:100%;height:100%;border:0;display:block;background:#171310';
      frame.addEventListener('load', inject);
    }
    if (frame.parentNode !== host) host.appendChild(frame);
    payload = buildPayload(cf);
    inject();
  }

  /* 游戏自己按回合重绘，宿主 tick 不碰 iframe 内容 */
  function refresh(cf) {}

  SQ.UI.qunxiaHome = { mount: mount, refresh: refresh };
})();
