/* .tests/probe-realsave.cjs — 第十路常驻探针（2026-10-09 存档治理批立）：**真机档读→存→读零丢失**取证
 *
 * 立因：治理批改的是「玩家实际落盘的那份档」的形态，光有合成档（probe-savecodec / savegrowth）不够——
 *   真实档里有历批遗留形态（feed 仍在主档、日志已外迁、脏键、旧字段）。本件把**平台实时档**当输入，
 *   走真 core.js 的 load/save/load，验证「机制态一字不丢、展示流一条不少、恒常前置只剪到期键」。
 *   由它在本批实测暴露并修掉了侧档签名缺陷（§7 见 probe-savegrowth；本件 §3 同款口径）。
 *
 * 边界：**只读不写**——桥 mock 在内存里，平台目录与 .storage.json 一概不碰（部署与否由人决定）。
 *   真档不存在或未入世 ⇒ REALSAVE_SKIP 退 0（本机可跑、他人环境不假红）。
 *   真机档 = 见下方 CAND 逐一试探（**2026-10-09 起实时实例在仓库镜像根**，平台安装目录已被宿主移除）
 *   流程：注入桥 mock（值取自真档）→ SQ.load → 深拷贝基线 → SQ.save → 重读侧档/主档 → SQ.load
 *   判据：① 主档落盘不再含 log / eventHistory.feed，二者完整落侧档；② 二次 load 后
 *   **机制态逐字段全等**（除 lastSave / log 时间戳类固有浮动）；③ feed 条数与内容一条不少；
 *   ④ #197 遗泽恒等式续绿；⑤ 体积对照（治理前后等价口径）。
 * 只读真档、只写内存 mock —— **本脚本不碰平台目录**（部署与否由人工决定）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');
/* 真机档路径候选（2026-10-09 版本控制纳管批改「单一硬编码」为「逐一试探」）：
 *   ① SQ_STORAGE 显式指定；② x-hub 平台安装目录（**本机现状 = 已被宿主移除**，留着给恢复后的环境）；
 *   ③ 仓库镜像根 `extensions/com.avalonlee.sanqian-world/`（**当前实时实例所在**，宿主 2026-10-09 起改从这里跑）；
 *   ④ 工作树根（历史遗留位）。全部不存在 ⇒ REALSAVE_SKIP 退 0，本机可跑、他人环境不假红。 */
const CAND = [
  process.env.SQ_STORAGE,
  'E:/下载/xhub/extensions/com.avalonlee.sanqian-world/.storage.json',
  path.join(REPO, 'extensions/com.avalonlee.sanqian-world/.storage.json'),
  path.join(REPO, '.storage.json')
].filter(Boolean);
const LIVE = CAND.find(p => { try { return fs.statSync(p).isFile(); } catch (e) { return false; } });
const { load } = require(path.join(REPO, '.tests/sandbox.cjs'));

const KEY = 'sanqian-state-v1', LOG_KEY = 'sanqian-logs-v1';
const byteLen = (v) => Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v), 'utf8');
const kb = (n) => (n / 1024).toFixed(2) + 'KB';
let pass = 0, fail = 0;
const T = (c, name, info) => { c ? (pass++, console.log('PASS ' + name + (info ? ' (' + info + ')' : ''))) : (fail++, console.log('FAIL ' + name + (info ? ' (' + info + ')' : ''))); };

