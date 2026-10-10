/* .tests/verify-ui-journal.cjs — 「日志」页分类栏吸顶走查（playwright-core + Edge headless）
 * 诉求：日志页顶部分类切换栏在内容下滚时钉在容器顶部，方便随时切分类。
 * 断言：sticky 生效 / 有背景遮挡 / 十一分类齐全（UI 卷 v2.20 起 七→八，新增「道友」）/ 滚到底仍钉顶且可见 / 吸顶态可切换 /
 *       负外边距不撑出横向滚动条。
 * 依赖：playwright-core；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-journal.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 满日志态：100 条跨 5 分类（各 20 条）长文本 → 必定溢出，便于验证吸顶 */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  const cats = ['event', 'trib', 'gear', 'arts', 'sys'];
  const filler = '叙事填充内容用于撑高日志行以便验证吸顶效果，本条为验证专用文本。';
  /* 100 条（各分类 20 条）：足以撑高溢出，且存档 < 45KB 压缩阈值，避免落盘压缩把日志截近 100 条 */
  ws.log = [];
  for (let i = 0; i < 100; i++) {
    ws.log.push({ ts: now - (100 - i) * 1000, cat: cats[i % cats.length], text: '验证日志 ' + (i + 1) + ' · ' + filler });
  }
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now - 86400000, worldName: '罗云州', talents: [], alignBias: 'neutral' },
    meta: { unlockedWorlds: ['xiuxian'], achv: [] },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

