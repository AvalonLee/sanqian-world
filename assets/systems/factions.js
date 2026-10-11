/* systems/factions.js — G16 势力（势力批 v2.4 + 势力深化批 v1.23）：
 * 世界生成（固定池全量入档 + 随机补足 + 关系正典种子）/ 加入叛离 / 职级贡献 /
 * 势力委托 / 势力冲突 / 门中供给。
 * 规则源：势力批需求 §2/§3/§6/§7 + 势力深化批正典《势力全录（16处）》§一~§六 + data.js FACTIONS* 常量表。
 * 契约：本系统只读世界包数据（companions / FACTIONS* 常量 / 名录与描述走词表），
 *       生成与养成结果全部落在 ws（factions / factionNpcs / factionId / factionCdUntil /
 *       factionRep / factionDonate / factionQuest / factionQuestCd / factionWar / factionSupply），
 *       旧档 normalize 缺失时补生成/补默认。
 * 纪律：增益走 Mods 乘区（来源 'faction'，perk 原值 ≤10%、职级放大后 ≤13.5%，§8.2 v1.23）；
 *       好感调整走 clamp（下限 BOND_MIN=−20 厌恶），绝交锁（−99）与心结锁（scars）不受加入影响；
 *       道侣（spouse）好感不因势力调整；一切灵石变更走 SQ.Ledger.note（恒等式 #113）；
 *       写入只发生在 actions.mutate / claim 事务通道内。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var ALIGNS = ['right', 'neutral', 'evil'];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* 名称生成（走查 v2.5 §2 扩充纪律）：**前字与全名均一次一用**——
   * 同一世界内不出现「散人馆 / 散人行会」这类共享前字的近似名；组合空间 128/阵营，随机补足段必够。 */
  function makeNamer() {
    var usedName = {}, usedA = {};
    return function (align) {
      var pool = (SQ.NAMES.xiuxian && SQ.NAMES.xiuxian.factions && SQ.NAMES.xiuxian.factions[align]) ||
        { a: SQ.NAMES.common.given, b: SQ.NAMES.common.surname };   /* 兜底也走词表白名单数据 */
      for (var i = 0; i < 40; i++) {
        var a = pick(pool.a), nm = a + pick(pool.b);
        if (!usedA[a] && !usedName[nm]) { usedA[a] = 1; usedName[nm] = 1; return nm; }
      }
      var fb = pick(pool.a) + pick(pool.b) + '·' + Math.floor(Math.random() * 90 + 10);
      usedName[fb] = 1;
      return fb;
    };
  }

  function stonesOf(D, ws) {
    var zi = Math.min(Math.max(0, ws.realm || 0), D.ZONES.length - 1);
    return (D.ZONES[zi] || {}).stones || 1;
  }

  SQ.Factions = {
    ALIGNS: ALIGNS,

    /* 世界生成（入世时 / 旧档 normalize 缺失时调用一次）：
     * 固定池 FACTIONS_FIXED 全量入档（正典 id/名称/描述，势力全录卷 §一）+ 随机池补足
     * RAND_EXTRA 0~4 个 + 关系正典种子播种（§二）+ 其余两两关系随机对称 + 道友归属。 */
    generate: function (ws, pack, D) {
      if (ws.factions && ws.factions.length) return ws.factions;
      var cfg = D.FACTIONS || {};
      var wid = pack.worldId;
      var nameOf = makeNamer();
      var list = [];
      /* ① 固定池全量入档（不走随机名池与 30 条描述池； perk 仍按阵营池随机——正典无自定义数值） */
      (D.FACTIONS_FIXED || []).forEach(function (fx) {
        list.push({
          id: fx.id,
          name: SQ.t('faction.' + fx.id + '.name', null, wid),
          align: fx.align,
          desc: 'faction.' + fx.id + '.desc',       /* 正典描述 key（lexicon-factions.js 分卷） */
          fixed: true,
          perk: pick((cfg.PERKS || {})[fx.align] || [{ field: 'qiRate', v: 0.05 }]),
          rel: {}
        });
      });
      /* ② 随机补足段（旧档兼容：固定池缺失的世界包退回纯随机 7~10 个的旧口径） */
      var descUsed = { right: {}, neutral: {}, evil: {} };
      function pickDesc(align) {
        var pool = (SQ.FACTION_DESCS && SQ.FACTION_DESCS[align]) || [];
        var free = pool.filter(function (k) { return !descUsed[align][k]; });
        if (!free.length) return pool.length ? pool[0] : null;
        var k = pick(free);
        descUsed[align][k] = 1;
        return k;
      }
      var ex = cfg.RAND_EXTRA || [0, 0];
      var nExtra = (D.FACTIONS_FIXED && D.FACTIONS_FIXED.length)
        ? ex[0] + Math.floor(Math.random() * (ex[1] - ex[0] + 1))
        : (cfg.MIN || 7) + Math.floor(Math.random() * ((cfg.MAX || 10) - (cfg.MIN || 7) + 1));
      for (var k = 0; k < nExtra; k++) {
        var align = ALIGNS[k % 3];                       /* 正/左/魔均衡轮转 */
        list.push({
          id: 'f' + (k + 1),
          name: nameOf(align),
          align: align,
          desc: pickDesc(align),                         /* 描述 key，随势力入档持久 */
          fixed: false,
          perk: pick((cfg.PERKS || {})[align] || [{ field: 'qiRate', v: 0.05 }]),
          rel: {}
        });
      }
      /* ③ 关系正典种子（势力全录卷 §二：固定对直接播种不掷骰，对称写入） */
      var byId = {};
      list.forEach(function (f) { byId[f.id] = f; });
      (D.FACTION_RELS_CANON || []).forEach(function (p) {
        var a = byId[p.a], b = byId[p.b];
        if (!a || !b) return;
        a.rel[b.id] = p.rel;
        b.rel[a.id] = p.rel;
      });
      /* ④ 其余两两关系随机对称（已播种的正典对跳过——旧档不追溯重掷由 normalize 保留既有 rel 实现） */
      for (var a2 = 0; a2 < list.length; a2++) {
        for (var b2 = a2 + 1; b2 < list.length; b2++) {
          var fa = list[a2], fb = list[b2];
          if (fa.rel[fb.id]) continue;
          var r = Math.random();
          var rel = r < (cfg.REL_FRIENDLY_P || 0.30) ? 'friendly'
            : (r < (cfg.REL_ENEMY_P || 0.55) ? 'enemy' : 'neutral');
          fa.rel[fb.id] = rel;
          fb.rel[fa.id] = rel;
        }
      }
      ws.factions = list;
      /* 道友归属（§3）：先轮转铺满（每个势力 ≥1 人），再 20% 概率转为散人（不掏空小势力） */
      var cs = pack.companions || [];
      var counts = {};
      var npcs = {};
      cs.forEach(function (c, idx) { npcs[c.id] = list[idx % list.length].id; counts[npcs[c.id]] = (counts[npcs[c.id]] || 0) + 1; });
      cs.forEach(function (c) {
        if (Math.random() >= 0.20) return;
        var fid = npcs[c.id];
        if (fid && counts[fid] > 1) { npcs[c.id] = null; counts[fid]--; }
      });
      ws.factionNpcs = npcs;
      return list;
    },

    byId: function (ws, fid) {
      var l = ws.factions || [];
      for (var i = 0; i < l.length; i++) if (l[i].id === fid) return l[i];
      return null;
    },
    current: function (ws) { return ws.factionId ? SQ.Factions.byId(ws, ws.factionId) : null; },
    npcFactionOf: function (ws, npcId) {
      var fid = (ws.factionNpcs || {})[npcId];
      return fid ? SQ.Factions.byId(ws, fid) : null;
    },
    relationOf: function (ws, aId, bId) {
      if (aId === bId) return 'same';
      var a = SQ.Factions.byId(ws, aId);
      return (a && a.rel && a.rel[bId]) || 'neutral';
    },

    /* ── 职级贡献（势力深化批 · 势力全录卷 §三）──────────────── */

    repOf: function (ws, fid) {
      /* fid 缺省 = 当前势力（六向批 A7 真机走查修复：rankOf(ws, D) 二参调用此前恒 0——
       * 波及开宗身份门槛 / 转世 officeMax 计分 / 成就执事掌门 / 奏疏传记职级文案七处） */
      var f = fid != null ? fid : ws.factionId;
      var v = f ? (ws.factionRep || {})[f] : null;
      return (typeof v === 'number' && isFinite(v) && v > 0) ? Math.floor(v) : 0;
    },
    /* 职级 = 声望阈值派生档（0~4，不落库——单一事实源） */
    rankOf: function (ws, D, fid) {
      var th = ((D || {}).FACTION_RANKS || {}).TH || [0, 100, 300, 700, 1500];
      var rep = SQ.Factions.repOf(ws, fid);
      var rank = 0;
      for (var i = 0; i < th.length; i++) if (rep >= th[i]) rank = i;
      return rank;
    },
    /* 任一势力最高职级（隐世福地 obtain.factionRank 门控消费，cave.js grantObtain） */
    maxRankOf: function (ws, D) {
      var max = 0;
      for (var fid in (ws.factionRep || {})) {
        var rk = SQ.Factions.rankOf(ws, D, fid);
        if (rk > max) max = rk;
      }
      return max;
    },

    /* 加入增益（Mods.collect 消费）：当前势力 perk {field, v} × 职级放大（≤×1.35，§8.2 v1.23）；
     * 未加入 → null。D 缺省时不放大（旧调用口径兼容）。 */
    perkOf: function (ws, D) {
      var f = SQ.Factions.current(ws);
      if (!f || !f.perk) return null;
      var pm = ((D || {}).FACTION_RANKS || {}).PERK_MULT || [1];
      var rank = D ? SQ.Factions.rankOf(ws, D, f.id) : 0;
      var mult = pm[Math.min(rank, pm.length - 1)] || 1;
      return { field: f.perk.field, v: f.perk.v * mult, base: f.perk.v, rank: rank };
    },

    /* 捐献供奉（势力全录卷 §3.2）：三档按钮，rep = 灵石 ÷ STONES_PER_REP，每 2h 窗口上限 WINDOW_CAP；
     * 超上限**按比例部分成交**（只扣对应灵石）；走 mutate 通道，ledger.out.donate 记账 */
    donate: function (ws, pack, D, amount, now, log) {
      var cfg = D.FACTION_DONATE || {};
      var f = SQ.Factions.current(ws);
      if (!f) return { ok: false, reason: 'none' };
      if ((cfg.TIERS || []).indexOf(amount) < 0) return { ok: false, reason: 'tier' };
      var don = ws.factionDonate || (ws.factionDonate = { at: 0, used: 0 });
      if (now - (don.at || 0) > (cfg.WINDOW_MS || 7200000)) { don.at = now; don.used = 0; }
      var capLeft = (cfg.WINDOW_CAP || 300) - (don.used || 0);
      if (capLeft <= 0) return { ok: false, reason: 'cap' };
      var wantRep = Math.floor(amount / (cfg.STONES_PER_REP || 1000));
      var rep = Math.min(wantRep, capLeft);
      var cost = rep * (cfg.STONES_PER_REP || 1000);
      if (ws.stones < cost) return { ok: false, reason: 'stones', need: cost, have: ws.stones };
      ws.stones -= cost;
      SQ.Ledger.note(ws, 'out', 'donate', cost);
      if (!don.at) don.at = now;
      don.used = (don.used || 0) + rep;
      if (!ws.factionRep) ws.factionRep = {};
      ws.factionRep[f.id] = SQ.Factions.repOf(ws, f.id) + rep;
      if (log) log('sys', SQ.t('faction.log.donate', { name: f.name, n: rep }, pack.worldId));
      return { ok: true, rep: rep, cost: cost, rank: SQ.Factions.rankOf(ws, D, f.id) };
    },

    /* ── 势力委托（势力全录卷 §四）────────────────────────────
     * questTick 在 claim 内调用（在线才刷新）；三类：slay（kills 增量）/ cultivate（total 增量）
     * / gather（交付时足额扣灵石）；进度 = 当前值 − 生成瞬间基线快照 base。 */
    questTick: function (ws, pack, D, mods, now, ctx) {
      var cfg = D.FACTION_QUEST || {};
      var q = ws.factionQuest;
      if (q && q.expireAt <= now) {                       /* 过期作废 */
        ws.factionQuest = null;
        ws.factionQuestCd = now + (cfg.REFRESH_MS || 1800000);
        if (ctx && ctx.log) ctx.log('sys', SQ.t('faction.quest.expired', null, pack.worldId));
        return null;
      }
      if (q || !ws.factionId) return null;
      if ((ws.factionQuestCd || 0) > now) return null;
      var types = Object.keys(cfg.TYPES || {});
      if (!types.length) return null;
      var type = types[Math.floor(Math.random() * types.length)];
      var tc = cfg.TYPES[type];
      var target;
      if (type === 'slay') target = (tc.base || 60) + (tc.perRealm || 30) * (ws.realm || 0);
      else if (type === 'cultivate') {
        var rate = SQ.Idle.rateOf(ws, pack, D, mods);
        target = Math.max(1, Math.round(rate * (tc.secs || 2700)));
      } else target = Math.round(stonesOf(D, ws) * (tc.stoneK || 400));   /* gather：上缴额 */
      ws.factionQuest = {
        type: type, target: target,
        base: type === 'slay' ? (ws.kills || 0) : (type === 'cultivate' ? (ws.total || 0) : 0),
        rep: tc.rep || 20,
        stones: type === 'gather' ? 0 : Math.round(stonesOf(D, ws) * (tc.stoneK || 100)),
        bornAt: now, expireAt: now + (cfg.TTL_MS || 7200000)
      };
      /* 委托类型名本身就是带 {n} 的模板（剿除妖邪：击杀 {n} 头 / 闭关进益：修为增长 {n} / 采买军资：上缴 {n} 灵石），
       * 内层取词必须带上 target —— 原先传 null ⇒ 占位符原样烘进日志文本并随档永久保存（第十四批走查 AT14 抓到，
       * 屏上读作「门中贴出新委托：采买军资：上缴 {n} 灵石」）。 */
      if (ctx && ctx.log) ctx.log('sys', SQ.t('faction.quest.new', { type: SQ.t('faction.quest.' + type, { n: target }, pack.worldId) }, pack.worldId));
      return ws.factionQuest;
    },

    /* 委托进度（gather = 当前灵石是否足额；其余 = 快照增量 / 目标） */
    questProgress: function (ws, pack, D) {
      var q = ws.factionQuest;
      if (!q) return { cur: 0, target: 0, done: false };
      var cur;
      if (q.type === 'slay') cur = Math.max(0, (ws.kills || 0) - (q.base || 0));
      else if (q.type === 'cultivate') cur = Math.max(0, Math.floor((ws.total || 0) - (q.base || 0)));
      else cur = Math.min(ws.stones || 0, q.target);
      return { cur: cur, target: q.target, done: cur >= q.target };
    },

    /* 交付（mutate 通道）：足额才成交；gather 扣灵石记 out.donate；赏金记 in.event
     * （江湖事同源锚，与奇遇经济同通道——不新开分类） */
    questDeliver: function (ws, pack, D, now, log) {
      var q = ws.factionQuest;
      var f = SQ.Factions.current(ws);
      if (!q || !f) return { ok: false, reason: 'none' };
      if (q.expireAt <= now) return { ok: false, reason: 'expired' };
      var pr = SQ.Factions.questProgress(ws, pack, D);
      if (!pr.done) return { ok: false, reason: 'progress', cur: pr.cur, target: pr.target };
      if (q.type === 'gather') {
        if (ws.stones < q.target) return { ok: false, reason: 'stones', need: q.target, have: ws.stones };
        ws.stones -= q.target;
        SQ.Ledger.note(ws, 'out', 'donate', q.target);
      }
      if (q.stones > 0) {
        ws.stones += q.stones;
        SQ.Ledger.note(ws, 'in', 'event', q.stones);
      }
      if (!ws.factionRep) ws.factionRep = {};
      ws.factionRep[f.id] = SQ.Factions.repOf(ws, f.id) + (q.rep || 0);
      ws.factionQuest = null;
      ws.factionQuestCd = now + ((D.FACTION_QUEST || {}).REFRESH_MS || 1800000);
      if (log) log('sys', SQ.t('faction.quest.done', { n: q.rep }, pack.worldId));
      return { ok: true, rep: q.rep, stones: q.stones, rank: SQ.Factions.rankOf(ws, D, f.id) };
    },

    /* ── 势力冲突（势力全录卷 §五）────────────────────────────
     * warTick 在 claim 内调用：在线每分钟期望 P_PER_MIN 开战（dtSec 折算概率）、到期收场；
     * 开战即推 G17 江湖传闻 war 卡（Rumors.pushWar 安全空转）。 */
    warTick: function (ws, pack, D, mods, dtSec, now, ctx) {
      var cfg = D.FACTION_WAR || {};
      var war = ws.factionWar;
      if (war && war.until <= now) {
        /* 终局（战功制 · 势力全录卷 §7.1 第二段）：门槛判定 + 分档发放 + 后效 + 结果卡 + 清场 */
        return SQ.Factions.warSettle(ws, pack, D, now, ctx);
      }
      if (war || !ws.factionId) return null;
      var p = (cfg.P_PER_MIN || 0.025) * (dtSec / 60);
      if (Math.random() >= p) return null;
      /* 抽取交战对：敌对关系优先，无敌对对则持平对当场转敌对（积怨爆发） */
      var list = ws.factions || [];
      var enemyPairs = [], neutralPairs = [];
      for (var i = 0; i < list.length; i++) {
        for (var j = i + 1; j < list.length; j++) {
          var rel = (list[i].rel || {})[list[j].id] || 'neutral';
          if (rel === 'enemy') enemyPairs.push([list[i], list[j]]);
          else if (rel === 'neutral') neutralPairs.push([list[i], list[j]]);
        }
      }
      var pair = enemyPairs.length ? enemyPairs[Math.floor(Math.random() * enemyPairs.length)]
        : (neutralPairs.length ? neutralPairs[Math.floor(Math.random() * neutralPairs.length)] : null);
      if (!pair) return null;
      if (!enemyPairs.length) {                            /* 持平转敌对（对称写入） */
        pair[0].rel[pair[1].id] = 'enemy';
        pair[1].rel[pair[0].id] = 'enemy';
      }
      ws.factionWar = {
        aId: pair[0].id, bId: pair[1].id, bornAt: now,
        until: now + (cfg.DURATION_MS || 1200000), joined: null, joinedFid: null, merit: 0, result: null
      };
      if (ctx && ctx.log) {
        ctx.log('sys', SQ.t('faction.war.start', {
          a: pair[0].name, b: pair[1].name
        }, pack.worldId));
      }
      if (SQ.Rumors && SQ.Rumors.pushWar) SQ.Rumors.pushWar(ws, pack, D, now, ctx);
      return ws.factionWar;
    },

    nameOf: function (ws, fid) {
      var f = SQ.Factions.byId(ws, fid);
      return f ? f.name : '';
    },
    /* 玩家势力是否为交战方（第三方观望） */
    warSideOf: function (ws) {
      var war = ws.factionWar;
      if (!war || !ws.factionId) return null;
      return (war.aId === ws.factionId || war.bId === ws.factionId) ? ws.factionId : null;
    },

    /* 出面应战 · 第一段宣战入场（战功制 · 势力全录卷 §7.1）：每场一次、**入场无战力判定**——
     * 置 joined='in' + merit=0 + joinedFid（终局归属快照锚：战中叛离不改结算对象），写入场日志；
     * 战争期间秘境击杀累积战功（combat.js simulate 单点记账钩子，§7.7 注记 2）。
     * 旧 NEED_MULT 战力判定线已废弃（v1.1），本函数不再读 mods（保留入参兼容旧调用签名）。 */
    joinWar: function (ws, pack, D, mods, now, ctx) {
      var war = ws.factionWar;
      if (!war || war.until <= now) return { ok: false, reason: 'none' };
      if (war.joined) return { ok: false, reason: 'joined' };
      var myFid = SQ.Factions.warSideOf(ws);
      if (!myFid) return { ok: false, reason: 'watch' };
      war.joined = 'in';
      war.merit = 0;
      war.joinedFid = myFid;
      /* 宗门防守/出征（自立门户卷 §5.4）：入场瞬间弟子出力一次性折算入战功——
       * merit += Σfloor(弟子战力/P[4]) × WAR_DISC_K（战功制引擎零分叉，仅宗门侧加折算） */
      if (myFid === 'sect' && SQ.Sect && SQ.Sect.discipleMerit) {
        war.merit += SQ.Sect.discipleMerit(ws, pack, D);
      }
      if (ctx && ctx.log) {
        ctx.log('sys', SQ.t('faction.war.merit.joined', {
          name: SQ.Factions.nameOf(ws, myFid)
        }, pack.worldId));
      }
      return { ok: true };
    },

    /* 战功门槛（势力全录卷 §7.1 v1.2 · 探针实测校准）：MERIT_NEED = base 10 + realm × 2
     *（结算瞬间快照；原 15+5r 在 ±5 授权带内校准，依据见 data.js FACTION_WAR 注与任务清单收口章） */
    meritNeedOf: function (ws, D) {
      var cfg = (D || {}).FACTION_WAR || {};
      return (cfg.MERIT_NEED_BASE != null ? cfg.MERIT_NEED_BASE : 10) +
        (ws.realm || 0) * (cfg.MERIT_NEED_PER_REALM != null ? cfg.MERIT_NEED_PER_REALM : 2);
    },

    /* 终局结算（战功制 · 势力全录卷 §7.1~§7.4）：已入场 → win = merit ≥ MERIT_NEED，按 §7.2 分档发放
     * （胜 rep+50 + 灵石×500 记 in.event + 同门 bond+2；败 rep+5 + 战创 debuff）+ §7.3 后效（仅胜：
     * 旧怨磨损 50% enemy→neutral 对称写入 + 声威大振 shopCost −5%/24h）+ §7.4 结果传闻卡；
     * 未入场 → 观望无奖惩（沿用两败俱伤结局日志）。只在 warTick 到期分支调用（claim 事务内）。 */
    warSettle: function (ws, pack, D, now, ctx) {
      var cfg = D.FACTION_WAR || {};
      var war = ws.factionWar;
      if (!war) return null;
      var log = ctx && ctx.log;
      var wid = pack.worldId;
      var nameA = SQ.Factions.nameOf(ws, war.aId), nameB = SQ.Factions.nameOf(ws, war.bId);
      if (war.joined !== 'in') {                            /* 观望：无奖惩，沿用 §五 结局 */
        if (log) log('sys', SQ.t('faction.war.over.draw', { a: nameA, b: nameB }, wid));
        if (SQ.Rumors && SQ.Rumors.pushWarResult) SQ.Rumors.pushWarResult(ws, pack, D, now, 'draw');
        ws.factionWar = null;
        return { draw: true };
      }
      var myFid = war.joinedFid || SQ.Factions.warSideOf(ws) || ws.factionId;
      var merit = Math.max(0, Math.floor(war.merit || 0));
      var need = SQ.Factions.meritNeedOf(ws, D);
      var win = merit >= need;
      war.result = { win: win, merit: merit, need: need };
      if (!ws.factionRep) ws.factionRep = {};
      var out = { win: win, merit: merit, need: need, rep: 0, stones: 0 };
      if (win) {
        var rep = cfg.WIN_REP != null ? cfg.WIN_REP : 50;
        if (myFid) ws.factionRep[myFid] = SQ.Factions.repOf(ws, myFid) + rep;
        out.rep = rep;
        var stones = Math.round(stonesOf(D, ws) * (cfg.WIN_STONE_K != null ? cfg.WIN_STONE_K : 500));
        ws.stones += stones;
        SQ.Ledger.note(ws, 'in', 'event', stones);
        out.stones = stones;
        /* 同门道友好感 +2（Bonds.gain 唯一写口——绝交锁/心结锁自动拒入账；道侣豁免） */
        var bn = cfg.WIN_BOND || 2;
        (pack.companions || []).forEach(function (c) {
          if ((ws.factionNpcs || {})[c.id] !== myFid) return;
          if (ws.spouse && ws.spouse.npcId === c.id) return;
          if (SQ.Bonds) SQ.Bonds.gain(ws, pack, D, c.id, bn, now);
        });
        /* §7.3 后效① 旧怨磨损：败方对胜方 enemy→neutral 概率 50%（对称写入，仅该交战对；
         * 取代旧红线「冲突不改 rel 表」——先例即开战「积怨爆发」，正典种子是初始值非恒值） */
        var foeId = (war.aId === myFid) ? war.bId : war.aId;
        var mine = SQ.Factions.byId(ws, myFid), foe = SQ.Factions.byId(ws, foeId);
        if (mine && foe && (foe.rel || {})[mine.id] === 'enemy' &&
            Math.random() < (cfg.REL_SOFTEN_P != null ? cfg.REL_SOFTEN_P : 0.5)) {
          foe.rel[mine.id] = 'neutral';
          mine.rel[foe.id] = 'neutral';
          if (log) log('sys', SQ.t('faction.war.relsoft', { a: mine.name, b: foe.name }, wid));
        }
        /* §7.3 后效② 声威大振：shopCost −5% × 24h（pushBuff 既有通道，source 供浮层溯源） */
        var pre = cfg.PRESTIGE || { field: 'shopCost', mult: -0.05, hours: 24, source: 'factionWar' };
        if (SQ.Events && SQ.Events.pushBuff) {
          SQ.Events.pushBuff(ws, pre.field, pre.mult,
            now + Math.round((pre.hours || 24) * 3600000), pre.source || 'factionWar');
        }
        if (log) {
          log('sys', SQ.t('faction.war.over.win', { a: nameA, b: nameB }, wid));
          log('sys', SQ.t('faction.war.merit.win', {
            name: SQ.Factions.nameOf(ws, myFid), n: rep, stones: SQ.fmt(stones)
          }, wid));
        }
        if (SQ.Rumors && SQ.Rumors.pushWarResult) SQ.Rumors.pushWarResult(ws, pack, D, now, 'win');
      } else {
        var lrep = cfg.LOSE_REP != null ? cfg.LOSE_REP : 5;
        if (myFid) ws.factionRep[myFid] = SQ.Factions.repOf(ws, myFid) + lrep;
        out.rep = lrep;
        var db = cfg.DEBUFF || { field: 'combatPower', mult: -0.10, hours: 0.5 };
        if (SQ.Events && SQ.Events.pushBuff) {
          SQ.Events.pushBuff(ws, db.field, db.mult, now + Math.round((db.hours || 0.5) * 3600000));
        }
        if (log) {
          log('sys', SQ.t('faction.war.over.lose', { a: nameA, b: nameB }, wid));
          log('sys', SQ.t('faction.war.merit.lose', { name: SQ.Factions.nameOf(ws, myFid), n: lrep }, wid));
        }
        if (SQ.Rumors && SQ.Rumors.pushWarResult) SQ.Rumors.pushWarResult(ws, pack, D, now, 'lose');
      }
      /* 宗门战争结算钩子（自立门户卷 §5.4/§5.5）：胜 = 战胜场次 +1（REP_WIN 自动兑现）+
       * 主动宣战胜利则目标声望压制 −10%；败 = 弟子零损失、宗门声望不增不扣 */
      if (myFid === 'sect' && SQ.Sect && SQ.Sect.onWarSettled) SQ.Sect.onWarSettled(ws, pack, D, win, war, now, ctx);
      ws.factionWar = null;
      return out;
    },

    /* ── 门中供给（势力全录卷 §六）：职级门控兑换丹药（效果与 PILLS 同源走 applyEffects），
     * rep + 灵石（坊市价 ×2，out.shop）双价，每 SKU 24h 限兑一次。mutate 通道。 */
    buySupply: function (ws, pack, D, mods, sku, now, log) {
      var cfg = (D.FACTION_SUPPLY || []);
      var item = null;
      for (var i = 0; i < cfg.length; i++) if (cfg[i].sku === sku) item = cfg[i];
      var f = SQ.Factions.current(ws);
      if (!item || !f) return { ok: false, reason: 'none' };
      var rank = SQ.Factions.rankOf(ws, D, f.id);
      if (rank < (item.rank || 0)) return { ok: false, reason: 'rank', need: item.rank, have: rank };
      if (SQ.Factions.repOf(ws, f.id) < item.rep) return { ok: false, reason: 'rep', need: item.rep };
      var last = (ws.factionSupply || {})[sku] || 0;
      if (now - last < (D.FACTION_SUPPLY_CD_MS || 86400000)) return { ok: false, reason: 'cd' };
      var pill = null;
      (D.PILLS || []).forEach(function (p) { if (p.id === item.pill) pill = p; });
      if (!pill) return { ok: false, reason: 'none' };
      /* 价走 SQ.Shop.supplyPriceOf 唯一取数口（审计 #8）：原在这里内联了一遍坊市公式，
       * 不吃 shopCost 乘区、取整也不同（round vs ceil）⇒ 卷面「坊市价×2」在有折扣法宝时不成立。 */
      var cost = SQ.Shop.supplyPriceOf(pill, ws, D, mods);
      if (ws.stones < cost) return { ok: false, reason: 'stones', need: cost, have: ws.stones };
      ws.stones -= cost;
      SQ.Ledger.note(ws, 'out', 'shop', cost);
      ws.factionRep[f.id] = SQ.Factions.repOf(ws, f.id) - item.rep;
      if (!ws.factionSupply) ws.factionSupply = {};
      ws.factionSupply[sku] = now;
      if (SQ.Events && SQ.Events.applyEffects) {
        SQ.Events.applyEffects(ws, pack, D, mods, Object.assign({}, pill.effect),   /* 副本 = 纪律，见 events.js applyEffects 头注 */
          { log: log, now: now, eventId: null });
      }
      if (log) log('sys', SQ.t('faction.supply.bought', { name: SQ.t('faction.supply.sku.' + sku, null, pack.worldId) }, pack.worldId));
      return { ok: true, cost: cost, rep: item.rep };
    },

    /* 加入（mutate 通道内调用）：效力 + 按关系一次性调整道友好感（§6）。
     * 返回 {ok, reason?, faction?, bondDeltas?} 供 CONFIRM/toast 消费 */
    join: function (ws, pack, D, fid, now, log) {
      if (!SQ.Factions.byId(ws, fid)) return { ok: false, reason: 'unknown' };
      if (ws.factionId === fid) return { ok: false, reason: 'same' };
      /* 宗主哨兵（自立门户卷 §1.4）：开宗在位期间不可再入他门——传位后 factionId 归 null 自然放行 */
      if (ws.factionId === 'sect' && ws.sect && !ws.sect.succession) return { ok: false, reason: 'sect' };
      /* 势力唯一归属（择门批）：已身在一门时不可另投——先叛离，待冷却后再入 */
      if (ws.factionId) return { ok: false, reason: 'occupied' };
      if ((ws.factionCdUntil || 0) > now) return { ok: false, reason: 'cooldown' };
      var cfg = D.FACTIONS || {};
      ws.factionId = fid;
      /* 原此处写 `ws.factionJoinedAt = now` —— 幽灵字段（initialState / normalize 均未声明 ⇒ 读档即丢，
       * 且全仓零读者），耦合缺陷收口批 2026-10-10 删除；真要「入门时长」按声明流程加字段。
       * 普查由审计关 A8 守（`ws.*` 写点 ⇔ normalize 声明集）。 */
      var deltas = {};
      (pack.companions || []).forEach(function (c) {
        var nf = (ws.factionNpcs || {})[c.id];
        if (!nf) return;                                   /* 散人不受影响 */
        if (ws.spouse && ws.spouse.npcId === c.id) return; /* 道侣好感不因势力调整 */
        var rel = nf === fid ? 'same' : SQ.Factions.relationOf(ws, fid, nf);
        var delta = rel === 'friendly' ? (cfg.JOIN_FRIENDLY || 10)
          : rel === 'enemy' ? (cfg.JOIN_ENEMY || -20)
          : rel === 'same' ? (cfg.JOIN_SAME || 5) : 0;
        if (!delta) return;
        /* 好感调整走唯一写口（引擎卷 §3.2 收口项）：绝交锁 / 心结锁与 [BOND_MIN, BOND_MAX] clamp
         * 原本在此**重复实现**一遍（`=== -99` / scars 前置 + 手工 clamp）。gain 只收正向、lose 只收负向，
         * 故按 delta 符号分流；被拒或压线不动时 after === before ⇒ 不记 delta，与改前逐字同结果。 */
        var r = delta > 0 ? SQ.Bonds.gain(ws, pack, D, c.id, delta, now)
                          : SQ.Bonds.lose(ws, pack, D, c.id, delta, now);
        if (r.after !== r.before) deltas[c.id] = r.after - r.before;
      });
      if (log) log('sys', SQ.t('faction.log.join', { name: SQ.Factions.byId(ws, fid).name }, pack.worldId));
      return { ok: true, faction: SQ.Factions.byId(ws, fid), bondDeltas: deltas };
    },

    /* 叛离（非敌对 · §7 代价 + 深化批 §三）：karmaEventScore 入账 + 冷却 1 游戏年 + 该势力声望清零
     * （人情不回滚，名分收回）+ 进行中委托作废；好感不回滚。
     * 职位实权失效（势力全录卷 §8.4）：factionOffice 清空（CD 中未用次数作废）+ 未消耗的
     * 门中护法标记一并作废——实权不随人走。叛投敌对走 defect（§九），不经本函数。 */
    leave: function (ws, pack, D, now, log) {
      var f = SQ.Factions.current(ws);
      if (!f) return { ok: false, reason: 'none' };
      var cfg = D.FACTIONS || {};
      ws.karmaEventScore = (ws.karmaEventScore || 0) + (cfg.LEAVE_KARMA != null ? cfg.LEAVE_KARMA : -30);
      ws.factionCdUntil = now + (cfg.LEAVE_CD_MS || 360000);
      ws.factionId = null;
      if (ws.factionRep) delete ws.factionRep[f.id];       /* 声望清零（势力全录卷 §3.1） */
      if (ws.factionQuest) {                               /* 进行中委托作废（不返还） */
        ws.factionQuest = null;
        ws.factionQuestCd = now + ((D.FACTION_QUEST || {}).REFRESH_MS || 1800000);
      }
      ws.factionOffice = null;
      if (ws.tribulation) ws.tribulation.officeGuard = false;
      ws.everDefected = true;   /* 叛离哨兵（自立门户卷开宗门槛 + 图鉴成就 achv_panzong 供数） */
      if (log) log('sys', SQ.t('faction.log.leave', { name: f.name }, pack.worldId));
      /* 天道编年史钩子（天道设计 §3.3）：叛宗记录入编年史（下次奏疏 AI 判词必然引用） */
      if (SQ.Tiandao && SQ.Tiandao.onDefect) SQ.Tiandao.onDefect(ws, pack, D, f.name, now);
      return { ok: true, faction: f };
    },

    /* ── 职级实权（势力全录卷 §八 · 系统深化批 A5）────────────────
     * 职位 = 职级派生不落库（单一事实源纪律，禁止另立职位存档字段）：
     * rank ≥4 → 'elder'（长老：门中护法 + 执事权保留）/ rank ≥3 → 'steward'（执事：调遣同门）。
     * ⚠ 职级档 3 称号「长老」与档 4 职位「长老」同名——UI 双段式展示（§8.1 警示）。 */
    officeOf: function (ws, D, fid) {
      var id = fid || ws.factionId;
      if (!id) return null;
      var cfg = (D || {}).FACTION_OFFICE || {};
      var rank = SQ.Factions.rankOf(ws, D, id);
      var elderRank = (cfg.GUARD && cfg.GUARD.rank != null) ? cfg.GUARD.rank : 4;
      var stewardRank = (cfg.DISPATCH && cfg.DISPATCH.rank != null) ? cfg.DISPATCH.rank : 3;
      return rank >= elderRank ? 'elder' : (rank >= stewardRank ? 'steward' : null);
    },

    /* 执事「调遣同门」（§8.2）：复制一名同势力道友的个体助力为 2h buff（来源 'bond'，
     * 与常驻助力**并行加算**——buff 桶与 bond 桶各自 note，不互相覆盖）。
     * 候选过滤：同势力 + 好感 ≥1（tierOf 同口径，绝交锁/厌恶自然出局）+ field 型 perk + 非炉鼎采补中；
     * channel 型不可调遣（buff 通道无乘区可落）；CD 只在成功发动时消耗（置灰态不耗）。mutate 通道。 */
    dispatchFellow: function (ws, pack, D, npcId, now, log) {
      var cfg = D.FACTION_OFFICE || {};
      var disp = cfg.DISPATCH || { rank: 3, hours: 2, source: 'bond' };
      if (!SQ.Factions.officeOf(ws, D)) return { ok: false, reason: 'office' };
      var off = ws.factionOffice || (ws.factionOffice = { dispatchAt: 0, guardAt: 0 });
      if (now - (off.dispatchAt || 0) < (cfg.CD_MS || 86400000)) return { ok: false, reason: 'cd' };
      var c = SQ.Bonds ? SQ.Bonds.byId(pack, npcId) : null;
      if (!c) return { ok: false, reason: 'unknown' };
      if ((ws.factionNpcs || {})[npcId] !== ws.factionId) return { ok: false, reason: 'notsame' };
      if (ws.spouse && ws.spouse.form === 'luding' && ws.spouse.npcId === npcId) return { ok: false, reason: 'chan' };
      var pk = c.perk || {};
      if (!(pk.field && SQ.Mods.FIELDS.indexOf(pk.field) >= 0 && pk.perTier)) return { ok: false, reason: 'chan' };
      var tier = SQ.Bonds.tierOf(ws, npcId, D);
      if (tier < 1) return { ok: false, reason: 'affinity' };
      var v = pk.perTier * tier;
      if (!SQ.Events || !SQ.Events.pushBuff) return { ok: false, reason: 'none' };
      SQ.Events.pushBuff(ws, pk.field, v, now + Math.round((disp.hours || 2) * 3600000), disp.source || 'bond');
      off.dispatchAt = now;
      if (log) log('sys', SQ.t('faction.office.dispatch.ok', {
        name: SQ.t('bond.' + npcId + '.name', null, pack.worldId),
        field: SQ.t('talent.field.' + pk.field, null, pack.worldId),
        v: (v > 0 ? '+' : '-') + (Math.round(Math.abs(v) * 1000) / 10) + '%'
      }, pack.worldId));
      return { ok: true, npcId: npcId, field: pk.field, value: v, tier: tier };
    },

    /* 长老「门中护法」（§8.3）：写一次性标记 ws.tribulation.officeGuard——下次渡劫护法加项强制生效
     * 且额外 +0.02（消费点 worlds/xiuxian/tribulation.js info()；魔道档位豁免失效）；
     * 清除点 = realm.js 判定后与 tribulation.next 同点位 / 叛离 / leave。预估浮层反复调 info() 不消耗。 */
    guardArm: function (ws, pack, D, now, log) {
      var cfg = D.FACTION_OFFICE || {};
      if (SQ.Factions.officeOf(ws, D) !== 'elder') return { ok: false, reason: 'office' };
      var off = ws.factionOffice || (ws.factionOffice = { dispatchAt: 0, guardAt: 0 });
      if (now - (off.guardAt || 0) < (cfg.CD_MS || 86400000)) return { ok: false, reason: 'cd' };
      ws.tribulation = ws.tribulation || {};
      ws.tribulation.officeGuard = true;
      off.guardAt = now;
      if (log) log('sys', SQ.t('faction.office.guard.armed', null, pack.worldId));
      return { ok: true };
    },

    /* ── 叛离与谍报（势力全录卷 §九 · 系统深化批 A5）────────────────
     * 叛投敌对（新势力与旧势力 relationOf === 'enemy'）：karma −60 / 旧门同门 bond −10
     * （Bonds.lose 唯一负向写口，锁类豁免、道侣豁免）/ 旧声望 50% 向下取整转移入新门（先入后删
     * 同一事务）/ 可选献秘 ×1（§9.2 系统随机抽取，玩家不可指定）。
     * 顺序：leave 清理骨架（委托作废/职位清理，karma 用叛投档）→ 差异三件 → 献秘 → join(新门)
     * → 冷却落账（join 的关系联动好感照常执行——两层代价有意叠加，§9.1）。
     * 防刷三重锁（§9.4）：CD 1 游戏年 / karma 单向累计 / 声望每轮减半 + 献秘排除已持有。 */
    defect: function (ws, pack, D, targetFid, takeIntel, now, log) {
      var cfg = D.FACTIONS || {};
      var f = SQ.Factions.current(ws);
      if (!f) return { ok: false, reason: 'none' };
      var target = SQ.Factions.byId(ws, targetFid);
      if (!target || targetFid === f.id) return { ok: false, reason: 'unknown' };
      if (SQ.Factions.relationOf(ws, f.id, targetFid) !== 'enemy') return { ok: false, reason: 'notenemy' };
      if ((ws.factionCdUntil || 0) > now) return { ok: false, reason: 'cooldown' };
      var wid = pack.worldId;
      var oldFid = f.id;
      /* leave 清理骨架（不叠 LEAVE_KARMA——karma 走叛投档） */
      if (ws.factionQuest) {
        ws.factionQuest = null;
        ws.factionQuestCd = now + ((D.FACTION_QUEST || {}).REFRESH_MS || 1800000);
      }
      ws.factionOffice = null;
      if (ws.tribulation) ws.tribulation.officeGuard = false;
      ws.factionId = null;
      ws.everDefected = true;   /* 叛投敌对同属叛离（自立门户卷 everDefected 门槛） */
      /* 差异① karma −60（现行 −30 加倍） */
      ws.karmaEventScore = (ws.karmaEventScore || 0) +
        (cfg.LEAVE_KARMA_ENEMY != null ? cfg.LEAVE_KARMA_ENEMY : -60);
      if (log) log('sys', SQ.t('faction.defect.karma', { name: target.name }, wid));
      /* 天道编年史钩子：叛投敌对同属叛宗记录（§3.3） */
      if (SQ.Tiandao && SQ.Tiandao.onDefect) SQ.Tiandao.onDefect(ws, pack, D, f.name, now);
      /* 差异② 旧门同门 bond −10（Bonds.lose 唯一负向写口；绝交锁/心结锁豁免、道侣豁免） */
      var dbn = cfg.DEFECT_BOND != null ? cfg.DEFECT_BOND : -10;
      var bondHits = 0;
      if (SQ.Bonds && SQ.Bonds.lose) {
        (pack.companions || []).forEach(function (c) {
          if ((ws.factionNpcs || {})[c.id] !== oldFid) return;
          if (ws.spouse && ws.spouse.npcId === c.id) return;
          var r = SQ.Bonds.lose(ws, pack, D, c.id, dbn, now);
          if (r && !r.blocked) bondHits++;
        });
      }
      if (bondHits && log) log('sys', SQ.t('faction.defect.bond', { n: Math.abs(dbn) }, wid));
      /* 差异③ 声望 50% 转移（先入新键再删旧键，同一事务保恒等；rep 非灵石不入 Ledger） */
      var oldRep = SQ.Factions.repOf(ws, oldFid);
      var transferred = Math.floor(oldRep * (cfg.REP_TRANSFER != null ? cfg.REP_TRANSFER : 0.5));
      if (!ws.factionRep) ws.factionRep = {};
      delete ws.factionRep[oldFid];
      if (transferred > 0) {
        ws.factionRep[targetFid] = SQ.Factions.repOf(ws, targetFid) + transferred;
        if (log) log('sys', SQ.t('faction.defect.rep', { n: transferred }, wid));
      }
      /* 献秘（§9.2）：每档叛投限 1 条，结算瞬间系统随机抽取并揭示 */
      var intelId = null;
      if (takeIntel) {
        intelId = SQ.Factions.rollIntelArt(ws, pack, D, f);
        if (intelId) {
          ws.intelArts = ws.intelArts || {};
          ws.intelArts[intelId] = true;
          if (log) log('sys', SQ.t('faction.defect.intel.pick', {
            name: SQ.t('skill.' + intelId + '.name', null, wid)
          }, wid));
        }
      }
      /* 加入新门（join 现行逻辑全量复用：关系联动好感 −20/+10/+5 照常，与叛投 −10 有意叠加） */
      var jr = SQ.Factions.join(ws, pack, D, targetFid, now, log);
      if (!jr.ok) {
        /* join 拒绝（防御态：cooldown 已前置拦截）——回落无势力 + 冷却照落 */
        ws.factionCdUntil = now + (cfg.LEAVE_CD_MS || 360000);
        return { ok: false, reason: jr.reason };
      }
      ws.factionCdUntil = now + (cfg.LEAVE_CD_MS || 360000);
      return { ok: true, from: f, to: target, transferred: transferred, intelId: intelId, bondHits: bondHits };
    },

    /* 献秘抽取（§9.2 口径）：优先子池 = alignment 与旧势力 align 同值 + obtain ∈ {shop,black}
     * + 未持有 + effects 含旧势力 perk.field（「本门拿手的那一部」）；子池空 → 回退全池
     * （去掉 effects 约束）；两池皆空 → null（无秘可献）。残片通道（§9.3）另有口径：无 alignment 约束。 */
    rollIntelArt: function (ws, pack, D, oldFaction) {
      var artsMap = pack.artsMap();
      var align = oldFaction.align;
      var perkField = (oldFaction.perk || {}).field;
      var base = [];
      for (var id in artsMap) {
        var a = artsMap[id];
        if (!a || a.alignment !== align) continue;
        if (!(a.obtain && (a.obtain.type === 'shop' || a.obtain.type === 'black'))) continue;
        if (SQ.Arts.owned(ws, id)) continue;
        base.push(id);
      }
      var prime = perkField ? base.filter(function (id) {
        return artsMap[id].effects && artsMap[id].effects[perkField];
      }) : [];
      var pool = prime.length ? prime : base;
      if (!pool.length) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    },

    /* 残片兑换侧献秘互通口径（§9.3 · 数值详设 §2.7 z6~z8）：无 alignment 约束 =
     * obtain ∈ {shop,black} && 未持有全池随机取 1；同一 ws.intelArts 存档、天然幂等。 */
    rollIntelArtFree: function (ws, pack, D) {
      var artsMap = pack.artsMap();
      var base = [];
      for (var id in artsMap) {
        var a = artsMap[id];
        if (!a || !(a.obtain && (a.obtain.type === 'shop' || a.obtain.type === 'black'))) continue;
        if (SQ.Arts.owned(ws, id)) continue;
        base.push(id);
      }
      if (!base.length) return null;
      return base[Math.floor(Math.random() * base.length)];
    }
  };
})();
