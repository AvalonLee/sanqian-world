/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-items.cjs 生成，重跑覆盖
 * ITEMS_DB + ESTATE_BUILDINGS_DB 隐庐产业 + TRADE_GOODS_DB 八州行商特产
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L2743–L2758 · const ITEMS_DB
 * view/games/qunxia/game.html L8651–L8676 · const ESTATE_BUILDINGS_DB
 * view/games/qunxia/game.html L9386–L9395 · const TRADE_GOODS_DB
 * ============================================================ */

    const ITEMS_DB = {
      rusty_sword:   { id: 'rusty_sword', name: '杂铁短剑（凡器）', slot: 'weapon', atk: 2, hp: 0, price: 15, maxStock: 1, desc: '乡野铁匠铺随处可见的粗铁短剑，聊胜于无。' },
      cloth_robe:    { id: 'cloth_robe', name: '粗布短褐（凡衣）', slot: 'armor', atk: 0, hp: 5, price: 15, maxStock: 1, desc: '寻常江湖行脚客所穿的粗布衣衫，满是风尘补丁。' },
      qingtong_jian: { id: 'qingtong_jian', name: '青锋百炼剑', slot: 'weapon', atk: 10, hp: 0, price: 120, maxStock: 1, desc: '百炼精钢所铸，剑刃清亮，初入名门的剑客佩兵。' },
      xuantie_jian:  { id: 'xuantie_jian', name: '玄铁重剑·仿', slot: 'weapon', atk: 22, hp: 20, price: 360, maxStock: 1, desc: '重剑无锋，大巧不工，催动【刚猛】与【巧变】皆有奇效。' },
      yitian_jian:   { id: 'yitian_jian', name: '倚天青霜剑', slot: 'weapon', atk: 34, hp: 15, price: 680, maxStock: 1, desc: '绝世神兵削铁如泥，出招额外提升 15% 破防威力。' },
      jinsi_jia:     { id: 'jinsi_jia', name: '金丝软甲', slot: 'armor', atk: 0, hp: 45, price: 260, maxStock: 1, desc: '刀剑难伤之贴身宝甲，大幅提升气血上限。' },
      ruanwei_jia:   { id: 'ruanwei_jia', name: '桃花软猬甲', slot: 'armor', atk: 10, hp: 65, price: 580, maxStock: 1, desc: '桃花岛镇岛宝甲，不仅刀枪不入，更能反刺敌手。' },
      yupei_charm:   { id: 'yupei_charm', name: '温玉护心佩', slot: 'charm', atk: 6, hp: 22, price: 190, maxStock: 1, desc: '古墓寒玉雕琢而成，佩之宁心静气，内息流转顺畅。' },
      shenghuo_ling: { id: 'shenghuo_ling', name: '西域圣火令', slot: 'charm', atk: 16, hp: 35, price: 480, maxStock: 1, desc: '非金非玉坚硬无比，刻有奇诡武学心诀。' },
      jinchuang_yao: { id: 'jinchuang_yao', name: '九花玉露丸', slot: 'pill', healHp: 65, healMp: 40, price: 48, maxStock: 5, desc: '桃花岛秘传灵药，服之立复65点气血与40点真气（全图限购5颗）。' },
      dahuan_dan:    { id: 'dahuan_dan', name: '少林大还丹', slot: 'pill', maxHpUp: 22, maxMpUp: 15, price: 280, maxStock: 2, desc: '佛门圣药，服之永久提升22点气血与15点真气上限（全图限购2颗）！' },
      scroll_dugu:   { id: 'scroll_dugu', name: '《独孤九剑》剑谱', slot: 'scroll', learnArt: 'dugu_jiujian', price: 760, maxStock: 1, desc: '风清扬前辈手书剑理，研读可习得【终结】绝学《独孤九剑·破式》（孤本限1）！' },
      scroll_qiankun:{ id: 'scroll_qiankun', name: '《乾坤大挪移》羊皮卷', slot: 'scroll', learnArt: 'qiankun_nuoyi', price: 720, maxStock: 1, desc: '明教至高心法，研读可习得【承转】绝学《乾坤大挪移·牵引》（孤本限1）！' },
      scroll_yijin:  { id: 'scroll_yijin', name: '《少林易筋经》梵文卷', slot: 'scroll', learnArt: 'yijin_jing', price: 880, maxStock: 1, desc: '禅宗无上内功，研读可习得内功《少林易筋经》（孤本限1）！' }
    };
    const ESTATE_BUILDINGS_DB = [
      {
        id: 'winery', name: '🍶 杏花酒坊', originRef: '《笑傲江湖》洛阳绿竹巷/酒肆',
        desc: '酿造洛阳名酒女儿红，每过 1 旬自动售酒获取稳定盘缠收益。',
        levels: ['荒芜空地（0产出）', '初创小坊（每旬+10文）', '名满洛水（每旬+22文）', '天下第一酿（每旬+38文）'],
        costs: [0, 95, 220, 420]
      },
      {
        id: 'herbGarden', name: '🌿 百草药圃', originRef: '《飞狐外传》药王庄百草园',
        desc: '培植九花灵草与雪莲，每过 1 旬自动产出灵草（供丹房炼丹与义诊）并恢复气血。',
        levels: ['荒芜空地（0产出）', '篱落药畦（每旬+1灵草）', '灵泉百草园（每旬+2灵草）', '神农仙圃（每旬+4灵草）'],
        costs: [0, 90, 210, 400]
      },
      {
        id: 'smithy', name: '🔥 神机铁坊', originRef: '《倚天屠龙记》明教锐金旗铸坊',
        desc: '引地火提炼百炼玄铁，每过 1 旬自动产出玄铁（供免费淬炼神兵或锻钢售银）。',
        levels: ['荒芜空地（0产出）', '鼓风铁炉（每旬+1玄铁）', '百炼剑坊（每旬+2玄铁）', '欧冶神工坊（每旬+3玄铁）'],
        costs: [0, 130, 280, 520]
      },
      {
        id: 'academy', name: '📜 飞鸽书院', originRef: '《天龙八部》琅嬛福地/鹅湖书院',
        desc: '收集九州武林邸报与经史典籍，每过 1 旬自动产出武学修为与江湖侠名。',
        levels: ['荒芜空地（0产出）', '竹林书斋（每旬+12修为/+4侠名）', '洛水讲堂（每旬+25修为/+8侠名）', '山河藏书楼（每旬+42修为/+14侠名）'],
        costs: [0, 140, 300, 560]
      }
    ];
    const TRADE_GOODS_DB = {
      zhongyuan: { id: 'good_wine',    zone: 'zhongyuan', name: '洛阳女儿红', buyPrice: 20, sellPrice: 46 },
      jingxiang: { id: 'good_iron',    zone: 'jingxiang', name: '襄阳百炼钢', buyPrice: 28, sellPrice: 64 },
      jiangnan:  { id: 'good_silk',    zone: 'jiangnan',  name: '苏杭云锦绸', buyPrice: 35, sellPrice: 80 },
      bashu:     { id: 'good_poison',  zone: 'bashu',     name: '蜀中孔雀胆', buyPrice: 40, sellPrice: 92 },
      dianqian:  { id: 'good_tea',     zone: 'dianqian',  name: '普洱古树茶', buyPrice: 25, sellPrice: 58 },
      yanzhao:   { id: 'good_horse',   zone: 'yanzhao',   name: '大漠汗血驹', buyPrice: 55, sellPrice: 126 },
      xiyu:      { id: 'good_jade',    zone: 'xiyu',      name: '和田羊脂玉', buyPrice: 65, sellPrice: 148 },
      haiwai:    { id: 'good_ginseng', zone: 'haiwai',    name: '长白百年参', buyPrice: 75, sellPrice: 172 }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ITEMS_DB: ITEMS_DB, ESTATE_BUILDINGS_DB: ESTATE_BUILDINGS_DB, TRADE_GOODS_DB: TRADE_GOODS_DB };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { ITEMS_DB, ESTATE_BUILDINGS_DB, TRADE_GOODS_DB });
}
