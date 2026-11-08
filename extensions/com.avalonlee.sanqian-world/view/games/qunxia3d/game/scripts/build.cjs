/* build.cjs — 抽取件共享构建器：切片 → 逐字节拼装 → data/*.js
 * 生成物形态：声明正文逐字节原样 + 导出垫片（classic script 顶层 const/let 为全局词法
 * 绑定、跨 <script> 裸名互见；node 侧 module.exports）。禁手改，重跑覆盖。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadSrc, sliceDecl, header, exportShim } = require('./lib.cjs');

const OUT = path.join(__dirname, '..', 'data');

/* spec = [ { src, decls: [[name, kind], ...] } , ... ]（多源依序拼接）
 * opts.runtimeStateSlot = true → 文件内加 `var state` 槽位 + setRuntimeState
 *   （数据表内闭包引用全局 state 的条目——如 CANON_EVENTS_SCHEDULE 的 onCanonExpire——
 *    由 core/state 每次载档后回填当前引用；node 侧走导出的 setter。） */
function buildData(tag, file, spec, opts) {
  const o = opts || {};
  const parts = [];
  const srcLines = [];
  const names = [];
  spec.forEach(seg => {
    const { text: src } = loadSrc(seg.src);
    seg.decls.forEach(([name, kind]) => {
      const s = sliceDecl(src, name, kind);
      parts.push(seg.transform ? seg.transform(s.text) : s.text);
      srcLines.push(seg.src + ' L' + s.startLine + '–L' + s.endLine + ' · ' + kind + ' ' + name);
      if (names.indexOf(name) < 0) names.push(name);
    });
  });
  let extraHead = '';
  if (o.runtimeStateSlot) {
    extraHead = '/* `state` 槽位（生成器立）：数据表内的闭包（onCanonExpire 族）逐字引用全局 state，\n' +
      ' * 由 core/state 每次载档/创角后调 setRuntimeState 回填当前引用；node 侧走导出 setter。 */\n' +
      'var state = null;\n' +
      'function setRuntimeState(s) { state = s; }\n\n';
  }
  const head = header(['生成物 · 禁手改 —— 由 game/scripts/extract-' + tag + '.cjs 生成，重跑覆盖']
    .concat(o.subtitle ? [o.subtitle] : [])
    .concat(['源切片（逐字节原样，仅追加导出垫片）：'])
    .concat(srcLines));
  const shim = exportShim(names.concat(o.runtimeStateSlot ? ['setRuntimeState'] : []), extraHead);
  fs.mkdirSync(OUT, { recursive: true });
  const out = head + '\n' + parts.join('\n') + '\n\n' + shim;
  fs.writeFileSync(path.join(OUT, file), out, 'utf8');
  return { file, bytes: out.length, srcLines };
}

module.exports = { buildData, OUT };
