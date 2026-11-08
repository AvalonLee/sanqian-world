/* world-registry.js — 世界注册表（三千世界 · 门环选择器数据源）
 * 每个新资料片 = 一张世界卡。status: 'open' | 'coming'
 * 入口路径相对 view/worlds/index.html。 */
window.WORLD_REGISTRY = [
  {
    id: 'xiuxian',
    seq: '第一世界',
    name: '仙侠世界',
    tagline: '灵气 · 洞天 · 渡劫飞升',
    desc: '玄幻修仙世界。九页主壳 · 放置修炼 · 奇遇事件池 · 宗门势力 · 道侣双修。',
    path: '../index.html',
    status: 'open',
    hue: 0.45,          /* 青色系 */
    mist: 0x2a6b5e,
    peak: 0x3a8a7a,
    particle: 0xffd700, /* 金色灵气粒子 */
    seal: '仙'
  },
  {
    id: 'wuxia',
    seq: '第二世界',
    name: '侠影世界',
    tagline: '水墨 · 江湖 · 三十六旬',
    desc: '金庸武侠世界。三维山河棋盘 · 30 地界 · 三招对决 · 36 桩天下大事。',
    path: '../games/qunxia3d/index.html',
    status: 'open',
    hue: 0.08,          /* 赭石系 */
    mist: 0x8b6914,
    peak: 0x5a4a2a,
    particle: 0xc4a44a, /* 暗金粒子 */
    seal: '侠'
  },
  {
    id: 'coming_1',
    seq: '第三世界',
    name: '？？？？',
    tagline: '资料片筹备中',
    desc: '下一站，未知的玩法与技术实验。',
    path: null,
    status: 'coming',
    hue: 0.7,
    mist: 0x444444,
    peak: 0x333333,
    particle: 0x888888,
    seal: '？'
  }
];
