/* .tests/verify-ui-updatenote.cjs — 更新公告浮层真机走查（第册四批 2026-10-17 · UI 卷 §3.4e）
 * 用法：node .tests/verify-ui-updatenote.cjs（扩展根 · playwright-core + 系统 Edge headless）
 *
 * 为什么单独一篇：这批把视图代码开始往外搬（`view/updatenote.js`），而这类搬家的失败方式本仓见过两次——
 * 一次是「引擎对、屏上无字」（第册批 `mrc-title` 撞 id），一次是「整页空白」（第廿四批实参错位）。
 * 所以本篇一律读**渲染结果**：浮层可见性量几何、文案逐条比词表、点遮罩不关、点按钮才把公告号写进存档、
 * reload 之后真的不再弹。公告号不硬编码（回读 `SQ.UI.updateNote.id`），改号即换字、判据不假红。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const T0 = 1790000000000;

function buildSave() {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-save.json'), 'utf8'));
  s.profile.createdAt = T0;
  delete s.profile.seenNote;                       /* 造「一次都没看过公告」的档（旧档形态） */
  Object.values(s.worlds).forEach((w) => {
    w.lastSave = T0; w.lastOffline = null; w.pendingChoice = null; w.log = [];
  });
  return s;
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };
  const save = buildSave();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  /* 种档只种第一次：`addInitScript` 每次导航都重跑（本篇要 reload 两次），无脑覆写会把「点过知道了」那一笔
   * 抹回种档 ⇒ U5 的「不再弹」永远判红、U6 的「必须再弹」也弹得没有理由。只在键不存在时落种。 */
  await ctx.addInitScript((v) => { if (!localStorage.getItem('sanqian-state-v1')) localStorage.setItem('sanqian-state-v1', v); }, JSON.stringify(save));
  const page = await ctx.newPage();
  await page.clock.install({ time: new Date(T0) });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page.waitForTimeout(600);

  const read = () => page.evaluate(() => {
    const m = document.getElementById('modal-updatenote');
    const rows = Array.prototype.slice.call(document.querySelectorAll('#mun-text > div'));
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    return {
      open: !!m && !m.classList.contains('hide'),
      h: m ? Math.round(m.getBoundingClientRect().height) : 0,
      title: ((document.getElementById('mun-title') || {}).textContent || '').trim(),
      wantTitle: SQ.t('update.note.title', null, 'xiuxian'),
      rows: rows.map(d => (d.textContent || '').trim()),
      btn: ((document.getElementById('mun-go') || {}).textContent || '').trim(),
      wantBtn: SQ.t('update.note.close', null, 'xiuxian'),
      id: (SQ.UI && SQ.UI.updateNote && SQ.UI.updateNote.id) || '',
      seen: (s.profile || {}).seenNote || null,
      hasModule: !!(SQ.UI && SQ.UI.updateNote && typeof SQ.UI.updateNote.needed === 'function')
    };
  });

  const r0 = await read();
  T(r0.hasModule && r0.open && r0.h > 0 && r0.title === r0.wantTitle && r0.btn === r0.wantBtn,
    'U1 旧档（无已读号）进线即弹：浮层可见（量几何）· 标题与按钮都 === 词表现算值 · 渲染件真挂载',
    'open=' + r0.open + ' h=' + r0.h + ' title=' + r0.title);
  T(r0.rows.length === 7 && r0.rows.every(x => x.length > 4 && x.indexOf('update.note.') < 0),
    'U2 七行逐条渲染且无一行是裸键（拼键取词漏一处就会把 key 印给玩家看）', 'rows=' + r0.rows.length);

  /* 点遮罩不关（刻意不进 MASKS）：左上角一定是遮罩而非卡片 */
  await page.mouse.click(24, 24);
  await page.waitForTimeout(400);
  const r1 = await read();
  T(r1.open && r1.seen === null, 'U3 点遮罩关不掉、也不落库（要玩家亲手点「知道了」= 与奇遇抉择同一套纪律）',
    'open=' + r1.open + ' seen=' + r1.seen);

  await page.click('#mun-go');
  await page.waitForTimeout(900);
  const r2 = await read();
  T(!r2.open && r2.seen === r2.id && !!r2.id,
    'U4 点「知道了」⇒ 浮层收起且公告号经事务口写进存档（不是只改内存态）', 'seen=' + r2.seen + ' id=' + r2.id);

  await page.reload();
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page.waitForTimeout(700);
  const r3 = await read();
  T(!r3.open, 'U5 重开页面不再弹（已读判定读的是存档，不是内存变量）', 'open=' + r3.open);

  /* 反向对照：把公告号改成没见过的值 ⇒ 同一份档应当重新弹（证明判定真的在比号，不是恒不弹） */
  await page.evaluate((v) => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    s.profile.seenNote = v;
    localStorage.setItem('sanqian-state-v1', JSON.stringify(s));
  }, 'some-other-note');
  await page.reload();
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page.waitForTimeout(700);
  const r4 = await read();
  T(r4.open, 'U6 反证：公告号与存档不一致时**必须**再弹（否则 U5 那条「不弹」可能只是恒不弹）', 'open=' + r4.open);

  /* U8 转世那一处重建 profile，必须**显式**把已读号带走。为什么值得单独一刀：兵解 → 创角三屏 → 入世 是核心循环，
   * 漏这一行的失败方式 = 每死一次就把同一版公告重弹一次，而 U1~U6 全看不出来（它们不进转世）。
   * ⚠️ 射程交底：这一刀只判「那枚键写在字面量里」，不判运行时值——真要走完转世就得点满三屏创角（coldstart 那一族的成本），
   *    而这里的失败面是「有人日后加字段时把它抹了」，静态判据足够。 */
  const viewSrc = fs.readFileSync(path.join(ROOT, 'view/index.html'), 'utf8');
  const profBlk = (viewSrc.split('s.profile = {')[1] || '').split('};')[0];
  T(profBlk.length > 40 && /seenNote:\s*s\.profile\.seenNote/.test(profBlk),
    'U8 创角/转世重建 profile 那处显式带走已读公告号（否则每死一次重弹同一版）',
    '块长=' + profBlk.length);

  T(errs.length === 0, 'U7 全程零 pageerror / 零 console error', errs.join(' | ').slice(0, 200) || 'clean');

  console.log(fail === 0 ? 'UI_UPDATENOTE_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_UPDATENOTE_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
