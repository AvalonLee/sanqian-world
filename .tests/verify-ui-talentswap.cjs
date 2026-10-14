/* .tests/verify-ui-talentswap.cjs — 一世洗髓界面走查（天赋池设计 v1.8 §十 · 洗髓批 2026-10-12）
 * 依赖：playwright-core（`npm install --no-save --registry=https://registry.npmmirror.com playwright-core`）+ 系统 Edge
 * 用法：node .tests/verify-ui-talentswap.cjs
 *
 * 场景：建场时就把「三枚真天赋（Node 侧 SQ.rollTalents 现掷，不写字面量 id）+ 手中两枚洗髓缘 + 三颗洗髓丹」
 *      灌进 fixture ⇒ 全程不靠 reload 改档（addInitScript 每次导航都重跑，reload 前改的 localStorage 会被建场档冲掉
 *      —— 2026-10-07 arts A10c 假红的同型陷阱）。
 * 覆盖：顶栏角色名 → 角色浮层入口 → 洗髓浮层（三格择一 + 三候选择一）→ 换骨落盘 → 炼丹页服丹即弹同一浮层 →
 *      预算耗尽后「再服丹被拒且不扣丹」→ 入口置灰而非隐藏。
 * 边界：引擎侧四渠道与上限由冒烟 #296 守；本篇只守屏上这条路走不走得通（点得到 / 数对得上 / 换完跟着变 /
 *      零裸英文），不重算引擎公式。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

function residue(txt) {
  if (!txt) return '空文本';
  if (/undefined|NaN|\[object/i.test(txt)) return 'undefined/NaN/object 残留';
  if (/[{}]/.test(txt)) return '花括号占位未填';
  const m = txt.match(/[a-z][a-z0-9]*(?:[._][a-z0-9]+){1,}/);
  return m ? '裸 key「' + m[0] + '」' : null;
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const { SQ } = require('./sandbox.cjs').load([]);

  /* ── 建场档（Node 侧一次灌好，之后不再改盘）── */
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now0 = Date.now();
  const roll0 = SQ.rollTalents('xiuxian');
  s0.profile.createdAt = now0;
  s0.profile.talents = roll0.talents;
  s0.meta.unlocks = Object.assign({}, s0.meta.unlocks, { alchemy: true });
  Object.values(s0.worlds).forEach(w => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
  });
  const xw = s0.worlds.xiuxian;
  xw.realm = 7;
  xw.talentOwed = 2; xw.talentUsed = 0;
  xw.alchemy = xw.alchemy || {};
  xw.alchemy.pills = Object.assign({}, xw.alchemy.pills, { ap_xisui: 3 });
  const heldIds0 = roll0.talents.map(t => t.id);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(s0));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };
  const poll = async (fn, ms) => {
    const t0 = Date.now();
    for (;;) {
      const v = await fn();
      if (v) return v;
      if (Date.now() - t0 > (ms || 6000)) return false;
      await new Promise(r => setTimeout(r, 120));
    }
  };
  const readState = () => page.evaluate(() =>
    JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}'));
  const openRole = async () => {
    await page.click('.topline.name');
    await page.waitForSelector('#modal-role:not(.hide)', { timeout: 8000 });
  };
  /* 走一遍完整换骨：开面板 → 择第 0 格 → 择第 0 候选 → 确认 → 等盘上缘数变成 expectOwed */
  const doSwap = async (expectOwed) => {
    await openRole();
    await page.click('#mr-wash');
    await poll(() => page.$('#modal-talentwash:not(.hide)'));
    await page.click('#tw-slots .tcard[data-v="0"]');
    await page.click('#tw-cands .tcard[data-v="0"]');
    await page.click('#tw-ok');
    return poll(async () => (await readState()).worlds.xiuxian.talentOwed === expectOwed);
  };

  await page.goto(url);
  await page.waitForSelector('.topline.name', { timeout: 20000 });
  const s1 = await readState();
  T(s1.profile.talents.length === heldIds0.length && s1.worlds.xiuxian.talentOwed === 2 &&
    s1.worlds.xiuxian.alchemy.pills.ap_xisui === 3,
    'T0 建场档生效：三枚真天赋 + 两枚洗髓缘 + 三颗洗髓丹都在盘上',
    'talents=' + s1.profile.talents.length + '/' + heldIds0.length + ' owed=' + s1.worlds.xiuxian.talentOwed);

  /* T1 角色浮层入口 */
  await openRole();
  const entry1 = await page.textContent('#mr-wash');
  const entryOn1 = await page.isVisible('#mr-wash') && !(await page.isDisabled('#mr-wash'));
  T(entryOn1 && /2\/3/.test(entry1), 'T1 角色浮层「洗髓」入口在位、可点且计数 2/3', 'entry=' + JSON.stringify(entry1));

  /* T2/T3/T4 浮层渲染 */
  await page.click('#mr-wash');
  await poll(() => page.$('#modal-talentwash:not(.hide)'));
  const v2 = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    return {
      slots: document.querySelectorAll('#tw-slots .tcard').length,
      candNames: [...document.querySelectorAll('#tw-cands .tcard .tname')].map(e => e.textContent),
      heldNames: st.profile.talents.map(t => SQ.t('talent.' + t.id + '.name', null, 'xiuxian')),
      okDisabled: document.getElementById('tw-ok').disabled,
      roleHidden: document.getElementById('modal-role').classList.contains('hide'),
      sub: document.getElementById('tw-sub').textContent
    };
  });
  T(v2.slots === heldIds0.length && v2.candNames.length === 3 && v2.roleHidden,
    'T2 洗髓浮层打开：三格 + 三候选齐渲染，角色浮层让位',
    'slots=' + v2.slots + ' cands=' + v2.candNames.length);
  T(new Set(v2.candNames).size === 3 && v2.candNames.every(n => v2.heldNames.indexOf(n) < 0),
    'T3 三候选互不相同且与已持有零交集（引擎排除口径在屏上成立）',
    '候选=' + v2.candNames.join('/'));
  T(/3\/3/.test(v2.sub) && /手中缘 2/.test(v2.sub) && residue(v2.sub) === null,
    'T4 副标与盘上同源（used=0 ⇒ 可换 3/3；owed=2 ⇒ 手中缘 2 枚）且无残留',
    JSON.stringify(v2.sub));
  T(v2.okDisabled === true, 'T4b 未择 ⇒ 「换骨」按钮 disabled（不给空手换骨的机会）', 'disabled=' + v2.okDisabled);

  /* T5 两择齐 ⇒ 解禁 + 选中态恰两枚 */
  await page.click('#tw-slots .tcard[data-v="0"]');
  await page.click('#tw-cands .tcard[data-v="0"]');
  const v5 = await page.evaluate(() => ({
    disabled: document.getElementById('tw-ok').disabled,
    picked: document.querySelectorAll('.tcard.pick').length
  }));
  T(v5.disabled === false && v5.picked === 2,
    'T5 两择齐 ⇒ 按钮解禁且恰两卡带选中态（选中态不残留）',
    'disabled=' + v5.disabled + ' pick=' + v5.picked);

  /* T6/T7 换骨 #1 落盘 */
  const wantName = await page.textContent('#tw-cands .tcard[data-v="0"] .tname');
  await page.click('#tw-ok');
  const s6 = await readState();
  const closed6 = await page.evaluate(() => document.getElementById('modal-talentwash').classList.contains('hide'));
  T(closed6 && s6.worlds.xiuxian.talentOwed === 1 && s6.worlds.xiuxian.talentUsed === 1,
    'T6 换骨落盘：浮层关闭、缘 −1、已用 +1（读盘上真值，不读页面对象）',
    'owed=' + s6.worlds.xiuxian.talentOwed + ' used=' + s6.worlds.xiuxian.talentUsed);
  T(s6.profile.talents[0].id !== heldIds0[0],
    'T7 第 1 格 id 确实换了（' + heldIds0[0] + ' → ' + s6.profile.talents[0].id + '）',
    'held0=' + s6.profile.talents[0].id);
  const lexNew = await page.evaluate((id) => SQ.t('talent.' + id + '.name', null, 'xiuxian'), s6.profile.talents[0].id);
  T(lexNew === wantName, 'T8 落盘 id 与屏上所选同名（视图不自带词条表）', '词表=' + lexNew + ' 所选=' + wantName);

  /* T9 炼丹页服洗髓丹 ⇒ 扣丹 + 赐缘 + 同一浮层自动弹出 */
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await poll(() => page.$('[data-act="alDrink"][data-v="ap_xisui"]'), 8000);
  const hasBtn = !!(await page.$('[data-act="alDrink"][data-v="ap_xisui"]'));
  if (hasBtn) {
    await page.click('[data-act="alDrink"][data-v="ap_xisui"]');
    const opened = await poll(() => page.$('#modal-talentwash:not(.hide)'), 6000);
    const s9 = await readState();
    T(!!opened && s9.worlds.xiuxian.alchemy.pills.ap_xisui === 2 && s9.worlds.xiuxian.talentOwed === 2,
      'T9 炼丹页服洗髓丹：扣丹 + 赐缘 + 洗髓浮层自动弹出（四渠道之一的真入口）',
      '弹=' + !!opened + ' 余丹=' + s9.worlds.xiuxian.alchemy.pills.ap_xisui + ' owed=' + s9.worlds.xiuxian.talentOwed);
  } else {
    T(false, 'T9 炼丹页服洗髓丹', '找不到 [data-act=alDrink][data-v=ap_xisui]（丹未上架？）');
  }

  /* T10 再换两次 ⇒ 预算耗尽（owed 0 / used 3） */
  await page.click('#tw-slots .tcard[data-v="0"]');
  await page.click('#tw-cands .tcard[data-v="0"]');
  await page.click('#tw-ok');
  await poll(async () => (await readState()).worlds.xiuxian.talentUsed === 2);
  const ok10 = await doSwap(0);
  const s10 = await readState();
  T(s10.worlds.xiuxian.talentUsed === 3 && s10.worlds.xiuxian.talentOwed === 0 &&
    s10.profile.talents.length === heldIds0.length && new Set(s10.profile.talents.map(t => t.id)).size === heldIds0.length,
    'T10 连换至预算耗尽：used 3 / owed 0，三格仍互不重复',
    'used=' + s10.worlds.xiuxian.talentUsed + ' owed=' + s10.worlds.xiuxian.talentOwed + ' 换骨2=' + !!ok10);

  /* T11 预算已满 ⇒ 再服丹被拒且**不扣丹**（先判后扣，屏上实证） */
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await poll(() => page.$('[data-act="alDrink"][data-v="ap_xisui"]'), 8000);
  if (await page.$('[data-act="alDrink"][data-v="ap_xisui"]')) {
    const pillsBefore211 = (await readState()).worlds.xiuxian.alchemy.pills.ap_xisui;
    await page.evaluate(() => { document.getElementById('toasts').innerHTML = ''; });
    await page.click('[data-act="alDrink"][data-v="ap_xisui"]');
    const toastTxt = await poll(() => page.evaluate(() => {
      const all = document.querySelectorAll('#toasts .toast');
      return all.length ? all[all.length - 1].textContent : null;
    }), 4000);
    const s11 = await readState();
    T(s11.worlds.xiuxian.alchemy.pills.ap_xisui === pillsBefore211 && s11.worlds.xiuxian.talentOwed === 0 &&
        !!toastTxt && /已尽/.test(String(toastTxt)) && residue(String(toastTxt)) === null,
      'T11 三次已尽再服丹：拒服、**余丹不变**、且给一句中文（不白吃丹、不打裸英文）',
      '余丹=' + s11.worlds.xiuxian.alchemy.pills.ap_xisui + ' owed=' + s11.worlds.xiuxian.talentOwed +
      ' toast=' + JSON.stringify(toastTxt));
  } else {
    T(false, 'T11 预算满再服丹被拒', '丹已不在架上（库存显示口径变了？）');
  }

  /* T12 入口置灰而非隐藏 */
  await openRole();
  const v12 = await page.evaluate(() => ({
    vis: !document.getElementById('mr-wash').classList.contains('hide'),
    dis: document.getElementById('mr-wash').disabled,
    txt: document.getElementById('mr-wash').textContent
  }));
  T(v12.vis && v12.dis && /0\/3/.test(v12.txt),
    'T12 本世三次已尽 ⇒ 入口仍在但置灰、计数 0/3（灰置而非隐藏：路要看得见）',
    '在位=' + v12.vis + ' 灰=' + v12.dis + ' 文=' + JSON.stringify(v12.txt));

  /* T13 全程零报错 + 角色浮层全文零残留 */
  const modalTxt = await page.evaluate(() => (document.querySelector('#modal-role .modal').innerText || '').replace(/\s+/g, ' '));
  T(errors.length === 0 && residue(modalTxt) === null,
    'T13 全程零 pageerror / 角色浮层零裸英文与未填占位',
    residue(modalTxt) || 'clean · errors=' + errors.length);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  console.log('UI_TALENTSWAP_' + (fail ? 'FAILED ' : 'ALL_GREEN ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
