/* .tests/verify-ui-wuxiacreate.cjs — 武侠创角 → 入世 e2e 走查（册164 · 翻牌批）
 * 走完整的「起名 → 择武侠 → 取诨号 → 入定 → 书形态主界面」链路——与 wuxiamain 篇（种子档直进）
 * 互补：那篇判「书形态长什么样」，本篇判「第一笔怎么落」（诨号三候选 + 自拟 + profile.hao 落档）。
 * 判据一律回读页内真值；localStorage 无种子（从创角屏冷启）。
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
  await page.waitForSelector('#sc-c1:not(.hide)', { timeout: 15000 });

  /* 起名 → 择界（武侠卡现在 live、可点） */
  await page.fill('#c1-name', '陈青W');
  await page.click('#c1-next');
  await page.waitForSelector('#sc-c3:not(.hide)', { timeout: 8000 });
  /* C0 · 择界卡面（册167）：武侠卡「武侠江湖」只在主行出现一次（副行只放标签）；修仙卡副行仍带界系名；
   * 点「先睹」开预览但**不改变选中态**（止泡见证）。 */
  const c0 = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#c3-list .wcard'));
    const wx = cards.find((c) => /武侠江湖/.test(c.textContent));
    const xx = cards.find((c) => /玄幻修仙/.test(c.textContent));
    return {
      wxMain: wx ? wx.querySelector('.wname').textContent : '',
      wxSubDup: wx ? /武侠江湖/.test(wx.querySelector('.wtags').textContent) : true,
      xxSub: xx ? xx.querySelector('.wtags').textContent : '',
      selBefore: cards.filter((c) => c.classList.contains('sel')).length
    };
  });
  await page.click('#c3-list .wcard:has-text("武侠江湖") .bk-go');
  await page.waitForSelector('#bk-wrap', { timeout: 8000 });
  const c0sel = await page.evaluate(() => ({
    preview: !!document.getElementById('bk-wrap'),
    sel: Array.prototype.slice.call(document.querySelectorAll('#c3-list .wcard')).filter((c) => c.classList.contains('sel')).length
  }));
  await page.click('#bk-close');
  await page.waitForTimeout(200);
  T(!c0.wxSubDup && c0.wxMain === '武侠江湖' && /玄幻修仙/.test(c0.xxSub) && c0.selBefore === 0 &&
    c0sel.preview && c0sel.sel === 0,
    'C0 择界卡面（武侠卡界系名只出现一次 ⇔ 修仙卡副行带界系名不变 ⇔ 点先睹开预览不改选中态）',
    '主行=' + c0.wxMain + ' 副行重复=' + c0.wxSubDup + ' 修仙副行=' + c0.xxSub.slice(0, 12) +
    ' 先睹=' + c0sel.preview + ' 选中数=' + c0sel.sel);

  /* 两张 live 卡：点名武侠 */
  await page.click('#c3-list .wcard:has-text("武侠江湖")');
  await page.click('#c3-go');
  await page.waitForSelector('#sc-c2:not(.hide)', { timeout: 8000 });

  /* C1 · 诨号屏：标题「取个诨号」+ 三候选钮 + 自拟输入框 + 步骤条随世界取词 */
  const c1 = await page.evaluate(() => ({
    title: document.getElementById('c2-title').textContent,
    cands: document.querySelectorAll('#c2-cards .bk-opt').length,
    free: !!document.getElementById('c2-haofree'),
    reroll: document.getElementById('c2-reroll').textContent,
    steps: document.getElementById('c2-steps').textContent
  }));
  T(/诨号/.test(c1.title) && c1.cands === 3 && c1.free && /换一批/.test(c1.reroll) &&
    /取诨号/.test(c1.steps) && !/观天赋/.test(c1.steps),
    'C1 诨号屏（三候选 + 自拟 + 换一批 ⇔ 步骤条第三步「取诨号」随世界取词；天赋/初心不进书世界）',
    'title=' + c1.title + ' cands=' + c1.cands + ' steps=' + c1.steps);

  /* C2 · 选一枚候选 → 确认入世 → 书形态主界面，页眉带诨号 */
  await page.click('#c2-cards .bk-opt');
  await page.click('#c2-confirm');
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });
  const c2 = await page.evaluate(() => ({
    mode: document.getElementById('sc-main').classList.contains('bookmode'),
    hint: document.getElementById('bkr-hint').textContent,
    name: (JSON.parse(localStorage.getItem('sanqian-state-v1')).profile || {}).name
  }));
  T(c2.mode && c2.hint.length > 0 && c2.name === '陈青W',
    'C2 入世即书（创角直进书形态 ⇔ 页眉带名/诨号 ⇔ profile.name 落档）',
    'mode=' + c2.mode + ' hint=' + c2.hint + ' name=' + c2.name);

  /* C3 · profile.hao 落档 = 所选候选之一 */
  const c3 = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('sanqian-state-v1')).profile || {};
    return { hao: p.hao || '', worldId: p.worldId };
  });
  T(c3.hao.length > 0 && c3.worldId === 'wuxia',
    'C3 诨号真落档（profile.hao 非空且随武侠档）', 'hao=' + c3.hao + ' world=' + c3.worldId);

  /* C4 · 入世后书能读能翻：跳过落纸 → 翻页 → 章头第 2 章 */
  await page.click('#bkr-paper');
  await page.waitForTimeout(300);
  await page.waitForSelector('#bkr-next', { timeout: 5000 });
  await page.click('#bkr-next');
  await page.waitForTimeout(400);
  const c4 = await page.evaluate(() => document.getElementById('bkr-chap').textContent);
  T(/第2章/.test(c4), 'C4 入世即能读能翻（跳过 → 翻页 → 第 2 章）', 'chap=' + c4.slice(0, 16));

  T(errs.length === 0, 'C5 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WC_ALL_GREEN ' : 'WC_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
