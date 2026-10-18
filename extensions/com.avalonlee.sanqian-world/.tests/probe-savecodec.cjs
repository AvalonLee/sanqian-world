/* .tests/probe-savecodec.cjs — 落盘无损压缩（存档瘦身批 2026-10-08）常驻探针
 * 守的是什么：
 *   ① 生产分支（有桥）落盘的确实是压缩串，且**读回与写前深度全等**（无损不是口号）；
 *   ② 同一份档在「有桥+压缩」与「无桥明文」两条分支上的体积差 ⇒ 证明压缩**替代**了有损裁切
 *      （取两体积中点当触发线做对照：明文分支被迫跑阶梯、压缩分支零触发，
 *       这才是「玩家不再丢传记 / 丢奇遇叙事」的执行证据，而不是只量一个字节数）；
 *   ③ 读端三态全收（旧桥对象 / 明文 JSON / d1: 压缩串）⇒ 旧档与测试存档件零迁移；
 *   ④ 降级态：宿主缺 CompressionStream ⇒ 明文落盘、照读照写，不产生新故障；
 *   ⑤ 反向验证（本仓「防空过护栏」纪律）：档是压缩写的、但当前宿主读不动时，
 *      必须**显式报错**并走 ioError 出口，绝不允许静默当空档把玩家进度抹成新档；
 *   ⑥ 真实玩家档（平台 .storage.json）按同一套标准 API 能解出来并给出实测压缩比。
 * 用法：node .tests/probe-savecodec.cjs        末行 SAVECODEC_ALL_GREEN n/n
 * 依赖：Node 18+ 的标准 CompressionStream / Response / btoa（与 Edge 同源同名，非第二套实现）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./sandbox.cjs');

let pass = 0, fail = 0;
function T(ok, name, detail) {
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')'));
}
const ROOT = path.resolve(__dirname, '..');
const clone = (o) => JSON.parse(JSON.stringify(o));
const utf8 = (s) => Buffer.byteLength(s, 'utf8');

/* 深度全等：键集合 + 逐键值，顺序无关（normalize 会重排，不能按插入序比） */
function deepEq(a, b, keyA, keyB, seen) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return a === b || (Number.isNaN(a) && Number.isNaN(b));
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  const setB = new Set(kb);
  for (const k of ka) if (!setB.has(k)) return false;
  for (const k of ka) if (!deepEq(a[k], b[k], k, k, seen)) return false;
  return true;
}

/* 造一份「够肥且形态真实」的档：喂满 feed / 九面 / 势力关系 / 传记 / 天骄名录
 * ——体积不是目的（对照判据取两分支体积中点），形态真实才是：
 *   只塞一个超长字符串也能压得很漂亮，但照不出「阶梯会不会裁掉玩家叙事」这件事。 */
