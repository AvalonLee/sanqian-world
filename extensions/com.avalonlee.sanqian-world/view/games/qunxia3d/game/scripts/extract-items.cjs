/* extract-items.cjs — 物品三表：ITEMS_DB + TRADE_GOODS_DB 八州特产 + ESTATE_BUILDINGS_DB
 * 生成 → game/data/items.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('items', 'items.js', [
  { src: 'view/games/qunxia/game.html', decls: [['ITEMS_DB', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['ESTATE_BUILDINGS_DB', 'const']] },
  { src: 'view/games/qunxia/game.html', decls: [['TRADE_GOODS_DB', 'const']] }
], { subtitle: 'ITEMS_DB + ESTATE_BUILDINGS_DB 隐庐产业 + TRADE_GOODS_DB 八州行商特产 + STEWARDS_BONUS_DESC 隐庐客卿加胜描述' });

console.log('extract-items: ' + r.file + ' ' + r.bytes + 'B');
