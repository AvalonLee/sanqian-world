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
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-22-1' },
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

  /* ── B1 搬动作回归（第册一百四十一批 · N82/D15 阶段 B 第一刀）──────────────────────────
   * 立因：本批把 `caveEnter` / `caveBuild` 两支从内核派发器搬进 `view/zone.js`。上面那几判只照
   *   「按钮在不在、置灰几个」——**照不到「点了之后那条链走不走得通」**，而搬动作最贵的失误正是
   *   「按钮还在、点了没反应」（D14 立例那次的形状）。⇒ 另开一页真点：确认框 → 落盘 → 首次入驻轻演出。
   * 为什么另开档：本页主档是「零福地 + 5000 灵石」，进不了任何有代价的福地；这一页给
   *   8 万灵石 / 已通 z0~z5 / 驻留回初始洞府，才能把「付费入驻 + 营建」两条走完。
   * ⚠️ 本组还兼证 `c.fresh()`：`show.caveEnter` 拿的是**动作后**的新快照，写错成动作前的 `c`
   *   会在轻演出里显示旧倍率（不抛错、静态判据也看不见）。 */
  const save2 = await buildSave({ realm: 7, stones: 80000, cleared: [0, 1, 2, 3, 4, 5], shards: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
  save2.worlds.xiuxian.cave = { current: 'market_yard', cooldownUntil: 0, owned: [], fac: {} };
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx2.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save2);
  const page2 = await ctx2.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push('pageerror: ' + e.message));
  page2.on('console', (m) => { if (m.type() === 'error') errors2.push('console: ' + m.text()); });
  const poll2 = async (fn, ms) => {
    const t0 = Date.now();
    for (;;) {
      const v = await fn();
      if (v) return v;
      if (Date.now() - t0 > (ms || 6000)) return false;
      await new Promise((r) => setTimeout(r, 120));
    }
  };
  const read2 = () => page2.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}'));
  /* 点不动就返回 false，不抛：本仓 §4.60 定则 5 —— 「拿不到元素」若走成抛异常，
   * 一条失败会把整篇后续组全带走（上面 B1 组第一次反向取证就这么丢过证据）。 */
  const clickSafe = async (sel, ms) => {
    try { await page2.click(sel, { timeout: ms || 4000 }); return true; } catch (e) { return false; }
  };
  await page2.goto(url);
  await page2.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page2.click('#m-tabbar button:has-text("秘境")');
  await page2.waitForTimeout(500);

  /* V1 · 入驻确认框（只开不确认 ⇒ 盘上零副作用） */
  const st0 = await read2();
  const enterSel = '#tab-combat [data-act="caveEnter"][data-v="green_peak"]:not([disabled])';
  const hasEnter = !!(await page2.$(enterSel));
  const okEnter1 = await clickSafe(enterSel);
  const cf1 = await poll2(() => page2.$('#modal-confirm:not(.hide)'), 5000);
  const cv1 = await page2.evaluate(() => ({
    title: (document.getElementById('cf-title') || {}).textContent || '',
    body: (document.getElementById('cf-text') || {}).textContent || '',
    want: (window.SQ && SQ.t) ? SQ.t('cave.green_peak.name', null, 'xiuxian') : ''
  }));
  T(okEnter1 && hasEnter && !!cf1 && cv1.title.indexOf(cv1.want) >= 0 && cv1.body.length > 12,
    'V1 点「入驻」→ 确认框浮出且标题带福地名、正文非空（`caveEnter` 搬件后那条组文案链仍通）',
    'btn=' + hasEnter + ' 框=' + !!cf1 + ' 标题=' + JSON.stringify(cv1.title) + ' 正文长=' + cv1.body.length);
  await clickSafe('#cf-cancel');
  await poll2(() => page2.$('#modal-confirm.hide'), 4000);
  const st1 = await read2();
  T(st1.worlds.xiuxian.cave.current === st0.worlds.xiuxian.cave.current &&
    st1.worlds.xiuxian.stones === st0.worlds.xiuxian.stones,
    'V1b 取消入驻 ⇒ 驻留与灵石一字未动（先问后动）',
    'cave=' + st1.worlds.xiuxian.cave.current + ' stones=' + st1.worlds.xiuxian.stones);

  /* V2 · 真入驻 ⇒ 扣灵石 + 进 owned + 首次拥有给轻演出（`c.fresh()` 的活体证明） */
  const okEnter2 = await clickSafe(enterSel);
  const cf2 = await poll2(() => page2.$('#modal-confirm:not(.hide)'), 5000);
  const okConfirm2 = await clickSafe('#cf-ok');
  const st2 = await poll2(async () => {
    const s = await read2();
    return s.worlds.xiuxian.cave.current === 'green_peak' ? s : false;
  }, 8000);
  const stage = await page2.evaluate(() => !document.getElementById('cave-stage').classList.contains('hide'));
  T(okEnter2 && !!cf2 && okConfirm2 && !!st2 && st2.worlds.xiuxian.cave.owned.indexOf('green_peak') >= 0 &&
    st2.worlds.xiuxian.stones === st0.worlds.xiuxian.stones - 20000,
    'V2 确认入驻 ⇒ 驻留切到 green_peak、进 owned[]、扣 20000 灵石',
    '点=' + okEnter2 + '/' + okConfirm2 + ' ' + (st2 ? 'owned=' + st2.worlds.xiuxian.cave.owned.join(',') + ' stones=' + st2.worlds.xiuxian.stones : '未落盘'));
  T(stage === true, 'V2b 首次拥有 ⇒ 入驻轻演出打开（`show.caveEnter(c.fresh(), …)` 这条路真被走到）', 'stage=' + stage);

  /* V3 · 营建 ⇒ 扣灵石 + 设施等级 +1
   * ⚠️ 轻演出是**整屏遮罩**（4.2s 自动收，点任意处即关）：不先收掉，下面那次点击会被它吃掉，
   *   表现为「按钮在、点不动、确认框根本没开」——本组第一版就这么假红过一次。 */
  if (stage) await clickSafe('#cave-stage', 3000);
  await page2.waitForTimeout(300);
  const buildInfo = await page2.evaluate(() => {
    const b = document.querySelector('#tab-combat [data-act="caveBuild"]:not([disabled])');
    return b ? { v: b.getAttribute('data-v'), f: b.getAttribute('data-f') } : null;
  });
  if (buildInfo) {
    const okBuild = await clickSafe('#tab-combat [data-act="caveBuild"][data-v="' + buildInfo.v + '"][data-f="' + buildInfo.f + '"]');
    const cf3 = await poll2(() => page2.$('#modal-confirm:not(.hide)'), 5000);
    const cv3 = await page2.evaluate(() => (document.getElementById('cf-title') || {}).textContent || '');
    await clickSafe('#cf-ok');
    const st3 = await poll2(async () => {
      const s = await read2();
      const fac = (((s.worlds.xiuxian.cave || {}).fac) || {}).green_peak || {};
      return (fac[buildInfo.f] || 0) >= 1 ? s : false;
    }, 6000);
    const st3b = st3 || (await read2());
    const fac = (((st3b.worlds.xiuxian.cave || {}).fac) || {}).green_peak || {};
    T(okBuild && !!cf3 && /Lv/.test(cv3) && (fac[buildInfo.f] || 0) === 1 &&
      st3b.worlds.xiuxian.stones === 60000 - 30000,
      'V3 点营建 → 确认框标题带 Lv、确认后设施升 1 级且扣 30000（`caveBuild` 搬件后整条 mutate 链仍通）',
      'f=' + buildInfo.f + ' lv=' + (fac[buildInfo.f] || 0) + ' stones=' + st3b.worlds.xiuxian.stones + ' 标题=' + JSON.stringify(cv3));
  } else {
    T(false, 'V3 点营建', '驻留福地上没有可点的营建按钮（设施表或置灰口径变了？）');
  }
  T(errors2.length === 0, 'B1 组零页面报错', errors2.join('|').slice(0, 150) || 'clean');
  await ctx2.close();

  console.log(fail === 0 ? 'UI_ZONE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ZONE_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });