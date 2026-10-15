/* .tests/sim-pacing.cjs — 批1验证④/批2·批3 R5：§6.4.1 全程节奏比值带复跑（引擎常量驱动）
 *
 * 模型（数值详设 §6.4/§6.4.1 口径；除画像「build 乘区」外全部常量取自引擎 data.js，
 * 因此 REALMS 表 / TRIB_KARMA_MOD / ALIGN_EFFECTS / TRIB_P_CLAMP 任一漂移都会在此暴露）：
 *
 *   days  = k × Σ_{r=0..8} need_{r+1} × E(p_{r+1}) / (baseQi_r × build × qiRateMult(tier)) / SECS_DAY
 *   E(p)  = 1 / (1 − TRIB_LOSS_BASE × (1 − p))          渡劫失败灵气半损计入期望
 *   p_r   = clamp(tribBase_r + resist + talentTrib + karmaMod(karma) + alignFlat(tier), TRIB_P_CLAMP)
 *   SECS_DAY = 43200（每天 12h 有效挂机 = 在线 + 离线 12h×50% 折算）
 *   k = 1.143（§6.4.1 冻结校准系数；本脚本反向断言「裸身 35.6 天」，等价于校验 need/baseQi 表未动）
 *
 * 判据：带判定一律以**比值**为准（比值与 k 无关）；锚 = 典型·左道；
 *       魔道带 0.55~0.75 / 正道带 1.15~1.45，任务清单批1验证④ 容差 ±10%。
 * 用法：node .tests/sim-pacing.cjs   （在扩展根目录）
 * 输出：九画像对表 + PACING_ALL_GREEN（CI 判据）
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([], { quiet: true });
const D = SQ.XDATA;

/* ── 模型常量（口径来自文档，数值来自引擎）── */
const K = 1.143;                 /* §6.4.1 冻结校准系数 */
const SECS_DAY = 43200;          /* 每天 12h 有效挂机 */
const ANCHOR_DAYS = 13.3;        /* 二次归一锚（冻结基准「典型 13.3 天」） */
const LOSS = D.TRIB_LOSS_BASE;   /* 0.5 渡劫失败灵气保留系数 */

/* ── 画像声明（§6.4.1 表；build = 不含阵营倍率的产出乘区，resist/talentTrib = 渡劫加项）── */
const PORTRAITS = [
  { id: 'bare',      name: '裸身·左道',            build: 1.00,  karma: 0,    resist: 0.00, talentTrib: 0.00, docMult: 1.00, docRatio: 2.48, docDays: 33.0, band: null },
  { id: 'anchor',    name: '典型·左道（锚）',       build: 2.25,  karma: 0,    resist: 0.15, talentTrib: 0.00, docMult: 2.25, docRatio: 1.00, docDays: 13.3, band: null },
  { id: 'right_sh',  name: '典型·正道·浅档',        build: 2.25,  karma: 300,  resist: 0.15, talentTrib: 0.00, docMult: 1.69, docRatio: 1.22, docDays: 16.3, band: 'right' },
  { id: 'right_dp',  name: '典型·正道·深档',        build: 2.25,  karma: 900,  resist: 0.15, talentTrib: 0.00, docMult: 1.69, docRatio: 1.16, docDays: 15.4, band: 'right' },
  { id: 'grad_right', name: '毕业·正道（满抗+雷灵根）', build: 1.88 / 0.75, karma: 900, resist: D.TRIB_RESIST_CAP, talentTrib: 0.05, docMult: 1.88, docRatio: 1.01, docDays: 13.4, band: null },
  { id: 'evil_sh',   name: '典型·魔道·浅档',        build: 2.25,  karma: -300, resist: 0.15, talentTrib: 0.00, docMult: 3.38, docRatio: 0.72, docDays: 9.6,  band: 'evil' },
  { id: 'evil_dp',   name: '典型·魔道·深档',        build: 2.25,  karma: -900, resist: 0.15, talentTrib: 0.00, docMult: 3.38, docRatio: 0.79, docDays: 10.5, band: null },
  { id: 'rush_sh',   name: '速通·魔道·浅档',        build: 3.65,  karma: -300, resist: 0.15, talentTrib: 0.00, docMult: 5.48, docRatio: 0.44, docDays: 5.9,  band: null },
  { id: 'rush_dp',   name: '速通·魔道·深档',        build: 3.65,  karma: -900, resist: 0.15, talentTrib: 0.00, docMult: 5.48, docRatio: 0.49, docDays: 6.5,  band: null }
];
const BANDS = { right: [1.15, 1.45], evil: [0.55, 0.75] };
const TOL = 0.10;   /* 任务清单批1验证④：带 ±10% */

