/* .tests/gen-lexicon.cjs — 天赋词表生成器 v3（文档驱动 · 幂等 · 系统深化批 A2）
 * 事实源：docs/三千世界-天赋池设计.md（通用 72 条 = 平坦 66 + 机制 6，§9.2 羁绊 8 对）
 *        + docs/玄幻修仙/专属天赋池（80条）.md（专属 124 条 = 平坦 104 + 机制 10 + epic 10）。
 * 产出：assets/lexicon/talents.js（talent.{id}.name / talent.{id}.desc + talent.synergy.{id}.name/.desc；
 *   common 池注册进通用词表、世界专属池与羁绊注册进对应世界词表）。
 * 表格式两代兼容：6 列平坦行 |`id`|名称|权重|普通/稀有|效果|描述| 与
 *   7 列机制/epic 行 |`id`|名称|kind|权重|普通/稀有/epic|效果|描述|（系统深化批 §4.3/§5.3/§5.4）。
 * 幂等纪律（历史坑：旧版从数据文件抽 name/desc，数据文件剥纯后重跑会把词表覆盖成 undefined）：
 *   本脚本只读文档、不写数据文件；文档/数据 id 集合不一致或 name/desc 为空 → 报错退出，绝不落坏值。
 * 用法：node .tests/gen-lexicon.cjs   （在扩展根目录）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DOC_COMMON = '/workspace/app/docs/三千世界-天赋池设计.md';
const DOC_XIUXIAN = '/workspace/app/docs/玄幻修仙/专属天赋池（80条）.md';

/* 天赋表行（两代格式）：
 * 6 列：| `id` | 名称 | 权重 | 普通/稀有 | 效果 | 描述 |
 * 7 列：| `id` | 名称 | kind | 权重 | 普通/稀有/epic | 效果 | 描述 |（机制/epic 档） */
const RE6 = /^\|\s*`([a-z_0-9]+)`\s*\|([^|]+)\|\s*(\d+)\s*\|\s*(普通|稀有|epic)\s*\|([^|]*)\|([^|]+)\|/;
const RE7 = /^\|\s*`([a-z_0-9]+)`\s*\|([^|]+)\|\s*(positive|negative)\s*\|\s*(\d+)\s*\|\s*(普通|稀有|epic)\s*\|([^|]*)\|([^|]+)\|/;
function parseTalents(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m7 = line.match(RE7);
    if (m7) { out.push({ id: m7[1], name: m7[2].trim(), desc: m7[7].trim() }); continue; }
    const m = line.match(RE6);
    if (!m) continue;
    out.push({ id: m[1], name: m[2].trim(), desc: m[6].trim() });
  }
  return out;
}

/* 羁绊表行（天赋池设计 §9.2）：| `syn_id` | 羁绊名 | 配对 | 字段 | 值 | 描述 | */
const RESYN = /^\|\s*`(syn_[a-z_0-9]+)`\s*\|\s*([^|]+?)\s*\|[^|]*\|[^|]*\|[^|]*\|\s*([^|]+?)\s*\|/;
function parseSynergies(file) {
  const out = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(RESYN);
    if (!m) continue;
    if (out.some((s) => s.id === m[1])) continue;   /* 主卷 §9.2 为唯一来源，防御重复行 */
    out.push({ id: m[1], name: m[2].trim(), desc: m[3].trim() });
  }
  return out;
}

const common = parseTalents(DOC_COMMON);
const xiuxian = parseTalents(DOC_XIUXIAN);
const synergies = parseSynergies(DOC_COMMON);
if (common.length !== 72 || xiuxian.length !== 124 || synergies.length !== 8) {
  console.error('FAIL: 文档表行数不符（common=' + common.length + '/72, xiuxian=' + xiuxian.length +
    '/124, synergies=' + synergies.length + '/8）');
  process.exit(1);
}
const all = common.concat(xiuxian);
const empty = all.concat(synergies).filter((t) => !t.name || !t.desc || t.name === 'undefined' || t.desc === 'undefined');
if (empty.length) {
  console.error('FAIL: 文档 name/desc 空值：' + empty.map((t) => t.id).join(','));
  process.exit(1);
}
const dup = all.map((t) => t.id).filter((id, i, arr) => arr.indexOf(id) !== i);
if (dup.length) { console.error('FAIL: 文档 id 重复：' + dup.join(',')); process.exit(1); }

