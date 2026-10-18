/* systems/legacy.js — 轮回转世（meta 层 · 世界无关；轮回卷 v1.0 唯一事实源）
 * meta 层唯一通货 = 遗泽（meta.karma，⚠️ 与 ws.karma 善恶值同名异义零关联）；
 * 恒等式（#197）：meta.karma === ΣearnedKeys − Σspent——earnedKeys 存**实际入账额**，
 * 差额补分项的标称进度走 meta.stats（realmMax/officeMax/rankMax 历史最高档索引）。
 * 纪律：遗泽不进 Ledger（#113 零改动）；转世/购买全部是显式事务、不进 tick；
 * meta.karma/earnedKeys/karmaLog/spent/unlocks/stats = 本模块唯一写口（图鉴成就经 earn 事务调用）；
 * codices/achv/titles/biographies = systems/codex.js 唯一写口（schema 归轮回卷 §8.1）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var num = SQ.util.num, obj = SQ.util.obj, arr = SQ.util.arr;   /* C1：统一至 assets/util.js */

  /* 承继选择哨兵（轮回卷 §3.4「可选一件」的**显式否定**态）：meta.heirChoice 三态——
   * null = 未择定（走既有「取 owned 里第一件已觉醒者」自动口径）／
   * 法宝 id = 择定该件（仍觉醒才生效）／ 'none' = 玩家明说「本世不带器灵转世」。
   * 取拉丁哨兵词 = A1 源码零裸写纪律 + 与法宝 id 空间零碰撞（修仙包 46 件 id 恒 3 字符）。 */
  var HEIR_NONE = 'none';

  /* 转世通道名键（词表 legacy.ui.*）——寿元批加「寿尽坐化 / 道伤崩碎」两档。
   * 键名字面量写在表里 = A6 反向扫描认它已消费（动态 `t('legacy.ui.' + ch)` 不留字面量 ⇒ 判孤儿）。 */
  var CH_NAME = {
    feisheng: 'legacy.ui.feisheng', bingjie: 'legacy.ui.bingjie',
    shoujin: 'legacy.ui.shoujin', daoshang: 'legacy.ui.daoshang', zhesou: 'legacy.ui.zhesou'
  };
  /* 被动了结两通道（寿元耗尽 / 道伤崩碎）：**不是玩家主动兵解** ⇒ 不发「舍身证道」成就、
   * 不进 stats.dissolutions，单记 stats.deaths（原式把非飞升一律折成 bingjie 会说谎，寿元批收口）。
   * 第卌八批加第三条 zhesou（折寿而殒）：同死了结、同进 deaths，唯独不并进 shoujin——
   * 「熬到大限」和「被人打折了命数」是两件事，传记与日志要分得开。 */
  var CH_DEATH = { shoujin: 1, daoshang: 1, zhesou: 1 };

  /* ── meta 层 schema（§8.1 唯一事实源）────────────────── */
  function metaBlank() {
    return {
      unlockedWorlds: [SQ.WORLD_DEFAULT],
      karma: 0, earnedKeys: {}, karmaLog: [], spent: {},
      codices: {}, achv: [], titles: [], biographies: [],
      unlocks: { alchemy: false, sect: false, prodigySlot: false, nemesis: false, bond: false },
      eternalProdigy: null, heirTreasure: null, heirSpirit: null, heirChoice: null, pendingRebirth: null,
      lastBonds: [],
      stats: {
        lives: 0, ascensions: 0, dissolutions: 0, deaths: 0,
        realmMax: 0, tribWin: 0, tribFail: 0, tribAttempts: 0, zonesFirst: 0,
        officeMax: 0, rankMax: 0, rankScored: 0, bestLifeText: '',
        omensSeen: 0, defyTotal: 0, acceptTotal: 0, defyMax: 0, immThisLife: 0
      }
    };
  }

  /* 读档上界取表（第十四批审计 #20）：`D.LEGACY.LOG_KEEP` / `BIO_MAX` 此前是**声明了却没人读**的嵌套常量，
   * 真值住在下面两处字面量 ⇒ 抬表不带动任何行为（A9 只枚举世界表**顶层**键，这类嵌套死常量一条都不在账上，
   * 由本批 🆕 A10 兜住）。metaNormalize(m) 没有 D 形参 ⇒ 按 karma.js 同一条口径读全局 SQ.XDATA。
   * shortcut: 取不到世界表才回落旧字面量（只为无世界包的单测路径），下一版若 A10 覆盖到测试面即可删。 */
  function legacyCap(k, dflt) {
    var L = (SQ.XDATA || {}).LEGACY || {};
    return L[k] != null ? L[k] : dflt;
  }

  function metaNormalize(m) {
    var d = metaBlank();
    if (!m || typeof m !== 'object') return d;
    var out = d;
    out.unlockedWorlds = Array.isArray(m.unlockedWorlds) && m.unlockedWorlds.length ? m.unlockedWorlds : [SQ.WORLD_DEFAULT];
    out.earnedKeys = obj(m.earnedKeys, {});
    for (var ek in out.earnedKeys) {
      var ev = out.earnedKeys[ek];
      if (!(typeof ev === 'number' && isFinite(ev) && ev >= 0)) delete out.earnedKeys[ek];
    }
    out.spent = obj(m.spent, {});
    for (var sk in out.spent) if (typeof out.spent[sk] !== 'number') delete out.spent[sk];
    /* 恒等式自检修复（§8.2）：karma ≠ Σearned − Σspent 时以账本重算为准 */
    var sumE = 0, sumS = 0, kk;
    for (kk in out.earnedKeys) sumE += out.earnedKeys[kk];
    for (kk in out.spent) sumS += out.spent[kk];
    var kc = Math.max(0, Math.floor(num(m.karma, 0)));
    out.karma = (kc === sumE - sumS) ? kc : (sumE - sumS);
    var logRaw = arr(m.karmaLog, []);
    out.karmaLog = [];
    logRaw.slice(-legacyCap('LOG_KEEP', 20)).forEach(function (l) {
      if (!l || typeof l !== 'object') return;
      out.karmaLog.push({ ts: Math.max(0, num(l.ts, 0)), delta: Math.floor(num(l.delta, 0)),
        reason: typeof l.reason === 'string' ? l.reason.slice(0, 40) : 'fix', balance: Math.max(0, Math.floor(num(l.balance, 0))) });
    });
    out.codices = obj(m.codices, {});
    for (var cf in out.codices) {
      if (!Array.isArray(out.codices[cf])) delete out.codices[cf];
      else out.codices[cf] = out.codices[cf].filter(function (x) { return typeof x === 'string' && x; }).slice(0, 400);
    }
    out.achv = arr(m.achv, []).filter(function (x) { return typeof x === 'string'; }).slice(0, 120);
    out.titles = arr(m.titles, []).filter(function (x) { return typeof x === 'string'; }).slice(-80);
    out.biographies = [];
    arr(m.biographies, []).slice(-(SQ.BioCaps ? SQ.BioCaps.keep() : 9)).forEach(function (b) {   /* 读档容错上界 = D.LEGACY.BIO_KEEP（旧档可留 9 世；落盘上界另有 BIO_STORE_CAP） */
      if (!b || typeof b !== 'object' || typeof b.text !== 'string') return;
      out.biographies.push({
        life: Math.max(0, Math.floor(num(b.life, 0))),
        name: typeof b.name === 'string' ? b.name.slice(0, 16) : '',
        text: b.text.slice(0, legacyCap('BIO_MAX', 500)),
        stats: obj(b.stats, {}), source: b.source === 'tiandao' ? 'tiandao' : 'local',
        ts: Math.max(0, num(b.ts, 0))
      });
    });
    var un = obj(m.unlocks, {});
    for (var uk in out.unlocks) out.unlocks[uk] = un[uk] === true;
    out.eternalProdigy = obj(m.eternalProdigy, null);
    out.heirTreasure = (typeof m.heirTreasure === 'string' && m.heirTreasure) ? m.heirTreasure : null;
    /* 承继择定（一世意图，非跨世资产）：meta 层世界无关 ⇒ 只校验类型 + 截长（与 heirTreasure 同口径），
     * 「该 id 是否仍是觉醒件」在 finishRebirth 取 ws 时判，脏值一律降级为 null（= 未择定 = 原自动口径） */
    out.heirChoice = (typeof m.heirChoice === 'string' && m.heirChoice) ? m.heirChoice.slice(0, 16) : null;
    /* 承继器灵快照（器灵卷 §九 数据契约）：meta 层世界无关 ⇒ 只校验结构（a/p/w），
     * 人格是否属该世界五档由 Fusion.heirRestore 取包数据判、非法即退回未觉醒重攒 */
    var hs = obj(m.heirSpirit, null);
    out.heirSpirit = (hs && (hs.a === 1 || hs.a === true) && typeof hs.p === 'string' && hs.p)
      ? { a: 1, p: hs.p.slice(0, 16), w: Math.max(0, Math.floor(num(hs.w, 0))), heir: 1, ru: 0 } : null;
    out.pendingRebirth = obj(m.pendingRebirth, null);
    out.lastBonds = arr(m.lastBonds, []).filter(function (x) { return typeof x === 'string'; }).slice(0, 60);
    var st = obj(m.stats, {});
    for (var stk in out.stats) {
      if (typeof out.stats[stk] === 'number') out.stats[stk] = Math.max(0, Math.floor(num(st[stk], 0)));
      else if (typeof st[stk] === 'string') out.stats[stk] = st[stk].slice(0, 32);
    }
    return out;
  }

  /* ── 遗泽账本（唯一写口）────────────────────────────── */
  function logPush(meta, delta, reason, ts) {
    meta.karmaLog.push({ ts: ts || Date.now(), delta: delta, reason: reason, balance: meta.karma });
    while (meta.karmaLog.length > 20) meta.karmaLog.shift();
  }

  /* 一次性得分（幂等键判重；pts 为实际入账额——通道系数已在调用侧折算并向下取整） */
  function earnOnce(meta, key, pts, reason, ts) {
    pts = Math.max(0, Math.floor(num(pts, 0)));
    if (meta.earnedKeys[key] != null || pts <= 0) return 0;
    meta.earnedKeys[key] = pts;
    meta.karma += pts;
    logPush(meta, pts, reason, ts);
    return pts;
  }
  /* 差额补分（标称进度 nominalHave→nominalTarget，实付 = floor(差额 × mult)；
   * earnedKeys 存实际入账累计，标称进度由 stats 侧索引承载——恒等式 #197 不破） */
  function earnDelta(meta, key, nominalDelta, mult, reason, ts) {
    nominalDelta = Math.max(0, Math.floor(num(nominalDelta, 0)));
    if (nominalDelta <= 0) return 0;
    var actual = Math.floor(nominalDelta * (mult != null ? mult : 1));
    if (actual <= 0) return 0;
    meta.earnedKeys[key] = (meta.earnedKeys[key] || 0) + actual;
    meta.karma += actual;
    logPush(meta, actual, reason, ts);
    return actual;
  }
  /* 即时入账项（成就/里程碑——不受转世通道系数影响，轮回卷 §2.2） */
  function earnImmediate(meta, key, pts, reason, ts) {
    var got = earnOnce(meta, key, pts, reason, ts);
    if (got > 0) meta.stats.immThisLife = (meta.stats.immThisLife || 0) + got;
    return got;
  }

  function spend(meta, itemId, price, ts) {
    if (meta.spent[itemId] != null) return { ok: false, reason: 'dup' };
    price = Math.max(0, Math.floor(num(price, 0)));
    if (meta.karma < price) return { ok: false, reason: 'poor' };
    meta.karma -= price;
    /* spent 幂等键值 = 实际价格（恒等式 #197 的 Σspent 语义 = 支出总额；
     * 全部消费点只做 != null 存在性判断，购买时刻不落档——六向批 A7 联调修正） */
    meta.spent[itemId] = price;
    void ts;
    logPush(meta, -price, 'buy', ts);
    return { ok: true };
  }

  /* ── 遗泽商店（§三 · 价目总表 6800：洗髓批 +SWAP_PRICE 200）────────── */
  function shopItems(D) {
    var L = D.LEGACY;
    var items = [];
    (L.START_REALM_PRICES || []).forEach(function (p, i) {
      items.push({ id: 'startRealm' + (i + 1), key: 'shop.startRealm' + (i + 1), price: p, kind: 'startRealm', realm: i + 1,
        nameKey: 'legacy.shop.startRealm' + (i + 1) });
    });
    (L.TALENTS || []).forEach(function (t) {
      items.push({ id: 'talent.' + t.id, key: 'shop.talent.' + t.id, price: t.price, kind: 'talent', talent: t,
        nameKey: 'legacy.talent.' + t.id + '.name' });
    });
    items.push({ id: 'heir', key: 'shop.heir', price: L.HEIR_PRICE, kind: 'heir', nameKey: 'legacy.shop.heir' });
    /* 洗髓缘（洗髓批 · 轮回卷 v1.17 §3.4）：买断一次即赐一枚，与丹/奇遇/破境共用本世 PER_LIFE 预算 */
    items.push({ id: 'swap', key: 'shop.swap', price: L.SWAP_PRICE, kind: 'swap', nameKey: 'legacy.shop.swap' });
    for (var uk in L.UNLOCK_PRICES) {
      items.push({ id: 'unlock.' + uk, key: 'shop.unlock.' + uk, price: L.UNLOCK_PRICES[uk], kind: 'unlock', unlock: uk,
        nameKey: 'legacy.shop.unlock.' + uk });
    }
    (L.QIRATE_PRICES || []).forEach(function (p, i) {
      items.push({ id: 'qirate.' + (i + 1), key: 'shop.qirate.' + (i + 1), price: p, kind: 'qirate', stage: i + 1,
        nameKey: 'legacy.shop.qirate' + (i + 1) });
    });
    return items;
  }
  function itemById(D, id) {
    var list = shopItems(D);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function ownedTalents(meta, D) {
    var out = [];
    ((D.LEGACY || {}).TALENTS || []).forEach(function (t) {
      if (meta.spent['shop.talent.' + t.id] != null) out.push(t);
    });
    return out;
  }
  /* 永久微增益（§3.6）：已购档数 × 2%，cap +10%（来源 'legacy' 静态行） */
  function qiRateOf(meta, D) {
    var L = D.LEGACY || {};
    var n = 0;
    for (var i = 1; i <= (L.QIRATE_STAGES || 5); i++) if (meta.spent['shop.qirate.' + i] != null) n++;
    return Math.min(n * (L.QIRATE_STEP || 0.02), L.LEGACY_QIRATE_CAP || 0.10);
  }

  function buy(s, itemId, now) {
    var D = SQ.Worlds[s.profile.worldId].pack.data;
    var item = itemById(D, itemId);
    if (!item) return { ok: false, reason: 'unknown' };
    var meta = s.meta;
    if (meta.spent[item.key] != null) return { ok: false, reason: 'dup' };   /* spent 幂等键：断线重发不二次扣款 */
    /* 洗髓商品先判预算再扣泽：本世三次已尽时买它拿不到东西，扣完再退就是白花 200 遗泽 */
    if (item.kind === 'swap') {
      var wsSwap = (s.worlds || {})[s.profile.worldId];
      if (!wsSwap || !SQ.Talents.swapRoom(wsSwap, D)) return { ok: false, reason: 'swapfull' };
    }
    var r = spend(meta, item.key, item.price, now);
    if (!r.ok) return r;
    if (item.kind === 'unlock') meta.unlocks[item.unlock] = true;
    if (item.kind === 'swap') SQ.Talents.grantSwap(s.worlds[s.profile.worldId], D);
    return { ok: true, item: item };
  }

  /* ── 转世结算计分（§2.3 全量正典 · preview 与 apply 同源）──────
   * 通道系数只作用于结算折分项（即时入账项不折损不追回，§2.2 裁定）；
   * 逐行 floor 折算——earnedKeys 存实际入账额，恒等式 #197 恒成立（口径注记入收口记录）。 */
  function rankNow(ws, pack, D) {
    if (!ws.factionId || !SQ.Factions || !SQ.Factions.rankOf) return 0;
    return SQ.Factions.rankOf(ws, D);
  }
  /* 同代榜位 → 榜位档索引（轮回卷 §2.3：0 未入榜 / 1 入榜 / 2 前十 / 3 前三 / 4 第一）；
   * 供数 = 榜面冻结快照 ws.prodMarks.myRank（prodigy.js 唯一写口，金丹前不写 → 恒 0） */
  function prodTier(ws, D) {
    var mr = (ws.prodMarks || {}).myRank || 0;
    if (!(mr > 0)) return 0;
    if (mr === 1) return 4;
    if (mr <= 3) return 3;
    if (mr <= ((D.PRODIGY || {}).BOARD_SHOW || 10)) return 2;
    return 1;
  }

  function preview(ws, meta, pack, D, channel, now) {
    var L = D.LEGACY;
    var mult = channel === 'feisheng' ? 1 : L.BINGJIE_MULT;
    var lines = [];
    function once(key, pts) {
      var have = meta.earnedKeys[key] != null;
      lines.push({ key: key, nominal: pts, got: have ? 0 : Math.floor(pts * mult), owned: have });
    }
    function delta(key, nominalDelta) {
      lines.push({ key: key, nominal: nominalDelta, got: Math.floor(nominalDelta * mult), owned: nominalDelta <= 0 });
    }
    /* 最高境界档（差额补分：标称进度 = REALM_SCORE[stats.realmMax]） */
    var realmNom = (L.REALM_SCORE || [])[Math.min(ws.realm || 0, 9)] || 0;
    var realmHave = (L.REALM_SCORE || [])[Math.min(meta.stats.realmMax || 0, 9)] || 0;
    delta('realmMax', realmNom - realmHave);
    /* 飞升 +200（跨世一次性） */
    if (channel === 'feisheng') once('ascend', L.ASCEND_BONUS);
    /* 渡劫成功次数（含飞升大劫与逆天大劫成功；键 = 世序号，一次性入账天然不重复） */
    var life = (meta.stats.lives || 0) + 1;
    var td = ws.tiandao || {};
    var wins = (ws.tribulation ? ws.tribulation.success || 0 : 0) +
      (channel === 'feisheng' ? 1 : 0) + (td.nijieWins || 0);
    once('trib.' + life, wins * L.TRIB_WIN_EACH);
    /* 秘境首通 / 域主（跨世首次，与图鉴同键同源） */
    (ws.cleared || []).forEach(function (z) { once('zone.' + z, L.ZONE_FIRST); });
    (ws.bossKills || []).forEach(function (z) { once('boss.' + z, L.ZONE_BOSS); });
    /* 法宝收集（跨世首次 = 图鉴法宝面账本） */
    var trList = ((meta.codices || {}).treasure) || [];
    trList.forEach(function (id) { once('treasure.' + id, L.TREASURE_EACH); });
    /* 功法满级（跨世首次 = 图鉴金标键；封顶 ART_MAX_CAP） */
    var artCapKeys = 0;
    for (var ak in meta.earnedKeys) if (ak.indexOf('artmax.') === 0) artCapKeys++;
    var artMaxList = ((meta.codices || {}).artMax) || [];
    artMaxList.forEach(function (id) {
      if (artCapKeys * L.ART_MAX_EACH >= L.ART_MAX_CAP) return;
      if (meta.earnedKeys['artmax.' + id] == null) artCapKeys++;
      once('artmax.' + id, L.ART_MAX_EACH);
    });
    /* 势力职位档（差额补分：标称进度 = OFFICE_SCORE[stats.officeMax]） */
    var rankCur = Math.min(rankNow(ws, pack, D) + 1, (L.OFFICE_SCORE || []).length - 1);
    var offNom = (L.OFFICE_SCORE || [])[rankCur] || 0;
    var offHave = (L.OFFICE_SCORE || [])[Math.min(meta.stats.officeMax || 0, (L.OFFICE_SCORE || []).length - 1)] || 0;
    delta('officeMax', offNom - offHave);
    /* 同代榜最高排名（差额补分：标称进度 = RANK_SCORE[榜位档历史最高]，已付档 = stats.rankScored） */
    var rankTier = Math.max(meta.stats.rankMax || 0, prodTier(ws, D));
    var rankNom = (L.RANK_SCORE || [])[Math.min(rankTier, (L.RANK_SCORE || []).length - 1)] || 0;
    var rankDone = (L.RANK_SCORE || [])[Math.min(meta.stats.rankScored || 0, (L.RANK_SCORE || []).length - 1)] || 0;
    delta('rankMax', rankNom - rankDone);
    /* 称号（每枚 +2，封顶 TITLE_CAP；与称号墙同键） */
    var titleKeys = 0;
    for (var tk in meta.earnedKeys) if (tk.indexOf('title.') === 0) titleKeys++;
    (meta.titles || []).forEach(function (id) {
      if (titleKeys * L.TITLE_EACH >= L.TITLE_CAP) return;
      if (meta.earnedKeys['title.' + id] == null) titleKeys++;
      once('title.' + id, L.TITLE_EACH);
    });
    var subtotal = 0, total = 0;
    lines.forEach(function (ln) { subtotal += ln.nominal; total += ln.got; });
    /* §5.2 结算浮层「本世总结区」四项（境界/渡劫成败/首通区数/结缘人数）：与折分明细同源，
     * 由 preview 一次算全 ⇒ 视图**只渲染 preview 产物**、不自行取 ws 拼数（预览与实结同一张脸）。
     * 口径注：tribWin/tribFail = 本世常规渡劫 success/(attempts−success)（不含飞升大劫与逆天大劫，
     * 那两项另计入折分明细 trib.{世} 行）；zones = ws.cleared 数（与 zone.* 明细行同集合）；
     * bonds = ws.bonds 里好感 ≥1 的道友数（与 §5.1④ lastBonds 名录同判据）。 */
    var tb = ws.tribulation || {};
    var bondN = 0, bk;
    for (bk in (ws.bonds || {})) if ((ws.bonds[bk] || 0) >= 1) bondN++;
    var summary = {
      realm: Math.min(ws.realm || 0, (D.REALMS || []).length - 1),
      tribWin: Math.max(0, num(tb.success, 0)),
      tribFail: Math.max(0, num(tb.attempts, 0) - num(tb.success, 0)),
      zones: arr(ws.cleared, []).length,
      bonds: bondN
    };
    return { lines: lines, subtotal: subtotal, mult: mult, total: total, summary: summary,
      immediate: meta.stats.immThisLife || 0, balanceAfter: meta.karma + total, life: life };
  }

  function applyPreview(meta, pv, now) {
    pv.lines.forEach(function (ln) {
      if (ln.got <= 0) return;
      if (ln.key === 'realmMax' || ln.key === 'officeMax' || ln.key === 'rankMax') {
        /* 差额补分行：实付入 earnedKeys[key]（恒等式左半），标称进度由 stats 档索引承载 */
        meta.earnedKeys[ln.key] = (meta.earnedKeys[ln.key] || 0) + ln.got;
        meta.karma += ln.got;
        logPush(meta, ln.got, 'settle', now);
      } else {
        earnOnce(meta, ln.key, ln.got, 'settle', now);
      }
    });
  }

  /* ── 飞升大劫 / 兵解（§一 双通道）────────────────────── */
  function capOf(ws, pack, D, profile) {
    var mods = SQ.Mods.collect(profile || { talents: [] }, ws, pack, D);
    return SQ.Idle.capOf(ws, pack, D, mods);
  }
  function feishengInfo(ws, pack, D, mods) {
    return pack.worldSystems.tribInfo(ws, pack, D, mods, { base: D.LEGACY.FEISHENG_BASE_P });
  }
  function canFeisheng(ws, pack, D, meta, now, profile) {
    if (ws.realm < D.REALMS.length - 1) return { ok: false, reason: 'realm' };
    if (ws.qi < capOf(ws, pack, D, profile)) return { ok: false, reason: 'qi' };
    if ((ws.feishengCd || 0) > now) return { ok: false, reason: 'cd', until: ws.feishengCd };
    return { ok: true };
  }
  function canBingjie(ws, D) {
    if (ws.realm < D.LEGACY.BINGJIE_MIN_REALM) return { ok: false, reason: 'realm' };
    return { ok: true };
  }

  /* ── 真灵承继资格与候选（轮回卷 §3.4 · 视图入口与本模块选件**同源**，禁两侧各写一份判据）──
   * 资格 = 已购 shop.heir（永久资格，不随境界缩放）；
   * 候选 = ws.treasures.owned 里 st.spirit.a 为真**且法宝 def 在册**的件（保 owned 原序 ⇒ 第 0 件即自动口径）。
   * 觉醒标记单一事实源 = st.spirit.a（fusion.js 唯一写口）；只写 .awake 的假件永不为候选。 */
  function heirEligible(meta) {
    return !!(meta && meta.spent && meta.spent['shop.heir'] != null);
  }
  function heirCandidates(ws, pack) {
    var out = [];
    var T = pack && pack.treasures;
    if (!T || !T.byId) return out;
    arr((ws || {}).treasures ? ws.treasures.owned : null, []).forEach(function (e) {
      var sp = e && e.st && e.st.spirit;
      if (sp && sp.a && T.byId[e.id]) out.push({ id: e.id, def: T.byId[e.id], sp: sp });
    });
    return out;
  }
  /* 择定 → 快照落 meta（只此一件）：hit 为该件候选项；无 hit 不动（由调用侧兜自动口径） */
  function setHeir(meta, hit) {
    if (!hit) return false;
    meta.heirTreasure = hit.id;
    meta.heirSpirit = SQ.Fusion && SQ.Fusion.heirSnapshot ? SQ.Fusion.heirSnapshot(hit.sp) : null;
    return true;
  }

  /* 转世事务（§5.1 七步之 ①③④⑤⑥；②浮层由视图先调 preview、⑦创角走既有流程）：
   * 单 mutate 事务内完成——中断即整体不落盘；pendingRebirth 中间态供脏档恢复（finishRebirth 幂等续做） */
  function rebirth(s, channel, now) {
    var wid = s.profile.worldId;
    var pack = SQ.Worlds[wid].pack;
    var D = pack.data;
    var ws = s.worlds[wid];
    var meta = s.meta;
    var pv = preview(ws, meta, pack, D, channel, now);
    /* ③ 传记生成（本地模板；恢复路径复用已存草稿） */
    var bio = (SQ.Codex && SQ.Codex.generateBio)
      ? SQ.Codex.generateBio(ws, meta, pack, D, s.profile, channel, now) : null;
    /* ④ 中间态落账 → meta 入账 → stats → ⑤ ws 重置 → 清中间态 */
    meta.pendingRebirth = { channel: channel, at: now, expectLives: (meta.stats.lives || 0) + 1, bio: bio, total: pv.total };
    finishRebirth(s, now);
    return pv;
  }

  function finishRebirth(s, now) {
    var meta = s.meta;
    var pr = meta.pendingRebirth;
    if (!pr) return null;
    var wid = s.profile.worldId;
    var pack = SQ.Worlds[wid].pack;
    var D = pack.data;
    var L = D.LEGACY;
    var ws = s.worlds[wid];
    var channel = CH_NAME[pr.channel] ? pr.channel : 'bingjie';   /* 在册四通道取原值，脏值回落 bingjie（寿元批：原式非飞升即折成 bingjie ⇒ 死世谎报兵解） */
    /* 终局成就结算前补发（重放确定性 #201）：正常事务与脏档恢复两路径统一在此——
     * 成就称号先进墙，本世 title 结算行才在首次与重放间稳定（幂等键防重发）。
     * 被动了结两通道不发成就（舍身证道 = 玩家主动兵解的荣誉，死世不配） */
    var termIds201 = channel === 'feisheng' ? ['achv_feisheng'] : CH_DEATH[channel] ? [] : ['achv_bingjie'];
    if (channel === 'feisheng' && ws.tribMarks && ws.tribMarks.yuanman) termIds201.push('achv_yuanman');
    grantTerminalAchvs(s, termIds201, pr.at || now);
    /* meta 入账（幂等：earnedKeys 键判重——重放零重复入账，#201） */
    var pv = preview(ws, meta, pack, D, channel, pr.at || now);
    applyPreview(meta, pv, pr.at || now);
    /* stats 更新（幂等赋值口径：expectLives 判重防中断重放双计） */
    var st = meta.stats;
    if (st.lives < (pr.expectLives || st.lives + 1)) {
      st.lives = pr.expectLives || (st.lives + 1);
      if (channel === 'feisheng') st.ascensions += 1; else if (CH_DEATH[channel]) st.deaths += 1; else st.dissolutions += 1;
      st.realmMax = Math.max(st.realmMax, ws.realm || 0);
      st.tribWin += (ws.tribulation ? ws.tribulation.success || 0 : 0) + (channel === 'feisheng' ? 1 : 0) + ((ws.tiandao || {}).nijieWins || 0);
      st.tribAttempts += (ws.tribulation ? ws.tribulation.attempts || 0 : 0);
      st.tribFail = Math.max(0, st.tribAttempts - st.tribWin);
      st.officeMax = Math.max(st.officeMax, Math.min(rankNow(ws, pack, D) + 1, (L.OFFICE_SCORE || []).length - 1));
      /* 榜位档供数回灌（轮回卷 §2.3 末环）：本世榜面最高档进 stats.rankMax，须先于 rankScored 推进 */
      st.rankMax = Math.max(st.rankMax || 0, prodTier(ws, D));
      st.rankScored = Math.max(st.rankScored, st.rankMax || 0);
      if (ws.tiandao) {
        st.defyTotal += (ws.tiandao.stats || {}).defy || 0;
        st.acceptTotal += (ws.tiandao.stats || {}).accept || 0;
        st.defyMax = Math.max(st.defyMax, ws.tiandao.defy || 0);
      }
      /* 前世结缘名录（跨世之缘选择池数据源） */
      var lb = [];
      for (var bn in (ws.bonds || {})) if ((ws.bonds[bn] || 0) >= 1) lb.push(bn);
      meta.lastBonds = lb.slice(0, 60);
      /* 天道称号并入称号墙（图鉴卷 §6.1 titles 写口经 Codex） */
      if (ws.tiandao && ws.tiandao.title && SQ.Codex && SQ.Codex.addTitle) SQ.Codex.addTitle(meta, 'title_nitian');
      /* 传记 push（≤9 世挤最旧；恢复路径用已存草稿） */
      if (pr.bio && SQ.Codex && SQ.Codex.pushBio) SQ.Codex.pushBio(meta, pr.bio, st.lives, s.profile.name, channel, pr.at || now);
      st.immThisLife = 0;
    }
    /* 跨世宿敌留存（天骄卷 §九）：解锁且在档 feud 天骄 → meta.eternalProdigy（≤300B 紧凑结构；
     * 已释怀/已斩杀者不进——须在 ws 重置**前**取数） */
    if (SQ.Prodigy && SQ.Prodigy.saveEternal) SQ.Prodigy.saveEternal(ws, meta);
    /* 真灵承继（器灵卷 §九 数据契约 + 轮回卷 §3.4「可选一件」玩家入口）：已购 shop.heir → 带**一件**觉醒器灵法宝入下世
     * meta.heirChoice 三态生效（顺序即优先级）：
     *   ① 'none'  ⇒ 玩家明说不带 ⇒ 清空 heirTreasure/heirSpirit，下世不预置承继件；
     *   ② 法宝 id 且该件**仍觉醒** ⇒ 带它（含「换一件」覆写上一世已登记件）；
     *   ③ 未择定 / 择了未觉醒或不存在的件 ⇒ 原口径取 owned 里第一件已觉醒者；已登记件在档则**原样续带**。
     * ⇒ 红线「只此一件、不叠加」由「单值字段 + 命中即定」承载；**任何脏选都降级为有宝，绝不退化为空手**。
     * 原读 .awake 全库无写入方 → 承继链恒不生效（#259 死链修复批），读点恒为 spirit.a。 */
    if (heirEligible(meta)) {
      var heirCands = heirCandidates(ws, pack);
      var heirCh = meta.heirChoice, heirHit = null, hi = 0;
      if (heirCh === HEIR_NONE) {
        meta.heirTreasure = null; meta.heirSpirit = null;
      } else {
        if (heirCh) for (hi = 0; hi < heirCands.length; hi++) if (heirCands[hi].id === heirCh) { heirHit = heirCands[hi]; break; }
        if (!heirHit && !meta.heirTreasure) heirHit = heirCands[0] || null;
        setHeir(meta, heirHit);
      }
    }
    /* ⑤ ws 重置（继承/重置矩阵 §四：未列出字段一律重置 = initialState 重建） */
    if (s.profile.name !== '' || ws.realm > 0 || ws.total > 0 || (ws.tribulation && ws.tribulation.attempts > 0)) {
      var fresh = pack.initialState();
      if (meta.heirTreasure && SQ.Treasures && SQ.Treasures.gain) {
        SQ.Treasures.gain(fresh, pack, D, meta.heirTreasure, null);
        /* 器灵随件承继（§九 数据契约兑现）：觉醒态 + 人格 + 温养值落回新世该件，冷却类字段归零 */
        if (SQ.Fusion && SQ.Fusion.heirRestore) SQ.Fusion.heirRestore(fresh, pack, D, meta.heirTreasure, meta.heirSpirit);
      }
      s.worlds[wid] = fresh;
      s.profile.name = '';
      s.profile.talents = [];
      s.profile.legacyTalents = [];
      s.profile.createdAt = 0;
      s.profile.alignBias = 'neutral';
      SQ.Log.push(fresh, 'sys', SQ.t('legacy.log.rebirth', {
        life: meta.stats.lives, ch: SQ.t(CH_NAME[channel], null, wid)
      }, wid));
      /* ⑥ 转世天象入队（天道卷 v1.1 节点 7；事务外语义——失败不阻塞） */
      if (SQ.Tiandao && SQ.Tiandao.pushOmen) {
        try { SQ.Tiandao.pushOmen(fresh, pack, D, 'rebirth', {}, now); } catch (e) { /* 静默降级 */ }
      }
    }
    meta.pendingRebirth = null;
    /* 承继择定 = 一世意图，与 pendingRebirth 同末点消费清空：清空点放在**全部步骤之后**，
     * 中断重放（§5.4）期 heirChoice 仍在位 ⇒ 重放与首跑同判据，不破坏 #201 重放确定性 */
    meta.heirChoice = null;
    syncToWs(s);
    return pv;
  }

  /* 终局成就结算前发放（#201 重放确定性 · 六向批 A7 联调修正）：
   * 兵解/飞升成就生成的称号必须先进称号墙，本世 title 结算行才完整——否则首次 finishRebirth
   * 之后 scan 才发成就，pendingRebirth 重放会看到「更多称号」补计入账，破坏重放零增量语义。
   * scan 照旧扫描（achv 幂等键防重发），历史追溯口径不变。 */
  function grantTerminalAchvs(s, ids, now) {
    if (!SQ.Codex || !s.meta || !s.profile) return;
    var entry = SQ.Worlds[s.profile.worldId];
    if (!entry || !entry.pack) return;
    var D = entry.pack.data;
    ((D.CODEX || {}).ACHV || []).forEach(function (a) {
      if (ids.indexOf(a.id) < 0 || s.meta.achv.indexOf(a.id) >= 0) return;
      s.meta.achv.push(a.id);
      earnImmediate(s.meta, a.id, a.karma, 'achv', now);
      if (a.title && a.title !== '-') SQ.Codex.addTitle(s.meta, a.title);
    });
  }

  /* 飞升大劫掷判（独立终局劫 · §1.2）：成功 → 满额转世；失败 → 不扣修为不计 streak、24h CD */
  function doFeisheng(s, now) {
    var wid = s.profile.worldId;
    var pack = SQ.Worlds[wid].pack;
    var D = pack.data;
    var ws = s.worlds[wid];
    var chk = canFeisheng(ws, pack, D, s.meta, now, s.profile);
    if (!chk.ok) return chk;
    var mods = SQ.Mods.collect(s.profile, ws, pack, D);
    var info = feishengInfo(ws, pack, D, mods);
    if (!info) return { ok: false, reason: 'info' };
    var success = Math.random() < info.p;
    if (!success) {
      ws.feishengCd = now + D.LEGACY.FEISHENG_CD_MS;
      SQ.Log.push(ws, 'sys', SQ.t('legacy.log.feisheng.fail', null, wid));
      if (SQ.Tiandao) SQ.Tiandao.chronPush(ws, 'ascendfail', {}, now);
      /* 器灵钩子同点位（飞升大劫亦是渡劫结算窗口）：温养 +15 / 判词 / 护魂标记判后清除 */
      if (SQ.Fusion) {
        SQ.Fusion.onTribWarm(ws, pack, D, now, null);
        SQ.Fusion.verdictLine(ws, pack, D, 'trib', now, null);
        SQ.Fusion.onTribSettled(ws, pack);
      }
      return { ok: true, success: false, p: info.p };
    }
    if (info.p >= D.TRIB_P_CLAMP[1]) ws.tribMarks = Object.assign({}, ws.tribMarks, { yuanman: true });
    var pv = rebirth(s, 'feisheng', now);
    return { ok: true, success: true, p: info.p, preview: pv };
  }
  function doBingjie(s, now) {
    var wid = s.profile.worldId;
    var D = SQ.Worlds[wid].pack.data;
    var ws = s.worlds[wid];
    var chk = canBingjie(ws, D);
    if (!chk.ok) return chk;
    var pv = rebirth(s, 'bingjie', now);
    return { ok: true, success: true, preview: pv };
  }

  /* ── 镜像同步（mods.collect 消费点）：meta 派生的常驻 qiRate 来源行写回 ws 缓存字段
   * （legacy/codex 两来源 · normalize 透传保序；sim 脚本 initialState 缺省 0 = 零侵入）── */
  function syncToWs(s) {
    if (!s || !s.profile) return;
    var wid = s.profile.worldId;
    var ws = s.worlds[wid];
    if (!ws) return;
    var pack = SQ.Worlds[wid] && SQ.Worlds[wid].pack;
    if (!pack) return;
    var D = pack.data;
    ws.legacyQi = qiRateOf(s.meta, D);
    ws.codexQi = (SQ.Codex && SQ.Codex.qiRateOf) ? SQ.Codex.qiRateOf(s.meta, D) : 0;
  }

  /* boot/mutate 统一后处理：脏档转世恢复 + 图鉴成就扫描 + 镜像同步 */
  function sync(s, now) {
    if (!s) return;
    /* 防御：调试直写/旧口径 meta 缺扩展字段 → 先过 metaNormalize（幂等） */
    if (!s.meta || !s.meta.codices || !s.meta.stats) s.meta = metaNormalize(s.meta);
    if (s.meta.pendingRebirth) finishRebirth(s, now || Date.now());
    if (SQ.Codex && SQ.Codex.scan) SQ.Codex.scan(s, now || Date.now());
    syncToWs(s);
  }

  SQ.Legacy = {
    metaBlank: metaBlank,
    metaNormalize: metaNormalize,
    earnOnce: earnOnce,
    earnDelta: earnDelta,
    earnImmediate: earnImmediate,
    spend: spend,
    shopItems: shopItems,
    itemById: itemById,
    ownedTalents: ownedTalents,
    qiRateOf: qiRateOf,
    buy: buy,
    preview: preview,
    rebirth: rebirth,
    finishRebirth: finishRebirth,
    feishengInfo: feishengInfo,
    canFeisheng: canFeisheng,
    canBingjie: canBingjie,
    heirEligible: heirEligible,
    heirCandidates: heirCandidates,
    HEIR_NONE: HEIR_NONE,
    doFeisheng: doFeisheng,
    doBingjie: doBingjie,
    syncToWs: syncToWs,
    sync: sync,
    rankNow: rankNow
  };
})();
