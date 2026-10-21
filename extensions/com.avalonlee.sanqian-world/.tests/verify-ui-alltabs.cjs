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
  /* 第十四批审计 #4/#7/#11 三条判据的前置态：
   *   mode 钉成 seclude（×1.3）⇒ 顶部速率与「未乘模式乘区」的旧读数必然不同，判据才有鉴别力；
   *   有势力 + 叛离过 + 新门 rank 未达 ⇒ 「身份」那条只有按引擎口径才判得出 ✓（视图旧式会亮红 ✗）。 */
  fx.worlds.xiuxian.mode = 'seclude';
  fx.worlds.xiuxian.everDefected = true;
  fx.worlds.xiuxian.factionId = 'huangfeng';
  /* AT-D 的非空前提：给一枚带 qiRate 的天赋（effects 是**按字段名的对象**，不是数组）+ 一对能触发羁绊的
   * 真天赋 id（`TALENT_SYNERGIES` 的 gifted+diligent ⇒ 来源 'synergy'，qiRate +0.04）。
   * 为什么必须凑出 'synergy'：旧视图硬列的 10 个源里**没有它** ⇒ 只有本档真有 synergy 值，
   * 「明细漏源」这条判据才有鉴别力（空集上的相等不算证据，本仓纪律）。 */
  (fx.profile.talents || (fx.profile.talents = [])).push(
    { id: 'walk-qi', kind: 'positive', tier: 'common', world: 'common', weight: 1, amplified: false, effects: { qiRate: 0.05 } },
    { id: 'gifted', kind: 'positive', tier: 'common', world: 'common', weight: 1, amplified: false, effects: {} },
    { id: 'diligent', kind: 'positive', tier: 'common', world: 'common', weight: 1, amplified: false, effects: {} });
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

  /* ── 第十四批审计 #4 / #11 / #7：屏上的数必须由引擎同一个式子算出来 ──
   * 本仓头号缺陷类 = 同一规则两处各写一遍。这三条钉的是「视图自己算了一遍」那一族：
   *   AT-R 修行页顶部「产出 N/秒」=== `SQ.Idle.effRate`（含模式乘区），且**不等于**旧的 `rateOf` 读数
   *        （fixture 已把 mode 钉成 seclude ×1.3 ⇒ 两值必不同，摘回 rateOf 这一条就红）；
   *   AT-D 明细里每个有值的 qiRate 来源都要有一行（旧视图硬列 10 项，cave/caveFac/treasure/synergy/legacy
   *        被静默漏掉 ⇒ 明细相加永远对不上顶部数），且标签全部解析得出（不许裸英文上屏）；
   *   AT-G 宗门页四门槛 chip 的 ok/no 逐条 === `SQ.Sect.foundGates`（旧视图自己重写一遍判定，「身份」那条
   *        与引擎不同式 ⇒ 叛离过、新门 rank 未达的玩家按钮能点、同行亮红 ✗）。 */
  const clickTab = async (label) => {
    const idx = nav.texts.findIndex((x) => x.indexOf(label) >= 0);
    if (idx < 0) return false;
    await page.evaluate((i) => {
      const b = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'))[i];
      if (b) b.click();
    }, idx);
    await page.waitForTimeout(420);
    return true;
  };

  if (await clickTab('修行')) {
    const rRow = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data, w = st.worlds.xiuxian;
      pack.recalcDerived(w, st.profile);
      const mods = SQ.Mods.collect(st.profile, w, pack, D);
      const eff = SQ.Idle.effRate(w, pack, D, mods, false);
      const raw = SQ.Idle.rateOf(w, pack, D, mods);
      const btn = document.querySelector('#tab-idle [data-act="detailRate"]');
      const row = btn ? btn.parentElement : null;
      const m = ((row && row.innerText) || '').match(/([\d.]+)\/秒/);
      const shown = m ? m[1] : '';
      /* 明细展开后再逐源核对 */
      if (btn) btn.click();
      return { eff: eff.toFixed(1), raw: raw.toFixed(1), shown: shown, mode: w.mode };
    });
    await page.waitForTimeout(320);
    const dRow = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data, w = st.worlds.xiuxian;
      pack.recalcDerived(w, st.profile);
      const mods = SQ.Mods.collect(st.profile, w, pack, D);
      const box = document.querySelector('#tab-idle .detailbox');
      const txt = box ? (box.innerText || '') : '';
      const srcs = Object.keys((mods.detail && mods.detail.qiRate) || {}).filter((k) => Math.abs(mods.detail.qiRate[k]) > 1e-9);
      const missing = [], bare = [];
      srcs.forEach((k) => {
        const lb = SQ.t('idle.' + k, null, 'xiuxian');
        if (lb === 'idle.' + k) bare.push(k);
        else if (txt.indexOf(lb) < 0) missing.push(k);
      });
      return { n: srcs.length, missing: missing.join(','), bare: bare.join(','), hasBox: !!box };
    });
    T(rRow.shown === rRow.eff && rRow.eff !== rRow.raw,
      'AT-R 修行页顶部速率 === 引擎 effRate（含模式乘区，且与旧 rateOf 读数不同 = 这行改动有鉴别力）',
      'mode=' + rRow.mode + ' 屏上=' + rRow.shown + ' eff=' + rRow.eff + ' 旧 rateOf=' + rRow.raw);
    T(dRow.hasBox && dRow.n > 0 && !dRow.missing && !dRow.bare,
      'AT-D 明细按 mods 真实来源逐行渲染（漏源与裸英文键名都算失败）',
      '源数=' + dRow.n + ' 漏=' + (dRow.missing || '无') + ' 缺标签=' + (dRow.bare || '无'));

  } else {
    T(false, 'AT-R 修行页导航可定位', '找不到「修行」页签');
  }

  if (await clickTab('宗门')) {
    const gRow = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data, w = st.worlds.xiuxian;
      const g = SQ.Sect.foundGates(w, D, st.meta);
      /* B16-j 改口：四门槛由 chip 行改设计稿 .gate 行（左上角圆标 ✓ / ·），判定仍逐条对引擎 */
      const spans = Array.prototype.slice.call(document.querySelectorAll('#tab-sect .gate'));
      const dom = spans.map((x) => x.classList.contains('ok'));
      const eng = [g.realm, g.identity, g.peak, g.unlock];
      const chk = SQ.Sect.canFound(w, pack, D, st.meta);
      return { dom: dom.join(','), eng: eng.join(','), n: spans.length, everDef: w.everDefected === true,
        reason: chk.reason, idEng: g.identity };
    });
    T(gRow.n === 4 && gRow.dom === gRow.eng,
      'AT-G 宗门四门槛行逐条 === SQ.Sect.foundGates（规则只留属主那一份）',
      '屏=' + gRow.dom + ' 引擎=' + gRow.eng + ' 叛离过=' + gRow.everDef + ' canFound=' + gRow.reason);
  } else {
    T(false, 'AT-G 宗门页导航可定位', '找不到「宗门」页签');
  }

  /* AT-SB 滚动条已换成主题样式（第十九批 · 用户令「整个游戏的滚动条和界面不太匹配，美化一下」）。
   * ⚠️ 量法：本环境（Win11 + 新版 Chromium）走 **overlay 滚动条**，`offsetWidth − clientWidth` 恒为 0
   *   ——拿布局占位当判据会把一条正确的样式测成红（首跑即此形，登记防下批重踩）。
   *   改问 CSSOM：探针元素上 `::-webkit-scrollbar` 的计算宽度 === 本仓定义的 9px ⇒ 证「规则在、且作用到本文件」。 */
  const sbW = await page.evaluate(() => {
    const probe = (doc) => {
      const box = doc.createElement('div');
      box.style.cssText = 'width:60px;height:60px;overflow-y:scroll;position:absolute;left:0;top:0';
      const inner = doc.createElement('div'); inner.style.height = '400px'; box.appendChild(inner);
      doc.body.appendChild(box);
      const w = doc.defaultView.getComputedStyle(box, '::-webkit-scrollbar').width;
      const gap = box.offsetWidth - box.clientWidth;
      doc.body.removeChild(box);
      return { w: w, gap: gap };
    };
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:absolute;left:-9999px;width:120px;height:120px';
    document.body.appendChild(fr);
    const bare = probe(fr.contentDocument);      /* 无本仓样式的对照文档 */
    document.body.removeChild(fr);
    return { own: probe(document), bare: bare };
  });
  T(sbW.own.w === '9px' && sbW.bare.w !== '9px',
    'AT-SB 滚动条 = 主题细身样式（本文件 `::-webkit-scrollbar` 计算宽 9px，无样式对照文档不是 9px）',
    '本仓=' + sbW.own.w + ' 对照=' + sbW.bare.w + ' ‖ 布局占位=' + sbW.own.gap + 'px（overlay 不占位，不作判据）');

  T(errors.length === 0, 'AT-Err 全表逐页点完后零 pageerror / 零 console.error', errors.slice(0, 3).join('|') || 'clean');

  console.log(fail === 0 ? 'UI_ALLTABS_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_ALLTABS_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
