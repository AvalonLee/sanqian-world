/* G18 轮回转世 + 真灵承继（轮回卷 §3.4 / §5.2 ‖ 第册四十九批 2026-10-19 从 view/index.html 整片搬出 · N34 第十三刀）
 * 范围 = 真灵承继一族（`heirNameOf` / `heirStatusText` / `renderHeirChoice` / `openHeirPicker` / `commitHeirChoice` /
 * `askHeirChoice` / `openHeirSwitch` / `heirToastText`）+ 结算预览分项（`settlePreviewText`）+ 飞升/兵解原因文案
 * （`legacyReasonText`）+ 轮回页（`renderLegacy`）+ 六条动作分支（`ascend` / `dissolve` / `lgBuy` / `heirPick` / `heirSwitch`）。
 *
 * 留在内核的三件，各按「动作属于哪套机器」判：
 *   创角屏重入（`MASKS` / `confirmCb` / `draft` / `show`，与「创角三屏 + boot 不搬」同族，桥位 `enterRebirth`）
 *   ‖ 盖棺之传（演出族，第十四刀才搬，桥位 `playRecap`）‖ 两个 DOM 监听（`hc-cancel` / `hc-none`，件内只留一行转发）。
 *   前两件经桥位 `enterRebirth` / `playRecap` 供件内调用（都是「件外调用才进桥」那条口径）。
 * 桥 = `ctx()` 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；本刀**新增两枚**：`enterRebirth` 与 `playRecap`。
 * ⚠️ 本族没有「局部 c」那一族（原 `cands.forEach(function (c) …)` 已改 `ch`），但 `askHeirChoice(c, cont)` 的 `cont`
 * 是**跨件回调**：内核转世链把后续整段交进来，回调里仍在内核作用域 ⇒ 件内只负责「问完再调 cont」。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function heirNameOf(c, id) { return id ? c.t('treasure.' + id + '.name') : ''; }
  /* 承继态一行（浮层与轮回页复用）：择定 > 显式不带 > 在档续带 > 未择定
   * （空串 ⇒ 由 sub 行说明「自动带入第一件已觉醒者」口径，不另立键）
   * N18：择定件**已失**（既不在候选、也不是在档续带件）时不再谎报「已择定」，
   * 改说失效原因——引擎侧 legacy.js:438-439 对脏选降级为「取第一件已觉醒者 / 原样续带」，
   * 玩家侧此前零解释且零改选入口（候选为空时整块连「换一件」都不出）。 */
  function heirStatusText(c, meta, cands) {
    if (meta.heirChoice === SQ.Legacy.HEIR_NONE) return c.t('spirit.ui.heir.skipped');
    if (meta.heirChoice) {
      var cs = cands || SQ.Legacy.heirCandidates(c.w, c.p);
      var hit = false, ci = 0;
      for (; ci < cs.length; ci++) if (cs[ci].id === meta.heirChoice) { hit = true; break; }
      if (!hit && meta.heirTreasure !== meta.heirChoice) {
        return c.t('spirit.ui.heir.lost', { name: heirNameOf(c, meta.heirChoice) });
      }
      return c.t('spirit.ui.heir.picked', { name: heirNameOf(c, meta.heirChoice) });
    }
    if (meta.heirTreasure) return c.t('spirit.ui.heir.carry', { name: heirNameOf(c, meta.heirTreasure) });
    return '';
  }
  function renderHeirChoice(c) {
    var w = c.w, p = c.p, d = c.d;
    var meta = c.s.meta || {};
    var cands = SQ.Legacy.heirCandidates(w, p);
    var sel = meta.heirChoice || meta.heirTreasure || (cands[0] || {}).id || '';
    c.$('hc-title').textContent = c.t('spirit.ui.heir.title');
    c.$('hc-sub').textContent = c.t('spirit.ui.heir.sub');
    c.$('hc-carry').textContent = heirStatusText(c, meta, cands);
    var h = '';
    cands.forEach(function (ch) {
      var on = ch.id === sel;
      h += '<div class="lrow' + (on ? ' cur' : '') + '"><div class="nm">' + c.esc(heirNameOf(c, ch.id)) +
        ' <span class="special-mark">' + c.esc(c.t('spirit.ui.awake')) + '</span></div>' +
        '<div class="meta">' + c.esc(c.t('spirit.ui.persona', { p: ch.sp.p ? c.t('spirit.persona.' + ch.sp.p + '.name') : c.t('spirit.ui.gray') })) +
        ' · ' + c.esc(c.t('spirit.ui.warm', { w: Math.floor(ch.sp.w || 0), need: SQ.Fusion ? SQ.Fusion.needOf(d, ch.def) : 0 })) +
        '</div><div class="acts"><button class="' + (on ? 'primary' : '') + '" data-act="heirPick" data-v="' + ch.id + '">' +
        c.esc(c.t('spirit.ui.heir.pick')) + '</button></div></div>';
    });
    c.$('hc-list').innerHTML = h || ('<p class="hint">' + c.esc(c.t('spirit.ui.heir.empty')) + '</p>');
    c.$('hc-verdict').textContent = c.t('spirit.ui.verdict') + ' · ' + c.t('spirit.ui.heir.note');
    c.$('hc-cancel').textContent = c.t('ui.cancel');
    c.$('hc-none').textContent = c.t('spirit.ui.heir.skip');
  }
  /* onPick(choice) — choice = 法宝 id / 'none'（引擎哨兵 HEIR_NONE）/ null（取消，不落库） */
  function openHeirPicker(c, onPick) {
    c.ui.heirPick = onPick;
    renderHeirChoice(c);
    c.$('modal-heirchoice').classList.remove('hide');
  }
  async function commitHeirChoice(c, ch) {
    var cb = c.ui.heirPick; c.ui.heirPick = null;
    c.$('modal-heirchoice').classList.add('hide');
    if (!cb) return;
    if (ch == null) { cb(null); return; }
    await SQ.mutate(c.s, function (s) { s.meta.heirChoice = ch; });
    cb(ch);
  }
  /* 转世前置门：不需要问就直过（回调同帧执行，转世链零改动） */
  function askHeirChoice(c, cont) {
    var meta = c.s.meta || {};
    if (!SQ.Legacy || !SQ.Legacy.heirEligible(meta)) { cont(); return; }
    if (!SQ.Legacy.heirCandidates(c.w, c.p).length) { cont(); return; }
    if (meta.heirChoice) { cont(); return; }          /* 本世已择定：一次转世只弹一次 */
    openHeirPicker(c, function (ch) { if (ch == null) return; c.toast(heirToastText(c, ch)); cont(); });
  }
  /* 「换一件」重开入口（轮回页常驻）：转世后改主意 / 择定后反悔，覆写 meta.heirChoice 即可 */
  function openHeirSwitch(c) {
    openHeirPicker(c, function (ch) {
      if (ch == null) return;
      c.toast(heirToastText(c, ch));
      c.renderAll();
    });
  }
  function heirToastText(c, ch) {
    return ch === SQ.Legacy.HEIR_NONE ? c.t('spirit.ui.heir.skipped')
      : c.t('spirit.ui.heir.done', { name: heirNameOf(c, ch) });
  }

  /* ── §5.2 结算浮层分项行（兵解预估预览复用）：逐行只渲染 preview() 产物，视图零自造数 ──
   * 总结区（境界/渡劫成败/首通区数/结缘人数）由 preview.summary 供数 → 预览与实结同源。*/
  function settlePreviewText(c, pv) {
    var rows = [c.t('legacy.ui.preview.title') + ' · ' + c.t('legacy.ui.preview.life', { n: pv.life })];
    var sm = pv.summary || {};
    rows.push(c.t('legacy.ui.preview.realm') + ' · ' + c.t('realm.' + (sm.realm || 0)));
    rows.push(c.t('legacy.ui.preview.trib', { w: sm.tribWin || 0, l: sm.tribFail || 0 }));
    rows.push(c.t('legacy.ui.preview.zones', { n: sm.zones || 0 }));
    rows.push(c.t('legacy.ui.preview.bonds', { n: sm.bonds || 0 }));
    (pv.lines || []).forEach(function (ln) {
      if (ln.nominal <= 0) return;
      rows.push(c.t('legacy.score.' + ln.key.replace(/\..*$/, '')) + ' ' + SQ.fmt(ln.got) +
        (ln.owned && ln.got === 0 ? ' · ' + c.t('legacy.score.owned') : ''));
    });
    rows.push(c.t('legacy.ui.preview.subtotal') + ' ' + SQ.fmt(pv.subtotal));
    rows.push(c.t('legacy.ui.preview.mult') + ' ×' + pv.mult.toFixed(1));
    rows.push(c.t('legacy.ui.preview.total') + ' ' + SQ.fmt(pv.total));
    rows.push(c.t('legacy.ui.preview.imm') + ' ' + SQ.fmt(pv.immediate));
    rows.push(c.t('legacy.ui.preview.balance') + ' ' + SQ.fmt(pv.balanceAfter));
    return rows.join('\n');
  }

  function legacyReasonText(c, r) {
    if (!r || !r.reason) return '';
    if (r.reason === 'cd' && r.until) return c.t('legacy.ui.feisheng.cd', { t: c.timeLeft(Math.max(0, r.until - Date.now())) });
    /* 飞升门槛原因（真仙未满 / 修为未盈满，轮回卷 §1.1）先取本族正典行——此前 `qi` 一路穿透，
     * 拼出的 legacy.ui.fail.qi 全库无键 ⇒ 裸拉丁内部字段名直接上屏（A4 精神越线 + 玩家读不懂） */
    var kl = 'legacy.ui.feisheng.lock.' + r.reason;
    if (c.t(kl) !== kl) return c.t(kl);
    var k = 'legacy.ui.fail.' + r.reason;
    return c.t(k) !== k ? c.t(k) : c.t('legacy.ui.fail.other');
  }

  /* ── 轮回页（SYS · 轮回卷 B1 + 图鉴卷 B2：余额/商店/九面图鉴/称号墙/前世书/飞升兵解）── */
  function renderLegacy(c) {
    var w = c.w, d = c.d, p = c.p, m = c.mods;
    var meta = c.s.meta || {};
    var st = meta.stats || {};
    var h = '<div class="pagehead split"><div class="chips"><button class="on">' + c.esc(c.t('legacy.system')) + '</button></div>' +
      '<span class="tdtitle">' + c.esc(c.t('legacy.ui.balance', { n: SQ.fmt(meta.karma || 0) })) + '</span></div>';
    /* UI v2 B9：跨世四格（世数 / 飞升 / 兵解 / 身死）+ 最高境界一行；身死 = 被动了结（寿尽 / 道伤），与主动兵解分列 */
    h += '<div class="legacygrid">' +
      '<div class="lg-cell"><span class="lg-n">' + (st.lives || 0) + '</span><span class="lg-k">' + c.esc(c.t('legacy.ui.stat.lives')) + '</span></div>' +
      '<div class="lg-cell"><span class="lg-n">' + (st.ascensions || 0) + '</span><span class="lg-k">' + c.esc(c.t('legacy.ui.stat.asc')) + '</span></div>' +
      '<div class="lg-cell"><span class="lg-n">' + (st.dissolutions || 0) + '</span><span class="lg-k">' + c.esc(c.t('legacy.ui.stat.dis')) + '</span></div>' +
      '<div class="lg-cell"><span class="lg-n">' + (st.deaths || 0) + '</span><span class="lg-k">' + c.esc(c.t('legacy.ui.stat.death')) + '</span></div>' +
      '</div>' +
      '<div class="kv"><span class="hint">' + c.esc(c.t('legacy.ui.stat.realm', {
        realm: c.t('realm.' + Math.min(st.realmMax || 0, d.REALMS.length - 1))
      })) + '</span></div>';
    /* B16-l · 设计稿 §轮回 的次序：先「兵解转世」（可选项），再「飞升」（终局），最后真灵承继。
     * 兵解入口改为居中印钮 + 一句后果说明（原文只有一颗通栏按钮，玩家点下去才知道折分 ×0.7）。 */
    var canBj = SQ.Legacy && w.realm >= ((d.LEGACY || {}).BINGJIE_MIN_REALM || 4);
    if (canBj) {
      h += '<div class="bjbox"><button class="bingjiebtn" data-act="dissolve">' + c.esc(c.t('legacy.ui.bingjie.btn')) + '</button>' +
        '<p class="hint">' + c.esc(c.t('legacy.ui.bingjie.sub')) + '</p></div>';
    }
    /* 兵解结算预览（设计稿 §兵解结算预览「与实结同源」）：逐行只读 `SQ.Legacy.preview` 产物，
     * 视图不另算一份 —— 玩家在按下兵解之前就能看见此世折多少遗泽。 */
    if (canBj) {
      var pvB = SQ.Legacy.preview(w, meta, p, d, 'bingjie', Date.now());
      var smB = pvB.summary || {};
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('legacy.ui.previewbox')) + '</span>' +
        '<span class="s">' + c.esc(c.t('legacy.ui.preview.src')) + '</span></div>';
      h += '<div class="detailbox">' +
        '<div class="kv"><span>' + c.esc(c.t('legacy.ui.preview.realm')) + '</span><b>' + c.esc(c.t('realm.' + (smB.realm || 0))) + '</b></div>' +
        '<div class="kv"><span>' + c.esc(c.t('legacy.ui.preview.trib', { w: smB.tribWin || 0, l: smB.tribFail || 0 })) + '</span></div>' +
        '<div class="kv"><span>' + c.esc(c.t('legacy.ui.preview.zones', { n: smB.zones || 0 })) + '</span></div>' +
        '<div class="kv"><span>' + c.esc(c.t('legacy.ui.preview.bonds', { n: smB.bonds || 0 })) + '</span></div>' +
        '<div class="kv"><span>' + c.esc(c.t('legacy.ui.preview.totallab')) + '</span><b class="good">+' +
        SQ.fmt(pvB.total || 0) + '</b></div></div>';
    }
    /* 飞升（终局）：真仙盈满才亮，未达时把原因写在同一块里 */
    if (w.realm >= d.REALMS.length - 1 && SQ.Legacy) {
      var fsChk = SQ.Legacy.canFeisheng(w, p, d, meta, Date.now(), c.s.profile);
      var fsInfo = SQ.Legacy.feishengInfo(w, p, d, m);
      h += '<div class="tribready" style="margin-top:10px"><div class="tr-t">' + c.esc(c.t('legacy.ui.feisheng.btn')) + '</div>' +
        (fsInfo ? '<div class="hint">' + c.esc(c.t('legacy.ui.feisheng.p', { p: Math.round(fsInfo.p * 100) })) + '</div>' : '') +
        '<div class="hint">' + c.esc(fsChk.ok ? c.t('legacy.ui.feisheng.confirm') : legacyReasonText(c, fsChk)) + '</div>' +
        (fsChk.ok ? '<button class="primary" data-act="ascend" style="width:100%;margin-top:6px">' + c.esc(c.t('legacy.ui.feisheng')) + '</button>' : '') +
        '</div>';
    }
    /* 真灵承继常驻态 +「换一件」入口（轮回卷 §3.4 · 器灵卷 §九）：
     * 未持 shop.heir 资格整块不出现（零打扰）；持格且本世零觉醒候选**且无失效择定**时整块不出现——
     * **不留一个点不开的按钮**。N18 例外：择定件已失时**必须留入口**，否则那条脏择定永远清不掉
     *（浮层内候选为空有专项说明 +「本次不带」可清除，见 spirit.ui.heir.empty）。 */
    var heirCands = SQ.Legacy && SQ.Legacy.heirEligible(meta) ? SQ.Legacy.heirCandidates(w, p) : [];
    if (heirCands.length || (SQ.Legacy && SQ.Legacy.heirEligible(meta) && meta.heirChoice && meta.heirChoice !== SQ.Legacy.HEIR_NONE)) {
      var heirLine = heirStatusText(c, meta, heirCands);
      h += '<div class="tribready" style="margin-top:8px"><div class="tr-t">' + c.esc(c.t('spirit.ui.heir.title')) + '</div>' +
        '<div class="hint">' + c.esc(c.t('spirit.ui.heir.sub')) + '</div>' +
        (heirLine ? '<div class="hint" style="font-weight:650">' + c.esc(heirLine) + '</div>' : '') +
        '<button data-act="heirSwitch" style="width:100%;margin-top:6px">' + c.esc(c.t('spirit.ui.heir.switch')) + '</button></div>';
    }
    /* 遗泽商店（价目总表 6800 · 已购置灰不隐藏）——B16-l：卡片网格改整行，价目落到右列 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('legacy.ui.shop')) + '</span>' +
      '<span class="s">' + c.esc(c.t('legacy.ui.shop.hint')) + '</span></div>';
    h += '<div class="rowlist">';
    SQ.Legacy.shopItems(d).forEach(function (it) {
      var owned = (meta.spent || {})[it.key] != null;
      var descKey = it.kind === 'talent' ? ('legacy.talent.' + it.talent.id + '.desc')
        : it.kind === 'qirate' ? 'legacy.shopdesc.qirate'
        : it.kind === 'startRealm' ? 'legacy.shopdesc.startRealm'
        : ('legacy.shopdesc.' + it.id);
      h += '<div class="lrow atkrow' + (owned ? ' locked' : '') + '"><span class="nm">' + c.esc(c.t(it.nameKey)) + '</span>' +
        '<span class="meta">' + c.esc(c.t(descKey)) + '</span>' +
        '<span class="rr"><b>' + c.esc(SQ.fmt(it.price)) + '</b>' + (owned
          ? '<button disabled>' + c.esc(c.t('legacy.ui.owned')) + '</button>'
          : '<button data-act="lgBuy" data-v="' + it.id + '"' + ((meta.karma || 0) < it.price ? ' disabled' : '') + '>' +
            c.esc(c.t('legacy.ui.buy')) + ' ›</button>') + '</span></div>';
    });
    h += '</div>';
    /* ── 遗泽收支流水（绿灯不等于链通批 · C2）──────────────────────────
     * `meta.karmaLog` 由 legacy.js 的唯一写口 logPush 落账（achv / milestone / buy / settle
     * 四路 + normalize 兜底 fix），条目 {ts, delta, reason, balance}，写口留 20 条、
     * core.js 容量级① 裁到 10 条——**全库此前零读点**：玩家看得见余额、看不见钱怎么来怎么去。
     * 本节即该账本的常驻面，沿用页内 .lrow 行语域 + 既有 legacy.reason.* 五键，零新键。 */
    var klog = (meta.karmaLog || []).slice().reverse();
    /* 一次转世结算会以**同一个 ts** 推入十几行（`legacy.js` 的 `applyPreview` 逐明细行 logPush），
     * 于是轮回页出现整屏一模一样的「转世结算」（2026-10-13 用户报，真机档实测 20 行全是它，
     * 还把别的 reason 全挤出 20 条窗口）。账本按明细留痕是对的（可复算 ⇒ #197/#295），
     * **呈现按事件合并**：同 reason + 同 ts 折成一行、金额相加、末尾标 ×N。
     * shortcut: 合并身份 = reason+ts（同一毫秒的两笔不同结算会被并；结算由玩家点击发起且有
     * 转世 CD，不成立）。若将来要逐行摆明细，得在 `meta.karmaLog` 里带上明细 key（新增存档
     * 字段 + 容量 re-anchor），那时再改判据，别现在先写。 */
    var kgrp = [];
    klog.forEach(function (l) {
      var g = kgrp[kgrp.length - 1];
      if (g && g.reason === l.reason && g.ts === l.ts) {
        g.delta += l.delta; g.n++;   /* 余额留「先遇见的那条」= 倒序里的最新一笔（链尾），不覆写成链首 */
        return;
      }
      kgrp.push({ ts: l.ts, delta: l.delta, reason: l.reason, balance: l.balance, n: 1 });
    });
    /* B16-l：伪段标（`<p class="hint">` 加粗冒充标题）改 `.sechead`。段标文本仍取 `legacy.ui.balance`
     * 的空参惯用法（走查 C2f 钉的就是这一条），右侧补一句流水口径说明。 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('legacy.ui.balance', { n: '' })) + '</span>' +
      '<span class="s">' + c.esc(c.t('legacy.ui.karmalog.note')) + '</span></div>';
    if (!kgrp.length) h += '<p class="hint">' + c.esc(c.t('log.empty')) + '</p>';
    h += '<div data-karmalog="1">';
    kgrp.forEach(function (l) {
      var rk = 'legacy.reason.' + l.reason;
      var rl = c.t(rk);
      if (rl === rk) rl = c.t('legacy.reason.fix');   /* 未知 reason 兜底「账本修复」，绝不上屏裸拉丁 */
      var kgt = c.date(l.ts);
      if (!kgt && l.ts) {
        var kdt = new Date(l.ts);
        kgt = ('0' + kdt.getHours()).slice(-2) + ':' + ('0' + kdt.getMinutes()).slice(-2);
      }
      h += '<div class="lrow" data-karmalog-row="' + c.esc(l.reason) + '" data-karmalog-n="' + l.n +
        '"><div class="nm">' + c.esc(rl) + (l.n > 1 ? c.esc(' ×' + l.n) : '') +
        (kgt ? ' <span class="hint">' + c.esc(kgt) + '</span>' : '') + '</div>' +
        '<div class="meta">' + c.esc((l.delta >= 0 ? '+' : '−') + SQ.fmt(Math.abs(l.delta)) + ' · ' +
          c.t('legacy.ui.balance', { n: SQ.fmt(l.balance) })) + '</div></div>';
    });
    h += '</div>';
    /* 图鉴九面 / 称号墙 / 成就图鉴入口已迁至独立「成就」页顶（图鉴与成就同页），轮回页只留转世机制 */
    /* 前世书（≤9 世 · 展开全文）
     * ⚠️ 「烧表请天道作传」那一族入口已于第册批整族下线（按钮 / 粘贴框 / 采纳钮 + `Codex.bioMemo`
     *    / `Codex.adoptBio` / `Actions.adoptBio` / `BIO_MEMO_LEN` / 五条词条 + 作传提示词一起删）：这条通道要玩家
     *    自己粘回一段外部文本，实机上没人真用它，留着只让前世书看起来像个待办清单。
     *    来源小标**保留**——老档里确有 `source:'tiandao'` 的条目，抹掉小标等于把它们的来路抹了。 */
    var bios = meta.biographies || [];
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('legacy.ui.bios')) + '</span>' +
      '<span class="s">' + c.esc(c.t('legacy.ui.bios.n', { n: bios.length })) + '</span></div>';
    if (!bios.length) h += '<p class="hint">' + c.esc(c.t('legacy.ui.bios.empty')) + '</p>';
    bios.slice().reverse().forEach(function (b, ri) {
      var idx = bios.length - 1 - ri;
      var open = c.ui.bioOpen === idx;
      h += '<div class="lrow"><div class="nm"><button class="linkbtn" data-act="bioOpen" data-v="' + idx + '">' +
        c.esc(c.t('codex.bio.head', { name: b.name, life: b.life })) + '</button> <span class="hint">' +
        c.esc(c.t('legacy.ui.bio.source.' + (b.source || 'local'))) + '</span></div>' +
        (open ? '<div class="biobox"><div class="meta" style="white-space:pre-wrap">' + c.esc(b.text) + '</div></div>' : '') +
        '</div>';
    });
    c.$('tab-legacy').innerHTML = h;
  }

  /* ── 动作分支（原内核分派处 3957~4018 那五条，随本族搬入）── */
  function actAscend(c) {
    /* 承继择定前置（轮回卷 §3.4）：飞升大劫掷判前先问「带哪件真灵下世」，
     * 择定落 meta.heirChoice → 由 finishRebirth 消费；败劫不入转世，择定留在本世（再叩天门不重问）。 */
    askHeirChoice(c, function () {
      c.ask(c.t('legacy.ui.feisheng'), c.t('legacy.ui.feisheng.confirm'), async function () {
        var c2 = c.fresh();
        var rA = await SQ.Actions.ascend(c2.s);
        if (rA && rA.ok && rA.success) {
          c2.toast(c2.t('legacy.ui.settle.title') + ' · ' + c2.t('legacy.ui.settle.gain', { n: SQ.fmt((rA.preview || {}).total || 0) }));
          /* N61（第册十二批）：飞升这条终局也演盖棺之传。取证点 = 飞升路上**没有**独占奖励全屏演出
           * （`showExclusive` 的三个调用点都在奇遇结算支路），故不与 `#excl-stage` 争屏；
           * 由 verify-ui-life F2 量几何（rect 高 > 0 且 excl-stage 隐藏）坐实这句。 */
          c2.enterRebirth();
          c2.playRecap();
        } else if (rA && rA.ok) {
          c2.toast(c2.t('legacy.log.feisheng.fail'));
        } else if (rA) {
          c2.toast(legacyReasonText(c2, rA));
        }
        c2.renderAll();
      });
    });
  }
  function actDissolve(c) {
    askHeirChoice(c, function () {
      var c2 = c.fresh();
      var pvD = SQ.Legacy.preview(c2.w, c2.s.meta, c2.p, c2.d, 'bingjie', Date.now());
      /* §5.2 结算浮层分项行：兵解二次确认前可见将损失多少（预估预览与实结同源同组件） */
      c2.ask(c2.t('legacy.ui.bingjie.btn'),
        c2.t('legacy.ui.bingjie.confirm') + '\n' + settlePreviewText(c2, pvD),
        async function () {
          var c3 = c.fresh();
          var rB = await SQ.Actions.dissolve(c3.s);
          if (rB && rB.ok) {
            c3.toast(c3.t('legacy.ui.settle.title') + ' · ' + c3.t('legacy.ui.settle.gain', { n: SQ.fmt((rB.preview || {}).total || 0) }));
            /* 盖棺之传（第册批立、N61 归口）：先 `c.enterRebirth()` 再 `c.playRecap()`（顺序不能反，见内核那件头注） */
            c3.enterRebirth();
            c3.playRecap();
          }
          c3.renderAll();
        });
    });
  }
  function actBuy(c, v) {
    var itBuy = SQ.Legacy.itemById(c.d, v);
    if (!itBuy) return;
    /* 永久资格一次确认（不逐世扣、但一次扣到底不退款 ⇒ CONFIRM 纪律与创角赠礼消耗确认同级） */
    c.ask(c.t('legacy.ui.buy'), c.t('legacy.ui.confirmBuy', { n: itBuy.price, name: c.t(itBuy.nameKey) }), async function () {
      var c2 = c.fresh();
      var rBuy = await SQ.Actions.legacyBuy(c2.s, v);
      if (rBuy && rBuy.ok) c2.toast(c2.t('legacy.log.buy', { name: c2.t(rBuy.item.nameKey) }));
      else if (rBuy && rBuy.reason === 'dup') c2.toast(c2.t('legacy.ui.owned'));
      else if (rBuy && rBuy.reason === 'poor') c2.toast(c2.t('legacy.ui.poor'));
      else if (rBuy && rBuy.reason === 'swapfull') c2.toast(c2.t('legacy.ui.buy.swapfull'));
      /* 其余因（'unknown' = 名录与商店两张表背离）原为**静默无提示** ⇒ 点了没反应，
       * 属「失败不告警」缺陷：一律给一句中文，绝不静默、也绝不裸英文 */
      else if (rBuy) c2.toast(c2.t('legacy.ui.buy.fail'));
      c2.renderAll();
    });
  }
  function actHeirPick(c, v) { commitHeirChoice(c, v); }
  function actHeirSwitch(c) { openHeirSwitch(c); }

  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.legacy = {
    render: renderLegacy,
    commitHeir: commitHeirChoice,
    actAscend: actAscend,
    actDissolve: actDissolve,
    actBuy: actBuy,
    actHeirPick: actHeirPick,
    actHeirSwitch: actHeirSwitch
  };
})();
