/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-regions.cjs 生成，重跑覆盖
 * REGIONS 30 地界（七格本境 + 邻接图）+ MAIN_QUEST_CHAPTERS 主线 + REALM_NAMES 境界 + SEASONS/XUNS 旬历
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L2229–L2229 · const REALM_NAMES
 * view/games/qunxia/game.html L2231–L2313 · const MAIN_QUEST_CHAPTERS
 * view/games/qunxia/game.html L2903–L2903 · const SEASONS
 * view/games/qunxia/game.html L2904–L2904 · const XUNS
 * view/games/qunxia/game.html L1805–L2227 · const REGIONS
 * ============================================================ */

    const REALM_NAMES = ['初窥门径', '略有小成', '融会贯通', '登峰造极', '一代宗师', '返璞归真'];
    const MAIN_QUEST_CHAPTERS = [
      {
        step: 0,
        actName: '第一卷 · 孤剑寻踪',
        title: '第一章：太白夜饮寻剑令',
        region: 'luoyang',
        tileIdx: 1,
        reqRealm: 1, reqFame: 30, reqTurn: 1, apCost: 1,
        shortHint: '赴【洛阳 · 太白酒肆】寻访令狐冲，查探玄铁剑令与血衣楼刺客下落',
        summary: '师尊临终遗留半枚「玄铁剑令」，指向洛阳太白酒肆。传闻华山令狐冲近日在酒肆中见过佩戴相同血衣徽记的神秘剑客。',
        speaker: { avatar: '令', name: '令狐冲 · 华山剑侠', quote: '“兄台腰间这半枚玄铁剑令，怎地与方才那伙血衣人追查之物一模一样？”' },
        narrative: [
          '洛阳太白酒肆内酒香四溢，你刚亮出腰间的半枚玄铁剑令，邻桌一名身穿青衫、腰悬长剑的潇洒青年便举壶笑迎。',
          '令狐冲低声告知：半个时辰前，【玄冥血衣楼】先锋「青蝠剑客」携第一卷《山河残卷》上了城南的【洛水画舫】，更扬言要在聚贤庄设计构陷北乔峰！'
        ],
        choices: [
          {
            label: '【侠义】“多谢令狐兄指点！在下去画舫夺回残卷，绝不让奸人害了乔帮主！”（耗1行脚，侠义+15，修为+25）',
            karma: { xiayi: 15, kuangao: 0, xiaoyao: 0 },
            onSelect: () => {
              state.exp += 25;
              advanceMainQuest(1, '于太白酒肆得令狐冲指点，锁定【洛阳·洛水画舫】之血衣楼先锋！');
            }
          },
          {
            label: '【逍遥】先与令狐冲痛饮三大碗洛阳美酒，再乘醉色夜探画舫（耗1行脚，逍遥+15，真气上限+8）',
            karma: { xiayi: 0, kuangao: 0, xiaoyao: 15 },
            onSelect: () => {
              state.maxMp += 8;
              state.mp = state.maxMp;
              advanceMainQuest(1, '与令狐冲痛饮结交后，锁定【洛阳·洛水画舫】之血衣楼刺客！');
            }
          }
        ]
      },
      {
        step: 1,
        actName: '第一卷 · 孤剑寻踪',
        title: '第二章：洛水画舫斩青蝠',
        region: 'luoyang',
        tileIdx: 6,
        reqRealm: 1, reqFame: 35, reqTurn: 1, apCost: 1,
        shortHint: '赴【洛阳 · 洛水画舫】击败血衣楼先锋「青蝠剑客」，夺回第一份《山河残卷》',
        summary: '血衣楼先锋「青蝠剑客」正泊舟于洛水画舫之上，唯有将其击败，方能夺回师门遗失的第一卷《山河残卷·洛水篇》。',
        speaker: { avatar: '蝠', name: '青蝠剑客 · 血衣楼先锋', quote: '“十年前昆仑山没斩草除根，今日你竟敢主动送上门来！”' },
        narrative: [
          '夜雾笼罩洛水，你踏波跃上画舫甲板。烛火摇曳间，一名身披暗红血衣的剑客冷笑拔剑，剑尖寒芒吐吞！',
          '此人剑路轻灵诡谲，乃是【巧变】路数好手，击败他即可夺回第一卷残篇！'
        ],
        choices: [
          {
            label: '⚔️ 【拔剑迎战】“血衣楼欠我师门血债，今日先拿你祭剑！”（耗1行脚，进入主线三招对决）',
            karma: { xiayi: 10, kuangao: 10, xiaoyao: 0 },
            onSelect: () => {
              startDuel({
                enemyName: '青蝠剑客·血衣先锋',
                enemyTitle: '玄冥血衣楼 · 诡快剑客',
                enemyAvatar: '蝠',
                enemyStance: 'qiao',
                enemyPower: 60,
                enemyHp: 135,
                contextTitle: '📜 主线第二章 · 洛水画舫夺残卷',
                rewardGold: 35,
                rewardFame: 20,
                rewardExp: 40,
                mainQuestAdvanceTo: 2,
                mainQuestLog: '于洛水画舫三招斩落青蝠剑客，夺回《山河残卷·其一》，获悉聚贤庄阴谋！'
              });
            }
          }
        ]
      },
      {
        step: 2,
        actName: '传世终章 · 笑傲山河',
        title: '山河已定 · 自由行脚与群侠传记',
        region: 'huashan',
        tileIdx: 6,
        reqRealm: 0, reqFame: 0, reqTurn: 1, apCost: 0,
        shortHint: '主线已交棒天下大事：36 桩世界事件按旬到期（华山论剑第 35 旬终局）。可继续游历完结名宿传记',
        summary: '序章血衣楼之谜已交棒 36 桩天下大事——去不去、站哪边、赌不赌，每一旬由你落子。可继续漫步十三地界、完结名宿传记，或随时开启新周目。'
      }
    ];
    const SEASONS = ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬'];
    const XUNS = ['上旬', '中旬', '下旬'];
    const REGIONS = [
      {
        id: 'luoyang', zone: 'zhongyuan', name: '洛阳', subtitle: '中原枢机 · 牡丹王都', tag: '繁华王都', faction: '六扇门 / 聚贤庄',
        x: 520, y: 245, neighbors: ['shaolin', 'changan', 'xiangyang', 'huashan', 'kaifeng'],
        desc: '九朝古都，天下水陆交汇之所。南市酒旗招展，聚贤庄内更是群豪云集。',
        tiles: [
          { id: 'ly_0', name: '南市渡口', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '洛水舟船靠岸之地，南北镖客在此换乘歇脚。' },
          { id: 'ly_1', name: '太白酒肆', type: 'tavern', x: 310, y: 180, next: [0, 3, 4], desc: '洛阳最热闹的酒楼，可饮酒回气、投宿过旬、揭榜悬赏。' },
          { id: 'ly_2', name: '铜驼铁铺', type: 'market', x: 320, y: 420, next: [0, 4, 6], desc: '炉火彻夜不熄，贩售名家百炼兵刃、内甲与神兵淬炼。' },
          { id: 'ly_3', name: '白马禅寺', type: 'shrine', x: 520, y: 130, next: [1, 5], desc: '中原古刹，钟声悠远，可在此静心吐纳参悟武学。' },
          { id: 'ly_4', name: '聚贤庄正堂', type: 'arena', x: 540, y: 300, next: [1, 2, 5, 6], desc: '游氏双雄待客之所，英雄宴开启时天下豪杰皆聚于此。' },
          { id: 'ly_5', name: '牡丹花会', type: 'scenic', x: 760, y: 175, next: [3, 4, 6], desc: '国色天香冠绝神州，常有名门公子和江湖奇女子驻足。' },
          { id: 'ly_6', name: '洛水画舫', type: 'secret', x: 780, y: 400, next: [2, 4, 5], desc: '夜泊洛水之烟波画舫，血衣楼密探与隐世高人常在此秘会。' }
        ]
      },
      {
        id: 'shaolin', zone: 'zhongyuan', name: '嵩山少林', subtitle: '禅宗祖庭 · 武学泰斗', tag: '名门泰斗', faction: '嵩山少林派',
        x: 615, y: 210, neighbors: ['luoyang', 'xiangyang', 'kaifeng', 'heimuya'],
        desc: '天下武功出少林。少室山古柏参天，藏经阁内收纳七十二绝技。',
        tiles: [
          { id: 'sl_0', name: '少室山门', type: 'entry', x: 140, y: 300, next: [1, 2], desc: '古刹山门巍峨，知客僧在此查验往来香客与拜山武人。' },
          { id: 'sl_1', name: '知客禅院', type: 'tavern', x: 320, y: 180, next: [0, 3], desc: '备有少林素斋与清茶，可在此歇息恢复精力。' },
          { id: 'sl_2', name: '罗汉演武堂', type: 'sect', x: 330, y: 410, next: [0, 3, 5], desc: '十八罗汉木人巷所在，少林武僧日夜在此演练刚猛掌法。' },
          { id: 'sl_3', name: '大雄宝殿', type: 'arena', x: 530, y: 280, next: [1, 2, 4, 5], desc: '香火鼎盛之主殿，每逢武林大会，高僧皆在此主持公道。' },
          { id: 'sl_4', name: '藏经阁', type: 'secret', x: 730, y: 155, next: [3, 6], desc: '梵音阵阵，阁内扫地老僧深不可测，偶可窥见绝世残篇。' },
          { id: 'sl_5', name: '般若药局', type: 'market', x: 680, y: 430, next: [2, 3, 6], desc: '少林秘制大还丹与小还丹，疗伤固本天下无双。' },
          { id: 'sl_6', name: '达摩面壁洞', type: 'shrine', x: 860, y: 290, next: [4, 5], desc: '后山五乳峰石洞，石壁留有达摩祖师面壁九年之剑意禅影。' }
        ]
      },
      {
        id: 'huashan', zone: 'zhongyuan', name: '华山', subtitle: '奇险第一 · 论剑绝顶', tag: '五岳剑派', faction: '华山剑派',
        x: 415, y: 225, neighbors: ['changan', 'luoyang', 'zhongnan', 'gumu', 'heimuya', 'yanmenguan'],
        desc: '西岳奇险甲天下，苍龙岭剑气冲霄，绝顶更是五绝论剑之圣地。',
        tiles: [
          { id: 'hs_0', name: '玉泉山院', type: 'entry', x: 140, y: 360, next: [1, 2], desc: '华山脚下道观，登山剑客皆在此整束行装。' },
          { id: 'hs_1', name: '山脚茶肆', type: 'tavern', x: 300, y: 440, next: [0, 2], desc: '售卖关中烈酒与热汤面，常有华山弟子下山采买。' },
          { id: 'hs_2', name: '千尺幢险道', type: 'scenic', x: 340, y: 240, next: [0, 1, 3], desc: '石阶直立如削，唯有轻功俊杰方能履险如夷。' },
          { id: 'hs_3', name: '正气剑堂', type: 'sect', x: 540, y: 280, next: [2, 4, 5], desc: '华山派掌门授艺之堂，堂前紫气氤氲，剑鸣不绝。' },
          { id: 'hs_4', name: '玉女祠', type: 'market', x: 640, y: 430, next: [3, 6], desc: '峰腰清幽之地，有铸剑师在此交换名剑谱与华山丹药。' },
          { id: 'hs_5', name: '思过崖山洞', type: 'secret', x: 680, y: 140, next: [3, 6], desc: '崖壁石洞内刻有五岳剑派破招图形与风清扬前辈剑意！' },
          { id: 'hs_6', name: '华山论剑台', type: 'arena', x: 860, y: 270, next: [4, 5], desc: '云海苍茫之绝顶，三年之期满时天下群豪皆在此一决巅峰！' }
        ]
      },
      {
        id: 'changan', zone: 'jingxiang', name: '长安', subtitle: '关中王气 · 侠影古都', tag: '雄城古都', faction: '关中豪侠盟',
        x: 325, y: 200, neighbors: ['huashan', 'zhongnan', 'luoyang', 'guangming', 'yanmenguan', 'lingjiu'],
        desc: '百二秦关终属楚，长安朱雀大街商旅不绝，西域胡商与关中刀客混杂。',
        tiles: [
          { id: 'ca_0', name: '朱雀城门', type: 'entry', x: 140, y: 290, next: [1, 2], desc: '古城墙高耸入云，城门榜文张贴着朝廷与江湖重金悬赏。' },
          { id: 'ca_1', name: '西市胡姬酒肆', type: 'tavern', x: 320, y: 170, next: [0, 3, 4], desc: '蒲桃美酒夜光杯，西域奇人与关中刀客在此豪饮。' },
          { id: 'ca_2', name: '百炼兵甲坊', type: 'market', x: 330, y: 420, next: [0, 4, 5], desc: '关中第一名匠坐镇，专铸斩马重刃与护心宝镜。' },
          { id: 'ca_3', name: '大雁古塔', type: 'shrine', x: 540, y: 145, next: [1, 6], desc: '登高远眺秦川八百里，塔顶罡风凛冽，最宜锤炼内息。' },
          { id: 'ca_4', name: '振远大镖局', type: 'sect', x: 540, y: 310, next: [1, 2, 5, 6], desc: '威震西北之总镖局，常有走镖护宝差事与外功传授。' },
          { id: 'ca_5', name: '曲江芙蓉园', type: 'scenic', x: 720, y: 430, next: [2, 4, 6], desc: '亭台水榭掩映柳色，夜半时分却常有高手在此私下约战。' },
          { id: 'ca_6', name: '未央宫废墟', type: 'secret', x: 840, y: 260, next: [3, 4, 5], desc: '前朝荒芜宫苑，断壁残垣间埋藏着失传已久的古武帛书。' }
        ]
      },
      {
        id: 'zhongnan', zone: 'jingxiang', name: '终南山', subtitle: '活死人墓 · 重阳遗风', tag: '清修圣地', faction: '终南古墓派',
        x: 350, y: 315, neighbors: ['changan', 'huashan', 'wudang', 'emei', 'gumu', 'tangmen'],
        desc: '终南阴岭秀，积雪浮云端。重阳宫道法森严，后山活死人墓更添神秘。',
        tiles: [
          { id: 'zn_0', name: '终南山径', type: 'entry', x: 140, y: 320, next: [1, 2], desc: '古木森森，石阶覆苔，山风中隐约传来道家钟磬之声。' },
          { id: 'zn_1', name: '山腰野茶寮', type: 'tavern', x: 310, y: 430, next: [0, 3], desc: '老道人所设竹棚茶寮，一碗苦丁山泉可涤荡内伤疲乏。' },
          { id: 'zn_2', name: '重阳大殿', type: 'sect', x: 350, y: 180, next: [0, 3, 4], desc: '终南山授艺重地，可在此拜入古墓/全真一脉参悟上乘武学。' },
          { id: 'zn_3', name: '后山古墓口', type: 'arena', x: 540, y: 300, next: [1, 2, 5, 6], desc: '墓门石碑刻着「活死人墓」，非有缘之人不得轻入。' },
          { id: 'zn_4', name: '炼丹道房', type: 'market', x: 640, y: 140, next: [2, 5], desc: '道士炼制玉蜂浆与紫金丹之所，灵药香气袭人。' },
          { id: 'zn_5', name: '寒玉石床室', type: 'shrine', x: 760, y: 260, next: [3, 4, 6], desc: '古墓千年寒玉床，卧之练功一年抵常人十年苦修！' },
          { id: 'zn_6', name: '重阳遗刻石室', type: 'secret', x: 830, y: 430, next: [3, 5], desc: '石室顶上隐刻《九阴真经》总纲与《山河武典》中卷秘要！' }
        ]
      },
      {
        id: 'wudang', zone: 'jingxiang', name: '武当山', subtitle: '太极玄门 · 紫霄云海', tag: '玄门泰斗', faction: '武当玄门',
        x: 485, y: 360, neighbors: ['zhongnan', 'xiangyang', 'emei', 'gumu'],
        desc: '七十二峰朝大顶，张三丰真人在此创立太极拳剑，以柔克刚名震寰宇。',
        tiles: [
          { id: 'wd_0', name: '解剑石牌坊', type: 'entry', x: 140, y: 300, next: [1, 2], desc: '凡登武当山者，无论名声多显，至此皆须解剑示敬。' },
          { id: 'wd_1', name: '太和茶馆', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '武当道茶清冽回甘，往来侠士常在此论道养气。' },
          { id: 'wd_2', name: '紫霄宫大殿', type: 'sect', x: 340, y: 400, next: [0, 3, 4], desc: '武当七侠议事授徒之殿，真武七截阵气势如虹。' },
          { id: 'wd_3', name: '太极广场', type: 'arena', x: 540, y: 280, next: [1, 2, 4, 5], desc: '青石铺就的巨幅阴阳双鱼图，道长们在此切磋推手化劲。' },
          { id: 'wd_4', name: '丹剑道院', type: 'market', x: 670, y: 430, next: [2, 3, 6], desc: '供应松纹古定剑、太极道袍与天王护心丹。' },
          { id: 'wd_5', name: '后山竹庐', type: 'shrine', x: 720, y: 150, next: [3, 6], desc: '张三丰真人闭关静思之竹庐，云雾缭绕，道韵天成。' },
          { id: 'wd_6', name: '天柱金顶', type: 'secret', x: 860, y: 290, next: [4, 5], desc: '武当最高峰，观云海翻腾可领悟「以慢打快、后发先至」之极意。' }
        ]
      },
      {
        id: 'xiangyang', zone: 'jingxiang', name: '襄阳', subtitle: '江汉雄关 · 侠之大者', tag: '边塞雄关', faction: '中原丐帮',
        x: 595, y: 350, neighbors: ['luoyang', 'shaolin', 'wudang', 'jiangnan', 'hengyang'],
        desc: '汉水横襟，铁骑叩关。郭靖黄蓉率中原群豪在此死守城池，尽显侠之大者。',
        tiles: [
          { id: 'xy_0', name: '汉水北津渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '战船巡弋，烽烟隐现，各路义士纷纷渡江入城助阵。' },
          { id: 'xy_1', name: '君山丐帮舵口', type: 'tavern', x: 310, y: 175, next: [0, 3, 4], desc: '丐帮弟子互通军情之酒棚，大碗烧刀子配叫花鸡最能壮胆。' },
          { id: 'xy_2', name: '随军军械司', type: 'market', x: 330, y: 425, next: [0, 4, 5], desc: '名匠融玄铁残片铸造神兵甲胄，凭侠名与纹银即可换取。' },
          { id: 'xy_3', name: '郭府大校场', type: 'sect', x: 540, y: 165, next: [1, 4, 6], desc: '郭大侠与丐帮长老授艺之所，可在此拜入丐帮习得降龙掌与打狗棒。' },
          { id: 'xy_4', name: '襄阳北城楼', type: 'arena', x: 550, y: 330, next: [1, 2, 3, 5, 6], desc: '箭痕累累之雄关城头，血衣楼与敌军联手布下十绝阵叩关！' },
          { id: 'xy_5', name: '忠烈校场', type: 'shrine', x: 740, y: 430, next: [2, 4, 6], desc: '将士操练演武之地，杀气盈野，锤炼招式事半功倍。' },
          { id: 'xy_6', name: '独孤剑冢幽谷', type: 'secret', x: 850, y: 240, next: [3, 4, 5], desc: '襄阳城南深谷，神雕守候着剑魔独孤求败遗留之玄铁剑意！' }
        ]
      },
      {
        id: 'jiangnan', zone: 'jiangnan', name: '嘉兴烟雨', subtitle: '烟雨楼台 · 杏花酒家', tag: '水乡重镇', faction: '江南七怪 / 曼陀山庄',
        x: 745, y: 335, neighbors: ['xiangyang', 'taohua', 'yanziwu', 'linan'],
        desc: '南朝四百八十寺，多少楼台烟雨中。嘉兴烟雨楼与姑苏燕子坞皆在其中。',
        tiles: [
          { id: 'jn_0', name: '运河画舫埠', type: 'entry', x: 140, y: 300, next: [1, 2], desc: '乌篷船摇橹穿桥，江南才子与佩剑侠女往来如织。' },
          { id: 'jn_1', name: '太湖醉仙楼', type: 'tavern', x: 320, y: 175, next: [0, 3, 4], desc: '江南名酒碧螺春与女儿红，楼上常有豪杰赌酒比武。' },
          { id: 'jn_2', name: '姑苏珍宝阁', type: 'market', x: 330, y: 420, next: [0, 4, 5], desc: '汇集江南巧匠打造的软猬内甲、暗器机簧与古籍善本。' },
          { id: 'jn_3', name: '嘉兴烟雨楼', type: 'arena', x: 540, y: 260, next: [1, 4, 6], desc: '南湖中心孤岛楼阁，烟波浩渺，历来是江湖恩怨了结之地。' },
          { id: 'jn_4', name: '铁枪古庙', type: 'scenic', x: 560, y: 430, next: [1, 2, 3, 6], desc: '荒郊古庙昏鸦绕树，隐有昔年大漠与江南恩怨之遗迹。' },
          { id: 'jn_5', name: '曼陀茶花坞', type: 'shrine', x: 750, y: 165, next: [3, 6], desc: '遍植奇品茶花之水榭，琅嬛玉洞内藏尽天下各派武学图谱。' },
          { id: 'jn_6', name: '琴韵听水榭', type: 'secret', x: 850, y: 340, next: [3, 4, 5], desc: '阿朱阿碧抚琴小筑，水声琴音相合，最宜参悟巧变剑理。' }
        ]
      },
      {
        id: 'taohua', zone: 'jiangnan', name: '桃花岛', subtitle: '东海碧波 · 奇门五行', tag: '海外奇境', faction: '东海桃花岛',
        x: 890, y: 320, neighbors: ['jiangnan', 'yanziwu', 'linan', 'xiakedao', 'binghuodao'],
        desc: '东海孤岛桃花似锦，阵法按伏羲八卦排布，东邪黄药师吹箫碧海。',
        tiles: [
          { id: 'th_0', name: '白沙海滩渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '海浪拍岸，桃林夹道，不懂五行生克者寸步难行。' },
          { id: 'th_1', name: '九宫桃花阵', type: 'scenic', x: 330, y: 190, next: [0, 3, 4], desc: '桃花繁茂随风移步，穿行其间可大幅磨砺身法巧变。' },
          { id: 'th_2', name: '哑仆药庐', type: 'market', x: 340, y: 420, next: [0, 4], desc: '炼制桃花岛独门「九花玉露丸」与「田七鲨胆散」。' },
          { id: 'th_3', name: '弹指试剑亭', type: 'sect', x: 550, y: 220, next: [1, 4, 5], desc: '桃花岛授艺试剑之亭，东邪门人常在此考校奇门武学与弹指神通。' },
          { id: 'th_4', name: '竹林绿竹轩', type: 'tavern', x: 560, y: 390, next: [1, 2, 3, 6], desc: '清茶一盏，玉箫一曲，在此小憩顿觉神清气爽。' },
          { id: 'th_5', name: '清音幽洞', type: 'secret', x: 770, y: 170, next: [3, 6], desc: '周伯通昔年困居之山洞，石壁刻有《九阴真经》与空明拳意！' },
          { id: 'th_6', name: '碧海潮生崖', type: 'shrine', x: 850, y: 350, next: [4, 5], desc: '海涛如雷拍击危崖，听涛吐纳可令内息绵长不绝。' }
        ]
      },
      {
        id: 'emei', zone: 'bashu', name: '峨眉山', subtitle: '蜀道金顶 · 佛光云海', tag: '西蜀仙山', faction: '峨眉派',
        x: 295, y: 425, neighbors: ['zhongnan', 'wudang', 'dali', 'guangming', 'tangmen', 'qingcheng', 'xingxiu'],
        desc: '蜀国多仙山，峨眉邈难匹。金顶云海佛光普照，亦刚亦柔剑气清越。',
        tiles: [
          { id: 'em_0', name: '报国寺山门', type: 'entry', x: 140, y: 320, next: [1, 2], desc: '入山第一大寺，晨钟暮鼓声中可见佩剑女冠巡山。' },
          { id: 'em_1', name: '清音阁茶栈', type: 'tavern', x: 320, y: 430, next: [0, 3], desc: '双桥清音水声潺潺，竹叶青茗茶最解蜀道行脚之乏。' },
          { id: 'em_2', name: '九老仙洞', type: 'secret', x: 340, y: 180, next: [0, 3, 4], desc: '幽深莫测之溶洞，常有蜀中隐侠在此遗留秘宝。' },
          { id: 'em_3', name: '万年禅院', type: 'sect', x: 540, y: 300, next: [1, 2, 4, 5], desc: '峨眉派传功重地，峨眉九阳功与回风拂柳剑刚柔并济。' },
          { id: 'em_4', name: '洗象池药圃', type: 'market', x: 670, y: 150, next: [2, 3, 6], desc: '高山灵草荟萃，售卖峨眉金顶雪莲丹与轻便软剑。' },
          { id: 'em_5', name: '舍身绝壁', type: 'arena', x: 720, y: 430, next: [3, 6], desc: '万丈深渊云雾翻涌，正邪高手常在此一决雌雄。' },
          { id: 'em_6', name: '华藏金顶', type: 'shrine', x: 860, y: 280, next: [4, 5], desc: '十方普贤金像矗立云端，睹佛光者武学障壁豁然开朗。' }
        ]
      },
      {
        id: 'dali', zone: 'dianqian', name: '大理', subtitle: '苍山洱海 · 天龙禅寺', tag: '南诏佛国', faction: '大理天龙门',
        x: 375, y: 515, neighbors: ['emei', 'hengyang', 'wuliang', 'wudu'],
        desc: '苍山十九峰积雪皑皑，洱海月色如银，段氏一阳指与六脉神剑名扬天下。',
        tiles: [
          { id: 'dl_0', name: '太和城北门', type: 'entry', x: 140, y: 300, next: [1, 2], desc: '四季如春之南诏王都，白族百姓淳朴好客。' },
          { id: 'dl_1', name: '洱海渔歌酒家', type: 'tavern', x: 320, y: 420, next: [0, 3], desc: '临水木楼清风徐来，梅子酒配乳扇令人忘却江湖厮杀。' },
          { id: 'dl_2', name: '镇南王府演武苑', type: 'sect', x: 340, y: 180, next: [0, 3, 4], desc: '大理段氏广纳贤士之所，可在此拜入天龙门请益指法与轻功。' },
          { id: 'dl_3', name: '天龙崇圣寺', type: 'arena', x: 540, y: 290, next: [1, 2, 4, 5], desc: '大理皇家寺院，三塔巍峨，吐蕃国师曾在此与高僧斗剑！' },
          { id: 'dl_4', name: '五华珍玩市', type: 'market', x: 670, y: 430, next: [2, 3, 6], desc: '滇南翡翠玉佩、云南白药与南诏乌金短剑应有尽有。' },
          { id: 'dl_5', name: '苍山点苍瀑', type: 'shrine', x: 720, y: 150, next: [3, 6], desc: '飞瀑如银河倒挂，逆流冲穴可令真气凝练如剑。' },
          { id: 'dl_6', name: '无量山玉壁洞', type: 'secret', x: 860, y: 290, next: [4, 5], desc: '剑湖宫后山琅嬛福地，神仙姐姐玉像前藏有《北冥神功》与《凌波微步》！' }
        ]
      },
      {
        id: 'guangming', zone: 'xiyu', name: '光明顶', subtitle: '昆仑圣火 · 乾坤挪移', tag: '西域总坛', faction: '西域明教',
        x: 155, y: 265, neighbors: ['changan', 'emei', 'xueshan', 'lingjiu', 'xingxiu'],
        desc: '昆仑山脉绝顶总坛，圣火熊熊不熄，六大派远征西域皆汇聚于此。',
        tiles: [
          { id: 'gm_0', name: '昆仑山麓一线天', type: 'entry', x: 140, y: 320, next: [1, 2], desc: '黄沙与冰雪交界之险隘，明教五行旗弟子严密布防。' },
          { id: 'gm_1', name: '绿洲驼铃客栈', type: 'tavern', x: 310, y: 430, next: [0, 3], desc: '西域胡商与江湖豪客歇脚之土堡，烤全羊与马奶酒管够。' },
          { id: 'gm_2', name: '锐金厚土旗坛', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '明教五行旗匠作营，锻造圣火令仿品与西域奇毒解药。' },
          { id: 'gm_3', name: '圣火光明大殿', type: 'arena', x: 540, y: 290, next: [1, 2, 4, 5], desc: '明教总坛核心大殿，正邪大战一触即发，张无忌曾在此独战六派！' },
          { id: 'gm_4', name: '坐忘峰传功殿', type: 'sect', x: 680, y: 150, next: [2, 3, 6], desc: '光明左右使与四大法王论武授徒之地，可在此拜入明教习得乾坤大挪移。' },
          { id: 'gm_5', name: '昆仑翠谷仙境', type: 'shrine', x: 730, y: 430, next: [3, 6], desc: '四面雪山环抱之温暖幽谷，蟠桃累累，正是九阳神功大成之地。' },
          { id: 'gm_6', name: '光明顶秘道石室', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '历代教主方能踏足之禁地，羊皮卷上记载着乾坤大挪移心法！' }
        ]
      },
      {
        id: 'xueshan', zone: 'xiyu', name: '大雪山', subtitle: '西域冰峰 · 绝顶秘境', tag: '绝域秘境', faction: '雪山派 / 大轮寺',
        x: 115, y: 125, neighbors: ['guangming', 'lingjiu'],
        desc: '万里雪飘，冰峰插天。吐蕃大轮寺番僧与中原寻宝奇人常在此出没。',
        tiles: [
          { id: 'xs_0', name: '雪谷冰河渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '寒风如刀割面，内力浅薄者一步三喘。' },
          { id: 'xs_1', name: '牧民酥油火帐', type: 'tavern', x: 320, y: 420, next: [0, 3], desc: '热腾腾的酥油茶与青稞酒，驱散彻骨奇寒。' },
          { id: 'xs_2', name: '大轮金寺', type: 'sect', x: 340, y: 175, next: [0, 3, 4], desc: '吐蕃密宗祖庭，火焰刀劲与龙象般若功霸道绝伦。' },
          { id: 'xs_3', name: '凌霄冰城台', type: 'arena', x: 540, y: 290, next: [1, 2, 4, 5], desc: '冰峰之上的剑派山城，梅花剑法与密宗大手印在此争锋。' },
          { id: 'xs_4', name: '西域胡商雪队', type: 'market', x: 670, y: 430, next: [2, 3, 6], desc: '贩卖天山雪莲、千年寒铁与密宗护身佛珠。' },
          { id: 'xs_5', name: '天池寒泉眼', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '万年冰川下涌出之灵泉，饮之打坐可大增真气上限。' },
          { id: 'xs_6', name: '雪山藏宝冰窟', type: 'secret', x: 860, y: 285, next: [4, 5], desc: '冰封百年的神秘石窟，偶有前朝神兵与绝世内功心法出世！' }
        ]
      }
      ,
      {
        id: 'kaifeng', zone: 'zhongyuan', name: '开封汴梁', subtitle: '铁塔漕运 · 黄河水寨', tag: '漕运重镇', faction: '黄河帮 / 六扇门',
        x: 645, y: 245, neighbors: ['luoyang', 'shaolin', 'yanmenguan', 'yanziwu'],
        desc: '八荒争凑，万国咸通。汴河码头商船云集，黄河帮与官府捕快在此盘根错节。',
        tiles: [
          { id: 'kf_0', name: '汴河漕运津', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '千帆竞渡之漕运码头，南北奇货皆由此集散。' },
          { id: 'kf_1', name: '樊楼御酒坊', type: 'tavern', x: 310, y: 175, next: [0, 3, 4], desc: '东京第一酒楼，灯火彻夜通明，豪客在此一掷千金。' },
          { id: 'kf_2', name: '大相国寺集', type: 'market', x: 330, y: 420, next: [0, 4, 5], desc: '三教九流摆摊交易之庙会，偶有古墓出土之奇门兵刃。' },
          { id: 'kf_3', name: '开封琉璃塔', type: 'shrine', x: 530, y: 150, next: [1, 6], desc: '铁色琉璃古塔高耸入云，登顶听风可洗练内家真气。' },
          { id: 'kf_4', name: '黄河帮水寨', type: 'arena', x: 540, y: 310, next: [1, 2, 5, 6], desc: '沙通天、彭连虎等黄河豪强聚义之水寨，刀光剑影不断。' },
          { id: 'kf_5', name: '金刀演武场', type: 'sect', x: 720, y: 430, next: [2, 4, 6], desc: '中原镖师与武师切磋拳脚刀法之演武大院。' },
          { id: 'kf_6', name: '汴梁地下武库', type: 'secret', x: 850, y: 270, next: [3, 4, 5], desc: '前朝禁军遗留的水底暗库，藏有玄铁重甲与秘传刀谱。' }
        ]
      },
      {
        id: 'gumu', zone: 'jingxiang', name: '活死人墓', subtitle: '终南断龙 · 寒玉素心', tag: '隐世古墓', faction: '终南古墓派',
        x: 385, y: 350, neighbors: ['zhongnan', 'huashan', 'wudang'],
        desc: '终南山后，活死人墓；神雕侠侣，绝迹江湖。断龙石后暗道纵横，寒玉床万年冰冷。',
        tiles: [
          { id: 'gm2_0', name: '古墓断龙石', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '万斤断龙巨石半掩墓门，唯通晓古墓机关者可入。' },
          { id: 'gm2_1', name: '玉蜂百花林', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '白花似雪，玉蜂嗡鸣，饮一口玉蜂浆顿觉百脉俱畅。' },
          { id: 'gm2_2', name: '孙婆婆药室', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '古墓石室药房，备有冰魄银针解药、玉蜂针与寒玉佩。' },
          { id: 'gm2_3', name: '素心双剑厅', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '小龙女与杨过演练《玉女素心剑》之石厅，剑意清冷。' },
          { id: 'gm2_4', name: '九阴潜流道', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '古墓水底暗流通道，屏息搏击最考验内家根基。' },
          { id: 'gm2_5', name: '寒玉石床室', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '极北苦寒之地掘出的千年寒玉床，打坐一旬胜过凡人苦修三年！' },
          { id: 'gm2_6', name: '重阳遗刻棺室', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '王重阳所留石棺，棺盖内侧赫然刻着“重阳一生，不弱于人”与《九阴真经》秘要！' }
        ]
      },
      {
        id: 'yanziwu', zone: 'jiangnan', name: '姑苏燕子坞', subtitle: '参合水阁 · 斗转星移', tag: '江南世家', faction: '姑苏慕容氏',
        x: 785, y: 270, neighbors: ['jiangnan', 'kaifeng', 'linan', 'taohua'],
        desc: '太湖烟波浩渺，水路九曲十八弯。曼陀山庄琅嬛玉洞与参合庄还施水阁收藏天下武学。',
        tiles: [
          { id: 'yz_0', name: '太湖菱歌渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '一叶扁舟穿荷叶而来，阿碧姑娘歌声清脆引路。' },
          { id: 'yz_1', name: '听香水榭', type: 'tavern', x: 310, y: 180, next: [0, 3, 4], desc: '阿朱所居水榭，精制江南荷花酥与碧螺春茗茶。' },
          { id: 'yz_2', name: '姑苏锦绣坊', type: 'market', x: 330, y: 420, next: [0, 4, 5], desc: '贩售苏杭云锦宝甲、慕容世家折扇与百家武学抄本。' },
          { id: 'yz_3', name: '参合庄正堂', type: 'sect', x: 540, y: 280, next: [1, 4, 5], desc: '慕容世家授艺议事之堂，讲究“以彼之道，还施彼身”。' },
          { id: 'yz_4', name: '曼陀茶花苑', type: 'arena', x: 660, y: 430, next: [1, 2, 3, 6], desc: '王夫人遍植十八学士茶花之庄园，擅闯者常遭严惩。' },
          { id: 'yz_5', name: '琴韵小筑', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '太湖孤岛竹屋，夜听湖涛拍岸可参悟借力打力之理。' },
          { id: 'yz_6', name: '琅嬛还施水阁', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '慕容氏两代搜罗的天下各派武功秘籍宝库，内藏《斗转星移》真解！' }
        ]
      },
      {
        id: 'linan', zone: 'jiangnan', name: '临安牛家村', subtitle: '钱塘大潮 · 曲三密室', tag: '南宋行都', faction: '东邪门人 / 大内侍卫',
        x: 805, y: 405, neighbors: ['jiangnan', 'yanziwu', 'taohua', 'hengyang'],
        desc: '山外青山楼外楼，西湖歌舞几时休。城外牛家村曲三酒馆虽破败，密室中却藏着东邪珍宝。',
        tiles: [
          { id: 'la_0', name: '钱塘观潮渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '钱塘江潮水奔雷如万马齐喑，渡船往返于东海与内河。' },
          { id: 'la_1', name: '牛家村曲三馆', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '曲灵风昔年隐居之小酒馆，村酒虽烈却暗藏玄机。' },
          { id: 'la_2', name: '御街天工坊', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '临安京师第一兵甲铺，专供大内高手与江南名侠。' },
          { id: 'la_3', name: '西湖断桥亭', type: 'scenic', x: 540, y: 290, next: [1, 2, 4, 5], desc: '苏堤春晓杨柳依依，常有江南名士与奇侠在此偶遇。' },
          { id: 'la_4', name: '翠寒堂校场', type: 'arena', x: 670, y: 160, next: [2, 3, 6], desc: '大内高手与武林义士比武较技之禁苑校场。' },
          { id: 'la_5', name: '飞来峰灵隐寺', type: 'shrine', x: 720, y: 430, next: [3, 6], desc: '古洞石佛林立，清泉淙淙，在此打坐可增长深厚佛门定力。' },
          { id: 'la_6', name: '曲三碗橱密室', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '转动铁八卦方可开启的密室，内藏名画与《武穆遗书》线索！' }
        ]
      },
      {
        id: 'tangmen', zone: 'bashu', name: '蜀中唐门', subtitle: '机簧毒砂 · 暴雨梨花', tag: '暗器世家', faction: '蜀中唐门堡',
        x: 245, y: 365, neighbors: ['emei', 'qingcheng', 'zhongnan'],
        desc: '蜀中唐门独步西南，家传暗器机簧与奇毒天下无双，外人莫敢擅闯唐家堡半步。',
        tiles: [
          { id: 'tm_0', name: '剑门蜀道口', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '蜀道之难难于上青天，栈道两侧尽是唐门暗桩。' },
          { id: 'tm_1', name: '竹叶青茶肆', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '川西老茶馆，盖碗茶配川北凉粉，江湖暗探常在此递信。' },
          { id: 'tm_2', name: '百巧机簧坊', type: 'market', x: 330, y: 420, next: [0, 3, 4], desc: '售卖袖箭、毒蒺藜与蜀锦软甲，更可淬炼奇门兵刃。' },
          { id: 'tm_3', name: '暴雨梨花阁', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '唐门传授暗器手法与机关术之重地。' },
          { id: 'tm_4', name: '断魂试毒崖', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '唐门弟子蒙眼听风、比试暗器准头之险崖。' },
          { id: 'tm_5', name: '幽篁听风坪', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '万竿翠竹随风摆动，闭目听叶落可大增耳力与内息。' },
          { id: 'tm_6', name: '唐门毒经密窟', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '藏有《唐门毒经》与绝世暗器「暴雨梨花针」图纸之秘窟！' }
        ]
      },
      {
        id: 'qingcheng', zone: 'bashu', name: '青城幽谷', subtitle: '青城天下幽 · 松风剑影', tag: '巴蜀道山', faction: '青城派',
        x: 205, y: 455, neighbors: ['tangmen', 'emei', 'wuliang'],
        desc: '青城天下幽，丹梯千级隐于古银杏与苍松之间，松风剑法轻捷凌厉。',
        tiles: [
          { id: 'qc_0', name: '建福宫山门', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '古木参天蔽日，山门长联尽显道家清幽气象。' },
          { id: 'qc_1', name: '鹤鸣山道茶', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '青城苦丁茶配白果炖鸡，涤荡旅途风尘。' },
          { id: 'qc_2', name: '上清丹药局', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '炼制川芎活血散与青城松纹短剑。' },
          { id: 'qc_3', name: '松风演武观', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '青城弟子演练松风剑法与无影幻脚之道观。' },
          { id: 'qc_4', name: '丈人峰剑坛', type: 'arena', x: 680, y: 150, next: [2, 3, 6], desc: '巴蜀剑客切磋快剑身法之高台。' },
          { id: 'qc_5', name: '天师银杏洞', type: 'shrine', x: 730, y: 430, next: [3, 6], desc: '千年古银杏下之石洞，灵气充沛宜吐纳冲穴。' },
          { id: 'qc_6', name: '辟邪剑谱旧窟', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '昔年青城派窥伺林家《辟邪剑谱》所留之隐秘石窟！' }
        ]
      },
      {
        id: 'hengyang', zone: 'bashu', name: '衡阳回雁楼', subtitle: '潇湘夜雨 · 衡山剑曲', tag: '南岳重镇', faction: '衡山剑派',
        x: 615, y: 455, neighbors: ['xiangyang', 'linan', 'dali', 'wudu'],
        desc: '北雁南飞至此歇翅。衡山七十二峰回雁为首，莫大先生胡琴一响，「潇湘夜雨」剑出见血。',
        tiles: [
          { id: 'hy_0', name: '湘江古渡口', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '湘水碧波北流，渔舟唱晚中暗藏江湖风波。' },
          { id: 'hy_1', name: '回雁大酒楼', type: 'tavern', x: 310, y: 175, next: [0, 3, 4], desc: '令狐冲与田伯光昔年坐斗快刀之名楼，衡阳米酒醇香。' },
          { id: 'hy_2', name: '潇湘琴剑铺', type: 'market', x: 330, y: 420, next: [0, 4, 5], desc: '专铸藏于胡琴中之百炼窄剑与潇湘竹甲。' },
          { id: 'hy_3', name: '刘府金盆厅', type: 'arena', x: 540, y: 290, next: [1, 4, 5], desc: '刘正风金盆洗手大会旧址，五岳剑派与魔教曾在此激战。' },
          { id: 'hy_4', name: '祝融群玉院', type: 'sect', x: 680, y: 430, next: [1, 2, 3, 6], desc: '衡山派传授五岳剑法与音律剑意之别院。' },
          { id: 'hy_5', name: '水帘洞瀑布', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '南岳绝景，水声轰鸣中练剑可大增出招速度。' },
          { id: 'hy_6', name: '笑傲琴箫竹林', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '刘正风与曲洋合奏《笑傲江湖曲》之幽谷，留有绝世曲谱与剑意！' }
        ]
      },
      {
        id: 'wuliang', zone: 'dianqian', name: '无量山玉壁', subtitle: '剑湖仙影 · 琅嬛福地', tag: '南疆奇境', faction: '无量剑派 / 逍遥遗脉',
        x: 275, y: 550, neighbors: ['dali', 'qingcheng', 'wudu'],
        desc: '澜沧江畔奇峰插天，月夜无量玉壁常见仙人舞剑之影，谷底琅嬛福地更是逍遥派秘藏所在。',
        tiles: [
          { id: 'wl_0', name: '澜沧铁索桥', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '铁索横跨怒涛汹涌之澜沧江，踏桥而过惊险万分。' },
          { id: 'wl_1', name: '万劫谷茶寮', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '谷口竹楼茶寮，供应滇南普洱老茶与山野竹筒饭。' },
          { id: 'wl_2', name: '百草闪电坡', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '毒虫异草丛生之山坡，山民在此售卖解毒灵草与南诏奇物。' },
          { id: 'wl_3', name: '剑湖宫正殿', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '无量剑东西二宗每隔五年在此斗剑争夺剑湖宫主导权。' },
          { id: 'wl_4', name: '白龙断魂崖', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '飞瀑直泻千尺，段誉昔年正是由此失足坠入深谷。' },
          { id: 'wl_5', name: '無量玉壁坪', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '平整如镜之巨大石壁，每逢月圆可观摩玉壁剑影参悟巧变。' },
          { id: 'wl_6', name: '神仙姐姐玉像洞', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '谷底石室供奉着栩栩如生的白玉神仙姐姐像，蒲团内藏有《北冥神功》与《凌波微步》！' }
        ]
      },
      {
        id: 'wudu', zone: 'dianqian', name: '苗疆五毒教', subtitle: '金蚕万蛇 · 蓝衫药浴', tag: '南疆毒域', faction: '苗疆五毒教',
        x: 495, y: 535, neighbors: ['dali', 'wuliang', 'hengyang'],
        desc: '瘴气弥漫之十万大山，苗家竹楼隐现林间。蓝凤凰统领五毒教，金蚕蛊毒与药浴天下闻名。',
        tiles: [
          { id: 'wd2_0', name: '赤水竹筏渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '苗女撑竹筏渡过赤水河，林间五彩毒蝶翩翩起舞。' },
          { id: 'wd2_1', name: '芦笙蛇酒寨', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '苗疆特酿五步蛇胆酒，饮之大补气血、百毒不侵。' },
          { id: 'wd2_2', name: '百蛊炼药房', type: 'market', x: 330, y: 420, next: [0, 3, 4], desc: '售卖苗疆奇药、银饰护符与淬毒短刃。' },
          { id: 'wd2_3', name: '千蛛万毒殿', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '五毒教总坛竹殿，传授五毒赤练掌与驱蛊秘术。' },
          { id: 'wd2_4', name: '万蛇窟试炼场', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '群蛇盘踞之石坑，唯身法矫健且心志坚定者方能全身而退。' },
          { id: 'wd2_5', name: '苗疆五彩药泉', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '浸泡融合数十种灵草之温泉，可洗髓伐毛增长内力。' },
          { id: 'wd2_6', name: '金蚕蛊王秘窟', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '五毒教历代圣姑秘藏《五毒秘传》与万年灵芝之石窟！' }
        ]
      },
      {
        id: 'heimuya', zone: 'yanzhao', name: '黑木崖', subtitle: '日月同辉 · 葵花鬼影', tag: '魔教总坛', faction: '日月神教',
        x: 560, y: 115, neighbors: ['shaolin', 'huashan', 'yanmenguan', 'wutaishan'],
        desc: '河北平定州外奇峰如削，唯有乘竹篓铁索方可登顶。日月神教总坛所在，东方不败威震江湖。',
        tiles: [
          { id: 'hm_0', name: '猩猩滩吊篮索', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '绝壁千仞无路可登，唯有神教铜锣暗号方能放竹篓接引。' },
          { id: 'hm_1', name: '鸦儿屯酒栈', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '神教教众下山豪饮之酒铺，燕赵烈酒最是辛辣。' },
          { id: 'hm_2', name: '风雷百宝库', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '汇聚魔教搜刮而来的天下奇珍、黑血神针与神兵利器。' },
          { id: 'hm_3', name: '白虎传功堂', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '日月神教十长老授艺之地，可在此拜入神教修习霸道魔功。' },
          { id: 'hm_4', name: '成德大殿', type: 'arena', x: 680, y: 150, next: [2, 3, 6], desc: '高悬“文成武德、泽被苍生”匾额，正邪高手多次在此血战。' },
          { id: 'hm_5', name: '断崖观日台', type: 'shrine', x: 730, y: 430, next: [3, 6], desc: '迎朝阳紫气吐纳，可化解霸道内功带来的经脉反噬。' },
          { id: 'hm_6', name: '后山绣花密室', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '假山秘道深处的鸟语花香小院，藏有《葵花宝典》残卷与《吸星大法》铁板！' }
        ]
      },
      {
        id: 'yanmenguan', zone: 'yanzhao', name: '雁门关', subtitle: '塞北长城 · 乱石血印', tag: '九边雄关', faction: '北疆义军 / 丐帮塞北舵',
        x: 445, y: 95, neighbors: ['changan', 'huashan', 'heimuya', 'wutaishan'],
        desc: '天下九塞，雁门为首。烽火台连绵万里，关外乱石谷悬崖上仍留着萧远山当年血书遗字。',
        tiles: [
          { id: 'ym_0', name: '雁门关瓮城', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '胡马秋风塞北，关城铁门森严，往来商队皆须查验路引。' },
          { id: 'ym_1', name: '塞外马奶酒帐', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '关外胡人所设毡帐，大块手把肉配烧刀子驱散塞北寒风。' },
          { id: 'ym_2', name: '互市胡商马场', type: 'market', x: 330, y: 420, next: [0, 3, 4], desc: '边关互市，可低价购入【大漠汗血驹】、塞北弯刀与皮甲。' },
          { id: 'ym_3', name: '镇北军大营', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '边军将士与塞北豪侠操练刀盾枪棒之军营。' },
          { id: 'ym_4', name: '乱石谷古战场', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '昔年二十一位中原高手伏击萧远山之地，杀气至今未散。' },
          { id: 'ym_5', name: '长城烽火台', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '独立苍茫古长城之巅，迎塞外狂风练功可令刚猛掌力大进。' },
          { id: 'ym_6', name: '断崖萧氏血字壁', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '万丈深渊峭壁，留有萧远山指力所刻字迹与契丹擒龙武学精义！' }
        ]
      },
      {
        id: 'wutaishan', zone: 'yanzhao', name: '五台山清凉', subtitle: '北国佛都 · 清凉辩经', tag: '北疆佛山', faction: '清凉寺 / 五台派',
        x: 685, y: 120, neighbors: ['heimuya', 'yanmenguan', 'kaifeng', 'changbai'],
        desc: '五峰耸立云表，盛夏犹见积雪。清凉寺高僧云集，亦是北上关外长白山之必经门户。',
        tiles: [
          { id: 'wt_0', name: '台怀镇牌坊', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '梵宇林立，钟磬不绝，塞北与中原僧俗在此汇聚。' },
          { id: 'wt_1', name: '清凉素斋寮', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '台蘑素斋配清凉雪水茶，宁心静气。' },
          { id: 'wt_2', name: '佛国法器坊', type: 'market', x: 330, y: 420, next: [0, 3, 4], desc: '铸造精钢禅杖、戒刀与护心佛珠。' },
          { id: 'wt_3', name: '菩萨顶讲经堂', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '五台山高僧演武讲经之所，佛门外家拳掌扎实雄浑。' },
          { id: 'wt_4', name: '文殊辩经台', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '各派武僧与西域番僧印证武学佛理之石台。' },
          { id: 'wt_5', name: '北台叶斗冰峰', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '华北屋脊万年冰雪，在此吐纳可凝练纯净真元。' },
          { id: 'wt_6', name: '清凉古佛洞', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '顺治帝与历代禅宗奇人隐修之石洞，藏有佛门洗髓残卷！' }
        ]
      },
      {
        id: 'lingjiu', zone: 'xiyu', name: '天山灵鹫宫', subtitle: '飘渺仙峰 · 六阳折梅', tag: '西域仙宫', faction: '天山灵鹫宫',
        x: 215, y: 145, neighbors: ['guangming', 'xueshan', 'xingxiu', 'changan'],
        desc: '天山飘渺峰云雾缭绕，九天九部婢女镇守断魂索桥。天山童姥与虚竹执掌三十六洞七十二岛。',
        tiles: [
          { id: 'lj_0', name: '断魂铁索桥', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '一条铁索横跨万丈雪渊，唯轻功绝顶者可踏索而过。' },
          { id: 'lj_1', name: '九天百花帐', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '钧天、朱天各部烹制的天山百花酿，芳香沁脾。' },
          { id: 'lj_2', name: '生死符丹房', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '炼制天山六阳融雪丸、天山雪莲与西域羊脂玉器。' },
          { id: 'lj_3', name: '灵鹫独尊殿', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '虚竹子与九天圣女授艺之正殿，逍遥派武学飘逸入神。' },
          { id: 'lj_4', name: '三十六洞盟坛', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '三十六洞洞主、七十二岛岛主比武听令之广场。' },
          { id: 'lj_5', name: '千年寒冰窖', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '灵鹫宫地底玄冰窖，西夏银川公主与虚竹曾在此切磋内息。' },
          { id: 'lj_6', name: '后殿石壁六阳室', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '满壁刻有《天山折梅手》与《八荒六合唯我独尊功》武学总纲！' }
        ]
      },
      {
        id: 'xingxiu', zone: 'xiyu', name: '星宿海毒泽', subtitle: '神木王鼎 · 化功腐尸', tag: '西域毒海', faction: '西域星宿派',
        x: 95, y: 365, neighbors: ['guangming', 'lingjiu', 'emei'],
        desc: '方圆数百里尽是芦苇沼泽与剧毒虫豸。星宿老仙丁春秋在此开派，门人行事狠辣诡谲。',
        tiles: [
          { id: 'xx_0', name: '流沙毒沼口', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '五彩瘴气升腾，稍有不慎便会陷入流沙毒潭。' },
          { id: 'xx_1', name: '牧马驼铃帐', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '西域客商歇脚之绿洲毡房，烈酒可御泽国湿寒。' },
          { id: 'xx_2', name: '西域奇毒市', type: 'market', x: 330, y: 420, next: [0, 3, 4], desc: '交易三笑逍遥散解药、西域乌金刃与和田美玉。' },
          { id: 'xx_3', name: '日月星宿坛', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '丁春秋传授《星宿化功大法》与抽髓掌之总坛。' },
          { id: 'xx_4', name: '腐尸演武沼', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '星宿门人以武功高低排定师兄弟座次之残酷擂台。' },
          { id: 'xx_5', name: '白驼山旧址', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '西毒欧阳锋昔年练功之沙漠石峰，蛤蟆劲力遗韵犹存。' },
          { id: 'xx_6', name: '神木王鼎秘窟', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '供奉逍遥派至宝「神木王鼎」之石窟，引毒虫化练无上阴柔内力！' }
        ]
      },
      {
        id: 'changbai', zone: 'haiwai', name: '辽东长白山', subtitle: '雪山飞狐 · 关外参谷', tag: '关外苦寒', faction: '关东豪侠 / 闯王遗脉',
        x: 845, y: 85, neighbors: ['wutaishan', 'kaifeng', 'binghuodao'],
        desc: '白山黑水万里雪原，天池如碧玉嵌于群峰。辽东大侠胡一刀与金面佛苗人凤曾在此雪地激战。',
        tiles: [
          { id: 'cb_0', name: '山海关外驿', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '出山海关便是苍茫雪原，马爬犁在冰道上疾驰。' },
          { id: 'cb_1', name: '关东参客酒窝', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '火炕滚烫，老白干泡长白野山参，喝下一碗浑身燥热。' },
          { id: 'cb_2', name: '辽东皮货参行', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '低价收购【长白百年参】与貂皮宝甲，打造关外冷月宝刀。' },
          { id: 'cb_3', name: '苗胡论刀木屋', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '胡家刀法与苗家剑法印证之地，刀剑交鸣响彻林海。' },
          { id: 'cb_4', name: '玉笔峰暴雪台', type: 'arena', x: 680, y: 150, next: [2, 3, 6], desc: '飞狐外传群豪夺宝比武之险峰，脚下便是万丈冰崖。' },
          { id: 'cb_5', name: '长白高冷天池', type: 'shrine', x: 730, y: 430, next: [3, 6], desc: '火山天池冰水刺骨，临池吐纳可令真气浩瀚如海。' },
          { id: 'cb_6', name: '闯王军刀宝藏洞', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '闯王李自成军刀地图所指之冰洞，藏有《胡家刀谱》总诀与重宝！' }
        ]
      },
      {
        id: 'xiakedao', zone: 'haiwai', name: '东海侠客岛', subtitle: '赏善罚恶 · 太玄石室', tag: '海外仙岛', faction: '侠客岛龙木二岛主',
        x: 925, y: 495, neighbors: ['taohua', 'linan'],
        desc: '孤悬南海碧波万顷之外，龙木二岛主以「赏善罚恶令」遍邀中原掌门赴岛共参李白《侠客行》图解。',
        tiles: [
          { id: 'xk_0', name: '侠客岛迎宾滩', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '黄衣汉子张三李四驾快舟接引上岛，椰林海风习习。' },
          { id: 'xk_1', name: '断肠蚀骨腊八堂', type: 'tavern', x: 310, y: 180, next: [0, 3], desc: '热气腾腾的碧绿腊八粥，实乃断肠蚀骨腐心草所熬大补灵药！' },
          { id: 'xk_2', name: '海外珊瑚奇珍阁', type: 'market', x: 330, y: 420, next: [0, 3, 4], desc: '海岛奇珍异宝、乌金玄铁令与深海珍珠护符。' },
          { id: 'xk_3', name: '赏善罚恶大殿', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '龙岛主与木岛主款待各派掌门之大殿，谈笑间尽显绝顶修为。' },
          { id: 'xk_4', name: '观海试剑礁', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '惊涛拍岸之海中巨礁，群豪在此拆招印证石壁武学。' },
          { id: 'xk_5', name: '海眼潮音洞', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '海潮涌入石洞声若奔雷，顺潮呼吸可冲破奇经八脉玄关。' },
          { id: 'xk_6', name: '二十四石室太玄洞', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '二十四座石室刻满李白《侠客行》诗句剑谱，不拘文字者方悟《太玄经》！' }
        ]
      },
      {
        id: 'binghuodao', zone: 'haiwai', name: '极北冰火岛', subtitle: '火山极光 · 屠龙刀意', tag: '极北绝域', faction: '金毛狮王谢逊',
        x: 935, y: 165, neighbors: ['changbai', 'taohua'],
        desc: '极北汪洋中的奇异荒岛，一面火山喷发烈焰冲天，一面万年玄冰白熊出没，谢逊携屠龙刀隐居于此。',
        tiles: [
          { id: 'bh_0', name: '浮冰荒滩渡', type: 'entry', x: 140, y: 310, next: [1, 2], desc: '海面浮冰如山碰撞，极光在夜空中绚烂流转。' },
          { id: 'bh_1', name: '兽皮篝火石屋', type: 'tavern', x: 310, y: 420, next: [0, 3], desc: '烤鹿肉配热鱼汤，在极北冰原中恢复气血与体力。' },
          { id: 'bh_2', name: '火山熔岩铁台', type: 'market', x: 330, y: 180, next: [0, 3, 4], desc: '借万年火山地火锻打神兵，天然产出极品百炼玄铁。' },
          { id: 'bh_3', name: '狮王吼山坪', type: 'sect', x: 540, y: 290, next: [1, 2, 4, 5], desc: '金毛狮王谢逊演练狮子吼与七伤拳之山坪。' },
          { id: 'bh_4', name: '极光冰原擂', type: 'arena', x: 680, y: 430, next: [2, 3, 6], desc: '冰川裂隙之上，寒气逼人，与极北巨熊或绝顶高手搏杀。' },
          { id: 'bh_5', name: '火山口地脉泉', type: 'shrine', x: 730, y: 150, next: [3, 6], desc: '冰火交融之灵泉，打坐一次可大幅锤炼阴阳二气。' },
          { id: 'bh_6', name: '屠龙玄铁遗刻洞', type: 'secret', x: 860, y: 280, next: [4, 5], desc: '谢逊日夜参详「武林至尊，宝刀屠龙」之山洞，留有霸道无匹的屠龙刀意！' }
        ]
      }
    ];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REALM_NAMES: REALM_NAMES, MAIN_QUEST_CHAPTERS: MAIN_QUEST_CHAPTERS, SEASONS: SEASONS, XUNS: XUNS, REGIONS: REGIONS };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { REALM_NAMES, MAIN_QUEST_CHAPTERS, SEASONS, XUNS, REGIONS });
}
