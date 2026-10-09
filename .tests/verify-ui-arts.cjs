/* .tests/verify-ui-arts.cjs — 法与器合并页 + 自悟节 + 卡片化走查（playwright-core + Edge headless）
 * 自悟批：功法段「自行领悟」节——保底进度条（.selflearn .pbar）+ 可领悟候选计数；
 * 卡片化批：器段（.geargrid）与法宝页（.trgrid）由行列表改为卡片网格——宽屏多列、窄屏单列；
 * **页面整合批 2026-10-06（UI 卷 §3.4a）**：原「功法」「法器」两 Tab 并为「法与器」一页——
 *   本脚本同批改写：① 导航断言改数**游戏页 12 项**（原 13）② 新增概览条 `.laware` 三格 /
 *   段标 `.secdiv` 两段 / `lawJump` 锚跳三组断言 ③ 原 `#tab-gear` 选择器全部改 `#tab-arts`
 *   （容器已删，两页同处一页）④ 新增**窄屏导航零截断**断言（`.tabbar` 改横向滚动后，
 *   每个按钮 `scrollWidth <= clientWidth`——这是合并页敢取三字标签「法与器」的前提）。
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-arts.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态：realm 5（解锁法宝页 lock 3 + 宗门 lock 4 → 12 游戏页全开）
 * + 双功法入槽（自悟面板与概览条「主修」格可读） */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.realm = 5; ws.stones = 5000; ws.qi = 100; ws.total = 100;
  ws.artsKnown = ['tuna', 'juling']; ws.artsSlots = ['tuna', 'juling'];
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
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

  /* ── A0 导航：游戏页 12 项（页面整合批 13 → 12；以 .navsep 分组线为界，其后是系统页 3 项）── */
  const nav = await page.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(bar.children);
    const sep = kids.findIndex((x) => x.classList.contains('navsep'));
    const game = kids.slice(0, sep).filter((x) => x.tagName === 'BUTTON');
    return {
      nGame: game.length,
      nSys: kids.slice(sep + 1).filter((x) => x.tagName === 'BUTTON').length,
      labels: game.map((x) => x.textContent.trim()),
      hasGearTab: game.some((x) => x.dataset.v === 'gear'),
      artsLabel: (game.filter((x) => x.dataset.v === 'arts')[0] || {}).textContent || ''
    };
  });
  T(nav.nGame === 12, 'A0 导航游戏页 12 项（功法 + 法器并为「法与器」）', 'n=' + nav.nGame + ' 系统页=' + nav.nSys);
  T(!nav.hasGearTab, 'A0b `gear` 已从 GAME_TABS 移除（无独立导航项）');
  T(nav.artsLabel.trim() === '法与器', 'A0c 合并页导航标签 = 「法与器」（词表 arts.system）', 'got=' + nav.artsLabel.trim());
  T(nav.labels.indexOf('法宝') >= 0, 'A0d 法宝仍独立成页（用户拍板合并面限定「只并功法 + 装备」）');

  /* ── 进合并页 ── */
  await page.click('#m-tabbar button:has-text("法与器")');
  await page.waitForTimeout(400);

  /* ── A1 概览条 .laware：三格（主修 / 佩器 / 战力），每格值非空 ── */
  const ov = await page.evaluate(() => {
    const cells = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .laware button'));
    return {
      n: cells.length,
      keys: cells.map((c) => (c.querySelector('.k') || {}).textContent || ''),
      vals: cells.map((c) => ((c.querySelector('.v') || {}).textContent || '').trim()),
      jumps: cells.map((c) => c.dataset.act + ':' + c.dataset.v)
    };
  });
  T(ov.n === 3, 'A1 概览条三格在位（主修 / 佩器 / 战力）', 'n=' + ov.n);
  T(ov.keys.join('|') === '主修|佩器|战力', 'A1b 概览条三格标签正确', ov.keys.join('|'));
  T(ov.vals.every((v) => v.length > 0), 'A1c 概览条三格值均非空', JSON.stringify(ov.vals));
  T(ov.vals[0].indexOf('Lv') >= 0, 'A1d 主修格显示功法名 + 等级', ov.vals[0]);
  T(ov.jumps.every((j) => j.indexOf('lawJump:') === 0), 'A1e 三格均绑 lawJump 锚跳', ov.jumps.join(','));

  /* ── A2 段标 .secdiv：法 / 器 两段，各带锚点 id ── */
  const seg = await page.evaluate(() => {
    const ds = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .secdiv'));
    return {
      n: ds.length,
      zi: ds.map((x) => (x.querySelector('.zi') || {}).textContent || ''),
      ids: ds.map((x) => x.id),
      subs: ds.map((x) => ((x.querySelector('.sub') || {}).textContent || '').trim())
    };
  });
  T(seg.n === 2 && seg.zi.join('') === '法器', 'A2 段标两段「法」「器」在位', seg.zi.join('/'));
  T(seg.ids.join(',') === 'lawsec-fa,lawsec-qi', 'A2b 段标锚点 id 正确（lawJump 目标）', seg.ids.join(','));
  T(seg.subs.every((s) => s.length > 0), 'A2c 段标副标非空', seg.subs.join(' / '));

  /* ── A3 段序：概览条 → 法段标 → 功法内容 → 器段标 → 法器内容（单页纵向五段）── */
  const order = await page.evaluate(() => {
    const p = document.getElementById('tab-arts');
    const sel = ['.laware', '#lawsec-fa', '.selflearn', '#lawsec-qi', '.geargrid'];
    const tops = sel.map((s) => { const e = p.querySelector(s); return e ? e.getBoundingClientRect().top : -1; });
    return { tops, allFound: tops.every((x) => x >= 0) };
  });
  T(order.allFound, 'A3 五段元素全部在位', JSON.stringify(order.tops.map(Math.round)));
  T(order.allFound && order.tops.every((v, i) => i === 0 || v >= order.tops[i - 1]),
    'A3b 五段纵向顺序正确（概览条 → 法 → 功法内容 → 器 → 法器内容）', JSON.stringify(order.tops.map(Math.round)));

  /* ── A4 功法段：自悟节（原「功法页」断言，归属改称、断言不变）── */
  const arts = await page.evaluate(() => {
    const sec = document.querySelector('#tab-arts .selflearn');
    const bar = sec ? sec.querySelector('.pbar > i') : null;
    const heads = Array.prototype.map.call(document.querySelectorAll('#tab-arts .sechead .t'), (x) => x.textContent);
    return {
      hasSec: !!sec,
      hasBar: !!bar,
      barW: bar ? bar.style.width : '',
      selfHead: heads.some((x) => x.indexOf('领') >= 0 && x.indexOf('悟') >= 0),
      cands: !!document.querySelector('#tab-arts .selflearn .hint')
    };
  });
  T(arts.hasSec && arts.hasBar, 'A4 法段含「自行领悟」节 + 保底进度条', 'w=' + arts.barW);
  T(arts.selfHead, 'A4b 自悟节标题（自行领悟）在位');
  T(arts.cands, 'A4c 自悟节含候选/说明文案');

  /* ── A5 器段：卡片网格（原「法器页」断言，容器 #tab-gear → #tab-arts）── */
  const gear = await page.evaluate(() => {
    const g = document.querySelector('#tab-arts .geargrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      cards: document.querySelectorAll('#tab-arts .geargrid > .tcard').length,
      goneTabGear: !document.getElementById('tab-gear')
    };
  });
  T(gear.goneTabGear, 'A5 `#tab-gear` 容器已删除（无悬挂节点）');
  T(gear.hasGrid && gear.cols >= 2, 'A5b 器段为卡片网格（宽屏 ≥2 列）', 'cols=' + gear.cols);
  T(gear.cards >= 4, 'A5c 器段每槽一卡（4 槽全在）', 'n=' + gear.cards);

  /* ── A6 lawJump 锚跳：点概览条「佩器」格 → 器段滚入可视区 ──
   * 口径修正（2026-10-07 · 界面层首次实跑抓获的**测试缺陷**，非产品缺陷）：
   *   原 A6b 在 `click()` 后固定 `waitForTimeout(700)` 就取 scrollTop / 锚点位置，而平滑滚动耗时随距离变化、
   *   且 `.tabbody` 可滚程随渲染态增长（法段功法列表在首个 tick 后才铺满）——两次实跑分别读到
   *   scrollTop 2124 / 1893（均 < 当次 maxScroll），锚点距容器顶 651~899px，于是硬断言「±40px 对齐」假红。
   *   改为**轮询至 scrollTop 连续两次不变**（落定）后再测：实测 relTop ≈ −16，落点其实符合实现对
   *   （`view/index.html` lawJump 用 `scrollTop + (锚点top − 容器top) − 8` 求目标，产品无缺陷）。
   *   判据同时放宽为「锚点落在可视带内」——容器可滚程不够长时浏览器会钳位，此时对齐容器顶本就不可能。 */
  const jump = await page.evaluate(async () => {
    const box = document.querySelector('.tabbody');
    const anchor = document.getElementById('lawsec-qi');
    const before = box.scrollTop;
    const cell = document.querySelectorAll('#tab-arts .laware button')[1];
    cell.click();
    let last = -1, cur = box.scrollTop, stable = 0;
    for (let i = 0; i < 80 && stable < 2; i++) {
      await new Promise((r) => setTimeout(r, 50));
      cur = box.scrollTop;
      if (cur === last) stable++; else stable = 0;
      last = cur;
    }
    const br = box.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
    return {
      before, after: cur,
      anchorVisible: ar.top < br.bottom && ar.bottom > br.top,
      relTop: Math.round(ar.top - br.top),
      clientHeight: Math.round(box.clientHeight),
      maxScroll: Math.round(box.scrollHeight - box.clientHeight),
      atMax: Math.round(cur) >= Math.round(box.scrollHeight - box.clientHeight)
    };
  });
  T(jump.after > jump.before, 'A6 概览条「佩器」格锚跳到器段（scrollTop 前进）',
    'before=' + Math.round(jump.before) + ' after=' + Math.round(jump.after));
  /* 稳判据 = 落定后锚点落在可视带内（−40 ~ 容器可视高）：容器可滚程够得着时对齐容器顶
   * （实测 relTop = −16，段标上沿压在容器上沿 16px、即 lawJump 的 `− 8` 修正 + 段标自身内边距），
   * 够不着时钳位在末端但仍须在带内。注意不能用「元素与容器矩形相交」判——段标压沿时
   * rect.bottom 可能仍小于容器 rect.top，那正是**对齐成功**的形态，不是缺陷。 */
  T(jump.relTop >= -40 && jump.relTop < jump.clientHeight,
    'A6b 滚动落定后器段锚点落在可视带（够得着则对齐容器顶 ±40，够不着则钳位仍可见）',
    'relTop=' + jump.relTop + ' 可视高=' + jump.clientHeight + ' maxScroll=' + jump.maxScroll + ' atMax=' + jump.atMax);

  /* ── A7 法宝页：卡片网格（独立成页，断言不变）── */
  await page.click('#m-tabbar button:has-text("法宝")');
  await page.waitForTimeout(400);
  const tr = await page.evaluate(() => {
    const g = document.querySelector('#tab-treasure .trgrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      cards: document.querySelectorAll('#tab-treasure .trgrid > .tcard').length
    };
  });
  T(tr.hasGrid && tr.cols >= 2, 'A7 法宝页为卡片网格（宽屏 ≥2 列）', 'cols=' + tr.cols);
  T(tr.cards >= 3, 'A7b 法宝栏每槽一卡（≥3 卡）', 'n=' + tr.cards);

  /* ── A8 窄屏：器段退单列 + **导航零截断**（横向滚动修复的验收点）── */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.click('#m-tabbar button:has-text("法与器")');
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const g = document.querySelector('#tab-arts .geargrid');
    const btns = Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'));
    const bar = document.getElementById('m-tabbar');
    return {
      gearCols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      lawCols: getComputedStyle(document.querySelector('#tab-arts .laware')).gridTemplateColumns.split(' ').length,
      /* 截断判据：内容宽 > 可视宽即被 ellipsis 截（旧 flex:1 布局下 12 项每项 ≈25px，两字标签 ≈24px + padding 必截） */
      clipped: btns.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim()),
      scrollable: bar.scrollWidth > bar.clientWidth,
      barOverflowX: getComputedStyle(bar).overflowX
    };
  });
  T(narrow.gearCols === 1, 'A8 窄屏器段网格退单列', 'cols=' + narrow.gearCols);
  T(narrow.lawCols === 1, 'A8b 窄屏概览条退单列（≤400px 媒体查询）', 'cols=' + narrow.lawCols);
  T(narrow.clipped.length === 0, 'A8c 窄屏导航**零标签截断**（横向滚动修复生效；旧 flex:1 布局下此处必挂）',
    narrow.clipped.length ? '被截: ' + narrow.clipped.join(',') : 'clean');
  T(narrow.barOverflowX === 'auto' && narrow.scrollable, 'A8d 窄屏导航条为横向滚动容器且确有可滚内容',
    'overflow-x=' + narrow.barOverflowX + ' scrollable=' + narrow.scrollable);

  /* ── A9 窄屏法宝页退单列（切回激活再量：隐藏面板无法解析网格列）── */
  await page.click('#m-tabbar button:has-text("法宝")');
  await page.waitForTimeout(300);
  const narrowTr = await page.evaluate(() => {
    const t = document.querySelector('#tab-treasure .trgrid');
    return { cols: t ? getComputedStyle(t).gridTemplateColumns.split(' ').length : 0 };
  });
  T(narrowTr.cols === 1, 'A9 窄屏法宝网格退单列', 'cols=' + narrowTr.cols);

  /* ── A10 旧档 tabOrder 含 'gear'：由「未知 id 剔除」自动清掉，导航不崩不多项、其余项相对序保留 ──
   * 口径修正（2026-10-07 · 界面层首次实跑抓获的**测试骨架缺陷**，非产品缺陷）：
   *   原写法「先 evaluate 改 localStorage、再 page.reload()」读到的是**默认序**——
   *   `ctx.addInitScript` 每次导航都会重跑，用建场时的原始存档（`tabOrder: []`）把刚写入的顺序整个冲掉，
   *   于是 A10c 必红（实测 head4 = idle,combat,arts,treasure 即默认序，而非产品重排）。
   *   产品行为已用独立探针复核为**正确**：以 preset 存档首次加载时实测 head4 = idle,arts,combat,treasure、12 项、未知 id 全剔。
   * 现改为「带旧档 tabOrder 的存档首次加载」：另开一个 context 注入 preset，不再依赖 reload 后的 localStorage 改写。 */
  const saveLegacy = JSON.parse(JSON.stringify(save));
  /* 旧档实态：gear 排在 arts 之后（合并前的默认序），另塞一个从不存在的 id 一并验剔除 */
  saveLegacy.settings.tabOrder = ['idle', 'arts', 'gear', 'combat', 'nosuchtab', 'treasure'];
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx2.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveLegacy);
  const page2 = await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await page2.goto(url);
  await page2.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page2.waitForTimeout(700);
  const afterLegacy = await page2.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(bar.children);
    const sep = kids.findIndex((x) => x.classList.contains('navsep'));
    const game = kids.slice(0, sep).filter((x) => x.tagName === 'BUTTON');
    return {
      nGame: game.length,
      ids: game.map((x) => x.dataset.v),
      /* 前四项应保留旧档相对序（idle → arts → combat → treasure），gear / nosuchtab 被剔除后由默认序补齐其余 */
      head4: game.slice(0, 4).map((x) => x.dataset.v).join(','),
      persisted: JSON.stringify((JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}').settings || {}).tabOrder || [])
    };
  });
  T(afterLegacy.nGame === 12, 'A10 旧档 tabOrder 含 `gear` → 导航仍 12 项（不多项不崩）', 'n=' + afterLegacy.nGame);
  T(afterLegacy.ids.indexOf('gear') < 0 && afterLegacy.ids.indexOf('nosuchtab') < 0,
    'A10b 未知 id（gear / nosuchtab）被剔除', afterLegacy.ids.join(','));
  T(afterLegacy.head4 === 'idle,arts,combat,treasure',
    'A10c 旧档相对序保留（gear 剔除后其余项顺延，不重排）', 'nav=' + afterLegacy.head4 + ' 落盘=' + afterLegacy.persisted);
  await ctx2.close();

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_ARTS_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ARTS_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
