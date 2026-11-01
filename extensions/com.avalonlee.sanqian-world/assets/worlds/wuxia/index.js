/* assets/worlds/wuxia/index.js — 武侠世界包编排层（S1-a 骨架 · 册154；**册214 改造 P1 · 契约改版**）
 *
 * 契约（工程规范 §2.2）：worldId / data / lexicon / initialState() / normalize(raw) / claim(ws,dt,now,profile,settings)
 *   + 引擎取数口（recalcDerived / rateOf / capOf / powerOf / artsMap）。
 *
 * **册214（P1 契约改版）**：书形态退役——`worldView:'book'` 与 `pack.narrative` 整族（chapter/render/
 *   advance/annotate/autoPick/offlineCatchup）摘除；存档摘 `ink`/`discord`/`narrative.*` 三键（normalize
 *   摘键 = 旧档读入即剪、二次 normalize 不复活）；`settings.offlineStory` 闸随离线写书退役。
 *   世界改为常规冒险放置 RPG（正典 = docs/武侠世界/放置RPG改造方案.md）：claim 纯数值推进
 *   （功力产出/封顶/破关/修习练习度），界面走 tab 主壳（view/wuxia-home.js，P1 骨架）。
 *   EVENTS/KNOTS 数据表与词表**原样保留**——它们是 P3 闯荡与 P5 世界事件层的直接原材料（不是废件）。
 *
 * 词表纪律：本文件禁止裸中文字面量（中文只出现在注释里）；文案一律走 `SQ.t(key, vars, 'wuxia')`。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  var W = SQ.Worlds.wuxia;
  var D = SQ.WDATA;

  /* ── 常量 ──────────────────────────────────────────────────────────────────── */
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
  function blankPersona() { return { xia: 0, kuang: 0, du: 0 }; }
  function blankHeritage() { return { gen: 1, inherited: [] }; }

  /* ── 存档初始值（字段表 = docs/武侠世界/数值与经济.md §九；P1 后 20 顶层键）────────────
   * ⚠️ 加字段必须**两处同动**（initialState ⇔ normalize）——审计 D11 判双向键集相等，只改一侧即红。
   * 册214 摘三键：`ink`（墨）/ `discord`（违和）/ `narrative`（书指针）随书形态退役。 */
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
      persona: blankPersona(),
      place: PLACE_START,
      visited: [PLACE_START],
      gear: blankGear(),
      stash: [],
      relations: {},
      injury: 0,                       /* 内伤 0~15；=15 即死（合卷） */
      worldDay: 0,                     /* 游戏内天数 */
      exp: 0,                          /* 见闻值 = visited×2 + 熟人，派生落盘只为免重算 */
      debts: [],                       /* 人情债 {who, kind, what, due?}，跨代继承 */
      /* 通用项（同第一世界口径；数值与经济 §九「通用项同第一世界」的代码化——册214 P1 补齐：
       * tab 主壳下 Log.push / claim 落盘 / 事件史读点都会碰它们，缺了即 `reading '0'` 一族崩） */
      lastSave: 0,
      log: [],
      eventHistory: { lastId: null, seen: {}, feed: [] },
      heritage: blankHeritage()
    };
  }

  /* ── 读档清洗（缺字段补齐；非法值回落初始态）────────────────────────────────────
   * 口径：**只补不改语义**——有值的字段一律保留原值（旧档优先），只在缺失/类型坏时回落。
   * 册214：旧档带 `ink`/`discord`/`narrative` 读入即剪（摘键纪律：二次 normalize 不复活）。 */
  function normalize(raw) {
    var p = obj(raw);
    var persona = obj(p.persona);
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
      lastSave: num(p.lastSave, 0),
      log: arr(p.log),
      eventHistory: (function () {
        var h = obj(p.eventHistory);
        return { lastId: h.lastId != null ? h.lastId : null, seen: obj(h.seen), feed: arr(h.feed) };
      })(),
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

  /* 战力 = 境界基准 × 武艺 × 状态（数值与经济 §六）：武艺 = 1 + Σ(品阶权重×层数)×0.012 封顶 1.35
   * （系统性加成总上限 1.86 < 档差 2.3 的红线不变——满配越一档有戏、跨两档是奇迹）；
   * 状态 = 内伤 ≥12 ×0.60（咯血档）· ≥8 ×0.75 · else 1.00。兵刃/相性两乘区随兵器/四性批接。 */
  var TIER_W = { tian: 1.0, di: 0.6, xuan: 0.3, huang: 0.1 };
  function artPowerMult(ws) {
    var lv = (ws && ws.artsLevels) || {};
    var sum = 0;
    for (var k in lv) {
      var a = ART_INDEX[k];
      if (!a) continue;
      sum += (TIER_W[a.t] || 0.1) * (isNum(lv[k]) ? lv[k] : 0);
    }
    return Math.min(1.35, 1 + sum * 0.012);
  }
  function powerOf(ws) {
    var cur = realmRow(ws && isNum(ws.realm) ? ws.realm : 0);
    if (!cur) return 0;
    var inj = (ws && ws.injury) || 0;
    var status = inj >= 12 ? 0.6 : inj >= 8 ? 0.75 : 1;
    return cur.power * artPowerMult(ws) * status;
  }

  /* 见闻值 = visited×2 + 熟人（affinity ≥ 20）——派生，读档时重算一次防旧档漂 */
  function expOf(ws) {
    var visited = (ws.visited || []).length;
    var known = 0;
    var rel = ws.relations || {};
    for (var k in rel) { if (rel[k] && isNum(rel[k].affinity) && rel[k].affinity >= 20) known++; }
    return visited * 2 + known;
  }

  /* ── 修习常量（册162 · 武学全录 §五「自悟」最小闭环 + §五 瓶颈）────────────────── */
  var PRACTICE_PER_LAYER = 100;   /* 每 30 现实分钟升一层（挂机时长即练功时长，离线 = 在线） */
  var SLOTS_MAX = 6;              /* 修习槽上限（复用第一世界口径） */
  var GATE_LAYERS = { 3: 4, 6: 12, 9: 24 };   /* 心境门槛层：3/6/9 层需见闻值（§四 心境表的内插） */

  /* 强行冲关（数值与经济 §四 唯一失败路径）：心境差得远却硬破——附录手动点，正文不给选项。
   * 成功率 p = 0.5 × (见闻/门槛)，失败内伤 +2~4、功力 −20%、当前卷关键关系恶化（关系面未建，留批注）。
   * 掷判用 Math.random：玩家主动操作不属章号散列的确定性面（与第一世界渡劫同口径）。 */
  function attemptBreak(ws) {
    if (!ws) return { ok: false, reason: 'nows' };
    var r = ws.realm | 0;
    var nx = realmRow(r + 1);
    if (!nx || !isNum(ws.qi) || ws.qi < nx.need) return { ok: false, reason: 'qi' };
    var g = gateOf(r + 1);
    if (!g) return { ok: false, reason: 'gate' };
    var p = 0.5 * Math.min(1, (expOf(ws) || 0) / (g.exp || 1));
    var win = Math.random() < p;
    if (!win) {
      ws.injury = Math.min(15, (ws.injury || 0) + 2 + Math.floor(Math.random() * 3));
      ws.qi = Math.max(0, ws.qi * 0.8);
      return { ok: true, win: false, p: p, injury: ws.injury };
    }
    ws.realm = r + 1;
    ws.exp = expOf(ws);
    return { ok: true, win: true, p: p };
  }

  /* 破关：两个必要条件（功力阈值 + 心境门槛），**不掷骰**（数值与经济 §四）
   * 心境门槛三类硬项（见闻 / 武功层数 / 内伤）+ 附加门槛 extra（S3-a 起接真谓词）：
   *   neigong = 一部内功 ≥ artsMin 层（该行 artsMin 按**内功类**计， quan_basic 册160 勘误后不再冒充内功）；
   *   sect3 = 非同门 relations（affinity ≥ 20）≥ 3 人——散人与外家门派都算「江湖往来」；
   *   tian_full = 任一部天阶武学满层（9 层）；bond80 = 刻骨关系（friend/enemy 且 affinity ≥ 80）；
   *   heritage = 余响类，单局不可达（余响系统未建 ⇒ 永远保守不破）。 */
  function gateOf(to) {
    var G = (D && D.GATES) || [];
    for (var i = 0; i < G.length; i++) if (G[i].to === to) return G[i];
    return null;
  }
  function maxLayerIn(ws, cls) {
    var lv = (ws && ws.artsLevels) || {};
    var best = 0;
    for (var k in lv) {
      var a = ART_INDEX[k];
      if (!a || (cls && a.k !== cls)) continue;
      var v = lv[k];
      if (isNum(v) && v > best) best = v;
    }
    return best;
  }
  function hasTianFull(ws) {
    var lv = (ws && ws.artsLevels) || {};
    for (var k in lv) {
      var a = ART_INDEX[k];
      if (a && a.t === 'tian' && isNum(lv[k]) && lv[k] >= 9) return true;
    }
    return false;
  }
  function hasBond80(ws) {
    var rel = (ws && ws.relations) || {};
    for (var k in rel) {
      var r = rel[k];
      if (r && (r.kind === 'friend' || r.kind === 'enemy') && isNum(r.affinity) && r.affinity >= 80) return true;
    }
    return false;
  }
  /* 非同门往来计数：affinity ≥ 20 的人物里，门派与主角现门派不同（或散人）的人数 */
  function countOuterTies(ws) {
    var rel = (ws && ws.relations) || {};
    var mySect = ws && ws.sect && ws.sect.id ? ws.sect.id : null;
    var n = 0;
    for (var k in rel) {
      var r = rel[k];
      if (!r || !isNum(r.affinity) || r.affinity < 20) continue;
      var c = CAST_INDEX[k];
      if (c && c.sec && c.sec === mySect) continue;
      n++;
    }
    return n;
  }
  function canBreak(ws) {
    var r = ws.realm | 0;
    var nx = realmRow(r + 1);
    if (!nx) return false;                       /* 已到顶档 */
    if (!isNum(ws.qi) || ws.qi < nx.need) return false;
    var g = gateOf(r + 1);
    if (!g) return false;
    if ((ws.exp || 0) < (g.exp || 0)) return false;
    var needLayer = g.artsMin ? (g.extra === 'neigong' ? maxLayerIn(ws, 'neigong') : maxLayer(ws)) : 0;
    if (g.artsMin && needLayer < g.artsMin) return false;
    if (g.injuryMax != null && (ws.injury || 0) > g.injuryMax) return false;
    if (g.extra === 'sect3' && countOuterTies(ws) < 3) return false;
    if (g.extra === 'tian_full' && !hasTianFull(ws)) return false;
    if (g.extra === 'bond80' && !hasBond80(ws)) return false;
    if (g.extra === 'heritage') return false;    /* 余响类：单局不可达（保守不破） */
    return true;
  }

  /* ── 结算入口 ────────────────────────────────────────────────────────────────
   * claim(ws, dtMs, now, profile, settings)：只推进数值（功力产出/封顶/破关/修习练习度）。
   * 返回 {gain, broke, layers} 供探针/冒烟断言；core 不读返回值（与第一世界同口径，安全）。
   * 册214：offlineStory 闸随离线写书退役——离线结算与在线同一份纯数值链。 */
  function claim(ws, dtMs, now, profile, settings) {
    void now; void profile; void settings;
    if (!ws || !isNum(dtMs) || dtMs <= 0) return { gain: 0, broke: 0, layers: 0 };
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
    /* 修习槽练习度推进（册162 · 与功力同一份 claim 时长）：满 PRACTICE_PER_LAYER 升一层并清零；
     * 3/6/9 是心境门槛层——见闻不足则卡层（练习度停在门槛下，正文回声已有）。
     * 确定性：纯加法不掷随机（仿真/锚不受影响）。 */
    var layered = 0;
    var slots = arr(ws.artsSlots).slice(0, SLOTS_MAX);
    var prac = obj(ws.artsPractice);
    for (var si = 0; si < slots.length; si++) {
      var aid = typeof slots[si] === 'string' ? slots[si] : (slots[si] && slots[si].id);
      if (!aid || !ART_INDEX[aid]) continue;
      var curLv = (ws.artsLevels[aid] || 0);
      if (curLv >= 9) continue;
      var gateExp = GATE_LAYERS[curLv + 1];
      var pv = (isNum(prac[aid]) ? prac[aid] : 0) + (dtMs / 60000) * (PRACTICE_PER_LAYER / 30);
      if (gateExp && (ws.exp || 0) < gateExp && pv > PRACTICE_PER_LAYER - 1) pv = PRACTICE_PER_LAYER - 1;   /* 卡层 */
      while (pv >= PRACTICE_PER_LAYER && (ws.artsLevels[aid] || 0) < 9) {
        var nxt = (ws.artsLevels[aid] || 0) + 1;
        var g2 = GATE_LAYERS[nxt];
        if (g2 && (ws.exp || 0) < g2) break;      /* 心境不满：练习度继续涨但层不动（下一轮卡在 99） */
        ws.artsLevels[aid] = nxt;
        pv -= PRACTICE_PER_LAYER;
        layered++;
      }
      prac[aid] = Math.min(pv, PRACTICE_PER_LAYER - 1);
    }
    ws.artsPractice = prac;
    return { gain: ws.qi - before, broke: broke, layers: layered };
  }

  function recalcDerived(ws) {
    if (!ws) return null;
    ws.exp = expOf(ws);
    return null;
  }

  /* ── 数据表访问口（S1-b）────────────────────────────────────────────────────────
   * 引擎按契约读 `pack.arts` / `pack.realms`；武学 id → 记录的索引也在这里建一次，
   * 供功谱页与世界事件层按 id 取品阶/性质（避免每处都遍历 403 条）。 */
  function buildArtIndex() {
    var idx = {};
    var A = (D && D.ARTS) || [];
    for (var i = 0; i < A.length; i++) idx[A[i].i] = A[i];
    return idx;
  }
  var ART_INDEX = buildArtIndex();
  /* 人物索引（id → 行）：破关 sect3 谓词按人物 sec 判「同门/外家」，取人层同用 */
  function buildCastIndex() {
    var idx = {};
    var C = (D && D.CAST) || [];
    for (var i = 0; i < C.length; i++) idx[C[i].i] = C[i];
    return idx;
  }
  var CAST_INDEX = buildCastIndex();

  var pack = {
    worldId: 'wuxia',
    data: D,
    /* 册214（P1）：`worldView:'book'` 与 `pack.narrative` 整族已随书形态退役。
     * 主界面形态改走 **`shell` 可选契约**：pack 声明 `shell:'wuxiaHome'` ⇒ 进主界面挂
     * `SQ.UI.wuxiaHome` 渲染的自定义主壳（view/wuxia-home.js），九页 tab 不进本世界；
     * 不声明 = 默认 tab 形态（xiuxian 零改动）。与旧 worldView 的差别：只指**件名**不指形态，
     * 核内零世界 id 点名（D12 封闭性）。 */
    shell: 'wuxiaHome',
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
    cast: (D && D.CAST) || [],
    zones: (D && D.ZONES) || [],
    manuals: (D && D.MANUALS) || [],
    events: (D && D.EVENTS) || [],
    knots: (D && D.KNOTS) || [],
    artsMap: function () { return ART_INDEX; },
    attemptBreak: attemptBreak,
    canBreak: canBreak,
    /* worldSystems（册162 · S3-c）：引擎通用系统的世界侧接口——通用层只经这些口读世界语义（D3 纪律），
     * 每个口按「引擎会怎么调」实现；引擎调用点全部带空值守卫，缺口 = 安全空转（多世界契约）。 */
    worldSystems: {
      /* 生命判势（core.claimInner）：内伤满 15 = 伤重不治（对位道伤崩碎通道）；寿元上界按境界表
       * （江湖设定 §五：寿元只做两处结算——老病寿尽 / 内伤即死，不做倒计时）。age = 16 岁开局 + worldDay/360。 */
      lifeInfo: function (ws) {
        var r = Math.min(ws && isNum(ws.realm) ? ws.realm : 0, 9);
        var row = realmRow(r);
        var age = 16 + Math.floor((ws && ws.worldDay || 0) / 360);
        var cap = row ? row.life : 40;
        var inj = (ws && ws.injury) || 0;
        var cause = null;
        if (inj >= 15) cause = 'daoshang';
        else if (age >= cap) cause = 'shoujin';
        return { age: age, max: cap, left: cap - age, cause: cause, dao: inj, daoLv: inj, daoMax: 15, daoNear: inj >= 12 };
      },
      /* 内伤唯一写口（combat/events 的 lifeHit(ws, 'wound')）：+1 层，封顶 15（=15 由 lifeInfo 判死） */
      lifeHit: function (ws, kind, log) {
        void log;
        if (kind !== 'wound' || !ws) return 0;
        if ((ws.injury || 0) >= 15) return ws.injury;
        ws.injury = Math.min(15, (ws.injury || 0) + 1);
        return ws.injury;
      },
      /* 寿元增减：本世界寿元不做倒计时（数值与经济 §二），通用层的得寿/折寿在此不落账 */
      lifeAdd: function (ws) { void ws; return 0; },
      /* 掉落乘区（combat 的 eff.*）：武侠无法宝掉落面，恒空 = 引擎守卫回落 */
      effectsOf: function (ws) { void ws; return null; },
      /* 功法业力加成（arts.js）：武侠无善恶业力，恒 0 */
      karmaOf: function (ws) { void ws; return 0; },
      /* 江湖评价档（bonds/codex/events）：侠轴 ≤ −60 = 「邪」——枭雄路线的江湖脸色 */
      tierOf: function (ws) {
        return ws && ws.persona && isNum(ws.persona.xia) && ws.persona.xia <= -60 ? 'evil' : 'neutral';
      },
      /* 渡劫/飞升（legacy.feishengInfo）：武侠无飞升，恒 null ⇒ canFeisheng 落 reason:'info' 拒绝 */
      tribInfo: function () { return null; }
    },
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
