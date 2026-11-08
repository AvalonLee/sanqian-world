/* extract-world-events.cjs — 36 案世界事件：WORLD_EVENTS + WRITEBACK + FAIL（扩展引擎）
 * + EV_TURN_MAP（content-merge 旬位映射，v3.0 §八 三幕排期）
 * 生成 → game/data/world-events.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('world-events', 'world-events.js', [
  { src: 'assets/worlds/wuxia/index.js', decls: [['WORLD_EVENTS', 'var']] },
  { src: 'assets/worlds/wuxia/index.js', decls: [['WB_STATE', 'var']] },
  { src: 'assets/worlds/wuxia/index.js', decls: [['WRITEBACK', 'var']] },
  { src: 'assets/worlds/wuxia/index.js', decls: [['FAIL', 'var']] },
  { src: 'view/games/qunxia/content-merge.js', decls: [['EV_TURN_MAP', 'var']] }
], { subtitle: 'WORLD_EVENTS 36 案（三档收益/出场戏）+ WRITEBACK 写回 + FAIL 败代价 + EV_TURN_MAP v3.0 旬位' });

console.log('extract-world-events: ' + r.file + ' ' + r.bytes + 'B');
