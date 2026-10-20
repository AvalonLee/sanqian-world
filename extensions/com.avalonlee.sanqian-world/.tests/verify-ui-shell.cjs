/* .tests/verify-ui-shell.cjs — UI v2 B1 壳走查（五区导航 / 子导航 / 纸面 / 右栏骨架 / 四档）
 * 依赖：playwright-core + Edge；用法：node .tests/verify-ui-shell.cjs
 *
 * B1 只换壳，不换任何页面渲染器。本脚本锁五件事：
 *   ① 左带 15 项 + 五区标题齐全且顺序固定；
 *   ② 子导航 = 当前区，点它能换页（复用 data-act="tab" 分派）；
 *   ③ 页面底是不透明宣纸（亮色），墨夜由宿主 data-xhub-theme 驱动（暗色纸面 + 浅字）；
 *   ④ 右栏骨架在位；B1 无块 ⇒ 不出现第三列（hasrail 不加）；
 *   ⑤ 380 宽无横向溢出、零页面报错。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  fx.worlds.xiuxian.realm = 9;
  fx.worlds.xiuxian.total = Math.max(fx.worlds.xiuxian.total || 0, 100000);
  /* 关掉离线呈报与待决奇遇：否则遮罩会挡住导航点击（其余专篇同款处理） */
  const now0 = Date.now();
  fx.profile.createdAt = now0;
  Object.values(fx.worlds).forEach((w) => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
  });
  /* B5 右栏非空前提：给一条 combat 日志（战报块取 w.log 最近 3 条；空集上的“有块”不成立） */
  fx.worlds.xiuxian.log = (fx.worlds.xiuxian.log || []).concat([
    { cat: 'combat', text: '走查战报 · 击杀一头妖物', ts: now0 }
  ]);
  const save = JSON.stringify(fx);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')')); };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 90)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(String(m.text()).slice(0, 90)); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(400);

  /* ① 五区 + 15 项 */
  const bar = await page.evaluate(() => {
    const b = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(b.children);
    const btns = kids.filter((x) => x.tagName === 'BUTTON');
    return {
      n: btns.length,
      ids: btns.map((x) => x.dataset.v),
      secs: kids.filter((x) => x.classList.contains('sq2-navsec')).map((x) => x.textContent.trim())
    };
  });
  T(bar.n === 16, 'SH1 左带 16 项（B3 拆页后）', 'n=' + bar.n);
  T(bar.secs.join(',') === '修行,历练,道器,江湖,生平', 'SH2 五区标题齐全且顺序固定', bar.secs.join('/'));
  T(bar.ids.join(',') === 'idle,combat,event,arts,gear,treasure,alchemy,shop,bonds,faction,prodigy,sect,achv,legacy,journal,settings',
    'SH3 按钮顺序 = 五区固定序（含百器）', bar.ids.join(','));

  /* ② 子导航 = 当前区 */
  const sub0 = await page.evaluate(() => {
    const n = document.getElementById('m-subnav');
    return {
      btns: Array.prototype.slice.call(n.querySelectorAll('button')).map((x) => ({ v: x.dataset.v, on: x.classList.contains('on') })),
      sec: (n.querySelector('.sq2-subsec') || {}).textContent || ''
    };
  });
  T(sub0.sec.trim() === '修行' && sub0.btns.length === 1 && sub0.btns[0].v === 'idle' && sub0.btns[0].on,
    'SH4 修行区子导航 = 仅修行且高亮', JSON.stringify(sub0));

  await page.click('#m-tabbar button[data-v="prodigy"]');
  await page.waitForTimeout(250);
  const sub1 = await page.evaluate(() => {
    const n = document.getElementById('m-subnav');
    return {
      sec: (n.querySelector('.sq2-subsec') || {}).textContent || '',
      items: Array.prototype.slice.call(n.querySelectorAll('button')).map((x) => x.dataset.v + (x.classList.contains('on') ? '*' : ''))
    };
  });
  T(sub1.sec.trim() === '江湖' && sub1.items.join(',') === 'bonds,faction,prodigy*,sect',
    'SH5 切到江湖榜后子导航 = 江湖四页且高亮同步', JSON.stringify(sub1));

  await page.click('#m-subnav button[data-v="bonds"]');
  await page.waitForTimeout(250);
  T(await page.evaluate(() => !document.getElementById('tab-bonds').classList.contains('hide')), 'SH6 点子导航能换页（data-act=tab 分派）');

  /* B8：江湖区右栏 = 江湖近况 + 宗门四门槛；门槛 ok/no 逐条对引擎 foundGates */
  const railB = await page.evaluate(() => {
    const r = document.getElementById('m-rail');
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = st.worlds.xiuxian, P = SQ.Worlds.xiuxian.pack;
    const g = SQ.Sect.foundGates(w, P.data, st.meta);
    return {
      has: document.getElementById('sc-main').classList.contains('hasrail'),
      titles: Array.prototype.map.call(r.querySelectorAll('.rb-t'), (x) => x.textContent.trim()),
      dom: Array.prototype.map.call(r.querySelectorAll('.rb-gate'), (x) => x.classList.contains('ok')),
      eng: [g.realm, g.identity, g.peak, g.unlock].map(Boolean)
    };
  });
  T(railB.has && railB.titles.indexOf('江湖近况') >= 0 && railB.titles.indexOf('宗门') >= 0 &&
    railB.dom.length === 4 && railB.dom.join(',') === railB.eng.join(','),
    'SH6c 江湖区右栏 = 江湖近况 + 宗门四门槛（门槛 ok/no 逐条 === foundGates）', JSON.stringify(railB));

  /* B5：历练区右栏填块（本区词缀；有战报再加一块）——无数据不显示，有数据必须开第三列 */
  await page.click('#m-tabbar button[data-v="combat"]');
  await page.waitForTimeout(300);
  const railZ = await page.evaluate(() => {
    const r = document.getElementById('m-rail');
    return {
      has: document.getElementById('sc-main').classList.contains('hasrail'),
      blocks: r.querySelectorAll('.sq2-rb').length,
      titles: Array.prototype.map.call(r.querySelectorAll('.rb-t'), (x) => x.textContent.trim())
    };
  });
  T(railZ.has && railZ.blocks >= 1 && (railZ.titles.indexOf('战报') >= 0 || railZ.titles.indexOf('本区词缀') >= 0),
    'SH6b 历练区右栏有块（战报 / 本区词缀；有块才开第三列）', JSON.stringify(railZ));
  await page.click('#m-tabbar button[data-v="idle"]');
  await page.waitForTimeout(300);

  /* ③ 纸面 + 墨夜 */
  const light = await page.evaluate(() => {
    const bg = getComputedStyle(document.body).backgroundColor;
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--sq2-paper').trim();
    return { bg, paper };
  });
  T(light.bg !== 'rgba(0, 0, 0, 0)' && light.bg !== 'transparent', 'SH7 亮色页面底不透明', light.bg);
  T(light.paper === '#F6F1E5', 'SH8 亮色 --sq2-paper = #F6F1E5', light.paper);

  await page.evaluate(() => { document.documentElement.setAttribute('data-xhub-theme', 'dark'); });
  await page.waitForTimeout(120);
  const dark = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--sq2-paper').trim();
    const rgbs = (s) => (s.match(/\d+/g) || []).map(Number);
    const bg = rgbs(cs.backgroundColor), ink = rgbs(cs.color);
    return { paper, bg, ink };
  });
  T(dark.paper === '#1C1A17', 'SH9 墨夜 --sq2-paper 转深', dark.paper);
  T(dark.bg[0] < 60 && dark.bg[1] < 60, 'SH10 墨夜页面底为深色', dark.bg.join(','));
  T(dark.ink[0] > 180 && dark.ink[1] > 180, 'SH11 墨夜文字转浅（可读）', dark.ink.join(','));

  /* ④ 右栏骨架 */
  const rail = await page.evaluate(() => {
    const r = document.getElementById('m-rail');
    return { exists: !!r, empty: r ? r.children.length === 0 : false, has: document.getElementById('sc-main').classList.contains('hasrail'), display: r ? getComputedStyle(r).display : '' };
  });
  T(rail.exists, 'SH12 右栏骨架元素在位');
  T(rail.empty && !rail.has, 'SH13 B1 无块 ⇒ 不加 hasrail（不占第三列）', JSON.stringify(rail));

  /* ⑤ 380 宽 */
  await page.setViewportSize({ width: 380, height: 720 });
  await page.waitForTimeout(250);
  const narrow = await page.evaluate(() => ({
    de: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    body: document.body.scrollWidth <= document.body.clientWidth,
    sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth
  }));
  T(narrow.de && narrow.body, 'SH14 380 宽无横向溢出', narrow.sw + '/' + narrow.cw);

  /* B8 新行结构（已结缘行 / 名次条）在窄屏不许撑破页宽 */
  await page.evaluate(() => {
    Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'))
      .filter((b) => b.dataset.v === 'prodigy')[0].click();
  });
  await page.waitForTimeout(300);
  const nw1 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await page.evaluate(() => {
    Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'))
      .filter((b) => b.dataset.v === 'bonds')[0].click();
  });
  await page.waitForTimeout(300);
  const nw2 = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  T(!nw1 && !nw2, 'SH14b 380 宽下江湖榜 / 道友页无横向溢出', 'prodigy=' + nw1 + ' bonds=' + nw2);
  T(errors.length === 0, 'SH15 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');

  await ctx.close();
  await browser.close();
  console.log('\nUI_SHELL_ALL_GREEN ' + pass + '/' + (pass + fail));
  if (fail) process.exit(1);
})();
