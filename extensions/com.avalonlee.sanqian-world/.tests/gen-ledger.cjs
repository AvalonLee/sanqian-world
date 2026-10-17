/* .tests/gen-ledger.cjs — 现行读数账本对账与生成（2026-10-14 结构整治批B）
 * 立因：历批收口都要手抄同一组读数（冒烟 / 审计 / 探针 / 走查 / DoD / 落盘 / 扩展版本），
 *   它们在 ≥4 个文件里各有一份抄本；versions-check 已证「能自动对的账就不该靠手抄」，本件把
 *   同一口径推广到计数类读数，并把扩展版本的六处同动压成一处（其余各处的**数值**改成指针或生成段）。
 * 事实源方向（用户裁定）：机制计数 = 探针/清单实值为准，文档漂了 `--fix` 刷文档；
 *   带语义的拆分口径（如功法 70 = 黄 14/玄 18/地 22/天 13+独占 3）= 文档为正典，本件不复算不加戏。
 * 取数纪律：**本件不跑任何测试**，只读 `.tests/dod-last.json`（run-dod 每次落盘的逐件读数）、
 *   `manifest.json`、`.tests` 目录清单与 vm 沙箱装载出的数据表长度。缺读数 ⇒ 该条记 null 并打印
 *   MISSING（绝不拿 0 顶掉一条真实读数 —— 本仓 SKIP 假绿的同型面）。
 * 哨兵段纪律：只重写 `<!-- SQ:LEDGER:BEGIN <名> -->` 与 `<!-- SQ:LEDGER:END -->` 之间的行；
 *   **段外一字不动**（历史注不可改写的机械保证）。
 * 用法：node .tests/gen-ledger.cjs          只判漂 → 末行 LEDGER_IN_SYNC n / LEDGER_DRIFT m（漂 ⇒ 退码 1）
 *       node .tests/gen-ledger.cjs --fix    写 docs/ledger.json + 刷各段，末行 LEDGER_FIXED m / LEDGER_IN_SYNC
 * 反证常驻件：.tests/ledger-selftest.cjs（造漂必红 / 干净必绿 / 段外改动必报）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');   /* 扩展根：assets / view / module / .tests / manifest.json */
/* 仓库根（docs/ 与 README.md 所在）自 2026-10-14 GitHub 整理批起与扩展根分开：项目文件只留扩展目录那一份。
 * 定位失败必须报错退出，绝不拿空路径当「无漂」通过（本仓 SKIP 假绿反复登记过）。 */
const REPO = require('./repo-root.cjs')();
const FIX = process.argv.indexOf('--fix') >= 0;
const BEGIN = (name) => '<!-- SQ:LEDGER:BEGIN ' + name + ' 现行读数由 .tests/gen-ledger.cjs 生成，手改即漂；段外不参与覆盖 -->';
const END = '<!-- SQ:LEDGER:END -->';

/* ── 取数 ─────────────────────────────────────────────── */
function readJSON(rel) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); }
  catch (e) { return null; }
}
function uiFiles() {
  return fs.readdirSync(path.join(ROOT, '.tests')).filter((f) => /^verify-ui-.*\.cjs$/.test(f)).sort();
}
const HEADLESS = ['smoke', 'audit', 'sim-pacing', 'sim-event-economy', 'sim-playthrough', 'versions-check'];
function poolCounts() {
  /* 池规模一律问数据表本身（沙箱装载顺序 = view/index.html 单源，批A 已收口）*/
  const { SQ } = require('./sandbox.cjs').load([], { quiet: true });
  const D = SQ.XDATA, p = SQ.Worlds.xiuxian.pack;
  const len = (a) => (Array.isArray(a) ? a.length : null);
  return {
    arts: Object.keys(p.artsMap()).length,
    zones: len(D.ZONES), realms: len(D.REALMS), companions: len(D.COMPANIONS),
    caves: len(D.CAVES), factions_fixed: len(D.FACTIONS_FIXED),
    achv: len(D.CODEX.ACHV), mats: len(D.ALCHEMY.MATS),
    recipes: len(D.ALCHEMY.RECIPES), blueprints: len(D.ALCHEMY.BLUEPRINTS),
    worlds: Object.keys(SQ.Worlds).length,
    live_worlds: SQ.visibleWorlds().length,
    name_pool: ['prefix', 'middle', 'suffix'].map((k) => SQ.Worlds.xiuxian.nameParts[k].length).join(' × '),
    lex_keys: (function () { let n = 0; for (const w in SQ.LEX) n += Object.keys(SQ.LEX[w]).length; return n; })()
  };
}

function compute() {
  const man = readJSON('manifest.json');
  const dod = readJSON('.tests/dod-last.json');
  const v = {};
  v.ext_version = man && man.version ? man.version : null;
  if (!dod) { v.dod_missing = true; return v; }
  const it = dod.items || {};
  /* 红件的末行常常自带一个残缺读数（例如 AUDIT_FAILED 只剩 20/22）——那种数不许进账本，
   * 更不许被 --fix 刷进文档：一律当「未跑」，等它跑绿再说。 */
  const live = {};
  Object.keys(it).forEach((k) => { if (it[k] && it[k].ok) live[k] = it[k]; });
  const get = (k) => (live[k] && live[k].asserts ? live[k].asserts : null);
  v.dod_items = dod.lastRun ? dod.lastRun.count : null;
  v.dod_asserts = dod.lastRun ? dod.lastRun.asserts : null;
  v.dod_secs = dod.lastRun ? dod.lastRun.secs : null;
  v.smoke = get('smoke');
  v.audit_gates = get('audit');
  v.versions_rows = null;
  let probe = 0, probeRun = false;
  Object.keys(live).forEach((k) => { if (/^probe-/.test(k)) { probe += live[k].asserts || 0; probeRun = true; } });
  v.probe_asserts = probeRun ? probe : null;
  const uiSet = uiFiles().map((f) => f.replace(/^verify-ui-|\.cjs$/g, ''));
  v.ui_files = uiSet.length;
  const uiSum = uiSet.reduce((n, k) => n + ((live[k] && live[k].asserts) || 0), 0);
  v.ui_asserts = uiSet.some((k) => live[k]) ? uiSum : null;
  v.sim_playthrough = live['sim-playthrough'] ? true : false;
  try { Object.assign(v, poolCounts()); } catch (e) { v.pool_error = e.message.slice(0, 80); }
  return v;
}

/* ── 渲染 ─────────────────────────────────────────────── */
const f = (x) => (x === null || x === undefined ? '未跑' : x);
/* shortcut: 渲染里刻意**不含**「DoD 件数/断言合计」——gen-ledger 自己是 run-dod 的第 ⑰⑱ 件，
 * 把运行总数写进被它对账的段里就是自指，永远差自己这两件。该两项只落 docs/ledger.json 供人看。 */
function oneLine(v) {
  return '- **现行读数**（本行由 `.tests/gen-ledger.cjs` 生成）：扩展版本 `' + f(v.ext_version) +
    '` · 冒烟 ' + f(v.smoke) + ' · 审计 ' + f(v.audit_gates) + ' 关 · 常驻探针 ' + f(v.probe_asserts) +
    ' 断言 · 界面走查 ' + f(v.ui_files) + ' 篇 / ' + f(v.ui_asserts) + ' 断言 · 词表键 ' + f(v.lex_keys) +
    ' · 世界名册 ' + f(v.worlds) + ' 界（可见 ' + f(v.live_worlds) + '）。缺读数 = 「未跑」，不当 0 计。';
}
function factsTable(v) {
  const row = (name, val, src) => '| ' + name + ' | ' + val + ' | ' + src + ' |';
  return ['| 现行读数 | 值 | 唯一事实源 |', '|---|---|---|',
    row('扩展版本', '`' + f(v.ext_version) + '`', '`manifest.json`（唯一事实源；D4 守仓库根不复活第二份副本）'),
    row('冒烟断言', f(v.smoke), '`.tests/run-smoke.cjs` 末行 `SMOKE_ALL_GREEN`'),
    row('静态审计关数', f(v.audit_gates) + ' 关', '`.tests/audit.cjs` 末行 `AUDIT_ALL_GREEN`'),
    row('常驻探针合计', f(v.probe_asserts) + ' 断言', '`.tests/probe-*.cjs` 逐件末行求和（run-dod 求和，不手算）'),
    row('界面走查', f(v.ui_files) + ' 篇 / ' + f(v.ui_asserts) + ' 断言', '`.tests/verify-ui-*.cjs` 目录清单 + 逐篇末行'),
    row('功法（修仙）', f(v.arts) + ' 部', '`pack.artsMap()` 键数（拆分口径见下方人写表，文档为正典）'),
    row('境界 / 秘境', f(v.realms) + ' / ' + f(v.zones), '`SQ.XDATA.REALMS` / `D.ZONES`'),
    row('道友名录', f(v.companions) + ' 人', '`D.COMPANIONS`'),
    row('福地名录', f(v.caves) + ' 处', '`D.CAVES`'),
    row('固定势力池', f(v.factions_fixed) + ' 处', '`D.FACTIONS_FIXED`'),
    row('行为成就', f(v.achv) + ' 条', '`D.CODEX.ACHV`'),
    row('材料 / 丹方 / 图纸', f(v.mats) + ' / ' + f(v.recipes) + ' / ' + f(v.blueprints), '`D.ALCHEMY.{MATS,RECIPES,BLUEPRINTS}`'),
    row('世界名册', f(v.worlds) + ' 界（可见 ' + f(v.live_worlds) + '）', '`SQ.Worlds` / `SQ.visibleWorlds()`'),
    row('世界名命名池', f(v.name_pool), '`SQ.Worlds.xiuxian.nameParts` 各段长度'),
    row('词表唯一键', f(v.lex_keys), '沙箱装载后 `SQ.LEX` 各世界键数求和')
  ].join('\n');
}

const SEGMENTS = [
  { file: 'docs/FACTS.md', name: 'facts', render: factsTable },
  { file: 'README.md', name: 'readme', render: oneLine },
  { file: 'DESIGN.md', name: 'design', render: oneLine, at: 'ext' },   /* DESIGN.md 随扩展走（在扩展根，不在仓库根）*/
  { file: 'docs/三千世界-工程规范与验收计划.md', name: 'eng-spec', render: oneLine },
  { file: 'docs/三千世界-项目设计文档.md', name: 'main-design', render: oneLine }
];

/* ── 段抽取与判漂 ─────────────────────────────────────── */
function region(text, name) {
  const b = BEGIN(name), e = END;
  const i = text.indexOf(b);
  if (i < 0) return { missing: true };
  const j = text.indexOf(e, i);
  if (j < 0) return { missing: true, unterminated: true };
  return { body: text.slice(i + b.length, j).replace(/^\n/, '').replace(/\n$/, ''), start: i, end: j + e.length };
}
/* 段的宿主目录：默认在仓库根（docs/ 与 README.md），`at: 'ext'` 的在扩展根（DESIGN.md 随扩展交付）。 */
const segBase = (s) => (s.at === 'ext' ? ROOT : REPO);

function check(v) {
  const drift = [], missing = [];
  for (const s of SEGMENTS) {
    let text;
    try { text = fs.readFileSync(path.join(segBase(s), s.file), 'utf8'); }
    catch (e) { missing.push(s.file + ' [' + s.name + '] 文件读不到'); continue; }
    const want = s.render(v), reg = region(text, s.name);
    if (reg.missing) { missing.push(s.file + ' [' + s.name + '] 缺哨兵段（先手工插 BEGIN/END 各一行）'); continue; }
    if (reg.body !== want) drift.push({ seg: s, text: text, want: want });
  }
  return { drift: drift, missing: missing };
}
function applyFix(v, drift) {
  for (const d of drift) {
    const s = d.seg;
    const i = d.text.indexOf(BEGIN(s.name));
    const j = d.text.indexOf(END, i);
    const next = d.text.slice(0, i + BEGIN(s.name).length) + '\n' + d.want + '\n' + d.text.slice(j);
    /* 行尾保护（versions-check 同型）：本仓文档纯 LF，混进 CRLF 会变成整文件假改动 */
    const eol = /\r\n/.test(d.text) ? '\r\n' : '\n';
    fs.writeFileSync(path.join(segBase(s), s.file), eol === '\n' ? next : next.replace(/\n/g, '\r\n'), 'utf8');
  }
  const ledger = { generated_by: '.tests/gen-ledger.cjs', at: new Date().toISOString(),
    values: v, segments: SEGMENTS.map((s) => ({ file: s.file, name: s.name })), attrib: ATTRIB };
  fs.writeFileSync(path.join(REPO, 'docs', 'ledger.json'), JSON.stringify(ledger, null, 1) + '\n', 'utf8');
}

