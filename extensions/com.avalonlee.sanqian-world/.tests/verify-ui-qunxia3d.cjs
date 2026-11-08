/* .tests/verify-ui-qunxia3d.cjs — 三维武侠棋盘 · 游戏化 M0 走查（第册二百七十三批）
 * 判：qunxia3d 自包含子应用真载入（11 数据表 + core 纯函数）⇔ 创角向导可完成
 * ⇔ 纸面 HUD 同步 ⇔ 行脚过旬真落档（shanqian3d_save_v1）⇔ 刷新续玩逐字段恢复
 * ⇔ payload gen 变大 ⇒ 清档回创角（QX16 语义在 3D 侧对齐）⇔ 全程零脚本错误。
 * file:// 直开 index.html（子应用自包含；宿主挂载经 qunxia-home 双路由 ?engine=3d，册272）。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/games/qunxia3d/index.html').replace(/\\/g, '/');
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
  const clickSafe = async (sel) => {
    const el = await page.waitForSelector(sel, { timeout: 8000 });
    await el.click();
  };
  /* 对决打穿（M2）：有出招卡就点（对手可能提前毙命 ⇒ 卡区消失即终局），
   * 终局读题记，收招归鞘。返回 { title, win }。 */
  const playDuelThrough = async () => {
    for (let i = 0; i < 3; i++) {
      const card = await page.waitForSelector('#duel-overlay .dl-cards .dl-card', { timeout: 3000 }).catch(() => null);
      if (!card) break; /* 已终局 */
      await card.click();
      await page.waitForTimeout(180);
    }
    const title = await page.evaluate(() => ((document.querySelector('#duel-overlay .dl-result-title') || {}).textContent || ''));
    const win = /胜出/.test(title);
    await page.click('#btn-duel-close');
    await page.waitForTimeout(200);
    return { title: title, win: win };
  };

  try {
    await page.goto(url);
    /* 等全链装配完成：QX3D_DATA 首表即存在，须等最末脚本 state-init + app 装配完 */
    await page.waitForFunction(() => !!(window.QX3D && window.QX3D_APP && window.QX3D_DATA && window.QX3D_DATA.QX3D_STATE_INIT && Object.keys(window.QX3D_DATA.QX3D_STATE_INIT).length > 0), null, { timeout: 20000 });
    await page.waitForTimeout(600);

    /* Q3D0 数据层 + 逻辑层真载入 */
    const t0 = await page.evaluate(() => ({
      errs: window.__errs.length,
      martial: Object.keys(window.QX3D_DATA.MARTIAL_DB).length,
      regions: window.QX3D_DATA.REGIONS.length,
      origins: window.QX3D_DATA.ORIGINS.length,
      stateInit: Object.keys(window.QX3D_DATA.QX3D_STATE_INIT).length,
      canon: window.QX3D_DATA.CANON_EVENTS_SCHEDULE.length,
      hasCore: !!(window.QX3D.core.state && window.QX3D.core.time && window.QX3D.core.player && window.QX3D.systems.travel),
      webgl: !!window.__QX
    }));
    T(t0.errs === 0 && t0.hasCore && t0.webgl, 'Q3D0 子应用真载入（数据表+core+systems+3D 壳零脚本错误）',
      'errs=' + t0.errs + ' martial=' + t0.martial + ' regions=' + t0.regions);
    T(t0.martial === 33 && t0.regions === 30 && t0.origins === 6 && t0.canon === 6,
      'Q3D0b 生成物计数守恒（MARTIAL 33 · REGIONS 30 · ORIGINS 6 · 内置 canon 6）',
      JSON.stringify(t0));
    T(t0.stateInit >= 60, 'Q3D0c state 形状抽取件在位（QX3D_STATE_INIT ≥60 字段）', 'fields=' + t0.stateInit);

    /* Q3D1 创角向导（无档 ⇒ 自动弹出） */
    const c0 = await page.evaluate(() => ({
      modal: document.getElementById('creation-modal').classList.contains('show'),
      origins: document.querySelectorAll('#creation-origins .cr-origin').length,
      locked: document.querySelectorAll('#creation-origins .cr-origin.locked').length,
      talents: document.querySelectorAll('#creation-talents .cr-talent').length,
      vows: document.querySelectorAll('#creation-vows .cr-vow').length
    }));
    T(c0.modal && c0.origins === 6 && c0.talents === 3 && c0.vows === 3,
      'Q3D1 创角向导（无档自动弹出 ⇔ 6 出身 + 3 命格 + 3 誓言在位）', JSON.stringify(c0));
    T(c0.locked === 2, 'Q3D1b 二周目出身锁定（reqCycle 灰卡 ×2）', 'locked=' + c0.locked);

    /* Q3D2 提交创角 ⇒ HUD 同步 + 存档落盘 */
    await page.evaluate(() => {
      document.querySelector('#creation-origins [data-origin="sword_wanderer"]').click();
      document.querySelector('#creation-vows [data-vow="vow_homestead"]').click();
    });
    await clickSafe('#btn-creation-submit');
    await page.waitForTimeout(300);
    const c1 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1') || 'null');
      return {
        created: st && st.hasCreatedChar,
        origin: st && st.originId,
        vow: st && st.openingVow,
        tal: st && st.talents.length,
        hud: document.getElementById('hud-bar').classList.contains('show'),
        turnBtn: document.getElementById('btn-turn').style.display !== 'none',
        hp: document.getElementById('hud-hp-text').textContent,
        ap: document.getElementById('hud-ap-text').textContent,
        date: document.getElementById('hud-date-badge').textContent,
        modalGone: !document.getElementById('creation-modal').classList.contains('show')
      };
    });
    T(c1.created && c1.origin === 'sword_wanderer' && c1.vow === 'vow_homestead' && c1.tal === 3,
      'Q3D2 创角提交（applyOrigin 落档 shanqian3d_save_v1 ⇔ 出身/誓言/命格入档）', JSON.stringify(c1));
    T(c1.hud && c1.turnBtn && c1.modalGone && /^\d+\/\d+$/.test(c1.hp) && c1.ap === '5/5' && c1.date === '第1/36旬',
      'Q3D2b 纸面 HUD 同步（hud-bar 显 ⇔ 气血/行脚 5/5/第1旬读数在位）', JSON.stringify(c1));

    /* Q3D3 行脚：洛阳 → 嵩山少林（邻州徒步，-1行脚 · -8内息 · 过1旬） */
    const before = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { region: st.currentRegion, turn: st.turn, ap: st.ap, mp: st.mp, gold: st.gold };
    });
    await page.evaluate(() => { window.__QX.showRegionInfo('shaolin'); });
    await page.waitForTimeout(200);
    const trav = await page.evaluate(() => ({
      btn: document.getElementById('ic-travel').classList.contains('show'),
      label: document.getElementById('ic-travel').textContent
    }));
    T(trav.btn && /嵩山少林/.test(trav.label), 'Q3D3 行脚钮（邻州信息卡 ⇔ 行脚钮带目标名显隐）', JSON.stringify(trav));
    await clickSafe('#ic-travel');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { region: st.currentRegion, turn: st.turn, ap: st.ap, mp: st.mp, saved: !!localStorage.getItem('shanqian3d_save_v1') };
    });
    T(after.region === 'shaolin' && after.turn === before.turn + 1 && after.ap === before.ap - 1 && after.mp === Math.max(10, before.mp - 8) && after.saved,
      'Q3D3b 行脚结算（region 变 + turn+1 + ap-1 + mp-8保底10 ⇔ 真落档）', JSON.stringify({ before, after }));

    /* Q3D4 吐纳过旬 ×4：turn 推进 + 第5旬衡阳 canon 上事件条 */
    for (let i = 0; i < 4; i++) { await clickSafe('#btn-turn'); await page.waitForTimeout(120); }
    const t4 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return {
        turn: st.turn, ap: st.ap + '/' + st.maxAp,
        canon: st.canonEventsTriggered.canon_hengyang_5 === true,
        crises: st.crises.length,
        ticker: document.getElementById('hud-ticker').textContent,
        crisis: document.getElementById('hud-ticker').classList.contains('crisis')
      };
    });
    T(t4.turn === 6 && t4.ap === '5/5', 'Q3D4 吐纳过旬（×4 ⇒ 第6旬 + 精力回满 5/5）', JSON.stringify({ turn: t4.turn, ap: t4.ap }));
    T(t4.canon && t4.crises >= 1 && t4.crisis && /衡阳|刘正风/.test(t4.ticker),
      'Q3D4b 江湖大事注入（第5旬 canon_hengyang_5 触发 ⇔ HUD ticker 上屏）', JSON.stringify(t4));

    /* Q3D5 刷新续玩：逐字段恢复 */
    const pre = await page.evaluate(() => localStorage.getItem('shanqian3d_save_v1'));
    await page.reload();
    await page.waitForFunction(() => !!(window.QX3D && window.QX3D_APP && window.QX3D_APP.state), null, { timeout: 20000 });
    await page.waitForTimeout(400);
    const post = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return {
        same: !!st, turn: st.turn, region: st.currentRegion, hp: st.hp, mp: st.mp, gold: st.gold,
        hud: document.getElementById('hud-bar').classList.contains('show'),
        creationGone: !document.getElementById('creation-modal').classList.contains('show'),
        logRows: document.querySelectorAll('#logs-list .log-row').length
      };
    });
    T(post.same && post.turn === 6 && post.region === 'shaolin' && post.hud && post.creationGone && post.logRows > 0,
      'Q3D5 刷新续玩（档不丢 ⇔ 第6旬/少林恢复 + HUD/日志同步 + 无创角重弹）', JSON.stringify(post));
    const preParsed = JSON.parse(pre);
    T(preParsed.turn === post.turn && preParsed.currentRegion === post.region,
      'Q3D5b 刷新前后逐字段一致（turn/region 同值）', JSON.stringify({ pre: preParsed.turn, post: post.turn }));

    /* Q3D5c 走两州（M0 验收线字面项）：少林 → 洛阳返程 */
    await page.evaluate(() => { window.__QX.showRegionInfo('luoyang'); });
    await page.waitForTimeout(200);
    await clickSafe('#ic-travel');
    await page.waitForTimeout(400);
    const post2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { region: st.currentRegion, turn: st.turn, ap: st.ap, mp: st.mp, hud: document.getElementById('hud-bar').classList.contains('show') };
    });
    T(post2.region === 'luoyang' && post2.turn === 7 && post2.ap === 4 && post2.mp === Math.max(10, post.mp - 8) && post2.hud,
      'Q3D5c 走两州（少林→洛阳返程 ⇔ turn 7 · ap-1 · mp-8 保底 · HUD 同步）', JSON.stringify(post2));

    /* ── Q3D8 组 · M1 八格动作 + 本境经济（洛阳一旬收支走查）────────────────── */
    await page.waitForTimeout(900); /* syncBoardLayer 钻入过渡（640ms）落地 */
    /* 行脚到达语义（原 :4534–:4549）：抵达主线章地点（洛阳格 1 太白酒肆）⇒ 自动切本境层。
     * 故 M1 流程自本境层酒肆起步：揭榜 → 小酌 → 移步渡口走镖 → 移步市集购药 → 跨街名胜寻幽 → 吐纳过旬。 */
    const stAtM1 = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    T(stAtM1.viewLayer === 'local' && stAtM1.currentRegion === 'luoyang' && stAtM1.currentTileIdx === 1,
      'Q3D8 到达语义（行脚抵达主线章地点 ⇒ 自动入本境层 · 洛阳格1酒肆）', JSON.stringify({ layer: stAtM1.viewLayer, tile: stAtM1.currentTileIdx }));
    const gold0 = stAtM1.gold;

    /* ① 揭榜悬赏（海捕文书弹窗 + ap−1 + 冷却 turn+2） */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-act="tavern_bounty"]').click(); });
    await page.waitForTimeout(250);
    const poster = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return {
        open: !m.classList.contains('hidden'),
        poster: /海捕文书/.test(m.textContent),
        fightBtn: !!m.querySelector('[data-qxm-choice]'),
        bounty: (st.bounties || []).some(b => b.region === 'luoyang'),
        ap: st.ap,
        cd: st.bountyCooldownUntil.luoyang
      };
    });
    T(poster.open && poster.poster && poster.fightBtn && poster.bounty && poster.ap === 4 && poster.cd === undefined,
      'Q3D8b 揭榜悬赏（初始档自带洛阳恶徒 ⇒ 揭榜直出海捕文书，early-return 不扣精力）', JSON.stringify(poster));
    await page.evaluate(() => {
      const btns = document.querySelectorAll('#qx-modal [data-qxm-choice]');
      btns[btns.length - 1].click(); /* 按兵不动 */
    });
    await page.waitForTimeout(150);

    /* ② 酒肆小酌（-8文 +50气血 +40内息 + 本旬限饮） */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-act="tavern_drink"]').click(); });
    await page.waitForTimeout(200);
    const afterDrink = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    T(afterDrink.turnFlags.drankTavern && afterDrink.gold === gold0 - 8,
      'Q3D8c 酒肆小酌（drankTavern 置位 ⇔ -8文 +50气血 +40内息）', JSON.stringify({ gold: afterDrink.gold, hp: afterDrink.hp, drank: afterDrink.turnFlags.drankTavern }));

    /* ③ 移步渡口（邻格 -4内息）→ 走镖（合法二选一：平安 +24 文 ⇔ 45% 劫匪对手卡） */
    await page.evaluate(() => { window.__QX.showTileInfo(0); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.getElementById('ic-move').click(); });
    await page.waitForTimeout(200);
    const movedAdj = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    T(movedAdj.currentTileIdx === 0, 'Q3D8d 邻格移步（tile 1→0 · -4内息）', 'tile=' + movedAdj.currentTileIdx);
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-act="escort"]').click(); });
    await page.waitForTimeout(250);
    /* 合法二态：平安 ⇒ +24 文无弹窗；45% 劫匪 ⇒ M2 真对决弹出（打穿后按胜负落账） */
    const robber = !!(await page.$('#duel-overlay:not(.hidden)'));
    let afterEscort = null, robberWin = null;
    if (robber) {
      const du = await playDuelThrough();
      robberWin = du.win;
      afterEscort = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
      afterEscort.robber = true;
    } else {
      afterEscort = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
      afterEscort.robber = false;
    }
    const escortOk = afterEscort.robber
      ? (robberWin === true ? afterEscort.gold === gold0 - 8 + 32 : afterEscort.gold === gold0 - 8) /* 劫匪战无镖银，胜只得对决赏 32 */
      : afterEscort.gold === gold0 - 8 + 24;
    T(escortOk && afterEscort.ap === 3, 'Q3D8e 走镖结算（平安 +24文 ⇔ 劫匪真对决按胜负落账，合法二态 · ap−1）',
      JSON.stringify({ gold: afterEscort.gold, robber: afterEscort.robber, robberWin: robberWin }) + ' gold0=' + gold0);

    /* ④ 移步市集（邻格 -4内息）→ 商铺货架全列 + 限量购药 */
    await page.evaluate(() => { window.__QX.showTileInfo(2); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.getElementById('ic-move').click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(150);
    const shopN = await page.evaluate(() => document.querySelectorAll('#qx-modal [data-act^="buy_"]').length);
    T(shopN >= 10, 'Q3D8f 商铺货架（group=shop 全列 ⩾10 条且不进主槽）', 'shop=' + shopN);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-act="buy_jinchuang_yao"]').click(); });
    await page.waitForTimeout(200);
    const afterBuy = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    /* 合法二态：盘缠足 ⇒ 入行囊+记账；劫匪路径盘缠不足 ⇒ 购入被拒（toast） */
    const buyOk = (afterBuy.inventory.jinchuang_yao === 1 && afterBuy.purchasedCounts.jinchuang_yao === 1) || afterBuy.gold < 48;
    T(buyOk,
      'Q3D8g 限量购药（48文入行囊+记账 ⇔ 盘缠不足被拒，合法二态）', JSON.stringify({ inv: afterBuy.inventory.jinchuang_yao || 0, gold: afterBuy.gold }));

    /* ⑤ 跨街移步名胜（-1行脚）→ 驻足寻幽 → 奇遇二选一（合法二态） */
    await page.evaluate(() => { window.__QX.showTileInfo(5); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.getElementById('ic-move').click(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-act="stroll"]').click(); });
    await page.waitForTimeout(250);
    const enc = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return { open: !m.classList.contains('hidden'), choices: m.querySelectorAll('[data-qxm-choice]').length };
    });
    T(enc.open && enc.choices === 2, 'Q3D8h 驻足寻幽（-1行脚 + 途中奇遇弹窗二选一）', JSON.stringify(enc));
    const beforeEnc = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-qxm-choice]').click(); });
    await page.waitForTimeout(200);
    const afterEnc = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    const encOk =
      (afterEnc.exp === beforeEnc.exp + 28 && afterEnc.mp === Math.max(0, beforeEnc.mp - 15) && afterEnc.karma.xiaoyao === beforeEnc.karma.xiaoyao + 10) ||
      (afterEnc.gold === beforeEnc.gold + 20 && afterEnc.fame === beforeEnc.fame + 10 && afterEnc.karma.xiayi === beforeEnc.karma.xiayi + 12) ||
      (afterEnc.karma.xiayi === beforeEnc.karma.xiayi + 15 && afterEnc.karma.kuangao === beforeEnc.karma.kuangao + 5); /* 拔刀相助支：侠义+15 + 对手卡（引擎 M2） */
    T(encOk, 'Q3D8i 奇遇抉择落账（临摹 逍遥+10/修为+28 ⇔ 义葬 侠义+12/银+20，合法二选一）',
      JSON.stringify({ b: { exp: beforeEnc.exp, mp: beforeEnc.mp, gold: beforeEnc.gold }, a: { exp: afterEnc.exp, mp: afterEnc.mp, gold: afterEnc.gold } }));

    /* ⑥ HUD 吐纳过旬（meditateRest 语义：气血 +45%max、内息 +60%max、过旬、精力回满——非全满） */
    const preTurn = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    await page.evaluate(() => { document.getElementById('btn-turn').click(); });
    await page.waitForTimeout(250);
    const afterTurn = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    const hpOk = afterTurn.hp === Math.min(afterTurn.maxHp, preTurn.hp + Math.round(afterTurn.maxHp * 0.45));
    const mpOk = afterTurn.mp === Math.min(afterTurn.maxMp, preTurn.mp + Math.round(afterTurn.maxMp * 0.6));
    T(afterTurn.turn === 8 && afterTurn.ap === afterTurn.maxAp && hpOk && mpOk,
      'Q3D8j 吐纳过旬（第8旬 + 精力回满 + meditateRest 45%/60% 回复）', JSON.stringify({ turn: afterTurn.turn, ap: afterTurn.ap, hp: preTurn.hp + '→' + afterTurn.hp + '/' + afterTurn.maxHp, mp: preTurn.mp + '→' + afterTurn.mp + '/' + afterTurn.maxMp }));
    /* ── Q3D9 组 · M2 三招对决（缉拿 e2e · 半屏出招卡 + 3D 背景糊化）────────── */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    const hasBountyAct = !!(await page.evaluate(() => document.querySelector('#qx-modal [data-act="bounty_duel"]')));
    T(hasBountyAct, 'Q3D9a 缉拿动作（初始档恶徒在此格 ⇒ bounty_duel 在位）', 'bounty_duel=' + hasBountyAct);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-act="bounty_duel"]').click(); });
    await page.waitForTimeout(300);
    const dl0 = await page.evaluate(() => ({
      open: !document.getElementById('duel-overlay').classList.contains('hidden'),
      cards: document.querySelectorAll('#duel-overlay .dl-cards .dl-card').length,
      blur: getComputedStyle(document.getElementById('duel-overlay')).backdropFilter.length > 0,
      intent: /敌出/.test(document.getElementById('duel-overlay').textContent),
      enemy: /沙通天/.test(document.getElementById('duel-overlay').textContent)
    }));
    T(dl0.open && dl0.cards === 3 && dl0.blur && dl0.intent && dl0.enemy,
      'Q3D9b 出招面板（半屏卡 + 背景糊化 + 意图提示 + 三槽手牌）', JSON.stringify(dl0));
    const bPre = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    const du = await playDuelThrough();
    const dlR = { finished: !!du.title, title: du.title, closeBtn: true };
    T(dlR.finished && dlR.closeBtn, 'Q3D9c 三招终局（胜出 ⇔ 惜败结算面板出）', JSON.stringify(dlR));
    const bPost = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    const win = du.win;
    const duelOk = win
      ? (bPost.bounties.length === 1 && bPost.gold === bPre.gold + 32 && bPost.fame === bPre.fame + 14) /* 初始档沙通天 rewardFame=14 */
      : (bPost.bounties.length === 2 && bPost.exp === bPre.exp + 10);
    T(duelOk, 'Q3D9d 终局落账（胜：缉拿 splice+赏银/侠名 ⇔ 败：修为+10，合法二态）',
      JSON.stringify({ win: win, b: bPre.bounties.length + '/' + bPost.bounties.length, gold: bPre.gold + '→' + bPost.gold, exp: bPre.exp + '→' + bPost.exp }));

    /* Q3D6 跨世棋盘重开（QX16 语义，三步）：
     * ① 首遇 payload（存档 worldGen=null）⇒ 记值不清档（「含首次无记录续档不动」）；
     * ② gen 变大（转世）⇒ 清档 + 刷新回创角封面；
     * ③ 同 gen 再载 ⇒ 续档不动。 */
    await page.evaluate(() => { localStorage.setItem('qunxia-payload-v1', JSON.stringify({ gen: 7 })); });
    await page.reload();
    await page.waitForFunction(() => !!(window.QX3D && window.QX3D_APP && window.QX3D_DATA && window.QX3D_DATA.QX3D_STATE_INIT), null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const g0 = await page.evaluate(() => ({
      mem: window.QX3D_APP.state.worldGen,
      disk: (JSON.parse(localStorage.getItem('shanqian3d_save_v1') || 'null') || {}).worldGen
    }));
    T(g0.mem === 7, 'Q3D6a 首遇 payload gen=7 ⇒ 记值续档（内存 worldGen=7，不回创角）', JSON.stringify(g0));
    /* 落盘：原版同构——reconcile 只记内存，存档随下一次 saveGame 持久化 */
    await clickSafe('#btn-turn');
    await page.waitForTimeout(200);
    const g0b = await page.evaluate(() => (JSON.parse(localStorage.getItem('shanqian3d_save_v1') || 'null') || {}).worldGen);
    T(g0b === 7, 'Q3D6a-2 过旬落盘后 disk worldGen=7', 'disk=' + g0b);

    await page.evaluate(() => { localStorage.setItem('qunxia-payload-v1', JSON.stringify({ gen: 8 })); });
    await page.reload();
    await page.waitForFunction(() => !!(window.QX3D && window.QX3D_APP && window.QX3D_DATA && window.QX3D_DATA.QX3D_STATE_INIT), null, { timeout: 20000 });
    await page.waitForTimeout(700);
    const g1 = await page.evaluate(() => ({
      save: localStorage.getItem('shanqian3d_save_v1'),
      modal: document.getElementById('creation-modal').classList.contains('show')
    }));
    T(g1.save === null && g1.modal, 'Q3D6b gen 变大 7→8 ⇒ 清档 + 刷新回创角', JSON.stringify({ save: g1.save === null ? null : 'present', modal: g1.modal }));

    /* Q3D6c 同 gen 续档不动：重新创角后 gen 仍 8 再载 ⇒ 不清 */
    await page.evaluate(() => {
      document.querySelector('#creation-origins [data-origin="palm_hero"]').click();
      document.querySelector('#creation-vows [data-vow="vow_hero"]').click();
    });
    await clickSafe('#btn-creation-submit');
    await page.waitForTimeout(250);
    await page.reload();
    await page.waitForFunction(() => !!(window.QX3D && window.QX3D_APP && window.QX3D_APP.state), null, { timeout: 20000 });
    await page.waitForTimeout(300);
    const g2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1') || 'null');
      return { kept: !!st && st.hasCreatedChar && st.worldGen === 8, origin: st && st.originId };
    });
    T(g2.kept && g2.origin === 'palm_hero', 'Q3D6c gen 相同 ⇒ 续档不动（worldGen 记值 8，不重弹创角）', JSON.stringify(g2));

    /* 收口：全程零脚本错误 */
    T(errs.length === 0 && (await page.evaluate(() => window.__errs.length)) === 0,
      'Q3D7 全程零脚本错误（pageerror/console.error/window.__errs 三源）', errs.slice(0, 3).join(' | '));
  } catch (e) {
    T(false, 'Q3DX 走查中断（异常抛出）', String(e).slice(0, 200));
  }

  await browser.close();
  console.log(pass + '/' + (pass + fail));
  if (fail === 0) console.log('QUNXIA3D_ALL_GREEN ' + pass + '/' + (pass + fail));
  else { console.log('QUNXIA3D_FAIL ' + pass + '/' + (pass + fail)); process.exit(1); }
})();
