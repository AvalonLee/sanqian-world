/* .tests/verify-ui-qunxia.cjs — 武侠主壳（山河棋盘）走查（册244，册250 改同文档导航）
 * 判：主壳把 payload 写进 localStorage 并导航到 game.html ⇔ 游戏真载入 ⇔ 内容桥生效 ⇔ 回合推进真落档 ⇔ 刷新后恢复。
 * 真实宿主扩展页面 CSP = frame-src 'none'，不能嵌 iframe，走查也按「无嵌套框架」验。
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
    try { localStorage.setItem('qunxia3d-engine', '0'); } catch (e) {} /* 册297：N89 修法——本篇测 classic 线 payload 桥（备选线正典开关，册272 预埋） */
    if (localStorage.getItem('sanqian-state-v1')) return;
    const st = {
      v: 1,
      profile: { name: '走查侠', talents: [], worldId: 'wuxia', worldName: '', createdAt: 1, alignBias: 'neutral', gender: 'male', race: 'human', hao: '', seenNote: 'sq-note-v1' },
      worlds: { wuxia: {} },
      meta: { unlockedWorlds: ['xiuxian', 'wuxia'], stats: { lives: 0, deaths: 0 } },
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    };
    localStorage.setItem('sanqian-state-v1', JSON.stringify(st));
    if (location.pathname.indexOf('games/qunxia') < 0 && !localStorage.getItem('qunxia-result-queue-v1')) {
      localStorage.setItem('qunxia-result-queue-v1', JSON.stringify([{ id: 'we_huashan', outcome: 'alt' }]));
    }
  });

  try {
    await page.goto(url);
    await page.waitForURL(/games\/qunxia\/game\.html/, { timeout: 20000 });
    await page.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    const t0 = await page.evaluate(() => ({
      title: document.title, turn: state.turn,
      frame: !!document.getElementById('qunxia-frame'),
      payload: (localStorage.getItem('qunxia-payload-v1') || '').length
    }));
    T(!t0.frame && t0.payload > 1000, 'QX0 主壳导航到子应用（无嵌套 iframe ⇔ 内容桥 payload 已落同源存储）', 'payload=' + t0.payload + ' frame=' + t0.frame);
    T(/群侠传/.test(t0.title) && t0.turn === 1, 'QX1 游戏真载入（标题含「群侠传」⇔ 首回合 = 1）', JSON.stringify(t0));

    const br = await page.evaluate(() => ({
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

    const ev = await page.evaluate(() => ({
      n: CANON_EVENTS_SCHEDULE.length,
      jx: CANON_EVENTS_SCHEDULE.some((x) => x.title === '聚贤庄英雄宴'),
      turns: CANON_EVENTS_SCHEDULE.filter((x) => /^we_/.test(x.id)).length
    }));
    T(ev.n >= 42 && ev.jx && ev.turns >= 36, 'QX1e 事件桥（36 案并入日程 ⇔ 聚贤庄英雄宴在册）', 'sched=' + ev.n + ' we=' + ev.turns + ' jx=' + ev.jx);

    const rq = await page.evaluate(() => {
      let st = null;
      try { st = JSON.parse(localStorage.getItem('sanqian-state-v1') || 'null'); } catch (e) {}
      const w = st && st.worlds && st.worlds.wuxia && st.worlds.wuxia.world;
      return {
        queue: localStorage.getItem('qunxia-result-queue-v1'),
        fate: w && w.wefate ? w.wefate.we_huashan : null,
        rep: w && w.wbsect ? w.wbsect.huashan : null
      };
    });
    T(rq.queue === null && rq.fate === 'alt' && rq.rep === -5,
      'QX13 结果回流（棋盘终局队列 ⇒ 主壳单写 wefate=alt + 华山 −5 ⇔ 队列清空）', JSON.stringify(rq));

    await page.evaluate(() => { meditateRest(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { meditateRest(); });
    await page.waitForTimeout(800);
    const t1 = await page.evaluate(() => ({ turn: state.turn, saved: (localStorage.getItem('jianghu_shanshui_hardcore_v7') || '').length }));
    T(t1.turn === 3, 'QX2 回合推进（两次吐纳 ⇒ turn 1→3）', 'turn=' + t1.turn);
    T(t1.saved > 1000, 'QX3 真落档（游戏存档键非空）', 'bytes=' + t1.saved);

    await page.reload();
    await page.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    const t2 = await page.evaluate(() => ({ turn: state.turn }));
    T(t2.turn === 3, 'QX4 刷新恢复（重载后 turn 仍为 3）', 'turn=' + t2.turn);

    const spawn = await page.evaluate(() => {
      state.turn = 5;
      state.crises = [];
      meditateRest();
      return { turn: state.turn, crises: state.crises.map((c) => c.id) };
    });
    T(spawn.turn === 6 && spawn.crises.some((id) => /^we_/.test(id)), 'QX6 事件真触发（第 6 旬生成扩展大事）', 'turn=' + spawn.turn + ' crises=' + spawn.crises.join(','));

    const run = await page.evaluate(() => {
      state.turn = 2;   /* 册266：从第 2 旬起跑——spawn 按 turn 精确命中 triggerTurn，起点早于 3 才能覆盖第 3 旬起的第一幕案 */
      let maxCrises = 0;
      for (let i = 0; i < 38; i++) {
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
    T(!run.err && run.triggered === 36 && run.maxCrises <= 12 && run.bytes < 60 * 1024,
      'QX7 长跑至 40 旬（36 案全触发 ⇔ 并发案 ≤ 12 ⇔ 存档 < 60KB）', JSON.stringify(run));

    const rw = await page.evaluate(() => {
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
      const q = JSON.parse(localStorage.getItem('qunxia-result-queue-v1') || '[]');
      const last = q[q.length - 1] || null;
      duelState = null;
      return { before, after, shown, bogus, last };
    });
    T(rw.after === rw.before + 1 && /获传《九阴真经》/.test(rw.shown) && rw.bogus === '' &&
      rw.last && rw.last.id === 'we_huashan' && rw.last.outcome === 'alt',
      'QX8 事件主奖励（华山论剑胜出传九阴真经且上屏 ⇔ 未知案不发 ⇔ 终局入回流队列 alt）', JSON.stringify(rw));

    const rwB = await page.evaluate(() => {
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

    const rwM = await page.evaluate(() => {
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

    const rwL = await page.evaluate(() => {
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

    const qc = await page.evaluate(() => {
      const old = state.crises;
      const reg = state.currentRegion;
      state.crises = [
        { id: 'we_qc_slow', region: reg, title: '缓事', remainTurns: 7, tileIdx: 0 },
        { id: 'we_qc_urgent', region: reg, title: '急事', remainTurns: 1, tileIdx: 0 },
        { id: 'we_qc_mid', region: reg, title: '中事', remainTurns: 4, tileIdx: 0 },
        { id: 'we_qc_aft', region: reg, title: '余波事', phase: 'aftermath', aftermathRemain: 2, tileIdx: 0 },
        { id: 'we_qc_last', region: reg, title: '末事', remainTurns: 8, tileIdx: 0 }
      ];
      renderBoardLayers();
      const pills = Array.from(document.querySelectorAll('#crisis-pill-container button'))
        .filter(b => ((b.getAttribute('onclick') || '').indexOf('jumpToCrisisRegion') >= 0));
      const text = document.getElementById('crisis-pill-container').textContent;
      const rumor = renderInspectorRumorTab(getRegion(reg));
      state.crises = old;
      renderBoardLayers();
      return {
        n: pills.length,
        first: pills[0] ? pills[0].textContent : '',
        text: text,
        rumorOrder: [rumor.indexOf('急事'), rumor.indexOf('缓事')]
      };
    
});
    T(qc.n === 3 && /还有 2 桩/.test(qc.text) && /急事/.test(qc.first) &&
      qc.rumorOrder[0] >= 0 && qc.rumorOrder[0] < qc.rumorOrder[1],
      'QX12 大事列表收敛（并发 5 桩 ⇒ 顶栏只留 3 桩最急 + 「还有 2 桩」⇔ 传闻页按剩余旬升序）', JSON.stringify(qc));

    T(errs.length === 0, 'QX5 无脚本错误', errs.slice(0, 2).join(' | '));

    // QX14/QX15（册267 · WE.knot 场面上屏）：payload.knots 36 案齐 + 胜利战报带当场段。
    const kn = await page.evaluate(() => {
      const raw = localStorage.getItem('qunxia-payload-v1');
      const pl = raw ? JSON.parse(raw) : {};
      const k = pl.knots || {};
      const ids = Object.keys(k);
      const bad = [];
      for (const id of ids) {
        if (!k[id].knot || !/^knot_/.test(k[id].knot)) bad.push(id + ':knot');
        if (!Array.isArray(k[id].cast) || !k[id].cast.length) bad.push(id + ':cast');
        const labels = (k[id].opts || []).map(o => o.label);
        if (!labels.length || labels.some(l => /^knot\./.test(l))) bad.push(id + ':label');
      }
      return { n: ids.length, bad: bad.slice(0, 4), sample: k['we_juxian'] || null };
    });
    T(kn.n === 36 && kn.bad.length === 0 && kn.sample && kn.sample.cast.length >= 2,
      'QX14 场面数据上 payload（36 案 knots 齐 ⇔ knot/cast/词表 label 全合法、无裸键）', JSON.stringify({ n: kn.n, bad: kn.bad }));

    const sc = await page.evaluate(() => {
      state.crises.push({ id: 'we_juxian', region: 'luoyang', title: '聚贤庄英雄宴', enemyName: '萧峰', sceneCast: ['玄慈', '萧峰'] });
      duelState = { finished: false, enemyCurHp: 0, playerWins: 2, enemyWins: 1, rewardGold: 0, rewardFame: 0, rewardExp: 0, crisisId: 'we_juxian', contextTitle: '聚贤庄英雄宴', enemyName: '萧峰' };
      finishDuel();
      const rep = (state.canonEventReports || []).slice(-1)[0] || {};
      return { hasScene: /当场：/.test(rep.summary || ''), who: /玄慈/.test(rep.summary || '') && /萧峰/.test(rep.summary || ''), dile: /「/.test(rep.summary || '') };
    });
    T(sc.hasScene && sc.who && sc.dile,
      'QX15 胜利战报带当场段（入局人物在报 + 分支两难以叙述呈现）', JSON.stringify(sc));

    // QX16/QX17（册271）：败局即终局回流 + 跨世棋盘重开。
    const rs = await page.evaluate(() => {
      state.crises.push({ id: 'we_juxian', region: 'luoyang', title: '聚贤庄英雄宴', enemyName: '萧峰' });
      duelState = { finished: false, enemyCurHp: 30, playerWins: 1, enemyWins: 2, rewardGold: 0, rewardFame: 0, rewardExp: 0, crisisId: 'we_juxian', contextTitle: '聚贤庄英雄宴', enemyName: '萧峰' };
      finishDuel();
      const rep = (state.canonEventReports || []).slice(-1)[0] || {};
      let lastQ = null;
      try { const q = JSON.parse(localStorage.getItem('qunxia-result-queue-v1') || '[]'); lastQ = q[q.length - 1] || null; } catch (e) {}
      return {
        queue: lastQ,
        gone: !state.crises.some((c) => c.id === 'we_juxian'),
        repTitled: /聚贤庄/.test(rep.summary || ''),
        onScreen: /拖出了门/.test((document.getElementById('duel-result-reward') || {}).textContent || ''),
        schedLose: (CANON_EVENTS_SCHEDULE.find((x) => x.id === 'we_juxian') || {}).loseText || ''
      };
    });
    T(rs.queue && rs.queue.id === 'we_juxian' && rs.queue.outcome === 'lose' && rs.gone && rs.onScreen && rs.schedLose,
      'QX17 败局终局回流（败局入队 lose + crisis 移除不可重战 ⇔ 词表 lose 叙事并入败局战报）',
      JSON.stringify({ q: rs.queue, gone: rs.gone, lose: rs.schedLose.length, onScreen: rs.onScreen }));

    await page.evaluate(() => {
      const pl = JSON.parse(localStorage.getItem('qunxia-payload-v1') || '{}');
      pl.gen = 1;   /* 模拟扩展侧已转世（meta.stats.lives 0 → 1，wefate/wecyc 已清） */
      localStorage.setItem('qunxia-payload-v1', JSON.stringify(pl));
    });
    await page.reload();
    await page.waitForFunction(() => typeof state !== 'undefined', null, { timeout: 30000 });
    const rg = await page.evaluate(() => ({
      turn: state.turn,
      saved: localStorage.getItem('jianghu_shanshui_hardcore_v7'),
      triggered: Object.keys(state.canonEventsTriggered || {}).length,
      gen: state.worldGen
    }));
    T(rg.turn === 1 && rg.saved === null && rg.triggered === 0 && rg.gen === 1,
      'QX16 跨世棋盘重开（payload gen 变大 ⇒ 旧世残局清档回创角 ⇔ 36 案重新排期）',
      JSON.stringify({ turn: rg.turn, cleared: rg.saved === null, triggered: rg.triggered, gen: rg.gen }));
  } catch (e) {
    console.log('FAIL QX_CRASH (' + (e && e.message || e) + ')');
    fail++;
  }

  console.log((fail === 0 ? 'QUNXIA_UI_ALL_GREEN ' : 'QUNXIA_UI_FAILED ') + pass + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})();
