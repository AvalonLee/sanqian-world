/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-encounters.cjs 生成，重跑覆盖
 * MID_ROAD_EVENTS 行脚途中奇遇 + SECRET_REALMS_DB 12 传世秘境
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L4094–L4183 · const MID_ROAD_EVENTS
 * view/games/qunxia/game.html L9489–L9562 · const SECRET_REALMS_DB
 * ============================================================ */

    const MID_ROAD_EVENTS = [
      {
        id: 'meet_xia',
        tag: '途中奇遇',
        title: '陌路侠客',
        desc: '古道拐角，一名青衫客拱手问好，愿以一壶浊酒换你片刻闲谈。',
        choices: [
          { label: '把酒畅谈（侠名 +4，内息 -4）', effect: { fame: 4, mp: -4 } },
          { label: '客气拱手，各奔东西（无事）', effect: {} },
          { label: '请教一招步法（武学 +8，行脚 -0）', effect: { exp: 8 } }
        ]
      },
      {
        id: 'bandits',
        tag: '途中劫道',
        title: '剪径毛贼',
        desc: '林荫深处跳出三两毛贼，明晃晃的刀口直指你的包袱。',
        choices: [
          { label: '丢几文银子脱身（-8 文）', effect: { gold: -8 } },
          { label: '拔剑喝退（气血 -8，侠名 +3）', effect: { hp: -8, fame: 3 } },
          { label: '轻功绕道（内息 -10）', effect: { mp: -10 } }
        ]
      },
      {
        id: 'caravan',
        tag: '途中商队',
        title: '路过镖队',
        desc: '一队镖车缓缓而行，镖头见你面善，招呼你歇脚吃口热饼。',
        choices: [
          { label: '随队一程（+6 文盘缠）', effect: { gold: 6 } },
          { label: '买个路引情报（-4 文，侠名 +2）', effect: { gold: -4, fame: 2 } },
          { label: '拱手谢过，继续赶路', effect: {} }
        ]
      },
      {
        id: 'storm',
        tag: '风雨延误',
        title: '山雨骤至',
        desc: '乌云压岭，豆大雨点砸下来，驿道转眼泥泞难行。',
        choices: [
          { label: '破庙避雨（行脚 -1，气血 +6）', effect: { ap: -1, hp: 6 } },
          { label: '冒雨急行（气血 -6，内息 -6）', effect: { hp: -6, mp: -6 } },
          { label: '就近买蓑衣（-5 文）', effect: { gold: -5 } }
        ]
      },
      {
        id: 'fortune',
        tag: '途中奇缘',
        title: '路边残卷',
        desc: '雨后泥里露出半页帛书，墨迹未完全晕开，隐约是某路拳谱残句。',
        choices: [
          { label: '驻足抄录（武学 +12，内息 -8）', effect: { exp: 12, mp: -8 } },
          { label: '卷起带走，回头再研（武学 +6）', effect: { exp: 6 } },
          { label: '原样埋回，不贪无主之物（侠义心安）', effect: { xiayi: 3 } }
        ]
      },
      {
        id: 'beggar',
        tag: '途中见闻',
        title: '老丐讨食',
        desc: '桥洞下蜷着一位老丐，竹筒空空，却笑嘻嘻盯着你的干粮袋。',
        choices: [
          { label: '施舍干粮银钱（-3 文，侠名 +5）', effect: { gold: -3, fame: 5, xiayi: 4 } },
          { label: '对弈残局换路引（武学 +5）', effect: { exp: 5 } },
          { label: '装作未见，快步离开', effect: {} }
        ]
      },
      {
        id: 'courier',
        tag: '途中飞鸽',
        title: '信使擦肩',
        desc: '一名灰衣信使纵马而过，马鞍旁鼓鼓囊囊，似有江湖急报。',
        choices: [
          { label: '出银换一份邸报摘要（-6 文，侠名 +2）', effect: { gold: -6, fame: 2 } },
          { label: '顺路护送一程（行脚 -1，侠名 +6）', effect: { ap: -1, fame: 6, xiayi: 3 } },
          { label: '各走各路', effect: {} }
        ]
      },
      {
        id: 'herbalist',
        tag: '途中药香',
        title: '采药人',
        desc: '山坡上一位采药人正捆扎草药，见你气色不佳，主动招呼。',
        choices: [
          { label: '买一包止血散（-7 文，气血 +18）', effect: { gold: -7, hp: 18 } },
          { label: '以武换药：演示一记拳脚（气血 +10）', effect: { hp: 10 } },
          { label: '婉谢好意', effect: {} }
        ]
      }
    ];
    const SECRET_REALMS_DB = {
      wuliang: {
        title: '【无量玉壁 · 琅嬛福地神仙玉像】',
        desc: '你攀下无量山万丈深谷，步入一间石室，只见一尊白玉雕成的神仙姐姐玉像栩栩如生，蒲团上写着：“磕首千遍，供我驱策”。',
        artId: 'beiming_shengong', secondArtId: 'lingbo_weibu', bonusExp: 65,
        logMsg: '于【无量山玉壁洞】磕穿蒲团，习得逍遥派旷世绝学《北冥神功》与《凌波微步》！'
      },
      gumu: {
        title: '【活死人墓 · 重阳遗刻九阴真经】',
        desc: '你潜入古墓最深处的石棺密室，仰首只见石室顶上密密麻麻刻着王重阳所留破尽玉女心经之法与《九阴真经》梵文总纲！',
        artId: 'jiuyin_zhua', secondArtId: 'yunv_jian', bonusExp: 60,
        logMsg: '于【活死人墓】参透王重阳石棺刻字，习得《九阴神爪·催心》与《玉女素心剑》！'
      },
      shaolin: {
        title: '【少林藏经阁 · 扫地神僧点化】',
        desc: '夜色深沉，你在藏经阁书架间翻阅经书，一名身穿灰布僧袍的扫地老僧悄然现身，合十微笑道：“武学障需以佛法化解。”',
        artId: 'yijin_jing', bonusExp: 80,
        logMsg: '于【少林藏经阁】蒙扫地神僧点化，习得禅宗至高内功《少林易筋经》！'
      },
      huashan: {
        title: '【华山思过崖 · 风清扬传授独孤九剑】',
        desc: '你持火把步入思过崖后洞，石壁上尽是五岳剑派破招图形。白须青袍的风清扬前辈自暗处走出：“无招胜有招，你且看好了！”',
        artId: 'dugu_jiujian', bonusExp: 75,
        logMsg: '于【华山思过崖】获风清扬前辈传授剑魔绝学《独孤九剑·破式》！'
      },
      xiangyang: {
        title: '【独孤剑冢 · 神雕山洪练重剑】',
        desc: '神雕引你登上剑冢孤峰，搬开石块露出“重剑无锋，大巧不工”八字，并衔来一枚蛇胆助你于山洪瀑布中练剑！',
        artId: 'anran_zhang', grantEquipSlot: 'weapon', grantEquipId: 'xuantie_jian', bonusExp: 70,
        logMsg: '于【襄阳独孤剑冢】食菩斯曲蛇胆、在山洪中悟得《黯然销魂掌》并获【玄铁重剑·仿】！'
      },
      yanziwu: {
        title: '【姑苏燕子坞 · 还施水阁阅尽百家】',
        desc: '你借小舟潜入参合庄还施水阁，架上摆满天下各派武功秘籍图谱，更在暗格中寻获慕容龙城手书的《斗转星移》心诀！',
        artId: 'douzhuan_xingyi', bonusExp: 70,
        logMsg: '于【姑苏燕子坞】还施水阁潜心研读，习得慕容氏绝学《斗转星移·还施》！'
      },
      heimuya: {
        title: '【黑木崖密室 · 葵花宝典与吸星铁板】',
        desc: '你穿过黑木崖后山假山秘道，在绣花小院石床下同时发现任我行刻下的《吸星大法》铁板与东方不败遗留的《葵花残卷》！',
        artId: 'kuihua_jian', secondArtId: 'xixing_dafa', bonusExp: 80,
        logMsg: '于【黑木崖绣花密室】参悟魔道至高绝学《葵花鬼影剑》与《吸星大法》！'
      },
      guangming: {
        title: '【光明顶秘道 · 阳顶天遗书乾坤挪移】',
        desc: '你在光明顶秘道石室拜祭阳顶天教主骸骨，于骷髅手旁拾起一束特制羊皮卷，上面用血书写着《乾坤大挪移》七层心法！',
        artId: 'qiankun_nuoyi', secondArtId: 'jiuyang_shengong', bonusExp: 75,
        logMsg: '于【光明顶秘道】寻获羊皮卷，习得明教至高绝学《乾坤大挪移》与《九阳神功》！'
      },
      xiakedao: {
        title: '【东海侠客岛 · 二十四石室白首太玄】',
        desc: '你饮下断肠蚀骨腊八粥，走入刻满李白《侠客行》诗句的二十四座石室。抛开文字注解，但见壁上剑影流动，浑身真气豁然贯通！',
        artId: 'taixuan_jing', bonusExp: 110,
        logMsg: '于【东海侠客岛】二十四石室勘破天机，习得旷古绝今的《太玄经神功》！'
      },
      binghuodao: {
        title: '【极北冰火岛 · 火山口参悟屠龙刀意】',
        desc: '你在极北火山口观摩谢逊以屠龙宝刀劈斩玄冰，炽热地火与极寒冰气交融，令你的刀掌修为与随身兵刃同时蜕变！',
        artId: 'huoyan_dao', bonusExp: 75, bonusIron: 3,
        logMsg: '于【极北冰火岛】参透屠龙霸道刀意，习得《密宗火焰刀》并获百炼玄铁 ×3！'
      },
      changbai: {
        title: '【辽东长白山 · 闯王军刀宝藏与胡家刀谱】',
        desc: '你循着冷月宝刀上的藏宝图纹进入长白山万年冰洞，在闯王宝藏箱中寻获完整的《胡家刀法》总诀与关外珍宝！',
        artId: 'hujia_daofa', bonusExp: 65, bonusGold: 120,
        logMsg: '于【辽东长白山】开启闯王宝藏冰洞，习得《胡家刀法·缠身》并获藏银 120 文！'
      },
      tangmen: {
        title: '【蜀中唐门 · 暴雨梨花暗器秘窟】',
        desc: '你破解唐家堡九重机簧锁，在毒经密窟中寻得唐门先祖打造的「暴雨梨花针」图谱与奇毒秘方！',
        artId: 'tangmen_lihua', secondArtId: 'wudu_shenzhang', bonusExp: 65,
        logMsg: '于【蜀中唐门】破译机簧密窟，习得《唐门暴雨梨花》与《五毒赤练掌》！'
      }
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MID_ROAD_EVENTS: MID_ROAD_EVENTS, SECRET_REALMS_DB: SECRET_REALMS_DB };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { MID_ROAD_EVENTS, SECRET_REALMS_DB });
}
