/* assets/worlds/wuxia/lexicon.js — 武侠世界词表分卷（注册进 SQ.LEX.wuxia）
 * 词表纪律（工程规范 §1.2）：本文件是 CJK 白名单；index.js / data.js 等逻辑文件禁止裸中文。
 *
 * 册154（S1-a）立卷时的取舍：**只放最小的「世界自称」四键**，其余留给按批填充。
 * 理由 = 词表键一旦立就进 A6 孤儿键射程（声明了没人读 ⇒ 审计红），而 S1-a 还没有任何
 * 消费方。世界卡上的名称与标签走 common 卷（`world.wuxia.name` / `world.tag.*`），
 * 不在这里重复——两处同键会漂。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.lexRegister('wuxia', {
    /* 资源二称（页脚与日志模板用；消费点 = assets/systems/{actions,arts,events,gear,realm,idle}.js
     * 的 `SQ.t('resource.*', null, worldId)`）。⚠️ 只收**已有消费点**的键：词表声明后无人读
     * ⇒ A6 孤儿键直接红（初稿多写一枚 `resource.fame` 就是踩这条，已删）。 */
    'resource.primary': '功力',
    'resource.currency': '银两',
    /* 册214（P1 · tab 主壳）：武侠家界面键族（view/wuxia-home.js 消费）。
     * 书形态键族（ui.book.* / hao.cand.*）随件封存不删——P5 世界事件层评估复活或摘除。 */
    'wh.title': '侠影江湖',
    'wh.stat.realm': '境界', 'wh.stat.qi': '功力', 'wh.stat.stones': '银两',
    'wh.stat.renown': '侠名', 'wh.stat.exp': '见闻', 'wh.stat.injury': '内伤',
    'wh.stat.hurt': '内伤沉重', 'wh.fmt.wen': '{n} 文',
    'wh.tab.home': '主页', 'wh.tab.arts': '修习', 'wh.tab.zones': '行走', 'wh.tab.sect': '门派',
    'wh.tab.people': '人物', 'wh.tab.shop': '市集', 'wh.tab.jianghu': '江湖', 'wh.tab.book': '书笺',
    'wh.tab.gear': '行装', 'wh.tab.settings': '设置',
    'wh.home.state': '行止', 'wh.home.next': '下一境界「{realm}」· 内息已满 {pct}%',
    'wh.home.idle': '闯荡', 'wh.home.modes': '正在 {place} 闯荡江湖',
    'wh.home.idlenote': '功力与银两随时间累积；修习槽中的武学按时长精进（离线同速）。',
    'wh.home.slots': '修习槽', 'wh.home.slotsEmpty': '（空——取得武学后入槽自悟，每 30 分钟一层）',
    'wh.home.layer': '第 {n} 层', 'wh.home.practice': '练习度 {n}/99',
    'wh.home.breakReady': '功力圆满，心境已至——随时可以破关。',
    'wh.home.breakLocked': '心境未至，内息封顶在下一档——出门见世面吧。',
    'wh.wip': '「{tab}」此路尚未开辟——随放置玩法改造逐批接续。'
  });
})();
