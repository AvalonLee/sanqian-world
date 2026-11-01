/* .tests/verify-ui-wuxiacreate.cjs — 武侠创角 e2e 走查（册164 立；册168 随流程重排整篇改口；册214 P1 再改口）
 * P1 后流程 = 一择界（首屏）→ 二立名（NAMES.wuxia 掷名）→ 三观天赋（通用池）→ 天命锁入世
 *   → **武侠 tab 主壳**（#shell-main，书形态已退役——wuxiamode + wh-tabs）。
 * 判据一律回读页内真值；localStorage 无种子（冷启走完整流程）。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(url);
  await page.waitForSelector('#sc-c3:not(.hide)', { timeout: 15000 });

  /* C0 · 首屏即择界：武侠卡界系名只出现一次 + 卡上无「先睹」钮（随书形态退役）+ 未选时下一步=默认文 */
  const c0 = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#c3-list .wcard'));
    const wx = cards.find((c) => /侠影江湖/.test(c.textContent));
    const xx = cards.find((c) => /玄幻修仙/.test(c.textContent));
    return {
      first: !document.getElementById('sc-c3').classList.contains('hide'),
      wxMain: wx ? wx.querySelector('.wname').textContent : '',
      wxSubDup: wx ? /侠影江湖/.test(wx.querySelector('.wtags').textContent) : true,
      xxSub: xx ? xx.querySelector('.wtags').textContent : '',
      bkGo: document.querySelectorAll('#c3-list .bk-go').length,
      goText: document.getElementById('c3-go').textContent,
      steps: document.getElementById('c3-steps').textContent
    };
  });
  T(c0.first && c0.wxMain === '侠影江湖' && !c0.wxSubDup && /玄幻修仙/.test(c0.xxSub) &&
    c0.bkGo === 0 && /下一步/.test(c0.goText) && /一择界/.test(c0.steps),
    'C0 首屏择界（正名「侠影江湖」只出现一次 ⇔ 修仙卡副行带界系名 ⇔ 卡上无先睹钮 ⇔ 未选时下一步=默认文）',
    '主行=' + c0.wxMain + ' 副行重复=' + c0.wxSubDup + ' 先睹钮=' + c0.bkGo + ' 钮文=' + c0.goText + ' 步=' + c0.steps);

  /* C1 · 选中武侠：钮文恒「下一步」（书世界「翻看此书」变体随 P1 退役）+ 步骤条无「取诨号」 */
  await page.click('#c3-list .wcard:has-text("侠影江湖")');
  await page.waitForTimeout(120);
  const c1 = await page.evaluate(() => ({
    go: document.getElementById('c3-go').textContent,
    steps: document.getElementById('c3-steps').textContent
  }));
  T(/下一步/.test(c1.go) && !/取诨号/.test(c1.steps) && !/翻看此书/.test(c1.go),
    'C1 选中武侠（钮文恒「下一步」⇔ 步骤条无书世界变体——tab 世界流回归）',
    'go=' + c1.go + ' steps=' + c1.steps);

  /* C2 · 立名：武侠掷名（NAMES.wuxia 分卷）产出合法名 → 进观天赋屏（通用池天赋卡在位） */
  await page.click('#c3-go');
  await page.waitForSelector('#sc-c1:not(.hide)', { timeout: 8000 });
  await page.click('#c1-random');
  const c2 = await page.evaluate(() => ({ name: document.getElementById('c1-name').value }));
  await page.fill('#c1-name', '试炼者' + (c2.name || '').slice(0, 1));
  await page.click('#c1-next');
  await page.waitForSelector('#sc-c2:not(.hide)', { timeout: 8000 });
  const c2b = await page.evaluate(() => ({
    name: document.getElementById('c1-name').value,
    cards: document.querySelectorAll('#c2-cards .tcard').length
  }));
  T(c2b.name.length >= 2 && c2b.name.indexOf('??') < 0 && c2b.cards >= 1,
    'C2 立名与观天赋（NAMES.wuxia 掷名合法 ⇔ 天赋卡在位——通用池对武侠开放）',
    'name=' + c2b.name + ' cards=' + c2b.cards);

  /* C3 · 天命锁入世 → 武侠 tab 主壳（wuxiamode + wh-tabs）+ 存档 20 键且书形态键不复存在 */
  await page.click('#c2-confirm');
  await page.waitForSelector('#modal-lock:not(.hide)', { timeout: 8000 });
  await page.click('#mk-ok');
  await page.waitForSelector('#shell-main .wh-tabs', { timeout: 15000 });
  const c3 = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const p = raw.profile || {};
    const w = raw.worlds.wuxia;
    return {
      mode: document.getElementById('sc-main').classList.contains('shellmode'),
      tabs: document.querySelectorAll('#shell-main .wh-tabs button').length,
      keys: Object.keys(w).length,
      noBook: !('narrative' in w) && !('ink' in w) && !('discord' in w),
      worldId: p.worldId, name: p.name
    };
  });
  T(c3.mode && c3.tabs === 10 && c3.keys >= 22 && c3.noBook && c3.worldId === 'wuxia' && c3.name.length >= 2,
    'C3 入世即武侠主壳（wuxiamode ⇔ 十页签 ⇔ 存档 ≥22 键（通用 lastSave/log/eventHistory 落位；盘上经紧凑化空值键可摘）且 narrative/ink/discord 摘除见证 ⇔ worldId 落档）',
    'mode=' + c3.mode + ' tabs=' + c3.tabs + ' keys=' + c3.keys + ' noBook=' + c3.noBook);

  /* C4 · 主页状态卡真渲染：境界名「不入流」+ 修习槽空态 + 境界进度条 */
  const c4 = await page.evaluate(() => {
    const body = document.getElementById('shell-main').textContent;
    return {
      realm: /不入流/.test(body),
      slotEmpty: /修习槽/.test(body),
      bar: !!document.querySelector('#shell-main .wh-bar'),
      wip: /此路尚未开辟/.test(body)
    };
  });
  T(c4.realm && c4.slotEmpty && c4.bar, 'C4 主页状态卡（境界名上屏 ⇔ 修习槽空态 ⇔ 进度条在位）',
    'realm=' + c4.realm + ' slot=' + c4.slotEmpty + ' bar=' + c4.bar);

  /* C5 · 重载后仍在（真档 + wuxiamode 回归） */
  await page.reload();
  await page.waitForSelector('#shell-main .wh-tabs', { timeout: 15000 });
  const c5 = await page.evaluate(() => document.getElementById('sc-main').classList.contains('shellmode'));
  T(c5, 'C5 入世真档（重载后仍进武侠主壳）', 'mode=' + c5);

  T(errs.length === 0, 'C6 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WC_ALL_GREEN ' : 'WC_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
