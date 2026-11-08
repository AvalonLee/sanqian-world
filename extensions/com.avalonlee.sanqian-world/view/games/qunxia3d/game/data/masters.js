/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-masters.cjs 生成，重跑覆盖
 * MASTERS_INIT 24 名宿（计划书「名宿 12 人」指可交互名宿子集）——MASTER_STORIES/REQS 拆 masters-stories.js、SIDE_CAST 拆 side-cast.js（均 lazy）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L2571–L2741 · const MASTERS_INIT
 * ============================================================ */

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MASTERS_INIT: MASTERS_INIT };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { MASTERS_INIT });
}
