/* .tests/verify-ui-chains.cjs — 「绿灯不等于链通」四死链补口的界面走查（playwright-core + Edge headless）
 * 覆盖四条此前玩家不可达的链（本批修复）：
 *   C1 功法满槽「原位替换」——引擎支路 + handler + 文案俱全，只缺渲染点：
 *      满槽点「装入」→ 抉择横幅 + 每格「替换」按钮 → 点第 1 位 → 落点仍是第 1 位（主修语义保住）。
 *   C2 遗泽收支流水——meta.karmaLog 一直写了没人读：轮回页现在按**事件**渲染五类 reason
 *      （同 reason + 同 ts 折一行，第廿八批；一次转世结算在旧口径下会占满 20 行窗口）。
 *   C3 炼丹/炼器失败原因——alchemy.ui.fail.* 整族无键 ⇒ 裸英文上屏：现在前置不齐即置灰 + 人话说明，
 *      且真失败（连点造成的陈旧渲染态）toast 也零裸拉丁。
 *   C4 日志分类缺 3 类——combat / cave / shop 有写口无筛选项：现在三张新 tag 各自筛得出自己的行。
 * 纪律（本仓踩过的坑）：页内 state 是 IIFE 私有 ⇒ 一律读 localStorage['sanqian-state-v1']；
 *   轮询而非固定 sleep；断言取「命中 + 不串类」而非绝对条数（tick 会随时补日志）。
 * 依赖：playwright-core；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-chains.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

const KEY = 'sanqian-state-v1';

async function buildSave() {
  const { load } = require(path.join(__dirname, 'sandbox.cjs'));
  const { sandbox } = load([]);
  const SQ = sandbox.window.SQ;
  const D = SQ.XDATA;
  const pack = SQ.Worlds.xiuxian.pack;
  const now = Date.now();

  const ws = pack.normalize({});
  ws.realm = 5; ws.stones = 5000; ws.qi = 1000; ws.total = 1000; ws.mode = 'seclude';
  (D.ATTRS || []).forEach(function (a) { ws.attrs[a] = 20; });

  /* C1：满 6 槽 + 手上第 7 部（未上槽） */
  const cands = Object.keys(pack.artsMap()).filter(function (id) { return SQ.Arts.canLearn(ws, pack, D, id); });
  ws.artsKnown = cands.slice(0, 7);
  ws.artsSlots = ws.artsKnown.slice(0, 6);
  ws.artsLevels = {}; ws.artsKnown.forEach(function (id) { ws.artsLevels[id] = 2; });
  const pending = ws.artsKnown[6];
  const displaced = ws.artsSlots[0];

  /* C3：一条丹方材料刚好够（正常路径不误伤）、另一条一律缺料——两方材料集必须不相交，
   * 否则授料会顺带把「缺料方」也喂饱（走查首轮就是这样假绿的）。 */
  const AD = D.ALCHEMY;
  const openable = AD.RECIPES.filter(function (r) { return ws.realm >= r.realm; });
  let recEnough = null, recPoor = null;
  for (let a = 0; a < openable.length && !recEnough; a++) {
    for (let b = 0; b < openable.length; b++) {
      if (a === b) continue;
      const ai = openable[a].mats.map((m) => m[0]);
      const bi = openable[b].mats.map((m) => m[0]);
      if (ai.some((x) => bi.indexOf(x) >= 0)) continue;
      recEnough = openable[a]; recPoor = openable[b]; break;
    }
  }
  ws.alchemy = SQ.Alchemy.normalize(
    { furnace: true, recipes: [recEnough.id, recPoor.id],
      blueprints: ['bp_weapon', 'bp_armor', 'bp_weapon_jing', 'bp_furnace'] }, D);
  ws.materials = {};
  recEnough.mats.forEach(function (mm) { ws.materials[mm[0]] = mm[1]; });
  /* 建场期就用引擎本体反证一次：够料方 = ok、缺料方 = reason 'mats' */
  const cloneP = JSON.parse(JSON.stringify(ws));
  const probeEnough = SQ.Alchemy.startCraft(cloneP, pack, D, 'dan', recEnough.id, {}, { unlocks: {} }, Date.now(), null);
  cloneP.alchemy.craft = null;
  const probePoor = SQ.Alchemy.startCraft(cloneP, pack, D, 'dan', recPoor.id, {}, { unlocks: {} }, Date.now(), null);
  const zc = Math.min(ws.realm, D.ZONES.length - 1);
  const forgePool = SQ.Alchemy.zoneMats(D, zc);
  const forgeNeed = AD.FORGE_MAT_COST || 6;      /* 普通图纸 6 / 精制 12 / 丹炉 10 */
  /* ── C3 炼器腿的「料齐 / 缺料 / 已在身」三态共存造法（裁定收口批重写）──
   * 上一版想在页内 `SQ.mutate` 补料，但视图 state 是 IIFE 私有、测试里 ref 只能传占位对象，
   * 注入后重绘读的仍是旧态 ⇒ 改为**建场灌料**：给本区主材每种 3 枚（池长 2~3 ⇒ 总量 6~9），
   * 于是普通图纸（需 6）= **料齐**、精制图纸（需 12）= **缺料**、丹炉图纸（已在身，判定在缺料之前）= **has**，
   * 三条守卫同档共存、且互不遮蔽。补给必须**排除缺料丹方的材料集**，否则 C3b/C3c 假绿；
   * 也不得把够料丹方的量压低（取 max 保护 C3a）。 */
  const poorMats = recPoor.mats.map(function (m) { return m[0]; });
  const forgeGift = forgePool.filter(function (id) { return poorMats.indexOf(id) < 0; });
  forgeGift.forEach(function (id) { ws.materials[id] = Math.max(ws.materials[id] || 0, 3); });
  /* ── C5 建场（第廿九批：材料背包按提炼档排序 + 档位标识）──
   * 背包原先按入账先后排（`Object.keys(ws.materials)`），与档序无关 ⇒ 排序判据必须有一种
   * 「插入序 != 档序」的料才测得动。这里补两枚**不被任何配方与图纸池消费**的料
   * （风纹木 = 一档 z1、界外之石 = 顶档 z9，逐条查过 RECIPES / zoneMats 池都不入），
   * 并刻意把顶档放最前、一档料放最后。顶档给到 5 枚（>= REFINE_IN）⇒ 顺带钉「顶档不得出现提炼钮」。 */
  ws.materials = (function () {
    const shuffled = { mat_jiewai: 5 };
    Object.keys(ws.materials).forEach(function (k) { shuffled[k] = ws.materials[k]; });
    shuffled.mat_fengwen = 2;
    return shuffled;
  })();
  const cloneQ = JSON.parse(JSON.stringify(ws));
  const probeQiDir = SQ.Alchemy.startCraft(cloneQ, pack, D, 'qi', 'bp_weapon', {}, { unlocks: {} }, Date.now(), null);
  cloneQ.alchemy.craft = null;
  const qiDirs = (AD.FORGE_DIRS || {})[(AD.BLUEPRINTS.filter(function (b) { return b.id === 'bp_weapon'; })[0] || {}).slot] || [];
  const probeQiOk = SQ.Alchemy.startCraft(cloneQ, pack, D, 'qi', 'bp_weapon', { dir: qiDirs[0] && qiDirs[0].dir }, { unlocks: {} }, Date.now(), null);
  cloneQ.alchemy.craft = null;
  const probeQiJing = SQ.Alchemy.startCraft(cloneQ, pack, D, 'qi', 'bp_weapon_jing', { dir: 'pojun' }, { unlocks: {} }, Date.now(), null);
  cloneQ.alchemy.craft = null;
  const probeQiHas = SQ.Alchemy.startCraft(cloneQ, pack, D, 'qi', 'bp_furnace', {}, { unlocks: {} }, Date.now(), null);

  /* C4：三类新分类各灌 3 条可辨识行 */
  ws.log = [];
  ['combat', 'cave', 'shop', 'sys'].forEach(function (cat) {
    for (let i = 1; i <= 3; i++) {
      ws.log.push({ ts: now - (100 - i) * 1000, cat: cat, text: 'C4-' + cat + '-' + i });
    }
  });

  /* C2：五类 reason 各一条流水（earnedKeys / spent 与 karma 同口径，防 normalize 恒等式重算覆盖） */
  const meta = {
    unlockedWorlds: ['xiuxian'], achv: [], earnedKeys: { 'p.achv': 100, 'p.ms': 150, 'p.settle': 350 },
    spent: { 'shop.heir': 600 }, karma: 0, codices: {}, titles: [], biographies: [],
    stats: { lives: 3, ascensions: 0, dissolutions: 1, realmMax: 5 },
    karmaLog: [
      /* 第廿八批：一次转世结算会以**同一个 ts** 推入多行（legacy.js 的 applyPreview 逐明细行
       * logPush），真机档实测轮回页出现 20 行一模一样的「转世结算」⇒ 这里刻意放三行同 ts 的
       * settle，钉住「账本按明细留痕、呈现按事件合并」这条新口径 */
      { ts: now - 500000, delta: 350, reason: 'settle', balance: 1000 },
      { ts: now - 500000, delta: 120, reason: 'settle', balance: 1120 },
      { ts: now - 500000, delta: 30, reason: 'settle', balance: 1150 },
      { ts: now - 400000, delta: 150, reason: 'milestone', balance: 850 },
      { ts: now - 300000, delta: -600, reason: 'buy', balance: 250 },
      { ts: now - 200000, delta: 100, reason: 'achv', balance: 350 },
      { ts: now - 100000, delta: 5, reason: 'fix', balance: 355 }
    ]
  };
  meta.karma = 600 + 100 + 150 + 350 - 600;   /* Σearned − Σspent = 600（与 normalize 同口径） */

  return {
    save: {
      v: 1,
      profile: { name: '链通验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
      meta: meta,
      settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
      worlds: { xiuxian: ws }
    },
    seed: {
      pending: pending, displaced: displaced, slots: ws.artsSlots.slice(),
      recEnough: recEnough.id, recPoor: recPoor.id,
      probeEnough: probeEnough && probeEnough.ok ? 'ok' : (probeEnough && probeEnough.reason),
      probePoor: probePoor && probePoor.ok ? 'ok' : (probePoor && probePoor.reason),
      forgePool: forgeGift.slice(), forgeNeed: forgeNeed,
      probeQiDir: probeQiDir && probeQiDir.ok ? 'ok' : probeQiDir && probeQiDir.reason,
      probeQiOk: probeQiOk && probeQiOk.ok ? 'ok' : probeQiOk && probeQiOk.reason,
      probeQiJing: probeQiJing && probeQiJing.ok ? 'ok' : probeQiJing && probeQiJing.reason,
      probeQiHas: probeQiHas && probeQiHas.ok ? 'ok' : probeQiHas && probeQiHas.reason,
      qiDir: qiDirs[0] && qiDirs[0].dir,
      karma: meta.karma
    }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const { save, seed } = await buildSave();
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };
  console.log('  seed: ' + JSON.stringify(seed));
  T(seed.probeEnough === 'ok' && seed.probePoor === 'mats',
    'C3z 建场自证（引擎本体）：够料方 startCraft = ok、缺料方 = reason mats',
    seed.probeEnough + '/' + seed.probePoor);

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, save);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });

  const readW = () => page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k) || 'null');
    if (!s) return null;
    const w = s.worlds[s.profile.worldId];
    return {
      slots: (w.artsSlots || []).slice(), knownIds: (w.artsKnown || []).slice(),
      lv: w.artsLevels || {}, craft: (w.alchemy && w.alchemy.craft) || null
    };
  }, KEY);
  const until = async (pred, ms) => {
    const t0 = Date.now();
    for (;;) {
      const v = await pred();
      if (v) return v;
      if (Date.now() - t0 > (ms || 8000)) return null;
      await page.waitForTimeout(80);
    }
  };

  /* ════════ C1 满槽原位替换 ════════ */
  await page.click('#m-tabbar button[data-v="arts"]');
  await until(() => page.evaluate(() => !!document.querySelector('#tab-arts [data-slot="0"] .tname')));
  const slotN = await page.evaluate(() => document.querySelectorAll('#tab-arts [data-slot]').length);
  T(slotN === 6, 'C1a 修习槽渲染 6 格且带 data-slot 序号', 'n=' + slotN);
  const preBtns = await page.evaluate(() => document.querySelectorAll('#tab-arts button[data-act="slotReplace"]').length);
  T(preBtns === 0, 'C1b 非抉择态零「替换」按钮（不无端多出一排）', 'n=' + preBtns);

  await page.click('#tab-arts .artgrid button[data-act="slotArt"][data-v="' + seed.pending + '"]');
  await until(() => page.evaluate((pid) => !!document.querySelector(
    '#tab-arts [data-slot="0"] button[data-act="slotReplace"][data-v="' + pid + '"]'), seed.pending));
  const pick = await page.evaluate(() => {
    const banner = document.querySelector('#tab-arts .resetbanner');
    const btns = Array.prototype.slice.call(document.querySelectorAll('#tab-arts button[data-act="slotReplace"]'));
    return {
      banner: banner ? banner.textContent.replace(/\s+/g, '') : '',
      cancel: !!document.querySelector('#tab-arts button[data-act="slotPickCancel"]'),
      n: btns.length,
      pairs: btns.map((b) => b.closest('[data-slot]').dataset.slot + '/' + b.dataset.v + '/' + b.dataset.r)
    };
  });
  T(/修习槽已满/.test(pick.banner) && pick.cancel, 'C1c 抉择横幅（slotpick.title）+ 取消位在屏', pick.banner.slice(0, 34));
  T(pick.n === 6, 'C1d 满槽 6 格各挂一个「替换」按钮（此前该属性全库渲染点 = 0）', 'n=' + pick.n);
  T(pick.pairs.every((p) => p.split('/')[1] === seed.pending),
    'C1e 每钮 data-v = 待入槽功法（handler 第一参契约）', pick.pairs[0]);
  T(pick.pairs.every((p) => p.split('/')[2] && p.split('/')[2] !== 'undefined'),
    'C1f 每钮 data-r = 本格在槽功法（handler 的 replaceId）', pick.pairs[0]);

  const beforeJson = JSON.stringify((await readW()).slots);
  await page.click('#tab-arts [data-slot="0"] button[data-act="slotReplace"]');
  const swapped = await until(() => page.evaluate((b0) => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const sl = s.worlds[s.profile.worldId].artsSlots || [];
    return JSON.stringify(sl) !== b0 ? sl.slice() : null;
  }, beforeJson));
  T(!!swapped, 'C1g 点「替换」经 mutate 落盘（槽序确有变化）', JSON.stringify(swapped));
  const st1 = await readW();
  T(st1.slots[0] === seed.pending, 'C1h 替换落在**第 1 位**（不是队尾）', 'slot0=' + st1.slots[0]);
  T(st1.slots.length === 6 && st1.slots.slice(1).join(',') === seed.slots.slice(1).join(','),
    'C1i 其余槽位零位移（原位覆盖语义）', 'after=' + st1.slots.join(','));
  T(st1.knownIds.indexOf(seed.displaced) >= 0 && st1.slots.indexOf(seed.displaced) < 0,
    'C1j 被顶下的功法回「未装备」且不脱离已学列表（零丢失）', 'known=' + st1.knownIds.length);
  T(st1.lv[seed.displaced] === 2, 'C1k 被顶下的功法等级不随替换清零', 'lv=' + st1.lv[seed.displaced]);
  const domMain = await page.evaluate(() => {
    const c = document.querySelector('#tab-arts [data-slot="0"]');
    return {
      corner: (c.querySelector('.maincorner') || {}).textContent || '',
      name: (c.querySelector('.tname') || {}).textContent || '',
      bannerGone: !document.querySelector('#tab-arts button[data-act="slotReplace"]')
    };
  });
  T(domMain.corner.replace(/\s+/g, '') === '主修', 'C1l 第 1 位仍挂「主修」角标', domMain.corner);
  T(domMain.bannerGone, 'C1m 替换后抉择态自动收（无残留按钮）');

  /* 取消路径：再进抉择态 → 取消 → 槽序零变化 */
  await page.click('#tab-arts .artgrid button[data-act="slotArt"][data-v="' + seed.displaced + '"]');
  await until(() => page.evaluate(() => !!document.querySelector('#tab-arts button[data-act="slotPickCancel"]')));
  await page.click('#tab-arts button[data-act="slotPickCancel"]');
  const st2 = await readW();
  T(st2.slots.join(',') === st1.slots.join(',') && st2.slots.indexOf(seed.displaced) < 0,
    'C1n 取消 = 槽序原样（不误改）', 'slots=' + st2.slots.join(','));

  /* ════════ C4 日志三新分类 ════════ */
  await page.click('#m-tabbar button[data-v="journal"]');
  await until(() => page.evaluate(() => document.querySelectorAll('#tab-journal > .chips button').length >= 11));
  const catRows = await page.evaluate(() => Array.prototype.map.call(
    document.querySelectorAll('#tab-journal > .chips button'),
    (b) => [b.dataset.v, (b.textContent || '').trim()]));
  T(catRows.length === 11, 'C4a 分类 tag 由 8 → 11（+历练 / +洞府 / +坊市）',
    'n=' + catRows.length + ' ' + catRows.map((r) => r.join(':')).join(' '));
  const catMap = {};
  catRows.forEach((r) => { catMap[r[0]] = r[1]; });
  T(catMap.combat === '历练' && catMap.cave === '洞府' && catMap.shop === '坊市',
    'C4b 三新类标签取既有词表键（combat.tag / cave.system / shop.system · 零新键）',
    catMap.combat + '/' + catMap.cave + '/' + catMap.shop);
  const filterBy = async (v, mine, others) => {
    await page.click('#tab-journal > .chips button[data-v="' + v + '"]');
    await page.waitForTimeout(220);
    return page.evaluate((args) => {
      const txt = document.getElementById('tab-journal').innerText || '';
      const on = document.querySelector('#tab-journal > .chips button.on');
      return {
        on: on ? on.dataset.v : '',
        hit: args.mine.every((s) => txt.indexOf(s) >= 0),
        leaked: args.others.filter((s) => txt.indexOf(s) >= 0),
        n: document.querySelectorAll('#tab-journal .logline').length
      };
    }, { mine: mine, others: others });
  };
  const mk = (c) => ['C4-' + c + '-1', 'C4-' + c + '-2', 'C4-' + c + '-3'];
  const fCombat = await filterBy('combat', mk('combat'), mk('cave').concat(mk('shop'), mk('sys')));
  T(fCombat.on === 'combat' && fCombat.hit && fCombat.leaked.length === 0,
    'C4c 「历练」只出 combat 行（此前 15 处写口无处可筛）', JSON.stringify(fCombat));
  const fCave = await filterBy('cave', mk('cave'), mk('combat').concat(mk('shop'), mk('sys')));
  T(fCave.on === 'cave' && fCave.hit && fCave.leaked.length === 0, 'C4d 「洞府」筛选生效', JSON.stringify(fCave));
  const fShop = await filterBy('shop', mk('shop'), mk('combat').concat(mk('cave'), mk('sys')));
  T(fShop.on === 'shop' && fShop.hit && fShop.leaked.length === 0, 'C4e 「坊市」筛选生效', JSON.stringify(fShop));
  const fAll = await filterBy('all', mk('combat').concat(mk('cave'), mk('shop')), []);
  T(fAll.hit, 'C4f 「全部」仍并集含三类新行（未因补分类丢行）', 'n=' + fAll.n);
  const hasBreak = await page.evaluate(() => !!document.querySelector('#tab-journal > .chips button[data-v="break"]'));
  T(!hasBreak, 'C4g 未造「突破」空筛选项（cat break 全库零写口 = 反向死链，break.tag 继续留孤儿）');

  /* ════════ C2 遗泽收支流水 ════════ */
  await page.click('#m-tabbar button[data-v="legacy"]');
  await until(() => page.evaluate(() => document.querySelectorAll('#tab-legacy [data-karmalog-row]').length > 0));
  const led = await page.evaluate((k) => {
    const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-legacy [data-karmalog-row]'));
    const wrap = document.querySelector('#tab-legacy [data-karmalog]');
    const head = wrap && wrap.previousElementSibling ? wrap.previousElementSibling.textContent.replace(/\s+/g, '') : '';
    const st = JSON.parse(localStorage.getItem(k) || '{}');
    const stored = ((st.meta || {}).karmaLog || []).map((l) => l.reason);
    /* 期望值独立算一遍（第廿八批口径：账本按明细留痕、**呈现按事件合并**——同 reason + 同 ts 折一行） */
    const grp = [];
    ((st.meta || {}).karmaLog || []).slice().reverse().forEach((l) => {
      const g = grp.length ? grp[grp.length - 1] : null;
      if (g && g.reason === l.reason && g.ts === l.ts) { g.delta += l.delta; g.n++; return; }
      grp.push({ reason: l.reason, ts: l.ts, delta: l.delta, balance: l.balance, n: 1 });
    });
    const settleG = grp.filter((g) => g.reason === 'settle')[0] || {};
    const txt = rows.map((r) => (r.textContent || '').replace(/\s+/g, ''));
    const area = document.getElementById('tab-legacy').innerText || '';
    return {
      n: rows.length, storedN: stored.length,
      reasons: rows.map((r) => r.dataset.karmalogRow),
      grpReasons: grp.map((g) => g.reason).join(','), grpN: grp.length,
      settleN: settleG.n, settleDelta: settleG.delta, settleBalance: settleG.balance,
      settleRow: (rows.filter((r) => r.dataset.karmalogRow === 'settle')[0] || {}).textContent
        ? rows.filter((r) => r.dataset.karmalogRow === 'settle')[0].textContent.replace(/\s+/g, '') : '',
      storedRev: stored.slice().reverse().join(','),
      txt: txt, head: head,
      labels: ['转世结算', '图鉴里程碑', '遗泽商店', '行为成就', '账本修复'].filter((x) => area.indexOf(x) >= 0),
      bodyLatin: (area.match(/[A-Za-z]{3,}/g) || []).filter((x) => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0)
    };
  }, KEY);
  /* 断言取「关系」不取绝对条数：开局成就扫描会随时往账本追加行（本仓走查纪律） */
  T(led.n === led.grpN && led.n >= 5 && led.storedN > led.grpN,
    'C2a 流水按事件渲染（同 reason+ts 折一行 ⇒ 行数 = 分组数，且严格小于存储明细数：建场三行结算并成一行）',
    'n=' + led.n + ' 分组=' + led.grpN + ' 存储=' + led.storedN);
  T(led.reasons.join(',') === led.grpReasons,
    'C2b 行序 = 存储倒序的分组序（最新在前，与 normalize 的 slice(-20) 同口径）', led.reasons.join(','));
  T(led.settleN === 3 && led.settleRow.indexOf('×3') >= 0 &&
    led.settleRow.indexOf('+' + (led.settleDelta || -1)) >= 0 && led.settleDelta === 500 &&
    led.settleRow.indexOf('1,150') >= 0,
    'C2g 合并行交底：标 ×3、金额 = 三行之和（350+120+30=500）、余额取链尾 1,150', led.settleRow);
  T(led.labels.length === 5, 'C2c 五类 reason 标签全部上屏（legacy.reason.* 五键就此收口）', led.labels.join('/'));
  T(led.txt.every((x) => /遗泽/.test(x) && /[+−]/.test(x)) && led.txt.some((x) => x.indexOf('−600') >= 0),
    'C2d 每行「收支 + 余额」双列且负数带负号', led.txt.slice(0, 2).join(' / '));
  T(led.txt.every((x) => !/[A-Za-z]/.test(x)), 'C2e 行面零裸拉丁（reason 一律走词表）',
    led.txt.filter((x) => /[A-Za-z]/.test(x)).join(' | ') || 'clean');
  T(/遗泽/.test(led.head), 'C2f 段标复用 legacy.ui.balance（n 空参惯用法，零新键）', led.head);

  /* ════════ C3 炼制前置 + 失败文案 ════════ */
  await page.click('#m-tabbar button[data-v="alchemy"]');
  await until(() => page.evaluate(() => !!document.querySelector('#tab-alchemy button[data-act="alStart"][data-c="dan"]')));
  const dan = await page.evaluate((ids) => {
    const btnOf = (vid) => document.querySelector('#tab-alchemy button[data-act="alStart"][data-v="' + vid + '"][data-c="dan"]');
    const bEnough = btnOf(ids.enough);
    const bPoor = btnOf(ids.poor);
    return {
      enoughDisabled: bEnough ? bEnough.disabled : 'no-btn',
      poorDisabled: bPoor ? bPoor.disabled : 'no-btn',
      poorRow: bPoor ? bPoor.closest('.carditem').textContent.replace(/\s+/g, '') : '',
      matsNow: (JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.materials) || {},
      latin: (document.getElementById('tab-alchemy').innerText.match(/[A-Za-z]{3,}/g) || [])
        .filter((x) => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0)
    };
  }, { enough: seed.recEnough, poor: seed.recPoor });
  T(dan.enoughDisabled === false, 'C3a 材料齐的丹方「开炉」仍可点（不误伤正常路径）', String(dan.enoughDisabled));
  T(dan.poorDisabled === true, 'C3b 材料不足的丹方「开炉」置灰（旧口径只看有没有丹炉）', String(dan.poorDisabled));
  T(/材料不足/.test(dan.poorRow), 'C3c 缺料原因上屏（复用 alchemy.ui.matslack）', dan.poorRow.slice(0, 70));

  /* ── 炼器三守卫同档共存（本批建场灌料的结果：普通图 = 料齐而方向未定、精制图 = 缺料、
   *    丹炉图 = 已在身）。每条都先用引擎本体反证（seed.probeQi*），再看视图给不给同一个答案：
   *    「视图判定与引擎同序」才算链通，只对照视图会放过两侧同时错的情况。 */
  const qiRow = (vid) => page.evaluate((v) => {
    const b = document.querySelector('#tab-alchemy button[data-act="forgeBp"][data-v="' + v + '"]');
    if (!b) return { present: false };
    const row = b.closest('.carditem');
    const st = row.querySelector('button[data-act="alStart"]');
    return { present: true, dis: st ? st.disabled : null, txt: row.textContent.replace(/\s+/g, '') };
  }, vid);
  T(seed.probeQiDir === 'dir', 'C3d0 引擎反证：普通图纸料齐但方向未定 ⇒ reason 恰为 dir（不是 mats/has）', String(seed.probeQiDir));
  await page.click('#tab-alchemy button[data-act="forgeBp"][data-v="bp_weapon"]');
  await until(() => page.evaluate(() => !!document.querySelector('#tab-alchemy button[data-act="forgeDir"]')));
  const forge = await qiRow('bp_weapon');
  T(forge.present && forge.dis === true && /先定词条方向/.test(forge.txt),
    'C3d 料齐而未定方向 →「开炉」置灰 + 原因改口「先定词条方向」（reason dir 有键）',
    'dis=' + forge.dis + ' ' + forge.txt.slice(0, 66));
  await page.click('#tab-alchemy button[data-act="forgeDir"]');
  await until(() => page.evaluate((v) => {
    const b = document.querySelector('#tab-alchemy button[data-act="alStart"][data-v="' + v + '"][data-c="qi"]');
    return !!b && b.disabled === false;
  }, 'bp_weapon'), 6000);
  const forgeOn = await qiRow('bp_weapon');
  T(seed.probeQiOk === 'ok' && forgeOn.dis === false,
    'C3e 方向选定 + 料齐 →「开炉」恢复可点（守卫不越权封正常路径）', 'dis=' + forgeOn.dis + ' 引擎=' + seed.probeQiOk);
  /* 未选中的图纸行只给「选图纸」按钮、不给「开炉」，故这两条要先点进该图纸再看守卫 */
  const pickRow = async (vid) => {
    await page.click('#tab-alchemy button[data-act="forgeBp"][data-v="' + vid + '"]');
    await page.waitForTimeout(240);
    return qiRow(vid);
  };
  const jingRow = await pickRow('bp_weapon_jing');
  T(seed.probeQiJing === 'mats' && jingRow.present && jingRow.dis === true && /材料不足/.test(jingRow.txt),
    'C3f 精制图纸（需 12）在同档只给 6~9 枚时 = 缺料 ⇒ 置灰 + 「材料不足」（判定按引擎同序分序）',
    'dis=' + jingRow.dis + ' 引擎=' + seed.probeQiJing + ' ' + jingRow.txt.slice(0, 56));
  const hasRow = await pickRow('bp_furnace');
  T(seed.probeQiHas === 'has' && hasRow.present && hasRow.dis === true && /丹炉已在身/.test(hasRow.txt),
    'C3g 丹炉图纸（已持有丹炉）→ 置灰 + 「丹炉已在身」（reason has 有键 · 旧版此处上屏裸 has）',
    'dis=' + hasRow.dis + ' 引擎=' + seed.probeQiHas + ' ' + hasRow.txt.slice(0, 56));
  const noLatinQi = await page.evaluate(() => (document.getElementById('tab-alchemy').innerText.match(/[A-Za-z]{3,}/g) || [])
    .filter((x) => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0));
  T(noLatinQi.length === 0, 'C3g2 炼器区三守卫文案零裸拉丁', noLatinQi.slice(0, 3).join(','));

  /* 真失败路径：同帧连点 = 陈旧渲染态（第二下必撞 al.craft 已置 → reason 'busy'） */
  await page.evaluate((vid) => {
    const b = document.querySelector('#tab-alchemy button[data-act="alStart"][data-v="' + vid + '"][data-c="dan"]');
    b.click(); b.click();
  }, seed.recEnough);
  const toastTxt = await until(() => page.evaluate(() => {
    const t = document.querySelectorAll('#toasts .toast');
    return t.length ? t[t.length - 1].textContent : '';
  }, 0), 5000);
  T(!!toastTxt && /炉中有物，先出炉/.test(toastTxt),
    'C3h 连点触发的 busy 走 alchemy.ui.busy（孤儿键就此收口，不再上屏 busy）', String(toastTxt));
  const toastLatin = toastTxt ? (toastTxt.match(/[A-Za-z]{3,}/g) || []) : ['(无toast)'];
  T(toastLatin.length === 0, 'C3i 失败 toast 零裸拉丁', toastLatin.join(','));
  const craftNow = await page.evaluate(() =>
    (JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.alchemy || {}).craft || null);
  T(!!craftNow && craftNow.id === seed.recEnough,
    'C3j 首下确实开炉成功（走查没把正常路径改成点不动；busy 只是第二下的陈旧态）', JSON.stringify(craftNow));

  /* ============ C5 材料背包的档位序 + 档位标识（第廿九批 · 用户报「顺序是乱的，要看得出低级料
   * 炼成哪种高级料、同一条升级线要有标识）============ */
  const c5 = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = st.worlds.xiuxian;
    const XD = window.SQ.XDATA, Al = window.SQ.Alchemy;
    const meta = {};
    XD.ALCHEMY.MATS.forEach((m) => { meta[m.id] = m; });
    /* 期望序独立算一遍（档 -> 秘境序 -> id；悟道石 z<0 段内置后） */
    const want = Object.keys(w.materials).slice().sort((a, b) => {
      const r1 = Al.groupOf(XD, a) - Al.groupOf(XD, b); if (r1) return r1;
      const z1 = (meta[a] || { z: 0 }).z, z2 = (meta[b] || { z: 0 }).z;
      const r2 = (z1 < 0 ? 99 : z1) - (z2 < 0 ? 99 : z2); if (r2) return r2;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    const cards = Array.prototype.slice.call(document.querySelectorAll(
      '#tab-alchemy [data-act="alSell"][data-c="1"]'));
    const got = cards.map((b) => b.dataset.v);
    const badgeOf = (btn) => {
      const card = btn.closest(".carditem");
      const bd = card && card.querySelector(".catbadge");
      return bd ? bd.textContent.replace(/\s+/g, '') : '';
    };
    /* 卡落在哪一段 = 按 DOM 前驱找最近的段头（段头与卡网格同为该段直接兄弟） */
    const lineOfCard = (btn) => {
      let el = btn.closest(".cardgrid");
      el = el ? el.previousElementSibling : null;
      return el && el.hasAttribute('data-matline') ? el.getAttribute('data-matline') : 'no-line';
    };
    return {
      got: got, want: want, insOrder: Object.keys(w.materials),
      ranks: got.map((g) => Al.groupOf(XD, g)),
      badges: cards.map((b) => badgeOf(b)),
      cardLine: cards.map((b) => lineOfCard(b)),
      lines: Array.prototype.slice.call(document.querySelectorAll('#tab-alchemy [data-matline]')),
      lineRanks: Array.prototype.slice.call(document.querySelectorAll(
        '#tab-alchemy [data-matline]')).map((l) => l.getAttribute('data-matline')),
      lineTxt: Array.prototype.slice.call(document.querySelectorAll('#tab-alchemy [data-matline]'))
        .map((l) => l.textContent.replace(/\s+/g, '')),
      poolLens: [0, 1, 2, 3].map((g) => Al.groupIds(XD, g).length),
      refineBtns: Array.prototype.slice.call(document.querySelectorAll(
        '#tab-alchemy [data-act="alRefine"]')).map((b) => b.dataset.v),
      latin: (document.getElementById('tab-alchemy').innerText.match(/[A-Za-z]{3,}/g) || [])
        .filter((x) => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0)
    };
  });
  T(c5.got.join(',') === c5.want.join(',') && c5.got.join(',') !== c5.insOrder.join(','),
    "C5a 背包按**提炼档**升序重排（档 -> 秘境序 -> id），且屏上序不等于入账序 => 排序判据有鉴别力",
    '屏上=' + c5.got.slice(0, 3).join(',') + '... 插入序=' + c5.insOrder.slice(0, 3).join(',') + '...');
  T(c5.ranks.every((r, i) => i === 0 || c5.ranks[i - 1] <= r),
    'C5b 档序单调不降（低档永不排在高档之后）', c5.ranks.join('/'));
  T(c5.badges.every((b, i) => b === '第' + (c5.ranks[i] + 1) + '档') && new Set(c5.badges).size >= 2,
    'C5c 每枚料挂档标识「第N档」，且同一条升级线同标识（至少两档同时在场才成立）', c5.badges.join('|'));
  T(c5.cardLine.every((l, i) => l === String(c5.ranks[i])) && c5.lineRanks.join(',') === Array.from(new Set(c5.ranks)).join(','),
    'C5d 分段与段头对齐：每枚卡落在自己档的段里，段序 = 档序且每档只一段', c5.lineRanks.join(',') + ' vs ' + c5.ranks.join(','));
  T(/第2档任一/.test(c5.lineTxt[0]) && c5.lineTxt[0].indexOf('共' + c5.poolLens[1] + '种') >= 0,
    'C5e 段头把「低级料 ×4 炼成哪一档、有哪几样」写到屏上：次档号 + 候选种数 === 引擎产出池长度（`groupIds` 同口，屏上不说谎）', c5.lineTxt[0]);
  T(c5.lineTxt[c5.lineTxt.length - 1].indexOf('已至顶档，不可再炼') >= 0 &&
    c5.refineBtns.indexOf('mat_jiewai') < 0 && c5.refineBtns.indexOf('mat_fengwen') >= 0,
    'C5f 顶档段头写「不可再炼」且**顶档无提炼钮**（给到 5 枚 >= 用量也不得出现），一档料有钮',
    c5.lineTxt[c5.lineTxt.length - 1] + ' || 顶档钮=' + (c5.refineBtns.indexOf('mat_jiewai') < 0));
  T(c5.latin.length === 0, 'C5g 档位段文案零裸拉丁', c5.latin.slice(0, 3).join(','));
  T(errors.length === 0, '零页面报错', errors.join('|').slice(0, 150) || 'clean');

  console.log(fail === 0 ? 'UI_CHAINS_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_CHAINS_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
