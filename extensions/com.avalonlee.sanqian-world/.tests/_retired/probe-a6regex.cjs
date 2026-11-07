/* .tests/probe-a6regex.cjs — A6 孤儿键扫描的 camelCase 盲区复现 + 最小修法验证（只读，不改 audit.cjs）
 * 背景：.tests/audit.cjs 的 A6 反扫用三条正则：
 *   re1 /\\bt\\(\\s*'([a-zA-Z0-9._]+)'/g        —— 只认 `t('` 直调，别名取词口 `tc('…')` 照不出
 *   re2 /['"]([a-z][a-z0-9_]*(?:\\.[a-z0-9_]+)*\\.?)['"]/g  —— 字符类**无 A-Z 且无 i 旗标**，
 *                                                    camelCase 尾段（lockTitle / noPick）整条失配
 *   re3 尾点前缀 + 变量拼接（已带 i 旗标）
 * 本探针把 re2 加一个 `i` 旗标后重算孤儿集，量化差值并逐条列出被误判的键。
 * 用法：node .tests/probe-a6regex.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./sandbox.cjs');

/* 与 audit.cjs 同源的注释剥离（保留字符串、识别正则字面量），保证读数可比 */
function stripComments(src) {
  let out = '', i = 0, n = src.length, st = null, inClass = false, lastSig = '';
  const REGEX_PREV = '(,=:[!&|?{};+-*%~^<>';
  while (i < n) {
    const c = src[i], c2 = src.substr(i, 2);
    if (st === null) {
      if (c2 === '/*') { st = 'block'; i += 2; continue; }
      if (c2 === '//') { st = 'line'; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') { st = c; out += c; i++; continue; }
      if (c === '/' && (lastSig === '' || REGEX_PREV.includes(lastSig))) { st = 'regex'; inClass = false; out += c; i++; continue; }
      if (!/\s/.test(c)) lastSig = c;
      out += c; i++; continue;
    }
    if (st === 'block') { if (c2 === '*/') { st = null; i += 2; } else { out += (c === '\n' ? '\n' : ''); i++; } continue; }
    if (st === 'line') { if (c === '\n') { st = null; out += '\n'; } i++; continue; }
    if (st === 'regex') {
      out += c;
      if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
      if (c === '[') inClass = true; else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) { st = null; lastSig = '/'; }
      else if (c === '\n') st = null;
      i++; continue;
    }
    out += c;
    if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
    if (c === st) { st = null; lastSig = c; }
    i++;
  }
  return out;
}
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build')) continue;
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
const relOf = (f) => path.relative(ROOT, f).split(path.sep).join('/');

/* 与 audit 同一套沙箱词表（lexicon 分卷按 audit 的加载清单） */
const { SQ } = load([]);
const lexAll = Object.assign({}, SQ.LEX.common, SQ.LEX.xiuxian);

const all = walk(ROOT, []).filter((f) => {
  const rel = relOf(f);
  if (rel.startsWith('extensions/')) return false;                  /* 平台镜像非事实源（audit 同口径） */
  if (/(^|\/)(node_modules|dist|build)\//.test(rel)) return false;
  return /\.(js|html)$/.test(rel);
});
const bodies = [];
for (const f of all) {
  const rel = relOf(f);
  if (rel.includes('.tests') || /(^|\/)lexicon([-./])/.test(rel)) continue;   /* audit：词表分卷与探针排除 */
  if (rel.endsWith('.html')) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
    let m; while ((m = re.exec(src))) bodies.push(stripComments(m[1]));
  } else bodies.push(stripComments(fs.readFileSync(f, 'utf8')));
}
console.log('扫描代码体量 = ' + bodies.length + ' 段（view 内联 + assets，词表分卷排除）');

