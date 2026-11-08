/* extract-sects.cjs — 门派表：SECTS_DB 12 派（收徒铁律 evaluateSectRequirements 属函数，
 * 按计划书随 sect 系统迁移批走 systems/，本件只抽纯数据表）
 * 生成 → game/data/sects.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('sects', 'sects.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['SECTS_DB', 'const']
  ]
}], { subtitle: 'SECTS_DB 12 派（名号/档位/辈分/收徒规则标签）' });

console.log('extract-sects: ' + r.file + ' ' + r.bytes + 'B');
