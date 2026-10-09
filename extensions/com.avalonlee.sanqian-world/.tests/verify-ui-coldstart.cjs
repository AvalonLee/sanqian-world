/* .tests/verify-ui-coldstart.cjs — 冷启动全流程实证（playwright-core + Edge headless）
 * 为什么需要它：此前廿二篇走查**全部从注入好的存档件起步**（`fixture-save.json`），
 *   唯一碰到创角三步的 `verify-ui-a6blindspot.cjs` 只验到「不选界就报错」这条失败分支为止，
 *   **从未有一次执行真的走完 起名 → 择界 → 观天赋 → 入定 → 主界面 → 首帧 → 刷新仍在**。
 *   也就是说「新玩家能不能开始这局游戏」这件事一直是未证实面——而它是「用户可正常完整游玩」的第一分钟。
 * 本篇补的就是这条从零到一的正经链路（含一条玩家安全属性：未开放世界不可投生，点了不会进空世界）。
 * 纪律（本仓已付代价）：页内 evaluate 里不存在 Node 闭包变量；状态一律读 `localStorage['sanqian-state-v1']`
 *   （动作都经 `SQ.mutate` 落盘，这个读法顺带证明真落了盘）；不靠真实时间等日锚，心跳只断言 `lastSave` 前进。
 * 用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-coldstart.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

const KEY = 'sanqian-state-v1';

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')'));
  };
  const readState = async (page) => page.evaluate((k) => {
    try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; }
  }, KEY);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  /* ── A 相：从零开始 ── */
  await page.goto(url);
  await page.waitForSelector('#sc-c1:not(.hide)', { timeout: 15000 });
  const cs1 = await page.evaluate(() => ({
    c1: !document.getElementById('sc-c1').classList.contains('hide'),
    main: !document.getElementById('sc-main').classList.contains('hide'),
    hasKey: !!localStorage.getItem('sanqian-state-v1')
  }));
  T(cs1.c1 && !cs1.main, 'CS1 无档冷启落创角屏（不落主界面、不白屏）', JSON.stringify(cs1));

  /* 坏名不得放行 */
  await page.click('#c1-next');
  await page.waitForTimeout(250);
  const cs2 = await page.evaluate(() => ({
    errHidden: document.getElementById('c1-err').classList.contains('hide'),
    txt: document.getElementById('c1-err').textContent,
    stillC1: !document.getElementById('sc-c1').classList.contains('hide'),
    want: window.SQ.t('creation.name.invalid')
  }));
  T(!cs2.errHidden && cs2.txt === cs2.want && cs2.stillC1,
    'CS2 空名点「下一步」被拦（中文报错 + 停在起名屏，不带着坏名往下走）', JSON.stringify(cs2.txt));

  await page.fill('#c1-name', '冷启验证');
  await page.click('#c1-next');
  await page.waitForSelector('#sc-c3:not(.hide)', { timeout: 8000 });
  const cs3 = await page.evaluate(() => ({
    c3: !document.getElementById('sc-c3').classList.contains('hide'),
    cards: document.querySelectorAll('#c3-list .wcard').length,
    coming: document.querySelectorAll('#c3-list .wcard.coming').length,
    live: document.querySelectorAll('#c3-list .wcard:not(.coming)').length
  }));
  T(cs3.c3 && cs3.live >= 1, 'CS3 起名后进「择界」，且至少一个已开放世界可选', JSON.stringify(cs3));
  T(cs3.coming === cs3.cards - cs3.live && cs3.coming >= 1,
    'CS4 未开放世界整卡标 coming（不伪装成可玩入口）', 'coming=' + cs3.coming + ' / 共 ' + cs3.cards);

  /* 玩家安全属性：点未开放世界不会产生选中态，随后点投生只得到报错 */
  await page.click('#c3-list .wcard.coming');
  await page.waitForTimeout(200);
  const cs5 = await page.evaluate(() => ({
    sel: document.querySelectorAll('#c3-list .wcard.sel').length
  }));
  T(cs5.sel === 0, 'CS5 点未开放世界不产生选中态（点了不会进空世界）', 'sel=' + cs5.sel);
  await page.click('#c3-go');
  await page.waitForTimeout(250);
  const cs6 = await page.evaluate(() => ({
    hidden: document.getElementById('c3-err').classList.contains('hide'),
    txt: document.getElementById('c3-err').textContent,
    c2: !document.getElementById('sc-c2').classList.contains('hide')
  }));
  T(!cs6.hidden && !cs6.c2, 'CS6 只点过未开放世界时投生仍被拦（报「未择界」而非进下一屏）',
    JSON.stringify(cs6.txt));

  await page.click('#c3-list .wcard:not(.coming)');
  await page.waitForTimeout(200);
  await page.click('#c3-go');
  await page.waitForSelector('#sc-c2:not(.hide)', { timeout: 8000 });
  const cs7 = await page.evaluate(() => ({
    n: document.querySelectorAll('#c2-cards .tcard').length,
    combo: document.getElementById('c2-combo').textContent,
    cjk: /[\u4e00-\u9fff]/.test(document.getElementById('c2-cards').textContent)
  }));
  T(cs7.n >= 1 && cs7.cjk, 'CS7 进「观天赋」且真抽出卡片（中文文案，非裸键名）', JSON.stringify(cs7));

  await page.click('#c2-reroll');
  await page.waitForTimeout(300);
  const cs8 = await page.evaluate(() => ({
    n: document.querySelectorAll('#c2-cards .tcard').length,
    txt: document.getElementById('c2-cards').textContent
  }));
  T(cs8.n >= 1 && cs8.txt.length > 0, 'CS8 重抽后仍是完整一组天赋卡（重抽不打空卡槽）', 'n=' + cs8.n);

  await page.click('#c2-confirm');
  await page.waitForTimeout(300);
  const cs9 = await page.evaluate(() => ({
    lockVisible: !document.getElementById('modal-lock').classList.contains('hide'),
    sum: document.getElementById('mk-sumlabel').textContent
  }));
  T(cs9.lockVisible && cs9.sum.length > 0, 'CS9 入定前弹锁定确认摘要（不可跳过的一步）', JSON.stringify(cs9.sum));

  await page.click('#mk-ok');
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 10000 });
  await page.waitForTimeout(700);
  const cs10 = await page.evaluate(() => ({
    main: !document.getElementById('sc-main').classList.contains('hide'),
    creationHidden: ['sc-c1', 'sc-c2', 'sc-c3'].every((id) => document.getElementById(id).classList.contains('hide')),
    bodyLen: (document.querySelector('.tabbody') || {}).textContent ? document.querySelector('.tabbody').textContent.length : 0,
    bodyCjk: /[\u4e00-\u9fff]/.test((document.querySelector('.tabbody') || {}).textContent || '')
  }));
  T(cs10.main && cs10.creationHidden, 'CS10 锁定后天入主界面，创角三屏全部退场', JSON.stringify(cs10.main));
  T(cs10.bodyLen > 50 && cs10.bodyCjk, 'CS11 首帧内容有内容（非白屏、非占位）', 'len=' + cs10.bodyLen);

  const st1 = await readState(page);
  const w1 = st1 && st1.worlds && st1.worlds.xiuxian ? st1.worlds.xiuxian : null;
  T(!!st1 && !!st1.profile && st1.profile.name === '冷启验证' && st1.profile.worldId === 'xiuxian',
    'CS12 投生即落盘：profile 名字与所选世界写进 localStorage（不是只在内存里）',
    st1 && st1.profile ? st1.profile.name + '/' + st1.profile.worldId : 'null');
  T(!!w1 && w1.realm === 0 && typeof w1.qi === 'number',
    'CS13 新世界初始态齐（realm 0 起、修为字段为数）', w1 ? 'realm=' + w1.realm + ' qi=' + w1.qi : 'null');

  /* 导航门槛：起点页可点、未达界门槛的页置灰且点不动 */
  const cs14 = await page.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const btns = Array.prototype.slice.call(bar.querySelectorAll('button'));
    const locked = btns.filter((b) => b.classList.contains('locked'));
    const unlocked = btns.filter((b) => !b.classList.contains('locked'));
    const beforeOn = btns.findIndex((b) => b.classList.contains('on'));
    if (locked.length) locked[0].click();
    return {
      total: btns.length, locked: locked.length, unlocked: unlocked.length,
      beforeOn, afterOn: btns.findIndex((b) => b.classList.contains('on')),
      lockedText: locked.length ? locked[0].textContent : ''
    };
  });
  T(cs14.unlocked >= 3 && cs14.locked >= 1,
    'CS14 起点导航 = 部分页可用 + 未达境界的页置灰（炼气不是一上来全亮）',
    'unlocked=' + cs14.unlocked + ' locked=' + cs14.locked);
  T(cs14.beforeOn === cs14.afterOn && /[？?]/.test(cs14.lockedText),
    'CS15 点置灰导航页不切页（锁是硬的，不是只改样式）', 'on ' + cs14.beforeOn + '→' + cs14.afterOn + ' 文本=' + cs14.lockedText);

  /* 心跳：真挂机循环在跑（lastSave 前进），并记下修为增量供人看 */
  const t0 = Date.now();
  let grew = null;
  for (let i = 0; i < 24 && !grew; i++) {
    await page.waitForTimeout(500);
    const st = await readState(page);
    const w = st && st.worlds && st.worlds.xiuxian;
    if (w && w1 && (w.lastSave > w1.lastSave || w.qi > w1.qi || w.total > w1.total)) {
      grew = { ms: Date.now() - t0, lastSave: w.lastSave - (w1.lastSave || 0), qi: w.qi - w1.qi, total: w.total - w1.total };
    }
  }
  T(!!grew, 'CS16 首 tick 真动（存盘心跳或修为前进；挂机循环不是摆设）', grew ? JSON.stringify(grew) : '12s 内无变化');

  /* 刷新 = 读档闭环：不得回到创角，也不得丢身份 */
  await page.reload();
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(600);
  const st2 = await readState(page);
  const cs17 = await page.evaluate(() => ({
    main: !document.getElementById('sc-main').classList.contains('hide'),
    c1: !document.getElementById('sc-c1').classList.contains('hide'),
    title: (document.getElementById('m-name') || {}).textContent || ''
  }));
  T(cs17.main && !cs17.c1, 'CS17 刷新后直接回主界面（读档认得这局，不落创角 = 可继续玩）', JSON.stringify(cs17));
  T(!!st2 && !!st2.profile && st2.profile.name === '冷启验证' &&
    !!st2.worlds && !!st2.worlds.xiuxian && typeof st2.worlds.xiuxian.qi === 'number',
    'CS18 刷新后身份与进度都在（名字一致、世界状态未被 normalize 剪掉）',
    st2 && st2.profile ? st2.profile.name + ' qi=' + st2.worlds.xiuxian.qi : 'null');

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_COLDSTART_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_COLDSTART_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
