/* .tests/smoke/03-bonds-spouse.js — 冒烟断言 36 条（首 #109 ‖ 末 #165）
 * 由 smoke.js 的 run() 体逐字切出（原第 2188~3288 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：109 110 111 112 114 115 116 129 130 131 132 133 134 135 136 137 138 139 140 141 142 143 144 145 152 155 156 157 158 159 160 161 162 163 164 165
*/
window.SQSmoke.frag('03-bonds-spouse', async function () {
    ok('109', 'bond 映射表对表（62 行 = 正典 57 事件 + 垂青 pei 1 + 天骄占位 2 + 机缘占位 2 · companion 链）+ 四态（bond/lock/drain/互斥）+ 好感模型 + normalize + 旧档迁移',
      bad109.length === 0 && tierOk && gainOk && normOk,
      'bad=' + bad109.slice(0, 4).join(',') + ' tier=' + tierOk + ' gain=' + gainOk + ' norm=' + normOk);

    /* #110 护法位：好感最高者自动担任；档3 +0.03 / 档4 +0.06 进 p 加总；魔道档失效归零、个体助力保留 */
    var w110 = mkWs({ realm: 4 });
    w110.bonds = { huang: 100, qin: 70 };
    pack.recalcDerived(w110, mkProf());
    var g110 = SQ.Bonds.guardianOf(w110, pack, D);
    var w110b = mkWs({ realm: 4 });
    pack.recalcDerived(w110b, mkProf());
    var ti110 = SQ.XTrib.info(w110, pack, D, M(mkProf(), w110));
    var ti110b = SQ.XTrib.info(w110b, pack, D, M(mkProf(), w110b));
    var pOk = g110.npcId === 'huang' && g110.tier === 4 && g110.bonus === D.GUARD_BONUS[4] &&
      ti110.parts.guardian === D.GUARD_BONUS[4] &&
      Math.abs(ti110.p - Math.min(D.TRIB_P_CLAMP[1], ti110b.p + D.GUARD_BONUS[4])) < 1e-9;
    /* companion 判定：档 ≥2 过；魔道档必然失败 */
    var comp110 = SQ.Bonds.companionOk(w110, pack, D, 2);
    var w110c = mkWs({ realm: 4, karmaEventScore: -900 });
    w110c.bonds = { huang: 100, qin: 70 };
    pack.recalcDerived(w110c, mkProf());
    var g110c = SQ.Bonds.guardianOf(w110c, pack, D);
    var m110c = M(mkProf(), w110c);
    var evilOk = g110c.evil === true && g110c.bonus === 0 &&
      SQ.Bonds.companionOk(w110c, pack, D, 2) === false &&
      Math.abs((m110c.bonds.checkPp || 0) - 0.015 * 3) < 1e-9;   /* 个体助力保留（qin 档3 = 4.5pp） */
    /* 护法记录：guardianBonus 生效的渡劫计次 */
    var w110d = mkWs({ realm: 0, qi: 1e9 });
    w110d.bonds = { huang: 100 };
    pack.recalcDerived(w110d, mkProf());
    var restore110 = stubRandom([0]);
    SQ.Realm.tryBreakthrough(w110d, pack, D, M(mkProf(), w110d), Date.now(), { log: noopLog(), profile: mkProf() });
    restore110();
    var logOk = w110d.guardLog.count === 1 && w110d.guardLog.success === 1;
    ok('110', '护法位：最高好感自动 + 档3/4 加项入 p + 魔道失效助力保留 + companion 判定 + 护法记录',
      pOk && comp110 && evilOk && logOk,
      JSON.stringify({ pOk: pOk, comp: comp110, evil: evilOk, log: w110d.guardLog }));

    /* #111 绝交锁（引擎卷 v1.10 §3.6 · 缘尽收敛批改双门槛）：
     *   (a) 轻中度背叛分支（stray_dog karma −8，已降为 bondDrain）→ **不锁**，好感跌至厌恶区、可挽回；
     *   (b) 重背叛分支（modao_xiangyao karma −20，保留 bondLock）门槛**不合**（素人 karma 0 / 好感 0）→ 自动降级 drain；
     *   (c) 同分支门槛**合格**（karma ≤ −400 + 好感 ≥ BOND_LOCK_BOND_MIN）→ 真锁 −99 + 后续 gain 拒入账 + 护法位排除；
     *   (d) lock 省略 gate = 无条件锁（既有旁路/断言直测向后兼容）。 */
    var w111 = mkWs({ realm: 1 });
    pack.recalcDerived(w111, mkProf());
    var restore111 = stubRandom([0]);                       /* evil 分支判定过 */
    var r111 = SQ.Events.resolveBranch(w111, pack, D, M(mkProf(), w111), 'stray_dog', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore111();
    var drainA = w111.bonds.huang;
    var notLockA = !SQ.Bonds.locked(w111, 'huang') && drainA < 0 && drainA > -99;
    var g111pre = SQ.Bonds.gain(w111, pack, D, 'huang', 30, Date.now());   /* 厌恶可被后续事件拉回 */
    var recoverA = g111pre.blocked === null && w111.bonds.huang > drainA;

    /* (b) 重背叛 + 门槛不合 → 降级 */
    var w111b = mkWs({ realm: 8 });
    pack.recalcDerived(w111b, mkProf());
    var restore111b = stubRandom([0]);
    var r111b = SQ.Events.resolveBranch(w111b, pack, D, M(mkProf(), w111b), 'modao_xiangyao', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore111b();
    /* applied.bondDrain 与 applied.bondLock 同形态 = npc id 字符串（events.js 回写口径）；
     * 互斥纪律：降级后 applied.bondLock 必须已撤销，否则结果页误报「恩断义绝」 */
    var gateOffB = !SQ.Bonds.locked(w111b, 'chelaozu') && r111b.eff.bondDrain === 'chelaozu' &&
      !r111b.eff.bondLock && w111b.bonds.chelaozu < 0 && w111b.bonds.chelaozu > -99;

    /* (c) 重背叛 + 门槛合格 → 真锁 */
    var w111c = mkWs({ realm: 8, karmaEventScore: -500 });
    w111c.bonds = { chelaozu: D.BOND_LOCK_BOND_MIN };
    pack.recalcDerived(w111c, mkProf());
    var karmaC = w111c.karma;
    var restore111c = stubRandom([0]);
    var r111c = SQ.Events.resolveBranch(w111c, pack, D, M(mkProf(), w111c), 'modao_xiangyao', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore111c();
    var g111 = SQ.Bonds.gain(w111c, pack, D, 'chelaozu', 30, Date.now());
    var g111b = SQ.Bonds.guardianOf(w111c, pack, D);
    var lockC = r111c.eff.bondLock === 'chelaozu' && w111c.bonds.chelaozu === -99 &&
      g111.blocked === 'lock' && g111b === null && (w111c.juefengIds || []).indexOf('chelaozu') >= 0;

    /* (d) 省略 gate = 无条件锁 */
    var w111d = mkWs({ realm: 1 });
    var r111d = SQ.Bonds.lock(w111d, 'huang');
    var noGateD = !!(r111d && r111d.ok) && w111d.bonds.huang === -99;

    ok('111', '绝交锁双门槛：轻背叛 drain 不锁可拉回 / 重背叛门槛不合自动降级 / 门槛合格真锁 −99+拒入账+护法排除+入绝交名录 / 省略 gate 无条件锁',
      notLockA && recoverA && gateOffB && karmaC <= D.BOND_LOCK_KARMA_MAX && lockC && noGateD,
      JSON.stringify({ drainA: drainA, recover: w111.bonds.huang, gateOff: gateOffB, drainB: w111b.bonds.chelaozu,
        karmaC: karmaC, lockC: lockC, noGate: noGateD }));

    /* #112 个体助力合计封顶（引擎卷 §3.4 v1.4 口径2）：debuff 减免叠乘基础 + 加算后 clamp ≤50%；单人满档 ≤8%/6pp */
    var w112 = mkWs({ realm: 3 });
    pack.recalcDerived(w112, mkProf());
    var fakeMods112 = { hooks: { zhishui: -0.40, kujing: -0.40 }, bonds: { debuffAll: 0.16, debuffXinmo: 0.20 }, sum: {}, detail: {} };
    var t112 = 1700000000000;
    SQ.Events.applyEffects(w112, pack, D, fakeMods112,
      { buff: { field: 'eventLuck', mult: -0.2, hours: 24 } },
      { eventId: 'market_assassin', now: t112 });            /* bad 性质 → 心魔类，全源齐上 */
    var hrs112 = (w112.buffs[0].until - t112) / 3600000;
    /* 单人满档 ≤8%/≤6pp 约束的是乘区 field 型与判定 pp；减免/通道型走各自合计封顶（§8.2 口径） */
    var perOk112 = (D.COMPANIONS || []).every(function (c) {
      var pk = c.perk || {};
      if (!pk.field && pk.channel !== 'checkPp') return true;
      var full = Math.abs(pk.perTier || 0) * (D.BOND_TIERS || []).length;
      return pk.channel === 'checkPp' ? full <= 0.06 + 1e-9 : full <= 0.08 + 1e-9;
    });
    ok('112', 'debuff 减免合计 clamp ≤50%（叠乘0.64+药箱0.16+忠护0.20 → 0.50）+ 单人满档预算',
      Math.abs(hrs112 - 12) < 0.01 && perOk112,
      'hours=' + hrs112.toFixed(2) + '/12 perOk=' + perOk112);

    /* #114 结缘双修：仅 spouse 候选 + 满档可提亲；形态按结缘瞬间档位三档映射；spouse 唯一 */
    var w114 = mkWs({ realm: 3, karmaEventScore: 900 });
    w114.bonds = { suwan: 100, huang: 100, xie: 99 };
    /* 隔离同道相吸（阵营名号联动批）：karma 900 → 名号跨段会给同向已相识道友 +好感，
     * 把 xie（正道）从 99 顶到 100，本断言的「未满档 → affinity」前提即失效。
     * 预置 rankGiftSeen 全段名号 = 本世已发过，gift 零发放；同道相吸本身由 #252 独立断言覆盖。 */
    w114.rankGiftSeen = (D.KARMA_RANKS || []).map(function (r) { return r[1]; });
    pack.recalcDerived(w114, mkProf());
    var r114 = SQ.Bonds.propose(w114, pack, D, 'suwan', Date.now(), noopLog());
    var spouse114 = w114.spouse && w114.spouse.npcId;    /* 先捕获——下方会置 null 测非候选 */
    var rej114a = SQ.Bonds.propose(w114, pack, D, 'xie', Date.now(), noopLog());   /* 已有 spouse → occupied */
    w114.bonds.xie = 100;
    var rej114b = SQ.Bonds.canPropose(w114, pack, D, 'xie', Date.now());           /* 满档候选但 occupied */
    var rej114c = SQ.Bonds.canPropose(w114, pack, D, 'huang', Date.now());         /* 非候选 */
    w114.spouse = null;
    w114.bonds.xie = 99;
    var rej114d = SQ.Bonds.canPropose(w114, pack, D, 'xie', Date.now());            /* 未满档 */
    ok('114', '提亲：候选+满档+唯一；形态按瞬间档位（正道→阴阳）',
      r114.ok && r114.form === 'yinyang' && spouse114 === 'suwan' &&
      rej114a.ok === false && rej114a.reason === 'affinity' && rej114b.reason === 'occupied' &&   /* xie 99 → 先 affinity；置 100 后 → occupied */
      rej114c.reason === 'notspouse' && rej114d.reason === 'affinity',
      JSON.stringify([r114.form, rej114a.reason, rej114b.reason, rej114c.reason, rej114d.reason]));

    /* #115 炉鼎三代价：−20 入账 / 助力归零 / 回升解除 + 心结锁（好感数值不变、永不再护法、不可再提亲） */
    var w115 = mkWs({ realm: 3, karmaEventScore: -900 });
    w115.bonds = { yewu: 100, chen: 70 };
    pack.recalcDerived(w115, mkProf());
    var kes115 = w115.karmaEventScore;
    var r115 = SQ.Bonds.propose(w115, pack, D, 'yewu', Date.now(), noopLog());
    var cost115 = r115.ok && r115.form === 'luding' && w115.karmaEventScore === kes115 - 20;
    pack.recalcDerived(w115, mkProf());
    var m115 = M(mkProf(), w115);
    var zero115 = !((m115.detail.eventLuck || {}).bond) && Math.abs((m115.detail.qiRate || {}).spouse - 0.18) < 1e-9 &&
      Math.abs((m115.bonds.debuffAll || 0) - 0.12) < 1e-9;   /* yewu 归零、双修 +18% 在、chen 药箱档3 = 12% 保留 */
    w115.karmaEventScore = 0;                                /* 回头：karma 回升出魔道档 */
    pack.recalcDerived(w115, mkProf());
    var diss115 = w115.spouse === null && !!w115.scars.yewu && w115.bonds.yewu === 100 &&
      w115.spouseLog && w115.spouseLog.reason === 'redemption';
    var g115 = SQ.Bonds.guardianOf(w115, pack, D);
    var lock115 = g115.npcId === 'chen' &&                                   /* yewu 100 最高但心结锁 → 排除 */
      SQ.Bonds.canPropose(w115, pack, D, 'yewu', Date.now()).reason === 'scar' &&
      SQ.Bonds.gain(w115, pack, D, 'yewu', 5, Date.now()).blocked === 'scar';
    ok('115', '炉鼎三代价：−20 入账 / 助力归零 / 回头即散 + 心结锁三义',
      cost115 && zero115 && diss115 && lock115,
      JSON.stringify({ cost: cost115, zero: zero115, diss: diss115, lock: lock115 }));

    /* #116 双修维持与解除：阴阳跌破即散 + 7 天冷却；互助无门槛不自动解除；反复结离数值不变 */
    var w116 = mkWs({ realm: 3, karmaEventScore: 900 });
    w116.bonds = { suwan: 100 };
    pack.recalcDerived(w116, mkProf());
    var t116 = 1700000000000;
    SQ.Bonds.propose(w116, pack, D, 'suwan', t116, noopLog());
    pack.recalcDerived(w116, mkProf());
    var rate116on = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
    w116.karmaEventScore = 0;
    w116.karma = 0;
    SQ.XKarma.recalc(w116, D);
    SQ.Bonds.maintain(w116, pack, D, t116 + 1000);
    var diss116 = w116.spouse === null && w116.spouseCdUntil === t116 + 1000 + (D.SPOUSE_FORMS.yinyang.cooldownMs) &&
      w116.spouseLog.reason === 'karma';
    var cd116 = SQ.Bonds.canPropose(w116, pack, D, 'suwan', t116 + 2000).reason === 'cooldown';
    var rate116off = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
    /* 互助：左道结 → karma 漂到正道档也不解除（v1.4 口径1） */
    var w116b = mkWs({ realm: 3 });
    w116b.bonds = { suwan: 100 };
    pack.recalcDerived(w116b, mkProf());
    SQ.Bonds.propose(w116b, pack, D, 'suwan', t116, noopLog());
    var huzhu116 = w116b.spouse && w116b.spouse.form === 'huzhu';
    w116b.karmaEventScore = 900;
    pack.recalcDerived(w116b, mkProf());
    var keep116 = huzhu116 && w116b.spouse !== null && w116b.spouse.form === 'huzhu';
    /* 反复结离 100 次：乘区即时生效与回收，rateOf 零漂移 */
    var drift116 = 0;
    for (var i116 = 0; i116 < 100; i116++) {
      w116.spouseCdUntil = 0;
      w116.karmaEventScore = 900;
      pack.recalcDerived(w116, mkProf());
      SQ.Bonds.propose(w116, pack, D, 'suwan', t116 + i116, noopLog());
      pack.recalcDerived(w116, mkProf());
      var rOn = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
      w116.karmaEventScore = 0;
      pack.recalcDerived(w116, mkProf());
      SQ.Bonds.maintain(w116, pack, D, t116 + i116);
      var rOff = SQ.Idle.rateOf(w116, pack, D, M(mkProf(), w116));
      if (Math.abs(rOn - rate116on) > 1e-6 || Math.abs(rOff - rate116off) > 1e-6) drift116++;
    }
    ok('116', '阴阳跌破散+7天冷却 / 互助不自动解除 / 反复结离 100 次零漂移',
      diss116 && cd116 && keep116 && drift116 === 0 && w116.bonds.suwan === 100,
      JSON.stringify({ diss: diss116, cd: cd116, huzhu: keep116, drift: drift116 }));

    /* #129 道友助力 + 双修预算对表（数值详设 §8.2 / 引擎卷 §3.4：逐字段 58 人满档合计 = 文档登记值）
     * 恢复批 2026-10-03 · 58 人预算基线 = 批3 20 人基线 + 扩容增量（§四 8 字段）+ 二批增量（§五 13 字段：
     * qiRate +14 / offlineEff +22 / stonesRate +10 / eventLuck +22 / shopCost −4 / combatPower +22 / bottleneck +10 /
     * combatSpeed +18 / artsSpeed +8 / dropRate +14 / debuffAll −8 / debuffXinmo −8 / tribFailLossMod −2pp）；
     * 消费端三道 clamp 不变（debuff ≤50% / checkPp ≤15pp / tribFailLossMod [30%,70%]）。 */
    var EXP129F = { dropRate: 0.22, shopCost: -0.20, artsSpeed: 0.16, stonesRate: 0.24, offlineEff: 0.38,
      combatPower: 0.34, eventLuck: 0.30, gearLuck: 0.08, tribFailLossMod: -0.10, combatSpeed: 0.24,
      qiRate: 0.14 };
    var EXP129C = { debuffXinmo: 0.36, debuffAll: 0.36, checkPp: 0.10, bottleneck: 0.30, negEvent: 0.08,
      refine: 0.12, claimQi: 0.04, dropExtra: 0.06 };
    var w129 = mkWs({ realm: 3 });
    (D.COMPANIONS || []).forEach(function (c) { w129.bonds[c.id] = 100; });
    pack.recalcDerived(w129, mkProf());
    var m129 = M(mkProf(), w129);
    var bad129 = [];
    for (var f129 in EXP129F) {
      var got129 = (m129.detail[f129] || {}).bond || 0;
      if (Math.abs(got129 - EXP129F[f129]) > 1e-9) bad129.push(f129 + '=' + got129 + '/' + EXP129F[f129]);
    }
    for (var c129 in EXP129C) {
      if (Math.abs((m129.bonds[c129] || 0) - EXP129C[c129]) > 1e-9) bad129.push(c129 + '=' + (m129.bonds[c129] || 0) + '/' + EXP129C[c129]);
    }
    /* 双修三形态登记值（§8.2）：qiRate 6/10/18%、阴阳 offlineEff 10% + 心魔 −25% */
    if (D.SPOUSE_FORMS.yinyang.qiRate !== 0.06 || D.SPOUSE_FORMS.huzhu.qiRate !== 0.10 ||
      D.SPOUSE_FORMS.luding.qiRate !== 0.18 || D.SPOUSE_FORMS.yinyang.offlineEff !== 0.10 ||
      D.SPOUSE_FORMS.yinyang.xinmoReduce !== 0.25) bad129.push('spouseForms');
    ok('129', '助力+双修预算对表 §8.2（58 人满档逐字段 + 通道 + 三形态 · 恢复批正典口径）',
      bad129.length === 0, bad129.join(','));

    /* #130 冥佑（楚老拐）：档 ≥2 每 7 天 1 层、层时长 14 天、场上 ≤2 层；档 <2 停授不清存量 */
    var w130 = mkWs({ realm: 1 });
    w130.bonds = { chu: 30 };                                /* 档 2 */
    pack.recalcDerived(w130, mkProf());
    var t130 = 1700000000000;
    var s130 = [];
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130, noopLog()));                 /* 0：锚点初始化 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 6 * 86400000, noopLog()));  /* 0：未满 7 天 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 7 * 86400000, noopLog()));  /* 1：第 1 层 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 14 * 86400000, noopLog())); /* 1：第 2 层 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 20.9 * 86400000, noopLog())); /* 0：层满 + 周期未满 */
    var layers130 = w130.buffs.filter(function (b) { return b.field === 'eventShield' && b.source === 'chu'; });
    var life130 = Math.round((layers130[0].until - (t130 + 7 * 86400000)) / 86400000);
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 21 * 86400000, noopLog())); /* 1：第 1 层到期，补授 */
    var live130 = w130.buffs.filter(function (b) { return b.field === 'eventShield' && b.source === 'chu' && b.until > t130 + 21 * 86400000; });
    w130.bonds.chu = 0;                                      /* 缘退档 → 停授，存量不清 */
    s130.push(SQ.Bonds.blessTick(w130, pack, D, t130 + 40 * 86400000, noopLog()));
    ok('130', '冥佑：7 天 1 层 / 14 天存续 / ≤2 层 / 档退停授',
      s130.join('') === '0011010' && layers130.length === 2 && life130 === 14 && live130.length === 2,
      'seq=' + s130.join('') + ' layers=' + layers130.length + ' life=' + life130 + 'd live=' + live130.length);

    /* #131 判定加点三源合计封顶 ≤ +15pp（摄魂 hooks + 斩三尸 sum.checkBonus + 秦老丈 bonds.checkPp） */
    var w131 = mkWs({ realm: 2 });
    pack.recalcDerived(w131, mkProf());
    var dc131 = SQ.Attrs.dcStdOf(w131, D) * D.ATTR_DIFF.medium;
    w131.attrs.jing = dc131;                                 /* v == dc → 基线 p = 0.5 */
    var mods131 = { hooks: { shehun: 0.10 }, sum: { checkBonus: 0.09 }, bonds: { checkPp: 0.06 }, detail: {} };
    var r131 = SQ.Attrs.check('jing', 'medium', w131, D, mods131, 1);
    var mods131b = { hooks: { shehun: 0.06 }, sum: { checkBonus: 0 }, bonds: { checkPp: 0.06 }, detail: {} };
    var r131b = SQ.Attrs.check('jing', 'medium', w131, D, mods131b, 1);
    ok('131', '判定加点三源合计封顶：0.25→0.15 / 0.12 不截',
      Math.abs(r131.p - 0.65) < 1e-9 && Math.abs(r131b.p - 0.62) < 1e-9,
      'p=' + r131.p.toFixed(3) + '/0.65 ' + r131b.p.toFixed(3) + '/0.62');

    /* #132 bond 57 事件逐条触发**四态**（批 3 验证⑤ · 恢复批扩至道友池卷 §二 全量 57 + 垂青 pei = 58 行；
     * 缘尽收敛批 三态 → 四态：正/左/魔分支 × bond 入账 / 绝交锁 / 情谊生裂 / 无入账）——
     * 每条全新存档实跑 resolveBranch（判定链 stub 0 必过；bond 不受判定折半影响 = 追加维度纪律），
     * 结果与道友池卷 §二 映射表（原四柱卷 §5.1）逐一对照；魔道 0 入账分支验证「不留痕」。
     * **绝交锁双门槛**（引擎卷 v1.10 §3.6）：保留的 6 处重背叛锁须 karma ≤ −400 且好感 ≥ 30 才真锁，
     * 故 lock 分支单独用「门槛合格存档」跑（karmaEventScore −500 + 预置好感到门槛值）；
     * drain 分支期望 = 负好感且**不是** −99（可挽回），扣减额 = round(|karma|×1.2) clamp [6,25]。 */
    var bad132 = [];
    var all132 = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian);
    var LOCK_BMIN132 = D.BOND_LOCK_BOND_MIN != null ? D.BOND_LOCK_BOND_MIN : 30;
    Object.keys(BOND_MAP109).forEach(function (evId) {
      var exp = BOND_MAP109[evId];
      var ev132 = all132.find(function (e) { return e.id === evId; });
      if (!ev132) { bad132.push(evId + ':missing'); return; }
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var expL = exp[bk + 'Lock'] || [];
        var expDr = exp[bk + 'Drain'] || [];
        /* lock 分支要门槛合格才锁得住：压低 karma + 预置好感到门槛（其余分支用素存档，bonds 起点为空）*/
        var w = expL.length
          ? mkWs({ realm: 8, stones: 1e7, qi: 1e9, karmaEventScore: -500 })
          : mkWs({ realm: 8, stones: 1e7, qi: 1e9 });
        if (expL.length) { w.bonds = {}; expL.forEach(function (npc) { w.bonds[npc] = LOCK_BMIN132; }); }
        pack.recalcDerived(w, mkProf());
        var restore = stubRandom([0]);
        SQ.Events.resolveBranch(w, pack, D, M(mkProf(), w), evId, bk, Date.now(), { log: noopLog(), profile: mkProf() });
        restore();
        var expB = exp[bk] || {};
        for (var npc in expB) {
          if (w.bonds[npc] !== expB[npc]) bad132.push(evId + ':' + bk + ':' + npc + '=' + (w.bonds[npc] || 0) + '/' + expB[npc]);
        }
        expL.forEach(function (npc) {
          if (w.bonds[npc] !== -99) bad132.push(evId + ':' + bk + ':lock' + npc + '=' + (w.bonds[npc] || 0));
        });
        expDr.forEach(function (npc) {
          var v = w.bonds[npc];
          if (!(v < 0 && v > -99)) bad132.push(evId + ':' + bk + ':drain' + npc + '=' + (v || 0));
        });
        /* 无入账分支：bonds 必须为空（0 不留痕）*/
        if (Object.keys(expB).length === 0 && expL.length === 0 && expDr.length === 0 &&
            Object.keys(w.bonds).length > 0) {
          bad132.push(evId + ':' + bk + ':extra=' + JSON.stringify(w.bonds));
        }
      });
    });
    /* 守陵人 companion 链运行时语义：护法档 ≥2 全过全额 / 无护法链败收益折半（原判定语义不变） */
    var w132g = mkWs({ realm: 8, stones: 1e7, qi: 1e9, karmaEventScore: 300 });
    w132g.bonds = { huang: 30 };                            /* 档 2 = companion minTier 2 达标 */
    pack.recalcDerived(w132g, mkProf());
    var restoreG = stubRandom([0]);
    var rG = SQ.Events.resolveBranch(w132g, pack, D, M(mkProf(), w132g), 'grave_keeper', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreG();
    var w132n = mkWs({ realm: 8, stones: 1e7, qi: 1e9, karmaEventScore: 300 });
    pack.recalcDerived(w132n, mkProf());
    var restoreN = stubRandom([0]);
    var rN = SQ.Events.resolveBranch(w132n, pack, D, M(mkProf(), w132n), 'grave_keeper', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreN();
    var compOk = rG.pass === true && rN.pass === false;
    ok('132', 'bond 57 事件逐条四态对表（58 行含垂青 pei · 绝交锁 6 处门槛合格存档实锁 + 情谊生裂 21 处负好感不锁）+ companion 链运行时（有护法全过/无护法折半）',
      bad132.length === 0 && compOk,
      'bad=' + bad132.slice(0, 4).join(',') + ' comp=' + compOk);

    /* #133 功法处置（道具处置打磨包）：散功/弃置同一返还口径 · 初始自带与槽内锁 ·
     * 防套利（散功率 0.4 < 架上折算率 0.5 → 买入即亏）· ledger 恒等式零漂移 */
    var w133 = mkWs({ realm: 6 });
    pack.recalcDerived(w133, mkProf());
    SQ.Arts.gainArt(w133, pack, D, 'yinqi', noopLog());      /* 坊市 150 → base = ceil(150×0.4) = 60 */
    /* 体验手感批（§4.4 v1.26）：入门即自动上槽——本测试场景需要先手动移槽再验散功链 */
    var autoed133 = w133.artsSlots.indexOf('yinqi') >= 0;
    if (autoed133) w133.artsSlots.splice(w133.artsSlots.indexOf('yinqi'), 1);
    var base133 = SQ.Arts.salvageBase(pack, D, 'yinqi');
    var dup133 = SQ.Arts.dupValue(pack, D, 'yinqi');
    var lockInit133 = SQ.Arts.canSalvage(w133, pack, D, 'tuna') === false;   /* 初始自带 */
    var can133 = SQ.Arts.canSalvage(w133, pack, D, 'yinqi') === true;
    w133.artsLevels.yinqi = 2;                              /* 返还 ×(1 + 2×0.25) = 90 */
    var val133 = SQ.Arts.salvageValue(w133, pack, D, 'yinqi');
    w133.artsSlots.push('yinqi');
    var lockSlot133 = SQ.Arts.canSalvage(w133, pack, D, 'yinqi') === false;  /* 槽内不可散功 */
    w133.artsSlots.pop();
    var st133 = w133.stones;
    var res133 = SQ.Arts.salvage(w133, pack, D, 'yinqi');
    var gone133 = w133.artsKnown.indexOf('yinqi') < 0 && w133.artsLevels.yinqi == null;
    var sums133 = SQ.Ledger.sums(w133);
    ok('133', '功法散功/弃置：返还口径 · 初始/槽内锁 · 防套利 · ledger 恒等式',
      autoed133 && base133 === 60 && dup133 === 75 && dup133 > base133 && lockInit133 && can133 && lockSlot133 &&
      val133 === 90 && res133 && res133.value === 90 && res133.known === true && gone133 &&
      w133.stones === st133 + 90 && sums133.expect === w133.stones,
      'base=' + base133 + ' dup=' + dup133 + ' val=' + val133 + ' stones=' + w133.stones +
      ' drift=' + (sums133.expect - w133.stones));

    /* #134 库藏阁手动炼化（道具处置打磨包）：返还口径同自动溢出 · 独占豁免 · 越界拒绝 ·
     * 容量挂点 on_stash_cap 扩容 · ledger 恒等式零漂移 */
    var w134 = mkWs({ realm: 0 });
    pack.recalcDerived(w134, mkProf());
    var m134 = M(mkProf(), w134);
    var it134a = mkGear('weapon', { tier: 1, atk: 5 });
    var it134b = mkGear('armor', { tier: 2, atk: 7 });
    var it134x = mkGear('accessory', { tier: 3, atk: 9, exclusive: 'ex_test' });
    w134.stash = [it134a, it134b, it134x];
    var cap134 = SQ.Gear.stashCap(w134, D, { hooks: {} });
    var cap134b = SQ.Gear.stashCap(w134, D, { hooks: { on_stash_cap: 3 } });
    var v134a = SQ.Gear.refineValue(it134a, w134, D, m134);
    var st134 = w134.stones;
    var rExcl134 = SQ.Gear.salvage(w134, pack, D, m134, 2, noopLog());   /* 独占豁免 */
    var rIdx134 = SQ.Gear.salvage(w134, pack, D, m134, 9, noopLog());    /* 越界 */
    var rOk134 = SQ.Gear.salvage(w134, pack, D, m134, 0, noopLog());
    var sums134 = SQ.Ledger.sums(w134);
    ok('134', '库藏阁手动炼化：返还口径 · 独占豁免 · 越界拒绝 · 容量挂点',
      cap134 === D.STASH_CAP && cap134b === D.STASH_CAP + 3 &&
      rExcl134.ok === false && rExcl134.reason === 'exclusive' &&
      rIdx134.ok === false && rIdx134.reason === 'index' &&
      rOk134.ok === true && rOk134.value === v134a && rOk134.item === it134a &&
      w134.stash.length === 2 && w134.stash.indexOf(it134x) >= 0 &&
      w134.stones === st134 + v134a && sums134.expect === w134.stones,
      'cap=' + cap134 + '/' + cap134b + ' val=' + v134a + ' stones=' + w134.stones +
      ' drift=' + (sums134.expect - w134.stones));

    /* #135 法宝引擎（法宝全录）：获得/装备/乘区并入（同乘区加算）/祭炼成长/栏位解锁/脏档归一 */
    var w135 = mkWs({ realm: 4, stones: 1000000 });
    pack.recalcDerived(w135, mkProf());
    var g135 = SQ.Treasures.gain(w135, pack, D, 'h01', noopLog());
    var dup135 = SQ.Treasures.gain(w135, pack, D, 'h01', noopLog());
    var eq135 = SQ.Treasures.equip(w135, pack, D, 'h01', noopLog());
    var m135 = M(mkProf(), w135);
    var def135 = SQ.Treasures.def(pack, 'h01');
    var scaled1 = SQ.Treasures.scaled(pack, def135, SQ.Treasures.entryOf(w135, 'h01'), 'mult:qiRate');
    var cost135 = SQ.Treasures.refineCost(w135, pack, D, 'h01');
    var rs135 = stubRandom([0.99]);
    var st135 = w135.stones;
    var r135 = SQ.Treasures.refine(w135, pack, D, 'h01', noopLog());
    rs135();
    var scaled2 = SQ.Treasures.scaled(pack, def135, SQ.Treasures.entryOf(w135, 'h01'), 'mult:qiRate');
    var w135b = mkWs({ realm: 0 });
    var unlock135 = SQ.Treasures.slotUnlocked(w135b, pack, 0) && !SQ.Treasures.slotUnlocked(w135b, pack, 1);
    var w135c = mkWs({ realm: 2 });
    w135c.treasures = SQ.Treasures.normalize({
      owned: [{ id: 'nope' }, { id: 'h02', lv: 99 }, { id: 'h02' }],
      slots: ['h02', 'h02', 'ghost'], fate: { trib: 9 }
    }, pack);
    var norm135 = w135c.treasures.owned.length === 1 && w135c.treasures.owned[0].lv === 5 &&
      w135c.treasures.slots[0] === 'h02' && w135c.treasures.slots[1] === null &&
      w135c.treasures.fate.trib === 0.2;
    ok('135', '法宝引擎：获得/装备/乘区并入/祭炼成长/栏位解锁/脏档归一',
      g135.ok && dup135.ok === false && dup135.reason === 'dup' && eq135.ok && eq135.slot === 0 &&
      Math.abs(scaled1 - 0.15) < 1e-9 &&
      /* 同 #43：等级起点批后首发功法自带 qiRate，判「法宝并入乘区」要认 treasure 来源而不是总和 */
      Math.abs(((m135.detail.qiRate || {}).treasure || 0) - 0.15) < 1e-9 &&
      cost135 === 1040 && r135.ok && r135.fail === false && r135.lv === 2 &&
      w135.stones === st135 - 1040 && Math.abs(scaled2 - 0.1875) < 1e-9 &&
      unlock135 && norm135,
      'qiRate=' + (m135.sum.qiRate || 0) + ' cost=' + cost135 + ' lv=' + r135.lv + ' scaled2=' + scaled2);

    /* #136 法宝获取路径（法宝全录 §五）：坊市/黑市上架购买入账 + 秘境首通授予 */
    var w136 = mkWs({ realm: 3, stones: 1000000 });
    pack.recalcDerived(w136, mkProf());
    w136.shop.items = [{ kind: 'treasure', ref: 'h02', sold: false, price: 100 }];
    var buy136 = SQ.Shop.buy(w136, pack, D, M(mkProf(), w136), 0, false, noopLog());
    var w136b = mkWs({ realm: 3, stones: 1000000, karmaEventScore: -300 });
    pack.recalcDerived(w136b, mkProf());
    w136b.shop.blackItems = [{ kind: 'treasure', ref: 'x12', sold: false, price: 100 }];
    var buy136b = SQ.Shop.buy(w136b, pack, D, M(mkProf(), w136b), 0, true, noopLog());
    var w136c = mkWs({ realm: 5, zone: 1 });
    w136c.prog = { 1: 99 };
    pack.recalcDerived(w136c, mkProf());
    SQ.Combat.simulate(w136c, pack, D, M(mkProf(), w136c), 600, { log: noopLog(), now: Date.now() });
    var zoneGot136 = !!SQ.Treasures.entryOf(w136c, 'x02') && (w136c.cleared || []).indexOf(1) >= 0;
    ok('136', '法宝获取路径：坊市/黑市上架购买入账 + 秘境首通授予',
      buy136.ok && !!SQ.Treasures.entryOf(w136, 'h02') &&
      buy136b.ok && !!SQ.Treasures.entryOf(w136b, 'x12') && zoneGot136,
      'shop=' + buy136.ok + ' black=' + buy136b.ok + ' zone=' + zoneGot136);

    /* ═══ 修行状态批（闭关领悟 / 外出历练 / 潜心悟道 + 功法练习度 + Lv0-9 修为升级）═══ */

    /* #137 模式 normalize：脏值回落 seclude / 合法值保留 / 练习度钳位 / 游戏历起始年（v2.3） */
    var n137 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { mode: 'chaos', artsPractice: { tuna: 250, juling: -5 } } } });
    var n137b = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { mode: 'venture' } } });
    var n137c = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { calYear: 4321 } } });
    var n137d = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { calYear: -7 } } });
    var init137 = pack.initialState();
    ok('137', '修行状态 normalize：脏 mode 回落 seclude · 练习度钳位 0~100 · 游戏历起始年钳位',
      n137.worlds.xiuxian.mode === 'seclude' && n137b.worlds.xiuxian.mode === 'venture' &&
      n137.worlds.xiuxian.artsPractice.tuna === D.PRACTICE_MAX && n137.worlds.xiuxian.artsPractice.juling === undefined &&
      n137c.worlds.xiuxian.calYear === 4321 && n137d.worlds.xiuxian.calYear === 1 &&
      init137.calYear >= 1 && init137.calYear <= 9000,
      'calYear=' + n137c.worlds.xiuxian.calYear + '/' + n137d.worlds.xiuxian.calYear + ' init=' + init137.calYear);

    /* #138 闭关不进秘境（零击杀零灵石零进度）+ 零「引灵入体」转化（修行状态批 v2.1：
     * 槽聚灵诀 Lv3 = 修为收益 9% 转灵石，闭关必须一分不入）· 历练击杀得灵石。
     * pendingChoice 挂起冻结奇遇时钟，隔离事件随机性；autoTrib=false 隔离渡劫掷判。
     * dt=59s×2 次（<60s 在线窗口）→ 两次累计跨过 60s 击杀间隔恰好 1 杀。 */
    var w138 = mkWs({ realm: 1, zone: 0, mode: 'seclude', qi: 0 });
    w138.artsKnown = ['juling']; w138.artsSlots = ['juling']; w138.artsLevels = { juling: 3 };
    w138.pendingChoice = { id: '__gate', at: Date.now() };
    pack.claim(w138, 59000, Date.now(), mkProf(), { autoTrib: false });
    pack.claim(w138, 59000, Date.now(), mkProf(), { autoTrib: false });
    var w138b = mkWs({ realm: 1, zone: 0, mode: 'venture', qi: 0 });
    w138b.artsKnown = ['juling']; w138b.artsSlots = ['juling']; w138b.artsLevels = { juling: 3 };
    w138b.pendingChoice = { id: '__gate', at: Date.now() };
    pack.claim(w138b, 59000, Date.now(), mkProf(), { autoTrib: false });
    pack.claim(w138b, 59000, Date.now(), mkProf(), { autoTrib: false });
    ok('138', '闭关：不进秘境 + 引灵入体不转化（stones 纹丝不动）· 历练：击杀/转化灵石进账',
      w138.kills === 0 && w138.stones === 100 && (w138.prog[0] || 0) === 0 &&
      w138b.kills >= 1 && w138b.stones > 100,
      'seclude kills=' + w138.kills + ' stones=' + w138.stones +
      ' | venture kills=' + w138b.kills + ' stones=' + w138b.stones);

    /* #139 潜心悟道（离线）：按原有规则结算，模式不进离线口径；lastOffline 记 mode 叙事口径 */
    var w139 = mkWs({ realm: 8, mode: 'venture' });
    pack.recalcDerived(w139, mkProf());
    var restore139 = stubRandom(function () { return 0.99999; });   /* 同 #108：绵长内息双倍掷必须桩掉，否则两边收益比是掷点比 */
    var r139 = SQ.Idle.settle(w139, pack, D, 48 * 3600 * 1000, Date.now(), { log: noopLog(), profile: mkProf() });
    var w139b = mkWs({ realm: 8, mode: 'seclude' });
    pack.recalcDerived(w139b, mkProf());
    var r139b = SQ.Idle.settle(w139b, pack, D, 48 * 3600 * 1000, Date.now(), { log: noopLog(), profile: mkProf() });
    restore139();
    ok('139', '离线 = 潜心悟道：模式不影响离线收益 · lastOffline 记录叙事口径',
      r139.offline && r139b.offline && Math.abs(r139.gain - r139b.gain) < 1 &&
      w139.lastOffline.mode === 'venture' && w139b.lastOffline.mode === 'seclude',
      'venture=' + r139.gain.toFixed(0) + ' seclude=' + r139b.gain.toFixed(0));

    /* #140 在线修为模式乘区（体验批 v2.4）：闭关 ×1.3 增益 / 历练 ×0.55 放缓 →
     * 收益比值 = venture.qiMult / seclude.qiMult（由引擎常量驱动，模式乘区漂移即暴露）。 */
    /* 两件都清空功法：等级起点批（入门即 Lv1）后首发两部从第一天就带词条与签名，
     * 历练支的战斗/掉落结果会被它们推动 ⇒ 本条只测「模式乘区」，不留别的变量。 */
    var w140 = mkWs({ realm: 5, mode: 'seclude', qi: 0, artsKnown: [], artsSlots: [] });
    pack.recalcDerived(w140, mkProf());
    var r140 = SQ.Idle.settle(w140, pack, D, 30000, Date.now(), { log: noopLog(), profile: mkProf() });
    var w140b = mkWs({ realm: 5, mode: 'venture', qi: 0, artsKnown: [], artsSlots: [] });
    pack.recalcDerived(w140b, mkProf());
    var r140b = SQ.Idle.settle(w140b, pack, D, 30000, Date.now(), { log: noopLog(), profile: mkProf() });
    var ratio140 = r140b.gain / r140.gain;
    var exp140 = D.MODES.venture.qiMult / D.MODES.seclude.qiMult;
    ok('140', '在线修为模式乘区：闭关 ×1.3 增益 / 历练 ×0.55 放缓（比值落窗 ±10%）',
      Math.abs(ratio140 - exp140) < exp140 * 0.1 && D.MODES.seclude.qiMult > 1,
      'ratio=' + ratio140.toFixed(3) + ' exp=' + exp140.toFixed(3));

    /* #141 精通：主修增速 > 副槽 · 满值顿悟 Lv+1 且清零 · 模式乘区（闭关 1.5 / 历练 0.5）
     * · 增速随等级递减（低阶领悟快、高阶领悟慢） */
    var w141 = mkWs({ mode: 'seclude' });
    w141.artsKnown = ['tuna', 'juling']; w141.artsSlots = ['tuna', 'juling'];
    pack.recalcDerived(w141, mkProf());
    var m141 = SQ.Mods.collect(mkProf(), w141, pack, D);
    SQ.Arts.tickPractice(w141, pack, D, m141, 3600, { log: noopLog() });
    var pMain = w141.artsPractice.tuna, pSub = w141.artsPractice.juling;   /* 30×1.45×1.5=65.25 / 12×1.45×1.5=26.1（Lv1 起表头） */
    var guard141 = 0;
    /* 等级起点批：入门即 Lv1 ⇒ 首次顿悟升到 **Lv2**（旧判据是从 Lv0 悟到 Lv1） */
    while ((w141.artsLevels.tuna || 0) < 2 && guard141++ < 10) {
      SQ.Arts.tickPractice(w141, pack, D, m141, 3600, { log: noopLog() });
    }
    /* 低阶快、高阶慢：速率表 Lv1 > Lv8 且单调不增（表长 8，索引 = lv−1） */
    var lvRate1 = D.PRACTICE_LV_RATE[0], lvRate8 = D.PRACTICE_LV_RATE[7];
    var dec141 = lvRate1 > lvRate8 && D.PRACTICE_LV_RATE.length === D.ARTS_MAX_LV - 1 &&
      D.PRACTICE_LV_RATE.every(function (v, i, a) {
        return i === 0 || v <= a[i - 1];
      });
    var w141b = mkWs({ mode: 'venture' });
    w141b.artsKnown = ['tuna']; w141b.artsSlots = ['tuna'];
    var m141b = SQ.Mods.collect(mkProf(), w141b, pack, D);
    SQ.Arts.tickPractice(w141b, pack, D, m141b, 3600, { log: noopLog() });
    /* issue #3：主修点在**第 2 格**时增速跟着第 2 格走（旧实现按 `i === 0` 分配 ⇒ 这一格必红，
     * 也证明本条判据认的是「主修指向」而不是「槽序」）*/
    var w141c = mkWs({ mode: 'seclude' });
    w141c.artsKnown = ['tuna', 'juling']; w141c.artsSlots = ['tuna', 'juling'];
    SQ.Arts.setMain(w141c, 'juling');
    pack.recalcDerived(w141c, mkProf());
    var m141c = SQ.Mods.collect(mkProf(), w141c, pack, D);
    SQ.Arts.tickPractice(w141c, pack, D, m141c, 3600, { log: noopLog() });
    var c141 = w141c.artsPractice.juling === pMain && w141c.artsPractice.tuna === pSub;
    ok('141', '精通：主修快于副槽（增速认主修指向，issue #3 起不认槽序）· 满值顿悟清零重来 · 闭关易悟历练难悟 · 低阶快高阶慢',
      Math.abs(pMain - 65.25) < 1e-6 && Math.abs(pSub - 26.1) < 1e-6 &&
      w141.artsLevels.tuna === 2 && w141.artsPractice.tuna < D.PRACTICE_MAX &&
      Math.abs(w141b.artsPractice.tuna - 21.75) < 1e-6 && dec141 && c141,
      'main=' + pMain.toFixed(1) + ' sub=' + pSub.toFixed(1) +
      ' insight lv=' + w141.artsLevels.tuna + ' venture=' + w141b.artsPractice.tuna.toFixed(1) +
      ' lvRate=' + lvRate1 + '>' + lvRate8 +
      ' ‖ 点定第2格: juling=' + w141c.artsPractice.juling.toFixed(1) + ' tuna=' + w141c.artsPractice.tuna.toFixed(1));

    /* #142 升级改耗修为（不入灵石账）· 品阶/等级成本递增 · Lv9 封顶 */
    var w142 = mkWs({ realm: 0, qi: 1e9, stones: 100 });
    w142.artsKnown = ['tuna']; w142.artsSlots = ['tuna'];
    pack.recalcDerived(w142, mkProf());
    var m142 = SQ.Mods.collect(mkProf(), w142, pack, D);
    var c142a = SQ.Arts.upgradeCost(w142, pack, D, 'tuna', m142);      /* Lv1 黄：240×1 = 240 */
    var up142 = SQ.Arts.upgrade(w142, pack, D, 'tuna', m142);
    var tianId142 = null;
    for (var id142 in SQ.XARTS) if (SQ.XARTS[id142].tier === 'tian') { tianId142 = id142; break; }
    w142.artsKnown.push(tianId142);
    var c142t0 = SQ.Arts.upgradeCost(w142, pack, D, tianId142, m142);  /* Lv1 天：240×36 = 8640 */
    w142.artsLevels[tianId142] = 8;
    var c142t8 = SQ.Arts.upgradeCost(w142, pack, D, tianId142, m142);  /* 1300000×36（末档，索引 lv−1） */
    w142.artsLevels[tianId142] = 9;
    var c142t9 = SQ.Arts.upgradeCost(w142, pack, D, tianId142, m142);  /* 满级 = null */
    ok('142', '升级耗修为不动灵石 · 品阶/等级成本递增 · Lv9 封顶（升到 Lv9 即满，无价目可扣）',
      up142 && c142a === 240 && w142.qi === 1e9 - 240 && w142.stones === 100 &&
      c142t0 === 240 * D.ARTS_COST_TIER.tian && c142t8 === D.ARTS_COST[D.ARTS_COST.length - 1] * D.ARTS_COST_TIER.tian &&
      c142t9 === null && w142.artsLevels.tuna === 2,
      'cost0=' + c142a + ' costT0=' + c142t0 + ' costT8=' + c142t8 + ' costT9=' + c142t9);

    /* #143 日志「功法」分类路由（v2.3）：入门/顿悟/升级全记 arts（渡劫/晋升仍走 trib） */
    var cats143 = [];
    var log143 = function (c) { cats143.push(c); };
    var w143 = mkWs({});
    w143.artsKnown = []; w143.artsSlots = [];
    SQ.Arts.gainArt(w143, pack, D, 'yinqi', log143);          /* reqs 空 → 达标入门 → arts.learned + 体验手感批自动入槽 arts.autoslot */
    w143.artsSlots = ['yinqi'];
    w143.artsPractice = { yinqi: D.PRACTICE_MAX - 0.5 };
    var m143 = SQ.Mods.collect(mkProf(), w143, pack, D);
    SQ.Arts.tickPractice(w143, pack, D, m143, 3600, { log: log143 });   /* 满值 → 顿悟 → arts.insight */
    /* 升级日志（走 mutate 单通道，与 #68 同构） */
    localStorage.removeItem(SQ.KEY);
    var ref143 = {};
    await SQ.mutate(ref143, function (s) {
      s.profile = { name: 't', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.qi = 1e9;
      s.worlds.xiuxian.artsKnown = ['tuna'];
      s.worlds.xiuxian.artsSlots = ['tuna'];
    });
    await SQ.Actions.upgradeArt(ref143, 'tuna');
    /* 入门即 Lv1 ⇒ 这次升级日志写「升至 Lv2」（旧口径 Lv0→1 记 Lv1） */
    var hasArtsLog143 = ref143.worlds.xiuxian.log.some(function (l) {
      return l.cat === 'arts' && l.text.indexOf('Lv2') >= 0;
    });
    ok('143', '日志「功法」分类：入门/顿悟/升级全记 arts',
      cats143.length === 3 && cats143.every(function (c) { return c === 'arts'; }) &&   /* 入门 + 自动入槽（体验手感批）+ 顿悟 */
      w143.artsLevels.yinqi === 2 && w143.artsPractice.yinqi < D.PRACTICE_MAX && hasArtsLog143,
      'cats=' + cats143.join(',') + ' upgradeLog=' + hasArtsLog143);

    /* ═══ 势力批（G16 势力 + 神秘商人 + 渡劫 nerf · v2.4）═══ */

    /* #144 势力：世界生成（7~10 个 · 阵营均衡 · 描述不重复 · 关系对称）/ 旧档缺失自动补生成 /
     * 加入增益入乘区（来源 faction）/ 加入好感联动（友好 +10 敌对 −20 同门 +5 · 下限 −20 厌恶）/ 叛离代价 */
    var w144 = pack.normalize(pack.initialState());   /* factions null → 生成一次（pack.normalize 返回世界态本体） */
    var facs144 = w144.factions;
    var alignCount144 = { right: 0, neutral: 0, evil: 0 };
    var descDup144 = false;
    facs144.forEach(function (f) {
      alignCount144[f.align]++;
      if (SQ.t(f.desc, null, 'xiuxian') === f.desc) descDup144 = true;
    });
    var relSym144 = facs144.every(function (f) {
      return Object.keys(f.rel).every(function (k) { return f.rel[k] === (SQ.Factions.byId(w144, k).rel[f.id] || 'none'); });
    });
    var genOk144 = facs144.length >= 16 && facs144.length <= 20 &&
      alignCount144.right >= 2 && alignCount144.neutral >= 2 && alignCount144.evil >= 2 &&
      !descDup144 && relSym144;
    /* 幂等：再 normalize 不重新生成（名称/关系保持） */
    var again144 = pack.normalize(JSON.parse(JSON.stringify(w144)));
    var idem144 = JSON.stringify(again144.factions) === JSON.stringify(facs144);
    /* 道友归属：全部在册（或 null 散人）且指向在册势力 */
    var npcOk144 = Object.keys(w144.factionNpcs).length === D.COMPANIONS.length &&
      D.COMPANIONS.every(function (c) {
        var fid = w144.factionNpcs[c.id];
        return fid === null || !!SQ.Factions.byId(w144, fid);
      });
    /* 加入：增益入乘区 + 好感联动（构造一个已知敌对目标验证 −20 与厌恶下限） */
    var fA = facs144[0], fB = facs144[1];
    var enemy144 = facs144.find(function (f) { return f.rel[fB.id] === 'enemy'; }) || fA;
    var npcB144 = D.COMPANIONS.map(function (c) { return c.id; }).find(function (nid) { return w144.factionNpcs[nid] === fB.id; });
    var joined = SQ.Factions.join(w144, pack, D, fA.id, Date.now(), noopLog());
    var m144 = SQ.Mods.collect(mkProf(), w144, pack, D);
    var perkSrc144 = (((m144.detail || {})[fA.perk.field] || {}).faction) || 0;
    var bondDelta144 = npcB144 ? (w144.bonds[npcB144] || 0) : 0;
    var joinOk144 = joined.ok && perkSrc144 === fA.perk.v &&
      (!npcB144 || (fA.rel[fB.id] === 'enemy' ? bondDelta144 === -20 : true));
    /* 敌对 −20 到下限：再 +5 拉不回正（clamp 区间正确） */
    var leave144 = SQ.Factions.leave(w144, pack, D, Date.now(), noopLog());
    var leaveOk144 = leave144.ok && w144.factionId === null &&
      w144.karmaEventScore === (D.FACTIONS.LEAVE_KARMA || -30) &&
      w144.factionCdUntil > Date.now();
    ok('144', '势力：生成/幂等/归属/加入乘区+好感联动/叛离代价',
      genOk144 && idem144 && npcOk144 && joinOk144 && leaveOk144,
      'n=' + facs144.length + ' align=' + JSON.stringify(alignCount144) +
      ' idem=' + idem144 + ' perkSrc=' + perkSrc144 + ' bondDelta=' + bondDelta144 + ' leave=' + leaveOk144);

    /* #145 神秘商人（奇遇 №61）：特席开启/到期闭席/scout 加阶消耗/极品授予/p 基础 nerf 后 #50 已对表 */
    var w145 = mkWs({ realm: 3, stones: 100000 });
    w145.factions = facs144; w145.factionNpcs = w144.factionNpcs;
    pack.recalcDerived(w145, mkProf());
    var m145 = M(mkProf(), w145);
    SQ.Shop.openMerchant(w145, pack, D, m145, Date.now(), noopLog());
    var merch145 = w145.shop.merchant;
    var merchOk145 = merch145 && merch145.until > Date.now() && (merch145.items || []).length >= 2 &&
      merch145.items[0].kind === 'gear' && merch145.items[0].gear.tier >= D.MERCHANT_GEAR_TIER;
    /* scout：下一席装备顶格（仙品）且标记消耗 */
    var w145b = mkWs({ realm: 3, stones: 100000 });
    w145b.merchantScout = true;
    pack.recalcDerived(w145b, mkProf());
    SQ.Shop.openMerchant(w145b, pack, D, M(mkProf(), w145b), Date.now(), noopLog());
    var scoutOk145 = w145b.merchantScout === false && w145b.shop.merchant.scout === true &&
      w145b.shop.merchant.items[0].gear.tier === D.GEAR_TIERS.length - 1;
    /* 袭杀败 → 重伤（qiPctRaw 不吃封顶：修为 -75%）+ 失败封印。
     * ⚠️ 判据形态随「神秘商人节律批 2026-10-10」改写：原句比的是 `eventCooldowns[id] > now + 55min`
     *    = 钉**容器里存的字节**。而原实现把「到期时刻」写进一个按「触发时刻」读回的容器
     *    （`events.js` 原 `:924` 写、`:498` 读时再加一次 cooldownHours；本批改写后现写点 `:936`）⇒ 存值 1h、行为 2h，原判据两样都绿。
     *    现按读端同一判据反解**解禁时刻**再比（行为口径），期望值 = §8 正典的 24h（表值同批由 1 抬到 24：
     *    常规冷却已 12h，1h 的失败封印不起作用）。*/
    var w145c = mkWs({ realm: 1, zone: 1, qi: 100000 });
    w145c.factions = facs144; w145c.factionNpcs = w144.factionNpcs;
    pack.recalcDerived(w145c, mkProf());
    var rs145 = stubRandom([0.9999]);                     /* 战力判定必败 */
    var r145 = SQ.Events.resolveBranch(w145c, pack, D, M(mkProf(), w145c), 'mysterious_merchant', 'evil', Date.now(),
      { log: noopLog(), profile: mkProf() });
    rs145();
    var cd145 = SQ.Events.findById(pack, 'mysterious_merchant').cooldownHours;
    /* 解禁时刻 = 容器存值 + cooldownHours × 3600e3（与 buildPool:498 逐字同式） */
    var unlock145 = w145c.eventCooldowns.mysterious_merchant + cd145 * 3600 * 1000;
    var unlockOk145 = Math.abs(unlock145 - (Date.now() + 24 * 3600 * 1000)) < 60 * 1000;
    var injureOk145 = r145 && r145.pass === false && Math.abs(w145c.qi - 25000) < 1 &&
      w145c.buffs.some(function (b) { return b.field === 'combatPower' && b.mult === -0.75; }) &&
      unlockOk145;
    ok('145', '神秘商人：特席开启/scout 顶格消耗/袭杀败重伤 -75% + 失败封印 **24h（按读端判据反解解禁时刻）**',
      merchOk145 && scoutOk145 && injureOk145,
      'merch=' + merchOk145 + ' scout=' + scoutOk145 + ' qi=' + Math.round(w145c.qi) +
      ' injure=' + injureOk145 + ' ‖ 存值=' + ((w145c.eventCooldowns.mysterious_merchant - Date.now()) / 3600000).toFixed(1) +
      'h 冷却=' + cd145 + 'h ⇒ 解禁=' + ((unlock145 - Date.now()) / 3600000).toFixed(1) + 'h（期望 24h）');

    /* ═══ 福地扩充与势力深化与江湖传闻批（v2.18 · §4.16 #152/#155~#161）═══ */

    /* #152 固定势力池：16 处正典全量入档 + 三阵营各 ≥2 + 描述 key 在册 + 名称已解词（非 key 原样） */
    var fixOk152 = (D.FACTIONS_FIXED || []).every(function (fx) {
      var f = SQ.Factions.byId(w144, fx.id);
      return !!f && f.fixed === true && f.align === fx.align &&
        !!SQ.LEX.xiuxian['faction.' + fx.id + '.name'] && !!SQ.LEX.xiuxian['faction.' + fx.id + '.desc'] &&
        f.name === SQ.t('faction.' + fx.id + '.name', null, 'xiuxian') && f.desc === 'faction.' + fx.id + '.desc';
    });
    var cnt152 = { right: 0, neutral: 0, evil: 0 };
    (D.FACTIONS_FIXED || []).forEach(function (fx) { cnt152[fx.align]++; });
    ok('152', '固定势力池 16 处全量入档（正典 id/名称/描述 + 阵营 4/7/5）',
      (D.FACTIONS_FIXED || []).length === 16 && cnt152.right === 4 && cnt152.neutral === 7 && cnt152.evil === 5 && fixOk152,
      'n=' + (D.FACTIONS_FIXED || []).length + ' align=' + JSON.stringify(cnt152) + ' fixOk=' + fixOk152);

    /* #155 福地扩池：13 处 + 主线 6 一字不动 + 别院同档 + obtain 门控 + caveTrack（跳过 obtain）单调 */
    var MAIN155 = { market_yard: 1.00, green_peak: 1.08, sword_cliff: 1.12, thunder_pool: 1.18, star_fall: 1.25, immortal_abode: 1.35 };
    var mainOk155 = Object.keys(MAIN155).every(function (id) {
      var c = SQ.Cave.byId(pack, id);
      return !!c && Math.abs(c.mult - MAIN155[id]) < 1e-9 && !c.obtain;
    });
    var BRANCH155 = { bamboo_hut: 'green_peak', danxia_cave: 'sword_cliff', stillwater_hut: 'thunder_pool', fallen_star_court: 'star_fall' };
    var branchOk155 = Object.keys(BRANCH155).every(function (id) {
      var b = SQ.Cave.byId(pack, id), m = SQ.Cave.byId(pack, BRANCH155[id]);
      return !!b && !!m && Math.abs(b.mult - m.mult) < 1e-9 &&
        b.signature.field !== (m.signature ? m.signature.field : '') && !b.obtain;
    });
    var HIDDEN155 = ['mirror_lake', 'sword_mound', 'cloud_herd'];
    var w155 = mkWs({ realm: 5 });
    w155.cleared = [0, 1, 2, 3, 4, 5];
    var gateOk155 = HIDDEN155.every(function (id) {
      var chk = SQ.Cave.canEnter(w155, pack, D, id, Date.now());
      return !chk.ok && chk.lack.some(function (x) { return x.kind === 'obtain'; });
    });
    /* 门控达成 → grantObtain 自动授予（职级档 2 + 图鉴 20 格） */
    w155.factionId = 'huangfeng';
    w155.factionRep = { huangfeng: 300 };
    for (var si = 0; si < 20; si++) w155.eventHistory.seen['fake_ev_' + si] = Date.now();
    var granted155 = SQ.Cave.grantObtain(w155, pack, D, Date.now(), { log: noopLog() });
    var grantOk155 = granted155.length === 2 && SQ.Cave.owned(w155, 'mirror_lake') && SQ.Cave.owned(w155, 'sword_mound') &&
      !SQ.Cave.owned(w155, 'cloud_herd') && SQ.Cave.canEnter(w155, pack, D, 'mirror_lake', Date.now()).ok;
    /* caveTrack 口径（跳过 obtain）：单调不减 + 顶格 = 1.35 ≤ CAP（与批 2 轨道逐位一致） */
    var track155 = D.REALMS.map(function (_, r) {
      var best = 1;
      D.CAVES.forEach(function (c) {
        if (c.obtain) return;
        var rq = c.reqs || {};
        if (rq.realmMin != null && r < rq.realmMin) return;
        if (rq.zoneCleared != null && r < ((D.ZONES[rq.zoneCleared] || {}).unlock != null ? (D.ZONES[rq.zoneCleared] || {}).unlock : 99)) return;
        if (c.mult > best) best = c.mult;
      });
      return Math.min(D.CAVE_MULT_CAP, best);
    });
    var mono155 = track155.every(function (v, i) { return i === 0 || v >= track155[i - 1] - 1e-9; });
    var trackOk155 = mono155 && Math.abs(track155[9] - 1.35) < 1e-9 &&
      JSON.stringify(track155) === JSON.stringify([1, 1.08, 1.08, 1.12, 1.18, 1.25, 1.35, 1.35, 1.35, 1.35]);
    ok('155', '福地扩池：主线 6 不动 + 别院 4 同档异签名 + 隐世 3 obtain 门控/自动授予 + caveTrack 零漂移',
      D.CAVES.length === 13 && mainOk155 && branchOk155 && gateOk155 && grantOk155 && trackOk155,
      'n=' + D.CAVES.length + ' main=' + mainOk155 + ' branch=' + branchOk155 + ' gate=' + gateOk155 +
      ' grant=' + grantOk155 + ' track=' + JSON.stringify(track155));

    /* #156 设施：预算对表（per×MAX ≤ BUDGET · 禁 qiRate）+ 营建扣费记账 + 驻留生效/搬离即失 + normalize 钳位 */
    var facDefOk156 = (D.CAVE_FACILITIES || []).every(function (fd) {
      return fd.field !== 'qiRate' && fd.per * D.CAVE_FAC_MAX_LV <= (D.CAVE_FAC_BUDGET[fd.field] || 0) + 1e-9;
    });
    var w156 = mkWs({ stones: 4000000 });
    w156.cave.current = 'green_peak'; w156.cave.owned = ['market_yard', 'green_peak'];
    var b1 = SQ.Cave.buildFacility(w156, pack, D, 'green_peak', 'lingtian', Date.now(), { log: noopLog() });
    var ledgerOk156 = b1.ok && w156.stones === 4000000 - 30000 && w156.ledger.out.cave === 30000;
    var eff156 = SQ.Cave.facEffects(w156, pack, D);
    var effOk156 = Math.abs((eff156.stonesRate || 0) - 0.01) < 1e-9;
    w156.cave.current = 'market_yard';                     /* 搬离即失 */
    var idleOk156 = Object.keys(SQ.Cave.facEffects(w156, pack, D)).length === 0;
    w156.cave.current = 'green_peak';
    var m156 = M(mkProf(), w156);
    var modsOk156 = Math.abs(((((m156.detail || {}).stonesRate || {}).caveFac) || 0) - 0.01) < 1e-9;
    /* 未拥有福地拒绝 + 满级拒绝 */
    var deny156 = !SQ.Cave.buildFacility(w156, pack, D, 'sword_cliff', 'lingtian', Date.now(), { log: noopLog() }).ok;
    SQ.Cave.buildFacility(w156, pack, D, 'green_peak', 'lingtian', Date.now(), { log: noopLog() });
    SQ.Cave.buildFacility(w156, pack, D, 'green_peak', 'lingtian', Date.now(), { log: noopLog() });
    var max156 = SQ.Cave.canBuildFac(w156, pack, D, 'green_peak', 'lingtian');
    var maxOk156 = !max156.ok && max156.lack[0].kind === 'max';
    /* normalize 钳位：越界等级截到 MAX、未知设施/未拥有福地丢弃 */
    var rawFac156 = { green_peak: { lingtian: 9, fake: 2 }, sword_cliff: { lingtian: 1 } };
    var n156 = pack.normalize(Object.assign(pack.initialState(), {
      cave: { current: 'green_peak', cooldownUntil: 0, owned: ['market_yard', 'green_peak'], fac: rawFac156 }
    }));
    var normOk156 = n156.cave.fac.green_peak.lingtian === D.CAVE_FAC_MAX_LV && !n156.cave.fac.green_peak.fake && !n156.cave.fac.sword_cliff;
    ok('156', '设施：预算对表/营建记账/驻留生效搬离即失/满级与未拥有拒绝/normalize 钳位',
      facDefOk156 && ledgerOk156 && effOk156 && idleOk156 && modsOk156 && deny156 && maxOk156 && normOk156,
      'budget=' + facDefOk156 + ' ledger=' + ledgerOk156 + ' eff=' + effOk156 + ' idle=' + idleOk156 +
      ' mods=' + modsOk156 + ' deny=' + deny156 + ' max=' + maxOk156 + ' norm=' + normOk156);

    /* #157 关系正典种子：10 对固定关系逐对生效（对称）+ 随机对不受影响（多世界采样全对） */
    var canonOk157 = true, canonBad157 = '';
    for (var wi = 0; wi < 5 && canonOk157; wi++) {
      var w157 = pack.normalize(pack.initialState());
      (D.FACTION_RELS_CANON || []).forEach(function (p) {
        var a = SQ.Factions.byId(w157, p.a), b = SQ.Factions.byId(w157, p.b);
        if (!a || !b || a.rel[p.b] !== p.rel || b.rel[p.a] !== p.rel) {
          canonOk157 = false; canonBad157 = p.a + '-' + p.b;
        }
      });
    }
    ok('157', '关系正典种子 10 对（×5 世界采样，对称生效）', canonOk157, canonBad157 || '10/10');

    /* #158 职级：阈值派生 + 捐献（÷1000 记账 + 24h 上限部分成交）+ perk 放大 + 叛离清零 + 授予不收回 */
    var w158 = mkWs({ stones: 2000000 });
    SQ.Factions.generate(w158, pack, D);                  /* 生成势力表（含固定池）后再挂效力 */
    w158.factionId = 'luopo';
    w158.factionRep = { luopo: 0 };
    var rankSeq158 = [0, 100, 300, 700, 1500].map(function (rep) {
      w158.factionRep.luopo = rep;
      return SQ.Factions.rankOf(w158, D, 'luopo');
    }).join('');
    var d1 = SQ.Factions.donate(w158, pack, D, 100000, Date.now(), noopLog());
    var donOk158 = d1.ok && d1.rep === 100 && w158.stones === 1900000 && w158.ledger.out.donate === 100000;
    w158.factionDonate = { at: Date.now(), used: 295 };
    var d2 = SQ.Factions.donate(w158, pack, D, 100000, Date.now(), noopLog());
    var capOk158 = d2.ok && d2.rep === 5 && w158.stones === 1900000 - 5000;   /* 部分成交：只扣对应灵石 */
    w158.factionDonate = { at: Date.now(), used: 300 };
    var d3 = SQ.Factions.donate(w158, pack, D, 10000, Date.now(), noopLog());
    var capFull158 = !d3.ok && d3.reason === 'cap';
    /* 供奉窗口 2h（2026-10-05 调参批）：常量对表 + 过期重置 used / 窗内沿用 used */
    var winConst158 = D.FACTION_DONATE.WINDOW_MS === 7200000 && D.FACTION_DONATE.WINDOW_CAP === 300;
    w158.factionDonate = { at: Date.now() - 7200001, used: 300 };
    var d4 = SQ.Factions.donate(w158, pack, D, 100000, Date.now(), noopLog());
    var winExpire158 = d4.ok && d4.rep === 100;               /* 超 2h → used 归零，满额成交 */
    w158.factionDonate = { at: Date.now() - 7199999, used: 300 };
    var d5 = SQ.Factions.donate(w158, pack, D, 10000, Date.now(), noopLog());
    var winLive158 = !d5.ok && d5.reason === 'cap';           /* 窗内且已满 → 拒 */
    /* perk 放大：档 4 ×1.35 */
    w158.factionRep.luopo = 1500; w158.factionDonate = { at: 0, used: 0 };
    var f158 = SQ.Factions.byId(w158, 'luopo');
    var pk158 = SQ.Factions.perkOf(w158, D);
    var ampOk158 = Math.abs(pk158.v - f158.perk.v * 1.35) < 1e-9 && pk158.rank === 4;
    /* 隐世授予后叛离不收回；rep 清零 */
    var g158 = SQ.Cave.grantObtain(w158, pack, D, Date.now(), { log: noopLog() });
    var grantOwn158 = SQ.Cave.owned(w158, 'cloud_herd') && g158.length >= 1;
    SQ.Factions.leave(w158, pack, D, Date.now(), noopLog());
    var leaveOk158 = SQ.Factions.repOf(w158, 'luopo') === 0 && SQ.Cave.owned(w158, 'cloud_herd');
    ok('158', '职级：阈值 0~4 / 捐献记账+2h 窗口上限部分成交（过期重置）/ perk ×1.35 / 叛离清零 / 隐世授予不收回',
      rankSeq158 === '01234' && donOk158 && capOk158 && capFull158 && winConst158 && winExpire158 && winLive158 &&
      ampOk158 && grantOwn158 && leaveOk158,
      'rank=' + rankSeq158 + ' don=' + donOk158 + ' cap=' + capOk158 + '/' + capFull158 +
      ' win=' + winConst158 + '/' + winExpire158 + '/' + winLive158 +
      ' amp=' + ampOk158 + ' grant=' + grantOwn158 + ' leave=' + leaveOk158);

    /* #159 委托（第卅九批改形：单槽 → 板面最多 SLOTS=3 张、同类型至多一张、交付按 type 寻址）
     * 判据八条：基线进度 / 交付摘除与记账 / gather 扣账 / 过期作废 / 刷新闸 / **一刷贴满三张且互不相同** /
     * **交一张不动另两张** / **旧档单张迁移** / 叛离整板作废。*/
    var w159 = mkWs({ stones: 50000, kills: 100, total: 1000 });
    SQ.Factions.generate(w159, pack, D);
    w159.factionId = 'huangfeng'; w159.factionRep = { huangfeng: 0 };
    var now159 = Date.now();
    w159.factionQuests = [{ type: 'slay', target: 10, base: 100, rep: 25, stones: 500, bornAt: now159, expireAt: now159 + 3600000 }];
    w159.kills = 109;
    var p159a = SQ.Factions.questProgress(w159, pack, D, w159.factionQuests[0]);
    w159.kills = 110;
    var p159b = SQ.Factions.questProgress(w159, pack, D, w159.factionQuests[0]);
    var progOk159 = !p159a.done && p159b.done && p159b.cur === 10;
    var st159 = w159.stones;
    var dq159 = SQ.Factions.questDeliver(w159, pack, D, now159, noopLog(), 'slay');
    var deliverOk159 = dq159.ok && w159.stones === st159 + 500 && w159.factionRep.huangfeng === 25 &&
      w159.factionQuests.length === 0 && (w159.factionQuestCd || 0) > now159;
    /* 交不存在的那张 ⇒ 拒且不动板面（type 就是地址，打错不能误摘别张） */
    w159.factionQuests = [{ type: 'gather', target: 1000, base: 0, rep: 30, stones: 0, bornAt: now159, expireAt: now159 + 3600000 }];
    var dq159x = SQ.Factions.questDeliver(w159, pack, D, now159, noopLog(), 'slay');
    var wrongOk159 = !dq159x.ok && dq159x.reason === 'none' && w159.factionQuests.length === 1;
    /* gather：交付时足额扣 + out.donate 记账 */
    var st159b = w159.stones;
    var dq159b = SQ.Factions.questDeliver(w159, pack, D, now159, noopLog(), 'gather');
    var gatherOk159 = dq159b.ok && w159.stones === st159b - 1000 && w159.ledger.out.donate === 1000;
    /* 过期作废 + 刷新闸：cd 内不补、cd 过补单 */
    w159.factionQuests = [{ type: 'slay', target: 10, base: 0, rep: 25, stones: 0, bornAt: now159 - 7200000, expireAt: now159 - 1000 }];
    var m159 = M(mkProf(), w159);
    SQ.Factions.questTick(w159, pack, D, m159, now159, { log: noopLog() });
    var expOk159 = w159.factionQuests.length === 0 && w159.factionQuestCd > now159;
    SQ.Factions.questTick(w159, pack, D, m159, now159 + 1000, { log: noopLog() });
    var cdOk159 = w159.factionQuests.length === 0;                              /* 闸内不补单 */
    SQ.Factions.questTick(w159, pack, D, m159, now159 + 1800001, { log: noopLog() });
    var q3 = w159.factionQuests, made3 = q3.length;   /* made3 = 补单当时的板面张数（q3 本身后面会被 splice 改动） */
    var genOk159b = q3.length === (D.FACTION_QUEST.SLOTS || 1) &&
      q3.every(function (q) { return ['slay', 'cultivate', 'gather'].indexOf(q.type) >= 0; }) &&
      q3.map(function (q) { return q.type; }).sort().join() === 'cultivate,gather,slay' &&   /* 三张互不相同 */
      q3.every(function (q) { return q.expireAt === now159 + 1800001 + D.FACTION_QUEST.TTL_MS; });
    /* 交一张：另两张留在板面（本批要的就是这个） */
    var rep0 = w159.factionRep.huangfeng;
    /* 三张都是刚贴出来的新单，进度为零 ⇒ 先按类型把进度凑到达标（等同玩家真去打/修/攒） */
    q3.forEach(function (q) {
      if (q.type === "slay") w159.kills = (q.base || 0) + q.target;
      else if (q.type === "cultivate") w159.total = (q.base || 0) + q.target;
      else w159.stones = Math.max(w159.stones, q.target);
    });
    var notDone159 = (function () {
      /* 复用 w159 已生成的势力池：没池的话 current() 为空，返回的是 none 而不是 progress */
      var wX = mkWs({ stones: 10, kills: 0, total: 0 });
      wX.factions = w159.factions; wX.factionId = "huangfeng"; wX.factionRep = { huangfeng: 0 };
      wX.factionQuests = [{ type: "slay", target: 50, base: 0, rep: 25, stones: 0, bornAt: now159, expireAt: now159 + 7200000 }];
      var rX = SQ.Factions.questDeliver(wX, pack, D, now159, noopLog(), "slay");
      return !rX.ok && rX.reason === "progress" && wX.factionQuests.length === 1;
    })();
    /* q3 就是 w159.factionQuests 那个数组本身（splice 会原地改它）⇒ 交付前先把类型快照下来 */
    var tFirst = q3[0].type;
    var others = q3.filter(function (q) { return q.type !== tFirst; }).map(function (q) { return q.type; }).sort().join();
    var dqOne = SQ.Factions.questDeliver(w159, pack, D, now159 + 1800001, noopLog(), tFirst);
    var oneOk159 = dqOne.ok && w159.factionQuests.length === 2 &&
      w159.factionQuests.every(function (q) { return q.type !== tFirst; }) &&
      q3.map(function (q) { return q.type; }).sort().join() === others &&
      w159.factionRep.huangfeng === rep0 + dqOne.rep;
    /* 跨刷新补单的去重：板上还剩两张（一交一留之后），cd 再到期只补一张 ⇒ 补出来的那张不许与板上重复 */
    w159.factionQuestCd = 0;
    var before2 = w159.factionQuests.map(function (q) { return q.type; }).sort().join();
    SQ.Factions.questTick(w159, pack, D, m159, now159 + 3600001, { log: noopLog() });
    var after3 = w159.factionQuests.map(function (q) { return q.type; });
    var dedupeOk159 = w159.factionQuests.length === 3 && new Set(after3).size === 3 &&
      after3.filter(function (t) { return before2.split(',').indexOf(t) >= 0; }).length === before2.split(',').length;
    /* 旧档单张 factionQuest → normalize 并入板面；脏类型剪除；二次 normalize 幂等 */
    var mig159 = pack.normalize({ factionQuests: undefined, factionQuest: { type: 'slay', target: 12, base: 3, rep: 25, stones: 40, bornAt: now159, expireAt: now159 + 7200000 } }, D);
    var migOk159 = Array.isArray(mig159.factionQuests) && mig159.factionQuests.length === 1 &&
      mig159.factionQuests[0].type === 'slay' && mig159.factionQuest === undefined;
    var migIdem159 = JSON.stringify(pack.normalize(mig159, D).factionQuests) === JSON.stringify(mig159.factionQuests);
    /* 板面上限硬顶：塞四张（含重复类型）→ normalize 收到 3 张且同类型只留首张 */
    var cap159 = pack.normalize({ factionQuests: [
      { type: 'slay', target: 1, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'slay', target: 2, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'gather', target: 3, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'cultivate', target: 4, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 },
      { type: 'bogus', target: 5, base: 0, rep: 1, stones: 0, bornAt: now159, expireAt: now159 + 7200000 }
    ] }, D);
    var capOk159 = cap159.factionQuests.length === 3 &&
      cap159.factionQuests.map(function (q) { return q.type; }).join() === 'slay,gather,cultivate' &&
      cap159.factionQuests[0].target === 1;                                     /* 重复类型留首张、脏类型剪除 */
    ok('159', '委托板面（第卅九批 3 张形）：slay 基线进度 / 交付按 type 摘除并记账 / 错类型整笔拒 / gather 足额扣 + out.donate / 过期作废 / 刷新闸内不补 / **一刷贴满 SLOTS 且三张类型互不相同** / **交一张不动另两张** / 旧档单张迁移 + 幂等 / 板面硬顶 3 张（重复留首、脏型剪）/ 未达标拒交且不动板面',
      progOk159 && deliverOk159 && wrongOk159 && gatherOk159 && expOk159 && cdOk159 && notDone159 &&
      genOk159b && oneOk159 && dedupeOk159 && migOk159 && migIdem159 && capOk159,
      '未达标拒=' + notDone159 + ' prog=' + progOk159 + ' deliver=' + deliverOk159 + ' 错型拒=' + wrongOk159 + ' gather=' + gatherOk159 +
      ' exp=' + expOk159 + ' cd=' + cdOk159 + ' 板满=' + made3 + '/差异=' + genOk159b +
      ' 交一留二=' + oneOk159 + ' 迁移=' + migOk159 + '/' + migIdem159 + ' 硬顶=' + capOk159);

    /* #160 冲突（战功制改造 · 势力全录卷 §七）：入场无判定/每场一次/第三方观望/war 传闻卡/终局清场 */
    var w160 = mkWs({ realm: 0, stones: 1000 });
    w160.factionId = 'jianqi';
    w160.factionRep = { jianqi: 0 };
    w160.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: null, joinedFid: null, merit: 0, result: null };
    SQ.Rumors.pushWar(w160, pack, D, Date.now(), { log: noopLog() });
    var warCard160 = SQ.Rumors.warCard(w160);
    var m160 = M(mkProf(), w160);
    /* 入场无战力判定：境界 0 裸身也能入场（旧 NEED_MULT 判定线废弃） */
    var j160 = SQ.Factions.joinWar(w160, pack, D, m160, Date.now(), { log: noopLog() });
    var inOk160 = j160.ok && w160.factionWar.joined === 'in' && w160.factionWar.merit === 0 &&
      w160.factionWar.joinedFid === 'jianqi';
    var j160b = SQ.Factions.joinWar(w160, pack, D, m160, Date.now(), { log: noopLog() });
    var once160 = !j160b.ok && j160b.reason === 'joined';
    /* 第三方观望 */
    var w160w = mkWs({});
    w160w.factionId = 'huangfeng';
    w160w.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: null, joinedFid: null, merit: 0, result: null };
    var watch160 = SQ.Factions.joinWar(w160w, pack, D, M(mkProf(), w160w), Date.now(), { log: noopLog() });
    var watchOk160 = !watch160.ok && watch160.reason === 'watch';
    /* 终局：merit 0 < need 10（10+realm×2 校准值）→ 败档结算（rep+5 + 战创）并清场（细则见 #177/#178） */
    w160.factionWar.until = Date.now() - 1;
    SQ.Factions.warTick(w160, pack, D, m160, 1, Date.now(), { log: noopLog() });
    var endOk160 = w160.factionWar === null && w160.factionRep.jianqi === 5 &&
      w160.buffs.some(function (b) { return b.field === 'combatPower' && b.mult === -0.10; });
    ok('160', '冲突（战功制）：入场无判定/每场一次/第三方观望/终局败档清场/war 传闻卡',
      inOk160 && once160 && watchOk160 && endOk160 && !!warCard160,
      'in=' + inOk160 + ' once=' + once160 + ' watch=' + watchOk160 + ' end=' + endOk160 + ' card=' + !!warCard160);

    /* #161 传闻：刷新批次与上限/TTL 分档/过期清扫/触发五件套+eventClock 不清零/busy 拒绝/normalize 回落 */
    var w161 = mkWs({ realm: 3 });
    pack.recalcDerived(w161, mkProf());
    var m161 = M(mkProf(), w161);
    var eff161 = pack.worldSystems.effectsOf(w161);
    var now161 = Date.now();
    w161.rumorClock = 9 * 60 + 59;                        /* 逼近 10 分钟边界 */
    var fresh161 = SQ.Rumors.tick(w161, pack, D, m161, 2, now161, { log: noopLog() });
    var cards161 = SQ.Rumors.eventCards(w161);
    var genOk161 = !!fresh161 && cards161.length >= 1 && cards161.length <= 2;
    /* 卡内容合法性：事件在册、condOk、非冷却中、TTL 对表品阶 */
    var cardOk161 = cards161.every(function (r) {
      var ev = SQ.Events.findById(pack, r.evId);
      return !!ev && ev.tier === r.tier && SQ.Events.condOk(ev, w161, pack, D) &&
        r.expireAt - r.bornAt === D.RUMORS.TTL[r.tier] * 60000;
    });
    /* 上限硬顶：塞满后 tick 不再生成 */
    while (SQ.Rumors.eventCards(w161).length < D.RUMORS.MAX) {
      w161.rumors.push({ rid: 'pad' + w161.rumors.length, evId: cards161[0].evId, tier: 'ren', nature: 'good', bornAt: now161, expireAt: now161 + 3600000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' });
    }
    w161.rumorClock = 9 * 60 + 59;
    SQ.Rumors.tick(w161, pack, D, m161, 2, now161 + 500, { log: noopLog() });
    var capOk161 = SQ.Rumors.eventCards(w161).length === D.RUMORS.MAX;
    /* 离线冻结由 claim 编排保证（tick 仅在线调用）；过期清扫在线离线都扫 */
    w161.rumors[0].expireAt = now161 - 1;
    var gone161 = SQ.Rumors.sweep(w161, pack, D, now161);
    var sweepOk161 = gone161.length === 1 && w161.rumors.indexOf(gone161[0]) < 0;
    /* 触发：五件套 + eventClock 不清零 + via 溯源 */
    var w161t = mkWs({ realm: 3 });
    pack.recalcDerived(w161t, mkProf());
    var mt = M(mkProf(), w161t);
    w161t.rumorClock = 9 * 60 + 59; w161t.eventClock = 500;
    SQ.Rumors.tick(w161t, pack, D, mt, 2, now161, { log: noopLog() });
    var target161 = SQ.Rumors.eventCards(w161t)[0];
    var tr161 = SQ.Rumors.trigger(w161t, pack, D, target161.rid, now161, { log: noopLog() });
    var trigOk161 = tr161.ok && tr161.pending &&
      w161t.pendingChoice && w161t.pendingChoice.id === target161.evId && w161t.pendingChoice.via === 'rumor' &&
      w161t.eventCooldowns[target161.evId] === now161 &&
      w161t.eventHistory.lastId === target161.evId &&
      w161t.eventHistory.seen[target161.evId] === now161 &&
      w161t.eventClock === 500 &&                          /* 独立通道：不清随机时钟 */
      SQ.Rumors.eventCards(w161t).indexOf(target161) < 0;  /* 卡出档 */
    /* busy：pendingChoice 挂起时拒绝二次触发 */
    w161t.rumorClock = 9 * 60 + 59;
    SQ.Rumors.tick(w161t, pack, D, mt, 2, now161 + 1000, { log: noopLog() });
    var next161 = SQ.Rumors.eventCards(w161t)[0];
    var busy161 = next161 ? !SQ.Rumors.canTrigger(w161t, pack, D, next161.rid, now161 + 1000).ok &&
      SQ.Rumors.canTrigger(w161t, pack, D, next161.rid, now161 + 1000).reason === 'busy' : true;
    /* normalize：过期/未知 evId/结构残缺丢弃 + 合法卡保留 */
    var n161 = pack.normalize(Object.assign(pack.initialState(), {
      rumors: [
        target161,
        { rid: 'x1', evId: 'no_such_event', tier: 'ren', nature: 'good', bornAt: now161, expireAt: now161 + 60000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' },
        { rid: 'x2', evId: target161.evId, tier: 'ren', nature: 'good', bornAt: now161, expireAt: now161 - 60000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' },
        { rid: 'x3' },
        { rid: 'w1', kind: 'war', bornAt: now161, expireAt: now161 + 600000 }
      ],
      rumorClock: -5
    }));
    var normOk161 = n161.rumors.length === 2 && n161.rumors[0].rid === target161.rid &&
      n161.rumors[1].kind === 'war' && n161.rumorClock === 0;
    ok('161', '传闻：批次刷新/TTL 对表/上限硬顶/过期清扫/触发五件套+时钟独立/busy 拒绝/normalize 回落',
      genOk161 && cardOk161 && capOk161 && sweepOk161 && trigOk161 && busy161 && normOk161,
      'gen=' + genOk161 + ' card=' + cardOk161 + ' cap=' + capOk161 + ' sweep=' + sweepOk161 +
      ' trig=' + trigOk161 + ' busy=' + busy161 + ' norm=' + normOk161);

    /* ═══ 体验手感批（数值详设 §4.4/§2.4 v1.26）═══ */

    /* #162 功法自动入槽：入世一次性回填 · 主修=第 1 槽 · 只补空槽不挤占 · 幂等 */
    var w162 = mkWs({ artsKnown: ['tuna', 'juling', 'yunzong'], artsSlots: [], artsAutoInit: false });
    pack.recalcDerived(w162, mkProf());   /* 入世首次结算静默回填 */
    var init162 = w162.artsAutoInit === true && w162.artsSlots.join() === 'tuna,juling,yunzong' &&
      SQ.Arts.mainArt(w162) === 'tuna';
    /* 不挤占：既有槽序保持，新学者追加到空位 */
    var w162b = mkWs({ artsKnown: ['yunzong', 'tuna'], artsSlots: ['tuna'], artsAutoInit: true });
    var added162b = SQ.Arts.autoSlot(w162b, pack, D, noopLog());
    var noPreempt162 = w162b.artsSlots.join() === 'tuna,yunzong' && added162b.join() === 'yunzong' &&
      SQ.Arts.mainArt(w162b) === 'tuna';
    /* 幂等：全已上槽再调无新增 */
    var idem162 = SQ.Arts.autoSlot(w162, pack, D, noopLog()).length === 0;
    ok('162', '功法自动入槽：入世一次性回填/主修=第1槽/只补空槽不挤占/幂等',
      init162 && noPreempt162 && idem162,
      'init=' + init162 + ' noPreempt=' + noPreempt162 + ' idem=' + idem162);

    /* #163 首通自动推进（数值详设 §2.4 v1.26 → §2.6 两段式改造 · 系统深化批 A4）：
     * 首通 → 域主现世（推进挂起）→ 域主战胜利后才按战力自动前进 / 留守写牵引日志 */
    /* 钉死随机源（2026-10-05 存档容量防线批 · 断言确定性纪律外溢）：本断言原**未 stub 随机**，
     * 而 `challengeBoss` 的胜负其实是确定性的（`power < need` 判定、无掷点）——飘的是前置 `Combat.simulate`
     * 的随机掉落/掷点改变了 `challengePower` 的结果战力。`w163b` 标称 power≈60 对门槛 `zone0.need × BOSS_MULT 1.8 = 54`、
     * **余量仅 11%**，simulate 随机一抖即跌破 → `boss.win=false` → `hold163` 假失败（实测约 7 跑 1 挂、
     * root 与 extensions 两侧都会中，与代码树无关）。stub 到恒定 0.5 使 simulate 结果确定、战力稳定。
     * ⚠️ 属**既有缺陷**、非本批引入；由本批「断言必须确定性」纪律（#206 同类问题）扫描时发现。 */
    var restore163 = stubRandom(function () { return 0.5; });
    var logs163a = [], logs163b = [];
    var w163a = mkWs({ realm: 2, zone: 0 });
    SQ.Combat.simulate(w163a, pack, D, M(mkProf(), w163a), 3600, { log: function (c, t) { logs163a.push(t); }, now: Date.now(), profile: mkProf() });
    var hold163a = w163a.cleared.indexOf(0) >= 0 && w163a.zone === 0 &&
      !!w163a.zoneBoss && w163a.zoneBoss.zone === 0 && w163a.zoneBoss.state === 'ready';
    var boss163a = SQ.Combat.challengeBoss(w163a, pack, D, M(mkProf(), w163a), Date.now(), { log: function (c, t) { logs163a.push(t); } });
    var adv163 = hold163a && boss163a.ok && boss163a.win && w163a.zone === 1 &&
      w163a.zoneBoss.state === 'dead' &&
      logs163a.some(function (t) { return t.indexOf('首通牵引') >= 0; });
    var w163b = mkWs({ realm: 1, zone: 0 });   /* power60 ≥ 域主线 54 但 < zone1.need90 → 胜域主后留守 */
    SQ.Combat.simulate(w163b, pack, D, M(mkProf(), w163b), 3600, { log: function (c, t) { logs163b.push(t); }, now: Date.now(), profile: mkProf() });
    var boss163b = SQ.Combat.challengeBoss(w163b, pack, D, M(mkProf(), w163b), Date.now(), { log: function (c, t) { logs163b.push(t); } });
    var hold163 = w163b.cleared.indexOf(0) >= 0 && boss163b.ok && boss163b.win && w163b.zone === 0 &&
      logs163b.some(function (t) { return t.indexOf('已解锁') >= 0; });
    restore163();
    ok('163', '首通自动推进（两段式）：域主现世挂起 → 斩后达标前进/不足留守写牵引（**随机源已钉死** stub 0.5——原未 stub 时前置 `Combat.simulate` 的随机掉落改变 `challengePower`，而 `w163b` 战力 ≈60 对门槛 54 余量仅 11% → 约 7 跑 1 挂的假失败）',
      adv163 && hold163, 'adv=' + adv163 + ' hold=' + hold163 +
      ' powerA=' + (boss163a.power != null ? Math.round(boss163a.power) : -1) + '/need=' + (boss163a.need != null ? Math.round(boss163a.need) : -1) +
      ' powerB=' + (boss163b.power != null ? Math.round(boss163b.power) : -1) + '/need=' + (boss163b.need != null ? Math.round(boss163b.need) : -1));

    /* #164 新手起步加速（数值详设 §1.7 v1.27）：境界0 在线结算 ×qiMult（实测 ratio≈qiMult），
       realm≥1 与离线一律不受影响；同 realm 开/关加速求比值，消掉 talent/align 等一切乘子，直测加速系数 */
    var ctx164 = { log: function () {}, profile: mkProf() };
    var saved164 = D.NEWBIE_RAMP;
    var r0on = SQ.Idle.settle(mkWs(), pack, D, 20000, Date.now(), ctx164).gain;              /* 境界0 在线·开 */
    var offOn = SQ.Idle.settle(mkWs(), pack, D, 720000, Date.now(), ctx164).gain;            /* 境界0 离线·开 */
    var r1on = SQ.Idle.settle(mkWs({ realm: 1 }), pack, D, 20000, Date.now(), ctx164).gain;  /* 境界1 在线·开 */
    D.NEWBIE_RAMP = null;
    var r0off = SQ.Idle.settle(mkWs(), pack, D, 20000, Date.now(), ctx164).gain;             /* 境界0 在线·关 */
    var offOff = SQ.Idle.settle(mkWs(), pack, D, 720000, Date.now(), ctx164).gain;           /* 境界0 离线·关 */
    var r1off = SQ.Idle.settle(mkWs({ realm: 1 }), pack, D, 20000, Date.now(), ctx164).gain; /* 境界1 在线·关 */
    D.NEWBIE_RAMP = saved164;
    var ratio0 = r0off > 0 ? r0on / r0off : 0;
    var realm1Neutral = r1off > 0 && Math.abs(r1on / r1off - 1) < 1e-9;
    var offlineNeutral = offOff > 0 && Math.abs(offOn / offOff - 1) < 1e-9;
    ok('164', '新手起步加速：境界0 在线×qiMult / realm≥1 不受影响 / 离线不享',
      !!saved164 && Math.abs(ratio0 - saved164.qiMult) < 0.05 && realm1Neutral && offlineNeutral,
      'ratio0=' + ratio0.toFixed(3) + ' qiMult=' + (saved164 && saved164.qiMult) + ' realm1=' + realm1Neutral + ' offline=' + offlineNeutral);

    /* ═══ 系统深化批（v1.18 · §4.19 #165~#180）═══ */

    /* #165 机制天赋挂点分流：on_bottleneck_power 词条 → hooks（不进 sum/detail），
     * bottleneckOf 与尸傀护主/护镖/法宝同读点加算（power = raw × (1+Σ)） */
    var t165 = mkTalent({ on_bottleneck_power: 0.05 }); t165.id = 'last_stand';
    var w165 = mkWs({ realm: 0, zone: 0 });            /* power 20 < need 30 → 瓶颈态可测加算 */
    var m165 = M(mkProf([t165]), w165);
    var bn165 = SQ.Combat.bottleneckOf(w165, pack, D, m165);
    var raw165 = SQ.Mods.powerOf(w165, pack, D, m165);
    ok('165', '机制天赋挂点分流：hooks 白名单键不入乘区、瓶颈判定同读点加算',
      Math.abs(m165.hooks.on_bottleneck_power - 0.05) < 1e-9 &&
      m165.sum.on_bottleneck_power === undefined && (m165.detail.on_bottleneck_power === undefined) &&
      bn165.bottleneck === true && Math.abs(bn165.power - raw165 * 1.05) < 1e-9,
      'hooks=' + m165.hooks.on_bottleneck_power + ' power=' + bn165.power.toFixed(2) + ' raw=' + raw165.toFixed(2));

    /* #166 yufeng 乘算合并：天赋 0.92 × 功法 0.8 = 0.736（非加算 1.72）；两部功法 0.8×0.8=0.64 */
    var t166 = mkTalent({ yufeng: 0.92 }); t166.id = 'windwalker';
    var w166 = mkWs({ realm: 1 });
    w166.artsKnown = ['yunzong']; w166.artsSlots = ['yunzong']; w166.artsLevels = { yunzong: 1 };
    var m166 = M(mkProf([t166]), w166);
    var w166b = mkWs({ realm: 3 });
    w166b.artsKnown = ['yunzong', 'taixu']; w166b.artsSlots = ['yunzong', 'taixu'];
    w166b.artsLevels = { yunzong: 1, taixu: 1 };
    var m166b = M(mkProf([]), w166b);                  /* 双功法无天赋：0.8×0.8=0.64（旧加算 1.6 缺陷修复） */
});
