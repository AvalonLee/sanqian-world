/* systems/prodigy.js — 同代天骄（交互档 · 天骄卷 v1.0 唯一事实源）
 * 天骄 = 与玩家同代出道的竞争者镜像：只推进两个标量（境界 rlm / 进度 prg → 派生战力），
 * 全部戏剧性由玩家侧交互产生（切磋 / 结缘 / 结仇 / 宿敌心结 / 机缘竞争）。
 * 纪律：不进 companions 名录、不进 mods.collect、玩家数值轴零读写（sim-pacing 稳态带零侵入）；
 * bond 走 Bonds.gain 正向口（宿敌冻结 = 心结锁「好感锁死」先例）；赌注走 in.event/out.event；
 * 心结 −0.02 走 §8.3 talent 加项（单份不叠加）；播报走 G17 展示卡（kind:'prodigy'，独立上限 2）。
 * ws.prodigies 唯一写口 = 本模块；bonds 键 pr{n} 槽位前缀（与道友拼音 id 空间零交集）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var num = SQ.util.num, pick = SQ.util.pick;   /* C1：统一至 assets/util.js */
  function P(D) { return D.PRODIGY || {}; }
  /* 渐进式解锁 gate（渐次解锁批 §C4）：门槛单一事实源 = D.TAB_UNLOCK.prodigy.r（view 导航同源）。
   * 只锁交互面（切磋/事件/传闻/榜）——月度推进照跑：金丹「相识」时天骄已在金丹，戏剧性保留。 */
  function unlockRealm(D) {
    var tu = (D.TAB_UNLOCK || {}).prodigy;
    return tu && tu.r != null ? tu.r : 2;
  }
  function unlocked(ws, D) { return (ws.realm || 0) >= unlockRealm(D); }

  function rollWeighted(weights) {
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var r = Math.random() * total;
    for (i = 0; i < weights.length; i++) { r -= weights[i]; if (r < 0) return i; }
    return weights.length - 1;
  }

  function byId(ws, pid) {
    var out = null;
    (ws.prodigies || []).forEach(function (p) { if (p.id === pid) out = p; });
    return out;
  }

  /* 人名渲染（存档只存三段索引 nm:[s,m,l]，词表 prodigy.name.{s|m|l}.{n}） */
  function nameOf(ws, pid, pack) {
    var p = typeof pid === 'object' ? pid : byId(ws, pid);
    if (!p || !p.nm) return '';
    return SQ.t('prodigy.name.s.' + (p.nm[0] + 1), null, pack.worldId) +
      SQ.t('prodigy.name.m.' + (p.nm[1] + 1), null, pack.worldId) +
      SQ.t('prodigy.name.l.' + (p.nm[2] + 1), null, pack.worldId);
  }
  function factionNameOf(ws, p, pack) {
    if (!p || p.fc < 0 || !p.fid) return SQ.t('prodigy.rel.loner', null, pack.worldId);
    var out = null;
    (ws.factions || []).forEach(function (x) { if (x.id === p.fid) out = x.name; });
    return out || SQ.t('prodigy.rel.loner', null, pack.worldId);
  }

  function powerOf(ws, p, D) {
    var r = D.REALMS[Math.min(p.rlm || 0, D.REALMS.length - 1)];
    return (r ? r.power : 20) * ((P(D).POWER_COEF || [0.95, 1.05, 1.15])[p.apt || 0] || 1);
  }
  function coefOf(p, D) {
    var base = (P(D).APT_COEF || [1, 1.15, 1.3])[p.apt || 0] || 1;
    if (p.eternal) base += P(D).ETERNAL_COEF || 0.2;
    if (p.boost && p.boost.add) base += p.boost.add;
    return Math.min(base, P(D).COEF_CAP || 1.6);   /* 资质系数合计封顶（红线） */
  }

  /* ── normalize（§10.2：旧档空数组不补 roll、脏档逐项清理零崩溃）──── */
  function normalize(raw, D) {
    var out = [];
    var PD = P(D);
    (Array.isArray(raw) ? raw : []).forEach(function (p) {
      if (!p || typeof p !== 'object') return;
      if (typeof p.id !== 'string' || !/^pr\d+$/.test(p.id)) return;
      if (out.length >= (PD.COUNT_MAX || 30)) return;    /* 名录上限（每代 ≤30）*/
      var nm = Array.isArray(p.nm) && p.nm.length === 3 ? p.nm.map(function (x, i) {
        return Math.max(0, Math.min((PD.NAME_POOL || [9, 7, 5])[i] - 1, Math.floor(num(x, 0))));
      }) : [0, 0, 0];
      var tl = (Array.isArray(p.tl) ? p.tl : []).filter(function (x) { return typeof x === 'string'; }).slice(0, 2);
      var wl = (Array.isArray(p.wl) ? p.wl : [0, 0, 0]).slice(0, 3).map(function (x) { return Math.max(0, Math.floor(num(x, 0))); });
      while (wl.length < 3) wl.push(0);
      var boost = null;
      if (p.boost && typeof p.boost === 'object' && num(p.boost.add, 0) > 0) {
        boost = { add: Math.min(0.5, num(p.boost.add, 0)), months: Math.max(0, Math.floor(num(p.boost.months, 0))) };
      }
      out.push({
        id: p.id, nm: nm, tl: tl,
        al: Math.max(0, Math.min(2, Math.floor(num(p.al, 1)))),
        fc: Math.max(-1, Math.floor(num(p.fc, -1))),
        fid: (typeof p.fid === 'string' && p.fid) ? p.fid.slice(0, 24) : null,
        apt: Math.max(0, Math.min(2, Math.floor(num(p.apt, 0)))),
        rlm: Math.max(0, Math.min(9, Math.floor(num(p.rlm, 0)))),
        prg: Math.max(0, num(p.prg, 0)),
        feud: p.feud === true,
        feudBond: Math.max(0, Math.floor(num(p.feudBond, 0))),
        lastSparAt: Math.max(0, num(p.lastSparAt, 0)),
        rivAt: Math.max(0, num(p.rivAt, 0)),
        boost: boost, eternal: p.eternal === true, wl: wl
      });
    });
    return out;
  }

  /* ── 创角生成（roll 时机 = 创角锁定事务 / 转世新周目；存量角色不追溯）──── */
  function nextSlot(ws) {
    var maxN = 0;
    (ws.prodigies || []).forEach(function (p) {
      var n = parseInt(p.id.slice(2), 10);
      if (n > maxN) maxN = n;
    });
    /* 槽位不复用：斩杀出榜者占号——从 prodMarks.slotMax 取历史最大 */
    var hist = (ws.prodMarks && ws.prodMarks.slotMax) || 0;
    return 'pr' + (Math.max(maxN, hist) + 1);
  }
  function rollOne(ws, pack, D, meta, opts) {
    var PD = P(D);
    opts = opts || {};
    var usedNames = {};
    (ws.prodigies || []).forEach(function (p) { usedNames[p.nm.join(',')] = 1; });
    var nm;
    var guard = 0;
    do {
      nm = [Math.floor(Math.random() * (PD.NAME_POOL[0] || 9)),
        Math.floor(Math.random() * (PD.NAME_POOL[1] || 7)),
        Math.floor(Math.random() * (PD.NAME_POOL[2] || 5))];
      guard++;
    } while (usedNames[nm.join(',')] && guard < 30);      /* 同档重名去重（撞名重掷） */
    /* 天赋 2 条：既有正面池 weight 口径抽取（纯展示，不进 mods.collect） */
    var posPool = [];
    ['common', 'xiuxian'].forEach(function (w) {
      var t = (SQ.TALENTS || {})[w];
      if (t) (t.positive || []).forEach(function (el) { posPool.push(el); });
    });
    var tl = [];
    var tlGuard = 0;
    while (tl.length < 2 && posPool.length && tlGuard < 50) {
      tlGuard++;
      var el = posPool[rollWeighted(posPool.map(function (x) { return x.weight != null ? x.weight : 1; }))];
      if (el && tl.indexOf(el.id) < 0) tl.push(el.id);
    }
    var al = rollWeighted(PD.ALIGN_W || [35, 40, 25]);
    var fc = -1, fid = null;
    if (Math.random() >= (PD.LONE_P || 0.15)) {
      /* 势力归属：80% 同阵营子池 / 20% 全 16 池（纯展示，不联动 factionRep） */
      var fixed = (D.FACTIONS_FIXED || []);
      var alignIds = { 0: 'right', 1: 'neutral', 2: 'evil' };
      var sub = [];
      fixed.forEach(function (f, i) { if (f.align === alignIds[al]) sub.push(i); });
      var pool2 = (Math.random() < (PD.SAME_ALIGN_FACTION_P || 0.8) && sub.length)
        ? sub : fixed.map(function (f, i) { return i; });
      fc = pick(pool2);
      fid = fixed[fc] ? fixed[fc].id : null;
    }
    var apt = opts.apt != null ? opts.apt : rollWeighted(PD.APT_W || [50, 35, 15]);
    var p = {
      id: opts.id || nextSlot(ws), nm: opts.nm || nm, tl: tl,
      al: opts.al != null ? opts.al : al, fc: fc, fid: fid,
      apt: apt, rlm: opts.rlm || 0, prg: 0,
      feud: opts.feud === true, feudBond: opts.feudBond || 0,
      lastSparAt: 0, rivAt: 0, boost: null, eternal: opts.eternal === true, wl: [0, 0, 0]
    };
    if (!Array.isArray(ws.prodigies)) ws.prodigies = [];
    ws.prodMarks = ws.prodMarks || {};
    var nNow = parseInt(p.id.slice(2), 10);
    ws.prodMarks.slotMax = Math.max(ws.prodMarks.slotMax || 0, nNow);
    ws.prodigies.push(p);
    return p;
  }

  function rollForNewLife(ws, pack, D, meta, now) {
    if (!Array.isArray(ws.prodigies)) ws.prodigies = [];
    if (ws.prodigies.length) return ws.prodigies;        /* 幂等：已生成不重复 */
    var PD = P(D);
    /* 跨世宿敌（§九）：解锁且 meta.eternalProdigy 在档 → 带记忆转世（开场传闻「又是你。」） */
    if (meta && meta.unlocks && meta.unlocks.nemesis && meta.eternalProdigy) {
      var ep = meta.eternalProdigy;
      var pe = rollOne(ws, pack, D, meta, {
        nm: ep.nm, apt: ep.apt, al: ep.al, rlm: 0, feud: true, feudBond: 0, eternal: true
      });
      if (ep.fid != null) { pe.fc = ep.fc != null ? ep.fc : -1; pe.fid = ep.fid || null; }
      if (SQ.Rumors && SQ.Rumors.pushProdigy) {
        SQ.Rumors.pushProdigy(ws, pack, D, now, 'prodigy.rumor.eternal.1', { name: nameOf(ws, pe, pack) });
      }
    }
    var count = (meta && meta.unlocks && meta.unlocks.prodigySlot) ? (PD.COUNT_MAX || 30) : (PD.COUNT_DEFAULT || 10);
    while (ws.prodigies.length < count) rollOne(ws, pack, D, meta, {});
    return ws.prodigies;
  }

  /* ── 同代榜（§四）：境界优先、同境界战力次序、同值玩家列前 ──── */
  function board(ws, pack, D, mods) {
    var rows = [];
    if (!mods) mods = SQ.Mods.collect({ talents: [] }, ws, pack, D);   /* 防御：调用方无 mods 视角时空收集兜底 */
    var playerPower = SQ.Mods.powerOf(ws, pack, D, mods);
    rows.push({ me: true, realm: ws.realm, power: playerPower });
    (ws.prodigies || []).forEach(function (p) {
      rows.push({ me: false, p: p, id: p.id, realm: p.rlm, power: powerOf(ws, p, D) });
    });
    rows.sort(function (a, b) {
      if (b.realm !== a.realm) return b.realm - a.realm;
      if (Math.abs(b.power - a.power) > 0.01) return b.power - a.power;
      return a.me ? -1 : (b.me ? 1 : 0);                 /* 平局玩家列前（有利口径） */
    });
    var myRank = 1;
    rows.forEach(function (r, i) { if (r.me) myRank = i + 1; });
    return { rows: rows, myRank: myRank };
  }

  /* 榜面快照读取（视图用）：返回冻结排序行（含玩家行，≤名录上限）；无快照返回 null → 视图回落实时榜 */
  function rankRows(ws) {
    var r = ws.prodMarks && ws.prodMarks.rankRows;
    return Array.isArray(r) && r.length ? r : null;
  }
  function boardShow(D) { return P(D).BOARD_SHOW || 10; }

  /* ── 传闻展示卡（G17 联动 · war 卡先例：不占 RUMORS.MAX、独立上限 2、TTL ren 档 40min）── */
  function rumor(ws, pack, D, now, tplKey, vars) {
    if (SQ.Rumors && SQ.Rumors.pushProdigy) SQ.Rumors.pushProdigy(ws, pack, D, now, tplKey, vars || {});
  }

  /* ── 携才投效（§6.2 事件链 · 自立门户卷 §7.1 消费口径；旧 N6 未落项）────
   * 掷点在本模块，入库只走 `SQ.Sect.acceptProdigy`（`ws.sect` 唯一写口，两侧不互写）。
   * 分支由**宗规**定、不由玩家选（卷面口径）：正 = 收入门下 / 左 = 婉拒（bond ±0 纯叙事）/
   * 魔 = 压价刁难「势·困难」判定（`JOIN_DC` 同 `ATTR_DIFF.hard` 1.5 档），胜 = 收入且天骄折节，
   * 败 = `JOIN_FEUD_P` 结仇（走 startFeud 唯一结仇口）否则 `Bonds.lose` 负向好感。
   * 名额上限校验**先行**（卷面「满员则事件根本不触发」，不是掷完再拒）：走 `Sect.joinOpen` 三口合一
   * 预检（立派 / 未传位 / 未满），与 `acceptProdigy` 内的 cap 复核成对，防直调路径越权；一月至多一人。
   * 只播日志不占 pendingChoice、不入事件池（故 奇遇 124 条计数不动）、不推 chronPush
   *（编年史白名单五类不动，见天道卷 §4.2）。 */
  function tryJoin(ws, pack, D, mods, now, log) {
    var PD = P(D);
    if (!SQ.Sect || !SQ.Sect.acceptProdigy || !SQ.Sect.joinOpen) return null;
    if (!SQ.Sect.joinOpen(ws, D)) return null;               /* 立派 / 未传位 / 名额未满 三口合一预检 */
    var disc = ws.sect.disciples || [];
    var serving = {};
    disc.forEach(function (d) { if (d.pr) serving[d.pr] = 1; });
    var cand = (ws.prodigies || []).filter(function (p) {
      return !p.feud && !serving[p.id] && ((ws.bonds || {})[p.id] || 0) >= (PD.JOIN_BOND || 30);
    });
    if (!cand.length) return null;
    if (Math.random() >= (PD.JOIN_P || 0.05)) return null;
    var p = pick(cand);
    var wid = pack.worldId;
    var vars = { name: nameOf(ws, p, pack), sect: ws.sect.name || '' };
    var al = ws.sect.align || 'neutral';
    if (al === 'right') {
      var r0 = SQ.Sect.acceptProdigy(ws, pack, D, p.id, now, log);
      return (r0 && r0.ok) ? { branch: 'right', pid: p.id, disc: r0.disc } : null;
    }
    if (al === 'evil') {
      var zi = Math.min(ws.zone || 0, (D.ZONES || []).length - 1);
      var need = ((D.ZONES[zi] || {}).need || 0) * (PD.JOIN_DC || 1.5);
      if (SQ.Mods.powerOf(ws, pack, D, mods) >= need) {
        var r1 = SQ.Sect.acceptProdigy(ws, pack, D, p.id, now, log);
        if (!r1 || !r1.ok) return null;
        if (log) log('sys', SQ.t('prodigy.join.win', vars, wid));
        return { branch: 'evilWin', pid: p.id, disc: r1.disc };
      }
      if (log) log('sys', SQ.t('prodigy.join.lose', vars, wid));
      if (Math.random() < (PD.JOIN_FEUD_P || 0.30)) startFeud(ws, pack, D, p, now, log);
      else if (SQ.Bonds) SQ.Bonds.lose(ws, pack, D, p.id, PD.JOIN_REFUSE_BOND != null ? PD.JOIN_REFUSE_BOND : -5, now);
      return { branch: 'evilLose', pid: p.id };
    }
    if (log) log('sys', SQ.t('prodigy.join.refuse', vars, wid));
    return { branch: 'left', pid: p.id };
  }

  /* ── 月度轻量结算（§三）：30 现实秒一次；离线 catch-up 一次性补算；无掷判推进 +
   * 月概率事件（换位检测 / 天才突破播报 / 狭路相逢 / 一笑泯恩仇 / 机缘竞争）── */
  function tick(ws, pack, D, mods, dtMs, now, ctx) {
    if (!Array.isArray(ws.prodigies) || !ws.prodigies.length) return null;
    var PD = P(D);
    ws.prodigyClock = (ws.prodigyClock || 0) + Math.max(0, dtMs || 0);
    var iv = (PD.SETTLE_SEC || 30) * 1000;
    var months = Math.floor(ws.prodigyClock / iv);
    if (!months) return null;
    ws.prodigyClock = ws.prodigyClock % iv;
    if (months > 480) months = 480;                       /* 离线 catch-up 上限护栏（12h 离线 = 1440 月 → 真仙早封顶，480 月足够收敛） */
    var log = ctx && ctx.log;
    var wid = pack.worldId;
    var un = unlocked(ws, D);                             /* 渐进式解锁 gate：推进照跑，事件/传闻/榜面锁到金丹 */
    var events = [];
    ws.prodMarks = ws.prodMarks || {};
    for (var mi = 0; mi < months; mi++) {
      (ws.prodigies || []).forEach(function (p) {
        /* boost 月数递减（机缘竞争 3 游戏月失效） */
        if (p.boost) {
          p.boost.months -= 1;
          if (p.boost.months <= 0) p.boost = null;
        }
        /* 推进（确定性：baseQi × 30 秒 × 资质系数；不掷渡劫；真仙封顶停积） */
        if (p.rlm < D.REALMS.length - 1) {
          var gained = (D.REALMS[p.rlm].baseQi || 1) * (PD.SETTLE_SEC || 30) * coefOf(p, D);
          p.prg += gained;
          var broke = false;
          var guard = 0;
          while (p.rlm < D.REALMS.length - 1 && guard < 10) {
            var need = D.REALMS[p.rlm + 1].need;
            if (p.prg < need) break;
            p.prg -= need; p.rlm += 1; broke = true; guard++;
          }
          if (broke) {
            if (p.rlm >= D.REALMS.length - 1) p.prg = 0;   /* 真仙封顶停积（溢出丢弃） */
            if (un && p.apt === 2 && log) {                /* 天才档突破才播日志（防刷屏；解锁前静默） */
              log('sys', SQ.t('prodigy.log.break', { name: nameOf(ws, p, pack), realm: SQ.t('realm.' + p.rlm, null, wid) }, wid));
            }
            if (un && p.apt === 2) {
              rumor(ws, pack, D, now, 'prodigy.rumor.break', { name: nameOf(ws, p, pack), realm: SQ.t('realm.' + p.rlm, null, wid) });
            }
            events.push({ type: 'break', p: p });
          }
        }
        /* 月概率事件（同区判定 = 天骄境界对应区 == 玩家当前 zone） */
        var sameZone = Math.min(p.rlm, (D.ZONES || []).length - 1) === ws.zone;
        if (!un) return;                                   /* 未解锁：事件面整体静默（forEach 早退，推进已在上方完成） */
        if (sameZone && p.feud && !ws.pendingChoice && Math.random() < (PD.FEUD_MEET_P || 0.03)) {
          events.push({ type: 'feudMeet', p: p });
        } else if (p.feud && (p.feudBond || 0) >= (PD.FEUD_FORGIVE_BOND || 70) && !ws.pendingChoice &&
          Math.random() < (PD.FEUD_FORGIVE_P || 0.05)) {
          events.push({ type: 'forgive', p: p });
        } else if (sameZone && (now - (p.rivAt || 0)) >= (PD.RIVALRY_CD_MS || 360000) &&
          Math.random() < (PD.RIVALRY_P || 0.05)) {
          /* 机缘竞争（§八 挫败受控红线：只播传闻 + 资质临时 +0.1/3 游戏月，玩家资产零扣减） */
          p.rivAt = now;
          p.boost = { add: (PD.RIVALRY_BOOST || {}).add || 0.1, months: (PD.RIVALRY_BOOST || {}).months || 3 };
          rumor(ws, pack, D, now, 'prodigy.rumor.rivalry.' + (1 + Math.floor(Math.random() * 3)),
            { name: nameOf(ws, p, pack), faction: factionNameOf(ws, p, pack) });
          events.push({ type: 'rivalry', p: p });
        }
      });
      /* 携才投效月掷（§6.2；解锁 gate 与其余月概率事件同口径——金丹前事件面整体静默） */
      if (un) tryJoin(ws, pack, D, mods, now, log);
    }
    /* 榜面刷新（每 10 游戏年一次 · 首次结算即初始化）：快照冻结排序与数值，
     * 换位播报只在刷新边界发生（N4 收口批：天象静默**已解除**——prodrank 入 OMEN_NODES，
     * 刷新边界与编年史 / 传闻同点并播出短评，纯文本零机制、天道卷 §九.6 同口径）。
     * 解锁 gate：金丹前不刷新不播报；解锁后首次结算自然初始化 prevRank（不当轮播报）。 */
    if (un) {
      var rkAt = ws.prodMarks.rankAt || 0;
      if (!rkAt || now - rkAt >= (PD.RANK_REFRESH_MS || 3600000)) {
        var bd = board(ws, pack, D, mods);
        var prevRank = ws.prodMarks.myRank || 0;
        ws.prodMarks.myRank = bd.myRank;
        ws.prodMarks.rankAt = now;
        ws.prodMarks.rankRows = bd.rows.map(function (r) {
          return { me: !!r.me, id: r.me ? null : r.id, realm: r.realm, power: r.power };
        });
        if (prevRank && prevRank !== bd.myRank) {
          var dir = bd.myRank < prevRank ? 'up' : 'down';
          if (SQ.Tiandao && SQ.Tiandao.chronPush) SQ.Tiandao.chronPush(ws, 'prodrank', { dir: dir, rank: bd.myRank }, now);
          /* N4 榜位换位入天象节点（天骄卷 :136/:483 候选扩展节点转正）：与编年史 / 传闻同一刷新边界、
           * 同一次换位只入队一次；纯文本短评，队列 OMEN_QUEUE_CAP(3) 溢出挤最旧，机制字段零触碰 */
          if (SQ.Tiandao && SQ.Tiandao.pushOmen) SQ.Tiandao.pushOmen(ws, pack, D, 'prodrank', { dir: dir, rank: bd.myRank }, now);
          rumor(ws, pack, D, now, 'prodigy.rumor.rank.' + dir, { n: bd.myRank });
        }
      }
    }
    /* 狭路相逢 / 一笑泯恩仇：至多触发一条（pendingChoice 独占） */
    for (var ei = 0; ei < events.length; ei++) {
      var ev = events[ei];
      if ((ev.type === 'feudMeet' || ev.type === 'forgive') && !ws.pendingChoice) {
        fireProdigyEvent(ws, pack, D, ev.type === 'feudMeet' ? 'prodigy_ev_feud' : 'prodigy_ev_forgive', ev.p.id, now, ctx);
        break;
      }
    }
    /* bond 达档专属事件（30/70/100，once 每档每天骄一次；解锁 gate 同款） */
    if (un && !ws.pendingChoice) {
      var evFired = false;
      (ws.prodigies || []).forEach(function (p) {
        if (evFired || p.feud) return;
        var bond = (ws.bonds || {})[p.id] || 0;
        var fired = (ws.prodMarks.evf && ws.prodMarks.evf[p.id]) || 0;
        var tiers = PD.BOND_EVENTS || [30, 70, 100];
        var evIds = ['prodigy_ev_drink', 'prodigy_ev_gift', 'prodigy_ev_escort'];
        for (var ti = 0; ti < tiers.length; ti++) {
          if (bond >= tiers[ti] && fired < ti + 1) {
            ws.prodMarks.evf = ws.prodMarks.evf || {};
            ws.prodMarks.evf[p.id] = ti + 1;
            fireProdigyEvent(ws, pack, D, evIds[ti], p.id, now, ctx);
            evFired = true;
            break;
          }
        }
      });
    }
    return events.length ? events : null;
  }

  /* 天骄专属事件触发（独立触发面：不入常规抽取池——tags:['prodigy'] 隔离，对表 fireTagged 落地五件套） */
  function fireProdigyEvent(ws, pack, D, evId, pid, now, ctx) {
    if (!unlocked(ws, D)) return null;                    /* 渐进式解锁 gate（防御双保险：tick 已门控，此处兜底直调） */
    var ev = SQ.Events.findById(pack, evId);
    if (!ev) return null;
    ws.eventCooldowns[evId] = now;
    ws.eventHistory.lastId = evId;
    if (ws.eventHistory.seen[evId] == null) ws.eventHistory.seen[evId] = now;
    ws.pendingChoice = { id: evId, at: now, tier: ev.tier, nature: ev.nature, via: 'prodigy', prodigy: pid };
    if (ctx && ctx.log) {
      ctx.log('event', SQ.t('prodigy.log.evfire', { name: SQ.t('event.' + evId + '.name', null, pack.worldId) }, pack.worldId));
    }
    return { id: evId, prodigy: pid, pending: true };
  }

  /* ── 论道切磋（§五 v2 · 切磋平衡批）：7 现实天/人 CD · ±10% 掷判 · 三档赌注 · 强弱差让 ·
   * 胜方材料彩头（材料账零灵石流）· bond 与结仇（重注上浮）── */
  function normKind(kind) { return (kind === 'light' || kind === 'heavy') ? kind : 'std'; }
  function sparStake(ws, D, kind) {
    var z = (D.ZONES || [])[Math.min(ws.realm || 0, (D.ZONES || []).length - 1)] || {};
    var k3 = P(D).STAKE_K3 || {};
    var k = k3[normKind(kind)] != null ? k3[normKind(kind)] : (P(D).SPAR_STAKE_K || 20);
    return Math.round((z.stones || 3) * k);
  }
  function spar(ws, pack, D, mods, pid, now, log, kind) {
    var PD = P(D);
    if (!unlocked(ws, D)) return { ok: false, reason: 'locked' };   /* 渐进式解锁 gate（§C4）：金丹前不可切磋 */
    var p = byId(ws, pid);
    if (!p) return { ok: false, reason: 'unknown' };
    kind = normKind(kind);
    var cdMs = (PD.SPAR_CD_DAYS || 7) * 86400000;
    if (p.lastSparAt > 0 && now - p.lastSparAt < cdMs) {
      return { ok: false, reason: 'cd', until: p.lastSparAt + cdMs };
    }
    var wid = pack.worldId;
    var stake = sparStake(ws, D, kind);
    if (ws.stones < stake) return { ok: false, reason: 'poor', stake: stake };   /* 开局押注门槛（不足不掷不耗 CD） */
    var myP = SQ.Mods.powerOf(ws, pack, D, mods);
    var q0 = powerOf(ws, p, D);
    /* 强弱差让（§5.3 v2）：ratio = 浮动前真战力比——碾压胜返 ×1.5/bond+1，以强胜返 ×3/bond+3/材料率上浮 */
    var HC = PD.HANDICAP || {};
    var ratio = q0 > 0 ? myP / q0 : 999;
    var crush = ratio >= (HC.crush != null ? HC.crush : 1.5);
    var brave = !crush && ratio <= (HC.brave != null ? HC.brave : 0.8);
    var j = PD.SPAR_JITTER || 0.10;
    var Pp = myP * (1 + (Math.random() * 2 - 1) * j);
    var Q = q0 * (1 + (Math.random() * 2 - 1) * j);
    var band = PD.SPAR_DRAW_BAND || 0.01;
    var hi = Math.max(Pp, Q);
    var result = (hi > 0 && Math.abs(Pp - Q) / hi <= band) ? 'draw' : (Pp > Q ? 'win' : 'lose');
    p.lastSparAt = now;
    if (result === 'win') p.wl[0]++;
    else if (result === 'lose') p.wl[1]++;
    else p.wl[2]++;
    /* 赌注（§5.3 v2）：平局不记账；非平 = 押注扣（out.event_loss 既有分类）；
     * 胜 = 返还 ret 记 in.event（净 ret−stake，让差浮动）——恒等式 #113 零新增分类 */
    var ret = 0;
    if (result !== 'draw') {
      ws.stones -= stake;
      SQ.Ledger.note(ws, 'out', 'event_loss', stake);
      if (result === 'win') {
        var retMult = crush ? (HC.crushRet != null ? HC.crushRet : 1.5)
          : (brave ? (HC.braveRet != null ? HC.braveRet : 3) : 2);
        ret = Math.round(stake * retMult);
        ws.stones += ret;
        SQ.Ledger.note(ws, 'in', 'event', ret);
      }
    }
    /* bond 后果（§5.4 v2）：宿敌冻结拒入账；胜档随让差（碾压 1 / 标准 2 / 以强 3）；负后结仇掷（重注上浮） */
    var bg = (PD.BOND_GAIN || {})[result] || 1;
    if (result === 'win') {
      bg = crush ? (HC.crushBond != null ? HC.crushBond : 1)
        : (brave ? (HC.braveBond != null ? HC.braveBond : 3) : bg);
    }
    var gainRes = null;
    if (!p.feud) {
      gainRes = SQ.Bonds.gain(ws, pack, D, pid, bg, now);
    }
    var feudStarted = false;
    if (result === 'lose' && !p.feud &&
      Math.random() < (kind === 'heavy' ? (PD.SPAR_FEUD_P_HEAVY || 0.40) : (PD.SPAR_FEUD_P || 0.30))) {
      feudStarted = true;
      startFeud(ws, pack, D, p, now, log);
    }
    /* 胜方材料彩头（§5.3 v2 · 材料账双路零灵石流，提炼先例）：同境界区组随机材料 ×1。
     * 随机序在结仇掷之后（win 路径第 3 掷）——stubRandom 序列既有断言兼容口径。 */
    var matGain = null;
    if (result === 'win' && SQ.Alchemy && SQ.Alchemy.addMats) {
      var matP = brave ? (HC.braveMatP != null ? HC.braveMatP : 0.15) : (PD.SPAR_MAT_P || 0.10);
      if (Math.random() < matP) {
        var r0 = Math.min(ws.realm || 0, 9);
        var zg = r0 >= 9 ? 3 : (r0 >= 6 ? 2 : (r0 >= 3 ? 1 : 0));
        var pool = ((D.ALCHEMY || {}).MATS || []).filter(function (x) {
          return x.z >= 0 && SQ.Alchemy.groupOf(D, x.id) === zg;
        }).map(function (x) { return x.id; });
        if (pool.length) {
          matGain = pool[Math.floor(Math.random() * pool.length)];
          var gains = {}; gains[matGain] = 1;
          SQ.Alchemy.addMats(ws, pack, D, gains, now, null);
        }
      }
    }
    if (log) {
      log('sys', SQ.t('prodigy.log.spar.' + result, {
        name: nameOf(ws, p, pack), n: SQ.fmt(stake), cur: SQ.t('resource.currency', null, wid)
      }, wid));
      if (matGain) {
        log('sys', SQ.t('prodigy.log.spar.mat', { mat: SQ.t('alchemy.mat.' + matGain + '.name', null, wid) }, wid));
      }
    }
    if (SQ.Tiandao && SQ.Tiandao.chronPush) {
      SQ.Tiandao.chronPush(ws, 'prodspar', { name: nameOf(ws, p, pack), r: result }, now);
    }
    return { ok: true, result: result, stake: result === 'draw' ? 0 : stake, ret: ret, kind: kind,
      myP: myP, q: q0, ratio: ratio, crush: crush, brave: brave, mat: matGain,
      bond: gainRes, feud: feudStarted };
  }

  function startFeud(ws, pack, D, p, now, log) {
    p.feud = true;
    p.feudBond = (ws.bonds || {})[p.id] || 0;             /* 结仇时 bond 快照（释怀通道判定源） */
    if (log) log('sys', SQ.t('prodigy.log.feud', { name: nameOf(ws, p, pack) }, pack.worldId));
    rumor(ws, pack, D, now, 'prodigy.rumor.feud', { name: nameOf(ws, p, pack) });
    if (SQ.Tiandao && SQ.Tiandao.chronPush) SQ.Tiandao.chronPush(ws, 'prodfeud', { name: nameOf(ws, p, pack) }, now);
  }

  function endFeud(ws, pack, D, p, now, log, killed) {
    p.feud = false;
    if (log) log('sys', SQ.t(killed ? 'prodigy.log.kill' : 'prodigy.log.feudend', { name: nameOf(ws, p, pack) }, pack.worldId));
    if (SQ.Tiandao && SQ.Tiandao.chronPush) {
      SQ.Tiandao.chronPush(ws, killed ? 'prodkill' : 'prodfeudend', { name: nameOf(ws, p, pack) }, now);
    }
  }

  /* 心结渡劫加项（§7.1）：feud ≥1 即 −0.02，恒定单份不叠加（XTrib.info talent 同读点） */
  function tribModOf(ws, D) {
    var any = false;
    (ws.prodigies || []).forEach(function (p) { if (p.feud) any = true; });
    return any ? (P(D).FEUD_TRIB != null ? P(D).FEUD_TRIB : -0.02) : 0;
  }

  /* 狭路相逢/一笑泯恩仇 结算后处理（actions.resolveChoice 在 resolveBranch 前抓取 pid 传入）：
   * 正胜 = 心结除；魔胜 = 斩杀出榜 + karma 按天骄阵营；败 = failE 已在事件内全额结算，心结仍在 */
  function onEventResolved(ws, s, pack, D, evId, branchKey, pass, now, pid) {
    var p = pid ? byId(ws, pid) : null;
    if (!p) return null;
    var out = { pid: pid };
    if (evId === 'prodigy_ev_feud' && pass) {
      if (branchKey === 'right') {
        endFeud(ws, pack, D, p, now, null, false);
        out.cleared = true;
      } else if (branchKey === 'evil') {
        /* 斩杀：心结除 + 出榜（槽位不复用）+ karma 按阵营 + 跨世宿敌清位 + 成就标记 */
        endFeud(ws, pack, D, p, now, null, true);
        var kd = (P(D).FEUD_KILL_KARMA || [-25, -10, 15])[p.al] || -10;
        ws.karmaEventScore = (ws.karmaEventScore || 0) + kd;
        out.karma = kd;
        out.killed = true;
        if (p.eternal && s && s.meta) s.meta.eternalProdigy = null;
        if (p.eternal) { ws.prodMarks = ws.prodMarks || {}; ws.prodMarks.sudiWin = true; }
        ws.prodigies = (ws.prodigies || []).filter(function (x) { return x.id !== p.id; });
        rumor(ws, pack, D, now, 'prodigy.rumor.kill', { name: nameOf(ws, p, pack) });
      }
    }
    if (evId === 'prodigy_ev_forgive' && (branchKey === 'right' ? pass : branchKey === 'neutral')) {
      endFeud(ws, pack, D, p, now, null, false);
      if (branchKey === 'right') SQ.Bonds.gain(ws, pack, D, p.id, 5, now);   /* 致歉成功 bond 解冻 +5 */
      out.cleared = true;
    }
    return out;
  }

  /* 转世留存（Legacy.finishRebirth 调用）：跨世宿敌资格 = 在档 feud 天骄之一（已释怀/斩杀者不进） */
  function saveEternal(ws, meta) {
    if (!meta || !meta.unlocks || !meta.unlocks.nemesis) return;
    if (meta.eternalProdigy) return;                       /* 已有宿敌在档不覆盖 */
    var cand = null;
    (ws.prodigies || []).forEach(function (p) { if (!cand && p.feud && !p.eternal) cand = p; });
    if (!cand) return;
    meta.eternalProdigy = {
      nm: cand.nm, apt: cand.apt, al: cand.al, fc: cand.fc, fid: cand.fid,
      rlm: cand.rlm, wl: cand.wl, feud: true
    };
  }

  SQ.Prodigy = {
    byId: byId,
    unlockRealm: unlockRealm,
    unlocked: unlocked,
    normKind: normKind,
    nameOf: nameOf,
    factionNameOf: factionNameOf,
    powerOf: powerOf,
    coefOf: coefOf,
    normalize: normalize,
    rollForNewLife: rollForNewLife,
    rollOne: rollOne,
    board: board,
    rankRows: rankRows,
    boardShow: boardShow,
    tick: tick,
    fireProdigyEvent: fireProdigyEvent,
    tryJoin: tryJoin,
    spar: spar,
    sparStake: sparStake,
    startFeud: startFeud,
    tribModOf: tribModOf,
    onEventResolved: onEventResolved,
    saveEternal: saveEternal
  };
})();
