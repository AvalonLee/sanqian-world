/* .tests/verify-ui-cavedot.cjs — 地 chip 红点（新福地解锁）UI 走查
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-cavedot.cjs
 *
 * 场景：已入势力 + 足额灵石 + 零声望 → 势力页捐献 100 万 → rep 300 → 职级 2
 *      → 隐世福地「水镜山庄」（obtain factionRank 2）在 claim 内被 grantObtain 授予所有权
 *      → 福地资格签名增长 → 地 chip 红点亮；点地 chip 进洞天节 → 消账。
 * 该路径不依赖渡劫/战斗的随机判定，故确定性可复跑。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now0 = Date.now();
  s0.profile.createdAt = now0;
  Object.values(s0.worlds).forEach(w => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
    /* 场景构造：已入势力（首处）+ 足额灵石 + 清空声望/捐献窗口 + 仅初始福地已持有 */
    w.factionId = (w.factions && w.factions[0] && w.factions[0].id) || 'huangfeng';
    w.factionRep = {};
    w.factionDonate = { at: now0, used: 0 };
    w.stones = 500000;
    w.cave = { current: 'market_yard', cooldownUntil: 0, owned: ['market_yard'], fac: {} };
  });
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(s0));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };
  const dotN = () => page.$$eval('#m-rail [data-act="openCave"] .pdot', els => els.length);

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(600);

  /* ① 基线：地 chip 存在、初始无红点（快照对齐当前签名，不误报） */
  const chipTxt = await page.$eval('[data-act="openCave"]', el => el.textContent.trim());
  T(chipTxt.indexOf('地') === 0, '地 chip 渲染（四柱之一）', chipTxt.slice(0, 12));
  const dot0 = await dotN();
  T(dot0 === 0, '基线：地 chip 无红点（快照对齐不误报）', 'dot=' + dot0);

  /* ② 触发解锁：势力页捐献 100 万 → rep 300 → 职级 2 → 水镜山庄解锁 */
  await page.click('#m-tabbar button:has-text("势力")');
  await page.waitForTimeout(300);
  const donBtn = '[data-act="facDonate"][data-v="1000000"]';
  T(await page.$(donBtn) !== null, '势力页 100 万捐献档存在', donBtn);
  await page.click(donBtn);
  await page.waitForTimeout(250);
  await page.click('#cf-ok');
  await page.waitForTimeout(1800);   /* 等一个 claim tick：grantObtain 授予 → 签名增长 */

  /* ③ 回修行页：地 chip 红点亮 */
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(400);
  const dotAfter = await dotN();
  T(dotAfter === 1, '新福地解锁后地 chip 红点亮', 'dot=' + dotAfter);

  /* ④ 点地 chip → 跳秘境洞天页（洞天节），红点消账 */
  await page.click('[data-act="openCave"]');
  await page.waitForTimeout(500);
  const onCombat = await page.evaluate(() => { const p = document.querySelector('#tab-combat'); return !!p && !p.classList.contains('hide'); });
  T(onCombat, '点地 chip → 跳秘境洞天页', 'combat=' + onCombat);

  /* ⑤ 回修行页：红点已消（进洞天节即视为已读） */
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(400);
  const dotCleared = await dotN();
  T(dotCleared === 0, '进洞天节后红点消账', 'dot=' + dotCleared);

  T(errors.length === 0, '零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_CAVEDOT_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_CAVEDOT_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
