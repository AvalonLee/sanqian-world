/* .tests/verify-ui-sect.cjs — 宗门页动作走查（第册一百四十二批 2026-10-23 · B2 = D15 阶段 B 第二刀）
 * 依赖：playwright-core（根 `package.json` 已声明）+ 系统 Edge
 * 用法：node .tests/verify-ui-sect.cjs
 *
 * 立篇因由：勘察档 §七 B2 要求「搬宗门十支之前先补走查篇」——`sectSucceed` / `sectOffer` 在 `.tests` 里
 *   **零引用**，另有四支只被 Node 侧探针覆盖（浏览器里没人点过）。搬动作的典型失误是「按钮还在、点了没反应」，
 *   静态判据看不见，所以本篇口径 = **逐支真点 + 读盘上真值**，不是数按钮。
 * 覆盖：招贤 recruit → 投资 invest → 调遣 dispatch → 供奉 offer → 建设 build → 宣战 war → 接任 succeed；
 *   另开一页覆盖**立派** found（要「无宗门且无势力」态）。
 * 建场：全走引擎真入口 `SQ.Sect.foundSect` 造档（照 `probe-sectwire` 口径，不手搓 `ws.sect`——
 *   手搓的档过一遍 `normalize` 就与真档不同形，假红假绿两头都可能）。
 *
 * ⚠️ **N87 在册（第册一百四十二批发现，本批只登记不处置）**：`sectAccept` / `sectReject` 两支**在真机不可达**——
 *   `sect.candidate` 是临时态，`assets/worlds/xiuxian/sect.js` 的 normalize 把它硬写成 `null`，而 `SQ.mutate`
 *   提交时会过一次 normalize ⇒ 招贤刚掷出的候选**在 render 之前就被抹掉**，屏上永远不出现「收下 / 逐客」。
 *   ⇒ 本篇 C2b 是**断链守门判**：断言「候选恒空 + 两钮不出现」。哪天修好（候选改落盘或改即时结算），
 *   这条会**如实变红**，届时改成正面断言并销 N87 —— 这就是在册例外的「失效同判红」口径。
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
  const D = pack.data;
  const noopLog = () => function () {};
  const now = Date.now();
  const mkMeta = () => { const m = SQ.Legacy.metaBlank(); m.unlocks.sect = true; m.unlockedWorlds = ['xiuxian']; return m; };
  const f0 = D.FACTIONS_FIXED[0].id;
  const offerNpc = D.COMPANIONS[0].id;

  /* ── 建场一：已开宗（一名弟子 · 灵石充足 · 真仙位阶 ⇒ 接任钮才出）── */
  const ws = pack.normalize(pack.initialState());
  ws.realm = D.REALMS.length - 1;
  ws.everDefected = true; ws.factionRepPeak = 3000;
  ws.factionId = f0; ws.factionRep[f0] = 3000; ws.factionOffice = 'elder';
  ws.artsKnown = ['qingxin', 'tiebi', 'posha'];
  const fr = SQ.Sect.foundSect(ws, pack, D, mkMeta(), 'wuyue', '验证宗', null, 'neutral', now, noopLog(), '清静无为');
  if (!fr.ok) throw new Error('建场失败：foundSect → ' + fr.reason);
  ws.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 4, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
  ws.sect.fac = { zangjing: 3, danfang: 0, yanwu: 0, keshe: 2 };   /* 宿舍 2 ⇒ 门徒上限 3（供奉也要名额） */
  ws.sect.recruitAt = 0; ws.sect.declareAt = 0; ws.sect.succession = null; ws.sect.candidate = null;
  ws.stones = 5000000;
  ws.bonds = ws.bonds || {}; ws.bonds[offerNpc] = 90;
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;

  const mkSave = (w) => ({
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-22-1' },
    meta: mkMeta(),
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: w }
  });
  const saveSect = mkSave(ws);

  /* ── 建场二：无宗门「且」无势力（有 factionId 时宗门页会渲染势力主页，见 sect.js 那条分支）── */
  const ws2 = pack.normalize(pack.initialState());
  ws2.realm = 4; ws2.everDefected = true; ws2.factionRepPeak = 3000;
  ws2.factionId = null; ws2.stones = 2000000;
  ws2.lastSave = now; ws2.lastOffline = null; ws2.pendingChoice = null;
  const saveEmpty = mkSave(ws2);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };
  const errors = [];
  const mkPage = async (save) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
    return { ctx, page };
  };
  const poll = async (fn, ms) => {
    const t0 = Date.now();
    for (;;) {
      const v = await fn();
      if (v) return v;
      if (Date.now() - t0 > (ms || 6000)) return false;
      await new Promise((r) => setTimeout(r, 120));
    }
  };

  /* ══ 页一：已开宗 ══ */
  const { ctx, page } = await mkPage(saveSect);
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}'));
  const sectOf = async () => (await read()).worlds.xiuxian.sect || {};
  /* 点不动就返回 false（§4.60 定则 5：抛异常会把整篇后续组全带走） */
  const clickSafe = async (sel, ms) => {
    try { await page.click(sel, { timeout: ms || 5000 }); return true; } catch (e) { return false; }
  };
  const lastToast = () => page.evaluate(() => {
    const all = document.querySelectorAll('#toasts .toast');
    return all.length ? all[all.length - 1].textContent : '';
  });

  await page.click('#m-tabbar button:has-text("宗门")');
  await page.waitForTimeout(500);

  /* ── C1 结构：四设施行 / 招贤钮 / 宣战钮 / 接任钮（真仙位阶 + 有弟子才出）── */
  const base = await page.evaluate(() => ({
    inPage: !document.getElementById('tab-sect').classList.contains('hide'),
    facRows: document.querySelectorAll('#tab-sect [data-act="sectBuild"]').length,
    hasRecruit: !!document.querySelector('#tab-sect [data-act="sectRecruit"]'),
    hasWar: document.querySelectorAll('#tab-sect [data-act="sectWar"]').length,
    hasSucc: document.querySelectorAll('#tab-sect [data-act="sectSucceed"]').length
  }));
  T(base.inPage && base.facRows === 4 && base.hasRecruit && base.hasWar > 0 && base.hasSucc === 1,
    'C1 宗门页结构与动作锚点齐（四设施 · 招贤 · 宣战 · 接任）',
    'fac=' + base.facRows + ' recruit=' + base.hasRecruit + ' war=' + base.hasWar + ' succ=' + base.hasSucc);

  /* ── C2 招贤 ⇒ 给一句中文提示、recruitAt 前进（`sectRecruit` 可达的那半条链）── */
  const okRecruit = await clickSafe('#tab-sect [data-act="sectRecruit"]');
  const s2 = await poll(async () => {
    const s = await sectOf();
    return s.recruitAt > 0 ? s : false;
  }, 6000);
  const tst2 = await poll(() => lastToast(), 4000);
  T(okRecruit && !!s2 && !!tst2 && residue(String(tst2)) === null,
    'C2 点「广纳门徒」⇒ 盘上 recruitAt 前进 + 屏上一句中文（不静默）',
    'recruitAt=' + (s2 ? s2.recruitAt : 0) + ' toast=' + JSON.stringify(tst2));

  /* ── C2b N87 断链守门：候选被发现即刻抹掉 ⇒ 收下/逐客永不出现（修好则本判变红并销账）── */
  const dl = await page.evaluate(() => ({
    cand: (JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.sect || {}).candidate,
    accept: !!document.querySelector('#tab-sect [data-act="sectAccept"]'),
    reject: !!document.querySelector('#tab-sect [data-act="sectReject"]')
  }));
  T(dl.cand == null && !dl.accept && !dl.reject,
    'C2b【N87 在册·断链守门】招贤候选被 normalize 抹掉 ⇒ 屏上无「收下/逐客」（修好后本判应变红 ⇒ 改成正面断言并销 N87）',
    'candidate=' + JSON.stringify(dl.cand) + ' accept=' + dl.accept + ' reject=' + dl.reject);

  /* ── C3 投资 ⇒ 该弟子 inv 置档、灵石扣减 ── */
  const stones3a = (await read()).worlds.xiuxian.stones;
  const okInvest = await clickSafe('#tab-sect [data-act="sectInvest"][data-v="d1"][data-c="2"]');
  const s3 = await poll(async () => {
    const s = await sectOf();
    const d0 = (s.disciples || []).filter((x) => x.id === 'd1')[0];
    return d0 && d0.inv ? { d0, stones: (await read()).worlds.xiuxian.stones } : false;
  }, 6000);
  T(okInvest && !!s3 && s3.d0.inv === 2,
    'C3 点二档投资 ⇒ 弟子 inv 置为 2（`sectInvest` 带 data-c 那一路；成本走月度供奉，不即时扣）',
    s3 ? 'inv=' + s3.d0.inv + ' stones ' + stones3a + '→' + s3.stones : '未落盘');

  /* ── C4 调遣 ⇒ 盘上留痕（dispatchAt / 弟子 prog）或给一句中文拒因（四拒因不许静默）── */
  const okDispatch = await clickSafe('#tab-sect [data-act="sectDispatch"][data-v="d1"]');
  const s4 = await poll(async () => {
    const s = await sectOf();
    const d0 = (s.disciples || []).filter((x) => x.id === 'd1')[0];
    if (s.dispatchAt || (d0 && d0.prog)) return { s, d0 };
    const tst = await lastToast();
    return tst ? { s, d0, toast: tst } : false;
  }, 6000);
  T(okDispatch && !!s4 && (!s4.toast || residue(String(s4.toast)) === null),
    'C4 点调遣 ⇒ 盘上留痕或给一句中文拒因（`sectDispatch`）',
    s4 ? 'dispatchAt=' + s4.s.dispatchAt + ' prog=' + (s4.d0 && s4.d0.prog) + ' toast=' + JSON.stringify(s4.toast || '') : '零反馈');

  /* ── C5 供奉 ⇒ 该弟子 offering = 道友 id（此前零走查引用）── */
  const okOffer = await clickSafe('#tab-sect [data-act="sectOffer"][data-v="' + offerNpc + '"]', 4000);
  /* 引擎侧 tier<4 时有 OFFER_P3（50%）概率婉拒 ⇒ 两种结局都合法，判「落位 或 给中文婉拒」，
   * 不判「一定成功」（那是把概率当确定性，必成 flaky 判据）。 */
  const s5 = await poll(async () => {
    const s = await sectOf();
    if ((s.disciples || []).some((x) => x.offering === offerNpc)) return { kind: 'ok' };
    const tst = await lastToast();
    if (tst && residue(String(tst)) === null) return { kind: 'refuse', toast: tst };
    return false;
  }, 6000);
  T(okOffer && !!s5, 'C5 点「请为供奉」⇒ offering 落位 或 一句中文婉拒（`sectOffer`；概率婉拒不算失败）',
    '点=' + okOffer + ' ' + (s5 ? s5.kind + (s5.toast ? '：' + JSON.stringify(s5.toast) : '：offering=' + offerNpc) : '零反馈'));

  /* ── C6 建设 ⇒ fac.danfang +1 且灵石 −FAC_COST[0] ── */
  const stones6a = (await read()).worlds.xiuxian.stones;
  const okBuild = await clickSafe('#tab-sect [data-act="sectBuild"][data-v="danfang"]');
  const s6 = await poll(async () => {
    const s = await sectOf();
    return (s.fac || {}).danfang === 1 ? { s, stones: (await read()).worlds.xiuxian.stones } : false;
  }, 6000);
  T(okBuild && !!s6 && s6.stones === stones6a - D.SECT.FAC_COST[0],
    'C6 点建设 ⇒ danfang 升 1 级且扣 FAC_COST[0]=' + D.SECT.FAC_COST[0] + '（`sectBuild`）',
    s6 ? 'danfang=' + s6.s.fac.danfang + ' stones ' + stones6a + '→' + s6.stones : '未落盘');

  /* ── C7 宣战 ⇒ 目标转 enemy 且付开战费（结仇三笔那一路）── */
  const targetFid = D.FACTIONS_FIXED[1].id;
  const stones7a = (await read()).worlds.xiuxian.stones;
  const okWar = await clickSafe('#tab-sect [data-act="sectWar"][data-v="' + targetFid + '"]', 4000);
  const s7 = await poll(async () => {
    const s = await read();
    const self = (s.worlds.xiuxian.factions || []).filter((f) => f.id === 'sect')[0];
    return self && self.rel && self.rel[targetFid] === 'enemy' ? { rel: self.rel[targetFid], stones: s.worlds.xiuxian.stones } : false;
  }, 6000);
  T(okWar && !!s7, 'C7 点宣战 ⇒ 目标转 enemy（本宗与它开宗即敌对时开战费为 0，非失败）',
    s7 ? 'rel=' + s7.rel + ' stones ' + stones7a + '→' + s7.stones : '未落盘');

  /* ── C8 接任 ⇒ 确认框 → succession 置位（此前零走查引用）── */
  const okSucc = await clickSafe('#tab-sect [data-act="sectSucceed"][data-v="d1"]', 4000);
  const cfS = await poll(() => page.$('#modal-confirm:not(.hide)'), 5000);
  await clickSafe('#cf-ok', 3000);
  const s8 = await poll(async () => {
    const s = await sectOf();
    return s.succession ? s : false;
  }, 6000);
  T(okSucc && !!cfS && !!s8, 'C8 点接任 ⇒ 确认框 → 盘上 succession 置位（`sectSucceed`）',
    '钮=' + okSucc + ' 框=' + !!cfS + ' succession=' + JSON.stringify(s8 ? s8.succession : null).slice(0, 80));

  T(errors.length === 0, 'C 组零页面报错', errors.join('|').slice(0, 160) || 'clean');
  await ctx.close();

  /* ══ 页二：无宗门无势力 → 立派 ══ */
  const e2 = [];
  const p2 = await mkPage(saveEmpty);
  const page2 = p2.page;
  const click2 = async (sel, ms) => { try { await page2.click(sel, { timeout: ms || 5000 }); return true; } catch (e) { return false; } };
  const read2 = () => page2.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}'));
  await page2.click('#m-tabbar button:has-text("宗门")');
  await page2.waitForTimeout(500);
  await click2('#sect-name-input', 2000).catch(() => {});
  await page2.fill('#sect-name-input', '验证宗').catch(() => {});
  await page2.waitForTimeout(300);   /* 填名触发 input 监听 → renderTab 重绘；不等就会点到已摘除的旧节点 */
  await page2.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  await page2.waitForTimeout(200);   /* 失焦同样触发 focusout 监听 → 再重绘一次 */
  const hasFound = await click2('#tab-sect [data-act="sectFound"]', 4000);
  const cfF = await poll(() => page2.$('#modal-confirm:not(.hide)'), 5000);
  await click2('#cf-ok', 3000);
  const sF = await poll(async () => {
    const s = await read2();
    return s.worlds.xiuxian.sect ? s.worlds.xiuxian.sect : false;
  }, 8000);
  T(hasFound && !!cfF && !!sF && sF.name === '验证宗',
    'F1 点立派 ⇒ 确认框 → 盘上 sect 建起且自定义宗名落档（`sectFound`）',
    '钮=' + hasFound + ' 框=' + !!cfF + ' 宗名=' + JSON.stringify(sF ? sF.name : null));
  T(e2.length === 0 && errors.length === 0, 'F 组零页面报错', e2.join('|').slice(0, 160) || 'clean');
  await p2.ctx.close();

  await browser.close();
  console.log(fail === 0 ? 'UI_SECT_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_SECT_FAILED ' + fail + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();
