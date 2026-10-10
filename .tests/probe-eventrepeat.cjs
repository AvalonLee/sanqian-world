/* .tests/probe-eventrepeat.cjs — 第十一路常驻探针（2026-10-09 存档水位与奇遇重复率批立）
 *
 * 要回答的问题：**玩家在奇遇页上实际看到的重复率是多少**，用来判「奇遇内容池该不该扩」。
 * 为什么以前答不了：
 *   ① `sim-playthrough` 里的「重复次数」是「同一 id 被 resolve 了几次」的累计数，
 *      它既不是窗口口径（玩家只看得到最近 50 条叙事流），也不带冷却合规检查；
 *   ② `probe-savegrowth` 造流用的是 `ids[i % ids.length]` **轮转**取 id，
 *      那是为了给落盘造体量，天然不可能测出重复率（每 124 次才重一次，恒等于池规模）。
 * 本探针走**生产抽取路径**：`SQ.Events.tickOnline`（分钟段 + 保底曲线 + 传闻预留排除 + 空池降阶回退）
 *   → `SQ.Events.fire`（品阶/性质两级抽取 + `buildPool` 权重抽样 + **写 eventCooldowns**）
 *   → `SQ.Events.resolveBranch`（玩家点分支的同一条结算口），
 *   一个游戏分钟一步、固定种子 ⇒ 结果可复算。
 * ⚠️ 建场踩过的两个坑（留档，防下一位再踩）：
 *   ① 结算**不能**走 `SQ.Actions.resolveChoice` —— 那条口内部是 `SQ.mutate(ref, fn)` = 先从存储读档再改，
 *      探针的建场与冻结时钟只活在内存里，用 mutate 会把刚推进的 `eventClock` / `pendingChoice` 整批丢掉
 *      （实测 12000 步只出 1 次事件，且 `resolveChoice` 抛「Cannot read properties of undefined」）；
 *      `Events.fire` 内的冷却写点不经 mutate，冷却合规判据不受影响。
 *   ② `ws.mode` 的合法值是 `D.MODES` 的键（`seclude` / `venture`），**没有 'explore'**；
 *      本探针取 `venture`（eventMult 1.5，密度最高的一档，最能暴露重复）。
 *
 * 判据分两类（🆕 神秘商人节律批 2026-10-10：硬判据 7 → **8** 条，新增 §8「单条最频份额 ≤ 8%」；
 *   本节立探针时的原始病灶——`mysterious_merchant` cd 1h / weight 12 一条占 18.0% 抽取——同批已处置，
 *   最终态 8 种子读数：商人 **2.4%**、top1 **3.0%**、窗口新鲜率均值 **93.2%**、总抽取中位 938〔较改前 −16%〕）：
 *   【硬判据】(1) 冷却合规：同一 id 两次出现之间隔 ≥ 该事件 cooldownHours（换算成游戏分钟段）
 *       —— 违例数必须 = 0。这条同时证明「本探针真走了生产冷却口」（若有人绕过 fire 直调池子，这里立刻红）。
 *     (2) 可复现：同种子双跑逐字节相同（本件自带自比：跑两遍取指标行比对）。
 *     (3) 覆盖率单调合理：全程去重 id 数 ≤ 池规模，且随轮数不降。
 *   【观察项 · 报告级不阻塞】末段 50 窗新鲜率、同 id 重复间隔中位数、最长连击、
 *     分档/分性的重复集中度 —— 这些是「池该不该扩」的证据，**扩容属产品裁定**，本探针只出数不擅动池。
 *     ⚠️ 但「不擅动」不等于「永远不动」：首测据此发现的病灶（`mysterious_merchant` cd 1h / weight 12 ⇒ 一条占 18.0%）
 *     已由**神秘商人节律批 2026-10-10 经用户拍板处置**（cd → 12h；**降权经出厂探针实测证明近乎无杠杆（权重 12→3 只挪 0.25pp），故权重保留 12**），
 *     所以 §8 起本探针多了一条**会拦人**的红线，而不只是报表。
 *     ⚠️ 但「不擅动」不等于「永远不动」：首测据此发现的病灶（`mysterious_merchant` cd 1h / weight 12 ⇒
 *     一条占 18.0% 抽取）已由**神秘商人节律批 2026-10-10 经用户拍板处置**（cd 1 → 12；降权经实测无杠杆），
 *     所以 §8 起本探针多了一条**会拦人**的红线，而不只是报表。
 *
 * 用法：node .tests/probe-eventrepeat.cjs [轮数] [种子]   缺省 20000 分钟段（≈ 333 游戏小时，全程 <1s）
 * 末行：EVENTREPEAT_ALL_GREEN <n>/<n>（观察项另打 EVENTREPEAT_WATCH 行，不计入断言数）
 */
