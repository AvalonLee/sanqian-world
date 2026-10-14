/* .tests/probe-bondact.cjs — 道友页「往来」段渲染探针（无浏览器依赖）
 *
 * 为什么需要它：好感三渠道批在 view/index.html 新增了 **九个纯拼接渲染器/助手**
 * （maxBondTier / visitGainOf / visitBtn / giftablePills / pillGiftGain / giftLeft /
 *  bondActSection / renderBondUnknown / bondFailText）。verify-ui-* 走真浏览器
 * （playwright-core + Edge），本环境跑不了；冒烟只加载 assets/**、不碰 view；审计只查
 * 元素 id 存在性——三者都照不出「某个依赖取不到就整段白屏」。故照 probe-lawmerge 立例，
 * 把这几个函数**原样抽出**（一字不改）配真实引擎数据真跑一遍拼接。
 * 🔧 勘正（GitHub issue #4 · 2026-10-14）：`giftLeft` 随赠丹日限一并退役，本件抽 **八个**渲染器。
 *
 * 边界（照 lawmerge 同纪律如实登记）：子渲染器 esc / t / $ / ui / ws / pack / D / mods /
 * reducedMotion 为桩，卡片内部结构与 CSS 计算值仍需真浏览器走查（verify-ui-bonds 待有环境实跑）。
 *
 * 用法：node .tests/probe-bondact.cjs    末行 BONDACT_ALL_GREEN n/n 或 BONDACT_FAILED k
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { load } = require('./sandbox.cjs');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'view/index.html'), 'utf8');

/* 按函数名抽源码（大括号配平，避开正则跨函数误吞）——与 probe-lawmerge 同款 */
function extractFn(name) {
  const head = 'function ' + name + '(';
  const i = HTML.indexOf(head);
  if (i < 0) throw new Error('function not found: ' + name);
  let depth = 0, k = HTML.indexOf('{', i);
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
  /* ── 真引擎数据 ── */
  const { sandbox } = load([], { quiet: true });
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const D = pack.data;
  const cs = SQ.Bonds.list(pack);
  const NOW = 1700000000000;

  /* 三态世界：① 已相识（档 1）② 满档 ③ 未识 ④ 厌恶 ⑤ 绝交锁 ⑥ 心结锁 */
  const mkWorld = (ov) => Object.assign(pack.initialState(), ov || {});
  const idKnown = cs[0].id, idMax = cs[1].id, idUnmet = cs[2].id;
  const idHate = cs[3].id, idLock = cs[4].id, idScar = cs[5].id;
  const baseBonds = {};
  baseBonds[idKnown] = 12; baseBonds[idMax] = 100; baseBonds[idHate] = -5;
  baseBonds[idLock] = -99; baseBonds[idScar] = 40;
  /* 心结锁必须同时设 ws.scars（三义：禁护法 / 好感锁死 / 禁再提亲）——只设 bonds 是「正常已相识」态 */
  const baseScars = {}; baseScars[idScar] = NOW;

  const worlds = {
    known: mkWorld({ bonds: Object.assign({}, baseBonds), scars: Object.assign({}, baseScars) }),
    unmet: mkWorld({ bonds: Object.assign({}, baseBonds), scars: Object.assign({}, baseScars) }),
    rich: (function () {
      const w = mkWorld({ bonds: Object.assign({}, baseBonds), scars: Object.assign({}, baseScars) });
      w.alchemy = SQ.Alchemy.normalize({
        pills: { ap_juqi: 3, ap_haina: 1, ap_juqi_rw: 2, ap_pozhang: 5, ap_daohe: 0, juqi: 2 }
      }, D);
      return w;
    })()
  };

  /* ── DOM / 视图桩（与 probe-lawmerge 同纪律：只做最小可用替身）── */
  const written = {};
  function elStub() {
    return {
      innerHTML: '', textContent: '', style: {},
      classList: { add() {}, remove() {}, contains() { return false; } }
    };
  }
  let curWorld = worlds.known;
  const uiStub = { bondsDest: 'modal', bondDetail: null };
  const ctx = {
    SQ,
    /* ⚠️ view 侧 ws()/pack()/D() 都是**函数**（`function ws(){return state.worlds[wid()];}`），
     * 桩必须同签名——lawmerge 探针曾因把 D 当对象传入而撞 `D is not a function`。 */
    ws: () => curWorld,
    pack: () => pack,
    D: () => D,
    wid: () => 'xiuxian',
    state: { profile: { createdAt: NOW }, meta: { karma: 0 } },
    ui: uiStub,
    $: (id) => (written[id] = written[id] || elStub()),
    esc: (x) => String(x == null ? '' : x)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    t: (k, v) => SQ.t(k, v || null, 'xiuxian'),
    Date, Math, JSON, String, Number, Array, Object, RegExp, isFinite, parseInt, parseFloat
  };
  vm.createContext(ctx);

  /* 抽出渲染器，原样编译进桩上下文（giftLeft 已随 issue #4 撤销日限一并退役 ⇒ 八个）*/
  const NAMES = ['maxBondTier', 'visitGainOf', 'visitBtn', 'giftablePills', 'pillGiftGain',
    'bondActSection', 'renderBondUnknown', 'bondFailText'];
  /* 依赖的既有纯函数一并抽出真源码（不打桩）：timeLeftText 被 visitBtn 与 bondFailText 共用。
   * 抽真源码而非打桩，才能顺带断言冷却文案不含 NaN。 */
  const DEPS = ['timeLeftText'];
  const src = NAMES.concat(DEPS).map(extractFn).join('\n');
  vm.runInContext(src + '\nthis.__api = { ' +
    NAMES.concat(DEPS).map(n => n + ': ' + n).join(', ') + ' };', ctx);
  const A = ctx.__api;

  /* 冻结时间：视图里到处是 Date.now()，钉死才能让冷却态可断言 */
  ctx.Date = Object.create(Date);
  ctx.Date.now = () => NOW;

  ok('八个渲染器 + 一个既有依赖全部抽出并编译通过',
    NAMES.concat(DEPS).every(n => typeof A[n] === 'function'), NAMES.concat(DEPS).join(','));

  /* ── 1) 已相识：往来段完整、拜访按钮可点、增量 = 引擎会给的数 ── */
  curWorld = worlds.known;
  let h = '';
  let threw = null;
  try { h = A.bondActSection(idKnown); } catch (e) { threw = e; }
  ok('已相识 · bondActSection 零抛错', !threw, threw ? threw.message : '');
  ok('已相识 · 段标「往来」在场', h.indexOf(SQ.t('bond.detail.act', null, 'xiuxian')) >= 0);
  ok('已相识 · 拜访按钮挂 data-act="bondVisit" 且 data-v = 道友 id',
    /data-act="bondVisit"[^>]*data-v="/.test(h) && h.indexOf('data-v="' + idKnown + '"') >= 0);
  const gKnown = A.visitGainOf(idKnown, SQ.Bonds.tierOf(worlds.known, idKnown, D));
  ok('已相识 · 按钮标出的增量 = visitGainOf 计算值（不虚标）',
    h.indexOf(SQ.t('bond.visit.gain', { n: gKnown.n }, 'xiuxian')) >= 0, '标注 +' + gKnown.n);
  ok('已相识 · 同向角标与 align 判据一致',
    (h.indexOf(SQ.t('bond.visit.align', null, 'xiuxian')) >= 0) === gKnown.align,
    'align=' + gKnown.align + ' 玩家档位=' + pack.worldSystems.tierOf(worlds.known));

  /* ── 2) 赠丹 chips：只列可赠丹（双特例与零库存必须被剔），增量对表 ── */
  ok('已相识但丹匣空 · 出「丹匣是空的」且无赠丹 chip',
    h.indexOf('data-act="bondGift"') < 0 &&
    h.indexOf(SQ.t('bond.gift.empty', null, 'xiuxian')) >= 0);
  const pills = A.giftablePills(worlds.rich, D);
  const pillKeys = pills.map(p => p.key).sort().join(',');
  ok('giftablePills 剔底牌族（ap_pozhang）与零库存（ap_daohe），保留丹纹版与成品丹（第十七批）',
    pillKeys === 'ap_haina,ap_juqi,ap_juqi_rw,juqi', pillKeys);
  ok('pillGiftGain 对表：黄 4 / 天 14 / 黄丹纹 round(4×1.5)=6',
    A.pillGiftGain(D, 'ap_juqi') === 4 && A.pillGiftGain(D, 'ap_haina') === 14 &&
    A.pillGiftGain(D, 'ap_juqi_rw') === 6,
    [A.pillGiftGain(D, 'ap_juqi'), A.pillGiftGain(D, 'ap_haina'), A.pillGiftGain(D, 'ap_juqi_rw')].join('/'));
  /* chips 上标的增量必须 = min(名义, 距满档余量)——绝不显示会被 clamp 吃掉的虚数 */
  curWorld = worlds.rich;
  const hRich = A.bondActSection(idKnown);
  const headRich = Math.max(0, (D.BOND_MAX || 100) - Math.max(0, SQ.Bonds.affinityOf(worlds.rich, idKnown)));
  const expJuqi = Math.min(A.pillGiftGain(D, 'ap_juqi'), headRich);
  ok('赠丹 chips 增量 = min(名义, 距满档余量)',
    hRich.indexOf('<span class="gv">+' + expJuqi + '</span>') >= 0,
    '余量=' + headRich + ' 期望标注 +' + expJuqi);
  ok('有丹 · 赠丹段列出可赠丹 chip', hRich.indexOf('data-act="bondGift"') >= 0);
  ok('赠丹 chips 带 data-c = 丹药 key（双载荷约定，与 exchangeShard 同例）',
    hRich.indexOf('data-c="ap_juqi"') >= 0 && hRich.indexOf('data-c="ap_juqi_rw"') >= 0);
  /* M1 锚（当晚复核）：成品丹的 tier 自带在 D.PILLS 上，视图若另摆一份只查 RECIPES 的名单就给它 0 增量
   * ⇒ chip 整颗消失（引擎给、屏上不给）。这里钉「chip 真在屏上」，下一处钉「屏上标注 === 引擎实发」。 */
  ok('成品丹也上屏：pillGiftGain(juqi)=4 且赠丹 chip 列出 data-c="juqi"',
    A.pillGiftGain(D, 'juqi') === 4 && hRich.indexOf('data-c="juqi"') >= 0,
    'gain=' + A.pillGiftGain(D, 'juqi'));
  ok('赠丹 chips 显示库存数', hRich.indexOf(SQ.t('bond.gift.stock', { n: 3 }, 'xiuxian')) >= 0);

  /* ── 3) 满档：拜访与赠丹双双让位给说明文案，不留可点按钮 ── */
  curWorld = worlds.known;
  const hMax = A.bondActSection(idMax);
  ok('满档 · 无 bondVisit 按钮', hMax.indexOf('data-act="bondVisit"') < 0);
  ok('满档 · 无 bondGift 按钮', hMax.indexOf('data-act="bondGift"') < 0);
  ok('满档 · 出「无须再客套」与「无须再赠」两句',
    hMax.indexOf(SQ.t('bond.visit.fail.max', null, 'xiuxian')) >= 0 &&
    hMax.indexOf(SQ.t('bond.gift.fail.max', null, 'xiuxian')) >= 0);

  /* ── 4) 冷却态：按钮 disabled 且不挂 data-act（点不动 = 不会白发一次事务）── */
  const wCd = mkWorld({ bonds: Object.assign({}, baseBonds) });
  wCd.bondVisitAt = NOW - 1000;
  curWorld = wCd;
  const hCd = A.bondActSection(idKnown);
  ok('冷却中 · 拜访按钮 disabled 且无 data-act',
    /class="actbtn"[^>]*disabled/.test(hCd) && hCd.indexOf('data-act="bondVisit"') < 0);
  ok('冷却中 · 显示剩余时差文案（非 NaN）',
    hCd.indexOf(SQ.t('bond.visit.cd', { t: '…' }, 'xiuxian').replace('…', '')) >= 0 &&
    hCd.indexOf('NaN') < 0);

  /* ── 5) 绝交锁 / 心结锁：出拒绝文案，不出按钮 ── */
  curWorld = worlds.known;
  curWorld = worlds.rich;
  const hLock = A.bondActSection(idLock);
  ok('绝交锁 · 出「恩断义绝」文案且无拜访按钮',
    hLock.indexOf(SQ.t('bond.fail.lock', null, 'xiuxian')) >= 0 && hLock.indexOf('data-act="bondVisit"') < 0);
  const hScar = A.bondActSection(idScar);
  /* 防空过护栏：先证明引擎侧确实认作心结锁，否则下面两条视图断言是空过 */
  ok('心结锁 · 世界态护栏（引擎侧 scarred 为真、且好感 40 仍在）',
    SQ.Bonds.scarred(worlds.known, idScar) === true && SQ.Bonds.affinityOf(worlds.known, idScar) === 40 &&
    worlds.rich.alchemy.pills.ap_juqi === 3,
    'scarred=' + SQ.Bonds.scarred(worlds.known, idScar) + ' aff=' + SQ.Bonds.affinityOf(worlds.known, idScar));
  ok('心结锁 · 出「心结未解」文案且无拜访按钮',
    hScar.indexOf(SQ.t('bond.fail.scar', null, 'xiuxian')) >= 0 && hScar.indexOf('data-act="bondVisit"') < 0);
  curWorld = worlds.rich;   /* 切到有丹世界：只有这里才能证「有丹也不给赠」，无丹世界的收口是空过 */
  const hScarRich = A.bondActSection(idScar);
  ok('心结锁 · **有丹**也不留赠丹 chip（收口非因丹匣空）',
    hScarRich.indexOf('data-act="bondGift"') < 0 &&
    hScarRich.indexOf(SQ.t('bond.gift.empty', null, 'xiuxian')) < 0);
  curWorld = worlds.known;

  /* ── 6) 未识隐匿详情：身份零泄漏 + 只给拜访一条出路 ── */
  written['mbd-body'] = elStub();
  uiStub.bondsDest = 'modal';
  curWorld = worlds.unmet;
  let threwU = null;
  try { A.renderBondUnknown(idUnmet, 0); } catch (e) { threwU = e; }
  const hu = written['mbd-body'].innerHTML;
  ok('未识 · renderBondUnknown 零抛错', !threwU, threwU ? threwU.message : '');
  ok('未识 · 写入浮层容器 #mbd-body', hu.length > 0);
  ok('未识 · 头像为「？」、名为「身份未明」',
    hu.indexOf(SQ.t('ui.qmark', null, 'xiuxian')) >= 0 &&
    hu.indexOf(SQ.t('event.codex.unknown', null, 'xiuxian')) >= 0);
  ok('未识 · 身份零泄漏（真名 / 小传 / 助力 / 阵营 均不出现）',
    hu.indexOf(SQ.t('bond.' + idUnmet + '.name', null, 'xiuxian')) < 0 &&
    hu.indexOf(SQ.t('bond.' + idUnmet + '.flavor', null, 'xiuxian')) < 0 &&
    hu.indexOf(SQ.t('bond.' + idUnmet + '.perk', null, 'xiuxian')) < 0 &&
    hu.indexOf(SQ.t('bond.visit.align', null, 'xiuxian')) < 0);
  ok('未识 · 挂「可借此结识」角标 + 拜访按钮',
    hu.indexOf(SQ.t('bond.visit.met', null, 'xiuxian')) >= 0 && hu.indexOf('data-act="bondVisit"') >= 0);
  ok('未识 · 增量恒为 +3（无同向加成 = 不泄漏 align）',
    hu.indexOf(SQ.t('bond.visit.gain', { n: 3 }, 'xiuxian')) >= 0);
  ok('未识 · 不给赠丹段（隐匿态只留一条主动口）', hu.indexOf('data-act="bondGift"') < 0);
  /* 厌恶态：显示负值而非「未结缘」 */
  written['mbd-body'] = elStub();
  A.renderBondUnknown(idHate, -5);
  const hh = written['mbd-body'].innerHTML;
  ok('厌恶态 · 副行显示「厌恶 −5」而非「未结缘」',
    hh.indexOf(SQ.t('bond.negative', null, 'xiuxian') + ' -5') >= 0 &&
    hh.indexOf(SQ.t('bond.unmet', null, 'xiuxian')) < 0);
  /* tab 容器分支 */
  written['tab-bonds'] = elStub();
  uiStub.bondsDest = 'tab';
  A.renderBondUnknown(idUnmet, 0);
  ok('未识 · bondsDest=tab 时写入 #tab-bonds（而非浮层）', written['tab-bonds'].innerHTML.length > 0);
  uiStub.bondsDest = 'modal';

  /* ── 7) 拒绝原因 → 文案：三组前缀依次探键，未知原因回落 ── */
  const mapOk =
    A.bondFailText({ reason: 'cooldown', waitMs: 60000 }) ===
      SQ.t('bond.visit.fail.cooldown', { t: A.timeLeftText(60000) }, 'xiuxian') &&
    A.bondFailText({ reason: 'max' }) === SQ.t('bond.visit.fail.max', null, 'xiuxian') &&
    A.bondFailText({ reason: 'once' }) === SQ.t('bond.gift.fail.once', null, 'xiuxian') &&
    A.bondFailText({ reason: 'lock' }) === SQ.t('bond.fail.lock', null, 'xiuxian') &&
    A.bondFailText({ reason: 'scar' }) === SQ.t('bond.fail.scar', null, 'xiuxian') &&
    A.bondFailText({ reason: 'stock' }) === SQ.t('bond.gift.fail.stock', null, 'xiuxian');
  ok('bondFailText · 六类原因全部命中对应文案（visit / gift / 共用三组前缀）', mapOk);
  const fb = A.bondFailText({ reason: 'zzz_nosuch_reason' });
  const fbNull = A.bondFailText(null);
  ok('bondFailText · 未知原因与 null 均回落「查无此人」，绝不把键名抛给用户',
    fb === SQ.t('bond.fail.unknown', null, 'xiuxian') && fbNull === fb && fb.indexOf('zzz') < 0, fb);

  /* ── 8) GitHub issue #4：赠丹**无日限**——有丹即全可点，屏上不再出现「今日 n/cap」计数 ── */
  curWorld = worlds.rich;
  const hNoCap = A.bondActSection(idKnown);
  const chipN = (hNoCap.match(/data-act="bondGift"/g) || []).length;
  ok('issue #4 · 赠丹 chips 一颗都不置灰，且赠丹段无「今日 n/cap」计数文案（head 走无参键）',
    chipN === 4 && /<button[^>]*data-act="bondGift"[^>]*disabled/.test(hNoCap) === false &&
    /今日\s*\d+\s*\/\s*\d+/.test(hNoCap) === false &&
    hNoCap.indexOf(SQ.t('bond.gift.head', null, 'xiuxian')) >= 0, 'chips=' + chipN);

  /* ── 9) 四类「漏值」扫描（lawmerge 同款）── */
  const all = [h, hRich, hMax, hCd, hLock, hScar, hu, hh].join('\n');
  ok('零 undefined 漏进 HTML', all.indexOf('undefined') < 0);
  ok('零 NaN 漏进 HTML', all.indexOf('NaN') < 0);
  ok('零未替换占位符 `{`', all.indexOf('{') < 0);
  const leakedKeys = ['bond.', 'alchemy.', 'ui.', 'sys.'].filter(p =>
    new RegExp('>' + p.replace('.', '\\.') + '[a-zA-Z.]+<').test(all));
  ok('零词表键名回落（缺键时 SQ.t 原样回传键名，会直接显示给用户）',
    leakedKeys.length === 0, leakedKeys.join(','));

  /* ── 10) 视图标注增量 与 引擎实发增量 逐档对齐（防「标 +4 实给 +3」）── */
  const mis = [];
  [0, 5, 40, 80].forEach((aff, i) => {
    const c = cs[30 + i];
    const w = mkWorld({ bonds: {} });
    if (aff > 0) w.bonds[c.id] = aff;
    const tier = SQ.Bonds.tierOf(w, c.id, D);
    const viewN = A.visitGainOf(c.id, tier).n;
    const r = SQ.Bonds.visit(w, pack, D, c.id, NOW, () => {});
    if (!r.ok || r.gain !== viewN) mis.push('aff' + aff + ':view' + viewN + '/eng' + (r.ok ? r.gain : r.reason));
  });
  ok('拜访：视图标注增量 === 引擎实发增量（四档逐一对齐）', mis.length === 0, mis.join(','));
  const misG = [];
  Object.keys(D.BOND_GIFT_BY_TIER).forEach(tierName => {
    let pill = null;
    (D.ALCHEMY.RECIPES || []).forEach(r => {
      const def = (D.ALCHEMY.APILLS || {})[r.pill];
      if (r.tier === tierName && def && !def.once && !pill) pill = r.pill;
    });
    if (!pill) { misG.push(tierName + ':无可用丹'); return; }
    const w = mkWorld({ bonds: {} });
    w.bonds[cs[40].id] = 5;
    w.alchemy = SQ.Alchemy.normalize({ pills: {} }, D);
    w.alchemy.pills[pill] = 1;
    const viewN = Math.min(A.pillGiftGain(D, pill), (D.BOND_MAX || 100) - 5);
    const r = SQ.Bonds.giftPill(w, pack, D, cs[40].id, pill, NOW, () => {});
    if (!r.ok || r.gain !== viewN) misG.push(tierName + ':view' + viewN + '/eng' + (r.ok ? r.gain : r.reason));
  });
  ok('赠丹：视图标注增量 === 引擎实发增量（四阶逐一对齐）', misG.length === 0, misG.join(','));

  /* M1 锚第二半：成品丹（D.PILLS 族）同判——屏上标注必须等于引擎实发，两族一条判据 */
  const misT = [];
  (D.PILLS || []).forEach(function (tp) {
    if (!tp || tp.nogift) return;
    const w = mkWorld({ bonds: {} });
    w.bonds[cs[40].id] = 5;
    w.alchemy = SQ.Alchemy.normalize({ pills: {} }, D);
    w.alchemy.pills[tp.id] = 1;
    const viewN = Math.min(A.pillGiftGain(D, tp.id), (D.BOND_MAX || 100) - 5);
    const r = SQ.Bonds.giftPill(w, pack, D, cs[40].id, tp.id, NOW, () => {});
    if (!r.ok || r.gain !== viewN) misT.push(tp.id + ':view' + viewN + '/eng' + (r.ok ? r.gain : r.reason));
  });
  ok('赠丹：成品丹族屏上标注 === 引擎实发（nogift 者除外，非空集）',
    misT.length === 0 && (D.PILLS || []).filter(p => p && !p.nogift).length > 0, misT.join(','));

  /* ── 输出 ── */
  let fails = 0;
  for (const r of R) {
    if (!r.ok) fails++;
    console.log((r.ok ? 'PASS' : 'FAIL') + ' ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  }
  console.log(fails === 0
    ? 'BONDACT_ALL_GREEN ' + R.length + '/' + R.length
    : 'BONDACT_FAILED ' + fails);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.log('PROBE_ERR', e && e.stack || e); process.exit(1); });
