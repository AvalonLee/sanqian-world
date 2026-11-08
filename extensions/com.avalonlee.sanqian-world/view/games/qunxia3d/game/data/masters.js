/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-masters.cjs 生成，重跑覆盖
 * MASTERS_INIT 24 名宿（计划书「名宿 12 人」指可交互名宿子集）+ MASTER_STAGE_REQS 三幕门槛 + MASTER_STORIES 三幕传记（10 人有幕）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L2319–L2323 · const MASTER_STAGE_REQS
 * view/games/qunxia/game.html L2571–L2741 · const MASTERS_INIT
 * view/games/qunxia/game.html L2325–L2566 · const MASTER_STORIES
 * ============================================================ */

    const MASTER_STAGE_REQS = [
      { reqAffinity: 20, reqRealm: 0, apCost: 1, label: '第一幕（需好感≥20，耗1行脚）' },
      { reqAffinity: 50, reqRealm: 1, apCost: 1, label: '第二幕（需好感≥50 & 略有小成，耗1行脚）' },
      { reqAffinity: 80, reqRealm: 2, apCost: 2, label: '第三幕（需好感≥80 & 融会贯通，耗2行脚）' }
    ];
    const MASTERS_INIT = [
      {
        id: 'xiaofeng', name: '萧峰', avatar: '萧', title: '北乔峰 · 丐帮奇侠',
        region: 'luoyang', tileIdx: 4, stance: 'gang', power: 78, hp: 165,
        teachArt: 'xianglong_zhang', affinity: 20, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '萧某生平最敬重有骨气的汉子！阁下若不嫌弃，且与萧某痛饮三百杯！'
      },
      {
        id: 'linghuchong', name: '令狐冲', avatar: '令', title: '华山剑侠 · 潇洒浪子',
        region: 'luoyang', tileIdx: 1, stance: 'qiao', power: 72, hp: 145,
        teachArt: 'dugu_jiujian', affinity: 25, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '人生几何，有好酒便喝，有好剑便论，管他什么正邪门户之见！'
      },
      {
        id: 'huangyaoshi', name: '黄药师', avatar: '黄', title: '东邪 · 碧海箫声',
        region: 'taohua', tileIdx: 3, stance: 'qiao', power: 82, hp: 160,
        teachArt: 'tanzhi_shentong', affinity: 15, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '世人皆道我行事邪僻，礼法俗规本就是庸人自缚之物。'
      },
      {
        id: 'zhangsanfeng', name: '张三丰', avatar: '张', title: '武当真人 · 太极宗师',
        region: 'wudang', tileIdx: 5, stance: 'rou', power: 88, hp: 180,
        teachArt: 'taiji_quan', affinity: 20, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '用意不用力，太极圆转如意，重在领悟天地阴阳消长之理。'
      },
      {
        id: 'zhangwuji', name: '张无忌', avatar: '无', title: '明教教主 · 九阳乾坤',
        region: 'guangming', tileIdx: 3, stance: 'rou', power: 80, hp: 170,
        teachArt: 'qiankun_nuoyi', affinity: 25, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '冤冤相报何时了？只要能化解六大派与明教的干戈，张某甘受一剑。'
      },
      {
        id: 'guojing', name: '郭靖', avatar: '郭', title: '北侠 · 守襄巨擘',
        region: 'xiangyang', tileIdx: 3, stance: 'gang', power: 84, hp: 175,
        teachArt: 'dagou_bang', affinity: 20, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '侠之大者，为国为民。练武之人若只图一己私利，武功再高也是枉然。'
      },
      {
        id: 'yangguo', name: '杨过', avatar: '杨', title: '神雕大侠 · 黯然重剑',
        region: 'xiangyang', tileIdx: 6, stance: 'gang', power: 83, hp: 165,
        teachArt: 'anran_zhang', affinity: 18, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '重剑无锋，大巧不工。当年独孤前辈于山洪之中练剑，何等气象！'
      },
      {
        id: 'xiaolongnv', name: '小龙女', avatar: '龙', title: '古墓仙子 · 素衣胜雪',
        region: 'zhongnan', tileIdx: 5, stance: 'qiao', power: 75, hp: 145,
        teachArt: 'yunv_jian', affinity: 20, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '终南山后，活死人墓。外间纷扰，终究不及古墓清静。'
      },
      {
        id: 'duanyu', name: '段誉', avatar: '段', title: '大理世子 · 凌波剑气',
        region: 'dali', tileIdx: 6, stance: 'qiao', power: 74, hp: 150,
        teachArt: 'liumai_shenjian', affinity: 25, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '打打杀杀实在有伤和气，小生这凌波微步只为逃命，并非有意冒犯！'
      },
      {
        id: 'jiumozhi', name: '鸠摩智', avatar: '鸠', title: '吐蕃国师 · 大轮明王',
        region: 'xueshan', tileIdx: 2, stance: 'gang', power: 79, hp: 160,
        teachArt: 'huoyan_dao', affinity: 10, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '能与贫僧过上三招而不败者，中原武林屈指可数！'
      }
      ,
      {
        id: 'hongqigong', name: '洪七公', avatar: '洪', title: '北丐 · 九指神丐',
        region: 'linan', tileIdx: 1, stance: 'gang', power: 86, hp: 180,
        teachArt: 'xianglong_zhang', affinity: 15, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '叫花鸡配曲三酒馆的好酒，给老叫花个皇帝老儿也不换！'
      },
      {
        id: 'ouyangfeng', name: '欧阳锋', avatar: '欧', title: '西毒 · 白驼山主',
        region: 'xingxiu', tileIdx: 5, stance: 'gang', power: 87, hp: 175,
        teachArt: 'huagong_dafa', affinity: 10, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '天下武功，唯我白驼山庄与逆练九阴方为第一！'
      },
      {
        id: 'zhoubotong', name: '周伯通', avatar: '周', title: '中顽童 · 双手互搏',
        region: 'zhongnan', tileIdx: 2, stance: 'qiao', power: 85, hp: 175,
        teachArt: 'taiji_quan', affinity: 20, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '好玩好玩！左手打右手，天下还有比这更有趣的事么？'
      },
      {
        id: 'dongfangbubai', name: '东方不败', avatar: '东', title: '日月圣主 · 葵花鬼影',
        region: 'heimuya', tileIdx: 6, stance: 'qiao', power: 96, hp: 210,
        teachArt: 'kuihua_jian', affinity: 10, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '日出东方，唯我不败。一枚绣花针，便足破天下万般兵刃。'
      },
      {
        id: 'renwoxing', name: '任我行', avatar: '任', title: '前任教主 · 吸星霸主',
        region: 'heimuya', tileIdx: 4, stance: 'rou', power: 88, hp: 185,
        teachArt: 'xixing_dafa', affinity: 12, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '老夫吸星大法一出，任你几十年苦修内力，尽归老夫丹田！'
      },
      {
        id: 'murongfu', name: '慕容复', avatar: '慕', title: '南慕容 · 斗转星移',
        region: 'yanziwu', tileIdx: 3, stance: 'rou', power: 79, hp: 160,
        teachArt: 'douzhuan_xingyi', affinity: 15, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '北乔峰，南慕容！以彼之道，还施彼身，阁下可敢赐教？'
      },
      {
        id: 'xuzhu', name: '虚竹', avatar: '虚', title: '灵鹫尊主 · 逍遥传人',
        region: 'lingjiu', tileIdx: 3, stance: 'rou', power: 86, hp: 185,
        teachArt: 'xiaowuxiang_gong', affinity: 22, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '阿弥陀佛，小僧原只想做个少林小和尚，怎料世事无常……'
      },
      {
        id: 'tianshantonglao', name: '天山童姥', avatar: '姥', title: '缥缈尊主 · 唯我独尊',
        region: 'lingjiu', tileIdx: 6, stance: 'qiao', power: 90, hp: 175,
        teachArt: 'beiming_shengong', affinity: 10, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '生死符种入经脉，求生不得求死不能，哪个敢违抗姥姥号令？'
      },
      {
        id: 'shipotian', name: '石破天', avatar: '石', title: '侠客太玄 · 浑金璞玉',
        region: 'xiakedao', tileIdx: 6, stance: 'qiao', power: 95, hp: 205,
        teachArt: 'taixuan_jing', affinity: 22, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '我不识字，只见石壁上的蝌蚪小人剑气往来，体内真气便自己动了起来！'
      },
      {
        id: 'huyidao', name: '胡一刀', avatar: '胡', title: '辽东大侠 · 豪气干云',
        region: 'changbai', tileIdx: 3, stance: 'gang', power: 84, hp: 175,
        teachArt: 'hujia_daofa', affinity: 20, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '关外风雪虽冷，喝上一碗烈酒、交上一位真朋友，心头便是热的！'
      },
      {
        id: 'miejue', name: '灭绝师太', avatar: '灭', title: '峨眉掌门 · 倚天凌厉',
        region: 'emei', tileIdx: 3, stance: 'qiao', power: 77, hp: 155,
        teachArt: 'luoying_jian', affinity: 12, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '正邪不两立！我峨眉弟子宁折不弯，誓诛天下邪魔外道！'
      },
      {
        id: 'lanfenghuang', name: '蓝凤凰', avatar: '蓝', title: '五毒圣姑 · 苗疆奇女',
        region: 'wudu', tileIdx: 3, stance: 'rou', power: 74, hp: 150,
        teachArt: 'wudu_shenzhang', affinity: 18, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '嘻嘻，苗疆五仙酒你敢不敢喝？只要你不负义，蓝妹子便认你这个朋友！'
      },
      {
        id: 'tangmen_lao', name: '唐老太爷', avatar: '唐', title: '唐门魁首 · 暴雨梨花',
        region: 'tangmen', tileIdx: 3, stance: 'qiao', power: 80, hp: 155,
        teachArt: 'tangmen_lihua', affinity: 12, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '蜀中唐门暗器，一匣二十七针，阎王叫你三更死，谁敢留人到五更？'
      },
      {
        id: 'xiexun', name: '谢逊', avatar: '谢', title: '金毛狮王 · 屠龙狂啸',
        region: 'binghuodao', tileIdx: 3, stance: 'gang', power: 85, hp: 185,
        teachArt: 'dali_jingang', affinity: 15, storyStage: 0,
        lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
        quote: '武林至尊，宝刀屠龙！贼老天，你既生我谢逊，何以令我满门惨死！'
      }
    ];
    const MASTER_STORIES = {
      xiaofeng: [
        {
          stage: 0, title: '第一幕：洛阳痛饮三百杯',
          desc: '萧峰豪气干云，在酒桌上连摆十坛烈酒，邀你不论武功高低，先赌酒量胆魄！',
          choiceA: '豪饮十碗，与萧峰畅谈塞北风沙（好感+18，气血上限+8，侠义+10）',
          choiceB: '以掌力化酒气，请教刚猛掌法发力诀窍（好感+15，武学修为+25）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：风雨同舟护阿朱',
          desc: '萧峰为救重伤的阿朱急需护法真气，门外却有黑道仇家趁火打劫，你当仁不让横剑守门！',
          choiceA: '仗剑死守门户三招，不许一人惊扰萧峰（进入护法对决，胜后好感+22，侠义+15）',
          choiceB: '献出珍藏的九花玉露丸助阿朱稳住心脉（好感+22，逍遥+10）',
          duelEnemy: { name: '塞外恶客·追魂掌', title: '趁火打劫 · 凶悍掌客', stance: 'gang', power: 68, hp: 145 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：雁门关外传亢龙',
          desc: '萧峰视你为平生仅见的生死知己，于苍茫山巅迎风演练《降龙十八掌》最精微的「亢龙有悔」，倾囊相授！',
          choiceA: '拜谢义兄，领悟《降龙十八掌》真意并结为八拜之交！（习得/突破《降龙十八掌》，好感满100）',
          choiceB: '与萧峰全力拆招印证至刚掌理（习得/突破《降龙十八掌》，狂傲+15，修为+40）',
          rewardArt: 'xianglong_zhang'
        }
      ],
      linghuchong: [
        {
          stage: 0, title: '第一幕：太白楼上赌快剑',
          desc: '令狐冲囊中羞涩却嗜酒如命，指着窗外飞落的柳叶邀你比试谁能一剑穿三叶！',
          choiceA: '替令狐兄结清酒账，并以巧剑同削柳叶（纹银-8文，好感+18，逍遥+15）',
          choiceB: '拔剑与他现场过招论快剑破绽（好感+15，武学修为+25）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：思过崖前破剑宗',
          desc: '剑宗弃徒封不平率众围逼令狐冲交出华山剑谱，令狐冲内伤未愈，你拔剑挺身相助！',
          choiceA: '代令狐冲出战，三招挫败剑宗狂客（进入切磋对决，胜后好感+22，侠义+15）',
          choiceB: '引令狐冲退入思过崖后洞，共参石壁破招图（好感+20，修为+30）',
          duelEnemy: { name: '剑宗狂客·夺命剑', title: '华山弃徒 · 凌厉快剑', stance: 'qiao', power: 66, hp: 145 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：琴箫合奏传独孤',
          desc: '月夜泛舟，令狐冲吹奏一曲《笑傲江湖》，将风清扬太师叔传授的《独孤九剑·破式》奥旨尽数演示于你！',
          choiceA: '领悟「无招胜有招」之极意，习得《独孤九剑·破式》！（习得/突破《独孤九剑》，逍遥+20）',
          choiceB: '以剑和琴，与令狐冲共创破招新意（习得/突破《独孤九剑》，修为+40）',
          rewardArt: 'dugu_jiujian'
        }
      ],
      huangyaoshi: [
        {
          stage: 0, title: '第一幕：桃林奇门解九宫',
          desc: '黄药师负手立于桃花林中，考校你「二四为肩，六八为足」的九宫八卦步法与律吕五音。',
          choiceA: '依周易方位从容穿阵，不损一枝桃花（好感+18，逍遥+15，修为+20）',
          choiceB: '狂傲一笑，以掌风震落桃花强开生路（好感+18，狂傲+15，修为+20）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：弹指峰头试玉箫',
          desc: '黄药师兴致大发，手持玉箫吹奏《碧海潮生曲》，要试一试你的内息定力与拆招机变！',
          choiceA: '凝神守一，与东邪黄岛主过上三招！（进入对决，胜后好感+22，狂傲+15）',
          choiceB: '以长啸古琴之音相和，化解音波内劲（好感+20，真气上限+12）',
          duelEnemy: { name: '黄药师·玉箫剑法', title: '东海桃花岛主 · 奇门五绝', stance: 'qiao', power: 76, hp: 160 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：清音洞赐弹指功',
          desc: '黄药师赞你性情真率、不拘世俗礼法，在清音洞将桃花岛绝学《弹指神通·惊雷》与秘药相赠！',
          choiceA: '受教《弹指神通·惊雷》真传并获赠九花玉露丸×2！（习得/突破《弹指神通》）',
          choiceB: '与黄药师彻夜纵论天下奇学（习得/突破《弹指神通》，修为+40）',
          rewardArt: 'tanzhi_shentong'
        }
      ],
      zhangsanfeng: [
        {
          stage: 0, title: '第一幕：解剑池畔论阴阳',
          desc: '张三丰鹤发童颜，在竹庐前扫落叶，笑问你：“少侠练剑，记住的招式多，还是忘掉的招式多？”',
          choiceA: '躬身答道：“得意而忘形，唯留神意流转。”（好感+18，逍遥+15，修为+25）',
          choiceB: '请张真人演练云手，观摩以柔克刚之理（好感+18，侠义+10，修为+25）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：紫霄宫前退番僧',
          desc: '西域密宗高手趁张三丰闭关之际上武当山搦战，你主动代武当弟子出阵迎敌！',
          choiceA: '以四两拨千斤之势三招击退西域番僧！（进入对决，胜后好感+22，侠义+15）',
          choiceB: '布太极圆转守势，令敌手自乱阵脚（好感+20，气血上限+12）',
          duelEnemy: { name: '密宗金轮僧', title: '西域挑战者 · 刚猛铁杵', stance: 'gang', power: 72, hp: 155 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：天柱金顶授太极',
          desc: '张三丰于武当金顶观云海翻涌，亲手为你抚顶导引真气，传授《太极云手剑》至高化劲！',
          choiceA: '顿悟太极圆转奥旨，习得/突破《太极云手剑》！（真气上限+16，好感满100）',
          choiceB: '融汇自身内功，气海丹田大成（习得/突破《太极云手剑》，修为+45）',
          rewardArt: 'taiji_quan'
        }
      ],
      zhangwuji: [
        {
          stage: 0, title: '第一幕：昆仑翠谷驱寒毒',
          desc: '张无忌正在救治中了玄冥寒毒的明教兄弟，见你内息醇正，请你助他一臂之力导引阳气。',
          choiceA: '毫无保留损耗自身真气助人驱毒（好感+18，侠义+15，修为+25）',
          choiceB: '与张无忌探讨医武同源之九阳真解（好感+18，真气上限+10）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：坐忘峰顶挫玄冥',
          desc: '玄冥二老中的鹿杖客率众夜袭明教侧峰，你与张无忌左右夹击迎战强敌！',
          choiceA: '拔剑主攻鹿杖客下盘破绽！（进入三招对决，胜后好感+22，侠义+15）',
          choiceB: '为张无忌掠阵，洞察阴寒掌力路数（好感+20，修为+30）',
          duelEnemy: { name: '玄冥鹿杖客', title: '玄冥二老 · 阴寒毒掌', stance: 'rou', power: 74, hp: 160 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：秘道石室参乾坤',
          desc: '张无忌引你进入光明顶秘道石室，将羊皮卷上的《乾坤大挪移·牵引》与《九阳神功》与你倾心共参！',
          choiceA: '顿悟牵引挪移极境，习得/突破《乾坤大挪移·牵引》！（气血上限+20，好感满100）',
          choiceB: '周天真气如烈日初升，习得/突破《九阳神功》！（修为+45）',
          rewardArt: 'qiankun_nuoyi'
        }
      ],
      guojing: [
        {
          stage: 0, title: '第一幕：汉水津渡议城防',
          desc: '郭靖身穿布衣在襄阳城头巡视守军，见你器宇轩昂，邀你入帅府共议如何抵御塞外铁骑。',
          choiceA: '自告奋勇巡查汉水渡口，肃清细作（好感+18，侠义+15，赏银+20文）',
          choiceB: '向郭大侠请教上乘内功如何久战不疲（好感+18，气血上限+12）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：校场夜袭破先锋',
          desc: '敌军先锋趁夜潜入忠烈校场企图焚烧粮草，你与郭靖同时赶到，拔刃迎敌！',
          choiceA: '三招力斩敌军铁甲先锋！（进入对决，胜后好感+22，侠义+20）',
          choiceB: '护住粮仓要害，配合丐帮弟子合围（好感+20，侠名+18）',
          duelEnemy: { name: '铁甲破阵先锋', title: '塞外精锐 · 刚猛狼牙棒', stance: 'gang', power: 72, hp: 155 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：襄阳城头授棒法',
          desc: '郭靖与黄蓉感佩你一片侠肝义胆，于城楼之上将丐帮镇帮绝学《打狗棒法·绊字诀》与降龙掌理传授于你！',
          choiceA: '铭记「侠之大者，为国为民」，习得/突破《打狗棒法·绊字诀》！（侠义+20，好感满100）',
          choiceB: '掌棒同修，贯通奇经八脉（习得/突破《降龙十八掌》，修为+45）',
          rewardArt: 'dagou_bang'
        }
      ],
      yangguo: [
        {
          stage: 0, title: '第一幕：剑冢幽谷观山洪',
          desc: '独孤剑冢山洪暴发，杨过手提黑沉沉的玄铁重剑立于激流之中，剑声与水声轰鸣相抗！',
          choiceA: '跃入山洪之中，与杨过并肩以剑抗潮（好感+18，狂傲+15，修为+25）',
          choiceB: '与神雕过招喂剑，体悟大巧不工之意（好感+18，气血上限+12）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：荒谷竹林斗金轮',
          desc: '西域番僧追踪而至，杨过独臂挥剑相迎，你当即拔剑与他组成双剑合璧之势！',
          choiceA: '三招联手击退西域强敌！（进入对决，胜后好感+22，狂傲+15）',
          choiceB: '以巧变身法牵制敌手（好感+20，修为+30）',
          duelEnemy: { name: '西域密宗法王', title: '五轮大转 · 刚猛霸道', stance: 'gang', power: 76, hp: 165 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：绝情崖畔悟黯然',
          desc: '杨过长啸一声，将思念小龙女十六年所创《黯然销魂掌》心诀倾数传你，并赠玄铁剑意！',
          choiceA: '领悟「心惊肉跳、面无人色」之掌意，习得/突破《黯然销魂掌》！（狂傲+20，好感满100）',
          choiceB: '获杨过指点重剑发力法门（习得/突破《黯然销魂掌》，修为+45）',
          rewardArt: 'anran_zhang'
        }
      ],
      xiaolongnv: [
        {
          stage: 0, title: '第一幕：古墓门前驱恶客',
          desc: '几名贪图古墓秘籍的江湖恶客在活死人墓碑前喧哗，小龙女冷若冰霜，你出手替她清场。',
          choiceA: '三言两语震慑宵小退散，维护古墓清幽（好感+18，逍遥+15，修为+20）',
          choiceB: '协助小龙女喂养玉蜂，品尝百花玉蜂浆（好感+18，气血与真气上限+8）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：寒玉石床抗奇寒',
          desc: '小龙女引你进入寒玉石床室，需以深厚内息抵御彻骨奇寒并击退潜入墓道的血衣暗探！',
          choiceA: '拔剑击退潜入古墓的血衣暗探！（进入对决，胜后好感+22，侠义+15）',
          choiceB: '盘坐寒玉床与小龙女双掌相抵行功（好感+20，真气上限+15）',
          duelEnemy: { name: '血衣盗墓暗探', title: '玄冥分舵 · 阴毒暗器', stance: 'qiao', power: 68, hp: 145 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：石室顶上授素心',
          desc: '小龙女轻指重阳遗刻石室顶部，将林朝英祖师留下的《玉女素心剑》双剑合璧精要传授于你！',
          choiceA: '习得/突破《玉女素心剑》，获赠温玉护心佩！（逍遥+20，好感满100）',
          choiceB: '洞悉古墓派轻灵阴柔真谛（习得/突破《玉女素心剑》，修为+45）',
          rewardArt: 'yunv_jian'
        }
      ],
      duanyu: [
        {
          stage: 0, title: '第一幕：洱海酒楼论茶道',
          desc: '段誉一袭白衣在洱海畔品鉴「十八学士」茶花，见你走来，欢喜地拉你同坐畅谈佛理与周易。',
          choiceA: '与段兄畅谈周易六十四卦与茶花品相（好感+18，逍遥+15，修为+20）',
          choiceB: '替不谙拳脚的段誉挡下酒楼恶霸的无理挑衅（好感+20，侠义+15）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：天龙寺内护剑谱',
          desc: '吐蕃番僧强索天龙寺六脉神剑图谱，段誉六脉剑气时灵时不灵，你仗剑上前与他并肩应敌！',
          choiceA: '替段誉挡下三招刚猛掌力，助他催动剑气！（进入对决，胜后好感+22，侠义+15）',
          choiceB: '指点段誉以北冥真气归元导引（好感+20，真气上限+12）',
          duelEnemy: { name: '吐蕃护教番僧', title: '大轮明王随从 · 火焰掌', stance: 'gang', power: 70, hp: 150 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：无量玉洞传凌波',
          desc: '段誉引你重返无量山剑湖宫玉壁洞，将帛卷上的《凌波微步》与《六脉神剑》运功图谱倾诚相授！',
          choiceA: '踏遍周易六十四卦，习得/突破《凌波微步·掠影》与《六脉神剑》！（逍遥+20，好感满100）',
          choiceB: '参悟北冥纳气法门（习得/突破《北冥神功》，真气上限+20）',
          rewardArt: 'liumai_shenjian'
        }
      ],
      jiumozhi: [
        {
          stage: 0, title: '第一幕：大轮金寺辩武理',
          desc: '大轮明王鸠摩智宝相庄严，双掌合十向你展示少林七十二绝技，考校你对天下武学路数的见识。',
          choiceA: '一眼指出其强行催动小无相功之经脉隐患（好感+18，狂傲+15，修为+25）',
          choiceB: '坦诚论佛，劝其放下武学执念（好感+18，侠义+15，修为+25）',
          rewardArt: null
        },
        {
          stage: 1, title: '第二幕：雪山冰城三招约',
          desc: '鸠摩智傲气大盛，双掌燃起赤红火焰刀劲，定要与你在雪山之巅实打实比试三招！',
          choiceA: '全力出手，三招挫其锐气！（进入对决，胜后好感+22，狂傲+20）',
          choiceB: '以柔克刚化解火焰刀劲，点到为止（进入对决，胜后好感+22，侠义+15）',
          duelEnemy: { name: '鸠摩智·火焰刀', title: '吐蕃国师 · 大轮明王', stance: 'gang', power: 79, hp: 165 },
          rewardArt: null
        },
        {
          stage: 2, title: '第三幕：冰窟顿悟化干戈',
          desc: '鸠摩智走火入魔之际得你护法救治，终于大彻大悟，将毕生苦修的《密宗火焰刀》与《小无相功》心得赠予你！',
          choiceA: '受赠《密宗火焰刀》真解，化敌为莫逆之交！（习得/突破《密宗火焰刀》，好感满100）',
          choiceB: '获赠《小无相功》心法与密宗修为（习得/突破《小无相功》，气血上限+18）',
          rewardArt: 'huoyan_dao'
        }
      ]
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MASTER_STAGE_REQS: MASTER_STAGE_REQS, MASTERS_INIT: MASTERS_INIT, MASTER_STORIES: MASTER_STORIES };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { MASTER_STAGE_REQS, MASTERS_INIT, MASTER_STORIES });
}
