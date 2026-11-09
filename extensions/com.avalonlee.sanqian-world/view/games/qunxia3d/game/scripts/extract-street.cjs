/* extract-street.cjs — P4-A 市井层数据七表（册300）：
 *   street.js  STREET_ZONE_BLUR / STREET_INTEL_LABEL / STREET_SURNAMES / STREET_GIVEN /
 *              STREET_SCENE_RULES / STREET_TILE_BIND / STREET_JOBS
 * **头像占位化（用户拍板 2026-11-08/09）**：STREET_JOBS 每条 `art` 内嵌 base64 PNG
 * （全表 ~1.8MB、占源段 98.3%），由生成器统一替换为空串；正典 data URI 保留在
 * game.html 源里，重跑可还原。占位替换 = 生成规则（lib.placeholderArt），非手改。
 * 派生表 STREET_JOB_BY_ID 不进数据件（systems/street.js 载入时由 STREET_JOBS 现算）。 */
'use strict';
const { buildData } = require('./build.cjs');
const { placeholderArt } = require('./lib.cjs');

const r = buildData('street', 'street.js', [{
  src: 'view/games/qunxia/game.html',
  decls: [
    ['STREET_ZONE_BLUR', 'const'],
    ['STREET_INTEL_LABEL', 'const'],
    ['STREET_SURNAMES', 'const'],
    ['STREET_GIVEN', 'const'],
    ['STREET_SCENE_RULES', 'const'],
    ['STREET_TILE_BIND', 'const'],
    ['STREET_JOBS', 'const']
  ],
  transform: placeholderArt
}], {
  subtitle: 'P4-A 市井层七表（**STREET_JOBS.art 头像占位化：用户拍板，base64 data URI 由生成器替换为空串**；正典 URI 在 game.html 源）',
  transform: placeholderArt
});
console.log('extract-street: street.js ' + r.bytes + 'B (头像占位化)');
