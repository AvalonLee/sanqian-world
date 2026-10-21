/* .tests/verify-ui-arts.cjs — 「功法」页走查（UI v2 B3 拆页后；百器页见 verify-ui-gear.cjs）
 * B3（2026-10-20）：原「法与器」合并页拆回「功法」「百器」两页，顶部 chip / 概览条 / 段标 /
 *   `lawChip` / `lawJump` 与词表 `arts.system` / `arts.seg.*` / `arts.ov.*` 同批退役。
 *   本文件保留功法页自身的断言：导航 16 项、法段渲染、自悟节、主修点定、增益行、筛选、自创部空签名、
 *   窄屏导航零截断；合并页专属断言（N1–N8 / A1–A3 / A5/A6）随结构退役，不改成假绿。
 * 自悟批：功法段「自行领悟」节——保底进度条（.selflearn .pbar）+ 可领悟候选计数。
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-arts.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态：realm 5（解锁法宝页 lock 3 + 宗门 lock 4 → 12 游戏页全开）
 * + 双功法入槽（自悟面板与概览条「主修」格可读） */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.realm = 5; ws.stones = 5000; ws.qi = 100; ws.total = 100;
  /* A11 三态取样（等级起点批后改档）：Lv1 入门 / Lv3 常规字段 / Lv9 带 effectsFixed 字段
   * ——emotionless 只「学会」不「入槽」，避免动到 A4d 依赖的 setMainArt 按钮计数。
   * 旧的 Lv0 态已不可达（入门即 Lv1），改由 A11f 反向钉「屏上不许出现 Lv0」。 */
  ws.artsKnown = ['tuna', 'juling', 'emotionless']; ws.artsSlots = ['tuna', 'juling'];
  ws.artsLevels = { tuna: 3, juling: 1, emotionless: 9 };
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  /* N52（第册十二批）· 认主按件：两件先天法宝各带自己的进度——x02 未满阶（卡上该出「这件还差约 N 小时」），
   * x04 已满阶（这句该不出现，作反例）。进度写在 owned[].st 上，与引擎的按键形状一致。 */
  ws.treasures.owned.push({ id: 'x02', stage: 1, st: { bondN: 1, bondH: 3 } });
  ws.treasures.owned.push({ id: 'x04', stage: 3, st: { bondN: 2, bondH: 1 } });
  ws.treasures.slots = ['x02', 'x04', null];
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-21-1' },
    meta: { unlockedWorlds: ['xiuxian'] },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = await buildSave();
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };
  /* UI v2 B3 拆页后：功法页不再有合并页的 chip / 概览条 / 段标；本助手只判拆页边界 */
  const lawPageState = () => {
    const p = document.getElementById('tab-arts');
    return {
      lawMark: !!p.querySelector('[data-mainart="1"]') || !!p.querySelector('.artgrid'),
      gearMark: !!p.querySelector('.gear4') || !!p.querySelector('[data-act="openGearCodex"]'),
      merged: !!p.querySelector('.lawchips') || !!p.querySelector('.laware') || !!p.querySelector('.secdiv')
    };
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(700);

  /* ── A0 导航：16 项 + 五区齐全（UI v2 B3 拆页后；game 13 + sys 3）── */
  const nav = await page.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(bar.children);
    const btns = kids.filter((x) => x.tagName === 'BUTTON');
    return {
      total: btns.length,
      secs: kids.filter((x) => x.classList.contains('sq2-navsec')).map((x) => x.textContent.trim()),
      labels: btns.map((x) => x.textContent.trim()),
      hasGearTab: btns.some((x) => x.dataset.v === 'gear'),
      artsLabel: (btns.filter((x) => x.dataset.v === 'arts')[0] || {}).textContent || '',
      gearLabel: (btns.filter((x) => x.dataset.v === 'gear')[0] || {}).textContent || ''
    };
  });
  T(nav.total === 16, 'A0 导航 16 项（B3 拆页后）', 'n=' + nav.total);
  T(nav.secs.join(',') === '修行,历练,道器,江湖,生平', 'A0 五区齐全且顺序固定', nav.secs.join('/'));
  T(nav.hasGearTab, 'A0b 百器为独立导航项（gear 回导航）');
  T(nav.artsLabel.trim() === '功法' && nav.gearLabel.trim() === '百器',
    'A0c 两页导航标签 = 「功法」「百器」（skill.system / gear.system）', nav.artsLabel + '/' + nav.gearLabel);
  T(nav.labels.indexOf('法宝') >= 0, 'A0d 法宝仍独立成页');

  /* ── 进功法页：只渲染法段，合并页残件零残留 ── */
  await page.click('#m-tabbar button[data-v="arts"]');
  await page.waitForTimeout(400);
  const lp = await page.evaluate(lawPageState);
  T(lp.lawMark && !lp.gearMark, 'N1 功法页只渲染法段（百器标志缺席）', JSON.stringify(lp));
  T(!lp.merged, 'N2 合并页残件（lawchips / laware / secdiv）零残留', 'merged=' + lp.merged);

  /* ── A4 功法段：自悟节（原「功法页」断言，归属改称、断言不变）── */
  const arts = await page.evaluate(() => {
    const sec = document.querySelector('#tab-arts .selflearn');
    const bar = sec ? sec.querySelector('.pbar > i') : null;
    const heads = Array.prototype.map.call(document.querySelectorAll('#tab-arts .sechead .t'), (x) => x.textContent);
    return {
      hasSec: !!sec,
      hasBar: !!bar,
      barW: bar ? bar.style.width : '',
      selfHead: heads.some((x) => x.indexOf('领') >= 0 && x.indexOf('悟') >= 0),
      cands: !!document.querySelector('#tab-arts .selflearn .hint')
    };
  });
  T(arts.hasSec && arts.hasBar, 'A4 法段含「自行领悟」节 + 保底进度条', 'w=' + arts.barW);
  T(arts.selfHead, 'A4b 自悟节标题（自行领悟）在位');
  T(arts.cands, 'A4c 自悟节含候选/说明文案');

  /* ── A4e~A4g（B16-g）：功法页上半对齐设计稿 ──
   *   ① 三格摘要的三个值都要与引擎取数口一致（主修 = Arts.mainArt、在修 = 槽长、产出 = 有百分号格式）；
   *   ② 筛选条上移到六槽之前（设计稿把品阶 chips 放页首）；
   *   ③ 自悟节改条状、待修习架改整行 —— 这两处是「卡片墙 → 行/条」在功法页的落点。 */
  const upTop = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian, P = SQ.Worlds.xiuxian.pack, D = P.data;
    const box = document.querySelector('#tab-arts .sum3');
    const cells = box ? Array.prototype.slice.call(box.children) : [];
    const v = (i) => ((cells[i] && cells[i].querySelector('.v') || {}).textContent || '').trim();
    const mainId = SQ.Arts.mainArt(w);
    const grouper = document.querySelector('#tab-arts .grouper');
    const slots = document.querySelector('#tab-arts .slots');
    const self = document.querySelector('#tab-arts .strip.selflearn');
    const grid = document.querySelector('#tab-arts .shelfgrid');
    return {
      n: cells.length, main: v(0), slotsTxt: v(1), prod: v(2),
      wantMain: mainId ? SQ.t('skill.' + mainId + '.name', null, 'xiuxian') : '',
      wantSlots: (w.artsSlots || []).filter((x) => !!x).length + ' / ' + D.ARTS_SLOTS,
      order: !!(grouper && slots && (grouper.compareDocumentPosition(slots) & Node.DOCUMENT_POSITION_FOLLOWING)),
      selfStrip: !!self && !!self.querySelector('.pbar > i'),
      shelfGrid: !!grid, shelfIsCards: !!(grid && grid.classList.contains('cards'))
    };
  });
  T(upTop.n === 3 && upTop.main === upTop.wantMain && upTop.slotsTxt === upTop.wantSlots &&
    /^[+−]\d+(\.\d+)?%$/.test(upTop.prod),
    'A4e 三格摘要（主修 / 在修 / 产出）：主修 = Arts.mainArt、在修 = 已装格数（非数组长度）、产出为带符号百分数',
    '主修=' + upTop.main + ' 在修=' + upTop.slotsTxt + ' 产出=' + upTop.prod);
  T(upTop.order && upTop.selfStrip,
    'A4f 筛选条在六槽之前（页首带）+ 自悟节改条状（.strip.selflearn 内含保底进度条）');

  /* ── A4h/A4i（B16-h）：图鉴默认折叠 + 已学会整行 ──
   * 折叠判据要**双向**：默认零卡，点开真出卡，再点真收起——只判「默认没有」会放过点了没反应的死按钮。
   * 行式判据只认「`.artgrid` 单列 + 每张 `.tcard` 都带 `.artrow`」，`.tcard` 与内层钩子仍归 A11/H2 守。 */
  const fold0 = await page.evaluate(() => ({
    heads: document.querySelectorAll('#tab-arts .codexsec').length,
    open: document.querySelectorAll('#tab-arts .codexsec.open').length,
    cells: document.querySelectorAll('#tab-arts .codexsec.open ~ .cards > .tcard').length,
    rowN: document.querySelectorAll('#tab-arts .artgrid > .tcard').length,
    rowAll: Array.prototype.slice.call(document.querySelectorAll('#tab-arts .artgrid > .tcard'))
      .every((c) => c.classList.contains('artrow')),
    cols: (function () { const g = document.querySelector('#tab-arts .artgrid'); return g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0; })()
  }));
  T(fold0.heads >= 1 && fold0.open === 0 && fold0.cells === 0,
    'A4h 功法图鉴默认折叠（组头在位、零展开、零卡片）', 'heads=' + fold0.heads + ' open=' + fold0.open + ' cells=' + fold0.cells);
  T(fold0.rowN >= 1 && fold0.rowAll && fold0.cols === 1,
    'A4i 已学会改整行（.artgrid 单列 + 每张卡带 .artrow，.tcard 钩子保留）',
    'rows=' + fold0.rowN + ' allArtrow=' + fold0.rowAll + ' cols=' + fold0.cols);
  await page.evaluate(() => document.querySelector('#tab-arts .codexsec').click());
  await page.waitForTimeout(300);
  const fold1 = await page.evaluate(() => ({
    open: document.querySelectorAll('#tab-arts .codexsec.open').length,
    cells: document.querySelectorAll('#tab-arts .codexsec.open ~ .cards > .tcard').length
  }));
  await page.evaluate(() => document.querySelector('#tab-arts .codexsec').click());
  await page.waitForTimeout(250);
  const fold2 = await page.evaluate(() => document.querySelectorAll('#tab-arts .codexsec.open').length);
  T(fold1.open === 1 && fold1.cells > 0 && fold2 === 0,
    'A4h2 点组头展开出卡、再点收回（折叠是活按钮，不是死样式）', '展开后 cells=' + fold1.cells + ' 收起后 open=' + fold2);

  /* ── A4d 主修可点定（GitHub issue #3）：点第 2 格的「设为主修」⇒ 角标与概览条同时换人 ──
   * 旧实现「主修 = 第 1 位」下这颗按钮根本不存在，故本条也是「设为主修」入口的在位判据。 */
  const mainPick = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .cards > .tcard'));
    const btns = document.querySelectorAll('#tab-arts [data-act="setMainArt"]');
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    return {
      btnN: btns.length,
      slotN: (s.worlds[s.profile.worldId].artsSlots || []).length,
      mainIdxBefore: cards.findIndex((c) => !!c.querySelector('.maincorner'))
    };
  });
  if (mainPick.btnN > 0) await page.click('#tab-arts [data-act="setMainArt"]');
  await page.waitForTimeout(500);
  const mainAfter = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .cards > .tcard'));
    const idx = cards.findIndex((c) => !!c.querySelector('.maincorner'));
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId];
    return {
      mainIdx: idx,
      markerIdx: cards.findIndex((c) => c.getAttribute('data-mainart') === '1'),
      mainName: idx >= 0 ? ((cards[idx].querySelector('.tname') || {}).textContent || '').trim() : '',
      artsMain: w.artsMain
    };
  });
  T(mainPick.slotN >= 2 && mainPick.btnN === mainPick.slotN - 1 &&
    mainPick.mainIdxBefore === 0 && mainAfter.mainIdx === 1 &&
    mainAfter.markerIdx === 1 && mainAfter.artsMain === 'juling' &&
    mainAfter.mainName !== '',
    'A4d 主修点定（issue #3）：按钮数 = 在槽数 − 1（主修那格不给）· 点后角标与 data-mainart 同移到第 2 格 · ws.artsMain 落盘',
    'btn=' + mainPick.btnN + '/在槽 ' + mainPick.slotN + ' idx ' + mainPick.mainIdxBefore + '→' + mainAfter.mainIdx +
    ' marker=' + mainAfter.markerIdx + ' 落盘=' + mainAfter.artsMain);

  /* ── A11 卡片增益行 = 引擎实际生效值（等级起点批：入门即 Lv1，Lv9 即满级）──
   * 立因两笔：① 用户报「Lv0 显示得和 Lv1 一样」→ 本批把 Lv0 态取消（入门即 Lv1），
   *   呈现面反过来钉「屏上不许再有 Lv0」；② 取证时另抓出的真缺陷：**effectsFixed** 字段卡面也乘了
   *   lv（太上忘情篇引擎只吃 −8pp，Lv9 曾写 −72%，`mods.js` 用 `lv > 0 ? 1 : 0`）。
   * 判据不写死数字、也不写死文案：整行文本逐字段与**消费端** `SQ.Mods.collect` 的
   * `detail[字段].arts` 对表 ⇒ 改卡面公式或改引擎缩放口径，两侧不同步就红（消费关系判据）。 */
  const gain = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian;
    const pack = SQ.Worlds.xiuxian.pack, D = pack.data, AM = pack.artsMap();
    const wf = (k, o) => SQ.t(k, o || null, 'xiuxian');
    const pctv = (v) => (Math.round(Math.abs(v) * 1000) / 10).toString().replace(/\.0$/, '') + '%';
    const lvOf = (id) => (w.artsLevels || {})[id] || 0;
    /* 单部入槽重算：detail[field].arts 就是「这一部在这一级实际吃进去的值」 */
    const eng = (id, f, lv) => {
      const w2 = JSON.parse(JSON.stringify(w));
      w2.artsSlots = [id]; w2.artsKnown = [id];
      w2.artsLevels = {}; w2.artsLevels[id] = lv;
      const m = SQ.Mods.collect(s.profile, w2, pack, D);
      const v = (m.detail[f] ? m.detail[f].arts : 0) || 0;
      return (v >= 0 ? '+' : '−') + pctv(v);
    };
    const expect = (id, lv) => Object.keys(AM[id].effects)
      .map((f) => wf('talent.field.' + f) + ' ' + eng(id, f, lv)).join(' · ');
    const at = (i) => {
      const c = document.querySelectorAll('#tab-arts .artgrid > .tcard')[i];
      return c ? {
        name: ((c.querySelector('.tname') || {}).textContent || '').trim(),
        hint: ((c.querySelector('.hint') || {}).textContent || '').trim(),
        meta: ((c.querySelector('.meta') || {}).textContent || '').trim(),
        upgradeBtns: c.querySelectorAll('[data-act="upgradeArt"]').length,
        txt: (c.textContent || '')
      } : { name: '', hint: '', meta: '', upgradeBtns: 0, txt: '' };
    };
    /* 顺序 = knownS 排序结果（在槽两格落在前，未入槽的 emotionless 落第 3） */
    const ids = ['tuna', 'juling', 'emotionless'];
    const rows = ids.map((id, i) => {
      const c = at(i);
      return { id, lv: lvOf(id), name: c.name, want: wf('skill.' + id + '.name'), hint: c.hint,
        meta: c.meta, exp: expect(id, lvOf(id)), upgradeBtns: c.upgradeBtns, txt: c.txt };
    });
    const knownLv = (w.artsKnown || []).map((id) => lvOf(id));
    const anyLv0 = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .artgrid > .tcard'))
      .some((c) => ((c.querySelector('.hint') || {}).textContent || '').indexOf('Lv0') >= 0);
    return { rows, knownLv, anyLv0, maxTxt: wf('arts.max') };
  });
  const gBy = {}; gain.rows.forEach((r) => { gBy[r.id] = r; });
  T(gain.rows.length === 3 && gain.rows.every((r) => r.name.indexOf(r.want) >= 0),
    'A11a 已学会卡三态取样在位（tuna Lv3 / juling Lv1 / emotionless Lv9，名称逐格对上）',
    gain.rows.map((r) => r.id + '=' + r.lv).join(' '));
  T(gBy.tuna.lv === 3 && gBy.juling.lv === 1 && gBy.emotionless.lv === 9,
    'A11b 存档等级确实落到页面（前置：先证三态存在，否则下面的对表是空对空）',
    'Lv ' + gBy.tuna.lv + '/' + gBy.juling.lv + '/' + gBy.emotionless.lv + ' hint=' + gBy.juling.hint.slice(0, 12));
  T(gain.rows.every((r) => r.meta === r.exp),
    'A11c 三张卡的增益行逐字段 === 引擎 detail（Lv1/Lv3 常规 ×lv、Lv9 固定字段不乘）',
    gain.rows.filter((r) => r.meta !== r.exp).map((r) => r.id + ': ' + r.meta + ' vs ' + r.exp).join(' ‖ ') || 'all match');
  T(gain.rows.every((r) => r.meta.indexOf('+-') < 0 && r.meta.indexOf('+−') < 0) &&
    gBy.emotionless.meta.indexOf('渡劫失败损失 −8%') >= 0,
    'A11d 符号口径跟随实值（旧模板把 `+` 写死 ⇒ 负字段曾渲染成 `+-8%`；现在负字段就是 `−8%`）',
    gBy.emotionless.meta);
  T(gBy.emotionless.meta.indexOf('−8%') >= 0 && gBy.emotionless.meta.indexOf('−72%') < 0,
    'A11e effectsFixed 不随等级：Lv9 太上忘情篇卡面 = 引擎只吃的 −8pp（旧公式写 −72% ⇒ 本条即缺陷反证）',
    gBy.emotionless.meta);
  T(!gain.anyLv0 && gain.knownLv.length > 0 && gain.knownLv.every((v) => v >= 1),
    'A11f 入门即 Lv1：已入门的每部等级 ≥1 且屏上不再出现「Lv0」（旧 Lv0 态随批消失）',
    'knownLv=' + gain.knownLv.join('/') + ' 屏上有Lv0=' + gain.anyLv0);
  T(gBy.emotionless.upgradeBtns === 0 && gBy.emotionless.txt.indexOf(gain.maxTxt) >= 0 &&
    gBy.tuna.upgradeBtns === 0 && gBy.juling.upgradeBtns === 0,
    'A11g **判据改口**（第卌七批④c）：已学会网格一张都不许有升级钮（未满级的 tuna/juling 也 0 颗），' +
    '满级卡另须仍显「满级」——升级口本批起只留槽卡，缺席面在这一条判、正面由 H 组判',
    'Lv9钮=' + gBy.emotionless.upgradeBtns + ' Lv3钮=' + gBy.tuna.upgradeBtns +
    ' Lv1钮=' + gBy.juling.upgradeBtns + ' 文本含满级=' + (gBy.emotionless.txt.indexOf(gain.maxTxt) >= 0));

  /* ── H 组（第卌七批④c · 用户令「修习槽那六张卡里就该有升级功法的按钮，下方已学会不必再给升级」）：
   * 口径依据 = 引擎 `Arts.tickPractice` 只遍历 `ws.artsSlots` ⇒ 未入槽的功法精通恒 0、永不会顿悟，
   * 升级口因此跟着「会长进的那一侧」走。两侧各判一刀，缺一不可：
   * 只判「槽上有」会放过满级槽卡多留一颗死钮；只判「列表没有」会放过整页一个都不出。
   * ⚠️ fixture 三部（tuna Lv3 / juling Lv1 / emotionless Lv9）**全部在槽**——`Arts.autoSlot`
   *   在载入时按 artsKnown 补空槽（数值详设 §4.4 v1.26），头注那句「emotionless 只学会不入槽」
   *   说的是旧行为。好处是 H1 一次读数就同屏拿到「未满级两张 + 满级一张」；槽外那一侧由 H2 卸下真造。 ── */
  const slotRead = (ids) => page.evaluate((ids) => {
    const wf = (k, o) => SQ.t(k, o || null, 'xiuxian');
    const cells = Array.prototype.slice.call(document.querySelectorAll('#tab-arts [data-slot]'));
    const known = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .artgrid > .tcard'));
    const one = (c) => c.querySelectorAll('[data-act="upgradeArt"]').length;
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian, P = SQ.Worlds.xiuxian.pack;
    return {
      n: cells.length,
      ids: cells.map((c) => ((c.querySelector('.tname') || {}).textContent || '').trim().slice(0, 5)),
      btn: cells.map(one),
      dis: cells.map((c) => { const b = c.querySelector('[data-act="upgradeArt"]'); return b ? !!b.disabled : null; }),
      max: cells.map((c) => (c.textContent || '').indexOf(wf('arts.max')) >= 0),
      knownBtn: known.reduce((a, c) => a + one(c), 0),
      knownN: known.length,
      /* 槽外那一侧**按 id 取卡**（卡内那颗 装入/卸下/弃置 钮的 data-v 就是功法 id）——
       * 不拿名号文本比，词表改字不该让走查跟着红。evaluate 只能回传可序列化值，故此处出数组不出函数。 */
      cards: ids.map((id) => {
        const b0 = known.map((c) => c.querySelector('[data-v="' + id + '"]')).filter(Boolean)[0];
        const c = b0 ? b0.closest('.tcard') : null;
        var bg = c.querySelector('.tierbadge.t1');
        return c ? { up: one(c), slot: !!c.querySelector('[data-act="slotArt"]'),
          unslot: !!c.querySelector('[data-act="unslotArt"]'), salv: !!c.querySelector('[data-act="salvageArt"]'),
          fx: ((c.querySelector('.meta') || {}).textContent || '').trim(),
          bar: !!c.querySelector('.pbar'), badge: !!bg,
          badgeTxt: bg ? bg.textContent.trim() : '' }
          : { up: -1, slot: false, unslot: false, salv: false, fx: '', bar: false, badge: false, badgeTxt: '' };
      }),
      /* 槽卡那一行按 id 带回（槽序会变：autoSlot 补位、卸下再装会挪到尾部 ⇒ 钉序必假红） */
      slotFx: cells.reduce(function (o, c) {
        const b = c.querySelector('[data-v]');
        if (b && b.dataset.v) o[b.dataset.v] = ((c.querySelector('.meta') || {}).textContent || '').trim();
        return o;
      }, {}),
      qi: w.qi,
      costTuna: SQ.Arts.upgradeCost(w, P, P.data, 'tuna', SQ.Mods.collect(s.profile, w, P, P.data)),
      slots: (w.artsSlots || []).slice()
    };
  }, ids);
  const pageSlotTxt = await page.evaluate(() => SQ.t('arts.slotted', null, 'xiuxian'));
  const IDS = ['tuna', 'juling', 'emotionless'];
  const h1 = await slotRead(IDS);
  T(h1.n === 3 && h1.max.filter((x) => x).length === 1 &&
    h1.btn.every((b, i) => b === (h1.max[i] ? 0 : 1)) &&
    h1.knownBtn === 0 && h1.knownN === 3,
    'H1 同一屏两侧：未满级槽卡恰 1 颗升级钮 ‖ Lv9 那张 0 颗且显「满级」 ‖ 已学会三张合计 0 颗（按满级位判、不钉槽序）',
    '槽=' + h1.n + ' 名=' + h1.ids.join('/') + ' 钮=' + h1.btn.join(',') + ' 满级格=' + h1.max.join(',') +
    ' 已学会钮=' + h1.knownBtn + '/' + h1.knownN);
  T(h1.dis[0] === (h1.qi < h1.costTuna),
    'H1b 槽卡升级钮的 disabled === 引擎 `upgradeCost` 与实有修为之比（写死 disabled 或写死不放都是假在跑）',
    'qi=' + Math.round(h1.qi) + ' cost=' + h1.costTuna + ' disabled=' + h1.dis[0]);
  /* H4 属性加成行进槽卡（第卌九批 · 用户令「修习槽中的功法对应的属性加成效果，也要显示出来」）：
   * 判的是**同源**而不是「有字」——槽卡那行必须与同 id 已学会卡逐字相同，而已学会那行由 A11c
   * 已经对表过引擎 `SQ.Mods.collect` 的 detail ⇒ 等值传递到槽卡，公式改动漏改任一侧即红。
   * 按 id 取数不按槽序（autoSlot 补位与「卸下再装会挪到尾部」都会换序）。 */
  const hFx = IDS.map((id, i) => [id, h1.slotFx[id] || '', h1.cards[i].fx || '']);
  T(Object.keys(h1.slotFx).length === 3 && hFx.every((x) => x[1] !== '' && x[1] === x[2]),
    'H4 槽卡有属性加成行 ‖ 与同 id 已学会卡逐字相同（一条式子两处显示，不抄第二份）',
    hFx.map((x) => x[0] + '[' + x[1].slice(0, 24) + ']').join(' ‖ '));
  /* H2 把吐纳法卸下 ⇒ 造出「已学会且槽外」那一侧（用户原话「下方已学会不需要升级功能」指的正是它），
   * 判完立即装回：autoSlot 只在载入时补空槽，不装回就一直缺这一格，后面的组会跟着换形。 */
  await page.evaluate(() => { const b = document.querySelector('#tab-arts [data-act="unslotArt"][data-v="tuna"]'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const h2 = await slotRead(IDS);
  const ht = h2.cards[0];
  T(h2.n === 2 && ht.up === 0 && ht.slot === true && ht.unslot === false && h2.knownBtn === 0,
    'H2 槽外那一侧：卸下吐纳法后它的已学会卡**不给升级钮**（只留装入 + 弃置），槽里少一格',
    '槽=' + h2.n + ' 该卡升级钮=' + ht.up + ' 装入=' + ht.slot + ' 卸下=' + ht.unslot + ' 全文钮=' + h2.knownBtn);
  /* H2b F3（N59）+ F16（N68）：**同一张卡**卸下前有精通条有角标、卸下后两者一起消失 ——
   * 两判一起（只判「消失」会放过「两边都没条」那种假绿）。角标文本必须等于**引擎取数口**出来的
   * `arts.slotted`（页内现算，不抄第二份），且不许再是借来的秘境洞天词。 */
  T(h1.cards[0].bar === true && h1.cards[0].badge === true && h1.cards[0].badgeTxt.length > 0 &&
    h2.cards[0].bar === false && h2.cards[0].badge === false,
    'H2b 已学会卡：入槽时有精通条与角标 ‖ 卸下后条与角标一起消失（F3 = 槽外不再假在跑）',
    '前 bar=' + h1.cards[0].bar + ' badge=' + h1.cards[0].badgeTxt + ' ‖ 后 bar=' + h2.cards[0].bar + ' badge=' + h2.cards[0].badge);
  T(h1.cards[0].badgeTxt === pageSlotTxt && h1.cards[0].badgeTxt !== '进行中',
    'H2c 角标走自己的键（屏上 === 词表 arts.slotted），且不再借 zone.current 那句「进行中」',
    '屏上=' + h1.cards[0].badgeTxt);
  await page.evaluate(() => { const b = document.querySelector('#tab-arts .artgrid [data-act="slotArt"][data-v="tuna"]'); if (b) b.click(); });
  await page.waitForTimeout(250);
  const h3 = await slotRead(IDS);
  T(h3.n === 3 && h3.slots.indexOf('tuna') >= 0 && h3.knownN === 3,
    'H3 装回复原（H2 是点击改态、不是判据本身：不还原则后面几组看到的槽形与本批 fixture 不同）',
    '槽=' + h3.n + ' slots=' + h3.slots.join('/') + ' 已学会=' + h3.knownN);

  /* 合并页的标签 / 概览条 / 切段断言已随 B3 拆页退役；百器页断言见 verify-ui-gear.cjs。 */

  /* ── A7 法宝页：卡片网格（独立成页，断言不变）── */
  await page.click('#m-tabbar button:has-text("法宝")');
  await page.waitForTimeout(400);
  const tr = await page.evaluate(() => {
    const g = document.querySelector('#tab-treasure .trgrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      cards: document.querySelectorAll('#tab-treasure .trgrid > .tcard').length
    };
  });
  T(tr.hasGrid && tr.cols >= 2, 'A7 法宝页为卡片网格（宽屏 ≥2 列）', 'cols=' + tr.cols);
  T(tr.cards >= 3, 'A7b 法宝栏每槽一卡（≥3 卡）', 'n=' + tr.cards);

  /* ── A7c 认主进度按件（N52 · 第册十二批）：卡上那句「这件还差约 N 小时」的数字必须
   * **等于页内现算的 `SQ.Treasures.bondHoursLeft`**（公式只许在引擎那一处，视图抄第二份即说谎），
   * 且满阶那件**不出现**这句（反例：空集上的「都在」恒真）。 ── */
  const bond = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId], p = SQ.Worlds.xiuxian.pack;
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-treasure .trgrid > .tcard'));
    const txt = c => (c ? (c.textContent || '').replace(/\s+/g, ' ') : '');
    const ent = id => (w.treasures.owned.filter(e => e.id === id)[0]) || null;
    const cardOf = id => cards.filter(c => txt(c).indexOf(SQ.t('treasure.' + id + '.name', null, 'xiuxian')) >= 0)[0] || null;
    const e1 = ent('x02'), e2 = ent('x04');
    const left = SQ.Treasures.bondHoursLeft(p, e1);
    const t1 = txt(cardOf('x02')), t2 = txt(cardOf('x04'));
    const m = t1.match(/还差约\s*(\d+)\s*小时/) || [];
    return { left: left, onScreen: m[1] || '', hit: t1.indexOf('还差约') >= 0,
      hitMax: t2.indexOf('还差约') >= 0, leftMax: SQ.Treasures.bondHoursLeft(p, e2),
      want: SQ.t('treasure.bond.left', { n: left }, 'xiuxian'), inCard: t1.indexOf(SQ.t('treasure.bond.left', { n: left }, 'xiuxian')) >= 0,
      s1: t1.slice(0, 150), s2: t2.slice(0, 80), found: !!cardOf('x02') && !!cardOf('x04') };
  });
  T(bond.found && bond.left > 0 && Number(bond.onScreen) === bond.left && bond.hit && bond.inCard,
    'A7c 未满阶那件的「这件还差约 N 小时」=== 页内 bondHoursLeft 现算值（整句取词表、视图零自造公式）',
    '屏=' + bond.onScreen + ' 引擎=' + bond.left + ' 整句在卡=' + bond.inCard + ' ‖ ' + bond.s1);
  T(bond.hitMax === false && bond.leftMax === 0,
    'A7d 反例：已满阶那件卡上不出现这句（引擎取数口对它回 0）——否则「按件停表」只在数上成立、屏上仍在催',
    '满阶卡=' + bond.s2 + ' 命中=' + bond.hitMax + ' leftMax=' + bond.leftMax);

  /* ── A7e~A7g（B16-e）：法宝库改整行 / 图鉴改「先天 · 后天」两行折叠 ──
   * 46 格问号墙是设计稿点名的空态灾难 ⇒ 默认不出格子，点行才展开。库行则必须「一行一件 + 行内动作在位」，
   * 否则「改成行」只是把按钮挪丢了。 */
  const trLayout = await page.evaluate(() => {
    const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-treasure .trrow'));
    const act = rows[0] ? !!rows[0].querySelector('[data-act="equipTreasure"],[data-act="unequipTreasure"],[data-act="refineTreasure"]') : false;
    return {
      rows: rows.length, act: act,
      secs: document.querySelectorAll('#tab-treasure .codex-sec.cx-row').length,
      cells: document.querySelectorAll('#tab-treasure .codex-sec ~ .trgrid > .tcard').length
    };
  });
  T(trLayout.rows >= 2 && trLayout.act, 'A7e 法宝库改整行（一行一件、行内动作在位）', 'rows=' + trLayout.rows + ' act=' + trLayout.act);
  T(trLayout.secs === 2 && trLayout.cells === 0, 'A7f 法宝图鉴默认收起（先天 / 后天两行，零问号格）',
    'secs=' + trLayout.secs + ' cells=' + trLayout.cells);
  await page.evaluate(() => document.querySelector('#tab-treasure [data-act="codexTier"][data-v="tr_xian"]').click());
  await page.waitForTimeout(300);
  const trOpen = await page.evaluate(() => ({
    open: !!document.querySelector('#tab-treasure .codex-sec.cx-row.open'),
    cells: document.querySelectorAll('#tab-treasure .codex-sec.open ~ .trgrid > .tcard').length
  }));
  T(trOpen.open && trOpen.cells > 0, 'A7g 点「先天」行展开逐格（再点收起）', 'cells=' + trOpen.cells);
  await page.evaluate(() => document.querySelector('#tab-treasure [data-act="codexTier"][data-v="tr_xian"]').click());
  await page.waitForTimeout(200);

  /* ── A8 窄屏：器段退单列 + **导航零截断**（横向滚动修复的验收点）── */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  /* UI v2 B13：<720px 用五区底栏 + 子导航；16 项 `#m-tabbar` 收起 */
  await page.click('#m-subnav button[data-v="gear"]');
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const g = document.querySelector('#tab-gear .gear4');
    const zBar = document.getElementById('m-zonebar');
    const btns = Array.prototype.slice.call(zBar.querySelectorAll('button'));
    return {
      gearCols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      tabbar: getComputedStyle(document.getElementById('m-nav')).display,   /* B16-b：16 项导航连品牌区整体收进 #m-nav，判据读容器（display:none 父下子元素 computed 仍是自身值） */
      zone: getComputedStyle(zBar).display,
      clipped: btns.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim()),
      zones: btns.length,
      scrollable: zBar.scrollWidth > zBar.clientWidth
    };
  });
  /* B16-f：百器四槽改 `auto-fit minmax(148px,1fr)`（设计稿原式）⇒ 390 宽折两列；窄屏硬要求仍是不破宽 */
  T(narrow.gearCols >= 2, 'A8 窄屏器段四槽自动折列（≥2 列）', 'cols=' + narrow.gearCols);
  T(narrow.clipped.length === 0, 'A8d 窄屏五区底栏**零标签截断**（B13 起 16 项横滑已收起）',
    narrow.clipped.length ? '被截: ' + narrow.clipped.join(',') : 'clean');
  T(narrow.tabbar === 'none' && narrow.zone === 'flex' && narrow.zones === 5 && !narrow.scrollable,
    'A8e 窄屏导航 = 五区底栏（16 项侧栏隐藏、底栏五钮且不横向滚动）',
    'tabbar=' + narrow.tabbar + ' zone=' + narrow.zone + ' n=' + narrow.zones + ' scrollable=' + narrow.scrollable);

  /* ── A9 窄屏法宝页退单列（切回激活再量：隐藏面板无法解析网格列）── */
  await page.click('#m-subnav button[data-v="treasure"]');
  await page.waitForTimeout(300);
  const narrowTr = await page.evaluate(() => {
    const t = document.querySelector('#tab-treasure .trgrid');
    return { cols: t ? getComputedStyle(t).gridTemplateColumns.split(' ').length : 0 };
  });
  T(narrowTr.cols === 1, 'A9 窄屏法宝网格退单列', 'cols=' + narrowTr.cols);

  /* ── A10 旧档 tabOrder 含 'gear'：由「未知 id 剔除」自动清掉，导航不崩不多项、其余项相对序保留 ──
   * 口径修正（2026-10-07 · 界面层首次实跑抓获的**测试骨架缺陷**，非产品缺陷）：
   *   原写法「先 evaluate 改 localStorage、再 page.reload()」读到的是**默认序**——
   *   `ctx.addInitScript` 每次导航都会重跑，用建场时的原始存档（`tabOrder: []`）把刚写入的顺序整个冲掉，
   *   于是 A10c 必红（实测 head4 = idle,combat,arts,treasure 即默认序，而非产品重排）。
   *   产品行为已用独立探针复核为**正确**：以 preset 存档首次加载时实测 head4 = idle,arts,combat,treasure、12 项、未知 id 全剔。
   * 现改为「带旧档 tabOrder 的存档首次加载」：另开一个 context 注入 preset，不再依赖 reload 后的 localStorage 改写。 */
  const saveLegacy = JSON.parse(JSON.stringify(save));
  /* 旧档实态：gear 排在 arts 之后（合并前的默认序），另塞一个从不存在的 id 一并验剔除 */
  saveLegacy.settings.tabOrder = ['idle', 'arts', 'gear', 'combat', 'nosuchtab', 'treasure'];
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx2.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveLegacy);
  const page2 = await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await page2.goto(url);
  page2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page2.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page2.waitForTimeout(700);
  const afterLegacy = await page2.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(bar.children);
    const btns = kids.filter((x) => x.tagName === 'BUTTON');
    return {
      total: btns.length,
      ids: btns.map((x) => x.dataset.v),
      secs: kids.filter((x) => x.classList.contains('sq2-navsec')).map((x) => x.textContent.trim()),
      persisted: JSON.stringify((JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}').settings || {}).tabOrder || [])
    };
  });
  T(afterLegacy.total === 16, 'A10 旧档 tabOrder 不影响导航项数（仍 16 项、不多项不崩）', 'n=' + afterLegacy.total);
  T(afterLegacy.ids.indexOf('nosuchtab') < 0 && afterLegacy.ids.indexOf('gear') >= 0,
    'A10b 未知 id（nosuchtab）被剔除；gear 现为合法页', afterLegacy.ids.join(','));
  T(afterLegacy.ids.join(',') === 'idle,combat,event,arts,gear,treasure,alchemy,shop,bonds,faction,prodigy,sect,achv,legacy,journal,settings' &&
    afterLegacy.secs.join(',') === '修行,历练,道器,江湖,生平',
    'A10c 旧档 tabOrder 被五区固定序取代（字段保留、不再参与排序）', 'nav=' + afterLegacy.ids.join(','));
  /* B3：lawChip 已随合并页退役；旧档 tabOrder 字段只要求「原样保留、不再读」，不做迁移也不清键。 */
  T(afterLegacy.persisted === JSON.stringify(['idle', 'arts', 'gear', 'combat', 'nosuchtab', 'treasure']),
    'A10d 旧档 settings.tabOrder 原样保留（字段不退役、值不改写）', afterLegacy.persisted);

  /* ── S 组（2026-10-15 · 用户报「当前存档下法与器页打不开」）──
   * 融合自创部**允许没有签名词条**（`fusion.js:243` 起 `var special = null`、`:272` 原样入档、`:52` normalize 也只认
   * 「对象且有 pool」）⇒ `special:null` 是合法存档态。旧视图三处裸读 `a.special.pool`（详情浮层 / 槽内小卡 / 已学会卡），
   * 拿真档复现 = `TypeError: Cannot read properties of null (reading 'pool')`，**整页 innerText 归零**（不是少一张卡）。
   * ⚠️ 在册走查原先测不出来的原因有两条：① 没有任何 fixture 带自创部；② **从不打开 `#modal-arts` 详情浮层**。S4 补第二段。 */
  const saveCustom = JSON.parse(JSON.stringify(save));
  const wfC = saveCustom.worlds.xiuxian;
  wfC.fusion = { lastFuseAt: 0, lastReforgeAt: 0, meditate: null, seq: 1, customs: [{
    id: 'c1', name: '无名残卷', gen: 1, tier: 1, attr: 'qi', align: 'neutral',
    effects: { qiRate: 0.02 }, special: null,
    parents: [{ id: 'tuna', name: '吐纳法', tier: 0 }, { id: 'juling', name: '聚灵诀', tier: 0 }],
    createdAt: Date.now()
  }] };
  wfC.artsKnown = (wfC.artsKnown || []).concat(['c1']);
  wfC.artsLevels = wfC.artsLevels || {}; wfC.artsLevels.c1 = 2;
  wfC.artsSlots = (wfC.artsSlots || []).concat(['c1']);      /* 入槽才走得到「槽内小卡」那一处裸读 */
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx3.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveCustom);
  const page3 = await ctx3.newPage();
  const errors3 = [];
  page3.on('pageerror', (e) => errors3.push(String(e.message || e)));
  page3.on('console', (m) => { if (m.type() === 'error') errors3.push(m.text()); });
  await page3.goto(url);
  await page3.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page3.click('#m-tabbar button[data-v="arts"]');
  await page3.waitForTimeout(600);
  const sRead = await page3.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .tcard'));
    const mine = cards.filter((x) => (x.innerText || '').indexOf('无名残卷') >= 0)[0];
    const arts = document.getElementById('tab-arts');
    return {
      len: arts ? (arts.innerText || '').trim().length : -1, n: cards.length, found: !!mine,
      text: mine ? (mine.innerText || '').replace(/\s+/g, ' ').trim() : '',
      tdesc: mine ? (((mine.querySelector('.tdesc') || {}).textContent) || '') : ''
    };
  });
  T(errors3.length === 0 && sRead.len > 200 && sRead.n >= 3,
    'S1 档里有一部「无签名词条」的自创部时，法与器页照样渲染（旧形状 = 整页空白 + pageerror）',
    'len=' + sRead.len + ' 卡=' + sRead.n + ' err=' + (errors3[0] || 'none'));
  T(sRead.found && sRead.text.indexOf('Lv2') >= 0 && sRead.tdesc.trim().length > 0,
    'S2 那张自创部的卡确实上屏：Lv 在位、副行退到功法描述而不是空着', 'found=' + sRead.found + ' tdesc=' + sRead.tdesc.slice(0, 18));
  T(sRead.found && sRead.text.indexOf('签名') < 0 && !/undefined|\{|null/.test(sRead.text),
    'S3 无词条的卡不许编造「签名 ·」，也不许露 undefined / null / { 占位', sRead.text.slice(0, 52));
  /* B16-c：openArtsModal 触发点已随四柱迁右栏（仅修行区渲染）⇒ 先切回修行页再点右栏「法」柱 */
  await page3.click('#m-tabbar button[data-v="idle"]');
  await page3.waitForTimeout(400);
  await page3.evaluate(() => { const b = document.querySelector('#m-rail [data-act="openArtsModal"]'); if (b) b.click(); });
  await page3.waitForTimeout(500);
  const sModal = await page3.evaluate(() => {
    const m = document.getElementById('modal-arts');
    const txt = m && !m.classList.contains('hide') ? (m.innerText || '') : '';
    const rows = txt.split('\n').filter((l) => l.indexOf('无名残卷') >= 0);
    return { open: txt.length > 0, has: txt.indexOf('无名残卷') >= 0, row: rows.join(' / ').replace(/\s+/g, ' ').slice(0, 60) };
  });
  T(sModal.open && sModal.has && errors3.length === 0,
    'S4 功法详情浮层能列出这部自创部（在册走查原先从不打开这层 = 第二个裸读点无射程）',
    'open=' + sModal.open + ' has=' + sModal.has + ' err=' + (errors3[1] || errors3[0] || 'none'));
  T(sModal.row.indexOf('签名') < 0, 'S4b 浮层那行同样不编造签名（`arts.special` 标签只在有词条时出现）', sModal.row || '(无该行)');
  await ctx3.close();

  /* ── F 组（2026-10-15 第卌三批 · 用户报「已学会的功法也要能按品阶筛选，方便快速查找」）──
   * 实现口径 = 图鉴那排 chip **升格为整段筛选器**（已学会 + 图鉴共用同一枚 ui.artsGroupVal），
   * 零新状态零新词表键。判据要证四件事：默认不筛（整页形状不变）‖ 筛后卡集恰等于该阶子集
   * ‖ 筛空了不许说「尚未学会」（那是「一部都没学」的话，不是「这一阶没有」的话）
   * ‖ chip 行 DOM 序已上移到「已学会」之前（否则筛选器在它管的列表下面）。 */
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx4.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page4 = await ctx4.newPage();
  const errors4 = [];
  page4.on('pageerror', (e) => errors4.push(String(e.message || e)));
  page4.on('console', (m) => { if (m.type() === 'error') errors4.push(m.text()); });
  await page4.goto(url);
  await page4.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page4.click('#m-tabbar button[data-v="arts"]');
  await page4.waitForTimeout(600);
  const fRead = () => page4.evaluate(() => {
    const grid = document.querySelector('#tab-arts .artgrid');
    const cards = Array.prototype.slice.call(grid ? grid.querySelectorAll('.tcard') : []);
    const heads = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .sechead .t'));
    const knownEl = heads.filter((x) => x.textContent.replace(/\s+/g, '').indexOf('已学会') >= 0)[0];
    const grp = document.querySelector('#tab-arts .grouper');
    const onEl = document.querySelector('#tab-arts .gchip.on');
    const txts = heads.map((x) => x.textContent.trim());
    return {
      n: cards.length,
      names: cards.map((x) => {
        const tn = x.querySelector('.tname');
        return tn && tn.firstChild ? String(tn.firstChild.textContent).trim() : '';
      }),
      on: onEl ? (onEl.dataset.v || '') : '',
      knownHead: knownEl ? knownEl.textContent.trim() : '',
      /* 筛选条必须在「已学会」段标**之前**（它现在管两段）：用 DOM 位置关系判，不靠字符串顺序 */
      before: !!(grp && knownEl && (grp.compareDocumentPosition(knownEl) & Node.DOCUMENT_POSITION_FOLLOWING) > 0),
      heads: txts.join('|'),
      /* B16-h 改口：图鉴末节改「按品阶折叠」后组头是 .codexsec 按钮，不再靠「字阶」字样数节 */
      tierHeads: document.querySelectorAll('#tab-arts .codexsec').length,
      tierHeadsTxt: Array.prototype.map.call(document.querySelectorAll('#tab-arts .codexsec .t'), (x) => x.textContent.trim()).join('|'),
      emptyLine: (document.getElementById('tab-arts').innerText || '').indexOf('尚未学会') >= 0
    };
  });
  const f0 = await fRead();
  T(errors4.length === 0 && f0.n === 3 && f0.on === '' && f0.tierHeads === 4,
    'F1 默认态不筛：已学会恰三张卡（fixture 3 部）+ 无选中 chip + 图鉴四阶小节齐',
    'cards=' + f0.n + ' on=' + f0.on + ' 阶节=' + f0.tierHeads + ' err=' + (errors4[0] || 'none'));
  T(f0.before, 'F2 筛选条 DOM 序在「已学会」段标之前（它现在管两段，不能沉在列表下面）', 'before=' + f0.before);
  await page4.click('#tab-arts .gchip[data-v="huang"]');
  await page4.waitForTimeout(400);
  const fH = await fRead();
  T(fH.n === 2 && fH.names.join(',') === '吐纳法,聚灵诀' && fH.knownHead.indexOf('· 2') >= 0,
    'F3 点「黄」⇒ 已学会只剩两部黄阶（段标计数同步到 2、太上忘情篇被滤掉）',
    'cards=' + fH.n + ' [' + fH.names.join('/') + '] head=' + fH.knownHead);
  T(fH.tierHeads === 1 && fH.tierHeadsTxt.indexOf('黄') >= 0,
    'F4 图鉴同步只剩黄阶一节（同一段筛选器，两段不许各筛各的）', '阶节=' + fH.tierHeads + ' ' + fH.heads.slice(0, 60));
  await page4.click('#tab-arts .gchip[data-v="xuan"]');
  await page4.waitForTimeout(400);
  const fX = await fRead();
  T(fX.n === 0 && !fX.emptyLine && fX.knownHead.indexOf('· 0') >= 0,
    'F5 筛到空的一阶：零卡且**不说「尚未学会」**（那是「一部都没学」的话）；段标计数 0 即为交代',
    'cards=' + fX.n + ' emptyLine=' + fX.emptyLine + ' head=' + fX.knownHead);
  await page4.click('#tab-arts .gchip[data-v="xuan"]');
  await page4.waitForTimeout(400);
  const fBack = await fRead();
  T(fBack.n === 3 && fBack.on === '', 'F6 再点同枚 chip 取消筛选 ⇒ 回到三张（toggle 语义与图鉴原口径一致）',
    'cards=' + fBack.n + ' on=' + fBack.on);
  await page4.click('#tab-arts .gseg [data-v="align"]');
  await page4.waitForTimeout(300);
  await page4.click('#tab-arts .gchip[data-v="evil"]');
  await page4.waitForTimeout(400);
  const fE = await fRead();
  T(fE.n === 1 && fE.names[0] === '太上忘情篇', 'F7 换「阵营」维点魔 ⇒ 已学会只剩那部魔道功法（双维共用同一枚选中值）',
    'cards=' + fE.n + ' [' + fE.names.join('/') + ']');
  const fLeak = await page4.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    return { wrote: !!(s.profile && s.worlds && s.worlds.xiuxian), leaked: JSON.stringify(s).indexOf('artsGroup') >= 0 };
  });
  T(fLeak.wrote && !fLeak.leaked, 'F8 筛过之后落盘存档搜不到 `artsGroup`（筛选是看态不是角色态，与 lawChip 同纪律）',
    'wrote=' + fLeak.wrote + ' leaked=' + fLeak.leaked);
  T(errors4.length === 0, 'F9 整组零页面报错', errors4.join('|').slice(0, 150) || 'clean');
  await ctx4.close();

  /* ── G 组（2026-10-16 第卌六批 · 用户反馈「在坊市购买功法后，功法未出现在功法页面」）──
   * 实况：那部《聚仙幡》要求 karma ≤ −300，玩家 karma 未达 ⇒ 引擎把它放进**待修习架**（货没丢），
   * 但整页只有头部「待修习架 N/24」一个计数、清单要逐部点开图鉴 ⇒ 玩家只当丢了。
   * 本组判据证四件事：架上有专属一段且写清缺哪项 ‖ 与已学会/图鉴共用同一枚 chip 筛选（不另立一套）
   * ‖ 弃置按钮在这一段里点得动且点完这段消失（空集不渲染）‖ 坊市确认框先把去向说一句、取消不扣钱。 */
  const saveShelf = JSON.parse(JSON.stringify(save));
  /* 架上故意塞一枚**认不出的 id**（旧档 / 退役功法留下的脏位）：视图必须先滤，
   * 否则 `am[x].tier` 裸读会把整页炸空——这正是第卌批「自创部 special:null」那一形。 */
  saveShelf.worlds.xiuxian.shelf = ['juxian', 'zz_no_such_art'];
  saveShelf.worlds.xiuxian.stones = 5000;
  saveShelf.worlds.xiuxian.shop.items = [{ kind: 'arts', ref: 'juxian', price: 999, sold: false }];
  saveShelf.worlds.xiuxian.shop.nextRestock = Date.now() + 4 * 3600 * 1000;   /* 别让秒级 tick 中途换架（第廿六批那族竞态） */
  const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx5.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveShelf);
  const page5 = await ctx5.newPage();
  const errors5 = [];
  page5.on('pageerror', (e) => errors5.push(String(e.message || e)));
  page5.on('console', (m) => { if (m.type() === 'error') errors5.push(m.text()); });
  await page5.goto(url);
  await page5.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page5.click('#m-tabbar button[data-v="arts"]');
  await page5.waitForTimeout(600);
  const shelfRead = () => page5.evaluate(() => {
    /* 按专名类取（`.sechead` + 文案匹配会撞上图鉴那几节的既有段标 `待修习架 · X字阶`） */
    const head = document.querySelector('#tab-arts .shelfsec .t');
    const grid = document.querySelector('#tab-arts .shelfgrid');
    const rows = Array.prototype.slice.call(grid ? grid.querySelectorAll('.lrow') : []);
    const txt = rows.map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join(' § ');
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    const w = (st.worlds || {}).xiuxian || {};
    const onEl = document.querySelector('#tab-arts .gchip.on');
    return {
      head: !!head && rows.length > 0, headTxt: head ? head.textContent.trim() : '',
      rows: rows.length, txt,
      /* B16-g：待修习架从卡片网格改整行清单 —— 容器不得再带 .cards / .artgrid */
      notCards: !!grid && !grid.classList.contains('cards') && !grid.classList.contains('artgrid'),
      on: onEl ? String(onEl.dataset.v || '') : '', shelf: (w.shelf || []).join(','), stones: w.stones || 0
    };
  });
  const g0 = await shelfRead();
  T(g0.notCards, 'G0 待修习架为整行清单（.shelfgrid 不带 .cards / .artgrid 网格类）');
  T(errors5.length === 0 && g0.head && g0.rows === 1 && g0.txt.indexOf('聚仙幡') >= 0 &&
    g0.txt.indexOf('待复检') >= 0 && g0.txt.indexOf('{') < 0 && g0.txt.indexOf('弃置') >= 0 &&
    g0.headTxt.indexOf('· 1') >= 0,
    'G1 架上段：段标计数 1（**脏位已滤**，fixture 塞了两枚只认得一枚）+ 名号 + 未达标徽标 + 缺项非空零花括号 + 弃置在位',
    'head=' + g0.headTxt + ' rows=' + g0.rows + ' txt=' + g0.txt.slice(0, 120) + ' err=' + (errors5[0] || 'none'));
  await page5.click('#tab-arts .gchip[data-v="huang"]');
  await page5.waitForTimeout(400);
  const gHuang = await shelfRead();
  await page5.click('#tab-arts .gchip[data-v="tian"]');
  await page5.waitForTimeout(400);
  const gTian = await shelfRead();
  T(!gHuang.head && gTian.head && gTian.rows === 1,
    'G2 架上段跟着同一枚 chip 走（筛「黄」整段消失、筛「天」回来）——不许长出第二套筛选状态',
    '黄=' + gHuang.head + ' 天=' + gTian.head + '/' + gTian.rows);
  await page5.click('#tab-arts .gchip[data-v="tian"]');
  await page5.waitForTimeout(300);
  const stonesBefore = (await shelfRead()).stones;
  await page5.click('#tab-arts .shelfgrid button[data-act="salvageArt"]');
  await page5.waitForSelector('#modal-confirm:not(.hide)', { timeout: 8000 });
  await page5.click('#cf-ok');
  await page5.waitForTimeout(700);
  const gAfter = await shelfRead();
  T(gAfter.shelf.indexOf('juxian') < 0 && gAfter.stones > stonesBefore && !gAfter.head,
    'G3 在这一段里点「弃置」→ 确认后那部离开架上、灵石回账，且**只剩脏位的架子不再渲染段标**（空段不留标）',
    'shelf=' + (gAfter.shelf || '空') + ' stones ' + stonesBefore + '→' + gAfter.stones + ' head=' + gAfter.head);
  await page5.click('#m-tabbar button:has-text("坊市")');
  await page5.waitForTimeout(600);
  const buyBtn = page5.locator('#tab-shop .fasec button[data-act="buy"][data-v="0"][data-b="0"]');
  const hasBuy = (await buyBtn.count()) > 0;
  const stPreBuy = (await shelfRead()).stones;   /* 基线取当下值（G3 的弃置已回账），不是最初的 5000 */
  const card5 = hasBuy ? await page5.evaluate(() => {
    const el = document.querySelector('#tab-shop .fasec .shopcard');
    return (el ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }) : '';
  T(hasBuy && card5.indexOf('聚仙幡') >= 0 && card5.indexOf('待修习架') >= 0,
    'G4 买**要求未达**的功法，卡面自己就把去向说一句（第册一百一十四批：这句原先只在确认框里，框已随「点了就成交」没了 ⇒ 搬到卡上，否则玩家又要以为货丢了）',
    'hasBuy=' + hasBuy + ' 卡=' + card5.slice(0, 120));
  if (hasBuy) await buyBtn.first().click();
  await page5.waitForTimeout(500);
  const noDlg5 = await page5.evaluate(() => !document.querySelector('#modal-confirm:not(.hide)'));
  const gBuy = await shelfRead();
  T(noDlg5 && gBuy.stones === stPreBuy - 999 && gBuy.shelf.indexOf('juxian') >= 0,
    'G5 点钮即成交：不弹确认框、按卡面价扣钱、那部落进待修习架（原「取消这单分文不动」那一支随弹窗退役）',
    '弹窗=' + !noDlg5 + ' 灵石=' + stPreBuy + '→' + gBuy.stones + ' shelf=' + gBuy.shelf);
  T(errors5.length === 0, 'G6 整组零页面报错', errors5.join('|').slice(0, 150) || 'clean');
  await ctx5.close();

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_ARTS_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ARTS_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
