/* .tests/probe-lawmerge.cjs — 法与器合并页渲染探针（无浏览器依赖）
 *
 * 为什么需要它：verify-ui-arts.cjs 走真浏览器（playwright-core + Edge），本环境跑不了；
 * 而合并页的段渲染器（lawareBar / secDiv / artsBody / gearBody / lawChipBar）是**逐批新写的代码**，
 * 纯字符串拼接，一旦某个依赖取不到（`SQ.Arts.mainArt` / `d.GEAR_SLOTS` / `w.gear`）
 * 就是整页白屏——冒烟只加载 assets/**、不碰 view，照不出来。
 *
 * 做法：从 view/index.html 抽出这些函数 + renderArts 的源码，在 vm 里配上
 * **真实引擎数据**（sandbox 装载 assets/**）与最小 DOM/工具桩，真跑一遍拼接，
 * 断言零异常、段间互斥、概览条三格值非空、零 `undefined`/`NaN`/`{` 漏进 HTML。
 *
 * 口径变更（**法与器标签化批 2026-10-09 · UI 卷 §3.4a**）：原断言「单页纵向五段齐全 + 有序」
 * 自本批起**结构上必然为假**——功法 / 法器两段改为顶部 chip 互斥，一次只渲染一段。
 * 于是断言面从「两段都在」翻成「**该在的在、不该在的一个都不在**」：
 * chip=fa 时法器段的三个标志元素（`#lawsec-qi` / `openGearCodex` / `geargrid`）必须**缺席**，
 * chip=qi 时功法段的四个标志元素必须**缺席**。缺席判据是这条改动的**唯一硬证据**
 * ——「只少不多」若写成「两段都在但顺序不同」，页面改成什么样都能绿。
 * ⚠️ 本探针刻意把「缺席」写成独立断言（而非合并进「在位」那条的取反），就是为了红的时候能直接读出
 *   是**多渲染了**还是**漏渲染了**。
 *
 * 用法：node .tests/probe-lawmerge.cjs     末行 LAWMERGE_ALL_GREEN n/n 或 LAWMERGE_FAILED k
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('./sandbox.cjs');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'view/index.html'), 'utf8');

/* ── 按函数名抽源码（大括号配平，避开正则跨函数误吞）── */
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
/* 按名抽一行 `var X = [...];`（chip 表 LAW_CHIPS 是数据不是函数，同样抽**真实源码**，
 * 绝不在探针里手抄一份表——手抄那份和 view 那份会各自漂移，正是本仓「测试数据按错假设造」的老坑）*/
function extractVarLine(name) {
  const head = 'var ' + name + ' = [';
  const i = HTML.indexOf(head);
  if (i < 0) throw new Error('var not found: ' + name);
  const j = HTML.indexOf('\n', i);
  const line = HTML.slice(i, j).trim();
  if (!/;$/.test(line)) throw new Error('var line not self-contained: ' + name);
  return line;
}

const R = [];
const ok = (name, cond, detail) => R.push({ name, ok: !!cond, detail: detail || '' });

