/* .tests/verify-ui-settings.cjs — 设置页界面走查（N82/A3 · 第册一百三十九批 2026-10-23）
 * 依赖：playwright-core（`npm install --no-save --registry=https://registry.npmmirror.com playwright-core`）+ 系统 Edge
 * 用法：node .tests/verify-ui-settings.cjs
 *
 * 立篇因由：设置页渲染器本批从 `view/index.html` 整段外置到 `view/settings.js`（桥 `c.` 取数），而**此前无专篇**——
 *   勘察档 §五 R3 的纪律是「搬一个没有走查网的页 = 只靠静态关兜底」，故同批补本篇。
 * 覆盖：进页 → 三段结构 → 存档段身份三源同源 → 两枚危险动作锚点 → 三枚开关 aria 与盘上同源 →
 *      奇遇倾向块随开关生灭 → 三个开关真点真落盘且重渲后 aria 跟得上 → 清增益走确认框（取消即零副作用）→
 *      零报错 + 面板零裸英文。
 * 边界：引擎侧写入（setAutoTrib / setAutoEvent / setGearRefine / setEventPref）由冒烟守；本篇只守「屏上点得通、
 *      数对得上、渲染搬走之后动作没断线」。开关判据一律读**盘上真值**（localStorage），不读页面对象。
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

  /* ── 建场档：设置两开关钉死在「关」，世界/境界从 fixture 现取（不写字面量）── */
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now0 = Date.now();
  s0.profile.createdAt = now0;
  s0.settings = Object.assign({}, s0.settings, { autoTrib: false, autoEvent: false, eventPref: 'none' });
  Object.values(s0.worlds).forEach(w => { w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null; });
  const w0 = s0.worlds.xiuxian;
  w0.gearAutoRefine = true;           /* 第三枚开关：缺省开 = 旧行为，这里显式落一个真值 */
  w0.buffs = w0.buffs || {}; w0.buffs.x = { until: now0 + 3600000 };
  const expectWho = s0.profile.name, expectWorld = s0.profile.worldName;
  const expectRealm = SQ.t('realm.' + w0.realm, null, 'xiuxian');
  const buffsBefore = JSON.stringify(w0.buffs);

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
  const panel = () => page.evaluate(() => {
    const p = document.getElementById('tab-settings');
    return {
      vis: !p.classList.contains('hide'),
      secheads: [...p.querySelectorAll('.sechead .t')].map(e => e.textContent),
      dd: [...p.querySelectorAll('.dd')].map(e => e.textContent),
      switches: [...p.querySelectorAll('.switch')].map(e => ({
        act: e.dataset.act, on: e.classList.contains('on'), aria: e.getAttribute('aria-checked')
      })),
      chips: [...p.querySelectorAll('[data-act="setEventPref"]')].map(e => ({
        v: e.dataset.v, on: e.classList.contains('on')
      })),
      danger: [...p.querySelectorAll('[data-act="clearBuffs"],[data-act="resetSave"]')].map(e => e.dataset.act),
      text: p.innerText.replace(/\s+/g, ' ')
    };
  });

  await page.goto(url);
  await page.waitForSelector('.topline.name', { timeout: 20000 });

  /* ── S0 建场档生效 ── */
  const s00 = await readState();
  T(s00.settings.autoTrib === false && s00.settings.autoEvent === false &&
    s00.worlds.xiuxian.gearAutoRefine === true,
    'S0 建场档生效：三枚开关初值 = 关 / 关 / 开（读盘上真值）',
    'autoTrib=' + s00.settings.autoTrib + ' autoEvent=' + s00.settings.autoEvent + ' gearAutoRefine=' + s00.worlds.xiuxian.gearAutoRefine);

  /* ── S1 进设置页 + 三段结构（存档 / 自动 / 关于）── */
  await page.click('#m-tabbar button[data-v="settings"]');
  const p1 = await poll(async () => {
    const v = await panel();
    return v.vis && v.secheads.length ? v : false;
  });
  T(!!p1 && p1.secheads.length === 3,
    'S1 设置页可进且三段齐全（存档 / 自动 / 关于）',
    p1 ? '段标=' + p1.secheads.join(' / ') : '面板未出现');

  /* ── S2 存档段身份行三源同源（道名 / 世界 / 境界）── */
  const ddText = (p1 ? p1.dd : []).join(' ¶ ');
  T(ddText.indexOf(expectWho) >= 0 && ddText.indexOf(expectWorld) >= 0 && ddText.indexOf(expectRealm) >= 0,
    'S2 存档段身份行与盘上三源同源（道名 · 世界 · 境界）且无残留',
    '期望=' + [expectWho, expectWorld, expectRealm].join(' · ') + ' ‖ 实得=' + JSON.stringify(ddText.slice(0, 90)));

  /* ── S3 两枚危险动作锚点在位（清增益 / 重置）── */
  T(!!p1 && p1.danger.indexOf('clearBuffs') >= 0 && p1.danger.indexOf('resetSave') >= 0,
    'S3 危险动作两枚锚点在位（清增益 / 重置存档）',
    '锚点=' + (p1 ? p1.danger.join(',') : '—'));

  /* ── S4 三枚开关 aria 与盘上同源（关 / 关 / 开）── */
  const sw4 = p1 ? p1.switches : [];
  const byAct = {};
  sw4.forEach(x => { byAct[x.act] = x; });
  T(sw4.length === 3 && byAct.toggleAutoTrib && byAct.toggleAutoEvent && byAct.toggleGearRefine &&
    byAct.toggleAutoTrib.aria === 'false' && byAct.toggleAutoEvent.aria === 'false' &&
    byAct.toggleGearRefine.aria === 'true',
    'S4 三枚开关在位且 aria-checked 与盘上同源（false / false / true）',
    sw4.map(x => x.act + '=' + x.aria).join(' '));

  /* ── S5 自动奇遇关 ⇒ 奇遇倾向四 chips 不渲染（条件块随开关生灭）── */
  T(!!p1 && p1.chips.length === 0,
    'S5 自动奇遇关 ⇒ 奇遇倾向块整块不渲染（不给无效选项）',
    'chips=' + (p1 ? p1.chips.length : '—'));

  /* ── S6 点第一枚开关 ⇒ 盘上翻真 + 重渲后 aria 跟上（渲染搬走后动作仍通）── */
  await page.click('#tab-settings .switch[data-act="toggleAutoTrib"]');
  const s6 = await poll(async () => {
    const st = await readState();
    if (st.settings.autoTrib !== true) return false;
    const v = await panel();
    const hit = v.switches.filter(x => x.act === 'toggleAutoTrib')[0];
    return hit && hit.aria === 'true' && hit.on ? v : false;
  });
  T(!!s6, 'S6 点自动渡劫开关：盘上 settings.autoTrib 翻真，重渲后 aria-checked 与 .on 同步跟上',
    '屏上=' + (s6 ? 'aria=true' : '未跟上'));

  /* ── S7 开自动奇遇 ⇒ 四 chips 出现且当前倾向（none）恰高亮一枚 ── */
  await page.click('#tab-settings .switch[data-act="toggleAutoEvent"]');
  const p7 = await poll(async () => {
    const st = await readState();
    if (st.settings.autoEvent !== true) return false;
    const v = await panel();
    return v.chips.length === 4 ? v : false;
  });
  const lit7 = p7 ? p7.chips.filter(x => x.on).map(x => x.v) : [];
  T(!!p7 && lit7.length === 1 && lit7[0] === 'none',
    'S7 开自动奇遇：四枚倾向 chips 齐，当前倾向 none 恰高亮一枚（不虚亮、不多亮）',
    p7 ? 'chips=' + p7.chips.map(x => x.v + (x.on ? '*' : '')).join(',') : '未展开');

  /* ── S8 点「魔道」 ⇒ 盘上 eventPref 落 evil + 高亮跟过去（只亮一枚）── */
  await page.click('#tab-settings .chips [data-act="setEventPref"][data-v="evil"]');
  const p8 = await poll(async () => {
    const st = await readState();
    if (!st.settings || st.settings.eventPref !== 'evil') return false;
    const v = await panel();
    const lit = v.chips.filter(x => x.on).map(x => x.v);
    return lit.length === 1 && lit[0] === 'evil' ? v : false;
  });
  T(!!p8, 'S8 点「魔道」倾向：盘上 settings.eventPref=evil 且高亮唯一位于 evil',
    p8 ? 'ok' : '盘上或高亮未跟');

  /* ── S9 清增益走确认框，取消 ⇒ 盘上 buffs 一字未动（危险动作仍由核内受理）── */
  await page.click('#tab-settings [data-act="clearBuffs"]');
  const cfOpen = await poll(() => page.$('#modal-confirm:not(.hide)'), 5000);
  await page.click('#cf-cancel');
  await poll(() => page.$('#modal-confirm.hide'), 5000);
  const s9 = await readState();
  T(!!cfOpen && JSON.stringify(s9.worlds.xiuxian.buffs) === buffsBefore,
    'S9 清增益：确认框正常浮出，点取消后盘上增益一字未动（先问后动、取消零副作用）',
    '框=' + !!cfOpen + ' buffs不变=' + (JSON.stringify(s9.worlds.xiuxian.buffs) === buffsBefore));

  /* ── S10 零报错 + 设置页全文零裸英文/未填占位 ── */
  const p10 = await panel();
  T(errors.length === 0 && residue(p10.text) === null,
    'S10 全程零 pageerror / console error，设置页全文零裸 key 与未填占位',
    residue(p10.text) || 'clean · errors=' + errors.length);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  console.log('UI_SETTINGS_' + (fail ? 'FAILED ' : 'ALL_GREEN ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
