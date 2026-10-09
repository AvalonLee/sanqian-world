/* assets/talents/common.js — 通用天赋池（跨世界，正 40 + 负 32 = 72 条）· 纯机制数据
 * ⚠ 由脚本自《三千世界-天赋池设计》§四 表格生成——改词条先改文档再重新生成。
 * P3 起 name/desc 文案移入词表 assets/lexicon/talents.js（talent.{id}.name/.desc），
 * 本文件禁止出现任何面向玩家的文案（词表审计 .tests/audit.js 会扫）。
 * kind: positive/negative；tier: common/rare（epic 为修仙专属池独有，本池不启用）；
 * effects 见天赋池设计 §三（平坦乘区）与 §三·补（机制挂点键，系统深化批 A2）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.TALENTS = SQ.TALENTS || {};
  SQ.TALENTS.common = {
    positive: [
    { id: 'gifted', kind: 'positive', tier: 'common', world: 'common', weight: 10, effects: { qiRate: 0.15 } },
    { id: 'diligent', kind: 'positive', tier: 'common', world: 'common', weight: 10, effects: { qiRate: 0.08, artsSpeed: 0.1 } },
    { id: 'photographic', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { artsSpeed: 0.2 } },
    { id: 'prosperous', kind: 'positive', tier: 'common', world: 'common', weight: 10, effects: { stonesRate: 0.2 } },
    { id: 'ironbone', kind: 'positive', tier: 'common', world: 'common', weight: 10, effects: { combatPower: 0.1 } },
    { id: 'swift', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { combatSpeed: 0.15 } },
    { id: 'nightowl', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { offlineEff: 0.15 } },
    { id: 'bigbelly', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { qiCap: 0.25 } },
    { id: 'merchant', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { shopCost: -0.1 } },
    { id: 'craftsman_eye', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { gearLuck: 0.15 } },
    { id: 'adventurous', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { dropRate: 0.15 } },
    { id: 'lucky_star', kind: 'positive', tier: 'rare', world: 'common', weight: 6, effects: { dropRate: 0.1, eventLuck: 0.15 } },
    { id: 'serendipity', kind: 'positive', tier: 'rare', world: 'common', weight: 6, effects: { eventRate: 0.25 } },
    { id: 'deep_roots', kind: 'positive', tier: 'rare', world: 'common', weight: 5, effects: { realmCost: -0.08 } },
    { id: 'keen_instinct', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { eventLuck: 0.1 } },
    { id: 'early_bird', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { offlineEff: 0.1, qiRate: 0.05 } },
    { id: 'pack_mule', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { gearLuck: 0.1, dropRate: 0.08 } },
    { id: 'silver_tongue', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { shopCost: -0.05, stonesRate: 0.05 } },
    { id: 'explorer', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { eventRate: 0.15, dropRate: 0.05 } },
    { id: 'resilient', kind: 'positive', tier: 'common', world: 'common', weight: 7, effects: { qiCap: 0.12, offlineEff: 0.06 } },
    { id: 'quick_learner', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { artsSpeed: 0.1, qiRate: 0.03 } },
    { id: 'deep_pockets', kind: 'positive', tier: 'common', world: 'common', weight: 7, effects: { shopCost: -0.06, stonesRate: 0.06 } },
    { id: 'battle_hardened', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { combatPower: 0.08, combatSpeed: 0.05 } },
    { id: 'scavenger', kind: 'positive', tier: 'common', world: 'common', weight: 7, effects: { dropRate: 0.08, gearLuck: 0.06 } },
    { id: 'dream_worker', kind: 'positive', tier: 'common', world: 'common', weight: 7, effects: { offlineEff: 0.12, qiCap: 0.08 } },
    { id: 'steady_progress', kind: 'positive', tier: 'common', world: 'common', weight: 7, effects: { realmCost: -0.04, qiRate: 0.04 } },
    { id: 'eagle_eye', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { gearLuck: 0.12, eventLuck: 0.05 } },
    { id: 'risk_taker', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { eventRate: 0.12, dropRate: 0.06 } },
    /* ── 系统深化批 A2 · 平坦新增 8 条（天赋池设计 §4.1.1：补 checkBonus/attrBonusAmp 零覆盖与长尾梯度）── */
    { id: 'steady_nerves', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { checkBonus: 0.05 } },
    { id: 'veteran_instinct', kind: 'positive', tier: 'rare', world: 'common', weight: 5, effects: { checkBonus: 0.08 } },
    { id: 'body_harmony', kind: 'positive', tier: 'common', world: 'common', weight: 6, effects: { attrBonusAmp: 0.1 } },
    { id: 'latent_bloom', kind: 'positive', tier: 'rare', world: 'common', weight: 5, effects: { attrBonusAmp: 0.15 } },
    { id: 'diligent_student', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { artsSpeed: 0.06 } },
    { id: 'copper_hoarder', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { stonesRate: 0.1 } },
    { id: 'tidy_satchel', kind: 'positive', tier: 'common', world: 'common', weight: 7, effects: { gearLuck: 0.08 } },
    { id: 'long_stride', kind: 'positive', tier: 'common', world: 'common', weight: 8, effects: { combatSpeed: 0.08 } },
    /* ── 系统深化批 A2 · 机制型 4 条（天赋池设计 §4.3：effects 用 §三·补 挂点键，只用引擎层消费点）── */
    { id: 'last_stand', kind: 'positive', tier: 'rare', world: 'common', weight: 4, effects: { on_bottleneck_power: 0.05 } },
    { id: 'lesson_learned', kind: 'positive', tier: 'rare', world: 'common', weight: 4, effects: { on_trib_next: 0.02 } },
    { id: 'windwalker', kind: 'positive', tier: 'rare', world: 'common', weight: 5, effects: { yufeng: 0.92 } },
    { id: 'battle_gleaner', kind: 'positive', tier: 'rare', world: 'common', weight: 5, effects: { on_kill_drop: 0.03 } }
    ],
    negative: [
    { id: 'frail', kind: 'negative', tier: 'common', world: 'common', weight: 10, effects: { combatSpeed: -0.12 } },
    { id: 'mediocre', kind: 'negative', tier: 'common', world: 'common', weight: 10, effects: { qiRate: -0.1 } },
    { id: 'leaky_purse', kind: 'negative', tier: 'common', world: 'common', weight: 10, effects: { stonesRate: -0.15 } },
    { id: 'slow_wit', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { artsSpeed: -0.15 } },
    { id: 'spendthrift', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { shopCost: 0.12 } },
    { id: 'lazy', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { offlineEff: -0.2 } },
    { id: 'small_vessel', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { qiCap: -0.2 } },
    { id: 'jinxed', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { eventLuck: -0.15 } },
    { id: 'butterfingers', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { dropRate: -0.12 } },
    { id: 'clumsy_eye', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { gearLuck: -0.15 } },
    { id: 'shaky_foundation', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { realmCost: 0.1 } },
    { id: 'sluggish', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { combatPower: -0.08 } },
    { id: 'glass_bones', kind: 'negative', tier: 'common', world: 'common', weight: 7, effects: { combatPower: -0.12 } },
    { id: 'forgetful', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { dropRate: -0.08, gearLuck: -0.1 } },
    { id: 'debt_haunted', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { stonesRate: -0.1, shopCost: 0.08 } },
    { id: 'secluded', kind: 'negative', tier: 'common', world: 'common', weight: 7, effects: { eventRate: -0.2 } },
    { id: 'brittle_bones', kind: 'negative', tier: 'common', world: 'common', weight: 7, effects: { combatSpeed: -0.08, combatPower: -0.06 } },
    { id: 'leaky_seal', kind: 'negative', tier: 'common', world: 'common', weight: 7, effects: { qiCap: -0.12, qiRate: -0.04 } },
    { id: 'impulse_buyer', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { shopCost: 0.1, stonesRate: -0.04 } },
    { id: 'accident_prone', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { eventLuck: -0.08, dropRate: -0.06 } },
    { id: 'slow_starter', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { offlineEff: -0.1, combatSpeed: -0.05 } },
    { id: 'forgetful_mind', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { artsSpeed: -0.1, realmCost: 0.04 } },
    /* ── 系统深化批 A2 · 平坦新增 8 条（天赋池设计 §4.2.1：与 4.1.1 镜像负向）── */
    { id: 'trembling_hands', kind: 'negative', tier: 'common', world: 'common', weight: 7, effects: { checkBonus: -0.05 } },
    { id: 'stage_fright', kind: 'negative', tier: 'rare', world: 'common', weight: 5, effects: { checkBonus: -0.08 } },
    { id: 'body_dissonance', kind: 'negative', tier: 'common', world: 'common', weight: 6, effects: { attrBonusAmp: -0.1 } },
    { id: 'withered_potential', kind: 'negative', tier: 'rare', world: 'common', weight: 5, effects: { attrBonusAmp: -0.15 } },
    { id: 'lazy_practitioner', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { artsSpeed: -0.06 } },
    { id: 'hole_pocket', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { stonesRate: -0.08 } },
    { id: 'misjudging_eye', kind: 'negative', tier: 'common', world: 'common', weight: 7, effects: { gearLuck: -0.08 } },
    { id: 'lead_feet', kind: 'negative', tier: 'common', world: 'common', weight: 8, effects: { combatSpeed: -0.06 } },
    /* ── 系统深化批 A2 · 机制型 2 条（天赋池设计 §4.3；「闻雷色变」避开专属池「畏雷之体」）── */
    { id: 'thunder_dread', kind: 'negative', tier: 'rare', world: 'common', weight: 4, effects: { on_trib_next: -0.02 } },
    { id: 'brittle_frame', kind: 'negative', tier: 'rare', world: 'common', weight: 5, effects: { on_bottleneck_power: -0.04 } }
    ]
  };
})();
