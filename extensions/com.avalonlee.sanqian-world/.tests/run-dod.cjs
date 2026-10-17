/* .tests/run-dod.cjs — 收口全量复跑一条命令（2026-10-08 文档效率批）
 * 立因：`.tests/README.md` 的「DoD 预检」是 14 条手敲命令 + 界面走查 25 条，历批收口全靠临场 shell 循环
 *   现拼（本会话就拼了两次），而本仓纪律明确要求「逐篇末行读数**由脚本求和、不手算」——
 *   手算总数正是 FACTS 里那条「十七篇却只列 16 篇、282+16=298 恰好闭合」勘误的成因。
 * 用法：
 *   node .tests/run-dod.cjs            快速预检（无浏览器依赖 · 件数与断言合计**只认末行** `DOD_ALL_GREEN n 件 / 断言合计 m`，注释不抄数）
 *   node .tests/run-dod.cjs --ui       追加界面走查（需 playwright-core + Edge，约 8~15 分钟：每篇各起一次浏览器）
 *   node .tests/run-dod.cjs --sim      追加 sim-playthrough 全量（约 10~20 分钟，收口必跑）
 *   node .tests/run-dod.cjs --full     = --ui --sim
 * 判据：末行 DOD_ALL_GREEN <件数>；任一子件红 ⇒ 末行 DOD_FAILED <清单> 且退码 1。
 * 本件只**调用**既有脚本、不改任何判据口径，红绿完全由被调件自己的末行标记决定（不造第二套判据）。
 * 两件随批B 加的副产品（都不造判据）：① 逐件读数落 `.tests/dod-last.json`（按件名合并保留最新，
 *   供 `gen-ledger.cjs` 取数 = 「读数由出厂探针自己打印」的落点）；② 红件按 `docs/ledger.json` 的
 *   `attrib` 映射打印相关同动点与最小复现命令（把"红了以后不知道改哪"变成读一行）。
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

/* 逐件读数落盘 `.tests/dod-last.json`：按件名合并（快速预检不会抹掉上一次 --ui/--sim 的读数），
 * **每跑完一件立刻写**——gen-ledger 是本件的下游第 ⑰ 件，它读到的必须是本次运行的数据，
 * 否则账本会用上一轮的读数判本轮的漂（2026-10-14 批B 实测过这个坑）。 */
const DOD_JSON = path.join(ROOT, '.tests', 'dod-last.json');
let prevItems = {};
try { prevItems = JSON.parse(fs.readFileSync(DOD_JSON, 'utf8')).items || {}; } catch (e) { /* 首次无档 = 正常 */ }
const seen = Object.assign({}, prevItems);
let runs = 0, runAsserts = 0, runSecs = 0;
function persist(x) {
  seen[x.label.trim()] = { ok: x.ok, asserts: x.sum || 0, secs: x.secs, at: new Date().toISOString() };
  runs++; runAsserts += x.sum || 0; runSecs += x.secs;
  fs.writeFileSync(DOD_JSON, JSON.stringify({
    items: seen,
    lastRun: { at: new Date().toISOString(), args: argv, count: runs, asserts: runAsserts, secs: Number(runSecs.toFixed(1)) }
  }, null, 1), 'utf8');
}

const results = [];
function step(label, rel, args, opts) {
  const x = run(label, rel, args, opts);
  results.push(x); persist(x); return x;
}
console.log('=== DoD 收口复跑' + (wantUI || wantSim ? '（含' + [wantUI ? '界面走查' : '', wantSim ? '全量模拟' : ''].filter(Boolean).join('+') + '）' : '（快速预检）') + ' ===');

/* ① 引擎与静态审计 */
step('smoke', '.tests/run-smoke.cjs');
step('audit', '.tests/audit.cjs');
/* ② 仿真三件（事件经济固定种子；playthrough 默认跳过，--sim 才跑）*/
step('sim-pacing', '.tests/sim-pacing.cjs');
step('sim-event-economy', '.tests/sim-event-economy.cjs', ['2', '20261008']);
if (wantSim) step('sim-playthrough', '.tests/sim-playthrough.cjs', ['1', '20261008']);
/* ③ 常驻探针十一路（2026-10-08 probe-savecodec · 2026-10-09 probe-savegrowth 解耦曲线 / probe-realsave 真机档零丢失 / probe-eventrepeat 奇遇重复率）+ 水位件 */
for (const p of ['probe-join', 'probe-sectwire', 'probe-heirchoice', 'probe-lawmerge',
  'probe-achvreach', 'probe-normround', 'probe-savecodec', 'probe-savegrowth', 'probe-realsave', 'probe-eventrepeat', 'probe-savecap']) {
  step(p, '.tests/' + p + '.cjs');
}
/* ④ 版本总账 ↔ 卷头对账（不 --fix：收口时应当是已同步态，漂了就红）*/
step('versions-check', '.tests/versions-check.cjs');
/* ⑤ 界面走查（逐篇末行求和，绝不手算）*/
if (wantUI) {
  const ui = fs.readdirSync(path.join(ROOT, '.tests')).filter((f) => /^verify-ui-.*\.cjs$/.test(f)).sort();
  console.log('  ── 界面走查 ' + ui.length + ' 篇 ──');
  for (const f of ui) step('  ' + f.replace(/^verify-ui-|\.cjs$/g, ''), '.tests/' + f);
}
/* ⑥ 账本对账 + 反证（2026-10-14 结构整治批B）：只判漂、不代跑测试、不带 --fix。
 *    它排在最后 = 前面各件本次运行的读数已经写进 dod-last.json，判的是本轮而不是上一轮。*/
step('gen-ledger', '.tests/gen-ledger.cjs');
step('ledger-selftest', '.tests/ledger-selftest.cjs');

const bad = results.filter((x) => !x.ok);
const totalAssertions = results.reduce((n, x) => n + (x.sum || 0), 0);
const wall = results.reduce((n, x) => n + x.secs, 0).toFixed(1);
console.log('件数=' + results.length + ' · 断言合计=' + totalAssertions + ' · 累计墙钟=' + wall + 's');

if (bad.length) {
  console.log('DOD_FAILED ' + bad.length + ' 件: ' + bad.map((x) => x.label.trim()).join(', '));
  /* 失败归因：件 → 相关同动点（映射的正典在 gen-ledger 的 SPEC.attrib，随账本落盘）*/
  let attrib = {};
  try { attrib = JSON.parse(fs.readFileSync(path.join(require('./repo-root.cjs')() || ROOT, 'docs', 'ledger.json'), 'utf8')).attrib || {}; } catch (e) { /* 账本未生成时不给假指引 */ }
  bad.forEach((x) => {
    const k = x.label.trim();
    const a = attrib[k];
    if (!a) return;
    console.log('  归因 [' + k + '] 事实源: ' + a.src);
    if (a.touches && a.touches.length) console.log('           同动点: ' + a.touches.join(' · '));
    if (a.repro) console.log('           最小复现: ' + a.repro);
  });
  process.exit(1);
}
console.log('DOD_ALL_GREEN ' + results.length + ' 件 / 断言合计 ' + totalAssertions);
