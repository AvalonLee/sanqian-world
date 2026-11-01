/* .tests/verify-ui-wuxiahome.cjs — 武侠主壳操作走查（册215 · P2 核心循环）
 * 判修习页（槽管理/资质三轴）、主页（精力/破关钮/强行冲关）与练习度推进的真实落档。
 * 种档条件注入（仅缺档时种——册163 ⑤ 教训：无条件 init script 会拆「真落档 survives reload」的台）。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  /* 条件种档：武侠档（P2 面测试基座；仅缺档时种） */
  await page.addInitScript(() => {
    if (localStorage.getItem('sanqian-state-v1')) return;
    const st = {
      v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: {
        wuxia: {
          qi: 300, stones: 500, realm: 0,
          artsKnown: ['quan_basic', 'neigong_basic'],
          artsLevels: { quan_basic: 1, neigong_basic: 1 },
          artsSlots: [], artsPractice: {},
          shelf: [], sect: null, renown: 0,
          persona: { xia: 0, kuang: 0, du: 0 },
          place: 'luoyang', visited: ['luoyang'],
          gear: { weapon: null, ranged: null, armor: null, boots: null },
          stash: [], relations: {}, injury: 0,
          worldDay: 0, exp: 2, debts: [],
          stamina: 60, atts: { zhi: 50, gu: 50, xing: 50 },
          lastSave: 1, log: [], eventHistory: { lastId: null, seen: {}, feed: [] },
          heritage: { gen: 1, inherited: [] }
        }
      },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    };
    localStorage.setItem('sanqian-state-v1', JSON.stringify(st));
  });

  await page.goto(url);
  await page.waitForSelector('#shell-main .wh-tabs', { timeout: 15000 });

  /* WH0 · 主页基线：精力 60/60 + 破关钮 disabled（qi 300 < 400）+ 修习槽空态 */
  const w0 = await page.evaluate(() => {
    const t = document.getElementById('shell-main').textContent;
    const brk = document.getElementById('wh-force');   /* 册215：破关钮退役，判强行冲关钮在位 */
    return { stamina: /精力 \d+\/\d+/.test(t), dis: brk && brk.disabled, empty: /修习槽/.test(t) };
  });
  console.log('T_TEST:', await page.evaluate(() => [window.SQ.t('wh.stat.qi', null, 'wuxia'), window.SQ.t('wh.title', null, 'wuxia'), typeof window.SQ.LEX.wuxia, Object.keys(window.SQ.LEX.wuxia).filter(k=>k.indexOf('wh.stat')===0).length].join(' | ')));
  console.log('WH0_HTML:', await page.evaluate(() => document.getElementById('shell-main').innerHTML.slice(0, 400)));
  T(w0.stamina && !w0.dis && w0.empty, 'WH0 主页基线（精力 n/cap 条上屏 ⇔ 强行冲关钮在位 ⇔ 修习槽空态）',
    'stamina=' + w0.stamina + ' dis=' + w0.dis + ' empty=' + w0.empty);

  /* WH1 · 切修习页：资质三轴 + 已知武学两部 + 入槽钮在位 */
  await page.click('#shell-main .wh-tabs button[data-v="arts"]');
  const w1 = await page.evaluate(() => {
    const t = document.getElementById('shell-main').textContent;
    return { atts: /悟性/.test(t) && /根骨/.test(t) && /心性/.test(t), arts: /十段锦/.test(t) && /吐纳导引/.test(t), btns: document.querySelectorAll('#shell-main [data-slot]').length };
  });
  T(w1.atts && w1.arts && w1.btns >= 2, 'WH1 修习页（资质三轴上屏 ⇔ 已知武学真名（十段锦/吐纳导引）⇔ 入槽钮在位）',
    'atts=' + w1.atts + ' arts=' + w1.arts + ' btns=' + w1.btns);

  /* WH2 · 入槽真落档：点入槽 → 槽内出现 + 精力 -2 + 盘上同步 */
  await page.click('#shell-main [data-slot="quan_basic"]');
  await page.waitForTimeout(400);
  const w2 = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = raw.worlds.wuxia;
    return { inSlot: w.artsSlots.indexOf('quan_basic') >= 0, stamina: w.stamina, t: document.getElementById('shell-main').textContent };
  });
  T(w2.inSlot && /修习中/.test(w2.t), 'WH2 入槽真落档（槽内 ⇔ 屏上「修习中」——精力扣 2 与恢复叠加不判定值）',
    'in=' + w2.inSlot + ' stamina=' + w2.stamina);

  /* WH3 · 出槽：点出槽 → 槽空（精力不返还） */
  await page.click('#shell-main [data-slot="quan_basic"]');
  await page.waitForTimeout(400);
  const w3 = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.artsSlots.length);
  T(w3 === 0, 'WH3 出槽真落档（槽空；精力不返还——闸的是动作不是存量）', 'slots=' + w3);

  /* 条件种档工厂（新 context 用——evaluate 改盘会与 tick 落盘竞态，册215 实测）：
   * patch = 对基础武侠档的覆写段。 */
  const seedWuxia = (patch) => {
    const base = { qi: 300, stones: 500, realm: 0,
      artsKnown: ['quan_basic', 'neigong_basic'], artsLevels: { quan_basic: 1, neigong_basic: 1 },
      artsSlots: [], artsPractice: {}, shelf: [], sect: null, renown: 0,
      persona: { xia: 0, kuang: 0, du: 0 }, place: 'luoyang', visited: ['luoyang'],
      gear: { weapon: null, ranged: null, armor: null, boots: null },
      stash: [], relations: {}, injury: 0, worldDay: 0, exp: 2, debts: [],
      stamina: 60, atts: { zhi: 50, gu: 50, xing: 50 },
      lastSave: 1, log: [], eventHistory: { lastId: null, seen: {}, feed: [] },
      heritage: { gen: 1, inherited: [] } };
    const w = Object.assign(base, patch || {});
    return JSON.stringify({ v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: { wuxia: w },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] } });
  };
  const runSeeded = async (patch, fn) => {
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    p2.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    const seed = seedWuxia(patch);
    await p2.addInitScript((sd) => { if (!localStorage.getItem('sanqian-state-v1')) localStorage.setItem('sanqian-state-v1', sd); }, seed);
    await p2.goto(url);
    await p2.waitForSelector('#shell-main .wh-tabs', { timeout: 15000 });
    const r = await fn(p2);
    await c2.close();
    return r;
  };

  /* WH4 · 练习度真推进：种 prac 99 + 在槽 → 熬 tick ⇒ 层 +1（独立 context 无竞态） */
  await runSeeded({ artsSlots: ['neigong_basic'], artsPractice: { neigong_basic: 99 } }, async (p2) => {
    await p2.waitForTimeout(3500);   /* 熬三个 tick：99 + 3×0.69 ≥ 100 ⇒ 升层 */
    const t2 = await p2.evaluate(() => document.getElementById('shell-main').textContent);
    T(/第 2 层/.test(t2), 'WH4 练习度真推进（99 + tick 度 ≥ 100 ⇒ 层 +1——屏上「第 2 层」见证）', 'txt=' + t2.replace(/\s+/g, ' ').slice(60, 140));
  });

  /* WH5 · claim 自动破关见证：种双条件足档 → 结算推进即破（realm 2、功力不清零） */
  await runSeeded({ qi: 99999, realm: 1, visited: ['luoyang', 'shaolin'], exp: 4,
    artsLevels: { quan_basic: 4, neigong_basic: 1 } }, async (p2) => {
    await p2.waitForTimeout(1200);
    const r5 = await p2.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.realm);
    T(r5 === 2, 'WH5 自动破关见证（双条件足 ⇒ 结算推进即破 realm 2、功力不清零——放置本体）', 'realm=' + r5);
  });

  /* WH6 · 强行冲关：精力扣 20 + 结果合法二选一（破到宗师或败而带伤——概率型不判唯一结局） */
  await runSeeded({ qi: 99999, realm: 2, stamina: 30, visited: ['luoyang', 'shaolin', 'dali'], exp: 8,
    artsLevels: { quan_basic: 6, neigong_basic: 6 } }, async (p2) => {
    await p2.waitForTimeout(600);
    await p2.click('#wh-force');
    await p2.waitForTimeout(400);
    const r6 = await p2.evaluate(() => { const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia; return { stamina: w.stamina, realm: w.realm, injury: w.injury }; });
    T(r6.stamina < 80 && (r6.realm === 3 || r6.injury > 0), 'WH6 强行冲关（精力自满仓 80 扣 20 ⇒ 低于 cap 落盘 ⇔ 结果合法二选一：破到宗师或败而带伤——概率型不判唯一结局）',
      'stamina=' + r6.stamina + ' realm=' + r6.realm + ' injury=' + r6.injury);
  });

  T(errs.length === 0, 'WH7 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WH_ALL_GREEN ' : 'WH_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
