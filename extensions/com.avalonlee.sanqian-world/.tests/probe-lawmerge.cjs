/* .tests/probe-lawmerge.cjs — UI v2 B3「功法 / 百器」拆页渲染探针（无浏览器依赖）
 *
 * 背景：原「法与器」合并页在 B3 拆回「功法」「百器」两页。合并页的 chip / 概览条 / 段标
 * （`lawchips` / `laware` / `lawsec-*` / `lawChip` / `lawJump`）与词表 `arts.system` /
 * `arts.seg.*` / `arts.ov.*` 同批退役。本探针锁拆页后的两个方向：
 *   ① 功法页（`renderArts`）只渲染法段，百器标志缺席；
 *   ② 百器页（`renderGear`）只渲染器段，功法标志缺席；
 *   ③ 两页都不得再出现合并页残件；零 undefined / NaN / 未替换占位符。
 * 「缺席」写成独立断言——红的时候能读出是「多渲染了」还是「漏渲染了」。
 *
 * 做法：从 `view/index.html` 抽 renderArts / renderGear（真源码），在 vm 里配真实引擎数据
 * （sandbox 装载 assets/**）与最小 DOM/工具桩，真跑两页拼接。
 *
 * 用法：node .tests/probe-lawmerge.cjs     末行 LAWMERGE_ALL_GREEN n/n 或 LAWMERGE_FAILED k
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('./sandbox.cjs');

const ROOT = path.resolve(__dirname, '..');
const viewDir = path.join(ROOT, 'view');
const HTML = fs.readFileSync(path.join(viewDir, 'index.html'), 'utf8') + '\n' +
  fs.readdirSync(viewDir).filter((f) => f.endsWith('.js')).sort()
    .map((f) => fs.readFileSync(path.join(viewDir, f), 'utf8')).join('\n');

function extractFn(name) {
  const head = 'function ' + name + '(';
  const i = HTML.indexOf(head);
  if (i < 0) throw new Error('function not found: ' + name);
  let j = HTML.indexOf('{', i);
  let depth = 0, k = j;
  for (; k < HTML.length; k++) {
    const c = HTML[k];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  if (depth !== 0) throw new Error('brace unbalanced in ' + name);
  return HTML.slice(i, k + 1);
}

const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail || '' });

(async () => {
  const { sandbox } = load([], { quiet: true });
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const D = pack.data;

  const w = pack.initialState();
  w.realm = 4; w.stones = 12345; w.qi = 800; w.total = 800;
  const am = pack.artsMap();
  const artIds = Object.keys(am).slice(0, 3);
  w.artsKnown = artIds.slice();
  w.artsSlots = artIds.slice(0, 2);
  w.artsLevels[artIds[0]] = 4;
  w.artsLevels[artIds[1]] = 0;
  const profile = { name: '探针', worldId: 'xiuxian', talents: [], alignBias: 'neutral' };
  const modsNow = SQ.Mods.collect(profile, w, pack, D);
  const slots = D.GEAR_SLOTS || [];
  slots.forEach((s, i) => { if (i < 2) w.gear[s] = SQ.Gear.roll(w, pack, D, 0, modsNow, { slot: s }); });
  w.stash = [SQ.Gear.roll(w, pack, D, 0, modsNow, { slot: slots[0] })];

  const written = {};
  const elStub = () => ({
    innerHTML: '',
    classList: { remove() {}, add() {}, toggle() {}, contains() { return false; } },
    style: {}, dataset: {}, textContent: '',
    querySelector() { return null; }, appendChild() {}, scrollIntoView() {}
  });
  const write = (id) => { if (!written[id]) written[id] = elStub(); return written[id]; };
  const CB = {
    s: { profile, meta: { achv: [], earnedKeys: {} }, worlds: { xiuxian: w } },
    w: w, p: pack, d: D, mods: modsNow,
    ui: { slotPickFor: null, artsGroup: 'tier', artsGroupVal: null },
    $: write,
    esc: (x) => String(x == null ? '' : x).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])),
    t: (k, v) => SQ.t(k, v || null, 'xiuxian'),
    pct: (n) => (Math.round(n * 1000) / 10).toString().replace(/\.0$/, '') + '%',
    tierCls: (x) => (x == null ? '' : 't' + (x >= 4 ? 4 : x)),
    artTier: () => 't2', carrier: () => null,
    renderTab: () => {}, renderAll: () => {}, toast: () => {}, ask: () => {},
    timeLeft: () => '—', date: () => '', statLine: () => '桩面板',
    specialEff: () => '', holder: () => null, holderState: () => ''
  };
  const ctx = {
    SQ, __C: CB,
    D: () => D, ws: () => w, pack: () => pack, mods: () => modsNow,
    ui: CB.ui, $: CB.$, esc: CB.esc, t: CB.t, pct: CB.pct,
    renderFuseAltar: CB.fuseAltar,
    statLine: CB.statLine, specialEffText: CB.specialEff, gearHolder: CB.holder, gearHolderState: CB.holderState,
    tierCls: CB.tierCls, artTierCls: CB.artTier, carrierOf: CB.carrier,
    timeAgo: () => '3日前', fmtDate: () => '2026-10-14', gameDateStr: () => '罗云历1年1月1日',
    Date, Math, JSON, console
  };
  ctx.window = ctx;
  vm.createContext(ctx);

  vm.runInContext(fs.readFileSync(path.join(ROOT, 'view/arts.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'view/gear.js'), 'utf8'), ctx);
  vm.runInContext('function ctx() { return this.__C; }\n' + ['renderArts', 'renderGear'].map(extractFn).join('\n\n') +
    '\n;this.__arts = renderArts; this.__gear = renderGear;', ctx);

  function renderPage(which) {
    const id = which === 'arts' ? 'tab-arts' : 'tab-gear';
    written[id] = elStub();
    let err = null;
    try { if (which === 'arts') ctx.__arts(); else ctx.__gear(); } catch (e) { err = e; }
    return { err, h: (written[id] || {}).innerHTML || '', msg: err ? (err.message + ' @ ' + (err.stack || '').split('\n')[1]) : 'clean' };
  }

  const FA_MARKS = [
    ['功法·修习槽', 'data-mainart="1"'],
    ['功法·自悟节', 'class="tcard selflearn"'],
    ['功法·融合坛悟道石', 'data-act="matWudao"']
  ];
  const QI_MARKS = [
    ['百器·百器录行', 'data-act="openGearCodex"'],
    ['百器·四槽一行', 'class="gear4"'],
    ['百器·百器录整行', 'class="lrow codexrow"']
  ];
  const has = (h, marks) => marks.filter(([, s]) => h.indexOf(s) >= 0).map(([n]) => n);
  const missing = (h, marks) => marks.filter(([, s]) => h.indexOf(s) < 0).map(([n]) => n);

  /* ── A 相：功法页 ── */
  const a = renderPage('arts');
  ok('A0 功法页渲染零异常', !a.err, a.msg);
  ok('A1 功法页写入 #tab-arts 且非空', a.h.length > 0, 'len=' + a.h.length);
  ok('A2 功法段标志元素在位', missing(a.h, FA_MARKS).length === 0, missing(a.h, FA_MARKS).join(',') || 'all found');
  ok('A3 **百器段标志全部缺席**（拆页互斥）', has(a.h, QI_MARKS).length === 0, '多渲染了: ' + (has(a.h, QI_MARKS).join(',') || '无'));
  ok('A4 功法页无合并页残件（lawchips / laware / lawsec- / lawChip / lawJump 全零）',
    ['lawchips', 'laware', 'lawsec-', 'lawChip', 'lawJump'].every((k) => a.h.indexOf(k) < 0),
    ['lawchips', 'laware', 'lawsec-', 'lawChip', 'lawJump'].filter((k) => a.h.indexOf(k) >= 0).join(',') || 'clean');

  /* ── B 相：百器页 ── */
  const artsBefore = written['tab-arts'].innerHTML;
  const b = renderPage('gear');
  ok('B0 百器页渲染零异常', !b.err, b.msg);
  ok('B1 百器页写入 #tab-gear 且非空', b.h.length > 0, 'len=' + b.h.length);
  ok('B2 百器段标志元素在位', missing(b.h, QI_MARKS).length === 0, missing(b.h, QI_MARKS).join(',') || 'all found');
  ok('B3 **功法段标志全部缺席**（拆页互斥对称面）', has(b.h, FA_MARKS).length === 0, '多渲染了: ' + (has(b.h, FA_MARKS).join(',') || '无'));
  ok('B4 百器页不写 #tab-arts（两页各自容器）', written['tab-arts'].innerHTML === artsBefore, 'artsLen=' + written['tab-arts'].innerHTML.length);

  /* ── C 相：漏值扫描 ── */
  const both = [['功法页', a.h], ['百器页', b.h]];
  ok('C1 零 undefined 漏进 HTML',
    both.every(([, s]) => s.indexOf('undefined') < 0),
    both.filter(([, s]) => s.indexOf('undefined') >= 0).map(([n]) => n).join(',') || 'clean');
  ok('C2 零 NaN 漏进 HTML',
    both.every(([, s]) => s.indexOf('NaN') < 0),
    both.filter(([, s]) => s.indexOf('NaN') >= 0).map(([n]) => n).join(',') || 'clean');
  ok('C3 零未替换占位符 `{`（含退役键 arts.* 回落）',
    both.every(([, s]) => s.indexOf('{') < 0 && s.indexOf('arts.system') < 0 && s.indexOf('arts.seg.') < 0 && s.indexOf('arts.ov.') < 0),
    both.filter(([, s]) => s.indexOf('{') >= 0 || s.indexOf('arts.system') >= 0 || s.indexOf('arts.seg.') >= 0 || s.indexOf('arts.ov.') >= 0).map(([n]) => n).join(',') || 'clean');

  let fail = 0;
  R.forEach((r) => { if (!r.ok) fail++; console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + r.name + (r.detail ? ' (' + r.detail + ')' : '')); });
  console.log(fail === 0 ? 'LAWMERGE_ALL_GREEN ' + R.length + '/' + R.length : 'LAWMERGE_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})();
