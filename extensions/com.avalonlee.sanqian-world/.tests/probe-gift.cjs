/* .tests/probe-gift.cjs — 天降礼包（B16-z）引擎探针（无浏览器依赖）
 *
 * 锁四件事：① 24 条宣传文案全部可解析（name/offer 非空、无占位残留）；
 * ② 扣费类型/档位按序号派生，按**当前值**取整、至少 1、不超过余额；
 * ③ 三种结果分支（低档装备 / 低阶功法 / 空包）各自兑现，且扣费与 Ledger 同源；
 * ④ 余额不足整笔不成交（不扣、不发货）。
 * 用法：node .tests/probe-gift.cjs     末行 PROBE_GIFT_ALL_GREEN n/n 或 PROBE_GIFT_FAILED k
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA, pack = SQ.Worlds.xiuxian.pack;
const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail == null ? '' : String(detail) });
const stubRandom = (v) => { const o = Math.random; Math.random = () => v; return () => { Math.random = o; }; };
const modsOf = (ws) => SQ.Mods.collect({ worldId: 'xiuxian', talents: [] }, ws, pack, D);

/* ① 文案 24 条 */
const N = SQ.Gifts.N;
let badKeys = [];
for (let i = 0; i < N; i++) {
  ['name', 'offer'].forEach((f) => {
    const v = SQ.t('eggs.gift.p' + i + '.' + f, null, 'xiuxian');
    if (typeof v !== 'string' || !v.trim() || /\{|\}|undefined/.test(v)) badKeys.push(i + '.' + f + '=' + v);
  });
}
ok('G0 24 条礼包文案全部可解析（name/offer 非空、无占位残留）', N >= 20 && badKeys.length === 0, 'N=' + N + ' bad=' + badKeys.slice(0, 4).join(','));

/* ② 扣费派生 */
const ws0 = pack.initialState();
ws0.stones = 100000; ws0.qi = 50000;
const cEven = SQ.Gifts.costOf(ws0, 0);
const cOdd = SQ.Gifts.costOf(ws0, 1);
ok('G1 扣费类型交替（偶数条灵石 / 奇数条修为）且按当前值百分比取整',
  cEven.type === 'stones' && cOdd.type === 'qi' &&
  cEven.n === Math.floor(100000 * cEven.pct) && cOdd.n === Math.floor(50000 * cOdd.pct) &&
  cEven.pct >= 0.05 && cEven.pct <= 0.17,
  JSON.stringify({ even: cEven, odd: cOdd }));

/* ③ 三分支 */
function fresh() {
  const ws = pack.initialState();
  ws.stones = 100000; ws.qi = 50000; ws.gearAutoRefine = false;
  return ws;
}
{
  const ws = fresh();
  const out0 = SQ.Ledger.sums(ws);
  const restore = stubRandom(0);       /* <0.35 → 装备 */
  const r = SQ.Gifts.buy(ws, pack, D, modsOf(ws), 0, Date.now(), function () {});
  restore();
  const out1 = SQ.Ledger.sums(ws);
  ok('G2 装备分支：扣灵石 + Ledger(out.event_loss) 同额 + 真给一件低档装备',
    r.ok && r.kind === 'gear' && r.item && r.item.tier === 0 &&
    ws.stones === 100000 - r.cost.n && (out1.out - out0.out) === r.cost.n,
    JSON.stringify({ kind: r.kind, cost: r.cost, left: ws.stones, out: out1.out - out0.out, item: r.item && r.item.tier }));
}
{
  const ws = fresh();
  const restore = stubRandom(0.5);     /* 0.35~0.60 → 功法 */
  const r = SQ.Gifts.buy(ws, pack, D, modsOf(ws), 0, Date.now(), function () {});
  restore();
  ok('G3 功法分支：扣灵石 + 真给一部黄阶功法（已持有或入架）',
    r.ok && r.kind === 'art' && r.art && SQ.Arts.owned(ws, r.art) && pack.artsMap()[r.art].tier === 'huang',
    JSON.stringify({ kind: r.kind, art: r.art, owned: r.art ? SQ.Arts.owned(ws, r.art) : null }));
}
{
  const ws = fresh();
  const before = { gear: JSON.stringify(ws.gear || {}), stash: (ws.stash || []).length, known: (ws.artsKnown || []).length };
  const restore = stubRandom(0.9);     /* ≥0.60 → 空包 */
  const r = SQ.Gifts.buy(ws, pack, D, modsOf(ws), 2, Date.now(), function () {});
  restore();
  const after = { gear: JSON.stringify(ws.gear || {}), stash: (ws.stash || []).length, known: (ws.artsKnown || []).length };
  ok('G4 空包分支：扣费但装备 / 库藏 / 功法一件未增（宣传归宣传，结果如实为空）',
    r.ok && r.kind === 'none' && before.gear === after.gear && before.stash === after.stash && before.known === after.known,
    JSON.stringify({ kind: r.kind, before: before, after: after }));
}
{
  const ws = fresh();
  ws.stones = 0; ws.qi = 0;
  const r0 = SQ.Gifts.buy(ws, pack, D, modsOf(ws), 0, Date.now(), function () {});
  const r1 = SQ.Gifts.buy(ws, pack, D, modsOf(ws), 1, Date.now(), function () {});
  ok('G5 余额不足整笔不成交（灵石 / 修为两路都拒，且不写 Ledger）',
    r0.ok === false && r0.reason === 'poor' && r1.ok === false && r1.reason === 'poor' &&
    ws.stones === 0 && ws.qi === 0,
    JSON.stringify({ r0: r0.reason, r1: r1.reason }));
}

const pass = R.filter((x) => x.ok).length;
R.forEach((x) => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? ' (' + x.detail + ')' : '')));
console.log(pass === R.length ? 'PROBE_GIFT_ALL_GREEN ' + pass + '/' + R.length : 'PROBE_GIFT_FAILED ' + (R.length - pass));
process.exit(pass === R.length ? 0 : 1);