'use strict';
const path = require('path');
const REPO = path.resolve(__dirname, '..');
const { load } = require(path.join(REPO, '.tests/sandbox.cjs'));

const ROUNDS = Number(process.argv[2] || 20000);
const SEED = Number(process.argv[3] || process.env.SQ_SEED || 20261009);
const WINDOW = 50;                 /* 与 D.EVENT_FEED_CAP 同值 = 玩家奇遇页真能看到的条数 */
const MIN_PER_STEP = 1;            /* 一步 = 一个游戏分钟段 */

/* 固定种子（mulberry32）：抽样类判据不种子化就不可复现，见 .tests/README「抽样类判据必须固定种子」 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let pass = 0, fail = 0, watch = 0;
const T = (c, name, info) => { c ? (pass++, console.log('PASS ' + name + (info ? ' (' + info + ')' : ''))) : (fail++, console.log('FAIL ' + name + (info ? ' (' + info + ')' : ''))); };
const W = (name, info) => { watch++; console.log('WATCH ' + name + (info ? ' (' + info + ')' : '')); };

const BASE_NOW = Date.UTC(2026, 9, 9, 12, 0, 0);   /* 冻结时钟起点：跨度只由轮数决定，与真实时间无关 */

async function measure() {
  const { SQ, pack } = (function () {
    const { SQ } = load([], { bridge: true });
    return { SQ, pack: SQ.Worlds.xiuxian.pack };
  })();
  const D = SQ.XDATA;
  const rand = mulberry32(SEED);
  const realRandom = Math.random;
  Math.random = rand;
  let cooldownHoursOf = {}, weightOf = {};
  try {
    const st = SQ.defaultState();
    st.profile = { name: '重复率', talents: [], legacyTalents: [], worldId: 'xiuxian', worldName: '罗云州', createdAt: BASE_NOW, alignBias: 'neutral' };
    st.worlds.xiuxian = pack.initialState();
    const ws = st.worlds.xiuxian;
    /* mode 的真实取值 = D.MODES 的键（seclude / venture，**不是** 'explore'）；
       取 venture（外出历练：eventMult 1.5，奇遇密度最高的一档，最能暴露重复） */
    ws.realm = 5; ws.stones = 1e8; ws.qi = 1e8; ws.mode = 'venture';
    ws.attrs = ws.attrs || {};
    (SQ.Events.allIds(pack) || []).forEach(function (id) {
      const e = SQ.Events.findById(pack, id);
      if (e) cooldownHoursOf[id] = (e.cooldownHours != null ? e.cooldownHours : (e.cd != null ? e.cd : 0));
      if (e) weightOf[id] = (e.weight != null ? e.weight : 0);
    });
    const poolN = (SQ.Events.allIds(pack) || []).length;

    const draws = [];            /* {i, id, now, tier, nature} */
    const branches = {};         /* id → {分支键: 次数}（分支分布是重复率的伴生观察） */
    let blocked = 0, abortN = 0, resolved = 0, firstFireAt = -1;
    const ctxLog = function () {};
    const ctx = { log: ctxLog, profile: st.profile };
    for (let i = 0; i < ROUNDS; i++) {
      const now = BASE_NOW + i * MIN_PER_STEP * 60000;
      pack.recalcDerived(ws, st.profile);
      const mods = SQ.Mods.collect(st.profile, ws, pack, D);
      let r = null;
      /* 生产触发口：分钟段推进 + 保底曲线 + 传闻预留排除 + 空池降阶回退，全在 tickOnline 里 */
      try { r = SQ.Events.tickOnline(ws, pack, D, mods, 60 * MIN_PER_STEP, now, Object.assign({}, ctx, { now: now })); }
      catch (e) { abortN++; continue; }
      if (r && r.blocked) { blocked++; continue; }
      if (!r || !r.pending) { abortN++; continue; }
      const id = ws.pendingChoice && ws.pendingChoice.id;
      if (!id) { abortN++; continue; }
      if (firstFireAt < 0) firstFireAt = i;
      const ev = SQ.Events.findById(pack, id) || {};
      draws.push({ i: i, id: id, now: now, tier: r.tier || ev.tier, nature: r.nature || ev.nature });
      const keys = ev.choices ? Object.keys(ev.choices) : ['neutral'];
      const bk = keys[Math.floor(Math.random() * keys.length)];
      branches[id] = branches[id] || {};
      branches[id][bk] = (branches[id][bk] || 0) + 1;
      /* 结算走 `Events.resolveBranch`（`Actions.resolveChoice` 内部就是它）。
       * **不经 Actions**：那条口是 `SQ.mutate(ref, fn)` = 先从存储读档再改，
       * 而本探针的建场与冻结时钟只活在内存里 —— 用 mutate 会把刚推进的 eventClock /
       * pendingChoice 整批丢掉（实测 600 步只出 1 次事件、且 resolveChoice 抛
       * 「Cannot read properties of undefined」）。冷却写点在 `fire` 内（events.js:573/604），
       * 不经 mutate 也照样被检验。 */
      try {
        SQ.Events.resolveBranch(ws, pack, D, mods, id, bk, now, Object.assign({}, ctx, { now: now }));
        resolved++;
      } catch (e) { abortN++; }
      if (ws.pendingChoice) ws.pendingChoice = null;   /* 防挂起未清把后续全堵死（首版就栽在这） */
    }
    Math.random = realRandom;

    /* ── 指标 ── */
    const firstSeen = {}, gaps = [], perId = {};
    let lastAt = {}, maxStreak = 1, curStreak = 1, prevId = null;
    draws.forEach(function (d, k) {
      perId[d.id] = (perId[d.id] || 0) + 1;
      if (lastAt[d.id] != null) gaps.push((d.i - lastAt[d.id]) * MIN_PER_STEP);   /* 单位：游戏分钟段 */
      lastAt[d.id] = d.i;
      if (!firstSeen[d.id]) firstSeen[d.id] = d.i;
      if (prevId === d.id) { curStreak++; if (curStreak > maxStreak) maxStreak = curStreak; } else curStreak = 1;
      prevId = d.id;
    });
    /* 冷却合规：同 id 两次出现的间隔分钟数 ≥ cooldownHours×60 */
    let violations = [], lastReal = {};
    draws.forEach(function (d) {
      const cd = cooldownHoursOf[d.id] || 0;
      if (lastReal[d.id] != null) {
        const gapMin = (d.now - lastReal[d.id]) / 60000;
        if (gapMin < cd * 60 - 0.5) violations.push(d.id + ' 间隔' + gapMin.toFixed(0) + 'min < 冷却' + (cd * 60) + 'min');
      }
      lastReal[d.id] = d.now;
    });
    /* 窗口新鲜率：每 WINDOW 次抽取里去重 id 占比（玩家「奇遇历史」一页能看到的多样性） */
    const winFresh = [];
    for (let k = WINDOW; k <= draws.length; k += WINDOW) {
      const seg = draws.slice(k - WINDOW, k);
      winFresh.push({ at: k, fresh: new Set(seg.map(x => x.id)).size / seg.length });
    }
    const tailFresh = winFresh.length ? winFresh[winFresh.length - 1].fresh : 1;
    const meanFresh = winFresh.length ? winFresh.reduce((a, x) => a + x.fresh, 0) / winFresh.length : 1;
    const distinct = Object.keys(perId).length;
    const repeatRate = draws.length ? 1 - distinct / draws.length : 0;
    gaps.sort((a, b) => a - b);
    const gapMed = gaps.length ? gaps[Math.floor(gaps.length / 2)] : NaN;
    const gapMin = gaps.length ? gaps[0] : NaN;
    /* 重复集中度：被重复最多的 id 占全部重复次的比重，以及分档重复占比 vs 池内占比 */
    const reps = Object.keys(perId).map(id => ({ id: id, n: perId[id] - 1 })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    const repTotal = reps.reduce((a, x) => a + x.n, 0);
    const top5Share = repTotal ? reps.slice(0, 5).reduce((a, x) => a + x.n, 0) / repTotal : 0;
    const byTier = {};
    draws.forEach(function (d) { byTier[d.tier] = (byTier[d.tier] || 0) + 1; });
    const tierRep = {};
    reps.forEach(function (x) { const t = (SQ.Events.findById(pack, x.id) || {}).tier; tierRep[t] = (tierRep[t] || 0) + x.n; });
    /* 病灶定位。**首测（v1.18 立探针时）用的是魔数式** `cooldownHours ≤ 2 && weight ≥ 9`——那是照着
     * `mysterious_merchant`（cd 1h / weight 12，一条占 16.6% 抽取）量身写的；🆕 神秘商人节律批 2026-10-10
     * 把它的冷却抬到 12h 之后，**全池再无 ≤2h 条目 ⇒ 那个式子会永远返回空集、探测器就此静默失效却仍打绿**。
     * 这与上一批 A8 抓的「写了没人接」同族：判据自己变成空壳而没人发现，比误红危险。
     * 现改成与池形状无关的口径 = **单条最频占全部抽取的份额**（病灶本来就是「一条吃掉玩家的奇遇时间」，
     * 不必绕道冷却/权重去推断），阈值见 §8；原魔数式的结果仍一并报出（`hotIds`），只是不再当判据。
     * ⚠️ zero-cd 那 11 条是 tiandao_* / prodigy_ev_* 独立通道（不经被动池，故 0 重复），不算「无冷却裸奔」。 */
    const cdFloorNow = Math.min.apply(null, Object.keys(cooldownHoursOf)
      .filter(function (k) { return cooldownHoursOf[k] > 0; }).map(function (k) { return cooldownHoursOf[k]; }));
    const wP90Now = (function () {
      const ws2 = Object.keys(weightOf).map(function (k) { return weightOf[k]; }).sort(function (a, b) { return a - b; });
      return ws2.length ? ws2[Math.floor(0.9 * (ws2.length - 1))] : 0;
    })();
    const hotIds = Object.keys(cooldownHoursOf).filter(function (k) { return cooldownHoursOf[k] <= 2 && weightOf[k] >= 9; });
    const hotDraws = draws.filter(function (d) { return cooldownHoursOf[d.id] <= 2 && weightOf[d.id] >= 9; }).length;
    /* 🆕 病灶带随批改**分布相对量**：旧魔数 `cd≤2h × weight≥9` 在神秘商人节律批处置后全池再无 ≤2h 条目
     * ⇒ 永远返回空集 = **探测器静默失效却仍打绿**（与上一批 A8 抓的「写了没人接」同族）。现按
     * 「池内非零冷却下界 × 权重 P90」取带；旧式结果仍并列报出**只作对照**，判据本身立在 §8 的
     * 「单条最频份额」上（与冷却/权重形状无关，不再依赖任何魔数）。 */
    const isHotRel = function (k) { return cooldownHoursOf[k] > 0 && cooldownHoursOf[k] <= cdFloorNow && weightOf[k] >= wP90Now; };
    const hotIdsRel = Object.keys(cooldownHoursOf).filter(isHotRel);
    const hotDrawsRel = draws.filter(function (d) { return isHotRel(d.id); }).length;
    const top1 = reps.length ? reps[0] : null;
    const hotReps = { ids: hotIds, drawShare: draws.length ? hotDraws / draws.length : 0, draws: hotDraws,
      relIds: hotIdsRel, relDraws: hotDrawsRel,
      relShare: draws.length ? hotDrawsRel / draws.length : 0,
      cdFloor: cdFloorNow, wP90: wP90Now,
      top1Id: top1 ? top1.id : null, top1Draws: top1 ? perId[top1.id] : 0,
      top1Share: (top1 && draws.length) ? perId[top1.id] / draws.length : 0,
      zeroCdIndependent: Object.keys(cooldownHoursOf).filter(function (k) { return !cooldownHoursOf[k] && !weightOf[k]; }).length };
    return {
      poolN: poolN, draws: draws.length, resolved: resolved, blocked: blocked, abortN: abortN, firstFireAt: firstFireAt,
      distinct: distinct, repeatRate: repeatRate, tailFresh: tailFresh, meanFresh: meanFresh,
      gapMed: gapMed, gapMin: gapMin, maxStreak: maxStreak, violations: violations,
      top5Share: top5Share, topReps: reps.slice(0, 5), byTier: byTier, tierRep: tierRep, hotReps: hotReps,
      /* 🆕 神秘商人节律批：№61 自己的份额（台账引用的份额数一律取这一行打印值） */
      mercDraws: perId['mysterious_merchant'] || 0,
      mercShare: draws.length ? (perId['mysterious_merchant'] || 0) / draws.length : 0,
      winFresh: winFresh, feed: (ws.eventHistory.feed || []).length, seenN: Object.keys(ws.eventHistory.seen || {}).length,
      cdKeys: Object.keys(ws.eventCooldowns || {}).length,
      feedCap: (D && D.EVENT_FEED_CAP) || 50,
      /* 池内冷却时长带：决定「同一条最快多久能再出现」，是新鲜率的上游参数 */
      cdStats: (function () {
        const v = Object.keys(cooldownHoursOf).map(function (k) { return cooldownHoursOf[k]; }).sort(function (a, b) { return a - b; });
        return { n: v.length, min: v[0], med: v[Math.floor(v.length / 2)], max: v[v.length - 1], zero: v.filter(function (x) { return !x; }).length };
      })()
    };
  } finally { Math.random = realRandom; }
}

(async function main() {
  const m = await measure();
  console.log('读数（轮数=' + ROUNDS + ' 种子=' + SEED + ' 窗口=' + WINDOW + '）：');
  console.log('  抽取 ' + m.draws + ' 次 · 去重 ' + m.distinct + ' 个 id · 池 ' + m.poolN + ' 条 · 结算成功 ' + m.resolved + ' · 护身符抵消 ' + m.blocked + ' · 未出事件的分钟段 ' + m.abortN + ' · 首触于第 ' + m.firstFireAt + ' 步');
  console.log('  全程重复率 = ' + (m.repeatRate * 100).toFixed(1) + '% · 末段窗口新鲜率 = ' + (m.tailFresh * 100).toFixed(1) + '% · 窗口均值 = ' + (m.meanFresh * 100).toFixed(1) + '%');
  console.log('  同 id 间隔：中位 ' + m.gapMed + ' 分钟段 · 最短 ' + m.gapMin + ' 分钟段 · 最长连击 ' + m.maxStreak);
  console.log('  重复集中度 top5 占比 = ' + (m.top5Share * 100).toFixed(1) + '% · 末态 feed ' + m.feed + ' 条 · seen ' + m.seenN + ' · 冷却键 ' + m.cdKeys);
  /* 🆕 神秘商人节律批 2026-10-10 随批加打：**台账引用的份额数必须由出厂探针自己打印**，
   * 不能引一次性测量脚本的数（本批首版就栽在这里：份额 2.4%〔1.9~2.6%〕出自一次性 harness 的自建场与
   * 固定分支策略，与出厂探针不同口径 ⇒ 收口读数一律回落到本件的打印行）。
   * 本探针本来就只度量 `SQ.Worlds.xiuxian`，写死 №61 的 id 是可接受的（它就是这个病灶的判据对象）。 */
  console.log('  №61 mysterious_merchant 份额 = ' + (m.mercShare * 100).toFixed(1) + '%（' + m.mercDraws + '/' + m.draws + ' 抽）· 单条最频 = ' + (m.hotReps.top1Id || '-') + ' ' + (m.hotReps.top1Share * 100).toFixed(1) + '%');

  /* ── 硬判据 ── */
  const minDraws = Math.max(WINDOW * 4, Math.floor(ROUNDS / 60), Math.round((m.cdStats.n - m.cdStats.zero) * 0.7));
  T(m.draws >= minDraws, '§1 生产抽取路径真的在出事件且样本够谈窗口统计（下界 = max(4 个满窗, 每游戏小时 1 次, **可被动抽取条目数 ×70%**) —— 首版只挂「步数 ×20%」恒真，7 次抽取也能过，这条已被实测校正）',
    '抽取=' + m.draws + ' 次 / ' + (ROUNDS / 60).toFixed(0) + ' 游戏小时（≈' + (m.draws / (ROUNDS / 60)).toFixed(1) + ' 次/小时）· 下界=' + minDraws + '（可抽取条目 ' + (m.cdStats.n - m.cdStats.zero) + ' 条 ×70%）· 结算=' + m.resolved + ' · 首触于第 ' + m.firstFireAt + ' 步');
  T(m.violations.length === 0, '§2 **冷却合规**：同 id 两次出现之间不短于该事件 cooldownHours（违例 = 绕过生产冷却口的直接证据）',
    m.violations.length ? m.violations.slice(0, 3).join(' / ') : '零违例（间隔最短 ' + m.gapMin + ' 分钟段）');
  T(m.distinct <= m.poolN && m.poolN >= 100, '§3 去重数不超过池规模、池本身可枚举', '去重=' + m.distinct + ' 池=' + m.poolN);
  T(m.maxStreak <= 3, '§4 同一事件不出现「连着三四次」的观感崩塌（权重抽样下连击上界）', '最长连击=' + m.maxStreak);
  T(m.meanFresh >= 0.75, '§5 窗口新鲜率**均值**下界 75%（判定用均值不用末段单窗：改前 8 种子单窗散布 62%~78% 太抖、均值散布仅 79.8%~81.1% ⇒ 75% 留 4.8pp 余量、又能真拦住 5 个百分点级的退化；跌破 = 池对当前节奏不够，触发扩容提案。🆕 神秘商人节律批改后复测 8 种子：均值散布 **92.7%~93.6%**（阈值**不跟着上调**——它是退化红线不是目标值，上调等于把刚修好的病灶重新写成"合格线"）',
    '均值=' + (m.meanFresh * 100).toFixed(1) + '% 末段单窗=' + (m.tailFresh * 100).toFixed(1) + '% 窗数=' + m.winFresh.length);
  T(m.feed > 0 && m.feed <= m.feedCap + 10, '§6 叙事流随真实结算在长、且不越写口上限（度量对象确实存在）',
    'feed=' + m.feed + ' / 写口上限=' + m.feedCap);

  /* 🆕 神秘商人节律批 2026-10-10：首测那条「权重 12 / 冷却 1h 的 `mysterious_merchant` 一条占 18.0%
     * （8 种子 16.1~19.1%）」的病灶处置完之后，把「一条不许吃掉玩家一成以上的奇遇时间」从观察项升成门禁——
     * 阈值取 8%（最终态 8 种子实测 top1 = **3.0%**：12h 档各条轮流坐庄、商人自身 2.4% 已掉出榜首；余量 2.7 倍，而出事那一档是 18.0%）。
     * 只挂单条份额、不挂 top5：top5 会随池形状自然波动（改前 28.7~31.3%、改后 15.9~16.4%），不适合当红线。 */
  T(m.hotReps.top1Share <= 0.08, '§8 **单条最频事件占全部抽取的份额 ≤ 8%**（🆕 神秘商人节律批立；首测那档 18.0% 就是这条的红色形态；处置后 top1 实测 3.0% / 商人 2.4%）',
    'top1=' + m.hotReps.top1Id + ' ' + (m.hotReps.top1Share * 100).toFixed(1) + '%（' + m.hotReps.top1Draws + ' 抽）· 阈值 8% ‖ 池内非零最小冷却=' + m.hotReps.cdFloor + 'h · 权重 P90=' + m.hotReps.wP90);

  /* ── 可复现（自比双跑）── */
  const sig = JSON.stringify({ d: m.draws, s: m.distinct, f: m.tailFresh.toFixed(6), e: m.meanFresh.toFixed(6), g: m.gapMed, k: m.maxStreak, t: m.byTier, v: m.violations.length });
  const m2 = await measure();
  const sig2 = JSON.stringify({ d: m2.draws, s: m2.distinct, f: m2.tailFresh.toFixed(6), e: m2.meanFresh.toFixed(6), g: m2.gapMed, k: m2.maxStreak, t: m2.byTier, v: m2.violations.length });
  T(sig === sig2, '§7 同种子双跑指标逐字相同（抽样类度量不种子化就不算回归线）',
    sig === sig2 ? '两跑一致' : '差异：' + sig.slice(0, 60) + ' ≠ ' + sig2.slice(0, 60));

  /* ── 观察项（报告级 · 扩容与否属产品裁定，不擅动池）── */
  W('OBS1 全程重复率与去重覆盖', '重复率=' + (m.repeatRate * 100).toFixed(1) + '% 覆盖=' + m.distinct + '/' + m.poolN + '（' + (100 * m.distinct / m.poolN).toFixed(1) + '% 的池子被玩过）');
  W('OBS2 重复集中在少数事件？', 'top5 占全部重复的 ' + (m.top5Share * 100).toFixed(1) + '% · 最常被重复：' + m.topReps.map(x => x.id + '×' + (x.n + 1)).join(', '));
  W('OBS3 分档重复分布', '抽取分档=' + JSON.stringify(m.byTier) + ' 重复分档=' + JSON.stringify(m.tierRep));
  W('OBS4 新鲜率随游玩的走势', m.winFresh.map(x => x.at + ':' + (x.fresh * 100).toFixed(0) + '%').join(' '));
  W('OBS5 池内冷却时长带（决定「同一条最快多久能再出现」= 新鲜率的上游参数）',
    'n=' + m.cdStats.n + ' 最短=' + m.cdStats.min + 'h 中位=' + m.cdStats.med + 'h 最长=' + m.cdStats.max + 'h · 无冷却=' + m.cdStats.zero + ' 条 · 末态冷却键=' + m.cdKeys + ' 个');
  W('OBS6 重复的主因是「池不够」还是「权重×冷却形状」',
    '病灶带**按分布相对量**（池内非零冷却下界 ' + m.hotReps.cdFloor + 'h × 权重 P90 ' + m.hotReps.wP90 + '）条目 ' +
    m.hotReps.relIds.length + ' 条（' + m.hotReps.relIds.join(',') + '）占全部抽取的 ' + (m.hotReps.relShare * 100).toFixed(1) + '%' +
    ' · 旧魔数式(≤2h × ≥9) 只作对照：' + m.hotReps.ids.length + ' 条 ' + (m.hotReps.drawShare * 100).toFixed(1) + '%' +
    '（神秘商人节律批处置后全池再无 ≤2h 条目 ⇒ 旧式恒空，这正是改口径的理由）' +
    (m.hotReps.top1Id ? ' · 单条最频繁 ' + m.hotReps.top1Id + ' = ' + m.hotReps.top1Draws + ' 次（占 ' + (m.hotReps.top1Share * 100).toFixed(1) + '%）' : '') +
    ' · 池覆盖=' + m.distinct + '/' + m.poolN + ' ⇒ ' + (m.hotReps.top1Share > 0.08
      ? '**病灶在权重与冷却的分布形状，不是池规模**（扩池不解决；先处置份额最高的那一条：补冷却，降权经实测无杠杆）'
      : '分布平坦（首测那档 18.0% 已于神秘商人节律批处置（商人 2.4%，榜首换成别的 12h 档条目），见 §十三.10）；重复主要由池规模与节奏决定') +
    ' · 无冷却且无权重（天道/天骄独立通道）=' + m.hotReps.zeroCdIndependent + ' 条');

  console.log(fail === 0 ? 'EVENTREPEAT_ALL_GREEN ' + pass + '/' + (pass + fail) + ' · 观察项 ' + watch + ' 条不计入断言 · SEED=' + SEED : 'EVENTREPEAT_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('EVENTREPEAT_CRASH ' + (e && e.stack || e)); process.exit(2); });