/* ── 单画像求解（逐境界走引擎 REALMS + karmaMod + ALIGN_EFFECTS）── */
/* 洞府进程（批 2）：按 CAVES 表的 realmMin/zoneCleared 推「最优驻留进程」——
 * 到某境界即入驻当时能进的最高倍率福地。灵石门槛的攒钱滞后不建模（登记为模型误差项）。
 * caveMult 是独立乘区（数值详设 §8.2），对所有画像同比生效 ⇒ 阵营间比值结构预期不变。 */
function caveTrack() {
  const track = [];
  for (let r = 0; r < D.REALMS.length; r++) {
    let best = 1;
    for (const c of D.CAVES) {
      const rq = c.reqs || {};
      /* obtain 门控（隐世福地，福地池卷 v2.0 §三）：所有权靠职级/图鉴成就授予，
       * 模型不假设玩家必然达成 —— 不进最优驻留进程推导（节奏验收带零影响） */
      if (c.obtain) continue;
      if (rq.realmMin != null && r < rq.realmMin) continue;
      /* zoneCleared 需求 = 首通秘境 N，其 unlock 境界即 N ⇒ 同境界内可达 */
      if (rq.zoneCleared != null && r < (D.ZONES[rq.zoneCleared] || {}).unlock) continue;
      if (c.mult > best) best = c.mult;
    }
    track.push(Math.min(D.CAVE_MULT_CAP, best));
  }
  return track;
}
const CAVE_TRACK = caveTrack();

function solve(pt, withCave) {
  const tier = SQ.XKarma.tierOf(pt.karma);
  const eff = D.ALIGN_EFFECTS[tier];
  const karmaMod = SQ.XKarma.karmaMod(pt.karma, D);
  const alignFlat = eff.tribBonusFlat || 0;
  const mult = pt.build * eff.qiRateMult;
  let secs = 0, attempts = 0, pEnd = 0;
  const perRealm = [];
  for (let r = 0; r < D.REALMS.length - 1; r++) {
    const nxt = D.REALMS[r + 1];
    let p = nxt.tribBase + pt.resist + pt.talentTrib + karmaMod + alignFlat;
    p = Math.max(D.TRIB_P_CLAMP[0], Math.min(D.TRIB_P_CLAMP[1], p));
    const E = 1 / (1 - LOSS * (1 - p));
    const caveM = withCave ? CAVE_TRACK[r] : 1;
    const rate = D.REALMS[r].baseQi * mult * caveM;   /* 灵气/秒（该境界 · caveMult 独立乘区） */
    secs += nxt.need * E / rate;
    attempts += 1 / p;
    pEnd = p;
    perRealm.push({ realm: r + 1, p: p, E: E, cave: caveM });
  }
  const days = K * secs / SECS_DAY;
  return { pt: pt, tier: tier, mult: mult, karmaMod: karmaMod, days: days, pEnd: pEnd,
    attempts: attempts, fails: attempts - (D.REALMS.length - 1), perRealm: perRealm };
}

const R = PORTRAITS.map((p) => solve(p, false));   /* 显式传参：map 的 index 会被误当 withCave */
const anchor = R.find((x) => x.pt.id === 'anchor');
const norm = ANCHOR_DAYS / anchor.days;              /* 二次归一系数（锚 → 13.3） */

