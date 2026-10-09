/* .tests/verify-ui-tiandao.cjs — 问天 · 焚表奏疏走查（playwright-core + Edge headless）
 * 覆盖「奏疏生成 → 复制」全链路，重点回归「复制不全 / 谎报已复制」这一真实故障：
 *   ① 浮层可开、卦位六选与香火四档在位；
 *   ② 奏疏文本框按内容撑开（不再只露首段），且含契约四行（卦位 / 档位 / 旨意清单 / 编年史头）；
 *   ③ 生成提示为「已生成（N 字）」，不再误报「已复制」；
 *   ④ 复制按钮把**全文**写入剪贴板（与 textarea 逐字一致，仅换行归一）；
 *   ⑤ 剪贴板被拒 + execCommand 失败时，降级提示手动全选（不再谎报成功）；
 *   ⑥ 全流程零页错误。
 * 第二轮（2026-10-05 反馈批）：
 *   ⑦ 抗旨二次确认浮在圣旨浮层之上（#modal-confirm z-index 68 · 命中测试可点）；
 *   ⑧ 领旨后本轮奏疏 / 复制按钮 / 接旨框清空，重开问天不残留。
 * 注：应用有「新日志自动弹提示」机制，断言前先清空 #toasts，避免被日志提示插队。
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-tiandao.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态：带 5 条编年史 + 冷却清零，保证奏疏各节齐全 */
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

