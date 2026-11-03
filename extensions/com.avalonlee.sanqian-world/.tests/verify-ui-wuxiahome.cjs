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
          lastSave: Date.now(), log: [], eventHistory: { lastId: null, seen: {}, feed: [] },
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

  /* WH4 · 练习度真推进：种 prac 99.9 + 在槽 → 熬 tick ⇒ 层 +1（独立 context 无竞态） */
  await runSeeded({ artsSlots: ['neigong_basic'], artsPractice: { neigong_basic: 99.9 } }, async (p2) => {
    await p2.waitForTimeout(3500);   /* 熬三个 1s tick：99.9 + 3×0.07 ≥ 100 ⇒ 升层 */
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
  await runSeeded({ realm: 1 }, async (p2) => {
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

  /* WH8h · 旁观一次性（册235）：旁观后同案本届旁观钮置灰「已旁观」⇔ 不写 wefate（在场不落子） */
  await runSeeded({ realm: 1, stamina: 60 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    await p2.click('#shell-main [data-we="we_wangpan"][data-mode="watch"]');
    await p2.waitForTimeout(500);
    const h8 = await p2.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const b = document.querySelector('#shell-main [data-we="we_wangpan"][data-mode="watch"]');
      const L = window.SQ.LEX.wuxia;
      return { seen: raw.world && raw.world.wseen && raw.world.wseen.we_wangpan,
        fate: raw.world && raw.world.wefate && raw.world.wefate.we_wangpan,
        off: !!b && b.disabled, label: b ? b.textContent : '' , want: L['wh.jianghu.watched'] };
    });
    T(h8.seen === '1' && !h8.fate && h8.off && h8.label === h8.want,
      'WH8h 旁观一次性（wseen.we_wangpan=1 落盘 ⇔ wefate 不写 ⇔ 钮置灰且文案「已旁观」）',
      'seen=' + h8.seen + ' fate=' + h8.fate + ' off=' + h8.off + ' label=' + h8.label);
  });

  /* WH8i · 地界侧事件入口（册235）：所在洛阳（year 3，聚贤庄窗内）⇒ 行走页「此地有大事」+ 跳江湖页 */
  await runSeeded({ place: 'luoyang', worldDay: 3 * 360 + 1 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="zones"]');
    await p2.waitForTimeout(300);
    const h9 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return { here: t.indexOf(L['we.we_juxian.name']) >= 0 && t.indexOf(L['wh.zone.weHere'].split('{')[0]) >= 0,
        go: !!document.querySelector('#shell-main [data-we-go]') };
    });
    await p2.click('#shell-main [data-we-go]');
    await p2.waitForTimeout(300);
    const h9b = await p2.evaluate(() => {
      const on = (document.querySelector('#shell-main .wh-tabs button.on') || {}).textContent;
      return { on: on,
        tab: on === window.SQ.LEX.wuxia['wh.tab.jianghu'],
        row: !!document.querySelector('#shell-main [data-we="we_juxian"][data-mode="join"]') };
    });
    T(h9.here && h9.go && h9b.row && h9b.tab,
      'WH8i 地界事件入口（洛阳所在行挂「此地有大事：聚贤庄」⇔ 「往江湖页」钮切到江湖页 ⇔ 聚贤庄三钮在屏）',
      'here=' + h9.here + ' go=' + h9.go + ' on=' + h9b.on + ' row=' + h9b.row);
  });

  /* WH8j · 江湖格局展示面（册236）：种写回三面 ⇒ 江湖页「人物去向 / 门派声望 / 余波」真词上屏 */
  await runSeeded({ realm: 1, world: { wefate: {}, wecyc: {}, wseen: {},
    wbcast: { xiao_feng: 'dead' }, wbsect: { gaibang: -20 }, wafter: ['we_yanmen:canon'] } }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    const wbj = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      return {
        title: t.indexOf(L['wh.jianghu.wb']) >= 0,
        cast: t.indexOf(L['cast.xiao_feng.name']) >= 0 && t.indexOf(L['wh.castState.dead']) >= 0,
        sect: t.indexOf(L['sect.gaibang.name']) >= 0 && t.indexOf(L['wh.jianghu.rep'].replace('{n}', '-20')) >= 0,
        after: t.indexOf(L['we.we_yanmen.wb.canon']) >= 0,
        state: pk.castStateOf(w, 'xiao_feng'), rep: pk.sectRepOf(w, 'gaibang')
      };
    });
    T(wbj.title && wbj.cast && wbj.sect && wbj.after && wbj.state === 'dead' && wbj.rep === -20,
      'WH8j 江湖格局上屏（人物去向「乔峰·身死」⇔ 丐帮「声望 -20」⇔ 余波句真词 ⇔ pack 读数对表）',
      'title=' + wbj.title + ' cast=' + wbj.cast + ' sect=' + wbj.sect + ' after=' + wbj.after + ' state=' + wbj.state + ' rep=' + wbj.rep);
  });

  /* WH8k · 赴会须到场（册239）：人在少林、聚贤庄在洛阳 ⇒ 行内「须往洛阳（精力 3）」；
   * 点 join ⇒ 自动赶路落 place=luoyang + 结局写回（精力扣本档+脚程，与 tick 恢复叠加不判绝对值）。 */
  await runSeeded({ realm: 6, stamina: 60, worldDay: 3 * 360 + 1, place: 'shaolin' }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    const r8k = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return { away: t.indexOf(L['wh.jianghu.away'].replace('{place}', L['zone.luoyang.name'])) >= 0 };
    });
    await p2.click('#shell-main [data-we="we_juxian"][data-mode="join"]');
    await p2.waitForTimeout(500);
    const r8k2 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { place: w.place, stamina: Math.floor(w.stamina), fate: w.world && w.world.wefate && w.world.wefate.we_juxian,
        visited: (w.visited || []).indexOf('luoyang') >= 0 };
    });
    T(r8k.away && r8k2.place === 'luoyang' && r8k2.stamina < 60 && r8k2.fate === 'canon' && r8k2.visited,
      'WH8k 赴会须到场（「须往洛阳（精力 3）」真词 ⇔ 点 join 自动赶路 place=luoyang ⇔ 精力扣脚程 ⇔ wefate 写回）',
      'away=' + r8k.away + ' place=' + r8k2.place + ' stamina=' + r8k2.stamina + ' fate=' + r8k2.fate + ' visited=' + r8k2.visited);
  });

  /* WH8c · 场面执行器挂接（册222）：赴挂接案 → 自动切主页战报卡 knot 态上屏 → 选支 knotDone 真落档。
   * 种 stones 300 让 knot_juxian 的 help 分支（req realm4+silver200→stones 判）开放。 */
  /* 种档 realm 8（册231 起 join 是对赌：realm 5 对萧峰约四成败，败则无戏 ⇒ 走查会随机红；
   * 抬到 realm 8 使胜率 ~99%，同时仍满足 knot_juxian help 分支的 realm4 + silver200 门槛） */
  await runSeeded({ realm: 8, stamina: 60, stones: 300 }, async (p2) => {
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

  /* WH8g · 主导对赌（册228）：主导钮在位 + 「对上谁」线索上屏 ⇔ 点下 → 结果合法三选一
   * （canon / alt / lose 落档）⇔ 自动切主页战报卡 duel 态 ⇔ 胜出奖励行 / 败出力战而竭行真词上屏。 */
  await runSeeded({ realm: 6, stamina: 99, worldDay: 0 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
    await p2.waitForTimeout(300);
    const g8 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const foeName = window.SQ.t('cast.xiao_feng.name', null, 'wuxia');
      return {
        btn: !!document.querySelector('#shell-main [data-we="we_juxian"][data-mode="lead"]'),
        foe: t.indexOf(L['wh.jianghu.lead.foe'].replace('{name}', foeName)) >= 0
      };
    });
    T(g8.btn && g8.foe, 'WH8g 主导门槛与对手线索上屏（we_juxian 主导钮在位 ⇔ 「主导须对上萧峰」真词）',
      'btn=' + g8.btn + ' foe=' + g8.foe);

    await p2.click('#shell-main [data-we="we_juxian"][data-mode="lead"]');
    await p2.waitForTimeout(600);
    const g8b = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const evName = window.SQ.t('we.we_juxian.name', null, 'wuxia');
      const fate = w.world && w.world.wefate && w.world.wefate.we_juxian;
      return {
        fate: fate,
        home: !!document.getElementById('wh-force'),
        rep: w.lastReport && w.lastReport.kind,
        winLine: t.indexOf(L['wh.rep.duel.win'].replace('{ev}', evName)) >= 0,
        loseLine: t.indexOf(L['wh.rep.duel.lose'].split('（内伤')[0].replace('{ev}', evName)) >= 0,
        rewardLine: t.indexOf(L['wh.reward.art'].split('{name}')[0]) >= 0 || t.indexOf(L['wh.reward.art.up'].split('{name}')[0]) >= 0
      };
    });
    const legal = g8b.fate === 'canon' || g8b.fate === 'alt' || g8b.fate === 'lose';
    const lineOk = g8b.fate === 'lose' ? g8b.loseLine : (g8b.winLine && g8b.rewardLine);
    T(legal && g8b.home && g8b.rep === 'duel' && lineOk,
      'WH8g2 主导结果真落档（wefate ∈ canon/alt/lose 合法三选一 ⇔ 自动切主页战报卡 duel 态 ⇔ 胜出主奖励行 / 败出力战而竭行真词）',
      'fate=' + g8b.fate + ' home=' + g8b.home + ' rep=' + g8b.rep + ' 胜行=' + g8b.winLine + ' 败行=' + g8b.loseLine + ' 奖=' + g8b.rewardLine);
  });

  /* WH10 · 拾遗行（册229 · gain 条落消费点）：种档直给一条带 gain 的战报 —— 判「展示面能吃 gain」
   * （概率面由冒烟 E29 的 300 日真命中覆盖，此处不掷骰）。 */
  await runSeeded({ lastReport: { kind: 'quiet', place: 'luoyang', scene: 1, gain: 'ev_053', loot: 12 } }, async (p2) => {
    await p2.waitForTimeout(500);
    const g10 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const want = L['wh.rep.gain'].replace('{place}', window.SQ.t('zone.luoyang.name', null, 'wuxia')).replace('{loot}', '12');
      return { shown: t.indexOf(want) >= 0, quiet: !!document.getElementById('wh-force') };
    });
    T(g10.shown && g10.quiet, 'WH10 拾遗战斗报卡（quiet 态 + gain 字段 ⇒ 「在洛阳城拾得 12 文」真词上屏）',
      'shown=' + g10.shown + ' home=' + g10.quiet);
  });

  /* WH15 · 隐世传功行（册242 · 武学全录 §八）：种档直给一条带 teach 的战报 —— 判展示面；
   * 概率面与入档面由冒烟 E42 真入口覆盖，此处不掷骰。 */
  await runSeeded({ lastReport: { kind: 'quiet', place: 'luoyang', scene: 1, teach: 'yg_hama' } }, async (p2) => {
    await p2.waitForTimeout(500);
    const g15 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const want = L['wh.rep.teach'].replace('{name}', window.SQ.t('art.yg_hama.name', null, 'wuxia'));
      return { shown: t.indexOf(want) >= 0, quiet: t.indexOf(L['wh.rep.quiet'].split('{place}')[0]) >= 0 };
    });
    T(g15.shown && g15.quiet, 'WH15 隐世传功报卡（quiet 态 + teach 字段 ⇒ 「传了一套『蛤蟆功』」真词上屏）',
      'shown=' + g15.shown + ' quiet=' + g15.quiet);
  });

  /* WH9d/9e · 行头三槽（册230）：四槽齐 + 口径注上屏 ⇔ 装快靴真落档且**战力乘区不动**
   * （三槽只动判定——界面侧也钉这条，免得日后有人把行头接进 powerOf）。 */
  await runSeeded({ stash: ['gm_xiujian', 'gm_ruanjia', 'gm_kuaixue'], stones: 500 }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="gear"]');
    await p2.waitForTimeout(300);
    const g9d = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      return {
        four: t.indexOf(L['wh.gear.slot.ranged']) >= 0 && t.indexOf(L['wh.gear.slot.armor']) >= 0 && t.indexOf(L['wh.gear.slot.boots']) >= 0,
        open: t.indexOf(L['wh.gear.open']) >= 0,
        note: t.indexOf(L['wh.gear.note']) >= 0,
        eq: document.querySelectorAll('#shell-main [data-eq="boots"]').length
      };
    });
    T(g9d.four && g9d.open && g9d.note && g9d.eq === 1,
      'WH9d 行装四槽上屏（暗器/护身/鞋履槽名齐 ⇔ 空槽「未着」⇔ 口径注「只动判定不进战力」⇔ 靴钮一枚）',
      'four=' + g9d.four + ' open=' + g9d.open + ' note=' + g9d.note + ' eq=' + g9d.eq);

    await p2.click('#shell-main [data-eq="boots"][data-gid="gm_kuaixue"]');
    await p2.waitForTimeout(400);
    const g9e = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      return {
        id: w.gear.boots && w.gear.boots.i,
        eff: t.indexOf(L['wh.gear.eff.evade'].replace('{n}', '5')) >= 0,
        mult: pk.weaponMult(w),
        fx: pk.effectsOfGear(w)
      };
    });
    T(g9e.id === 'gm_kuaixue' && g9e.eff && g9e.mult === 0.90 && g9e.fx.evade === 5 && g9e.fx.loot === 0,
      'WH9e 装快靴真落档（gear.boots=gm_kuaixue ⇔ 效果行「遇敌概率 −5 点」⇔ 兵刃乘区仍 0.90 不被行头动过 ⇔ effectsOfGear.evade=5）',
      'id=' + g9e.id + ' eff=' + g9e.eff + ' mult=' + g9e.mult + ' fx=' + JSON.stringify(g9e.fx));
  });

  /* WH1b · 内力四性上屏（册232）：主修九阴（阴柔，5 层）⇒ 修习页资质卡显示「内力 阴柔」+ 相性注；
   * 判据同时校验 pack.myNat 与屏上一致——「性由主修内功定」这条在界面侧也成立。 */
  await runSeeded({ artsKnown: ['quan_basic', 'neigong_basic', 'yg_jiuyin'],
    artsLevels: { quan_basic: 1, neigong_basic: 1, yg_jiuyin: 5 } }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="arts"]');
    await p2.waitForTimeout(300);
    const r1b = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const want = L['wh.arts.nat'].replace('{name}', L['nat.yin']);
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { shown: t.indexOf(want) >= 0, note: t.indexOf(L['wh.arts.natNote']) >= 0,
        nat: window.SQ.Worlds.wuxia.pack.myNat(w) };
    });
    T(r1b.shown && r1b.note && r1b.nat === 'yin',
      'WH1b 内力四性上屏（主修九阴 ⇒ 「内力 阴柔」真词 ⇔ 相性注 ×1.15/×0.87 ⇔ pack.myNat=yin 对表）',
      'shown=' + r1b.shown + ' note=' + r1b.note + ' nat=' + r1b.nat);
  });

  /* WH1c · 走火入魔红警（册233）：槽里同挂阴柔 + 刚猛（相冲）⇒ 修习页出「两性相冲：阴柔 × 刚猛」
   * + 连走 3 日火的加重提示；判据同时校验 pack.natClash 认这对相冲（防文案与引擎各说各话）。 */
  await runSeeded({ artsKnown: ['quan_basic', 'neigong_basic', 'yg_jiuyin', 'yg_xianglong'],
    artsLevels: { quan_basic: 1, neigong_basic: 1, yg_jiuyin: 1, yg_xianglong: 1 },
    artsSlots: ['yg_jiuyin', 'yg_xianglong'],
    world: { fireDays: 3, wefate: {}, wecyc: {}, webonus: 0, fireMs: 0 } }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="arts"]');
    await p2.waitForTimeout(300);
    const r1c = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      const cl = pk.natClash(w);
      const want = L['wh.arts.clashWarn'].replace('{a}', L['nat.' + cl.a]).replace('{b}', L['nat.' + cl.b]);
      const fdNow = (w.world || {}).fireDays | 0;   /* 离线补算会把火日推高（封 99），据实际值拼词 */
      const alertHead = L['wh.arts.fireAlert'].split('（')[0].replace('{n}', String(fdNow));
      return { clash: cl.clash, warn: t.indexOf(want) >= 0, alert: t.indexOf(alertHead) >= 0, fd: (w.world || {}).fireDays, head: alertHead };
    });
    T(r1c.clash && r1c.warn && r1c.alert,
      'WH1c 走火红警（满槽阴柔+刚猛 ⇒ 引擎认相冲 ⇔ 「两性相冲：阴柔 × 刚猛」真词 ⇔ 连走 3 日火加重提示）',
      'clash=' + r1c.clash + ' warn=' + r1c.warn + ' alert=' + r1c.alert + ' fd=' + r1c.fd);
  });

  /* WH1d · 年份/年岁上屏（册235）：worldDay 1090（第 3 年）⇒ 顶栏「第 4 年 · 19 岁」 */
  await runSeeded({ worldDay: 3 * 360 + 10 }, async (p2) => {
    const r1d = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const yr = window.SQ.Worlds.wuxia.pack.worldYearOf(w);
      const age = window.SQ.Worlds.wuxia.pack.worldSystems.lifeInfo(w).age;
      const want = L['wh.stat.year'].replace('{y}', String(yr + 1)).replace('{age}', String(age));
      return { shown: t.indexOf(want) >= 0, yr: yr, age: age, want: want };
    });
    T(r1d.shown && r1d.yr === 3 && r1d.age === 19,
      'WH1d 年份与年岁上屏（worldDay 1090 ⇒ 顶栏「第 4 年 · 19 岁」⇔ pack.worldYearOf/lifeInfo 对表）',
      'shown=' + r1d.shown + ' want=' + r1d.want + ' yr=' + r1d.yr + ' age=' + r1d.age);
  });

  /* WH1e · 辟邪自伤提示（册237）：辟邪在槽 ⇒ 修习页红字提示 + 已折寿读数 */
  await runSeeded({ artsKnown: ['quan_basic', 'neigong_basic', 'yg_bixie'],
    artsLevels: { quan_basic: 1, neigong_basic: 1, yg_bixie: 1 }, artsSlots: ['yg_bixie'] }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="arts"]');
    await p2.waitForTimeout(300);
    const r1e = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { warn: t.indexOf(L['wh.arts.bixieWarn']) >= 0,
        cut: t.indexOf(L['wh.arts.bixieCut'].replace('{n}', String(w.lifeCut | 0))) >= 0,
        lifeCut: w.lifeCut | 0 };
    });
    T(r1e.warn && r1e.cut,
      'WH1e 辟邪自伤提示（辟邪在槽 ⇒ 「修习即折寿」真词 ⇔ 「已折寿 0 年」读数上屏）',
      'warn=' + r1e.warn + ' cut=' + r1e.cut + ' lifeCut=' + r1e.lifeCut);
  });

  /* WH11 · 书笺页（册240）：侠名录五谱真词上屏 + 本世传记由当前存档派生。
   * 判据同时对表引擎侧读数（分母取 pack 数据表、已得数取盘上真值），防「屏上另说一套」。 */
  await runSeeded({ artsKnown: ['quan_basic', 'neigong_basic'], blades: ['wp_tulong'],
    relations: { xuanci: { affinity: 12, kind: 'friend' } }, visited: ['luoyang', 'shaolin'],
    world: { wefate: { we_wangpan: 'canon', we_juxian: 'alt' }, wecyc: {}, webonus: 0, fireDays: 0, fireMs: 0 } },
  async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="book"]');
    await p2.waitForTimeout(300);
    const r10 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const pk = window.SQ.Worlds.wuxia.pack;
      const D = pk.data;
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const count = (n, tot) => L['wh.book.count'].replace('{n}', String(n)).replace('{t}', String(tot));
      const blades = (D.WEAPONS || []).filter(x => x.k === 2).length;
      const weIds = pk.WORLD_EVENTS.map(x => x.i);
      return {
        album: t.indexOf(L['wh.book.album']) >= 0,
        faces: [L['wh.book.face.art'], L['wh.book.face.blade'], L['wh.book.face.people'], L['wh.book.face.zone']].every(x => t.indexOf(x) >= 0),
        counts: [count(2, (D.ARTS || []).length), count(1, blades), count(1, (D.CAST || []).length),
          count(2, (D.ZONES || []).length), count(2, weIds.length)].every(x => t.indexOf(x) >= 0),
        names: [L['art.quan_basic.name'], L['wp.wp_tulong.name'], L['cast.xuanci.name'],
          L['zone.shaolin.name'], L['we.we_wangpan.name']].every(x => t.indexOf(x) >= 0),
        fate: t.indexOf(L['wh.book.fate.canon']) >= 0 && t.indexOf(L['wh.book.fate.alt']) >= 0,
        bio: t.indexOf(L['wh.book.bio']) >= 0 && t.indexOf('走查侠') >= 0 && t.indexOf(L['wh.book.bio.walking']) >= 0,
        w: w
      };
    });
    T(r10.album && r10.faces && r10.counts && r10.names && r10.fate && r10.bio,
      'WH11 书笺页（侠名录四谱 + 五组分母对表 ⇔ 已得名字上屏 ⇔ 江湖大事结局词 ⇔ 本世传记含姓名与当下状态）',
      'album=' + r10.album + ' faces=' + r10.faces + ' counts=' + r10.counts + ' names=' + r10.names + ' fate=' + r10.fate + ' bio=' + r10.bio);
  });

  /* WH12 · 设置页（册240）：离线效率/世界钟/自动开关/存档行上屏 ⇔ 开关真落档（关→开→关） */
  await runSeeded({}, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="settings"]');
    await p2.waitForTimeout(200);
    const s1 = await p2.evaluate(() => {
      const t = document.getElementById('shell-main').textContent;
      const L = window.SQ.LEX.wuxia;
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { off: t.indexOf(L['wh.set.offline']) >= 0, clock: t.indexOf(L['wh.set.offline.clock']) >= 0,
        slot: t.indexOf(L['wh.set.auto.slot']) >= 0, gear: t.indexOf(L['wh.set.auto.gear']) >= 0,
        save: t.indexOf(L['wh.set.save.line'].split('{')[0]) >= 0,
        v1: w.autoSlotArt === false && w.autoEquipGear === false };
    });
    await p2.click('#shell-main [data-wset="autoSlotArt"]');
    await p2.waitForTimeout(300);
    const s2 = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      const t = document.getElementById('shell-main').textContent;
      return { slotOn: w.autoSlotArt === true, onTxt: t.indexOf(window.SQ.LEX.wuxia['wh.set.on']) >= 0 };
    });
    await p2.click('#shell-main [data-wset="autoSlotArt"]');
    await p2.waitForTimeout(300);
    const s3 = await p2.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia.autoSlotArt);
    T(s1.off && s1.clock && s1.slot && s1.gear && s1.save && s1.v1 && s2.slotOn && s2.onTxt && s3 === false,
      'WH12 设置页（离线效率/世界钟/自动开关/存档行上屏 ⇔ 开关真落档 关→开→关）',
      'off=' + s1.off + ' clock=' + s1.clock + ' slot=' + s1.slot + ' gear=' + s1.gear + ' save=' + s1.save + ' def=' + s1.v1 + ' on=' + s2.slotOn + ' off2=' + (s3 === false));
  });

  /* WH13 · 自动开关真生效（册240）：研读秘籍 ⇒ 自动入槽；买入兵刃 ⇒ 自动上身且出库 */
  await runSeeded({ autoSlotArt: true, autoEquipGear: true, stones: 5000, shelf: ['mnl_01'] }, async (p2) => {
    await p2.click('#shell-main .wh-tabs button[data-v="shop"]');
    await p2.waitForTimeout(200);
    await p2.click('#shell-main [data-study="mnl_01"]');
    await p2.waitForTimeout(300);
    await p2.click('#shell-main [data-buy="wp_tiedao"]');
    await p2.waitForTimeout(300);
    const r = await p2.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.wuxia;
      return { slot: w.artsSlots.indexOf('yg_jiuyin') >= 0, weapon: w.gear.weapon && w.gear.weapon.i,
        stash: w.stash, artKnown: w.artsKnown.indexOf('yg_jiuyin') >= 0 };
    });
    T(r.artKnown && r.slot && r.weapon === 'wp_tiedao' && r.stash.indexOf('wp_tiedao') < 0,
      'WH13 自动开关真生效（研读九阴 ⇒ 自动入槽 ⇔ 买入铁刀 ⇒ 自动上身且出库）',
      'known=' + r.artKnown + ' slot=' + r.slot + ' weapon=' + r.weapon + ' stash=' + JSON.stringify(r.stash));
  });

  /* WH14 · next 链式上屏（册241）：光明顶 canon 开教主之争 / alt 关门——江湖页可赴列表跟着变 */
  const jiaozhuShown = async (fate) => {
    let shown = null;
    await runSeeded({ realm: 9, worldDay: 5 * 360 + 1, world: { wefate: { we_weijiao_gm: fate } } }, async (p2) => {
      await p2.click('#shell-main .wh-tabs button[data-v="jianghu"]');
      await p2.waitForTimeout(200);
      shown = await p2.evaluate(() => document.getElementById('shell-main').textContent
        .indexOf(window.SQ.LEX.wuxia['we.we_jiaozhu.name']) >= 0);
    });
    return shown;
  };
  const jzCanon = await jiaozhuShown('canon');
  const jzAlt = await jiaozhuShown('alt');
  T(jzCanon && !jzAlt,
    'WH14 next 链式上屏（光明顶 canon 开「教主之争」⇔ alt 关门——江湖页可赴列表跟着变）',
    'canon=' + jzCanon + ' alt=' + jzAlt);

  T(errs.length === 0, 'WH7 全程零报错（pageerror / console.error）', errs.slice(0, 2).join(' | ') || 'clean');

  await browser.close();
  console.log((fail === 0 ? 'WH_ALL_GREEN ' : 'WH_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
