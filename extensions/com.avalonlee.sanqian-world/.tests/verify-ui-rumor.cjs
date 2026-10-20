/* .tests/verify-ui-rumor.cjs — 传闻走查修复验证（playwright-core + Edge headless）
 * ① 非交战方的势力战传闻卡不渲染「应战」按钮（只读「观望」）
 * ② 奇遇红点改为「新出生传闻才亮」：存档既有传闻进线即基线化，不再恒亮
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-rumor.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态，再注入战况传闻（复用随机生成的真实势力 id） */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  ws.realm = 1; ws.stones = 5000; ws.qi = 100; ws.total = 100;
  ws.factionId = null;                                  /* 未加入任何势力 → 任何战况都是「非交战方」 */
  const now = Date.now();
  const fA = ws.factions[0].id, fB = ws.factions[1].id;
  ws.eventCooldowns = ws.eventCooldowns || {};
  ws.eventCooldowns['zhujian_renjia'] = now;            /* 目标事件冷却中 → 失效传闻卡（复现「已无从查证」） */
  ws.rumors = [
    { rid: 'war-1', kind: 'war', aId: fA, bId: fB, bornAt: now - 10 * 60000, expireAt: now + 10 * 60000 },
    { rid: 'ev-1', evId: 'market_assassin', tier: 'ren', nature: 'bad',
      bornAt: now - 5 * 60000, expireAt: now + 25 * 60000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' },
    { rid: 'ev-2', evId: 'zhujian_renjia', tier: 'ren', nature: 'good',
      bornAt: now - 4 * 60000, expireAt: now + 26 * 60000, tpl: 'rumor.tpl.ren.2', place: 'rumor.place.2' }
  ];
  /* RF 组取样（近来奇遇条数 + 卡片详情弹窗）：造 13 条真事件流水（feed **新在前** = 生产侧 unshift 口径），
   * 并逐条打 `seen` 卡——回看浮层的闸是「未遇不开」（`openRecall` 读 seen），不打卡点了没反应。 */
  const rfIds = SQ.Events.allIds(pack).slice(0, 13);
  ws.eventHistory.feed = rfIds.map((id, i) => ({
    id: id, ts: now - i * 60000, tier: 'ren', nature: i % 2 ? 'good' : 'bad',
    branch: 'neutral', karma: 1, hadCheck: false, eff: {}
  }));
  rfIds.forEach((id, i) => { ws.eventHistory.seen[id] = now - i * 60000; });
  return {
    save: {
      v: 1,
      profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-17-3' },
      meta: { unlockedWorlds: ['xiuxian'] },
      settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
      worlds: { xiuxian: ws }
    },
    /* 屏上第一条该是谁：feed 新在前 ⇒ rfIds[0]（供 RF②/RF⑤ 对表，不靠肉眼比文本） */
    newest: rfIds[0]
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const built = await buildSave();
  const save = built.save, RF_NEWEST = built.newest;
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(800);

  /* ① 修行页传闻区：战况卡只读（观望文本在、无按钮）；普通传闻卡仍有「前往查证」 */
  const idleWarBtn = await page.$$eval('#tab-idle .rumorcard.war button', els => els.length);
  const idleWatch = await page.$eval('#tab-idle', el => el.textContent.includes('观望'));
  T(idleWarBtn === 0 && idleWatch, 'R① 修行页战况卡无按钮 · 只读观望', 'btn=' + idleWarBtn);
  const idleGoBtn = await page.$$eval('#tab-idle [data-act="rumorGo"]:not([disabled])', els => els.length);
  T(idleGoBtn === 1, 'R① 可触发传闻卡「前往查证」启用（唯一）', 'n=' + idleGoBtn);
  /* ③ 失效传闻卡（目标事件冷却中）：按钮置灰 + 注明「时过境迁」（复现「已无从查证」缺陷的正典口径） */
  const deadBtn = await page.$('#tab-idle [data-act="rumorGo"][data-v="ev-2"]');
  const deadDisabled = deadBtn ? (await deadBtn.getAttribute('disabled')) !== null : false;
  const deadLabel = deadBtn ? (await deadBtn.textContent()).trim() : '';
  T(deadDisabled && deadLabel === '时过境迁', 'R③ 失效传闻卡置灰注明「时过境迁」', 'disabled=' + deadDisabled + ' label=' + deadLabel);
  T((await page.$$eval('#tab-idle [data-act="rumorGo"][data-v="ev-2"]', els => els.length)) === 1,
    'R③ 失效卡仍在列（未静默消失，与正典「置灰」一致）');

  /* ② 红点：存档既有传闻进线基线化 → 奇遇菜单不再亮红点（旧口径恒亮的场景） */
  const eventBtn = await page.$('#m-tabbar button[data-v="event"]');
  const hasDot = await eventBtn.$('.dot');
  T(!hasDot, 'R② 既有传闻不再钉死红点（进线即基线）');
  await page.click('#m-tabbar button[data-v="event"]');
  await page.waitForTimeout(300);
  /* 奇遇页同源：战况卡同样无按钮 */
  const evWarBtn = await page.$$eval('#tab-event .rumorcard.war button', els => els.length);
  const evWatch = await page.$eval('#tab-event', el => el.textContent.includes('观望'));
  T(evWarBtn === 0 && evWatch, 'R① 奇遇页战况卡同源只读');

  /* ── RF 组：近来奇遇「折叠 3 / 展开最近 10」+「点卡片出回看浮层」（用户令，展开条数太多 + 卡片应可查阅）──
   * fixture 存 13 条流水 ⇒ 屏上折叠恰 3、展开恰 10（裁的是**看得见的**，不是档里的 50 上限）。 */
  const rfFold = await page.$$eval('#tab-event .fcard', els => els.length);
  const rfBtn1 = await page.$eval('#tab-event [data-act="feedMore"]', el => el.textContent.trim());
  T(rfFold === 3 && rfBtn1 === '展开最近 10 条',
    'RF① 折叠态只 3 张卡，按钮如实写「展开最近 10 条」（13 条流水不谎称 13）', 'n=' + rfFold + ' btn=' + rfBtn1);
  const rfNewest = await page.$eval('#tab-event .fcard', el => el.dataset.v);
  T(rfNewest === RF_NEWEST, 'RF② 折叠显示的是最近三条之首（新在前，未把旧流水顶到屏前）', 'id=' + rfNewest);
  await page.click('#tab-event [data-act="feedMore"]');
  await page.waitForTimeout(400);
  const rfExp = await page.$$eval('#tab-event .fcard', els => els.length);
  const rfBtn2 = await page.$eval('#tab-event [data-act="feedMore"]', el => el.textContent.trim());
  T(rfExp === 10 && rfBtn2 === '收起',
    'RF③ 展开态恰 10 张（13 条流水裁到 10 ⇒ 展开不再是整屏长流），按钮转「收起」', 'n=' + rfExp + ' btn=' + rfBtn2);
  await page.click('#tab-event [data-act="feedMore"]');
  await page.waitForTimeout(300);
  T((await page.$$eval('#tab-event .fcard', els => els.length)) === 3, 'RF④ 收起回到 3 条（切换是幂等的，不是一次性）');
  /* 卡片点击 = 复用图鉴那套 `openRecall`（story + 首遇 + 上次抉择 + 上次得失），不另造第二张详情卡 */
  await page.click('#tab-event .fcard');
  await page.waitForTimeout(400);
  const rfOpen = await page.$eval('#modal-recall', el => !el.classList.contains('hide'));
  const rfTitle = await page.$eval('#mrc-title', el => el.textContent.trim());
  const rfStory = await page.$eval('#mrc-story', el => el.textContent.trim());
  const rfLast = await page.$eval('#mrc-last', el => (el.classList.contains('hide') ? '' : el.textContent.trim()));
  const rfName = await page.evaluate((id) => SQ.t('event.' + id + '.name', null, 'xiuxian'), RF_NEWEST);
  T(rfOpen && rfTitle.indexOf(rfName) >= 0 && rfStory.length > 0,
    'RF⑤ 点卡片弹出回看浮层，标题带该奇遇名、正文有 story（点第一条 = 最近那条，与屏上一致）',
    'open=' + rfOpen + ' title=' + rfTitle.slice(0, 24) + ' story=' + rfStory.length + 'B');
  T(rfLast.length > 0 && rfLast.indexOf('抉择') >= 0, 'RF⑥ 浮层含上次抉择（是「查阅内容」的卡，不是只有名字）', rfLast.slice(0, 40));
  await page.click('#mrc-close');
  T(await page.$eval('#modal-recall', el => el.classList.contains('hide')), 'RF⑦ 关闭钮可关（不靠遮罩/ESC）');

  /* ── UI v2 B9：叙事流时间列 + 图鉴默认收起（点段头展开 / 再点收起）── */
  const rfTl = await page.evaluate(() => {
    const card = document.querySelector('#tab-event .fcard');
    const fd = card && card.querySelector('.fdate');
    const fm = card && card.querySelector('.fmain');
    return {
      date: fd ? fd.textContent.trim() : '',
      left: fd && fm ? fd.getBoundingClientRect().left < fm.getBoundingClientRect().left : false
    };
  });
  T(/[0-9]/.test(rfTl.date) && rfTl.left,
    'RF⑧ 叙事流日期独占左列（时间线），正文在右', JSON.stringify(rfTl));
  const cx0 = await page.evaluate(() => ({
    btns: document.querySelectorAll('#tab-event .codex-sec').length,
    grids: document.querySelectorAll('#tab-event .codexgrid').length
  }));
  await page.evaluate(() => { document.querySelector('#tab-event .codex-sec').click(); });
  await page.waitForTimeout(300);
  const cx1 = await page.evaluate(() => ({
    grids: document.querySelectorAll('#tab-event .codexgrid').length,
    slots: document.querySelectorAll('#tab-event .cslot').length
  }));
  await page.evaluate(() => { document.querySelector('#tab-event .codex-sec').click(); });
  await page.waitForTimeout(300);
  const cx2 = await page.evaluate(() => document.querySelectorAll('#tab-event .codexgrid').length);
  T(cx0.btns === 3 && cx0.grids === 0 && cx1.grids === 1 && cx1.slots > 0 && cx2 === 0,
    'RF⑨ 图鉴三段默认收起；点一段只展开那一段，再点收起',
    'btns=' + cx0.btns + ' 收起=' + cx0.grids + ' 展开=' + cx1.grids + '/' + cx1.slots + '格 再收=' + cx2);
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(500);
  const hasDot2 = await page.$('#m-tabbar button[data-v="event"] .dot');
  T(!hasDot2, 'R② 离开奇遇页后红点不复燃（同批传闻已读）');
  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_RUMOR_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_RUMOR_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });