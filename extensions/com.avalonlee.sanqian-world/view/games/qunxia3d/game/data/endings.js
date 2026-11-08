/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-endings.cjs 生成，重跑覆盖
 * LIFE_PATHS_DB 六道途（isDone/progressText 闭包逐字）+ LEGACY_PERKS_DB 碑林五遗泽 + ENDINGS_DB 六判词
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L9641–L9710 · const LIFE_PATHS_DB
 * view/games/qunxia/game.html L9712–L9718 · const LEGACY_PERKS_DB
 * view/games/qunxia/game.html L2849–L2898 · const ENDINGS_DB
 * ============================================================ */

    const LIFE_PATHS_DB = [
      {
        id: 'path_sword',
        name: '【道途一 · 孤剑平乱 · 主线盟主】',
        tag: '原著主线',
        desc: '循师尊遗留的玄铁剑令追查血衣楼，集齐三卷《山河武典》并于华山绝顶击败慕容绝。',
        progressText: (st) => `主线章节：${Math.min(st.mainQuestStep, 7)} / 7 章`,
        isDone: (st) => st.mainQuestStep >= 7,
        endingIdx: 0
      },
      {
        id: 'path_sect',
        name: '【道途二 · 名门正宗 · 开山掌门】',
        tag: '无需主线·宗门线',
        desc: '不问世俗主线恩怨，专心拜入十二大宗门之一，攒满功绩晋升为第四阶【一派掌门/教主】，并习得 6 门以上武学。',
        progressText: (st) => `宗门位阶：${st.sectId === 'none' ? '未拜师(0/3)' : `${st.sectRankIdx}/3阶`} · 武学：${Object.keys(st.learnedArts).length}/6门`,
        isDone: (st) => st.sectId !== 'none' && st.sectRankIdx >= 3 && Object.keys(st.learnedArts).length >= 6,
        endingIdx: 3
      },
      {
        id: 'path_demon',
        name: '【道途三 · 魔道枭雄 · 唯我独尊】',
        tag: '无需主线·邪魔线',
        desc: '行事狂傲亦正亦邪，习得《吸星大法》《星宿化功大法》或《葵花鬼影剑》之一，且狂傲心性 ≥ 50、境界达【融会贯通】以上。',
        progressText: (st) => `魔功：${(st.learnedArts.xixing_dafa || st.learnedArts.huagong_dafa || st.learnedArts.kuihua_jian) ? '已习得✓' : '未习得'} · 狂傲：${st.karma.kuangao}/50`,
        isDone: (st) => Boolean(st.learnedArts.xixing_dafa || st.learnedArts.huagong_dafa || st.learnedArts.kuihua_jian) && st.karma.kuangao >= 50 && st.realmIdx >= 2,
        endingIdx: 4
      },
      {
        id: 'path_hermit',
        name: '【道途四 · 寻幽太玄 · 秘境奇侠】',
        tag: '无需主线·奇遇线',
        desc: '踏遍八荒二十八地界，探索完成至少 3 处【金庸传世秘境奇遇】（如侠客岛、无量玉壁、活死人墓等）。',
        progressText: (st) => `已勘破传世秘境：${Object.keys(st.clearedSecrets || {}).length} / 3 处`,
        isDone: (st) => Object.keys(st.clearedSecrets || {}).length >= 3,
        endingIdx: 1
      },
      {
        id: 'path_tycoon',
        name: '【道途五 · 富甲天下 · 隐庐巨擘】',
        tag: '无需主线·经营行商线',
        desc: '深耕洛水隐庐与九州跨区行商，将隐庐四大产业合计扩建至 6 级以上，且随身纹银达 350 文以上。',
        progressText: (st) => {
          const b = (st.estate && st.estate.buildings) || {};
          const totalLv = (b.winery||0) + (b.herbGarden||0) + (b.smithy||0) + (b.academy||0);
          return `隐庐总等级：${totalLv} / 6 级 · 随身纹银：${st.gold} / 350 文`;
        },
        isDone: (st) => {
          const b = (st.estate && st.estate.buildings) || {};
          const totalLv = (b.winery||0) + (b.herbGarden||0) + (b.smithy||0) + (b.academy||0);
          return totalLv >= 6 && st.gold >= 350;
        },
        endingIdx: 2
      },
      {
        id: 'path_patriot',
        name: '【道途六 · 侠之大者 · 边关柱石】',
        tag: '无需主线·侠义家国线',
        desc: '常驻襄阳、雁门关等雄关，侠义心性 ≥ 55，且与至少 2 位名宿推进完个人传记或好感达 80。',
        progressText: (st) => {
          const highFriends = st.masters.filter(m => m.affinity >= 80 || (m.storyStage || 0) >= 2).length;
          return `侠义心性：${st.karma.xiayi} / 55 · 莫逆知交：${highFriends} / 2 位`;
        },
        isDone: (st) => {
          const highFriends = st.masters.filter(m => m.affinity >= 80 || (m.storyStage || 0) >= 2).length;
          return st.karma.xiayi >= 55 && highFriends >= 2;
        },
        endingIdx: 0
      }
    ];
    const LEGACY_PERKS_DB = [
      { id: 'perk_luck',   cost: 50, name: '🌟【天命庇佑】', desc: '下周目摇先天命格时，摇出「三神无瑕命格」概率暴涨至 30%，且必出至少 1 项神品！' },
      { id: 'perk_estate', cost: 50, name: '🏡【前世祖业】', desc: '下周目开局洛水隐庐直接自带 1 级【杏花酒坊】与 1 级【百草药圃】，并赠 80 文创业银！' },
      { id: 'perk_sword',  cost: 80, name: '🗡️【传家重剑】', desc: '下周目开局直接继承神兵【玄铁重剑·仿】与奇珍【温玉护心佩】！' },
      { id: 'perk_taixuan',cost: 100,name: '📜【太玄残篇】', desc: '下周目开局直接领悟无上内功《太玄经神功》（第1重）与《斗转星移》（第1重）！' },
      { id: 'perk_hard',   cost: 0,  name: '🔥【宗师劫难模式】', desc: '免费高难挑战：全江湖强敌战力提升 +35%，过招获胜修为与赏银奖励额外 +50%！' }
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LIFE_PATHS_DB: LIFE_PATHS_DB, LEGACY_PERKS_DB: LEGACY_PERKS_DB, ENDINGS_DB: ENDINGS_DB };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { LIFE_PATHS_DB, LEGACY_PERKS_DB, ENDINGS_DB });
}
