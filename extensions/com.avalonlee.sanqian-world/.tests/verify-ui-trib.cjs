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
    await page.waitForSelector('#trib-stage:not(.hide)', { timeout: 20000 });
    /* B16-u：首帧 = 清算（账单先于定数揭盅） */
    const clear0 = await page.evaluate(() => ({
      hidden: document.getElementById('trib-clear').hidden,
      verdict: document.getElementById('trib-verdict').hidden,
      bill: document.querySelectorAll('#trib-bill li').length
    }));
    T(clear0.hidden === false && clear0.verdict === true && clear0.bill === 8,
      'A 演出首帧 = 清算（七项账单先行，定数尚未揭盅）', JSON.stringify(clear0));
    await awaitStage(page);
    const st = await readState(page);
    T(st.attempts === 1 && st.result === 'success', 'A 真实结算：首次渡劫且功成', JSON.stringify(st));

    /* ① 幕布 = 设计稿深色遮罩；定数帧（.ok/.bad）改用渐变底 ⇒ 量 background-image */
    const maskBg = await page.evaluate(() => {
      const el = document.getElementById('trib-stage');
      const cs = getComputedStyle(el);
      return { color: cs.backgroundColor, image: cs.backgroundImage };
    });
    const m = rgb(maskBg.color);
    T((maskBg.image && maskBg.image.indexOf('gradient') >= 0) || (m && m.a >= 0.5 && m.a <= 0.7),
      'A 幕布为设计稿深色遮罩（落雷前深底 / 定数帧云开渐变）', JSON.stringify(maskBg));

    /* ② 演出面板走 UI v2 纸面令牌（.tstage；清算与定数同壳） */
    const paperRgb = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.background = 'var(--sq2-paper)';
      document.body.appendChild(d);
      const v = getComputedStyle(d).backgroundColor;
      d.remove();
      return v;
    });
    const cardBg = await page.$eval('#trib-verdict', el => getComputedStyle(el).backgroundColor);
    T(cardBg === paperRgb, 'A 演出面板底色 = 纸面令牌 --sq2-paper', cardBg + ' vs ' + paperRgb);
    const c = rgb(cardBg);
    T(c && c.r >= 220 && c.g >= 220 && c.b >= 200, 'A 浅主题面板为宣纸浅色（rgb ≥ 220）', cardBg);

    /* ③ 文字与卡面对比（深字浅底 → 识别清晰；取普通行 .tr b，避开 .hot/.bad 彩色值） */
    const inkCss = await page.$eval('#trib-rows .tr:not(.hot):not(.bad) b', el => getComputedStyle(el).color);
    const ink = rgb(inkCss);
    T(ink && ink.r <= 110 && ink.g <= 110 && ink.b <= 110, 'A 数据行文字为深色（与浅卡高对比）', inkCss);

    /* ④ 结果帧骨架：胜帧 class + 标题 */
    const boxCls = await page.$eval('#trib-box', el => el.className);
    T(/win/.test(boxCls) && !/lose/.test(boxCls), 'A 结果帧为胜帧（.win）', boxCls);
    const t1 = await page.$eval('#trib-t1', el => el.textContent.trim());
    T(t1 === '雷歇云散 · 渡劫功成', 'A 胜帧标题', t1);

    /* ⑤ 清算账单（B16-u）：成算大数 = 账单合计；七项加数 + 合计共八行 */
    const pct = parseInt((await page.$eval('#trib-ring-p', el => el.textContent.trim())), 10);
    T(pct >= 5 && pct <= 95, 'A 成算大数在 clamp 区间 [5,95]', String(pct));
    T(pct >= 50, 'A 胜局成算 ≥ 50（与定值 RNG 自洽：p>0.5 才成）', String(pct));
    const bill = await page.evaluate(() => {
      const lis = Array.prototype.slice.call(document.querySelectorAll('#trib-bill li'));
      return {
        n: lis.length,
        labels: lis.map(li => {
          const sp = li.querySelector('span');
          /* 只取标签本体：<em> 是行内小注（战力 / 道心 / 护法名），不算标签 */
          return sp && sp.firstChild ? String(sp.firstChild.textContent).trim() : '';
        }),
        sum: ((document.querySelector('#trib-bill .t-sum b') || {}).textContent || '').trim()
      };
    });
    T(bill.n === 8, 'A 清算账单 = 七项加数 + 合计（8 行）', 'n=' + bill.n);
    T(['境界基础', '百器抗性', '战力富余', '天赋/功法', '道心', '正道光环', '护法']
      .every(k => bill.labels.some(x => x.indexOf(k) >= 0)),
      'A 账单七项与引擎 tribInfo.parts 同名（不让视图自造口径）', bill.labels.join('/'));
    T(bill.sum === pct + '%', 'A 账单合计 === 成算大数（同一快照，非两处各算）', bill.sum + ' @' + pct + '%');

    /* ⑥ 数据行：成算 / 次数 / 护法（胜帧无损失行） */
    const rows = await page.$$eval('#trib-rows .tr', els => els.map(el => el.textContent.replace(/\s+/g, ' ').trim()));
    T(rows.length >= 3, 'A 数据行 ≥3（成算/次数/护法）', 'rows=' + rows.length);
    T(rows[0].includes('劫前成算') && rows[0].includes(pct + '%'), 'A 首行「劫前成算」= 环内百分比', rows[0]);
    T(rows.some(r => r.includes('渡劫次数') && r.includes('第 1 次渡劫')), 'A 含「渡劫次数」行（第 1 次渡劫）', rows.join(' | '));
    T(rows.some(r => r.includes('护法')), 'A 含「护法」加项行（世界包词族覆写）', rows.join(' | '));
    T(!rows.some(r => r.includes('修为损失')), 'A 胜帧无「修为损失」行', rows.join(' | '));
    /* ⑦ UI v2 B11：清算 → 落雷 → 定数三段标，揭盅后定数点亮 */
    const steps = await page.evaluate(() => {
      const xs = Array.prototype.slice.call(document.querySelectorAll('#trib-steps span'));
      return { n: xs.length, labels: xs.map(x => x.textContent.trim()), on: xs.findIndex(x => x.className === 'on') };
    });
    T(steps.n === 3 && steps.labels.every(x => x.length > 0) && steps.on === 2,
      'A 渡劫三段标齐（清算 / 落雷 / 定数），结果帧停在定数', JSON.stringify(steps));

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
    T(pct < 50, 'B 败局成算 < 50（与定值 RNG 自洽：p<0.5 才败）', String(pct));
    const billSum = await page.$eval('#trib-bill .t-sum b', el => el.textContent.trim());
    T(billSum === pct + '%', 'B 清算合计 === 成算大数（败局同一快照）', billSum + ' @' + pct + '%');

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
    const paperRgb = await page.evaluate(() => {
      const d = document.createElement('div');
      d.style.background = 'var(--sq2-paper)';
      document.body.appendChild(d);
      const v = getComputedStyle(d).backgroundColor;
      d.remove();
      return v;
    });
    const cardBg = await page.$eval('#trib-verdict', el => getComputedStyle(el).backgroundColor);
    T(cardBg === paperRgb, 'C 暗主题面板 = 墨夜纸面令牌（随主题转深）', cardBg + ' vs ' + paperRgb);
    const c = rgb(cardBg);
    T(c && c.r < 60 && c.g < 60 && c.b < 60 && c.a > 0.9, 'C 墨夜面板为不透明深底（可读、不透视背景）', cardBg);
    const inkCss = await page.$eval('#trib-rows .tr:not(.hot):not(.bad) b', el => getComputedStyle(el).color);
    const ink = rgb(inkCss);
    T(ink && ink.r >= 200 && ink.g >= 200 && ink.b >= 200, 'C 暗主题数据行文字为浅色（深底浅字可读）', inkCss);
    const maskBg = await page.evaluate(() => {
      const el = document.getElementById('trib-stage');
      const cs = getComputedStyle(el);
      return { color: cs.backgroundColor, image: cs.backgroundImage };
    });
    const m = rgb(maskBg.color);
    T((maskBg.image && maskBg.image.indexOf('gradient') >= 0) || (m && m.a >= 0.5 && m.a <= 0.7),
      'C 暗主题幕布同为设计稿遮罩（深底 / 云开渐变）', JSON.stringify(maskBg));
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
    /* 🔧 二次复核：D 只读「天怒」那一行，不需要真渡一次劫。起手档 qi 已满 + next=0 + autoTrib 开 ⇒
     *   首个 tick 就可能把劫渡过掉，而 `tiandao.onTribSettled` 会**清掉 armed.lai/nu** ⇒ 那一行整块消失、
     *   D1/D2 变成竞态假红。本档单独关自动渡劫（其余场景不动）。 */
    s.settings.autoTrib = false;
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

  /* ── E 修行页渡劫倒计时（第十八批 · 用户令「修行页面，在合适地方增加一个倒计时，好让用户知道大约多少小时候可以渡劫」）──
   * 本项是**纯派生显示量**（不入存档、不改任何结算），所以判据必须落在屏上：
   *   **E1** 未满 ⇒ 圆心只剩倒计时一行，且时间桶（天 / 小时 / 分钟）与现场复算的 `(need − qi)/rate` 同桶；
   *          环上阈值标记（needmark）的坐标 === `need / cap` 的角度 ⇒ 证标记与进度环同一把尺。
   *   **E2** qi 顶到 `need` ⇒ 倒计时整枚消失、手动渡劫按钮出现、阈值标记仍在 ⇒ 证口径是 `Realm.needEffOf`
   *          而非 `Idle.capOf`（cap 恒 ≥ need；写错成 cap 时圆满仍会印倒计时 ⇒ 本条红）。 */
  {
    const scan = () => {
      const pack = SQ.Worlds.xiuxian.pack, D = pack.data;
      const s = JSON.parse(localStorage.getItem('sanqian-state-v1'));
      const w = s.worlds[s.profile.worldId];
      const m = SQ.Mods.collect(s.profile, w, pack, D);
      const need = SQ.Realm.needEffOf(w, pack, D, m);
      const rate = SQ.Idle.effRate(w, pack, D, m, false);
      const cap = SQ.Idle.capOf(w, pack, D, m);
      /* 册一百二十四批改口：圆心小字只剩倒计时（「距渡劫 X」），「下一境界」已移入环上 needmark
       * 的 <title>。仍要求**恰一处**倒计时；圆满时整枚 .sub 不渲染。 */
      const subs = Array.prototype.slice.call(document.querySelectorAll('#tab-idle .enso-core .sub'))
        .map(r => (r.innerText || '').replace(/\s+/g, ' '));
      const sec = rate > 0 ? (need - w.qi) / rate : -1;
      const bucket = sec >= 86400 ? '天' : (sec >= 3600 ? '小时' : '分钟');
      const rows = subs.filter(x => x.indexOf(bucket) >= 0);
      /* 环上阈值标记：need/cap 与进度环同一把尺（不是 need/need 也不是 qi/need）。 */
      const md = document.querySelector('#tab-idle .needmark .nm-dot');
      const mx = md ? parseFloat(md.getAttribute('cx')) : null;
      const my = md ? parseFloat(md.getAttribute('cy')) : null;
      const wantP = (need != null && cap > 0) ? need / cap : null;
      const wantA = wantP != null ? wantP * Math.PI * 2 - Math.PI / 2 : null;
      const wantX = wantA != null ? 118 + Math.cos(wantA) * 99 : null;
      const wantY = wantA != null ? 118 + Math.sin(wantA) * 99 : null;
      return { n: rows.length, total: subs.length, text: subs[0] || '', need: need, qi: w.qi, rate: rate, sec: Math.round(sec),
        bucket: bucket, cap: cap, mx: mx, my: my, wantX: wantX, wantY: wantY, hasMark: !!md,
        hasBtn: !!document.querySelector('#tab-idle [data-act="trib"]') };
    };
    const sU = buildSave(0);
    sU.settings.autoTrib = false;
    Object.values(sU.worlds).forEach(w => { w.qi = 400; });     /* realm 0 的 need = 1000 ⇒ 未满 */
    const aU = await openPage(sU, false);
    const e1 = await aU.page.evaluate(scan);
    T(e1.n === 1 && e1.total === 1 && e1.need > e1.qi && e1.rate > 0 && e1.text.indexOf(e1.bucket) >= 0 &&
      !/NaN|undefined|\{|idle\.trib\.eta/.test(e1.text) &&
      e1.hasMark && e1.wantX != null && Math.abs(e1.mx - e1.wantX) <= 1.2 && Math.abs(e1.my - e1.wantY) <= 1.2,
      'E1 未满 · 圆心只留「距渡劫 X」一行（时间桶 === 现场复算）‖ 环上阈值标记落在 need/cap 的角度',
      e1.text + ' ‖ need=' + e1.need + ' qi=' + e1.qi + ' cap=' + e1.cap + ' rate=' + e1.rate.toFixed(2) +
      ' 复算=' + e1.sec + 's 桶=' + e1.bucket + ' mark=' + e1.mx + ',' + e1.my + '/应=' + e1.wantX + ',' + e1.wantY);
    await aU.ctx.close();

    const sF = buildSave(0);                                    /* qi = 1000 === realm 0 的 need ⇒ 圆满 */
    sF.settings.autoTrib = false;
    const aF = await openPage(sF, false);
    const e2 = await aF.page.evaluate(scan);
    T(e2.n === 0 && e2.total === 0 && e2.qi >= e2.need && e2.hasBtn && e2.hasMark,
      'E2 圆满 · 倒计时行整枚消失（不印「可渡劫」，交给下方 CTA）且手动渡劫按钮在 ‖ 阈值标记仍在',
      '行=' + e2.n + ' 总=' + e2.total + ' qi=' + e2.qi + ' need=' + e2.need + ' 按钮=' + e2.hasBtn + ' 标记=' + e2.hasMark);
    /* B16-aa：渡劫 hero 加宽且仍在圆相下方、四格上方，并与四格同轴居中 */
    const e3 = await aF.page.evaluate(() => {
      const r = (s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect() : null; };
      const c = r('#tab-idle .hero-cta'), b = r('#tab-idle .hero-cta [data-act="trib"]');
      const en = r('#tab-idle .stathero'), st = r('#tab-idle .statrow');
      return {
        cw: c ? Math.round(c.width) : 0, bw: b ? Math.round(b.width) : 0,
        axis: c && st ? Math.round((c.left + c.width / 2) - (st.left + st.width / 2)) : 999,
        belowEnso: !!(c && en && c.top >= en.bottom - 2),
        aboveStat: !!(c && st && c.bottom <= st.top + 2)
      };
    });
    T(e3.cw >= 400 && e3.bw >= 300 && Math.abs(e3.axis) <= 2 && e3.belowEnso && e3.aboveStat,
      'E3 渡劫 hero 加宽（块 ≥400 / 钮 ≥300）· 仍在圆相下方、四格上方 · 与四格同轴居中', JSON.stringify(e3));
    T(aU.errors.length === 0 && aF.errors.length === 0, 'E 零页面报错',
      aU.errors.concat(aF.errors).join(' | ').slice(0, 200) || 'clean');
    await aF.ctx.close();
  }

  await browser.close();
  console.log(fail === 0 ? 'UI_TRIB_ALL_GREEN ' + pass + '/' + (pass + fail) : 'UI_TRIB_FAILED ' + fail);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('SCRIPT_ERROR', e); process.exit(2); });
