/* qunxia-home.js — 武侠世界主壳（山河棋盘 · 自包含子应用）
 * 真实宿主的扩展页面 CSP 是 frame-src 'none'，不能嵌 iframe。主壳只做两件事：
 * 把内容桥 payload 写进同源 localStorage，再把当前视图导航到游戏页；
 * 游戏侧 content-merge.js 在 load 时自读 payload。
 * 双路由（册272 · 三维棋盘原型入库）：classic = games/qunxia/game.html（现行版），
 * 3d = games/qunxia3d/index.html（三维水墨原型，游戏化改造中——总纲见其目录内
 * 《游戏化改造计划书.md》）。开关：URL 带 ?engine=3d / ?engine=classic 时持久化到
 * localStorage 'qunxia3d-engine'，否则按已存值；缺省 3d（册282 M7 翻转）。最终形态（用户拍板）=
 * 扩展启动层出世界选择器（修仙=原路径 / 武侠=本路由），3d 版成熟后替换 classic。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.UI = SQ.UI || {};
  var PAYLOAD_KEY = 'qunxia-payload-v1';
  var RESULT_KEY = 'qunxia-result-queue-v1';
  var GAME_PAGE = 'games/qunxia/game.html';
  var GAME_PAGE_3D = 'games/qunxia3d/index.html';
  var ENGINE_KEY = 'qunxia3d-engine';

  function pickEngine() {
    try {
      var p = new URLSearchParams(location.search);
      var q = p.get('engine');
      if (q === '3d' || q === 'classic') { localStorage.setItem(ENGINE_KEY, q === '3d' ? '1' : '0'); return q; }
      return localStorage.getItem(ENGINE_KEY) === '0' ? 'classic' : '3d'; /* M7：缺省翻转 → 3d */
    } catch (e) { return 'classic'; }
  }

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
        lose: label(cf, 'we.' + e.i + '.fate.lose'),
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
    /* 场面执行器数据（册267 · 世界事件卷 §一 WE.knot）：36 案各带 KNOTS 当场戏——入局人物名
     * （词表取值）与开放分支标签（词表取值），供棋盘赴会传闻与战报上屏「当场那段戏」。 */
    var KNOTS = D.KNOTS || [];   /* cf.d = data.js 全表（与上方 ARTS 同源） */
    var knots = {};
    ((cf.p && cf.p.WORLD_EVENTS) || []).forEach(function (e) {
      if (!e.knot) return;
      var kn = null;
      for (var k = 0; k < KNOTS.length; k++) if (KNOTS[k].i === e.knot) { kn = KNOTS[k]; break; }
      if (!kn) return;
      var opts = (kn.br || []).map(function (b) {
        return { k: b.k, label: label(cf, b.label) || '', req: b.req || null };
      }).filter(function (b) { return b.label; });
      var cnames = (kn.cast || []).map(function (cid) { return label(cf, 'cast.' + cid + '.name') || ''; })
        .filter(function (n) { return n; });
      knots[e.i] = { knot: kn.i, cast: cnames, opts: opts };
    });
    /* 跨世棋盘重开（册271）：payload 带世界世代 = 转世次数（meta.stats.lives，初始 0）。
     * 转世时扩展侧 wefate/wecyc 已清（rebirthCarry），游戏侧比对 gen 检出变大即整局清档回创角。 */
    var gen = (cf.s && cf.s.meta && cf.s.meta.stats && typeof cf.s.meta.stats.lives === 'number') ? cf.s.meta.stats.lives : 0;
    return { gen: gen, arts: arts, sects: sects, cast: cast, events: events, blades: blades, manuals: manuals, knots: knots };
  }

  /* 棋盘结果回流（册259 立 · 册271 扩）：游戏侧只写本地队列，主壳回程时走 SQ.mutate 单写，
   * 避开宿主 storage_set 的整文件竞态。终局 = 胜（alt）/ 错过（echo）/ 败（lose，册271 起败局即终局）。
   * 【单轨（册266）后世界钟不再扫 echo——applyResults 应用在 claim 之后不会再被抢先；此条竞态已根治。 */
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
      var page = pickEngine() === '3d' ? GAME_PAGE_3D : GAME_PAGE;
      if (location.pathname.indexOf(page) < 0) location.replace(page);
    }
    if (applied && applied.then) applied.then(go, go); else go();
  }

  /* 游戏自己按回合重绘，宿主 tick 不碰游戏页面 */
  function refresh(cf) {}

  SQ.UI.qunxiaHome = { mount: mount, refresh: refresh };
})();
