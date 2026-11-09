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
  /* 创角走真五步（册299 分屏）：出身 → 命格 → 誓言 → 姓名 → 复核 → 提交；name 可省 */
  const createChar = async (originId, vowId, name) => {
    await page.evaluate((id) => { document.querySelector('#creation-origins [data-origin="' + id + '"]').click(); }, originId);
    await clickSafe('#btn-creation-next');   /* → 命格 */
    await clickSafe('#btn-creation-next');   /* → 誓言 */
    await page.evaluate((id) => { document.querySelector('#creation-vows [data-vow="' + id + '"]').click(); }, vowId);
    await clickSafe('#btn-creation-next');   /* → 姓名 */
    if (name) await page.fill('#creation-name', name);
    await clickSafe('#btn-creation-next');   /* → 复核 */
    await clickSafe('#btn-creation-submit');
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

    /* Q3D1 创角向导（无档 ⇒ 自动弹出；册299 起 = 真五步分屏） */
    const c0 = await page.evaluate(() => {
      const act = document.querySelector('#creation-steps .cr-nav-item.active');
      return {
        modal: document.getElementById('creation-modal').classList.contains('show'),
        origins: document.querySelectorAll('#creation-origins .cr-origin').length,
        locked: document.querySelectorAll('#creation-origins .cr-origin.locked').length,
        talents: document.querySelectorAll('#creation-talents .cr-talent').length,
        vows: document.querySelectorAll('#creation-vows .cr-vow').length,
        steps: document.querySelectorAll('#creation-steps [data-step]').length,
        activeStep: act && act.getAttribute('data-step'),
        visibleSteps: Array.prototype.filter.call(document.querySelectorAll('.cr-step'), (s) => s.classList.contains('active')).length,
        submitShown: !document.getElementById('btn-creation-submit').classList.contains('hidden')
      };
    });
    T(c0.modal && c0.origins === 6 && c0.talents === 3 && c0.vows === 3,
      'Q3D1 创角向导（无档自动弹出 ⇔ 6 出身 + 3 命格 + 3 誓言在位）', JSON.stringify(c0));
    T(c0.locked === 2, 'Q3D1b 二周目出身锁定（reqCycle 灰卡 ×2）', 'locked=' + c0.locked);
    T(c0.steps === 5 && c0.activeStep === '1' && c0.visibleSteps === 1 && c0.submitShown === false,
      'Q3D1c 真五步分屏（左步序 5 项 ⇔ 仅第 1 步在屏 ⇔ 复核前不显提交钮）', JSON.stringify(c0));

    /* 未择出身点「下一步」⇒ 步序校验拦住（停在第 1 步） */
    await page.click('#btn-creation-next');
    await page.waitForTimeout(120);
    const c0b = await page.evaluate(() => ({
      step: document.querySelector('#creation-steps .cr-nav-item.active').getAttribute('data-step')
    }));
    T(c0b.step === '1', 'Q3D1d 未择出身 ⇔ 下一步不前进（步序校验）', JSON.stringify(c0b));

    /* Q3D2 真五步走：出身 → 命格（重摇）→ 誓言 → 姓名 → 复核 → 提交 */
    await page.evaluate(() => { document.querySelector('#creation-origins [data-origin="sword_wanderer"]').click(); });
    await clickSafe('#btn-creation-next');
    await page.waitForTimeout(120);
    await clickSafe('#btn-creation-reroll');
    const c2a = await page.evaluate(() => ({
      step: document.querySelector('#creation-steps .cr-nav-item.active').getAttribute('data-step'),
      talents: document.querySelectorAll('#creation-talents .cr-talent').length,
      reroll: document.getElementById('creation-reroll-count').textContent
    }));
    T(c2a.step === '2' && c2a.talents === 3 && /第 2 次/.test(c2a.reroll),
      'Q3D2a 命格步（第 2 步在屏 ⇔ 3 格命格 ⇔ 重摇计数推进）', JSON.stringify(c2a));
    await clickSafe('#btn-creation-next');
    await page.evaluate(() => { document.querySelector('#creation-vows [data-vow="vow_homestead"]').click(); });
    await clickSafe('#btn-creation-next');
    await page.fill('#creation-name', '走查剑客');
    await clickSafe('#btn-creation-next');
    await page.waitForTimeout(120);
    const c5 = await page.evaluate(() => ({
      step: document.querySelector('#creation-steps .cr-nav-item.active').getAttribute('data-step'),
      review: document.getElementById('creation-review').textContent,
      submitShown: !document.getElementById('btn-creation-submit').classList.contains('hidden')
    }));
    T(c5.step === '5' && c5.submitShown && /走查剑客/.test(c5.review) && /乡野剑徒/.test(c5.review) && /耕读传家/.test(c5.review),
      'Q3D2b 复核确认（名号/出身/誓言同屏 ⇔ 末步才出「踏入江湖」）', JSON.stringify(c5));

    await clickSafe('#btn-creation-submit');
    await page.waitForTimeout(300);
    const c1 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1') || 'null');
      return {
        created: st && st.hasCreatedChar,
        origin: st && st.originId,
        vow: st && st.openingVow,
        name: st && st.playerName,
        tal: st && st.talents.length,
        hud: document.getElementById('hud-bar').classList.contains('show'),
        turnBtn: document.getElementById('btn-turn').style.display !== 'none',
        hp: document.getElementById('hud-hp-text').textContent,
        ap: document.getElementById('hud-ap-text').textContent,
        date: document.getElementById('hud-date-badge').textContent,
        modalGone: !document.getElementById('creation-modal').classList.contains('show')
      };
    });
    T(c1.created && c1.origin === 'sword_wanderer' && c1.vow === 'vow_homestead' && c1.name === '走查剑客' && c1.tal === 3,
      'Q3D2c 创角提交（applyOrigin 落档 shanqian3d_save_v1 ⇔ 姓名/出身/誓言/命格入档）', JSON.stringify(c1));
    T(c1.hud && c1.turnBtn && c1.modalGone && /^\d+\/\d+$/.test(c1.hp) && c1.ap === '5/5' && c1.date === '第1/36旬',
      'Q3D2d 纸面 HUD 同步（hud-bar 显 ⇔ 气血/行脚 5/5/第1旬读数在位）', JSON.stringify(c1));

    /* M2 尾批（册277）：创角后 1.2s 会弹首局教学邀请——旧流程段先关掉它
     * （教学 e2e 在 Q3D11 独立 context；此处跳过后调度不再重发，不影响后续组） */
    await page.waitForTimeout(1600);
    await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      if (m && !m.classList.contains('hidden') && /首局必修/.test(m.textContent)) {
        const x = m.querySelector('[data-qxm-close]');
        if (x) x.click();
      }
    });
    await page.waitForTimeout(200);
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

    /* ── Q3D15 组 · P4-A 市井层（册300）：在场行 → 浮层 → 打听落档 ───────────
     * 就地取景：此刻正在洛阳格 1 太白酒肆（跑堂岗），故先做市井再走八格动作。 */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    const st15 = await page.evaluate(() => {
      const rows = Array.prototype.map.call(document.querySelectorAll('#qx-modal [data-street]'), (b) => b.textContent);
      return { rows: rows.length, text: rows.join('|'), panelOpen: !document.getElementById('qx-modal').classList.contains('hidden') };
    });
    T(st15.panelOpen && st15.rows >= 1 && /跑堂|乞丐|镖师|药徒|书商|官差/.test(st15.text),
      'Q3D15a 市井在场行（本境动作面板挂「市井 · 在场」⇔ 岗位+姓名上屏）', JSON.stringify(st15));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-street]').click(); });
    await page.waitForTimeout(200);
    const sd = await page.evaluate(() => ({
      open: !document.getElementById('qx-modal').classList.contains('hidden'),
      seal: (document.querySelector('#qx-modal .qxm-street-seal') || {}).textContent || '',
      lines: document.querySelectorAll('#qx-modal .qxm-street p').length,
      acts: document.querySelectorAll('#qx-modal [data-street-act]').length,
      meta: /市井见识/.test(document.getElementById('qx-modal').textContent)
    }));
    T(sd.open && !!sd.seal && sd.lines === 3 && sd.acts === 3 && sd.meta,
      'Q3D15b 市井浮层（职名印 + 三句场面 + 三动作 + 市井见识行）', JSON.stringify(sd));
    /* 打听：三档之一 ⇒ 日志入「市井」+ 可信度/见识落档 */
    await page.evaluate(() => { document.querySelector('#qx-modal [data-street-act="inquire"]').click(); });
    await page.waitForTimeout(300);
    const post15 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      const logs = (st.logs || []).map((l) => l.text);
      return {
        last: logs[0] || '', tier: st.intelTier, grade: st.rumorReliability,
        rumor: (st.pendingRumor && st.pendingRumor.text) || ''
      };
    });
    T(/【市井·/.test(post15.last) && /可靠|过时|矛盾/.test(post15.last) && ['reliable', 'stale', 'conflict'].indexOf(post15.grade) >= 0 && !!post15.rumor,
      'Q3D15c 打听落档（日志【市井·】+ 三档可信度 + pendingRumor 入档）', JSON.stringify({ last: post15.last.slice(0, 70), tier: post15.tier, grade: post15.grade }));
    /* 同旬再打听 ⇒ gap=1 冷却真拦（不是摆设） */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.querySelector('#qx-modal [data-street]').click(); });
    await page.waitForTimeout(200);
    const again = await page.evaluate(() => {
      const b = document.querySelector('#qx-modal [data-street-act="inquire"]');
      return { disabled: !!b && b.disabled, text: b ? b.textContent : '' };
    });
    T(again.disabled && /本旬已做过/.test(again.text),
      'Q3D15d 同旬冷却（打听后本旬再开 ⇔ 按钮禁用「本旬已做过」）', JSON.stringify(again));
    await page.evaluate(() => { const x = document.querySelector('#qx-modal [data-qxm-close]'); if (x) x.click(); });
    await page.waitForTimeout(150);

    /* ── Q3D17 组 · P4-B 配角包（册303 B1a）：在场 → 浮层 → 打探落档 ─────────── */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    const sd0 = await page.evaluate(() => {
      const rows = Array.prototype.map.call(document.querySelectorAll('#qx-modal [data-side]'), (b) => b.textContent);
      return { rows: rows.length, text: rows.join('|') };
    });
    T(sd0.rows >= 1 && /酒肆小二|平四|郑萼/.test(sd0.text),
      'Q3D17a 配角在场行（市井同面板另起「配角 · 在场」⇔ 姓名+身份上屏）', JSON.stringify(sd0));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-side]').click(); });
    await page.waitForTimeout(200);
    const sd1 = await page.evaluate(() => ({
      seal: (document.querySelector('#qx-modal .qxm-street-seal') || {}).textContent || '',
      lines: document.querySelectorAll('#qx-modal .qxm-street p').length,
      acts: Array.prototype.map.call(document.querySelectorAll('#qx-modal [data-side-act]'), (b) => b.getAttribute('data-side-act'))
    }));
    T(sd1.seal === '配角' && sd1.lines >= 1 && sd1.acts.length === 3 && sd1.acts[0] === 'xiao_ask',
      'Q3D17b 配角浮层（三句自述 ⇔ 三动作，首位=打探）', JSON.stringify(sd1));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-side-act="xiao_ask"]').click(); });
    await page.waitForTimeout(300);
    const sd2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { last: (st.logs || [])[0] && st.logs[0].text, grade: st.rumorReliability, rumor: (st.pendingRumor && st.pendingRumor.text) || '', bias: st.sideScrollBias.road || 0 };
    });
    T(/【酒肆小二】/.test(sd2.last || '') && ['reliable', 'stale', 'conflict'].indexOf(sd2.grade) >= 0 && !!sd2.rumor && sd2.bias >= 1,
      'Q3D17c 配角打探落档（日志 + 三档 + pendingRumor + road 偏置）', JSON.stringify({ grade: sd2.grade, bias: sd2.bias, last: (sd2.last || '').slice(0, 40) }));

    /* ── Q3D18 组 · P4-B B1b 新配角（册304）：华山劳德诺 → 接夜路差事 → 空白帖解锁 ── */
    await page.evaluate(() => {
      const a = window.QX3D_APP;
      a.state.currentRegion = 'huashan';
      a.state.viewLayer = 'local';
      a.state.currentTileIdx = 2;
      a.state.sidePresence[a.state.turn + ':huashan'] = ['laodenuo'];
    });
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    const lb0 = await page.evaluate(() => {
      const row = document.querySelector('#qx-modal [data-side="laodenuo"]');
      if (!row) return { shown: false };
      row.click();
      return { shown: true };
    });
    await page.waitForTimeout(200);
    const lb1 = await page.evaluate(() => ({
      acts: Array.prototype.map.call(document.querySelectorAll('#qx-modal [data-side-act]'), (b) => ({ id: b.getAttribute('data-side-act'), disabled: b.disabled })),
      lines: document.querySelectorAll('#qx-modal .qxm-street p').length
    }));
    T(lb0.shown && lb1.lines >= 1 && lb1.acts.length === 3 && lb1.acts[0].id === 'lao_accept' && lb1.acts[2].disabled === true,
      'Q3D18a 新配角上屏（劳德诺三动作 ⇔ 未接差事时「追问空白帖」禁用）', JSON.stringify(lb1));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-side-act="lao_accept"]').click(); });
    await page.waitForTimeout(300);
    const lb2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { shadow: st.sideFlags.nightShadow, bias: st.sideScrollBias.chousha || 0, last: (st.logs || [])[0] && st.logs[0].text };
    });
    T(lb2.shadow === 'accepted' && lb2.bias >= 1 && /【劳德诺】/.test(lb2.last || ''),
      'Q3D18b 夜路差事落档（nightShadow=accepted ⇔ chousha 偏置 ⇔ 日志入档）', JSON.stringify({ shadow: lb2.shadow, bias: lb2.bias }));
    await page.evaluate(() => {
      const a = window.QX3D_APP;
      a.state.currentRegion = 'luoyang';
      a.state.currentTileIdx = 1;
    });

    /* ── Q3D16 组 · P4-C 朝廷风声（册301）：角标 → 结论体 → 应召落档 ─────────── */
    const ct0 = await page.evaluate(() => {
      const b = document.querySelector('#hud-court [data-court="court"]');
      return { shown: !!b, label: b ? b.textContent : '', hot: b ? b.classList.contains('hot') : false };
    });
    T(ct0.shown && /朝廷·有诏/.test(ct0.label) && ct0.hot,
      'Q3D16a 顶栏朝廷角标（开局有诏 ⇔ 朱砂 hot 态）', JSON.stringify(ct0));
    await page.evaluate(() => { document.querySelector('#hud-court [data-court="court"]').click(); });
    await page.waitForTimeout(200);
    const ct1 = await page.evaluate(() => ({
      open: !document.getElementById('qx-modal').classList.contains('hidden'),
      title: (document.querySelector('#qx-modal .qxm-title') || {}).textContent || '',
      choices: document.querySelectorAll('#qx-modal [data-court-pick]').length,
      desc: (document.querySelector('#qx-modal .qxm-desc') || {}).textContent || ''
    }));
    T(ct1.open && ct1.title === '功名与通缉' && ct1.choices === 3 && /功名：功名未动/.test(ct1.desc),
      'Q3D16b 角标结论体（功名/通缉短词 + 三选择）', JSON.stringify({ title: ct1.title, choices: ct1.choices }));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-court-pick="0"]').click(); });
    await page.waitForTimeout(200);
    const ct2 = await page.evaluate(() => ({
      title: (document.querySelector('#qx-modal .qxm-title') || {}).textContent || '',
      labels: Array.prototype.map.call(document.querySelectorAll('#qx-modal [data-court-pick]'), (b) => b.textContent)
    }));
    T(/驿站诏令/.test(ct2.title) && ct2.labels.join('|') === '应召|拒诏|拖延',
      'Q3D16c 置顶风声（诏令 → 应召/拒诏/拖延 三选）', JSON.stringify(ct2));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-court-pick="0"]').click(); }); /* 应召 */
    await page.waitForTimeout(300);
    const ct3 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return {
        merit: st.court.merit, wanted: st.court.wanted, answered: st.court.flags.answered || 0,
        edict: (st.court.rumors || []).some((r) => r.id === 'edict'),
        last: (st.logs || [])[0] && st.logs[0].text,
        badge: (document.querySelector('#hud-court [data-court="court"]') || {}).textContent || ''
      };
    });
    T(ct3.merit === 18 && ct3.wanted === 0 && ct3.answered === 1 && !ct3.edict && /【诏令】你应了召/.test(ct3.last || '') && /朝廷·薄功/.test(ct3.badge),
      'Q3D16d 应召落档（功名 +18 · 诏令离场 · 角标改「薄功」）', JSON.stringify({ merit: ct3.merit, wanted: ct3.wanted, badge: ct3.badge }));

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
    /* Q3D16e 过旬结算钩子：advanceTime → env.settleCourtOnNewTurn ⇒ 新旬风声重算、诏令再至 */
    const ctSettle = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { rumorTurn: st.court.rumorTurn, edict: (st.court.rumors || []).some((r) => r.id === 'edict') };
    });
    T(ctSettle.rumorTurn === 8 && ctSettle.edict,
      'Q3D16e 过旬结算钩子（settleCourtOnNewTurn 真跑 ⇔ 新旬风声重算、诏令再至）', JSON.stringify(ctSettle));
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
    await createChar('palm_hero', 'vow_hero');
    await page.waitForTimeout(250);
    await page.reload();
    await page.waitForFunction(() => !!(window.QX3D && window.QX3D_APP && window.QX3D_APP.state), null, { timeout: 20000 });
    await page.waitForTimeout(300);
    const g2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1') || 'null');
      return { kept: !!st && st.hasCreatedChar && st.worldGen === 8, origin: st && st.originId };
    });
    T(g2.kept && g2.origin === 'palm_hero', 'Q3D6c gen 相同 ⇒ 续档不动（worldGen 记值 8，不重弹创角）', JSON.stringify(g2));

    /* ── Q3D10 组 · M3 payload 内容桥 + 36 案赴会回流（扩展契约全链）────────── */
    /* Q3D6c 留下的档：gen=8 · palm_hero · 第1旬 · 洛阳。种带 we_ 事件的 payload
     * （gen 不变 ⇒ 续档），reload ⇒ boot 合并注入日程，过旬触发 ⇒ 赴会胜 ⇒ alt 回流队列。 */
    await page.evaluate(() => {
      localStorage.setItem('qunxia-payload-v1', JSON.stringify({
        gen: 8,
        arts: [{ id: 'yg_ext3', name: '渡世掌·刊三', k: 'neigong', nat: 'rou', t: 'di', f: 200, s: [] }],
        events: [{ id: 'we_ext3_a', name: '洛水论剑大会·刊三', z: 'luoyang', boss: null, desc: '群豪论剑。', lose: '败者退场。' }],
        knots: { we_ext3_a: { cast: ['无名剑客'], opts: [{ k: 'join', label: '拔剑' }] } }
      }));
    });
    await page.reload();
    await page.waitForFunction(() => window.QX3D_APP && window.QX3D_APP.state, null, { timeout: 20000 });
    await page.waitForTimeout(500);
    const m0 = await page.evaluate(() => ({
      art: !!window.QX3D_DATA.MARTIAL_DB.yg_ext3,
      ev: window.QX3D_DATA.CANON_EVENTS_SCHEDULE.some(x => x.id === 'we_ext3_a'),
      knot: !!(window.QX3D_DATA.KNOT_SCENES && window.QX3D_DATA.KNOT_SCENES.we_ext3_a),
      gen: window.QX3D_APP.state.worldGen
    }));
    T(m0.art && m0.ev && m0.knot && m0.gen === 8,
      'Q3D10a payload 合并（boot 自读注入：武学/事件/当场戏 + gen 记值续档）', JSON.stringify(m0));
    await page.evaluate(() => { document.getElementById('btn-turn').click(); });
    await page.waitForTimeout(250);
    const ev1 = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    /* 新案无 EV_TURN_MAP 位 ⇒ fallback triggerTurn = 6 + idx%30（idx 0 ⇒ 第 6 旬）——推进到触发旬 */
    for (let i = 0; i < 4; i++) { await page.evaluate(() => { document.getElementById('btn-turn').click(); }); await page.waitForTimeout(120); }
    const ev2 = await page.evaluate(() => JSON.parse(localStorage.getItem('shanqian3d_save_v1')));
    T(ev2.turn === 6 && (ev2.crises || []).some(c => c.id === 'we_ext3_a') && ev2.canonEventsTriggered.we_ext3_a === true,
      'Q3D10b 36 案按旬触发（fallback 旬位第6旬 ⇒ we_ext3_a 入 crises）', JSON.stringify({ turn: ev2.turn, n: (ev2.crises || []).length }));
    /* 赴会：crisis_join（洛阳在本地） */
    await page.evaluate(() => { window.QX3D_APP.runAction('crisis_join'); });
    await page.waitForTimeout(300);
    const dlOpen2 = await page.evaluate(() => !document.getElementById('duel-overlay').classList.contains('hidden'));
    T(dlOpen2, 'Q3D10c 挺身入局（crisis_join ⇒ 对决面板出 · 敌为 payload boss 折算）', 'open=' + dlOpen2);
    const du3 = await playDuelThrough();
    const qd = await page.evaluate(() => ({
      q: JSON.parse(localStorage.getItem('qunxia-result-queue-v1') || '[]'),
      rep: JSON.parse(localStorage.getItem('shanqian3d_save_v1')).canonEventReports.map(r => r.title)
    }));
    const altOk = du3.win
      ? qd.q.some(x => x.id === 'we_ext3_a' && x.outcome === 'alt')
      : qd.q.some(x => x.id === 'we_ext3_a' && x.outcome === 'lose');
    T(altOk && qd.rep.some(t => /洛水论剑/.test(t)),
      'Q3D10d 终局回流（胜 ⇒ alt / 败 ⇒ lose 入队 + 邸报入档，扩展契约全链）',
      JSON.stringify({ win: du3.win, q: qd.q, rep: qd.rep }));


    /* ── Q3D11 组 · M2 尾批教学战（首局必修 · 形×势连招 · 拍板 = 逐字复刻）────── */
    /* Q3D10 留下的档：palm_hero 第 6 旬已赴会——教学战调度条件 turn≤4 不满足，
     * 故教学战 e2e 走独立 context：Q3D6c 后第一时间截获（在 Q3D10 之前的此处档 = 第1旬）。
     * 做法：先清档重开新世（走创角 → 1.2s 后邀请弹窗 → 全脚本教学）。 */
    await page.evaluate(() => {
      localStorage.removeItem('shanqian3d_save_v1');
      localStorage.setItem('qunxia-payload-v1', JSON.stringify({ gen: 20 }));
    });
    await page.reload();
    await page.waitForFunction(() => window.QX3D_APP && window.QX3D_DATA.QX3D_STATE_INIT, null, { timeout: 20000 });
    await page.waitForTimeout(400);
    await createChar('taoist_scholar', 'vow_homestead');
    await page.waitForTimeout(1700); /* 调度延迟 1200ms + 弹窗 */
    const tu0 = await page.evaluate(() => ({
      invite: /首局必修/.test(document.getElementById('qx-modal').textContent),
      enterBtn: /进入教学战/.test(document.getElementById('qx-modal').textContent)
    }));
    T(tu0.invite && tu0.enterBtn, 'Q3D11a 教学邀请（创角后 1.2s 独占弹窗「首局必修·酒肆后巷」）', JSON.stringify(tu0));
    await page.evaluate(() => {
      const btns = document.querySelectorAll('#qx-modal [data-qxm-choice]');
      btns[0].click();
    });
    await page.waitForTimeout(300);
    const tu1 = await page.evaluate(() => ({
      open: !document.getElementById('duel-overlay').classList.contains('hidden'),
      intro: /先认/.test(document.getElementById('duel-overlay').textContent) && /势/.test(document.getElementById('duel-overlay').textContent),
      knownBtn: !!document.querySelector('#duel-overlay [data-tut="name_forms"]')
    }));
    T(tu1.open && tu1.intro && tu1.knownBtn, 'Q3D11b 教学战开局（醉汉武师 · intro 步「知道了」在位）', JSON.stringify(tu1));
    await page.evaluate(() => { document.querySelector('#duel-overlay [data-tut="name_forms"]').click(); });
    await page.waitForTimeout(150);
    const tu2 = await page.evaluate(() => {
      document.querySelector('#duel-overlay [data-tut="form_fist"]').click();
      document.querySelector('#duel-overlay [data-tut="form_sword"]').click();
      document.querySelector('#duel-overlay [data-tut="form_qinggong"]').click();
      return { named3: !!document.querySelector('#duel-overlay [data-tut="force_break"]') };
    });
    T(tu2.named3, 'Q3D11c 点名三形（拳/剑/轻功 ✓ ⇒ 「开始破防」钮出现）', JSON.stringify(tu2));
    await page.evaluate(() => { document.querySelector('#duel-overlay [data-tut="force_break"]').click(); });
    await page.waitForTimeout(150);
    const tu3 = await page.evaluate(() => ({
      breakPhase: /破防/.test(document.getElementById('duel-overlay').textContent),
      cardBreak: !!document.querySelector('#duel-overlay .dl-cards .dl-card')
    }));
    T(tu3.breakPhase && tu3.cardBreak, 'Q3D11d 强制破防段（allowedShi=break ⇔ 手牌过滤出招）', JSON.stringify(tu3));
    await page.evaluate(() => { document.querySelector('#duel-overlay .dl-cards .dl-card').click(); });
    await page.waitForTimeout(180);
    const tu4 = await page.evaluate(() => /追上去/.test(document.getElementById('duel-overlay').textContent));
    T(tu4, 'Q3D11e 破防 → 追击段步进', 'chase=' + tu4);
    const card2 = await page.waitForSelector('#duel-overlay .dl-cards .dl-card', { timeout: 5000 });
    await card2.click();
    await page.waitForTimeout(250);
    const tu5 = await page.evaluate(() => ({
      st: JSON.parse(localStorage.getItem('shanqian3d_save_v1')),
      overlay: document.getElementById('duel-overlay').textContent
    }));
    T(tu5.st.tutorialComboDone === true && /教学完成|胜出/.test(tu5.overlay),
      'Q3D11f 教学成招终局（tutorialComboDone 落档 + outro/结算面）', JSON.stringify({ done: tu5.st.tutorialComboDone }));
    await page.click('#btn-duel-close');
    await page.waitForTimeout(200);
    const tu6 = await page.evaluate(() => /连招已通/.test(document.getElementById('toast-container').textContent));
    T(tu6, 'Q3D11g 收招（连招已通 toast · 教学态清帐）', 'toast=' + tu6);

    /* 🆕 册289：BGM 五曲合成器（ui/audio.js · 计划书 §四 #13）——headless 判数据面与控件，出声不入判 */
    const bg1 = await page.evaluate(() => ({
      has: !!(window.QX3D && window.QX3D.ui && window.QX3D.ui.audio),
      suites: (window.QX3D && window.QX3D.ui && window.QX3D.ui.audio) ? window.QX3D.ui.audio.BGM_SUITES.length : 0,
      first: (window.QX3D && window.QX3D.ui && window.QX3D.ui.audio) ? window.QX3D.ui.audio.BGM_SUITES[0].id : null,
      gumu: (window.QX3D && window.QX3D.ui && window.QX3D.ui.audio) ? window.QX3D.ui.audio.suiteIdxForRegion("gumu") : -1
    }));
    T(bg1.has && bg1.suites === 5 && bg1.first === "canghai" && bg1.gumu === 3,
      "Q3D12a BGM 五曲装载（audio 命名空间 + 5 曲 + 首曲 canghai + 场景映射 gumu→3）",
      JSON.stringify(bg1));
    await page.click("#btn-sound");
    await page.waitForTimeout(120);
    const bg2a = await page.evaluate(() => ({
      label: document.getElementById("btn-sound").textContent,
      enabled: window.QX3D.ui.audio.isSoundEnabled()
    }));
    await page.click("#btn-bgm");
    await page.waitForTimeout(120);
    const bg2b = await page.evaluate(() => document.getElementById("bgm-suite-label").textContent);
    await page.click("#btn-sound");
    await page.waitForTimeout(120);
    const bg2c = await page.evaluate(() => window.QX3D.ui.audio.isSoundEnabled());
    T(bg2a.enabled === false && /静音/.test(bg2a.label) && bg2b.length > 2 && bg2c === true,
      "Q3D12b 琴音开关与换曲（🔇 翻面 · 曲目标签非空 · 复开）",
      JSON.stringify({ a: bg2a, suite: bg2b, reenabled: bg2c }));
    /* 🆕 册292：设置中心（ui/settings.js · audio prefs 四键上屏）——headless 判数据面与控件，出声不入判 */
    await page.click("#btn-settings");
    await page.waitForTimeout(150);
    const se1 = await page.evaluate(() => {
      const m = document.getElementById("qx-modal");
      const p = window.QX3D.ui.audio.getPrefs();
      const pct = v => Math.round(v * 100);
      return {
        open: !m.classList.contains("hidden"),
        sound: !!m.querySelector("#qxs-sound") && m.querySelector("#qxs-sound").checked === window.QX3D.ui.audio.isSoundEnabled(),
        bgm: m.querySelector("#qxs-bgm") ? Number(m.querySelector("#qxs-bgm").value) === pct(p.bgmVolume) : false,
        sfx: m.querySelector("#qxs-sfx") ? Number(m.querySelector("#qxs-sfx").value) === pct(p.sfxVolume) : false,
        auto: !!m.querySelector("#qxs-auto") && m.querySelector("#qxs-auto").checked === !!p.autoSwitchBgm
      };
    });
    T(se1.open && se1.sound && se1.bgm && se1.sfx && se1.auto,
      "Q3D13a 设置中心开模态（四控件在场 · 滑块/开关读数即 prefs 现值）", JSON.stringify(se1));
    await page.evaluate(() => {
      const r = document.getElementById("qxs-bgm");
      r.value = "50";
      r.dispatchEvent(new Event("input", { bubbles: true }));
      const c = document.getElementById("qxs-auto");
      c.checked = false;
      c.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(120);
    const se2a = await page.evaluate(() => ({
      saved: JSON.parse(localStorage.getItem("qunxia-audio-v1") || "{}"),
      echo: document.getElementById("qxs-bgm-val").textContent
    }));
    await page.evaluate(() => { document.querySelector("#qx-modal [data-qxm-close]").click(); });
    await page.waitForTimeout(120);
    await page.click("#btn-settings");
    await page.waitForTimeout(150);
    const se2b = await page.evaluate(() => ({
      bgm: Number(document.getElementById("qxs-bgm").value),
      auto: document.getElementById("qxs-auto").checked,
      stored: JSON.parse(localStorage.getItem("qunxia-audio-v1") || "{}")
    }));
    T(se2a.saved.bgmVolume === 0.5 && se2a.saved.autoSwitchBgm === false && se2a.echo === "50%"
      && se2b.bgm === 50 && se2b.auto === false && se2b.stored.bgmVolume === 0.5,
      "Q3D13b 滑块/开关动作落 qunxia-audio-v1（input 实时回写 · 回显同步 · 关闭重开保持）",
      JSON.stringify({ a: se2a, b: se2b }));
    await page.evaluate(() => { document.querySelector("#qx-modal [data-qxm-close]").click(); });

    /* 🆕 册293：江湖邸报合集（ui/gazette.js · canonEventReports 翻阅面） */
    await page.click("#btn-gazette");
    await page.waitForTimeout(150);
    const gz1 = await page.evaluate(() => {
      const m = document.getElementById("qx-modal");
      const saved = JSON.parse(localStorage.getItem("shanqian3d_save_v1") || "{}");
      const n = (saved.canonEventReports || []).length;
      const title = (m.querySelector(".qxm-title") || {}).textContent || "";
      const items = m.querySelectorAll(".qxm-gaz-item").length;
      const empty = !!m.querySelector(".qxm-gaz-empty");
      return { open: !m.classList.contains("hidden"), titleHas: title.indexOf("则") >= 0 && title.indexOf(String(n)) >= 0, items, empty, n };
    });
    T(gz1.open && gz1.titleHas && (gz1.n > 0 ? gz1.items === gz1.n : gz1.empty),
      "Q3D14a 邸报合集开（则数标签 = 存档 canonEventReports.length · 条目数对表 ‖ 空态句）", JSON.stringify(gz1));
    await page.evaluate(() => { document.querySelector("#qx-modal [data-qxm-close]").click(); });
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem("shanqian3d_save_v1"));
      saved.canonEventReports = (saved.canonEventReports || []).concat([
        { title: "【测试地】早先错过的盛会", participated: false, summary: "因你未在限期内赶赴，此事已按原著轨迹落幕。（走查种入）" },
        { title: "【测试地】刚刚亲历的大事", participated: true, summary: "你亲赴此地挺身入局，击败强敌，亲手改写了结局。（走查种入）" }
      ]);
      localStorage.setItem("shanqian3d_save_v1", JSON.stringify(saved));
    });
    await page.reload();
    await page.waitForTimeout(1500);
    await page.click("#btn-gazette");
    await page.waitForTimeout(150);
    const gz2 = await page.evaluate(() => {
      const m = document.getElementById("qx-modal");
      const first = m.querySelector(".qxm-gaz-item");
      const badges = Array.prototype.map.call(m.querySelectorAll(".qxm-gaz-badge"), b => b.textContent);
      const title = (m.querySelector(".qxm-title") || {}).textContent || "";
      return {
        firstTop: first ? /刚刚亲历/.test(first.textContent) : false,
        firstMine: first ? first.classList.contains("mine") : false,
        badges: badges.join("|"),
        titleHas2: title.indexOf("2 则") >= 0 || /共|[0-9]+ 则/.test(title)
      };
    });
    T(gz2.firstTop && gz2.firstMine && /亲历/.test(gz2.badges) && /错过/.test(gz2.badges) && gz2.titleHas2,
      "Q3D14b 种两条重开（倒序新在上 + 亲历徽记 jade 边 + 错过/亲历两态在场 + 则数标签）", JSON.stringify(gz2));
    await page.evaluate(() => { document.querySelector("#qx-modal [data-qxm-close]").click(); });

    /* ── Q3D19 组 · P4-E 情缘（册314 E3b）：顶栏角标 → 名册 → 人卡 → 三选落档 ──
     * 种档：黄蓉 affection 4 ⇒ 阶段「倾心」；桃花岛格 4 注入在场名单（面板在场行用）。 */
    await page.evaluate(() => {
      const a = window.QX3D_APP;
      const st = a.state;
      const rom = window.QX3D.systems.romance;
      rom.ensureState(st);
      st.romance.people.huangrong = { affection: 4, known: true, intel: true, pledged: false, act: {} };
      st.currentRegion = 'taohua';
      st.currentTileIdx = 4;
      st.sidePresence[(st.turn || 1) + ':taohua'] = ['huangrong'];
      window.QX3D.ui.hud.render(st);
    });
    await page.waitForTimeout(200);
    const rm0 = await page.evaluate(() => {
      const b = document.querySelector('#hud-romance [data-romance]');
      return { shown: !!b, label: b ? b.textContent : '' };
    });
    T(rm0.shown && /情缘·意动/.test(rm0.label),
      'Q3D19a 顶栏情缘角标（阶段到倾心 ⇒ 「情缘·意动」上屏）', JSON.stringify(rm0));

    /* 面板「情缘 · 在场」行：桃花岛格 4 与黄蓉同格 */
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    const rm1 = await page.evaluate(() => {
      const row = document.querySelector('#qx-modal [data-romance="huangrong"]');
      const heads = Array.prototype.map.call(document.querySelectorAll('#qx-modal .qxm-more-h'), (h) => h.textContent);
      return { row: row ? row.textContent : '', heads: heads.join('|') };
    });
    T(/黄蓉/.test(rm1.row) && /倾心/.test(rm1.row) && /情缘 · 在场/.test(rm1.heads),
      'Q3D19b 面板在场行（同格「情缘 · 在场」段 ⇔ 姓名 + 阶段词）', JSON.stringify(rm1));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-qxm-close]').click(); });
    await page.waitForTimeout(150);

    /* 角标 → 名册 */
    await page.evaluate(() => { document.querySelector('#hud-romance [data-romance]').click(); });
    await page.waitForTimeout(200);
    const rm2 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      const rows = Array.prototype.map.call(m.querySelectorAll('[data-romance-pick]'), (b) => b.textContent);
      return { open: !m.classList.contains('hidden'), title: (m.querySelector('.qxm-title') || {}).textContent || '', rows: rows.join('|') };
    });
    T(rm2.open && rm2.title === '名册' && /黄蓉/.test(rm2.rows) && /倾心/.test(rm2.rows),
      'Q3D19c 情缘名册（角标点开 ⇔ 只列已相识 + 阶段词）', JSON.stringify(rm2));

    /* 名册 → 人卡 */
    await page.evaluate(() => { document.querySelector('#qx-modal [data-romance-pick="huangrong"]').click(); });
    await page.waitForTimeout(200);
    const rm3 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      const acts = Array.prototype.map.call(m.querySelectorAll('[data-romance-act]'), (b) => b.getAttribute('data-romance-act'));
      return {
        seal: (m.querySelector('.qxm-street-seal') || {}).textContent || '',
        loc: (m.querySelector('.qxm-loc') || {}).textContent || '',
        note: (m.querySelector('.qxm-street-meta') || {}).textContent || '',
        acts: acts.join(','),
        lines: m.querySelectorAll('.qxm-street p').length
      };
    });
    T(rm3.seal === '情缘' && /倾心/.test(rm3.loc) && /意动/.test(rm3.note) && rm3.acts === 'rom_probe,rom_confess,rom_hold' && rm3.lines >= 1,
      'Q3D19d 情缘人卡（阶段词 + 只出阶段词的阶段注 + 倾心三动作同序）', JSON.stringify(rm3));

    /* 表白三选 → 有约落档 */
    await page.evaluate(() => { document.querySelector('#qx-modal [data-romance-act="rom_confess"]').click(); });
    await page.waitForTimeout(200);
    const rm4 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return {
        title: (m.querySelector('.qxm-title') || {}).textContent || '',
        picks: Array.prototype.map.call(m.querySelectorAll('[data-court-pick]'), (b) => b.textContent).join('|')
      };
    });
    await page.evaluate(() => { document.querySelector('#qx-modal [data-court-pick="0"]').click(); });
    await page.waitForTimeout(300);
    const rm5 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      const rom = window.QX3D.systems.romance;
      return {
        pledged: st.romance.people.huangrong.pledged,
        stage: rom.stage(st, 'huangrong'),
        badge: (document.querySelector('#hud-romance [data-romance]') || {}).textContent || ''
      };
    });
    T(/把心意说清楚/.test(rm4.title) && /确认心意/.test(rm4.picks) && /改日再提/.test(rm4.picks) && /先不说/.test(rm4.picks) &&
      rm5.pledged === true && rm5.stage === 'pledge' && /情缘·意动/.test(rm5.badge),
      'Q3D19e 表白三选（三选在屏 ⇔ 确认心意 ⇒ pledged + 阶段「有约」⇔ 角标仍在）', JSON.stringify({ picks: rm4.picks, pledged: rm5.pledged, stage: rm5.stage }));
    await page.evaluate(() => {
      const a = window.QX3D_APP;
      a.state.currentRegion = 'luoyang';
      a.state.currentTileIdx = 1;
    });

    /* ── Q3D20 组 · P4-F 立号（册316 F1）：面板入口 → 检定 → 挂匾 → 概览 ────
     * 种档：侠名 48 / 盘缠 500 / 隐庐二进 / 有约（人望）⇒ 五闸齐。 */
    await page.evaluate(() => {
      const a = window.QX3D_APP;
      const st = a.state;
      st.fame = 48;
      st.gold = 500;
      st.estate.buildings.winery = 2;
      st.faction = null;
      st.scrollProposition = null;
      st.court.wanted = 0;
      window.QX3D.ui.hud.render(st);
    });
    await page.evaluate(() => { window.QX3D_APP.openActions(); });
    await page.waitForTimeout(200);
    const hl0 = await page.evaluate(() => {
      const row = document.querySelector('#qx-modal [data-hall="found"]');
      const heads = Array.prototype.map.call(document.querySelectorAll('#qx-modal .qxm-more-h'), (h) => h.textContent);
      return { row: row ? row.textContent : '', heads: heads.join('|') };
    });
    T(/立号挂匾/.test(hl0.row) && /门户可立/.test(hl0.row) && /本门/.test(hl0.heads),
      'Q3D20a 面板立号行（未立号「立号挂匾」⇔ 五闸齐显示「门户可立」）', JSON.stringify(hl0));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-hall="found"]').click(); });
    await page.waitForTimeout(200);
    const hl1 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return {
        open: !m.classList.contains('hidden'),
        title: (m.querySelector('.qxm-title') || {}).textContent || '',
        text: m.textContent,
        input: !!document.getElementById('hall-name-input'),
        picks: Array.prototype.map.call(m.querySelectorAll('[data-hall-pick]'), (b) => b.getAttribute('data-hall-pick')).join(',')
      };
    });
    T(hl1.open && hl1.title === '立号检定' && hl1.input &&
      /✓ 侠名/.test(hl1.text) && /✓ 盘缠/.test(hl1.text) && /✓ 住处/.test(hl1.text) && /✓ 人望/.test(hl1.text) && /✓ 官身/.test(hl1.text) &&
      hl1.picks === '0,1',
      'Q3D20b 立号检定（五项全 ✓ + 门名输入 + 「挂牌立门/改日再议」两钮）', JSON.stringify({ title: hl1.title, picks: hl1.picks, input: hl1.input }));
    await page.fill('#hall-name-input', '青云门');
    await page.evaluate(() => { document.querySelector('#qx-modal [data-hall-pick="0"]').click(); });
    await page.waitForTimeout(350);
    const hl2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      const badge = document.querySelector('#hud-hall [data-hall]');
      return {
        founded: st.faction.founded, name: st.faction.name, gold: st.gold,
        doctrine: st.faction.doctrine, relic: (st.relicCarry || []).indexOf('flag_corner') >= 0,
        last: (st.logs || [])[0] && st.logs[0].text, badge: badge ? badge.textContent : ''
      };
    });
    T(hl2.founded === true && hl2.name === '青云门' && hl2.gold === 300 && hl2.doctrine === '行侠' && hl2.relic &&
      /【立号】/.test(hl2.last || '') && /本门/.test(hl2.badge),
      'Q3D20c 挂匾落账（−200 两 · 门名入档 · 行侠 · flag_corner · 日志【立号】· 顶栏「本门」）',
      JSON.stringify({ founded: hl2.founded, name: hl2.name, gold: hl2.gold, badge: hl2.badge }));
    await page.evaluate(() => { document.querySelector('#hud-hall [data-hall]').click(); });
    await page.waitForTimeout(200);
    const hl3 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return {
        seal: (m.querySelector('.qxm-street-seal') || {}).textContent || '',
        loc: (m.querySelector('.qxm-loc') || {}).textContent || '',
        text: m.textContent
      };
    });
    T(hl3.seal === '本门' && hl3.loc === '概览' &&
      /青云门/.test(hl3.text) && /声望无名/.test(hl3.text) && /宗旨行侠/.test(hl3.text) &&
      /门人 0 人，上限 5/.test(hl3.text) && /房舍 2/.test(hl3.text) && /主母位/.test(hl3.text),
      'Q3D20d 本门概览（名号/声望/宗旨/门人上限/房舍/主母位六项上屏）', JSON.stringify({ seal: hl3.seal, loc: hl3.loc }));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-qxm-close]').click(); });
    await page.waitForTimeout(120);

    /* ── Q3D21 组 · P4-F 门派经营（册317 F2）：地盘 / 规矩 / 邸报 / 每旬结算 ──── */
    await page.evaluate(() => { window.QX3D_APP.openHallOverview(); });
    await page.waitForTimeout(200);
    const f0 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return { labels: Array.prototype.map.call(m.querySelectorAll('[data-qxm-choice]'), (b) => b.textContent).join('|') };
    });
    T(f0.labels === '地盘|规矩|邸报|合上簿子',
      'Q3D21a 本门概览四钮（地盘 / 规矩 / 邸报 / 合上簿子）', JSON.stringify(f0));
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[0].click(); });
    await page.waitForTimeout(200);
    const f1 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return {
        text: m.textContent,
        picks: Array.prototype.map.call(m.querySelectorAll('[data-qxm-choice]'), (b) => b.textContent).join('|')
      };
    });
    T(/隐庐二进/.test(f1.text) && /分舵 0/.test(f1.text) && /山寨 0/.test(f1.text) &&
      /设分舵/.test(f1.picks) && /扯旗/.test(f1.picks),
      'Q3D21b 地盘页（隐庐二进 / 分舵 0 / 山寨 0 ⇔ 设分舵·扯旗两钮）', JSON.stringify({ picks: f1.picks }));
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[0].click(); });
    await page.waitForTimeout(350);
    const f2 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      const hall = window.QX3D.systems.hall;
      return { gold: st.gold, n: (st.faction.branches || []).length, houses: hall.houses(st) };
    });
    T(f2.n === 1 && f2.gold === 220 && f2.houses === 3,
      'Q3D21c 设分舵落账（−80 两 · branches 1 · 房舍 2→3）', JSON.stringify(f2));

    /* 立号当旬 = doctrineTurn 同旬 ⇒ 先过一旬，才谈得上改宗旨（原版同口径） */
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[3].click(); });
    await page.waitForTimeout(150);
    await page.click('#btn-turn');
    await page.waitForTimeout(700);
    await page.evaluate(() => { window.QX3D_APP.openHallOverview(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[1].click(); });
    await page.waitForTimeout(200);
    const f3 = await page.evaluate(() => document.getElementById('qx-modal').textContent);
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[1].click(); });
    await page.waitForTimeout(300);
    const f4 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { doctrine: st.faction.doctrine, doctrineId: st.faction.doctrineId };
    });
    T(/规矩：行侠/.test(f3) && /这旬还能改一次/.test(f3) && f4.doctrineId === 'trade' && f4.doctrine === '中立营生',
      'Q3D21d 规矩页改宗旨（过旬后行侠 → 中立营生真落档）', JSON.stringify(f4));
    /* 同旬再改：概览已重开 → 规矩 → 改唯利 ⇒ 被拒 */
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[1].click(); });
    await page.waitForTimeout(150);
    const f3b = await page.evaluate(() => document.getElementById('qx-modal').textContent);
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[2].click(); });
    await page.waitForTimeout(250);
    const f5 = await page.evaluate(() => ({
      toast: (document.getElementById('toast-container') || {}).textContent || '',
      doctrine: JSON.parse(localStorage.getItem('shanqian3d_save_v1')).faction.doctrineId
    }));
    T(/这旬已经改过/.test(f3b) && /这旬已经改过/.test(f5.toast) && f5.doctrine === 'trade',
      'Q3D21e 同旬连改被拒（页内提示 + toast ⇔ 宗旨不动）', JSON.stringify({ toast: f5.toast.slice(-24), doctrine: f5.doctrine }));

    /* 邸报：流水行 + 官宣门槛提示（改宗旨失败后 app 未重开，手动回概览） */
    await page.evaluate(() => { window.QX3D_APP.openHallOverview(); });
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[2].click(); });
    await page.waitForTimeout(200);
    const f6 = await page.evaluate(() => document.getElementById('qx-modal').textContent);
    T(/邸报/.test(f6) && /本旬入/.test(f6) && /官宣还差/.test(f6),
      'Q3D21f 邸报页（流水行 ⇔ 官宣门槛提示）', JSON.stringify({ has: /本旬入/.test(f6) }));
    await page.evaluate(() => { document.querySelectorAll('#qx-modal [data-qxm-choice]')[2].click(); });
    await page.waitForTimeout(150);

    /* 每旬结算：种「饷银见底」两旬 ⇒ 过旬弹三选 ⇒ 垫银 */
    await page.evaluate(() => {
      const st = window.QX3D_APP.state;
      st.faction.treasury = -30;
      st.faction.brokeStreak = 1;
      st.faction.collapseShown = false;
    });
    await page.click('#btn-turn');
    await page.waitForTimeout(700);
    const f7 = await page.evaluate(() => {
      const m = document.getElementById('qx-modal');
      return {
        open: !m.classList.contains('hidden'),
        title: (m.querySelector('.qxm-title') || {}).textContent || '',
        picks: Array.prototype.map.call(m.querySelectorAll('[data-court-pick]'), (b) => b.textContent).join('|')
      };
    });
    T(f7.open && /饷银见底/.test(f7.title) && /垫银/.test(f7.picks) && /散伙/.test(f7.picks),
      'Q3D21g 破产两旬弹窗（过旬结算 ⇒ 「饷银见底」三选）', JSON.stringify(f7));
    await page.evaluate(() => { document.querySelector('#qx-modal [data-court-pick="0"]').click(); });
    await page.waitForTimeout(400);
    const f8 = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('shanqian3d_save_v1'));
      return { treasury: st.faction.treasury, broke: st.faction.brokeStreak, ledger: st.faction.lastLedger };
    });
    T(f8.treasury === 18 && f8.broke === 0 && /本旬入/.test(f8.ledger || ''),
      'Q3D21h 垫银落账（−30 两 +30 饷银 ⇒ 余 18 · 破产计数清零 · 流水入档）', JSON.stringify(f8));

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
