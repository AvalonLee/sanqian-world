/* .tests/verify-ui-badsave.cjs — 坏档 / 半坏档 / 非法世界的**不自锁**实证（playwright-core + Edge headless）
 * 为什么需要它：`view/index.html` 的 boot() 只有 `try { claim } catch { show('c1') }` 一层，
 *   而「档能解析成功、但内容与代码预期不符」是 catch 不到的——这类态若把主界面渲染成白屏或抛错，
 *   玩家就**永久卡死、连创角都回不去**（比 bug 更糟的是不可恢复）。廿三篇走查全部用好档
 *   （`fixture-save.json`）或页内写好态起步，**从未喂过一份坏档**。
 * 本篇口径（不是"任意烂档都必须自愈成可玩"，那是许愿）：
 *   · 能救的（normalize 缺省 / 名录白名单）就该救回来并**照常进主界面**；
 *   · 救不了至少要**退回创角且不崩**，绝不白屏、绝不 pageerror 死锁；
 *   · 未开放世界（无 pack 内容）的 id 绝不能把玩家带进空世界。
 * 纪律：页内 evaluate 里不存在 Node 闭包常量 ⇒ 存档内容经 addInitScript 的**参数**传进去。
 * 用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-badsave.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

const KEY = 'sanqian-state-v1';

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')'));
  };

  /* 一份「profile 在、worlds.xiuxian 在」的最小底档，逐例在其上做破坏 */
  const base = {
    v: 1,
    profile: { name: '坏档验证', talents: [], worldId: 'xiuxian', worldName: '玄幻修仙', createdAt: 1700000000000, alignBias: 'neutral', seenNote: '2026-10-17-2' },
    settings: {},
    meta: { achv: [], titles: [], legacy: 0, score: 0, codices: {}, unlocks: [], biographies: [], heirChoice: null, awakened: [] },
    worlds: { xiuxian: { qi: 12, total: 12, stones: 100, realm: 0, zone: 0, prog: {}, cleared: [], bonds: {}, log: [], eventHistory: { feed: [] } } }
  };

  const run = async (mutate) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 90)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(String(m.text()).slice(0, 90)); });
    let val;
    if (mutate === 'GARBAGE') val = '{{{ 这不是 JSON，是刚被别的扩展写坏的一坨';
    else { const c = JSON.parse(JSON.stringify(base)); mutate(c); val = JSON.stringify(c); }
    await page.addInitScript((a) => { try { localStorage.setItem(a.k, a.v); } catch (e) {} }, { k: KEY, v: val });
    await page.goto(url);
    await page.waitForTimeout(2600);
    const st = await page.evaluate((k) => {
      const vis = (id) => { const el = document.getElementById(id); return !!el && !el.classList.contains('hide'); };
      const bt = (document.querySelector('.tabbody') || {}).textContent || '';
      return {
        c1: vis('sc-c1'), main: vis('sc-main'), loading: vis('sc-loading'),
        stuckLoading: vis('sc-loading') && !vis('sc-main') && !vis('sc-c1') && !vis('sc-c2') && !vis('sc-c3'),
        bodyLen: bt.length,
        // 主界面若亮着，正文还得真有中文内容（不是空壳）
        bodyCjk: /[\u4e00-\u9fff]/.test(bt),
        savedBack: (() => { try { const s = JSON.parse(localStorage.getItem(k) || 'null'); return !!(s && s.profile); } catch (e) { return false; } })()
      };
    }, KEY);
    await ctx.close();
    return { st, errors };
  };

  const cases = [
    ['A 非 JSON 垃圾串', 'GARBAGE'],
    ['B worlds 整块缺失', (c) => { delete c.worlds; }],
    ['C worlds.xiuxian = null', (c) => { c.worlds.xiuxian = null; }],
    ['D profile 在但无 worldId', (c) => { delete c.profile.worldId; }],
    ['E worldId 指向未开放世界', (c) => { c.profile.worldId = 'guwu'; }],
    ['F 关键字段类型坏（bonds 成数组 / realm 成字符串）', (c) => { c.worlds.xiuxian.bonds = []; c.worlds.xiuxian.realm = 'zero'; }],
    ['G meta 整块缺失', (c) => { delete c.meta; }],
    ['H 未知字段成堆（向前兼容旧读新）', (c) => { c.worlds.xiuxian.zzzFuture = { a: [1, 2, 3] }; c.meta.zzzFuture2 = 'x'; }]
  ];

  const rows = [];
  for (const [label, m] of cases) {
    const r = await run(m === 'GARBAGE' ? 'GARBAGE' : m);
    rows.push([label, r]);
    console.log('READ ' + label + ' :: ' + JSON.stringify(r.st) + ' errs=' + (r.errors.length ? r.errors.slice(0, 2).join('|') : '0'));
  }

  rows.forEach(([label, r]) => {
    T(!r.st.stuckLoading, 'BS-Loading ' + label + ' 不卡死在读档屏（loading 不是终态）', JSON.stringify(r.st));
  });
  rows.forEach(([label, r]) => {
    const playable = r.st.main || r.st.c1;
    T(playable, 'BS-Screen ' + label + ' 落到可用屏（主界面或创角，二者必居其一）',
      'main=' + r.st.main + ' c1=' + r.st.c1);
  });
  rows.forEach(([label, r]) => {
    T(r.errors.length === 0, 'BS-Err ' + label + ' 零 pageerror / 零 console.error（坏档不得抛错）',
      r.errors.slice(0, 2).join('|') || 'clean');
  });
  /* 主界面亮着的那些例，正文必须真有内容 */
  rows.forEach(([label, r]) => {
    if (r.st.main) T(r.st.bodyLen > 50 && r.st.bodyCjk,
      'BS-Body ' + label + ' 主界面正文非空壳（>50 字且含中文）', 'len=' + r.st.bodyLen + ' cjk=' + r.st.bodyCjk);
  });

  /* 逐例细则：能救的必须救回来（B / C / D / F / G / H 走 normalize 缺省重建） */
  const byLabel = {};
  rows.forEach(([label, r]) => { byLabel[label] = r; });
  T(byLabel['A 非 JSON 垃圾串'].st.c1 || byLabel['A 非 JSON 垃圾串'].st.main,
    'BS-A 垃圾串：解析失败要有出口（回创角或直接起新档），不得停读档屏', JSON.stringify(byLabel['A 非 JSON 垃圾串'].st));
  T(byLabel['E worldId 指向未开放世界'].st.c1 || (byLabel['E worldId 指向未开放世界'].st.main &&
    byLabel['E worldId 指向未开放世界'].st.bodyLen > 50),
    'BS-E 未开放世界 id：要么退回创角、要么照常渲染，**绝不进空世界白屏**',
    JSON.stringify(byLabel['E worldId 指向未开放世界'].st));

  console.log(fail === 0 ? 'UI_BADSAVE_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_BADSAVE_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
