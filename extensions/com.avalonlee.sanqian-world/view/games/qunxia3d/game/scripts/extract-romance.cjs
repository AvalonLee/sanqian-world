/* extract-romance.cjs — P4-E 情缘四表（册311 · E1）：
 *   romance.js  ROMANCE_CAST / ROMANCE_STAGE_WORD / SIDE_DUTY_IDS / DUTY_WORD
 * 头像占位化同 A/B 族（ROMANCE_CAST.art 内嵌 base64，占段 98.4%）。 */
'use strict';
const { buildData } = require('./build.cjs');
const { placeholderArt } = require('./lib.cjs');

const r = buildData('romance', 'romance.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['ROMANCE_CAST', 'const'],
    ['ROMANCE_STAGE_WORD', 'const'],
    ['SIDE_DUTY_IDS', 'const'],
    ['DUTY_WORD', 'const']
  ],
  transform: placeholderArt
}], { subtitle: 'P4-E 情缘：34 人表 + 阶段词 + 差事键（**art 头像占位化：同 A/B 族拍板**）' });
console.log('extract-romance: romance.js ' + r.bytes + 'B');
