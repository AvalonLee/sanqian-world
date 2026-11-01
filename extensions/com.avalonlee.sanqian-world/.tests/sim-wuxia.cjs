/* .tests/sim-wuxia.cjs — 武侠数值内核定种仿真（册160 · S3-a 立；册214 P1 重写为 claim 内核定种）
 *
 * 🆕 册214 重写归因（P1 契约改版）：书形态退役——`pack.narrative` 整族（advance 章事务/卡点投放/
 *   墨账/违和）与 `settings.offlineStory` 闸摘除，原 200 章「卷-章」定种面随之消失。本件改为
 *   **claim 内核 12 游戏月定种**：标准玩家日程直设（层数/到访/关系按月推进），全链只走
 *   `pack.claim`（产出/封顶/破关/修习练习度），验证放置 RPG 的成长曲线骨架。
 *   ⚠️ P2 将重定产出基准（功力/精力价目）——届时本件同式重跑换锚，归因 = 「产出重定种」。
 *
 * 「标准玩家」日程直设口径不变（卷首注承册160）：修习/游历的**操作循环**属 P2 界面批，
 * 本仿真验的是产出曲线 / 封顶 / 心境门槛 / 修习练习度这套**内核账**，不是玩家实际体验。
 *
 * 定种与锚：全链不调 Math.random，同参数逐位可复现；SQ_ANCHOR=1 时把逐月读数行
 *   md5 对表在册锚（末行 marker 不参与哈希）。改锚必须写归因（AGENTS.md §4.42 纪律）。
 * 用法：node .tests/sim-wuxia.cjs            （链内跑，快）
 *       SQ_ANCHOR=1 node .tests/sim-wuxia.cjs（锚对表跑）
 * 输出：逐月读数行 + WUXIA_SIM_ALL_GREEN n/n ‖ 锚对表相同 <md5> / WUXIA_SIM_FAILED n。
 */
'use strict';
const crypto = require('crypto');
const { load } = require('./sandbox.cjs');
const { sandbox } = load([]);
const SQ = sandbox.window.SQ;

const pack = SQ.Worlds.wuxia.pack;
const D = pack.data;
const ANCHOR_ON = process.env.SQ_ANCHOR === '1';
/* 在册锚（册214 首钉 · P1 过渡态）：标准玩家 12 游戏月的逐月读数指纹。
 * 🆕 首钉归因：册214 摘叙事层（advance/卡点投放/墨账/offlineStory 闸退役）⇒ 原 200 章定种面消失，
 *   本件重写为 claim 链定种，锚值 = 重写批首跑实测；三连跑指纹逐位相同自证可复现。
 *   ⚠️ P2 产出重定种后本锚必换（预登记：归因 = 「产出重定种」，别当漂移处理）。 */
const ANCHOR_MD5 = 'd3004be177250dbdcaff7b097e9c5eda';

const fails = [];
function chk(no, cond, detail) {
  const tag = cond ? 'ok' : 'FAIL';
  console.log(`  ${tag} ${no} ${detail || ''}`);
  if (!cond) fails.push(no);
}

/* ── 标准玩家日程：月下标 → 该月期间的总层数拆分 / 累计到访数 / 熟人数 / 刻骨关系 ──
 * 拆分原则（写死，不许随机）：neigong_basic 打够各心境门槛（7 层给绝顶、9 层给大宗师 artsMin），
 * yg_jiuyin（天阶）月 5 起学、月 7 满层（tian_full）；quan_basic 补总层数。
 * 到访 = 13 地全表（见闻 26）；熟人 = 10 位（见闻 +10 = 36 越天人 45 需 bond80 档另一路——
 * 天人门槛 = exp 45 + bond80：13×2 + 10 = 36 不足 45，故天人以「强行冲关定种 stub」验证，
 * 正常破关止步大宗师（exp 32 + tian_full）——这正是「纯挂机能到大宗师、上不去天人」的
 * 数值体感（方案卷 §三 铁律 1 的内核账形态）。 */
const MONTHS = 12;
const ART_PLAN = [
  { layers: { quan_basic: 1, neigong_basic: 1 }, visited: 1, friends: 0 },
  { layers: { quan_basic: 1, neigong_basic: 4 }, visited: 2, friends: 0 },
  { layers: { quan_basic: 2, neigong_basic: 6 }, visited: 4, friends: 0 },
  { layers: { quan_basic: 3, neigong_basic: 7 }, visited: 5, friends: 0 },
  { layers: { quan_basic: 4, neigong_basic: 9, yg_jiuyin: 2 }, visited: 7, friends: 3 },
  { layers: { quan_basic: 6, neigong_basic: 9, yg_jiuyin: 4 }, visited: 9, friends: 6 },
  { layers: { quan_basic: 7, neigong_basic: 9, yg_jiuyin: 9 }, visited: 10, friends: 8 },
  { layers: { quan_basic: 9, neigong_basic: 9, yg_jiuyin: 9 }, visited: 11, friends: 10 },
  { layers: { quan_basic: 9, neigong_basic: 9, yg_jiuyin: 9 }, visited: 12, friends: 10 },
  { layers: { quan_basic: 9, neigong_basic: 9, yg_jiuyin: 9 }, visited: 13, friends: 10 },
  { layers: { quan_basic: 9, neigong_basic: 9, yg_jiuyin: 9 }, visited: 13, friends: 10 },
  { layers: { quan_basic: 9, neigong_basic: 9, yg_jiuyin: 9 }, visited: 13, friends: 10 }
];
/* 关系补点的人物（非同门散人 / 外家门派代表，affinity 30 越过「熟人」线 20；最后一位给刻骨 80 作 bond80 档备件） */
const FRIEND_IDS = ['ling_huohung', 'zhou_botong', 'huang_rong', 'guo_jing', 'yang_guo', 'xiao_feng', 'duan_yu', 'xu_zhu', 'wei_xiaobao', 'zhang_wuji'];
/* 到访序列：13 地 id（ZONES 全表） */
const ZONE_SEQ = (D.ZONES || []).map(function (z) { return z.i; });
const MONTH_MS = 30 * 24 * 60 * 60000;   /* 1 游戏月 = 30 游戏日的挂机时长（claim 口径 = 现实分钟） */

/* ── 跑 12 个月 ─────────────────────────────────────────────────────────────── */
const ws = pack.normalize(pack.initialState());
ws.artsSlots = ['quan_basic', 'neigong_basic', 'yg_jiuyin'];
const monthRows = [];
for (let m = 0; m < MONTHS; m++) {
  /* 月初：标准玩家日程直设（操作循环属 P2，卷首注已记） */
  const plan = ART_PLAN[m];
  ws.artsLevels = Object.assign({}, plan.layers);
  ws.artsKnown = Object.keys(plan.layers);
  ws.visited = ZONE_SEQ.slice(0, plan.visited);
  ws.relations = {};
  for (let f = 0; f < plan.friends; f++) {
    ws.relations[FRIEND_IDS[f]] = { affinity: f === 9 ? 85 : 30, kind: 'friend' };
  }
  const startQi = ws.qi;
  pack.claim(ws, MONTH_MS, 0, {}, {});   /* 一整月的挂机推进（产出/封顶/破关/修习同一份内核） */
  const nx = (D.REALMS || []).find(function (r) { return r.r === ws.realm + 1; });
  monthRows.push({
    m: m + 1,
    realm: ws.realm,
    qi: Math.round(ws.qi * 10) / 10,
    gap: nx ? Math.round((nx.need - ws.qi) * 10) / 10 : 0,
    layers: (function () { let n = 0; for (const k in ws.artsLevels) n += ws.artsLevels[k]; return n; })(),
    gain: Math.round((ws.qi - startQi) * 10) / 10
  });
}

/* 逐月读数行（锚参与哈希的就是这些行） */
for (const r of monthRows) {
  console.log(`月${r.m} 境界=${r.realm} 功力=${r.qi} 距下档=${r.gap} 总层=${r.layers} 月增=${r.gain}`);
}

