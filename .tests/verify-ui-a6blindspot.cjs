/* .tests/verify-ui-a6blindspot.cjs — A6 假阳四键的**屏上**消费实证（playwright-core + Edge headless）
 * 目标：证明 creation.talent.lockTitle / lockText / lockSummary / creation.world.noPick
 *   四条被 audit A6 判成孤儿的键其实有渲染点——它们经**别名取词口** `tc(k)`（view:1408
 *   `function tc(k, v) { return SQ.t(k, v, draft.worldId); }`）上屏，而 A6 的 re2 字符类
 *   `[a-z0-9_]` 不收大写字母 ⇒ camelCase 尾段整条失配（最小修法见 .tests/probe-a6regex.cjs）。
 * 用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-a6blindspot.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  /* 无存档启动 = 停在创角三步流程（正是这四条键的承载面） */
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector("#sc-c1:not(.hide)", { timeout: 15000 });
  await page.waitForTimeout(400);

  const pair = await page.evaluate(() => {
    const g = (id) => (document.getElementById(id) || {}).textContent || '';
    return {
      lex: window.SQ.LEX.xiuxian,
      mk: { title: g('mk-title'), text: g('mk-text'), sum: g('mk-sumlabel') },
      want: {
        lockTitle: window.SQ.t('creation.talent.lockTitle'),
        lockText: window.SQ.t('creation.talent.lockText'),
        lockSummary: window.SQ.t('creation.talent.lockSummary')
      },
      errHidden: document.getElementById('c3-err').classList.contains('hide')
    };
  });
  T(pair.mk.title === pair.want.lockTitle && pair.mk.title.length > 0,
    'B1 mk-title 屏上文本 = creation.talent.lockTitle（词表值经 tc() 落地）', JSON.stringify(pair.mk.title));
  T(pair.mk.text === pair.want.lockText && pair.mk.text.length > 0,
    'B2 mk-text 屏上文本 = creation.talent.lockText', JSON.stringify(pair.mk.text));
  T(pair.mk.sum === pair.want.lockSummary && pair.mk.sum.length > 0,
    'B3 mk-sumlabel 屏上文本 = creation.talent.lockSummary', JSON.stringify(pair.mk.sum));
  T(/[\u4e00-\u9fff]/.test(pair.mk.title + pair.mk.text + pair.mk.sum),
    'B4 三条均为中文文案（不是裸键名回显 = 取词成功）');

  /* 起名 → 择界 → 不选界直接点「投生」→ c3-err 必须显 noPick 文案 */
  await page.fill('#c1-name', '链通验证');
  await page.click('#c1-next');
  await page.waitForSelector('#sc-c3:not(.hide)', { timeout: 8000 });
  await page.waitForTimeout(300);
  const before = await page.evaluate(() => ({
    hidden: document.getElementById('c3-err').classList.contains('hide'),
    txt: document.getElementById('c3-err').textContent
  }));
  await page.click('#c3-go');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    hidden: document.getElementById('c3-err').classList.contains('hide'),
    txt: document.getElementById('c3-err').textContent,
    want: window.SQ.t('creation.world.noPick')
  }));
  T(before.hidden || after.hidden === false, 'B5 未择界时 c3-err 初始为隐藏态（确有状态翻转）',
    JSON.stringify(before) + ' → ' + JSON.stringify({ hidden: after.hidden }));
  T(after.hidden === false && after.txt === after.want && after.txt.length > 0,
    'B6 c3-err 点「投生」后显 creation.world.noPick（第四键消费点实证）', JSON.stringify(after.txt));
  T(/[\u4e00-\u9fff]/.test(after.txt), 'B7 该行为中文文案而非裸键名', after.txt);
  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 120) || 'clean');

  console.log(fail === 0 ? 'UI_A6BLINDSPOT_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_A6BLINDSPOT_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
