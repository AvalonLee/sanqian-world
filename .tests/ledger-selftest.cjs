/* .tests/ledger-selftest.cjs — D1 账本门禁的常驻反证（2026-10-14 结构整治批B）
 * 立因：本仓纪律「回归锚先证它对本维有鉴别力」。生成器唯一的能力就是批量改写 157 KB 文档，
 *   判据写歪的破坏面比历批任何引擎缺陷都大，所以反证常驻而不是手工做一次。
 * 五判全部在内存里做，**不写工作树**（反证不该把仓库弄脏）。
 * 用法：node .tests/ledger-selftest.cjs  → 末行 LEDGER_SELFTEST_DONE n 判 / 有红则 LEDGER_SELFTEST_FAILED 且退码 1
 */
'use strict';
const fs = require('fs');
const path = require('path');
const G = require('./gen-ledger.cjs');

let n = 0, fails = 0;
function ok(name, cond, detail) {
  n++;
  if (!cond) { fails++; console.log('FAIL ' + name + (detail ? ' (' + detail + ')' : '')); }
  else console.log('PASS ' + name + (detail ? ' (' + detail + ')' : ''));
}

const v = G.compute();
ok('取数：扩展版本非空', !!v.ext_version, 'ext_version=' + v.ext_version);
ok('取数：冒烟读数为正整数（缺 dod-last.json 请先跑 run-dod）',
  typeof v.smoke === 'number' && v.smoke > 0, 'smoke=' + v.smoke);

/* ① 干净必绿：真实文件当前各段必须与渲染值一致 */
const clean = G.check(v);
ok('① 现行文档无漂', clean.drift.length === 0 && clean.missing.length === 0,
  'drift=' + clean.drift.map((d) => d.seg.file).join(',') + ' missing=' + clean.missing.join(','));

/* ② 造漂必红：把 FACTS 段内一个值改坏，判据必须检出差异 */
const seg = G.SEGMENTS[0];
const real = fs.readFileSync(path.join(G.ROOT, seg.file), 'utf8');
const want = seg.render(v);
const regClean = G.region(real, seg.name);
ok('② 段体抽取正确（与渲染一致）', regClean.body === want);
const tampered = real.replace('| 扩展版本 | `' + v.ext_version + '` |', '| 扩展版本 | `9.9.9` |');
ok('③ 造漂样本确实改到了段内', tampered !== real && G.region(tampered, seg.name).body !== want);

/* ④ 缺段 / 断段必报 missing（不能悄悄当无漂通过）*/
ok('④ 缺哨兵段报 missing', G.region('正文里没有标记', seg.name).missing === true);
const cut = real.slice(0, real.indexOf(G.END) - 4);
ok('④ 段未闭合报 missing', G.region(cut, seg.name).missing === true && G.region(cut, seg.name).unterminated === true);

/* ⑤ 段外一字不动：模拟 --fix 的拼接结果，历史注必须原样存活 */
const histLine = '**批次史指针（2026-10-08 文档效率批）**';
const i = real.indexOf(G.BEGIN(seg.name)), j = real.indexOf(G.END) + G.END.length;
const next = real.slice(0, i + G.BEGIN(seg.name).length) + '\n' + '换掉的内容\n' + real.slice(j);
ok('⑤ 段外历史注逐字存活（生成器只动标记之间）',
  next.indexOf(histLine) >= 0 && next.slice(0, i) === real.slice(0, i) &&
  next.indexOf('换掉的内容') >= 0 && next.indexOf(regClean.body) < 0);

console.log(fails ? 'LEDGER_SELFTEST_FAILED ' + fails + '/' + n : 'LEDGER_SELFTEST_DONE ' + n + ' 判');
process.exit(fails ? 1 : 0);
