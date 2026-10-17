/* .tests/verify-ui-faction.cjs — 势力页「叛离入口可见性 + 供奉 2h 窗口」UI 走查
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-faction.cjs
 *
 * 背景（2026-10-05 反馈批）：
 *   ① 玩家反馈「势力页看不到叛离选项」——旧实现叛离按钮只在势力卡底部（长页深处），
 *      本批在「当前效力」区块顶部补一枚同触发入口；本脚本锁住「入口 ≥2 处且首屏可见」。
 *   ② 供奉冷却由 24h 改为 2h；本脚本锁住常量口径与界面「每 2 小时」提示，且无 24h 残留。
 *
 * 起手档：factionId=yanue（掩月宗·正道）——其对 liumo/xinggong/luopo/suiyuan 敌对，
 *   用于验证「仅敌对可叛投（红标）」。stones=2000000 保证前两档供奉按钮可用。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');

  const buildSave = () => {
    const s = JSON.parse(JSON.stringify(base));
    const now = Date.now();
    s.profile.createdAt = now;
    Object.values(s.worlds).forEach(w => {
      w.lastSave = now; w.lastOffline = null; w.pendingChoice = null;
      w.realm = 2; w.mode = 'seclude';
      w.stones = 2000000;
      w.factionId = 'yanue';                    /* 掩月宗：敌对 liumo/xinggong/luopo/suiyuan */
      w.factionRep = { yanue: 0 };
      w.factionDonate = { at: 0, used: 0 };
      w.factionCdUntil = 0;
      w.factionOffice = null;
      /* Q 组（第卅九批）：委托板面三张不同类型 —— slay 已达标 / cultivate 未达标 / gather 已达标 */
      w.factionQuests = [
        { type: 'slay', target: 3, base: 0, rep: 25, stones: 300, bornAt: now, expireAt: now + 3600000 },
        { type: 'cultivate', target: 999999, base: 0, rep: 20, stones: 200, bornAt: now, expireAt: now + 3600000 },
        { type: 'gather', target: 100, base: 0, rep: 30, stones: 0, bornAt: now, expireAt: now + 3600000 }
      ];
      w.factionQuestCd = 0;
      w.kills = 3;
    });
    return s;
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext();
  await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(buildSave()));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };

  await page.goto(url);
  await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
  await page.waitForTimeout(500);
  await page.click('#m-tabbar button:has-text("势力")');
  await page.waitForTimeout(400);

  /* R1 叛离入口可见性：≥2 处（当前效力区块 + 势力卡），且顶部入口首屏内可点 */
  const leaveBtns = await page.$$eval('#tab-faction [data-act="leaveFaction"]', els => els.map(e => {
    const r = e.getBoundingClientRect();
    return { text: e.textContent.trim(), y: Math.round(r.top + window.scrollY), dis: e.disabled };
  }));
  T(leaveBtns.length >= 2, 'R1 叛离入口 ≥2 处（当前效力 + 势力卡）', 'n=' + leaveBtns.length);
  const topLeave = leaveBtns.slice().sort((a, b) => a.y - b.y)[0];
  T(!!topLeave && topLeave.text === '叛离' && !topLeave.dis, 'R1 叛离按钮文案「叛离」且可点', topLeave ? topLeave.text + '/dis=' + topLeave.dis : 'none');
  T(!!topLeave && topLeave.y < 800, 'R1 顶部叛离入口位于当前效力区块（首屏内）', 'y=' + (topLeave ? topLeave.y : -1));

  /* R2 去向选择浮层：好聚好散 + 敌对红标「叛投」且仅敌对可点 */
  await page.click('#tab-faction [data-act="leaveFaction"]');
  await page.waitForTimeout(300);
  const pick = await page.$$eval('#tab-faction .detailbox', els => els.length);
  T(pick >= 1, 'R2 去向选择浮层展开', 'n=' + pick);
  const plain = await page.$$eval('#tab-faction [data-act="leavePlain"]', els => els.length);
  T(plain >= 1, 'R2 含「好聚好散」常规离山入口', 'n=' + plain);
  const defectBtns = await page.$$eval('#tab-faction [data-act="defectGo"]', els => els.map(e => ({ v: e.getAttribute('data-v'), dis: e.disabled })));
  const enabled = defectBtns.filter(b => !b.dis).map(b => b.v).sort();
  const enemies = ['liumo', 'luopo', 'suiyuan', 'xinggong'];
  T(enabled.length === enemies.length && enemies.every(e => enabled.indexOf(e) >= 0),
    'R2 仅敌对势力可叛投', 'enabled=' + enabled.join('/'));
  const redTag = await page.$$eval('#tab-faction .detailbox .tierbadge.tboss', els => els.length);
  T(redTag === enemies.length, 'R2 敌对势力带红标「敌对 · 叛投」', 'n=' + redTag);
  const nonEnemyDis = defectBtns.filter(b => enemies.indexOf(b.v) < 0);
  T(nonEnemyDis.length > 0 && nonEnemyDis.every(b => b.dis), 'R2 非敌对势力叛投按钮置灰', 'n=' + nonEnemyDis.length);

  /* R3 供奉三档 + 2h 窗口提示（无 24h 残留） */
  const donBtns = await page.$$eval('#tab-faction [data-act="facDonate"]', els => els.map(e => e.textContent.trim()));
  T(donBtns.length === 3 && donBtns.every(x => x.indexOf('供奉') >= 0 && x.indexOf('+') >= 0),
    'R3 供奉三档按钮（含预计声望）', donBtns.join(' | '));
  const donHint = await page.$$eval('#tab-faction p.hint', els => {
    const hit = els.map(e => e.textContent).filter(x => x.indexOf('÷1000') >= 0);
    return hit[0] || '';
  });
  T(donHint.indexOf('2 小时') >= 0 || donHint.indexOf('2小时') >= 0, 'R3 供奉窗口提示 = 每 2 小时', donHint.slice(0, 80));
  T(donHint.indexOf('24 小时') < 0 && donHint.indexOf('24小时') < 0, 'R3 供奉区无 24 小时残留', '');

  /* R4 供奉确认弹窗预览与引擎同口径（窗口内 used 生效） */
  await page.click('#tab-faction [data-act="facDonate"]');
  await page.waitForTimeout(300);
  const confirmOpen = await page.$eval('#modal-confirm', el => !el.classList.contains('hide'));
  const confirmTxt = await page.$eval('#cf-text', el => el.textContent);
  T(confirmOpen && confirmTxt.indexOf('声望 +') >= 0, 'R4 供奉确认弹窗含声望预览', confirmTxt.slice(0, 60));
  await page.click('#cf-cancel');
  await page.waitForTimeout(200);

  /* ── Q 组：门中委托一次贴三张、类型互不相同、各交各的 ── */
  await page.click('#tab-faction');
  await page.waitForTimeout(600);
  const qread = () => page.evaluate(() => {
    const btns = Array.prototype.slice.call(document.querySelectorAll('[data-act="questClaim"]'));
    return { n: btns.length, types: btns.map((b) => b.dataset.v), dis: btns.map((b) => b.disabled) };
  });
  const q1 = await qread();
  T(q1.n === 3, 'Q1 门中委托一次贴三张（第卅九批：原为一张）', 'n=' + q1.n);
  T(new Set(q1.types).size === 3 && q1.types.slice().sort().join() === 'cultivate,gather,slay',
    'Q2 三张类型互不相同（同类型板面至多一张）', q1.types.join('+'));
  T(q1.dis.filter((x) => !x).length === 2 && q1.dis[q1.types.indexOf('cultivate')] === true,
    'Q3 达标两张的交付钮可点、未达标那张禁用', q1.types.map((t, i) => t + '=' + (q1.dis[i] ? '禁' : '可')).join(' '));
  const clickQ = (v) => page.evaluate((vv) => {
    var b = Array.prototype.slice.call(document.querySelectorAll('[data-act="questClaim"]'))
      .filter(function (x) { return x.dataset.v === vv && !x.disabled; })[0];
    if (b) b.click();
  }, v);
  await clickQ('slay');
  await page.waitForTimeout(900);
  const q2 = await qread();
  T(q2.n === 2 && q2.types.indexOf('slay') < 0 && q2.types.slice().sort().join() === 'cultivate,gather',
    'Q4 交掉一张只摘那一张，另两张仍在屏上', 'n=' + q2.n + ' types=' + q2.types.join('+'));
  await clickQ('gather');
  await page.waitForTimeout(900);
  const q3 = await qread();
  T(q3.n === 1 && q3.types[0] === 'cultivate' && q3.dis[0] === true,
    'Q5 两张达标的都交完：只剩那张未达标的，且 30 分钟闸内不补新单', 'n=' + q3.n + ' types=' + q3.types.join('+'));

  /* ── M 组（第卌七批① · 江湖名录取数口）：势力卡必须写清「掌门是谁」──
   * 名录是静态内容，认不出就不写这行 ⇒ 这组同时钉两侧：固定势力卡全都有名字，
   * 且屏上不许出现花括号残留或空位（视图不编名字，同第卌四批「不编一个假境界」那条纪律）。 */
  const m1 = await page.evaluate(() => {
    const cards = Array.prototype.slice.call(document.querySelectorAll('.faccard'));
    const fixedTag = window.SQ.t('faction.fixed.tag', null, 'xiuxian');
    const txt = c => Array.prototype.slice.call(c.querySelectorAll('.fd'))
      .map(d => d.textContent.replace(/\s+/g, ' ').trim()).join(' § ');
    const isFixed = c => Array.prototype.slice.call(c.querySelectorAll('.tierbadge'))
      .some(b => b.textContent.trim() === fixedTag);
    const lines = cards.map(txt);
    const withMaster = lines.filter(x => x.indexOf('掌门') >= 0);
    const fixedN = cards.filter(isFixed).length;
    return {
      cards: cards.length, hit: withMaster.length, fixedN: fixedN,
      /* 固定席一律有名、非固定席（随机补足与玩家自立宗门）一律不写这行——两侧都判，才叫「不编名字」 */
      miss: cards.filter((c, i) => isFixed(c) && lines[i].indexOf('掌门') < 0).length,
      extra: cards.filter((c, i) => !isFixed(c) && lines[i].indexOf('掌门') >= 0).length,
      sample: withMaster[0] || '', brace: lines.join('|').indexOf('{'),
      empty: lines.filter(x => x.indexOf('掌门') >= 0 && /（\s*）|掌门\s*（/.test(x)).length
    };
  });
  T(m1.cards > 0 && m1.fixedN === 16 && m1.miss === 0 && m1.extra === 0 && m1.brace < 0 &&
    m1.empty === 0 && /掌门 \S+（\S+）· 太上 \S+/.test(m1.sample),
    'M1 16 处固定势力卡全都有「掌门 X（境界）· 太上 Y」，非固定席（随机势力与自立宗门）一律不写这行，' +
    '且无花括号残留、无空名位',
    'cards=' + m1.cards + ' 固定=' + m1.fixedN + ' 缺=' + m1.miss + ' 多写=' + m1.extra +
    ' brace=' + m1.brace + ' empty=' + m1.empty +
    ' sample=' + m1.sample.replace(/.*?(掌门[^§]*)/, '$1').slice(0, 60));

  T(errors.length === 0, 'Z 无控制台错误', errors.join(' | ') || 'ok');

  await browser.close();
  console.log((fail === 0 ? 'UI_FACTION_ALL_GREEN ' : 'UI_FACTION_FAILED ') + pass + '/' + (pass + fail));
  process.exit(fail === 0 ? 0 : 1);
})();