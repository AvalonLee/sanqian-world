/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-sects.cjs 生成，重跑覆盖
 * SECTS_DB 12 派（名号/档位/辈分/收徒规则标签）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L1725–L1800 · const SECTS_DB
 * ============================================================ */

    const SECTS_DB = {
      huashan: {
        id: 'huashan', name: '华山剑派', region: 'huashan', leader: '岳不群 / 风清扬',
        stance: 'qiao', desc: '五岳剑派之首，紫霞神功与独孤九剑名震天下，讲究奇险巧变、以快打慢。',
        ranks: ['华山外门剑童', '华山内门剑侠', '紫霞真传首座', '华山掌门·五岳盟主'],
        arts: ['luoying_jian', 'zixia_shengong', 'dugu_jiujian']
      },
      shaolin: {
        id: 'shaolin', name: '嵩山少林派', region: 'shaolin', leader: '玄慈方丈 / 扫地神僧',
        stance: 'gang', desc: '禅宗祖庭，武学泰斗。七十二绝技与《易筋经》至刚至正，护体金身坚不可摧。',
        ranks: ['少林俗家记名', '罗汉堂精英武僧', '达摩院真传首座', '少林护教神僧'],
        arts: ['dali_jingang', 'huoyan_dao', 'yijin_jing']
      },
      wudang: {
        id: 'wudang', name: '武当玄门', region: 'wudang', leader: '张三丰真人',
        stance: 'rou', desc: '内家泰斗，崇尚道法自然。太极云手剑以柔克刚，四两拨千斤。',
        ranks: ['武当清修道童', '紫霄宫内门道长', '太极真传首座', '武当掌教真人'],
        ranksReqRealm: [0, 2, 3, 4],
        arts: ['taiji_quan', 'qiankun_nuoyi', 'jiuyang_shengong']
      },
      taohua: {
        id: 'taohua', name: '东海桃花岛', region: 'taohua', leader: '东邪黄药师',
        stance: 'qiao', desc: '融琴棋书画、奇门遁甲于武学之中，落英神剑掌与弹指神通潇洒绝伦。',
        ranks: ['桃花岛记名门人', '绿竹轩入室弟子', '弹指峰真传传人', '东海奇门少岛主'],
        arts: ['luoying_jian', 'tanzhi_shentong', 'xiaowuxiang_gong']
      },
      guangming: {
        id: 'guangming', name: '西域明教', region: 'guangming', leader: '张无忌教主',
        stance: 'rou', desc: '熊熊圣火，怜我世人。乾坤大挪移与九阳神功相辅相成，正邪莫敢撄锋。',
        ranks: ['五行旗外围教众', '光明顶护教统领', '光明左右使首座', '明教圣火副教主'],
        arts: ['qiankun_nuoyi', 'jiuyang_shengong', 'huoyan_dao']
      },
      zhongnan: {
        id: 'zhongnan', name: '终南古墓派', region: 'zhongnan', leader: '小龙女 / 杨过',
        stance: 'qiao', desc: '活死人墓清修隐世，玉女素心剑与九阴真经残篇轻灵奇诡，双剑合璧天下无双。',
        ranks: ['终南山外院侍剑', '寒玉室入室传人', '重阳石室真传', '神雕古墓传人'],
        arts: ['yunv_jian', 'jiuyin_zhua', 'anran_zhang']
      },
      xiangyang: {
        id: 'xiangyang', name: '中原丐帮', region: 'xiangyang', leader: '萧峰 / 郭靖',
        stance: 'gang', desc: '天下第一大帮，镇守襄阳雄关。降龙十八掌与打狗棒法冠绝古今。',
        ranks: ['丐帮三袋弟子', '丐帮七袋护法', '九袋长老·传功首座', '绿玉竹杖·少帮主'],
        arts: ['babei_dao', 'dagou_bang', 'xianglong_zhang']
      },
      dali: {
        id: 'dali', name: '大理天龙门', region: 'dali', leader: '段誉 / 枯荣大师',
        stance: 'qiao', desc: '南诏段氏与逍遥遗脉合流，北冥神功、凌波微步与六脉神剑潇洒如仙。',
        ranks: ['镇南王府客卿', '天龙寺护法居士', '无量玉洞真传', '南诏大理武圣'],
        arts: ['lingbo_weibu', 'beiming_shengong', 'liumai_shenjian']
      }
      ,
      heimuya: {
        id: 'heimuya', name: '日月神教', region: 'heimuya', leader: '东方不败 / 任我行',
        stance: 'qiao', desc: '黑木崖总坛威震河北，行事诡谲霸道。《吸星大法》与《葵花鬼影剑》令正道闻风丧胆。',
        ranks: ['风雷堂外围教众', '青龙堂香主', '光明右使·护法长老', '黑木崖·日月圣教主'],
        arts: ['wuhu_dao', 'xixing_dafa', 'kuihua_jian']
      },
      yanziwu: {
        id: 'yanziwu', name: '姑苏慕容氏', region: 'yanziwu', leader: '慕容复 / 慕容博',
        stance: 'rou', desc: '江南武林世家，琅嬛玉洞遍藏百家武学，独门绝技《斗转星移》以彼之道还施彼身。',
        ranks: ['燕子坞外姓门客', '四大家臣护卫', '还施水阁统领', '姑苏慕容·参合家主'],
        arts: ['tanzhi_shentong', 'xiaowuxiang_gong', 'douzhuan_xingyi']
      },
      xingxiu: {
        id: 'xingxiu', name: '西域星宿派', region: 'xingxiu', leader: '星宿老仙丁春秋',
        stance: 'rou', desc: '盘踞西域星宿海，门人擅长奇毒暗器与《化功大法》，弱肉强食、唯强者为尊。',
        ranks: ['星宿海吹鼓学徒', '神木堂掌毒弟子', '星宿海护法大师兄', '西域毒宗·星宿老仙'],
        arts: ['wudu_shenzhang', 'huagong_dafa', 'jiuyin_zhua']
      },
      emei: {
        id: 'emei', name: '蜀山峨眉派', region: 'emei', leader: '灭绝师太 / 郭襄',
        stance: 'qiao', desc: '郭襄女侠开创之西蜀大派，金顶佛光普照，剑掌双绝，兼具道家清灵与佛门慈悲。',
        ranks: ['报国寺俗家弟子', '万年寺佩剑知客', '金顶护法静字辈首座', '峨眉金顶·掌门宗师'],
        arts: ['luoying_jian', 'taiji_quan', 'jiuyang_shengong']
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SECTS_DB: SECTS_DB };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { SECTS_DB });
}
