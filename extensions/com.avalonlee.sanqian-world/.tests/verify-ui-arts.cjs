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
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
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
    gBy.tuna.upgradeBtns === 1,
    'A11g Lv9 即满级：满级卡无升级钮且显「满级」，未满级卡仍有升级钮（9 级再升 = max）',
    'Lv9钮=' + gBy.emotionless.upgradeBtns + ' Lv3钮=' + gBy.tuna.upgradeBtns + ' 文本含满级=' + (gBy.emotionless.txt.indexOf(gain.maxTxt) >= 0));

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

  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_ARTS_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_ARTS_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
