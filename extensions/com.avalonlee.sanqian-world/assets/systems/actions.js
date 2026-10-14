/* systems/actions.js — 玩家操作入口（全部走 core.mutate 单一写入通道，验收 4.6 #68）
 * view 层只调 SQ.Actions.*，不直接改存档字段。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  function packOf(s) { return SQ.Worlds[s.profile.worldId].pack; }
  function dataOf(s) { return SQ.Worlds[s.profile.worldId].pack.data; }

  SQ.Actions = {
    /* 修行状态切换（修行状态批）：seclude 闭关领悟 / venture 外出历练；同状态幂等不动账。
     * 只改 ws.mode，不碰角色数据；切换写一条系统日志（mode.log.*，世界词表分卷）。 */
    setMode: function (ref, mode) {
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var D = dataOf(s);
        if (!ws || !D.MODES || !D.MODES[mode] || ws.mode === mode) return;
        ws.mode = mode;
        SQ.Log.push(ws, 'sys', SQ.t('mode.log.' + mode, null, s.profile.worldId));
      });
    },

    /* 清除全部临时 buff（体验批 · 设置页）：清空 ws.buffs（含增益 / 减益 / eventShield 层），
     * 不动角色其他状态；用途：一键清掉累积的奇遇与渡劫 buff，回到干净挂机口径。无 buff 时幂等。 */
    clearBuffs: function (ref) {
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        if (!ws || !Array.isArray(ws.buffs) || !ws.buffs.length) return;
        ws.buffs = [];
        SQ.Log.push(ws, 'sys', SQ.t('settings.clearbuffs.log', null, s.profile.worldId));
      });
    },

    /* 切换进行中秘境（须已解锁：realm ≥ ZONES[z].unlock）；
     * 区域词缀（数值详设 §2.5）：切入该区（含回访旧区）立即重掷覆盖，until = now + 6h */
    setZone: function (ref, z) {
      return SQ.mutate(ref, function (s) {
        var D = dataOf(s);
        var ws = s.worlds[s.profile.worldId];
        if (z < 0 || z >= D.ZONES.length || ws.realm < D.ZONES[z].unlock) return;
        ws.zone = z;
        if (SQ.Combat && SQ.Combat.rollAffix) SQ.Combat.rollAffix(ws, D, Date.now());
      });
    },

    /* 挑战域主（数值详设 §2.6 · 系统深化批 A4）：一次性掷判 need×1.8；胜 = 上浮两档必掉 +
     * 灵石×10（in.event）+ 自动推进点；败 = CD 10min 无其他惩罚。返回结果供演出/toast 消费 */
    challengeBoss: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Combat.challengeBoss(ws, pack, D, mods, Date.now(), { log: log, profile: s.profile });
      });
      return out;
    },

    /* 残片兑换（数值详设 §2.7 · 系统深化批 A4 + 扩容批三选）：z6~8 需 choice（'fac'|'intel'|'recipe'）；
     * 奖励发放成功才扣片；兑换为手动动作（与势力委托交付同操作口径） */
    exchangeShard: async function (ref, zoneIdx, choice) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Combat.exchangeShard(ws, pack, D, mods, zoneIdx, choice, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    slotArt: function (ref, id, replaceId) {
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        SQ.Arts.slot(ws, packOf(s), dataOf(s), id, replaceId);
      });
    },
    unslotArt: function (ref, id) {
      return SQ.mutate(ref, function (s) {
        SQ.Arts.unslot(s.worlds[s.profile.worldId], id);
      });
    },
    /* 设主修（GitHub issue #3）：玩家点定六槽中任一功法为主修；拒因由视图如实弹文案。
     * 主修只改修习增速的指向，不动任何属性乘区 ⇒ 无需 recalcDerived。 */
    setMainArt: async function (ref, id) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        out = SQ.Arts.setMain(s.worlds[s.profile.worldId], id);
      });
      return out;
    },
    upgradeArt: function (ref, id) {
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        var lv0 = SQ.Arts.levelOf(ws, id);
        var cost = SQ.Arts.upgradeCost(ws, pack, D, id, mods);
        if (SQ.Arts.upgrade(ws, pack, D, id, mods)) {
          /* 日志「功法」分类（v2.3）：升级成功即记（含消耗修为口径） */
          SQ.Log.push(ws, 'arts', SQ.t('arts.upgraded', {
            name: SQ.t('skill.' + id + '.name', null, s.profile.worldId),
            lv: lv0 + 1, res: SQ.t('resource.primary', null, s.profile.worldId), n: SQ.fmt(cost)
          }, s.profile.worldId));
        }
      });
    },

    /* 散功 / 弃置（道具处置打磨包）：已入门 → 散功、架上未入门 → 弃置；返还灵石入 in.refine。
     * 返回 {value, known} 供 toast 消费（null = 不可处置，UI 已拦截）。 */
    salvageArt: async function (ref, id) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Arts.salvage(ws, packOf(s), dataOf(s), id);
        if (out && log) {
          log('arts', SQ.t('arts.salvaged', {
            name: SQ.t('skill.' + id + '.name', null, s.profile.worldId),
            n: SQ.fmt(out.value), cur: SQ.t('resource.currency', null, s.profile.worldId)
          }, s.profile.worldId));
        }
        /* 自创部散功联动（融合器灵卷 §2.1）：移出 ws.fusion.customs + 重注册（返还走既有口径） */
        if (out && SQ.Fusion && SQ.Fusion.dropCustom) SQ.Fusion.dropCustom(ws, dataOf(s), id);
      });
      return out;
    },

    /* 库藏阁手动炼化（道具处置打磨包）：第 idx 件 → 灵石；独占豁免。返回 {ok, item?, value?, reason?} */
    refineGear: async function (ref, idx, expect) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Gear.salvage(ws, pack, D, mods, idx, log, expect);
      });
      return out;
    },

    buy: function (ref, idx, black, expect) {
      var out = null;
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        /* 第廿六批：原传 null ⇒ 坊市/黑市买到的东西**全程不写日志**（入门、上架、折算、
         * 溢出炼化全都没有痕迹），玩家事后无从知道自己那单到底落到了哪里。与其余动作同规范。 */
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Shop.buy(ws, pack, D, mods, idx, !!black, log, expect);
      }).then(function () { return out; });   /* 结果原样回给视图：匣满拒单不许静默（第十七批丹药入匣带来的新拒因） */
    },
    refreshShop: function (ref, black) {
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        SQ.Shop.refresh(ws, pack, D, mods, !!black);
      });
    },

    /* 选择奇遇分支（三分支抉择制：branchKey = 'right'|'evil'|'neutral'；模态框「必须选择才关闭」）；
     * 返回 {karma, karmaTxt, pass, eff, branch, ev} 供结果页 */
    resolveChoice: async function (ref, branchKey) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        if (!ws.pendingChoice) return;
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        /* 天骄专属事件（狭路相逢/一笑泯恩仇/结缘三事件）：resolveBranch 清挂起前先抓槽位 id */
        var pc = ws.pendingChoice;
        var prodigyPid = pc.prodigy || null;
        var pcId = pc.id;
        out = SQ.Events.resolveBranch(ws, pack, D, mods, pcId, branchKey, Date.now(),
          { log: log, profile: s.profile });
        if (prodigyPid && out && SQ.Prodigy) {
          SQ.Prodigy.onEventResolved(ws, s, pack, D, pcId, branchKey, out.pass, Date.now(), prodigyPid);
          pack.recalcDerived(ws, s.profile);   /* 斩杀 karma / 释怀 bond 即刻覆盖式重算 */
        }
      });
      return out;
    },

    /* 入驻 / 迁居洞府（G13 · 引擎卷 §2.3）：资格全过才动账——灵石一次付清（获得所有权，
     * 此后往返不再付费）、记 ledger.out.cave、起迁居冷却（1 游戏年，走查批 v2.8 口径）；
     * 返回结果供 CONFIRM 与 toast 消费 */
    enterCave: async function (ref, id) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Cave.enter(ws, pack, D, mods, id, Date.now(), { log: log, profile: s.profile });
      });
      return out;
    },

    /* 营建/升级附属设施（G13 v2.0 · 福地池卷 §四）：仅限已拥有福地；扣灵石记 out.cave；
     * 等级 +1（≤CAVE_FAC_MAX_LV）；返回 {ok, lv?, cost?, reason?} 供 toast 消费 */
    buildFacility: async function (ref, caveId, facId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Cave.buildFacility(ws, pack, D, caveId, facId, Date.now(), { log: log, profile: s.profile });
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* 独占法宝手动替换（批 2·B5 / 交互说明 §4.4 ★）：CONFIRM 后调用；
     * 无灵石流动（独占永不炼化），返回 {ok, item?, old?, reason?} 供 toast 消费 */
    swapGear: async function (ref, idx) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Gear.manualSwap(ws, pack, D, mods, idx, log);
      });
      return out;
    },

    /* 提亲（G14 结缘双修 · 引擎卷 §3.8）：CONFIRM 三形态后调用；形态按结缘瞬间 karma 档位；
     * 炉鼎代价①（karmaEventScore −20）在 propose 内入账；返回 {ok, form} 供结契轻演出消费 */
    proposeSpouse: async function (ref, npcId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Bonds.propose(ws, pack, D, npcId, Date.now(), log);
        pack.recalcDerived(ws, s.profile);   /* 炉鼎 karma 代价即刻覆盖式重算（可能连锁触发 maintain） */
      });
      return out;
    },

    /* ── G15 法宝（灵宝 · 法宝全录）：祭出/收起/祭炼/造化 ──────────
     * 全部经 SQ.Treasures 通用引擎，写入单一 mutate 通道；返回结果供 toast 消费 */
    equipTreasure: async function (ref, id) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Treasures.equip(ws, pack, D, id, log);
        if (out && out.ok) {
          pack.recalcDerived(ws, s.profile);
          /* 承继器灵首次祭出彩蛋（器灵卷 §九 · 一次性、零机制效果） */
          if (SQ.Fusion && SQ.Fusion.onEquipHeir) SQ.Fusion.onEquipHeir(ws, pack, D, id, Date.now(), log);
        }
      });
      return out;
    },
    unequipTreasure: async function (ref, id) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Treasures.unequip(ws, pack, D, id, log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    /* 祭炼（后天法宝 lv 1→5）：耗灵石、三成机率失败降级 */
    refineTreasure: async function (ref, id) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Treasures.refine(ws, pack, D, id, log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    /* 造化（X11 阴阳乾坤鼎）：修为 1:1 → 灵石 */
    treasureConvertQi: async function (ref, amount) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        out = SQ.Treasures.convertQi(ws, packOf(s), dataOf(s), amount);
      });
      return out;
    },
    /* 造化（X11）：炼聚灵丹（耗灵石，Buff 修为产出 +50% 一个时辰） */
    treasureMakePill: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        out = SQ.Treasures.makePill(ws, packOf(s), dataOf(s), Date.now());
      });
      return out;
    },

    /* 手动收功 = claim（时间差结算同一入口） */
    claim: function (ref) { return SQ.claim(ref); },

    /* ── G16 势力（势力批 v2.4）：加入 / 叛离 / 神秘商人特席购买 ── */
    joinFaction: async function (ref, fid) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.join(ws, pack, D, fid, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);   /* 好感调整后重算派生值 */
      });
      return out;
    },
    leaveFaction: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.leave(ws, pack, D, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);   /* 叛离 karma 代价即刻重算 */
      });
      return out;
    },
    buyMerchant: async function (ref, idx) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Shop.buyMerchant(ws, pack, D, mods, idx, log);
      });
      return out;
    },

    /* ── G16 势力深化批（v1.23 · 势力全录卷 §三~§六）：捐献 / 委托交付 / 应战 / 供给兑换 ── */
    donateFaction: async function (ref, amount) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.donate(ws, pack, D, amount, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);   /* perk 职级放大即刻重算 */
      });
      return out;
    },
    deliverQuest: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.questDeliver(ws, pack, D, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    joinWar: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.joinWar(ws, pack, D, mods, Date.now(), { log: log, profile: s.profile });
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* ── 系统深化批（势力全录卷 §八/§九）：职级实权双技能 + 叛投敌对（献秘可选）── */
    dispatchFellow: async function (ref, npcId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.dispatchFellow(ws, pack, D, npcId, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    guardArm: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.guardArm(ws, pack, D, Date.now(), log);
      });
      return out;
    },
    defectFaction: async function (ref, targetFid, takeIntel) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.defect(ws, pack, D, targetFid, !!takeIntel, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    buySupply: async function (ref, sku) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Factions.buySupply(ws, pack, D, mods, sku, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* ── G17 江湖传闻（传闻设计卷 §5.1）：前往查证 = 定向触发（独立通道，不清 eventClock）；
     * war 卡 → 返回 {war:true} 由视图转跳势力页应战。触发后 pendingChoice 写入，
     * 现有弹层栈（抉择模态）自动接管，与随机奇遇零差异。 */
    triggerRumor: async function (ref, rid) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Rumors.trigger(ws, pack, D, rid, Date.now(), { log: log, profile: s.profile });
      });
      return out;
    },

    /* 护法自选（择选批）：写入手选护法位（null = 恢复自动·好感最高者）；
     * 非名录 id 一律落 null（资格校验由 SQ.Bonds.guardianOf 运行时兜底） */
    setGuardian: async function (ref, npcId) {
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s);
        var ok = false;
        (pack.companions || []).forEach(function (c) { if (c.id === npcId) ok = true; });
        ws.guardianPick = ok ? npcId : null;
      });
    },

    /* 缘尽赎回（引擎卷 v1.10 §3.6 · 阵营名号联动批）：以遗泽（meta 跨世通货）赎回一位缘尽道友。
     * 唯一写口 SQ.Bonds.redeem——资格 / 幂等 / 遗泽恒等式 #197 全在该口内部；
     * 视图据 out.reason 出提示（notlocked / notlisted / dup / poor）。 */
    /* 拜访论道（好感三渠道批 · 引擎卷 v1.11 §3.2a 渠道 A）：主动、零消耗、全局单冷却。
     * 日志由 Bonds.visit 内部落 cat 'bond'，本壳不重复记（与 redeemBond 由壳记日志的分工相反——
     * 三渠道一律「引擎内记」，避免壳与引擎双写同一条）。 */
    visitBond: async function (ref, npcId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Bonds.visit(ws, pack, D, npcId, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);   /* 好感变动即时进乘区 */
      });
      return out;
    },
    /* 赠丹（渠道 B）：耗自有丹药、按丹方 tier 给好感。GitHub issue #4 起无日限，节流只在丹药库存。 */
    giftBond: async function (ref, npcId, pillKey) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Bonds.giftPill(ws, pack, D, npcId, pillKey, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    redeemBond: async function (ref, npcId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var now = Date.now();
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Bonds.redeem(ws, pack, D, s.meta, npcId, now);
        if (out && out.ok) {
          log('bond', SQ.t('bond.redeem.log', {
            name: SQ.t('bond.' + npcId + '.name', null, pack.worldId), cost: out.cost
          }, pack.worldId));
        }
      });
      return out;
    },

    /* 自动渡劫开关（设置页 · 默认关）：只改玩家偏好，不动角色数据 */
    setAutoTrib: function (ref, on) {
      return SQ.mutate(ref, function (s) {
        if (!s.settings) s.settings = {};
        s.settings.autoTrib = !!on; /* 就地改，保留同层其他偏好（如 tabOrder） */
      });
    },

    /* 自动奇遇（自动批）：开启后奇遇触发时由视图层自动择一可用分支并结算，不弹抉择模态 */
    setAutoEvent: function (ref, on) {
      return SQ.mutate(ref, function (s) {
        if (!s.settings) s.settings = {};
        s.settings.autoEvent = !!on;
      });
    },

    /* 自动奇遇 · 分支倾向（体验批）：自动抉择时优先选该分支，不可用则随机其他；
     * 白名单 none/right/evil/neutral，脏值回落 none（与 core.normalize 同口径） */
    setEventPref: function (ref, pref) {
      return SQ.mutate(ref, function (s) {
        if (!s.settings) s.settings = {};
        s.settings.eventPref = (pref === 'right' || pref === 'evil' || pref === 'neutral') ? pref : 'none';
      });
    },

    /* 菜单顺序（设置页 · 仅游戏页可调；系统页固定底部）：存 id 数组，未知 id 由视图层对账 */
    setTabOrder: function (ref, order) {
      return SQ.mutate(ref, function (s) {
        if (!s.settings) s.settings = {};
        s.settings.tabOrder = Array.isArray(order) ? order.slice(0, 32) : [];
      });
    },

    /* 手动渡劫（自动渡劫关闭时的唯一入口）：修为必须已满（qi ≥ need）才掷判，
     * 未满直接返回 null（防「没攒够也能赌一把」）。返回 tryBreakthrough 的结果供演出消费 */
    tryTrib: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        if (!ws) return;
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        var need = SQ.Realm.needEffOf(ws, pack, D, mods);
        if (need == null || ws.qi < need) return;
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Realm.tryBreakthrough(ws, pack, D, mods, Date.now(), { log: log, profile: s.profile });
      });
      return out;
    },

    /* ── 天道系统（天道设计 v1.1 · 天道系统批）──────────────────────
     * 问天 = 焚表瞬间落账（扣香火 out.donate + lastAskAt + 档位预掷）并返回奏疏文本；
     * 接旨解析（parseReply/localDecree）是纯读操作，视图直调引擎，不走 mutate；
     * 领旨/抗旨二选一后本旨终结（decreeId 入 seenIds 幂等）。 */
    tdAsk: async function (ref, hexId, incenseIdx, freeText) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        out = SQ.Tiandao.ask(ws, pack, D, s.profile, hexId, incenseIdx, freeText, Date.now(), s.meta);
      });
      return out;
    },
    tdAccept: async function (ref, dec) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Tiandao.accept(ws, pack, D, mods, dec, Date.now(), { log: log, profile: s.profile });
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    tdDefy: async function (ref, dec) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Tiandao.defyDecree(ws, pack, D, dec, Date.now(), { log: log, profile: s.profile });
      });
      return out;
    },
    /* 天象览毕（红点消）：进浮层即调用；未览计数入 meta.stats.omensSeen（成就「坐观天象」供数） */
    tdOmensSeen: function (ref) {
      return SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var n = SQ.Tiandao.unseenOmens(ws);
        SQ.Tiandao.markOmensSeen(ws);
        if (n > 0 && s.meta && s.meta.stats) s.meta.stats.omensSeen = (s.meta.stats.omensSeen || 0) + n;
      });
    },
    /* 逆天大劫（独立劫 · §6.4）：defy ≥100 解锁，可无限期推迟；不推进境界、失败不扣修为 */
    tryNijie: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Tiandao.tryNijie(ws, pack, D, mods, Date.now(), { log: log, profile: s.profile });
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* ── 轮回转世（轮回卷 v1.0 · 六向长线批 A1）──────────────────────
     * 遗泽商店购买（spent 幂等键，断线重发不二次扣款）/ 飞升大劫（真仙盈满，独立终局劫）
     * / 兵解转世（化神起，×0.7 只作用结算折分项）——全部显式事务，meta 层零 tick。 */
    legacyBuy: async function (ref, itemId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        out = SQ.Legacy.buy(s, itemId, Date.now());
        if (out && out.ok) {
          var ws = s.worlds[s.profile.worldId];
          if (ws) SQ.Log.push(ws, 'sys', SQ.t('legacy.log.buy', {
            name: SQ.t(out.item.nameKey, null, s.profile.worldId)
          }, s.profile.worldId));
        }
      });
      return out;
    },
    ascend: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        out = SQ.Legacy.doFeisheng(s, Date.now());
      });
      return out;
    },
    dissolve: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        out = SQ.Legacy.doBingjie(s, Date.now());
      });
      return out;
    },
    /* 烧表请天道作传（图鉴卷 §5.3）：奏疏生成为纯读；采纳回复走 mutate（敏感词过滤+500 字截断，
     * 异常回落本地稿——作传永不阻塞转世事务） */
    adoptBio: async function (ref, rawText) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        out = SQ.Codex.adoptBio(s, rawText, Date.now());
      });
      return out;
    },

    /* ── 炼丹炼器（炼丹卷 v1.1 · 六向长线批 A3）：开工 / 出炉 / 服丹 / 售材 ──
     * 全部显式动作（mutate 通道）；炼制倒计时 = 时间戳比较，无 per-tick 掷判。
     * 采集/灵田已改自动轴（claim 内 gatherTick / farmTick），无手动入口。 */
    alStart: async function (ref, kind, id, opts) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Alchemy.startCraft(ws, pack, D, kind, id, opts || {}, s.meta, Date.now(), log);
      });
      return out;
    },
    alCollect: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Alchemy.collectCraft(ws, pack, D, mods, s.meta, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    alDrink: async function (ref, pillKey) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Alchemy.drinkPill(ws, pack, D, pillKey, Date.now(), log, s.profile);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
        /* 上限取表值不留魔数（M3）；兜底与 alchemy.js 服丹闸的 `|| 3` 同口径 */
        else if (out && out.reason === 'daily') SQ.Log.push(ws, 'sys', SQ.t('alchemy.log.pillcap',
          { n: (D().ALCHEMY || {}).PILL_DAILY_CAP || 3 }, s.profile.worldId));
      });
      return out;
    },
    alSell: async function (ref, matId, n) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Alchemy.sellMats(ws, pack, D, matId, n, Date.now(), log);
      });
      return out;
    },
    /* 材料提炼（扩容批 §十二.4）：同材料 ×4 → 次组随机 ×1（mutate 通道 · 材料账 out4/in1 双路零灵石流） */
    alRefine: async function (ref, matId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Alchemy.refineMats(ws, pack, D, matId, Date.now(), log);
      });
      return out;
    },

    /* ── 同代天骄（天骄卷 v1.0 · 六向长线批 A4）：论道切磋（7 现实天/人 CD，即时对局
     * 不进 pendingChoice；赌注 out.event_loss / 胜返 in.event 既有分类）── */
    prodigySpar: async function (ref, pid, kind) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Prodigy.spar(ws, pack, D, mods, pid, Date.now(), log, kind);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* ── 功法融合与法宝器灵（融合器灵卷 v1.1 · 六向长线批 A5）────────
     * 融合 = 单事务内一次掷判 + 词条重组落账（无中间态）；器灵技 = 显式动作（CD 防刷三件套）。 */
    fuseStart: async function (ref, idA, idB, customName) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        var mods = SQ.Mods.collect(s.profile, ws, pack, D);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Fusion.fuse(ws, pack, D, mods, customName, idA, idB, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    spiritSkill: async function (ref, treasureId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Fusion.useSkill(ws, pack, D, treasureId, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* ── 混沌淬炼（融合器灵卷 v1.3 §4.4 · 融合扩容批）：自创部混沌签名唯一授予通道。
     * 悟道石 ×1 + 灵石 REFORGE_COST[tier]（out.arts）随尝试消耗；CD 1 现实天。── */
    customReforge: async function (ref, cid) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Fusion.reforgeCustom(ws, pack, D, cid, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },

    /* ── 自立门户（自立门户卷 v1.1 · 六向长线批 A6）：开宗 / 招收 / 供奉 / 投资 / 营建 /
     * 调遣 / 宣战 / 传位——全部显式动作（mutate 通道），培养与供奉是 claim 内惰性月结。 */
    sectFound: async function (ref, gateId, nameCustom, nameIdx, align) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.foundSect(ws, pack, D, s.meta, gateId, nameCustom, nameIdx, align, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    sectRecruit: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.recruit(ws, pack, D, Date.now(), log);
      });
      return out;
    },
    sectAccept: async function (ref) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.acceptCandidate(ws, pack, D, Date.now(), log);
      });
      return out;
    },
    sectReject: function (ref) {
      return SQ.mutate(ref, function (s) {
        SQ.Sect.rejectCandidate(s.worlds[s.profile.worldId]);
      });
    },
    sectOffer: async function (ref, npcId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.inviteOffering(ws, pack, D, npcId, Date.now(), log);
      });
      return out;
    },
    sectInvest: function (ref, discId, inv) {
      return SQ.mutate(ref, function (s) {
        SQ.Sect.setInvest(s.worlds[s.profile.worldId], dataOf(s), discId, inv);
      });
    },
    sectBuild: async function (ref, facId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.buildFac(ws, pack, D, facId, Date.now(), log);
      });
      return out;
    },
    sectDispatch: async function (ref, discId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.dispatch(ws, pack, D, discId, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    },
    sectWar: async function (ref, targetFid) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.declareWar(ws, pack, D, targetFid, Date.now(), log);
      });
      return out;
    },
    sectSucceed: async function (ref, heirId) {
      var out = null;
      await SQ.mutate(ref, function (s) {
        var ws = s.worlds[s.profile.worldId];
        var pack = packOf(s), D = dataOf(s);
        function log(cat, text) { SQ.Log.push(ws, cat, text); }
        out = SQ.Sect.succeed(ws, pack, D, s.meta, heirId, Date.now(), log);
        if (out && out.ok) pack.recalcDerived(ws, s.profile);
      });
      return out;
    }
  };
})();
