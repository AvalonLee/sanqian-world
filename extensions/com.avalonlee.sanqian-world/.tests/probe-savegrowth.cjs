/* .tests/probe-savegrowth.cjs — 第九路常驻探针：主档体积与**游玩时长解耦**取证（存档治理批 2026-10-08/09）
 *
 * 立因：玩家的真实抱怨 = 「单文件存档，随着游戏游玩会越来越大」。此前的主档承载两族**展示流**
 *   （日志 ws.log、奇遇叙事流 ws.eventHistory.feed），日志已于 2026-10-05 迁侧档，feed 仍在主档内，
 *   且是唯一一个「满档就 ≈11~14KB」的最大单项；此外到期 eventCooldowns 要等主档超触发线才裁。
 *   本探针把「越玩越大」量成曲线而不是概念：同一份游玩过程里，
 *   **主档字节必须平坦**、增长只允许出现在侧档（侧档自带预算、超预算挤最旧）。
 *
 * 判据全部跑在**生产同一分支**（sandbox `bridge:true` = 有桥 + `d1:` 压缩落盘），不是明文预览分支；
 * 反向验证（§5）证明「剥离展示流」这个承重项一旦摘掉，同一份游玩就会把主档推上有损阶梯。
 *
 * 用法：node .tests/probe-savegrowth.cjs [轮数] [种子]（缺省 600 轮 · 种子 20261009）
 *       同种子双跑须逐字节相同（本仓确定性纪律）。
 */
'use strict';
const { load } = require('./sandbox.cjs');

const ROUNDS = Number(process.argv[2] || 600);
const SEED = Number(process.argv[3] || 20261009);

