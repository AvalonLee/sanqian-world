/* .tests/probe-alchemyfail.cjs — C3 炼制失败原因族探针（执行取证）
 * 三条判据：
 *   ① reason 全集 = 真跑 SQ.Alchemy.startCraft 的各阻塞组合**枚举出来的**（不是猜的、不是读注释的）；
 *   ② view 侧 AL_FAIL_KEYS 表（从 view/index.html 正则抽出）逐条能在词表解析成中文，
 *      解析值零裸拉丁（A4 同口径白名单 Lv/NPC/pp/AI/JSON）；
 *   ③ 每个真跑出的 reason 都必须在表内 ⇒ 失败 toast 不可能再上屏 'mats' / 'has' 这类内部字段名。
 * 用法：node .tests/probe-alchemyfail.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;
const AD = D.ALCHEMY;

let pass = 0, fail = 0;
function T(ok, name, detail) {
  if (ok) pass++; else fail++;
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
}

/* ── 抽 view 侧映射表 + alFailText 兜底口 ── */
/* 第册四十六批：这一族已外置成 view/alchemy.js ⇒ 抽源码的读点跟着走（指回 index.html 就抽不到，V0 判红是有意的） */
const viewSrc = fs.readFileSync(path.join(ROOT, 'view/alchemy.js'), 'utf8');
const tbl = viewSrc.match(/var AL_FAIL_KEYS = \{([\s\S]*?)\n\s*\};/);
T(!!tbl, 'V0 view 里能抽到 AL_FAIL_KEYS 表（读点已从「拼字符串」换成显式表）');
const mapRaw = tbl ? tbl[1].replace(/\/\*[\s\S]*?\*\//g, '') : '';
const MAP = {};
let m1; const re1 = /([a-zA-Z]+)\s*:\s*'([^']+)'/g;
while ((m1 = re1.exec(mapRaw))) MAP[m1[1]] = m1[2];
T(Object.keys(MAP).length >= 11, 'V1 表内 reason 条目 ≥ 11', 'n=' + Object.keys(MAP).length);
const OTHER = (viewSrc.match(/alchemy\.ui\.fail\.other/g) || []).length >= 2;
T(OTHER, 'V2 alFailText 有 alchemy.ui.fail.other 兜底（未知 reason 也不裸上屏）');

/* ── 真跑枚举 reason 全集 ── */
function baseWs(opt) {
  const ws = pack.normalize({});
  ws.realm = opt.realm == null ? 3 : opt.realm;
  ws.stones = 99999; ws.qi = 9999;
  ws.alchemy = SQ.Alchemy.normalize({ furnace: !!opt.furnace, recipes: opt.recipes || [], blueprints: opt.bps || [] }, D);
  if (opt.craft) ws.alchemy.craft = opt.craft;
  if (opt.pills) opt.pills.forEach(function (k) { ws.alchemy.pills[k] = 99; });
  ws.materials = {};
  if (opt.mats !== false) (AD.MATS || []).forEach(function (mm) { if (mm.z >= 0) ws.materials[mm.id] = 99; });
  return ws;
}
const metaYes = { unlocks: { alchemy: true } };   /* 丹炉资格渠道②（不靠 al.furnace，避开 'has' 干扰） */
const metaNo = { unlocks: {} };
const R = [];
function call(tag, ws, kind, id, opts, meta) {
  const r = SQ.Alchemy.startCraft(ws, pack, D, kind, id, opts || {}, meta || metaNo, Date.now(), null);
  if (r && r.ok) R.push({ tag: tag, reason: 'OK' });
  else R.push({ tag: tag, reason: r && r.reason });
  return r;
}
const rec0 = AD.RECIPES[0];
const bpSlot = (AD.BLUEPRINTS || []).filter(function (b) { return !b.furnace; })[0];
const bpFur = (AD.BLUEPRINTS || []).filter(function (b) { return b.furnace; })[0];

call('realm', baseWs({ realm: 0, furnace: true, recipes: [rec0.id] }), 'dan', rec0.id, {}, metaYes);
call('busy', baseWs({ realm: 3, furnace: true, recipes: [rec0.id], craft: { kind: 'dan', id: rec0.id, doneAt: Date.now() + 9e5 } }), 'dan', rec0.id, {}, metaYes);
call('furnace', baseWs({ realm: 3, furnace: false, recipes: [rec0.id] }), 'dan', rec0.id, {}, metaNo);
call('recipe', baseWs({ realm: 3, furnace: true, recipes: [] }), 'dan', rec0.id, {}, metaYes);
call('recipe.realm', baseWs({ realm: rec0.realm - 1 >= 1 ? rec0.realm - 1 : 1, furnace: true, recipes: [rec0.id] }), 'dan', rec0.id, {}, metaYes);
call('stock', baseWs({ realm: 6, furnace: true, recipes: [rec0.id], pills: [rec0.pill] }), 'dan', rec0.id, {}, metaYes);
call('mats.dan', baseWs({ realm: 6, furnace: true, recipes: [rec0.id], mats: false }), 'dan', rec0.id, {}, metaYes);
call('bp', baseWs({ realm: 3, furnace: true, bps: [] }), 'qi', bpSlot.id, {}, metaYes);
call('bp.unknown', baseWs({ realm: 3, furnace: true, bps: [bpSlot.id] }), 'qi', 'bp_nosuch', {}, metaYes);
call('has', baseWs({ realm: 3, furnace: true, bps: [bpFur.id] }), 'qi', bpFur.id, {}, metaYes);
call('mats.qi', baseWs({ realm: 3, furnace: true, bps: [bpSlot.id], mats: false }), 'qi', bpSlot.id, {}, metaYes);
call('dir', baseWs({ realm: 3, furnace: true, bps: [bpSlot.id] }), 'qi', bpSlot.id, {}, metaYes);
call('dir.locked', baseWs({ realm: 3, furnace: true, bps: [bpSlot.id] }), 'qi', bpSlot.id, { dir: '__none__' }, metaYes);
call('kind', baseWs({ realm: 3, furnace: true, bps: [bpSlot.id] }), 'fangshu', bpSlot.id, {}, metaYes);

