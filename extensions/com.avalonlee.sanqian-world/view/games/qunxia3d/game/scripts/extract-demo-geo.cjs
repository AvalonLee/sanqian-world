/* extract-demo-geo.cjs — 世界图投影地理：30 地界真实地理投影坐标 + 真实黄河/长江折线
 * 来源 = demo-data.js（M0 前演示版数据，其 regions 的 tiles/neighbors/desc 与
 * game.html REGIONS 抽取件逐字节同源已验证——册278 比对零差异）。
 * demo-data.js 自本件起退役为**抽取源**（不再挂载 index.html）：
 *   regions ← data/regions.js 的 REGIONS（同源替代）
 *   events  ← 演示占位退役（crises 展示走 QX3D_APP.regionEvent，册273 接管）
 *   space   ← board3d 零引用
 * 生成 → game/data/demo-geo.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { loadSrc, header } = require('./lib.cjs');

const { text: src } = loadSrc('view/games/qunxia3d/demo-data.js');
const c = { window: {} };
vm.createContext(c);
vm.runInContext(src + '\nglobalThis.__x = window.QX_DEMO;', c);
const demo = c.__x;

const geo = {};
demo.regions.forEach(r => { geo[r.id] = { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10 }; });
const rivers = demo.rivers;

const out = header([
  '生成物 · 禁手改 —— 由 game/scripts/extract-demo-geo.cjs 生成，重跑覆盖',
  '来源切片：view/games/qunxia3d/demo-data.js（退役抽取源）· 投影坐标 30 条（x=(lon-82)*20 映射，',
  '  三岛钉死松弛后取值）+ 真实黄河/长江折线 2 条；events 演示占位退役（crises 走 QX3D_APP.regionEvent）',
  '消费：board3d.js 世界图（REGIONS 本体走 QX3D_DATA.REGIONS，本件只补投影坐标与河道）'
]) + '\n' +
  'var GEO_POINTS = ' + JSON.stringify(geo) + ';\n' +
  'var RIVERS = ' + JSON.stringify(rivers) + ';\n' +
  '\n' +
  "if (typeof module !== 'undefined' && module.exports) {\n" +
  '  module.exports = { GEO_POINTS: GEO_POINTS, RIVERS: RIVERS };\n' +
  '} else {\n' +
  '  var __g = (typeof window !== "undefined") ? window : globalThis;\n' +
  '  __g.QX_DEMO_GEO = { geo: GEO_POINTS, rivers: RIVERS };\n' +
  '}\n';

const outPath = path.join(__dirname, '..', 'data', 'demo-geo.js');
fs.writeFileSync(outPath, out, 'utf8');
console.log('extract-demo-geo: demo-geo.js ' + out.length + 'B ← demo-data.js（geo ' +
  Object.keys(geo).length + ' 条 + rivers ' + rivers.length + ' 条）');
