/* systems/sect.js — 自立门户（宗门系统 · 自立门户卷 v1.1 唯一事实源）
 * 终局身份玩法：开宗四门槛 → 立派三定（山门/宗名/宗规）→ 弟子（招收/培养/供奉挂名）
 * → 四设施（caveFac 构型复用，等级 1~5，来源 'sectFac'）→ 第 17 动态位（排行/战争全复用战功制）
 * → 宗主实权（调遣 2h/CD24h 来源 'sect' + 供奉月缴 in.tribute）→ 传位（宗门转 NPC + 称号跨世）。
 * 红线：零渡劫加项、弟子推进零玩家轴（sim-pacing 稳态带零侵入）、净水槽经济、
 * Ledger 净变化恰 +1 路（in.tribute）；ws.sect 唯一写口 = 本模块；派生值（战力/声望/槽数）不落库。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var num = SQ.util.num, obj = SQ.util.obj, pick = SQ.util.pick;   /* C1：统一至 assets/util.js */
  function S(D) { return D.SECT || {}; }

  /* ── normalize（§9.1：null = 未开宗；结构非法逐项清理零崩溃）──── */
  function normalize(raw, D) {
    if (!raw || typeof raw !== 'object') return null;
    var SC = S(D);
    var out = null;
    var succ = obj(raw.succession, null);
    if (succ && succ.done === true) {
      /* 传位后轻量纪念结构（弟子名录已随宗门转入 NPC 侧） */
      out = {
        name: (typeof raw.name === 'string' ? raw.name : '').slice(0, SC.NAME_MAX || 6) || null,
        gate: (SC.GATES || []).indexOf(raw.gate) >= 0 ? raw.gate : null,
        align: (raw.align === 'right' || raw.align === 'evil') ? raw.align : 'neutral',
        disciples: [], fac: {}, everDefected: raw.everDefected === true,
        dispatchAt: 0, lastTribMonth: 0, monthClock: 0, matAcc: 0,
        warRecord: { wins: 0, loses: 0 }, suppressed: {},
        recruitAt: 0, foundAt: Math.max(0, num(raw.foundAt, 0)), candidate: null, warAgg: null, seq: 0,
        succession: { done: true, heir: String(succ.heir || '').slice(0, 24), rep: Math.max(0, Math.floor(num(succ.rep, 0))), at: Math.max(0, num(succ.at, 0)) }
      };
      return out;
    }
    if (!raw.name && !raw.gate) return null;                /* 空壳脏档 → 未开宗 */
    out = {
      name: (typeof raw.name === 'string' ? raw.name : '').slice(0, SC.NAME_MAX || 6),
      nameIdx: (Array.isArray(raw.nameIdx) && raw.nameIdx.length === 2) ? [Math.floor(num(raw.nameIdx[0], 0)), Math.floor(num(raw.nameIdx[1], 0))] : null,
      gate: (SC.GATES || []).indexOf(raw.gate) >= 0 ? raw.gate : (SC.GATES || [])[0],
      align: (raw.align === 'right' || raw.align === 'evil') ? raw.align : 'neutral',
      disciples: [], fac: {}, everDefected: raw.everDefected === true,
      dispatchAt: Math.max(0, num(raw.dispatchAt, 0)),
      lastTribMonth: Math.max(0, num(raw.lastTribMonth, 0)),
      monthClock: Math.max(0, num(raw.monthClock, 0)),
      /* 材料供奉期望累加器（§2.6 速率制；脏档一律归零，上限 <1 由 tick 内 floor 支取保证） */
      matAcc: Math.max(0, Math.min(1, num(raw.matAcc, 0))),
      warRecord: { wins: Math.max(0, Math.floor(num((obj(raw.warRecord, {})).wins, 0))),
        loses: Math.max(0, Math.floor(num((obj(raw.warRecord, {})).loses, 0))) },
      suppressed: obj(raw.suppressed, {}),
      recruitAt: Math.max(0, num(raw.recruitAt, 0)),
      foundAt: Math.max(0, num(raw.foundAt, 0)),
      declareAt: Math.max(0, num(raw.declareAt, 0)),
      candidate: null, warAgg: null,
      seq: Math.max(0, Math.floor(num(raw.seq, 0))),
      succession: null
    };
    /* 设施四键逐个钳位 [0,5]，未知键丢弃 */
    var rawFac = obj(raw.fac, {});
    (SC.FAC_IDS || []).forEach(function (fid) {
      var lv = Math.floor(num(rawFac[fid], 0));
      out.fac[fid] = Math.max(0, Math.min(SC.FAC_MAX || 5, lv));
    });
    /* 弟子表：结构逐项校验、超长截断至上限 */
    var capBase = SC.DISC_CAP_BASE != null ? SC.DISC_CAP_BASE : 1;
    var cap = capBase + (out.fac.keshe || 0);
    var aptIds = SC.APT_IDS || ['fine', 'mid', 'raw'];
    var perkFields = (SC.DISPATCH || {}).fields || [];
    var offN = 0;
    (Array.isArray(raw.disciples) ? raw.disciples : []).forEach(function (dsc) {
      if (!dsc || typeof dsc !== 'object' || out.disciples.length >= 8) return;
      if (typeof dsc.id !== 'string' || !/^d\d+$/.test(dsc.id)) return;
      var isOff = typeof dsc.offering === 'string' && dsc.offering;
      if (isOff) {
        if (offN >= (SC.OFFER_CAP || 2)) return;
        offN++;
      }
      var rec = {
        id: dsc.id,
        nm: (Array.isArray(dsc.nm) && dsc.nm.length === 2) ? [Math.max(0, Math.floor(num(dsc.nm[0], 0))) % 24, Math.max(0, Math.floor(num(dsc.nm[1], 0))) % 48] : [0, 0],
        tier: aptIds.indexOf(dsc.tier) >= 0 ? dsc.tier : 'mid',
        realm: Math.max(0, Math.min(9, Math.floor(num(dsc.realm, 0)))),
        prog: Math.max(0, num(dsc.prog, 0)),
        inv: Math.max(0, Math.min(2, Math.floor(num(dsc.inv, 0)))),
        perk: perkFields.indexOf(dsc.perk) >= 0 ? dsc.perk : perkFields[0],
        tianjiao: dsc.tianjiao === true
      };
      /* 携才投效入门位（N6 收口批 · 天骄卷 §6.2）：`pr` = 天骄槽位 id（/^pr\\d+$/），
       * 有值 ⇒ 弟子名录取名走 `Prodigy.nameOf`、且天然免疫「供奉挂名」名额（那是 `offering` 轴）。
       * 非法/名录外 id 整字段丢弃（弟子记录退回普通弟子形态，不炸档）。 */
      if (typeof dsc.pr === 'string' && /^pr\d+$/.test(dsc.pr)) rec.pr = dsc.pr;
      if (isOff) rec.offering = String(dsc.offering).slice(0, 24);
      var nI = parseInt(dsc.id.slice(1), 10);
      if (nI > out.seq) out.seq = nI;
      out.disciples.push(rec);
    });
    var wagg = obj(raw.warAgg, null);
    if (wagg && typeof wagg.bId === 'string') out.warAgg = { bId: wagg.bId.slice(0, 24), until: Math.max(0, num(wagg.until, 0)) };
    for (var sk in out.suppressed) out.suppressed[sk] = Math.max(0, Math.min(1, num(out.suppressed[sk], 1)));
    void cap;
    return out;
  }

  function discCap(ws, D) {
    var SC = S(D);
    return (SC.DISC_CAP_BASE != null ? SC.DISC_CAP_BASE : 1) + (((ws.sect || {}).fac || {}).keshe || 0);
  }
  /* 携才投效生成端预检（N6 · 自立门户卷 §7.1「上限校验先行，满员则事件根本不触发」）：
   * true = 此刻**可以**有天骄登门（已立派、未传位、弟子未满）；prodigy.js 掷点前查此口，
   * 满员时整条事件不生成（不是生成后再拒）。 */
  function joinOpen(ws, D) {
    if (!ws || !ws.sect || ws.sect.succession) return false;
    return (ws.sect.disciples || []).length < discCap(ws, D);
  }
  function byDiscId(ws, id) {
    var out = null;
    (((ws.sect || {}).disciples) || []).forEach(function (d) { if (d.id === id) out = d; });
    return out;
  }
  function discName(ws, d, pack) {
    if (d.offering) return SQ.t('bond.' + d.offering + '.name', null, pack.worldId);
    /* 携才投效入门的天骄：名录取天骄本名（prodigy.js nameOf 走 `prodigy.nm.*` 池）；
     * 该天骄已斩杀出榜（byId 落空）时回落山门俗名，不显空串 */
    if (d.pr && SQ.Prodigy) {
      var pp = SQ.Prodigy.byId(ws, d.pr);
      if (pp) return SQ.Prodigy.nameOf(ws, pp, pack);
    }
    return SQ.t('sect.disc.sur.' + (d.nm[0] % 24 + 1), null, pack.worldId) +
      SQ.t('sect.disc.giv.' + (d.nm[1] % 48 + 1), null, pack.worldId);
  }

  /* ── 宗规传法子集（§2.3：弟子可学功法 = 玩家已持有功法按 alignment 的子集过滤）
   * 只约束弟子传法（藏经阁抽取范围），**不锁宗主自己**——ws.artsKnown / artsSlots / 习得链零触及。
   * 合格部数 = Σ artsKnown 中 alignment ∈ ART_ALLOW[宗规] 者；功法定义取 pack.artsMap()
   * （= SQ.XARTS，含融合自创部的运行态注册，其 alignment 由 fusion.js toArt 落同名字段）。 */
  function artAllowOf(ws, SC) {
    var allow = (SC.ART_ALLOW || {})[((ws || {}).sect || {}).align];
    return Array.isArray(allow) ? allow : null;
  }
  function eligibleArtsN(ws, pack, SC) {
    var map = (pack && pack.artsMap) ? pack.artsMap() : (SQ.XARTS || {});
    var allow = artAllowOf(ws, SC);
    var n = 0;
    (((ws || {}).artsKnown) || []).forEach(function (id) {
      var a = (map || {})[id];
      if (!a) return;
      if (allow && allow.indexOf(a.alignment) < 0) return;
      n++;
    });
    return n;
  }
  /* 藏经阁生效槽数 = min(ART_SLOTS[等级], 合格已持功法部数)——子集过滤只收窄，永不放大 */
  function zangjingSlots(ws, pack, SC) {
    var lv = ((((ws || {}).sect || {}).fac) || {}).zangjing || 0;
    return Math.min((SC.ART_SLOTS || [1])[lv] || 1, eligibleArtsN(ws, pack, SC));
  }

  /* ── 派生值（单一事实源，禁落库）：弟子战力 / 宗门战力 / 宗门声望 ── */
  function discPower(ws, pack, D, d) {
    var SC = S(D);
    if (d.offering) {
      /* 供奉 = 同辈高人：P[宗主境界] × 0.7 × 良才系数（挂名不传法 → 不受藏经阁与子集约束） */
      return (D.REALMS[Math.min(ws.realm, D.REALMS.length - 1)].power || 20) * 0.7 * ((SC.APT_MULT || {}).fine || 1.2);
    }
    var base = (D.REALMS[Math.min(d.realm, D.REALMS.length - 1)].power || 20) * ((SC.APT_MULT || {})[d.tier] || 1);
    base *= (1 + zangjingSlots(ws, pack, SC) * (SC.ART_POWER || 0.08));
    if (d.tianjiao) base *= (SC.TIANJIAO_MULT || 1.2);
    return base;
  }
  function sectPower(ws, pack, D, mods) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return 0;
    var sum = 0;
    (ws.sect.disciples || []).forEach(function (d) { sum += discPower(ws, pack, D, d); });
    var fac = 1 + ((ws.sect.fac || {}).yanwu || 0) * (SC.YANWU_K || 0.05);
    var myP = mods ? SQ.Mods.powerOf(ws, pack, D, mods) : 0;
    return sum * fac + myP * (SC.SELF_K || 0.5);
  }
  function sectRep(ws, D) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return 0;
    var rep = SC.REP_BASE || 500;
    (ws.sect.disciples || []).forEach(function (d) { if (!d.offering) rep += (d.realm || 0) * (SC.REP_DISC || 50); });
    var facTotal = 0;
    for (var fk in (ws.sect.fac || {})) facTotal += ws.sect.fac[fk] || 0;
    rep += facTotal * (SC.REP_FAC || 100);
    rep += ((ws.sect.warRecord || {}).wins || 0) * (SC.REP_WIN || 200);
    return rep;
  }
  /* NPC 势力声望排行暂用口径（§5.2）：1500 + 500 × 档次（固定池序 0~3 循环映射 1~4 档）+ 宗门压制 */
  function npcRepOf(ws, D, fid) {
    var SC = S(D);
    var idx = 0, i = 0;
    (ws.factions || []).forEach(function (f) { if (f.id === fid) idx = i; if (f.fixed) i++; });
    var tier = 1 + (idx % 4);
    var rep = (SC.NPC_REP_BASE || 1500) + (SC.NPC_REP_PER_TIER || 500) * tier;
    var sup = ((ws.sect || {}).suppressed || {})[fid];
    if (sup != null) rep = Math.round(rep * sup);
    return rep;
  }

  /* ── 开宗四门槛（§1.2 逐项校验，缺一拒开）────────────── */
  function canFound(ws, pack, D, meta) {
    var SC = S(D);
    if (ws.sect) return { ok: false, reason: ws.sect.succession ? 'done' : 'has' };
    if ((ws.realm || 0) < (SC.FOUND_REALM != null ? SC.FOUND_REALM : 4)) return { ok: false, reason: 'realm' };
    var rankOk = false;
    if (ws.factionId && ws.factionId !== 'sect' && SQ.Factions && SQ.Factions.rankOf) {
      rankOk = SQ.Factions.rankOf(ws, D) >= (SC.FOUND_RANK != null ? SC.FOUND_RANK : 4);
    }
    var everDef = ws.everDefected === true || (ws.sect && ws.sect.everDefected === true);
    if (!rankOk && !everDef) return { ok: false, reason: 'identity' };
    if ((ws.factionRepPeak || 0) < (SC.FOUND_REP_PEAK != null ? SC.FOUND_REP_PEAK : 2000)) return { ok: false, reason: 'peak' };
    if (!meta || !meta.unlocks || meta.unlocks.sect !== true) return { ok: false, reason: 'unlock' };
    return { ok: true };
  }

  /* ── 立派（§1.4 开宗结算事务：专用脱离零叛离惩罚 + 三定 + 关系播种 + 公告）── */
  function foundSect(ws, pack, D, meta, gateId, nameCustom, nameIdx, align, now, log) {
    var SC = S(D);
    var chk = canFound(ws, pack, D, meta);
    if (!chk.ok) return chk;
    if ((SC.GATES || []).indexOf(gateId) < 0) return { ok: false, reason: 'gate' };
    if (['right', 'neutral', 'evil'].indexOf(align) < 0) return { ok: false, reason: 'align' };
    var wid = pack.worldId;
    /* 宗名：自定义 ≤6 字（敏感词过滤复用天道库，越线拒绝不落档）或词库索引对 */
    var name = null;
    if (typeof nameCustom === 'string' && nameCustom.trim()) {
      var cand = nameCustom.trim().slice(0, SC.NAME_MAX || 6);
      var bad = SQ.Tiandao && SQ.Tiandao.filterText ? SQ.Tiandao.filterText(cand, pack).hit : false;
      if (!cand || bad) return { ok: false, reason: 'name' };
      name = cand;
    }
    var nIdx = (Array.isArray(nameIdx) && nameIdx.length === 2) ? nameIdx : null;
    if (!name && !nIdx) nIdx = SQ.Sect.rollIdx();
    if (!name) name = SQ.Sect.nameOfIdx(nIdx, wid);
    /* ① 旧门脱离（专用结算：不触发叛离惩罚——karma/bond 零扣，声望清零、委托作废、职位清理、
     * LEAVE_CD 不占用；功成身退自立门户，非背弃） */
    var oldName = null;
    if (ws.factionId && ws.factionId !== 'sect') {
      var oldF = SQ.Factions.byId(ws, ws.factionId);
      oldName = oldF ? oldF.name : null;
      if (ws.factionRep) delete ws.factionRep[ws.factionId];
      ws.factionQuest = null;
      ws.factionOffice = null;
      if (ws.tribulation) ws.tribulation.officeGuard = false;
    }
    /* ② 立派三定写入 ws.sect */
    ws.sect = {
      name: name, nameIdx: nIdx, gate: gateId, align: align,
      disciples: [], fac: { zangjing: 0, danfang: 0, yanwu: 0, keshe: 0 },
      everDefected: ws.everDefected === true,
      dispatchAt: 0, lastTribMonth: 0, monthClock: 0,
      warRecord: { wins: 0, loses: 0 }, suppressed: {},
      recruitAt: 0, foundAt: now, candidate: null, warAgg: null, seq: 0, succession: null
    };
    ws.factionId = 'sect';
    /* ③ 第 17 动态位入势力池（追加位：固定池名录与正典种子零改动；perk v=0 = 零玩家乘区） */
    var sectEntry = null;
    if (!Array.isArray(ws.factions)) ws.factions = [];   /* 防御：factions 惰性播种档直调兜底 */
    (ws.factions || []).forEach(function (f) { if (f.id === 'sect') sectEntry = f; });
    if (!sectEntry) {
      sectEntry = { id: 'sect', name: name, align: align, desc: 'sect.faction.desc',
        fixed: false, perk: { field: 'qiRate', v: 0 }, rel: {} };
      ws.factions.push(sectEntry);
    }
    sectEntry.name = name;
    sectEntry.align = align;
    /* 关系播种（§5.3）：同 align friendly 50/neutral 50；正↔魔 固定 enemy；其余随机 30/25/45 */
    (ws.factions || []).forEach(function (f) {
      if (f.id === 'sect') return;
      var rel;
      if ((align === 'right' && f.align === 'evil') || (align === 'evil' && f.align === 'right')) rel = 'enemy';
      else if (f.align === align) rel = Math.random() < 0.5 ? 'friendly' : 'neutral';
      else { var r = Math.random(); rel = r < 0.30 ? 'friendly' : (r < 0.55 ? 'enemy' : 'neutral'); }
      sectEntry.rel[f.id] = rel;
      f.rel = f.rel || {};
      f.rel['sect'] = rel;                                    /* 对称写入（势力全录 §7.3 同口径） */
    });
    /* ④ 世界公告：传闻展示卡 + 编年史 + 日志 */
    if (SQ.Rumors && SQ.Rumors.pushProdigy) {
      SQ.Rumors.pushProdigy(ws, pack, D, now, 'sect.found.rumor', { name: name });
    }
    if (SQ.Tiandao && SQ.Tiandao.chronPush) SQ.Tiandao.chronPush(ws, 'sectfound', { name: name }, now);
    if (log) log('sys', SQ.t('sect.found.log', { name: name, gate: SQ.t('sect.gate.' + gateId + '.name', null, wid) }, wid));
    if (oldName && log) log('sys', SQ.t('sect.found.leave', { name: oldName }, wid));
    return { ok: true, name: name };
  }

  /* ── 弟子招收（每现实 24h 一掷候选；资质按宗规权重三档；候选可弃）──── */
  function recruit(ws, pack, D, now, log) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    if (ws.sect.recruitAt > 0 && now - ws.sect.recruitAt < (SC.RECRUIT_CD_MS || 86400000)) {
      return { ok: false, reason: 'cd', until: ws.sect.recruitAt + (SC.RECRUIT_CD_MS || 86400000) };
    }
    ws.sect.recruitAt = now;
    var w = (SC.APT_W || {})[ws.sect.align] || [15, 55, 30];
    var total = w[0] + w[1] + w[2];
    var r = Math.random() * total;
    var tier = (r -= w[0]) < 0 ? 'fine' : ((r -= w[1]) < 0 ? 'mid' : 'raw');
    ws.sect.candidate = {
      nm: [Math.floor(Math.random() * 24), Math.floor(Math.random() * 48)],
      tier: tier,
      perk: pick((SC.DISPATCH || {}).fields || ['combatPower'])
    };
    if (log) log('sys', SQ.t('sect.disc.candidate', { name: sectCandidateName(ws, pack) }, pack.worldId));
    return { ok: true, candidate: ws.sect.candidate };
  }
  function sectCandidateName(ws, pack) {
    var c = (ws.sect || {}).candidate;
    if (!c) return '';
    return SQ.t('sect.disc.sur.' + (c.nm[0] % 24 + 1), null, pack.worldId) +
      SQ.t('sect.disc.giv.' + (c.nm[1] % 48 + 1), null, pack.worldId);
  }
  function acceptCandidate(ws, pack, D, now, log) {
    if (!ws.sect || !ws.sect.candidate) return { ok: false, reason: 'none' };
    if ((ws.sect.disciples || []).length >= discCap(ws, D)) return { ok: false, reason: 'cap' };
    var c = ws.sect.candidate;
    ws.sect.seq = (ws.sect.seq || 0) + 1;
    ws.sect.disciples.push({
      id: 'd' + ws.sect.seq, nm: c.nm, tier: c.tier, realm: 0, prog: 0, inv: 0,
      perk: c.perk, tianjiao: false
    });
    ws.sect.candidate = null;
    if (log) log('sys', SQ.t('sect.disc.accept', { name: discName(ws, ws.sect.disciples[ws.sect.disciples.length - 1], pack) }, pack.worldId));
    return { ok: true };
  }
  function rejectCandidate(ws) {
    if (!ws.sect || !ws.sect.candidate) return { ok: false, reason: 'none' };
    ws.sect.candidate = null;
    return { ok: true };
  }
  /* 请为供奉（挂名制 §3.3：bond ≥70，档 3 应允率 50% / 档 4 必允；≤2 名占弟子上限） */
  function inviteOffering(ws, pack, D, npcId, now, log) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    var c = SQ.Bonds ? SQ.Bonds.byId(pack, npcId) : null;
    if (!c) return { ok: false, reason: 'unknown' };
    var tier = SQ.Bonds.tierOf(ws, npcId, D);
    var aff = (ws.bonds || {})[npcId] || 0;
    if (aff < (SC.OFFER_BOND || 70) || tier < 3) return { ok: false, reason: 'bond' };
    var offN = (ws.sect.disciples || []).filter(function (d) { return d.offering; }).length;
    if (offN >= (SC.OFFER_CAP || 2)) return { ok: false, reason: 'offcap' };
    if ((ws.sect.disciples || []).length >= discCap(ws, D)) return { ok: false, reason: 'cap' };
    if (byDiscOffer(ws, npcId)) return { ok: false, reason: 'dup' };
    if (tier < 4 && Math.random() >= (SC.OFFER_P3 || 0.5)) {
      if (log) log('sys', SQ.t('sect.disc.offer.refuse', { name: SQ.t('bond.' + npcId + '.name', null, pack.worldId) }, pack.worldId));
      return { ok: false, reason: 'refuse' };
    }
    ws.sect.seq = (ws.sect.seq || 0) + 1;
    ws.sect.disciples.push({
      id: 'd' + ws.sect.seq, nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0,
      perk: 'combatPower', tianjiao: false, offering: npcId
    });
    if (log) log('sys', SQ.t('sect.disc.offer.ok', { name: SQ.t('bond.' + npcId + '.name', null, pack.worldId) }, pack.worldId));
    return { ok: true };
  }
  function byDiscOffer(ws, npcId) {
    var hit = false;
    (((ws.sect || {}).disciples) || []).forEach(function (d) { if (d.offering === npcId) hit = true; });
    return hit;
  }
  /* ── 携才投效入门（N6 收口批 · 天骄卷 §6.2 事件「收」支的唯一落库口 · 自立门户卷 §7.1 消费口径）──
   * `ws.sect` 唯一写口纪律：本函数是 sect.js 侧入口，掷点与文案全在 prodigy.js，两侧不互写。
   *   · 名额上限校验先行（生成端 prodigy.js 已在掷点**前**查 cap，此处再挡一次直调路径）
   *   · `tier: 'fine'` = 良才档起底（APT_MULT.fine 1.2）+ `tianjiao: true` ⇒ 战力口 :150 与
   *     推进口 :390 两处 ×`TIANJIAO_MULT` 1.2，**叠乘顶格 1.44**（此前两路恒不触发 = 死乘区）
   *   · 起始 `realm: 0`：与 recruit/供奉两条既有生成路同款（否决案 = 取天骄现境界 `pr.rlm`，
   *     那会让一名真仙天骄瞬间把宗门战力顶穿、并与该 NPC 榜面战力双记）
   *   · 幂等：同一天骄在册（`d.pr === pid`）→ `dup`，不入第二条
   *   · 占弟子上限、**不占供奉名额**（`offering` 轴另计）；零灵石流、不进 Ledger */
  function acceptProdigy(ws, pack, D, pid, now, log) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    if (typeof pid !== 'string' || !/^pr\d+$/.test(pid)) return { ok: false, reason: 'unknown' };
    if ((ws.sect.disciples || []).length >= discCap(ws, D)) return { ok: false, reason: 'cap' };
    var dup = false;
    ((ws.sect.disciples || [])).forEach(function (d) { if (d.pr === pid) dup = true; });
    if (dup) return { ok: false, reason: 'dup' };
    var pr = (SQ.Prodigy && SQ.Prodigy.byId) ? SQ.Prodigy.byId(ws, pid) : null;
    if (!pr) return { ok: false, reason: 'unknown' };
    ws.sect.seq = (ws.sect.seq || 0) + 1;
    var rec = {
      id: 'd' + ws.sect.seq, nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0,
      perk: 'combatPower', tianjiao: true, pr: pid
    };
    ws.sect.disciples.push(rec);
    if (log) log('sys', SQ.t('sect.disc.join', {
      name: discName(ws, rec, pack), sect: ws.sect.name || ''
    }, pack.worldId));
    return { ok: true, disc: rec };
  }
  function setInvest(ws, D, discId, inv) {
    var d = byDiscId(ws, discId);
    if (!d || d.offering) return { ok: false, reason: 'none' };
    d.inv = Math.max(0, Math.min(2, Math.floor(num(inv, 0))));
    return { ok: true };
  }

  /* ── 月度惰性结算（claim 内一次补齐经过月数，无 per-tick 掷判）：
   * 培养推进（PROG_NEED 暂用表升境余数结转，境界上限 = 宗主 −1）+ 供奉月缴（in.tribute）── */
  function tick(ws, pack, D, mods, dtMs, now, ctx) {
    if (!ws.sect || ws.sect.succession || !(dtMs > 0)) return null;
    var SC = S(D);
    ws.sect.monthClock = (ws.sect.monthClock || 0) + dtMs;
    var months = Math.floor(ws.sect.monthClock / 30000);
    if (!months) return null;
    ws.sect.monthClock %= 30000;
    if (months > 240) months = 240;                           /* catch-up 护栏（离线 12h 上限内天然 ≤1440） */
    var log = ctx && ctx.log;
    var tributeTotal = 0;
    /* ── 材料供奉速率（N1 第二环 · 炼丹卷 §2.6 量表 = 唯一事实源；两路来源 `sect.tribute` 弟子供奉
       * 与 `sect.tributefac` 丹房产出）──**速率制不用掷判**：#221 红线「本模块月结零随机」为
       * sim-pacing 稳态带不被宗门侧污染而定。每月累加期望、满 1 缴 1、余数结转（同 PROG_NEED 升境
       * 余数结转语义），料种按已入账件数轮转取本区组池，同样零掷判。入账走 `Alchemy.addMats`
       * 唯一写口 ⇒ 堆叠 999 溢出折灵石与 #207 材料恒等式自动沿用，灵石账九路与 Ledger 分类零改动。 */
    var TB = (D.ALCHEMY || {}).TRIBUTE;
    var matRate = 0;
    if (TB && SQ.Alchemy && SQ.Alchemy.addMats) {
      var dmTB = TB.DISC_MONTHS || [12, 8, 7];
      (ws.sect.disciples || []).forEach(function (d2) {
        matRate += 1 / (d2.offering ? (TB.OFFERING_MONTHS || 8) : (dmTB[d2.inv] || 12));
      });
      matRate += ((ws.sect.fac || {}).danfang || 0) / (TB.FAC_MONTHS || 30);
    }
    var realmCap = Math.max(0, Math.min(9, (ws.realm || 0) - (SC.DISC_REALM_GAP != null ? SC.DISC_REALM_GAP : 1)));
    for (var mi = 0; mi < months; mi++) {
      (ws.sect.disciples || []).forEach(function (d) {
        var zStones = ((D.ZONES || [])[Math.min(d.offering ? ws.realm : d.realm, (D.ZONES || []).length - 1)] || {}).stones || 3;
        if (d.offering) {
          /* 供奉月缴 ×2（不培养不推进——自带境界） */
          tributeTotal += Math.max(1, Math.floor(zStones * (SC.TRIBUTE_K || 0.03))) * (SC.TRIBUTE_OFFERING_MULT || 2);
          return;
        }
        /* 培养投资：档 1/2 扣灵石记 out.donate（付不起 → 当月按档 0 推进，不负债） */
        var k = (SC.INVEST_COST_K || [0, 0.5, 1.5])[d.inv] || 0;
        var effInv = d.inv;
        if (k > 0) {
          var cost = Math.max(1, Math.floor(zStones * k));
          if (ws.stones >= cost) {
            ws.stones -= cost;
            SQ.Ledger.note(ws, 'out', 'donate', cost);
          } else {
            effInv = 0;
          }
        }
        var progMult = (SC.INVEST_PROG || [1, 1.5, 2.5])[effInv] || 1;
        d.prog += ((SC.APT_MULT || {})[d.tier] || 1) * progMult * (d.tianjiao ? (SC.TIANJIAO_MULT || 1.2) : 1);
        var need = (SC.PROG_NEED || [])[d.realm];           /* PROG_NEED[目标境界−1] 语义：升下一境所需 */
        while (need != null && d.realm < realmCap && d.prog >= need) {
          d.prog -= need;
          d.realm += 1;
          need = (SC.PROG_NEED || [])[d.realm];
        }
        if (d.realm >= realmCap) d.prog = Math.min(d.prog, (SC.PROG_NEED || [])[d.realm] != null ? (SC.PROG_NEED)[d.realm] : d.prog);
        tributeTotal += Math.max(1, Math.floor(zStones * (SC.TRIBUTE_K || 0.03)));
      });
    }
    if (matRate > 0) {
      ws.sect.matAcc = (typeof ws.sect.matAcc === 'number' && isFinite(ws.sect.matAcc) ? ws.sect.matAcc : 0) + matRate * months;
      var payN = Math.floor(ws.sect.matAcc);
      if (payN > 0) {
        var poolMT = SQ.Alchemy.zoneMats(D, Math.min(ws.zone || 0, (D.ZONES || []).length - 1));
        if (poolMT.length) {
          ws.sect.matAcc -= payN;
          var gainsMT = {}, rot0 = Math.floor(SQ.Ledger.matSums(ws).inn || 0);
          for (var qi = 0; qi < payN; qi++) {
            var idMT = poolMT[(rot0 + qi) % poolMT.length];
            gainsMT[idMT] = (gainsMT[idMT] || 0) + (TB.N_PER_HIT || 1);
          }
          var addR = SQ.Alchemy.addMats(ws, pack, D, gainsMT, now, log);
          var gotMT = 0;
          for (var ak in addR.added) gotMT += addR.added[ak];
          if (gotMT > 0 && log) log('sys', SQ.t('sect.tribute.mats', { n: gotMT }, pack.worldId));
        }
        /* 本区组无料可缴（池空）时期望不退账，留待换区后照缴 */
      }
    }
    if (tributeTotal > 0) {
      var s0 = ws.stones;
      ws.stones += tributeTotal;
      SQ.Ledger.note(ws, 'in', 'tribute', ws.stones - s0);   /* Ledger 唯一新增分类 in.tribute */
      ws.sect.lastTribMonth = now;
      if (log) log('sys', SQ.t('sect.tribute.log', {
        n: SQ.fmt(ws.stones - s0), cur: SQ.t('resource.currency', null, pack.worldId)
      }, pack.worldId));
    }
    return tributeTotal > 0 ? { tribute: tributeTotal } : null;
  }

  /* ── 设施营建（caveFac 构型：等级 +1 ≤5，营建费记 out.cave，常驻生效）── */
  function buildFac(ws, pack, D, facId, now, log) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    if ((SC.FAC_IDS || []).indexOf(facId) < 0) return { ok: false, reason: 'unknown' };
    var lv = ws.sect.fac[facId] || 0;
    if (lv >= (SC.FAC_MAX || 5)) return { ok: false, reason: 'max' };
    var cost = (SC.FAC_COST || [])[lv] || 0;
    if (ws.stones < cost) return { ok: false, reason: 'poor', cost: cost };
    ws.stones -= cost;
    SQ.Ledger.note(ws, 'out', 'cave', cost);
    ws.sect.fac[facId] = lv + 1;
    if (log) log('sys', SQ.t('sect.fac.build', { name: SQ.t('sect.fac.' + facId + '.name', null, pack.worldId), lv: lv + 1 }, pack.worldId));
    return { ok: true, lv: lv + 1, cost: cost };
  }

  /* ── 调遣弟子（§6.1：2h buff / CD 24h / 来源 'sect'；供奉 = 复制个体助力 ×1.5）── */
  function dispatch(ws, pack, D, discId, now, log) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    var cfg = SC.DISPATCH || {};
    if (now - (ws.sect.dispatchAt || 0) < (cfg.cd || 86400000)) {
      return { ok: false, reason: 'cd', until: (ws.sect.dispatchAt || 0) + (cfg.cd || 86400000) };
    }
    var d = byDiscId(ws, discId);
    if (!d) return { ok: false, reason: 'unknown' };
    var field, v;
    if (d.offering) {
      var c = SQ.Bonds ? SQ.Bonds.byId(pack, d.offering) : null;
      var pk = (c && c.perk) || {};
      if (!(pk.field && pk.perTier)) return { ok: false, reason: 'chan' };   /* channel 型不可调遣 */
      field = pk.field;
      v = pk.perTier * SQ.Bonds.tierOf(ws, d.offering, D) * (cfg.offeringMult || 1.5);
    } else {
      field = d.perk;
      v = (cfg.apt || {})[d.tier] || 0.05;
    }
    SQ.Events.pushBuff(ws, field, v, now + Math.round((cfg.hours || 2) * 3600000), cfg.source || 'sect');
    ws.sect.dispatchAt = now;
    if (log) log('sys', SQ.t('sect.disc.dispatch', {
      name: discName(ws, d, pack), field: SQ.t('talent.field.' + field, null, pack.worldId),
      v: '+' + (Math.round(v * 1000) / 10) + '%'
    }, pack.worldId));
    return { ok: true, field: field, value: v };
  }

  /* ── 战争（§5.4/§5.5：防守 = 战功制抽取池第 17 位自动接入；主动宣战 = 下战书）── */
  function discipleMerit(ws, pack, D) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return 0;
    var p4 = (D.REALMS[4] || {}).power || 1600;
    var sum = 0;
    (ws.sect.disciples || []).forEach(function (d) {
      sum += Math.floor(discPower(ws, pack, D, d) / p4) * (SC.WAR_DISC_K || 2);
    });
    return sum;
  }
  function declareWar(ws, pack, D, targetFid, now, log) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    if (ws.factionWar) return { ok: false, reason: 'busy' };
    if (now - (ws.sect.declareAt || 0) < (SC.WAR_DECLARE_CD_MS || 86400000)) {
      return { ok: false, reason: 'cd', until: (ws.sect.declareAt || 0) + (SC.WAR_DECLARE_CD_MS || 86400000) };
    }
    var target = SQ.Factions.byId(ws, targetFid);
    if (!target || targetFid === 'sect') return { ok: false, reason: 'unknown' };
    var sectEntry = SQ.Factions.byId(ws, 'sect');
    if (!sectEntry || (sectEntry.rel || {})[targetFid] !== 'enemy') return { ok: false, reason: 'notenemy' };
    var cfg = D.FACTION_WAR || {};
    ws.factionWar = {
      aId: 'sect', bId: targetFid, bornAt: now,
      until: now + (cfg.DURATION_MS || 1200000), joined: null, joinedFid: null, merit: 0, result: null
    };
    ws.sect.declareAt = now;
    ws.sect.warAgg = { bId: targetFid, until: ws.factionWar.until };
    if (log) log('sys', SQ.t('sect.war.declare', { a: sectEntry.name, b: target.name }, pack.worldId));
    if (SQ.Rumors && SQ.Rumors.pushWar) SQ.Rumors.pushWar(ws, pack, D, now, { log: log });
    if (SQ.Tiandao && SQ.Tiandao.onWar) SQ.Tiandao.onWar(ws, pack, D, now);
    return { ok: true };
  }
  function onWarSettled(ws, pack, D, win, war, now, ctx) {
    var SC = S(D);
    if (!ws.sect || ws.sect.succession) return;
    var log = ctx && ctx.log;
    if (win) {
      ws.sect.warRecord.wins = (ws.sect.warRecord.wins || 0) + 1;
      /* 主动宣战胜利：目标声望压制 −10%（只影响排行展示口径；NPC 势力不删除——灭门 ⏸） */
      var agg = ws.sect.warAgg;
      if (agg && war && agg.until === war.until) {
        ws.sect.suppressed[agg.bId] = Math.max(0.5, (ws.sect.suppressed[agg.bId] != null ? ws.sect.suppressed[agg.bId] : 1) * (1 - (SC.WAR_REP_SUPPRESS || 0.10)));
      }
      if (SQ.Tiandao && SQ.Tiandao.chronPush) SQ.Tiandao.chronPush(ws, 'sectwin', { name: ws.sect.name }, now);
      if (log) log('sys', SQ.t('sect.war.win', { name: ws.sect.name }, pack.worldId));
    } else {
      ws.sect.warRecord.loses = (ws.sect.warRecord.loses || 0) + 1;
      if (log) log('sys', SQ.t('sect.war.lose', { name: ws.sect.name }, pack.worldId));
    }
    ws.sect.warAgg = null;
  }

  /* ── 传位（§8.1：真仙 + ≥1 弟子；宗门转 NPC 位、称号跨世、当世不可再开宗）── */
  function succeed(ws, pack, D, meta, heirId, now, log) {
    if (!ws.sect || ws.sect.succession) return { ok: false, reason: 'none' };
    if ((ws.realm || 0) < (D.REALMS.length - 1)) return { ok: false, reason: 'realm' };
    var heir = byDiscId(ws, heirId);
    if (!heir || heir.offering) return { ok: false, reason: 'heir' };   /* 供奉不可继位——客卿不接山门 */
    var rep = sectRep(ws, D);
    var heirName = discName(ws, heir, pack);
    var sectName = ws.sect.name;
    /* 宗门转 NPC 位：factions 条目与 rel 原样保留（名称/山门/宗规沿用），弟子名录清空 */
    ws.sect = {
      name: sectName, gate: ws.sect.gate, align: ws.sect.align,
      disciples: [], fac: {}, everDefected: ws.sect.everDefected,
      dispatchAt: 0, lastTribMonth: 0, monthClock: 0,
      warRecord: { wins: 0, loses: 0 }, suppressed: {},
      recruitAt: 0, foundAt: ws.sect.foundAt, candidate: null, warAgg: null, seq: 0,
      succession: { done: true, heir: heirName, rep: rep, at: now }
    };
    ws.factionId = null;                                     /* 传位下山，再入红尘（可 join 其他势力） */
    if (SQ.Codex && SQ.Codex.addTitle && meta) SQ.Codex.addTitle(meta, 'title_kaizong');
    if (SQ.Tiandao && SQ.Tiandao.chronPush) SQ.Tiandao.chronPush(ws, 'sectsucc', { name: sectName, heir: heirName }, now);
    if (SQ.Rumors && SQ.Rumors.pushProdigy) SQ.Rumors.pushProdigy(ws, pack, D, now, 'sect.succ.rumor', { name: sectName, heir: heirName });
    if (log) log('sys', SQ.t('sect.succ.log', { name: sectName, heir: heirName }, pack.worldId));
    return { ok: true, rep: rep };
  }

  SQ.Sect = {
    /* N20 接线批 2026-10-10：命名公式的单一事实源。正典「掷名可重掷 · 免费无限次」（自立门户卷 §2.2）需要一个 UI 入口，而式子原先只写在 sectFound 内部 ⇒ 视图若自己抄一遍 pre/suf 表名与取模就是第二个事实源，故把「掷下标」与「按下标取名」各抽一口，sectFound 与本批新增的掷名钮同读这两个函数。表规模 12×8 沿用原字面量。 */
    rollIdx: function () { return [Math.floor(Math.random() * 12), Math.floor(Math.random() * 8)]; },
    nameOfIdx: function (ix, wid) {
      return SQ.t('sect.name.pre.' + (ix[0] % 12 + 1), null, wid) + SQ.t('sect.name.suf.' + (ix[1] % 8 + 1), null, wid);
    },
    normalize: normalize,
    discCap: discCap,
    byDiscId: byDiscId,
    discName: discName,
    artAllowOf: artAllowOf,
    eligibleArtsN: eligibleArtsN,
    zangjingSlots: zangjingSlots,
    discPower: discPower,
    sectPower: sectPower,
    sectRep: sectRep,
    npcRepOf: npcRepOf,
    canFound: canFound,
    foundSect: foundSect,
    recruit: recruit,
    acceptCandidate: acceptCandidate,
    rejectCandidate: rejectCandidate,
    inviteOffering: inviteOffering,
    joinOpen: joinOpen,
    acceptProdigy: acceptProdigy,
    setInvest: setInvest,
    tick: tick,
    buildFac: buildFac,
    dispatch: dispatch,
    discipleMerit: discipleMerit,
    declareWar: declareWar,
    onWarSettled: onWarSettled,
    succeed: succeed
  };
})();
