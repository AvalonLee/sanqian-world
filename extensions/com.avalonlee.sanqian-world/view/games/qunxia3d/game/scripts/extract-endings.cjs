/* extract-endings.cjs — 终局六道途 + 碑林遗泽（M6 数据面）
 * 生成 → game/data/endings.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('endings', 'endings.js', [
  { src: 'view/games/qunxia/game.html', decls: [['LIFE_PATHS_DB', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['LEGACY_PERKS_DB', 'const']] },
], { subtitle: 'LIFE_PATHS_DB 六道途（isDone/progressText 闭包逐字）+ LEGACY_PERKS_DB 碑林五遗泽 ' });

console.log('extract-endings: endings.js ' + r.bytes + 'B');
