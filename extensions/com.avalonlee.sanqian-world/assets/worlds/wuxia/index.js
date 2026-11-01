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
        gapMark: arr(nar.gapMark),
        digest: (function () {
          var dg = nar.digest;
          if (!dg || typeof dg !== 'object') return null;   /* 离线提要（册165）：至多 8 行 + 折叠计数，主档容量红线同 cache */
          var ls = arr(dg.lines).filter(function (x) { return typeof x === 'string'; }).slice(-8);
          if (!ls.length && !num(dg.dropped, 0)) return null;
          return { lines: ls, dropped: Math.max(0, Math.round(num(dg.dropped, 0))) };
        })(),
        arcArts: (function () {                 /* 卷首武学快照（册161）：形状完好才保留，坏档回落 null 由 advance 惰性补 */
          var aa = nar.arcArts;
          if (!aa || typeof aa !== 'object' || !arr(aa.artsKnown).length) return null;
          var lv = obj(aa.artsLevels), lv2 = {};
          for (var k in lv) lv2[k] = lv[k];
          return { arcNo: clampInt(aa.arcNo, 1, 10, 1), artsKnown: arr(aa.artsKnown), artsLevels: lv2, artsSlots: arr(aa.artsSlots) };
        })()
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
   * claim(ws, dtMs, now, profile, settings)：只推进数值，**不生成正文**（正文由 G18 叙事层出）。
   * 返回 {gain, broke} 供探针/冒烟断言；core 不读返回值（与第一世界同口径，安全）。
   *
   * ⚠️ 本界仍 `status:'coming'` ⇒ 生产路径永不进入；但函数是**真实现**而非空壳，
   *   冒烟 E7 直接构造 ws 调用它验产出与封顶——「不可投生」不等于「逻辑可以假」。 */
  function claim(ws, dtMs, now, profile, settings) {
    void now; void profile;
    if (!ws || !isNum(dtMs) || dtMs <= 0) return { gain: 0, broke: 0 };
    /* 离线提要闸（册165 · 叙事引擎 §八）：settings.offlineStory === true 才推进离线章——
     * core normalize 缺省开（生产真机路径），直调测试传 {} ⇒ 关，E8/E12/E14/sim 的定值断言不受扰动。 */
    if (settings && settings.offlineStory === true && dtMs >= OFFLINE_CHAPTER_MS) {
      offlineCatchup(ws, dtMs, null);
    }
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

  /* ── 正文渲染（S1-d · 数值→文学三条规则的落点）────────────────────────────────
   * render(chapterResult, ws) → { lines:[中文…], fork }
   * 纯函数：模板选择用 chapterResult.meta.seed；**不调 Math.random**；不写档。
   *
   * 三条硬规则（数值与经济 §九）在这里兑现：
   * ① 够不着的门槛不显示数字，只给「回声」（pool.echo.*，如「总觉得还差着一重火候」）；
   * ② 每章至多一个 ※（chapter 已保证，render 不追加）；
   * ③ 门槛须可推断 → think 节必带 {p1} 功力措辞（五档：已满/只差一口气/过半/三成/初起）。 */
  function tw(key) { return SQ.t(key, null, 'wuxia'); }

  function progWord(ws) {
    var r = ws.realm | 0;
    var nx = realmRow(r + 1);
    if (!nx) return tw('pool.prog.100');
    var ratio = isNum(ws.qi) ? ws.qi / nx.need : 0;
    var k = ratio >= 1 ? 100 : ratio >= 0.75 ? 75 : ratio >= 0.5 ? 50 : ratio >= 0.25 ? 25 : 0;
    return tw('pool.prog.' + k);
  }
  function moodWord(ws) {
    var dis = ws.discord || 0;
    if (dis >= 100) return tw('pool.mood.discord2');
    if (dis >= 60) return tw('pool.mood.discord');
    if ((ws.injury || 0) > 0) return tw('pool.mood.hurt');
    return tw('pool.mood.calm');
  }
  /* {who} 取人：本地界桥段的在场人物优先（读者已认知），否则用通称「那人」——绝不凭空造名 */
  function whoWord(ws, seed) {
    var ks = knotsAt(ws.place);
    var pool = [];
    for (var i = 0; i < ks.length; i++) {
      var cl = ks[i].cast || [];
      for (var j = 0; j < cl.length; j++) pool.push(cl[j]);
    }
    if (!pool.length) return tw('pool.who.fallback');
    var id = pool[seed % pool.length];
    var name = tw('cast.' + id + '.name');
    return (!name || name.indexOf('cast.') === 0) ? tw('pool.who.fallback') : name;
  }

  var TPL_N = { scene: 8, action: 12, talk: 10, event: 8, gain: 6, think: 6, cliff: 6, fork: 4 };

  function renderBeat(beat, ws, seed) {
    var n = TPL_N[beat.type] || 1;
    var key = 'tpl.' + beat.type + '.' + (((seed + (beat.no || 1) * 17) % n) + 1);
    var vars = {
      zone: tw('zone.' + (ws.place || PLACE_START) + '.name'),
      scene: (beat.type === 'scene') ? tw(beat.ref) : '',
      who: whoWord(ws, seed + (beat.no || 1) * 7),
      p1: progWord(ws),
      mood: moodWord(ws)
    };
    var txt = SQ.t(key, vars, 'wuxia');
    if (txt === key || !txt) return null;    /* 缺模板 = 裸键，宁可少一句也不把键名印在纸上 */
    if (beat.type === 'think') {
      /* 规则①：门槛差得多时追加回声（不显示数字） */
      var r = ws.realm | 0, nx = realmRow(r + 1);
      if (nx && isNum(ws.qi) && ws.qi < nx.need * 0.75) {
        var echoKey = (ws.relations && Object.keys(ws.relations).length >= 3) ? 'pool.echo.bond' : 'pool.echo.realm';
        txt += tw(echoKey);
      }
    }
    return txt;
  }

  function render(ch, ws) {
    if (!ch || !ch.beats || !ch.beats.length) return { lines: [], fork: null };
    var seed = (ch.meta && isNum(ch.meta.seed)) ? ch.meta.seed : 1;
    var lines = [];
    for (var i = 0; i < ch.beats.length; i++) {
      var line = renderBeat(ch.beats[i], ws, seed);
      if (line) lines.push(line);
    }
    /* 心境是状态不是随机文案：非平静（违和/内伤）时**稳定追加**章尾心境句——
     * 不靠模板命中（初稿只挂 think.1 的 {mood}，散列下未必选中，E11 抓到）。
     * 平静态不加：免得每章都念一遍「心无挂碍」。 */
    var mood = moodWord(ws);
    if (mood !== tw('pool.mood.calm')) lines.push(mood);
    return { lines: lines, fork: ch.fork || null };
  }

  /* ── 数据表访问口（S1-b）────────────────────────────────────────────────────────
   * 引擎按契约读 `pack.arts` / `pack.realms`；武学 id → 记录的索引也在这里建一次，
   * 供功谱页与叙事层按 id 取品阶/性质（避免每处都遍历 396 条）。
   * ⚠️ 审计 A9 只扫 live 世界，但**表一旦有消费方才谈得上"活"**——这里就是那唯一消费口。 */
  /* ── G18 叙事编排层（可选契约的第一份实现 · 册157 S2-a）─────────────────────────
   * 契约（工程规范 §2.2）：`chapter(ws, pack, ctx) → { beats, fork, meta }`，**纯函数**——
   *   同一 ws + 同一章号 ⇒ 同一章（用章号做确定性「伪随机」，绝不调用 Math.random）。
   *   件内**不挂定时器**：打字机与翻页属 view 层。
   *
   * 本节只做**骨架**：按章号 + 当前地界从 EVENTS 取节，按固定章骨架排布，遇到条件满足的
   *   KNOTS 就在章末置一个分岔（2~3 支，带数值门槛）。**不生成正文**（正文是 S1-d 的事）。
   *
   * 章骨架（叙事引擎 §五）：scene → [action|talk]×2~3 → [event|gain]? → fork? → cliff
   * 分岔规则（§七）：每章 ≤1 个 ※；**必须含一个保守项**（退/忍/不动）⇒ 任何数值下都有得选。
   */
  var CHAPTER_BEATS = 5;   /* 4~6 节的中位；首 scene 末 cliff 固定 */

  function seedOf(n) {            /* 确定性散列：章号 → 32 位整数 */
    var x = (n * 2654435761) >>> 0;
    x ^= x >>> 15; x = (x * 2246822519) >>> 0;
    return x >>> 0;
  }
  function pick(list, seed, salt) {
    if (!list || !list.length) return null;
    return list[(seed + salt * 131) % list.length];
  }

  function eventsAt(place) {
    var all = (D && D.EVENTS) || [];
    var hit = [];
    for (var i = 0; i < all.length; i++) if (all[i].z === place) hit.push(all[i]);
    return hit;
  }
  function knotsAt(place) {
    var all = (D && D.KNOTS) || [];
    var hit = [];
    for (var i = 0; i < all.length; i++) if (all[i].z === place) hit.push(all[i]);
    return hit;
  }
  /* 门槛判定：need 里的每一项都要过（realm / artsMin / silver）——这是「养决定有没有得选」的落点 */
  function meetNeed(ws, need) {
    if (!need) return true;
    if (need.realm != null && (ws.realm | 0) < need.realm) return false;
    if (need.silver != null && (ws.stones || 0) < need.silver) return false;
    if (need.artsMin != null && maxLayer(ws) < need.artsMin) return false;
    return true;
  }
  /* 分支可用性：桥段整体进了（meetNeed 过），但**支上还可能各有门槛** */
  function branchOpen(ws, br) { return meetNeed(ws, br && br.req); }

  function chapter(ws, pk, ctx) {
    void pk; void ctx;
    var nar = (ws && ws.narrative) || {};
    var no = nar.chapNo || 1;
    var place = ws.place || PLACE_START;
    var seed = seedOf(no * 97 + place.length);
    var evs = eventsAt(place);
    var zrow = null, scenesLen = 1;
    var ZL = (D && D.ZONES) || [];
    for (var zi = 0; zi < ZL.length; zi++) if (ZL[zi].i === place) { zrow = ZL[zi]; scenesLen = Math.max(1, (zrow.scenes || [1]).length); break; }
    var beats = [];
    /* scene 节：场景按章号散列从本地界的 2~4 个子场景里挑（不是永远第一个） */
    beats.push({ type: 'scene', ref: 'scene.' + place + '.' + ((seed % scenesLen) + 1), no: 1 });

    /* 中段：从本地界事件池取 3 节（类型照事件的 kind），一个章内不重复 */
    var used = {};
    for (var i = 0; i < 3; i++) {
      var ev = pick(evs, seed, i + 1);
      var guard = 0;
      while (ev && used[ev.i] && guard++ < evs.length) ev = pick(evs, seed + guard, i + 7);
      if (!ev) continue;
      used[ev.i] = 1;
      beats.push({ type: ev.kind === 'scene' ? 'talk' : ev.kind, ref: 'event.' + ev.i + '.name', no: beats.length + 1 });
    }
    /* 收尾前后各一节：所得/心念 + 悬念 */
    beats.push({ type: 'think', ref: 'think.self.' + ((seed % 3) + 1), no: beats.length + 1 });
    beats.push({ type: 'cliff', ref: 'cliff.' + place, no: beats.length + 1 });

    /* 分岔：本章若有**条件满足的桥段**，取其可用分支置一个 ※（最多一个）
     * 档位（册161 · 干预与代价 §五）：**`watch`（旁观/不动）= 0 墨**——那是主角自己的选择，
     * 没有落笔；其余支 = 「改」**3 墨**（指定本分岔走哪支，违和 +5 由 advance 账目扣）。
     * 注意按**分支语义**判免费（watch 在 KNOTS 里位置不固定，knot_lvzhu 首支就是 probe）。
     * 行为类分支带性格轴微调（help=侠 / defy=狂放 / join=结义，±4 落在「批注 ±2~5」与
     * 「重大剧情 ±10~20」之间的中间档）。 */
    var fork = null;
    var ks = knotsAt(place);
    var AXIS_BY_K = { help: { xia: 4 }, defy: { kuang: 4 }, join: { du: 4 } };
    for (var k = 0; k < ks.length && !fork; k++) {
      var kn = ks[k];
      if (!meetNeed(ws, kn.need)) continue;
      var opts = [];
      for (var b = 0; b < kn.br.length; b++) {
        if (!branchOpen(ws, kn.br[b])) continue;      /* 够不着的分支不生成（不是灰掉） */
        opts.push({ k: kn.br[b].k, label: kn.br[b].label, ink: (kn.br[b].k === 'watch' ? 0 : 3), axis: AXIS_BY_K[kn.br[b].k] || null });
      }
      /* 保守项兜底：桥段整体可进但支全被门槛挡掉时，也要留「旁观」这一支 */
      if (!opts.length) opts.push({ k: 'watch', label: 'knot.' + kn.i + '.watch', ink: 0, axis: null });
      fork = { knot: kn.i, title: 'knot.' + kn.i + '.name', act: kn.act, opts: opts };
    }
    /* 章节点数夹到 4~6（骨架固定，超出削中段） */
    if (beats.length > CHAPTER_BEATS + 1) beats = beats.slice(0, CHAPTER_BEATS + 1);
    return { beats: beats, fork: fork, meta: { chapNo: no, place: place, seed: seed } };
  }

  /* ── 章推进 advance(ws, opt, ctx)（S3-a · 册160）──────────────────────────────
   * 翻过一章的**数值面**——正文由 chapter()/render() 出，本函数只管账：
   *   ① 落笔（opt 非 null 且 opt.ink > 0）：扣墨；违和按成本入账（批 1 墨 +1 ｜ 改 3 墨 +5 ｜
   *      删 8 墨 +20——本批只有 1/3 两档成本，8 档随 S3-b「删」解锁）。墨不够 = 落不了笔，
   *      返回 { err:'ink' }，**不改任何状态**（事务性：要么整笔落要么不动）。
   *   ② 叙事时钟：worldDay +1~3 日（章号确定性散列，不调 Math.random）。
   *   ③ 违和自然消退 −1（每完结一章，干预与代价 §三；零干预路线因此恒 0）。
   *   ④ 卷末事务（完结章号整除卷长）：卷间跳跃 +540~1080 日（约 1.5~3 年，幕数散列）、
   *      墨回满（上限按卷 2/3/3/3/4/4/4/5/5/5，结转 ≤1 与里程碑 +2 都夹在上限内）。
   *   ⑤ 卡点窗口投放（数值与经济 §五「事件不需要多，只需出现在卡点上」）：卷内完结第 7/17 章
   *      各投放一笔事件功力，金额 = 卷预算（ARC_GAIN）对半拆；**受封顶约束**——心境不满时
   *      功力停在下一档阈值，事件也越不过心境（与挂机同一条封顶）。
   * 纯函数纪律同 chapter()：不调 Math.random、不读实时钟、只写传入 ws。
   * 返回读数 { chapNo, arcNo, gain, day, discord, ink } 供仿真/冒烟断言。 */
  var ARC_CHAPS = 20;   /* 卷长：定种口径 = 10 卷 × 20 章（数值与经济 §十；18~24 的中位） */
  /* 违和按落笔成本入账（干预与代价 §三：批 +1 / 改 +5 / 删 +20——删的成本册161 勘正 8→4，
   * 8 与墨上限表矛盾（卷五~八上限 4/5）永不买得起；8 保留映射为兼容旧读法。 */
  var DISCORD_BY_INK = { 1: 1, 3: 5, 4: 20, 8: 20 };

  function arcOf(chapNo) { return Math.min(10, Math.floor(((chapNo || 1) - 1) / ARC_CHAPS) + 1); }
  /* 墨上限按卷解锁（干预与代价 §二：卷一 2 / 二~四 3 / 五~七 4 / 八~十 5，度量感情不按等级） */
  function inkCapOf(arc) { return arc <= 1 ? 2 : arc <= 4 ? 3 : arc <= 7 ? 4 : 5; }

  /* 卷首武学快照：墨厄「失去本卷已得武学」的回退点（册161）。挂在 narrative 内层——
   * D11 只对账顶层键集，叙事内件不占顶层账；normalize 照常保留。 */
  function snapArts(ws, arc) {
    var lv = obj(ws.artsLevels), lv2 = {};
    for (var k in lv) lv2[k] = lv[k];
    return { arcNo: arc, artsKnown: arr(ws.artsKnown), artsLevels: lv2, artsSlots: arr(ws.artsSlots) };
  }
  /* 墨厄重罚（干预与代价 §三 ≥100）：本卷重写（章号退回卷首）· 本卷所得武学散尽（回到卷首快照）
   * · 性格三轴回弹 30%（×0.7 取整）· 违和清零（重写 = 本卷落笔一并作废）。
   * 叙事时钟不回拨——世界照常走，重写的是「这一卷怎么写」不是「日子倒流」。 */
  function moeRewind(ws) {
    var cur = (ws.narrative && ws.narrative.chapNo) || 1;
    var volStart = Math.floor((cur - 1) / ARC_CHAPS) * ARC_CHAPS + 1;
    var snap = ws.narrative && ws.narrative.arcArts;
    if (snap && snap.artsKnown) {
      ws.artsKnown = arr(snap.artsKnown);
      var lv = obj(snap.artsLevels), lv2 = {};
      for (var k in lv) lv2[k] = lv[k];
      ws.artsLevels = lv2;
      ws.artsSlots = arr(snap.artsSlots);
    }
    var p = ws.persona || (ws.persona = { xia: 0, kuang: 0, du: 0 });
    p.xia = Math.round((p.xia || 0) * 0.7);
    p.kuang = Math.round((p.kuang || 0) * 0.7);
    p.du = Math.round((p.du || 0) * 0.7);
    ws.discord = 0;
    ws.narrative.chapNo = volStart;
    ws.narrative.beatNo = 0;
    ws.ink = { n: inkCapOf(arcOf(volStart)), carry: 0 };
    return volStart;
  }

  function advance(ws, opt, ctx) {
    void ctx;
    if (!ws || !ws.narrative) return { err: 'nows' };
    var nar = ws.narrative;
    if (!nar.arcArts) nar.arcArts = snapArts(ws, arcOf(nar.chapNo || 1));   /* 惰性卷首快照（旧档缺省） */
    var cur = nar.chapNo || 1;
    if (cur > ARC_CHAPS * 10) return { ended: 1, chapNo: cur };   /* 十卷完 ⇒ 合卷（合卷去向 S2 末尾批） */
    /* ① 落笔：墨不够整笔回绝，够则一次扣清并入账违和与性格轴 */
    var cost = (opt && isNum(opt.ink) && opt.ink > 0) ? opt.ink : 0;
    if (cost > 0) {
      var ink = ws.ink || { n: 0, carry: 0 };
      if (!isNum(ink.n) || ink.n < cost) return { err: 'ink', need: cost, have: ink.n || 0 };
      ink.n -= cost;
      if (opt.axis && typeof opt.axis === 'object') {
        var p0 = ws.persona || (ws.persona = { xia: 0, kuang: 0, du: 0 });
        for (var ak in opt.axis) {
          if (ak === 'xia' || ak === 'kuang' || ak === 'du') {
            p0[ak] = clampInt((p0[ak] || 0) + (opt.axis[ak] || 0), -100, 100, p0[ak] || 0);
          }
        }
      }
      var dis = DISCORD_BY_INK[cost] || cost;
      ws.discord = clampInt((ws.discord || 0) + dis, 0, 100, ws.discord || 0);
      if (ws.discord >= 100) {           /* 墨厄（干预与代价 §三 ≥100）：本章完结前落笔即成，重罚立刻生效 */
        moeRewind(ws);
        return { mo: 1, chapNo: ws.narrative.chapNo, discord: 0 };
      }
    }
    /* ② 叙事时钟：章内 0.5~3 日（正文一屏一日的体感），章号散列定日 */
    var day = 1 + (seedOf(cur) % 3);
    ws.worldDay = Math.max(0, (ws.worldDay || 0)) + day;
    /* ③ 违和消退 + ④ 卷末事务 */
    ws.discord = Math.max(0, (ws.discord || 0) - 1);
    var arc = arcOf(cur);
    var volEnd = (cur % ARC_CHAPS === 0);
    var jumped = 0;
    if (volEnd && cur < ARC_CHAPS * 10) {
      jumped = 540 + (seedOf(cur * 13) % 541);       /* 卷间跳 1.5~3 年 */
      ws.worldDay += jumped;
      arc = arcOf(cur + 1);
      /* 墨上限换卷（度量感情）：新卷回满到新上限；结转位只记「上一章省下了」，
       * 节俭奖励的具体形态 S3-b 定——上限本身永不超（干预与代价 §二）。 */
      var cap = inkCapOf(arc);
      var leftover = isNum(ws.ink && ws.ink.n) ? ws.ink.n : 0;
      ws.ink = { n: cap, carry: Math.min(1, leftover) };
      nar.arcArts = snapArts(ws, arc);               /* 卷首快照：墨厄「失去本卷已得武学」的回退点 */
    } else {
      /* 每章开头回满（干预与代价 §二）；carry = 上一章是否未落笔（节俭记录位） */
      var cap2 = inkCapOf(arc);
      ws.ink = { n: cap2, carry: cost > 0 ? 0 : 1 };
    }
    /* ⑤ 卡点窗口投放：卷内第 7/17 章完结时各投一笔（预算对半拆，金额确定性） */
    var inVol = ((cur - 1) % ARC_CHAPS) + 1;
    var gain = 0;
    if (inVol === 7 || inVol === 17) {
      var vol = arcOf(cur) - 1;
      var G = (D && D.ARC_GAIN) || [];
      var budget = isNum(G[vol]) ? G[vol] : 0;
      if (budget > 0) {
        var amt = inVol === 7 ? Math.ceil(budget / 2) : budget - Math.ceil(budget / 2);
        var capN = capOf(ws);
        if (isNum(ws.qi) && ws.qi < capN) {
          var beforeQ = ws.qi;
          ws.qi = Math.min(capN, beforeQ + amt);
          gain = ws.qi - beforeQ;
        }
      }
    }
    nar.chapNo = cur + 1;
    nar.beatNo = 0;
    return { chapNo: cur, arcNo: arcOf(cur), gain: gain, day: day + jumped, discord: ws.discord || 0, ink: ws.ink.n };
  }

  /* ── 批注 annotate(ws, note, ctx)（S3-b · 册161）──────────────────────────────
   * 页边一句念头（干预与代价 §一「批」/ §五「参与」）：**1 墨 + 违和 +1 + 性格轴微调 ±2~5**。
   * note = { axis:'xia'|'kuang'|'du', d:±3 }。事务性同 advance：墨不够整笔回绝、零状态变更。
   * 不在此处消退违和——消退挂章完结（advance）；批注每章一次也净 0，与「参与不累积代价」同向。
   * 违和到 100 同样触发墨厄（落笔即成，不等章完结）。 */
  function annotate(ws, note, ctx) {
    void ctx;
    if (!ws || !ws.narrative || !ws.ink) return { err: 'nows' };
    var ax = note && note.axis;
    var d = isNum(note && note.d) ? note.d : 0;
    if (ax !== 'xia' && ax !== 'kuang' && ax !== 'du') return { err: 'note' };
    if (!d) return { err: 'note' };
    if (!ws.narrative.arcArts) ws.narrative.arcArts = snapArts(ws, arcOf(ws.narrative.chapNo || 1));
    if (!isNum(ws.ink.n) || ws.ink.n < 1) return { err: 'ink', need: 1, have: ws.ink.n || 0 };
    ws.ink.n -= 1;
    ws.ink.carry = 0;
    ws.discord = clampInt((ws.discord || 0) + 1, 0, 100, ws.discord || 0);
    var p = ws.persona || (ws.persona = { xia: 0, kuang: 0, du: 0 });
    p[ax] = clampInt((p[ax] || 0) + d, -100, 100, p[ax] || 0);
    if (ws.discord >= 100) {
      moeRewind(ws);
      return { mo: 1, chapNo: ws.narrative.chapNo, discord: 0, ink: ws.ink.n };
    }
    return { ink: ws.ink.n, discord: ws.discord || 0 };
  }

  /* ── 默认选择 autoPick（S3-c · 册165 · 叙事引擎 §七）──────────────────────────
   * 无干预时主角按性格三轴自动选——「书自己在写」。确定性打分（同 ws + 同 fork ⇒ 同选择）：
   *   score(opt) = 0.4 × personaFit + rand(−15, 15)（seed 取章号散列；feasible/relationTilt
   *   两项在支级门槛已过滤、人物亲疏未建的现状下恒满/零，留位随关系批接）
   * personaFit = Σ(axis[k] × persona[k]) / 40——侠轴 +80 时「相助」（axis xia+4）≈ +8，
   *   正向占优但随机项可翻 ⇒ 性格是倾向不是锁死。保守项 axis 为 null ⇒ fit 0。
   * 返回选中的 opt（含保守项）；无 fork 返回 null。 */
  function autoPick(ws, fork, ctx) {
    void ctx;
    if (!fork || !fork.opts || !fork.opts.length) return null;
    var p = (ws && ws.persona) || { xia: 0, kuang: 0, du: 0 };
    var seed = seedOf(((ws.narrative && ws.narrative.chapNo) || 1) * 31 + fork.knot.length * 7);
    var rand = (seed % 31) - 15;                       /* −15~+15，确定性 */
    var best = null, bestScore = -1e9;
    for (var i = 0; i < fork.opts.length; i++) {
      var o = fork.opts[i];
      var fit = 0;
      if (o.axis) {
        for (var k in o.axis) {
          if (k === 'xia' || k === 'kuang' || k === 'du') fit += (o.axis[k] || 0) * (p[k] || 0);
        }
        fit = fit / 40;
      }
      if (o.ink > 0) fit -= o.ink * 2;                 /* 无干预的主角不倾向花墨的重笔（改 3 墨 −6） */
      var score = 0.4 * fit + rand + i * 0.01;         /* 微小位次偏置 = 并列时取先 */
      if (score > bestScore) { bestScore = score; best = o; }
    }
    return best;
  }

  /* ── 离线提要 offlineCatchup（S3-c · 册165 · 叙事引擎 §八）──────────────────────
   * 不在线时只结算数值与指针，不生成正文：按 36 现实分钟/章推进（与在线阅读节奏同源），
   * 分岔走 autoPick（书自己在写），每章的数值面（卡点投放/违和消退/卷事务）与在线同一条 advance。
   * 回归呈报 = ws.narrative.digest：逐章「第N章 · 地界」**至多 8 行**，超出折叠为 dropped 计数
   * （主档容量红线同型——cache 只留 3 章，digest 只留 8 行）。
   * 纯确定性：不调 Math.random、不读实时钟；autoPick 的选择随章号可复现。
   * 返回 { chapters, dropped }。 */
  var OFFLINE_CHAPTER_MS = 36 * 60000;
  function offlineCatchup(ws, gapMs, ctx) {
    if (!ws || !ws.narrative || !isNum(gapMs) || gapMs <= 0) return { chapters: 0, dropped: 0 };
    var n = Math.floor(gapMs / OFFLINE_CHAPTER_MS);
    if (n > 400) n = 400;                              /* 超长离线封顶（10 天 ≈ 全本量级；再长书也写完了） */
    var lines = [];
    for (var i = 0; i < n; i++) {
      if ((ws.narrative.chapNo || 1) > ARC_CHAPS * 10) break;   /* 十卷完 ⇒ 合卷，离线不续 */
      var ch = chapter(ws, null, {});
      var pick = ch.fork ? autoPick(ws, ch.fork, ctx) : null;
      if (pick && pick.ink > 0) pick = null;           /* 书自己在写不花墨：干预项只对 autoPick 降权，离线一律走免费面 */
      var zoneName = ch.meta && ch.meta.place ? ch.meta.place : (ws.place || PLACE_START);
      advance(ws, pick, ctx);
      lines.push((ws.narrative.chapNo - 1) + '@' + zoneName);
    }
    var keep = lines.slice(-8);
    var oldDropped = (ws.narrative.digest && ws.narrative.digest.dropped) || 0;
    var oldLines = (ws.narrative.digest && ws.narrative.digest.lines) || [];
    var merged = oldLines.concat(keep).slice(-8);
    ws.narrative.digest = { lines: merged, dropped: oldDropped + (lines.length - keep.length) };
    return { chapters: lines.length, dropped: ws.narrative.digest.dropped };
  }

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
    /* 界面形态标记（册163 · 叙事引擎 §一「主界面 = 一册可翻的线装书，不是 tab 页面」）：
     * 引擎/视图读到 `worldView:'book'` ⇒ 主界面走书形态（九页 tab 不出现）。
     * xiuxian 不声明该键 ⇒ 第一世界照走 tab，零改动。 */
    worldView: 'book',
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
    /* G18 叙事编排层：**本界是 `pack.narrative` 可选契约的第一份实现**（工程规范 §2.2）。
     * 第一世界不实现该键 ⇒ 引擎跳过；本界实现了 ⇒ 章生成走 `chapter()`、正文走 `render()`。 */
    narrative: {
      chapter: chapter,
      render: render,
      advance: advance,
      annotate: annotate,
      autoPick: autoPick,
      offlineCatchup: offlineCatchup,
      beatsPerChapter: CHAPTER_BEATS,
      arcChaps: ARC_CHAPS
    },
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
