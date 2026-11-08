/* extract-all.cjs — 数据管线总入口（计划书铁律 2）：依次跑九件抽取器并打印逐表读数。
 * 用法：node game/scripts/extract-all.cjs   （在扩展根或本目录均可，路径解析按本文件位置）
 * 判据：全部成功 + 逐表计数守恒（各表期望条数在此处断言，防切片截断静默通过）。
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const HERE = __dirname;
const pieces = [
  'extract-martial.cjs', 'extract-sects.cjs', 'extract-items.cjs', 'extract-masters.cjs',
  'extract-origins.cjs', 'extract-encounters.cjs', 'extract-world-events.cjs',
  'extract-canon.cjs', 'extract-regions.cjs', 'extract-scrolls.cjs', 'extract-state-init.cjs', 'extract-combo.cjs',
  'extract-demo-geo.cjs',
  'extract-demo-geo.cjs'
];

let failed = 0;
pieces.forEach(p => {
  const r = spawnSync(process.execPath, [path.join(HERE, p)], { encoding: 'utf8' });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status !== 0) { failed++; console.log('  ✗ ' + p + '\n' + out); }
  else console.log('  ✓ ' + out.replace(/\n/g, '\n    '));
});

/* 逐表守恒断言：生成物加载后数条数。期望值归因（改动源表时此处红 → 归因后改期望）：
 *   MARTIAL_DB 33 = 计划书 §四「MARTIAL_DB 33门」；ORIGINS 6 × TALENTS_POOL 16 × OPENING_VOWS 3 = 计划书 #4；
 *   TRADE_GOODS_DB 8 = 八州特产；SECTS_DB 12 = 12 派；MID_ROAD_EVENTS 8 = M1 验收「8 事件效果对表」；
 *   CANON_EVENTS_SCHEDULE 6 = 内置 6 案；WORLD_EVENTS / EV_TURN_MAP 36 = 36 案；REGIONS 30 = 30 地界；
 *   REALM_NAMES 6 = 境界六档；MAIN_QUEST_CHAPTERS 3 = 主线三章（M5）；ENDINGS_DB 6 = 六道途；
 *   MASTERS_INIT 24 = 源表实测（计划书「名宿 12 人」指可交互名宿子集）；MASTER_STAGE_REQS 3 = 三幕。 */
const dataDir = path.join(HERE, '..', 'data');
const expect = {
  'martial.js': { MARTIAL_DB: 33, ACUPOINTS_DB: null, SYNERGIES_DB: null },
  'sects.js': { SECTS_DB: 12 },
  'items.js': { ITEMS_DB: null, TRADE_GOODS_DB: 8, ESTATE_BUILDINGS_DB: null, STEWARDS_BONUS_DESC: null },
  'masters.js': { MASTERS_INIT: 24 },
  'masters-stories.js': { MASTER_STAGE_REQS: 3, MASTER_STORIES: null },
  'side-cast.js': { SIDE_CAST: 34 },
  'demo-geo.js': { GEO_POINTS: 30, RIVERS: 2 },
  'origins.js': { ORIGINS: 6, TALENTS_POOL: 16, OPENING_VOWS_DB: 3, ENDINGS_DB: 6 },
  'encounters.js': { MID_ROAD_EVENTS: 8, SECRET_REALMS_DB: null },
  'world-events.js': { WORLD_EVENTS: 36, EV_TURN_MAP: 36 },
  'canon.js': { CANON_EVENTS_SCHEDULE: 6 },
  'regions.js': { REGIONS: 30, REALM_NAMES: 6, MAIN_QUEST_CHAPTERS: 3 },
  'scrolls.js': { SCROLL_PROPOSITIONS_DB: null, MASTER_SCROLL_TAGS: null },
  'state-init.js': { QX3D_STATE_INIT: null },
  'combo.js': { FORM_META: 3, SHI_META: 3, FORM_SHI_COMBO_NAMES: 6 }
};
function countOf(v) {
  if (v == null) return 0;
  if (Array.isArray(v)) return v.length;
  if (typeof v === 'object') return Object.keys(v).length;
  return 1;
}
let bad = 0;
Object.keys(expect).forEach(f => {
  const fp = path.join(dataDir, f);
  if (!fs.existsSync(fp)) { console.log('  ✗ 缺生成物 ' + f); bad++; return; }
  const mod = require(fp);
  Object.keys(expect[f]).forEach(k => {
    const want = expect[f][k];
    const got = countOf(mod[k]);
    console.log('    ' + f + ' · ' + k + ' = ' + got + (want == null ? '' : (got === want ? ' ✓' : ' ✗ 期望 ' + want)));
    if (want != null && got !== want) bad++;
  });
});
if (bad || failed) {
  console.log('EXTRACT_FAIL failed=' + failed + ' mismatch=' + bad);
  process.exit(1);
}
console.log('EXTRACT_ALL_GREEN 12 表 / 守恒断言通过');