/* ── 失败归因映射（run-dod 红件时打印；正典在本表，改判据面就改这里）── */
const ATTRIB = {
  smoke: { src: '.tests/smoke.js（300 案顺序共享沙箱态，不可单跑）', touches: ['assets/core.js', 'assets/systems/**', 'assets/worlds/xiuxian/**'], repro: 'node .tests/run-smoke.cjs' },
  audit: { src: '.tests/audit.cjs（A/B/C 各组静态关）', touches: ['view/index.html', 'module/index.html', 'assets/**', '仓库根 docs/（账本段宿主）'], repro: 'node .tests/audit.cjs' },
  'versions-check': { src: '各卷卷头 = 事实源，docs/VERSIONS.md = 视图', touches: ['docs/*.md 卷头', 'docs/VERSIONS.md'], repro: 'node .tests/versions-check.cjs（先 --fix 再看）' },
  'sim-pacing': { src: '.tests/sim-pacing.cjs（画像 × 口径矩阵）', touches: ['assets/systems/idle.js', 'assets/systems/realm.js', 'assets/worlds/xiuxian/data.js'], repro: 'node .tests/sim-pacing.cjs' },
  'sim-event-economy': { src: '.tests/sim-event-economy.cjs（固定种子 20261008）', touches: ['assets/systems/events.js', 'assets/worlds/xiuxian/events.js', 'D.EVENT_* 权重与冷却'], repro: 'node .tests/sim-event-economy.cjs 2 20261008' },
  'probe-savecodec': { src: 'core.js 编解码与压缩阶梯 ⓪~⑤', touches: ['assets/core.js', 'docs/三千世界-工程规范与验收计划.md §3.6'], repro: 'node .tests/probe-savecodec.cjs' },
  'probe-savegrowth': { src: '主档平坦 / 侧档增长（600 次真奇遇结算）', touches: ['assets/core.js', 'stripSideFlows', '侧档 LOG_KEY'], repro: 'node .tests/probe-savegrowth.cjs' },
  'probe-realsave': { src: '玩家真档 读→存→读 零丢失', touches: ['.tests/storage-read.cjs 候选路径', 'assets/core.js'], repro: 'node .tests/probe-realsave.cjs' },
  'gen-ledger': { src: 'docs/ledger.json + 各文件哨兵段', touches: ['docs/FACTS.md', 'README.md', 'DESIGN.md', 'docs/三千世界-工程规范与验收计划.md', 'docs/三千世界-项目设计文档.md'], repro: 'node .tests/gen-ledger.cjs --fix 后复跑' }
};
/* shortcut: 归因表只覆盖无头件与账本件；全部走查篇共用一条「改 view/index.html 就跑 --ui」口径，
 * 待走查改成单浏览器会话（N36）时再按篇建目。 */

if (require.main === module) {
  if (!REPO) { console.log('LEDGER_NO_REPO 找不到含 docs/VERSIONS.md 的仓库根 ⇒ 无法对账（判红）'); process.exit(1); }
  const v = compute();
  if (v.dod_missing) console.log('MISSING .tests/dod-last.json —— 先跑一次 node .tests/run-dod.cjs（本件不代跑测试）');
  if (v.pool_error) console.log('POOL_ERROR ' + v.pool_error);
  const r = check(v);
  r.missing.forEach((x) => console.log('MISSING ' + x));
  r.drift.forEach((d) => console.log('DRIFT ' + d.seg.file + ' [' + d.seg.name + ']'));
  if (FIX) {
    applyFix(v, r.drift);
    console.log(r.drift.length ? 'LEDGER_FIXED ' + r.drift.length + ' (missing=' + r.missing.length + ')'
      : 'LEDGER_IN_SYNC segments=' + SEGMENTS.length);
    process.exit(r.missing.length ? 1 : 0);
  }
  console.log(r.drift.length || r.missing.length
    ? 'LEDGER_DRIFT ' + (r.drift.length + r.missing.length) + ' (drift=' + r.drift.length + ' missing=' + r.missing.length + ')'
    : 'LEDGER_IN_SYNC segments=' + SEGMENTS.length);
  process.exit(r.drift.length || r.missing.length ? 1 : 0);
}

module.exports = { compute, check, region, SEGMENTS, BEGIN, END, oneLine, factsTable, ATTRIB, ROOT, REPO };
