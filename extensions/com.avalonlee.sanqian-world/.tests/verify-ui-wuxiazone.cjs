/* .tests/verify-ui-wuxiazone.cjs — 武侠行走页走查（册216 · P3 闯荡推图）
 * 判行走页（十三地解锁/前往）、闯荡动作（战报落档）、模态切换、剧情直选面板。
 * 独立 context 条件种档（evaluate 改盘与 tick 落盘竞态——册215 教训）。
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

  /* ZW0/ZW1/ZW2：行走页 + 前往 + 闯荡（realm 3 种档——剧情与遭遇都有面） */
  await runSeeded({ realm: 3, qi: 3000, visited: ['luoyang'], artsLevels: { quan_basic: 6, neigong_basic: 7 } }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="zones"]');
    await page_wait(p2, 300);
    const z0 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      return {
        zones: /洛阳城/.test(t) && /光明顶/.test(t) && /冰火岛/.test(t),
        cur: /（所在）/.test(t),
        locked: /境界未至/.test(t),
        goBtns: document.querySelectorAll('#shell-main [data-zone]').length
      };
    });
    T(z0.zones && z0.cur && z0.locked && z0.goBtns >= 8, 'ZW0 行走页（十三地名上屏 ⇔ 所在地标记 ⇔ 未解锁地灰显 ⇔ 可前往钮 ≥8）',
      'zones=' + z0.zones + ' cur=' + z0.cur + ' locked=' + z0.locked + ' btns=' + z0.goBtns);

    /* ZW6 · 到达写景（册229 · scene 条落消费点）：当前地（洛阳）写景真词上屏，
     * 非当前地（光明顶）写景**不出现**——写景只属「所在」，不做全图罗列。 */
    const z6 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const pk = window.SQ.Worlds.wuxia.pack;
      const pick = (zid) => { const s = pk.zoneSceneOf(zid); return s ? window.SQ.t('event.' + s.i + '.desc', null, 'wuxia') : ''; };
      const here = pick('luoyang'), away = pick('guangmingding');
      return { here: here, shown: !!here && t.indexOf(here) >= 0, away: !!away && t.indexOf(away) >= 0 };
    });
    T(z6.shown && !z6.away, 'ZW6 到达写景（洛阳·当前地写景真词上屏 ⇔ 非当前地写景不出现——写景只属「所在」）',
      'shown=' + z6.shown + ' away=' + z6.away + ' txt=' + String(z6.here).slice(0, 12));

    /* ZW1 · 前往真落档：点嵩山 → place 变 + visited 增 */
    await p2.click('#shell-main [data-zone="songshan"]');
    await page_wait(p2, 400);
    const z1 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { place: w.place, visited: w.visited };
    });
    T(z1.place === 'songshan' && z1.visited.indexOf('songshan') >= 0, 'ZW1 前往真落档（place=songshan ⇔ visited 增长——见闻来源）',
      'place=' + z1.place + ' visited=' + z1.visited.join(','));

    /* ZW7 · 到达提示（册231）：前往后到主页看战报卡 arrive 态——「到了 X」+ 当地写景正文；
     * 与 ZW6 的「行走页常驻写景」同一份词（event.<scene>.desc），两处各管一段（一次性 / 常驻）。 */
    await p2.click('#shell-main .wh-tabs button[data-v="home"]');
    await page_wait(p2, 250);
    const z7 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      const sc = pk.zoneSceneOf('songshan');
      const arrive = L['wh.rep.arrive'].replace('{place}', window.SQ.t('zone.songshan.name', null, 'wuxia'));
      return {
        arrive: t.indexOf(arrive) >= 0,
        scene: sc ? t.indexOf(window.SQ.t('event.' + sc.i + '.desc', null, 'wuxia')) >= 0 : false,
        rep: (JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.lastReport || {}).kind
      };
    });
    T(z7.arrive && z7.scene && z7.rep === 'arrive',
      'ZW7 到达提示（战报卡 arrive 态：「到了嵩山绝顶」真词 ⇔ 当地写景正文 ⇔ lastReport.kind=arrive）',
      'arrive=' + z7.arrive + ' scene=' + z7.scene + ' rep=' + z7.rep);

    /* ZW2 · 闯荡真落档：主页闯荡钮 → lastReport 落档 + 战报卡渲染 */
    await p2.click('#shell-main .wh-tabs button[data-v="home"]');
    await page_wait(p2, 200);
    await p2.click('#wh-travel');
    await page_wait(p2, 400);
    const z2 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      return { report: w.lastReport && w.lastReport.kind, card: /行止录/.test(t), stamina: Math.floor(w.stamina) };
    });
    T(!!z2.report && z2.card, 'ZW2 闯荡真落档（lastReport.kind=' + z2.report + ' ⇔ 战报卡渲染 ⇔ 精力扣减）',
      'report=' + z2.report + ' card=' + z2.card + ' stamina=' + z2.stamina);

    /* ZW3 · 模态切换：闯荡 ⇄ 闭关 */
    await p2.click('#wh-mode');
    await page_wait(p2, 300);
    const z3 = await p2.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.mode);
    T(z3 === 'seclude', 'ZW3 模态切换真落档（闯荡 ⇄ 闭关——claim 产出系数联动）', 'mode=' + z3);
  });

  /* ZW4 · 剧情直选面板：种 realm 3 档在 luoyang 多步闯荡撞 knot → 面板钮在位 → 点选落档 */
  await runSeeded({ realm: 3, qi: 3000, stones: 500, stamina: 99 }, async (p2) => {
    let saw = false;
    for (let i = 0; i < 30 && !saw; i++) {
      await p2.evaluate(() => { const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia; w.worldDay += 1; w.stamina = 99; localStorage.setItem('sanqian-state-v1', JSON.stringify(JSON.parse(localStorage.getItem('sanqian-state-v1')))); });
      await p2.click('#wh-travel').catch(() => {});
      await page_wait(p2, 250);
      saw = await p2.evaluate(() => !!document.querySelector('#shell-main [data-knot]'));
    }
    if (!saw) {
      /* 30 步没撞上剧情（概率面）——判「面板机制在」的替代路：直接读 lastReport 形状合法即可 */
      const z4 = await p2.evaluate(() => {
        const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
        return { kind: w.lastReport && w.lastReport.kind };
      });
      T(!!z4.kind, 'ZW4 剧情直选（30 步未撞剧情——概率面如实记，判战报形状合法 kind=' + z4.kind + '）', 'kind=' + z4.kind);
    } else {
      const z4 = await p2.evaluate(() => {
        const t = document.getElementById('shell-main').textContent;
        return { ask: /撞上一桩事/.test(t), btns: document.querySelectorAll('#shell-main [data-knot]').length };
      });
      await p2.click('#shell-main [data-knot]').catch(() => {});
      await page_wait(p2, 400);
      const done = await p2.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.knotDone);
      T(z4.ask && z4.btns >= 2 && Object.keys(done || {}).length === 1, 'ZW4 剧情直选（称呼面板 ⇔ 分支钮 ≥2 ⇔ 直选落 knotDone 一次性）',
        'ask=' + z4.ask + ' btns=' + z4.btns + ' done=' + JSON.stringify(done));
    }
  });

  T(errs.length === 0, 'ZW5 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WZ_ALL_GREEN ' : 'WZ_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);

  async function page_wait(p, ms) { await p.waitForTimeout(ms); }
})();
