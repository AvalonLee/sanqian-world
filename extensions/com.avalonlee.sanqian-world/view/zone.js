/* G19 秘境页 + 洞天福地 + 境界说明浮层（秘境洞天卷 ‖ 境界一览 · 第册四十二批 2026-10-18 从 view/index.html 整片搬出 · N34 第十刀）
 * 范围 = 秘境页渲染族（`render` 含区内 `zoneRow`）+ 洞天福地三件（`caveDex` 含区内 `caveReqChips` / `caveFacRows`）+ 境界一览（`realmInfo`）。
 * 留在内核的两件，各按「动作属于哪套机器」判：`openCave` 走的是页签机器（switchTab ‖ ui.tab ‖ 红点消账），`openRealmInfo` 是浮层开关 + 关闭监听。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；本件**桥零新增**（`$` ‖ `t` ‖ `esc` ‖ `ui` ‖ `w` ‖ `p` ‖ `d` ‖ `mods` ‖ `timeLeft` ‖ `fmtDur` 全在册）。
 * ⚠️ 形参改名的那族：福地对象原本就叫 `c` ⇒ 一律改称 `cv`（桥占了 `c` 这个位置，这是在册硬口径「外置件不许拿 c 当回调形参」的同一件事）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function caveReqChips(c, cv, chk) {
    var w = c.w, rq = cv.reqs || {};
    var out = [];
    /* 隐世福地（v2.0 obtain 门控）：未持有 → 显示缘法条件红绿 chip；已持有 → 视同免费 */
    if (cv.obtain && !SQ.Cave.owned(w, cv.id)) {
      var met = SQ.Cave.obtainMet(w, c.p, c.d, cv.obtain);
      var otxt = cv.obtain.type === 'factionRank'
        ? c.t('cave.obtain.factionRank', { name: c.t('faction.rank.' + cv.obtain.rank) })
        : c.t('cave.obtain.codex', { n: cv.obtain.seen });
      out.push('<span class="' + (met ? 'ok' : 'no') + '">' + c.esc(c.t('cave.tag.hidden') + ' · ' + otxt) + '</span>');
      return out.join('');
    }
    if (!rq.realmMin && rq.zoneCleared == null && !rq.stonesCost) {
      return '<span class="ok">' + c.esc(c.t('cave.req.free')) + '</span>';
    }
    if (rq.realmMin != null) {
      out.push('<span class="' + (w.realm >= rq.realmMin ? 'ok' : 'no') + '">' +
        c.esc(c.t('cave.req.realm', { realm: c.t('realm.' + rq.realmMin) })) + '</span>');
    }
    if (rq.zoneCleared != null) {
      var zok = (w.cleared || []).indexOf(rq.zoneCleared) >= 0;
      out.push('<span class="' + (zok ? 'ok' : 'no') + '">' +
        c.esc(c.t('cave.req.zone', { zone: c.t('combat.zone.' + rq.zoneCleared) })) + '</span>');
    }
    if (rq.stonesCost) {
      /* 已持有则不再校验灵石（所有权语义，引擎卷 §2.3） */
      var sok = SQ.Cave.owned(w, cv.id) || w.stones >= rq.stonesCost;
      out.push('<span class="' + (sok ? 'ok' : 'no') + '">' +
        c.esc(c.t('cave.req.stones', { n: SQ.fmt(rq.stonesCost) })) + '</span>');
    }
    return out.join('');
  }
  /* 附属设施行（福地池卷 §四）：仅已持有福地渲染；等级 + 效果恒显，
   * 营建/扩建按钮只在当前驻留福地出现（非驻留福地只读，无升级选项）。 */
  function caveFacRows(c, w, d, cv, isCur) {
    var fac = (w.cave && w.cave.fac && w.cave.fac[cv.id]) || {};
    var h = '<div class="cavefac"><div class="hint" style="margin:4px 0 2px">' +
      c.esc(c.t('cave.fac.title')) + (isCur ? ' · <span style="color:var(--good)">' + c.esc(c.t('cave.fac.active')) + '</span>'
        : ' · <span class="hint">' + c.esc(c.t('cave.fac.idle')) + '</span>') + '</div>';
    (d.CAVE_FACILITIES || []).forEach(function (fd) {
      var lv = fac[fd.id] || 0;
      var maxLv = d.CAVE_FAC_MAX_LV || 3;
      var effNow = fd.field === 'tribBonus' ? '+' + (fd.per * lv).toFixed(2)
        : (fd.per * lv * 100).toFixed(1) + '%';
      var metaTxt = c.t('talent.field.' + fd.field) + ' +' + effNow.replace('+', '');
      /* 灵田材料轴（炼丹卷 §2.4）：产出说明由炼丹炼器页迁入，驻留 Lv≥1 时每 6 游戏月入账 1~4 枚本区材料 */
      if (fd.id === 'lingtian') metaTxt += ' · ' + c.t('cave.fac.lingtian.mat');
      h += '<div class="facrow"><span class="nm">' + c.esc(c.t('cave.fac.' + fd.id + '.name')) +
        ' <span class="hint">Lv' + lv + '</span></span>' +
        '<span class="meta">' + c.esc(metaTxt) + '</span>';
      if (!isCur) {
        h += '<span class="hint">' + c.esc(c.t('cave.fac.onlycur')) + '</span>';
      } else if (lv >= maxLv) {
        h += '<button disabled>' + c.esc(c.t('cave.fac.max')) + '</button>';
      } else {
        var cost = (d.CAVE_FAC_COST || [])[lv] || 0;
        h += '<button class="' + (w.stones >= cost ? 'primary' : '') + '" data-act="caveBuild" data-v="' + cv.id + '" data-f="' + fd.id + '"' +
          (w.stones >= cost ? '' : ' disabled') + '>' +
          c.esc(c.t(lv === 0 ? 'cave.fac.build' : 'cave.fac.upgrade', { n: SQ.fmt(cost) })) + '</button>';
      }
      h += '</div>';
    });
    return h + '</div>';
  }
  /* 洞天福地图鉴卡列（合并批：内联于「秘境洞天」页）——十三福地四态卡 + 缺项 chips + 叙事折叠 + 附属设施。
   * 当前驻留福地置顶为通栏 hero（与秘境页「当前秘境 hero」同构）；别院角标按福地表原序判定，
   * 不受展示排序影响。 */
  function caveDexHTML(c, left, withFac) {
    var w = c.w, p = c.p, d = c.d;
    var h = '';
    var list = SQ.Cave.list(p);
    var seenMult = {}, branchIds = {};
    list.forEach(function (cv) {
      if (!cv.obtain && seenMult[cv.mult.toFixed(2)]) branchIds[cv.id] = 1;
      seenMult[cv.mult.toFixed(2)] = 1;
    });
    var curId = w.cave.current;
    list.slice().sort(function (a, b) {
      return (a.id === curId ? 0 : 1) - (b.id === curId ? 0 : 1);
    }).forEach(function (cv) {
      var chk = SQ.Cave.canEnter(w, p, d, cv.id, Date.now());
      var isCur = curId === cv.id;
      var owned = SQ.Cave.owned(w, cv.id);
      /* 角标（v2.0）：隐世（obtain 门控）/ 别院（同档 mult 横向支线） */
      var kindTag = '';
      if (cv.obtain) kindTag = '<span class="ctag own">' + c.esc(c.t('cave.tag.hidden')) + '</span>';
      else if (branchIds[cv.id]) kindTag = '<span class="ctag">' + c.esc(c.t('cave.tag.branch')) + '</span>';
      /* 缺项只算「资格」项（含 obtain），冷却与「已在此处」单独处理（不入红绿 chips） */
      var qualLack = chk.lack.filter(function (x) { return x.kind !== 'cooldown' && x.kind !== 'same'; });
      var stateCls = isCur ? ' cur' : (qualLack.length ? ' lack' : '');
      var tag = isCur ? '<span class="ctag cur">' + c.esc(c.t('cave.state.cur')) + '</span>'
        : (owned ? '<span class="ctag own">' + c.esc(c.t('cave.state.own')) + '</span>' : '');
      h += '<div class="cavecard' + stateCls + (isCur ? ' hero' : '') + '" data-cave="' + cv.id + '">' +
        '<div class="ch"><span class="cn">' + c.esc(c.t('cave.' + cv.id + '.name')) + kindTag + tag + '</span>' +
        '<span class="cm">×' + cv.mult.toFixed(2) + '</span></div>' +
        '<div class="cs">' + c.esc(cv.signature
          ? c.t('cave.sig', { name: c.t('cave.' + cv.id + '.signature'), eff: c.t('talent.field.' + cv.signature.field) + ' ' + (cv.signature.field === 'tribBonus' ? '+' + cv.signature.value.toFixed(2) : (cv.signature.value > 0 ? '+' : '') + Math.round(cv.signature.value * 100) + '%') })
          : c.t('cave.sig.none')) + '</div>' +
        '<div class="reqchips">' + caveReqChips(c, cv, chk) + '</div>';
      /* 叙事分段（UI §3.3 v2.4）：驻留中/已持有出全文，未达资格折叠成盼头 */
      var openStory = isCur || owned || c.ui.caveStory[cv.id];
      var canRead = isCur || owned;
      if (canRead || openStory) {
        h += '<div class="cavestory">' + c.esc(c.t('cave.' + cv.id + '.desc')) + '</div>';
      } else {
        h += '<div class="cavestory hint">' + c.esc(c.t('cave.story.locked')) + '</div>';
      }
      /* 附属设施（v2.0）：已持有才展开；等级/效果只读恒显，营建/扩建按钮仅当前驻留福地有 */
      if (owned && withFac) h += caveFacRows(c, w, d, cv, isCur);
      if (!isCur) {
        var dis = qualLack.length > 0 || left > 0;
        h += '<button class="cavebtn' + (dis ? '' : ' primary') + '" data-act="caveEnter" data-v="' + cv.id + '"' +
          (dis ? ' disabled' : '') + '>' +
          c.esc(qualLack.length ? c.t('cave.state.lack') : (left > 0 ? c.t('cave.cd', { t: c.fmtDur(left) })
            : (owned ? c.t('cave.state.move') : c.t('cave.state.enter')))) + '</button>';
      }
      h += '</div>';
    });
    return h;
  }

  function realmInfo(c) {
    var w = c.w, d = c.d;
    c.$('mrm-title').textContent = c.t('realm.info.title');
    c.$('mrm-intro').textContent = c.t('realm.info.intro');
    var h = '';
    d.REALMS.forEach(function (R, i) {
      var st = i < w.realm ? 'passed' : (i === w.realm ? 'cur' : 'locked');
      var tag = st === 'cur' ? c.t('realm.info.state.cur')
        : (st === 'passed' ? c.t('realm.info.state.passed') : c.t('realm.info.state.locked'));
      /* REALMS[0] 为初始境界（need=null / tribBase=null）：只出修炼与战力两项 */
      var gate = R.need == null ? c.t('realm.info.origin')
        : c.t('realm.info.need', { n: SQ.fmt(R.need), res: c.t('resource.primary') }) + ' · ' +
          c.t('realm.info.trib', { p: Math.round(R.tribBase * 100) });
      h += '<div class="realmrow ' + st + '"><div class="rrhead">' +
        '<span class="rri">' + (i + 1) + '</span><span class="rrn">' + c.esc(c.t('realm.' + i)) + '</span>' +
        '<span class="rrtag">' + c.esc(tag) + '</span></div>' +
        '<div class="rrsub">' + c.esc(c.t('realm.info.base', { n: R.baseQi })) + ' · ' +
        c.esc(c.t('realm.info.power', { n: SQ.fmt(R.power) })) + '</div>' +
        /* 寿元同行列出（寿元批 §6.1A）：「破境即得寿」这条因果要在境界一览里看得见，
         * 否则玩家只在本世行见到一串数字、不知为何要抢岁月。
         * 第卌八批改累加阶梯 ⇒ 这一列读的是世界包 `lifeCapOf(i)`（凡寿 + 逐境增量前缀和），
         * 不再直取表尾——`LIFESPAN` 这个键已随批删除，无尽改由 `LIFE_ETERNAL` 那一枚常数判。 */
        '<div class="rrsub">' + c.esc(gate) + ' · ' + c.esc(i >= d.LIFE_ETERNAL
          ? c.t('realm.info.life.eternal')
          : c.t('realm.info.life', { n: SQ.fmt(c.p.worldSystems.lifeCapOf(i)) })) + '</div></div>';
    });
    c.$('mrm-list').innerHTML = h;
    c.$('mrm-close').textContent = c.t('ui.close');
  }

  /* ── Tab 2 秘境 ── */
  function render(c) {
    var w = c.w, m = c.mods, d = c.d, p = c.p;
    var power = SQ.Mods.powerOf(w, p, d, m);
    var maxUn = SQ.Combat.maxUnlocked(w, d);
    /* 战力已上移修行页重点展示；此处只留历练战绩（战力绝对值见修行页） */
    var h = '<p class="hint" style="margin:0 0 8px">' + c.esc(c.t('ui.kills', { n: SQ.fmt(w.kills) })) + ' · ' +
      c.esc(c.t('ui.total', { n: SQ.fmt(w.total || 0) })) + '</p>';
    /* 首通 ↔ 洞府联动（B6）：3 处福地以秘境首通为资格 → 两柱互相引流 */
    var caveByZone = {};
    SQ.Cave.list(c.p).forEach(function (cv) {
      var zc = cv.reqs && cv.reqs.zoneCleared;
      if (zc != null) caveByZone[zc] = cv;
    });
    function zoneRow(i) {
      var z = d.ZONES[i];
      var locked = w.realm < z.unlock;
      var cur = w.zone === i;
      var bn = !locked && power < z.need;
      var rh = '<div class="lrow zcard' + (cur ? ' cur hero' : '') + (locked ? ' locked' : '') + '" data-zone="' + i + '">';
      rh += '<div class="nm">' + c.esc(locked ? c.t('zone.unknown') : c.t('combat.zone.' + i)) +
           (cur ? ' <span class="tierbadge t4">' + c.esc(c.t('zone.current')) + '</span>' : '') +
           ((w.cleared || []).indexOf(i) >= 0 ? ' <span class="tierbadge t1">' + c.esc(c.t('zone.cleared')) + '</span>' : '') +
           /* 金虚线联动角标：点击跳本页洞天节（未首通 = 预告「首通可开福地」） */
           (caveByZone[i] ? '<span class="cavelink" data-act="openCave">' +
             c.esc(c.t((w.cleared || []).indexOf(i) >= 0 ? 'zone.cavelink' : 'zone.cavelink.locked',
               { name: c.t('cave.' + caveByZone[i].id + '.name') })) + '</span>' : '') + '</div>';
      if (locked) {
        rh += '<div class="meta">' + c.esc(c.t('zone.locked', { realm: c.t('realm.' + z.unlock) })) + '</div>';
      } else {
        /* 数值行合并（信息密度批）：需求战力 · 灵石 · 战力三态同排一行 */
        var pwCls = power >= z.need * 1.2 ? 'ok' : (power >= z.need ? 'tight' : 'bad');
        rh += '<div class="zstats"><span>' + c.esc(c.t('zone.need', { n: SQ.fmt(z.need) })) + '</span>' +
          '<span>' + c.esc(c.t('zone.stones', { n: SQ.fmt(z.stones) })) + '</span>' +
          '<span class="zone-pw ' + pwCls + '">' + c.esc(pwCls === 'bad'
            ? c.t('zone.pw.bad', { n: SQ.fmt(z.need - power) })
            : c.t('zone.pw.' + pwCls, { p: Math.round((power / z.need - 1) * 100) })) + '</span></div>';
        if (bn) rh += '<div class="meta red">' + c.esc(c.t('combat.bottleneck')) + ' — ' + c.esc(c.t('combat.bottleneck.hint')) + '</div>';
        if (cur) {
          /* 当前秘境 hero：左栏 = 天时 + 域主，右栏 = 进度 + 残片（宽屏双栏、窄屏单栏） */
          var zhL = '', zhR = '';
          /* 区域词缀 chip（B3 · 切入即见：名 + 效果 + 剩余时长；数值详设 §2.5） */
          var aff = SQ.Combat.affixDef(w, d);
          if (aff) {
            zhL += '<div class="affixrow"><span class="affixchip">' + c.esc(c.t('affix.' + aff.id + '.name')) + '</span>' +
              '<span class="meta">' + c.esc(c.t('affix.' + aff.id + '.desc')) + ' · ' +
              c.esc(c.t('zone.affix.left', { t: c.timeLeft((w.zoneAffix && w.zoneAffix.until || 0) - Date.now()) })) + '</span></div>';
          } else {
            zhL += '<div class="meta hint">' + c.esc(c.t('zone.affix.none')) + '</div>';
          }
          /* 域主现世（B3 · 数值详设 §2.6）：ready → 域主线 + 挑战按钮（CD 态置灰倒计时）；dead → 已斩角标 */
          var zb = w.zoneBoss;
          if (zb && zb.zone === i && zb.state === 'ready') {
            var bossNeed = Math.round(z.need * (d.BOSS_MULT != null ? d.BOSS_MULT : 1.8));
            var cdLeft = (zb.retryAt || 0) - Date.now();
            zhL += '<div class="bossrow"><span class="tierbadge tboss">' + c.esc(c.t('zone.boss.tag')) + '</span>' +
              '<span class="zone-pw ' + (power >= bossNeed ? 'ok' : 'bad') + '">' +
              c.esc(c.t('zone.boss.need', { need: SQ.fmt(bossNeed), m: (d.BOSS_MULT != null ? d.BOSS_MULT : 1.8) })) + '</span></div>';
            zhL += cdLeft > 0
              ? '<div class="acts"><button disabled>' + c.esc(c.t('zone.boss.cd', { t: c.timeLeft(cdLeft) })) + '</button></div>'
              : '<div class="acts"><button class="primary" data-act="challengeBoss">' + c.esc(c.t('zone.boss.challenge')) + '</button></div>';
          } else if (zb && zb.zone === i && zb.state === 'dead') {
            zhL += '<div class="meta"><span class="tierbadge t1">' + c.esc(c.t('zone.boss.dead')) + '</span></div>';
          }
          zhR += '<div class="bar slim"><i style="width:' + (w.prog[i] || 0) + '%"></i></div>';
          zhR += '<div class="meta">' + c.esc(c.t('zone.prog', { n: w.prog[i] || 0 })) + (bn ? ' <span class="red">(' + c.esc(c.t('combat.bottleneck')) + ' 90)</span>' : '') + '</div>';
          /* 探宝残片进度与兑换入口（B3 · 数值详设 §2.7 + 扩容批四选）：z6~8 设施图纸/情报/丹方/器图纸四按钮 */
          var shN = Math.max(0, Math.floor((w.shards || [])[i] || 0));
          var shNeed = d.SHARD_NEED != null ? d.SHARD_NEED : 20;
          zhR += '<div class="shardrow"><span class="meta">' + c.esc(c.t('zone.shard.name')) + ' ' +
            c.esc(c.t('zone.shard.prog', { n: shN, need: shNeed })) + '</span>';
          if (shN >= shNeed) {
            zhR += (i >= 6 && i <= 8)
              ? '<span class="acts"><button data-act="exchangeShard" data-v="' + i + '" data-c="fac">' +
                c.esc(c.t('zone.shard.pick.fac')) + '</button>' +
                '<button data-act="exchangeShard" data-v="' + i + '" data-c="intel">' +
                c.esc(c.t('zone.shard.pick.intel')) + '</button>' +
                (d.ALCHEMY ? '<button data-act="exchangeShard" data-v="' + i + '" data-c="recipe">' +
                c.esc(c.t('alchemy.shard.pick.recipe')) + '</button>' +
                '<button data-act="exchangeShard" data-v="' + i + '" data-c="bp">' +
                c.esc(c.t('alchemy.shard.pick.bp')) + '</button>' : '') + '</span>'
              : '<span class="acts"><button data-act="exchangeShard" data-v="' + i + '">' +
                c.esc(c.t('zone.shard.exchange')) + '</button></span>';
          }
          zhR += '</div>';
          rh += '<div class="zhero"><div class="zhcol">' + zhL + '</div><div class="zhcol">' + zhR + '</div></div>';
        } else {
          rh += '<div class="acts zfoot"><button data-act="setZone" data-v="' + i + '">' + c.esc(c.t('zone.enter')) + '</button></div>';
        }
      }
      return rh + '</div>';
    }
    /* 列表排序（B6 · 帧一）：进行中置顶 → 未首通按阶梯在上（下一目标牵引）→
     * 分隔线 → 已首通折叠在下（回访刷取入口，倒序 = 越新越近手边） */
    var cleared = w.cleared || [];
    var curI = w.zone;
    var upper = [], lower = [];
    d.ZONES.forEach(function (z, i) {
      if (i === curI) return;
      (cleared.indexOf(i) >= 0 ? lower : upper).push(i);
    });
    h += '<div class="secbar"><span>' + c.esc(c.t('zone.sec')) + '</span></div>';
    h += '<div class="zonegrid">';
    h += zoneRow(curI);
    upper.forEach(function (i) { h += zoneRow(i); });
    if (lower.length) {
      h += '<div class="zsep">—— ' + c.esc(c.t('zone.clearedsec')) + ' ——</div>';
      lower.reverse().forEach(function (i) { h += zoneRow(i); });
    }
    h += '</div>';
    /* ── 洞天福地（合并批）：原「洞天」独立页内容内联到本页——与秘境同页卡片化，
       互为引流（秘境卡「福地」角标 ↔ 洞天卡首通资格 chips）；当前驻留福地为通栏 hero ── */
    var caveCur = SQ.Cave.current(w, p);
    var caveLeft = SQ.Cave.cooldownLeft(w, Date.now());
    h += '<div class="secbar" id="cave-sec"><span>' + c.esc(c.t('cave.title')) + '</span>' +
      '<span class="secnote">' + c.esc(c.t('cave.cur', {
        name: c.t('cave.' + caveCur.id + '.name'), mult: SQ.Cave.multOf(w, p, d, m).toFixed(2)
      }) + ' · ' + (caveLeft > 0 ? c.t('cave.cd', { t: c.fmtDur(caveLeft) }) : c.t('cave.cd.ready'))) + '</span></div>';
    h += '<div class="cavegrid">' + caveDexHTML(c, caveLeft, true) + '</div>';
    c.$('tab-combat').innerHTML = h;
  }


  SQ.UI = SQ.UI || {};
  SQ.UI.zone = { render: render, caveDex: caveDexHTML, realmInfo: realmInfo };
})();
