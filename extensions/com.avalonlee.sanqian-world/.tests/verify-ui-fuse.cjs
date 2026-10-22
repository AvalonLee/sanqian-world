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
    if (w.artsKnown) {   /* 父母候选 = 槽内 Lv≥9 者（issue #5 的打字用例要真有两名候选，不是空过）*/
      w.artsSlots = ['tuna', 'juling'];
      w.artsLevels = { tuna: 9, juling: 9 };
    }
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
  await page.click('#m-tabbar button[data-v="arts"]');
  await page.waitForTimeout(400);

  /* ① 融合坛渲染 */
  const altarTxt = await page.$eval('#tab-arts', el => el.textContent);
  T(altarTxt.indexOf('融合坛') >= 0, '功法页页尾渲染「融合坛」', 'has=' + (altarTxt.indexOf('融合坛') >= 0));

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

  /* ⑦ 自定义名输入框打得进字（GitHub issue #5 · 用户报「点击后很快丢失焦点、无法输入文字」）
   * 病灶 = 秒级 tick 的 renderAll 把 #tab-arts 整块重建 ⇒ 正在打字的 <input> 换新节点。
   * 反证口径：不打闸时这两条必红（焦点被抢 + 字被抹），跨两个 tick 才测得出来。 */
  const parents = await page.$$eval('#tab-arts [data-act="fusePick"]', els => els.map(e => e.dataset.v));
  T(parents.length >= 2, '融合坛父母候选 ≥2（下面两条的前置，防空过护栏）', 'n=' + parents.length);
  await page.click('#tab-arts [data-act="fusePick"][data-v="' + parents[0] + '"]');
  await page.click('#tab-arts [data-act="fusePick"][data-v="' + parents[1] + '"]');
  await page.waitForTimeout(300);
  await page.focus('.fusename');
  await page.type('.fusename', '测试剑意');
  await page.waitForTimeout(2600);                     /* 跨过至少两个秒级 tick */
  const typed = await page.evaluate(() => {
    const el = document.querySelector('.fusename');
    return { has: !!el, focused: !!el && document.activeElement === el, val: el ? el.value : null };
  });
  T(typed.has && typed.focused === true, '打完字跨两个 tick 后焦点仍在自定义名框内（issue #5）', JSON.stringify(typed));
  T(typed.val === '测试剑意', '自定义名不被 tick 抹掉（值同时进 ui.fuseName 单源）', 'val=' + typed.val);
  /* ⑧ 切标签把整段重渲染一遍（动作类重建，不是 tick）⇒ 打的字必须从 ui.fuseName 回填。
   * 去掉 input 监听 / value 回填任一半，这条就红（⑦ 只证焦点那半）。 */
  await page.click('#m-tabbar button[data-v="gear"]');
  await page.waitForTimeout(300);
  await page.click('#m-tabbar button[data-v="arts"]');
  await page.waitForTimeout(300);
  const backAgain = await page.evaluate(() => {
    const el = document.querySelector('.fusename');
    return el ? el.value : null;
  });
  T(backAgain === '测试剑意', '切走再切回（整段重建）后自定义名照旧回填', 'val=' + backAgain);

  /* ⑨ 确认框里的冷却时长必须取表（第册一百一十五批：融合 CD 由 3 现实天改 2 现实小时，
   * 那句原话写死「成败均记 3 日冷却」⇒ 改表不改话就是谎数，与 M34「开席文案的分钟数取表值」同族）。
   * 反证形：把文案改回写死的「3 日」或将调用侧的 cd 撤掉 ⇒ 这两判必红（'2时' 不在句内 / 花括号漏上屏）。 */
  await page.click('#tab-arts [data-act="fuseStart"]');
  await page.waitForTimeout(300);
  const cdFuse = await page.evaluate(() => {
    const D = SQ.XDATA;
    return { h: Math.floor(D.FUSE.CD_MS / 3600000), txt: (document.getElementById('cf-text') || {}).textContent || '' };
  });
  T(cdFuse.txt.indexOf(cdFuse.h + '时') >= 0 && cdFuse.txt.indexOf('日') < 0,
    '融合确认框的冷却时长取自 FUSE.CD_MS（旧写死的「3 日」不得再上屏）', 'h=' + cdFuse.h + ' 句=' + cdFuse.txt.replace(/\s+/g, ' ').slice(0, 70));
  T(cdFuse.txt.indexOf('{') < 0, '冷却句的参数真被替换（不许把 {cd} 裸上屏）', cdFuse.txt.slice(0, 40));
  await page.click('#cf-cancel');
  await page.waitForTimeout(250);

  T(errors.length === 0, '零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_FUSE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_FUSE_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });