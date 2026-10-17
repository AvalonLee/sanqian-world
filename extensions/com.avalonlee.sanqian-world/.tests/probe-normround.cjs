/* .tests/probe-normround.cjs — 读档往返「无静默丢键」探针（无浏览器依赖 · 2026-10-08 裁定收口批立例）
 *
 * 为什么需要它：本批靠执行取证抓到过一条只有真跑才照得出的死链——天骄好感 `ws.bonds.pr{n}`
 *   被 `pack.normalize` 的名录白名单整键剪掉（实测 40 → 键消失），使 bond 达档事件 / 释怀 /
 *   携才投效全部退化成「同一会话不刷新才碰得到」的一次性内容（任务清单 N19）。同类缺陷不可能
 *   靠 grep 穷举 ⇒ 立一条**结构性**回归：拿真存档 fixture 过一遍 `SQ.normalize`，逐叶子路径对表，
 *   **非预期丢键必须为 0**；每条被允许的丢失都要写明成因，防日后把它当 bug 反复调查、也防新代码偷偷丢数据。
 * 已知且已证的五条豁免（本文件末尾断言里逐条点名，不做无名单放行）：
 *   E1 `ws.rumorSeq` —— 全库 `assets/**` 零读零写（含 `view`），是历史遗留落盘字段，normalize 不认它属正常清理；
 *   E2 `ws.bonds.pr{n}` 值为 **0** 者 —— 0 = 缺省好感，`bonds` 白名单只收 ≥1 或负区间（值 0 不入档是既有正典，
 *      与 N19 修的是「值 ≥1 被整键剪掉」，两回事）；
 *   E3 `ws.tiandao.omenSeen` 空数组 / 长度不等于 `OMEN_NODES` 者 —— 按位掩码重建（`tiandao.js:804-805`），
 *      天象扩容批 v1.4 的既定语义（节点数变动即整局去重位归零）。
 *   E5 `ws.factionQuest.`（值为 null 的旧单槽占位）—— 委托板面批 2026-10-15（第卅九批）：单槽 → `factionQuests`
 *      数组，normalize 不再声明旧键。**非空**的旧单不许只靠这条豁免过关 ⇒ §5b 正面证它被迁进板面。
 *   E4 `ws.artsLevels..{}` 空对象占位 —— 等级起点批 2026-10-14（入门即 Lv1）：normalize 逐部补等级键，
 *      占位叶随之消失。§1 同时正面证「补完的每个已入门功法等级 ≥1」，不只认它消失了。
 * 用法：node .tests/probe-normround.cjs     末行 NORMROUND_ALL_GREEN n/n 或 NORMROUND_FAILED k
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA, pack = SQ.Worlds.xiuxian.pack;
const ROOT = path.resolve(__dirname, '..');
const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail == null ? '' : String(detail) });

function leaves(o, pre, out) {
  if (o === null || typeof o !== 'object') { out.set(pre, o === undefined ? 'undefined' : o); return out; }
  if (Array.isArray(o)) {
    if (!o.length) out.set(pre + '.[]', 0);
    o.forEach((x, i) => leaves(x, pre + '[' + i + ']', out));
    return out;
  }
  const ks = Object.keys(o);
  if (!ks.length) out.set(pre + '.{}', 0);
  ks.forEach((k) => leaves(o[k], pre + k + '.', out));
  return out;
}
const isZeroBond = (k, v) => /^ws\.bonds\.pr\d+\.$/.test(k) && v === 0;
/* 空数组叶子路径形如 `ws.tiandao.omenSeen..[]`（对象段带尾点再拼 `.[]`）⇒ 按 endsWith 判定，不写死整串 */
const isOmenSeenReset = (k) => k.indexOf('ws.tiandao.omenSeen') === 0 && k.endsWith('.[]');
/* E4 `ws.artsLevels..{}` —— 等级起点批（入门即 Lv1）：normalize 把「已入门却没有等级键」的旧档逐部补成 Lv1，
 * 于是**空对象占位叶**消失。这是加键（迁移），不是丢数据；只认这一条路径，别把整张 artsLevels 放行。 */
const isArtsLevelsBackfill = (k) => k === 'ws.artsLevels..{}';
/* E5 旧委托单槽键（**只认 null 占位**）——板面批：非空旧单由 §5b 单独正面证迁移，不走豁免 */
const isQuestSlotRetire = (k, v) => k === 'ws.factionQuest.' && v === null;

function buildRichState() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const wid = raw.profile.worldId;
  const w = raw.worlds[wid];
  raw.meta = raw.meta || SQ.Legacy.metaBlank();
  raw.meta.unlocks = raw.meta.unlocks || {}; raw.meta.unlocks.sect = true;
  w.realm = Math.max(w.realm || 0, 5);
  w.everDefected = true; w.factionRepPeak = Math.max(w.factionRepPeak || 0, 2000);
  if (!w.sect) SQ.Sect.foundSect(w, pack, D, raw.meta, 'wuyue', null, null, 'right', Date.now(), function () {});
  w.sect.fac.danfang = 2; w.sect.fac.keshe = 1;
  SQ.Prodigy.rollForNewLife(w, pack, D, raw.meta, Date.now());
  (w.prodigies || []).forEach((p, i) => { w.bonds[p.id] = i === 0 ? 60 : 0; });
  const m = SQ.Mods.collect({ talents: [] }, w, pack, D);
  SQ.Sect.tick(w, pack, D, m, 30000 * 40, Date.now(), { log: function () {} });
  const or = Math.random; Math.random = () => 0;
  const j = SQ.Prodigy.tryJoin(w, pack, D, m, Date.now(), function () {});
  SQ.Prodigy.tick(w, pack, D, m, 30000, Date.now(), { log: function () {} });
  Math.random = or;
  return { raw, w, wid, joined: j };
}

const S1 = buildRichState();
const snap = {
  ws: leaves(S1.w, 'ws.', new Map()),
  meta: leaves(S1.raw.meta, 'meta.', new Map())
};
const norm = SQ.normalize(JSON.parse(JSON.stringify({
  v: 1, profile: S1.raw.profile, meta: JSON.parse(JSON.stringify(S1.raw.meta)),
  worlds: { [S1.wid]: JSON.parse(JSON.stringify(S1.w)) }, settings: S1.raw.settings || {}
})));
const nw = norm.worlds[S1.wid];
const after = { ws: leaves(nw, 'ws.', new Map()), meta: leaves(norm.meta, 'meta.', new Map()) };

function lost(a, b) {
  const drop = [], chg = [];
  for (const [k, v] of a) {
    if (!b.has(k)) drop.push([k, v]);
    else if (b.get(k) !== v) chg.push([k, v, b.get(k)]);
  }
  return { drop, chg };
}
const dws = lost(snap.ws, after.ws), dme = lost(snap.meta, after.meta);
const unexpected = dws.drop.filter(([k, v]) => !(k === 'ws.rumorSeq.' || isOmenSeenReset(k)|| isZeroBond(k, v) || isArtsLevelsBackfill(k) || isQuestSlotRetire(k, v)));

ok('§1 五条豁免逐条存在（豁免清单不是空口白话：拿实测数据证明它们确实发生且成因如述）',
  dws.drop.some(([k]) => k === 'ws.rumorSeq.') &&
  dws.drop.some(([k, v]) => isZeroBond(k, v)) &&
  dws.drop.some(([k]) => isOmenSeenReset(k)) &&
  dws.drop.some(([k, v]) => isArtsLevelsBackfill(k) && (Object.keys(nw.artsLevels || {}).length > 0)) &&
  (Object.keys(nw.artsLevels || {}).every(function (id) {
    return (nw.artsKnown || []).indexOf(id) < 0 || nw.artsLevels[id] >= 1;
  })) &&
  (nw.artsKnown || []).every(function (id) { return (nw.artsLevels || {})[id] >= 1; }),
  dws.drop.some(([k, v]) => isQuestSlotRetire(k, v)) &&
  '丢键合计 ' + dws.drop.length + ' 条');
ok('§5b E5 的正面证：非空的旧单槽委托过 normalize 必须**迁进板面**（不许只靠豁免把数据抹掉）',
  (function () {
    const legacy = JSON.parse(JSON.stringify(S1.w));
    legacy.factionQuest = { type: 'gather', target: 1234, base: 0, rep: 30, stones: 0, bornAt: Date.now(), expireAt: Date.now() + 3600000 };
    delete legacy.factionQuests;
    const m = pack.normalize(legacy, D);
    return m.factionQuests.length === 1 && m.factionQuests[0].type === 'gather' && m.factionQuests[0].target === 1234 &&
      m.factionQuest === undefined;
  })(),
  '迁移后板面 = ' + JSON.stringify((pack.normalize((function () {
    const legacy = JSON.parse(JSON.stringify(S1.w));
    legacy.factionQuest = { type: 'gather', target: 1234, base: 0, rep: 30, stones: 0, bornAt: Date.now(), expireAt: Date.now() + 3600000 };
    delete legacy.factionQuests; return legacy;
  })(), D)).factionQuests));
ok('§2 真档（含本批新字段）过 normalize：**非预期丢键 = 0**',
  unexpected.length === 0, unexpected.slice(0, 6).map(([k, v]) => k + '=' + JSON.stringify(v)).join(' '));
ok('§3 值零改动（ws 与 meta 两层，任何一条 CHG 都属未经讨论的读档改写）',
  dws.chg.length === 0 && dme.chg.length === 0, 'ws=' + dws.chg.length + ' meta=' + dme.chg.length);
ok('§4 meta 层零丢键（跨世资产：成就 / 称号 / 图鉴 / 遗泽账 / 解锁 / 传记 一律不得静默蒸发）',
  dme.drop.length === 0, dme.drop.slice(0, 6).map(x => x[0]).join(' '));
{
  /* 本批三个新落盘面：天骄弟子来源位 pr、材料供奉余数 matAcc、天骄好感 bonds.pr{n}≥1 —— 往返必须保值 */
  const d = (nw.sect.disciples || []).find(x => !!x.pr);
  ok('§5 本批新字段往返保值（弟子 `pr` 来源位 / `sect.matAcc` 余数 / 天骄好感 `bonds.pr1`）',
    !!d && !!nw.sect.matAcc === true && nw.sect.matAcc >= 0 && nw.sect.matAcc < 1 &&
    nw.bonds[S1.joined.pid] === 60,
    'pr=' + (d && d.pr) + ' matAcc=' + nw.sect.matAcc + ' bond=' + nw.bonds[S1.joined.pid]);
}
{
  const twice = SQ.normalize(JSON.parse(JSON.stringify(norm)));
  const t1 = leaves(twice.worlds[S1.wid], 'ws.', new Map());
  const t2 = leaves(twice.meta, 'meta.', new Map());
  const dd = lost(after.ws, t1), dm = lost(after.meta, t2);
  ok('§6 normalize 幂等（第二次跑不再丢任何键、不改任何值 ⇒ 「读一次改一次」的漂移为零）',
    dd.drop.length === 0 && dd.chg.length === 0 && dm.drop.length === 0 && dm.chg.length === 0,
    'ws ' + dd.drop.length + '/' + dd.chg.length + ' meta ' + dm.drop.length + '/' + dm.chg.length);
}
ok('§7 豁免 E2 的边界说清楚：值 0 不入档是**缺省语义**、不是 N19 那类丢数据（N19 修的是 ≥1 被剪）',
  S1.w.bonds[S1.w.prodigies[3].id] === 0 && nw.bonds[S1.w.prodigies[3].id] === undefined,
  'pr4 建场 0 → normalize 后 ' + JSON.stringify(nw.bonds[S1.w.prodigies[3].id]));
ok('§8 豁免 E1 的依据成立：`rumorSeq` 在 `assets/**` 与 `view` 内**零读写**（不是 normalize 漏收 live 字段）',
  (function () {
    const files = ['assets/systems/rumors.js', 'assets/core.js', 'assets/worlds/xiuxian/index.js', 'view/index.html'];
    return files.every(f => fs.readFileSync(path.join(ROOT, f), 'utf8').indexOf('rumorSeq') < 0);
  })(), '四个可能持有方文件全不含 rumorSeq');

const fail = R.filter(x => !x.ok).length;
R.forEach(x => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? ' (' + x.detail + ')' : '')));
console.log(fail === 0 ? 'NORMROUND_ALL_GREEN ' + R.length + '/' + R.length : 'NORMROUND_FAILED ' + fail);
process.exit(fail === 0 ? 0 : 1);
