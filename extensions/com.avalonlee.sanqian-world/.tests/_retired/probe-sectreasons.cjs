/* .tests/probe-sectreasons.cjs — 自立门户「开宗立派」失败原因全集取证（只读，供账本登记）
 * 背景：view/index.html 的 sectFound 处理段拼 `'sect.ui.fail.' + rFd.reason` 取词，
 *   而 lexicon-sect.js（本探针作者无权改动）里 `sect.ui.fail.*` 一条键都没有 ⇒ 兜底把
 *   reason 裸上屏（与 C3 炼丹族同病）。本探针把 reason 全集**跑出来**，并逐条查词表命中情况。
 * 用法：node .tests/probe-sectreasons.cjs
 */
'use strict';
const { load } = require('./sandbox.cjs');
const { SQ } = load([]);
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;
const lex = Object.assign({}, SQ.LEX.common, SQ.LEX.xiuxian);

function mk(o) { const ws = pack.normalize({}); Object.assign(ws, o); return ws; }
const good = { realm: 5, factionId: 'qingyi', factionRepPeak: 3000, officeRank: 5 };
const metaOk = { unlocks: { sect: true } };

const cases = [
  ['realm', () => mk({ realm: 3 }), 'wuyue', 'neutral', '', metaOk],
  ['identity', () => mk({ realm: 5, factionRepPeak: 3000 }), 'wuyue', 'neutral', '', metaOk],
  ['peak', () => mk(Object.assign({ realm: 5, factionId: 'qingyi', officeRank: 5, factionRepPeak: 10 })), 'wuyue', 'neutral', '', metaOk],
  ['unlock', () => mk(good), 'wuyue', 'neutral', '', { unlocks: {} }],
  ['has', () => mk(Object.assign({ sect: {} }, good)), 'wuyue', 'neutral', '', metaOk],
  ['done', () => mk(Object.assign({ sect: { succession: true } }, good)), 'wuyue', 'neutral', '', metaOk],
  ['gate', () => mk(good), 'nosuchgate', 'neutral', '', metaOk],
  ['align', () => mk(good), 'wuyue', 'dark', '', metaOk],
  ['name', () => mk(good), 'wuyue', 'neutral', '法轮圣功', metaOk]
];

console.log('开宗 canFound/foundSect 实跑枚举（reason → 词表命中）');
const seen = [];
for (const [want, mkf, gate, align, nm, meta] of cases) {
  let r;
  try {
    r = SQ.Sect.foundSect(mkf(), pack, D, meta, gate, nm, null, align, Date.now(), null);
  } catch (e) { r = { ok: false, reason: 'THREW:' + e.message }; }
  const got = r && r.ok ? 'OK' : (r && r.reason);
  seen.push(got);
  const fk = 'sect.ui.fail.' + got;
  console.log('  期望 ' + want.padEnd(9) + ' 实跑 ' + String(got).padEnd(9) +
    '  键 ' + (lex[fk] != null ? '有 ' + lex[fk] : '缺') +
    '  （同义既有键 ' + (lex['sect.ui.gate.' + got] != null ? 'sect.ui.gate.' + got : '—') + '）');
}
const uniq = Array.from(new Set(seen)).sort();
console.log('reason 全集 = ' + uniq.join(' / ') + ' （' + uniq.length + ' 条）');
const fam = Object.keys(lex).filter((k) => k.indexOf('sect.ui.fail.') === 0);
console.log('lexicon-sect.js 现有 sect.ui.fail.* 键数 = ' + fam.length + '  ⇒ 该族 ' + uniq.length + ' 条全缺');
console.log('可原位复用的同义键（sect.ui.gate.*）= ' +
  uniq.filter((r) => lex['sect.ui.gate.' + r] != null).join(' / '));
console.log('必须新铸的键 = ' + uniq.filter((r) => lex['sect.ui.gate.' + r] == null)
  .map((r) => 'sect.ui.fail.' + r).join(' / '));
console.log('PROBE_SECTREASONS_DONE');
