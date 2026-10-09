/* .tests/verify-ui-batch.cjs — 择选批六项需求 UI 走查（playwright-core + Edge headless）
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-batch.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8');
  /* 时间锚点刷新：复用旧档时 dt 过长会触发离线结算 → 出关呈报浮层挡住走查点击。
   * 注入前对齐 createdAt/lastSave 并清掉 lastOffline / pendingChoice，保证干净进场。 */
  const s0 = JSON.parse(save);
  const now0 = Date.now();
  s0.profile.createdAt = now0;
  Object.values(s0.worlds).forEach(w => { w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null; });
  /* 洞天设施规则走查：加一处「已持有但非当前驻留」福地（green_peak），
   * 用于验证非驻留福地不出现营建/扩建选项（只读展示等级与效果）。 */
  Object.values(s0.worlds).forEach(w => {
    if (!w.cave) return;
    w.cave.owned = Array.from(new Set((w.cave.owned || []).concat(['green_peak'])));
    w.cave.fac = w.cave.fac || {};
    w.cave.fac.green_peak = { lingtian: 1 };
  });
  const saveFresh = JSON.stringify(s0);
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, saveFresh);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(600);

  /* 需求 2：左侧菜单「秘境」改名「秘境洞天」 */
  const navTexts = await page.$$eval('#m-tabbar button', els => els.map(e => e.textContent.trim()));
  T(navTexts.includes('秘境洞天'), 'R2 菜单含「秘境洞天」入口', navTexts.join('/'));

  /* 需求 2：秘境洞天页 = 秘境节（卡片网格）+ 洞天福地节（当前驻留摘要 + 福地卡片） */
  await page.click('#m-tabbar button:has-text("秘境洞天")');
  await page.waitForTimeout(300);
  const caveTxt = await page.$eval('#tab-combat', el => el.textContent);
  const idxZone = caveTxt.indexOf('秘境'), idxCur = caveTxt.indexOf('当前驻留'), idxDex = caveTxt.indexOf('洞天福地');
  T(idxZone >= 0 && idxCur >= 0 && idxDex >= 0, 'R2 秘境洞天页两节齐全', 'zone=' + idxZone + ' cur=' + idxCur + ' dex=' + idxDex);
  T(idxZone >= 0 && idxCur > idxZone && idxDex > idxZone, 'R2 页面序 秘境 → 洞天福地', idxZone + '<' + idxCur + '/' + idxDex);
  const caveCards = await page.$$eval('#tab-combat .cavegrid > .cavecard', els => els.length);
  T(caveCards >= 6, 'R2 洞天福地卡片网格（≥6 卡）', 'n=' + caveCards);
  const facBtns = await page.$$eval('#tab-combat [data-act="caveBuild"]', els => els.length);
  T(facBtns > 0, 'R2 营建按钮存在', 'n=' + facBtns);
  /* 附属设施升级选项只属于当前驻留福地：hero 卡有按钮，非驻留已持有卡无按钮 + 只读提示 */
  const curBuild = await page.$$eval('#tab-combat .cavecard.hero [data-act="caveBuild"]', els => els.length);
  const curTxt = await page.$eval('#tab-combat .cavecard.hero', el => el.textContent);
  T(curBuild > 0 && curTxt.includes('生效中'), 'R2 当前驻留福地有营建选项', 'n=' + curBuild);
  const otherBuild = await page.$$eval('#tab-combat .cavecard[data-cave="green_peak"] [data-act="caveBuild"]', els => els.length);
  const otherTxt = await page.$eval('#tab-combat .cavecard[data-cave="green_peak"]', el => el.textContent);
  T(otherBuild === 0 && otherTxt.includes('仅驻留中可营建'), 'R2 非驻留福地不显示营建选项', 'n=' + otherBuild);
  /* 灵田材料说明由炼丹炼器页迁入附属设施（6 游戏月 · 1~4 枚本区材料） */
  T(otherTxt.includes('每 6 游戏月入账 1~4 枚本区材料'), 'R2 灵田材料说明迁入附属设施描述',
    otherTxt.slice(Math.max(0, otherTxt.indexOf('灵田')), otherTxt.indexOf('灵田') + 34));
  const enterBtns = await page.$$eval('#tab-combat [data-act="caveEnter"]', els => els.length);
  T(enterBtns > 0, 'R2 福地入驻/迁居按钮存在', 'n=' + enterBtns);

  /* 需求 1：财浮层底部 tier-1 印章文案不再出现 */
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(200);
  await page.click('[data-act="openLedger"]');
  await page.waitForTimeout(200);
  const seal = await page.$eval('#mlg-seal', el => el.textContent.trim());
  T(seal === '', 'R1 财浮层底部「白手起家」文案已去除', 'seal="' + seal + '"');
  await page.click('#mlg-close');

  /* 需求 6：道友页 道侣位提示文案 */
  await page.click('#m-tabbar button:has-text("道友")');
  await page.waitForTimeout(200);
  const spTip = await page.$eval('#tab-bonds .spouserow.none', el => el.textContent);
  T(spTip.includes('候选好感满档可结缘双修') && !spTip.includes('可提亲'), 'R6 道侣位文案改为「可结缘双修」', spTip.slice(0, 40));

  /* 需求 5：护法位点开择选浮层 */
  await page.click('#tab-bonds .guardline.pickable');
  await page.waitForTimeout(200);
  const gTitle = await page.$eval('#msp-title', el => el.textContent);
  T(gTitle.includes('择'), 'R5 护法位点开择选浮层', 'title=' + gTitle);
  const gRows = await page.$$eval('#msp-body .lrow', els => els.length);
  const gNames = await page.$eval('#msp-body', el => el.textContent);
  T(gRows >= 3, 'R5 候选列表含恢复自动 + 3 位已结缘者', 'rows=' + gRows);
  T(!gNames.includes('候选') || !gNames.includes('？'), 'R5 未结缘者不显示');
  /* 点选「谢」出任护法（tier2 → bonus 应为 0）*/
  const before = await page.$eval('#tab-bonds .guardline', el => el.textContent);
  await page.click('#msp-body [data-act="guardSet"][data-v="xie"]');
  await page.waitForTimeout(500);
  const after = await page.$eval('#tab-bonds .guardline', el => el.textContent);
  T(after.includes('谢'), 'R5 点选后护法位换人', '"' + before.slice(0, 18) + '" → "' + after.slice(0, 18) + '"');
  const pickPersist = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    return s.worlds.xiuxian.guardianPick;
  });
  T(pickPersist === 'xie', 'R5 guardianPick 随档持久化', 'pick=' + pickPersist);

  /* 需求 5：道侣位点开择选浮层（suwan 满档 100 → 应在列；不满足者不显示）*/
  await page.click('#tab-bonds .spouserow.pickable');
  await page.waitForTimeout(200);
  const sTitle = await page.$eval('#msp-title', el => el.textContent);
  const sBody = await page.$eval('#msp-body', el => el.textContent);
  T(sTitle.includes('道'), 'R5 道侣位点开择选浮层', 'title=' + sTitle);
  T(sBody.includes('苏晚') && sBody.includes('提亲'), 'R5 满档候选在列且可提亲', sBody.slice(0, 30));
  T(!sBody.includes('谢青鸾'), 'R5 未满档候选不显示');
  await page.click('#msp-body [data-act="spousePickPropose"]');
  await page.waitForTimeout(300);
  const proposeShown = await page.$eval('#modal-propose', el => !el.classList.contains('hide'));
  T(proposeShown, 'R5 点候选进入提亲 CONFIRM（复用既有三形态）');
  await page.click('#mpr-no');

  /* 需求 4：道友页点解锁卡片 → 弹出详情浮层 */
  const cardVisibleBefore = await page.$eval('#modal-bonds', el => el.classList.contains('hide'));
  await page.click('#tab-bonds .pal[data-act="bondOpen"]');
  await page.waitForTimeout(300);
  const modalShown = await page.$eval('#modal-bonds', el => !el.classList.contains('hide'));
  const hasDetail = await page.$eval('#mbd-body .bd-head', el => !!el);
  T(modalShown && hasDetail, 'R4 点卡片弹出详情叠加层', 'wasHidden=' + cardVisibleBefore + ' detail=' + hasDetail);
  /* 浮层走查修复：跨至少一次秒级 tick，背后道友页必须保持名录、浮层保持详情 */
  await page.waitForTimeout(1600);
  const tabStillRoster = await page.$eval('#tab-bonds', el => !!el.querySelector('.palgrid'));
  const modalStillDetail = await page.$eval('#mbd-body .bd-head', el => !!el);
  T(tabStillRoster && modalStillDetail, 'R4+ 秒级 tick 后背后道友页保持名录不跟跳', 'roster=' + tabStillRoster + ' detail=' + modalStillDetail);
  /* 浮层内返回名录 → 浮层回列表，道友页不受影响 */
  await page.click('#mbd-title');
  await page.waitForTimeout(200);
  const backRoster = await page.$eval('#mbd-body', el => !!el.querySelector('.palgrid'));
  T(backRoster, 'R4+ 浮层内「返回名录」回到列表');
  await page.click('#mbd-close');
  await page.waitForTimeout(300);
  const tabRestored = await page.$eval('#tab-bonds .palgrid', el => !!el);
  T(tabRestored, 'R4 关闭浮层后道友页名录还原');

  /* 需求 3：势力页加入按钮置灰（先加入一个）*/
  await page.click('#m-tabbar button:has-text("势力")');
  await page.waitForTimeout(300);
  /* 势力页按钮每秒随 tick 重渲染：裸 ElementHandle.click 会在重渲染瞬间脱挂且不自动重试，
   * 改用 Locator（.first()）——重解析+重试，规避 elementHandle.click「not attached」抖动。 */
  const joinSel = '[data-act="joinFaction"]:not([disabled])';
  const joinCount = await page.locator(joinSel).count();
  T(joinCount > 0, 'R3 未加入时可加入', 'enabled=' + joinCount);
  await page.locator(joinSel).first().click();
  await page.waitForTimeout(300);
  await page.click('#cf-ok');   /* CONFIRM */
  await page.waitForTimeout(600);
  const en = await page.$$eval('[data-act="joinFaction"]:not([disabled])', els => els.length);
  const dis = await page.$$eval('[data-act="joinFaction"][disabled]', els => els.length);
  T(en === 0 && dis > 0, 'R3 加入后其余势力按钮全部置灰', 'enabled=' + en + ' disabled=' + dis);

  /* 地柱跳转回归：openCave → 切到「秘境洞天」页并落到洞天节（原浮层已内联本页）*/
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(200);
  await page.click('[data-act="openCave"]');
  await page.waitForTimeout(400);
  const caveJump = await page.evaluate(() => {
    const panel = document.querySelector('#tab-combat');
    const sec = document.querySelector('#tab-combat #cave-sec');
    return { onCombat: !!panel && !panel.classList.contains('hide'), hasSec: !!sec };
  });
  T(caveJump.onCombat && caveJump.hasSec, '回归 地柱 → 跳「秘境洞天」页洞天节', JSON.stringify(caveJump));
  const caveEnterDis = await page.$$eval('#tab-combat [data-act="caveEnter"][disabled]', els => els.length);
  console.log('INFO 秘境洞天页置灰入驻按钮数（资格/冷却所致）=', caveEnterDis);

  T(errors.length === 0, '零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_VERIFY_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_VERIFY_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });