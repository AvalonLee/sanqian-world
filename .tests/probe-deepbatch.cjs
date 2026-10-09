/* .tests/probe-deepbatch.cjs — 系统深化批 验证项④ 数值探针（一次性校准脚本，非 CI 断言）
 * 目的（任务清单·系统深化批 验证 4）：
 *   P1 §九.14 观察项：负面词缀对新手前 2 区首通时长漂移（> +15% 才动预案）；
 *   P2 §九.15 观察项前置：MERIT_NEED（15+realm×5，允许 ±5 校准）各境界达标率曲线；
 *   P3 §2.6 校准注记：BOSS_MULT 1.8 对装备阶梯（上品压线/灵品/仙品 + 淬体丹 + 瓶颈侧备战）的可达性。
 * 画像口径：
 *   典型驻留时长 = 数值详设 §6.4 节奏模型（build 2.25 锚画像，逐境界 secs = need×E(p)/产出）；
 *   功法等级 = 驻留时长 × 练习速率（主修 25/h、其余 10/h，满 100 顿悟，渡劫清零 → 只算本境驻留）；
 *   装备 atk = GEAR_TIERS 区间中值 × 秘境缩放锚（§3.2 同源）。
 * 用法：node .tests/probe-deepbatch.cjs（扩展根目录）
 */
'use strict';
const { load } = require('./sandbox.cjs');
const { SQ } = load([], { quiet: true });
const D = SQ.XDATA;

/* ── 公共：典型画像逐境界驻留秒数（pacing §6.4 模型 · build 2.25 左道锚） ── */
const BUILD = 2.25, SECS_DAY = 43200;
function staySecs(r) {
  const nxt = D.REALMS[r + 1];
  if (!nxt) return SECS_DAY * 3;
  let p = nxt.tribBase + 0.15;   /* 锚画像 resist 0.15 */
  p = Math.max(D.TRIB_P_CLAMP[0], Math.min(D.TRIB_P_CLAMP[1], p));
  const E = 1 / (1 - D.TRIB_LOSS_BASE * (1 - p));
  const rate = D.REALMS[r].baseQi * BUILD * 1.143;   /* k 校准系数同源 */
  return (nxt.need * E) / rate;
}
/* 功法等级（本境驻留内练回，渡劫清零后重练口径）：perHour 练习速率 → lv = floor(h×per/100) */
function artLv(r, perHour, capDays) {
  const h = Math.min(staySecs(r) / 3600, (capDays || 6) * 24);
  return Math.min(D.ARTS_MAX_LV, Math.floor((h * perHour) / D.PRACTICE_MAX));
}

/* ── P1 新手词缀漂移：realm1 画像 zone0 / realm2 画像 zone1，八词缀首通时长解析式 ── */
console.log('═══ P1 §九.14 新手前 2 区 · 词缀首通漂移（解析式：20 杀 × interval）═══');
function clearSecs(power, zoneIdx, affix) {
  const z = D.ZONES[zoneIdx];
  const need = z.need * (affix.needMult || 1);
  const bn = power < need;
  let interval = D.KILL_BASE_SEC;                    /* 裸画像 ΣcombatSpeed=0（境界刚破，功法清零重练） */
  if (bn) {
    let pen = D.BOTTLENECK_INTERVAL;
    if (affix.intervalAdd) pen += affix.intervalAdd;
    interval *= pen;
  }
  if (affix.speedMult) interval /= affix.speedMult;
  return (20 * interval) / 60;                       /* 分钟 */
}
[[1, 0, 60], [2, 1, 180]].forEach(function (cs) {
  const realm = cs[0], zone = cs[1], power = cs[2];
  const base = clearSecs(power, zone, {});
  const rows = D.ZONE_AFFIXES.map(function (a) {
    const m = clearSecs(power, zone, a);
    return a.id + '(' + a.cls + ') ' + m.toFixed(1) + 'min ' + ((m / base - 1) * 100 >= 0 ? '+' : '') + ((m / base - 1) * 100).toFixed(1) + '%';
  });
  console.log('realm' + realm + ' zone' + zone + ' power' + power + ' 基准 ' + base.toFixed(1) + 'min：');
  console.log('  ' + rows.join('\n  '));
});
console.log('裁定（§九.14 结案 · 数值零改动）：负面档（迷雾/贫瘠）字段全在产出侧（dropMult/stonesMult/gearLuckAdd），');
console.log('  首通节奏漂移恒 0.0%——「负面必带补偿」的字段设计已结构性排除节奏影响；混合档 needMult 未把典型画像推入瓶颈（亦 0.0%）；');
console.log('  最大漂移 +11.1%（正面档古尘 speedMult 0.90 换掉落质量）< +15% 触发线 ⇒ 前 2 区词缀池不改、无新手保护。');

/* ── P2 MERIT_NEED 达标率：kills20 = 20×(1+ΣcombatSpeed)；Σ = 云纵+流影（驻留练回）+ 疾风影词条期望 ──
 * 裁定（任务清单·系统深化批 验证 4 · 势力全录 §7.1 ±5 授权带）：原 15+5r 自 r2 起系统性不达标
 *（押注「高境界速度成长覆盖门槛」证伪），校准为 **10+2r**（base −5 / 斜率 −3，带内）——
 * 典型画像 r0~r8 全达标、r9 差 2 杀压线；裸速全程参与 r0~r5 达标、r6+ 需 Σspeed 10%~40%；
 * 瓶颈态减半 r4+ 不达标（约束力保留）。 */
console.log('\n═══ P2 §7.1 MERIT_NEED 各境界达标率（典型画像 ΣcombatSpeed 成长模型）═══');
console.log('realm  驻留h  云纵Lv 流影Lv  Σspeed   kills20  need(15+5r)  达标   need(10+2r·裁定)  达标');
const meritRows = [];
for (let r = 0; r <= 9; r++) {
  const lvY = r >= 1 ? artLv(r, D.PRACTICE_OTHER_PER_H) : 0;      /* 云纵非主修位（10/h） */
  const lvL = r >= 1 ? artLv(r, D.PRACTICE_OTHER_PER_H) : 0;      /* 流影同 */
  /* 疾风影（swift_shadow combatSpeed +10%）期望：r≥2 四槽 × specialP(区权重中值 0.08) × 1/9 词条 × 持穿率 0.75 */
  const gearSpd = r >= 2 ? 4 * 0.08 * (1 / 9) * 0.10 * 0.75 : 0;
  const spd = 0.06 * lvY + 0.04 * lvL + gearSpd;
  const kills20 = Math.floor(20 * (1 + spd));
  const need5 = 15 + 5 * r, need2 = 10 + 2 * r;
  meritRows.push({ r, kills20, need5, need2 });
  console.log(
    String(r).padEnd(6) + (staySecs(r) / 3600).toFixed(1).padEnd(7) +
    String(lvY).padEnd(7) + String(lvL).padEnd(7) + (spd * 100).toFixed(1).padEnd(8) + '%'.padEnd(0) + '  ' +
    String(kills20).padEnd(8) + String(need5).padEnd(12) + (kills20 >= need5 ? '✓' : '✗').padEnd(6) +
    ' ' + String(need2).padEnd(16) + (kills20 >= need2 ? '✓' : '✗'));
}

/* ── P3 BOSS_MULT 可达性：装备阶梯 × 备战路线（淬体丹 +20% / 瓶颈侧加算同读点） ── */
console.log('\n═══ P3 §2.6 BOSS_MULT 1.8 装备阶梯可达性（域主线 = need×1.8 = 2.7×境界基础战力）═══');
console.log('realm  裸身比  良品比  上品比  灵品比  仙品比 | 上品+丹+瓶颈侧  灵品+丹  灵品+丹+瓶颈侧  仙品+丹');
function atkSum(tierIdx, scale) {
  let s = 0;
  for (let i = 0; i < 4; i++) {
    const T = D.GEAR_TIERS[tierIdx];
    s += ((T.atk[0] + T.atk[1]) / 2) * scale;
  }
  return s;
}
for (let r = 1; r <= 9; r++) {
  const base = D.REALMS[r].power;
  const scale = Math.max(D.REALMS[D.ZONES[r].unlock].power / 100, 1);
  const need = D.ZONES[r].need;                       /* = 1.5×base */
  const cpSum = 0.25;                                 /* 典型 ΣcombatPower（功法/天赋/羁绊中值口径） */
  const ratio = (tierIdx) => (base * (1 + cpSum) + atkSum(tierIdx, scale)) / need;
  const bare = (base * (1 + cpSum)) / need;
  const pill = 1.20, bns = 1.15;                      /* 淬体丹 +20% / 瓶颈侧同读点 +15%（尸傀+背水+护镖典型） */
  console.log(
    String(r).padEnd(6) + bare.toFixed(2).padEnd(8) +
    [1, 2, 3, 4].map((ti) => ratio(ti).toFixed(2).padEnd(8)).join('') + '| ' +
    (ratio(2) * pill * bns).toFixed(2).padEnd(16) +
    (ratio(3) * pill).toFixed(2).padEnd(10) +
    (ratio(3) * pill * bns).toFixed(2).padEnd(16) +
    (ratio(4) * pill).toFixed(2));
}
console.log('\n判读：域主线 = 1.80。「上品+丹+瓶颈侧」≥1.8 即标准通关路线成立（§2.6 校准注记口径）。');
console.log('裁定（§九.15 结案 · 维持 BOSS_MULT 1.8）：§2.6「域主线 = need 的 1.2 倍」系算术笔误（need×1.8 = 2.7×base），');
console.log('  实测标准路线 = 灵品套+淬体丹+瓶颈侧 1.85 压线（上品+丹+瓶颈侧 1.55 差 14%）——「上品套+丹即通」宣称作废；');
console.log('  域主战不锁主线（境界解锁即可手动切区）、败无惩罚仅 CD 10min、心魔阶梯只读渡劫点不进 challengePower，');
console.log('  「双挫败乘算叠加」证伪；装备升档路径明确（首通必掉上浮一档/刷图/坊市），重试中位预估 2~3 次未过触发线（>3）。');
console.log('PROBE_DONE');
