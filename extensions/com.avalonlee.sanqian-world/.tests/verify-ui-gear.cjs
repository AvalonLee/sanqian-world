/* .tests/verify-ui-gear.cjs — 「百器」页走查（UI v2 B3 拆页后新页）
 * 依赖：playwright-core + Edge；用法：node .tests/verify-ui-gear.cjs
 *
 * B3 把「法与器」拆回「功法」「百器」两页。本篇锁百器页自己的一面：
 *   ① 导航有独立「百器」项，点开只渲染 #tab-gear；
 *   ② 百器录横幅 / 四槽网格 / 库藏阁在位，功法页标志（artgrid / selflearn / matWudao）缺席；
 *   ③ 切回功法页后百器容器隐藏（两页互不串页）；
 *   ④ 380 宽网格退单列、零横向溢出、零 pageerror。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now = Date.now();
  fx.profile.createdAt = now;
  Object.values(fx.worlds).forEach((w) => {
    w.lastSave = now; w.lastOffline = null; w.pendingChoice = null; w.realm = 9;
    /* G13/G14（册150 佩戴钮判）造景：在身一件旧剑 + 库藏阁一件新剑；自动炼化显式关
     * ⇒ 佩戴后旧件的去向钉「入库藏阁」而非「炼化」，判据不随炼化开关歧义。 */
    w.gearAutoRefine = false;
    w.gear = Object.assign({}, w.gear, { weapon: { slot: 'weapon', name: '在身旧剑', alignment: 'neutral', tier: 2, atk: 10, resist: 0, reqs: { realm: 0 }, special: null, source: { type: 'zone', ref: 0 } } });
    w.stash = [{ slot: 'weapon', name: '库藏新剑', alignment: 'neutral', tier: 3, atk: 60, resist: 0, reqs: { realm: 0 }, special: null, prime: false, source: { type: 'zone', ref: 0 } }];
  });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')')); };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(fx));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 90)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(String(m.text()).slice(0, 90)); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(600);

  const nav = await page.evaluate(() => {
    const b = document.querySelector('#m-tabbar [data-v="gear"]');
    return { exists: !!b, label: b ? b.textContent.trim() : '' };
  });
  T(nav.exists && nav.label === '百器', 'G1 导航有独立「百器」项（gear.system）', JSON.stringify(nav));

  await page.click('#m-tabbar button[data-v="gear"]');
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => {
    const p = document.getElementById('tab-gear');
    return {
      shown: !p.classList.contains('hide'),
      artsHidden: document.getElementById('tab-arts').classList.contains('hide'),
      /* B16-f：四槽由卡片网格改为设计稿 .gear4 一行四格（判据同步改口） */
      grid: !!p.querySelector('.gear4'),
      cards: p.querySelectorAll('.gear4 > .gslot').length,
      codex: !!p.querySelector('[data-act="openGearCodex"]'),
      stash: p.querySelectorAll('#tab-gear .lrow, #tab-gear .stashgrid, #tab-gear [data-act="refineGear"]').length,
      lawLeak: !!p.querySelector('.artgrid') || !!p.querySelector('.selflearn') || !!p.querySelector('[data-act="matWudao"]'),
      len: (p.innerText || '').trim().length
    };
  });
  T(g.shown && g.artsHidden, 'G2 点百器 → #tab-gear 显示、#tab-arts 隐藏', JSON.stringify(g).slice(0, 120));
  T(g.grid && g.cards === 4, 'G3 四槽百器一行四格在位（每槽一格）', 'cards=' + g.cards);
  T(g.codex, 'G4 百器录横幅入口在位');
  T(g.stash >= 1, 'G5 库藏阁 / 炼化入口在位', 'n=' + g.stash);
  T(!g.lawLeak && g.len > 100, 'G6 百器页不串功法段（artgrid / selflearn / 悟道石缺席）', 'len=' + g.len);

  /* ── G11/G12（B16-f）：三格摘要与百器录行 ──
   * 三格的「在身」必须是**页内现算**的已佩戴件数（与槽位实际填充一致），不能是写死的 0/4；
   * 百器录从页首横幅改整行后，入口（data-act）与进度条都要还在，且点了真开浮层。 */
  const sums = await page.evaluate(() => {
    const box = document.querySelector('#tab-gear .sum3');
    const cells = box ? Array.prototype.slice.call(box.children) : [];
    const wornTxt = cells[0] ? (cells[0].querySelector('.v') || {}).textContent || '' : '';
    const save = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = save.worlds[save.profile.worldId];
    const n = ['weapon', 'treasure', 'armor', 'accessory'].filter((s) => w.gear && w.gear[s]).length;
    const row = document.querySelector('#tab-gear .lrow.codexrow');
    return {
      cells: cells.length, wornTxt: wornTxt.trim(), wornReal: n,
      row: !!row, bar: !!(row && row.querySelector('.bar')), act: !!(row && row.getAttribute('data-act') === 'openGearCodex')
    };
  });
  T(sums.cells === 3 && sums.wornTxt.indexOf(String(sums.wornReal)) === 0,
    'G11 三格摘要（在身 / 攻击 / 渡劫抗性）在位，且在身 = 存档里已佩戴件数（现算）',
    'cells=' + sums.cells + ' 屏=' + sums.wornTxt + ' 档=' + sums.wornReal);
  T(sums.row && sums.bar && sums.act, 'G12 百器录改整行且入口未丢（进度条 + data-act=openGearCodex）',
    'row=' + sums.row + ' bar=' + sums.bar);
  await page.click('#tab-gear .lrow.codexrow');
  await page.waitForTimeout(350);
  const codexOpen = await page.evaluate(() => !document.getElementById('modal-gearcodex').classList.contains('hide'));
  T(codexOpen, 'G12b 点百器录行 → 12 格双节浮层打开');
  await page.evaluate(() => document.getElementById('mgc-close').click());
  await page.waitForTimeout(200);

  /* ── G13/G14（册150 · 用户令「库藏阁对应物品增加佩戴按钮，佩戴后自动替换对应装备」）──
   * G13 = 常规件行给「佩戴」钮（wearGear）；G14 = 实点：新剑上身、旧剑按自动炼化=关入库藏阁，
   * 全程真点不走引擎直调（handler → Actions.wearGear → Gear.equipFromStash 整链）。 */
  const stashBtns = await page.evaluate(() => {
    const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-gear .lrow.stroe'));
    return rows.map((r) => ({
      name: ((r.querySelector('.srn') || {}).textContent || '').trim().slice(0, 4),
      wear: !!r.querySelector('[data-act="wearGear"]'),
      swap: !!r.querySelector('[data-act="swapGear"]'),
      refine: !!r.querySelector('[data-act="refineGear"]')
    }));
  });
  T(stashBtns.length === 1 && stashBtns[0].name === '库藏新剑' && stashBtns[0].wear && !stashBtns[0].swap && stashBtns[0].refine,
    'G13 库藏阁常规件行 = 佩戴 + 炼化两钮（无独占 ⇒ 不出手动替换钮）', JSON.stringify(stashBtns));
  await page.click('#tab-gear [data-act="wearGear"]');
  await page.waitForTimeout(500);
  const worn14 = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian;
    return { worn: (w.gear.weapon || {}).name, stash: (w.stash || []).map((x) => x.name), n: (w.stash || []).length };
  });
  T(worn14.worn === '库藏新剑' && worn14.n === 1 && worn14.stash.indexOf('在身旧剑') >= 0,
    'G14 点佩戴 ⇒ 新剑上身、旧剑按自动炼化=关退回库藏阁（佩戴后自动替换对应装备）',
    JSON.stringify(worn14));

  await page.click('#m-tabbar button[data-v="arts"]');
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => ({
    gearHidden: document.getElementById('tab-gear').classList.contains('hide'),
    artsShown: !document.getElementById('tab-arts').classList.contains('hide')
  }));
  T(back.gearHidden && back.artsShown, 'G7 切回功法页后百器容器隐藏（互不串页）');

  await page.setViewportSize({ width: 380, height: 720 });
  await page.click('#m-subnav button[data-v="gear"]');   /* B13：<720px 走子导航（16 项侧栏已收起） */
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const grid = document.querySelector('#tab-gear .gear4');
    return {
      cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth
    };
  });
  /* B16-f：四槽改用设计稿 `repeat(auto-fit, minmax(148px,1fr))` ⇒ 380 宽自动折两列（不再强退单列），
     判据随之改口为「自动折列 + 零横向溢出」——窄屏硬要求是不破宽，不是必须一列。 */
  T(narrow.cols >= 2, 'G8 380 宽四槽自动折列（≥2 列）', 'cols=' + narrow.cols);
  T(narrow.overflow, 'G9 380 宽零横向溢出');
  T(errors.length === 0, 'G10 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');

  await ctx.close();
  await browser.close();
  console.log('\nUI_GEAR_ALL_GREEN ' + pass + '/' + (pass + fail));
  if (fail) process.exit(1);
})();