/* 与数据文件对账（id 集合一致；数据文件必须已剥纯——不得再带 name/desc） */
function loadTalents(file) {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return sandbox.window.SQ.TALENTS;
}
const T = {};
Object.assign(T, loadTalents('assets/talents/common.js'));
Object.assign(T, loadTalents('assets/talents/xiuxian.js'));
const dataIds = new Set();
const dirty = [];
const counts = {};
for (const w of ['common', 'xiuxian']) {
  counts[w] = { positive: 0, negative: 0 };
  for (const k of ['positive', 'negative']) {
    for (const t of (T[w] || {})[k] || []) {
      dataIds.add(t.id);
      counts[w][k]++;
      if (t.name !== undefined || t.desc !== undefined) dirty.push(t.id);
    }
  }
}
if (counts.common.positive !== 40 || counts.common.negative !== 32 ||
    counts.xiuxian.positive !== 66 || counts.xiuxian.negative !== 58) {
  console.error('FAIL: 数据文件条数不符（common 正' + counts.common.positive + '/40 负' + counts.common.negative +
    '/32，xiuxian 正' + counts.xiuxian.positive + '/66 负' + counts.xiuxian.negative + '/58）');
  process.exit(1);
}
if (dirty.length) {
  console.error('FAIL: 数据文件仍带 name/desc（应为纯机制数据）：' + dirty.join(','));
  process.exit(1);
}
const docIds = new Set(all.map((t) => t.id));
const missing = [...dataIds].filter((id) => !docIds.has(id));
const extra = [...docIds].filter((id) => !dataIds.has(id));
if (missing.length || extra.length) {
  console.error('FAIL: 文档/数据 id 不一致 missing=' + missing.join(',') + ' extra=' + extra.join(','));
  process.exit(1);
}
/* 羁绊对账：pair 成员必须全部在册（TALENT_SYNERGIES 常量表在 data.js，此处只对 pair id 集合） */
function loadSynergies() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  sandbox.window.SQ = {};                     /* data.js 直接挂 SQ.XDATA，不自行建命名空间 */
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/worlds/xiuxian/data.js'), 'utf8'), sandbox, { filename: 'data.js' });
  return sandbox.window.SQ.XDATA.TALENT_SYNERGIES || [];
}
const dataSyn = loadSynergies();
if (dataSyn.length !== synergies.length) {
  console.error('FAIL: 羁绊表行数不符（data.js=' + dataSyn.length + ', 文档=' + synergies.length + '）');
  process.exit(1);
}
for (const s of dataSyn) {
  const doc = synergies.find((x) => x.id === s.id);
  if (!doc) { console.error('FAIL: data.js 羁绊 id 不在文档 §9.2：' + s.id); process.exit(1); }
  for (const pid of s.pair) {
    if (!docIds.has(pid)) { console.error('FAIL: 羁绊 ' + s.id + ' 配对词条不在册：' + pid); process.exit(1); }
  }
  if (Math.abs(s.value) > 0.05) { console.error('FAIL: 羁绊幅度越界（|value| ≤ 0.05）：' + s.id); process.exit(1); }
}

/* ── 输出词表文件（common 池 → 通用词表；专属池与羁绊 → xiuxian 词表）── */
function buildBlock(entries) {
  const lines = [];
  for (const t of entries) {
    lines.push(`    'talent.${t.id}.name': ${JSON.stringify(t.name)},`);
    lines.push(`    'talent.${t.id}.desc': ${JSON.stringify(t.desc)},`);
  }
  return lines;
}
function buildSynBlock(entries) {
  const lines = [];
  for (const s of entries) {
    lines.push(`    'talent.synergy.${s.id}.name': ${JSON.stringify(s.name)},`);
    lines.push(`    'talent.synergy.${s.id}.desc': ${JSON.stringify(s.desc)},`);
  }
  return lines;
}
const xiuxianLines = buildBlock(xiuxian).concat(buildSynBlock(synergies));
if (xiuxianLines.length) xiuxianLines[xiuxianLines.length - 1] = xiuxianLines[xiuxianLines.length - 1].replace(/,$/, '');
const commonLines = buildBlock(common);
if (commonLines.length) commonLines[commonLines.length - 1] = commonLines[commonLines.length - 1].replace(/,$/, '');

const lexiconOut = `/* assets/lexicon/talents.js — 天赋名/描述词表（P3 词表层抽取）
 * ⚠ 本文件由 .tests/gen-lexicon.cjs 自天赋池文档表格生成（文档驱动 · 幂等）——改词条先改文档再重跑，禁止手改。
 * key 规范（工程规范 §1.2）：talent.{id}.name / talent.{id}.desc / talent.synergy.{id}.name / .desc
 * common 池词条注册进 common 词表；世界专属池与组合羁绊注册进对应世界词表。
 * 计数（系统深化批 A2）：通用 72（正 40 / 负 32）+ 修仙专属 124（正 66 / 负 58）+ 羁绊 8 对。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.lexRegister(null, {
${commonLines.join('\n')}
  });
  SQ.lexRegister('xiuxian', {
${xiuxianLines.join('\n')}
  });
})();
`;
fs.writeFileSync(path.join(ROOT, 'assets/lexicon/talents.js'), lexiconOut);
console.log('entries=' + all.length + ' (72 common + 124 xiuxian) + synergies=' + synergies.length +
  ' · keys=' + (all.length * 2 + synergies.length * 2));
console.log('GEN_OK');
