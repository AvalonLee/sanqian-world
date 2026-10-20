/* .tests/verify-ui-karma.cjs — 善恶名号九段 UI 走查（playwright-core + Edge headless）
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-karma.cjs
 *
 * 覆盖「九段名号」四处呈现：
 *   ① 顶栏第一行：元信息（角色名称 · 境界 · 势力，点按开角色浮层）；第二行最左：名号徽章（按档位着色，兼善恶浮层入口）；原第二行档位徽章（#m-karma）已撤；
 *   ② 世界名水印（方案 B3 · 右上竖排落款）：世界名移作 #m-wm 半透明竖排大字，位于面板底色与文字层之间（absolute 贴右上 / 20px / 800 / opacity .30 / writing-mode vertical-rl / 面板裁切 / 不拦点击）；v4 位置互换后第一行不再重复世界名（改显角色名称）；
 *   ③ 善恶浮层：九段天梯全列（九行）、当前段高亮、区间标注由 KARMA_RANKS 下界推导；
 *   ④ 跨段演出：karma 跨段瞬间弹全屏「名号更迭」，点按或 3.2s 自动收；
 *   ⑤ 日志入档：跨段写 'karma' 分类（日志页「善恶」筛选可见起讫双名号）；
 *   ⑥ 零页错误。
 * 场景确定性：alignBias=neutral（零漂移）、artsSlots 空 / gear 空 ⇒ karma = karmaEventScore，
 *            故直接改 karmaEventScore 即可精确落到目标段（100→左道散人 / 250→持正之士 / -450→凶名邪修）。
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
  const WNAME = s0.profile.worldName;   /* 世界名（v4 位置互换后由 #m-wm 水印承载） */
  const CNAME = s0.profile.name;        /* 角色名称（v4 位置互换后顶栏第一行正文） */
  s0.profile.createdAt = now0;
  Object.values(s0.worlds).forEach(w => {
    w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null;
  });
  /* 场景构造：零漂移（中性倾向）+ 无功法槽/无装备 ⇒ karma 精确等于 karmaEventScore；
     起点 100 → 左道散人（基线），随后跨段到正道、魔道各验一次 */
  const w0 = s0.worlds[wid];
  w0.karmaEventScore = 100;
  w0.karma = 100;
  w0.alignDrift = 0;
  w0.artsSlots = [];
  w0.gear = { weapon: null, treasure: null, armor: null, accessory: null };
  w0.factionId = 'yanue';    /* 已入势力：验证顶栏「角色名称·境界·势力」过长时不溢出（宽屏左栏仅 264px） */
  w0.log = [];
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

  const chipInfo = () => page.evaluate(() => {
    const el = document.getElementById('m-rank');
    return el ? { text: (el.textContent || '').trim(), cls: el.className } : null;
  });
  const stageInfo = () => page.evaluate(() => {
    const st = document.getElementById('rank-stage');
    if (!st || st.classList.contains('hide')) return { open: false };
    return {
      open: true,
      cls: st.className,
      t2: (document.getElementById('rank-t2') || {}).textContent || '',
      t2cls: (document.getElementById('rank-t2') || {}).className || ''
    };
  });
  /* 轮询等演出出现（tick 1s 才触发 afterClaim，故给 ~2.6s 窗口） */
  async function waitStage(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const s = await stageInfo();
      if (s.open) return s;
      await page.waitForTimeout(120);
    }
    return { open: false };
  }
  /* 改 karmaEventScore：走 SQ.mutate（与 claim 共用写队列，recalcDerived 顺带入档日志） */
  const setKarma = (v) => page.evaluate(async (val) => {
    await SQ.mutate({}, function (s) { s.worlds[s.profile.worldId].karmaEventScore = val; });
  }, v);

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  /* 顶栏由 renderAll 渲染（首 tick 后）；等渲染落位（#m-rank 为静态节点，需等 #m-who 写入元信息）再读 */
  await page.waitForSelector('#m-who .who-meta', { timeout: 8000 });
  await page.waitForTimeout(300);

  /* ① 世界名水印（方案 B3 · 右上竖排落款）：夹在面板底色与文字层之间 */
  const wm = await page.evaluate(() => {
    const el = document.getElementById('m-wm');
    const who = document.getElementById('m-who');
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const pbox = el.parentElement.getBoundingClientRect();
    return {
      text: (el.textContent || '').trim(),
      opacity: cs.opacity,
      fontSize: cs.fontSize,
      weight: cs.fontWeight,
      z: cs.zIndex,
      pos: cs.position,
      pe: cs.pointerEvents,
      wmMode: cs.writingMode,
      right: cs.right,
      top: cs.top,
      nearRight: (pbox.right - box.right) <= 24,
      nearTop: (box.top - pbox.top) <= 16,
      overflow: getComputedStyle(el.parentElement).overflow,
      lineZ: getComputedStyle(who).zIndex,
      whoText: (who.textContent || '').trim()
    };
  });
  T(wm.text === WNAME, '世界名水印渲染（取世界名文本）', 'text=' + wm.text + ' expect=' + WNAME);
  T(wm.pos === 'absolute' && wm.pe === 'none', '水印绝对定位且不拦截点击', 'pos=' + wm.pos + ' pe=' + wm.pe);
  T(Math.abs(parseFloat(wm.opacity) - 0.30) < 1e-6 && wm.fontSize === '20px' && wm.weight === '800' && wm.wmMode.indexOf('vertical') >= 0,
    '水印参数（20px · 粗体 800 · opacity .30 · 竖排）',
    'size=' + wm.fontSize + ' weight=' + wm.weight + ' opacity=' + wm.opacity + ' wm=' + wm.wmMode);
  T(wm.nearRight && wm.nearTop, '水印贴右上落款（right=' + wm.right + ' top=' + wm.top + '）',
    'nearRight=' + wm.nearRight + ' nearTop=' + wm.nearTop);
  T(wm.overflow === 'hidden' && Number(wm.z) < Number(wm.lineZ),
    '水印被面板裁切且位于文字层之下（z ' + wm.z + ' < 文字 ' + wm.lineZ + '）',
    'overflow=' + wm.overflow + ' z=' + wm.z + ' lineZ=' + wm.lineZ);
  T(wm.whoText.indexOf(CNAME) >= 0 && wm.whoText.indexOf(WNAME) < 0 && wm.whoText.indexOf('@') < 0,
    '第一行显示角色名称且不含世界名/@（v4 位置互换）', 'who=' + wm.whoText + ' name=' + CNAME + ' world=' + WNAME);

  /* ①b 顶栏右列名号行（B16-a 对齐设计稿 .hd：右列 = 灵石上 · 名号下；基线：左道散人 · 中性色） */
  const c0 = await chipInfo();
  T(!!c0 && c0.text === '左道散人' && /neutral/.test(c0.cls),
    '顶栏右列名号行渲染（左道散人 · 中性色）',
    c0 ? 'text=' + c0.text + ' cls=' + c0.cls : 'null');

  /* ② 名号行（如「极道魔尊」）位于右栏灵石之下、为善恶入口；左列只留元信息 */
  const kb0 = await page.evaluate(() => document.getElementById('m-karma'));
  T(kb0 === null, '原第二行档位徽章已撤（无 #m-karma 残留）', 'kb=' + (kb0 ? 'still-present' : 'null'));
  const rankPos = await page.evaluate(() => {
    const rk = document.getElementById('m-rank');
    const line2 = rk ? rk.parentElement : null;
    const stones = document.getElementById('m-stones');
    const who = document.getElementById('m-who');
    return {
      act: rk ? rk.getAttribute('data-act') : null,
      inLine2: !!(rk && stones && rk.parentElement === stones.parentElement),
      belowStone: !!(rk && line2 && line2.firstElementChild === stones && stones.nextElementSibling === rk),
      whoHasChip: !!(who && who.querySelector('.rankchip'))
    };
  });
  T(rankPos.act === 'karma' && rankPos.inLine2 && rankPos.belowStone && !rankPos.whoHasChip,
    '名号行位于右栏灵石之下（B16 对齐设计稿 .hd：右列 = 灵石上 · 名号下 · 左列不含徽章）',
    'act=' + rankPos.act + ' inLine2=' + rankPos.inLine2 + ' belowStone=' + rankPos.belowStone + ' whoHasChip=' + rankPos.whoHasChip);

  /* ②b 加入势力后顶栏不溢出：右列固定不缩、元信息（左列 .hd-sub）省略号收尾（宽屏左栏仅 264px） */
  const whoBox = await page.evaluate(() => {
    const who = document.getElementById('m-who');
    const rk = document.getElementById('m-rank');
    const line2 = rk ? rk.parentElement : null;
    const meta = who.querySelector('.who-meta');
    return {
      whoOv: who.scrollWidth - who.clientWidth,
      rkOv: rk.scrollWidth - rk.clientWidth,
      line2Ov: line2.scrollWidth - line2.clientWidth,
      metaOv: meta.scrollWidth - meta.clientWidth,
      metaEll: getComputedStyle(meta).textOverflow,
      hasFac: /掩月宗/.test(meta.textContent || '')
    };
  });
  T(whoBox.hasFac, '元信息含势力名（加入掩月宗后）', 'meta 含掩月宗=' + whoBox.hasFac);
  T(whoBox.rkOv <= 1 && whoBox.line2Ov <= 1,
    '右列不溢出（灵石 + 名号行完整可见）',
    'rkOv=' + whoBox.rkOv + ' line2Ov=' + whoBox.line2Ov);
  T(whoBox.metaEll === 'ellipsis', '元信息过长时省略号收尾（不裁切硬截）',
    'text-overflow=' + whoBox.metaEll + ' metaOv=' + whoBox.metaOv);

  /* ③ 善恶浮层九段天梯：九行全列 · 当前段高亮 · 区间标注 */
  await page.click('#m-rank');
  await page.waitForTimeout(350);
  const modalOn = await page.evaluate(() => !document.getElementById('modal-karma').classList.contains('hide'));
  T(modalOn, '点名号徽章 → 善恶浮层打开', 'open=' + modalOn);
  const ladder = await page.evaluate(() => {
    const title = (document.getElementById('mkd-ranktitle') || {}).textContent || '';
    const rows = Array.from(document.querySelectorAll('#mkd-ranks .rrow'));
    return {
      title: title,
      n: rows.length,
      names: rows.map(r => (r.querySelector('span') || {}).textContent || ''),
      ranges: rows.map(r => ((r.querySelector('.rr-range') || {}).textContent) || ''),
      onName: (rows.filter(r => r.classList.contains('on'))[0] || {}).textContent || '',
      onCls: (rows.filter(r => r.classList.contains('on'))[0] || { className: '' }).className || ''
    };
  });
  T(ladder.title === '名号九段', '浮层天梯标题 = 名号九段', 'title=' + ladder.title);
  T(ladder.n === 9, '天梯九行全列', 'n=' + ladder.n);
  T(ladder.onName.indexOf('左道散人') >= 0 && /neutral/.test(ladder.onCls),
    '当前段高亮（左道散人 · 中性色）', 'on=' + ladder.onName + ' cls=' + ladder.onCls);
  T(ladder.ranges[0] === '+800 ~ +1000' && ladder.ranges[8] === '-1000 ~ -800',
    '天梯区间由 KARMA_RANKS 下界推导（首 +800~+1000 · 末 -1000~-800）',
    'r0=' + ladder.ranges[0] + ' r8=' + ladder.ranges[8]);
  await page.click('#mkd-close');
  await page.waitForTimeout(300);

  /* ④ 跨段（正道侧）：100 → 250 ⇒ 左道散人 → 持正之士，演出 + 徽章 + 日志 */
  await setKarma(250);
  const s1 = await waitStage(2600);
  T(s1.open && s1.t2 === '持正之士' && /r2 right/.test(s1.t2cls),
    '跨段演出弹出（正道侧 · 持正之士 · 金色大字）',
    s1.open ? 't2=' + s1.t2 + ' cls=' + s1.t2cls : 'no-stage');
  const c1 = await chipInfo();
  T(!!c1 && c1.text === '持正之士' && /right/.test(c1.cls),
    '跨段后顶栏徽章更新（持正之士 · 正道色）', c1 ? 'text=' + c1.text + ' cls=' + c1.cls : 'null');
  await page.waitForTimeout(3600);   /* 3.2s 自动收 */
  const closed1 = await stageInfo();
  T(!closed1.open, '演出 3.2s 自动收（不残留遮挡）', 'open=' + closed1.open);

  /* ⑤ 跨段（魔道侧）：250 → -450 ⇒ 持正之士 → 凶名邪修，演出 + 徽章 */
  await setKarma(-450);
  const s2 = await waitStage(2600);
  T(s2.open && s2.t2 === '凶名邪修' && /r2 evil/.test(s2.t2cls),
    '跨段演出弹出（魔道侧 · 凶名邪修 · 赤色大字）',
    s2.open ? 't2=' + s2.t2 + ' cls=' + s2.t2cls : 'no-stage');
  const c2 = await chipInfo();
  T(!!c2 && c2.text === '凶名邪修' && /evil/.test(c2.cls),
    '跨段后顶栏徽章更新（凶名邪修 · 魔道色）', c2 ? 'text=' + c2.text + ' cls=' + c2.cls : 'null');
  await page.evaluate(() => document.getElementById('rank-stage').classList.add('hide'));
  await page.waitForTimeout(200);

  /* ⑥ 日志入档：日志页「善恶」分类可见，且含起讫双名号 */
  await page.click('#m-tabbar button[data-v="journal"]');
  await page.waitForTimeout(400);
  const catHit = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('#tab-journal .chips button'));
    const b = btns.filter(x => (x.textContent || '').trim() === '道心')[0];
    return b ? { found: true, id: b.getAttribute('data-v') } : { found: false };
  });
  T(catHit.found && catHit.id === 'karma', '日志页「道心」分类筛选在位（id=karma）', JSON.stringify(catHit));
  await page.click('#tab-journal .chips button[data-v="karma"]');
  await page.waitForTimeout(300);
  const logText = await page.evaluate(() => (document.getElementById('tab-journal') || {}).innerText || '');
  const hasCross1 = logText.indexOf('左道散人') >= 0 && logText.indexOf('持正之士') >= 0;
  const hasCross2 = logText.indexOf('持正之士') >= 0 && logText.indexOf('凶名邪修') >= 0;
  T(hasCross1 && hasCross2, '跨段日志入档（起讫双名号 · 正魔两次均在）',
    'cross1=' + hasCross1 + ' cross2=' + hasCross2);

  T(errors.length === 0, '零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_KARMA_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_KARMA_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
