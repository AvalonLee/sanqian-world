/* assets/events/common.js — 奇遇通用池 v2.0（24 条，跨世界）纯机制数据
 * 事实源：《三千世界-奇遇通用池v2.0（24条）》（改词条先改文档）。
 * 名称/叙事/分支文案在词表：event.{id}.name / event.{id}.story / event.{id}.branch.{right|evil|neutral}。
 * schema（奇遇事件池设计 v1.9 §五/§六）：
 *   {id, tier:'ren'|'di'|'tian', nature:'good'|'bad', special?, weight, once?, cooldownHours,
 *    cond?:{realmMin/realmMax/zoneMin/zoneCleared/minKarma/maxKarma/align/hasArt/gearSpecial},
 *    choices:{right/evil/neutral:{karma, gain:[…], check?}}}
 *   gain 词条：{type:'stones'|'qi'|'qiPct'|'buff'|'dropGear'|'artsProgress'|'attrBonus'|
 *     'tribNext'|'eventShield'|'bond', n|pct|[min,max]}；stones/qi 为练气基准值，引擎 ×(1+realm)³。
 *   check（八类 DSL）：attr{attr,dc,failE?} / karma / align / stones{cost} / qi{pct} / art / gear /
 *     power{ratio}；数组 = 判定链全过才算成；失败 = 正向收益减半 + failE 全额追加（karma 照记）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.EVENTS = SQ.EVENTS || {};
  SQ.EVENTS.common = [
    /* ── 人级（14 条）── */
    { id: 'road_tea_stall', tier: 'ren', nature: 'good', weight: 10, cooldownHours: 12,
      choices: {
        right: { karma: 5, gain: [{ type: 'qi', n: [30, 60] }, { type: 'buff', field: 'eventLuck', mult: 0.15, hours: 6 }, { type: 'bond', npc: 'qin', n: 10 }] },
        evil: { karma: -6, gain: [{ type: 'stones', n: [120, 200] }, { type: 'buff', field: 'dropRate', mult: 0.25, hours: 4 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        neutral: { karma: 1, gain: [{ type: 'buff', field: 'qiRate', mult: 0.10, hours: 4 }, { type: 'bond', npc: 'qin', n: 4 }],
          check: { type: 'stones', cost: [30, 60] } }
      } },
    { id: 'market_assassin', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [{ type: 'stones', n: [30, 60] }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [100, 170] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        neutral: { karma: -1, gain: [{ type: 'qi', n: [20, 40] }] }
      } },
    { id: 'merit_fish', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 6, gain: [{ type: 'buff', field: 'offlineEff', mult: 0.20, hours: 8 }],
          check: { type: 'attr', attr: 'qi', dc: 'easy' } },
        evil: { karma: -8, gain: [{ type: 'stones', n: [130, 220] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        neutral: { karma: 1, gain: [{ type: 'qi', n: [25, 50] }] }
      } },
    { id: 'stray_dog', tier: 'ren', nature: 'good', special: true, once: true, weight: 6, cooldownHours: 72,
      cond: { zoneMin: 1 },
      choices: {
        right: { karma: 5, gain: [{ type: 'stones', n: [40, 80] }, { type: 'buff', field: 'eventLuck', mult: 0.20, hours: 24 }, { type: 'bond', npc: 'huang', n: 30 }] },
        evil: { karma: -8, gain: [{ type: 'stones', n: [150, 250] }, { type: 'bondDrain', npc: 'huang' }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        neutral: { karma: 2, gain: [{ type: 'qi', n: [30, 55] }, { type: 'buff', field: 'combatSpeed', mult: 0.10, hours: 4 }, { type: 'bond', npc: 'huang', n: 15 }] }
      } },
    { id: 'lost_child', tier: 'ren', nature: 'good', weight: 9, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [{ type: 'stones', n: [50, 100] }, { type: 'buff', field: 'offlineEff', mult: 0.15, hours: 6 }] },
        evil: { karma: -5, gain: [{ type: 'stones', n: [90, 150] }] },
        neutral: { karma: 1, gain: [{ type: 'stones', n: [30, 60] }] }
      } },
    { id: 'night_noise', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 4, gain: [{ type: 'buff', field: 'qiRate', mult: 0.12, hours: 4 }],
          check: { type: 'attr', attr: 'shen', dc: 'easy' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [120, 200] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        neutral: { karma: 0, gain: [{ type: 'qiPct', pct: [-0.06, -0.03] }] }
      } },
    { id: 'pickpocket', tier: 'ren', nature: 'bad', weight: 10, cooldownHours: 12,
      choices: {
        right: { karma: 5, gain: [{ type: 'stones', n: [20, 50] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [100, 160] }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { stones: [-80, -40] } } },
        neutral: { karma: -1, gain: [{ type: 'stones', n: [-80, -40] }] }
      } },
    { id: 'muddy_road', tier: 'ren', nature: 'bad', weight: 9, cooldownHours: 12,
      choices: {
        right: { karma: 5, gain: [{ type: 'buff', field: 'combatSpeed', mult: 0.10, hours: 6 }, { type: 'stones', n: [20, 40] }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [90, 150] }] },
        neutral: { karma: 0, gain: [{ type: 'qiPct', pct: [-0.05, -0.02] }] }
      } },
    { id: 'foggy_mind', tier: 'ren', nature: 'bad', weight: 7, cooldownHours: 24,
      choices: {
        right: { karma: 3, gain: [{ type: 'buff', field: 'combatPower', mult: 0.10, hours: 4 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -5, gain: [{ type: 'qiPct', pct: [0.08, 0.15] }, { type: 'buff', field: 'qiRate', mult: -0.10, hours: 12 }],
          check: { type: 'attr', attr: 'qi', dc: 'hard' } },
        neutral: { karma: 1, gain: [{ type: 'buff', field: 'qiRate', mult: 0.12, hours: 8 }],
          check: { type: 'stones', cost: [60, 100] } }
      } },
    { id: 'broken_bridge', tier: 'ren', nature: 'bad', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 6, gain: [{ type: 'buff', field: 'offlineEff', mult: 0.15, hours: 8 }, { type: 'stones', n: [20, 50] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        evil: { karma: -6, gain: [{ type: 'stones', n: [80, 140] }] },
        neutral: { karma: -1, gain: [{ type: 'buff', field: 'combatSpeed', mult: -0.10, hours: 4 }] }
      } },
    { id: 'gamble_stone', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 24,
      cond: { zoneMin: 1 },
      choices: {
        right: { karma: 4, gain: [{ type: 'stones', n: [60, 110] }] },
        evil: { karma: -5, gain: [{ type: 'stones', n: [180, 300] }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { stones: [-150, -80] } } },
        neutral: { karma: 0, gain: [{ type: 'stones', n: [90, 150] }],
          check: { type: 'stones', cost: [100, 160] } }
      } },
    { id: 'traveling_doctor', tier: 'ren', nature: 'good', weight: 8, cooldownHours: 24,
      choices: {
        right: { karma: 5, gain: [{ type: 'buff', field: 'combatPower', mult: 0.12, hours: 6 }, { type: 'bond', npc: 'chen', n: 10 }] },
        evil: { karma: -7, gain: [{ type: 'stones', n: [130, 210] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        neutral: { karma: 0, gain: [{ type: 'qi', n: [20, 45] }, { type: 'bond', npc: 'chen', n: 3 }],
          check: { type: 'stones', cost: [50, 90] } }
      } },
    { id: 'storyteller', tier: 'ren', nature: 'good', weight: 7, cooldownHours: 36,
      choices: {
        right: { karma: 4, gain: [{ type: 'buff', field: 'eventLuck', mult: 0.12, hours: 8 }, { type: 'bond', npc: 'liu', n: 8 }] },
        evil: { karma: -6, gain: [{ type: 'buff', field: 'combatPower', mult: 0.10, hours: 4 }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        neutral: { karma: 1, gain: [{ type: 'buff', field: 'offlineEff', mult: 0.12, hours: 6 }, { type: 'bond', npc: 'liu', n: 4 }] }
      } },
    { id: 'harvest_fest', tier: 'ren', nature: 'good', weight: 6, cooldownHours: 48,
      choices: {
        right: { karma: 5, gain: [{ type: 'stones', n: [70, 120] }, { type: 'buff', field: 'stonesRate', mult: 0.15, hours: 8 }, { type: 'bond', npc: 'feng', n: 8 }],
          check: { type: 'attr', attr: 'jing', dc: 'easy' } },
        evil: { karma: -7, gain: [{ type: 'stones', n: [150, 240] }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        neutral: { karma: 2, gain: [{ type: 'stones', n: [-40, -20] }, { type: 'buff', field: 'qiRate', mult: 0.12, hours: 6 }, { type: 'bond', npc: 'feng', n: 3 }] }
      } },

    /* ── 地级（7 条）── */
    { id: 'merchant_caravan', tier: 'di', nature: 'good', weight: 8, cooldownHours: 36,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [150, 260] }, { type: 'buff', field: 'eventLuck', mult: 0.15, hours: 12 }, { type: 'bond', npc: 'man', n: 12 }, { type: 'bond', npc: 'tie', n: 8 }],
          check: { type: 'power', ratio: 0.9 } },
        evil: { karma: -14, gain: [{ type: 'stones', n: [400, 650] }, { type: 'bondDrain', npc: 'man' }, { type: 'bondDrain', npc: 'tie' }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } },
        neutral: { karma: 2, gain: [{ type: 'stones', n: [260, 400] }, { type: 'bond', npc: 'man', n: 5 }, { type: 'bond', npc: 'tie', n: 4 }],
          check: { type: 'power', ratio: 1.0 } }
      } },
    { id: 'hidden_cache', tier: 'di', nature: 'good', special: true, weight: 6, cooldownHours: 72,
      cond: { zoneCleared: 2 },
      choices: {
        right: { karma: 12, gain: [{ type: 'artsProgress', n: 1 }, { type: 'buff', field: 'qiRate', mult: 0.20, hours: 12 }, { type: 'bond', npc: 'suwan', n: 20 }] },
        evil: { karma: -13, gain: [{ type: 'stones', n: [350, 550] }, { type: 'dropGear', tierMin: 2 }],
          check: { type: 'attr', attr: 'jing', dc: 'medium' } },
        neutral: { karma: 3, gain: [{ type: 'stones', n: [200, 320] }, { type: 'bond', npc: 'suwan', n: 8 }] }
      } },
    { id: 'falling_star', tier: 'di', nature: 'good', weight: 5, cooldownHours: 48,
      choices: {
        right: { karma: 10, gain: [{ type: 'stones', n: [180, 300] }, { type: 'buff', field: 'qiRate', mult: 0.25, hours: 8 }] },
        evil: { karma: -12, gain: [{ type: 'stones', n: [400, 620] }, { type: 'dropGear', tierMin: 2 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.12, -0.08] } } },
        neutral: { karma: 0, gain: [{ type: 'stones', n: [150, 260] }] }
      } },
    { id: 'beast_tide', tier: 'di', nature: 'bad', weight: 7, cooldownHours: 48,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 14, gain: [{ type: 'stones', n: [120, 200] }, { type: 'buff', field: 'combatPower', mult: 0.15, hours: 12 }],
          check: { type: 'power', ratio: 1.1 } },
        evil: { karma: -13, gain: [{ type: 'stones', n: [380, 580] }, { type: 'dropGear', tierMin: 1 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.10, -0.06] } } },
        neutral: { karma: -4, gain: [{ type: 'buff', field: 'eventLuck', mult: -0.08, hours: 12 }] }
      } },
    { id: 'great_dao_cake', tier: 'di', nature: 'bad', weight: 6, cooldownHours: 48,
      choices: {
        right: { karma: 12, gain: [{ type: 'stones', n: [80, 150] }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } },
        evil: { karma: -10, gain: [{ type: 'stones', n: [300, 460] }],
          check: { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.08, -0.05] } } },
        neutral: { karma: 2, gain: [{ type: 'buff', field: 'qiRate', mult: 0.08, hours: 4 }] }
      } },
    { id: 'rival_duel', tier: 'di', nature: 'good', weight: 6, cooldownHours: 36,
      cond: { realmMin: 1 },
      choices: {
        right: { karma: 9, gain: [{ type: 'stones', n: [100, 180] }, { type: 'buff', field: 'combatPower', mult: 0.18, hours: 8 }, { type: 'bond', npc: 'xie', n: 12 }],
          check: { type: 'power', ratio: 1.0 } },
        evil: { karma: -14, gain: [{ type: 'stones', n: [320, 480] }, { type: 'dropGear', tierMin: 2, slot: 'weapon' }, { type: 'bondDrain', npc: 'xie' }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.10, -0.06] } } },
        neutral: { karma: -2, gain: [{ type: 'buff', field: 'eventLuck', mult: 0.10, hours: 8 }, { type: 'bond', npc: 'xie', n: 6 }] }
      } },
    { id: 'plague_village', tier: 'di', nature: 'bad', weight: 5, cooldownHours: 72,
      cond: { realmMin: 2 },
      choices: {
        right: { karma: 15, gain: [{ type: 'stones', n: [100, 160] }, { type: 'buff', field: 'offlineEff', mult: 0.25, hours: 12 }],
          check: { type: 'attr', attr: 'qi', dc: 'hard', failE: { buff: { field: 'combatPower', mult: -0.12, hours: 12 } } } },
        evil: { karma: -15, gain: [{ type: 'stones', n: [420, 640] }] },
        neutral: { karma: 3, gain: [{ type: 'buff', field: 'qiRate', mult: 0.10, hours: 8 }],
          check: { type: 'stones', cost: [100, 160] } }
      } },

    /* ── 天级（3 条）── */
    { id: 'dragon_bones', tier: 'tian', nature: 'good', weight: 4, cooldownHours: 96,
      cond: { realmMin: 5 },
      choices: {
        right: { karma: 20, gain: [{ type: 'buff', field: 'qiRate', mult: 0.40, hours: 24 }, { type: 'qiPct', pct: [0.15, 0.25] }] },
        evil: { karma: -24, gain: [{ type: 'stones', n: [1500, 2400] }, { type: 'dropGear', tierMin: 4 }],
          check: [
            { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.09] } },
            { type: 'power', ratio: 1.3, failE: { qiPct: [-0.15, -0.09] } }
          ] },
        neutral: { karma: 2, gain: [{ type: 'stones', n: [600, 950] }],
          check: { type: 'attr', attr: 'qi', dc: 'medium' } }
      } },
    { id: 'witness_tribulation', tier: 'tian', nature: 'bad', weight: 4, cooldownHours: 96,
      cond: { realmMin: 4 },
      choices: {
        right: { karma: 22, gain: [{ type: 'buff', field: 'combatPower', mult: 0.30, hours: 24 }, { type: 'tribNext', n: 0.03 }],
          check: [
            { type: 'power', ratio: 1.4, failE: { qiPct: [-0.15, -0.09] } },
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.09] } }
          ] },
        evil: { karma: -20, gain: [{ type: 'stones', n: [1300, 2100] }, { type: 'dropGear', tierMin: 4 }],
          check: { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.09] } } },
        neutral: { karma: 0, gain: [{ type: 'qiPct', pct: [-0.08, -0.04] }],
          check: { type: 'attr', attr: 'qi', dc: 'medium', failE: { qiPct: [-0.06, -0.04] } } }
      } },
    { id: 'immortal_chess', tier: 'tian', nature: 'good', special: true, once: true, weight: 3, cooldownHours: 168,
      cond: { realmMin: 3 },
      choices: {
        right: { karma: 25, gain: [{ type: 'attrBonus', attr: 'shen', n: 2 }, { type: 'buff', field: 'artsSpeed', mult: 0.40, hours: 48 }] },
        evil: { karma: -25, gain: [{ type: 'stones', n: [2000, 3200] }],
          check: [
            { type: 'attr', attr: 'shen', dc: 'hard', failE: { qiPct: [-0.15, -0.10], buff: { field: 'eventLuck', mult: -0.20, hours: 24 } } },
            { type: 'attr', attr: 'jing', dc: 'hard', failE: { qiPct: [-0.15, -0.10], buff: { field: 'eventLuck', mult: -0.20, hours: 24 } } }
          ] },
        neutral: { karma: 5, gain: [{ type: 'attrBonus', attr: 'jing', n: 1 }, { type: 'buff', field: 'qiRate', mult: 0.35, hours: 36 }],
          check: { type: 'attr', attr: 'shen', dc: 'medium' } }
      } }
  ];
})();
