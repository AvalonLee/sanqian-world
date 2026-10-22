/* .tests/smoke/02-gear-cave-learn.js — 冒烟断言 41 条（首 #80 ‖ 末 #127）
 * 由 smoke.js 的 run() 体逐字切出（原第 1117~2187 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：80 81 90 91 92 93 94 95 96 97 98 99 100 101 102 103 105 128 105 105 105 106 107 108 113 105 123 117 118 119 120 121 122 20 20 20 20 124 125 126 127
*/
window.SQSmoke.frag('02-gear-cave-learn', async function () {
    ok(80, '上品套压线 ±5% · 灵品套稳过', ok80, det80);

    /* #81 通胀回归（v1.13 按档位分设护栏：左/魔 70% · 正 85%）：1h 炼化返还 < 1h 击杀灵石 × 档位线；
     * 口径同 §九.12② 模拟：60 杀/h · 三档同 build（ΣdropRate +25% / ΣstonesRate +35%）·
     * 魔道档含 dropTierUpChance 0.40 的炼化期望上浮 */
    var GUARD81 = { right: 0.85, neutral: 0.70, evil: 0.70 };
    var ok81 = true, det81 = '';
    ['right', 'neutral', 'evil'].forEach(function (tierKey) {
      var eff81 = D.ALIGN_EFFECTS[tierKey];
      for (var r81 = 0; r81 <= 9; r81++) {
        var killsH = 60;
        var drops = killsH * D.DROP_BASE * (1 + 0.25) * eff81.dropRateMult;
        var avgRefine = 0;
        D.ZONES[r81].drops.forEach(function (wgt, ti) {
          var up81 = eff81.dropTierUpChance;
          var valTi = D.GEAR_TIERS[ti].refine;
          var valUp = ti < D.GEAR_TIERS.length - 1 ? D.GEAR_TIERS[ti + 1].refine : valTi;
          avgRefine += wgt / 100 * ((1 - up81) * valTi + up81 * valUp);
        });
        var refineIncome = drops * avgRefine * (1 + r81 * 0.5);
        var killIncome = killsH * D.ZONES[r81].stones * (1 + 0.35);
        if (refineIncome >= killIncome * GUARD81[tierKey]) {
          ok81 = false;
          det81 = tierKey + ' r' + r81 + ':' + refineIncome.toFixed(0) + '>=' + (killIncome * GUARD81[tierKey]).toFixed(0);
        }
      }
    });
    ok(81, '炼化收入分档护栏（左/魔 70% · 正 85%）', ok81, det81);

    /* ═══ P5 · 验收 4.10 角色属性（#90~#95）═══ */

    /* #90 属性重算逐项对表 + 穿脱不变 */
    var w90 = mkWs({ realm: 2 });
    w90.artsSlots = ['tuna']; w90.artsLevels = { tuna: 3 };
    w90.gear.weapon = mkGear('weapon', { tier: 3, attrValue: { attr: 'jing', value: 10 } });
    w90.attrEventBonus = { jing: 0, qi: 0, shen: 2 };
    pack.recalcDerived(w90, mkProf());
    var a90 = JSON.stringify(w90.attrs);
    for (var i90 = 0; i90 < 100; i90++) {
      var saved = w90.gear.weapon; w90.gear.weapon = null; pack.recalcDerived(w90, mkProf());
      w90.gear.weapon = saved; pack.recalcDerived(w90, mkProf());
    }
    ok(90, '属性构成对表（18基+滋养+装备+事件）+ 穿脱不变',
      w90.attrs.jing === 18 + 10 && w90.attrs.qi === 18 + 6 && w90.attrs.shen === 18 + 2 &&
      JSON.stringify(w90.attrs) === a90, a90);

    /* #91 dc 随境界漂移：旧内容自动降难 */
    var w91a = mkWs({ realm: 0 }); pack.recalcDerived(w91a, mkProf());
    var w91b = mkWs({ realm: 5 }); pack.recalcDerived(w91b, mkProf());
    w91a.attrs.shen = 60; w91b.attrs.shen = 60;
    var pA = SQ.Attrs.check('shen', 'hard', w91a, D, { hooks: {} }).p;
    var pB = SQ.Attrs.check('shen', 'hard', w91b, D, { hooks: {} }).p;
    ok(91, 'dc 漂移：同属性高境界难度上升',
      SQ.Attrs.dcOf(w91a, D, 'medium') === 12 && SQ.Attrs.dcOf(w91b, D, 'medium') === 72 && pA > pB && pA === 0.95,
      pA + '→' + pB.toFixed(3));

    /* #92 判定 clamp：裸身(dc/2) 中等恒 25%；attr=0 → 5%；≥1.9dc → 95% */
    var w92 = mkWs({ realm: 0 }); pack.recalcDerived(w92, mkProf());
    var bare92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }).p;   /* attr=6=dc/2 */
    w92.attrs.jing = 0;
    var zero92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }).p;
    w92.attrs.jing = 1.9 * 12;
    var high92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }).p;
    /* 正道档 checkDcMult 0.95（B4）：dc 12→11.4 → p = 0.5+(6−11.4)/22.8 */
    var pDc92 = SQ.Attrs.check('jing', 'medium', w92, D, { hooks: {} }, 0.95);
    ok(92, '判定 clamp（25%/5%/95%）+ 正道 dcMult 0.95',
      Math.abs(bare92 - 0.25) < 1e-9 && Math.abs(zero92 - 0.05) < 1e-9 && high92 === 0.95 &&
      Math.abs(pDc92.dc - 11.4) < 1e-9, 'pDc=' + pDc92.p.toFixed(4));

    /* #93 瓶颈精判定：×3 → ×2，跌破恢复 */
    var w93 = mkWs({ realm: 0, zone: 1 });
    pack.recalcDerived(w93, mkProf());
    var pen93a = SQ.Combat.bottleneckOf(w93, pack, D, M(mkProf(), w93)).intervalPenalty;
    w93.attrEventBonus.jing = 6;  /* 6+6=12 ≥ dc12 */
    pack.recalcDerived(w93, mkProf());
    var pen93b = SQ.Combat.bottleneckOf(w93, pack, D, M(mkProf(), w93)).intervalPenalty;
    w93.attrEventBonus.jing = 0;
    pack.recalcDerived(w93, mkProf());
    var pen93c = SQ.Combat.bottleneckOf(w93, pack, D, M(mkProf(), w93)).intervalPenalty;
    ok(93, '精达标瓶颈 ×3→×2 · 跌破恢复', pen93a === 3 && pen93b === 2 && pen93c === 3);

    /* #94 神→损失区间 [40%,60%] + 天赋加算 + 总 clamp [30%,70%] */
    var w94a = mkWs({ realm: 0 }); pack.recalcDerived(w94a, mkProf());          /* shen 6, dc 12 → +0.05 → 0.55? */
    var w94b = mkWs({ realm: 0 }); w94b.attrEventBonus.shen = 18; pack.recalcDerived(w94b, mkProf()); /* shen 24 = 2dc → -0.1 → 0.4 */
    var l94a = SQ.XTrib.loss(w94a, pack, D, M(mkProf(), w94a));
    var l94b = SQ.XTrib.loss(w94b, pack, D, M(mkProf(), w94b));
    var w94c = mkWs({ realm: 0 });
    var p94c = mkProf([mkTalent({ tribFailLossMod: 0.5 })]);
    var l94c = SQ.XTrib.loss(w94c, pack, D, M(p94c, w94c));
    var w94d = mkWs({ realm: 0 }); w94d.attrEventBonus.shen = 18;
    var p94d = mkProf([mkTalent({ tribFailLossMod: -0.5 })]);
    w94d.artsSlots = ['jinzhong']; w94d.artsLevels = { jinzhong: 1 }; pack.recalcDerived(w94d, p94d);
    var l94d = SQ.XTrib.loss(w94d, pack, D, M(p94d, w94d));
    ok(94, '神损失修正 [40,60]% + 总 clamp [30,70]%',
      Math.abs(l94a - 0.45) < 1e-9 && Math.abs(l94b - 0.6) < 1e-9 && l94c === 0.7 && l94d === 0.3,
      [l94a, l94b, l94c, l94d].join('/'));

    /* #95 善行判定守则：判定失败 → karma 照记（分支定值）、正向收益减半 */
    var w95 = mkWs({ realm: 1, stones: 0, qi: 1000 });
    pack.recalcDerived(w95, mkProf());
    /* 期望值按双锚公式推（灵石 = K×ZONES[1].stones = 0.6），不写死魔数 */
    var ev95 = SQ.Events.findById(pack, 'traveling_doctor');
    var band95 = ev95.choices.evil.gain.filter(function (g) { return g.type === 'stones'; })[0].n;
    var roll95 = band95[0] + 0.9999 * (band95[1] - band95[0]);
    var exp95 = Math.round(Math.round(roll95 * SQ.Events.stoneScaleOf(w95, D)) * 0.5);
    var restore95 = stubRandom([0.9999, 0.9999]);  /* 神·中等必败（p=0.25）· stones roll 近上限 */
    var r95 = SQ.Events.resolveBranch(w95, pack, D, M(mkProf(), w95), 'traveling_doctor', 'evil', Date.now(), { log: noopLog(), profile: mkProf() });
    restore95();
    ok(95, '判定失败 karma 照记（−7）+ 收益减半（刷图锚 0.6）',
      r95.pass === false && r95.karma === -7 && w95.karmaEventScore === -7 && w95.stones === exp95 &&
      w95.eventHistory.feed[0].pass === false,
      'stones=' + w95.stones + '/' + exp95 + ' k=' + w95.karmaEventScore);

    /* ═══ P5 · 验收 4.11 门槛与特殊属性（#96~#103、#105；#104 gateMod 属古武 P6）═══ */

    /* #96 佩戴要求拦截 → 库藏阁；境界提升复检参与择优 */
    var w96 = mkWs({ realm: 0 });
    var it96 = mkGear('weapon', { tier: 4, atk: 30, reqs: { realm: 6 } });
    var r96a = SQ.Gear.autoEquip(w96, pack, D, M(mkProf(), w96), it96, null);
    var stashed96 = w96.gear.weapon === null && w96.stash.length === 1;
    w96.realm = 6;
    SQ.Gear.recheckStash(w96, pack, D, M(mkProf(), w96), null);
    ok(96, '未达标入库藏阁 · 达标复检佩戴',
      r96a.action === 'stash' && stashed96 && w96.gear.weapon === it96 && w96.stash.length === 0,
      'a=' + r96a.action + ' stashed=' + stashed96 + ' worn=' + !!w96.gear.weapon);

    /* #97 极品词条追加 +1 且生成时定格（roll 掷序：atk → slot → name → qiBonus → resist → specialP；指定 slot 省一掷）
     * 注意：mkWs 必须在 stubRandom **之前**调用——initialState 现含游戏历起始年的 Math.random 掷（v2.3），
     * 在 stub 区内调用会偷走掷序首位，resist 高位掷落空 → prime 不触发。 */
    var w97 = mkWs({ realm: 2 });
    var restore97 = stubRandom([0.5, 0.5, 0.5, 0.95, 0.5]); /* resist 高位 → prime */
    var it97 = SQ.Gear.roll(w97, pack, D, 2, { sum: { gearLuck: 0 } }, { tier: 2, align: 'neutral', slot: 'weapon' });
    restore97();
    var reqSnap = it97.reqs.realm;
    ok(97, '极品词条 reqs+1 定格', it97.resist >= 76 && reqSnap === 3,
      'resist=' + it97.resist + ' req=' + reqSnap);

    /* #98 库藏阁容量 12：第 13 件入库炼化最低分且日志带 special 标记 */
    var w98 = mkWs({ realm: 0 });
    var logs98 = [];
    for (var i98 = 0; i98 < 12; i98++) {
      SQ.Gear.autoEquip(w98, pack, D, M(mkProf(), w98),
        mkGear('weapon', i98 === 0
          ? { tier: 2, atk: 1, reqs: { realm: 6 }, special: 'sword_heart' }   /* 最低分且带 special */
          : { tier: 2, atk: 10 + i98, reqs: { realm: 6 } }),
        function (c, t) { logs98.push(t); });
    }
    SQ.Gear.autoEquip(w98, pack, D, M(mkProf(), w98), mkGear('weapon', { tier: 2, atk: 5, reqs: { realm: 6 } }), function (c, t) { logs98.push(t); });
    ok(98, '库藏阁容量 12 · 溢出炼化最低分带 special 标记',
      w98.stash.length === 12 && logs98.some(function (x) { return x.indexOf(SQ.t('gear.special.sword_heart', null, 'xiuxian')) >= 0; }),
      'stash=' + w98.stash.length);

    /* #99 无视佩戴要求：拾取即参与择优 */
    var w99 = mkWs({ realm: 0 });
    var it99 = mkGear('weapon', { tier: 4, atk: 30, reqs: { realm: 6 }, special: 'ignore_req' });
    ok(99, 'ignore_req 无视佩戴要求', SQ.Gear.canWear(it99, w99) &&
      SQ.Gear.autoEquip(w99, pack, D, M(mkProf(), w99), it99, null).action === 'equip');

    /* #100 特殊词条概率采样：上3% 灵8% 仙15% ±1.5pp，凡/良 0% */
    function specialRate(tier, n) {
      var c = 0;
      for (var i = 0; i < n; i++) {
        if (SQ.Gear.roll(mkWs({ realm: 6 }), pack, D, 6, { sum: { gearLuck: 0 } }, { tier: tier }).special) c++;
      }
      return c / n;
    }
    var s0 = specialRate(0, 500), s1 = specialRate(1, 500);
    var s2 = specialRate(2, 10000), s3 = specialRate(3, 10000), s4 = specialRate(4, 10000);
    ok(100, '特殊词条概率 3/8/15% ±1.5pp · 凡良 0',
      s0 === 0 && s1 === 0 && Math.abs(s2 - 0.03) < 0.015 && Math.abs(s3 - 0.08) < 0.015 && Math.abs(s4 - 0.15) < 0.015,
      [s2, s3, s4].map(function (x) { return (x * 100).toFixed(2) + '%'; }).join('/'));

    /* #101 功法学习要求：未达标入架标红 → 达标自动入门；黑市购买仍拦截 */
    var w101 = mkWs({ realm: 0 });
    var g101 = SQ.Arts.gainArt(w101, pack, D, 'duohun', noopLog());  /* 化神4 + karma≤-200 + 精≥30 */
    var lack101 = SQ.Arts.lacks(w101, pack, D, 'duohun').length;
    w101.realm = 4; w101.karmaEventScore = -250; w101.attrEventBonus.jing = 0;
    pack.recalcDerived(w101, mkProf()); /* recalc 内含 recheckShelf；精 = 30 基础 ✓ */
    var learned101 = w101.artsKnown.indexOf('duohun') >= 0 && w101.shelf.indexOf('duohun') < 0;
    /* 黑市购买拦截：karma 回升后新购魔道功法仍留架 */
    var w101b = mkWs({ realm: 4 });
    SQ.Arts.gainArt(w101b, pack, D, 'zhuxian', noopLog()); /* karma ≤ -400 */
    pack.recalcDerived(w101b, mkProf());
    ok(101, '学习要求拦截 → 达标自动入门',
      g101 === 'shelf' && lack101 === 3 && learned101 && w101b.shelf.indexOf('zhuxian') >= 0);

    /* #102 特殊属性挂点白名单 + 损失合计 clamp（#94 已验 clamp，此处验挂点全集） */
    /* 挂点白名单（工程规范 §2.2）：修仙 15 + G13 洞府 2（on_cave_enter/on_cave_mult，v2.1 登记）
     * + 古武 P6 预留 2（on_gate/on_gate_next） */
    var WHITELIST = ['on_kill_stones', 'on_kill_drop', 'on_claim_qi', 'on_claim_stones', 'on_tick_idle',
      'on_negative_event', 'on_debuff_apply', 'on_bottleneck', 'on_trib_fail', 'on_trib_next', 'on_check',
      'on_shop_refresh', 'on_refine', 'on_shop_price', 'on_offline_cap', 'on_gate', 'on_gate_next',
      'on_cave_enter', 'on_cave_mult'];
    var badHooks = [];
    for (var id102 in SQ.XARTS) {
      var sp = SQ.XARTS[id102].special;
      if (!D.SPECIAL_POOL[sp.pool]) { badHooks.push(id102 + ':nopool'); continue; }
      if (WHITELIST.indexOf(D.SPECIAL_POOL[sp.pool].hook) < 0) badHooks.push(id102 + ':' + D.SPECIAL_POOL[sp.pool].hook);
    }
    var declared = Object.keys(pack.specialHooks);
    /* G13 两个新挂点必须是引擎真实读取点（防「只登记不接线」）：cave.js 内各出现一次 */
    var caveSrc = SQ.Cave.multOf.toString() + SQ.Cave.enter.toString() + SQ.Cave.hookSum.toString();
    var wired = caveSrc.indexOf('on_cave_mult') >= 0 && caveSrc.indexOf('on_cave_enter') >= 0;
    /* 混沌三签名（融合扩容批 v1.3）：池数 18→21，hook 挂既有白名单名零新增；
     * 消费点接线同款护栏——hundun→events.fire / zaohua→combat.simulate / taiyi→idle.settle */
    var chaosWired = SQ.Events.fire.toString().indexOf('hundun') >= 0 &&
      SQ.Combat.simulate.toString().indexOf('zaohua') >= 0 &&
      SQ.Idle.settle.toString().indexOf('taiyi') >= 0;
    var chaosInWhitelist = ['hundun', 'zaohua', 'taiyi'].every(function (cp) {
      return D.SPECIAL_POOL[cp] && WHITELIST.indexOf(D.SPECIAL_POOL[cp].hook) >= 0;
    });
    ok(102, '功法特殊属性全部走挂点白名单（含独占签名 3 条 + 混沌签名 3 池消费点接线 + 洞府 2 挂点已接线）',
      badHooks.length === 0 && declared.length === 21 && wired && chaosWired && chaosInWhitelist && WHITELIST.length === 19,
      badHooks.join(',') + ' hooks=' + declared.length + ' 白名单=' + WHITELIST.length + ' 洞府挂点接线=' + wired + ' 混沌接线=' + chaosWired);

    /* #103 品阶要求带 + 属性门槛 = 裸身基础值（70 部逐条；event_locked 独占允许上浮 +6~+12，功法全录 §2.5） */
    var BAND = { huang: 1, xuan: 2, di: 4, tian: 8 };
    var bad103 = [];
    for (var id103 in SQ.XARTS) {
      var a103 = SQ.XARTS[id103];
      var rr = a103.reqs.realm != null ? a103.reqs.realm : 0;
      if (rr > BAND[a103.tier]) bad103.push(id103 + ':band');
      if (a103.reqs.attr) {
        var base103 = (a103.reqs.realm + 1) * 6;
        if (a103.obtain.type === 'event_locked') {
          if (a103.reqs.attr.min < base103 || a103.reqs.attr.min > base103 + 12) bad103.push(id103 + ':attr' + a103.reqs.attr.min);
        } else if (a103.reqs.attr.min !== base103) bad103.push(id103 + ':attr' + a103.reqs.attr.min);
      }
    }
    ok(103, '品阶要求带 + 属性门槛（70 部 · 独占 +6~12）', bad103.length === 0, bad103.join(','));

    /* #105 同乘区功法层极限审计（通用规范 §一 · 第卅八批品阶重排换基线）
     * 口径两处一起改：① 缩放从「×5」纠正为**×9**（Lv9 满级 = 每级 ×9，与 §一 现行表的推导式一致——
     *   旧写法留着 Lv5 时代的 ×5 与 300% 一档，是「判据口径落后于机制」的又一形）；
     *   ② 上限 = 新表 top6 每级合计 ×9 向上取整（**恰顶格、零余量** = 本仓惯例：任何一部功法词条再涨都会红）。
     * 口径（通用规范 §一 v2.3 澄清）：本上限 = **功法层六槽自身**极限；洞府签名/装备词条/道友助力
     * 是 §8.2 独立登记的小额加算来源，各有不叠加或合计封顶约束，不并入本合计。签名预算另见 #128。 */
    /* 🔧 返工：上限档 = **top6 每级合计 ×9 向上取整到两位小数**（先前几处手调成 12.40/10.00/10.35/1.20/2.05/2.35
     * 与自述推导式差 0.01~0.03 ⇒ 「恰顶格、零余量」那句话当时并不成立）。现在每个数都能从 #153 那行算出来。 */
    var CAPS105 = { combatPower: 12.38, qiRate: 10.72, offlineEff: 9.99, combatSpeed: 10.33, qiCap: 10.45,
      stonesRate: 7.20, artsSpeed: 1.17, eventLuck: 2.03, eventRate: 2.34, dropRate: 0.81, tribBonus: 0.59 };
    var per105 = {};
    for (var id105 in SQ.XARTS) {
      var ef = SQ.XARTS[id105].effects;
      for (var k105 in ef) (per105[k105] = per105[k105] || []).push(ef[k105] * 9);
    }
    var bad105 = [];
    for (var f105 in per105) {
      var top = per105[f105].sort(function (a, b) { return b - a; }).slice(0, 6);
      var sum105 = top.reduce(function (s, v) { return s + v; }, 0);
      var capv = CAPS105[f105] != null ? CAPS105[f105] : (f105 === 'realmCost' ? 0 : Infinity);
      if (f105 === 'realmCost') { if (sum105 < -0.18 - 1e-9) bad105.push(f105 + '=' + sum105); }
      else if (sum105 > capv + 1e-9) bad105.push(f105 + '=' + (sum105 * 100).toFixed(0) + '%>' + (capv * 100) + '%');
    }
    ok(105, '功法层极限审计（六槽自身，逐字段上限）', bad105.length === 0, bad105.join(','));

    /* #128 洞府签名预算对表（数值详设 §8.2 · 引擎卷 §2.5）：字段集合与单驻最大值锁定——
     * offlineEff ≤0.15 / combatPower ≤0.06 / artsSpeed ≤0.15 / tribBonus ≤0.02；
     * **禁 qiRate 签名**（caveMult 已是独立乘区，再进加算池 = 双吃产出轴，防击穿 #105 的原意）。
     * 驻留唯一 ⇒ 签名天然不叠加，无需合计封顶。 */
    var sig128 = {};
    (D.CAVES || []).forEach(function (c) {
      var sg = c.signature;
      if (!sg) return;
      sig128[sg.field] = Math.max(sig128[sg.field] || 0, sg.value);
    });
    var BUDGET128 = { offlineEff: 0.15, combatPower: 0.06, artsSpeed: 0.15, tribBonus: 0.02 };
    var bad128 = [];
    for (var f128 in sig128) {
      if (BUDGET128[f128] == null) bad128.push(f128 + '=未登记字段');
      else if (sig128[f128] > BUDGET128[f128] + 1e-9) bad128.push(f128 + '=' + sig128[f128] + '>' + BUDGET128[f128]);
    }
    ok('128', '洞府签名预算对表 §8.2（禁 qiRate · 逐字段上限）', bad128.length === 0,
      bad128.join(',') || JSON.stringify(sig128));

    /* ═══ 批 1 · 独占通道 / 掉落位移 / 存档新字段 / 内容 lint / 问道初心 ═══ */

    /* #105a 独占法宝：atk 按最高首通定格缩放 · 免自动择优（exclusive_hold）· 库藏阁溢出豁免 · gearSeen 入录 */
    var wa = mkWs({ realm: 6, cleared: [0, 1, 2, 3] });
    pack.recalcDerived(wa, mkProf());
    var scaleA = Math.max(D.REALMS[D.ZONES[3].unlock].power / 100, 1);
    var ita = SQ.Gear.grantExclusive(wa, pack, D, M(mkProf(), wa), 'evil_sword', { type: 'event', ref: 'evil_sword_remnant' }, noopLog());
    var atkOk = ita && ita.atk === Math.round(36 * scaleA) && ita.exclusive === 'evil_sword' &&
      ita.reqs.realm === D.GEAR_TIERS[4].req && ita.special === 'ignore_req' &&
      wa.gearSeen['ex_evil_sword'] != null && ita.source.type === 'event' && wa.gear.weapon === ita;
    var bigA = mkGear('weapon', { tier: 4, atk: 999999 });
    var ra = SQ.Gear.autoEquip(wa, pack, D, M(mkProf(), wa), bigA, noopLog());
    var holdOk = ra.action === 'exclusive_hold' && wa.gear.weapon === ita && wa.stash.indexOf(bigA) >= 0;
    var wex = mkWs({ realm: 0 });
    var exIt = mkGear('weapon', { tier: 4, atk: 1, reqs: { realm: 9 }, exclusive: 'evil_sword' });
    wex.stash = [exIt];
    for (var ix = 0; ix < 12; ix++) wex.stash.push(mkGear('weapon', { tier: 0, atk: 10 + ix, reqs: { realm: 9 } }));
    SQ.Gear.autoEquip(wex, pack, D, M(mkProf(), wex), mkGear('weapon', { tier: 0, atk: 5, reqs: { realm: 9 } }), noopLog());
    var exSurvive = wex.stash.indexOf(exIt) >= 0 && wex.stash.length === D.STASH_CAP;
    ok('105a', '独占法宝：定格缩放 + 免择优/免溢出炼化 + 入录',
      atkOk && holdOk && exSurvive,
      JSON.stringify({ atk: ita && ita.atk, scale: scaleA, act: ra.action, survive: exSurvive }));

    /* #105a2 独占功法授予门槛：判定链失败 → exclusiveLocked 只解锁图鉴；全过 → gainArt 入门/入架 */
    var wx = mkWs({ realm: 5, karmaEventScore: 400 });   /* 链上 karma ≥ +400 须事前达成（判定先于 +25 入账） */
    pack.recalcDerived(wx, mkProf());
    var restoreX1 = stubRandom([0]);                            /* 神·困难过 */
    var rx1 = SQ.Events.resolveBranch(wx, pack, D, M(mkProf(), wx), 'red_dust_trial', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreX1();
    var gotArt = wx.artsKnown.indexOf('red_dust') >= 0 || wx.shelf.indexOf('red_dust') >= 0;
    var wy = mkWs({ realm: 5, karmaEventScore: 0 });            /* karma 链第二环 <400 → 败 */
    pack.recalcDerived(wy, mkProf());
    var restoreY = stubRandom([0]);
    var ry = SQ.Events.resolveBranch(wy, pack, D, M(mkProf(), wy), 'red_dust_trial', 'right', Date.now(), { log: noopLog(), profile: mkProf() });
    restoreY();
    ok('105a2', '独占功法：链全过授予 · 失败只锁奖励',
      rx1.pass === true && gotArt && ry.pass === false && ry.eff.exclusiveLocked === 'red_dust' &&
      wy.artsKnown.indexOf('red_dust') < 0 && wy.shelf.indexOf('red_dust') < 0,
      JSON.stringify([rx1.pass, gotArt, ry.eff]));

    /* #105c 掉落阵营分布三档对表（dropAlignW ±2pp · 各 2 万次——福地三批测试加固①恢复：σ 减半消偶发超界，
     * 工程规范 §4.3 同步登记）+ 魔道档 tierUpChance 40%±1.5pp（正/左 0） */
    function dropSample(tierKey) {
      var w = mkWs({ realm: 3, zone: 0 });
      var eff = D.ALIGN_EFFECTS[tierKey];
      var cnt = { neutral: 0, right: 0, evil: 0 }, up = 0;
      for (var i = 0; i < 20000; i++) {
        var it = SQ.Gear.roll(w, pack, D, 0, { sum: { gearLuck: 0 } },
          { alignW: eff.dropAlignW, tierUpChance: eff.dropTierUpChance });
        cnt[it.alignment]++;
        if (it.tierUp) up++;
      }
      return { cnt: cnt, up: up };
    }
    /* 固定种子抽样（2026-10-09 治理批·复核收尾）：原用真实 Math.random 抽 3×20,000 次比 ±2pp，单跑红率约 1~3%（其注释自陈曾因「偶发超界」把样本从 1 万加到 2 万 = 同类噪声前科），判据数值一字未动 */
    var seed105 = 1052026, origRand105 = Math.random;
    Math.random = function () {
      seed105 |= 0; seed105 = (seed105 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed105 ^ (seed105 >>> 15), 1 | seed105);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    var sR = dropSample('right'), sN = dropSample('neutral'), sE = dropSample('evil');
    Math.random = origRand105;
    function alignClose(s, tierKey) {
      var w = D.ALIGN_EFFECTS[tierKey].dropAlignW;
      return Math.abs(s.cnt.neutral / 20000 - w.neutral / 100) < 0.02 &&
        Math.abs(s.cnt.right / 20000 - w.right / 100) < 0.02 &&
        Math.abs(s.cnt.evil / 20000 - w.evil / 100) < 0.02;
    }
    ok('105c', 'dropAlignW 三档 ±2pp · tierUp 40%±1.5pp（正/左 0）· 2026-10-09 起**固定种子抽样**（3×20,000 抽，判据数值未动）',
      alignClose(sR, 'right') && alignClose(sN, 'neutral') && alignClose(sE, 'evil') &&
      sR.up === 0 && sN.up === 0 && Math.abs(sE.up / 20000 - 0.40) < 0.015,
      'up=' + [sR.up, sN.up, sE.up].join('/'));

    /* ═══ 批 2 · 验收 4.12 四柱（#106~#108 / #113）+ 4.11（105b）═══ */

    /* #106 洞府初始态 + 驻留唯一 + 迁居 24h 冷却（绝对时间戳，跨离线生效） */
    var w106 = mkWs();
    var cave106 = SQ.Cave.current(w106, pack);
    var mult106 = SQ.Cave.multOf(w106, pack, D, M(mkProf(), w106));
    var t106 = Date.now();
    w106.realm = 6; w106.cleared = [0, 1, 2, 3, 4, 5, 6]; w106.stones = 1e9;
    pack.recalcDerived(w106, mkProf());
    var r106a = SQ.Cave.enter(w106, pack, D, M(mkProf(), w106), 'immortal_abode', t106, { log: noopLog() });
    var owned106 = w106.cave.owned.slice();
    var curA106 = w106.cave.current;      /* 立刻快照：后续迁居会改写 current */
    var cd106 = w106.cave.cooldownUntil;
    var r106b = SQ.Cave.enter(w106, pack, D, M(mkProf(), w106), 'star_fall', t106 + 180000, { log: noopLog() });   /* 冷却中段（v2.8：CD = 游戏 1 年 = 360s，探针取半程） */
    var still106 = w106.cave.current;
    var r106c = SQ.Cave.enter(w106, pack, D, M(mkProf(), w106), 'star_fall', t106 + D.CAVE_SWITCH_CD_MS + 1, { log: noopLog() });
    var c106 = {
      init: cave106.id === D.CAVE_INITIAL, mult1: mult106 === 1, ownedInit: w106.cave.owned.length >= 1,
      enterA: r106a.ok === true, curA: curA106 === 'immortal_abode',
      noDup: owned106.filter(function (x) { return x === 'immortal_abode'; }).length === 1,
      cdAbs: cd106 === t106 + D.CAVE_SWITCH_CD_MS,
      rejectB: r106b.ok === false && r106b.reason === 'cooldown', holdB: still106 === 'immortal_abode',
      enterC: r106c.ok === true, curC: w106.cave.current === 'star_fall'
    };
    var bad106 = Object.keys(c106).filter(function (k) { return !c106[k]; });
    ok(106, '初始洞府 mult 1.00 · 驻留唯一 · 迁居游戏 1 年冷却拒绝', bad106.length === 0,
      bad106.length ? '失败项=' + bad106.join(',') + ' | init=' + cave106.id + '/' + mult106 +
        ' a=' + r106a.ok + '/' + r106a.reason + ' b=' + r106b.ok + '/' + r106b.reason +
        ' c=' + r106c.ok + '/' + r106c.reason + ' cd=' + cd106 + '/' + (t106 + D.CAVE_SWITCH_CD_MS) +
        ' owned=' + owned106.join('+') + ' cur=' + w106.cave.current
        : 'owned=' + owned106.join('+') + ' cd=+' + ((cd106 - t106) / 3600000) + 'h');

    /* #107 入驻资格三要素逐项拦截 + 扣费走 mutate + ledger.out.cave + owned 不重复 + 已拥有免付费 */
    var w107 = mkWs({ realm: 0, stones: 100 });
    var chk107 = SQ.Cave.canEnter(w107, pack, D, 'green_peak', Date.now());
    var kinds107 = chk107.lack.map(function (x) { return x.kind; }).sort().join(',');
    /* 缺首通：境界已够（金丹 2 ≥ realmMin 2）但 cleared 无秘境 3 → lack 只应是 zone */
    var w107z = mkWs({ realm: 2, stones: 100000, cleared: [0, 1, 2] });
    var chk107z = SQ.Cave.canEnter(w107z, pack, D, 'sword_cliff', Date.now());
    localStorage.removeItem(SQ.KEY);
    var ref107 = {};
    await SQ.mutate(ref107, function (s) {
      s.profile = { name: '洞府', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.realm = 3;
      s.worlds.xiuxian.stones = 100000;
      s.worlds.xiuxian.cleared = [0, 1, 2, 3];
    });
    var res107 = await SQ.Actions.enterCave(ref107, 'green_peak');
    var w107b = ref107.worlds.xiuxian;
    var st107 = w107b.stones, led107 = w107b.ledger.out.cave, own107 = w107b.cave.owned.slice();
    /* 已拥有 + 冷却解除 → 再入驻免付费、owned 不重复 */
    await SQ.mutate(ref107, function (s) { s.worlds.xiuxian.cave.cooldownUntil = 0; });
    var res107c = await SQ.Actions.enterCave(ref107, 'market_yard');
    await SQ.mutate(ref107, function (s) { s.worlds.xiuxian.cave.cooldownUntil = 0; });
    var res107d = await SQ.Actions.enterCave(ref107, 'green_peak');
    ok(107, '资格三要素拦截 · mutate 扣费 + ledger.out.cave · owned 不重复 · 已拥有免费',
      chk107.ok === false && kinds107 === 'realm,stones' &&
      chk107z.ok === false && chk107z.lack.length === 1 && chk107z.lack[0].kind === 'zone' &&
      res107.ok === true && res107.cost === 20000 && st107 === 80000 && led107 === 20000 &&
      own107.filter(function (x) { return x === 'green_peak'; }).length === 1 &&
      res107c.ok === true && res107d.ok === true && res107d.cost === 0 &&
      ref107.worlds.xiuxian.ledger.out.cave === 20000 &&
      ref107.worlds.xiuxian.cave.owned.filter(function (x) { return x === 'green_peak'; }).length === 1,
      'lack=' + kinds107 + ' zone=' + chk107z.lack[0].kind + ' cost=' + res107.cost +
      ' stones=' + st107 + ' ledger=' + led107 + ' 再入驻=' + res107d.cost);

    /* #108 caveMult 独立乘区（不进 qiRate 加算池）+ 在线/离线同口径 + 签名驻留期生效、搬离即失 */
    function caveWs(id, realm) {
      var w = mkWs({ realm: realm || 2 });
      if (id) { w.cave.current = id; w.cave.owned = [D.CAVE_INITIAL, id]; }
      pack.recalcDerived(w, mkProf());
      return w;
    }
    var wPl108 = caveWs(null, 2), wSf108 = caveWs('star_fall', 2);
    var mPl108 = M(mkProf(), wPl108), mSf108 = M(mkProf(), wSf108);
    var ratePl108 = SQ.Idle.rateOf(wPl108, pack, D, mPl108);
    var rateSf108 = SQ.Idle.rateOf(wSf108, pack, D, mSf108);
    /* 独立乘区：qiRate 加算池两档必须相同，差异全部来自末端 caveMult */
    var qiRateSame = Math.abs(mPl108.sum.qiRate - mSf108.sum.qiRate) < 1e-12;
    /* 签名（星髓滋养 offlineEff +15%）只走既有乘区加算，来源登记 cave */
    var sigOk = Math.abs((((mSf108.detail.offlineEff || {}).cave) || 0) - 0.15) < 1e-9 &&
      Math.abs(mSf108.sum.offlineEff - mPl108.sum.offlineEff - 0.15) < 1e-9;
    /* 搬离即失 */
    wSf108.cave.current = D.CAVE_INITIAL;
    pack.recalcDerived(wSf108, mkProf());
    var mOff108 = M(mkProf(), wSf108);
    var leftOk = SQ.Cave.multOf(wSf108, pack, D, mOff108) === 1 &&
      (((mOff108.detail.offlineEff || {}).cave) || 0) === 0;
    /* 在线/离线同口径：离线结算倍率 = caveMult ×（离线效率含签名 offlineEff） */
    var nowA = Date.now();
    var wOn108 = caveWs(null, 5), wCv108 = caveWs('star_fall', 5), wSw108 = caveWs('sword_cliff', 5);
    /* 绵长内息（tuna 签名）在 settle 内每段掷双倍——不桩则三档离线比是随机比（2026-10-14 实测 20 跑 1 红，
     * dev 同现）；恒高值 = 双倍恒不中，比数回到纯乘区差。 */
    var restore108 = stubRandom(function () { return 0.99999; });
    SQ.Idle.settle(wOn108, pack, D, 2 * 3600000, nowA, { log: noopLog(), profile: mkProf() });
    SQ.Idle.settle(wCv108, pack, D, 2 * 3600000, nowA, { log: noopLog(), profile: mkProf() });
    SQ.Idle.settle(wSw108, pack, D, 2 * 3600000, nowA, { log: noopLog(), profile: mkProf() });
    restore108();
    var offSf108 = wCv108.qi / wOn108.qi;      /* 1.25 × (0.5+0.15)/0.5 = 1.625 */
    var offSw108 = wSw108.qi / wOn108.qi;      /* 1.12（剑崖签名不涉离线） */
    /* 引擎硬顶：表值超 CAVE_MULT_CAP 即被截断（世界包不得超） */
    var wCap108 = caveWs(null, 2);
    wCap108.cave.current = '__fake__';
    var capOk = SQ.Cave.multOf(wCap108, pack, D, M(mkProf(), wCap108)) === 1;   /* 脏 id 回落初始 */
    ok(108, 'caveMult 独立乘区 + 在线离线同口径 + 签名驻留期生效',
      qiRateSame && Math.abs(rateSf108 / ratePl108 - 1.25) < 1e-9 &&
      Math.abs(SQ.Cave.multOf(caveWs('immortal_abode', 2), pack, D, M(mkProf(), caveWs('immortal_abode', 2))) - 1.35) < 1e-9 &&
      sigOk && leftOk && capOk &&
      Math.abs(offSf108 - 1.625) < 1e-6 && Math.abs(offSw108 - 1.12) < 1e-6,
      'rate比=' + (rateSf108 / ratePl108).toFixed(4) + ' qiRate同=' + qiRateSame +
      ' 签名=' + sigOk + ' 搬离=' + leftOk + ' 离线=' + offSf108.toFixed(4) + '/' + offSw108.toFixed(4) +
      ' qi=' + [wOn108.qi, wCv108.qi, wSw108.qi].join('/') + ' realm=' + [wOn108.realm, wSw108.realm].join('/'));

    /* #113 ledger 对账：随机操作序列后 100 + Σin − Σout === stones（零漂移）；只增不清、跨渡劫不清零 */
    localStorage.removeItem(SQ.KEY);
    var ref113 = {};
    await SQ.mutate(ref113, function (s) {
      s.profile = { name: '总账', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      var w = s.worlds.xiuxian;
      w.realm = 3; w.qi = 0; w.cleared = [0, 1, 2, 3, 4];
      w.artsKnown = ['tuna', 'juling', 'yunzong', 'qingxin'];
      w.artsSlots = ['tuna', 'juling']; w.artsLevels = { tuna: 1, juling: 1 };
      /* 起始资金走 ledger 入账注入（模拟此前奇遇所得）——恒等式 100+Σin−Σout 才严格成立 */
      var grant = 5e6 - w.stones;
      w.stones = 5e6;
      SQ.Ledger.note(w, 'in', 'event', grant);
    });
    var cats113 = { in: {}, out: {} };
    var mono113 = true, prevSum113 = 0, realms113 = [3];
    /* 🔧 第册十五批定种子（N69 登记的同族）：220 步随机操作在真随机下会偶发把恒等式推到采样边界；
     *    判据本身（expect === stones / 只增不清 / 跨渡劫不清零）一字未动。 */
    var endSeed113 = beginSeed(11320261018);
    for (var i113 = 0; i113 < 220; i113++) {
      var w113 = ref113.worlds.xiuxian;
      var pick113 = Math.floor(Math.random() * 6);
      if (pick113 === 0) {
        await SQ.mutate(ref113, function (s) { s.worlds.xiuxian.lastSave = Date.now() - 30000; });
        await SQ.claim(ref113);
      } else if (pick113 === 1) {
        await SQ.Actions.setZone(ref113, Math.floor(Math.random() * 4));
      } else if (pick113 === 2) {
        await SQ.Actions.upgradeArt(ref113, ['tuna', 'juling', 'yunzong', 'qingxin'][Math.floor(Math.random() * 4)]);
      } else if (pick113 === 3) {
        await SQ.Actions.refreshShop(ref113, false);
        await SQ.Actions.buy(ref113, Math.floor(Math.random() * 5), false);
      } else if (pick113 === 4) {
        if (ref113.worlds.xiuxian.pendingChoice) {
          await SQ.Actions.resolveChoice(ref113, ['right', 'evil', 'neutral'][Math.floor(Math.random() * 3)]);
        } else {
          await SQ.mutate(ref113, function (s) { s.worlds.xiuxian.lastSave = Date.now() - 30000; });
          await SQ.claim(ref113);
        }
      } else {
        await SQ.Actions.enterCave(ref113, D.CAVES[Math.floor(Math.random() * D.CAVES.length)].id);
      }
      var cur113 = ref113.worlds.xiuxian;
      var sum113 = SQ.Ledger.sums(cur113);
      if (sum113.inn + sum113.out < prevSum113) mono113 = false;   /* 只增不清 */
      prevSum113 = sum113.inn + sum113.out;
      if (cur113.realm !== realms113[realms113.length - 1]) realms113.push(cur113.realm);
      if (sum113.expect !== cur113.stones) { cats113.drift = sum113.expect - cur113.stones; break; }
    }
    endSeed113();   /* 种子窗口结束 */
    var fin113 = ref113.worlds.xiuxian;
    var s113 = SQ.Ledger.sums(fin113);
    var touched113 = SQ.Ledger.IN_CATS.concat(SQ.Ledger.OUT_CATS).filter(function (k) {
      var v = (fin113.ledger.in[k] != null) ? fin113.ledger.in[k] : fin113.ledger.out[k];
      return v > 0;
    });
    ok(113, 'ledger 恒等式 100+Σin−Σout === stones（220 步随机零漂移）· 只增不清 · 跨渡劫不清零',
      s113.expect === fin113.stones && cats113.drift == null && mono113 &&
      s113.inn > 0 && s113.out > 0 && touched113.length >= 3 && realms113.length >= 1,
      'stones=' + fin113.stones + ' Σin=' + s113.inn + ' Σout=' + s113.out +
      ' 触及分类=' + touched113.join('/') + ' 境界轨迹=' + realms113.join('→') + ' drift=' + (cats113.drift || 0));

    /* #105b 百器录 gearSeen：获得即入录 · 炼化/替换不除名 · 重复获得不刷新首获 ts · 零数值加成 · normalize 幂等 */
    var w105b = mkWs({ realm: 4, stones: 0 });
    pack.recalcDerived(w105b, mkProf());
    var m105b = M(mkProf(), w105b);
    var ts105b = Date.now();
    var it105b = SQ.Gear.roll(w105b, pack, D, 4, m105b, { tierMin: 3, slot: 'weapon', special: 'sword_heart', source: { type: 'zone', ref: 4 } });
    SQ.Gear.autoEquip(w105b, pack, D, m105b, it105b, noopLog());
    var first105b = w105b.gearSeen['sword_heart'];
    var it2 = SQ.Gear.roll(w105b, pack, D, 4, m105b, { tierMin: 3, slot: 'weapon', special: 'sword_heart', source: { type: 'zone', ref: 4 } });
    SQ.Gear.autoEquip(w105b, pack, D, m105b, it2, noopLog());   /* 替换 → 旧件炼化 */
    var after105b = w105b.gearSeen['sword_heart'];
    /* 独占法宝入录（'ex_' 前缀）+ 零数值加成（有/无 gearSeen 产出完全一致） */
    SQ.Gear.grantExclusive(w105b, pack, D, m105b, 'evil_sword', { type: 'event', ref: 'x' }, noopLog());
    var exSeen105b = w105b.gearSeen['ex_evil_sword'] != null;
    var rateWith105b = SQ.Idle.rateOf(w105b, pack, D, M(mkProf(), w105b));
    var snap105b = JSON.stringify(w105b.gearSeen);
    w105b.gearSeen = {};
    var rateNo105b = SQ.Idle.rateOf(w105b, pack, D, M(mkProf(), w105b));
    w105b.gearSeen = JSON.parse(snap105b);
    var n105b = pack.normalize(JSON.parse(JSON.stringify(w105b)));
    var n2 = pack.normalize(JSON.parse(JSON.stringify(n105b)));
    ok('105b', '百器录：入录 / 不除名 / 不刷新首获 / 零加成 / normalize 幂等',
      first105b >= ts105b && after105b === first105b && exSeen105b &&
      Math.abs(rateWith105b - rateNo105b) < 1e-9 &&
      JSON.stringify(n105b.gearSeen) === snap105b && JSON.stringify(n2.gearSeen) === snap105b,
      'first=' + first105b + ' after=' + after105b + ' ex=' + exSeen105b +
      ' rate=' + rateWith105b + '/' + rateNo105b);

    /* #123 主修形式化（引擎卷 §4.2 · issue #3 起可由玩家点定）：`ws.artsMain` 优先，未点定 / 点定的
     * 已不在槽内 ⇒ 回落「修习槽第 1 位」（旧档口径逐字不变，下面 a~d 全部按未点定跑）；
     * 空槽 = 无主修（不顺延）；artsProgress 类收益指向主修，主修满级时顺延「随机槽内未满级功法」 */
    var w123 = mkWs({ realm: 3 });
    w123.artsKnown = ['tuna', 'juling', 'yunzong'];
    w123.artsSlots = ['tuna', 'juling'];
    w123.artsLevels = { tuna: 1, juling: 1 };
    var main123 = SQ.Arts.mainArt(w123);
    SQ.Events.applyEffects(w123, pack, D, M(mkProf(), w123), { artsProgress: 1 },
      { log: noopLog(), now: Date.now(), raw: true });
    var lvAfter123 = [w123.artsLevels.tuna, w123.artsLevels.juling];
    /* 首位满级 → 顺延到其余槽内未满级功法（首位本身不再涨） */
    var w123b = mkWs({ realm: 3 });
    w123b.artsKnown = ['tuna', 'juling'];
    w123b.artsSlots = ['tuna', 'juling'];
    w123b.artsLevels = { tuna: D.ARTS_MAX_LV, juling: 2 };
    SQ.Events.applyEffects(w123b, pack, D, M(mkProf(), w123b), { artsProgress: 1 },
      { log: noopLog(), now: Date.now(), raw: true });
    /* 槽内只有一位（非 tuna）→ 主修即该位 */
    var w123c = mkWs({ realm: 3 });
    w123c.artsKnown = ['tuna', 'juling'];
    w123c.artsSlots = ['juling'];
    w123c.artsLevels = { juling: 1 };
    var main123c = SQ.Arts.mainArt(w123c);
    /* 全空槽 → 主修 null、progressTarget null（无处可加，不报错） */
    var w123d = mkWs({ realm: 3 });
    w123d.artsSlots = [];
    /* (e) issue #3 点定主修：setMain 认槽内已入门者 ⇒ mainArt 跟着点定的走；
     *     点定的那部被移出槽后回落第 1 位；槽外 / 未入门一律拒且**不改档**；同值重复点幂等；
     *     artsMain 过 normalize（字符串保值、脏值归 null）*/
    var w123e = mkWs({ realm: 3 });
    w123e.artsKnown = ['tuna', 'juling', 'yunzong'];
    w123e.artsSlots = ['tuna', 'juling'];
    var sm123 = SQ.Arts.setMain(w123e, 'juling');
    var main123e = SQ.Arts.mainArt(w123e);
    var sm123out = SQ.Arts.setMain(w123e, 'yunzong');            /* 已入门、不在槽 ⇒ 拒 */
    var main123out = SQ.Arts.mainArt(w123e);
    w123e.artsSlots = ['tuna'];                                   /* 点定的那部被移出槽 ⇒ 回落第 1 位 */
    var main123f = SQ.Arts.mainArt(w123e);
    var w123g = mkWs({ realm: 3 });
    w123g.artsSlots = ['tuna'];
    SQ.Arts.setMain(w123g, 'tuna');
    var sm123dup = SQ.Arts.setMain(w123g, 'tuna');        /* 同值重复点 ⇒ same，不二次写档 */
    var n123k = pack.normalize({ artsMain: 'juling' }).artsMain;
    var n123bad = pack.normalize({ artsMain: 42 }).artsMain;
    /* (f) 散功散掉**点定的那部** ⇒ 同批清掉 artsMain（档里不留永久悬空 id）；
     *     只是移出槽外则**不清**（记忆式语义，登记 = 任务清单 N44）*/
    var w123h = mkWs({ realm: 3 });
    w123h.artsKnown = ['tuna', 'juling', 'yunzong'];
    w123h.artsSlots = ['tuna', 'yunzong'];
    w123h.artsLevels = { tuna: 1, yunzong: 1 };
    SQ.Arts.setMain(w123h, 'yunzong');
    SQ.Arts.unslot(w123h, 'yunzong');
    var keptPin123 = w123h.artsMain === 'yunzong' && SQ.Arts.mainArt(w123h) === 'tuna';
    var sv123h = SQ.Arts.salvage(w123h, pack, D, 'yunzong');
    var main123h = SQ.Arts.mainArt(w123h);
    /* (g) N44 定案（第册四批点头 · 第册十二批落地）：点定的那部被**原位替换**顶下槽 ⇒ `artsMain` 同批清空、
     *     主修回落第 1 位；且该部日后重新入槽**不再自动夺回主修**（记忆式只保留在「移出槽外」那一支 = (f)）。
     *     反向对照：若只改 `mainArt` 的回落而不清点定值，(g2) 会在重新入槽时把主修又交还给不在修习的那部。*/
    var ids123i = Object.keys(pack.artsMap()).slice(0, D.ARTS_SLOTS + 1);
    var w123i = mkWs({ realm: 3 });
    w123i.artsKnown = ids123i.slice();
    w123i.artsSlots = ids123i.slice(0, D.ARTS_SLOTS);
    w123i.artsLevels = {};
    ids123i.forEach(function (x) { w123i.artsLevels[x] = 1; });
    var pin123i = w123i.artsSlots[D.ARTS_SLOTS - 1];          /* 点定最后一格，免得第 1 位天然就是主修 */
    SQ.Arts.setMain(w123i, pin123i);
    var new123i = ids123i[D.ARTS_SLOTS];
    var rep123i = SQ.Arts.slot(w123i, pack, D, new123i, pin123i);
    var g123i = rep123i === true && w123i.artsMain === null &&
      SQ.Arts.mainArt(w123i) === w123i.artsSlots[0];
    SQ.Arts.unslot(w123i, w123i.artsSlots[0]);                /* 腾出一个空位 */
    SQ.Arts.slot(w123i, pack, D, pin123i);                    /* 被顶下的那部重新入槽，落到尾部 */
    var g2123i = w123i.artsMain === null && w123i.artsSlots.indexOf(pin123i) >= 0 &&
      SQ.Arts.mainArt(w123i) !== pin123i;
    ok(123, '主修指向（引擎卷 §4.2 · GitHub issue #3）：未点定 = 槽第 1 位（旧档逐字不变）· 点定 = 跟随 ws.artsMain · ' +
      '移出槽外的记忆式回落 · 散功散掉点定者则清空 artsMain · 满级顺延槽内 · 全空不报错 · setMain 拒槽外且不脏写 · artsMain 过 normalize · ' +
      '🆕 被原位替换顶下槽则清空点定且重新入槽不复活（N44 定案）',
      main123 === 'tuna' && lvAfter123[0] === 2 && lvAfter123[1] === 1 &&
      SQ.Arts.mainArt(w123b) === 'tuna' && w123b.artsLevels.juling === 3 &&
      w123b.artsLevels.tuna === D.ARTS_MAX_LV &&
      main123c === 'juling' &&
      SQ.Arts.mainArt(w123d) === null && SQ.Arts.progressTarget(w123d, D.ARTS_MAX_LV) === null &&
      sm123.ok === true && main123e === 'juling' &&
      sm123out.ok === false && sm123out.reason === 'inslot' && main123out === 'juling' &&
      main123f === 'tuna' && sm123dup.ok === true && sm123dup.same === true &&
      keptPin123 && sv123h && w123h.artsMain === null && main123h === 'tuna' &&
      n123k === 'juling' && n123bad === null && g123i && g2123i,
      'main=' + main123 + ' lv=' + lvAfter123.join('/') + ' 满级顺延→juling=' + w123b.artsLevels.juling +
      ' 首位=' + main123c + ' 全空=' + SQ.Arts.mainArt(w123d) +
      ' ‖ (e) 点定=' + main123e + ' 槽外拒=' + sm123out.reason + ' 移出后回落=' + main123f +
      ' 幂等=' + sm123dup.same + ' normalize=' + n123k + '/' + n123bad +
      ' ‖ (f) 移出槽外仍记忆=' + keptPin123 + ' 散功后清空=' + (w123h.artsMain === null) + '/' + main123h +
      ' ‖ (g) 顶下槽即清空=' + g123i + ' 重入槽不复活=' + g2123i);

    /* #117 normalize：事件新字段 + seenOnce→seen 迁移 + drift 钳位 + profile 三字段 */
    var n117 = SQ.normalize({ v: SQ.V, profile: { name: '旧档', alignBias: 'weird' }, worlds: { xiuxian: {
      eventClock: -5, alignDrift: 9999,
      eventHistory: { lastId: 'a', seenOnce: ['x1', 'x2'] },
      lastOffline: { at: 1, secs: 2 }, gearSeen: { sword_heart: 123 }
    } } });
    var w117 = n117.worlds.xiuxian;
    ok(117, 'normalize 新字段（时钟/漂移钳位/feed/seen 迁移/profile）',
      w117.eventClock === 0 && w117.alignDrift === D.DRIFT_CAP &&
      w117.eventHistory.seen['x1'] != null && w117.eventHistory.seen['x2'] != null &&
      w117.eventHistory.seenOnce === undefined && Array.isArray(w117.eventHistory.feed) &&
      w117.lastOffline.secs === 2 && w117.gearSeen.sword_heart === 123 &&
      n117.profile.alignBias === 'neutral' && n117.profile.gender === 'male' && n117.profile.race === 'human',
      JSON.stringify(w117.eventHistory));

    /* #118 内容池 lint：119 条正典口径（天24/地39/人56 · 特殊12 · once12 · 天道垂青 tags 6——独立通道词条
     * weight/cooldownHours 不设）+ schema/karma 带/词表对表。
     * 恢复批 2026-10-03 收口口径：通用 24 + 专属 89（首批 37 + 扩容 12 + 二批 40）+ 垂青 6 = 119
     * （专属事件池 v2.8 分布核对表；账实不符已按任务清单 v1.22 恢复批裁定消除）。 */
    var all118 = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian);
    var tiers118 = { tian: 0, di: 0, ren: 0 }, special118 = 0, once118 = 0, tagged118 = 0, ids118 = {}, bad118 = [];
    var GAIN_TYPES = { stones: 1, qi: 1, qiPct: 1, qiPctRaw: 1, buff: 1, dropGear: 1, exclusiveGear: 1, exclusiveArt: 1,
      artsProgress: 1, attrBonus: 1, tribNext: 1, eventShield: 1, bond: 1, bondLock: 1,
      bondDrain: 1,   /* 情谊生裂（缘尽收敛批 · 引擎卷 v1.10 §3.6）：轻中度背叛替代绝交锁 */
      merchant: 1, merchantScout: 1, primeGear: 1, primeArt: 1,
      fateShard: 1,   /* 探宝残片计数（事件池 v2.7 №117 ⏳ 键，系统深化批 A6 登记） */
      treasure: 1,
      talentSwap: 1,
      stonesPct: 1,   /* 按比例出血（第卌四批 · §6.1B 认输买平安）：走 applyEffects 既有 stonesPct 通道（取整 + 下限 0 + noteStones 真值） */
      life: 1 };   /* 寿元增减（第卌八批 §6.1A 改口）：绝对年数，走 lifeAdd 唯一写口；failE 侧另认 lifeWound 标记 */
      /* 先天法宝联动授予（二批 A5 · 数值详设 §10.7；恢复批 A3b 引擎 case 已重加） */
    var CHECK_TYPES = { attr: 1, karma: 1, align: 1, stones: 1, qi: 1, art: 1, gear: 1, power: 1, companion: 1,
      prodigySpar: 1,
      ambushFoe: 1 };   /* 敌手快照判定（第卌四批 · §6.1B）：与切磋同构的 ±10% 对局，对手取 pendingChoice.foe 快照 ⇒ 第十一类 DSL */
    var BAND118 = D.EVENT_KARMA_BAND;   /* 取表而不是手抄（第十四批审计 #18）。⚠️ 归因纠正（当晚复核）：A9 把这条记成零消费者死桩的理由是**生产侧无人读**（A9 的消费面刻意不含 `.tests/`），不是「因为手抄」⇒ 本改只让测试随表动，摘除在册登记要等生产侧真出现读者。 */
    all118.forEach(function (ev) {
      tiers118[ev.tier] = (tiers118[ev.tier] || 0) + 1;
      if (ev.special) special118++;
      if (ev.once) once118++;
      var isTagged = !!(ev.tags && ev.tags.length);
      if (isTagged) tagged118++;
      if (ids118[ev.id]) bad118.push(ev.id + ':dup');
      ids118[ev.id] = 1;
      /* 独立通道词条（天道垂青池）：weight/cooldownHours 不设（事件池 v2.7 词条口径） */
      if (!isTagged && (!ev.weight || (ev.cooldownHours == null && !ev.cdFailHours))) bad118.push(ev.id + ':w/cd');
      /* 分支逐支对表：按模板**自己声明的 choices** 走（第卌四批改口，与 audit A2 同口径）——
       * 「族中寻仇」按用户设定只有迎战一条路，硬要求三支齐全只会逼词表补两条永不消费的孤儿键。
       * 三支齐全的既有条目覆盖面一字不减（取的是 Object.keys(choices)，与旧写法同集）。 */
      var bks118 = Object.keys(ev.choices || {});
      if (!bks118.length) bad118.push(ev.id + ':nochoice');
      bks118.forEach(function (bk) {
        var br = ev.choices[bk];
        if (Math.abs(br.karma) > BAND118[ev.tier]) bad118.push(ev.id + ':karma' + br.karma);
        (br.gain || []).forEach(function (g) { if (!GAIN_TYPES[g.type]) bad118.push(ev.id + ':gain.' + g.type); });
        var chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
        chks.forEach(function (c) { if (!CHECK_TYPES[c.type]) bad118.push(ev.id + ':check.' + c.type); });
      });
      ['name', 'story'].forEach(function (suf) {
        var key = 'event.' + ev.id + '.' + suf;
        if (SQ.t(key, null, 'xiuxian') === key) bad118.push(ev.id + ':lex.' + suf);
      });
      bks118.forEach(function (bk) {
        var key = 'event.' + ev.id + '.branch.' + bk;
        if (SQ.t(key, null, 'xiuxian') === key) bad118.push(ev.id + ':lex.branch.' + bk);
      });
    });
    ok(118, '131 条分布（天26/地45/人60 · 特殊12 · once12 · tags17=垂青6+天骄5+袭击2+寻仇1+机缘2+隐世1）+ schema/词表对表（第册三批 №129~131 入池 · GAIN_TYPES 登记 stonesPct / CHECK_TYPES 登记 ambushFoe）',
      all118.length === 131 && tiers118.tian === 26 && tiers118.di === 45 && tiers118.ren === 60 &&
      special118 === 12 && once118 === 12 && tagged118 === 17 && bad118.length === 0,
      'n=' + all118.length + ' ' + JSON.stringify(tiers118) + ' sp=' + special118 + ' once=' + once118 +
      ' tags=' + tagged118 + ' bad=' + bad118.slice(0, 5).join(','));

    /* #119 buff 同字段同向不叠加（事件池 §十二.4 勘误①）：取最强一条 + 时长取较长者；
     * 正负号分开判（增益不吞减益）；eventShield 是「层」语义，逐条并存不去重。 */
    var w119 = mkWs({ realm: 4 });
    var t119 = Date.now();
    for (var i119 = 0; i119 < 30; i119++) {
      SQ.Events.pushBuff(w119, 'qiRate', 0.10 + i119 * 0.01, t119 + (12 + i119) * 3600000);
      SQ.Events.pushBuff(w119, 'qiRate', -0.05, t119 + 6 * 3600000);
      SQ.Events.pushBuff(w119, 'eventShield', 1, t119 + 3600000);
    }
    var pos119 = w119.buffs.filter(function (b) { return b.field === 'qiRate' && b.mult > 0; });
    var neg119 = w119.buffs.filter(function (b) { return b.field === 'qiRate' && b.mult < 0; });
    var sh119 = w119.buffs.filter(function (b) { return b.field === 'eventShield'; });
    /* 再来一条更弱的正增益：不换值，但时长取较长者（已在身的长 buff 不被缩短） */
    SQ.Events.pushBuff(w119, 'qiRate', 0.12, t119 + 2 * 3600000);
    ok(119, 'buff 同字段同向不叠加（最强 + 时长取较长 · eventShield 逐条并存）',
      pos119.length === 1 && neg119.length === 1 && sh119.length === 30 &&
      Math.abs(pos119[0].mult - 0.39) < 1e-9 && neg119[0].mult === -0.05 &&
      pos119[0].until === t119 + 41 * 3600000,
      'pos=' + pos119.length + '/' + pos119[0].mult + ' neg=' + neg119.length +
      ' shield=' + sh119.length + ' until=+' + ((pos119[0].until - t119) / 3600000) + 'h');

    /* #120 qiPct「等价挂机小时」封顶（事件池 §十二.5 勘误②）：|Δqi| ≤ CAP × 每秒产出 × 3600；
     * 高境界截断、低境界天然不触发；正向同口径对称封顶。 */
    function probe120(realm, pctv) {
      var w = mkWs({ realm: realm, qi: 0 });
      w.qi = D.REALMS[realm + 1].need * 0.5;
      pack.recalcDerived(w, mkProf());
      var m = M(mkProf(), w);
      var rate = SQ.Idle.rateOf(w, pack, D, m);
      var q0 = w.qi;
      SQ.Events.applyEffects(w, pack, D, m, { qiPct: pctv }, { log: noopLog(), now: Date.now(), raw: true });
      return { d: w.qi - q0, cap: D.EVENT_QI_PCT_HOUR_CAP * 3600 * rate, raw: q0 * pctv };
    }
    var hi120 = probe120(8, -0.25), hiP120 = probe120(8, 0.25), lo120 = probe120(0, -0.25);
    ok(120, 'qiPct 等价挂机小时封顶（境界8 正负对称截断 · 境界0 不触发）',
      Math.abs(hi120.raw) > hi120.cap && Math.abs(hi120.d + hi120.cap) < 1e-6 &&
      Math.abs(hiP120.d - hiP120.cap) < 1e-6 &&
      Math.abs(lo120.raw) < lo120.cap && Math.abs(lo120.d - lo120.raw) < 1e-6,
      'r8 −25%: ' + Math.round(hi120.d) + '（未封顶 ' + Math.round(hi120.raw) + '，cap ' + Math.round(hi120.cap) +
      '） r8 +25%: ' + Math.round(hiP120.d) + ' r0: ' + Math.round(lo120.d));

    /* #121 判定护栏强制 lint（事件池 §2.2 v1.11）：failE 资源损失 ≤15%、任何 debuff ≤24h。
     * 批 1 实测发现两个分卷 26/40 处 failE 超限（−18%~−30%）+ 6 处 debuff 48h，
     * 与魔道分支 40% 通过率相乘后反转了阵营节奏主轴——护栏自此由 lint 兜住，不再只是写作守则。 */
    var GUARD_LOSS = 0.15, GUARD_HOURS = 24;
    var bad121 = [];
    function lintEff121(eff, where, isFail) {
      if (!eff) return;
      if (eff.qiPct != null) {
        var band = Array.isArray(eff.qiPct) ? eff.qiPct : [eff.qiPct, eff.qiPct];
        var lo = Math.min(band[0], band[1]);
        if (isFail && lo < -GUARD_LOSS - 1e-9) bad121.push(where + ' failE qiPct ' + lo);
      }
      if (eff.stonesPct != null && isFail) {
        var sb = Array.isArray(eff.stonesPct) ? eff.stonesPct : [eff.stonesPct, eff.stonesPct];
        if (Math.min(sb[0], sb[1]) < -GUARD_LOSS - 1e-9) bad121.push(where + ' failE stonesPct');
      }
      if (eff.buff) {
        var isDebuff = eff.buff.mult < 0 || eff.buff.field === 'shopCost';
        var hb = Array.isArray(eff.buff.hours) ? eff.buff.hours : [eff.buff.hours, eff.buff.hours];
        if (isDebuff && Math.max(hb[0] || 0, hb[1] || 0) > GUARD_HOURS) {
          bad121.push(where + ' debuff ' + eff.buff.field + ' ' + Math.max(hb[0] || 0, hb[1] || 0) + 'h');
        }
      }
    }
    var nFail121 = 0, nBand121 = 0;
    all118.forEach(function (ev) {
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var br = ev.choices && ev.choices[bk];
        if (!br) return;
        (br.gain || []).forEach(function (g) {
          if (g.type === 'buff') {
            nBand121++;
            lintEff121({ buff: { field: g.field, mult: g.mult, hours: g.hours != null ? g.hours : g.h } },
              ev.id + '.' + bk, false);
          }
          if (g.type === 'qiPct') nBand121++;
        });
        var chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
        chks.forEach(function (c, ci) {
          if (!c.failE) return;
          nFail121++;
          lintEff121(c.failE, ev.id + '.' + bk + '[' + ci + ']', true);
        });
        if (br.failE) { nFail121++; lintEff121(br.failE, ev.id + '.' + bk, true); }
      });
    });
    ok(121, '判定护栏 lint（failE 损失 ≤15% · debuff ≤24h）',
      bad121.length === 0 && nFail121 >= 40 && nBand121 > 0,
      'failE=' + nFail121 + ' buff/qiPct带=' + nBand121 + ' 违规=' + bad121.slice(0, 6).join(','));

    /* #122 双缩放锚契约（事件池 §十二.8 v1.11）：灵石挂刷图曲线（含练气面额下限 1.0）、
     * 灵气挂三次方；灵石锚与 ZONES.stones 同比 → 「奇遇/刷图」比值与境界无关（旧口径三次方
     * 与刷图曲线不同源，境界 2~6 把比值推到 1000~2600%）。 */
    var K122 = D.EVENT_STONE_ZONE_K;
    var sc122 = [], qi122 = [];
    for (var r122 = 0; r122 <= 9; r122++) {
      sc122.push(SQ.Events.stoneScaleOf({ realm: r122 }, D));
      qi122.push(SQ.Events.qiScaleOf({ realm: r122 }, D));
    }
    var ratio122 = sc122.map(function (s, i) { return s / D.ZONES[i].stones; });
    var flat122 = ratio122.slice(2).every(function (v) { return Math.abs(v - K122) < 1e-9; });
    var mono122 = sc122.every(function (v, i) { return i === 0 || v >= sc122[i - 1]; });
    ok(122, '双缩放锚：灵石挂刷图曲线（练气下限 1.0）· 灵气挂三次方 · 比值恒定',
      sc122[0] === 1 && sc122[1] === 1 && sc122[2] === K122 * D.ZONES[2].stones &&
      sc122[8] === K122 * D.ZONES[8].stones && flat122 && mono122 &&
      qi122[0] === 1 && qi122[2] === 27 && qi122[8] === 729 && qi122[9] === 1000,
      'stones=' + sc122.map(function (v) { return Math.round(v * 100) / 100; }).join('/') +
      ' qi=' + qi122.join('/'));

    /* 20a~20d 问道初心（profile.alignBias）数据契约（F1 的数据半区） */
    var n20a = SQ.normalize({ v: SQ.V, profile: { name: '甲', alignBias: 'evil' } });
    ok('20a', 'alignBias 合法值保留', n20a.profile.alignBias === 'evil');
    var n20b = SQ.normalize({ v: SQ.V, profile: { name: '乙' } });
    ok('20b', 'alignBias 缺省 neutral · gender male · race human',
      n20b.profile.alignBias === 'neutral' && n20b.profile.gender === 'male' && n20b.profile.race === 'human');
    localStorage.removeItem(SQ.KEY);
    var ref20 = {};
    await SQ.mutate(ref20, function (s) {
      s.profile = { name: '初心道人', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now(),
        alignBias: 'evil', gender: 'male', race: 'human' };
      s.worlds.xiuxian = pack.initialState();
    });
    ref20.worlds.xiuxian.lastSave = Date.now() - 86400000;
    await SQ.save(ref20);
    var ref20b = {};
    await SQ.claim(ref20b);
    var drift20 = ref20b.worlds.xiuxian.alignDrift;
    ok('20c', 'claim 按初心累积漂移（evil · 1 天 ≈ −12）',
      drift20 <= -11.9 && drift20 >= -12.2, 'drift=' + drift20);
    var keep20 = SQ.normalize({ v: SQ.V, profile: ref20b.profile, worlds: {}, meta: { unlockedWorlds: ['xiuxian'] } });
    ok('20d', '初心锁定持久（normalize 不改写合法值）',
      keep20.profile.alignBias === 'evil' && ref20b.profile.alignBias === 'evil');

    /* ═══ 批 2 · B 组引擎增量（#124~#127）═══ */

    /* #124 独占手动替换（B5 · 交互说明 §4.4 ★）：库藏阁件穿上、旧独占回阁锁形格——
     * 无灵石流动、无炼化、ledger 零记账；三道拒绝闸（两侧均非独占 / 境界不足 / 越界） */
    var w124 = mkWs({ realm: 6, cleared: [0, 1, 2, 3] });
    pack.recalcDerived(w124, mkProf());
    var ex124 = SQ.Gear.grantExclusive(w124, pack, D, M(mkProf(), w124), 'evil_sword', { type: 'event', ref: 'evil_sword_remnant' }, noopLog());
    var cand124 = mkGear('weapon', { tier: 4, atk: 10, reqs: { realm: 4 } });
    w124.stash.push(cand124);
    var st124 = w124.stones;
    var sums124 = JSON.stringify(SQ.Ledger.sums(w124));
    var r124 = SQ.Gear.manualSwap(w124, pack, D, M(mkProf(), w124), w124.stash.indexOf(cand124), noopLog());
    var swap124 = r124.ok && w124.gear.weapon === cand124 && w124.stash.length === 1 &&
      w124.stash.indexOf(ex124) >= 0 && w124.stones === st124 &&
      JSON.stringify(SQ.Ledger.sums(w124)) === sums124;
    var w124b = mkWs({ realm: 6 });
    var rnd124a = mkGear('weapon', { tier: 2, atk: 5, reqs: { realm: 2 } });
    var rnd124b = mkGear('weapon', { tier: 3, atk: 8, reqs: { realm: 4 } });
    w124b.gear.weapon = rnd124a;
    w124b.stash.push(rnd124b);
    var rej124a = SQ.Gear.manualSwap(w124b, pack, D, M(mkProf(), w124b), 0, noopLog());
    var hi124 = mkGear('weapon', { tier: 4, atk: 1, reqs: { realm: 9 }, exclusive: 'evil_sword' });
    w124b.stash.push(hi124);
    var rej124b = SQ.Gear.manualSwap(w124b, pack, D, M(mkProf(), w124b), 1, noopLog());
    var rej124c = SQ.Gear.manualSwap(w124b, pack, D, M(mkProf(), w124b), 99, noopLog());
    ok('124', '独占手动替换：无灵石流/零记账 + 三道拒绝闸',
      swap124 && rej124a.reason === 'exclusive' && rej124b.reason === 'wear' && rej124c.reason === 'index' &&
      w124b.gear.weapon === rnd124a && w124b.stash.length === 2,
      JSON.stringify({ swap: swap124, rej: [rej124a.reason, rej124b.reason, rej124c.reason] }));

    /* #125 极品词条旗标（B5）：resist/attr 各前 10% → prime=true + reqs.realm 追加一阶；
     * 期望率从引擎常量推导（randInt 闭区间使 attr 顶 10% = 2/11、randF 四舍五入抬边界 +0.5，
     * 天阶实测 ≈26.7% ≠ 直觉 19%——写死直觉值会误报）；旗标随件 JSON 持久（库藏阁 ※ 标注消费） */
    var w125 = mkWs({ realm: 8 });
    var m125 = M(mkProf(), w125);
    var prime125 = 0, bump125 = true;
    var T4 = D.GEAR_TIERS[4], T4req = T4.req;
    /* 固定种子抽样（2026-10-09 治理批·复核收尾）：4,000 抽比 ±3pp，真实随机下属统计噪声 */
    var seed125 = 1252026, origRand125 = Math.random;
    Math.random = function () {
      seed125 |= 0; seed125 = (seed125 + 0x6D2B79F5) | 0;
      var t = Math.imul(seed125 ^ (seed125 >>> 15), 1 | seed125);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (var i125 = 0; i125 < 4000; i125++) {
      var it125 = SQ.Gear.roll(w125, pack, D, 8, m125, { tier: 4 });
      if (it125.prime) { prime125++; if (it125.reqs.realm !== T4req + 1) bump125 = false; }
      else if (it125.reqs.realm !== T4req) bump125 = false;
    }
    Math.random = origRand125;   /* 种子化窗口结束 */
    var rate125 = prime125 / 4000;
    var rangeR125 = T4.resist[1] - T4.resist[0];
    var pR125 = (rangeR125 * D.PRIME_TOP_PCT + 0.5) / rangeR125;
    var cntA125 = 0;
    for (var av125 = T4.attr[0]; av125 <= T4.attr[1]; av125++) {
      if (av125 >= T4.attr[1] - (T4.attr[1] - T4.attr[0]) * D.PRIME_TOP_PCT) cntA125++;
    }
    var exp125 = 1 - (1 - pR125) * (1 - cntA125 / (T4.attr[1] - T4.attr[0] + 1));
    var keep125 = JSON.parse(JSON.stringify(mkGear('weapon', { tier: 4, prime: true, reqs: { realm: T4req + 1 } })));
    ok('125', '极品旗标：率对表推导值 ±3pp + 追加一阶无例外 + 随件持久 · 2026-10-09 起**固定种子抽样**（4,000 抽，判据数值未动）',
      bump125 && Math.abs(rate125 - exp125) <= 0.03 && keep125.prime === true,
      'rate=' + (rate125 * 100).toFixed(1) + '% exp=' + (exp125 * 100).toFixed(1) + '% prime=' + prime125 + '/4000');

    /* #126 渡劫成功时间戳**已整族退役**（第册廿九批 F6 · N32 ①）：字段退役有七处出口，本条逐条反证 ——
     * (a) 成功支与失败支的**结算行为不变**（realm / success / lastResult 照旧，别的内容没被顺手改坏）；
     * (b) 新档不再声明该键（`initialState().tribulation` 与真成功渡劫之后的键集里都没有 ⇒ 写口确实消失）；
     * (c) 旧档里那枚键**不主动删**（删玩家数据属产品裁定）⇒ 脏值与原值都原样存活，但全库零读者；
     * (d) #206 最坏态由 `initialState()` 造形 ⇒ 少一枚键 ⇒ 落盘字节随之变小，读数由探针自己打印。 */
    var t126 = 1700000000000;
    var w126 = mkWs({ realm: 0, qi: 1e9 });
    pack.recalcDerived(w126, mkProf());
    var restore126a = stubRandom([0]);                       /* 必成 */
    var r126a = SQ.Realm.tryBreakthrough(w126, pack, D, M(mkProf(), w126), t126, { log: noopLog(), profile: mkProf() });
    restore126a();
    var win126 = r126a.result === 'success' && w126.realm > 0 && w126.tribulation.success === 1 &&
      !('lastSuccessTs' in w126.tribulation) && !('lastSuccessTs' in pack.initialState().tribulation);
    var w126b = mkWs({ realm: 0, qi: 1e9 });
    pack.recalcDerived(w126b, mkProf());
    var restore126b = stubRandom([0.999999]);                /* 必败（p clamp ≤0.95） */
    var r126b = SQ.Realm.tryBreakthrough(w126b, pack, D, M(mkProf(), w126b), t126, { log: noopLog(), profile: mkProf() });
    restore126b();
    var lose126 = r126b.result === 'fail' && w126b.tribulation.lastResult === 'fail' && w126b.realm === 0;
    var dirty126 = pack.normalize(Object.assign(pack.initialState(), { tribulation: { lastSuccessTs: 'garbage' } }));
    var keep126b = pack.normalize(Object.assign(pack.initialState(), { tribulation: { lastSuccessTs: t126 } }));
    ok('126', 'lastSuccessTs 整族退役（F6 · N32 ①）：(a) 成功/失败两支结算行为不变 (b) 新档不声明、写口消失 (c) 旧档那枚键不主动删（脏值与原值都原样存活、全库零读者）',
      win126 && lose126 && dirty126.tribulation.lastSuccessTs === 'garbage' &&
      keep126b.tribulation.lastSuccessTs === t126,
      JSON.stringify({ win: win126, lose: lose126, dirtyKept: dirty126.tribulation.lastSuccessTs }));

    /* #127 满槽原位替换（B4）：replaceId 保序——第 1 位 = 主修不隐式挪位；无目标满槽照旧拒绝 */
    var w127 = mkWs({});
    w127.artsKnown = ['tuna', 'juling', 'qingxin', 'yunzong', 'yinqi', 'zhanju', 'jinzhong'];
    w127.artsSlots = ['tuna', 'juling', 'qingxin', 'yunzong', 'yinqi', 'zhanju'];
    var full127 = SQ.Arts.slot(w127, pack, D, 'jinzhong');
    var rep127 = SQ.Arts.slot(w127, pack, D, 'jinzhong', 'qingxin');
    var pos127 = rep127 && w127.artsSlots.length === D.ARTS_SLOTS &&
      w127.artsSlots[2] === 'jinzhong' && w127.artsSlots.indexOf('qingxin') < 0;
    var rep127b = SQ.Arts.slot(w127, pack, D, 'qingxin', 'tuna');
    var main127 = rep127b && w127.artsSlots[0] === 'qingxin' && SQ.Arts.mainArt(w127) === 'qingxin';
    ok('127', '满槽原位替换：保序 + 主修随第 1 位',
      full127 === false && pos127 && main127,
      JSON.stringify({ full: full127, pos: pos127, main: main127 }));

    /* ═══ 批 3 · G14 护法结缘（#109~#112 / #114~#116 / #129~#131）═══ */

    /* #109 bond 映射表对表（四柱卷 §5.1 唯一事实源 ↔ 代码数据 diff）+ 好感模型纪律 + normalize。
     * 回写纪律：57 事件（批3 19 + 扩容批 8 + 二批 30）之外零 bond/bondLock 词条（垂青 pei 行另计 = 道友池卷 §二
     * 唯一事实源 57 事件 + 深化批 1 行；势力 flavor 事件不入 bond：qixuan/xinggong/yanue/luopo/jianqi/longquan/
     * yanwu/miaoyin+suiyuan/guisu/liumo/laolong/qianzhu/kunwu/shuyuan）；绝交锁全池 26（批3 4 + 扩容 6 + 二批 12 + 垂青 pei 1，
     * 恢复批后 #132 三态对表随 A5 扩至 57 事件）；
     * 档位阈值 1/30/70/100；clamp [0,100] 只增。恢复批 2026-10-03：路线 A 补执行（预案 20 人引用移除）。 */
    var BOND_MAP109 = {
      road_tea_stall:      { right: { qin: 10 }, neutral: { qin: 4 }, evil: {} },
      stray_dog:           { right: { huang: 30 }, neutral: { huang: 15 }, evilDrain: ['huang'] },
      traveling_doctor:    { right: { chen: 10 }, neutral: { chen: 3 }, evil: {} },
      storyteller:         { right: { liu: 8 }, neutral: { liu: 4 }, evil: {} },
      harvest_fest:        { right: { feng: 8 }, neutral: { feng: 3 }, evil: {} },
      merchant_caravan:    { right: { man: 12, tie: 8 }, neutral: { man: 5, tie: 4 }, evilDrain: ['man', 'tie'] },
      hidden_cache:        { right: { suwan: 20 }, neutral: { suwan: 8 }, evil: {} },
      rival_duel:          { right: { xie: 12 }, neutral: { xie: 6 }, evilDrain: ['xie'] },
      junior_lie_flat:     { right: { tang: 10 }, neutral: { tang: 3 }, evil: {} },
      beggar_immortal:     { right: { chu: 15 }, neutral: { chu: 5 }, evilDrain: ['chu'] },
      peace_talisman:      { right: { zhu: 8 }, neutral: { zhu: 3 }, evil: {} },
      firefly_valley:      { right: { yan: 10 }, neutral: { yan: 4 }, evil: {} },
      mine_fox:            { right: { chiwei: 30 }, neutral: { chiwei: 12 }, evilDrain: ['chiwei'] },
      junior_frame:        { right: { luman: 8 }, neutral: { luman: 5 }, evil: {} },
      sect_recruit:        { right: { pei: 10 }, neutral: { pei: 4 }, evilDrain: ['pei'] },
      demon_envoy:         { right: { yewu: 2 }, neutral: { yewu: 5 }, evil: { yewu: 15 } },
      alchemy_contest:     { right: { lu: 8 }, neutral: { lu: 4 }, evil: {} },
      secret_manual_trade: { right: { shen: 15 }, neutral: { shen: 8 }, evilDrain: ['shen'] },
      beast_core_hunt:     { right: { fu: 8 }, neutral: { fu: 3 }, evil: {} },
      /* 双书梗化扩容批 8 事件（道友池卷 §二/§四 · 恢复批 2026-10-03）：首遇结缘型 +30/+15（于潇左 +12）、
       * 董萱儿/陈平安魔道零入账（非锁）；绝交锁 6 = hanli/yuxiao/nangong/ningyao/aliang/jingchun */
      qingpao_tongxing:    { right: { hanli: 30 }, neutral: { hanli: 15 }, evilDrain: ['hanli'] },
      taomu_xiaojian:      { right: { yuxiao: 30 }, neutral: { yuxiao: 12 }, evilDrain: ['yuxiao'] },
      haishi_denghui:      { right: { xuaner: 20 }, neutral: { xuaner: 8 }, evil: {} },
      yanue_chaoji:        { right: { nangong: 12 }, neutral: { nangong: 4 }, evilDrain: ['nangong'] },
      bianzhen_kezi:       { right: { pingping: 15 }, neutral: { pingping: 5 }, evil: {} },
      jianzhong_shouye:    { right: { ningyao: 20 }, neutral: { ningyao: 8 }, evilDrain: ['ningyao'] },
      jianyun_guiren:      { right: { aliang: 30 }, neutral: { aliang: 15 }, evilLock: ['aliang'] },
      shengxian_yideng:    { right: { jingchun: 30 }, neutral: { jingchun: 15 }, evilLock: ['jingchun'] },
      /* 双书梗化二批 人级 12 bond 事件（道友池卷 §二/§五 · 恢复批）：首遇结缘型 +30/+15 ×4
       * （zhangtie/mojuren/lihuayuan 及地级 yinyue、天级 wensheng 后补）；绝交锁 人级 +5 */
      tongmen_kugong:      { right: { zhangtie: 30 }, neutral: { zhangtie: 15 }, evilDrain: ['zhangtie'] },
      ming_e_jiaoliang:    { right: { wuyan: 10 }, neutral: { wuyan: 4 }, evilDrain: ['wuyan'] },
      shiyao_zhiyue:       { right: { mojuren: 30 }, neutral: { mojuren: 15 }, evilDrain: ['mojuren'] },
      zhishi_chuanyi:      { right: { lihuayuan: 30 }, neutral: { lihuayuan: 15 }, evilDrain: ['lihuayuan'] },
      shangdui_huhang:     { right: { mupeiling: 15 }, neutral: { mupeiling: 5 }, evil: {} },
      shijia_denghui:      { right: { chenqiaoyue: 14 }, neutral: { chenqiaoyue: 5 }, evil: {} },
      jiemei_yuxian:       { right: { chenlianyan: 13 }, neutral: { chenlianyan: 4 }, evil: {} },
      xiafu_danren:        { right: { hongfu: 15 }, neutral: { hongfu: 5 }, evil: {} },
      sudi_tiezhan:        { right: { wangchan: 10 }, neutral: { wangchan: 3 }, evilDrain: ['wangchan'] },
      suanpan_zhanggui:    { right: { zhuhe: 12 }, neutral: { zhuhe: 5 }, evil: {} },
      zhujian_renjia:      { right: { ruanxiu: 14 }, neutral: { ruanxiu: 5 }, evil: {} },
      laozu_shounuo:       { right: { gucan: 13 }, neutral: { gucan: 5 }, evil: {} },
      /* 双书梗化二批 地级 11 bond 事件（恢复批）：yinyue 首遇结缘型 +30/+15；绝交锁 地级 +4
       * （yuzhitong/makuxuan/weixian/yinyue）；qianzhu/kunwu/shuyuan 三事件为势力 flavor 不入 bond */
      canhun_jieti:        { right: { yuzhitong: 10 }, neutral: { yuzhitong: 5 }, evilDrain: ['yuzhitong'] },
      zhangmen_chizheng:   { right: { xiangzhili: 12 }, neutral: { xiangzhili: 4 }, evil: {} },
      zhujian_luhuo:       { right: { ruanqiong: 13 }, neutral: { ruanqiong: 5 }, evil: {} },
      changcheng_junqing:  { right: { makuxuan: 14 }, neutral: { makuxuan: 4 }, evilDrain: ['makuxuan'] },
      banfen_fenzang:      { right: { xieshi: 12 }, neutral: { xieshi: 5 }, evil: {} },
      yinguan_shouduan:    { right: { weixian: 13 }, neutral: { weixian: 4 }, evilDrain: ['weixian'] },
      duanjian_chongzhu:   { right: { liushiliu: 14 }, neutral: { liushiliu: 5 }, evil: {} },
      changcheng_shouye:   { right: { dongtianci: 12 }, neutral: { dongtianci: 4 }, evil: {} },
      yuexia_yihun:        { right: { yinyue: 30 }, neutral: { yinyue: 15 }, evilDrain: ['yinyue'] },
      guiwu_weicheng:      { right: { yuanyao: 16 }, neutral: { yuanyao: 6 }, evil: {} },
      chengxia_wenjian:    { right: { chenqingdu: 15 }, neutral: { chenqingdu: 5 }, evil: {} },
      /* 双书梗化二批 天级 7 bond 事件（恢复批）：wensheng 首遇结缘型 +30/+15；绝交锁 天级 +3
       * （wensheng/yufu/chelaozu）；№113 luanxing_yebu = xinggong flavor 不入 bond（x17 联动载体） */
      kongxiu_danshi:      { right: { wensheng: 30 }, neutral: { wensheng: 15 }, evilLock: ['wensheng'] },
      yasheng_luozi:       { right: { cuichan: 12 }, neutral: { cuichan: 4 }, evil: {} },
      baiyi_wenjian:       { right: { zuoyou: 14 }, neutral: { zuoyou: 5 }, evil: {} },
      shoucheng_jianyi:    { right: { yufu: 15 }, neutral: { yufu: 4 }, evilLock: ['yufu'] },
      modao_xiangyao:      { right: { chelaozu: 12 }, neutral: { chelaozu: 5 }, evilLock: ['chelaozu'] },
      moxiao_zhangfa:      { right: { yintianxia: 12 }, neutral: { yintianxia: 5 }, evil: {} },
      baiyi_guxing:        { right: { baidi: 13 }, neutral: { baidi: 4 }, evil: {} },
      /* 天道垂青池（系统深化批 A6 · 专属事件池 v2.7 №118 踵门道贺）：pei 映射预登记行——
       * 正 +12 / 左 +5 / 魔 绝交锁（假谕骗贺，故人心寒；既有锁在修-地-01，锁语义幂等） */
      tiandao_zhaohe:      { right: { pei: 12 }, neutral: { pei: 5 }, evilLock: ['pei'] },
      /* 天骄专属事件（№120~124 · 六向批 A4）：bond 槽位占位符 '$prodigy'（resolveBranch 运行时
       * 替换为触发槽位实际 id pr{n}——天骄 bonds 键空间与道友名录隔离，天骄卷 §10.1） */
      prodigy_ev_drink:    { right: { '$prodigy': 8 }, neutral: { '$prodigy': 4 }, evil: {} },
      prodigy_ev_gift:     { right: { '$prodigy': 10 }, neutral: { '$prodigy': 5 }, evil: {} },
      /* 江湖榜④ №129~130（第册三批）：机缘竞争挂的两支词条，bond 目标同样是运行时占位符 */
      jianghu_ev_rival_ling:  { right: { '$prodigy': 4 }, neutral: {}, evil: {} },
      jianghu_ev_rival_trial: { right: { '$prodigy': 6 }, neutral: {}, evil: {} }
    };
    var bad109 = [];
    var all109 = SQ.EVENTS.common.concat(SQ.EVENTS.xiuxian);
    all109.forEach(function (ev) {
      var exp109 = BOND_MAP109[ev.id];
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var br = (ev.choices || {})[bk] || {};
        var gotB = {}, gotL = [], gotDr = [];
        (br.gain || []).forEach(function (g) {
          if (g.type === 'bond') gotB[g.npc] = g.n;
          if (g.type === 'bondLock') gotL.push(g.npc);
          if (g.type === 'bondDrain') gotDr.push(g.npc);
        });
        var expB = (exp109 && exp109[bk]) || {};
        var expL = (exp109 && exp109[bk + 'Lock']) || [];
        var expDr = (exp109 && exp109[bk + 'Drain']) || [];
        if (JSON.stringify(gotB) !== JSON.stringify(expB)) bad109.push(ev.id + ':' + bk + ':bond');
        if (gotL.join() !== expL.join()) bad109.push(ev.id + ':' + bk + ':lock');
        if (gotDr.join() !== expDr.join()) bad109.push(ev.id + ':' + bk + ':drain');
        /* 互斥纪律：同一分支不得同时挂绝交锁与情谊生裂（缘尽收敛批）*/
        if (gotL.length && gotDr.length) bad109.push(ev.id + ':' + bk + ':both');
      });
    });
    /* 修-地-13 守陵人正道链 = [神·困难 → companion ≥2]（§5.1 示例挂载） */
    var gk109 = all109.find(function (e) { return e.id === 'grave_keeper'; });
    var gkChk = gk109.choices.right.check;
    if (!(Array.isArray(gkChk) && gkChk.length === 2 && gkChk[1].type === 'companion' && gkChk[1].minTier === 2)) {
      bad109.push('grave_keeper:companion链');
    }
    /* 好感模型：档位阈值 / clamp / 只增（负数拒）/ 心结锁拒入账 */
    var w109 = mkWs({ realm: 2 });
    pack.recalcDerived(w109, mkProf());
    var tierOk = [0, 1, 29, 30, 69, 70, 99, 100].map(function (a) { return SQ.Bonds.tierOf({ bonds: { x: a } }, 'x', D); })
      .join() === '0,1,1,2,2,3,3,4';
    var g109a = SQ.Bonds.gain(w109, pack, D, 'qin', 120, Date.now());
    var g109b = SQ.Bonds.gain(w109, pack, D, 'qin', -5, Date.now());
    w109.scars = { qin: Date.now() };
    var g109c = SQ.Bonds.gain(w109, pack, D, 'qin', 5, Date.now());
    var gainOk = g109a.after === 100 && g109a.tierAfter === 4 && g109b.blocked === 'nonpos' && g109c.blocked === 'scar';
    /* normalize：脏 bonds 过滤/clamp，spouses/spouseLogs 校验回落（册一百二十三批多道侣） */
    var n109 = pack.normalize(Object.assign(pack.initialState(), {
      bonds: { qin: 500, huang: 'abc', unknown_npc: 50, chiwei: -1 },
      spouses: [
        { npcId: 'huang', form: 'yinyang', since: 1 },            /* 非候选 → 丢弃 */
        { npcId: 'suwan', form: 'huzhu', since: 2 },              /* 合法 */
        { npcId: 'suwan', form: 'yinyang', since: 3 }             /* 同一人重复 → 丢弃 */
      ],
      spouse: { npcId: 'xie', form: 'huzhu', since: 4 },          /* 新键在场 ⇒ 旧单值不并读 */
      guardLog: { count: -3, success: 9 }, scars: { nobody: 1 },
      spouseLogs: [{ npcId: 'x' }]                                /* 名录外 → 丢弃 */
    }));
    var normOk = n109.bonds.qin === 100 && !('huang' in n109.bonds) && !('unknown_npc' in n109.bonds) &&
      n109.bonds.chiwei === -99 &&                                /* 势力批 v2.4：旧哨兵 −1 → −99 迁移 */
      n109.spouses.length === 1 && n109.spouses[0].npcId === 'suwan' &&
      n109.spouses[0].form === 'huzhu' && n109.spouses[0].since === 2 &&
      n109.guardLog.count === 0 && n109.guardLog.success === 0 &&
      Object.keys(n109.scars).length === 0 && n109.spouseLogs.length === 0;
    /* 旧单值档迁移：spouse → spouses、spouseLog → spouseLogs（各一条） */
    var migSeed = Object.assign(pack.initialState(), {
      spouse: { npcId: 'suwan', form: 'yinyang', since: 5 },
      spouseLog: { npcId: 'xie', form: 'huzhu', reason: 'karma', at: 6 }
    });
    delete migSeed.spouses; delete migSeed.spouseLogs;   /* 真旧档：新键根本不存在 */
    var mig109 = pack.normalize(migSeed);
    normOk = normOk && mig109.spouses.length === 1 && mig109.spouses[0].npcId === 'suwan' &&
      mig109.spouses[0].form === 'yinyang' && mig109.spouses[0].since === 5 &&
      mig109.spouseLogs.length === 1 && mig109.spouseLogs[0].npcId === 'xie' &&
      mig109.spouseLogs[0].reason === 'karma' && mig109.spouseLogs[0].at === 6;
    /* 旧档迁移（R7）：批 2 形态存档（无任何 G14 字段）→ normalize 补齐全套缺省 */
    var old109 = pack.initialState();
    ['bonds', 'spouses', 'guardLog', 'chuBlessAt', 'scars', 'spouseCdUntil', 'spouseLogs'].forEach(function (k) { delete old109[k]; });
    var m109 = pack.normalize(JSON.parse(JSON.stringify(old109)));
    normOk = normOk && JSON.stringify(m109.bonds) === '{}' && m109.spouses.length === 0 &&
      m109.guardLog.count === 0 && m109.chuBlessAt === 0 && JSON.stringify(m109.scars) === '{}' &&
      m109.spouseCdUntil === 0 && m109.spouseLogs.length === 0;
});
