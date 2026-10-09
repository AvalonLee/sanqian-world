/* .tests/probe-e1.cjs — E1 遗留复核：坊市天阶功法定价 × 在线收入
 *
 * 背景（奇遇事件池 §十三.2 遗留 · 任务清单批 2/3 前置遗留）：
 *   「天阶功法坊市价 12,000 在换锚后仍只相当于境界 5+ 的十几分钟事件收入，
 *     坊市/功法升级定价需与洞府定价同批复核（洞府定价换锚后已对齐 ≈22 在线小时，坊市未对齐）。」
 *
 * 本探针用真引擎实跑，量化三件事：
 *   ① 天阶功法（obtain.type='shop' 四部）在解锁境界 5 的实际坊市价 = base×(1+realm×0.4)；
 *   ② 同 build 的 1 在线小时收入——刷图（Combat.simulate 3600s）与奇遇（Events.tickOnline 60 步）；
 *   ③ 折算「在线小时」= 坊市价 ÷ 每小时收入；与洞府最贵档（500 万 ≈ 22h @z8）对照。
 * 只读探针，零副作用。用法：node .tests/probe-e1.cjs
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([], { quiet: true });
const pack = SQ.Worlds.xiuxian.pack;
const D = SQ.XDATA;
const T0 = 1800000000000;
const REPEATS = 12;
const ctx = { log: function () {} };

function buildWs(realm, pol) {
  const ws = pack.initialState();
  const profile = {
    name: 'probe', talents: [], worldId: 'xiuxian', worldName: 'w',
    createdAt: T0, alignBias: pol
  };
  ws.realm = realm;
  ws.mode = 'seclude';
  ws.zone = SQ.Combat.maxUnlocked(ws, D);
  ws.stones = 200000 * Math.pow(1 + realm, 3);
  const need = D.REALMS[realm + 1] ? D.REALMS[realm + 1].need : 0;
  ws.qi = Math.min(pack.capOf(ws), need * 0.5);

  const order = { right: ['right', 'neutral', 'evil'], neutral: ['neutral', 'right', 'evil'], evil: ['evil', 'neutral', 'right'] };
  const ids = Object.keys(SQ.XARTS).filter(function (id) {
    const a = SQ.XARTS[id];
    if (((a.reqs && a.reqs.realm) || 0) > realm) return false;
    if (a.obtain && a.obtain.type === 'event_locked') return false;
    if (a.reqs && (a.reqs.attr || a.reqs.karmaMin != null || a.reqs.karmaMax != null)) return false;
    return true;
  });
  ids.sort(function (x, y) {
    const ax = order[pol].indexOf(SQ.XARTS[x].alignment);
    const ay = order[pol].indexOf(SQ.XARTS[y].alignment);
    return (ax - ay) || (SQ.XARTS[y].tier === 'tian' ? 1 : 0) - (SQ.XARTS[x].tier === 'tian' ? 1 : 0);
  });
  const picked = ids.slice(0, D.ARTS_SLOTS);
  ws.artsKnown = picked.slice();
  ws.artsSlots = picked.slice();
  picked.forEach(function (id) { ws.artsLevels[id] = 3; });
  pack.recalcDerived(ws, profile);
  let mods = SQ.Mods.collect(profile, ws, pack, D);
  const tierMin = Math.min(D.GEAR_TIERS.length - 1, Math.floor(realm / 2));
  D.GEAR_SLOTS.forEach(function (slot, i) {
    const align = order[pol][i % order[pol].length];
    let it = SQ.Gear.roll(ws, pack, D, ws.zone, mods, { tierMin: tierMin, slot: slot, align: align, source: { type: 'zone', ref: ws.zone } });
    if (!it || it.slot !== slot) it = SQ.Gear.roll(ws, pack, D, ws.zone, mods, { tierMin: tierMin, slot: slot, align: align, source: { type: 'zone', ref: ws.zone } });
    ws.gear[slot] = it;
  });
  pack.recalcDerived(ws, profile);
  return { ws: ws, profile: profile };
}

/* 简化择支（镜像 sim-event-economy）：优先本阵营分支，缺项则左道，再他阵营 */
function gateOk(chk, ws, mods) {
  const type = chk.type || 'attr';
  if (type === 'attr') return true;
  if (type === 'karma') return (chk.min == null || ws.karma >= chk.min) && (chk.max == null || ws.karma <= chk.max);
  if (type === 'align') return SQ.XKarma.tierOf(ws.karma) === chk.need;
  if (type === 'stones') return ws.stones >= (Array.isArray(chk.cost) ? chk.cost[0] : (chk.cost || 0));
  if (type === 'qi') return ws.qi > 0;
  if (type === 'art') return true;
  if (type === 'gear') return true;
  if (type === 'power') {
    const need = (chk.abs != null) ? chk.abs : D.ZONES[ws.zone].need * (chk.ratio != null ? chk.ratio : 1);
    return SQ.Mods.powerOf(ws, pack, D, mods) >= need;
  }
  return true;
}
function pickBranch(evId, ws, mods, pol) {
  const ev = SQ.Events.findById(pack, evId);
  if (!ev || !ev.choices) return pol;
  const other = ['right', 'evil', 'neutral'].filter(function (k) { return k !== pol && k !== 'neutral'; })[0];
  const pref = [pol, 'neutral', other].filter(function (k, i, a) { return k && a.indexOf(k) === i; });
  for (const k of pref) {
    const br = ev.choices[k];
    if (!br) continue;
    const chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
    if (chks.every(function (c) { return gateOk(c, ws, mods); })) return k;
  }
  return pref.find(function (k) { return ev.choices[k]; }) || pol;
}

