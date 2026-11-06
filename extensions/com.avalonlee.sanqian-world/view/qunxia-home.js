/* qunxia-home.js — 武侠世界主壳（山河棋盘 · 自包含子应用）
 * 真实宿主的扩展页面 CSP 是 frame-src 'none'，不能嵌 iframe。主壳只做两件事：
 * 把内容桥 payload 写进同源 localStorage，再把当前视图导航到 games/qunxia/game.html；
 * 游戏侧 content-merge.js 在 load 时自读 payload。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.UI = SQ.UI || {};
  var PAYLOAD_KEY = 'qunxia-payload-v1';
  var RESULT_KEY = 'qunxia-result-queue-v1';
  var GAME_PAGE = 'games/qunxia/game.html';

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
        reward: e.reward || null,
        fail: (cf.p && cf.p.FAIL && cf.p.FAIL[e.i]) || null
      };
    }).filter(Boolean);
    var blades = (D.WEAPONS || []).map(function (w) {
      var name = label(cf, 'wp.' + w.i + '.name');
      return name ? { id: w.i, name: name, k: w.k } : null;
    }).filter(Boolean);
    var manuals = (D.MANUALS || []).map(function (m) {
      var name = label(cf, 'manual.' + m.i + '.name');
      return name ? { id: m.i, name: name, art: m.art || '' } : null;
    }).filter(Boolean);
    return { arts: arts, sects: sects, cast: cast, events: events, blades: blades, manuals: manuals };
  }

  /* 棋盘结果回流（册259）：游戏侧只写本地队列，主壳回程时走 SQ.mutate 单写，
   * 避开宿主 storage_set 的整文件竞态。终局只有胜（alt）/ 错过（echo），败局可重试不回流。
   * shortcut: 应用在 boot 的 claim 之后——若世界钟已先把该案扫成 echo，胜局会被拒；世界日比棋盘旬快时再前移。 */
  function applyResults(cf) {
    var q = [];
    try { q = JSON.parse(localStorage.getItem(RESULT_KEY) || '[]'); } catch (e) { q = []; }
    if (!Array.isArray(q) || !q.length || !cf || !cf.p || !cf.p.applyResult || !SQ.mutate) return null;
    return SQ.mutate(cf.s, function (s) {
      var w = s.worlds && s.worlds.wuxia;
      if (!w) return;
      for (var i = 0; i < q.length; i++) {
        if (q[i] && typeof q[i].id === 'string') cf.p.applyResult(w, q[i].id, q[i].outcome);
      }
    }).then(function () {
      try { localStorage.removeItem(RESULT_KEY); } catch (e) {}
    }, function () {});
  }

  function mount(cf) {
    var applied = applyResults(cf);
    function go() {
      try {
        localStorage.setItem(PAYLOAD_KEY, JSON.stringify(buildPayload(cf)));
      } catch (e) {}
      if (location.pathname.indexOf(GAME_PAGE) < 0) location.replace(GAME_PAGE);
    }
    if (applied && applied.then) applied.then(go, go); else go();
  }

  /* 游戏自己按回合重绘，宿主 tick 不碰游戏页面 */
  function refresh(cf) {}

  SQ.UI.qunxiaHome = { mount: mount, refresh: refresh };
})();
