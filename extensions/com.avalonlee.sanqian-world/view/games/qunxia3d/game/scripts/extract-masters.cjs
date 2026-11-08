/* extract-masters.cjs — 名宿表：MASTERS_INIT + 三幕传记门槛/正文
 * 注：SIDE_CAST（P4-B 配角）**不在本件抽取**——该表条目内嵌 base64 头像 data URI
 * （实测单条 146~211KB、全表 ~3.5MB），P4-B 属 M7+ 增量，按计划书容量预算（全游戏 <1.1MB）
 * 留到 P4-B 迁移批连同头像资产策略一并处理。
 * 生成 → game/data/masters.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('masters', 'masters.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['MASTER_STAGE_REQS', 'const'],
    ['MASTERS_INIT', 'const'],
    ['MASTER_STORIES', 'const']
  ]
}], { subtitle: 'MASTERS_INIT 24 名宿（计划书「名宿 12 人」指可交互名宿子集）+ MASTER_STAGE_REQS 三幕门槛 + MASTER_STORIES 三幕传记（10 人有幕）' });

console.log('extract-masters: ' + r.file + ' ' + r.bytes + 'B');
