/* lib.cjs — qunxia3d 数据抽取共享库（计划书铁律 2 的工具件）
 * 从 game.html / wuxia/index.js / content-merge.js 按「名字定位 + 编译试探配平」切出声明，
 * 切片正文逐字节原样（禁手抄的落实方式 = 生成器搬运，不人写数值）。
 * 配平终点判定 = vm.Script 编译试探：对候选终结符（const/let/var 类按 `;`，function 类按 `}`）
 * 逐个试编译「声明起点→候选」前缀，第一个可编译前缀即终点——语法级保证，不手写状态机。
 * 声明起点也用编译验证：名字的文本匹配可能落在注释/字符串里（game.html 有表名注释），
 * 逐个候选起点试编译，第一个可编译者为准。
 * 用法：const { sliceDecl, loadSrc } = require('./lib.cjs');
 *   sliceDecl(src, 'MARTIAL_DB', 'const') → { text, startLine, endLine }
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadSrc(rel) {
  /* rel 相对扩展根（本文件在 view/games/qunxia3d/game/scripts/ 下，向上 5 层到扩展根） */
  const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
  return { text: fs.readFileSync(path.join(root, rel), 'utf8'), root };
}

/* 前缀可编译？（const/let/var 声明前缀） */
function compiles(code) {
  try {
    new vm.Script(code, { filename: 'extract-probe.js' });
    return true;
  } catch (e) {
    return false;
  }
}

/* 定位声明并切片。kind: 'const'|'let'|'var'|'function'
 * 返回 { text（含首行缩进原样）, startLine, endLine } */
function sliceDecl(src, name, kind) {
  const re = new RegExp('(^|\\n)[ \\t]*(?:' + kind + ')\\s+' + name + '\\s*([={(])', 'g');
  const candidates = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    // 名字行行首（不含前导换行）
    const declStart = m.index + 1;
    candidates.push(declStart);
    re.lastIndex = m.index + m[0].length; // 防零宽死循环
    if (candidates.length >= 8) break;    // 前 8 个候选够了（真声明 + 注释里的提法）
  }
  if (!candidates.length) throw new Error('sliceDecl: 未找到声明 ' + kind + ' ' + name);

  for (const start of candidates) {
    // 终结符候选：const/let/var → ';'；function → '}'
    const term = kind === 'function' ? '}' : ';';
    const probe = src.slice(start);
    for (let i = probe.indexOf(term); i >= 0; i = probe.indexOf(term, i + 1)) {
      const cand = probe.slice(0, i + 1);
      if (compiles(cand)) {
        // 再验一眼：起点确实以 `<kind> <name>` 开头（防注释匹配被误收）
        if (!new RegExp('^' + kind + '\\s+' + name + '\\b').test(cand.trimStart())) continue;
        return {
          text: cand,
          startLine: src.slice(0, start).split('\n').length,
          endLine: src.slice(0, start + i + 1).split('\n').length
        };
      }
    }
  }
  throw new Error('sliceDecl: ' + kind + ' ' + name + ' 无可编译前缀（配平失败）');
}

/* 生成文件头注 */
function header(lines) {
  return '/* ============================================================\n' +
    lines.map(l => ' * ' + l).join('\n') + '\n' +
    ' * ============================================================ */\n';
}

/* 导出垫片（classic script + node 双态） */
function exportShim(names, extraHead) {
  const list = names.join(', ');
  const obj = names.map(n => n + ': ' + n).join(', ');
  return (extraHead || '') +
    "if (typeof module !== 'undefined' && module.exports) {\n" +
    '  module.exports = { ' + obj + ' };\n' +
    '} else {\n' +
    '  var __g = (typeof window !== "undefined") ? window : globalThis;\n' +
    '  __g.QX3D_DATA = __g.QX3D_DATA || {};\n' +
    '  Object.assign(__g.QX3D_DATA, { ' + list + ' });\n' +
    '}\n';
}

/* 快速 JSON 稳定化（对表用） */
function stableStr(v) {
  if (Array.isArray(v)) return '[' + v.map(stableStr).join(',') + ']';
  if (v && typeof v === 'object') {
    const ks = Object.keys(v).sort();
    return '{' + ks.map(k => JSON.stringify(k) + ':' + stableStr(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

module.exports = { loadSrc, sliceDecl, header, exportShim, stableStr };