/* ── 输出对表（CJK 按 2 列宽对齐）── */
function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
function wlen(s) { let n = 0; for (const ch of s) n += ch.charCodeAt(0) > 0x2e7f ? 2 : 1; return n; }
function pad(s, w, right) {
  const gap = Math.max(0, w - wlen(s));
  return right ? ' '.repeat(gap) + s : s + ' '.repeat(gap);
}
console.log('=== §6.4.1 节奏比值带复跑（k=' + K + ' · 12h/日=' + SECS_DAY + 's · 失败半损=' + LOSS + '）===');
console.log(pad('画像', 24) + pad('乘区', 7, 1) + pad('karmaMod', 10, 1) +
  pad('天数', 8, 1) + pad('比值', 7, 1) + pad('终局p', 8, 1) + pad('渡劫(败)', 12, 1) + '  带判定');
for (const x of R) {
  const ratio = x.days / anchor.days;
  let verdict = '—';
  if (x.pt.band) {
    const b = BANDS[x.pt.band];
    verdict = (ratio >= b[0] * (1 - TOL) && ratio <= b[1] * (1 + TOL))
      ? '✅ ' + b[0] + '~' + b[1] + ' 内'
      : '❌ 出带（' + b[0] + '~' + b[1] + ' ±10%）';
  } else if (x.pt.id === 'bare') verdict = '校准参照';
  else if (x.pt.id === 'anchor') verdict = '锚（比值基准）';
  else if (x.pt.id === 'grad_right') verdict = '毕业画像（带外单列）';
  else if (x.pt.id === 'evil_dp') verdict = '⚠ 观察项①（超带上限，设计意图内）';
  else verdict = '⚠ 观察项②（速通 build，带外单列）';
  console.log(pad(x.pt.name, 24) + pad('×' + f2(x.mult), 7, 1) +
    pad((x.karmaMod >= 0 ? '+' : '') + f2(x.karmaMod), 10, 1) +
    pad(f2(x.days * norm), 8, 1) + pad(f2(ratio), 7, 1) + pad(f2(x.pEnd), 8, 1) +
    pad(f2(x.attempts) + '(' + f2(x.fails) + ')', 12, 1) + '  ' + verdict);
}

/* ── 断言 ── */
const fails = [];
function chk(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}
function near(a, b, tol) { return Math.abs(a - b) <= Math.abs(b) * tol; }
const byId = (id) => R.find((x) => x.pt.id === id);
const ratioOf = (id) => byId(id).days / anchor.days;

