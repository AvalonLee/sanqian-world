/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-origins.cjs 生成，重跑覆盖
 * ORIGINS 6 出身 + ENDINGS_DB 六道途判词 + TALENTS_POOL 先天命格 + OPENING_VOWS_DB 昆仑雪夜三问
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L2760–L2847 · const ORIGINS
 * view/games/qunxia/game.html L2849–L2898 · const ENDINGS_DB
 * view/games/qunxia/game.html L8994–L9018 · const TALENTS_POOL
 * view/games/qunxia/game.html L9020–L9024 · const OPENING_VOWS_DB
 * ============================================================ */

    const ORIGINS = [
      {
        id: 'sword_wanderer',
        shortTag: '推荐·剑',
        playTip: '均衡开局，剑招起手',
        name: '寒门孤童 · 乡野剑徒',
        sectId: 'none',
        sect: '无门无派 · 江湖小虾米',
        startRegion: 'luoyang',
        desc: '自幼在山野拾柴习剑，仅通晓粗浅吐纳与三招庄稼把式。手握师尊遗留的半枚铁令与破落隐庐地契，身怀 15 文铜钱初入洛阳，一切武功、门派与基业皆需从零打拼！',
        innerArt: 'basic_tuna',
        moves: ['taizu_changquan', 'songfeng_jian', 'wuhu_dao'],
        karma: { xiayi: 10, kuangao: 10, xiaoyao: 10 },
        stats: { hp: 85, maxHp: 85, mp: 50, maxMp: 50, gold: 15, fame: 5, exp: 0 }
      },
      {
        id: 'palm_hero',
        shortTag: '推荐·拳',
        playTip: '气血更厚，近战稳健',
        name: '流民少年 · 走卒拳徒',
        sectId: 'none',
        sect: '无门无派 · 江湖小虾米',
        startRegion: 'luoyang',
        desc: '昔年黄河水患遗孤，在码头扛包练就一身粗浅筋骨，只会《太祖长拳》与《五虎断门刀》。囊中羞涩（仅 15 文铜钱），欲在九州武林闯出一番名堂！',
        innerArt: 'basic_tuna',
        moves: ['taizu_changquan', 'wuhu_dao', 'songfeng_jian'],
        karma: { xiayi: 15, kuangao: 10, xiaoyao: 5 },
        stats: { hp: 95, maxHp: 95, mp: 45, maxMp: 45, gold: 12, fame: 5, exp: 0 }
      },
      {
        id: 'taoist_scholar',
        shortTag: '推荐·书',
        playTip: '内息更足，柔招见长',
        name: '落魄书生 · 寒窗道童',
        sectId: 'none',
        sect: '无门无派 · 江湖小虾米',
        startRegion: 'luoyang',
        desc: '家道中落的穷酸书生，偶得道观老道传授一招《匀息绵掌》与《粗浅吐纳功》。手无寸铁、盘缠微薄，唯凭胸中一点灵明入世历练！',
        innerArt: 'basic_tuna',
        moves: ['mian_zhang', 'songfeng_jian', 'wuhu_dao'],
        karma: { xiayi: 10, kuangao: 5, xiaoyao: 15 },
        stats: { hp: 80, maxHp: 80, mp: 60, maxMp: 60, gold: 18, fame: 5, exp: 0 }
      },
      {
        id: 'snow_swordswoman',
        shortTag: '进阶·雪岭',
        playTip: '清冷快剑，略偏逍遥',
        name: '天山孤女 · 雪岭剑徒',
        sectId: 'none',
        sect: '无门无派 · 雪山小侠女',
        startRegion: 'luoyang',
        desc: '自幼生长于西域雪峰之下，身披白狐轻裘，习得几招轻灵快剑《松风剑法》与《匀息绵掌》。性情清冷孤傲，携师尊遗命只身入中原闯荡！',
        innerArt: 'basic_tuna',
        moves: ['songfeng_jian', 'mian_zhang', 'taizu_changquan'],
        karma: { xiayi: 12, kuangao: 12, xiaoyao: 16 },
        stats: { hp: 88, maxHp: 88, mp: 55, maxMp: 55, gold: 16, fame: 5, exp: 0 }
      },
      {
        id: 'ng_gumu_heir',
        shortTag: '二周目',
        playTip: '古墓开局，玉女剑起步',
        reqCycle: 2,
        name: '【二周目隐藏】古墓遗孤 · 寒玉传人',
        sectId: 'zhongnan',
        sect: '终南古墓派 · 寒玉室传人',
        startRegion: 'gumu',
        desc: '【多周目轮回专属】自幼在终南山活死人墓寒玉床上长大，承小龙女与杨过衣钵，开局即驻【活死人墓】并习得《玉女素心剑》！',
        innerArt: 'basic_tuna',
        moves: ['yunv_jian', 'songfeng_jian', 'mian_zhang'],
        karma: { xiayi: 15, kuangao: 15, xiaoyao: 25 },
        stats: { hp: 105, maxHp: 105, mp: 80, maxMp: 80, gold: 45, fame: 20, exp: 50 }
      },
      {
        id: 'ng_murong_scion',
        shortTag: '二周目',
        playTip: '燕子坞开局，家资丰厚',
        reqCycle: 2,
        name: '【二周目隐藏】姑苏世家 · 参合公子',
        sectId: 'yanziwu',
        sect: '姑苏慕容氏 · 还施水阁少主',
        startRegion: 'yanziwu',
        desc: '【多周目轮回专属】出身江南太湖燕子坞武林世家，家资颇丰，开局即驻【姑苏燕子坞】并掌握《斗转星移·还施》初阶！',
        innerArt: 'xiaowuxiang_gong',
        moves: ['douzhuan_xingyi', 'songfeng_jian', 'taizu_changquan'],
        karma: { xiayi: 10, kuangao: 30, xiaoyao: 15 },
        stats: { hp: 110, maxHp: 110, mp: 85, maxMp: 85, gold: 95, fame: 30, exp: 50 }
      }
    ];
    const ENDINGS_DB = [
      {
        id: 'ending_alliance_lord',
        title: '【结局一 · 侠之大者 · 武林盟主】',
        tag: '正道魁首',
        conditionDesc: '通关华山绝顶终战 + 侠义心性 ≥ 60',
        poem: '“铁肩担道义，肝胆照昆仑。一剑平四海，九州仰侠名。”',
        epilogue: '你在华山绝顶击败玄冥神君慕容绝，将三卷《山河武典》公诸正道以止干戈。萧峰、郭靖、张无忌等群豪公推你执掌武林盟主帅印。此后二十年间，你率中原义士北御铁骑、内靖江湖，成为万民敬仰的一代巨侠。'
      },
      {
        id: 'ending_sword_god',
        title: '【结局二 · 独孤求败 · 绝代剑神】',
        tag: '剑道神话',
        conditionDesc: '通关华山绝顶终战 + 狂傲心性最高（或独孤九剑/黯然销魂掌精深）',
        poem: '“纵横江湖三十载，杀尽仇寇，败尽英雄，天下更无抗手！”',
        epilogue: '华山之巅一战，你以无上剑意三招震碎慕容绝护体神功。满山剑客尽皆俯首，无人敢撄其锋。你婉拒了武林盟主之位，与杨过、黄药师于东海孤峰论剑听涛，最终在独孤剑冢留下「无招胜有招」五字，飘然远引。'
      },
      {
        id: 'ending_free_immortal',
        title: '【结局三 · 笑傲沧海 · 逍遥剑仙】',
        tag: '琴箫江湖',
        conditionDesc: '通关华山绝顶终战 + 逍遥心性最高',
        poem: '“沧海一声笑，滔滔两岸潮。浮沉随浪只记今朝。”',
        epilogue: '大仇既报，武典既归，你视功名霸业如浮云。在洛水画舫与令狐冲、段誉、小龙女抚琴吹箫，饮遍九州名酒，踏遍苍山洱海与桃花仙岛。江湖上只留下你三招破敌的潇洒传说，却无人知晓你的去向。'
      },
      {
        id: 'ending_grand_patriarch',
        title: '【结局四 · 三才合一 · 开山立圣】',
        tag: '一代武圣',
        conditionDesc: '通关华山绝顶终战 + 晋升一派掌门或习得 8 门以上绝学',
        poem: '“刚柔巧变归太极，九阳北冥汇丹田。开宗立派传千古，敢笑达摩与重阳。”',
        epilogue: '你不仅平定了血衣楼十年浩劫，更执掌宗门帅印，融汇三卷《山河武典》与少林、武当、桃花、大理诸派绝学于一炉，打破正邪门户之见，于嵩山与华山之间开创「山河书院」，开启武林百年盛世！'
      },
      {
        id: 'ending_hegemon',
        title: '【结局五 · 唯我独尊 · 九州霸主】',
        tag: '一代枭雄',
        conditionDesc: '狂傲心性极高且未走正道结盟路线',
        poem: '“顺我昌兮逆我亡，手握武典统八荒。华山绝顶谁称尊，万里山河一剑霜。”',
        epilogue: '斩杀慕容绝后，你独掌三卷《山河武典》与玄冥血衣楼旧部，以雷霆手腕弹压不服之门派。虽背负霸道枭雄之名，却令九州黑道宵小闻风丧胆，开创铁血秩序。'
      },
      {
        id: 'ending_hermit',
        title: '【结局六 · 烟雨归舟 · 江湖散人】',
        tag: '全身而退',
        conditionDesc: '年满 36 旬但尚未完成华山终章决战',
        poem: '“十年一觉江湖梦，赢得青衫两袖风。回首华山云雾锁，扁舟一叶入烟波。”',
        epilogue: '三年论剑之期已至，你虽未能在华山绝顶彻底了结血衣楼宿怨，却也在九州行脚间结交了不少奇人异士。倦看江湖恩怨厮杀，你于江南烟雨楼畔买下一叶扁舟，从此归隐水乡。'
      }
    ];
    const TALENTS_POOL = [
      // 【神品 · 红】（极稀有绝世命格）
      { id: 'talent_prodigy', grade: 'god', badge: 'bg-red-700 text-amber-100 border-amber-300', gradeLabel: '神品·绝世', name: '【天命武曲·武学奇才】', desc: '万中无一的练武奇才：武学突破消耗修为 -15%，初始修为 +30' },
      { id: 'talent_sword_heart',   grade: 'god', badge: 'bg-red-700 text-amber-100 border-amber-300', gradeLabel: '神品·绝世', name: '【九窍玲珑·剑心通明】', desc: '天生剑胎：全招式威力 +6，气血与内息上限各 +15' },
      { id: 'talent_hercules',    grade: 'god', badge: 'bg-red-700 text-amber-100 border-amber-300', gradeLabel: '神品·绝世', name: '【龙象霸体·天生神力】', desc: '筋骨如龙象：气血上限 +35，随身偶得【百炼玄铁 ×1】' },
      { id: 'talent_tao_nature',     grade: 'god', badge: 'bg-red-700 text-amber-100 border-amber-300', gradeLabel: '神品·绝世', name: '【先天道胎·万法自然】', desc: '百脉俱通：真气上限 +30，开局自动贯通【督脉·百会穴】' },

      // 【吉品 · 金】（正面良性命格）
      { id: 't_good_tough',    grade: 'good', badge: 'bg-amber-600 text-stone-950', gradeLabel: '吉品·上乘', name: '【筋骨强健】', desc: '自幼风吹日晒皮糙肉厚：初始气血上限 +18' },
      { id: 't_good_agile',    grade: 'good', badge: 'bg-amber-600 text-stone-950', gradeLabel: '吉品·上乘', name: '【手脚麻利】', desc: '身手矫健：初始真气上限 +15，内息回复加快' },
      { id: 'talent_wealthy', grade: 'good', badge: 'bg-amber-600 text-stone-950', gradeLabel: '吉品·上乘', name: '【算盘精明】', desc: '善算毫厘：下山时多攒了私房钱 +20 文' },
      { id: 'talent_chivalrous',    grade: 'good', badge: 'bg-amber-600 text-stone-950', gradeLabel: '吉品·上乘', name: '【谈吐风雅】', desc: '温文尔雅讨人喜欢：初始侠名 +12，全名宿初始好感 +6' },

      // 【凡品 · 白】（平庸有得有失）
      { id: 't_norm_farmer',     grade: 'norm', badge: 'bg-stone-600 text-stone-100', gradeLabel: '凡品·寻常', name: '【农家汉子】', desc: '识得山间草木：开局带【灵草 ×1】，但见识浅薄【侠名 -4】' },
      { id: 't_norm_apprentice', grade: 'norm', badge: 'bg-stone-600 text-stone-100', gradeLabel: '凡品·寻常', name: '【铁铺杂役】', desc: '打过几年下手：开局带【玄铁 ×1】，但火毒入体【真气上限 -10】' },
      { id: 't_norm_gambler',    grade: 'norm', badge: 'bg-stone-600 text-stone-100', gradeLabel: '凡品·寻常', name: '【市井赌徒】', desc: '手气忽高忽低：开局盘缠随机增减（+15文，但气血上限 -10）' },

      // 【凶煞 · 黑】（负面残缺命格，常态摇点必混入 1~2 项）
      { id: 't_bad_meridian', grade: 'bad', badge: 'bg-stone-950 text-red-400 border border-red-700', gradeLabel: '凶煞·缺陷', name: '【经脉淤塞】', desc: '负面缺陷：先天经脉郁结，初始真气上限 -20，内息周转滞涩' },
      { id: 't_bad_sickly',   grade: 'bad', badge: 'bg-stone-950 text-red-400 border border-red-700', gradeLabel: '凶煞·缺陷', name: '【体弱多病】', desc: '负面缺陷：幼年寒疾缠身，初始气血上限 -22' },
      { id: 't_bad_poor',     grade: 'bad', badge: 'bg-stone-950 text-red-400 border border-red-700', gradeLabel: '凶煞·缺陷', name: '【家徒四壁】', desc: '负面缺陷：下山途中盘缠遭窃，开局铜钱直接归 0 文！' },
      { id: 't_bad_infamy',   grade: 'bad', badge: 'bg-stone-950 text-red-400 border border-red-700', gradeLabel: '凶煞·缺陷', name: '【天煞孤星】', desc: '负面缺陷：面相孤僻惹人嫌隙，所有金庸名宿初始好感度 -10' },
      { id: 't_bad_dull',     grade: 'bad', badge: 'bg-stone-950 text-red-400 border border-red-700', gradeLabel: '凶煞·缺陷', name: '【资质鲁钝】', desc: '负面缺陷：悟性愚钝，所有武学突破所需修为增加 +25%' }
    ];
    const OPENING_VOWS_DB = [
      { id: 'vow_hero', title: '【苍生大义 · 锄强扶弱】', quote: '“纵使眼下只是无名小卒，亦愿护佑一方黎庶！”', rewardDesc: '初始【侠义+15】，行囊带止血散【九花玉露丸 ×1】' },
      { id: 'vow_supreme', title: '【苦修问剑 · 勤能补拙】', quote: '“今日手中虽是锈铁剑，他日必登华山绝顶！”', rewardDesc: '初始【狂傲+15】，苦练筑基获【武学修为 +35】' },
      { id: 'vow_homestead', title: '【白手起家 · 耕读传家】', quote: '“先将师尊遗留的荒芜隐庐一砖一瓦建起！”', rewardDesc: '初始【逍遥+15】，额外带开垦本钱【铜钱 +20 文、灵草 ×1】' }
    ];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ORIGINS: ORIGINS, ENDINGS_DB: ENDINGS_DB, TALENTS_POOL: TALENTS_POOL, OPENING_VOWS_DB: OPENING_VOWS_DB };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { ORIGINS, ENDINGS_DB, TALENTS_POOL, OPENING_VOWS_DB });
}
