/* .tests/run-dod.cjs — 收口全量复跑一条命令（2026-10-08 文档效率批）
 * 立因：`.tests/README.md` 的「DoD 预检」是 14 条手敲命令 + 界面走查 25 条，历批收口全靠临场 shell 循环
 *   现拼（本会话就拼了两次），而本仓纪律明确要求「逐篇末行读数**由脚本求和、不手算」——
 *   手算总数正是 FACTS 里那条「十七篇却只列 16 篇、282+16=298 恰好闭合」勘误的成因。
 * 用法：
 *   node .tests/run-dod.cjs            快速预检（无浏览器依赖 14 件 + 版本总账对账，约 2~4 分钟）
 *   node .tests/run-dod.cjs --ui       追加界面走查 25 篇（需 playwright-core + Edge，约 8~10 分钟）
 *   node .tests/run-dod.cjs --sim      追加 sim-playthrough 全量（约 10~20 分钟，收口必跑）
 *   node .tests/run-dod.cjs --full     = --ui --sim
 * 判据：末行 DOD_ALL_GREEN <件数>；任一子件红 ⇒ 末行 DOD_FAILED <清单> 且退码 1。
 * 本件只**调用**既有脚本、不改任何判据口径，红绿完全由被调件自己的末行标记决定（不造第二套判据）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const wantUI = argv.indexOf('--ui') >= 0 || argv.indexOf('--full') >= 0;
const wantSim = argv.indexOf('--sim') >= 0 || argv.indexOf('--full') >= 0;

/* 末行绿灯标记 → 断言数提取（`XXX_ALL_GREEN 17/17` / `SMOKE_ALL_GREEN 276/276`）*/
const GREEN = /([A-Z_]*(?:ALL_GREEN|DONE|GREEN))\s+(\d+)\s*\/\s*(\d+)/;

function run(label, rel, args, opts) {
  const o = opts || {};
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, rel)].concat(args || []),
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: Object.assign({}, process.env, o.env || {}) });
  const out = (r.stdout || '') + (r.stderr || '');
  const lines = out.split(/\r?\n/).filter(Boolean);
  const tail = lines[lines.length - 1] || '';
  const m = out.match(new RegExp(GREEN.source, 'g')) || [];
  let sum = 0, pairs = [];
  for (const seg of m) {
    const g = seg.match(GREEN);
    if (g) { sum += Number(g[2]); pairs.push(g[2] + '/' + g[3]); }
  }
  const red = /FAIL|CRASH|_ERR|Error|Traceback/.test(tail) || r.status !== 0;
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log((red ? '  ✗ ' : '  ✓ ') + label.padEnd(26) +
    (pairs.length ? String(sum).padStart(6) + ' 断言 ' : '        ') +
    (tail.length > 60 ? tail.slice(-60) : tail) + '  [' + secs + 's]');
  return { label, ok: !red, sum, secs: Number(secs) };
}

const results = [];
console.log('=== DoD 收口复跑' + (wantUI || wantSim ? '（含' + [wantUI ? '界面走查' : '', wantSim ? '全量模拟' : ''].filter(Boolean).join('+') + '）' : '（快速预检）') + ' ===');

/* ① 引擎与静态审计 */
results.push(run('smoke', '.tests/run-smoke.cjs'));
results.push(run('audit', '.tests/audit.cjs'));
/* ② 仿真三件（事件经济固定种子；playthrough 默认跳过，--sim 才跑）*/
results.push(run('sim-pacing', '.tests/sim-pacing.cjs'));
results.push(run('sim-event-economy', '.tests/sim-event-economy.cjs', ['2', '20261008']));
if (wantSim) results.push(run('sim-playthrough', '.tests/sim-playthrough.cjs', ['1', '20261008']));
/* ③ 常驻探针十一路（2026-10-08 probe-savecodec · 2026-10-09 probe-savegrowth 解耦曲线 / probe-realsave 真机档零丢失 / probe-eventrepeat 奇遇重复率）+ 水位件 */
for (const p of ['probe-join', 'probe-sectwire', 'probe-heirchoice', 'probe-lawmerge',
  'probe-achvreach', 'probe-normround', 'probe-savecodec', 'probe-savegrowth', 'probe-realsave', 'probe-eventrepeat', 'probe-savecap']) {
  results.push(run(p, '.tests/' + p + '.cjs'));
}
/* ④ 版本总账 ↔ 卷头对账（不 --fix：收口时应当是已同步态，漂了就红）*/
results.push(run('versions-check', '.tests/versions-check.cjs'));
/* ⑤ 界面走查 25 篇（逐篇末行求和，绝不手算）*/
if (wantUI) {
  const ui = fs.readdirSync(path.join(ROOT, '.tests')).filter((f) => /^verify-ui-.*\.cjs$/.test(f)).sort();
  console.log('  ── 界面走查 ' + ui.length + ' 篇 ──');
  for (const f of ui) results.push(run('  ' + f.replace(/^verify-ui-|\.cjs$/g, ''), '.tests/' + f));
}

const bad = results.filter((x) => !x.ok);
const totalAssertions = results.reduce((n, x) => n + (x.sum || 0), 0);
const wall = results.reduce((n, x) => n + x.secs, 0).toFixed(1);
console.log('件数=' + results.length + ' · 断言合计=' + totalAssertions + ' · 累计墙钟=' + wall + 's');
if (bad.length) {
  console.log('DOD_FAILED ' + bad.length + ' 件: ' + bad.map((x) => x.label.trim()).join(', '));
  process.exit(1);
}
console.log('DOD_ALL_GREEN ' + results.length + ' 件 / 断言合计 ' + totalAssertions);
