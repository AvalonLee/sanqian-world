/* .tests/verify-ui-ambush.cjs — 袭击 / 族中寻仇 真机走查（第卌四批 2026-10-16 · 数值详设 §6.1B · 天骄卷 §五B）
 * 依赖：playwright-core（根 package.json 已声明）；用法：node .tests/verify-ui-ambush.cjs（扩展根）
 *
 * 这一族的**全部形状**都在屏上（限时、只一枚按钮、超时默认迎战、战术选项不打善恶前缀），
 * 冒烟只能证引擎侧的账，证不了「玩家看得见什么」——所以本篇是这条机制的唯一实跑证据。
 * 时钟：一律 `page.clock.install(T0)` 把墙钟冻在种档时刻（dtMs=0 ⇒ boot 那一次 claim 不结算任何产出），
 *   再用 `clock.runFor(毫秒)` 推进秒级计时器（fastForward 对同一枚回调至多跑一次，量不出倒计时递减）。
 *
 * 场景：
 *   P 遇袭世（realm 5 / 敌手快照 realm 6）→ 三枚按钮（迎战/认输/避战）+ 正文第二行「来者 X · 战力 N」
 *     + 页脚时限读数随 runFor 变小 + **零善恶前缀**（战术抉择不是正道/魔道/左道）。
 *   T 同一档继续 runFor 过 90s → 超时默认迎战自动结算：pendingChoice 清空、灵石增加（ realm5 战力压 realm6 门槛×0.6，判定必过）。
 *   R 认输世 → 点「认输」→ 灵石按 RANSOM 比例减少、道伤不涨、挂起清空。
 *   V 寻仇世（ws.revenge 在档 + 冷却已到）→ boot 自动挂上寻仇抉择，**屏上只一枚按钮**（模板只声明 right 一支）
 *     且页脚仍带时限；天骄页顶部有「一族寻仇 · 已胜 n 场」一行。
 *   A 自动奇遇开启（settings.autoEvent=true）+ 挂起战术抉择 → runFor 数秒 ⇒ 战术抉择**不被自动代择**（弹窗仍在）。
 *   D 冷却世（realm 8 压 realm2 天骄 ⇒ 稳输）：点「袭杀此人」→ 确认 → 道伤行涨到 warn+2、按钮转「伏击未复」禁用、名录人数不变。
 * 判据面：屏上每个数都由引擎表回算（FOE_K / DECIDE_MS / RANSOM 比例 / REALMS 基准），换表即换字。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { load } = require('./sandbox.cjs');

const X = load([], { quiet: true }).SQ.XDATA;
const A = X.AMBUSH;
const T0 = 1790000000000;

function buildSave(muts) {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-save.json'), 'utf8'));
  s.profile.createdAt = T0;
  Object.values(s.worlds).forEach((w) => {
    w.lastSave = T0; w.lastOffline = null; w.pendingChoice = null; w.qi = 100; w.stones = 60000;
    Object.keys(muts || {}).forEach((k) => { w[k] = muts[k]; });
  });
  return s;
}
/* 敌手快照由表算（走查不写死战力数）：realm = 玩家+1 钳顶、power = REALMS[realm].power × 系数 */
function foeOf(realm, k) {
  var r = Math.min(realm + 1, X.REALMS.length - 1);
  return { nm: '韩立', src: 'bond', realm: r, power: Math.round(X.REALMS[r].power * k) };
}
const pend = (id, realm, k) => ({ id: id, at: T0, tier: id === 'ambush_revenge' ? 'tian' : 'di',
  nature: 'bad', via: id === 'ambush_revenge' ? 'revenge' : 'ambush', foe: foeOf(realm, k) });

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };

  const openPage = async (save, autoEvent) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await ctx.addInitScript((o) => {
      localStorage.setItem('sanqian-state-v1', o.s);
      if (o.ae) {   /* 自动奇遇开关走 settings（引擎设置位，不是角色状态） */
        var s = JSON.parse(o.s); s.settings.autoEvent = true;
        localStorage.setItem('sanqian-state-v1', JSON.stringify(s));
      }
    }, { s: JSON.stringify(save), ae: !!autoEvent });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.clock.install({ time: new Date(T0) });
    await page.goto(url);
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
    return { ctx, page, errors };
  };
  const state = (page) => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1') || '{}');
    const w = (s.worlds || {})[s.profile && s.profile.worldId] || {};
    const m = document.getElementById('modal-choice');
    return {
      open: !!(m && !m.classList.contains('hide')),
      title: (document.getElementById('mc-title') || {}).textContent || '',
      story: (document.getElementById('mc-story') || {}).textContent || '',
      foot: (document.getElementById('mc-foot') || {}).textContent || '',
      branches: Array.prototype.map.call(document.querySelectorAll('#mc-branches button'),
        (b) => ({ txt: (b.textContent || '').replace(/\s+/g, ' ').trim(), v: b.dataset.v, dis: !!b.disabled })),
      stones: w.stones || 0, dao: w.daoShang || 0, pend: w.pendingChoice || null,
      /* 屏上出口三读（2026-10-18 用户报「魔道来犯点不动又关不掉」补）：抉择模态**不在遮罩可关族里**、
       * ESC 也不关它 ⇒ 唯一出口是结果页那枚「确定」，所以「分支排收没收 / 结果页在不在」就是能不能关的判据 */
      branchesHidden: !!(document.getElementById('mc-branches') || { classList: { contains: function () { return false; } } }).classList.contains('hide'),
      resultShown: !!(document.getElementById('mc-result') || { classList: { contains: function () { return false; } } }).classList.contains('hide') === false,
      okTxt: (document.getElementById('mc-ok') || {}).textContent || '',
      log: (w.log || []).slice(-4).map((l) => l.cat + '|' + String(l.text).replace(/\s+/g, ' ').slice(0, 46)),
      nProv: (w.prodigies || []).length, revenge: w.revenge || null,
      feed: (((w.eventHistory || {}).feed) || []).slice(0, 2),
      side: String(localStorage.getItem('sanqian-logs-v1') || ''),
      foeTxt: (function () { var f = w.pendingChoice && w.pendingChoice.foe; return f && window.SQ ? SQ.fmt(f.power) : ''; })()
    };
  });

  /* ══ P/T 遇袭世：三枚战术按钮 + 时限递减 + 超时默认迎战 ══ */
  {
    const { ctx, page, errors } = await openPage(buildSave({ realm: 5, karma: 900, bonds: { hanli: 40 },
      pendingChoice: pend('ambush_by_evil', 5, A.FOE_K) }));
    await page.clock.runFor(1200);
    const p0 = await state(page);
    const expFoe = foeOf(5, A.FOE_K);
    T(p0.open && /魔道来犯/.test(p0.title), 'P0 进线即弹遇袭抉择（战术抉择不自动代择，标题取事件名）', 'title=' + p0.title);
    T(p0.branches.length === 3 && ['right', 'evil', 'neutral'].join(',') === p0.branches.map((b) => b.v).join(','),
      'P1 三枚按钮齐（迎战 / 认输 / 避战）且键序固定', p0.branches.map((b) => b.v).join('/'));
    T(p0.branches.every((b) => !/^(正道|魔道|左道)\s*·/.test(b.txt)) && /迎战|认输|避战/.test(p0.branches[0].txt),
      'P2 按钮文字**不带善恶前缀**（迎战/避战/认输是战术，不是道德阵营）', p0.branches.map((b) => b.txt.slice(0, 12)).join(' | '));
    /* B16-v：问段 = 设计稿全屏两段（薄雾 / 日期 / 选项卡），不是普通居中模态 */
    const shell0 = await page.evaluate(() => ({
      cls: document.getElementById('modal-choice').className,
      mist: !!document.querySelector('#modal-choice .ch-mist'),
      date: (document.getElementById('mc-date') || {}).textContent.trim(),
      opts: document.querySelectorAll('#mc-branches .opt').length,
      askHidden: document.getElementById('mc-ask').classList.contains('hide')
    }));
    T(/choice/.test(shell0.cls) && shell0.mist && !!shell0.date && shell0.opts === 3 && !shell0.askHidden,
      'P2b 抉择演出 = 设计稿全屏「问」段（薄雾 + 日期 + 三张选项卡）', JSON.stringify(shell0));
    T(p0.story.indexOf('来者 ' + expFoe.nm + ' · 战力 ' + p0.foeTxt) >= 0 && p0.pend.foe.power === expFoe.power,
      'P3 正文第二行报来者名号与战力（取表：REALMS[6].power × FOE_K = ' + expFoe.power + '）',
      p0.story.slice(-34));
    T(/时限/.test(p0.foot) && /迎战/.test(p0.foot), 'P4 页脚带「时限 …，未择即迎战」读数', p0.foot.slice(-30));
    const foot0 = p0.foot;
    await page.clock.runFor(30000);
    const p1 = await state(page);
    T(p1.foot !== foot0 && /时限/.test(p1.foot) && p1.pend && p1.pend.id === 'ambush_by_evil',
      'P5 时限随在线秒数变小且挂起未清（fastForward 只跑一次回调 ⇒ 本条用 runFor 真推进）',
      foot0.slice(-14) + ' → ' + p1.foot.slice(-14));
    /* 超时：90s 整（DECIDE_MS）后再推进 ⇒ 自动迎战 */
    for (let i = 0; i < 14 && (await state(page)).pend; i++) await page.clock.runFor(9000);
    const p2 = await state(page);
    T(p2.pend === null && p2.stones > p1.stones,
      'T1 超时默认迎战并自动结算（挂起清空，灵石只增不减 = 迎战胜档）',
      'pend=' + JSON.stringify(p2.pend) + ' stones ' + p1.stones + '→' + p2.stones);
    T(/"via":"ambush"/.test(p2.side) && /"branch":"right"/.test(p2.side),
      'T2 超时结算与手点同走一条 resolveBranch：奇遇叙事流落了 via=ambush / branch=right 一行（日志另在独立档，见 #206）',
      '侧档 ' + p2.side.length + 'B ‖ 主档 feed=' + JSON.stringify(p2.feed[0] || null).slice(0, 40));
    T(errors.length === 0, 'T3 遇袭全程零页面报错', errors.slice(0, 2).join(' | ') || 'clean');
    /* T4 = 超时之后**屏上也得结清**：引擎侧 T1/T2 只证「账结了」，不证这一屏关得掉。
     * 抉择模态既不吃遮罩也不吃 ESC ⇒ 分支排必须收起、结果页与「确定」必须到位。 */
    T(p2.open === true && p2.branchesHidden === true && p2.resultShown === true && p2.okTxt !== '',
      'T4 超时结算后浮层落到结果页（分支排已收 ‖ 结果页在位 ‖「确定」有字 ⇒ 关得掉，不是一排点了没反应的按钮）',
      'open=' + p2.open + ' 分支收=' + p2.branchesHidden + ' 结果页=' + p2.resultShown + ' ok=' + JSON.stringify(p2.okTxt));
    /* B16-v：结果段按设计稿 = 印（成/败）+ 缘已定 + 四项标签 */
    const res2 = await page.evaluate(() => ({
      mark: (document.getElementById('mc-mark') || {}).textContent.trim(),
      title: (document.getElementById('mc-res-title') || {}).textContent.trim(),
      gks: Array.prototype.map.call(document.querySelectorAll('#modal-choice .ch-list .gk'),
        (x) => x.textContent.trim())
    }));
    T(!!res2.mark && !!res2.title && res2.gks.length === 4 && res2.gks.every((x) => x.length > 0),
      'T4b 结果段 = 印 + 缘已定 + 四项标签（道心/得失/独占/缘）', JSON.stringify(res2));
    await page.click('#mc-ok');
    const p3 = await state(page);
    T(p3.open === false, 'T5 点「确定」浮层收起（玩家能从超时这一屏走出来）', 'open=' + p3.open);
    await ctx.close();
  }

  /* ══ R 认输世：按 RANSOM 比例出血、不添内伤 ══ */
  {
    const { ctx, page, errors } = await openPage(buildSave({ realm: 5, karma: 900, bonds: { hanli: 40 },
      pendingChoice: pend('ambush_by_right', 5, A.FOE_K) }));
    await page.clock.runFor(1200);
    const r0 = await state(page);
    await page.click('#mc-branches button[data-v="evil"]');
    await page.clock.runFor(2000);
    const r1 = await state(page);
    const paid = r0.stones - r1.stones;
    T(r0.branches.length === 3 && r1.pend === null, 'R1 点「认输」即结算并清空挂起', 'paid=' + paid);
    T(paid > 0 && Math.abs(paid / r0.stones - 0.15) < 0.02,
      'R2 认付出血 ≈ 随身灵石的 15%（模板 stonesPct 通道，与屏上文案同值）',
      r0.stones + '→' + r1.stones + ' 比例 ' + (paid / r0.stones * 100).toFixed(1) + '%');
    T(r1.dao === 0, 'R3 认输不添内伤（道伤槽仍 0 = 破财挡灾那条叙事为真）', 'dao=' + r1.dao);
    T(errors.length === 0, 'R4 认输路零页面报错', errors.slice(0, 2).join(' | ') || 'clean');
    await ctx.close();
  }

  /* ══ V 寻仇世：只一枚按钮 + 链条横幅；A 自动模式不代择战术 ══ */
  {
    const { ctx, page, errors } = await openPage(buildSave({ realm: 5, karma: 900, bonds: { hanli: 40 },
      prodigies: [], revenge: { n: 2, nextAt: T0, foe: '沈孤云' },
      /* 敌手快照给一档打得过的（战力式子本身由冒烟 #311(b) 逐值钉；本篇只测屏上形状） */
      pendingChoice: Object.assign(pend('ambush_revenge', 5, A.REVENGE_K),
        { foe: { nm: '沈孤云 的族中高手', src: 'clan', realm: 3, power: X.REALMS[3].power } }) }));
    await page.clock.runFor(1200);
    const v0 = await state(page);
    T(v0.open && v0.branches.length === 1 && v0.branches[0].v === 'right',
      'V1 寻仇浮层只一枚按钮（模板仅声明 right ⇒ 界面没有第二颗可点的钮，不需要「置灰的避战」）',
      v0.branches.map((b) => b.txt.slice(0, 10)).join(' | '));
    T(v0.branches[0].dis === false, 'V2 迎战钮不因战力不足被禁（这一族的「难」不许由 disabled 替玩家决定）',
      'disabled=' + v0.branches[0].dis);
    await page.click('#mc-branches button[data-v="right"]');
    await page.clock.runFor(2500);
    const v1 = await state(page);
    T(v1.pend === null && v1.revenge && v1.revenge.n === 3 &&
      v1.revenge.nextAt >= T0 + A.REVENGE_CD_MS && v1.revenge.nextAt < T0 + A.REVENGE_CD_MS + 60000,
      'V3 胜后链条账上屏：连胜 2→3、nextAt = now + ' + (A.REVENGE_CD_MS / 60000) + ' 分钟',
      JSON.stringify(v1.revenge));
    await page.click('#mc-ok');                       /* 结算后浮层停在结果页，须先收起才能切页 */
    await page.click('#m-tabbar button[data-v="prodigy"]')   /* 第册一批③：页签改名「江湖榜」⇒ 按 data-v 取，不再按文案（文案匹配是走查的头号脆性） */;
    await page.clock.runFor(1500);
    const pv = await page.$eval('#tab-prodigy', (el) => (el.textContent || '').replace(/\s+/g, ' '));
    T(/一族寻仇 · 已胜 3 场/.test(pv), 'V4 江湖榜页顶部常驻链条读数', (pv.match(/一族寻仇[^·]*·[^‖]{0,12}/) || ['无该行'])[0]);
    T(errors.length === 0, 'V5 寻仇全程零页面报错', errors.slice(0, 2).join(' | ') || 'clean');
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await openPage(buildSave({ realm: 5, karma: 900, bonds: { hanli: 40 },
      pendingChoice: pend('ambush_by_evil', 5, A.FOE_K) }), true);
    await page.clock.runFor(5000);
    const a0 = await state(page);
    T(a0.open && a0.pend && a0.pend.id === 'ambush_by_evil',
      'A1 开了自动奇遇也**不代择**战术抉择（用户令「必须手动选」：自动模式管机缘，不管这一念之间）',
      'open=' + a0.open + ' pend=' + (a0.pend && a0.pend.id));
    T(errors.length === 0, 'A2 自动模式战术抉择零页面报错', errors.slice(0, 2).join(' | ') || 'clean');
    await ctx.close();
  }

  /* ══ D 袭杀世：详情面三要素 + 确认出手 + 败局道伤与冷却钮 ══ */
  {
    const w = buildSave({ realm: 8, karma: -900, bonds: { hanli: 40 }, prodigies: [
      { id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 2, rlm: 9, prg: 0,
        feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, amb: 0, boost: null, eternal: false, wl: [0, 0, 0] }
    ], daoShang: A.KILL_DAO * 4 - 1 });
    const { ctx, page, errors } = await openPage(w);
    await page.clock.runFor(1200);
    await page.click('#m-tabbar button[data-v="prodigy"]')   /* 第册一批③：页签改名「江湖榜」⇒ 按 data-v 取，不再按文案（文案匹配是走查的头号脆性） */;
    await page.clock.runFor(1200);
    await page.click('#tab-prodigy button[data-act="prodDetail"][data-v="pr1"]');
    await page.clock.runFor(1200);
    const box = await page.$eval('#tab-prodigy', (el) => (el.textContent || '').replace(/\s+/g, ' '));
    T(/袭杀/.test(box) && /需战力 ≥ 对方 ×1.2/.test(box) && /已遭袭杀 0\/3 次/.test(box),
      'D1 详情面「袭杀」区三要素在位（门槛倍率 / 已袭杀次数 / 夺资额全取表）', box.slice(-96));
    const before = await state(page);
    await page.click('#tab-prodigy button[data-act="ambushProd"][data-v="pr1"]');
    await page.waitForSelector('#modal-confirm:not(.hide)', { timeout: 8000 });
    const cf = await page.$eval('#cf-text', (el) => (el.textContent || '').replace(/\s+/g, ' '));
    T(/伏击/.test(cf) && /寻仇/.test(cf), 'D2 出手前二次确认（五要素全透明：夺资 / 道伤 / 善恶 / 次数 / 后果）', cf.slice(0, 70));
    await page.click('#cf-ok');
    await page.clock.runFor(2500);
    const after = await state(page);
    T(after.dao - before.dao > A.KILL_DAO * 0.9 && after.dao - before.dao < A.KILL_DAO * 1.1,
      'D3 稳输档出手（realm8 打 realm9 天才，×1.2 门槛必不过）→ 道伤 +1 走 daoAdd 唯一写口（差额里那一点是岁月疗养，不当判据）',
      'dao ' + before.dao.toFixed(3) + '→' + after.dao.toFixed(3));
    const box2 = await page.$eval('#tab-prodigy', (el) => (el.textContent || '').replace(/\s+/g, ' '));
    T(/伏击未复/.test(box2) && after.nProv === 1,
      'D4 冷却期内按钮转「伏击未复」禁用且名录人数不变（袭杀不是切磋，输了人不消失）', box2.slice(-70));
    T(errors.length === 0, 'D5 袭杀全程零页面报错', errors.slice(0, 2).join(' | ') || 'clean');
    await ctx.close();
  }

  T(fail === 0, 'AMB 汇总：袭击 / 寻仇 / 袭杀 三条链的屏上形状全部有据', '断言 ' + pass + '/' + (pass + fail));
  console.log(fail === 0 ? 'UI_AMBUSH_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_AMBUSH_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('SCRIPT_ERROR', e); console.error(e && e.stack); process.exit(2); });
