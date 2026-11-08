/* extract-scrolls.cjs — 残卷命题表：SCROLL_PROPOSITIONS_DB + MASTER_SCROLL_TAGS
 * （创角 selectOrigin 依赖 drawScrollProposition / applyScrollPropositionToNewGame）
 * 生成 → game/data/scrolls.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('scrolls', 'scrolls.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['SCROLL_PROPOSITIONS_DB', 'const'],
    ['MASTER_SCROLL_TAGS', 'const']
  ]
}], { subtitle: 'SCROLL_PROPOSITIONS_DB 残卷命题池 + MASTER_SCROLL_TAGS 名宿残卷态度标签' });

console.log('extract-scrolls: ' + r.file + ' ' + r.bytes + 'B');
