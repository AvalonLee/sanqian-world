/* .tests/verify-ui-wuxiasect.cjs — 武侠门派与市集走查（册217 · P4+P6）
 * 判门派页（名录拜师/师门面板/学艺）、市集页（货架/购买/研读）。
 * 独立 context 条件种档（册215 竞态教训）。
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
  const errs = [];

  const seedWuxia = (patch) => {
    const base = { qi: 300, stones: 500, realm: 0,
      artsKnown: ['quan_basic', 'neigong_basic'], artsLevels: { quan_basic: 1, neigong_basic: 1 },
      artsSlots: [], artsPractice: {}, shelf: [], sect: null, renown: 0,
      persona: { xia: 0, kuang: 0, du: 0 }, place: 'luoyang', visited: ['luoyang'],
      gear: { weapon: null, ranged: null, armor: null, boots: null },
      stash: [], relations: {}, injury: 0, worldDay: 0, exp: 2, debts: [],
      stamina: 60, atts: { zhi: 50, gu: 50, xing: 50 },
      lastSave: Date.now(), log: [], eventHistory: { lastId: null, seen: {}, feed: [] },
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

  /* SC0/SC1：门派名录 + 拜师真落档（种侠名 30 达正道门槛） */
  await runSeeded({ renown: 30, stamina: 60 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="sect"]');
    await p2.waitForTimeout(300);
    const s0 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      return { list: /少林/.test(t) && /武当/.test(t) && /正道/.test(t), joinBtns: document.querySelectorAll('#shell-main [data-join]').length };
    });
    T(s0.list && s0.joinBtns >= 26, 'SC0 门派名录（32 门上屏 ⇔ 阵营标 ⇔ 拜师钮 ≥26）',
      'list=' + s0.list + ' btns=' + s0.joinBtns);
    await p2.click('#shell-main [data-join="shaolin"]');
    await p2.waitForTimeout(400);
    const s1 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      return { sect: w.sect && w.sect.id, panel: /师门武学/.test(t), learnBtns: document.querySelectorAll('#shell-main [data-learn]').length };
    });
    T(s1.sect === 'shaolin' && s1.panel && s1.learnBtns >= 5, 'SC1 拜师真落档（sect=shaolin ⇔ 师门面板+学艺列表）',
      'sect=' + s1.sect + ' panel=' + s1.panel + ' learn=' + s1.learnBtns);
  });

  /* SC2/SC3：学艺真落档（种贡献 700）+ 市集购买（种银两） */
  await runSeeded({ renown: 30, stamina: 60, sect: { id: 'shaolin', rank: 3, contribution: 700, joinedAt: 0, betrayed: false }, stones: 60000 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="sect"]');
    await p2.waitForTimeout(300);
    const s2a = await p2.evaluate(() => document.querySelectorAll('#shell-main [data-learn]').length);
    await p2.click('#shell-main [data-learn]');
    await p2.waitForTimeout(400);
    const s2 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { known: w.artsKnown.length, contrib: w.sect.contribution };
    });
    T(s2a >= 5 && s2.known === 3 && s2.contrib < 700, 'SC2 学艺真落档（耗贡献 → artsKnown 增一部）',
      'known=' + s2.known + ' contrib=' + s2.contrib);

    await p2.click('#shell-main .wh-tabs button[data-v="shop"]');
    await p2.waitForTimeout(300);
    await p2.click('#shell-main [data-buy="shop_salve"]');
    await p2.waitForTimeout(400);
    const s3 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      return { stones: Math.floor(w.stones), shelfUi: /待研读秘籍/.test(t), list: /金疮药/.test(t) };
    });
    T(s3.list && s3.stones === 59950, 'SC3 市集真落档（货架 ⇔ 购买扣银 50 落盘）',
      'list=' + s3.list + ' stones=' + s3.stones);
  });

  /* SC4 · 研读秘籍：种 shelf → 市集页研读 → artsKnown 增 */
  await runSeeded({ renown: 30, stamina: 60, shelf: ['mnl_01'] }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="shop"]');
    await p2.waitForTimeout(300);
    await p2.click('#shell-main [data-study="mnl_01"]');
    await p2.waitForTimeout(400);
    const s4 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { shelf: w.shelf.length, known: (w.artsKnown || []).indexOf('yg_jiuyin') >= 0 };
    });
    T(s4.shelf === 0 && s4.known, 'SC4 研读真落档（shelf 出架 ⇔ 武学入 artsKnown）',
      'shelf=' + s4.shelf + ' known=' + s4.known);
  });

  T(errs.length === 0, 'SC5 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WS_ALL_GREEN ' : 'WS_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
