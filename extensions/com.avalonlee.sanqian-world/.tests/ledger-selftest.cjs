/* .tests/ledger-selftest.cjs — D1 账本门禁的常驻反证（2026-10-14 结构整治批B）
 * 立因：本仓纪律「回归锚先证它对本维有鉴别力」。生成器唯一的能力就是批量改写 157 KB 文档，
 *   判据写歪的破坏面比历批任何引擎缺陷都大，所以反证常驻而不是手工做一次。
 * 判全部在内存里做，**不写工作树**（反证不该把仓库弄脏）；条数看末行 `LEDGER_SELFTEST_DONE n 判`，本行不抄数。
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
const real = fs.readFileSync(path.join(G.REPO, seg.file), 'utf8');
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

/* ⑥ 拒写守卫（第册四一批 G2 演练立）：本机缺证据时 --fix 不许把降级读数写进正典 */
const PREVD = { ui_files: 35, ui_asserts: 776, probe_asserts: 250 };
const degraded = Object.assign({}, v, { ui_asserts: null, probe_asserts: 238 });
const r6 = G.refuseFix(degraded, PREVD);
ok('⑥ 未跑 / 探针被压低 ⇒ 拒写（两条都报）', r6.length === 2, r6.join(' ‖ '));
ok('⑥ 读数齐且不低于在册 ⇒ 不拒写（正常收口不受影响）',
  G.refuseFix(Object.assign({}, v, { ui_asserts: 776, probe_asserts: 250 }), PREVD).length === 0 &&
    G.refuseFix(Object.assign({}, v, { ui_asserts: 776, probe_asserts: 251 }), PREVD).length === 0,
  'degraded 判 ' + r6.length + ' 条');
const r81 = (o) => G.refuseFix(Object.assign({}, v, { probe_asserts: 250 }, o), PREVD).length;
ok('⑥ 篇数齐 / 篇增但断言合计下降 ⇒ 拒写（N81：走查有篇红、该篇整篇不计这一形）',
  r81({ ui_files: 35, ui_asserts: 700 }) === 1 &&
  r81({ ui_files: 36, ui_asserts: 700 }) === 1 &&
  r81({ ui_files: 35, ui_asserts: 776 }) === 0 &&
  r81({ ui_files: 35, ui_asserts: 800 }) === 0 &&
  r81({ ui_files: 30, ui_asserts: 700 }) === 0,
  '篇齐+降=' + r81({ ui_files: 35, ui_asserts: 700 }) + ' 篇增+降=' + r81({ ui_files: 36, ui_asserts: 700 }) +
  ' 齐平=' + r81({ ui_files: 35, ui_asserts: 776 }) + ' 升=' + r81({ ui_files: 35, ui_asserts: 800 }) +
  ' 篇减=' + r81({ ui_files: 30, ui_asserts: 700 }));

console.log(fails ? 'LEDGER_SELFTEST_FAILED ' + fails + '/' + n : 'LEDGER_SELFTEST_DONE ' + n + ' 判');
process.exit(fails ? 1 : 0);
