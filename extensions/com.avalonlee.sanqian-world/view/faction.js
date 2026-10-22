/* 势力页（Tab · 势力 · 第册卅九批 2026-10-18 从 view/index.html 整片搬出 · N34 第八刀 · 正典 = UI 卷 §3.4 + 势力全录卷）
 * 范围 = 这一页的渲染族（当前效力 / 名录 / 关系 chips / 职级实权双技能 / 门中供给 / 捐献 / 叛离两级弹窗）
        + 属于它的八条动作（facRelAll / joinFaction / defectGo / officePick / officePickCancel / officeDispatch /
          officeGuard / supplyBuy），分派顺序不动、内核那八行各剩一句转发。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；形参名钉死 c ⇒ 本文件所有回调一律不许用 c。
 *   搬前拆掉三处同名（在册教训「与桥键同名的局部量会被错加前缀 / 遮蔽桥」）：factionCard 的累加器 c → hc，
 *   dispCand 与 dispatchCandidates 的回调形参 c → cmp。
 * ⚠️ 门中供给那几颗丹的标签仍走 `SQ.UI.shop.pillAffix / pillCat`（第册六批立的「同一套标签两处共用」）：
 *   原先是**内核回头调坊市件**，本批之后变成**件对件**（递同一枚桥 `c`），内核不再插一手。
 * 本件随片搬走的两个内核私名：`runDefect`（叛投执行，只有 defectGo 一条动作用它）‖
 *   `dispatchCandidates`（调遣候选，只有本页用它）—— 件内互调，不进桥。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* ── 势力页（G16 · 势力批 v2.4 + 深化批 v1.23）：当前效力（职级/声望/捐献）+ 冲突横幅 + 委托 + 供给 + 16~20 张势力卡（固定池名门角标）── */
  function factionRelChips(c, w, f) {
    var chips = '';
    (w.factions || []).forEach(function (o) {
      if (o.id === f.id) return;
      var rel = f.rel[o.id] || 'neutral';
      if (rel === 'neutral' && !c.ui.facRelAll) return;   /* 默认只列友好/敌对，点「全部」展开 */
      chips += '<span class="relchip ' + rel + '">' + c.esc(o.name) +
        '<i>' + c.esc(c.t('faction.rel.' + rel)) + '</i></span>';
    });
    return chips;
  }
  function factionMembers(c, w, f) {
    var n = 0;
    for (var k in (w.factionNpcs || {})) if (w.factionNpcs[k] === f.id) n++;
    return n;
  }
  /* 固定势力的「我的门派」主页（B16-ac）：原势力页管理区整块搬到这里，由宗门页调用 */
  function renderHome(c) {
    var w = c.w, d = c.d;
    var cur = SQ.Factions.current(w);
    var h = '';
    if (cur) {
      var rank = SQ.Factions.rankOf(w, d, cur.id);
      var rep = SQ.Factions.repOf(w, cur.id);
      var th = (d.FACTION_RANKS || {}).TH || [0];
      var nextTh = rank < th.length - 1 ? th[rank + 1] : null;
      var pk = SQ.Factions.perkOf(w, d) || cur.perk;
      /* B16-q：当前效力按设计稿收成一条 .statestrip（势力名 + 职级/声望）+ 一行 .hintline
       * （增益 · 职位 · 护法态）——原先三块 .facbanner 竖排，把「我是谁 / 什么级别 / 能干什么」
       * 摊成三条同等重量的横条，页面一进来没有主次。 */
      var perkTxt = c.esc(c.t('talent.field.' + cur.perk.field)) + ' +' +
        (cur.perk.field === 'tribBonus' ? pk.v.toFixed(2) : Math.round(pk.v * 100) + '%') +
        (rank > 0 ? c.esc(' · ' + c.t('faction.rank.perk', { m: ((d.FACTION_RANKS || {}).PERK_MULT || [1])[rank] })) : '');
      h += '<div class="statestrip"><span class="s-v">' + c.esc(c.t('faction.page.cur', { name: cur.name })) +
        '</span><span class="s-x">' + c.esc(nextTh != null
          ? c.t('faction.rank.cur', { rank: c.t('faction.rank.' + rank), rep: rep, next: nextTh })
          : c.t('faction.rank.max', { rank: c.t('faction.rank.' + rank), rep: rep })) + '</span></div>';
      /* ── 职级实权（势力全录卷 §八 · B4）：职位行双段式「职级：{称号} · 职位：{职位}」（§8.1 同名警示——
       * 称号是名分线、职位是实权线，禁止裸称职位名）+ 两枚技能按钮各带 CD 态 ── */
      var office = SQ.Factions.officeOf(w, d, cur.id);
      var offCfg = d.FACTION_OFFICE || {};
      var offCd = offCfg.CD_MS;
      var fo = w.factionOffice || { dispatchAt: 0, guardAt: 0 };
      var nowO = Date.now();
      var dispCd = Math.max(0, (fo.dispatchAt || 0) + offCd - nowO);
      var guardCd = Math.max(0, (fo.guardAt || 0) + offCd - nowO);
      var officeTxt = c.t('faction.office.line', {
        txt: office
          ? c.t('faction.rank.' + rank) + ' · ' + c.t('faction.office.' + office)
          : c.t('faction.office.locked', { r: c.t('faction.rank.3'), office: c.t('faction.office.steward') })
      });
      h += '<div class="hintline">' + perkTxt + ' · ' + c.esc(officeTxt) +
        (w.tribulation && w.tribulation.officeGuard ? ' · ' + c.esc(c.t('faction.office.guard.armed')) : '') + '</div>';
      if (office) {
        var dispCand = dispatchCandidates(c, w, d);
        var dispReady = dispCand.some(function (cmp) { return cmp.canPick; });
        h += '<div class="sechead"><span class="t">' + c.esc(c.t('faction.sec.office')) + '</span></div>';
        h += '<div class="row" style="margin:6px 0 2px">';
        h += '<button style="flex:1" data-act="officePick"' + ((dispCd > 0 || !dispReady) ? ' disabled' : '') + '>' +
          c.esc(dispCd > 0 ? c.t('faction.office.dispatch.cd') : c.t('faction.office.dispatch')) + '</button>';
        if (office === 'elder') {
          h += '<button style="flex:1" class="' + (w.tribulation.officeGuard ? '' : 'primary') + '" data-act="officeGuard"' +
            (guardCd > 0 ? ' disabled' : '') + '>' +
            c.esc(guardCd > 0 ? c.t('faction.office.guard.cd') : c.t('faction.office.guard')) + '</button>';
        }
        h += '</div>';
        if (dispCd <= 0 && !dispReady) {
          h += '<p class="hint" style="margin:2px 0">' + c.esc(c.t('faction.office.dispatch.none')) + '</p>';
        }
        /* 调遣选择列表（§8.9）：头像位名称 + perk 预览 + 好感档；channel 型/炉鼎置灰注明 */
        if (c.ui.officePick) {
          h += '<div class="detailbox"><div class="kv"><span>' + c.esc(c.t('faction.office.dispatch.pick')) + '</span>' +
            '<button class="linkbtn" data-act="officePickCancel">' + c.esc(c.t('ui.cancel')) + '</button></div>';
          dispCand.forEach(function (cmp) {
            var nm = c.t('bond.' + cmp.id + '.name');
            var perkTxt = cmp.pk.field
              ? c.t('talent.field.' + cmp.pk.field) + ' ' + (cmp.pk.perTier > 0 ? '+' : '') + (Math.round(cmp.pk.perTier * cmp.tier * 1000) / 10) + '%'
              : c.t('faction.office.dispatch.chan');
            h += '<div class="kv"><span>' + c.esc(nm) + (cmp.tier >= 1 ? ' ' + c.bondTier(cmp.tier) : '') +
              ' <span class="hint">' + c.esc(perkTxt) + '</span></span>' +
              '<button data-act="officeDispatch" data-v="' + cmp.id + '"' + (cmp.canPick ? '' : ' disabled') + '>' +
              c.esc(c.t('faction.office.dispatch')) + '</button></div>';
            if (!cmp.canPick && cmp.reason) {
              h += '<div class="hint" style="margin:-4px 0 4px">' + c.esc(c.t(cmp.reason)) + '</div>';
            }
          });
          h += '</div>';
        }
      }
      /* 叛离入口（2026-10-05 可见性修复）：原入口只在势力卡底部——当前势力所在栏在页面深处
       * （魔道栏卡片位于 2500px 长页的 1100px 处），需长滚才见，玩家反馈「没看到叛离选项」。
       * 现提到「当前效力」区块独立一行（去向选择浮层紧随其下展开），与卡片内入口并存同触发。
       * 宗主锁定态沿用卡片口径（宗门不可弃，传位方可下山）。 */
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('faction.leave')) + '</span></div>';
      if (w.factionId === 'sect' && w.sect && !w.sect.succession) {
        h += '<div class="row" style="margin:8px 0 2px"><button style="flex:1" disabled>' +
          c.esc(c.t('sect.ui.leave.lock')) + '</button></div>';
      } else {
        h += '<div class="row" style="margin:8px 0 2px"><button class="danger" style="flex:1" data-act="leaveFaction">' +
          c.esc(c.t('faction.leave')) + '</button></div>';
      }
      /* 叛离去向选择（势力全录卷 §九 · B4 两级弹窗第一级）：敌对红标「叛投」+ 三行代价预览入口 */
      if (c.ui.leavePick) {
        h += '<div class="detailbox"><div class="kv"><span>' + c.esc(c.t('faction.defect.title')) + '</span>' +
          '<button class="linkbtn" data-act="leavePick">' + c.esc(c.t('ui.cancel')) + '</button></div>';
        h += '<div class="kv"><span>' + c.esc(c.t('faction.leave')) + '</span>' +
          '<button data-act="leavePlain">' + c.esc(c.t('faction.leave')) + '</button></div>';
        (w.factions || []).forEach(function (f) {
          if (f.id === cur.id) return;
          var relD = SQ.Factions.relationOf(w, cur.id, f.id);
          var enemyD = relD === 'enemy';
          h += '<div class="kv"><span>' + c.esc(f.name) +
            (enemyD ? ' <span class="tierbadge tboss">' + c.esc(c.t('faction.defect.enemytag')) + '</span>' : '') + '</span>' +
            '<button class="' + (enemyD ? 'primary' : '') + '" data-act="defectGo" data-v="' + f.id + '"' +
            (enemyD ? '' : ' disabled') + '>' + c.esc(c.t(enemyD ? 'faction.defect.title' : 'faction.cd.wait')) + '</button></div>';
        });
        h += '</div>';
      }
      /* 捐献三档（每 2h 窗口上限提示） */
      var don = w.factionDonate || { at: 0, used: 0 };
      var capD = (d.FACTION_DONATE || {}).WINDOW_CAP || 300;
      var inWin = Date.now() - (don.at || 0) <= ((d.FACTION_DONATE || {}).WINDOW_MS);
      var capLeft = inWin ? Math.max(0, capD - (don.used || 0)) : capD;
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('faction.donate')) + '</span></div>';
      h += '<div class="row" style="margin:6px 0 2px">';
      ((d.FACTION_DONATE || {}).TIERS || []).forEach(function (amt) {
        var repW = Math.min(Math.floor(amt / ((d.FACTION_DONATE || {}).STONES_PER_REP)), capLeft);
        var canPay = w.stones >= Math.min(amt, repW * ((d.FACTION_DONATE || {}).STONES_PER_REP));
        h += '<button style="flex:1" data-act="facDonate" data-v="' + amt + '"' +
          ((capLeft > 0 && canPay) ? '' : ' disabled') + '>' +
          c.esc(c.t('faction.donate.btn', { n: SQ.fmt(amt), rep: repW })) + '</button>';
      });
      h += '</div>';
      h += '<p class="hint" style="margin:2px 0">' + c.esc(c.t('faction.donate.hint', { cap: capD })) + '</p>';
      if (capLeft <= 0) h += '<p class="hint" style="margin:2px 0">' + c.esc(c.t('faction.donate.cap')) + '</p>';
    } else {
      h += '<div class="facbanner none"><span class="ft">' + c.esc(c.t('faction.page.none')) + '</span></div>';
    }
    /* 势力冲突横幅（势力全录卷 §七 战功制 · B4）：交战方 → 应战（无判定入场）；
     * 入场后 → 战功进度条（实时读记账，不可重复点击）+ 闭关不产战功提示；第三方 → 观望 */
    var war = w.factionWar;
    if (war && war.until > Date.now()) {
      var mySide = SQ.Factions.warSideOf(w);
      var meritNeed = SQ.Factions.meritNeedOf(w, d);
      /* B16-q：势力战横幅按设计稿改 .warstrip（朱砂小标「势力冲突」+ 正文 + 动作） */
      h += '<div class="warstrip"><span class="w-t">' + c.esc(c.t('faction.war.title')) +
        '</span><span class="w-v">' +
        c.esc(c.t('faction.war.banner', {
          a: SQ.Factions.nameOf(w, war.aId), b: SQ.Factions.nameOf(w, war.bId),
          t: c.fmtLeft(war.until - Date.now())
        })) + '</span>' +
        (war.joined === 'in'
          ? '<span class="w-v">' + c.esc(c.t('faction.war.merit.prog', { m: war.merit || 0, n: meritNeed })) + '</span>'
          : (mySide
            ? '<button class="primary" data-act="warJoin">' + c.esc(c.t('faction.war.join')) + '</button>'
            : '<span class="w-v hint">' + c.esc(c.t('faction.war.watch')) + '</span>')) + '</div>';
      if (war.joined === 'in') {
        h += '<div class="bar slim"><i style="width:' +
          Math.min(100, ((war.merit || 0) / Math.max(1, meritNeed)) * 100).toFixed(1) + '%"></i></div>';
        if ((w.mode || 'seclude') === 'seclude') {
          h += '<p class="hint" style="margin:2px 0">' + c.esc(c.t('faction.war.merit.seclude')) + '</p>';
        }
      }
    }
    /* 冲突结果卡残留期（§7.4）：结算已出的 warResult 传闻卡在传闻栏展示，此处不重复 */
    /* 门中委托（势力全录卷 §四）——第卅九批改形：单槽 → **板面最多 3 张不同类型**
     * （`w.factionQuests` 数组，交付按 type 寻址；补单仍吃 factionQuestCd 30 分钟闸）。 */
    if (cur) {
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('faction.quest.title')) + '</span></div>';
      var qlist = (w.factionQuests || []).filter(function (q) { return q && q.expireAt > Date.now(); });
      if (qlist.length) {
        qlist.forEach(function (q) {
          var pr = SQ.Factions.questProgress(w, c.p, d, q);
          /* B16-q：委托卡 → 设计稿 .lrow 整行（名号 / 进度与赏金 / 交付钮 + 余时） */
          h += '<div class="lrow"><div class="l-n">' +
            c.esc(c.t('faction.quest.' + q.type, { n: SQ.fmt(q.target) })) + '</div>' +
            '<div class="l-d">' + c.esc(c.t('faction.quest.prog', { cur: SQ.fmt(pr.cur), target: SQ.fmt(pr.target) })) +
            ' · ' + c.esc(c.t('faction.quest.reward', { rep: q.rep, stones: q.stones ? ' + ' + SQ.fmt(q.stones) + ' ' + c.t('resource.currency') : '' })) + '</div>' +
            '<div class="l-r"><button class="' + (pr.done ? 'primary' : '') + '" data-act="questClaim" data-v="' + c.esc(q.type) + '"' +
            (pr.done ? '' : ' disabled') + '>' + c.esc(c.t('faction.quest.claim')) + '</button><br>' +
            c.esc(c.t('faction.quest.left', { t: c.fmtLeft(q.expireAt - Date.now()) })) + '</div></div>';
        });
      } else {
        h += '<p class="hint" style="padding:6px 0">' + c.esc(c.t('faction.quest.none')) + '</p>';
      }
      /* 门中供给（势力全录卷 §六） */
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('faction.supply.title')) + '</span></div>';
      var rankC = SQ.Factions.rankOf(w, d, cur.id);
      var repC = SQ.Factions.repOf(w, cur.id);
      h += '<div class="matgrid">';
      var mSup = c.mods;   /* 一次取全乘区，供下面四个 SKU 的供给价共用（审计 #6：别在循环里逐件重算 Mods.collect） */
      (d.FACTION_SUPPLY || []).forEach(function (si) {
        var pill = null;
        (d.PILLS || []).forEach(function (p2) { if (p2.id === si.pill) pill = p2; });
        if (!pill) return;
        var costS = SQ.Shop.supplyPriceOf(pill, w, d, mSup);   /* 与引擎 buySupply 同一个取数口（审计 #8） */
        var onCd = Date.now() - ((w.factionSupply || {})[si.sku] || 0) < (d.FACTION_SUPPLY_CD_MS);
        var lockRank = rankC < si.rank, lockRep = repC < si.rep, lockSt = w.stones < costS;
        var btnTxt = onCd ? c.t('faction.supply.cd') : lockRank ? c.t('faction.supply.locked', { rank: c.t('faction.rank.' + si.rank) })
          : c.t('faction.supply.cost', { rep: si.rep, n: SQ.fmt(costS) });
        /* B16-q：卡片网格 → 设计稿 .matrow 整行；名称与丹标签在左、说明中段、价目与请回钮在右 */
        h += '<div class="matrow"><span class="m-n">' + c.esc(c.t('faction.supply.sku.' + si.sku)) +
          SQ.UI.shop.pillAffix(c, pill) + SQ.UI.shop.pillCat(c) + '</span>' +
          '<span class="m-d">' + c.esc(c.t('pill.' + si.pill + '.desc')) + '</span>' +
          '<button data-act="supplyBuy" data-v="' + si.sku + '"' +
          ((onCd || lockRank || lockRep || lockSt) ? ' disabled' : '') + '>' + c.esc(btnTxt) + '</button></div>';
      });
      h += '</div>';
    }
    if ((w.factionCdUntil || 0) > Date.now()) {
      h += '<p class="hint">' + c.esc(c.t('faction.cd', { t: c.fmtDur(Math.max(0, w.factionCdUntil - Date.now())) })) + '</p>';
    }
    /* B16-ac：日常管理整块挂到宗门页（势力页只做目录 + 详情） */
    c.$('tab-sect').innerHTML = h;
  }

  /* ── 势力目录（B16-ac）：筛选 + 整行点击看详情；日常管理已移宗门页 ── */
  function renderFaction(c) {
    if (c.ui.facPick) return renderDetail(c, c.ui.facPick);
    var w = c.w, d = c.d;
    var cur = SQ.Factions.current(w);
    var h = '<p class="hint" style="margin:6px 0 2px">' + c.esc(c.t('faction.page.hint')) + '</p>';
    var camp = c.ui.facCamp || 'all';
    var cnt = { all: (w.factions || []).length, right: 0, neutral: 0, evil: 0 };
    (w.factions || []).forEach(function (f) { if (cnt[f.align] != null) cnt[f.align]++; });
    h += '<div class="chipsrow facchips">' + [
      { k: 'all', label: c.t('arts.group.all') },
      { k: 'right', label: c.t('align.right') },
      { k: 'neutral', label: c.t('align.neutral') },
      { k: 'evil', label: c.t('align.evil') }
    ].map(function (x) {
      return '<button type="button" class="' + (camp === x.k ? 'on' : '') + '" data-act="facCamp" data-v="' + x.k + '">' +
        c.esc(x.label) + ' ' + cnt[x.k] + '</button>';
    }).join('') + '</div>';
    h += '<div class="faclist">';
    (w.factions || []).filter(function (f) { return camp === 'all' || f.align === camp; })
      .forEach(function (f) { h += factionCard(c, w, f, cur, true); });
    h += '</div>';
    c.$('tab-faction').innerHTML = h;
  }
  /* 单家势力详情：介绍 / 掌门 / 关系 / 入伙动作（日常管理在宗门页） */
  function renderDetail(c, id) {
    var w = c.w;
    var f = SQ.Factions.byId(w, id);
    if (!f) { c.ui.facPick = null; return renderFaction(c); }
    var cur = SQ.Factions.current(w);
    var isCur = cur && cur.id === f.id;
    var mst = f.fixed && SQ.Jianghu ? SQ.Jianghu.masterOf(c.p, f.id) : null;
    var eld = f.fixed && SQ.Jianghu ? SQ.Jianghu.elderOf(c.p, f.id) : null;
    var h = '<div class="pagehead split"><button class="linkbtn" data-act="facBack">‹ ' + c.esc(c.t('faction.system')) + '</button></div>';
    h += '<div class="curzone"><div class="cz-top"><div>' +
      '<div class="cz-name">' + c.esc(f.name) +
      (f.fixed ? ' <span class="tierbadge t1">' + c.esc(c.t('faction.fixed.tag')) + '</span>' : '') +
      (isCur ? ' <span class="tierbadge t1">' + c.esc(c.t('faction.joined')) + '</span>' : '') + '</div>' +
      '<div class="cz-meta">' + c.esc(c.t('align.' + f.align)) + ' · ' + c.esc(c.t('faction.members', { n: factionMembers(c, w, f) })) + '</div></div></div>' +
      '<p class="fd">' + c.esc(c.t(f.desc)) + '</p>' +
      (mst && eld ? '<p class="fd">' + c.esc(c.t('faction.master.line', { name: mst.nm, realm: c.t('realm.' + mst.rlm), elder: eld.nm })) + '</p>' : '') +
      '<div class="fperk">' + c.esc(c.t('faction.perk')) + ' · <b>' + c.esc(c.t('talent.field.' + f.perk.field)) + ' +' +
      (f.perk.field === 'tribBonus' ? f.perk.v.toFixed(2) : Math.round(f.perk.v * 100) + '%') + '</b></div>' +
      '<div class="frel"><span class="lab">' + c.esc(c.t('faction.relations')) + '</span><span class="chipsx">' +
      factionRelChips(c, w, f) + '</span></div></div>';
    var isSectLord = w.factionId === 'sect' && w.sect && !w.sect.succession;
    if (isCur) {
      h += '<button class="primary" data-act="tab" data-v="sect" style="width:100%;margin-top:12px">' +
        c.esc(c.t('sect.system')) + ' ›</button>';
    } else if (!w.factionId) {
      var cdLeft = (w.factionCdUntil || 0) > Date.now();
      h += '<button class="primary" data-act="joinFaction" data-v="' + f.id + '"' + (cdLeft ? ' disabled' : '') +
        ' style="width:100%;margin-top:12px">' + c.esc(c.t('faction.join')) + '</button>';
    } else if (isSectLord) {
      h += '<button disabled style="width:100%;margin-top:12px">' + c.esc(c.t('sect.ui.leave.lock')) + '</button>';
    } else {
      var relD = SQ.Factions.relationOf(w, w.factionId, f.id);
      var enemyD = relD === 'enemy';
      h += '<button class="' + (enemyD ? 'primary' : '') + '" data-act="defectGo" data-v="' + f.id + '"' +
        (enemyD ? '' : ' disabled') + ' style="width:100%;margin-top:12px">' +
        c.esc(c.t(enemyD ? 'faction.defect.title' : 'faction.cd.wait')) + '</button>';
      h += '<p class="hint" style="margin-top:6px">' + c.esc(c.t('faction.leave')) + ' → ' + c.esc(c.t('sect.system')) + '</p>';
    }
    c.$('tab-faction').innerHTML = h;
  }

  /* 势力卡（走查 v2.5 §1 抽出 + 深化批 v1.23 + 第册一百一十七批分层）：名称那一行仍不带阵营字，
   * 但**身份行（`.fm`）现在写阵营**——默认「全部」筛选态下屏上原先没一处说明这家是正还是邪；
   * 固定势力挂「名门」角标；当前效力卡显示职级放大后的 perk 实效 */
  function factionCard(c, w, f, cur, dir) {
    var isCur = cur && cur.id === f.id;
    var perkV = f.perk.v;
    if (isCur) {
      var pkC = SQ.Factions.perkOf(w, c.d);
      if (pkC) perkV = pkC.v;
    }
    var perkTxt = c.t('talent.field.' + f.perk.field) + ' +' +
      (f.perk.field === 'tribBonus' ? perkV.toFixed(2) : Math.round(perkV * 100) + '%');
    var cdLeft = (w.factionCdUntil || 0) > Date.now();
    var rankC = isCur ? SQ.Factions.rankOf(w, c.d, f.id) : -1;
    /* 江湖名录取数（第卌七批）：固定势力在卡上写清「掌门 / 太上」是谁——名录认不出就不写这一行，
     * 视图不编名字（同第卌四批「不编一个假境界出来」那条纪律）。第册一百一十七批起这一行自有类
     * `.fpeople`（原先与介绍同为 `.fd` ⇒ 两者同字号同色，读不出谁是身份谁是描述）。 */
    var mst = f.fixed && SQ.Jianghu ? SQ.Jianghu.masterOf(c.p, f.id) : null;
    var eld = f.fixed && SQ.Jianghu ? SQ.Jianghu.elderOf(c.p, f.id) : null;
    var mstLine = (mst && eld) ? '<div class="fd fpeople">' + c.esc(c.t('faction.master.line', {
      name: mst.nm, realm: c.t('realm.' + mst.rlm), elder: eld.nm })) + '</div>' : '';
    /* 分层顺序（第册一百一十七批 · 用户令「信息挤在一起、没有轻重」）：名号 ‖ 身份（阵营 · 门众）
     * ‖ 增益（决策要看的那个数）‖ 掌门·太上 ‖ 介绍（降权小字）‖ 关系 chips。
     * 阵营此前只由筛选 chip 表达——默认「全部」态下屏上没一处说明这家是正还是邪，现补进身份行；
     * 名称那一行仍不带阵营字（line 298 那条旧口径未破）。 */
    var hc = '<div class="faccard facrow' + (isCur ? ' cur' : '') + '"' +
      (dir ? ' data-act="facDetail" data-v="' + f.id + '"' : '') + '>' +
      '<div class="fh"><span class="fn">' + c.esc(f.name) +
      (f.fixed ? '<span class="tierbadge t1">' + c.esc(c.t('faction.fixed.tag')) + '</span>' : '') +
      (isCur ? '<span class="tierbadge t1">' + c.esc(c.t('faction.joined')) + '</span>' : '') +
      (isCur && rankC > 0 ? '<span class="tierbadge t2">' + c.esc(c.t('faction.rank.' + rankC)) + '</span>' : '') +
      '</span>' +
      '<span class="fm">' + c.esc(c.t('align.' + f.align)) + ' · ' +
      c.esc(c.t('faction.members', { n: factionMembers(c, w, f) })) + '</span></div>' +
      '<div class="fperk">' + c.esc(c.t('faction.perk')) + ' · <b>' + c.esc(perkTxt) + '</b></div>' + mstLine +
      '<div class="fd fdesc">' + c.esc(c.t(f.desc)) + '</div>' +
      '<div class="frel"><span class="lab">' + c.esc(c.t('faction.relations')) + '</span>' +
      '<span class="chipsx">' + factionRelChips(c, w, f) + '</span></div>';
    var isSectLord = w.factionId === 'sect' && w.sect && !w.sect.succession;
    if (dir) return hc + '</div>';   /* 目录行只负责打开详情 */
    if (!isCur) {
      /* 择门批（需求 3）：已身在一门时，其余势力加入按钮一律置灰——势力唯一归属 */
      var joinDis = cdLeft || !!w.factionId;
      hc += '<div class="acts"><button class="primary" data-act="joinFaction" data-v="' + f.id + '"' + (joinDis ? ' disabled' : '') + '>' +
        c.esc(isSectLord ? c.t('faction.join.sectlock') : c.t('faction.join')) + '</button></div>';
    } else if (isSectLord) {
      hc += '<div class="acts"><button disabled>' + c.esc(c.t('sect.ui.leave.lock')) + '</button></div>';
    } else {
      hc += '<div class="acts"><button data-act="leaveFaction">' + c.esc(c.t('faction.leave')) + '</button></div>';
    }
    return hc + '</div>';
  }

  /* 叛投敌对执行（势力全录卷 §九 · B4）：takeIntel = 第二级献秘确认结果 */
  async function runDefect(c, fid, takeIntel) {
    var rD = await SQ.Actions.defectFaction(c.s, fid, takeIntel);
    if (rD && rD.ok) {
      c.toast(c.t('faction.defect.karma', { name: rD.to.name }));
    } else if (rD) {
      c.toast(c.t('faction.defect.fail.' + rD.reason));
    }
    c.renderAll();
  }

  /* 调遣同门候选（势力全录卷 §8.2 · B4）：同势力 + 好感 ≥1 + field 型 perk + 非炉鼎采补中；
   * canPick=false 附置灰原因 key（chan = channel 型/炉鼎，affinity = 好感未至） */
  function dispatchCandidates(c, w, d) {
    var out = [];
    var fid = w.factionId;
    if (!fid) return out;
    var luSet = SQ.Bonds ? SQ.Bonds.ludingSet(w) : {};
    (((d || c.d).COMPANIONS) || []).forEach(function (cmp) {
      if ((w.factionNpcs || {})[cmp.id] !== fid) return;
      var pk = cmp.perk || {};
      var fieldOk = !!(pk.field && pk.perTier && SQ.Mods.FIELDS.indexOf(pk.field) >= 0);
      var tier = SQ.Bonds ? SQ.Bonds.tierOf(w, cmp.id, d || c.d) : 0;
      var luding = !!luSet[cmp.id];
      out.push({
        id: cmp.id, pk: pk, tier: tier,
        canPick: fieldOk && !luding && tier >= 1,
        reason: (!fieldOk || luding) ? 'faction.office.dispatch.chan'
          : (tier < 1 ? 'faction.office.dispatch.affinity' : null)
      });
    });
    return out;
  }
  /* ── 这一页的八条动作（第册六批口径：一片 = 一页的呈现 + 它的动作；分派留在内核、顺序不动，
   * 内核那八行各自只剩一句 await SQ.UI.faction.actXxx(ctx(), v)）── */
  function actRelAll(c) { c.ui.facRelAll = !c.ui.facRelAll; c.renderTab(); }
  function actDetail(c, id) { c.ui.facPick = id || null; c.renderTab(); }
  function actBack(c) { c.ui.facPick = null; c.renderTab(); }

  /* B15-j：阵营筛选（纯视图态，不落盘；切页保持当前筛选） */
  function actCamp(c, v) { c.ui.facCamp = v || 'all'; c.renderTab(); }
  async function actJoin(c, v) {
    var fJ = SQ.Factions.byId(c.w, v);
    if (!fJ) return;
    /* 择门批（需求 3）：已在一门时不可另投（按钮已置灰，此处兜底 + 提示） */
    if (c.w.factionId) { c.toast(c.t('faction.join.occupied')); return; }
    c.ask(c.t('faction.join'), c.t('faction.confirm.join', { name: fJ.name }), async function () {
      var resJ = await SQ.Actions.joinFaction(c.s, v);
      if (resJ && resJ.ok) { c.ui.facPick = null; c.toast(c.t('faction.log.join', { name: fJ.name })); }
      else if (resJ && resJ.reason === 'sect') c.toast(c.t('faction.join.sectlock'));
      else if (resJ && resJ.reason === 'occupied') c.toast(c.t('faction.join.occupied'));
      c.renderAll();
    });
  }
  function actDefect(c, v) {
    var wD = c.w, curD = SQ.Factions.current(wD), tgtD = SQ.Factions.byId(wD, v);
    if (!curD || !tgtD) return;
    c.ui.leavePick = false;
    c.ask(c.t('faction.defect.title'), c.t('faction.defect.confirm', { from: curD.name, to: tgtD.name }), function () {
      c.ask(c.t('faction.defect.intel'), c.t('faction.defect.intel.ask'), function () { runDefect(c, v, true); },
        function () { runDefect(c, v, false); });
    });
  }
  /* 职级实权双技能（势力全录卷 §八 · B4）：调遣 = 选择列表；门中护法 = 直接发动 */
  function actOfficePick(c) { c.ui.officePick = !c.ui.officePick; c.renderTab(); }
  function actOfficePickCancel(c) { c.ui.officePick = false; c.renderTab(); }
  async function actDispatch(c, v) {
    c.ui.officePick = false;
    var rO = await SQ.Actions.dispatchFellow(c.s, v);
    if (rO && rO.ok) {
      c.toast(c.t('faction.office.dispatch.ok', {
        name: c.t('bond.' + rO.npcId + '.name'),
        field: c.t('talent.field.' + rO.field),
        v: (rO.value > 0 ? '+' : '-') + (Math.round(Math.abs(rO.value) * 1000) / 10) + '%'
      }));
    } else if (rO) c.toast(c.t('faction.office.fail.' + rO.reason));
    c.renderAll();
  }
  async function actGuard(c) {
    var rG = await SQ.Actions.guardArm(c.s);
    if (rG && rG.ok) c.toast(c.t('faction.office.guard.ok'));
    else if (rG) c.toast(c.t('faction.office.fail.' + rG.reason));
    c.renderAll();
  }
  async function actSupply(c, v) {
    var rS = await SQ.Actions.buySupply(c.s, v);
    if (rS && rS.ok) c.toast(c.t('faction.supply.bought', { name: c.t('faction.supply.sku.' + v) }));
    else if (rS) c.toast(c.t('faction.supply.fail.' + rS.reason));
    c.renderAll();
  }

  SQ.UI = SQ.UI || {};
  SQ.UI.faction = { render: renderFaction, home: renderHome, actDetail: actDetail, actBack: actBack,
    actRelAll: actRelAll, actCamp: actCamp, actJoin: actJoin,
    actDefect: actDefect, actOfficePick: actOfficePick, actOfficePickCancel: actOfficePickCancel,
    actDispatch: actDispatch, actGuard: actGuard, actSupply: actSupply };
})();
