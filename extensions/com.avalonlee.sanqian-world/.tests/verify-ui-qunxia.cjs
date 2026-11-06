/* .tests/verify-ui-qunxia.cjs — 武侠主壳（山河棋盘）走查（册244）
 * 判：壳挂 iframe ⇔ 游戏真载入 ⇔ 回合推进真落档 ⇔ 刷新后恢复。
 * 旧 wuxia-home 四篇（home/zone/create/sect）随本批退役，判据收缩到「子应用能进、能存、能回」。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')');
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  /* 条件种档：只缺档时种（册163 ⑤：无条件 init 会拆「真落档 survives reload」的台） */
  await page.addInitScript(() => {
    if (localStorage.getItem('sanqian-state-v1')) return;
    const st = {
      v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: { wuxia: {} },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    };
    localStorage.setItem('sanqian-state-v1', JSON.stringify(st));
  });

  const frameOf = async () => {
    for (let i = 0; i < 60; i++) {
      const f = page.frames().find((x) => x.url().indexOf('games/qunxia/game.html') >= 0);
      if (f) return f;
      await page.waitForTimeout(500);
    }
    return null;
  };

  try {
    await page.goto(url);
    await page.waitForSelector('#qunxia-frame', { timeout: 20000 });
    const frame = await frameOf();
    T(!!frame, 'QX0 主壳挂载（#qunxia-frame 在位 ⇔ 子应用 frame 出现）', 'frame=' + !!frame);
    if (!frame) throw new Error('frame missing');

    await frame.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    const t0 = await frame.evaluate(() => ({ title: document.title, turn: state.turn }));
    T(/群侠传/.test(t0.title) && t0.turn === 1, 'QX1 游戏真载入（标题含「群侠传」⇔ 首回合 = 1）', JSON.stringify(t0));

    /* 内容桥：宿主在 iframe load 后注入，稍等一拍再读 */
    await page.waitForTimeout(1000);
    const br = await frame.evaluate(() => ({
      arts: Object.keys(MARTIAL_DB).length,
      sects: Object.keys(SECTS_DB).length,
      masters: MASTERS_INIT.length,
      side: SIDE_CAST.length,
      jiuyin: MARTIAL_DB.yg_jiuyin && MARTIAL_DB.yg_jiuyin.name,
      mingjiao: SECTS_DB.mingjiao && SECTS_DB.mingjiao.name,
      ding: MASTERS_INIT.some((m) => m.name === '丁春秋') || SIDE_CAST.some((m) => m.name === '丁春秋')
    }));
    T(br.arts > 100 && br.jiuyin === '九阴真经', 'QX1b 武学桥（扩展 403 部并入 ⇔ 九阴真经可见）', 'arts=' + br.arts + ' jiuyin=' + br.jiuyin);
    T(br.sects > 12 && br.mingjiao === '明教', 'QX1c 门派桥（扩展门派并入 ⇔ 明教可见）', 'sects=' + br.sects + ' mingjiao=' + br.mingjiao);
    T(br.masters > 24 || br.side > 34, 'QX1d 人物桥（S/A 进名宿池 / B/C 进市井池）', 'masters=' + br.masters + ' side=' + br.side + ' ding=' + br.ding);

    const ev = await frame.evaluate(() => ({
      n: CANON_EVENTS_SCHEDULE.length,
      jx: CANON_EVENTS_SCHEDULE.some((x) => x.title === '聚贤庄英雄宴'),
      turns: CANON_EVENTS_SCHEDULE.filter((x) => /^we_/.test(x.id)).length
    }));
    T(ev.n >= 26 && ev.jx && ev.turns >= 20, 'QX1e 事件桥（20 案并入日程 ⇔ 聚贤庄英雄宴在册）', 'sched=' + ev.n + ' we=' + ev.turns + ' jx=' + ev.jx);

    await frame.evaluate(() => { meditateRest(); });
    await page.waitForTimeout(300);
    await frame.evaluate(() => { meditateRest(); });
    await page.waitForTimeout(800);
    const t1 = await frame.evaluate(() => ({ turn: state.turn, saved: (localStorage.getItem('jianghu_shanshui_hardcore_v7') || '').length }));
    T(t1.turn === 3, 'QX2 回合推进（两次吐纳 ⇒ turn 1→3）', 'turn=' + t1.turn);
    T(t1.saved > 1000, 'QX3 真落档（游戏存档键非空）', 'bytes=' + t1.saved);

    await page.reload();
    await page.waitForSelector('#qunxia-frame', { timeout: 20000 });
    const frame2 = await frameOf();
    if (!frame2) throw new Error('frame missing after reload');
    await frame2.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    const t2 = await frame2.evaluate(() => ({ turn: state.turn }));
    T(t2.turn === 3, 'QX4 刷新恢复（重载后 turn 仍为 3）', 'turn=' + t2.turn);

    const spawn = await frame2.evaluate(() => {
      state.turn = 5;
      state.crises = [];
      meditateRest();
      return { turn: state.turn, crises: state.crises.map((c) => c.id) };
    });
    T(spawn.turn === 6 && spawn.crises.some((id) => /^we_/.test(id)), 'QX6 事件真触发（第 6 旬生成扩展大事）', 'turn=' + spawn.turn + ' crises=' + spawn.crises.join(','));

    const run = await frame2.evaluate(() => {
      let maxCrises = 0;
      for (let i = 0; i < 34; i++) {
        try { meditateRest(); } catch (e) { return { err: e.message }; }
        maxCrises = Math.max(maxCrises, (state.crises || []).length);
      }
      return {
        turn: state.turn,
        triggered: Object.keys(state.canonEventsTriggered || {}).filter((k) => /^we_/.test(k)).length,
        maxCrises,
        reports: (state.canonEventReports || []).length,
        bytes: JSON.stringify(state).length
      };
    });
    T(!run.err && run.triggered === 20 && run.maxCrises <= 8 && run.bytes < 60 * 1024,
      'QX7 长跑至 40 旬（20 案全触发 ⇔ 并发案 ≤ 8 ⇔ 存档 < 60KB）', JSON.stringify(run));

    const rw = await frame2.evaluate(() => {
      const before = state.learnedArts.yg_jiuyin || 0;
      state.crises.push({ id: 'we_huashan', region: 'huashan', title: '华山论剑', enemyName: '黄药师' });
      duelState = {
        finished: false, enemyCurHp: 0, playerWins: 2, enemyWins: 1,
        rewardGold: 0, rewardFame: 0, rewardExp: 0,
        crisisId: 'we_huashan', contextTitle: '华山论剑', enemyName: '黄药师'
      };
      finishDuel();
      const shown = document.getElementById('duel-result-reward').textContent;
      const after = state.learnedArts.yg_jiuyin || 0;
      const bogus = QUNXIA_CRISIS_REWARD('we_not_a_case');
      duelState = null;
      return { before, after, shown, bogus };
    });
    T(rw.after === rw.before + 1 && /获传《九阴真经》/.test(rw.shown) && rw.bogus === '',
      'QX8 事件主奖励（华山论剑胜出传九阴真经且上屏 ⇔ 未知案不发）', JSON.stringify(rw));

    const rwB = await frame2.evaluate(() => {
      state.crises.push({ id: 'we_tushi', region: 'shaolin', title: '屠狮大会', enemyName: '谢逊' });
      duelState = {
        finished: false, enemyCurHp: 0, playerWins: 2, enemyWins: 1,
        rewardGold: 0, rewardFame: 0, rewardExp: 0,
        crisisId: 'we_tushi', contextTitle: '屠狮大会', enemyName: '谢逊'
      };
      finishDuel();
      const shown = document.getElementById('duel-result-reward').textContent;
      duelState = null;
      return {
        item: !!ITEMS_DB.wp_yitian,
        name: ITEMS_DB.wp_yitian && ITEMS_DB.wp_yitian.name,
        have: state.inventory.wp_yitian || 0,
        shown
      };
    });
    T(rwB.item && rwB.name === '倚天剑' && rwB.have === 1 && /获神兵《倚天剑》/.test(rwB.shown),
      'QX9 名兵奖励（屠狮大会得倚天剑入行囊 ⇔ 战果行上屏）', JSON.stringify(rwB));

    const rwM = await frame2.evaluate(() => {
      state.crises.push({ id: 'we_wuyue_bingpai', region: 'shaolin', title: '五岳并派', enemyName: '岳不群' });
      duelState = {
        finished: false, enemyCurHp: 0, playerWins: 2, enemyWins: 1,
        rewardGold: 0, rewardFame: 0, rewardExp: 0,
        crisisId: 'we_wuyue_bingpai', contextTitle: '五岳并派', enemyName: '岳不群'
      };
      finishDuel();
      const shown = document.getElementById('duel-result-reward').textContent;
      duelState = null;
      const book = !!ITEMS_DB.mnl_03 && ITEMS_DB.mnl_03.learnArt;
      const have = state.inventory.mnl_03 || 0;
      const before = state.learnedArts.yg_bixie || 0;
      if (have > 0) useInventoryItem('mnl_03');
      return { book, have, before, after: state.learnedArts.yg_bixie || 0, shown };
    });
    T(rwM.book && rwM.have === 1 && rwM.after === rwM.before + 1 && /获秘籍《辟邪剑谱》/.test(rwM.shown),
      'QX10 秘籍奖励（五岳并派得辟邪剑谱 ⇔ 研读习得辟邪剑法）', JSON.stringify(rwM));

    const rwL = await frame2.evaluate(() => {
      state.fame = 100;
      state.hp = 100;
      state.maxHp = Math.max(state.maxHp, 100);
      state.crises.push({ id: 'we_heimu', region: 'heimuya', title: '黑木崖', enemyName: '东方不败' });
      duelState = {
        finished: false, enemyCurHp: 60, playerWins: 0, enemyWins: 2,
        rewardGold: 0, rewardFame: 0, rewardExp: 0,
        crisisId: 'we_heimu', contextTitle: '黑木崖', enemyName: '东方不败'
      };
      finishDuel();
      const shown = document.getElementById('duel-result-reward').textContent;
      duelState = null;
      return { fame: state.fame, hp: state.hp, shown, manual: state.inventory.mnl_05 || 0 };
    });
    T(rwL.hp >= 93 && rwL.hp <= 95 && rwL.fame >= 60 && rwL.fame <= 70 && rwL.manual === 0 &&
      /虽败犹荣/.test(rwL.shown) && /内伤 \+[5-7]/.test(rwL.shown) && /侠名 -[34]\d/.test(rwL.shown),
      'QX11 事件败局代价（黑木崖败：内伤 5~7 / 侠名 -40~-30 ⇔ 不发主奖励）', JSON.stringify(rwL));

    T(errs.length === 0, 'QX5 无脚本错误', errs.slice(0, 2).join(' | '));
  } catch (e) {
    console.log('FAIL QX_CRASH (' + (e && e.message || e) + ')');
    fail++;
  }

  console.log((fail === 0 ? 'QUNXIA_UI_ALL_GREEN ' : 'QUNXIA_UI_FAILED ') + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
