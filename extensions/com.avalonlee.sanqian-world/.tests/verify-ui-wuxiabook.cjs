/* .tests/verify-ui-wuxiabook.cjs — 武侠「先睹」书界面走查（第册一百五十九批 2026-11-01 · S1-e；
 *   册161 补 W4b/W4c 两判 = 批注真扣账与墨尽回绝）
 * 判据一律回读页内真值，不硬编码正文文案。
 * 边界（如实登记）：预览会话用 initialState（realm 0）⇒ 首章通常无桥段分岔（need 未达），
 *   分岔 UI 的呈现由冒烟 E10（数据）/E11（骨架）背书；有分岔形态的走查判等转 live 后补。
 * 判六（不落档）是本件立身之本：`coming` 语义一字不改，预览绝不能悄悄建档。
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
  await page.waitForSelector('#sc-c3:not(.hide)', { timeout: 15000 });   /* 册168：首屏即择界 */

  /* W1 · 流程入口（册168）：选中武侠卡 → 钮文换「翻看此书」→ 下一步进书（卡上先睹钮已退役） */
  await page.click('#c3-list .wcard:has-text("侠影江湖")');
  await page.waitForTimeout(120);
  const w1 = await page.evaluate(() => ({
    go: document.getElementById('c3-go').textContent,
    bkGo: document.querySelectorAll('#c3-list .bk-go').length
  }));
  T(/翻看此书/.test(w1.go) && w1.bkGo === 0, 'W1 流程入口（选中书世界 → 钮文「翻看此书」⇔ 卡上先睹钮已退役）',
    'go=' + w1.go + ' 卡上钮=' + w1.bkGo);

  /* W2 · 进书 → 书浮层出现，章头正确 */
  await page.click('#c3-go');
  await page.waitForSelector('#bk-wrap', { timeout: 5000 });
  const w2 = await page.evaluate(() => ({
    chap: document.getElementById('bk-chap').textContent,
    hint: document.querySelector('.bk-hint').textContent
  }));
  T(/第1章/.test(w2.chap) && w2.hint.length > 0, 'W2 书浮层出现（章头「第1章 · 地界」+ 先睹提示）',
    'chap=' + w2.chap + ' hint=' + w2.hint);

  /* W3 · 点纸面跳过打字 → 正文行全部落纸且非空 */
  await page.click('#bk-paper');
  await page.waitForTimeout(300);
  const w3 = await page.evaluate(() => {
    const ls = Array.prototype.slice.call(document.querySelectorAll('#bk-paper .bk-line'));
    return { n: ls.length, empty: ls.filter((p) => !p.textContent.trim()).length,
      first: ls.length ? ls[0].textContent.slice(0, 18) : '' };
  });
  T(w3.n >= 4 && w3.empty === 0 && w3.first.length > 0, 'W3 跳过后正文整章落纸（≥4 句、零空行）',
    'lines=' + w3.n + ' empty=' + w3.empty + ' first=' + w3.first);

  /* W4 · 纸上无机器：全章无裸键名 */
  const w4 = await page.evaluate(() => {
    const txt = document.getElementById('bk-paper').textContent +
      (document.getElementById('bk-fork').classList.contains('hide') ? '' : document.getElementById('bk-fork').textContent);
    return { bad: /\{[a-zA-Z]|tpl\.|pool\.|event\.|scene\./.test(txt), len: txt.length };
  });
  T(!w4.bad && w4.len > 100, 'W4 纸上无机器（无 {占位} 残留、无 tpl./pool./event./scene. 裸键名）',
    'len=' + w4.len);

  /* W4b · 创角模式章末（册168）：先睹读毕出「称呼之问」而非批注行——批注属真档书（wuxiamain M4 承接） */
  const w4b = await page.evaluate(() => ({
    ask: document.getElementById('bk-fork').textContent,
    notes: document.getElementById('bk-notes') ? document.getElementById('bk-notes').classList.contains('hide') : true
  }));
  T(/江湖称呼/.test(w4b.ask) && w4b.notes, 'W4b 创角模式章末出称呼之问（批注行不进创角先睹——批注属真档书）',
    'ask=' + w4b.ask.slice(0, 18) + ' notesHidden=' + w4b.notes);

  /* W5 · 合上 → 浮层移除 */
  await page.click('#bk-close');
  await page.waitForTimeout(200);
  const w5 = await page.evaluate(() => ({ gone: !document.getElementById('bk-wrap') }));
  const w5b = await page.evaluate(() => ({ backAtC3: !document.getElementById('sc-c3').classList.contains('hide') }));
  T(w5.gone && w5b.backAtC3, 'W5 合上即收（浮层自 DOM 摘除 ⇔ 创角模式合上 = 回择界）', 'gone=' + w5.gone + ' backAtC3=' + w5b.backAtC3);

  /* W6 · 预览不落档（本件立身之本）：冷启 + 预览全程，localStorage 不产生存档 */
  const w6 = await page.evaluate(() => ({
    saved: !!localStorage.getItem('sanqian-state-v1'),
    keys: Object.keys(localStorage).length
  }));
  T(!w6.saved, 'W6 预览不落档（册168 口径：选择不落档、确认才落档——创角先睹全程无存档）',
    'saved=' + w6.saved + ' keys=' + w6.keys);

  T(errs.length === 0, 'W7 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WB_ALL_GREEN ' : 'WB_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
