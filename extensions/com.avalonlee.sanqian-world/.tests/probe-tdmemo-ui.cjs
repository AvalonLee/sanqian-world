/* .tests/probe-tdmemo-ui.cjs — 问天奏疏「真实 UI 复制链路」诊断（一次性调查用，非交付走查）
 * 造一份带编年史的存档 → 打开问天浮层 → 点「焚表 · 生成奏疏」→ 读 #mtd-memoout 的实际内容。
 * 用法：node .tests/probe-tdmemo-ui.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.realm = 5; ws.stones = 50000; ws.qi = 100; ws.total = 100;
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  ws.tiandao = ws.tiandao || {};
  ws.tiandao.lastAskAt = 0;
  ws.tiandao.chron = [
    { k: 'tribfail', v: { streak: 3 }, at: now - 5000 },
    { k: 'break', v: { realm: 5 }, at: now - 4000 },
    { k: 'clear', v: { z: 2 }, at: now - 3000 },
    { k: 'bond', v: { act: 'lock', npc: 'jingchun' }, at: now - 2000 },
    { k: 'prodrank', v: { dir: 'up', rank: 2 }, at: now - 1000 }
  ];
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
    meta: { unlockedWorlds: ['xiuxian'], stats: { lives: 1 } },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = await buildSave();
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(700);

  const openBtn = await page.$('[data-act="openTiandao"]');
  console.log('openTiandao 按钮 =', !!openBtn);
  if (!openBtn) { await browser.close(); process.exit(1); }
  await openBtn.click();
  await page.waitForTimeout(300);
  await page.click('#mtd-memo');
  await page.waitForTimeout(500);

  const out = await page.evaluate(() => {
    const ta = document.getElementById('mtd-memoout');
    return { len: ta.value.length, val: ta.value, hidden: ta.classList.contains('hide') };
  });
  console.log('');
  console.log('==== #mtd-memoout 实测 ====');
  console.log('长度 =', out.len, '| hidden =', out.hidden);
  console.log('---- 全文 ----');
  console.log(out.val);
  console.log('---- 命中 ----');
  console.log('卦位行  =', /本次所卜/.test(out.val));
  console.log('档位行  =', /按「.+」档回应/.test(out.val));
  console.log('编年史  =', /【编年史】/.test(out.val));
  console.log('旨意清单=', /type 只能选/.test(out.val));
  console.log('页错误  =', errors.length ? errors.slice(0, 5) : 'none');

  /* ── 复制链路：点「复制奏疏」后读剪贴板，与 textarea 比对 ── */
  await page.click('#mtd-copy');
  await page.waitForTimeout(400);
  const clip = await page.evaluate(async () => {
    try { return { ok: true, text: await navigator.clipboard.readText() }; }
    catch (e) { return { ok: false, err: String(e && e.message || e) }; }
  });
  console.log('');
  console.log('==== 剪贴板实测 ====');
  console.log('读取成功 =', clip.ok, clip.ok ? '' : ('err=' + clip.err));
  if (clip.ok) {
    console.log('剪贴板长度 =', clip.text.length, '| 与 textarea 一致 =', clip.text === out.val);
    console.log('剪贴板尾 20 字 =', JSON.stringify(clip.text.slice(-20)));
    console.log('剪贴板含卦位行 =', /本次所卜/.test(clip.text), '| 含编年史 =', /【编年史】/.test(clip.text));
  }
  await browser.close();
})();
