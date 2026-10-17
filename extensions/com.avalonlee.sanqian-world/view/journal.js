/* 日志页渲染器（Tab 7 · 第册五批 2026-10-17 从 view/index.html 内联块整段搬出 · 正典 = UI 卷 §3.8）
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 **D7** 与 ctx 工厂逐键对账，不许自取内核私有量）。
 * ⚠️ 本件的回调参数一律不叫 `c`：原代码里 `LOG_CATS.forEach(function (c) …)` 会把桥挡住——
 *    这类「搬家后变量名撞车」静态判据照不到，只有渲染结果会说话（走查 journal J0~J2）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* ── Tab 7 日志（原「奇遇页 → 系统日志弹层」升级为左侧导航的独立页）──
   * 分类含「奇遇」：奇遇日志内嵌该条事件的具体叙事（log.event.resolve 带 {story}） */
  /* 分类（v2.3）：+「功法」（gainArt/顿悟/升级/散功全路由至此）；−「突破」——
   * 死分类删除：无任何代码写 break 类日志，渡劫/晋升全走 trib（历史遗留）。 */
  var LOG_CATS = [
    { id: 'all', key: 'log.cat.all' }, { id: 'event', key: 'event.tag' },
    /* 历练（秘境 / 域主 / 残片兑换 / 法宝战斗日志）：写口在 combat.js + treasures.js
     * （cat 'combat' 15 处），此前本表无项 ⇒ 只能混在「全部」里、任何筛选都取不到，
     * 标签键 combat.tag 也一直躺孤儿表。本批补分类并同时消费该键。 */
    { id: 'combat', sys: 'combat.tag' },
    { id: 'trib', sys: 'tribulation.tag' },
    { id: 'karma', sys: 'karma.system' },   /* 名号更迭（善恶名号批）：跨段日志独立成类，可单独筛选 */
    { id: 'gear', sys: 'gear.tag' }, { id: 'arts', sys: 'skill.system' },
    /* 道友分类（好感三渠道批）：拜访 / 赠丹 / 同贺 + 既有的同道相吸 / 缘尽赎回 / 结缘 / 冥佑。
     * ⚠️ 收口批 A 遗留——cat 'bond' 早已在写（xiuxian/index.js 同道相吸、actions.js 缘尽赎回），
     * 但本表此前无此分类，那些日志只能在「全部」里看到、任何分类筛选都取不到。 */
    { id: 'bond', sys: 'bond.system' },
    /* 洞府 / 坊市（同类补口）：cave.js 记 cat 'cave' 3 处、shop.js + alchemy.js 记 'shop' 2 处。
     * 标签复用既有系统名键 cave.system / shop.system（零新键、零新孤儿）。 */
    { id: 'cave', sys: 'cave.system' }, { id: 'shop', sys: 'shop.system' },
    { id: 'sys', key: 'sys.tag' }
  ];

  /* 展示取数（日志存档批）：存储留全量（独立日志档），界面**每分类只显示最新
   * LOG_CAT_CAP(200) 条**——具体分类取其最新 200；「全部」为各分类各取最新 200 后按时间倒序合并。 */
  function journalLines(c, w) {
    var cap = (SQ.Log && SQ.Log.CAT_CAP) || 200;
    var list = (w && w.log) || [];
    if (c.ui.logFilter !== 'all') {
      return list.filter(function (l) { return l.cat === c.ui.logFilter; }).slice(-cap).reverse();
    }
    var per = {}, out = [];
    for (var i = list.length - 1; i >= 0; i--) {
      var cat = list[i].cat;
      per[cat] = (per[cat] || 0) + 1;
      if (per[cat] <= cap) out.push(list[i]);
    }
    return out;
  }

  function render(c) {
    var ch = '';
    LOG_CATS.forEach(function (cat) {
      var label = cat.key ? c.t(cat.key) : c.t(cat.sys);
      ch += '<button class="' + (c.ui.logFilter === cat.id ? 'on' : '') + '" data-act="logFilter" data-v="' + cat.id + '">' + c.esc(label) + '</button>';
    });
    var lines = journalLines(c, c.w);
    var h = '<div class="chips">' + ch + '</div>';
    if (!lines.length) {
      h += '<p class="hint" style="padding:12px 0">' + c.esc(c.t('log.empty')) + '</p>';
    } else {
      h += '<div class="loglist">';
      lines.forEach(function (l) {
        /* 时间列（v2.3）：游戏历「罗云历X年X月X日」；createdAt 缺失的旧档兜底回真实时刻 */
        var gt = c.date(l.ts);
        if (!gt) {
          var dt0 = new Date(l.ts);
          gt = ('0' + dt0.getHours()).slice(-2) + ':' + ('0' + dt0.getMinutes()).slice(-2);
        }
        /* N20 接线：「全部」筛选下行内不显分类（11 个分类标签键都在用，只是没进日志行）⇒ 仅在该筛选下加 `[分类]` 前缀，         * 其余筛选由选中态自身表达，不重复 */
        var catC = ((c.ui.logFilter || 'all') === 'all') ? LOG_CATS.filter(function (cc) { return cc.id === l.cat; })[0] : null;
        h += '<div class="logline' + (l.cat === 'event' ? ' ev' : '') + '"><span class="ts">' + c.esc(gt) + '</span>' +
          c.esc(catC ? c.t('log.catted', { cat: catC.key ? c.t(catC.key) : c.t(catC.sys), text: l.text }) : l.text) + '</div>';
      });
      h += '</div>';
    }
    c.$('tab-journal').innerHTML = h;
  }

  SQ.UI = SQ.UI || {};                    /* 视图件命名空间（与 SQ.UI.updateNote 同一家族） */
  SQ.UI.journal = { render: render };
})();
