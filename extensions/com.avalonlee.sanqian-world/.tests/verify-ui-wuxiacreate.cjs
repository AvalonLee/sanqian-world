/* .tests/verify-ui-wuxiacreate.cjs — 武侠创角 e2e 走查（册164 立；册168 随流程重排整篇改口）
 * 新流程 = 一择界（首屏）→ 二先睹（书内读第一章，不落档）→ 章末取诨号（三候选 + 自拟）
 *   → 落笔入世 → 书形态主界面**从第二章开卷**（先睹即序章，不重读）。
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

  /* C0 · 首屏即择界：武侠卡界系名只出现一次 + 卡上无「先睹」钮（退役）+ 选中后钮文换「翻看此书」 */
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

  /* 选中武侠 → 钮文换「翻看此书」、步骤条第三步换「取诨号」预告 */
  await page.click('#c3-list .wcard:has-text("侠影江湖")');
  await page.waitForTimeout(120);
  const c0b = await page.evaluate(() => ({
    go: document.getElementById('c3-go').textContent,
    steps: document.getElementById('c3-steps').textContent
  }));
  T(/翻看此书/.test(c0b.go) && /取诨号/.test(c0b.steps),
    'C0b 选中书世界（钮文「翻看此书」⇔ 步骤条预告「取诨号」）',
    'go=' + c0b.go + ' steps=' + c0b.steps);

  /* C1 · 进书（流程第二步）：章头第一章 + 跳过落纸 */
  await page.click('#c3-go');
  await page.waitForSelector('#bk-wrap', { timeout: 8000 });
  await page.click('#bk-paper');
  await page.waitForTimeout(300);
  const c1 = await page.evaluate(() => ({
    chap: document.getElementById('bk-chap').textContent,
    lines: document.querySelectorAll('#bk-paper .bk-line').length
  }));
  T(/第1章/.test(c1.chap) && c1.lines >= 4, 'C1 先睹即第二步（书浮层第一章 ⇔ 跳过落纸）',
    'chap=' + c1.chap + ' lines=' + c1.lines);

  /* C2 · 章末取诨号面板：称呼之问 + 三候选 + 自拟 + 落笔入世 */
  await page.waitForSelector('#bk-fork .bk-opt', { timeout: 5000 });
  const c2 = await page.evaluate(() => ({
    ask: document.getElementById('bk-fork').textContent,
    cands: document.querySelectorAll('#bk-fork .bk-opt').length,
    free: !!document.getElementById('bk-haofree'),
    enter: document.getElementById('bk-enter') ? document.getElementById('bk-enter').textContent : ''
  }));
  T(/江湖称呼/.test(c2.ask) && c2.cands === 4 && c2.free && /落笔入世/.test(c2.enter),
    'C2 书内取诨号（称呼之问 ⇔ 三候选 + 自拟 + 落笔入世——正典「第一笔落笔」内嵌版）',
    'ask=' + c2.ask.slice(0, 20) + ' cands=' + c2.cands + ' enter=' + c2.enter);

  /* C3 · 落笔入世 → 书形态主界面**从第二章开卷** + profile.name/hao 同源落档 */
  await page.click('#c2-cards .bk-opt').catch(() => {});
  await page.click('#bk-fork .bk-opt');
  await page.click('#bk-enter');
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });
  const c3 = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('sanqian-state-v1')).profile || {};
    const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
    return {
      mode: document.getElementById('sc-main').classList.contains('bookmode'),
      chap: document.getElementById('bkr-chap').textContent,
      name: p.name, hao: p.hao, chapNo: w.narrative.chapNo
    };
  });
  T(c3.mode && /第2章/.test(c3.chap) && c3.chapNo === 2 && c3.name.length > 0 && c3.name === c3.hao,
    'C3 落笔入世即第二章（开卷不重读 ⇔ 诨号即真名（name===hao）⇔ narrative.chapNo=2）',
    'mode=' + c3.mode + ' chap=' + c3.chap.slice(0, 16) + ' name=' + c3.name + ' chapNo=' + c3.chapNo);

  /* C4 · 重载后仍在（真档） */
  await page.reload();
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });
  const c4 = await page.evaluate(() => document.getElementById('bkr-chap').textContent);
  T(/第2章/.test(c4), 'C4 入世真档（重载后仍从第二章开卷）', 'chap=' + c4.slice(0, 16));

  T(errs.length === 0, 'C5 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WC_ALL_GREEN ' : 'WC_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
