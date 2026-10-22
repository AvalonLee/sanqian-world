/* .tests/verify-ui-alltabs.cjs — 高境界下「每一个页都点得到、都渲染得出内容」全表实证
 * 为什么需要它：各系统页各有专篇（arts / market / bonds / sect / prodigy / faction / trib / karma /
 *   journal / rumor / fuse / legacy…），但**从没有一次把 15 个页在一趟里逐个点开**。
 *   境界门槛（`D.TAB_UNLOCK`）把 法宝(3) / 宗门(4) / 天骄(2) 几页挡在低境界之外，
 *   而存档件是 realm=1 的档 ⇒ **高境界同时点亮全部页时**这些渲染器有没有互相拖崩，无人验过。
 *   这类「单独都绿、合起来白屏」正是写了没人读 / 零渲染点缺陷族的最后一格。
 * 纪律（本仓已付代价）：页内取不到 `state`（IIFE 私有）⇒ 读态走 `localStorage['sanqian-state-v1']`；
 *   `SQ.mutate({}, fn)` 只落盘不换视图私有 state ⇒ 改完必须 reload 再断言渲染。
 * 用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-alltabs.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const KEY = 'sanqian-state-v1';

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  /* 存档件是 realm=1 的档 ⇒ 法宝(3) / 宗门(4) 等页永远进不了判据。
   * 直接在 Node 侧改件再注入（**不走页内 SQ.mutate**：那条路只证明落盘、换不掉视图私有 state，
   * 且实测这次页内抬境界没进渲染判据，与其赌两条通道不如从数据源头给一份高境界档）。 */
  const fx = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  fx.worlds.xiuxian.realm = 9;
  fx.worlds.xiuxian.total = Math.max(fx.worlds.xiuxian.total || 0, 100000);
  fx.worlds.xiuxian.qi = Math.max(fx.worlds.xiuxian.qi || 0, 50000);
  /* 第十四批审计 #4/#7/#11 三条判据的前置态：
   *   mode 钉成 seclude（×1.3）⇒ 顶部速率与「未乘模式乘区」的旧读数必然不同，判据才有鉴别力；
   *   有势力 + 叛离过 + 新门 rank 未达 ⇒ 「身份」那条只有按引擎口径才判得出 ✓（视图旧式会亮红 ✗）。 */
  fx.worlds.xiuxian.mode = 'seclude';
  fx.worlds.xiuxian.everDefected = true;
  fx.worlds.xiuxian.factionId = 'huangfeng';
  /* AT-D 的非空前提：给一枚带 qiRate 的天赋（effects 是**按字段名的对象**，不是数组）+ 一对能触发羁绊的
   * 真天赋 id（`TALENT_SYNERGIES` 的 gifted+diligent ⇒ 来源 'synergy'，qiRate +0.04）。
   * 为什么必须凑出 'synergy'：旧视图硬列的 10 个源里**没有它** ⇒ 只有本档真有 synergy 值，
   * 「明细漏源」这条判据才有鉴别力（空集上的相等不算证据，本仓纪律）。 */
  (fx.profile.talents || (fx.profile.talents = [])).push(
    { id: 'walk-qi', kind: 'positive', tier: 'common', world: 'common', weight: 1, amplified: false, effects: { qiRate: 0.05 } },
    { id: 'gifted', kind: 'positive', tier: 'common', world: 'common', weight: 1, amplified: false, effects: {} },
    { id: 'diligent', kind: 'positive', tier: 'common', world: 'common', weight: 1, amplified: false, effects: {} });
  const fixture = JSON.stringify(fx);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail === undefined ? '' : ' (' + detail + ')'));
  };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 90)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(String(m.text()).slice(0, 90)); });

  await page.addInitScript((a) => { try { localStorage.setItem(a.k, a.v); } catch (e) {} }, { k: KEY, v: fixture });
  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(500);

  const nav = await page.evaluate(() => {
    const btns = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'));
    return {
      total: btns.length,
      locked: btns.filter((b) => b.classList.contains('locked')).length,
      texts: btns.map((b) => b.textContent.trim())
    };
  });
  T(nav.locked === 0 && nav.total >= 15,
    'AT0 realm 9 下全部导航页点亮（无置灰 = 每一页都点得到）', 'btns=' + nav.total + ' locked=' + nav.locked);

  const seen = [];
  for (let i = 0; i < nav.total; i++) {
    const before = errors.length;
    const r = await page.evaluate((idx) => {
      const btns = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'));
      btns[idx].click();
      return new Promise((res) => setTimeout(() => {
        /* 切页会整条重绘导航，点下去之前握着的按钮节点可能已被换掉 ⇒ 结果一律重新取节点再判 */
        const btns2 = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'));
        const cur = btns2[idx] || {};
        const b = document.querySelector('.tabbody');
        const txt = b ? (b.innerText || b.textContent || '') : '';
        res({
          label: (cur.textContent || '').trim(),
          on: !!cur.classList && cur.classList.contains('on'),
          len: txt.length,
          cjk: /[一-龥]/.test(txt),
          junk: (txt.match(/undefined|NaN|\[object |\{[a-z]/g) || []).slice(0, 3).join(','),
          head: txt.replace(/\s+/g, ' ').slice(0, 26)
        });
      }, 420));
    }, i);
    seen.push(r.label);
    const clean = errors.length === before;
    T(r.on && r.len >= 20 && r.cjk && !r.junk && clean,
      'AT' + (i + 1) + ' 「' + r.label + '」页渲染出内容且零报错',
      'len=' + r.len + ' cjk=' + r.cjk + (r.junk ? ' junk=' + r.junk : '') + (clean ? '' : ' errs+=' + (errors.length - before)) + ' 首=' + r.head);
  }

  T(new Set(seen).size === nav.total, 'AT-Set 十五页各点到一次（无重复、无遗漏）', 'distinct=' + new Set(seen).size);

  /* ── 第十四批审计 #4 / #11 / #7：屏上的数必须由引擎同一个式子算出来 ──
   * 本仓头号缺陷类 = 同一规则两处各写一遍。这三条钉的是「视图自己算了一遍」那一族：
   *   AT-R 修行页顶部「产出 N/秒」=== `SQ.Idle.effRate`（含模式乘区），且**不等于**旧的 `rateOf` 读数
   *        （fixture 已把 mode 钉成 seclude ×1.3 ⇒ 两值必不同，摘回 rateOf 这一条就红）；
   *   AT-D 明细里每个有值的 qiRate 来源都要有一行（旧视图硬列 10 项，cave/caveFac/treasure/synergy/legacy
   *        被静默漏掉 ⇒ 明细相加永远对不上顶部数），且标签全部解析得出（不许裸英文上屏）；
   *   AT-G 宗门页四门槛 chip 的 ok/no 逐条 === `SQ.Sect.foundGates`（旧视图自己重写一遍判定，「身份」那条
   *        与引擎不同式 ⇒ 叛离过、新门 rank 未达的玩家按钮能点、同行亮红 ✗）。 */
  const clickTab = async (label) => {
    const idx = nav.texts.findIndex((x) => x.indexOf(label) >= 0);
    if (idx < 0) return false;
    await page.evaluate((i) => {
      const b = Array.prototype.slice.call(document.getElementById('m-tabbar').querySelectorAll('button'))[i];
      if (b) b.click();
    }, idx);
    await page.waitForTimeout(420);
    return true;
  };

  if (await clickTab('修行')) {
    const rRow = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data, w = st.worlds.xiuxian;
      pack.recalcDerived(w, st.profile);
      const mods = SQ.Mods.collect(st.profile, w, pack, D);
      const eff = SQ.Idle.effRate(w, pack, D, mods, false);
      const raw = SQ.Idle.rateOf(w, pack, D, mods);
      const btn = document.querySelector('#tab-idle [data-act="detailRate"]');
      const row = btn ? btn.parentElement : null;
      const m = ((row && row.innerText) || '').match(/([\d.]+)\/秒/);
      const shown = m ? m[1] : '';
      /* 明细展开后再逐源核对 */
      if (btn) btn.click();
      return { eff: eff.toFixed(1), raw: raw.toFixed(1), shown: shown, mode: w.mode };
    });
    await page.waitForTimeout(320);
    const dRow = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data, w = st.worlds.xiuxian;
      pack.recalcDerived(w, st.profile);
      const mods = SQ.Mods.collect(st.profile, w, pack, D);
      const box = document.querySelector('#tab-idle .dp-sheet, #tab-idle .detailbox');
      const txt = box ? (box.innerText || '') : '';
      const srcs = Object.keys((mods.detail && mods.detail.qiRate) || {}).filter((k) => Math.abs(mods.detail.qiRate[k]) > 1e-9);
      const missing = [], bare = [];
      srcs.forEach((k) => {
        const lb = SQ.t('idle.' + k, null, 'xiuxian');
        if (lb === 'idle.' + k) bare.push(k);
        else if (txt.indexOf(lb) < 0) missing.push(k);
      });
      return { n: srcs.length, missing: missing.join(','), bare: bare.join(','), hasBox: !!box };
    });
    T(rRow.shown === rRow.eff && rRow.eff !== rRow.raw,
      'AT-R 修行页顶部速率 === 引擎 effRate（含模式乘区，且与旧 rateOf 读数不同 = 这行改动有鉴别力）',
      'mode=' + rRow.mode + ' 屏上=' + rRow.shown + ' eff=' + rRow.eff + ' 旧 rateOf=' + rRow.raw);
    T(dRow.hasBox && dRow.n > 0 && !dRow.missing && !dRow.bare,
      'AT-D 明细按 mods 真实来源逐行渲染（漏源与裸英文键名都算失败）',
      '源数=' + dRow.n + ' 漏=' + (dRow.missing || '无') + ' 缺标签=' + (dRow.bare || '无'));

  } else {
    T(false, 'AT-R 修行页导航可定位', '找不到「修行」页签');
  }

  if (await clickTab('宗门')) {
    /* B16-ac 改口：已加入固定势力 ⇒ 宗门页 = 该势力主页（当前效力条 + 门中供给），
     * 不再显示开宗门槛（门槛只在「无势力」态出现，由 verify-ui-join 专篇覆盖）。 */
    const gRow = await page.evaluate(() => {
      const st = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = st.worlds.xiuxian;
      return {
        fid: w.factionId || '',
        strip: !!document.querySelector('#tab-sect .statestrip .s-v'),
        gates: document.querySelectorAll('#tab-sect .gate').length,
        supply: document.querySelectorAll('#tab-sect .matgrid > .matrow').length
      };
    });
    T(!!gRow.fid && gRow.fid !== 'sect' && gRow.strip && gRow.gates === 0 && gRow.supply === 4,
      'AT-G 已加入固定势力 ⇒ 宗门页显示该势力主页（效力条 + 供给四行），不再显示开宗门槛',
      JSON.stringify(gRow));
  } else {
    T(false, 'AT-G 宗门页导航可定位', '找不到「宗门」页签');
  }

  /* AT-H（B16-ad）：自立宗门治理区（改名 / 门规 / 宣言 / 税率 / 任免 / 逐出 / 解散）在屏上 */
  {
    const sx = JSON.parse(fixture), wS = sx.worlds.xiuxian;
    wS.factionId = 'sect';
    wS.factionWar = null;   /* 宣战段的前提是「无在打的仗」；fixture 里可能带着上一批的战争态 ⇒ 钉成确定值 */
    wS.sect = {
      name: '试剑宗', gate: 'wuyue', align: 'neutral', motto: '戒贪戒躁', tax: 0,
      disciples: [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 2, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }],
      fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 }, seq: 1,
      warRecord: { wins: 0, loses: 0 }, suppressed: {}, foundAt: Date.now()
    };
    wS.factions.push({ id: 'sect', name: '试剑宗', align: 'neutral', perk: { field: 'qiRate', v: 0 }, rel: {}, fixed: false });
    const ctxS = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await ctxS.addInitScript((a) => { try { localStorage.setItem(a.k, a.v); } catch (e) {} }, { k: KEY, v: JSON.stringify(sx) });
    const pS = await ctxS.newPage();
    const errS = [];
    pS.on('pageerror', (e) => errS.push(String(e.message).slice(0, 90)));
    await pS.goto(url);
    await pS.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 }).catch((e) => { console.log('AT-H_ERR', errS.join(' | ') || 'no pageerror'); throw e; });
    await pS.waitForTimeout(500);
    await pS.evaluate(() => { var b = document.querySelector('#m-tabbar button[data-v="sect"]'); if (b) b.click(); });
    await pS.waitForTimeout(400);
    /* AT-H 改口（第册一百一十八批 · 用户裁定宗名 / 门规（立场）/ 阵营 / 门规宣言立派后即定）：
     * 旧判据要「两枚编辑输入框同在」，那正是本批撤掉的东西。删除类断言必须同条咬一条正判据
     *（本仓立则），所以这一判同时量两头：治理段**零编辑控件**（input 与两条旧 act 都不许在），
     * 而那四样的值**仍要在屏上读得到**（宗名 / 门规 / 阵营 / 宣言）——锁改写口不等于把信息藏掉。 */
    const gov = await pS.evaluate(() => ({
      heads: Array.prototype.map.call(document.querySelectorAll('#tab-sect .sechead .t'), (x) => x.textContent.trim()),
      want: SQ.t('sect.gov.title', null, 'xiuxian'),
      tax: document.querySelectorAll('#tab-sect [data-act="sectGovTax"]').length,
      posts: document.querySelectorAll('#tab-sect [data-act="sectPost"]').length,
      expel: document.querySelectorAll('#tab-sect [data-act="sectExpel"]').length,
      disband: !!document.querySelector('#tab-sect [data-act="sectDisband"]'),
      editors: document.querySelectorAll('#tab-sect input').length +
        document.querySelectorAll('#tab-sect [data-act="sectGovField"], #tab-sect [data-act="sectGovRule"]').length,
      txt: (document.getElementById('tab-sect') || {}).innerText || '',
      /* AT-H4 用（第册一百二十批 · 任免三句孤儿文案上屏）：词表取词拼成期望串，视图只许照搬 */
      postLine: [SQ.t('sect.gov.post.hint', null, 'xiuxian'),
        SQ.t('sect.gov.post.steward', null, 'xiuxian') + ' ' + SQ.t('sect.gov.post.steward.eff', null, 'xiuxian'),
        SQ.t('sect.gov.post.elder', null, 'xiuxian') + ' ' + SQ.t('sect.gov.post.elder.eff', null, 'xiuxian')]
    }));
    const gateH = await pS.evaluate(() => SQ.t('sect.gate.wuyue.name', null, 'xiuxian'));
    const alignH = await pS.evaluate(() => SQ.t('sect.align.neutral.name', null, 'xiuxian'));
    T(gov.heads.indexOf(gov.want) >= 0 && gov.tax === 7 &&
      gov.posts >= 2 && gov.expel >= 1 && gov.disband && gov.editors === 0 &&
      gov.txt.indexOf('试剑宗') >= 0 && gov.txt.indexOf(gateH) >= 0 && gov.txt.indexOf(alignH) >= 0 &&
      gov.txt.indexOf('戒贪戒躁') >= 0 && errS.length === 0,
      'AT-H 治理区只剩税率七档 / 任免 / 逐出 / 解散：宗名·门规·阵营·宣言零编辑控件而四样仍只读在屏 · 零报错',
      JSON.stringify({ tax: gov.tax, posts: gov.posts, expel: gov.expel, editors: gov.editors }) +
      ' 名/规/营/言在屏=' + ['试剑宗', gateH, alignH, '戒贪戒躁'].map((x) => gov.txt.indexOf(x) >= 0).join(','));
    /* AT-H4（第册一百二十批 · 孤儿键接线）：任免规则与两枚职位实效此前只在引擎里（probe-sectgov V5 钉着
     * 执事 +10% 声望 / 长老 +10% 战力），屏上只有一颗颗「执事」「长老」钮。判的是**渲染结果含这三句**，
     * 期望串由词表拼出来 ⇒ 改文案不会假红，删掉接线一定红。 */
    T(gov.posts >= 2 && gov.postLine.every((x) => gov.txt.indexOf(x) >= 0),
      'AT-H4 弟子段一句任免规则 + 执事/长老各挂自己的 +10% 实效（三枚孤儿键上屏）',
      'posts=' + gov.posts + ' 命中=' + gov.postLine.map((x) => gov.txt.indexOf(x) >= 0).join(',') +
      ' 句=' + JSON.stringify(gov.postLine));
    await ctxS.close();
  }
  /* AT-H2（第册一百一十八批 · 用户裁定「门规宣言立派时写一次，之后不能改」）：
   * 端到端验那一步真能写下宣言——输入框在立派段里 ‖ 打字跨两个秒级 tick 不被重绘抹掉（融合坛
   * 自定义名 issue #5 同形坑，宣言框新加就必须同口径验一次）‖ 点「开宗立派」确认后**落盘的就是那句**。
   * 反证形：把 sectFound 分派里那句 motto 入参摘掉 ⇒ saved.motto 为空 ⇒ 本判红。 */
  {
    const sF = JSON.parse(fixture), wF = sF.worlds.xiuxian;
    /* 手造档纪律（.tests/README 立则）：进场前必须刷新时间锚并清 lastOffline / pendingChoice，
     * 否则 dt 过大会弹「出关呈报」浮层把点击整个挡住（本批首跑就是被 #modal-offline 拦死的）。 */
    const nowF = Date.now();
    sF.profile.createdAt = nowF; wF.lastSave = nowF; wF.lastOffline = null; wF.pendingChoice = null;
    wF.sect = null; wF.factionId = null; wF.realm = 6; wF.factionRepPeak = 9999; wF.everDefected = true;
    sF.meta = sF.meta || {}; sF.meta.unlocks = sF.meta.unlocks || {}; sF.meta.unlocks.sect = true;
    const ctxF = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await ctxF.addInitScript((a) => { try { localStorage.setItem(a.k, a.v); } catch (e) {} }, { k: KEY, v: JSON.stringify(sF) });
    const pF = await ctxF.newPage();
    const errF = [];
    pF.on('pageerror', (e) => errF.push(String(e.message).slice(0, 90)));
    await pF.goto(url);
    await pF.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await pF.waitForTimeout(500);
    await pF.evaluate(() => { var b = document.querySelector('#m-tabbar button[data-v="sect"]'); if (b) b.click(); });
    await pF.waitForTimeout(400);
    const hasIn = await pF.$('#sect-found-motto-input');
    let typedF = '', savedF = { motto: null, name: null };
    if (hasIn) {
      await pF.type('#sect-found-motto-input', '戒欺戒傲');
      await pF.waitForTimeout(2600);                       /* 跨至少两个秒级 tick */
      typedF = await pF.inputValue('#sect-found-motto-input');
      /* 点击一律走 evaluate：#tab-sect 每秒被 tick 整段重建，page.click 的「元素稳定」检查
       * 会一直重试到超时（三浮层那篇立过的规矩：本篇点击全走 evaluate）。 */
      await pF.evaluate(() => { document.querySelector('#tab-sect [data-act="sectFound"]').click(); });
      await pF.waitForSelector('#modal-confirm:not(.hide)', { timeout: 8000 });
      await pF.evaluate(() => { document.getElementById('cf-ok').click(); });
      await pF.waitForTimeout(900);
      savedF = await pF.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
        const sec = (s.worlds.xiuxian || {}).sect || {};
        return { motto: sec.motto || '', name: sec.name || '' };
      });
    }
    /* 立派完成后再量宣战段（第册一百一十八批 · 用户报「宣战入口在哪我没找到」）：
     * 这一段现在**恒在**——有敌对就列名（chips ≥1），没有敌对就给一句「谁结仇谁才进来」。
     * 放在这里量而不是 AT-H：AT-H 那份手造档的 `sect` 池条目会被 normalize 重建时丢掉，
     * 只有真走过 `foundSect` 才有的出正确的sect势力条目（把判据挂在渲得出来的那一侧）。 */
    const warF = await pF.evaluate(() => ({
      heads: Array.prototype.map.call(document.querySelectorAll('#tab-sect .sechead .t'), (x) => x.textContent.trim()),
      want: SQ.t('sect.war.btn', null, 'xiuxian'),
      none: SQ.t('sect.war.none', null, 'xiuxian'),
      chips: document.querySelectorAll('#tab-sect [data-act="sectWar"]').length,
      txt: (document.getElementById('tab-sect') || {}).innerText || ''
    }));
    T(!!hasIn && typedF === '戒欺戒傲' && savedF.motto === '戒欺戒傲' && !!savedF.name && errF.length === 0,
      'AT-H2 宣言在立派那一步写入且落盘（打字跨 tick 不被抹 · 确认后存档里就是那句 · 宗名同时落定）',
      '有输入框=' + !!hasIn + ' 打完=' + typedF + ' 落档=' + JSON.stringify(savedF) + ' 报错=' + (errF[0] || '无'));
    T(warF.heads.indexOf(warF.want) >= 0 && (warF.chips >= 1 || warF.txt.indexOf(warF.none.slice(0, 12)) >= 0),
      'AT-H3 立派后宣战段恒在屏（有敌列名下战书 ‖ 无敌对也说明「谁结仇谁才进得来」）',
      'heads=' + warF.heads.join('/') + ' chips=' + warF.chips + ' 解释句在屏=' + (warF.txt.indexOf(warF.none.slice(0, 12)) >= 0));
    /* AT-H5（第册一百二十二批 · 结仇宣战上屏）：判的三件事都是「消费关系」——
     *   ① 每一枚 sectWar 钮要么挂敌对口（只有名字）、要么挂结仇口（名字 + 引擎那口 `warOpenCost` 的标价），
     *      两类之和必须等于「势力池除去本门的条目数」⇒ 这一判天然非空（固定五门恒在），不会栽在空集恒真上；
     *   ② 价由 `SQ.Sect.warOpenCost` 现算，与钮上那几个字逐字对表 ⇒ 视图另立一把尺子当场红；
     *   ③ 段尾那句代价说明「有结仇钮才出现」——开·关是同一条件的两面（foundSect 的关系档带随机，
     *      全敌对是小概率支路，出现与否都算这条判据成立，读数一并打出来便于下回诊断）。 */
    const warOpen = await pF.evaluate((k) => {
      const S = (key, v) => SQ.t(key, v, 'xiuxian');
      const st = JSON.parse(localStorage.getItem(k) || '{}');
      const w = (st.worlds || {}).xiuxian || {};
      const pool = (w.factions || []).filter((f) => f.id !== 'sect');
      const btns = Array.prototype.slice.call(document.querySelectorAll('#tab-sect [data-act="sectWar"]'))
        .map((b) => ({ v: b.dataset.v, t: (b.textContent || '').replace(/\s+/g, ' ').trim() }));
      const openWord = S('sect.war.open.cost', { n: '' }).replace(/\s+/g, ' ').trim().split(' ')[0];
      const opens = btns.filter((b) => b.t.indexOf(openWord) >= 0);
      return {
        pool: pool.length, btnN: btns.length, openN: opens.length,
        priceOk: opens.every((b) => b.t.indexOf(S('sect.war.open.cost', { n: SQ.fmt(SQ.Sect.warOpenCost(w, SQ.XDATA, b.v)) })) >= 0),
        plainOk: btns.filter((b) => b.t.indexOf(openWord) < 0).every((b) => {
          const f = pool.filter((x) => x.id === b.v)[0];
          return !!f && b.t === f.name;
        }),
        why: S('sect.war.open.why', {
          cut: Math.round((SQ.XDATA.SECT.WAR_REP_SELF_CUT != null ? SQ.XDATA.SECT.WAR_REP_SELF_CUT : 0.10) * 100),
          karma: Math.abs(SQ.XDATA.SECT.WAR_OPEN_KARMA != null ? SQ.XDATA.SECT.WAR_OPEN_KARMA : -30)
        }),
        txt: (document.getElementById('tab-sect') || {}).innerText || ''
      };
    }, KEY);
    T(warOpen.btnN === warOpen.pool && warOpen.pool >= 1 && warOpen.priceOk && warOpen.plainOk &&
      ((warOpen.openN >= 1) === (warOpen.txt.indexOf(warOpen.why.slice(0, 14)) >= 0)) && errF.length === 0,
      'AT-H5 宣战段列全池：敌对钮只挂名、非敌对钮挂「结仇宣战 + 引擎标价」，代价句随结仇钮同现同隐',
      JSON.stringify({ pool: warOpen.pool, btnN: warOpen.btnN, openN: warOpen.openN, priceOk: warOpen.priceOk, plainOk: warOpen.plainOk }));
    await ctxF.close();
  }

  /* AT-SB 滚动条已换成主题样式（第十九批 · 用户令「整个游戏的滚动条和界面不太匹配，美化一下」）。
   * ⚠️ 量法：本环境（Win11 + 新版 Chromium）走 **overlay 滚动条**，`offsetWidth − clientWidth` 恒为 0
   *   ——拿布局占位当判据会把一条正确的样式测成红（首跑即此形，登记防下批重踩）。
   *   改问 CSSOM：探针元素上 `::-webkit-scrollbar` 的计算宽度 === 本仓定义的 9px ⇒ 证「规则在、且作用到本文件」。 */
  const sbW = await page.evaluate(() => {
    const probe = (doc) => {
      const box = doc.createElement('div');
      box.style.cssText = 'width:60px;height:60px;overflow-y:scroll;position:absolute;left:0;top:0';
      const inner = doc.createElement('div'); inner.style.height = '400px'; box.appendChild(inner);
      doc.body.appendChild(box);
      const w = doc.defaultView.getComputedStyle(box, '::-webkit-scrollbar').width;
      const gap = box.offsetWidth - box.clientWidth;
      doc.body.removeChild(box);
      return { w: w, gap: gap };
    };
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:absolute;left:-9999px;width:120px;height:120px';
    document.body.appendChild(fr);
    const bare = probe(fr.contentDocument);      /* 无本仓样式的对照文档 */
    document.body.removeChild(fr);
    return { own: probe(document), bare: bare };
  });
  T(sbW.own.w === '9px' && sbW.bare.w !== '9px',
    'AT-SB 滚动条 = 主题细身样式（本文件 `::-webkit-scrollbar` 计算宽 9px，无样式对照文档不是 9px）',
    '本仓=' + sbW.own.w + ' 对照=' + sbW.bare.w + ' ‖ 布局占位=' + sbW.own.gap + 'px（overlay 不占位，不作判据）');

  T(errors.length === 0, 'AT-Err 全表逐页点完后零 pageerror / 零 console.error', errors.slice(0, 3).join('|') || 'clean');

  console.log(fail === 0 ? 'UI_ALLTABS_ALL_GREEN ' + pass + '/' + (pass + fail)
    : 'UI_ALLTABS_FAILED ' + fail + '/' + (pass + fail));
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
