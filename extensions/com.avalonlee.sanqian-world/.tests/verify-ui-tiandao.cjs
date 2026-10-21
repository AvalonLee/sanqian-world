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
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-17-3' },
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
  /* B1 问天入口（第卅九批 · 用户令「隐藏游戏问天功能」）：**在 DOM 里但对玩家不可见**——
   * 隐藏 = 收掉入口而不是拆掉引擎，浮层与结算链路照旧由本篇以合成点击驱动验证。 */
  const ask = await page.evaluate(() => {
    const b = document.querySelector('[data-act="openTiandao"]');
    return { inDom: !!b, visible: !!b && !!b.offsetParent };
  });
  T(ask.inDom && !ask.visible, 'B1 问天入口已对玩家隐藏（在 DOM · offsetParent 为空 = 不可见不可点）', JSON.stringify(ask));
  if (!ask.inDom) { await browser.close(); process.exit(1); }
  /* 委托挂在 document 上 ⇒ 对隐藏元素 dispatchEvent 仍然进 handler（这就是「只藏不删」的可验形态） */
  const openAsk = (pg) => pg.evaluate(() => {
    const b = document.querySelector('[data-act="openTiandao"]');
    b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  });
  await openAsk(page);
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

  await openAsk(page2);
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
  await openAsk(page2);
  await page2.waitForTimeout(250);
  const reopen2 = await page2.evaluate(() => ({
    memo: document.getElementById('mtd-memoout').value,
    hidden: document.getElementById('mtd-memoout').classList.contains('hide')
  }));
  T(reopen2.memo === '' && reopen2.hidden, 'C8 重开问天不再残留上一次奏疏');

  T(errors2.length === 0, 'C9 第二轮零页错误', errors2.slice(0, 3).join(' | '));
  await ctx2.close();

  /* ── G 组（第卅九批）：修行页那行右对齐 + 天象/兵解同行 + 页游充值贴片彩蛋 ──
   * 用户在第 2 条里同时要求「隐藏问天后，天象与兵解转世仍在同一行右对齐」与「随机刷几种页游大礼包作恶搞」。
   * 彩蛋的底线是**零机制**：不写档、不发资源、不入账 ⇒ G5 直接比 localStorage 的字节。 */
  /* G 组开跑前把第一台残留的浮层收掉（走查侧收层，不碰产品代码） */
  await page.evaluate(() => { document.querySelectorAll('.mask,.trib-mask,.cave-stage,.spouse-stage,.excl-mask').forEach(function (x) { x.classList.add('hide'); }); });
  await page.waitForTimeout(250);
  const rowA = await page.evaluate(() => {
    var r = document.querySelector('#tab-idle .tdrow');
    var rail = document.getElementById('m-rail');
    var omenRail = rail ? rail.querySelector('[data-act="openOmens"]') : null;
    var giftRail = rail ? rail.querySelector('[data-act="giftBuy"]') : null;
    return {
      centerHidden: !r || r.offsetParent === null,
      railOmen: !!omenRail, railGift: !!giftRail,
      railVisible: !!(rail && rail.offsetParent),
      giftText: giftRail && giftRail.closest('.giftcard') ? giftRail.closest('.giftcard').textContent.replace(/\s+/g, ' ').trim() : '',
      hasRail: document.getElementById('sc-main').classList.contains('hasrail'),
      centerOmen: !!(r && r.querySelector('[data-act="openOmens"]')),
      centerBingjie: !!(r && r.querySelector('[data-act="dissolve"]')),
      centerGift: !!(r && r.querySelector('[data-act="giftBuy"]')),
      residue: r ? (/\{\}/.test(r.textContent) ? 1 : 0) : 0
    };
  });
  /* B16-w 改口（用户令「天象 / 兵解转世 / 彩蛋右栏已有，中区不要重复」）：
   * 桌面有右栏时中区 .tdrow 收起（天象/兵解/彩蛋不重复）；右栏天象段条可点开天象浮层、彩蛋在右栏。
   * 窄屏无右栏时中区那行仍在（天象/兵解/彩蛋入口不能因去重而消失）。 */
  T(rowA.railVisible && rowA.centerHidden && rowA.railOmen && rowA.railGift,
    'G1 桌面有右栏 ⇒ 中区天象/兵解/彩蛋行收起（不重复），入口改由右栏承担',
    JSON.stringify(rowA));
  T(rowA.railOmen && rowA.centerOmen && rowA.centerBingjie && rowA.centerGift,
    'G2 右栏天象段条可点；中区那行仍保留天象/兵解/彩蛋（窄屏无右栏时可见，不是删功能）',
    JSON.stringify([rowA.railOmen, rowA.centerOmen, rowA.centerBingjie, rowA.centerGift]));
  T(rowA.railGift && /倒计时/.test(rowA.giftText) && /支付(灵石|修为)/.test(rowA.giftText) && /立即领取/.test(rowA.giftText),
    'G3 天降礼包在右栏：宣传 + 倒计时 + 支付档位 + 领取钮四件齐全', rowA.giftText.slice(0, 80));
  T(rowA.residue === 0, 'G4 中区那一行无 {} 占位残留', 'residue=' + rowA.residue);
  const keysG = await page.evaluate(() => {
    var out = [];
    for (var i = 0; i < SQ.Gifts.N; i++) out.push(SQ.t('eggs.gift.p' + i + '.name'), SQ.t('eggs.gift.p' + i + '.offer'));
    out.push(SQ.t('eggs.gift.tag'), SQ.t('eggs.gift.btn'));
    return { n: SQ.Gifts.N, keys: out };
  });
  T(keysG.n >= 20 && keysG.keys.length === keysG.n * 2 + 2 &&
    keysG.keys.every((x) => typeof x === 'string' && x.length > 0 && !/\{|undefined/.test(x)),
    'G4b 礼包宣传 ≥20 条且全部可解析（name/offer 非空、无占位残留）',
    'N=' + keysG.n + ' bad=' + keysG.keys.filter((x) => !x || /\{|undefined/.test(x)).slice(0, 2).join('|'));
  /* G5 确认 →（取消不扣）→ 确认 → 结果弹窗；扣费与三分支由 probe-gift 直证，这里只验屏上链路 */
  await page.click('#m-rail [data-act="giftBuy"]');
  await page.waitForTimeout(350);
  const cfg = await page.evaluate(() => ({
    open: !document.getElementById('modal-confirm').classList.contains('hide'),
    title: (document.getElementById('cf-title').textContent || '').trim(),
    body: (document.getElementById('cf-text').textContent || '').trim()
  }));
  T(cfg.open && /天降礼包/.test(cfg.title) && /支付/.test(cfg.body) && /%/.test(cfg.body),
    'G5 点礼包先弹确认（写明支付金额与百分比，不在暗处扣）', JSON.stringify(cfg));
  const g5b = await page.evaluate(async () => {
    var SP = Object.getPrototypeOf(localStorage);
    var orig = SP.setItem, writes = 0;
    SP.setItem = function (k, v) { writes++; return orig.call(this, k, v); };
    try {
      var before = localStorage.getItem('sanqian-state-v1') || '';
      document.getElementById('cf-cancel').click();
      for (var i = 0; i < 12; i++) await Promise.resolve();
      var after = localStorage.getItem('sanqian-state-v1') || '';
      return { before: before, after: after, writes: writes,
        closed: document.getElementById('modal-confirm').classList.contains('hide') };
    } finally { SP.setItem = orig; }
  });
  T(g5b.closed && g5b.before === g5b.after && g5b.writes === 0,
    'G5b 取消 = 分文不动、零落档（确认框只问不扣）',
    'closed=' + g5b.closed + ' writes=' + g5b.writes);
  await page.click('#m-rail [data-act="giftBuy"]');
  await page.waitForTimeout(300);
  await page.click('#cf-ok');
  await page.waitForTimeout(700);
  const gr = await page.evaluate(() => ({
    open: !document.getElementById('modal-giftresult').classList.contains('hide'),
    title: (document.getElementById('mgr-title').textContent || '').trim(),
    wantTitle: SQ.t('eggs.gift.result.title', null, 'xiuxian'),
    body: (document.getElementById('mgr-body').textContent || '').trim(),
    cost: (document.getElementById('mgr-body').textContent || '').indexOf('已支付') >= 0,
    outcome: /开出|空空如也/.test(document.getElementById('mgr-body').textContent || '')
  }));
  T(gr.open && gr.title === gr.wantTitle && gr.cost && gr.outcome,
    'G5c 确认后真扣费并弹结果（结果如实说开出什么 / 空空如也，宣传语只作对照）', JSON.stringify(gr));
  await page.click('#mgr-ok');
  await page.waitForTimeout(250);
  T(await page.evaluate(() => document.getElementById('modal-giftresult').classList.contains('hide')),
    'G5d 结果弹窗「再接再厉」可关闭（不留遮罩拦后续点击）');
  const seen = new Set();
  for (let i = 0; i < 12 && seen.size < 2; i++) {
    await page.reload();
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(420);
    const t = await page.evaluate(() => {
      var g = document.querySelector('#m-rail [data-act="giftBuy"]');
      var card = g && g.closest('.giftcard');
      return card ? card.textContent.replace(/\s+/g, ' ').trim() : '';
    });
    if (t) seen.add(t.slice(0, 10));
  }
  T(seen.size >= 2, 'G6 重进 12 次至少换出 2 款（随机轮换为真，不是写死一张）', 'seen=' + seen.size);
  /* G8（B16-w 改口 · 用户令「桌面右栏已有天象/彩蛋，中区不要重复」）：
   * 桌面（有右栏）中区 .tdrow 收起；窄屏无右栏时必须仍在——去重不等于删入口。 */
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(500);
  const narrowG = await page.evaluate(() => {
    const main = document.getElementById('sc-main');
    const rail = document.getElementById('m-rail');
    const row = document.querySelector('#tab-idle .tdrow');
    return {
      hasRail: main.classList.contains('hasrail'),
      railVisible: !!(rail && rail.offsetParent),
      rowVisible: !!(row && row.offsetParent),
      omen: !!(row && row.querySelector('[data-act="openOmens"]')),
      bj: !!(row && row.querySelector('[data-act="dissolve"]')),
      gift: !!(row && row.querySelector('[data-act="giftBuy"]'))
    };
  });
  T(!narrowG.railVisible && narrowG.rowVisible && narrowG.omen && narrowG.bj && narrowG.gift,
    'G8 窄屏无右栏列时中区天象/兵解/彩蛋行仍在（桌面去重不删功能）', JSON.stringify(narrowG));
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.waitForTimeout(300);

  /* ── I 组（B16-w · 修行页构图）：大块次序对齐设计稿 v2 ──
   * mode / 圆相 / 四格 / 境界 / 寿元 / 洞府 / 天象行 / 天命，逐对比较文档序。 */
  const orderI = await page.evaluate(() => {
    const tab = document.getElementById('tab-idle');
    const kids = Array.prototype.slice.call(tab.children);
    const at = (sel, txt) => {
      const xs = Array.prototype.slice.call(tab.querySelectorAll(sel));
      const hit = xs.filter((x) => !txt || x.textContent.indexOf(txt) >= 0)[0];
      return hit ? kids.indexOf(hit) : -1;
    };
    return {
      mode: at('.mode'), enso: at('.stathero'), stat: at('.statrow'),
      realm: at('.kv', SQ.t('realm.info.cur', { realm: SQ.t('realm.' + 0, null, 'xiuxian') }, 'xiuxian').slice(0, 2)),
      life: at('.kv', SQ.t('life.row', { age: '', left: '' }, 'xiuxian').slice(0, 2)),
      cave: at('.idlemeta'), td: at('.tdrow'), talent: at('.sechead')
    };
  });
  const seqI = [orderI.mode, orderI.enso, orderI.stat, orderI.realm, orderI.life, orderI.cave, orderI.td, orderI.talent];
  T(seqI.every((x, i) => x >= 0 && (i === 0 || x > seqI[i - 1])),
    'I1 修行页大块次序 = 模式 → 圆相 → 四格 → 境界 → 寿元 → 洞府 → 天象行 → 天命（设计稿 v2）',
    JSON.stringify(orderI));

  /* I2 吐纳明细浮层：纸面面板 + 加/乘标记 + 合计；关闭可收 */
  await page.click('#tab-idle .rate [data-act="detailRate"]');
  await page.waitForTimeout(300);
  const dpI = await page.evaluate(() => ({
    open: !!document.querySelector('.dp-sheet'),
    title: ((document.querySelector('.dp-sheet .dp-t2') || {}).textContent || '').trim(),
    total: ((document.querySelector('.dp-sheet .dp-total') || {}).textContent || '').trim(),
    rows: document.querySelectorAll('.dp-sheet .dp-row').length,
    add: document.querySelectorAll('.dp-sheet .dp-t.add').length,
    mul: document.querySelectorAll('.dp-sheet .dp-t.mul').length
  }));
  T(dpI.open && !!dpI.title && /\/秒/.test(dpI.total) && dpI.rows >= 2 && dpI.add >= 1 && dpI.mul >= 1,
    'I2 吐纳明细为独立纸面浮层（标题/合计/加项+/乘区× 齐全）', JSON.stringify(dpI));
  await page.click('.dp-sheet [data-act="detailRate"]');
  await page.waitForTimeout(250);
  T(!(await page.$('.dp-sheet')), 'I3 点「收起」浮层消失（不留遮罩拦点击）');
  T(errors.length === 0, 'G7 第一台整轮零页错误', errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('');
  console.log((fail === 0 ? 'UI_TIANDAO_ALL_GREEN ' : 'UI_TIANDAO_HAS_FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
