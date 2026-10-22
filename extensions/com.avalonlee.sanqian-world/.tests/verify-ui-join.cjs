/* .tests/verify-ui-join.cjs — 携才投效（N6）玩家侧界面走查（playwright-core + Edge headless）
 *
 * 为什么需要它：本链此前长期是「常量在册、入库口在档、生产者零调用点」——引擎探针能证明数字动了，
 *   但**玩家看不见就等于没内容**。本篇分两相：
 *   相 A（渲染）= 建场时用**真引擎**跑一次 tryJoin，把产出的弟子与日志原样写进存档，再让浏览器读它：
 *     U1 化神档宗门页可进 · 名额来自客舍       U2 弟子行显天骄本名（名源名录、非山门俗名回落）
 *     U3 弟子行带「天骄」角标                 U4 同代榜面行带「效力于你」角标且只挂在那人一行
 *     U5 日志页入门句出正文（无裸 key、无裸拉丁）
 *   相 B（活引擎）= 页内经 SQ.mutate 单一写通道现场调 tryJoin，验分支与闸（不依赖重绘）：
 *     U6 正道取「收」支并落盘                 U7 左道婉拒零弟子、bond 分毫不动
 *     U8 魔道压价胜收入门下（名额用满）        U9 满员 = 根本不掷（零日志，非生成后再拒）
 *     U10 disciples 带来源位 pr 且字节可控     U11 零页面报错
 * 纪律（本仓踩过的坑）：`SQ.mutate(stateRef, fn)` 的 `stateRef` 在测试里只能传占位对象 ⇒ 视图私有 state
 *   不会被换掉，**渲染断言一律走相 A 的存档注入**，活调用只断言状态与落盘；掷点用桩保证分支确定；
 *   轮询而非固定 sleep。
 * 依赖：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-join.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

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
  ws.everDefected = true; ws.factionRepPeak = 2000;
  const f0 = D.FACTIONS_FIXED[0].id;
  ws.factionId = f0; ws.factionRep[f0] = 2000; ws.factionOffice = 'elder';
  ws.artsKnown = ['qingxin', 'tiebi', 'posha'];

  const meta = SQ.Legacy.metaBlank();
  meta.unlocks.sect = true; meta.unlocks.prodigy = true;
  const r = SQ.Sect.foundSect(ws, pack, D, meta, 'wuyue', null, [0, 0], 'right', now, function () {});
  if (!r.ok) throw new Error('foundSect failed: ' + r.reason);
  ws.sect.fac = { zangjing: 1, danfang: 1, yanwu: 0, keshe: 1 };   /* 客舍 1 ⇒ 名额 2；丹房 1 级起料 */
  SQ.Prodigy.rollForNewLife(ws, pack, D, meta, now);
  (ws.prodigies || []).forEach(function (p, i) { ws.bonds[p.id] = i <= 1 ? 50 : 0; });
  ws.log = [];
  const jlog = [];
  /* 相 A：真引擎产一件「天骄弟子」入档（含入门日志），浏览器只负责把它渲染出来 */
  const or = Math.random; Math.random = function () { return 0; };
  const j0 = SQ.Prodigy.tryJoin(ws, pack, D, SQ.Mods.collect({ talents: [] }, ws, pack, D), now,
    function (cat, text) { jlog.push({ ts: now, cat: cat, text: text }); ws.log.push({ ts: now, cat: cat, text: text }); });
  Math.random = or;
  if (!j0 || !j0.disc) throw new Error('tryJoin 未落弟子：' + JSON.stringify(j0));
  /* 让这名天骄弟子修到四境（= 月结若干轮后的正常态），弟子出力折算战功才非零、界面那行才该出现 */
  j0.disc.realm = 4;
  const meritExp = SQ.Sect.discipleMerit(ws, pack, D);
  const servedName = SQ.Sect.discName(ws, j0.disc, pack);
  /* N1 第二环（材料供奉）：真跑 24 游戏月月结，让宗门侧产出进 `in.materials` 与日志，浏览器只负责渲染 */
  const matBefore = Object.keys(ws.materials || {}).length;
  SQ.Sect.tick(ws, pack, D, SQ.Mods.collect({ talents: [] }, ws, pack, D), 30000 * 24, now + 1,
    function (cat, text) { ws.log.push({ ts: now + 1, cat: cat, text: text }); });
  const matSum = Object.keys(ws.materials || {}).reduce((a, k) => a + (ws.materials[k] || 0), 0);
  const matLog = (ws.log || []).filter(l => /进缴灵材/.test(l.text || '')).map(l => l.text)[0] || '';

  return {
    save: {
      v: 1,
      profile: { name: '投效验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-22-1' },
      meta: meta,
      settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
      worlds: { xiuxian: ws }
    },
    seed: {
      servedName: servedName, servedPid: j0.disc.pr, branch0: j0.branch,
      joinLine: (jlog[0] || {}).text || '', cap: SQ.Sect.discCap(ws, D), disc1: ws.sect.disciples.length,
      matSum: matSum, matLog: matLog, matBefore: matBefore,
      matIds: Object.keys(ws.materials || {}), poolIds: SQ.Alchemy.zoneMats(D, Math.min(ws.zone || 0, D.ZONES.length - 1)),
      matLedger: SQ.Ledger.matSums(ws), meritExp: meritExp
    }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const { save, seed } = await buildSave();
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(save));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (okv, name, detail) => { if (okv) pass++; else fail++; console.log((okv ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };
  const until = (fn, ms) => page.waitForFunction(fn, null, { timeout: ms || 8000 }).then(() => true, () => false);
  const txt = (sel) => page.evaluate((s) => {
    const el = document.getElementById(s); return el ? el.innerText.replace(/\s+/g, '') : '';
  }, sel);

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });

  /* ── 相 A 渲染面 ── */
  await page.click('#m-tabbar button[data-v="sect"]');
  await until(() => { const el = document.getElementById('tab-sect'); return !!el && !el.classList.contains('hide'); });
  const sectTxt = await txt('tab-sect');
  T(seed.cap === 2 && seed.disc1 === 1 && /门徒（1\/2）/.test(sectTxt), 'U1 宗门页弟子区计数随投效落档（1/2）', 'cap=' + seed.cap + ' · ' + sectTxt.slice(0, 40));
  T(sectTxt.indexOf(seed.servedName) >= 0, 'U2 弟子行显天骄本名（名源名录、非山门俗名回落）', 'name=' + seed.servedName + ' · ' + sectTxt.slice(0, 60));
  T((sectTxt.match(/天骄/g) || []).length >= 1, 'U3 弟子行带「天骄」角标（tianjiao 有渲染点）', sectTxt.slice(0, 60));

  /* ── U4/U5（B16-j）：已开宗版面 = 状态条 + 四格摘要；空态 = curzone 外壳 + 四门槛行 + 立派之后 ──
   * 两条都只判「结构在 + 文案取自词表」，不钉具体数值（数值随档走，钉了就是第二份事实源）。 */
  const secLayout = await page.evaluate(() => {
    const strip = document.querySelector('#tab-sect .statestrip');
    const sum = document.querySelector('#tab-sect .sum4');
    const wf = (k) => SQ.t(k, null, 'xiuxian').replace(/\s+/g, '');
    return {
      strip: !!strip,
      stripTxt: strip ? strip.innerText.replace(/\s+/g, '') : '',
      cells: sum ? sum.children.length : 0,
      sumTxt: sum ? sum.innerText.replace(/\s+/g, '') : '',
      wantK: wf('sect.ui.strip.k'), wantRec: wf('sect.ui.sum.rec')
    };
  });
  T(secLayout.strip && secLayout.stripTxt.indexOf(secLayout.wantK) >= 0 && secLayout.cells === 4 &&
    secLayout.sumTxt.indexOf(secLayout.wantRec) >= 0,
    'U7 已开宗版面：状态条（当前宗门）+ 四格摘要（战绩 / 设施 / 门规 / 传位）',
    'strip=' + secLayout.strip + ' cells=' + secLayout.cells);

  const emptySave = JSON.parse(JSON.stringify(save));
  delete emptySave.worlds.xiuxian.sect;
  const ctxE = await browser.newContext();
  await ctxE.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(emptySave));
  const pageE = await ctxE.newPage();
  const errorsE = [];
  pageE.on('pageerror', (e) => errorsE.push(String(e.message || e)));
  await pageE.goto(url);
  await pageE.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await pageE.click('#m-tabbar button[data-v="sect"]');
  await pageE.waitForTimeout(500);
  const emp = await pageE.evaluate(() => {
    const wf = (k) => SQ.t(k, null, 'xiuxian').replace(/\s+/g, '');
    const cz = document.querySelector('#tab-sect .curzone');
    return {
      cz: !!cz,
      czName: cz ? ((cz.querySelector('.cz-name') || {}).textContent || '').trim() : '',
      wantName: SQ.t('sect.ui.found.name', null, 'xiuxian').trim(),
      gates: document.querySelectorAll('#tab-sect .gate').length,
      oks: document.querySelectorAll('#tab-sect .gate.ok').length,
      after: document.querySelectorAll('#tab-sect .afrow').length,
      foundDisabled: (function () {
        const b = Array.prototype.filter.call(document.querySelectorAll('#tab-sect button'), (x) => x.disabled)[0];
        return !!b;
      })()
    };
  });
  T(emp.cz && emp.czName === emp.wantName && emp.gates === 4 && emp.after === 3,
    'U8 未开宗空态：curzone 外壳（尚未开宗）+ 四门槛 .gate 行 + 立派之后三行',
    'gates=' + emp.gates + ' oks=' + emp.oks + ' after=' + emp.after);
  T(errorsE.length === 0, 'U9 空态零页面报错', errorsE.join('|').slice(0, 120) || 'clean');
  await ctxE.close();

  await page.click('#m-tabbar button[data-v="prodigy"]');
  await until(() => { const el = document.getElementById('tab-prodigy'); return !!el && !el.classList.contains('hide'); });
  /* 四榜逐切合计（第册一批③）：一名天骄只出现在自己那条境界带的榜上，单看默认天榜会漏 ——
   * 判据本身不变（角标全榜恰一枚、只挂在那人行上），只是将取数面从「一榜」扩到「四榜」。 */
  const snap = () => page.evaluate(() => {
    const box = document.getElementById('tab-prodigy');
    const rows = Array.from(box.querySelectorAll('.lrow'));
    return {
      all: box.innerText.replace(/\s+/g, ''),
      badge: (box.innerText.match(/效力于你/g) || []).length,
      namedRows: rows.filter(r => /效力于你/.test(r.innerText)).length,
      chips: rows.length,
      latin: (box.innerText.match(/[A-Za-z]{3,}/g) || [])
        .filter(x => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0)
    };
  });
  let board = await snap(), acc = { badge: 0, namedRows: 0, latin: [], all: board.all };
  acc.badge += board.badge; acc.namedRows += board.namedRows; acc.latin = acc.latin.concat(board.latin);
  for (const b of [1, 2, 3]) {
    await page.click('#tab-prodigy .jbchips button[data-v="' + b + '"]');
    await page.waitForTimeout(250);
    board = await snap();
    acc.badge += board.badge; acc.namedRows += board.namedRows; acc.latin = acc.latin.concat(board.latin);
  }
  T(acc.badge === 1 && acc.namedRows === 1, 'U4 「效力于你」角标四榜合计恰一枚、且只挂在那名天骄的行上',
    'badge=' + acc.badge + ' rows=' + acc.namedRows);
  T(acc.latin.length === 0, 'U4b 角标零裸拉丁上屏', acc.latin.slice(0, 3).join(','));

  await page.click('#m-tabbar button[data-v="journal"]');
  await until(() => { const el = document.getElementById('tab-journal'); return !!el && !el.classList.contains('hide'); });
  const jr = await txt('tab-journal');
  T(/登门求入门/.test(jr) && !/sect\.disc\.join|prodigy\.join\.[a-z]/.test(jr), 'U5 日志页入门句出正文（键真消费、无裸 key 回落）', jr.slice(0, 60));
  const jrLatin = await page.evaluate(() => (document.getElementById('tab-journal').innerText.match(/[A-Za-z]{3,}/g) || [])
    .filter(x => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0));
  T(jrLatin.length === 0, 'U5b 日志零裸拉丁', jrLatin.slice(0, 3).join(','));

  /* ── 相 B 活引擎（状态与落盘，不依赖重绘） ── */
  const joinCall = (align, zone, keshe) => page.evaluate((a) => {
    window.__joinArg = a;
    window.__jlog = [];
    return SQ.mutate({}, new Function('s',
      'var a=window.__joinArg;' +
      'var w=s.worlds[s.profile.worldId];var p=SQ.Worlds.xiuxian.pack;var d=SQ.XDATA;' +
      'w.sect.align=a.align;w.zone=a.zone;w.sect.fac.keshe=a.keshe;' +
      'var m=SQ.Mods.collect({talents:[]},w,p,d);' +
      'var open0=SQ.Sect.joinOpen(w,d);var n0=w.sect.disciples.length;' +
      'var old=Math.random;Math.random=function(){return 0;};' +
      'var res=SQ.Prodigy.tryJoin(w,p,d,m,Date.now(),function(cat,text){window.__jlog.push(text);});' +
      'Math.random=old;' +
      'window.__jres={open:open0,n0:n0,branch:res&&res.branch,pid:res&&res.pid,bond1:w.bonds["pr2"]};')).then(function () {
      return window.__jres;
    });
  }, { align: align, zone: zone, keshe: keshe });

  /* 建场已落 1 名弟子（pr1）；本相逐步：客舍 3 ⇒ 名额 4，pr2 是唯一合格候选 */
  const j1 = await joinCall('neutral', 0, 3);
  T(j1.open === true && j1.branch === 'left' && j1.n0 === 1 && j1.bond1 === 50, 'U6 左道婉拒：零弟子入库、bond 分毫不动（卷面 −0）', JSON.stringify(j1));
  const refuseTxt = await page.evaluate(() => window.__jlog.join('|'));
  T(/不问出身/.test(refuseTxt), 'U6b 婉拒句由活引擎产出（join.refuse 在页内可解析）', refuseTxt.slice(0, 46));
  const j2 = await joinCall('evil', 0, 3);
  T(j2.branch === 'evilWin' && j2.n0 === 1, 'U7 魔道压价判定胜 → 收入门下', JSON.stringify(j2));
  T((await page.evaluate(() => window.__jlog.join('|'))).indexOf('折节') >= 0, 'U7b 折节句由活引擎产出（join.win 在页内可解析）');
  const j3 = await joinCall('right', 0, 3);
  T(j3.open === true && j3.branch === null && (await page.evaluate(() => window.__jlog.length)) === 0,
    'U8 两名天骄都已在册 ⇒ 候选集空、整条事件不生成（dup 语义走候选过滤，不靠 cap 侥幸）', JSON.stringify(j3));
  const j4 = await joinCall('right', 0, 1);
  T(j4.open === false && j4.branch === null && (await page.evaluate(() => window.__jlog.length)) === 0,
    'U9 名额缩到 2（客舍 1）＝ 满员根本不掷（零日志，不是生成后再拒）', 'open=' + j4.open);

  const persisted = await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian;
    return { prs: w.sect.disciples.filter(d => !!d.pr).length, bytes: JSON.stringify(w.sect.disciples).length, bonds: w.bonds.pr1 };
  });
  T(persisted.prs === 2 && persisted.bytes < 400 && persisted.bonds === 50,
    'U10 落盘：disciples 带来源位 pr · 天骄好感读档不丢（normalize 白名单含在册天骄）',
    'pr=' + persisted.prs + ' 字节=' + persisted.bytes + ' bond=' + persisted.bonds);

  /* ── J 相：材料供奉环（N1 第二环）玩家侧可见 ──
   * 月结在**页内活引擎**触发（日志走 app 自己的 `SQ.Log.push` 通道 ⇒ 落独立日志档 `sanqian-logs-v1`，
   * 建场直写 `ws.log` 会被日志批的读写口径忽略，这是本相第一版踩到的坑）。 */
  await page.evaluate(() => {
    SQ.mutate({}, new Function('s',
      'var w=s.worlds[s.profile.worldId];var p=SQ.Worlds.xiuxian.pack;var d=SQ.XDATA;' +
      'var m=SQ.Mods.collect({talents:[]},w,p,d);' +
      'SQ.Sect.tick(w,p,d,m,30000*24,Date.now(),{log:function(c,t){SQ.Log.push(w,c,t);}});'));
  });
  const jst = await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian;
    let sm = 0; const ids = [];
    for (const k in (w.materials || {})) { sm += w.materials[k] || 0; if ((w.materials[k] || 0) > 0) ids.push(k); }
    const sums = SQ.Ledger.matSums(w);
    const pool = SQ.Alchemy.zoneMats(SQ.XDATA, Math.min(w.zone || 0, SQ.XDATA.ZONES.length - 1));
    return { sm: sm, ids: ids, inn: sums.inn, out: sums.out, acc: w.sect.matAcc,
      inPool: ids.every(id => pool.indexOf(id) >= 0) };
  });
  T(jst.sm >= 2 && (jst.inn - jst.out) === jst.sm && jst.inPool && jst.acc >= 0 && jst.acc < 1,
    'J1 页内活引擎跑 24 游戏月 ⇒ 弟子 + 丹房按期进料（存量 ' + jst.sm + ' 件 · #207 恒等式 · 料种全在本区组池 · 余数留档）',
    '件=' + jst.sm + ' 账=' + jst.inn + '/' + jst.out + ' 余=' + (jst.acc || 0).toFixed(4) + ' 料=' + jst.ids.join(','));
  await page.click('#m-tabbar button[data-v="journal"]');
  await until(() => {
    const el = document.getElementById('tab-journal');
    return !!el && el.innerText.indexOf('进缴灵材') >= 0;
  }, 8000);
  const jrMat = await txt('tab-journal');
  T(jrMat.indexOf('门中进缴灵材') >= 0 && !/sect\.tribute\.mats/.test(jrMat),
    'J2 日志页出「门中进缴灵材 N 件」（sect.tribute.mats 真消费、无裸 key 回落）', jrMat.slice(jrMat.indexOf('门中进缴灵材') - 6, 60));
  await page.click('#m-tabbar button[data-v="sect"]');
  await until(() => { const el = document.getElementById('tab-sect'); return !!el && !el.classList.contains('hide'); });
  const sectMatTxt = await txt('tab-sect');
  /* 注：txt() 已剥全部空白，断言式必须写空白-free 形态 */
  T(/每30年月出灵材1件／级/.test(sectMatTxt),
    'J3 宗门设施区把丹房的材料侧产出讲给玩家看（原只有一句「丹火未开」）', sectMatTxt.slice(sectMatTxt.indexOf('丹房'), 44));
  const matLatin = await page.evaluate(() => (document.getElementById('tab-sect').innerText.match(/[A-Za-z]{3,}/g) || [])
    .filter(x => ['Lv', 'NPC', 'pp', 'AI', 'JSON'].indexOf(x) < 0));
  T(matLatin.length === 0, 'J3b 设施区零裸拉丁（新增文案走词表）', matLatin.slice(0, 3).join(','));

  /* 期望值取**页内当前档**的引擎同源口（相 B 又落了一名弟子、且月结会涨境界，
   * 用建场期的 Node 侧数值对不上 = 假失败）：断言「视图显示的数字 == 引擎算出的数字」 */
  const meritLive = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId];
    const n = SQ.Sect.discipleMerit(w, SQ.Worlds[s.profile.worldId].pack, SQ.XDATA);
    return { n: n, txt: SQ.fmt(n) };
  });
  const mi4 = sectMatTxt.indexOf('战功');
  T(meritLive.n > 0 && sectMatTxt.indexOf('弟子出力折算战功+' + meritLive.txt) >= 0,
    'J4 宗门页显「弟子出力折算战功 +N」，且 N 与引擎同源口同值（该折算一直在参战结算里加进 war.merit，界面此前零渲染点 = N20 判为「该接线」的那一条）',
    '引擎=' + meritLive.n + ' · 页面=' + sectMatTxt.slice(mi4, mi4 + 40));

  T(errors.length === 0, 'U11 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
  console.log(fail === 0 ? 'UI_JOIN_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_JOIN_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
