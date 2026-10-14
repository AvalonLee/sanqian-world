/* systems/gear.js — G4 装备（法宝）：生成 / 评分 / 佩戴要求 / 自动择优 / 库藏阁 / 炼化
 * 规则源：数值详设 §三（含 §3.5 佩戴要求、§3.6 特殊词条）+ 复核报告修订（缩放/炼化）。
 * 生成即定格：reqs 与 special 在 roll 时确定，复检不重算（验收 4.11 #97）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var randInt = SQ.util.randInt;   /* C1：统一至 assets/util.js */
  function randF(a, b, dp) { var v = a + Math.random() * (b - a); return Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp); }
  var pickPairs = SQ.util.pickPairs;   /* C2：统一至 assets/util.js */

  /* 炼化返还入账（财柱总账 in.refine · 引擎卷 §4.1）：一律按**实际增量**记账，
   * 与各系统同一口径，保证恒等式 100 + Σin − Σout === stones 零漂移（#113）。 */
  function addRefine(ws, v) {
    if (!v) return 0;
    var s0 = ws.stones;
    ws.stones += v;
    return SQ.Ledger.note(ws, 'in', 'refine', ws.stones - s0);
  }

  /* 库藏法器的身份指纹（第廿六批）：随机生成的实例没有稳定 id ⇒ 用「决定它是哪件」的属性全集。
     坊市货架 / 特席的 gear 分支同走此口（SQ.Shop.goodSig 内部调用）——不留第二套抄本。 */
  function itemSig(it) {
    if (!it) return '';
    return [it.name, it.slot, it.tier, it.atk, it.resist || 0, it.qiBonus || 0,
      (it.special || ''), it.exclusive ? 1 : 0, (it.reqs || {}).realm || 0,
      (it.attrValue || {}).attr || '', (it.attrValue || {}).value || 0].join('~');
  }

  SQ.Gear = {
    /* 装备命名（世界设定 §5.1：材质 × 器形） */
    nameOf: function (slot, worldId) {
      var pool = (SQ.NAMES[worldId] || SQ.NAMES.common || {}).gear;
      if (!pool) return 'gear.' + slot;
      var m = pool.materials[Math.floor(Math.random() * pool.materials.length)];
      return m + pool.forms[slot];
    },

    /* 品阶掷判：秘境权重 × gearLuck 抬升（每档 ×(1+gearLuck×档位)）；tierMin 以下权重清零。
     * luckAdd（系统深化批 A4 · 数值详设 §2.5）：区域词缀 gearLuckAdd 局部加算——只作用于
     * 击杀掉落，不进全局 mods.sum.gearLuck（词缀乘区纪律）。 */
    rollTier: function (D, zoneIdx, mods, tierMin, luckAdd) {
      var w = D.ZONES[zoneIdx].drops.slice();
      var luck = (mods.sum.gearLuck || 0) + (luckAdd || 0);
      var pairs = [];
      for (var i = 0; i < w.length; i++) {
        var wi = w[i] * (1 + luck * i);
        if (tierMin != null && i < tierMin) wi = 0;
        if (wi > 0) pairs.push([wi, i]);
      }
      if (!pairs.length) pairs = [[1, tierMin || 0]];
      return pickPairs(pairs);
    },

    /* 生成一件装备（zoneIdx 决定 atk 缩放与品阶权重）
     * opts: {tierMin, slot, align, tierUp, tierUpChance, alignW, source}
     *  - alignW = 阵营分布权重 {neutral,right,evil}（掉落走 ALIGN_EFFECTS.dropAlignW 档位位移，
     *    数值详设 §3.3 v1.12；指定 align 的定向产出不受位移影响）
     *  - tierUpChance = 品阶上浮概率（魔道档 0.40，「福缘凝华」，v1.13 概率化；触发时 item.tierUp=true 供 toast）
     *  - source = 获得溯源 {type:'zone'|'event'|'shop'|'exclusive', ref}（工程规范 §3.2 v2.3，生成时定格） */
    roll: function (ws, pack, D, zoneIdx, mods, opts) {
      opts = opts || {};
      var wid = pack.worldId;
      var tier = opts.tier != null ? opts.tier : SQ.Gear.rollTier(D, zoneIdx, mods, opts.tierMin, opts.gearLuckAdd);
      /* tierUp：true = 上浮一档（通关必掉）；数值 = 上浮 N 档（域主战两档，数值详设 §2.6），封顶仙品 */
      if (opts.tierUp) tier = Math.min(D.GEAR_TIERS.length - 1, tier + (typeof opts.tierUp === 'number' ? opts.tierUp : 1));
      var tierUpd = false;
      if (!opts.tierUp && opts.tierUpChance > 0 && Math.random() < opts.tierUpChance) {
        var up = Math.min(D.GEAR_TIERS.length - 1, tier + 1);
        if (up !== tier) { tier = up; tierUpd = true; }
      }
      var T = D.GEAR_TIERS[tier];
      var slot = opts.slot || D.GEAR_SLOTS[Math.floor(Math.random() * D.GEAR_SLOTS.length)];
      var aw = opts.alignW || D.ALIGN_DROP_W;
      var align = opts.align || pickPairs([
        [aw.neutral, 'neutral'], [aw.right, 'right'], [aw.evil, 'evil']
      ]);
      var scale = Math.max(D.REALMS[D.ZONES[zoneIdx].unlock].power / 100, 1);
      var atk = randInt(T.atk[0], T.atk[1]) * scale;
      var item = {
        slot: slot, name: SQ.Gear.nameOf(slot, wid), alignment: align, tier: tier,
        atk: Math.round(atk * (align === 'evil' ? D.EVIL_STAT_MULT : 1)),
        reqs: { realm: Math.max(0, T.req) }, special: null,
        source: opts.source || null, tierUp: tierUpd || undefined
      };
      if (T.qiBonus) {
        item.qiBonus = randF(T.qiBonus[0], T.qiBonus[1], 3) * (align === 'evil' ? D.EVIL_STAT_MULT : 1);
        item.qiBonus = Math.round(item.qiBonus * 1000) / 1000;
      }
      var prime = false;
      if (T.resist) {
        var r = randF(T.resist[0], T.resist[1], 0);
        if (r >= T.resist[1] - (T.resist[1] - T.resist[0]) * D.PRIME_TOP_PCT) prime = true; /* 前 10% 极品 */
        item.resist = Math.round(r * (align === 'evil' ? D.EVIL_STAT_MULT : 1));
      }
      if (T.attr) {
        var aff = D.ATTR_AFFINITY[slot];
        var attr = pickPairs([[aff.jing, 'jing'], [aff.qi, 'qi'], [aff.shen, 'shen']]);
        var av = randInt(T.attr[0], T.attr[1]);
        if (av >= T.attr[1] - (T.attr[1] - T.attr[0]) * D.PRIME_TOP_PCT) prime = true;
        item.attrValue = { attr: attr, value: Math.round(av * (align === 'evil' ? D.EVIL_STAT_MULT : 1)) };
      }
      if (prime && T.req >= 0) item.reqs.realm += 1; /* 神兵认主：极品追加 +1 阶（生成时定格） */
      if (prime) item.prime = true; /* v2.9 登记（批 2·B5）：旗标随件持久，库藏阁 ※ 标注消费 */
      if (T.specialP > 0 && Math.random() < T.specialP) {
        item.special = pickPairs(D.GEAR_SPECIALS.map(function (s) { return [s.weight, s.id]; }));
        /* 特殊词条不追加佩戴要求（§3.5） */
      }
      if (opts.special && D.GEAR_SPECIAL_EFFECTS[opts.special]) item.special = opts.special; /* 事件定向词条（如剑壁古剑 sword_heart） */
      return item;
    },

    /* 评分（§3.4）：score = (atk + qiBonus×100 + resist×0.5 + attrValue×3) × 特殊系数1.15 */
    scoreOf: function (it) {
      if (!it) return -1;
      var s = (it.atk || 0) + (it.qiBonus || 0) * 100 + (it.resist || 0) * 0.5 +
        (it.attrValue ? it.attrValue.value * 3 : 0);
      return Math.round(s * (it.special ? 1.15 : 1) * 100) / 100;
    },

    canWear: function (it, ws) {
      return it.special === 'ignore_req' || ws.realm >= (it.reqs ? it.reqs.realm : 0);
    },

    /* 库藏阁容量单一事实源（道具处置打磨包）：基础 STASH_CAP + on_stash_cap 挂点扩容
     * （法宝/词条扩容走同挂点，见工程规范 §2.2 挂点白名单）。 */
    stashCap: function (ws, D, mods) {
      var add = (mods && mods.hooks && mods.hooks.on_stash_cap) || 0;
      return D.STASH_CAP + add;
    },

    /* 手动炼化（道具处置打磨包）：库藏阁第 idx 件 → 灵石；独占豁免（不参与炼化，无灵石流动）。
     * 返还与自动溢出同口径（refineValue），入账 in.refine，落 gear 日志。
     * 返回 {ok, item?, value?, reason?}；reason ∈ index（越界）/ exclusive（独占豁免）。 */
    itemSig: itemSig,
    salvage: function (ws, pack, D, mods, idx, log, expect) {
      var it = (ws.stash || [])[idx];
      if (!it) return { ok: false, reason: 'index' };
      if (it.exclusive) return { ok: false, reason: 'exclusive' };
      /* 炼化是**销毁性**操作，而 CONFIRM 无阻塞：弹窗期间战斗掉落 push 库藏、溢出还会炼化别件
       * ⇒ 序号整体位移，旧写法会把玩家没点的那件炼掉。视图带回开弹窗时的指纹，对不上就不动手。 */
      if (expect && itemSig(it) !== expect) return { ok: false, reason: 'stale' };
      ws.stash.splice(idx, 1);
      var v = addRefine(ws, SQ.Gear.refineValue(it, ws, D, mods));
      if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.salvage', it, v));
      return { ok: true, item: it, value: v };
    },

    /* 炼化返还（§3.4 修订）：品阶固定表 × (1+境界索引×0.5) × (1+炼余回生) */
    refineValue: function (it, ws, D, mods) {
      var base = D.GEAR_TIERS[it.tier].refine;
      var huijin = (mods && mods.hooks && mods.hooks.huijin) || 0;
      /* 墨宝（言书生 on_refine，批 3）：与炼余回生同通道加算 */
      var yanmo = (mods && mods.bonds && mods.bonds.refine) || 0;
      /* 法宝·百草炼丹炉（hook:on_refine，法宝全录 H11）：同通道加算 */
      var h11 = (mods && mods.hooks && mods.hooks.on_refine) || 0;
      return Math.round(base * (1 + ws.realm * 0.5) * (1 + huijin + yanmo + h11));
    },

    /* 百器录入录（数值详设 §3.7：特殊词条按 special id、独占按 'ex_'+id；炼化不除名，重复不刷新首获 ts） */
    recordSeen: function (ws, item) {
      if (!item) return;
      ws.gearSeen = ws.gearSeen || {};
      var now = Date.now();
      if (item.exclusive) {
        var kx = 'ex_' + item.exclusive;
        if (ws.gearSeen[kx] == null) ws.gearSeen[kx] = now;
      } else if (item.special) {
        if (ws.gearSeen[item.special] == null) ws.gearSeen[item.special] = now;
      }
    },

    /* 独占法宝授予（专属事件池 v2.0.1 §4.2 + 数值详设 §3.2 v1.12）：
     * atk = atkBase × max(P[最高首通秘境解锁境界]/100, 1) 一次定格（此后不重缩放）；
     * 佩戴要求定格无极品追加；入 gearSeen；槽位被占 → 旧件（非独占）炼化、独占直接上身穿。 */
    grantExclusive: function (ws, pack, D, mods, gearId, source, log) {
      var def = (D.EXCLUSIVE_GEAR || {})[gearId];
      if (!def) return null;
      var maxCleared = -1;
      (ws.cleared || []).forEach(function (z) { if (z > maxCleared) maxCleared = z; });
      var scale = 1;
      if (maxCleared >= 0 && D.ZONES[maxCleared]) {
        scale = Math.max(D.REALMS[D.ZONES[maxCleared].unlock].power / 100, 1);
      }
      var item = {
        slot: def.slot, name: SQ.t('gear.ex.' + gearId, null, pack.worldId), alignment: def.alignment, tier: def.tier,
        atk: def.atkBase ? Math.round(def.atkBase * scale) : 0,
        reqs: { realm: D.GEAR_TIERS[def.tier].req }, special: def.special || null,
        exclusive: gearId, source: source || { type: 'exclusive', ref: gearId }
      };
      if (def.qiBonus) item.qiBonus = def.qiBonus;
      if (def.resist) item.resist = def.resist;
      if (def.attrValue) item.attrValue = { attr: def.attrValue.attr, value: def.attrValue.value };
      SQ.Gear.recordSeen(ws, item);
      var cur = ws.gear[item.slot];
      if (cur && !cur.exclusive) {
        /* issue #2 开关也管这一口：授予独占时换下的普通件，关炼化则先入库藏阁（库满才回落炼化）*/
        if (ws.gearAutoRefine === false && ws.stash.length < SQ.Gear.stashCap(ws, D, mods)) {
          ws.stash.push(cur);
          if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.kept', cur, 0));
        } else {
          var rv = addRefine(ws, SQ.Gear.refineValue(cur, ws, D, mods));
          if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.replace', item, rv));
        }
      } else if (log) {
        log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.replace', item, 0));
      }
      ws.gear[item.slot] = item;
      return item;
    },

    /* 自动择优（§3.4 + §3.5 要求前置 + v1.12 独占豁免）：
     * 不可佩戴 → 库藏阁（满 12 炼化最低分，独占豁免炼化且不作牺牲品）；
     * 当前槽位是独占 → 随机件不顶换（返回 exclusive_hold，UI 走手动替换 CONFIRM，交互说明 §4.4）；
     * 可佩戴且 score 更高 → 替换（旧件炼化）；否则炼化。
     * 🔧 GitHub issue #2（2026-10-14）新增玩家开关 `ws.gearAutoRefine`（缺省 true = 上面的旧行为）：
     *    关 ⇒ 「替换下来的旧件」与「不如在件的新件」都**先入库藏阁**，不自动炼化。
     *    shortcut: 库藏阁满时仍回落炼化——STASH_CAP 是落盘容量红线，不为开关放开；要真零炼化得先扩容。
     * 返回 {action, gained, refined?, kept?, item?} 供日志/toast。 */
    autoEquip: function (ws, pack, D, mods, item, log) {
      var gained = 0;
      SQ.Gear.recordSeen(ws, item);
      if (!SQ.Gear.canWear(item, ws)) {
        ws.stash.push(item);
        var act = { action: 'stash', gained: 0, item: item };
        var cap = SQ.Gear.stashCap(ws, D, mods);
        while (ws.stash.length > cap) {
          var minI = -1;
          for (var i = 0; i < ws.stash.length; i++) {
            if (ws.stash[i].exclusive) continue; /* 独占豁免溢出炼化（数值详设 §3.4） */
            if (minI < 0 || SQ.Gear.scoreOf(ws.stash[i]) < SQ.Gear.scoreOf(ws.stash[minI])) minI = i;
          }
          if (minI < 0) break; /* 全是独占 → 容量豁免（极端兜底，不炼化） */
          var victim = ws.stash.splice(minI, 1)[0];
          var gv = addRefine(ws, SQ.Gear.refineValue(victim, ws, D, mods));
          gained += gv;
          act.refined = victim; act.refinedValue = gv;
          if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.stashfull', victim, gv));
        }
        if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.stash', item, 0));
        return act;
      }
      var cur = ws.gear[item.slot];
      if (cur && cur.exclusive && !item.exclusive) {
        /* 独占在位：随机件不自动顶换 → 入库藏阁等待手动替换（UI toast + CONFIRM） */
        ws.stash.push(item);
        if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.exhold', item, 0));
        return { action: 'exclusive_hold', gained: 0, item: item };
      }
      if (cur && SQ.Gear.scoreOf(item) > SQ.Gear.scoreOf(cur)) {
        ws.gear[item.slot] = item;
        /* issue #2：关自动炼化 ⇒ 旧件入库藏阁（有库位时），库满才回落炼化 */
        if (ws.gearAutoRefine === false && ws.stash.length < SQ.Gear.stashCap(ws, D, mods)) {
          ws.stash.push(cur);
          if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.kept', cur, 0));
          return { action: 'replace', gained: 0, kept: cur, item: item };
        }
        var rv = addRefine(ws, SQ.Gear.refineValue(cur, ws, D, mods));
        if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.replace', item, rv));
        return { action: 'replace', gained: rv, item: item };
      }
      if (!cur) {
        ws.gear[item.slot] = item;
        if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.replace', item, 0));
        return { action: 'equip', gained: 0, item: item };
      }
      if (item.exclusive) {
        /* 独占 vs 独占（同槽仅两件可能）：手动语义，默认保留当前、新件入库 */
        ws.stash.push(item);
        if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.stash', item, 0));
        return { action: 'stash', gained: 0, item: item };
      }
      /* issue #2：关自动炼化 ⇒ 不如在件的新件也先入库藏阁（有库位时），库满才回落炼化 */
      if (ws.gearAutoRefine === false && ws.stash.length < SQ.Gear.stashCap(ws, D, mods)) {
        ws.stash.push(item);
        if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.keep', item, 0));
        return { action: 'stash', gained: 0, item: item };
      }
      var v2 = addRefine(ws, SQ.Gear.refineValue(item, ws, D, mods));
      if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.refine', item, v2));
      return { action: 'refine', gained: v2 };
    },

    /* 独占法宝手动替换（批 2·B5 / 交互说明 §4.4 ★）：独占不参与自动择优，替换须亲手确认。
     * 语义：库藏阁第 idx 件穿上身，旧件（若独占）入库藏阁锁形格——豁免溢出炼化，无灵石流动
     * （独占永不炼化 ⇒ 不产生 ledger 记账）。仅当任一侧是独占才开放此操作（随机件之间仍走自动择优）。
     * 返回 {ok, item?, old?, reason?}；reason ∈ wear（境界不足）/ exclusive（两侧均非独占）/ index（越界）。 */
    manualSwap: function (ws, pack, D, mods, idx, log) {
      var it = (ws.stash || [])[idx];
      if (!it) return { ok: false, reason: 'index' };
      var cur = ws.gear[it.slot];
      if (!it.exclusive && !(cur && cur.exclusive)) return { ok: false, reason: 'exclusive' };
      if (!SQ.Gear.canWear(it, ws)) return { ok: false, reason: 'wear' };
      ws.stash.splice(idx, 1);
      if (cur) ws.stash.push(cur);       /* 一出一进，容量恒等，不触发溢出炼化 */
      ws.gear[it.slot] = it;
      if (log) log('gear', SQ.Gear.itemLog(ws, pack, 'toast.gear.exswap', it, 0));
      return { ok: true, item: it, old: cur || null };
    },

    /* 境界提升后的库藏阁复检：达标件重新参与择优（§3.4） */
    recheckStash: function (ws, pack, D, mods, log) {
      var changed = false;
      for (var i = ws.stash.length - 1; i >= 0; i--) {
        if (SQ.Gear.canWear(ws.stash[i], ws)) {
          var it = ws.stash.splice(i, 1)[0];
          SQ.Gear.autoEquip(ws, pack, D, mods, it, log);
          changed = true;
        }
      }
      return changed;
    },

    /* toast/日志文案（词表模板 + 世界词） */
    itemLog: function (ws, pack, tplKey, item, n) {
      var wid = pack.worldId;
      return SQ.t(tplKey, {
        name: item.name + (item.special ? '·' + SQ.t('gear.special.' + item.special, null, wid) : ''),
        tier: SQ.t('gear.tier.' + item.tier, null, wid),
        n: SQ.fmt(n),
        cur: SQ.t('resource.currency', null, wid)
      }, wid);
    }
  };
})();
