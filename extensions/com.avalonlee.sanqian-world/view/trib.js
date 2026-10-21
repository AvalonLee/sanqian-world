/* 渡劫演出族（第册五十八批 2026-10-19 从 view/index.html 整片搬出 · N34 第二十刀 · 阶段 A1）
 * 范围 = 成算快照 `snap` + 呈报演出 `show` / `skip`（原 `snapTrib` / `showTrib` / `hideTrib`；
 *        `hide` 只被件内调用，不导出）。
 *
 * 留在内核的两件，各按「属于哪套机器」判：
 *   ① `reducedMotion()` —— 内核十几处与件内多处共用的可访问性判定，属公共助手（桥位 `reducedMotion`），不随本族走；
 *   ② `$('trib-stage')` 的点击监听 —— 外置件一律不绑监听（既有纪律），监听体只留一行转发 `SQ.UI.trib.skip(ctx())`。
 *
 * 两枚私有量随本族搬入：`tribTimer`（结果帧自动关的 setTimeout）与 `tribUnlocked`（悬念 1s 不可跳的闸）。
 * 二者只服务本族、别处零引用 ⇒ 不跨件、不进桥，也就没有「值传即快照」的重绑风险（工程规范 §4.55 R1）。
 * 桥 = `ctx()` 递进来的那一枚 `c`；本刀**零新增桥键**，只用 `$` / `t` / `esc` / `ui` / `w` / `p` / `d` /
 * `mods` / `reducedMotion`，全部在册（D7 逐键对账）。
 * ⚠️ 悬念帧那 1s 不可跳：`tribUnlocked` 置 true 只发生在 `reveal()` 里，`skip` 必须先判它。
 * ⚠️ 件内互调一律带桥（D13 判实数 = 形数）：`arc(c, p, color)` / `row(c, label, value, tone)`，
 *    `tone` 缺省时显式传 `null`（原内核版靠位置省略拿 `undefined`，D13 首跑就是照这个形状红的）。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 三枚私有量（原为内核闭包 var，随本族搬入） */
  var tribTimer = null;
  var tribPhaseTimer = null;
  var tribUnlocked = false;

  /* 劫前成算/损失快照（F7 复盘行）：写进 ui.tribSnap，演出与结算后复用 */
  function snap(c) {
    try {
      var w = c.w, p = c.p, d = c.d, m = c.mods;
      var ti = p.worldSystems.tribInfo(w, p, d, m);
      var loss = p.worldSystems.tribLoss(w, p, d, m);
      var g = SQ.Bonds.guardianOf(w, p, d);
      c.ui.tribSnap = ti ? {
        p: Math.round(ti.p * 100), loss: Math.round(loss * 100),
        /* B16-u：清算账单直接读引擎 parts（七项加数 + 合计），视图不重算一项 */
        parts: ti.parts,
        powerCur: Math.round(SQ.Mods.powerOf(w, p, d, m)),
        powerNeed: d.REALMS[w.realm] ? d.REALMS[w.realm].power : 0,
        karma: w.karma || 0,
        /* 护法叙事三态素材（B6）：道号 / 档位 / 道侣形态名（护法恰为道侣时）/ 魔道独行 */
        guardNpc: ti.parts.guardianNpc || null, guardBonus: ti.parts.guardian || 0,
        guardTier: g ? g.tier : 0,
        evil: p.worldSystems.tierOf(w) === 'evil',
        spouseForm: (w.spouse && ti.parts.guardianNpc === w.spouse.npcId) ? w.spouse.form : null
      } : null;
    } catch (e) { c.ui.tribSnap = null; }
  }

  /* 账单一行：label（可带小注）+ 右对齐百分比；0 显示破折号，不编「+0%」 */
  function billRow(c, label, v, em) {
    var n = Math.round((v || 0) * 100);
    var txt = n === 0 ? '—' : (n > 0 ? '+' + n + '%' : n + '%');
    return '<li><span>' + c.esc(label) + (em ? '<em>' + c.esc(em) + '</em>' : '') +
      '</span><b class="' + (n > 0 ? 'up' : (n < 0 ? 'minus' : 'zero')) + '">' + c.esc(txt) + '</b></li>';
  }

  /* UI v2 B11：清算 → 落雷 → 定数三段标（纯呈现；落雷段沿用悬念帧，不新增判定） */
  function stage(c, n) {
    var st = c.$('trib-steps');
    if (!st) return;
    if (st.children[0] && !st.children[0].textContent) {
      st.children[0].textContent = c.t('trib.stage.clear');
      st.children[1].textContent = c.t('trib.stage.thunder');
      st.children[2].textContent = c.t('trib.stage.fate');
    }
    Array.prototype.forEach.call(st.children, function (el, i) {
      el.className = i === n ? 'on' : (i < n ? 'done' : '');
    });
  }
  function row(c, label, value, tone) {
    return '<li class="tr' + (tone ? ' ' + tone : '') + '"><span>' + c.esc(label) + '</span><b>' + c.esc(value) + '</b></li>';
  }

  /* 呈报（B16-u · 设计稿 §渡劫演出）：清算（账单）→ 落雷（云压 + 闪电）→ 定数（印 + 结果行） */
  function show(c) {
    var w = c.w;
    var win = w.tribulation.lastResult === 'success';
    var snap0 = c.ui.tribSnap;
    var box = c.$('trib-box');
    var p = snap0 ? snap0.p : 0;
    var stageEl = c.$('trib-stage');
    box.className = 'trib-body charging';
    stageEl.className = 'trib-mask';
    if (tribPhaseTimer) { clearTimeout(tribPhaseTimer); tribPhaseTimer = null; }
    if (tribTimer) { clearTimeout(tribTimer); tribTimer = null; }
    stage(c, 0);
    /* 段一 · 清算：境界跃迁 + 成算大数 + 七项账单（全读 tribInfo.parts） */
    var dateD = SQ.gameDateStr(c.s.profile, w, Date.now(), c.s.profile.worldId) || '';
    c.$('trib-date').textContent = dateD;
    var rn = w.realm, nn = Math.min(rn + 1, c.d.REALMS.length - 1);
    c.$('trib-from').textContent = c.t('realm.' + rn);
    c.$('trib-to').textContent = c.t('realm.' + nn);
    c.$('trib-ring-p').textContent = snap0 ? String(p) : '--';
    c.$('trib-plab').textContent = c.t('trib.bill.pct');
    var bill = '';
    if (snap0 && snap0.parts) {
      var ps = snap0.parts;
      bill += billRow(c, c.t('tribulation.base'), ps.base, '');
      bill += billRow(c, c.t('tribulation.resist'), ps.resist, '');
      bill += billRow(c, c.t('tribulation.power'), ps.power,
        SQ.fmt(snap0.powerCur) + ' / ' + SQ.fmt(snap0.powerNeed));
      bill += billRow(c, c.t('tribulation.talent'), ps.talent, '');
      bill += billRow(c, c.t('tribulation.karma'), ps.karma,
        (snap0.karma > 0 ? '+' : '') + snap0.karma);
      bill += billRow(c, c.t('tribulation.alignFlat'), ps.alignFlat, '');
      bill += billRow(c, c.t('tribulation.guardian'), ps.guardian,
        snap0.guardNpc && snap0.guardBonus > 0
          ? c.t('bond.' + snap0.guardNpc + '.name') + ' · ' + c.bondTier(snap0.guardTier)
          : '');
    }
    bill += '<li class="t-sum"><span>' + c.esc(c.t('trib.bill.pct')) + '</span><b>' + (snap0 ? p : '--') + '%</b></li>';
    c.$('trib-bill').innerHTML = bill;
    c.$('trib-clear').hidden = false;
    c.$('trib-verdict').hidden = true;
    c.$('trib-rows').innerHTML = '';
    c.$('trib-guard').classList.add('hide');
    c.$('trib-skip').classList.add('hide');
    c.$('trib-skip').textContent = c.t('trib.skip');
    tribUnlocked = false;
    stageEl.classList.remove('hide');

    function reveal() {
      /* 段三 · 定数 */
      c.$('trib-clear').hidden = true;
      c.$('trib-verdict').hidden = false;
      stageEl.className = 'trib-mask striking' + (win ? ' ok' : ' bad');
      box.className = 'trib-body ' + (win ? 'win' : 'lose');
      stage(c, 2);
      c.$('trib-mark').textContent = c.t(win ? 'trib.mark.win' : 'trib.mark.lose');
      c.$('trib-v').className = 't-verdict' + (win ? '' : ' bad');
      c.$('trib-t1').textContent = win ? c.t('trib.result.win') : c.t('trib.result.lose');
      c.$('trib-t2').textContent = win
        ? c.t('tribulation.success', { realm: c.t('realm.' + w.realm) }) + ' · ' + c.t('tribulation.reset')
        : c.t('tribulation.reset');
      /* 结果行：成算 / [败] 修为损失 / 渡劫次数 / 护法加项 */
      var rows = '';
      if (snap0) rows += row(c, c.t('trib.row.p'), p + '%', 'hot');
      if (!win && snap0) rows += row(c, c.t('trib.row.loss'), snap0.loss + '%', 'bad');
      rows += row(c, c.t('trib.row.n'), c.t('trib.attempts', { n: w.tribulation.attempts }), null);
      if (snap0) rows += snap0.guardBonus > 0
        ? row(c, c.t('tribulation.guardian'), '+' + snap0.guardBonus.toFixed(2), 'hot')
        : row(c, c.t('tribulation.guardian'), c.t('tribulation.guardian.none'), null);
      c.$('trib-rows').innerHTML = rows;
      /* 护法叙事行（B6 · 帧四）：成功三态（道号+加项 / 道侣形态名 / 魔道独行） */
      var tg = c.$('trib-guard');
      if (win && snap0 && snap0.guardNpc && snap0.guardBonus > 0) {
        tg.textContent = snap0.spouseForm
          ? c.t('tribulation.guardianSpouse', { name: c.t('bond.' + snap0.guardNpc + '.name'), form: c.t('bond.spouse.form.' + snap0.spouseForm) })
          : c.t('tribulation.guardianLine', { name: c.t('bond.' + snap0.guardNpc + '.name') });
        tg.classList.remove('hide');
      } else if (win && snap0 && snap0.evil) {
        tg.textContent = c.t('tribulation.guardianNone');
        tg.classList.remove('hide');
      }
      c.$('trib-skip').classList.remove('hide');
      tribUnlocked = true;
      /* 读数给足：揭盅后 2.6s 自动关；reduced-motion 同样直出 */
      tribTimer = setTimeout(function () { if (tribUnlocked) hide(c); }, 2600);
    }
    if (c.reducedMotion()) reveal();
    else {
      /* 清算 0.8s → 落雷（云压 + 闪电）→ 1.7s 揭盅 */
      tribPhaseTimer = setTimeout(function () {
        stage(c, 1);
        stageEl.classList.add('striking');
      }, 800);
      setTimeout(reveal, 1700);
    }
  }

  function hide(c) {
    c.$('trib-stage').classList.add('hide');
    if (tribTimer) { clearTimeout(tribTimer); tribTimer = null; }
    if (tribPhaseTimer) { clearTimeout(tribPhaseTimer); tribPhaseTimer = null; }
  }

  /* 点按跳过：悬念帧 1s 未揭盅时点不动（F7） */
  function skip(c) { if (tribUnlocked) hide(c); }

  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释。
   * `hide` 只被本件 `show`/`skip` 调用 ⇒ 不导出（D14 首跑即抓「导出没人引用」的死面）。 */
  SQ.UI.trib = {
    snap: snap,
    show: show,
    skip: skip
  };
})();
