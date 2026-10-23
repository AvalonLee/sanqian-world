/* .tests/verify-ui-auto.cjs — 自动批两需求 UI 走查（playwright-core + Edge headless）
 * 需求 1：自动渡劫开关迁至修行页底部 + 新增自动奇遇开关（开启后奇遇自动抉择不弹窗）
 * 需求 2：修行页游戏时间下方挂江湖传闻区，与奇遇页顶部信息一致
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-auto.cjs
 */
'use strict';
const path = require('path');
const { chromium } = require('playwright-core');

/* 构造验证存档：v:1 正规结构 + 筑基 + 注入两条传闻；withPend=true 时挂起一条奇遇（road_tea_stall）
 * eventPref 为自动奇遇的分支倾向（体验批；缺省 none） */
function buildSave(autoEvent, withPend, eventPref) {
  const now = Date.now();
  const tpl = 'rumor.tpl.ren.1';
  const ws = {
    realm: 1, stones: 5000, qi: 100, total: 100,
    bonds: { suwan: 100, xie: 55, yewu: 30 },
    rumors: [
      { rid: 't1', evId: 'market_assassin', tier: 'ren', nature: 'bad', bornAt: now - 60000, expireAt: now + 30 * 60000, tpl: tpl, place: 'rumor.place.1' },
      { rid: 't2', evId: 'merit_fish', tier: 'di', nature: 'good', bornAt: now - 60000, expireAt: now + 50 * 60000, tpl: 'rumor.tpl.ren.3', place: 'rumor.place.3' }
    ]
  };
  if (withPend) ws.pendingChoice = { id: 'road_tea_stall', at: now, tier: 'ren', nature: 'good' };
  return {
    v: 1,
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral', seenNote: '2026-10-22-1' },
    meta: { unlockedWorlds: ['xiuxian'] },
    settings: { autoTrib: false, autoEvent: autoEvent, eventPref: eventPref || 'none', tabOrder: [] },
    worlds: { xiuxian: ws }
  };
}

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => {
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : ''));
  };

  async function boot(autoEvent, withPend, eventPref) {
    const ctx = await browser.newContext();
    await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', JSON.stringify(s)); }, buildSave(autoEvent, withPend, eventPref));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    await page.waitForSelector('#sc-main:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(800);
    return { ctx, page, errors };
  }

  /* ── A. 需求 2：修行页传闻区 + 需求 1 开关落位 ── */
  /* 行序读数（册149 行序判共用；册150 加自动佩戴一枚）：把「自动」段五类 .setrow 映射成标记串，
   * 存档段两行读 '?' 过滤掉。 */
  const rowsOf = (page) => page.evaluate(() =>
    Array.prototype.map.call(document.querySelectorAll('#tab-settings .setrow'), (r) =>
      r.querySelector('[data-act="toggleAutoTrib"]') ? 'trib' :
      r.querySelector('[data-act="toggleAutoEvent"]') ? 'event' :
      r.querySelector('[data-act="setEventPref"]') ? 'pref' :
      r.querySelector('[data-act="toggleGearEquip"]') ? 'equip' :
      r.querySelector('[data-act="toggleGearRefine"]') ? 'refine' : '?')
      .filter((x) => x !== '?').join(','));
  {
    const { ctx, page, errors } = await boot(false);
    /* 传闻区紧随游戏时间（calrow）之下 */
    const html = await page.$eval('#tab-idle', el => el.innerHTML);
    /* B16-c 改口：旧序「游戏时间 → 江湖传闻 → 四柱」三样分别撤出中区（历入顶栏 hd-sub、
     * 传闻与四柱入右栏）⇒ 新序 = 模式药丸（.mode）在圆相（.stathero）之前 */
    const iMode = html.indexOf('class="mode"'), iEnso = html.indexOf('class="stathero"');
    T(iMode >= 0 && iMode < iEnso, 'R2 修行页序 = 模式药丸 → 圆相（B16-c：传闻/四柱已移右栏）', iMode + '<' + iEnso);
    /* 与奇遇页顶部信息一致：卡片文本序列相同（传闻现渲染在修行区右栏） */
    const idleRum = await page.$$eval('#m-rail .rumorcard .fg', els => els.map(e => e.textContent.trim()));
    await page.click('#m-tabbar button:has-text("奇遇")');
    await page.waitForTimeout(300);
    const evRum = await page.$$eval('#tab-event .rumorcard .fg', els => els.map(e => e.textContent.trim()));
    T(idleRum.length === 2 && idleRum.join('|') === evRum.join('|'), 'R2 传闻文本与奇遇页一致（右栏 ‖ 奇遇页同源）', idleRum.join('|').slice(0, 40));
    await page.click('#m-tabbar button:has-text("修行")');
    await page.waitForTimeout(200);
    /* 倒计时数字也在（秒级 tick 刷新） */
    const hasTtl = await page.$$eval('#m-rail .rumorcard .rt', els => els.length);
    T(hasTtl === 2, 'R2 传闻倒计时同源渲染', 'n=' + hasTtl);
    /* UI v2 B2：自动三开关已迁设置页，修行页尾不再挂自动区 */
    const idleTxt = await page.$eval('#tab-idle', el => el.textContent);
    const swIdle = await page.$$eval('#tab-idle [data-act^="toggle"]', els => els.length);
    T(swIdle === 0 && !idleTxt.includes('自动渡劫'), 'R1 修行页不再挂自动区（三开关已迁设置页）', 'sw=' + swIdle);
    await page.click('#m-tabbar button:has-text("设置")');
    await page.waitForTimeout(300);
    const setTxt = await page.$eval('#tab-settings', el => el.textContent);
    const swT = await page.$$eval('#tab-settings [data-act="toggleAutoTrib"].switch', els => els.length);
    const swE = await page.$$eval('#tab-settings [data-act="toggleAutoEvent"].switch', els => els.length);
    const swR = await page.$$eval('#tab-settings [data-act="toggleGearRefine"].switch', els => els.length);
    const swQ = await page.$$eval('#tab-settings [data-act="toggleGearEquip"].switch', els => els.length);
    T(swT === 1 && swE === 1 && swR === 1 && swQ === 1,
      'R1 设置页 = 自动渡劫 + 自动奇遇 + 自动炼化 + 自动佩戴四开关（佩戴随册150 入列）',
      'trib=' + swT + ' event=' + swE + ' refine=' + swR + ' equip=' + swQ);
    T(setTxt.includes('自动渡劫') && setTxt.includes('自动奇遇') && setTxt.includes('自动炼化') &&
      setTxt.includes('自动佩戴'), 'R1 四开关文案齐备');
    T(!setTxt.includes('菜单顺序') && setTxt.includes('存档'), 'R1 菜单顺序已下线（D5），存档块保留');
    /* B16-s：三段次序 = 存档 → 自动 → 关于（设计稿重排；原先自动在最上），段标统一 .sechead */
    const setOrder = await page.evaluate(() => {
      const heads = Array.prototype.map.call(document.querySelectorAll('#tab-settings .sechead .t'), (x) => x.textContent.trim());
      return { heads: heads, oldDt: document.querySelectorAll('#tab-settings .dt').length };
    });
    T(setOrder.heads.length === 3 && setOrder.heads[0] === '存档' && setOrder.heads[1] === '自动' &&
      setOrder.heads[2] === '关于' && setOrder.oldDt === 0,
      'R1 设置页次序 = 存档 → 自动 → 关于，段标统一 .sechead（旧 .dt 退净）', JSON.stringify(setOrder));
    /* 手动链路回归：设置页开关可切换且随档持久化 */
    await page.click('#tab-settings [data-act="toggleAutoTrib"]');
    await page.waitForTimeout(500);
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).settings.autoTrib);
    T(persisted === true, 'R1 自动渡劫切换随档持久化', 'autoTrib=' + persisted);
    await page.click('#tab-settings [data-act="toggleAutoTrib"]');   /* 复位 */
    T(errors.length === 0, 'A 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }

  /* ── B. 自动奇遇开启：挂起奇遇自动结算，不弹模态 ── */
  {
    const { ctx, page, errors } = await boot(true, true);
    await page.waitForTimeout(1500);   /* 等 tick 内 autoResolveChoice 完成 */
    const modalShown = await page.$eval('#modal-choice', el => !el.classList.contains('hide'));
    T(!modalShown, 'R1 自动奇遇开启 → 抉择模态不弹');
    const pend = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.pendingChoice);
    T(pend == null, 'R1 挂起奇遇已自动结算销单', 'pendingChoice=' + JSON.stringify(pend));
    const toasts = await page.$$eval('.toast', els => els.map(e => e.textContent));
    T(toasts.some(x => x.includes('已自动抉择')), 'R1 toast 告知自动抉择结果', toasts.join('|').slice(0, 60));
    /* 结算入档：resolveBranch 写 feed 叙事流（seen 在触发路径写入，手造 pendingChoice 不经此路） */
    /* 存档治理批 2026-10-09：feed 恒常落侧档 sanqian-logs-v1 的 feed 段（主档不再承载） */
    const feedN = await page.evaluate(() => {
      const sd = JSON.parse(localStorage.getItem('sanqian-logs-v1') || '{}');
      return ((sd.feed || {}).xiuxian || []).length;
    });
    T(feedN >= 1, 'R1 结算入档（feed 叙事流 ≥1 条）', 'feed=' + feedN);
    T(errors.length === 0, 'B 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }

  /* ── C. 自动奇遇关闭（回归基线）：挂起奇遇仍弹抉择模态 ── */
  {
    const { ctx, page, errors } = await boot(false, true);
    await page.waitForTimeout(500);
    const modalShown = await page.$eval('#modal-choice', el => !el.classList.contains('hide'));
    T(modalShown, '回归 自动奇遇关闭 → 抉择模态照常弹出');
    T(errors.length === 0, 'C 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }

  /* ── D. 奇遇倾向（体验批）：自动奇遇开启时展开倾向 chips，抉择优先选倾向分支 ── */
  {
    /* D1 开启态：设置页四 chips 展开、默认无倾向高亮、点选随档持久化 */
    const { ctx, page, errors } = await boot(true, false);
    await page.click('#m-tabbar button:has-text("设置")');
    await page.waitForTimeout(300);
    const chips = await page.$$eval('#tab-settings [data-act="setEventPref"]', els => els.map(e => e.textContent.trim()));
    T(chips.length === 4 && chips.join('|') === '无倾向|正道|魔道|左道', 'R3 自动奇遇开启 → 设置页奇遇倾向四 chips', chips.join('|'));
    /* 行序判（第册一百四十九批 · 用户令「自动奇遇与奇遇倾向上下相邻，中间不隔自动炼化」）：
     * 开倾向态 = 渡劫 → 奇遇 → 倾向(col) → 炼化。按 .setrow 出现序对表；存档段那两行
     * （清增益/重置）不含自动段 act ⇒ 读成 '?'，过滤后再对表，不钉全页行数。 */
    const rowOrderOn = await rowsOf(page);
    T(rowOrderOn === 'trib,event,pref,equip,refine',
      'R3 开倾向态行序 = 渡劫 → 奇遇 → 倾向 → 佩戴 → 炼化（倾向紧跟其父开关，册149；佩戴在炼化前，册150 改口）', rowOrderOn);
    const onTxt = await page.$eval('#tab-settings [data-act="setEventPref"].on', el => el.textContent.trim());
    T(onTxt === '无倾向', 'R3 默认高亮无倾向', onTxt);
    await page.click('#tab-settings [data-act="setEventPref"][data-v="evil"]');
    await page.waitForTimeout(400);
    const prefSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).settings.eventPref);
    T(prefSaved === 'evil', 'R3 点选魔道随档持久化', 'eventPref=' + prefSaved);
    T(errors.length === 0, 'D1 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }
  /* D2 关闭态：chips 收起（渐进披露，子选项随父开关） */
  {
    const { ctx, page } = await boot(false, false);
    await page.click('#m-tabbar button:has-text("设置")');
    await page.waitForTimeout(300);
    const chipsOff = await page.$$eval('#tab-settings [data-act="setEventPref"]', els => els.length);
    T(chipsOff === 0, 'R3 自动奇遇关闭 → 设置页倾向 chips 收起', 'n=' + chipsOff);
    /* 关倾向态（册149）：倾向块不渲染 ⇒ 奇遇行与佩戴/炼化行直接相邻（中间不许再隔任何行）。 */
    const rowOrderOff = await rowsOf(page);
    T(rowOrderOff === 'trib,event,equip,refine',
      'R3 关倾向态行序 = 渡劫 → 奇遇 → 佩戴 → 炼化（倾向随父开关收起，册150 改口）', rowOrderOff);
    await ctx.close();
  }
  /* D3 倾向优先：pref=neutral 且该分支可用（stone 检定 5000≫30）→ 自动抉择必落 neutral（非随机） */
  {
    const { ctx, page } = await boot(true, true, 'neutral');
    await page.waitForTimeout(1500);
    const br = await page.evaluate(() => {
      const sd = JSON.parse(localStorage.getItem('sanqian-logs-v1') || '{}');
      const f = (sd.feed || {}).xiuxian || [];
      const hit = f.filter(x => x.id === 'road_tea_stall')[0];
      return hit ? hit.branch : null;
    });
    T(br === 'neutral', 'R3 倾向分支可用 → 自动抉择优先该分支', 'branch=' + br);
    await ctx.close();
  }

  /* ── E. 自动炼化开关（GitHub issue #2）：缺省为开、点一下随档持久化到 ws.gearAutoRefine、可逆 ── */
  {
    const { ctx, page, errors } = await boot(false, false);
    await page.click('#m-tabbar button:has-text("设置")');
    await page.waitForTimeout(300);
    const sw = await page.$eval('#tab-settings [data-act="toggleGearRefine"]', el => ({
      cls: /(^| )on( |$)/.test(el.className), aria: el.getAttribute('aria-checked'),
      label: (el.textContent || '').trim()
    }));
    T(sw.cls === true && sw.aria === 'true' && sw.label === '已开启',
      'E1 自动炼化开关缺省为开（手造旧档无该字段 ⇒ 读档补 true，行为逐字不变）', JSON.stringify(sw));
    await page.click('#tab-settings [data-act="toggleGearRefine"]');
    await page.waitForTimeout(400);
    const off = await page.evaluate(() => ({
      saved: JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.gearAutoRefine,
      aria: document.querySelector('#tab-settings [data-act="toggleGearRefine"]').getAttribute('aria-checked')
    }));
    T(off.saved === false && off.aria === 'false', 'E2 点一下 ⇒ 关：落盘字段与 aria-checked 同变', JSON.stringify(off));
    await page.click('#tab-settings [data-act="toggleGearRefine"]');
    await page.waitForTimeout(400);
    const on2 = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.gearAutoRefine);
    T(on2 === true, 'E3 再点 ⇒ 回开（开关可逆，不是一次性旗标）', 'gearAutoRefine=' + on2);
    T(errors.length === 0, 'E 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }

  /* ── F. 自动佩戴开关（册150）：缺省开（旧行为逐字不变）、点一下随档持久化到 ws.gearAutoEquip、可逆 ── */
  {
    const { ctx, page, errors } = await boot(false, false);
    await page.click('#m-tabbar button:has-text("设置")');
    await page.waitForTimeout(300);
    const sw = await page.$eval('#tab-settings [data-act="toggleGearEquip"]', el => ({
      cls: /(^| )on( |$)/.test(el.className), aria: el.getAttribute('aria-checked'),
      label: (el.textContent || '').trim()
    }));
    T(sw.cls === true && sw.aria === 'true' && sw.label === '已开启',
      'F1 自动佩戴开关缺省为开（手造旧档无该字段 ⇒ 读档补 true，旧行为逐字不变）', JSON.stringify(sw));
    await page.click('#tab-settings [data-act="toggleGearEquip"]');
    await page.waitForTimeout(400);
    const off = await page.evaluate(() => ({
      saved: JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.gearAutoEquip,
      aria: document.querySelector('#tab-settings [data-act="toggleGearEquip"]').getAttribute('aria-checked')
    }));
    T(off.saved === false && off.aria === 'false', 'F2 点一下 ⇒ 关：落盘字段与 aria-checked 同变', JSON.stringify(off));
    await page.click('#tab-settings [data-act="toggleGearEquip"]');
    await page.waitForTimeout(400);
    const on2 = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian.gearAutoEquip);
    T(on2 === true, 'F3 再点 ⇒ 回开（开关可逆，不是一次性旗标）', 'gearAutoEquip=' + on2);
    T(errors.length === 0, 'F 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }

  console.log(fail === 0 ? 'UI_AUTO_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_AUTO_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });