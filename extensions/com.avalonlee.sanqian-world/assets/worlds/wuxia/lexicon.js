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
    'wh.wip': '「{tab}」此路尚未开辟——随放置玩法改造逐批接续。',
    /* 册215（P2 核心循环）：精力 / 资质 / 破关操作 / 修习管理 */
    'wh.stat.stamina': '精力',
    'wh.home.vitals': '状态与破关', 'wh.act.break': '破关', 'wh.act.force': '强行冲关（精力 20）',
    'wh.act.forcenote': '心境差得远却硬闯：成功率看见闻与心性，失败内伤加重、功力折损两成。',
    'wh.act.in': '入槽', 'wh.act.out': '出槽',
    'wh.arts.atts': '资质三轴', 'wh.atts.zhi': '悟性', 'wh.atts.gu': '根骨', 'wh.atts.xing': '心性',
    'wh.arts.attsnote': '悟性加速练功，心性助强行冲关；根骨随行走江湖历练（后续批）。',
    'wh.arts.known': '已知武学', 'wh.arts.inslot': '（修习中）',
    'wh.err.stamina': '精力不济，歇一会儿再来。', 'wh.err.stamina2': '精力不足 20，强行冲关太过凶险。',
    'wh.err.slots': '修习槽已满（六部为限），先出一部。', 'wh.err.gate': '功力或心境未至，破不了这一关。',
    'wh.err.save': '落档未成，稍后再试。',
    'wh.log.break': '水到渠成，一朝破关——自此是{realm}手段。',
    'wh.log.force.win': '置之死地而后生！强行冲关竟成，自此踏入{realm}。',
    'wh.log.force.lose': '强行冲关反受其害，内伤加重至{n}层。',
    /* 册216（P3 闯荡推图）：行走页 / 战报 / 模态 */
    'wh.rep.title': '行止录', 'wh.zone.title': '行走江湖', 'wh.zone.cur': '（所在）', 'wh.zone.locked': '境界未至，去不得',
    'wh.zone.scene': '行至 {n}/{t}', 'wh.zone.go': '前往', 'wh.zone.travel': '闯荡（精力 3）',
    'wh.mode.toggle': '闭关', 'wh.mode.cur': '当前：{m}', 'wh.mode.travel': '闯荡江湖', 'wh.mode.seclude': '闭关修炼',
    'wh.mode.note': '闯荡产出六成功力但见闻增长；闭关十成功力、两耳不闻窗外事。',
    'wh.rep.battle.win': '一战功成！赢了{foe}一场，得彩{loot}文，侠名小涨。',
    'wh.rep.battle.lose': '不敌{foe}，带伤而走（内伤 {n} 层）。',
    'wh.rep.battle.big': '大败！{foe}手下差点走不脱（内伤 {n} 层）——先疗伤吧。',
    'wh.rep.quiet': '在{place}走了一程（行至第 {n} 处），风平浪静，得{loot}文花销。',
    'wh.rep.knot.ask': '撞上一桩事：{title}', 'wh.rep.knotDone': '此事了结（{chose}）。',
    'wh.rep.hurt': '内伤沉重，不宜行走江湖——闭关养伤或去市集买药。',
    'wh.rep.stamina': '精力不济，歇会儿再走。',
    'wh.act.choose': '落子', 'wh.chose.watch': '旁观', 'wh.chose.help': '出手相助', 'wh.chose.probe': '暗中查探',
    'wh.chose.defy': '硬顶回去', 'wh.chose.join': '入伙', 'wh.chose.flee': '走为上策',
    'wh.ev.foe': '{ev}'
  });
})();
