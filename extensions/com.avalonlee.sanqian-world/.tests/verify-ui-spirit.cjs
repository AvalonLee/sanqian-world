/* .tests/verify-ui-spirit.cjs — 器灵面板 UI 走查（第册五十八批 · N34 第二十刀 · D15 阶段 A1）
 * 依赖：playwright-core（需先安装）；用法：node .tests/verify-ui-spirit.cjs
 *
 * 背景：器灵面板从 `view/index.html` 整片搬到 `view/spirit.js`（法宝页尾，原走桥键 `spiritPanel`）。
 *   搬动本身不该改行为，但「件搬走了、调用点没接上」正是本仓第 N 次踩过的形状 ⇒ 本篇锁四件事：
 *   ① 无祭出法宝时面板不出现（空集不渲染，不造假标题）；
 *   ② 已祭出未觉醒 → 灰态 + 温养进度（w/need），且没有发动按钮；
 *   ③ 已觉醒 → 人格名 + 器灵技名/描述 + 可发动按钮；
 *   ④ 冷却中 → 按钮 disabled + 「冷却中」文案。
 *
 * 场景：realm 9 解锁法宝页；h03（良品·需求 450）预置进 `treasures.owned` 并放进槽位。
 *   器灵态用 `st.spirit` 直接预置（觉醒链路归融合系统侧，不在本篇射程）。确定性，无随机。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');

  const buildSave = (spirit) => {
    const s = JSON.parse(JSON.stringify(base));
    const now = Date.now();
    s.settings = Object.assign({}, s.settings, { autoTrib: false });
    s.profile.createdAt = now;
    Object.values(s.worlds).forEach(w => {
      w.realm = 9;                       /* 法宝页门槛 realm ≥ 3 */
      w.lastSave = now; w.lastOffline = null; w.pendingChoice = null;
      w.treasures = {
        owned: spirit ? [{ id: 'h03', lv: 1, st: { spirit: spirit } }] : [],
        slots: spirit ? ['h03', null, null] : [null, null, null],
        fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0
      };
    });
    return s;
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };

  const open = async (save) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(save));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.click('#m-tabbar button:has-text("法宝")');
    await page.waitForTimeout(300);
    return { ctx, page, errors };
  };

  const panelText = (page) => page.$eval('#tab-treasure', el => el.textContent);

  /* ① 无祭出法宝：面板不出现 */
  {
    const { ctx, page, errors } = await open(buildSave(null));
    const txt = await panelText(page);
    T(txt.indexOf('器灵') < 0, 'A 无祭出法宝时不渲染器灵面板', 'has=' + (txt.indexOf('器灵') >= 0));
    T(await page.$('[data-act="spiritSkill"]') === null, 'A 无器灵时不出现发动按钮');
    T(errors.length === 0, 'A 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ② 已祭出未觉醒：灰态 + 温养进度，无发动按钮 */
  {
    const { ctx, page, errors } = await open(buildSave({ w: 100, a: 0, p: null, cd: 0, mk: 0, hun: 0, vt: {} }));
    const txt = await panelText(page);
    T(txt.indexOf('器灵') >= 0, 'B 面板出现（搬片后调用点已接上）', txt.slice(0, 30) + '…');
    T(txt.indexOf('器灵未醒') >= 0, 'B 未觉醒显示「器灵未醒」');
    T(/温养\s*100\s*\/\s*450/.test(txt), 'B 温养进度取存档 w/need（100/450）', (txt.match(/温养[^<]{0,20}/) || [''])[0]);
    T(await page.$('[data-act="spiritSkill"]') === null, 'B 未觉醒不给发动按钮');
    T(errors.length === 0, 'B 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ③ 已觉醒：人格 + 器灵技 + 可发动 */
  {
    const { ctx, page, errors } = await open(buildSave({ w: 450, a: 1, p: 'jian', cd: 0, mk: 0, hun: 0, vt: {} }));
    const txt = await panelText(page);
    T(txt.indexOf('器灵技') >= 0, 'C 已觉醒显示器灵技');
    T(txt.indexOf('剑意') >= 0 && txt.indexOf('战力 +8%') >= 0, 'C 技能名与描述取自词表（剑意 / 战力 +8%）');
    const btn = await page.$('[data-act="spiritSkill"]');
    T(btn !== null, 'C 出现发动按钮');
    T(btn !== null && (await btn.getAttribute('disabled')) === null, 'C 无冷却时按钮可点');
    T(btn !== null && (await btn.getAttribute('data-v')) === 'h03', 'C 按钮 data-v = 法宝件 id（h03）');
    T(errors.length === 0, 'C 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ④ 冷却中：按钮禁用 + 冷却文案 */
  {
    const { ctx, page, errors } = await open(buildSave({ w: 450, a: 1, p: 'jian', cd: Date.now(), mk: 0, hun: 0, vt: {} }));
    const txt = await panelText(page);
    const btn = await page.$('[data-act="spiritSkill"]');
    T(txt.indexOf('冷却中') >= 0, 'D 冷却中显示冷却文案');
    T(btn !== null && (await btn.getAttribute('disabled')) !== null, 'D 冷却中按钮 disabled');
    T(errors.length === 0, 'D 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  await browser.close();
  console.log('\nSPIRIT_ALL_GREEN ' + pass + '/' + (pass + fail));
  if (fail) process.exit(1);
})();