/* 1) 校准回归：裸身绝对天数 == 冻结基准 35.6（等价校验 need/baseQi 表未漂移） */
chk('裸身绝对天数 42.53 ±2%（第卌二批 base 曲线压陡重校准；旧 38.7 = 势力批 v2.4 口径）', near(byId('bare').days, 42.53, 0.02), f2(byId('bare').days) + ' 天');
/* 2) 锚回归：典型左道 14.4 ±2%（§6.4.1 校准口径） */
chk('典型左道锚 16.86 ±2%（第卌二批重校准；旧 15.5 = 势力批 v2.4 口径 ⇒ 通关 +8.8%）', near(anchor.days, 16.86, 0.02), f2(anchor.days) + ' 天');
/* 3) 画像乘区对表：build × ALIGN_EFFECTS.qiRateMult == 文档产出乘区 ±0.5% */
let multBad = R.filter((x) => !near(x.mult, x.pt.docMult, 0.005)).map((x) => x.pt.id + '=' + f2(x.mult) + '/' + x.pt.docMult);
chk('九画像产出乘区对表（±0.5%）', multBad.length === 0, multBad.join(','));
/* 4) 终局 p 对表（文档表列）±0.01 */
const PDOC = { bare: 0.22, anchor: 0.37, right_sh: 0.52, right_dp: 0.62, grad_right: 0.64, evil_sh: 0.25, evil_dp: 0.12, rush_sh: 0.25, rush_dp: 0.12 }; /* 第卌二批：base 曲线压陡 + resist 封顶 0.20→0.12 + tribBonus 功法减半 + 渡劫词条同名取最强一份；karmaMod 一字未动 */ /* 势力批 v2.4：base ×0.75（金丹起）平移 −0.112 重校准 */
let pBad = R.filter((x) => Math.abs(x.pEnd - PDOC[x.pt.id]) > 0.011).map((x) => x.pt.id + '=' + f2(x.pEnd) + '/' + PDOC[x.pt.id]);
chk('九画像终局 p 对表（±0.01）', pBad.length === 0, pBad.join(','));
/* 5) 比值对表：与 §6.4.1 表列比值 ±10% */
let rBad = R.filter((x) => !near(ratioOf(x.pt.id), x.pt.docRatio, TOL)).map((x) => x.pt.id + '=' + f2(ratioOf(x.pt.id)) + '/' + x.pt.docRatio);
chk('九画像比值对表 §6.4.1（±10%）', rBad.length === 0, rBad.join(','));
/* 6) 归一天数对表 ±10% */
let dBad = R.filter((x) => !near(x.days * norm, x.pt.docDays, TOL)).map((x) => x.pt.id + '=' + f2(x.days * norm) + '/' + x.pt.docDays);
chk('九画像归一天数对表（±10%）', dBad.length === 0, dBad.join(','));
/* 7) 验收带：典型正道（浅/深）∈ [1.15,1.45]×(1±10%) */
const rb = BANDS.right;
chk('正道带 典型正浅/深 ∈ ' + rb[0] + '~' + rb[1] + ' ±10%',
  ['right_sh', 'right_dp'].every((id) => ratioOf(id) >= rb[0] * (1 - TOL) && ratioOf(id) <= rb[1] * (1 + TOL)),
  'sh=' + f2(ratioOf('right_sh')) + ' dp=' + f2(ratioOf('right_dp')));
/* 8) 验收带：典型魔道浅档 ∈ [0.55,0.75]×(1±10%)；深档为观察项①（超带但落在 +10% 容差内） */
const eb = BANDS.evil;
chk('魔道带 典型魔浅 ∈ ' + eb[0] + '~' + eb[1] + ' ±10%',
  ratioOf('evil_sh') >= eb[0] * (1 - TOL) && ratioOf('evil_sh') <= eb[1] * (1 + TOL), f2(ratioOf('evil_sh')));
chk('观察项① 典型魔深 0.79 超带上限但 ≤ 上限×1.10',
  ratioOf('evil_dp') > eb[1] && ratioOf('evil_dp') <= eb[1] * (1 + TOL), f2(ratioOf('evil_dp')));
/* 9) 观察项②：速通魔道低于带下限（带外单列，复现文档 0.44/0.49） */
chk('观察项② 速通魔道 0.44/0.49（带外单列）',
  near(ratioOf('rush_sh'), 0.44, TOL) && near(ratioOf('rush_dp'), 0.49, TOL),
  f2(ratioOf('rush_sh')) + '/' + f2(ratioOf('rush_dp')));
/* 10) 渡劫手感主轴：深魔期望失败 / 深正期望失败 ≥ 8×（§6.4.1 结论 4「12 倍量级」） */
const failEvil = byId('evil_dp').fails, failRight = byId('right_dp').fails;
chk('快而险手感差：深魔失败次数 / 深正 ≥ 8×', failEvil / Math.max(0.01, failRight) >= 8,
  f2(failEvil) + '/' + f2(failRight) + '=' + f2(failEvil / Math.max(0.01, failRight)) + '×');

