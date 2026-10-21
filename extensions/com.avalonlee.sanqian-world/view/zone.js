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
  /* 福地卡（B16-d · 设计稿 .cavecard 紧凑形）：名 + 角标 / 倍率·签名一行 / 资格 chips。
   * 角标「隐世」「别院」按福地表原序判定（不受展示分组影响）；叙事仍只对被持有（或已点开观其
   * 灵气）的福地开放——UI §3.3 v2.4 原口径不放宽。设施明细：当前驻留福地改由页内独立段承载
   * （可营建/扩建），其余已持有福地仍内联只读行，信息一处不减。 */
  function caveSigTxt(c, cv) {
    if (!cv.signature) return c.t('cave.sig.none');
    var sv = cv.signature;
    return c.t('cave.sig', {
      name: c.t('cave.' + cv.id + '.signature'),
      eff: c.t('talent.field.' + sv.field) + ' ' +
        (sv.field === 'tribBonus' ? '+' + sv.value.toFixed(2) : (sv.value > 0 ? '+' : '') + Math.round(sv.value * 100) + '%')
    });
  }
  function caveCardHTML(c, cv, chk, isCur, owned, left, branchIds) {
    var w = c.w, p = c.p, d = c.d;
    /* 角标（v2.0）：隐世（obtain 门控）/ 别院（同档 mult 横向支线） */
    var kindTag = cv.obtain ? '<span class="ctag own">' + c.esc(c.t('cave.tag.hidden')) + '</span>'
      : (branchIds[cv.id] ? '<span class="ctag">' + c.esc(c.t('cave.tag.branch')) + '</span>' : '');
    /* 缺项只算「资格」项（含 obtain），冷却与「已在此处」单独处理（不入红绿 chips） */
    var qualLack = chk.lack.filter(function (x) { return x.kind !== 'cooldown' && x.kind !== 'same'; });
    var stateCls = isCur ? ' cur' : (qualLack.length ? ' locked' : '');
    var tag = isCur ? '<span class="ctag cur">' + c.esc(c.t('cave.state.cur')) + '</span>'
      : (owned ? '<span class="ctag own">' + c.esc(c.t('cave.state.own')) + '</span>' : '');
    var h = '<div class="cavecard' + stateCls + '" data-cave="' + cv.id + '">' +
      '<div class="cv-n">' + c.esc(c.t('cave.' + cv.id + '.name')) + kindTag + tag + '</div>' +
      '<div class="cv-d">' + c.esc(c.t('cave.cv.d', { mult: cv.mult.toFixed(2), sig: caveSigTxt(c, cv) })) + '</div>' +
      '<div class="reqchips">' + caveReqChips(c, cv, chk) + '</div>';
    var openStory = isCur || owned || (c.ui.caveStory && c.ui.caveStory[cv.id]);
    if (isCur || owned || openStory) {
      h += '<div class="cavestory">' + c.esc(c.t('cave.' + cv.id + '.desc')) + '</div>';
    } else {
      h += '<div class="cavestory hint">' + c.esc(c.t('cave.story.locked')) + '</div>';
    }
    if (owned && !isCur) h += caveFacRows(c, w, d, cv, false);
    if (!isCur) {
      var dis = qualLack.length > 0 || left > 0;
      h += '<button class="cavebtn' + (dis ? '' : ' primary') + '" data-act="caveEnter" data-v="' + cv.id + '"' +
        (dis ? ' disabled' : '') + '>' +
        c.esc(qualLack.length ? c.t('cave.state.lack') : (left > 0 ? c.t('cave.cd', { t: c.fmtDur(left) })
          : (owned ? c.t('cave.state.move') : c.t('cave.state.enter')))) + '</button>';
    }
    return h + '</div>';
  }
  /* 四组分段（设计稿 §洞天福地）：当前驻留 / 已拥有 · 未驻留 / 可入驻 / 未解锁。
   * 组序固定、组内按福地表原序；单卡组用 .solo 收成一行。 */
  function caveGroupsHTML(c, left) {
    var w = c.w, p = c.p, d = c.d;
    var list = SQ.Cave.list(p);
    var curId = w.cave.current;
    var seenMult = {}, branchIds = {};
    list.forEach(function (cv) {
      if (!cv.obtain && seenMult[cv.mult.toFixed(2)]) branchIds[cv.id] = 1;
      seenMult[cv.mult.toFixed(2)] = 1;
    });
    var keys = ['current', 'owned', 'avail', 'locked'], bucket = {};
    keys.forEach(function (k) { bucket[k] = []; });
    list.forEach(function (cv) {
      var chk = SQ.Cave.canEnter(w, p, d, cv.id, Date.now());
      var owned = SQ.Cave.owned(w, cv.id);
      var qualLack = chk.lack.filter(function (x) { return x.kind !== 'cooldown' && x.kind !== 'same'; });
      var k = curId === cv.id ? 'current' : (owned ? 'owned' : (qualLack.length ? 'locked' : 'avail'));
      bucket[k].push({ cv: cv, chk: chk, owned: owned });
    });
    var h = '';
    keys.forEach(function (k) {
      var arr = bucket[k];
      if (!arr.length) return;
      h += '<p class="subhead"><span class="sl">' + c.esc(c.t('cave.grp.' + k, { n: arr.length })) + '</span>' +
        '<span class="sr">' + c.esc(c.t(k === 'locked' ? 'cave.grp.hint.locked' : 'cave.grp.hint')) + '</span></p>' +
        '<div class="cavegrid' + (arr.length === 1 ? ' solo' : '') + '">';
      arr.forEach(function (it) {
        h += caveCardHTML(c, it.cv, it.chk, k === 'current', it.owned, left, branchIds);
      });
      h += '</div>';
    });
    return h;
  }
  /* 当前驻留设施（设计稿 .lrow 行）：等级与效果在左、营建/扩建在右；满级只留一行字。
   * 与 caveFacRows 的分工：这一段只服务当前驻留福地（可动），caveFacRows 是非驻留福地的只读内联行。 */
  function caveFacLrows(c) {
    var w = c.w, p = c.p, d = c.d;
    var cv = SQ.Cave.current(w, p);
    var fac = (w.cave && w.cave.fac && w.cave.fac[cv.id]) || {};
    var maxLv = d.CAVE_FAC_MAX_LV || 3;
    var h = '';
    (d.CAVE_FACILITIES || []).forEach(function (fd) {
      var lv = fac[fd.id] || 0;
      var eff = fd.per * lv;
      var effTxt = c.t('talent.field.' + fd.field) + ' ' +
        (fd.field === 'tribBonus' ? '+' + eff.toFixed(2) : (eff * 100).toFixed(1) + '%');
      if (fd.id === 'lingtian') effTxt += ' · ' + c.t('cave.fac.lingtian.mat');
      var right;
      if (lv >= maxLv) {
        right = '<b>' + c.esc(c.t('cave.fac.max')) + '</b>';
      } else {
        var cost = (d.CAVE_FAC_COST || [])[lv] || 0;
        var ok = w.stones >= cost;
        right = '<button class="' + (ok ? 'primary' : '') + '" data-act="caveBuild" data-v="' + cv.id + '" data-f="' + fd.id + '"' +
          (ok ? '' : ' disabled') + '>' +
          c.esc(c.t(lv === 0 ? 'cave.fac.build' : 'cave.fac.upgrade', { n: SQ.fmt(cost) })) + '</button>';
      }
      h += '<div class="lrow facrow">' +
        '<span class="nm">' + c.esc(c.t('cave.fac.' + fd.id + '.name')) +
        '<span class="hint"> ' + c.esc(lv > 0 ? c.t('cave.fac.lv', { n: lv }) : c.t('cave.fac.none')) + '</span></span>' +
        '<span class="meta">' + c.esc(effTxt + ' · ' + (lv > 0 ? c.t('cave.fac.active') : c.t('cave.fac.idle.build'))) + '</span>' +
        right + '</div>';
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

  /* ── Tab 2 秘境（B15-d 重排 · 设计稿 .curzone + .zlist）──
   * 结构变化：原「卡片网格 + 通栏 hero 卡」改成「当前秘境 = 山影 hero 块；其余秘境 = 行式清单
   * （可入 / 已首通两段）」。功能零丢：域主挑战、残片兑换（含 z6~8 四选）、首通进度、
   * 战力三态、瓶颈提示、洞天联动角标、切换入口全部在位；洞天福地节原样保留。 */
  function render(c) {
    var w = c.w, m = c.mods, d = c.d, p = c.p;
    var power = SQ.Mods.powerOf(w, p, d, m);
    var h = '';
    /* 首通 ↔ 洞府联动（B6）：3 处福地以秘境首通为资格 → 两柱互相引流 */
    var caveByZone = {};
    SQ.Cave.list(c.p).forEach(function (cv) {
      var zc = cv.reqs && cv.reqs.zoneCleared;
      if (zc != null) caveByZone[zc] = cv;
    });
    function pwText(z) {
      var cls = power >= z.need * 1.2 ? 'ok' : (power >= z.need ? 'tight' : 'bad');
      return { cls: cls, txt: cls === 'bad' ? c.t('zone.pw.bad', { n: SQ.fmt(z.need - power) })
        : c.t('zone.pw.' + cls, { p: Math.round((power / z.need - 1) * 100) }) };
    }
    /* ① 当前秘境 hero */
    var zi = w.zone, zc0 = d.ZONES[zi];
    var progN = w.prog[zi] || 0;
    var pw0 = pwText(zc0);
    var aff0 = SQ.Combat.affixDef(w, d);
    var meta0 = c.t('zone.need', { n: SQ.fmt(zc0.need) }) + ' · ' +
      c.t('ui.kills', { n: SQ.fmt(w.kills) }) + (aff0 ? ' · ' + c.t('affix.' + aff0.id + '.name') : '');
    h += '<div class="curzone">' +
      '<svg class="cz-ink" viewBox="0 0 150 110" aria-hidden="true">' +
      '<path d="M0 110V74l18-22 12 10 16-32 16 28 12-14 18 26 12-12 16 20 30-16v48z" fill="currentColor"></path></svg>' +
      '<div class="cz-top"><div><div class="cz-name">' + c.esc(c.t('combat.zone.' + zi)) + '</div>' +
      '<div class="cz-meta">' + c.esc(meta0) + '</div></div>' +
      '<span class="tag jade">' + c.esc(c.t('zone.current')) + '</span></div>' +
      '<div class="cz-prog"><div class="lab"><span>' + c.esc(c.t('zone.prog', { n: progN })) + '</span>' +
      '<span class="' + pw0.cls + '">' + c.esc(pw0.txt) + '</span></div>' +
      '<div class="bar"><i style="width:' + progN + '%"></i></div></div>';
    /* ② 动作行：残片进度 + 兑换（够数才亮；z6~8 给四选）+ 域主挑战 */
    var shN0 = Math.max(0, Math.floor((w.shards || [])[zi] || 0));
    var shNeed0 = d.SHARD_NEED != null ? d.SHARD_NEED : 20;
    h += '<div class="cz-acts"><span class="cz-shard">' + c.esc(c.t('zone.shard.name')) + ' ' +
      c.esc(c.t('zone.shard.prog', { n: shN0, need: shNeed0 })) + '</span>';
    if (shN0 >= shNeed0) {
      if (zi >= 6 && zi <= 8) {
        h += '<button data-act="exchangeShard" data-v="' + zi + '" data-c="fac">' + c.esc(c.t('zone.shard.pick.fac')) + '</button>' +
          '<button data-act="exchangeShard" data-v="' + zi + '" data-c="intel">' + c.esc(c.t('zone.shard.pick.intel')) + '</button>' +
          (d.ALCHEMY ? '<button data-act="exchangeShard" data-v="' + zi + '" data-c="recipe">' + c.esc(c.t('alchemy.shard.pick.recipe')) + '</button>' +
            '<button data-act="exchangeShard" data-v="' + zi + '" data-c="bp">' + c.esc(c.t('alchemy.shard.pick.bp')) + '</button>' : '');
      } else {
        h += '<button data-act="exchangeShard" data-v="' + zi + '">' + c.esc(c.t('zone.shard.exchange')) + '</button>';
      }
    }
    h += '</div>';
    /* ③ 三行：域主 / 本区词缀 / 洞天 */
    var zb0 = w.zoneBoss;
    h += '<div class="cz-kv"><span>' + c.esc(c.t('zone.boss.name')) + '</span>';
    if (zb0 && zb0.zone === zi && zb0.state === 'ready') {
      var bossNeed = Math.round(zc0.need * (d.BOSS_MULT != null ? d.BOSS_MULT : 1.8));
      var cdLeft = (zb0.retryAt || 0) - Date.now();
      h += cdLeft > 0
        ? '<b class="bad">' + c.esc(c.t('zone.boss.cd', { t: c.timeLeft(cdLeft) })) + '</b>'
        : '<button class="linkbtn" data-act="challengeBoss">' + c.esc(c.t('zone.boss.challenge')) + '</button>';
      h += '<i class="cz-sub ' + (power >= bossNeed ? 'ok' : 'bad') + '">' +
        c.esc(c.t('zone.boss.need', { need: SQ.fmt(bossNeed), m: (d.BOSS_MULT != null ? d.BOSS_MULT : 1.8) })) + '</i>';
    } else if (zb0 && zb0.zone === zi && zb0.state === 'dead') {
      h += '<b class="ok">' + c.esc(c.t('zone.boss.dead')) + '</b>';
    } else {
      h += '<b class="hint">' + c.esc(c.t('zone.boss.none')) + '</b>';
    }
    h += '</div>';
    h += '<div class="cz-kv"><span>' + c.esc(c.t('affix.title')) + '</span>';
    if (aff0) {
      h += '<b>' + c.esc(c.t('affix.' + aff0.id + '.desc')) + '</b>' +
        '<i class="cz-sub">' + c.esc(c.t('zone.affix.left', { t: c.timeLeft((w.zoneAffix && w.zoneAffix.until || 0) - Date.now()) })) + '</i>';
    } else {
      h += '<b class="hint">' + c.esc(c.t('zone.affix.none')) + '</b>';
    }
    h += '</div>';
    var cv0 = caveByZone[zi];
    h += '<div class="cz-kv"><span>' + c.esc(c.t('cave.title')) + '</span>';
    h += cv0
      ? '<button class="linkbtn" data-act="openCave">' + c.esc(c.t('cave.' + cv0.id + '.name')) + ' ›</button>'
      : '<b class="hint">' + c.esc(c.t('cave.link.none')) + '</b>';
    h += '</div></div>';
    /* ④ 行式清单：可入（未首通，含未解锁）→ 已首通可回访 */
    var cleared = w.cleared || [];
    var upper = [], lower = [];
    d.ZONES.forEach(function (z, i) {
      if (i === zi) return;
      (cleared.indexOf(i) >= 0 ? lower : upper).push(i);
    });
    function zrow(i) {
      var z = d.ZONES[i];
      var locked = w.realm < z.unlock;
      var bn = !locked && power < z.need;
      var r = '<div class="zrow' + (locked ? ' locked' : '') + '" data-zone="' + i + '"' +
        (locked ? '' : ' data-act="setZone" data-v="' + i + '"') + '>' +
        '<div><div class="z-n">' + c.esc(locked ? c.t('zone.unknown') : c.t('combat.zone.' + i)) + '</div>' +
        '<div class="z-d">' + c.esc(locked
          ? c.t('zone.locked', { realm: c.t('realm.' + z.unlock) })
          : c.t('zone.need', { n: SQ.fmt(z.need) }) + ' · ' + c.t('zone.stones', { n: SQ.fmt(z.stones) })) + '</div></div>';
      var right;
      if (locked) {
        right = '<div class="s hint">' + c.esc(c.t('zone.lockedtag')) + '</div>';
      } else {
        var pw = pwText(z);
        right = '<div class="s ' + pw.cls + '">' + c.esc(pw.txt) + '</div>';
        var sub = bn ? c.t('combat.bottleneck')
          : (caveByZone[i] ? c.t('cave.' + caveByZone[i].id + '.name')
            : (cleared.indexOf(i) >= 0 ? c.t('zone.cleared') : c.t('zone.enter')));
        right += '<div class="p">' + c.esc(sub) + '</div>';
      }
      return r + '<div class="z-r">' + right + '</div></div>';
    }
    h += '<div class="zlist"><h2 class="sect">' + c.esc(c.t('zone.sec')) + '</h2>';
    upper.forEach(function (i) { h += zrow(i); });
    if (lower.length) {
      h += '<h2 class="sect" style="margin-top:22px">' + c.esc(c.t('zone.clearedsec')) + '</h2>';
      lower.slice().reverse().forEach(function (i) { h += zrow(i); });
    }
    h += '</div>';
    /* ── 洞天福地（B16-d 对齐设计稿 §洞天福地）：段标 → 导语 → 状态条 → 四组分段 → 当前驻留设施行。
       与秘境同页互为引流（秘境卡「福地」角标 ↔ 洞天卡首通资格 chips）；十三处一律在册，
       分组的只是「玩家现在能不能去」这一维，不删不减。 ── */
    var caveCur = SQ.Cave.current(w, p);
    var caveLeft = SQ.Cave.cooldownLeft(w, Date.now());
    var caveMult = SQ.Cave.multOf(w, p, d, m);
    var caveFacs = d.CAVE_FACILITIES || [];
    var facCur = (w.cave && w.cave.fac && w.cave.fac[caveCur.id]) || {};
    var facOn = caveFacs.filter(function (fd) { return (facCur[fd.id] || 0) > 0; }).length;
    h += '<div class="dtsec" id="cave-sec">' +
      '<div class="sechead"><span class="t">' + c.esc(c.t('cave.shelf', { n: SQ.Cave.list(p).length })) + '</span>' +
      '<span class="s">' + c.esc(c.t('cave.cur', { name: c.t('cave.' + caveCur.id + '.name'), mult: caveMult.toFixed(2) })) + '</span></div>' +
      '<p class="hintline">' + c.esc(c.t('cave.intro')) + '</p>' +
      '<div class="statestrip"><span class="s-k">' + c.esc(c.t('cave.strip.k')) + '</span>' +
      '<span class="s-v">' + c.esc(c.t('cave.strip.v', { name: c.t('cave.' + caveCur.id + '.name'), mult: caveMult.toFixed(2) })) + '</span>' +
      '<span class="s-x">' + c.esc(c.t('cave.strip.x', {
        n: facOn, m: caveFacs.length,
        cd: caveLeft > 0 ? c.t('cave.cd', { t: c.fmtDur(caveLeft) }) : c.t('cave.cd.ready')
      })) + '</span></div>' +
      caveGroupsHTML(c, caveLeft) +
      '<div class="sechead"><span class="t">' + c.esc(c.t('cave.fac.sec')) + '</span>' +
      '<span class="s">' + c.esc(c.t('cave.fac.sec.hint')) + '</span></div>' +
      '<div class="faclist">' + caveFacLrows(c) + '</div>' +
      '<p class="hintline">' + c.esc(c.t('cave.fac.note')) + '</p>' +
      '</div>';
    c.$('tab-combat').innerHTML = h;
  }


  SQ.UI = SQ.UI || {};
  SQ.UI.zone = { render: render, realmInfo: realmInfo };
})();
