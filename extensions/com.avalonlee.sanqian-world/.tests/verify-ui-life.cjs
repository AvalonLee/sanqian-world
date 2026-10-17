/* .tests/verify-ui-life.cjs — 寿元 / 道伤 UI 走查（寿元批 2026-10-15 · 数值详设 §6.1A）
 * 依赖：playwright-core（根 package.json 已声明）；用法：node .tests/verify-ui-life.cjs（扩展根）
 *
 * 场景（一律用 fixture 档改字段，让引擎自己结算与判死，不往屏上注入数字；种子数取自引擎表，
 *       改表 ⇒ 走查跟着走）：
 *   L 健康世（realm 1 / 寿元用去一成四 / 道伤 warn−2 层）→ 修行页两行数字与 lifeInfo **逐字对表**；
 *     未到大限阈且伤未过 warn ⇒ 整页零 .bad（反例，防「永远红」）。
 *   N 大限世（寿元只剩两成以内）→ 寿元行转红 + 「大限将至」文案出现。
 *   R 境界一览十阶逐阶带寿元、真仙那阶写「寿元无尽」（破境得寿这条因果要在屏上看得见）。
 *   D 寿尽世 boot 那一次 claim 即判死 → 弹「身死道消」呈报（在创角屏之上）→ 点「转世重生」进创角；
 *     再跨一个 tick 不重复弹（at 键控），且档里 deaths=1 / dissolutions=0（被动了结不算兵解）。
 *   X 道伤世同一条呈报但死因正文换成「道伤崩碎」——两条钟各有各的话，不许混写成兵解。
 * 判据：屏上每个数字都回算自引擎（lifeInfo / lastDeath / lifeCapOf 累加阶梯），换表即换字 ⇒ 有鉴别力。
 * 第卌八批：上界由 LIFESPAN 表改成「凡寿 + LIFE_STEP 前缀和」（键已删）+ 新增 Z 组判「折寿而殒」那条死因。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { load } = require('./sandbox.cjs');   /* 种子数值一律取自引擎表：改表 ⇒ 走查跟着走，不写死数 */

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');
  const ENG = load([], { quiet: true }).SQ;
  const X = ENG.XDATA;
  /* 第卌八批：上界改成「凡寿 + 逐境增量前缀和」⇒ 一律经世界包 lifeCapOf 取数，本文件不抄第二份 */
  const LIFE = ENG.Worlds.xiuxian.pack.worldSystems;
  const CAP1 = LIFE.lifeCapOf(1);               /* fixture 档在练气二期（realm 1）⇒ 寿元上界认阶梯 */
  const DS = X.DAO_SHANG;
  const WARNP_SEED = 0.5 * X.LIFE_WARN_P;   /* 阈的一半 ⇒ 稳在「大限将至」带内 */

  const buildSave = (muts) => {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
    const now = Date.now();
    s.profile.createdAt = now;
    Object.values(s.worlds).forEach(w => {
      w.lastSave = now - 1000;      /* 1 秒离线：结算量可忽略，屏上数字就是这里种下去的那组 */
      w.pendingChoice = null; w.qi = 0;
      Object.keys(muts || {}).forEach(k => { w[k] = muts[k]; });
    });
    return s;
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + ' (' + (detail || '') + ')'); };

  const openPage = async (save) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript((s) => { localStorage.setItem('sanqian-state-v1', s); }, JSON.stringify(save));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
    return { ctx, page, errors };
  };
  const idleText = (page) => page.$eval('#tab-idle', el => el.textContent.replace(/\s+/g, ' '));
  /* 期望串一律由引擎自己算（表改 ⇒ 屏上字跟着改 ⇒ 本走查有鉴别力，不是抄一份数） */
  const expectRows = (page) => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId];
    const li = SQ.Worlds.xiuxian.pack.worldSystems.lifeInfo(w);
    return {
      life: li.eternal ? SQ.t('life.row.eternal', { age: SQ.fmt(li.age) }, 'xiuxian')
        : SQ.t('life.row', { age: SQ.fmt(li.age), left: SQ.fmt(Math.max(0, Math.ceil(li.left))) }, 'xiuxian'),
      dao: li.daoLv >= 1 ? SQ.t('daoshang.row', { n: li.daoLv, cap: li.daoMax }, 'xiuxian') : null,
      near: li.near ? SQ.t('life.near', { left: SQ.fmt(Math.ceil(li.left)) }, 'xiuxian') : null,
      /* evaluate 带不回函数（Playwright 只序列化数据）⇒ 期望串在页内算成数组再带回；
       * 数值与句式全出自引擎，本文件不抄第二份。第卌八批：境界一览那一列改经 lifeCapOf 取累加界。 */
      realmLines: SQ.Worlds.xiuxian.pack.data.REALMS.map(function (_r, i) {
        return i >= SQ.Worlds.xiuxian.pack.data.LIFE_ETERNAL ? SQ.t('realm.info.life.eternal', null, 'xiuxian')
          : SQ.t('realm.info.life', { n: SQ.fmt(SQ.Worlds.xiuxian.pack.worldSystems.lifeCapOf(i)) }, 'xiuxian');
      })
    };
  });

  /* ── L 健康世：两行数字与引擎逐字对表 + 未到阈不转红 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave({ lifeUsed: Math.floor(CAP1 * 0.14), daoShang: DS.warn - 2 }));
    await page.waitForSelector('#tab-idle', { timeout: 15000 });
    await page.waitForTimeout(400);
    const exp = await expectRows(page);
    const txt = await idleText(page);
    T(txt.indexOf(exp.life) >= 0, 'L1 修行页寿元行 === lifeInfo 派生数', exp.life);
    T(exp.dao !== null && txt.indexOf(exp.dao) >= 0, 'L2 道伤行在且认屏上层数（ceil）', exp.dao);
    T(exp.near === null, 'L3 剩余远超两成 ⇒ 不判大限（反例）', 'near=' + String(exp.near));
    const bads = await page.$$eval('#tab-idle .bad', els => els.map(e => e.textContent.trim()));
    T(bads.length === 0, 'L4 健康世修行页零红字', JSON.stringify(bads));
    T(errors.length === 0, 'L5 零页面报错（健康世）', errors.join(' | ').slice(0, 160) || 'clean');
    /* L6 用户口径逐字钉句式（第卌八批令「寿元显示改成：寿元：111岁，尚余约1111年」）：
     * L1 那条比的是「屏上 === 引擎派生串」，词表整句改写它照样绿 ⇒ 另加一刀**形状**判据：
     * 以「寿元：」开头、岁在前、尚余约在后，且不再出现旧的「X/Y 年」分数式。 */
    const lifeRow = (txt.match(/寿元：[^\s]*/g) || []).join(' ');
    T(/^寿元：[\d,]+岁，尚余约[\d,]+年/.test(lifeRow) && !/\/[\d,]+年/.test(lifeRow),
      'L6 寿元行句式 === 「寿元：N岁，尚余约M年」（形状判据，与词表改动脱敏）', lifeRow.slice(0, 60));
    await ctx.close();
  }

  /* ── N 大限世：寿元行转红 + 大限将至文案 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave({ lifeUsed: Math.ceil(CAP1 * 0.9) }));   /* 累加界 CAP1 ⇒ 剩一成，落在两成警示带内 */
    await page.waitForSelector('#tab-idle', { timeout: 15000 });
    await page.waitForTimeout(400);
    const exp = await expectRows(page);
    const txt = await idleText(page);
    T(exp.near !== null && txt.indexOf(exp.near) >= 0, 'N1 剩余 ≤ 上界×LIFE_WARN_P ⇒ 屏上出「大限将至」', exp.near);
    const bads = await page.$$eval('#tab-idle .bad', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    T(bads.some(t => t.indexOf('大限') >= 0), 'N2 大限行是红字（.bad）', JSON.stringify(bads).slice(0, 120));
    T(txt.indexOf(exp.life) >= 0, 'N3 同屏仍给出寿元实数', exp.life);
    T(errors.length === 0, 'N4 零页面报错（大限世）', errors.join(' | ').slice(0, 160) || 'clean');
    await ctx.close();
  }

  /* ── R 境界一览：逐阶带寿元，真仙那阶「寿元无尽」 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave({ lifeUsed: 10 }));
    await page.waitForSelector('#tab-idle', { timeout: 15000 });
    await page.click('[data-act="openRealm"]');
    await page.waitForSelector('#modal-realm:not(.hide)', { timeout: 8000 });
    const list = await page.$eval('#mrm-list', el => el.textContent.replace(/\s+/g, ' '));
    const exp = await expectRows(page);
    const miss = exp.realmLines.filter(line => list.indexOf(line) < 0);
    T(miss.length === 0, 'R1 境界一览逐阶带寿元（表值直出，含真仙「无尽」）', miss.join(' | ') || 'rows=' + exp.realmLines.length);
    const n = (list.match(/寿元/g) || []).length;
    T(n === exp.realmLines.length, 'R2 寿元行数 === 境界数（不重不漏）', n + '/' + exp.realmLines.length);
    T(errors.length === 0, 'R3 零页面报错（境界一览）', errors.join(' | ').slice(0, 160) || 'clean');
    await ctx.close();
  }

  /* ── D 寿尽世：boot 的 claim 即判死 ⇒ 坐化呈报 ⇒ 转世重生进创角 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave({ lifeUsed: CAP1 })   /* 恰吃满上界 ⇒ boot 一次结算即寿尽 */);
    await page.waitForSelector('#modal-offline:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(300);
    const t = await page.$eval('#mo-title', el => el.textContent.trim());
    const sub = await page.$eval('#mo-sub', el => el.textContent.trim());
    const hint = await page.$eval('#mo-hint', el => el.textContent.replace(/\s+/g, ' ').trim());
    const okLabel = await page.$eval('#mo-ok', el => el.textContent.trim());
    const disk = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = s.worlds[s.profile.worldId];
      return {
        name: s.profile.name, deaths: s.meta.stats.deaths, dissolutions: s.meta.stats.dissolutions,
        lives: s.meta.stats.lives, achv: s.meta.achv, realm: w.realm,
        ageTxt: SQ.fmt(w.lastDeath.age), totalTxt: SQ.fmt(w.lastDeath.total),
        cause: w.lastDeath.cause, ttl: SQ.t('life.death.title', null, 'xiuxian'),
        shou: SQ.t('life.death.shoujin', null, 'xiuxian'), ok: SQ.t('life.death.ok', null, 'xiuxian')
      };
    });
    T(t === disk.ttl, 'D1 弹窗标题「身死道消」（词表直出）', t);
    T(sub === disk.shou && disk.cause === 'shoujin', 'D2 正文 = 寿尽坐化那一行（不是兵解文案）', sub);
    T(hint.indexOf(disk.ageTxt) >= 0 && hint.indexOf(disk.totalTxt) >= 0, 'D3 享年与遗泽数字 === 存档 lastDeath（数据接线）', hint.slice(0, 90));
    T(disk.name === '' && disk.realm === 0 && disk.lives === 1, 'D4 引擎已换新世（档案名空 ⇒ 界面必须走创角）', JSON.stringify([disk.name, disk.realm, disk.lives]));
    T(disk.deaths === 1 && disk.dissolutions === 0 && disk.achv.indexOf('achv_bingjie') < 0,
      'D5 被动了结计 deaths、不计兵解、不发「舍身证道」', JSON.stringify([disk.deaths, disk.dissolutions, disk.achv]));
    const c1 = await page.$eval('#sc-c1', el => !el.classList.contains('hide'));
    T(c1, 'D6 呈报背后就是创角屏（不是白屏、不是主界面）', 'c1=' + c1);
    T(okLabel === disk.ok, 'D7 按钮文案「转世重生」', okLabel);
    await page.click('#mo-ok');
    await page.waitForTimeout(1600);   /* 跨一个 tick：at 键控必须已认账，不许再弹第二次 */
    const hidden = await page.$eval('#modal-offline', el => el.classList.contains('hide'));
    const stillC1 = await page.$eval('#sc-c1', el => !el.classList.contains('hide'));
    T(hidden && stillC1, 'D8 确定后落创角且不再重复弹（at 键控会话一次）', 'hidden=' + hidden + ' c1=' + stillC1);
    T(errors.length === 0, 'D9 零页面报错（寿尽世）', errors.join(' | ').slice(0, 160) || 'clean');
    await ctx.close();
  }

  /* ── X 道伤世：同一条呈报，死因正文换成「道伤崩碎」 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave({ daoShang: 1e6 }));   /* normalize 钳到 cap ⇒ 伤满 */
    await page.waitForSelector('#modal-offline:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(300);
    const got = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = s.worlds[s.profile.worldId];
      return {
        sub: document.getElementById('mo-sub').textContent.trim(),
        dao: SQ.t('life.death.daoshang', null, 'xiuxian'), cause: w.lastDeath.cause,
        lv: w.lastDeath.dao, cap: SQ.Worlds.xiuxian.pack.data.DAO_SHANG.cap
      };
    });
    T(got.cause === 'daoshang' && got.sub === got.dao, 'X1 第二条钟：伤满即死且正文说「道伤崩碎」', got.sub);
    T(got.lv === got.cap, 'X2 呈报里的道伤层数 === cap（认屏上层数，一秒疗养救不活）', got.lv + '/' + got.cap);
    T(errors.length === 0, 'X3 零页面报错（道伤世）', errors.join(' | ').slice(0, 160) || 'clean');
    await ctx.close();
  }

  /* ── Z 折寿世（第卌八批第三条死因）：未到本境大限、被 lifeBonus 的负账打穿 ⇒
   * 呈报正文必须说「折寿而殒」。旧视图是 `cause === 'daoshang' ? 道伤 : 寿尽` 的二元 ternary，
   * 新死因会被静默归成「寿元耗尽」那句 ⇒ 本组即那条谎话的反证（判据两面：cause + 屏上正文）。 ── */
  {
    const { ctx, page, errors } = await openPage(buildSave({
      lifeUsed: Math.floor(CAP1 * 0.6), lifeBonus: -Math.ceil(CAP1 * 0.9)
    }));
    await page.waitForSelector('#modal-offline:not(.hide)', { timeout: 15000 });
    await page.waitForTimeout(300);
    const got = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = s.worlds[s.profile.worldId];
      return {
        sub: document.getElementById('mo-sub').textContent.trim(), cause: w.lastDeath.cause,
        zhe: SQ.t('life.death.zhesou', null, 'xiuxian'), shou: SQ.t('life.death.shoujin', null, 'xiuxian'),
        life: SQ.t('legacy.ui.zhesou', null, 'xiuxian'),
        log: (w.log || []).map(function (l) { return l.text; }).join('|')
      };
    });
    T(got.cause === 'zhesou' && got.sub === got.zhe && got.sub !== got.shou,
      'Z1 折寿而殒：cause=zhesou 且正文用新那句（不复用「寿元耗尽」）', got.sub.slice(0, 40));
    T(errors.length === 0, 'Z2 零页面报错（折寿世）', errors.join(' | ').slice(0, 160) || 'clean');
    /* 通道名那句「折寿而殒」的日志由冒烟 #304 在引擎侧判：走查这份档是**落盘后**的态，
     * 展示流日志此时已在侧档（sanqian-logs-v1，第卅九批起主档不含 log），在这里读它 = 第二套解码路径。 */
    await ctx.close();
  }

  await browser.close();
  console.log(fail === 0 ? 'UI_LIFE_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_LIFE_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
