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
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-22-1' },
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

  /* ──  坊市 / 黑市：一页两架（第册一百一十四批改口）──
   * 旧三判（M3 页签在位 / M4 点页签后数黑市 / M4b 切过去看段条）依赖的是「同一时刻只有一架在屏上」，
   * 页签摘了之后那套点击无从发起 ⇒ 覆盖的支路整条搬到「段容器」上重判：
   * 架在不在（M3）→ 两架各自区间（M2/M4）→ 段条与刷新钮归属（M4b/M4e）。 */
  await page.click('#m-tabbar button[data-v="shop"]');
  await page.waitForTimeout(400);
  const shopWide = await page.evaluate(() => {
    const fa = document.querySelector('#tab-shop .fasec .shopgrid');
    const hei = document.querySelector('#tab-shop .heisec .shopgrid');
    return {
      hasGrid: !!fa,
      cols: fa ? getComputedStyle(fa).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      cards: fa ? fa.querySelectorAll('.shopcard').length : 0,
      heiCards: hei ? hei.querySelectorAll('.shopcard').length : 0,
      segTabs: document.querySelectorAll('#tab-shop [data-act="shopTab"]').length,
      refresh: Array.prototype.map.call(
        document.querySelectorAll('#tab-shop .strip .refreshbtn'), (b) => b.dataset.v).join(',')
    };
  });
  T(shopWide.hasGrid && shopWide.cols >= 2, 'M1 坊市为卡片网格（宽屏 ≥2 列）', 'cols=' + shopWide.cols);
  /* 格数随机批 2026-10-09：一次刷 10~16 件（用户令「不要固定为 10 个」）⇒ 判据从「恰 10」改「区间内」，
   * 区间硬界由冒烟 #285 逐值钉死（七刻度扫一遍必为 10..16），这里只量真机渲染出的卡数不落界外。
   * 计数按段取（`.fasec`），不再数全页 `.shopcard`——黑市那架如今同页，数全页会把两架并成一架。 */
  T(shopWide.cards >= 10 && shopWide.cards <= 16, 'M2 坊市一次刷新 10~16 件随机物品（区间内，不是恒 10）', 'n=' + shopWide.cards);
  T(shopWide.segTabs === 0 && shopWide.heiCards >= 10,
    'M3 顶栏切换行已摘 ⇒ 黑市不再靠页签进入，而是同页第二段（全页零枚 shopTab ‖ 黑市架有货）',
    'segTabs=' + shopWide.segTabs + ' 黑市卡=' + shopWide.heiCards);
  T(shopWide.heiCards >= 10 && shopWide.heiCards <= 16, 'M4 黑市同链路同区间（两架各自独立掷）', 'n=' + shopWide.heiCards);
  /* B16-o：黑市按设计稿先给一条 .strip 段条（黑市 / 一句代价提示）；第册一百一十四批起它归 `.heisec` */
  const blackStrip = await page.evaluate(() => {
    const el = document.querySelector('#tab-shop .heisec .strip');
    return { t: el && el.querySelector('.t') ? el.querySelector('.t').textContent.trim() : '',
      v: el && el.querySelector('.v') ? el.querySelector('.v').textContent.trim() : '',
      want: SQ.t('shop.blackmarket', null, 'xiuxian').trim() };
  });
  T(blackStrip.t === blackStrip.want && blackStrip.v.length > 0,
    'M4b 黑市段条在位（标题走词表 · 代价提示非空）', JSON.stringify(blackStrip));
  /* 刷新钮归属（新机制唯一的「刷哪一架」入口）：两架各一枚，data-v 就是引擎的 black 实参 */
  T(shopWide.refresh === '0,1',
    'M4e 每架各带一枚刷新钮且归属可辨（data-v 0=坊市 / 1=黑市，费阶梯全局共用）', 'refresh=' + shopWide.refresh);

  /* B16-ab：神秘商人特席常驻——未触发奇遇时也留一块「未开市」 */
  const merchClosed = await page.evaluate(() => {
    const b = document.querySelector('#tab-shop .merchbox.closed');
    return { closed: !!b, txt: b ? b.textContent.replace(/\s+/g, ' ').trim() : '' };
  });
  T(merchClosed.closed && /未开市/.test(merchClosed.txt) && /奇遇/.test(merchClosed.txt),
    'M4c 神秘商人特席常驻：未开市时给「未开市 + 留意奇遇」提示', JSON.stringify(merchClosed));

  /* B16-ab：黑市未开市 ⇒ 段条仍在（入口常驻），但不渲染货架（避免旧黑市货残留被误买）。
   * 旧写法是「点页签进去看」，现在没有页签：同页量 `.heisec` 那一段。 */
  {
    const saveClear = JSON.parse(JSON.stringify(save));
    saveClear.worlds.xiuxian.karmaEventScore = 0;
    saveClear.worlds.xiuxian.karma = 0;
    const ctxB = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await ctxB.addInitScript((x) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(x)); }, saveClear);
    const pgB = await ctxB.newPage();
    await pgB.goto(url);
    await pgB.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await pgB.waitForTimeout(700);
    await pgB.click('#m-tabbar button[data-v="shop"]');
    await pgB.waitForTimeout(400);
    const closedB = await pgB.evaluate(() => {
      const sec = document.querySelector('#tab-shop .heisec');
      return {
        hasSec: !!sec,
        strip: sec ? (sec.querySelector('.strip .v') || {}).textContent || '' : '',
        heiCards: sec ? sec.querySelectorAll('.shopcard').length : -1,
        faCards: document.querySelectorAll('#tab-shop .fasec .shopcard').length,
        heiRefresh: sec ? sec.querySelectorAll('.strip .refreshbtn').length : -1
      };
    });
    T(closedB.hasSec && /未开市/.test(closedB.strip) && closedB.heiCards === 0 && closedB.faCards >= 10,
      'M4d 道心未达 −200 ⇒ 黑市段条仍在（说「未开市」）但不渲染旧货，坊市架照常',
      JSON.stringify(closedB));
    T(closedB.heiRefresh === 0,
      'M4f 未开市那一段不给刷新钮（刷出一架玩家看不见的货 = 白扣一次费）', 'heiRefresh=' + closedB.heiRefresh);
    await ctxB.close();
  }

  /* ── ② 宗门页（B16-ac：门中供给随日常管理搬到这里）：整行清单 ── */
  await page.click('#m-tabbar button[data-v="sect"]');
  await page.waitForTimeout(400);
  const facWide = await page.evaluate(() => {
    const g = document.querySelector('#tab-sect .matgrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      cards: document.querySelectorAll('#tab-sect .matgrid > .matrow').length,
      supplyTitle: !!document.querySelector('#tab-sect .matgrid')
    };
  });
  T(facWide.hasGrid && facWide.cols === 1, 'M5 门中供给为整行清单（设计稿 .matrow 单列）', 'cols=' + facWide.cols);
  T(facWide.cards === 4, 'M6 门中供给四档各一行', 'n=' + facWide.cards);

  /* ── ③ 炼丹炼器页（B16-i 改口：设计语言已从「卡片网格」转为「段标 + 行/条/网格三态」——
   *        丹方与图纸是整行、炉中是条、丹匣与材料是网格。原判据数 .cardgrid 段数与卡数，
   *        在新结构下必然假红，故改为「五段段标齐全 + 行清单与网格各在位 + 两条产线入口都在」。 ── */
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await page.waitForTimeout(400);
  /* B16-t：丹房 / 器台分页 ⇒ 段标按页分别取（炉中与材料两段常驻、不分页） */
  const alDan = await page.evaluate(() => ({
    segs: Array.prototype.map.call(document.querySelectorAll('#tab-alchemy .sechead .t'), (x) => x.textContent.trim()),
    rows: document.querySelectorAll('#tab-alchemy .rowlist > .lrow').length,
    mat: document.querySelectorAll('#tab-alchemy .matgrid > .matrow').length,
    mats: document.querySelectorAll('#tab-alchemy [data-matline]').length,
    startBtns: document.querySelectorAll('#tab-alchemy button[data-act="alStart"][data-c="dan"]').length,
    want: ['alchemy.ui.queue', 'alchemy.ui.dan', 'alchemy.ui.mats']
      .map((k) => SQ.t(k, null, 'xiuxian').trim())
  }));
  await page.click('#tab-alchemy [data-act="alTab"][data-v="qi"]');
  await page.waitForTimeout(300);
  const alQi = await page.evaluate(() => ({
    segs: Array.prototype.map.call(document.querySelectorAll('#tab-alchemy .sechead .t'), (x) => x.textContent.trim()),
    rows: document.querySelectorAll('#tab-alchemy .rowlist > .lrow').length,
    forgeBtns: document.querySelectorAll('#tab-alchemy button[data-act="forgeBp"]').length,
    want: ['alchemy.ui.queue', 'alchemy.ui.bp.sec', 'alchemy.ui.mats']
      .map((k) => SQ.t(k, null, 'xiuxian').trim())
  }));
  const hitDan = alDan.want.filter((w) => alDan.segs.indexOf(w) >= 0).length;
  const hitQi = alQi.want.filter((w) => alQi.segs.indexOf(w) >= 0).length;
  T(hitDan === 3 && hitQi === 3 && alDan.rows >= 1 && alQi.rows >= 1 && alDan.mats >= 1,
    'M7 炼丹炼器分页后段标仍在：丹房（炉中/丹方/材料）与器台（炉中/图纸/材料）各齐全，丹方与图纸为整行',
    'dan=' + hitDan + '/3 rows=' + alDan.rows + ' mats=' + alDan.mats + ' [' + alDan.segs.join('/') + '] qi=' + hitQi + '/3 rows=' + alQi.rows + ' [' + alQi.segs.join('/') + ']');
  T(alDan.startBtns >= 1 && alQi.forgeBtns >= 1,
    'M8 丹方与图纸的动作入口在位（alStart[dan] / forgeBp 都渲染出来了）',
    'start=' + alDan.startBtns + ' forge=' + alQi.forgeBtns);
  /* 回到丹房页（后续 D 相要在丹匣里点服用） */
  await page.click('#tab-alchemy [data-act="alTab"][data-v="dan"]');
  await page.waitForTimeout(250);

  /* ──  江湖榜：一榜十席 + 玩家名次行只在自己那一榜（第册一批③改口）── */
  await page.click('#m-tabbar button[data-v="prodigy"]');
  await page.waitForTimeout(400);
  /* 玩家名次行只渲染在他所属那条境界带上 ⇒ 先切到自己那一榜再取数（不切就会假红） */
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const el = document.querySelector('#tab-prodigy .jbchips button[data-v="' +
      SQ.Jianghu.bandOf(s.worlds.xiuxian.realm) + '"]');
    if (el) el.click();
  });
  await page.waitForTimeout(400);
  const pd = await page.evaluate(() => {
    const rows = document.querySelectorAll('#tab-prodigy .lrow');
    return { rows: rows.length, txt: document.querySelector('#tab-prodigy').textContent };
  });
  T(pd.rows >= 10 && pd.rows <= 11, 'M9 一榜十席（名录 30 人分带后每榜仍只十席；玩家跌出十席时榜尾补自己那一行 ⇒ ≤11）',
    'rows=' + pd.rows);
  T(pd.txt.indexOf('10 游戏年') >= 0, 'M10 榜面标注名次播报节律（榜本身已改实时装配 ⇒ 措辞随批改口）', 'ok');
  T(/位列.{0,4}第 [0-9]+ 位/.test(pd.txt), 'M11 显示玩家榜位（第册一批③起带榜名：「你当前位列玄榜第 N 位」）',
    (pd.txt.match(/位列.{0,8}第 [0-9]+ 位/) || ['无该行'])[0]);

  /* ── 窄屏退单列 ── */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  /* B13：<720px 用五区底栏切区、子导航切页（16 项侧栏收起） */
  const zoneTo = async (label) => {
    await page.evaluate((l) => {
      const b = Array.prototype.slice.call(document.querySelectorAll('#m-zonebar button'))
        .filter((x) => x.textContent.trim() === l)[0];
      if (b) b.click();
    }, label);
    await page.waitForTimeout(250);
  };
  await zoneTo('道器');
  await page.click('#m-subnav button[data-v="shop"]');
  await page.waitForTimeout(300);
  const shopNarrow = await colsOf('#tab-shop .shopgrid');
  await page.click('#m-subnav button[data-v="alchemy"]');
  await page.waitForTimeout(300);
  const alNarrow = await colsOf('#tab-alchemy .cardgrid');
  await zoneTo('江湖');
  await page.click('#m-subnav button[data-v="sect"]');
  await page.waitForTimeout(300);
  const facNarrow = await colsOf('#tab-sect .matgrid');
  T(shopNarrow === 1, 'M12 窄屏坊市退单列', 'cols=' + shopNarrow);
  T(facNarrow === 1, 'M13 窄屏门中供给仍单列', 'cols=' + facNarrow);
  T(alNarrow === 1, 'M14 窄屏炼丹炼器退单列', 'cols=' + alNarrow);

  /* M23 同型面第二处：门中供给（势力页）卖的就是 D.PILLS 那四颗丹，必须挂**同一对标签**
   * （坊市加了而那里不加 = 造一处新的不一致，正是本批在特席上刚修掉的毛病）。
   * 主存档已入势力、声望满 ⇒ 四档供给全解锁，卡片必为四张，逐张量 .fh 内的 chip。 */
  /* 已停在宗门页（窄屏那一步刚切过来）⇒ M23 直接量，不再重复点导航 */
  await page.waitForTimeout(500);
  const sup = await page.evaluate(() => Array.prototype.map.call(
    document.querySelectorAll('#tab-sect .matgrid > .matrow'), (c) => {
      const mn = c.querySelector('.m-n');
      return {
        text: mn ? mn.textContent.replace(/\s+/g, ' ').trim() : '',
        tier: mn ? Array.prototype.map.call(mn.querySelectorAll('.tierbadge'), (x) => x.textContent.trim()) : [],
        cat: mn ? Array.prototype.map.call(mn.querySelectorAll('.catbadge'), (x) => x.textContent.trim()) : []
      };
    }));
  T(sup.length >= 4 && sup.every((r) => r.cat.length === 1 && r.cat[0] === '丹药' && r.tier.length === 1
      && ['黄阶', '玄阶', '地阶', '天阶'].indexOf(r.tier[0]) >= 0),
    'M23 门中供给四颗丹与坊市**同一对标签**（分类=丹药 · 词缀=同名丹方同档的品阶）',
    sup.map((r) => r.text + '[' + r.tier.join('') + '|' + r.cat.join('') + ']').join(' '));

  /* ── M15~M22 货架卡片双标签（坊市标签批 2026-10-09 · UI 卷 §3.4「词缀 chip + 分类 chip」通则）──
   * 主存档的货架是**随机掷且格数也随机（10~16）**的（M2 正是数它落界内），凑不齐六类货 ⇒ 另开一个 context，
   * 预置「六类各一 + 特席三件」的确定性货架再量标签。**非空观测先行**（M15 先数出十张卡、
   * 六类齐全），否则后面每条 chip 断言都可能在空集合上假绿（本仓老坑）。
   * 判据取的是 DOM 结构（名称行内的 tierbadge / catbadge 两类节点）而不是整行文本——
   * 文本对得上不代表 chip 挂对了地方，样式类才是「分类与特殊词条分家」这条设计的证据。 */
  const saveTags = JSON.parse(JSON.stringify(save));
  const wTags = saveTags.worlds.xiuxian;
  /* 主域里没有 D / pack（buildSave 内部各装一次沙箱），这里同法再装一次取真表——
   * 槽位 / 功法 id / 法宝 id 一律**从数据表里取**，不写死字面量（写死了就是「测试数据按假设造」）。 */
  const { load: load3 } = require(path.join(__dirname, 'sandbox.cjs'));
  const SQ3 = load3([]).sandbox.window.SQ;
  const pack3 = SQ3.Worlds.xiuxian.pack;
  const slot0 = pack3.data.GEAR_SLOTS[0];
  const artsAll = Object.keys(pack3.artsMap());
  const tid0 = Object.keys(pack3.treasures.byId || {})[0];
  const mkG = (tier) => ({ id: 'tag_g', slot: slot0, tier: tier, atk: 20, resist: 6, score: 40, name: '青纹飞剑', align: 'neutral', reqs: { realm: 0 } });
  wTags.realm = 6; wTags.stones = 9999999;
  wTags.shop = {
    items: [
      { kind: 'gear', gear: mkG(3), sold: false, price: 1200 },
      { kind: 'arts', ref: artsAll[0], sold: false, price: 900 },
      { kind: 'pill', ref: 'pozhang', sold: false, price: 400 },
      { kind: 'pill', ref: 'juqi', sold: false, price: 80 },
      { kind: 'treasure', ref: tid0, sold: false, price: 6000 },
      { kind: 'pack', pack: { type: 'mat', ref: 'mat_linglu', price: 200 }, sold: false, price: 200 },
      { kind: 'pack', pack: { type: 'recipe', ref: 'rc_pozhang', price: 900 }, sold: false, price: 900 },
      { kind: 'pack', pack: { type: 'bp', ref: 'bp_weapon', price: 1500 }, sold: false, price: 1500 },
      { kind: 'pack', pack: { type: 'furnace', price: 4000 }, sold: false, price: 4000 },
      { kind: 'pack', sold: false, price: 0, qiPrice: 5000 }
    ],
    blackItems: [{ kind: 'gear', gear: mkG(4), sold: false, price: 5000 }],
    nextRestock: Date.now() + 3600000, refreshCount: 0,
    merchant: { until: Date.now() + 600000, scout: false, items: [
      { kind: 'gear', gear: mkG(2), sold: false, price: 700 },
      { kind: 'arts', ref: artsAll[1] || artsAll[0], sold: false, price: 800 },
      { kind: 'pill', ref: 'cuiti', sold: false, price: 200 }
    ] }
  };
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  await ctx3.addInitScript((x) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(x)); }, saveTags);
  const page3 = await ctx3.newPage();
  page3.on('pageerror', (e) => errors.push(e.message));
  page3.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page3.goto(url);
  await page3.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  /* M22（第卅九批 · 用户报「神秘商人触发的特席我从没见过」）：复盘 = 机制没坏（玩家真档里开过两次席，间隔与 12h 冷却吻合），
   * 坏在没人告诉玩家——席期只有 MERCHANT_DURATION_MS(10 分钟)，而坊市红点签名原先只含补货时间戳、日志末行又是 event 类被 toast 跳过。
   * 台次也要说清：商人席只摆在第三台（ctx3 / saveTags）的档里，toast 又只活 3 秒 ⇒ 必须紧跟这台载入去轮询。 */
  const merchToast = await page3.evaluate(() => new Promise((res) => {
    var t0 = Date.now(), txt = '';
    var iv = setInterval(() => {
      txt = Array.prototype.map.call(document.querySelectorAll('#toasts .toast'), (x) => x.textContent).join(' | ');
      if (/神秘商人/.test(txt) || Date.now() - t0 > 4200) { clearInterval(iv); res(txt); }
    }, 120);
  }));
  T(/神秘商人/.test(merchToast), 'M32 载入时席还开着就主动提示一次（坊市红点签名现已含开席时刻）', merchToast.slice(0, 64) || '（4 秒内无提示）');
  await page3.waitForTimeout(800);
  await page3.click('#m-tabbar button[data-v="shop"]');
  await page3.waitForTimeout(600);
  const tagDump = await page3.evaluate(() => {
    /* 计数按段取：一页两架之后 `#tab-shop .shopgrid` 会同时命中坊市架与黑市架，
     * 特席那三格又在另一段里 ⇒ 不但是「排掉特席」，而是各段各量（旧写法靠 closest('.merchbox') 排，
     * 如今把黑市那一架也排掉了就是假绿）。 */
    const rows = (sel) => Array.prototype.map.call(document.querySelectorAll(sel), (c) => {
      const nm = c.querySelector('.nm');
      return {
        text: nm ? nm.textContent.replace(/\s+/g, ' ').trim() : '',
        tier: nm ? Array.prototype.map.call(nm.querySelectorAll('.tierbadge'), (x) => x.textContent.trim()) : [],
        cat: nm ? Array.prototype.map.call(nm.querySelectorAll('.catbadge'), (x) => x.textContent.trim()) : [],
        mark: nm ? Array.prototype.map.call(nm.querySelectorAll('.special-mark'), (x) => x.textContent.trim()) : [],
        buy: c.querySelectorAll('button[data-act="buy"]').length,
        cost: (c.querySelector('.g-cost') || {}).textContent || ''
      };
    });
    return {
      shelf: rows('#tab-shop .fasec .shopcard'),
      merch: rows('#tab-shop .merchbox .shopcard'),
      hei: rows('#tab-shop .heisec .shopcard'),
      /* 几何那一半与三组卡数同一次取样取完（ctx3 在 M22 之后就要关，判据只能吃这份快照）：
       * 购入钮必须落在价格右侧、且不出卡宽——本仓立则「文案对得上不代表挂对了地方」。 */
      geo: (() => {
        const bad = [];
        Array.prototype.forEach.call(document.querySelectorAll('#tab-shop .fasec .shopcard, #tab-shop .heisec .shopcard'), (c) => {
          const cost = c.querySelector('.g-cost'), btn = c.querySelector('button[data-act="buy"]');
          if (!cost || !btn) { bad.push('缺件'); return; }
          const a = cost.getBoundingClientRect(), b = btn.getBoundingClientRect(), k = c.getBoundingClientRect();
          if (!(b.left >= a.right - 1 && b.right <= k.right + 1 && b.width > 0)) {
            bad.push('价右' + Math.round(a.right) + ' 钮' + Math.round(b.left) + '-' + Math.round(b.right) + ' 卡右' + Math.round(k.right));
          }
        });
        return bad;
      })()
    };
  });
  const merchLeft = await page3.evaluate(() => {
    const box = document.querySelector('.merchbox');
    return ((box ? box.textContent : '').match(/离去[^0-9]{0,3}[0-9]+s*(分钟|分|秒|时)/) || [])[0] || '';
  });
  T(merchLeft !== '', 'M33 特席倒计时在位（玩家看得清还多久收摊 · 容器 = .merchbox）', merchLeft || '（读不到倒计时）');
  const copyM = await page3.evaluate(() => {
    const D = SQ.Worlds.xiuxian.pack.data;
    return { txt: SQ.t('log.eff.merchant', { n: Math.round(D.MERCHANT_DURATION_MS / 60000) }), mins: Math.round(D.MERCHANT_DURATION_MS / 60000) };
  });
  T(copyM.txt.indexOf(copyM.mins + ' 分钟') >= 0 && copyM.txt.indexOf('{') < 0 && copyM.txt.indexOf('一炷香') < 0,
    'M34 开席文案的分钟数取表值（旧写法写死「一炷香」，改表不带动屏上话）', copyM.txt.slice(0, 56) + ' ‖ n=' + copyM.mins);
  await ctx3.close();
  const sh = tagDump.shelf, mc = tagDump.merch, he = tagDump.hei;

  const at = (i) => sh[i] || {};
  T(sh.length === 10 && mc.length === 3, 'M15 非空观测：货架十格 + 特席三格全部渲染（六类货各就位，后面每条 chip 断言才有对象可量）',
    '货架=' + sh.length + ' 特席=' + mc.length);
  T(sh.every((r) => r.cat.length === 1) && mc.every((r) => r.cat.length === 1) && he.every((r) => r.cat.length === 1),
    'M16 每件货（含特席与黑市）都挂恰一枚分类 chip', '缺分类: ' + sh.concat(mc, he).filter((r) => r.cat.length !== 1).map((r) => r.text).join(' / ') || '无');
  T(at(0).cat[0] === '百器' && at(1).cat[0] === '功法' && at(2).cat[0] === '丹药' && at(4).cat[0] === '法宝'
    && at(5).cat[0] === '炼丹炼器' && at(9).cat[0] === '耗材',
    'M17 分类词与货类逐一对得上（百器/功法/丹药/法宝/炼丹炼器/耗材）',
    [at(0).cat[0], at(1).cat[0], at(2).cat[0], at(4).cat[0], at(5).cat[0], at(9).cat[0]].join('/'));
  T(at(0).tier[0] === '灵品' && at(1).tier[0] === '黄字阶' && at(2).tier[0] === '地阶' && at(3).tier[0] === '黄阶'
    && (at(4).tier[0] === '先天' || at(4).tier[0] === '后天') && at(6).tier[0] === '地阶',
    'M18 词缀逐类对表：百器品阶 / **功法品阶（此前坊市从没露过）** / 丹药品阶 / 法宝先天后天 / 丹方品阶',
    [at(0).tier[0], at(1).tier[0], at(2).tier[0], at(3).tier[0], at(4).tier[0], at(6).tier[0]].join('/'));
  T([5, 7, 8, 9].every((i) => (at(i).tier || []).length === 0),
    'M19 **无档次的四类如实留空**（材料包 / 图纸 / 丹炉成品 / 灵石包不挂词缀，不编档次凑两枚）',
    [5, 7, 8, 9].map((i) => (at(i).tier || []).length).join(','));
  T(sh.every((r) => r.cat.every((c) => r.mark.indexOf(c) < 0)) && at(4).cat[0] === '法宝' && at(4).mark.length === 0,
    'M20 分类走 catbadge 而非 special-mark（法宝卡那枚「法宝」已迁样式；特殊词条仍独占 special-mark）',
    '法宝卡 mark=' + JSON.stringify(at(4).mark) + ' cat=' + at(4).cat[0]);
  T(mc.length === 3 && mc[2].cat[0] === '丹药' && mc[2].tier[0] === '玄阶' && mc[1].cat[0] === '功法' && mc[1].tier[0].length > 0,
    'M21 神秘商人特席与货架**同一取数**（旧写法在此另拼一套：法器有品阶、功法没有、丹药一个都没有）',
    '特席: ' + mc.map((r) => r.text + '[' + r.tier.join('') + '|' + r.cat.join('') + ']').join(' '));
  T(mc.every((r) => r.cat.length === 1) && sh.filter((r) => r.cat[0] === '丹药').length === 2,
    'M22 同型面收口：两处置席 + 两类丹药，分类计数与货类计数互相对得上（可复算，不是只数总数）',
    '丹药卡=' + sh.filter((r) => r.cat[0] === '丹药').length + ' 特席=' + mc.length);

  /* ── M35/M36（第册一百一十四批 · 一页两架 + 每卡购入钮）──
   * M35 = 黑市那一格也走同一套 itemRow（同页第二段最容易长出「另一套卡片写法」，
   *       本仓「两处显示 = 一份公式」那一族缺陷的前科都在坊市/特席/门中这三处）；
   * M36 = 每格恰一枚「购入」钮 + 价格另有一处纯文本（用户令：钮要点就成交，价不该长在钮上）。 */
  T(he.length === 1 && he[0].cat[0] === '百器' && he[0].tier.length === 1,
    'M35 黑市那格与坊市同一套取数（段容器换了，卡片写法没换）',
    he.map((r) => r.text + '[' + r.tier.join('') + '|' + r.cat.join('') + ']').join(' '));
  T(sh.concat(he).every((r) => r.buy === 1 && r.cost.replace(/\s+/g, '').length > 0),
    'M36 坊市与黑市每格都是「一段价格 + 一枚购入钮」（钮不是价格行本身）',
    '缺钮/空价=' + sh.concat(he).filter((r) => r.buy !== 1 || !r.cost.replace(/\s+/g, '')).map((r) => r.text).join(' / ') || '无');
  /* 几何那一半（量矩形，不量文本）：钮真在价的**右边**且不出卡。 */
  T(tagDump.geo.length === 0,
    'M37 购入钮落在价格右侧且不越卡宽', tagDump.geo.slice(0, 2).join(' ‖ ') || '全部 ' + (sh.length + he.length) + ' 格合格');

  /* ── D 相（第十七批 · 丹药两族合一）：门中供给买丹 → 入匣不当场生效 → 丹匣看得见 → 点服用才落效 ──
   * 选「淬体丹」这条 SKU：它的效果是 buff（战力 +20%/4h），"没挂上 buff" 是可确定的屏上证言；
   * 且 rank 3 门槛由本件的富态档（声望 2000 → rank 4）稳定跨过，不吃随机。 */
  const readPill = () => page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = st.worlds.xiuxian;
    return {
      pills: ((w.alchemy || {}).pills || {}).cuiti || 0,
      buffs: (w.buffs || []).filter(b => b.field === 'combatPower' && b.source === 'alchemy').length,
      stones: w.stones
    };
  });
  await page.waitForSelector('[data-act="supplyBuy"][data-v="cuiti"]', { timeout: 8000 });
  const bD = await readPill();
  await page.click('[data-act="supplyBuy"][data-v="cuiti"]');
  await page.waitForTimeout(500);
  const aD = await readPill();
  T(aD.pills === bD.pills + 1 && aD.buffs === bD.buffs && aD.stones < bD.stones,
    'M25 门中供给买丹：入丹匣且**不当场生效**（战力 buff 数不变、灵石照扣；🔧 N43 起「丹毒计数不占」那半随日限退役）',
    '匣 ' + bD.pills + '→' + aD.pills + ' buff ' + bD.buffs + '→' + aD.buffs + ' 灵石 ' + bD.stones + '→' + aD.stones);
  await zoneTo('道器');
  await page.click('#m-subnav button[data-v="alchemy"]');
  await page.waitForSelector('[data-act="alDrink"][data-v="cuiti"]', { timeout: 8000 });
  const rowD = await page.evaluate(() => {
    /* B16-i：丹匣由卡片改设计稿 .matrow 网格行 ⇒ 取行容器两种都认 */
    const el = document.querySelector('[data-act="alDrink"][data-v="cuiti"]').closest('.matrow, .carditem');
    return { txt: (el.innerText || '').replace(/\s+/g, ' '), badge: (el.querySelector('.tierbadge') || {}).textContent || '' };
  });
  T(rowD.txt.indexOf('淬体丹') >= 0 && rowD.badge === '坊市' && rowD.txt.indexOf('undefined') < 0,
    'M26 丹匣两族合一：坊市丹与自产丹同列同渲染，名字取词表、徽标是「坊市」而非「自炼」',
    '徽标=' + JSON.stringify(rowD.badge) + ' 行=' + rowD.txt.slice(0, 46));
  await page.click('[data-act="alDrink"][data-v="cuiti"]');
  await page.waitForTimeout(500);
  const cD = await readPill();
  T(cD.pills === aD.pills - 1 && cD.buffs === aD.buffs + 1 && cD.buffs === 1,
    'M27 点「服用」才落效：战力 buff 挂上且**只此一条**、库存 −1（🔧 N43 起「占丹毒日限」那半随日限退役，防连点改由「同字段同向不叠加」这一判接住）',
    '匣 ' + aD.pills + '→' + cD.pills + ' buff ' + aD.buffs + '→' + cD.buffs);

  /* ── M28~M31（第册一百一十四批改口 · 用户令「点购买钮直接完成购买，不需要再弹窗确认」）──
   * 第廿六批那三判量的是「无阻塞弹窗期间被补货换架 ⇒ 按旧序号买成别件」，弹窗这一环没了，UI 侧就无从
   * 制造那个窗口（不是把判据放宽，是那条支路在界面上不存在了）。引擎里「指纹对不上分文不动地拒」仍在，
   * 视图仍把 goodSig 递进去，那一判由冒烟 #298(e) 常驻守着。
   * 这四判改为量新机制真正要保证的四面：当场成交 / 不弹窗 / 扣钱前的两类拒单仍回显中文且分文不动 / 买过的格不能再点。 */
  const shop26 = (items, known, restockIn, stones) => {
    const s = JSON.parse(JSON.stringify(save));
    const w = s.worlds.xiuxian;
    w.realm = 5; w.stones = stones != null ? stones : 100000; w.qi = 100; w.total = 100;
    w.artsKnown = known; w.artsSlots = ['tuna']; w.artsLevels = {}; w.shelf = [];
    w.shop = { items: items, blackItems: [], nextRestock: Date.now() + restockIn, refreshStep: 0, discount: 0 };
    return s;
  };
  const artChunyu = () => ({ kind: 'arts', ref: 'chunyu', sold: false, price: 2300 });
  const openShop26 = async (s) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await c.addInitScript((x) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(x)); }, s);
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await p.goto(url);
    await p.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await p.waitForTimeout(700);
    await p.click('#m-tabbar button[data-v="shop"]');
    await p.waitForTimeout(400);
    return { c: c, p: p };
  };
  const readShop26 = (p) => p.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian;
    const first = ((w.shop || {}).items || [])[0] || {};
    return {
      stones: w.stones, knownChunyu: (w.artsKnown || []).indexOf('chunyu') >= 0,
      shelfChunyu: (w.shelf || []).indexOf('chunyu') >= 0,
      firstRef: first.ref || first.kind || '(空)', soldFirst: !!first.sold,
      toast: Array.prototype.map.call(document.querySelectorAll('#toasts > *'),
        (x) => x.textContent.replace(/\s+/g, ' ').trim()).join('|')
    };
  });
  const BUY0 = '#tab-shop .fasec [data-act="buy"][data-v="0"]';

  {
    const o28 = await openShop26(shop26([artChunyu()], ['tuna'], 86400000));
    const pre28 = await readShop26(o28.p);
    await o28.p.click(BUY0);
    await o28.p.waitForTimeout(300);
    const noDlg = await o28.p.evaluate(() => !document.querySelector('#modal-confirm:not(.hide)'));
    const mid28 = await readShop26(o28.p);
    T(noDlg && mid28.soldFirst && mid28.stones === pre28.stones - 2300 &&
      (mid28.knownChunyu || mid28.shelfChunyu),
      'M28 点「购入」当场成交：不弹确认框、按卡上那一件的价格扣钱、东西真落进去（未达标者落待修习架）',
      '弹窗=' + !noDlg + ' 灵石 ' + pre28.stones + '→' + mid28.stones + ' 售罄=' + mid28.soldFirst +
      ' 入门=' + mid28.knownChunyu + ' 上架=' + mid28.shelfChunyu);
    const card28 = await o28.p.evaluate(() => {
      const el = document.querySelector('#tab-shop .fasec .shopcard');
      return { sold: !!el && el.classList.contains('sold'), btns: el ? el.querySelectorAll('button[data-act="buy"]').length : -1,
        txt: el ? el.textContent.replace(/\s+/g, ' ').trim() : '' };
    });
    T(card28.sold && card28.btns === 0 && card28.txt.indexOf('已售罄') >= 0,
      'M29 买过那一格转「已售罄」且钮撤下（没有确认框挡在中间，重复点击是唯一会被误扣的形状）',
      JSON.stringify(card28).slice(0, 80));
    await o28.c.close();
  }
  {
    const o30 = await openShop26(shop26([artChunyu()], ['tuna', 'chunyu'], 86400000));
    const st0 = (await readShop26(o30.p)).stones;
    await o30.p.click(BUY0);
    await o30.p.waitForTimeout(300);
    const r30 = await readShop26(o30.p);
    T(/你已经有了/.test(r30.toast) && r30.toast.indexOf('原因不明') < 0 && !r30.soldFirst && r30.stones === st0,
      'M30 已拥有的功法还挂在货架上：扣钱前先拒，且文案点名「这一件你已经有了」（F15 分键，兜底那句不算）',
      'toast=' + r30.toast.slice(0, 30) + ' 灵石=' + st0 + '→' + r30.stones + ' 售罄=' + r30.soldFirst);
    await o30.c.close();
  }
  {
    const o31 = await openShop26(shop26([artChunyu()], ['tuna'], 86400000, 10));
    await o31.p.click(BUY0);
    await o31.p.waitForTimeout(300);
    const r31 = await readShop26(o31.p);
    T(/手头不够/.test(r31.toast) && !r31.soldFirst && r31.stones === 10,
      'M31 手头不足：点下去也是一句人话 + 分文不动（这一道回显原先藏在确认框之后，现在是第一道）',
      'toast=' + r31.toast.slice(0, 30) + ' 灵石=' + r31.stones + ' 售罄=' + r31.soldFirst);
    await o31.c.close();
  }

    T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 200) || 'clean');

  console.log(fail === 0 ? 'UI_MARKET_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_MARKET_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(2); });
