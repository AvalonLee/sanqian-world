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
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-17-3' },
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
  /* 格数随机批 2026-10-09：一次刷 10~16 件（用户令「不要固定为 10 个」）⇒ 判据从「恰 10」改「区间内」，
   * 区间硬界由冒烟 #285 逐值钉死（七刻度扫一遍必为 10..16），这里只量真机渲染出的卡数不落界外。 */
  T(shopWide.cards >= 10 && shopWide.cards <= 16, 'M2 坊市一次刷新 10~16 件随机物品（区间内，不是恒 10）', 'n=' + shopWide.cards);
  T(shopWide.blackBtn, 'M3 黑市入口可见（karma ≤ −200）');
  await page.click('#tab-shop [data-act="shopTab"][data-v="1"]');
  await page.waitForTimeout(300);
  const blackCards = await page.$$eval('#tab-shop .shopcard', (els) => els.length);
  T(blackCards >= 10 && blackCards <= 16, 'M4 黑市同链路同区间（两架各自独立掷）', 'n=' + blackCards);

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

  /* ── ③ 炼丹炼器页（B16-i 改口：设计语言已从「卡片网格」转为「段标 + 行/条/网格三态」——
   *        丹方与图纸是整行、炉中是条、丹匣与材料是网格。原判据数 .cardgrid 段数与卡数，
   *        在新结构下必然假红，故改为「五段段标齐全 + 行清单与网格各在位 + 两条产线入口都在」。 ── */
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await page.waitForTimeout(400);
  const alWide = await page.evaluate(() => {
    const grids = Array.from(document.querySelectorAll('#tab-alchemy .cardgrid'));
    return {
      n: grids.length,
      cols: grids.length ? getComputedStyle(grids[0]).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      items: document.querySelectorAll('#tab-alchemy .cardgrid > .carditem').length,
      segs: Array.prototype.map.call(document.querySelectorAll('#tab-alchemy .sechead .t'), (x) => x.textContent.trim()),
      rows: document.querySelectorAll('#tab-alchemy .rowlist > .lrow').length,
      mat: document.querySelectorAll('#tab-alchemy .matgrid > .matrow').length,
      strips: document.querySelectorAll('#tab-alchemy .strip').length,
      startBtns: document.querySelectorAll('#tab-alchemy button[data-act="alStart"]').length,
      forgeBtns: document.querySelectorAll('#tab-alchemy button[data-act="forgeBp"]').length,
      /* 段标按词表取，不抄中文；丹匣段只在有丹药时渲染 ⇒ 本 fixture 无库存时不该硬要 */
      want: ['alchemy.ui.queue', 'alchemy.ui.dan', 'alchemy.ui.bp.sec', 'alchemy.ui.mats']
        .map((k) => SQ.t(k, null, 'xiuxian').trim())
    };
  });
  const segHit = alWide.want.filter((w) => alWide.segs.indexOf(w) >= 0).length;
  T(segHit === 4 && alWide.rows >= 1 && (alWide.mat >= 1 || alWide.items >= 1),
    'M7 炼丹炼器四段段标齐全（炉中 / 丹方 / 器台图纸 / 材料）+ 丹方与图纸为整行清单（丹匣段只在有丹药时出现）',
    '命中段=' + segHit + '/4 segs=' + alWide.segs.join('/') + ' rows=' + alWide.rows + ' mat=' + alWide.mat + ' items=' + alWide.items);
  T(alWide.startBtns >= 1 && alWide.forgeBtns >= 1,
    'M8 丹方与图纸的动作入口在位（alStart / forgeBp 都渲染出来了）',
    'start=' + alWide.startBtns + ' forge=' + alWide.forgeBtns);

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
  await page.click('#m-subnav button[data-v="faction"]');
  await page.waitForTimeout(300);
  const facNarrow = await colsOf('#tab-faction .cardgrid');
  T(shopNarrow === 1, 'M12 窄屏坊市退单列', 'cols=' + shopNarrow);
  T(facNarrow === 1, 'M13 窄屏门中供给退单列', 'cols=' + facNarrow);
  T(alNarrow === 1, 'M14 窄屏炼丹炼器退单列', 'cols=' + alNarrow);

  /* M23 同型面第二处：门中供给（势力页）卖的就是 D.PILLS 那四颗丹，必须挂**同一对标签**
   * （坊市加了而那里不加 = 造一处新的不一致，正是本批在特席上刚修掉的毛病）。
   * 主存档已入势力、声望满 ⇒ 四档供给全解锁，卡片必为四张，逐张量 .fh 内的 chip。 */
  /* 已停在势力页（窄屏那一步刚切过来）⇒ M23 直接量，不再重复点导航 */
  await page.waitForTimeout(500);
  const sup = await page.evaluate(() => Array.prototype.map.call(
    document.querySelectorAll('#tab-faction .faccard.carditem'), (c) => {
      const fh = c.querySelector('.fh');
      return {
        text: fh ? fh.textContent.replace(/\s+/g, ' ').trim() : '',
        tier: fh ? Array.prototype.map.call(fh.querySelectorAll('.tierbadge'), (x) => x.textContent.trim()) : [],
        cat: fh ? Array.prototype.map.call(fh.querySelectorAll('.catbadge'), (x) => x.textContent.trim()) : []
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
    /* 主货架要**排掉特席那张 grid**：特席在 DOM 里排在货架之前，两者都是 `#tab-shop .shopgrid`，
     * 不排掉就会数成 13 张并把特席当成货架前三格（首跑就是这么错的，属选择器缺陷不是产品缺陷）。 */
    const rows = (sel, skipMerch) => Array.prototype.filter.call(document.querySelectorAll(sel),
      (c) => !(skipMerch && c.closest && c.closest('.merchbox'))).map((c) => {
      const nm = c.querySelector('.nm');
      return {
        text: nm ? nm.textContent.replace(/\s+/g, ' ').trim() : '',
        tier: nm ? Array.prototype.map.call(nm.querySelectorAll('.tierbadge'), (x) => x.textContent.trim()) : [],
        cat: nm ? Array.prototype.map.call(nm.querySelectorAll('.catbadge'), (x) => x.textContent.trim()) : [],
        mark: nm ? Array.prototype.map.call(nm.querySelectorAll('.special-mark'), (x) => x.textContent.trim()) : []
      };
    });
    return { shelf: rows('#tab-shop .shopgrid .shopcard', true), merch: rows('#tab-shop .merchbox .shopcard', false) };
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
  const sh = tagDump.shelf, mc = tagDump.merch;

  const at = (i) => sh[i] || {};
  T(sh.length === 10 && mc.length === 3, 'M15 非空观测：货架十格 + 特席三格全部渲染（六类货各就位，后面每条 chip 断言才有对象可量）',
    '货架=' + sh.length + ' 特席=' + mc.length);
  T(sh.every((r) => r.cat.length === 1) && mc.every((r) => r.cat.length === 1),
    'M16 每件货（含特席）都挂恰一枚分类 chip', '缺分类: ' + sh.concat(mc).filter((r) => r.cat.length !== 1).map((r) => r.text).join(' / ') || '无');
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

  /* ── M28~M31（第廿六批 2026-10-13 · 买到的东西必须落得下）：弹窗与成交同源 + 先判后扣 ──
   * 桩：货架钉成 [春风化雨篇]，并把 nextRestock 设到 1.2 秒后 ⇒ 无阻塞 CONFIRM 开着的那两秒多
   * 里 tick 必然换架。旧写法按**旧序号**成交 ⇒ 弹窗写「春风化雨篇 · 2,300 灵石」而实扣另一件。
   * M28 先证「换架真的发生了」，否则 M29/M30 是空集上的假绿（本仓老坑）。 */
  const shop26 = (items, known, restockIn) => {
    const s = JSON.parse(JSON.stringify(save));
    const w = s.worlds.xiuxian;
    w.realm = 5; w.stones = 100000; w.qi = 100; w.total = 100;
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
      firstRef: first.ref || first.kind || '(空)', soldFirst: !!first.sold,
      toast: Array.prototype.map.call(document.querySelectorAll('#toasts > *'),
        (x) => x.textContent.replace(/\s+/g, ' ').trim()).join('|')
    };
  });

  {
    const o26 = await openShop26(shop26([artChunyu()], ['tuna'], 3500));
    await o26.p.click('#tab-shop [data-act="buy"]');
    await o26.p.waitForTimeout(250);
    const dlg26 = await o26.p.evaluate(() => document.getElementById('cf-text').textContent.replace(/\s+/g, ' ').trim());
    await o26.p.waitForTimeout(3600);
    const mid26 = await readShop26(o26.p);
    T(dlg26.indexOf('春风化雨篇') >= 0 && mid26.firstRef !== 'chunyu',
      'M28 前置：无阻塞弹窗期间货架真被补货换掉了（不先证这条，M29/M30 就是空集假绿）',
      '弹窗=' + dlg26.slice(0, 24) + ' 换架后首格=' + mid26.firstRef);
    await o26.p.click('#cf-ok');
    await o26.p.waitForTimeout(800);
    const end26 = await readShop26(o26.p);
    T(/换了新货/.test(end26.toast) && end26.toast.indexOf('原因不明') < 0 && !end26.soldFirst && !end26.knownChunyu,
      'M29 序号已换 ⇒ 这一单不成交，且**屏上说的是「货架换了新货」这一种拒因**（F15 分键：旧判据认的正是那句兜底，等于没判）',
      'toast=' + end26.toast.slice(0, 30) + ' 售罄=' + end26.soldFirst + ' 入门=' + end26.knownChunyu);
    T(end26.stones === mid26.stones,
      'M30 拒单分文不动（弹窗上写的 2,300 不会扣到别的货上）',
      mid26.stones + '→' + end26.stones);
    await o26.c.close();
  }
  {
    const o27 = await openShop26(shop26([artChunyu()], ['tuna', 'chunyu'], 86400000));
    const st0 = (await readShop26(o27.p)).stones;
    await o27.p.click('#tab-shop [data-act="buy"]');
    await o27.p.waitForTimeout(250);
    await o27.p.click('#cf-ok');
    await o27.p.waitForTimeout(800);
    const st1 = await readShop26(o27.p);
    T(/你已经有了/.test(st1.toast) && st1.toast.indexOf('原因不明') < 0 && !st1.soldFirst && st1.stones === st0,
      'M31 已拥有的功法还挂在货架上：扣钱前先拒，且文案点名「这一件你已经有了」（F15 = 不再与「换架」共用一句兜底）',
      'toast=' + st1.toast.slice(0, 30) + ' 灵石=' + st0 + '→' + st1.stones + ' 售罄=' + st1.soldFirst);
    await o27.c.close();
  }

    T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 200) || 'clean');

  console.log(fail === 0 ? 'UI_MARKET_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_MARKET_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(2); });
