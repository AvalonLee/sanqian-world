/* extract-state-init.cjs — 初始 state 形状（源规格 #1 core/state.js 的数据面）
 * game.html `let state = {...}` 的对象字面量逐字节搬运，包一层工厂：
 * 字面量里 `masters: JSON.parse(JSON.stringify(MASTERS_INIT))` 引用全局表——
 * 浏览器走经典脚本全局词法绑定；node 侧把 require('../data/masters.js').MASTERS_INIT
 * 作为工厂形参注入，字面量正文零改写。
 * 生成 → game/data/state-init.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadSrc, sliceDecl, header } = require('./lib.cjs');

const { text: src } = loadSrc('view/games/qunxia/game.html');
const s = sliceDecl(src, 'state', 'let');
// s.text = "let state = { ... };"
const body = s.text.replace(/^\s*let\s+state\s*=\s*/, '').replace(/;\s*$/, '');
if (body.charAt(0) !== '{') throw new Error('state 字面量形状异常');

const out = header([
  '生成物 · 禁手改 —— 由 game/scripts/extract-state-init.cjs 生成，重跑覆盖',
  '源切片：view/games/qunxia/game.html L' + s.startLine + '–L' + s.endLine + ' · let state（对象字面量逐字节原样）',
  '包裹工厂：字面量内的 MASTERS_INIT 引用经形参注入（浏览器=全局词法绑定，node=require 注入）'
]) + '\n' +
  'var QX3D_STATE_INIT = (function (MASTERS_INIT) {\n' +
  '  return ' + body + ';\n' +
  '})(typeof MASTERS_INIT !== "undefined"\n' +
  '  ? MASTERS_INIT\n' +
  "  : require('./masters.js').MASTERS_INIT);\n" +
  '\n' +
  "if (typeof module !== 'undefined' && module.exports) {\n" +
  '  module.exports = { QX3D_STATE_INIT: QX3D_STATE_INIT };\n' +
  '} else {\n' +
  '  var __g = (typeof window !== "undefined") ? window : globalThis;\n' +
  '  __g.QX3D_DATA = __g.QX3D_DATA || {};\n' +
  '  Object.assign(__g.QX3D_DATA, { QX3D_STATE_INIT });\n' +
  '}\n';

const outPath = path.join(__dirname, '..', 'data', 'state-init.js');
fs.writeFileSync(outPath, out, 'utf8');
console.log('extract-state-init: state-init.js ' + out.length + 'B ← game.html L' + s.startLine + '–L' + s.endLine);
