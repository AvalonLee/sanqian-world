/* .tests/probe-doclinks.cjs — docs 相对链接死链探针（册262 立 · docs-归类整理规范 §八）
 *
 * 立因：2026-11-07 普查实证「移动卷相对链接漏跟」是 versions-check 盲区——古武卷归档移动后
 * 系统设计五卷死链 6 处（册261 勘误批修复）。本探针把「移动卷必须同批 grep 旧路径」机器化。
 * 射程：docs/**.md 的 [text](target) 相对链接逐条解析存在性（URL 解码、#锚点剥离）。
 * 豁免：docs/_archive/**（归档区只读不修，检索陷阱见 docs/README.md）；外链 http(s)/mailto 不在射程。
 * 绿：末行 DOCDEADLINKS 0 …；红：列死链清单并退 1（修法 = 现行卷内改 URL 不改正文叙述，见规范 §六）。
 */
'use strict';
const fs = require('fs'), path = require('path');

/* 仓库根定位：从 .tests/ 往上找带 docs/VERSIONS.md 的那一层（不许硬编码层数，同 repo-root.cjs 口径） */
let REPO = path.resolve(__dirname, '..');
for (let i = 0; i < 4 && !fs.existsSync(path.join(REPO, 'docs', 'VERSIONS.md')); i++) REPO = path.dirname(REPO);
const DOCS = path.join(REPO, 'docs');

const files = [];
(function walk(d) {
  for (const n of fs.readdirSync(d)) {
    const p = d + '/' + n;
    if (fs.statSync(p).isDirectory()) { if (n !== '_archive') walk(p); }
    else if (n.endsWith('.md')) files.push(p);
  }
})(DOCS);

let ok = 0; const dead = [];
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  const re = /\[[^\]\n]*\]\(([^)#\s\n]+)(?:#[^)\s]*)?\)/g;
  let m;
  while ((m = re.exec(txt))) {
    const href = m[1];
    if (/^[a-z]+:\/\//i.test(href) || href.startsWith('mailto:')) continue;
    const t = path.normalize(path.dirname(f) + '/' + decodeURIComponent(href));
    if (fs.existsSync(t)) ok++;
    else dead.push(path.relative(REPO, f).replace(/\\/g, '/') + ' → ' + href);
  }
}

if (dead.length) {
  console.log('DOCDEADLINKS ' + dead.length + ' · 死链清单：');
  dead.forEach(d => console.log('  ✗ ' + d));
  process.exit(1);
}
console.log('DOCDEADLINKS 0 · 扫 ' + files.length + ' 件 / 相对链接 ' + ok + ' 条全活 · 豁免 _archive');