function orphanSet(useI) {
  const staticKeys = new Set(), litKeys = new Set(), dyn = new Set();
  for (const body of bodies) {
    let m;
    const re1 = /\bt\(\s*'([a-zA-Z0-9._]+)'/g;
    while ((m = re1.exec(body))) { if (m[1].endsWith('.')) dyn.add(m[1]); else staticKeys.add(m[1]); }
    /* 唯一差异位：末尾旗标 '' vs 'i' */
    const re2 = useI
      ? /['"]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*\.?)['"]/gi
      : /['"]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)*\.?)['"]/g;
    while ((m = re2.exec(body))) { if (m[1].endsWith('.')) dyn.add(m[1]); else litKeys.add(m[1]); }
    const re3 = /['"]([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)['"]\s*\+/gi;
    while ((m = re3.exec(body))) dyn.add(m[1]);
  }
  const out = [];
  for (const k of Object.keys(lexAll)) {
    if (staticKeys.has(k) || litKeys.has(k)) continue;
    let cov = null;
    for (const p of dyn) if (k.indexOf(p) === 0) { cov = p; break; }
    if (!cov) out.push(k);
  }
  return out;
}

const now = orphanSet(false);
const fixed = orphanSet(true);
const FOUR = ['creation.talent.lockTitle', 'creation.talent.lockText',
  'creation.talent.lockSummary', 'creation.world.noPick'];

console.log('现行 re2（无 i）孤儿 = ' + now.length + ' key');
console.log('re2 加 i 旗标后孤儿 = ' + fixed.length + ' key （差 ' + (now.length - fixed.length) + '）');
const gone = now.filter((k) => fixed.indexOf(k) < 0).sort();
console.log('加旗标后被正确摘掉的键：\n  ' + gone.join('\n  '));

let pass = 0, fail = 0;
const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };
T(now.length - fixed.length > 0, 'R1 最小修法（re2 末尾加 i 旗标）确有减孤儿效果', now.length + ' → ' + fixed.length);
T(FOUR.every((k) => now.indexOf(k) >= 0), 'R2 四条键在现行判据下确实被报孤儿（= 假阳）', FOUR.join(','));
T(FOUR.every((k) => fixed.indexOf(k) < 0), 'R3 加 i 旗标后四条全部摘除（假阳消失）');
T(gone.every((k) => /[A-Z]/.test(k)), 'R4 摘除项**全部**是含大写的 camelCase 键（无一条是纯小写 ⇒ 判据收窄方向单一）',
  gone.filter((k) => !/[A-Z]/.test(k)).join(',') || 'clean');
T(fixed.every((k) => now.indexOf(k) >= 0), 'R5 只减不增：加旗标后的孤儿集 ⊆ 现行集（不可能造出新孤儿）');

/* 逐条抽验四条键**确实被消费**（不是靠正则放宽糊过去的假阴）*/
const viewSrc = fs.readFileSync(path.join(ROOT, 'view/index.html'), 'utf8');
const hits = FOUR.map((k) => {
  const re = new RegExp("[\"']" + k.replace(/\./g, '\\.') + "[\"']", 'g');
  const m = viewSrc.match(re) || [];
  const line = (viewSrc.split('\n').find((l) => l.indexOf("'" + k + "'") >= 0) || '').trim();
  return { k: k, n: m.length, line: line.slice(0, 96) };
});
hits.forEach((h) => {
  T(h.n >= 1 && /tc\(|SQ\.t\(|\bt\(/.test(h.line), 'C1 消费点实证 ' + h.k, h.line);
});
T(lexAll['creation.talent.lockTitle'] != null && lexAll['creation.world.noPick'] != null,
  'C2 四条键确在词表内（否则属 A2 缺键而非 A6 孤儿）',
  String(lexAll['creation.talent.lockTitle'] || '') + ' / ' + String(lexAll['creation.world.noPick'] || ''));

console.log(fail === 0 ? 'PROBE_A6REGEX_ALL_GREEN ' + pass + '/' + (pass + fail)
  : 'PROBE_A6REGEX_FAILED ' + fail + '/' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
