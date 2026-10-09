/* .tests/verify-ui-offline.cjs — 出关呈报 UI 走查（离线所得批）
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-offline.cjs
 *
 * 场景（以 lastSave 后退 dtMs 模拟真实离线，让引擎自己结算，不注入数字）：
 *   A 闭关 6h  → 首帧弹「出关呈报」：数据网格四格（修为/灵石/时长/渡劫）+ 数字，散文正文 #mo-body 已移除；
 *   B 历练 6h  → 副标题切换「离线历练所得」，数字同源；
 *   C 离线 2min（≤5min 未结算，存档残留旧 lastOffline）→ 不弹层；修行页常驻面板照旧渲染。
 * 断言：四格数字与存档 lastOffline 经 SQ.fmt 的结果逐字对齐（验证数据接线，非硬编码）；
 *      时长走 ui.time.hm 口径；渡劫格 n>0 时附「成 s · 败 f」子行。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');

  /* stale=true：模拟 ≤5min 未结算——存档里只残留上一段旧 lastOffline（at 远早于本次 lastSave） */
  const buildSave = (mode, dtMs, stale) => {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
    const now = Date.now();
    s.profile.createdAt = now;
    Object.values(s.worlds).forEach(w => {
      w.lastSave = now - dtMs; w.pendingChoice = null; w.mode = mode;
      w.lastOffline = stale
        ? { at: now - 3600000, secs: 3600, qi: 999, stones: 99, trib: { n: 1, s: 1, f: 0 }, mode: mode }
        : null;
    });
    return s;
  };

  const readLo = (page) => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId];
    const lo = w.lastOffline || {};
    const secs = lo.secs || 0, lh = Math.floor(secs / 3600), lm = Math.floor((secs % 3600) / 60);
    return {
      qi: SQ.fmt(lo.qi || 0), stones: SQ.fmt(lo.stones || 0), secs: secs,
      dur: lh > 0 ? lh + '时' + lm + '分' : Math.max(1, lm) + '分钟',
      n: (lo.trib && lo.trib.n) || 0, s: (lo.trib && lo.trib.s) || 0, f: (lo.trib && lo.trib.f) || 0
    };
  });

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };

  const openPage = async (save) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(save));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
    return { ctx, page, errors };
  };

  /* ── 场景 A：闭关 6h（真实结算 → 弹层）── */
  {
    const { ctx, page, errors } = await openPage(buildSave('seclude', 6 * 3600 * 1000, false));
    await page.waitForSelector('#modal-offline:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(300);

    T(true, '离线 6h：首帧弹出出关呈报', 'visible');
    T((await page.$eval('#mo-title', el => el.textContent.trim())) === '出关呈报', '标题「出关呈报」', '');
    T((await page.$eval('#mo-sub', el => el.textContent.trim())) === '离线所得', '副标题闭关口径「离线所得」', '');
    T((await page.$('#mo-body')) === null, '散文正文 #mo-body 已移除', 'gone');

    const tiles = await page.$$eval('#mo-stats .o', els => els.length);
    const bigs = await page.$$eval('#mo-stats .ov', els => els.length);
    T(tiles === 4 && bigs === 4, '数据网格四格且每格含大数字位', 'tiles=' + tiles + ' ov=' + bigs);

    const stats = await page.$eval('#mo-stats', el => el.textContent.replace(/\s+/g, ' ').trim());
    const lo = await readLo(page);
    T(stats.indexOf('修为') >= 0 && stats.indexOf('+' + lo.qi) >= 0, '修为格 = 存档值经 SQ.fmt（+' + lo.qi + '）', stats.slice(0, 44));
    T(stats.indexOf('灵石') >= 0 && stats.indexOf('+' + lo.stones) >= 0, '灵石格 = 存档值经 SQ.fmt（+' + lo.stones + '）', '');
    T(stats.indexOf('离线时长') >= 0 && stats.indexOf(lo.dur) >= 0, '时长格走 ui.time.hm（' + lo.dur + '）', '');
    T(stats.indexOf('渡劫') >= 0 && stats.indexOf(lo.n + '次') >= 0, '渡劫格显示 ' + lo.n + ' 次', '');
    T(lo.n === 0 || stats.indexOf('成 ' + lo.s + ' · 败 ' + lo.f) >= 0, '渡劫格成/败拆解（成 ' + lo.s + ' · 败 ' + lo.f + '）', '');

    T(errors.length === 0, '零页面报错（闭关口径）', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ── 场景 B：历练 6h → 副标题切换 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave('venture', 6 * 3600 * 1000, false));
    await page.waitForSelector('#modal-offline:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(300);

    T((await page.$eval('#mo-sub', el => el.textContent.trim())) === '离线历练所得', '副标题历练口径「离线历练所得」', '');
    const stats = await page.$eval('#mo-stats', el => el.textContent.replace(/\s+/g, ' ').trim());
    const lo = await readLo(page);
    T(stats.indexOf('+' + lo.qi) >= 0 && stats.indexOf('+' + lo.stones) >= 0, '历练口径数字同源', '');
    T(errors.length === 0, '零页面报错（历练口径）', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ── 场景 C：离线 2min（≤5min 未结算，残留旧 lastOffline）→ 不弹层 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave('seclude', 2 * 60 * 1000, true));
    await page.waitForSelector('#tab-idle', { timeout: 15000 });
    await page.waitForTimeout(1600);   /* 跨过一个 tick，确认不会迟到弹出 */

    const hidden = await page.$eval('#modal-offline', el => el.classList.contains('hide'));
    T(hidden, '离线 ≤5min：出关呈报不弹出', 'hidden=' + hidden);
    T((await page.$('.offbox')) !== null, '修行页常驻面板照旧渲染（未误伤）', '');
    T(errors.length === 0, '零页面报错（≤5min 口径）', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  await browser.close();
  console.log(fail === 0 ? 'UI_OFFLINE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_OFFLINE_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
