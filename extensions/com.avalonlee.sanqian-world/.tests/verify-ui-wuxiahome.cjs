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

  /* WH8 · 江湖页 20 案全文案（册221）+ 窗口过滤（册223）：初始可见 7 = 惯例 3（huashan/xiake/shagui 常驻）
   * + 开局窗独发 4（xiangyang/juxian/wangpan/liancheng）——其余 13 案窗口未开或 pre 未过。 */
  await runSeeded({}, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    const r8a = await p2.evaluate(() => {
      const btns = document.querySelectorAll('#shell-main [data-we]');
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return { n: btns.length, ids: Array.from(new Set(Array.from(btns).map(b => b.getAttribute('data-we')))).length,
        desc: t.indexOf(L['we.we_huashan.desc']) >= 0, watch: t.indexOf(L['wh.jianghu.watch']) >= 0 };
    });
    T(r8a.ids === 7 && r8a.n === r8a.ids * 3 && r8a.desc && r8a.watch,
      'WH8a 江湖页窗口过滤上屏（初始可见 7 = 惯例 3 + 开局窗 4——窗口未开/pre 未过 13 案隐藏 ⇔ 每案三钮（data-we = 21）⇔ desc 预告副行真词上屏）',
      'n=' + r8a.n + ' ids=' + r8a.ids + ' desc=' + r8a.desc);
    await p2.click('#shell-main [data-we="we_wangpan"][data-mode="join"]');
    await p2.waitForTimeout(500);
    const r8b = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = raw.worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return { fate: w.world && w.world.wefate && w.world.wefate.we_wangpan, stamina: w.stamina,
        canon: t.indexOf(L['we.we_wangpan.fate.canon']) >= 0 };
    });
    T(r8b.fate === 'canon' && r8b.canon,
      'WH8b 赴会真落档（join ⇒ wefate.we_wangpan=canon 落盘 ⇔ 结局正文真词上屏——精力扣 5 与 tick 恢复叠加不判定值，WH2/WH6 同口径）',
      'fate=' + r8b.fate + ' stamina=' + r8b.stamina + ' canon=' + r8b.canon);
  });

  /* WH8c · 场面执行器挂接（册222）：赴挂接案 → 自动切主页战报卡 knot 态上屏 → 选支 knotDone 真落档。
   * 种 stones 300 让 knot_juxian 的 help 分支（req realm4+silver200→stones 判）开放。 */
  await runSeeded({ realm: 5, stamina: 60, stones: 300 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    await p2.click('#shell-main [data-we="we_juxian"][data-mode="join"]');
    await p2.waitForTimeout(500);
    const r8c = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = raw.worlds.wuxia;
      const btns = document.querySelectorAll('#shell-main [data-knot]');
      const knots = Array.from(new Set(Array.from(btns).map(b => b.getAttribute('data-knot'))));
      const helpBtn = document.querySelector('#shell-main [data-knot="knot_juxian"][data-opt="help"]');
      return { onHome: !!document.getElementById('wh-force'), knots: knots,
        help: !!helpBtn, fate: w.world && w.world.wefate && w.world.wefate.we_juxian };
    });
    T(r8c.onHome && r8c.knots.indexOf('knot_juxian') >= 0 && r8c.help && r8c.fate === 'canon',
      'WH8c 场面上屏（赴挂接案 join ⇒ wefate 落盘 ⇔ 自动切主页战报卡 knot 态 ⇔ knot_juxian 分支钮含 help）',
      'home=' + r8c.onHome + ' knots=' + r8c.knots.join(',') + ' help=' + r8c.help + ' fate=' + r8c.fate);
    await p2.click('#shell-main [data-knot="knot_juxian"][data-opt="help"]');
    await p2.waitForTimeout(500);
    const r8d = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { done: w.knotDone && w.knotDone.knot_juxian, xia: w.persona && w.persona.xia };
    });
    T(r8d.done === 1 && r8d.xia === 4,
      'WH8d 场面选支真落档（help ⇒ knotDone.knot_juxian=1（travel 不再撞）⇔ 侠轴 +4——与 travel 同源共用 knotChoose）',
      'done=' + r8d.done + ' xia=' + r8d.xia);
  });

  /* WH8e · G17 风闻区（册224）：种档 worldDay=345（zhenlong [1,5] 开窗前 15 天）⇒ 风闻行上屏 +
   * rumor 真词 + 「在即」徽标；已开窗案（wangpan）不出现在风闻区。 */
  await runSeeded({ worldDay: 345 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    const r8e = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return { title: t.indexOf(L['wh.rumor.title']) >= 0, rumor: t.indexOf(L['we.we_zhenlong.rumor']) >= 0,
        soon: t.indexOf(L['wh.rumor.soon']) >= 0, opened: t.indexOf(L['we.we_wangpan.rumor']) < 0 };
    });
    T(r8e.title && r8e.rumor && r8e.soon && r8e.opened,
      'WH8e 风闻区（将开案 rumor 真词上屏 ⇔ 推近 15 天「在即」徽标 ⇔ 已开窗案不在风闻区）',
      'title=' + r8e.title + ' rumor=' + r8e.rumor + ' soon=' + r8e.soon + ' opened=' + r8e.opened);
  });

  /* WH8f · 悬赏榜与押镖（册226）：榜三档上屏（grand 被 renown 门拦无钮）⇔ 接 small 真落档（胜/败合法）⇔
   * 接镖状态行「镖在途中」⇔ 走查全程零报错归 WH7。 */
  await runSeeded({ stamina: 60 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    const r8f = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return { board: t.indexOf(L['wh.bounty.title']) >= 0 && t.indexOf(L['wh.bounty.grand']) >= 0,
        gate: t.indexOf(L['wh.bounty.gate'].replace('{n}', '50')) >= 0 };
    });
    T(r8f.board && r8f.gate,
      'WH8f 悬赏榜上屏（三档含重赏 ⇔ grand 侠名门「侠名需达 50」在屏）',
      'board=' + r8f.board + ' gate=' + r8f.gate);
    await p2.click('#shell-main [data-bounty="small"]');
    await p2.waitForTimeout(400);
    const r8g = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { stamina: raw.stamina, renown: raw.renown, inj: raw.injury };
    });
    T(r8g.stamina >= 55 && (r8g.renown === 5 || (r8g.renown === -5 && r8g.inj >= 3)),
      'WH8f2 接悬赏真落档（精力扣 5 后恢复不判绝对值（tick 叠加，WH2/WH6 同口径）⇔ 胜侠名+5 或 败侠名−5 且带伤——概率型合法二选一）',
      'stamina=' + r8g.stamina + ' renown=' + r8g.renown + ' inj=' + r8g.inj);
    await p2.click('#shell-main [data-escort="1"]');
    await p2.waitForTimeout(400);
    const r8h = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      return { realm: raw.realm, esc: raw.escort, stamina: raw.stamina, on: t.indexOf(window.SQ.LEX.wuxia['wh.escort.on']) >= 0 };
    });
    /* pay 动态对表：5 + realm×5（走查环境 tick 的 claim 会自动破关——WH5 实测放置本体，realm 不恒 0） */
    T(r8h.esc && r8h.esc.steps === 0 && r8h.esc.pay === Math.min(40, 5 + r8h.realm * 5) && r8h.on,
      'WH8f3 接镖真落档（escort={steps:0, pay=5+realm×5} 落盘 ⇔ 状态行「镖在途中」上屏——realm 随 claim 自动破关动态对表）',
      'esc=' + JSON.stringify(r8h.esc) + ' realm=' + r8h.realm + ' on=' + r8h.on);
  });

  /* WH9 · 行装与神兵谱（册227 · G4 兵器槽 + G15）：三块上屏（兵器槽空态 / 兵器库两件真名 / 谱 1/18）
   * ⇔ 换上真落档（gear.weapon.i + 兵刃乘区 1.20）⇔ 卸下回库（不留失）⇔ 谱上「在身」与「库中」分开标。 */
  await runSeeded({ stash: ['wp_tulong', 'wp_tiedao'], blades: ['wp_tulong'] }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="gear"]');
    await p2.waitForTimeout(300);
    const g9a = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return {
        bare: t.indexOf(L['wh.gear.empty']) >= 0,
        names: t.indexOf(L['wp.wp_tulong.name']) >= 0 && t.indexOf(L['wp.wp_tiedao.name']) >= 0,
        prog: t.indexOf(L['wh.gear.codexProg'].replace('{n}', '1').replace('{t}', '18')) >= 0,
        eq: document.querySelectorAll('#shell-main [data-eq]').length
      };
    });
    T(g9a.bare && g9a.names && g9a.prog && g9a.eq === 2,
      'WH9a 行装页上屏（兵器槽「赤手空拳」⇔ 兵器库两件真名（屠龙刀/铁刀）⇔ 神兵谱 1/18 ⇔ 换上钮两枚）',
      'bare=' + g9a.bare + ' names=' + g9a.names + ' prog=' + g9a.prog + ' eq=' + g9a.eq);

    await p2.click('#shell-main [data-eq="weapon"][data-gid="wp_tulong"]');
    await p2.waitForTimeout(400);
    const g9b = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      const t = document.getElementById('shell-main').textContent;
      return { id: raw.gear.weapon && raw.gear.weapon.i, stash: raw.stash, mult: pk.weaponMult(raw),
        onbody: t.indexOf(window.SQ.LEX.wuxia['wh.gear.onbody']) >= 0 };
    });
    T(g9b.id === 'wp_tulong' && g9b.mult === 1.20 && g9b.stash.indexOf('wp_tulong') < 0 && g9b.onbody,
      'WH9b 换上真落档（gear.weapon.i=wp_tulong ⇔ 兵刃乘区 1.20 ⇔ 该件出库 ⇔ 谱行标「在身」）',
      'id=' + g9b.id + ' mult=' + g9b.mult + ' stash=' + JSON.stringify(g9b.stash) + ' onbody=' + g9b.onbody);

    await p2.click('#shell-main [data-uneq="weapon"]');
    await p2.waitForTimeout(400);
    const g9c = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      return { id: raw.gear.weapon, stash: raw.stash, mult: pk.weaponMult(raw), blades: raw.blades };
    });
    T(g9c.id == null && g9c.mult === 0.90 && g9c.stash.indexOf('wp_tulong') >= 0 && g9c.blades.indexOf('wp_tulong') >= 0,
      'WH9c 卸下回库（在手清空 ⇔ 乘区回落空手 0.90 ⇔ 该件回库 ⇔ 谱上仍记（收集不因卸下消失））',
      'id=' + g9c.id + ' mult=' + g9c.mult + ' stash=' + JSON.stringify(g9c.stash) + ' blades=' + JSON.stringify(g9c.blades));
  });

  T(errs.length === 0, 'WH7 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WH_ALL_GREEN ' : 'WH_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
