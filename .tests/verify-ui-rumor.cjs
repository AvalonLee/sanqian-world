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
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
    meta: { unlockedWorlds: ['xiuxian'] },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = await buildSave();
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
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(500);
  const hasDot2 = await page.$('#m-tabbar button[data-v="event"] .dot');
  T(!hasDot2, 'R② 离开奇遇页后红点不复燃（同批传闻已读）');
  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_RUMOR_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_RUMOR_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });