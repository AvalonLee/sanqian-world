/* 器段与百器录（第册十批 2026-10-17 从 view/index.html 整片搬出 · 正典 = UI 卷 §3.4a）
 * 范围 = 「法与器」页「器」段的渲染族 + 百器录浮层 + 属于它们的三条动作（开百器录 / 已录格详情 / 炼化）。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；形参名钉死 c ⇒ 本文件所有回调一律不许用 c。
 * ⚠️ 页框（chip 行 / 概览条 / 段标）与「法」段仍在内核与 view/arts.js，本件不反向调用它们。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 特殊词条效果行（百器录格）：数值从引擎表推导，禁手写数字 */
  function specialEffText(c, id) {
    var d = c.d;
    if (id === 'ignore_req') return c.t('gear.special.ignore_req');
    if (id === 'adamantine') return c.t('gear.stat.resist') + ' +' + d.ADAMANTINE_RESIST;
    var eff = (d.GEAR_SPECIAL_EFFECTS || {})[id] || {};
    return Object.keys(eff).map(function (f) {
      var v = eff[f];
      var txt = Math.abs(v) < 1 ? (v > 0 ? '+' : '−') + c.pct(Math.abs(v)) : (v > 0 ? '+' : '') + v;
      return c.t('talent.field.' + f) + ' ' + txt;
    }).join(' · ');
  }
  /* 当前持有扫描（百器录状态行）：佩戴中 / 在库（件名）/ 已炼化 */
  function gearHolder(c, w, match) {
    var d = c.d, found = null, where = null;
    d.GEAR_SLOTS.forEach(function (s) {
      var it = w.gear[s];
      if (it && !found && match(it)) { found = it; where = 'worn'; }
    });
    if (!found) (w.stash || []).forEach(function (it) {
      if (!found && match(it)) { found = it; where = 'stash'; }
    });
    return found ? { item: found, where: where } : null;
  }
  function gearHolderState(c, hold) {
    if (!hold) return c.t('gear.codex.state.refined');
    return hold.where === 'worn' ? c.t('gear.codex.state.worn') : c.t('gear.codex.state.stash', { name: hold.item.name });
  }
  /* 来源行（B5：zone 跳秘境 · event 跳图鉴回看 story · shop 标注） */
  function gearSrcLine(c, it) {
    var s = it.source;
    if (!s) return '';
    if (s.type === 'zone' && s.ref != null && c.d.ZONES[s.ref]) {
      return '<div class="srcrow"><span class="src" data-act="tab" data-v="combat">' +
        c.esc(c.t('gear.src.zone', { name: c.t('combat.zone.' + s.ref) })) + ' ›</span></div>';
    }
    if (s.type === 'event' && s.ref) {
      return '<div class="srcrow"><span class="src" data-act="recallEvent" data-v="' + c.esc(s.ref) + '">' +
        c.esc(c.t('gear.src.event', { name: c.t('event.' + s.ref + '.name') })) + ' ›</span></div>';
    }
    if (s.type === 'shop') return '<div class="srcrow">' + c.esc(c.t('gear.src.shop')) + '</div>';
    if (s.type === 'exclusive') return '<div class="srcrow">' + c.esc(c.t('gear.src.exclusive')) + '</div>';
    return '';
  }
  /* 单槽（B16-e 起的设计稿 .gear4 / .gslot 形态）：槽名 + 名号（含品阶/阵营角标）+ 属性行。
   * 空槽用虚线 +「尚无此件」，一眼看出还差几件；不再用整张卡片占位。 */
  function gearSlot(c, it, w, slotLabel) {
    if (!it) {
      return '<div class="gslot empty"><div class="g-k">' + c.esc(slotLabel) + '</div>' +
        '<div class="g-n dim">' + c.esc(c.t('gear.slot.none')) + '</div>' +
        '<div class="g-e dim">' + c.esc(c.t('gear.empty')) + '</div></div>';
    }
    return '<div class="gslot on"><div class="g-k">' + c.esc(slotLabel) + '</div>' +
      '<div class="g-n">' + c.esc(it.name) +
      ' <span class="tierbadge t' + it.tier + '">' + c.esc(c.t('gear.tier.' + it.tier)) + '</span>' +
      (it.special ? ' <span class="special-mark">' + c.esc(c.t('gear.special.' + it.special)) + '</span>' : '') +
      (it.exclusive ? ' <span class="ebadge gold">' + c.esc(c.t('event.badge.exGear')) + '</span>' : '') + '</div>' +
      '<div class="g-e">' + c.esc(c.statLine(it)) + '</div></div>';
  }
  /* 库藏阁整行（B16-e）：左「名 + 品阶/角标 + 属性 + 评分 + 缺项/来源」，右「换上 / 炼化」。
   * 动作条件与 data-act 一字未改（独占手动替换口径、炼化指纹回传给引擎复查那条都不动）。 */
  function gearStashRow(c, it, w, idx) {
    var h = '<div class="lrow stroe">' +
      '<span class="srn">' + c.esc(it.name) +
      ' <span class="tierbadge t' + it.tier + '">' + c.esc(c.t('gear.tier.' + it.tier)) + '</span>' +
      ' <span class="align-sym align-' + it.alignment + '">' + c.esc(c.t('align.sym.' + it.alignment)) + '</span>' +
      (it.special ? ' <span class="special-mark">' + c.esc(c.t('gear.special.' + it.special)) + '</span>' : '') +
      (it.prime ? ' <span class="primetag">' + c.esc(c.t('gear.prime')) + '</span>' : '') +
      (it.exclusive ? ' <span class="ebadge gold">' + c.esc(c.t('event.badge.exGear')) + '</span>' : '') + '</span>' +
      '<span class="srd">' + c.esc(c.statLine(it)) + ' · ' + c.esc(c.t('gear.score', { n: SQ.fmt(SQ.Gear.scoreOf(it)) })) + '</span>';
    if (!SQ.Gear.canWear(it, w)) {
      h += '<span class="srd" style="color:var(--danger)">' + c.esc(c.t('gear.lack.stash', {
        realm: c.t('realm.' + it.reqs.realm), star: it.prime ? '※' : '', n: Math.max(1, it.reqs.realm - w.realm)
      })) + '</span>';
      if (it.prime) h += '<span class="srd hint">' + c.esc(c.t('gear.prime.note')) + '</span>';
    }
    if (it.exclusive) h += '<span class="srd hint">' + c.esc(c.t('gear.ex.lock')) + '</span>';
    /* 来源行（B5 口径：秘境可跳、奇遇可回看）——改行后仍留在行内，不因版式换装丢出口 */
    h += gearSrcLine(c, it);
    var acts = '', cur = w.gear[it.slot];
    if (SQ.Gear.canWear(it, w) && (it.exclusive || (cur && cur.exclusive))) {
      acts += '<button data-act="swapGear" data-v="' + idx + '">' +
        c.esc(c.t(cur && cur.exclusive && !it.exclusive ? 'gear.swap.btn' : 'gear.swap.wear')) + '</button>';
    }
    if (!it.exclusive) {
      acts += '<button data-act="refineGear" data-v="' + idx + '">' +
        c.esc(c.t('gear.refine.btn', { n: SQ.fmt(SQ.Gear.refineValue(it, w, c.d, c.mods)) })) + '</button>';
    }
    h += '<span class="srr">' + (acts ? '<span class="srb">' + acts + '</span>' : '') + '</span>';
    return h + '</div>';
  }
  /* ⑤ 百器段（B16-e 对齐设计稿 §百器：三格摘要 → 四槽一行 → 百器录行 → 库藏阁行 → 炼化条）。
   * 百器录一行点开仍是 12 格双节浮层（data-act 未改）；库藏阁换上/炼化的条件与顺序未改。
   * ⚠️ UI 卷 §3.4a 勘误：原设计文档末项「最近拾得滚动列表」在本函数里从来不存在，
   * 实际只有百器录 / 已佩 / 库藏阁三段；已按代码现实收敛登记，不在本批补做。 */
  function gearBody(c) {
    var w = c.w, d = c.d;
    var seen = w.gearSeen || {};
    var spIds = (d.GEAR_SPECIALS || []).map(function (s) { return s.id; });
    var exIds = Object.keys(d.EXCLUSIVE_GEAR || {});
    var sGot = spIds.filter(function (x) { return seen[x] != null; }).length;
    var eGot = exIds.filter(function (x) { return seen['ex_' + x] != null; }).length;
    var worn = 0, atkSum = 0, resSum = 0;
    d.GEAR_SLOTS.forEach(function (s) {
      var it = w.gear[s];
      if (it) { worn++; atkSum += it.atk || 0; resSum += it.resist || 0; }
    });
    /* ① 三格摘要（设计稿 .sum3）：三个数全部现算，不抄「9.8 万」这类演示值 */
    var h = '<div class="sum3">' +
      '<div><div class="k">' + c.esc(c.t('gear.sum.worn')) + '</div><div class="v">' +
      worn + ' / ' + d.GEAR_SLOTS.length + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('gear.stat.atk')) + '</div><div class="v">' + SQ.fmt(atkSum) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('gear.stat.resist')) + '</div><div class="v">' + SQ.fmt(resSum) + '</div></div></div>';
    /* ② 四槽一行（取数、角标与空槽语义同旧卡） */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('gear.sec.worn')) + '</span><span class="s">' +
      c.esc(c.t('gear.sec.wornsub', { n: worn, total: d.GEAR_SLOTS.length, r: SQ.fmt(resSum) })) + '</span></div>';
    h += '<div class="gear4">' + d.GEAR_SLOTS.map(function (slot) {
      return gearSlot(c, w.gear[slot], w, c.t('gear.slot.' + slot));
    }).join('') + '</div>';
    h += '<p class="hintline">' + c.esc(c.t('gear.hint')) + '</p>';
    /* ③ 百器录：页首横幅改行（进度条 + 计数 + 全部），点开仍是双节浮层 */
    var cdTotal = spIds.length + exIds.length, cdGot = sGot + eGot;
    h += '<div class="lrow codexrow" data-act="openGearCodex"><span class="srn">' + c.esc(c.t('gear.codex.title')) +
      ' <span class="hint">' + c.esc(c.t('gear.codex.banner', {
        n: cdGot, total: cdTotal, s: sGot, st: spIds.length, e: eGot, et: exIds.length
      })) + '</span></span>' +
      '<span class="srd"><span class="bar thin"><i style="width:' + (cdTotal ? Math.round(cdGot / cdTotal * 100) : 0) + '%"></i></span></span>' +
      '<span class="srr"><span class="srb"><b>' + c.esc(c.t('gear.codex.open')) + '</b></span></span></div>';
    /* ④ 库藏阁：整行 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('gear.stash', { n: w.stash.length, cap: SQ.Gear.stashCap(w, d, c.mods) })) +
      '</span><span class="s">' + c.esc(c.t('gear.stash.hint')) + '</span></div>';
    if (!w.stash.length) h += '<div class="lrow locked"><div class="meta">' + c.esc(c.t('gear.empty')) + '</div></div>';
    else h += w.stash.map(function (it, i) { return gearStashRow(c, it, w, i); }).join('');
    h += '<div class="strip"><span class="t">' + c.esc(c.t('gear.refine.strip.t')) + '</span>' +
      '<span class="v">' + c.esc(c.t('gear.refine.strip.v')) + '</span></div>';
    return h;
  }
  /* 百器录浮层（B5 · 帧四）：12 格双节；已录格点按 = 首获详情 toast；未录格点按 = 轻震 */
  function renderGearCodex(c) {
    var w = c.w, d = c.d;
    var seen = w.gearSeen || {};
    var spIds = (d.GEAR_SPECIALS || []).map(function (s) { return s.id; });
    var exIds = Object.keys(d.EXCLUSIVE_GEAR || {});
    var sGot = spIds.filter(function (x) { return seen[x] != null; }).length;
    var eGot = exIds.filter(function (x) { return seen['ex_' + x] != null; }).length;
    c.$('mgc-title').textContent = c.t('gear.codex.title');
    c.$('mgc-close').textContent = c.t('ui.close');
    var h = '<div class="sechead" style="margin-top:0"><span class="t">' + c.esc(c.t('gear.codex.sec.special')) +
      ' ' + sGot + '/' + spIds.length + '</span><span class="s">' + c.esc(c.t('gear.codex.hint1')) + '</span></div><div class="codexgrid">';
    spIds.forEach(function (id) {
      var ts = seen[id];
      if (ts == null) {
        h += '<div class="ccell lock" data-act="codexNudge"><span class="q">' + c.esc(c.t('ui.qmark')) +
          '</span><span class="cn">' + c.esc(c.t('gear.special.' + id)) + '</span></div>';
        return;
      }
      var hold = gearHolder(c, w, function (it) { return it.special === id && !it.exclusive; });
      h += '<div class="ccell got' + (hold ? '' : ' stale') + '" data-act="gcDetail" data-v="' + id + '" data-ts="' + ts + '">' +
        '<span class="cn">✦ ' + c.esc(c.t('gear.special.' + id)) + '</span>' +
        '<span class="ct">' + c.esc(specialEffText(c, id)) + '</span>' +
        '<span class="ct">' + c.esc(c.t('gear.codex.first', { t: c.timeAgo(ts) })) + '</span>' +
        '<span class="ct' + (hold ? '' : ' stale') + '">' + c.esc(gearHolderState(c, hold)) + '</span></div>';
    });
    h += '</div>';
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('gear.codex.sec.ex')) + ' ' + eGot + '/' + exIds.length +
      '</span><span class="s">' + c.esc(c.t('gear.codex.hint2')) + '</span></div><div class="codexgrid" style="grid-template-columns:repeat(2,1fr)">';
    exIds.forEach(function (gid) {
      var ts = seen['ex_' + gid];
      var car = c.carrier('gear', gid);
      var evName = car ? c.t('event.' + car.ev.id + '.name') : c.t('event.codex.unknown');
      if (ts == null) {
        /* 未遇：连载体奇遇名都只显事件名不显 story（与奇遇图鉴「？」同语义）；宝角标灰态 */
        h += '<div class="ccell lock" data-act="codexNudge"><span class="bz">' + c.esc(c.t('event.badge.exGear')) + '</span>' +
          '<span class="q">' + c.esc(c.t('ui.qmark')) + '</span><span class="cn">' + c.esc(c.t('gear.ex.' + gid)) + '</span>' +
          '<span class="ct">' + c.esc(c.t('gear.codex.via', { ev: evName }) + c.t('gear.codex.unmet')) + '</span></div>';
        return;
      }
      var hold = gearHolder(c, w, function (it) { return it.exclusive === gid; });
      var seenEv = car && (w.eventHistory.seen || {})[car.ev.id] != null;
      h += '<div class="ccell got exgot" data-act="gcDetail" data-v="ex_' + gid + '" data-ts="' + ts + '">' +
        '<span class="bz">' + c.esc(c.t('event.badge.exGear')) + '</span>' +
        '<span class="cn">' + c.esc(c.t('gear.ex.' + gid)) + '</span>' +
        '<span class="ct">' + c.esc(specialEffText(c, (d.EXCLUSIVE_GEAR[gid] || {}).special)) + '</span>' +
        '<span class="ct">' + c.esc(c.t('gear.codex.first', { t: c.timeAgo(ts) }) + ' · ' + gearHolderState(c, hold)) + '</span>' +
        (seenEv ? '<span class="ct src" data-act="recallEvent" data-v="' + c.esc(car.ev.id) + '">' +
          c.esc(c.t('gear.codex.via', { ev: evName })) + ' ›</span>' : '') + '</div>';
    });
    h += '</div>';
    h += '<p class="hint" style="margin-top:10px;line-height:1.7">' + c.esc(c.t('gear.codex.note')) + '</p>';
    c.$('mgc-body').innerHTML = h;
  }

  function openGearCodex(c) { renderGearCodex(c); c.$('modal-gearcodex').classList.remove('hide'); }

  /* act「openGearCodex」分支体（第册十批随片搬出，分派处留一行调用）*/
  function actOpenGearCodex(c) {
      openGearCodex(c); return;
  }

  /* act「gcDetail」分支体（第册十批随片搬出，分派处留一行调用）*/
  function actGcDetail(c, v, el) {
      /* 已录格点按 = 首获详情 toast（时间 + 现状；载体事件跳转在格内 src 链接） */
      var gidD = v, tsD = parseInt(el.dataset.ts, 10);
      var holdD = gidD.indexOf('ex_') === 0
        ? gearHolder(c, c.w, (function (gx) { return function (it) { return it.exclusive === gx; }; })(gidD.slice(3)))
        : gearHolder(c, c.w, (function (gx) { return function (it) { return it.special === gx && !it.exclusive; }; })(gidD));
      c.toast(c.t('gear.codex.detail', { date: c.fmtDate(tsD), ago: c.timeAgo(tsD), state: gearHolderState(c, holdD) }));
      return;
  }

  /* act「refineGear」分支体（第册十批随片搬出，分派处留一行调用）*/
  async function actRefineGear(c, v) {
      var wR = c.w, dR = c.d, mR = c.mods, idxR = parseInt(v, 10);
      var itR = (wR.stash || [])[idxR];
      if (!itR || itR.exclusive) return;
      var bodyR = c.t('gear.refine.confirm', {
        name: itR.name, tier: c.t('gear.tier.' + itR.tier),
        n: SQ.fmt(SQ.Gear.refineValue(itR, wR, dR, mR)), cur: c.t('resource.currency')
      });
      c.ask(c.t('gear.refine.title'), bodyR, async function () {
        /* 指纹回给引擎复查（库藏会被掉落与溢出炼化重排 ⇒ 序号错位 = 炼掉玩家没点的那件）；
         * 拒单一律不销毁、不加分文，屏上兜底走坊市同一句「这一单没有成交」 */
        var rR = await SQ.Actions.refineGear(c.s, idxR, SQ.Gear.itemSig(itR));
        if (rR && rR.ok) c.toast(c.t('toast.gear.salvage', {
          name: rR.item.name, tier: c.t('gear.tier.' + rR.item.tier), n: SQ.fmt(rR.value), cur: c.t('resource.currency')
        }));
        else if (rR && rR.reason === 'stale') c.toast(c.t('shop.fail.stale'));   /* F15：祭炼撞上架已换货 = 独立拒因，不借兜底句 */
        c.renderAll();
      });
      return;
  }

  SQ.UI = SQ.UI || {};
  SQ.UI.gear = { body: gearBody, 
    actOpenCodex: actOpenGearCodex, actGcDetail: actGcDetail, actRefine: actRefineGear };
})();