let pass = 0, fail = 0;
function T(cond, name, info) {
  if (cond) { pass++; console.log('PASS ' + name + (info ? ' (' + info + ')' : '')); }
  else { fail++; console.log('FAIL ' + name + (info ? ' (' + info + ')' : '')); }
}
function byteLen(v) {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return Buffer.byteLength(s, 'utf8');
}
/* 确定性随机（mulberry32）——与 sim-playthrough / sim-event-economy 同款 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(async function main() {
  /* 参数越界守卫（仿 `sim-event-economy` 的「轮数 > 200 退 2」体例）：
   * 本探针的字节阈值按 **≥400 轮**标定（每 50 轮一个采样点、feed 满档 50 条需暖机），
   * 轮数太小 ⇒ 曲线只有个位数采样点、展示流尚未填满，判据会因**建场不足**而红，不是回归信号。 */
  if (!(ROUNDS >= 400)) {
    console.log('SAVEGROWTH_RANGE 轮数须 ≥400（判据按 600 轮标定；缺省即 600，只换种子请用第二参）当前=' + ROUNDS);
    process.exit(2);
  }
  /* 时钟一次性取定（`sim-playthrough` 同款纪律）：真实墙钟会让落盘字节随运行时刻浮动，
   * 「同种子双跑逐字节相同」就无从成立。sandbox 里的 `Date` 与宿主是**同一引用** ⇒ 覆盖即全链生效。 */
  const BASE_NOW = 1760000000000;
  let clock = 0;
  Date.now = () => BASE_NOW + (clock += 1000);
  const { sandbox, SQ, bridge } = load([], { bridge: true });
  global.Math.random = mulberry32(SEED);
  sandbox.window.Math = Math;                       /* 沙箱内 Math 与被 stub 的同一个 */
  const pack = SQ.Worlds.xiuxian.pack;
  const D = SQ.XDATA;
  const KB = (n) => (n / 1024).toFixed(2) + 'KB';

  /* ── 建场：一只「刚入世」的活档，走真 writer 玩 ROUNDS 次奇遇 ──
   * 展示流的两个写口都用**生产同一入口**：日志经 `SQ.Log.push`（ctx.log 参数序 = (cat, text)，
   * 见 events.js:434/566/665），奇遇叙事流经 `SQ.Events.resolveBranch` 内部 unshift。
   * seen / lastId 由触发路径（events.js:573~575）写，手造 resolveBranch 不经此路 ⇒ 建场先各塞一枚，
   * 供 §2d 核「机制态幂等键仍留主档」。 */
  function freshState() {
    const s = SQ.defaultState();
    s.profile = { name: '长跑者', talents: [], legacyTalents: [], worldId: 'xiuxian', worldName: '修仙世界', createdAt: Date.now(), alignBias: 'neutral', gender: 'male', race: 'human' };
    s.worlds.xiuxian = pack.initialState();
    s.worlds.xiuxian.realm = 6;                     /* 高境界免得检定全败，feed 条目照常写 */
    s.worlds.xiuxian.eventHistory.seen.__probe_seed = Date.now();
    s.worlds.xiuxian.eventHistory.lastId = '__probe_seed';
    return s;
  }
  const ids = SQ.Events.allIds(pack).filter((x) => x && typeof x === 'string');
  T(ids.length > 100, '§0a 奇遇池可枚举（走 `Events.allIds` 生产口）', 'ids=' + ids.length);

  const st = freshState();
  const ws = st.worlds.xiuxian;
  const prof = st.profile;
  const logSink = (cat, txt) => { SQ.Log.push(ws, cat, txt); };
  function mods() { pack.recalcDerived(ws, prof); return SQ.Mods.collect(prof, ws, pack, D); }

  /* 曲线采样点 */
  const curve = [];
  let resolved = 0, nowBase = Date.now();
  for (let i = 0; i < ROUNDS; i++) {
    const evId = ids[i % ids.length];
    const ev = SQ.Events.findById(pack, evId);
    if (!ev || !ev.choices) continue;
    const keys = Object.keys(ev.choices);
    const bk = keys[Math.floor(Math.random() * keys.length)];
    const r = SQ.Events.resolveBranch(ws, pack, D, mods(), evId, bk, nowBase + i * 1000,
      { log: logSink, profile: prof });
    if (r) resolved++;
    if ((i + 1) % 50 === 0) {
      await SQ.save(st);
      curve.push({
        n: i + 1,
        main: byteLen(bridge[SQ.KEY]),
        side: byteLen(bridge[SQ.Log.KEY]),
        live: byteLen(st),                          /* 治理前等价口径 = 活档明文（含两族展示流） */
        feed: (ws.eventHistory.feed || []).length,
        log: (ws.log || []).length
      });
    }
  }
  T(resolved > ROUNDS * 0.5, '§0b 游玩真的在推进（resolveBranch 成功率）', 'resolved=' + resolved + '/' + ROUNDS);
  T(curve.length >= Math.max(3, Math.floor(ROUNDS / 100)), '§0c 采样点足够画曲线（判据随轮数自适应）', 'points=' + curve.length);

  /* ── §1 主档与游玩时长**解耦**（本批主判据）── */
  const first = curve.length > 4 ? curve[2] : curve[0];   /* 跳过头两个暖机点（feed 未满档前主档本就该随内容长） */
  const last = curve[curve.length - 1];
  const mainGrow = last.main - first.main;
  const liveGrow = last.live - first.live;
  const sideGrow = last.side - first.side;
  T(mainGrow <= 6 * 1024, '§1a 主档字节随游玩平坦（'+ first.n + '→' + last.n + ' 次结算增量 ≤6KB）',
    '主档 ' + KB(first.main) + '→' + KB(last.main) + ' Δ=' + KB(mainGrow));
  T(liveGrow > 40 * 1024, '§1b 反向对照：同一份游玩的「治理前等价口径」（活档明文含展示流）确实在单调变大',
    '明文 ' + KB(first.live) + '→' + KB(last.live) + ' Δ=' + KB(liveGrow) + '（若这项不涨说明建场没真产出展示流）');
  T(mainGrow < liveGrow / 4, '§1c 增长被**搬出**主档而非被裁掉（主档增幅 < 明文增幅/4）',
    '主档Δ=' + KB(mainGrow) + ' vs 明文Δ=' + KB(liveGrow));
  T(last.main <= SQ.SAVE_TRIGGER, '§1d 长跑末态主档仍在触发线内（有损阶梯全程未参与）',
    '主档=' + last.main + 'B / 触发线=' + SQ.SAVE_TRIGGER + 'B');

  /* ── §2 侧档承载增长且**自带预算**（不是无限外溢）── */
  const sideParsed = JSON.parse(await SQ.decodePayload(bridge[SQ.Log.KEY]));
  const feedSide = (sideParsed.feed || {}).xiuxian || [];
  const logSide = (sideParsed.logs || {}).xiuxian || [];
  T(sideGrow >= 0 && feedSide.length > 0, '§2a 侧档 feed 段在场且随游玩增长（增长有落点、不是丢弃）',
    '侧档Δ=' + KB(sideGrow) + ' feed条=' + feedSide.length + ' log条=' + logSide.length);
  T(feedSide.length <= D.EVENT_FEED_CAP, '§2b 侧档 feed 条数 ≤ `EVENT_FEED_CAP`（写口上限不因迁移而放宽）',
    'feed=' + feedSide.length + '/' + D.EVENT_FEED_CAP);
  const mainParsed = JSON.parse(await SQ.decodePayload(bridge[SQ.KEY]));
  const mw = (mainParsed.worlds || {}).xiuxian || {};
  T(mw.log == null && ((mw.eventHistory || {}).feed == null),
    '§2c 主档两族展示流俱无（log + eventHistory.feed 都在侧档）',
    '主档log=' + (mw.log == null ? '无' : '有') + ' 主档feed=' + ((mw.eventHistory || {}).feed == null ? '无' : '有'));
  T((mw.eventHistory || {}).seen != null && (mw.eventHistory || {}).lastId != null,
    '§2d 幂等键（seen / lastId）不随展示流外迁——仍在主档（去重语义属机制态）',
    'seen=' + Object.keys((mw.eventHistory || {}).seen || {}).length + ' lastId=' + ((mw.eventHistory || {}).lastId || 'null'));

  /* ── §3 冷却键：落盘**恒常不剪**（本批复核撤回 L1）+ 级③ 死键规则可证安全 ──
   * 撤回理由（复核抓获）：`ws.eventCooldowns` 存**触发时刻**（events.js:573/604 · rumors.js:236），
   * 读端 `now < cd + cooldownHours×3600e3`（events.js:498）⇒「值 < now」= 刚触发，恒常剪它 = 每次存档清空活冷却。 */
  const cdNow = Date.now();                                  /* 取探针内固定起点时钟的当前值，不改动全局时钟 */
  ws.eventCooldowns.__justFired = cdNow - 1000;               /* 1 秒前触发 */
  ws.eventCooldowns.__futureGate = cdNow + 3600000;           /* events.js:924 式到期时刻 */
  ws.eventCooldowns.__deadLong = cdNow - 200 * 3600000;       /* 200h 前 > 168h 池内最长 */
  const sp2 = await SQ.savePayload(st);
  const mw2 = (JSON.parse(await SQ.decodePayload(sp2.enc)).worlds || {}).xiuxian || {};
  T(mw2.eventCooldowns.__justFired != null && mw2.eventCooldowns.__futureGate != null &&
    mw2.eventCooldowns.__deadLong != null && sp2.stages.length === 0,
    '§3a 落盘**不剪任何冷却键**（含 200h 前的旧键；恒常剪枝已撤回，剪枝只允许发生在触发线之上的级③）',
    '盘上=' + Object.keys(mw2.eventCooldowns || {}).filter((k) => k.indexOf('__') === 0).join('/'));
  const cdForced = await SQ.compressForSave(JSON.parse(JSON.stringify(st)), cdNow, 1);
  const fw = (((cdForced.out.worlds || {}).xiuxian || {}).eventCooldowns) || {};
  T(fw.__justFired != null && fw.__futureGate != null && fw.__deadLong == null,
    '§3b 强跑阶梯时级③ 只剪「值 < now − COOL_MAX_HOURS」的**可证死键**（两种存储写法都必然已失效）',
    '阶梯后=' + Object.keys(fw).filter((k) => k.indexOf('__') === 0).join('/'));
  T(ws.eventCooldowns.__deadLong != null, '§3c 反向：内存态冷却键从不被落盘逻辑摘除',
    '内存=' + Object.keys(ws.eventCooldowns).filter((k) => k.indexOf('__') === 0).join('/'));
  let maxCd = 0;
  ids.forEach((id) => { const e = SQ.Events.findById(pack, id); const h = e && (e.cooldownHours != null ? e.cooldownHours : e.cd); if (typeof h === 'number' && h > maxCd) maxCd = h; });
  T(maxCd <= SQ.COOL_MAX_HOURS, '§3d 反漂移：池内最长冷却 ≤ SQ.COOL_MAX_HOURS（改了池忘改常量 ⇒ 死键判据会误剪活冷却）',
    'max=' + maxCd + 'h / 常量=' + SQ.COOL_MAX_HOURS + 'h');
  delete ws.eventCooldowns.__justFired; delete ws.eventCooldowns.__futureGate; delete ws.eventCooldowns.__deadLong;

  /* ── §4 侧档字节预算：超预算保最新、挤最旧，且落盘真实体量受控 ──
   * 条目按真实量级造（生产 feed 条目含 eff 效果账 ≈215~285B；这里 ×≈1.8KB 的长叙事档，
   * 50 条 ≈90KB > 32KB 预算 ⇒ 必然触发预算裁剪，同时不失一般性）。 */
  const bigState = freshState();
  const bigWs = bigState.worlds.xiuxian;
  bigWs.eventHistory.feed = [];
  for (let i = 0; i < 50; i++) {
    bigWs.eventHistory.feed.unshift({ id: 'ev_big_' + i, ts: 1700000000000 + i, branch: 'right', tier: 3,
      nature: 'n', pass: true, hadCheck: false, karma: 1, eff: { prose: '山雨欲来'.repeat(150) } });
  }
  const rawBig = byteLen(bigWs.eventHistory.feed);
  await SQ.save(bigState);
  const sideBig = JSON.parse(await SQ.decodePayload(bridge[SQ.Log.KEY]));
  const feedBig = (sideBig.feed || {}).xiuxian || [];
  const feedBigPlain = feedBig.reduce((a, e) => a + SQ.Side.feedBytes(e), 0);
  T(feedBig.length < 50 && feedBig.length >= 10, '§4a 超预算 feed 被侧档预算裁（保最新、条数不是固定 5）',
    '明文=' + KB(rawBig) + ' 侧档条=' + feedBig.length + '/50');
  T(feedBig[0] && feedBig[0].id === 'ev_big_49', '§4b 裁的是尾部最旧、首条恒为最新（顺序语义不破）',
    'first=' + (feedBig[0] && feedBig[0].id));
  T(feedBigPlain <= SQ.Side.FEED_BYTE_BUDGET + SQ.Side.feedBytes(feedBig[0]),
    '§4c 侧档 feed 段明文体量在 `FEED_BYTE_BUDGET` 内（预算按未编码口径 = 保留条数的约束）',
    '侧档明文=' + KB(feedBigPlain) + ' / 预算=' + KB(SQ.Side.FEED_BYTE_BUDGET));
  T(byteLen(bridge[SQ.Log.KEY]) <= SQ.SAVE_RED * 8, '§4d 侧档落盘体量受控（预算 + d1: 压缩，不反向撑爆扩展存储）',
    '侧档=' + KB(byteLen(bridge[SQ.Log.KEY])) + ' 主档=' + KB(byteLen(bridge[SQ.KEY])));

  /* ── §5 反向验证（防空过护栏）：把展示流留在主档 = 改造前形态 ⇒ 同一份游玩必然触发有损阶梯 ── */
  const legacy = JSON.parse(JSON.stringify(st));
  legacy.worlds.xiuxian.log = ws.log;
  legacy.worlds.xiuxian.eventHistory.feed = ws.eventHistory.feed;
  const cOld = await SQ.compressForSave(legacy, Date.now());          /* 不经 stripSideFlows */
  const cNew = await SQ.compressForSave(SQ.SavePre.stripSideFlows(st), Date.now());
  T(cOld.stages.length > 0 && cNew.stages.length === 0,
    '§5a 摘掉「剥离展示流」这一步，同一份游玩即把主档推上有损阶梯（判据承重项实证，不是空过）',
    '改造前形态 stages=' + JSON.stringify(cOld.stages) + ' / 治理后 stages=' + JSON.stringify(cNew.stages));
  T(cOld.stored - cNew.stored > 20 * 1024, '§5b 两形态落盘字节差 = 被搬走的展示流体量',
    '改造前=' + KB(cOld.stored) + ' 治理后=' + KB(cNew.stored) + ' Δ=' + KB(cOld.stored - cNew.stored));

  /* ── §6 旧档迁移闭环：feed 还在主档里的玩家档，读得到 → 存一次即升上来 → 再读不丢 ── */
  const oldMain = JSON.parse(JSON.stringify(st));
  oldMain.worlds.xiuxian.log = ws.log.slice();
  oldMain.worlds.xiuxian.eventHistory.feed = ws.eventHistory.feed.slice();
  bridge[SQ.KEY] = JSON.stringify(oldMain);                  /* 明文旧档（三态全收须认得） */
  delete bridge[SQ.Log.KEY];                                 /* 无侧档 = 改造前的档 */
  const r6 = await SQ.load();
  const feed6 = ((r6.worlds || {}).xiuxian || {}).eventHistory.feed || [];
  T(feed6.length === ws.eventHistory.feed.length && feed6.length > 0,
    '§6a 旧档首读沿用主档遗留 feed，一条不丢（零迁移脚本）', '首读feed=' + feed6.length);
  await SQ.save(r6);
  const m6 = JSON.parse(await SQ.decodePayload(bridge[SQ.KEY]));
  const s6 = JSON.parse(await SQ.decodePayload(bridge[SQ.Log.KEY]));
  T(((m6.worlds.xiuxian.eventHistory || {}).feed) == null && ((s6.feed || {}).xiuxian || []).length === feed6.length,
    '§6b 首次落盘即迁入侧档、主档不再含 feed（迁移是幂等的、由写口自动完成）',
    '侧档feed=' + ((s6.feed || {}).xiuxian || []).length);
  const r6b = await SQ.load();
  T(((r6b.worlds.xiuxian.eventHistory || {}).feed || []).length === feed6.length,
    '§6c 迁移后再读 feed 仍全量（回填口与写口对称）', '再读=' + ((r6b.worlds.xiuxian.eventHistory || {}).feed || []).length);

  /* ── §7 侧档签名缓存：外部清档后必须能重写（本批实测暴露并修掉的真实缺陷）── */
  const sigProbe = freshState();
  sigProbe.worlds.xiuxian.eventHistory.feed.push({ id: 'ev_sig_1', ts: 1, branch: 'right', tier: 1, nature: 'n', pass: true, hadCheck: false, karma: 0, eff: {} });
  await SQ.save(sigProbe);
  const sideA = bridge[SQ.Log.KEY];
  delete bridge[SQ.Log.KEY];                                 /* 模拟外部清档（测试 removeItem / 平台侧清理） */
  await SQ.save(sigProbe);
  const skipped = bridge[SQ.Log.KEY] == null;
  SQ.Side.resetSig();
  await SQ.save(sigProbe);
  T(skipped && bridge[SQ.Log.KEY] != null && bridge[SQ.Log.KEY] === sideA,
    '§7 签名缓存复位口有效：外部清档后**不复位则跳过写**（缺陷复现），复位后同内容能原样重写',
    '跳过写=' + skipped + ' 复位后重写=' + (bridge[SQ.Log.KEY] != null));

  /* ── §8 跨世项水位：30 世 trib 明细下红线不破（恒常折叠本批判为不做，保险仍是阶梯级②）── */
  const old = Math.random; global.Math.random = mulberry32(999);
  const multi = freshState();
  const muuid = multi.meta;
  for (let life = 1; life <= 30; life++) muuid.earnedKeys['trib.' + life] = 2 * life;
  muuid.karma = Object.keys(muuid.earnedKeys).reduce((a, k) => a + muuid.earnedKeys[k], 0);
  await SQ.save(multi);
  const rm = await SQ.load();
  const sumKeys = (o) => Object.keys(o || {}).reduce((a, k) => a + o[k], 0);
  T(byteLen(bridge[SQ.KEY]) <= SQ.SAVE_RED, '§8a 30 世 trib 明细下主档仍 ≤ 红线（跨世线性项量级已核 ≈18B/世）',
    '主档=' + byteLen(bridge[SQ.KEY]) + 'B / 红线=' + SQ.SAVE_RED + 'B');
  T(sumKeys(rm.meta.earnedKeys) === sumKeys(muuid.earnedKeys) && rm.meta.karma === muuid.karma,
    '§8b 跨世账本往返 Σ 全等、#197 恒等式续绿（阶梯级② 并额不改总额）',
    'Σ=' + sumKeys(rm.meta.earnedKeys) + ' karma=' + rm.meta.karma);
  global.Math.random = old;

  console.log('  实测：主档末态 ' + KB(last.main) + ' · 侧档 ' + KB(last.side) +
    ' · 治理前等价口径 ' + KB(last.live) + ' · 游玩 ' + ROUNDS + ' 结算 / SEED=' + SEED);
  console.log(fail === 0 ? 'SAVEGROWTH_ALL_GREEN ' + pass + '/' + (pass + fail) : 'SAVEGROWTH_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.log('SAVEGROWTH_CRASH ' + (e && e.stack || e)); process.exit(2); });