(async () => {
  /* ── 真引擎数据：借沙箱装载 assets/**，取真实 pack / data / 初始世界态 ── */
  const { sandbox } = load([], { quiet: true });
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const D = pack.data;

  /* 世界态：炼气起步 + 一部主修功法 + 两件佩器（概览条三格都要有真值可读） */
  const w = pack.initialState();
  w.realm = 2; w.stones = 12345; w.qi = 800; w.total = 800;
  const am = pack.artsMap();
  const artIds = Object.keys(am).slice(0, 3);
  w.artsKnown = artIds.slice();
  w.artsSlots = artIds.slice(0, 2);
  w.artsLevels[artIds[0]] = 4;
  w.artsLevels[artIds[1]] = 0;                 /* Lv0 槽内功法（第廿五批起「待重修」金标已撤，此桩只覆盖 Lv0 正常渲染） */
  const slots = D.GEAR_SLOTS || [];
  slots.forEach((s, i) => {
    if (i < 2) w.gear[s] = { id: 'probe_gear_' + i, slot: s, tier: 2, atk: 10 + i, resist: 5 + i, score: 30 };
  });
  w.stash = [{ id: 'probe_stash_0', slot: slots[0], tier: 1, atk: 3, resist: 1, score: 8 }];

  const profile = { name: '探针', worldId: 'xiuxian', talents: [], alignBias: 'neutral' };

  /* ── 最小 DOM / 工具桩：只给这些函数真会用到的东西 ── */
  const written = {};
  const elStub = () => ({
    innerHTML: '',
    classList: { remove() {}, add() {}, toggle() {}, contains() { return false; } },
    style: {}, dataset: {}, textContent: '',
    querySelector() { return null; }, appendChild() {}, scrollIntoView() {}
  });
  const ctx = {
    SQ,
    /* view 里 D() / pack() / ws() / mods() 都是**函数**（`function D() { return pack().data; }`），
     * 桩必须同签名，否则 lawareBar 首行 `d = D()` 直接 TypeError。 */
    D: () => D,
    ws: () => w,
    pack: () => pack,
    mods: () => SQ.Mods.collect(profile, w, pack, D),
    /* ui.lawChip = 标签态（'fa' | 'qi'）；缺省时 renderArts 兜底功法段，由 A3 单独验 */
    ui: { slotPickFor: null, artsGroup: 'tier', artsGroupVal: null, lawChip: 'fa' },
    $: (id) => { if (!written[id]) written[id] = elStub(); return written[id]; },
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    t: (k, v) => SQ.t(k, v || null, 'xiuxian'),
    pct: (n) => (Math.round(n * 1000) / 10).toString().replace(/\.0$/, '') + '%',
    /* 段内子渲染器：本探针只验**拼接与段间互斥**，卡片内部由各 verify-ui-* 真机走查覆盖 */
    artCard: (id) => '<div class="tcard artcard" data-art="' + id + '"></div>',
    artSilhouette: (id) => '<div class="sil" data-art="' + id + '"></div>',
    artCodexCard: (id) => '<div class="tcard codexcard" data-art="' + id + '"></div>',
    gearCard: (g, _w, label, i) => '<div class="tcard gearcard" data-i="' + (i == null ? '' : i) + '"></div>',
    /* 融合坛桩**照真实结构平铺**：`renderFuseAltar()` 返回的不是一个裹好的块，而是
     * 「坛容器 + 一排裸 `.chips` 父母选择器」两个平级片段——上一版桩只返回 `<div class="fusealtar">`，
     * 于是段内第二排 chip 在探针串里根本不存在，标签化批的吸顶碰撞就全靠真机走查才被抓到。
     * 桩形随现实改（承重结构不许在桩里简化）。 */
    renderFuseAltar: () => '<div class="fusealtar"></div><div class="chips"><button data-act="fusePick" data-v="tuna">桩父母</button></div>',
    treasureCard: () => '',
    Date, Math, JSON, console
  };
  ctx.window = ctx;
  vm.createContext(ctx);

  /* ── 装载真实源码（一字不改）：chip 表 + chip 取数 + chip 行 + 概览条 + 段标 + 两段体 + renderArts ── */
  const src = ['lawareBar', 'secDiv', 'artsBody', 'gearBody', 'lawChipOf', 'lawChipBar', 'renderArts']
    .map(extractFn).join('\n\n');
  vm.runInContext(extractVarLine('LAW_CHIPS') + '\n' + src +
    '\n;this.__render = renderArts;', ctx);

  /* 一次渲染 = 设定 chip → 清容器 → 真跑 renderArts → 取回 HTML 串 */
  function renderAs(chip) {
    written['tab-arts'] = elStub();
    if (chip === null) delete ctx.ui.lawChip;      /* null = 模拟 ui 里没有该键（旧状态形状）*/
    else ctx.ui.lawChip = chip;
    let err = null, h = '';
    try { ctx.__render(); h = (written['tab-arts'] || {}).innerHTML || ''; } catch (e) { err = e; }
    return { err, h, msg: err ? (err.message + ' @ ' + (err.stack || '').split('\n')[1]) : 'clean' };
  }

  /* 段标志元素：功法段四个 / 法器段三个（本批的结构断言就挂在这两组上） */
  const FA_MARKS = [
    ['法·段标 #lawsec-fa', 'id="lawsec-fa"'],
    ['功法段（修习槽）', 'data-mainart="1"'],
    ['功法段（自悟节）', 'class="tcard selflearn"'],
    ['功法段（融合坛）', 'class="fusealtar"']
  ];
  const QI_MARKS = [
    ['器·段标 #lawsec-qi', 'id="lawsec-qi"'],
    ['法器段（百器录横幅）', 'data-act="openGearCodex"'],
    ['法器段（器卡网格）', 'cards geargrid']
  ];
  const has = (h, marks) => marks.filter(([, s]) => h.indexOf(s) >= 0).map(([n]) => n);
  const missing = (h, marks) => marks.filter(([, s]) => h.indexOf(s) < 0).map(([n]) => n);
  /* chip 行：按专名类 `.lawchips` 取（页内还有融合坛那排裸 `.chips`，用 `class="chips"` 会取错对象） */
  function chipRow(h) {
    const i = h.indexOf('<div class="chips lawchips">');
    if (i < 0) return '';
    const j = h.indexOf('</div>', i);
    return h.slice(i, j);
  }
  const CHIP_OPEN = '<div class="chips lawchips">';

  /* ══ A 相 · 默认标签（功法段）══ */
  const a = renderAs('fa');
  ok('A0 功法段渲染零异常（chip 行 + 概览条 + 段标 + artsBody 跑通）', !a.err, a.msg);
  const h = a.h;
  ok('A1 写入目标是 #tab-arts（合并页唯一容器）', h.length > 0, 'len=' + h.length);
  ok('A2 `#tab-gear` 不再被写入（容器已删）', written['tab-gear'] == null, Object.keys(written).join(','));
  const a1 = renderAs(null);
  ok('A3 `ui.lawChip` 缺省时兜底功法段（旧状态形状不炸、不空页）',
    !a1.err && a1.h.indexOf('id="lawsec-fa"') >= 0, a1.msg + ' len=' + a1.h.length);
  const chipHtml = chipRow(h);
  ok('A4 顶部 chip 恰二枚（功法 / 法器），标签取真词表值',
    (chipHtml.match(/data-act="lawChip"/g) || []).length === 2 &&
    chipHtml.indexOf(SQ.t('skill.system', null, 'xiuxian')) >= 0 &&
    chipHtml.indexOf(SQ.t('gear.system', null, 'xiuxian')) >= 0,
    (chipHtml.match(/data-v="(\w+)"/g) || []).join(','));
  ok('A4b chip 锚点值合法（fa / qi，与段标锚点同域）',
    (chipHtml.match(/data-v="(\w+)"/g) || []).map((s) => s.split('"')[1]).join(',') === 'fa,qi',
    (chipHtml.match(/data-v="(\w+)"/g) || []).map((s) => s.split('"')[1]).join(','));
  /* A4c/A4d = 吸顶碰撞的两面：标签行必须挂专名类 `.lawchips`（规则的挂点），
   * 且功法段内**必须真的还有**第二排裸 `.chips`（碰撞真实存在 ⇒ 这两条一起才说明 `.lawchips` 是承重墙，
   * 单验 A4c 在「段结构变了、第二排消失」时会假绿）。CSS 计算值本身归真机走查 N3/N4，这里只能验结构。 */
  ok('A4c 顶部标签行挂专名类 `lawchips`，且它是页内第一个块（吸顶挂点到位）',
    h.indexOf(CHIP_OPEN) === 0, 'head=' + h.slice(0, 34));
  ok('A4d 功法段内确有第二排裸 `.chips`（融合坛父母选择器同为本页直接子代 ⇒ 类名碰撞真实存在）',
    (h.match(/<div class="chips">/g) || []).length >= 1,
    '裸=' + (h.match(/<div class="chips">/g) || []).length + ' lawchips=' + (h.match(/class="chips lawchips"/g) || []).length);
  ok('A5 选中态只挂在当前 chip（恰一枚 `.on`，且为功法）',
    (chipHtml.match(/class="on"/g) || []).length === 1 &&
    /class="on"[^>]*data-v="fa"/.test(chipHtml), (chipHtml.match(/class="[^"]*"/g) || []).join('|'));
  ok('A6 chip 行在概览条之前（页顶标签 → 跨轴摘要 → 段）',
    h.indexOf(CHIP_OPEN) >= 0 && h.indexOf(CHIP_OPEN) < h.indexOf('<div class="laware">'),
    'chip@' + h.indexOf(CHIP_OPEN) + ' laware@' + h.indexOf('<div class="laware">'));
  ok('A7 功法段四个标志元素全部在位', missing(h, FA_MARKS).length === 0, missing(h, FA_MARKS).join(',') || 'all found');
  ok('A8 **法器段三个标志元素全部缺席**（互斥：一次只渲染一段）',
    has(h, QI_MARKS).length === 0, '多渲染了: ' + (has(h, QI_MARKS).join(',') || '无'));
  ok('A9 概览条在位且段标紧随其后（法段段标是页内第一个 `.secdiv`）',
    h.indexOf('<div class="laware">') >= 0 && h.indexOf('<div class="laware">') < h.indexOf('id="lawsec-fa"'),
    'laware@' + h.indexOf('<div class="laware">'));

  /* ══ B 相 · 切到法器标签 ══ */
  const b = renderAs('qi');
  ok('B0 法器段渲染零异常（chip 行 + 概览条 + 段标 + gearBody 跑通）', !b.err, b.msg);
  const h2 = b.h;
  ok('B1 法器段三个标志元素全部在位', missing(h2, QI_MARKS).length === 0, missing(h2, QI_MARKS).join(',') || 'all found');
  ok('B2 **功法段四个标志元素全部缺席**（互斥对称面）',
    has(h2, FA_MARKS).length === 0, '多渲染了: ' + (has(h2, FA_MARKS).join(',') || '无'));
  ok('B3 chip 选中态跟着 chip 走（恰一枚 `.on`，且为法器）',
    (chipRow(h2).match(/class="on"/g) || []).length === 1 &&
    /class="on"[^>]*data-v="qi"/.test(chipRow(h2)), (chipRow(h2).match(/class="[^"]*"/g) || []).join('|'));
  ok('B4 概览条两段之间恒在（跨轴摘要不随标签消失）',
    h2.indexOf('<div class="laware">') >= 0 && h2.indexOf(CHIP_OPEN) < h2.indexOf('<div class="laware">'),
    'chip@' + h2.indexOf(CHIP_OPEN) + ' laware@' + h2.indexOf('<div class="laware">'));

  /* ══ 概览条三格（与 chip 无关，两段各验一次结构、取功法段读真值）══ */
  const cells = h.slice(h.indexOf('<div class="laware">')).split('</button>');
  const three = cells.slice(0, 3);
  ok('C1 概览条恰三格（主修 / 佩器 / 战力）', (h.match(/data-act="lawJump"/g) || []).length === 3,
    'lawJump n=' + (h.match(/data-act="lawJump"/g) || []).length);
  ok('C2 三格锚跳目标合法（fa / qi / fa）',
    three.map((c) => (c.match(/data-v="(\w+)"/) || [])[1]).join(',') === 'fa,qi,fa',
    three.map((c) => (c.match(/data-v="(\w+)"/) || [])[1]).join(','));
  const vals = three.map((c) => ((c.match(/<span class="v[^"]*">([\s\S]*?)<\/span>/) || [])[1] || '').trim());
  ok('C3 三格值均非空', vals.every((v) => v.length > 0), JSON.stringify(vals));
  ok('C4 主修格 = 功法名 + Lv（真值，非空态）', /Lv4/.test(vals[0]), vals[0]);
  ok('C5 佩器格 = n/total + 总抗（真值）', /^2\/\d+ · 抗 /.test(vals[1]), vals[1]);
  ok('C6 战力格为数字（Mods.powerOf 真算）', /^[\d.,万亿]+$/.test(vals[2]), vals[2]);

  /* ══ 段标：每段恰一枚、字与副标各归各 ══ */
  const ziOf = (s) => (s.match(/<span class="zi">([^<]*)<\/span>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
  const subOf = (s) => (s.match(/<span class="sub">([^<]*)<\/span>/g) || []).map((x) => x.replace(/<[^>]+>/g, ''));
  ok('D1 法段段标恰一枚且为「法」', ziOf(h).length === 1 && ziOf(h)[0] === SQ.t('arts.seg.fa', null, 'xiuxian'), ziOf(h).join('/'));
  ok('D2 器段段标恰一枚且为「器」', ziOf(h2).length === 1 && ziOf(h2)[0] === SQ.t('arts.seg.qi', null, 'xiuxian'), ziOf(h2).join('/'));
  ok('D3 两段副标各恰一枚且非空',
    subOf(h).length === 1 && subOf(h2).length === 1 && subOf(h).concat(subOf(h2)).every((s) => s.trim().length > 0),
    subOf(h).join('/') + ' | ' + subOf(h2).join('/'));

  /* ══ 漏值扫描：拼接类 bug 最常见的四种残留（两段各自扫）══ */
  const both = [['功法段', h], ['法器段', h2]];
  ok('E1 零 undefined 漏进 HTML（两段）',
    both.every(([, s]) => s.indexOf('undefined') < 0),
    both.filter(([, s]) => s.indexOf('undefined') >= 0).map(([n]) => n + ':' + s.slice(Math.max(0, s.indexOf('undefined') - 60), s.indexOf('undefined') + 30)).join(' | ') || 'clean');
  ok('E2 零 NaN 漏进 HTML（两段）', both.every(([, s]) => s.indexOf('NaN') < 0),
    both.filter(([, s]) => s.indexOf('NaN') >= 0).map(([n]) => n).join(',') || 'clean');
  ok('E3 零未替换占位符 `{`（词表 key 占位名写错会原样漏出）', both.every(([, s]) => s.indexOf('{') < 0),
    both.filter(([, s]) => s.indexOf('{') >= 0).map(([n]) => n + ':' + s.slice(Math.max(0, s.indexOf('{') - 60), s.indexOf('{') + 40)).join(' | ') || 'clean');
  ok('E4 零词表 key 回落（缺 key 时 t() 返回 key 本身，会看到 `arts.ov.` 之类）',
    both.every(([, s]) => s.indexOf('arts.ov.') < 0 && s.indexOf('arts.seg.') < 0 && s.indexOf('skill.system') < 0 && s.indexOf('gear.system') < 0),
    ['arts.ov.', 'arts.seg.', 'skill.system', 'gear.system'].flatMap((k) => both.filter(([, s]) => s.indexOf(k) >= 0).map(([n]) => n + '@' + k)).join(',') || 'clean');

  /* ══ 主修空态分支（无功法入槽时概览条不得崩、不得漏 undefined）══ */
  const w2 = pack.initialState();
  w2.artsSlots = []; w2.artsKnown = [];
  ctx.ws = () => w2;
  const e2 = renderAs('fa');
  ok('F1 主修空态零异常（虚位以待分支）', !e2.err, e2.msg);
  ok('F2 主修空态显示「虚位以待」', e2.h.indexOf(SQ.t('arts.ov.main.none', null, 'xiuxian')) >= 0,
    'expect=' + SQ.t('arts.ov.main.none', null, 'xiuxian'));
  ok('F3 主修空态零 undefined / NaN', e2.h.indexOf('undefined') < 0 && e2.h.indexOf('NaN') < 0, 'clean');
  ok('F4 主修空态格挂 .none 弱化样式', e2.h.indexOf('class="v none"') >= 0, 'has=' + (e2.h.indexOf('class="v none"') >= 0));

  report();

  function report() {
    let fail = 0;
    R.forEach((r) => {
      if (!r.ok) fail++;
      console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
    });
    console.log(fail === 0 ? 'LAWMERGE_ALL_GREEN ' + R.length + '/' + R.length : 'LAWMERGE_FAILED ' + fail);
    process.exit(fail === 0 ? 0 : 1);
  }
})().catch((e) => { console.error('PROBE_ERROR', e && e.message); console.error(e && e.stack); process.exit(2); });
