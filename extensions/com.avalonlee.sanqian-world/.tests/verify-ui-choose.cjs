/* .tests/verify-ui-choose.cjs — 奇遇抉择（modal-choice）走查（第册一百四十五批 2026-10-23 · B4 = D15 阶段 B 第四刀）
 * 依赖：playwright-core（根 `package.json` 已声明）+ 系统 Edge
 * 用法：node .tests/verify-ui-choose.cjs
 *
 * 立篇因由：勘察档 §七 B4 要求「奇遇 `choose` 连族搬前先补走查」——`act === 'choose'` 这条 UI 路在 `.tests`
 *   里**零引用**（heirchoice 是「传位抉择」另一回事；冒烟只管 `resolveChoice` 引擎侧）。搬动作的典型失误是
 *   「按钮还在、点了没反应」，静态判据看不见 ⇒ 本篇口径 = 真点 + 读盘上真值。
 * 覆盖：弹层栈自动弹出（种 `pendingChoice` 后 boot）→ 三支在位 → 点「正」→ 判定演出（≈1s，可跳过路径同保）
 *   → 结果面板 → 盘上 `pendingChoice` 清空 → 关闭。
 * 建场：事件取 `slay_three_corpses`（cond: realmMin 6 + align neutral ⇒ 档位对齐）；`reducedMotion` 不开，
 *   所以「正」支的判定演出会真走一遍（1 check ⇒ 两步 ≈0.7s），poll 窗口放宽到 8s 兜住演出 + 结算。
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

function residue(txt) {
  if (!txt) return '空文本';
  if (/undefined|NaN|\[object/i.test(txt)) return 'undefined/NaN/object 残留';
  if (/\{[a-zA-Z]/.test(txt)) return '花括号占位未填';
  const m = txt.match(/[a-z][a-z0-9]*(?:[._][a-z0-9]+){1,}/);
  return m ? '裸 key「' + m[0] + '」' : null;
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const now = Date.now();

  const ws = pack.normalize(pack.initialState());
  ws.realm = 7; ws.stones = 50000; ws.qi = 400; ws.total = 500;
  ws.artsKnown = ['qingxin'];
  ws.lastSave = now; ws.lastOffline = null;
  /* 抉择待答（引擎态字段照抄 `Systems.spawnEvent` 的写法） */
  ws.pendingChoice = { id: 'slay_three_corpses', at: now, tier: 'tian', nature: 'good' };

  const save = {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-22-1' },
    meta: Object.assign(SQ.Legacy.metaBlank(), { unlockedWorlds: ['xiuxian'] }),
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const poll = async (fn, ms) => {
    const t0 = Date.now();
    for (;;) {
      const v = await fn();
      if (v) return v;
      if (Date.now() - t0 > (ms || 6000)) return false;
      await new Promise((r) => setTimeout(r, 120));
    }
  };
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}'));

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  /* 弹层栈（奇遇抉择 > 出关呈报 > 渡劫结果）：boot 收功后应自动弹出抉择浮层 */
  const popped = await poll(() => page.$('#modal-choice:not(.hide)'), 8000);

  /* V1 三支在位 */
  const br = await page.evaluate(() => ({
    n: document.querySelectorAll('#mc-branches [data-act="choose"]').length,
    vs: [...document.querySelectorAll('#mc-branches [data-act="choose"]')].map((b) => b.dataset.v).join(',')
  }));
  T(!!popped && br.n === 3 && br.vs === 'right,evil,neutral',
    'V1 种下待答抉择 ⇒ 弹层栈自动弹出且三支在位（right/evil/neutral）',
    '弹出=' + !!popped + ' n=' + br.n + ' vs=' + br.vs);

  /* V2 点「正」⇒ 盘上 pendingChoice 清空（判定演出 + 结算都在这条链里） */
  await page.click('#mc-branches [data-act="choose"][data-v="right"]');
  const judged = await poll(() => page.$('#mc-judging:not(.hide)'), 3000).catch(() => false);
  const s2 = await poll(async () => {
    const s = await read();
    return s.worlds.xiuxian.pendingChoice == null ? s : false;
  }, 8000);
  T(!!s2, 'V2 点「正」⇒ 盘上 pendingChoice 清空（判定演出 + `resolveChoice` 整链走通；演出' +
    (judged ? '有' : '无（减动效或单步直结）') + '被观察到）',
    '演出=' + !!judged + ' pendingChoice=' + JSON.stringify((await read()).worlds.xiuxian.pendingChoice));

  /* V3 结果面板（`choiceResult` 渲染）零占位残留 */
  const res = await page.evaluate(() => ({
    shown: !document.getElementById('mc-result').classList.contains('hide'),
    txt: (document.getElementById('mc-result') || {}).textContent || ''
  }));
  T(res.shown && residue(res.txt) === null,
    'V3 结果面板浮出且零占位 / 裸 key 残留（`choiceResult`）',
    'shown=' + res.shown + ' 残留=' + residue(res.txt) + ' 长度=' + res.txt.length);

  /* V4 点「知道了」关闭 */
  await page.click('#mc-ok');
  await page.waitForTimeout(300);
  const closed = await page.$('#modal-choice.hide');
  T(!!closed, 'V4 点「知道了」⇒ 浮层收起', 'closed=' + !!closed);

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 160) || 'clean');

  await browser.close();
  console.log(fail === 0 ? 'UI_CHOOSE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_CHOOSE_FAILED ' + fail + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
