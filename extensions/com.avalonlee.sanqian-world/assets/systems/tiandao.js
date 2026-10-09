/* systems/tiandao.js — 天道系统（协议层 · 天道设计 v1.1 唯一事实源）
 * 三形态共享契约：V1 人工中继（奏疏复制 → 圣旨粘贴）/ V1.5 本地模拟（localDecree，同契约同校验器）
 *   / V2 ⏸ 平台 LLM（传输层单函数替换点，不实施）。
 * 纪律：
 *  - 引擎零裸中文——旨意中文名/判词模板/谶语/天象短评全走 tiandao.* 词表（数据文件禁文案）；
 *  - ws.tiandao 唯一写口 = 本模块；normalize 补默认、脏档逐项清理零崩溃；
 *  - 不进 tick 模拟——接旨/天象全部是显式用户动作或事件钩子产物；
 *  - 渡劫修正全走 §8.3 talent 加项（tribModOf 由 XTrib.info 同读点消费，先加总后 clamp）；
 *  - Ledger 零新增分类：赐财 in.event / 香火 out.donate（恒等式 #113 不动）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var TD_SEED = 1;
  function nextId(now) {
    return 'td-' + (now || Date.now()).toString(36) + '-' + (TD_SEED++).toString(36) +
      Math.floor(Math.random() * 1296).toString(36);
  }
  var num = SQ.util.num, randInt = SQ.util.randInt, pick = SQ.util.pick;   /* C1：统一至 assets/util.js */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function cfg(D) { return (D && D.TIANDAO) || {}; }
  function tdOf(ws) {
    if (!ws.tiandao || typeof ws.tiandao !== 'object') ws.tiandao = SQ.Tiandao.blank();
    return ws.tiandao;
  }
  function decreeById(D, id) {
    var list = cfg(D).DECREES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  /* 旨意/档位/卦位中文名 → 稳定 id（词表反查，白名单成员与映射关系以正典中文名为准） */
  function typeIdOf(name, pack, D) {
    if (typeof name !== 'string' || !name) return null;
    var list = cfg(D).DECREES || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === name) return list[i].id;
      if (SQ.t('tiandao.type.' + list[i].id, null, pack.worldId) === name) return list[i].id;
    }
    return null;
  }
  function tierIdOf(name, pack, D) {
    var tiers = cfg(D).TIERS || ['omen', 'decree', 'rare'];
    for (var i = 0; i < tiers.length; i++) {
      if (tiers[i] === name) return tiers[i];
      if (SQ.t('tiandao.tier.' + tiers[i], null, pack.worldId) === name) return tiers[i];
    }
    return null;
  }
  function hexIdOf(name, pack, D) {
    if (typeof name !== 'string' || !name) return null;
    var hexes = cfg(D).HEXAGRAMS || [];
    for (var i = 0; i < hexes.length; i++) {
      if (hexes[i] === name) return hexes[i];
      if (SQ.t('tiandao.hex.' + hexes[i], null, pack.worldId) === name) return hexes[i];
    }
    return null;
  }

  /* 敏感词过滤（§2.3 本地兜底）：词表存 JSON 字符串数组（内容数据，非界面文案） */
  function sensitiveList(pack) {
    var raw = SQ.t('tiandao.filter', null, pack.worldId);
    if (raw === 'tiandao.filter') return [];
    try { var a = JSON.parse(raw); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function sensitiveHit(text, pack) {
    if (typeof text !== 'string' || !text) return false;
    var list = sensitiveList(pack);
    for (var i = 0; i < list.length; i++) if (list[i] && text.indexOf(list[i]) >= 0) return true;
    return false;
  }

  /* ── 存档 ──────────────────────────────────────────────── */
  function blank() {
    return {
      lastAskAt: 0, defy: 0, seenIds: [], omenQueue: [], history: [],
      title: false, shield: false,
      omenSeen: [], chenSeen: 0,             /* 本局去重位掩码（天道卷 v1.4 §7.3）：omenSeen 对齐 OMEN_NODES 序 */
      nijieWins: 0, nijieFails: 0,            /* 逆天大劫成败计数（成就 achv_nitian/fanpan + 转世计分供数） */
      nextTrib: 0,                        /* 天心护佑/劫云密布：仅下次渡劫（talent 加项通道） */
      armed: { lai: false, nu: false },   /* 天睐/天怒档位态（渡劫结算后清空，defy 值保留） */
      ask: null,                          /* 本次问天预掷 {hex, incense, tier, free}（本地模拟同权重消费） */
      chron: [],                          /* 编年史环形 ≤10：{k, v, at}（奏疏渲染时解析文案） */
      stats: { accept: 0, defy: 0 }       /* 累计统计子结构（领/抗旨计数，§3.3 实施注记） */
    };
  }

  function normalize(raw, D) {
    var d = blank();
    if (!raw || typeof raw !== 'object') return d;
    var C = cfg(D);
    var out = {
      lastAskAt: Math.max(0, num(raw.lastAskAt, 0)),
      defy: Math.max(0, Math.floor(num(raw.defy, 0))),
      seenIds: [], omenQueue: [], history: [],
      title: raw.title === true, shield: raw.shield === true,
      nijieWins: Math.max(0, Math.floor(num(raw.nijieWins, 0))),
      nijieFails: Math.max(0, Math.floor(num(raw.nijieFails, 0))),
      nextTrib: 0, armed: { lai: false, nu: false }, ask: null, chron: [],
      stats: { accept: 0, defy: 0 },
      omenSeen: [], chenSeen: 0
    };
    /* v1.4 本局去重掩码还原：逐节点 floor + clamp 到 [0, 2^N)（N = OMEN_TPL_N[node]），
     * 长度不足补 0、超长截断；chenSeen clamp 到 [0, 2^CHENYU_N)。脏档零崩溃、旧档全默认。 */
    var tplN = C.OMEN_TPL_N || {};
    (C.OMEN_NODES || []).forEach(function (nd, di) {
      var nBits = Math.max(1, Math.floor(num(tplN[nd], 3)));
      var rawMsk = Array.isArray(raw.omenSeen) ? num(raw.omenSeen[di], 0) : 0;
      rawMsk = Math.max(0, Math.floor(rawMsk));
      var lim = Math.pow(2, nBits);
      out.omenSeen.push(rawMsk >= lim ? lim - 1 : rawMsk);
    });
    var chenBits = Math.max(1, Math.floor(num(C.CHENYU_N, 30)));
    var rawChen = Math.max(0, Math.floor(num(raw.chenSeen, 0)));
    var chenLim = Math.pow(2, chenBits);
    out.chenSeen = rawChen >= chenLim ? chenLim - 1 : rawChen;
    var seenCap = C.SEEN_CAP || 200;
    if (Array.isArray(raw.seenIds)) {
      var seenSet = {};
      for (var i = 0; i < raw.seenIds.length && out.seenIds.length < seenCap; i++) {
        var sv = raw.seenIds[i];
        if (typeof sv === 'string' && sv && !seenSet[sv]) { seenSet[sv] = 1; out.seenIds.push(sv); }
      }
    }
    var cap = C.OMEN_QUEUE_CAP || 3;
    var nodes = C.OMEN_NODES || [];
    (Array.isArray(raw.omenQueue) ? raw.omenQueue : []).forEach(function (o) {
      if (!o || typeof o !== 'object' || out.omenQueue.length >= cap) return;
      if (typeof o.node !== 'string' || nodes.indexOf(o.node) < 0) return;
      if (typeof o.text !== 'string' || !o.text) return;
      out.omenQueue.push({ node: o.node, text: o.text.slice(0, 200), seen: o.seen === true, at: Math.max(0, num(o.at, 0)) });
    });
    var hmax = C.HISTORY_MAX || 10;
    (Array.isArray(raw.history) ? raw.history : []).forEach(function (h) {
      if (!h || typeof h !== 'object' || out.history.length >= hmax) return;
      if (!decreeById(D, h.type)) return;
      if (h.act !== 'accept' && h.act !== 'defy') return;
      out.history.push({ id: typeof h.id === 'string' ? h.id : '', type: h.type,
        tier: tierIdRaw(h.tier, C), act: h.act, at: Math.max(0, num(h.at, 0)) });
    });
    function tierIdRaw(v, CC) { return (CC.TIERS || []).indexOf(v) >= 0 ? v : 'omen'; }
    var nt = num(raw.nextTrib, 0);
    var tr = C.TRIB_MOD_RANGE || [0.01, 0.03];
    out.nextTrib = clamp(nt, -tr[1] * 4, tr[1] * 4);
    var ar = (raw.armed && typeof raw.armed === 'object') ? raw.armed : {};
    out.armed = { lai: ar.lai === true, nu: ar.nu === true };
    var ak = (raw.ask && typeof raw.ask === 'object') ? raw.ask : null;
    if (ak && (C.HEXAGRAMS || []).indexOf(ak.hex) >= 0 && (C.TIERS || []).indexOf(ak.tier) >= 0) {
      out.ask = { hex: ak.hex, incense: Math.max(0, num(ak.incense, 0)), tier: ak.tier,
        free: (typeof ak.free === 'string' ? ak.free : '').slice(0, 60) };
    }
    var cmax = C.CHRONICLE_MAX || 10;
    (Array.isArray(raw.chron) ? raw.chron : []).forEach(function (c) {
      if (!c || typeof c !== 'object' || typeof c.k !== 'string' || out.chron.length >= cmax) return;
      out.chron.push({ k: c.k.slice(0, 20), v: (c.v && typeof c.v === 'object') ? c.v : {}, at: Math.max(0, num(c.at, 0)) });
    });
    var st = (raw.stats && typeof raw.stats === 'object') ? raw.stats : {};
    out.stats = { accept: Math.max(0, Math.floor(num(st.accept, 0))), defy: Math.max(0, Math.floor(num(st.defy, 0))) };
    return out;
  }

  /* ── 问天（§五）───────────────────────────────────────── */
  function weightsOf(D, incenseIdx) {
    var C = cfg(D);
    var w = (C.TIER_W || [70, 25, 5]).slice();
    var shift = (C.RARE_SHIFT || [0, 2, 3, 5])[incenseIdx] || 0;
    return [w[0] - shift, w[1], w[2] + shift];
  }
  function rollTier(D, incenseIdx) {
    var w = weightsOf(D, incenseIdx);
    var total = w[0] + w[1] + w[2];
    var r = Math.random() * total;
    if ((r -= w[0]) < 0) return 'omen';
    if ((r -= w[1]) < 0) return 'decree';
    return 'rare';
  }

  function canAsk(ws, D, now, incenseIdx) {
    var C = cfg(D);
    var td = ws.tiandao || blank();
    var cd = C.ASK_CD_MS || 3600000;
    if (td.lastAskAt > 0 && now - td.lastAskAt < cd) {
      return { ok: false, reason: 'cooldown', until: td.lastAskAt + cd };
    }
    var cost = (C.INCENSE_RANKS || [0])[incenseIdx] || 0;
    if (ws.stones < cost) return { ok: false, reason: 'stones', cost: cost };
    return { ok: true, cost: cost };
  }

  /* 问天 = 焚表瞬间落账：扣香火（out.donate）+ lastAskAt + 档位预掷写入 ask（本地模拟同权重消费）。
   * 冷却内拒绝：奏疏不生成、香火不扣（#186）。AI 无回应/解析降级不返还冷却。 */
  function ask(ws, pack, D, profile, hexId, incenseIdx, freeText, now, meta) {
    var C = cfg(D);
    if ((C.HEXAGRAMS || []).indexOf(hexId) < 0) return { ok: false, reason: 'hex' };
    incenseIdx = clamp(Math.floor(num(incenseIdx, 0)), 0, (C.INCENSE_RANKS || [0]).length - 1);
    var chk = canAsk(ws, D, now, incenseIdx);
    if (!chk.ok) return chk;
    var td = tdOf(ws);
    if (chk.cost > 0) {
      var before = ws.stones;
      ws.stones -= chk.cost;
      SQ.Ledger.note(ws, 'out', 'donate', before - ws.stones);
    }
    var tier = rollTier(D, incenseIdx);
    td.lastAskAt = now;
    td.ask = { hex: hexId, incense: chk.cost, tier: tier,
      free: hexId === 'blank' ? String(freeText || '').slice(0, 60) : '' };
    var text = buildMemo(ws, pack, D, profile, now, meta);
    if (pack.worldId) {
      SQ.Log.push(ws, 'sys', SQ.t('tiandao.log.ask', {
        n: SQ.fmt(chk.cost), cur: SQ.t('resource.currency', null, pack.worldId)
      }, pack.worldId));
    }
    return { ok: true, text: text, tier: tier, cost: chk.cost };
  }

  /* ── 奏疏生成（§三）：状态摘要八项 + 编年史 10 事 + 四项统计 + 香火栏，总长 500~800 字 ── */
  function tribGrade(ws, pack, D, mods) {
    var ti = (pack.worldSystems && pack.worldSystems.tribInfo) ? pack.worldSystems.tribInfo(ws, pack, D, mods) : null;
    if (!ti) return 'none';
    if (ti.p >= 0.8) return 'shun';
    if (ti.p >= 0.55) return 'chang';
    if (ti.p >= 0.35) return 'xian';
    return 'jue';
  }

  /* ── 宗规三倾向 → 天道态度（自立门户卷 §2.3 表 · 空窗期条款「只在文本层兑现」）────────
   * 裁定依据（2026-10-07 取证 · 三处文档对读）：
   *   · 自立门户卷 §2.3 明文「OMEN_NODES 白名单本卷不单方面扩」「宗规褒贬评挂点 = 跨卷观察项」，
   *     并给出空窗期口径 = 编年史措辞 / 传闻卡文案 / 弟子对话词表 **按 align 分组取模板（零机制效果）**；
   *   · 天道卷 §九.3 红线「天象仍是纯文本零机制产物、不进 tick」+ §2.4「毒舌人格只影响文本层
   *     （判词 verdict / 谶语 omen / 天象短评）」；自立门户卷 §十.1 宗门红线「零渡劫加项」。
   *   ⇒ 任何数值型「态度」（旨意档位权重 / 逆天值 / 渡劫加项）都同时撞两卷红线，故本批只做判词措辞分组。
   * 分组规则（卷面未列正向组/负向组成员——本批择最小不越权口径）：
   *   正道 right → 褒评组（键 .right 后缀）；魔道 evil → 差评组（.evil）；
   *   左道 neutral / 未开宗 / 脏值 → **基准键原样**（中性，零后缀、零新增语义）；
   *   否决方案：① 把既有 tiandao.verdict.<id>.1~3 的三个变体重新解释成正/中/负组——卷面与正文
   *     均无此梯度（实测三变体同调性），属对既有文案的臆造改判，弃；
   *   ② 扩 OMEN_NODES 增宗门节点——自立门户卷 §十.4 №2 明禁单方面扩其白名单，弃。
   * 天象短评侧采「追加同调性判语」而非改模板号：既有本局去重掩码（§7.3）与 OMEN_TPL_N 对表（#252）零漂移。 */
  function sectAlignOf(ws) {
    var a = ((ws || {}).sect || {}).align;
    return (a === 'right' || a === 'evil') ? a : 'neutral';
  }
  /* 编年史宗门三条措辞分组表（键名逐字在册，A6 消费侧宽口径可见） */
  var SECT_CHRON = {
    sectfound: { right: 'sect.chronicle.found.right', neutral: 'sect.chronicle.found', evil: 'sect.chronicle.found.evil' },
    sectwin: { right: 'sect.chronicle.win.right', neutral: 'sect.chronicle.win', evil: 'sect.chronicle.win.evil' },
    sectsucc: { right: 'sect.chronicle.succ.right', neutral: 'sect.chronicle.succ', evil: 'sect.chronicle.succ.evil' }
  };
  function sectChronKey(k, align) {
    var g = SECT_CHRON[k];
    return g ? (g[align] || g.neutral) : null;
  }
  /* 天象短评的宗门按语（正道褒评 / 魔道差评 / 左道空串 = 中性不追加）。
   * 传位后（succession.done）宗主已下山，不再以宗主身份受天象评价 → 空串。 */
  function sectSkyNote(ws, pack, D) {
    var sc = (ws || {}).sect;
    if (!sc || sc.succession) return '';
    var k = sectAlignOf(ws);
    if (k === 'neutral') return '';
    var key = 'tiandao.sectomen.' + k;
    var txt = SQ.t(key, { name: sc.name || '' }, pack.worldId);
    return (typeof txt === 'string' && txt && txt !== key) ? ' ' + txt : '';
  }

  function chronText(ws, pack, D, c) {
    var wid = pack.worldId;
    var v = c.v || {};
    switch (c.k) {
      case 'break': return SQ.t('tiandao.chron.break', { realm: SQ.t('realm.' + (v.realm || 0), null, wid) }, wid);
      case 'tribfail': return SQ.t('tiandao.chron.tribfail', { n: v.streak || 1 }, wid);
      case 'clear': return SQ.t('tiandao.chron.clear', { zone: SQ.t('combat.zone.' + (v.z || 0), null, wid) }, wid);
      case 'bond': return SQ.t('tiandao.chron.bond.' + (v.act === 'lock' ? 'lock' : (v.act === 'redeem' ? 'redeem' : 'marry')),
        { name: SQ.t('bond.' + (v.npc || '') + '.name', null, wid) }, wid);
      case 'defect': return SQ.t('tiandao.chron.defect', { name: v.name || '' }, wid);
      case 'decree': return SQ.t('tiandao.chron.decree', {
        type: SQ.t('tiandao.type.' + (v.type || 'prophecy'), null, wid),
        act: SQ.t(v.act === 'defy' ? 'tiandao.chron.act.defy' : 'tiandao.chron.act.accept', null, wid)
      }, wid);
      /* 天骄卷 §4.2 编年史数据源扩展（五类新事件）+ 飞升叩门失败（轮回卷 §1.2） */
      case 'ascendfail': return SQ.t('tiandao.chron.ascendfail', null, wid);
      case 'prodrank': return SQ.t('prodigy.chronicle.rank.' + (v.dir === 'up' ? 'up' : 'down'), { n: v.rank || 0 }, wid);
      case 'prodspar': return SQ.t('prodigy.chronicle.spar.' + (v.r === 'win' ? 'win' : (v.r === 'lose' ? 'lose' : 'draw')), { name: v.name || '' }, wid);
      case 'prodfeud': return SQ.t('prodigy.chronicle.feud', { name: v.name || '' }, wid);
      case 'prodfeudend': return SQ.t('prodigy.chronicle.feudend', { name: v.name || '' }, wid);
      case 'prodkill': return SQ.t('prodigy.chronicle.kill', { name: v.name || '' }, wid);
      /* 宗门三类大事（自立门户卷 §7.2 奏疏兼容：立派/传位/宗门战胜）· 措辞按宗规 align 分组（§2.3） */
      case 'sectfound': return SQ.t(sectChronKey('sectfound', sectAlignOf(ws)), { name: v.name || '' }, wid);
      case 'sectwin': return SQ.t(sectChronKey('sectwin', sectAlignOf(ws)), { name: v.name || '' }, wid);
      case 'sectsucc': return SQ.t(sectChronKey('sectsucc', sectAlignOf(ws)), { name: v.name || '', heir: v.heir || '' }, wid);
      default: return '';
    }
  }

  function buildMemo(ws, pack, D, profile, now, meta) {
    var C = cfg(D);
    var wid = pack.worldId;
    var td = ws.tiandao || blank();
    var mods = SQ.Mods.collect(profile || { talents: [] }, ws, pack, D);
    var sections = [];
    sections.push({ pri: 10, text: SQ.t('tiandao.prompt.main', null, wid) });
    for (var ex = 1; ex <= 5; ex++) sections.push({ pri: 2, text: SQ.t('tiandao.prompt.ex.' + ex, null, wid) });
    /* 状态摘要八项（§3.2） */
    var need = SQ.Realm.needEffOf(ws, pack, D, mods);
    var cap = SQ.Idle.capOf(ws, pack, D, mods);
    var progPct = need ? Math.min(100, Math.round((ws.qi / need) * 100)) : 100;
    sections.push({ pri: 7, text: SQ.t('tiandao.memo.realm', { realm: SQ.t('realm.' + ws.realm, null, wid), p: progPct }, wid) });
    sections.push({ pri: 6, text: SQ.t('tiandao.memo.stones', { n: SQ.fmt(ws.stones) }, wid) });
    var tierK = pack.worldSystems.tierOf(ws);
    sections.push({ pri: 7, text: SQ.t('tiandao.memo.karma', { n: Math.round(ws.karma || 0), tier: SQ.t('karma.tier.' + tierK, null, wid) }, wid) });
    sections.push({ pri: 6, text: SQ.t('tiandao.memo.align', { a: SQ.t('align.' + tierK, null, wid) }, wid) });
    var affixLine = ws.zoneAffix
      ? SQ.t('affix.' + ws.zoneAffix.affixId + '.name', null, wid)
      : SQ.t('tiandao.memo.noaffix', null, wid);
    sections.push({ pri: 4, text: SQ.t('tiandao.memo.zone', { zone: SQ.t('combat.zone.' + ws.zone, null, wid), affix: affixLine }, wid) });
    var grade = tribGrade(ws, pack, D, mods);
    sections.push({ pri: 7, text: grade === 'none'
      ? SQ.t('tiandao.memo.trib.none', null, wid)
      : SQ.t('tiandao.memo.trib', { g: SQ.t('tiandao.memo.trib.' + grade, null, wid) }, wid) });
    var facName = null;
    if (ws.factionId && SQ.Factions && SQ.Factions.nameOf) facName = SQ.Factions.nameOf(ws, ws.factionId);
    sections.push({ pri: 4, text: facName
      ? SQ.t('tiandao.memo.faction', { name: facName, rank: SQ.t('faction.rank.' + SQ.Factions.rankOf(ws, D), null, wid) }, wid)
      : SQ.t('tiandao.memo.faction.none', null, wid) });
    var bondLine;
    if (ws.spouse) {
      bondLine = SQ.t('tiandao.memo.bonds.spouse', {
        name: SQ.t('bond.' + ws.spouse.npcId + '.name', null, wid),
        form: SQ.t('bond.spouse.form.' + ws.spouse.form, null, wid)
      }, wid);
    } else {
      var g = SQ.Bonds ? SQ.Bonds.guardianOf(ws, pack, D) : null;
      bondLine = g
        ? SQ.t('tiandao.memo.bonds.guard', { name: SQ.t('bond.' + g.npcId + '.name', null, wid) }, wid)
        : SQ.t('tiandao.memo.bonds.none', null, wid);
    }
    sections.push({ pri: 5, text: bondLine });
    /* 编年史（§3.3）：最近 10 条大事 + 四项累计统计 */
    sections.push({ pri: 10, text: SQ.t('tiandao.memo.chronhead', null, wid) });
    var chron = (td.chron || []).slice(-(C.CHRONICLE_MAX || 10));
    chron.forEach(function (c, ci) {
      var txt = chronText(ws, pack, D, c);
      if (txt) sections.push({ pri: 10, chron: true, text: txt, ord: ci });
    });
    var tri = ws.tribulation || {};
    var loses = Math.max(0, (tri.attempts || 0) - (tri.success || 0));
    sections.push({ pri: 10, text: SQ.t('tiandao.memo.stats', {
      win: tri.success || 0, lose: loses,
      accept: (td.stats || {}).accept || 0, defy: (td.stats || {}).defy || 0,
      clears: (ws.cleared || []).length
    }, wid) });
    /* 跨世摘要行（天道卷 v1.1 修正项 · 六向长线批 A8）：第几世/历史最高境界/飞升次数/累计渡劫——
     * 判词可引用前世（few-shot 示范句式随提示词模板），MEMO_LEN 区间不变、超长按既有优先级压缩 */
    if (meta && meta.stats && (meta.stats.lives || 0) > 0) {
      sections.push({ pri: 10, text: SQ.t('tiandao.memo.pastlife', {
        life: (meta.stats.lives || 0) + 1,
        realm: SQ.t('realm.' + Math.min(meta.stats.realmMax || 0, (D.REALMS || []).length - 1), null, wid),
        asc: meta.stats.ascensions || 0, trib: meta.stats.tribWin || 0
      }, wid) });
    }
    /* 前世传记引行（图鉴卷 §人生传记「供天道奏疏跨世摘要引用」这条边的落点）：取最近一篇跨世传记的
     * 世数 / 道号 / 首句节选；无传记则整行不出。节选上限 40 字为本批定的实现口径（MEMO_LEN 500~800
     * 总长控制下的退让位），行序 pri 10 ⇒ 压缩时按既有优先级让位，不破契约必需行 pri 9。 */
    var bioPrev = (((meta || {}).biographies) || []).slice(-1)[0] || null;
    if (bioPrev && bioPrev.text) {
      sections.push({ pri: 10, text: SQ.t('tiandao.memo.bio', {
        life: bioPrev.life || 0, name: bioPrev.name || '',
        gist: String(bioPrev.text).split('\n')[0].slice(0, 40)
      }, wid) });
    }
    /* 香火栏（§3.4）+ 卦位作用域（生成端约束：type 只能从本卦位清单选，§5.3）——
     * 契约必需行 pri 9（压缩时最后才动，范本 few-shot pri 2 先压缩） */
    var askNow = td.ask || {};
    var hexId = askNow.hex || 'blank';
    var scope = (C.DECREES || []).filter(function (dd) { return dd.hex === hexId; })
      .map(function (dd) { return SQ.t('tiandao.type.' + dd.id, null, wid); })
      .join(SQ.t('tiandao.listsep', null, wid)) || SQ.t('tiandao.type.prophecy', null, wid);
    sections.push({ pri: 9, text: SQ.t('tiandao.memo.hex', { hex: SQ.t('tiandao.hex.' + hexId, null, wid), scope: scope }, wid) });
    sections.push({ pri: 9, text: SQ.t('tiandao.memo.incense', {
      n: SQ.fmt(askNow.incense || 0), tier: SQ.t('tiandao.tier.' + (askNow.tier || 'omen'), null, wid)
    }, wid) });
    if (askNow.hex === 'blank' && askNow.free) {
      sections.push({ pri: 9, text: SQ.t('tiandao.memo.free', { q: askNow.free }, wid) });
    }
    /* 长度控制（MEMO_LEN=[500,800]）：超长逐级压缩——① 范本 few-shot（pri 2）→ ② 状态摘要
     * （pri 4~7）→ ③ 编年史旧条目（chron 标记，从最旧删）→ ④ 硬截。
     * 契约必需行（prompt.main / 卦位作用域 / 香火档位 / 统计，pri ≥9）永不丢弃——
     * 正典优先级「编年史 > 状态摘要 > 香火栏」的落地口径：香火栏已是单行最小形态，
     * 压缩量由范本与状态摘要承担，编年史裁剪旧条目为最后手段（收口记录登记）。 */
    var maxLen = (C.MEMO_LEN || [500, 800])[1];
    function joinAll(list) { return list.map(function (s) { return s.text; }).join('\n'); }
    var kept = sections.slice();
    var text = joinAll(kept);
    while (text.length > maxLen) {
      var dropIdx = -1, dropPri = 999;
      for (var ki = 0; ki < kept.length; ki++) {
        if (!kept[ki].chron && kept[ki].pri < dropPri) { dropPri = kept[ki].pri; dropIdx = ki; }
      }
      if (dropIdx >= 0 && dropPri < 9) {
        kept.splice(dropIdx, 1);
      } else {
        /* 低优先级项已删尽：从最旧编年史条目删起 */
        var chronIdx = -1;
        for (var cj = 0; cj < kept.length; cj++) {
          if (kept[cj].chron) { chronIdx = cj; break; }
        }
        if (chronIdx < 0) break;
        kept.splice(chronIdx, 1);
      }
      text = joinAll(kept);
    }
    if (text.length > maxLen) text = text.slice(0, maxLen);
    return text;
  }

  /* ── 圣旨解析（§4.3 三层容错）+ 校验器（§4.4）────────────── */
  function fallbackDecree(pack, D, now) {
    var wid = pack && pack.worldId;
    return {
      decreeId: nextId(now), hexagram: 'blank', tier: 'omen', type: 'prophecy', payload: {},
      verdict: SQ.t('tiandao.fallback.verdict', null, wid),
      omen: chenYuOf(null, pack, D),   /* fallbackDecree 签名无 ws（导出 API 不改）→ 降级旁路裸掷 */
      degraded: true
    };
  }

  /* ② 提取第一个可解析的完整 {...} 块（brace 配对，字符串态感知） */
  function extractJson(s) {
    var start = s.indexOf('{');
    while (start >= 0) {
      var depth = 0, inStr = false, esc = false;
      for (var i = start; i < s.length; i++) {
        var ch = s.charAt(i);
        if (inStr) {
          if (esc) esc = false;
          else if (ch === '\\') esc = true;
          else if (ch === '"') inStr = false;
          continue;
        }
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try {
              var obj = JSON.parse(s.slice(start, i + 1));
              if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
            } catch (e) { /* 该块不可解析：从下一个 { 继续 */ }
            break;
          }
        }
      }
      start = s.indexOf('{', start + 1);
    }
    return null;
  }

  function parseReply(raw, ws, pack, D, now) {
    var dec = null;
    try {
      if (typeof raw === 'string' && raw) {
        /* ① 剥壳：markdown 围栏与常见前后缀杂讯（提取器本身对杂讯免疫，围栏先去掉防干扰） */
        var s = raw.replace(/```[a-zA-Z]*\n?/g, ' ').replace(/```/g, ' ');
        /* ② 提取 */
        dec = extractJson(s);
      }
    } catch (e) { dec = null; }
    /* ③ 降级：天机紊乱谶语档——绝不崩、不抛异常 */
    if (!dec) return fallbackDecree(pack, D, now);
    return sanitize(dec, ws, pack, D, now);
  }

  /* 校验器：白名单整旨拒绝 / payload clamp / 卦位非法降纯文本档 / 判词敏感词与超长降级。
   * 返回标准化圣旨对象（type/tier 已映射稳定 id；宽进严数值）。 */
  function sanitize(dec, ws, pack, D, now) {
    var C = cfg(D);
    var out = {
      decreeId: (typeof dec.decreeId === 'string' && dec.decreeId) ? dec.decreeId.slice(0, 64) : nextId(now),
      hexagram: hexIdOf(dec.hexagram, pack, D),
      tier: tierIdOf(dec.tier, pack, D) || 'omen',
      type: typeIdOf(dec.type, pack, D),
      payload: (dec.payload && typeof dec.payload === 'object') ? dec.payload : {},
      verdict: (typeof dec.verdict === 'string') ? dec.verdict : '',
      omen: (typeof dec.omen === 'string') ? dec.omen : ''
    };
    var wid = pack.worldId;
    function degrade() {   /* 降级谶语档：保留 verdict/omen 文本（仍过敏感词），机制归零 */
      out.type = 'prophecy';
      out.payload = {};
    }
    /* type 不在白名单 → 整旨拒绝降级谶语（#181） */
    if (!out.type) { degrade(); return out; }
    /* 卦位非法 → 按烧空表语义降纯文本档（§4.1） */
    if (!out.hexagram) { degrade(); return out; }
    /* 判词敏感词越线 → 降级通用谶语（§2.3） */
    if (sensitiveHit(out.verdict, pack) || sensitiveHit(out.omen, pack)) {
      degrade();
      out.verdict = SQ.t('tiandao.fallback.verdict', null, wid);
      out.omen = chenYuOf(ws, pack, D);
      return out;
    }
    /* 判词超长 → 截断进谶语档（§2.3 软上限） */
    if (out.verdict.length > (C.VERDICT_MAX || 300)) {
      out.verdict = out.verdict.slice(0, C.VERDICT_MAX || 300);
      degrade();
      return out;
    }
    /* payload clamp（越界夹回、不整旨拒绝；#184） */
    var def = decreeById(D, out.type);
    var p = {};
    var cl = (def && def.clamp) || {};
    if (cl.tribBonus) p.tribBonus = Math.round(clamp(num(out.payload.tribBonus, cl.tribBonus[0]), cl.tribBonus[0], cl.tribBonus[1]) * 1000) / 1000;
    if (cl.mult) p.mult = Math.round(clamp(num(out.payload.mult, cl.mult[1]), cl.mult[0], cl.mult[1]) * 1000) / 1000;
    if (cl.hours) p.hours = Math.round(clamp(num(out.payload.hours, cl.hours[1]), cl.hours[0], cl.hours[1]));
    if (cl.karma) p.karma = Math.round(clamp(num(out.payload.karma, 0), cl.karma[0], cl.karma[1]));
    if (cl.bond) p.bond = Math.round(clamp(num(out.payload.bond, cl.bond[0]), cl.bond[0], cl.bond[1]));
    if (def && def.cap === 'weekly2') p.stones = Math.max(0, Math.round(Math.min(num(out.payload.stones, 0), giftCapOf(ws, D))));
    if (out.type === 'bond') {
      p.target = null;
      if (typeof out.payload.target === 'string' && SQ.Bonds && SQ.Bonds.byId(pack, out.payload.target)) p.target = out.payload.target;
    }
    if (out.type === 'fate') p.eventId = (typeof out.payload.eventId === 'string' && out.payload.eventId) ? out.payload.eventId.slice(0, 64) : null;
    if (out.type === 'affix') {
      var ids = (D.ZONE_AFFIXES || []).map(function (a) { return a.id; });
      p.affixId = ids.indexOf(out.payload.affixId) >= 0 ? out.payload.affixId : null;  /* null = 引擎白名单内随机 */
    }
    out.payload = p;
    return out;
  }

  function giftCapOf(ws, D) {
    var C = cfg(D);
    var z = (D.ZONES || [])[Math.min(ws.realm || 0, (D.ZONES || []).length - 1)] || {};
    return Math.round((z.stones || 0) * (C.GIFT_WEEK_K || 10080));
  }

  function seen(ws, dec) {
    var td = ws.tiandao || blank();
    return (td.seenIds || []).indexOf(dec.decreeId) >= 0;
  }

  function recordSeen(ws, D, dec, act, now) {
    var td = tdOf(ws);
    if (td.seenIds.indexOf(dec.decreeId) < 0) {
      td.seenIds.push(dec.decreeId);
      if (td.seenIds.length > (cfg(D).SEEN_CAP || 200)) td.seenIds = td.seenIds.slice(-(cfg(D).SEEN_CAP || 200));
    }
    td.history.push({ id: dec.decreeId, type: dec.type, tier: dec.tier, act: act, at: now });
    while (td.history.length > (cfg(D).HISTORY_MAX || 10)) td.history.shift();
    chronPush(ws, 'decree', { type: dec.type, act: act }, now);
  }

  /* ── 领旨（§4.2 通道逐一接线）─────────────────────────── */
  function accept(ws, pack, D, mods, dec, now, ctx) {
    var C = cfg(D);
    var td = tdOf(ws);
    var wid = pack.worldId;
    if (!dec || !decreeById(D, dec.type)) return { ok: false, reason: 'invalid' };
    if (seen(ws, dec)) return { ok: false, reason: 'seen' };
    if (dec.type === 'fate' && ws.pendingChoice) return { ok: false, reason: 'busy' };
    var log = ctx && ctx.log;
    var typeName = SQ.t('tiandao.type.' + dec.type, null, wid);
    var out = { ok: true, type: dec.type, gains: {} };
    switch (dec.type) {
      case 'omen_trib': case 'omen_wealth': case 'omen_bond':
      case 'omen_affix': case 'omen_faction': case 'prophecy':
        break;                                   /* 纯信息/纯文本：零数值 */
      case 'bless': case 'curse':
        td.nextTrib = (td.nextTrib || 0) + (dec.payload.tribBonus || 0);
        break;
      case 'gift': {
        var g = Math.max(0, Math.min(Math.round(dec.payload.stones || 0), giftCapOf(ws, D)));
        if (g > 0) {
          var before = ws.stones;
          ws.stones += g;
          SQ.Ledger.note(ws, 'in', 'event', ws.stones - before);   /* 赐财 in.event（#113 零新增分类） */
          out.gains.stones = g;
        }
        break;
      }
      case 'punish':
        SQ.Events.pushBuff(ws, 'qiRate', dec.payload.mult || -0.10,
          now + Math.round((dec.payload.hours || 24) * 3600000), 'tiandao');
        out.gains.punish = { mult: dec.payload.mult, hours: dec.payload.hours };
        break;
      case 'karma':
        ws.karmaEventScore = (ws.karmaEventScore || 0) + (dec.payload.karma || 0);
        out.gains.karma = dec.payload.karma || 0;
        break;
      case 'bond': {
        var npc = dec.payload.target;
        if (!npc) {
          /* 情缘牵引兜底池排除天骄槽（`pr{n}`）——裁定 2026-10-07（天骄卷 §六/§十一.6）：
           * 显式 target 走 `Bonds.byId`（只认道友名录，`:471`），而本兜底池直读 `ws.bonds` 键，
           * 是全代码唯一能把天骄好感推进「情缘牵引」的路径；不排除则天道旨意可把天骄好感推过
           * 达档阈值（30/70/100）触发天骄卷未预算的专属事件。判据取 `ws.prodigies` 在册 id 精确
           * 匹配而非 `pr` 前缀，避免误杀同前缀道友。 */
          var prIds = {};
          ((ws.prodigies || []).forEach(function (p) { if (p && p.id) prIds[p.id] = 1; }));
          var known = [];
          for (var bk in (ws.bonds || {})) if ((ws.bonds[bk] || 0) >= 1 && !SQ.Bonds.scarred(ws, bk) &&
            (ws.bonds[bk] !== -99) && !prIds[bk]) known.push(bk);
          npc = known.length ? pick(known) : pick((D.COMPANIONS || []).map(function (c) { return c.id; }));
        }
        if (npc) {
          var gr = SQ.Bonds.gain(ws, pack, D, npc, dec.payload.bond || 2, now);   /* 只走正向口 */
          out.gains.bond = { npc: npc, n: gr.after - gr.before, blocked: gr.blocked };
        }
        break;
      }
      case 'fate': {
        /* 敕赐奇遇：复用天道垂青触发面（fireTagged 独立通道 + fateSeen 同境界段排除；池空静默流产） */
        var fired = SQ.Events.fireTagged(ws, pack, D, 'trib_success', ws.realm, now, ctx,
          dec.payload.eventId ? { forceId: dec.payload.eventId } : null);
        out.gains.fate = fired ? fired.id : null;
        break;
      }
      case 'affix': {
        /* 天象改易：覆盖当前区词缀 1 次（只在 ZONE_AFFIXES 白名单内换） */
        var ids = (D.ZONE_AFFIXES || []).map(function (a) { return a.id; });
        var aid = dec.payload.affixId || pick(ids);
        if (aid) {
          ws.zoneAffix = { affixId: aid, until: now + (D.AFFIX_MS || 21600000) };
          out.gains.affix = aid;
        }
        break;
      }
      case 'rumor':
        if (SQ.Rumors && SQ.Rumors.pushSky) {
          SQ.Rumors.pushSky(ws, D, now, (dec.omen || dec.verdict || '').slice(0, 120));
        }
        break;
    }
    recordSeen(ws, D, dec, 'accept', now);
    td.stats.accept++;
    if (log) log('sys', SQ.t('tiandao.log.accept', { type: typeName }, wid));
    return out;
  }

  /* ── 抗旨（§6.2 逆天值）───────────────────────────────── */
  function defyDecree(ws, pack, D, dec, now, ctx) {
    var C = cfg(D);
    var td = tdOf(ws);
    if (!dec || !decreeById(D, dec.type)) return { ok: false, reason: 'invalid' };
    if (seen(ws, dec)) return { ok: false, reason: 'seen' };
    var stages = C.DEFY_STAGES || [30, 60, 100];
    var gain = (C.DEFY_GAIN || {})[dec.tier] != null ? C.DEFY_GAIN[dec.tier] : 10;
    /* 魔道 ×1.5 向下取整（#188） */
    if (pack.worldSystems && pack.worldSystems.tierOf && pack.worldSystems.tierOf(ws) === 'evil') {
      gain = Math.floor(gain * (C.DEFY_DEMON_MULT || 1.5));
    }
    var oldDefy = td.defy;
    td.defy = oldDefy + gain;                   /* 只涨不跌（唯一回落 = 逆天大劫失败清零） */
    /* 跨档 → 档位态武装（天睐/天怒；渡劫结算后清空档位态、defy 保留） */
    if (oldDefy < stages[0] && td.defy >= stages[0]) td.armed.lai = true;
    if (oldDefy < stages[1] && td.defy >= stages[1]) td.armed.nu = true;
    recordSeen(ws, D, dec, 'defy', now);
    td.stats.defy++;
    if (ctx && ctx.log) ctx.log('sys', SQ.t('tiandao.log.defy', {
      n: gain, total: td.defy
    }, pack.worldId));
    return { ok: true, gain: gain, defy: td.defy, unlocked: td.defy >= stages[2] };
  }

  /* ── 本地模拟天道（V1.5 · §1.2/§十一）：同契约生成器，输出走同一校验器 ── */
  function localDecree(ws, pack, D, now) {
    var C = cfg(D);
    var td = ws.tiandao || blank();
    var askNow = td.ask;
    var hex = (askNow && askNow.hex) || 'blank';
    var tier = (askNow && askNow.tier) || 'omen';
    if (hex === 'blank') {
      /* 烧空表：明示降级——「天机不可尽泄」通用判词，零机制效果（#195） */
      return sanitize({
        decreeId: nextId(now), hexagram: 'blank', tier: 'omen',
        type: SQ.t('tiandao.type.prophecy', null, pack.worldId),
        payload: {},
        verdict: SQ.t('tiandao.blank.' + randInt(1, 5), null, pack.worldId),
        omen: chenYuOf(ws, pack, D)
      }, ws, pack, D, now);
    }
    var cands = (C.DECREES || []).filter(function (d) { return d.hex === hex; });
    var inTier = cands.filter(function (d) { return d.tier === tier; });
    var chosen = pick(inTier.length ? inTier : cands);
    if (!chosen) return fallbackDecree(pack, D, now);
    var payload = {};
    var cl = chosen.clamp || {};
    if (cl.tribBonus) payload.tribBonus = Math.round((cl.tribBonus[0] + Math.random() * (cl.tribBonus[1] - cl.tribBonus[0])) * 1000) / 1000;
    if (cl.mult) payload.mult = Math.round((cl.mult[0] + Math.random() * (cl.mult[1] - cl.mult[0])) * 100) / 100;
    if (cl.hours) payload.hours = randInt(12, cl.hours[1]);
    if (cl.karma) payload.karma = (Math.random() < 0.5 ? -1 : 1) * randInt(3, 10);
    if (cl.bond) payload.bond = randInt(cl.bond[0], cl.bond[1]);
    if (chosen.cap === 'weekly2') payload.stones = Math.round(giftCapOf(ws, D) * (0.3 + Math.random() * 0.7));
    if (chosen.id === 'affix') payload.affixId = pick((D.ZONE_AFFIXES || []).map(function (a) { return a.id; }));
    return sanitize({
      decreeId: nextId(now),
      hexagram: hex,
      tier: SQ.t('tiandao.tier.' + chosen.tier, null, pack.worldId),
      type: SQ.t('tiandao.type.' + chosen.id, null, pack.worldId),
      payload: payload,
      verdict: SQ.t('tiandao.verdict.' + chosen.id + '.' + randInt(1, 3), null, pack.worldId),
      omen: chenYuOf(ws, pack, D)
    }, ws, pack, D, now);
  }

  /* ── 逆天值读点与逆天大劫（§六）───────────────────────── */
  /* 渡劫 talent 加项（XTrib.info 同读点消费）：nextTrib（护佑/劫云）+ 天睐/天怒档位 */
  function tribModOf(ws, D) {
    var td = ws.tiandao;
    if (!td) return 0;
    var mods = (cfg(D).DEFY_TRIB_MODS) || [-0.01, -0.02];
    var v = num(td.nextTrib, 0);
    if (td.armed && td.armed.lai) v += mods[0];
    if (td.armed && td.armed.nu) v += mods[1];
    return v;
  }
  /* 档位状态（UI 消费）：'nijie' 已解锁 / 'nu' 天怒 / 'lai' 天睐 / null */
  function stageOf(ws, D) {
    var td = ws.tiandao;
    if (!td) return null;
    var st = cfg(D).DEFY_STAGES || [30, 60, 100];
    if (td.defy >= st[2]) return 'nijie';
    if (td.armed && td.armed.nu) return 'nu';
    if (td.armed && td.armed.lai) return 'lai';
    return null;
  }
  /* 渡劫结算窗口（realm.js 钩子）：清档位态与 nextTrib（defy 值保留，#189）+ 天象入队 + 编年史 */
  function onTribSettled(ws, pack, D, success, now, ctx) {
    var td = tdOf(ws);
    td.nextTrib = 0;
    td.armed.lai = false;
    td.armed.nu = false;
    if (success) {
      /* 渡劫成功与破境同一结算瞬间——钩子只挂一处、不双入队（叙事覆盖：随机评「渡劫」或「破境」） */
      pushOmen(ws, pack, D, Math.random() < 0.5 ? 'tribwin' : 'break',
        { realm: ws.realm }, now);
      chronPush(ws, 'break', { realm: ws.realm }, now);
    } else {
      pushOmen(ws, pack, D, 'tribfail', { streak: (ws.tribulation || {}).streak || 1 }, now);
      chronPush(ws, 'tribfail', { streak: (ws.tribulation || {}).streak || 1 }, now);
    }
  }

  function nijieInfo(ws, pack, D, mods) {
    return pack.worldSystems.tribInfo(ws, pack, D, mods, { base: cfg(D).NIJIE_BASE_P });
  }
  /* 逆天大劫（§6.4）：独立劫——不推进境界、失败不扣修为不计 streak/attempts；
   * 常规全部加成项依然有效（与破境渡劫同一 info 构型）、clamp 不变；
   * 一次性修正（next/officeGuard/nextTrib/档位态）与常规渡劫同窗口消费（「下次渡劫」语义）。 */
  function tryNijie(ws, pack, D, mods, now, ctx) {
    var C = cfg(D);
    var td = tdOf(ws);
    var stages = C.DEFY_STAGES || [30, 60, 100];
    if (td.defy < stages[2]) return { ok: false, reason: 'lock' };
    var info = nijieInfo(ws, pack, D, mods);
    if (!info) return { ok: false, reason: 'info' };
    var success = Math.random() < info.p;
    /* 一次性修正用后即清（与 realm.tryBreakthrough 同点位语义） */
    ws.tribulation.next = 0;
    ws.tribulation.officeGuard = false;
    td.nextTrib = 0;
    td.armed.lai = false;
    td.armed.nu = false;
    /* 器灵钩子同点位（逆天大劫亦是渡劫结算窗口）：温养 +15 / 判词 / 护魂标记判后清除 */
    if (SQ.Fusion) {
      SQ.Fusion.onTribWarm(ws, pack, D, now, ctx && ctx.log);
      SQ.Fusion.verdictLine(ws, pack, D, 'trib', now, ctx && ctx.log);
      SQ.Fusion.onTribSettled(ws, pack);
    }
    var log = ctx && ctx.log;
    if (success) {
      td.title = true;                          /* 称号「我命由我不由天」 */
      td.shield = true;                         /* 逆天盾：retain 下次渡劫失败一次 */
      td.nijieWins = (td.nijieWins || 0) + 1;   /* 图鉴成就/转世计分供数（achv_nitian/fanpan） */
      if (log) log('trib', SQ.t('tiandao.log.nijie.win', null, pack.worldId));
    } else {
      td.defy = 0;                              /* 清零重新积累 */
      td.nijieFails = (td.nijieFails || 0) + 1;
      var np = C.NIJIE_PUNISH || { mult: -0.20, hours: 48 };
      SQ.Events.pushBuff(ws, 'qiRate', np.mult, now + Math.round(np.hours * 3600000), 'tiandaoNijie');
      if (log) log('trib', SQ.t('tiandao.log.nijie.lose', { h: np.hours }, pack.worldId));
    }
    return { ok: true, success: success, p: info.p };
  }

  /* ── 本局去重取用口（天道卷 v1.4 §7.3）────────────────────
   * 位掩码记账：bit k 置位 ⇔ 模板 k+1 本局已用过。池耗尽 → 重置该容器掩码开启第二轮
   * （不报错、不入日志、对玩家不可见）。只影响「取哪一条模板」，零机制数值侵入。 */
  function maskPick(mask, n, rand) {
    if (!(n >= 1)) return 1;
    var free = [];
    for (var k = 1; k <= n; k++) if (!((mask >> (k - 1)) & 1)) free.push(k);
    if (!free.length) { mask = 0; for (var j = 1; j <= n; j++) free.push(j); }
    var pick = free[Math.floor(rand() * free.length) % free.length];
    return { tpl: pick, mask: mask | (1 << (pick - 1)) };
  }
  /* 天象短评模板号：写回 td.omenSeen[i]（i = node 在 OMEN_NODES 中的序）*/
  function pickOmenTpl(td, C, node, rand) {
    var nodes = C.OMEN_NODES || [];
    var i = nodes.indexOf(node);
    var n = Math.max(1, Math.floor(((C.OMEN_TPL_N || {})[node]) || 3));
    if (i < 0) return randInt(1, n);
    if (!Array.isArray(td.omenSeen) || td.omenSeen.length !== nodes.length) {
      td.omenSeen = []; for (var z = 0; z < nodes.length; z++) td.omenSeen.push(0);
    }
    var r = maskPick(td.omenSeen[i] | 0, n, rand);
    td.omenSeen[i] = r.mask;
    return r.tpl;
  }
  /* 谶语模板号：写回 td.chenSeen（30 位 < 2^53，安全整数内）*/
  function pickChenYu(td, C, rand) {
    var n = Math.max(1, Math.floor(num(C.CHENYU_N, 30)));
    var r = maskPick(td.chenSeen | 0, n, rand);
    td.chenSeen = r.mask;
    return r.tpl;
  }
  /* 谶语取用统一口：4 处调用点（圣旨生成 / 敏感词降级 / 兜底旨 / 本地模拟）共用，
   * 保证同一世内谶语不重复（此前 randInt(1,10) 裸掷无记忆）。 */
  function chenYuOf(ws, pack, D) {
    /* ws 缺省 = 无存档上下文的降级旁路（fallbackDecree 签名不含 ws、且为导出 API 不可改）：
     * 回落裸掷不去重——该路径本身是「解析全败」的兜底，一局至多命中个位数次。 */
    var td = (ws && typeof ws === 'object') ? tdOf(ws) : null;
    var n = Math.max(1, Math.floor(num(cfg(D).CHENYU_N, 30)));
    var tpl = td ? pickChenYu(td, cfg(D), Math.random) : randInt(1, n);
    return SQ.t('tiandao.omen.' + tpl, null, pack.worldId);
  }

  /* ── 天象队列（§七）与编年史 ────────────────────────────
   * 节点白名单守卫（§7.1 · OMEN_NODES 八节点，N4 收口批追加 prodrank）——宗门节点是否入列
   * 仍归天道卷下次升版裁定（自立门户卷 §十.4 №2 跨卷观察项）；本函数只在既有节点产物上
   * **追加**宗规判语（纯文本层）。vars 两槽（N4 新增，供 prodrank 用）：`rank` 裸数字入正文、
   * `dir`（'up'|'down'）经词表 `tiandao.dir.{dir}` 取词——源码禁裸写 CJK（纪律 A1），
   * 故方向词必须走词表而不是由 prodigy.js 传中文。 */
  function pushOmen(ws, pack, D, node, vars, now) {
    var C = cfg(D);
    if ((C.OMEN_NODES || []).indexOf(node) < 0) return null;
    var td = tdOf(ws);
    var tpl = pickOmenTpl(td, C, node, Math.random);   /* v1.4：本局去重（原 randInt(1,3) 裸掷）*/
    var v = vars || {};
    var tv = {};
    if (v.realm != null) tv.realm = SQ.t('realm.' + v.realm, null, pack.worldId);
    if (v.streak != null) tv.n = v.streak;
    if (v.z != null) tv.zone = SQ.t('combat.zone.' + v.z, null, pack.worldId);
    if (v.tier != null) tv.tier = SQ.t('align.' + v.tier, null, pack.worldId);
    if (v.a != null) tv.a = v.a;
    if (v.b != null) tv.b = v.b;
    if (v.rank != null) tv.rank = v.rank;
    if (v.dir != null) tv.dir = SQ.t('tiandao.dir.' + v.dir, null, pack.worldId);
    var text = SQ.t('tiandao.skyomen.' + node + '.' + tpl, tv, pack.worldId) + sectSkyNote(ws, pack, D);
    td.omenQueue.push({ node: node, text: text.slice(0, 200), seen: false, at: now });
    while (td.omenQueue.length > (C.OMEN_QUEUE_CAP || 3)) td.omenQueue.shift();  /* 溢出挤最旧 */
    /* 器灵判词 · 天象触发点（融合器灵卷 §7.3）：与天象队列同事件源、不同展示面（法宝私评），
     * 双评不算重复、不双入天象队列 */
    if (SQ.Fusion && SQ.Fusion.verdictLine) SQ.Fusion.verdictLine(ws, pack, D, 'omen', now, null);
    return text;
  }
  function unseenOmens(ws) {
    var td = ws.tiandao;
    if (!td) return 0;
    return (td.omenQueue || []).filter(function (o) { return !o.seen; }).length;
  }
  function markOmensSeen(ws) {
    var td = tdOf(ws);
    (td.omenQueue || []).forEach(function (o) { o.seen = true; });
  }
  function chronPush(ws, k, v, now) {
    var td = tdOf(ws);
    td.chron.push({ k: k, v: v || {}, at: now || Date.now() });
    while (td.chron.length > 10) td.chron.shift();
  }

  /* ── 事件钩子（既有结算点位挂产物，不自建 per-tick 掷判）── */
  function onZoneClear(ws, pack, D, z, now) {
    pushOmen(ws, pack, D, 'clear', { z: z }, now);
    chronPush(ws, 'clear', { z: z }, now);
  }
  function onWar(ws, pack, D, now) {
    var war = ws.factionWar;
    if (!war) return;
    var a = SQ.Factions && SQ.Factions.nameOf ? SQ.Factions.nameOf(ws, war.aId) : '';
    var b = SQ.Factions && SQ.Factions.nameOf ? SQ.Factions.nameOf(ws, war.bId) : '';
    pushOmen(ws, pack, D, 'war', { a: a, b: b }, now);
  }
  function onKarmaCross(ws, pack, D, from, to, now) {
    pushOmen(ws, pack, D, 'karma', { tier: to }, now);
  }
  function onDefect(ws, pack, D, name, now) {
    chronPush(ws, 'defect', { name: name || '' }, now);
  }
  function onBond(ws, act, npcId, now) {
    chronPush(ws, 'bond', { act: act, npc: npcId }, now);
  }

  /* 敏感词过滤出口（图鉴卷 §5.3 作传采纳共用同一过滤库） */
  function filterText(text, pack) {
    return { hit: sensitiveHit(text, pack), text: text };
  }

  SQ.Tiandao = {
    blank: blank,
    normalize: normalize,
    cfg: cfg,
    filterText: filterText,
    weightsOf: weightsOf,
    canAsk: canAsk,
    ask: ask,
    buildMemo: buildMemo,
    chronText: chronText,
    parseReply: parseReply,
    sanitize: sanitize,
    extractJson: extractJson,
    fallbackDecree: fallbackDecree,
    giftCapOf: giftCapOf,
    seen: seen,
    accept: accept,
    defyDecree: defyDecree,
    localDecree: localDecree,
    tribModOf: tribModOf,
    stageOf: stageOf,
    onTribSettled: onTribSettled,
    nijieInfo: nijieInfo,
    tryNijie: tryNijie,
    pushOmen: pushOmen,
    sectAlignOf: sectAlignOf,
    sectSkyNote: sectSkyNote,
    sectChronKey: sectChronKey,
    unseenOmens: unseenOmens,
    pickOmenTpl: pickOmenTpl,
    pickChenYu: pickChenYu,
    chenYuOf: chenYuOf,
    markOmensSeen: markOmensSeen,
    chronPush: chronPush,
    onZoneClear: onZoneClear,
    onWar: onWar,
    onKarmaCross: onKarmaCross,
    onDefect: onDefect,
    onBond: onBond,
    typeIdOf: typeIdOf
  };
})();
