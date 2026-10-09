/* systems/ledger.js — 财柱「此生总账」流水记账（G13 批 2 · 引擎卷 §4.1）
 * 契约：
 *  - 只登记**灵石**流水（修为流量另有 ws.total）；分类粒度到系统级，不做逐笔明细（存档 <50KB 纪律）；
 *  - 累计值**只增不清、跨渡劫不清零**（与 karmaEventScore 同纪律）；
 *  - 分类必须映射真实机制（v1.2 清理掉 in.sell / out.refine_loss 两个占位空类）：
 *      in : kill 击杀 / event 奇遇 / refine 炼化返还 / offline 闭关
 *      out: cave 洞府入驻（含附属设施营建）/ arts 功法升级 / shop 坊市购入（含门中供给灵石价）/ event_loss 奇遇倒赔 / donate 供奉（势力捐献与 gather 委托上缴，势力深化批 v1.23）
 *  - 恒等式（UI 总账浮层置顶 · 冒烟 #113）：
 *      100（新手启动资金）+ Σin − Σout === ws.stones
 * 唯一写入通道：SQ.Ledger.note()——各系统禁止直接改 ws.ledger，防止漏记造成恒等式漂移。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var IN_CATS = ['kill', 'event', 'refine', 'offline', 'tribute'];
  var OUT_CATS = ['cave', 'arts', 'shop', 'event_loss', 'donate'];

  function blank() {
    var o = { in: {}, out: {} };
    IN_CATS.forEach(function (k) { o.in[k] = 0; });
    OUT_CATS.forEach(function (k) { o.out[k] = 0; });
    return o;
  }

  SQ.Ledger = {
    IN_CATS: IN_CATS,
    OUT_CATS: OUT_CATS,
    START_STONES: 100,          /* 与工程规范 §3.2 worlds.{id}.stones 缺省同源 */

    blank: blank,

    /* 缺字段补齐（normalize 用）：只补缺、不重置既有累计值 */
    normalize: function (raw) {
      var d = blank();
      if (!raw || typeof raw !== 'object') return d;
      var src = raw;
      ['in', 'out'].forEach(function (dir) {
        var s = (src[dir] && typeof src[dir] === 'object') ? src[dir] : {};
        var cats = dir === 'in' ? IN_CATS : OUT_CATS;
        cats.forEach(function (k) {
          var v = s[k];
          d[dir][k] = (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;
        });
      });
      return d;
    },

    /* 记一笔（dir='in'|'out'，cat 必须在白名单内；n 取绝对值，方向由 dir 决定）。
     * 返回实际入账额；非法分类静默拒绝并返 0（防占位空类复活）。 */
    note: function (ws, dir, cat, n) {
      if (!ws) return 0;
      var v = Math.abs(typeof n === 'number' && isFinite(n) ? n : 0);
      if (!v) return 0;
      var cats = dir === 'in' ? IN_CATS : (dir === 'out' ? OUT_CATS : null);
      if (!cats || cats.indexOf(cat) < 0) return 0;
      if (!ws.ledger || typeof ws.ledger !== 'object') ws.ledger = blank();
      if (!ws.ledger[dir] || typeof ws.ledger[dir] !== 'object') ws.ledger[dir] = blank()[dir];
      v = Math.round(v);
      ws.ledger[dir][cat] = (ws.ledger[dir][cat] || 0) + v;
      return v;
    },

    /* 恒等式对账（#113 / 总账浮层）：Σin − Σout + 启动资金 应等于当前灵石 */
    sums: function (ws) {
      var l = (ws && ws.ledger) || blank();
      var si = 0, so = 0;
      IN_CATS.forEach(function (k) { si += (l.in && l.in[k]) || 0; });
      OUT_CATS.forEach(function (k) { so += (l.out && l.out[k]) || 0; });
      return { inn: si, out: so, expect: SQ.Ledger.START_STONES + si - so };
    },

    /* ── 材料账两路（炼丹炼器卷 §7.1 · #113 扩展条款）────────────
     * 材料非灵石，独立对象 ws.ledgerMat = {in:{materials}, out:{materials}}，永不入灵石账九路；
     * 恒等式：Σin.materials − Σout.materials === Σ材料背包存量（#207）。
     * 唯一写口 noteMat（与 note 同纪律：取绝对值、整数化、非法静默拒绝）。 */
    matBlank: function () { return { in: { materials: 0 }, out: { materials: 0 } }; },

    noteMat: function (ws, dir, n) {
      if (!ws) return 0;
      var v = Math.abs(typeof n === 'number' && isFinite(n) ? Math.round(n) : 0);
      if (!v) return 0;
      if (dir !== 'in' && dir !== 'out') return 0;
      if (!ws.ledgerMat || typeof ws.ledgerMat !== 'object') ws.ledgerMat = SQ.Ledger.matBlank();
      if (!ws.ledgerMat[dir]) ws.ledgerMat[dir] = { materials: 0 };
      ws.ledgerMat[dir].materials = (ws.ledgerMat[dir].materials || 0) + v;
      return v;
    },

    matSums: function (ws) {
      var lm = (ws && ws.ledgerMat) || SQ.Ledger.matBlank();
      return { inn: (lm.in && lm.in.materials) || 0, out: (lm.out && lm.out.materials) || 0 };
    }
  };
})();
