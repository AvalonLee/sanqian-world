/* .tests/verify-ui-arts.cjs — 法与器页（顶部标签互斥）+ 自悟节 + 卡片化 + 窄屏走查（playwright-core + Edge headless）
 * 自悟批：功法段「自行领悟」节——保底进度条（.selflearn .pbar）+ 可领悟候选计数；
 * 卡片化批：器段（.geargrid）与法宝页（.trgrid）由行列表改为卡片网格——宽屏多列、窄屏单列；
 * 页面整合批 2026-10-06（UI 卷 §3.4a）：原「功法」「法器」两 Tab 并为「法与器」一页——
 *   ① 导航断言改数**游戏页 12 项**（原 13）② 新增概览条 `.laware` 三格 / 段标 / `lawJump` 断言
 *   ③ 原 `#tab-gear` 选择器全部改 `#tab-arts` ④ 新增**窄屏导航零截断**断言。
 * **法与器标签化批 2026-10-09（UI 卷 §3.4a v2.24）**：合并页「单页纵向五段」改「**顶部 chip 二枚 + 只渲染选中段**」
 *   ——本批断言面按真实新结构重写，**不是把旧断言改绿**：
 *   ① 段标/段序从「两段都在」翻成「**该在的在、不该在的一个都不在**」+「**一次恰一枚段标**」
 *      （与 `.tests/probe-lawmerge.cjs` 的缺席判据同口径；无浏览器侧由探针覆盖，本篇覆盖 CSS 与真点击）；
 *   ② 🆕 N 组 = 标签本体（二枚文案取真词表值 / 默认功法 / 点按互斥 / 滚动归零 / 跨 tab 保持）；
 *   ③ 🆕 **吸顶碰撞（本批真机首跑抓到的产品缺陷，不是假想防御）**：`artsBody()` 返回**平铺**块，
 *      融合坛「父母选择」那排 `.chips` 与顶部标签行同为 `#tab-arts` 的直接子代 ⇒ 首版写 `#tab-arts > .chips`
 *      时它被一起吸到页顶。改法 = 顶部行挂专名类，吸顶规则写 `#tab-arts > .lawchips`；
 *      本篇 N3 验顶栏计算值 = sticky（z-index 6），N4 验**页内其余 `.chips` 计算值仍为 static**，
 *      并先断言「页内确有第二排 `.chips`」（本仓教训：`⊆ 空集` 恒真 ⇒ 缺席类判据必须先证反例会出现）。
 *      注：探针（纯字符串层）**照不出这条**——桩当时把融合坛简化成一个 `<div class="fusealtar">`，
 *      第二排 chip 在桩串里压根不存在；桩形已随批改成真实平铺（`.tests/probe-lawmerge.cjs` A4d），
 *      但 CSS 计算值仍只有真机能量 ⇒ **登记为「桩简化的代价」**。
 *   ④ `lawJump` 语义改：目标段未选中 = 切标签并回顶，已选中 = 不切标签、滚到段标。
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-arts.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 借沙箱 normalize 造合法世界态：realm 5（解锁法宝页 lock 3 + 宗门 lock 4 → 12 游戏页全开）
 * + 双功法入槽（自悟面板与概览条「主修」格可读） */
