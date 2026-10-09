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
    profile: { name: '验证', worldId: 'xiuxian', createdAt: now, worldName: '罗云州', talents: [], alignBias: 'neutral' },
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
  {
    const { ctx, page, errors } = await boot(false);
    /* 传闻区紧随游戏时间（calrow）之下 */
    const html = await page.$eval('#tab-idle', el => el.innerHTML);
    const iCal = html.indexOf('calrow'), iRum = html.indexOf('rumorcard');
    const iPil = html.indexOf('class="pillars"');
    T(iCal >= 0 && iRum > iCal && iPil > iRum, 'R2 修行页序 = 游戏时间 → 江湖传闻 → 四柱', iCal + '<' + iRum + '<' + iPil);
    /* 与奇遇页顶部信息一致：卡片文本序列相同 */
    const idleRum = await page.$$eval('#tab-idle .rumorcard .fg', els => els.map(e => e.textContent.trim()));
    await page.click('#m-tabbar button:has-text("奇遇")');
    await page.waitForTimeout(300);
    const evRum = await page.$$eval('#tab-event .rumorcard .fg', els => els.map(e => e.textContent.trim()));
    T(idleRum.length === 2 && idleRum.join('|') === evRum.join('|'), 'R2 传闻文本与奇遇页一致', idleRum.join('|').slice(0, 40));
    await page.click('#m-tabbar button:has-text("修行")');
    await page.waitForTimeout(200);
    /* 倒计时数字也在（秒级 tick 刷新） */
    const hasTtl = await page.$$eval('#tab-idle .rumorcard .rt', els => els.length);
    T(hasTtl === 2, 'R2 传闻倒计时同源渲染', 'n=' + hasTtl);
    /* 底部自动区：两开关 + 文案 */
    const idleTxt = await page.$eval('#tab-idle', el => el.textContent);
    const swT = await page.$$eval('#tab-idle [data-act="toggleAutoTrib"].switch', els => els.length);
    const swE = await page.$$eval('#tab-idle [data-act="toggleAutoEvent"].switch', els => els.length);
    T(swT === 1 && swE === 1, 'R1 修行页底部 = 自动渡劫 + 自动奇遇两开关', 'trib=' + swT + ' event=' + swE);
    T(idleTxt.includes('自动渡劫') && idleTxt.includes('自动奇遇'), 'R1 两开关文案齐备');
    const idxAuto = idleTxt.indexOf('自动'), idxTalents = idleTxt.length; /* 开关应在页尾（天赋卡之后）——以 DOM 末尾近邻验证 */
    const lastIsSwitch = await page.$$eval('#tab-idle .setrow', els => {
      const last = els[els.length - 1];
      return last && last.textContent.indexOf('自动奇遇') >= 0;
    });
    T(lastIsSwitch, 'R1 自动区位于页面最底部');
    /* 设置页不再有自动渡劫 */
    await page.click('#m-tabbar button:has-text("设置")');
    await page.waitForTimeout(200);
    const setTxt = await page.$eval('#tab-settings', el => el.textContent);
    T(!setTxt.includes('自动渡劫') && setTxt.includes('菜单顺序') && setTxt.includes('存档'), 'R1 设置页已移除自动渡劫（其余区块保留）');
    /* 手动链路回归：自动渡劫关闭时修行页「渡劫就绪」入口仍在（修为未满不显示，属既有口径——此处只验证开关可切换） */
    await page.click('#m-tabbar button:has-text("修行")');
    await page.waitForTimeout(200);
    await page.click('#tab-idle [data-act="toggleAutoTrib"]');
    await page.waitForTimeout(500);
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).settings.autoTrib);
    T(persisted === true, 'R1 自动渡劫切换随档持久化', 'autoTrib=' + persisted);
    await page.click('#tab-idle [data-act="toggleAutoTrib"]');   /* 复位 */
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
    /* D1 开启态：四 chips 展开、默认无倾向高亮、点选随档持久化 */
    const { ctx, page, errors } = await boot(true, false);
    const chips = await page.$$eval('#tab-idle [data-act="setEventPref"]', els => els.map(e => e.textContent.trim()));
    T(chips.length === 4 && chips.join('|') === '无倾向|正道|魔道|左道', 'R3 自动奇遇开启 → 奇遇倾向四 chips', chips.join('|'));
    const onTxt = await page.$eval('#tab-idle [data-act="setEventPref"].on', el => el.textContent.trim());
    T(onTxt === '无倾向', 'R3 默认高亮无倾向', onTxt);
    await page.click('#tab-idle [data-act="setEventPref"][data-v="evil"]');
    await page.waitForTimeout(400);
    const prefSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('sanqian-state-v1')).settings.eventPref);
    T(prefSaved === 'evil', 'R3 点选魔道随档持久化', 'eventPref=' + prefSaved);
    T(errors.length === 0, 'D1 零页面报错', errors.join('|').slice(0, 150) || 'clean');
    await ctx.close();
  }
  /* D2 关闭态：chips 收起（渐进披露，子选项随父开关） */
  {
    const { ctx, page } = await boot(false, false);
    const chipsOff = await page.$$eval('#tab-idle [data-act="setEventPref"]', els => els.length);
    T(chipsOff === 0, 'R3 自动奇遇关闭 → 倾向 chips 收起', 'n=' + chipsOff);
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

  console.log(fail === 0 ? 'UI_AUTO_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_AUTO_FAILED ' + fail);
  await browser.close();
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });