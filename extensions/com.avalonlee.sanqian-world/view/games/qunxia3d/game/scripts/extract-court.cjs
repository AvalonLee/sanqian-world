/* extract-court.cjs — P4-C 朝廷风声数据（册301）：
 *   court.js  COURT_BORDER_REGIONS / COURT_NORTH_REGIONS（边关与北地地界清单）
 * 无 base64、无闭包，纯字面量；生成物禁手改，重跑覆盖。
 */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('court', 'court.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['COURT_BORDER_REGIONS', 'const'],
    ['COURT_NORTH_REGIONS', 'const']
  ]
}], { subtitle: 'P4-C 朝廷风声：边关/北地地界清单（buildCourtRumorPool 的「此处/北地」判据）' });
console.log('extract-court: court.js ' + r.bytes + 'B');
