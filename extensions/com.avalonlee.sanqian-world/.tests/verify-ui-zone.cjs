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
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-21-1' },
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
    const cz = document.querySelector('#tab-combat .curzone');
    const rows = document.querySelectorAll('#tab-combat .zlist .zrow');
    const grids = Array.prototype.slice.call(document.querySelectorAll('#tab-combat .cavegrid'));
    const solo = document.querySelector('#tab-combat .cavegrid.solo');
    const nameEl = cz ? cz.querySelector('.cz-name') : null;
    return {
      hasCz: !!cz,
      czName: nameEl ? nameEl.textContent.trim() : '',
      czProg: !!document.querySelector('#tab-combat .curzone .cz-prog .bar'),
      czKv: document.querySelectorAll('#tab-combat .curzone .cz-kv').length,
      bossBtn: !!document.querySelector('#tab-combat .curzone [data-act="challengeBoss"]'),
      shardBtn: !!document.querySelector('#tab-combat .curzone [data-act="exchangeShard"]'),
      rows: rows.length,
      secs: document.querySelectorAll('#tab-combat .zlist .sect').length,
      rowsClick: document.querySelectorAll('#tab-combat .zlist .zrow[data-act="setZone"]').length,
      lockedRows: document.querySelectorAll('#tab-combat .zlist .zrow.locked').length,
      total: (cz ? 1 : 0) + rows.length,
      /* B16-d：洞天节 = 段标 + 状态条 + 四组分段 + 当前驻留设施行 */
      caveSec: !!document.querySelector('#tab-combat #cave-sec'),
      strip: !!document.querySelector('#tab-combat #cave-sec .statestrip'),
      groups: document.querySelectorAll('#tab-combat #cave-sec .subhead').length,
      caveCards: document.querySelectorAll('#tab-combat #cave-sec .cavecard').length,
      soloCur: solo ? solo.querySelectorAll(':scope > .cavecard.cur').length : 0,
      caveEnterBtns: document.querySelectorAll('#tab-combat #cave-sec [data-act="caveEnter"]').length,
      facRows: document.querySelectorAll('#tab-combat #cave-sec .faclist .lrow').length
    };
  });

  /* B15-d 改口：秘境页从「卡片网格 + 通栏 hero 卡」改为设计稿「山影 curzone 块 + 行式清单」。
   * R1~R8 随之重写——守的东西不变（10 处都在 / 当前秘境有身元 / 域主与残片入口在位 /
   * 已首通另起一段 / 非当前可点进 / 窄屏不破宽），只是载体从卡片换成 hero + 行。 */
  T(wide.hasCz && wide.czName.length > 0, 'R1 当前秘境 = curzone hero（名字在位）', wide.czName);
  T(wide.total === 10, 'R2 十处秘境全在（hero 1 + 清单 9）', 'total=' + wide.total);
  T(wide.czProg, 'R3 hero 内含首通进度条');
  T(wide.czKv === 3, 'R4 hero 三行身元（域主 / 词缀 / 洞天）', 'n=' + wide.czKv);
  T(wide.bossBtn && wide.shardBtn, 'R5 hero 内含域主挑战 + 残片兑换入口', 'boss=' + wide.bossBtn + ' shard=' + wide.shardBtn);
  T(wide.secs === 2, 'R6 清单两段（可入 / 已首通）', 'sect=' + wide.secs);
  T(wide.rowsClick === 5, 'R7 非当前已解锁行均可点进（data-act=setZone）', 'n=' + wide.rowsClick);
  T(wide.lockedRows > 0, 'R7b 未解锁行仍以灰行占位（？？？）', 'n=' + wide.lockedRows);

  /* R7c / R7d（第册一百二十批 · 孤儿键接线批）：两枚从未上屏的真文案各归其位——
   *   hero 那行补「累计产出」（`ui.total`，兄弟 `ui.kills` 早在屏），瓶颈行补一句出路（`combat.bottleneck.hint`）。
   * 取词一律走词表（不写死中文），数值只验「有数字跟着」不验等值——秒级 tick 会让存档里的产出继续走。
   * R7d 是正负配平：本 fixture 恰有一行成瓶颈（realm 5 战力 4,972 < z5 门槛 7,200；z6~z9 未解锁不出一句建议），
   *   所以「建议句出现的格数」必须等于「瓶颈格数」，多出来就是挂错行。 */
  const bnCells = await page.evaluate(() => {
    const S = (k, v) => SQ.t(k, v, 'xiuxian');
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    const w = (st.worlds || {}).xiuxian || {};
    return {
      hero: ((document.querySelector('#tab-combat .curzone .cz-meta') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      lab: S('ui.total', { n: '' }).replace(/\s+/g, ' ').trim(),
      nInSave: SQ.fmt(w.total || 0),
      cells: Array.prototype.slice.call(document.querySelectorAll('#tab-combat .zlist .zrow .z-r .p'))
        .map((x) => (x.textContent || '').replace(/\s+/g, ' ').trim()),
      bn: S('combat.bottleneck'), hint: S('combat.bottleneck.hint')
    };
  });
  T(bnCells.hero.indexOf(bnCells.lab) >= 0 && new RegExp(bnCells.lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\d').test(bnCells.hero),
    'R7c hero 行「累计产出」上屏（ui.total 接线：词表取词 + 后面跟真数）', 'hero="' + bnCells.hero + '" 存档=' + bnCells.nInSave);
  const bnHit = bnCells.cells.filter((x) => x.indexOf(bnCells.bn) >= 0);
  T(bnHit.length >= 1 && bnHit.every((x) => x.indexOf(bnCells.hint) >= 0) &&
    bnCells.cells.filter((x) => x.indexOf(bnCells.hint) >= 0).length === bnHit.length,
    'R7d 瓶颈行带出建议句、非瓶颈与未解锁行不带（正负配平）',
    '瓶颈格=' + bnHit.length + ' 建议格=' + bnCells.cells.filter((x) => x.indexOf(bnCells.hint) >= 0).length + ' 例=' + (bnHit[0] || ''));
  /* B16-d 改口：洞天节从「单张通栏 hero + 一列 13 卡」改成设计稿「状态条 + 四组分段
     （当前驻留 / 已拥有未驻留 / 可入驻 / 未解锁）+ 当前驻留设施行」。守的东西照旧：
     十三处一张不少、当前驻留独占一行、入驻按钮在位、设施可营建。 */
  T(wide.caveSec && wide.strip && wide.groups >= 2,
    'R9 洞天节 = 段标 + 状态条 + 分组（.statestrip / .subhead 在位）', 'strip=' + wide.strip + ' groups=' + wide.groups);
  T(wide.caveCards === 13, 'R10 十三处福地全在（分组只是分维，不删卡）', 'n=' + wide.caveCards);
  T(wide.soloCur === 1, 'R11 当前驻留福地独占一行（.cavegrid.solo > .cavecard.cur）', 'n=' + wide.soloCur);
  T(wide.caveEnterBtns > 0, 'R12 福地卡含入驻/迁居按钮', 'n=' + wide.caveEnterBtns);
  T(wide.facRows === 4, 'R12b 当前驻留设施四行（灵田/丹房/藏书阁/聚灵阵）', 'n=' + wide.facRows);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-combat .zlist .zrow'));
    const cz = document.querySelector('#tab-combat .curzone');
    /* B16-d：多卡组才量列数（solo 组恒单列，量它没有意义） */
    const cg = document.querySelector('#tab-combat .cavegrid:not(.solo)');
    const over = rows.some((r) => r.scrollWidth > r.clientWidth + 1);
    /* 山影水印 .cz-ink 刻意 right:-6 探出（overflow:hidden 裁掉），不算内容溢出 */
    const kids = cz ? Array.prototype.slice.call(cz.children).filter((x) => !x.classList.contains('cz-ink')) : [];
    const cr = cz ? cz.getBoundingClientRect() : null;
    const czOver = !cz || kids.some((k) => k.getBoundingClientRect().right > cr.right + 0.5);
    return {
      czOver: czOver,
      rowOver: over,
      docOver: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      caveCols: cg ? getComputedStyle(cg).gridTemplateColumns.split(' ').length : 1
    };
  });
  T(!narrow.czOver && !narrow.rowOver && !narrow.docOver, 'R8 窄屏：hero 与行式清单均无横向溢出', JSON.stringify(narrow));
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
      document.querySelectorAll('#tab-combat .curzone [data-act="exchangeShard"]'));
    return { cs: bs.map((b) => b.getAttribute('data-c')).filter(Boolean),
      labels: bs.map((b) => b.textContent.trim()) };
  });
  T(four.cs.join(',') === 'fac,intel,recipe,bp', 'R14 z6~8 档四选按钮齐（fac/intel/recipe/bp 顺）',
    'cs=' + four.cs.join('|') + ' labels=' + four.labels.join('/'));
  await page.click('#tab-combat .curzone [data-act="exchangeShard"][data-c="bp"]');
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