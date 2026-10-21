/* .tests/verify-ui-achvdot.cjs — 成就页红点（新成就达成）UI 走查
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-achvdot.cjs
 *
 * 场景：筑基档（realm 1，势力页已解锁）+ 未入势力 → 势力页「加入」任一门
 *      → ws.factionId 落档 → claim 内 Legacy.sync → Codex.scan 追加 achv_rumen（+ 好感联动触发的尘缘成就）
 *      → meta.achv 签名增长 → 导航「成就」亮红点；进成就页 → 消账。
 * 不依赖渡劫 / 战斗 / 奇遇的随机判定，故确定性可复跑。
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
    /* 场景构造：筑基档（势力页已解锁）、未入势力、无叛离冷却、meta.achv 清空 */
    w.factionId = '';
    w.factionCdUntil = 0;
    w.stones = 500000;
  });
  s0.meta.achv = [];
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
  const ACHV = '#m-tabbar button[data-v="achv"]';
  const dotN = () => page.$$eval(ACHV + ' .dot', els => els.length);

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(600);

  /* ① 基线：成就入口存在、初始无红点（进场已达成者视为已读，不误报） */
  T(await page.$(ACHV) !== null, '导航「成就」入口渲染', ACHV);
  const dot0 = await dotN();
  T(dot0 === 0, '基线：成就入口无红点（进场基线对齐不误报）', 'dot=' + dot0);

  /* ② 触发新成就：势力页「加入」任一门（→ ws.factionId 落档 → achv_rumen 达成） */
  await page.click('#m-tabbar button[data-v="faction"]');
  await page.waitForTimeout(300);
  /* B16-ac：加入钮在势力详情里（目录行先点开） */
  await page.click('#tab-faction .faccard[data-act="facDetail"]');
  await page.waitForTimeout(300);
  const joinBtn = '[data-act="joinFaction"]:not([disabled])';
  T(await page.$(joinBtn) !== null, '势力详情「加入」按钮可用（未入势力 · 无冷却）', joinBtn);
  await page.click(joinBtn);
  await page.waitForTimeout(250);
  await page.click('#cf-ok');
  await page.waitForTimeout(1800);   /* 等一个 claim tick：Codex.scan 追加成就 → 签名增长 */

  /* ③ 成就入口红点亮 */
  const dotAfter = await dotN();
  T(dotAfter === 1, '新成就达成后「成就」入口红点亮', 'dot=' + dotAfter);

  /* ④ 进成就页 → 红点消账 */
  await page.click(ACHV);
  await page.waitForTimeout(400);
  const onAchv = await page.evaluate(() => { const p = document.querySelector('#tab-achv'); return !!p && !p.classList.contains('hide'); });
  T(onAchv, '点「成就」→ 进入成就页', 'achv=' + onAchv);
  const dotCleared = await dotN();
  T(dotCleared === 0, '进成就页后红点消账', 'dot=' + dotCleared);

  /* ⑤ 离页再回：红点不复活（快照已同步，非「每次重渲都亮」） */
  await page.click('#m-tabbar button[data-v="idle"]');
  await page.waitForTimeout(400);
  const dotStable = await dotN();
  T(dotStable === 0, '离开成就页后红点不复活', 'dot=' + dotStable);

  T(errors.length === 0, '零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_ACHVDOT_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ACHVDOT_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