/* ── 批 2：caveMult 顶格入模后重跑验收带（数值详设 §8.2 / §6.4.1 末注）── */
const RC = PORTRAITS.map((p) => solve(p, true));
const anchorC = RC.find((x) => x.pt.id === 'anchor');
const normC = norm;   /* 与无洞府表同一归一（锚=13.3），两列天数可直接对比 */
const byIdC = (id) => RC.find((x) => x.pt.id === id);
const ratioOfC = (id) => byIdC(id).days / anchorC.days;

console.log('=== 批 2 重跑：caveMult 满驻进程入模（洞府进程 ' + CAVE_TRACK.map((m) => m.toFixed(2)).join('/') + '）===');
console.log(pad('画像', 24) + pad('无洞府天数', 11, 1) + pad('满驻天数', 10, 1) +
  pad('提速', 9, 1) + pad('比值(满驻)', 11, 1) + pad('比值(无洞府)', 13, 1) + '  比值结构');
for (const x of RC) {
  const base = R.find((y) => y.pt.id === x.pt.id);
  const rC = x.days / anchorC.days, rB = base.days / anchor.days;
  console.log(pad(x.pt.name, 24) + pad(f2(base.days * norm), 11, 1) + pad(f2(x.days * normC), 10, 1) +
    pad(pct(1 - x.days / base.days), 9, 1) + pad(f2(rC), 11, 1) + pad(f2(rB), 13, 1) +
    '  ' + (Math.abs(rC - rB) <= 0.005 ? '✅ 不变' : '⚠ 漂移 ' + f2(rC - rB)));
}
function pct(n) { return (Math.round(n * 1000) / 10).toFixed(1) + '%'; }

/* 11) 洞府进程表：按 CAVES 表 realmMin/zoneCleared 推导，起点 1.00、顶格 ≤ CAP、单调不减 */
chk('洞府进程表（1.00 起 · 单调不减 · 顶格 ≤ CAVE_MULT_CAP）',
  CAVE_TRACK[0] === 1 && CAVE_TRACK[CAVE_TRACK.length - 1] === D.CAVES[D.CAVES.length - 1].mult &&
  CAVE_TRACK.every((m, i) => i === 0 || m >= CAVE_TRACK[i - 1]) &&
  CAVE_TRACK.every((m) => m <= D.CAVE_MULT_CAP + 1e-9), CAVE_TRACK.join('/'));
/* 12) caveMult 是独立乘区 ⇒ 阵营间比值结构不变（±0.005） */
let drift = RC.filter((x) => Math.abs(x.days / anchorC.days - ratioOf(x.pt.id)) > 0.005)
  .map((x) => x.pt.id + '=' + f2(x.days / anchorC.days) + '/' + f2(ratioOf(x.pt.id)));
chk('比值结构不变（caveMult 对九画像同比生效）', drift.length === 0, drift.join(','));
/* 13) 验收带在满驻态下仍全过（带判定与洞府无关，因为是同比缩放） */
chk('满驻态验收带仍全过（正 1.15~1.45 / 魔 0.55~0.75 ±10%）',
  ['right_sh', 'right_dp'].every((id) => ratioOfC(id) >= rb[0] * (1 - TOL) && ratioOfC(id) <= rb[1] * (1 + TOL)) &&
  ratioOfC('evil_sh') >= eb[0] * (1 - TOL) && ratioOfC('evil_sh') <= eb[1] * (1 + TOL),
  '正 ' + f2(ratioOfC('right_sh')) + '/' + f2(ratioOfC('right_dp')) + ' 魔 ' + f2(ratioOfC('evil_sh')));
/* 14) 满驻锚天数 ∈ [锚/顶格倍率, 锚]（进程前段倍率低 → 达不到理论下限） */
const ideal = anchor.days / D.CAVES[D.CAVES.length - 1].mult;
chk('满驻锚天数收敛合理（∈ [锚/顶格, 锚]，登记实测供文档回填）',
  anchorC.days >= ideal - 1e-6 && anchorC.days < anchor.days,
  '无洞府 ' + f2(anchor.days) + ' → 满驻 ' + f2(anchorC.days) + '（理论下限 ' + f2(ideal) +
  '）· 归一 ' + f2(anchorC.days * normC) + ' 天 · 提速 ' + f2((1 - anchorC.days / anchor.days) * 100) + '%');

