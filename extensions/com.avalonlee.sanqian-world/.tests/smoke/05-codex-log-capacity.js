/* .tests/smoke/05-codex-log-capacity.js — 冒烟断言 19 条（首 #202 ‖ 末 #252）
 * 由 smoke.js 的 run() 体逐字切出（原第 4378~5408 行），正文一字未改。
 * 本件只注册正文、不执行：执行由 .tests/smoke.js 的壳把十片拼回同一个 async Function（同一作用域与提升语义）。
 * 装载序 = smoke.js（壳）→ 本片；单片不可独立跑（320 案顺序共享沙箱态）。
 * 断言编号：202 203 204 205 206 206 206 248 249 250 251 277 278 279 280 281 282 283 252 324
*/
window.SQSmoke.frag('05-codex-log-capacity', async function () {
    ok('202', 'meta normalize 幂等（旧档补默认/脏档逐项清理/恒等式自检修复）+ p 公式/CLAMP/REALMS/FIELDS 零改动回归 ‖ ARTS_COST 按等级起点批对表（八档）',
      old202 && n202b.karma === 5 && n202b.earnedKeys.bad == null && n202b.codices.event == null &&
      n202b.codices.art.join() === 'a' && n202b.achv.join() === 'achv_jichu' && n202b.titles.length === 0 &&
      n202b.biographies.length === 1 && n202b.unlocks.alchemy === false && n202b.stats.lives === 0 &&
      JSON.stringify(n202b) === JSON.stringify(n202c) && zero202);

    /* #203 图鉴九面 id 引用纪律 + 动态分母 + 重复获得不刷新首录 */
    localStorage.removeItem(SQ.KEY);
    var ref203 = {};
    await SQ.mutate(ref203, function (s203) {
      s203.profile = mkProf([]);
      s203.worlds.xiuxian = pack.initialState();
      var w = s203.worlds.xiuxian;
      w.cleared = [0, 1]; w.bossKills = [0]; w.affixSeen = { pojun: 1 };
      w.artsKnown.push('tuna'); w.artsLevels.tuna = 9;
      w.bonds[(pack.companions[0] || { id: 'c0' }).id] = 50;
      w.treasures.owned.push({ id: pack.treasures.LIST[0].id, st: {} });
      w.factionId = D.FACTIONS_FIXED[0].id;
      w.eventHistory.seen.ev_test_203 = 1;
    });
    var cod203 = ref203.meta.codices;
    var allStr203 = true;
    for (var cf203 in cod203) cod203[cf203].forEach(function (x) { if (typeof x !== 'string') allStr203 = false; });
    var snap203 = JSON.stringify(cod203);
    SQ.Codex.scan(ref203, Date.now());
    var stable203 = JSON.stringify(ref203.meta.codices) === snap203;
    var den203ok = SQ.Codex.faceDenom('event', pack, D) === SQ.Events.allIds(pack).length &&
      SQ.Codex.faceDenom('treasure', pack, D) === pack.treasures.LIST.length &&
      SQ.Codex.faceDenom('art', pack, D) === Object.keys(pack.artsMap()).length &&
      SQ.Codex.faceDenom('bond', pack, D) === pack.companions.length &&
      SQ.Codex.faceDenom('faction', pack, D) === D.FACTIONS_FIXED.length &&
      SQ.Codex.faceDenom('zone', pack, D) === D.ZONES.length * 2 + D.ZONE_AFFIXES.length &&
      SQ.Codex.faceDenom('selfart', pack, D) === FUc.COMBOS + pack.treasures.LIST.length;
    ok('203', '图鉴九面 id 引用纪律：条目全 id 字符串零裸文案；重复获得不刷新首录；分母=池正典计数（zone 三层合成 / selfart=480+46）',
      allStr203 && stable203 && (cod203.zone || []).join().indexOf('z0') === 0 && den203ok &&
      (cod203.zone || []).indexOf('b0') >= 0 && (cod203.zone || []).indexOf('apojun') >= 0);

    /* #204 里程碑/成就幂等 + qiRate 静态来源 cap */
    var m204 = mkMeta();
    m204.codices.treasure = pack.treasures.LIST.map(function (tt) { return tt.id; });
    SQ.Codex.checkMilestones(m204, pack, D, 1);
    var k204a = m204.karma;
    SQ.Codex.checkMilestones(m204, pack, D, 2);
    var idem204 = m204.karma === k204a && k204a === 95 &&
      m204.earnedKeys['codex.ms.treasure.50'] === 15 && m204.earnedKeys['codex.ms.treasure.100'] === 50;
    var m204b = mkMeta();
    CXc.FACES.forEach(function (face) {
      m204b.earnedKeys['codex.ms.' + face + '.100'] = 50;
      if (face !== 'title') { m204b.earnedKeys['codex.ms.' + face + '.50'] = 15; m204b.earnedKeys['codex.ms.' + face + '.80'] = 30; }
    });
    m204b.earnedKeys['codex.ms.title.50'] = 50;
    m204b.earnedKeys['codex.ms.talentLegacy.100'] = 50;
    var q204 = SQ.Codex.qiRateOf(m204b, D);
    localStorage.removeItem(SQ.KEY);
    var ref204 = {};
    await SQ.mutate(ref204, function (s204) {
      s204.profile = mkProf([]);
      s204.worlds.xiuxian = pack.initialState();
      s204.worlds.xiuxian.realm = 9;
    });
    var achv204 = ref204.meta.achv.slice(), karma204 = ref204.meta.karma;
    SQ.Codex.scan(ref204, Date.now());
    var same204 = ref204.meta.achv.length === achv204.length && ref204.meta.karma === karma204;
    ok('204', '里程碑/成就幂等：同面同档跨世只发一次（15/30/50）；qiRate codex 来源 2.7%≤cap3% 静态行；60 条成就每条只发一次重复触发零效果；恒等式联动不破',
      idem204 && Math.abs(q204 - 0.027) < 1e-9 && achv204.indexOf('achv_zhenxian') >= 0 && same204 && identOk(ref204.meta));

    /* #205 传记限长限数〔第册批改口：原「烧表奏疏 ≤1500 / 敏感词与空文本回落本地稿 / 超长截断
     * source 转 tiandao」三判随 `Codex.adoptBio` 整族下线，下线取证改立 #315〕 */
    var w205 = pack.initialState();
    for (var ci205 = 0; ci205 < 10; ci205++) SQ.Tiandao.chronPush(w205, 'tribwin', { realm: 5 }, 1000 + ci205);
    var bio205 = SQ.Codex.generateBio(w205, mkMeta(), pack, D, { name: '测试道号', worldName: 'w' }, 'feisheng', Date.now());
    var m205 = mkMeta();
    for (var bsi = 1; bsi <= 10; bsi++) SQ.Codex.pushBio(m205, { life: bsi, name: 'n' + bsi, text: 't', stats: {}, source: 'local', ts: bsi }, bsi, 'n' + bsi, 'bingjie', bsi);
    var push205 = m205.biographies.length === 6 && m205.biographies[0].life === 5;   /* 写口限数 9→6（正典①，与 core.js 读档裁剪同口径 · 玩法闭环批 2026-10-07）：10 次 push 留最后 6 世 ⇒ 首条 life=5 */
    ok('205', '传记限长限数：单篇 ≤500 硬截；pushBio >6 世挤最旧（正典① · 原 >9）——10 次 push 留最后 6 世 ⇒ 首条 life=5',
      bio205.text.length <= 500 && push205);

    /* #206 容量红线：最坏态实测 → 压缩预案阶梯 → ≤ SQ.SAVE_RED 且恒等式不破（红线单一事实源） */
    localStorage.removeItem(SQ.KEY);
    localStorage.removeItem(SQ.Log.KEY);
    /* 钉死真最坏态（2026-10-05 存档容量防线批）：Factions.generate 的 RAND_EXTRA 0~4 走裸 Math.random，
     * 势力总数 16~20 浮动 → rel 矩阵 n(n−1) 随之浮动、#206 最坏态自身有 ±1.5KB 抖动（同一份代码一次
     * 50876B 过、一次 51319B 挂）。容量红线断言必须恒测上界：stub 到 0.9999 逼 nExtra=4 → 恒 20 势力满档，
     * 同时道友归属散人转化率 20% 也被逼成 0 → factionNpcs 满 58 条，同为上界。 */
    var restore206 = stubRandom(function () { return 0.9999; });
    var ref206 = {};
    await SQ.mutate(ref206, function (s206) {
      s206.profile = mkProf([]);
      s206.worlds.xiuxian = pack.initialState();
      var w = s206.worlds.xiuxian;
      w.realm = 9; w.stones = 1e9;
      for (var li = 0; li < 2000; li++) SQ.Log.push(w, ['combat', 'idle', 'break', 'trib', 'event', 'shop', 'arts', 'sys'][li % 8], '这是一条四十字节的测试日志文本用来模拟真实渲染长度嗯嗯', 1700000000000 + li);
      pack.treasures.LIST.forEach(function (tt, ti) {
        /* 🔧 N52（第册十二批）：认主进度按件 ⇒ 先天件各带一份 st.bondN / st.bondH（最坏态每枚都摆上）；
         * 顶层那两枚全局数同时退役 ⇒ 模型里也不再摆它们（摆着 = 虚报一份不存在的价格）*/
        var st206 = ti < 6 ? { spirit: { w: 600, a: 1, p: 'jian', cd: 1, mk: 0, hun: 0, vt: { trib: 1, omen: 1, skill: 1, pickup: 1 } } } : {};
        if (tt.kind === 'xian') { st206.bondN = 99; st206.bondH = 7.999999999; }
        w.treasures.owned.push({ id: tt.id, st: st206 });
      });
      w.treasures.slots = pack.treasures.LIST.slice(0, 6).map(function (tt) { return tt.id; });
      Object.keys(pack.artsMap()).forEach(function (aid) { w.artsKnown.push(aid); w.artsLevels[aid] = 9; });
      w.shelf = Object.keys(pack.artsMap()).slice(0, 30);
      w.fusion = { lastFuseAt: 1, meditate: 100, seq: 4, customs: [] };
      for (var cu = 1; cu <= 4; cu++) w.fusion.customs.push({ id: 'c' + cu, name: '测试自创名', gen: 3, tier: 3, attr: 'shen', align: 'neutral',
        effects: { combatPower: 0.315, qiRate: 0.225, offlineEff: 0.288, combatSpeed: 0.219, qiCap: 0.30, stonesRate: 0.267, artsSpeed: 0.07, eventRate: 0.14, eventLuck: 0.09, dropRate: 0.05, tribBonus: 0.025, realmCost: -0.02 },
        special: { pool: 'some_special_pool', grade: 2 }, parents: [{ id: 'art_a', name: '父本一', tier: 3 }, { id: 'art_b', name: '父本二', tier: 2 }], createdAt: 1 });
      SQ.Events.allIds(pack).forEach(function (eid, ei) { w.eventHistory.seen[eid] = 1700000000000 + ei; w.eventCooldowns[eid] = 1700000000000; });
      /* eventHistory.feed 满档（2026-10-05 存档容量防线批补造）：叙事流上限 D.EVENT_FEED_CAP 条、
       * 每条 10 字段（含 eff 效果账）实测 ≈215~285B → 满档 ≈11~14KB，是**真实存档最大单项**
       * （sim-playthrough CAP_WATCH 实测 10.5~11.2KB，超过 codices/factions/prodigies），
       * 而本模型此前只造 seen + eventCooldowns、**完全没造 feed** = 与「天骄漏项」同类模型漏项。
       * 单条按 285B 保守构造（≥ 真实实测上界 229B/条）：最长事件 id（19 字符）+ eff 八键全填。 */
      w.eventHistory.feed = [];
      for (var fi = 0; fi < (D.EVENT_FEED_CAP || 50); fi++) {
        w.eventHistory.feed.push({ id: 'witness_tribulation', ts: 1700000000000 + fi, branch: 'branch_evil_fail',
          tier: 'di', nature: 'evil', pass: true, hadCheck: true, karma: -12,
          eff: { stones: 1234567, qi: 1234567, bond: 100, mat: 12, treasure: 'treasure_long_id', art: 'art_long_id', buff: 1, rep: 5000 },
          via: 'rumor' });
      }
      w.cleared = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; w.bossKills = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (var af = 0; af < 7; af++) w.affixSeen['affix_' + af] = 1;
      (pack.companions || []).forEach(function (cc) { w.bonds[cc.id] = 100; });
      /* 多道侣（册一百二十三批）：14 位候选全部结缘 + 解除记录按 16 条硬截摆满。
       * 不设人数上限 ⇒ 真实上界 = 候选人数（数据驱动，随池扩容自动跟随）。 */
      var spouseIds206 = (pack.companions || []).filter(function (cc) { return cc.category === 'spouse'; });
      w.spouses = spouseIds206.map(function (cc, si) { return { npcId: cc.id, form: 'yinyang', since: 1 + si }; });
      w.spouseLogs = [];
      for (var sl206 = 0; sl206 < 16; sl206++) {
        var sp206 = spouseIds206[sl206 % (spouseIds206.length || 1)] || { id: 'x' };
        w.spouseLogs.push({ npcId: sp206.id, form: 'yinyang', reason: 'karma', at: 1700000000000 + sl206 });
      }
      /* 道友三本新名录满档（2026-10-06 天象扩容 · 缘尽收敛批补造 —— 与「天骄漏项」「feed 漏项」
       * 同类同因：最坏态模型未随内容批更新。三者都是**字符串 id 数组**、上界各不相同：
       *   juefengIds   ≤ 64（lock 内硬截），真实上界 = 道友全员 58（每人一生至多绝交一次）
       *   redeemedIds  ≤ 64（redeem 内硬截），真实上界同为 58
       *   rankGiftSeen ≤ 16（alignGift 内硬截），真实上界 = 名号段数 9（每段每世一次）
       * 一律按**真实可达上界**造（数据驱动、随池扩容自动跟随），不填防御性硬截值虚增字节。 */
      (pack.companions || []).forEach(function (cc) { w.juefengIds.push(cc.id); w.redeemedIds.push(cc.id); });
      w.heirBond = (pack.companions || [{}])[0].id;
      (D.KARMA_RANKS || []).forEach(function (rk) { w.rankGiftSeen.push(rk[1]); });
      for (var bf = 0; bf < 20; bf++) w.buffs.push({ field: 'qiRate', mult: 0.1, until: 1800000000000, source: 'alchemy' });
      D.FACTIONS_FIXED.forEach(function (ff) { w.factionRep[ff.id] = 5000; });
      /* 天骄满档（2026-10-05 存档容量防线批修正）：旧口径硬写 4 条 = 卡片化批前的遗泽上限，
       * 该批把名录 2→10、上限 4→COUNT_MAX(30) 并新增每 10 游戏年冻结的榜面快照 rankRows(COUNT_MAX+1 行)，
       * 模型未随批更新 → 断言绿而 sim-playthrough 实测越 50KB 红线。最坏态一律按数据驱动上限造。 */
      /* 天骄记录的 id 字段取真实池内最长值（数据驱动、随池扩容自动跟随）——原用假长 id 两头都不对表：
       * tl 'talent_a_long_id'(16) < 真实天赋 id 最长 21（**低估**）；fid 'faction_id_long'(15) > 真实势力 id
       * 最长 9（**高估**）。最坏态必须按真实上界，两个方向都不许拍脑袋。 */
      var talPool206 = [];
      ['common', 'xiuxian'].forEach(function (wd206) {
        var tp206 = SQ.TALENTS[wd206];
        if (tp206) { tp206.positive.forEach(function (x) { talPool206.push(x.id); }); tp206.negative.forEach(function (x) { talPool206.push(x.id); }); }
      });
      talPool206.sort(function (a, b) { return b.length - a.length; });
      var longTal206 = [talPool206[0] || 'talent_x', talPool206[1] || 'talent_y'];
      var fidPool206 = (D.FACTIONS_FIXED || []).map(function (fx) { return String(fx.id); })
        .sort(function (a, b) { return b.length - a.length; });
      var longFid206 = fidPool206[0] || 'sect';
      w.prodigies = [];
      for (var pi = 0; pi < PDc.COUNT_MAX; pi++) w.prodigies.push({ id: 'pr' + (pi + 1), nm: [8, 6, 4], tl: [longTal206[0], longTal206[1]], al: 2, fc: 15, fid: longFid206, apt: 2, rlm: 9, prg: 0, feud: pi === 0, feudBond: 70, lastSparAt: 1, rivAt: 1, boost: { add: 0.1, months: 3 }, eternal: pi === 0, wl: [99, 99, 99] });
      /* prodMarks 满档：rankRows 31 行冻结快照（#212b 断言长度 = COUNT_MAX+1）+ evf 逐人事件幂等键
       * + slotMax（槽位不复用，斩杀出榜者占号）+ myRank / rankAt / sudiWin */
      w.prodMarks = { slotMax: PDc.COUNT_MAX, myRank: PDc.COUNT_MAX + 1, rankAt: 1700000000000, sudiWin: true, evf: {}, rankRows: [] };
      for (var pr = 0; pr < PDc.COUNT_MAX + 1; pr++) w.prodMarks.rankRows.push({ me: pr === 0, id: pr === 0 ? null : 'pr' + pr, realm: 9, power: 1234567.89 });
      for (var pv = 0; pv < PDc.COUNT_MAX; pv++) w.prodMarks.evf['pr' + (pv + 1)] = 5;
      w.sect = { name: '测试宗门', nameIdx: [11, 7], gate: 'panlong', align: 'evil', disciples: [], fac: { zangjing: 5, danfang: 5, yanwu: 5, keshe: 5 },
        everDefected: true, dispatchAt: 1, lastTribMonth: 1, monthClock: 0, matAcc: 0.999999, warRecord: { wins: 99, loses: 99 }, suppressed: { f1: 0.5 },
        recruitAt: 1, foundAt: 1, declareAt: 1, candidate: null, warAgg: null, seq: 8, succession: null };
      /* 弟子按真实上限造（原硬写 8 条 > DISC_CAP_BASE，属模型越界填充非最坏态；2026-10-05 容量防线批校正）。
       * 携才投效批随批补 `pr` 来源位：最坏态 = 每个名额都被一名天骄弟子占着（N6 起弟子可带 pr 字段）。 */
      for (var di = 1; di <= ((SCc && SCc.DISC_CAP_BASE) || 6); di++) w.sect.disciples.push({ id: 'd' + di, nm: [23, 47], tier: 'fine', realm: 8, prog: 100, inv: 2, perk: 'combatPower', tianjiao: di === 1, pr: 'pr' + di });
      /* ── E0-1 两处漏项补造（2026-10-05 存档容量防线批 · 同批第二轮）──────────────────
       * 四跑 CAP_WATCH 实测真实存档里 `ws.stash` 3.30~3.47KB、`ws.shop` 2.54~4.79KB，而本模型此前
       * **两者完全没造** = 与「天骄漏项」「feed 漏项」同类同因（最坏态模型未随内容批更新）。
       * 一律走真实引擎入口按数据驱动上限造，不拍脑袋编字节数。 */
      var mods206 = M(mkProf([]), w);
      var zMax206 = (D.ZONES || []).length - 1;
      var tierMax206 = (D.GEAR_TIERS || []).length - 1;
      var rollGear206 = function () {
        return SQ.Gear.roll(w, pack, D, zMax206, mods206, { tierMin: tierMax206, tierUp: 0 });
      };
      /* ws.stash 满档 = D.STASH_CAP 件、全最高品阶 */
      w.stash = [];
      for (var gi = 0; gi < (D.STASH_CAP || 12); gi++) w.stash.push(rollGear206());
      /* ws.shop 满档 = 坊市货架 items + 黑市 blackItems 各 **SHOP_SLOTS_MAX** 格（格数随机批起按上界建模）、全填最肥的 kind:'gear'
       * （内嵌完整 gear 对象，比 pill/arts/pack 三种条目都肥）+ 商队 merchant.items 同规格 */
      var mkShopGear206 = function () { return { kind: 'gear', gear: rollGear206(), sold: false, price: 99999 }; };
      w.shop = { items: [], blackItems: [], nextRestock: 1700000000000, refreshStep: 9, discount: 0.35,
        merchant: { until: 1800000000000, items: [], scout: 9 } };
      /* 格数随机批 2026-10-09：两架按 **MAX = 16** 建模（最坏态取上界，不是均值——红线判据要的是上界）；
       * 特席原按 10 格造 = 白留的余量，第八批如实收到 **3 格**——两头都改才叫建模，不是只挑有利的一侧。
       * ⚠️ 但「真实上限 3 格」这个数本身是错的（**神秘商人节律批 2026-10-10 更正**）：数值详设 §5.4 与
       *   第八批都照抄「三格」，而 shop.js:161-172 在 scout 顶格时还会 **50% 挂第四格先天法宝特位**
       *   ⇒ 上界是四格，且四格形状各异（装备内嵌 gear 最肥；功法 / 丹药 / 法宝只有 ref + price）。
       *   现按真实上界造：**2 × gear**（第一格 + 第二格无功法候选时的回落）+ **1 × pill** + **1 × treasure**。
       *   方向如实报：格数 +1 是加项、两格改薄是减项，**净效应取本条实测落盘字节，不猜**。 */
      for (var sh = 0; sh < (D.SHOP_SLOTS_MAX || D.SHOP_SLOTS || 10); sh++) {
        w.shop.items.push(mkShopGear206());
        w.shop.blackItems.push(mkShopGear206());
      }
      w.shop.merchant.items.push(mkShopGear206(), mkShopGear206());
      w.shop.merchant.items.push({ kind: 'pill', ref: 'pozhang', sold: false, price: 99999 });
      w.shop.merchant.items.push({ kind: 'treasure', ref: 'x14', sold: false, price: 99999 });
      D.ALCHEMY.MATS.forEach(function (mm) { w.materials[mm.id] = 999; });
      w.alchemy = { furnace: true, recipes: D.ALCHEMY.RECIPES.map(function (rr) { return rr.id; }), blueprints: D.ALCHEMY.BLUEPRINTS.map(function (bb) { return bb.id; }),
        prof: { dan: 999, qi: 999 }, pills: {}, pillOnce: { pozhang: 9, zhenjie: 9 },   /* 🔧 N43：pillDay 已退役 ⇒ 最坏态模型同步摘掉（留着就是虚报容量）*/
        craft: null, farmAt: 1, fires: 999, jiuzhuan: 99, forgeMade: 99 };
      /* 丹药两族合一（第十七批）：最坏态必须把**成品丹四枚**一起摆满（玩家在坊市 / 门中 / 特席 / 残片也能囤到 99），
       * 只按 RECIPES 造 = 少算四键 ⇒ 红线余量虚报 */
      D.ALCHEMY.RECIPES.forEach(function (rr) { w.alchemy.pills[rr.pill] = 99; w.alchemy.pills[rr.pill + '_rw'] = 99; });
      (D.PILLS || []).forEach(function (pp) { w.alchemy.pills[pp.id] = 99; });
      w.tiandao = SQ.Tiandao.normalize({ defy: 100, title: true, shield: 1, nextTrib: 0.03 }, D);
      /* 本局去重位掩码满档（2026-10-06 天象扩容批补造）：omenSeen 逐节点全亮 = 2^OMEN_TPL_N[node] − 1、
       * chenSeen = 2^CHENYU_N − 1。位掩码本就是为「落档增量 ≈30B」选的形状（对比 id 字符串数组方案的
       * ≈1.5KB），此处按上界造实，把这笔增量钉进红线账，不留未建模字段。 */
      (D.TIANDAO.OMEN_NODES || []).forEach(function (nd, ni) {
        w.tiandao.omenSeen[ni] = Math.pow(2, D.TIANDAO.OMEN_TPL_N[nd]) - 1;
      });
      w.tiandao.chenSeen = Math.pow(2, D.TIANDAO.CHENYU_N) - 1;
      /* seenIds 按真实上界造（2026-10-05 存档容量防线批校正）：原硬塞 200 条假 id 'td-decree-id-N'
       * （14~18B/条 = 3.5KB 纯虚增）。真实上界 = 旨意池大小：seenIds 存 dec.decreeId（tiandao.js 写入前
       * indexOf 去重），池 = D.TIANDAO.DECREES 仅 15 型 → SEEN_CAP 200 是永不可达的防御上限、非最坏态。 */
      (((D.TIANDAO || {}).DECREES) || []).forEach(function (dc) { if (dc && dc.id) w.tiandao.seenIds.push(dc.id); });
      for (var hi = 0; hi < 40; hi++) w.tiandao.history.push({ id: 'td-' + hi, type: 'bless', act: 'accept', at: 1700000000000, tier: 'rare' });
      for (var ch = 0; ch < 10; ch++) w.tiandao.chron.push({ node: 'tribwin', v: { realm: 5 }, at: 1700000000000 + ch });
      w.cave.id = D.CAVES[D.CAVES.length - 1].id;
      D.CAVES.forEach(function (cv) { w.cave.fac[cv.id] = {}; D.CAVE_FACILITIES.forEach(function (fc) { w.cave.fac[cv.id][fc.id] = 5; }); });
      /* meta 最坏态 */
      var m = s206.meta;
      m.codices.event = SQ.Events.allIds(pack);
      m.codices.talent = [];
      m.codices.zone = [];
      m.codices.talentLegacy = [];
      m.achv = []; m.titles = []; m.karmaLog = []; m.biographies = [];
      ['common', 'xiuxian'].forEach(function (wd) { var tp = SQ.TALENTS[wd]; if (tp) { tp.positive.forEach(function (x) { m.codices.talent.push(x.id); }); tp.negative.forEach(function (x) { m.codices.talent.push(x.id); }); } });
      m.codices.treasure = pack.treasures.LIST.map(function (tt) { return tt.id; });
      m.codices.art = Object.keys(pack.artsMap());
      m.codices.artMax = Object.keys(pack.artsMap());
      m.codices.bond = (pack.companions || []).map(function (cc) { return cc.id; });
      for (var zz = 0; zz < 10; zz++) { m.codices.zone.push('z' + zz, 'b' + zz); }
      for (var za = 0; za < 7; za++) m.codices.zone.push('a' + za);
      m.codices.faction = D.FACTIONS_FIXED.map(function (ff) { return ff.id; });
      m.codices.talentLegacy = D.LEGACY.TALENTS.map(function (tt) { return tt.id; });
      CXc.ACHV.forEach(function (aa) { m.achv.push(aa.id); if (aa.title !== '-') m.titles.push(aa.title); });
      while (m.titles.length < 80) m.titles.push('title_extra_' + m.titles.length);
      m.codices.title = m.titles.slice();
      for (var zk = 0; zk < 10; zk++) { m.earnedKeys['zone.' + zk] = 10; m.earnedKeys['boss.' + zk] = 15; }
      m.codices.treasure.forEach(function (id) { m.earnedKeys['treasure.' + id] = 2; });
      m.codices.artMax.slice(0, 30).forEach(function (id) { m.earnedKeys['artmax.' + id] = 5; });
      m.titles.forEach(function (id) { m.earnedKeys['title.' + id] = 2; });
      CXc.FACES.forEach(function (ff2) { m.earnedKeys['codex.ms.' + ff2 + '.50'] = 15; m.earnedKeys['codex.ms.' + ff2 + '.80'] = 30; m.earnedKeys['codex.ms.' + ff2 + '.100'] = 50; });
      m.achv.forEach(function (id) { m.earnedKeys[id] = 3; });
      for (var lb = 1; lb <= 30; lb++) m.earnedKeys['trib.' + lb] = 60;
      m.earnedKeys.realmMax = 720; m.earnedKeys.officeMax = 60; m.earnedKeys.rankMax = 80; m.earnedKeys.ascend = 200;
      var ksum = 0; for (var ek in m.earnedKeys) ksum += m.earnedKeys[ek];
      SQ.Legacy.shopItems(D).forEach(function (it) { m.spent[it.key] = 1700000000000; });
      /* 缘尽赎回跨世账（2026-10-06 缘尽收敛批补造）：redeem 走 Legacy.spend 的 itemId 幂等口 →
       * 每位被赎道友在 meta.spent 留一条**永久**键（跨世不消），是 meta 侧唯一随道友池线性增长的新项。
       * 值 = 实付遗泽 BOND_REDEEM_COST（代码定值，非上界估算）。 */
      (pack.companions || []).forEach(function (cc) { m.spent['redeem.' + cc.id] = D.BOND_REDEEM_COST; });
      var spsum = 0; for (var sk2 in m.spent) spsum += 200;
      m.karma = ksum - spsum;
      for (var kl = 0; kl < 20; kl++) m.karmaLog.push({ ts: 1700000000000 + kl, delta: 50, reason: 'milestone', balance: 1000 });
      for (var bb2 = 0; bb2 < 9; bb2++) m.biographies.push({ life: bb2 + 1, name: '测试道号', text: '传'.repeat(500), stats: { realm: 9, win: 30, att: 40, bonds: 58, karma: 900, zones: 10, defy: 100, channel: 'feisheng', stones: 1000000 }, source: 'tiandao', ts: bb2 });
      m.stats = { lives: 30, ascensions: 15, dissolutions: 15, realmMax: 9, tribWin: 400, tribFail: 100, tribAttempts: 500, zonesFirst: 10, officeMax: 5, rankMax: 4, rankScored: 4, bestLifeText: '', omensSeen: 200, defyTotal: 300, acceptTotal: 300, defyMax: 100, immThisLife: 0 };
      m.eternalProdigy = { nm: [8, 6, 4], apt: 2, al: 2, fc: 15, fid: 'faction_id_long', rlm: 9, wl: [99, 99, 99], feud: true };
      m.lastBonds = (pack.companions || []).slice(0, 60).map(function (cc) { return cc.id; });
    });
    restore206();                                  /* 势力表已按满档 20 个确定生成，还原随机源 */
    var rawBytes206 = byteLen(ref206);
    /* 落盘前字段分解（ws.* / meta.* 逐项字节降序前 10）——容量红线的前置诊断口径 */
    var topRaw206 = (function () {
      var rows = [], wq = ref206.worlds.xiuxian, mq = ref206.meta, kq;
      for (kq in wq) rows.push(['ws.' + kq, byteLen(wq[kq])]);
      for (kq in mq) rows.push(['meta.' + kq, byteLen(mq[kq])]);
      rows.sort(function (a, b) { return b[1] - a[1]; });
      return rows.slice(0, 10).map(function (r) { return r[0] + '=' + (r[1] / 1024).toFixed(2) + 'KB'; }).join(' ');
    })();
    var biosPre206 = (ref206.meta.biographies || []).length;      /* 活档传记数（治理批后 save 不再摧毁它） */
    await SQ.save(ref206);
    var saved206 = localStorage.getItem(SQ.KEY);
    var savedBytes206 = saved206 ? byteLen(saved206) : -1;
    var logRaw206 = localStorage.getItem(SQ.Log.KEY);
    var logBytes206 = logRaw206 ? byteLen(logRaw206) : -1;
    var w206 = ref206.worlds.xiuxian;
    /* 日志存档批：日志落盘前剥离 → 主档阶梯不再裁日志；日志全量进独立档
     * ⚠️ 存档瘦身批口径：本断言走的是**无桥预览（localStorage）分支 = 不压缩**，故阶梯照旧触发，
     *   这条正是「宿主缺 CompressionStream 时的降级态」的常驻取证；压缩态的落盘取证见 #277（有桥分支）。 */
    var re206 = JSON.parse(saved206);
    /* 落盘后字段分解（= 阶梯全跑完仍留在盘上的构成）——决定还需哪一级压缩的直接依据 */
    var topSaved206 = (function () {
      var rows = [], wq = (re206.worlds || {}).xiuxian || {}, mq = re206.meta || {}, kq;
      for (kq in wq) rows.push(['ws.' + kq, byteLen(wq[kq])]);
      for (kq in mq) rows.push(['meta.' + kq, byteLen(mq[kq])]);
      rows.sort(function (a, b) { return b[1] - a[1]; });
      return rows.slice(0, 12).map(function (r) { return r[0] + '=' + (r[1] / 1024).toFixed(2) + 'KB'; }).join(' ');
    })();
    var mainHasLog206 = Array.isArray((((re206.worlds || {}).xiuxian) || {}).log);
    /* 副本级触发标志（级⑦ rel 上三角 / 级⑧ rankRows 裁除）——落盘形态直判，不靠推断 */
    var fac206disk = ((re206.worlds || {}).xiuxian || {}).factions || [];
    var relN206disk = fac206disk.reduce(function (n, f) { return n + Object.keys((f && f.rel) || {}).length; }, 0);
    var lvl7_206 = fac206disk.length >= 2 && relN206disk === fac206disk.length * (fac206disk.length - 1) / 2;
    var pm206disk = ((re206.worlds || {}).xiuxian || {}).prodMarks || {};
    var lvl9_206 = !Array.isArray(pm206disk.rankRows);                       /* 级⑨ rankRows 裁除 */
    var w206disk = ((re206.worlds || {}).xiuxian) || {};
    var lvl11_206 = !!w206disk.prodCols && Array.isArray(w206disk.prodCols.k) && !Array.isArray(w206disk.prodigies);
    var eh206disk = ((re206.worlds || {}).xiuxian || {}).eventHistory || {};
    var feed206disk = Array.isArray(eh206disk.feed) ? eh206disk.feed.length : -1;
    var lvl10_206 = feed206disk < 0;   /* 级⑩ 已随第十四批整族删除 ⇒ `stripSideFlows` 是 `delete ehc.feed`，键**根本不在档上**（= −1）；复核返修：原判 `=== 0` 把「空数组」当正证而键缺失时恒假 = 明细行永远打印「异常」，旧写法 (0<=5) 恒真 = 没判（审计 #13） */
    var lvl8_206 = ((re206.meta || {}).codices || {}).title == null;         /* 级⑧ codices.title 折叠 */
    var logStoreN206 = 0;
    try { logStoreN206 = (JSON.parse(logRaw206).logs.xiuxian || []).length; } catch (e) {}
    /* 级⑥解压还原闭环（扩容批启用）：落盘 codices 九面数组 → 逗号串（序列化副本，内存态零污染），
     * normalize split 还原后九面内容逐面全等——压缩/还原对称、图鉴「永不回退」语义不破 */
    var joined206 = typeof (re206.meta.codices || {}).event === 'string';   /* 级⑥确已触发（必须在 normalize 前判——split 还原会就地 mutate raw） */
    var n206r = SQ.normalize(re206);
    var codexOk206 = (function () {
      var src = ref206.meta.codices, dst = (n206r.meta || {}).codices || {};
      for (var cf in src) {
        if (!Array.isArray(src[cf])) continue;
        if (!Array.isArray(dst[cf]) || dst[cf].join() !== src[cf].join()) return false;
      }
      return true;
    })();
    ok('206', '容量红线：最坏态原账 ' + rawBytes206 + 'B 超触发线（SQ.SAVE_TRIGGER 单一事实源）→ 主档（剥离展示流 log + eventHistory.feed）压缩阶梯（就地级 ⓪~⑤ 已纯函数化：bios/karmaLog/trib并额/cooldowns/保底级 **只改落盘副本** + 副本级⑥codices 串接/⑦rel 上三角/⑧title 差集/⑨rankRows 裁除/⑩feed 裁剪〔侧档化后降级为保险，常态不触发〕/⑪prodigies 列存）→ 落盘 ' + savedBytes206 + 'B ≤ SQ.SAVE_RED（' + SQ.SAVE_RED + 'B）且恒等式不破；日志全量落独立档 ' + logStoreN206 + ' 条（' + logBytes206 + 'B）；级⑥解压还原闭环（九面 split 后逐面全等、内存态零污染）',
      rawBytes206 > SQ.SAVE_TRIGGER && savedBytes206 > 0 && savedBytes206 <= SQ.SAVE_RED && !mainHasLog206 &&
      logStoreN206 === 2000 && logBytes206 > 0 && w206.log.length === 2000 &&
      ((re206.meta || {}).biographies || {}).length <= 6 &&
      ref206.meta.biographies.length === biosPre206 && identOk(ref206.meta) &&
      joined206 && codexOk206,
      'log=' + w206.log.length + ' 日志档=' + logStoreN206 + ' 主档含log=' + mainHasLog206 +
      ' bios盘/内存=' + ((re206.meta || {}).biographies || []).length + '/' + ref206.meta.biographies.length + ' 天骄=' + w206.prodigies.length +
      '/快照' + ((w206.prodMarks.rankRows || []).length) + '行' +
      ' 级⑥=' + (joined206 ? '触发' : '未触发') + ' 级⑦=' + (lvl7_206 ? '触发' : '未触发') +
      ' 级⑧=' + (lvl8_206 ? '触发' : '未触发') + ' 级⑨=' + (lvl9_206 ? '触发' : '未触发') +
      ' 级⑩已删(feed 不落主档，盘上 ' + feed206disk + ' 条)=' + (lvl10_206 ? '判据成立' : '异常') + '(原满档 ' + (D.EVENT_FEED_CAP || 50) + ')' +
      ' 级⑪=' + (lvl11_206 ? '触发' : '未触发') + ' 九面还原=' + codexOk206 + ' ‖ 原账分解 ' + topRaw206 + ' ‖ 落盘分解 ' + topSaved206);

    /* #324 级⑪ prodigies 列存的无损闭环（第册卅三批 2026-10-18 · N70）：
     * 判一 = 盘上确为列存形状（有 prodCols 且无 prodigies 数组）；
     * 判二 = **同一 normalize 口径下**「走列存的盘上档」与「不走列存的等价档」还原结果逐字全等
     *        —— 拿 normalize(原内存态) 当基线而不是拿内存态本身，否则 pack.normalize 自己的补齐
     *        会混进差异，红了分不清是谁的锅（本级盲区 vs 既有清洗）；
     * 判三 = 混合形状（第二条记录多出后加的键）⇒ 本级**整级不触发**、prodigies 原样落盘：
     *        无损前提是证出来的，不是假定旧档也同形。旧档新增键正是这一支的真实来源。 */
    var disk324 = JSON.parse(saved206);
    var w324 = (disk324.worlds || {}).xiuxian || {};
    var shape324 = !!w324.prodCols && Array.isArray(w324.prodCols.k) && !Array.isArray(w324.prodigies);
    var n324 = SQ.normalize(disk324);
    var b324 = SQ.normalize(JSON.parse(JSON.stringify(ref206)));
    var got324 = (n324.worlds || {}).xiuxian.prodigies;
    var exp324 = (b324.worlds || {}).xiuxian.prodigies;
    var round324 = JSON.stringify(got324) === JSON.stringify(exp324);
    var kOk324 = shape324 && w324.prodCols.k.length === Object.keys(ref206.worlds.xiuxian.prodigies[0]).length
      && w324.prodCols.r.length === ref206.worlds.xiuxian.prodigies.length;
    /* 混合形状 = **旧档的真实形状**（记录本体验证得通过，只是早期那条缺后来新增的键）：拿在册最坏态的
     * 两条真记录、删掉第二条的一枚键来造，不拿手搓的残缺记录——pack.normalize 会整条丢掉不合格记录，
     * 用它会验出「bail 后名录为空」这种与本级无关的假象（本机实测：`{id,rlm}` 两键记录直接被丢 ⇒ []）。 */
    var ragSrc324 = JSON.parse(JSON.stringify(ref206.worlds.xiuxian.prodigies));
    delete ragSrc324[1].feudBond;
    var rag324 = pack.initialState();
    rag324.prodigies = ragSrc324.slice(0, 2);
    var rr324 = await SQ.compressForSave({ v: SQ.V, profile: mkProf([]), meta: {}, worlds: { xiuxian: rag324 } }, 1700000000000, 1);
    var wRag324 = ((rr324.out || {}).worlds || {}).xiuxian || {};
    var nRag324 = SQ.normalize({ v: SQ.V, profile: mkProf([]), meta: {}, worlds: { xiuxian: JSON.parse(JSON.stringify(wRag324)) } });
    /* 判别的不是「引用没变」而是「本级真没触发」：触发时 out 是副本且 prodigies 被删 ⇒ 这里必须仍是数组 */
    var bail324 = Array.isArray(wRag324.prodigies) && wRag324.prodigies.length === 2 && !wRag324.prodCols
      && (function () { var p = (nRag324.worlds || {}).xiuxian.prodigies || [];
        return p.length === 2 && p[0].id === ragSrc324[0].id && p[1].id === ragSrc324[1].id; })();
    ok('324', '级⑪ prodigies 列存无损闭环（N70）：盘上确为 prodCols 形状 ‖ 同一 normalize 口径下列存档与不列存档还原结果逐字全等（30 条全回）‖ 混合形状记录 ⇒ 整级不触发、prodigies 原样落盘且照读（无损前提是证出来的，不是假定旧档同形）',
      shape324 && round324 && kOk324 && bail324 && (got324 || []).length === ref206.worlds.xiuxian.prodigies.length,
      '盘上k=' + (shape324 ? w324.prodCols.k.length : -1) + ' 行=' + (shape324 ? w324.prodCols.r.length : -1) +
        ' 还原条数=' + ((got324 || []).length) + ' 逐字全等=' + round324 + ' 键数对表=' + kOk324 +
        ' 混合形状不触发=' + bail324 + '（原样落盘' + (Array.isArray(wRag324.prodigies) ? wRag324.prodigies.length : 0) + '条）');

    /* #206b 日志存档：离线重开不丢早期日志（独立档 + 主档压缩阶梯不裁日志）+ 展示层每分类 200 上限 */
    localStorage.removeItem(SQ.KEY);
    localStorage.removeItem(SQ.Log.KEY);
    var ref206b = {};
    await SQ.mutate(ref206b, function (s206b) {
      s206b.profile = mkProf([]);
      s206b.worlds.xiuxian = pack.initialState();
      var w = s206b.worlds.xiuxian;
      w.realm = 5; w.stones = 1e6;
      /* 每分类 260 条（>展示上限 200）× 8 分类 = 2080 条；文本短 → 总量在 256KB 预算内不触发裁剪 */
      var cats206b = ['combat', 'idle', 'break', 'trib', 'event', 'shop', 'arts', 'sys'];
      for (var i206b = 0; i206b < 2080; i206b++) SQ.Log.push(w, cats206b[i206b % 8], '早期日志不该消失' + i206b, 1700000000000 + i206b);
      w.lastSave = Date.now() - 7200000;   /* 模拟离线 2 小时 */
    });
    var firstTs206b = ref206b.worlds.xiuxian.log[0].ts;   /* 最旧一条（应永不消失） */
    var nBefore206b = ref206b.worlds.xiuxian.log.length;
    await SQ.claim(ref206b);                               /* 离线重开：load → 离线结算 → save 全链路 */
    var re206b = await SQ.load();                          /* 再读一次（等价重开界面） */
    var log206b = re206b.worlds.xiuxian.log;
    var firstTsReload206b = log206b[0] && log206b[0].ts;
    var mainRaw206b = JSON.parse(localStorage.getItem(SQ.KEY));
    var mainHasLog206b = Array.isArray((((mainRaw206b.worlds || {}).xiuxian) || {}).log);
    /* 展示层口径复刻（view.journalLines「全部」分支）：每分类只取最新 200，超限分类渲染数恒 ≤200 */
    var per206b = {}, shown206b = 0;
    for (var j206b = log206b.length - 1; j206b >= 0; j206b--) {
      var c206b = log206b[j206b].cat;
      per206b[c206b] = (per206b[c206b] || 0) + 1;
      if (per206b[c206b] <= 200) shown206b++;
    }
    var expectShown206b = 0;
    for (var ck206b in per206b) expectShown206b += Math.min(per206b[ck206b], 200);
    var catsAll206b = Object.keys(per206b).length === 8;
    var eachCap206b = Object.keys(per206b).every(function (k) { return per206b[k] >= 200; });
    ok('206b', '日志存档：离线 2 小时重开 → 早期日志零丢失（独立档 + 主档阶梯不裁日志）；主档剥离 log；展示层每分类只取最新 200（8 分类各 ≥200 → 渲染 ' + shown206b + ' 条）',
      nBefore206b >= 2080 && log206b.length >= nBefore206b && firstTsReload206b === firstTs206b &&
      !mainHasLog206b && catsAll206b && eachCap206b && shown206b === expectShown206b && shown206b === 1600,
      'before=' + nBefore206b + ' after=' + log206b.length + ' 首条ts=' + firstTsReload206b +
      ' 主档含log=' + mainHasLog206b + ' 分类数=' + Object.keys(per206b).length + ' 渲染=' + shown206b + '/' + expectShown206b);

    /* #206c 旧档迁移：主档遗留日志 → 首读沿用 → 首次落盘迁入独立日志档、主档剥离 */
    localStorage.removeItem(SQ.KEY);
    localStorage.removeItem(SQ.Log.KEY);
    var old206c = {
      v: 1,
      profile: { name: '旧档', worldId: 'xiuxian', createdAt: 1, worldName: '罗云州', talents: [], alignBias: 'neutral' },
      meta: { unlockedWorlds: ['xiuxian'] },
      settings: { autoTrib: false, autoEvent: false, tabOrder: [] },
      worlds: { xiuxian: (function () {
        var w = pack.initialState();
        for (var k206c = 0; k206c < 300; k206c++) SQ.Log.push(w, k206c % 2 ? 'combat' : 'trib', '旧档遗留日志' + k206c, 1600000000000 + k206c);
        return w;
      })() }
    };
    localStorage.setItem(SQ.KEY, JSON.stringify(old206c));   /* 旧档：日志尚在主档内，无独立日志键 */
    var loaded206c = await SQ.load();
    var keptOnLoad206c = loaded206c.worlds.xiuxian.log.length === 300;   /* 首读沿用主档遗留日志（不丢） */
    var refMig206c = loaded206c;
    await SQ.save(refMig206c);                              /* 首次落盘 → 迁入独立日志档 */
    var store206c = JSON.parse(localStorage.getItem(SQ.Log.KEY));
    var storeN206c = ((store206c || {}).logs || {}).xiuxian ? store206c.logs.xiuxian.length : 0;
    var mainAfter206c = JSON.parse(localStorage.getItem(SQ.KEY));
    var mainHasLog206c = Array.isArray((((mainAfter206c.worlds || {}).xiuxian) || {}).log);
    var reloaded206c = await SQ.load();
    ok('206c', '日志存档迁移：旧档（日志在主档内、无独立日志键）首读沿用不丢 300 条 → 首次落盘迁入独立档且主档剥离 → 再读仍 300 条',
      keptOnLoad206c && storeN206c === 300 && !mainHasLog206c && reloaded206c.worlds.xiuxian.log.length === 300,
      '首读=' + loaded206c.worlds.xiuxian.log.length + ' 日志档=' + storeN206c +
      ' 主档含log=' + mainHasLog206c + ' 再读=' + reloaded206c.worlds.xiuxian.log.length);

    /* #248 容量级⑦：势力关系矩阵上半三角化——落盘只存上三角 + normalize 对称还原闭环（2026-10-05 存档容量防线批） */
    var fac248src = ref206.worlds.xiuxian.factions || [];
    var fac248res = ((n206r.worlds || {}).xiuxian || {}).factions || [];
    var relCntSrc248 = fac248src.reduce(function (n, f) { return n + Object.keys((f && f.rel) || {}).length; }, 0);
    var triExpect248 = fac206disk.length * (fac206disk.length - 1) / 2;
    var triOk248 = fac206disk.length >= 2 && relN206disk === triExpect248 && relN206disk < relCntSrc248;
    /* 还原闭环：逐对双向在场 + 关系值与落盘前逐条全等（关系语义零漂移） */
    var byIdSrc248 = {}; fac248src.forEach(function (f) { byIdSrc248[f.id] = f; });
    var symOk248 = true, pairN248 = 0;
    fac248res.forEach(function (fa) {
      fac248res.forEach(function (fb) {
        if (!(String(fa.id) < String(fb.id))) return;
        pairN248++;
        var s1 = (byIdSrc248[fa.id] || {}).rel || {}, s2 = (byIdSrc248[fb.id] || {}).rel || {};
        if (!fa.rel[fb.id] || !fb.rel[fa.id]) symOk248 = false;
        if (fa.rel[fb.id] !== s1[fb.id] || fb.rel[fa.id] !== s2[fa.id]) symOk248 = false;
      });
    });
    /* 旧档幂等：本就双向全存的档（级⑦从未触发过）normalize 后 rel 条目数与值零变化 */
    var ws248b = pack.initialState(); ws248b.realm = 2;
    SQ.Factions.generate(ws248b, pack, D);
    var relSnap248 = {}; ws248b.factions.forEach(function (f) { relSnap248[f.id] = JSON.stringify(f.rel); });
    var cntBefore248 = ws248b.factions.reduce(function (n, f) { return n + Object.keys(f.rel).length; }, 0);
    var n248b = SQ.normalize({ v: SQ.V, profile: { name: '甲', talents: [], worldId: 'xiuxian', worldName: '界', createdAt: 1 }, worlds: { xiuxian: ws248b }, meta: { unlockedWorlds: ['xiuxian'] } });
    var fac248b = n248b.worlds.xiuxian.factions || [];
    var cntAfter248 = fac248b.reduce(function (n, f) { return n + Object.keys(f.rel).length; }, 0);
    var idem248 = fac248b.length === ws248b.factions.length && cntAfter248 === cntBefore248 &&
      fac248b.every(function (f) { return relSnap248[f.id] === JSON.stringify(f.rel); });
    ok('248', '容量级⑦ 势力关系矩阵上半三角化：落盘 rel 条目 = n(n−1)/2 上三角（对称冗余回收 ≈一半）+ normalize 对称还原闭环（逐对双向在场、关系值与落盘前逐条全等、读端 Factions.byId().rel[] 零侵入）+ 旧档双向全存者 normalize 幂等（条目数与值零变化）',
      triOk248 && symOk248 && pairN248 === triExpect248 && idem248,
      '势力=' + fac206disk.length + ' rel落盘=' + relN206disk + '/上三角期望=' + triExpect248 +
      '/原双向=' + relCntSrc248 + ' 还原对数=' + pairN248 + ' 逐对全等=' + symOk248 + ' 旧档幂等=' + idem248);

    /* #249 容量级⑨：天骄榜面冻结快照裁除——视图回落实时榜（零功能损失）+ 其余 prodMarks 字段全保留 */
    var pm249src = ref206.worlds.xiuxian.prodMarks || {};
    var ws249 = (n206r.worlds || {}).xiuxian || {};
    var pm249 = ws249.prodMarks || {};
    var cut249 = Array.isArray(pm249src.rankRows) && pm249src.rankRows.length > 0 && !Array.isArray(pm206disk.rankRows);
    var fb249 = SQ.Prodigy.rankRows(ws249) === null;                 /* 既有契约：无快照 → null → 视图回落实时榜 */
    var live249 = SQ.Prodigy.board(ws249, pack, D);
    var liveOk249 = !!live249 && Array.isArray(live249.rows) &&
      live249.rows.length >= (ws249.prodigies || []).length && live249.myRank >= 1;
    var kept249 = pm249.slotMax === pm249src.slotMax && pm249.myRank === pm249src.myRank &&
      pm249.rankAt === pm249src.rankAt && pm249.sudiWin === pm249src.sudiWin &&
      Object.keys(pm249.evf || {}).length === Object.keys(pm249src.evf || {}).length;
    ok('249', '容量级⑨ 天骄榜面冻结快照裁除：落盘无 rankRows + 视图回落实时榜闭环（rankRows() 返回 null、board() 实时榜行数 ≥ 名录数且 myRank ≥ 1——prodigy.js 既有回落契约、零功能损失）+ 其余 prodMarks 字段全保留（slotMax 槽位不复用 / myRank / rankAt / sudiWin / evf 事件幂等键）',
      cut249 && fb249 && liveOk249 && kept249,
      '落盘裁除=' + cut249 + ' 回落null=' + fb249 + ' 实时榜=' + (live249 && live249.rows ? live249.rows.length : -1) +
      '行 myRank=' + (live249 ? live249.myRank : -1) + ' 名录=' + (ws249.prodigies || []).length + ' 字段保留=' + kept249);

    /* #250 容量级⑧：codices.title 折叠为差集——**无条件无损**（含称号溢出档往返实证）
     * 2026-10-05 存档容量防线批。初版设计为「删键 + 由 titles 重建」并挂「去重称号数 ≤ 80」前提护栏；
     * 经查图鉴传记卷 §2.9 称号墙为**动态面**、当前可获 ≈75（成就 59 + 逆天大劫 1 + 天骄榜位 + 跨世统计 ≈15）
     * 已逼近 addTitle 的 while(>80) shift 上限、余量仅 5 → 前提极脆，改存差集（titleX）后无条件无损。 */
    var AXc250 = (D.CODEX || {}).ACHV || [];
    var uniq250 = {};
    AXc250.forEach(function (a) { if (a.title && a.title !== '-') uniq250[a.title] = 1; });
    var achvTitleN250 = Object.keys(uniq250).length;
    var TITLES_CAP250 = 80;                        /* codex.js addTitle 的 shift 上限（同源常量） */
    /* (a) 真实档：折叠 + 还原（常态差集为空 → 落盘直接删 titleX 键） */
    var folded250 = Array.isArray(ref206.meta.codices.title) && ref206.meta.codices.title.length > 0 && lvl8_206;
    var rest250 = (n206r.meta || {}).codices ? n206r.meta.codices.title : null;
    var restoreOk250 = Array.isArray(rest250) && rest250.join() === ref206.meta.codices.title.join();
    var cnt250 = SQ.Codex.faceCount(n206r.meta, 'title');
    var countOk250 = cnt250 === ref206.meta.codices.title.length;
    var noX250 = ((re206.meta || {}).codices || {}).titleX == null;   /* 常态无溢出 → 不落 titleX 键 */
    /* (b) 溢出档：模拟 titles 已被 shift 挤掉最旧 2 条 → 差集必须承载并原序还原（无条件无损的实证） */
    var ref250 = JSON.parse(JSON.stringify(ref206));
    var full250 = ref250.meta.codices.title.slice();
    var OVER250 = ['title_overflow_a', 'title_overflow_b'];
    ref250.meta.codices.title = OVER250.concat(full250);              /* 图鉴面 = 溢出最旧 2 + 全部 */
    ref250.meta.titles = full250.slice(-TITLES_CAP250);               /* titles 只留最新 80（模拟 shift 后） */
    var keep250 = ref250.meta.karma;
    await SQ.save(ref250);
    var raw250 = localStorage.getItem(SQ.KEY);
    var disk250 = raw250 ? JSON.parse(raw250) : {};
    var dxCod250 = (disk250.meta || {}).codices || {};
    var foldHit250 = dxCod250.title == null;                          /* title 键确已折叠 */
    var xOnDisk250 = dxCod250.titleX;
    var xStr250 = (typeof xOnDisk250 === 'string') ? xOnDisk250 : (Array.isArray(xOnDisk250) ? xOnDisk250.join(',') : '');
    var xHas250 = xStr250.split(',').filter(function (x) { return OVER250.indexOf(x) >= 0; }).length === OVER250.length;
    var n250 = SQ.normalize(disk250);
    var back250 = ((n250.meta || {}).codices || {}).title;
    var lossless250 = Array.isArray(back250) && back250.join() === OVER250.concat(full250).join();  /* 溢出在前 = 原插入序 */
    var noResidue250 = ((n250.meta || {}).codices || {}).titleX == null;   /* 还原后差集键不残留 */
    var ident250 = n250.meta.karma === keep250;                        /* 遗泽恒等式不受折叠影响 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('250', '容量级⑧ codices.title 折叠为差集：真实档落盘无 codices.title + normalize 由已清洗 meta.titles 重建（逐字全等、faceCount 面计数不变、常态差集为空故不落 titleX 键）+ **溢出档往返实证无条件无损**（模拟 titles 被 addTitle 的 while(>80) shift 挤掉最旧 2 条 → 差集键 titleX 承载二者、还原 = titleX ++ titles 溢出在前恰为原插入序、还原后 titleX 不残留）+ 遗泽恒等式 #197 不受影响。**不依赖「称号数 ≤ 80」前提**——图鉴传记卷 §2.9 称号墙动态面当前可获 ≈75 已逼近上限余量仅 5，初版前提护栏极脆故改存差集（成就称号数仅作观察值报告）',
      folded250 && restoreOk250 && countOk250 && noX250 && foldHit250 && xHas250 && lossless250 && noResidue250 && ident250,
      '成就称号=' + achvTitleN250 + '/上限=' + TITLES_CAP250 + '（观察值·非前提） 真实档折叠=' + folded250 +
      ' 重建全等=' + restoreOk250 + ' 面计数=' + cnt250 + '/' + ref206.meta.codices.title.length +
      ' 常态无titleX=' + noX250 + ' ‖ 溢出档: title键折叠=' + foldHit250 + ' titleX承载=' + xHas250 +
      '(' + xStr250 + ') 原序无损=' + lossless250 + ' 还原后无残留=' + noResidue250 + ' 恒等式=' + ident250);

    /* #251 展示流侧档化（存档治理批 2026-10-09 **改口径** · 原口径逐字保留于下注）
     * 原口径 = 阶梯级⑩ 在触发线之上把主档 `eventHistory.feed` 裁至最近 5 条（代价 = 重载后玩家奇遇
     *   历史只剩尾巴，且要等主档超 56KB 才动）。
     * 新口径 = feed **恒常不进主档**、整体落侧档 `sanqian-logs-v1` 的 `feed` 段（与日志同键同预算范式），
     *   级⑩ 降级为「侧档写失败时的保险」，判据 (d) 证明它仍是活的。〔🔧 **第十四批作废**：级⑩ 整族删除 ⇒ 侧档写失败/读不动时**没有主档侧兜底**，只剩 `ioError` 那条留痕〕
     * 判据：(a) 主档无 feed、`lastId`/`seen` 照旧在主档（去重与 once 幂等非展示流）；
     *       (b) 侧档 feed 满档 50 条**逐条与源全等**且新在前（不是随机取样、不是截断）；
     *       (c) 真机 `SQ.load` 回填后 feed === 落盘前 ⇒ **原级⑩的玩家可见代价被取消**；
     *       (d) 级⑩ 保险仍活：直调 `SQ.compressForSave(带 feed 的态, now, 极小触发线)` → 落盘 feed ≤5；
     *           〔🔧 **第十四批（2026-10-11）该判据作废并改向**：级⑩ 整族删除 ⇒ (d) 现判「feed 全留 + stage 11 不再出现」，
     *           见下方 #251 的 (d) 块；恒真的 `0<=5` 同时从 #206 明细里摘掉。〕
     *       (e) 侧档字节预算：超 `FEED_BYTE_BUDGET` 的流 → 保最新、挤最旧（条数 >5，非固定 5）；
     *       (f) 内存态零污染（save 前后活档全等）。 */
    var feed251src = (ref206.worlds.xiuxian.eventHistory || {}).feed || [];
    var ref251 = JSON.parse(JSON.stringify(ref206));
    var eh251live = ref251.worlds.xiuxian.eventHistory;
    var snap251a = (function () { var c = JSON.parse(JSON.stringify(ref251)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    /* #250 收尾把两把键 removeItem 了，而本模块的侧档签名缓存无从感知外部清档 ⇒ 复位（生产路径 = resetSave） */
    SQ.Side.resetSig();
    await SQ.save(ref251);
    var disk251Raw = localStorage.getItem(SQ.KEY);
    var disk251 = disk251Raw ? JSON.parse(disk251Raw) : {};
    var side251Raw = localStorage.getItem(SQ.Log.KEY);
    var side251 = side251Raw ? JSON.parse(side251Raw) : {};
    var eh251disk = ((disk251.worlds || {}).xiuxian || {}).eventHistory || {};
    var noFeedOnDisk251 = eh251disk.feed == null;                                 /* (a) */
    var idemOnDisk251 = eh251disk.lastId === eh251live.lastId &&
      Object.keys(eh251disk.seen || {}).length > 0;                               /* (a) 幂等键仍在主档 */
    var sideFeed251 = Array.isArray((side251.feed || {}).xiuxian) ? side251.feed.xiuxian : [];
    var sideFull251 = sideFeed251.length === (D.EVENT_FEED_CAP || 50) &&
      sideFeed251.every(function (e, i) { return JSON.stringify(e) === JSON.stringify(feed251src[i]); });  /* (b) */
    var back251 = await SQ.load();
    var backFeed251 = (((back251.worlds || {}).xiuxian || {}).eventHistory || {}).feed || [];
    var reloadKept251 = backFeed251.length === feed251src.length &&                                    /* (c) */
      backFeed251.every(function (e, i) { return JSON.stringify(e) === JSON.stringify(feed251src[i]); });
    /* (d) 原「级⑩ 保险」已于第十四批整族删除（审计 #13）：`savePayload` 先 `stripSideFlows` 剥掉
     * eventHistory.feed，阶梯再拿到的是**已经没有 feed 的载荷** ⇒ 那一级在结构上不可达，而 #206 的明细
     * 却把「级⑩=触发」恒打印（feed 落盘 0 条 ⇒ `0<=5` 恒真）。这里改为判**删除本身成立**：
     * 带 feed 的状态直过全阶梯（极小触发线）后 feed **一条不少**，且级号 11 不再出现在 stages 里。 */
    var ins251 = JSON.parse(JSON.stringify(ref251));
    var feedN0251 = (((ins251.worlds || {}).xiuxian || {}).eventHistory || {}).feed.length;
    var rr251 = await SQ.compressForSave(ins251, Date.now(), 1);
    var insEh251 = ((rr251.out.worlds || {}).xiuxian || {}).eventHistory || {};
    var insFeedArr251 = Array.isArray(insEh251.feed) ? insEh251.feed : [];
    /* 判据改口（第册卅三批）：原靠 `stages.indexOf(11) < 0` 侧证「级⑩ 已删」⇒ 级号 11 现已由
     * 级⑪ prodigies 列存借用，代理失效（写死级号当证据会被后续批咬）。直判落盘形状：feed 一条不裁。 */
    var insured251 = feedN0251 > 0 && insFeedArr251.length === feedN0251 &&
      insFeedArr251.every(function (e, i) {
        return JSON.stringify(e) === JSON.stringify(ins251.worlds.xiuxian.eventHistory.feed[i]); });
    /* (e) 侧档字节预算（feed 新在前 ⇒ 从尾部最旧挤起、首条恒为最新） */
    var big251 = [];
    for (var bq251 = 0; bq251 < 50; bq251++) {
      big251.unshift({ id: 'ev' + bq251, ts: 1000 + bq251, branch: 'right', tier: 1, nature: 'n',
        pass: true, hadCheck: false, karma: 0, eff: { txt: '字'.repeat(1200) } });
    }
    var trimmed251 = SQ.Side.trimFeed(big251.slice());
    var budgetOk251 = trimmed251.length < big251.length && trimmed251.length > 5 &&
      trimmed251[0].id === big251[0].id && big251[0].id === 'ev49';
    var bytesOk251 = SQ.Side.feedBytes(big251[0]) > 1000 && SQ.Side.FEED_BYTE_BUDGET === 32 * 1024;
    var snap251b = (function () { var c = JSON.parse(JSON.stringify(ref251)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    var clean251 = snap251a === snap251b;                                          /* (f) */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('251', '展示流侧档化（原阶梯级⑩改口径 · 2026-10-09 存档治理批）：`eventHistory.feed` **恒常不进主档**、整体落侧档 `feed` 段 ⇒ 主档体积与实际游玩时长解耦。(a) 主档无 feed 而 `lastId`/`seen` 仍在主档（幂等键不属展示流）(b) 侧档 feed 满档 50 条逐条与源全等、新在前 (c) 真机 `SQ.load` 回填后历史**一条不丢**（原级⑩「重载只剩 5 条」的玩家可见代价被取消）(d) 级⑩ 已整族删除（第十四批）：直调 compressForSave 极小触发线 → 落盘 feed 一条不裁 (e) 侧档按 `FEED_BYTE_BUDGET`(32KB) 裁、保最新挤最旧且条数 >5（非固定 5）(f) 内存态零污染。**动机**：feed 满档 ≈11~14KB 是真实存档最大单项（CAP_WATCH 10.5~11.2KB > codices/factions/prodigies），此前只在触发线之上才裁、且一刀裁到 5 条',
      noFeedOnDisk251 && idemOnDisk251 && sideFull251 && reloadKept251 && insured251 && budgetOk251 && bytesOk251 && clean251,
      '主档含feed=' + (Array.isArray(eh251disk.feed)) + ' 幂等键在主档=' + idemOnDisk251 +
      ' 侧档=' + sideFeed251.length + '/' + (D.EVENT_FEED_CAP || 50) + ' 逐条全等=' + sideFull251 +
      ' 重载保留=' + reloadKept251 + '(' + backFeed251.length + '条) 级⑩已删(feed 全留 ' + insFeedArr251.length + '/' + feedN0251 + ' 条、一条不裁)=' + insured251 +
      ' 预算裁=' + trimmed251.length + '/' + big251.length + '>5=' + (trimmed251.length > 5) +
      ' 内存零污染=' + clean251);

    /* #277 阶梯纯函数化 + 到期冷却恒常剔除（存档治理批 2026-10-09）
     * (a) **活档零摧毁**（本批修的缺陷）：改造前就地级 ⓪~⑤ 直接改 `s.meta` / `s.worlds[wk]`，而
     *     savePayload 只浅拷贝顶层 ⇒ 一次触发有损级会同时摧毁玩家内存态（传记 9→6、karmaLog 20→10、
     *     trib 逐世键被并、到期冷却键被删、seen 被剪）。取证 = 用 #206 满档模型（剥离展示流后原账
     *     仍 >56KB ⇒ 阶梯必触发）走真 `SQ.save`：**save 前后活档逐字段全等**，而**盘上**同字段确已被裁
     *     ⇒ 「落盘降级 / 内存无损」双向同档实证（只证一侧都不算）。
     * (b) 到期 `eventCooldowns` 由阶梯级③升为**落盘恒常前置**（不等触发线）：到期键不落盘、未到期键在档、
     *     内存态两键都在（触发面只读 `cd > now` 一侧 ⇒ events.js:497 / rumors.js:222 零波及）。
     * (c) 阶梯跑完的落盘档经 normalize 后 #197 遗泽恒等式续绿（级②并额 ΣearnedKeys 不变、级⑧b 折叠可还原）。 */
    var fat277 = JSON.parse(JSON.stringify(ref206));
    var w277 = fat277.worlds.xiuxian;
    /* 冷却键语义（本批复核修正 · 复核报告列为 blocker）：`ws.eventCooldowns` 存的是**触发时刻**
     * （写口 events.js:573/604 · rumors.js:236 · prodigy.js:388），读端判据 `now < cd + cooldownHours×3600e3`
     * （events.js:498 / rumors.js:223），另有一种**旧**写法存到期时刻（events.js 原 :924 = now + cdFailHours；神秘商人节律批 2026-10-10 已改为存等效触发时刻，现写点 :936 —— 本 fixture 仍造这一形状，核的是「两式都安全」而不是「现树还有两式」。另注：`rumors.js` 的取值守卫在 :222、判定行在 :223）。
     * ⇒ 首版把「值 < now」当到期并**恒常剪**，等于每次存档清空活冷却 ⇒ 已撤回；现要求：
     *    (b1) 落盘**不剪任何冷却键**（阶梯未触发的常规档）；(b2) 强跑阶梯时只剪「值 < now − COOL_MAX_HOURS」的**可证死键**；
     *    (b3) 内存态三键恒在（活档不剪）。 */
    var cdNow277 = Date.now();                               /* 取当时的引擎时钟，语义 = 相对「现在」 */
    w277.eventCooldowns = {
      justFired277: cdNow277 - 1000,                          /* 1 秒前触发 = 冷却正紧 */
      liveGate277: cdNow277 + 3600000,                        /* 旧 events.js :924 式（到期时刻在未来；现树写点已改 :936） */
      deadLong277: cdNow277 - 200 * 3600000                   /* 200 小时前触发 > 168h 池内最长冷却 = 可证死键 */
    };
    var biosLivePre277 = (fat277.meta.biographies || []).length;
    var karmaLivePre277 = (fat277.meta.karmaLog || []).length;
    var seenLivePre277 = Object.keys((w277.eventHistory || {}).seen || {}).length;
    var snap277a = (function () { var c = JSON.parse(JSON.stringify(fat277)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    await SQ.save(fat277);
    var snap277b = (function () { var c = JSON.parse(JSON.stringify(fat277)); delete c.worlds.xiuxian.log; return JSON.stringify(c); })();
    var disk277 = JSON.parse(localStorage.getItem(SQ.KEY));
    var d277w = (disk277.worlds || {}).xiuxian || {};
    var liveKept277 = snap277a === snap277b;                                        /* (a) 内存侧 */
    var diskBios277 = (disk277.meta.biographies || []).length;
    var diskKarma277 = (disk277.meta.karmaLog || []).length;
    var diskSeen277 = Object.keys(((d277w.eventHistory || {}).seen) || {}).length;
    var diskTrimmed277 = diskBios277 <= 6 && diskKarma277 <= 10 && diskSeen277 <= 40;  /* (a) 盘侧 = 反向证据 */
    var cdKept277 = !!d277w.eventCooldowns && d277w.eventCooldowns.justFired277 != null &&
      d277w.eventCooldowns.liveGate277 != null &&
      w277.eventCooldowns.justFired277 != null && w277.eventCooldowns.liveGate277 != null &&
      w277.eventCooldowns.deadLong277 != null;                 /* (b1)+(b3) 常规档不剪活冷却、内存态不动 */
    /* (b2) 强跑阶梯（极小触发线）⇒ 只允许剪「now − COOL_MAX_HOURS」之前的死键 */
    var cdForced277 = await SQ.compressForSave(JSON.parse(JSON.stringify(fat277)), cdNow277, 1);
    var cdF277 = (((cdForced277.out.worlds || {}).xiuxian || {}).eventCooldowns) || {};
    var cdRule277 = cdF277.justFired277 != null && cdF277.liveGate277 != null && cdF277.deadLong277 == null;
    /* (d) 反漂移：池内 cooldownHours 最大值必须 ≤ 常量，否则死键判据会误剪活冷却 */
    var maxCd277 = 0;
    SQ.Events.allIds(pack).forEach(function (id277) {
      var e277 = SQ.Events.findById(pack, id277);
      var h277 = e277 && (e277.cooldownHours != null ? e277.cooldownHours : e277.cd);
      if (typeof h277 === 'number' && h277 > maxCd277) maxCd277 = h277;
    });
    var guard277 = maxCd277 <= SQ.COOL_MAX_HOURS;
    var n277 = SQ.normalize(JSON.parse(JSON.stringify(disk277)));
    var ident277 = identOk(n277.meta);                                              /* (c) */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    ok('277', '阶梯纯函数化 + 冷却键语义修正（2026-10-09 存档治理批 · 复核返修）：(a) 以 #206 满档模型走真 `SQ.save`（阶梯确已触发）——**落盘降级、内存无损**双向实证：save 前后活档逐字段全等（biographies ' + biosLivePre277 + ' / karmaLog ' + karmaLivePre277 + ' / seen ' + seenLivePre277 + ' 一字不动），而盘上同字段已裁到 ⓪①⑤ 上限（改造前有损级会同时摧毁玩家内存态，本条即该缺陷的收口取证）(b) 冷却键语义修正（复核抓获的 blocker 返修）：容器存的是**触发时刻**而非到期时刻 ⇒ 落盘**恒常不剪**（(b1) 一秒前触发的键照旧在档 + (b3) 内存态三键俱在），只有阶梯级③ 在触发线之上剪「值 < now − COOL_MAX_HOURS」的**可证死键**（(b2) 实测 200h 前的键被剪、1s 前与未来到期两键不动）(c) 反漂移判据：池内 cooldownHours 最大值 ≤ SQ.COOL_MAX_HOURS (d) 阶梯跑完的落盘档 normalize 后 #197 恒等式续绿',
      liveKept277 && diskTrimmed277 && cdKept277 && cdRule277 && guard277 && ident277,
      '活档全等=' + liveKept277 + ' 盘上裁=' + diskTrimmed277 +
      '(bios ' + diskBios277 + '/' + biosLivePre277 + ' karmaLog ' + diskKarma277 + '/' + karmaLivePre277 +
      ' seen ' + diskSeen277 + '/' + seenLivePre277 + ')' +
      ' 冷却常规档=' + Object.keys(d277w.eventCooldowns || {}).join('/') +
      ' 强跑阶梯=' + Object.keys(cdF277).join('/') +
      ' 池内最大冷却=' + maxCd277 + 'h/常量=' + SQ.COOL_MAX_HOURS + 'h #197=' + ident277);

    /* #278 侧档读不动 ⇒ **禁止覆盖**（2026-10-09 存档治理批 · 复核报告列为 blocker 的返修取证）
     * 场景：主档已不含展示流（治理后恒真），若侧档因宿主截断 / 脏字节 / 宿主缺 CompressionStream 而读不动，
     *      内存态就是空的 ⇒ 照写就是把玩家的日志与奇遇史整族抹掉。
     * 判据：(a) 有值但解不出 = unreadable 置真；(b) 期间 save **不动侧档字节**（宁可留着坏档也不覆盖）；
     *      (c) 脏值被清掉后同一写口立刻恢复正常落盘（不是永久哑火）；(d) 侧档本就缺键（新档）不算读不动、照写。 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var junk278 = '{"v":1,"logs":{"xiuxian":[{"ts":1,"cat":"sys","text":"旧一行"}';   /* 截断 = JSON 解析必失败 */
    localStorage.setItem(SQ.Log.KEY, junk278);
    var s278 = await SQ.load();
    var unread278 = SQ.Side.unreadable() === true;
    var w278 = s278.worlds.xiuxian || (s278.worlds.xiuxian = pack.initialState());
    SQ.Log.push(w278, 'sys', '治理批取证行');
    await SQ.save(s278);
    var after278 = localStorage.getItem(SQ.Log.KEY);
    var noWipe278 = after278 === junk278;
    /* (c) 清掉脏值后同一写口须能落盘 */
    localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    await SQ.save(s278);
    var side278c = null;
    try { side278c = JSON.parse(localStorage.getItem(SQ.Log.KEY)); } catch (e278) {}
    var recover278 = !!(side278c && Array.isArray(side278c.logs.xiuxian) && side278c.logs.xiuxian.length >= 1 &&
      SQ.Side.unreadable() === false);
    /* (d) 全新档（侧档无键）不算读不动 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    await SQ.save(SQ.defaultState());
    var fresh278 = SQ.Side.unreadable() === false && localStorage.getItem(SQ.Log.KEY) != null;
    ok('278', '侧档读不动 ⇒ 禁止覆盖（2026-10-09 存档治理批 · 复核 blocker 返修）：(a) 有值但解不出即置 unreadable (b) 期间存档**不动侧档字节**——主档治理后本就不含展示流，照写会把玩家日志与奇遇史整族抹掉 (c) 脏值清除后同一写口立刻恢复落盘（不是永久哑火） (d) 新档（侧档无键）不算读不动、照写',
      unread278 && noWipe278 && recover278 && fresh278,
      'unreadable=' + unread278 + ' 未覆盖=' + noWipe278 + ' 恢复=' + recover278 + ' 新档可写=' + fresh278);

    /* #279 冷却跨「落盘 → 重载」仍生效（2026-10-09 复核返修的**行为面**取证）
     * 与 #277(b) 的形态面判据互补：那里核「键在不在档上」，这里核「判据是不是真的还拦得住」。
     * 取 lost_child（cooldownHours 24）：① 触发时刻 = now − 1h（冷却中）⇒ buildPool 不含它；
     * 真 save → SQ.load 后 ② 仍不含（键随档回来了）；③ 反向对照 触发时刻 = now − 25h（已过 24h）⇒ 含它
     * ——③ 同时证明 ①② 不是被 condOk 之类旁路条件挡住的**空过**（若被旁路挡住，③ 也会不含）。*/
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var now279 = Date.now();
    var ev279 = SQ.Events.findById(pack, 'lost_child');
    var poolWith279 = function (cdAt) {
      var w = pack.initialState();
      w.eventCooldowns[ev279.id] = cdAt;
      var list = SQ.Events.buildPool(pack, w, D, ev279.tier, ev279.nature, now279);
      return list.some(function (e) { return e.id === ev279.id; });
    };
    var cdHours279 = (ev279.cooldownHours != null ? ev279.cooldownHours : ev279.cd);
    var inPoolFresh279 = poolWith279(now279 - 1000);          /* 冷却中 ⇒ 应 false */
    var inPoolAged279 = poolWith279(now279 - (cdHours279 + 1) * 3600000);  /* 已过冷却 ⇒ 应 true */
    /* 真落盘 → 真读档：带一枚「冷却中」的键过一遍存储层 */
    var s279 = SQ.defaultState();
    s279.profile = mkProf(); s279.profile.name = '冷却复核';
    s279.worlds.xiuxian = pack.initialState();
    var w279 = s279.worlds.xiuxian;
    w279.eventCooldowns[ev279.id] = now279 - 1000;
    w279.realm = 3;
    await SQ.save(s279);
    var r279 = await SQ.load();
    var w279b = r279.worlds.xiuxian;
    var keyBack279 = w279b.eventCooldowns[ev279.id] === now279 - 1000;
    var pool279b = SQ.Events.buildPool(pack, w279b, D, ev279.tier, ev279.nature, now279);
    var stillBlocked279 = !pool279b.some(function (e) { return e.id === ev279.id; });
    var disk279 = (await SQ.readStored()) || {};   /* readStored 已解码 + parse，不再 JSON.parse */
    var onDisk279 = ((disk279.worlds || {}).xiuxian || {}).eventCooldowns != null &&
      ((disk279.worlds || {}).xiuxian || {}).eventCooldowns[ev279.id] === now279 - 1000;
    ok('279', '冷却跨「落盘→重载」仍生效（2026-10-09 复核返修 · 行为面取证）：lost_child（cooldownHours ' + cdHours279 + 'h）触发 1 秒后 ① buildPool 不含它 ② 真 save→load 后键值精确回来、pool 仍不含（= 不会重载后立刻重复出同一奇遇）③ 反向对照触发 ' + (cdHours279 + 1) + ' 小时后 pool 含它 —— ③ 同时证明 ①② 不是被 condOk 之类旁路条件挡出的空过（首版恒常剪枝会让本条必红）',
      inPoolFresh279 === false && inPoolAged279 === true && keyBack279 && stillBlocked279 && onDisk279,
      '冷却中在池=' + inPoolFresh279 + ' 过冷却在池=' + inPoolAged279 + ' 重载键回=' + keyBack279 +
      ' 重载仍拦=' + stillBlocked279 + ' 盘上有键=' + onDisk279);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #280 展示流两族裁剪口径统一 = 落盘裁副本、内存一字不动（2026-10-09 展示流与落档口径批）
     * 立因：#277 那批把「压缩阶梯就地级摧毁内存态」修成纯函数，但**侧档写入路径留了同型漏网**——
     *   `writeLogsIfChanged` 直调 `trimLogBudget(w.log)`，而该函数当时是「就地裁」（`list.length = 0`
     *   再回填）⇒ 一次落盘就把玩家内存里的日志按**落盘预算**削短，且隔壁 feed 走的是副本，
     *   同一个侧档里两族口径相反。本批把两族统一成纯函数，判据按「同一件事在两族各证一遍」写。
     * 判据：(a) save 前后**内存** log 条数与逐条内容全等（旧实现必红 = 本条同时是反向对照）
     *       (b) 落盘侧档 log 条数**确实小于**内存条数（防「两边都不裁」的假绿）
     *       (c) 落盘侧档 log 字节 ≤ LOG_BYTE_BUDGET（预算仍是主约束）
     *       (d) feed 同型三件：内存 80 条不动 / 侧档 ≤ FEED_STORE_CAP 且 < 内存 / 侧档字节 ≤ FEED_BYTE_BUDGET
     *       (e) 单元级纯度：直接调 SQ.Log.trimBudget(src) 与 SQ.Side.trimFeed(src) ⇒ 返回**新数组**、
     *           src 条数与序列化逐字不变（这条把「调用侧要记得 slice」的隐患从判据里根除）
     *       (f) 不裁内存 ≠ 不丢：重载后内存 = 落盘集合，首条 ts 与落盘首条精确对上 */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);
    var s280 = SQ.defaultState();
    s280.profile = mkProf(); s280.profile.name = '侧档纯度';
    s280.worlds.xiuxian = pack.initialState();
    var w280 = s280.worlds.xiuxian;
    /* 400 条同源日志（>LOG_CAT_CAP 200 ⇒ 有一半是可裁的未保护项）；文本取 ASCII 使「字符数 ≈ UTF-8 字节数」，
       判据 (c) 才能拿 JSON.stringify 长度直接对预算 */
    for (var l280 = 0; l280 < 400; l280++) SQ.Log.push(w280, 'sys', 'L'.repeat(900) + '#' + l280, 1700000000000 + l280);
    var memLogN280 = w280.log.length;
    var memLogSig280 = JSON.stringify(w280.log);
    /* feed 80 条（>FEED_STORE_CAP 60 ⇒ 条数兜底先收一刀，再走字节预算） */
    w280.eventHistory = w280.eventHistory || { seen: {}, feed: [] };
    for (var f280 = 0; f280 < 80; f280++) {
      w280.eventHistory.feed.push({ id: 'purity_check', ts: 1700000000000 + f280, branch: 'branch_safe',
        tier: 'ren', nature: 'neutral', pass: true, hadCheck: false, karma: 0,
        eff: { stones: 100 + f280, qi: 'P'.repeat(400) }, via: 'smoke' });
    }
    var memFeedN280 = w280.eventHistory.feed.length;
    var memFeedSig280 = JSON.stringify(w280.eventHistory.feed);
    await SQ.save(s280);
    var memLogAfter280 = w280.log.length === memLogN280 && JSON.stringify(w280.log) === memLogSig280;
    var memFeedAfter280 = w280.eventHistory.feed.length === memFeedN280 && JSON.stringify(w280.eventHistory.feed) === memFeedSig280;
    var side280 = JSON.parse(localStorage.getItem(SQ.Log.KEY) || '{}');
    var dLog280 = (side280.logs || {}).xiuxian || [];
    var dFeed280 = (side280.feed || {}).xiuxian || [];
    var dLogBytes280 = JSON.stringify(dLog280).length;
    var dFeedBytes280 = JSON.stringify(dFeed280).length;
    /* (e) 单元级纯度对表：先序列化传入数组本身，调完再比 */
    var src280L = w280.log, before280L = src280L.length, snap280L = JSON.stringify(src280L);
    var ret280L = SQ.Log.trimBudget(src280L);
    var pure280L = ret280L !== src280L && src280L.length === before280L && JSON.stringify(src280L) === snap280L && ret280L.length < before280L;
    var src280F = w280.eventHistory.feed, before280F = src280F.length, snap280F = JSON.stringify(src280F);
    var ret280F = SQ.Side.trimFeed(src280F);
    var pure280F = ret280F !== src280F && src280F.length === before280F && JSON.stringify(src280F) === snap280F && ret280F.length < before280F;
    /* (f) 重载：内存集合应等于落盘集合（读档本来就取侧档副本，不受本批改动的副作用） */
    var r280 = await SQ.load();
    var rl280 = (r280.worlds.xiuxian || {}).log || [];
    var reloadOk280 = rl280.length === dLog280.length && rl280[0] && dLog280[0] && rl280[0].ts === dLog280[0].ts &&
      rl280[rl280.length - 1].ts === dLog280[dLog280.length - 1].ts;
    ok('280', '展示流两族裁剪统一为纯函数（2026-10-09 展示流与落档口径批）：一次落盘不再削短玩家内存。(a) 内存 log ' + memLogN280 + ' 条 save 后逐字不变 (b) 侧档 log 反被裁到 ' + dLog280.length + ' 条（证明确实在裁）(c) 侧档 log 字节 ' + dLogBytes280 + ' ≤ 预算 ' + SQ.Log.BYTE_BUDGET + ' (d) feed 内存 ' + memFeedN280 + ' 条不动而侧档 ' + dFeed280.length + ' 条 ≤ FEED_STORE_CAP ' + SQ.Side.FEED_STORE_CAP + ' (e) trimBudget/trimFeed 返回新数组、传入逐字不变 (f) 重载后内存 == 落盘集合',
      memLogAfter280 && memFeedAfter280 && dLog280.length < memLogN280 && dLogBytes280 <= SQ.Log.BYTE_BUDGET &&
      dFeed280.length < memFeedN280 && dFeed280.length <= SQ.Side.FEED_STORE_CAP && dFeedBytes280 <= SQ.Side.FEED_BYTE_BUDGET &&
      pure280L && pure280F && reloadOk280,
      '内存log=' + memLogN280 + '→' + w280.log.length + ' 侧档log=' + dLog280.length + '/' + dLogBytes280 + 'B' +
      ' 内存feed=' + memFeedN280 + '→' + w280.eventHistory.feed.length + ' 侧档feed=' + dFeed280.length + '/' + dFeedBytes280 + 'B' +
      ' 纯函数log/feed=' + pure280L + '/' + pure280F + ' 重载等=' + reloadOk280);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #281 `owned[].st` 无 schema 透传面的护栏形态交底（2026-10-09 展示流与落档口径批 · 治理批 ⑨ 遗留项）
     * 裁定 = **登记制而非运行时收敛**：白名单砍键会砍掉未来合法字段并破「读档往返无损」那一族判据，
     *   代价大于收益；改为「写点必须先登记进 `SQ.Treasures.ST_KEYS`」，由两道闸守：
     *   `audit.cjs` **A7**（静态扫 `assets/**` 的 `.st.<key>` 写点与本表**双向对表**）+ 本条（运行时语义与收集器本身）。
     * 判据：(a) 登记表在位且逐条带出处（长度 ≥ 7，缺表 ⇒ 纪律失守）
     *       (b) `normalize` 对 `st` 是**整块透传**：脏档里的表外键原样留档（= 本面确实无 schema，
     *           这条不是在赞成本风险，而是把「为什么必须靠登记制」写成可执行的证据）
     *       (c) 非 plain object 的 `st` 被复位为 `{}`（唯一存在的收敛动作，防脏档穿透成怪形）
     *       (d) 收集器反向对照：往一枚 owned.st 塞表外假键 ⇒ 如实报「表外键」（证明本条不是恒真）
     *       (e) 真入口写出来的键 ⊆ 登记表：跑 `treasureTick`/`tribOnFail` 两径后收集观测键集，
     *           观测非空时逐条必须在册（观测为空只作读数打印，不冒充覆盖——静态半区由 A7 全覆盖） */
    var reg281 = (SQ.Treasures && SQ.Treasures.ST_KEYS) || null;
    var regOk281 = Array.isArray(reg281) && reg281.length >= 7 &&
      ['hours', 'karmaH', 'kills', 'cdUntil', 'tower', 'usedRealm', 'spirit'].every(function (k) { return reg281.indexOf(k) >= 0; });
    var nz281 = SQ.Treasures.normalize({
      owned: [{ id: 'x01', st: { legacy_orphan: 7, hours: 5 } }, { id: 'x02', st: 123 }, { id: 'x03' }],
      slots: ['x01', null, null], fate: {}, bondCount: 0
    }, pack);
    var o281 = (nz281 && nz281.owned) || [];
    var passThrough281 = !!(o281[0] && o281[0].st && o281[0].st.legacy_orphan === 7 && o281[0].st.hours === 5);
    var resetBad281 = !!(o281[1] && o281[1].st && typeof o281[1].st === 'object' && Object.keys(o281[1].st).length === 0) &&
      !!(o281[2] && o281[2].st && typeof o281[2].st === 'object');
    /* (d) 反向对照 + (e) 真入口观测：造一件在册键 + 一件表外键，收集器必须只放行前者 */
    var w281 = pack.initialState();
    var sink281 = function () {};
    var obsCollect = function (ws) {
      var out = {};
      ((((ws || {}).treasures || {}).owned) || []).forEach(function (e) {
        if (e && e.st && typeof e.st === 'object') Object.keys(e.st).forEach(function (k) { out[k] = (out[k] || 0) + 1; });
      });
      return Object.keys(out).sort();
    };
    SQ.Treasures.gain(w281, pack, D, 'x01', sink281);
    SQ.Treasures.gain(w281, pack, D, 'x03', sink281);
    SQ.Treasures.gain(w281, pack, D, 'x09', sink281);
    var eq281 = ['x01', 'x03', 'x09'].map(function (id) {
      var r = SQ.Treasures.equip(w281, pack, D, id, sink281);
      return r && r.ok;
    });
    var obsClean281 = obsCollect(w281);
    var host281 = ((w281.treasures || {}).owned || [])[0];
    if (host281) { host281.st = host281.st || {}; host281.st.smoke_probe_offlist = 1; }
    var obsDirty281 = obsCollect(w281);
    var rev281 = obsDirty281.indexOf('smoke_probe_offlist') >= 0 &&
      obsDirty281.filter(function (k) { return reg281.indexOf(k) < 0; }).length === 1;
    if (host281) delete host281.st.smoke_probe_offlist;
    var obsReal281 = obsCollect(w281);
    var realSubset281 = obsReal281.every(function (k) { return reg281.indexOf(k) >= 0; });
    /* 真入口至少跑出过一枚在册键：x03（special=tower，reqs 境界3+神40）与 x09（budou，reqs 境界3+气40）
     * 装备成功后 `tribOnFail` 写 st.tower / st.usedRealm、`tickIdle` 写 st.hours/karmaH ⇒ 观测非空才谈得上覆盖。*/
    var w281b = pack.initialState(); w281b.realm = 6;
    w281b.attrs = { jing: 60, qi: 60, shen: 60 };
    ['x03', 'x09'].forEach(function (id) { SQ.Treasures.gain(w281b, pack, D, id, sink281); SQ.Treasures.equip(w281b, pack, D, id, sink281); });
    var eqOk281 = ['x03', 'x09'].every(function (id) { return SQ.Treasures.isEquipped(w281b, id); });
    try { SQ.Treasures.tribOnFail(w281b, pack, D, {}, 0.4, sink281); } catch (e281) {}
    try { SQ.Treasures.tickIdle(w281b, pack, D, 7200, 1700000000000, sink281); } catch (e281b) {}
    var obsTick281 = obsCollect(w281b);
    var tickSubset281 = obsTick281.every(function (k) { return reg281.indexOf(k) >= 0; });
    ok('281', '法宝运行态 st = 无 schema 透传面，护栏形态 = 登记制（ST_KEYS ' + (reg281 || []).length + ' 键在册）：normalize 整块带过(脏档表外键原样留档)、非对象 st 复位为 {}、收集器反向对照如实报表外假键、真入口(装备两件脚本型法宝跑通)观测到 ' + obsTick281.length + ' 键且全在册（**观测非空是判据之一**，防空过）',
      regOk281 && passThrough281 && resetBad281 && rev281 && realSubset281 && tickSubset281 && eqOk281 && obsTick281.length >= 1,
      '表=' + reg281.join(',') + ' 装备成功=' + eq281.join('/') + ' 观测(造脏)=' + obsDirty281.join(',') +
      ' 观测(真入口)=' + (obsTick281.join(',') || '空') + ' 反向=' + rev281 + ' 在册子集=' + (realSubset281 && tickSubset281));
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #282 传记条数三口径 = 单一取数处（2026-10-09 展示流与落档口径批 · 治理批 ⑨「BIO_KEEP 零消费点」收口）
     * 判据不写「数字对得上」（三处各写死 6/9 也能对上），写的是**把表里的值挪一下，三处消费点必须一起动**：
     *   (a) 声明在位：`D.LEGACY.BIO_KEEP`（读档容错上界）与 `D.LEGACY.BIO_STORE_CAP`（落盘上界 = 正典① 6 世）
     *       都在，且 keep > store（容错上界若 ≤ 落盘上界，旧档一进就丢 = 破无损）
     *   (b) `SQ.BioCaps.keep()/store()` 逐字等于表值
     *   (c) 把表临时改成 keep=4 / store=2 ⇒ ① `SQ.Legacy.metaNormalize` 只留 4 世
     *       ② `SQ.Codex.pushBio` 连推 7 世后剩 2 世 ③ 阶梯**级⓪ 单独驱动**（`SQ.SavePre.compressStep(s,0,now)`）
     *       裁到 2 世 —— 三处**同时**跟着表动；任何一处仍是硬编码字面量，这条立刻红
     *   (d) 复位回 9/6 后三处口径回到原值（防测试自己把全局改坏）
     *   (e) 级⓪ 与级④ 分工未被混：级④ 仍是「→1 世」（极端触发线的最后一级，与本表无关） */
    var LEG282 = (SQ.XDATA && SQ.XDATA.LEGACY) || {};
    var keep0 = LEG282.BIO_KEEP, store0 = LEG282.BIO_STORE_CAP;
    var declOk282 = typeof keep0 === 'number' && typeof store0 === 'number' && keep0 > store0 && store0 === 6 && keep0 === 9;
    var capsOk282 = !!SQ.BioCaps && SQ.BioCaps.keep() === keep0 && SQ.BioCaps.store() === store0;
    var mkBios = function (n) { var a = []; for (var i = 0; i < n; i++) a.push({ life: i + 1, name: '世' + (i + 1), text: '传记正文' + (i + 1), stats: {}, source: 'local', ts: 1700000000000 + i }); return a; };
    var consumers = function () {
      var nz = SQ.Legacy.metaNormalize({ biographies: mkBios(9) });
      var m2 = { biographies: [] };
      for (var p = 0; p < 7; p++) SQ.Codex.pushBio(m2, { life: p + 1, name: 'n' + p, text: 't' + p, stats: {}, source: 'local', ts: 1700000000000 + p }, p + 1, '名' + p, 'local', 1700000000000 + p);
      var st2 = { profile: { name: 'x' }, worlds: {}, meta: { biographies: mkBios(9) } };
      var rung0 = SQ.SavePre.compressStep(st2, 0, 1700009999999);
      var rung4 = SQ.SavePre.compressStep(st2, 4, 1700009999999);
      return {
        norm: (nz.biographies || []).length,
        push: m2.biographies.length,
        rung0: (rung0.meta.biographies || []).length,
        rung4: (rung4.meta.biographies || []).length,
        memUntouched: (st2.meta.biographies || []).length
      };
    };
    var before282 = consumers();
    LEG282.BIO_KEEP = 4; LEG282.BIO_STORE_CAP = 2;
    var moved282 = consumers();
    LEG282.BIO_KEEP = keep0; LEG282.BIO_STORE_CAP = store0;
    var after282 = consumers();
    var movedFollowed282 = moved282.norm === 4 && moved282.push === 2 && moved282.rung0 === 2;
    var restored282 = after282.norm === before282.norm && after282.push === before282.push && after282.rung0 === before282.rung0;
    var defaultShape282 = before282.norm === 9 && before282.push === 6 && before282.rung0 === 6 && before282.rung4 === 1 && before282.memUntouched === 9;
    ok('282', '传记条数三口径经单一取数处（D.LEGACY.BIO_KEEP/BIO_STORE_CAP → SQ.BioCaps）：改表 keep=4/store=2 后 normalize ' + moved282.norm + ' / 写口 ' + moved282.push + ' / 阶梯级⓪ ' + moved282.rung0 + ' **同时**跟着走（任一处仍硬编码即红）；缺省 9/6 与级④→1 世分工不变；级⓪ 只裁落盘副本、内存 ' + before282.memUntouched + ' 世不动',
      declOk282 && capsOk282 && movedFollowed282 && restored282 && defaultShape282,
      '缺省=keep' + keep0 + '/store' + store0 + ' 观测(norm/push/rung0/rung4/内存)=' +
      before282.norm + '/' + before282.push + '/' + before282.rung0 + '/' + before282.rung4 + '/' + before282.memUntouched +
      ' → 改表后=' + moved282.norm + '/' + moved282.push + '/' + moved282.rung0 + ' → 复位后=' +
      after282.norm + '/' + after282.push + '/' + after282.rung0);
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* #283 存档度量出口（2026-10-09 存档水位批）：`SQ.SaveStats` 报的数必须与盘上真实体量同源
     * 立因（**同日按用户口径撤下玩家界面呈现**——「存档水位这些文字描述和用户没有直接关系，只是
     *   系统设计问题，不需要在设置中表述出来」⇒ 设置页四行与十个 `settings.save.level.*` 键当日删除，
     *   view/index.html 与 lexicon.js 回到撤除前状态）：本判据保留的理由是**引擎侧需要一个可断言的度量口**，
     *   否则「落盘字节 = 盘上真值」这类判据要各自 stringify 一遍 = 五处副本五处漂移。本条守四件事：
     *   (a) 读数不撒谎：`mainBytes` 与 localStorage 里那份落盘值的 UTF-8 字节数**逐字节相等**
     *       （同一条度量线 = 编码后字节，与 SQ.SAVE_RED/SQ.SAVE_TRIGGER 一致）
     *   (b) 解耦可测：同一次存档里日志族从 0 涨到 3000 条（≈ 侧档 +几百 KB 级体量），
     *       **主档读数几乎不动且 `stages` 仍为空** ⇒ 「增长全落在侧档」这件事从此可断言，不必靠人看曲线
     *   (c) 不进存档：主档对象顶层键仍是既有契约集，**没有** saveStats 之类的自我膨胀项
     *   (d) 跳写不归零：内容未变时 `writeLogsIfChanged` 走跳过分支，侧档读数必须沿用上一次的值
     *       （返回 0 会让任何读它的人误判「侧档空了」= 本条即反向预防）
     *   (e) 有损级是真会亮的：用文档化的测试钩子 `SQ.compressForSave(s, now, 1)` 强制跑满
     *       ⇒ `stages` 非空（正常档恒为空，不证就会恒真空过） */
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    var s283 = SQ.defaultState();
    s283.profile = mkProf(); s283.profile.name = '水位读数';
    s283.worlds.xiuxian = pack.initialState();
    var w283 = s283.worlds.xiuxian; w283.realm = 3;
    await SQ.save(s283);
    var st283a = SQ.SaveStats.get();
    var diskRaw283 = localStorage.getItem(SQ.KEY);
    var truthMain283 = SQ.storedBytes(diskRaw283);
    var honest283 = st283a.at > 0 && st283a.mainBytes === truthMain283 && st283a.stageCount === 0 && st283a.codec === 'preview';
    var diskObj283 = JSON.parse(diskRaw283);
    var topKeys283 = Object.keys(diskObj283).sort().join(',');
    var contractKeys283 = Object.keys(SQ.defaultState()).sort().join(',');
    /* 水位**只活在内存**：主档顶层键必须仍是既有契约集，不得多出 saveStats / stats 这类自造项 */
    var notInSave283 = topKeys283.indexOf('saveStats') < 0 && topKeys283.indexOf('stats') < 0 && topKeys283 === contractKeys283;
    var sideBefore283 = st283a.sideBytes;
    for (var g283 = 0; g283 < 3000; g283++) SQ.Log.push(w283, 'sys', 'L'.repeat(300) + '#' + g283, 1700000000000 + g283);
    await SQ.save(s283);
    var st283b = SQ.SaveStats.get();
    var decoupled283 = st283b.sideBytes > sideBefore283 + 10000 && st283b.stageCount === 0 &&
      Math.abs(st283b.mainBytes - st283a.mainBytes) < 4096 &&
      st283b.mainBytes === SQ.storedBytes(localStorage.getItem(SQ.KEY));
    var sideTruth283 = st283b.sideBytes === SQ.storedBytes(localStorage.getItem(SQ.Log.KEY));
    await SQ.save(s283);                          /* 内容未变 ⇒ 侧档走跳写分支，读数必须沿用 */
    var st283c = SQ.SaveStats.get();
    var skipKeeps283 = st283c.sideBytes === st283b.sideBytes && st283c.sideBytes > 0;
    var nowFixed283 = Date.now();
    var forced283 = await SQ.compressForSave(s283, nowFixed283, 1);
    /* ⚠️ 本批一度把 `stages` 改成「只记真降字节的级」，随即**回退**：`stages` 的现行语义 = 「阶梯执行到哪
     * 一级」，常驻探针 savecodec(B3) 与 savegrowth(§5a) 正是拿它当「阶梯跑满了没有」的证据，改语义会
     * 把两处证据打成假红（实测 B3 只剩 [0,1,4,6,7,9,10]、§5a 两侧同时变 `[]`）。审计 #10 那一点夸大留给
     * 「另加一个真降量字段」去解，不改既有读数的含义（登记 = 任务清单 N28 补记）。
     * 🔧 复核返修（同日当晚）：原判「级 0 在场 + 级号 ⊆ 0..10 + 不含 11」与「另跑一份 normalize({}) 看级 7
     *   在列」在 trigger=1 下**两条都恒真**（每一级都无条件 push ⇒ 零鉴别力，还白花一次全阶梯）。改成
     *   **钉死全序**：加一级、删一级、改级号都会红；这条同时是「级⑩ 已整族删除」的直证（删除前全序 = 0..11）。 */
    var LADDER283 = '0,1,2,3,4,5,6,7,8,9,10,11';
    var ladderVisible283 = forced283.stages.join(',') === LADDER283;
    ok('283', '存档水位读数与盘上同源且不进存档：主档 ' + st283a.mainBytes + 'B === 落盘值字节数（度量线同 §3.5 编码后口径）· 日志 3000 条入侧档后主档仅动 ' + (st283b.mainBytes - st283a.mainBytes) + 'B 且有损级 ' + st283b.stageCount + ' 级 · 侧档 ' + sideBefore283 + '→' + st283b.sideBytes + 'B 亦与盘上相等 · 跳写沿用读数不归零 · 极小触发线跑满时级序**钉死** ' + LADDER283.split(',').join('→') + '（口径 = 阶梯执行到哪一级；级⑩ 已删、级⑪ 列存补上该号 ⇒ 全序止于 11，加/删一级或改级号都红）',
      honest283 && notInSave283 && decoupled283 && sideTruth283 && skipKeeps283 && ladderVisible283,
      '顶层键=' + topKeys283 + ' 主档真值=' + truthMain283 + 'B 报=' + st283a.mainBytes + 'B · 涨日志后主档=' + st283b.mainBytes + 'B 侧档=' + st283b.sideBytes + 'B（真值=' + SQ.storedBytes(localStorage.getItem(SQ.Log.KEY)) + 'B）· 跳写后=' + st283c.sideBytes + 'B · codec=' + st283b.codec + ' · 跑满级=' + forced283.stages.join('/'));
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY); SQ.Side.resetSig();
    localStorage.removeItem(SQ.KEY); localStorage.removeItem(SQ.Log.KEY);

    /* ═══ 天象扩容 · 本局去重批（天道卷 v1.4 §7.3 / 道友池卷 v1.2 §六 / 引擎卷 v1.10 §3.6）═══ */

    /* #252 天象池对表 + 本局去重位掩码：
     * a) **对表**：`OMEN_TPL_N` 逐节点 == 词表 `tiandao.skyomen.<node>.<n>` 实有条数、Σ = **86**；
     *    `CHENYU_N` == `tiandao.omen.<n>` 实有条数（**30**）；且 1..N 每个模板号 `SQ.t` 都取得到
     *    正文（非回落键名、变量全替净）——配权表偏小 = 多写的模板永不可达（**死内容**，本批勘误
     *    正是 rebirth 实有 8 条而表写 5 → 3 条永不出现），偏大 = 玩家看见键名，两头都不许
     * b) 同节点连抽满池 → 模板号两两不重复、掩码逐次严格点亮、末抽全亮（2^N − 1）
     * c) 池耗尽再抽 → 掩码**静默重置**开启第二轮（不崩、不落 0、不返越界号）
     * d) 谶语同法（池 30 → 末抽 2^30 − 1 = 1073741823，安全整数内；再抽重置为 1）
     * e) normalize 脏档收敛：负数 / 小数 / 超界 / 非数 / 长度不符 → clamp + 补齐零崩溃；旧档无字段 → 全默认 */
    var C252 = D.TIANDAO, LEX252 = SQ.LEX.xiuxian;
    function cnt252(pre) {
      var re = new RegExp('^' + pre.split('.').join('\\.') + '[0-9]+$'), n252 = 0, k252;
      for (k252 in LEX252) if (re.test(k252)) n252++;
      return n252;
    }
    var V252 = { realm: '化神', n: 3, zone: '南域', tier: 'rare', a: '甲', b: '乙', rank: 7, dir: '反超前人' };
    var rows252 = [], sum252 = 0, txt252 = true;
    C252.OMEN_NODES.forEach(function (nd) {
      var want = C252.OMEN_TPL_N[nd] || 0, got = cnt252('tiandao.skyomen.' + nd + '.');
      sum252 += got;
      rows252.push(nd + ' ' + got + '/' + want + (got === want ? '' : '≠'));
      for (var q = 1; q <= Math.max(want, got); q++) {
        var ky = 'tiandao.skyomen.' + nd + '.' + q, tx = SQ.t(ky, V252, 'xiuxian');
        if (!tx || tx === ky || tx.indexOf('{') >= 0) txt252 = false;
      }
    });
    var chGot252 = cnt252('tiandao.omen.'), chWant252 = C252.CHENYU_N;
    for (var cq = 1; cq <= Math.max(chWant252, chGot252); cq++) {
      var cky = 'tiandao.omen.' + cq, ctx252 = SQ.t(cky, null, 'xiuxian');
      if (!ctx252 || ctx252 === cky) txt252 = false;
    }
    var par252 = rows252.every(function (r) { return r.indexOf('≠') < 0; }) && txt252 &&
      sum252 === 96 && chGot252 === chWant252 && chWant252 === 30;
    /* b/c 掩码抽取：rand 恒 0 → 每轮取最小未用号 → 1..N 严格递增的不重复序列（确定性、不靠运气）*/
    var zero252 = function () { return 0; };
    var nd252 = 'tribwin', n252 = C252.OMEN_TPL_N[nd252], idx252 = C252.OMEN_NODES.indexOf(nd252);
    var td252 = { omenSeen: [], chenSeen: 0 }, got252 = [], msk252 = [];
    for (var pk = 0; pk < n252; pk++) {
      got252.push(SQ.Tiandao.pickOmenTpl(td252, C252, nd252, zero252));
      msk252.push(td252.omenSeen[idx252]);
    }
    var seq252 = got252.every(function (t, i) { return t === i + 1; });
    var uniq252 = (function () { var sn = {}; for (var i = 0; i < got252.length; i++) { if (sn[got252[i]]) return false; sn[got252[i]] = 1; } return true; })();
    var mono252 = msk252.every(function (m, i) { return i === 0 || m > msk252[i - 1]; });
    var full252 = msk252[msk252.length - 1] === Math.pow(2, n252) - 1;
    var r2252 = SQ.Tiandao.pickOmenTpl(td252, C252, nd252, zero252);
    var round252 = r2252 === 1 && td252.omenSeen[idx252] === 1;
    /* d 谶语掩码 */
    var td252c = { chenSeen: 0 }, set252c = {}, last252c = 0;
    for (var pc = 0; pc < chWant252; pc++) { last252c = SQ.Tiandao.pickChenYu(td252c, C252, zero252); set252c[last252c] = 1; }
    var chen252 = Object.keys(set252c).length === chWant252 && last252c === chWant252 &&
      td252c.chenSeen === Math.pow(2, chWant252) - 1 && Number.isSafeInteger(td252c.chenSeen);
    chen252 = chen252 && SQ.Tiandao.pickChenYu(td252c, C252, zero252) === 1 && td252c.chenSeen === 1;
    /* e normalize 收敛（超界项 clamp 到 2^N − 1、非数归 0、长度按 OMEN_NODES 补齐〔现 8〕、旧档全默认）*/
    var brk252 = C252.OMEN_NODES.indexOf('break'), lim252 = Math.pow(2, C252.OMEN_TPL_N.break) - 1;
    var nz252 = SQ.Tiandao.normalize({ omenSeen: [-5, 1.7, 99999999, 'x'], chenSeen: -3 }, D);
    var nz252b = SQ.Tiandao.normalize({}, D);
    var norm252 = nz252.omenSeen.length === C252.OMEN_NODES.length &&
      nz252.omenSeen.every(function (m, i) {
        return Number.isInteger(m) && m >= 0 && m < Math.pow(2, C252.OMEN_TPL_N[C252.OMEN_NODES[i]]);
      }) &&
      nz252.omenSeen[brk252] === lim252 && nz252.omenSeen[0] === 0 && nz252.omenSeen[1] === 1 &&
      nz252.chenSeen === 0 && nz252b.omenSeen.join() === C252.OMEN_NODES.map(function () { return 0; }).join() &&
      nz252b.chenSeen === 0;
    ok('252', '天象池对表 + 本局去重：`OMEN_TPL_N` 逐节点与词表实有条数**全等**、Σ = 96（八节点，N4 收口批 +prodrank 10 条），`CHENYU_N` = 30 对表；1..N 每个模板号都取得到正文（非键名回落、`{realm}/{n}/{zone}/{tier}/{a}/{b}/{rank}/{dir}` 全替净）→ 零死内容零空 key；同节点连抽满池得 **1..N 不重复**序列、掩码逐次严格点亮至 `2^N − 1`；耗尽后再抽**静默重置**开启第二轮（返 1、掩码归单点）；谶语同法（末抽 `2^30 − 1` 在安全整数内、再抽重置）；normalize 对负数/小数/超界/非数/长度不符逐项 clamp 补齐、旧档无字段全默认',
      par252 && seq252 && uniq252 && mono252 && full252 && round252 && chen252 && norm252,
      '配权对表 ' + rows252.join(' ') + ' Σ=' + sum252 + '/96 谶语=' + chGot252 + '/' + chWant252 +
      ' 正文可取=' + txt252 + ' ‖ 满池序列=' + seq252 + ' 不重复=' + uniq252 + ' 掩码递增=' + mono252 +
      ' 末抽全亮=' + full252 + '(' + msk252[msk252.length - 1] + ') 第二轮=' + round252 +
      ' 谶语掩码=' + chen252 + ' 脏档收敛=' + norm252 + '(break→' + nz252.omenSeen[brk252] + '/' + lim252 + ')');

    /* #253 同道相吸（阵营 × 善恶名号联动 · 道友池卷 v1.2 §六）：名号跨段瞬间，与新名号**同向**且
     * **已相识**（bond > 0）的道友一次性 +`BOND_ALIGN_GIFT_BASE`×dist（封顶 `..._CAP`），走 `Bonds.gain`
     * 唯一正向写口 → 好感只增不减、结缘仍由事件门控（不白送档位）。
     * a) 极道魔尊（dist 4）→ evil 且已相识者每人 +8（2×4 恰触 cap）；异向 / 未相识 / 绝交锁零波及
     * b) 中性段（左道散人 dist 0）→ 零发放 reason 'neutral'，且**不占** rankGiftSeen 名额
     * c) 每名号每世限一次：同段重发 → 'dup'、好感与 karma 零变动（防震荡刷好感）
     * d) 真链路：`recalcDerived` 里 karma 跨段（浩然道尊 dist 4）→ 自动发放 + 独立 'bond' 日志一条
     *    （含名号 / 方向 / 人数 / 幅度，视图层据此演出） */
    var cs253 = SQ.Bonds.list(pack);
    var ev253 = cs253.filter(function (c) { return c.align === 'evil'; }).map(function (c) { return c.id; });
    var rt253 = cs253.filter(function (c) { return c.align === 'right'; }).map(function (c) { return c.id; });
    var per253 = Math.min(D.BOND_ALIGN_GIFT_CAP, D.BOND_ALIGN_GIFT_BASE * 4);
    var w253 = mkWs({});
    w253.bonds[ev253[0]] = 10; w253.bonds[ev253[1]] = 20; w253.bonds[ev253[2]] = 95;
    w253.bonds[ev253[3]] = 0;                                  /* 同向但未相识 */
    SQ.Bonds.lock(w253, ev253[4]);                              /* 同向但绝交锁 −99 */
    var ag253 = SQ.Bonds.alignGift(w253, pack, D, 'jidao', 1);
    var a253 = ag253.ok === true && ag253.dir === 'evil' && ag253.dist === 4 && ag253.per === per253 &&
      ag253.hit === 3 &&
      w253.bonds[ev253[0]] === 10 + per253 && w253.bonds[ev253[1]] === 20 + per253 &&
      w253.bonds[ev253[2]] === (D.BOND_MAX || 100) &&           /* 95 + 8 → clamp 满档 */
      w253.bonds[ev253[3]] === 0 && w253.bonds[ev253[4]] === SQ.Bonds.LOCK &&
      rt253.every(function (id) { return !(w253.bonds[id] > 0); });
    /* b 中性段零发放且不占名额（后续真跨段仍可发）*/
    var w253b = mkWs({}); w253b.bonds[ev253[0]] = 10; w253b.bonds[rt253[0]] = 10;
    var ag253b = SQ.Bonds.alignGift(w253b, pack, D, 'zuodao', 2);
    var b253 = ag253b.ok === false && ag253b.reason === 'neutral' &&
      (w253b.rankGiftSeen || []).length === 0 &&
      w253b.bonds[ev253[0]] === 10 && w253b.bonds[rt253[0]] === 10;
    /* c 同名号每世一次 */
    var pre253 = w253.bonds[ev253[0]];
    var ag253c = SQ.Bonds.alignGift(w253, pack, D, 'jidao', 3);
    var c253 = ag253c.ok === false && ag253c.reason === 'dup' && w253.bonds[ev253[0]] === pre253 &&
      w253.rankGiftSeen.length === 1 && w253.rankGiftSeen[0] === 'jidao';
    /* d 真链路（karmaEventScore 900 → 浩然道尊 dist 4 → 正道已相识者各 +8 + bond 日志一条）*/
    var w253d = mkWs({ karmaEventScore: 900 });
    w253d.bonds[rt253[0]] = 5; w253d.bonds[rt253[1]] = 5;
    M(mkProf([]), w253d);
    var bl253 = w253d.log.filter(function (L) { return L.cat === 'bond'; });
    var d253 = SQ.XKarma.rankOf(w253d.karma, D) === 'haoran' &&
      w253d.bonds[rt253[0]] === 5 + per253 && w253d.bonds[rt253[1]] === 5 + per253 &&
      (w253d.rankGiftSeen || []).indexOf('haoran') >= 0 &&
      bl253.length === 1 && bl253[0].text.indexOf(SQ.t('align.right', null, 'xiuxian')) >= 0 &&
      bl253[0].text.indexOf(String(per253)) >= 0 && bl253[0].text.indexOf('2') >= 0;

    /* ═══ #321 里程碑档位与转世天赋分母单源（第册二批 · 收第二事实源）═══
     * 立因：MS_PCT 表在册，但 codex.js 的 talentLegacy 那一支与 view/achv.js 的成就页各写了一份字面量
     * （[0.5,0.8,1.0] / [50,80,100] / 分母 8 / 三点）⇒ 改表只动九面那支，成就页与转世子区继续说旧话，
     * 而历批判据恰好也读表，整条链零红。判据一律走**差分**：改表 ⇒ 发的档跟着改；摘池 ⇒ 分母跟着改。 */
    var p321 = SQ.Worlds.xiuxian.pack, d321 = SQ.XDATA, CX321 = d321.CODEX;
    var a321 = JSON.stringify(SQ.Codex.msMarks(d321)) ===
      JSON.stringify(CX321.MS_PCT.map(function (x) { return Math.round(x * 100); }));
    /* 分母由「独占转世天赋池」表自己数出来（`D.LEGACY.TALENTS`），不是抄注释里的「8 格」；
     * 顺带钉住两个数不是一回事：本表 8 枚 ≠ 天赋池 epic 档 10 枚（`data.js:929` 那句「epic 档 8 条」是混写）*/
    var lt321 = d321.LEGACY.TALENTS;
    var epic321 = 0;
    ['common', 'xiuxian'].forEach(function (w) {
      var t = (SQ.TALENTS || {})[w] || {};
      ['positive', 'negative'].forEach(function (k) {
        (t[k] || []).forEach(function (x) { if (x && x.tier === 'epic') epic321++; });
      });
    });
    var b321 = SQ.Codex.legacyCap(d321) === lt321.length && lt321.length > 0 && epic321 !== lt321.length;
    var facDen321 = SQ.Codex.faceDenom('faction', p321, d321);
    function msRun321(pcts, picked) {
      var mm = SQ.Legacy.metaBlank();
      SQ.Codex.mergeFace(mm, 'faction', picked);
      var keep = CX321.MS_PCT;
      if (pcts) CX321.MS_PCT = pcts;
      try { SQ.Codex.checkMilestones(mm, p321, d321, Date.now()); } finally { CX321.MS_PCT = keep; }
      return mm.earnedKeys || {};
    }
    var q4 = [], q8 = [];
    for (var i4 = 0; i4 < 8; i4++) q4.push('f' + i4);
    for (var i5 = 0; i5 < facDen321 / 2; i5++) q8.push('f' + i5);
    /* (c) 表改成 [0.25] ⇒ 4/16 这一档真发出来（证 checkMilestones 真读传入的表）*/
    var e321 = msRun321([0.25], q4.slice(0, facDen321 / 4))['codex.ms.faction.25'] != null;
    /* (d) 表复原 ⇒ 同一份收集率一枚都不发（反向：不是「键名恰好留着」）*/
    var f321 = (function () { var ek = msRun321(null, q4.slice(0, facDen321 / 4)); return !ek['codex.ms.faction.25'] && !ek['codex.ms.faction.50']; })();
    /* (e) 表复原 + 收集率过半 ⇒ 只发 50 档 */
    var g321 = (function () { var ek = msRun321(null, q8); return ek['codex.ms.faction.50'] != null && !ek['codex.ms.faction.80']; })();
    /* (f) 摘掉转世天赋表里一枚 ⇒ 分母当场少 1（证 legacyCap 读的是表，不是常量），复原必须数回原值 */
    var h321 = (function () {
      var cut = lt321.splice(0, 1)[0];
      var n = SQ.Codex.legacyCap(d321);
      lt321.unshift(cut);
      return n === lt321.length - 1 && SQ.Codex.legacyCap(d321) === lt321.length;
    })();
    ok('321', '里程碑档位与转世天赋分母单源（第册二批）：(a) msMarks === 表×100 (b) legacyCap === 转世天赋表条数（且 ≠ epic 档条数）' +
      '(c) 改表 ⇒ 发的档跟着改 (d) 复原 ⇒ 同收集率一枚不发 (e) 收集率过半只发 50 档 ' +
      '(f) 摘表内一枚 ⇒ 分母当场少 1 且复原数回原值（视图那侧的屏上同动由走查 verify-ui-achv 接）',
      a321 && b321 && e321 && f321 && g321 && h321,
      '表=' + JSON.stringify(CX321.MS_PCT) + ' 档=' + JSON.stringify(SQ.Codex.msMarks(d321)) +
      ' 转世表=' + lt321.length + ' epic档=' + epic321 + ' 势力分母=' + facDen321 +
      ' ‖ a=' + a321 + ' b=' + b321 + ' 改表发25=' + e321 + ' 复原不发=' + f321 + ' 过半只50=' + g321 + ' 摘表=' + h321);
});
