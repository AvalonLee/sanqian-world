/* extract-encounters.cjs — 途中奇遇：MID_ROAD_EVENTS + SECRET_REALMS_DB 12 传世秘境
 * 生成 → game/data/encounters.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('encounters', 'encounters.js', [
  { src: 'view/games/qunxia/game.html', decls: [['MID_ROAD_EVENTS', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['SECRET_REALMS_DB', 'const']] }
], { subtitle: 'MID_ROAD_EVENTS 行脚途中奇遇 + SECRET_REALMS_DB 12 传世秘境' });

console.log('extract-encounters: ' + r.file + ' ' + r.bytes + 'B');