function fatState(SQ) {
  const D = SQ.XDATA, pack = SQ.Worlds.xiuxian.pack;
  const s = SQ.defaultState();
  s.profile = { name: '压缩探针', talents: [], legacyTalents: [], worldId: 'xiuxian', worldName: '玄幻修仙', createdAt: 1700000000000, alignBias: 'neutral', gender: 'male', race: 'human' };
  const w = pack.initialState();
  s.worlds.xiuxian = w;
  w.realm = 9; w.zone = 8; w.qi = 1e9; w.stones = 1e6;
  /* 奇遇叙事流满档（**原**级⑩ 的裁切对象；该级已于第十四批 2026-10-11 整族删除，这里只作满载态构造器）*/
  const feed = [];
  for (let i = 0; i < (D.EVENT_FEED_CAP || 50); i++) {
    feed.push({ id: 'ev_probe_' + i, ts: 1700000000000 + i * 1000, text: '奇遇叙事第 ' + i + ' 条：山风穿林，剑鸣不已，偶得一残卷，字句俱在。',
      title: '残卷' + i, tags: ['probe', 'story'] });
  }
  w.eventHistory = { feed, seen: {}, lastId: 'ev_probe_49' };
  for (let i = 0; i < 40; i++) w.eventHistory.seen['ev_seen_' + i] = 1700000000000 + i;
  /* 传记满世（级⓪④ 的裁切对象）+ 九面图鉴 + 名号 */
  if (s.meta && typeof s.meta === 'object') {
    s.meta.biographies = [];
    for (let i = 0; i < 9; i++) {
      s.meta.biographies.push({ n: i + 1, name: '第' + i + '世', text: '一生行事：入山、习剑、渡劫、开宗、传世，皆有据可查，非虚语也。' + i, karma: 100 - i * 30, realm: 9 });
    }
    s.meta.titles = [];
    for (let i = 0; i < 60; i++) s.meta.titles.push('title_probe_' + i);
    const faces = ['art', 'treasure', 'pill', 'event', 'place', 'bond', 'enemy', 'sect', 'title'];
    s.meta.codices = {};
    faces.forEach((f, fi) => {
      s.meta.codices[f] = [];
      for (let i = 0; i < 80; i++) s.meta.codices[f].push(f + '_' + fi + '_' + i);
    });
    s.meta.earnedKeys = {};
    for (let i = 0; i < 200; i++) s.meta.earnedKeys['treasure.' + i] = 2;
    s.meta.karmaLog = [];
    for (let i = 0; i < 20; i++) s.meta.karmaLog.push({ ts: 1700000000000 + i, karma: i * 11, why: '善恶记录 ' + i });
  }
  /* 势力关系对称矩阵（级⑦ 的折叠对象）+ 天骄名录与榜面快照（级⑨ 的裁切对象）*/
  (w.factions || []).forEach((f, i, arr) => {
    f.rel = f.rel || {};
    arr.forEach((g) => { if (g && g.id !== f.id) f.rel[g.id] = (i % 5) - 2; });
  });
  w.prodMarks = w.prodMarks || {};
  w.prodMarks.rankRows = [];
  for (let i = 0; i <= 30; i++) w.prodMarks.rankRows.push({ r: i, nm: '天骄' + i, tier: 'fine', pts: 1000 - i * 7 });
  w.prodMarks.slotMax = 30; w.prodMarks.myRank = 4;
  /* 日志走独立键（2000 条）：主档不含 log ⇒ 阶梯不裁日志 */
  for (let i = 0; i < 300; i++) SQ.Log.push(w, i % 2 ? 'event' : 'sys', '日志第 ' + i + ' 条：门中进缴灵材一件，弟子出力折算战功。', 1700000000000 + i);
  return s;
}