function eventHour(realm, pol) {
  const b = buildWs(realm, pol);
  const ws = b.ws, profile = b.profile;
  let stones = 0, fired = 0;
  let now = T0;
  for (let m = 0; m < 60; m++) {
    now += 60000;
    pack.recalcDerived(ws, profile);
    const mods = SQ.Mods.collect(profile, ws, pack, D);
    SQ.Events.tickOnline(ws, pack, D, mods, 60, now, Object.assign({ profile: profile }, ctx));
    if (ws.pendingChoice) {
      const id = ws.pendingChoice.id;
      const bk = pickBranch(id, ws, mods, pol);
      const s0 = ws.stones;
      const res = SQ.Events.resolveBranch(ws, pack, D, mods, id, bk, now, Object.assign({ profile: profile }, ctx));
      if (res) { fired++; stones += ws.stones - s0; }
    }
  }
  return { stones: stones, fired: fired };
}

function farmHour(realm, pol) {
  const b = buildWs(realm, pol);
  pack.recalcDerived(b.ws, b.profile);
  const mods = SQ.Mods.collect(b.profile, b.ws, pack, D);
  const r = SQ.Combat.simulate(b.ws, pack, D, mods, 3600, ctx);
  return { stones: r.stones, kills: r.kills };
}

/* ── 天阶功法坊市价（obtain.type='shop'）── */
const tianShop = Object.keys(SQ.XARTS).filter(function (id) {
  const a = SQ.XARTS[id];
  return a.tier === 'tian' && a.obtain && a.obtain.type === 'shop';
});

function priceAt(base, realm) { return Math.max(1, Math.ceil(base * (1 + realm * D.SHOP_PRICE_REALM))); }
function f1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function f0(n) { return String(Math.round(n)); }

console.log('=== E1 天阶功法坊市价（obtain.type=shop，共 ' + tianShop.length + ' 部）===');
tianShop.forEach(function (id) {
  const a = SQ.XARTS[id];
  console.log('  ' + id + '  base=' + a.obtain.price + '  reqs.realm=' + ((a.reqs && a.reqs.realm) || 0)
    + '  → 价@r0=' + f0(priceAt(a.obtain.price, 0)) + ' @r5=' + f0(priceAt(a.obtain.price, 5))
    + ' @r6=' + f0(priceAt(a.obtain.price, 6)) + ' @r8=' + f0(priceAt(a.obtain.price, 8)));
});

console.log('\n=== 在线收入 × 折算小时（realm 5/6/8，正/左/魔均值，repeats=' + REPEATS + '）===');
console.log('  realm | 刷图灵石/h | 奇遇灵石/h | 奇遇/刷图 | 天阶价@r | 刷图h | 奇遇h');
[5, 6, 8].forEach(function (realm) {
  let farm = 0, ev = 0;
  for (let i = 0; i < REPEATS; i++) {
    ['right', 'neutral', 'evil'].forEach(function (pol) {
      farm += farmHour(realm, pol).stones;
      ev += eventHour(realm, pol).stones;
    });
  }
  const n = REPEATS * 3;
  farm /= n; ev /= n;
  const price = priceAt(12000, realm);   /* 以最高 base 12000 为基准 */
  console.log('  r' + realm + '    | ' + f0(farm) + '        | ' + f0(ev) + '       | '
    + (farm > 0 ? f1(ev / farm * 100) + '%' : '-') + '     | ' + f0(price)
    + '     | ' + f1(price / farm) + '  | ' + f1(price / ev));
});

console.log('\n=== 洞府对照（设计定位：最贵档 500 万 ≈ 22 在线小时 @z8 刷图）===');
let farm8 = 0;
for (let i = 0; i < REPEATS; i++) farm8 += farmHour(8, 'neutral').stones;
farm8 /= REPEATS;
console.log('  z8 刷图/h ≈ ' + f0(farm8) + ' → 500 万折算 ' + f1(5000000 / farm8) + ' h；'
  + '天阶价@r5 ' + f0(priceAt(12000, 5)) + ' 折算 ' + f1(priceAt(12000, 5) / farm8) + ' h(z8 口径)');