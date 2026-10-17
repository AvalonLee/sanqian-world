/* xiuxian/treasures.js — 法宝（灵宝）全录数据表（零 CJK，文案走词表 treasure.*）
 * 事实源：《法宝全录（30件）.md》（归档）+ 数值详设 §十（46 件 = 首批 30 + 双书扩容 6 §10.6 + 双书二批 10 §10.7）
 * ——数值/规则先改文档再动本文件。按件等级上限支持 MAX_STAGE/MAX_LV 覆盖（x18 五阶全效 / h19 三级生效上限）。
 * 与四槽法器（ws.gear）完全独立：法宝无 atk/resist，只带签名效果，不参与自动择优/炼化/库藏阁。
 *
 * scaled 值域 [v1, vmax]：后天按祭炼等级 lv(1..5) 线性插值；先天按认主阶 stage(1..3) 线性插值。
 * scaled 键族（工程规范 §2.2 挂点白名单子集）：
 *   mult:<乘区字段>   → 并入 mods.sum（同乘区加算，与法器/功法同口径）
 *   hook:<挂点 id>    → 并入 mods.hooks（消费端见各 systems）
 * special：无法用挂点表达的一次性脚本（认主成长 / 资源转化 / 渡劫护体 等），消费端 = SQ.Treasures。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var LIST = [
    /* ── 先天法宝（19 件 · 全局唯一 · 认主成长 1→3 阶；x18 例外 1→5 阶）── */
    { id: 'x01', forma: 'xian', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 4, attrs: { jing: 30, qi: 30, shen: 30 } }, scaled: {}, special: 'fate' },
    { id: 'x02', forma: 'xian', kind: 'xian', grade: 'xian_zhong',
      reqs: { realm: 1 }, scaled: {}, special: 'growth' },
    { id: 'x03', forma: 'gu', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 3, attrs: { shen: 24 } }, scaled: {}, special: 'tower' },
    { id: 'x04', forma: 'gu', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 4 },
      scaled: { 'hook:on_negative_event': [0.5, 0.5], 'hook:on_bottleneck_power': [0.20, 0.20] } },
    { id: 'x05', forma: 'jian', kind: 'xian', grade: 'xian_ji',
      reqs: { realm: 7, attrs: { jing: 48 } },
      scaled: { 'hook:on_crit_kill': [0.10, 0.10] } },
    { id: 'x06', forma: 'gu', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 5 },
      scaled: { 'hook:on_offline_cap_h': [6, 6], 'mult:offlineEff': [0.20, 0.20] } },
    { id: 'x07', forma: 'jian', kind: 'xian', grade: 'xian_ji',
      reqs: { realm: 6, karmaMax: -200 }, scaled: {}, special: 'slaughter' },
    { id: 'x08', forma: 'gu', kind: 'xian', grade: 'xian_zhong',
      reqs: { realm: 2 },
      scaled: { 'hook:on_stash_cap': [24, 24], 'mult:eventRate': [0.30, 0.30], 'hook:on_event_stones': [1.0, 1.0] } },
    { id: 'x09', forma: 'xian', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 3, attrs: { qi: 24 } }, scaled: {}, special: 'budou' },
    { id: 'x10', forma: 'gu', kind: 'xian', grade: 'xian_ji',
      reqs: { realm: 4, attrs: { jing: 24, qi: 24, shen: 24 } },
      scaled: { 'mult:artsSpeed': [0.50, 0.50] } },
    { id: 'x11', forma: 'gu', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 5 }, scaled: {}, special: 'convert' },
    { id: 'x12', forma: 'yao', kind: 'xian', grade: 'xian_shang',
      reqs: { realm: 3, karmaMax: -500 },
      scaled: { 'hook:on_kill_stones': [0.40, 0.40], 'mult:combatSpeed': [0.30, 0.30] }, special: 'degenerate' },
    /* ── 双书梗化扩容批 §10.6 三件先天（恢复批 2026-10-03）── */
    { id: 'x13', forma: 'jian', kind: 'xian', grade: 'xian_shang',   /* 青竹蜂云剑：秘境 8 混沌雷海首通授予（ZONE_TREASURE 补 zone8） */
      reqs: { realm: 6 }, scaled: { 'mult:combatPower': [0.03, 0.09] } },
    { id: 'x14', forma: 'shou', kind: 'xian', grade: 'xian_shang',   /* 噬金虫王：神秘商人特席 scout 顶格 50% 上架（MERCHANT_IDS） */
      reqs: { realm: 6 }, scaled: { 'hook:on_kill_stones': [0.04, 0.12] } },
    { id: 'x15', forma: 'jian', kind: 'xian', grade: 'xian_ji',      /* 护世之剑：特席同渠道；tribBonus 与各渡劫加项并列先加总后 clamp */
      reqs: { realm: 7 }, scaled: { 'mult:tribBonus': [0.02, 0.06] } },
    /* ── 双书梗化二批 §10.7 四件先天（均不占 zone 位；x17/x18/x19 = №113/№104/№91 联动 treasure gain）── */
    { id: 'x16', forma: 'gu', kind: 'xian', grade: 'xian_zhong',   /* 玄青瓶：入 MERCHANT_IDS（二批 A5） */
      reqs: { realm: 5 }, scaled: { 'mult:qiRate': [0.02, 0.06] } },
    { id: 'x17', forma: 'gu', kind: 'xian', grade: 'xian_zhong',   /* 乱星盘：星宫联动奇遇 №113 乱星夜卜 */
      reqs: { realm: 5 }, scaled: { 'mult:eventLuck': [0.02, 0.06] } },
    { id: 'x18', forma: 'yao', kind: 'xian', grade: 'xian_ji', MAX_STAGE: 5,   /* 昆吾镇魔链：№104 联动；满阶 −2.5pp（5 阶全效 · 主代理裁定口径） */
      reqs: { realm: 6 }, scaled: { 'mult:tribFailLossMod': [-0.005, -0.025] } },
    { id: 'x19', forma: 'shou', kind: 'xian', grade: 'xian_zhong',   /* 龙髓珠：老龙城联动 №91 */
      /* life = 认主每晋一阶授寿的年数（第卌八批 · 三阶共三次）：珠中龙髓养人，是本卷唯一一件
       * 明写「给寿」的先天件，其余法宝的寿元一律经它自己的 special/hook 走，不给第二套数。 */
      reqs: { realm: 6 }, scaled: { 'mult:qiCap': [0.02, 0.06] }, life: 150 },

    /* ── 后天法宝（27 件 · 修士炼制 · 祭炼 1→5 级；h19 例外 1→3 级）── */
    { id: 'h01', forma: 'shou', kind: 'hou', grade: 'ling', reqs: { realm: 2 }, scaled: { 'mult:qiRate': [0.15, 0.30] } },
    { id: 'h02', forma: 'jian', kind: 'hou', grade: 'shang', reqs: { realm: 1 }, scaled: { 'mult:combatSpeed': [0.20, 0.35] } },
    { id: 'h03', forma: 'gu', kind: 'hou', grade: 'ling', reqs: { realm: 2 },
      scaled: { 'hook:on_offline_cap_h': [3, 5], 'mult:offlineEff': [0.15, 0.25] } },
    { id: 'h04', forma: 'gu', kind: 'hou', grade: 'liang', reqs: { realm: 0 }, scaled: { 'hook:on_stash_cap': [12, 24] } },
    { id: 'h05', forma: 'gu', kind: 'hou', grade: 'shang', reqs: { realm: 2, attrs: { shen: 18 } },
      scaled: { 'mult:eventLuck': [0.20, 0.35] } },
    { id: 'h06', forma: 'shou', kind: 'hou', grade: 'liang', reqs: { realm: 0 }, scaled: { 'hook:on_negative_avoid': [0.15, 0.30] } },
    { id: 'h07', forma: 'gu', kind: 'hou', grade: 'shang', reqs: { realm: 3 }, scaled: { 'hook:on_bottleneck_power': [0.25, 0.45] } },
    { id: 'h08', forma: 'gu', kind: 'hou', grade: 'ling', reqs: { realm: 2 }, scaled: { 'mult:shopCost': [-0.08, -0.15] } },
    { id: 'h09', forma: 'gu', kind: 'hou', grade: 'shang', reqs: { realm: 2, attrs: { shen: 18 } },
      scaled: { 'hook:on_check': [0.12, 0.20] } },
    { id: 'h10', forma: 'gu', kind: 'hou', grade: 'ling', reqs: { realm: 3 }, scaled: { 'hook:on_choice_cd': [24, 12] } },
    { id: 'h11', forma: 'gu', kind: 'hou', grade: 'ling', reqs: { realm: 2 }, scaled: { 'hook:on_refine': [0.50, 0.80] } },
    /* H12 机关傀儡：设计稿为「离线继续战斗」，本引擎离线不模拟秘境 → 按「离线历练效率」并入 offlineEff */
    { id: 'h12', forma: 'gu', kind: 'hou', grade: 'shang', reqs: { realm: 3 }, scaled: { 'mult:offlineEff': [0.20, 0.50] } },
    { id: 'h13', forma: 'gu', kind: 'hou', grade: 'ling', reqs: { realm: 1 },
      scaled: { 'mult:qiRate': [0.10, 0.18], 'mult:qiCap': [0.25, 0.45] } },
    { id: 'h14', forma: 'gu', kind: 'hou', grade: 'ling', reqs: { realm: 2 }, scaled: { 'mult:stonesRate': [0.25, 0.45] } },
    { id: 'h15', forma: 'shou', kind: 'hou', grade: 'shang', reqs: { realm: 3 }, scaled: { 'hook:on_trib_next': [0.06, 0.10] } },
    { id: 'h16', forma: 'gu', kind: 'hou', grade: 'liang', reqs: { realm: 0 }, scaled: { 'mult:eventRate': [0.20, 0.35] } },
    { id: 'h17', forma: 'yao', kind: 'hou', grade: 'ling_evil', reqs: { realm: 3, karmaMax: -200 },
      scaled: { 'hook:on_kill_stones': [0.20, 0.35], 'hook:on_kill_karma': [-1, -1] } },
    { id: 'h18', forma: 'gu', kind: 'hou', grade: 'xian', reqs: { realm: 4 }, scaled: { 'hook:on_lockling': [0.08, 0.12] } },
    /* ── 双书扩容 §10.6 三件后天（h19 紫金钟 = 3 级生效上限，校对批注）── */
    { id: 'h19', forma: 'gu', kind: 'hou', grade: 'ling', MAX_LV: 3,
      reqs: { realm: 3 }, scaled: { 'mult:tribFailLossMod': [-0.01, -0.03] } },
    { id: 'h20', forma: 'jian', kind: 'hou', grade: 'liang', reqs: { realm: 0 }, scaled: { 'hook:on_debuff_apply': [-0.02, -0.10] } },
    { id: 'h21', forma: 'jian', kind: 'hou', grade: 'ling', reqs: { realm: 2 }, scaled: { 'hook:on_bottleneck_power': [0.02, 0.10] } },
    /* ── 双书二批 §10.7 六件后天（落魄算盘 = stonesRate 降级裁定口径）── */
    { id: 'h22', forma: 'gu', kind: 'hou', grade: 'liang', reqs: { realm: 0 }, scaled: { 'mult:combatPower': [0.02, 0.10] } },
    { id: 'h23', forma: 'yao', kind: 'hou', grade: 'ling_evil', reqs: { realm: 3 }, scaled: { 'hook:on_kill_stones': [0.03, 0.15] } },
    { id: 'h24', forma: 'jian', kind: 'hou', grade: 'shang', reqs: { realm: 2 }, scaled: { 'mult:combatSpeed': [0.02, 0.10] } },
    { id: 'h25', forma: 'gu', kind: 'hou', grade: 'liang', reqs: { realm: 1 }, scaled: { 'mult:stonesRate': [0.02, 0.10] } },
    { id: 'h26', forma: 'jian', kind: 'hou', grade: 'ling', reqs: { realm: 2 }, scaled: { 'mult:dropRate': [0.01, 0.05] } },
    { id: 'h27', forma: 'gu', kind: 'hou', grade: 'shang', reqs: { realm: 3 }, scaled: { 'mult:artsSpeed': [0.02, 0.10] } }
  ];

  var byId = {};
  for (var i = 0; i < LIST.length; i++) byId[LIST[i].id] = LIST[i];

  /* ── 获取途径（法宝全录 §五）：秘境首通 / 坊市 / 黑市 ── */
  /* 秘境首通授予：ZONES 索引 → 法宝 id（索引见 data.js ZONES：1 黑风寨 / 2 万兽谷 / 3 焦土遗迹 /
   * 4 雷池禁地 / 5 乱星秘窟 / 6 修罗战场 / 7 天渊龙墟 / 9 界外古道） */
  var ZONE_TREASURE = { 1: 'x02', 2: 'x08', 3: 'x03', 4: 'x09', 5: 'x04', 6: 'x06', 7: 'x05', 8: 'x13', 9: 'x01' };
  /* 神秘商人特席先天特位（扩容批 A5 x14/x15 + 二批 A5 x16）：scout 顶格时 50% 上架未持有随机一件 */
  var MERCHANT_IDS = ['x14', 'x15', 'x16'];
  var SHOP_IDS = ['h01', 'h02', 'h03', 'h04', 'h05', 'h06', 'h07', 'h08', 'h09', 'h10', 'h11', 'h12',
    'h13', 'h14', 'h15', 'h16', 'h18', 'h19', 'h20', 'h22', 'h24', 'h25', 'h26', 'h27'];
  var BLACK_IDS = ['x07', 'x12', 'h17', 'h21', 'h23'];
  /* 上架基准价（坊市 priceOf 再乘 (1+境界×0.4)×(1+ΣshopCost)；黑市另 ×BLACKMARKET_PRICE） */
  var PRICE = { liang: 900, shang: 2600, ling: 6000, ling_evil: 6000, xian: 22000,
    xian_zhong: 60000, xian_shang: 90000, xian_ji: 140000 };

  SQ.XTREASURES = {
    LIST: LIST,
    byId: byId,
    ZONE_TREASURE: ZONE_TREASURE,
    SHOP_IDS: SHOP_IDS,
    BLACK_IDS: BLACK_IDS,
    MERCHANT_IDS: MERCHANT_IDS,
    PRICE: PRICE,
    SLOTS: 3,
    SLOT_UNLOCK: [0, 2, 4],      /* 栏位解锁境界：练气(0) / 金丹(2) / 化神(4) */
    MAX_LV: 5,                   /* 后天祭炼上限 */
    MAX_STAGE: 3,                /* 先天认主上限 */
    BOND_COST: 2,                /* 先天认主：每 2 份计数 +1 阶（计数来源 = 渡劫成功 ×1 / 计时 +1 每 BOND_HOURS 小时） */
    BOND_HOURS: 8,               /* 认主计时通道（体验批）：每 8 小时已结算时长 +1 计数，与寿元同时钟 */
    REFINE_BASE: 400,            /* 祭炼基础灵石 */
    REFINE_GROWTH: 2.2,          /* 祭炼费用随等级递增 */
    REFINE_REALM: 0.4,           /* 祭炼费用随境界系数 */
    REFINE_FAIL: 0.30,           /* 祭炼失败概率（降 1 级） */
    /* 丹药（X11 阴阳乾坤鼎炼制）：修为产出 +50% 持续 1 小时 */
    PILL_COST: 100,
    PILL_MS: 3600000,
    PILL_MULT: 0.50,
    /* 先天脚本常量 */
    FATE_STEP: 0.02, FATE_CAP: 0.20,          /* X01 气运补偿：失败累积 +2%/次，上限 +20% */
    TOWER_NEXT: 0.03, TOWER_CAP: 0.15,        /* X03 渡劫护体：每败 +3%，上限 +15% */
    TOWER_LOSS: 0.30,                         /* X03 失败损失固定 30% */
    GROWTH_STEP: 0.005, GROWTH_CAP: 0.25,     /* X02 生长：在线每小时 +0.5%，上限 +25% */
    DEGEN_KARMA: -2,                          /* X12 堕落：每在线 1 小时 karma -2 */
    DEGEN_THRESHOLD: -800,                    /* X12 战斗速度条件：karma ≤ -800 */
    SLAUGHTER_STEP: 100                       /* X07 杀伐：每 100 杀掉 1 件魔道法器 */
  };
})();