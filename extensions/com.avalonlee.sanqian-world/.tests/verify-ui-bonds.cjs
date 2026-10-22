/* .tests/verify-ui-bonds.cjs — 道友页「往来」段 UI 走查（好感三渠道批的视图侧补篇 · 任务清单 D1）
 * 依赖：playwright-core（仓库根 node_modules）+ 系统 Edge headless。用法：
 *   NODE_PATH=<仓库根 node_modules 的 Windows 路径> node .tests/verify-ui-bonds.cjs
 *
 * 为什么缺这一篇：好感三渠道批（2026-10-06）把同道详情由五段改六段、未识格由「只轻震」改可点开隐匿详情，
 * 是本批最大的体验增量，但当时只落了引擎侧冒烟 #257 与视图侧探针 probe-bondact（DOM 桩），
 * **真浏览器里的「点得到、数字对、身份不漏」三件事从未被执行验证过**。
 *
 * ⚠️ 状态读取口径：view/index.html:1359 的 `var state = {}` 是 IIFE 闭包内变量，页内 `state` 取不到
 *   （page.evaluate 直取必 ReferenceError）。故：
 *   ① 读状态 = `JSON.parse(localStorage.getItem('sanqian-state-v1'))`（动作一律经 SQ.mutate 落盘，
 *      这条读法同时证明「真的落盘了」；日志另走独立键 sanqian-logs-v1，见 core.js 日志存档批）；
 *   ② 页内注入 = `await SQ.mutate({}, function (s) { ... })`（回调参数即 state，同 verify-ui-karma.cjs:79）。
 *
 * 为什么拆四个 context：拜访是**全局单冷却 300,000ms**（ws.bondVisitAt 一个锚、不分人），
 *   同一 context 里点过一次，另一人的按钮必然置灰 —— 结识链与「已识者往来段」不能共用一次拜访。
 *   A = 未识结识链 + 冷却置灰；B = 已识者六段 + 异向/同向拜访 + 赠丹 + 零灵石流动 + 日志；
 *   C = **无日限**（GitHub issue #4 · 2026-10-14：同一个冻结游戏日里连赠三次全部入账、丹尽即摘 chip，
 *   屏上不再出现「今日 n/cap」计数；旧缺陷正是「日限永不生效却恒显 1/3」，故本场景必须钉住同一天）。
 *   D = 一次点击只弹一条提示 + 点完按钮立刻进冷却（第十九批 · 用户报的两条，前置要在道友页待满三轮 tick）。
 *
 * 数字基准（引擎与沙箱实测，非推测）：名录 58 格（44 友 + 14 道侣候选）；BOND_TIERS=[1,30,70,100]、
 *   BOND_MAX=100；BOND_VISIT_BY_TIER=[3,3,2,1,0]、CD=3600000、ALIGN_BONUS=1（**只给已识者**）；
 *   BOND_GIFT_BY_TIER={huang:4,xuan:6,di:9,tian:14}（🔧 issue #4 起 **无 DAILY**，节流只在丹药库存）。
 *   （⚠️ CD 自 2026-10-09 第六批起 = **300000**（5 分钟），本行原记 3600000 是那一批漏改的旧口径。）
 *   fixture：xie aff 55 = 档 2、align right，世界 karma 0 = neutral ⇒ 异向 gain 2；karmaEventScore 推到
 *   250 ⇒ 世界档 right ⇒ 同向 gain 3；黄丹 +4（库存 3→2）、天丹 +14（距满档余量 45，不被 min 截）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
const KEY = 'sanqian-state-v1';
const LOG_KEY = 'sanqian-logs-v1';

/* 存档种子：清空 artsSlots/gear/drift ⇒ karma 精确等于 karmaEventScore（同 karma 篇口径），
 * 异向 / 同向两态可由本文件单方切换，不吃 recalcDerived 的副作用。
 * ⚠️ 时钟口径：Alchemy.gameDayOf = floor((Date.now() − profile.createdAt) / 1000)，即
 *   **1 游戏日 = 1 现实秒**（丹毒日限同源）。赠丹「同一个游戏日内连点」类断言若靠真实时间推进，
 *   渲染等待的几百毫秒里日锚随时翻篇 ⇒ 用 at + freeze 把 Date.now 钉在一个固定点，
 *   日锚才是确定值（全仓零处 `new Date()`，时间源只有 Date.now，钉它即钉住全部）。 */
function seed(over) {
  over = over || {};
  const T = over.at || Date.now();
  const bornAt = T - (over.ageMs || 0);
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  s0.profile.createdAt = bornAt;
  const w = s0.worlds.xiuxian;
  w.lastSave = T; w.lastOffline = null; w.pendingChoice = null;
  w.realm = 1;                       /* 道友页门槛 TAB_UNLOCK.bonds.r = 1 */
  w.artsSlots = [];
  w.gear = { weapon: null, treasure: null, armor: null, accessory: null };
  w.alignDrift = 0;
  w.karmaEventScore = (over.karmaEventScore != null) ? over.karmaEventScore : 0;
  w.karma = w.karmaEventScore;
  w.bonds = { suwan: 100, xie: 55, yewu: 30 };   /* huang / liu 刻意缺席 = 未识（tier 0）*/
  w.bondVisitAt = 0;
  w.alchemy = {
    furnace: true,
    pills: { ap_juqi: 3, ap_pozhang: 1, ap_haina: 1, juqi: 2 },
    /* 🔧 issue #4（赠丹日限）与本批 N43（丹毒日限）两枚计数都已退役 ⇒ 桩里不再摆死键；
     *   「旧档里这两个键读进来即被 normalize 丢掉」由冒烟 #211 / #305 那一族判据守。 */
                                           /* issue #4 旧档残留字段：读档后必须被剪掉（B5/C1 的 giftDayAbsent 靠它才有鉴别力）*/
  };
  return { save: s0, at: T, bornAt: bornAt, freeze: !!over.freeze };
}

