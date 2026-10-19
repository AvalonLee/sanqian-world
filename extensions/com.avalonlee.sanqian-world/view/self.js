/* 自我浮层（角色卡 + 善恶四行 ‖ 第册五十四批 2026-10-19 从 view/index.html 整片搬出 · N34 第十八刀）
 * 两件同族、都只被派发器 `data-act`（`role` / `karma`）打开，故合成一件：`role`（角色浮层 62 行）‖ `karma`（善恶浮层 73 行）。
 * 角色卡里的「改命 / 洗髓 / 传承」三个按钮只改 `disabled` 与 `hide`，动作仍在内核派发器；
 * 善恶浮层的色带游标与差值双提示是纯拼串（`SQ.Karma.effectsOf` / `edgeOf` / `rankOf` 走引擎公开面）⇒ 件内直取。
 * 桥 43 → **44 枚**（本刀 +1）：`identityParts`（道号 / 世界 / 境界三段拼装，角色卡标题用）。
 * 另复用已有桥名：`talentCard` / `wid` / `bondTier`（好感档汉字数字）。
 * 留内核：三个 DOM 监听（`mr-close` / `mr-karma` / 其它 `modal-karma` 收口，监听体一行转发）。
 * ⚠️ 改写器字符串感知（`'karma.*'` 这类词表键不许加前缀）；改完跑「内核函数名 × 件内裸调用」对扫。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});
  function role(c) {
    var w = c.w, d = c.d, m = c.mods, p = c.p;
    var idp = c.identityParts();
    c.$('mr-title').textContent = idp.name + ' · ' + idp.world + ' · ' + idp.realm;
    var h = '';
    /* 天道段（天道系统批 B3）：称号「我命由我不由天」/ 逆天盾 / 逆天值展示 */
    var tdRole = w.tiandao;
    if (tdRole && (tdRole.title || tdRole.shield || tdRole.defy > 0)) {
      h += '<div class="tdrow">' +
        (tdRole.title ? '<span class="tdtitle">' + c.esc(c.t('tiandao.title')) + '</span>' : '') +
        (tdRole.shield ? '<span class="tdtitle">' + c.esc(c.t('tiandao.shield')) + '</span>' : '') +
        (tdRole.defy > 0 ? '<span class="tddefy">' + c.esc(c.t('tiandao.defy.val', { n: tdRole.defy })) + '</span>' : '') +
        '</div>';
    }
    var metaT = (c.s.meta && c.s.meta.titles) || [];
    if (metaT.length) {
      /* 称号墙：改与成就页同款 chips（一枚称号整块不换行）——旧 `.kv` 写法把「称号墙」标签与称号串
       * 一起塞进 flex 两端对齐的一行里，窄浮层下标签会被从中间截断（"墙" 独自掉到次行） */
      h += '<p class="hint" style="margin:0 0 4px">' + c.esc(c.t('codex.ui.titles')) + '</p>' +
        '<div class="chips">' + metaT.slice(-6).map(function (id) {
          return '<span class="tdtitle">' + c.esc(c.t('codex.title.' + id)) + '</span>';
        }).join('') + '</div>';
    }
    h += '<p class="hint">' + c.esc(c.t('role.attrs.title')) + '</p>';
    d.ATTRS.forEach(function (id) {
      var v = w.attrs[id] || 0;
      var dc2 = SQ.Attrs.dcStdOf(w, d) * 2;
      h += '<div class="kv"><span>' + c.esc(c.t('attr.' + id)) + ' <span class="hint">' + c.esc(c.t('attr.desc.' + id)) + '</span></span><span>' + Math.floor(v) + '</span></div>';
      h += '<div class="bar slim"><i style="width:' + Math.min(100, (v / dc2) * 100).toFixed(1) + '%"></i></div>';
      /* 构成明细 */
      var base = SQ.Attrs.baseOf(w, d);
      var nurture = SQ.Attrs.artsNurtureOf(w, p, d, id);   /* 与引擎同一处算式（含品阶阶梯），视图不再自己抄一遍 */
      var gearV = 0;
      for (var slot in w.gear) {
        var it = w.gear[slot];
        if (it && it.attrValue && it.attrValue.attr === id) gearV += it.attrValue.value;
      }
      var evB = (w.attrEventBonus || {})[id] || 0;
      var buffV = Math.max(0, Math.round((v - base - nurture - gearV - evB) * 10) / 10);
      h += '<div class="detailbox"><div class="kv"><span>' + c.esc(c.t('attr.part.base')) + '</span><span>' + base + '</span></div>' +
           '<div class="kv"><span>' + c.esc(c.t('attr.part.arts')) + '</span><span>+' + nurture + '</span></div>' +
           '<div class="kv"><span>' + c.esc(c.t('attr.part.gear')) + '</span><span>+' + gearV + '</span></div>' +
           '<div class="kv"><span>' + c.esc(c.t('attr.part.event')) + '</span><span>' + (evB >= 0 ? '+' : '−') + Math.abs(evB) + '</span></div>' +
           (buffV ? '<div class="kv"><span>' + c.esc(c.t('attr.part.buff')) + '</span><span>+' + buffV + '</span></div>' : '') +
           '<div class="kv hint"><span>' + c.esc(c.t('attr.dc', { n: SQ.Attrs.dcOf(w, d, 'medium') })) + '</span></div></div>';
    });
    c.$('mr-attrs').innerHTML = h;
    var tb = c.$('mr-talents');
    tb.innerHTML = '';
    (c.s.profile.talents || []).forEach(function (el) { tb.appendChild(c.talentCard(el, c.wid())); });
    c.$('mr-karma').textContent = c.t('karma.system') + ' →';
    c.$('mr-close').textContent = c.t('ui.close');
    /* 洗髓入口（v1.8 §十）：本世有预算才露出，手中无缘时置灰（灰置而非隐藏——玩家要看得见「还有这条路」） */
    var swapCap = (c.d.TALENT_SWAP || {}).PER_LIFE || 0;
    var wb = c.$('mr-wash');
    if (swapCap > 0) {
      wb.classList.remove('hide');
      wb.textContent = c.t('talent.swap.entry', { owed: w.talentOwed || 0, cap: swapCap });
      wb.disabled = !((w.talentOwed || 0) > 0);
    } else wb.classList.add('hide');
    c.$('modal-role').classList.remove('hide');
  }

  function karma(c) {
    var w = c.w, p = c.p, d = c.d;
    var sys = p.worldSystems;
    var tier = sys.tierOf(w);
    var parts = sys.karmaParts(w);
    c.$('mkd-title').textContent = c.t('karma.system');
    c.$('mkd-value').textContent = c.t('karma.tier.' + tier) + ' · ' + (w.karma > 0 ? '+' : '') + w.karma;
    c.$('mkd-value').style.color = 'var(--sq-karma-' + tier + ')';
    var pos = (w.karma + d.KARMA_CLAMP) / (2 * d.KARMA_CLAMP);
    c.$('mkd-bar').style.width = (pos * 100).toFixed(1) + '%';
    /* 差值双提示：左道显示两侧距离；正/魔显示距极处 */
    var nextTxt;
    var eK = SQ.XKarma.edgeOf(d);   /* 边界取自 KARMA_TIERS，视图不再抄 200（#293(e) 钉这条取数口） */
    if (tier === 'neutral') {
      nextTxt = c.t('karma.next', { tier: c.t('karma.tier.right'), n: Math.max(0, eK.up - w.karma) }) +
        ' · ' + c.t('karma.next', { tier: c.t('karma.tier.evil'), n: Math.max(0, w.karma - eK.down) });
    } else if (tier === 'right') {
      nextTxt = w.karma >= d.KARMA_CLAMP ? c.t('karma.maxed') : c.t('karma.next', { tier: c.t('karma.extreme'), n: d.KARMA_CLAMP - w.karma });
    } else {
      nextTxt = w.karma <= -d.KARMA_CLAMP ? c.t('karma.maxed') : c.t('karma.next', { tier: c.t('karma.extreme'), n: w.karma + d.KARMA_CLAMP });
    }
    c.$('mkd-next').textContent = nextTxt;
    function sgn(n) { return (n >= 0 ? '+' : '') + n; }
    c.$('mkd-parts').innerHTML =
      '<div class="kv"><span>' + c.esc(c.t('karma.part.arts')) + '</span><span>' + sgn(parts.arts) + '</span></div>' +
      '<div class="kv"><span>' + c.esc(c.t('karma.part.gear')) + '</span><span>' + sgn(parts.gear) + '</span></div>' +
      '<div class="kv"><span>' + c.esc(c.t('karma.part.events')) + '</span><span>' + sgn(parts.events) + '</span></div>' +
      '<div class="kv"><span>' + c.esc(c.t('karma.part.drift')) + '</span><span>' + sgn(Math.round(parts.drift)) + '</span></div>';
    /* 名号九段天梯（善恶名号批）：九段全列，当前段高亮并按其档位着色；区间由 KARMA_RANKS 下界推导 */
    var rows = d.KARMA_RANKS || [];
    var rankNow = sys.rankOf ? sys.rankOf(w) : 'zuodao';
    var lh = '';
    rows.forEach(function (row, i) {
      var lo = (row[0] === -Infinity) ? -d.KARMA_CLAMP : Math.ceil(row[0]);
      var hi = (i === 0) ? d.KARMA_CLAMP : Math.ceil(rows[i - 1][0]) - 1;
      if (rows[i - 1] && rows[i - 1][0] === -Infinity) hi = d.KARMA_CLAMP;
      var on = row[1] === rankNow;
      var rTier = SQ.XKarma.tierOf((lo + hi) / 2);
      lh += '<div class="rrow' + (on ? ' on ' + rTier : '') + '">' +
        '<span>' + c.esc(c.t('karma.rank.' + row[1])) + '</span>' +
        '<span class="rr-range">' + sgn(lo) + ' ~ ' + sgn(hi) + '</span></div>';
    });
    c.$('mkd-ranktitle').textContent = c.t('karma.rank.ladder');
    c.$('mkd-ranks').innerHTML = lh;
    c.$('mkd-rate').textContent = c.t('karma.rateHint.' + tier);
    /* ALIGN_EFFECTS 摘要六行（当前档位实时值）+ 品阶上浮（魔道档）+ 护法行灰置（批 3） */
    var eff = sys.effectsOf(w);
    var eh = '';
    function effRow(label, val) {
      return '<div class="kv"><span>' + c.esc(label) + '</span><span>' + c.esc(val) + '</span></div>';
    }
    eh += effRow(c.t('karma.eff.qiRate'), '×' + eff.qiRateMult.toFixed(2));
    eh += effRow(c.t('karma.eff.combatPower'), '×' + eff.combatPowerMult.toFixed(2));
    eh += effRow(c.t('karma.eff.eventRate'), '×' + eff.eventRateMult.toFixed(2));
    eh += effRow(c.t('karma.eff.dropRate'), '×' + eff.dropRateMult.toFixed(2));
    eh += effRow(c.t('karma.eff.checkDc'), '×' + eff.checkDcMult.toFixed(2));
    eh += effRow(c.t('karma.eff.trib'), (eff.tribBonusFlat >= 0 ? '+' : '') + Math.round(eff.tribBonusFlat * 100) + '%');
    if (eff.dropTierUpChance > 0) eh += effRow(c.t('karma.eff.tierUp'), Math.round(eff.dropTierUpChance * 100) + '%');
    (function () {
      /* 护法行激活（B6 · 批 3）：魔道档红字独行 / 生效金加项 / 无人灰置 */
      var gK = SQ.Bonds.guardianOf(c.w, c.p, c.d);
      var evilK = c.p.worldSystems.tierOf(c.w) === 'evil';
      var txtK, clsK = ' hint';
      if (evilK) { txtK = c.t('bond.guard.evil'); }
      else if (gK && gK.bonus > 0) { clsK = ''; txtK = '+' + gK.bonus.toFixed(2) + ' · ' + c.t('bond.' + gK.npcId + '.name') + c.bondTier(gK.tier); }
      else { txtK = '—'; }
      eh += '<div class="kv' + clsK + '"><span>' + c.esc(c.t('karma.eff.guardian')) + '</span><span>' + c.esc(txtK) + '</span></div>';
    })();
    c.$('mkd-efftitle').textContent = c.t('karma.effects.title');
    c.$('mkd-effects').innerHTML = eh;
    c.$('mkd-close').textContent = c.t('ui.cancel');
    c.$('modal-karma').classList.remove('hide');
  }
  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.self = { role: role, karma: karma };
})();
