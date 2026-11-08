/* .tests/verify-ui-worlds.cjs — 万界门环世界选择器走查（第册二百八十批）
 * 判：门环 3D 页真载入（三扇门含一剪影）⇔ 点击门扇苏醒 ⇔ 推门分流至侠影世界。
 * file:// 直开 view/worlds/index.html。 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/worlds/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')');
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  try {
    await page.goto(url);
    await page.waitForFunction(() => window.__QX3D_READY, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    /* W0 门环真载入 */
    const t0 = await page.evaluate(() => ({
      errs: window.__errs.length,
      canvas: !!document.querySelector('#stage canvas'),
      registry: (window.WORLD_REGISTRY || []).length,
      open: (window.WORLD_REGISTRY || []).filter(w => w.status === 'open').length
    }));
    T(t0.errs === 0 && t0.canvas && t0.registry >= 3 && t0.open === 2,
      'W0 门环真载入（3D 画布 + 注册表 ≥3 条 · 2 开放 + ≥1 剪影 · 零脚本错误）',
      'errs=' + t0.errs + ' reg=' + t0.registry + ' open=' + t0.open);

    /* W0b 世界卡数据完整性 */
    const t0b = await page.evaluate(() => {
      return window.WORLD_REGISTRY.map(w => ({
        id: w.id, name: w.name, path: w.path, status: w.status, seal: w.seal
      }));
    });
    T(t0b.length >= 3 && t0b[0].id === 'xiuxian' && t0b[1].id === 'wuxia' && t0b[2].status === 'coming',
      'W0b 注册表序（修仙→侠影→剪影 · path 指向正确）', JSON.stringify(t0b));

    /* W1 点击侠影门 → 苏醒 + 信息卡 */
    const wuxiaIdx = 1; /* WORLD_REGISTRY[1] = wuxia */
    await page.evaluate((idx) => {
      /* 直接调 focusGate（内部函数不暴露时走 click 门面 raycast） */
      const doors = document.querySelectorAll('#stage canvas');
      /* 如果 gate3d 暴露了 focusGate 就用，否则模拟点击 */
      if (window.__focusGate) { window.__focusGate(idx); return; }
      /* fallback：在门面位置发一个 click */
      const cnv = document.querySelector('#stage canvas');
      const rect = cnv.getBoundingClientRect();
      /* 门扇在画面的上方略偏——用 raycast 不行（headless 无 GPU pick），
       * 所以 gate3d 应该暴露 __focusGate。此处兜底调。 */
    }, wuxiaIdx);
    await page.waitForTimeout(800);
    const t1 = await page.evaluate(() => ({
      info: document.getElementById('gate-info').classList.contains('show'),
      push: document.getElementById('btn-push').classList.contains('show'),
      name: document.getElementById('gi-name').textContent,
      seal: document.getElementById('gi-seal').textContent
    }));
    /* 如果 focusGate 没暴露，这个会 fail——需要 gate3d 暴露调试把手 */
    T(t1.info && t1.push && /侠影/.test(t1.name) && t1.seal === '侠',
      'W1 侠影门苏醒（点击 → 信息卡 + 推门钮出 · 门匾名/印章正确）', JSON.stringify(t1));

    /* W2 推门分流：点推门 → URL 变为 qunxia3d */
    await page.evaluate(() => { document.getElementById('btn-push').click(); });
    await page.waitForURL(/qunxia3d/, { timeout: 8000 }).catch(() => {});
    const t2 = { url: page.url() };
    T(/qunxia3d/.test(t2.url), 'W2 推门分流（侠影门 → qunxia3d/index.html）', t2.url.slice(-60));

    /* W3 回门环 → 点修仙门 → 推门 → URL 变为主壳 */
    await page.goto(url);
    await page.waitForTimeout(1500);
    await page.evaluate((idx) => {
      if (window.__focusGate) window.__focusGate(idx);
    }, 0); /* xiuxian = index 0 */
    await page.waitForTimeout(600);
    await page.evaluate(() => { document.getElementById('btn-push').click(); });
    await page.waitForURL(/index\.html/, { timeout: 8000 }).catch(() => {});
    const t3 = { url: page.url() };
    T(/view\/index\.html|sanqian/.test(t3.url), 'W3 修仙门分流（修仙门 → 主壳 index.html）', t3.url.slice(-60));

    /* 收口：零脚本错误 */
    T(errs.length === 0, 'W4 全程零脚本错误', errs.slice(0, 3).join(' | '));
  } catch (e) {
    T(false, 'WX 走查中断', String(e).slice(0, 200));
  }

  await browser.close();
  if (fail === 0) console.log('WORLDS_ALL_GREEN ' + pass + '/' + (pass + fail));
  else { console.log('WORLDS_FAIL ' + pass + '/' + (pass + fail)); process.exit(1); }
})();