async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const pack = SQ.Worlds.xiuxian.pack;
  const ws = pack.normalize({});
  const now = Date.now();
  ws.realm = 5; ws.stones = 5000; ws.qi = 100; ws.total = 100;
  /* A11 三态取样（等级起点批后改档）：Lv1 入门 / Lv3 常规字段 / Lv9 带 effectsFixed 字段
   * ——emotionless 只「学会」不「入槽」，避免动到 A4d 依赖的 setMainArt 按钮计数。
   * 旧的 Lv0 态已不可达（入门即 Lv1），改由 A11f 反向钉「屏上不许出现 Lv0」。 */
  ws.artsKnown = ['tuna', 'juling', 'emotionless']; ws.artsSlots = ['tuna', 'juling'];
  ws.artsLevels = { tuna: 3, juling: 1, emotionless: 9 };
  ws.lastSave = now; ws.lastOffline = null; ws.pendingChoice = null;
  /* N52（第册十二批）· 认主按件：两件先天法宝各带自己的进度——x02 未满阶（卡上该出「这件还差约 N 小时」），
   * x04 已满阶（这句该不出现，作反例）。进度写在 owned[].st 上，与引擎的按键形状一致。 */
  ws.treasures.owned.push({ id: 'x02', stage: 1, st: { bondN: 1, bondH: 3 } });
  ws.treasures.owned.push({ id: 'x04', stage: 3, st: { bondN: 2, bondH: 1 } });
  ws.treasures.slots = ['x02', 'x04', null];
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-17-3' },
    meta: { unlockedWorlds: ['xiuxian'] },
    settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const save = await buildSave();
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };
  /* 取页顶标签行状态：枚数 / 文案 / 选中值 / 吸顶计算值 + 页内**其余** `.chips` 的 position
   * （顶栏用专名类 `.lawchips` 与段内融合坛那排裸 `.chips` 区分——见 N4 的碰撞证据） */
  const chipState = () => {
    const row = document.querySelector('#tab-arts > .lawchips');
    const on = document.querySelector('#tab-arts > .lawchips button.on');
    const inner = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .chips'))
      .filter((x) => !x.classList.contains('lawchips'));
    return {
      n: document.querySelectorAll('#tab-arts > .lawchips button').length,
      labels: Array.prototype.map.call(document.querySelectorAll('#tab-arts > .lawchips button'), (b) => b.textContent.trim()),
      on: on ? on.dataset.v : '',
      pos: row ? getComputedStyle(row).position : '',
      z: row ? getComputedStyle(row).zIndex : '',
      allChips: document.querySelectorAll('#tab-arts .chips').length,
      innerPos: inner.map((x) => getComputedStyle(x).position),
      secIds: Array.prototype.map.call(document.querySelectorAll('#tab-arts .secdiv'), (x) => x.id),
      marks: {
        fa: !!document.querySelector('#tab-arts [data-mainart="1"]'),
        selflearn: !!document.querySelector('#tab-arts .selflearn'),
        grid: !!document.querySelector('#tab-arts .artgrid'),
        grouper: !!document.querySelector('#tab-arts .grouper'),
        qi: !!document.querySelector('#tab-arts .geargrid'),
        codex: !!document.querySelector('#tab-arts [data-act="openGearCodex"]')
      },
      scroll: document.querySelector('.tabbody') ? document.querySelector('.tabbody').scrollTop : -1
    };
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(700);

  /* ── A0 导航：游戏页 12 项（页面整合批 13 → 12；以 .navsep 分组线为界，其后是系统页 3 项）── */
  const nav = await page.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(bar.children);
    const sep = kids.findIndex((x) => x.classList.contains('navsep'));
    const game = kids.slice(0, sep).filter((x) => x.tagName === 'BUTTON');
    return {
      nGame: game.length,
      nSys: kids.slice(sep + 1).filter((x) => x.tagName === 'BUTTON').length,
      labels: game.map((x) => x.textContent.trim()),
      hasGearTab: game.some((x) => x.dataset.v === 'gear'),
      artsLabel: (game.filter((x) => x.dataset.v === 'arts')[0] || {}).textContent || ''
    };
  });
  T(nav.nGame === 12, 'A0 导航游戏页 12 项（功法 + 法器并为「法与器」）', 'n=' + nav.nGame + ' 系统页=' + nav.nSys);
  T(!nav.hasGearTab, 'A0b `gear` 已从 GAME_TABS 移除（无独立导航项）');
  T(nav.artsLabel.trim() === '法与器', 'A0c 合并页导航标签 = 「法与器」（词表 arts.system）', 'got=' + nav.artsLabel.trim());
  T(nav.labels.indexOf('法宝') >= 0, 'A0d 法宝仍独立成页（用户拍板合并面限定「只并功法 + 装备」）');

  /* ── 进合并页 ── */
  await page.click('#m-tabbar button:has-text("法与器")');
  await page.waitForTimeout(400);

  /* ── N1~N5 顶部标签本体（标签化批）── */
  const c0 = await page.evaluate(chipState);
  T(c0.n === 2 && c0.labels.join('|') === '功法|法器', 'N1 页顶标签恰二枚，文案取真词表值（skill.system / gear.system）',
    'n=' + c0.n + ' ' + c0.labels.join('/'));
  T(c0.on === 'fa', 'N2 默认落在功法标签（红点语义 = 有新功法，进页先看段）', 'on=' + c0.on);
  T(c0.pos === 'sticky' && c0.z === '6', 'N3 标签行吸顶（position:sticky + z-index:6，与日志页同一条规则）',
    'pos=' + c0.pos + ' z=' + c0.z);
  T(c0.allChips >= 2 && c0.innerPos.length >= 1 && c0.innerPos.every((p) => p === 'static'),
    'N4 融合坛父母选择器那排 .chips **没被一起吸顶**（吸顶规则挂专名类 .lawchips；此条在首版 `> .chips` 写法下实测为 sticky ⇒ 真缺陷证据）',
    '页内 chips=' + c0.allChips + ' 其余排 position=' + c0.innerPos.join(','));
  T(c0.secIds.join(',') === 'lawsec-fa' && c0.marks.fa && c0.marks.selflearn && c0.marks.grid && c0.marks.grouper &&
    !c0.marks.qi && !c0.marks.codex,
    'N5 功法标签下**恰一枚段标 + 功法段四标志在位 + 法器段整体缺席**（互斥，不是「两段都在顺序不同」）',
    'sec=' + c0.secIds.join(',') + ' geargrid=' + c0.marks.qi + ' codex=' + c0.marks.codex);

  /* ── A1 概览条 .laware：三格（主修 / 佩器 / 战力），每格值非空 ── */
  const ov = await page.evaluate(() => {
    const cells = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .laware button'));
    return {
      n: cells.length,
      keys: cells.map((c) => (c.querySelector('.k') || {}).textContent || ''),
      vals: cells.map((c) => ((c.querySelector('.v') || {}).textContent || '').trim()),
      jumps: cells.map((c) => c.dataset.act + ':' + c.dataset.v)
    };
  });
  T(ov.n === 3, 'A1 概览条三格在位（主修 / 佩器 / 战力）', 'n=' + ov.n);
  T(ov.keys.join('|') === '主修|佩器|战力', 'A1b 概览条三格标签正确', ov.keys.join('|'));
  T(ov.vals.every((v) => v.length > 0), 'A1c 概览条三格值均非空', JSON.stringify(ov.vals));
  T(ov.vals[0].indexOf('Lv') >= 0, 'A1d 主修格显示功法名 + 等级', ov.vals[0]);
  T(ov.jumps.every((j) => j.indexOf('lawJump:') === 0), 'A1e 三格均绑 lawJump（标签化后语义 = 切到对应段）', ov.jumps.join(','));

  /* ── A2 段标：随标签切换，恰一枚在位、字与副标各归各段 ── */
  const segFa = await page.evaluate(() => {
    const ds = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .secdiv'));
    return {
      n: ds.length,
      zi: ds.map((x) => (x.querySelector('.zi') || {}).textContent || ''),
      ids: ds.map((x) => x.id),
      subs: ds.map((x) => ((x.querySelector('.sub') || {}).textContent || '').trim())
    };
  });
  T(segFa.n === 1 && segFa.zi.join('') === '法' && segFa.ids.join(',') === 'lawsec-fa',
    'A2 功法标签下段标恰一枚「法」+ 锚点 lawsec-fa', segFa.zi.join('/') + ' ' + segFa.ids.join(','));
  T(segFa.subs.length === 1 && segFa.subs[0].length > 0, 'A2b 段标副标非空', segFa.subs.join(' / '));

  /* ── A3 段序：标签 → 概览条 → 段标 → 段体（功法标签态）── */
  const order = await page.evaluate(() => {
    const p = document.getElementById('tab-arts');
    const sel = ['#tab-arts > .lawchips', '.laware', '#lawsec-fa', '.selflearn'];
    const tops = sel.map((s) => { const e = p.querySelector(s) || document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : -99999; });
    return { tops, allFound: tops.every((x) => x > -99999) };
  });
  T(order.allFound, 'A3 四段元素全部在位（标签 / 概览条 / 段标 / 段体）', JSON.stringify(order.tops));
  T(order.allFound && order.tops.every((v, i) => i === 0 || v >= order.tops[i - 1]),
    'A3b 四段纵向顺序正确（标签 → 概览条 → 法·段标 → 功法内容）', JSON.stringify(order.tops));

  /* ── A4 功法段：自悟节（原「功法页」断言，归属改称、断言不变）── */
  const arts = await page.evaluate(() => {
    const sec = document.querySelector('#tab-arts .selflearn');
    const bar = sec ? sec.querySelector('.pbar > i') : null;
    const heads = Array.prototype.map.call(document.querySelectorAll('#tab-arts .sechead .t'), (x) => x.textContent);
    return {
      hasSec: !!sec,
      hasBar: !!bar,
      barW: bar ? bar.style.width : '',
      selfHead: heads.some((x) => x.indexOf('领') >= 0 && x.indexOf('悟') >= 0),
      cands: !!document.querySelector('#tab-arts .selflearn .hint')
    };
  });
  T(arts.hasSec && arts.hasBar, 'A4 法段含「自行领悟」节 + 保底进度条', 'w=' + arts.barW);
  T(arts.selfHead, 'A4b 自悟节标题（自行领悟）在位');
  T(arts.cands, 'A4c 自悟节含候选/说明文案');

  /* ── A4d 主修可点定（GitHub issue #3）：点第 2 格的「设为主修」⇒ 角标与概览条同时换人 ──
   * 旧实现「主修 = 第 1 位」下这颗按钮根本不存在，故本条也是「设为主修」入口的在位判据。 */
  const mainPick = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .cards > .tcard'));
    const btns = document.querySelectorAll('#tab-arts [data-act="setMainArt"]');
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    return {
      btnN: btns.length,
      slotN: (s.worlds[s.profile.worldId].artsSlots || []).length,
      mainIdxBefore: cards.findIndex((c) => !!c.querySelector('.maincorner'))
    };
  });
  if (mainPick.btnN > 0) await page.click('#tab-arts [data-act="setMainArt"]');
  await page.waitForTimeout(500);
  const mainAfter = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .cards > .tcard'));
    const ov = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .laware button .v'));
    const idx = cards.findIndex((c) => !!c.querySelector('.maincorner'));
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId];
    return {
      mainIdx: idx,
      markerIdx: cards.findIndex((c) => c.getAttribute('data-mainart') === '1'),
      mainName: idx >= 0 ? ((cards[idx].querySelector('.tname') || {}).textContent || '').trim() : '',
      ovMain: ov.length ? (ov[0].textContent || '').trim() : '',
      artsMain: w.artsMain
    };
  });
  T(mainPick.slotN >= 2 && mainPick.btnN === mainPick.slotN - 1 &&
    mainPick.mainIdxBefore === 0 && mainAfter.mainIdx === 1 &&
    mainAfter.markerIdx === 1 && mainAfter.artsMain === 'juling' &&
    mainAfter.mainName !== '' && mainAfter.ovMain !== '' &&
    mainAfter.ovMain.indexOf(mainAfter.mainName) >= 0,
    'A4d 主修点定（issue #3）：按钮数 = 在槽数 − 1（主修那格不给）· 点后角标与 data-mainart 同移到第 2 格 · 概览条「主修」格随之改名 · ws.artsMain 落盘',
    'btn=' + mainPick.btnN + '/在槽 ' + mainPick.slotN + ' idx ' + mainPick.mainIdxBefore + '→' + mainAfter.mainIdx +
    ' marker=' + mainAfter.markerIdx + ' 落盘=' + mainAfter.artsMain + ' 概览=' + mainAfter.ovMain);

  /* ── A11 卡片增益行 = 引擎实际生效值（等级起点批：入门即 Lv1，Lv9 即满级）──
   * 立因两笔：① 用户报「Lv0 显示得和 Lv1 一样」→ 本批把 Lv0 态取消（入门即 Lv1），
   *   呈现面反过来钉「屏上不许再有 Lv0」；② 取证时另抓出的真缺陷：**effectsFixed** 字段卡面也乘了
   *   lv（太上忘情篇引擎只吃 −8pp，Lv9 曾写 −72%，`mods.js` 用 `lv > 0 ? 1 : 0`）。
   * 判据不写死数字、也不写死文案：整行文本逐字段与**消费端** `SQ.Mods.collect` 的
   * `detail[字段].arts` 对表 ⇒ 改卡面公式或改引擎缩放口径，两侧不同步就红（消费关系判据）。 */
  const gain = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian;
    const pack = SQ.Worlds.xiuxian.pack, D = pack.data, AM = pack.artsMap();
    const wf = (k, o) => SQ.t(k, o || null, 'xiuxian');
    const pctv = (v) => (Math.round(Math.abs(v) * 1000) / 10).toString().replace(/\.0$/, '') + '%';
    const lvOf = (id) => (w.artsLevels || {})[id] || 0;
    /* 单部入槽重算：detail[field].arts 就是「这一部在这一级实际吃进去的值」 */
    const eng = (id, f, lv) => {
      const w2 = JSON.parse(JSON.stringify(w));
      w2.artsSlots = [id]; w2.artsKnown = [id];
      w2.artsLevels = {}; w2.artsLevels[id] = lv;
      const m = SQ.Mods.collect(s.profile, w2, pack, D);
      const v = (m.detail[f] ? m.detail[f].arts : 0) || 0;
      return (v >= 0 ? '+' : '−') + pctv(v);
    };
    const expect = (id, lv) => Object.keys(AM[id].effects)
      .map((f) => wf('talent.field.' + f) + ' ' + eng(id, f, lv)).join(' · ');
    const at = (i) => {
      const c = document.querySelectorAll('#tab-arts .artgrid > .tcard')[i];
      return c ? {
        name: ((c.querySelector('.tname') || {}).textContent || '').trim(),
        hint: ((c.querySelector('.hint') || {}).textContent || '').trim(),
        meta: ((c.querySelector('.meta') || {}).textContent || '').trim(),
        upgradeBtns: c.querySelectorAll('[data-act="upgradeArt"]').length,
        txt: (c.textContent || '')
      } : { name: '', hint: '', meta: '', upgradeBtns: 0, txt: '' };
    };
    /* 顺序 = knownS 排序结果（在槽两格落在前，未入槽的 emotionless 落第 3） */
    const ids = ['tuna', 'juling', 'emotionless'];
    const rows = ids.map((id, i) => {
      const c = at(i);
      return { id, lv: lvOf(id), name: c.name, want: wf('skill.' + id + '.name'), hint: c.hint,
        meta: c.meta, exp: expect(id, lvOf(id)), upgradeBtns: c.upgradeBtns, txt: c.txt };
    });
    const knownLv = (w.artsKnown || []).map((id) => lvOf(id));
    const anyLv0 = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .artgrid > .tcard'))
      .some((c) => ((c.querySelector('.hint') || {}).textContent || '').indexOf('Lv0') >= 0);
    return { rows, knownLv, anyLv0, maxTxt: wf('arts.max') };
  });
  const gBy = {}; gain.rows.forEach((r) => { gBy[r.id] = r; });
  T(gain.rows.length === 3 && gain.rows.every((r) => r.name.indexOf(r.want) >= 0),
    'A11a 已学会卡三态取样在位（tuna Lv3 / juling Lv1 / emotionless Lv9，名称逐格对上）',
    gain.rows.map((r) => r.id + '=' + r.lv).join(' '));
  T(gBy.tuna.lv === 3 && gBy.juling.lv === 1 && gBy.emotionless.lv === 9,
    'A11b 存档等级确实落到页面（前置：先证三态存在，否则下面的对表是空对空）',
    'Lv ' + gBy.tuna.lv + '/' + gBy.juling.lv + '/' + gBy.emotionless.lv + ' hint=' + gBy.juling.hint.slice(0, 12));
  T(gain.rows.every((r) => r.meta === r.exp),
    'A11c 三张卡的增益行逐字段 === 引擎 detail（Lv1/Lv3 常规 ×lv、Lv9 固定字段不乘）',
    gain.rows.filter((r) => r.meta !== r.exp).map((r) => r.id + ': ' + r.meta + ' vs ' + r.exp).join(' ‖ ') || 'all match');
  T(gain.rows.every((r) => r.meta.indexOf('+-') < 0 && r.meta.indexOf('+−') < 0) &&
    gBy.emotionless.meta.indexOf('渡劫失败损失 −8%') >= 0,
    'A11d 符号口径跟随实值（旧模板把 `+` 写死 ⇒ 负字段曾渲染成 `+-8%`；现在负字段就是 `−8%`）',
    gBy.emotionless.meta);
  T(gBy.emotionless.meta.indexOf('−8%') >= 0 && gBy.emotionless.meta.indexOf('−72%') < 0,
    'A11e effectsFixed 不随等级：Lv9 太上忘情篇卡面 = 引擎只吃的 −8pp（旧公式写 −72% ⇒ 本条即缺陷反证）',
    gBy.emotionless.meta);
  T(!gain.anyLv0 && gain.knownLv.length > 0 && gain.knownLv.every((v) => v >= 1),
    'A11f 入门即 Lv1：已入门的每部等级 ≥1 且屏上不再出现「Lv0」（旧 Lv0 态随批消失）',
    'knownLv=' + gain.knownLv.join('/') + ' 屏上有Lv0=' + gain.anyLv0);
  T(gBy.emotionless.upgradeBtns === 0 && gBy.emotionless.txt.indexOf(gain.maxTxt) >= 0 &&
    gBy.tuna.upgradeBtns === 0 && gBy.juling.upgradeBtns === 0,
    'A11g **判据改口**（第卌七批④c）：已学会网格一张都不许有升级钮（未满级的 tuna/juling 也 0 颗），' +
    '满级卡另须仍显「满级」——升级口本批起只留槽卡，缺席面在这一条判、正面由 H 组判',
    'Lv9钮=' + gBy.emotionless.upgradeBtns + ' Lv3钮=' + gBy.tuna.upgradeBtns +
    ' Lv1钮=' + gBy.juling.upgradeBtns + ' 文本含满级=' + (gBy.emotionless.txt.indexOf(gain.maxTxt) >= 0));

  /* ── H 组（第卌七批④c · 用户令「修习槽那六张卡里就该有升级功法的按钮，下方已学会不必再给升级」）：
   * 口径依据 = 引擎 `Arts.tickPractice` 只遍历 `ws.artsSlots` ⇒ 未入槽的功法精通恒 0、永不会顿悟，
   * 升级口因此跟着「会长进的那一侧」走。两侧各判一刀，缺一不可：
   * 只判「槽上有」会放过满级槽卡多留一颗死钮；只判「列表没有」会放过整页一个都不出。
   * ⚠️ fixture 三部（tuna Lv3 / juling Lv1 / emotionless Lv9）**全部在槽**——`Arts.autoSlot`
   *   在载入时按 artsKnown 补空槽（数值详设 §4.4 v1.26），头注那句「emotionless 只学会不入槽」
   *   说的是旧行为。好处是 H1 一次读数就同屏拿到「未满级两张 + 满级一张」；槽外那一侧由 H2 卸下真造。 ── */
  const slotRead = (ids) => page.evaluate((ids) => {
    const wf = (k, o) => SQ.t(k, o || null, 'xiuxian');
    const cells = Array.prototype.slice.call(document.querySelectorAll('#tab-arts [data-slot]'));
    const known = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .artgrid > .tcard'));
    const one = (c) => c.querySelectorAll('[data-act="upgradeArt"]').length;
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian, P = SQ.Worlds.xiuxian.pack;
    return {
      n: cells.length,
      ids: cells.map((c) => ((c.querySelector('.tname') || {}).textContent || '').trim().slice(0, 5)),
      btn: cells.map(one),
      dis: cells.map((c) => { const b = c.querySelector('[data-act="upgradeArt"]'); return b ? !!b.disabled : null; }),
      max: cells.map((c) => (c.textContent || '').indexOf(wf('arts.max')) >= 0),
      knownBtn: known.reduce((a, c) => a + one(c), 0),
      knownN: known.length,
      /* 槽外那一侧**按 id 取卡**（卡内那颗 装入/卸下/弃置 钮的 data-v 就是功法 id）——
       * 不拿名号文本比，词表改字不该让走查跟着红。evaluate 只能回传可序列化值，故此处出数组不出函数。 */
      cards: ids.map((id) => {
        const b0 = known.map((c) => c.querySelector('[data-v="' + id + '"]')).filter(Boolean)[0];
        const c = b0 ? b0.closest('.tcard') : null;
        return c ? { up: one(c), slot: !!c.querySelector('[data-act="slotArt"]'),
          unslot: !!c.querySelector('[data-act="unslotArt"]'), salv: !!c.querySelector('[data-act="salvageArt"]'),
          fx: ((c.querySelector('.meta') || {}).textContent || '').trim() }
          : { up: -1, slot: false, unslot: false, salv: false, fx: '' };
      }),
      /* 槽卡那一行按 id 带回（槽序会变：autoSlot 补位、卸下再装会挪到尾部 ⇒ 钉序必假红） */
      slotFx: cells.reduce(function (o, c) {
        const b = c.querySelector('[data-v]');
        if (b && b.dataset.v) o[b.dataset.v] = ((c.querySelector('.meta') || {}).textContent || '').trim();
        return o;
      }, {}),
      qi: w.qi,
      costTuna: SQ.Arts.upgradeCost(w, P, P.data, 'tuna', SQ.Mods.collect(s.profile, w, P, P.data)),
      slots: (w.artsSlots || []).slice()
    };
  }, ids);
  const IDS = ['tuna', 'juling', 'emotionless'];
  const h1 = await slotRead(IDS);
  T(h1.n === 3 && h1.max.filter((x) => x).length === 1 &&
    h1.btn.every((b, i) => b === (h1.max[i] ? 0 : 1)) &&
    h1.knownBtn === 0 && h1.knownN === 3,
    'H1 同一屏两侧：未满级槽卡恰 1 颗升级钮 ‖ Lv9 那张 0 颗且显「满级」 ‖ 已学会三张合计 0 颗（按满级位判、不钉槽序）',
    '槽=' + h1.n + ' 名=' + h1.ids.join('/') + ' 钮=' + h1.btn.join(',') + ' 满级格=' + h1.max.join(',') +
    ' 已学会钮=' + h1.knownBtn + '/' + h1.knownN);
  T(h1.dis[0] === (h1.qi < h1.costTuna),
    'H1b 槽卡升级钮的 disabled === 引擎 `upgradeCost` 与实有修为之比（写死 disabled 或写死不放都是假在跑）',
    'qi=' + Math.round(h1.qi) + ' cost=' + h1.costTuna + ' disabled=' + h1.dis[0]);
  /* H4 属性加成行进槽卡（第卌九批 · 用户令「修习槽中的功法对应的属性加成效果，也要显示出来」）：
   * 判的是**同源**而不是「有字」——槽卡那行必须与同 id 已学会卡逐字相同，而已学会那行由 A11c
   * 已经对表过引擎 `SQ.Mods.collect` 的 detail ⇒ 等值传递到槽卡，公式改动漏改任一侧即红。
   * 按 id 取数不按槽序（autoSlot 补位与「卸下再装会挪到尾部」都会换序）。 */
  const hFx = IDS.map((id, i) => [id, h1.slotFx[id] || '', h1.cards[i].fx || '']);
  T(Object.keys(h1.slotFx).length === 3 && hFx.every((x) => x[1] !== '' && x[1] === x[2]),
    'H4 槽卡有属性加成行 ‖ 与同 id 已学会卡逐字相同（一条式子两处显示，不抄第二份）',
    hFx.map((x) => x[0] + '[' + x[1].slice(0, 24) + ']').join(' ‖ '));
  /* H2 把吐纳法卸下 ⇒ 造出「已学会且槽外」那一侧（用户原话「下方已学会不需要升级功能」指的正是它），
   * 判完立即装回：autoSlot 只在载入时补空槽，不装回就一直缺这一格，后面的组会跟着换形。 */
  await page.evaluate(() => { const b = document.querySelector('#tab-arts [data-act="unslotArt"][data-v="tuna"]'); if (b) b.click(); });
  await page.waitForTimeout(300);
  const h2 = await slotRead(IDS);
  const ht = h2.cards[0];
  T(h2.n === 2 && ht.up === 0 && ht.slot === true && ht.unslot === false && h2.knownBtn === 0,
    'H2 槽外那一侧：卸下吐纳法后它的已学会卡**不给升级钮**（只留装入 + 弃置），槽里少一格',
    '槽=' + h2.n + ' 该卡升级钮=' + ht.up + ' 装入=' + ht.slot + ' 卸下=' + ht.unslot + ' 全文钮=' + h2.knownBtn);
  await page.evaluate(() => { const b = document.querySelector('#tab-arts .artgrid [data-act="slotArt"][data-v="tuna"]'); if (b) b.click(); });
  await page.waitForTimeout(250);
  const h3 = await slotRead(IDS);
  T(h3.n === 3 && h3.slots.indexOf('tuna') >= 0 && h3.knownN === 3,
    'H3 装回复原（H2 是点击改态、不是判据本身：不还原则后面几组看到的槽形与本批 fixture 不同）',
    '槽=' + h3.n + ' slots=' + h3.slots.join('/') + ' 已学会=' + h3.knownN);

  /* ── N6 点法器标签：只渲染法器段 + 滚动归零（先滚深再切，验「切段等价换页」）── */
  await page.evaluate(() => { const b = document.querySelector('.tabbody'); b.scrollTop = 600; });
  await page.waitForTimeout(120);
  const deep = await page.evaluate(() => document.querySelector('.tabbody').scrollTop);
  await page.evaluate(() => document.querySelector('#tab-arts > .lawchips button[data-v="qi"]').click());
  await page.waitForTimeout(300);
  const c1 = await page.evaluate(chipState);
  T(c1.on === 'qi' && c1.secIds.join(',') === 'lawsec-qi' && c1.marks.qi && c1.marks.codex &&
    !c1.marks.fa && !c1.marks.selflearn && !c1.marks.grid && !c1.marks.grouper,
    'N6a 点法器标签 → 法器段在位、**功法段整体缺席**、恰一枚段标',
    'on=' + c1.on + ' sec=' + c1.secIds.join(','));
  T(deep > 0 && c1.scroll === 0, 'N6b 切标签后滚动归零（不留在新段的中间当开头）', 'before=' + Math.round(deep) + ' after=' + Math.round(c1.scroll));
  T(c1.innerPos.length === 0, 'N6c 法器标签下融合坛那排 chip 随之消失（缺席面：功法段元素一个不留）',
    '内层 chips=' + c1.innerPos.length);

  /* ── A5 器段：卡片网格（原「法器页」断言，容器 #tab-gear → #tab-arts，需先切到法器标签）── */
  const gear = await page.evaluate(() => {
    const g = document.querySelector('#tab-arts .geargrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      cards: document.querySelectorAll('#tab-arts .geargrid > .tcard').length,
      goneTabGear: !document.getElementById('tab-gear')
    };
  });
  T(gear.goneTabGear, 'A5 `#tab-gear` 容器已删除（无悬挂节点）');
  T(gear.hasGrid && gear.cols >= 2, 'A5b 器段为卡片网格（宽屏 ≥2 列）', 'cols=' + gear.cols);
  T(gear.cards >= 4, 'A5c 器段每槽一卡（4 槽全在）', 'n=' + gear.cards);

  /* ── N7 切回功法标签（对称面）+ N8 跨 tab 保持（`ui.lawChip` 不被 renderTab 重置）── */
  await page.evaluate(() => document.querySelector('#tab-arts > .lawchips button[data-v="fa"]').click());
  await page.waitForTimeout(300);
  const c2 = await page.evaluate(chipState);
  T(c2.on === 'fa' && c2.secIds.join(',') === 'lawsec-fa' && !c2.marks.qi,
    'N7 切回功法标签 → 段体对称互换（法器段又整体缺席）', 'on=' + c2.on + ' sec=' + c2.secIds.join(','));
  await page.evaluate(() => document.querySelector('#tab-arts > .lawchips button[data-v="qi"]').click());
  await page.waitForTimeout(200);
  await page.click('#m-tabbar button:has-text("修行")');
  await page.waitForTimeout(300);
  await page.click('#m-tabbar button:has-text("法与器")');
  await page.waitForTimeout(400);
  const c3 = await page.evaluate(chipState);
  T(c3.on === 'qi' && c3.marks.qi, 'N8 离开再回来标签仍是法器段（`ui.lawChip` 在内存、由 renderTab 复用，不被每秒重渲染抢回）',
    'on=' + c3.on);

  /* ── A6 lawJump 概览条格（标签化后语义）：目标段未选中 → 切标签并回顶；已选中 → 不切标签 ──
   * 口径变更（标签化批）：原「点格 → 器段滚入可视区」在本批结构下**必然失效**——法器段在功法标签下根本不在 DOM 里，
   * 于是「点佩器格」的正确行为改成了切标签。断言随之改挂「切段」而非「滚动距离」，
   * 并保留一条「同段再点不切标签」防退化成来回抖动重渲染。
   * 旧口径修正记录（2026-10-07 · 界面层首次实跑抓获的测试缺陷，非产品缺陷）：平滑滚动落点随可滚程变化，
   * 判据须轮询至 scrollTop 落定再测，不能写死 ±40px 对齐。 */
  await page.evaluate(() => { const b = document.querySelector('.tabbody'); b.scrollTop = 400; });
  const jump = await page.evaluate(async () => {
    const box = document.querySelector('.tabbody');
    const before = box.scrollTop;
    const onBefore = document.querySelector('#tab-arts > .lawchips button.on').dataset.v;
    document.querySelectorAll('#tab-arts .laware button')[0].click();   /* 主修格 = data-v fa（当前 qi 标签 ⇒ 应切标签） */
    let last = -1, cur = box.scrollTop, stable = 0;
    for (let i = 0; i < 80 && stable < 2; i++) {
      await new Promise((r) => setTimeout(r, 50));
      cur = box.scrollTop;
      if (cur === last) stable++; else stable = 0;
      last = cur;
    }
    const anchor = document.getElementById('lawsec-fa');
    const br = box.getBoundingClientRect();
    return {
      before, after: cur, onBefore,
      onAfter: document.querySelector('#tab-arts > .lawchips button.on').dataset.v,
      secIds: Array.prototype.map.call(document.querySelectorAll('#tab-arts .secdiv'), (x) => x.id).join(','),
      relTop: anchor ? Math.round(anchor.getBoundingClientRect().top - br.top) : -99999,
      clientHeight: Math.round(box.clientHeight),
      maxScroll: Math.round(box.scrollHeight - box.clientHeight)
    };
  });
  T(jump.onBefore === 'qi' && jump.onAfter === 'fa' && jump.secIds === 'lawsec-fa' && jump.after === 0,
    'A6 概览条「主修」格在法器标签下 = 切回功法标签并回顶', 'chip ' + jump.onBefore + '→' + jump.onAfter + ' scroll=' + Math.round(jump.after));
  /* 同段再点：标签不动（不重渲染），滚动仍归位到段标——`lawJump` 的旧职责在标签化后**只剩这一半**，
   * 所以这条按「从深处滚回锚点可视带」实跑判据（口径承 2026-10-07 那次修正：轮询落定 + 可视带，不写死 ±40 对齐）。 */
  const same = await page.evaluate(async () => {
    const box = document.querySelector('.tabbody');
    box.scrollTop = 500;
    const deep = box.scrollTop;
    document.querySelectorAll('#tab-arts .laware button')[0].click();   /* 主修格 = data-v fa，当前已在 fa */
    let last = -1, cur = box.scrollTop, stable = 0;
    for (let i = 0; i < 80 && stable < 2; i++) {
      await new Promise((r) => setTimeout(r, 50));
      cur = box.scrollTop;
      if (cur === last) stable++; else stable = 0;
      last = cur;
    }
    const anchor = document.getElementById('lawsec-fa');
    const br = box.getBoundingClientRect();
    return {
      deep, after: Math.round(cur),
      on: document.querySelector('#tab-arts > .lawchips button.on').dataset.v,
      sec: Array.prototype.map.call(document.querySelectorAll('#tab-arts .secdiv'), (x) => x.id).join(','),
      relTop: anchor ? Math.round(anchor.getBoundingClientRect().top - br.top) : -99999,
      clientHeight: Math.round(box.clientHeight),
      maxScroll: Math.round(box.scrollHeight - box.clientHeight)
    };
  });
  T(same.on === 'fa' && same.sec === 'lawsec-fa', 'A6b 同段再点概览条 = 不切标签、不重渲染（防退化成来回抖页）',
    'chip=' + same.on + ' sec=' + same.sec);
  T(same.deep > 0 && same.after < same.deep && same.relTop >= -40 && same.relTop < same.clientHeight,
    'A6c 同段点格仍滚到段标（从 scrollHeight 深处回到锚点可视带；够不着则钳位仍可见）',
    'deep=' + same.deep + '→' + same.after + ' relTop=' + same.relTop + ' 可视高=' + same.clientHeight + ' maxScroll=' + same.maxScroll);

  /* ── A7 法宝页：卡片网格（独立成页，断言不变）── */
  await page.click('#m-tabbar button:has-text("法宝")');
  await page.waitForTimeout(400);
  const tr = await page.evaluate(() => {
    const g = document.querySelector('#tab-treasure .trgrid');
    return {
      hasGrid: !!g,
      cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      cards: document.querySelectorAll('#tab-treasure .trgrid > .tcard').length
    };
  });
  T(tr.hasGrid && tr.cols >= 2, 'A7 法宝页为卡片网格（宽屏 ≥2 列）', 'cols=' + tr.cols);
  T(tr.cards >= 3, 'A7b 法宝栏每槽一卡（≥3 卡）', 'n=' + tr.cards);

  /* ── A7c 认主进度按件（N52 · 第册十二批）：卡上那句「这件还差约 N 小时」的数字必须
   * **等于页内现算的 `SQ.Treasures.bondHoursLeft`**（公式只许在引擎那一处，视图抄第二份即说谎），
   * 且满阶那件**不出现**这句（反例：空集上的「都在」恒真）。 ── */
  const bond = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId], p = SQ.Worlds.xiuxian.pack;
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-treasure .trgrid > .tcard'));
    const txt = c => (c ? (c.textContent || '').replace(/\s+/g, ' ') : '');
    const ent = id => (w.treasures.owned.filter(e => e.id === id)[0]) || null;
    const cardOf = id => cards.filter(c => txt(c).indexOf(SQ.t('treasure.' + id + '.name', null, 'xiuxian')) >= 0)[0] || null;
    const e1 = ent('x02'), e2 = ent('x04');
    const left = SQ.Treasures.bondHoursLeft(p, e1);
    const t1 = txt(cardOf('x02')), t2 = txt(cardOf('x04'));
    const m = t1.match(/还差约\s*(\d+)\s*小时/) || [];
    return { left: left, onScreen: m[1] || '', hit: t1.indexOf('还差约') >= 0,
      hitMax: t2.indexOf('还差约') >= 0, leftMax: SQ.Treasures.bondHoursLeft(p, e2),
      want: SQ.t('treasure.bond.left', { n: left }, 'xiuxian'), inCard: t1.indexOf(SQ.t('treasure.bond.left', { n: left }, 'xiuxian')) >= 0,
      s1: t1.slice(0, 150), s2: t2.slice(0, 80), found: !!cardOf('x02') && !!cardOf('x04') };
  });
  T(bond.found && bond.left > 0 && Number(bond.onScreen) === bond.left && bond.hit && bond.inCard,
    'A7c 未满阶那件的「这件还差约 N 小时」=== 页内 bondHoursLeft 现算值（整句取词表、视图零自造公式）',
    '屏=' + bond.onScreen + ' 引擎=' + bond.left + ' 整句在卡=' + bond.inCard + ' ‖ ' + bond.s1);
  T(bond.hitMax === false && bond.leftMax === 0,
    'A7d 反例：已满阶那件卡上不出现这句（引擎取数口对它回 0）——否则「按件停表」只在数上成立、屏上仍在催',
    '满阶卡=' + bond.s2 + ' 命中=' + bond.hitMax + ' leftMax=' + bond.leftMax);

  /* ── A8 窄屏：器段退单列 + **导航零截断**（横向滚动修复的验收点）── */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.click('#m-tabbar button:has-text("法与器")');
  await page.waitForTimeout(300);
  /* 标签化后两段互斥：量器段网格前必须先切到法器标签（否则 `.geargrid` 根本不在 DOM 里） */
  await page.evaluate(() => {
    const q = document.querySelector('#tab-arts > .lawchips button[data-v="qi"]');
    if (q) q.click();
  });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => {
    const g = document.querySelector('#tab-arts .geargrid');
    const btns = Array.prototype.slice.call(document.querySelectorAll('#m-tabbar button'));
    const bar = document.getElementById('m-tabbar');
    return {
      gearCols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0,
      lawCols: getComputedStyle(document.querySelector('#tab-arts .laware')).gridTemplateColumns.split(' ').length,
      chipPos: getComputedStyle(document.querySelector('#tab-arts > .lawchips')).position,
      /* 截断判据：内容宽 > 可视宽即被 ellipsis 截（旧 flex:1 布局下 12 项每项 ≈25px，两字标签 ≈24px + padding 必截） */
      clipped: btns.filter((b) => b.scrollWidth > b.clientWidth + 1).map((b) => b.textContent.trim()),
      scrollable: bar.scrollWidth > bar.clientWidth,
      barOverflowX: getComputedStyle(bar).overflowX
    };
  });
  T(narrow.gearCols === 1, 'A8 窄屏器段网格退单列', 'cols=' + narrow.gearCols);
  T(narrow.lawCols === 1, 'A8b 窄屏概览条退单列（≤400px 媒体查询）', 'cols=' + narrow.lawCols);
  T(narrow.chipPos === 'sticky', 'A8c 窄屏标签行仍吸顶（与宽屏同一条规则，非按断点复制）', 'pos=' + narrow.chipPos);
  T(narrow.clipped.length === 0, 'A8d 窄屏导航**零标签截断**（横向滚动修复生效；旧 flex:1 布局下此处必挂）',
    narrow.clipped.length ? '被截: ' + narrow.clipped.join(',') : 'clean');
  T(narrow.barOverflowX === 'auto' && narrow.scrollable, 'A8e 窄屏导航条为横向滚动容器且确有可滚内容',
    'overflow-x=' + narrow.barOverflowX + ' scrollable=' + narrow.scrollable);

  /* ── A9 窄屏法宝页退单列（切回激活再量：隐藏面板无法解析网格列）── */
  await page.click('#m-tabbar button:has-text("法宝")');
  await page.waitForTimeout(300);
  const narrowTr = await page.evaluate(() => {
    const t = document.querySelector('#tab-treasure .trgrid');
    return { cols: t ? getComputedStyle(t).gridTemplateColumns.split(' ').length : 0 };
  });
  T(narrowTr.cols === 1, 'A9 窄屏法宝网格退单列', 'cols=' + narrowTr.cols);

  /* ── A10 旧档 tabOrder 含 'gear'：由「未知 id 剔除」自动清掉，导航不崩不多项、其余项相对序保留 ──
   * 口径修正（2026-10-07 · 界面层首次实跑抓获的**测试骨架缺陷**，非产品缺陷）：
   *   原写法「先 evaluate 改 localStorage、再 page.reload()」读到的是**默认序**——
   *   `ctx.addInitScript` 每次导航都会重跑，用建场时的原始存档（`tabOrder: []`）把刚写入的顺序整个冲掉，
   *   于是 A10c 必红（实测 head4 = idle,combat,arts,treasure 即默认序，而非产品重排）。
   *   产品行为已用独立探针复核为**正确**：以 preset 存档首次加载时实测 head4 = idle,arts,combat,treasure、12 项、未知 id 全剔。
   * 现改为「带旧档 tabOrder 的存档首次加载」：另开一个 context 注入 preset，不再依赖 reload 后的 localStorage 改写。 */
  const saveLegacy = JSON.parse(JSON.stringify(save));
  /* 旧档实态：gear 排在 arts 之后（合并前的默认序），另塞一个从不存在的 id 一并验剔除 */
  saveLegacy.settings.tabOrder = ['idle', 'arts', 'gear', 'combat', 'nosuchtab', 'treasure'];
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx2.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveLegacy);
  const page2 = await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push(e.message));
  await page2.goto(url);
  page2.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page2.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page2.waitForTimeout(700);
  const afterLegacy = await page2.evaluate(() => {
    const bar = document.getElementById('m-tabbar');
    const kids = Array.prototype.slice.call(bar.children);
    const sep = kids.findIndex((x) => x.classList.contains('navsep'));
    const game = kids.slice(0, sep).filter((x) => x.tagName === 'BUTTON');
    return {
      nGame: game.length,
      ids: game.map((x) => x.dataset.v),
      /* 前四项应保留旧档相对序（idle → arts → combat → treasure），gear / nosuchtab 被剔除后由默认序补齐其余 */
      head4: game.slice(0, 4).map((x) => x.dataset.v).join(','),
      persisted: JSON.stringify((JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}').settings || {}).tabOrder || [])
    };
  });
  T(afterLegacy.nGame === 12, 'A10 旧档 tabOrder 含 `gear` → 导航仍 12 项（不多项不崩）', 'n=' + afterLegacy.nGame);
  T(afterLegacy.ids.indexOf('gear') < 0 && afterLegacy.ids.indexOf('nosuchtab') < 0,
    'A10b 未知 id（gear / nosuchtab）被剔除', afterLegacy.ids.join(','));
  T(afterLegacy.head4 === 'idle,arts,combat,treasure',
    'A10c 旧档相对序保留（gear 剔除后其余项顺延，不重排）', 'nav=' + afterLegacy.head4 + ' 落盘=' + afterLegacy.persisted);
  /* 🆕 标签化批的兼容性追问：`ui.lawChip` 只在内存 ⇒ 切过标签再落盘，存档里也**不该多出这个键**。
   * 非空观测先行（本仓教训：`⊆ 空集` 式判据恒真）——先在旧档页面上**真把标签切到法器段**并验切换生效，
   * 再验「写口确实跑过」（`settings.tabOrder` 已落盘 = 有真档）+ 全档搜不到 `lawChip`。 */
  await page2.click('#m-tabbar button:has-text("法与器")');
  await page2.waitForTimeout(400);
  const chipOn2 = await page2.evaluate(async () => {
    document.querySelector('#tab-arts > .lawchips button[data-v="qi"]').click();
    await new Promise((r) => setTimeout(r, 250));
    return {
      on: document.querySelector('#tab-arts > .lawchips button.on').dataset.v,
      gear: !!document.querySelector('#tab-arts .geargrid')
    };
  });
  T(chipOn2.on === 'qi' && chipOn2.gear, 'A10d 旧档（无 `lawChip` 键）加载后标签照样可切到法器段',
    'on=' + chipOn2.on + ' geargrid=' + chipOn2.gear);
  const lawChipLeak = await page2.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    return {
      wrote: !!(s.profile && s.worlds && s.worlds.xiuxian),
      leaked: JSON.stringify(s).indexOf('lawChip') >= 0
    };
  });
  T(lawChipLeak.wrote && !lawChipLeak.leaked,
    'A10e 切过标签后落盘的存档里搜不到 `lawChip`（纯 UI 态不入 schema；先证「确有真档」再证「不含该键」）',
    'wrote=' + lawChipLeak.wrote + ' leaked=' + lawChipLeak.leaked);
  await ctx2.close();

  /* ── S 组（2026-10-15 · 用户报「当前存档下法与器页打不开」）──
   * 融合自创部**允许没有签名词条**（`fusion.js:243` 起 `var special = null`、`:272` 原样入档、`:52` normalize 也只认
   * 「对象且有 pool」）⇒ `special:null` 是合法存档态。旧视图三处裸读 `a.special.pool`（详情浮层 / 槽内小卡 / 已学会卡），
   * 拿真档复现 = `TypeError: Cannot read properties of null (reading 'pool')`，**整页 innerText 归零**（不是少一张卡）。
   * ⚠️ 在册走查原先测不出来的原因有两条：① 没有任何 fixture 带自创部；② **从不打开 `#modal-arts` 详情浮层**。S4 补第二段。 */
  const saveCustom = JSON.parse(JSON.stringify(save));
  const wfC = saveCustom.worlds.xiuxian;
  wfC.fusion = { lastFuseAt: 0, lastReforgeAt: 0, meditate: null, seq: 1, customs: [{
    id: 'c1', name: '无名残卷', gen: 1, tier: 1, attr: 'qi', align: 'neutral',
    effects: { qiRate: 0.02 }, special: null,
    parents: [{ id: 'tuna', name: '吐纳法', tier: 0 }, { id: 'juling', name: '聚灵诀', tier: 0 }],
    createdAt: Date.now()
  }] };
  wfC.artsKnown = (wfC.artsKnown || []).concat(['c1']);
  wfC.artsLevels = wfC.artsLevels || {}; wfC.artsLevels.c1 = 2;
  wfC.artsSlots = (wfC.artsSlots || []).concat(['c1']);      /* 入槽才走得到「槽内小卡」那一处裸读 */
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx3.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveCustom);
  const page3 = await ctx3.newPage();
  const errors3 = [];
  page3.on('pageerror', (e) => errors3.push(String(e.message || e)));
  page3.on('console', (m) => { if (m.type() === 'error') errors3.push(m.text()); });
  await page3.goto(url);
  await page3.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page3.click('#m-tabbar button:has-text("法与器")');
  await page3.waitForTimeout(600);
  const sRead = await page3.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .tcard'));
    const mine = cards.filter((x) => (x.innerText || '').indexOf('无名残卷') >= 0)[0];
    const arts = document.getElementById('tab-arts');
    return {
      len: arts ? (arts.innerText || '').trim().length : -1, n: cards.length, found: !!mine,
      text: mine ? (mine.innerText || '').replace(/\s+/g, ' ').trim() : '',
      tdesc: mine ? (((mine.querySelector('.tdesc') || {}).textContent) || '') : ''
    };
  });
  T(errors3.length === 0 && sRead.len > 200 && sRead.n >= 3,
    'S1 档里有一部「无签名词条」的自创部时，法与器页照样渲染（旧形状 = 整页空白 + pageerror）',
    'len=' + sRead.len + ' 卡=' + sRead.n + ' err=' + (errors3[0] || 'none'));
  T(sRead.found && sRead.text.indexOf('Lv2') >= 0 && sRead.tdesc.trim().length > 0,
    'S2 那张自创部的卡确实上屏：Lv 在位、副行退到功法描述而不是空着', 'found=' + sRead.found + ' tdesc=' + sRead.tdesc.slice(0, 18));
  T(sRead.found && sRead.text.indexOf('签名') < 0 && !/undefined|\{|null/.test(sRead.text),
    'S3 无词条的卡不许编造「签名 ·」，也不许露 undefined / null / { 占位', sRead.text.slice(0, 52));
  await page3.evaluate(() => { const b = document.querySelector('[data-act="openArtsModal"]'); if (b) b.click(); });
  await page3.waitForTimeout(500);
  const sModal = await page3.evaluate(() => {
    const m = document.getElementById('modal-arts');
    const txt = m && !m.classList.contains('hide') ? (m.innerText || '') : '';
    const rows = txt.split('\n').filter((l) => l.indexOf('无名残卷') >= 0);
    return { open: txt.length > 0, has: txt.indexOf('无名残卷') >= 0, row: rows.join(' / ').replace(/\s+/g, ' ').slice(0, 60) };
  });
  T(sModal.open && sModal.has && errors3.length === 0,
    'S4 功法详情浮层能列出这部自创部（在册走查原先从不打开这层 = 第二个裸读点无射程）',
    'open=' + sModal.open + ' has=' + sModal.has + ' err=' + (errors3[1] || errors3[0] || 'none'));
  T(sModal.row.indexOf('签名') < 0, 'S4b 浮层那行同样不编造签名（`arts.special` 标签只在有词条时出现）', sModal.row || '(无该行)');
  await ctx3.close();

  /* ── F 组（2026-10-15 第卌三批 · 用户报「已学会的功法也要能按品阶筛选，方便快速查找」）──
   * 实现口径 = 图鉴那排 chip **升格为整段筛选器**（已学会 + 图鉴共用同一枚 ui.artsGroupVal），
   * 零新状态零新词表键。判据要证四件事：默认不筛（整页形状不变）‖ 筛后卡集恰等于该阶子集
   * ‖ 筛空了不许说「尚未学会」（那是「一部都没学」的话，不是「这一阶没有」的话）
   * ‖ chip 行 DOM 序已上移到「已学会」之前（否则筛选器在它管的列表下面）。 */
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx4.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page4 = await ctx4.newPage();
  const errors4 = [];
  page4.on('pageerror', (e) => errors4.push(String(e.message || e)));
  page4.on('console', (m) => { if (m.type() === 'error') errors4.push(m.text()); });
  await page4.goto(url);
  await page4.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page4.click('#m-tabbar button:has-text("法与器")');
  await page4.waitForTimeout(600);
  const fRead = () => page4.evaluate(() => {
    const grid = document.querySelector('#tab-arts .artgrid');
    const cards = Array.prototype.slice.call(grid ? grid.querySelectorAll('.tcard') : []);
    const heads = Array.prototype.slice.call(document.querySelectorAll('#tab-arts .sechead .t'));
    const knownEl = heads.filter((x) => x.textContent.replace(/\s+/g, '').indexOf('已学会') >= 0)[0];
    const grp = document.querySelector('#tab-arts .grouper');
    const onEl = document.querySelector('#tab-arts .gchip.on');
    const txts = heads.map((x) => x.textContent.trim());
    return {
      n: cards.length,
      names: cards.map((x) => {
        const tn = x.querySelector('.tname');
        return tn && tn.firstChild ? String(tn.firstChild.textContent).trim() : '';
      }),
      on: onEl ? (onEl.dataset.v || '') : '',
      knownHead: knownEl ? knownEl.textContent.trim() : '',
      /* 筛选条必须在「已学会」段标**之前**（它现在管两段）：用 DOM 位置关系判，不靠字符串顺序 */
      before: !!(grp && knownEl && (grp.compareDocumentPosition(knownEl) & Node.DOCUMENT_POSITION_FOLLOWING) > 0),
      heads: txts.join('|'),
      tierHeads: txts.filter((x) => x.indexOf('字阶') >= 0).length,
      emptyLine: (document.getElementById('tab-arts').innerText || '').indexOf('尚未学会') >= 0
    };
  });
  const f0 = await fRead();
  T(errors4.length === 0 && f0.n === 3 && f0.on === '' && f0.tierHeads === 4,
    'F1 默认态不筛：已学会恰三张卡（fixture 3 部）+ 无选中 chip + 图鉴四阶小节齐',
    'cards=' + f0.n + ' on=' + f0.on + ' 阶节=' + f0.tierHeads + ' err=' + (errors4[0] || 'none'));
  T(f0.before, 'F2 筛选条 DOM 序在「已学会」段标之前（它现在管两段，不能沉在列表下面）', 'before=' + f0.before);
  await page4.click('#tab-arts .gchip[data-v="huang"]');
  await page4.waitForTimeout(400);
  const fH = await fRead();
  T(fH.n === 2 && fH.names.join(',') === '吐纳法,聚灵诀' && fH.knownHead.indexOf('· 2') >= 0,
    'F3 点「黄」⇒ 已学会只剩两部黄阶（段标计数同步到 2、太上忘情篇被滤掉）',
    'cards=' + fH.n + ' [' + fH.names.join('/') + '] head=' + fH.knownHead);
  T(fH.tierHeads === 1 && fH.heads.indexOf('黄字阶') >= 0,
    'F4 图鉴同步只剩黄阶一节（同一段筛选器，两段不许各筛各的）', '阶节=' + fH.tierHeads + ' ' + fH.heads.slice(0, 60));
  await page4.click('#tab-arts .gchip[data-v="xuan"]');
  await page4.waitForTimeout(400);
  const fX = await fRead();
  T(fX.n === 0 && !fX.emptyLine && fX.knownHead.indexOf('· 0') >= 0,
    'F5 筛到空的一阶：零卡且**不说「尚未学会」**（那是「一部都没学」的话）；段标计数 0 即为交代',
    'cards=' + fX.n + ' emptyLine=' + fX.emptyLine + ' head=' + fX.knownHead);
  await page4.click('#tab-arts .gchip[data-v="xuan"]');
  await page4.waitForTimeout(400);
  const fBack = await fRead();
  T(fBack.n === 3 && fBack.on === '', 'F6 再点同枚 chip 取消筛选 ⇒ 回到三张（toggle 语义与图鉴原口径一致）',
    'cards=' + fBack.n + ' on=' + fBack.on);
  await page4.click('#tab-arts .gseg [data-v="align"]');
  await page4.waitForTimeout(300);
  await page4.click('#tab-arts .gchip[data-v="evil"]');
  await page4.waitForTimeout(400);
  const fE = await fRead();
  T(fE.n === 1 && fE.names[0] === '太上忘情篇', 'F7 换「阵营」维点魔 ⇒ 已学会只剩那部魔道功法（双维共用同一枚选中值）',
    'cards=' + fE.n + ' [' + fE.names.join('/') + ']');
  const fLeak = await page4.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    return { wrote: !!(s.profile && s.worlds && s.worlds.xiuxian), leaked: JSON.stringify(s).indexOf('artsGroup') >= 0 };
  });
  T(fLeak.wrote && !fLeak.leaked, 'F8 筛过之后落盘存档搜不到 `artsGroup`（筛选是看态不是角色态，与 lawChip 同纪律）',
    'wrote=' + fLeak.wrote + ' leaked=' + fLeak.leaked);
  T(errors4.length === 0, 'F9 整组零页面报错', errors4.join('|').slice(0, 150) || 'clean');
  await ctx4.close();

  /* ── G 组（2026-10-16 第卌六批 · 用户反馈「在坊市购买功法后，功法未出现在功法页面」）──
   * 实况：那部《聚仙幡》要求 karma ≤ −300，玩家 karma 未达 ⇒ 引擎把它放进**待修习架**（货没丢），
   * 但整页只有头部「待修习架 N/24」一个计数、清单要逐部点开图鉴 ⇒ 玩家只当丢了。
   * 本组判据证四件事：架上有专属一段且写清缺哪项 ‖ 与已学会/图鉴共用同一枚 chip 筛选（不另立一套）
   * ‖ 弃置按钮在这一段里点得动且点完这段消失（空集不渲染）‖ 坊市确认框先把去向说一句、取消不扣钱。 */
  const saveShelf = JSON.parse(JSON.stringify(save));
  /* 架上故意塞一枚**认不出的 id**（旧档 / 退役功法留下的脏位）：视图必须先滤，
   * 否则 `am[x].tier` 裸读会把整页炸空——这正是第卌批「自创部 special:null」那一形。 */
  saveShelf.worlds.xiuxian.shelf = ['juxian', 'zz_no_such_art'];
  saveShelf.worlds.xiuxian.stones = 5000;
  saveShelf.worlds.xiuxian.shop.items = [{ kind: 'arts', ref: 'juxian', price: 999, sold: false }];
  saveShelf.worlds.xiuxian.shop.nextRestock = Date.now() + 4 * 3600 * 1000;   /* 别让秒级 tick 中途换架（第廿六批那族竞态） */
  const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx5.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, saveShelf);
  const page5 = await ctx5.newPage();
  const errors5 = [];
  page5.on('pageerror', (e) => errors5.push(String(e.message || e)));
  page5.on('console', (m) => { if (m.type() === 'error') errors5.push(m.text()); });
  await page5.goto(url);
  await page5.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page5.click('#m-tabbar button:has-text("法与器")');
  await page5.waitForTimeout(600);
  const shelfRead = () => page5.evaluate(() => {
    /* 按专名类取（`.sechead` + 文案匹配会撞上图鉴那几节的既有段标 `待修习架 · X字阶`） */
    const head = document.querySelector('#tab-arts .shelfsec .t');
    const grid = document.querySelector('#tab-arts .shelfgrid');
    const rows = Array.prototype.slice.call(grid ? grid.querySelectorAll('.lrow') : []);
    const txt = rows.map((r) => r.textContent.replace(/\s+/g, ' ').trim()).join(' § ');
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    const w = (st.worlds || {}).xiuxian || {};
    const onEl = document.querySelector('#tab-arts .gchip.on');
    return {
      head: !!head && rows.length > 0, headTxt: head ? head.textContent.trim() : '',
      rows: rows.length, txt,
      on: onEl ? String(onEl.dataset.v || '') : '', shelf: (w.shelf || []).join(','), stones: w.stones || 0
    };
  });
  const g0 = await shelfRead();
  T(errors5.length === 0 && g0.head && g0.rows === 1 && g0.txt.indexOf('聚仙幡') >= 0 &&
    g0.txt.indexOf('待复检') >= 0 && g0.txt.indexOf('{') < 0 && g0.txt.indexOf('弃置') >= 0 &&
    g0.headTxt.indexOf('· 1') >= 0,
    'G1 架上段：段标计数 1（**脏位已滤**，fixture 塞了两枚只认得一枚）+ 名号 + 未达标徽标 + 缺项非空零花括号 + 弃置在位',
    'head=' + g0.headTxt + ' rows=' + g0.rows + ' txt=' + g0.txt.slice(0, 120) + ' err=' + (errors5[0] || 'none'));
  await page5.click('#tab-arts .gchip[data-v="huang"]');
  await page5.waitForTimeout(400);
  const gHuang = await shelfRead();
  await page5.click('#tab-arts .gchip[data-v="tian"]');
  await page5.waitForTimeout(400);
  const gTian = await shelfRead();
  T(!gHuang.head && gTian.head && gTian.rows === 1,
    'G2 架上段跟着同一枚 chip 走（筛「黄」整段消失、筛「天」回来）——不许长出第二套筛选状态',
    '黄=' + gHuang.head + ' 天=' + gTian.head + '/' + gTian.rows);
  await page5.click('#tab-arts .gchip[data-v="tian"]');
  await page5.waitForTimeout(300);
  const stonesBefore = (await shelfRead()).stones;
  await page5.click('#tab-arts .shelfgrid button[data-act="salvageArt"]');
  await page5.waitForSelector('#modal-confirm:not(.hide)', { timeout: 8000 });
  await page5.click('#cf-ok');
  await page5.waitForTimeout(700);
  const gAfter = await shelfRead();
  T(gAfter.shelf.indexOf('juxian') < 0 && gAfter.stones > stonesBefore && !gAfter.head,
    'G3 在这一段里点「弃置」→ 确认后那部离开架上、灵石回账，且**只剩脏位的架子不再渲染段标**（空段不留标）',
    'shelf=' + (gAfter.shelf || '空') + ' stones ' + stonesBefore + '→' + gAfter.stones + ' head=' + gAfter.head);
  await page5.click('#m-tabbar button:has-text("坊市")');
  await page5.waitForTimeout(600);
  const buyBtn = page5.locator('#tab-shop button[data-act="buy"][data-v="0"][data-b="0"]');
  const hasBuy = (await buyBtn.count()) > 0;
  const stPreBuy = (await shelfRead()).stones;   /* 基线取当下值（G3 的弃置已回账），不是最初的 5000 */
  if (hasBuy) await buyBtn.first().click();
  await page5.waitForTimeout(500);
  const cfTxt = hasBuy ? await page5.evaluate(() => document.getElementById('cf-text').textContent) : '';
  T(hasBuy && cfTxt.indexOf('聚仙幡') >= 0 && cfTxt.indexOf('待修习架') >= 0,
    'G4 坊市买**要求未达**的功法，确认框就把去向说一句（原话只写价格，成交后屏上无痕）',
    'hasBuy=' + hasBuy + ' cf=' + cfTxt.replace(/\s+/g, ' ').slice(0, 150));
  if (hasBuy) { await page5.click('#cf-cancel'); await page5.waitForTimeout(400); }
  const gCancel = await shelfRead();
  T(gCancel.stones === stPreBuy,
    'G5 取消这单分文不动（提示语不许变成新的扣钱路径）',
    'stones=' + gCancel.stones + ' 期望=' + stPreBuy);
  T(errors5.length === 0, 'G6 整组零页面报错', errors5.join('|').slice(0, 150) || 'clean');
  await ctx5.close();

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_ARTS_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ARTS_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