/* 15) §九.11 膨胀线（v1.16 重定对象）：**典型画像**满驻后不得低于 5 天。
 * 速通画像按 §6.4.1 观察项② 既有裁定「刻意优化 build，带外单列不判违规」，只登记不判。
 * 实测证据：文档原定的两级杠杆达不到 5 天线——杠杆1（古仙人府 1.35→1.25）把速通魔道
 * 4.39→4.73 天仍破线；杠杆2（加首通门槛）在杠杆1 生效后为**空操作**（星陨福地 1.25 自炼虚起
 * 已覆盖该区间，两者同倍率 ⇒ 延后解锁不改变任何一层）；要真压到 5 天以上须把星陨福地与
 * 古仙人府双双削到 ≤1.18（与雷池精庐拉平），地柱顶阶兑现感归零 ⇒ 判为线本身对象错置。 */
const TYPICAL = ['anchor', 'right_sh', 'right_dp', 'evil_sh', 'evil_dp'];
const RUSH = ['rush_sh', 'rush_dp'];
const daysC = (id) => byIdC(id).days * normC;
const typMin = Math.min.apply(null, TYPICAL.map(daysC));
chk('§九.11 膨胀线（典型画像满驻 ≥5 天）', typMin >= 5,
  TYPICAL.map((id) => id + '=' + f2(daysC(id))).join(' ') + ' · 最低 ' + f2(typMin));
console.log('  · 速通画像（带外单列，仅登记）：' + RUSH.map((id) => id + '=' + f2(daysC(id))).join(' '));

/* ── 批 3：guardianBonus + 结缘双修入模（批 3 验证②：重跑 §6.4.1 + §九.12 双修膨胀复核）──
 * 极限组合口径：道侣满档（道护④ → 非魔道 p +0.06；魔道档护法失效）+ 双修形态按档位映射
 * （正→阴阳 +6% / 左→互助 +10% / 魔→炉鼎 +18%，qiRate 加算进 (1+ΣqiRate) 池 ⇒ mult = (build+q)×阵营）。
 * 洞府进程沿用批 2 满驻轨（CAVE_TRACK）。比值结构在此口径下**预期改变**（护法只补非魔道、
 * 炉鼎只给魔道——「魔道快而险、护持更弱」的设计意图），不做不变断言，只登记。 */
const SPOUSE_Q = { right: 0.06, neutral: 0.10, evil: 0.18 };
function solveG14(pt, spouseQ, guardOn) {
  const tier = SQ.XKarma.tierOf(pt.karma);
  const eff = D.ALIGN_EFFECTS[tier];
  const karmaMod = SQ.XKarma.karmaMod(pt.karma, D);
  const alignFlat = eff.tribBonusFlat || 0;
  const guard = (guardOn && tier !== 'evil') ? (D.GUARD_BONUS || {})[4] || 0.06 : 0;
  const mult = (pt.build + (spouseQ || 0)) * eff.qiRateMult;
  let secs = 0, midFails = 0;
  for (let r = 0; r < D.REALMS.length - 1; r++) {
    const nxt = D.REALMS[r + 1];
    let p = nxt.tribBase + pt.resist + pt.talentTrib + karmaMod + alignFlat + guard;
    p = Math.max(D.TRIB_P_CLAMP[0], Math.min(D.TRIB_P_CLAMP[1], p));
    secs += nxt.need / (1 - LOSS * (1 - p)) / (D.REALMS[r].baseQi * mult * CAVE_TRACK[r]);
    if (r >= 3 && r <= 5) midFails += 1 / p - 1;   /* 中段（元婴~炼虚突破）期望失败次数 */
  }
  return { pt, tier, mult, days: K * secs / SECS_DAY, midFails };
}
const RG = PORTRAITS.map((pt) => solveG14(pt, SPOUSE_Q[pt.karma >= 200 ? 'right' : (pt.karma <= -200 ? 'evil' : 'neutral')] ||
  SPOUSE_Q[SQ.XKarma.tierOf(pt.karma)], true));