/* attr：找一个「打造品阶 ≥3 且有方向可选」的境界，再缺 attr 触发 */
let attrHit = null;
for (let rg = 1; rg < D.REALMS.length && !attrHit; rg++) {
  const zc = Math.min(rg, D.ZONES.length - 1);
  (AD.BLUEPRINTS || []).forEach(function (bp) {
    if (attrHit || bp.furnace) return;
    const t = SQ.Alchemy.bpTierOf({ realm: rg }, D, zc, bp);
    const dirs = (AD.FORGE_DIRS || {})[bp.slot] || [];
    if (t >= 3 && dirs.length && t >= (dirs[0].minTier || 0)) attrHit = { realm: rg, bp: bp, dir: dirs[0].dir };
  });
}
if (attrHit) {
  call('attr', baseWs({ realm: attrHit.realm, furnace: true, bps: [attrHit.bp.id] }), 'qi', attrHit.bp.id, { dir: attrHit.dir }, metaYes);
}
T(!!attrHit, 'E0 已构造出品阶 ≥3 的 attr 触发场景', attrHit ? 'realm=' + attrHit.realm + ' bp=' + attrHit.bp.id : '无');

const got = {};
R.forEach(function (x) { if (x.reason !== 'OK') got[x.reason] = (got[x.reason] || 0) + 1; });
const gotList = Object.keys(got).sort();
console.log('  枚举到的 reason = ' + gotList.join('/') + '   （各场景：' +
  R.map(function (x) { return x.tag + '=' + x.reason; }).join(' ') + '）');

const need = ['realm', 'busy', 'furnace', 'recipe', 'stock', 'mats', 'bp', 'has', 'dir', 'attr', 'kind'];
const missingRun = need.filter(function (r) { return !got[r]; });
T(missingRun.length === 0, 'E1 reason 全集 11 条全部真跑复现（零猜测）', missingRun.length ? '未跑出: ' + missingRun : 'ok');
const unmapped = gotList.filter(function (r) { return !MAP[r]; });
T(unmapped.length === 0, 'E2 每个跑出的 reason 都在 AL_FAIL_KEYS 表内', unmapped.length ? '裸奔: ' + unmapped : 'ok');

/* ── 词表可解析 + 零裸拉丁 ── */
const LATIN_OK = ['Lv', 'NPC', 'pp', 'AI', 'JSON'];
const lexAll = Object.assign({}, SQ.LEX.common, SQ.LEX.xiuxian);
const bad = [];
Object.keys(MAP).forEach(function (r) {
  const k = MAP[r], v = lexAll[k];
  if (v == null) { bad.push(r + '→缺键 ' + k); return; }
  const latin = (String(v).replace(/\{[^}]*\}/g, '').match(/[A-Za-z]+/g) || []).filter(function (x) { return LATIN_OK.indexOf(x) < 0; });
  if (latin.length) bad.push(r + '→裸拉丁 ' + latin.join(','));
});
T(bad.length === 0, 'W1 表内每个键都能在词表解析成人话且零裸拉丁', bad.join(' | ') || 'ok');
/* 复刻 alFailText 的兜底：未知 reason → other */
T(lexAll['alchemy.ui.fail.other'] != null, 'W2 兜底键 alchemy.ui.fail.other 存在', String(lexAll['alchemy.ui.fail.other'] || ''));
/* 本批新铸 / 复用的关键两条：busy 与 mats 走既有键（键名不一致收口） */
T(MAP.busy === 'alchemy.ui.busy' && lexAll['alchemy.ui.busy'] != null,
  'W3 busy 复用既有孤儿键 alchemy.ui.busy（不是另铸同义键）', MAP.busy + ' = ' + lexAll['alchemy.ui.busy']);
T(MAP.mats === 'alchemy.ui.matslack' && MAP.furnace === 'alchemy.ui.nofurnace' &&
  MAP.stock === 'alchemy.ui.stockfull' && MAP.realm === 'alchemy.ui.unlock',
  'W4 四条既有键原位复用（mats/furnace/stock/realm）', JSON.stringify(MAP));

console.log(fail === 0 ? 'PROBE_ALCHEMYFAIL_ALL_GREEN ' + pass + '/' + (pass + fail)
  : 'PROBE_ALCHEMYFAIL_FAILED ' + fail + '/' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
