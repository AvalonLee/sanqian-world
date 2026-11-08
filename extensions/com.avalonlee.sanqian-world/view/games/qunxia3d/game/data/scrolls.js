/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-scrolls.cjs 生成，重跑覆盖
 * SCROLL_PROPOSITIONS_DB 残卷命题池 + MASTER_SCROLL_TAGS 名宿残卷态度标签
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L6435–L6496 · const SCROLL_PROPOSITIONS_DB
 * view/games/qunxia/game.html L6498–L6539 · const MASTER_SCROLL_TAGS
 * ============================================================ */

    const SCROLL_PROPOSITIONS_DB = [
      {
        id: 'jianyi', name: '剑意',
        hook: '残卷有字：剑在人在，意在剑先。',
        summary: '本局偏剑招比武；剑客更亲，书生请教略难。比武台更早可见。',
        weightTags: { sword: 1.8, duel: 1.8, romance: 0.6 },
        disable: '首旬软门派捷径',
        boost: '剑冢/比武入口提前可见',
        masterBias: { sword: 1, scholar: -1 },
        endingHint: '剑道证果 / 独行剑客'
      },
      {
        id: 'qingzhai', name: '情债',
        hook: '半卷胭脂帖：欠下的，江湖都记得。',
        summary: '本局偏情缘护送；女侠更亲，朝廷线人更冷。',
        weightTags: { romance: 1.8, escort: 1.8, bounty: 0.5 },
        disable: '冷血灭口（首次改警告）',
        boost: '红绳事件链权重提升',
        masterBias: { heroine: 1, court: -1 },
        endingHint: '情债了结 / 双人结局'
      },
      {
        id: 'chaoting', name: '朝廷',
        hook: '黄绫残诏：山河在棋，棋在庙堂。',
        summary: '本局偏官差诏令；朝廷相关更亲，绿林大豪更冷。',
        weightTags: { court: 1.9, border: 1.9, outlaw: 0.55 },
        disable: '公开反朝堂入派',
        boost: '驿站情报免费倾向',
        masterBias: { court: 1, outlaw: -1 },
        endingHint: '入仕护国 / 弃诏归隐'
      },
      {
        id: 'chousha', name: '仇杀',
        hook: '血字半页：此仇不报，枉称江湖。',
        summary: '本局偏复仇追杀；仇家带杀意，医馆更愿收留。',
        weightTags: { revenge: 2.0, chase: 2.0, banquet: 0.5 },
        disable: '忘仇隐居捷径',
        boost: '仇人行踪风声常显',
        masterBias: { healer: 1, rival: -1 },
        endingHint: '血债血偿 / 放下屠刀'
      },
      {
        id: 'qiyu', name: '奇遇',
        hook: '撕角残图：路在脚底，机缘在天。',
        summary: '本局偏秘洞残谱；隐士易见，名门掌门更难见。途中事略多。',
        weightTags: { secret: 1.9, road: 1.25, sect: 0.7 },
        disable: '首局强制拜师',
        boost: '途中随机 +25%',
        masterBias: { hermit: 1, sect_lord: -1 },
        endingHint: '奇遇开宗 / 无名散修'
      },
      {
        id: 'xiaming', name: '侠名',
        hook: '邸报残页：天下谁人不识君——尚未。',
        summary: '本局偏行侠聚义；正派更快引荐，魔教诱饵更多。',
        weightTags: { chivalry: 1.7, bounty: 1.7, dark: 0.5 },
        disable: '匿名暗杀线',
        boost: '侠行传闻权重 +1',
        masterBias: { righteous: 1, demon: -1 },
        endingHint: '名扬天下 / 毁誉参半'
      }
    ];
    const MASTER_SCROLL_TAGS = {
      linghuchong: ['sword', 'righteous', 'heroine'],
      xiaofeng: ['righteous', 'outlaw', 'revenge'],
      yangguo: ['sword', 'romance', 'hermit'],
      zhangsanfeng: ['sword', 'hermit', 'scholar'],
      huangyaoshi: ['scholar', 'hermit', 'sword'],
      guojing: ['righteous', 'court', 'border'],
      huangrong: ['scholar', 'court', 'heroine'],
      zhoubotong: ['hermit', 'fist'],
      yideng: ['healer', 'hermit', 'scholar'],
      hongqigong: ['fist', 'righteous', 'outlaw'],
      ouyangfeng: ['rival', 'demon', 'revenge'],
      dingchunqiu: ['demon', 'rival'],
      murongfu: ['sword', 'rival', 'dark'],
      zhangwuji: ['righteous', 'demon', 'romance'],
      zhaomin: ['court', 'heroine', 'romance'],
      xiaolongnv: ['sword', 'romance', 'hermit'],
      liqiushui: ['demon', 'romance'],
      azhu: ['romance', 'heroine'],
      azuo: ['romance', 'heroine'],
      wangyuyan: ['scholar', 'romance'],
      dongfangbubai: ['demon', 'sword'],
      renyingying: ['romance', 'heroine', 'demon'],
      yilin: ['righteous', 'heroine'],
      quanyang: ['healer', 'heroine'],
      chengkun: ['rival', 'dark'],
      xiexun: ['revenge', 'outlaw'],
      weiyixiao: ['demon'],
      yangxiao: ['demon', 'sect_lord'],
      fanyao: ['demon'],
      yintianzheng: ['demon', 'sect_lord'],
      shuobude: ['demon', 'hermit'],
      songyuanqiao: ['sect_lord', 'righteous'],
      yueliang: ['sect_lord', 'sword'],
      zuolengchan: ['sect_lord', 'court', 'rival'],
      yuebuqun: ['sect_lord', 'sword', 'dark'],
      ningzhongze: ['heroine', 'righteous'],
      linpingzhi: ['sword', 'revenge'],
      tianshan_tonglao: ['demon', 'sect_lord'],
      limochou: ['rival', 'romance', 'sword'],
      gongsunzhi: ['rival', 'dark']
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCROLL_PROPOSITIONS_DB: SCROLL_PROPOSITIONS_DB, MASTER_SCROLL_TAGS: MASTER_SCROLL_TAGS };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { SCROLL_PROPOSITIONS_DB, MASTER_SCROLL_TAGS });
}
