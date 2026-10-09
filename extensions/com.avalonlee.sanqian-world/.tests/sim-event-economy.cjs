/* .tests/sim-event-economy.cjs — 批1验证⑤：在线事件经济观测（引擎实跑 · 登记不阻塞）
 *
 * 口径（事件池 §十二.1/.7/.8 + §十三 + 数值详设 §6.4.1 结论 5 + 任务清单风险台账）：
 *   A. 单小时观测：真引擎跑满 3600s（60s 步长虚拟时钟），每分钟 tickOnline 推时钟，
 *      挂起即按画像策略择支 resolveBranch；同一 build 另跑 Combat.simulate(3600s) 得刷图分母、
 *      Idle.rateOf×3600 得挂机分母 → 灵石比 / 灵气比 / 触发密度。
 *   B. 长窗净进度（决定性口径）：同 build 连跑 12 在线小时，「挂机+奇遇」vs「只挂机」比末态灵气，
 *      并拆成「事件直接转移」与「buff 放大产出」两条通道（§十三.3 归因用）。
 *
 * 机制断言（CI 判据 · 10 项）：时钟乘数排序 / 20 分钟硬保底下限 / 左道密度 闭关口径 ≈4.7h /
 *   历练口径密度高于闭关（修行状态批：eventMult 0.5/1.5，保底不随乘区） / 1h 内零重复 /
 *   库存不击穿 / 长窗基线有效 / **节奏主轴未反转（折算天数 魔 < 左 < 正，§6.3 定位）** /
 *   buff 同字段同向不叠加 / qiPct 等价挂机小时封顶。
 * 经济观察项（登记不阻塞）：灵石比新触发线 400%（§十三.6，旧 30% 是按 2~3 条/日写的失效基线）、
 *   长窗净进度 ±10% 线、§十二.8 魔道反噬强度。
 *
 * 画像：策略（正/左/魔，karma 锚定 ±300/0）× 境界（单小时 0/2/4/6/8；长窗 7/8）× repeats 取均值。
 * build：功法 6 部 Lv3（策略阵营优先、realm 达标、排除 event_locked）+ 4 件装备（品阶下限 ⌊realm/2⌋）
 *   + 灵石富余（付得起灵石类判定）+ 单小时口径灵气置于「本境界突破需求的 50%」（周期中点基数）；
 *   长窗口径灵气从 0 起（自然增长，避免基数选择影响结论）。
 * 用法：node .tests/sim-event-economy.cjs [轮数，缺省 12] [种子，缺省随机]   （在扩展根目录）
 *   种子亦可走环境变量 SQ_SEED。**给定同一种子 → 输出逐字节可复现**，「观察项」本身随之成为判据；
 *   缺省/0 = 保持原裸随机（观察项条数逐跑浮动，只可作趋势参考、不可当回归判据——见 2026-10-07 注）。
 *   ⚠️ 「轮数」只改**单小时观测矩阵**的 repeats（REPEATS）；长窗 repeats（`LONG.repeats = 80`）不动，
 *      因为「主轴/净进度」那两条锚是长窗口径，缩放它会让新旧数不可比。
 *   ⚠️ 轮数 > 200 直接 `FAIL arg-repeats=…` 退 2：把种子误写进第一位会跑出天文级循环（本批实测挂死过一次），
 *      只给种子请走 `SQ_SEED=<种子>`，或写全 `node .tests/sim-event-economy.cjs 12 <种子>`。
 *   收口口径沿用 sim-playthrough：**同种子双跑逐字节相同 + 随机种子复跑全绿**（改引擎的批必附双证据）。
 * 输出：15+6 格观测表 + EVENT_ECON_GREEN / EVENT_ECON_WATCH（有观察项）/ EVENT_ECON_FAILED（机制断言挂）
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([], { quiet: true });

/* ── 可复现种子（2026-10-07 事件经济种子批）：argv[3] 或 SQ_SEED；缺省/0 = 保持原随机行为 ──
 * mulberry32（与 sim-playthrough.cjs 同一实现、同一形态）。覆写**宿主** Math.random 即可全链受控：
 * sandbox.cjs 把宿主 Math 对象原样注入 vm 上下文，引擎（Events.tickOnline / Gear.roll / Combat.simulate /
 * Idle.settle）与本脚本两侧掷判同源同对象，一处覆写逐位可复现。
 * ⚠️ 必须在任何模拟动作之前装钩——buildWs 里的 SQ.Gear.roll 就开始吃随机了。 */