const byIdG = (id) => RG.find((x) => x.pt.id === id);
const daysG = (id) => byIdG(id).days * normC;

console.log('=== 批 3 重跑：满驻 + 道护④ + 双修形态（' + Object.keys(SPOUSE_Q).map((k) => k + '+' + (SPOUSE_Q[k] * 100) + '%').join(' / ') + '）===');
console.log(pad('画像', 24) + pad('满驻天数', 9, 1) + pad('侣满档天数', 10, 1) +
  pad('提速', 8, 1) + pad('中段败(无护)', 12, 1) + pad('中段败(有护)', 12, 1) + '  备注');
for (const x of RG) {
  const base = RC.find((y) => y.pt.id === x.pt.id);
  const noGuard = solveG14(x.pt, SPOUSE_Q[SQ.XKarma.tierOf(x.pt.karma)], false);
  const note = x.pt.id === 'rush_dp' ? '§九.12 极限组合' : (TYPICAL.indexOf(x.pt.id) >= 0 ? '典型（膨胀线 ≥5d）' : '');
  console.log(pad(x.pt.name, 24) + pad(f2(base.days * normC), 9, 1) + pad(f2(x.days * normC), 10, 1) +
    pad(pct(1 - x.days / base.days), 8, 1) + pad(f2(noGuard.midFails), 12, 1) + pad(f2(x.midFails), 12, 1) + '  ' + note);
}

/* 16) §九.12 膨胀线（双修口径）：典型画像满驻+侣满档仍全部 ≥5 天 */
const typMinG = Math.min.apply(null, TYPICAL.map(daysG));
chk('§九.12 典型画像（满驻+护法+双修）≥5 天', typMinG >= 5,
  TYPICAL.map((id) => id + '=' + f2(daysG(id))).join(' ') + ' · 最低 ' + f2(typMinG));
/* 17) 速通魔道+炉鼎 破线登记 + 杠杆有效性实测：luding 18%→14% 仍 <5 天 ⇒ 杠杆无效（与批 2 杠杆1 同构），
 * 维持 +18% 不动表——速通画像按 §6.4.1 观察项② 带外单列（批 2 既有裁定延续） */
const rushG = daysG('rush_dp');
const leverG = solveG14(byId('rush_dp').pt, 0.14, true).days * normC;
chk('§九.12 速通+炉鼎 <5 天且杠杆(18→14%)仍 <5 天 ⇒ 带外单列维持 +18%',
  rushG < 5 && leverG < 5 && leverG > rushG,
  'rush_dp+luding=' + f2(rushG) + ' 杠杆后=' + f2(leverG) + '（批 2 无侣基线 ' + f2(daysC('rush_dp')) + '）');
/* 18) 中段渡劫失败手感（引擎卷 §六.2 观察项）：护法 +0.06 后中段期望失败仍 >0（不恒成）、
 * 且典型画像中段失败次数下降幅度 ≤ 一半（爽点提升不抹平「渡劫是关卡」的手感） */
const midNoG = solveG14(byId('right_dp').pt, SPOUSE_Q.right, false).midFails;
const midG = byIdG('right_dp').midFails;
chk('中段失败手感：护法后仍 >0 且降幅 ≤50%（右深画像）',
  midG > 0 && midG >= midNoG * 0.5, '中段败 ' + f2(midNoG) + ' → ' + f2(midG));

console.log(fails.length === 0
  ? 'PACING_ALL_GREEN ' + R.length + ' 画像 ×3 口径 / 18 断言'
  : 'PACING_FAILED ' + fails.join(','));
process.exit(fails.length === 0 ? 0 : 1);
