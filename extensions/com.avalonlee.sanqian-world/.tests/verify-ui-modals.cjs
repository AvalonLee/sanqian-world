/* .tests/verify-ui-modals.cjs — 三枚「走查从不打开」的浮层（第册十五批 · 审计待办 C1）
 *
 * 立因：`view/index.html` 的 `MASKS` 共 21 枚浮层，机器对表后未被任何 `verify-ui-*.cjs` 引用的还剩三枚
 *   —— `modal-ledger`（账本）‖ `modal-gearcodex`（百器录）‖ `modal-slotpick`（择护法 / 择道侣）。
 *   本仓头号缺陷类是「引擎算对了、屏上那一片空白或炸掉」（第廿四批 4 实参喂 3 形参、第卌批两处裸读
 *   把整页炸空，两形都穿过了无头门禁），而**浮层里的字符串拼接正是这一族的高发面**——无头门禁照不到 DOM。
 *
 * 口径（不是「浮层能开就算过」）：
 *   · 每组先钉「触发点存在」（拿不到触发点 ⇒ 判红，不许静默跳过 = §4.60 第 5 则同纪律）；
 *   · 钉「浮层真开了」+「关键行非空且含中文」+「账本里种进去的数原样出现在屏上」（证消费关系，
 *     不是数字对得上：改 `SQ.fmt` 或改分类表 ⇒ 这一判要跟着变）；
 *   · 钉「屏上零 junk」（undefined / NaN / [object / 裸 {x）；
 *   · 钉「点关闭 ⇒ 浮层回 hide 且背后那一页仍可见」——防空报「关掉了其实还压着」，也接第卅九批
 *     那族「浮层开着时容器归属被秒级 tick 偷换」的风险；
 *   · 全篇零 pageerror / 零 console.error。
 *
 * 用法：node .tests/verify-ui-modals.cjs（playwright-core 由仓库根 package.json 声明，无需 NODE_PATH）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now0 = Date.now();
  const wid = s0.profile.worldId;
  s0.profile.createdAt = now0;
  Object.values(s0.worlds).forEach((w) => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
  });
  const w0 = s0.worlds[wid];
  /* 账本种数：三条入项 + 两条出项取**互不相同、且格式化后不成子串**的值（防「1,234」被「11,234」蒙过）。
   * 屏上必须逐条出现 ⇒ 分类表被改、fmt 被改、或渲染漏项，这一判都会红。 */
  const seeded = { inn: [['kill', 1237], ['refine', 89], ['offline', 4026]], out: [['arts', 6800], ['donate', 215]] };
  w0.ledger = w0.ledger || { in: {}, out: {} };
  seeded.inn.forEach(([k, v]) => { w0.ledger.in[k] = v; });
  seeded.out.forEach(([k, v]) => { w0.ledger.out[k] = v; });
  /* 器段与护法位要有得可列：百器录至少录过一件，护法人选清单靠 COMPANIONS 本身 */
  w0.gearCodex = w0.gearCodex || [];
  if (!w0.gearCodex.length) w0.gearCodex = ['t01'];

  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(s0));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined || detail === '' ? '' : ' (' + detail + ')'));
  };

  /* 触发与读屏一律走 evaluate + 可选守卫：page.click 抛错会静默带走整篇后续组（第册十二批的返修教训），
     所以这里点不到就返回 false，由判据如实打红，而不是让脚本崩在这一组之前。 */
  const clickSel = (sel) => page.evaluate((x) => {
    const el = document.querySelector(x);
    if (!el) return false;
    el.click();
    return true;
  }, sel);
  const exists = (sel) => page.evaluate((x) => !!document.querySelector(x), sel);
  /* 读一枚浮层：开合态 + 关键容器文本 + junk 扫描（口径同 verify-ui-alltabs 的 AT 组） */
  const readModal = (id, bodySel) => page.evaluate(([m, b]) => {
    const el = document.getElementById(m);
    const open = !!el && !el.classList.contains('hide');
    const body = document.querySelector(b);
    const txt = ((body || el || {}).innerText || '').replace(/\s+/g, ' ');
    const junk = (txt.match(/undefined|NaN|\[object |\{[a-z]/g) || []).slice(0, 3).join(',');
    return { open, len: txt.length, cjk: /[一-龥]/.test(txt), junk, head: txt.slice(0, 30), latin: /[A-Za-z]/.test(txt) };
  }, [id, bodySel]);

  await page.goto(url);
  await page.waitForTimeout(1800);

  /* ── M0 前置：三枚浮层在 DOM 里在册（缺一枚 = 有人改名或删层，本篇要当场知道） ── */
  const ids = await page.evaluate(() => ['modal-ledger', 'modal-gearcodex', 'modal-slotpick']
    .map((x) => !!document.getElementById(x)));
  T(ids[0] && ids[1] && ids[2], 'M0 三枚浮层挂点在册', JSON.stringify(ids));

  /* ── M1 账本浮层（修行页四柱「财」点开） ── */
  const hasLedgerTrigger = await exists('#m-rail [data-act="openLedger"]');
  T(hasLedgerTrigger, 'M1a 修行页「财」柱触发点在位（拿不到触发点即判红，不许跳过浮层）');
  if (hasLedgerTrigger) {
    await clickSel('#m-rail [data-act="openLedger"]');
    await page.waitForTimeout(260);
    const m = await readModal('modal-ledger', '#modal-ledger');
    T(m.open && m.len >= 20 && m.cjk && !m.junk, 'M1b 账本浮层开且正文非空壳（含中文零 junk）',
      'open=' + m.open + ' len=' + m.len + (m.junk ? ' junk=' + m.junk : '') + ' 首=' + m.head);
    /* 消费关系：种进引擎的五类目，屏上必须逐条见到「引擎自己格式化后的那个数」。
     * 数字一律走页内 `SQ.fmt`（本仓纪律：呈现判据不许抄一份引擎公式当第二事实源），
     * 所以这一判咬的是「渲染漏项 / 分类表增删 / 取数口接错」，不咬 fmt 的写法本身。 */
    const shown = await page.evaluate(([seedIn, seedOut]) => {
      const txt = (document.getElementById('modal-ledger') || {}).innerText || '';
      const miss = [];
      seedIn.concat(seedOut).forEach(([cat, v]) => {
        if (txt.indexOf(window.SQ.fmt(v)) < 0) miss.push(cat + '=' + window.SQ.fmt(v));
      });
      return miss;
    }, [seeded.inn, seeded.out]);
    T(shown.length === 0, 'M1c 种进 `w.ledger` 的五类目逐条出现在屏上（数走引擎 `SQ.fmt`；漏项或分类表被改即红）',
      shown.slice(0, 5).join(','));
    await clickSel('#mlg-close');
    await page.waitForTimeout(220);
    const closed = await page.evaluate(() => ({
      hidden: document.getElementById('modal-ledger').classList.contains('hide'),
      idleVisible: !!document.getElementById('tab-idle') && !document.getElementById('tab-idle').classList.contains('hide')
    }));
    T(closed.hidden && closed.idleVisible, 'M1d 点关闭 ⇒ 浮层回 hide 且修行页仍可见（不卡层）', JSON.stringify(closed));
  }

  /* ── M2 百器录浮层（B3 拆页后：百器页顶栏 banner 点开） ── */
  await clickSel('#m-tabbar button[data-v="gear"]');
  await page.waitForTimeout(700);
  const hasCodexTrigger = await exists('#tab-gear [data-act="openGearCodex"]');
  T(hasCodexTrigger, 'M2a 器段「百器录」banner 在位（切到器标签后取不到即判红）');
  if (hasCodexTrigger) {
    await clickSel('#tab-gear [data-act="openGearCodex"]');
    await page.waitForTimeout(260);
    const m2 = await readModal('modal-gearcodex', '#mgc-body');
    T(m2.open && m2.len >= 8 && m2.cjk && !m2.junk, 'M2b 百器录浮层开且条目区非空（含中文零 junk）',
      'open=' + m2.open + ' len=' + m2.len + (m2.junk ? ' junk=' + m2.junk : '') + ' 首=' + m2.head);
    await clickSel('#mgc-close');
    await page.waitForTimeout(220);
    const c2 = await page.evaluate(() => ({
      hidden: document.getElementById('modal-gearcodex').classList.contains('hide'),
      artsVisible: !document.getElementById('tab-gear').classList.contains('hide')
    }));
    T(c2.hidden && c2.artsVisible, 'M2c 点关闭 ⇒ 回 hide 且百器页仍可见', JSON.stringify(c2));
  }

  /* ── M3 择护法浮层（道友页护法位摘要行点开） ── */
  await clickSel('#m-tabbar button[data-v="bonds"]');
  await page.waitForTimeout(900);
  const hasGuardTrigger = await exists('#tab-bonds [data-act="guardPickOpen"]');
  T(hasGuardTrigger, 'M3a 道友页护法位摘要行可点（三态皆挂 guardPickOpen，取不到即判红）');
  if (hasGuardTrigger) {
    await clickSel('#tab-bonds [data-act="guardPickOpen"]');
    await page.waitForTimeout(300);
    const m3 = await readModal('modal-slotpick', '#msp-body');
    const rows = await page.evaluate(() => document.querySelectorAll('#msp-body .lrow').length);
    T(m3.open && rows >= 1 && m3.cjk && !m3.junk, 'M3b 择护法浮层开且人名区有行（行数 ≥1 ‖ 含中文 ‖ 零 junk）',
      'open=' + m3.open + ' rows=' + rows + (m3.junk ? ' junk=' + m3.junk : '') + ' 首=' + m3.head);
    /* 浮层内不许把内部字段名打上屏：这层的候选名全部来自 D.COMPANIONS 的词表键 */
    T(m3.latin === false, 'M3c 择护法浮层正文零拉丁字母（防 `npcId` 之类裸字段上屏）');
    await clickSel('#msp-close');
    await page.waitForTimeout(220);
    const c3 = await page.evaluate(() => ({
      hidden: document.getElementById('modal-slotpick').classList.contains('hide'),
      bondsVisible: !document.getElementById('tab-bonds').classList.contains('hide')
    }));
    T(c3.hidden && c3.bondsVisible, 'M3d 点关闭 ⇒ 回 hide 且道友页仍可见（第卅九批那族「归属被偷换」在此也有牙）',
      JSON.stringify(c3));
  }

  /* ── M4 全篇零报错 ── */
  T(errors.length === 0, 'M4 三枚浮层开合全程零 pageerror / 零 console.error', errors.slice(0, 2).join(' | ') || 'clean');

  console.log(fail === 0 ? 'UI_MODALS_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_MODALS_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.log('UI_MODALS_CRASH ' + (e && e.stack || e)); process.exit(2); });
