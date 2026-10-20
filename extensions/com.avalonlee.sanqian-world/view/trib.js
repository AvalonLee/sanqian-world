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
  /* 环周长 = 2πr（r = 42） */
  var TRIB_ARC_C = 264;

  /* 劫前成算/损失快照（F7 复盘行）：写进 ui.tribSnap，演出与结算后复用 */
  function snap(c) {
    try {
      var w = c.w, p = c.p, d = c.d, m = c.mods;
      var ti = p.worldSystems.tribInfo(w, p, d, m);
      var loss = p.worldSystems.tribLoss(w, p, d, m);
      c.ui.tribSnap = ti ? {
        p: Math.round(ti.p * 100), loss: Math.round(loss * 100),
        /* 护法叙事三态素材（B6）：道号 / 道侣形态名（护法恰为道侣时）/ 魔道独行 */
        guardNpc: ti.parts.guardianNpc || null, guardBonus: ti.parts.guardian || 0,
        evil: p.worldSystems.tierOf(w) === 'evil',
        spouseForm: (w.spouse && ti.parts.guardianNpc === w.spouse.npcId) ? w.spouse.form : null
      } : null;
    } catch (e) { c.ui.tribSnap = null; }
  }

  /* 环 = 成算（0~100%），胜主色 / 败警戒色 */
  function arc(c, p, color) {
    var el = c.$('trib-arc');
    if (!el) return;
    el.style.stroke = color;
    el.style.strokeDashoffset = String(TRIB_ARC_C * (1 - Math.max(0, Math.min(100, p)) / 100));
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
    return '<div class="tr' + (tone ? ' ' + tone : '') + '"><span>' + c.esc(label) + '</span><b>' + c.esc(value) + '</b></div>';
  }

  /* 呈报（渡劫演出重做批）：主题感知卡片 + 成算环蓄势 → 结果帧数据行 */
  function show(c) {
    var w = c.w;
    var win = w.tribulation.lastResult === 'success';
    var snap0 = c.ui.tribSnap;
    var box = c.$('trib-box');
    var p = snap0 ? snap0.p : 0;
    box.className = 'trib-card charging';
    if (tribPhaseTimer) { clearTimeout(tribPhaseTimer); tribPhaseTimer = null; }
    stage(c, 0);
    /* 悬念帧：环自 0 蓄势到成算（reduced-motion 直落） */
    var a = c.$('trib-arc');
    a.style.transition = 'none';
    a.style.stroke = 'var(--primary)';
    a.style.strokeDashoffset = String(TRIB_ARC_C);
    c.$('trib-ring-p').textContent = snap0 ? String(p) : '--';
    c.$('trib-t1').textContent = c.t('trib.suspense');
    c.$('trib-t2').textContent = c.t('trib.attempts', { n: w.tribulation.attempts });
    c.$('trib-rows').innerHTML = '';
    c.$('trib-guard').classList.add('hide');
    c.$('trib-skip').classList.add('hide');
    tribUnlocked = false;
    c.$('trib-stage').classList.remove('hide');
    var charge = function () { a.style.transition = ''; arc(c, p, 'var(--primary)'); };
    if (c.reducedMotion()) charge(); else requestAnimationFrame(charge);
    function reveal() {
      box.className = 'trib-card ' + (win ? 'win' : 'lose');
      stage(c, 2);
      arc(c, p, win ? 'var(--primary)' : 'var(--bad)');
      c.$('trib-t1').textContent = win ? c.t('trib.result.win') : c.t('trib.result.lose');
      c.$('trib-t2').textContent = win
        ? c.t('tribulation.success', { realm: c.t('realm.' + w.realm) }) + ' · ' + c.t('tribulation.reset')
        : c.t('tribulation.reset');
      /* 数据行：成算 / [败] 修为损失 / 渡劫次数 / 护法加项 */
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
      c.$('trib-skip').textContent = c.t('trib.skip');
      c.$('trib-skip').classList.remove('hide');
      tribUnlocked = true;
    }
    if (c.reducedMotion()) reveal();
    else {
      /* 落雷段 = 悬念帧中段亮灯（600ms 起），定数段接在 1000ms 的揭盅帧 */
      tribPhaseTimer = setTimeout(function () { stage(c, 1); }, 600);
      setTimeout(reveal, 1000);
    }
    if (tribTimer) clearTimeout(tribTimer);
    /* 悬念 1s（不可跳）+ 结果帧 2s 自动关（交互说明 §4.9）；reduced-motion 直出后同样 2s */
    tribTimer = setTimeout(function () { if (tribUnlocked) hide(c); }, c.reducedMotion() ? 2000 : 3000);
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