const norm = (s) => String(s == null ? '' : s).replace(/\r\n/g, '\n');

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

  const clearToasts = () => page.evaluate(() => { document.getElementById('toasts').innerHTML = ''; });
  const readToasts = () => page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('#toasts .toast'), (x) => x.textContent));

  /* ── 浮层入口与选项 ── */
  const openBtn = await page.$('[data-act="openTiandao"]');
  T(!!openBtn, 'B1 问天入口按钮在位');
  if (!openBtn) { await browser.close(); process.exit(1); }
  await openBtn.click();
  await page.waitForTimeout(300);
  const modal = await page.evaluate(() => {
    const m = document.getElementById('modal-tiandao');
    return {
      shown: !!m && !m.classList.contains('hide'),
      hex: document.querySelectorAll('#mtd-hex button').length,
      incense: document.querySelectorAll('#mtd-incense button').length
    };
  });
  T(modal.shown, 'B2 焚表问天浮层可开');
  T(modal.hex === 6, 'B3 卦位六选齐全', 'n=' + modal.hex);
  T(modal.incense === 4, 'B4 香火四档齐全', 'n=' + modal.incense);

  /* ── 生成奏疏 ── */
  await clearToasts();
  await page.click('#mtd-memo');
  await page.waitForTimeout(500);
  const memo = await page.evaluate(() => {
    const ta = document.getElementById('mtd-memoout');
    return {
      val: ta.value,
      hidden: ta.classList.contains('hide'),
      clientH: ta.clientHeight,
      inlineH: ta.style.height,
      readyText: SQ.t('tiandao.memo.ready', { n: ta.value.length }, 'xiuxian'),
      copiedText: SQ.t('tiandao.memo.copied', null, 'xiuxian')
    };
  });
  memo.toasts = await readToasts();
  const lines = norm(memo.val).split('\n');
  const hit = (re) => lines.some((l) => re.test(l));
  T(!memo.hidden && memo.val.length >= 500, 'B5 奏疏已生成且 ≥500 字', 'len=' + memo.val.length);
  T(hit(/本次所卜/) && hit(/type 只能选/), 'B6 奏疏含「卦位 + 本卦旨意清单」行');
  T(hit(/香火 .+ 灵石，按「.+」档回应/), 'B7 奏疏含「香火档位」行');
  T(hit(/^【编年史】$/) && lines.filter((l) => /^是日/.test(l)).length >= 3, 'B8 奏疏含「编年史」头与条目',
    'chron=' + lines.filter((l) => /^是日/.test(l)).length);
  T(memo.clientH > 88, 'B9 奏疏文本框按内容撑开（不再只露首段）', 'h=' + memo.inlineH);
  T(memo.toasts.indexOf(memo.readyText) >= 0 && memo.toasts.indexOf(memo.copiedText) < 0,
    'B10 生成提示为「已生成（N 字）」且不谎报已复制', JSON.stringify(memo.toasts));

  /* ── 复制链路：剪贴板须为全文 ── */
  await clearToasts();
  await page.click('#mtd-copy');
  await page.waitForTimeout(400);
  const copy = await page.evaluate(async () => {
    let clip = '';
    try { clip = await navigator.clipboard.readText(); } catch (e) { clip = ''; }
    return {
      clip: clip,
      copiedText: SQ.t('tiandao.memo.copied', null, 'xiuxian'),
      toasts: Array.prototype.map.call(document.querySelectorAll('#toasts .toast'), (x) => x.textContent)
    };
  });
  T(norm(copy.clip) === norm(memo.val), 'B11 复制到剪贴板的是奏疏全文（逐字一致）',
    'clip=' + copy.clip.length + ' ta=' + memo.val.length);
  T(/本次所卜/.test(copy.clip) && /【编年史】/.test(copy.clip), 'B12 剪贴板含卦位行与编年史（首段之外的内容未丢）');
  T(copy.toasts.indexOf(copy.copiedText) >= 0, 'B13 复制成功提示口径正确', JSON.stringify(copy.toasts));

  /* ── 降级分支：剪贴板被拒 + execCommand 失败 → 明示手动全选 ── */
  await page.evaluate(() => {
    document.execCommand = function () { return false; };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: function () { return Promise.reject(new Error('denied')); } }
    });
  });
  await clearToasts();
  await page.click('#mtd-copy');
  await page.waitForTimeout(400);
  const degraded = await page.evaluate(() => ({
    manualText: SQ.t('tiandao.memo.manual', null, 'xiuxian'),
    copiedText: SQ.t('tiandao.memo.copied', null, 'xiuxian'),
    toasts: Array.prototype.map.call(document.querySelectorAll('#toasts .toast'), (x) => x.textContent)
  }));
  T(degraded.toasts.indexOf(degraded.manualText) >= 0 && degraded.toasts.indexOf(degraded.copiedText) < 0,
    'B14 复制失败时明示手动全选（不再谎报成功）', JSON.stringify(degraded.toasts));

  T(errors.length === 0, 'B15 全流程零页错误', errors.slice(0, 3).join(' | '));

  /* ══ 第二轮：接旨/抗旨弹窗层级 + 领旨后奏疏清空（2026-10-05 反馈批）══
   * 独立上下文重开一档（lastAskAt=0），避免第一轮已消耗问天冷却。 */
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx2.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page2 = await ctx2.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push(e.message));
  page2.on('console', (m) => { if (m.type() === 'error') errors2.push(m.text()); });
  await page2.goto(url);
  await page2.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page2.waitForTimeout(700);

  await page2.click('[data-act="openTiandao"]');
  await page2.waitForTimeout(250);
  await page2.click('#mtd-memo');                       /* 生成奏疏，作为「上一轮残留」基线 */
  await page2.waitForTimeout(400);
  const memoLen2 = await page2.$eval('#mtd-memoout', (t) => t.value.length);
  T(memoLen2 >= 500, 'C1 第二轮奏疏已生成（旧奏疏基线）', 'len=' + memoLen2);

  await page2.fill('#mtd-receive', '【天机】准。');       /* 接旨：非法文本 → 谶语档，仍出圣旨 */
  await page2.click('#mtd-parse');
  await page2.waitForTimeout(300);
  const decShown2 = await page2.$eval('#modal-decree', (m) => !m.classList.contains('hide'));
  T(decShown2, 'C2 圣旨浮层可开（接旨解析）');

  await page2.click('#mdc-defy');                        /* 抗旨 → 二次确认 */
  await page2.waitForTimeout(250);
  const confirm2 = await page2.evaluate(() => {
    const cf = document.getElementById('modal-confirm');
    const ok = document.getElementById('cf-ok');
    const r = ok.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { shown: !cf.classList.contains('hide'), z: getComputedStyle(cf).zIndex, hit: !!(top && (top === ok || ok.contains(top))) };
  });
  T(confirm2.shown, 'C3 抗旨二次确认弹窗出现');
  T(confirm2.z === '68', 'C4 确认层 z-index = 68（高于其它浮层）', 'z=' + confirm2.z);
  T(confirm2.hit, 'C5 确认按钮在顶层可点（未被圣旨浮层遮挡）');
  await page2.click('#cf-cancel');
  await page2.waitForTimeout(200);

  await page2.click('#mdc-accept');                      /* 领旨 → 本轮问天收尾 */
  await page2.waitForTimeout(400);
  const cleared2 = await page2.evaluate(() => ({
    memo: document.getElementById('mtd-memoout').value,
    memoHidden: document.getElementById('mtd-memoout').classList.contains('hide'),
    copyHidden: document.getElementById('mtd-copy').classList.contains('hide'),
    recv: document.getElementById('mtd-receive').value,
    decHidden: document.getElementById('modal-decree').classList.contains('hide')
  }));
  T(cleared2.decHidden, 'C6 领旨后圣旨浮层关闭');
  T(cleared2.memo === '' && cleared2.memoHidden && cleared2.copyHidden && cleared2.recv === '',
    'C7 领旨后奏疏/复制按钮/接旨框已清空',
    'memo=' + cleared2.memo.length + ' hide=' + cleared2.memoHidden + ' copy=' + cleared2.copyHidden + ' recv=' + cleared2.recv.length);

  await page2.click('#mtd-close');
  await page2.waitForTimeout(200);
  await page2.click('[data-act="openTiandao"]');
  await page2.waitForTimeout(250);
  const reopen2 = await page2.evaluate(() => ({
    memo: document.getElementById('mtd-memoout').value,
    hidden: document.getElementById('mtd-memoout').classList.contains('hide')
  }));
  T(reopen2.memo === '' && reopen2.hidden, 'C8 重开问天不再残留上一次奏疏');

  T(errors2.length === 0, 'C9 第二轮零页错误', errors2.slice(0, 3).join(' | '));
  await ctx2.close();

  await browser.close();
  console.log('');
  console.log((fail === 0 ? 'UI_TIANDAO_ALL_GREEN ' : 'UI_TIANDAO_HAS_FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
