/* .tests/repo-root.cjs — 仓库根定位（2026-10-14 GitHub 整理批）
 * 结构事实：项目文件**只有** `extensions/com.avalonlee.sanqian-world/` 那一份（根侧重复副本已删），
 * 而 docs/、README.md、package.json、AGENTS.md 在仓库根。从 .tests/ 往上找到含 `docs/VERSIONS.md`
 * 的那一层即仓库根——比硬编码 `../../..` 稳（目录再挪一层也不用改代码）。
 * 用法：const REPO = require('./repo-root.cjs')();   // 找不到返回 null，调用方必须显式报错，不许当 0 顶
 */
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function repoRoot(from) {
  let d = path.resolve(from || path.join(__dirname, '..'));
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, 'docs', 'VERSIONS.md'))) return d;
    const up = path.dirname(d);
    if (up === d) break;
    d = up;
  }
  return null;
};
