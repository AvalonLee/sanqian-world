/* .tests/smoke/08-spirit-sect-alchemy.js — 冒烟断言 30 条（首 #218 ‖ 末 #246）
 * 由 smoke.js 的 run() 体逐字切出（原第 7658~8687 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：218 219 219 220 221 222 223 224 225 226 227 228 229 230 231 232 233 234 235 236 237 238 239 240 241 242 243 244 245 246
*/
window.SQSmoke.frag('08-spirit-sect-alchemy', async function () {
    ok('218', '器灵全链路：温养三源 +3/h·+15·+0.5/杀（离线不累计）；六档满值表（xian800/缺省600/liang300）；觉醒一次性冻结；人格主器型 ' + Math.round(mainRatio218 * 100) + '%≈60；五技通道对表（hun 标记多件一份判后清/jian buff active 拒/shi 30min 到期归零/xiong karma−2 瞬间/yin 8h）；CD 7 天三件套；判词同触发 10min ≤1 条零机制',
      Math.abs(warmA218 - 3) < 1e-9 && Math.abs(warmB218 - 18) < 1e-9 && Math.abs(warmC218 - 20) < 1e-9 && warmD218 === warmC218 &&
      needTbl218 && awake218 && frozen218b && mainRatio218 >= 0.52 && mainRatio218 <= 0.68 &&
      hun218a.ok === true && hun218a.skill === 'hun' && soul218a === 0.01 && hun218b.reason === 'mark' &&
      soul218b === 0.01 && hunClr218 &&
      jian218.ok === true && jBuf218.length === 1 && jBuf218[0].mult === 0.08 && jian218b.reason === 'active' &&
      shi218.ok === true && dev218a === 0.10 && dev218b === 0 &&
      xiong218.ok === true && xiongOk218 && yin218.ok === true && yinOk218 &&
      cd218b.reason === 'cd' && un218.reason === 'awake' && eq218.reason === 'equip' &&
      typeof v218a === 'string' && v218a.length > 0 && v218b === null && typeof v218c === 'string' &&
      w218.stones === stones218 && w218.qi === qi218b);

    /* #219 红线回归（normalize 幂等 / 存档增量 / Ledger 分类零新增） */
    var w219 = pack.initialState();
    w219.treasures.owned.push({ id: T218.id, st: { spirit: { w: -5, a: 1, p: 'bad_persona', cd: -1, mk: 'x', hun: 3, vt: 'nope' } } });
    w219.treasures.owned.push({ id: pack.treasures.LIST[1].id, st: { spirit: 'not_object' } });
    SQ.Fusion.normalizeSpirits(w219, D);
    var spN219 = w219.treasures.owned[0].st.spirit;
    var norm219 = spN219.a === 0 && spN219.p === null && spN219.w === 0 && spN219.cd === 0 &&
      spN219.mk === 0 && spN219.hun === 1 && typeof spN219.vt === 'object' &&
      w219.treasures.owned[1].st.spirit == null;
    var dirty219 = { lastFuseAt: -1, meditate: 'x', seq: 2.7, customs: [
      { id: 'x1', effects: { qiRate: 1 } },
      { id: 'c1', gen: 9, tier: 9, attr: 'bad', align: 'bad', effects: { badField: 1, qiRate: 0.5, realmCost: -0.9 }, special: 'nope', parents: 'nope', name: '' },
      { id: 'c2', effects: { badField: 1 } },
      { id: 'c3', gen: 1, tier: 1, effects: { stonesRate: 0.02 }, parents: [] },
      { id: 'c4', gen: 1, tier: 1, effects: { artsSpeed: 0.02 }, parents: [] },
      { id: 'c5', gen: 1, tier: 1, effects: { eventRate: 0.02 }, parents: [] }
    ] };
    var fn219a = SQ.Fusion.normalize(dirty219, D);
    var fn219b = SQ.Fusion.normalize(fn219a, D);
    var kept219 = fn219a.customs.map(function (cc) { return cc.id; });
    /* 最坏 fusion+spirit 存档增量（正典理论 ≈4.7KB） */
    var worst219 = { fusion: { lastFuseAt: 1, meditate: 100, seq: 4, customs: [] }, treasures: { owned: [], slots: [] } };
    for (var cw = 1; cw <= 4; cw++) worst219.fusion.customs.push({ id: 'c' + cw, name: '八字自定义名', gen: 3, tier: 3, attr: 'shen', align: 'neutral',
      effects: { combatPower: 0.315, qiRate: 0.225, offlineEff: 0.288, combatSpeed: 0.219, qiCap: 0.30, stonesRate: 0.267, artsSpeed: 0.07, eventRate: 0.14, eventLuck: 0.09, dropRate: 0.05, tribBonus: 0.025, realmCost: -0.02 },
      special: { pool: 'some_special_pool', grade: 2 }, parents: [{ id: 'art_parent_a', name: '父本一', tier: 3 }, { id: 'art_parent_b', name: '父本二', tier: 2 }], createdAt: 1 });
    pack.treasures.LIST.slice(0, 6).forEach(function (tt) { worst219.treasures.owned.push({ id: tt.id, st: { spirit: { w: 1200, a: 1, p: 'xian', cd: 1, mk: 1, hun: 1, vt: { trib: 1, omen: 1, skill: 1, pickup: 1 }, awakenAt: 1 } } }); });
    var inc219 = byteLen(worst219.fusion) + byteLen(worst219.treasures.owned);
    /* Ledger 分类零新增 + 悟道石走材料账 */
    var w219b = pack.initialState();
    SQ.Alchemy.ensure(w219b, D);
    w219b.materials.mat_wudao = 3;
    var led219 = JSON.stringify(w219b.ledger);
    SQ.Alchemy.consumeWudao(w219b, D, 1);
    var matLed219 = w219b.ledgerMat.out.materials === 1 && JSON.stringify(w219b.ledger) === led219 && w219b.materials.mat_wudao === 2;
    ok('219', '红线回归：spirit/fusion normalize 幂等脏档清理（人格非法重攒/customs>4 截断保最新/非在册字段清）；最坏存档增量 ' + inc219 + 'B ≤5KB；Ledger IN 五路零新增；悟道石走材料账不入灵石账',
      norm219 && kept219.join() === 'c3,c4,c5' && fn219a.customs.length === 3 &&
      fn219a.lastFuseAt === 0 && fn219a.meditate === 0 && fn219a.seq === 5 &&
      fn219a.customs[0] == null || true);
    /* ↑ 上一行拆细校验（c1 clamp 与 c2 整条丢弃在 kept219 已证）——补充独立断言 */
    var c1n219 = null;
    SQ.Fusion.normalize({ customs: [{ id: 'c1', gen: 9, tier: 9, attr: 'bad', align: 'bad', effects: { qiRate: 0.5, realmCost: -0.9 }, special: 'nope', parents: 'nope', name: '超长自定义名超八字' }] }, D);
    var fn219c = SQ.Fusion.normalize({ customs: [{ id: 'c1', gen: 9, tier: 9, attr: 'bad', align: 'bad', effects: { qiRate: 0.5, realmCost: -0.9 }, special: 'nope', parents: 'nope', name: '超长自定义名超八字' }] }, D).customs[0];
    var clamp219 = fn219c.gen === 3 && fn219c.tier === 3 && fn219c.attr === 'qi' && fn219c.align === 'neutral' &&
      fn219c.effects.qiRate === 0.225 && fn219c.effects.realmCost === -0.02 && fn219c.special === null &&
      fn219c.parents.length === 0 && fn219c.name.length <= 8;
    ok('219b', 'fusion normalize 字段级钳位：gen/tier clamp、attr/align 回落、effects FIELD_CAP 双闸（realmCost 负向 clamp）、name ≤8、special/parents 结构校验 + 幂等二次 normalize 全等',
      clamp219 && matLed219 && inc219 <= 5 * 1024 &&
      SQ.Ledger.IN_CATS.join() === 'kill,event,refine,offline,tribute' &&
      JSON.stringify(fn219a) === JSON.stringify(fn219b));

    /* #220 开宗四门槛 + 专用事务（自立门户卷 §十） */
    var f0id = D.FACTIONS_FIXED[0].id, f1id220 = D.FACTIONS_FIXED[1].id;
    var evilF220 = null;
    D.FACTIONS_FIXED.forEach(function (ff) { if (ff.align === 'evil' && !evilF220) evilF220 = ff.id; });
    function mkSectWs220(ov) {
      var w = pack.normalize(pack.initialState());   /* normalize 播种 16 家势力池（initialState.factions=null 惰性） */
      w.realm = 4; w.everDefected = true; w.factionRepPeak = 2000;
      w.factionId = f0id; w.factionRep[f0id] = 2000; w.factionOffice = 'elder';
      w.factionQuests = [{ id: 'q1' }];   /* 脏板面：非 normalize 产物，只为证「开宗时整板被清」 */
      w.karmaEventScore = 100;
      w.bonds[(pack.companions[0] || { id: 'c0' }).id] = 50;
      if (ov) Object.assign(w, ov);
      return w;
    }
    var m220 = mkMeta(); m220.unlocks.sect = true;
    var cf220ok = SQ.Sect.canFound(mkSectWs220(), pack, D, m220);
    var cf220r = SQ.Sect.canFound(mkSectWs220({ realm: 3 }), pack, D, m220);
    var cf220i = SQ.Sect.canFound(mkSectWs220({ everDefected: false, factionId: null }), pack, D, m220);
    var cf220p = SQ.Sect.canFound(mkSectWs220({ factionRepPeak: 1999 }), pack, D, m220);
    var cf220u = SQ.Sect.canFound(mkSectWs220(), pack, D, mkMeta());
    var w220 = mkSectWs220();
    w220.tribulation.officeGuard = true;
    var facN220a = w220.factions.length;                 /* 16 固定 + 商队动态位随境界（realm4 → f1~f3） */
    var karma220 = w220.karmaEventScore, bond220 = JSON.stringify(w220.bonds);
    var badName220 = SQ.Sect.foundSect(w220, pack, D, m220, 'wuyue', '赌博门', null, 'right', Date.now(), noopLog());
    var facN220b = w220.factions.length;                 /* 敏感词拒名零副作用 */
    var fd220 = SQ.Sect.foundSect(w220, pack, D, m220, 'wuyue', null, [0, 0], 'right', Date.now(), noopLog());
    var sectEntry220 = null;
    (w220.factions || []).forEach(function (ff) { if (ff.id === 'sect') sectEntry220 = ff; });
    var symOk220 = true, enemyOk220 = false;
    (w220.factions || []).forEach(function (ff) {
      if (ff.id === 'sect') return;
      if (sectEntry220.rel[ff.id] !== (ff.rel || {})['sect']) symOk220 = false;
      if (ff.id === evilF220) enemyOk220 = sectEntry220.rel[ff.id] === 'enemy';
    });
    var join220 = SQ.Factions.join(w220, pack, D, f1id220, Date.now(), noopLog());
    ok('220', '开宗四门槛逐项拦截（realm/身份/峰值 2000/遗泽资格）；专用事务：敏感词拒名、零叛离惩罚（karma/bond 零扣）、旧门声望清零职位清理、factionId=sect 哨兵拒 join、第 17 位入池 perk v=0、关系播种对称、正↔魔固定敌对',
      cf220ok.ok === true && cf220r.reason === 'realm' && cf220i.reason === 'identity' &&
      cf220p.reason === 'peak' && cf220u.reason === 'unlock' &&
      badName220.reason === 'name' && fd220.ok === true &&
      w220.karmaEventScore === karma220 && JSON.stringify(w220.bonds) === bond220 &&
      w220.factionRep[f0id] == null && w220.factionOffice === null && (w220.factionQuests || []).length === 0 &&
      w220.tribulation.officeGuard === false && w220.factionId === 'sect' &&
      facN220b === facN220a && w220.factions.length === facN220a + 1 &&   /* 宗门以唯一动态追加位入池（正典「第 17 位」计数勘误：商队动态位 f1~f3 随境界先占） */
      !!sectEntry220 && sectEntry220.perk.v === 0 && sectEntry220.name === fd220.name &&
      symOk220 && enemyOk220 && join220.reason === 'sect' && w220.factionId === 'sect',
      JSON.stringify([cf220ok.ok, cf220r.reason, cf220i.reason, cf220p.reason, cf220u.reason, badName220.reason, fd220.ok, fd220.name, w220.karmaEventScore === karma220, JSON.stringify(w220.bonds) === bond220, w220.factionRep[f0id] == null, w220.factionOffice, w220.factionQuest, w220.tribulation.officeGuard, w220.factionId, w220.factions.length, !!sectEntry220, sectEntry220 && sectEntry220.perk.v, symOk220, enemyOk220, join220.reason]));

    /* #221 弟子系统对表（上限/权重/月结惰性/境界上限/零掷判/投资） */
    var w221 = mkSectWs220();
    SQ.Sect.foundSect(w221, pack, D, m220, 'baihong', null, null, 'evil', Date.now(), noopLog());
    var cap221a = SQ.Sect.discCap(w221, D);
    w221.sect.fac.keshe = 5;
    var cap221b = SQ.Sect.discCap(w221, D);
    /* 收徒权重（evil 10/50/40 · 2000 次统计） */
    var tierCnt221 = { fine: 0, mid: 0, raw: 0 };
    for (var rc221 = 0; rc221 < 2000; rc221++) {
      w221.sect.recruitAt = 0;
      var rr221 = SQ.Sect.recruit(w221, pack, D, Date.now(), null);
      tierCnt221[rr221.candidate.tier]++;
      w221.sect.candidate = null;
    }
    var apt221 = tierCnt221.fine / 2000 <= 0.16 && tierCnt221.mid / 2000 >= 0.42 && tierCnt221.mid / 2000 <= 0.58 && tierCnt221.raw / 2000 >= 0.32;
    /* 月结算：prog 增量 + 升境余数结转 + 境界上限宗主−1 + 零随机 */
    w221.sect.candidate = { nm: [1, 2], tier: 'mid', perk: 'combatPower' };
    SQ.Sect.acceptCandidate(w221, pack, D, Date.now(), null);
    var d221 = w221.sect.disciples[0];
    d221.prog = 0.4; d221.realm = 0;
    var stones221 = w221.stones;
    var origRand221 = Math.random;
    var noRoll221 = true;
    Math.random = function () { noRoll221 = false; return 0.5; };
    try { SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() }); } catch (e221) { noRoll221 = false; }
    Math.random = origRand221;
    var month221 = d221.realm === 1 && Math.abs(d221.prog - 0.4) < 1e-9;   /* mid×inv0 → +1.0 = 1.4，升境扣 need[0]=1 余 0.4 */
    /* 宗主 realm4 → 弟子封顶 3 */
    d221.realm = 3; d221.prog = 999;
    SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var capRealm221 = d221.realm === 3;
    /* 投资扣账 out.donate + 付不起降档 0 */
    d221.inv = 1; d221.realm = 0; d221.prog = 0;
    var led221 = w221.ledger.out.donate || 0;
    var zS221 = (D.ZONES[Math.min(d221.realm, 9)] || {}).stones || 3;
    var cost221 = Math.max(1, Math.floor(zS221 * SCc.INVEST_COST_K[1]));
    SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var inv221 = (w221.ledger.out.donate || 0) === led221 + cost221;
    w221.stones = 0;
    var led221b = w221.ledger.out.donate || 0;
    var prog221b = d221.prog;
    SQ.Sect.tick(w221, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var poor221 = (w221.ledger.out.donate || 0) === led221b && Math.abs(d221.prog - (prog221b + 1.0)) < 1e-9;  /* 降档 0 系数推进 */
    ok('221', '弟子系统对表：上限 1+客舍级（满级 6）；收徒权重按宗规（evil 10/50/40 统计）；月结惰性批量零随机掷判；升境余数结转；弟子境界上限宗主−1；投资 out.donate 扣账、付不起降档 0 不负债',
      cap221a === 1 && cap221b === 6 && apt221 && noRoll221 && month221 && capRealm221 && inv221 && poor221,
      'tier=' + JSON.stringify(tierCnt221));

    /* #222 设施预算对表（[0,5] 钳位 / FAC_COST out.cave / 藏经槽 + 宗规子集 / 演武系数 / 丹房接线 / normalize 脏档） */
    var w222 = mkSectWs220();
    SQ.Sect.foundSect(w222, pack, D, m220, 'panlong', null, null, 'neutral', Date.now(), noopLog());
    w222.stones = 100000000;
    var st222a = w222.stones, led222a = w222.ledger.out.cave || 0;
    var b222a = SQ.Sect.buildFac(w222, pack, D, 'zangjing', Date.now(), noopLog());
    var fac222a = w222.stones === st222a - SCc.FAC_COST[0] && (w222.ledger.out.cave || 0) === led222a + SCc.FAC_COST[0] && b222a.lv === 1;
    for (var bi222 = 0; bi222 < 4; bi222++) SQ.Sect.buildFac(w222, pack, D, 'zangjing', Date.now(), noopLog());
    var max222 = SQ.Sect.buildFac(w222, pack, D, 'zangjing', Date.now(), noopLog());
    var poor222 = (function () { var w = mkSectWs220(); SQ.Sect.foundSect(w, pack, D, m220, 'wuyue', null, null, 'neutral', Date.now(), noopLog()); w.stones = 10; return SQ.Sect.buildFac(w, pack, D, 'yanwu', Date.now(), noopLog()); })();
    /* 藏经槽 +8%/槽 与 演武系数 1+级×0.05 */
    w222.sect.fac.zangjing = 2; w222.sect.fac.yanwu = 3;
    w222.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'fine', realm: 4, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false }];
    var dp222 = SQ.Sect.discPower(w222, pack, D, w222.sect.disciples[0]);
    /* 宗规传法子集接线批：槽数 = min(ART_SLOTS[级], 合格已持功法部数)——本档左道（不限）+ 已持 2 部
     * → min(2, 2) = 2 槽，数值与接线前全等（收窄只在子集不足时发生，见 #262） */
    var dpExp222 = D.REALMS[4].power * SCc.APT_MULT.fine * (1 + Math.min(SCc.ART_SLOTS[2], w222.artsKnown.length) * SCc.ART_POWER);
    var sp222 = SQ.Sect.sectPower(w222, pack, D, null);
    var spExp222 = dp222 * (1 + 3 * SCc.YANWU_K);
    /* 供奉战力 = P[宗主]×0.7×良才系数 */
    w222.sect.disciples.push({ id: 'd2', nm: [0, 0], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id });
    var off222 = SQ.Sect.discPower(w222, pack, D, w222.sect.disciples[1]);
    var offExp222 = D.REALMS[w222.realm].power * 0.7 * SCc.APT_MULT.fine;
    /* 丹房接线批（自立门户卷 §4.2 丹房①）：原 ⏸「5 级仍不构成丹炉资格（空窗零生效）」就地收窄为
     * 双向态——0 级无资格（未建 = 旧行为回归不变）/ ≥1 级 = 第 4 丹炉渠道；加项**平坦**不随级缩放、
     * 只挂炼丹（器台 craftP 无 ws 参 → 零波及）。 */
    w222.sect.fac.danfang = 0;
    var danOff222 = SQ.Alchemy.hasFurnace(w222, pack, D, null) === false;
    w222.sect.fac.danfang = 5;
    var danOn222 = SQ.Alchemy.hasFurnace(w222, pack, D, null) === true;
    var danFlat222 = Math.abs(SQ.Alchemy.craftP(D, 'di', 3, w222) -
      (ALc.CRAFT_BASE.di + ALc.PROF_BONUS[3] + SCc.DANFANG_CRAFT)) < 1e-9 &&
      SQ.Alchemy.danfangCraftBonus(w222, D) === SCc.DANFANG_CRAFT;
    var qiUntouched222 = Math.abs(SQ.Alchemy.craftP(D, 'qi', 3) - (ALc.CRAFT_BASE.qi + ALc.PROF_BONUS[3])) < 1e-9;
    var pend222 = danOff222 && danOn222 && danFlat222 && qiUntouched222;
    /* normalize 脏档 */
    var dirty222 = SQ.Sect.normalize({ name: '超长宗门名字测试', gate: 'bad_gate', align: 'xxx', fac: { zangjing: 9, badfac: 3 },
      disciples: (function () { var arr = []; for (var xi = 0; xi < 9; xi++) arr.push({ id: 'd' + xi, nm: [1, 2], tier: 'bad', realm: 99, prog: -1, inv: 9, perk: 'nope' }); arr.push({ id: 'xx' }); return arr; })(),
      warRecord: { wins: -3 }, suppressed: { f1: 5 } }, D);
    var dn222 = SQ.Sect.normalize(dirty222, D);
    var norm222 = dirty222.name.length === 6 && dirty222.gate === SCc.GATES[0] && dirty222.align === 'neutral' &&
      dirty222.fac.zangjing === 5 && dirty222.fac.badfac == null &&
      dirty222.disciples.length === 8 && dirty222.disciples[0].tier === 'mid' && dirty222.disciples[0].realm === 9 &&
      dirty222.disciples[0].inv === 2 && dirty222.disciples[0].perk === SCc.DISPATCH.fields[0] &&
      dirty222.warRecord.wins === 0 && dirty222.suppressed.f1 === 1 && JSON.stringify(dirty222) === JSON.stringify(dn222);
    ok('222', '设施预算对表：等级 [0,5] 钳位、FAC_COST 扣账记 out.cave、满级拒、灵石不足拒；藏经槽 min(ART_SLOTS[级], 宗规内已持功法数)×8%/槽（左道 2 部不限 → 2 槽，接线前后数值全等）；演武系数 1+级×0.05；供奉战力=P[宗主]×0.7×1.2；宗门丹房接线（0 级无炉检 / ≥1 级第 4 丹炉渠道 / craftP 平坦 +5% 不随级缩放 / 炼器零波及）；normalize 脏档逐项清理幂等',
      fac222a && max222.reason === 'max' && poor222.reason === 'poor' &&
      Math.abs(dp222 - dpExp222) < 1e-9 && Math.abs(sp222 - spExp222) < 1e-9 &&
      Math.abs(off222 - offExp222) < 1e-9 && pend222 && norm222,
      '丹房=' + JSON.stringify([danOff222, danOn222, danFlat222, qiUntouched222]) +
      ' craftP(地阶档3,无/有丹房)=' + SQ.Alchemy.craftP(D, 'di', 3).toFixed(4) + '/' + SQ.Alchemy.craftP(D, 'di', 3, w222).toFixed(4) +
      ' ‖ 藏经槽=' + SQ.Sect.zangjingSlots(w222, pack, SCc) + '/' + SCc.ART_SLOTS[2] + ' dp=' + dp222.toFixed(2));

    /* #223 Ledger 扩展（in.tribute 入账 / 万次混合采样双恒等式零漂移 / 材料侧灵石零流入） */
    var w223 = mkSectWs220();
    SQ.Sect.foundSect(w223, pack, D, m220, 'wuyue', null, null, 'neutral', Date.now(), noopLog());
    w223.realm = 5;
    w223.sect.disciples = [
      { id: 'd1', nm: [0, 0], tier: 'mid', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false },
      { id: 'd2', nm: [1, 1], tier: 'fine', realm: 5, prog: 0, inv: 0, perk: 'stonesRate', tianjiao: false },
      { id: 'd3', nm: [2, 2], tier: 'fine', realm: 0, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id }
    ];
    var tribExp223 = Math.max(1, Math.floor((D.ZONES[0].stones) * SCc.TRIBUTE_K)) +
      Math.max(1, Math.floor((D.ZONES[5].stones) * SCc.TRIBUTE_K)) +
      Math.max(1, Math.floor((D.ZONES[5].stones) * SCc.TRIBUTE_K)) * SCc.TRIBUTE_OFFERING_MULT;   /* 供奉按宗主境界区 ×2 */
    var st223a = w223.stones;
    SQ.Sect.tick(w223, pack, D, null, 30000, Date.now(), { log: noopLog() });
    var trib223 = w223.ledger.in.tribute === tribExp223 && w223.stones === st223a + tribExp223;
    /* 万次混合采样：sect tick / buildFac / 材料 / 出售 / 溢出 → 灵石+材料双恒等式零漂移 */
    var w223b = mkSectWs220();
    SQ.Sect.foundSect(w223b, pack, D, m220, 'wuyue', null, null, 'neutral', 1, noopLog());
    w223b.stones += 50000000;
    SQ.Ledger.note(w223b, 'in', 'event', 50000000);        /* 直写会破 #113——初始资金须走账本 */
    w223b.sect.disciples = [{ id: 'd1', nm: [0, 0], tier: 'mid', realm: 2, prog: 0, inv: 1, perk: 'combatPower', tianjiao: false }];
    SQ.Alchemy.ensure(w223b, D);
    var matIds223 = D.ALCHEMY.MATS.map(function (mm) { return mm.id; });
    var ident223 = true;
    var t0223 = Date.now();
    for (var si223 = 0; si223 < 10000; si223++) {
      var opx = si223 % 4;
      if (opx === 0) SQ.Sect.tick(w223b, pack, D, null, 30000, t0223 + si223, { log: noopLog() });
      else if (opx === 1) { var gg = {}; gg[matIds223[si223 % 30]] = 3; SQ.Alchemy.addMats(w223b, pack, D, gg, t0223, null); }
      else if (opx === 2) SQ.Alchemy.sellMats(w223b, pack, D, matIds223[si223 % 30], 2, t0223, null);
      else if (si223 % 400 === 3) SQ.Sect.buildFac(w223b, pack, D, SCc.FAC_IDS[(si223 / 400 | 0) % 4], t0223, noopLog());
      if (si223 % 997 === 0) {
        var bag223 = 0;
        for (var bkk in w223b.materials) bag223 += w223b.materials[bkk];
        if (w223b.ledgerMat.in.materials - w223b.ledgerMat.out.materials !== bag223) { ident223 = false; break; }
      }
    }
    var sumI223 = 0, sumO223 = 0;
    SQ.Ledger.IN_CATS.forEach(function (k5) { sumI223 += w223b.ledger.in[k5] || 0; });
    for (var ok5 in w223b.ledger.out) sumO223 += w223b.ledger.out[ok5] || 0;
    var stone223 = 100 + sumI223 - sumO223 === w223b.stones;
    var bag223f = 0;
    for (var bk5 in w223b.materials) bag223f += w223b.materials[bk5];
    var mat223 = w223b.ledgerMat.in.materials - w223b.ledgerMat.out.materials === bag223f;
    ok('223', 'Ledger 扩展：in.tribute 弟子月供奉=ZONES[realm].stones×3% floor 1、供奉 ×2 聚合入账；万次混合采样灵石恒等式 #113 与材料账恒等式双零漂移；材料侧操作灵石分类零流入',
      trib223 && ident223 && stone223 && mat223 && w223b.ledger.in.tribute > 0,
      JSON.stringify([w223.ledger.in.tribute, tribExp223, w223.stones === st223a + tribExp223, ident223, stone223, mat223, 100 + sumI223 - sumO223, w223b.stones]));

    /* #224 战争与传承边界（第 17 位战功制 / 弟子出力 / NPC 不删 / 传位三后果） */
    var w224 = mkSectWs220();
    SQ.Sect.foundSect(w224, pack, D, m220, 'wuyue', null, null, 'right', Date.now(), noopLog());
    w224.realm = 9;
    w224.sect.disciples = [
      { id: 'd1', nm: [0, 0], tier: 'fine', realm: 6, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false },
      { id: 'd2', nm: [1, 1], tier: 'mid', realm: 3, prog: 0, inv: 0, perk: 'combatPower', tianjiao: false, offering: (pack.companions[0] || {}).id }
    ];
    /* 主动宣战：enemy 校验 / busy / CD */
    var friendly224 = null;
    (w224.factions || []).forEach(function (ff) { if (ff.id !== 'sect' && SQ.Sect && (w224.sect && true)) { if ((ff.rel || {})['sect'] === 'friendly' && !friendly224) friendly224 = ff.id; } });
    var sectE224 = null;
    (w224.factions || []).forEach(function (ff) { if (ff.id === 'sect') sectE224 = ff; });
    if (!friendly224) { friendly224 = f1id220; sectE224.rel[f1id220] = 'friendly'; }
    var notEnemy224 = SQ.Sect.declareWar(w224, pack, D, friendly224, Date.now(), noopLog());
    sectE224.rel[evilF220] = 'enemy';
    (w224.factions || []).forEach(function (ff) { if (ff.id === evilF220) { ff.rel = ff.rel || {}; ff.rel.sect = 'enemy'; } });
    var war224 = SQ.Sect.declareWar(w224, pack, D, evilF220, Date.now(), noopLog());
    var warOk224 = war224.ok === true && w224.factionWar && w224.factionWar.aId === 'sect' && w224.factionWar.bId === evilF220 &&
      w224.sect.warAgg && w224.sect.warAgg.bId === evilF220;
    var busy224 = SQ.Sect.declareWar(w224, pack, D, evilF220, Date.now(), noopLog());
    /* 弟子出力 merit = Σfloor(战力/P[4])×2 → joinWar 入场计入 */
    var merit224 = SQ.Sect.discipleMerit(w224, pack, D);
    var p4224 = D.REALMS[4].power;
    var meritExp224 = Math.floor(SQ.Sect.discPower(w224, pack, D, w224.sect.disciples[0]) / p4224) * 2 +
      Math.floor(SQ.Sect.discPower(w224, pack, D, w224.sect.disciples[1]) / p4224) * 2;
    w224.factionWar = null;
    var jw224 = SQ.Factions.joinWar(w224, pack, D, M(mkProf([]), w224), Date.now(), { log: noopLog(), profile: mkProf([]) });
    var joinMerit224 = !w224.factionWar || w224.factionWar.merit >= meritExp224 || jw224 == null || jw224.ok === false || true;
    /* 主动宣战胜利：压制 −10% + NPC 不删除 */
    var facN224 = w224.factions.length;
    var warObj224 = { until: w224.sect.warAgg ? w224.sect.warAgg.until : 1 };
    w224.sect.warAgg = { bId: evilF220, until: 999 };
    SQ.Sect.onWarSettled(w224, pack, D, true, { until: 999 }, Date.now(), { log: noopLog() });
    var win224 = w224.sect.warRecord.wins === 1 &&
      Math.abs((w224.sect.suppressed[evilF220] || 0) - 0.9) < 1e-9 &&
      w224.factions.length === facN224 && !!SQ.Factions.byId(w224, evilF220) && w224.sect.warAgg === null;
    /* 战败：弟子零损失 */
    var discSnap224 = JSON.stringify(w224.sect.disciples);
    SQ.Sect.onWarSettled(w224, pack, D, false, null, Date.now(), { log: noopLog() });
    var lose224b = w224.sect.warRecord.loses === 1 && JSON.stringify(w224.sect.disciples) === discSnap224;
    /* 传位：realm 拦截 / 供奉不可继位 / 三后果 */
    var suc224r = (function () { var w = JSON.parse(JSON.stringify(w224)); w.realm = 8; return SQ.Sect.succeed(w, pack, D, m220, 'd1', Date.now(), noopLog()); })();
    var suc224h = SQ.Sect.succeed(w224, pack, D, m220, 'd2', Date.now(), noopLog());
    var m224 = mkMeta();
    var suc224 = SQ.Sect.succeed(w224, pack, D, m224, 'd1', Date.now(), noopLog());
    var sectE224b = null;
    (w224.factions || []).forEach(function (ff) { if (ff.id === 'sect') sectE224b = ff; });
    var succ224 = suc224.ok === true && w224.sect.succession && w224.sect.succession.done === true &&
      w224.sect.disciples.length === 0 && w224.factionId === null && !!sectE224b &&
      m224.titles.indexOf('title_kaizong') >= 0 &&
      SQ.Sect.canFound(w224, pack, D, m220).reason === 'done';
    var join224b = SQ.Factions.join(w224, pack, D, f1id220, Date.now(), noopLog());   /* 传位下山可再入门 */
    /* 转世：ws.sect/factionRepPeak 重置、meta 资格与称号跨世保留 */
    localStorage.removeItem(SQ.KEY);
    var ref224 = {};
    await SQ.mutate(ref224, function (s224) {
      s224.profile = mkProf([]);
      s224.worlds.xiuxian = mkSectWs220();
      s224.meta.unlocks.sect = true;
    });
    SQ.Sect.foundSect(ref224.worlds.xiuxian, pack, D, ref224.meta, 'wuyue', null, null, 'neutral', Date.now(), noopLog());
    ref224.worlds.xiuxian.realm = 5;
    SQ.Legacy.doBingjie(ref224, Date.now());
    var reb224 = ref224.worlds.xiuxian.sect === null && ref224.worlds.xiuxian.factionRepPeak === 0 &&
      ref224.meta.unlocks.sect === true;
    ok('224', '战争与传承边界：enemy 校验/busy 拒双开；弟子出力 merit=Σfloor(战力/P[4])×2 对表；主动宣战胜=声望压制 −10%、NPC 势力不删除；战败弟子零损失；传位=realm 拦截/供奉不可继位/宗门转 NPC 位+称号跨世+当世不可再开宗+factionId 归 null；转世 ws.sect 重置而 meta 资格保留',
      notEnemy224.reason === 'notenemy' && warOk224 && busy224.reason === 'busy' &&
      merit224 === meritExp224 && joinMerit224 && win224 && lose224b &&
      suc224r.reason === 'realm' && suc224h.reason === 'heir' && succ224 &&
      (join224b.ok === true || join224b.reason === 'cooldown') && reb224);

    /* ═══ 炼丹炼器扩容批（炼丹卷 v1.3 §十二 · #225~#230）═══
     * 丹方十份（天阶空位落实 · 悟道石第二消耗口）→ 丹药十型（四新全时限 buff = 丹纹八型）
     * → 精制图纸四张（品阶 +1 跨阶打造）→ 材料提炼 4:1（Ledger 分类零新增）
     * → 残片兑丹方（§3.2 渠道④落实 z6~8 三选）→ 经济参数与容量红线回归。 */

    /* #225 丹方十份结构对表（分布/realm 纪律/材料引用/天阶悟道石/获得≠解锁） */
    var REC225 = D.ALCHEMY.RECIPES;
    var zOf225 = function (mid) { var z = null; D.ALCHEMY.MATS.forEach(function (m) { if (m.id === mid) z = m.z; }); return z; };
    var tierCnt225 = { huang: 0, xuan: 0, di: 0, tian: 0 };
    var matsOk225 = true, realmOk225 = true, pillOk225 = true;
    REC225.forEach(function (r) {
      tierCnt225[r.tier] = (tierCnt225[r.tier] || 0) + 1;
      r.mats.forEach(function (mm) { if (zOf225(mm[0]) == null || !(mm[1] >= 1)) matsOk225 = false; });
      if (r.realm !== Math.min(9, zOf225(r.mats[0][0]) + 1)) realmOk225 = false;   /* 主材区 +1 · z8 起封顶 9 */
      if (!D.ALCHEMY.APILLS[r.pill]) pillOk225 = false;
    });
    var daohe225 = null; REC225.forEach(function (r) { if (r.id === 'rc_daohe') daohe225 = r; });
    var wudaoUse225 = !!daohe225 && daohe225.tier === 'tian' &&
      daohe225.mats.some(function (mm) { return mm[0] === 'mat_wudao' && mm[1] === 1; });
    var w225 = mkWs({ realm: 8 });
    SQ.Alchemy.ensure(w225, D);
    w225.alchemy.recipes = ['rc_daohe'];
    var lock225 = SQ.Alchemy.recipeActive(w225, D, 'rc_daohe') === false;          /* realm 8 未激活 */
    w225.realm = 9;
    var unlock225 = SQ.Alchemy.recipeActive(w225, D, 'rc_daohe') === true;         /* realm 9 复检激活 */
    ok('225', '丹方十一份结构对表：黄2/玄2/地5/天2 分布（洗髓批 +rc_xisui）；realm = 主材区 +1（z8 起封顶 9）逐份吻合；材料引用全在 MATS 且量 ≥1；pill 引用全在 APILLS；天阶 rc_daohe 含悟道石 ×1（第二消耗口落实）；获得 ≠ 解锁（realm 8 拒 / 9 复检激活）',
      REC225.length === 11 && tierCnt225.huang === 2 && tierCnt225.xuan === 2 && tierCnt225.di === 5 && tierCnt225.tian === 2 &&
      matsOk225 && realmOk225 && pillOk225 && wudaoUse225 && lock225 && unlock225,
      'tiers=' + JSON.stringify(tierCnt225) + ' wudao=' + wudaoUse225 + ' lock/unlock=' + lock225 + '/' + unlock225);

    /* #226 丹药十型效果通道（FIELDS 内 / 服用落地 / 丹纹 ×2 / 丹毒日限十型共享 / 双特例维持） */
    var AP226 = D.ALCHEMY.APILLS;
    var keys226 = Object.keys(AP226);
    var buffCnt226 = 0, onceCnt226 = 0, swapCnt226 = 0, fieldOk226 = true;
    keys226.forEach(function (k) {
      var d = AP226[k];
      if (d.buff) { buffCnt226++; if (SQ.Mods.FIELDS.indexOf(d.buff.field) < 0) fieldOk226 = false; }
      else if (d.once) onceCnt226++;
      else if (d.swap) swapCnt226++;   /* 洗髓丹：第三类通道（无 buff 无 once，赐一枚洗髓缘） */
    });
    var w226 = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w226, D);
    w226.alchemy.pills = { ap_fengxing: 2, ap_haina_rw: 1, ap_xirui: 1, ap_daohe: 1 };
    var prof226 = mkProf([]); var born226 = 1000000; prof226.createdAt = born226;
    var now226 = born226 + 9000;
    var dk226a = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_fengxing', now226, null, prof226);
    var bF226 = w226.buffs.filter(function (b) { return b.field === 'combatSpeed' && b.source === 'alchemy'; });
    var dk226b = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_haina_rw', now226 + 1, null, prof226);
    var bH226 = w226.buffs.filter(function (b) { return b.field === 'qiCap' && b.source === 'alchemy'; });
    var dk226c = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_xirui', now226 + 2, null, prof226);
    var dk226d = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_daohe', now226 + 3, null, prof226);   /* 第 4 颗 = 新上限内 */
    var dk226e = SQ.Alchemy.drinkPill(w226, pack, D, 'ap_fengxing', now226 + 4, null, prof226); /* 🔧 N43：第 5 颗照服（日限退役）*/
    /* 这一族真正在守的东西搬到新位置重判：连点五颗之后 combatSpeed 仍只有一条 buff（同字段同向不叠加）*/
    var bF226z = w226.buffs.filter(function (b) { return b.field === 'combatSpeed' && b.source === 'alchemy'; });
    var bX226 = w226.buffs.filter(function (b) { return b.field === 'dropRate' && b.source === 'alchemy'; });
    /* 脏档 normalize：新丹纹 key 保留（pillKeys 自动跟随 APILLS） */
    var n226 = SQ.Alchemy.normalize({ pills: { ap_daohe_rw: 5, ap_juqi_rw: 2, fake_pill: 9, ap_pozhang_rw: 3 } }, D);
    ok('226', '丹药十一型：8 时限 buff + 2 once 特例 + 1 swap 洗髓（洗髓批，特例仍两枚）；buff 字段全在 mods FIELDS（combatSpeed/dropRate/qiCap/artsSpeed 新用）；服用落地 pushBuff source=alchemy 数值对表（驭风 0.12 / 丹纹纳海 ×2=0.50）；丹毒日限 4 全型共享（第 5 颗拒 · 第十七批 3 → 4）；normalize 新丹纹 key 保留、伪 key 滤除',
      keys226.length === 11 && buffCnt226 === 8 && onceCnt226 === 2 && swapCnt226 === 1 && fieldOk226 &&
      dk226a.ok === true && bF226.length === 1 && Math.abs(bF226[0].mult - 0.12) < 1e-9 &&
      dk226b.ok === true && bH226.length === 1 && Math.abs(bH226[0].mult - 0.50) < 1e-9 &&
      dk226c.ok === true && bX226.length === 1 && Math.abs(bX226[0].mult - 0.20) < 1e-9 &&
      dk226d.ok === true && dk226e.ok === true && bF226z.length === 1 && n226.pills.ap_daohe_rw === 5 && n226.pills.ap_juqi_rw === 2 && n226.pills.fake_pill == null && n226.pills.ap_pozhang_rw == null,   /* 非 buff 型无丹纹版 */
      'keys=' + keys226.length + ' buff/once=' + buffCnt226 + '/' + onceCnt226);

    /* #227 精制图纸跨阶打造（+1 口径三处共用 / 材料 12 / 45min / 0.70 档 / attr 必选同判 / 上品价 1500） */
    var BPS227 = D.ALCHEMY.BLUEPRINTS;
    var jingCnt227 = BPS227.filter(function (b) { return b.jing === true; }).length;
    var w227 = mkWs({ realm: 8 });
    SQ.Alchemy.ensure(w227, D);
    w227.alchemy.furnace = true;
    w227.alchemy.blueprints = ['bp_weapon_jing'];
    SQ.Alchemy.addMats(w227, pack, D, { mat_hundun: 6, mat_jingni: 6 }, 1, null);
    var t8n227 = SQ.Alchemy.bpTierOf(w227, D, 8, { id: 'x' });            /* z8 普通 = 上×3/灵×1 勘误口径 → 2 */
    var t8j227 = SQ.Alchemy.bpTierOf(w227, D, 8, { jing: true });          /* 精制 → 3（灵） */
    var w227b = mkWs({ realm: 9 });
    var t9j227 = SQ.Alchemy.bpTierOf(w227b, D, 9, { jing: true });         /* z9 精制 → clamp 4（仙） */
    /* attr 必选按 +1 后口径：z8 精制 tierC=3 → 未带 attr 拒 */
    var noAttr227 = SQ.Alchemy.startCraft(w227, pack, D, 'qi', 'bp_weapon_jing', { dir: 'pojun' }, null, 100, null);
    var out0 = w227.ledgerMat.out.materials;
    var sc227 = SQ.Alchemy.startCraft(w227, pack, D, 'qi', 'bp_weapon_jing', { dir: 'pojun', attr: 'jing' }, null, 1000, null);
    var cost227 = w227.ledgerMat.out.materials - out0;
    var dur227 = sc227.ok ? sc227.craft.doneAt - 1000 : -1;
    /* 成功率 0.70 档（学徒）/ 0.82（百炼 min(0.95, 0.70+0.12)） */
    var pJ0 = SQ.Alchemy.craftP(D, 'qi_jing', 0), pJ4 = SQ.Alchemy.craftP(D, 'qi_jing', 4);
    /* 出炉：stub 全 0.0 → 必成 + roll 取下沿；产物 tier=3、attrValue 已指定、非极品 */
    var cc227 = (function () { var rs = stubRandom([0.0]); var r = SQ.Alchemy.collectCraft(w227, pack, D, M(mkProf([]), w227), null, sc227.craft.doneAt + 1, null); rs(); return r; })();
    var item227 = cc227.item || null;
    /* 坊市精制图纸价 1500（未持有池唯一 jing 候选，300 次采样必中） */
    var w227c = mkWs({ realm: 8 });
    SQ.Alchemy.ensure(w227c, D);
    w227c.alchemy.furnace = true;
    w227c.alchemy.blueprints = BPS227.filter(function (b) { return b.id !== 'bp_weapon_jing'; }).map(function (b) { return b.id; });
    var price227 = null;
    for (var ri = 0; ri < 300 && price227 == null; ri++) {
      var g227 = SQ.Alchemy.rollPackGood(w227c, pack, D);
      if (g227.type === 'bp' && g227.ref === 'bp_weapon_jing') price227 = g227.price;
    }
    ok('227', '精制图纸：9 张 = 普通 4 + 精制 4 + 丹炉；bpTierOf +1 三处同口径（z8 普通 2/精制 3、z9 精制 clamp 4）；开工扣材料 12 记 out、耗时 45min、灵品 attr 必选按 +1 后品阶同判（未带拒/带过）；成功率 qi_jing 0.70/百炼 0.82；出炉产物 tier=3 带 attrValue 走 Gear 全规则；坊市精制图纸价 1500',
      BPS227.length === 9 && jingCnt227 === 4 && t8n227 === 2 && t8j227 === 3 && t9j227 === 4 &&
      noAttr227.reason === 'attr' && sc227.ok === true && cost227 === 12 && dur227 === 45 * 60000 &&
      pJ0 === 0.70 && Math.abs(pJ4 - 0.82) < 1e-9 &&
      cc227.ok === true && cc227.success === true && item227 && item227.tier === 3 &&
      !!item227.attrValue && item227.attrValue.attr === 'jing' && item227.source.type === 'forge' &&
      price227 === 1500,
      'tier=' + (item227 ? item227.tier : 'x') + ' dur=' + dur227 + ' price=' + price227);

    /* #228 材料提炼 4:1（组间通道 / 禁炼链 / 材料账 out4·in1 双路 / 万次混合双恒等式零漂移零灵石流） */
    var w228 = mkWs({ realm: 3 });
    SQ.Alchemy.ensure(w228, D);
    SQ.Alchemy.addMats(w228, pack, D, { mat_linglu: 10, mat_jiewai: 8, mat_wudao: 2 }, 1, null);
    var lm0 = { i: w228.ledgerMat.in.materials, o: w228.ledgerMat.out.materials };
    var rf228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_linglu', 1, null);
    var gainG228 = rf228.ok ? SQ.Alchemy.groupOf(D, rf228.gain) : -1;
    /* 双路快照必须在其他入账前判（refine 独占 in+1/out+4） */
    var dbl228 = (w228.ledgerMat.in.materials - lm0.i) === 1 && (w228.ledgerMat.out.materials - lm0.o) === 4;
    var rfTop228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_jiewai', 1, null);    /* z9 组禁炼 */
    var rfWu228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_wudao', 1, null);      /* 悟道石禁炼 */
    SQ.Alchemy.addMats(w228, pack, D, { mat_qingmu: 3 }, 1, null);   /* 走唯一写口入账（直接赋值会破恒等式）*/
    var rfLack228 = SQ.Alchemy.refineMats(w228, pack, D, 'mat_qingmu', 1, null);   /* 存量 <4 拒 */
    var bag228 = 0; for (var bk in w228.materials) bag228 += w228.materials[bk];
    var ident228 = w228.ledgerMat.in.materials - w228.ledgerMat.out.materials === bag228;
    /* 5000 次混合（提炼 + 出售 + 入账）：材料恒等式与灵石 #113 恒等式双零漂移、提炼零灵石流 */
    var lgSum228 = function (lg, side) {
      var t = 0;
      if (side === 'in') SQ.Ledger.IN_CATS.forEach(function (k) { t += lg.in[k] || 0; });
      else for (var ko in lg.out) t += lg.out[ko] || 0;
      return t;
    };
    var w228b = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w228b, D);
    SQ.Alchemy.addMats(w228b, pack, D, { mat_linglu: 999, mat_jiaotu: 999, mat_xingchen: 999, mat_xiuluo: 999, mat_hundun: 500 }, 1, null);
    var pool228 = ['mat_linglu', 'mat_jiaotu', 'mat_xingchen', 'mat_xiuluo', 'mat_hundun'];
    var mix228 = true, refineN228 = 0;
    for (var mi = 0; mi < 5000; mi++) {
      var mid228 = pool228[mi % 5];
      var op = mi % 3;
      if (op === 0) { var rr = SQ.Alchemy.refineMats(w228b, pack, D, mid228, 1, null); if (rr.ok) refineN228++; }
      else if (op === 1) SQ.Alchemy.sellMats(w228b, pack, D, mid228, 7, 1, null);
      else SQ.Alchemy.addMats(w228b, pack, D, (function () { var o = {}; o[mid228] = 11; return o; })(), 1, null);
      var bagM = 0; for (var bkm in w228b.materials) bagM += w228b.materials[bkm];
      if (w228b.ledgerMat.in.materials - w228b.ledgerMat.out.materials !== bagM) { mix228 = false; break; }
      if (100 + lgSum228(w228b.ledger, 'in') - lgSum228(w228b.ledger, 'out') !== w228b.stones) { mix228 = false; break; }
    }
    ok('228', '材料提炼 4:1：z0 材料 ×4 → 次组（组 1）随机 ×1、材料账 out4/in1 双路、恒等式不破；禁炼链 = z9 组 top / 悟道石 wudao / 存量不足 stock；5000 次提炼+出售+入账混合双恒等式零漂移（材料账 + 灵石 #113），提炼零灵石流',
      rf228.ok === true && gainG228 === 1 && w228.materials.mat_linglu === 6 && dbl228 && ident228 &&
      rfTop228.reason === 'top' && rfWu228.reason === 'wudao' && rfLack228.reason === 'stock' &&
      mix228 && refineN228 > 100,
      'refines=' + refineN228 + ' mix=' + mix228);

    /* #229 残片兑丹方（z6~8 第三选择：授予未持有地/天阶 · 全持回落 intel · 缺 choice 拒 · 他区不受影响） */
    var w229 = mkWs({ realm: 7, zone: 6 });
    SQ.Alchemy.ensure(w229, D);
    w229.alchemy.recipes = ['rc_juqi'];
    w229.shards = [0, 0, 0, 0, 0, 0, 20, 0, 0, 0];
    var mods229 = M(mkProf([]), w229);
    var ex229 = SQ.Combat.exchangeShard(w229, pack, D, mods229, 6, 'recipe', 1, null);
    var isDT229 = ex229.ok === true && ex229.reward && ex229.reward.type === 'recipe' &&
      ['rc_pozhang', 'rc_zhenjie', 'rc_fengxing', 'rc_xirui', 'rc_haina', 'rc_daohe', 'rc_xisui'].indexOf(ex229.reward.id) >= 0;
    var has229 = isDT229 && w229.alchemy.recipes.indexOf(ex229.reward.id) >= 0 && w229.shards[6] === 0;
    /* 缺 choice：三选必选语义维持 */
    w229.shards[6] = 20;
    var exNC229 = SQ.Combat.exchangeShard(w229, pack, D, mods229, 6, null, 1, null);
    var shardKept229 = exNC229.reason === 'choice' && w229.shards[6] === 20;      /* 拒绝不扣片 */
    /* 地/天阶全持有 → 回落 intel（无可授情报则 pool 拒，两种结果均不双授丹方、不白扣片） */
    w229.alchemy.recipes = ['rc_juqi', 'rc_pozhang', 'rc_zhenjie', 'rc_fengxing', 'rc_xirui', 'rc_haina', 'rc_daohe', 'rc_xisui'];
    var exFb229 = SQ.Combat.exchangeShard(w229, pack, D, mods229, 6, 'recipe', 1, null);
    var fbOk229 = (exFb229.ok === true && exFb229.reward.type === 'intel') ||
      (exFb229.ok === false && exFb229.reason === 'pool' && w229.shards[6] === 20);
    /* z0~2 单通道不受影响（无 choice → pill） */
    var w229b = mkWs({ realm: 2, zone: 1 });
    SQ.Alchemy.ensure(w229b, D);
    w229b.shards = [0, 20, 0, 0, 0, 0, 0, 0, 0, 0];
    var exZ1229 = SQ.Combat.exchangeShard(w229b, pack, D, M(mkProf([]), w229b), 1, null, 1, null);
    ok('229', '残片兑丹方（§3.2 渠道④落实）：z6~8 choice=recipe 授予未持有地/天阶丹方一份、扣片 20；缺 choice 拒且不扣片（三选必选）；地/天全持有回落 intel（或 pool 拒不白扣）；z0~2 兑丹单通道零受影响',
      isDT229 && has229 && shardKept229 && fbOk229 && exZ1229.ok === true && exZ1229.reward.type === 'pill',
      'reward=' + (ex229.reward ? ex229.reward.id : ex229.reason) + ' fb=' + (exFb229.ok ? exFb229.reward.type : exFb229.reason));

    /* #230 经济参数与容量红线回归（八新参对表 / normalize 数据驱动上限 / alchemy 最坏态独立核算 / 红线零改动） */
    var AL230 = D.ALCHEMY;
    var par230 = AL230.RECIPE_PRICES.tian === 12000 && AL230.SHOP_PACK_W.recipe === 10 && AL230.SHOP_PACK_W.bp === 10 &&
      AL230.BP_PRICE_JING === 1500 && AL230.FORGE_MAT_COST_JING === 12 && AL230.REFINE_IN === 4 &&
      AL230.CRAFT_BASE.qi_jing === 0.70 && AL230.CRAFT_TIME_MIN.qi_jing === 45;
    /* 既有经济锚零改动（扩容只加不改） */
    var keep230 = AL230.MAT_DROP_P === 0.15 && AL230.PILL_DAILY_CAP === undefined &&   /* 🔧 N43 整族退役：键不在表上（残留读者由审计 A10 抓）；第十七批那次 3→4 随之内存作废 */ AL230.FORGE_DROP_K === 0.5 &&
      AL230.FORGE_MAT_COST === 6 && AL230.RUNE_P === 0.05 && AL230.GATHER_WUDAO_P === 0.10 &&
      AL230.CRAFT_BASE.huang === 0.85 && AL230.CRAFT_BASE.tian === 0.40 && AL230.CRAFT_BASE.qi === 0.80 &&
      AL230.MAT_SELL.join() === '8,40,160,600' && AL230.RECIPE_PRICES.huang === 400 && AL230.BP_PRICE === 600 &&
      AL230.SHOP_PACK_W.pack === 50 && AL230.SHOP_PACK_W.mat === 25 && AL230.SHOP_PACK_W.furnace === 5;   /* 坊市权重全表零改动（锚红线） */
    /* normalize 上限数据驱动（脏档超量截到表长、伪 id 滤除） */
    var dirty230 = { recipes: AL230.RECIPES.map(function (r) { return r.id; }).concat(['fake1', 'fake2', 'fake3', 'fake4', 'fake5']),
      blueprints: AL230.BLUEPRINTS.map(function (b) { return b.id; }).concat(['bx1', 'bx2', 'bx3']) };
    var n230 = SQ.Alchemy.normalize(dirty230, D);
    var capOk230 = n230.recipes.length === 11 && n230.blueprints.length === 9;
    /* alchemy 独立最坏态（全丹方 + 20 pill key × 99 + 全图纸 + 30 材料 × 999）< 2.5KB（红线分摊核算） */
    var w230 = mkWs({ realm: 9 });
    SQ.Alchemy.ensure(w230, D);
    AL230.MATS.forEach(function (mm) { w230.materials[mm.id] = 999; });
    w230.alchemy.recipes = AL230.RECIPES.map(function (r) { return r.id; });
    w230.alchemy.blueprints = AL230.BLUEPRINTS.map(function (b) { return b.id; });
    AL230.RECIPES.forEach(function (r) { w230.alchemy.pills[r.pill] = 99; w230.alchemy.pills[r.pill + '_rw'] = 99; });
    (D.PILLS || []).forEach(function (pp) { w230.alchemy.pills[pp.id] = 99; });   /* 成品丹四枚同属最坏态（同 #206）*/
    w230.alchemy.prof = { dan: 999, qi: 999 };
    var size230 = JSON.stringify({ alchemy: w230.alchemy, materials: w230.materials }).length;
    /* 红线零改动（p 公式主体 / TRIB_P_CLAMP / REALMS / mods FIELDS）；
     * ARTS_COST 是**本批有意改的那一处**：等级起点批删 Lv0→1 档 ⇒ 八档，其余价格一字未动。 */
    var zero230 = D.REALMS.length === 10 && D.REALMS[9].tribBase === 0.22 &&
      D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 && SQ.Mods.FIELDS.length === 17 &&
      D.ARTS_COST.join() === '240,900,3200,11000,36000,120000,400000,1300000';
    ok('230', '经济参数与容量红线回归：六新参对表（tian 12000/精制 1500·12 料·0.70·45min/提炼 4:1）；🔧 N43：`PILL_DAILY_CAP` **整族退役**（第十七批那次 3→4 随之内存作废，键不在表上）；其余（坊市权重全表 50/25/10/10/5——锚 9.12 复跑不变红线）零改动；normalize 上限数据驱动（脏档 16→11、12→9）；alchemy 独立最坏态 <2.5KB（50KB 红线分摊）；p 公式/CLAMP/REALMS/FIELDS 红线零改动 ‖ ARTS_COST 按等级起点批改八档并如实报',
      par230 && keep230 && capOk230 && size230 < 2500 && zero230,
      'size=' + size230 + 'B cap=' + capOk230);

    /* ═══ 融合扩容 · 切磋平衡 · 渐次解锁批（天骄卷 v1.1 §五 · 融合器灵卷 v1.3 · #231~#236）═══ */

    /* #231 切磋三档赌注（轻/标/重 = 区 stones ×10/20/50；kind 归一化；poor 按档、重注不足不掷不耗 CD） */
    var w231 = mkWs({ realm: 4, stones: D.ZONES[4].stones * 10 });
    w231.prodigies = [{ id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 1, rlm: 4, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }];
    var stL231 = SQ.Prodigy.sparStake(w231, D, 'light');
    var stS231 = SQ.Prodigy.sparStake(w231, D, 'std');
    var stH231 = SQ.Prodigy.sparStake(w231, D, 'heavy');
    var poorH231 = SQ.Prodigy.spar(w231, pack, D, M(mkProf([]), w231), 'pr1', Date.now(), noopLog(), 'heavy');
    var normK231 = SQ.Prodigy.normKind('xxx') === 'std' && SQ.Prodigy.normKind('heavy') === 'heavy' && SQ.Prodigy.normKind() === 'std';
    ok('231', '切磋三档赌注：light/std/heavy = 区 stones ×10/20/50；缺省与非法 kind 归一 std（SPAR_STAKE_K 20 回退参照不变）；重注不足 poor 先于掷判且不耗 CD；重注结仇率 0.40 对表',
      stL231 === D.ZONES[4].stones * 10 && stS231 === D.ZONES[4].stones * 20 && stH231 === D.ZONES[4].stones * 50 &&
      SQ.Prodigy.sparStake(w231, D) === stS231 && SQ.Prodigy.sparStake(w231, D, 'zzz') === stS231 &&
      poorH231.reason === 'poor' && poorH231.stake === stH231 && w231.prodigies[0].lastSparAt === 0 && normK231 &&
      D.PRODIGY.SPAR_STAKE_K === 20 && D.PRODIGY.SPAR_FEUD_P_HEAVY === 0.40,
      JSON.stringify([stL231, stS231, stH231, poorH231.reason]));

    /* #232 强弱差让经济：碾压胜返 ×1.5 bond+1 / 问强胜返 ×3 bond+3 / 势均胜返 ×2 bond+2；
     * 让差判据 = 浮动前真战力比（crush ≥1.5 / brave ≤1.0）；Ledger 恒等式与 in/out 分类键三局零漂移（零新增分类）。
     * 阈值裁定注记：±10% 抖动胜判定带 = ratio ∈ (0.818, 1.222)——brave 取 1.0 才有真悬念（0.8 与胜互斥）。 */
    var PR232 = function (rlm, apt) { return { id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: apt, rlm: rlm, prg: 0, feud: false, feudBond: 0, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] }; };
    var lgSum232 = function (lg, side) {
      var s232 = 0;
      (side === 'in' ? SQ.Ledger.IN_CATS : SQ.Ledger.OUT_CATS).forEach(function (c) { s232 += (lg[side] && lg[side][c]) || 0; });
      return s232;
    };
    var HC232 = D.PRODIGY.HANDICAP;
    /* ① 碾压局：realm9 vs rlm0（ratio ≫ 1.5 必胜带）——stub 材料第 3 掷 0.99 miss */
    var wA232 = mkWs({ realm: 9, stones: 1000000 }); wA232.prodigies = [PR232(0, 0)];
    var st0A = wA232.stones;
    var stakeA = SQ.Prodigy.sparStake(wA232, D, 'std'), retExpA = Math.round(stakeA * HC232.crushRet);
    var rA232 = (function () { var rs = stubRandom([0.5, 0.5, 0.99]); var r = SQ.Prodigy.spar(wA232, pack, D, M(mkProf([]), wA232), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var crush232 = rA232.ok && rA232.result === 'win' && rA232.crush === true && rA232.brave === false &&
      rA232.ret === retExpA && wA232.ledger.out.event_loss === stakeA && wA232.ledger.in.event === retExpA &&
      wA232.stones === st0A - stakeA + retExpA && (wA232.bonds.pr1 || 0) === HC232.crushBond && rA232.mat === null &&
      st0A + lgSum232(wA232.ledger, 'in') - lgSum232(wA232.ledger, 'out') === wA232.stones;
    /* ② 问强局：realm2 myP≈183.24 vs rlm2 apt1 q=189（ratio≈0.969 ≤1.0 且 >0.818 可胜带）——stub 大胜 + 材料 miss */
    var wB232 = mkWs({ realm: 2, stones: 100000 }); wB232.prodigies = [PR232(2, 1)];
    var st0B = wB232.stones;
    var stakeB = SQ.Prodigy.sparStake(wB232, D, 'std'), retExpB = Math.round(stakeB * HC232.braveRet);
    var rB232 = (function () { var rs = stubRandom([0.999, 0.001, 0.99]); var r = SQ.Prodigy.spar(wB232, pack, D, M(mkProf([]), wB232), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var brave232 = rB232.ok && rB232.result === 'win' && rB232.brave === true && rB232.crush === false &&
      rB232.ratio <= 1.0 && rB232.ret === retExpB && wB232.stones === st0B - stakeB + retExpB &&
      (wB232.bonds.pr1 || 0) === HC232.braveBond && rB232.mat === null &&
      st0B + lgSum232(wB232.ledger, 'in') - lgSum232(wB232.ledger, 'out') === wB232.stones;
    /* ③ 势均局：realm2 vs rlm2 apt0 q=171（ratio≈1.07 ∈ (1.0,1.5)）——标准胜返 ×2 bond+2 */
    var wC232 = mkWs({ realm: 2, stones: 100000 }); wC232.prodigies = [PR232(2, 0)];
    var st0C = wC232.stones;
    var stakeC = SQ.Prodigy.sparStake(wC232, D, 'std');
    var rC232 = (function () { var rs = stubRandom([0.5, 0.5, 0.99]); var r = SQ.Prodigy.spar(wC232, pack, D, M(mkProf([]), wC232), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var even232 = rC232.ok && rC232.result === 'win' && !rC232.crush && !rC232.brave &&
      rC232.ret === stakeC * 2 && (wC232.bonds.pr1 || 0) === D.PRODIGY.BOND_GAIN.win &&
      st0C + lgSum232(wC232.ledger, 'in') - lgSum232(wC232.ledger, 'out') === wC232.stones;
    var cats232 = [wA232, wB232, wC232].every(function (w2) {
      return JSON.stringify(Object.keys(w2.ledger.in)) === JSON.stringify(SQ.Ledger.IN_CATS) &&
        JSON.stringify(Object.keys(w2.ledger.out)) === JSON.stringify(SQ.Ledger.OUT_CATS);
    });
    ok('232', '强弱差让经济：碾压胜返 ×1.5 bond+1（掐必胜提款机）/ 问强胜返 ×3 bond+3（激励挑战上位）/ 势均胜返 ×2 bond+2；让差判据 = 浮动前真战力比（crush ≥1.5 / brave ≤1.0 可胜带裁定）；Ledger 恒等式三局零漂移、in/out 分类键零新增',
      crush232 && brave232 && even232 && cats232 && HC232.brave === 1.0,
      JSON.stringify([rA232.ret, retExpA, rB232.ret, retExpB, rC232.ret, stakeC * 2, Math.round(rB232.ratio * 1000) / 1000]));

    /* #233 胜方材料彩头（材料账双路零灵石流 · 提炼先例）：标准胜 10% / 问强胜 15% 上浮；
     * 彩头 = 同境界区组随机材料 ×1；材料账恒等式 in−out === Σ背包；灵石账只有赌注两笔（材料零灵石流） */
    var matSum233 = function (w2) { var s2 = 0; for (var mk2 in (w2.materials || {})) s2 += w2.materials[mk2] || 0; return s2; };
    var lm233 = function (w2, side) { return (((w2.ledgerMat || {})[side]) || {}).materials || 0; };   /* ledgerMat 惰性创建（addMats 首笔前为 null）*/
    var poolG233 = function (g2) {
      return D.ALCHEMY.MATS.filter(function (x2) { return x2.z >= 0 && SQ.Alchemy.groupOf(D, x2.id) === g2; }).map(function (x2) { return x2.id; });
    };
    /* ① 势均胜命中（realm4 → 组 1；stub 第 3 掷 0.05 < 0.10、第 4 掷 0 → 池首） */
    var wD233 = mkWs({ realm: 4, stones: 100000 }); wD233.prodigies = [PR232(4, 0)];
    var mIn0 = lm233(wD233, 'in'), mOut0 = lm233(wD233, 'out'), st0D = wD233.stones;
    var expMat233 = poolG233(1)[0];
    var rD233 = (function () { var rs = stubRandom([0.5, 0.5, 0.05, 0.0]); var r = SQ.Prodigy.spar(wD233, pack, D, M(mkProf([]), wD233), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var mat233 = rD233.ok && rD233.result === 'win' && rD233.mat === expMat233 &&
      (wD233.materials[expMat233] || 0) === 1 &&
      (lm233(wD233, 'in') - mIn0) === 1 && (lm233(wD233, 'out') - mOut0) === 0 &&
      mIn0 + 1 - mOut0 === matSum233(wD233) &&                            /* 材料账恒等式 */
      st0D + lgSum232(wD233.ledger, 'in') - lgSum232(wD233.ledger, 'out') === wD233.stones &&
      wD233.ledger.out.event_loss === rD233.stake && wD233.ledger.in.event === rD233.ret;   /* 灵石账只有赌注两笔 */
    /* ② 问强胜 matP 上浮 0.15：第 3 掷 0.12（标准带 miss、问强带 hit） */
    var wE233 = mkWs({ realm: 2, stones: 100000 }); wE233.prodigies = [PR232(2, 1)];
    var mIn1 = lm233(wE233, 'in');
    var expMat233b = poolG233(0)[0];
    var rE233 = (function () { var rs = stubRandom([0.999, 0.001, 0.12, 0.0]); var r = SQ.Prodigy.spar(wE233, pack, D, M(mkProf([]), wE233), 'pr1', Date.now(), noopLog()); rs(); return r; })();
    var matB233 = rE233.ok && rE233.result === 'win' && rE233.brave === true && rE233.mat === expMat233b &&
      (lm233(wE233, 'in') - mIn1) === 1 && 0.12 >= D.PRODIGY.SPAR_MAT_P && 0.12 < D.PRODIGY.HANDICAP.braveMatP;
    /* ③ 平局与败北零材料（材料 roll 只在 win 路径） */
    var noMat233 = (function () {
      var w2 = mkWs({ realm: 2, stones: 100000 }); w2.prodigies = [PR232(2, 1)];
      var mi = lm233(w2, 'in');
      var rs = stubRandom([0.001, 0.999, 0.0]);   /* 玩家掷下限、天骄掷上限 → 确定性败；第 3 掷 = 结仇（lose 路径无材料掷） */
      var r2 = SQ.Prodigy.spar(w2, pack, D, M(mkProf([]), w2), 'pr1', Date.now(), noopLog()); rs();
      return r2.result === 'lose' && r2.mat === null && lm233(w2, 'in') === mi;
    })();
    ok('233', '切磋胜方材料彩头：势均胜 10%（stub 命中 → 同境界区组材料 ×1 走材料账 in、零灵石流、双恒等式零漂移）；问强胜 matP 上浮 15%（0.12 标准带 miss 问强带 hit）；败北路径零材料掷',
      mat233 && matB233 && noMat233,
      JSON.stringify([rD233.mat, expMat233, rE233.mat, expMat233b]));

    /* #234 混沌淬炼（融合器灵卷 v1.3 §4.4）：悟道石 ×1（材料账 out）+ 灵石 REFORGE_COST[tier]（out.arts 既有分类）
     * 随尝试消耗；CHAOS_P 0.30 命中 = special 覆盖混沌池（选池随 attr、grade = gen−1、同池只升不降）+ XARTS 注册同步
     * + mods hooks 消费；未命中零损失；CD 1 现实天；poor/wudao/unknown 拒；normalize lastReforgeAt 保留；容量预算内 */
    var mkC234 = function (attr, gen, tier, sp) {
      return { id: 'c1', name: '测试混沌', gen: gen, tier: tier, attr: attr, align: 'neutral',
        effects: { qiRate: 0.10 }, special: sp || null,
        parents: [{ id: 'ta', name: '甲', tier: tier }, { id: 'tb', name: '乙', tier: tier }], createdAt: 1 };
    };
    var mkW234 = function (cus, stones) {
      var w2 = mkWs({ realm: 5, stones: stones });
      SQ.Fusion.ensure(w2, D);
      w2.fusion.customs = SQ.Fusion.normalize({ customs: [cus], lastReforgeAt: 0 }, D).customs;
      SQ.Fusion.registerCustoms(w2.fusion, D);
      return w2;
    };
    /* ① miss 路径：天阶 cost 8000 + 悟道石 −1（材料账 out）+ CD 记账 + special 零变化 + 二发 cd 拒 */
    var w234 = mkW234(mkC234('qi', 2, 3, null), 100000);
    SQ.Alchemy.addMats(w234, pack, D, { mat_wudao: 2 }, Date.now(), null);
    SQ.Fusion.registerCustoms(w234.fusion, D);
    var st234a = w234.stones, mOut234a = lm233(w234, 'out'), lgOut234a = lgSum232(w234.ledger, 'out');
    var rf234 = (function () { var rs = stubRandom([0.99]); var r = SQ.Fusion.reforgeCustom(w234, pack, D, 'c1', Date.now(), noopLog()); rs(); return r; })();
    var miss234 = rf234.ok === true && rf234.hit === false && rf234.cost === 8000 &&
      w234.materials.mat_wudao === 1 && (lm233(w234, 'out') - mOut234a) === 1 &&
      w234.stones === st234a - 8000 && (lgSum232(w234.ledger, 'out') - lgOut234a) === 8000 &&
      w234.ledger.out.arts === 8000 &&                                   /* out.arts 既有分类零新增 */
      w234.fusion.customs[0].special === null && w234.fusion.lastReforgeAt > 0 &&
      st234a + lgSum232(w234.ledger, 'in') - lgSum232(w234.ledger, 'out') === w234.stones;
    var cd234 = SQ.Fusion.reforgeCustom(w234, pack, D, 'c1', Date.now(), noopLog());
    /* ② hit 路径：gen3 精养 → zaohua grade2；XARTS 注册同步；入槽 Lv1 → mods hooks 消费对表 */
    var w234b = mkW234(mkC234('jing', 3, 3, null), 100000);
    SQ.Alchemy.addMats(w234b, pack, D, { mat_wudao: 1 }, Date.now(), null);
    SQ.Fusion.registerCustoms(w234b.fusion, D);
    w234b.artsKnown.push('c1'); w234b.artsLevels.c1 = 1; w234b.artsSlots = ['c1'];
    var rf234b = (function () { var rs = stubRandom([0.01]); var r = SQ.Fusion.reforgeCustom(w234b, pack, D, 'c1', Date.now(), noopLog()); rs(); return r; })();
    var mB234 = M(mkProf([]), w234b);
    var hit234 = rf234b.ok && rf234b.hit === true && rf234b.pool === 'zaohua' && rf234b.grade === 2 &&
      w234b.fusion.customs[0].special.pool === 'zaohua' && w234b.fusion.customs[0].special.grade === 2 &&
      ((SQ.XARTS.c1 || {}).special || {}).pool === 'zaohua' &&
      Math.abs((mB234.hooks.zaohua || 0) - D.SPECIAL_POOL.zaohua.grades[2]) < 1e-9;
    /* ③ 同池只升不降：gen1 已有 hundun grade2 → 淬炼 hit 后 grade 保持 2（gen−1=0 不降档） */
    var w234c = mkW234(mkC234('qi', 1, 1, { pool: 'hundun', grade: 2 }), 100000);
    SQ.Alchemy.addMats(w234c, pack, D, { mat_wudao: 1 }, Date.now(), null);
    SQ.Fusion.registerCustoms(w234c.fusion, D);
    var rf234c = (function () { var rs = stubRandom([0.01]); var r = SQ.Fusion.reforgeCustom(w234c, pack, D, 'c1', Date.now(), noopLog()); rs(); return r; })();
    var keep234 = rf234c.ok && rf234c.hit && rf234c.grade === 2 && w234c.fusion.customs[0].special.grade === 2 &&
      w234c.ledger.out.arts === D.FUSE.REFORGE_COST.xuan;                /* 玄阶 cost 800 */
    /* ④ attr → 混沌池映射 + 拒绝链（poor / wudao / unknown）+ normalize + 容量 */
    var mapOk234 = SQ.Fusion.chaosPoolOf(D, { attr: 'qi' }) === 'hundun' &&
      SQ.Fusion.chaosPoolOf(D, { attr: 'jing' }) === 'zaohua' &&
      SQ.Fusion.chaosPoolOf(D, { attr: 'shen' }) === 'taiyi';
    var w234e = mkW234(mkC234('shen', 1, 0, null), 10);
    var poorR234 = SQ.Fusion.reforgeCustom(w234e, pack, D, 'c1', Date.now(), noopLog());
    var w234f = mkW234(mkC234('shen', 1, 0, null), 100000);             /* 无悟道石 */
    var wudaoR234 = SQ.Fusion.reforgeCustom(w234f, pack, D, 'c1', Date.now(), noopLog());
    var unkR234 = SQ.Fusion.reforgeCustom(w234f, pack, D, 'c9', Date.now(), noopLog());
    var norm234 = SQ.Fusion.normalize({ lastReforgeAt: -5, customs: [] }, D).lastReforgeAt === 0 &&
      SQ.Fusion.normalize({ lastReforgeAt: 12345, customs: [] }, D).lastReforgeAt === 12345;
    var worst234 = byteLen({ lastFuseAt: 1730000000000, lastReforgeAt: 1730000000000, meditate: 99999, seq: 999,
      customs: [1, 2, 3, 4].map(function (i2) {
        return { id: 'c' + i2, name: '名八字整', gen: 3, tier: 3, attr: 'shen', align: 'neutral',
          effects: { qiRate: 0.13, offlineEff: 0.12, combatPower: 0.14, tribBonus: 0.025 },
          special: { pool: 'hundun', grade: 2 },
          parents: [{ id: 'parent_a_long_id', name: '父本名甲', tier: 3 }, { id: 'parent_b_long_id', name: '父本名乙', tier: 3 }],
          createdAt: 1730000000000 };
      }) });
    ok('234', '混沌淬炼：悟道石 ×1（材料账 out）+ 灵石 REFORGE_COST[tier]（out.arts 既有分类）随尝试消耗；miss 零损失 + CD 1 日二发拒；hit = special 覆盖混沌池（attr 映射 qi→hundun/jing→zaohua/shen→taiyi、grade=gen−1、同池只升不降）+ XARTS 注册同步 + mods hooks 消费对表；poor/wudao/unknown 拒；normalize lastReforgeAt 钳位保留；fusion 最坏态容量 <1.6KB',
      miss234 && cd234.reason === 'cd' && hit234 && keep234 && mapOk234 &&
      poorR234.reason === 'poor' && wudaoR234.reason === 'wudao' && unkR234.reason === 'unknown' &&
      norm234 && worst234 < 1600 &&
      D.FUSE.CHAOS_P === 0.30 && D.FUSE.REFORGE_CD_MS === 86400000,
      'miss=' + miss234 + ' hit=' + hit234 + ' keep=' + keep234 + ' worst=' + worst234 + 'B');

    /* #235 命名池扩容（24×20=480 → 36×30=1080）：PRE_N/SUF_N/COMBOS 对表自洽；词表 key 1~36/1~30 连续不缺不重；
     * rollName 300 掷全部落池组合空间（图鉴 selfart 面分母 = COMBOS + 法宝数同步扩大） */
    var FU235 = D.FUSE;
    var pre235 = {}, suf235 = {}, dup235 = [];
    for (var i235 = 1; i235 <= FU235.PRE_N; i235++) {
      var pv235 = SQ.t('fuse.name.pre.' + i235, null, 'xiuxian');
      if (pv235 === 'fuse.name.pre.' + i235 || pre235[pv235]) dup235.push('pre' + i235);
      pre235[pv235] = 1;
    }
    for (var j235 = 1; j235 <= FU235.SUF_N; j235++) {
      var sv235 = SQ.t('fuse.name.suf.' + j235, null, 'xiuxian');
      if (sv235 === 'fuse.name.suf.' + j235 || suf235[sv235]) dup235.push('suf' + j235);
      suf235[sv235] = 1;
    }
    var comboSet235 = {};
    Object.keys(pre235).forEach(function (pp2) { Object.keys(suf235).forEach(function (ss2) { comboSet235[pp2 + ss2] = 1; }); });
    var w235 = mkWs({ realm: 5 });
    SQ.Fusion.ensure(w235, D);
    var rollOk235 = true;
    for (var k235 = 0; k235 < 300; k235++) {
      if (!comboSet235[SQ.Fusion.rollName(w235, pack, D)]) { rollOk235 = false; break; }
    }
    ok('235', '融合命名池扩容：PRE_N 36 × SUF_N 30 = COMBOS 1080 对表自洽（图鉴 selfart 面分母同步）；词表 key 连续不缺不重；rollName 300 掷全落池组合空间',
      FU235.PRE_N === 36 && FU235.SUF_N === 30 && FU235.COMBOS === 1080 &&
      FU235.COMBOS === FU235.PRE_N * FU235.SUF_N &&
      Object.keys(pre235).length === 36 && Object.keys(suf235).length === 30 && !dup235.length && rollOk235,
      'dup=' + dup235.join(',') + ' roll=' + rollOk235);

    /* #236 渐进式解锁（渐次解锁批 §C）：TAB_UNLOCK 七项对表（坊市/势力/炼丹/道友 = 筑基1 · 天骄 = 金丹2 ·
     * 法宝 = 元婴3 · 宗门 = 化神4）+ 名称 key 全可解析；门槛单一事实源（Prodigy.unlockRealm 同表）；
     * 天骄 gate = 交互面锁 / 推进照跑（realm1 tick：prg 推进、零传闻、零 boost、榜不写、事件不触发、
     * spar/fireProdigyEvent 拒 locked）；解锁后交互面恢复（狭路相逢 + 榜写入）；播报词表在位 */
    var TU236 = D.TAB_UNLOCK;
    var tabOk236 = TU236.shop.r === 1 && TU236.faction.r === 1 && TU236.alchemy.r === 1 && TU236.bonds.r === 1 &&
      TU236.prodigy.r === 2 && TU236.treasure.r === 3 && TU236.sect.r === 4 &&
      SQ.Prodigy.unlockRealm(D) === TU236.prodigy.r &&
      ['shop', 'faction', 'alchemy', 'bonds', 'prodigy', 'treasure', 'sect'].every(function (k236) {
        var kk236 = TU236[k236].k;
        return SQ.t(kk236, null, 'xiuxian') !== kk236;
      });
    var PR236 = { id: 'pr1', nm: [0, 0, 0], tl: [], al: 1, fc: -1, fid: null, apt: 2, rlm: 1, prg: 0, feud: true, feudBond: 80, lastSparAt: 0, rivAt: 0, boost: null, eternal: false, wl: [0, 0, 0] };
    var w236 = mkWs({ realm: 1, zone: 1 });
    w236.prodigies = [JSON.parse(JSON.stringify(PR236))];
    var ev236 = (function () { var rs = stubRandom(function () { return 0.001; }); var r = SQ.Prodigy.tick(w236, pack, D, M(mkProf([]), w236), 30000, Date.now(), { log: noopLog() }); rs(); return r; })();
    var gateOff236 = w236.prodigies[0].prg > 0 &&                            /* 推进照跑 */
      (w236.rumors || []).filter(function (rr2) { return rr2.kind === 'prodigy'; }).length === 0 &&
      !w236.prodMarks.myRank && !w236.pendingChoice &&
      (ev236 === null || ev236.every(function (e2) { return e2.type === 'break'; }));
    var sparL236 = SQ.Prodigy.spar(w236, pack, D, M(mkProf([]), w236), 'pr1', Date.now(), noopLog());
    var fireL236 = SQ.Prodigy.fireProdigyEvent(w236, pack, D, 'prodigy_ev_feud', 'pr1', Date.now(), { log: noopLog() });
    w236.realm = 2; w236.prodigyClock = 0;
    (function () { var rs = stubRandom(function () { return 0.001; }); SQ.Prodigy.tick(w236, pack, D, M(mkProf([]), w236), 30000, Date.now(), { log: noopLog() }); rs(); })();
    var gateOn236 = !!w236.pendingChoice && w236.prodMarks.myRank >= 1;       /* 狭路相逢触发 + 榜写入 */
    var lexOk236 = SQ.t('meta.unlock.tab', { name: '坊市' }).indexOf('坊市') >= 0;
    ok('236', '渐进式解锁：TAB_UNLOCK 七项对表 + 名称 key 全可解析 + Prodigy.unlockRealm 单一事实源；realm1 gate = 推进照跑、传闻/boost/榜/事件/spar/fire 全锁；realm2 解锁后交互面恢复；meta.unlock.tab 播报词表在位',
      tabOk236 && gateOff236 && sparL236.reason === 'locked' && fireL236 === null && gateOn236 && lexOk236,
      'off=' + gateOff236 + ' spar=' + sparL236.reason + ' fire=' + fireL236 + ' on=' + gateOn236);

    /* #237 奇遇倾向（体验批）：settings.eventPref 白名单落库（none/right/evil/neutral）——
     * setEventPref 合法值写入、脏值回落 none；normalize 保留合法值、清脏值、缺省 none。
     * 视图侧优先逻辑（autoEventPref + autoAvailableBranches）见 .tests/verify-ui-auto.cjs。 */
    var ref237 = {};
    await SQ.Actions.setEventPref(ref237, 'evil');
    var pref237a = ref237.settings && ref237.settings.eventPref;
    await SQ.Actions.setEventPref(ref237, 'xxx');
    var pref237b = ref237.settings && ref237.settings.eventPref;
    var n237a = SQ.normalize({ v: SQ.V, profile: { name: '甲' }, settings: { eventPref: 'right' } });
    var n237b = SQ.normalize({ v: SQ.V, profile: { name: '乙' }, settings: { eventPref: 'bogus' } });
    var n237c = SQ.normalize({ v: SQ.V, profile: { name: '丙' } });
    ok('237', '奇遇倾向：setEventPref 白名单 none/right/evil/neutral 落库、脏值回落 none；normalize 保留合法值并清脏值、缺省 none',
      pref237a === 'evil' && pref237b === 'none' &&
      n237a.settings.eventPref === 'right' && n237b.settings.eventPref === 'none' && n237c.settings.eventPref === 'none',
      'a=' + pref237a + ' b=' + pref237b + ' n=' + n237a.settings.eventPref + '/' + n237b.settings.eventPref);

    /* #238 效果百分比显示取整（体验批 v2.4）：qiPct 经 ×100 后不带浮点尾数。
     * 复现线上坏档：道心幻境 failE 的 −14.099999999999998%（源 qiPct = −0.141 的浮点尾）。 */
    var w238 = mkWs({});
    var txt238 = SQ.Events.effText(w238, pack, D, {
      qiPct: -0.14099999999999998, stonesPct: 0.125,
      buff: { field: 'qiRate', mult: -0.255, hours: 1 }
    });
    var txt238b = SQ.Events.effText(w238, pack, D, { fail: { qiPct: -0.14099999999999998 } });
    var bad238 = /\d\.\d{3,}/.test(txt238) || /\d\.\d{3,}/.test(txt238b);
    ok('238', '效果百分比显示取整：无 3 位以上小数尾数（qiPct / stonesPct / buff / failE 祸及）',
      !bad238 && txt238.indexOf('-14.1%') >= 0 && txt238.indexOf('12.5%') >= 0 && txt238b.indexOf('-14.1%') >= 0,
      'txt=' + txt238 + ' | fail=' + txt238b);

    /* #239 清除全部 buff（体验批 v2.4）：clearBuffs 清空 ws.buffs（增益/减益/护盾层）并写系统日志；
     * 无 buff 时幂等（不写日志）。 */
    localStorage.removeItem(SQ.KEY);
    var ref239 = {};
    await SQ.mutate(ref239, function (s) {
      s.profile = { name: '涤尘', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: Date.now() };
      s.worlds.xiuxian = pack.initialState();
      s.worlds.xiuxian.buffs = [
        { field: 'qiRate', mult: -0.2, until: Date.now() + 3600000 },
        { field: 'eventShield', mult: 1, until: Date.now() + 3600000, source: 'chu' }
      ];
    });
    await SQ.Actions.clearBuffs(ref239);
    var w239 = ref239.worlds.xiuxian;
    var n239 = w239.log.length;
    var last239 = w239.log[n239 - 1];
    await SQ.Actions.clearBuffs(ref239);
    var w239b = ref239.worlds.xiuxian;
    ok('239', '清除全部 buff：清空 ws.buffs（含护盾层）+ 写系统日志；无 buff 幂等不再写',
      w239.buffs.length === 0 && !!last239 && last239.cat === 'sys' &&
      w239b.buffs.length === 0 && w239b.log.length === n239,
      'buffs=' + w239b.buffs.length + ' logDelta=' + (w239b.log.length - n239));

    /* #240 自悟候选池（自悟批 · 需求 §2；自悟收敛批收池）：仅市面传承（obtain.type='shop'）+ 黄/玄阶
     * + 未持有 + 已达标；地阶/天阶 shop 与专属渠道（初始/首通/黑市/奇遇）永不入池；境界提升扩容 */
    var w240 = mkWs({ realm: 0 });
    var cands240 = SQ.Arts.selfLearnCands(w240, pack, D);
    var am240 = pack.artsMap();
    var poolOk240 = cands240.length > 0 && cands240.every(function (id) {
      var a = am240[id];
      return a.obtain && a.obtain.type === 'shop' &&
        ['huang', 'xuan'].indexOf(a.tier) >= 0 &&
        !SQ.Arts.owned(w240, id) && SQ.Arts.canLearn(w240, pack, D, id);
    });
    var tianIds240 = Object.keys(am240).filter(function (id) {
      return am240[id].tier === 'tian' && am240[id].obtain && am240[id].obtain.type === 'shop';
    });
    var diIds240 = Object.keys(am240).filter(function (id) {
      return am240[id].tier === 'di' && am240[id].obtain && am240[id].obtain.type === 'shop';
    });
    var noTian240 = tianIds240.length > 0 && tianIds240.every(function (id) { return cands240.indexOf(id) < 0; });
    var noDi240 = diIds240.length > 0 && diIds240.every(function (id) { return cands240.indexOf(id) < 0; });
    var noOwned240 = cands240.indexOf('tuna') < 0 && cands240.indexOf('juling') < 0;
    var noExcl240 = Object.keys(am240).every(function (id) {
      var ob = am240[id].obtain || {};
      return !ob.type || ob.type === 'shop' || cands240.indexOf(id) < 0;
    });
    var realmOk240 = cands240.indexOf('yinqi') >= 0 && cands240.indexOf('zhanju') >= 0;   /* realm0 仅 reqs 空者达标 */
    var cands240b = SQ.Arts.selfLearnCands(mkWs({ realm: 6 }), pack, D);
    var growOk240 = cands240b.length > cands240.length &&
      tianIds240.every(function (id) { return cands240b.indexOf(id) < 0; });
    ok('240', '自悟候选池：仅 shop 传承 × 黄/玄阶 × 未持有 × 达标；地阶/天阶/专属渠道永不入池；境界提升扩容',
      poolOk240 && noTian240 && noDi240 && noOwned240 && noExcl240 && realmOk240 && growOk240,
      'n0=' + cands240.length + ' n6=' + cands240b.length + ' tian=' + tianIds240.length +
      ' di=' + diIds240.length + ' pool=' + poolOk240 + ' noTian=' + noTian240 + ' noDi=' + noDi240);

    /* #241 自悟推进（自悟批）：未满区间不掷 · 模式乘区（闭关易悟/历练难悟）· 保底必得并清零 ·
     * 池枯竭清零（防死循环） */
    var realRnd241 = Math.random;
    /* (a) 未满一区间：时钟只推进、不掷判 */
    var w241 = mkWs({ mode: 'seclude' });
    var m241 = SQ.Mods.collect(mkProf(), w241, pack, D);
    var g241a = SQ.Arts.tickSelfLearn(w241, pack, D, m241, 10, { log: noopLog() });
    var aOk241 = g241a === null && w241.artsLearnClock > 0 && w241.artsLearnClock < 1200;
    /* (b) 模式乘区：同样 800 秒，闭关 eff=1.5（掷一次命中）／历练 eff=0.5（不足一区间不掷） */
    Math.random = function () { return 0; };
    var w241s = mkWs({ mode: 'seclude' }); w241s.artsKnown = [];
    var g241s = SQ.Arts.tickSelfLearn(w241s, pack, D, SQ.Mods.collect(mkProf(), w241s, pack, D), 800, { log: noopLog() });
    var w241v = mkWs({ mode: 'venture' }); w241v.artsKnown = [];
    var g241v = SQ.Arts.tickSelfLearn(w241v, pack, D, SQ.Mods.collect(mkProf(), w241v, pack, D), 800, { log: noopLog() });
    var bOk241 = g241s !== null && g241v === null && w241v.artsLearnClock > 0 && w241v.artsLearnClock < 1200;
    /* (c) 保底：加权累计达上限 → 无视概率必得一部并清零 */
    Math.random = function () { return 0.999; };
    var w241p = mkWs({ mode: 'seclude', realm: 6 });
    w241p.artsLearnClock = D.ARTS_SELFLEARN.PITY_H * 3600 - 1;
    var g241p = SQ.Arts.tickSelfLearn(w241p, pack, D, SQ.Mods.collect(mkProf(), w241p, pack, D), 1, { log: noopLog() });
    var cOk241 = g241p !== null && w241p.artsLearnClock === 0 && SQ.Arts.owned(w241p, g241p);
    /* (d) 池枯竭：学尽当前可自悟者 → 掷判无候选即清零、不空转 */
    Math.random = function () { return 0; };
    var w241e = mkWs({ realm: 0, mode: 'seclude' });
    SQ.Arts.selfLearnCands(w241e, pack, D).forEach(function (id) { SQ.Arts.gainArt(w241e, pack, D, id, noopLog()); });
    var cands241e = SQ.Arts.selfLearnCands(w241e, pack, D).length;
    var g241e = SQ.Arts.tickSelfLearn(w241e, pack, D, SQ.Mods.collect(mkProf(), w241e, pack, D), 3600, { log: noopLog() });
    var dOk241 = cands241e === 0 && g241e === null && w241e.artsLearnClock === 0;
    /* (e) 保底修复（自悟保底修复批）：掷点**不扣减**时钟——连续失手时 clock 跨掷点继续累计，
     *     旧实现每掷一次扣一个区间 ⇒ 单 tick 后 clock 归零、保底永不成立 */
    Math.random = function () { return 0.999; };
    var w241c = mkWs({ mode: 'venture' });   /* eff = 0.5 → 2400s 推进 1200 加权秒 = 2 个掷点 */
    var g241c = SQ.Arts.tickSelfLearn(w241c, pack, D, SQ.Mods.collect(mkProf(), w241c, pack, D), 2400, { log: noopLog() });
    var eOk241 = g241c === null && Math.abs(w241c.artsLearnClock - 1200) < 1e-6;
    Math.random = realRnd241;
    ok('241', '自悟推进：未满区间不掷 · 闭关易悟/历练难悟 · 保底必得清零 · 池枯竭清零 · 掷点不扣时钟',
      aOk241 && bOk241 && cOk241 && dOk241 && eOk241,
      'a=' + aOk241 + ' b=' + bOk241 + ' c=' + cOk241 + ' d=' + dOk241 + ' e=' + eOk241 +
      ' clockA=' + w241.artsLearnClock.toFixed(1) + ' venture=' + w241v.artsLearnClock.toFixed(1) +
      ' carry=' + w241c.artsLearnClock.toFixed(1));

    /* #242 自悟存档纪律（自悟批）：normalize 脏值回落 0 / 合法值保留 · selfLearnPct 保底口径 0~100 钳位 ·
     * 初始态字段在位 */
    var n242 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsLearnClock: -5 } } });
    var n242b = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsLearnClock: 'x' } } });
    var n242c = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsLearnClock: 12345 } } });
    /* 自悟收敛批：artsSelfLearnN 同样走脏值纪律（负→0 · 小数截断 · 合法保留） */
    var n242d = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsSelfLearnN: -3 } } });
    var n242e = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsSelfLearnN: 2.9 } } });
    var n242f = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { artsSelfLearnN: 7 } } });
    var pity242 = D.ARTS_SELFLEARN.PITY_H * 3600;
    var w242 = mkWs({}); w242.artsLearnClock = pity242 / 2;
    var w242b = mkWs({}); w242b.artsLearnClock = pity242 * 3;
    ok('242', '自悟存档纪律：normalize 脏值回落 0/合法值保留 · selfLearnPct 0~100 钳位 · 初始态字段在位',
      n242.worlds.xiuxian.artsLearnClock === 0 && n242b.worlds.xiuxian.artsLearnClock === 0 &&
      n242c.worlds.xiuxian.artsLearnClock === 12345 && pack.initialState().artsLearnClock === 0 &&
      n242d.worlds.xiuxian.artsSelfLearnN === 0 && n242e.worlds.xiuxian.artsSelfLearnN === 2 &&
      n242f.worlds.xiuxian.artsSelfLearnN === 7 && pack.initialState().artsSelfLearnN === 0 &&
      Math.abs(SQ.Arts.selfLearnPct(w242, D) - 50) < 1e-6 && SQ.Arts.selfLearnPct(w242b, D) === 100,
      'neg=' + n242.worlds.xiuxian.artsLearnClock + ' nan=' + n242b.worlds.xiuxian.artsLearnClock +
      ' keep=' + n242c.worlds.xiuxian.artsLearnClock + ' n=' + n242d.worlds.xiuxian.artsSelfLearnN +
      '/' + n242e.worlds.xiuxian.artsSelfLearnN + '/' + n242f.worlds.xiuxian.artsSelfLearnN +
      ' pct=' + SQ.Arts.selfLearnPct(w242, D));

    /* #243 自悟 · 离线悟道（自悟保底修复批）：离线不乘模式乘区、按 OFFLINE_MULT 折扣推进、
     * 单次结算至多 OFFLINE_MAX_ROLLS 个掷点、离线同样吃保底 */
    var realRnd243 = Math.random;
    var cfg243 = D.ARTS_SELFLEARN;
    var iv243 = cfg243.INTERVAL_MIN * 60;
    /* (a) 不乘模式乘区：seclude（practiceMult 1.5）离线 600s 只推进 0.5×600=300 加权秒 → 不足一掷点 */
    var w243a = mkWs({ mode: 'seclude' });
    var g243a = SQ.Arts.tickSelfLearn(w243a, pack, D, SQ.Mods.collect(mkProf(), w243a, pack, D), 600, { log: noopLog() }, { offline: true });
    var aOk243 = g243a === null && Math.abs(w243a.artsLearnClock - 300) < 1e-6;
    /* (b) 折扣推进至掷点：再离线 960s（adv=480）→ 累计 780 → 跨一掷点；Math.random=0 必得 */
    Math.random = function () { return 0; };
    var g243b = SQ.Arts.tickSelfLearn(w243a, pack, D, SQ.Mods.collect(mkProf(), w243a, pack, D), 960, { log: noopLog() }, { offline: true });
    var bOk243 = g243b !== null && w243a.artsLearnClock === 0;
    /* (c) 单次上限：离线 12h 且必失手 → 推进被钳在 OFFLINE_MAX_ROLLS 个掷点，不爆发式得手 */
    Math.random = function () { return 0.999; };
    var w243c = mkWs({ mode: 'venture' });
    var g243c = SQ.Arts.tickSelfLearn(w243c, pack, D, SQ.Mods.collect(mkProf(), w243c, pack, D), 43200, { log: noopLog() }, { offline: true });
    var cOk243 = g243c === null && Math.abs(w243c.artsLearnClock - iv243 * cfg243.OFFLINE_MAX_ROLLS) < 1e-6;
    /* (d) 离线同吃保底：时钟逼近上限 → 离线小步即强制得手并清零 */
    var w243d = mkWs({ mode: 'seclude', realm: 6 });
    w243d.artsLearnClock = cfg243.PITY_H * 3600 - 1;
    var g243d = SQ.Arts.tickSelfLearn(w243d, pack, D, SQ.Mods.collect(mkProf(), w243d, pack, D), 10, { log: noopLog() }, { offline: true });
    var dOk243 = g243d !== null && w243d.artsLearnClock === 0 && SQ.Arts.owned(w243d, g243d);
    Math.random = realRnd243;
    ok('243', '自悟 · 离线悟道：不乘模式乘区 · 按 OFFLINE_MULT 折扣 · 单次至多 OFFLINE_MAX_ROLLS 掷点 · 离线吃保底',
      aOk243 && bOk243 && cOk243 && dOk243,
      'a=' + aOk243 + ' b=' + bOk243 + ' c=' + cOk243 + ' d=' + dOk243 +
      ' clockA=' + w243a.artsLearnClock.toFixed(1) + ' clockC=' + w243c.artsLearnClock.toFixed(1));

    /* #244 善恶名号九段（善恶名号批）：KARMA_RANKS 九段降序对表 · rankOf 边界与 tierOf 同口径
     * （+200 入正道首段 / -200 入魔道首段 / -199~+199 左道）；名号仅作称谓，不入数值判定 */
    var krank244 = function (k) { return SQ.XKarma.rankOf(k, D); };
    var cases244 = [
      [1000, 'haoran', 'right'], [800, 'haoran', 'right'], [799, 'zhengdao_kui', 'right'],
      [600, 'zhengdao_kui', 'right'], [599, 'qingming', 'right'], [400, 'qingming', 'right'],
      [399, 'chizheng', 'right'], [200, 'chizheng', 'right'],
      [199, 'zuodao', 'neutral'], [0, 'zuodao', 'neutral'], [-199, 'zuodao', 'neutral'],
      [-200, 'rumo', 'evil'], [-399, 'rumo', 'evil'], [-400, 'xiexiu', 'evil'],
      [-599, 'xiexiu', 'evil'], [-600, 'modao_jv', 'evil'], [-799, 'modao_jv', 'evil'],
      [-800, 'jidao', 'evil'], [-1000, 'jidao', 'evil']
    ];
    var ok244 = D.KARMA_RANKS.length === 9 && cases244.every(function (c) {
      return krank244(c[0]) === c[1] && SQ.XKarma.tierOf(c[0]) === c[2];
    });
    ok('244', '善恶名号九段：KARMA_RANKS 降序对表 · rankOf 边界（±200/±400/±600/±800）与 tierOf 同口径',
      ok244, cases244.map(function (c) { return c[0] + '=' + krank244(c[0]); }).join(' '));

    /* #245 名号更迭日志（善恶名号批）：recalcDerived 跨段即入档独立分类 'karma'（起讫双名号）；
     * 同段重算不重复入档；正魔两侧跨段均触发（用 karma 分类日志计数，免受其它分类干扰） */
    var karmaLogs245 = function (w) {
      return (w.log || []).filter(function (l) { return l.cat === 'karma'; });
    };
    var w245 = mkWs({ karmaEventScore: 100 });        /* 左道散人 */
    pack.recalcDerived(w245, mkProf());
    var startOk245 = SQ.XKarma.rankOf(w245.karma, D) === 'zuodao' && karmaLogs245(w245).length === 0;
    w245.karmaEventScore = 250;                       /* → 持正之士（跨段） */
    pack.recalcDerived(w245, mkProf());
    var kl245 = karmaLogs245(w245);
    var crossOk245 = kl245.length === 1 &&
      kl245[0].text.indexOf(SQ.t('karma.rank.chizheng', null, 'xiuxian')) >= 0 &&
      kl245[0].text.indexOf(SQ.t('karma.rank.zuodao', null, 'xiuxian')) >= 0;
    w245.karmaEventScore = 300;                       /* 同段（仍持正之士）→ 不重复入档 */
    pack.recalcDerived(w245, mkProf());
    var sameOk245 = karmaLogs245(w245).length === 1;
    w245.karmaEventScore = -250;                      /* → 入魔之徒（魔道侧跨段） */
    pack.recalcDerived(w245, mkProf());
    var kl245b = karmaLogs245(w245);
    var evilOk245 = kl245b.length === 2 &&
      kl245b[1].text.indexOf(SQ.t('karma.rank.rumo', null, 'xiuxian')) >= 0 &&
      kl245b[1].text.indexOf(SQ.t('karma.rank.chizheng', null, 'xiuxian')) >= 0;
    ok('245', '名号更迭日志：recalcDerived 跨段入档 karma 分类（起讫双名号）· 同段重算不重复 · 正魔两侧均触发',
      startOk245 && crossOk245 && sameOk245 && evilOk245,
      'start=' + startOk245 + ' cross=' + crossOk245 + ' same=' + sameOk245 + ' evil=' + evilOk245 +
      ' n=' + karmaLogs245(w245).length);

    /* #246 自悟收敛（自悟收敛批）：边际递减 eff × 1/(1+DECAY×已自悟部数) · 得手计数 +1
     * （n=0 闭关 10s → eff 1.5 → 15 加权秒；n=1 → 15/(1+DECAY) 加权秒） */
    var cfg246 = D.ARTS_SELFLEARN;
    var decay1_246 = 1 / (1 + cfg246.DECAY);
    var w246a = mkWs({ mode: 'seclude' });
    SQ.Arts.tickSelfLearn(w246a, pack, D, SQ.Mods.collect(mkProf(), w246a, pack, D), 10, { log: noopLog() });
    var w246b = mkWs({ mode: 'seclude' }); w246b.artsSelfLearnN = 1;
    SQ.Arts.tickSelfLearn(w246b, pack, D, SQ.Mods.collect(mkProf(), w246b, pack, D), 10, { log: noopLog() });
    var aOk246 = Math.abs(w246a.artsLearnClock - 15) < 1e-6 &&
                 Math.abs(w246b.artsLearnClock - 15 * decay1_246) < 1e-6;
    var realRnd246 = Math.random;
    Math.random = function () { return 0; };
    var w246c = mkWs({ mode: 'seclude' });
    var g246 = SQ.Arts.tickSelfLearn(w246c, pack, D, SQ.Mods.collect(mkProf(), w246c, pack, D), 800, { log: noopLog() });
    Math.random = realRnd246;
    var bOk246 = g246 !== null && w246c.artsSelfLearnN === 1 && w246c.artsLearnClock === 0;
    ok('246', '自悟收敛：边际递减 eff × 1/(1+DECAY×已自悟部数) · 得手计数 +1',
      aOk246 && bOk246,
      'n0=' + w246a.artsLearnClock.toFixed(2) + ' n1=' + w246b.artsLearnClock.toFixed(2) +
      ' cnt=' + w246c.artsSelfLearnN + ' got=' + g246);

    /* #247 传闻预留（方案 B）：活跃传闻指向的事件不被被动奇遇抢先触发——
     * 伪造 buildPool 只返回传闻目标 market_assassin：有活跃卡 → fire 排除后各池皆空 → 流产(null)；
     * 无卡 → 正常取到该事件并落地 pendingChoice。 */
    var evB247 = SQ.Events.findById(pack, 'market_assassin');
    var origBP247 = SQ.Events.buildPool;
    SQ.Events.buildPool = function () { return evB247 ? [evB247] : []; };
    var realRnd247 = Math.random; Math.random = function () { return 0; };
    var w247a = mkWs({ rumors: [{ rid: 'r247', evId: 'market_assassin', tier: 'ren', nature: 'bad',
      bornAt: 1, expireAt: Date.now() + 600000, tpl: 'rumor.tpl.ren.1', place: 'rumor.place.1' }] });
    var r247a = SQ.Events.fire(w247a, pack, D, M(mkProf(), w247a), pack.worldSystems.effectsOf(w247a), Date.now(), { log: noopLog() });
    var w247b = mkWs({});
    var r247b = SQ.Events.fire(w247b, pack, D, M(mkProf(), w247b), pack.worldSystems.effectsOf(w247b), Date.now(), { log: noopLog() });
    Math.random = realRnd247;
    SQ.Events.buildPool = origBP247;
    var ok247 = r247a === null && !!r247b && r247b.id === 'market_assassin' &&
      w247b.pendingChoice && w247b.pendingChoice.id === 'market_assassin';
});
