/* .tests/verify-ui-toastdedup.cjs — 动作提示去重 UI 走查
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-toastdedup.cjs
 *
 * 背景：法宝「祭出/收起」等动作在 mutate 时写一条系统日志，动作处理器随即弹一次 toast；
 *      而 ui.lastLogKey 基线只在每秒 tick 的 afterClaim 里推进，于是下一个 tick 又把同一条
 *      日志文本弹一次（同一词表 key ⇒ 文本完全相同）→ 用户看到「信息弹窗出现 2 次」。
 * 断言：祭出 / 收起各只弹 1 次同文 toast；日志仍入档（日志页未读红点照常亮）。
 * 场景确定性：造元婴档（realm 3，法宝页解锁）+ 持有一件后天法宝 h04（reqs realm 0），无离线/待抉择。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now0 = Date.now();
  const wid = s0.profile.worldId;
  s0.profile.createdAt = now0;
  Object.values(s0.worlds).forEach(w => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
  });
  /* 场景构造：元婴档解锁法宝页；持有一件可祭出的后天法宝；清空日志基线干扰 */
  const w0 = s0.worlds[wid];
  w0.realm = 3;
  w0.treasures = { owned: [{ id: 'h04', lv: 1, st: {} }], slots: [null, null, null], fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0 };
  w0.log = [];
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

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  /* 录 toast：观察 #toasts 新增节点（toast 3s 自清，只计新增） */
  await page.evaluate(() => {
    window.__toasts = [];
    const box = document.getElementById('toasts');
    new MutationObserver(muts => {
      muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent || '');
      }));
    }).observe(box, { childList: true });
  });
  await page.waitForTimeout(600);

  /* ① 法宝页可进入 + 祭出按钮在位 */
  await page.click('#m-tabbar button[data-v="treasure"]');
  await page.waitForTimeout(400);
  const eqBtn = '[data-act="equipTreasure"][data-v="h04"]';
  T(await page.$(eqBtn) !== null, '法宝页「祭出」按钮在位（元婴档 · 持 h04）', eqBtn);

  /* ② 祭出：观察窗覆盖一个 tick（1s）+ 余量 */
  await page.click(eqBtn);
  await page.waitForTimeout(2600);
  let ts = await page.evaluate(() => window.__toasts.slice());
  const eqName = await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    return w.worlds[w.profile.worldId].treasures.slots[0];
  });
  T(eqName === 'h04', '祭出已落档（slots[0]=h04）', 'slot=' + eqName);
  const eqHit = ts.filter(x => /祭出|已祭出/.test(x));
  T(eqHit.length === 1, '祭出仅弹 1 次提示（tick 不重复呈报）', 'n=' + eqHit.length + ' · ' + JSON.stringify(eqHit));
  const uneqBtn = '[data-act="unequipTreasure"][data-v="h04"]';
  T(await page.$(uneqBtn) !== null, '法宝栏槽位转为「收起」按钮', uneqBtn);

  /* ③ 日志仍入档 → 日志页未读红点照常亮（去重不吞日志） */
  const dotLog = await page.$$eval('#m-tabbar button[data-v="journal"] .dot', els => els.length);
  T(dotLog === 1, '日志页未读红点照常亮（日志未被吞）', 'dot=' + dotLog);

  /* ④ 收起：同样只弹 1 次 */
  await page.evaluate(() => { window.__toasts = []; });
  await page.click(uneqBtn);
  await page.waitForTimeout(2600);
  ts = await page.evaluate(() => window.__toasts.slice());
  const uneqHit = ts.filter(x => /收起|已收起/.test(x));
  T(uneqHit.length === 1, '收起仅弹 1 次提示（tick 不重复呈报）', 'n=' + uneqHit.length + ' · ' + JSON.stringify(uneqHit));
  const slotNow = await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    return w.worlds[w.profile.worldId].treasures.slots[0];
  });
  T(slotNow === null, '收起已落档（slots[0]=null）', 'slot=' + slotNow);

  /* ── 组 C（第册卅一批 · 排期 C2）：tick 里抛异常 ⇒ 必须给一次人话信号，且同一枚错只播一次 ──
   * 原先整段 `catch (e) { /* 静默 *\/ }`，渲染器每秒抛也是零信号（不是 pageerror、`assets/**` 零 console），
   * 任何门禁都照不到。造法 = 页内把 `SQ.claim` 换成必抛（tick 每秒 `await` 它，走的就是那条 catch）；
   * 文案对照走**页内取数口** `SQ.t('ui.error.render')`，不在测试里抄第二份文本。 */
  await page.evaluate(() => {
    window.__claim0 = SQ.claim;
    SQ.claim = async function () { throw new TypeError('mocked tick failure'); };
  });
  await page.waitForTimeout(3200);
  const c2a = await page.evaluate(() => {
    var key = SQ.t('ui.error.render');
    return { n: window.__toasts.filter(function (x) { return x.indexOf(key) >= 0; }).length, key: key };
  });
  T(c2a.n === 1 && c2a.key.indexOf('ui.error') < 0,
    'C2a tick 抛异常时播**一次**人话提示（3.2s 内三个 tick 只播一次，且取到的是中文句不是裸键名）',
    'n=' + c2a.n + ' · ' + c2a.key.slice(0, 24));
  await page.evaluate(() => { SQ.claim = window.__claim0; });
  await page.waitForTimeout(1600);
  const c2b = await page.evaluate(() => {
    var key = SQ.t('ui.error.render');
    return window.__toasts.filter(function (x) { return x.indexOf(key) >= 0; }).length;
  });
  T(c2b === 1, 'C2b 恢复可跑后不再补播（签名去重：同一枚错只播一次，换错才重播）', 'n=' + c2b);
  T(errors.length === 0, '零页面报错（含 C2 造的那次 tick 抛：异常被 catch 接住、不外溢成 pageerror）', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_TOASTDEDUP_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_TOASTDEDUP_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
