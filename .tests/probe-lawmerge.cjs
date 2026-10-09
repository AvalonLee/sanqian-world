/* .tests/probe-lawmerge.cjs — 法与器合并页渲染探针（无浏览器依赖）
 *
 * 为什么需要它：verify-ui-arts.cjs 走真浏览器（playwright-core + Edge），本环境跑不了；
 * 而合并页的四段渲染器（lawareBar / secDiv / artsBody / gearBody）是**本批新写的代码**，
 * 纯字符串拼接，一旦某个依赖取不到（`SQ.Arts.mainArt` / `d.GEAR_SLOTS` / `w.gear`）
 * 就是整页白屏——冒烟只加载 assets/**、不碰 view，照不出来。
 *
 * 做法：从 view/index.html 抽出这四个函数 + renderArts 的源码，在 vm 里配上
 * **真实引擎数据**（sandbox 装载 assets/**）与最小 DOM/工具桩，真跑一遍拼接，
 * 断言五段齐全、纵向有序、概览条三格值非空、零 `undefined`/`NaN`/`{` 漏进 HTML。
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
  w.artsLevels[artIds[1]] = 0;                 /* 触发「待重修」金标分支 */
  const slots = D.GEAR_SLOTS || [];
  slots.forEach((s, i) => {
    if (i < 2) w.gear[s] = { id: 'probe_gear_' + i, slot: s, tier: 2, atk: 10 + i, resist: 5 + i, score: 30 };
  });
  w.stash = [{ id: 'probe_stash_0', slot: slots[0], tier: 1, atk: 3, resist: 1, score: 8 }];

  const profile = { name: '探针', worldId: 'xiuxian', talents: [], alignBias: 'neutral' };

  /* ── 最小 DOM / 工具桩：只给这四个函数真会用到的东西 ── */
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
    ui: { slotPickFor: null, artsGroup: 'tier', artsGroupVal: null },
    $: (id) => { if (!written[id]) written[id] = elStub(); return written[id]; },
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    t: (k, v) => SQ.t(k, v || null, 'xiuxian'),
    pct: (n) => (Math.round(n * 1000) / 10).toString().replace(/\.0$/, '') + '%',
    /* 段内子渲染器：本探针只验**拼接与五段结构**，卡片内部由各 verify-ui-* 真机走查覆盖 */
    artCard: (id) => '<div class="tcard artcard" data-art="' + id + '"></div>',
    artSilhouette: (id) => '<div class="sil" data-art="' + id + '"></div>',
    artCodexCard: (id) => '<div class="tcard codexcard" data-art="' + id + '"></div>',
    gearCard: (g, _w, label, i) => '<div class="tcard gearcard" data-i="' + (i == null ? '' : i) + '"></div>',
    renderFuseAltar: () => '<div class="fusealtar"></div>',
    treasureCard: () => '',
    Date, Math, JSON, console
  };
  ctx.window = ctx;
  vm.createContext(ctx);

  /* ── 装载四个函数 + renderArts（真实源码，不改一字）── */
  const src = ['lawareBar', 'secDiv', 'artsBody', 'gearBody', 'renderArts'].map(extractFn).join('\n\n');
  vm.runInContext(src + '\n;this.__render = renderArts;', ctx);

  let threw = null;
  try { ctx.__render(); } catch (e) { threw = e; }
  ok('渲染零异常（四个新/改函数在真实引擎数据下跑通）', !threw, threw ? (threw.message + ' @ ' + (threw.stack || '').split('\n')[1]) : 'clean');
  if (threw) { report(); return; }

  const h = (written['tab-arts'] || {}).innerHTML || '';
  ok('写入目标是 #tab-arts（合并页唯一容器）', h.length > 0, 'len=' + h.length);
  ok('#tab-gear 不再被写入（容器已删）', written['tab-gear'] == null, Object.keys(written).join(','));

  /* ── 五段齐全 + 纵向有序（用出现位置排序，等价于真机 getBoundingClientRect 顺序）── */
  const marks = [
    ['① 概览条 .laware', '<div class="laware">'],
    ['② 法·段标 #lawsec-fa', 'id="lawsec-fa"'],
    ['③ 功法段（修习槽）', 'data-mainart="1"'],
    ['③ 功法段（自悟节）', 'class="tcard selflearn"'],
    ['③ 功法段（融合坛）', 'class="fusealtar"'],
    ['④ 器·段标 #lawsec-qi', 'id="lawsec-qi"'],
    ['⑤ 法器段（百器录横幅）', 'data-act="openGearCodex"'],
    ['⑤ 法器段（器卡网格）', 'cards geargrid']
  ];
  const pos = marks.map(([n, s]) => [n, h.indexOf(s)]);
  ok('五段八个标志元素全部在位', pos.every(([, p]) => p >= 0),
    pos.filter(([, p]) => p < 0).map(([n]) => n).join(',') || 'all found');
  ok('纵向顺序正确（概览条 → 法段标 → 功法内容 → 器段标 → 法器内容）',
    pos.every(([, p], i) => i === 0 || p < 0 || pos[i - 1][1] < 0 || p > pos[i - 1][1]),
    pos.map(([n, p]) => n.slice(0, 2) + '@' + p).join(' '));

  /* ── 概览条三格 ── */
  const cells = h.slice(h.indexOf('<div class="laware">')).split('</button>');
  const three = cells.slice(0, 3);
  ok('概览条恰三格（主修 / 佩器 / 战力）', (h.match(/data-act="lawJump"/g) || []).length === 3,
    'lawJump n=' + (h.match(/data-act="lawJump"/g) || []).length);
  ok('三格锚跳目标合法（fa / qi / fa）',
    three.map((c) => (c.match(/data-v="(\w+)"/) || [])[1]).join(',') === 'fa,qi,fa',
    three.map((c) => (c.match(/data-v="(\w+)"/) || [])[1]).join(','));
  const vals = three.map((c) => ((c.match(/<span class="v[^"]*">([\s\S]*?)<\/span>/) || [])[1] || '').trim());
  ok('三格值均非空', vals.every((v) => v.length > 0), JSON.stringify(vals));
  ok('主修格 = 功法名 + Lv（真值，非空态）', /Lv4/.test(vals[0]), vals[0]);
  ok('佩器格 = n/total + 总抗（真值）', /^2\/\d+ · 抗 /.test(vals[1]), vals[1]);
  ok('战力格为数字（Mods.powerOf 真算）', /^[\d.,万亿]+$/.test(vals[2]), vals[2]);

  /* ── 段标 ── */
  const zi = (h.match(/<span class="zi">([^<]*)<\/span>/g) || []).map((s) => s.replace(/<[^>]+>/g, ''));
  ok('段标两字「法」「器」', zi.join('') === '法器', zi.join('/'));
  const subs = (h.match(/<span class="sub">([^<]*)<\/span>/g) || []).map((s) => s.replace(/<[^>]+>/g, ''));
  ok('段标两句副标非空', subs.length === 2 && subs.every((s) => s.trim().length > 0), subs.join(' / '));

  /* ── 漏值扫描：拼接类 bug 最常见的三种残留 ── */
  ok('零 undefined 漏进 HTML', h.indexOf('undefined') < 0,
    h.indexOf('undefined') >= 0 ? h.slice(Math.max(0, h.indexOf('undefined') - 60), h.indexOf('undefined') + 30) : 'clean');
  ok('零 NaN 漏进 HTML', h.indexOf('NaN') < 0,
    h.indexOf('NaN') >= 0 ? h.slice(Math.max(0, h.indexOf('NaN') - 60), h.indexOf('NaN') + 20) : 'clean');
  ok('零未替换占位符 `{`（词表 key 占位名写错会原样漏出）', h.indexOf('{') < 0,
    h.indexOf('{') >= 0 ? h.slice(Math.max(0, h.indexOf('{') - 60), h.indexOf('{') + 40) : 'clean');
  ok('零词表 key 回落（缺 key 时 t() 返回 key 本身，会看到 `arts.ov.` 之类）',
    h.indexOf('arts.ov.') < 0 && h.indexOf('arts.seg.') < 0 && h.indexOf('gear.sec.') < 0,
    ['arts.ov.', 'arts.seg.', 'gear.sec.'].filter((k) => h.indexOf(k) >= 0).join(',') || 'clean');

  /* ── 主修空态分支（无功法入槽时概览条不得崩、不得漏 undefined）── */
  const w2 = pack.initialState();
  w2.artsSlots = []; w2.artsKnown = [];
  ctx.ws = () => w2;
  let threw2 = null, h2 = '';
  try { written['tab-arts'].innerHTML = ''; ctx.__render(); h2 = written['tab-arts'].innerHTML; }
  catch (e) { threw2 = e; }
  ok('主修空态零异常（虚位以待分支）', !threw2, threw2 ? threw2.message : 'clean');
  ok('主修空态显示「虚位以待」', h2.indexOf(SQ.t('arts.ov.main.none', null, 'xiuxian')) >= 0,
    'expect=' + SQ.t('arts.ov.main.none', null, 'xiuxian'));
  ok('主修空态零 undefined / NaN', h2.indexOf('undefined') < 0 && h2.indexOf('NaN') < 0, 'clean');
  ok('主修空态格挂 .none 弱化样式', h2.indexOf('class="v none"') >= 0, 'has=' + (h2.indexOf('class="v none"') >= 0));

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