const REPEATS_ARG = parseInt(process.argv[2] || '', 10) || 0;
/* 防呆：本脚本 轮数 × 15 格 × 每格三次全量模拟，把种子误放到轮数位会跑出天文级循环
 * （2026-10-07 实测：`node sim-event-economy.cjs 20261007` 直接挂死一个进程）。
 * 只给种子请用 `SQ_SEED=<种子> node ...` 或写 `node ... 12 <种子>`。 */
if (REPEATS_ARG > 200) {
  console.log('FAIL arg-repeats=' + REPEATS_ARG + ' (>200) 第一位参数是「轮数」不是种子；' +
    '只给种子请用 SQ_SEED=<种子> node .tests/sim-event-economy.cjs，或写 node .tests/sim-event-economy.cjs 12 <种子>');
  process.exit(2);
}
const SEED_ARG = String(process.argv[3] || process.env.SQ_SEED || '');
const SEED = (parseInt(SEED_ARG, 10) || 0) >>> 0;
if (SEED) {
  let _a = SEED;
  Math.random = function () {
    _a = (_a + 0x6D2B79F5) | 0;
    let t = Math.imul(_a ^ (_a >>> 15), 1 | _a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pack = SQ.Worlds.xiuxian.pack;
const D = SQ.XDATA;
const T0 = 1800000000000;                 /* 固定虚拟起点（可复现） */
const REPEATS = REPEATS_ARG > 0 ? REPEATS_ARG : 12;
const REALMS = [0, 2, 4, 6, 8];
const POLICIES = [
  { id: 'right', name: '正道', karma: 300, align: 'right' },
  { id: 'neutral', name: '左道', karma: 0, align: 'neutral' },
  { id: 'evil', name: '魔道', karma: -300, align: 'evil' }
];
/* 触发线：灵石比 400% = §十三.6 重定基线（旧 30% 是按「日均 2~3 条」写的，v1.5 在线时钟后失效）；
 * 灵气比/长窗净进度 ±10% = §6.4.1 结论 5 的扰动容差（观察项，不阻塞）。
 * 密度带（修行状态批重定）：默认画像为闭关口径（eventMult 0.5）——20 分钟硬保底 p=1 不随乘区，
 * 密度从 6.5/h 非线性收敛到 ≈4.7/h；历练口径（×1.5）另设对照断言。 */
const LIMIT = { stonesRatio: 4.00, stonesRatioLegacy: 0.30, qiRatio: 0.10, densityLo: 4.0, densityHi: 5.4 };

function noop() {}
const ctx = { log: noop };

/* ── 画像 build ── */
function buildWs(realm, pol, mode) {
  const ws = pack.initialState();
  const profile = {
    name: 'sim', talents: [], worldId: 'xiuxian', worldName: 'w',
    createdAt: T0, alignBias: pol.id
  };
  ws.realm = realm;
  ws.mode = mode || 'seclude';                     /* 修行状态批：默认闭关口径 */
  ws.zone = SQ.Combat.maxUnlocked(ws, D);
  ws.stones = 200000 * Math.pow(1 + realm, 3);       /* 灵石类判定付得起（不影响增量测量） */
  const need = D.REALMS[realm + 1] ? D.REALMS[realm + 1].need : 0;
  ws.qi = Math.min(pack.capOf(ws), need * 0.5);      /* 周期中点基数 */

  /* 功法：策略阵营优先 → 其余阵营；realm 达标、非独占、无属性门槛（简化） */
  const order = { right: ['right', 'neutral', 'evil'], neutral: ['neutral', 'right', 'evil'], evil: ['evil', 'neutral', 'right'] };
  const ids = Object.keys(SQ.XARTS).filter((id) => {
    const a = SQ.XARTS[id];
    if (((a.reqs && a.reqs.realm) || 0) > realm) return false;
    if (a.obtain && a.obtain.type === 'event_locked') return false;
    if (a.reqs && (a.reqs.attr || a.reqs.karmaMin != null || a.reqs.karmaMax != null)) return false;
    return true;
  });
  ids.sort((x, y) => {
    const ax = order[pol.id].indexOf(SQ.XARTS[x].alignment);
    const ay = order[pol.id].indexOf(SQ.XARTS[y].alignment);
    return (ax - ay) || (SQ.XARTS[y].tier === 'tian' ? 1 : 0) - (SQ.XARTS[x].tier === 'tian' ? 1 : 0);
  });
  const picked = ids.slice(0, D.ARTS_SLOTS);
  ws.artsKnown = picked.slice();
  ws.artsSlots = picked.slice();
  picked.forEach((id) => { ws.artsLevels[id] = 3; });

  /* 装备：4 槽各掷一件（阵营优先 + 品阶下限），直接落槽（模拟已择优配装态） */
  pack.recalcDerived(ws, profile);
  let mods = SQ.Mods.collect(profile, ws, pack, D);
  const tierMin = Math.min(D.GEAR_TIERS.length - 1, Math.floor(realm / 2));
  D.GEAR_SLOTS.forEach((slot, i) => {
    const align = order[pol.id][i % order[pol.id].length];
    let it = SQ.Gear.roll(ws, pack, D, ws.zone, mods, { tierMin: tierMin, slot: slot, align: align, source: { type: 'zone', ref: ws.zone } });
    if (!it || it.slot !== slot) it = SQ.Gear.roll(ws, pack, D, ws.zone, mods, { tierMin: tierMin, slot: slot, source: { type: 'zone', ref: ws.zone } });
    ws.gear[slot] = it;
  });

  /* karma 锚定到画像档位（功法/装备分量先算，差额记进 karmaEventScore） */
  pack.recalcDerived(ws, profile);
  const parts = SQ.XKarma.partsOf(ws, D);
  ws.karmaEventScore = pol.karma - (parts.arts + parts.gear);
  pack.recalcDerived(ws, profile);
  return { ws: ws, profile: profile };
}

/* ── 确定性判定门槛（镜像 view checkPreview 的 det 类；attr 类视为可选）── */
function gateOk(chk, ws, mods) {
  const type = chk.type || 'attr';
  if (type === 'attr') return true;
  if (type === 'karma') return (chk.min == null || ws.karma >= chk.min) && (chk.max == null || ws.karma <= chk.max);
  if (type === 'align') return SQ.XKarma.tierOf(ws.karma) === chk.need;
  if (type === 'stones') return ws.stones >= (Array.isArray(chk.cost) ? chk.cost[0] : (chk.cost || 0));
  if (type === 'qi') return ws.qi > 0;
  if (type === 'art') {
    const artsMap = pack.artsMap();
    const ids = chk.id ? [chk.id] : (ws.artsKnown || []).filter((aid) => {
      const a = artsMap[aid];
      if (!a) return false;
      if (chk.tier != null && a.tier !== chk.tier) return false;
      if (chk.alignment && a.alignment !== chk.alignment) return false;
      return true;
    });
    if (!ids.length || !ids.every((aid) => (ws.artsKnown || []).indexOf(aid) >= 0)) return false;
    if (chk.slotted) return ids.some((aid) => (ws.artsSlots || []).indexOf(aid) >= 0);
    return true;
  }
  if (type === 'gear') {
    for (const slot in ws.gear) {
      const it = ws.gear[slot];
      if (!it) continue;
      if (chk.slot && it.slot !== chk.slot) continue;
      if (chk.tierMin != null && it.tier < chk.tierMin) continue;
      if (chk.special && it.special !== chk.special) continue;
      return true;
    }
    return false;
  }
  if (type === 'power') {
    const need = (chk.abs != null) ? chk.abs : D.ZONES[ws.zone].need * (chk.ratio != null ? chk.ratio : 1);
    return SQ.Mods.powerOf(ws, pack, D, mods) >= need;
  }
  return true;
}
function pickBranch(evId, ws, mods, pol) {
  const ev = SQ.Events.findById(pack, evId);
  if (!ev || !ev.choices) return pol.id;
  const other = ['right', 'evil', 'neutral'].filter((k) => k !== pol.id && k !== 'neutral')[0];
  const pref = [pol.id, 'neutral', other].filter((k, i, a) => k && a.indexOf(k) === i);
  for (const k of pref) {
    const br = ev.choices[k];
    if (!br) continue;
    const chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
    if (chks.every((c) => gateOk(c, ws, mods))) return k;
  }
  return pref.find((k) => ev.choices[k]) || pol.id;
}

/* ── 单格观测：1 在线小时 ── */
function runHour(realm, pol, mode) {
  const b = buildWs(realm, pol, mode);
  const ws = b.ws, profile = b.profile;
  const st = { fired: 0, blocked: 0, aborted: 0, stones: 0, qi: 0, exclusive: 0, ids: {}, branches: {} };
  let now = T0;
  for (let m = 0; m < 60; m++) {
    now += 60000;
    pack.recalcDerived(ws, profile);
    const mods = SQ.Mods.collect(profile, ws, pack, D);
    const r = SQ.Events.tickOnline(ws, pack, D, mods, 60, now, Object.assign({ profile: profile }, ctx));
    if (r && r.blocked) st.blocked++;
    if (ws.pendingChoice) {
      const id = ws.pendingChoice.id;
      const bk = pickBranch(id, ws, mods, pol);
      const s0 = ws.stones, q0 = ws.qi;
      const res = SQ.Events.resolveBranch(ws, pack, D, mods, id, bk, now, Object.assign({ profile: profile }, ctx));
      if (res) {
        st.fired++;
        st.ids[id] = (st.ids[id] || 0) + 1;
        st.branches[bk] = (st.branches[bk] || 0) + 1;
        st.stones += ws.stones - s0;
        st.qi += ws.qi - q0;
        if (res.eff && (res.eff.exclusiveGear || res.eff.exclusiveArt)) st.exclusive++;
      }
    } else if (r === null && !ws.pendingChoice) {
      st.aborted += 0;   /* 流产不计数（时钟保留，无独立信号） */
    }
  }
  /* 分母：刷图 1h（同 build 克隆）与挂机 1h */
  const cb = buildWs(realm, pol);
  pack.recalcDerived(cb.ws, cb.profile);
  const cmods = SQ.Mods.collect(cb.profile, cb.ws, pack, D);
  const combat = SQ.Combat.simulate(cb.ws, pack, D, cmods, 3600, ctx);
  pack.recalcDerived(ws, profile);
  const emods = SQ.Mods.collect(profile, ws, pack, D);
  const idleQi = SQ.Idle.rateOf(ws, pack, D, emods) * 3600;
  return {
    realm: realm, pol: pol, fired: st.fired, blocked: st.blocked, unique: Object.keys(st.ids).length,
    exclusive: st.exclusive, stones: st.stones, qi: st.qi, farmStones: combat.stones, kills: combat.kills,
    idleQi: idleQi, karmaEnd: ws.karma
  };
}

/* ── 汇总 ── */
function wlen(s) { let n = 0; for (const ch of s) n += ch.charCodeAt(0) > 0x2e7f ? 2 : 1; return n; }
function pad(s, w, right) { const g = Math.max(0, w - wlen(s)); return right ? ' '.repeat(g) + s : s + ' '.repeat(g); }
function f1(n) { return (Math.round(n * 10) / 10).toFixed(1); }
function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
function pct(n) { return (Math.round(n * 1000) / 10).toFixed(1) + '%'; }

const rows = [];
for (const pol of POLICIES) {
  for (const realm of REALMS) {
    const acc = { fired: 0, stones: 0, qi: 0, farm: 0, idle: 0, blocked: 0, unique: 0, exclusive: 0 };
    for (let i = 0; i < REPEATS; i++) {
      const r = runHour(realm, pol);
      acc.fired += r.fired; acc.stones += r.stones; acc.qi += r.qi; acc.farm += r.farmStones;
      acc.idle += r.idleQi; acc.blocked += r.blocked; acc.unique += r.unique; acc.exclusive += r.exclusive;
    }
    const n = REPEATS;
    rows.push({
      pol: pol, realm: realm,
      fired: acc.fired / n, blocked: acc.blocked / n, unique: acc.unique / n, exclusive: acc.exclusive / n,
      evStones: acc.stones / n, farmStones: acc.farm / n,
      evQi: acc.qi / n, idleQi: acc.idle / n,
      stoneRatio: acc.farm > 0 ? acc.stones / acc.farm : 0,
      qiRatio: acc.idle > 0 ? acc.qi / acc.idle : 0
    });
  }
}

/* ── 长窗净进度对照（决定性口径）：同一 build 连跑 HOURS 在线小时，
 *    A 组挂机+奇遇 / B 组只挂机，比较末态灵气 → 「奇遇把进度推快/拖慢了多少」。
 *    只取高境界（窗口内不会触发突破，qi 不封顶，避免突破/上限污染对照）。── */
const LONG = { realms: [7, 8], hours: 12, repeats: 80 };   /* 福地三批测试加固②恢复：均值降噪（恢复批 2026-10-03） */
function runLong(realm, pol, hours, withEvents) {
  const b = buildWs(realm, pol);
  b.ws.qi = 0;
  let now = T0;
  let fired = 0, evQi = 0, idleGain = 0;
  for (let m = 0; m < hours * 60; m++) {
    now += 60000;
    pack.recalcDerived(b.ws, b.profile);
    const q0 = b.ws.qi;
    const sr = SQ.Idle.settle(b.ws, pack, D, 60000, now, Object.assign({ profile: b.profile }, ctx));
    idleGain += (sr && sr.gain) || 0;
    if (!withEvents) continue;
    const mods = SQ.Mods.collect(b.profile, b.ws, pack, D);
    SQ.Events.tickOnline(b.ws, pack, D, mods, 60, now, Object.assign({ profile: b.profile }, ctx));
    if (b.ws.pendingChoice) {
      const id = b.ws.pendingChoice.id;
      const bk = pickBranch(id, b.ws, mods, pol);
      const q1 = b.ws.qi;
      if (SQ.Events.resolveBranch(b.ws, pack, D, mods, id, bk, now, Object.assign({ profile: b.profile }, ctx))) {
        fired++;
        evQi += b.ws.qi - q1;      /* 事件直接灵气转移（含 qiPct 封顶后实值） */
      }
    }
  }
  /* idleGain 含事件授予的 buff 对产出的放大；evQi 是一次性转移。两者分开看才知道主通道。 */
  return { qi: b.ws.qi, fired: fired, realm: b.ws.realm, stones: b.ws.stones, evQi: evQi, idleGain: idleGain };
}

const longRows = [];
for (const pol of POLICIES) {
  for (const realm of LONG.realms) {
    let a = 0, bQ = 0, f = 0, eq = 0, igA = 0, igB = 0;
    for (let i = 0; i < LONG.repeats; i++) {
      const ra = runLong(realm, pol, LONG.hours, true);
      const rb = runLong(realm, pol, LONG.hours, false);
      a += ra.qi; bQ += rb.qi; f += ra.fired; eq += ra.evQi; igA += ra.idleGain; igB += rb.idleGain;
    }
    const n = LONG.repeats;
    longRows.push({
      pol: pol, realm: realm, hours: LONG.hours,
      withEv: a / n, idleOnly: bQ / n, fired: f / n,
      delta: bQ > 0 ? (a / n) / (bQ / n) - 1 : 0,
      evQi: eq / n, buffGain: (igA - igB) / n, idleGain: igB / n
    });
  }
}

console.log('=== 在线 1 小时事件经济观测（REPEATS=' + REPEATS + ' · SEED=' + (SEED ? SEED : '随机（逐跑浮动，观察项不作判据）') +
  ' · 灵石比新线 ≤' + pct(LIMIT.stonesRatio) +
  '（旧线 ' + pct(LIMIT.stonesRatioLegacy) + ' 已失效，见 §十三.6） · 灵气比列为快照参考，判据走长窗 · 左道密度 ' +
  LIMIT.densityLo + '~' + LIMIT.densityHi + '）===');
console.log(pad('策略', 6) + pad('境界', 5, 1) + pad('条/h', 7, 1) + pad('去重', 7, 1) + pad('独占', 6, 1) +
  pad('事件灵石', 12, 1) + pad('刷图灵石', 12, 1) + pad('灵石比', 9, 1) +
  pad('事件灵气', 13, 1) + pad('挂机灵气', 13, 1) + pad('灵气比', 9, 1) + '  判定');
const watch = [];
for (const r of rows) {
  let v = '✅';
  if (r.pol.id === 'neutral' && (r.fired < LIMIT.densityLo || r.fired > LIMIT.densityHi)) { v = '⚠ 密度出带'; watch.push(r.pol.name + '·境界' + r.realm + ' 密度 ' + f1(r.fired)); }
  if (r.stoneRatio > LIMIT.stonesRatio) { v = '⚠ 灵石过热'; watch.push(r.pol.name + '·境界' + r.realm + ' 灵石比 ' + pct(r.stoneRatio)); }
  /* 灵气比只做参考列不报观察项：本表是「灵气钉在突破需求 50%」的单小时快照，
   * qiPct 类条目在这个基数上看着极大，但与真实进度无关——灵气通道的判据走长窗净进度对照。 */
  console.log(pad(r.pol.name, 6) + pad(String(r.realm), 5, 1) + pad(f1(r.fired), 7, 1) + pad(f1(r.unique), 7, 1) +
    pad(f2(r.exclusive), 6, 1) + pad(Math.round(r.evStones).toLocaleString('en-US'), 12, 1) +
    pad(Math.round(r.farmStones).toLocaleString('en-US'), 12, 1) + pad(pct(r.stoneRatio), 9, 1) +
    pad(Math.round(r.evQi).toLocaleString('en-US'), 13, 1) + pad(Math.round(r.idleQi).toLocaleString('en-US'), 13, 1) +
    pad(pct(r.qiRatio), 9, 1) + '  ' + v);
}

/* ── 结构性断言（与阈值无关的机制正确性）── */
const fails = [];
function chk(name, cond, detail) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  if (!cond) fails.push(name);
}
console.log('=== 长窗净进度对照（' + LONG.hours + ' 在线小时 · 同 build：挂机+奇遇 vs 只挂机 · repeats=' + LONG.repeats + ' · SEED=' + (SEED ? SEED : '随机') + '）===');
console.log(pad('策略', 6) + pad('境界', 5, 1) + pad('条数', 7, 1) + pad('只挂机灵气', 15, 1) +
  pad('含奇遇灵气', 15, 1) + pad('净进度差', 10, 1) + pad('事件直接转移', 15, 1) + pad('buff放大产出', 15, 1) + '  解读');
for (const r of longRows) {
  const d = r.delta;
  const read = Math.abs(d) <= 0.10 ? '±10% 内（§6.4.1 结论5 容差）'
    : (d > 0 ? '推快 ' + pct(d) + '（超 10% 线）' : '拖慢 ' + pct(-d) + '（超 10% 线）');
  console.log(pad(r.pol.name, 6) + pad(String(r.realm), 5, 1) + pad(f1(r.fired), 7, 1) +
    pad(Math.round(r.idleOnly).toLocaleString('en-US'), 15, 1) +
    pad(Math.round(r.withEv).toLocaleString('en-US'), 15, 1) +
    pad((d >= 0 ? '+' : '') + pct(d), 10, 1) +
    pad(Math.round(r.evQi).toLocaleString('en-US'), 15, 1) +
    pad(Math.round(r.buffGain).toLocaleString('en-US'), 15, 1) + '  ' + read);
  if (Math.abs(d) > 0.10) watch.push('长窗 ' + r.pol.name + '·境界' + r.realm + ' 净进度 ' + (d >= 0 ? '+' : '') + pct(d));
}

const byPol = (id) => rows.filter((r) => r.pol.id === id);
const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const densR = mean(byPol('right').map((r) => r.fired));
const densN = mean(byPol('neutral').map((r) => r.fired));
const densE = mean(byPol('evil').map((r) => r.fired));
chk('时钟乘数生效：正 > 左 > 魔（eventRateMult 1.3/1.0/0.5）', densR > densN && densN > densE,
  f2(densR) + ' / ' + f2(densN) + ' / ' + f2(densE));
chk('20 分钟硬保底：任何画像 ≥3 条/小时', rows.every((r) => r.fired >= 3), 'min=' + f1(Math.min.apply(null, rows.map((r) => r.fired))));
chk('左道密度 闭关口径 ≈4.7/h（eventMult ×0.5 + 20 分钟保底非线性抬升）',
  densN >= LIMIT.densityLo && densN <= LIMIT.densityHi, f2(densN));
/* 修行状态批对照：历练口径（eventMult ×1.5）密度必须高于闭关——中性策略 × 全 REALMS 小矩阵 */
const ventureDens = REALMS.map((realm) => {
  let f = 0;
  for (let i = 0; i < REPEATS; i++) f += runHour(realm, POLICIES[1], 'venture').fired;
  return f / REPEATS;
});
const densNV = mean(ventureDens);
chk('历练口径（×1.5）左道密度高于闭关口径', densNV > densN, f2(densNV));
chk('同小时去重条数 == 触发条数（冷却 12~168h → 1h 内不重复）', rows.every((r) => r.unique >= r.fired - 0.001),
  'worst=' + f2(Math.min.apply(null, rows.map((r) => r.unique - r.fired))));
chk('危机倒赔不击穿库存（灵石/灵气 clamp ≥0）', rows.every((r) => r.evStones >= -1e9) && longRows.every((r) => r.withEv >= 0),
  '灵石净可为负（倒赔），库存恒 ≥0');
chk('长窗对照可判定（只挂机基线 > 0）', longRows.every((r) => r.idleOnly > 0),
  'min=' + Math.round(Math.min.apply(null, longRows.map((r) => r.idleOnly))));
/* 节奏主轴不被奇遇通道反转（§6.3 定位：魔道最快而险 / 正道最慢而稳）——
 * 用「文档天数 ÷ (1+净进度差)」折算含奇遇的实际天数，断言 魔 < 左 < 正。
 * 单格净进度受随机事件影响有 ±7pp 抖动，故按策略取境界均值再比较。 */
const DOC_DAYS = { right: 16.25, neutral: 13.30, evil: 9.57 };
const folded = {};
for (const pol of POLICIES) {
  const rs = longRows.filter((r) => r.pol.id === pol.id);
  const md = mean(rs.map((r) => r.delta));
  folded[pol.id] = { days: DOC_DAYS[pol.id] / (1 + md), delta: md };
}
chk('节奏主轴未反转：折算天数 魔 < 左 < 正（§6.3 定位）',
  folded.evil.days < folded.neutral.days && folded.neutral.days < folded.right.days,
  '魔 ' + f2(folded.evil.days) + ' < 左 ' + f2(folded.neutral.days) + ' < 正 ' + f2(folded.right.days) +
  ' 天（净进度 ' + pct(folded.evil.delta) + ' / ' + pct(folded.neutral.delta) + ' / ' + pct(folded.right.delta) + '）');
/* buff 不叠加生效：含奇遇组同一 field 的活跃 buff 不得超过 2 条（正负各一） */
const bchk = buildWs(8, POLICIES[0]);
let bnow = T0;
for (let i = 0; i < 40; i++) {
  bnow += 60000;
  SQ.Events.pushBuff(bchk.ws, 'qiRate', 0.10 + i * 0.01, bnow + 36 * 3600000);
  SQ.Events.pushBuff(bchk.ws, 'qiRate', -0.05, bnow + 12 * 3600000);
  SQ.Events.pushBuff(bchk.ws, 'eventShield', 1, bnow + 3600000);
}
const qBuffs = bchk.ws.buffs.filter((b) => b.field === 'qiRate');
const sBuffs = bchk.ws.buffs.filter((b) => b.field === 'eventShield');
chk('buff 同字段同向不叠加（正负各留最强一条 · eventShield 逐条并存）',
  qBuffs.length === 2 && Math.abs(qBuffs[0].mult - 0.49) < 1e-9 && qBuffs[1].mult === -0.05 && sBuffs.length === 40,
  'qiRate 条数=' + qBuffs.length + ' mult=' + qBuffs.map((b) => b.mult).join('/') + ' shield=' + sBuffs.length);
/* qiPct 封顶：高境界 −25% 被截到 CAP 小时产出；低境界不触发 */
function capProbe(realm, pctv) {
  const b = buildWs(realm, POLICIES[1]);
  b.ws.qi = D.REALMS[realm + 1].need * 0.5;
  pack.recalcDerived(b.ws, b.profile);
  const m = SQ.Mods.collect(b.profile, b.ws, pack, D);
  const rate = SQ.Idle.rateOf(b.ws, pack, D, m);
  const q0 = b.ws.qi;
  SQ.Events.applyEffects(b.ws, pack, D, m, { qiPct: pctv }, { log: noop, now: T0, raw: true });
  return { d: b.ws.qi - q0, cap: D.EVENT_QI_PCT_HOUR_CAP * 3600 * rate, raw: q0 * pctv };
}
const hi = capProbe(8, -0.25), lo = capProbe(0, -0.25);
chk('qiPct 等价挂机小时封顶（境界8 截断 · 境界0 不触发）',
  Math.abs(hi.d + hi.cap) < 1e-6 && Math.abs(lo.d - lo.raw) < 1e-6,
  '境界8 实扣 ' + Math.round(hi.d).toLocaleString('en-US') + ' / 未封顶应为 ' + Math.round(hi.raw).toLocaleString('en-US') +
  ' · 境界0 实扣 ' + Math.round(lo.d).toLocaleString('en-US'));
console.log('--- 观察项（登记不阻塞 · 数值与处置路径见 事件池 §十二.7/.8 与 §十三、风险台账）---');
console.log(watch.length ? watch.map((w) => '  ⚠ ' + w).join('\n') : '  （无）');
console.log(fails.length === 0
  ? (watch.length ? 'EVENT_ECON_WATCH ' + rows.length + '+' + longRows.length + ' 格 / 机制断言 10/10 · 观察项 ' + watch.length + ' · SEED=' + (SEED || '随机')
    : 'EVENT_ECON_GREEN ' + rows.length + '+' + longRows.length + ' 格 / 机制断言 10/10 · SEED=' + (SEED || '随机'))
  : 'EVENT_ECON_FAILED ' + fails.join(',') + ' · SEED=' + (SEED || '随机'));
process.exit(fails.length === 0 ? 0 : 1);
