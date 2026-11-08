/* extract-masters.cjs — 名宿三件拆分（册278 重构）：
 *   masters.js        MASTERS_INIT（载入面 · M0 消费）
 *   masters-stories.js MASTER_STAGE_REQS + MASTER_STORIES（**lazy 不挂载** · M5 名宿交互消费）
 *   side-cast.js      SIDE_CAST（**lazy 不挂载** · P4-B/M7+ 消费）
 * SIDE_CAST 头像占位化（**用户拍板 2026-11-08**）：条目内嵌 base64 头像 data URI
 * （单条 146~211KB、全表 ~3.4MB）由生成器统一替换为 ''（正典 data URI 保留在
 * game.html 源里，重跑可还原；统一处理时回填）。占位替换 = 生成规则（lib.placeholderArt），
 * 非手改——对表沙箱用同一函数生成 ground truth。 */
'use strict';
const fs = require('fs');
const path = require('path');
const { buildData, OUT } = require('./build.cjs');
const { placeholderArt } = require('./lib.cjs');

/* MASTERS_INIT（载入面） */
const r1 = buildData('masters', 'masters.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['MASTERS_INIT', 'const']
  ]
}], { subtitle: 'MASTERS_INIT 24 名宿（计划书「名宿 12 人」指可交互名宿子集）——MASTER_STORIES/REQS 拆 masters-stories.js、SIDE_CAST 拆 side-cast.js（均 lazy）' });
console.log('extract-masters: masters.js ' + r1.bytes + 'B');

/* MASTER_STAGE_REQS + MASTER_STORIES（lazy · M5） */
const r2 = buildData('masters', 'masters-stories.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['MASTER_STAGE_REQS', 'const'],
    ['MASTER_STORIES', 'const']
  ]
}], { subtitle: 'MASTER_STAGE_REQS 三幕门槛 + MASTER_STORIES 三幕传记（10 人有幕）——lazy：M5 名宿交互批挂载 + core.data.adopt 合并' });
console.log('extract-masters: masters-stories.js ' + r2.bytes + 'B (lazy)');

/* SIDE_CAST（lazy · P4-B/M7+ · 头像占位化） */
const r3 = buildData('masters', 'side-cast.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['SIDE_CAST', 'const']
  ],
  transform: placeholderArt
}], {
  subtitle: 'SIDE_CAST P4-B 配角（**头像占位化：用户拍板 2026-11-08，base64 data URI 由生成器替换为空串**，正典 URI 在 game.html 源）——lazy：P4-B/M7+ 批挂载 + core.data.adopt 合并',
  transform: placeholderArt
});
console.log('extract-masters: side-cast.js ' + r3.bytes + 'B (lazy, 头像占位化)');
