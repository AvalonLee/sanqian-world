/* 法与器页的「法」段（功法卡片与段体 · 第册八批 2026-10-17 从 view/index.html 内联块整段搬出 · 正典 = UI 卷 §3.4a）
 * 范围 = 这一段的渲染（段体 / 卡片 / 图鉴卡 / 增益行 / 门槛文案 / 来路）+ 它的四条动作（入槽 / 换槽 / 点定主修 / 弃置）。
 * 「器」段与融合坛、悟道石留在内核，下一刀切；页框（renderArts / chip 条 / 概览条 / 段标）也还在内核，本件经 ctx 回头取用。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 **D7** 逐键对账）；形参名钉死 c ⇒ **本文件所有回调一律不许用 c**。
 * ⚠️ 本件由脚本机械改写 + 内核私有名「零裸用」扫描（名单从 index.html 顶格声明现取，不手抄），
 *    但真机收口照旧交给走查 `verify-ui-arts`（79 判）与 `verify-ui-alltabs`——上批那两处「静态全绿、屏上错」的教训记着。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 修习缺项含差值（B4：「相差 314」两段式 karma 门槛可视化；draft 帧一） */
  function artLackTexts(c, id) {
    var w = c.w, p = c.p;
    var a = p.artsMap()[id];
    if (!a) return [];
    var r = a.reqs || {};
    var karma = p.worldSystems && p.worldSystems.karmaOf ? p.worldSystems.karmaOf(w) : 0;
    var kTxt = (karma >= 0 ? '+' : '') + karma;
    var out = [];
    if (r.realm != null && w.realm < r.realm) {
      out.push(c.t('arts.lack.realmgap', { realm: c.t('realm.' + r.realm), n: r.realm - w.realm }));
    }
    if (r.attr) {
      var cur = Math.floor((w.attrs || {})[r.attr.id] || 0);
      if (cur < r.attr.min) {
        out.push(c.t('arts.lack.attr', { attr: c.t('attr.' + r.attr.id), min: r.attr.min, cur: cur, gap: r.attr.min - cur }));
      }
    }
    if (r.karmaMin != null && karma < r.karmaMin) {
      out.push(c.t('arts.lack.karmaMin', { min: r.karmaMin, cur: kTxt, gap: r.karmaMin - karma }));
    }
    if (r.karmaMax != null && karma > r.karmaMax) {
      out.push(c.t('arts.lack.karmaMax', { max: r.karmaMax, cur: kTxt, gap: karma - r.karmaMax }));
    }
    return out;
  }

  /* 获取途径行（B4：未获得显示教学行——收集牵引 = 知道去哪拿） */
  function obtainVia(c, a) {
    var o = a.obtain || {};
    if (o.type === 'zone') return c.t('arts.obtain.zone', { zone: c.t('combat.zone.' + o.zone) });
    if (['initial', 'shop', 'black', 'event', 'event_evil', 'event_rare'].indexOf(o.type) >= 0) {
      return c.t('arts.obtain.' + o.type);
    }
    return c.t('arts.obtain.event');
  }

  /* 独占剪影（B4：？？？ + 天阶 + 大道方向一句 skill.{id}.dao + 载体奇遇明示 + 法·灰角标） */
  function artSilhouette(c, id, a) {
    var car = c.carrier('art', id);
    var r = a.reqs || {}, reqTxt = [];
    if (r.realm != null) reqTxt.push(c.t('realm.' + r.realm));
    if (r.attr) reqTxt.push(c.t('attr.' + r.attr.id) + ' ≥ ' + r.attr.min);
    if (r.karmaMin != null) reqTxt.push(c.t('arts.req.karmaMin', { min: r.karmaMin }));
    if (r.karmaMax != null) reqTxt.push(c.t('arts.req.karmaMax', { max: r.karmaMax }));
    var h = '<div class="lrow sil">';
    h += '<div class="nm">' + c.esc(c.t('event.codex.unknown')) +
      ' <span class="tierbadge ' + c.artTier(a) + '">' + c.esc(c.t('skill.tier.' + a.tier)) + '</span>' +
      ' <span class="ebadge gray">' + c.esc(c.t('event.badge.exArt')) + '</span></div>';
    h += '<div class="meta daoline">' + c.esc(c.t('arts.dao.line', { txt: c.t('skill.' + id + '.dao') })) + '</div>';
    h += '<div class="meta hint">' + c.esc(c.t('arts.exclusive.via', {
      ev: car ? c.t('event.' + car.ev.id + '.name') : c.t('event.codex.unknown'),
      branch: car ? c.t('align.' + car.branch) : ''
    })) + '</div>';
    if (reqTxt.length) h += '<div class="meta hint">' + c.esc(c.t('arts.req.line', { req: reqTxt.join(' · ') })) + '</div>';
    return h + '</div>';
  }

  /* ③ 功法段（原 renderArts 主体逐段照搬：槽位抉择横幅 / 修习槽 6 格 /
   * 自行领悟 / 已学会 / 品阶×阵营分组切换 / 功法图鉴 / 融合坛） */
  function artsBody(c) {
    var w = c.w, m = c.mods, d = c.d, p = c.p;
    var am = p.artsMap();
    /* 「待重修」金标与渡劫 24h 横幅随第廿五批撤除：渡劫不再清功法等级 ⇒ 两者语义失效。
     * 词表键 `arts.reset` / `ui.arts.reset_hint` 按用户裁定保留不删（成孤儿，登记 N32 ②）。 */
    var h = '';
    /* 满槽抉择态横幅（批 2·B4）：正典文案 + 取消；**原位替换入口渲染在下方每个槽卡内**
     * （`slotReplace` + `data-r`）——此处只留提示不留按钮，是因为「替换哪一格」必须由玩家逐格点定。 */
    if (c.ui.slotPickFor) {
      h += '<div class="resetbanner">' + c.esc(c.t('arts.slotpick.title', { name: c.t('skill.' + c.ui.slotPickFor + '.name') })) +
        ' <button class="linkbtn" data-act="slotPickCancel">' + c.esc(c.t('ui.cancel')) + '</button></div>';
    }
    h += '<div class="kv"><span>' + c.esc(c.t('arts.slots', { n: w.artsSlots.length, cap: d.ARTS_SLOTS })) + ' · ' +
      c.esc(c.t('arts.shelf', { n: (w.shelf || []).length, cap: d.SHELF_CAP })) + '</span></div>';
    h += '<p class="hint" style="margin:0 0 8px">' + c.esc(c.t('arts.practice.hint')) + '</p>';
    h += '<div class="cards" style="grid-template-columns:repeat(3,1fr)">';
    var mainId = SQ.Arts.mainArt(w);   /* issue #3：主修由玩家点定（w.artsMain），未点定回落第 1 位 */
    for (var i = 0; i < d.ARTS_SLOTS; i++) {
      var id = w.artsSlots[i];
      /* 角标 + 定位锚（法柱 chip 滚动到此）读 mainArt，与引擎修习增速指向同源。
       * data-slot = 槽序号，供替换态定位与走查取数。 */
      var isMain = !!id && id === mainId;
      if (id) {
        var a = am[id];
        var lvS = w.artsLevels[id] || 0;
        var prS = SQ.Arts.practiceOf(w, id, d);
        /* 升级钮随「只有入槽的功法会长进」同口径留在槽卡上（第卌七批④c · 用户令）：
         * 满级时 upgradeCost 自返 null ⇒ 本行不渲染，不必再判一次等级。 */
        var costS = SQ.Arts.upgradeCost(w, p, d, id, m);
        var fxS = artFxLine(c, a, lvS);   /* 增益行与已学会卡同一函数、同一条式子（见 artFxLine 那注） */
        h += '<div class="tcard ' + (a.alignment === 'evil' ? 'neg' : a.alignment === 'right' ? 'pos' : '') + '"' +
             (isMain ? ' data-mainart="1"' : '') + ' data-slot="' + i + '">' +
             (isMain ? '<span class="corner maincorner">' + c.esc(c.t('arts.main')) + '</span>' : '') +
             '<div class="tname">' + c.esc(c.t('skill.' + id + '.name')) + '</div>' +
             '<div class="teff">Lv' + lvS + '</div>' +
             '<div class="tdesc">' + c.esc(a.special ? c.t('special.' + a.special.pool + '.name') : c.t('skill.' + id + '.desc')) + '</div>' +
             /* 属性加成行（第卌九批 · 用户令「修习槽中的功法对应的属性加成效果，也要显示出来」）：
              * 槽是「正在生效」的那六部，玩家最该在这儿看见吃到了什么——所以读的是同一部功法
              * 在**当前等级**的实际生效值，与已学会卡共用 `artFxLine`（两处显示、一条式子）。
              * 无词条的自创部返回空串 ⇒ 整行不渲染，不留一个空壳占位。 */
             (fxS ? '<div class="meta">' + c.esc(fxS) + '</div>' : '') +
             /* 精通迷你条（修行状态批）：主修增速最高（issue #3 起看玩家点定的那一格） */
             '<div class="tpract"><span class="pbar"><i style="width:' +
               (lvS >= d.ARTS_MAX_LV ? 100 : prS).toFixed(0) + '%"></i></span><span class="hint">' +
               c.esc(lvS >= d.ARTS_MAX_LV ? c.t('arts.max') : c.t('arts.practice', { p: Math.floor(prS) })) + '</span></div>' +
             (costS == null ? '' : '<div class="tacts-src"><button data-act="upgradeArt" data-v="' + c.esc(id) + '"' +
               (w.qi < costS ? ' disabled' : '') + '>' +
               c.esc(c.t('arts.upgrade.qi', { n: SQ.fmt(costS), res: c.t('resource.primary') })) + '</button></div>') +
             /* 满槽「原位替换」（批 2·B4 引擎支路 + 本批补渲染点）：抉择态下每格挂「替换」——
              * data-v = 待入槽功法、data-r = 被顶下的在槽功法，handler 走 Arts.slot 的 replaceId 分支。
              * 缺这一段 = 整条替换链不可达（引擎 + handler + 文案三件齐全、只无渲染点）：玩家只能
              * 「卸下再装」，新功法落到队列**尾部**，未点定主修的旧档会因此换人（issue #3 前的唯一语义）。 */
             (c.ui.slotPickFor ? '<div class="tacts-src"><button data-act="slotReplace" data-v="' +
               c.esc(c.ui.slotPickFor) + '" data-r="' + c.esc(id) + '">' + c.esc(c.t('arts.slotpick.replace')) +
               '</button></div>' : '') +
             /* 设主修入口（issue #3）：非主修的在槽功法逐格给一颗按钮，玩家不必再「全拆重装」 */
             (isMain ? '' : '<div class="tacts-src"><button data-act="setMainArt" data-v="' + c.esc(id) + '">' +
               c.esc(c.t('arts.main.set')) + '</button></div>') +
             '</div>';
      } else {
        h += '<div class="tcard"' + (i === 0 && !mainId ? ' data-mainart="1"' : '') + '><div class="tdesc" style="text-align:center;padding:14px 0">' +
             (i === 0 && !mainId ? c.esc(c.t('arts.main.empty')) : c.esc(c.t('arts.empty'))) + '</div></div>';
      }
    }
    h += '</div>';
    /* ── 自行领悟（自悟批 · 需求 §2）：在线修持中随机领悟市面传承功法，进度满（保底）必得一部 ── */
    (function () {
      var pct = SQ.Arts.selfLearnPct(w, d);
      var cands = SQ.Arts.selfLearnCands(w, p, d).length;
      /* ⚠️ 本支路局部 `pct` 是**进度百分数**（0~100 的数），与内核桥 `c.pct`（小数→"x%" 串）同名不同物，
       * 故这两行取局部、不许加 `c.`。改名会牵动上下文 ⇒ 就地注明，别靠下一个人的眼力。 */
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('arts.selflearn.sec')) + '</span>' +
           '<span class="s">' + c.esc(c.t('arts.selflearn.cands', { n: cands })) + '</span></div>';
      h += '<div class="tcard selflearn">' +
           '<div class="tpract"><span class="pbar"><i style="width:' + pct.toFixed(0) + '%"></i></span>' +
           '<span class="hint">' + c.esc(c.t('arts.selflearn.pct', { p: pct.toFixed(0) })) + '</span></div>' +
           '<div class="hint">' + c.esc(c.t(cands ? 'arts.selflearn.hint' : 'arts.selflearn.none')) + '</div>' +
           '</div>';
    })();
    /* ── 筛选条（体验批）：这排 chip 原先只管下方图鉴，现在**整段功法页**共用——已学会攒到三十余部后
     * 找一部只能翻。复用 `ui.artsGroup`/`ui.artsGroupVal` 两枚内存态（零新状态、零新词表键），
     * chip 位置随语义上移到「已学会」之前。选中值 null = 不筛（默认态整页不变）。 ── */
    var grp = c.ui.artsGroup;
    h += '<div class="grouper"><span class="gseg">' +
      '<span class="' + (grp === 'tier' ? 'on' : '') + '" data-act="artsGroup" data-v="tier">' + c.esc(c.t('arts.group.tier')) + '</span>' +
      '<span class="' + (grp === 'align' ? 'on' : '') + '" data-act="artsGroup" data-v="align">' + c.esc(c.t('arts.group.align')) + '</span></span>';
    (grp === 'tier' ? ['huang', 'xuan', 'di', 'tian'] : ['right', 'neutral', 'evil']).forEach(function (v) {
      h += '<span class="gchip' + (c.ui.artsGroupVal === v ? ' on' : '') + '" data-act="artsGroupVal" data-v="' + v + '">' +
        c.esc(grp === 'tier' ? c.t('arts.tierchar.' + v) : c.t('align.' + v)) + '</span>';
    });
    h += '</div>';
    /* ── 已学会（走查 v2.5 §4）：紧贴修习槽——装入/精通一屏可达（升级钮在第卌七批④c 移到槽卡） ── */
    var knownS = (w.artsKnown || []).slice().sort(function (x, y) {
      return ((w.artsSlots || []).indexOf(y) >= 0 ? 1 : 0) - ((w.artsSlots || []).indexOf(x) >= 0 ? 1 : 0);
    });
    if (c.ui.artsGroupVal) {
      knownS = knownS.filter(function (x) {
        return (grp === 'tier' ? am[x].tier : am[x].alignment) === c.ui.artsGroupVal;
      });
    }
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('arts.sec.known')) +
      ' · ' + knownS.length + '</span></div>';
    /* 筛空了 ≠ 没学过：只有**真的一部都没学会**才说「尚未学会」，否则这段留白（段标计数已说明是 0）。 */
    if (!knownS.length && !(w.artsKnown || []).length) h += '<div class="lrow locked"><div class="meta">' + c.esc(c.t('arts.known.empty')) + '</div></div>';
    /* 走查 v2.6 §2：卡片化——同行卡片数随窗口宽度自适应（auto-fill） */
    h += '<div class="cards artgrid">' + knownS.map(function (x) { return artCard(c, x, w); }).join('') + '</div>';
    /* ── 待修习架（第卌六批 · 用户反馈「坊市买功法后功法页看不见」）：买得 / 拾得但要求未达者在此。
     * 原先整页只有头部「待修习架 N/24」一个计数，清单要靠图鉴逐部点开 ⇒ 玩家只当货丢了。
     * 同一把 chip 筛选（与已学会 / 图鉴一致，不另立一套状态）；缺项文案复用 `artLackTexts`，
     * 弃置走既有 `salvageArt`（折算价与卡内同一取数口）。空集不渲染本段（不占版面、不说空话）。 ── */
    var shelfS = (w.shelf || []).filter(function (x) { return !!am[x]; });
    /* ⚠️ 先滤掉不在功法全录里的 id：旧档/退役功法会在 `shelf` 里留下认不出的 id，
     *    而下面既读 `am[x].tier`（筛选）又读缺项与折算价 ⇒ 裸读会把整页炸空（第卌批那形事故）。 */
    if (c.ui.artsGroupVal) {
      shelfS = shelfS.filter(function (x) {
        return (grp === 'tier' ? am[x].tier : am[x].alignment) === c.ui.artsGroupVal;
      });
    }
    if (shelfS.length) {
      /* 段标用「要求未达」而**不叫**「待修习架」：图鉴那几节的段标既有文案就是 `待修习架 · X字阶`
       * （`arts.sec.tier`/`arts.sec.align`，第册 B4 起如此），同页两个同名段标只会更糊。
       * 专名类 `shelfsec` / `shelfgrid` 供走查精确取数（裸 `.sechead` + 文案匹配会撞上图鉴那几节 = `.lawchips` 同型教训）。 */
      h += '<div class="sechead shelfsec"><span class="t">' + c.esc(c.t('arts.sec.shelf')) + ' · ' + shelfS.length + '</span></div>';
      h += '<div class="cards artgrid shelfgrid">' + shelfS.map(function (x) {
        return '<div class="lrow locked"><div class="meta"><b>' + c.esc(c.t('skill.' + x + '.name')) + '</b>' +
          '<span class="hint"> ' + c.esc(c.t('arts.tierchar.' + am[x].tier)) + ' · ' + c.esc(c.t('arts.codex.shelf')) + '</span>' +
          '<div class="hint">' + c.esc(artLackTexts(c, x).join(' ‖ ')) + '</div></div>' +
          '<div class="acts"><button data-act="salvageArt" data-v="' + x + '">' + c.esc(c.t('arts.discard')) + ' · +' +
          c.esc(SQ.fmt(SQ.Arts.salvageValue(w, p, d, x))) + ' ' + c.esc(c.t('resource.currency')) + '</button></div></div>';
      }).join('') + '</div>';
    }
    /* ── 功法图鉴（走查 v2.5 §4 + v2.8 §1：待修习架功法回归各品阶/阵营小节，弃置在卡内）── */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('arts.codex.title')) + '</span></div>';
    var groups = grp === 'tier' ? ['huang', 'xuan', 'di', 'tian'] : ['right', 'neutral', 'evil'];
    if (c.ui.artsGroupVal) groups = [c.ui.artsGroupVal];
    var allIds = Object.keys(am);
    groups.forEach(function (gv) {
      var ids = allIds.filter(function (x) { return grp === 'tier' ? am[x].tier === gv : am[x].alignment === gv; });
      if (!ids.length) return;
      var sil = [], ownedS = [], unownedS = [];
      ids.forEach(function (x) {
        if (!SQ.Arts.owned(w, x) && ((am[x].obtain || {}).type === 'event_locked')) { sil.push(x); return; }
        if (SQ.Arts.owned(w, x)) ownedS.push(x);
        else unownedS.push(x);
      });
      h += '<div class="sechead"><span class="t">' +
        c.esc(grp === 'tier' ? c.t('arts.sec.tier', { g: c.t('arts.tierchar.' + gv) }) : c.t('arts.sec.align', { g: c.t('align.' + gv) })) +
        '</span>' + (sil.length ? '<span class="s">' + c.esc(c.t('arts.sec.excl', { n: sil.length })) + '</span>' : '') + '</div>';
      sil.forEach(function (x) { h += artSilhouette(c, x, am[x]); });
      h += '<div class="cards">' + ownedS.concat(unownedS).map(function (x) { return artCodexCard(c, x, w); }).join('') + '</div>';
    });
    h += c.fuseAltar();
    return h;
  }

  /* 已学会卡（走查 v2.6 §2）：详情卡——名号/品阶/Lv/签名/滋养/精通 + 装入/移出/升级/散功 */
  /* 功法增益行（第卌九批起槽卡与已学会卡共用；此前只有 artCard 里那一份 = 两处要显示就得抄第二遍）。
   * 缩放口径与消费端 `mods.js` 逐字同源：`effectsFixed` 列内字段 Lv1 即全效、**不随等级**
   *（此前一律 ×lv ⇒ 太上忘情篇 Lv9 卡面写 −72%、引擎只吃 −8%）。
   * 等级起点批（2026-10-14 · 入门即 Lv1）后 Lv0 不可达 ⇒ 原「尚未生效」预告分支与三枚词表键随批删。 */
  function artFxLine(c, a, lv) {
    var fx = a.effectsFixed || [];
    return Object.keys(a.effects || {}).map(function (k) {
      var v = a.effects[k] * (fx.indexOf(k) >= 0 ? 1 : lv);
      return c.t('talent.field.' + k) + ' ' + (v >= 0 ? '+' : '−') + c.pct(Math.abs(v));
    }).join(' · ');
  }

  function artCard(c, id, w) {
    var d = c.d, p = c.p;
    var a = p.artsMap()[id];
    var slotted = (w.artsSlots || []).indexOf(id) >= 0;
    var lv = w.artsLevels[id] || 0;
    var pr = SQ.Arts.practiceOf(w, id, d);
    var h = '<div class="tcard ' + (a.alignment === 'evil' ? 'neg' : a.alignment === 'right' ? 'pos' : '') + '">';
    h += '<div class="tname">' + c.esc(c.t('skill.' + id + '.name')) +
      ' <span class="tierbadge ' + c.artTier(a) + '">' + c.esc(c.t('skill.tier.' + a.tier)) + '</span>' +
      (slotted ? '<span class="tierbadge t1">' + c.esc(c.t('zone.current')) + '</span>' : '') + '</div>';
    h += '<div class="hint">Lv' + lv + (lv >= d.ARTS_MAX_LV ? ' · ' + c.esc(c.t('arts.max')) : '') +
      /* 融合自创部**允许没有签名词条**（`fusion.js:243/272` 起 `special` 可为 null；真档实测：
       * 一部没继承到词条的 c1 就让整页抛 `reading 'pool'` 空白）⇒ 三处屏上读数全部认 null，
       * 判据 = 走查 `verify-ui-arts` S 组（S1 整页非空 ‖ S2 那张卡仍列 Lv/滋养 ‖ S3 不许出现「签名 ·」） */
      (a.special ? ' · ' + c.esc(c.t('special.' + a.special.pool + '.name')) : '') +
      ' · ' + c.esc(c.t('skill.nurture.' + a.attr)) + '</div>';
    /* 走查 v2.7 §3：功法带来的具体增益（当前等级实际生效值，多效果并列）——式子收在
     * `artFxLine` 一处，槽卡与已学会卡同读它（第卌九批：槽卡也要看得见加成，见该批注）。 */
    h += '<div class="meta">' + c.esc(artFxLine(c, a, lv)) + '</div>';
    if (lv < d.ARTS_MAX_LV) {
      h += '<div class="pbar"><i style="width:' + pr.toFixed(0) + '%"></i></div>' +
        '<div class="hint">' + c.esc(c.t('arts.practice', { p: Math.floor(pr) })) + '</div>';
    }
    h += '<div class="acts">';
    h += slotted
      ? '<button data-act="unslotArt" data-v="' + id + '">' + c.esc(c.t('arts.unequip')) + '</button>'
      : '<button data-act="slotArt" data-v="' + id + '">' + c.esc(c.t('arts.equip')) + '</button>';
    /* 升级钮本批起**不在这里**（第卌七批④c · 用户令「槽里六张卡就该有升级，已学会不必再给」）：
     * 引擎侧 SQ.Arts.tickPractice 只遍历 artsSlots ⇒ 未入槽的功法精通恒为 0，卡上的进度条与
     * 升级钮是同一处假在跑；升级口因此只留槽卡。handler `upgradeArt` 不变。 */
    if (!slotted && SQ.Arts.canSalvage(w, p, d, id)) {
      h += '<button data-act="salvageArt" data-v="' + id + '">' + c.esc(c.t('arts.salvage')) + '</button>';
    } else if (!slotted) {
      /* N20 接线：此前散功钮静默消失（初始自带 / 不可散功的功法玩家看不到任何解释） */
      h += '<span class="hint">' + c.esc(c.t('arts.salvage.lock')) + '</span>';
    }
    h += '</div></div>';
    return h;
  }

  /* 图鉴卡（走查 v2.6 §2）：已录=状态行；未获得=获取途径+缺项红字；全部只读 */
  function artCodexCard(c, id, w) {
    var d0 = c.d;
    var a = c.p.artsMap()[id];
    var known = (w.artsKnown || []).indexOf(id) >= 0;
    var shelf = (w.shelf || []).indexOf(id) >= 0;
    var lv = w.artsLevels[id] || 0;
    var via = obtainVia(c, a);
    var h = '<div class="tcard' + (known ? '' : ' dim') + '">';
    h += '<div class="tname">' + c.esc(c.t('skill.' + id + '.name')) +
      ' <span class="tierbadge ' + c.artTier(a) + '">' + c.esc(c.t('skill.tier.' + a.tier)) + '</span></div>';
    if (known) {
      h += '<div class="hint">' + c.esc(c.t('arts.codex.known', { lv: lv })) + '</div>';
    } else if (shelf) {
      h += '<div class="hint">' + c.esc(c.t('arts.codex.shelf')) + '</div>';
      /* 待修习架功法：复检未过，先弃置止损（走查 v2.8 §1——弃置动作随卡走） */
      h += '<div class="acts"><button data-act="salvageArt" data-v="' + id + '">' +
        c.esc(c.t('arts.discard')) + ' · +' + c.esc(SQ.fmt(SQ.Arts.salvageValue(w, c.p, d0, id))) + ' ' + c.esc(c.t('resource.currency')) + '</button></div>';
    } else {
      h += '<div class="hint">' + c.esc(c.t('arts.state.unowned', { via: via })) + '</div>';
      var lacks = artLackTexts(c, id);
      if (lacks.length) h += '<div class="hint" style="color:var(--bad)">' + c.esc(c.t('arts.state.lackline', { req: lacks.join(' · ') })) + '</div>';
    }
    h += '</div>';
    return h;
  }

  /* act「slotArt」分支体（第册八批随片搬出，分派处留一行调用）*/
  async function actSlot(c, v) {
        /* 满槽 → 进入替换选择模式（B4：点按入槽，满槽弹替换；原位替换保主修位语义） */
        var wSA = c.w;
        if ((wSA.artsSlots || []).length >= c.d.ARTS_SLOTS && (wSA.artsSlots || []).indexOf(v) < 0) {
          c.ui.slotPickFor = v;
          c.renderTab();
          return;
        }
        await SQ.Actions.slotArt(c.s, v);
        c.ui.slotPickFor = null;
        c.renderAll();
        return;
  }

  /* act「slotReplace」分支体（第册八批随片搬出，分派处留一行调用）*/
  async function actReplace(c, v, repId) {
        await SQ.Actions.slotArt(c.s, v, repId);
        c.ui.slotPickFor = null;
        c.renderAll();
        return;
  }

  /* act「setMainArt」分支体（第册八批随片搬出，分派处留一行调用）*/
  async function actSetMain(c, v) {
        var rvM = await SQ.Actions.setMainArt(c.s, v);
        if (!rvM || !rvM.ok) c.toast(c.t('arts.main.reject'));
        else if (!rvM.same) c.toast(c.t('arts.main.ok', { name: c.t('skill.' + rvM.id + '.name') }));
        c.renderAll();   /* 同值重复点也重渲染：屏上角标必须立刻回到真值，不留「点了没反应」 */
        return;
  }

  /* act「salvageArt」分支体（第册八批随片搬出，分派处留一行调用）*/
  async function actSalvage(c, v) {
        var wA = c.w, pA = c.p, dA = c.d, idA = v;
        if (!SQ.Arts.canSalvage(wA, pA, dA, idA)) return;
        var knownA = (wA.artsKnown || []).indexOf(idA) >= 0;
        var bodyA = c.t('arts.salvage.confirm', {
          act: c.t(knownA ? 'arts.salvage' : 'arts.discard'),
          name: c.t('skill.' + idA + '.name'), n: SQ.fmt(SQ.Arts.salvageValue(wA, pA, dA, idA)), cur: c.t('resource.currency')
        });
        c.ask(c.t(knownA ? 'arts.salvage' : 'arts.discard'), bodyA, async function () {
          var rA = await SQ.Actions.salvageArt(c.s, idA);
          if (rA) c.toast(c.t('arts.salvaged', { name: c.t('skill.' + idA + '.name'), n: SQ.fmt(rA.value), cur: c.t('resource.currency') }));
          c.renderAll();
        });
        return;
  }

  SQ.UI = SQ.UI || {};
  SQ.UI.arts = {
    body: artsBody, lack: artLackTexts, fxLine: artFxLine,
    actSlot: actSlot, actReplace: actReplace, actSetMain: actSetMain, actSalvage: actSalvage
  };
})();
