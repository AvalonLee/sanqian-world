/* systems/bonds.js — G14 护法结缘（侣柱）：好感模型 / 护法位 / 个体助力聚合 / 结缘双修 / 冥佑
 * 规则源：引擎卷 §三（v1.10 实施口径）+ 道友池卷 §二（名录 58 人 · bond 映射表唯一事实源）。
 * 纪律：好感**默认只增不减**；负向仅三个受控写口——lose（叛投敌对旧门怨恨，系统深化批 A5）、
 *       绝交锁 −99（引擎卷 §3.6，v1.10 起带双门槛）、炉鼎心结锁（好感锁死）；
 *       正向写口 = gain 一个（事件 bond 收益 / 加入势力一次性调整 / 势力战同门 / 天道情缘牵引 /
 *       天骄切磋致歉 / **v1.10 同道相吸**：善恶名号跨段瞬间同向已相识道友一次性入账 /
 *       **v1.11 好感三渠道**：visit 拜访论道 · giftPill 赠丹 · cheer 同贺，见下方 §3.2a 块注）；
 *       好感下限 BOND_MIN = −20（厌恶，负好感无档位无助力）；护法位自动（好感最高者）+ 玩家手选优先；
 *       魔道档位护法失效但个体助力保留（市井之交不问正邪）。
 * v1.10 缘尽收敛（阵营名号联动批）：绝交锁改双门槛 + 不合条降级为好感大跌 + 新增遗泽赎回口 redeem。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var LOCK = -99;                                 /* 绝交锁哨兵（v2.4 由 −1 迁移，normalize 兼容旧档） */

  function tierOf(aff, D) {
    if (!(aff >= 1)) return 0;                     /* ≤0（厌恶 / 绝交锁）都算未结缘 */
    var ts = D.BOND_TIERS || [1, 30, 70, 100];
    var tier = 0;
    for (var i = 0; i < ts.length; i++) if (aff >= ts[i]) tier = i + 1;
    return tier;
  }

  SQ.Bonds = {
    LOCK: LOCK,
    tierOf: function (ws, npcId, D) {
      return tierOf((ws.bonds || {})[npcId] || 0, D);
    },

    list: function (pack) { return (pack && pack.companions) || []; },

    byId: function (pack, id) {
      var cs = SQ.Bonds.list(pack);
      for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i];
      return null;
    },

    /* ── 多道侣取数口（册一百二十三批）──────────────────────────────
     * `ws.spouses = [{npcId, form, since}]`；旧档单值 `ws.spouse` 由 normalize 迁移。
     * 所有人只看这一族，不再各自裸读 `.spouse.npcId`。 */
    spousesOf: function (ws) { return (ws && ws.spouses) || []; },
    spouseOf: function (ws, npcId) {
      var sps = SQ.Bonds.spousesOf(ws);
      for (var i = 0; i < sps.length; i++) if (sps[i].npcId === npcId) return sps[i];
      return null;
    },
    isSpouse: function (ws, npcId) { return !!SQ.Bonds.spouseOf(ws, npcId); },
    /* 炉鼎采补期间其个体助力归零：返回 {npcId: 1} 集合（可多位同时炉鼎） */
    ludingSet: function (ws) {
      var out = {};
      SQ.Bonds.spousesOf(ws).forEach(function (sp) { if (sp.form === 'luding') out[sp.npcId] = 1; });
      return out;
    },
    /* 名单行（呈现用，n 上限后以「等 N 人」收束）——codex 传记 / 右栏 / 位卡同读，避免各写一套 */
    spouseLine: function (ws, pack, max) {
      var sps = SQ.Bonds.spousesOf(ws);
      if (!sps.length) return '';
      var n = Math.max(1, max || 1), names = [];
      for (var i = 0; i < sps.length && i < n; i++) {
        names.push(SQ.t('bond.' + sps[i].npcId + '.name', null, pack.worldId));
      }
      var s = names.join(SQ.t('ui.listsep'));
      if (sps.length > names.length) s += SQ.t('bond.spouse.etal', { n: sps.length }, pack.worldId);
      return s;
    },

    affinityOf: function (ws, npcId) {
      return (ws.bonds || {})[npcId] || 0;         /* −99（绝交锁）/ 负好感（厌恶）原样返回 */
    },

    locked: function (ws, npcId) { return (ws.bonds || {})[npcId] === LOCK; },
    scarred: function (ws, npcId) { return !!(ws.scars || {})[npcId]; },

    /* 遍历「助力生效中」的道友（档 ≥1；炉鼎采补期间该道友被跳过 = 个体助力归零，引擎卷 §3.8 代价②）。
     * fn(companion, tier, perkValue)；perkValue = perTier × tier（channel 型为幅度值）。 */
    eachActive: function (ws, pack, D, fn) {
      var cs = SQ.Bonds.list(pack);
      var lu = SQ.Bonds.ludingSet(ws);
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (lu[c.id]) continue;                    /* 鼎炉被采，何暇助你（多位炉鼎逐位归零） */
        var tier = tierOf((ws.bonds || {})[c.id] || 0, D);
        if (tier < 1) continue;
        var pk = c.perk || {};
        var v = pk.perTier != null ? pk.perTier * tier : 0;
        fn(c, tier, v);
      }
    },

    /* 护法位（引擎卷 §3.3）：好感最高者自动担任（表序破平局）；绝交锁/心结锁排除。
     * 玩家手选（ws.guardianPick，道友页「择护法」浮层写入）优先——被选者须已结缘（好感 ≥1）
     * 且无绝交锁/心结锁，否则回落自动。
     * bonus：档 ≥3 且非魔道档位才有值（+0.03/+0.06）；evil = 魔道档位（护法失效，独行叙事）。
     * 返回 null（无人结缘）或 {npcId, tier, bonus, evil, companion}。 */
    guardianOf: function (ws, pack, D) {
      var cs = SQ.Bonds.list(pack);
      var best = null, bestAff = 0;
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (SQ.Bonds.scarred(ws, c.id)) continue;  /* 心结锁：永不再任护法位 */
        var aff = (ws.bonds || {})[c.id] || 0;
        if (aff >= 1 && aff > bestAff) { bestAff = aff; best = c; }
      }
      /* 手选优先：在任者须满足最低资格（已结缘 + 无心结锁；绝交锁者好感必为 −99 已被 aff≥1 排除），
       * 资格不满足则静默回落自动（脏值不造假） */
      var pick = ws.guardianPick;
      if (pick && pick !== (best && best.id)) {
        var pc = null;
        for (var j = 0; j < cs.length; j++) if (cs[j].id === pick) { pc = cs[j]; break; }
        var pAff = (ws.bonds || {})[pick] || 0;
        if (pc && !SQ.Bonds.scarred(ws, pick) && pAff >= 1) { best = pc; bestAff = pAff; }
      }
      if (!best) return null;
      var tier = tierOf(bestAff, D);
      var evil = !!(pack.worldSystems && pack.worldSystems.tierOf &&
        pack.worldSystems.tierOf(ws) === 'evil');
      var bonus = 0;
      if (!evil && tier >= 3) bonus = (D.GUARD_BONUS || {})[tier] || 0;
      return { npcId: best.id, tier: tier, bonus: bonus, evil: evil, companion: best };
    },

    /* companion 判定（第九类 DSL，引擎卷 §3.5）：护法位档位 ≥ minTier；魔道档位必然失败 */
    companionOk: function (ws, pack, D, minTier) {
      var g = SQ.Bonds.guardianOf(ws, pack, D);
      if (!g || g.evil) return false;
      return g.tier >= (minTier || 1);
    },

    /* ── 善恶名号 → 方向与段位距离（阵营名号联动批 · 道友池卷 v1.2 §六）──────────
     * KARMA_RANKS 降序 9 段，中段 'zuodao'（左道散人）为中性锚：
     *   index < 中段 → dir 'right'；index > 中段 → dir 'evil'；相等 → 'neutral'
     *   dist = |index − 中段 index| ∈ [0,4]（浩然道尊 / 极道魔尊 = 4）
     * 名号表缺项或 id 不在表内 → null（调用方据此跳过，不猜方向）。 */
    rankDirOf: function (rankId, D) {
      var rows = (D && D.KARMA_RANKS) || [];
      var mid = -1, idx = -1;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i][1] === 'zuodao') mid = i;
        if (rows[i][1] === rankId) idx = i;
      }
      if (mid < 0 || idx < 0) return null;
      return { dir: idx < mid ? 'right' : (idx > mid ? 'evil' : 'neutral'), dist: Math.abs(idx - mid) };
    },

    /* 同道相吸（唯一「名号 → 好感」写口）：名号跨段瞬间，与新名号同向且**已相识**（bond > 0）
     * 的道友一次性获 +base×dist（封顶 cap）。中性段 dist 0 → 零发放；未相识者不入账（结缘仍由
     * 事件门控，不白送档位）；绝交锁/心结锁由 gain 自动拒。每名号每世限一次（ws.rankGiftSeen）。
     * 返回 {ok, dir, dist, per, hit, total, reason}。 */
    alignGift: function (ws, pack, D, toRank, now) {
      var rd = SQ.Bonds.rankDirOf(toRank, D);
      if (!rd || rd.dir === 'neutral' || rd.dist < 1) return { ok: false, reason: 'neutral' };
      if (!Array.isArray(ws.rankGiftSeen)) ws.rankGiftSeen = [];
      if (ws.rankGiftSeen.indexOf(toRank) >= 0) return { ok: false, reason: 'dup' };
      var base = D.BOND_ALIGN_GIFT_BASE != null ? D.BOND_ALIGN_GIFT_BASE : 2;
      var cap = D.BOND_ALIGN_GIFT_CAP != null ? D.BOND_ALIGN_GIFT_CAP : 8;
      var per = Math.max(1, Math.min(cap, base * rd.dist));
      var cs = SQ.Bonds.list(pack), bonds = ws.bonds || {};
      var hit = 0, up = 0;
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (c.align !== rd.dir) continue;
        if (!((bonds[c.id] || 0) > 0)) continue;      /* 未相识不白送档位 */
        var r = SQ.Bonds.gain(ws, pack, D, c.id, per, now);
        if (!r.blocked) { hit++; if (r.tierUp) up++; }
      }
      ws.rankGiftSeen.push(toRank);
      while (ws.rankGiftSeen.length > 16) ws.rankGiftSeen.shift();   /* 9 段上界，防脏档膨胀 */
      return { ok: hit > 0, dir: rd.dir, dist: rd.dist, per: per, hit: hit, tierUp: up, reason: hit ? null : 'none' };
    },

    /* ── 好感三渠道（批 B ⑤ 好感度新渠道批 2026-10-06 · 引擎卷 v1.11 §3.2a）──────────────────
     * 起因：诉求⑤「好感度获取方式比较局限」。取证结论——旧正典称「两条正向写口」，实际代码有八条
     * （事件 bond / 同道相吸 / 势力入门 / 势力战同门 / 天骄切磋 / 天骄致歉 / 天道旨意 / 跨世之缘创角），
     * 但其中**玩家可主动、可重复、可指向指定对象**的一条都没有：事件靠抽、势力战与切磋靠触发、
     * 名号与创角一世一次。故补三条主动渠道，三条一律只走下方 gain 唯一正向口（绝交锁 −99 /
     * 心结锁 scars 自动拒入账），且**均不经商店购买**——「侣不可交易」是世界观底线（§3.2）；
     * 渠道 B 送的是**自有丹药**，不是灵石。落盘增量合计 ≈40B：ws.bondVisitAt（A 单锚）+
     * ws.alchemy.giftDay（B 日限）；渠道 C **零新增字段**。
     * 🔧 勘正（GitHub issue #4 · 2026-10-14）：上句里的 `ws.alchemy.giftDay` 已退役，赠丹无日限，
     *    渠道 B 从此**零落盘字段**（理由见下方 giftPill 段注）。
     * 三条日志一律落 cat **'bond'**——同批为日志页新增「道友」分类筛选（view LOG_CATS）；
     * 顺带收口批 A 遗留：同道相吸（xiuxian/index.js）与缘尽赎回（actions.js）早已写 cat 'bond'，
     * 但 LOG_CATS 无此分类，那些日志此前**只能在「全部」里看到、任何分类筛选都取不到**。 */

    /* 渠道 A · 拜访论道：主动、零消耗、全局单冷却（ws.bondVisitAt）。
     * 收益按当前档位递减（BOND_VISIT_BY_TIER 索引 = tierOf 结果 0~4）：**未相识 +3 = 结识**
     * （0 → 3，名录页由剪影转实名——此前结识唯一途径是抽到该人的出身事件，这是本渠道最大价值）；
     * 厌恶区间（−20~−2）同吃 tier 0 档，成为「厌恶 → 相识」的**可主动修复通道**（此前只能靠事件）；
     * 满档 0（reason 'max'）。同向加成：道友 align 与玩家 karma 档位同向 → +BOND_VISIT_ALIGN_BONUS
     * （复用阵营名号联动批的 align 字段，使诉求④的阵营系统持续有回响）。
     * **冷却只在真入账后推进**——被拒的拜访（满档 / 锁 / 冷却外误点）不白吃冷却。
     * 返回 {ok, gain, aff, tier, tierUp, align, met, reason, waitMs}。 */
    visit: function (ws, pack, D, npcId, now, log) {
      var c = SQ.Bonds.byId(pack, npcId);
      if (!c) return { ok: false, reason: 'unknown' };
      now = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
      var cd = D.BOND_VISIT_CD_MS != null ? D.BOND_VISIT_CD_MS : 300000;   /* 兜底 = 表值（2026-10-09 起 5min），不许留第二个事实源 */
      var at = ws.bondVisitAt || 0;
      if (at + cd > now) return { ok: false, reason: 'cooldown', waitMs: at + cd - now };
      if (SQ.Bonds.locked(ws, npcId)) return { ok: false, reason: 'lock' };
      if (SQ.Bonds.scarred(ws, npcId)) return { ok: false, reason: 'scar' };
      var tbl = D.BOND_VISIT_BY_TIER || [3, 3, 2, 1, 0];
      var tierBefore = SQ.Bonds.tierOf(ws, npcId, D);
      var base = tbl[Math.min(Math.max(0, tierBefore), tbl.length - 1)];
      if (!(base > 0)) return { ok: false, reason: 'max' };
      /* 同向加成只对**已相识**生效：未识者阵营未揭（名录格仍是「？」剪影），
       * 给加成会经「+4 而非 +3」把 align 泄漏出去；视图侧 visitGainOf 同口径，两层一致。 */
      var kd = (pack.worldSystems && pack.worldSystems.tierOf) ? pack.worldSystems.tierOf(ws) : 'neutral';
      var sameDir = tierBefore >= 1 && !!(c.align && c.align === kd);
      var n = base + (sameDir ? (D.BOND_VISIT_ALIGN_BONUS != null ? D.BOND_VISIT_ALIGN_BONUS : 1) : 0);
      var r = SQ.Bonds.gain(ws, pack, D, npcId, n, now);
      if (r.blocked) return { ok: false, reason: r.blocked };
      ws.bondVisitAt = now;
      if (log) log('bond', SQ.t('bond.log.visit', {
        name: SQ.t('bond.' + npcId + '.name', null, pack.worldId), n: r.after - r.before
      }, pack.worldId));
      return { ok: true, gain: r.after - r.before, aff: r.after, tier: r.tierAfter,
        tierUp: r.tierUp, align: sameDir,
        /* met = **真跨进相识**（tierBefore < 1 且 tierAfter ≥ 1）。厌恶区间（−20~−2）拜访一次
         * 可能仍停在 tier 0（如 −5 +3 = −2），此时报 met 会让视图弹「由此结识 X」而名录格
         * 仍是「？」剪影——假反馈，故按结果判不按入口判。 */
        met: tierBefore < 1 && r.tierAfter >= 1, reason: null };
    },

    /* 渠道 B · 赠丹：主动、耗**自有丹药**（ws.alchemy.pills 扣 1）、按 `pillDefOf` 的档次给好感——
     * 把炼丹炼器整条产线接进道友系统（此前丹药只有「自服」一个出口）。「以丹会友」。
     * 校验链**全串行**，任一不合即返回且**不扣丹**：有名录 → 有库存 → 非底牌族
     * （自产 once: pozhang / zhenjie + swap: xisui；成品丹自带 nogift，第十七批破障丹入此族）→
     * 有丹方 tier → 非绝交锁 / 心结锁 → 未满档 → gain 未被拒。
     * 丹纹版（key 尾 _rw）收益 ×BOND_GIFT_RUNE_MULT 取整。接近满档时 gain 自带 clamp，
     * 返回值 gain = **实际增量**（可能小于名义值），视图与日志一律显示实际值，不做静默溢出。
     * 🔧 **GitHub issue #4（2026-10-14）撤销日限**：原 `BOND_GIFT_DAILY = 3` 走 `gameDayOf`，
     *    而 **1 游戏日 = 1 现实秒** ⇒ 每次点击都已跨日清零，上限永不生效、屏上恒显「今日 1/3」，
     *    是一个**只会说谎的计数器**（用户裁定：去掉限制、改文案，而不是把计数改成真的能生效）。
     *    真正的节流自始至终是**丹药库存与炼制耗时**（`ws.alchemy.pills` 扣 1，见 §3.9 丹方）。
     * 返回 {ok, gain, aff, tier, tierUp, rune, pillTier, reason}。 */
    giftPill: function (ws, pack, D, npcId, pillKey, now, log) {
      var c = SQ.Bonds.byId(pack, npcId);
      if (!c) return { ok: false, reason: 'unknown' };
      if (typeof pillKey !== 'string' || !pillKey) return { ok: false, reason: 'nopill' };
      now = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
      var al = ws.alchemy;
      if (!al || !al.pills || !(al.pills[pillKey] > 0)) return { ok: false, reason: 'stock' };
      var ALC = D.ALCHEMY || {};
      /* 丹药两族合一（第十七批）：定义一律经 SQ.Alchemy.pillDefOf 取（自产 ap_* / 成品 D.PILLS 一视同仁），
       * 拒因分两档如实报：'once' = 每境界限 1 的双特例，'nogift' = 底牌族（洗髓丹 / 成品破障丹）。
       * 成品丹自带 tier（黄/玄/地），自产丹仍按丹方查档 ⇒ 好感值表一字未动。 */
      var pd = SQ.Alchemy.pillDefOf(D, pillKey);
      if (!pd) return { ok: false, reason: 'nopill' };
      if (pd.nogift) return { ok: false, reason: pd.giftReason };
      var rune = pd.rune, baseId = pd.id;
      var pillTier = pd.tier || null;
      if (!pillTier) (ALC.RECIPES || []).forEach(function (r) { if (r && r.pill === baseId && r.tier) pillTier = r.tier; });
      if (!pillTier) return { ok: false, reason: 'notier' };
      if (SQ.Bonds.locked(ws, npcId)) return { ok: false, reason: 'lock' };
      if (SQ.Bonds.scarred(ws, npcId)) return { ok: false, reason: 'scar' };
      var maxTier = (D.BOND_TIERS || [1, 30, 70, 100]).length;
      if (SQ.Bonds.tierOf(ws, npcId, D) >= maxTier) return { ok: false, reason: 'max' };
      var tbl = D.BOND_GIFT_BY_TIER || { huang: 4, xuan: 6, di: 9, tian: 14 };
      var n0 = tbl[pillTier] != null ? tbl[pillTier] : 0;
      if (!(n0 > 0)) return { ok: false, reason: 'notier' };
      var n = rune ? Math.round(n0 * (D.BOND_GIFT_RUNE_MULT != null ? D.BOND_GIFT_RUNE_MULT : 1.5)) : n0;
      var r = SQ.Bonds.gain(ws, pack, D, npcId, n, now);
      if (r.blocked) return { ok: false, reason: r.blocked };
      al.pills[pillKey] -= 1;                       /* 入账成功才扣丹，杜绝白扣 */
      if (al.pills[pillKey] <= 0) delete al.pills[pillKey];
      if (log) log('bond', SQ.t('bond.log.gift', {
        name: SQ.t('bond.' + npcId + '.name', null, pack.worldId),
        pill: SQ.t((SQ.Alchemy.pillDefOf(D, pillKey) || {}).nameKey ||
          'alchemy.pill.' + pillKey + '.name', null, pack.worldId),   /* 两族名各按本族键族（M4）*/
        n: r.after - r.before
      }, pack.worldId));
      return { ok: true, gain: r.after - r.before, aff: r.after, tier: r.tierAfter, tierUp: r.tierUp,
        rune: rune, pillTier: pillTier, nominal: n, reason: null };
    },

    /* 渠道 C · 同贺：自动、零消耗、**零新增落盘字段**。破境（= 渡劫成功，realm.js 同一结算瞬间）时，
     * 全体已相识（bond ≥1）且非绝交锁 / 非心结锁 / 非在任道侣的道友 +n——旧识为你高兴。
     * 把道友系统与主线进程挂钩：走得越远，故旧越众。道侣排除因其另有双修叙事线（§3.8），不掺。
     * 调用点 = realm.js 破境分支内、pack.recalcDerived **之前**（使本次好感即时进乘区）。
     * 返回 {hit, total, tierUp}。 */
    cheer: function (ws, pack, D, n, now, log) {
      n = Math.floor(Number(n));
      if (!(n > 0)) return { hit: 0, total: 0, tierUp: 0 };
      now = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
      var cs = SQ.Bonds.list(pack), bonds = ws.bonds || {};
      var hit = 0, up = 0, total = 0;
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (SQ.Bonds.isSpouse(ws, c.id)) continue;           /* 在任道侣另有双修叙事，不掺（可多位） */
        if (!((bonds[c.id] || 0) >= 1)) continue;           /* 未相识 / 厌恶不白送档位 */
        var r = SQ.Bonds.gain(ws, pack, D, c.id, n, now);
        if (r.blocked) continue;                            /* 绝交锁 / 心结锁自动拒 */
        hit++; if (r.tierUp) up++;
        total += r.after - r.before;   /* 满档者 gain 不 blocked 但增量 0——按实际累计，不用 hit×n 虚报 */
      }
      if (hit && log) log('bond', SQ.t('bond.log.cheer', { n: hit }, pack.worldId));
      return { hit: hit, total: total, tierUp: up };
    },

    /* bond 入账（唯一正向写口）：绝交锁 −99 与炉鼎心结锁（好感锁死）拒入账；
     * clamp [BOND_MIN(−20 厌恶), BOND_MAX] 取整（负好感可被后续事件拉回正区间）。
     * 返回 {before, after, tierBefore, tierAfter, tierUp, blocked}。 */
    gain: function (ws, pack, D, npcId, n, now) {
      var bonds = ws.bonds || (ws.bonds = {});
      var before = bonds[npcId] || 0;
      var tierBefore = tierOf(before, D);
      if (before === LOCK || SQ.Bonds.scarred(ws, npcId) || !(n > 0)) {
        return { before: before, after: before, tierBefore: tierBefore, tierAfter: tierBefore,
          tierUp: false, blocked: before === LOCK ? 'lock' : (SQ.Bonds.scarred(ws, npcId) ? 'scar' : 'nonpos') };
      }
      var min = D.BOND_MIN != null ? D.BOND_MIN : -20;
      var after = Math.max(min, Math.min(D.BOND_MAX || 100, before + Math.round(n)));
      if (after !== before) bonds[npcId] = after;   /* 值未变不写键：防的是「本来不存在的键被 round 成同值后 materialize 出 0 键」（clamp 到顶时键本就在，不是本条动机） */
      var tierAfter = tierOf(after, D);
      return { before: before, after: after, tierBefore: tierBefore, tierAfter: tierAfter,
        tierUp: tierAfter > tierBefore, blocked: null };
    },

    /* bond 负向入账（系统深化批 A5 · 势力全录卷 §9.1 叛投敌对旧门怨恨唯一写口）：
     * 锁类判定 / clamp / 返回结构与 gain 同口径——绝交锁（−99）与心结锁（scars）豁免不入账，
     * n ≥ 0 拒绝（blocked:'nonneg'）；道侣豁免由调用方判定（join / defect 的 spouse 跳过同款）。 */
    lose: function (ws, pack, D, npcId, n, now) {
      var bonds = ws.bonds || (ws.bonds = {});
      var before = bonds[npcId] || 0;
      var tierBefore = tierOf(before, D);
      if (before === LOCK || SQ.Bonds.scarred(ws, npcId) || !(n < 0)) {
        return { before: before, after: before, tierBefore: tierBefore, tierAfter: tierBefore,
          tierUp: false, blocked: before === LOCK ? 'lock' : (SQ.Bonds.scarred(ws, npcId) ? 'scar' : 'nonneg') };
      }
      var min = D.BOND_MIN != null ? D.BOND_MIN : -20;
      var after = Math.max(min, Math.min(D.BOND_MAX || 100, before + Math.round(n)));
      if (after !== before) bonds[npcId] = after;   /* 与 gain 同口径：clamp 到底时不 materialize 新键 */
      var tierAfter = tierOf(after, D);
      return { before: before, after: after, tierBefore: tierBefore, tierAfter: tierAfter,
        tierUp: tierAfter > tierBefore, blocked: null };
    },
    /* 承继之缘播种（跨世之缘 · 创角事务内一次性「设为」绝对值，不是增量 ⇒ gain 表达不了）。
     * 🆕 耦合缺陷收口批 2026-10-10：视图侧原直写 `nws.bonds[id] = BOND_HEIR_BASE` 收进本函数，
     * 锁判定与 clamp 与其余写口同处一份（创角时 bonds 为空集 ⇒ 行为与改前逐字相同，#287 对照钉住）。
     * 🆕 N23① 收口批 2026-10-10：`ws.heirBond` 也归本函数在**成功分支**里置（原由视图无条件赋值 ⇒
     * 播种被锁/心结拒时「缘定三生」判定源会凭空成立；与 redeem 同语义，视图不再自造规则）。 */
    grantHeir: function (ws, pack, D, npcId, base) {
      var bonds = ws.bonds || (ws.bonds = {});
      var before = bonds[npcId] || 0;
      if (before === LOCK || SQ.Bonds.scarred(ws, npcId)) {
        return { ok: false, before: before, after: before, blocked: before === LOCK ? 'lock' : 'scar' };
      }
      var min = D.BOND_MIN != null ? D.BOND_MIN : -20;
      var after = Math.max(min, Math.min(D.BOND_MAX || 100, Math.round(base)));
      bonds[npcId] = after;
      ws.heirBond = npcId;                    /* N23①：判定源与播种同分支（被拒路径已在上面 return，不会走到这行） */
      return { ok: true, before: before, after: after, blocked: null };
    },

    /* 绝交锁双门槛（引擎卷 v1.10 §3.6 · 缘尽收敛批）：
     *   ① 玩家 karma ≤ D.BOND_LOCK_KARMA_MAX（默认 −400 = 凶名邪修及以上）——素人行恶不至恩断义绝；
     *   ② 该道友当前好感 ≥ D.BOND_LOCK_BOND_MIN（默认 30 = 知交及以上）——未识之人谈不上「缘尽」。
     * gate 传 {karma, D} 才启用门槛（省略 = 无条件锁，仅供既有旁路与断言直测）；
     * 不合条返回 {ok:false, reason:'karma'|'bond'} 且**不写任何状态**，调用方须降级走 lose。 */
    lock: function (ws, npcId, gate) {
      var bonds = ws.bonds || (ws.bonds = {});
      if (gate && gate.D) {
        var kmax = gate.D.BOND_LOCK_KARMA_MAX != null ? gate.D.BOND_LOCK_KARMA_MAX : -400;
        var bmin = gate.D.BOND_LOCK_BOND_MIN != null ? gate.D.BOND_LOCK_BOND_MIN : 30;
        if (!(((ws.karma || 0)) <= kmax)) return { ok: false, reason: 'karma' };
        if (!(((bonds[npcId] || 0)) >= bmin)) return { ok: false, reason: 'bond' };
      }
      bonds[npcId] = LOCK;
      var sps = SQ.Bonds.spousesOf(ws);
      for (var si = sps.length - 1; si >= 0; si--) {
        if (sps[si].npcId !== npcId) continue;
        /* 极端兜底：与在任道侣绝交（现有内容无此组合，防御性解除该位，不设冷却不留心结） */
        sps.splice(si, 1);
      }
      /* 天道编年史钩子（天道设计 §3.3）：陨落/恩断义绝记录（不解耦文案，存 k+v 供奏疏渲染） */
      if (SQ.Tiandao && SQ.Tiandao.onBond) SQ.Tiandao.onBond(ws, 'lock', npcId, Date.now());
      /* 绝交名录（图鉴卷 §4.3 成就「绝而复续」判定源）：锁后若经事件恢复 bond>0 即达成 */
      if (!Array.isArray(ws.juefengIds)) ws.juefengIds = [];
      if (ws.juefengIds.indexOf(npcId) < 0 && ws.juefengIds.length < 64) ws.juefengIds.push(npcId);
      return { ok: true };
    },

    /* 缘尽降级扣减（引擎卷 v1.10 §3.6）：绝交锁不合门槛时的替代结算——好感大跌但**不锁**，
     * 玩家仍可由后续事件拉回。扣减额 = round(|karma分支值| × BOND_DRAIN_K)，clamp [MIN, MAX]。
     * 走 lose 唯一负向写口（绝交锁/心结锁自动豁免）。返回 lose 的结果对象。 */
    drainFor: function (ws, pack, D, npcId, branchKarma, now) {
      var k = D.BOND_DRAIN_K != null ? D.BOND_DRAIN_K : 1.2;
      var lo = D.BOND_DRAIN_MIN != null ? D.BOND_DRAIN_MIN : 6;
      var hi = D.BOND_DRAIN_MAX != null ? D.BOND_DRAIN_MAX : 25;
      var n = Math.round(Math.abs(branchKarma || 0) * k);
      n = Math.max(lo, Math.min(hi, n));
      return SQ.Bonds.lose(ws, pack, D, npcId, -n, now);
    },

    /* 缘尽赎回（引擎卷 v1.10 §3.6 · 唯一解锁写口）：以**遗泽**（meta 跨世通货）赎回一位缘尽道友。
     * 资格：在 ws.juefengIds 内 + 当前为 LOCK + meta.spent['redeem.'+npcId] 未占用（跨世每人限一次，
     *       复用 Legacy.spend 的 itemId 幂等口 → 断线重发不二次扣款）。
     * 效果：LOCK → BOND_REDEEM_AFF（档 1 相识）；**留在 juefengIds**（历史名录，使 achv_juefeng
     *       「绝而复续」随之真可达）、入 ws.redeemedIds（每世幂等挡）；
     *       置 ws.heirBond = npcId（成就「缘定三生」achv_kuashi 判定源，此前**全代码零写入 = 死成就**）；
     *       juefengIds 中其余人若 bond > 0 即「绝而复续」achv_juefeng（既有条件，本批起真可达）。
     * 遗泽恒等式 #197 由 Legacy.spend 内部维护（Σspent 语义不变）。
     * 返回 {ok, reason?, cost?, aff?}。 */
    redeem: function (ws, pack, D, meta, npcId, now) {
      if (!SQ.Bonds.locked(ws, npcId)) return { ok: false, reason: 'notlocked' };
      if ((ws.juefengIds || []).indexOf(npcId) < 0) return { ok: false, reason: 'notlisted' };
      if ((ws.redeemedIds || []).indexOf(npcId) >= 0) return { ok: false, reason: 'dup' };
      if (!meta || !SQ.Legacy || !SQ.Legacy.spend) return { ok: false, reason: 'nometa' };
      var cost = D.BOND_REDEEM_COST != null ? D.BOND_REDEEM_COST : 30;
      var sp = SQ.Legacy.spend(meta, 'redeem.' + npcId, cost, now);
      if (!sp || !sp.ok) return { ok: false, reason: (sp && sp.reason) || 'spend' };
      var aff = D.BOND_REDEEM_AFF != null ? D.BOND_REDEEM_AFF : 10;
      ws.bonds = ws.bonds || {};
      ws.bonds[npcId] = Math.max(1, Math.min(D.BOND_MAX || 100, aff));
      /* juefengIds 是**历史名录**（绝交发生过这件事），赎回不删除——保留才能让成就「绝而复续」
       * （achv_juefeng：绝交锁后经事件恢复 bond>0，此前 codex.js 注为「内容池无解锁路径」的死成就）
       * 随赎回真可达；重复赎回由 redeemedIds + Legacy.spend 的 itemId 幂等双挡。 */
      if (!Array.isArray(ws.redeemedIds)) ws.redeemedIds = [];
      if (ws.redeemedIds.length < 64) ws.redeemedIds.push(npcId);
      ws.heirBond = npcId;                          /* 跨世之缘（achv_kuashi 首次真可达）*/
      if (SQ.Tiandao && SQ.Tiandao.onBond) SQ.Tiandao.onBond(ws, 'redeem', npcId, now || Date.now());
      return { ok: true, cost: cost, aff: ws.bonds[npcId], tier: tierOf(ws.bonds[npcId], D) };
    },

    /* ── 结缘双修（引擎卷 §3.8 + v1.4 口径）── */

    /* 形态 = karma 档位映射：right → yinyang / neutral → huzhu / evil → luding */
    formByTier: function (ws, pack, D) {
      var kt = pack.worldSystems && pack.worldSystems.tierOf ? pack.worldSystems.tierOf(ws) : 'neutral';
      var forms = D.SPOUSE_FORMS || {};
      for (var f in forms) if (forms[f].tier === kt) return f;
      return 'huzhu';
    },

    /* 提亲资格：候选 + 满档 + **这一位**尚未结缘 + 无心结锁 + 冷却已过。
     * 多道侣（册一百二十三批）：不再要求「全局唯一」——已有别的道侣照样可提；
     * 只拦同一人重复提（reason 仍沿用 occupied，屏上「已有道侣在身」对同一位仍为真）。 */
    canPropose: function (ws, pack, D, npcId, now) {
      var c = SQ.Bonds.byId(pack, npcId);
      if (!c) return { ok: false, reason: 'unknown' };
      if (c.category !== 'spouse') return { ok: false, reason: 'notspouse' };
      if (SQ.Bonds.scarred(ws, npcId)) return { ok: false, reason: 'scar' };
      if ((ws.bonds || {})[npcId] !== (D.BOND_MAX || 100)) return { ok: false, reason: 'affinity' };
      if (SQ.Bonds.isSpouse(ws, npcId)) return { ok: false, reason: 'occupied' };
      if ((ws.spouseCdUntil || 0) > now) return { ok: false, reason: 'cooldown' };
      return { ok: true, form: SQ.Bonds.formByTier(ws, pack, D) };
    },

    propose: function (ws, pack, D, npcId, now, log) {
      var chk = SQ.Bonds.canPropose(ws, pack, D, npcId, now);
      if (!chk.ok) return chk;
      var sps = ws.spouses || (ws.spouses = []);
      if (SQ.Bonds.isSpouse(ws, npcId)) return { ok: false, reason: 'occupied' };   /* 防御：canPropose 已拦 */
      sps.push({ npcId: npcId, form: chk.form, since: now });
      var form = (D.SPOUSE_FORMS || {})[chk.form] || {};
      if (form.karmaCost) {
        /* 炉鼎采补代价①：结缘一次性 karmaEventScore −20 入账（采补之举赖不掉；karma 随后覆盖式重算） */
        ws.karmaEventScore = (ws.karmaEventScore || 0) - form.karmaCost;
      }
      if (log) log('sys', SQ.t('bond.log.propose', {
        name: SQ.t('bond.' + npcId + '.name', null, pack.worldId),
        form: SQ.t('bond.spouse.form.' + chk.form, null, pack.worldId)
      }, pack.worldId));
      /* 天道编年史钩子（天道设计 §3.3）：结缘记录入编年史 */
      if (SQ.Tiandao && SQ.Tiandao.onBond) SQ.Tiandao.onBond(ws, 'marry', npcId, now);
      return { ok: true, form: chk.form };
    },

    /* 维持检查（recalcDerived 内调用，karma 每次覆盖式重算后）：
     * 逐位判定——yinyang 跌破正道档 → 该位解除 + 7 天全局提亲冷却；luding 回升出魔道档 →
     * 该位解除 + 心结锁；huzhu 永不自动解除（v1.4 口径1）。同形态共享维持条件 ⇒ 整批同时散。
     * 解除记录写 spouseLogs（数组）供视图按 at|npcId 键控消费叙事（v1.4 口径4）。
     * 返回本次解除的数组（无解除 = null）。 */
    maintain: function (ws, pack, D, now) {
      var sps = SQ.Bonds.spousesOf(ws);
      if (!sps.length) return null;
      var kt = pack.worldSystems && pack.worldSystems.tierOf ? pack.worldSystems.tierOf(ws) : 'neutral';
      var keep = [], removed = [];
      sps.forEach(function (sp) {
        var def = (D.SPOUSE_FORMS || {})[sp.form] || {};
        var reason = null;
        if (sp.form === 'yinyang' && kt !== 'right') reason = 'karma';
        else if (sp.form === 'luding' && kt !== 'evil') reason = 'redemption';
        if (!reason) { keep.push(sp); return; }
        if (reason === 'karma') ws.spouseCdUntil = now + (def.cooldownMs || 604800000);
        else {
          ws.scars = ws.scars || {};
          ws.scars[sp.npcId] = now;                /* 心结锁三义：禁护法 / 好感锁死 / 禁再提亲 */
        }
        removed.push({ npcId: sp.npcId, form: sp.form, reason: reason, at: now });
      });
      if (!removed.length) return null;
      ws.spouses = keep;
      ws.spouseLogs = (ws.spouseLogs || []).concat(removed);
      while (ws.spouseLogs.length > 16) ws.spouseLogs.shift();   /* 防御硬截：本世同时最多 14 位 */
      return removed;
    },

    /* 冥佑（楚老拐，四柱卷 §五）：档 ≥2 每 7 天授 1 层 eventShield（层时长 14 天，场上 ≤2 层）。
     * 计日锚 chuBlessAt 首次达标时初始化（不追溯）；层满时锚点顺延不积存；档跌破停授不清存量。
     * 在 idle.settle（在线 tick / 离线结算同一入口）内调用。返回本次授予层数。 */
    blessTick: function (ws, pack, D, now, log) {
      var cfg = D.BOND_SHIELD;
      if (!cfg || !SQ.Events || !SQ.Events.pushBuff) return 0;
      var tier = SQ.Bonds.tierOf(ws, cfg.npc, D);
      if (tier < cfg.minTier) return 0;
      if (!ws.chuBlessAt) { ws.chuBlessAt = now; return 0; }
      function layers() {
        var n = 0;
        (ws.buffs || []).forEach(function (b) {
          if (b.field === 'eventShield' && b.source === cfg.npc && b.until > now) n++;
        });
        return n;
      }
      var granted = 0;
      while (now - ws.chuBlessAt >= cfg.everyMs) {
        if (layers() + granted >= cfg.maxLayers) {
          ws.chuBlessAt = now;                     /* 层满不积存：锚点顺延 */
          break;
        }
        SQ.Events.pushBuff(ws, 'eventShield', 1, now + cfg.layerMs, cfg.npc);
        granted++;
        ws.chuBlessAt += cfg.everyMs;
      }
      if (granted && log) log('sys', SQ.t('bond.log.bless', {
        name: SQ.t('bond.' + cfg.npc + '.name', null, pack.worldId), n: granted
      }, pack.worldId));
      return granted;
    }
  };
})();
