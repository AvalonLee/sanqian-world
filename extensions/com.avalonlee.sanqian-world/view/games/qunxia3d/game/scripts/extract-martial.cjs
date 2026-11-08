/* extract-martial.cjs — 武学表：MARTIAL_DB 33 门 + 招式元数据 + 羁绊 + 穴位（源规格 §四 #1 前半）
 * 生成 → game/data/martial.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('martial', 'martial.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['STANCE_META', 'const'],
    ['COMBO_ROLE_META', 'const'],
    ['TOKEN_META', 'const'],
    ['MARTIAL_DB', 'const'],
    ['SYNERGIES_DB', 'const'],
    ['ACUPOINTS_DB', 'const']
  ]
}], { subtitle: 'MARTIAL_DB + 招式/形/势/印记元数据 + SYNERGIES 羁绊 + ACUPOINTS 穴位' });

console.log('extract-martial: ' + r.file + ' ' + r.bytes + 'B');
