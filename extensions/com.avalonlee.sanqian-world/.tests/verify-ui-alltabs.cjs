/* .tests/verify-ui-alltabs.cjs — 高境界下「每一个页都点得到、都渲染得出内容」全表实证
 * 为什么需要它：各系统页各有专篇（arts / market / bonds / sect / prodigy / faction / trib / karma /
 *   journal / rumor / fuse / legacy…），但**从没有一次把 15 个页在一趟里逐个点开**。
 *   境界门槛（`D.TAB_UNLOCK`）把 法宝(3) / 宗门(4) / 天骄(2) 几页挡在低境界之外，
 *   而存档件是 realm=1 的档 ⇒ **高境界同时点亮全部页时**这些渲染器有没有互相拖崩，无人验过。
 *   这类「单独都绿、合起来白屏」正是写了没人读 / 零渲染点缺陷族的最后一格。
 * 纪律（本仓已付代价）：页内取不到 `state`（IIFE 私有）⇒ 读态走 `localStorage['sanqian-state-v1']`；
 *   `SQ.mutate({}, fn)` 只落盘不换视图私有 state ⇒ 改完必须 reload 再断言渲染。
 * 用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-alltabs.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const KEY = 'sanqian-state-v1';

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  /* 存档件是 realm=1 的档 ⇒ 法宝(3) / 宗门(4) 等页永远进不了判据。
   * 直接在 Node 侧改件再注入（**不走页内 SQ.mutate**：那条路只证明落盘、换不掉视图私有 state，
   * 且实测这次页内抬境界没进渲染判据，与其赌两条通道不如从数据源头给一份高境界档）。 */
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  fx.worlds.xiuxian.realm = 9;
  fx.worlds.xiuxian.total = Math.max(fx.worlds.xiuxian.total || 0, 100000);
  fx.worlds.xiuxian.qi = Math.max(fx.worlds.xiuxian.qi || 0, 50000);
  const fixture = JSON.stringify(fx);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')'));
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 90)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(String(m.text()).slice(0, 90)); });

  await page.addInitScript((a) => { try { localStorage.setItem(a.k, a.v); } catch (e) {} }, { k: KEY, v: fixture });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(500);

  const nav = await page.evaluate(() => {
    const btns = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'));
    return {
      total: btns.length,
      locked: btns.filter((b) => b.classList.contains('locked')).length,
      texts: btns.map((b) => b.textContent.trim())
    };
  });
  T(nav.locked === 0 && nav.total >= 15,
    'AT0 realm 9 下全部导航页点亮（无置灰 = 每一页都点得到）', 'btns=' + nav.total + ' locked=' + nav.locked);

  const seen = [];
  for (let i = 0; i < nav.total; i++) {
    const before = errors.length;
    const r = await page.evaluate((idx) => {
      const btns = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'));
      btns[idx].click();
      return new Promise((res) => setTimeout(() => {
        /* 切页会整条重绘导航，点下去之前握着的按钮节点可能已被换掉 ⇒ 结果一律重新取节点再判 */
        const btns2 = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'));
        const cur = btns2[idx] || {};
        const b = document.querySelector('.tabbody');
        const txt = b ? (b.innerText || b.textContent || '') : '';
        res({
          label: (cur.textContent || '').trim(),
          on: !!cur.classList && cur.classList.contains('on'),
          len: txt.length,
          cjk: /[一-龥]/.test(txt),
          junk: (txt.match(/undefined|NaN|\[object |\{[a-z]/g) || []).slice(0, 3).join(','),
          head: txt.replace(/\s+/g, ' ').slice(0, 26)
        });
      }, 420));
    }, i);
    seen.push(r.label);
    const clean = errors.length === before;
    T(r.on && r.len >= 20 && r.cjk && !r.junk && clean,
      'AT' + (i + 1) + ' 「' + r.label + '」页渲染出内容且零报错',
      'len=' + r.len + ' cjk=' + r.cjk + (r.junk ? ' junk=' + r.junk : '') + (clean ? '' : ' errs+=' + (errors.length - before)) + ' 首=' + r.head);
  }

  T(new Set(seen).size === nav.total, 'AT-Set 十五页各点到一次（无重复、无遗漏）', 'distinct=' + new Set(seen).size);
  T(errors.length === 0, 'AT-Err 全表逐页点完后零 pageerror / 零 console.error', errors.slice(0, 3).join('|') || 'clean');

  console.log(fail === 0 ? 'UI_ALLTABS_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_ALLTABS_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