(async () => {
  if (typeof CompressionStream !== 'function' || typeof Response !== 'function') {
    console.log('SKIP 需要 Node 18+ 的标准 CompressionStream'); process.exit(2);
  }

  const br = load([], { bridge: true });          /* 生产分支：有桥 */
  const pv = load([], {});                        /* 预览分支：无桥 localStorage */
  const SQ = br.SQ;

  /* ── A 相：无损往返（有桥）── */
  T(SQ.codecReady() === true, 'A1 有桥沙箱 codecReady() 为真（跑的是生产同一分支，不是降级态）');
  const fatA = fatState(SQ);
  const normA = SQ.normalize(clone(fatA));
  await SQ.save(clone(normA));
  const rawBridge = br.bridge[SQ.KEY];
  T(typeof rawBridge === 'string' && rawBridge.indexOf('d1:') === 0,
    'A2 有桥落盘 = d1: 压缩串（不是对象、不是明文）',
    '前缀=' + String(rawBridge).slice(0, 3) + ' 类型=' + typeof rawBridge);
  const backA = await SQ.load();
  T(deepEq(normA.profile, backA.profile) && deepEq(normA.settings, backA.settings) &&
    deepEq(normA.worlds.xiuxian.eventHistory.feed, backA.worlds.xiuxian.eventHistory.feed) &&
    deepEq(normA.meta.codices, backA.meta.codices),
    'A3 写前 normalize 态 ⇄ 读回态深度全等（主档 + 传记 + 九面 + 叙事流）');
  T(((backA.worlds.xiuxian.eventHistory.feed || []).length) === 50 &&
    ((backA.meta.biographies || []).length) === 9,
    'A4 读回后叙事流 50 条与传记 9 世一条不少（无损才谈得上保真）',
    'feed=' + (backA.worlds.xiuxian.eventHistory.feed || []).length + ' bios=' + (backA.meta.biographies || []).length);

  /* ── B 相：两分支对照 —— 压缩替代裁切（核心判据）── */
  const fatFor = SQ.normalize(clone(fatA));
  const cPlain = await SQ.savePayload(clone(fatFor));            /* 无桥：明文 */
  const cBridge = await br.SQ.savePayload(clone(fatFor));         /* 有桥：压缩 */
  const plainBytes = utf8(cPlain.str), bridgeBytes = utf8(cBridge.enc);
  const ratio = plainBytes / bridgeBytes;
  T(bridgeBytes < plainBytes * 0.6,
    'B1 同档同阶梯：压缩后落盘体积 < 明文的 60%',
    '明文 ' + plainBytes + 'B → 压缩 ' + bridgeBytes + 'B（' + ratio.toFixed(2) + '×）');
  const trigMid = Math.ceil((plainBytes + bridgeBytes) / 2);
  const fPlain = await pv.SQ.compressForSave(clone(fatFor), Date.now(), trigMid);
  const fBridge = await br.SQ.compressForSave(clone(fatFor), Date.now(), trigMid);
  T(fPlain.stages.length > 0 && fBridge.stages.length === 0,
    'B2 取两体积中点当触发线做对照：明文分支被迫跑有损级、压缩分支零触发',
    '明文触发级=[' + fPlain.stages.join(',') + '] 压缩触发级=[' + fBridge.stages.join(',') + '] 触发线=' + trigMid + 'B');
  const fb2 = await br.SQ.compressForSave(clone(fatFor), Date.now(), 2048);
  T(fb2.stages.length >= 10,
    'B3 极小触发线下压缩分支也照样把阶梯跑完（保险没被压缩顶掉而失修）',
    '级=[' + fb2.stages.join(',') + ']');

  /* ── C 相：读端三态（旧档零迁移）── */
  const plainStr = JSON.stringify(clone(fatFor));
  const compressedStr = await SQ.encodePayload(plainStr);       /* 由生产同一编码器产出，不另手写一遍 */
  const cases = [
    ['桥旧格式：直接落对象', clone(fatFor)],
    ['预览旧格式：明文 JSON 串', plainStr],
    ['新格式：d1: 压缩串', compressedStr]
  ];
  for (const [name, val] of cases) {
    br.bridge[SQ.KEY] = val;
    const st = await SQ.load();
    T(st && st.profile && st.profile.name === '压缩探针' && deepEq(st.meta.codices, fatFor.meta.codices),
      'C 读端三态全收 · ' + name, 'err=' + JSON.stringify(SQ.storageError()));
  }

  /* ── D 相：降级态（宿主无标准 API）── */
  const nc = load([], { bridge: true, noCodec: true });
  T(nc.SQ.codecReady() === false, 'D1 noCodec 沙箱 codecReady() 为假（降级分支可达，不是纸面分支）');
  await nc.SQ.save(clone(fatFor));
  const ncVal = nc.bridge[SQ.KEY];
  T(ncVal && typeof ncVal === 'object', 'D2 无 CompressionStream ⇒ 原样落对象（= 改造前行为，无新故障）');
  const ncBack = await nc.SQ.load();
  T(deepEq(ncBack.meta.codices, fatFor.meta.codices), 'D3 降级态写 → 降级态读，往返无损');

  /* ── E 相：反向验证 —— 读不动时必须显式报错，不静默抹档 ── */
  const victim = load([], { bridge: true });
  await victim.SQ.save(clone(fatFor));
  const compressed = victim.bridge[SQ.KEY];
  const nc2 = load([], { bridge: true, noCodec: true });
  nc2.bridge[SQ.KEY] = compressed;
  const lost = await nc2.SQ.load();
  T(nc2.SQ.storageError() && nc2.SQ.storageError().op === 'read',
    'E1 压缩档 + 无解码能力的宿主：storageError 有值（走视图既有失败出口）',
    JSON.stringify(nc2.SQ.storageError()));
  T(lost && (!lost.profile || lost.profile.name !== '压缩探针'),
    'E2 且不静默把档当空：回落态与新档一致、玩家名不出现（可提示而非假装无事）');
  nc2.bridge[SQ.KEY] = null;

  /* ── E3/E4（第册十八批 2026-10-18 · 审计待办 N71）读失败先留底 ──
   * 立因：E1/E2 只证「报错 + 回落新档」，没证**回落之后玩家照新建会怎样** ——
   *   `mutate` 起手又读失败 ⇒ 拿空档落盘 ⇒ 把盘上那份「完好但读不动」的载荷整份盖掉（不可逆）。
   * 现在的口径 = 读失败先把那份原始载荷逐字备份到第二键（每会话一次），落盘照常 ⇒ 覆盖可恢复。
   * ⚠️ 边界与代码注一致：只覆盖「读到了但解析不动」那一族；连 `storage.get` 都抛时无从留底。 */
  const victim2 = load([], { bridge: true });
  await victim2.SQ.save(clone(fatFor));
  const keep2 = victim2.bridge[SQ.KEY];
  const nc3 = load([], { bridge: true, noCodec: true });
  nc3.bridge[SQ.KEY] = keep2;
  await nc3.SQ.load();                                     /* 读失败 ⇒ 回落新档 + 留底 */
  T(nc3.bridge[nc3.SQ.CORRUPT_KEY] === keep2,
    'E3 读失败：那份读不动的载荷逐字留底到第二键（键名走 SQ.CORRUPT_KEY，不硬拼）',
    /* 详情表达式必须**空值安全**：留底没发生时它是 undefined，直接喂 storedBytes 会抛 TypeError
     * 把整件跑崩（反向取证实测踩过），那样连「如实打红」都做不到。 */
    'kept=' + (typeof keep2) + ' backup=' + nc3.SQ.storedBytes(nc3.bridge[nc3.SQ.CORRUPT_KEY] || ''));
  const fresh3 = nc3.SQ.defaultState();
  fresh3.profile.name = '新号道人';
  await nc3.SQ.save(fresh3);                               /* 玩家照新建 ⇒ 主档被覆盖 */
  T(nc3.bridge[SQ.KEY] !== keep2 && nc3.bridge[nc3.SQ.CORRUPT_KEY] === keep2,
    'E4 覆盖发生后留底仍在：主键已是新档、第二键逐字还是那一份 ⇒ 丢档变可恢复',
    'mainChanged=' + (nc3.bridge[SQ.KEY] !== keep2));

  /* ── F 相：真实玩家档（宿主 .storage.json）──
   * 路径改用 `.tests/storage-read.cjs` 的**候选试探**（2026-10-09 版本控制纳管批：宿主移除平台安装目录、
   *   实时实例改在仓库镜像根跑 ⇒ 本件此前单条硬编码路径**静默 SKIP 了两个判据**，F 相在 DoD 里没真跑过）。
   *   ⚠️ 只借它「找路径」，**解码一律仍走 SQ.decodeStoredObject（生产读端）** —— 见 storage-read.cjs 头注的边界。 */
  let livePath = null;
  try { livePath = require(path.join(ROOT, '.tests/storage-read.cjs')).storagePath(); } catch (e) { livePath = null; }
  if (livePath && fs.existsSync(livePath)) {
    const wrapped = JSON.parse(fs.readFileSync(livePath, 'utf8'));
    const main = wrapped[SQ.KEY], logs = wrapped[SQ.Log.KEY];
    const decMain = await SQ.decodeStoredObject(main);
    const decLogs = await SQ.decodeStoredObject(logs);
    const rawMainBytes = utf8(JSON.stringify(main === undefined ? null : main));
    const storedMainBytes = utf8(typeof main === 'string' ? main : JSON.stringify(main));
    T(decMain && decMain.profile, 'F1 真实玩家档可解（改造后读端仍认现有档，零迁移）',
      '现状类型=' + (typeof main) + ' 落盘 ' + storedMainBytes + 'B');
    T(decLogs && decLogs.logs, 'F2 真实日志档可解（独立键结构不变）',
      '世界=' + Object.keys((decLogs && decLogs.logs) || {}).length);
    console.log('  实测：主档 raw=' + rawMainBytes + 'B · 日志 raw=' + utf8(JSON.stringify(logs || {})) + 'B');
  } else {
    console.log('  SKIP F 相：本机没有平台实时档 ' + livePath);
  }

  console.log((fail ? 'SAVECODEC_FAILED ' + fail + '/' + (pass + fail) : 'SAVECODEC_ALL_GREEN ' + pass + '/' + (pass + fail)));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('SAVECODEC_CRASH ' + (e && e.stack || e)); process.exit(3); });
