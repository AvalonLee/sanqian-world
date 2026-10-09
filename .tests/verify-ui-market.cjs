/* .tests/verify-ui-market.cjs — 卡片化批四处页面 UI 走查（playwright-core + Edge headless）
 * 诉求：① 坊市/黑市物品改卡片网格、每次刷新 10 件随机；② 势力页「门中供给」改卡片；
 *       ③ 炼丹炼器页信息改卡片；④ 同代天骄每代上限 30、榜面只展前 10 详情、每 10 游戏年刷榜。
 * 断言：宽屏多列 / 窄屏单列 / 数量对表 / 前 10 详情截断 / 刷榜节律文案。
 * 依赖：playwright-core；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-market.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态，再摆成富态：高境界解锁四页 + 已入势力（声望满）+ 丹房齐备 + 30 天骄 */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const D = SQ.XDATA;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.realm = 6; ws.zone = 0; ws.qi = 100; ws.total = 100; ws.stones = 9999999;
  ws.karmaEventScore = -300; ws.karma = -300;       /* 黑市开启门槛：karma ≤ -200（karma 由分量重算，需写事件分） */
  /* 已入势力：声望满 → rank 4，四档供给全解锁 */
  var fid = (ws.factions && ws.factions[0] && ws.factions[0].id) || 'huangfeng';
  ws.factionId = fid;
  ws.factionRep = {}; ws.factionRep[fid] = 2000;
  ws.factionSupply = {};
  /* 丹房齐备：丹炉 + 两份丹方 + 两份图纸 + 若干材料 */
  SQ.Alchemy.ensure(ws, D);
  ws.alchemy.furnace = true;
  ws.alchemy.recipes = ['rc_juqi', 'rc_zhaocai'];
  ws.alchemy.blueprints = ['bp_weapon', 'bp_treasure'];
  ws.materials = { mat_jiaotu: 12, mat_linglu: 8 };
  /* 30 位同代天骄（全 rlm 0 → 玩家稳居榜首，榜面应为前 10 详情） */
  ws.prodigies = [];
  for (var i = 0; i < D.PRODIGY.COUNT_MAX; i++) {
    ws.prodigies.push({
      id: 'pr' + (i + 1), nm: [0, i % 6, 0], tl: [], al: 1, fc: -1, fid: null,
      apt: 0, rlm: 0, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0,
      boost: null, eternal: false, wl: [0, 0, 0]
    });
  }
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
    meta: { unlockedWorlds: ['xiuxian'], unlocks: { prodigySlot: true } },
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
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(800);

  const colsOf = (sel) => page.$eval(sel, (el) => getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);

  /* ── ① 坊市/黑市：卡片网格 + 每次 10 件 ── */
  await page.click('#m-tabbar button[data-v="shop"]');
  await page.waitForTimeout(400);
  const shopWide = await page.evaluate(() => {
    const g = document.querySelector('#tab-shop .shopgrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      cards: document.querySelectorAll('#tab-shop .shopcard').length,
      blackBtn: !!document.querySelector('#tab-shop [data-act="shopTab"][data-v="1"]')
    };
  });
  T(shopWide.hasGrid && shopWide.cols >= 2, 'M1 坊市为卡片网格（宽屏 ≥2 列）', 'cols=' + shopWide.cols);
  T(shopWide.cards === 10, 'M2 坊市一次刷新 10 件随机物品', 'n=' + shopWide.cards);
  T(shopWide.blackBtn, 'M3 黑市入口可见（karma ≤ −200）');
  await page.click('#tab-shop [data-act="shopTab"][data-v="1"]');
  await page.waitForTimeout(300);
  const blackCards = await page.$$eval('#tab-shop .shopcard', (els) => els.length);
  T(blackCards === 10, 'M4 黑市同样一次 10 件', 'n=' + blackCards);

  /* ── ② 势力页：门中供给改卡片 ── */
  await page.click('#m-tabbar button[data-v="faction"]');
  await page.waitForTimeout(400);
  const facWide = await page.evaluate(() => {
    const g = document.querySelector('#tab-faction .cardgrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      cards: document.querySelectorAll('#tab-faction .cardgrid > .faccard.carditem').length,
      supplyTitle: !!document.querySelector('#tab-faction .cardgrid')
    };
  });
  T(facWide.hasGrid && facWide.cols >= 2, 'M5 门中供给为卡片网格（宽屏 ≥2 列）', 'cols=' + facWide.cols);
  T(facWide.cards === 4, 'M6 门中供给四档各一卡', 'n=' + facWide.cards);

  /* ── ③ 炼丹炼器页：信息改卡片 ── */
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await page.waitForTimeout(400);
  const alWide = await page.evaluate(() => {
    const grids = Array.from(document.querySelectorAll('#tab-alchemy .cardgrid'));
    return {
      n: grids.length,
      cols: grids.length ? getComputedStyle(grids[0]).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      items: document.querySelectorAll('#tab-alchemy .cardgrid > .carditem').length
    };
  });
  T(alWide.n >= 3 && alWide.cols >= 2, 'M7 炼丹炼器信息为卡片网格（≥3 段 · 宽屏 ≥2 列）', 'grids=' + alWide.n + ' cols=' + alWide.cols);
  T(alWide.items >= 6, 'M8 丹方/图纸/材料均以卡片呈现', 'items=' + alWide.items);

  /* ── ④ 同代天骄：前 10 详情 + 每 10 游戏年刷榜 ── */
  await page.click('#m-tabbar button[data-v="prodigy"]');
  await page.waitForTimeout(400);
  const pd = await page.evaluate(() => {
    const rows = document.querySelectorAll('#tab-prodigy .lrow');
    return { rows: rows.length, txt: document.querySelector('#tab-prodigy').textContent };
  });
  T(pd.rows === 10, 'M9 榜面只展前 10 位详情（名录 30）', 'rows=' + pd.rows);
  T(pd.txt.indexOf('10 游戏年') >= 0, 'M10 榜面标注每 10 游戏年一刷', pd.txt.slice(0, 0) || 'ok');
  T(pd.txt.indexOf('位列第') >= 0, 'M11 显示玩家榜位');

  /* ── 窄屏退单列 ── */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.click('#m-tabbar button[data-v="shop"]');
  await page.waitForTimeout(300);
  const shopNarrow = await colsOf('#tab-shop .shopgrid');
  await page.click('#m-tabbar button[data-v="faction"]');
  await page.waitForTimeout(300);
  const facNarrow = await colsOf('#tab-faction .cardgrid');
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await page.waitForTimeout(300);
  const alNarrow = await colsOf('#tab-alchemy .cardgrid');
  T(shopNarrow === 1, 'M12 窄屏坊市退单列', 'cols=' + shopNarrow);
  T(facNarrow === 1, 'M13 窄屏门中供给退单列', 'cols=' + facNarrow);
  T(alNarrow === 1, 'M14 窄屏炼丹炼器退单列', 'cols=' + alNarrow);

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 200) || 'clean');

  console.log(fail === 0 ? 'UI_MARKET_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_MARKET_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(2); });
