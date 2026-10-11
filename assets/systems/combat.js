/* systems/combat.js — G3 战斗历练（秘境）：击杀模拟 / 瓶颈 / 掉落 / 通关
 * 规则源：数值详设 §二（击杀节奏 60×速度/小时、prog+5/杀、瓶颈间隔×3 且 prog 封顶 90、
 * 掉落 8%×(1+dropRate)、通关必掉品阶上浮一档）+ §6.2 秘境表。
 * 战斗只随在线 tick 推进（离线不模拟秘境，详设 §2.1 P4 登记）；结算仍走 claim 单一通道。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  SQ.Combat = {
    /* 最大已解锁秘境索引（zoneMin 条件筛选也用它） */
    maxUnlocked: function (ws, D) {
      var m = 0;
      for (var i = 0; i < D.ZONES.length; i++) if (ws.realm >= D.ZONES[i].unlock) m = i;
      return m;
    },

    /* ── 区域词缀（数值详设 §2.5 · 系统深化批 A4）────────────────
     * 本区战斗结算**局部乘区**，不进全局 mods——消费点仅 simulate（stoneEach/dropP/击杀间隔）
     * 与 bottleneckOf（need 判定线/intervalPenalty）；闭关不进战斗模拟天然豁免。
     * roll 时机：setZone 切入即掷（actions 侧）+ 驻留每 AFFIX_MS 6h 在线结算补掷（本文件）；
     * 离线不掷，回线已过期即补掷一次（与江湖传闻「离线只过期不刷新」同口径）。 */
    affixDef: function (ws, D) {
      var za = ws.zoneAffix;
      if (!za || typeof za !== 'object' || !(za.until > Date.now())) return null;
      var list = (D && D.ZONE_AFFIXES) || [];
      for (var i = 0; i < list.length; i++) if (list[i].id === za.affixId) return list[i];
      return null;   /* 未知 id → 无词缀按 ×1.0 结算（normalize 同语义） */
    },
    rollAffix: function (ws, D, now) {
      var list = (D && D.ZONE_AFFIXES) || [];
      if (!list.length) return null;
      var w = D.AFFIX_W || { pos: 4, mix: 2, neg: 2 };
      /* 三档权重 正面 4 : 混合 2 : 负面 2（档内等权） */
      var pairs = [['pos', w.pos || 0], ['mix', w.mix || 0], ['neg', w.neg || 0]]
        .filter(function (p) { return p[1] > 0; });
      var total = 0;
      pairs.forEach(function (p) { total += p[1]; });
      var r = Math.random() * total, cls = pairs[0][0];
      for (var i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r < 0) { cls = pairs[i][0]; break; } }
      var cands = list.filter(function (a) { return a.cls === cls; });
      if (!cands.length) cands = list;
      var a = cands[Math.floor(Math.random() * cands.length)];
      ws.zoneAffix = { affixId: a.id, until: (now || Date.now()) + (D.AFFIX_MS || 21600000) };
      return a;
    },

    /* 瓶颈态（详设 §2.2 + 尸傀护主/御风/精判定修正 + §2.5 词缀 needMult/intervalAdd）：
     * raw < need×needMult 时先吃瓶颈战力加成再判定；间隔惩罚 = (3（精≥中等dc → 2）+ intervalAdd) × 御风 */
    bottleneckOf: function (ws, pack, D, mods) {
      var zone = D.ZONES[ws.zone];
      var affix = SQ.Combat.affixDef(ws, D);
      var need = zone.need * ((affix && affix.needMult) || 1);
      var raw = SQ.Mods.powerOf(ws, pack, D, mods);
      if (raw >= need) return { bottleneck: false, power: raw, need: need };
      /* 瓶颈态战力 = 同一条加算式（尸傀护主 shikui + 护镖 bonds.bottleneck + 法宝 on_bottleneck_power），
       * 只留 challengePower 一份（第十四批审计 #20：这里与它各写一遍，注释还互相指着「同公式」）。 */
      var power = SQ.Combat.challengePower(ws, pack, D, mods);
      if (power >= need) return { bottleneck: false, power: power, need: need };
      var jingOk = ((ws.attrs || {}).jing || 0) >= SQ.Attrs.dcOf(ws, D, D.JING_BOTTLENECK_DC);
      var pen = jingOk ? 2 : D.BOTTLENECK_INTERVAL;
      if (affix && affix.intervalAdd) pen += affix.intervalAdd;   /* 词缀加项在基准值之上，随后仍吃御风（§2.5 字段表顺序） */
      if (mods.hooks.yufeng) pen *= mods.hooks.yufeng;
      return { bottleneck: true, power: power, need: need, intervalPenalty: pen, jingOk: jingOk };
    },

    /* 在线 dt 秒的击杀模拟；返回 {kills, stones, drops, cleared} 供日志与统计 */
    simulate: function (ws, pack, D, mods, dtSec, ctx) {
      var log = ctx && ctx.log;
      var zone = D.ZONES[ws.zone];
      var zIdx = ws.zone; /* 本轮模拟的秘境索引（本轮内恒定，供首通自动推进定位） */
      var now = (ctx && ctx.now) || Date.now();
      /* 词缀驻留判定（§2.5 roll 时机②）：无词缀 / 未知 id / 已过期 → 在线结算补掷一次
       * （离线不掷；setZone 切入即掷在 actions 侧，重掷覆盖） */
      if (!SQ.Combat.affixDef(ws, D)) SQ.Combat.rollAffix(ws, D, now);
      var affix = SQ.Combat.affixDef(ws, D);
      var bn = SQ.Combat.bottleneckOf(ws, pack, D, mods);
      var interval = D.KILL_BASE_SEC / (1 + mods.sum.combatSpeed);
      if (bn.bottleneck) interval *= bn.intervalPenalty;
      if (affix && affix.speedMult) interval /= affix.speedMult;   /* 击杀间隔 ÷ speedMult（§2.5 字段表） */
      var acc = (ws.combatAcc || 0) + dtSec;
      var kills = Math.floor(acc / interval);
      ws.combatAcc = acc - kills * interval;
      if (kills <= 0) return { kills: 0, stones: 0, drops: [], cleared: [] };

      var stonesGain = 0;
      var drops = [];
      var cleared = [];
      /* 词缀局部乘区（末端独立乘，与 mods.sum 全局加算池为乘算关系，§2.5 并存口径）；
       * 器灵技·吞噬（融合器灵卷 §8.2）：on_kill_stones 同消费点限时加项（与嗜血/噬灵加算） */
      var devour = (SQ.Fusion && SQ.Fusion.devourBonus) ? SQ.Fusion.devourBonus(ws, pack, now) : 0;
      var stoneEach = zone.stones * (1 + mods.sum.stonesRate + devour) * ((affix && affix.stonesMult) || 1);
      /* 法宝击杀侧档案（法宝全录 X05/H17/H18/X07/X12）：锁灵/开天一击/杀伐/业力——
       * 逐杀读取，与灵石乘区独立（×5 等倍率在 onKill 内结算） */
      var prof = (SQ.Treasures && pack.treasures) ? SQ.Treasures.killProfile(ws, pack, D) : null;
      /* ALIGN_EFFECTS（数值详设 §8.1 v1.13）：掉落率乘数 / 阵营分布位移 dropAlignW / 品阶上浮概率 dropTierUpChance（魔道 0.40「福缘凝华」） */
      var eff = (pack.worldSystems && pack.worldSystems.effectsOf) ? pack.worldSystems.effectsOf(ws) : null;
      var dropP = D.DROP_BASE * (1 + mods.sum.dropRate) * (eff ? eff.dropRateMult : 1) *
        ((affix && affix.dropMult) || 1);
      /* 探宝残片（§2.7）：与掉落率同消费点、同乘区口径 = SHARD_P × (1+ΣdropRate) × 词缀 dropMult */
      var shardP = (D.SHARD_P || 0) * (1 + mods.sum.dropRate) * ((affix && affix.dropMult) || 1);
      /* 材料掉落（炼丹炼器卷 §2.2）：与装备/残片同消费点独立掷判 = MAT_DROP_P × (1+ΣdropRate) × 词缀 dropMult */
      var matP = (SQ.Alchemy && D.ALCHEMY)
        ? (D.ALCHEMY.MAT_DROP_P || 0) * (1 + mods.sum.dropRate) * ((affix && affix.dropMult) || 1) : 0;
      /* 词缀 gearLuckAdd：只作用于击杀掉落（首通/域主必掉不受影响，§2.5 字段表） */
      var gearLuckAdd = (affix && affix.gearLuckAdd) || 0;
      /* 改过之助（陆小满 on_kill_drop，批 3）+ 机制天赋（乱中拾遗/斩妖夺宝/乾坤在握，
       * 天赋池设计 §三·补 注记 3）：与枯木逢春同通道的追加掉落掷，fengchun + on_kill_drop + dropExtra 三键加算 */
      var fengchun = (mods.hooks.fengchun || 0) + (mods.hooks.on_kill_drop || 0) + (mods.hooks.zaohua || 0) +
        ((mods.bonds && mods.bonds.dropExtra) || 0);   /* 造化余韵（自创签名）同线加算 */
      var progCap = bn.bottleneck ? D.BOTTLENECK_PROG_CAP : 100;

      for (var i = 0; i < kills; i++) {
        /* 法宝单杀回调（锁灵 ×5 / 开天一击 +20 进度 / 杀伐掉落 / 每杀业力） */
        var kr = (prof && prof.active) ? SQ.Treasures.onKill(ws, pack, D, mods, prof, now, log) : null;
        stonesGain += stoneEach * (kr ? kr.stonesMult : 1);
        /* 掉落掷判（枯木逢春：追加一次独立掷判） */
        var rolls = 1 + (fengchun > 0 && Math.random() < fengchun ? 1 : 0);
        for (var r = 0; r < rolls; r++) {
          if (Math.random() < dropP) {
            var item = SQ.Gear.roll(ws, pack, D, ws.zone, mods, {
              alignW: eff && eff.dropAlignW,
              tierUpChance: eff ? eff.dropTierUpChance : 0,
              gearLuckAdd: gearLuckAdd,
              source: { type: 'zone', ref: ws.zone }
            });
            if (item.tierUp && log) {
              log('gear', SQ.t('toast.gear.tierup', {
                name: item.name, tier: SQ.t('gear.tier.' + item.tier, null, pack.worldId)
              }, pack.worldId));
            }
            var res = SQ.Gear.autoEquip(ws, pack, D, mods, item, log);
            drops.push({ item: item, res: res });
          }
        }
        /* 探宝残片掉落（§2.7）：每杀独立掷，分区计数（纯计数字段不进 Ledger，恒等式 #113 零影响） */
        if (shardP > 0 && Math.random() < shardP) {
          if (!Array.isArray(ws.shards)) ws.shards = [];
          ws.shards[zIdx] = Math.max(0, Math.floor(ws.shards[zIdx] || 0)) + 1;
        }
        /* 材料掉落（炼丹炼器卷 §2.2）：三路掷判相互独立，命中得当前区主材池随机 1 枚 */
        if (matP > 0 && Math.random() < matP) {
          SQ.Alchemy.killGain(ws, pack, D, zIdx, now);
        }
        /* 进度（法宝·开天一击 progBonus 叠加，法宝全录 X05） */
        var z = ws.zone;
        var p0 = ws.prog[z] || 0;
        var p1 = Math.min(progCap, p0 + D.PROG_PER_KILL + (kr ? kr.progBonus : 0));
        ws.prog[z] = p1;
        if (p1 >= 100) {
          ws.prog[z] = 0;
          /* 通关必掉：品阶权重上浮一档（独立于词缀 gearLuckAdd，§2.5 末注） */
          var bonus = SQ.Gear.roll(ws, pack, D, z, mods, {
            tierUp: true, alignW: eff && eff.dropAlignW, source: { type: 'zone', ref: z }
          });
          var bres = SQ.Gear.autoEquip(ws, pack, D, mods, bonus, log);
          drops.push({ item: bonus, res: bres, clear: true });
          if ((ws.cleared || []).indexOf(z) < 0) {
            ws.cleared.push(z);
            cleared.push(z);
            /* 首通奖励：obtain.type='zone' 且 zone===z 的功法 */
            var artsMap = pack.artsMap();
            for (var id in artsMap) {
              if (artsMap[id].obtain.type === 'zone' && artsMap[id].obtain.zone === z) {
                SQ.Arts.gainArt(ws, pack, D, id, log);
              }
            }
            /* 首通奖励：法宝（法宝全录 §五 秘境首通授予，ZONE_TREASURE 映射） */
            if (SQ.Treasures && pack.treasures && pack.treasures.ZONE_TREASURE) {
              var tz = pack.treasures.ZONE_TREASURE[z];
              if (tz) SQ.Treasures.gain(ws, pack, D, tz, log);
            }
            /* 域主现世（§2.6 · 系统深化批 A4）：首通附赠奖励发放点**不变**——域主战是新增
             * 高潮挑战、不是奖励前置门槛；自动推进点后移至域主战胜利后（maybeAdvance 判定）。
             * 已通关旧区不追溯生成（旧档 zoneBoss=null 维持现行「首通即推进」口径）。 */
            ws.zoneBoss = { zone: z, state: 'ready', retryAt: 0 };
            if (log) log('combat', SQ.t('zone.boss.appear', {
              zone: SQ.t('combat.zone.' + z, null, pack.worldId)
            }, pack.worldId));
            /* 天道天象钩子（天道设计 §7.1）：秘境首通入账瞬间——事件钩子产物，零数值侵入 */
            if (SQ.Tiandao && SQ.Tiandao.onZoneClear) SQ.Tiandao.onZoneClear(ws, pack, D, z, now);
          }
          if (bn.bottleneck) break; /* 理论上到不了：封顶 90 < 100 */
        }
      }
      /* 首通自动推进（体验手感批 · 数值详设 §2.4 v1.26 → §2.6 改造）：本轮首通了进行中的 zIdx 后——
       * 域主现世未斩 → 推进挂起（先打高潮战）；否则下一区已解锁且战力达标 → 自动 ws.zone+1
       * 无缝进入新目标；不足 → 牵引 hint 日志。放循环外：本轮击杀仍按 zIdx 掉落档结算。 */
      if (cleared.indexOf(zIdx) >= 0) {
        SQ.Combat.maybeAdvance(ws, pack, D, mods, zIdx, log);
      }
      ws.kills += kills;
      /* 词缀遭遇入录（图鉴卷 §2.7 词缀层：在该词缀生效区内击杀达标即录，8 条各遭遇一次） */
      if (kills > 0 && ws.zoneAffix && ws.zoneAffix.until > now) {
        if (!ws.affixSeen) ws.affixSeen = {};
        ws.affixSeen[ws.zoneAffix.affixId] = 1;
      }
      /* 器灵温养·战斗击杀来源（融合器灵卷 §6.1）：+0.5/杀，只对祭出中法宝累计 */
      if (SQ.Fusion && SQ.Fusion.onKills) SQ.Fusion.onKills(ws, pack, D, kills, now);
      /* 战功记账（战功制 · 势力全录卷 §7.1）：单点整批记账（不逐杀、无逐杀日志防刷屏，进度由
       * 势力页进度条消费）——仅 ①战争进行中 ②已入场 joined='in' ③本方为交战方 三条件齐备才累积；
       * 闭关不产击杀（simulate 不被调用）自然不积战功，无需特判。 */
      var warM = ws.factionWar;
      if (warM && warM.until > now && warM.joined === 'in' && SQ.Factions && SQ.Factions.warSideOf(ws)) {
        var mpk = (D.FACTION_WAR || {}).MERIT_PER_KILL;
        warM.merit = Math.floor((warM.merit || 0) + kills * (mpk != null ? mpk : 1));
      }
      /* 财柱总账（引擎卷 §4.1）：击杀灵石入 in.kill（实际增量口径，含 on_kill_stones 挂点） */
      var st0 = ws.stones;
      /* 灵石是整数货币：stonesRate 会让单杀值带小数，落账即取整，
       * 保证 ledger 记的就是实际增量（恒等式 100+Σin−Σout === stones 零漂移，#113） */
      ws.stones = Math.round(ws.stones + stonesGain);
      stonesGain = SQ.Ledger.note(ws, 'in', 'kill', ws.stones - st0);
      return { kills: kills, stones: stonesGain, drops: drops, cleared: cleared };
    },

    /* 首通/域主胜利后的自动推进（§2.4 牵引手感完整保留，只是中间多一场高潮战）：
     * 域主现世未斩 → 挂起；下一区已解锁且战力达标 → 无缝切换 +「首通牵引」日志；
     * 达标不足 → 牵引 hint 日志留守刷取；未解锁 → 都不写。返回是否切换。 */
    maybeAdvance: function (ws, pack, D, mods, zIdx, log) {
      var zb = ws.zoneBoss;
      if (zb && zb.zone === zIdx && zb.state === 'ready') return false;   /* 先打域主 */
      var nz = zIdx + 1;
      if (nz < D.ZONES.length && ws.realm >= D.ZONES[nz].unlock) {
        if (SQ.Mods.powerOf(ws, pack, D, mods) >= D.ZONES[nz].need) {
          ws.zone = nz;
          if (log) log('combat', SQ.t('zone.autoadvance', {
            to: SQ.t('combat.zone.' + nz, null, pack.worldId)
          }, pack.worldId));
          return true;
        } else if (log) {
          log('combat', SQ.t('zone.autoadvance.hint', {
            to: SQ.t('combat.zone.' + nz, null, pack.worldId)
          }, pack.worldId));
        }
      }
      return false;
    },

    /* 挑战战力（§2.6「战力读取与 §2.2 瓶颈判定同源口径」）：raw × (1 + 尸傀/护镖/机制天赋
     * on_bottleneck_power 同读点加算)——瓶颈侧战力加成可备战域主（与 bottleneckOf 同公式，
     * 但不以 zone.need 门控：域主线在 need 之上，加成无条件参与）。 */
    challengePower: function (ws, pack, D, mods) {
      var raw = SQ.Mods.powerOf(ws, pack, D, mods);
      var shikui = mods.hooks.shikui || 0;
      var bnBond = (mods.bonds && mods.bonds.bottleneck) || 0;
      var trBn = (mods.hooks && mods.hooks.on_bottleneck_power) || 0;
      return raw * (1 + shikui + bnBond + trBn);
    },

    /* ── 域主精英战（数值详设 §2.6 · 系统深化批 A4）────────────────
     * 一次性掷判：powerOf ≥ ZONES[zone].need × BOSS_MULT(1.8)（读**挑战瞬间**当前战力——
     * 可先吃淬体丹/护法位/瓶颈侧战力加成等既有 buff 备战，战力读取与瓶颈判定同源口径）。
     * 胜 = ①必掉品阶上浮两档（封顶仙品，独立于词缀 gearLuckAdd）②首杀灵石 = stones×10 记
     * in.event ③state 'dead' + 触发自动推进点；败 = CD 10min（现实时间），无其他惩罚。
     * 域主态随档持久，离线回来仍在仍可挑战（离线不自动结算）。mutate 通道。 */
    challengeBoss: function (ws, pack, D, mods, now, ctx) {
      var log = ctx && ctx.log;
      var zb = ws.zoneBoss;
      if (!zb || zb.state !== 'ready') return { ok: false, reason: 'none' };
      if (zb.zone !== ws.zone) return { ok: false, reason: 'zone' };
      if ((zb.retryAt || 0) > now) return { ok: false, reason: 'cd', retryAt: zb.retryAt };
      var zone = D.ZONES[zb.zone];
      var need = zone.need * (D.BOSS_MULT != null ? D.BOSS_MULT : 1.8);
      var power = SQ.Combat.challengePower(ws, pack, D, mods);
      var zName = SQ.t('combat.zone.' + zb.zone, null, pack.worldId);
      if (power < need) {
        zb.retryAt = now + (D.BOSS_RETRY_CD_MS != null ? D.BOSS_RETRY_CD_MS : 600000);
        if (log) log('combat', SQ.t('zone.boss.lose', { zone: zName }, pack.worldId));
        return { ok: true, win: false, power: power, need: need };
      }
      zb.state = 'dead';
      zb.retryAt = 0;
      /* 域主首杀入录（图鉴卷 §2.7 域主层 + 轮回卷 §2.3 域主计分供数；跨世幂等在账本侧） */
      if (!Array.isArray(ws.bossKills)) ws.bossKills = [];
      if (ws.bossKills.indexOf(zb.zone) < 0) ws.bossKills.push(zb.zone);
      var eff = (pack.worldSystems && pack.worldSystems.effectsOf) ? pack.worldSystems.effectsOf(ws) : null;
      var item = SQ.Gear.roll(ws, pack, D, zb.zone, mods, {
        tierUp: 2, alignW: eff && eff.dropAlignW, source: { type: 'boss', ref: zb.zone }
      });
      var res = SQ.Gear.autoEquip(ws, pack, D, mods, item, log);
      var stones = Math.round(zone.stones * (D.BOSS_WIN_STONE_K != null ? D.BOSS_WIN_STONE_K : 10));
      var st0 = ws.stones;
      ws.stones += stones;
      SQ.Ledger.note(ws, 'in', 'event', ws.stones - st0);
      if (log) log('combat', SQ.t('zone.boss.win', {
        zone: zName, gear: item.name, stones: SQ.fmt(stones)
      }, pack.worldId));
      var advanced = SQ.Combat.maybeAdvance(ws, pack, D, mods, zb.zone, log);
      return { ok: true, win: true, power: power, need: need, stones: stones, item: item, res: res, advanced: advanced };
    },

    /* ── 探宝残片兑换（数值详设 §2.7 · 系统深化批 A4）────────────────
     * 手动动作（mutate 通道，与势力委托交付同操作口径）：计数 ≥ SHARD_NEED(20) 兑换一次，
     * 扣 20 片递减、可重复攒重复兑；奖励四档：z0~2 随机丹药（聚气/凝神/淬体等权）/
     * z3~5 上品以上装备匣（该区权重 roll 上浮一档 + tierMin 2）/ z6~8 设施图纸 **或** 功法情报
     * **或** 地/天阶丹方 **或** 器图纸四选（choice:'fac'|'intel'|'recipe'|'bp'——炼丹卷 §3.2 渠道④
     * 扩容批落实 + §6.2 图纸渠道③残片入池（N9 收口批）；fac 满级回落 intel、recipe 全持回落 intel、
     * bp 全持回落 intel，与献秘同一 intelArts 通道 §9.3 互通）/ z9 先天法宝机缘
     * （全持有折 ZONES[9].stones×10 记 in.event）。残片不进 Ledger（四选一律零灵石流，
     * Ledger.IN_CATS/OUT_CATS 分类零新增）；奖励发放成功才扣片。 */
    exchangeShard: function (ws, pack, D, mods, zoneIdx, choice, now, log) {
      var z = (zoneIdx == null) ? ws.zone : zoneIdx;
      if (!(z >= 0 && z < D.ZONES.length)) return { ok: false, reason: 'zone' };
      var have = Math.max(0, Math.floor((ws.shards || [])[z] || 0));
      var need = D.SHARD_NEED != null ? D.SHARD_NEED : 20;
      if (have < need) return { ok: false, reason: 'shards', have: have, need: need };
      var wid = pack.worldId;
      var reward = null;
      if (z <= 2) {
        var pillIds = ['juqi', 'ningshen', 'cuiti'];
        var pid = pillIds[Math.floor(Math.random() * pillIds.length)];
        var pill = null;
        (D.PILLS || []).forEach(function (p) { if (p.id === pid) pill = p; });
        if (!pill) return { ok: false, reason: 'pool' };
        if (SQ.Events && SQ.Events.applyEffects) {
          SQ.Events.applyEffects(ws, pack, D, mods, Object.assign({}, pill.effect), { log: log, now: now, eventId: null });   /* 传副本 = 纪律，见 events.js applyEffects 头注 */
        }
        reward = { type: 'pill', id: pid };
        if (log) log('combat', SQ.t('zone.shard.pill', { name: SQ.t('pill.' + pid + '.name', null, wid) }, wid));
      } else if (z <= 5) {
        var effS = (pack.worldSystems && pack.worldSystems.effectsOf) ? pack.worldSystems.effectsOf(ws) : null;
        var itemS = SQ.Gear.roll(ws, pack, D, z, mods, {
          tierMin: 2, tierUp: true, alignW: effS && effS.dropAlignW, source: { type: 'shard', ref: z }
        });
        var resS = SQ.Gear.autoEquip(ws, pack, D, mods, itemS, log);
        reward = { type: 'gearbox', item: itemS, res: resS };
        if (log) log('combat', SQ.t('zone.shard.gear', { name: itemS.name }, wid));
      } else if (z <= 8) {
        if (choice === 'recipe') {
          /* 扩容批第三选择（炼丹炼器卷 §3.2 渠道④）：未持有地/天阶丹方随机授予一份；
           * 全持有 → 回落 intel（与 fac 满级回落同款「总有可授」原则，不扣片即拒在 pool 校验） */
          var alR = SQ.Alchemy ? SQ.Alchemy.ensure(ws, D) : null;
          var candR = [];
          if (alR) (((D.ALCHEMY || {}).RECIPES) || []).forEach(function (rR) {
            if ((rR.tier === 'di' || rR.tier === 'tian') && alR.recipes.indexOf(rR.id) < 0) candR.push(rR.id);
          });
          if (candR.length) {
            var ridR = candR[Math.floor(Math.random() * candR.length)];
            alR.recipes.push(ridR);
            reward = { type: 'recipe', id: ridR };
            if (log) log('combat', SQ.t('alchemy.shard.recipe', { name: SQ.t('alchemy.recipe.' + ridR + '.name', null, wid) }, wid));
          } else choice = 'intel';
        }
        if (choice === 'bp') {
          /* 扩容批第四选择（炼丹卷 §6.2 图纸渠道「残片兑换」+ §2.7 档内并列选项口径，N9 收口批落值）：
           * 未持有**器图纸**随机授予一份 —— 池 = ALCHEMY.BLUEPRINTS 去 `bp_furnace` = **8 张**
           * （普通四 600 / 精制四 1500，同档丹方值 4000~12000，故等权入池无预算溢出）；
           * 丹炉图纸不入池：它的产物是 `al.furnace` flag 而非 blueprints[] 项（§6.6 / deliverPackGood 同口径），
           * 入池等于私自开出**第 5 条丹炉渠道**（§4.1 自购 + meta.unlocks + 福地丹房 + 宗门丹房 #262 已登记为 4）；
           * 全持有 → 回落 intel（与 recipe / fac 同款「总有可授」原则，不扣片即拒在 pool 校验） */
          var alB = SQ.Alchemy ? SQ.Alchemy.ensure(ws, D) : null;
          var candB = [];
          if (alB) (((D.ALCHEMY || {}).BLUEPRINTS) || []).forEach(function (bB) {
            if (!bB.furnace && alB.blueprints.indexOf(bB.id) < 0) candB.push(bB.id);
          });
          if (candB.length) {
            var bidB = candB[Math.floor(Math.random() * candB.length)];
            alB.blueprints.push(bidB);
            reward = { type: 'bp', id: bidB };
            if (log) log('combat', SQ.t('alchemy.shard.bp', { name: SQ.t('alchemy.bp.' + bidB + '.name', null, wid) }, wid));
          } else choice = 'intel';
        }
        if (!reward && choice === 'fac') {
          /* 洞府设施图纸：当前驻留福地随机设施 +1 级（营建费免除——图纸即奖励，不进 out.cave；
           * 满级/无驻留可建 → 回落情报） */
          var cave = SQ.Cave ? SQ.Cave.current(ws, pack) : null;
          var cands = [];
          if (cave) {
            var curFac = ((ws.cave && ws.cave.fac) || {})[cave.id] || {};
            (D.CAVE_FACILITIES || []).forEach(function (f) {
              if ((curFac[f.id] || 0) < (D.CAVE_FAC_MAX_LV || 3)) cands.push(f.id);
            });
          }
          if (cands.length) {
            var fid = cands[Math.floor(Math.random() * cands.length)];
            ws.cave.fac[cave.id] = ws.cave.fac[cave.id] || {};
            ws.cave.fac[cave.id][fid] = (ws.cave.fac[cave.id][fid] || 0) + 1;
            reward = { type: 'fac', cave: cave.id, fac: fid };
            if (log) log('combat', SQ.t('zone.shard.fac', {
              cave: SQ.t('cave.' + cave.id + '.name', null, wid),
              fac: SQ.t('cave.fac.' + fid + '.name', null, wid)
            }, wid));
          } else choice = 'intel';
        }
        if (!reward) {
          if (choice !== 'intel') return { ok: false, reason: 'choice' };   /* 二选一必选（UI 弹层） */
          var aid = SQ.Factions.rollIntelArtFree(ws, pack, D);
          if (!aid) return { ok: false, reason: 'pool' };                    /* 无可授 → 不扣片 */
          ws.intelArts = ws.intelArts || {};
          ws.intelArts[aid] = true;
          reward = { type: 'intel', id: aid };
          if (log) log('combat', SQ.t('zone.shard.intel', { name: SQ.t('skill.' + aid + '.name', null, wid) }, wid));
        }
      } else {
        /* z9：先天法宝机缘——未持有先天件（kind 'xian'）随机授予 1 件；全持有折灵石记 in.event */
        var candX = [];
        if (pack.treasures && pack.treasures.LIST && SQ.Treasures) {
          pack.treasures.LIST.forEach(function (d) {
            if (d.kind === 'xian' && !SQ.Treasures.entryOf(ws, d.id)) candX.push(d.id);
          });
        }
        if (candX.length) {
          var tid = candX[Math.floor(Math.random() * candX.length)];
          SQ.Treasures.gain(ws, pack, D, tid, log);
          reward = { type: 'treasure', id: tid };
        } else {
          var z9 = D.ZONES[D.ZONES.length - 1];
          var st9 = Math.round(z9.stones * (D.SHARD_Z9_STONE_K != null ? D.SHARD_Z9_STONE_K : 10));
          var s0 = ws.stones;
          ws.stones += st9;
          SQ.Ledger.note(ws, 'in', 'event', ws.stones - s0);
          reward = { type: 'stones', n: st9 };
          if (log) log('combat', SQ.t('zone.shard.stones', { n: SQ.fmt(st9) }, wid));
        }
      }
      if (!reward) return { ok: false, reason: 'pool' };
      /* 扣片（递减，可重复攒重复兑）——只在奖励成功发放后 */
      ws.shards[z] = have - need;
      return { ok: true, zone: z, reward: reward };
    }
  };
})();
