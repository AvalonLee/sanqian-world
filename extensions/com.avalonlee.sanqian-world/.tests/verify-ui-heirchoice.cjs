/* .tests/verify-ui-heirchoice.cjs — 转世「真灵承继 · 可选一件」选择浮层 UI 走查
 * 依赖：playwright-core；用法（NODE_PATH 必须是 Windows 风格路径，否则 Cannot find module）：
 *   NODE_PATH="<root>\\node_modules" node .tests/verify-ui-heirchoice.cjs
 *
 * 补的是缺口台账 N12 的第三件（「新词表键 + 断言 + 走查一篇」里唯一没落的那一篇）：
 * 引擎侧 `meta.heirChoice` 三态由 `.tests/probe-heirchoice.cjs` 守出账端，但**玩家入口本身**
 * （`#modal-heirchoice` 浮层 + `heirPick`/`heirSwitch` 两条动作 + 轮回页常驻承继块）此前零覆盖。
 * 正典承诺「每世转世时可选一件已觉醒器灵的法宝带入下世」，改造前实态是「代码自动取第一件、玩家无权选」
 * ——属「绿灯不等于链通」的可达性形态，故本篇全程只走视图侧真实点击链路。
 * 判据一律回读存档真值 × 词表在页内合成（对应视图侧「零自造规则」），断言里不硬编码中文文案。
 *
 * 场景（四 context，各自把存档预置进 addInitScript 注入对象 = 首帧即带场景，
 * 避开「写 localStorage 再 reload 被 initScript 每次导航重跑覆盖」这一已知坑）：
 *   A 已购 shop.heir + 三件真觉醒（另置一件只写 .awake 的假觉醒、一件裸件作反向对照）
 *   B 同 A，走「不带器灵转世」（HEIR_NONE 哨兵）到底
 *   C 已购资格但本世零觉醒候选 ⇒ 不弹层、不留点不开的按钮、转世照常完成（无死路）
 *   D 无资格（未购 shop.heir）而有觉醒件 ⇒ 不弹层（零打扰）
 * 境界取 4 = LEGACY.BINGJIE_MIN_REALM（兵解入口在位——修行页快捷入口与轮回页各一处，本篇都走一遍；
 * 且不越飞升门槛）；器灵 st 直接预置进存档副本（觉醒链路本身归 fusion 侧断言，
 * 本篇取的是「本世有已觉醒件」这一既有事实，不是再验一次温养）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const FIX = path.join(ROOT, '.tests/fixture-save.json');
  const URL0 = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const WID = 'xiuxian';

  /* ── 场景数据（Node 侧常量；页内一律回读存档 + SQ.t，绝不引用这些变量——序列化函数体里它们不存在）──
   * liang 阶 NEED=300（D.SPIRIT.NEED.liang）；三件真觉醒人格各不相同；另两件是反向对照。 */
  const AWK = [['h04', 'gu'], ['h06', 'shou'], ['h16', 'jian']];
  const FAKE = 'h20';   /* 只写 .awake（全库零写入方的历史错读字段）⇒ 恒不该入候选 */
  const RAW = 'h22';    /* 裸件 st={} */
  const AUTO_FIRST = AWK[0][0];      /* 未择定时引擎的自动口径 = owned 原序第一件觉醒者 */
  const PICKED = 'h06';              /* 本篇第一次择定的件（非自动口径第 0 件） */
  const SWITCH_TO = 'h16';           /* 「换一件」改选的件 */
  const awake = (id, p) => ({
    id: id, lv: 1,
    st: { spirit: { w: 300, a: 1, p: p, cd: 0, mk: 0, hun: 0, vt: {}, heir: 0, ru: 0, awakenAt: 0 } }
  });
  const fakeEnt = id => ({ id: id, lv: 1, st: { spirit: { awake: 1, a: 0, w: 0 } } });
  const bareEnt = id => ({ id: id, lv: 1, st: {} });

  function buildArchive(opt) {
    const s = JSON.parse(fs.readFileSync(FIX, 'utf8'));
    const now0 = Date.now();
    s.profile.createdAt = now0;
    Object.keys(s.worlds).forEach(k => {
      const w = s.worlds[k];
      w.lastSave = now0; w.lastOffline = null; w.pendingChoice = null; w.log = [];
    });
    const w = s.worlds[WID];
    w.realm = 4;
    w.treasures = {
      owned: (opt.awakened ? AWK.map(x => awake(x[0], x[1])) : []).concat([fakeEnt(FAKE), bareEnt(RAW)]),
      slots: [null, null, null],
      fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0
    };
    /* 恒等式 #197：karma === ΣearnedKeys − Σspent（600 = D.LEGACY.HEIR_PRICE 实付） */
    s.meta = {
      unlockedWorlds: [WID],
      karma: 6600 - (opt.eligible ? 600 : 0),
      earnedKeys: { 'walk.heirgrant': 6600 }, karmaLog: [],
      spent: opt.eligible ? { 'shop.heir': 600 } : {},
      heirTreasure: null, heirSpirit: null,
      heirChoice: opt.staleChoice || null, pendingRebirth: null
    };
    return s;
  }

  const j = v => { try { return JSON.stringify(v); } catch (e) { return 'nil'; } };
  const dig = (o, ks) => ks.reduce((a, k) => (a == null ? a : a[k]), o);

  /* 裸英文 key / undefined / 花括号占位残留 = 本仓 A1/A4 词表纪律的界面侧对应物，
   * 也是台账 N13 那类「引擎有返回、视图拼的键族不在词表 ⇒ 裸英文上屏」缺陷的现行检查位。 */
  function residue(txt) {
    if (!txt) return '空文本';
    if (/undefined|NaN|\[object/i.test(txt)) return 'undefined/NaN/object 残留';
    if (/[{}]/.test(txt)) return '花括号占位未填';
    const m = txt.match(/[a-z][a-z0-9]*(?:[._][a-z0-9]+){1,}/);
    return m ? '裸 key「' + m[0] + '」' : null;
  }

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  /* ── 每 case 一套：注入存档 → 首帧即带场景 → 真实点击链路 ───────────── */
  async function openCase(label, archive) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(archive));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(label + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(label + ' console: ' + m.text()); });

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const poll = async (fn, ms) => {
      const t0 = Date.now();
      for (;;) {
        if (await fn()) return true;
        if (Date.now() - t0 > (ms || 6000)) return false;
        await sleep(100);
      }
    };
    const hidden = id => page.$('#' + id + '.hide').then(x => !!x);
    const shown = sel => poll(() => page.$(sel + ':not(.hide)').then(x => !!x), 6000);
    const cnt = sel => page.$$eval(sel, e => e.length).catch(() => 0);
    const save = () => page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('sanqian-state-v1') || 'null'); } catch (e) { return null; }
    });
    const meta = async () => (await save() || {}).meta || {};
    const wnow = async () => {
      const s = await save();
      return s ? (s.worlds[s.profile.worldId] || {}) : {};
    };
    /* 打断浮层自清：每秒 tick 可能随机掷出奇遇抉择 / 跨段演出 / 转世天象，遮罩会拦住本篇的点击。
     * 抉择模态走真实分支按钮（它是「必须选择」语义，遮罩点不关），其余 MASKS 成员走遮罩关闭纪律；
     * 绝不碰 #modal-confirm 与 #modal-heirchoice——那两个正是本篇的受试对象。 */
    const dismiss = async () => {
      if (await page.$('#modal-choice:not(.hide)')) {
        const b = await page.$('#mc-branches button[data-act="choose"]:not([disabled])');
        if (b) await b.click().catch(() => {});
        await poll(() => hidden('modal-choice'), 5000);
      }
      for (const id of ['modal-offline', 'modal-karma', 'modal-omens', 'modal-recall', 'modal-role']) {
        if (await page.$('#' + id + ':not(.hide)')) {
          await page.evaluate(i => { const e = document.getElementById(i); if (e) e.click(); }, id);
          await poll(() => hidden(id), 3000);
        }
      }
    };
    const gotoTab = async id => {
      await dismiss();
      await page.click('#m-tabbar button[data-v="' + id + '"]');
      await poll(() => page.$('#tab-' + id + ':not(.hide)').then(x => !!x), 6000);
    };
    /* 轮回页常驻承继块（不存在 ⇒ null） */
    const heirBlock = () => page.evaluate(() => {
      const btn = document.querySelector('#tab-legacy [data-act="heirSwitch"]');
      if (!btn) return null;
      const box = btn.closest('.tribready') || btn.parentNode;
      return (box.innerText || '').replace(/\s+/g, ' ');
    });
    /* 浮层视图对表：候选行文本 = 存档真值 × 词表在页内合成 */
    const heirView = () => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const wid = s.profile.worldId, w = s.worlds[wid], m = s.meta;
      const g = (k, vars) => SQ.t(k, vars || null, wid);
      const pack = SQ.Worlds[wid].pack, byId = pack.treasures.byId;
      const awakened = w.treasures.owned.filter(e => e.st && e.st.spirit && e.st.spirit.a);
      const rows = Array.prototype.slice.call(document.querySelectorAll('#hc-list .lrow'));
      const idOf = r => { const b = r.querySelector('[data-act="heirPick"]'); return b ? b.getAttribute('data-v') : null; };
      /* 与视图 heirStatusText 同序的合成：择定 > 显式不带 > 在档续带 > 未择定（空串）；
       * N18 补「择定件已失」支：择定不在候选且不是在档续带件 ⇒ 出失效说明，不再谎报已择定 */
      let status = '';
      if (m.heirChoice === SQ.Legacy.HEIR_NONE) status = g('spirit.ui.heir.skipped');
      else if (m.heirChoice) {
        const inCand = awakened.some(e => e.id === m.heirChoice);
        status = (!inCand && m.heirTreasure !== m.heirChoice)
          ? g('spirit.ui.heir.lost', { name: g('treasure.' + m.heirChoice + '.name') })
          : g('spirit.ui.heir.picked', { name: g('treasure.' + m.heirChoice + '.name') });
      }
      else if (m.heirTreasure) status = g('spirit.ui.heir.carry', { name: g('treasure.' + m.heirTreasure + '.name') });
      return {
        awakenedIds: awakened.map(e => e.id),
        rowIds: rows.map(idOf),
        rowTxt: rows.map(r => (r.innerText || '').replace(/\s+/g, ' ')),
        expectTxt: awakened.map(e => {
          const sp = e.st.spirit;
          const need = SQ.Fusion.needOf(pack.data, byId[e.id]);
          return [
            g('treasure.' + e.id + '.name') + ' ' + g('spirit.ui.awake'),
            g('spirit.ui.persona', { p: g('spirit.persona.' + sp.p + '.name') }) +
              ' · ' + g('spirit.ui.warm', { w: Math.floor(sp.w || 0), need: need }),
            g('spirit.ui.heir.pick')
          ].join(' ').replace(/\s+/g, ' ');
        }),
        curIds: rows.filter(r => r.classList.contains('cur')).map(idOf),
        primaryIds: rows.map(r => {
          const b = r.querySelector('button.primary');
          return b ? b.getAttribute('data-v') : null;
        }).filter(x => !!x),
        title: document.getElementById('hc-title').textContent,
        titleLex: g('spirit.ui.heir.title'),
        subLex: g('spirit.ui.heir.sub'),
        noneTxt: document.getElementById('hc-none').textContent,
        noneLex: g('spirit.ui.heir.skip'),
        skippedLex: g('spirit.ui.heir.skipped'),
        pickLex: g('spirit.ui.heir.pick'),
        cancelTxt: document.getElementById('hc-cancel').textContent,
        cancelLex: g('ui.cancel'),
        carryTxt: document.getElementById('hc-carry').textContent,
        expectStatus: status,
        modalTxt: (document.querySelector('#modal-heirchoice .modal').innerText || '').replace(/\s+/g, ' '),
        hcHidden: document.getElementById('modal-heirchoice').classList.contains('hide')
      };
    });
    /* 走完整一次兵解转世：点兵解 →（是否弹层）→ 确认 → 等落盘（lives+1 且世界已重置） */
    const runBingjie = async () => {
      await gotoTab('legacy');
      await page.click('#tab-legacy [data-act="dissolve"]');
      /* 先等确认出现再判「有没有弹层」：万一门真的弹了，确认只能在我择件后才出现，
       * 这里就会超时 ⇒ 断言红而不是把「读得太早」混成「没弹层」的假绿。 */
      const cfOk = await shown('#modal-confirm');
      const popped = !(await hidden('modal-heirchoice'));
      if (!cfOk) return { done: false, popped: popped, meta: await meta(), ws: await wnow(), reason: 'confirm 未出现' };
      await page.click('#cf-ok');
      const settled = await poll(async () => {
        const m = await meta(), w = await wnow();
        return dig(m, ['stats', 'lives']) === 1 && w.realm === 0 && !m.pendingRebirth;
      }, 9000);
      return { done: settled, popped: popped, meta: await meta(), ws: await wnow() };
    };

    await page.goto(URL0);
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
    return {
      ctx, page, errors, poll, shown, hidden, cnt, save, meta, wnow,
      dismiss, gotoTab, heirBlock, heirView, runBingjie
    };
  }

  /* ══ A 有资格 + 有觉醒件：入口 → 取消 → 择定 → 换一件 → 转世真生效 ════════ */
  {
    const C = await openCase('A', buildArchive({ eligible: true, awakened: true }));
    const { page } = C;

    await C.gotoTab('legacy');
    const nSw = await C.cnt('#tab-legacy [data-act="heirSwitch"]');
    const nDis = await C.cnt('#tab-legacy [data-act="dissolve"]');
    T(nSw === 1 && nDis === 1, 'A1 有资格且有觉醒件 ⇒ 轮回页承继块「换一件」入口 + 兵解入口在位',
      'heirSwitch=' + nSw + ' dissolve=' + nDis);

    /* 顶栏快捷入口同样受同一道前置门（承继门不挑入口，两入口同判据） */
    await C.gotoTab('idle');
    const nDisIdle = await C.cnt('#tab-idle [data-act="dissolve"]');
    await page.click('#tab-idle [data-act="dissolve"]');
    T(nDisIdle === 1 && await C.shown('#modal-heirchoice'),
      'A2 修行页「兵解转世」快捷入口同样触发选件浮层（门不挑入口）',
      'idleDissolve=' + nDisIdle);

    /* 取消 = 不转世（择定不写、确认不弹、境界不动） */
    await page.click('#hc-cancel');
    const cancelClean = await C.poll(async () => await C.hidden('modal-heirchoice'));
    const mA0 = await C.meta(), wA0 = await C.wnow();
    T(cancelClean && mA0.heirChoice === null && !(await page.$('#modal-confirm:not(.hide)')) && wA0.realm === 4,
      'A3 浮层「取消」⇒ 不落择定、不弹转世确认、本世未变（取消绝不等于误转世）',
      'hc=' + j(mA0.heirChoice) + ' realm=' + wA0.realm);

    await C.gotoTab('legacy');
    await page.click('#tab-legacy [data-act="dissolve"]');
    const v = await C.heirView();
    T(await C.shown('#modal-heirchoice') && v.hcHidden === false,
      'A4 轮回页入口触发选件浮层（可见、未被 .hide）', 'hcHidden=' + v.hcHidden);

    T(v.rowIds.join(',') === v.awakenedIds.join(',') && v.rowIds.length === 3,
      'A5 候选逐件成行 = 觉醒件数（保序、不多列不漏列；假觉醒与裸件不入列）',
      'rows=' + v.rowIds.join(',') + ' ‖ 觉醒=' + v.awakenedIds.join(','));
    T(v.rowTxt.length === v.expectTxt.length && v.rowTxt.every((t, i) => t === v.expectTxt[i]),
      'A6 每行「法宝名 + 人格 + 温养态」三要素可见且与存档真值 × 词表逐字一致', v.rowTxt[0] || '无行');
    T(v.title === v.titleLex && residue(v.title) === null &&
      v.cancelTxt === v.cancelLex && v.noneTxt === v.noneLex,
      'A7 标题/取消/「不带器灵转世」三处均取到词表值（非 key 回显）',
      v.title + ' / ' + v.cancelTxt + ' / ' + v.noneTxt);
    T(residue(v.modalTxt) === null, 'A8 浮层全文零裸英文 key / undefined / 花括号残留',
      residue(v.modalTxt) || 'clean');

    await page.click('[data-act="heirPick"][data-v="' + PICKED + '"]');
    T(await C.poll(async () => (await C.meta()).heirChoice === PICKED, 8000),
      'A9 点选某件 ⇒ meta.heirChoice = 该件 id 并落盘（读 sanqian-state-v1 主档）',
      'hc=' + (await C.meta()).heirChoice);
    T(await C.hidden('modal-heirchoice') && await C.shown('#modal-confirm'),
      'A10 择定后浮层收起、转世确认接续（流程不断在浮层里）',
      'hcHidden=' + (await C.hidden('modal-heirchoice')) +
      ' confirm=' + !!(await page.$('#modal-confirm:not(.hide)')));

    await page.click('#cf-cancel');
    await C.poll(() => C.hidden('modal-confirm'));
    const mA = await C.meta(), wA = await C.wnow();
    T(mA.heirChoice === PICKED && wA.realm === 4 && dig(mA, ['stats', 'lives']) === 0 && mA.heirTreasure === null,
      'A11 取消确认 ⇒ 未转世、择定留在本世且不落 heirTreasure（一世意图未消费）',
      'hc=' + mA.heirChoice + ' realm=' + wA.realm + ' lives=' + j(dig(mA, ['stats', 'lives'])));

    await C.gotoTab('legacy');
    await page.click('#tab-legacy [data-act="heirSwitch"]');
    const v2 = await C.heirView();
    T(await C.shown('#modal-heirchoice') && v2.curIds.join(',') === PICKED && v2.primaryIds.join(',') === PICKED,
      'A12「换一件」重开浮层：选中态唯一预标在旧择定件（.cur 与 .primary 同件）',
      'cur=' + v2.curIds.join(',') + ' primary=' + v2.primaryIds.join(','));
    T(v2.carryTxt.length > 0 && v2.carryTxt === v2.expectStatus && residue(v2.carryTxt) === null,
      'A13 浮层承继态行 = 词表「本世择定 · 件名」（与 meta 同源合成）', v2.carryTxt);

    await page.click('[data-act="heirPick"][data-v="' + SWITCH_TO + '"]');
    T(await C.poll(async () => (await C.meta()).heirChoice === SWITCH_TO, 8000),
      'A14 改选覆写 ⇒ heirChoice = 新件、旧件不再是选择项之值（只此一件、不叠加）',
      'hc=' + (await C.meta()).heirChoice + '（旧 ' + PICKED + ' 已非值）');
    const v3 = await C.heirView();
    const blkSeen = await C.poll(async () => {
      const b = await C.heirBlock();
      return !!b && b.indexOf(v3.expectStatus) >= 0;
    }, 5000);
    const blk = await C.heirBlock();
    T(blkSeen && residue(blk) === null,
      'A15 轮回页常驻承继块随择定更新且文案走词表（零裸 key）', (blk || '无块').slice(0, 96));
    T(await C.cnt('#tab-legacy [data-act="heirSwitch"]') === 1,
      'A16 择定后「换一件」入口仍在位（改主意路径常驻，非一次性）');

    await C.gotoTab('legacy');
    await page.click('#tab-legacy [data-act="dissolve"]');
    const again = await C.shown('#modal-confirm');
    T(again && await C.hidden('modal-heirchoice'),
      'A17 本世已择定 ⇒ 再点兵解不重复弹层（一次转世只弹一次）',
      'hcHidden=' + (await C.hidden('modal-heirchoice')) + ' confirm=' + again);

    await page.click('#cf-ok');
    const settled = await C.poll(async () => {
      const m = await C.meta(), w = await C.wnow();
      return dig(m, ['stats', 'lives']) === 1 && w.realm === 0 && !m.pendingRebirth;
    }, 9000);
    const mB = await C.meta(), wB = await C.wnow();
    T(settled, 'A18 转世事务完成（lives=1、世界已重置、无 pendingRebirth 残留）',
      'lives=' + j(dig(mB, ['stats', 'lives'])) + ' realm=' + wB.realm + ' pending=' + j(mB.pendingRebirth));

    const owned = (wB.treasures || {}).owned || [];
    const ent = owned.filter(e => e.id === SWITCH_TO)[0] || null;
    const sp = ent && ent.st && ent.st.spirit;
    T(owned.length === 1 && !!sp && sp.a === 1 && sp.p === 'jian' && sp.w === 300 &&
      sp.heir === 1 && sp.ru === 0 && sp.cd === 0 && sp.mk === 0 && sp.hun === 0,
      'A19 承继真生效：下世 owned 恰该择定 1 件，器灵觉醒态随件（a/p/w 同 + heir=1、冷却类归零）',
      'owned=' + owned.map(e => e.id).join(',') + ' snap=' + j(sp));
    T(mB.heirTreasure === SWITCH_TO && AUTO_FIRST === 'h04' && mB.heirChoice === null,
      'A20 择定压过「取第一件已觉醒者」自动口径，且择定为一次性意图（消费后归 null）',
      'heir=' + mB.heirTreasure + ' auto=' + AUTO_FIRST + ' hc=' + j(mB.heirChoice));
    const c1 = !!(await page.$('#sc-c1:not(.hide)'));
    T(c1, 'A21 转世后落创角屏（流程未卡死在无主界面）', 'c1=' + c1);

    /* ── A22~A24 盖棺之传（第册批 · 用户令「点兵解做一个逐字出现的传记总结演出」）──
     * 判据只立三件事：演出在位且取的是**存档里那条传记**（视图不许自己生成文本）、正文恒为该条的前缀
     *（逐字阶段的定义性判据：既不许多写也不许写串）、关掉之后确实落回创角屏。
     * 不钉「第 N 毫秒时有几个字」——那是拿墙钟当判据，本机一次 GC 就能把它咬红。
     * ⚠️ 标题那一判**必须量几何**（rect 高 > 0）：本批第一版把挂点写成 `mrc-title`，与「奇遇回看」
     * 浮层同 id，`getElementById` 取到文档里第一个（在 display:none 的子树里）⇒ textContent 照样设得上、
     * 断言照样绿，屏上却一个字都没有。只读文本值的判据放过这个错，几何判据不放。
     * ⚠️ 阈值只判 `> 0` 不判字号：卷轴入场是 `transform: scaleY(0→1)`，rect 吃变换，
     * 首帧读到 2px 是正常值（display:none 的子树读到的是精确 0）——写成 ≥12 就是一枚偶发红。 */
    const readRecap = () => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const bs = (s.meta.biographies || []);
      const full = ((bs[bs.length - 1] || {}).text) || '';
      const el = document.getElementById('mrp-text');
      const tt = document.getElementById('mrp-title');
      const got = el ? (el.textContent || '') : '';
      return {
        visible: !document.getElementById('modal-recap').classList.contains('hide'),
        title: (tt.textContent || '').trim(),
        titleH: Math.round(tt.getBoundingClientRect().height),
        titleDup: document.querySelectorAll('#mrp-title').length,
        kicker: (document.getElementById('mrp-kicker').textContent || '').trim(),
        /* B16-w：题签 = 盖棺之传，标题 = 「道号 · 一生」（两者都回词表） */
        kickerLex: SQ.t('legacy.ui.recap.title', null, s.profile.worldId),
        titleLex: SQ.t('legacy.ui.recap.life', { name: SQ.displayName(s) }, s.profile.worldId),
        rows: document.querySelectorAll('#mrp-rows li').length,
        goLex: (document.getElementById('mrp-go').textContent || '').trim(),
        goKey: SQ.t('legacy.ui.recap.go', null, s.profile.worldId),
        n: got.length, full: full.length,
        prefix: full.slice(0, got.length) === got,
        /* 前世书入口下线取证（同批）：这一族钮一个都不许再出现 */
        bioBtns: Array.prototype.slice.call(document.querySelectorAll('[data-act]'))
          .filter(b => /^bio(Ask|Adopt)$/.test(b.getAttribute('data-act'))).length
      };
    });
    const rc1 = await readRecap();
    T(rc1.visible && rc1.title === rc1.titleLex && rc1.titleH > 0 && rc1.titleDup === 1 &&
      rc1.kicker === rc1.kickerLex && rc1.rows === 4 &&
      rc1.goLex === rc1.goKey && rc1.n > 0 && rc1.prefix && rc1.bioBtns === 0,
      'A22 兵解即开盖棺之传：浮层在位 ‖ 题签「盖棺之传」+ 标题「道号 · 一生」都取词表值，标题**量得出高度、挂点全库唯一**（同 id 撞车会写进暗处那一个）‖ 本世四行在位 ‖ 钮名取词表值 ‖ 屏上正文恒为存档末条传记的前缀（视图零自造文本）‖ 前世书 bioAsk/bioAdopt 两钮全库 0 颗',
      'vis=' + rc1.visible + ' 题签=' + rc1.kicker + ' 标题=' + rc1.title + '@' + rc1.titleH + 'px/同族 id=' + rc1.titleDup +
      ' 行=' + rc1.rows + ' 钮=' + rc1.goLex + ' 字数=' + rc1.n + '/' + rc1.full + ' 前缀=' + rc1.prefix + ' 残留钮=' + rc1.bioBtns);
    await page.waitForTimeout(400);
    const rc2 = await readRecap();
    T(rc2.n >= rc1.n && (rc2.n > rc1.n || rc2.n === rc2.full) && rc2.prefix,
      'A23 逐字在推进：400ms 后要么变长、要么已写满（整段恒为零 = 演出根本没跑，判红）',
      rc1.n + ' → ' + rc2.n + '（全文 ' + rc2.full + '）');
    await page.click('#mrp-go');
    T(await C.poll(() => C.hidden('modal-recap'), 3000) && !!(await page.$('#sc-c1:not(.hide)')),
      'A24 点「入世」收起演出并停在创角屏（关法只此一条也不留遮罩拦后续点击）',
      'recapHidden=' + (await C.hidden('modal-recap')));
    T(C.errors.length === 0, 'A25 全程零 pageerror / 零 console error',
      C.errors.join(' | ').slice(0, 200) || 'clean');
    await C.ctx.close();
  }

  /* ══ B「不带器灵转世」（HEIR_NONE）：写入 → 态行 → 完成转世不承继 ══════════ */
  {
    const C = await openCase('B', buildArchive({ eligible: true, awakened: true }));
    const { page } = C;
    await C.gotoTab('legacy');
    await page.click('#tab-legacy [data-act="dissolve"]');
    await C.shown('#modal-heirchoice');
    const v = await C.heirView();
    await page.click('#hc-none');
    T(v.noneTxt === v.noneLex && residue(v.noneTxt) === null &&
      await C.poll(async () => (await C.meta()).heirChoice === 'none', 8000),
      'B1「不带器灵转世」控件在位（文案走词表）且点它 ⇒ heirChoice = 引擎哨兵并落盘',
      'btn=' + v.noneTxt + ' hc=' + (await C.meta()).heirChoice);
    T(await C.hidden('modal-heirchoice') && await C.shown('#modal-confirm'),
      'B2 显式不带不等同于取消：浮层收起、确认接续（流程不卡死）',
      'hcHidden=' + (await C.hidden('modal-heirchoice')));
    await page.click('#cf-cancel');
    await C.poll(() => C.hidden('modal-confirm'));
    await C.gotoTab('legacy');
    const v2 = await C.heirView();
    const blkB = await C.poll(async () => {
      const b = await C.heirBlock();
      return !!b && b.indexOf(v2.expectStatus) >= 0;
    }, 5000);
    T(blkB && v2.expectStatus === v2.skippedLex,
      'B3 轮回页承继态显式呈「本世不带器灵转世」（哨兵态有呈现，不静默回落成未择定）',
      'status=' + v2.expectStatus + ' 块=' + ((await C.heirBlock()) || '无').slice(0, 60));
    const r = await C.runBingjie();
    T(r.popped === false, 'B4 哨兵也算已择定 ⇒ 转世不重复弹层', 'popped=' + r.popped);
    const ownB = dig(r.ws, ['treasures', 'owned']) || [];
    T(r.done && r.meta.heirTreasure === null && r.meta.heirSpirit === null && ownB.length === 0,
      'B5 完成转世 ⇒ 双清不承继、下世不预置承继件，流程走到底',
      'heir=' + j(r.meta.heirTreasure) + ' owned=' + ownB.length +
      ' lives=' + j(dig(r.meta, ['stats', 'lives'])));
    T(r.done && !!(await page.$('#sc-c1:not(.hide)')), 'B6 不带器灵一路到创角屏（无死路）',
      'c1=' + !!(await page.$('#sc-c1:not(.hide)')));
    T(C.errors.length === 0, 'B7 全程零 pageerror / 零 console error',
      C.errors.join(' | ').slice(0, 200) || 'clean');
    await C.ctx.close();
  }

  /* ══ C 有资格但零觉醒候选：不弹层、不留点不开的按钮、转世照常完成 ══════════ */
  {
    const C = await openCase('C', buildArchive({ eligible: true, awakened: false }));
    const { page } = C;
    await C.gotoTab('legacy');
    const nSw = await C.cnt('#tab-legacy [data-act="heirSwitch"]');
    const blk = await C.heirBlock();
    const candN = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      return SQ.Legacy.heirCandidates(s.worlds[s.profile.worldId], SQ.Worlds[s.profile.worldId].pack).length;
    });
    T(candN === 0 && nSw === 0 && blk === null,
      'C1 持资格但本世零觉醒候选 ⇒ 候选 0 且承继块整块不出现（不留一个点不开的按钮）',
      'cands=' + candN + ' heirSwitch=' + nSw + ' block=' + (blk === null ? '无' : '有'));
    const r = await C.runBingjie();
    T(r.popped === false && r.done,
      'C2 零候选 ⇒ 兵解不弹选件浮层、确认直达（无浮层亦无死链）',
      'popped=' + r.popped + ' 确认可续转世=' + r.done);
    const ownC = dig(r.ws, ['treasures', 'owned']) || [];
    T(r.done && dig(r.meta, ['stats', 'lives']) === 1 && r.meta.heirChoice === null && ownC.length === 0,
      'C3 无觉醒件时转世流程照常完成（lives=1、下世空手但不悬停不报错）',
      'lives=' + j(dig(r.meta, ['stats', 'lives'])) + ' owned=' + ownC.length);
    T(r.done && !!(await page.$('#sc-c1:not(.hide)')), 'C4 无觉醒件 ⇒ 创角屏可见（无觉醒件不再是死路）',
      'c1=' + !!(await page.$('#sc-c1:not(.hide)')));
    T(C.errors.length === 0, 'C5 全程零 pageerror / 零 console error',
      C.errors.join(' | ').slice(0, 200) || 'clean');
    await C.ctx.close();
  }

  /* ══ D 无 shop.heir 资格：零打扰（有觉醒件也不弹）══════════════════════ */
  {
    const C = await openCase('D', buildArchive({ eligible: false, awakened: true }));
    const { page } = C;
    await C.gotoTab('legacy');
    const nSw = await C.cnt('#tab-legacy [data-act="heirSwitch"]');
    const blk = await C.heirBlock();
    const candN = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      return SQ.Legacy.heirCandidates(s.worlds[s.profile.worldId], SQ.Worlds[s.profile.worldId].pack).length;
    });
    T(nSw === 0 && blk === null && candN === 3,
      'D1 未购 shop.heir ⇒ 有 3 件觉醒候选仍零打扰（轮回页无承继块、无「换一件」）',
      'cands=' + candN + ' heirSwitch=' + nSw + ' block=' + (blk === null ? '无' : '有'));
    await C.gotoTab('legacy');
    await page.click('#tab-legacy [data-act="dissolve"]');
    const ok = await C.shown('#modal-confirm');
    T(ok && await C.hidden('modal-heirchoice'), 'D2 无资格 ⇒ 兵解不弹选件浮层（转世链与改造前同径）',
      'hcHidden=' + (await C.hidden('modal-heirchoice')) + ' confirm=' + ok);
    await page.click('#cf-ok');
    const doneD = await C.poll(async () => dig(await C.meta(), ['stats', 'lives']) === 1, 9000);
    const mD = await C.meta();
    T(doneD && mD.heirTreasure === null && mD.heirChoice === null,
      'D3 无资格 ⇒ 转世照常完成且零承继预置（未越 600 遗泽的闸门）',
      'lives=' + j(dig(mD, ['stats', 'lives'])) + ' heir=' + j(mD.heirTreasure));
    T(C.errors.length === 0, 'D4 全程零 pageerror / 零 console error',
      C.errors.join(' | ').slice(0, 200) || 'clean');
    await C.ctx.close();
  }

  /* ══ E 择定件已失（N18）：必须有解释 + 改选/清除入口，不留清不掉的脏择定 ══
   * 造法：持格（已购 shop.heir）+ 本世零觉醒候选 + meta.heirChoice 指向一件不在候选、
   * 也不是在档续带件的 id（= 玩家择定后把宝祭掉/熔了的下场）。
   * 改造前：轮回页整块不出现（零入口）＋状态行仍写「本世择定 · 一件已不在手的法宝」。 */
  {
    const C = await openCase('E', buildArchive({ eligible: true, awakened: false, staleChoice: PICKED }));
    const { page } = C;
    await C.gotoTab('legacy');
    const blk = await C.heirBlock();
    const nSw = await C.cnt('#tab-legacy [data-act="heirSwitch"]');
    const candN = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      return SQ.Legacy.heirCandidates(s.worlds[s.profile.worldId], SQ.Worlds[s.profile.worldId].pack).length;
    });
    T(candN === 0 && nSw === 1 && !!blk,
      'E1 零候选但有脏择定 ⇒ 承继块仍在、「换一件」在位（此前整块消失 = 脏择定永远清不掉）',
      'cands=' + candN + ' heirSwitch=' + nSw + ' block=' + (blk === null ? '无' : '有'));
    T(!!blk && /择定失效/.test(blk) && /已不在手/.test(blk),
      'E2 状态行给失效原因，不再谎报「本世择定」（引擎 legacy.js:438-439 实际会降级取第一件觉醒者/无则不带）',
      String(blk).slice(0, 70));
    await page.click('#tab-legacy [data-act="heirSwitch"]');
    const popped = await C.shown('#modal-heirchoice');
    const v = await C.heirView();
    T(popped && v.rowIds.length === 0 && /手上已无觉醒的器灵可择/.test(v.modalTxt),
      'E3 浮层候选为空时出专项空态说明（不摆一个空列表、不点不动）', 'rows=' + v.rowIds.length);
    T(v.carryTxt === v.expectStatus, 'E4 浮层状态行与合成口径逐字同值（视图零自造规则）',
      String(v.carryTxt).slice(0, 40));
    T(!residue(v.modalTxt), 'E5 浮层文本零残留（无裸 key / 无未填占位 / 无 undefined）', residue(v.modalTxt) || 'clean');
    await page.click('#hc-none');
    const cleared = await C.poll(async () => (await C.meta()).heirChoice === 'none', 8000);
    T(cleared, 'E6 点「不带器灵转世」⇒ 脏择定落盘为引擎哨兵、可彻底清除',
      'hc=' + j((await C.meta()).heirChoice));
    T(C.errors.length === 0, 'E7 全程零 pageerror / 零 console error',
      C.errors.join(' | ').slice(0, 200) || 'clean');
    await C.ctx.close();
  }

  console.log(fail === 0 ? 'UI_HEIRCHOICE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_HEIRCHOICE_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
