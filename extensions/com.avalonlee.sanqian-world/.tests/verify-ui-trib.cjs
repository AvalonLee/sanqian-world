/* .tests/verify-ui-trib.cjs — 渡劫呈报（渡劫演出重做批）UI 走查
 * 依赖：playwright-core（需先安装）；用法：NODE_PATH=<playwright-core 所在 node_modules> node .tests/verify-ui-trib.cjs
 *
 * 背景：旧演出用近黑幕布铺满全屏，渡劫信息落在深色背景上识别不清；本批改为「主题感知卡片 + 成算环 + 数据行」。
 * 本脚本锁住三件事：① 幕布不再是近黑幕布；② 卡面走 --surface（浅主题浅卡 / 暗主题暗卡，非固定深色）；
 * ③ 数据行/成算环自洽且可读。
 *
 * 场景（真实结算，不注入结果数字）：
 *   起手：realm 0 · qi = REALMS[1].need（1000）· autoTrib 开 · lastSave 置未来 1h
 *        → boot 的 claim dt=0 不结算（不消费渡劫）→ 首个 tick（+1s）settle 掷判 → attempts++ → afterClaim → 弹层。
 *   Math.random 定值 0.5：成败只由 p 决定（p>0.5 成 / p<0.5 败），使 A/B 两帧确定可复跑。
 *   A 胜局：tribulation.next = 0    → p≈0.95 → 成 → 标题「雷歇云散」· 无「修为损失」行
 *   B 败局：tribulation.next = −0.9 → p=0.05 → 败 → 标题「天雷加身」· 含「修为损失」行
 *   C 暗色：A 同构 + data-xhub-theme=dark → 卡面随主题转深（证明主题感知）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

(async () => {
  const ROOT = path.resolve(__dirname, '..');
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, '.tests/fixture-save.json'), 'utf8'));
  const url = 'file:///' + path.join(ROOT, 'view/index.html').replace(/\\/g, '/');

  /* 起手档：realm 0 · 修为已满下一阶需求 · 自动渡劫开 · lastSave 置未来（boot 不结算，留给首个 tick） */
  const buildSave = (next) => {
    const s = JSON.parse(JSON.stringify(base));
    const now = Date.now();
    s.settings = Object.assign({}, s.settings, { autoTrib: true });
    s.profile.createdAt = now;
    Object.values(s.worlds).forEach(w => {
      w.realm = 0; w.qi = 1000; w.mode = 'seclude';
      w.lastSave = now + 3600000;          /* 未来 1h：boot dt=0，不结算 */
      w.lastOffline = null; w.pendingChoice = null;
      w.eventClock = 0; w.rumorClock = 0; w.eventCooldowns = {};
      w.tribulation = Object.assign({}, w.tribulation, { attempts: 0, next: next, officeGuard: false, streak: 0 });
    });
    return s;
  };

  const rgb = (css) => {
    const m = /rgba?\(([^)]+)\)/.exec(css || '');
    if (!m) return null;
    const p = m[1].split(',').map(v => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let pass = 0, fail = 0;
  const T = (ok, name, detail) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' (' + detail + ')' : '')); };

  const openPage = async (save, dark) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript((s) => {
      localStorage.setItem('sanqian-state-v1', s);
      Math.random = function () { return 0.5; };   /* 定值：成败只由 p 决定 */
    }, JSON.stringify(save));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(url);
    if (dark) await page.evaluate(() => document.documentElement.setAttribute('data-xhub-theme', 'dark'));
    return { ctx, page, errors };
  };

  /* 等演出席弹出 → 悬念帧（1s）过 → 结果帧数据行就位 */
  const awaitStage = async (page) => {
    await page.waitForSelector('#trib-stage:not(.hide)', { timeout: 20000 });
    await page.waitForSelector('#trib-rows .tr', { timeout: 8000 });   /* 结果帧（reveal 后才有行） */
    await page.waitForTimeout(200);
  };
  const readState = (page) => page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
    const w = s.worlds[s.profile.worldId];
    return { result: w.tribulation.lastResult, attempts: w.tribulation.attempts, realm: w.realm };
  });

  /* ── A 胜局（浅主题）── */
  {
    const { ctx, page, errors } = await openPage(buildSave(0), false);
    await awaitStage(page);
    const st = await readState(page);
    T(st.attempts === 1 && st.result === 'success', 'A 真实结算：首次渡劫且功成', JSON.stringify(st));

    /* ① 幕布非近黑（旧口径为铺满全屏的近黑幕布 → 本批弃用） */
    const maskBg = await page.$eval('#trib-stage', el => getComputedStyle(el).backgroundColor);
    const m = rgb(maskBg);
    T(m && m.a <= 0.5, 'A 幕布非近黑（alpha ≤ 0.5）', maskBg);

    /* ② 卡面走 --surface（浅主题 = 浅色卡，信息落在浅底上） */
    const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim());
    const cardBg = await page.$eval('#trib-box', el => getComputedStyle(el).backgroundColor);
    T(cardBg === surface, 'A 卡面底色 = 主题变量 --surface', cardBg + ' vs ' + surface);
    const c = rgb(cardBg);
    T(c && c.r >= 240 && c.g >= 240 && c.b >= 240, 'A 浅主题卡面为浅色（rgb ≥ 240）', cardBg);

    /* ③ 文字与卡面对比（深字浅底 → 识别清晰；取普通行 .tr b，避开 .hot/.bad 彩色值） */
    const inkCss = await page.$eval('#trib-rows .tr:not(.hot):not(.bad) b', el => getComputedStyle(el).color);
    const ink = rgb(inkCss);
    T(ink && ink.r <= 110 && ink.g <= 110 && ink.b <= 110, 'A 数据行文字为深色（与浅卡高对比）', inkCss);

    /* ④ 结果帧骨架：胜帧 class + 标题 */
    const boxCls = await page.$eval('#trib-box', el => el.className);
    T(/win/.test(boxCls) && !/lose/.test(boxCls), 'A 结果帧为胜帧（.win）', boxCls);
    const t1 = await page.$eval('#trib-t1', el => el.textContent.trim());
    T(t1 === '雷歇云散 · 渡劫功成', 'A 胜帧标题', t1);

    /* ⑤ 成算环：环内百分比与 dashoffset 自洽（周长 264） */
    const pct = parseInt((await page.$eval('#trib-ring-p', el => el.textContent.trim())), 10);
    const off = parseFloat(await page.$eval('#trib-arc', el => el.style.strokeDashoffset));
    T(pct >= 5 && pct <= 95, 'A 环内成算在 clamp 区间 [5,95]', String(pct));
    T(pct >= 50, 'A 胜局成算 ≥ 50（与定值 RNG 自洽：p>0.5 才成）', String(pct));
    T(Math.abs(off - 264 * (1 - pct / 100)) < 0.6, 'A 成算环 dashoffset 与百分比自洽', off + ' @' + pct + '%');

    /* ⑥ 数据行：成算 / 次数 / 护法（胜帧无损失行） */
    const rows = await page.$$eval('#trib-rows .tr', els => els.map(el => el.textContent.replace(/\s+/g, ' ').trim()));
    T(rows.length >= 3, 'A 数据行 ≥3（成算/次数/护法）', 'rows=' + rows.length);
    T(rows[0].includes('劫前成算') && rows[0].includes(pct + '%'), 'A 首行「劫前成算」= 环内百分比', rows[0]);
    T(rows.some(r => r.includes('渡劫次数') && r.includes('第 1 次渡劫')), 'A 含「渡劫次数」行（第 1 次渡劫）', rows.join(' | '));
    T(rows.some(r => r.includes('护法')), 'A 含「护法」加项行（世界包词族覆写）', rows.join(' | '));
    T(!rows.some(r => r.includes('修为损失')), 'A 胜帧无「修为损失」行', rows.join(' | '));

    /* ⑦ 点击提前收场（tribUnlocked 后） */
    await page.click('#trib-stage');
    await page.waitForTimeout(250);
    const hidden = await page.$eval('#trib-stage', el => el.classList.contains('hide'));
    T(hidden, 'A 点击幕布可提前收场', 'hidden=' + hidden);

    T(errors.length === 0, 'A 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ── B 败局（浅主题）── */
  {
    const { ctx, page, errors } = await openPage(buildSave(-0.9), false);
    await awaitStage(page);
    const st = await readState(page);
    T(st.attempts === 1 && st.result === 'fail', 'B 真实结算：首次渡劫且受创', JSON.stringify(st));

    const boxCls = await page.$eval('#trib-box', el => el.className);
    T(/lose/.test(boxCls), 'B 结果帧为败帧（.lose）', boxCls);
    const t1 = await page.$eval('#trib-t1', el => el.textContent.trim());
    T(t1 === '天雷加身 · 道基受创', 'B 败帧标题', t1);

    const pct = parseInt((await page.$eval('#trib-ring-p', el => el.textContent.trim())), 10);
    const off = parseFloat(await page.$eval('#trib-arc', el => el.style.strokeDashoffset));
    T(pct < 50, 'B 败局成算 < 50（与定值 RNG 自洽：p<0.5 才败）', String(pct));
    T(Math.abs(off - 264 * (1 - pct / 100)) < 0.6, 'B 成算环 dashoffset 与百分比自洽', off + ' @' + pct + '%');

    const rows = await page.$$eval('#trib-rows .tr', els => els.map(el => el.textContent.replace(/\s+/g, ' ').trim()));
    const lossRow = rows.find(r => r.includes('修为损失'));
    T(!!lossRow && /\d+%/.test(lossRow), 'B 败帧含「修为损失」行且带百分比', lossRow || rows.join(' | '));
    const lossCls = await page.$$eval('#trib-rows .tr', els => els.map(el => el.className));
    T(lossCls.some(c => /\bbad\b/.test(c)), 'B 损失行走警戒色调（.bad）', lossCls.join(','));

    T(errors.length === 0, 'B 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ── C 暗色主题：卡面随主题转深（主题感知，非固定深幕）── */
  {
    const { ctx, page, errors } = await openPage(buildSave(0), true);
    await awaitStage(page);
    const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim());
    const cardBg = await page.$eval('#trib-box', el => getComputedStyle(el).backgroundColor);
    T(cardBg === surface, 'C 暗主题卡面仍 = --surface（随主题转深）', cardBg + ' vs ' + surface);
    const c = rgb(cardBg);
    T(c && c.a <= 0.12, 'C 暗主题卡面为低不透明度深底（alpha ≤ 0.12）', cardBg);
    const inkCss = await page.$eval('#trib-rows .tr:not(.hot):not(.bad) b', el => getComputedStyle(el).color);
    const ink = rgb(inkCss);
    T(ink && ink.r >= 200 && ink.g >= 200 && ink.b >= 200, 'C 暗主题数据行文字为浅色（深底浅字可读）', inkCss);
    const maskBg = await page.$eval('#trib-stage', el => getComputedStyle(el).backgroundColor);
    const m = rgb(maskBg);
    T(m && m.a <= 0.5, 'C 暗主题幕布仍非近黑（alpha ≤ 0.5）', maskBg);
    T(errors.length === 0, 'C 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  /* ── D 天怒罚值行取自表（第十四批审计 #5）──
   * 旧代码在修行页的渡劫明细里硬编码 `-0.03 / -0.01`，而 `D.TIANDAO.DEFY_TRIB_MODS = [-0.01, -0.02]`
   * ⇒ 屏上比引擎多罚一档，且与同一面板上方那行引擎实算值互相打架。
   * 🔧 当晚复核定性：引擎 `tribModOf` 是 **`armed.lai` 与 `armed.nu` 两支相加**（逆天 25 + 37 = 62 就双旗同亮），
   *   而 `stageOf` 只回一个档名 ⇒ 视图「按档名取一支」仍会少算。故本档 fixture 改成**两旗同亮**，
   *   D1 的期望从 `表[1]` 改为 **`表[0]+表[1]`**，并加判「不等于只取一支的那个数」——旧写法在这两条下都红。
   * 判据两半：**(D1)** 行内数字 === 表值之和；**(D2)** 当场把表改成 −0.07 再重绘 ⇒ 行内数字跟着变
   * （证它是「读表」而不是「碰巧等于表值」；realm 9 没有待渡的劫 ⇒ 这条只能放在这里，alltabs 到不了该块）。 */
  {
    const s = buildSave(0);
    Object.values(s.worlds).forEach(w => {
      w.tiandao = Object.assign({}, w.tiandao, { defy: 70, armed: { lai: true, nu: true } });
    });
    const { ctx, page, errors } = await openPage(s, false);
    const dRes = await page.evaluate(async () => {
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data;
      const open = () => {
        const b = document.querySelector('#tab-idle [data-act="detailTrib"]');
        if (b) b.click();
        return !!b;
      };
      const read = () => {
        const nu = SQ.t('tiandao.stage.nu', null, 'xiuxian');
        const rows = Array.prototype.slice.call(document.querySelectorAll('#tab-idle .detailbox .kv'));
        const hit = rows.map(r => (r.innerText || '')).filter(x => x.indexOf(nu) >= 0)
          .map(x => ((x.match(/-?\d\.\d+/) || [''])[0]));
        return { n: hit.length, shown: hit[0] || '' };
      };
      const hasBtn = open();
      const dm0 = D.TIANDAO.DEFY_TRIB_MODS.slice();
      const want0 = (dm0[0] + dm0[1]).toFixed(2);          /* 引擎口径 = 两旗之和 */
      const single0 = dm0[1].toFixed(2);                    /* 只取一支 = 返修前的形状 */
      const r0 = read();
      D.TIANDAO.DEFY_TRIB_MODS = [dm0[0], -0.07];          /* 合成表（不落盘，只验读表形状） */
      open(); open();                                       /* 折叠再展开 ⇒ 重绘 */
      const r1 = read();
      const want1 = (dm0[0] + -0.07).toFixed(2);
      D.TIANDAO.DEFY_TRIB_MODS = dm0;
      open(); open();
      const r2 = read();
      return { hasBtn: hasBtn, stage: SQ.Tiandao.stageOf(SQ.Worlds.xiuxian.pack ? JSON.parse(localStorage.getItem('sanqian-state-v1')).worlds.xiuxian : {}, D),
        want0: want0, want1: want1, single0: single0, r0: r0, r1: r1, r2: r2 };
    });
    T(dRes.hasBtn && dRes.r0.n === 1 && dRes.r0.shown === dRes.want0 && dRes.r0.shown !== dRes.single0,
      'D1 修行页「天怒」行 === `DEFY_TRIB_MODS` **两旗之和**（引擎 `tribModOf` 同式；旧写法按 `stageOf` 只取一支 = 少算，硬编码 −0.03 那一版更早）',
      '屏=' + (dRes.r0.shown || '(无该行)') + ' 表和=' + dRes.want0 + ' 只取一支=' + dRes.single0 + ' 按钮在=' + dRes.hasBtn);
    T(dRes.r1.shown === dRes.want1 && dRes.r2.shown === dRes.want0,
      'D2 当场改表 ⇒ 该行跟着变（证「读表」而非「碰巧同值」），改回即复原',
      '改后=' + dRes.r1.shown + '(应=' + dRes.want1 + ') 复原=' + dRes.r2.shown);
    T(errors.length === 0, 'D 零页面报错', errors.join(' | ').slice(0, 200) || 'clean');
    await ctx.close();
  }

  await browser.close();
  console.log(fail === 0 ? 'UI_TRIB_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_TRIB_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
