/* extract-combo.cjs — 连招数据：SHI_META 三势 + FORM_SHI_COMBO_NAMES 成招名表
 * 生成 → game/data/combo.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('combo', 'combo.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['FORM_META', 'const'],
    ['SHI_META', 'const'],
    ['FORM_SHI_COMBO_NAMES', 'const']
  ]
}], { subtitle: 'FORM_META 三形 + SHI_META 三势 + FORM_SHI_COMBO_NAMES 成招名表' });

console.log('extract-combo: ' + r.file + ' ' + r.bytes + 'B');
