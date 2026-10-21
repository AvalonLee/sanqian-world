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

  /* B16-y：导航短名「丹器」（两字节奏，与功法/百器一致）；页内全名仍为 alchemy.system */
  const navLab = await page.evaluate(() => {
    const b = document.querySelector('#m-tabbar button[data-v="alchemy"]');
    const txt = b ? b.textContent.trim() : '';
    return { txt: txt, want: SQ.t('nav.alchemy', null, 'xiuxian'), full: SQ.t('alchemy.system', null, 'xiuxian') };
  });
  T(navLab.txt === navLab.want && navLab.txt.length === 2 && navLab.full === '炼丹炼器',
    'SH3a 导航炼丹页显示短名「丹器」（2 字），页内全名「炼丹炼器」保留',
    JSON.stringify(navLab));

  /* ③ 内容列居中（2026-10-21 用户令「拖大窗口不要贴左」）：
   * 顶栏 / 子导航 / 正文同宽 832 并在可用区间内居中；正文面板 780、左右内距 26。
   * 可用区间 = 左导航右边 → 右栏左边（无右栏时到视口右边）。 */
  const geo = await page.evaluate(() => {
    const r = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left, r: b.right, w: b.width };
    };
    const main = document.getElementById('sc-main');
    return {
      nav: r('#sc-main > .sq2-nav'), top: r('#sc-main > .topbar'), sub: r('#sc-main > .sq2-subnav'),
      body: r('#sc-main > .tabbody'), panel: r('#tab-idle'),
      rail: main.classList.contains('hasrail') ? r('#sc-main > .sq2-rail') : null,
      railOn: main.classList.contains('hasrail')
    };
  });
  const leftGap = geo.body.l - geo.nav.r;
  const rightGap = (geo.rail ? geo.rail.l : 1440) - geo.body.r;
  T(Math.abs(leftGap - rightGap) <= 2, 'SH3b 内容列在可用宽度里居中（左右留白相等）',
    '左=' + leftGap.toFixed(1) + ' 右=' + rightGap.toFixed(1) + ' 右栏=' + geo.railOn);
  T(Math.abs(geo.top.l - geo.body.l) <= 1 && Math.abs(geo.top.w - geo.body.w) <= 1 &&
    Math.abs(geo.sub.l - geo.body.l) <= 1,
    'SH3c 顶栏 / 子导航 / 正文同宽同起始线（居中不把三段错开）',
    'top=' + geo.top.l + '@' + geo.top.w + ' body=' + geo.body.l + '@' + geo.body.w);
  T(Math.abs(geo.panel.w - 780) <= 1 && Math.abs((geo.panel.l - geo.body.l) - 26) <= 1,
    'SH3d 正文面板 780 宽、左右内距 26（限宽与内距都还在）',
    'panel=' + geo.panel.w + '@' + geo.panel.l + ' body=' + geo.body.l);

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

  /* ③ 纸面 + 墨夜
   * ⚠️ B15-a2 起「纸」的载体从 body 移到 html（body 透明上浮 z-index 1，纸纹层夹在中间）
   *    ⇒ 本组读 documentElement 的底色；body 只负责内容层与文字色。 */
  const light = await page.evaluate(() => {
    const bg = getComputedStyle(document.documentElement).backgroundColor;
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--sq2-paper').trim();
    return { bg, bodyBg, paper };
  });
  T(light.bg !== 'rgba(0, 0, 0, 0)' && light.bg !== 'transparent', 'SH7 亮色页面底不透明（纸在 html）', light.bg);
  T(light.paper === '#F6F1E5', 'SH8 亮色 --sq2-paper = #F6F1E5', light.paper);

  await page.evaluate(() => { document.documentElement.setAttribute('data-xhub-theme', 'dark'); });
  await page.waitForTimeout(120);
  const dark = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--sq2-paper').trim();
    const rgbs = (s) => (s.match(/\d+/g) || []).map(Number);
    const bg = rgbs(htmlBg), ink = rgbs(cs.color);
    return { paper, bg, ink };
  });
  T(dark.paper === '#1C1A17', 'SH9 墨夜 --sq2-paper 转深', dark.paper);
  T(dark.bg[0] < 60 && dark.bg[1] < 60, 'SH10 墨夜页面底为深色（读 html）', dark.bg.join(','));
  T(dark.ink[0] > 180 && dark.ink[1] > 180, 'SH11 墨夜文字转浅（可读）', dark.ink.join(','));

  /* ④ 右栏：修行区自 B15-b 起有三块（四柱 / 天象·传闻 / 离线所得）；仍无块的区（生平）必须收起第三列 */
  await page.evaluate(() => {
    Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'))
      .filter((b) => b.dataset.v === 'idle')[0].click();
  });
  await page.waitForTimeout(260);
  const rail = await page.evaluate(() => {
    const r = document.getElementById('m-rail');
    const duo = r.querySelector('.rb-duo');
    const caveSlot = Array.prototype.slice.call(r.querySelectorAll('.rb-slot'))
      .filter((x) => x.querySelector('.rb-sk') && x.querySelector('.rb-sk').textContent.indexOf(SQ.t('pillar.di', null, 'xiuxian')) >= 0)[0];
    return {
      exists: !!r,
      titles: Array.prototype.map.call(r.querySelectorAll('.rb-t'), (x) => x.textContent.trim()),
      has: document.getElementById('sc-main').classList.contains('hasrail'),
      duoLabels: duo ? Array.prototype.map.call(duo.querySelectorAll('.rb-pair i'), (x) => x.textContent.trim()) : [],
      duoFont: duo ? getComputedStyle(duo.querySelector('.rb-pair')).fontSize : '',
      caveTxt: caveSlot ? (caveSlot.querySelector('.rb-sd') || {}).textContent.trim() : ''
    };
  });
  T(rail.exists, 'SH12 右栏骨架元素在位');
  T(rail.has && rail.titles.join(',') === '四柱,天象 · 传闻,页游彩蛋,离线所得',
    'SH13 修行区右栏 = 四柱 + 天象·传闻 + 页游彩蛋 + 离线所得（B16-c，有块才开第三列）', JSON.stringify(rail));
  T(rail.duoLabels.join('|') === '护法位|双修位' && parseFloat(rail.duoFont) <= 10.5,
    'SH13c 侣柱同时显示护法位与双修位（框内小字，不再只显示其中一位）',
    'labels=' + rail.duoLabels.join('|') + ' font=' + rail.duoFont);
  T(/^修为产出 ×\d+\.\d{2}$/.test(rail.caveTxt),
    'SH13d 地柱乘区带中文说明（修为产出 ×N.NN，不只一个孤零零的数字）', rail.caveTxt);
  await page.evaluate(() => {
    Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'))
      .filter((b) => b.dataset.v === 'achv')[0].click();
  });
  await page.waitForTimeout(260);
  const railNone = await page.evaluate(() => {
    const r = document.getElementById('m-rail');
    return { empty: r.children.length === 0, has: document.getElementById('sc-main').classList.contains('hasrail') };
  });
  T(railNone.empty && !railNone.has, 'SH13b 无块区（生平）不加 hasrail（不占第三列）', JSON.stringify(railNone));

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

  /* B13：手机五区底部 tab 取代 16 项横滑；点区落该区首页，区内换页走顶部子导航。
   * B16-b：16 项导航（含品牌区）收进 #m-nav 容器整体隐藏 ⇒ 判据读容器 display（
   * 子元素在 display:none 父下的 computed display 仍报告自身值，不可作收起证据）。 */
  const zb0 = await page.evaluate(() => ({
    tabbar: getComputedStyle(document.getElementById('m-nav')).display,
    zone: getComputedStyle(document.getElementById('m-zonebar')).display,
    btns: Array.prototype.map.call(document.querySelectorAll('#m-zonebar button'), (b) => b.textContent.trim()),
    on: Array.prototype.map.call(document.querySelectorAll('#m-zonebar button'), (b) => b.classList.contains('on'))
  }));
  T(zb0.tabbar === 'none' && zb0.zone === 'flex' &&
    zb0.btns.join(',') === '修行,历练,道器,江湖,生平' && zb0.on.filter(Boolean).length === 1,
    'SH16 380 宽：底栏 = 五区 tab（16 项导航收起，当前区唯一高亮）', JSON.stringify(zb0));
  await page.evaluate(() => {
    const b = Array.prototype.slice.call(document.querySelectorAll('#m-zonebar button')).filter((x) => x.textContent.trim() === '道器')[0];
    if (b) b.click();
  });
  await page.waitForTimeout(300);
  const zbArts = await page.evaluate(() => ({
    arts: !document.getElementById('tab-arts').classList.contains('hide'),
    sub: (document.querySelector('#m-subnav .sq2-subsec') || {}).textContent || ''
  }));
  await page.evaluate(() => {
    const b = Array.prototype.slice.call(document.querySelectorAll('#m-zonebar button')).filter((x) => x.textContent.trim() === '江湖')[0];
    if (b) b.click();
  });
  await page.waitForTimeout(300);
  const zbBonds = await page.evaluate(() => ({
    bonds: !document.getElementById('tab-bonds').classList.contains('hide'),
    sub: (document.querySelector('#m-subnav .sq2-subsec') || {}).textContent || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }));
  T(zbArts.arts && zbArts.sub.trim() === '道器' && zbBonds.bonds && zbBonds.sub.trim() === '江湖' && !zbBonds.overflow,
    'SH17 点底栏「道器 / 江湖」落该区首页，子导航同步该区且无横向溢出', JSON.stringify({ arts: zbArts, bonds: zbBonds }));
  T(errors.length === 0, 'SH15 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');

  await ctx.close();
  await browser.close();
  console.log('\nUI_SHELL_ALL_GREEN ' + pass + '/' + (pass + fail));
  if (fail) process.exit(1);
})();
