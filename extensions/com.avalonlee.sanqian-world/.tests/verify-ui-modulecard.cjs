/* .tests/verify-ui-modulecard.cjs — 工作台卡片（module 形态）渲染走查 · 第廿七篇
 * 依赖：playwright-core + Edge；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-modulecard.cjs
 *
 * 立因（2026-10-14 结构整治批C）：`module/index.html` 此前**没有任何一篇走查覆盖**（`.tests/verify-ui-*.cjs`
 *   26 篇全部只开 `view/index.html`），而批C 恰好改在卡片的一行取数口上（洞府灵脉倍率由 `SQ.XDATA`
 *   改成 `pack.data`）——改一个零判据的文件，等于闭着眼睛改。本篇补上这张脸。
 * 判据取向：卡片只读渲染，不依赖随机判定 ⇒ 确定可复跑；重点是 **M5 屏上限率 = 引擎同一个函数现算值**
 *   （「屏上的数与引擎同源」口径，与审计 B 组/冒烟 #286 同族），以及 **M2 未入世兜底不白屏**。
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
  Object.values(s0.worlds).forEach((w) => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
    /* 故意选一个倍率非 1 的洞府（`cloud_herd` = ×1.30 一档）：若留初始洞府（×1.00），
       「屏上 = 引擎现算」会在常数上恒等 ⇒ 对本维没有鉴别力（本仓纪律：锚先证它能分辨）。 */
    w.cave = { current: 'cloud_herd', cooldownUntil: 0, owned: ['market_yard', 'cloud_herd'], fac: {} };
  });
  const url = 'file:///' + path.join(ROOT, 'module/index.html').replace(/\\/g, '/');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  /* ① 有档：五格全渲染 + 屏上限率与引擎现算同值 */
  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(s0));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForTimeout(1200);   /* 卡片首绘走 boot 模式：先 await 读档再渲染 */

  const txt = (id) => page.$eval('#' + id, (e) => e.textContent.trim());
  const world = await txt('c-world');
  const realm = await txt('c-realm');
  const caveT = await txt('c-cave-t');
  const caveM = await txt('c-cave-m');
  const qi = await txt('c-qi-t');
  const empty = await page.$eval('body', (b) => b.classList.contains('is-empty'));

  T(!empty, '有档时卡片不落入空态兜底', 'is-empty=' + empty);
  T(world.length >= 3, '身份行渲染（应用名 · 世界名）', world.slice(0, 30));
  T(/\d/.test(realm) && /%/.test(realm), '境界行带修为百分比', realm);
  T(qi.length > 0, '资源行非空', qi);
  T(caveT.length > 0, '洞府行有名字', caveT);
  T(/^×\d/.test(caveM), '灵脉倍率形如 ×N.NN（批C 改路的落点）', caveM);
  T(caveM !== '×1.00', '倍率不是常数 1（否则下一条同源判据恒等）', caveM);

  /* 同源对表：卡片上那个数必须等于引擎同一个函数用同一份档现算的值 */
  const engMult = await page.evaluate(() => {
    var st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    /* 与卡片同口径：读当前世界包，不吃世界专属全局别名 */
    var p = st.profile, ws = st.worlds[p.worldId], pack = window.SQ.Worlds[p.worldId].pack;
    var m = window.SQ.Cave.multOf(ws, pack, pack.data, window.SQ.Mods.collect(p, ws, pack, pack.data));
    return '×' + m.toFixed(2);
  });
  T(engMult === caveM, '屏上限率 = 引擎现算（同一函数同一份档）', '屏上 ' + caveM + ' ‖ 引擎 ' + engMult);

  /* ② 无档：空态兜底必须可见且零报错（历史上这里白屏过一次） */
  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push('pageerror: ' + e.message));
  await page2.goto(url);
  await page2.waitForTimeout(800);
  const empty2 = await page2.$eval('body', (b) => b.classList.contains('is-empty'));
  T(empty2, '无档时显示空态而非白屏', 'is-empty=' + empty2);
  T(errors2.length === 0, '无档路径零页面报错', errors2.join(' | ').slice(0, 160) || 'clean');

  T(errors.length === 0, '有档路径零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_MODULECARD_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_MODULECARD_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(2); });
