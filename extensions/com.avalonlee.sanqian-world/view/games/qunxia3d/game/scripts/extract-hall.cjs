/* extract-hall.cjs — P4-F 立号三表（册316 · F1）：
 *   hall.js  HALL_NAME_POOL / HALL_RECRUIT_JOBS / HALL_MEMBER_LINES
 * 与 A/B/E 三族不同：本段**零 base64**（46KB 全是真码），故不做头像占位化。 */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('hall', 'hall.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['HALL_NAME_POOL', 'const'],
    ['HALL_RECRUIT_JOBS', 'const'],
    ['HALL_MEMBER_LINES', 'const']
  ]
}], { subtitle: 'P4-F 立号：门派名池 6 + 招募三岗 + 门人三句（**零 base64，无占位化**）' });
console.log('extract-hall: hall.js ' + r.bytes + 'B');
