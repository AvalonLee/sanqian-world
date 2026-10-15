/* systems/events.js — G7 奇遇引擎 v2：在线时钟 + 两级抽取 + 三分支抉择制 + 八类判定 DSL
 * 规则源：《奇遇事件池设计》v1.9（§三 在线时钟分钟段/20 分钟硬保底、§四 离线零奇遇、
 *   §五 三分支抉择制、§六 判定 DSL 与失败守则）+ 数值详设 §8.1 ALIGN_EFFECTS
 *   （natureW/tierW/eventRateMult/checkDcMult）+ 专属事件池 v2.0.1（独占通道 §4.2、独占签名 §4.1）。
 * 内容池为平铺数组：events/common.js（通用 24）与 worlds/{id}/events.js（专属 36）——引擎只读词条。
 * 词条 schema：{id, tier:'ren'|'di'|'tian', nature:'good'|'bad', special?, weight, once?,
 *   cooldownHours?|cd?, cond?, choices:{right:{karma,gain:[],check?}, evil:{…}, neutral:{…}}}
 * gain 词条（池设计 §五）：{type:'stones'|'qi'|'qiPct'|'buff'|'dropGear'|'exclusiveGear'|
 *   'exclusiveArt'|'artsProgress'|'attrBonus'|'tribNext'|'eventShield'|'bond'|'talentSwap', …}；数值一律 [min,max] 区间。
 * 判定 DSL（池设计 §六）：attr/karma/align/stones/qi/art/gear/power 八类；check 为数组 = 判定链全过才算成。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  function rollRange(v) {
    if (Array.isArray(v)) return v[0] + Math.random() * (v[1] - v[0]);
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
  }

  /* 百分比显示取整（体验批）：百分比经 ×100 后仍会带浮点尾数
   * （如 −0.141×100 = −14.099999999999998），统一保留 ≤2 位小数再入文案，
   * 结算与展示同源（只改显示，不动实扣）。 */
  function pct(x) {
    var n = Math.round((x || 0) * 100) / 100;
    return Object.is(n, -0) ? 0 : n;
  }

  /* ── 奇遇 buff 时长曲线（体验批）──────────────────────────────
   * 口径：设计时长（词条 hours）只作上限，硬顶 BUFF_CURVE_CAP_H；u⁴ 向短端偏置 →
   * 约 76% 落在 0.5~1h、长时长概率递减，下限 0.5h（与旧 0.5h 战创同底）。
   * 只作用于**奇遇来源**的 buff/debuff（gainToEff / resolveEff 两个掷点）；
   * 丹药、宗门调遣、破境、天罚、势力声威等 pushBuff 直调通道不受影响。 */
  var BUFF_CURVE_CAP_H = 2;
  function rollBuffHours(designed) {
    var cap = Math.min(designed != null ? designed : BUFF_CURVE_CAP_H, BUFF_CURVE_CAP_H);
    if (!(cap > 0.5)) return Math.round(cap * 10) / 10;
    var h = 0.5 + (cap - 0.5) * Math.pow(Math.random(), 4);
    return Math.round(h * 10) / 10;
  }

  /* 效果字典区间预掷定（failE 专用）：结算与结果页展示共用同一份实值，
   * 避免「先展示区间、后另掷一次」造成显示与实扣不一致。 */
  function resolveEff(e) {
    if (!e) return null;
    var o = {};
    for (var k in e) o[k] = e[k];
    if (e.stones != null) o.stones = Math.round(rollRange(e.stones));
    if (e.qi != null) o.qi = Math.round(rollRange(e.qi));
    if (e.qiPct != null) o.qiPct = Math.round(rollRange(e.qiPct) * 1000) / 1000;
    if (e.qiPctRaw != null) o.qiPctRaw = Math.round(rollRange(e.qiPctRaw) * 1000) / 1000;
    if (e.buff) {
      o.buff = {
        field: e.buff.field, mult: e.buff.mult,
        hours: rollBuffHours(rollRange(e.buff.hours != null ? e.buff.hours : e.buff.h))
      };
    }
    if (e.eventShield != null) o.eventShield = rollRange(e.eventShield);
    if (e.attrBonus) o.attrBonus = { attr: e.attrBonus.attr, n: Math.round(rollRange(e.attrBonus.n)) };
    if (e.tribNext != null) o.tribNext = Math.round(rollRange(e.tribNext) * 1000) / 1000;
    return o;
  }

  /* buff 入列（事件池 §十三.5 勘误②）：同字段同向不叠加——保留最强一条 + 时长取较长者。
   * v1.5 在线时钟把奇遇密度从「日均 2~3 条」抬到 ≈6.5 条/小时，而 buff 时长多为 12~48h；
   * 若仍无限追加，同乘区加算（数值详设 §八「buffΣ」）会让临时增益随在线时长无界增长——
   * 实测 12h 在线后正道产出被 buff 推高 +54~62%，事件通道压过挂机通道并反转阵营节奏主轴。
   * 正负号分开判：同字段的增益与减益各留最强一条，互不吞掉。
   * eventShield 例外——它是「层」语义（护法/冥佑可叠层，四柱卷 §五），必须逐条并存。 */
  function pushBuff(ws, field, mult, until, source) {
    var list = ws.buffs || (ws.buffs = []);
    if (field === 'eventShield') {
      /* source 标记层的来源（冥佑 = 'chu'，批 3）：计数与展示用，消耗不分来源（先到先耗） */
      var sb = { field: field, mult: mult, until: until };
      if (source) sb.source = source;
      list.push(sb);
      return sb;
    }
    var sign = mult < 0 ? -1 : 1;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.field !== field || (b.mult < 0 ? -1 : 1) !== sign) continue;
      if (Math.abs(mult) > Math.abs(b.mult)) b.mult = mult;
      b.until = Math.max(b.until || 0, until);
      /* 来源溯源（系统深化批 A5 · 势力全录卷 §7.3/§8.2「记来源，供浮层溯源显示」）：
       * 调用方显式传入才覆写；未传来源的旧通道（丹药/奇遇）保持原值不抹除 */
      if (source) b.source = source;
      return b;
    }
    var nb = { field: field, mult: mult, until: until };
    if (source) nb.source = source;
    list.push(nb);
    return nb;
  }

  /* 缩放锚（事件池 §十三.8 v1.11 勘误）：两条曲线分开挂——
   * 灵石 → 秘境刷图收入曲线（ZONES[境界].stones × K），使「奇遇/刷图」比值与境界无关；
   *   下限 1.0 保住内容文档「表内为练气期基准值」的语义（练气/筑基仍按词条面额结算）；
   * 修为 → 三次方（旧口径），其量纲失控另由 EVENT_QI_PCT_HOUR_CAP 兜底。
   * 旧口径两者共用 (1+境界)³，与刷图曲线（每境界 ×2.5~2.7）不同源，是灵石经济失衡的根因。 */
  function stoneScaleOf(ws, D) {
    var zi = Math.min(Math.max(0, ws.realm || 0), D.ZONES.length - 1);
    var z = D.ZONES[zi];
    return Math.max(1, (D.EVENT_STONE_ZONE_K || 0) * ((z && z.stones) || 0));
  }
  function qiScaleOf(ws, D) {
    return Math.pow(1 + (ws.realm || 0), D.SCALE_CUBE_POW != null ? D.SCALE_CUBE_POW : 3);
  }

  /* 灵石出入账（财柱总账 · 引擎卷 §4.1）：正 → in.event、负 → out.event_loss；
   * 一律按**实际增量**记（Math.max(0,…) 钳位之后），保证恒等式 100+Σin−Σout === stones 零漂移（#113） */
  function noteStones(ws, before) {
    var d = ws.stones - before;
    if (!d) return 0;
    return SQ.Ledger.note(ws, d > 0 ? 'in' : 'out', d > 0 ? 'event' : 'event_loss', Math.abs(d));
  }

  var pickWeighted = SQ.util.pickWeighted;   /* C2：统一至 assets/util.js */

  /* 内容池归一：新版为平铺数组；兼容旧版 {positive,negative,choice} 桶结构（迁移窗口期） */
  function listFrom(pool) {
    if (Array.isArray(pool)) return pool;
    if (!pool) return [];
    return (pool.positive || []).concat(pool.negative || []).concat(pool.choice || []);
  }

  function allEvents(pack) {
    return listFrom(SQ.EVENTS.common).concat(listFrom((SQ.EVENTS || {})[pack.worldId]));
  }

  var TIERS = ['tian', 'di', 'ren'];   /* 空池回退的降级顺序（池设计 §三：天→地→人，再翻性质） */

  /* ── 效果文案（view 结果页 / feed 卡片共用）──────────────── */
  function effText(ws, pack, D, e) {
    var wid = pack.worldId;
    var parts = [];
    var cur = SQ.t('resource.currency', null, wid);
    var qi = SQ.t('resource.primary', null, wid);
    var sign = function (n) { return n >= 0 ? '+' : '-'; };
    if (!e) e = {};
    if (e.stones) parts.push(SQ.t('log.eff.stones', { res: cur, sign: sign(e.stones), n: SQ.fmt(Math.abs(e.stones)) }, wid));
    if (e.stonesPct != null) parts.push(SQ.t('log.eff.pct', { res: cur, sign: sign(e.stonesPct), p: pct(Math.abs(e.stonesPct * 100)) }, wid));
    if (e.qi) parts.push(SQ.t('log.eff.qi', { res: qi, sign: sign(e.qi), n: SQ.fmt(Math.abs(e.qi)) }, wid));
    if (e.qiPct != null) parts.push(SQ.t('log.eff.pct', { res: qi, sign: sign(e.qiPct), p: pct(Math.abs(e.qiPct * 100)) }, wid));
    if (e.buff) parts.push(SQ.t('log.eff.buff', {
      field: e.buff.field.indexOf('attr.') === 0
        ? SQ.t('attr.' + e.buff.field.slice(5), null, wid)
        : SQ.t('talent.field.' + e.buff.field, null, wid),
      sign: sign(e.buff.mult), p: pct(Math.abs(e.buff.field.indexOf('attr.') === 0 ? e.buff.mult : e.buff.mult * 100)),
      h: e.buff.hours != null ? e.buff.hours : e.buff.h
    }, wid));
    if (e.dropGear) parts.push(SQ.t('log.eff.dropGear', { gear: SQ.t('gear.system', null, wid) }, wid));
    if (e.exclusiveGear) parts.push(SQ.t('log.eff.exclusiveGear', { name: SQ.t('gear.ex.' + e.exclusiveGear, null, wid) }, wid));
    if (e.exclusiveArt) parts.push(SQ.t('log.eff.exclusiveArt', { name: SQ.t('skill.' + e.exclusiveArt + '.name', null, wid) }, wid));
    if (e.treasure) parts.push(SQ.t('log.eff.treasure', { name: SQ.t('treasure.' + e.treasure + '.name', null, wid) }, wid));
    if (e.exclusiveLocked) parts.push(SQ.t('log.eff.exclusiveLocked', null, wid));
    /* 分钟数取表值：原文案写死「一炷香」，与 MERCHANT_DURATION_MS（10 分钟）不符，改表不带动屏上文案 */
    if (e.merchant) parts.push(SQ.t('log.eff.merchant', { n: Math.max(1, Math.round(((D.MERCHANT_DURATION_MS || 600000) / 60000))) }, wid));
    if (e.merchantScout) parts.push(SQ.t('log.eff.merchantScout', null, wid));
    if (e.primeGear) parts.push(SQ.t('log.eff.primeGear', null, wid));
    if (e.primeArt) parts.push(SQ.t('log.eff.primeArt', null, wid));
    if (e.gated) parts.push(SQ.t('log.eff.gated', null, wid));
    if (e.qiPctRaw != null) parts.push(SQ.t('log.eff.pct', { res: qi, sign: sign(e.qiPctRaw), p: pct(Math.abs(e.qiPctRaw * 100)) }, wid));
    if (e.artsProgress) parts.push(SQ.t('log.eff.artsProgress', { n: e.artsProgress }, wid));
    if (e.tribNext != null) parts.push(SQ.t('log.eff.tribNext', { sign: sign(e.tribNext), n: Math.abs(e.tribNext) }, wid));
    if (e.fateShard != null) parts.push(SQ.t('log.eff.fateShard', { n: e.fateShard }, wid));
    if (e.talentSwap != null) parts.push(SQ.t('log.eff.talentSwap', { n: e.talentSwap }, wid));
    if (e.shopDiscount != null) parts.push(SQ.t('log.eff.shopDiscount', { p: pct(e.shopDiscount * 100) }, wid));
    if (e.eventShield != null) parts.push(SQ.t('log.eff.eventShield', { h: e.eventShield }, wid));
    if (e.combatProgress != null) parts.push(SQ.t('log.eff.combatProgress', {}, wid));
    if (e.gearScoreDown != null) parts.push(SQ.t('log.eff.gearScoreDown', {}, wid));
    if (e.attrBonus) parts.push(SQ.t('log.eff.attrBonus', { attr: SQ.t('attr.' + e.attrBonus.attr, null, wid), n: e.attrBonus.n }, wid));
    if (e.breakCost != null) parts.push(SQ.t('log.eff.breakCost', { p: pct(Math.abs(e.breakCost * 100)) }, wid));
    if (e.bond) {
      /* 档位信息（applyEffects 回填）：有则出「档名 a/next」尾巴，无则退回简式（旧 feed 兼容）；
       * 天骄槽位（pr{n}）名走 Prodigy.nameOf（存档三段索引渲染，非静态词表键） */
      var bname = (String(e.bond.npc).indexOf('pr') === 0 && SQ.Prodigy)
        ? SQ.Prodigy.nameOf(ws, e.bond.npc, pack)
        : SQ.t('bond.' + e.bond.npc + '.name', null, wid);
      var bvars = { name: bname, sign: sign(e.bond.n), n: Math.abs(e.bond.n) };
      if (e.bond.tier != null && e.bond.tier >= 1 && String(e.bond.npc).indexOf('pr') !== 0) {
        var tsB = D.BOND_TIERS || [1, 30, 70, 100];
        bvars.title = SQ.t('bond.' + e.bond.npc + '.title.' + e.bond.tier, null, wid);
        bvars.a = e.bond.affinity;
        bvars.next = e.bond.tier >= tsB.length ? D.BOND_MAX : tsB[e.bond.tier];
        parts.push(SQ.t('log.eff.bond.tier', bvars, wid));
      } else if (e.bond.blocked) {
        parts.push(SQ.t('log.eff.bond.blocked', bvars, wid));
      } else {
        parts.push(SQ.t('log.eff.bond', bvars, wid));
      }
    }
    if (e.bondLock) parts.push(SQ.t('log.eff.bondLock', { name: SQ.t('bond.' + e.bondLock + '.name', null, wid) }, wid));
    /* 缘尽降级（引擎卷 v1.10 §3.6）：门槛不合 → 好感大跌而非恩断义绝，如实呈报扣减值 */
    if (e.bondDrain && !e.bondDrain.blocked) {
      parts.push(SQ.t('log.eff.bondDrain', {
        name: SQ.t('bond.' + e.bondDrain.npc + '.name', null, wid),
        a: e.bondDrain.before, b: e.bondDrain.after
      }, wid));
    }
    if (e.fail) {
      /* failE 已预掷定为实扣值（resolveEff）→ 结果页如实呈报，避免「显示值 ≠ 实扣值」 */
      var ft = effText(ws, pack, D, e.fail);
      if (ft && ft !== SQ.t('log.eff.none', null, wid)) parts.push(SQ.t('log.eff.failwrap', { txt: ft }, wid));
    }
    if (!parts.length) parts.push(SQ.t('log.eff.none', null, wid));
    return parts.join(SQ.t('ui.sep'));
  }

  SQ.Events = {
    effText: effText,
    rollRange: rollRange,
    resolveEff: resolveEff,
    rollBuffHours: rollBuffHours,
    pushBuff: pushBuff,
    stoneScaleOf: stoneScaleOf,
    qiScaleOf: qiScaleOf,

    /* ── 效果结算核心（事件分支 / 丹药 / failE 共用）；ctx = {log, now, silent, raw, source, eventId, profile}
     * ctx.raw=true 时 stones/qi 绝对值不再缩放（调用方已预缩放，feed/结果页显示 == 实扣）。
     * ⚠️ 纪律（2026-10-11 审计处置批复核立）：本函数会**写传入的 `e`**（未发生的收益撤标签：`e.attrBonus = null`
     *   等，`applied.fail` 那条通道要靠它闭嘴）⇒ **世界表对象不得直接传入**。丹药三处（`shop.js` 买药 /
     *   `factions.js` 门中供给 / `combat.js` 秘境赠药）一律 `Object.assign({}, pill.effect)` 传当次副本，
     *   否则一颗丹被吃出「无槽可进」就把表里那条效果改没了 = 本会话内该丹永久静默无效。── */
    applyEffects: function (ws, pack, D, mods, e, ctx) {
      if (!e) return;
      var now = (ctx && ctx.now) || Date.now();
      var wid = pack.worldId;
      var raw = !!(ctx && ctx.raw);
      var scaleS = raw ? 1 : SQ.Events.stoneScaleOf(ws, D);
      var scaleQ = raw ? 1 : SQ.Events.qiScaleOf(ws, D);
      /* 符佑（祝阿婆 on_negative_event）：负面性质奇遇的资源损失 −2%→−8%（含 failE，随宿主性质） */
      var negMul = 1;
      var bdN = (mods && mods.bonds && mods.bonds.negEvent) || 0;
      if (bdN > 0 && ctx && ctx.eventId) {
        var hostN = SQ.Events.findById(pack, ctx.eventId);
        if (hostN && hostN.nature === 'bad') negMul = 1 - bdN;
      }
      if (e.stones != null) {
        var n = rollRange(e.stones);
        if (n < 0) n = n * negMul;
        /* 法宝·山河社稷图（hook:on_event_stones，法宝全录 X08）：正向灵石奖励 ×(1+加成) */
        else if (mods && mods.hooks && mods.hooks.on_event_stones) n *= (1 + mods.hooks.on_event_stones);
        var sBefore = ws.stones;
        ws.stones = Math.max(0, ws.stones + Math.round(n * scaleS));
        noteStones(ws, sBefore);
      }
      if (e.stonesPct != null) {
        var sBefore2 = ws.stones;
        var spN = e.stonesPct < 0 ? e.stonesPct * negMul : e.stonesPct;
        /* 百分比改账后取整（灵石为整数货币，且 ledger 记实际增量，#113 零漂移） */
        ws.stones = Math.round(Math.max(0, ws.stones * (1 + spN)));
        noteStones(ws, sBefore2);
      }
      if (e.dao != null) {
        /* 道伤加层（第卌四批 · 袭击/寻仇的败绩代价）：一律走世界包 `daoAdd` 那唯一写口——
         * 封顶与「只在跨过 warn 那一层写一条」的降噪纪律在渡劫阶梯那边已经有一份，不在此重写。 */
        if (pack.worldSystems && pack.worldSystems.daoAdd) {
          pack.worldSystems.daoAdd(ws, e.dao, ctx && ctx.log, 'event');
        }
      }
      if (e.qi != null) {
        var nq = rollRange(e.qi);
        if (nq < 0) nq = nq * negMul;
        ws.qi = Math.max(0, ws.qi + nq * scaleQ);
        ws.total = (ws.total || 0) + Math.max(0, nq * scaleQ);
      }
      if (e.qiPct != null) {
        /* 「等价挂机小时」封顶（事件池 §十三.4）：|Δqi| ≤ CAP × 当前每秒产出 × 3600。
         * 高境界当前修为 ÷ 每小时产出可达 20~50h，百分比条目不设界会让事件通道压过挂机通道。 */
        var dq = ws.qi * (e.qiPct < 0 ? e.qiPct * negMul : e.qiPct);
        var capHours = D.EVENT_QI_PCT_HOUR_CAP || 0;
        if (capHours > 0) {
          var rateNow = SQ.Idle.rateOf(ws, pack, D, mods);
          var capQ = capHours * 3600 * rateNow;
          if (capQ > 0 && Math.abs(dq) > capQ) dq = dq > 0 ? capQ : -capQ;
        }
        ws.qi = Math.max(0, ws.qi + dq);
      }
      if (e.qiPctRaw != null) {
        /* qiPctRaw（势力批 v2.4）：**不吃等价挂机小时封顶**的原始百分比增减——
         * 供「重伤」类硬性代价使用（如神秘商人袭杀失败 -75%），内容使用需在文档登记 */
        var dqR = ws.qi * (e.qiPctRaw < 0 ? e.qiPctRaw * negMul : e.qiPctRaw);
        ws.qi = Math.max(0, ws.qi + dqR);
      }
      if (e.buff) {
        var hours = e.buff.hours != null ? e.buff.hours : e.buff.h;
        hours = rollRange(hours);
        /* 负面 buff 时长缩短（引擎卷 v1.4 口径1/2）：心如止水 × 枯井不波 叠乘为基础减免，
         * 再叠加 药箱（全域）/ 忠护 + 阴阳双修（心魔类 = 负面性质奇遇所施）→ 总减免 clamp ≤50%。
         * 零道友时与批 1/2 行为完全一致（叠乘式不变）。 */
        var isDebuff = (e.buff.mult < 0) || e.buff.field === 'shopCost';
        if (isDebuff) {
          /* 桃木剑 h20（hook:on_debuff_apply，§10.7）与心如止水/枯井不波同乘区合并（负值 = 减免） */
          var reduce = 1 - (1 + (mods.hooks.zhishui || 0)) * (1 + (mods.hooks.kujing || 0)) * (1 + (mods.hooks.on_debuff_apply || 0));
          var bd = mods.bonds || {};
          reduce += bd.debuffAll || 0;
          var hostEv = (ctx && ctx.eventId) ? SQ.Events.findById(pack, ctx.eventId) : null;
          var xinmo = !!(hostEv && hostEv.nature === 'bad');
          if (xinmo) reduce += (bd.debuffXinmo || 0);
          reduce = Math.min(reduce, D.DEBUFF_REDUCE_CAP != null ? D.DEBUFF_REDUCE_CAP : 0.5);
          hours = hours * (1 - Math.max(0, reduce));
        }
        pushBuff(ws, e.buff.field, e.buff.mult, now + Math.round(hours * 3600 * 1000), ctx && ctx.buffSource);   /* 来源可透传（第十七批）：从丹匣服下的成品丹标 alchemy，与自产丹同规矩；奇遇不传 ⇒ 行为不变 */
      }
      if (e.eventShield != null) {
        pushBuff(ws, 'eventShield', 1, now + rollRange(e.eventShield) * 3600 * 1000);
      }
      if (e.dropGear) {
        var item = SQ.Gear.roll(ws, pack, D, ws.zone, mods, {
          tierMin: e.dropGear.tierMin, slot: e.dropGear.slot, align: e.dropGear.align, special: e.dropGear.special,
          source: (ctx && ctx.source) || { type: 'event', ref: (ctx && ctx.eventId) || null }
        });
        SQ.Gear.autoEquip(ws, pack, D, mods, item, ctx && ctx.log);
      }
      if (e.merchant) {
        /* 神秘商人 · 交好（势力批 v2.4 §8）：坊市特席 10 分钟（无视标记 → 货 +1 阶并消耗） */
        if (SQ.Shop && SQ.Shop.openMerchant) {
          SQ.Shop.openMerchant(ws, pack, D, mods, now, ctx && ctx.log);
        }
      }
      if (e.merchantScout) {
        ws.merchantScout = true;                   /* 神秘商人 · 无视：记住这张脸，下次货更好 */
      }
      if (e.primeGear) {
        /* 神秘商人 · 袭杀（判定过）：极品法器 = 品阶直接顶格（仙品） */
        var itemP = SQ.Gear.roll(ws, pack, D, Math.min(ws.realm, D.ZONES.length - 1), mods, {
          tierMin: D.GEAR_TIERS.length - 1,
          source: { type: 'event', ref: (ctx && ctx.eventId) || null }
        });
        SQ.Gear.autoEquip(ws, pack, D, mods, itemP, ctx && ctx.log);
        if (ctx) ctx.primeGearName = itemP.name;
      }
      if (e.primeArt) {
        /* 神秘商人 · 袭杀（判定过）：极品功法 = 未持有的地/天阶随机一部（独占不在此通道） */
        var artsMapP = pack.artsMap(), candsP = [];
        for (var pid in artsMapP) {
          var pa = artsMapP[pid];
          if ((pa.tier !== 'di' && pa.tier !== 'tian') || pa.obtain.type === 'event_locked') continue;
          if (SQ.Arts.owned(ws, pid)) continue;
          candsP.push(pid);
        }
        if (candsP.length) {
          var aidP = candsP[Math.floor(Math.random() * candsP.length)];
          SQ.Arts.gainArt(ws, pack, D, aidP, ctx && ctx.log);
          if (ctx) ctx.primeArtId = aidP;
        }
      }
      /* 独占通道（专属事件池 v2.0.1 §4.2）：授予即定格缩放 + 豁免自动择优，入口只在事件分支 */
      if (e.exclusiveGear) {
        SQ.Gear.grantExclusive(ws, pack, D, mods, e.exclusiveGear,
          { type: 'event', ref: (ctx && ctx.eventId) || null }, ctx && ctx.log);
      }
      if (e.exclusiveArt) {
        SQ.Arts.gainArt(ws, pack, D, e.exclusiveArt, ctx && ctx.log);
      }
      if (e.treasure) {
        /* 法宝联动授予（二批 A5）：判定过才到此（resolveBranch gate）；日志走 Treasures.gain 的 treasure.gained 模板 */
        if (SQ.Treasures && SQ.Treasures.gain) SQ.Treasures.gain(ws, pack, D, e.treasure, ctx && ctx.log);
      }
      if (e.artsProgress) {
        /* 主修形式化（引擎卷 §4.2）：指向修习槽第 1 位；空槽/满级 → 顺延随机槽内功法 */
        var main = SQ.Arts.progressTarget(ws, D.ARTS_MAX_LV);
        if (main) {
          ws.artsLevels[main] = Math.min(D.ARTS_MAX_LV, (ws.artsLevels[main] || 0) + e.artsProgress);
        } else {
          /* 一丁点没进（无槽可进）⇒ 撤销标签与 applied（审计 #6）：原样留着就是「功法精进 N 级」的假账。
           * 同文件 bondLock 降级那一段早已是「delete 掉未发生的收益」这一口径。
           * ⚠️ 写 `e` 本身是**必要的**（`applied.fail` 那条通道读的就是这只对象，见 :956 传 fEff），
           *   所以传进来的必须是**当次调用的效果对象**，不许是表对象——见函数头那条纪律。 */
          e.artsProgress = null;
          if (ctx.applied) delete ctx.applied.artsProgress;
        }
      }
      if (e.tribNext != null) ws.tribulation.next = (ws.tribulation.next || 0) + e.tribNext;
      /* 探宝残片计数（事件池 v2.7 天道垂青池 №117 · 系统深化批 A6 登记键 fateShard）：
       * 计入**当前秘境**分区（ws.shards[ws.zone]）；纯计数不进 Ledger（数值详设 §2.7 红线） */
      if (e.fateShard != null) {
        var fsN = Math.max(0, Math.round(rollRange(e.fateShard)));
        if (!Array.isArray(ws.shards)) ws.shards = [];
        var fsZ = Math.max(0, Math.min((D.ZONES || []).length - 1, ws.zone || 0));
        ws.shards[fsZ] = Math.max(0, Math.floor(ws.shards[fsZ] || 0)) + fsN;
      }
      if (e.shopDiscount != null) ws.shop.discount = Math.max(ws.shop.discount || 0, e.shopDiscount);
      if (e.talentSwap != null) {
        /* 洗髓缘（天赋池设计 v1.8 §十 · 洗髓批）：只经 SQ.Talents.grantSwap 单口赐缘。
         * 本世预算已满 ⇒ 撤销这条收益标签（与 artsProgress「无槽可进」、gearScoreDown「四槽皆空」
         * 同一口径：没真落账的收益不许留在文案与 applied 里）。 */
        if (!SQ.Talents.grantSwap(ws, D).ok) {
          e.talentSwap = null;
          if (ctx.applied) delete ctx.applied.talentSwap;
        }
      }
      if (e.combatProgress != null) {
        var z = ws.zone;
        ws.prog[z] = Math.max(0, Math.round(((ws.prog[z] || 0) * (1 + e.combatProgress))));
      }
      if (e.gearScoreDown != null) {
        var worn = [];
        for (var slot in ws.gear) if (ws.gear[slot]) worn.push(ws.gear[slot]);
        if (worn.length) {
          var g = worn[Math.floor(Math.random() * worn.length)];
          var k = 1 + e.gearScoreDown;
          g.atk = Math.max(1, Math.round(g.atk * k));
          if (g.qiBonus) g.qiBonus = Math.round(g.qiBonus * k * 1000) / 1000;
          if (g.resist) g.resist = Math.max(1, Math.round(g.resist * k));
          if (g.attrValue) g.attrValue.value = Math.max(1, Math.round(g.attrValue.value * k));
        } else {
          /* 四槽皆空 = 没有一件法器可受损 ⇒ 撤销「一件法器受损」这条标签（审计 #6） */
          e.gearScoreDown = null;
          if (ctx.applied) delete ctx.applied.gearScoreDown;
        }
      }
      if (e.attrBonus) {
        var total = 0;
        for (var a in ws.attrEventBonus) total += ws.attrEventBonus[a];
        /* 红尘炼心录：attrEventBonus 获取 +10%/级（amp 只放大正增益） */
        var amp = e.attrBonus.n > 0 ? 1 + (mods.sum.attrBonusAmp || 0) : 1;
        var bn = Math.round(e.attrBonus.n * amp);
        /* ⚠️ 复核返修：原判据写成 `bn > 0`，把**负值**（减属性，本函数与 `attrBonusAmp` 一直都支持负数、
         * `effText` 也带符号印）一并撤销了 ⇒ 「折寿/削悟性」类事件会静默不生效而文案照旧。撤销条件只该看
         * 「有没有真的落账」= `bn !== 0` 且未越上限。 */
        if (bn !== 0 && total + bn <= D.ATTR_EVENT_BONUS_CAP) {
          ws.attrEventBonus[e.attrBonus.attr] = (ws.attrEventBonus[e.attrBonus.attr] || 0) + bn;
        } else {
          /* 满上限被整笔丢弃（既有设计，改不改属产品裁定 ⇒ 转 N27/N28 登记）或取整后为 0 ⇒
           * 一律撤销标签与 applied（审计 #6）：否则文案写「悟性永久 +3」而玩家一分没拿到。 */
          e.attrBonus = null;
          if (ctx.applied) delete ctx.applied.attrBonus;
        }
      }
      if (e.breakCost != null) ws.breakCostNext = (ws.breakCostNext || 0) + e.breakCost;
      /* 结缘回写（G14）：唯一写口 SQ.Bonds.gain——绝交锁/心结锁拒入账、clamp 取整；
       * 档位信息回填进 applied.bond（同一对象引用）供结果页/叙事流「♡ 入账行 + 升档」消费 */
      if (e.bond && e.bond.npc && SQ.Bonds) {
        ws.bonds = ws.bonds || {};
        var gr = SQ.Bonds.gain(ws, pack, D, e.bond.npc, e.bond.n, now);
        e.bond.affinity = gr.after;
        e.bond.tier = gr.tierAfter;
        e.bond.tierFrom = gr.tierBefore;
        e.bond.blocked = gr.blocked;
      }
      /* 绝交锁（引擎卷 v1.10 §3.6 · 缘尽收敛批）：双门槛不合条 → **降级为好感大跌**，不锁。
       * 门槛①结算后 karma ≤ BOND_LOCK_KARMA_MAX（凶名邪修及以上）②该道友当前好感 ≥ BOND_LOCK_BOND_MIN
       * （知交及以上）。ctx 无 gateKarma（旧旁路/断言直测）时按无条件锁走，行为向后兼容。 */
      if (e.bondLock && SQ.Bonds) {
        ws.bonds = ws.bonds || {};
        var lkGate = (ctx && ctx.gateKarma != null && D)
          ? { karma: ctx.gateKarma, D: D } : null;
        var lkRes = SQ.Bonds.lock(ws, e.bondLock, lkGate);
        if (lkRes && lkRes.ok) {
          e.bondLocked = e.bondLock;
          /* 真锁：applied 明确回写（与降级路径互斥），结果页据此出「恩断义绝」末行 */
          if (ctx.applied) ctx.applied.bondLock = e.bondLock;
        } else {
          var dr = SQ.Bonds.drainFor(ws, pack, D, e.bondLock,
            (ctx && ctx.branchKarma != null) ? ctx.branchKarma : 0, now);
          e.bondDrain = { npc: e.bondLock, before: dr.before, after: dr.after, blocked: dr.blocked };
          delete e.bondLock;
          /* applied 是结果页 / 日志的消费面（view 读 res.eff.bondLock 出「恩断义绝」末行）——
           * 降级后必须同步撤销，否则玩家看到的是没发生的绝交。 */
          if (ctx.applied) { delete ctx.applied.bondLock; ctx.applied.bondDrain = e.bondDrain.npc; }
        }
      }
      /* 显式 bondDrain 收益结算（gainToEff 产出字符串形态；上一块的降级产物已是对象，此处不重入）*/
      if (typeof e.bondDrain === 'string' && SQ.Bonds) {
        ws.bonds = ws.bonds || {};
        var drNpc = e.bondDrain;
        var dr2 = SQ.Bonds.drainFor(ws, pack, D, drNpc,
          (ctx && ctx.branchKarma != null) ? ctx.branchKarma : 0, now);
        e.bondDrain = { npc: drNpc, before: dr2.before, after: dr2.after, blocked: dr2.blocked };
        if (ctx.applied) { delete ctx.applied.bondLock; ctx.applied.bondDrain = drNpc; }
      }
      if (e.chance && Math.random() < e.chance.p) {
        SQ.Events.applyEffects(ws, pack, D, mods, Object.assign({}, e.chance.e), ctx);   /* 副本 = 同一纪律：`chance.e` 是表里的嵌套对象 */
        if (ctx && ctx.log && !ctx.silent) ctx.log('event', SQ.t('log.eff.chance', null, wid));
      }
      /* 器灵判词 · 大额拾取触发（融合器灵卷 §7.3）：事件钩子产物，纯文本零机制效果 */
      if (SQ.Fusion && SQ.Fusion.onPickupCheck && ctx && !ctx.silent) {
        SQ.Fusion.onPickupCheck(ws, pack, D, e, now, ctx.log);
      }
    },

    /* ── 触发条件（池设计 §三 扩展 cond 字典）──────────────── */
    condOk: function (ev, ws, pack, D) {
      var c = ev.cond;
      if (!c) return true;
      if (c.realmMin != null && ws.realm < c.realmMin) return false;
      if (c.realmMax != null && ws.realm > c.realmMax) return false;
      if (c.zoneMin != null && SQ.Combat.maxUnlocked(ws, D) < c.zoneMin) return false;
      if (c.zoneCleared != null && (ws.cleared || []).length < c.zoneCleared) return false;
      if (c.minKarma != null || c.maxKarma != null) {
        var karma = pack.worldSystems && pack.worldSystems.karmaOf ? pack.worldSystems.karmaOf(ws) : 0;
        if (c.minKarma != null && karma < c.minKarma) return false;
        if (c.maxKarma != null && karma > c.maxKarma) return false;
      }
      if (c.align && pack.worldSystems && pack.worldSystems.tierOf) {
        if (pack.worldSystems.tierOf(ws) !== c.align) return false;
      }
      if (c.hasArt) {
        var artsMap = pack.artsMap();
        var known = ws.artsKnown || [];
        if (typeof c.hasArt === 'string') {
          if (known.indexOf(c.hasArt) < 0) return false;
        } else {
          var hit = known.some(function (id) {
            var a = artsMap[id];
            if (!a) return false;
            if (c.hasArt.tier != null && a.tier !== c.hasArt.tier) return false;
            if (c.hasArt.alignment && a.alignment !== c.hasArt.alignment) return false;
            return true;
          });
          if (!hit) return false;
        }
      }
      if (c.gearSpecial) {
        var wants = Array.isArray(c.gearSpecial) ? c.gearSpecial : [c.gearSpecial];
        var found = false;
        for (var slot in ws.gear) {
          var it = ws.gear[slot];
          if (it && wants.indexOf(it.special) >= 0) { found = true; break; }
        }
        if (!found) return false;
      }
      return true;
    },

    /* ── 候选池构建：tier × nature 子池 + once/冷却/lastId 防刷屏 ── */
    buildPool: function (pack, ws, D, tier, nature, now) {
      var out = [];
      allEvents(pack).forEach(function (ev) {
        /* 独立通道词条（天道垂青池 tags:['trib_success']，事件池 v2.7）：不进常规抽取池、
         * 不占 eventRate 乘区——只由 fireTagged 在钩子点位消费 */
        if (ev.tags && ev.tags.length) return;
        if (ev.tier !== tier || ev.nature !== nature) return;
        if (!SQ.Events.condOk(ev, ws, pack, D)) return;
        if (ev.once && ws.eventHistory.seen[ev.id] != null) return;
        var cdH = ev.cooldownHours != null ? ev.cooldownHours : ev.cd;
        var cd = ws.eventCooldowns[ev.id];
        if (cdH != null && cd != null && now < cd + cdH * 3600 * 1000) return;
        if (ws.eventHistory.lastId === ev.id) return; /* 连续两次不出同一 id */
        out.push(ev);
      });
      return out;
    },

    findById: function (pack, id) {
      var ev = null;
      allEvents(pack).forEach(function (e) { if (e.id === id) ev = e; });
      return ev;
    },

    /* 全事件 id 列表（G17 传闻 normalize 校验用——未知 evId 丢弃） */
    allIds: function (pack) {
      return allEvents(pack).map(function (e) { return e.id; });
    },

    /* ── 性质抽取（ALIGN_EFFECTS.natureW + eventLuck 修正，各侧下限 10）──
     * avoid = 法宝·避尘珠（hook:on_negative_avoid，法宝全录 H06）：负面权重按比例削减。── */
    natureDraw: function (D, eff, luck, avoid) {
      var gw = eff.natureW.good, bw = eff.natureW.bad;
      if (luck > 0) { gw += luck * D.EVENT_NATURE_LUCK_POS; bw -= luck * D.EVENT_NATURE_LUCK_NEG; }
      else if (luck < 0) { gw += luck * D.EVENT_NATURE_LUCK_NEG; bw -= luck * D.EVENT_NATURE_LUCK_POS; }
      gw = Math.max(D.EVENT_NATURE_W_MIN, gw);
      bw = Math.max(D.EVENT_NATURE_W_MIN, bw);
      if (avoid > 0) bw = Math.max(D.EVENT_NATURE_W_MIN, bw * (1 - Math.min(1, avoid)));
      return Math.random() < gw / (gw + bw) ? 'good' : 'bad';
    },

    /* ── 单次触发：性质/品阶两级抽取 → 空池回退（先降品阶再翻性质）→ 触发即归零。
     * 返回 {id,tier,nature,pending:true} | {blocked:true,id}（护身符抵消）| null（流产，时钟保留）。── */
    fire: function (ws, pack, D, mods, eff, now, ctx) {
      var wid = pack.worldId;
      var nature = SQ.Events.natureDraw(D, eff, mods.sum.eventLuck || 0, mods.hooks.on_negative_avoid || 0);
      /* 逢凶化吉（功法 on_negative_event）+ 法宝·两仪太极图（hook:on_negative_event，法宝全录 X04）：
       * 危机概率转机缘，两源同通道加算、封顶 100% */
      var huaji = (mods.hooks.huaji || 0) + (mods.hooks.on_negative_event || 0) + (mods.hooks.hundun || 0);   /* 混沌重生（自创签名）同线加算，Math.min(1,·) 封顶护栏共用 */
      if (nature === 'bad' && huaji > 0 && Math.random() < Math.min(1, huaji)) nature = 'good';
      var tier = pickWeighted([
        { w: eff.tierW.tian, id: 'tian' }, { w: eff.tierW.di, id: 'di' }, { w: eff.tierW.ren, id: 'ren' }
      ]).id;

      var natures = [nature, nature === 'good' ? 'bad' : 'good'];
      /* 方案 B（传闻预留 · 正典 §82 并发收口）：活跃传闻已指向的事件不被被动奇遇抢先触发，
       * 使传闻在 TTL 内始终可查证；排除后空池沿既有 降阶/翻性质 回退，仍空则流产且时钟保留。
       * 定向查证走 SQ.Rumors.trigger（不经 fire），故不受此排除影响。 */
      var rsv = (SQ.Rumors && SQ.Rumors.activeEventIds) ? SQ.Rumors.activeEventIds(ws) : null;
      var ev = null;
      for (var ni = 0; ni < natures.length && !ev; ni++) {
        var start = TIERS.indexOf(tier);
        for (var ti = start; ti < TIERS.length && !ev; ti++) {
          var pool = SQ.Events.buildPool(pack, ws, D, TIERS[ti], natures[ni], now);
          if (rsv) pool = pool.filter(function (e) { return !rsv[e.id]; });
          if (pool.length) ev = pickWeighted(pool.map(function (e) { return { weight: e.weight, ev: e }; })).ev;
        }
      }
      if (!ev) return null; /* 流产：时钟保留，下个分钟段再掷（池设计 §三 步骤 4） */
      nature = ev.nature;

      /* 护身符：抵消在线危机并消耗，事件不落地（验收 4.6 #67） */
      if (nature === 'bad') {
        var si = -1;
        for (var b = 0; b < ws.buffs.length; b++) {
          if (ws.buffs[b].field === 'eventShield' && ws.buffs[b].until > now) { si = b; break; }
        }
        if (si >= 0) {
          ws.buffs.splice(si, 1);
          if (ctx && ctx.log) ctx.log('event', SQ.t('event.shield.block', { name: SQ.t('event.' + ev.id + '.name', null, wid) }, wid));
          return { id: ev.id, blocked: true };
        }
      }

      /* 触发即归零 + 冷却/lastId/首遇记录（seen 供图鉴；once 靠 seen 拦截） */
      ws.eventClock = 0;
      ws.eventCooldowns[ev.id] = now;
      ws.eventHistory.lastId = ev.id;
      if (ws.eventHistory.seen[ev.id] == null) ws.eventHistory.seen[ev.id] = now;
      ws.pendingChoice = { id: ev.id, at: now, tier: ev.tier, nature: ev.nature };
      return { id: ev.id, tier: ev.tier, nature: ev.nature, special: !!ev.special, pending: true };
    },

    /* ── 标签触发独立通道（天道垂青 · 数值详设 §8.3.3 / 专属事件池 v2.7 · 系统深化批 A3/A6）。
     * 仅由指定钩子点位（渡劫成功瞬间）调用，概率判定在调用方（FATE_P 固定 10%）：
     * 不进常规奇遇时钟、不占 eventRate 乘区、不受 eventLuck/阵营档位影响；
     * 落地五件套与 fire 同口径（cooldown/lastId/seen/pendingChoice via:'fate'）；
     * 不消耗 eventShield（馈赠非遇袭）、不清 eventClock（独立通道）；
     * 同一境界段内不重复——ws.fateSeen [{id,realm}] 记录本段（realm）已触发条目并排除；
     * 当段池空 → 流产、不补偿不降级（静默跳过，不报错不空放）。 ── */
    fireTagged: function (ws, pack, D, tag, realmSeg, now, ctx, opts) {
      var seenSeg = {};
      (ws.fateSeen || []).forEach(function (f) {
        if (f && typeof f === 'object' && f.realm === realmSeg) seenSeg[f.id] = 1;
      });
      var pool = allEvents(pack).filter(function (ev) {
        return ev.tags && ev.tags.indexOf(tag) >= 0 && !seenSeg[ev.id] &&
          SQ.Events.condOk(ev, ws, pack, D);
      });
      if (!pool.length) return null;
      /* 敕赐奇遇（天道设计 §4.2 · 天道系统批）：payload.eventId 指定且在生效池内 → 定向抽取；
       * 否则引擎随机——不新增事件条目，fateSeen 排除纪律沿用 */
      var ev = null;
      if (opts && opts.forceId) {
        pool.forEach(function (e) { if (e.id === opts.forceId) ev = e; });
      }
      if (!ev) ev = pool[Math.floor(Math.random() * pool.length)];
      ws.eventCooldowns[ev.id] = now;
      ws.eventHistory.lastId = ev.id;
      if (ws.eventHistory.seen[ev.id] == null) ws.eventHistory.seen[ev.id] = now;
      if (!Array.isArray(ws.fateSeen)) ws.fateSeen = [];
      ws.fateSeen.push({ id: ev.id, realm: realmSeg });
      if (ws.fateSeen.length > 64) ws.fateSeen = ws.fateSeen.slice(-64);   /* 容量护栏：6 条 × 10 段远小于 64 */
      ws.pendingChoice = { id: ev.id, at: now, tier: ev.tier, nature: ev.nature, via: 'fate' };
      if (ctx && ctx.log) {
        ctx.log('event', SQ.t('tribulation.fate', {
          name: SQ.t('event.' + ev.id + '.name', null, pack.worldId)
        }, pack.worldId));
      }
      return { id: ev.id, tier: ev.tier, nature: ev.nature, pending: true };
    },

    /* ── 在线时钟推进（claim 内仅在线调用；离线零奇遇 = 不调用即冻结，池设计 §四）。
     * p_k = min(1, (k/20)² × (1+ΣeventRate) × eventRateMult)，k=20 硬保底 p=1；
     * pendingChoice 挂起期间时钟暂停（抉择模态未关不叠加新事件）。── */
    tickOnline: function (ws, pack, D, mods, dtSec, now, ctx) {
      if (ws.pendingChoice) return null;
      var eff = (pack.worldSystems && pack.worldSystems.effectsOf) ? pack.worldSystems.effectsOf(ws) : null;
      if (!eff) return null;

      /* 人间烟火（on_tick_idle）：每在线满 1h 概率得「尘心」buff（eventLuck +8% 30min） */
      var yanhuo = mods.hooks.yanhuo || 0;
      if (yanhuo > 0 && Math.random() < Math.min(1, dtSec / 3600)) {
        pushBuff(ws, 'eventLuck', yanhuo, now + 30 * 60 * 1000);
        if (ctx && ctx.log) ctx.log('event', SQ.t('toast.yanhuo', { p: Math.round(yanhuo * 100) }, pack.worldId));
      }

      var rateMult = (1 + (mods.sum.eventRate || 0)) * eff.eventRateMult;
      /* 修行状态（模式）乘区：闭关清修奇遇减半（0.5）、外出历练机缘加倍（1.5）。
       * 离线不进本函数（时钟冻结），模式不参与离线口径。 */
      var modeCfg = D.MODES && D.MODES[ws.mode] ? D.MODES[ws.mode] : null;
      if (modeCfg) rateMult *= modeCfg.eventMult;
      var prevMin = Math.floor((ws.eventClock || 0) / 60);
      ws.eventClock = (ws.eventClock || 0) + dtSec;
      var curMin = Math.floor(ws.eventClock / 60);
      var result = null;
      for (var k = prevMin + 1; k <= curMin; k++) {
        var kk = Math.min(k, D.EVENT_CLOCK_PITY_MIN);
        var p = kk >= D.EVENT_CLOCK_PITY_MIN ? 1
          : Math.min(1, Math.pow(kk / D.EVENT_CLOCK_PITY_MIN, 2) * rateMult);
        if (Math.random() < p) {
          var r = SQ.Events.fire(ws, pack, D, mods, eff, now, ctx);
          if (r && r.pending) { result = r; break; }
          if (r && r.blocked) result = r; /* 被护身符抵消：时钟保留，继续走后续分钟段 */
          /* r=null 流产：时钟保留，继续 */
        }
      }
      return result;
    },

    /* ── 八类判定 DSL（池设计 §六）；st = {ws,pack,D,mods,eff,ctx}。
     * stones/qi 为代价型：足额即过并扣除，不足判败不扣。attr 走 G12（×阵营 checkDcMult）。── */
    runCheckDsl: function (chk, st) {
      var ws = st.ws, pack = st.pack, D = st.D, mods = st.mods, eff = st.eff;
      var type = chk.type || 'attr';
      if (type === 'attr') {
        var r = SQ.Attrs.check(chk.attr, chk.dc, ws, D, mods, eff ? eff.checkDcMult : 1, pack);
        if (st.ctx && st.ctx.log) {
          st.ctx.log('event', SQ.t('log.check', {
            attr: SQ.t('attr.' + chk.attr, null, pack.worldId),
            odds: SQ.t(SQ.Attrs.oddsKey(r.p), null, pack.worldId),
            res: SQ.t(r.pass ? 'check.ok' : 'check.fail', null, pack.worldId)
          }, pack.worldId));
        }
        return { type: type, pass: r.pass, p: r.p };
      }
      if (type === 'karma') {
        var karma = pack.worldSystems.karmaOf(ws);
        var pass = (chk.min == null || karma >= chk.min) && (chk.max == null || karma <= chk.max);
        return { type: type, pass: pass };
      }
      if (type === 'align') {
        return { type: type, pass: pack.worldSystems.tierOf(ws) === chk.need };
      }
      if (type === 'stones') {
        var cost = Math.round(rollRange(chk.cost));
        if (ws.stones >= cost) {
          var sBefore3 = ws.stones;
          ws.stones -= cost;
          noteStones(ws, sBefore3);   /* 买路钱属事件侧支出 → out.event_loss */
          return { type: type, pass: true, cost: cost };
        }
        return { type: type, pass: false, cost: cost };
      }
      if (type === 'qi') {
        var pct = rollRange(chk.pct);
        if (ws.qi > 0) { ws.qi = Math.max(0, ws.qi * (1 - pct)); return { type: type, pass: true }; }
        return { type: type, pass: false };
      }
      if (type === 'art') {
        var artsMap = pack.artsMap();
        var ids = chk.id ? [chk.id] : (ws.artsKnown || []).filter(function (id) {
          var a = artsMap[id];
          if (!a) return false;
          if (chk.tier != null && a.tier !== chk.tier) return false;
          if (chk.alignment && a.alignment !== chk.alignment) return false;
          return true;
        });
        var okArt = ids.length > 0 && ids.every(function (id) { return (ws.artsKnown || []).indexOf(id) >= 0; });
        if (okArt && chk.slotted) {
          okArt = ids.some(function (id) { return (ws.artsSlots || []).indexOf(id) >= 0; });
        }
        return { type: type, pass: okArt };
      }
      if (type === 'gear') {
        var okGear = false;
        for (var slot in ws.gear) {
          var it = ws.gear[slot];
          if (!it) continue;
          if (chk.slot && it.slot !== chk.slot) continue;
          if (chk.tierMin != null && it.tier < chk.tierMin) continue;
          if (chk.special && it.special !== chk.special) continue;
          okGear = true; break;
        }
        return { type: type, pass: okGear };
      }
      if (type === 'power') {
        var power = SQ.Mods.powerOf(ws, pack, D, mods);
        /* abs（势力批 v2.4）：绝对战力门槛（神秘商人 = 真仙档水准；第十二批复核勘正旧注「渡劫期」——REALMS[8] 渡劫 = 125000、REALMS[9] 真仙 = 375000），不随当前秘境缩放 */
        var need = (chk.abs != null) ? chk.abs : D.ZONES[ws.zone].need * (chk.ratio != null ? chk.ratio : 1);
        return { type: type, pass: power >= need, power: power, need: need };
      }
      if (type === 'companion') {
        /* 第九类判定（G14 · 引擎卷 §3.5）：护法位档位 ≥ minTier；魔道档位护法失效 → 必然失败
         * （「无人可援」——按钮置灰提示不隐藏，让玩家看见自己丢了什么） */
        var okC = SQ.Bonds ? SQ.Bonds.companionOk(ws, pack, D, chk.minTier) : false;
        return { type: type, pass: okC };
      }
      if (type === 'prodigySpar') {
        /* 天骄对局判定（天骄卷 §5.2/§7.3 同构）：双方战力 ×(1±10%) 独立浮动，P > Q×1.01 过；
         * 对手 = pendingChoice.prodigy 槽位（狭路相逢 / 一笑泯恩仇致歉分支消费） */
        var pid = ws.pendingChoice && ws.pendingChoice.prodigy;
        var pr = (SQ.Prodigy && pid) ? SQ.Prodigy.byId(ws, pid) : null;
        if (!pr) return { type: type, pass: false };
        var jit = ((D.PRODIGY || {}).SPAR_JITTER) || 0.10;
        var Pp = SQ.Mods.powerOf(ws, st.pack, D, mods) * (1 + (Math.random() * 2 - 1) * jit);
        var Q = SQ.Prodigy.powerOf(ws, pr, D) * (1 + (Math.random() * 2 - 1) * jit);
        return { type: type, pass: Pp > Q * 1.01, power: Pp, need: Q };
      }
      if (type === 'ambushFoe') {
        /* 敌手快照判定（第卌四批 · 数值详设 §6.1B）：与切磋同一把抖动（SPAR_JITTER 单源，不另立），
         * 对手 = pendingChoice.foe 的**触发时刻快照**——名号/战力在挂起期间不随名录漂移，
         * 所以这一族不需要「身份指纹回查」：判定对象就是那份快照本身，没有第二个可换的指针。 */
        var foeA = ws.pendingChoice && ws.pendingChoice.foe;
        if (!foeA || !(foeA.power > 0)) return { type: type, pass: false };
        var jitA = ((D.PRODIGY || {}).SPAR_JITTER) || 0.10;
        var Pa = SQ.Mods.powerOf(ws, pack, D, mods) * (1 + (Math.random() * 2 - 1) * jitA);
        return { type: type, pass: Pa > foeA.power * 1.01, power: Pa, need: foeA.power };
      }
      return { type: type, pass: true }; /* 未知类型宽松放行（内容 lint 在 audit 拦截） */
    },

    /* ── 判定链：数组 = 全部通过才算成，首个失败即停。
     * 三尸宴坐（on_check）：非代价型判定失败时 30% 无损重来一次（每事件限一次）。── */
    runChain: function (checks, st) {
      var failed = null;
      for (var i = 0; i < checks.length; i++) {
        /* 法宝·捆仙索（H10）：选择类奇遇的判定直通——非代价型一律通过，代价型仍照扣 */
        if (st.autoPass && checks[i].type !== 'stones' && checks[i].type !== 'qi') continue;
        var r = SQ.Events.runCheckDsl(checks[i], st);
        if (r.pass) continue;
        var sanyan = st.mods.hooks.sanyan || 0;
        var costly = checks[i].type === 'stones' || checks[i].type === 'qi';
        if (sanyan > 0 && !st.sanyanUsed && !costly && Math.random() < sanyan) {
          st.sanyanUsed = true;
          if (st.ctx && st.ctx.log) st.ctx.log('event', SQ.t('toast.sanyan', null, st.pack.worldId));
          var r2 = SQ.Events.runCheckDsl(checks[i], st);
          if (r2.pass) continue;
        }
        failed = checks[i];
        break;
      }
      return { pass: !failed, failed: failed };
    },

    /* gain 词条 → 效果对象（区间先掷定 + 失败增益减半只作用于正值；
     * scales = {stones, qi} 双锚分开缩放，预缩放后走 ctx.raw 入账，feed/结果页显示 == 实扣） */
    gainToEff: function (g, mult, scales, applied) {
      var n;
      switch (g.type) {
        case 'stones':
          n = Math.round(rollRange(g.n) * scales.stones);
          if (n > 0) n = Math.round(n * mult);
          applied.stones = (applied.stones || 0) + n;
          return { stones: n };
        case 'stonesPct':
          /* 按比例出血（第卌四批 · 认输买平安）：负值走 applyEffects 既有 stonesPct 通道（取整 + 下限 0
           * + noteStones 真值入账，#113 恒等式自动续绿）；不乘 mult——它不是「收益」，没有减半一说 */
          n = rollRange(g.pct);
          applied.stonesPct = Math.round(((applied.stonesPct || 0) + n) * 1000) / 1000;
          return { stonesPct: n };
        case 'qi':
          n = rollRange(g.n) * scales.qi;
          if (n > 0) n = n * mult;
          applied.qi = Math.round((applied.qi || 0) + n);
          return { qi: n };
        case 'qiPct':
          n = rollRange(g.pct);
          if (n > 0) n = n * mult;
          applied.qiPct = Math.round(((applied.qiPct || 0) + n) * 1000) / 1000;
          return { qiPct: n };
        case 'buff':
          applied.buff = { field: g.field, mult: g.mult, hours: rollBuffHours(rollRange(g.hours)) };
          return { buff: applied.buff };
        case 'dropGear':
          applied.dropGear = (applied.dropGear || 0) + 1;
          return { dropGear: { tierMin: g.tierMin, slot: g.slot, align: g.align, special: g.special } };
        case 'exclusiveGear':
          applied.exclusiveGear = g.id;
          return { exclusiveGear: g.id, exclusiveNeedPass: true };
        case 'exclusiveArt':
          applied.exclusiveArt = g.id;
          return { exclusiveArt: g.id, exclusiveNeedPass: true };
        case 'artsProgress':
          n = Math.round(rollRange(g.n) * mult);
          applied.artsProgress = (applied.artsProgress || 0) + n;
          return { artsProgress: n };
        case 'attrBonus':
          n = Math.round(rollRange(g.n));
          if (n > 0) n = Math.round(n * mult);
          applied.attrBonus = { attr: g.attr, n: n };
          return { attrBonus: { attr: g.attr, n: n } };
        case 'tribNext':
          n = rollRange(g.n);
          applied.tribNext = Math.round(((applied.tribNext || 0) + n) * 1000) / 1000;
          return { tribNext: n };
        case 'fateShard':
          /* 探宝残片（事件池 v2.7 №117 ⏳ 键本批登记）：正向收益，判定失败减半同口径 */
          n = Math.round(rollRange(g.n) * mult);
          applied.fateShard = (applied.fateShard || 0) + n;
          return { fateShard: n };
        case 'talentSwap':
          /* 洗髓缘：计数型（不吃 mult 减半 —— 判定失败要么给一枚要么不给，没有「半枚」） */
          applied.talentSwap = (applied.talentSwap || 0) + 1;
          return { talentSwap: 1 };
        case 'eventShield':
          n = rollRange(g.hours != null ? g.hours : g.h);
          applied.eventShield = n;
          return { eventShield: n };
        case 'bond':
          applied.bond = { npc: g.npc, n: g.n };
          return { bond: { npc: g.npc, n: g.n } };
        case 'bondLock':
          /* 绝交锁（引擎卷 §3.6）：魔道分支长尾后果，bonds[npc] = −99 永久锁定 */
          /* applied.bondLock 不在此预写：真锁 / 降级由 applyEffects 依双门槛结果回写（缘尽收敛批）*/
          return { bondLock: g.npc };
        /* 情谊生裂（缘尽收敛批 · 引擎卷 v1.10 §3.6）：轻中度背叛分支的替代形态——
         * 好感大跌但**不锁**（走 Bonds.lose 唯一负向写口，clamp 到 BOND_MIN −20，锁类豁免），
         * 玩家仍可由后续事件拉回。扣减额由分支 karma 定标，不由事件自填。 */
        case 'bondDrain':
          return { bondDrain: g.npc };   /* applied 同上，由 applyEffects 结算后回写 */
        case 'merchant':
          /* 神秘商人 · 交好（势力批 v2.4 §8）：坊市特席 */
          applied.merchant = true;
          return { merchant: true };
        case 'merchantScout':
          /* 神秘商人 · 无视：记脸标记，下次特席货 +1 阶 */
          applied.merchantScout = true;
          return { merchantScout: true };
        case 'primeGear':
          /* 神秘商人 · 袭杀（判定过）：极品法器 */
          applied.primeGear = true;
          return { primeGear: true };
        case 'primeArt':
          /* 神秘商人 · 袭杀（判定过）：极品功法 */
          applied.primeArt = true;
          return { primeArt: true };
        case 'treasure':
          /* 先天法宝联动授予（二批 A5 · 数值详设 §10.7：乱星盘→№113 / 镇魔链→№104 / 龙髓珠→№91）；
           * 判定过才授予（gate 在 resolveBranch 特席/授予类同列） */
          applied.treasure = g.id;
          return { treasure: g.id };
        default:
          return null;
      }
    },

    /* ── 三分支抉择结算（在线 UI 唯一入口；branchKey = 'right'|'evil'|'neutral'）。
     * 守则：karma 无论判定成败照记（分支定值）；判定失败 = 正向收益减半 + failE 全额追加；
     * 结算后清 pendingChoice、写 feed 叙事流（≤50 条）、覆盖式重算 karma/属性。── */
    resolveBranch: function (ws, pack, D, mods, evId, branchKey, now, ctx) {
      var ev = SQ.Events.findById(pack, evId);
      if (!ev || !ev.choices || !ev.choices[branchKey]) return null;
      var br = ev.choices[branchKey];
      var wid = pack.worldId;
      var eff = (pack.worldSystems && pack.worldSystems.effectsOf) ? pack.worldSystems.effectsOf(ws) : null;
      ctx = ctx || {};

      /* 1) 判定链（无 check = 直过） */
      var checks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
      var st = { ws: ws, pack: pack, D: D, mods: mods, eff: eff, ctx: ctx, sanyanUsed: false };
      /* 法宝·捆仙索（H10）：选择类奇遇判定直通（触发即入冷却，法宝全录 H10） */
      if (checks.length && SQ.Treasures && pack.treasures) {
        st.autoPass = SQ.Treasures.choiceAutoPass(ws, pack, D, now);
        if (st.autoPass && ctx.log) ctx.log('event', SQ.t('treasure.h10.auto', null, wid));
      }
      var chain = SQ.Events.runChain(checks, st);

      /* 2) karma 照记（善行判定守则：判定只影响物质收益） */
      var karma = br.karma || 0;
      ws.karmaEventScore = (ws.karmaEventScore || 0) + karma;

      /* 3) 收益结算：失败 → 正向减半；failE（判定挂在 check 上）全额追加。
       * 双缩放锚（§十三.8）：灵石挂刷图曲线、修为挂三次方；一律先缩放再 raw 入账，
       * 保证 feed / 结果页显示的数字 == 实际扣加的数字。 */
      var applied = {};
      var mult = chain.pass ? 1 : 0.5;
      var scales = { stones: stoneScaleOf(ws, D), qi: qiScaleOf(ws, D) };
      /* branchKarma / gateKarma（缘尽收敛批 · 引擎卷 v1.10 §3.6）：绝交锁双门槛与降级扣减的定标源。
       * gateKarma = 结算后 karma 投影值——此刻 ws.karma 仍是上一次覆盖式重算的缓存，本分支 karma 已
       * 计入 karmaEventScore 但尚未重算，故用「缓存 + 分支值」做门槛判定（含本桩恶行的推线效果）。 */
      var actx = { log: ctx.log, now: now, raw: true, eventId: ev.id, profile: ctx.profile,
        branchKarma: karma, gateKarma: (ws.karma || 0) + karma, applied: applied };
      /* 天骄专属事件（天骄卷 §6.1）：bond 收益的 '$prodigy' 占位符 → 触发槽位实际 id
       * （pendingChoice.prodigy，同档多名天骄共用同一事件文本） */
      var prodigyPid = (ws.pendingChoice && ws.pendingChoice.id === evId && ws.pendingChoice.prodigy) || null;
      (br.gain || []).forEach(function (g) {
        if (g.type === 'bond' && g.npc === '$prodigy' && prodigyPid) g = Object.assign({}, g, { npc: prodigyPid });
        /* 收益递增载体（第卌四批 · 族中寻仇链 `ev.escalate`）：倍率只乘灵石那一项，且**必须先复制对象**——
         * `br.gain` 是模板里的共享字面量，就地改 n 会把下一次结算一起污染（applyEffects 写传入对象那次
         * 同族缺陷的教训，第廿四批在册）。倍率由世界包给（连胜计数在它那儿），封顶 STREAK_CAP 也在那儿。 */
        if (ev.escalate && g.type === 'stones' && pack.worldSystems && pack.worldSystems.escalationOf) {
          var escG = pack.worldSystems.escalationOf(ws);
          if (escG !== 1) {
            g = Object.assign({}, g, { n: Array.isArray(g.n) ? [g.n[0] * escG, g.n[1] * escG] : g.n * escG });
          }
        }
        var e = SQ.Events.gainToEff(g, mult, scales, applied);
        if (!e) return;
        /* 独占授予条件 = 指定分支 + 判定链全过（专属事件池 v2.0.1 §一）；
         * 失败 → 只解锁图鉴（seen 已在 fire 时记录），奖励不落袋 */
        if ((g.type === 'exclusiveGear' || g.type === 'exclusiveArt') && !chain.pass) {
          applied.exclusiveLocked = g.id;
          delete applied.exclusiveGear; delete applied.exclusiveArt;
          return;
        }
        /* 势力批 v2.4 + 二批 A5：特席/记脸/极品/法宝联动授予类 = 判定过才兑现（败 → failE 重伤已另行全额结算） */
        if ((g.type === 'merchant' || g.type === 'merchantScout' || g.type === 'primeGear' || g.type === 'primeArt' || g.type === 'treasure') && !chain.pass) {
          applied.gated = true;
          delete applied.merchant; delete applied.merchantScout; delete applied.primeGear; delete applied.primeArt; delete applied.treasure;
          return;
        }
        SQ.Events.applyEffects(ws, pack, D, mods, e, actx);
      });
      /* 势力批 v2.4 §8：cdFailHours = 判定失败后该奇遇再封印 N 小时。
       * 🆕 神秘商人节律批 2026-10-10 语义修正（消除二次加值）：容器 ws.eventCooldowns 存的是**触发时刻**
       *   —— 读端 buildPool:498 判 `now < 存值 + cooldownHours*3600e3`，同型判定行 rumors.js:223（守卫取值在 :222） ——
       *   而原实现直接把**到期时刻**写进来（now + cdFailHours）⇒ 判据把 cdFailHours 与 cooldownHours
       *   **各加一次** ⇒ 正典写「1 小时封印」而实测 2.0 小时（本批执行取证量出来的）。
       *   神秘商人的常规冷却由 1h 抬到 12h 后，若不同批改这里，封印会悄悄变成 13h ——
       *   缺陷随参数放大，正是上一批 A8 那条「写了没人接」的近亲：写进去的值被读端多加了一次。
       *   现按 max 语义写成**等效触发时刻**：
       *     目标解禁 = max(常规解禁 = now + cdH, 失败封印 = now + cdFailHours)
       *     ⇒ 存值   = now + (max(cdH, cdFailHours) − cdH) * 3600e3
       *   ⇒ 失败封印既不缩短常规冷却、也不额外膨胀；cdFailHours ≤ cdH 时该写点退化成无害空操作
       *   （失败不延长，因为常规冷却本来就更长）。判据 = 冒烟 #145（改成按读端同一判据反解解禁时刻）+ #288。 */
      if (!chain.pass && br.cdFailHours) {
        var cdHx = ev.cooldownHours != null ? ev.cooldownHours : (ev.cd != null ? ev.cd : 0);
        ws.eventCooldowns[ev.id] = now + (Math.max(cdHx, br.cdFailHours) - cdHx) * 3600 * 1000;
      }
      if (!chain.pass && chain.failed && chain.failed.failE) {
        /* failE 全额追加（不减半）；区间先掷定为实值 + 同一份实值预缩放 → 结算与展示同源 */
        var fEff = resolveEff(chain.failed.failE);
        if (fEff.stones != null) fEff.stones = Math.round(fEff.stones * scales.stones);
        if (fEff.qi != null) fEff.qi = Math.round(fEff.qi * scales.qi);
        SQ.Events.applyEffects(ws, pack, D, mods, fEff,
          { log: ctx.log, now: now, raw: true, eventId: ev.id, profile: ctx.profile });
        applied.fail = fEff;
      }

      /* 4) 叙事流入档（新在前，≤EVENT_FEED_CAP；UI §3.5 奇遇页消费；
       * via = 触发通道溯源（G17 传闻定向触发 'rumor'，随机奇遇无此字段），feed 卡「闻」角标消费 */
      ws.eventHistory.feed.unshift({
        id: ev.id, ts: now, branch: branchKey, tier: ev.tier, nature: ev.nature,
        pass: chain.pass, hadCheck: checks.length > 0, karma: karma, eff: applied,
        via: (ws.pendingChoice && ws.pendingChoice.id === evId && ws.pendingChoice.via) || null
      });
      if (ws.eventHistory.feed.length > D.EVENT_FEED_CAP) {
        ws.eventHistory.feed = ws.eventHistory.feed.slice(0, D.EVENT_FEED_CAP);
      }

      /* 5) 日志行 + 清挂起 + 重算 */
      var karmaTxt = karma >= 0
        ? SQ.t('event.karma.pos', { n: karma }, wid)
        : SQ.t('event.karma.neg', { n: karma }, wid);
      if (ctx.log) {
        ctx.log('event', SQ.t('log.event.resolve', {
          tag: SQ.t('event.tag', null, wid),
          grade: SQ.t('event.tier.' + ev.tier, null, wid) + '·' + SQ.t('event.nature.' + ev.nature, null, wid),
          name: SQ.t('event.' + ev.id + '.name', null, wid),
          story: SQ.t('event.' + ev.id + '.story', null, wid),
          branch: SQ.t('event.' + ev.id + '.branch.' + branchKey, null, wid),
          check: checks.length
            ? SQ.t('log.event.checkmark', { res: SQ.t(chain.pass ? 'check.ok' : 'check.fail', null, wid) }, wid)
            : '',
          result: effText(ws, pack, D, applied),
          karma: karmaTxt
        }, wid));
      }
      if (ws.pendingChoice && ws.pendingChoice.id === evId) ws.pendingChoice = null;
      pack.recalcDerived(ws, ctx.profile);
      return { karma: karma, karmaTxt: karmaTxt, pass: chain.pass, eff: applied, branch: branchKey, ev: ev };
    }
  };
})();
