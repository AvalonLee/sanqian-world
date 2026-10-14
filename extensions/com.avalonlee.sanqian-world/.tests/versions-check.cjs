/* .tests/versions-check.cjs — 版本总账 ↔ 卷头 对账（2026-10-08 文档效率批）
 * 为什么立它：`docs/VERSIONS.md` 自称「全卷现行版本的唯一总账」，但本次设备迁移复核实测**表格整片滞后**
 *   ——主设计表内 v2.39 / 卷头 v2.43、工程规范表内 v2.40 / 卷头 v2.44、任务清单表内 v1.41 / 卷头 v1.44、
 *   轮回卷表内 v1.9 / 卷头 v1.12……而同一份文件的**散文追记里明写着「升版：主设计 v2.42→v2.43」**，
 *   即「账」与「实」在同一个文件内就不一致。历批靠手抄版本号，抄漏的那一格直到下一次事故才被看见
 *   （本仓已为此立过两次纪律：总账键漂移、计数硬编码漂移）。**能自动对的账就不该靠手抄。**
 * 口径：卷头（`| 文档版本 |` 或 `| 版本 |` 的第一格）= 该卷现行版本的事实源；
 *   VERSIONS.md 表格 = 汇总视图，本脚本按卷名前缀匹配拼路径（与既有「前缀匹配放行」规则同源），
 *   逐行对表；`--fix` 就地改写表格单元格（**只改版本格，不动卷名、不动散文注**）。
 * 用法：node .tests/versions-check.cjs          只报漂移（末行 VERSIONS_DRIFT n / VERSIONS_IN_SYNC）
 *       node .tests/versions-check.cjs --fix    校正总账并复跑，末行 VERSIONS_FIXED n
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* 仓库根由 repo-root.cjs 现找（2026-10-14 GitHub 整理批：项目文件只留扩展目录那份，docs 在仓库根）。
 * 定位失败 ⇒ 判红不判绿（SKIP 冒充在跑是本仓反复登记的假绿形状）。 */
const REPO = require('./repo-root.cjs')();
if (!REPO) { console.log('VERSIONS_NO_DOCS 找不到含 docs/VERSIONS.md 的仓库根 ⇒ 无法对账（判红）'); process.exit(1); }
const DOCS = path.join(REPO, 'docs');
const LEDGER = path.join(DOCS, 'VERSIONS.md');
const FIX = process.argv.indexOf('--fix') >= 0;

/* 归档区与分区卷都要覆盖：docs 根 + 玄幻修仙/ + 古武军势/ + 设计稿/ */
function allDocs(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '_archive') allDocs(p, acc); }
    else if (/\.md$/.test(e.name)) acc.push(p);
  }
  return acc;
}
const files = allDocs(DOCS, []);

/* 卷头版本：第一处 `| 文档版本 |` 或 `| 版本 |` 行里的首个 vN.N；整行一并返回（供例外判定）*/
function headVersion(fp) {
  const txt = fs.readFileSync(fp, 'utf8').split(/\r?\n/);
  for (const line of txt) {
    const m = line.match(/^\|\s*(?:文档版本|版本)\s*\|\s*(v\d+(?:\.\d+)*)/);
    if (m) return { ver: m[1], line };
  }
  return null;
}
/* 例外：**迁出卷**的卷头版本注的是「自母卷原样迁出时=初始版」，与总账所记母卷历史版本语义不同，
 * 不做机械覆盖（本仓教训：能自动对的账才自动对，语义不同的两处不许强行归一）。 */
const isMigrationNote = (line) => /原样迁出|迁出卷/.test(line);

/* 版本总账行：`| 卷名 | vN.N |` 两列表（表头 `| 卷 | 现行版本 |` 之下）*/
const ledgerTxt = fs.readFileSync(LEDGER, 'utf8');
const lines = ledgerTxt.split(/\r?\n/);
const rows = [];
lines.forEach((line, i) => {
  const m = line.match(/^\|\s*([^|]+?)\s*\|\s*(v\d+(?:\.\d+)*)\s*\|\s*$/);
  if (m) rows.push({ i, name: m[1].trim(), ver: m[2] });
});

/* 卷名 → 文件：根卷文件名带「三千世界-」前缀、总账行不带，两边都归一后再比；
 * 总账刻意保留给人读的注解（「（主设计）」「（80条）」「（引擎卷）」），故去括注后前缀匹配。 */
const strip = (s) => s.replace(/[（(].*$/, '').replace(/[\s\u3000]/g, '').replace(/^三千世界-/, '').replace(/\.md$/, '').trim();
const cache = {};
function findDoc(name) {
  if (cache[name] !== undefined) return cache[name];
  const key = strip(name);
  const norm = (f) => strip(path.basename(f));
  let hit = files.find((f) => norm(f) === key) || files.find((f) => norm(f).startsWith(key) || key.startsWith(norm(f)));
  cache[name] = hit || null;
  return hit;
}

let drift = 0, missing = 0, ok = 0;
const report = [];
for (const r of rows) {
  if (/现行版本/.test(r.name)) continue;
  const fp = findDoc(r.name);
  if (!fp) { missing++; report.push('ONLY-LEDGER ' + r.name + '（总账有行、仓内找不到同名卷）'); continue; }
  const hv = headVersion(fp);
  if (!hv) { report.push('NO-HEAD-VERSION ' + r.name + ' → ' + path.relative(DOCS, fp)); continue; }
  if (hv.ver === r.ver) { ok++; continue; }
  if (isMigrationNote(hv.line)) {
    report.push('REVIEW ' + r.name + ' 总账=' + r.ver + ' 卷头=' + hv.ver + '（迁出卷语义不同，**不自动覆盖**，须人工定一行口径）');
    drift++;
    continue;
  }
  drift++;
  report.push('DRIFT ' + r.name + ' 总账=' + r.ver + ' 卷头=' + hv.ver + ' → ' + path.relative(DOCS, fp));
  if (FIX) {
    const cell = lines[r.i].replace(/\|\s*v\d+(?:\.\d+)*\s*\|\s*$/, '| ' + hv.ver + ' |');
    lines[r.i] = cell;
  }
}

/* 反向：仓里有卷但总账没行（升版时漏登记 = 纪律③的静默失效路径）*/
const listed = new Set(rows.map((r) => strip(r.name)));
for (const fp of files) {
  const base = strip(path.basename(fp));
  if (base === 'VERSIONS' || base === 'README' || base === 'FACTS') continue;
  if (!headVersion(fp)) continue;
  if (![...listed].some((k) => k.startsWith(base) || base.startsWith(k))) {
    report.push('ONLY-DOC ' + path.relative(DOCS, fp) + '（有卷头版本、总账无行）');
    missing++;
  }
}

if (FIX && drift) {
  /* 行尾保护：本仓文档现行纯 LF，但换机 / 换编辑器可能引入 CRLF；
   * 一律按原文行尾写回，避免「只改 12 个版本格」变成整文件逐行 diff。 */
  const eol = /\r\n/.test(ledgerTxt) ? '\r\n' : '\n';
  fs.writeFileSync(LEDGER, lines.join(eol), 'utf8');
}
report.forEach((x) => console.log(x));
console.log(FIX
  ? (drift ? 'VERSIONS_FIXED ' + drift + ' (ok=' + ok + ' unlisted=' + missing + ')' : 'VERSIONS_IN_SYNC rows=' + rows.length)
  : (drift ? 'VERSIONS_DRIFT ' + drift + ' (ok=' + ok + ' unlisted=' + missing + ')' : 'VERSIONS_IN_SYNC rows=' + rows.length));
process.exit(!FIX && drift ? 1 : 0);
