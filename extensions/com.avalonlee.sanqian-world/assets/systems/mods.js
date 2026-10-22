/* systems/mods.js — 乘区收集器（详设 §八 归属总表的唯一实现点）
 * 规则：同乘区加算、乘区之间乘算；所有加成来源（天赋/功法/装备/buff/丹药/属性被动/
 * 装备特殊词条/功法特殊属性）统一在此登记，防止两处系统重复吃同一加成。
 * collect(profile, ws, pack, D) → {
 *   sum: {qiRate, qiCap, ..., realmCost, tribBonus, tribFailLossMod},   // 各乘区加算合计
 *   detail: {field: {talent, arts, gear, buff, attr}},                  // UI 明细浮层用
 *   atk: Σ装备atk, resist: Σ装备resist(+金刚质),
 *   hooks: {poolId: 参数合计},   // 功法特殊属性（挂点白名单，工程规范 §2.2）
 *   gearSpecials: {effectField: Σ} // 装备特殊词条已并入 sum，此处仅登记 ignore_req 等开关
 * }
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var FIELDS = ['qiRate', 'qiCap', 'offlineEff', 'combatSpeed', 'combatPower', 'dropRate',
    'stonesRate', 'shopCost', 'eventRate', 'eventLuck', 'realmCost', 'tribBonus',
    'tribFailLossMod', 'artsSpeed', 'gearLuck', 'checkBonus', 'attrBonusAmp'];

  function zeros() {
    var o = {};
    for (var i = 0; i < FIELDS.length; i++) o[FIELDS[i]] = 0;
    return o;
  }

  function add(target, src) {
    for (var k in src) {
      if (typeof src[k] !== 'number') continue;
      if (target[k] === undefined) target[k] = 0;
      target[k] += src[k];
    }
  }

  /* 机制天赋挂点白名单（天赋池设计 §三·补 · 系统深化批 A1）：命中即分流进 hooks，
   * 与功法特殊属性/法宝签名同通道消费；yufeng 唯一乘算型（Π 合并，见 collect 注记）。 */
  var TALENT_HOOK_KEYS = ['on_bottleneck_power', 'shikui', 'yufeng', 'on_kill_drop', 'on_trib_next', 'mingwang'];

  SQ.Mods = {
    FIELDS: FIELDS,
    TALENT_HOOK_KEYS: TALENT_HOOK_KEYS,

    collect: function (profile, ws, pack, D) {
      var sum = zeros();
      var detail = {};
      function note(field, source, v) {
        if (!v) return;
        sum[field] = (sum[field] || 0) + v;
        detail[field] = detail[field] || { talent: 0, arts: 0, gear: 0, buff: 0, attr: 0, cave: 0, caveFac: 0, bond: 0, spouse: 0, treasure: 0, faction: 0, synergy: 0, tiandao: 0, codex: 0, legacy: 0 };
        detail[field][source] += v;
      }
      var atk = 0, resist = 0;
      var hooks = {};          /* 功法特殊属性/机制天赋：poolId|裸hook名 → 参数（同池多源取合计） */
      var flags = {};          /* 开关类（ignore_req 等） */
      /* yufeng 乘算合并（天赋池设计 §三·补 实施注记 2）：瓶颈间隔惩罚是乘数，
       * 各来源值一律进因子表、末端 Π 合并——功法两部 0.8×0.8=0.64（修复旧加算 1.6 反增缺陷），
       * 功法 0.8 × 天赋 0.92 = 0.736（#166）。combat.js 读点 pen *= hooks.yufeng 不变。 */
      var yufengFactors = [];

      /* 1) 天赋（profile.talents 锁定态 + 转世天赋槽 profile.legacyTalents ≤2，轮回卷 §3.3——
       * 独立槽位不占常规名额，但机制词汇同源：挂点白名单键分流进 hooks，其余键照旧入乘区） */
      (profile.talents || []).concat(profile.legacyTalents || []).forEach(function (t) {
        for (var k in t.effects) {
          var v = t.effects[k];
          if (typeof v !== 'number') continue;
          if (TALENT_HOOK_KEYS.indexOf(k) < 0) { note(k, 'talent', v); continue; }
          if (k === 'yufeng') { if (v > 0) yufengFactors.push(v); continue; }
          hooks[k] = (hooks[k] || 0) + v;
        }
      });

      /* 2) 功法：只有槽内（artsSlots ∩ artsKnown）生效；效果 = 每级 × 等级（0~5） */
      var artsMap = pack.artsMap();
      var slotted = (ws.artsSlots || []).filter(function (id) {
        return (ws.artsKnown || []).indexOf(id) >= 0;
      });
      slotted.forEach(function (id) {
        var a = artsMap[id];
        if (!a) return;
        var lv = ws.artsLevels[id] || 0;
        /* effectsFixed（校对批裁定 · §4.5）：列内字段 Lv1 全效不随等级缩放（如太上忘情篇 tribFailLossMod −8pp，防 Lv9 −72pp 击穿 clamp） */
        var fx = a.effectsFixed || null;
        for (var k in a.effects) {
          var lvm = (fx && fx.indexOf(k) >= 0) ? (lv > 0 ? 1 : 0) : lv;
          note(k, 'arts', a.effects[k] * lvm);
        }
        /* 特殊属性：Lv1 即全效（只解锁不缩放，详设 §4.5）；未入门（架上 / 坏档 Lv0）不生效。
         * yufeng（御风系）走乘算因子表（§三·补 注记 2：同池多部加算会把乘数叠反，本批统一 Π 合并） */
        if (lv > 0 && a.special) {
          var def = D.SPECIAL_POOL[a.special.pool];
          if (def) {
            var gv = def.grades[a.special.grade];
            if (a.special.pool === 'yufeng') { if (gv > 0) yufengFactors.push(gv); }
            else hooks[a.special.pool] = (hooks[a.special.pool] || 0) + gv;
          }
        }
      });

      /* 3) 装备（4 槽已佩戴）：qiBonus→qiRate 乘区；atk/resist 独立合计；特殊词条入乘区
       *    ⚠️ 装备侧 tribBonus **只取最强一份**（第卌二批 · 渡劫难度批）：四件各带「雷纹」旧口径
       *    = +0.05×4 = +0.20，与功法 / 善恶 / 护法同向叠加后足以把压陡的 base 曲线整个抹平
       *    （探针实测：上品四件套 + 善名 300 + 道护④ 即顶满 P_CLAMP 0.95）。成算是**唯一
       *    不给堆叠余量的轴**，其余字段（atk/resist/qiRate/shopCost…）逐件加算一字未动。 */
      var gearTribBest = 0;
      for (var slot in ws.gear) {
        var it = ws.gear[slot];
        if (!it) continue;
        atk += it.atk || 0;
        resist += it.resist || 0;
        if (it.qiBonus) note('qiRate', 'gear', it.qiBonus);
        if (it.special === 'adamantine') resist += D.ADAMANTINE_RESIST;
        var se = it.special && D.GEAR_SPECIAL_EFFECTS[it.special];
        if (se) for (var k2 in se) {
          if (k2 === 'tribBonus') { if (se[k2] > gearTribBest) gearTribBest = se[k2]; continue; }
          note(k2, 'gear', se[k2]);
        }
        if (it.special === 'ignore_req') flags.ignore_req = true;
      }
      if (gearTribBest) note('tribBonus', 'gear', gearTribBest);

      /* 4) buff（未过期；过期清理在 claim 内做，这里再过滤一道防御） */
      var now = Date.now();
      (ws.buffs || []).forEach(function (b) {
        if (b.until > now && FIELDS.indexOf(b.field) >= 0) note(b.field, 'buff', b.mult);
      });

      /* 5) 属性被动（G12，带封顶；attrs 为缓存值，recalcDerived 先行；容错裸对象） */
      for (var attrId in D.ATTR_PASSIVES) {
        var ps = D.ATTR_PASSIVES[attrId];
        var v = Math.min(((ws.attrs || {})[attrId] || 0) * ps.per, ps.cap);
        if (v) note(ps.field, 'attr', v);
      }

      /* 6) 功法特殊属性中入乘区的两项（嗜血/遥悦 → stonesRate/shopCost 加算，§八登记） */
      if (hooks.shixue) note('stonesRate', 'arts', hooks.shixue);
      if (hooks.yaoyue) note('shopCost', 'arts', hooks.yaoyue);

      /* 7) 洞府签名效果（G13 · 数值详设 §8.2：来源=洞府，走既有乘区加算）
       * 驻留唯一 ⇒ 同一时刻只有一处签名生效，天然不叠加；搬离即失（读的是 ws.cave.current）。
       * caveMult 本身**不在这里**——它是独立乘区，唯一读取点为 SQ.Cave.multOf（引擎卷 §2.4）。 */
      if (SQ.Cave && pack && pack.caves) {
        var cv = SQ.Cave.current(ws, pack);
        var sig = cv && cv.signature;
        if (sig && sig.field && FIELDS.indexOf(sig.field) >= 0) note(sig.field, 'cave', sig.value);
        /* 7.5) 洞府附属设施（福地池卷 v2.0 §四 · 数值详设 §8.2 v1.23）：独立登记来源 'caveFac'，
         * 仅当前驻留福地的设施生效（搬离即失，facEffects 只读 ws.cave.current）；逐字段封顶
         * CAVE_FAC_BUDGET 在 facEffects 内 clamp（#156 对表），禁 qiRate；不并入 #128 签名预算。 */
        if (SQ.Cave.facEffects) {
          var facEff = SQ.Cave.facEffects(ws, pack, D);
          for (var fk in facEff) {
            if (FIELDS.indexOf(fk) >= 0) note(fk, 'caveFac', facEff[fk]);
          }
        }
      }

      /* 8) 道友个体助力（G14 · 引擎卷 §3.4）：field 型走既有乘区加算（来源 bond，同装备词条口径），
       * channel 型（debuff/checkPp/bottleneck/negEvent/refine/claimQi/dropExtra/shield）汇总到 mods.bonds
       * 供各消费端读取并做合计封顶；炉鼎采补期间该道友被 eachActive 跳过（助力归零，§3.8 代价②）。 */
      var bonds = { debuffXinmo: 0, debuffAll: 0, checkPp: 0, bottleneck: 0, negEvent: 0,
        refine: 0, claimQi: 0, dropExtra: 0, shield: 0 };
      if (SQ.Bonds && pack && pack.companions) {
        SQ.Bonds.eachActive(ws, pack, D, function (c, tier, v) {
          var pk = c.perk || {};
          if (pk.field && FIELDS.indexOf(pk.field) >= 0) note(pk.field, 'bond', v);
          else if (pk.channel && bonds[pk.channel] != null) bonds[pk.channel] += v;
          else if (pk.channel === 'shield') bonds.shield = tier;   /* 冥佑：只记档，周期逻辑在 bonds.blessTick */
        });
      }

      /* 9) 结缘双修（G14 · 引擎卷 §3.8 · 多道侣册一百二十三批）：qiRate 逐位相加后封顶
       * SPOUSE_QIRATE_CAP（22%）；offlineEff / xinmoReduce 取最高一重不叠加（后者仍走
       * bonds.debuffXinmo 合计封顶）。单人时逐字等于旧值。 */
      if (SQ.Bonds && ws.spouses && ws.spouses.length) {
        var sq = 0, soff = 0, sxin = 0;
        ws.spouses.forEach(function (sp) {
          var sform = (D.SPOUSE_FORMS || {})[sp.form] || {};
          sq += sform.qiRate || 0;
          if ((sform.offlineEff || 0) > soff) soff = sform.offlineEff;
          if ((sform.xinmoReduce || 0) > sxin) sxin = sform.xinmoReduce;
        });
        if (sq) note('qiRate', 'spouse', Math.min(sq, D.SPOUSE_QIRATE_CAP != null ? D.SPOUSE_QIRATE_CAP : 0.22));
        if (soff) note('offlineEff', 'spouse', soff);
        if (sxin) bonds.debuffXinmo += sxin;
      }

      /* 9.5) 势力增益（G16 · 势力批 v2.4 + 深化批 v1.23）：当前效力势力的 perk × 职级放大
       * （原值 ≤10%、放大后 ≤13.5%，§8.2 v1.23），走既有乘区加算（来源 faction）；未加入 → 零贡献 */
      if (SQ.Factions) {
        var fpk = SQ.Factions.perkOf(ws, D);
        if (fpk && FIELDS.indexOf(fpk.field) >= 0) note(fpk.field, 'faction', fpk.v);
      }

      /* 10) 法宝（G15 · 法宝全录 §四）：签名效果并入既有乘区——mult: → sum（同乘区加算，
       * 与法器/功法同口径），hook: → hooks（各 systems 消费端读取）；special 脚本型
       * （认主成长 / 资源转化 / 渡劫护体 / 杀伐）走 SQ.Treasures 主动入口，不入此处。
       * 世界未声明法宝时 collect 返回空表，既有行为零变化。 */
      if (SQ.Treasures && pack && pack.treasures) {
        var trs = SQ.Treasures.collect(ws, pack, D);
        for (var tk in trs.sum) note(tk, 'treasure', trs.sum[tk]);
        for (var th in trs.hooks) {
          if (th === 'yufeng') { if (trs.hooks[th] > 0) yufengFactors.push(trs.hooks[th]); }
          else hooks[th] = (hooks[th] || 0) + trs.hooks[th];
        }
      }

      /* 11) 组合羁绊（天赋池设计 §九 · TALENT_SYNERGIES）：锁定态 profile.talents 同时含
       * 配对两条 → 单字段加成（|value| ≤ 0.05），来源 'synergy'（detail 明细行「羁绊」）；
       * 常量挂世界包 data.js，未声明即跳过（古武零变化）。创角重抽阶段不生效（只读锁定档）。 */
      if (D && D.TALENT_SYNERGIES && profile.talents && profile.talents.length) {
        var heldIds = {};
        profile.talents.forEach(function (t) { heldIds[t.id] = 1; });
        D.TALENT_SYNERGIES.forEach(function (syn) {
          if (!syn || !syn.pair || syn.pair.length !== 2) return;
          if (!heldIds[syn.pair[0]] || !heldIds[syn.pair[1]]) return;
          if (FIELDS.indexOf(syn.field) < 0) return;
          note(syn.field, 'synergy', syn.value);
        });
      }

      /* 11.5) 天道 · 逆天称号（天道设计 §6.4）：渡过逆天大劫 → 永久 qiRate +5%——
       * 既有 qiRate 加算池新增来源行 'tiandao'（title flag 派生的常驻加项，不新增乘区字段）。 */
      if (D && D.TIANDAO && ws.tiandao && ws.tiandao.title === true) {
        note('qiRate', 'tiandao', D.TIANDAO.NIJIE_REWARD_QIRATE || 0.05);
      }
      /* 11.6) meta 层常驻微增益（轮回卷 §3.6 / 图鉴卷 §三）：'legacy'（商店 5 档 ×2%，cap +10%）
       * 与 'codex'（九面 100% 里程碑 ×0.3%，cap +3%）静态来源行——collect 无 meta 视角，
       * 由 Legacy.sync 镜像回写 ws.legacyQi/ws.codexQi（签名零改动；sim 脚本缺省 0 = 零侵入） */
      if (ws.legacyQi > 0) note('qiRate', 'legacy', Math.min(ws.legacyQi, (D.LEGACY || {}).LEGACY_QIRATE_CAP || 0.10));
      if (ws.codexQi > 0) note('qiRate', 'codex', Math.min(ws.codexQi, (D.CODEX || {}).CODEX_QIRATE_CAP || 0.03));

      /* yufeng 末端 Π 合并（无来源 → 不写键，combat.js 读点 falsy 跳过，旧档零变化） */
      if (yufengFactors.length) {
        var yf = 1;
        for (var yi = 0; yi < yufengFactors.length; yi++) yf *= yufengFactors[yi];
        hooks.yufeng = Math.round(yf * 10000) / 10000;
      }

      return {
        sum: sum, detail: detail, atk: atk, resist: resist,
        hooks: hooks, flags: flags, slotted: slotted, bonds: bonds
      };
    },

    /* 战力公式（详设 §2.2 + §八：装备 atk 加算进基数，combatPower 乘区单一加算；
     * 末端 × 阵营 combatPowerMult（ALIGN_EFFECTS，数值详设 §8.1 v1.8；世界包未声明时 = 1） */
    powerOf: function (ws, pack, D, mods) {
      var base = D.REALMS[ws.realm].power + mods.atk;
      var alignMult = 1;
      if (pack.worldSystems && pack.worldSystems.effectsOf) {
        var eff = pack.worldSystems.effectsOf(ws);
        if (eff && eff.combatPowerMult) alignMult = eff.combatPowerMult;
      }
      return base * (1 + mods.sum.combatPower) * alignMult;
    }
  };
})();
