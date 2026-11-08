/* extract-regions.cjs — 世界与历法：REGIONS 30 地界（7 格本境）+ 主线章节 + 境界名 + 旬历
 * 生成 → game/data/regions.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('regions', 'regions.js', [
  { src: 'view/games/qunxia/game.html', decls: [['REALM_NAMES', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['MAIN_QUEST_CHAPTERS', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['SEASONS', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['XUNS', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['REGIONS', 'const']] }
], { subtitle: 'REGIONS 30 地界（七格本境 + 邻接图）+ MAIN_QUEST_CHAPTERS 主线 + REALM_NAMES 境界 + SEASONS/XUNS 旬历' });

console.log('extract-regions: ' + r.file + ' ' + r.bytes + 'B');
