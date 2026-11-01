/* assets/worlds/wuxia/lexicon-world.js — 世界名词表（门派 / 境界；**生成物，不许手改**）
 * 键形 `sect.<id>.name` / `realm.<n>`（realm 键与第一世界同形，取词器按 worldId 分卷命中）。
 * 册164 沿革注：翻牌 live 后 C1 must 族对武侠分卷生效 ⇒ 补齐世界身份命名（各体系一束，
 * 武侠味取词；书形态不渲染九页 tab，这些键是「换世界即换名」契约的身份声明与回落词）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  /* 随机姓名分卷（册167 · 消 `randomRoleName('wuxia')` 回落 '??' 的潜伏缺口）：
   * 武侠味姓名——姓走大姓，名走「江湖人」味（君宝/飞雪/铁衣一类），与修仙道号池分卷不混。 */
  SQ.NAMES = SQ.NAMES || {};
  SQ.NAMES.wuxia = {
    surname: ['张', '沈', '郭', '杨', '萧', '段', '林', '陆', '燕', '李'],
    given: ['君宝', '浪', '飞雪', '惊涛', '孤鸿', '青霜', '远山', '铁衣', '追风', '破军']
  };
  SQ.lexRegister('wuxia', {
    /* C1 must 族（册164）：体系身份命名（书形态下多为附录/回落词） */
    'idle.action': '闭关练功',
    'idle.rate': '内息增长',
    'idle.next': '下一境界',
    'combat.system': '江湖历险',
    'gear.system': '兵刃行囊',
    'skill.system': '武学谱',
    'shop.system': '行商买卖',
    'tribulation.system': '破关',
    'karma.system': '侠名',
    'attr.system': '心性',
    'tab.idle': '书斋',
    'tab.event': '见闻',
    'tab.log': '书录',
    'tab.settings': '装帧',
    'world.wuxia.name': '侠影江湖',
    'world.tag.xia': '侠影',
    'world.tag.jianghu': '江湖',
    'realm.0': '不入流',
    'realm.1': '三流',
    'realm.2': '二流',
    'realm.3': '一流',
    'realm.4': '绝顶',
    'realm.5': '宗师',
    'realm.6': '大宗师',
    'realm.7': '天人',
    'realm.8': '化境',
    'realm.9': '无招',
    'sect.shaolin.name': '少林',
    'sect.huashan.name': '华山',
    'sect.hengshan.name': '恒山',
    'sect.wudang.name': '武当',
    'sect.qingcheng.name': '青城',
    'sect.emei.name': '峨眉',
    'sect.kunlun.name': '昆仑',
    'sect.kongtong.name': '崆峒',
    'sect.gaibang.name': '丐帮',
    'sect.tiandihui.name': '天地会',
    'sect.honghuahui.name': '红花会',
    'sect.taohua.name': '桃花岛',
    'sect.quanzhen.name': '全真教',
    'sect.murong.name': '姑苏慕容',
    'sect.dali.name': '大理段氏',
    'sect.xiaoyao.name': '逍遥派',
    'sect.mingjiao.name': '明教',
    'sect.changle.name': '长乐帮',
    'sect.tianying.name': '天鹰教',
    'sect.xingxiu.name': '星宿派',
    'sect.shenlong.name': '神龙教',
    'sect.tiezhang.name': '铁掌帮',
    'sect.riyue.name': '日月神教',
    'sect.xueshan.name': '雪山派',
    'sect.lingjiu.name': '灵鹫宫',
    'sect.xiake.name': '侠客岛',
    'sect.songshan.name': '嵩山派',
    'sect.taishan.name': '泰山派',
    'sect.hengshan_n.name': '衡山派',
    'sect.gumu.name': '古墓派',
    'sect.xuedao.name': '血刀门',
    'sect.diancang.name': '点苍派'
  });
})();
