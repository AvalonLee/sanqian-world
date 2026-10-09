/* .tests/probe-tdmemo.cjs — 问天奏疏内容诊断探针（一次性调查用，非交付走查）
 * 用法：node .tests/probe-tdmemo.cjs [hexId] [incenseIdx]
 * 读 .storage.json（真实存档）→ 归一 → 临时清零问天冷却并补足灵石 → 调 SQ.Tiandao.ask 生成奏疏，
 * 打印全文与「契约必需行」命中情况（卦位 / 档位 / 旨意清单 / 编年史）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./sandbox.cjs');

const { SQ } = load([]);
const pack = SQ.Worlds.xiuxian.pack;

/* 真玩家档：见 probe-selflearn.cjs 同段注（storage-read.cjs 统一路径与解码口径） */
const { readState } = require('./storage-read.cjs');
const raw = readState('sanqian-state-v1');

const hexId = process.argv[2] || 'wenjie';
const incenseIdx = Number(process.argv[3] || 0);

const s = SQ.normalize(JSON.parse(JSON.stringify(raw)));
const ws = s.worlds[s.profile.worldId];
if (pack.recalcDerived) pack.recalcDerived(ws, s.profile);
const D = SQ.XDATA;

const td = ws.tiandao || {};
console.log('==== 天道状态 ====');
console.log('hex 候选        =', (D.TIANDAO.HEXAGRAMS || []).join(','));
console.log('incense 档位    =', JSON.stringify(D.TIANDAO.INCENSE_RANKS));
console.log('lastAskAt       =', td.lastAskAt, td.lastAskAt ? new Date(td.lastAskAt).toISOString() : '(从未问天)');
console.log('ask（预掷）     =', JSON.stringify(td.ask));
console.log('编年史条数      =', (td.chron || []).length, JSON.stringify((td.chron || []).slice(-12)));
console.log('stats           =', JSON.stringify(td.stats));
console.log('stones          =', ws.stones);
console.log('');

/* 旁路冷却与灵石，直接生成 */
ws.tiandao.lastAskAt = 0;
ws.stones = Math.max(ws.stones, 99999);
const r = SQ.Tiandao.ask(ws, pack, D, s.profile, hexId, incenseIdx, '', Date.now(), s.meta);
console.log('==== ask() 返回 ====');
console.log('ok=', r.ok, 'tier=', r.tier, 'cost=', r.cost, 'reason=', r.reason);
if (!r.ok) process.exit(1);

const text = r.text;
console.log('');
console.log('==== 奏疏全文（' + text.length + ' 字）====');
console.log(text);
console.log('');
console.log('==== 契约必需行命中 ====');
const lines = text.split('\n');
function hit(re) { return lines.filter(function (l) { return re.test(l); }); }
console.log('① 卦位行       =', JSON.stringify(hit(/所卜|卦位/)));
console.log('② 档位行       =', JSON.stringify(hit(/香火.*灵石|档/)));
console.log('③ 旨意清单行   =', JSON.stringify(hit(/type 只能选/)));
console.log('④ 编年史头     =', JSON.stringify(hit(/【编年史】/)));
const ci = lines.findIndex(function (l) { return /【编年史】/.test(l); });
console.log('⑤ 编年史条目数 =', ci >= 0 ? lines.slice(ci + 1).filter(function (l) { return /^是日/.test(l); }).length : '(无编年史头)');
console.log('⑥ 统计行       =', JSON.stringify(hit(/^累计：/)));
