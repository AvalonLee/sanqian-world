/* extract-canon.cjs — 内置 6 案日程：CANON_EVENTS_SCHEDULE（含 onCanonExpire 闭包，走 state 槽位）
 * 生成 → game/data/canon.js */
'use strict';
const { buildData } = require('./build.cjs');

const r = buildData('canon', 'canon.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['CANON_EVENTS_SCHEDULE', 'const']
  ]
}], {
  subtitle: 'CANON_EVENTS_SCHEDULE 内置 6 案（恒定旬位；36 案扩展事件由 payload 注入）',
  runtimeStateSlot: true
});

console.log('extract-canon: ' + r.file + ' ' + r.bytes + 'B');
