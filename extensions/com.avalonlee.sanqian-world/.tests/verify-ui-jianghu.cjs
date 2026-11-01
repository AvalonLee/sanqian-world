/* .tests/verify-ui-jianghu.cjs — 江湖四榜真机走查（第册一批③ 2026-10-16 · 设计稿《江湖榜与角色库》§二/§三）
 * 依赖：playwright-core（根 package.json 已声明）；用法：node .tests/verify-ui-jianghu.cjs（扩展根）
 *
 * 为什么必须有一篇独立走查：②③ 的**全部形状**都在屏上——四榜 chip、十席、榜面不写战力、
 * 三档徽标、隐世三席零入口、玩家高亮、背景席位不给战书。冒烟 #317 证的是引擎装配（board4 的返回形状），
 * 证不了「视图真的按那个形状渲染」——第册批 `mrc-title` 那一次就是引擎与断言全绿而屏上无字。
 *
 * 场景（单页）：fixture 存档注入 realm 5 + 由**引擎自己** rollForNewLife 掷出的 10 名具名出场者
 *   （不在测试里手抄名录行——手抄一份就是第二个事实源，改名录即假绿）。
 * 判据一律回读存档真值 × 词表在页内合成，断言里不硬编码中文文案，也不钉具体人名。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { load } = require('./sandbox.cjs');

const T0 = 1790000000000;
const S = load([], { quiet: true }).SQ;
const PACK = S.Worlds.xiuxian.pack, D = PACK.data;

function buildSave() {
  const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixture-save.json'), 'utf8'));
  s.profile.createdAt = T0;
  Object.values(s.worlds).forEach((w) => {
    w.lastSave = T0; w.lastOffline = null; w.pendingChoice = null; w.log = [];
  });
  const w = s.worlds.xiuxian;
  w.realm = 5; w.zone = 0; w.qi = 1e6; w.stones = 60000;
  w.prodigies = []; w.prodMarks = {}; w.rumors = [];
  S.Prodigy.rollForNewLife(w, PACK, D, { unlocks: {}, stats: {} }, T0);   /* 引擎自己掷：rid 齐、nm 归零 */
  /* 把 10 名出场者摆到四个榜带各 2~3 人（rlm 是引擎状态、不是文案）：
   * 否则他们全在黄榜，另三榜只剩背景席位，J8「相识者给入口 / 背景席位不给」就只在一条带上判过。 */
  w.prodigies.forEach((p, i) => { p.rlm = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0][i % 10]; });
  return s;
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { pass += ok ? 1 : 0; fail += ok ? 0 : 1;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };
  const save = buildSave();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript((v) => { localStorage.setItem('sanqian-state-v1', v); }, JSON.stringify(save));
  const page = await ctx.newPage();
  /* 墙钟冻在种档时刻（verify-ui-ambush 同法）：不冻就会因「存档时间 vs 真实现在」差出一大段离线，
   * `#modal-offline` 呈报浮层盖住整页，点什么都判 intercepts pointer events。 */
  await page.clock.install({ time: new Date(T0) });
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
  await page.click('#m-tabbar button[data-v="prodigy"]');
  await page.waitForTimeout(500);

  /* 页内读数器：一切期望值由**页内引擎**现算（换表即换字，测试不抄数） */
  const read = () => page.evaluate(() => {
    const wf = (k, o) => SQ.t(k, o || null, 'xiuxian');
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian, P = SQ.Worlds.xiuxian.pack, DD = P.data;
    const mods = SQ.Mods.collect(s.profile, w, P, DD);
    const myP = SQ.Mods.powerOf(w, P, DD, mods);
    const bs = SQ.Prodigy.board4(w, P, DD, mods);
    const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-prodigy .lrow'));
    const meta = rows.map(r => ((r.querySelector('.meta') || {}).textContent || '').trim());
    const nm = rows.map(r => ((r.querySelector('.nm') || {}).textContent || '').trim());
    return {
      chips: Array.prototype.slice.call(document.querySelectorAll('#tab-prodigy .jbchips button'))
        .map(b => ({ v: b.getAttribute('data-v'), on: b.classList.contains('on'), t: b.textContent.trim() })),
      tabLabel: ((document.querySelector('#m-tabbar button[data-v="prodigy"]') || {}).textContent || '').trim(),
      tabLex: wf('jianghu.system'),
      rows: rows.length, nm: nm, meta: meta,
      body: ((document.getElementById('tab-prodigy') || {}).innerText || '').replace(/\s+/g, ' '),
      link: rows.map(r => r.querySelectorAll('button.linkbtn').length),
      badges: rows.map(r => Array.prototype.slice.call(r.querySelectorAll('.nm .tierbadge')).map(b => b.textContent.trim())),
      cur: rows.filter(r => r.classList.contains('cur')).length,
      curTxt: (rows.filter(r => r.classList.contains('cur'))[0] || { textContent: '' }).textContent,
      powerWord: meta.filter(m => m.indexOf(wf('resource.power')) >= 0).length,
      stranger: nm.filter(x => x.indexOf(wf('jianghu.stranger')) >= 0).length,
      qRows: nm.filter(x => x.indexOf(wf('jianghu.q')) >= 0).length,
      /* 期望值：隐世三席恒列天榜前三；玩家恰一行且在自己那一榜 */
      hidIds: SQ.Jianghu.hermits(P).map(h => h.id),
      bandOfMe: SQ.Jianghu.bandOf(w.realm),
      n4: bs.map(b => ({ n: b.n, vis: b.rows.filter(r => r !== null).length, band: b.band })),
      /* 三档徽标复算：相识者与背景席位都按切磋表值；隐世与玩家不给 */
      lvWant: [].concat.apply([], bs.map(b => b.rows.filter(r => r && !r.me && !r.hid)
        .map(r => wf('jianghu.lv.' + r.lv)))),
      lvBad: (function () {
        var out = [];
        bs.forEach(function (b) { b.rows.forEach(function (r) {
          if (!r || r.me || r.hid) return;
          var ratio = myP / r.power;
          var want = ratio >= DD.PRODIGY.HANDICAP.crush ? 0 : (ratio <= DD.PRODIGY.HANDICAP.brave ? 2 : 1);
          if (r.lv !== want) out.push(b.band + ':' + r.rid);
        }); });
        return out;
      })(),
      /* 相识者 = 存档里那 10 行的 rid；榜上这些行必须给入口，其余行必须不给 */
      knownRid: (w.prodigies || []).map(p => p.rid),
      knownPid: (w.prodigies || []).map(p => p.id),
      acts: Array.prototype.slice.call(document.querySelectorAll('#tab-prodigy [data-act="prodDetail"]'))
        .map(b => b.getAttribute('data-v')),
      /* 第册一百一十六批新增两族读数：只读人物卡的入口（jhDetail）与自己名次行的那句话 */
      jhActs: Array.prototype.slice.call(document.querySelectorAll('#tab-prodigy [data-act="jhDetail"]'))
        .map(b => b.getAttribute('data-v')),
      selfrank: ((document.querySelector('#tab-prodigy .selfrank .sr-n') || {}).textContent || '').trim(),
      /* 天榜可见席位的境界应 ≥8（隐世除外）；地榜 6~7 */
      realms: bs.map(b => b.rows.filter(r => r && !r.hid).map(r => r.realm))
    };
  });

  const r0 = await read();
  const BAND = [0, 1, 2, 3].map(b => S.t('jianghu.band.' + b, null, 'xiuxian'));
  const LV = [0, 1, 2].map(b => S.t('jianghu.lv.' + b, null, 'xiuxian'));
  T(r0.tabLabel === r0.tabLex && r0.tabLex !== 'jianghu.system' && r0.tabLex.indexOf('天骄') < 0,
    'J1 页签改名「江湖榜」且取到词表值（不是 key 回显、也没留旧名「同代天骄」）',
    '页签=' + r0.tabLabel + ' 词表=' + r0.tabLex);
  T(r0.chips.length === 4 && r0.chips.every((c, i) => c.v === String(i) && c.t === BAND[i]) &&
      r0.chips[0].on === true && r0.chips.filter(c => c.on).length === 1,
    'J2 四榜 chip 各一枚、名号 === 词表 jianghu.band.0~3、默认天榜唯一高亮',
    JSON.stringify(r0.chips.map(c => c.t + (c.on ? '*' : ''))));
  T(r0.n4.every(x => x.vis >= 10 && x.vis <= 11) && r0.n4.length === 4,
    'J3 四榜各十席（可见 10，玩家在本榜十席之外时追加尾行 = 11）',
    JSON.stringify(r0.n4.map(x => x.n + '/' + x.vis)));
  /* J4 改口（第册一百一十六批 · 用户令「前三也可点开，但战力要拉满到几乎无法战胜」）：
   * 旧判「只挂隐世一枚标 + 零入口」⇒ 现在是「隐世 + 悬殊两枚标 + 恰一枚只读入口（jhDetail，不是战书）」；
   * 明细五项仍须全问号（裁定 2 未破），所以问号那条一字不松。 */
  T(r0.qRows === 3 && r0.badges.slice(0, 3).every(b => b.length === 2 &&
      b.indexOf(S.t('jianghu.hid.tag', null, 'xiuxian')) >= 0 &&
      b.indexOf(S.t('jianghu.lv.2', null, 'xiuxian')) >= 0) &&
      r0.link.slice(0, 3).every(n => n === 1) &&
      r0.jhActs.slice(0, 3).join(',') === r0.hidIds.slice(0, 3).join(',') &&
      r0.meta.slice(0, 3).every(m => m === [1,2,3,4,5].map(() => S.t('jianghu.q', null, 'xiuxian')).join(' · ')),
    'J4 天榜前三 = 隐世三席：明细五项全问号（裁定 2 未破）+ 挂「隐世」「悬殊」两枚标 + 恰一枚只读入口（不是战书）',
    '问号行=' + r0.qRows + ' 前三标=' + JSON.stringify(r0.badges.slice(0, 3)) + ' 前三钮=' + JSON.stringify(r0.link.slice(0, 3)) +
    ' 入口号=' + r0.jhActs.slice(0, 3).join('/') + ' 名录号=' + r0.hidIds.slice(0, 3).join('/'));
  T(r0.powerWord === 0,
    'J5 榜面每一行的明细行都不再出现「战力」二字（数字整列撤除，副标那句说明不在 .lrow .meta 里）',
    '含战力行数=' + r0.powerWord + ' 样例=' + (r0.meta[4] || '').slice(0, 60));
  /* 徽标两face都判：形状（非隐世非玩家恰一枚、且必是三档之一）+ 数值（与引擎按切磋表值复算同档） */
  const badgeShape = r0.nm.map((x, i) => ({ one: r0.badges[i].length === 1,
    known: LV.indexOf(r0.badges[i][0]) >= 0, skip: x.indexOf(S.t('jianghu.q', null, 'xiuxian')) >= 0 ||
      r0.curTxt === x })).filter(o => !o.skip);
  T(r0.lvBad.length === 0 && badgeShape.length >= 7 && badgeShape.every(o => o.one && o.known),
    'J6 三档徽标：可交互行**恰一枚**且取值 ∈ 词表 jianghu.lv.*（力压/相当/悬殊，册150 改口）‖ 档位 === 引擎按 HANDICAP 表值复算（违例 ' +
      r0.lvBad.length + '）',
    '判形行数=' + badgeShape.length + ' 违例=' + (r0.lvBad.join(',') || '无'));
  /* 相识者给入口、背景席位不给：入口的 data-v 是**存档行 id**（prN），名录号只作身份 ⇒ 两侧各取各的键 */
  const knownIn = r0.acts.filter(x => r0.knownPid.indexOf(x) >= 0).length;
  /* J7 改口（第册一百一十六批）：入口分两族——战书（prodDetail）仍只给相识天骄，
   * 只读人物卡（jhDetail）给其余每一席（背景席位 + 隐世三席）。旧判「其余一律零入口」已不是口径。 */
  T(r0.acts.length === knownIn && knownIn > 0 &&
      r0.jhActs.length === r0.rows - knownIn - r0.cur &&
      r0.stranger === r0.rows - knownIn - r0.qRows - r0.cur,
    'J7 两族入口分得干净：战书只给相识者（' + knownIn + ' 行）‖ 只读人物卡覆盖其余每一席 ‖「素不相识」灰字仍只标背景席位',
    '行=' + r0.rows + ' 战书=' + r0.acts.length + ' 只读卡入口=' + r0.jhActs.length +
    ' 陌生标=' + r0.stranger + ' 隐世=' + r0.qRows + ' 玩家=' + r0.cur);
  T(r0.realms[1].every(x => x >= 6 && x <= 7) && r0.realms[2].every(x => x >= 4 && x <= 5) &&
      r0.realms[3].every(x => x <= 3),
    'J8 榜带一刀切在屏上成立：地榜境界恒 6~7 ‖ 玄榜 4~5 ‖ 黄榜 ≤3（天榜另判 ≥8）',
    '地=' + JSON.stringify(r0.realms[1]) + ' 玄=' + JSON.stringify(r0.realms[2]) + ' 黄=' + JSON.stringify(r0.realms[3]));

  /* 天榜上点相识者 → 详情展开（切磋三档 + 袭杀）；再点一枚背景席位 → 不展开 */
  const openKnown = await page.evaluate((pid) => {
    const b = document.querySelector('#tab-prodigy [data-act="prodDetail"][data-v="' + pid + '"]');
    if (!b) return false;
    b.click(); return true;
  }, r0.acts[0]);
  await page.waitForTimeout(400);
  const det = await page.evaluate(() => ({
    boxes: document.querySelectorAll('#tab-prodigy .detailbox').length,
    spar: document.querySelectorAll('#tab-prodigy [data-act="sparProd"]').length,
    amb: document.querySelectorAll('#tab-prodigy [data-act="ambushProd"]').length
  }));
  T(openKnown && det.boxes === 1 && det.spar >= 1 && det.amb === 1,
    'J9 相识者仍可展开详情并给出切磋 / 袭杀入口（榜面撤数字不等于把盲盒搬回来——详情里战力对比仍在）',
    'boxes=' + det.boxes + ' spar=' + det.spar + ' amb=' + det.amb);
  await page.evaluate((pid) => {
    const b = document.querySelector('#tab-prodigy [data-act="prodDetail"][data-v="' + pid + '"]');
    if (b) b.click();
  }, r0.acts[0]);
  await page.waitForTimeout(300);
  const bgRid = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds.xiuxian, P = SQ.Worlds.xiuxian.pack;
    const bs = SQ.Prodigy.board4(w, P, P.data, SQ.Mods.collect(s.profile, w, P, P.data));
    const r = bs[0].rows.filter(x => x && !x.me && !x.hid && !x.known && x.rid)[0];
    return r ? { rid: r.rid, nm: (SQ.Jianghu.of(P, r.rid) || {}).nm } : null;
  });
  /* J10 改口（第册一百一十六批 · 用户令「榜上角色都应该可以交互」）：背景席位现在**该**展开，
   * 但展开的必须是只读人物卡——没有切磋/袭杀钮（引擎对这三族没有战斗对象，给按钮就是死入口）、
   * 不出现「战力」二字（J5 同一条口径）。旧判「点了不展开」随设计稿 §二 一起改口。
   * 同时把版式那一判（J22）要的矩形读数在同一次点击里取回（不重复点、不再开一个 context）。 */
  const bgClick = bgRid ? await page.evaluate((o) => {
    const row = Array.prototype.slice.call(document.querySelectorAll('#tab-prodigy .lrow'))
      .filter(x => ((x.querySelector('.nm') || {}).textContent || '').indexOf(o.nm) >= 0)[0];
    if (!row) return { r: 'norow:' + o.nm };
    const btn = row.querySelector('[data-act="jhDetail"]');
    if (!btn) return { r: 'nobtn' };
    const before = document.querySelectorAll('#tab-prodigy .detailbox').length;
    btn.click();
    const after = document.querySelectorAll('#tab-prodigy .detailbox').length;
    const el = document.querySelector('#tab-prodigy .detailbox.jhcard');
    if (!el) return { r: 'same:' + before + '→' + after };
    const st = getComputedStyle(el), rc = el.getBoundingClientRect(), kv = el.querySelector('.kv');
    return { r: after === before + 1 ? 'opened' : 'count:' + before + '→' + after,
      fight: el.querySelectorAll('[data-act="sparProd"],[data-act="ambushProd"]').length,
      powerWord: (el.textContent || '').indexOf(SQ.t('resource.power', null, 'xiuxian')),
      padL: Math.round(parseFloat(st.paddingLeft)), padR: Math.round(parseFloat(st.paddingRight)),
      gap: kv ? Math.round(kv.getBoundingClientRect().left - rc.left) : -1,
      bio: !!el.querySelector('.jh-bio'), foot: (el.querySelector('.jh-foot') || {}).textContent || '',
      hasH: !!el.querySelector('.jh-h .jh-nm') };
  }, bgRid) : { r: 'nobg' };
  T(bgClick.r === 'opened' && bgClick.fight === 0 && bgClick.powerWord < 0 && bgClick.bio &&
      bgClick.hasH && bgClick.foot.indexOf(S.t('jianghu.detail.nofight', null, 'xiuxian').slice(0, 6)) >= 0,
    'J10 背景席位点开 = 只读人物卡（卡头在位 ‖ 有「人物小传」段 ‖ 零切磋零袭杀 ‖ 不写「战力」‖ 脚注是那句「递不出战书」）',
    JSON.stringify(bgClick).slice(0, 180));
  /* J22 版式（第册一百一十六批 · 用户令「文字离边界太近」）：量矩形不量文本——
   * 卡自身左右内距 ≥10px，且第一行明细的左边缘比卡的左边缘再进去 ≥10px（贴边必然为 0）。 */
  T(bgClick.padL >= 10 && bgClick.padR >= 10 && bgClick.gap >= 10,
    'J22 人物卡不贴边（量矩形：卡内距 ' + bgClick.padL + '/' + bgClick.padR + 'px ‖ 明细行左缘比卡左缘进 ' + bgClick.gap + 'px）',
    'padL=' + bgClick.padL + ' padR=' + bgClick.padR + ' gap=' + bgClick.gap);

  /* J21 隐世那三席点开（第册一百一十六批 · 用户令「前三也可点开，但战力要拉满到几乎无法战胜」）：
   * 卡必须仍在（.jhcard）、明细仍是问号（裁定 2 未破）、脚注是那句「不宜力敌」、零战斗钮。
   * 口径交底：这三席的「悬殊」与那句脚注是**视图对深浅的表达**，引擎里他们的真实 power 未改
   * （改它会再动一次轨迹锚，而那三席本就进不了战斗通道）。 */
  const hidCard = await page.evaluate(() => {
    const row = Array.prototype.slice.call(document.querySelectorAll('#tab-prodigy .lrow'))
      .filter(x => ((x.querySelector('.nm') || {}).textContent || '').indexOf('？') >= 0)[0];
    if (!row) return { r: 'norow' };
    const btn = row.querySelector('[data-act="jhDetail"]');
    if (!btn) return { r: 'nobtn' };
    btn.click();
    const el = document.querySelector('#tab-prodigy .detailbox.jhcard');
    if (!el) return { r: 'nocard' };
    const Q = SQ.t('jianghu.q', null, 'xiuxian');
    return { r: 'ok', qLines: (el.textContent || '').split(Q).length - 1,   /* 名号 + 归属 + 境界 三处问号 */
      fight: el.querySelectorAll('[data-act="sparProd"],[data-act="ambushProd"]').length,
      bio: !!el.querySelector('.jh-bio'),
      foot: ((el.querySelector('.jh-foot') || {}).textContent || '').trim(),
      want: SQ.t('jianghu.hid.line', null, 'xiuxian') };
  });
  T(hidCard.r === 'ok' && hidCard.qLines >= 3 && hidCard.fight === 0 && !hidCard.bio &&
      hidCard.foot === hidCard.want,
    'J21 隐世席点开 = 问号卡 + 「不宜力敌」那句脚注逐字对词表（不给小传、不给战斗钮）',
    JSON.stringify(hidCard).slice(0, 190));
  /* 点开之后收起（避免把这张卡带进后面的切榜读数） */
  await page.evaluate(() => { const b = document.querySelector('#tab-prodigy .lrow [data-act="jhDetail"]'); if (b) b.click(); });
  await page.waitForTimeout(200);

  /* 切到玄榜（玩家境界 5 所在那一榜）：chip 状态与内容同步换、玩家行只出现在自己那一榜 */
  await page.evaluate(() => { document.querySelector('#tab-prodigy .jbchips button[data-v="2"]').click(); });
  await page.waitForTimeout(400);
  const r1 = await read();
  T(r1.chips[2].on === true && r1.chips.filter(c => c.on).length === 1 &&
      r1.realms[2].every(x => x >= 4 && x <= 5) && r1.qRows === 0,
    'J11 点「玄榜」chip：只它高亮、内容换成玄榜席位、隐世三席不跟过来（只属天榜）',
    'on=' + JSON.stringify(r1.chips.map(c => c.on)) + ' 问号行=' + r1.qRows);
  T(r1.cur === 1 && r1.curTxt.indexOf(S.t('prodigy.board.me', null, 'xiuxian')) >= 0 &&
      r0.cur === 0 && !/第 0 位/.test(r0.body) && !/第 0 位/.test(r1.body) &&
      /位列.{0,4}第 [0-9]+ 位/.test(r1.body),
    'J12 玩家行只出现在自己境界带那一榜并高亮，且名次行**不会被写成「第 0 位」**（截图目检抓到过这一枚谎；裁定 3：不另开「我方之势」行）',
    '天榜cur=' + r0.cur + ' 玄榜cur=' + r1.cur + ' 行=' + r1.curTxt.trim().slice(0, 28));

  /* J19（第册一百一十六批 · 用户报「已在天榜第四，切到地/玄/黄榜顶部却说『本榜十席暂未见你』」）：
   * 名次行现在按**自己那一榜**说话，切榜不改这句；旧写法把「本榜」当成正在看的那一榜 ⇒ 那句话是谎。
   * 反向取证：把视图改回 `myRank`/`cur`（正在看的那一榜）⇒ 这一判当场红。 */
  T(!!r0.selfrank && r0.selfrank === r1.selfrank &&
      /位列.{0,6}第 [0-9]+ 位/.test(r0.selfrank) && r0.selfrank.indexOf('暂未见你') < 0,
    'J19 自己名次行常驻且不随切榜变（天榜读与玄榜读逐字相同，句中含真实名次）',
    '天榜读=' + r0.selfrank + ' ‖ 玄榜读=' + r1.selfrank);

  /* ══ J14~J16 第册三批④：夺宝与隐世奇遇「真的上屏」（第册批 mrc-title 那一课不重演）══
   * 场景全由**引擎自己**写：夺宝走唯一写口 `killOff`（日志函子 = 真的 `SQ.Log.push`），
   * 隐世那一支走 `fireTagged`（pendingChoice 的形状由引擎建，测试不手抄）。
   * 期望值一律回词表与表值现算，断言里不写中文常量、不钉具体人名。 */
  const openWith = async (s) => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await c.addInitScript(v => { localStorage.setItem('sanqian-state-v1', v); }, JSON.stringify(s));
    const pg = await c.newPage();
    await pg.clock.install({ time: new Date(T0) });
    pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
    pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await pg.goto(url);
    await pg.waitForSelector('#sc-main:not(.hide)', { timeout: 20000 });
    return { c, pg };
  };
  const stakeUI = Math.round((D.ZONES[Math.min(5, D.ZONES.length - 1)].stones || 3) * D.PRODIGY.STAKE_K3.heavy);
  {
    const s2 = buildSave(), w2 = s2.worlds.xiuxian;
    let target = null, gear = null;
    w2.prodigies.forEach(p => {                       /* 取一件「两件都还没拿过」的具名出场者（否则走 dup 支，n 就不是 2） */
      if (target || !p.rid) return;
      const g = S.Jianghu.gearOf(PACK, D, p.rid, p.rlm);
      if (!g.tb || !g.art) return;
      if (((w2.treasures || {}).owned || []).some(x => x.id === g.tb)) return;
      if ((w2.artsKnown || []).indexOf(g.art) >= 0 || (w2.shelf || []).indexOf(g.art) >= 0) return;
      target = p; gear = g;
    });
    S.Prodigy.killOff(w2, { meta: {} }, PACK, D, target, T0 + 1, (cat, txt) => S.Log.push(w2, cat, txt));
    const { c, pg } = await openWith(s2);
    /* J14 读**屏**不读 localStorage（复核抓到旧写法把自填的值当上屏证据）：切到法宝页，
     * 那件掉来的东西必须真的是一张卡片，标题由词表现算。 */
    await pg.click('#m-tabbar button[data-v="treasure"]');
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => ({
      /* B16-e：法宝库由卡片网格改为整行 ⇒ 上屏证据 = 槽位卡 OR 库行（两者都是「真的渲染出来」） */
      cards: Array.prototype.slice.call(document.querySelectorAll('#tab-treasure .trgrid > .tcard, #tab-treasure .trrow'))
        .map(n => (n.textContent || '').replace(/\s+/g, ' ').trim()),
      owned: (((JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.treasures) || {}).owned || []).map(x => x.id)
    }));
    await pg.click('#m-tabbar button[data-v="journal"]');
    await pg.waitForTimeout(500);
    const r2 = await pg.evaluate(() => ({
      lines: Array.prototype.slice.call(document.querySelectorAll('#tab-journal .logline'))
        .map(n => (n.textContent || '').replace(/\s+/g, ' '))
    }));
    const want = S.t('prodigy.log.killloot', {
      name: S.Jianghu.of(PACK, target.rid).nm, n: 2, cur: S.t('resource.currency', null, 'xiuxian'), loot: S.fmt(stakeUI)
    }, 'xiuxian');
    const tbName = S.t('treasure.' + gear.tb + '.name', null, 'xiuxian');
    T(r.owned.indexOf(gear.tb) >= 0 && r.cards.some(t2 => t2.indexOf(tbName) >= 0),
      'J14 夺宝掉的那件法宝既进了档、又真的渲染成法宝页的一张卡（标题回词表，屏上不抄第二份名号）',
      'owned=' + JSON.stringify(r.owned) + ' ‖ 卡数=' + r.cards.length + ' ‖ 找=' + tbName);
    T(r2.lines.some(l => l.indexOf(want.replace(/\s+/g, ' ')) >= 0),
      'J15 那行夺宝日志真的渲染在「日志」页上（期望串由词表现算，屏上零自造文本）',
      '期望=' + want.slice(0, 40) + ' ‖ 行=' + (r2.lines[0] || '空').slice(0, 40));
    await c.close();
  }
  {
    const s3 = buildSave(), w3 = s3.worlds.xiuxian;
    w3.realm = D.PRODIGY.HID_EVENT_REALM;
    const fired = S.Events.fireTagged(w3, PACK, D, 'jianghu_hid', -1, T0 + 2, { log: (cat, txt) => S.Log.push(w3, cat, txt) });
    const { c, pg } = await openWith(s3);
    await pg.waitForTimeout(600);
    const r = await pg.evaluate(() => {
      const m = document.getElementById('modal-choice');
      const rect = m ? m.getBoundingClientRect() : { height: 0 };
      return {
        open: !!m && !m.classList.contains('hide'), h: Math.round(rect.height),
        title: ((document.getElementById('mc-title') || {}).textContent || '').trim(),
        branches: Array.prototype.slice.call(document.querySelectorAll('#mc-branches button')).length,
        pend: (JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.pendingChoice) || null
      };
    });
    const nm = S.t('event.jianghu_hid_glimpse.name', null, 'xiuxian');
    const nWant = Object.keys(((S.Events.findById(PACK, 'jianghu_hid_glimpse') || {}).choices) || {}).length;
    T(!!fired && !!r.pend && r.pend.id === 'jianghu_hid_glimpse' && !r.pend.prodigy,
      'J16 隐世奇遇由 fireTagged 建起挂起抉择，且**不挂任何天骄槽位**（内容侧也不给入口 = 裁定 2）',
      'pend=' + JSON.stringify(r.pend && { id: r.pend.id, via: r.pend.via, prodigy: r.pend.prodigy }));
    T(r.open && r.h > 0 && r.title === nm && r.branches === nWant,
      'J17 浮层真在屏上打开：可见（height>0）· 标题 === 词表事件名 · 分支按钮数 === 该支声明的 choices 数',
      'h=' + r.h + ' title=' + r.title + ' 钮=' + r.branches + '/' + nWant);
    await c.close();
  }
  {
    /* B16-r：寻仇链在案 ⇒ 榜顶 .warstrip 段条（标题回词表现算，敌手与再战倒计时非空） */
    const s4 = buildSave(), w4 = s4.worlds.xiuxian;
    w4.revenge = { n: 2, nextAt: T0 + 3600000, foe: '沈孤云' };
    const { c, pg } = await openWith(s4);
    await pg.click('#m-tabbar button[data-v="prodigy"]');
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => {
      const el = document.querySelector('#tab-prodigy .warstrip');
      return { t: el && el.querySelector('.w-t') ? el.querySelector('.w-t').textContent.trim() : '',
        v: el && el.querySelector('.w-v') ? el.querySelector('.w-v').textContent.replace(/\s+/g, ' ').trim() : '' };
    });
    const wantT = S.t('prodigy.ambush.chain.title', null, 'xiuxian').trim();
    T(r.t === wantT && r.v.indexOf('沈孤云') >= 0 && r.v.indexOf('后再战') >= 0,
      'J18 寻仇链在案时榜顶给 .warstrip 段条（标题走词表 · 敌手与再战倒计时非空）', JSON.stringify(r));
    await c.close();
  }

  T(errs.length === 0, 'J13 全程零 pageerror / 零 console error', errs.join(' | ').slice(0, 200) || 'clean');

  console.log(fail === 0 ? 'UI_JIANGHU_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_JIANGHU_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
