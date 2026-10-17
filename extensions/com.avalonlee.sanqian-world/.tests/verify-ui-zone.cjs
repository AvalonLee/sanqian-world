/* .tests/verify-ui-zone.cjs — 「秘境洞天」页卡片网格走查（playwright-core + Edge headless）
 * 信息密度批：秘境由「纵向列表」改为「卡片网格」——每秘境一卡、宽屏多列窄屏单列，
 * 当前秘境为通栏 hero（内层天时/域主 + 进度/残片双栏），已首通分组保留分隔线。
 * 合并批：洞天福地内联本页——同构卡片网格（每处福地一卡）+ 当前驻留置顶通栏 hero。
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-zone.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态，再摆成富态：解锁 0~5、首通 0~2、当前 z3（域主现世 + 残片满）
 * ov（第二批建场用，N9 四选走查）：Object.assign 直改 ws，另备 alchemy 容器初置 */
async function buildSave(ov) {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.realm = 5; ws.stones = 5000; ws.qi = 100; ws.total = 100;
  ws.zone = 3; ws.cleared = [0, 1, 2];
  ws.prog = { 3: 60 };
  ws.shards = [0, 0, 0, 20, 0, 0, 0, 0, 0, 0];
  ws.zoneBoss = { zone: 3, state: 'ready', retryAt: 0 };
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  SQ.Alchemy.ensure(ws, SQ.XDATA);
  if (ov) Object.assign(ws, ov);
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-17-2' },
    meta: { unlockedWorlds: ['xiuxian'] },
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
  await page.click('#m-tabbar button:has-text("秘境")');
  await page.waitForTimeout(400);

  const wide = await page.evaluate(() => {
    const grid = document.querySelector('#tab-combat .zonegrid');
    const hero = document.querySelector('#tab-combat .zcard.hero');
    const sep = document.querySelector('#tab-combat .zonegrid > .zsep');
    const cg = document.querySelector('#tab-combat .cavegrid');
    const ch = document.querySelector('#tab-combat .cavegrid > .cavecard.hero');
    return {
      hasGrid: !!grid,
      cols: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0,
      cards: document.querySelectorAll('#tab-combat .zonegrid > .zcard').length,
      heroN: document.querySelectorAll('#tab-combat .zcard.hero').length,
      heroSpan: hero ? getComputedStyle(hero).gridColumn : '',
      heroCols: hero ? getComputedStyle(hero.querySelector('.zhero')).gridTemplateColumns.split(' ').length : 0,
      bossBtn: !!document.querySelector('#tab-combat .zcard.hero [data-act="challengeBoss"]'),
      shardBtn: !!document.querySelector('#tab-combat .zcard.hero [data-act="exchangeShard"]'),
      sep: !!sep,
      enterBtns: document.querySelectorAll('#tab-combat .zonegrid > .zcard .zfoot [data-act="setZone"]').length,
      /* 合并批：洞天福地内联本页，同构卡片网格 + 当前驻留置顶 hero */
      caveSec: !!document.querySelector('#tab-combat #cave-sec'),
      caveCols: cg ? getComputedStyle(cg).gridTemplateColumns.split(' ').length : 0,
      caveCards: document.querySelectorAll('#tab-combat .cavegrid > .cavecard').length,
      caveHeroN: document.querySelectorAll('#tab-combat .cavegrid > .cavecard.hero').length,
      caveHeroSpan: ch ? getComputedStyle(ch).gridColumn : '',
      caveFirstHero: !!(cg && cg.firstElementChild && cg.firstElementChild.classList.contains('hero')),
      caveEnterBtns: document.querySelectorAll('#tab-combat .cavegrid > .cavecard [data-act="caveEnter"]').length
    };
  });

  T(wide.hasGrid && wide.cols >= 2, 'R1 秘境页为卡片网格（宽屏 ≥2 列）', 'cols=' + wide.cols);
  T(wide.cards === 10, 'R2 每秘境一卡（10 卡全在）', 'n=' + wide.cards);
  T(wide.heroN === 1 && wide.heroSpan === '1 / -1', 'R3 当前秘境 = 通栏 hero', wide.heroSpan);
  T(wide.heroCols === 2, 'R4 hero 内层双栏（天时/域主 | 进度/残片）', 'cols=' + wide.heroCols);
  T(wide.bossBtn && wide.shardBtn, 'R5 hero 内含域主挑战 + 残片兑换入口', 'boss=' + wide.bossBtn + ' shard=' + wide.shardBtn);
  T(wide.sep, 'R6 已首通分组分隔线保留');
  T(wide.enterBtns === 5, 'R7 非当前已解锁卡均有「切换到此」', 'n=' + wide.enterBtns);
  T(wide.caveSec && wide.caveCols >= 2, 'R9 洞天福地并入本页且为卡片网格（宽屏 ≥2 列）', 'cols=' + wide.caveCols);
  T(wide.caveCards >= 6, 'R10 福地每处一卡（≥6 卡）', 'n=' + wide.caveCards);
  T(wide.caveHeroN === 1 && wide.caveHeroSpan === '1 / -1' && wide.caveFirstHero, 'R11 当前驻留福地 = 置顶通栏 hero', wide.caveHeroSpan + '/first=' + wide.caveFirstHero);
  T(wide.caveEnterBtns > 0, 'R12 福地卡含入驻/迁居按钮', 'n=' + wide.caveEnterBtns);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const grid = document.querySelector('#tab-combat .zonegrid');
    const hero = document.querySelector('#tab-combat .zcard.hero');
    const cg = document.querySelector('#tab-combat .cavegrid');
    return {
      cols: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      heroCols: getComputedStyle(hero.querySelector('.zhero')).gridTemplateColumns.split(' ').length,
      caveCols: getComputedStyle(cg).gridTemplateColumns.split(' ').length
    };
  });
  T(narrow.cols === 1 && narrow.heroCols === 1, 'R8 窄屏退单列（秘境网格 + hero 内层同退）', 'cols=' + narrow.cols + ' hero=' + narrow.heroCols);
  T(narrow.caveCols === 1, 'R13 窄屏洞天网格同退单列', 'cols=' + narrow.caveCols);

  /* ── N9 四选走查（2026-10-07 收口批）：z6~8 档四按钮齐 + 点「普通/精制图纸」真入档 ──
   * 二次建场 = 再注册一条 addInitScript（init script 按注册序逐次导航都跑，后注册者覆盖同键 ⇒
   * reload 后拿到第二批存档；只写一次 localStorage 会被前一条冲掉，见 verify-ui-bonds 头部教训） */
  await page.setViewportSize({ width: 1440, height: 950 });
  const saveZ6 = await buildSave({
    realm: 7, zone: 6, cleared: [0, 1, 2, 3, 4, 5], prog: { 6: 30 },
    shards: [0, 0, 0, 0, 0, 0, 20, 0, 0, 0], zoneBoss: null, cave: null
  });
  await ctx.addInitScript((p) => { localStorage.setItem(p.k, p.s); }, { k: 'sanqian-state-v1', s: JSON.stringify(saveZ6) });
  await page.reload();
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.click('#m-tabbar button:has-text("秘境")');
  await page.waitForTimeout(400);
  const four = await page.evaluate(() => {
    const bs = Array.prototype.slice.call(
      document.querySelectorAll('#tab-combat .zcard.hero [data-act="exchangeShard"]'));
    return { cs: bs.map((b) => b.getAttribute('data-c')).filter(Boolean),
      labels: bs.map((b) => b.textContent.trim()) };
  });
  T(four.cs.join(',') === 'fac,intel,recipe,bp', 'R14 z6~8 档四选按钮齐（fac/intel/recipe/bp 顺）',
    'cs=' + four.cs.join('|') + ' labels=' + four.labels.join('/'));
  await page.click('#tab-combat .zcard.hero [data-act="exchangeShard"][data-c="bp"]');
  await page.waitForTimeout(900);
  const got = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    const w = (st.worlds || {}).xiuxian || {};
    const al = w.alchemy || {};
    return { bp: al.blueprints || [], shards6: (w.shards || [])[6] || 0, furnace: !!al.furnace };
  });
  T(got.bp.length === 1 && got.shards6 === 0 && got.bp[0] !== 'bp_furnace' && !got.furnace,
    'R15 点「图纸」→ 器图纸入 blueprints[]、扣片 20、丹炉 flag 零波及',
    'bp=' + got.bp.join(',') + ' shards=' + got.shards6 + ' furnace=' + got.furnace);

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_ZONE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ZONE_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });