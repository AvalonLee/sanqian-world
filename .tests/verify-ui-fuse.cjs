/* .tests/verify-ui-fuse.cjs — 融合坛悟道门槛文案 + 悟道石说明浮层 UI 走查
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-fuse.cjs
 *
 * 场景：复用 fixture-save.json，把境界抬到 5（融合坛门槛 realm ≥ 4）并给 3 枚悟道石
 *      → 功法页尾渲染融合坛 → 断言「闭关累计 X/Y 时辰（现实时间）」口径与 Y=12
 *      → 悟道石为可点入口（data-act="matWudao"）→ 点按弹浮层 → 校验物品介绍 + 获取来源
 *      → 关闭按钮 / 点遮罩均可关。
 * 该路径为纯只读浮层，无随机判定，确定性可复跑。
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
    w.realm = 5;                                   /* 融合坛门槛 realm ≥ 4 */
    w.materials = Object.assign({}, w.materials || {}, { mat_wudao: 3 });
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

  /* 进「法与器」页（融合坛在法段页尾）——页面整合批 2026-10-06：原「功法」「法器」两 Tab
   * 并为「法与器」一页（UI 卷 §3.4a），故本脚本点击标签由「功法」改「法与器」，融合坛断言
   * 容器 #tab-arts 不变（本就写在功法页尾）。 */
  await page.click('#m-tabbar button:has-text("法与器")');
  await page.waitForTimeout(400);

  /* ① 融合坛渲染 */
  const altarTxt = await page.$eval('#tab-arts', el => el.textContent);
  T(altarTxt.indexOf('融合坛') >= 0, '法与器页法段页尾渲染「融合坛」', 'has=' + (altarTxt.indexOf('融合坛') >= 0));

  /* ② 悟道门槛文案：{h}/{need} 时辰（现实时间），need=12 */
  const medTxt = await page.$eval('#tab-arts', el => {
    const m = el.textContent.match(/闭关累计\s*(\d+)\/(\d+)\s*时辰（现实时间）/);
    return m ? { h: +m[1], need: +m[2] } : null;
  });
  T(!!medTxt && medTxt.need === 12, '闭关门槛文案为「闭关累计 X/12 时辰（现实时间）」', JSON.stringify(medTxt));
  T(!!medTxt && medTxt.h === 0, '门槛计数取存档 meditate（本档为 0）', 'h=' + (medTxt && medTxt.h));
  const hasOldUnit = /\/\s*72\s*时辰/.test(altarTxt);
  T(!hasOldUnit, '旧口径「/72 时辰」零残留', 'old=' + hasOldUnit);

  /* ③ 悟道石为可点入口 */
  const stoneBtn = '[data-act="matWudao"]';
  T(await page.$(stoneBtn) !== null, '悟道石为可点入口（data-act="matWudao"）', stoneBtn);
  const stoneTxt = await page.$eval(stoneBtn, el => el.textContent.trim());
  T(/悟道石\s*×\s*3/.test(stoneTxt), '入口显示悟道石持有数（×3）', stoneTxt);

  /* ④ 点按弹浮层 */
  await page.click(stoneBtn);
  await page.waitForTimeout(250);
  const open = await page.$eval('#modal-matwudao', el => !el.classList.contains('hide'));
  T(open, '点按悟道石弹出说明浮层', 'open=' + open);
  const title = await page.$eval('#mwd-title', el => el.textContent.trim());
  T(title === '悟道石', '浮层标题为「悟道石」', title);
  const desc = await page.$eval('#mwd-desc', el => el.textContent);
  T(desc.indexOf('道韵') >= 0 && desc.indexOf('得谐丹') >= 0 && desc.indexOf('不可提炼') >= 0,
    '物品介绍含定位/用途/不可提炼', desc.slice(0, 40) + '…');
  const srct = await page.$eval('#mwd-srct', el => el.textContent.trim());
  T(srct === '获取来源', '来源小标题为「获取来源」', srct);
  const src = await page.$eval('#mwd-src', el => el.textContent);
  T(src.indexOf('历练') >= 0 && src.indexOf('10%') >= 0 && src.indexOf('不产出') >= 0,
    '来源正文含历练采集 / 10% 概率 / 闭关离线不产', src.slice(0, 46) + '…');

  /* ⑤ 关闭按钮可关 */
  await page.click('#mwd-close');
  await page.waitForTimeout(200);
  const closed = await page.$eval('#modal-matwudao', el => el.classList.contains('hide'));
  T(closed, '点「关闭」按钮收起浮层', 'closed=' + closed);

  /* ⑥ 点遮罩亦可关 */
  await page.click(stoneBtn);
  await page.waitForTimeout(200);
  await page.$eval('#modal-matwudao', el => el.click());
  await page.waitForTimeout(200);
  const closedByMask = await page.$eval('#modal-matwudao', el => el.classList.contains('hide'));
  T(closedByMask, '点遮罩收起浮层', 'closed=' + closedByMask);

  T(errors.length === 0, '零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_FUSE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_FUSE_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });