/* assets/worlds/wuxia/lexicon-blade.js — 兵刃与行装词表（册227 立卷 · 第六分卷）
 *
 * 键形三类：
 *   ① `wp.<id>.name`（20）= data.js WEAPONS[].i 一一对应；行装页 / 市集货架 / 战报卡共用，
 *      一律 `SQ.t('wp.'+id+'.name', null, 'wuxia')`。
 *   ② `wh.gear.*` = 行装页（G4 兵器槽 + G15 神兵谱）界面文案。
 *   ③ `shop.<id>.name` 两键 = 市集药类货架（册227 顺手补的既有缺键：`shopBody` 按
 *      `shop.<id>.name` 取词而全库无此键 ⇒ 界面长期显示裸键名；兵器项本批改走 `wp.<id>.name`）。
 *
 * 为什么单独立卷：兵刃名既不是武学（lexicon-arts）也不是人名地名（lexicon-cast），
 * 塞进任一卷都会让「键族 = 数据表」的一一对应失准；分卷后 A1 白名单照旧（lexicon*.js）。
 * 件数口径：20 键 = 2 寻常/好兵刃（市集可买）+ 18 名兵（谱上收集，不卖）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.lexRegister('wuxia', {
    'wp.wp_tiedao.name': '铁刀',
    'wp.wp_haojian.name': '好剑',
    'wp.wp_tulong.name': '屠龙刀',
    'wp.wp_yitian.name': '倚天剑',
    'wp.wp_xuantie.name': '玄铁重剑',
    'wp.wp_junzi.name': '君子剑',
    'wp.wp_shunv.name': '淑女剑',
    'wp.wp_dagou.name': '打狗棒',
    'wp.wp_yuxiao.name': '玉箫',
    'wp.wp_jinshe.name': '金蛇剑',
    'wp.wp_bixue.name': '碧血剑',
    'wp.wp_lengyue.name': '冷月宝刀',
    'wp.wp_ningbi.name': '凝碧剑',
    'wp.wp_lvbo.name': '绿波香露刀',
    'wp.wp_xuedao.name': '血刀',
    'wp.wp_yuanyang.name': '鸳鸯刀',
    'wp.wp_zhenwu.name': '真武剑',
    'wp.wp_dagger.name': '玄铁匕首',
    'wp.wp_jinlun.name': '金轮',
    'wp.wp_ezui.name': '鳄嘴剪',

    /* 行装页（G4 兵器槽 + G15 神兵谱） */
    'wh.gear.title': '行装',
    'wh.gear.slot.weapon': '兵器',
    'wh.gear.slot.ranged': '暗器',
    'wh.gear.slot.armor': '护身',
    'wh.gear.slot.boots': '鞋履',
    'wh.gear.cur': '在手',
    'wh.gear.empty': '赤手空拳',
    'wh.gear.equip': '换上',
    'wh.gear.unequip': '卸下',
    'wh.gear.mult': '兵刃 ×{n}',
    'wh.gear.stash': '兵器库',
    'wh.gear.stashEmpty': '库中无兵。',
    'wh.gear.codex': '神兵谱',
    'wh.gear.codexProg': '已收 {n} / {t}',
    'wh.gear.codexUnknown': '？？？',
    'wh.gear.onbody': '在身',
    'wh.gear.owned': '库中',
    'wh.gear.tier.0': '寻常兵刃',
    'wh.gear.tier.1': '好兵刃',
    'wh.gear.tier.2': '名兵',
    'wh.gear.rest': '暗器 / 护身 / 鞋履三槽此路未开——随后续批次接续。',
    'wh.gear.bladeWin': '夺下 {name}',
    'wh.gear.bladeDupe': '{name} 谱上已有，折价 {n} 文',

    /* 市集药类货架（既有缺键补齐） */
    'shop.shop_salve.name': '金疮药',
    'shop.shop_ginseng.name': '老山参'
  });
})();
