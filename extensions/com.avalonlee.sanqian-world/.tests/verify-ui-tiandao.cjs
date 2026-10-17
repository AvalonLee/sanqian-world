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
    var r = document.querySelector('.tdrow');
    if (!r) return { none: true };
    var omen = r.querySelector('[data-act="openOmens"]');
    var bj = r.querySelector('[data-act="dissolve"]');
    var gift = r.querySelector('[data-act="giftBuy"]');
    return {
      justify: getComputedStyle(r).justifyContent,
      sameRowOmen: !!omen, sameRowBingjie: !!bj,
      gift: !!gift, giftText: gift ? gift.textContent.replace(/\s+/g, ' ').trim() : '',
      /* `margin-left: auto` 在 flex 里会被解析成实际用值（px）——读到 >8px 才算真的把贴片推走了 */
      giftML: gift ? getComputedStyle(gift).marginLeft : '',
      giftLeftAuto: !!gift && parseFloat(getComputedStyle(gift).marginLeft) > 8,
      residue: (r.textContent.match(/[{，}。]/g) || []).length ? (/\{\}/.test(r.textContent) ? 1 : 0) : 0
    };
  });
  /* G1 判据随批改口（第卌七批 · 用户令「修行页天象兵解等功能左对齐，模拟礼包的提示框右对齐」）：
   * 第卅九批的口径是**整行右对齐**（justify=flex-end），本批反过来——功能群贴左、贴片独自贴右。
   * 两个层级各钉一刀：G1 看计算样式（justify-content + 贴片的 margin-left 是否真为 auto 生效），
   * G8 看几何像素（谁贴左沿、谁贴右沿、中间有没有推开、有没有重叠）。只留一层都会被另一层放过。 */
  T(rowA.justify === 'flex-start' && rowA.giftLeftAuto,
    'G1 天道行改左对齐、礼包贴片以 margin-left:auto 贴右（第卌七批改口，旧口径为整行 flex-end）',
    'justify=' + rowA.justify + ' 贴片marginLeft=' + rowA.giftML + ' auto生效=' + rowA.giftLeftAuto);
  T(rowA.sameRowOmen && rowA.sameRowBingjie, 'G2 天象与兵解转世在同一行（问天隐藏后两者同父 .tdrow）', JSON.stringify([rowA.sameRowOmen, rowA.sameRowBingjie]));
  T(rowA.gift && /首充|648|屠龙|直通|霓裳|榜末/.test(rowA.giftText), 'G3 页游充值贴片在位且是当前六款之一', rowA.giftText.slice(0, 54));
  T(rowA.residue === 0, 'G4 这一行无 {} 占位残留', 'residue=' + rowA.residue);
  const keysG = await page.evaluate(() => {
    var out = [];
    for (var i = 0; i < 6; i++) out.push(SQ.t('eggs.gift.p' + i + '.name'), SQ.t('eggs.gift.p' + i + '.offer'));
    out.push(SQ.t('eggs.gift.tag'), SQ.t('eggs.gift.btn'), SQ.t('eggs.gift.deny'));
    return out;
  });
  T(keysG.length === 15 && keysG.every((x) => typeof x === 'string' && x.length > 0 && !/\{|undefined/.test(x)),
    'G4b 礼包 15 枚词表键全部可解析（含 deny）', keysG.filter((x) => !x || /\{|undefined/.test(x)).slice(0, 2).join('|'));
  const save0 = await page.evaluate(() => localStorage.getItem('sanqian-state-v1') || '');
  await clearToasts();
  await page.click('[data-act="giftBuy"]');
  await page.waitForTimeout(400);
  const afterG = await page.evaluate(() => ({
    toasts: Array.prototype.map.call(document.querySelectorAll('#toasts .toast'), (x) => x.textContent),
    save: localStorage.getItem('sanqian-state-v1') || '',
    qi: (document.querySelector('.stathero') || {}).textContent || ''
  }));
  T(afterG.toasts.length === 1 && /不通金银|苦修|彩蛋/.test(afterG.toasts[0]), 'G5 点「立即充值」只出一句拒绝提示', afterG.toasts.join('|').slice(0, 60));
  T(afterG.save === save0, 'G5b 点彩蛋**零落档**：localStorage 逐字节不变', 'len ' + save0.length + '→' + afterG.save.length);
  const seen = new Set();
  for (let i = 0; i < 12 && seen.size < 2; i++) {
    await page.reload();
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(420);
    const t = await page.evaluate(() => {
      var g = document.querySelector('[data-act="giftBuy"]');
      return g ? g.textContent.replace(/\s+/g, ' ').trim() : '';
    });
    if (t) seen.add(t.slice(0, 10));
  }
  T(seen.size >= 2, 'G6 重进 12 次至少换出 2 款（随机轮换为真，不是写死一张）', 'seen=' + seen.size);
  /* G8（第卌七批 · 用户令「修行页天象兵解等功能左对齐，模拟礼包提示框右对齐」）：
   * 同一行两种角色靠对齐分开——功能群一律贴左，恶搞贴片用 margin-left:auto 独自推到行尾。
   * 判据取的是**几何**（boundingRect 边界差），不是 class 名：改回 justify-content: flex-end 必红。 */
  const al = await page.evaluate(() => {
    /* 按「含贴片的那一行」取，不按第一个 `.tdrow`——修行页与轮回页都有 tdrow，靠位置选会挑错行 */
    const row = document.querySelector('.tdrow:has(.giftcard)');
    const gift = row && row.querySelector('.giftcard');
    if (!row || !gift || !gift.offsetParent) return { found: false };
    const gb = gift.getBoundingClientRect();
    const vis = Array.prototype.slice.call(row.children)
      .filter(x => x !== gift && x.offsetParent !== null);
    if (!vis.length) return { found: true, empty: true };
    const bb = vis.map(x => x.getBoundingClientRect());
    const rb = row.getBoundingClientRect();
    const sameLine = bb.filter(r => Math.abs(r.top - gb.top) < 4);
    return {
      found: true, n: vis.length,
      leftGap: Math.round(Math.min.apply(null, bb.map(r => r.left)) - rb.left),
      rightGap: Math.round(rb.right - gb.right),
      pushGap: Math.round(gb.left - Math.max.apply(null, (sameLine.length ? sameLine : bb).map(r => r.right))),
      overlap: bb.some(r => r.right > gb.left + 1 && r.left < gb.right - 1 && Math.abs(r.top - gb.top) < 4)
    };
  });
  T(al.found && !al.empty && al.leftGap <= 2 && al.rightGap <= 2 && al.pushGap >= 8 && al.overlap === false,
    'G8 功能群贴左（左边界差 ≤2px）· 礼包贴片贴右（右边界差 ≤2px）· 中间被推开 ≥8px 且互不重叠',
    JSON.stringify(al));
  T(errors.length === 0, 'G7 第一台整轮零页错误', errors.slice(0, 3).join(' | '));

  await browser.close();
  console.log('');
  console.log((fail === 0 ? 'UI_TIANDAO_ALL_GREEN ' : 'UI_TIANDAO_HAS_FAIL ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
