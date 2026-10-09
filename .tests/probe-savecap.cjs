/* .tests/probe-savecap.cjs — 存档容量红线探针（2026-10-05 容量防线批）
 * 目的：量化「卡片化批天骄扩容」对主档最坏态的字节贡献，并为压缩级落点提供实测依据。
 * 背景：#206 最坏态模型仍按旧口径造 4 个天骄、且不造 prodMarks.rankRows 榜面快照，
 *   与真实上限（COUNT_MAX 30 + 快照 31 行）脱节 → 断言绿而 sim-playthrough 越 50KB 红线。
 * 用法：node .tests/probe-savecap.cjs
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { SQ } = load([], { quiet: true });
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;
const PD = D.PRODIGY || {};

function bytes(o) {
  const s = JSON.stringify(o);
  let n = 0;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); n += c > 0x7ff ? 3 : (c > 0x7f ? 2 : 1); }
  return n;
}

/* 单条天骄记录（照 #206 最坏态同构：带 talents 长 id / boost / wl / feud 全字段） */
function mkProdigy(i) {
  return {
    id: 'pr' + (i + 1), nm: [8, 6, 4], tl: ['talent_a_long_id', 'talent_b_long_id'],
    al: 2, fc: 15, fid: 'faction_id_long', apt: 2, rlm: 9, prg: 0,
    feud: i === 0, feudBond: 70, lastSparAt: 1, rivAt: 1,
    boost: { add: 0.1, months: 3 }, eternal: i === 0, wl: [99, 99, 99]
  };
}
/* 榜面快照行（照 prodigy.js rankRows 写入口同构） */
function mkRow(i) {
  return { me: i === 0, id: i === 0 ? null : 'pr' + i, realm: 9, power: 1234567.89 };
}

const oldProd = Array.from({ length: 4 }, (_, i) => mkProdigy(i));
const newProd = Array.from({ length: PD.COUNT_MAX }, (_, i) => mkProdigy(i));
const snap = Array.from({ length: PD.COUNT_MAX + 1 }, (_, i) => mkRow(i));

console.log('═══ 存档容量红线探针（probe-savecap）═══');
console.log('参数口径：COUNT_MAX=' + PD.COUNT_MAX + ' BOARD_SHOW=' + PD.BOARD_SHOW +
  ' RANK_REFRESH_MS=' + PD.RANK_REFRESH_MS + '（= ' + (PD.RANK_REFRESH_MS / 360000) + ' 游戏年）');
console.log('');
console.log('--- 天骄侧字节贡献 ---');
console.log('  单条天骄记录            = ' + bytes(mkProdigy(1)) + 'B');
console.log('  prodigies 旧口径 4 条   = ' + bytes(oldProd) + 'B   ← #206 最坏态模型当前假设');
console.log('  prodigies 满档 30 条    = ' + bytes(newProd) + 'B   ← 真实上限（遗泽 prodigySlot 解锁）');
console.log('  差额（未入 #206 模型）  = +' + (bytes(newProd) - bytes(oldProd)) + 'B');
console.log('  单行榜面快照            = ' + bytes(mkRow(1)) + 'B');
console.log('  rankRows 满档 31 行     = ' + bytes(snap) + 'B   ← #206 最坏态模型完全未造此字段');
console.log('  两项合计未建模增量      = +' + ((bytes(newProd) - bytes(oldProd)) + bytes(snap)) + 'B' +
  '  ≈ ' + (((bytes(newProd) - bytes(oldProd)) + bytes(snap)) / 1024).toFixed(2) + 'KB');
console.log('');

/* 裁剪收益：rankRows 是纯展示流（Prodigy.rankRows() 无快照返回 null → 视图回落实时榜） */
const ws = pack.initialState();
ws.realm = 9;
ws.prodigies = newProd;
ws.prodMarks = { slotMax: PD.COUNT_MAX, rankAt: 1700000000000, rankRows: snap, sudiWin: 1 };
const before = bytes({ prodigies: ws.prodigies, prodMarks: ws.prodMarks });
const marksTrimmed = { slotMax: ws.prodMarks.slotMax, rankAt: ws.prodMarks.rankAt, sudiWin: ws.prodMarks.sudiWin };
const after = bytes({ prodigies: ws.prodigies, prodMarks: marksTrimmed });
console.log('--- 候选压缩级收益（裁 prodMarks.rankRows）---');
console.log('  天骄侧合计（裁前）      = ' + before + 'B');
console.log('  天骄侧合计（裁后）      = ' + after + 'B');
console.log('  单级收益                = −' + (before - after) + 'B  ≈ −' + ((before - after) / 1024).toFixed(2) + 'KB');
console.log('  prodigySlot 标记保留    = ' + (marksTrimmed.slotMax === PD.COUNT_MAX) +
  '（槽位不复用：斩杀出榜者占号依赖 slotMax，不可裁）');
console.log('');

/* 回落路径实证：裁掉 rankRows 后 rankRows() 必须返回 null，视图据此回落实时榜 */
const wsNoSnap = pack.initialState();
wsNoSnap.realm = PD_RL(D);
wsNoSnap.prodigies = newProd;
wsNoSnap.prodMarks = marksTrimmed;
function PD_RL(dd) { return (dd.TAB_UNLOCK || {}).prodigy.r; }
const fallback = SQ.Prodigy.rankRows(wsNoSnap);
const live = SQ.Prodigy.board(wsNoSnap, pack, D);
console.log('--- 回落路径实证（裁剪零功能损失的前提）---');
console.log('  rankRows(无快照)        = ' + JSON.stringify(fallback) + '  → 视图回落实时榜');
console.log('  board() 实时榜可用      = ' + (!!live && Array.isArray(live.rows)) +
  '（rows=' + (live && live.rows ? live.rows.length : -1) + ' myRank=' + (live ? live.myRank : -1) + '）');
console.log('');

/* 红线余量核算：红线与触发线读 core.js 导出的单一事实源（旧版三处硬编码 50/45 已废）
 * breachMaxKB = 2026-10-05 事故时 sim-playthrough 实测越线峰值，保留作历史参照 */
const breachMaxKB = 50.7;
const redKB = SQ.SAVE_RED / 1024, trigKB = SQ.SAVE_TRIGGER / 1024;
const gainKB = (before - after) / 1024;
console.log('--- 红线余量核算（**历史峰值换算段**）---');
console.log('  ⚠️ 口径注（2026-10-09 存档治理批加）：下面三个数是把 2026-10-05 事故现场的 sim-playthrough ' +
  '越线峰值（当时主档仍含 log 与 eventHistory.feed）减去级⑨ 单级收益后的**历史换算**，' +
  '**不是现行最坏态读数**。现行读数请看：冒烟 #206 落盘字节（本批 60841B → 59402B / 红线余量 6134B = 9.4%）' +
  '与 `.tests/probe-savegrowth.cjs` §1（展示流出主档后的增长解耦曲线）。本件仍留作的用途 = 量化**级⑨ 单级收益**。');
console.log('  历史越线峰值            = ' + breachMaxKB + 'KB（sim-playthrough 乙·全修1 步 4499 · 含展示流时代）');
console.log('  单级收益                = −' + gainKB.toFixed(2) + 'KB → 裁后峰值 ≈ ' + (breachMaxKB - gainKB).toFixed(2) + 'KB');
console.log('  对 ' + redKB + 'KB 红线          = ' + (breachMaxKB - gainKB <= redKB ? '✅ 回带内' : '❌ 仍越线') +
  '（**历史口径**余量 ' + (redKB - (breachMaxKB - gainKB)).toFixed(2) + 'KB）');
console.log('  对 ' + trigKB + 'KB 触发线        = ' + (breachMaxKB - gainKB <= trigKB ? '✅ 阶梯可停' : '⚠ 仍高于触发线（阶梯耗尽态落盘，但已在红线内）') + '（历史口径）');
console.log('PROBE_SAVECAP_DONE');
