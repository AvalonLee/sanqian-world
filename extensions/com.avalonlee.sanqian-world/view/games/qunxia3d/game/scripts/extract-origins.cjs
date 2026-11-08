/* extract-origins.cjs — 创角表：ORIGINS 6 出身 + TALENTS_POOL 16 天赋 + OPENING_VOWS_DB 3 誓言 + ENDINGS_DB
 * 生成 → game/data/origins.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('origins', 'origins.js', [
  { src: 'view/games/qunxia/game.html', decls: [['ORIGINS', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['ENDINGS_DB', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['TALENTS_POOL', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['OPENING_VOWS_DB', 'const']] }
], { subtitle: 'ORIGINS 6 出身 + ENDINGS_DB 六道途判词 + TALENTS_POOL 先天命格 + OPENING_VOWS_DB 昆仑雪夜三问' });

console.log('extract-origins: ' + r.file + ' ' + r.bytes + 'B');
