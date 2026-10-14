/* xiuxian/index.js — 修仙世界包编排层（词表/命名池在 lexicon.js 分卷，数据在 data.js/arts.js/events.js）
 * 契约（工程规范 §2.2）：lexicon、initialState()、normalize(raw)、claim(ws, dt, now, profile)、
 * realms/zones/arts/events 数据表、attributes（G12）、specialHooks（挂点白名单）、worldSystems。
 * 编排纪律：专属系统（善恶/渡劫）可读通用状态；通用系统对专属字段只透传不解释。
 * 词表纪律：本文件禁止裸中文常量——日志模板全部走 t(key)。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var W = SQ.Worlds.xiuxian;
  var D = SQ.XDATA;

  /* ── 初始参数（存档字段总表 §3.2/§3.3 缺省值）──────────── */
  function initialState() {
    var now = Date.now();
    return {
      qi: 0, total: 0, stones: 100, realm: 0,
      artsKnown: ['tuna', 'juling'], artsLevels: {}, artsSlots: [], shelf: [],
      artsAutoInit: false, artsLearnClock: 0, artsSelfLearnN: 0,
      zone: 0, prog: {}, cleared: [], combatAcc: 0, kills: 0,
      /* 系统深化批 A4（数值详设 §2.5~§2.7）：区域词缀 {affixId, until} / 域主 {zone, state, retryAt}
       * / 探宝残片 10 元分区计数；A6：天道垂青 fateSeen [{id, realm}]（同境界段排除） */
      zoneAffix: null, zoneBoss: null, shards: [], fateSeen: [],
      gear: { weapon: null, treasure: null, armor: null, accessory: null },
      stash: [],
      gearSeen: {},                /* 百器录：special id / 'ex_'+独占 id → 首获 ts（数值详设 §3.7，炼化不除名） */
      /* G13 洞府（引擎卷 §五 + 福地池卷 v2.0）：驻留唯一 + 迁居冷却 1 游戏年（绝对时间戳）
       * + 所有权列表（主线/别院购入、隐世 obtain 自动授予）+ fac 附属设施等级表 */
      cave: { current: D.CAVE_INITIAL, cooldownUntil: 0, owned: [D.CAVE_INITIAL], fac: {} },
      /* 财柱此生总账（引擎卷 §4.1）：只增不清、跨渡劫不清零；分类映射真实机制，无占位空类 */
      ledger: SQ.Ledger.blank(),
      shop: { items: [], blackItems: [], nextRestock: 0, refreshStep: 0, discount: 0 },
      buffs: [], eventCooldowns: {},
      /* 修行状态（模式）：seclude 闭关领悟 / venture 外出历练；离线 = 潜心悟道按原规则结算。
       * 精通：每部功法独立 0~100，槽内在线增长，满值顿悟 Lv+1（systems/arts.js tickPractice）。
       * 游戏历（v2.3）：起始年创角随机 1~9000；1 游戏日 = 现实 1 秒，自 profile.createdAt 起算，
       * 12 月 × 30 日 = 360 日/年——视图层只做换算，不存累计值（离线照常流逝）。 */
      calYear: 1 + Math.floor(Math.random() * 9000),
      /* G16 势力（势力批 v2.4 + 深化批 v1.23）：固定池 16 处 + 随机补足在 normalize 缺失时
       * 生成一次（随档持久）；factionId = 当前效力势力（未加入 null）；merchantScout = 神秘
       * 商人「无视」标记；factionRep~factionSupply = 职级贡献/捐献窗口/委托/冲突/供给五件套 */
      factions: null, factionNpcs: null, factionId: null, factionCdUntil: 0, merchantScout: false,
      factionRep: {}, factionDonate: { at: 0, used: 0 },
      factionQuest: null, factionQuestCd: 0, factionWar: null, factionSupply: {},
      /* 系统深化批（势力全录卷 §八/§九）：职位双技能 CD 时间戳（null = 从未使用）+
       * 功法情报白名单（永久随档，献秘与探宝残片两渠道共用） */
      factionOffice: null, intelArts: {},
      /* G17 江湖传闻（传闻设计卷 v1.0）：活跃卡 ≤4 + war 卡（独立至多一条）；rumorClock
       * 在线累计秒（离线冻结但过期照绝对时间戳清扫） */
      rumors: [], rumorClock: 0,
      mode: D.MODE_DEFAULT,
      artsPractice: {},
      eventHistory: { lastId: null, seen: {}, feed: [] },
      eventClock: 0,                 /* 在线奇遇时钟·秒（事件池 §三 v1.5：仅在线推进，触发归零，离线冻结） */
      lastOffline: null,             /* 离线结算汇总 {at,secs,qi,stones,trib}（数值详设 §1.3 v1.7） */
      pendingChoice: null, breakCostNext: 0,
      lastSave: now, log: [],
      /* 修仙专属 */
      karma: 0, karmaEventScore: 0, alignDrift: 0,
      attrs: { jing: 0, qi: 0, shen: 0 },
      attrEventBonus: { jing: 0, qi: 0, shen: 0 },
      tribulation: { attempts: 0, success: 0, lastResult: null, next: 0, lastSuccessTs: null,
        /* 系统深化批（数值详设 §8.3 / 势力全录卷 §8.6）：连败计数 + 门中护法一次性标记 */
        streak: 0, officeGuard: false },
      /* G14 护法结缘（引擎卷 §五 · v1.4）：好感只增（−1 = 绝交锁）/ 护法记录 / 冥佑计日锚
       * / 心结锁（炉鼎解除）/ 提亲冷却 / 双修状态与解除叙事待消费记录 */
      bonds: {}, spouse: null, guardLog: { count: 0, success: 0 },
      guardianPick: null,           /* 护法自选批：玩家手选护法位（null = 自动·好感最高者） */
      chuBlessAt: 0, scars: {}, spouseCdUntil: 0, spouseLog: null,
      /* G15 法宝（灵宝 · 法宝全录）：独立于四槽法器，栏位 3 / 库无上限 / 不炼化 */
      treasures: SQ.Treasures.blank(),
      /* 天道系统（天道设计 v1.1 §8.1 · 唯一写口 systems/tiandao.js） */
      tiandao: SQ.Tiandao.blank(),
      /* ── 六向长线批（轮回/图鉴/炼丹/天骄/融合器灵/宗门 六卷）ws 侧新字段 ──
       * legacyQi/codexQi = meta 派生常驻 qiRate 镜像（Legacy.sync 回写，mods.collect 消费）；
       * feishengCd = 飞升大劫失败 24h 重试冷却；bossKills/affixSeen = 域主首杀与词缀遭遇
       * （图鉴秘境内三层与轮回计分供数）；tribMarks = 渡劫边缘成就标记（无漏三连/苦渡/连败不灭/圆满）；
       * heirBond = 跨世之缘赎回道友；juefengIds = 绝交锁名录（成就「绝而复续」判定源）；
       * everDefected/factionRepPeak = 叛离哨兵与声望历史峰值（自立门户开宗门槛）；
       * prodigies/prodMarks/prodigyClock = 同代天骄（≤4 人 · 月度结算时钟 · 宿敌标记）；
       * materials/alchemy/gather/ledgerMat = 炼丹炼器（材料 30 种堆叠 999 · 丹炉双轨熟练度 ·
       *   采集点 CD · 材料账两路）；fusion = 自创功法（customs ≤4 门 · 三代封顶）；sect = 宗门。 */
      legacyQi: 0, codexQi: 0,
      feishengCd: 0,
      bossKills: [], affixSeen: {}, tribMarks: {}, juefengIds: [], heirBond: null,
      redeemedIds: [], rankGiftSeen: [],   /* 缘尽赎回已用名录 / 名号同道相吸已发段（每世各一次）*/
      bondVisitAt: 0,   /* 好感三渠道批：拜访论道全局单冷却锚（现实 ms 时间戳；0 = 从未拜访）。
       *                 刻意做成**全局单锚**而非 {npcId: ts} 名录——后者随道友池 58 人线性增长，
       *                 违反本批「只在现有对象上加标记位、不新开随内容池线性增长的容器」约束。
       *                 代价 = 拜访不能连点两人（须等冷却），收益 = 落盘恒定 ≈18B。*/
      everDefected: false, factionRepPeak: 0,
      /* 洗髓批（天赋池设计 v1.8 §十）：talentOwed = 已得未用之洗髓缘，talentUsed = 本世已换枚数；
       * 预算上限 D.TALENT_SWAP.PER_LIFE，赐缘与换骨都只走 SQ.Talents 两个写口 */
      talentOwed: 0, talentUsed: 0,
      prodigies: [], prodMarks: {}, prodigyClock: 0,
      materials: {}, alchemy: null, gather: {}, ledgerMat: null,
      fusion: null,
      sect: null
    };
  }

  var num = SQ.util.num, obj = SQ.util.obj, arr = SQ.util.arr;   /* C1：统一至 assets/util.js */

  /* ── normalize：逐层补齐（验收 4.1 #2/#3/#10）──────────── */
  function normalize(raw) {
    var d = initialState();
    if (!raw || typeof raw !== 'object') return d;
    var out = {
      qi: num(raw.qi, 0), total: num(raw.total, 0),
      stones: num(raw.stones, d.stones), realm: num(raw.realm, 0),
      artsKnown: arr(raw.artsKnown, d.artsKnown),
      artsLevels: obj(raw.artsLevels, {}),
      artsSlots: arr(raw.artsSlots, []).slice(0, D.ARTS_SLOTS),
      artsAutoInit: raw.artsAutoInit === true, /* 体验手感批：一次性入槽回填旗标（旧档缺省 false → 首次 claim 补齐） */
      shelf: arr(raw.shelf, []).slice(0, D.SHELF_CAP),
      zone: num(raw.zone, 0), prog: obj(raw.prog, {}),
      cleared: arr(raw.cleared, []), combatAcc: num(raw.combatAcc, 0), kills: num(raw.kills, 0),
      gear: Object.assign({}, d.gear, obj(raw.gear, {})),
      stash: arr(raw.stash, []).slice(0, D.STASH_CAP + 4),
      gearSeen: obj(raw.gearSeen, {}),
      /* 洞府：脏 id / 缺 owned 一律回落初始洞府；cooldownUntil 只收绝对时间戳（负数归零）；
       * fac 附属设施（v2.0）：只收已拥有福地 × 在册设施 id，等级钳位 0~MAX_LV */
      cave: (function () {
        var known = function (id) {
          return D.CAVES.some(function (c) { return c.id === id; });
        };
        var c = Object.assign({}, d.cave, obj(raw.cave, {}));
        c.owned = arr(c.owned, []).filter(known);
        if (!known(c.current)) c.current = D.CAVE_INITIAL;
        if (c.owned.indexOf(c.current) < 0) c.owned.push(c.current);
        if (c.owned.indexOf(D.CAVE_INITIAL) < 0) c.owned.push(D.CAVE_INITIAL);
        c.cooldownUntil = Math.max(0, num(c.cooldownUntil, 0));
        var fac = {};
        var facIds = {};
        (D.CAVE_FACILITIES || []).forEach(function (fd) { facIds[fd.id] = fd; });
        var rawFac = obj(c.fac, {});
        c.owned.forEach(function (cid) {
          var src = obj(rawFac[cid], null);
          if (!src) return;
          var f1 = {};
          for (var fk in src) {
            if (!facIds[fk]) continue;
            var lv = Math.floor(num(src[fk], 0));
            if (lv > 0) f1[fk] = Math.min(D.CAVE_FAC_MAX_LV || 3, lv);
          }
          if (Object.keys(f1).length) fac[cid] = f1;
        });
        c.fac = fac;
        return c;
      })(),
      ledger: SQ.Ledger.normalize(raw.ledger),
      shop: Object.assign({}, d.shop, obj(raw.shop, {})),
      buffs: arr(raw.buffs, []),
      eventCooldowns: obj(raw.eventCooldowns, {}),
      /* 修行状态：脏值一律回落缺省（闭关）；精通逐部钳位 0~PRACTICE_MAX（脏档瘦身穿透）
       * 游戏历起始年：正整数钳位；脏档回落常量 1（保证 normalize 幂等，随机只在创角 initialState 一次） */
      calYear: (function () {
        var cy = Math.floor(num(raw.calYear, 1));
        return cy >= 1 ? Math.min(99999999, cy) : 1;
      })(),
      mode: (D.MODES && D.MODES[raw.mode]) ? raw.mode : D.MODE_DEFAULT,
      artsPractice: (function () {
        var out = {}, src = obj(raw.artsPractice, {});
        for (var k in src) {
          var v = num(src[k], 0);
          if (v > 0) out[k] = Math.min(D.PRACTICE_MAX, v);
        }
        return out;
      })(),
      /* 自悟批：自行领悟加权时钟（秒）——脏值回落 0，负值钳 0（进度只增，得手/池枯竭清零） */
      artsLearnClock: Math.max(0, num(raw.artsLearnClock, 0)),
      /* 自悟收敛批：已自悟部数（边际递减计数）——脏值回落 0，负值/小数钳为非负整数 */
      artsSelfLearnN: Math.max(0, Math.floor(num(raw.artsSelfLearnN, 0))),
      eventHistory: (function () {
        var h = Object.assign({}, d.eventHistory, obj(raw.eventHistory, {}));
        h.seen = obj(h.seen, {});
        h.feed = arr(h.feed, []).slice(0, D.EVENT_FEED_CAP);   /* feed 新在前（resolveBranch unshift），截头保 50 */
        if (h.seenOnce) { /* 旧档迁移：seenOnce 列表并入 seen 全量首遇记录（工程规范 §3.2 v2.0） */
          (Array.isArray(h.seenOnce) ? h.seenOnce : []).forEach(function (id) {
            if (h.seen[id] == null) h.seen[id] = num(raw.lastSave, Date.now());
          });
          delete h.seenOnce;
        }
        return h;
      })(),
      eventClock: Math.max(0, num(raw.eventClock, 0)),
      lastOffline: obj(raw.lastOffline, null),
      pendingChoice: obj(raw.pendingChoice, null),
      breakCostNext: num(raw.breakCostNext, 0),
      /* 洗髓缘两字段：非负整数（脏值/小数/负数一律归零，与 artsSelfLearnN 同口径） */
      talentOwed: Math.max(0, Math.floor(num(raw.talentOwed, 0))),
      talentUsed: Math.max(0, Math.floor(num(raw.talentUsed, 0))),
      lastSave: num(raw.lastSave, Date.now()),
      log: arr(raw.log, []).slice(-((SQ.Log && SQ.Log.HARD_CAP) || 2000)),
      karma: num(raw.karma, 0),
      karmaEventScore: num(raw.karmaEventScore, 0),
      alignDrift: Math.max(-D.DRIFT_CAP, Math.min(D.DRIFT_CAP, num(raw.alignDrift, 0))),
      attrs: Object.assign({}, d.attrs, obj(raw.attrs, {})),
      attrEventBonus: Object.assign({}, d.attrEventBonus, obj(raw.attrEventBonus, {})),
      tribulation: Object.assign({}, d.tribulation, obj(raw.tribulation, {})),
      /* G15 法宝：名录内 id / 等级阶位钳位 / 栏位去重，脏档逐层回落（引擎卷 §五） */
      treasures: SQ.Treasures.normalize(raw.treasures, pack),
      /* 天道系统（天道设计 §8.1）：normalize 补默认、幂等，结构非法子字段逐项清理零崩溃 */
      tiandao: SQ.Tiandao.normalize(raw.tiandao, D),
      /* ── 六向长线批字段幂等补齐（各卷 normalize 委托对应系统模块，未装载回落缺省）── */
      legacyQi: Math.max(0, Math.min(0.10, num(raw.legacyQi, 0))),
      codexQi: Math.max(0, Math.min(0.03, num(raw.codexQi, 0))),
      feishengCd: Math.max(0, num(raw.feishengCd, 0)),
      bossKills: arr(raw.bossKills, []).filter(function (z) {
        return typeof z === 'number' && z >= 0 && z < D.ZONES.length;
      }).slice(0, D.ZONES.length),
      affixSeen: (function () {
        var ids = {};
        (D.ZONE_AFFIXES || []).forEach(function (a) { ids[a.id] = 1; });
        var outA = {};
        var rawA = obj(raw.affixSeen, {});
        for (var ak in rawA) if (ids[ak]) outA[ak] = 1;
        return outA;
      })(),
      tribMarks: (function () {
        var tm = obj(raw.tribMarks, {});
        return {
          wulouRun: Math.max(0, Math.floor(num(tm.wulouRun, 0))),
          kudu: tm.kudu === true, lianbai: tm.lianbai === true, yuanman: tm.yuanman === true
        };
      })(),
      juefengIds: arr(raw.juefengIds, []).filter(function (x) { return typeof x === 'string'; }).slice(0, 64),
      redeemedIds: arr(raw.redeemedIds, []).filter(function (x) { return typeof x === 'string'; }).slice(0, 64),
      rankGiftSeen: arr(raw.rankGiftSeen, []).filter(function (x) { return typeof x === 'string'; }).slice(0, 16),
      bondVisitAt: Math.max(0, num(raw.bondVisitAt, 0)),   /* 拜访冷却锚（好感三渠道批）*/
      heirBond: (typeof raw.heirBond === 'string' && raw.heirBond) ? raw.heirBond : null,
      everDefected: raw.everDefected === true,
      factionRepPeak: Math.max(0, Math.floor(num(raw.factionRepPeak, 0))),
      prodigies: (SQ.Prodigy && SQ.Prodigy.normalize) ? SQ.Prodigy.normalize(raw.prodigies, D) : [],
      prodMarks: obj(raw.prodMarks, {}),
      prodigyClock: Math.max(0, num(raw.prodigyClock, 0)),
      materials: (SQ.Alchemy && SQ.Alchemy.normalizeMaterials) ? SQ.Alchemy.normalizeMaterials(raw.materials, D) : {},
      alchemy: (SQ.Alchemy && SQ.Alchemy.normalize) ? SQ.Alchemy.normalize(raw.alchemy, D) : null,
      gather: (SQ.Alchemy && SQ.Alchemy.normalizeGather) ? SQ.Alchemy.normalizeGather(raw.gather, D) : {},
      ledgerMat: (SQ.Alchemy && SQ.Alchemy.normalizeLedgerMat) ? SQ.Alchemy.normalizeLedgerMat(raw.ledgerMat) : null,
      fusion: (SQ.Fusion && SQ.Fusion.normalize) ? SQ.Fusion.normalize(raw.fusion, D) : null,
      sect: (SQ.Sect && SQ.Sect.normalize) ? SQ.Sect.normalize(raw.sect, D) : null
    };
    /* 器灵 st.spirit 结构清理 + 自创功法运行态注册（SQ.XARTS 同步 + 名称注入 SQ.LEX，
     * 清孤儿 custom 键——转世/散功后正典 70 部计数零漂移） */
    if (SQ.Fusion) {
      SQ.Fusion.normalizeSpirits(out, D);
      SQ.Fusion.registerCustoms(out.fusion, D);
    }
    /* lastSuccessTs 只认有限正数（脏值归 null；批 2·B4 立。🔧 第廿五批 2026-10-13：原消费者是
       「待重修」金标 24h 横幅，随该横幅撤除现无消费者 ⇒ 字段与写口保留，见任务清单 N32 ①） */
    out.tribulation.lastSuccessTs =
      (typeof out.tribulation.lastSuccessTs === 'number' && isFinite(out.tribulation.lastSuccessTs) &&
        out.tribulation.lastSuccessTs > 0) ? out.tribulation.lastSuccessTs : null;
    /* 系统深化批（数值详设 §8.3.1 / 势力全录卷 §8.6）：streak 整数 ≥0（旧档补 0）+
     * officeGuard 只认 true（一次性标记，脏值归 false） */
    out.tribulation.streak = Math.max(0, Math.floor(num(out.tribulation.streak, 0)));
    out.tribulation.officeGuard = out.tribulation.officeGuard === true;
    /* ── G14 护法结缘（批 3 · A1）+ 势力批 v2.4 迁移：bonds 只收名录内 id，值域 =
     * −99（绝交锁哨兵；旧档 −1 自动迁移）/ −20~−2（厌恶，合法负好感）/ 0~100 整数；
     * spouse/scars/spouseLog 逐字段校验，脏档一律回落缺省（好感是荣誉资产，宁丢脏不造假）── */
    var compIds = {};
    (D.COMPANIONS || []).forEach(function (c) { compIds[c.id] = c; });
    /* 天骄好感与同道友同池（天骄卷 §6.1 唯一来源 = 切磋 / 专属事件写 `ws.bonds.pr{n}`），
     * 而下面的名录校验只认 `D.COMPANIONS` ⇒ 读档时 `pr{n}` 一律被剪（实测 40 → 键整个消失）：
     * 好感每刷一次页归零，bond 达档三事件 / 一笑泯恩仇 / 携才投效（≥ JOIN_BOND 30）全成
     * 「同一会话不刷新才可能碰到」的一次性内容。**按在册天骄精确放行**——不用 `^pr\d+$`
     * 前缀通配，既免误收脏档，也免误收同前缀道友（`Bonds.lose` 的 scar/lock 判定要吃真键）。 */
    (out.prodigies || []).forEach(function (p) { if (p && p.id) compIds[p.id] = { prodigy: true }; });
    var bonds = {};
    var rawB = obj(raw.bonds, {});
    var bondMin = D.BOND_MIN != null ? D.BOND_MIN : -20;
    for (var bn in rawB) {
      if (!compIds[bn]) continue;
      var bv = rawB[bn];
      if (bv === -1 || bv === -99) { bonds[bn] = -99; continue; }   /* 旧哨兵 −1 → −99 */
      bv = Math.floor(num(bv, 0));
      if (bv < 0) { if (bv >= bondMin) bonds[bn] = bv; continue; }  /* 厌恶区间 −20~−2；越界丢弃 */
      if (bv >= 1) bonds[bn] = Math.min(D.BOND_MAX, bv);
    }
    out.bonds = bonds;
    /* ── G16 势力（势力批 v2.4）：factions 缺失（旧档）→ 生成一次随档持久；存在 → 逐项校验 ── */
    var FIELDS_OK = {};
    (SQ.Mods.FIELDS || []).forEach(function (f) { FIELDS_OK[f] = 1; });
    if (Array.isArray(raw.factions) && raw.factions.length) {
      var facs = [];
      var facIds = {};
      (raw.factions).forEach(function (f) {
        if (!f || typeof f !== 'object' || !f.id || facIds[f.id]) return;
        if (SQ.Factions.ALIGNS.indexOf(f.align) < 0) return;
        if (typeof f.name !== 'string' || !f.name) return;
        if (typeof f.desc !== 'string' || !SQ.LEX.xiuxian[f.desc]) return;   /* 描述 key 必须在册（词表分卷） */
        var pk = obj(f.perk, null);
        if (!pk || !FIELDS_OK[pk.field] || !isFinite(pk.v)) return;
        var rel = {};
        var rawRel = obj(f.rel, {});
        for (var rk in rawRel) {
          if (rawRel[rk] === 'friendly' || rawRel[rk] === 'enemy' || rawRel[rk] === 'neutral') rel[rk] = rawRel[rk];
        }
        facs.push({ id: String(f.id), name: f.name, align: f.align, desc: f.desc,
          fixed: (D.FACTIONS_FIXED || []).some(function (fx) { return fx.id === String(f.id); }),
          perk: { field: pk.field, v: num(pk.v, 0) }, rel: rel });
        facIds[String(f.id)] = 1;
      });
      /* rel 对称还原（容量级⑦ · 上半三角化落盘 · 2026-10-05 存档容量防线批）：
       * 落盘只存「对端 id 字典序更大」的一侧（core.js withTriangleRels），此处补回反向使读端恒见双向。
       * 旧档本就双向全存者：两侧都有值 → 两个分支都不进，幂等零副作用。
       * 关系值已在上方白名单校验（friendly/enemy/neutral），此处只做镜像不重新校验。 */
      for (var ri = 0; ri < facs.length; ri++) {
        for (var rj = ri + 1; rj < facs.length; rj++) {
          var ra = facs[ri], rb = facs[rj];
          var va = ra.rel[rb.id], vb = rb.rel[ra.id];
          if (va && !vb) rb.rel[ra.id] = va;
          else if (vb && !va) ra.rel[rb.id] = vb;
        }
      }
      if (facs.length) {
        out.factions = facs;
        /* 道友归属：只收名录内 id 与在册势力 id（散人 = null） */
        var npcs = {};
        var rawN = obj(raw.factionNpcs, {});
        (D.COMPANIONS || []).forEach(function (c) {
          var fid = rawN[c.id];
          npcs[c.id] = (fid && facIds[fid]) ? fid : null;
        });
        out.factionNpcs = npcs;
      }
    }
    if (!out.factions) {
      SQ.Factions.generate(out, pack, D);        /* 旧档缺失：生成 + 归属一次，随档持久 */
      out.factionId = null;                      /* 生成即未加入（幂等：后续 normalize 走校验分支） */
    } else {
      out.factionId = (raw.factionId && facIds && out.factions.some(function (f) { return f.id === raw.factionId; }))
        ? raw.factionId : null;
    }
    out.factionCdUntil = Math.max(0, num(raw.factionCdUntil, 0));
    out.merchantScout = raw.merchantScout === true;
    /* 神秘商人特席（势力批 v2.4 §8）：until 过期即清；items 结构由 shop 写入方保证 */
    var shp = obj(out.shop, {});
    var merch = obj(shp.merchant, null);
    if (merch && !(merch.until > 0)) merch = null;
    if (merch) merch.items = arr(merch.items, []).filter(function (mi) { return mi && typeof mi === 'object'; });
    if (shp.merchant) shp.merchant = merch;
    /* ── G16 势力深化批（v1.23 · 势力全录卷 §三~§六）：职级贡献五件套逐字段校验，
     * 脏档一律回落缺省；factionRep/factionSupply 只收在册势力 id / 在册 SKU ── */
    var nowN = Date.now();
    var facIdSet = {};
    (out.factions || []).forEach(function (f) { facIdSet[f.id] = 1; });
    var rep = {};
    var rawRep = obj(raw.factionRep, {});
    for (var rk2 in rawRep) {
      if (!facIdSet[rk2]) continue;
      var rv = Math.floor(num(rawRep[rk2], 0));
      if (rv > 0) rep[rk2] = rv;
    }
    out.factionRep = rep;
    var don = obj(raw.factionDonate, {});
    out.factionDonate = { at: Math.max(0, num(don.at, 0)), used: Math.max(0, Math.floor(num(don.used, 0))) };
    var qTypes = Object.keys((D.FACTION_QUEST || {}).TYPES || {});
    var rq = obj(raw.factionQuest, null);
    out.factionQuest = (rq && qTypes.indexOf(rq.type) >= 0 && rq.target > 0 && rq.expireAt > nowN)
      ? { type: rq.type, target: num(rq.target, 0), base: Math.max(0, num(rq.base, 0)),
          rep: Math.max(0, Math.floor(num(rq.rep, 0))), stones: Math.max(0, Math.round(num(rq.stones, 0))),
          bornAt: num(rq.bornAt, nowN), expireAt: num(rq.expireAt, nowN) }
      : null;
    out.factionQuestCd = Math.max(0, num(raw.factionQuestCd, 0));
    var rw = obj(raw.factionWar, null);
    out.factionWar = (rw && facIdSet[rw.aId] && facIdSet[rw.bId] && rw.aId !== rw.bId && rw.until > nowN)
      ? { aId: rw.aId, bId: rw.bId, bornAt: num(rw.bornAt, nowN), until: num(rw.until, nowN),
          /* 战功制（势力全录卷 §7.6）：joined 语义 = null | 'in'（纯入场标记）；
           * 旧格式进行中场 'win'/'lose' 映射为 'in'、既有 result 保留（幂等迁移） */
          joined: (rw.joined === 'in' || rw.joined === 'win' || rw.joined === 'lose') ? 'in' : null,
          joinedFid: (typeof rw.joinedFid === 'string' && facIdSet[rw.joinedFid]) ? rw.joinedFid : null,
          merit: Math.max(0, Math.floor(num(rw.merit, 0))),
          result: obj(rw.result, null) }
      : null;
    /* 职位双技能 CD 时间戳（势力全录卷 §8.6）：null/缺失 = 从未使用；脏值归 0 */
    var fo = obj(raw.factionOffice, null);
    out.factionOffice = fo
      ? { dispatchAt: Math.max(0, num(fo.dispatchAt, 0)), guardAt: Math.max(0, num(fo.guardAt, 0)) }
      : null;
    /* 功法情报白名单（势力全录卷 §9.6）：只收在册功法 id 且值为 true；永久随档 */
    var intel = {};
    var rawIntel = obj(raw.intelArts, {});
    for (var iak in rawIntel) {
      if (rawIntel[iak] === true && SQ.XARTS && SQ.XARTS[iak]) intel[iak] = true;
    }
    out.intelArts = intel;
    var sup = {};
    var rawSup = obj(raw.factionSupply, {});
    (D.FACTION_SUPPLY || []).forEach(function (si) {
      var ts = num(rawSup[si.sku], 0);
      if (ts > 0) sup[si.sku] = ts;
    });
    out.factionSupply = sup;
    /* ── G17 江湖传闻（v1.23）：结构校验 + 过期丢弃 + 未知 evId 丢弃（Rumors.normalizeList）── */
    out.rumors = (SQ.Rumors && SQ.Rumors.normalizeList)
      ? SQ.Rumors.normalizeList(raw.rumors, pack, D, nowN) : [];
    out.rumorClock = Math.max(0, num(raw.rumorClock, 0));
    var sp = obj(raw.spouse, null);
    out.spouse = (sp && compIds[sp.npcId] && compIds[sp.npcId].category === 'spouse' &&
      (D.SPOUSE_FORMS || {})[sp.form])
      ? { npcId: sp.npcId, form: sp.form, since: num(sp.since, 0) } : null;
    var gl = obj(raw.guardLog, {});
    out.guardLog = { count: Math.max(0, Math.floor(num(gl.count, 0))), success: Math.max(0, Math.floor(num(gl.success, 0))) };
    out.guardLog.success = Math.min(out.guardLog.success, out.guardLog.count);
    /* 护法自选批：玩家手选护法位（道友页「择护法」浮层写入）；只收名录内 id，
     * 资格校验（已结缘/无心结锁）由 SQ.Bonds.guardianOf 运行时兜底——脏值回落 null（自动）。 */
    out.guardianPick = (raw.guardianPick && compIds[raw.guardianPick]) ? raw.guardianPick : null;
    out.chuBlessAt = Math.max(0, num(raw.chuBlessAt, 0));
    var scars = {};
    var rawSc = obj(raw.scars, {});
    for (var scn in rawSc) if (compIds[scn]) scars[scn] = num(rawSc[scn], 0);
    out.scars = scars;
    out.spouseCdUntil = Math.max(0, num(raw.spouseCdUntil, 0));
    var sl = obj(raw.spouseLog, null);
    out.spouseLog = (sl && compIds[sl.npcId] && (D.SPOUSE_FORMS || {})[sl.form] &&
      (sl.reason === 'karma' || sl.reason === 'redemption'))
      ? { npcId: sl.npcId, form: sl.form, reason: sl.reason, at: num(sl.at, 0) } : null;
    out.realm = Math.max(0, Math.min(D.REALMS.length - 1, Math.floor(out.realm)));
    out.zone = Math.max(0, Math.min(D.ZONES.length - 1, Math.floor(out.zone)));
    /* ── 系统深化批 A4/A6 新字段幂等补齐（数值详设 §2.5~§2.7 / §8.3 存档表）── */
    /* 区域词缀：未知 id / 结构非法 / until 非正数 → null（无词缀按 ×1.0 结算）；过期保留由
     * simulate 回线补掷，normalize 不掷随机（幂等纪律） */
    var affixIds = {};
    (D.ZONE_AFFIXES || []).forEach(function (a) { affixIds[a.id] = 1; });
    var za = obj(raw.zoneAffix, null);
    out.zoneAffix = (za && affixIds[za.affixId] && num(za.until, 0) > 0)
      ? { affixId: za.affixId, until: num(za.until, 0) } : null;
    /* 域主：zone 越界 / state 非法 → null；旧档缺省 null = 维持「首通即推进」不追溯生成 */
    var zb = obj(raw.zoneBoss, null);
    out.zoneBoss = (zb && num(zb.zone, -1) >= 0 && zb.zone < D.ZONES.length &&
      (zb.state === 'ready' || zb.state === 'dead'))
      ? { zone: Math.floor(num(zb.zone, 0)), state: zb.state, retryAt: Math.max(0, num(zb.retryAt, 0)) }
      : null;
    /* 残片：10 元整数数组（缺省补 0、负数钳 0、取整） */
    var rawSh = arr(raw.shards, []);
    out.shards = [];
    for (var si = 0; si < D.ZONES.length; si++) {
      out.shards.push(Math.max(0, Math.floor(num(rawSh[si], 0))));
    }
    /* 天道垂青 fateSeen：[{id, realm}] 结构逐项校验（同境界段排除数据源），cap 64 截尾 */
    var fs = [];
    arr(raw.fateSeen, []).forEach(function (f) {
      if (!f || typeof f !== 'object' || typeof f.id !== 'string' || !f.id) return;
      var rl = Math.floor(num(f.realm, 0));
      if (rl < 0 || rl >= D.REALMS.length) return;
      if (fs.length < 64) fs.push({ id: f.id, realm: rl });
    });
    out.fateSeen = fs;
    return out;
  }

  /* ── 派生值重算（karma/attrs 缓存纪律：任何变更后覆盖式重算）── */
  function recalcDerived(ws, profile) {
    SQ.Attrs.recalc(ws, pack, D, null);
    /* 业力破档天象钩子（天道设计 §7.1）：karma 跨越阵营档位分界线瞬间入队——
     * 覆盖式重算的前后快照对比，事件钩子产物零数值侵入 */
    var tierPrev = SQ.XKarma.tierOf(ws.karma || 0);
    var rankPrev = SQ.XKarma.rankOf(ws.karma || 0, D);
    SQ.XKarma.recalc(ws, D);
    if (SQ.Tiandao) {
      var tierNow = SQ.XKarma.tierOf(ws.karma || 0);
      if (tierPrev !== tierNow) SQ.Tiandao.onKarmaCross(ws, pack, D, tierPrev, tierNow, Date.now());
    }
    /* 名号更迭（善恶名号批）：karma 跨段瞬间入档独立分类 'karma'——起讫名号取自词表，
     * 视图层据此分类触发「名号更迭」全屏演出（日志为持久反馈，演出为即时反馈，二者同源）。 */
    var rankNow = SQ.XKarma.rankOf(ws.karma || 0, D);
    if (rankPrev !== rankNow && SQ.Log) {
      SQ.Log.push(ws, 'karma', SQ.t('karma.rank.log', {
        from: SQ.t('karma.rank.' + rankPrev, null, pack.worldId),
        to: SQ.t('karma.rank.' + rankNow, null, pack.worldId)
      }, pack.worldId));
      /* 同道相吸（阵营名号联动批 · 道友池卷 v1.2 §六）：名号跨段同一瞬间，同向且已相识的
       * 道友一次性入好感——走 Bonds.gain 唯一正向写口，每名号每世限一次（rankGiftSeen 防刷）。
       * 中性段（左道散人）零发放；未相识者不入账（结缘仍由事件门控）。 */
      if (SQ.Bonds && SQ.Bonds.alignGift) {
        var ag = SQ.Bonds.alignGift(ws, pack, D, rankNow, Date.now());
        if (ag.ok && ag.hit > 0) {
          SQ.Log.push(ws, 'bond', SQ.t('bond.align.log', {
            rank: SQ.t('karma.rank.' + rankNow, null, pack.worldId),
            dir: SQ.t('align.' + ag.dir, null, pack.worldId),
            n: ag.hit, per: ag.per
          }, pack.worldId));
        }
      }
    }
    SQ.Arts.recheckShelf(ws, pack, D, null); /* 境界/karma/属性达标 → 自动入门（§4.4） */
    /* 体验手感批（数值详设 §4.4 v1.26）：入世/旧档首次结算一次性把已入门功法回填进空槽
     * （静默、无日志）；旗标置位后不再介入，此后仅 gainArt / recheckShelf 对新入门者补槽——
     * 玩家主动移槽不会被每 tick 覆写。 */
    if (!ws.artsAutoInit) { SQ.Arts.autoSlot(ws, pack, D, null); ws.artsAutoInit = true; }
    /* 双修维持检查（引擎卷 §3.8 · v1.4 口径1）：karma 每次重算后校验形态门槛——
     * 阴阳跌破正道档 / 炉鼎回升出魔道档 → 解除（互助不自动解除）；解除写 spouseLog 供视图消费叙事 */
    if (SQ.Bonds && ws.spouse) SQ.Bonds.maintain(ws, pack, D, Date.now());
  }

  /* ── 契约只读视图（module/view 消费）── */
  function modsFor(ws, profile) {
    return SQ.Mods.collect(profile || { talents: [] }, ws, pack, D);
  }
  function rateOf(ws, profile) { return SQ.Idle.rateOf(ws, pack, D, modsFor(ws, profile)); }
  function capOf(ws, profile) { return SQ.Idle.capOf(ws, pack, D, modsFor(ws, profile)); }
  function powerOf(ws, profile) { return SQ.Mods.powerOf(ws, pack, D, modsFor(ws, profile)); }

  /* ── claim 编排（G2 挂机+渡劫循环 → G3 战斗(在线) → G6 补货 → G7 事件 → 重算）── */
  function claim(ws, dtMs, now, profile, settings) {
    var prof = profile || { talents: [] };
    /* C3：时间戳口径统一——一律不显式传 ts，由 SQ.Log.push 单点打戳（与 actions.js 同口径） */
    function log(cat, text) { SQ.Log.push(ws, cat, text); }
    /* autoTrib=false（默认）：修为攒满只到上限、不掷渡劫，等玩家在修行页手动点「渡劫」 */
    var ctx = { log: log, now: now, profile: prof, autoTrib: !!(settings && settings.autoTrib) };

    /* buff 到期清理在 claim 内完成（验收 4.4 #43） */
    ws.buffs = (ws.buffs || []).filter(function (b) { return b.until > now; });

    /* 阵营倾向漂移（主文档 §6.4：biasSign × 12/天，在线离线均计；重算前先累积） */
    SQ.XKarma.accrueDrift(ws, prof, D, dtMs);

    recalcDerived(ws, prof);

    /* G2：产出 + 离线结算 + 突破循环（含渡劫掷判；≥60s 离线写 lastOffline，数值详设 §1.3）。
     * 修行状态（模式）：在线口径乘区在 Idle.settle（qiMult）/ Events.tickOnline（eventMult）；
     * 离线 = 潜心悟道，两处都不触碰（按原有规则结算）。 */
    var idleRes = SQ.Idle.settle(ws, pack, D, dtMs, now, ctx);

    /* G3：战斗只随在线 tick 推进（详设 §2.1 P4 登记），且**只有外出历练才进秘境**——
     * 闭关不产灵石、不出装备、不推进度（需求 §1.1/§2）；历练期角色位于 ws.zone 秘境。 */
    var mods = modsFor(ws, prof);
    if (!idleRes.offline && dtMs > 0 && D.MODES[ws.mode] && D.MODES[ws.mode].combat) {
      SQ.Combat.simulate(ws, pack, D, mods, dtMs / 1000, ctx);
    }

    /* 功法精通（修行状态批 · 需求 §3）：在线 tick 推进，模式乘区闭关易悟 / 历练难悟 */
    if (!idleRes.offline && dtMs > 0) {
      SQ.Arts.tickPractice(ws, pack, D, mods, dtMs / 1000, ctx);
      /* 自行领悟（自悟批 · 需求 §2）：在线推进，闭关易悟、历练难悟 */
      SQ.Arts.tickSelfLearn(ws, pack, D, mods, dtMs / 1000, ctx);
    } else if (idleRes.offline && idleRes.hours > 0) {
      /* 自行领悟 · 离线悟道（自悟保底修复批）：与在线共用同一枚时钟，离线按 OFFLINE_MULT 折扣
       * 推进（不乘模式乘区），单次结算至多 OFFLINE_MAX_ROLLS 个掷点——挂机归来亦可有得。 */
      SQ.Arts.tickSelfLearn(ws, pack, D, mods, idleRes.hours * 3600, ctx, { offline: true });
    }

    /* G6：补货时间戳判定 */
    var mods2 = modsFor(ws, prof);
    SQ.Shop.restockIfDue(ws, pack, D, mods2, now);

    /* G7：奇遇 = 在线玩法（事件池 §三/§四 v1.5：在线时钟分钟段掷判 + 20 分钟硬保底；
     * 离线零奇遇、时钟冻结；pendingChoice 挂起期间时钟暂停） */
    if (!idleRes.offline && dtMs > 0) {
      SQ.Events.tickOnline(ws, pack, D, mods2, dtMs / 1000, now, ctx);
      /* G17：传闻在线刷新（rumorClock 与奇遇时钟同纪律——离线冻结不刷新；
       * pendingChoice 挂起期间照常刷新，传闻是货架不是弹窗） */
      if (SQ.Rumors) SQ.Rumors.tick(ws, pack, D, mods2, dtMs / 1000, now, ctx);
      /* G16 深化：委托刷新/过期 + 冲突开战/终局（在线推进，势力全录卷 §四/§五） */
      SQ.Factions.questTick(ws, pack, D, mods2, now, ctx);
      SQ.Factions.warTick(ws, pack, D, mods2, dtMs / 1000, now, ctx);
    }
    /* G17：过期清扫（在线离线都扫——离线只过期不刷新；回归聚合日志「江湖事过境迁」） */
    if (SQ.Rumors) {
      var goneRumors = SQ.Rumors.sweep(ws, pack, D, now);
      if (goneRumors.length && idleRes.offline) {
        log('sys', SQ.t('rumor.log.expired', { k: goneRumors.length }, 'xiuxian'));
      }
    }
    /* G13 v2.0：隐世福地所有权自动授予（职级/图鉴门控达成即入 owned，福地池卷 §三） */
    SQ.Cave.grantObtain(ws, pack, D, now, ctx);

    /* 炼丹炼器（炼丹卷 §2.4/§3.2）：历练自动采集轴（驻区历练每 1 游戏年入账 1~4 枚本区材料，
     * 非历练/离线不攒不补）+ 灵田材料产出轴（驻留福地灵田每 6 游戏月入账 1~4 枚，
     * 离线不产不补、材料不进任何乘区）+ 功能开通自动授予基础丹方（幂等） */
    if (SQ.Alchemy) {
      SQ.Alchemy.autoGrant(ws, D);
      SQ.Alchemy.gatherTick(ws, pack, D, now, !!idleRes.offline, log);
      SQ.Alchemy.farmTick(ws, pack, D, now, !!idleRes.offline, log);
    }

    /* ── 六向长线批轻量结算（在线离线同入口；全部只改各自派生轴、玩家数值轴零影响，
     * sim-pacing 稳态带零侵入）：同代天骄月度结算（30 现实秒一次，离线 catch-up 一次补算）
     * + 宗门弟子月结算（惰性批量）+ 器灵温养（+3/h 仅在线）+ 悟道闭关累计 ── */
    if (SQ.Prodigy && SQ.Prodigy.tick) SQ.Prodigy.tick(ws, pack, D, mods2, dtMs, now, ctx);
    if (SQ.Sect && SQ.Sect.tick) SQ.Sect.tick(ws, pack, D, mods2, dtMs, now, ctx);
    if (SQ.Fusion) {
      SQ.Fusion.meditateAdd(ws, D, dtMs, !!idleRes.offline);
      SQ.Fusion.tick(ws, pack, D, mods2, dtMs, now, ctx, !!idleRes.offline);
    }

    recalcDerived(ws, prof);
    return idleRes;
  }

  var pack = {
    worldId: 'xiuxian',
    data: D,                               /* 数据表引用（systems 只读 pack.data，不 import 世界模块） */
    lexicon: SQ.LEX.xiuxian,               /* 与词表分卷共享引用（契约 §2.2） */
    roleNameParts: SQ.NAMES.xiuxian,       /* 命名池（lexicon.js 分卷提供） */
    initialState: initialState,
    normalize: normalize,
    claim: claim,
    recalcDerived: recalcDerived,
    rateOf: rateOf,
    capOf: capOf,
    powerOf: powerOf,
    artsMap: function () { return SQ.XARTS; },
    /* G13 洞天福地表（引擎卷 §2.2 数据契约；引擎 systems/cave.js 只读本表） */
    caves: D.CAVES,
    /* G14 道友名录表（引擎卷 §3.2 数据契约；引擎 systems/bonds.js 只读本表） */
    companions: D.COMPANIONS,
    /* G15 法宝（灵宝）全录表（法宝全录 §三；引擎 systems/treasures.js 只读本表，
     * 世界未声明即 undefined → 法宝全入口安全空转，既有行为零变化） */
    treasures: SQ.XTREASURES,
    /* G12 属性定义（契约 §2.2 attributes） */
    attributes: D.ATTRS.map(function (id) {
      return { id: id, nameKey: 'attr.' + id, descKey: 'attr.desc.' + id };
    }),
    /* 特殊词条/特殊属性效果注册表：全部映射到挂点白名单（工程规范 §2.2，15 项） */
    specialHooks: (function () {
      var out = {};
      for (var pid in D.SPECIAL_POOL) out[pid] = { hook: D.SPECIAL_POOL[pid].hook, grades: D.SPECIAL_POOL[pid].grades };
      return out;
    })(),
    /* 专属系统（善恶 + 渡劫）——realm.js 通用编排只调这两个入口 */
    worldSystems: {
      karmaOf: function (ws) { return ws.karma || 0; },
      karmaParts: function (ws) { return SQ.XKarma.partsOf(ws, D); },
      tierOf: function (ws) { return SQ.XKarma.tierOf(ws.karma || 0); },
      rankOf: function (ws) { return SQ.XKarma.rankOf(ws.karma || 0, D); },   /* 善恶名号段位（词表 karma.rank.<id>） */
      alignMultOf: function (ws) { return SQ.XKarma.alignMultOf(ws, D); },
      effectsOf: function (ws) { return SQ.XKarma.effectsOf(ws, D); },   /* ALIGN_EFFECTS 整行（引擎消费入口） */
      tribInfo: function (ws, pk, DD, mods, opts) { return SQ.XTrib.info(ws, pk, DD, mods, opts); },
      tribLoss: function (ws, pk, DD, mods) { return SQ.XTrib.loss(ws, pk, DD, mods); }
    }
  };

  W.pack = pack;
})();