/* 上限场景：event / trib 各 260 条（>展示上限 200）→ 验证展示层只取最新 200 */
async function buildCapSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  ws.log = [];
  for (let i = 0; i < 260; i++) ws.log.push({ ts: now - (600 - i) * 1000, cat: 'event', text: '奇遇日志 ' + (i + 1) });
  for (let i = 0; i < 260; i++) ws.log.push({ ts: now - (300 - i) * 1000, cat: 'trib', text: '渡劫日志 ' + (i + 1) });
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now - 86400000, worldName: '罗云州', talents: [], alignBias: 'neutral' },
    meta: { unlockedWorlds: ['xiuxian'], achv: [] },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = await buildSave();
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(700);

  /* 打开日志页 */
  await page.click('#m-tabbar button:has-text("日志")');
  await page.waitForTimeout(400);

  const top = await page.evaluate(() => {
    const tb = document.querySelector('.tabbody');
    const chips = document.querySelector('#tab-journal > .chips');
    const cs = getComputedStyle(chips);
    return {
      pos: cs.position, bg: cs.backgroundColor,
      btnN: chips.querySelectorAll('button').length,
      lines: document.querySelectorAll('#tab-journal .logline').length,
      scrollable: tb.scrollHeight > tb.clientHeight + 4,
      ovf: tb.scrollWidth - tb.clientWidth
    };
  });
  /* N20 接线批（第十一批）：日志行分类前缀。正典 = `log.catted`「[{cat}] {text}」，    * 此前 11 个分类标签键全在用、但行内只有时间 + 正文 ⇒「全部」态下玩家看不出某一行属于哪一类。    * J1 先取分类栏的 11 枚标签文本作**词表来源**（不写死中文），再证首行前缀命中其中之一；    * J2 证「切到某分类后不再重复前缀」（选中态已表达分类，重复是噪音）。 */   const catLabels = await page.evaluate(() => [...document.querySelectorAll('#tab-journal > .chips button')]     .map(b => b.textContent.trim()).filter(x => x !== '全部'));   T(catLabels.length === 10, 'J0 分类标签取到 10 枚（11 个按钮去掉「全部」；前缀判据的词表来源必须非空集）', 'n=' + catLabels.length);   const prefAll = await page.evaluate(() => { const l = document.querySelector('#tab-journal .logline'); return l ? l.innerText : ''; });   const mPref = (prefAll.match(/\[([^\]]+)\]/) || [])[1];   T(!!mPref && catLabels.indexOf(mPref) >= 0, 'J1「全部」态行内带 [分类] 前缀且前缀取自词表（log.catted 接线）', JSON.stringify(prefAll.slice(0, 28)) + ' 命中=' + mPref);   await page.click('#tab-journal > .chips button[data-v="sys"]');   const prefOne = await page.evaluate(() => { const l = document.querySelector('#tab-journal .logline'); return l ? l.innerText : ''; });   T(prefOne.indexOf('[') < 0, 'J2 单分类筛选下不重复前缀（选中态已表达分类）', JSON.stringify(prefOne.slice(0, 28)));   await page.click('#tab-journal > .chips button[data-v="all"]');   T(top.pos === 'sticky', 'A1 分类栏 position:sticky', top.pos);
  T(top.btnN === 11, 'A2 十一分类按钮齐全（原「八」判据随任务清单 N17 补 历练/洞府/坊市 三类过期 · 玩法闭环批 2026-10-07 刷新；UI 卷 v2.20 好感三渠道批曾记 七→八）', 'n=' + top.btnN);
  T(top.lines === 100, 'A3 日志行全量渲染 100 条', 'n=' + top.lines);
  T(top.scrollable, 'A4 内容可滚动（有纵向溢出）');
  T(top.ovf <= 1, 'A5 无横向溢出（负外边距不撑破）', 'ovf=' + top.ovf);
  T(top.bg !== 'rgba(0, 0, 0, 0)' && top.bg !== 'transparent', 'A6 分类栏有不透明背景', top.bg);

  /* 滚到最底 */
  await page.evaluate(() => { const tb = document.querySelector('.tabbody'); tb.scrollTop = tb.scrollHeight; });
  await page.waitForTimeout(250);
  const deep = await page.evaluate(() => {
    const tb = document.querySelector('.tabbody');
    const chips = document.querySelector('#tab-journal > .chips');
    const r = chips.getBoundingClientRect(), t = tb.getBoundingClientRect();
    return { scrollTop: tb.scrollTop, chipsTop: r.top, tbTop: t.top, visible: r.bottom > t.top && r.top < t.bottom };
  });
  T(deep.scrollTop > 300, 'A7 已滚到深处', 'scrollTop=' + Math.round(deep.scrollTop));
  T(Math.abs(deep.chipsTop - deep.tbTop) <= 1.5, 'A8 滚动后分类栏钉在容器顶部',
    'chips=' + deep.chipsTop.toFixed(1) + ' tb=' + deep.tbTop.toFixed(1));
  T(deep.visible, 'A9 分类栏始终可见');

  /* 吸顶态切分类：过滤生效 + 仍钉顶 */
  await page.click('#tab-journal > .chips button[data-v="sys"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { const tb = document.querySelector('.tabbody'); tb.scrollTop = tb.scrollHeight; });
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => {
    const tb = document.querySelector('.tabbody');
    const chips = document.querySelector('#tab-journal > .chips');
    const on = chips.querySelector('button.on');
    return {
      on: on ? on.textContent.trim() : '',
      lines: document.querySelectorAll('#tab-journal .logline').length,
      chipsTop: chips.getBoundingClientRect().top, tbTop: tb.getBoundingClientRect().top
    };
  });
  T(after.on === '系统' && after.lines === 20, 'A10 吸顶态可切换分类（系统 20 条）', 'on=' + after.on + ' lines=' + after.lines);
  T(Math.abs(after.chipsTop - after.tbTop) <= 1.5, 'A11 切分类后仍吸顶',
    'chips=' + after.chipsTop.toFixed(1) + ' tb=' + after.tbTop.toFixed(1));

  /* 窄屏同样吸顶 */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const tb = document.querySelector('.tabbody'); tb.scrollTop = tb.scrollHeight; });
  await page.waitForTimeout(250);
  const narrow = await page.evaluate(() => {
    const tb = document.querySelector('.tabbody');
    const chips = document.querySelector('#tab-journal > .chips');
    return {
      chipsTop: chips.getBoundingClientRect().top, tbTop: tb.getBoundingClientRect().top,
      ovf: tb.scrollWidth - tb.clientWidth
    };
  });
  T(Math.abs(narrow.chipsTop - narrow.tbTop) <= 1.5 && narrow.ovf <= 1, 'A12 窄屏仍吸顶且无横向溢出',
    'chips=' + narrow.chipsTop.toFixed(1) + ' tb=' + narrow.tbTop.toFixed(1) + ' ovf=' + narrow.ovf);

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  /* ── 展示上限（日志存档批）：每分类只渲染最新 200 条，存储留全量 ── */
  const capSave = await buildCapSave();
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx2.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, capSave);
  const page2 = await ctx2.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push(e.message));
  page2.on('console', (m) => { if (m.type() === 'error') errors2.push(m.text()); });
  await page2.goto(url);
  await page2.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page2.waitForTimeout(700);
  await page2.click('#m-tabbar button:has-text("日志")');
  await page2.waitForTimeout(400);
  /* 具体分类：event 有 260 条 → 只渲染最新 200 */
  await page2.click('#tab-journal > .chips button[data-v="event"]');
  await page2.waitForTimeout(300);
  const capCat = await page2.evaluate(() => ({
    lines: document.querySelectorAll('#tab-journal .logline').length,
    first: (document.querySelector('#tab-journal .logline') || {}).textContent || ''
  }));
  T(capCat.lines === 200, 'A13 具体分类只渲染最新 200 条', 'n=' + capCat.lines);
  /* 「全部」：各分类各取最新 200（event 260→200 / trib 260→200）合并 = 400 */
  await page2.click('#tab-journal > .chips button[data-v="all"]');
  await page2.waitForTimeout(300);
  const capAll = await page2.evaluate(() => document.querySelectorAll('#tab-journal .logline').length);
  T(capAll === 400, 'A14 「全部」按各分类 200 合并（260+260 → 400）', 'n=' + capAll);
  T(errors2.length === 0, '零页面报错（上限场景）', errors2.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_JOURNAL_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_JOURNAL_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