/* ── 验收断言（P1 内核账结构面；逐月境界行精确值由锚管，断言钉结构不变式）───────── */
/* R1 境界单调不减（封顶可以卡住，但绝不回落） */
let mono = true;
for (let i = 1; i < monthRows.length; i++) if (monthRows[i].realm < monthRows[i - 1].realm) mono = false;
chk('R1', mono, `境界单调不减 ${JSON.stringify(monthRows.map(function (r) { return r.realm; }))}`);
/* R2 三流在头两个月内达成（一档阈值 400：首月产出 ≈ 1.24 功力/分 × 43200 ≈ 5.4 万 ⇒ 秒过） */
chk('R2', monthRows[0].realm >= 1, `首月至少破到三流（实测 ${monthRows[0].realm}）`);
/* R3 天人心境墙：纯挂机 + 常规日程到不了天人（exp 36 < 45——见闻是硬墙，方案卷铁律 1 的内核形态） */
chk('R3', monthRows[MONTHS - 1].realm <= 6, `终月境界 ≤ 大宗师（实测 ${monthRows[MONTHS - 1].realm}；天人需见闻 45，日程上限 36）`);
/* R4 大宗师达成（exp 32 + tian_full 双门槛在日程内可达） */
chk('R4', monthRows[MONTHS - 1].realm >= 6, `终月至少大宗师（实测 ${monthRows[MONTHS - 1].realm}）`);
/* R5 封顶行为：某月功力恰停在下一档 need（capOf 生效）——找第一个「卡满」的月 */
const capped = monthRows.some(function (r, i) {
  const nx2 = (D.REALMS || []).find(function (x) { return x.r === monthRows[i].realm + 1; });
  return nx2 && Math.abs(r.qi - nx2.need) < 0.5;
});
chk('R5', capped, '封顶行为可见（至少一月功力恰停下一档阈值——心境墙顶住）');
/* R6（册218 后由 E20 承接世界事件面——事件参与 exp 直接喂心境线：主导 1+卷入 2 ≈ 90+ 覆盖天人线 45；事件面不进本件定种哈希，改 attendEvent 后复跑 E20 即可） 修习练习度推进了（总层数随月涨到满配 27 = 3 部 × 9） */
chk('R6', monthRows[MONTHS - 1].layers === 27, `终月总层数 27 = 3 部 × 9 层封顶（实测 ${monthRows[MONTHS - 1].layers}）`);

/* ── 锚对表 + 末行 ──────────────────────────────────────────────────────────── */
const lines = [];
for (const r of monthRows) {
  lines.push(`月${r.m} 境界=${r.realm} 功力=${r.qi} 距下档=${r.gap} 总层=${r.layers} 月增=${r.gain}`);
}
const digest = crypto.createHash('md5').update(lines.join('\n'), 'utf8').digest('hex');
if (ANCHOR_ON) {
  if (ANCHOR_MD5 === 'PENDING_P1_FIRST_RUN') {
    console.log(`FAIL 锚对表：ANCHOR_MD5 未钉——首跑 digest = ${digest}，钉进本件并附归因（册214 P1 重写批）`);
    fails.push('anchor');
  } else if (digest !== ANCHOR_MD5) {
    console.log(`FAIL 轨迹锚漂移：本跑 ${digest} ≠ 在册 ${ANCHOR_MD5}。改了产出/门槛/修习类代码？先归因再改锚（P2 重定种时预登记换锚）。`);
    fails.push('anchor');
  } else {
    console.log(`ok 锚对表相同 ${digest}`);
  }
} else {
  console.log(`读数指纹 ${digest}（SQ_ANCHOR=1 可对表在册锚）`);
}

const marker = fails.length
  ? `WUXIA_SIM_FAILED ${fails.length}`
  : `WUXIA_SIM_ALL_GREEN ${6 + 0}/${6 + 0}`;
console.log(marker);
process.exit(fails.length ? 1 : 0);
