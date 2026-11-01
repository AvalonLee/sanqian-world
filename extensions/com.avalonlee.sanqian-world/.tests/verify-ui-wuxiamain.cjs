/* .tests/verify-ui-wuxiamain.cjs — 武侠书形态主界面走查（册163 · S3-c）
 * 与「先睹」预览篇（verify-ui-wuxiabook）互为反面：预览判「**不落档**」（W6），本篇判「**真落档**」——
 * 批注 / 翻页 / 修习全部写进真存档，**重载后仍在**（书形态的立身之本：读的就是命途本身）。
 * 进场方式 = 预置一份 wuxia 活跃档（addInitScript 种 localStorage），不经创角（创角入口等翻牌批）。
 * 判据一律回读页内真值；种子档在 Node 侧用沙箱真实事务生成（不走手写 JSON）。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');
const { load } = require('./sandbox.cjs');

const KEY = 'sanqian-state-v1';

/* 种子档：沙箱真实事务生成（wuxia 活跃档，预置一枚修习中的武学与一段见闻） */
function seedSave() {
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  return SQ.mutate({}, (s) => {
    s.profile = { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: Date.now() };
    s.worlds.wuxia = SQ.Worlds.wuxia.pack.normalize(SQ.Worlds.wuxia.pack.initialState());
    const w = s.worlds.wuxia;
    w.visited = ['luoyang', 'shaolin', 'dali'];
    w.artsSlots = ['neigong_basic'];
  }).then(() => sandbox.window.localStorage.getItem(KEY));
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const seed = await seedSave();
  if (!seed) { console.log('FAIL M0 种子档生成失败'); process.exit(1); }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  /* 只在缺档时种：reload 后 localStorage 已有（可能已被真档动作改写的）存档 ⇒ 不得覆盖——
   * 本篇判的就是「真落档 survives reload」，种子若每次重灌就把判据自己拆了 */
  await ctx.addInitScript((v) => { try { if (!localStorage.getItem('sanqian-state-v1')) localStorage.setItem('sanqian-state-v1', v); } catch (e) {} }, seed);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(url);
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });

  /* M1 · 书形态主壳：#sc-main 挂 bookmode，九页导航与面板全收 */
  const m1 = await page.evaluate(() => ({
    mode: document.getElementById('sc-main').classList.contains('bookmode'),
    bookShown: !document.getElementById('book-main').classList.contains('hide'),
    navHidden: getComputedStyle(document.getElementById('m-nav')).display === 'none',
    bodyHidden: getComputedStyle(document.querySelector('.tabbody')).display === 'none'
  }));
  T(m1.mode && m1.bookShown && m1.navHidden && m1.bodyHidden,
    'M1 书形态主壳（sc-main.bookmode ⇔ 书容器现、顶栏/导航/页签体全收）',
    'mode=' + m1.mode + ' book=' + m1.bookShown + ' nav=' + m1.navHidden + ' tabbody=' + m1.bodyHidden);

  /* M2 · 章头与状态行：第1章 · 地界名；页脚有境界名与墨/违和细字 */
  const m2 = await page.evaluate(() => ({
    chap: document.getElementById('bkr-chap').textContent,
    status: document.getElementById('bkr-status').textContent
  }));
  T(/第1章/.test(m2.chap) && /洛阳/.test(m2.chap) && /不入流/.test(m2.status) && /墨 2/.test(m2.status),
    'M2 章头与页脚（第1章 · 洛阳城 ⇔ 状态行带境界/墨 2/违和）',
    'chap=' + m2.chap + ' status=' + m2.status.slice(0, 40));

  /* M3 · 点纸面跳过 → 整章落纸 */
  await page.click('#bkr-paper');
  await page.waitForTimeout(300);
  const m3 = await page.evaluate(() => document.querySelectorAll('#bkr-paper .bk-line').length);
  T(m3 >= 4, 'M3 跳过落纸（≥4 句）', 'lines=' + m3);

  /* M4 · 批注真扣账 + **真落档**：点 chip → 墨 2→1；重载后墨仍是 1（与预览篇 W6 互为反面） */
  await page.waitForSelector('#bkr-notes .bk-ax', { timeout: 5000 });
  await page.click('#bkr-notes .bk-ax');
  await page.waitForTimeout(200);
  const m4a = await page.evaluate(() => document.getElementById('bkr-status').textContent);
  await page.reload();
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });
  const m4b = await page.evaluate(() => document.getElementById('bkr-status').textContent);
  T(/墨 1/.test(m4a) && /墨 1/.test(m4b),
    'M4 批注真落档（点 chip 墨 2→1 ⇔ 重载后仍是 1——与预览「不落档」互为反面）',
    'before=' + (m4a.match(/墨 \d/) || [''])[0] + ' afterReload=' + (m4b.match(/墨 \d/) || [''])[0]);

  /* M5 · 翻页真推进：点「翻页」→ 章头变 第2章；重载后仍第 2 章 */
  await page.click('#bkr-paper');
  await page.waitForTimeout(200);
  await page.waitForSelector('#bkr-next', { timeout: 5000 });
  await page.click('#bkr-next');
  await page.waitForTimeout(400);
  const m5a = await page.evaluate(() => document.getElementById('bkr-chap').textContent);
  await page.reload();
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });
  const m5b = await page.evaluate(() => document.getElementById('bkr-chap').textContent);
  T(/第2章/.test(m5a) && /第2章/.test(m5b),
    'M5 翻页真推进（advance 落档：章头 第1→2 章 ⇔ 重载后仍第 2 章）',
    'now=' + m5a.slice(0, 14) + ' afterReload=' + m5b.slice(0, 14));

  /* M6 · 附录功谱：修习槽开合真落档（停修 neigong_basic → 重载后 artsSlots 空） */
  await page.click('#bkr-paper');
  await page.waitForTimeout(200);
  await page.click('#bkr-drawer');
  await page.waitForSelector('#bkr-drawerbox', { timeout: 5000 });
  const m6a = await page.evaluate(() => ({
    gong: !!document.querySelector('#bkr-drawerbox h4'),
    cells: document.querySelectorAll('#bkr-drawerbox .bk-cell').length,
    zones: Array.prototype.slice.call(document.querySelectorAll('#bkr-drawerbox .bk-cell')).filter((c) => /✓/.test(c.textContent)).length
  }));
  const stopBtn = await page.$('#bkr-drawerbox button[data-aid="neigong_basic"]');   /* 种子档里在槽的那一部 = 停修出槽 */
  if (stopBtn) await stopBtn.click();
  await page.waitForTimeout(200);
  await page.reload();
  await page.waitForSelector('#book-main .bk-book', { timeout: 15000 });
  const m6b = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.artsSlots.length);
  T(m6a.gong && m6a.cells >= 5 && m6a.zones >= 3 && m6b === 0,
    'M6 附录真落档（功谱/舆图在位 ⇔ 停修后重载 artsSlots 空）',
    'gong=' + m6a.gong + ' cells=' + m6a.cells + ' visited=' + m6a.zones + ' slotsAfterReload=' + m6b);

  T(errs.length === 0, 'M7 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WM_ALL_GREEN ' : 'WM_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
