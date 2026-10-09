/* .tests/verify-ui-savelevel.cjs — 存档水位读数条 UI 走查（2026-10-09 存档水位批立 · 第廿六篇）
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-savelevel.cjs
 *
 * 场景：真存档件（fixture-save.json）→ 浏览器直开 view/index.html（**无桥分支** ⇒ codec 应读作 preview）
 *      → 进「设置」页 → 读水位块。
 * 存在的理由：水位条是「主档与游玩时长解耦」这件事**唯一**的玩家可见面（治理批之后一直没有），
 *   走查不能只看「有渲染」，必须把**视图显示的数**与**引擎/盘上的数**对表——
 *   否则读数与真值各说各话，恰是水位条最坏的失效形态（看着一切正常，数字是假的）。
 * 判据：① 标题与四行齐（主档 / 侧档 / 有损级 / 落盘分支）② 无 key 回落、无占位符残留
 *   ③ 视图里 `SQ.SaveStats.get().mainBytes` 与 `localStorage` 里那份落盘值的 UTF-8 字节数相等
 *   ④ 页面显示的 KB 数 === 该字节数换算（toFixed(2)），单位不是随手写的字符串
 *   ⑤ 有损级那一行在未触发的常态档上必须读作「未动用」⑥ 分支文案在读不动也走不通的
 *   file:// 环境里读作「明文（预览）」⑦ 零 pageerror。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const s0 = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const now0 = Date.now();
  s0.profile.createdAt = now0;
  Object.values(s0.worlds).forEach(w => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
  });
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(s0));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.click('#m-tabbar button:has-text("设置")');
  await page.waitForTimeout(400);

  const txt = await page.$eval('#tab-settings', el => el.textContent);
  /* ① 标题与四行 */
  T(txt.indexOf('存档水位') >= 0, '① 设置页渲染「存档水位」小节标题');
  T(/主档\s*[\d.]+\s*KB/.test(txt), '② 主档行带 KB 读数', (txt.match(/主档[^\n]{0,60}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 60));
  T(/触发线\s*[\d.]+\s*KB/.test(txt) && /上限\s*[\d.]+\s*KB/.test(txt), '③ 触发线与上限同时给出（水位条要能读出余量坐标）');
  T(/余量\s*\d+(\.\d+)?%/.test(txt), '④ 余量百分比渲染', (txt.match(/余量\s*\d+(\.\d+)?%/) || [''])[0]);
  T(/侧档\s*[\d.]+\s*KB/.test(txt) && /日志预算/.test(txt) && /叙事流预算/.test(txt), '⑤ 侧档行 + 两族预算渲染', (txt.match(/侧档[^\n]{0,70}/) || [''])[0].replace(/\s+/g, ' ').slice(0, 70));
  T(txt.indexOf('本轮未动用有损级') >= 0, '⑥ 有损级行读作「未动用」（常态档上引擎确实没降级）');
  T(txt.indexOf('明文（浏览器直开预览）') >= 0, '⑦ 落盘分支读作预览（file:// 无桥 ⇒ 与压缩分支区分开）');
  T(txt.indexOf('不写进存档') >= 0, '⑧ 交底行在位（水位只在内存统计，避免被读成「存档里多了字段」）');
  /* ② 回落与残留 */
  T(txt.indexOf('settings.save.level') < 0, '⑨ 无 key 回落（词表缺键会直接把键名打上屏）');
  T(!/\{(size|pct|trigger|red|log|feed|logs|feeds|n|list)\}/.test(txt), '⑩ 无占位符残留');
  /* ③④ 与引擎/盘上同源对表（本条是这篇走查的实质，其余是渲染面） */
  const truth = await page.evaluate(() => {
    var raw = localStorage.getItem('sanqian-state-v1') || '';
    var bytes = new TextEncoder().encode(raw).length;
    var st = window.SQ && window.SQ.SaveStats ? window.SQ.SaveStats.get() : null;
    return { bytes: bytes, st: st };
  });
  T(!!truth.st && truth.st.mainBytes === truth.bytes,
    '⑪ 视图读数 === 盘上那份值的 UTF-8 字节数（同源，不是视图自己估的）',
    '报=' + (truth.st && truth.st.mainBytes) + ' 真=' + truth.bytes);
  const kbShown = (txt.match(/主档\s*([\d.]+)\s*KB/) || [])[1];
  T(kbShown === (truth.bytes / 1024).toFixed(2),
    '⑫ 页面显示的 KB === 字节数换算（单位口径一致）', '显示=' + kbShown + ' 期望=' + (truth.bytes / 1024).toFixed(2));
  T(errors.length === 0, '⑬ 零 pageerror / console error', errors.slice(0, 2).join(' | '));

  await browser.close();
  console.log(fail === 0 ? 'UI_SAVELEVEL_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_SAVELEVEL_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.log('UI_SAVELEVEL_CRASH ' + (e && e.stack || e)); process.exit(2); });
