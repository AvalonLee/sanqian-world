/* .tests/smoke/04-mods-officer-domain.js — 冒烟断言 43 条（首 #166 ‖ 末 #201）
 * 由 smoke.js 的 run() 体逐字切出（原第 3289~4377 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：166 167 168 177 178 179 180 169 170 171 172 173 174 175 176 147 148 149 150 151 153 154 181 182 183 184 185 186 187 188 189 190 191 192 193 194 195 196 197 198 199 200 201
*/
window.SQSmoke.frag('04-mods-officer-domain', async function () {
    ok('166', 'yufeng 乘算合并 Π(v)：0.92×0.8=0.736 / 双功法 0.64',
      Math.abs(m166.hooks.yufeng - 0.736) < 1e-6 && Math.abs(m166b.hooks.yufeng - 0.64) < 1e-6,
      'talent+arts=' + m166.hooks.yufeng + ' two-arts=' + m166b.hooks.yufeng);

    /* #167 amplify 乘算型换算：yufeng 0.90 → 1+(0.9−1)×1.5 = 0.85（不得为 1.35）；加算型照常 ×1.5 */
    var savedTalents167 = SQ.TALENTS.common;
    SQ.TALENTS.common = {
      positive: [{ id: 'wy167', kind: 'positive', tier: 'rare', world: 'common', weight: 1, effects: { yufeng: 0.90, on_bottleneck_power: 0.05 } }],
      negative: [{ id: 'wn167', kind: 'negative', tier: 'common', world: 'common', weight: 1, effects: { qiRate: -0.1 } }]
    };
    var restore167 = stubRandom(function (i) { return i === 0 ? 0.1 : 0.5; });  /* 首掷落 1正1负（40%）档 */
    var roll167 = SQ.rollTalents('__t167');            /* 不存在的 worldId → 专属池空，只抽临时通用池 */
    restore167();
    SQ.TALENTS.common = savedTalents167;
    var pos167 = roll167.talents.filter(function (t) { return t.kind === 'positive'; })[0];
    ok('167', 'amplify：yufeng 0.90→0.85 乘算换算 / 加算型 ×1.5',
      roll167.combo.pos === 1 && roll167.combo.neg === 1 && !!pos167 && pos167.amplified === true &&
      Math.abs(pos167.effects.yufeng - 0.85) < 1e-9 &&
      Math.abs(pos167.effects.on_bottleneck_power - 0.075) < 1e-9,
      'yufeng=' + (pos167 && pos167.effects.yufeng) + ' bn=' + (pos167 && pos167.effects.on_bottleneck_power));

    /* #168 TALENT_SYNERGIES：双条同持才生效、单对幅度 ≤5%、来源 'synergy' 入 detail 明细 */
    var syn168 = D.TALENT_SYNERGIES || [];
    var synBudgetOk = syn168.length === 8 && syn168.every(function (s) {
      return Math.abs(s.value) <= 0.05 && SQ.Mods.FIELDS.indexOf(s.field) >= 0 && s.pair.length === 2;
    });
    function mkTalentId(id, effects) { var t = mkTalent(effects); t.id = id; return t; }
    var w168 = mkWs({});
    var mBoth = M(mkProf([mkTalentId('thunder_root', { tribBonus: 0.15 }), mkTalentId('survivor', { tribFailLossMod: -0.10 })]), w168);
    var mSingle = M(mkProf([mkTalentId('thunder_root', { tribBonus: 0.15 })]), w168);
    ok('168', '组合羁绊：8 对全在预算内、双持生效入 detail.synergy、单持不生效',
      synBudgetOk &&
      Math.abs(mBoth.sum.tribFailLossMod - (-0.10 - 0.04)) < 1e-9 &&
      Math.abs(mBoth.detail.tribFailLossMod.synergy - (-0.04)) < 1e-9 &&
      Math.abs(mSingle.sum.tribFailLossMod - 0) < 1e-9,
      'pairs=' + syn168.length + ' both=' + mBoth.sum.tribFailLossMod + ' single=' + mSingle.sum.tribFailLossMod);

    /* #177 战功记账（势力全录卷 §7.1 v1.2）：仅 joined='in' 且本方交战方时累积（combat.simulate 单点钩子）；
     * 终局阈值 = 10 + realm×2（探针实测校准，realm 取**结算瞬间**快照）；joined 旧值 'win'/'lose' normalize 映射 'in' */
    var w177 = mkWs({ realm: 2, zone: 0, mode: 'venture' });
    w177.zoneAffix = { affixId: 'lingchao', until: Date.now() + 86400000 };   /* 钉住词缀：击杀节奏确定（10 杀/600s） */
    w177.factionId = 'jianqi'; w177.factionRep = { jianqi: 0 };
    w177.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: null, joinedFid: null, merit: 0, result: null };
    var ctx177 = { log: noopLog(), now: Date.now() };
    SQ.Combat.simulate(w177, pack, D, M(mkProf(), w177), 600, ctx177);   /* 未入场：10 杀零战功 */
    var noMerit177 = (w177.factionWar.merit || 0) === 0 && w177.kills === 10;
    SQ.Factions.joinWar(w177, pack, D, M(mkProf(), w177), Date.now(), { log: noopLog() });
    SQ.Combat.simulate(w177, pack, D, M(mkProf(), w177), 600, ctx177);   /* 入场后：10 杀 ×1.0 = 10 战功 */
    var merit177 = w177.factionWar.merit === 10;
    var w177b = mkWs({ realm: 2, zone: 0 });
    w177b.zoneAffix = { affixId: 'lingchao', until: Date.now() + 86400000 };
    w177b.factionId = 'huangfeng';                                      /* 第三方交战外势力 */
    w177b.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: 'in', joinedFid: 'huangfeng', merit: 0, result: null };
    SQ.Combat.simulate(w177b, pack, D, M(mkProf(), w177b), 600, ctx177);
    var thirdNo177 = (w177b.factionWar.merit || 0) === 0;               /* warSideOf null → 不累积 */
    /* 阈值快照：入场时 realm2（need 14）→ 结算前升到 realm4 → need = 10+4×2 = 18（merit 16 < 18 败档） */
    var need177a = SQ.Factions.meritNeedOf({ realm: 2 }, D);
    w177.factionWar.merit = 16; w177.realm = 4;
    var need177b = SQ.Factions.meritNeedOf(w177, D);
    var set177 = SQ.Factions.warSettle(w177, pack, D, Date.now(), { log: noopLog() });
    var snap177 = need177a === 14 && need177b === 18 && set177 && set177.win === false && set177.need === 18;
    /* normalize：旧格式 joined 'win' → 'in'、result 保留、merit 补 0 */
    var n177 = SQ.normalize({ v: SQ.V, profile: { name: 't', talents: [], worldId: 'xiuxian' },
      worlds: { xiuxian: { factionWar: { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() + 600000, joined: 'win', result: { win: true } } } } });
    var fw177 = n177.worlds.xiuxian.factionWar;
    ok('177', '战功记账：入场才累积/第三方不累积/阈值 10+realm×2 结算快照/旧值映射',
      noMerit177 && merit177 && thirdNo177 && snap177 &&
      !!fw177 && fw177.joined === 'in' && fw177.merit === 0 && fw177.result && fw177.result.win === true,
      'noJoin=' + noMerit177 + ' merit=' + merit177 + ' third=' + thirdNo177 + ' snap=' + snap177 + ' norm=' + !!fw177);

    /* #178 势力战后效（§7.2~§7.4）：胜档 rep+50/灵石×500 记 in.event/同门 bond+2 +
     * REL_SOFTEN_P 对称写入 + PRESTIGE buff 24h + warResult 传闻卡 30min */
    var w178 = mkWs({ realm: 1, stones: 0 });
    SQ.Factions.generate(w178, pack, D);
    w178.factionId = 'jianqi'; w178.factionRep = { jianqi: 0 };
    w178.factionNpcs = { tie: 'jianqi', chiwei: 'jianqi' };
    w178.bonds = { tie: 0, chiwei: 0 };
    w178.factionWar = { aId: 'jianqi', bId: 'laolong', bornAt: Date.now(), until: Date.now() - 1, joined: 'in', joinedFid: 'jianqi', merit: 99, result: null };
    var relBefore178 = (SQ.Factions.byId(w178, 'laolong').rel || {})['jianqi'];
    var restore178 = stubRandom(function () { return 0.1; });           /* REL_SOFTEN_P 0.5 → 必然软化 */
    var now178 = Date.now();
    var set178 = SQ.Factions.warSettle(w178, pack, D, now178, { log: noopLog() });
    restore178();
    var zi178 = Math.min(w178.realm, 9);
    var stonesExpect178 = Math.round(D.ZONES[zi178].stones * D.FACTION_WAR.WIN_STONE_K);
    var pre178 = null;
    (w178.buffs || []).forEach(function (b) { if (b.source === 'factionWar') pre178 = b; });
    var rc178 = SQ.Rumors.warResultCard(w178);
    ok('178', '势力战后效：胜档四件发放/旧怨软化对称写入/PRESTIGE 24h/结果卡 30min',
      set178 && set178.win === true && w178.factionRep.jianqi === 50 &&
      w178.stones === stonesExpect178 && (w178.ledger.in.event || 0) === stonesExpect178 &&
      w178.bonds.tie === 2 && w178.bonds.chiwei === 2 &&
      relBefore178 === 'enemy' && SQ.Factions.byId(w178, 'laolong').rel.jianqi === 'neutral' &&
      SQ.Factions.byId(w178, 'jianqi').rel.laolong === 'neutral' &&
      !!pre178 && pre178.field === 'shopCost' && pre178.mult === -0.05 &&
      Math.abs(pre178.until - (now178 + 24 * 3600000)) < 5000 &&
      !!rc178 && rc178.outcome === 'win' && rc178.expireAt - rc178.bornAt === 30 * 60000,
      'rep=' + w178.factionRep.jianqi + ' stones=' + w178.stones + '/' + stonesExpect178 +
      ' bond=' + w178.bonds.tie + ' rel=' + SQ.Factions.byId(w178, 'laolong').rel.jianqi +
      ' pre=' + !!pre178 + ' card=' + (rc178 && rc178.outcome));

    /* #179 职位双技能（§八）：派生不落库/24h 独立 CD/officeGuard 一次性标记判后即清/
     * 叛离清除/魔道档消费端豁免（护法归零时按 floor 0.03+0.02） */
    var w179 = mkWs({ realm: 1 });
    SQ.Factions.generate(w179, pack, D);
    w179.factionId = 'jianqi';
    w179.factionRep = { jianqi: 700 };                                  /* rank3 → 执事 */
    w179.factionNpcs = { chiwei: 'jianqi' };
    w179.bonds = { chiwei: 30 };                                        /* tier2 → perk 0.02×2 = 0.04 */
    var off179 = SQ.Factions.officeOf(w179, D);
    var g179 = SQ.Factions.guardArm(w179, pack, D, Date.now(), noopLog());  /* rank3 不可护法 */
    var d179 = SQ.Factions.dispatchFellow(w179, pack, D, 'chiwei', Date.now(), noopLog());
    var buff179 = null;
    (w179.buffs || []).forEach(function (b) { if (b.field === 'dropRate' && b.source === 'bond') buff179 = b; });
    var d179b = SQ.Factions.dispatchFellow(w179, pack, D, 'chiwei', Date.now(), noopLog());
    var dChan179 = SQ.Factions.dispatchFellow(w179, pack, D, 'tie', Date.now(), noopLog());  /* channel 型拒绝（且非同门） */
    w179.factionRep.jianqi = 1500;                                      /* rank4 → 长老 */
    var off179b = SQ.Factions.officeOf(w179, D);
    var g179b = SQ.Factions.guardArm(w179, pack, D, Date.now(), noopLog());
    var armed179 = g179b.ok && w179.tribulation.officeGuard === true;   /* 判前捕获（其后判即清会复位） */
    var info179 = SQ.XTrib.info(w179, pack, D, M(mkProf(), w179));
    var g179c = SQ.Factions.guardArm(w179, pack, D, Date.now(), noopLog());  /* 同日再发动 → cd */
    /* 魔道档消费端豁免：karma 恶档 + 无护法 → officeGuard 仍按 floor+extra = 0.05 */
    w179.karma = -300;
    var info179e = SQ.XTrib.info(w179, pack, D, M(mkProf(), w179));
    /* 判后即清：掷一次渡劫（base 0.95 必成路径 stub）→ officeGuard false */
    var restore179 = stubRandom(0.1);
    SQ.Realm.tryBreakthrough(w179, pack, D, M(mkProf(), w179), Date.now(), { log: noopLog() });
    restore179();
    var cleared179 = w179.tribulation.officeGuard === false;
    /* 叛离清除：重挂标记后 leave → factionOffice null + officeGuard false */
    w179.tribulation.officeGuard = true;
    w179.factionOffice = { dispatchAt: 0, guardAt: 0 };
    SQ.Factions.leave(w179, pack, D, Date.now(), noopLog());
    var leaveClr179 = w179.factionOffice === null && w179.tribulation.officeGuard === false;
    ok('179', '职位双技能：派生/独立 CD/护法标记判后即清与叛离清除/魔道消费端豁免',
      off179 === 'steward' && off179b === 'elder' &&
      !g179.ok && g179.reason === 'office' &&
      d179.ok && !!buff179 && Math.abs(buff179.mult - 0.04) < 1e-9 &&
      !d179b.ok && d179b.reason === 'cd' && !dChan179.ok &&
      armed179 && !g179c.ok && g179c.reason === 'cd' &&
      info179.parts.officeGuard === true && Math.abs(info179.parts.guardian - 0.05) < 1e-9 &&
      Math.abs(info179e.parts.guardian - 0.05) < 1e-9 &&
      cleared179 && leaveClr179,
      'off=' + off179 + '/' + off179b + ' g1=' + g179.reason + ' disp=' + d179.ok +
      ' buff=' + (buff179 ? buff179.mult + '/' + buff179.source : 'null') + ' cd=' + (d179b.reason) +
      ' chan=' + (dChan179.reason) + ' guard=' + (g179b && g179b.ok) + ' g3=' + (g179c.reason) +
      ' og=' + info179.parts.officeGuard + ' bonus=' + info179.parts.guardian +
      ' evil=' + info179e.parts.guardian + ' clr=' + cleared179 + '/' + leaveClr179);

    /* #180 叛离谍报（§九）：karma −60 / bond −10（Bonds.lose 唯一写口，锁类豁免）/
     * 声望 50% 转移向下取整 / intelArts 门控豁免 / 循环无套利（CD + 声望减半 + karma 累计） */
    var w180 = mkWs({ realm: 0 });
    SQ.Factions.generate(w180, pack, D);
    w180.factionId = 'jianqi';
    w180.factionRep = { jianqi: 1001 };                                 /* floor(1001×0.5) = 500 */
    w180.factionNpcs = { tie: 'jianqi', chiwei: 'jianqi', pei: 'jianqi', suwan: 'laolong' };
    w180.bonds = { tie: 30, chiwei: 5, pei: -99, suwan: 50 };
    w180.spouse = null;
    var d180 = SQ.Factions.defect(w180, pack, D, 'laolong', true, Date.now(), noopLog());
    var intelIds180 = Object.keys(w180.intelArts || {});
    var intelArt180 = intelIds180.length === 1 ? pack.artsMap()[intelIds180[0]] : null;
    var intelOk180 = !!intelArt180 && intelArt180.alignment === 'neutral' &&
      (intelArt180.obtain.type === 'shop' || intelArt180.obtain.type === 'black');
    /* tie 30 → lose −10 → 20 → join 敌对联动 −20 → 0（两层叠加声明）；chiwei 5 → −5 → clamp −20；
     * pei 绝交锁豁免 −99 不动；suwan 属新门且为道友（非道侣）→ 只吃 join 同门 +5 */
    var bond180 = w180.bonds.tie === 0 && w180.bonds.chiwei === -20 && w180.bonds.pei === -99;
    var rep180 = w180.factionRep.jianqi === undefined && w180.factionRep.laolong === 500;
    var karma180 = w180.karmaEventScore === -60;
    var cd180 = SQ.Factions.defect(w180, pack, D, 'jianqi', false, Date.now(), noopLog());
    var cdOk180 = !cd180.ok && cd180.reason === 'cooldown';             /* 防刷锁① CD */
    /* intelArts 门控豁免：yunyou（neutral/shop/realm1）在 realm0  normally 不可学 */
    var w180b = mkWs({ realm: 0 });
    var noIntel180 = SQ.Arts.canLearn(w180b, pack, D, 'yunyou') === false;
    w180b.intelArts = { yunyou: true };
    var intelLearn180 = SQ.Arts.canLearn(w180b, pack, D, 'yunyou') === true;
    /* 循环无套利锁③：绕过 CD 叛回 → 声望再减半 500→250、karma 累计 −120 */
    w180.factionCdUntil = 0;
    var d180b = SQ.Factions.defect(w180, pack, D, 'jianqi', false, Date.now(), noopLog());
    var loop180 = d180b.ok && w180.factionRep.jianqi === 250 && w180.factionRep.laolong === undefined &&
      w180.karmaEventScore === -120 && !d180b.intelId;
    ok('180', '叛离谍报：karma−60/bond−10 锁豁免/声望 50% 取整转移/intelArts 豁免 realm/循环无套利',
      d180.ok && karma180 && bond180 && rep180 && intelOk180 && cdOk180 &&
      noIntel180 && intelLearn180 && loop180,
      'karma=' + w180.karmaEventScore + ' tie=' + w180.bonds.tie + ' chiwei=' + w180.bonds.chiwei +
      ' pei=' + w180.bonds.pei + ' rep=' + JSON.stringify(w180.factionRep) + ' intel=' + intelIds180.join(',') +
      ' cd=' + cdOk180 + ' loop=' + loop180);

    /* #169 天赋池重生成一致性（专属池卷 v1.1 / 天赋池设计 v1.6）：通用 72 = 正 40/负 32、
     * 修仙 124 = 正 66/负 58；id 全局无重复；effects 键全在字典（FIELDS）+ 挂点白名单内；
     * tier 枚举 common/rare/epic 且 epic 为修仙专属池独有；mingwang 挂点仅修仙池（通用池禁用）。
     * 文档 ↔ js 零漂移由 .tests/gen-lexicon.cjs 对账强制（id 集合 + 条数 + 羁绊 pair 在册）。 */
    var T169 = SQ.TALENTS;
    var cnt169 = {
      cp: T169.common.positive.length, cn: T169.common.negative.length,
      xp: T169.xiuxian.positive.length, xn: T169.xiuxian.negative.length
    };
    var ids169 = {}, dup169 = [];
    var keyOk169 = true, tierOk169 = true, epicOk169 = true, mwOk169 = true, kindOk169 = true, wOk169 = true;
    var ALLOWED169 = {};
    SQ.Mods.FIELDS.forEach(function (f) { ALLOWED169[f] = 1; });
    SQ.Mods.TALENT_HOOK_KEYS.forEach(function (k) { ALLOWED169[k] = 1; });
    [['common', T169.common], ['xiuxian', T169.xiuxian]].forEach(function (pair) {
      var w = pair[0], pool = pair[1];
      ['positive', 'negative'].forEach(function (kind) {
        pool[kind].forEach(function (t) {
          if (ids169[t.id]) dup169.push(t.id);
          ids169[t.id] = 1;
          if (t.kind !== kind) kindOk169 = false;
          if (t.world !== w) kindOk169 = false;
          if (!(typeof t.weight === 'number' && t.weight > 0)) wOk169 = false;
          if (['common', 'rare', 'epic'].indexOf(t.tier) < 0) tierOk169 = false;
          if (t.tier === 'epic' && w !== 'xiuxian') epicOk169 = false;
          for (var k in t.effects) {
            if (!ALLOWED169[k]) keyOk169 = false;
            if (k === 'mingwang' && w !== 'xiuxian') mwOk169 = false;
            if (typeof t.effects[k] !== 'number') keyOk169 = false;
          }
        });
      });
    });
    ok('169', '天赋池重生成：72=40/32 · 124=66/58 · id 无重复 · effects 键全在字典+挂点白名单',
      cnt169.cp === 40 && cnt169.cn === 32 && cnt169.xp === 66 && cnt169.xn === 58 &&
      dup169.length === 0 && keyOk169 && tierOk169 && epicOk169 && mwOk169 && kindOk169 && wOk169,
      'cnt=' + JSON.stringify(cnt169) + ' dup=' + dup169.join(',') + ' keys=' + keyOk169 +
      ' tier=' + tierOk169 + ' epic=' + epicOk169 + ' mingwang=' + mwOk169);

    /* #170 streak 记账（数值详设 §8.3.1）：失败 +1 / 成功清零 / X09 skipAttempt 不 +1 / 旧档 normalize 补 0 */
    var w170 = mkWs({ realm: 0 });
    var restore170f = stubRandom(function () { return 0.999; });        /* p=0.95 → 必败 */
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog() });
    var f1_170 = w170.tribulation.streak === 1;
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog() });
    var f2_170 = w170.tribulation.streak === 2;
    var att170 = w170.tribulation.attempts;
    var savedTF170 = SQ.Treasures.tribOnFail;
    SQ.Treasures.tribOnFail = function () { return { skipAttempt: true }; };   /* X09 续命语义桩 */
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog() });
    SQ.Treasures.tribOnFail = savedTF170;
    var skip170 = w170.tribulation.streak === 2 && w170.tribulation.attempts === att170;  /* streak 与 attempts 同源豁免 */
    restore170f();   /* 先卸恒败桩再装必成桩——嵌套安装 + 只恢复后者会让恒 0.999 mock 复活泄漏全套件（六向批 #208 抓现行） */
    var restore170s = stubRandom(function () { return 0.01; });         /* 必成（p 0.93 心魔 2 层仍高） */
    SQ.Realm.tryBreakthrough(w170, pack, D, M(mkProf(), w170), Date.now(), { log: noopLog(), profile: mkProf() });
    restore170s();
    var clr170 = w170.tribulation.streak === 0;
    var n170 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { tribulation: { attempts: 5 } } } });
    var norm170 = n170.worlds.xiuxian.tribulation.streak === 0 && n170.worlds.xiuxian.tribulation.officeGuard === false;
    ok('170', 'streak 记账：失败 +1 / 成功清零 / X09 skipAttempt 豁免 / 旧档补 0',
      f1_170 && f2_170 && skip170 && clr170 && norm170,
      'f1=' + f1_170 + ' f2=' + f2_170 + ' skip=' + skip170 + ' clr=' + clr170 + ' norm=' + norm170);

    /* #171 心魔（§8.3.2/§8.3.4）：层数 = min(streak−1, 3) 进 talent 加项同读点；
     * 真仙裸身最坏 0.22−0.03 = 0.19（裸身口径 = 空 mods，无装备/功法/天赋/属性被动；第卌二批 base 压陡前为 0.308）；
     * p 仍 clamp [0.05, 0.95]、TRIB_P_CLAMP/REALMS 零改动 */
    var bareMods171 = (function () {
      var m = { sum: {}, detail: {}, atk: 0, resist: 0, hooks: {}, flags: {}, bonds: {}, slotted: [] };
      SQ.Mods.FIELDS.forEach(function (f) { m.sum[f] = 0; });
      return m;
    })();
    var w171 = mkWs({ realm: 8 });
    w171.tribulation.streak = 4;
    var i171 = SQ.XTrib.info(w171, pack, D, bareMods171);
    var p171 = Math.abs(i171.p - 0.19) < 1e-9;
    var part171 = i171.parts.xinmoStacks === 3 && Math.abs(i171.parts.xinmo + 0.03) < 1e-9;
    w171.tribulation.streak = 10;
    var cap171 = SQ.XTrib.info(w171, pack, D, bareMods171).parts.xinmoStacks === 3;
    w171.tribulation.streak = 1;
    var zero171 = SQ.XTrib.info(w171, pack, D, bareMods171).parts.xinmoStacks === 0;  /* <minStreak2 不生效 */
    w171.tribulation.streak = 2;
    var one171 = SQ.XTrib.info(w171, pack, D, bareMods171).parts.xinmoStacks === 1;
    var clamp171 = D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 &&
      i171.p >= 0.05 && i171.p <= 0.95 && D.REALMS[9].tribBase === 0.22;
    ok('171', '心魔：min(streak−1,3) 进 talent 同读点 / 真仙裸身最坏 0.19 / clamp 与 REALMS 零改动',
      p171 && part171 && cap171 && zero171 && one171 && clamp171,
      'p=' + i171.p.toFixed(3) + ' stacks=' + i171.parts.xinmoStacks + ' cap=' + cap171 + ' zero=' + zero171);

    /* #172 道伤/封固（§8.3.2）：走 pushBuff 通道、同字段同向重犯刷新时长不叠层、保留最强、到期自动清除 */
    var w172 = mkWs({ realm: 0 });
    var restore172 = stubRandom(function () { return 0.999; });
    var t172 = Date.now();
    SQ.Realm.tryBreakthrough(w172, pack, D, M(mkProf(), w172), t172, { log: noopLog() });   /* streak1 → 道伤 −15%/12h */
    function qiNegBuffs172(w) { return (w.buffs || []).filter(function (b) { return b.field === 'qiRate' && b.mult < 0; }); }
    var ds172 = qiNegBuffs172(w172);
    var ok172a = ds172.length === 1 && ds172[0].mult === -0.15 && ds172[0].source === 'tribStreak';
    var until172 = ds172[0].until;
    SQ.Realm.tryBreakthrough(w172, pack, D, M(mkProf(), w172), t172 + 1000, { log: noopLog() });  /* streak2 → 道伤刷新 */
    var rf172 = qiNegBuffs172(w172);
    var ok172b = rf172.length === 1 && rf172[0].until > until172 && rf172[0].mult === -0.15;      /* 不叠层、刷新时长 */
    SQ.Realm.tryBreakthrough(w172, pack, D, M(mkProf(), w172), t172 + 2000, { log: noopLog() });  /* streak3 → 封固 −25% 覆盖 */
    var fg172 = qiNegBuffs172(w172);
    var ok172c = fg172.length === 1 && fg172[0].mult === -0.25;                                   /* 保留最强 */
    restore172();
    w172.buffs[0].until = Date.now() - 1;
    pack.claim(w172, 1000, Date.now(), mkProf(), { autoTrib: false });
    var ok172d = qiNegBuffs172(w172).length === 0;                                                /* 到期自动清除（claim 过滤） */
    ok('172', '道伤/封固：pushBuff 通道 / 重犯刷新不叠层 / 保留最强 / 到期清除',
      ok172a && ok172b && ok172c && ok172d,
      'ds=' + ok172a + ' rf=' + ok172b + ' fg=' + ok172c + ' exp=' + ok172d);

    /* #173 破境高光四件套（§8.3.3）：破境 buff + 灵石 in.event + 天道垂青 10%（fateSeen 同境界段
     * 不重复、抽干流产、跨段可再遇）+ 无漏道基 karma +5 */
    var w173 = mkWs({ realm: 0, stones: 0 });
    w173.qi = 1000;
    var restore173 = stubRandom(function () { return 0.01; });          /* 成功掷判 + FATE_P + 池内首条 */
    SQ.Realm.tryBreakthrough(w173, pack, D, M(mkProf(), w173), Date.now(), { log: noopLog(), profile: mkProf() });
    restore173();
    var pj173 = null;
    (w173.buffs || []).forEach(function (b) { if (b.source === 'tribSuccess') pj173 = b; });
    var stones173 = w173.stones === Math.round(D.ZONES[1].stones * 300) &&
      w173.ledger.in.event === Math.round(D.ZONES[1].stones * 300);
    var fate173 = !!w173.pendingChoice && w173.pendingChoice.id === 'tiandao_guanding' &&
      w173.pendingChoice.via === 'fate' &&
      w173.fateSeen.length === 1 && w173.fateSeen[0].id === 'tiandao_guanding' && w173.fateSeen[0].realm === 1;
    var wulou173 = w173.karmaEventScore === 5;
    /* fateSeen 同境界段排除：连抽至段内抽干 → 流产；跨段可再遇 */
    var w173b = mkWs({ realm: 1 });
    var fired173 = [];
    for (var fi = 0; fi < 6; fi++) {
      var fr = SQ.Events.fireTagged(w173b, pack, D, 'trib_success', 3, Date.now(), null);
      if (fr) fired173.push(fr.id);
    }
    var dry173 = SQ.Events.fireTagged(w173b, pack, D, 'trib_success', 3, Date.now(), null) === null;
    var uniq173 = fired173.length === 6 && fired173.filter(function (v, i2, a2) { return a2.indexOf(v) === i2; }).length === 6;
    var cross173 = !!SQ.Events.fireTagged(w173b, pack, D, 'trib_success', 4, Date.now(), null);   /* 新境界段可再遇 */
    /* 常规抽取池排除 tags 词条（独立通道不进常规时钟） */
    var pool173 = SQ.Events.buildPool(pack, w173b, D, 'tian', 'good', Date.now());
    var noTag173 = pool173.every(function (ev) { return !(ev.tags && ev.tags.length); });
    ok('173', '破境高光：buff+灵石 in.event+天道垂青 fateSeen 段排除+无漏 karma+5',
      !!pj173 && pj173.field === 'qiRate' && pj173.mult === 0.5 && stones173 && fate173 && wulou173 &&
      uniq173 && dry173 && cross173 && noTag173,
      'buff=' + !!pj173 + ' stones=' + stones173 + ' fate=' + fate173 + ' wulou=' + wulou173 +
      ' uniq=' + uniq173 + ' dry=' + dry173 + ' cross=' + cross173 + ' poolExcl=' + noTag173);

    /* #174 区域词缀（§2.5）：roll 即掷/过期补掷/六字段消费点/闭关与全局 mods 零污染 */
    var w174 = mkWs({ realm: 2, zone: 0 });
    var t174r = Date.now();
    var a174 = SQ.Combat.rollAffix(w174, D, t174r);
    var roll174 = w174.zoneAffix.affixId === a174.id &&
      w174.zoneAffix.until === t174r + (D.AFFIX_MS || 21600000);
    /* needMult：xueyue → zone0 need 30×1.25 = 37.5 */
    w174.zoneAffix = { affixId: 'xueyue', until: Date.now() + 3600000 };
    var bn174 = SQ.Combat.bottleneckOf(w174, pack, D, M(mkProf(), w174));
    var need174 = Math.abs(bn174.need - 37.5) < 1e-9;
    /* stonesMult：xueyue 1.5 → 10 杀 × 3 × 1.5 = 45（stub 0.99 无掉落无残片） */
    var restore174a = stubRandom(function () { return 0.99; });
    var r174a = SQ.Combat.simulate(w174, pack, D, M(mkProf(), w174), 600, { log: noopLog(), now: Date.now() });
    restore174a();
    var stone174 = r174a.kills === 10 && r174a.stones === 45;
    /* speedMult + intervalAdd：kuanglan（speedMult 1.2 / intervalAdd 1） */
    w174.zoneAffix = { affixId: 'kuanglan', until: Date.now() + 3600000 };
    var r174b = (function () { var w = mkWs({ realm: 0, zone: 0 }); w.zoneAffix = { affixId: 'kuanglan', until: Date.now() + 3600000 }; return w; })();
    var bn174b = SQ.Combat.bottleneckOf(r174b, pack, D, M(mkProf(), r174b));
    var pen174 = bn174b.bottleneck === true && bn174b.intervalPenalty === 4;   /* (3+1)×无御风 */
    var restore174b = stubRandom(function () { return 0.99; });
    var r174c = SQ.Combat.simulate(w174, pack, D, M(mkProf(), w174), 600, { log: noopLog(), now: Date.now() });
    restore174b();
    var speed174 = r174c.kills === 12;                                          /* 60/1.2 = 50s → 12 杀 */
    /* dropMult：woye 1.15 → dropP 0.092；stub 0.09 有掉落，无词缀（0.08）则无 */
    var w174d = mkWs({ realm: 2, zone: 0 });
    w174d.zoneAffix = { affixId: 'woye', until: Date.now() + 3600000 };
    var restore174c = stubRandom(function () { return 0.09; });
    var r174d = SQ.Combat.simulate(w174d, pack, D, M(mkProf(), w174d), 60, { log: noopLog(), now: Date.now() });
    restore174c();
    var w174e = mkWs({ realm: 2, zone: 0 });
    w174e.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };     /* 无 dropMult 对照 */
    var restore174d = stubRandom(function () { return 0.09; });
    var r174e = SQ.Combat.simulate(w174e, pack, D, M(mkProf(), w174e), 60, { log: noopLog(), now: Date.now() });
    restore174d();
    var drop174 = r174d.drops.length === 1 && r174e.drops.length === 0;
    /* gearLuckAdd：guchen +0.15 → rollTier 抬档（luckAdd 直测：zone0 stub0.5 tier0 → tier1） */
    var mNoLuck = M(mkProf(), mkWs({ realm: 0 }));
    var r174f = stubRandom(function () { return 0.5; });
    var t0_174 = SQ.Gear.rollTier(D, 0, mNoLuck, null, 0);
    var t1_174 = SQ.Gear.rollTier(D, 0, mNoLuck, null, 5);
    r174f();
    var luck174 = t0_174 === 0 && t1_174 === 1;
    /* 过期补掷 + 词缀不进全局 mods + 闭关零消费点 */
    w174.zoneAffix = { affixId: 'xueyue', until: Date.now() - 1 };
    var restore174e = stubRandom(function () { return 0.99; });
    SQ.Combat.simulate(w174, pack, D, M(mkProf(), w174), 60, { log: noopLog(), now: Date.now() });
    restore174e();
    var reroll174 = w174.zoneAffix.until > Date.now();
    var w174g = mkWs({ realm: 2 });
    w174g.zoneAffix = { affixId: 'xueyue', until: Date.now() + 3600000 };
    var m174g = M(mkProf(), w174g);
    var m174h = M(mkProf(), mkWs({ realm: 2 }));
    var clean174 = JSON.stringify(m174g.sum) === JSON.stringify(m174h.sum) &&
      m174g.hooks.stonesMult === undefined && D.MODES.seclude.combat === false;
    var n174 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { zoneAffix: { affixId: 'nonexist', until: 9 } } } });
    var norm174 = n174.worlds.xiuxian.zoneAffix === null;                       /* 未知 id → null */
    ok('174', '区域词缀：掷/补掷/needMult/stonesMult/speedMult+intervalAdd/dropMult/gearLuckAdd/mods 零污染',
      roll174 && need174 && stone174 && pen174 && speed174 && drop174 && luck174 && reroll174 && clean174 && norm174,
      'roll=' + roll174 + ' need=' + need174 + ' stones=' + stone174 + '(' + r174a.stones + ') pen=' + pen174 +
      ' speed=' + speed174 + '(' + r174c.kills + ') drop=' + drop174 + ' luck=' + luck174 +
      ' reroll=' + reroll174 + ' clean=' + clean174 + ' norm=' + norm174);

    /* #175 域主状态机（§2.6）：首通 → ready（推进挂起）/ 判定 need×1.8 / 胜利上浮两档+灵石×10+推进点后移 /
     * 失败 CD 10min / 旧档 zoneBoss=null 不追溯生成 */
    var w175 = mkWs({ realm: 2, zone: 0, stones: 0 });
    var restore175 = stubRandom(function () { return 0.99; });
    SQ.Combat.simulate(w175, pack, D, M(mkProf(), w175), 1200, { log: noopLog(), now: Date.now() });   /* 20 杀首通 */
    restore175();
    var ready175 = w175.cleared.indexOf(0) >= 0 && !!w175.zoneBoss &&
      w175.zoneBoss.zone === 0 && w175.zoneBoss.state === 'ready' && w175.zone === 0;                 /* 推进挂起 */
    var restore175b = stubRandom(function () { return 0.5; });
    var c175 = SQ.Combat.challengeBoss(w175, pack, D, M(mkProf(), w175), Date.now(), { log: noopLog() });
    restore175b();
    var win175 = c175.ok && c175.win && Math.abs(c175.need - 30 * 1.8) < 1e-9 &&
      w175.zoneBoss.state === 'dead' && c175.item.tier >= 2 && c175.stones === 30 &&
      w175.ledger.in.event === 30;
    var adv175 = w175.zone === 1;                                                                       /* 推进点后移至域主战后 */
    /* 失败 CD：realm0 裸身 20 < 54 → 败 + retryAt；再挑战 → cd 拒绝 */
    var w175b = mkWs({ realm: 0, zone: 0 });
    w175b.zoneBoss = { zone: 0, state: 'ready', retryAt: 0 };
    var t175 = Date.now();
    var c175b = SQ.Combat.challengeBoss(w175b, pack, D, M(mkProf(), w175b), t175, { log: noopLog() });
    var lose175 = c175b.ok && !c175b.win && w175b.zoneBoss.state === 'ready' &&
      Math.abs(w175b.zoneBoss.retryAt - (t175 + 600000)) < 2000;
    var cd175 = SQ.Combat.challengeBoss(w175b, pack, D, M(mkProf(), w175b), t175 + 1000, { log: noopLog() }).reason === 'cd';
    /* 旧档：normalize 缺省 null；已通关旧区回访再清**不追溯生成域主**（zoneBoss 保持 null）；
     * zoneBoss=null 时 maybeAdvance 维持现行「首通即推进」口径（重访再清本就不触发推进，与旧码一致） */
    var n175 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { cleared: [0] } } });
    var w175c = mkWs({ realm: 2, zone: 0, cleared: [0] });
    var restore175c = stubRandom(function () { return 0.99; });
    SQ.Combat.simulate(w175c, pack, D, M(mkProf(), w175c), 1200, { log: noopLog(), now: Date.now() });
    restore175c();
    var legacy175 = n175.worlds.xiuxian.zoneBoss === null && w175c.zoneBoss == null &&
      SQ.Combat.maybeAdvance(w175c, pack, D, M(mkProf(), w175c), 0, noopLog()) === true && w175c.zone === 1;
    ok('175', '域主状态机：首通 ready 挂起 / need×1.8 / 胜利上浮两档+灵石×10+推进后移 / 失败 CD / 旧档不追溯',
      ready175 && c175.win && adv175 && lose175 && cd175 && legacy175,
      'ready=' + ready175 + ' win=' + c175.win + ' tier=' + c175.item.tier + ' adv=' + adv175 +
      ' lose=' + lose175 + ' cd=' + cd175 + ' legacy=' + legacy175);

    /* #176 探宝残片（§2.7）：SHARD_P×(1+ΣdropRate)×dropMult 掉 / 分区计数 / 20 片兑换走 mutate / 奖励四档 */
    /* 掉率直测：lingchao（无 dropMult）stub 0.019 < 0.02 → 每杀 1 片；无天赋 → 10 杀 10 片 */
    var w176 = mkWs({ realm: 2, zone: 0 });
    w176.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var restore176a = stubRandom(function () { return 0.019; });
    SQ.Combat.simulate(w176, pack, D, M(mkProf(), w176), 600, { log: noopLog(), now: Date.now() });
    restore176a();
    var drop176 = w176.shards[0] === 10;
    /* (1+ΣdropRate)：adventurous +0.15 → shardP 0.023；stub 0.021 → 有天掉落片、无天赋不落（0.021 > 0.02） */
    var w176b = mkWs({ realm: 2, zone: 0 });
    w176b.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var t176b = mkTalent({ dropRate: 0.15 });
    var restore176b = stubRandom(function () { return 0.021; });
    SQ.Combat.simulate(w176b, pack, D, M(mkProf([t176b]), w176b), 60, { log: noopLog(), now: Date.now() });
    restore176b();
    var w176c = mkWs({ realm: 2, zone: 0 });
    w176c.zoneAffix = { affixId: 'lingchao', until: Date.now() + 3600000 };
    var restore176c = stubRandom(function () { return 0.021; });
    SQ.Combat.simulate(w176c, pack, D, M(mkProf(), w176c), 60, { log: noopLog(), now: Date.now() });
    restore176c();
    var rate176 = (w176b.shards[0] || 0) === 1 && (w176c.shards[0] || 0) === 0;
    /* 兑换四档 + 扣片 + 分区 + 不足拒绝 */
    var w176d = mkWs({ realm: 9 });
    w176d.shards = [20, 5, 0, 0, 20, 0, 0, 20, 0, 20];
    var x0 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 0, null, Date.now(), noopLog());
    var pill176 = x0.ok && x0.reward.type === 'pill' &&
      ['juqi', 'ningshen', 'cuiti'].indexOf(x0.reward.id) >= 0 && w176d.shards[0] === 0 && w176d.shards[1] === 5;
    var x1 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 1, null, Date.now(), noopLog());
    var lack176 = !x1.ok && x1.reason === 'shards';
    var x4 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 4, null, Date.now(), noopLog());
    var box176 = x4.ok && x4.reward.type === 'gearbox' && x4.reward.item.tier >= 2 && w176d.shards[4] === 0;
    var xC = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 7, null, Date.now(), noopLog());
    var choice176 = !xC.ok && xC.reason === 'choice';                                  /* 二选一必选 */
    var xF = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 7, 'fac', Date.now(), noopLog());
    var fac176 = xF.ok && xF.reward.type === 'fac' &&
      (w176d.cave.fac[w176d.cave.current] || {})[xF.reward.fac] === 1 && w176d.shards[7] === 0;
    w176d.shards[7] = 20;
    var xI = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 7, 'intel', Date.now(), noopLog());
    var intel176 = xI.ok && xI.reward.type === 'intel' && w176d.intelArts && w176d.intelArts[xI.reward.id] === true;
    var x9 = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 9, null, Date.now(), noopLog());
    var tr176 = x9.ok && x9.reward.type === 'treasure' &&
      !!SQ.Treasures.entryOf(w176d, x9.reward.id) && w176d.shards[9] === 0;
    /* z9 全持有 → 折灵石 in.event */
    w176d.shards[9] = 20;
    (pack.treasures.LIST || []).forEach(function (d) {
      if (d.kind === 'xian' && !SQ.Treasures.entryOf(w176d, d.id)) {
        w176d.treasures.owned.push({ id: d.id, stage: 1, st: {} });
      }
    });
    var st176 = w176d.stones;
    var x9b = SQ.Combat.exchangeShard(w176d, pack, D, M(mkProf(), w176d), 9, null, Date.now(), noopLog());
    var fold176 = x9b.ok && x9b.reward.type === 'stones' &&
      x9b.reward.n === Math.round(D.ZONES[9].stones * 10) &&
      w176d.stones === st176 + x9b.reward.n;
    /* 兑换走 mutate 事务通道（Actions 入口 + 落盘生效） */
    var mut176 = typeof SQ.Actions.exchangeShard === 'function' && typeof SQ.Actions.challengeBoss === 'function';
    var n176 = SQ.normalize({ v: SQ.V, worlds: { xiuxian: { shards: [3, -5, 'x'] } } });
    var norm176 = n176.worlds.xiuxian.shards.length === 10 && n176.worlds.xiuxian.shards[0] === 3 &&
      n176.worlds.xiuxian.shards[1] === 0 && n176.worlds.xiuxian.shards[9] === 0;
    ok('176', '残片：2%×(1+dropRate) 掉 / 分区计数 / 兑换四档 / mutate 入口 / normalize 钳位',
      drop176 && rate176 && pill176 && lack176 && box176 && choice176 && fac176 && intel176 &&
      tr176 && fold176 && mut176 && norm176,
      'drop=' + drop176 + ' rate=' + rate176 + ' pill=' + pill176 + ' lack=' + lack176 + ' box=' + box176 +
      ' choice=' + choice176 + ' fac=' + fac176 + ' intel=' + intel176 + ' tr=' + tr176 + ' fold=' + fold176 +
      ' norm=' + norm176);

    /* ═══ 4.7 界面组可无头验证项 ═══ */

    /* #72 数字格式三档 */
    /* ═══ 双书内容池恢复批（2026-10-03）· #147~#154 补齐（缺 7 条；#152 福地批版在场同题覆盖）═══ */

    /* #147 双书两批累计词表 key 对账（扩容批 C1 + 二批 C 口径）：event = 119 条全量 ×5 key 零缺失
     * （⊇ 两批 52×5=260）+ bond 38×10=380 + spouse 10×3=30 + faction 16×2=32 + treasure 16×2=32 + skill 16×2=32 */
    var bad147 = [];
    /* SQ.t 全链路解析（通用池 key 注册在 common 词表，SQ.LEX.xiuxian 单表会漏——#118 同款口径） */
    function lex147(key) { if (SQ.t(key, null, 'xiuxian') === key) bad147.push(key); }
    all118.forEach(function (ev) {
      /* 分支键按模板**自己声明的 choices** 逐支对表（第卌四批改口，与 audit A2 同口径）：
       * 「族中寻仇」按用户设定只有迎战一条路，硬要求三支齐全只会逼词表补两条永不消费的孤儿键 */
      ['name', 'story'].concat(Object.keys(ev.choices || {}).map(function (bk) { return 'branch.' + bk; }))
        .forEach(function (suf) {
          lex147('event.' + ev.id + '.' + suf);
        });
    });
    var BOND38_147 = ['hanli', 'yuxiao', 'xuaner', 'nangong', 'pingping', 'ningyao', 'aliang', 'jingchun',
      'lihuayuan', 'mojuren', 'zhangtie', 'yuzhitong', 'wuyan', 'wangchan', 'xiangzhili', 'chelaozu', 'zuoyou',
      'liushiliu', 'makuxuan', 'weixian', 'xieshi', 'cuichan', 'yufu', 'wensheng', 'zhuhe', 'ruanqiong',
      'dongtianci', 'yintianxia', 'baidi', 'gucan', 'mupeiling', 'chenqiaoyue', 'chenlianyan', 'yinyue',
      'hongfu', 'yuanyao', 'ruanxiu', 'chenqingdu'];
    BOND38_147.forEach(function (id) {
      ['name', 'kind', 'perk', 'perk.desc', 'flavor', 'title.1', 'title.2', 'title.3', 'title.4', 'ava']
        .forEach(function (suf) { lex147('bond.' + id + '.' + suf); });
    });
    ['xuaner', 'ningyao', 'mupeiling', 'chenqiaoyue', 'chenlianyan', 'yinyue', 'hongfu', 'yuanyao', 'ruanxiu', 'chenqingdu']
      .forEach(function (id) { ['yinyang', 'huzhu', 'luding'].forEach(function (f) { lex147('spouse.' + id + '.' + f); }); });
    (D.FACTIONS_FIXED || []).forEach(function (fx) { lex147('faction.' + fx.id + '.name'); lex147('faction.' + fx.id + '.desc'); });
    ['x13', 'x14', 'x15', 'x16', 'x17', 'x18', 'x19', 'h19', 'h20', 'h21', 'h22', 'h23', 'h24', 'h25', 'h26', 'h27']
      .forEach(function (id) { lex147('treasure.' + id + '.name'); lex147('treasure.' + id + '.desc'); });
    ['dayan', 'qingzhu', 'xuedun', 'jianyun', 'chunyu', 'duoxian', 'dujing', 'xingchen', 'liumojue', 'zhenmo',
      'qianjian', 'wenxin', 'changcheng', 'yinjian', 'jianlu', 'shengxin']
      .forEach(function (id) { lex147('skill.' + id + '.name'); lex147('skill.' + id + '.desc'); });
    ok('147', '双书两批累计词表 key 对账（event 119×5 + bond 380 + spouse 30 + faction 32 + treasure 32 + skill 32）',
      bad147.length === 0, 'missing=' + bad147.slice(0, 6).join(','));

    /* #148 固定势力 16 处必现 + 总数 16~20（势力全录 §一 口径；旧登记 17~20 系转写误差，恢复批修正）+ 阵营缺口各 ≥2 + 法宝 46 件 codex + 新挂点并入 mods +
     * 紫金钟/镇魔链档数口径结案（§4.5 clamp 清单：h19 MAX_LV 3 满级 −3pp / x18 MAX_STAGE 5 满阶 −2.5pp） */
    var fac148 = w144.factions || [];
    var fix148 = (D.FACTIONS_FIXED || []).every(function (fx) { return !!SQ.Factions.byId(w144, fx.id); });
    var cnt148 = { right: 0, neutral: 0, evil: 0 };
    fac148.forEach(function (f) { cnt148[f.align]++; });
    var XT148 = pack.treasures;
    var n148x = XT148.LIST.filter(function (t) { return t.kind === 'xian'; }).length;
    var n148h = XT148.LIST.filter(function (t) { return t.kind === 'hou'; }).length;
    var HOOKS148 = { combatPower: 1, qiRate: 1, qiCap: 1, eventLuck: 1, tribBonus: 1, tribFailLossMod: 1,
      combatSpeed: 1, stonesRate: 1, dropRate: 1, artsSpeed: 1,
      on_kill_stones: 1, on_debuff_apply: 1, on_bottleneck_power: 1 };
    var NEW16_148 = { x13: 1, x14: 1, x15: 1, x16: 1, x17: 1, x18: 1, x19: 1,
      h19: 1, h20: 1, h21: 1, h22: 1, h23: 1, h24: 1, h25: 1, h26: 1, h27: 1 };
    var hookOk148 = XT148.LIST.filter(function (t) { return NEW16_148[t.id]; }).every(function (t) {
      return Object.keys(t.scaled || {}).every(function (k) {
        var p148 = k.split(':');
        return (p148[0] === 'mult' || p148[0] === 'hook') && !!HOOKS148[p148[1]];
      });
    });
    /* 功能验证：x18 stage5 + h19 lv3 + x19 stage3 同时祭出 → sum.tribFailLossMod = −0.055、qiCap +0.06 */
    var w148 = mkWs({ realm: 6 });
    w148.treasures = { owned: [{ id: 'x18', stage: 5, st: {} }, { id: 'h19', lv: 3, st: {} }, { id: 'x19', stage: 3, st: {} }],
      slots: ['x18', 'h19', 'x19'], fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0 };
    /* Treasures.collect 直测（mods.sum 含境界被动等底噪，非法宝单源）：x18 五阶 −2.5pp + h19 三级 −3pp
     * → tribFailLossMod −0.055（§4.5 合计 clamp [30%,70%] 在 tribulation 消费端兜底）；x19 三阶 qiCap +6% */
    var trs148 = SQ.Treasures.collect(w148, pack, D);
    var clamp148 = Math.abs((trs148.sum.tribFailLossMod || 0) + 0.055) < 1e-9 &&
      Math.abs((trs148.sum.qiCap || 0) - 0.06) < 1e-9;
    ok('148', '固定势力 16 必现/总数 16~20/阵营 ≥2 + 法宝 46（x19+h27）+ 挂点白名单 + 档数口径（−2.5pp/−3pp）',
      (D.FACTIONS_FIXED || []).length === 16 && fix148 && fac148.length >= 16 && fac148.length <= 20 &&
      cnt148.right >= 2 && cnt148.neutral >= 2 && cnt148.evil >= 2 &&
      XT148.LIST.length === 46 && n148x === 19 && n148h === 27 && hookOk148 && clamp148 &&
      XT148.ZONE_TREASURE[8] === 'x13' && XT148.MERCHANT_IDS.join() === 'x14,x15,x16',
      'fac=' + fac148.length + ' fix=' + fix148 + ' T=' + XT148.LIST.length + ' hook=' + hookOk148 + ' clamp=' + clamp148);

    /* #149 28 人预算 = 批3 20 人基线 + 扩容增量八字段（道友池卷 §四 登记；消费端 clamp 不变） */
    var C20_149 = { huang: 1, chiwei: 1, qin: 1, liu: 1, chen: 1, tang: 1, chu: 1, man: 1, suwan: 1, xie: 1,
      yewu: 1, shen: 1, tie: 1, pei: 1, zhu: 1, yan: 1, lu: 1, fu: 1, luman: 1, feng: 1 };
    var C8_149 = { hanli: 1, yuxiao: 1, xuaner: 1, nangong: 1, pingping: 1, ningyao: 1, aliang: 1, jingchun: 1 };
    var sum149F = {}, sum149C = {};
    (D.COMPANIONS || []).forEach(function (c) {
      if (!C20_149[c.id] && !C8_149[c.id]) return;
      var pk = c.perk || {};
      if (pk.field) sum149F[pk.field] = (sum149F[pk.field] || 0) + (pk.perTier || 0) * 4;
      if (pk.channel && pk.perTier) sum149C[pk.channel] = (sum149C[pk.channel] || 0) + pk.perTier * 4;
    });
    var EXP149F = { dropRate: 0.08, shopCost: -0.16, artsSpeed: 0.08, stonesRate: 0.14, offlineEff: 0.16,
      combatPower: 0.12, eventLuck: 0.08, gearLuck: 0.08, tribFailLossMod: -0.08, combatSpeed: 0.06, qiRate: 0 };
    var EXP149C = { debuffXinmo: 0.28, debuffAll: 0.28, checkPp: 0.10, bottleneck: 0.20, negEvent: 0.08,
      refine: 0.12, claimQi: 0.04, dropExtra: 0.06 };
    var bad149 = [];
    for (var f149 in EXP149F) if (Math.abs((sum149F[f149] || 0) - EXP149F[f149]) > 1e-9) bad149.push(f149 + '=' + (sum149F[f149] || 0));
    for (var c149 in EXP149C) if (Math.abs((sum149C[c149] || 0) - EXP149C[c149]) > 1e-9) bad149.push(c149 + '=' + (sum149C[c149] || 0));
    var n149 = Object.keys(C20_149).length + Object.keys(C8_149).length;
    ok('149', '28 人预算 = 批3 20 基线 + 扩容增量八字段（满档逐字段对表）',
      n149 === 28 && bad149.length === 0, bad149.join(','));

    /* #150 113 条 lint 带（事件池 §2.2 v1.11 强制 lint 之双书全池升级口径）：
     * karma 分级带 人8/地15/天25 · failE qiPct 下界 ≥−15% · 负 buff ≤24h（垂青 6 条 tags 独立通道另按 #170~#176） */
    var pool150 = all118.filter(function (ev) { return !(ev.tags && ev.tags.length); });
    var bad150 = [];
    var BAND150 = { ren: 8, di: 15, tian: 25 };
    pool150.forEach(function (ev) {
      ['right', 'evil', 'neutral'].forEach(function (bk) {
        var br = (ev.choices || {})[bk] || {};
        if (Math.abs(br.karma || 0) > BAND150[ev.tier]) bad150.push(ev.id + ':karma' + br.karma);
        (br.gain || []).forEach(function (g) {
          if (g.type === 'buff' && g.mult < 0 && g.hours > 24) bad150.push(ev.id + ':debuff' + g.hours);
        });
        var chks = br.check ? (Array.isArray(br.check) ? br.check : [br.check]) : [];
        chks.forEach(function (c) {
          var fe = c.failE;
          if (!fe) return;
          if (fe.qiPct != null) {
            var band = Array.isArray(fe.qiPct) ? fe.qiPct : [fe.qiPct, fe.qiPct];
            if (Math.min(band[0], band[1]) < -0.15 - 1e-9) bad150.push(ev.id + ':failE.qiPct');
          }
          if (fe.buff && fe.buff.mult < 0 && fe.buff.hours > 24) bad150.push(ev.id + ':failE.debuff' + fe.buff.hours);
        });
      });
    });
    ok('150', '117 条 lint 带（karma 人8/地15/天25 · failE ≥−15% · 负 buff ≤24h · 洗髓批 №125 与第卌四批 №126~128 入带； ambushFoe / stonesPct 已入白名单）',
      pool150.length === 114 && bad150.length === 0, 'n=' + pool150.length + ' bad=' + bad150.slice(0, 5).join(','));

    /* #151 二批 30 人十三字段增量对表（道友池卷 §五 登记 · 满档口径；单人单字段 ≤8%/≤4pp 带随附） */
    var C30_151 = { lihuayuan: 1, mojuren: 1, zhangtie: 1, yuzhitong: 1, wuyan: 1, wangchan: 1, xiangzhili: 1,
      chelaozu: 1, zuoyou: 1, liushiliu: 1, makuxuan: 1, weixian: 1, xieshi: 1, cuichan: 1, yufu: 1, wensheng: 1,
      zhuhe: 1, ruanqiong: 1, dongtianci: 1, yintianxia: 1, baidi: 1, gucan: 1, mupeiling: 1, chenqiaoyue: 1,
      chenlianyan: 1, yinyue: 1, hongfu: 1, yuanyao: 1, ruanxiu: 1, chenqingdu: 1 };
    var sum151F = {}, sum151C = {}, bad151 = [], solo151 = [];
    (D.COMPANIONS || []).forEach(function (c) {
      if (!C30_151[c.id]) return;
      var pk = c.perk || {};
      var full = (pk.perTier || 0) * 4;
      if (pk.field) {
        sum151F[pk.field] = (sum151F[pk.field] || 0) + full;
        if (pk.field !== 'tribFailLossMod' && Math.abs(full) > 0.08 + 1e-9) solo151.push(c.id + '=' + full);
        if (pk.field === 'tribFailLossMod' && Math.abs(full) > 0.04 + 1e-9) solo151.push(c.id + '=' + full);
      }
      if (pk.channel && pk.perTier) sum151C[pk.channel] = (sum151C[pk.channel] || 0) + full;
    });
    var EXP151F = { qiRate: 0.14, offlineEff: 0.22, stonesRate: 0.10, eventLuck: 0.22, shopCost: -0.04,
      combatPower: 0.22, combatSpeed: 0.18, artsSpeed: 0.08, dropRate: 0.14, tribFailLossMod: -0.02 };
    var EXP151C = { bottleneck: 0.10, debuffAll: 0.08, debuffXinmo: 0.08 };
    for (var f151 in EXP151F) if (Math.abs((sum151F[f151] || 0) - EXP151F[f151]) > 1e-9) bad151.push(f151 + '=' + (sum151F[f151] || 0));
    for (var c151 in EXP151C) if (Math.abs((sum151C[c151] || 0) - EXP151C[c151]) > 1e-9) bad151.push(c151 + '=' + (sum151C[c151] || 0));
    if (Object.keys(sum151F).length !== 10 || Object.keys(sum151C).length !== 3) bad151.push('fields=' + Object.keys(sum151F).length + '/' + Object.keys(sum151C).length);
    ok('151', '二批 30 人十三字段增量对表（满档合计 = §五 登记 + 单人 ≤8%/4pp 带）',
      bad151.length === 0 && solo151.length === 0, bad151.concat(solo151).join(','));

    /* #153 功法 70 部 #105 乘区零漂移对表（功法全录 v1.4 §2.7 联合验算表 = 对账基线）：
     * 🔧 第卅八批品阶强度重排换基线（阶梯 黄1/玄2/地3.5/天6，黄阶保持现值 ⇒ 终局通胀 2~3.3 倍）：
     *   top6 每级合计十二字段 60/60/50/39/35/34/16/17/13/9/0.065/−2 → **137.5/119.1/111/114.7/116/80/13/22.5/26/9/0.065/−2**；
     *   红线两类（tribBonus / realmCost）与 dropRate 一字未动 ⇒ 这三条仍是旧值，正是「重排没碰到红线」的证据。
     *   本表与 #105 上限、通用规范 §一 极限表、`FUSE.FIELD_CAP` 四处同动（改任一处必红其余三处）。 */
    var EXP153 = { combatPower: 1.375, qiRate: 1.191, offlineEff: 1.11, combatSpeed: 1.147, qiCap: 1.16,
      stonesRate: 0.80, artsSpeed: 0.13, eventLuck: 0.225, eventRate: 0.26, dropRate: 0.09,
      tribBonus: 0.0325, realmCost: -0.02 };
    var per153 = {};
    for (var id153 in SQ.XARTS) {
      var ef153 = SQ.XARTS[id153].effects;
      for (var k153 in ef153) (per153[k153] = per153[k153] || []).push(ef153[k153]);
    }
    var bad153 = [];
    for (var f153 in EXP153) {
      var top153 = (per153[f153] || []).slice().sort(function (a, b) { return b - a; }).slice(0, 6);
      var sum153 = top153.reduce(function (s153, v) { return s153 + v; }, 0);
      if (Math.abs(sum153 - EXP153[f153]) > 1e-9) bad153.push(f153 + '=' + sum153.toFixed(4) + '/' + EXP153[f153]);
    }
    var ids153 = Object.keys(SQ.XARTS);
    var al153 = { right: 0, neutral: 0, evil: 0 };
    ids153.forEach(function (id) { al153[SQ.XARTS[id].alignment]++; });
    ok('153', '功法 70 部 top6 每级合计零漂移对表（十二字段 + 阵营 25/26/19）',
      ids153.length === 70 && bad153.length === 0 && al153.right === 25 && al153.neutral === 26 && al153.evil === 19,
      'n=' + ids153.length + ' ' + bad153.join(',') + ' al=' + JSON.stringify(al153));

    /* #154 法宝 46 件 + 名录 58 格节内滚动定稿 + 镇魔链满阶 −2.5pp（二批 B/A5 收口口径）。
     * 节内滚动 = 浮层容器 #mbd-body 自带 max-height:62vh + overflow-y:auto（view/index.html:913，零改动即满足——
     * 定稿证据为静态容器样式，物理核对见恢复批收口记录；本断言核数据侧）。 */
    var XT154 = pack.treasures;
    var x18_154 = XT154.byId['x18'], h19_154 = XT154.byId['h19'];
    var comp154 = (D.COMPANIONS || []).length;
    var spouse154 = (D.COMPANIONS || []).filter(function (c) { return c.category === 'spouse'; }).length;
    ok('154', '法宝 46 件（x19+h27）+ 名录 58 格（候选 14）+ 镇魔链 5 阶 −2.5pp / 紫金钟 3 级 −3pp',
      XT154.LIST.length === 46 && comp154 === 58 && spouse154 === 14 &&
      x18_154.MAX_STAGE === 5 && x18_154.scaled['mult:tribFailLossMod'][1] === -0.025 &&
      h19_154.MAX_LV === 3 && h19_154.scaled['mult:tribFailLossMod'][1] === -0.03,
      'T=' + XT154.LIST.length + ' comp=' + comp154 + '/' + spouse154);

    /* ═══ 天道系统批（v1.19 · 天道设计 v1.1 §十 · #181~#196）═══
     * 全链路：问天（香火/冷却/档位预掷）→ 奏疏（500~800 字）→ 圣旨解析（三层容错+白名单+clamp+幂等）
     * → 领旨（15 型通道）/ 抗旨（逆天值）→ 天睐天怒 → 逆天大劫 → 天象队列。
     * 红线复核：p 公式主体 / TRIB_P_CLAMP / REALMS / mods FIELDS 零改动；接旨与天象不进 tick。 */
    var TD = D.TIANDAO;
    var origRandom181 = Math.random;
    function mkTdWs(ov) {
      var w = pack.initialState();
      w.stones = 5000;
      if (ov) Object.assign(w, ov);
      return w;
    }
    function mkTdCtx() { return { log: function () {}, now: Date.now(), profile: { talents: [] } }; }
    function modsTd(w) { return SQ.Mods.collect({ talents: [] }, w, pack, D); }
    var tdSeq = 0;
    function decObj(type, tier, payload, hex) {
      return { decreeId: 'td-smoke-' + (++tdSeq), hexagram: hex || '问劫', tier: tier || '天机',
        type: type, payload: payload || {}, verdict: '测试判词', omen: '测试谶语' };
    }
    function sanTd(dec, w) { return SQ.Tiandao.sanitize(dec, w || mkTdWs(), pack, D, Date.now()); }

    /* #181 白名单：type 不在 §4.2 枚举内 → 整旨拒绝降级谶语档（零效果） */
    var raw181 = '好的，这是您要的 JSON：\n```json\n' + JSON.stringify({
      decreeId: 'td-x-1', hexagram: '问劫', tier: '敕令', type: '不存在旨意',
      payload: { stones: 999999 }, verdict: 'v', omen: 'o'
    }) + '\n```\n以上，退下吧。';
    var d181 = SQ.Tiandao.parseReply(raw181, mkTdWs(), pack, D, Date.now());
    ok('181', '解析器白名单生效：枚举外 type 整旨拒绝降级谶语档',
      d181.type === 'prophecy' && Object.keys(d181.payload).length === 0);

    /* #182 三层容错：围栏 + 前后缀杂讯剥壳提取第一个 {...} */
    var raw182 = '好嘞，老夫这就赐你一道旨意：\n```json\n' + JSON.stringify({
      decreeId: 'td-x-2', hexagram: '问劫', tier: '敕令', type: '天心护佑',
      payload: { tribBonus: 0.02 }, verdict: '哼。', omen: '劫云偏东。'
    }) + '\n```\n拿去吧，别谢老夫。';
    var d182 = SQ.Tiandao.parseReply(raw182, mkTdWs(), pack, D, Date.now());
    ok('182', '三层容错：markdown 围栏与前后缀杂讯正确剥壳提取',
      d182.type === 'bless' && d182.payload.tribBonus === 0.02 && d182.decreeId === 'td-x-2');

    /* #183 fuzz 100 条脏输入零崩溃 + 彻底失败降级「天机紊乱」谶语档 */
    var crash183 = 0, bad183 = 0;
    var dirt183 = ['', 'null', '[]', '{}', '你好世界', '{"a":', '{}}{', '```', '{"type":123}',
      '{"decreeId":null,"hexagram":9,"tier":{},"type":[],"payload":"x","verdict":{},"omen":3}',
      '{"decreeId":"td-f","hexagram":"问劫","tier":"稀","type":"谶语","payload":null,"verdict":"x","omen":"y"}',
      String.fromCharCode(0), '｛"type":"天心护佑"｝'];
    for (var fi = 0; fi < 100; fi++) {
      try {
        var inp183 = dirt183[fi % dirt183.length];
        var df183 = SQ.Tiandao.parseReply(typeof inp183 === 'string' ? inp183 + fi : inp183, mkTdWs(), pack, D, Date.now());
        if (!df183 || typeof df183.type !== 'string' || !df183.decreeId) bad183++;
      } catch (e) { crash183++; }
    }
    var d183 = SQ.Tiandao.parseReply('完全不是 JSON 的一段闲话', mkTdWs(), pack, D, Date.now());
    ok('183', 'fuzz 100 条脏输入零崩溃：彻底失败降级谶语档不抛异常',
      crash183 === 0 && bad183 === 0 && d183.type === 'prophecy' && d183.degraded === true,
      'crash=' + crash183 + ' bad=' + bad183);

    /* #184 payload 越界 clamp（宽进严数值：clamp 后照常生效不整旨拒绝） */
    var c184a = sanTd(decObj('天心护佑', '敕令', { tribBonus: 0.05 }, '问劫'));
    var c184b = sanTd(decObj('天罚', '敕令', { mult: -0.30, hours: 99 }, '问劫'));
    var c184c = sanTd(decObj('因果簿', '敕令', { karma: 40 }, '问劫'));
    var c184d = sanTd(decObj('情缘牵引', '敕令', { bond: 9 }, '问缘'));
    ok('184', 'payload clamp：+0.05→0.03 / −30%→−20%（≤24h）/ +40→+10 / +9→+5',
      c184a.payload.tribBonus === 0.03 && c184b.payload.mult === -0.20 && c184b.payload.hours === 24 &&
      c184c.payload.karma === 10 && c184d.payload.bond === 5);

    /* #185 seenIds 幂等（领后重领 / 领后重抗均无效） */
    var w185 = mkTdWs();
    var dd185 = sanTd(decObj('天恩·赐财', '敕令', { stones: 100 }, '问财'));
    var r185a = SQ.Tiandao.accept(w185, pack, D, modsTd(w185), dd185, Date.now(), mkTdCtx());
    var stones185 = w185.stones;
    var r185b = SQ.Tiandao.accept(w185, pack, D, modsTd(w185), dd185, Date.now(), mkTdCtx());
    var r185c = SQ.Tiandao.defyDecree(w185, pack, D, dd185, Date.now(), mkTdCtx());
    ok('185', 'seenIds 幂等：同 decreeId 重复接旨无效果且拒绝（此旨已领）',
      r185a.ok === true && r185a.gains.stones === 100 && r185b.ok === false && r185b.reason === 'seen' &&
      r185c.reason === 'seen' && w185.stones === stones185 && w185.tiandao.defy === 0 &&
      w185.ledger.in.event === 100);

    /* #186 问天冷却（读 ASK_CD_MS）：冷却内拒绝（奏疏不生成、香火不扣），过点放行 */
    var w186 = mkTdWs({ stones: 3000 });
    var t186 = Date.now(), cd186 = D.TIANDAO.ASK_CD_MS;
    var a186a = SQ.Tiandao.ask(w186, pack, D, { talents: [] }, 'wenjie', 1, '', t186);
    var stones186 = w186.stones;
    var a186b = SQ.Tiandao.ask(w186, pack, D, { talents: [] }, 'wenjie', 1, '', t186 + cd186 - 1);
    var cool186 = a186b.ok === false && a186b.reason === 'cooldown' && w186.stones === stones186 && !a186b.text;
    var a186c = SQ.Tiandao.ask(w186, pack, D, { talents: [] }, 'wenjie', 1, '', t186 + cd186 + 1);
    ok('186', '问天冷却 ' + (cd186 / 3600000) + 'h：冷却内拒绝（奏疏不生成香火不扣），过点放行',
      a186a.ok === true && stones186 === 2900 && cool186 && a186c.ok === true && w186.ledger.out.donate === 200);

    /* #187 香火档位权重迁移（RARE_SHIFT 0/2/3/5） */
    var wts187 = [0, 1, 2, 3].map(function (i) { return SQ.Tiandao.weightsOf(D, i).join('/'); });
    ok('187', '香火四档权重 70/25/5 → 68/25/7 → 67/25/8 → 65/25/10',
      wts187[0] === '70/25/5' && wts187[1] === '68/25/7' && wts187[2] === '67/25/8' && wts187[3] === '65/25/10',
      wts187.join(','));

    /* #188 逆天值累积：天机/敕令/稀 +10/+15/+25；魔道 ×1.5 向下取整（敕令 22） */
    var w188 = mkTdWs();
    SQ.Tiandao.defyDecree(w188, pack, D, sanTd(decObj('天机·劫数预告', '天机', {}, '问劫')), Date.now(), mkTdCtx());
    SQ.Tiandao.defyDecree(w188, pack, D, sanTd(decObj('天心护佑', '敕令', { tribBonus: 0.01 }, '问劫')), Date.now(), mkTdCtx());
    SQ.Tiandao.defyDecree(w188, pack, D, sanTd(decObj('敕赐奇遇', '稀', {}, '问境')), Date.now(), mkTdCtx());
    var w188e = mkTdWs({ karma: -500 });
    var r188e = SQ.Tiandao.defyDecree(w188e, pack, D, sanTd(decObj('天心护佑', '敕令', { tribBonus: 0.01 }, '问劫')), Date.now(), mkTdCtx());
    ok('188', '逆天值累积 10/15/25 + 魔道 ×1.5 向下取整（敕令=22）',
      w188.tiandao.defy === 50 && r188e.gain === 22 && w188e.tiandao.defy === 22);

    /* #189 档位修正只在渡劫结算窗口：talent 加项读点生效，结算后档位态清空、defy 保留 */
    var w189 = mkTdWs({ realm: 1 });
    w189.tiandao.defy = 29;
    SQ.Tiandao.defyDecree(w189, pack, D, sanTd(decObj('天机·劫数预告', '天机', {}, '问劫')), Date.now(), mkTdCtx());
    var m189a = SQ.Tiandao.tribModOf(w189, D);
    w189.tiandao.defy = 59;
    SQ.Tiandao.defyDecree(w189, pack, D, sanTd(decObj('天机·财路', '天机', {}, '问财')), Date.now(), mkTdCtx());
    var m189b = SQ.Tiandao.tribModOf(w189, D);
    var info189 = pack.worldSystems.tribInfo(w189, pack, D, modsTd(w189));
    SQ.Tiandao.onTribSettled(w189, pack, D, true, Date.now(), mkTdCtx());
    var m189c = SQ.Tiandao.tribModOf(w189, D);
    ok('189', '天睐−0.01/天怒−0.02 talent 加项读点生效，结算后档位清空 defy 保留',
      m189a === -0.01 && Math.abs(m189b + 0.03) < 1e-9 && info189.parts.tiandao === -0.03 &&
      Math.abs(info189.parts.talent - (info189.parts.talent)) === 0 &&
      m189c === 0 && w189.tiandao.defy === 69 && w189.tiandao.armed.lai === false);

    /* #190 逆天大劫：defy≥100 解锁、base=0.35、常规加成有效、clamp [0.05,0.95] 不变 */
    var w190 = mkTdWs({ realm: 9 });
    var lock190 = SQ.Tiandao.tryNijie(w190, pack, D, modsTd(w190), Date.now(), mkTdCtx());
    w190.tiandao.defy = 100;
    var info190 = SQ.Tiandao.nijieInfo(w190, pack, D, modsTd(w190));
    w190.buffs.push({ field: 'tribBonus', mult: 5, until: Date.now() + 9999999 });
    var info190b = SQ.Tiandao.nijieInfo(w190, pack, D, modsTd(w190));
    ok('190', '逆天大劫 base=0.35 常规加成有效 clamp 不变，解锁阈值 defy≥100',
      lock190.ok === false && lock190.reason === 'lock' && info190.parts.base === 0.35 &&
      info190b.p <= D.TRIB_P_CLAMP[1] && info190.p >= D.TRIB_P_CLAMP[0] && info190b.parts.base === 0.35);

    /* #191 渡过三件发放：title + 永久 qiRate+5%（来源 tiandao）+ 逆天盾 retain 一次渡劫失败 */
    var w191 = mkTdWs({ realm: 4 });
    w191.tiandao.defy = 100;
    Math.random = function () { return 0.0; };
    var r191 = SQ.Tiandao.tryNijie(w191, pack, D, modsTd(w191), Date.now(), mkTdCtx());
    Math.random = origRandom181;
    var m191 = modsTd(w191);
    w191.qi = 999999;
    var qi191 = w191.qi;
    Math.random = function () { return 0.999999; };
    var tr191 = SQ.Realm.tryBreakthrough(w191, pack, D, modsTd(w191), Date.now(), mkTdCtx());
    Math.random = origRandom181;
    ok('191', '逆天大劫成功三件发放 + 逆天盾 retain 一次渡劫失败后消耗',
      r191.ok && r191.success && w191.tiandao.title === true && w191.tiandao.shield === false &&
      Math.abs(((m191.detail.qiRate || {}).tiandao || 0) - 0.05) < 1e-9 &&
      tr191.result === 'fail' && tr191.shield === true && w191.qi === qi191 && w191.realm === 4);

    /* #192 失败：defy 清零 + 天罚·重 qiRate −20%/48h，不扣修为不推进境界、可重新积累 */
    var w192 = mkTdWs({ realm: 4 });
    w192.tiandao.defy = 120;
    Math.random = function () { return 0.999999; };
    var r192 = SQ.Tiandao.tryNijie(w192, pack, D, modsTd(w192), Date.now(), mkTdCtx());
    Math.random = origRandom181;
    var buf192 = (w192.buffs || []).filter(function (b) { return b.source === 'tiandaoNijie'; })[0];
    var lock192 = SQ.Tiandao.tryNijie(w192, pack, D, modsTd(w192), Date.now(), mkTdCtx());
    ok('192', '逆天大劫失败：defy 清零 + 天罚·重 −20%/48h 挂 buff，零修为零境界变动',
      r192.ok && !r192.success && w192.tiandao.defy === 0 && !!buf192 && buf192.field === 'qiRate' &&
      buf192.mult === -0.20 && buf192.until > Date.now() + 47 * 3600000 && w192.realm === 4 && w192.qi === 0 &&
      lock192.reason === 'lock');

    /* #193 天象队列容量 3 溢出挤最旧；未览红点、览后消 */
    var w193 = mkTdWs();
    var zone1Name = SQ.t('combat.zone.1', null, 'xiuxian');
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 1 }, Date.now());
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 2 }, Date.now());
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 3 }, Date.now());
    SQ.Tiandao.pushOmen(w193, pack, D, 'clear', { z: 4 }, Date.now());
    var un193 = SQ.Tiandao.unseenOmens(w193);
    SQ.Tiandao.markOmensSeen(w193);
    ok('193', '天象队列容量 3 溢出挤最旧；未览挂红点览后消',
      w193.tiandao.omenQueue.length === 3 && un193 === 3 && SQ.Tiandao.unseenOmens(w193) === 0 &&
      !w193.tiandao.omenQueue.some(function (o) { return o.text.indexOf(zone1Name) >= 0; }));

    /* #194 编年史字段完备（≤10 大事 + 四项累计统计）且奏疏总长 500~800 字 */
    var w194 = mkTdWs({ realm: 3, stones: 1000 });
    w194.tribulation.attempts = 5; w194.tribulation.success = 2;
    w194.cleared = [0, 1, 2];
    w194.tiandao.stats = { accept: 2, defy: 1 };
    for (var ci = 0; ci < 12; ci++) SQ.Tiandao.chronPush(w194, 'clear', { z: ci % 4 }, Date.now() + ci);
    var ask194 = SQ.Tiandao.ask(w194, pack, D, { talents: [] }, 'wenjie', 0, '', Date.now());
    ok('194', '编年史 ≤10 条 + 四项统计入奏疏，总长 500~800 字',
      w194.tiandao.chron.length === 10 && ask194.ok === true &&
      ask194.text.length >= TD.MEMO_LEN[0] && ask194.text.length <= TD.MEMO_LEN[1] &&
      ask194.text.indexOf(SQ.t('tiandao.memo.chronhead', null, 'xiuxian')) >= 0 &&
      /* 契约必需行（卦位作用域 + 香火档位）压缩时不得被丢弃（pri 9 高于状态摘要与范本） */
      ask194.text.indexOf(SQ.t('tiandao.hex.wenjie', null, 'xiuxian')) >= 0 &&
      ask194.text.indexOf(SQ.t('tiandao.memo.incense', { n: '0', tier: SQ.t('tiandao.tier.' + ask194.tier, null, 'xiuxian') }, 'xiuxian')) >= 0,
      'len=' + (ask194.text || '').length);

    /* #195 本地模拟天道（V1.5）：同契约同校验器；烧空表返回「天机不可尽泄」类通用判词零机制 */
    var w195 = mkTdWs({ stones: 3000 });
    var ask195 = SQ.Tiandao.ask(w195, pack, D, { talents: [] }, 'wenjie', 0, '', Date.now());
    var dl195 = SQ.Tiandao.localDecree(w195, pack, D, Date.now());
    var validTypes195 = TD.DECREES.map(function (x) { return x.id; });
    var r195a = SQ.Tiandao.accept(w195, pack, D, modsTd(w195), dl195, Date.now(), mkTdCtx());
    var r195b = SQ.Tiandao.accept(w195, pack, D, modsTd(w195), dl195, Date.now(), mkTdCtx());
    var w195b = mkTdWs({ stones: 3000 });
    SQ.Tiandao.ask(w195b, pack, D, { talents: [] }, 'blank', 0, '我什么时候能飞升？', Date.now());
    var db195 = SQ.Tiandao.localDecree(w195b, pack, D, Date.now());
    var s195 = w195b.stones, q195 = w195b.qi, k195 = w195b.karmaEventScore;
    SQ.Tiandao.accept(w195b, pack, D, modsTd(w195b), db195, Date.now(), mkTdCtx());
    var blanks195 = [];
    for (var bi = 1; bi <= 5; bi++) blanks195.push(SQ.t('tiandao.blank.' + bi, null, 'xiuxian'));
    ok('195', '本地模拟天道同契约同校验器：白名单/seenIds 生效；烧空表通用判词零机制',
      ask195.ok && validTypes195.indexOf(dl195.type) >= 0 && dl195.hexagram === 'wenjie' &&
      r195a.ok === true && r195b.reason === 'seen' &&
      db195.type === 'prophecy' && blanks195.indexOf(db195.verdict) >= 0 &&
      w195b.stones === s195 && w195b.qi === q195 && w195b.karmaEventScore === k195);

    /* #196 normalize 幂等（旧档补默认、脏档清理零崩溃）+ 红线零改动回归 */
    var dirty196 = {
      lastAskAt: -5, defy: 'x', seenIds: [1, 'a', 'a', null], omenQueue: [{ node: 'bad' }, { node: 'tribwin' }],
      history: [{ type: 'nope' }, { type: 'bless', act: 'nope' }, { id: 'td-1', type: 'bless', act: 'accept', at: 5, tier: 'rare' }],
      title: 'yes', shield: 1, nextTrib: 99, armed: { lai: 'x' }, ask: { hex: 'nope' }, chron: 'x', stats: { accept: -3 }
    };
    var n196a = SQ.Tiandao.normalize(dirty196, D);
    var n196b = SQ.Tiandao.normalize(n196a, D);
    var w196 = pack.normalize(Object.assign(pack.initialState(), { tiandao: dirty196 }));
    var w196old = pack.normalize(pack.initialState());   /* 旧档无 tiandao 字段 → 全默认 */
    var zero196 = D.REALMS.length === 10 && D.REALMS[9].tribBase === 0.22 &&
      D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 && SQ.Mods.FIELDS.length === 17;
    ok('196', '天道 normalize 幂等 + 脏档清理零崩溃 + p 公式/CLAMP/REALMS/FIELDS 零改动',
      JSON.stringify(n196a) === JSON.stringify(n196b) && n196a.defy === 0 && n196a.seenIds.join() === 'a' &&
      n196a.omenQueue.length === 0 && n196a.history.length === 1 && n196a.title === false &&
      n196a.nextTrib <= TD.TRIB_MOD_RANGE[1] * 4 + 1e-9 && n196a.ask === null && n196a.stats.accept === 0 &&
      !!w196.tiandao && w196old.tiandao.defy === 0 && zero196);

    /* ═══ 六向长线批（v1.24 · 六卷 §验收 · #197~#224）═══
     * 轮回（#197~#202）→ 图鉴传记（#203~#206）→ 炼丹炼器（#207~#211）→
     * 同代天骄（#212~#215）→ 融合器灵（#216~#219）→ 自立门户（#220~#224）。
     * 红线：p 公式/CLAMP/REALMS/FIELDS/ARTS_COST 零改动；遗泽不进 Ledger；玩家数值轴零漂移；
     * sim-pacing 稳态带复跑由 sim 脚本独立验证（meta 层零 tick 侵入实证）。 */
    var LGc = D.LEGACY, CXc = D.CODEX, ALc = D.ALCHEMY, PDc = D.PRODIGY, FUc = D.FUSE, SPsc = D.SPIRIT, SCc = D.SECT;
    function mkMeta(ov) { var mm = SQ.Legacy.metaBlank(); if (ov) Object.assign(mm, ov); return mm; }
    function identOk(mm) {
      var e2 = 0, sp2 = 0, k3;
      for (k3 in mm.earnedKeys) e2 += mm.earnedKeys[k3];
      for (k3 in mm.spent) sp2 += mm.spent[k3];
      return mm.karma === e2 - sp2;
    }
    function byteLen(o) {
      var st2 = typeof o === 'string' ? o : JSON.stringify(o), nb = 0;
      for (var bi2 = 0; bi2 < st2.length; bi2++) { var bc = st2.charCodeAt(bi2); nb += bc > 0x7ff ? 3 : (bc > 0x7f ? 2 : 1); }
      return nb;
    }

    /* #197 遗泽恒等式与幂等（轮回卷 §十） */
    var m197 = mkMeta();
    var g197a = SQ.Legacy.earnOnce(m197, 'zone.0', 10, 'settle', 1);
    var g197b = SQ.Legacy.earnOnce(m197, 'zone.0', 10, 'settle', 2);          /* 幂等键重复 → 0 */
    var g197c = SQ.Legacy.earnDelta(m197, 'realmMax', 30, 0.7, 'settle', 3);  /* +21 */
    var g197d = SQ.Legacy.earnDelta(m197, 'realmMax', 20, 0.7, 'settle', 4);  /* +14 累计 35 */
    var g197e = SQ.Legacy.earnImmediate(m197, 'achv_jichu', 2, 'achv', 5);
    var k197 = m197.karma;                                                     /* 47 */
    m197.karma = 999;                                                          /* 人为破坏 */
    m197 = SQ.Legacy.metaNormalize(m197);                                      /* 恒等式自检修复 → 后续用修复对象 */
    var f197 = m197;
    var sp197a = SQ.Legacy.spend(m197, 'shop.heir', 600, 6);                   /* poor（47<600） */
    SQ.Legacy.earnOnce(m197, 'boss.0', 600, 'settle', 7);
    var sp197b = SQ.Legacy.spend(m197, 'shop.heir', 600, 8);
    var sp197c = SQ.Legacy.spend(m197, 'shop.heir', 600, 9);                   /* dup 不二次扣 */
    ok('197', '遗泽恒等式与幂等：karma===ΣearnedKeys−Σspent；重复键/重复购买零重复入账；差额补分逐行 floor；脏账自检修复',
      g197a === 10 && g197b === 0 && g197c === 21 && g197d === 14 && g197e === 2 && k197 === 47 &&
      m197.earnedKeys.realmMax === 35 && f197.karma === 47 && identOk(f197) &&
      sp197a.reason === 'poor' && sp197b.ok === true && sp197c.reason === 'dup' &&
      m197.karma === 47 && identOk(m197) && m197.stats.immThisLife === 2,
      JSON.stringify([g197a, g197b, g197c, g197d, g197e, k197, f197.karma, sp197a.reason, sp197b.ok, sp197c.reason, m197.karma, identOk(m197), m197.stats.immThisLife]));

    /* #198 飞升大劫（独立终局劫 base 0.25 · 满额转世 · 跨世只计一次） */
    localStorage.removeItem(SQ.KEY);
    var ref198 = {};
    await SQ.mutate(ref198, function (s198) {
      s198.profile = mkProf([]);
      s198.worlds.xiuxian = pack.initialState();
      var w = s198.worlds.xiuxian;
      w.realm = 9; w.cleared = [0, 1]; w.artsKnown.push('tuna'); w.artsLevels.tuna = 9;
      w.tribulation.success = 5;
      pack.recalcDerived(w, s198.profile);
      w.qi = SQ.Idle.capOf(w, pack, D, SQ.Mods.collect(s198.profile, w, pack, D));
    });
    var w198 = ref198.worlds.xiuxian, now198 = Date.now();
    var chk198ok = SQ.Legacy.canFeisheng(w198, pack, D, ref198.meta, now198, ref198.profile);
    var chk198r = SQ.Legacy.canFeisheng(Object.assign({}, w198, { realm: 8 }), pack, D, ref198.meta, now198, ref198.profile);
    var chk198q = SQ.Legacy.canFeisheng(Object.assign({}, w198, { qi: 0 }), pack, D, ref198.meta, now198, ref198.profile);
    var chk198c = SQ.Legacy.canFeisheng(Object.assign({}, w198, { feishengCd: now198 + 1000 }), pack, D, ref198.meta, now198, ref198.profile);
    var info198 = SQ.Legacy.feishengInfo(w198, pack, D, SQ.Mods.collect(ref198.profile, w198, pack, D));
    var qi198 = w198.qi, stw198 = w198.tribulation.success;
    var r198f = (function () { var rs = stubRandom([0.999]); var r = SQ.Legacy.doFeisheng(ref198, now198); rs(); return r; })();
    var failOk198 = r198f.ok && r198f.success === false && w198.feishengCd === now198 + LGc.FEISHENG_CD_MS &&
      w198.qi === qi198 && w198.tribulation.success === stw198 && w198.realm === 9;
    w198.feishengCd = 0;
    var r198s = (function () { var rs = stubRandom([0.0]); var r = SQ.Legacy.doFeisheng(ref198, now198 + 1); rs(); return r; })();
    var ws198n = ref198.worlds.xiuxian;
    var asc198 = r198s.ok === true && r198s.success === true && ws198n.realm === 0 && ref198.profile.name === '' &&
      ref198.meta.stats.lives === 1 && ref198.meta.stats.ascensions === 1 &&
      ref198.meta.earnedKeys.ascend === 200 && ref198.meta.biographies.length === 1 && identOk(ref198.meta);
    var pv198b = SQ.Legacy.preview(ws198n, ref198.meta, pack, D, 'feisheng', now198 + 2);
    var ascLine198 = null;
    pv198b.lines.forEach(function (ln) { if (ln.key === 'ascend') ascLine198 = ln; });
    ok('198', '飞升大劫：真仙盈满/CD 三态解锁 + base 0.25 常规加成有效 clamp 不变 + 失败不扣修为不计连败 24h 可重试 + 成功满额转世、飞升 200 跨世只计一次',
      chk198ok.ok === true && chk198r.reason === 'realm' && chk198q.reason === 'qi' && chk198c.reason === 'cd' &&
      !!info198 && info198.parts.base === 0.25 && info198.p >= D.TRIB_P_CLAMP[0] && info198.p <= D.TRIB_P_CLAMP[1] &&
      failOk198 && asc198 && !!ascLine198 && ascLine198.owned === true && ascLine198.got === 0);

    /* #199 兵解转世（×0.7 只作用于结算折分项 · 逐行 floor · 即时项不折损） */
    localStorage.removeItem(SQ.KEY);
    var ref199 = {};
    await SQ.mutate(ref199, function (s199) {
      s199.profile = mkProf([]);
      s199.worlds.xiuxian = pack.initialState();
      s199.worlds.xiuxian.realm = 5;
    });
    var w199 = ref199.worlds.xiuxian;
    var chk199r = SQ.Legacy.canBingjie({ realm: 3 }, D);
    var chk199ok = SQ.Legacy.canBingjie(w199, D);
    var imm199a = ref199.meta.stats.immThisLife || 0;      /* mutate 内 scan 已发过境界成就——取基线 */
    SQ.Legacy.earnImmediate(ref199.meta, 'codex.ms.test199.50', 2, 'milestone', 1);
    var pv199 = SQ.Legacy.preview(w199, ref199.meta, pack, D, 'bingjie', Date.now());
    var rl199 = null;
    pv199.lines.forEach(function (ln) { if (ln.key === 'realmMax') rl199 = ln; });
    var r199 = SQ.Legacy.doBingjie(ref199, Date.now());
    ok('199', '兵解转世：化神境起解锁；×0.7 只作用结算折分项且逐行 floor（150→105）；即时入账项不折损不追回',
      chk199r.reason === 'realm' && chk199ok.ok === true && pv199.mult === 0.7 &&
      !!rl199 && rl199.nominal === 150 && rl199.got === 105 && pv199.immediate === imm199a + 2 &&
      r199.ok && r199.success === true && ref199.meta.stats.dissolutions === 1 && ref199.meta.stats.lives === 1 &&
      ref199.meta.earnedKeys.realmMax === 105 && identOk(ref199.meta),
      JSON.stringify([chk199r.reason, chk199ok.ok, pv199.mult, rl199 && rl199.nominal, rl199 && rl199.got, pv199.immediate, imm199a, r199.ok, ref199.meta.stats.dissolutions, ref199.meta.stats.lives, ref199.meta.earnedKeys.realmMax, identOk(ref199.meta)]));

    /* #200 继承/重置矩阵（复用 ref198 飞升后态：转世前 scan 已入录 codices） */
    var cod200 = ref198.meta.codices;
    var inh200 = (cod200.zone || []).indexOf('z0') >= 0 && (cod200.art || []).indexOf('tuna') >= 0 &&
      ref198.meta.stats.lives === 1 && ref198.meta.biographies.length === 1 && identOk(ref198.meta);
    var ws200 = ref198.worlds.xiuxian, fresh200 = pack.initialState();
    var res200 = ws200.realm === 0 && ws200.qi === fresh200.qi && ws200.stones === fresh200.stones &&
      ws200.artsKnown.join() === fresh200.artsKnown.join() && (ws200.treasures.owned || []).length === 0 &&
      ws200.factionId === null && Object.keys(ws200.bonds || {}).length === 0 &&
      (ws200.cleared || []).length === 0 && (ws200.prodigies || []).length === 0 &&
      Object.keys(ws200.materials || {}).length === 0 && ws200.sect === null;
    ok('200', '继承/重置矩阵：meta 层（图鉴/传记/遗泽账/统计）完整保留；ws 层境界修为灵石功法法宝势力道友秘境材料宗门全重置缺省',
      inh200 && res200 && ref198.profile.talents.length === 0 && ref198.profile.legacyTalents.length === 0);

    /* #201 遗泽不进 Ledger + spent 幂等 + pendingRebirth 中断恢复重放零双计 */
    localStorage.removeItem(SQ.KEY);
    var ref201 = {};
    await SQ.mutate(ref201, function (s201) {
      s201.profile = mkProf([]);
      s201.worlds.xiuxian = pack.initialState();
      s201.worlds.xiuxian.realm = 5;
    });
    var w201 = ref201.worlds.xiuxian;
    var led201 = JSON.stringify(w201.ledger);
    SQ.Legacy.earnImmediate(ref201.meta, 'achv_jindan', 2, 'achv', 1);
    SQ.Legacy.earnOnce(ref201.meta, 'zone.0', 200, 'settle', 2);
    SQ.Legacy.spend(ref201.meta, 'shop.heir', 5, 3);
    var ledSame201 = JSON.stringify(w201.ledger) === led201;
    var buy201a = SQ.Legacy.buy(ref201, 'qirate.1', 4);
    var k201 = ref201.meta.karma;
    var buy201b = SQ.Legacy.buy(ref201, 'qirate.1', 5);
    var k201b = ref201.meta.karma;                          /* dup 拒绝后即时快照（ok 求值延迟陷阱） */
    ref201.meta.pendingRebirth = { channel: 'bingjie', at: 6, expectLives: (ref201.meta.stats.lives || 0) + 1, bio: null, total: 0 };
    SQ.Legacy.sync(ref201, 7);
    var lives201a = ref201.meta.stats.lives, karma201a = ref201.meta.karma;
    var pend201 = ref201.meta.pendingRebirth === null && ref201.worlds.xiuxian.realm === 0;
    var ek201a = JSON.stringify(ref201.meta.earnedKeys);
    var achv201a = ref201.meta.achv.length;
    ref201.meta.pendingRebirth = { channel: 'bingjie', at: 6, expectLives: lives201a, bio: null, total: 0 };
    SQ.Legacy.sync(ref201, 8);
    if (ref201.meta.karma !== karma201a) {
      var ekA = JSON.parse(ek201a), ekB = ref201.meta.earnedKeys, diffs = [];
      for (var dk in ekB) if (ekB[dk] !== ekA[dk]) diffs.push(dk + ':' + ekA[dk] + '->' + ekB[dk]);
      console.log('LEAK201', JSON.stringify(diffs.slice(0, 8)), 'achv', achv201a, '->', ref201.meta.achv.length);
    }
    ok('201', '遗泽不进 Ledger（零流水 #113 回归不变）；商店 spent 幂等同键重放不二次扣款；pendingRebirth 中断恢复续做且重放零重复入账',
      ledSame201 && buy201a.ok === true && buy201b.reason === 'dup' && k201b === k201 &&
      lives201a === 1 && pend201 && ref201.meta.stats.lives === 1 && ref201.meta.karma === karma201a &&
      identOk(ref201.meta),
      JSON.stringify([ledSame201, buy201a.ok, buy201b.reason, k201b === k201, lives201a, pend201, ref201.meta.stats.lives, ref201.meta.karma, karma201a, identOk(ref201.meta)]));

    /* #202 meta normalize 幂等 + 红线零改动回归 */
    var raw202 = {
      profile: { name: '旧档', talents: [], worldId: 'xiuxian', worldName: 'w', createdAt: 1, alignBias: 'neutral' },
      worlds: { xiuxian: pack.initialState() },
      meta: { unlockedWorlds: ['xiuxian'] },
      settings: {}
    };
    var n202 = SQ.normalize(raw202);
    var old202 = !!n202.meta && !!n202.meta.earnedKeys && !!n202.meta.codices && !!n202.meta.stats &&
      Array.isArray(n202.meta.achv) && Array.isArray(n202.meta.titles) && Array.isArray(n202.meta.biographies) &&
      !!n202.meta.unlocks && n202.meta.unlocks.sect === false && n202.meta.karma === 0;
    var n202b = SQ.Legacy.metaNormalize({ karma: 999, earnedKeys: { 'zone.0': 10, bad: 'x' }, spent: { a: 5 },
      codices: { event: 'notarray', art: ['a', 1, null] }, achv: [1, 'achv_jichu'], titles: 'x',
      biographies: [{ text: 123 }, { text: 'ok', life: 1 }], unlocks: { alchemy: 'yes' }, stats: { lives: 'x' } });
    var n202c = SQ.Legacy.metaNormalize(n202b);
    var zero202 = D.REALMS.length === 10 && D.REALMS[9].tribBase === 0.22 &&
      D.TRIB_P_CLAMP[0] === 0.05 && D.TRIB_P_CLAMP[1] === 0.95 && SQ.Mods.FIELDS.length === 17 &&
      /* 等级起点批（入门即 Lv1）：ARTS_COST **有意改档**——删掉原 Lv0→1 那档 60，表长 9 → 8，
       * 其余八档价格一字未动；判据同时钉「表长 = ARTS_MAX_LV − 1」，防将来又漂出第九条。 */
      D.ARTS_COST.join() === '240,900,3200,11000,36000,120000,400000,1300000' &&
      D.ARTS_COST.length === D.ARTS_MAX_LV - 1 &&
      LGc.FEISHENG_BASE_P === 0.25 && LGc.BINGJIE_MULT === 0.7;
});