async function mkPage(browser, S) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  /* 注：initScript 会被序列化到浏览器上下文执行，Node 端闭包变量（KEY 等）在页内不存在，
   * 一律经参数传入——直接写 localStorage.setItem(KEY, ...) 会 ReferenceError 静默不写档、卡在创角页 */
  await ctx.addInitScript((p) => {
    localStorage.setItem(p.k, p.s);
    if (p.freeze) { Date.now = function () { return p.at; }; }
  }, { k: KEY, s: JSON.stringify(S.save), freeze: S.freeze, at: S.at });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(700);
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  /* ── 页内助手（一律不碰闭包 state）── */
  const wire = (page) => {
    /* 读落盘态（顺带证明动作真的经单一写通道落了盘）*/
    const readW = () => page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k) || 'null');
      if (!s) return null;
      const w = s.worlds[s.profile.worldId];
      return {
        bonds: w.bonds || {}, visitAt: w.bondVisitAt || 0, stones: w.stones,
        pills: (w.alchemy && w.alchemy.pills) || {},
        giftDayAbsent: !(w.alchemy && ('giftDay' in w.alchemy)),   /* issue #4：日限字段应已从档里消失 */
        ledger: w.ledger ? JSON.stringify(w.ledger) : 'none', karma: w.karma
      };
    }, KEY);
    const readLogs = () => page.evaluate((k) => {
      const raw = JSON.parse(localStorage.getItem(k) || 'null');
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1') || 'null');
      if (!raw || !raw.logs || !w) return [];
      return raw.logs[w.profile.worldId] || [];
    }, LOG_KEY);
    const inj = (fn) => page.evaluate(async (src) => {
      await SQ.mutate({}, new Function('s', src));   /* 回调参数即 state（单一写通道）*/
    }, fn);
    /* 轮询等落盘（save 经串行写队列异步完成，固定 sleep 既慢又脆）*/
    const until = async (pred, ms) => {
      const t0 = Date.now();
      for (;;) {
        const v = await pred();
        if (v) return v;
        if (Date.now() - t0 > (ms || 5000)) return null;
        await page.waitForTimeout(100);
      }
    };
    /* B8：道友页只铺已结缘行，未结缘者只在全名录浮层里 ⇒ 先开名录再点格 */
    const openRoster = async () => {
      await page.evaluate(() => {
        if (document.getElementById('modal-bonds').classList.contains('hide')) {
          const l = document.querySelector('#tab-bonds [data-act="openBonds"]');
          if (l) l.click();
        }
      });
      await page.waitForTimeout(250);
    };
    const openDetail = async (id) => {
      /* 先收浮层再开名录：详情态里没有名录格，且重开名录会让详情重取一次最新档 */
      await page.evaluate(() => document.getElementById('modal-bonds').classList.add('hide'));
      await openRoster();
      await page.evaluate((x) => {
        const el = document.querySelector('#mbd-body .pal[data-act="bondOpen"][data-v="' + x + '"]');
        if (el) el.click();
      }, id);
      await page.waitForTimeout(380);
    };
    const detailTxt = () => page.evaluate(() => {
      const b = document.getElementById('mbd-body');
      return (b && !document.getElementById('modal-bonds').classList.contains('hide'))
        ? (b.textContent || '').replace(/\s+/g, ' ') : '';
    });
    return { readW, readLogs, inj, until, openDetail, detailTxt };
  };

  /* ══════════════ 场景 A：未识结识链 + 全局单冷却 ══════════════ */
  {
    const S = seed();
    const mp = await mkPage(browser, S);
    const page = mp.page, h = wire(page);
    const nameHuang = await page.evaluate(() => SQ.t('bond.huang.name', null, 'xiuxian'));

    await page.click('#m-tabbar button[data-v="bonds"]');
    await page.waitForTimeout(450);

    /* A1（UI v2 B8 → 第册一百一十九批改口）：顶部一枚「道友 / 道侣」切换（与丹房/器台同组件）。
     *   旧判「首屏行数 === 3」在分页后不成立（本 fixture 结缘的三位全属道侣族，默认道友 tab 上 0 行）
     *   ⇒ 覆盖不许缩：改为**两族各自 tab 行数之和 === 已结缘总数且互斥不重**（这才分页该有的判法），
     *   再加段标族别、段内行数与段标数字对表、道侣行内族别标一枚。 */
    const tabShape = await page.evaluate(() => ({
      tabs: Array.prototype.slice.call(document.querySelectorAll('#tab-bonds .seg2 button'))
        .map((b) => ({ v: b.dataset.v, on: b.classList.contains('on'), t: b.textContent.replace(/\s+/g, ' ').trim() })),
      rows: document.querySelectorAll('#tab-bonds .brow').length,
      spRows: Array.prototype.slice.call(document.querySelectorAll('#tab-bonds .brow'))
        .filter((r) => r.classList.contains('sp')).length,
      unmet: !!document.querySelector('#tab-bonds [data-act="openBonds"]'),
      unmetTxt: ((document.querySelector('#tab-bonds [data-act="openBonds"] span') || {}).textContent || '').trim(),
      pal: document.querySelectorAll('#tab-bonds .palgrid').length,
      /* A1c 用：页名三键（导航 / 日志分类 / 图鉴面名）+ 页内族别名 + 底栏那颗钮的实际文字 */
      nav: (Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'))
        .filter((b) => b.dataset.v === 'bonds')[0] || {}).textContent || '',
      K: ['ui.pillar.bond', 'bond.system', 'codex.face.bond', 'bond.sec.friend'].map((k) => SQ.t(k, null, 'xiuxian'))
    }));
    await page.evaluate(() => {
      const b = document.querySelector('#tab-bonds .seg2 button[data-v="spouse"]');
      if (b) b.click();
    });
    await page.waitForTimeout(400);
    const tabSp = await page.evaluate(() => {
      const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-bonds .brow'));
      const head = document.querySelector('#tab-bonds .sechead .t');
      const sp = document.querySelector('#tab-bonds .brow.sp');
      const S = (k) => SQ.t(k, null, 'xiuxian');
      return {
        rows: rows.length,
        onlySp: rows.length > 0 && rows.every((r) => r.classList.contains('sp')),
        head: head ? head.textContent.replace(/\s+/g, ' ').trim() : '',
        wantS: S('bond.sec.spousem'), wantF: S('bond.sec.friend'),
        badges: sp ? Array.prototype.slice.call(sp.querySelectorAll('.tierbadge')).map((x) => x.textContent.trim()) : [],
        okBadge: [S('bond.sec.spousem'), S('bond.propose.ready')],
        oldHead: S('bond.sec.met'),
        wantU: S('bond.sec.spouse'),
        unmetTxt: ((document.querySelector('#tab-bonds [data-act="openBonds"] span') || {}).textContent || '').trim()
      };
    });
    await page.evaluate(() => {
      const b = document.querySelector('#tab-bonds .seg2 button[data-v="friend"]');
      if (b) b.click();                       /* 切回默认那族，后面的段落判据不受本组影响 */
    });
    await page.waitForTimeout(300);
    T(tabShape.tabs.length === 2 && tabShape.tabs[0].on === true && tabShape.tabs[0].v === 'friend' &&
        tabShape.tabs[1].on === false && tabShape.tabs[1].v === 'spouse' &&
        tabShape.unmet && tabShape.pal === 0 &&
        tabShape.rows + tabSp.rows === 3 && tabShape.spRows === 0 && tabSp.onlySp &&
        tabSp.head === tabSp.wantS + ' · ' + tabSp.rows &&
        tabSp.head.indexOf(tabSp.oldHead) < 0 &&
        tabSp.badges.length >= 1 && tabSp.badges.some((b) => tabSp.okBadge.indexOf(b) >= 0),
      'A1 顶部「道友 / 道侣」切换（默认道友、两族行数之和 = 已结缘 3 且互斥不重）‖ 段标族别化且行数与段标数字对表 ‖ 道侣行内有族别标',
      'tabs=' + JSON.stringify(tabShape.tabs.map((x) => x.v + (x.on ? '*' : ''))) +
      ' 友tab行=' + tabShape.rows + ' 侣tab行=' + tabSp.rows + ' 侣段标=' + tabSp.head +
      ' badges=' + JSON.stringify(tabSp.badges));
    /* A1c（第册一百二十批 · 用户令「页面名称『道友』与页内族别名撞名」⇒ 页名改「缘法」）：
     *   判的是**消费关系**不是某个字面值——① 底栏那颗钮真读 ui.pillar.bond；
     *   ② 三处页名键（导航 / 日志分类 / 图鉴面名）同值（漏改一处就是导航说一个名、页里说另一个名）；
     *   ③ 页名与族别名不再是同一个词（这一条就是把本批要修的缺陷钉成判据）；
     *   ④ 未结缘入口那句的族别名跟着 tab 走（道侣 tab 上说「道友」= 上一批分页留下的谎）。 */
    const nmPage = tabShape.K[0], nmFam = tabShape.K[3];
    T(tabShape.nav.trim().indexOf(nmPage) >= 0 &&
        nmPage === tabShape.K[1] && nmPage === tabShape.K[2] &&
        nmPage !== nmFam && nmFam === '道友' &&
        tabShape.unmetTxt.indexOf(nmFam) >= 0 &&
        tabSp.unmetTxt.indexOf(tabSp.wantU) >= 0 && tabSp.unmetTxt.indexOf(nmFam) < 0,
      'A1c 页名「缘法」三键同值且≠ 族别名「道友」‖ 底栏钮读该键 ‖ 未结缘入口族别名随 tab 走',
      'nav=' + JSON.stringify(tabShape.nav.trim()) + ' 页名三键=' + JSON.stringify(tabShape.K.slice(0, 3)) +
      ' 友入口=' + JSON.stringify(tabShape.unmetTxt) + ' 侣入口=' + JSON.stringify(tabSp.unmetTxt));
    await page.evaluate(() => {
      const l = document.querySelector('#tab-bonds [data-act="openBonds"]');
      if (l) l.click();
    });
    await page.waitForTimeout(350);
    const list = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('#mbd-body .pal'));
      const el = document.querySelector('#mbd-body .pal[data-v="huang"]');
      return {
        n: cells.length,
        lockN: cells.filter((c) => /(^| )lock/.test(c.className)).length,
        spN: cells.filter((c) => /(^| )sp/.test(c.className)).length,
        deadN: cells.filter((c) => /(^| )dead/.test(c.className)).length,
        cls: el ? el.className : '', act: el ? el.dataset.act : '', txt: el ? (el.textContent || '') : ''
      };
    });
    /* A1b（原 A1 的后半）：分页只收短首屏，名录一格不少——58 = 44 友 + 14 候选、
     *   未识格是可点开的剪影且格内零真名。（首屏那笔行账由上一条 A1 判，两处不重复计。） */
    T(tabShape.unmet && tabShape.pal === 0 &&
      list.n === 58 && list.spN === 14 && list.deadN === 0 && list.lockN === 55 &&
      list.act === 'bondOpen' && /lock/.test(list.cls) && list.txt.indexOf(nameHuang) < 0,
      'A1b 全名录浮层仍 58 格（44 友 + 14 候选）、未识格为剪影且零真名（分页不缩水）',
      'unmet=' + tabShape.unmet + ' pal格=' + list.n + ' lock=' + list.lockN +
      ' sp=' + list.spN + ' dead=' + list.deadN + ' act=' + list.act);


    /* A2 未识详情 = 隐匿详情：只有「往来」一段、无好感尺、零赠丹 chip、正文零真名 */
    await h.openDetail('huang');
    const unk = await page.evaluate(() => {
      const b = document.getElementById('mbd-body');
      return {
        secs: Array.from(b.querySelectorAll('.dsec .dt')).map((x) => (x.textContent || '').trim()),
        fbar: !!b.querySelector('.fbar'), head: !!b.querySelector('.bd-head'),
        gifts: b.querySelectorAll('[data-act="bondGift"]').length,
        txt: (b.textContent || '').replace(/\s+/g, ' ')
      };
    });
    T(unk.secs.length === 1 && /^往\s*来$/.test(unk.secs[0]) && !unk.fbar && unk.gifts === 0 &&
      unk.txt.indexOf(nameHuang) < 0,
      'A2 未识详情＝隐匿详情：单「往来」段 / 无好感尺 / 零赠丹段 / 身份零渲染',
      'secs=' + JSON.stringify(unk.secs) + ' fbar=' + unk.fbar + ' giftChips=' + unk.gifts);

    /* A3 未识拜访按钮：标 +3、挂「可借此结识」、不挂同向角标（未识者阵营未揭，给了就是身份泄漏）*/
    const vBtn = await page.evaluate(() => {
      const b = document.querySelector('#mbd-body [data-act="bondVisit"][data-v="huang"]');
      if (!b) return null;
      const g = (s) => { const e = b.querySelector(s); return e ? (e.textContent || '').trim() : null; };
      return { gv: g('.gv'), mt: g('.mt'), ab: g('.ab'), an: g('.an') };
    });
    const wa0 = await h.readW();
    T(!!vBtn && vBtn.gv === '+3' && !!vBtn.mt && vBtn.ab === null && (wa0.bonds.huang || 0) === 0,
      'A3 未识拜访标注 +3 且挂结识标、无「同道相投」角标（tier0 递减表首格）',
      'btn=' + JSON.stringify(vBtn) + ' aff=' + (wa0.bonds.huang || 0));

    /* A4 结识链三处同源：落盘 0→3（引擎 tier0 实发）+ 结识 toast 点名 + 名录格由「？」转实名 */
    await page.click('#mbd-body [data-act="bondVisit"][data-v="huang"]');
    const aff3 = await h.until(() => h.readW().then((w) => (w.bonds.huang === 3 ? w : null)));
    const toast1 = await page.evaluate(() => Array.from(document.querySelectorAll('#toasts .toast')).map((x) => x.textContent).join(' | '));
    const cellAfter = await page.$$eval('#tab-bonds .brow[data-v="huang"]', (e) => (e[0] ? { cls: e[0].className, txt: e[0].textContent || '' } : null));
    T(!!aff3 && toast1.indexOf(nameHuang) >= 0 && !!cellAfter && cellAfter.txt.indexOf(nameHuang) >= 0 &&
      !/lock/.test(cellAfter.cls),
      'A4 拜访未识者实发 +3 落盘、结识 toast 点名、名录格由剪影转实名（标注 === 实发）',
      'aff=' + (aff3 ? aff3.bonds.huang : 'timeout') + ' toastHit=' + (toast1.indexOf(nameHuang) >= 0) +
      ' cell=' + (cellAfter ? cellAfter.txt.replace(/\s+/g, '').slice(0, 12) : 'none') + ' name=' + nameHuang);

    /* A5 全局单冷却（一个锚不分人）：另一人（liu）按钮置灰且摘掉 data-act、给出剩余时间；
     *    强行点击零副作用 —— 第二人好感仍 0、冷却锚不被顶掉、首次结识不回退 */
    await h.openDetail('liu');
    const nameLiu = await page.evaluate(() => SQ.t('bond.liu.name', null, 'xiuxian'));
    const cd = await page.evaluate(() => {
      const b = document.querySelector('#mbd-body .actbtn');
      return {
        btnN: document.querySelectorAll('#mbd-body .actbtn').length,
        liveN: document.querySelectorAll('#mbd-body [data-act="bondVisit"]').length,
        disabled: b ? b.disabled === true : null,
        hasAct: b ? (b.getAttribute('data-act') || '') : '',
        cdTxt: b ? ((b.querySelector('.cd') || {}).textContent || '').trim() : '',
        gv: b ? ((b.querySelector('.gv') || {}).textContent || '') : ''
      };
    });
    const visitAtBefore = (await h.readW()).visitAt;
    await page.evaluate(() => { const b = document.querySelector('#mbd-body .actbtn'); if (b) b.click(); });
    await page.waitForTimeout(500);
    const wa1 = await h.readW();
    T(cd.btnN === 1 && cd.liveN === 0 && cd.disabled === true && cd.hasAct === '' && cd.gv === '' &&
      /[\d]/.test(cd.cdTxt) && (wa1.bonds.liu || 0) === 0 && wa1.visitAt === visitAtBefore && wa1.bonds.huang === 3,
      'A5 拜访是全局单冷却：第二人按钮置灰无 data-act、显示剩余时间，强点零副作用',
      'btn=' + cd.btnN + ' live=' + cd.liveN + ' dis=' + cd.disabled + ' cd=' + cd.cdTxt +
        ' liuAff=' + (wa1.bonds.liu || 0) + ' visitAtSame=' + (wa1.visitAt === visitAtBefore) + ' nameLeak=' + (cd.cdTxt.indexOf(nameLiu) >= 0));

    T(mp.errors.length === 0, 'A6 场景A 零页面报错', mp.errors.join(' | ').slice(0, 200) || 'clean');
    await mp.ctx.close();
  }

  /* ══════════════ 场景 B：已识者六段 + 异向/同向 + 赠丹 + 底线 + 日志 ══════════════ */
  {
    const S = seed();
    const mp = await mkPage(browser, S);
    const page = mp.page, h = wire(page);
    await page.click('#m-tabbar button[data-v="bonds"]');
    await page.waitForTimeout(450);
    const nameXie = await page.evaluate(() => SQ.t('bond.xie.name', null, 'xiuxian'));

    /* B1 详情六段：头部 → 好感尺 → 往来 → 个体助力 →（小传 → 结缘条件）——
     *    「往来」是首个 .dsec 且紧跟它要改的那根尺，助力在其后（助力是果、往来是因）*/
    await h.openDetail('xie');
    const sec = await page.evaluate(() => {
      const b = document.getElementById('mbd-body');
      const dsecs = Array.from(b.querySelectorAll('.dsec'));
      const act = dsecs.findIndex((s) => /^往\s*来$/.test(((s.querySelector('.dt') || {}).textContent || '').trim()));
      const next = act >= 0 && dsecs[act + 1]
        ? ((dsecs[act + 1].querySelector('.dt') || {}).textContent || '').trim() : '';
      const head = b.querySelector('.bd-head'), fbar = b.querySelector('.fbar');
      const before = (x, y) => !!(x && y && (x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING));
      return {
        n: dsecs.length, act, next,
        headFirst: before(head, fbar), fbarBeforeAct: before(fbar, act >= 0 ? dsecs[act] : null),
        names: Array.from(b.querySelectorAll('.dsec .dt')).map((x) => (x.textContent || '').trim().replace(/\s+/g, ''))
      };
    });
    T(sec.n === 4 && sec.act === 0 && /助\s*力/.test(sec.next) && sec.headFirst && sec.fbarBeforeAct,
      'B1 已识者详情六段齐（头部/尺/往来/助力/小传/结缘条件）且往来紧随好感尺',
      'dsec=' + sec.n + ' actIdx=' + sec.act + ' next=' + sec.next + ' secs=' + sec.names.join('/'));

    /* B2 tier2 异向：世界 neutral vs 本人 right ⇒ 递减表档 2 = +2、无角标；实发 55→57 */
    const v0 = await page.evaluate(() => {
      const b = document.querySelector('#mbd-body [data-act="bondVisit"][data-v="xie"]');
      return b ? { gv: ((b.querySelector('.gv') || {}).textContent || '').trim(),
        ab: !!b.querySelector('.ab'), mt: !!b.querySelector('.mt') } : null;
    });
    const wb0 = await h.readW();
    await page.click('#mbd-body [data-act="bondVisit"][data-v="xie"]');
    const wb1 = await h.until(() => h.readW().then((w) => (w.bonds.xie === 57 ? w : null)));
    T(!!v0 && v0.gv === '+2' && v0.ab === false && v0.mt === false && wb0.bonds.xie === 55 &&
      !!wb1 && wb1.bonds.xie === 57,
      'B2 tier2 异向拜访标 +2 且无角标，实发 55→57（标注 === 实发）',
      'btn=' + JSON.stringify(v0) + ' aff=' + wb0.bonds.xie + '→' + (wb1 ? wb1.bonds.xie : 'timeout'));

    /* B3 同向对照：把世界档位推到 right（karmaEventScore 250 → recalcDerived → karma 250）⇒ 同一人
     *    标注变 +3（base 2 + ALIGN_BONUS 1）且「同道相投」角标出现；实发必须同步吃到 +1。
     *    ⚠️ 判据取**点击前后的增量**而非绝对值：改 karma 那一次 recalcDerived 会经势力联动顺带动好感
     *    （实测 +2，日志里多出的那条 cat bond 即它），绝对值断言会把这条联动误判成「标注不符」。*/
    await h.inj('var w=s.worlds[s.profile.worldId]; w.karmaEventScore=250; w.bondVisitAt=0;');
    await page.evaluate(() => { const st = document.getElementById('rank-stage'); if (st) st.classList.add('hide'); });
    await page.waitForTimeout(400);
    await h.openDetail('xie');
    const v1 = await page.evaluate(() => {
      const b = document.querySelector('#mbd-body [data-act="bondVisit"][data-v="xie"]');
      return b ? { gv: ((b.querySelector('.gv') || {}).textContent || '').trim(),
        abTxt: ((b.querySelector('.ab') || {}).textContent || '').trim() || null } : null;
    });
    const step3 = parseInt(String(v1 ? v1.gv : '').replace(/[^\d]/g, ''), 10) || 3;
    const wb1f = await h.readW();
    await page.click('#mbd-body [data-act="bondVisit"][data-v="xie"]');
    const wb2 = await h.until(() => h.readW().then((w) => (w.bonds.xie === wb1f.bonds.xie + step3 ? w : null)));
    const wb2f = wb2 || await h.readW();
    T(!!v1 && v1.gv === '+3' && /同道相投/.test(v1.abTxt || '') && wb2f.bonds.xie - wb1f.bonds.xie === 3 && wb2f.karma === 250,
      'B3 同向对照：世界档转 right 后标注 +3 且角标出现，实发增量与标注同数',
      'btn=' + JSON.stringify(v1) + ' aff ' + wb1f.bonds.xie + '→' + wb2f.bonds.xie + ' karma=' + wb2f.karma);

    /* B4 赠丹只列可赠：双特例（once: ap_pozhang 破障丹）由引擎与视图两层同口径挡在门外；
     *    名义增量按丹方 tier 对表（huang +4 / tian +14），且此刻 aff 已 62（含势力联动 +2）、
     *    距满档余量 38，天丹 +14 不被「对余量取 min」截掉 */
    const chips = await page.evaluate(() => Array.from(document.querySelectorAll('#mbd-body [data-act="bondGift"]')).map((x) => ({
      c: x.dataset.c, gv: ((x.querySelector('.gv') || {}).textContent || '').trim(),
      st: ((x.querySelector('.st') || {}).textContent || '').trim(), dis: x.disabled
    })));
    const onceIn = chips.some((x) => x.c === 'ap_pozhang' || x.c === 'ap_zhenjie');
    T(chips.length === 3 && !onceIn &&
      chips.some((x) => x.c === 'ap_juqi' && x.gv === '+4' && x.st === '×3') &&
      chips.some((x) => x.c === 'ap_haina' && x.gv === '+14' && x.st === '×1') &&
      /* M1 真机锚：成品丹（坊市购入 · 第十七批入匣）必须在屏上有赠丹 chip——旧视图给它 0 增量 ⇒ 整颗消失 */
      chips.some((x) => x.c === 'juqi' && x.gv === '+4' && x.st === '×2') &&
      chips.every((x) => x.dis === false),
      'B4 赠丹 chips 只列可赠：底牌族不入列、自产两枚 + 成品一枚（+4/+14/+4）对表 BOND_GIFT_BY_TIER',
      JSON.stringify(chips));

    /* B5 入账三对 + 底线：扣丹 3→2、好感 +4 === chip 标注（「入账成功才扣」的序在真机上成立），
     *    同时灵石与总账纹丝不动 —— 「以丹会友」送的是自有丹药，不是买好感（侣不可交易底线的视图侧实证）。
     *    🔧 issue #4：原「日限计数 0→1」随字段退役取消，改钉落盘档里 `alchemy.giftDay` 已不存在。*/
    const g0 = await h.readW();
    const juqi = chips.find((x) => x.c === 'ap_juqi');
    const stepG = parseInt(String(juqi ? juqi.gv : '').replace(/[^\d]/g, ''), 10) || 4;
    await page.click('#mbd-body [data-act="bondGift"][data-c="ap_juqi"]');
    const g1 = await h.until(() => h.readW().then((w) => (w.bonds.xie === g0.bonds.xie + stepG ? w : null)));
    const g1f = g1 || await h.readW();
    T(g0.pills.ap_juqi === 3 && g1f.pills.ap_juqi === 2 && g1f.giftDayAbsent &&
      g1f.bonds.xie - g0.bonds.xie === stepG &&
      g1f.stones === g0.stones && g1f.ledger === g0.ledger,
      'B5 赠丹入账：库存 3→2 / 好感增量 === chip 标注 +4 / 日限字段已退役，且灵石与总账零流动',
      'pills ' + g0.pills.ap_juqi + '→' + g1f.pills.ap_juqi + ' aff ' + g0.bonds.xie + '→' + g1f.bonds.xie +
        ' giftDayAbsent=' + g1f.giftDayAbsent + ' stones ' + g0.stones + '→' + g1f.stones +
        ' ledgerSame=' + (g1f.ledger === g0.ledger));

    /* B6 日志：两次拜访与一次赠丹各落一条 cat 'bond'（引擎内记、视图不双写），且日志页「道友」筛选真能看到 */
    await page.evaluate(() => document.getElementById('modal-bonds').classList.add('hide'));
    await page.click('#m-tabbar button[data-v="journal"]');
    await page.waitForTimeout(400);
    await page.click('#tab-journal .chips button[data-act="logFilter"][data-v="bond"]');
    await page.waitForTimeout(400);
    const logs = await h.readLogs();
    const bondLogs = logs.filter((x) => x.cat === 'bond');
    const jTxt = await page.evaluate(() => (document.getElementById('tab-journal') || {}).innerText || '');
    const chipOn = await page.evaluate(() => {
      const b = document.querySelector('#tab-journal .chips button[data-v="bond"]');
      return b ? { on: /(^| )on/.test(b.className), label: (b.textContent || '').trim() } : null;
    });
    T(bondLogs.length >= 3 && bondLogs.every((x) => typeof x.text === 'string' && x.text.length > 0) &&
      !!chipOn && chipOn.on && jTxt.indexOf(nameXie) >= 0 && /登门拜访|以.+相赠/.test(jTxt),
      'B6 往来日志落 cat bond 且日志页「道友」筛选真可见（引擎内记、视图不双写）',
      'bondLogs=' + bondLogs.length + ' chip=' + JSON.stringify(chipOn) +
        ' hit=' + (jTxt.indexOf(nameXie) >= 0) + ' last=' + (bondLogs[bondLogs.length - 1] || {}).text);

    T(mp.errors.length === 0, 'B7 场景B 零页面报错', mp.errors.join(' | ').slice(0, 200) || 'clean');
    await mp.ctx.close();
  }

  /* ══════════════ 场景 C：无日限（GitHub issue #4 · 冻结时钟 ⇒ 全程同一个游戏日，连点不会被「跨日」蒙过去）══════════════ */
  {
    const S = seed({ at: Date.now(), ageMs: 5000, freeze: true });
    const mp = await mkPage(browser, S);
    const page = mp.page, h = wire(page);
    await page.click('#m-tabbar button[data-v="bonds"]');
    await page.waitForTimeout(450);
    await h.openDetail('xie');

    /* 日锚不靠猜：用引擎同一个 gameDayOf 现算，确认冻结后的 Date.now 全程停在 day = 5。
     * 这正是旧缺陷的照妖镜——旧日限在此刻必竞态（1 现实秒翻一天 ⇒ 计数永不累积、屏上恒显「今日 1/3」）。*/
    const c0 = await h.readW();
    const dayNow = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      return SQ.Alchemy.gameDayOf(s.worlds[s.profile.worldId], s.profile, Date.now());
    });
    /* C1 同一个游戏日里连赠三次黄丹：三次全部入账（+4×3），库存 3→0 即摘 chip，屏上无「今日 n/cap」计数 */
    for (let k = 0; k < 3; k++) {
      await page.click('#mbd-body [data-act="bondGift"][data-c="ap_juqi"]');
      await page.waitForTimeout(250);
    }
    const c1w = await h.until(() => h.readW().then((w) => (w.bonds.xie === c0.bonds.xie + 12 ? w : null)));
    const c1 = c1w || await h.readW();
    const dom1 = await page.evaluate(() => {
      const b = document.getElementById('mbd-body');
      const cs = Array.from(b.querySelectorAll('[data-act="bondGift"]'));
      return {
        keys: cs.map((x) => x.dataset.c), disN: cs.filter((x) => x.disabled).length,
        head: SQ.t('bond.gift.head', null, 'xiuxian'),
        txt: (b.textContent || '').replace(/\s+/g, ' ')
      };
    });
    T(dayNow === 5 && c1.bonds.xie - c0.bonds.xie === 12 && !c1.pills.ap_juqi && c1.giftDayAbsent &&
      dom1.keys.indexOf('ap_juqi') < 0 && dom1.keys.indexOf('juqi') >= 0 && dom1.disN === 0 &&
      /今日\s*\d+\s*\/\s*\d+/.test(dom1.txt) === false && dom1.head !== 'bond.gift.head' &&
      dom1.txt.indexOf(dom1.head) >= 0,
      'C1 issue #4 · 同一游戏日连赠三次全入账（+4×3=12）、丹尽即摘 chip、屏上再无「今日 n/cap」计数（head 取真词表值，seed 里的旧 giftDay 字段被 normalize 剪掉）',
      'day=' + dayNow + ' aff ' + c0.bonds.xie + '→' + c1.bonds.xie + ' pills=' + JSON.stringify(c1.pills) +
        ' keys=' + dom1.keys.join(',') + ' disN=' + dom1.disN);

    /* C2 撤销日限不等于放宽校验链：满档道友在同一个游戏日里依旧拒赠，且不扣丹 */
    const c2 = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = s.worlds[s.profile.worldId];
      const pack = SQ.Worlds[s.profile.worldId].pack;
      const before = w.alchemy.pills.ap_haina;
      const r = SQ.Bonds.giftPill(w, pack, pack.data, 'suwan', 'ap_haina', Date.now(), null);
      return { reason: r.reason, before: before, after: w.alchemy.pills.ap_haina };
    });
    T(c2.reason === 'max' && c2.before === 1 && c2.after === c2.before,
      'C2 无日限但校验链未放宽：满档者拒赠 reason max、丹纹丝不动', JSON.stringify(c2));

    T(mp.errors.length === 0, 'C3 场景C 零页面报错', mp.errors.join(' | ').slice(0, 200) || 'clean');
    await mp.ctx.close();
  }

  /* ══════════════ 场景 D：一次点击一条提示 + 点完按钮立刻进冷却（第十九批 · 用户报的两条）══════════════
   * 前置刻意「先切到道友页待满 3 秒再点开详情」：秒级 tick 会调 `renderBonds('tab')`，
   * 旧代码在那里顺手改写 `ui.bondsDest` ⇒ **浮层开着时容器归属被偷换成 'tab'**，拜访成功后
   * 那一次重渲渲到了背后的道友页上，屏上这颗按钮停在旧态（还亮着、点下去才吃一句冷却提示，
   * 要关掉重开才见倒计时）。同一次拜访引擎写一条日志、动作处又弹一条更具体的文案，
   * 旧的「文本全等」去重对不上 ⇒ 同一次动作两条提示。两条都是**摘掉修复即复现**的形状。 */
  {
    const S = seed({ karmaEventScore: 0 });
    const mp = await mkPage(browser, S);
    const page = mp.page, h = wire(page);
    await page.click('#m-tabbar button[data-v="bonds"]');
    await page.waitForTimeout(3000);                 /* 让 tick 至少跑满三轮（旧代码在这里被偷换归属）*/
    await h.openDetail('xie');
    const pre = await page.evaluate(() => {
      const b = document.querySelector('#mbd-body [data-act="bondVisit"]');
      return { live: !!b, txt: b ? (b.innerText || '').replace(/\s+/g, ' ') : '' };
    });
    await page.evaluate(() => { const b = document.querySelector('#mbd-body [data-act="bondVisit"]'); if (b) b.click(); });
    await page.waitForTimeout(1600);                 /* 给 tick 一次重复呈报的机会 */
    const post = await page.evaluate(() => ({
      toasts: Array.prototype.slice.call(document.querySelectorAll('#toasts .toast')).map(x => x.textContent),
      live: !!document.querySelector('#mbd-body [data-act="bondVisit"]'),
      body: (document.getElementById('mbd-body') || {}).textContent.replace(/\s+/g, ' '),
      modalOpen: !document.getElementById('modal-bonds').classList.contains('hide')
    }));
    T(pre.live && /登门拜访/.test(pre.txt),
      'D0 前置成立：道友页待满 3 秒后点开详情，拜访按钮此刻可点', JSON.stringify(pre));
    T(post.toasts.length === 1,
      'D1 一次拜访只弹一条提示（旧状：动作处一条 + tick 把日志末条再弹一条 = 两条）',
      JSON.stringify(post.toasts));
    T(post.modalOpen && !post.live && /后可再访/.test(post.body),
      'D2 不关浮层就刷新：按钮已转冷却倒计时（旧状：归属被 tick 偷换 ⇒ 重渲渲到背后页，按钮仍亮）',
      '浮层在=' + post.modalOpen + ' 按钮仍可点=' + post.live);
    T(mp.errors.length === 0, 'D3 场景D 零页面报错', mp.errors.join(' | ').slice(0, 200) || 'clean');
    await mp.ctx.close();
  }

  /* ══════════════ 场景 E：缘尽行（UI v2 B8 新结构）══════════════
   * 缘尽者不进「已结缘」，单独一段；身份仍不揭示、动作仍是赎回（bondDead）。
   * 先证反例会出现：锁一人（−99 哨兵）后首屏必须恰有一行缘尽，且全名录浮层里恰一枚 dead 格。 */
  {
    const S = seed();
    S.save.worlds.xiuxian.bonds.huang = -99;
    const mp = await mkPage(browser, S);
    const page = mp.page, h = wire(page);
    await page.click('#m-tabbar button[data-v="bonds"]');
    await page.waitForTimeout(450);
    const nameHuang = await page.evaluate(() => SQ.t('bond.huang.name', null, 'xiuxian'));
    const tabE = await page.evaluate(() => {
      const row = document.querySelector('#tab-bonds .brow.dead');
      const secs = Array.prototype.map.call(document.querySelectorAll('#tab-bonds .sechead .t'), (x) => x.textContent.trim());
      return {
        rows: document.querySelectorAll('#tab-bonds .brow.dead').length,
        act: row ? row.dataset.act : '', txt: row ? (row.textContent || '') : '',
        secs: secs
      };
    });
    T(tabE.rows === 1 && tabE.act === 'bondDead' && tabE.txt.indexOf(nameHuang) < 0 &&
      tabE.secs.some((x) => /缘\s*尽/.test(x)),
      'E1 缘尽者单独成段：首屏恰一行、动作 = 赎回、身份不揭示',
      'rows=' + tabE.rows + ' act=' + tabE.act + ' secs=' + tabE.secs.join('/') + ' leak=' + (tabE.txt.indexOf(nameHuang) >= 0));
    await page.evaluate(() => {
      const l = document.querySelector('#tab-bonds [data-act="openBonds"]');
      if (l) l.click();
    });
    await page.waitForTimeout(350);
    const modalE = await page.evaluate(() => ({
      pal: document.querySelectorAll('#mbd-body .pal').length,
      dead: document.querySelectorAll('#mbd-body .pal.dead').length
    }));
    T(modalE.pal === 58 && modalE.dead === 1,
      'E2 全名录浮层仍 58 格，缘尽格恰一枚（首屏收行不等于名录缩水）', JSON.stringify(modalE));
    T(mp.errors.length === 0, 'E3 场景E 零页面报错', mp.errors.join(' | ').slice(0, 200) || 'clean');
    await mp.ctx.close();
  }

  /* ══════════════ 场景 F：多道侣（册一百二十三批）══════════════
   * 口径：位卡列多位 + 「双修中 N」；道侣页行逐人 ♡；详情各显「已结缘」；
   * 择选浮层列出现任两位并排除他们；再提第三位能成交；屏上旧口径「同时仅一位」零命中。 */
  {
    const S = seed();
    const w = S.save.worlds.xiuxian;
    w.bonds.suwan = 100; w.bonds.xie = 100; w.bonds.shen = 100;
    w.spouses = [{ npcId: 'suwan', form: 'huzhu', since: S.at - 2000 },
      { npcId: 'xie', form: 'huzhu', since: S.at - 1000 }];
    const mp = await mkPage(browser, S);
    const page = mp.page, h = wire(page);
    await page.click('#m-tabbar button[data-v="bonds"]');
    await page.waitForTimeout(450);
    await page.click('#tab-bonds .seg2 button[data-v="spouse"]');
    await page.waitForTimeout(250);
    const tabF = await page.evaluate(() => {
      const slot = document.querySelector('#tab-bonds .slots2 .bondslot[data-act="spousePickOpen"]');
      return {
        slot: slot ? (slot.textContent || '').replace(/\s+/g, ' ') : '',
        hearts: document.querySelectorAll('#tab-bonds .brow .tierbadge.t1').length,
        body: (document.body.textContent || '').replace(/\s+/g, ' ')
      };
    });
    T(tabF.slot.indexOf('苏晚') >= 0 && tabF.slot.indexOf('谢青鸾') >= 0 &&
      tabF.slot.indexOf('双修中 2') >= 0 && tabF.hearts === 2,
      'F1 位卡列两位道侣 +「双修中 2」，道侣页逐人 ♡（不是只认一位）',
      'slot=' + tabF.slot.slice(0, 40) + ' hearts=' + tabF.hearts);
    T(tabF.body.indexOf('同时仅一位') < 0 && tabF.body.indexOf('同时只能与一位') < 0,
      'F2 屏上旧单人口径零命中', '旧句命中=' + /同时仅一位|同时只能与一位/.test(tabF.body));

    await h.openDetail('suwan');
    const dF = await h.detailTxt();
    T(dF.indexOf('互助双修') >= 0 && dF.indexOf('生效中') >= 0 && dF.indexOf('苏晚') >= 0,
      'F3 任一位道侣详情各显自己的形态与生效行', dF.slice(0, 60));

    await page.evaluate(() => document.getElementById('modal-bonds').classList.add('hide'));
    await page.evaluate(() => {
      const s = document.querySelector('#tab-bonds .slots2 .bondslot[data-act="spousePickOpen"]');
      if (s) s.click();
    });
    await page.waitForTimeout(300);
    const pickF = await page.evaluate(() => ({
      rows: document.querySelectorAll('#msp-body .spouserow').length,
      cands: Array.prototype.map.call(document.querySelectorAll('#msp-body [data-act="spousePickPropose"]'), (x) => x.dataset.v),
      txt: (document.getElementById('msp-body').textContent || '').replace(/\s+/g, ' ')
    }));
    T(pickF.rows === 2 && pickF.cands.indexOf('shen') >= 0 &&
      pickF.cands.indexOf('suwan') < 0 && pickF.cands.indexOf('xie') < 0,
      'F4 择选浮层列现任两位，候选只剩未结缘的满档者（同一位不重复上候选）',
      JSON.stringify({ rows: pickF.rows, cands: pickF.cands }));

    await page.click('#msp-body [data-act="spousePickPropose"][data-v="shen"]');
    await page.waitForTimeout(250);
    const proposeOpen = await page.evaluate(() => !document.getElementById('modal-propose').classList.contains('hide'));
    await page.click('#mpr-ok');
    await page.waitForTimeout(900);
    await page.evaluate(() => { const st = document.getElementById('spouse-stage'); if (st) st.click(); });
    const savedF = await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k) || 'null');
      const ww = s.worlds[s.profile.worldId];
      return { n: (ww.spouses || []).length, ids: (ww.spouses || []).map((x) => x.npcId).join(',') };
    }, KEY);
    const slotF = await page.evaluate(() => {
      const s = document.querySelector('#tab-bonds .slots2 .bondslot[data-act="spousePickOpen"]');
      return s ? (s.textContent || '').replace(/\s+/g, ' ') : '';
    });
    T(proposeOpen && savedF.n === 3 && savedF.ids === 'suwan,xie,shen' && slotF.indexOf('等 3 人') >= 0,
      'F5 第三位提亲成交：spouses 落为 3 条、位卡转「等 3 人」',
      JSON.stringify({ open: proposeOpen, n: savedF.n, ids: savedF.ids, slot: slotF.slice(0, 40) }));
    T(mp.errors.length === 0, 'F6 场景F 零页面报错', mp.errors.join(' | ').slice(0, 200) || 'clean');
    await mp.ctx.close();
  }

  console.log(fail === 0 ? 'UI_BONDS_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_BONDS_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); process.exit(2); });
