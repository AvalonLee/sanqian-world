/* G14 侣柱 · 道友族（引擎卷 §3.2 / UI 卷 §3.4c ‖ 第册四十八批 2026-10-19 从 view/index.html 整片搬出 · N34 第十二刀）
 * 范围 = 名录渲染族（`render` 含区内 `palCell`）+ 详情五段式（`detail`）+ 好感三渠道视图件
 * （`bondActSection` / `visitBtn` / `visitGainOf` / `giftablePills` / `pillGiftGain` / `renderBondUnknown` /`bondFailText`）
 * + 择选与提亲浮层（`openGuardPick` / `openSpousePick` / `openPropose` / `showSpouse` 及其收口）+ 六条动作分支。
 *
 * 留在内核的五件，各按「动作属于哪套机器」判：
 *   桥位 `bondTier`（内核 t 包装，13 处引用、已供 faction.js）‖ 桥位 `timeLeft`（19 处引用的通用时差文案）
 *   ‖ 侣 chip 红点签名走桥位 `bondDotSig`（`renderTabbar` 的机器，与「地」「成就」两枚签名同族，三者都留内核）
 *   ‖ 六个 DOM 监听（外置件一律不绑监听 = 既有纪律，监听体只留一行转发）。
 * 桥 = `ctx()` 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；本刀**新增两枚**：`toastAction`（拜访/赠丹/赎回的成功提示）
 * 与 `reducedMotion`（结契轻演出的时长分支）。
 * ⚠️ 形参改名的那族：本族的「道友对象」原本就叫 `c`（`palCell(c, w, d)` / `perkValueRaw(c, tier)` / `SQ.Bonds.byId` 的返回），
 * 与外置件桥位 `c` 撞名 ⇒ 一律改称 `ch`（在册硬口径「外置件不许拿 c 当回调形参」的同一件事）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 提亲 CONFIRM 的目标：会话内状态（原为内核闭包 var，随本族搬入） */
  var proposeTarget = null;
  /* 结契轻演出的收口定时器：同上 */
  var spouseStageTimer = null;

  function nextBondThreshold(c, tier) {
    var ts = c.d.BOND_TIERS;
    return tier >= ts.length ? (c.d.BOND_MAX || 100) : ts[tier];
  }
  function maxBondTier(c) { return c.d.BOND_TIERS.length; }

  /* 个体助力当前值文案：channel 型各自单位（判定 pp / 冥佑描述），field 与其余走百分比 */
  function perkValueRaw(c, ch, tier) {
    var pk = ch.perk || {};
    var v = pk.perTier != null ? pk.perTier * tier : 0;
    if (pk.channel === 'checkPp') return '+' + (Math.round(v * 1000) / 10) + 'pp';
    if (pk.channel === 'shield') return c.t('bond.perk.shieldval');
    return (v < 0 ? '−' : '+') + c.pct(Math.abs(v));
  }
  function perkValueText(c, ch, tier) {
    var pk = ch.perk || {};
    if (pk.channel === 'shield') return c.t('bond.perk.shieldval');
    var vm = pk.perTier != null ? pk.perTier * maxBondTier(c) : 0;
    var maxTxt = pk.channel === 'checkPp' ? '+' + (Math.round(vm * 1000) / 10) + 'pp' : (vm < 0 ? '−' : '+') + c.pct(Math.abs(vm));
    return c.t('bond.perk.cur', { v: perkValueRaw(c, ch, tier), n: c.bondTier(tier), max: maxTxt });
  }
  function palCell(c, ch, w, d) {
    var p = c.p;
    var tier = SQ.Bonds.tierOf(w, ch.id, d);
    var aff = Math.max(0, SQ.Bonds.affinityOf(w, ch.id));
    var g = SQ.Bonds.guardianOf(w, p, d);
    var isGuard = !!(g && g.npcId === ch.id && g.bonus > 0);
    var isSpouse = !!(w.spouse && w.spouse.npcId === ch.id);
    if (SQ.Bonds.locked(w, ch.id)) {
      /* 缘尽格：身份永不揭示（稿一批注）——赎回成功才揭名，故 data-v 只作动作载荷不进可见文本。
       * 可赎者（未赎过 + 遗泽足）挂「赎」角标提示可点；不可赎者点按出原因 toast + 轻震。 */
      var costR = (d.BOND_REDEEM_COST != null ? d.BOND_REDEEM_COST : 30);
      var doneR = (w.redeemedIds || []).indexOf(ch.id) >= 0;
      var canR = !doneR && ((c.s.meta && c.s.meta.karma) || 0) >= costR;
      return '<div class="pal dead" data-act="bondDead" data-v="' + ch.id + '">' +
        (canR ? '<span class="pcorner rd">' + c.esc(c.t('bond.redeem.badge')) + '</span>' : '') +
        '<div class="ava">' + c.esc(c.t('bond.deadava')) + '</div>' +
        '<div class="nm">' + c.esc(c.t('event.codex.unknown')) + '</div>' +
        '<div class="deadtag">' + c.esc(c.t('bond.locked')) + '</div></div>';
    }
    /* 候选「双」角标无论结缘与否都挂（收集牵引：有一位可结道侣的人藏在？） */
    var corner = (ch.category === 'spouse' ? '<span class="pcorner sh">' + c.esc(c.t('bond.badge.spouse')) + '</span>' : '') +
      (isGuard ? '<span class="pcorner um"' + (ch.category === 'spouse' ? ' style="right:17px"' : '') + '>☂</span>' : '');
    if (tier < 1) {
      /* 势力批 v2.4 §6：负好感（−20~−2）= 厌恶——剪影格上加红字标签，与「未结缘」区分 */
      var rawAff = SQ.Bonds.affinityOf(w, ch.id);
      var hateTag = (rawAff < 0 && !SQ.Bonds.locked(w, ch.id))
        ? '<div class="tier hate">' + c.esc(c.t('bond.negative') + ' ' + rawAff) + '</div>'
        : '<div class="tier">' + c.esc(c.t('bond.unmet')) + '</div>';
      /* 未识格改为可点开（好感三渠道批）：此前只轻震、无任何出路，结识唯一途径是抽到出身事件；
       * 现点开进「隐匿详情」（renderBondUnknown，身份仍不揭示），内含渠道 A 拜访按钮 = 主动结识口。 */
      return '<div class="pal lock' + (ch.category === 'spouse' ? ' sp' : '') + '" data-act="bondOpen" data-v="' + ch.id + '">' + corner +
        '<div class="ava">' + c.esc(c.t('ui.qmark')) + '</div><div class="nm">' + c.esc(c.t('event.codex.unknown')) + '</div>' +
        hateTag + '</div>';
    }
    var canP = ch.category === 'spouse' && SQ.Bonds.canPropose(w, p, d, ch.id, Date.now()).ok;
    var tierTxt = c.t('bond.' + ch.id + '.title.' + tier) + c.bondTier(tier) +
      (isSpouse && w.spouse.form === 'luding' ? ' · ' + c.t('bond.spouse.form.luding') : '') +
      (canP ? ' · ' + c.t('bond.propose.ready') : '');
    return '<div class="pal' + (ch.category === 'spouse' ? ' sp' : '') + '" data-act="bondOpen" data-v="' + ch.id + '">' + corner +
      '<div class="ava">' + c.esc(c.t('bond.' + ch.id + '.ava')) + '</div>' +
      '<div class="nm">' + c.esc(c.t('bond.' + ch.id + '.name')) + '</div>' +
      '<div class="tier"' + (isSpouse && w.spouse.form === 'luding' ? ' style="color:var(--bad)"' : '') + '>' + c.esc(tierTxt) + '</div>' +
      '<div class="pb"><i style="width:' + Math.min(100, aff) + '%;' + (isSpouse && w.spouse.form === 'luding' ? 'background:var(--bad)' : '') + '"></i></div>' +
      '<div class="fv">' + c.esc(tier >= maxBondTier(c) ? c.t('bond.fv.max', { n: aff }) : c.t('bond.fv.next', { n: aff, next: nextBondThreshold(c, tier) })) + '</div></div>';
  }

  /* 道友名录：浮层（open）与「道友」页（势力批 v2.4 §9）共用同一套渲染；
   * dest = 'tab' 渲染进 #tab-bonds，缺省 = 浮层 #mbd-body。 */
  function renderBonds(c, dest) {
    /* dest = 「用户最后打开的是哪一个容器」，只由用户动作改写：`renderTab()` 的秒级 tick 也带 'tab'
     * 走进这里，若让它顺手改写 ui.bondsDest，**浮层开着时容器就被偷换成 'tab'** ⇒ 拜访 / 赠丹成功后
     * 重渲渲到背后的道友页上，屏上那颗按钮停在旧态（第十九批 · 用户报「点完还亮着，关掉重开才显冷却」）。
     * 浮层可见期间不夺。 */
    if (dest && (dest !== 'tab' || c.$('modal-bonds').classList.contains('hide'))) c.ui.bondsDest = dest;
    /* 容器由**本次调用的 dest** 决定，不由归属决定：否则 tick 带着 'tab' 进来时，
     * 归属被守住（仍 = 'modal'）却把名录渲进浮层里，等于把 bug 换了个方向（走查 A4 即此形）*/
    var isTab = (dest || c.ui.bondsDest) === 'tab';
    var w = c.w, p = c.p, d = c.d;
    var g = SQ.Bonds.guardianOf(w, p, d);
    var evil = p.worldSystems.tierOf(w) === 'evil';
    if (!isTab) {
      c.$('mbd-title').textContent = c.ui.bondDetail ? c.t('bond.detail.back') : c.t('bond.title');
      c.$('mbd-title').style.cursor = c.ui.bondDetail ? 'pointer' : '';
      c.$('mbd-close').textContent = c.t('ui.close');
    }
    /* 详情五段式只属于名录浮层（浮层走查修复）：道友页自身永远保持名录——
     * 否则秒级 tick 的 renderBonds('tab') 会因共享的 ui.bondDetail 把背后的道友页一并切成详情 */
    if (!isTab && c.ui.bondDetail) { renderBondDetail(c); return; }
    var h = '';
    /* 护法位摘要行三态（稿一/稿四）：魔道整块置灰独行 / 生效带加项 / 档不足或无人。
     * 择选批：非魔道三态均可点开「择护法」浮层，由玩家自选在任护法 */
    var top = '';
    /* 两张位卡（B15-f · 设计稿 .slots2 / .bondslot）：护法位 / 道侣位。
     * 交互锚点不变：整卡挂 data-act（guardPickOpen / spousePickOpen），择选浮层与既有行为零改。 */
    var gOK = !evil && g && g.bonus > 0;
    var gName = (g && !evil) ? c.t('bond.' + g.npcId + '.name') : c.t('bond.guard.none');
    var gDesc, gX;
    if (evil) {
      gDesc = c.t('bond.guard.evil'); gX = '';
    } else if (g) {
      gDesc = c.t('bond.' + g.npcId + '.title.' + g.tier) + ' ' + c.bondTier(g.tier);
      gX = (gOK ? c.t('bond.guard.eff', { b: g.bonus.toFixed(2) }) : c.t('bond.guard.low')) + ' · ' + c.t('bond.guard.swap');
    } else {
      gDesc = c.t('bond.guard.low'); gX = c.t('bond.guard.swap');
    }
    top += '<div class="bondslot' + (gOK ? ' filled' : ' empty') + '" data-act="guardPickOpen">' +
      '<div class="bs-k">' + c.esc(c.t('bond.guard.tag')) + '</div>' +
      '<div class="bs-v">' + c.esc(gName) + '</div>' +
      '<div class="bs-d">' + c.esc(gDesc) + '</div>' +
      (gX ? '<div class="bs-x">' + c.esc(gX) + '</div>' : '') + '</div>';
    if (w.spouse) {
      var sf = w.spouse.form;
      top += '<div class="bondslot filled' + (sf === 'luding' ? ' luding' : '') + '" data-act="spousePickOpen">' +
        '<div class="bs-k">' + c.esc(c.t('bond.sec.spouse')) + '</div>' +
        '<div class="bs-v">' + c.esc(c.t('bond.' + w.spouse.npcId + '.name')) + '</div>' +
        '<div class="bs-d">' + c.esc(c.t('bond.spouse.form.' + sf)) + ' · ' +
        c.esc(c.t('bond.form.eff.' + sf).split(' · ')[0]) + '</div>' +
        '<div class="bs-x' + (sf === 'luding' ? ' bad' : '') + '">' +
        c.esc(sf === 'luding' ? c.t('bond.spouse.luding.warn') : c.t('bond.spouse.cand')) + '</div></div>';
    } else {
      top += '<div class="bondslot empty" data-act="spousePickOpen">' +
        '<div class="bs-k">' + c.esc(c.t('bond.sec.spouse')) + '</div>' +
        '<div class="bs-v">' + c.esc(c.t('bond.spouse.none')) + '</div>' +
        '<div class="bs-d">' + c.esc(c.t('bond.spouse.nonetip')) + '</div>' +
        '<div class="bs-x dim">' + c.esc(c.t('bond.spouse.cand')) + '</div></div>';
    }
    h += '<div class="slots2">' + top + '</div>';

    var all = SQ.Bonds.list(p);
    /* 道友页（UI v2 B8）：两卡首屏之后只铺「已结缘 + 缘尽」的行；
     * 未结缘不再铺 55 个问号格，收成一条入口，点开仍是同一份 58 人全名录浮层（能力零删除）。 */
    if (isTab) {
      var met = all.filter(function (x) { return SQ.Bonds.tierOf(w, x.id, d) >= 1; });
      var dead = all.filter(function (x) { return SQ.Bonds.locked(w, x.id); });
      var unmet = all.filter(function (x) { return SQ.Bonds.tierOf(w, x.id, d) < 1 && !SQ.Bonds.locked(w, x.id); });
      /* 顶部切换（第册一百一十九批 · 用户令「参考丹器页顶部，列表太长找起来不方便」）：
       * 与丹房 / 器台同一套 `.seg2` 组件、同样只存视图态（ui.bondsTab，不落盘）。
       * 切到哪一族，「已结缘 / 缘尽 / 未结识入口」三段就都只算那一族——不是只切列表那一段，
       * 否则缘尽与入口还留在另一族的数字上，读起来对不上账。 */
      var bTab = c.ui.bondsTab === 'spouse' ? 'spouse' : 'friend';
      var inTab = function (x) { return bTab === 'spouse' ? x.category === 'spouse' : x.category !== 'spouse'; };
      var cntF = all.filter(function (x) { return x.category !== 'spouse'; }).length;
      var cntS = all.length - cntF;
      h += '<div class="seg2">' +
        [['friend', c.t('bond.sec.friend'), cntF], ['spouse', c.t('bond.sec.spousem'), cntS]].map(function (t) {
          return '<button type="button" class="' + (bTab === t[0] ? 'on' : '') + '" data-act="bondsTab" data-v="' + t[0] + '">' +
            c.esc(t[1]) + ' · ' + t[2] + '</button>';
        }).join('') + '</div>';
      met = met.filter(inTab);
      dead = dead.filter(inTab); unmet = unmet.filter(inTab);
      /* 已结缘（第册一百一十七批按族分段的逻辑现在由这一枚切换承接：一个 tab 只剩一族一段，
       * 段标仍写族别名 + 该段行数，空段不留段标）。 */
      if (met.length) {
        h += '<div class="sechead"><span class="t">' + c.esc(bTab === 'spouse' ? c.t('bond.sec.spousem') : c.t('bond.sec.friend')) +
          ' · ' + met.length + '</span><span class="s">' +
          c.esc(c.t('bond.sec.count', { n: met.length, total: all.length })) + '</span></div><div class="browlist">';
        met.forEach(function (ch) { h += bondRow(c, ch, w, d); });
        h += '</div>';
      } else {
        h += '<p class="hint">' + c.esc(c.t('bond.met.none')) + '</p>';
      }
      if (dead.length) {
        h += '<div class="sechead"><span class="t">' + c.esc(c.t('bond.sec.dead')) + ' · ' + dead.length + '</span></div><div class="browlist">';
        dead.forEach(function (ch) { h += bondDeadRow(c, ch, w, d); });
        h += '</div>';
      }
      if (unmet.length) {
        h += '<button type="button" class="lockedline" data-act="openBonds"><span>' +
          c.esc(c.t('bond.unmet.line', { n: unmet.length })) + '</span><span>' + c.esc(c.t('bond.unmet.go')) + '</span></button>';
      }
      c.$('tab-bonds').innerHTML = h;
      return;
    }
    var friends = all.filter(function (x) { return x.category !== 'spouse'; });
    var spouses = all.filter(function (x) { return x.category === 'spouse'; });
    var fKnown = friends.filter(function (x) { return SQ.Bonds.tierOf(w, x.id, d) >= 1; }).length;
    var fDead = friends.filter(function (x) { return SQ.Bonds.locked(w, x.id); }).length;
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('bond.sec.friend')) + ' · ' + friends.length + '</span><span class="s">' +
      c.esc(c.t(fDead ? 'bond.sec.countdead' : 'bond.sec.count', { n: fKnown, total: friends.length, d: fDead })) + '</span></div><div class="palgrid">';
    friends.forEach(function (ch) { h += palCell(c, ch, w, d); });
    h += '</div>';
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('bond.sec.spouse')) + ' · ' + spouses.length + '</span><span class="s">' +
      c.esc(w.spouse ? c.t('bond.sec.spdoing', { n: 1 }) : c.t('bond.sec.sptip')) + '</span></div><div class="palgrid">';
    spouses.forEach(function (ch) { h += palCell(c, ch, w, d); });
    h += '</div>';
    c.$('mbd-body').innerHTML = h;
  }

  /* 已结缘行（UI v2 B8）：头像 / 名号 / 来历与档位 / 好感尺 / 下一档，一行一人 */
  function bondRow(c, ch, w, d) {
    var p = c.p;
    var tier = SQ.Bonds.tierOf(w, ch.id, d);
    var aff = Math.max(0, SQ.Bonds.affinityOf(w, ch.id));
    var g = SQ.Bonds.guardianOf(w, p, d);
    var isGuard = !!(g && g.npcId === ch.id && g.bonus > 0);
    var isSpouse = !!(w.spouse && w.spouse.npcId === ch.id);
    var canP = ch.category === 'spouse' && SQ.Bonds.canPropose(w, p, d, ch.id, Date.now()).ok;
    var tierTxt = c.t('bond.' + ch.id + '.title.' + tier) + c.bondTier(tier) +
      (isSpouse && w.spouse.form === 'luding' ? ' · ' + c.t('bond.spouse.form.luding') : '') +
      (canP ? ' · ' + c.t('bond.propose.ready') : '');
    return '<button type="button" class="brow' + (ch.category === 'spouse' ? ' sp' : '') + '" data-act="bondOpen" data-v="' + ch.id + '">' +
      '<span class="br-av">' + c.esc(c.t('bond.' + ch.id + '.ava')) + '</span>' +
      '<span class="br-b"><b>' + c.esc(c.t('bond.' + ch.id + '.name')) +
      (isSpouse ? ' ♡' : (isGuard ? ' ☂' : '')) +
      /* 名号后直接写族别（第册一百一十七批）：段已经分开了，行内仍要一枚能读的标——
       *  scrolled 到列表中间时只剩一行字，段标早已滚出屏幕。 */
      (isSpouse ? ' <span class="tierbadge t1">' + c.esc(c.t('bond.sec.spousem')) + '</span>'
        : (ch.category === 'spouse' ? ' <span class="tierbadge t2">' + c.esc(c.t('bond.propose.ready')) + '</span>' : '')) +
      '</b>' +
      '<span class="br-d">' + c.esc(c.t('bond.' + ch.id + '.kind')) + ' · ' + c.esc(tierTxt) + '</span></span>' +
      '<span class="br-r"><span class="pb"><i style="width:' + Math.min(100, aff) + '%"></i></span>' +
      '<span class="br-t">' + c.esc(tier >= maxBondTier(c) ? c.t('bond.fv.max', { n: aff }) : c.t('bond.fv.next', { n: aff, next: nextBondThreshold(c, tier) })) + '</span></span></button>';
  }
  /* 缘尽行：身份永不揭示（与名录格同口径），可赎者挂「赎」角标 */
  function bondDeadRow(c, ch, w, d) {
    var costR = (d.BOND_REDEEM_COST != null ? d.BOND_REDEEM_COST : 30);
    var doneR = (w.redeemedIds || []).indexOf(ch.id) >= 0;
    var canR = !doneR && ((c.s.meta && c.s.meta.karma) || 0) >= costR;
    return '<button type="button" class="brow dead" data-act="bondDead" data-v="' + ch.id + '">' +
      '<span class="br-av">' + c.esc(c.t('bond.deadava')) + '</span>' +
      '<span class="br-b"><b>' + c.esc(c.t('event.codex.unknown')) + '</b>' +
      '<span class="br-d">' + c.esc(c.t('bond.locked')) + '</span></span>' +
      (canR ? '<span class="br-go">' + c.esc(c.t('bond.redeem.badge')) + '</span>' : '') + '</button>';
  }

  /* 格位详情五段式（B3 · 稿二）：头部 / 好感进度尺四档刻度 / 个体助力 / 小传正典 / 出身事件或结缘条件 */
  function renderBondDetail(c) {
    var w = c.w, p = c.p, d = c.d;
    var id = c.ui.bondDetail;
    var ch = SQ.Bonds.byId(p, id);
    if (!ch) { c.ui.bondDetail = null; renderBonds(c, 'modal'); return; }
    var tier = SQ.Bonds.tierOf(w, id, d);
    var rawAff = SQ.Bonds.affinityOf(w, id);
    var hate = rawAff < 0 && !SQ.Bonds.locked(w, id);
    var aff = Math.max(0, rawAff);
    var g = SQ.Bonds.guardianOf(w, p, d);
    var isGuard = !!(g && g.npcId === id && g.bonus > 0);
    var isSpouse = !!(w.spouse && w.spouse.npcId === id);
    var luOff = isSpouse && w.spouse.form === 'luding';
    /* 未识（含厌恶 −20~−2）→ 隐匿详情：身份不揭示（沿用名录格「？」口径），只给渠道 A 一条主动结识口。
     * 缘尽格（−99）不走此支——它由 palCell 的 bondDead 承接赎回，身份「赎回成功才揭名」。 */
    if (tier < 1 && !SQ.Bonds.locked(w, id)) { renderBondUnknown(c, id, rawAff); return; }
    var h = '<div class="bd-head' + (ch.category === 'spouse' ? ' sp' : '') + '">' +
      '<div class="ava">' + c.esc(c.t('bond.' + id + '.ava')) + '</div><div class="id"><b>' + c.esc(c.t('bond.' + id + '.name')) +
      (isGuard ? ' <span class="gmark">☂ ' + c.esc(c.t('bond.guard.tag')) + '</span>' : '') + '</b>' +
      '<div class="sub">' + c.esc(c.t('bond.' + id + '.kind')) + ' · ' +
      c.esc(c.t('bond.' + id + '.title.' + Math.max(1, tier))) + ' ' + c.bondTier(Math.max(1, tier)) + '<br>' +
      c.esc(tier >= maxBondTier(c) ? c.t('bond.perk.maxed')
        : c.t('bond.perk.active', { title: c.t('bond.' + id + '.title.' + Math.min(maxBondTier(c), tier + 1)), n: Math.max(0, nextBondThreshold(c, tier) - aff) })) +
      '</div></div></div>';
    h += '<div class="fbar"><div class="lab"><span>' + c.esc(c.t('bond.fav.label')) + '</span><b>' +
      c.esc(hate ? c.t('bond.negative') + ' ' + rawAff : String(aff)) + ' / ' + (d.BOND_MAX || 100) + '</b></div>' +
      '<div class="tr"><i style="width:' + Math.min(100, aff) + '%"></i></div><div class="marks">' +
      (d.BOND_TIERS).map(function (th, i) {
        return '<span>' + c.esc(c.t('bond.' + id + '.title.' + (i + 1))) + ' ' + th + '</span>';
      }).join('') + '</div></div>';
    /* 往来（好感三渠道批 · UI 卷 §3.4c）：置于好感尺之后、个体助力之前——它改的正是上面那根尺 */
    h += bondActSection(c, id);
    /* 个体助力：炉鼎期划断态 + 「鼎炉被采，何暇助你」 */
    h += '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.perk')) + '</div>' +
      '<div class="perk' + (luOff ? ' off' : '') + '"><span>' + c.esc(c.t('bond.' + id + '.perk')) + ' · ' + c.esc(c.t('bond.' + id + '.perk.desc')) +
      (luOff ? '<span class="why">' + c.esc(c.t('bond.perk.why.luding')) + '</span>' : '') + '</span>' +
      '<span class="pv">' + c.esc(luOff ? c.t('bond.perk.off', { v: perkValueRaw(c, ch, tier) }) : perkValueText(c, ch, tier)) + '</span></div></div>';
    /* 所属势力（势力批 v2.4 §3）：随世界生成动态归属，散人/在册皆明示 */
    var nf = SQ.Factions.npcFactionOf(w, id);
    h += '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.flavor')) + '</div>' +
      '<div class="dd"><span class="facsig' + (nf ? (' fac-' + nf.align) : '') + '">' +
      c.esc(nf ? c.t('faction.bond.line', { name: nf.name, align: c.t('align.' + nf.align) }) : c.t('faction.bond.none')) +
      '</span>' + c.esc(c.t('bond.' + id + '.flavor')) + '</div></div>';
    if (ch.category === 'spouse') {
      /* 候选：出身事件段替换为结缘条件段 + 满档「提亲 ♡」主按钮（稿二批注） */
      h += '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.spousecond')) + '</div><div class="dd">' + c.esc(c.t('bond.spousecond.text')) + '</div>';
      var chk = SQ.Bonds.canPropose(w, p, d, id, Date.now());
      if (isSpouse) {
        h += '<div class="dd" style="color:var(--spouse);margin-top:8px">' + c.esc(c.t('bond.spouse.active', {
          form: c.t('bond.spouse.form.' + w.spouse.form), name: c.t('bond.' + id + '.name'),
          eff: c.t('bond.form.eff.' + w.spouse.form).split(' · ')[0]
        })) + (w.spouse.form === 'luding' ? ' · ' + c.esc(c.t('bond.spouse.luding.warn')) : '') + '</div>';
      } else if (chk.ok) {
        h += '<button class="primary" style="width:100%;margin-top:10px" data-act="proposeOpen" data-v="' + id + '">' + c.esc(c.t('bond.propose.btn')) + '</button>';
      } else {
        var whyKey = 'bond.propose.fail.' + chk.reason;
        var whyVars = chk.reason === 'cooldown' ? { t: c.timeLeft(Math.max(0, (w.spouseCdUntil || 0) - Date.now())) } : {};
        h += '<div class="dd hint" style="margin-top:8px">' + c.esc(c.t(whyKey, whyVars)) + '</div>';
      }
      h += '</div>';
    } else {
      var carEv = (ch.carrierEvents || [])[0];
      if (carEv) {
        var seen = (w.eventHistory.seen || {})[carEv] != null;
        h += '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.origin')) + '</div>' +
          '<div class="srcline"' + (seen ? ' data-act="recallEvent" data-v="' + carEv + '"' : '') + '><span>' +
          c.esc(c.t('bond.origin.via', { ev: seen ? c.t('event.' + carEv + '.name') : c.t('event.codex.unknown') })) + '</span>' +
          (seen ? '<span class="go">' + c.esc(c.t('bond.origin.go')) + '</span>' : '') + '</div></div>';
      }
      if (isGuard && w.guardLog && w.guardLog.count > 0) {
        h += '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.guardlog')) + '</div><div class="dd" style="font-size:11.5px">' +
          c.esc(c.t('bond.guard.record', { n: w.guardLog.count, s: w.guardLog.success })) + '</div></div>';
      }
    }
    if (c.ui.bondsDest === 'tab') c.$('tab-bonds').innerHTML = h;
    else c.$('mbd-body').innerHTML = h;
  }

  /* ── 好感三渠道批（2026-10-06 · 引擎卷 v1.11 §3.2a / UI 卷 §3.4c）──────────────────
   * 渠道 A 拜访论道 + 渠道 B 赠丹 的视图侧：两个纯拼接渲染器 + 三个只读取数助手。
   * 口径纪律：① 按钮上标出的增量 = **引擎会真给的数**（拜访按档位递减 + 同向加成；赠丹按丹方 tier
   * × 丹纹倍率，再对「距满档余量」取 min，绝不显示会被 clamp 吃掉的虚数）；② 未识者的「同道相投」
   * 角标**不显示**（阵营属身份信息，结识后才可见，与「？」剪影口径一致）；③ 双特例丹（破障 / 镇劫）
   * 不进赠丹列表——引擎侧同样拒（reason 'once'），两层同口径。 */
  function visitGainOf(c, id, tier) {
    var w = c.w, p = c.p, d = c.d;
    var tbl = d.BOND_VISIT_BY_TIER || [3, 3, 2, 1, 0];
    var base = tbl[Math.min(Math.max(0, tier), tbl.length - 1)] || 0;
    if (!(base > 0)) return { n: 0, align: false };
    /* 同向加成只对**已相识**生效（引擎同口径）：未识者阵营未揭，不给加成也不显示角标 */
    if (tier < 1) return { n: base, align: false };
    var ch = SQ.Bonds.byId(p, id);
    var kd = (p.worldSystems && p.worldSystems.tierOf) ? p.worldSystems.tierOf(w) : 'neutral';
    var sameDir = !!(ch && ch.align && ch.align === kd);
    return { n: base + (sameDir ? (d.BOND_VISIT_ALIGN_BONUS != null ? d.BOND_VISIT_ALIGN_BONUS : 1) : 0), align: sameDir };
  }
  function visitBtn(c, id, tier) {
    var w = c.w, d = c.d;
    if (SQ.Bonds.locked(w, id)) return '<div class="dd hint">' + c.esc(c.t('bond.fail.lock')) + '</div>';
    if (SQ.Bonds.scarred(w, id)) return '<div class="dd hint">' + c.esc(c.t('bond.fail.scar')) + '</div>';
    if (tier >= maxBondTier(c)) return '<div class="dd hint">' + c.esc(c.t('bond.visit.fail.max')) + '</div>';
    var g = visitGainOf(c, id, tier);
    var cd = d.BOND_VISIT_CD_MS;   /* 表值直取（审计 #10）：兜底字面量就是第二事实源；缺键由审计 A10 拦，视图不编数 */
    var wait = (w.bondVisitAt || 0) + cd - Date.now();
    if (wait > 0) {
      return '<button class="actbtn" type="button" disabled><span class="an">' + c.esc(c.t('bond.visit.btn')) +
        '</span><span class="cd">' + c.esc(c.t('bond.visit.cd', { t: c.timeLeft(wait) })) + '</span></button>';
    }
    return '<button class="actbtn" type="button" data-act="bondVisit" data-v="' + id + '"><span class="an">' +
      c.esc(c.t('bond.visit.btn')) + '</span>' +
      (g.align ? '<span class="ab">' + c.esc(c.t('bond.visit.align')) + '</span>' : '') +
      (tier < 1 ? '<span class="mt">' + c.esc(c.t('bond.visit.met')) + '</span>' : '') +
      '<span class="gv">' + c.esc(c.t('bond.visit.gain', { n: g.n })) + '</span></button>';
  }
  /* 可赠丹药清单：库存 >0 且非双特例（once）；丹纹版（尾 _rw）单列一颗 */
  function giftablePills(c, w) {
    var al = w && w.alchemy, out = [];
    if (!al || !al.pills) return out;
    for (var k in al.pills) {
      if (!(al.pills[k] > 0)) continue;
      /* 两族合一（第十七批）：可赠与否只认引擎那一个判据（pillDefOf.nogift）——
       * 底牌族 = 自产破障 / 镇劫 / 洗髓 + 成品破障，视图不再自带一份名单（两份名单必然漂） */
      var pd = SQ.Alchemy.pillDefOf(c.d, k);
      if (!pd || pd.nogift) continue;
      out.push({ key: k, n: al.pills[k], rune: pd.rune });
    }
    return out;
  }
  /* 赠丹名义增量：档次一律问引擎那一个判据 `SQ.Alchemy.pillDefOf`（两族合一 · 第十七批）。
   * 旧写法在这里**另摆了一份只查 RECIPES 的名单** ⇒ 成品丹（D.PILLS）查不到 tier ⇒ 增量 0 ⇒ 赠丹 chip
   * 被整颗跳过；引擎侧 bonds.js 用 pd.tier 是给的，#297(f) 因此全绿 —— 又是一处「引擎对、屏上错」。 */
  function pillGiftGain(c, key) {
    var d = c.d;
    var pd = SQ.Alchemy.pillDefOf(d, key);
    if (!pd) return 0;
    var tierName = pd.tier || null;
    if (!tierName) (((d.ALCHEMY || {}).RECIPES) || []).forEach(function (r) {
      if (r && r.pill === pd.id && r.tier) tierName = r.tier;
    });
    var tbl = d.BOND_GIFT_BY_TIER || {};
    var n0 = tbl[tierName] != null ? tbl[tierName] : 0;
    return pd.rune ? Math.round(n0 * (d.BOND_GIFT_RUNE_MULT != null ? d.BOND_GIFT_RUNE_MULT : 1.5)) : n0;
  }
  /* 赠丹段（GitHub issue #4）：无日次上限，能送几颗只看丹匣库存 ⇒ 这里不再算「今日 n/cap」*/
  function bondActSection(c, id) {
    var w = c.w, d = c.d;
    var tier = SQ.Bonds.tierOf(w, id, d);
    var h = '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.act')) + '</div>' +
      '<div class="dd hint" style="margin-bottom:8px">' + c.esc(c.t('bond.act.tip')) + '</div>' + visitBtn(c, id, tier);
    h += '<div class="kv" style="margin-top:12px"><span class="hint">' +
      c.esc(c.t('bond.gift.head')) + '</span></div>';
    if (SQ.Bonds.locked(w, id) || SQ.Bonds.scarred(w, id)) return h + '</div>';
    if (tier >= maxBondTier(c)) return h + '<div class="dd hint">' + c.esc(c.t('bond.gift.fail.max')) + '</div></div>';
    var pills = giftablePills(c, w);
    if (!pills.length) return h + '<div class="dd hint">' + c.esc(c.t('bond.gift.empty')) + '</div></div>';
    var head = Math.max(0, (d.BOND_MAX || 100) - Math.max(0, SQ.Bonds.affinityOf(w, id)));
    var chips = '';
    pills.forEach(function (pl) {
      var g = Math.min(pillGiftGain(c, pl.key), head);
      if (!(g > 0)) return;
      chips += '<button type="button" data-act="bondGift" data-v="' + id + '" data-c="' + pl.key + '">' +
        c.esc(c.t((SQ.Alchemy.pillDefOf(d, pl.key) || {}).nameKey ||
          'alchemy.pill.' + pl.key + '.name')) +   /* 两族名各按本族键族（成品丹是 `pill.*`，M4）*/
        '<span class="gv">+' + g + '</span><span class="st">' + c.esc(c.t('bond.gift.stock', { n: pl.n })) + '</span></button>';
    });
    if (!chips) return h + '<div class="dd hint">' + c.esc(c.t('bond.gift.fail.max')) + '</div></div>';
    h += '<div class="chips">' + chips + '</div>';
    return h + '</div>';
  }
  /* 未识 / 厌恶者的隐匿详情：身份不揭示（「？」+ 未结缘或厌恶值），只给渠道 A 主动结识口 */
  function renderBondUnknown(c, id, rawAff) {
    var h = '<div class="bd-head"><div class="ava">' + c.esc(c.t('ui.qmark')) + '</div><div class="id"><b>' +
      c.esc(c.t('event.codex.unknown')) + '</b><div class="sub">' +
      c.esc(rawAff < 0 ? (c.t('bond.negative') + ' ' + rawAff) : c.t('bond.unmet')) + '</div></div></div>' +
      '<div class="dsec"><div class="dt">' + c.esc(c.t('bond.detail.act')) + '</div>' +
      '<div class="dd hint" style="margin-bottom:8px">' + c.esc(c.t('bond.act.tip')) + '</div>' +
      visitBtn(c, id, 0) + '</div>';
    if (c.ui.bondsDest === 'tab') c.$('tab-bonds').innerHTML = h;
    else c.$('mbd-body').innerHTML = h;
  }
  /* 拒绝原因 → 文案：按 visit / gift / 共用三组前缀依次探键（SQ.t 缺键回传键名本身，据此判存在）*/
  function bondFailText(c, r) {
    var why = (r && r.reason) || 'unknown';
    if (why === 'cooldown') return c.t('bond.visit.fail.cooldown', { t: c.timeLeft(Math.max(0, (r && r.waitMs) || 0)) });
    var ks = ['bond.visit.fail.' + why, 'bond.gift.fail.' + why, 'bond.fail.' + why];
    var wd = c.p.worldId || SQ.WORLD_DEFAULT;
    for (var i = 0; i < ks.length; i++) if (SQ.t(ks[i], null, wd) !== ks[i]) return c.t(ks[i]);
    return c.t('bond.fail.unknown');
  }

  /* ── 浮层收口（opener 与六个 DOM 监听留在内核，监听体只留一行转发）── */
  function open(c) {
    c.ui.bondDetail = null;
    renderBonds(c, 'modal');
    c.$('modal-bonds').classList.remove('hide');
    c.ui.bondSnap = c.bondDotSig();     /* 进浮层即消红点（§2.2） */
    if (c.ui.tab === 'idle') c.renderTab();
  }
  function closeModal(c) {
    c.$('modal-bonds').classList.add('hide');
    c.ui.bondDetail = null;
    if (c.ui.tab === 'bonds') renderBonds(c, 'tab');   /* 从道友页点开的详情：关浮层后还原名录页（此刻浮层已 hide，容器归属可以交还给 tab） */
  }
  function backToList(c) {
    /* 显式指明浮层容器：秒级 tick 会把 bondsDest 翻成 'tab'，无参调用会误渲到道友页 */
    if (c.ui.bondDetail) { c.ui.bondDetail = null; renderBonds(c, 'modal'); }
  }

  /* ── 择选批：护法位/道侣位择选浮层（道友页顶部两位置点开；仅列当前满足条件者，不满足不显示）── */
  function openGuardPick(c) {
    var w = c.w, p = c.p, d = c.d;
    c.$('msp-title').textContent = c.t('bond.guard.pick');
    c.$('msp-hint').textContent = c.t('bond.guard.pick.hint');
    c.$('msp-close').textContent = c.t('ui.close');
    var g = SQ.Bonds.guardianOf(w, p, d);
    var cands = SQ.Bonds.list(p).filter(function (x) {
      return !SQ.Bonds.locked(w, x.id) && !SQ.Bonds.scarred(w, x.id) && SQ.Bonds.tierOf(w, x.id, d) >= 1;
    });
    var h = '';
    /* 恢复自动行：清空手选，回落「好感最高者」默认规则 */
    h += '<div class="lrow' + (w.guardianPick ? '' : ' cur') + '"><div class="kv"><span class="ct">' +
      c.esc(c.t('bond.guard.auto')) + '</span></div><div class="acts">' +
      (w.guardianPick ? '<button data-act="guardSet" data-v="">' + c.esc(c.t('ui.confirm')) + '</button>'
        : '<span class="meta hint">✓</span>') + '</div></div>';
    cands.forEach(function (ch) {
      var tier = SQ.Bonds.tierOf(w, ch.id, d);
      var isCur = !!(g && g.npcId === ch.id);
      h += '<div class="lrow' + (isCur ? ' cur' : '') + '"><div class="kv"><span class="ct">' +
        c.esc(c.t('bond.' + ch.id + '.ava') + ' ' + c.t('bond.' + ch.id + '.name')) + ' · ' +
        c.esc(c.t('bond.' + ch.id + '.title.' + tier) + c.bondTier(tier)) + '</span>' +
        '<span class="s">' + c.esc(c.t('bond.' + ch.id + '.perk')) + '</span></div>' +
        '<div class="acts">' + (isCur ? '<span class="meta hint">✓</span>'
          : '<button data-act="guardSet" data-v="' + ch.id + '">' + c.esc(c.t('ui.confirm')) + '</button>') + '</div></div>';
    });
    c.$('msp-body').innerHTML = h;
    c.$('modal-slotpick').classList.remove('hide');
  }
  async function guardSet(c, npcId) {
    await SQ.Actions.setGuardian(c.s, npcId || null);
    c.$('modal-slotpick').classList.add('hide');
    if (npcId) c.toast(c.t('bond.toast.guardian', { name: c.t('bond.' + npcId + '.name') }));
    c.renderAll();
  }
  function openSpousePick(c) {
    var w = c.w, p = c.p, d = c.d;
    c.$('msp-title').textContent = c.t('bond.spouse.pick');
    c.$('msp-hint').textContent = c.t('bond.spouse.pick.hint');
    c.$('msp-close').textContent = c.t('ui.close');
    var h = '';
    if (w.spouse) {
      /* 已有道侣：先呈现状（解除走详情页/叙事，不在此处） */
      h += '<div class="spouserow"><span>' + c.esc(c.t('bond.spouse.active', {
        form: c.t('bond.spouse.form.' + w.spouse.form), name: c.t('bond.' + w.spouse.npcId + '.name'),
        eff: c.t('bond.form.eff.' + w.spouse.form).split(' · ')[0]
      })) + '</span>' + (w.spouse.form === 'luding' ? '<span>' + c.esc(c.t('bond.spouse.luding.warn')) + '</span>' : '') + '</div>';
    }
    /* 候选 = canPropose 全链通过者（满档 + 无心结 + 未结缘 + 无冷却）；不满足者不显示 */
    var cands = SQ.Bonds.list(p).filter(function (x) {
      return x.category === 'spouse' && SQ.Bonds.canPropose(w, p, d, x.id, Date.now()).ok;
    });
    if (!cands.length) {
      h += '<p class="hint" style="margin-top:8px">' + c.esc(c.t('bond.spouse.pick.empty')) + '</p>';
    } else {
      cands.forEach(function (ch) {
        var aff = SQ.Bonds.affinityOf(w, ch.id);
        h += '<div class="lrow"><div class="kv"><span class="ct">' +
          c.esc(c.t('bond.' + ch.id + '.ava') + ' ' + c.t('bond.' + ch.id + '.name')) + '</span>' +
          '<span class="s">' + c.esc(c.t('bond.fav.label') + ' ' + aff + ' / ' + (d.BOND_MAX || 100)) + '</span></div>' +
          '<div class="acts"><button class="primary" data-act="spousePickPropose" data-v="' + ch.id + '">' +
          c.esc(c.t('bond.propose.btn')) + '</button></div></div>';
      });
    }
    c.$('msp-body').innerHTML = h;
    c.$('modal-slotpick').classList.remove('hide');
  }
  function closePick(c) { c.$('modal-slotpick').classList.add('hide'); }

  /* 提亲 CONFIRM 三形态（B4 · 稿三）：当前档位描金、其余置灰全文可见、炉鼎代价红字三重明示 */
  function openPropose(c, npcId) {
    var w = c.w, p = c.p, d = c.d;
    var chk = SQ.Bonds.canPropose(w, p, d, npcId, Date.now());
    if (!chk.ok) {
      var vars = chk.reason === 'cooldown' ? { t: c.timeLeft(Math.max(0, (w.spouseCdUntil || 0) - Date.now())) } : {};
      c.toast(c.t('bond.propose.fail.' + chk.reason, vars));
      return;
    }
    proposeTarget = npcId;
    c.$('mpr-title').textContent = c.t('bond.propose.title');
    c.$('mpr-sub').textContent = c.t('bond.propose.sub', { name: c.t('bond.' + npcId + '.name') });
    var fh = '';
    ['yinyang', 'huzhu', 'luding'].forEach(function (f) {
      var def = (d.SPOUSE_FORMS || {})[f] || {};
      var cur = f === chk.form;
      fh += '<div class="formcard ' + (cur ? 'cur' : 'off') + '">' +
        '<div class="fn"' + (f === 'luding' ? ' style="color:var(--bad)"' : '') + '>' + c.esc(c.t('bond.spouse.form.' + f)) +
        ' <span class="st">' + c.esc(c.t(cur ? 'bond.form.cur' : 'bond.form.off', { align: c.t('align.' + def.tier) })) + '</span></div>' +
        '<div class="cond">' + c.esc(c.t('bond.form.cond.' + f)) + '</div>' +
        '<div class="eff">' + c.esc(c.t('bond.form.eff.' + f)) + '</div>' +
        (f === 'luding' ? '<div class="cost">' + c.esc(c.t('bond.form.cost.luding')) + '</div>' : '') + '</div>';
    });
    c.$('mpr-forms').innerHTML = fh;
    c.$('mpr-no').textContent = c.t('bond.propose.no');
    c.$('mpr-ok').textContent = c.t('bond.propose.go', { form: c.t('bond.spouse.form.' + chk.form) });
    c.$('mpr-foot').textContent = c.t('bond.propose.foot');
    c.$('modal-propose').classList.remove('hide');
  }
  function cancelPropose(c) {
    c.$('modal-propose').classList.add('hide');
    proposeTarget = null;
  }
  async function confirmPropose(c) {
    var npcId = proposeTarget;
    c.$('modal-propose').classList.add('hide');
    proposeTarget = null;
    if (!npcId) return;
    var res = await SQ.Actions.proposeSpouse(c.s, npcId);
    if (res && res.ok) showSpouse(c, npcId, res.form);
    else if (res) c.toast(c.t('bond.propose.fail.' + (res.reason || 'unknown')));
    c.renderAll();
    if (!c.$('modal-bonds').classList.contains('hide')) renderBonds(c, 'modal');   /* 显式指明浮层容器（浮层走查修复） */
  }
  /* 结契轻演出（结缘词全屏 2s，点按跳过；文案写意留白红线——文本全在词表正典） */
  function showSpouse(c, npcId, form) {
    c.$('sps-t1').textContent = c.t('bond.show.title', { form: c.t('bond.spouse.form.' + form) });
    c.$('sps-t2').textContent = c.t('spouse.' + npcId + '.' + form);
    c.$('sps-t3').textContent = c.t('bond.show.skip');
    var st = c.$('spouse-stage');
    st.classList.remove('hide');
    clearTimeout(spouseStageTimer);
    spouseStageTimer = setTimeout(function () { st.classList.add('hide'); }, c.reducedMotion() ? 1200 : 2600);
  }
  function skipSpouseStage(c) {
    clearTimeout(spouseStageTimer);
    c.$('spouse-stage').classList.add('hide');
  }
  /* 双修解除叙事（B4 · v1.4 口径4）：spouseLog.at 键控会话消费一次；炉鼎文案自带缘锁提示 */
  function checkSpouseLog(c) {
    var w = c.w;
    if (!w || !w.spouseLog) return;
    var sl = w.spouseLog;
    if (c.ui.spouseLogSeen === sl.at) return;
    c.ui.spouseLogSeen = sl.at;
    c.toast(c.t('bond.spouse.dissolve.' + sl.reason, { name: c.t('bond.' + sl.npcId + '.name') }));
  }

  /* ── 动作分支（原内核分派处 4581~4644 那六条，随本族搬入）── */
  function actOpen(c, v) {
    /* 择选批（需求 4）：道友页点解锁卡 → 弹出名录浮层（内呈详情五段式）；名录浮层内则原位二级页。
     * 两支都显式渲染进浮层容器——背后道友页保持名录原状（秒级 tick 重渲也不跟跳） */
    c.ui.bondDetail = v;
    renderBonds(c, 'modal');
    c.$('modal-bonds').classList.remove('hide');
  }
  /* 缘尽赎回（引擎卷 v1.10 §3.6 · 阵营名号联动批）：以遗泽换回一段断缘。
   * 身份在赎回成功前不揭示——确认框只讲代价与规则，成功 toast 才点名。 */
  function actDead(c, v, el) {
    var idD = el.dataset.v || '';
    var wD = c.w, dD = c.d;
    var costD = (dD.BOND_REDEEM_COST != null ? dD.BOND_REDEEM_COST : 30);
    var haveD = (c.s.meta && c.s.meta.karma) || 0;
    if (!idD) { c.toast(c.t('bond.dead.hint')); c.nudge(el); return; }
    if ((wD.redeemedIds || []).indexOf(idD) >= 0) { c.toast(c.t('bond.redeem.dup')); c.nudge(el); return; }
    if (haveD < costD) { c.toast(c.t('bond.redeem.poor', { need: costD, have: SQ.fmt(haveD) })); c.nudge(el); return; }
    c.ask(c.t('bond.redeem.btn'), c.t('bond.redeem.tip', { cost: costD }), async function () {
      var rD = await SQ.Actions.redeemBond(c.s, idD);
      if (rD && rD.ok) {
        c.toastAction(c.t('bond.redeem.ok', { name: c.t('bond.' + idD + '.name'), aff: rD.aff }));
        renderBonds(c.fresh(), c.ui.bondsDest); c.renderTab();
      } else if (rD && rD.reason === 'poor') {
        c.toast(c.t('bond.redeem.poor', { need: costD, have: SQ.fmt((c.s.meta && c.s.meta.karma) || 0) }));
      } else { c.toast(c.t('bond.redeem.none')); }
    });
  }
  /* 拜访论道（渠道 A）：主动、零消耗、全局单冷却。成功 toast 分四态——结识 / 升档 / 同道相投 / 常规。
   * 结识态放首位：0 → 3 的同时名录格由剪影转实名，是本渠道最有感的一次反馈。 */
  async function actVisit(c, v, el) {
    var rvV = await SQ.Actions.visitBond(c.s, v);
    if (rvV && rvV.ok) {
      var nmV = c.t('bond.' + v + '.name');
      c.toastAction(rvV.met ? c.t('bond.visit.ok.met', { name: nmV, n: rvV.gain })
        : (rvV.tierUp ? c.t('bond.visit.ok.tier', { name: nmV, title: c.t('bond.' + v + '.title.' + rvV.tier) })
          : (rvV.align ? c.t('bond.visit.ok.align', { name: nmV, n: rvV.gain })
            : c.t('bond.visit.ok', { name: nmV, n: rvV.gain }))));
    } else { c.toast(bondFailText(c, rvV)); c.nudge(el); }
    renderBonds(c.fresh(), c.ui.bondsDest); c.renderTab();
  }
  /* 赠丹（渠道 B）：data-v = 道友 id、data-c = 丹药 key（含 _rw 丹纹版）。
   * 引擎侧「入账成功才扣丹」，故失败态绝无白扣——视图不做乐观更新。 */
  async function actGift(c, v, el) {
    var pkG = el.dataset.c || '';
    var rvG = await SQ.Actions.giftBond(c.s, v, pkG);
    if (rvG && rvG.ok) {
      var nmG = c.t('bond.' + v + '.name');
      var pdG = SQ.Alchemy.pillDefOf(c.d, pkG);
      var pnG = c.t(pdG ? pdG.nameKey : 'alchemy.pill.' + pkG + '.name');   /* 同上（M4）*/
      c.toastAction(rvG.tierUp
        ? c.t('bond.gift.ok.tier', { name: nmG, pill: pnG, title: c.t('bond.' + v + '.title.' + rvG.tier) })
        : c.t('bond.gift.ok', { name: nmG, pill: pnG, n: rvG.gain }));
    } else { c.toast(bondFailText(c, rvG)); c.nudge(el); }
    renderBonds(c.fresh(), c.ui.bondsDest); c.renderTab();
  }
  function actSpousePickPropose(c, v) {
    c.$('modal-slotpick').classList.add('hide');
    openPropose(c, v);
  }

  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，**表内不许夹注释**（注释会把首枚 key 从抽取面里切掉 ⇒ 假报「出口不存在」） */
  SQ.UI.bonds = {
    render: renderBonds,
    open: open,
    closeModal: closeModal,
    backToList: backToList,
    openGuardPick: openGuardPick,
    openSpousePick: openSpousePick,
    closePick: closePick,
    openPropose: openPropose,
    cancelPropose: cancelPropose,
    confirmPropose: confirmPropose,
    guardSet: guardSet,
    skipSpouseStage: skipSpouseStage,
    checkSpouseLog: checkSpouseLog,
    actOpen: actOpen,
    actDead: actDead,
    actVisit: actVisit,
    actGift: actGift,
    actSpousePickPropose: actSpousePickPropose
  };
})();
