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

  /* ── 结算入口（S1-a 空实现）────────────────────────────────────────────────────
   * 签名照契约：claim(ws, dt, now, profile, settings)。本批**不产出、不触发、不写档**。
   *
   * 为什么空：`status:'coming'` ⇒ 创角屏不可选 ⇒ 不会有 `profile.worldId === 'wuxia'` 的存档 ⇒
   *   core 的 tick 路径永不会进到这里。留空实现 = 万一将来误投生，也只是「不推进」而**不崩、不污染**。
   * S1-b 起在此编排：功力累积（修炼时钟）、破关判定（功力 + 心境双条件）、内伤恢复、章节推进。
   */
  function claim(ws, dt, now, profile, settings) {
    void ws; void dt; void now; void profile; void settings;
    return null;
  }

  /* ── 引擎取数口（骨架期一律安全零值；S1-b 起接真实公式）──────────────────────── */
  function recalcDerived(ws) { void ws; return null; }
  function rateOf(ws) { void ws; return 0; }
  function capOf(ws) { void ws; return 0; }
  function powerOf(ws) { void ws; return 0; }

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
    artsMap: function () { return {}; },
    /* G12 属性：武侠不做「精气神」三维修炼（剑走单轴：功力 + 境界），故声明空表。
     * 引擎遇空表 ⇒ 属性面板整块不渲染，与「世界未声明」同一条回落路径。 */
    attributes: []
    /* 刻意不提供（S1-a）：realms/zones/arts/events/talents 数据表（data 里是空架子）·
     * caves（武侠无洞府）· companions（无道友名录）· treasures（无法宝）· worldSystems（无专属系统）。
     * 这些键缺失时引擎一律安全空转——但**投生进本界会立刻抛**，这是刻意的护栏，不是缺口。 */
  };

  W.pack = pack;
})();
