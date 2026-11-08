/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-martial.cjs 生成，重跑覆盖
 * MARTIAL_DB + 招式/形/势/印记元数据 + SYNERGIES 羁绊 + ACUPOINTS 穴位
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L1422–L1427 · const STANCE_META
 * view/games/qunxia/game.html L1429–L1433 · const COMBO_ROLE_META
 * view/games/qunxia/game.html L1435–L1440 · const TOKEN_META
 * view/games/qunxia/game.html L1442–L1679 · const MARTIAL_DB
 * view/games/qunxia/game.html L1684–L1709 · const SYNERGIES_DB
 * view/games/qunxia/game.html L1711–L1720 · const ACUPOINTS_DB
 * ============================================================ */

    const STANCE_META = {
      gang: { name: '刚猛', badge: 'bg-red-800 text-red-100 border-red-400', beats: 'qiao', beatenBy: 'rou', desc: '以力破巧 · 克制【巧变】' },
      rou:  { name: '阴柔', badge: 'bg-purple-900 text-purple-100 border-purple-400', beats: 'gang', beatenBy: 'qiao', desc: '化劲卸力 · 克制【刚猛】' },
      qiao: { name: '巧变', badge: 'bg-teal-800 text-teal-100 border-teal-300', beats: 'rou', beatenBy: 'gang', desc: '快剑抢攻 · 克制【阴柔】' },
      inner:{ name: '护体绝招', badge: 'bg-amber-800 text-amber-100 border-amber-300', beats: 'all', beatenBy: 'none', desc: '真气爆发 · 引爆全身印记' }
    };
    const COMBO_ROLE_META = {
      qi:    { label: '【起势】', badge: 'bg-emerald-900 text-emerald-100', tip: '宜第1招打出，凝聚武道印记' },
      cheng: { label: '【承转】', badge: 'bg-sky-900 text-sky-100', tip: '宜第2招打出，借印记翻倍增幅或反震' },
      zhuan: { label: '【终结】', badge: 'bg-amber-800 text-amber-100', tip: '宜第3招打出，引爆印记造成巨额绝杀' }
    };
    const TOKEN_META = {
      jianyi:  { name: '剑意', icon: '🗡️', badge: 'bg-teal-900 text-teal-100 border-teal-400', desc: '每层提升20%破防伤害，引爆时追加真实剑气' },
      taiji:   { name: '太极劲', icon: '☯️', badge: 'bg-purple-900 text-purple-100 border-purple-400', desc: '每层减伤25%并将敌方40%劲力反震回去' },
      bagang:  { name: '霸罡', icon: '🔥', badge: 'bg-red-900 text-red-100 border-red-400', desc: '每层提升25%刚猛震伤，无视敌方护体' },
      beiming: { name: '北冥涡', icon: '🌀', badge: 'bg-sky-900 text-sky-100 border-sky-400', desc: '吸取敌方真气，削弱敌方25%攻击力' }
    };
    const MARTIAL_DB = {
      // ==================== 凡品筑基武学（小虾米起步初学） ====================
      basic_tuna: {
        id: 'basic_tuna', name: '粗浅吐纳功', type: 'inner', tier: 1, affinity: 'gang',
        bonusHp: 10, bonusMp: 10,
        passiveDesc: '【凡品筑基】市井武馆传授的基础呼吸法，每招微弱回气 +2',
        ultName: '丹田鼓荡·全力一击', ultPower: 28, ultCost: 14,
        poetry: '呼浊吸清固根本，百丈高楼平地起'
      },
      taizu_changquan: {
        id: 'taizu_changquan', name: '太祖长拳', type: 'move', tier: 1, stance: 'gang',
        comboRole: 'qi', tokenType: 'bagang', tokenGain: 1,
        power: 20, mpCost: 6,
        effectDesc: '【凡品·起势】凝聚 1 层【霸罡】，招式平实稳健，适合初涉江湖防身',
        poetry: '太祖盘龙传军阵，最是江湖筑基功'
      },
      mian_zhang: {
        id: 'mian_zhang', name: '匀息绵掌', type: 'move', tier: 1, stance: 'rou',
        comboRole: 'qi', tokenType: 'taiji', tokenGain: 1,
        power: 19, mpCost: 6,
        effectDesc: '【凡品·起势】凝聚 1 层【太极劲】，微幅恢复 8 点气血',
        poetry: '绵密如云守门户，柔劲初成可防身'
      },
      songfeng_jian: {
        id: 'songfeng_jian', name: '松风剑法', type: 'move', tier: 1, stance: 'qiao',
        comboRole: 'cheng', tokenType: 'jianyi', tokenGain: 1,
        power: 22, mpCost: 8,
        effectDesc: '【凡品·承转】凝聚 1 层【剑意】，乡野剑客入门剑招',
        poetry: '松间清风吹落叶，轻灵斜刺守中宫'
      },
      wuhu_dao: {
        id: 'wuhu_dao', name: '五虎断门刀', type: 'move', tier: 1, stance: 'gang',
        comboRole: 'zhuan', tokenType: 'bagang', tokenGain: 1,
        power: 25, mpCost: 10,
        effectDesc: '【凡品·终结】引爆已攒印记，每层追加 10 点外门劈砍伤',
        poetry: '市井镖师看家刀，大开大合劈门户'
      },

      luoying_jian: {
        id: 'luoying_jian', name: '落英神剑掌', type: 'move', stance: 'qiao',
        comboRole: 'qi', tokenType: 'jianyi', tokenGain: 2,
        power: 34, mpCost: 10,
        effectDesc: '【起势】凝聚 2 层【剑意】；破招时回复 12 点真气',
        poetry: '桃花纷飞似剑影，虚实相生乱人目'
      },
      lingbo_weibu: {
        id: 'lingbo_weibu', name: '凌波微步·掠影', type: 'move', stance: 'qiao',
        comboRole: 'qi', tokenType: 'beiming', tokenGain: 2,
        power: 35, mpCost: 8,
        effectDesc: '【起势】凝聚 2 层【北冥涡】与 1 层【剑意】，本招减伤 45% 并回气 15',
        poetry: '罗袜生尘踏周易，千军万马莫沾衣'
      },
      taiji_quan: {
        id: 'taiji_quan', name: '太极云手剑', type: 'move', stance: 'rou',
        comboRole: 'qi', tokenType: 'taiji', tokenGain: 2,
        power: 34, mpCost: 10,
        effectDesc: '【起势】凝聚 2 层【太极劲】，反震敌方 40% 伤害并恢复 18 点气血',
        poetry: '借力打力画阴阳，绵里藏针震敌腕'
      },
      babei_dao: {
        id: 'babei_dao', name: '塞北狂风刀', type: 'move', stance: 'gang',
        comboRole: 'qi', tokenType: 'bagang', tokenGain: 2,
        power: 36, mpCost: 11,
        effectDesc: '【起势】凝聚 2 层【霸罡】；破招时追加 16 点刚猛外伤',
        poetry: '黄沙万里卷寒刃，一刀劈碎护身罡'
      },
      dali_jingang: {
        id: 'dali_jingang', name: '少林大力金刚掌', type: 'move', stance: 'gang',
        comboRole: 'cheng', tokenType: 'bagang', tokenGain: 1,
        power: 44, mpCost: 14,
        effectDesc: '【承转】若已有【霸罡】则伤害+35%并获金身减伤 16 点',
        poetry: '钟鼓齐鸣金身现，一掌断碑裂山石'
      },
      dagou_bang: {
        id: 'dagou_bang', name: '打狗棒法·绊字诀', type: 'move', stance: 'qiao',
        comboRole: 'cheng', tokenType: 'jianyi', tokenGain: 1,
        power: 45, mpCost: 14,
        effectDesc: '【承转】封锁敌方下盘使敌方本招伤害减半，并叠 1 层【剑意】与【霸罡】',
        poetry: '棒影如林封八方，天下乞儿第一功'
      },
      jiuyin_zhua: {
        id: 'jiuyin_zhua', name: '九阴神爪·催心', type: 'move', stance: 'rou',
        comboRole: 'cheng', tokenType: 'taiji', tokenGain: 1,
        power: 46, mpCost: 15,
        effectDesc: '【承转】借印记之势吸取敌方 24 点气血补充自身',
        poetry: '五指如钩透阴风，摧敌护体真元于无形'
      },
      yunv_jian: {
        id: 'yunv_jian', name: '玉女素心剑', type: 'move', stance: 'qiao',
        comboRole: 'cheng', tokenType: 'jianyi', tokenGain: 2,
        power: 47, mpCost: 15,
        effectDesc: '【承转】双剑合璧连击两次，若已有【剑意】则额外追加 25 点伤害',
        poetry: '冷月寒星双剑合，古墓清辉映素心'
      },
      qiankun_nuoyi: {
        id: 'qiankun_nuoyi', name: '乾坤大挪移·牵引', type: 'move', stance: 'rou',
        comboRole: 'cheng', tokenType: 'taiji', tokenGain: 2,
        power: 48, mpCost: 16,
        effectDesc: '【承转】乾坤颠倒！无视路数被克，将敌方本招 65% 伤害原数奉还！',
        poetry: '激发人体潜能极境，牵引挪移敌手千钧劲力'
      },
      tanzhi_shentong: {
        id: 'tanzhi_shentong', name: '弹指神通·惊雷', type: 'move', stance: 'qiao',
        comboRole: 'cheng', tokenType: 'jianyi', tokenGain: 1,
        power: 46, mpCost: 14,
        effectDesc: '【承转】指力破空，打断敌方蓄势并抽取敌方 18 点真气',
        poetry: '弹指一挥惊雷起，石破天惊落九霄'
      },
      dugu_jiujian: {
        id: 'dugu_jiujian', name: '独孤九剑·破式', type: 'move', stance: 'qiao',
        comboRole: 'zhuan', tokenType: 'jianyi', tokenGain: 1,
        power: 50, mpCost: 16,
        effectDesc: '【终结】引爆所有【剑意】印记，每层追加 26 点无视防御破绽剑伤！',
        poetry: '无招胜有招，直指敌手气机流转之破绽'
      },
      xianglong_zhang: {
        id: 'xianglong_zhang', name: '降龙十八掌·亢龙', type: 'move', stance: 'gang',
        comboRole: 'zhuan', tokenType: 'bagang', tokenGain: 1,
        power: 54, mpCost: 18,
        effectDesc: '【终结】引爆所有【霸罡】印记，每层追加 28 点刚猛震伤！',
        poetry: '亢龙有悔掌风啸，刚猛无俦冠绝天下'
      },
      anran_zhang: {
        id: 'anran_zhang', name: '黯然销魂掌', type: 'move', stance: 'rou',
        comboRole: 'zhuan', tokenType: 'taiji', tokenGain: 1,
        power: 52, mpCost: 16,
        effectDesc: '【终结】引爆【太极劲/剑意】，自身气血低于 65% 时伤害暴涨 40%！',
        poetry: '心惊肉跳意阑珊，情至深处掌力自生'
      },
      liumai_shenjian: {
        id: 'liumai_shenjian', name: '六脉神剑·少泽', type: 'move', stance: 'qiao',
        comboRole: 'zhuan', tokenType: 'beiming', tokenGain: 1,
        power: 56, mpCost: 20,
        effectDesc: '【终结】引爆所有【北冥涡/剑意】，每层印记化作一脉剑气追加 28 点伤害！',
        poetry: '指端剑气纵横出，商阳少泽破万军'
      },
      huoyan_dao: {
        id: 'huoyan_dao', name: '密宗火焰刀', type: 'move', stance: 'gang',
        comboRole: 'zhuan', tokenType: 'bagang', tokenGain: 1,
        power: 51, mpCost: 17,
        effectDesc: '【终结】虚空凝火，引爆【霸罡】焚烧敌方气血与真气',
        poetry: '无形刀气凝烈焰，大轮梵音震雪山'
      },

      // ==================== 扩充金庸正邪奇功与暗器毒术 ====================
      hujia_daofa: {
        id: 'hujia_daofa', name: '胡家刀法·缠身', type: 'move', tier: 2, stance: 'gang',
        comboRole: 'qi', tokenType: 'bagang', tokenGain: 2,
        power: 38, mpCost: 11,
        effectDesc: '【起势】辽东大侠家传绝学，刀法细腻如剑，凝聚 2 层【霸罡】并追加 12 点破绽伤',
        poetry: '飞狐踏雪刀光冷，四象步法守中宫'
      },
      wudu_shenzhang: {
        id: 'wudu_shenzhang', name: '五毒赤练掌', type: 'move', tier: 2, stance: 'rou',
        comboRole: 'cheng', tokenType: 'taiji', tokenGain: 2,
        power: 45, mpCost: 14,
        effectDesc: '【承转】苗疆奇毒入掌，凝聚 2 层【太极劲】并噬取敌方 22 点气血化为己用',
        poetry: '金蚕万蛇随烟起，谈笑之间染碧霜'
      },
      douzhuan_xingyi: {
        id: 'douzhuan_xingyi', name: '斗转星移·还施', type: 'move', tier: 3, stance: 'rou',
        comboRole: 'cheng', tokenType: 'taiji', tokenGain: 2,
        power: 49, mpCost: 16,
        effectDesc: '【承转】姑苏慕容绝学！以彼之道还施彼身，反弹敌方本招 70% 伤害并叠 2 层【太极劲】',
        poetry: '借力打力移星斗，天下武学尽还施'
      },
      tangmen_lihua: {
        id: 'tangmen_lihua', name: '唐门暴雨梨花', type: 'move', tier: 2, stance: 'qiao',
        comboRole: 'zhuan', tokenType: 'jianyi', tokenGain: 1,
        power: 49, mpCost: 15,
        effectDesc: '【终结】蜀中唐门机簧奇器，引爆【剑意】无视护甲发射二十七枚银针！',
        poetry: '暴雨梨花一匣开，夺魄追魂莫能猜'
      },
      kuihua_jian: {
        id: 'kuihua_jian', name: '葵花鬼影剑', type: 'move', tier: 3, stance: 'qiao',
        comboRole: 'zhuan', tokenType: 'jianyi', tokenGain: 2,
        power: 58, mpCost: 18,
        effectDesc: '【终结】黑木崖鬼魅绝学！引爆所有【剑意】，每层追加 30 点极速穿刺且令敌方本招伤害减半',
        poetry: '日出东方唯我不败，鬼影一闪血溅五步'
      },
      taixuan_jing: {
        id: 'taixuan_jing', name: '太玄经神功', type: 'inner', tier: 3, affinity: 'qiao',
        bonusHp: 65, bonusMp: 65,
        passiveDesc: '【侠客岛至高神功】浑然天成：全路数招式威力 +24%，开局获【剑意】【霸罡】各 1 层，每招回气 +10',
        ultName: '白首太玄·飒沓流星', ultPower: 66, ultCost: 24,
        poetry: '赵客缦胡缨，吴钩霜雪明；十步杀一人，千里不留行'
      },
      xixing_dafa: {
        id: 'xixing_dafa', name: '吸星大法', type: 'inner', tier: 3, affinity: 'rou',
        bonusHp: 35, bonusMp: 70,
        passiveDesc: '【黑木崖霸道魔功】交手时强行吸取敌方 18 点真气补充自身，阴柔与巧变招式威力 +22%',
        ultName: '黑木噬元·万壑归墟', ultPower: 61, ultCost: 22,
        poetry: '丹田空空如深谷，任尔绝顶内力尽化吾用'
      },
      huagong_dafa: {
        id: 'huagong_dafa', name: '星宿化功大法', type: 'inner', tier: 2, affinity: 'rou',
        bonusHp: 30, bonusMp: 50,
        passiveDesc: '【西域毒宗内功】以神木王鼎剧毒化人内力，交手削减敌方真气并附加 +12 毒伤',
        ultName: '腐尸神木·化骨绵毒', ultPower: 53, ultCost: 20,
        poetry: '星宿老仙法驾西域，化功散元神仙难救'
      },
      // 五大内功心法
      jiuyang_shengong: {
        id: 'jiuyang_shengong', name: '九阳神功', type: 'inner', affinity: 'gang',
        bonusHp: 45, bonusMp: 35,
        passiveDesc: '【刚猛】威力 +20%，开局自带 1 层【霸罡】，每招回气 +8',
        ultName: '九阳护体·金乌焚天', ultPower: 58, ultCost: 26,
        poetry: '他强由他强，清风拂山岗；九阳真气生生不息'
      },
      zixia_shengong: {
        id: 'zixia_shengong', name: '紫霞神功', type: 'inner', affinity: 'qiao',
        bonusHp: 30, bonusMp: 45,
        passiveDesc: '【巧变】威力 +20%，开局自带 1 层【剑意】，耗气降低 20%',
        ultName: '紫气东来·万剑归宗', ultPower: 54, ultCost: 22,
        poetry: '华山九功第一紫霞，面如紫玉，剑气凌霄'
      },
      beiming_shengong: {
        id: 'beiming_shengong', name: '北冥神功', type: 'inner', affinity: 'rou',
        bonusHp: 35, bonusMp: 55,
        passiveDesc: '【阴柔】威力 +20%，开局自带 1 层【北冥涡】，交手吸取敌方真气',
        ultName: '北冥鲲跃·万川归海', ultPower: 56, ultCost: 24,
        poetry: '北冥有鱼其名为鲲，百川汇海化人内力'
      },
      yijin_jing: {
        id: 'yijin_jing', name: '少林易筋经', type: 'inner', affinity: 'gang',
        bonusHp: 60, bonusMp: 45,
        passiveDesc: '佛门至高内功：所受伤害减免 22%，开局获【霸罡】与【太极劲】各 1 层',
        ultName: '易筋洗髓·金刚不坏', ultPower: 60, ultCost: 26,
        poetry: '达摩西来一字无，全凭心意用功夫'
      },
      xiaowuxiang_gong: {
        id: 'xiaowuxiang_gong', name: '小无相功', type: 'inner', affinity: 'rou',
        bonusHp: 40, bonusMp: 55,
        passiveDesc: '无相无迹：所有招式均可触发内功共鸣加成 (+18%)，开局获 1 层【太极劲】',
        ultName: '无相森罗·万法皆空', ultPower: 57, ultCost: 24,
        poetry: '不着形相，无迹可寻，模拟天下诸般绝学'
      }
    };
    const SYNERGIES_DB = [
      {
        id: 'syn_sword_god',
        name: '华山剑神',
        desc: '装备【紫霞神功】或至少 2 门剑法/巧变招式：开局额外 +1 层【剑意】，破招伤害额外 +20%',
        check: (st) => st.equippedInner === 'zixia_shengong' || st.equippedMoves.filter(m => MARTIAL_DB[m]?.stance === 'qiao').length >= 2
      },
      {
        id: 'syn_dragon_hero',
        name: '亢龙霸体',
        desc: '装备【九阳/易筋经】或至少 2 门刚猛招式：开局额外 +1 层【霸罡】，刚猛招式附带 +15 破甲伤',
        check: (st) => (st.equippedInner === 'jiuyang_shengong' || st.equippedInner === 'yijin_jing') && st.equippedMoves.some(m => MARTIAL_DB[m]?.stance === 'gang')
      },
      {
        id: 'syn_taiji_master',
        name: '阴阳太极',
        desc: '同时佩带《太极云手剑》或《乾坤大挪移》：开局额外 +1 层【太极劲】，每招自动反弹 30% 伤害',
        check: (st) => st.equippedMoves.includes('taiji_quan') || st.equippedMoves.includes('qiankun_nuoyi')
      },
      {
        id: 'syn_beiming_immortal',
        name: '逍遥北冥',
        desc: '装备【北冥/小无相功】且配《凌波微步》或《六脉神剑》：每招吸取敌方 12 真气转化为自身护盾',
        check: (st) => (st.equippedInner === 'beiming_shengong' || st.equippedInner === 'xiaowuxiang_gong')
      }
    ];
    const ACUPOINTS_DB = [
      { id: 'baihui',   name: '督脉·百会穴', cx: 130, cy: 24, cost: 90,  reqRealm: 1, bonusDesc: '真气上限 +20，开局额外 +1 层【剑意】（需略有小成）', hp: 0, mp: 20, atk: 4 },
      { id: 'fengchi',  name: '阳维·风池穴', cx: 92,  cy: 50, cost: 135, reqRealm: 1, bonusDesc: '身法精进，巧变与轻功招式威力 +8（需略有小成）', hp: 10, mp: 10, atk: 6 },
      { id: 'shanzhong',name: '任脉·膻中穴', cx: 130, cy: 70, cost: 190, reqRealm: 2, bonusDesc: '护体真气凝练，气血上限 +30（需境界：融会贯通）', hp: 30, mp: 0, atk: 4 },
      { id: 'quchi',    name: '手阳明·曲池穴',cx: 172, cy: 76, cost: 250, reqRealm: 2, bonusDesc: '拳掌刀剑发力贯通，全招式威力 +8（需境界：融会贯通）', hp: 10, mp: 0, atk: 8 },
      { id: 'qihai',    name: '任脉·气海穴', cx: 130, cy: 112,cost: 320, reqRealm: 3, bonusDesc: '丹田如海，真气上限 +25（需境界：登峰造极）', hp: 15, mp: 25, atk: 5 },
      { id: 'mingmen',  name: '督脉·命门穴', cx: 88,  cy: 118,cost: 400, reqRealm: 3, bonusDesc: '先天元气稳固，气血上限 +35（需境界：登峰造极）', hp: 35, mp: 10, atk: 5 },
      { id: 'guanyuan', name: '任脉·关元穴', cx: 130, cy: 146,cost: 490, reqRealm: 4, bonusDesc: '三才印记爆发伤害提升 +25%（需境界：一代宗师）', hp: 20, mp: 20, atk: 10 },
      { id: 'yongquan', name: '足少阴·涌泉穴',cx: 172, cy: 152,cost: 600, reqRealm: 4, bonusDesc: '行脚精力上限 +1（升至 6 点，需境界：一代宗师）', hp: 15, mp: 15, atk: 6, apUp: 1 }
    ];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STANCE_META: STANCE_META, COMBO_ROLE_META: COMBO_ROLE_META, TOKEN_META: TOKEN_META, MARTIAL_DB: MARTIAL_DB, SYNERGIES_DB: SYNERGIES_DB, ACUPOINTS_DB: ACUPOINTS_DB };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { STANCE_META, COMBO_ROLE_META, TOKEN_META, MARTIAL_DB, SYNERGIES_DB, ACUPOINTS_DB });
}
