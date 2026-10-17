/* .tests/verify-ui-achv.cjs — 「成就」独立页走查（playwright-core + Edge headless）
 * 成就图鉴批 + 图鉴迁入批：成就自轮回页迁出为独立页——左侧菜单「成就」入口；
 * 页顶「图鉴九面卡」（收集率进度条 + 里程碑点，自轮回页迁入）+ 称号墙 + 六组成就卡网格；
 * 未解锁遮为问号（.lock + 大「？」）、data 标 hint 的特殊成就提示达成条件（.ahint）；
 * 轮回页只留转世机制（图鉴九面 / 称号墙 / 成就入口全部迁出）。
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-achv.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 零成就态：realm 0 + 空进度 → 60 条全锁，18 条特殊成就出条件提示（确定性基线） */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-17-1' },
    meta: { unlockedWorlds: ['xiuxian'], achv: [] },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

/* data 层真值：hint 成就总数（与 DOM 的 .ahint 对账） */
function hintTotal() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const ACHV = sandbox.window.SQ.XDATA.CODEX.ACHV;
  return ACHV.filter((a) => a.hint).length;
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = await buildSave();
  const HINT_N = hintTotal();
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

  /* 菜单入口 */
  const navTexts = await page.$$eval('#m-tabbar button', (els) => els.map((e) => e.textContent.trim()));
  T(navTexts.includes('成就'), 'A1 左侧菜单含「成就」入口', navTexts.join('/'));

  await page.click('#m-tabbar button:has-text("成就")');
  await page.waitForTimeout(400);

  /* 页顶图鉴九面卡（自轮回页迁入） */
  const codex = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#tab-achv .facecard')];
    return {
      grids: document.querySelectorAll('#tab-achv .facegrid').length,
      n: cards.length,
      bars: cards.filter((c) => c.querySelector('.bar')).length,
      dots: cards.filter((c) => c.querySelector('.msdots')).length,
      names: cards.map((c) => c.querySelector('.cn').textContent.trim())
    };
  });
  T(codex.grids === 1 && codex.n === 10, 'A2 页顶图鉴九面 + 转世天赋 = 10 卡', 'grid=' + codex.grids + ' n=' + codex.n);
  T(codex.bars === 9, 'A3 九面有进度条（称号面无分母不设条）', 'bars=' + codex.bars);
  T(codex.dots === 10, 'A4 每张图鉴卡带里程碑点', 'dots=' + codex.dots);
  /* N20 接线批（第十一批）：图鉴卡里程碑两行。正典 = UI 卷 v2.26 §3.7 ——
   * ① 三档齐时 .cms 改显 codex.ui.ms.all；② 未达档时 .csub 追加 codex.ui.ms.next「下一档 {pct}%」，
   * pct = [50,80,100] 中第一个未达者；称号面（无分母）与三档齐都不出该行。
   * 判据全走 DOM 互证（点数 ⟷ 文案 ⟷ 进度条宽），不写死中文、也不写死本档实际态。 */
  const msRows = await page.evaluate(() => {
    const allTxt = window.SQ.t('codex.ui.ms.all', null, 'xiuxian');
    return [...document.querySelectorAll('#tab-achv .facecard')].map((c) => {
      const cms = c.querySelector('.cms');
      const dots = c.querySelectorAll('.msdots i.on').length;
      const bar = c.querySelector('.bar i');
      const w = bar ? parseFloat(bar.style.width) : -1;
      const sub = [...c.querySelectorAll('.csub')].map((x) => x.textContent).join(' | ');
      const m = sub.match(/(\d+)\s*%/);
      return { name: (c.querySelector('.cn') || {}).textContent || '', dots: dots, w: w,
        cms: cms ? cms.textContent.trim() : '', next: m ? Number(m[1]) : -1, hasNext: !!m, allTxt: allTxt };
    });
  });
  const withNext = msRows.filter((r) => r.hasNext);
  T(withNext.length >= 1 && msRows.length === 10,
    'A4b 里程碑「下一档」行有观测面（非空集，10 卡全在）', 'cards=' + msRows.length + ' 有下一档=' + withNext.length);
  T(withNext.every((r) => [50, 80, 100].indexOf(r.next) >= 0 && r.next > r.w),
    'A4c 下一档取值必为阈值表成员且高于当前进度（防把「差值」或当前百分比当成阈值）',
    withNext.slice(0, 3).map((r) => r.next + '%/bar' + r.w.toFixed(0) + '%').join(' '));
  T(msRows.every((r) => (r.dots === 3 ? r.cms === r.allTxt : (/[3]\s*$/.test(r.cms) && r.cms.indexOf(r.dots + '/') >= 0))),
    'A4d 三档齐 ⇒ 显 all 文案；未满 ⇒ 计数文案里的数字与点亮数一致（DOM 互证，防两行不同源）',
    msRows.map((r) => r.dots + '/' + (r.dots === 3 ? 'ALL' : r.cms.replace(/\s+/g, ''))).slice(0, 4).join(' '));
  T(withNext.every((r) => r.dots < 3) && msRows.filter((r) => r.dots === 3).every((r) => !r.hasNext),
    'A4e「下一档」只出现在未达三档的卡上（三档齐不给下一档）', 'dots3=' + msRows.filter((r) => r.dots === 3).length);


  /* 成就六组 */
  const wide = await page.evaluate(() => {
    const grids = [...document.querySelectorAll('#tab-achv .achvgrid')];
    const cards = [...document.querySelectorAll('#tab-achv .achvcard')];
    const got = cards.filter((c) => c.classList.contains('got'));
    const lock = cards.filter((c) => c.classList.contains('lock'));
    const hint = [...document.querySelectorAll('#tab-achv .ahint')];
    const secs = [...document.querySelectorAll('#tab-achv .secbar')];
    return {
      secN: secs.length,
      gridN: grids.length,
      cols: grids[0] ? getComputedStyle(grids[0]).gridTemplateColumns.split(' ').length : 0,
      total: cards.length,
      gotN: got.length,
      lockN: lock.length,
      lockNames: lock.map((c) => c.querySelector('.an').textContent.trim()),
      lockQ: lock.every((c) => !!c.querySelector('.aq')),
      lockQText: lock.length ? lock[0].querySelector('.aq').textContent.trim() : '',
      hintN: hint.length,
      hintAllLocked: hint.every((h) => h.closest('.achvcard').classList.contains('lock')),
      head: document.querySelector('#tab-achv .pagehead') ? document.querySelector('#tab-achv .pagehead').textContent : ''
    };
  });
  T(wide.gridN === 6, 'A5 成就六组网格齐全', 'grid=' + wide.gridN);
  T(wide.cols >= 2, 'A6 成就网格宽屏 ≥2 列', 'cols=' + wide.cols);
  T(wide.total === 60, 'A7 成就图鉴 60 卡全在', 'n=' + wide.total);
  T(wide.gotN + wide.lockN === 60 && wide.gotN === 0, 'A8 零成就态：60 卡全为未解锁', 'got=' + wide.gotN + ' lock=' + wide.lockN);
  T(wide.lockNames.every((s) => s === '？？？') && wide.lockQ, 'A9 未解锁成就以问号形式存在', 'name=' + wide.lockNames[0] + ' q=' + wide.lockQText);
  T(wide.hintN === HINT_N && wide.hintAllLocked, 'A10 特殊成就提示解锁条件（.ahint = ' + HINT_N + '）', 'n=' + wide.hintN);
  T(wide.head.indexOf('/60') >= 0, 'A11 页头显示总进度 N/60', wide.head.slice(0, 40));
  T(wide.secN === 7, 'A12 分节条 = 图鉴 1 + 成就六组（称号墙空态不渲染）', 'sec=' + wide.secN);

  /* 轮回页：图鉴九面 / 称号墙 / 成就入口全部迁出，只留转世机制 */
  await page.click('#m-tabbar button:has-text("轮回")');
  await page.waitForTimeout(300);
  const legacy = await page.evaluate(() => {
    const el = document.querySelector('#tab-legacy');
    return {
      codexCard: !!el.querySelector('.facecard'),
      codexGrid: !!el.querySelector('.facegrid'),
      titleWall: el.textContent.indexOf('称号墙') >= 0,
      achvPtr: !!el.querySelector('[data-act="tab"][data-v="achv"]'),
      achvWall: el.textContent.indexOf('首次秘境首通') >= 0 || el.textContent.indexOf('逆天行事') >= 0,
      shop: !!el.querySelector('.shopgrid'),
      bios: el.textContent.indexOf('前世书') >= 0
    };
  });
  T(!legacy.codexCard && !legacy.codexGrid && !legacy.titleWall && !legacy.achvPtr && !legacy.achvWall,
    'A13 轮回页图鉴 / 称号墙 / 成就入口已迁出');
  T(legacy.shop && legacy.bios, 'A14 轮回页仍留遗泽商店 + 前世书', 'shop=' + legacy.shop + ' bios=' + legacy.bios);

  /* 窄屏退单列（回成就页） */
  await page.click('#m-tabbar button:has-text("成就")');
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const g = document.querySelector('#tab-achv .achvgrid');
    const c = document.querySelector('#tab-achv .facegrid');
    return {
      cols: getComputedStyle(g).gridTemplateColumns.split(' ').length,
      ccols: getComputedStyle(c).gridTemplateColumns.split(' ').length
    };
  });
  T(narrow.cols === 1 && narrow.ccols === 1, 'A15 窄屏成就与图鉴网格退单列', 'achv=' + narrow.cols + ' codex=' + narrow.ccols);

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_ACHV_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ACHV_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
