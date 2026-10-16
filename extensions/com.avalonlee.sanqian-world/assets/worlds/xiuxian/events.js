/* worlds/xiuxian/events.js — 修仙专属奇遇池 v2.8 口径（专属 89 + 天道垂青 6 = 95 条）纯机制数据
 * 事实源：《玄幻修仙/专属事件池.md》v2.8（改词条先改文档）。89 = 首批 37 + 双书扩容批 12（№62~73）
 * + 双书梗化二批 40（№74~113）；与通用池 24 条合计生效池 113 + 垂青 6 = 119。
 * 二批魔道分支按事件池 v2.6 经济主轴校准落码：failE.qiPct 清零 + attr dc hard→medium（23 处），
 * failE 其余形态（buff/stones）保留；正道/左道判定不回调。恢复批 2026-10-03 复录。
 * 名称/叙事/分支文案在词表：event.{id}.name / event.{id}.story / event.{id}.branch.{right|evil|neutral}。
 * schema 与 gain/check DSL 见 events/common.js 头注（八类判定；数组 = 判定链全过才算成）。
 * 独占授予条件 = 指定分支 + 判定链全过（§一）：exclusiveArt/exclusiveGear 失败只解锁图鉴。
 * 天级特殊均 once:false——「遇过 ≠ 拿到」，168h 长冷却后可再遇。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.EVENTS = SQ.EVENTS || {};
  var B = function (field, mult, hours) { return { type: 'buff', field: field, mult: mult, hours: hours }; };

  SQ.EVENTS.xiuxian = [
    /* ── 天级（5 条 · 全特殊 · 独占奖励载体）── */
    { id: 'slay_three_corpses', tier: 'tian', nature: 'good', special: true, weight: 3, cooldownHours: 168,
      cond: { realmMin: 6, align: 'neutral' },
      choices: {
        right: { karma: 24, gain: [B('qiRate', 0.40, 24)],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -24, gain: [{ type: 'stones', n: [1800, 2800] }, B('qiRate', 0.50, 12)],
          check: [
            { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } },
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } }
          ] },
        neutral: { karma: 2, gain: [{ type: 'exclusiveArt', id: 'slay_corpses' }, { type: 'attrBonus', attr: 'shen', n: 2 }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard' },
            { type: 'qi', pct: 0.15 }
          ] }
      } },
    { id: 'red_dust_trial', tier: 'tian', nature: 'good', special: true, weight: 3, cooldownHours: 168,
      cond: { realmMin: 5, align: 'right' },
      choices: {
        right: { karma: 25, gain: [{ type: 'exclusiveArt', id: 'red_dust' }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard' },
            { type: 'karma', min: 400 }
          ] },
        evil: { karma: -25, gain: [{ type: 'stones', n: [2000, 3000] }, B('combatPower', 0.40, 24)],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } } },
        neutral: { karma: 3, gain: [B('qiRate', 0.45, 24)],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } }
      } },
    { id: 'emotionless_chapter', tier: 'tian', nature: 'bad', special: true, weight: 3, cooldownHours: 168,
      cond: { realmMin: 5, align: 'evil' },
      choices: {
        right: { karma: 25, gain: [B('qiRate', 0.50, 24), { type: 'attrBonus', attr: 'shen', n: 1 }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.09] } },
            { type: 'karma', min: 600, failE: { qiPct: [-0.15, -0.09] } }
          ] },
        evil: { karma: -25, gain: [{ type: 'exclusiveArt', id: 'emotionless' }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.09] } },
            { type: 'qi', pct: 0.20, failE: { qiPct: [-0.15, -0.09] } }
          ] },
        neutral: { karma: -2, gain: [{ type: 'stones', n: [900, 1400] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } }
      } },
    { id: 'evil_sword_remnant', tier: 'tian', nature: 'good', special: true, weight: 3, cooldownHours: 168,
      cond: { realmMin: 6, zoneCleared: 6 },
      choices: {
        right: { karma: 24, gain: [{ type: 'exclusiveGear', id: 'evil_sword' }],
          check: [
            { type: 'power', ratio: 1.3, failE: { qiPct: [-0.15, -0.10], buff: { field: 'combatPower', mult: 0.30, hours: 24 } } },
            { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10], buff: { field: 'combatPower', mult: 0.30, hours: 24 } } }
          ] },
        evil: { karma: -24, gain: [{ type: 'dropGear', tierMin: 4 }, { type: 'stones', n: [1500, 2400] }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } } },
        neutral: { karma: 5, gain: [{ type: 'attrBonus', attr: 'jing', n: 2 }, B('combatPower', 0.25, 36)] }
      } },
    { id: 'world_mirror', tier: 'tian', nature: 'good', special: true, weight: 3, cooldownHours: 168,
      cond: { realmMin: 5, hasArt: 'qingxin' },
      choices: {
        right: { karma: 22, gain: [B('offlineEff', 0.40, 24), { type: 'attrBonus', attr: 'shen', n: 1 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -23, gain: [{ type: 'stones', n: [1600, 2600] }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'eventLuck', mult: -0.20, hours: 24 } } },
            { type: 'karma', max: -100, failE: { buff: { field: 'eventLuck', mult: -0.20, hours: 24 } } }
          ] },
        neutral: { karma: 2, gain: [{ type: 'exclusiveGear', id: 'world_mirror' }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'medium' },
            { type: 'stones', cost: 500 }
          ] }
      } },

    /* ── 地级（13 条 · 特殊 4）── */
    { id: 'sect_recruit', tier: 'di', nature: 'good', special: true, weight: 5, cooldownHours: 96,
      cond: { align: 'right', realmMin: 2 },
      choices: {
        right: { karma: 14, gain: [{ type: 'artsProgress', n: 1 }, B('qiRate', 0.25, 24), { type: 'bond', npc: 'pei', n: 10 }],
          check: { type: 'karma', min: 300 } },
        evil: { karma: -15, gain: [{ type: 'stones', n: [400, 620] }, { type: 'bondDrain', npc: 'pei' }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'shopCost', mult: 0.20, hours: 24 } } } },
        neutral: { karma: 2, gain: [B('offlineEff', 0.20, 12), { type: 'bond', npc: 'pei', n: 4 }] }
      } },
    { id: 'demon_envoy', tier: 'di', nature: 'good', special: true, weight: 5, cooldownHours: 96,
      cond: { maxKarma: -200, realmMin: 2 },
      choices: {
        right: { karma: 15, gain: [B('combatPower', 0.25, 24), { type: 'bond', npc: 'yewu', n: 2 }],
          check: { type: 'power', ratio: 1.2, failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -15, gain: [{ type: 'stones', n: [500, 750] }, { type: 'dropGear', tierMin: 2, align: 'evil' }, { type: 'bond', npc: 'yewu', n: 15 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { buff: { field: 'offlineEff', mult: -0.25, hours: 24 } } } },
        neutral: { karma: -3, gain: [{ type: 'stones', n: [150, 260] }, { type: 'bond', npc: 'yewu', n: 5 }] }
      } },
    { id: 'sword_wall', tier: 'di', nature: 'good', special: true, weight: 4, cooldownHours: 120,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 12, gain: [B('combatPower', 0.30, 24), { type: 'attrBonus', attr: 'jing', n: 1 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard' } },
        evil: { karma: -14, gain: [{ type: 'dropGear', tierMin: 3, slot: 'weapon', special: 'sword_heart' }],
          check: [
            { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } },
            { type: 'power', ratio: 1.2, failE: { qiPct: [-0.15, -0.10] } }
          ] },
        neutral: { karma: 0, gain: [{ type: 'dropGear', tierMin: 2, slot: 'weapon' }],
          check: { type: 'gear', slot: 'weapon', tierMin: 2 } }
      } },
    { id: 'forbidden_page', tier: 'di', nature: 'bad', special: true, weight: 4, cooldownHours: 120,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 14, gain: [B('qiRate', 0.20, 12)],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'offlineEff', mult: -0.20, hours: 12 } } } },
        evil: { karma: -15, gain: [B('combatPower', 0.35, 24), { type: 'qiPct', pct: [0.10, 0.18] }],
          check: [
            { type: 'align', need: 'evil', failE: { qiPct: [-0.15, -0.10], buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } },
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10], buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } }
          ] },
        neutral: { karma: -5, gain: [{ type: 'stones', n: [380, 560] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } }
      } },
    { id: 'alchemy_contest', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 10, gain: [{ type: 'stones', n: [280, 420] }, B('qiRate', 0.20, 12), { type: 'bond', npc: 'lu', n: 8 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } },
        evil: { karma: -13, gain: [{ type: 'stones', n: [520, 780] }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'shopCost', mult: 0.25, hours: 24 } } } },
        neutral: { karma: 1, gain: [{ type: 'stones', n: [350, 520] }, { type: 'bond', npc: 'lu', n: 4 }],
          check: { type: 'stones', cost: [120, 200] } }
      } },
    { id: 'secret_manual_trade', tier: 'di', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 11, gain: [{ type: 'artsProgress', n: 1 }, { type: 'bond', npc: 'shen', n: 15 }],
          check: { type: 'stones', cost: [250, 400] } },
        evil: { karma: -12, gain: [{ type: 'stones', n: [300, 450] }, { type: 'artsProgress', n: 1 }, { type: 'bondDrain', npc: 'shen' }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.10, -0.06] } } },
        neutral: { karma: 0, gain: [{ type: 'artsProgress', n: 1 }, { type: 'bond', npc: 'shen', n: 8 }],
          check: { type: 'stones', cost: [150, 250] } }
      } },
    { id: 'dao_heart_illusion', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [{ type: 'attrBonus', attr: 'shen', n: 1 }, B('qiRate', 0.22, 12)],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -11, gain: [{ type: 'qiPct', pct: [0.12, 0.20] }, B('offlineEff', -0.20, 24)],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.15, -0.10] } } },
        neutral: { karma: 0, gain: [{ type: 'qiPct', pct: [-0.06, -0.03] }] }
      } },
    { id: 'blood_moon', tier: 'di', nature: 'bad', weight: 5, cooldownHours: 96,
      choices: {
        right: { karma: 13, gain: [B('combatPower', 0.25, 24)],
          check: [
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } },
            { type: 'stones', cost: 200, failE: { qiPct: [-0.12, -0.08] } }
          ] },
        evil: { karma: -14, gain: [B('combatPower', 0.40, 24), { type: 'qiPct', pct: [0.10, 0.16] }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10], buff: { field: 'eventLuck', mult: -0.12, hours: 24 } } } },
        neutral: { karma: -2, gain: [{ type: 'qiPct', pct: [-0.10, -0.06] }] }
      } },
    { id: 'rival_gu', tier: 'di', nature: 'bad', weight: 7, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 10, gain: [B('artsSpeed', 0.25, 12)],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -13, gain: [{ type: 'stones', n: [450, 680] }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'artsSpeed', mult: -0.25, hours: 24 } } } },
        neutral: { karma: 2, gain: [B('qiRate', 0.18, 12)] }
      } },
    { id: 'trib_remains', tier: 'di', nature: 'good', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 13, gain: [{ type: 'tribNext', n: 0.05 }] },
        evil: { karma: -14, gain: [{ type: 'stones', n: [480, 720] }, { type: 'dropGear', tierMin: 3 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { qiPct: [-0.12, -0.08] } } },
        neutral: { karma: -3, gain: [{ type: 'stones', n: [250, 380] }] }
      } },
    { id: 'spirit_vein_dispute', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3, zoneMin: 3 },
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [200, 320] }],
          check: [
            { type: 'power', ratio: 1.2, failE: { qiPct: [-0.12, -0.08] } },
            { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.12, -0.08] } }
          ] },
        evil: { karma: -13, gain: [{ type: 'stones', n: [550, 820] }],
          check: { type: 'power', ratio: 1.3, failE: { qiPct: [-0.15, -0.10] } } },
        neutral: { karma: -4, gain: [{ type: 'stones', n: [280, 420] }] }
      } },
    { id: 'beast_core_hunt', tier: 'di', nature: 'good', weight: 7, cooldownHours: 36,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 9, gain: [{ type: 'stones', n: [300, 450] }, B('dropRate', 0.25, 12), { type: 'bond', npc: 'fu', n: 8 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -14, gain: [{ type: 'stones', n: [600, 900] }, { type: 'dropGear', tierMin: 2 }],
          check: [
            { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } },
            { type: 'power', ratio: 1.1, failE: { qiPct: [-0.15, -0.10] } }
          ] },
        neutral: { karma: 0, gain: [{ type: 'stones', n: [320, 480] }, { type: 'bond', npc: 'fu', n: 3 }],
          check: { type: 'power', ratio: 0.9 } }
      } },
    { id: 'grave_keeper', tier: 'di', nature: 'bad', weight: 5, cooldownHours: 96,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [B('offlineEff', 0.25, 24)],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'combatPower', mult: -0.15, hours: 12 } } },
            /* G14 挂载（四柱卷 §5.1 示例）：companion 为追加环，原判定语义不变——「有挚友陪夜，阴间饭也吃得」 */
            { type: 'companion', minTier: 2 }
          ] },
        evil: { karma: -13, gain: [{ type: 'stones', n: [450, 680] }, { type: 'dropGear', tierMin: 2 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { buff: { field: 'eventLuck', mult: -0.20, hours: 24 } } } },
        neutral: { karma: -3, gain: [B('combatSpeed', 0.15, 8)] }
      } },

    /* ── 人级（18 条）── */
    { id: 'herb_garden', tier: 'ren', nature: 'good', weight: 9, cooldownHours: 12,
      choices: {
        right: { karma: 5, gain: [{ type: 'qi', n: [25, 45] }, { type: 'stones', n: [50, 90] }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [110, 180] }, { type: 'qi', n: [15, 30] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        neutral: { karma: 0, gain: [{ type: 'qi', n: [30, 50] }],
          check: { type: 'stones', cost: [60, 100] } }
      } },
    { id: 'junior_lie_flat', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 5, gain: [B('offlineEff', 0.18, 8), { type: 'bond', npc: 'tang', n: 10 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [100, 160] }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        neutral: { karma: 0, gain: [B('qiRate', 0.10, 4), { type: 'bond', npc: 'tang', n: 3 }] }
      } },
    { id: 'night_watch', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [{ type: 'stones', n: [40, 80] }, B('qiRate', 0.12, 6)],
          check: { type: 'attr', attr: 'qi', dc: 'easy' } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [80, 130] }] },
        neutral: { karma: 1, gain: [{ type: 'stones', n: [50, 90] }] }
      } },
    { id: 'spirit_spring', tier: 'ren', nature: 'good', weight: 9, cooldownHours: 24,
      choices: {
        right: { karma: 5, gain: [B('combatSpeed', 0.15, 6)],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [120, 190] }] },
        neutral: { karma: 0, gain: [{ type: 'qi', n: [20, 40] }, { type: 'life', n: [8, 18] }] }
      } },
    { id: 'beggar_immortal', tier: 'ren', nature: 'good', weight: 6, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 6, gain: [B('eventLuck', 0.18, 12), { type: 'bond', npc: 'chu', n: 15 }] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [130, 200] }, { type: 'bondDrain', npc: 'chu' }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [15, 30] }, { type: 'bond', npc: 'chu', n: 5 }],
          check: { type: 'stones', cost: [10, 20] } }
      } },
    { id: 'peace_talisman', tier: 'ren', nature: 'good', weight: 9, cooldownHours: 24,
      choices: {
        right: { karma: 5, gain: [{ type: 'eventShield', hours: 24 }, { type: 'bond', npc: 'zhu', n: 8 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [110, 170] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        neutral: { karma: 1, gain: [B('offlineEff', 0.12, 6), { type: 'bond', npc: 'zhu', n: 3 }] }
      } },
    { id: 'pet_turtle', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      cond: { zoneMin: 1 },
      choices: {
        right: { karma: 6, gain: [{ type: 'stones', n: [70, 120] }, B('dropRate', 0.15, 8)] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [140, 220] }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        neutral: { karma: 0, gain: [{ type: 'qi', n: [15, 35] }] }
      } },
    { id: 'tea_debate', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 5, gain: [B('artsSpeed', 0.20, 8)],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [100, 160] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { stones: [-100, -60] } } },
        neutral: { karma: 1, gain: [B('qiRate', 0.12, 6)] }
      } },
    { id: 'firefly_valley', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 5, gain: [{ type: 'stones', n: [40, 80] }, B('offlineEff', 0.15, 8), { type: 'bond', npc: 'yan', n: 10 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [110, 180] }],
          check: { type: 'attr', attr: 'qi', dc: 'easy' } },
        neutral: { karma: 2, gain: [{ type: 'qi', n: [25, 45] }, { type: 'bond', npc: 'yan', n: 4 }] }
      } },
    { id: 'mine_fox', tier: 'ren', nature: 'good', once: true, weight: 7, cooldownHours: 36,
      cond: { zoneMin: 1 },
      choices: {
        right: { karma: 6, gain: [B('eventLuck', 0.15, 12), { type: 'bond', npc: 'chiwei', n: 30 }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [130, 210] }, { type: 'bondDrain', npc: 'chiwei' }] },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [15, 30] }, { type: 'bond', npc: 'chiwei', n: 12 }] }
      } },
    { id: 'mine_collapse', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      cond: { zoneMin: 1 },
      choices: {
        right: { karma: 7, gain: [{ type: 'stones', n: [60, 100] }, B('offlineEff', 0.18, 12)],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [160, 250] }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } },
        neutral: { karma: -1, gain: [{ type: 'qiPct', pct: [-0.06, -0.03] }] }
      } },
    { id: 'qi_leak', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 12,
      choices: {
        right: { karma: 6, gain: [B('qiRate', 0.15, 6)],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } },
        evil: { karma: -7, gain: [{ type: 'qiPct', pct: [0.10, 0.16] }, B('qiRate', -0.10, 8)],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.09] } } },
        neutral: { karma: 0, gain: [{ type: 'stones', n: [-60, -30] }] }
      } },
    { id: 'junior_frame', tier: 'ren', nature: 'bad', weight: 9, cooldownHours: 24,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 5, gain: [B('artsSpeed', 0.15, 8), { type: 'bond', npc: 'luman', n: 8 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [90, 150] }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { stones: [-100, -60] } } },
        neutral: { karma: -2, gain: [{ type: 'stones', n: [-90, -50] }, { type: 'bond', npc: 'luman', n: 5 }] }
      } },
    { id: 'furnace_burst', tier: 'ren', nature: 'bad', weight: 9, cooldownHours: 12,
      choices: {
        right: { karma: 5, gain: [B('combatPower', 0.10, 6)],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [100, 160] }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        neutral: { karma: -1, gain: [{ type: 'stones', n: [-80, -40] }] }
      } },
    { id: 'elder_press', tier: 'ren', nature: 'bad', weight: 7, cooldownHours: 36,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 6, gain: [B('combatPower', 0.12, 8)],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'shopCost', mult: 0.15, hours: 24 } } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [150, 240] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        neutral: { karma: -3, gain: [B('artsSpeed', 0.15, 8)] }
      } },
    { id: 'rumor_spread', tier: 'ren', nature: 'bad', weight: 7, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [B('eventLuck', 0.12, 12)] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [140, 220] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { stones: [-100, -60] } } },
        neutral: { karma: -2, gain: [B('offlineEff', 0.15, 8)] }
      } },
    { id: 'copied_art', tier: 'ren', nature: 'bad', weight: 6, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 7, gain: [B('qiRate', 0.12, 8)] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [150, 240] }],
          check: { type: 'power', ratio: 1.0 } },
        neutral: { karma: 1, gain: [{ type: 'stones', n: [80, 140] }],
          check: { type: 'stones', cost: [30, 60] } }
      } },
    { id: 'fragile_body', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 4, gain: [B('combatPower', 0.15, 12)],
          check: { type: 'art', id: 'jinzhong' } },
        evil: { karma: -6, gain: [{ type: 'qiPct', pct: [0.08, 0.14] }, B('offlineEff', -0.15, 12)] },
        neutral: { karma: 1, gain: [B('qiRate', 0.10, 8)],
          check: { type: 'stones', cost: [60, 100] } }
      } },
    /* ── 神秘商人（势力批 v2.4 需求 §8 · №61）：交好/袭杀/无视 三分支 ──
     * 交好（正道）：坊市特席 10 分钟，售高级物品（**上界四格**：装备 / 功法〔无候选时回落成第二件装备〕/
     *   破障丹 / scout 顶格时 50% 加挂的先天法宝特位 —— 原注只写三格，与 shop.js:161-172 不符，随批更正）；
     * 袭杀（魔道）：绝对战力判定（**真仙档水准 375000**；复核勘正旧注「渡劫期水准」——`REALMS` 实测 渡劫[8] = 125000 / 真仙[9] = 375000），过 = 极品法器（仙品）+ 极品功法（地/天阶）、商人败逃；
     *   败 = 重伤（修为 -75% 不吃封顶 + 战力 -75% 30 分钟）且本奇遇 **24 小时**封印（cdFailHours）；
     * 无视（左道）：不出特席，记脸标记 → 下次特席货 +1 阶（一次性消耗）。
     *
     * 🆕 神秘商人节律批 2026-10-10（同日第十批 · 用户拍板「按照你推荐的来执行」）：
     *   ① **cooldownHours 1 → 12**。原 1h 是全池唯一的非零下界（次低 12h、中位 36h），叠上全池唯一最高权重后
     *      一条吃掉 **18.0%** 抽取（8 种子实测 16.1~19.1%，旧单种子读数 16.6%），就是探针 §十三.9 指的病灶。
     *      取 12h = **并入池内既有档**（road_tea_stall / pickpocket / muddy_road / herb_garden / qi_leak /
     *      furnace_burst 同值），不发明新数。
     *   ② ⚠️ **weight 12 保留不动**——这条是本批的否定式结论：4 种子 × 权重{12,9,6,3} × 冷却{1,2,3,4,6,12}
     *      全组合实测（走 tickOnline→fire→resolveBranch 生产链）显示**同冷却下权重几乎挪不动这条**
     *      （出厂探针 8 种子：终态 cd12/fail24 下 w12 = 23 抽 / 2.4%、w9 = 2.2%、w6 = 2.2%、w3 = 2.15%；只改冷却那一版 cd12/fail1 = 28 抽 / 3.0% ⇒ **权重改 4 倍只挪 0.25pp，冷却改一档挪 15.6pp**）。根因 = fire 先抽 tier×nature 子池、再在子池内按权重
     *      抽条目，而 di×good 共 23 条里只有它是 12h、其余 36~120h ⇒ 子池非空时常常只剩它一条，权重在这个"只剩一条"的池里没有作用面。
     *      ⇒ 当年正典并列写下的「补冷却**或**降权」两个选项里，**降权那一半是空的**；改一个无效参数还会把
     *      №61「全池唯一最高档」的定位白丢掉。实证与推导见奇遇池卷 **§十三.10**。
     *   ③ 连带代价如实登记：改后裸档长跑总抽取 **−16%**（中位 1114 → 938），而商人自己少 181 抽 ≈ 降幅 180
     *      ⇒ 这些分钟段本来就没有别的事件顶上（它在给被动池当"永远可抽的补洞位"）。正面解法是扩 di×good
     *      子池 / 普遍降一档冷却，**属产品裁定、本批未动**，登记奇遇池卷 **§十三.11 待议**。
     *   ④ 战力门槛 375000 的**唯一事实源就是本条目 `check.abs` 字面量**（真仙档水准；复核实测 `REALMS[3] 元婴 = 540`、`[8] 渡劫 = 125000`、`[9] 真仙 = 375000` ⇒ 旧注「渡劫期 = 元婴表」是误标，本条随件勘正）。
     *      原世界表常量 `D.MERCHANT_POWER_ABS` 与之同值双源且全库零消费，2026-10-10 已删（审计 A9 兜住这一类：
     *      顶层常量一旦没有消费者即红，死桩不许复活）。要改门槛只改这里一处。 */
    { id: 'mysterious_merchant', tier: 'di', nature: 'good', weight: 12, cooldownHours: 12,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 4, gain: [{ type: 'merchant' }] },
        evil: { karma: -8,
          gain: [{ type: 'primeGear' }, { type: 'primeArt' }],
          check: { type: 'power', abs: 375000,
            failE: { qiPctRaw: [-0.75, -0.75], buff: { field: 'combatPower', mult: -0.75, hours: 0.5 } } },
          cdFailHours: 24 },   /* 节律批 1 → 24：常规冷却已 12h，1h 的失败封印不起作用 */
        neutral: { karma: 0, gain: [{ type: 'merchantScout' }] }
      } },

    /* ── 双书梗化扩容批（2026-10-01 · 恢复批 2026-10-03 复录）· №62~73（12 条）────────
     * 事实源：专属事件池 v2.8 扩容批章；bond 映射 = 道友池卷 §二/§四（韩立/于潇/董萱儿/南宫婉/
     * 陈平安/宁姚/阿良/齐静春 8 人出身）；绝交锁 +6；once 4 条均首遇结缘型（+30/+15 或 +12 相识封顶）。 */
    { id: 'qingpao_tongxing', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36, once: true,
      choices: {
        right: { karma: 7, gain: [B('qiRate', 0.12, 12), { type: 'bond', npc: 'hanli', n: 30 }] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [130, 210] }, { type: 'bondDrain', npc: 'hanli' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.10, -0.06] } } },
        neutral: { karma: 0, gain: [{ type: 'qi', n: [15, 30] }, { type: 'bond', npc: 'hanli', n: 15 }] }
      } },
    { id: 'xiangmian_xiansheng', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 7, gain: [{ type: 'stones', n: [50, 90] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { qiPct: [-0.12, -0.08] } } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [120, 200] }, B('eventLuck', -0.10, 12)],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } } },
        neutral: { karma: 0 }
      } },
    { id: 'laodu_bangchuan', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [B('offlineEff', 0.12, 12)] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [110, 180] }, B('eventLuck', -0.08, 12)] },
        neutral: { karma: 0 }
      } },
    { id: 'taomu_xiaojian', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36, once: true,
      choices: {
        right: { karma: 7, gain: [{ type: 'qi', n: [30, 60] }, { type: 'bond', npc: 'yuxiao', n: 30 }] },
        evil: { karma: -6, gain: [{ type: 'stones', n: [100, 160] }, { type: 'bondDrain', npc: 'yuxiao' }] },
        neutral: { karma: 2, gain: [{ type: 'eventShield', hours: 24 }, { type: 'bond', npc: 'yuxiao', n: 12 }] }
      } },
    { id: 'caotang_yeyu', tier: 'ren', nature: 'good', weight: 9, cooldownHours: 24,
      choices: {
        right: { karma: 5, gain: [{ type: 'qi', n: [30, 60] }] },
        evil: { karma: -6, gain: [{ type: 'stones', n: [90, 150] }] },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [40, 70] }, { type: 'stones', n: [-40, -20] }] }
      } },
    { id: 'bianzhen_jiuguan', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 7, gain: [{ type: 'stones', n: [-130, -80] }, B('combatPower', 0.10, 12)] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [100, 170] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { qiPct: [-0.12, -0.08] } } },
        neutral: { karma: 2, gain: [{ type: 'stones', n: [-60, -30] }, B('eventLuck', 0.10, 12)] }
      } },
    { id: 'haishi_denghui', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [180, 300] }, B('offlineEff', 0.15, 24), { type: 'bond', npc: 'xuaner', n: 20 }] },
        evil: { karma: -14, gain: [{ type: 'stones', n: [350, 500] }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10], buff: { field: 'eventLuck', mult: -0.12, hours: 24 } } } },
        neutral: { karma: 3, gain: [{ type: 'stones', n: [-100, -60] }, B('qiRate', 0.18, 12), { type: 'bond', npc: 'xuaner', n: 8 }] }
      } },
    { id: 'yanue_chaoji', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 13, gain: [{ type: 'stones', n: [160, 280] }, B('combatPower', 0.12, 24), { type: 'bond', npc: 'nangong', n: 12 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -15, gain: [{ type: 'stones', n: [380, 560] }, { type: 'bondDrain', npc: 'nangong' }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } } },
        neutral: { karma: 4, gain: [{ type: 'stones', n: [120, 200] }, { type: 'bond', npc: 'nangong', n: 4 }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } }
      } },
    { id: 'bianzhen_kezi', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      choices: {
        right: { karma: 11, gain: [{ type: 'attrBonus', attr: 'jing', n: 1 }, { type: 'qi', n: [80, 150] }, { type: 'bond', npc: 'pingping', n: 15 }] },
        evil: { karma: -12, gain: [{ type: 'stones', n: [200, 340] }] },
        neutral: { karma: 3, gain: [{ type: 'stones', n: [-60, -30] }, B('eventLuck', 0.10, 12), { type: 'bond', npc: 'pingping', n: 5 }] }
      } },
    { id: 'jianzhong_shouye', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 14, gain: [{ type: 'attrBonus', attr: 'shen', n: 1 }, B('combatPower', 0.15, 24), { type: 'bond', npc: 'ningyao', n: 20 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -15, gain: [{ type: 'stones', n: [400, 560] }, { type: 'bondDrain', npc: 'ningyao' }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.12] } } },
        neutral: { karma: 5, gain: [{ type: 'qi', n: [100, 180] }, { type: 'bond', npc: 'ningyao', n: 8 }] }
      } },
    { id: 'jianyun_guiren', tier: 'tian', nature: 'good', weight: 3, cooldownHours: 168, once: true,
      cond: { realmMin: 5 },
      choices: {
        right: { karma: 20, gain: [{ type: 'attrBonus', attr: 'shen', n: 2 }, B('combatPower', 0.25, 24), { type: 'bond', npc: 'aliang', n: 30 }] },
        evil: { karma: -22, gain: [{ type: 'stones', n: [1500, 2400] }, { type: 'bondLock', npc: 'aliang' }],
          check: { type: 'attr', attr: 'shen', dc: 'extreme', failE: { qiPct: [-0.15, -0.12] } } },
        neutral: { karma: 4, gain: [{ type: 'artsProgress', n: 1 }, { type: 'qi', n: [300, 500] }, { type: 'bond', npc: 'aliang', n: 15 }] }
      } },
    { id: 'shengxian_yideng', tier: 'tian', nature: 'good', weight: 3, cooldownHours: 168, once: true,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 21, gain: [{ type: 'attrBonus', attr: 'shen', n: 2 }, B('qiRate', 0.40, 24), { type: 'bond', npc: 'jingchun', n: 30 }] },
        evil: { karma: -23, gain: [{ type: 'stones', n: [1400, 2200] }, B('qiRate', 0.45, 12), { type: 'bondLock', npc: 'jingchun' }] },
        neutral: { karma: 5, gain: [{ type: 'qi', n: [350, 600] }, { type: 'artsProgress', n: 1 }, { type: 'bond', npc: 'jingchun', n: 15 }] }
      } },

    /* ── 双书梗化二批（2026-10-01 · 恢复批 2026-10-03 复录）· №74~113（40 条）────────
     * 事实源：专属事件池 v2.8 二批章；bond = 道友池卷 §二/§五；v2.6 经济主轴校准已套用：
     * 魔道分支 failE.qiPct 清零（全批 28 处）+ 魔道 attr dc hard→medium（全批 23 处），
     * failE 其余形态（buff/stones）保留；正道/左道判定不回调。 */
    { id: 'tongmen_kugong', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36, once: true,
      choices: {
        right: { karma: 7, gain: [B('combatPower', 0.12, 12), { type: 'bond', npc: 'zhangtie', n: 30 }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [90, 150] }, { type: 'bondDrain', npc: 'zhangtie' }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [25, 45] }, { type: 'bond', npc: 'zhangtie', n: 15 }] }
      } },
    { id: 'ming_e_jiaoliang', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 6, gain: [B('artsSpeed', 0.15, 8), { type: 'bond', npc: 'wuyan', n: 10 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [110, 180] }, { type: 'bondDrain', npc: 'wuyan' }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { stones: [-90, -50] } } },
        neutral: { karma: 0, gain: [{ type: 'qi', n: [20, 40] }, { type: 'bond', npc: 'wuyan', n: 4 }] }
      } },
    { id: 'shiyao_zhiyue', tier: 'ren', nature: 'bad', weight: 6, cooldownHours: 48, once: true,
      choices: {
        right: { karma: 5, gain: [B('offlineEff', 0.15, 12), { type: 'bond', npc: 'mojuren', n: 30 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [120, 200] }, { type: 'bondDrain', npc: 'mojuren' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 1, gain: [{ type: 'qi', n: [15, 30] }, { type: 'bond', npc: 'mojuren', n: 15 }] }
      } },
    { id: 'zhishi_chuanyi', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36, once: true,
      choices: {
        right: { karma: 6, gain: [{ type: 'artsProgress', n: 1 }, B('qiRate', 0.12, 12), { type: 'bond', npc: 'lihuayuan', n: 30 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [130, 210] }, { type: 'bondDrain', npc: 'lihuayuan' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { buff: { field: 'shopCost', mult: 0.15, hours: 24 } } } },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [30, 60] }, { type: 'bond', npc: 'lihuayuan', n: 15 }] }
      } },
    { id: 'shangdui_huhang', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 7, gain: [{ type: 'stones', n: [100, 160] }, B('eventLuck', 0.12, 12), { type: 'bond', npc: 'mupeiling', n: 15 }],
          check: { type: 'power', ratio: 1.0, failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [180, 280] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        neutral: { karma: 2, gain: [{ type: 'stones', n: [40, 70] }, { type: 'bond', npc: 'mupeiling', n: 5 }] }
      } },
    { id: 'shijia_denghui', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [B('qiRate', 0.12, 12), { type: 'bond', npc: 'chenqiaoyue', n: 14 }],
          check: { type: 'stones', cost: [40, 80] } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [120, 190] }] },
        neutral: { karma: 2, gain: [B('offlineEff', 0.10, 8), { type: 'bond', npc: 'chenqiaoyue', n: 5 }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } }
      } },
    { id: 'jiemei_yuxian', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 7, gain: [B('combatPower', 0.10, 12), { type: 'bond', npc: 'chenlianyan', n: 13 }],
          check: { type: 'power', ratio: 1.1, failE: { qiPct: [-0.12, -0.08] } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [140, 220] }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        neutral: { karma: 2, gain: [{ type: 'qi', n: [20, 40] }, { type: 'bond', npc: 'chenlianyan', n: 4 }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } }
      } },
    { id: 'xiafu_danren', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 6, gain: [B('combatSpeed', 0.12, 12), { type: 'bond', npc: 'hongfu', n: 15 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [120, 200] }] },
        neutral: { karma: 3, gain: [{ type: 'stones', n: [-90, -50] }, B('eventLuck', 0.10, 12), { type: 'bond', npc: 'hongfu', n: 5 }] }
      } },
    { id: 'sudi_tiezhan', tier: 'ren', nature: 'bad', weight: 6, cooldownHours: 48,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 5, gain: [B('combatPower', 0.15, 24), { type: 'bond', npc: 'wangchan', n: 10 }],
          check: { type: 'power', ratio: 1.2, failE: { qiPct: [-0.15, -0.10] } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [180, 280] }, { type: 'bondDrain', npc: 'wangchan' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 0, gain: [{ type: 'qi', n: [20, 40] }, { type: 'bond', npc: 'wangchan', n: 3 }] }
      } },
    { id: 'suanpan_zhanggui', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [B('stonesRate', 0.10, 12), { type: 'bond', npc: 'zhuhe', n: 12 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [150, 240] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { buff: { field: 'shopCost', mult: 0.20, hours: 24 } } } },   /* v2.6：hard→medium */
        neutral: { karma: 1, gain: [{ type: 'stones', n: [100, 170] }, { type: 'bond', npc: 'zhuhe', n: 5 }] }
      } },
    { id: 'zhujian_renjia', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 5, gain: [{ type: 'dropGear', tierMin: 2, slot: 'weapon' }, { type: 'bond', npc: 'ruanxiu', n: 14 }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [160, 260] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },   /* v2.6：qiPct 移除 */
        neutral: { karma: 1, gain: [{ type: 'stones', n: [-80, -40] }, B('combatPower', 0.08, 8), { type: 'bond', npc: 'ruanxiu', n: 5 }] }
      } },
    { id: 'laozu_shounuo', tier: 'ren', nature: 'bad', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 8, gain: [B('combatPower', 0.12, 24), { type: 'bond', npc: 'gucan', n: 13 }],
          check: { type: 'power', ratio: 1.1, failE: { qiPct: [-0.15, -0.10] } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [170, 260] }] },
        neutral: { karma: -2, gain: [{ type: 'qiPct', pct: [-0.07, -0.03] }, { type: 'bond', npc: 'gucan', n: 5 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } }
      } },
    { id: 'longquan_jishi', tier: 'ren', nature: 'good', weight: 9, cooldownHours: 24,
      choices: {
        right: { karma: 5, gain: [B('dropRate', 0.12, 12)],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [120, 200] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { stones: [-100, -60] } } },
        neutral: { karma: 1, gain: [{ type: 'dropGear', tierMin: 2, slot: 'weapon' }],
          check: { type: 'stones', cost: [80, 140] } }
      } },
    { id: 'yanbao_xueguang', tier: 'ren', nature: 'bad', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 7, gain: [{ type: 'stones', n: [80, 140] }],
          check: { type: 'power', ratio: 1.1, failE: { qiPct: [-0.12, -0.08] } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [180, 280] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { buff: { field: 'shopCost', mult: 0.20, hours: 24 } } } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: -2, gain: [{ type: 'stones', n: [90, 150] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } }
      } },
    { id: 'haishang_yinxun', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [B('offlineEff', 0.12, 12)] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [130, 210] }],
          check: { type: 'attr', attr: 'shen', dc: 'easy', failE: { buff: { field: 'eventLuck', mult: -0.08, hours: 12 } } } },
        neutral: { karma: 2, gain: [{ type: 'qi', n: [25, 45] }],
          check: { type: 'stones', cost: [30, 60] } }
      } },
    { id: 'guishi_yexing', tier: 'ren', nature: 'bad', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 6, gain: [{ type: 'eventShield', hours: 24 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [150, 240] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 0, gain: [{ type: 'qi', n: [15, 30] }] }
      } },
    { id: 'mozhe_jiaoyi', tier: 'ren', nature: 'bad', weight: 6, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 5, gain: [B('combatSpeed', 0.10, 8)] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [200, 320] }, { type: 'dropGear', tierMin: 2 }],
          check: { type: 'power', ratio: 1.2 } },   /* v2.6：failE.qiPct 移除 */
        neutral: { karma: -2, gain: [{ type: 'stones', n: [120, 200] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } }
      } },
    { id: 'longqi_yiwen', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 7, gain: [B('qiRate', 0.15, 24)],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [170, 280] }, { type: 'dropGear', tierMin: 2 }, { type: 'treasure', id: 'x19' }],
          check: { type: 'attr', attr: 'jing', dc: 'medium', failE: { buff: { field: 'offlineEff', mult: -0.15, hours: 24 } } } },   /* v2.6：hard→medium；x19 龙髓珠联动（判定过才授予） */
        neutral: { karma: 0, gain: [{ type: 'stones', n: [90, 150] }, { type: 'qi', n: [30, 60] }] }
      } },

    { id: 'canhun_jieti', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 11, gain: [{ type: 'attrBonus', attr: 'shen', n: 1 }, B('offlineEff', 0.18, 24), { type: 'bond', npc: 'yuzhitong', n: 10 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -13, gain: [{ type: 'stones', n: [400, 600] }, { type: 'bondDrain', npc: 'yuzhitong' }],
          check: [   /* v2.6：hard→medium、failE.qiPct 移除 */
            { type: 'attr', attr: 'shen', dc: 'medium' },
            /* 折寿反噬（第卌八批）：借体这事成了损阴德、败了丢命数——failE 走 `life` 的绝对年数，
             * 与「被人击伤」那条比例口（LIFE_HIT）分得很清：这是因果账，不是外伤账。 */
            { type: 'qi', pct: 0.10, failE: { life: [-50, -20] } }
          ] },
        neutral: { karma: 3, gain: [{ type: 'qi', n: [80, 150] }, { type: 'bond', npc: 'yuzhitong', n: 5 }] }
      } },
    { id: 'zhangmen_chizheng', tier: 'di', nature: 'good', weight: 6, cooldownHours: 72,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [B('eventLuck', 0.12, 24), { type: 'bond', npc: 'xiangzhili', n: 12 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -12, gain: [{ type: 'stones', n: [300, 480] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { buff: { field: 'shopCost', mult: 0.15, hours: 24 } } } },   /* v2.6：hard→medium、qiPct 移除、shopCost 记档保留 */
        neutral: { karma: 3, gain: [{ type: 'qi', n: [100, 180] }, { type: 'bond', npc: 'xiangzhili', n: 4 }] }
      } },
    { id: 'zhujian_luhuo', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [180, 300] }, B('dropRate', 0.15, 24), { type: 'bond', npc: 'ruanqiong', n: 13 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium', failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -13, gain: [{ type: 'stones', n: [420, 640] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：qiPct 移除 */
        neutral: { karma: 3, gain: [{ type: 'qi', n: [80, 150] }, { type: 'bond', npc: 'ruanqiong', n: 5 }] }
      } },
    { id: 'changcheng_junqing', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 13, gain: [{ type: 'stones', n: [260, 400] }, B('combatPower', 0.15, 24), { type: 'bond', npc: 'makuxuan', n: 14 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } },
        evil: { karma: -15, gain: [{ type: 'stones', n: [480, 720] }, { type: 'bondDrain', npc: 'makuxuan' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: -2, gain: [{ type: 'qi', n: [60, 120] }, { type: 'bond', npc: 'makuxuan', n: 4 }] }
      } },
    { id: 'banfen_fenzang', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 10, gain: [{ type: 'qi', n: [90, 160] }, { type: 'bond', npc: 'xieshi', n: 12 }] },
        evil: { karma: -12, gain: [{ type: 'stones', n: [400, 600] }, { type: 'dropGear', tierMin: 2 }],
          check: { type: 'power', ratio: 1.2 } },   /* v2.6：failE.qiPct 移除 */
        neutral: { karma: 2, gain: [{ type: 'qi', n: [70, 130] }, { type: 'bond', npc: 'xieshi', n: 5 }] }
      } },
    { id: 'yinguan_shouduan', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3, zoneCleared: 3 },
      choices: {
        right: { karma: 13, gain: [B('combatPower', 0.15, 24), { type: 'attrBonus', attr: 'qi', n: 1 }, { type: 'bond', npc: 'weixian', n: 13 }],
          check: [
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } },
            { type: 'power', ratio: 1.1, failE: { qiPct: [-0.15, -0.10] } }
          ] },
        evil: { karma: -14, gain: [{ type: 'stones', n: [460, 680] }, { type: 'bondDrain', npc: 'weixian' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 3, gain: [{ type: 'qi', n: [60, 120] }, { type: 'bond', npc: 'weixian', n: 4 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } }
      } },
    { id: 'duanjian_chongzhu', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 11, gain: [B('artsSpeed', 0.18, 24), { type: 'bond', npc: 'liushiliu', n: 14 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -12, gain: [{ type: 'stones', n: [380, 560] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：qiPct 移除 */
        neutral: { karma: 4, gain: [{ type: 'qi', n: [70, 140] }, { type: 'bond', npc: 'liushiliu', n: 5 }] }
      } },
    { id: 'changcheng_shouye', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [240, 380] }, B('combatSpeed', 0.15, 24), { type: 'bond', npc: 'dongtianci', n: 12 }],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } } },
        evil: { karma: -14, gain: [{ type: 'stones', n: [420, 640] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 4, gain: [{ type: 'qi', n: [80, 150] }, { type: 'bond', npc: 'dongtianci', n: 4 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } }
      } },
    { id: 'yuexia_yihun', tier: 'di', nature: 'good', weight: 5, cooldownHours: 96, once: true,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [B('eventLuck', 0.20, 24), { type: 'qi', n: [60, 120] }, { type: 'bond', npc: 'yinyue', n: 30 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -13, gain: [{ type: 'stones', n: [500, 750] }, { type: 'bondDrain', npc: 'yinyue' }] },
        neutral: { karma: 5, gain: [{ type: 'qi', n: [90, 160] }, { type: 'bond', npc: 'yinyue', n: 15 }] }
      } },
    { id: 'guiwu_weicheng', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 11, gain: [{ type: 'eventShield', hours: 24 }, { type: 'bond', npc: 'yuanyao', n: 16 }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } },
            { type: 'stones', cost: 150, failE: { qiPct: [-0.15, -0.10] } }
          ] },
        evil: { karma: -13, gain: [{ type: 'stones', n: [440, 660] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 4, gain: [{ type: 'qi', n: [70, 140] }, { type: 'bond', npc: 'yuanyao', n: 6 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } }
      } },
    { id: 'chengxia_wenjian', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 10, gain: [{ type: 'attrBonus', attr: 'qi', n: 1 }, B('combatPower', 0.12, 24), { type: 'bond', npc: 'chenqingdu', n: 15 }],
          check: { type: 'attr', attr: 'qi', dc: 'hard' } },
        evil: { karma: -12, gain: [{ type: 'stones', n: [400, 600] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 4, gain: [{ type: 'qi', n: [90, 150] }, B('artsSpeed', 0.15, 12), { type: 'bond', npc: 'chenqingdu', n: 5 }],
          check: { type: 'stones', cost: [30, 60] } }
      } },
    { id: 'zhuhai_jianyi', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 9, gain: [{ type: 'artsProgress', n: 1 }, B('qiRate', 0.18, 24)],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.10, -0.06] } } },
        evil: { karma: -14, gain: [{ type: 'stones', n: [460, 700] }, { type: 'dropGear', tierMin: 2, slot: 'weapon' }],
          check: [   /* v2.6：气·困难→medium、failE.qiPct 移除 */
            { type: 'attr', attr: 'qi', dc: 'medium' },
            { type: 'attr', attr: 'shen', dc: 'medium' }
          ] },
        neutral: { karma: 2, gain: [{ type: 'qi', n: [80, 150] }, B('offlineEff', 0.15, 24)] }
      } },
    { id: 'zhenmo_liansong', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 72,
      cond: { realmMin: 3, zoneCleared: 3 },
      choices: {
        right: { karma: 13, gain: [{ type: 'stones', n: [280, 440] }, B('qiRate', 0.20, 24), { type: 'attrBonus', attr: 'shen', n: 1 }, { type: 'treasure', id: 'x18' }],
          check: [   /* x18 昆吾镇魔链联动（判定链全过才授予）；正道 failE 保留 */
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.12], buff: { field: 'eventLuck', mult: -0.12, hours: 24 } } },
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.12], buff: { field: 'eventLuck', mult: -0.12, hours: 24 } } }
          ] },
        evil: { karma: -15, gain: [{ type: 'stones', n: [520, 780] }, { type: 'dropGear', tierMin: 3 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 4, gain: [{ type: 'qi', n: [90, 160] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.10, -0.06] } } }
      } },
    { id: 'shuyuan_jiangxue', tier: 'di', nature: 'good', weight: 7, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 10, gain: [B('artsSpeed', 0.18, 24), { type: 'qi', n: [60, 120] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -12, gain: [{ type: 'stones', n: [420, 640] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 3, gain: [{ type: 'artsProgress', n: 1 }] }
      } },

    { id: 'kongxiu_danshi', tier: 'tian', nature: 'good', weight: 3, cooldownHours: 168, once: true,
      cond: { realmMin: 5 },
      choices: {
        right: { karma: 21, gain: [{ type: 'attrBonus', attr: 'shen', n: 2 }, B('qiRate', 0.50, 48), { type: 'bond', npc: 'wensheng', n: 30 }],
          check: [
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.12] } },
            { type: 'karma', min: 400, failE: { qiPct: [-0.15, -0.12] } }
          ] },
        evil: { karma: -24, gain: [{ type: 'stones', n: [1600, 2600] }, { type: 'bondLock', npc: 'wensheng' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 8, gain: [{ type: 'qi', n: [320, 540] }, B('offlineEff', 0.35, 48), { type: 'bond', npc: 'wensheng', n: 15 }],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } }
      } },
    { id: 'yasheng_luozi', tier: 'tian', nature: 'bad', weight: 3, cooldownHours: 168,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 18, gain: [B('qiRate', 0.45, 48), { type: 'attrBonus', attr: 'shen', n: 1 }, { type: 'bond', npc: 'cuichan', n: 12 }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.12] } },
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.12] } }
          ] },
        evil: { karma: -20, gain: [{ type: 'stones', n: [1500, 2400] }],
          check: { type: 'power', ratio: 1.3 } },   /* v2.6：failE.qiPct 移除 */
        neutral: { karma: 3, gain: [{ type: 'qi', n: [300, 500] }, B('offlineEff', 0.30, 48), { type: 'bond', npc: 'cuichan', n: 4 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } }
      } },
    { id: 'baiyi_wenjian', tier: 'tian', nature: 'good', weight: 3, cooldownHours: 168,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 16, gain: [{ type: 'attrBonus', attr: 'qi', n: 1 }, B('combatPower', 0.30, 48), { type: 'bond', npc: 'zuoyou', n: 14 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -18, gain: [{ type: 'dropGear', tierMin: 4, slot: 'weapon' }, { type: 'stones', n: [1400, 2300] }],
          check: [   /* v2.6：气·困难→medium、failE.qiPct 移除 */
            { type: 'power', ratio: 1.3 },
            { type: 'attr', attr: 'qi', dc: 'medium' }
          ] },
        neutral: { karma: 4, gain: [{ type: 'qi', n: [280, 480] }, B('eventLuck', 0.20, 48), { type: 'bond', npc: 'zuoyou', n: 5 }] }
      } },
    { id: 'shoucheng_jianyi', tier: 'tian', nature: 'bad', weight: 3, cooldownHours: 168,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 20, gain: [B('combatPower', 0.40, 48), { type: 'attrBonus', attr: 'qi', n: 1 }, { type: 'bond', npc: 'yufu', n: 15 }],
          check: [
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.12] } },
            { type: 'power', ratio: 1.2, failE: { qiPct: [-0.15, -0.12] } }
          ] },
        evil: { karma: -22, gain: [{ type: 'stones', n: [1800, 2800] }, { type: 'dropGear', tierMin: 4 }, { type: 'bondLock', npc: 'yufu' }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 7, gain: [{ type: 'qi', n: [300, 520] }, B('offlineEff', 0.30, 48), { type: 'bond', npc: 'yufu', n: 4 }],
          check: { type: 'attr', attr: 'qi', dc: 'medium', failE: { qiPct: [-0.12, -0.08] } } }
      } },
    { id: 'modao_xiangyao', tier: 'tian', nature: 'bad', weight: 4, cooldownHours: 168,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 14, gain: [B('combatSpeed', 0.30, 48), { type: 'bond', npc: 'chelaozu', n: 12 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } },
        evil: { karma: -20, gain: [{ type: 'stones', n: [1800, 2800] }, { type: 'bondLock', npc: 'chelaozu' }],
          check: [   /* v2.6：hard→medium、failE.qiPct 移除 */
            { type: 'attr', attr: 'shen', dc: 'medium' },
            { type: 'power', ratio: 1.2 }
          ] },
        neutral: { karma: -3, gain: [{ type: 'qi', n: [280, 500] }, B('eventLuck', 0.20, 48), { type: 'bond', npc: 'chelaozu', n: 5 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.12, -0.08] } } }
      } },
    { id: 'moxiao_zhangfa', tier: 'tian', nature: 'good', weight: 4, cooldownHours: 168,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 15, gain: [B('offlineEff', 0.40, 48), { type: 'attrBonus', attr: 'shen', n: 1 }, { type: 'bond', npc: 'yintianxia', n: 12 }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } },
            { type: 'qi', pct: 0.10, failE: { qiPct: [-0.15, -0.10] } }
          ] },
        evil: { karma: -22, gain: [{ type: 'stones', n: [1700, 2700] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },   /* v2.6：hard→medium、qiPct 移除 */
        neutral: { karma: 4, gain: [{ type: 'qi', n: [280, 500] }, B('eventLuck', 0.15, 48), { type: 'bond', npc: 'yintianxia', n: 5 }],
          check: { type: 'stones', cost: [600, 900] } }
      } },
    { id: 'baiyi_guxing', tier: 'tian', nature: 'bad', weight: 3, cooldownHours: 168,
      cond: { realmMin: 5 },
      choices: {
        right: { karma: 18, gain: [B('combatPower', 0.35, 48), { type: 'attrBonus', attr: 'qi', n: 1 }, { type: 'bond', npc: 'baidi', n: 13 }],
          check: [
            { type: 'power', ratio: 1.2, failE: { qiPct: [-0.15, -0.12] } },
            { type: 'attr', attr: 'qi', dc: 'hard', failE: { qiPct: [-0.15, -0.12] } }
          ] },
        evil: { karma: -23, gain: [{ type: 'stones', n: [2000, 3000] }, { type: 'dropGear', tierMin: 4 }],
          check: [   /* v2.6：hard→medium、failE.qiPct 移除 */
            { type: 'power', ratio: 1.3 },
            { type: 'attr', attr: 'shen', dc: 'medium' }
          ] },
        neutral: { karma: 4, gain: [{ type: 'qi', n: [300, 520] }, B('eventLuck', 0.20, 48), { type: 'bond', npc: 'baidi', n: 4 }] }
      } },
    { id: 'luanxing_yebu', tier: 'tian', nature: 'good', weight: 4, cooldownHours: 168,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 16, gain: [B('eventLuck', 0.30, 48), { type: 'attrBonus', attr: 'shen', n: 1 }, { type: 'treasure', id: 'x17' }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10] } } },   /* x17 乱星盘联动（判定过才授予） */
        evil: { karma: -22, gain: [{ type: 'stones', n: [1700, 2700] }],
          check: [   /* v2.6：hard→medium、qiPct 移除；eventLuck debuff 形态保留 */
            { type: 'attr', attr: 'shen', dc: 'medium', failE: { buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } },
            { type: 'karma', max: -300, failE: { buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } }
          ] },
        neutral: { karma: 3, gain: [{ type: 'qi', n: [300, 520] }, B('offlineEff', 0.30, 48)] }
      } },

    /* ── 天道垂青池（系统深化批 A6 · 专属事件池 v2.7 §x №114~119 · 6 条）────────
     * 独立通道 tags:['trib_success']：仅渡劫成功瞬间 FATE_P 10% 固定概率触发（realm.js
     * → Events.fireTagged），不进常规奇遇时钟/传闻抽取（buildPool 排除 tags 词条）、
     * 不占 eventRate 乘区、不受 eventLuck 影响；同一境界段内不重复（ws.fateSeen 排除）；
     * weight/cooldownHours 不设（独立通道无意义）；天级数值带（karma ≤25 / debuff ≤24h /
     * 正向 buff ≤48h / stones·qi 练气基准走双缩放锚 / 魔道分支零 failE.qiPct——v2.6 结案口径）；
     * 6 条均不携带独占授予、性质全为机缘。文案正典 = 专属事件池 v2.7（词表 30 key）。 */
    { id: 'tiandao_guanding', tier: 'tian', nature: 'good', tags: ['trib_success'],
      choices: {
        right: { karma: 14, gain: [{ type: 'qi', n: [500, 800] }, B('qiRate', 0.40, 48)],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } },
        evil: { karma: -18, gain: [{ type: 'qi', n: [900, 1500] }, B('qiRate', 0.50, 24)],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { buff: { field: 'offlineEff', mult: -0.20, hours: 24 } } } },
        neutral: { karma: 5, gain: [{ type: 'qi', n: [320, 540] }, B('eventLuck', 0.20, 48)] }
      } },
    { id: 'tiandao_cifu', tier: 'tian', nature: 'good', tags: ['trib_success'],
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [1400, 2200] }] },
        evil: { karma: -19, gain: [{ type: 'stones', n: [2200, 3400] }, { type: 'dropGear', tierMin: 3 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } } },
        neutral: { karma: 4, gain: [{ type: 'stones', n: [900, 1400] }, B('stonesRate', 0.15, 48)] }
      } },
    { id: 'tiandao_dunwu', tier: 'tian', nature: 'good', tags: ['trib_success'],
      choices: {
        right: { karma: 10, gain: [{ type: 'artsProgress', n: 1 }, B('artsSpeed', 0.35, 48)],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -16, gain: [{ type: 'artsProgress', n: 2 }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'artsSpeed', mult: -0.20, hours: 24 } } } },
        neutral: { karma: 3, gain: [{ type: 'qi', n: [300, 500] }, B('qiRate', 0.35, 48)] }
      } },
    { id: 'tiandao_leipo', tier: 'tian', nature: 'good', tags: ['trib_success'],
      choices: {
        right: { karma: 9, gain: [{ type: 'fateShard', n: 5 }, B('dropRate', 0.25, 48)],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -18, gain: [{ type: 'dropGear', tierMin: 4 }, { type: 'fateShard', n: 5 }],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { buff: { field: 'combatPower', mult: -0.15, hours: 24 } } } },
        neutral: { karma: 3, gain: [{ type: 'fateShard', n: 2 }, { type: 'qi', n: [260, 440] }] }
      } },
    { id: 'tiandao_zhaohe', tier: 'tian', nature: 'good', tags: ['trib_success'],
      choices: {
        right: { karma: 11, gain: [{ type: 'bond', npc: 'pei', n: 12 }, B('offlineEff', 0.30, 48)] },
        evil: { karma: -20, gain: [{ type: 'stones', n: [1500, 2400] }, { type: 'bondLock', npc: 'pei' }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'shopCost', mult: 0.20, hours: 24 } } } },
        neutral: { karma: 4, gain: [{ type: 'bond', npc: 'pei', n: 5 }, { type: 'qi', n: [280, 460] }] }
      } },
    { id: 'tiandao_leijing', tier: 'tian', nature: 'good', tags: ['trib_success'],
      choices: {
        right: { karma: 20, gain: [{ type: 'attrBonus', attr: 'shen', n: 2 }, B('qiRate', 0.40, 48)],
          check: { type: 'attr', attr: 'shen', dc: 'hard' } },
        evil: { karma: -20, gain: [{ type: 'stones', n: [1400, 2300] }, B('combatPower', 0.35, 48)],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { buff: { field: 'eventLuck', mult: -0.15, hours: 24 } } } },
        neutral: { karma: 5, gain: [{ type: 'attrBonus', attr: 'shen', n: 1 }, { type: 'eventShield', hours: 24 }] }
      } },

    /* ── 同代天骄专属事件（天骄卷 v1.0 §6.1/§7.3 · 六向长线批 A4 · №120~124）──
     * 独立通道 tags:['prodigy']：不进常规抽取池、不占 eventRate——只由天骄模块在
     * bond 达档（30/70/100 每档每天骄一次）/ 宿敌同区月掷 3% / 释怀月掷 5% 三个钩子点位消费；
     * bond 收益 npc='$prodigy' 占位符在 resolveBranch 内替换为触发槽位实际 id（pr{n}）。 */
    { id: 'prodigy_ev_drink', tier: 'ren', nature: 'good', tags: ['prodigy'],
      choices: {
        right: { karma: 5, gain: [{ type: 'bond', npc: '$prodigy', n: 8 }, { type: 'stones', n: [60, 120] }] },
        evil: { karma: -8, gain: [{ type: 'artsProgress', n: 1 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.08, -0.04] } } },
        neutral: { karma: 2, gain: [{ type: 'bond', npc: '$prodigy', n: 4 }] }
      } },
    { id: 'prodigy_ev_gift', tier: 'ren', nature: 'good', tags: ['prodigy'],
      choices: {
        right: { karma: 5, gain: [{ type: 'bond', npc: '$prodigy', n: 10 }, { type: 'dropGear', tierMin: 2 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [100, 200] }],
          check: { type: 'attr', attr: 'qi', dc: 'medium', failE: { buff: { field: 'qiRate', mult: -0.10, hours: 12 } } } },
        neutral: { karma: 2, gain: [{ type: 'bond', npc: '$prodigy', n: 5 }] }
      } },
    { id: 'prodigy_ev_escort', tier: 'di', nature: 'good', tags: ['prodigy'],
      choices: {
        right: { karma: 8, gain: [B('combatSpeed', 0.10, 24)] },
        evil: { karma: -12, gain: [{ type: 'stones', n: [200, 400] }],
          check: { type: 'power', ratio: 1.2, failE: { qiPct: [-0.12, -0.06] } } },
        neutral: { karma: 3, gain: [{ type: 'qi', n: [300, 600] }] }
      } },
    { id: 'prodigy_ev_feud', tier: 'di', nature: 'bad', tags: ['prodigy'],
      choices: {
        /* 正「持刀问心」：胜 = 心结除（不斩杀，karma +5）；败 = failE qi −10% 心结仍在 */
        right: { karma: 5, check: { type: 'prodigySpar', failE: { qiPct: -0.10 } } },
        /* 魔「痛下杀手」：胜 = 斩杀出榜 + karma 按天骄阵营（正−25/左−10/魔+15，模块侧动态入账） */
        evil: { karma: 0, check: { type: 'prodigySpar', failE: { qiPct: -0.10 } } },
        /* 左「转身避开」：无事发生，心结仍在 */
        neutral: { karma: 0 }
      } },
    { id: 'prodigy_ev_forgive', tier: 'ren', nature: 'good', tags: ['prodigy'],
      choices: {
        /* 正「当面致歉」：判定 [神·普通]，胜 = 心结除、bond 解冻 +5（模块侧入账） */
        right: { karma: 6, check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        /* 魔「冷笑不语」：无事，心结仍在 */
        evil: { karma: -4 },
        /* 左「以酒抵仇」：心结除、bond 解冻 */
        neutral: { karma: 2 }
      } },
    /* ── 洗髓批 2026-10-12（天赋池设计 v1.8 §十 / 专属事件池 v2.13 №125）：奇遇赐洗髓缘 ──
     * 全池唯一以 talentSwap 为正支收益的词条；冷却 168h = 池内最长档（受 #277(c) 反漂移闸约束：
     * 池内 cooldownHours 最大值不得越 SQ.COOL_MAX_HOURS，否则落盘裁剪会剪掉冷却键 ⇒ 冷却静默失效）。
     * ⚠ **weight 实测定为 2 而非 4**：本仓 sim-event-economy 在 SEED 20261008 下，w4 会把三条政策的
     * 触发密度压成 正5.00 / 左4.30 / 魔4.30 ⇒ 「正 > 左 > 魔」这条机制判据**打平即红**（判据不放宽带）；
     * w2 复跑 = 5.10 / 4.60 / 3.90（基线不含本词条 = 4.90 / 4.60 / 3.60）⇒ 排序与余量都回到原口径。
     * 与丹方/破境共用本世三次预算，预算已满时引擎撤销这条收益标签（events.js applyEffects），
     * 不会报「得洗髓缘」的空话。 */
    { id: 'xisui_pond', tier: 'di', nature: 'good', weight: 2, cooldownHours: 168,
      cond: { realmMin: 5 },
      choices: {
        right: { karma: 6, gain: [{ type: 'talentSwap' }], check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [900, 1500] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium', failE: { qiPct: [-0.10, -0.06] } } },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [400, 800] }] }
      } },
    /* ── 袭击 / 族中寻仇（第卌四批 2026-10-16 · 数值详设 §6.1B · 设计稿转正）────────────
     * 独立通道 tags:['ambush'] / tags:['revenge']：**不进常规抽取池**（buildPool 见 ev.tags 即跳），
     * 由世界包 `ambushTick` 在在线时钟上按 |karma| 曲线掷判后定点触发（与 tiandao_* 的 fireTagged 同形）。
     * 分支键与道德无关，只是三个动作：`right` 迎战 / `neutral` 避战 / `evil` 认输——
     * 模板带 `tactical: true`，界面据此**不打**「正道/魔道/左道」前缀（打上了就是拿战术选项冒充善恶抉择）。
     * karma 三支一律 0：这一族若给善恶定值，会把 §6.3 阵营主轴（魔 < 左 < 正）当成第四根加项柱子推歪，
     *   而它本来的定位是「武力争斗的后果」而非「善恶判定」——主轴由 `sim-event-economy` 每批复跑守。 */
    { id: 'ambush_by_evil', tier: 'di', nature: 'bad', tags: ['ambush'], tactical: true, cooldownHours: 12,
      choices: {
        /* 迎战：敌手 = 触发时刻的快照（名号来自旧相识 / 天骄名录，战力按高一境门槛定档） */
        right: { karma: 0, gain: [{ type: 'stones', n: [600, 1200] }, { type: 'qi', n: [400, 900] }],
          check: { type: 'ambushFoe', failE: { dao: 2, qiPct: [-0.10, -0.06], lifeWound: 1 } } },
        /* 认输：交出随身灵石的一成半买平安（无判定——愿意付就有结果），内伤一分不添 */
        evil: { karma: 0, gain: [{ type: 'stonesPct', pct: [-0.15, -0.15] }] },
        /* 避战：一走三不知，无收益也无惩罚 */
        neutral: { karma: 0 }
      } },
    { id: 'ambush_by_right', tier: 'di', nature: 'bad', tags: ['ambush'], tactical: true, cooldownHours: 12,
      choices: {
        right: { karma: 0, gain: [{ type: 'stones', n: [600, 1200] }, { type: 'qi', n: [400, 900] }],
          check: { type: 'ambushFoe', failE: { dao: 2, qiPct: [-0.10, -0.06], lifeWound: 1 } } },
        evil: { karma: 0, gain: [{ type: 'stonesPct', pct: [-0.15, -0.15] }] },
        neutral: { karma: 0 }
      } },
    /* 族中高手寻仇（袭杀满 KILL_MAX 次 ⇒ 对方全族下场）：**只给迎战一条路**（choices 里只有 right ⇒
     * 界面那一排按钮自然只剩一枚，不需要「置灰的避战」这种点了没用的东西）。
     * escalate = 收益随本链连胜递增（倍率取世界包 escalationOf，硬顶 STREAK_CAP）；
     * 败 = 较高道伤 +4 层且**链条判定结束**（ambushSettled 把 ws.revenge 清空，不进冷却）。 */
    { id: 'ambush_revenge', tier: 'tian', nature: 'bad', tags: ['revenge'], tactical: true, escalate: true,
      choices: {
        right: { karma: 0, gain: [{ type: 'stones', n: [1500, 3000] }, { type: 'qi', n: [800, 1600] },
            { type: 'dropGear', tierMin: 3 }],
          check: { type: 'ambushFoe', failE: { dao: 4, qiPct: [-0.15, -0.10], lifeWound: 1 } } }
      } }
  ];
})();