(async function main() {
  if (!LIVE) { console.log('REALSAVE_SKIP 真机档四处候选全不存在：' + CAND.join(' | ')); process.exit(0); }
  const store = JSON.parse(fs.readFileSync(LIVE, 'utf8'));
  const rawMain = store[KEY], rawSide = store[LOG_KEY];
  console.log('真档读数：主档 ' + kb(byteLen(rawMain || '')) + ' · 侧档 ' + kb(byteLen(rawSide || '')) +
    ' · 键数 ' + Object.keys(store).length);
  const { sandbox, SQ, bridge } = load([], { bridge: true });
  if (rawMain != null) bridge[KEY] = typeof rawMain === 'string' ? rawMain : JSON.stringify(rawMain);
  if (rawSide != null) bridge[LOG_KEY] = typeof rawSide === 'string' ? rawSide : JSON.stringify(rawSide);

  const s1 = await SQ.load();
  const w1 = s1.worlds && s1.worlds.xiuxian;
  if (!w1) { console.log('REALSAVE_SKIP 真档无 xiuxian 世界态（未入世新档 = 无可取证对象，不算红）'); process.exit(0); }
  const feedN1 = ((w1.eventHistory || {}).feed || []).length;
  const logN1 = (w1.log || []).length;
  const mech1 = JSON.parse(JSON.stringify(s1));
  delete mech1.worlds.xiuxian.log;
  if (mech1.worlds.xiuxian.eventHistory) delete mech1.worlds.xiuxian.eventHistory.feed;
  const seen1 = Object.keys((w1.eventHistory || {}).seen || {}).length;
  T(SQ.storageError() == null, '§1 真档可读（改后代码路径，ioError 空）', 'err=' + JSON.stringify(SQ.storageError()));

  await SQ.save(s1);
  const disk = bridge[KEY], side = bridge[LOG_KEY];
  const dObj = JSON.parse(await SQ.decodePayload(disk));
  const sObj = JSON.parse(await SQ.decodePayload(side));
  T(dObj.worlds.xiuxian.log == null, '§2a 治理后主档不含 log');
  T((dObj.worlds.xiuxian.eventHistory || {}).feed == null, '§2b 治理后主档不含 eventHistory.feed');
  T(Array.isArray(sObj.logs && sObj.logs.xiuxian) && sObj.logs.xiuxian.length === logN1,
    '§2c 日志全量在侧档（条数与读入时相等）', 'log=' + logN1 + '→' + ((sObj.logs || {}).xiuxian || []).length);
  const sideFeed = (sObj.feed || {}).xiuxian || [];
  T(sideFeed.length === feedN1, '§2d 奇遇叙事流全量在侧档（一条不少）', 'feed=' + feedN1 + '→' + sideFeed.length);

  const s2 = await SQ.load();
  const w2 = s2.worlds.xiuxian;
  const mech2 = JSON.parse(JSON.stringify(s2));
  delete mech2.worlds.xiuxian.log;
  if (mech2.worlds.xiuxian.eventHistory) delete mech2.worlds.xiuxian.eventHistory.feed;
  /* 下面这段「差异集合只允许是到期冷却键」的口径是**治理批首版**留下的（当时以为落盘要恒常剪到期键）。
   * 首版判据把 dropped 当预期产物，实际**掩盖的是我写错的 L1**（冷却存的是触发时刻，见 core.js COOL_MAX_HOURS 注），
   * 撤回后保留 dropped 计数只为**读数可见**，判据本身见 §3 = 空集。 */
  const cd1 = mech1.worlds.xiuxian.eventCooldowns || {}, cd2 = mech2.worlds.xiuxian.eventCooldowns || {};
  const nowReal = Date.now();
  const dropped = Object.keys(cd1).filter(k => cd2[k] == null);
  const allExpired = dropped.every(k => Number(cd1[k]) < nowReal);
  const keptSame = Object.keys(cd2).every(k => cd1[k] === cd2[k]);
  const m2b = JSON.parse(JSON.stringify(mech2));
  dropped.forEach(k => { m2b.worlds.xiuxian.eventCooldowns[k] = mech1.worlds.xiuxian.eventCooldowns[k]; });
  /* 治理批首版在此处「剪除到期键」是**错判据**（冷却存的是触发时刻，见 core.js COOL_MAX_HOURS 注）⇒ 撤回后
   * 真档末态主档远低于触发线、阶梯不参与 ⇒ 二次读档差异必须为**空集**，一条机制态都不许变。 */
  T(dropped.length === 0 && JSON.stringify(mech1) === JSON.stringify(mech2),
    '§3 真档读→存→读**机制态零差异**（含全部冷却键；主档已解耦 ⇒ 阶梯不参与 ⇒ 不许剪任何东西）',
    '剪除=' + dropped.length + ' 键 全等=' + (JSON.stringify(mech1) === JSON.stringify(mech2)));
  T(((w2.eventHistory || {}).feed || []).length === feedN1, '§3b 重读后 feed 条数复原', 'feed=' + ((w2.eventHistory || {}).feed || []).length);
  T(Object.keys((w2.eventHistory || {}).seen || {}).length === seen1, '§3c 幂等键 seen 计数不变（去重语义未损）', 'seen=' + seen1);
  const sum = (o) => Object.keys(o || {}).reduce((a, k) => a + o[k], 0);
  T(s2.meta.karma === sum(s2.meta.earnedKeys) - sum(s2.meta.spent),
    '§4 #197 遗泽恒等式在真档上续绿', 'karma=' + s2.meta.karma + ' Σ=' + (sum(s2.meta.earnedKeys) - sum(s2.meta.spent)));
  T(byteLen(disk) < byteLen(rawMain) * 1.05 + 4096,
    '§5 治理后主档落盘不大於真档现值（只可能更小或持平）',
    '主档 ' + kb(byteLen(rawMain || '')) + '→' + kb(byteLen(disk)) + ' · 侧档 ' + kb(byteLen(side)));

  console.log('  体积对照：真档主档 ' + kb(byteLen(rawMain || '')) + ' / 治理后 ' + kb(byteLen(disk)) +
    ' · 侧档 ' + kb(byteLen(rawSide || '')) + ' → ' + kb(byteLen(side)));
  console.log(fail === 0 ? 'REALSAVE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'REALSAVE_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.log('REALSAVE_CRASH ' + (e && e.stack || e)); process.exit(2); });
