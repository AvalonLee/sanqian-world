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
      grid: !!p.querySelector('.geargrid'),
      cards: p.querySelectorAll('.geargrid > .tcard').length,
      codex: !!p.querySelector('[data-act="openGearCodex"]'),
      stash: p.querySelectorAll('#tab-gear .lrow, #tab-gear .stashgrid, #tab-gear [data-act="refineGear"]').length,
      lawLeak: !!p.querySelector('.artgrid') || !!p.querySelector('.selflearn') || !!p.querySelector('[data-act="matWudao"]'),
      len: (p.innerText || '').trim().length
    };
  });
  T(g.shown && g.artsHidden, 'G2 点百器 → #tab-gear 显示、#tab-arts 隐藏', JSON.stringify(g).slice(0, 120));
  T(g.grid && g.cards === 4, 'G3 四槽百器网格在位（每槽一卡）', 'cards=' + g.cards);
  T(g.codex, 'G4 百器录横幅入口在位');
  T(g.stash >= 1, 'G5 库藏阁 / 炼化入口在位', 'n=' + g.stash);
  T(!g.lawLeak && g.len > 100, 'G6 百器页不串功法段（artgrid / selflearn / 悟道石缺席）', 'len=' + g.len);

  await page.click('#m-tabbar button[data-v="arts"]');
  await page.waitForTimeout(300);
  const back = await page.evaluate(() => ({
    gearHidden: document.getElementById('tab-gear').classList.contains('hide'),
    artsShown: !document.getElementById('tab-arts').classList.contains('hide')
  }));
  T(back.gearHidden && back.artsShown, 'G7 切回功法页后百器容器隐藏（互不串页）');

  await page.setViewportSize({ width: 380, height: 720 });
  await page.click('#m-tabbar button[data-v="gear"]');
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const grid = document.querySelector('#tab-gear .geargrid');
    return {
      cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth
    };
  });
  T(narrow.cols === 1, 'G8 380 宽百器网格退单列', 'cols=' + narrow.cols);
  T(narrow.overflow, 'G9 380 宽零横向溢出');
  T(errors.length === 0, 'G10 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');

  await ctx.close();
  await browser.close();
  console.log('\nUI_GEAR_ALL_GREEN ' + pass + '/' + (pass + fail));
  if (fail) process.exit(1);
})();
