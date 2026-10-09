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
 * 判据分两类：
 *   【硬判据】(1) 冷却合规：同一 id 两次出现之间隔 ≥ 该事件 cooldownHours（换算成游戏分钟段）
 *       —— 违例数必须 = 0。这条同时证明「本探针真走了生产冷却口」（若有人绕过 fire 直调池子，这里立刻红）。
 *     (2) 可复现：同种子双跑逐字节相同（本件自带自比：跑两遍取指标行比对）。
 *     (3) 覆盖率单调合理：全程去重 id 数 ≤ 池规模，且随轮数不降。
 *   【观察项 · 报告级不阻塞】末段 50 窗新鲜率、同 id 重复间隔中位数、最长连击、
 *     分档/分性的重复集中度 —— 这些是「池该不该扩」的证据，**扩容属产品裁定**，本探针只出数不擅动池。
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
    /* 「短冷却 × 高权重」条目占了多少抽取 —— 首测据此定位病灶：333 游戏小时里玩过 105/124 条（池没见底），
     * 但权重 12 / 冷却 1h 的 `mysterious_merchant` 一条就占全部抽取的 16.6% ⇒ 重复的主因是权重与冷却的
     * 分布形状，不是池规模。zero-cd 那 11 条其实是 tiandao_* / prodigy_ev_* 独立通道（不经被动池，故 0 重复）。 */
    const hotIds = Object.keys(cooldownHoursOf).filter(function (k) { return cooldownHoursOf[k] <= 2 && weightOf[k] >= 9; });
    const hotDraws = draws.filter(function (d) { return cooldownHoursOf[d.id] <= 2 && weightOf[d.id] >= 9; }).length;
    const top1 = reps.length ? reps[0] : null;
    const hotReps = { ids: hotIds, drawShare: draws.length ? hotDraws / draws.length : 0, draws: hotDraws,
      top1Id: top1 ? top1.id : null, top1Draws: top1 ? perId[top1.id] : 0,
      top1Share: (top1 && draws.length) ? perId[top1.id] / draws.length : 0,
      zeroCdIndependent: Object.keys(cooldownHoursOf).filter(function (k) { return !cooldownHoursOf[k] && !weightOf[k]; }).length };
    return {
      poolN: poolN, draws: draws.length, resolved: resolved, blocked: blocked, abortN: abortN, firstFireAt: firstFireAt,
      distinct: distinct, repeatRate: repeatRate, tailFresh: tailFresh, meanFresh: meanFresh,
      gapMed: gapMed, gapMin: gapMin, maxStreak: maxStreak, violations: violations,
      top5Share: top5Share, topReps: reps.slice(0, 5), byTier: byTier, tierRep: tierRep, hotReps: hotReps,
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

  /* ── 硬判据 ── */
  const minDraws = Math.max(WINDOW * 4, Math.floor(ROUNDS / 60), Math.round((m.cdStats.n - m.cdStats.zero) * 0.7));
  T(m.draws >= minDraws, '§1 生产抽取路径真的在出事件且样本够谈窗口统计（下界 = max(4 个满窗, 每游戏小时 1 次, **可被动抽取条目数 ×70%**) —— 首版只挂「步数 ×20%」恒真，7 次抽取也能过，这条已被实测校正）',
    '抽取=' + m.draws + ' 次 / ' + (ROUNDS / 60).toFixed(0) + ' 游戏小时（≈' + (m.draws / (ROUNDS / 60)).toFixed(1) + ' 次/小时）· 下界=' + minDraws + '（可抽取条目 ' + (m.cdStats.n - m.cdStats.zero) + ' 条 ×70%）· 结算=' + m.resolved + ' · 首触于第 ' + m.firstFireAt + ' 步');
  T(m.violations.length === 0, '§2 **冷却合规**：同 id 两次出现之间不短于该事件 cooldownHours（违例 = 绕过生产冷却口的直接证据）',
    m.violations.length ? m.violations.slice(0, 3).join(' / ') : '零违例（间隔最短 ' + m.gapMin + ' 分钟段）');
  T(m.distinct <= m.poolN && m.poolN >= 100, '§3 去重数不超过池规模、池本身可枚举', '去重=' + m.distinct + ' 池=' + m.poolN);
  T(m.maxStreak <= 3, '§4 同一事件不出现「连着三四次」的观感崩塌（权重抽样下连击上界）', '最长连击=' + m.maxStreak);
  T(m.meanFresh >= 0.75, '§5 窗口新鲜率**均值**下界 75%（判定用均值不用末段单窗：单窗在 8 个种子下散布 62%~78% 太抖，均值散布仅 79.8%~81.1% ⇒ 75% 留 4.8pp 余量、又能真拦住 5 个百分点级的退化；跌破 = 池对当前节奏不够，触发扩容提案）',
    '均值=' + (m.meanFresh * 100).toFixed(1) + '% 末段单窗=' + (m.tailFresh * 100).toFixed(1) + '% 窗数=' + m.winFresh.length);
  T(m.feed > 0 && m.feed <= m.feedCap + 10, '§6 叙事流随真实结算在长、且不越写口上限（度量对象确实存在）',
    'feed=' + m.feed + ' / 写口上限=' + m.feedCap);

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
    '短冷却(≤2h)×高权重(≥9) 条目 ' + m.hotReps.ids.length + ' 条占全部抽取的 ' + (m.hotReps.drawShare * 100).toFixed(1) + '%' +
    (m.hotReps.top1Id ? ' · 单条最频繁 ' + m.hotReps.top1Id + ' = ' + m.hotReps.top1Draws + ' 次（占 ' + (m.hotReps.top1Share * 100).toFixed(1) + '%）' : '') +
    ' · 池覆盖=' + m.distinct + '/' + m.poolN + ' ⇒ ' + (m.hotReps.drawShare > 0.15
      ? '**病灶在权重与冷却的分布形状，不是池规模**（扩池不解决；任何扩容提案应先处置这一档：补冷却或降权）'
      : '占比不高，重复主要由池规模与节奏决定') +
    ' · 无冷却且无权重（天道/天骄独立通道）=' + m.hotReps.zeroCdIndependent + ' 条');

  console.log(fail === 0 ? 'EVENTREPEAT_ALL_GREEN ' + pass + '/' + (pass + fail) + ' · 观察项 ' + watch + ' 条不计入断言 · SEED=' + SEED : 'EVENTREPEAT_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('EVENTREPEAT_CRASH ' + (e && e.stack || e)); process.exit(2); });
