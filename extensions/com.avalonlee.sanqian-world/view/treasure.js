/* 法宝页（第册卅六批 2026-10-18 从 view/index.html 整片搬出 · N34 第七刀 · 正典 = UI 卷 §3.4 法宝段）
 * 范围 = 「法宝」页的渲染族（法宝栏三槽 + 法宝库 + 法宝全录 + 造化换算）+ 属于它们的五条动作
 *        （祭出 / 收起 / 祭炼 / 灵石换灵气 / 换丹）。分派顺序与判据不动：内核只留 `SQ.UI.treasure.*` 五句转发。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；形参名钉死 c ⇒ 本文件所有回调一律不许用 c。
 * 本批桥多给两枚：`spiritPanel`（器灵面板仍在内核，本页回头调用）‖ `nudge`（输入不合法时抖一下那枚控件）。
 * ⚠️ 卡片类名助手不搬：它是「法与器」两页共用的那一枚，仍留内核、经桥以 `kindCls` 递出（件内互调才留内核）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 法宝卡（卡片化批）：名号/品阶/品相 + 等级·签名效果 + 描述 + 缺项红字 + 祭出/收起/祭炼动作 */
  function treasureCard(c, w, p, d, e, mode) {
    var dd = SQ.Treasures.def(p, e.id);
    if (!dd) return '';
    var lv = SQ.Treasures.levelOf(e), max = SQ.Treasures.maxOf(p, dd);
    var eq = SQ.Treasures.isEquipped(w, e.id);
    var lacks = SQ.Treasures.lacksTexts(w, p, d, dd);
    var h = '<div class="tcard' + (eq ? ' rare' : '') + '">';
    h += '<div class="tname">' + c.esc(c.t('treasure.' + e.id + '.name')) +
      ' <span class="tierbadge ' + c.kindCls(dd.kind) + '">' + c.esc(c.t('treasure.kind.' + dd.kind)) + '</span>' +
      ' <span class="align-sym">' + c.esc(c.t('treasure.grade.' + dd.grade)) + '</span>' +
      (eq ? ' <span class="special-mark">' + c.esc(c.t('treasure.equip')) + '</span>' : '') + '</div>';
    h += '<div class="teff">' + c.esc(c.t('treasure.lv.' + dd.kind, { n: lv, cap: max })) +
      ' · ' + c.esc(SQ.Treasures.fxText(w, p, dd, e)) + '</div>';
    h += '<div class="tdesc">' + c.esc(c.t('treasure.' + e.id + '.desc')) + '</div>';
    if (dd.kind === 'xian') {
      /* N52（第册十二批）：认主进度按件 ⇒ 这句只报「这件」的剩余，公式在引擎那一处（bondHoursLeft），视图不抄第二份 */
      var bondLeft = SQ.Treasures.bondHoursLeft(p, e);
      h += '<div class="tdesc">' + c.esc(c.t('treasure.bond.hint', { n: (p.treasures.BOND_COST || 3), h: (p.treasures.BOND_HOURS || 8) })) +
        (bondLeft > 0 ? ' · ' + c.esc(c.t('treasure.bond.left', { n: bondLeft })) : '') + '</div>';
    }
    if (!eq && lacks.length) h += '<div class="tdesc" style="color:var(--danger)">' + c.esc(lacks.join(' · ')) + '</div>';
    var acts = '';
    if (eq) {
      acts += '<button data-act="unequipTreasure" data-v="' + e.id + '">' + c.esc(c.t('treasure.unequip')) + '</button>';
    } else if (mode === 'bag') {
      acts += '<button class="primary" data-act="equipTreasure" data-v="' + e.id + '"' + (lacks.length ? ' disabled' : '') + '>' +
        c.esc(c.t('treasure.equip')) + '</button>';
    }
    if (mode === 'bag' && dd.kind === 'hou') {
      var cost = SQ.Treasures.refineCost(w, p, d, e.id);
      if (cost != null) {
        acts += '<button data-act="refineTreasure" data-v="' + e.id + '"' + (w.stones < cost ? ' disabled' : '') + '>' +
          c.esc(c.t('treasure.refine')) + ' ' + SQ.fmt(cost) + '</button>';
      } else {
        acts += '<span class="tdesc">' + c.esc(c.t('treasure.refine.max')) + '</span>';
      }
    }
    if (acts) h += '<div class="acts">' + acts + '</div>';
    return h + '</div>';
  }

  /* 法宝图鉴卡：未得（owned=false）者名号 / 品阶 / 效果 / 描述全部以问号遮蔽 */
  function treasureCodexCard(c, w, p, d, it) {
    var dd = it.def;
    var q = c.t('treasure.codex.mask'), qq = c.t('treasure.codex.unknown');
    var h = '<div class="tcard' + (it.owned ? '' : ' dim') + '">';
    if (!it.owned) {
      h += '<div class="tname">' + c.esc(qq) +
        ' <span class="tierbadge ' + c.kindCls(dd.kind) + '">' + c.esc(q) + '</span>' +
        ' <span class="align-sym">' + c.esc(q) + '</span></div>';
      h += '<div class="teff">' + c.esc(q) + '</div>';
      h += '<div class="tdesc">' + c.esc(q) + '</div>';
      return h + '</div>';
    }
    h += '<div class="tname">' + c.esc(c.t('treasure.' + dd.id + '.name')) +
      ' <span class="tierbadge ' + c.kindCls(dd.kind) + '">' + c.esc(c.t('treasure.kind.' + dd.kind)) + '</span>' +
      ' <span class="align-sym">' + c.esc(c.t('treasure.grade.' + dd.grade)) + '</span>' +
      (it.equipped ? ' <span class="special-mark">' + c.esc(c.t('treasure.equip')) + '</span>' : '') + '</div>';
    h += '<div class="teff">' + c.esc(c.t('treasure.lv.' + dd.kind, { n: it.level, cap: SQ.Treasures.maxOf(p, dd) })) +
      ' · ' + c.esc(SQ.Treasures.fxText(w, p, dd, it.entry)) + '</div>';
    h += '<div class="tdesc">' + c.esc(c.t('treasure.' + dd.id + '.desc')) + '</div>';
    return h + '</div>';
  }

  function render(c) {
    var w = c.w, p = c.p, d = c.d;
    var ts = p.treasures;
    if (!ts) { c.$('tab-treasure').innerHTML = '<div class="lrow locked"><div class="meta">' + c.esc(c.t('treasure.empty')) + '</div></div>'; return; }
    var tr = w.treasures || { owned: [], slots: [null, null, null] };
    var slots = tr.slots || [];
    var eqN = slots.filter(function (x) { return !!x; }).length;
    var h = '';
    /* 法宝栏 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('treasure.slots', { n: eqN, cap: ts.SLOTS })) +
      '</span><span class="s">' + c.esc(c.t('treasure.hint')) + '</span></div>';
    h += '<div class="cards trgrid">';
    for (var i = 0; i < ts.SLOTS; i++) {
      var id = slots[i];
      var e = id ? SQ.Treasures.entryOf(w, id) : null;
      if (!SQ.Treasures.slotUnlocked(w, p, i)) {
        h += '<div class="tcard dim"><div class="tslot">' + c.esc(c.t('treasure.slot.n', { n: i + 1 })) + '</div><div class="tdesc">' +
          c.esc(c.t('treasure.slot.locked', { realm: c.t('realm.' + ts.SLOT_UNLOCK[i]) })) + '</div></div>';
      } else if (!e) {
        h += '<div class="tcard dim"><div class="tslot">' + c.esc(c.t('treasure.slot.n', { n: i + 1 })) + '</div><div class="tdesc">' +
          c.esc(c.t('treasure.empty')) + '</div></div>';
      } else {
        h += treasureCard(c, w, p, d, e, 'slot');
      }
    }
    h += '</div>';
    /* 法宝库 */
    var owned = tr.owned || [];
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('treasure.bag', { n: owned.length })) + '</span></div>';
    if (!owned.length) h += '<div class="lrow locked"><div class="meta">' + c.esc(c.t('treasure.bag.empty')) + '</div></div>';
    else h += '<div class="cards trgrid">' + owned.map(function (x) { return treasureCard(c, w, p, d, x, 'bag'); }).join('') + '</div>';
    /* 法宝图鉴：全录一览；未得者名号/品阶/效果/描述一律问号遮蔽 */
    var cx = SQ.Treasures.codex(w, p);
    var cxGot = cx.filter(function (x) { return x.owned; }).length;
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('treasure.codex.title')) +
      '</span><span class="s">' + c.esc(c.t('treasure.codex.banner', { n: cxGot, total: cx.length })) + '</span></div>';
    h += '<p class="hint" style="margin:2px 0 6px">' + c.esc(c.t('treasure.codex.hint')) + '</p>';
    h += '<div class="cards trgrid">' + cx.map(function (it) { return treasureCodexCard(c, w, p, d, it); }).join('') + '</div>';
    /* 造化（X11 阴阳乾坤鼎，须祭出） */
    if (SQ.Treasures.isEquipped(w, 'x11')) {
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('treasure.convert.title')) + '</span></div>';
      h += '<div class="lrow"><div class="meta hint">' + c.esc(c.t('treasure.x11.desc')) + '</div>' +
        '<div class="row" style="margin-top:6px"><input class="trconv" type="number" min="0" step="1000" value="0" ' +
        'placeholder="' + c.esc(c.t('treasure.convert.qi')) + '" style="flex:1;min-width:0">' +
        '<button data-act="treasureConvert">' + c.esc(c.t('treasure.convert.qi')) + '</button></div>' +
        '<div class="acts"><button data-act="treasurePill">' +
        c.esc(c.t('treasure.convert.pill', { n: SQ.fmt(ts.PILL_COST), cur: c.t('resource.currency') })) + '</button></div></div>';
    }
    h += c.spiritPanel();
    c.$('tab-treasure').innerHTML = h;
  }

  /* ── 五条动作（第册六批口径：一片 = 一页的呈现 + 它的动作；分派留在内核，顺序不动）── */
  async function actEquip(c, v) {
    var r = await SQ.Actions.equipTreasure(c.s, v);
    if (r && r.ok) c.toast(c.t('treasure.equipped', { name: c.t('treasure.' + v + '.name') }));
    else if (r) c.toast(c.t('treasure.locked'));
    c.renderAll();
  }
  async function actUnequip(c, v) {
    var r = await SQ.Actions.unequipTreasure(c.s, v);
    if (r && r.ok) c.toast(c.t('treasure.unequipped', { name: c.t('treasure.' + v + '.name') }));
    c.renderAll();
  }
  async function actRefine(c, v) {
    var cost = SQ.Treasures.refineCost(c.w, c.p, c.d, v);
    if (cost == null) return;
    var body = c.t('treasure.refine.confirm', {
      name: c.t('treasure.' + v + '.name'), lv: (SQ.Treasures.levelOf(SQ.Treasures.entryOf(c.w, v)) + 1),
      n: SQ.fmt(cost), cur: c.t('resource.currency')
    });
    c.ask(c.t('treasure.refine'), body, async function () {
      var r = await SQ.Actions.refineTreasure(c.s, v);
      if (r && r.ok) c.toast(c.t(r.fail ? 'treasure.refine.fail' : 'treasure.refine.done', { name: c.t('treasure.' + v + '.name') }));
      c.renderAll();
    });
  }
  /* 造化两路要读**点击那一行**的输入框（`.trconv`）⇒ `el` 由内核分派处递进来（第册七批同款：分派局部量不许靠件内自取） */
  async function actConvert(c, el) {
    var row = el.closest('.lrow');
    var inp = row && row.querySelector('.trconv');
    var amt = inp ? Math.floor(Number(inp.value) || 0) : 0;
    if (amt <= 0) { c.nudge(el); return; }
    var r = await SQ.Actions.treasureConvertQi(c.s, amt);
    if (r && r.ok) c.toast(c.t('treasure.convert.qiDone', { n: SQ.fmt(r.n) }));
    else c.nudge(el);
    c.renderAll();
  }
  async function actPill(c, el) {
    var r = await SQ.Actions.treasureMakePill(c.s);
    if (r && r.ok) c.toast(c.t('treasure.convert.pillDone'));
    else if (r && r.reason === 'busy') c.toast(c.t('treasure.convert.pillBusy'));
    else c.nudge(el);
    c.renderAll();
  }

  SQ.UI = SQ.UI || {};
  SQ.UI.treasure = { render: render, card: treasureCard, codexCard: treasureCodexCard,
    actEquip: actEquip, actUnequip: actUnequip, actRefine: actRefine, actConvert: actConvert, actPill: actPill };
})();
