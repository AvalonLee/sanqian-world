/* assets/worlds/wuxia/index.js — 武侠世界包编排层（S1-a 骨架 · 册154）
 *
 * 契约（工程规范 §2.2）：worldId / data / lexicon / initialState() / normalize(raw) / claim(ws,dt,now,profile,settings)
 *   + 引擎取数口（recalcDerived / rateOf / capOf / powerOf / artsMap）。
 *
 * ⚠️ 本批**只立契约骨架，不接玩法**（`status:'coming'` ⇒ 不可投生 ⇒ 下列入口在生产路径上永不被调用）。
 *   真正填内容的批：S1-b 数值与武学（REALMS/ARTS + 破关 + 产出）· S2 事件池/地界/人物 · S3 干预与墨厄。
 *
 * 三条设计纪律（正典出处见 docs/武侠世界/）：
 *   1. **双时钟**（数值与经济 §二）：`worldDay` 只由叙事推进，**不随现实秒走**——第一世界 `calYear`
 *      那套「1 现实秒 = 1 游戏日」在此**刻意不实现**（照搬会让一章跨四个月、一局跨 120 年）。
 *   2. **数值不上屏**（叙事引擎 §一）：本包的数值只服务两件事——选项生成门槛与附录可查。
 *   3. **`claim` 本批为空**：无挂机产出、无事件触发。空实现不是偷懒，是「不投生就零副作用」的保证。
 *
 * 词表纪律：本文件禁止裸中文字面量（中文只出现在注释里）；文案一律走 `SQ.t(key, vars, 'wuxia')`。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var W = SQ.Worlds.wuxia;
  var D = SQ.WDATA;

  /* ── 常量（与正典数值一一对应；S1-b 起由 data.js 驱动，本处只留骨架期缺省）──────── */
  var INK_CAP_V1 = 2;          /* 卷一墨上限（干预与代价 §二：卷一 2 / 二~四 3 / 五~七 4 / 八~十 5） */
  var PLACE_START = 'luoyang'; /* 开局地界（人物与地方 §四，首发 10 之一） */
  var GEAR_SLOTS = ['weapon', 'ranged', 'armor', 'boots'];  /* 兵器 / 暗器 / 护身 / 鞋履 */

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function num(v, def) { return isNum(v) ? v : def; }
  function clampInt(v, lo, hi, def) {
    if (!isNum(v)) return def;
    var n = Math.round(v);
    return n < lo ? lo : (n > hi ? hi : n);
  }
  function arr(v) { return Object.prototype.toString.call(v) === '[object Array]' ? v.slice() : []; }
  function obj(v) { return v && typeof v === 'object' && !(v instanceof Array) ? v : {}; }
  function str(v, def) { return typeof v === 'string' && v ? v : def; }

  function blankGear() {
    var g = {};
    for (var i = 0; i < GEAR_SLOTS.length; i++) g[GEAR_SLOTS[i]] = null;
    return g;
  }
  function blankInk() { return { n: INK_CAP_V1, carry: 0 }; }
  function blankPersona() { return { xia: 0, kuang: 0, du: 0 }; }
  function blankNarrative() { return { arcId: 'arc1', chapNo: 1, beatNo: 0, cache: [], gapMark: [] }; }
  function blankHeritage() { return { gen: 1, inherited: [] }; }

  /* ── 存档初始值（字段表 = docs/武侠世界/数值与经济.md §九；23 顶层键）──────────────
   * ⚠️ 加字段必须**两处同动**（initialState ⇔ normalize）——审计 D11 判双向键集相等，只改一侧即红。 */
  function initialState() {
    return {
      qi: 0,
      stones: 100,                     /* 开局 100 文：够吃两顿面、住一晚通铺（穷是开局的一部分） */
      realm: 0,
      artsKnown: ['quan_basic', 'neigong_basic'],
      artsLevels: { quan_basic: 1, neigong_basic: 1 },
      artsSlots: [],
      artsPractice: {},
      shelf: [],                       /* 待修习架 = 秘籍物品层（与 artsKnown 分离） */
      sect: null,
      renown: 0,
      discord: 0,                      /* 违和 0~100 */
      ink: blankInk(),
      persona: blankPersona(),
      place: PLACE_START,
      visited: [PLACE_START],
      gear: blankGear(),
      stash: [],
      relations: {},
      injury: 0,                       /* 内伤 0~15；=15 即死（合卷） */
      worldDay: 0,                     /* 叙事时钟（不随现实秒走） */
      exp: 0,                          /* 见闻值 = visited×2 + 熟人，派生落盘只为免重算 */
      debts: [],                       /* 人情债 {who, kind, what, due?}，跨代继承 */
      narrative: blankNarrative(),
      heritage: blankHeritage()
    };
  }

  /* ── 读档清洗（缺字段补齐；非法值回落初始态）────────────────────────────────────
   * 口径：**只补不改语义**——有值的字段一律保留原值（旧档优先），只在缺失/类型坏时回落。 */
  function normalize(raw) {
    var p = obj(raw);
    var ink = obj(p.ink);
    var persona = obj(p.persona);
    var nar = obj(p.narrative);
    var her = obj(p.heritage);
    var gearIn = obj(p.gear);
    var gear = {};
    for (var i = 0; i < GEAR_SLOTS.length; i++) {
      gear[GEAR_SLOTS[i]] = gearIn[GEAR_SLOTS[i]] || null;
    }
    var levels = obj(p.artsLevels);
    var known = arr(p.artsKnown);
    if (!known.length) known = ['quan_basic', 'neigong_basic'];
    if (!Object.keys(levels).length) { levels = {}; for (var k = 0; k < known.length; k++) levels[known[k]] = 1; }

    var sect = null;
    if (p.sect && typeof p.sect === 'object') {
      sect = {
        id: str(p.sect.id, null),
        rank: clampInt(p.sect.rank, 0, 9, 0),
        contribution: num(p.sect.contribution, 0),
        joinedAt: num(p.sect.joinedAt, 0),
        betrayed: p.sect.betrayed === true
      };
      if (!sect.id) sect = null;
    }

    return {
      qi: num(p.qi, 0),
      stones: num(p.stones, 100),
      realm: clampInt(p.realm, 0, 9, 0),
      artsKnown: known,
      artsLevels: levels,
      artsSlots: arr(p.artsSlots).slice(0, 6),
      artsPractice: obj(p.artsPractice),
      shelf: arr(p.shelf),
      sect: sect,
      renown: clampInt(p.renown, -1000, 1000, 0),
      discord: clampInt(p.discord, 0, 100, 0),
      ink: { n: clampInt(ink.n, 0, 5, INK_CAP_V1), carry: ink.carry === 1 ? 1 : 0 },
      persona: {
        xia: clampInt(persona.xia, -100, 100, 0),
        kuang: clampInt(persona.kuang, -100, 100, 0),
        du: clampInt(persona.du, -100, 100, 0)
      },
      place: str(p.place, PLACE_START),
      visited: arr(p.visited).length ? arr(p.visited) : [PLACE_START],
      gear: gear,
      stash: arr(p.stash),
      relations: obj(p.relations),
      injury: clampInt(p.injury, 0, 15, 0),
      worldDay: Math.max(0, num(p.worldDay, 0)),
      exp: Math.max(0, num(p.exp, 0)),
      debts: arr(p.debts),
      narrative: {
        arcId: str(nar.arcId, 'arc1'),
        chapNo: Math.max(1, clampInt(nar.chapNo, 1, 9999, 1)),
        beatNo: Math.max(0, clampInt(nar.beatNo, 0, 99, 0)),
        cache: arr(nar.cache).slice(-3),        /* 主档只留 3 章，超出进侧档（叙事引擎 §三） */
        gapMark: arr(nar.gapMark)
      },
      heritage: { gen: Math.max(1, clampInt(her.gen, 1, 99, 1)), inherited: arr(her.inherited) }
    };
  }

  /* ── 功力产出与封顶（数值与经济 §五 / §三）──────────────────────────────────────
   * 每分钟功力 = 1.0 × (1 + 0.12 × 已学武功总层数) × 模式系数
   *   模式系数：闭关 1.0 / 游历 0.6 —— 本批**只做闭关**（`ws.travel` 字段尚未落档），
   *   游历与见闻值等 S2-b 地界批一起接；留常量 TRAVEL_MULT 备用，不引入未声明字段。
   * 封顶 = **下一档阈值**：心境不满时功力停在下一档门前（正文写「内息已满，只是心里那口气不顺」），
   *   这条让挂机在卡点处主动失效、把玩家推回叙事（§四）。 */
  var BASE_PER_MIN = 1.0;
  var LAYER_MULT = 0.12;
  var TRAVEL_MULT = 0.6;

  function totalLayers(ws) {
    var lv = ws && ws.artsLevels ? ws.artsLevels : {};
    var n = 0;
    for (var k in lv) { var v = lv[k]; if (typeof v === 'number' && isFinite(v)) n += v; }
    return n;
  }
  function maxLayer(ws) { return totalLayers(ws) ? Math.max.apply(null, Object.keys(ws.artsLevels || {}).map(function (k) { return ws.artsLevels[k] || 0; })) : 0; }

  function realmRow(r) {
    var R = (D && D.REALMS) || [];
    for (var i = 0; i < R.length; i++) if (R[i].r === r) return R[i];
    return R[0] || null;
  }

  /* 每小时/每分钟口径统一走 rateOf（返回「功力/分钟」）；claim 内再换算成 dtMs */
  function rateOf(ws) { return BASE_PER_MIN * (1 + LAYER_MULT * totalLayers(ws)); }

  /* 封顶 = 下一档 need；已在顶档则封在自身 need（不再涨） */
  function capOf(ws) {
    var R = (D && D.REALMS) || [];
    var r = ws && isNum(ws.realm) ? ws.realm : 0;
    var nx = realmRow(r + 1);
    if (nx) return nx.need;
    var cur = realmRow(r);
    return cur ? cur.need : 0;
  }

  /* 战力 = 境界基准（武艺/兵刃/相性/状态四乘区 S1-b 只出基准，其余待武学层批） */
  function powerOf(ws) {
    var cur = realmRow(ws && isNum(ws.realm) ? ws.realm : 0);
    return cur ? cur.power : 0;
  }

  /* 见闻值 = visited×2 + 熟人（affinity ≥ 20）——派生，读档时重算一次防旧档漂 */
  function expOf(ws) {
    var visited = (ws.visited || []).length;
    var known = 0;
    var rel = ws.relations || {};
    for (var k in rel) { if (rel[k] && isNum(rel[k].affinity) && rel[k].affinity >= 20) known++; }
    return visited * 2 + known;
  }

  /* 破关：两个必要条件（功力阈值 + 心境门槛），**不掷骰**（数值与经济 §四）
   * 本批只判「见闻值 / 武功层数 / 内伤上限」三类硬门槛；extra 里的关系类与余响类
   * （sect3 / tian_full / bond80 / heritage）留 S3 接——未实现前按「不满足」处理，
   * 即**宁可不破关也不误放行**（半成品的判定宁可保守）。 */
  function gateOf(to) {
    var G = (D && D.GATES) || [];
    for (var i = 0; i < G.length; i++) if (G[i].to === to) return G[i];
    return null;
  }
  function canBreak(ws) {
    var r = ws.realm | 0;
    var nx = realmRow(r + 1);
    if (!nx) return false;                       /* 已到顶档 */
    if (!isNum(ws.qi) || ws.qi < nx.need) return false;
    var g = gateOf(r + 1);
    if (!g) return false;
    if ((ws.exp || 0) < (g.exp || 0)) return false;
    if (g.artsMin && maxLayer(ws) < g.artsMin) return false;
    if (g.injuryMax != null && (ws.injury || 0) > g.injuryMax) return false;
    if (g.extra) return false;                   /* 关系/余响类门槛未接 ⇒ 保守不破 */
    return true;
  }

  /* ── 结算入口 ────────────────────────────────────────────────────────────────
   * claim(ws, dtMs, now, profile, settings)：只推进数值，**不生成正文**（正文由 G18 叙事层出）。
   * 返回 {gain, broke} 供探针/冒烟断言；core 不读返回值（与第一世界同口径，安全）。
   *
   * ⚠️ 本界仍 `status:'coming'` ⇒ 生产路径永不进入；但函数是**真实现**而非空壳，
   *   冒烟 E7 直接构造 ws 调用它验产出与封顶——「不可投生」不等于「逻辑可以假」。 */
  function claim(ws, dtMs, now, profile, settings) {
    void now; void profile; void settings;
    if (!ws || !isNum(dtMs) || dtMs <= 0) return { gain: 0, broke: 0 };
    ws.exp = expOf(ws);
    var before = isNum(ws.qi) ? ws.qi : 0;
    var broke = 0;
    /* 分段推进：填满一档 → 判破关 → 破成功则上限抬高继续填；心境卡住则剩余时间**白费**（封顶的本意）。
     * 一次最多连破两档（离线很久时）；再多说明门槛设计有问题，留给 S3 的定种仿真抓。 */
    var remain = dtMs / 60000;           /* 剩余时间（分钟） */
    while (remain > 0 && broke < 2) {
      var rate = rateOf(ws);             /* 功力/分钟 */
      if (rate <= 0) break;
      var cap = capOf(ws);
      var room = cap - ws.qi;
      var fill = rate * remain;
      if (room > 0 && fill < room) { ws.qi += fill; remain = 0; break; }
      if (room > 0) { ws.qi = cap; remain -= room / rate; } else { remain = 0; }
      if (!canBreak(ws)) break;          /* 功力封顶在门槛前：挂机在此失效（§四） */
      ws.realm = (ws.realm | 0) + 1;
      ws.exp = expOf(ws);
      broke++;
    }
    return { gain: ws.qi - before, broke: broke };
  }

  function recalcDerived(ws) {
    if (!ws) return null;
    ws.exp = expOf(ws);
    return null;
  }

  /* ── 数据表访问口（S1-b）────────────────────────────────────────────────────────
   * 引擎按契约读 `pack.arts` / `pack.realms`；武学 id → 记录的索引也在这里建一次，
   * 供功谱页与叙事层按 id 取品阶/性质（避免每处都遍历 396 条）。
   * ⚠️ 审计 A9 只扫 live 世界，但**表一旦有消费方才谈得上"活"**——这里就是那唯一消费口。 */
  function buildArtIndex() {
    var idx = {};
    var A = (D && D.ARTS) || [];
    for (var i = 0; i < A.length; i++) idx[A[i].i] = A[i];
    return idx;
  }
  var ART_INDEX = buildArtIndex();

  var pack = {
    worldId: 'wuxia',
    data: D,
    lexicon: null,                 /* 词表分卷已注册进 SQ.LEX.wuxia，此处不重复引用（避免两处同键漂） */
    initialState: initialState,
    normalize: normalize,
    claim: claim,
    recalcDerived: recalcDerived,
    rateOf: rateOf,
    capOf: capOf,
    powerOf: powerOf,
    /* 引擎取数口（契约 §2.2 的数据表族；worlds 未声明的键引擎安全空转） */
    realms: (D && D.REALMS) || [],
    gates: (D && D.GATES) || [],
    arts: (D && D.ARTS) || [],
    sects: (D && D.SECTS) || [],
    artsMap: function () { return ART_INDEX; },
    /* 某门可学武学（由 ARTS[].s 反查，单一事实源）；未门无武学返回空数组 */
    artsOfSect: function (sid) {
      var A = (D && D.ARTS) || [];
      var out = [];
      for (var i = 0; i < A.length; i++) if ((A[i].s || []).indexOf(sid) >= 0) out.push(A[i].i);
      return out;
    },
    /* G12 属性：武侠不做「精气神」三维修炼（剑走单轴：功力 + 境界），故声明空表。
     * 引擎遇空表 ⇒ 属性面板整块不渲染，与「世界未声明」同一条回落路径。 */
    attributes: []
    /* 刻意不提供（S1-b 止步于此）：zones（S1-c 地界）· cast（S1-c 人物）· caves（无洞府）·
     * companions（无道友名录）· treasures（无法宝）· worldSystems（无专属系统，S3 接违和/墨厄）。
     * 这些键缺失时引擎一律安全空转——但**投生进本界会立刻抛**，这是刻意的护栏。 */
  };

  W.pack = pack;
})();
