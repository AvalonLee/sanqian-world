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

  /* ── 兵刃（册227 · G4 兵器槽 + G15 神兵谱，数值与经济 §六/§七）──────────────────
   * 兵刃乘区正典：空手/不趁手 0.90 · 寻常 1.00 · 好兵刃 1.10 · 名兵 1.20。
   * **口径两条**：① 装备项只认 `{i}`（册227 起不再读旧的 `power` 字段——旧档残留无害，
   * 读的是 WEAPONS 表 ⇒ 数值单源）；② 名兵一律 1.20，差异只走取得难度（不造「最强兵」刷点）。
   * 旧档迁移：册217 市集两件叫 `shop_blade`/`shop_sword`，本批并入表后更名 `wp_tiedao`/`wp_haojian`，
   * normalize 按 LEGACY_GEAR_ID 一次性映射（旧档在手兵器不至于变成「不趁手 0.90」白损）。 */
  var WEAPON_MUL_BARE = 0.90;         /* 空手 / 不趁手 */
  var LEGACY_GEAR_ID = { shop_blade: 'wp_tiedao', shop_sword: 'wp_haojian' };
  function buildWeaponIndex() {
    var idx = {};
    var G = (D && D.WEAPONS) || [];
    for (var i = 0; i < G.length; i++) idx[G[i].i] = G[i];
    return idx;
  }
  var WEAPON_INDEX = buildWeaponIndex();
  function weaponRow(id) { return (id && WEAPON_INDEX[id]) ? WEAPON_INDEX[id] : null; }
  /* ── 行头三槽（册230 · G4 暗器/护身/鞋履）────────────────────────────────────
   * **不加战力乘区**——数值卷 §六 的 1.86 倍上限已被武艺×兵刃×相性占满，再添乘区就跨档；
   * 三槽只在既有判定点生效，各有一个单位量乘 lv（1/2 两档）：
   *   ranged 暗器 → 胜战战利品 +20%/档（补刀多捞，不动胜负）
   *   armor  护身 → 败战内伤 −1 层/档（软甲护要害，不动战力）
   *   boots  鞋履 → 遇敌概率 −5 点/档（快靴避开些麻烦）
   * 这三条都属「状态/判定」层：改了不会让玩家越级，只会让他少挨几下、多捞一点。 */
  function buildMiscIndex() {
    var idx = {};
    var G = (D && D.GEAR_MISC) || [];
    for (var i = 0; i < G.length; i++) idx[G[i].i] = G[i];
    return idx;
  }
  var MISC_INDEX = buildMiscIndex();
  function miscRow(id) { return (id && MISC_INDEX[id]) ? MISC_INDEX[id] : null; }
  function gearRow(id) { return weaponRow(id) || miscRow(id); }
  var MISC_UNIT = { loot: 20, injury: 1, evade: 5 };   /* 每档的单位量 */
  function effectsOfGear(ws) {
    var g = obj(ws && ws.gear);
    var out = { loot: 0, injury: 0, evade: 0 };
    var r = g.ranged && g.ranged.i ? miscRow(g.ranged.i) : null;
    if (r && r.slot === 'ranged') out.loot = MISC_UNIT.loot * (r.lv | 0);
    var a = g.armor && g.armor.i ? miscRow(g.armor.i) : null;
    if (a && a.slot === 'armor') out.injury = MISC_UNIT.injury * (a.lv | 0);
    var b = g.boots && g.boots.i ? miscRow(g.boots.i) : null;
    if (b && b.slot === 'boots') out.evade = MISC_UNIT.evade * (b.lv | 0);
    return out;
  }
  /* 兵刃乘区：装的东西在表里按 mul，不在表里（含空手）按 0.90 —— 「不趁手」即此形。 */
  function weaponMult(ws) {
    var g = obj(ws && ws.gear);
    var w = g.weapon;
    var row = w && w.i ? weaponRow(w.i) : null;
    return row ? row.mul : WEAPON_MUL_BARE;
  }

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

  /* ── 存档初始值（字段表 = docs/武侠世界/数值与经济.md §九；顶层键集以两份清单实数为准）────────────
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
      blades: [],                      /* 神兵谱（册227）：已收到手过的兵刃 id —— 收集面，卸下不减 */
      relations: {},
      injury: 0,                       /* 内伤 0~15；=15 即死（合卷） */
      lifeCut: 0,                      /* 折寿年数（册237 · 辟邪剑法自伤）：lifeInfo 的 age 直接加上它 */
      worldDay: 0,                     /* 游戏内天数 */
      exp: 0,                          /* 见闻值 = visited×2 + 熟人，派生落盘只为免重算 */
      debts: [],                       /* 人情债 {who, kind, what, due?}，跨代继承 */
      stamina: 60,                     /* 精力（册215 P2）：主动动作闸——上限 staminaCapOf()，claim 按时长恢复 */
      mode: 'travel',                  /* 挂机模态（册216 P3）：travel 闯荡 0.6 产出 + 见闻增长 / seclude 闭关 1.0 */
      autoSlotArt: false,              /* 设置页（册240）：学到新武学时自动入槽（有空位才放；缺省关 = 旧行为） */
      autoEquipGear: false,            /* 设置页（册240）：买到 / 夺得兵刃行头时自动上身（该部位空着才穿） */
      sceneProg: {},                   /* 子场景进度（册216 P3）：zoneId → 已推进场景数 */
      knotDone: {},                    /* 已走过的剧情桥段（册216 P3）：knotId → 1（一次性名场面） */
      world: null,                     /* 江湖格局写回（册218 P5）：{wefate: {事件id → canon|alt}}——只存结果键 */
      lastReport: null,                /* 最近一次闯荡战报（册216 P3）：{kind, text keys, win, ...} */
      escort: null,                    /* 押镖在途（册226）：{steps, pay}——travel 计步 3 步自动交镖；途中败战 = 劫毁 */
      atts: { zhi: 50, gu: 50, xing: 50 },  /* 资质三轴（册215 P2 · G12）：悟性 zhi 练功速率 / 根骨 gu 内伤耐受（P3 接） / 心性 xing 冲关成功率 */
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
      /* 册227：旧 id 一次性迁移（只认 {i}；旧档的 power 字段不再读，残留到下次装备时自然覆盖） */
      var slotRaw = gearIn[GEAR_SLOTS[i]];
      if (slotRaw && slotRaw.i && LEGACY_GEAR_ID[slotRaw.i]) slotRaw = { i: LEGACY_GEAR_ID[slotRaw.i] };
      gear[GEAR_SLOTS[i]] = slotRaw || null;
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
      blades: arr(p.blades),
      relations: obj(p.relations),
      injury: clampInt(p.injury, 0, 15, 0),
      lifeCut: clampInt(p.lifeCut, 0, 200, 0),
      worldDay: Math.max(0, num(p.worldDay, 0)),
      exp: Math.max(0, num(p.exp, 0)),
      debts: arr(p.debts),
      stamina: clampInt(p.stamina, 0, 999, 60),
      mode: p.mode === 'seclude' ? 'seclude' : 'travel',
      autoSlotArt: p.autoSlotArt === true,
      autoEquipGear: p.autoEquipGear === true,
      sceneProg: obj(p.sceneProg),
      knotDone: obj(p.knotDone),
      world: (function () {
        var wd = obj(p.world);
        var cast = {}, castIn = obj(wd.wbcast);
        for (var ck in castIn) if (WB_STATE[castIn[ck]]) cast[ck] = castIn[ck];
        var rep = {}, repIn = obj(wd.wbsect);
        for (var sk in repIn) if (isNum(repIn[sk])) rep[sk] = clampInt(repIn[sk], -100, 100, 0);
        return { wefate: obj(wd.wefate), wecyc: obj(wd.wecyc), wseen: obj(wd.wseen),
          wbcast: cast, wbsect: rep, wafter: arr(wd.wafter).slice(-20),
          webonus: isNum(wd.webonus) ? wd.webonus : 0, fireDays: clampInt(wd.fireDays, 0, 99, 0), fireMs: isNum(wd.fireMs) ? wd.fireMs : 0,
          bixieMs: isNum(wd.bixieMs) ? wd.bixieMs : 0 };
      })(),
      lastReport: obj(p.lastReport),
      escort: (function () { var e2 = p.escort; return e2 && isNum(e2.steps) && isNum(e2.pay) ? { steps: e2.steps, pay: e2.pay } : null; })(),
      atts: (function () {
        var a = obj(p.atts);
        return {
          zhi: clampInt(a.zhi, 0, 100, 50),
          gu: clampInt(a.gu, 0, 100, 50),
          xing: clampInt(a.xing, 0, 100, 50)
        };
      })(),
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
  /* 册215（P2 产出重定种，归因）：基准 1.0 → 8.0、层数系数 0.12 → 0.15——
   * 旧参数一档要 5.4 现实小时（首档体感太慢）；新参数一档 ≈ 38 现实分钟、终档 ≈ 83 现实小时，
   * 全程 5~7 现实天纯挂机（放置长线口径）；12 游戏月仿真曲线相应重跑（sim-wuxia 同批换锚）。 */
  var BASE_PER_MIN = 8.0;
  var LAYER_MULT = 0.15;
  var TRAVEL_MULT = 0.6;
  /* 行功日（册233 · 走火入魔专用）：10 现实分钟 = 1 日。**不是世界日**——世界日的尺度一动就
   * 牵动整个 sim 时间模型，走火按练功尺度结算、与历法日解耦。 */
  var FIRE_DAY_MS = 10 * 60 * 1000;
  /* 世界日（册234 · worldDay 时钟）：1 现实分钟 = 1 游戏日（1 游戏年 = 6 现实小时）——
   * 倒推自「一局 18~22 游戏年 = 5 现实天」（数值卷 §二）与「一档 ≈ 3 游戏年」（世界事件卷 §七）。
   * 离线一次性最多推进 12 现实小时（= 2 游戏年）：与第一世界经济侧 OFFLINE_CAP_H 同尺，
   * 避免「回来一次被寿元一次咬掉一辈子」。 */
  var GAME_DAY_MS = 60 * 1000;
  var WD_OFFLINE_CAP_MS = 12 * 3600 * 1000;

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

  /* 战力 = 境界基准 × 武艺 × 兵刃 × 状态（数值与经济 §六）：武艺 = 1 + Σ(品阶权重×层数)×0.012 封顶 1.35
   * （系统性加成总上限 1.86 < 档差 2.3 的红线不变——满配越一档有戏、跨两档是奇迹）；
   * 兵刃（册227 接）= 空手/不趁手 0.90 · 寻常 1.00 · 好兵刃 1.10 · 名兵 1.20；
   * 状态 = 内伤 ≥12 ×0.60（咯血档）· ≥8 ×0.75 · else 1.00。兵刃乘区落码后**空手开局战力降一成**，
   * 这是正典一直写着的账（此前未接 = 白送了 0.90→1.00 的便宜），不是新削弱。相性乘区随四性批接。 */
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
    return cur.power * artPowerMult(ws) * weaponMult(ws) * status;
  }

  /* 见闻值 = visited×2 + 熟人（affinity ≥ 20）——派生，读档时重算一次防旧档漂 */
  function expOf(ws) {
    var visited = (ws.visited || []).length;
    var known = 0;
    var rel = ws.relations || {};
    for (var k in rel) { if (rel[k] && isNum(rel[k].affinity) && rel[k].affinity >= 20) known++; }
    /* 错过回声（册223）与事件见闻奖励（册225 修）：两者都必须进派生式——exp 是派生值，
     * 走 ws.exp += 会被 claim 的 expOf 重算静默吞掉（册221 埋、册225 sweep 批抓出）。 */
    /* 回声见闻封顶 +2（册234）：世界日一推进，17 案全错过 ×2 = +34 会顶穿「天人须亲身赴会」
     * 的心境墙——封顶只记一次「听说过江湖上的事」。 */
    var fate = wefateOf(ws);
    var echo = false;
    for (var fk in fate) { if (fate[fk] === 'echo') { echo = true; break; } }
    var bonus = (ws.world && isNum(ws.world.webonus)) ? ws.world.webonus : 0;
    return visited * 2 + known + (echo ? 2 : 0) + bonus;
  }

  /* ── 修习常量（册162 · 武学全录 §五「自悟」最小闭环 + §五 瓶颈）────────────────── */
  var PRACTICE_PER_LAYER = 100;   /* 每层 100 练习度：30 现实分钟/层 × 悟性系数（att zhi 100 ⇒ 20 分/层）——挂机时长即练功时长，离线 = 在线 */
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
    var xing = (ws.atts && isNum(ws.atts.xing)) ? ws.atts.xing : 50;
    var p = 0.5 * Math.min(1, (expOf(ws) || 0) / (g.exp || 1)) * (1 + xing / 400);   /* 心性加成（册215）：xing 100 ⇒ ×1.25 */
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
  /* 余响 / 传承（册236 · GATES 的 `heritage` 标记终于有写口）：一世了结时按「境界 / 最高武学 /
   * 最深交情」三轴各取一项（≤3）带进下一世——数值只给薄赠（见闻 / 功力 / 武学三层 / 交情 30），
   * 不继承满配（合卷折分 0.5 口径）。GATES 8/9 的 `heritage` 门槛据此解锁：单局不可达
   * = 第一世永远破不到「无招」，须死过一次（或退隐）方有来世之资。 */
  function heritageAwake(ws) {
    var her = obj(ws && ws.heritage);
    return (her.gen | 0) > 1 || arr(her.inherited).length > 0;
  }
  function inheritOf(ws) {
    var out = [];
    if (!ws) return out;
    var r = ws.realm | 0;
    if (r >= 5) out.push({ k: 'realm', n: r });
    var lv = obj(ws.artsLevels), best = null, bl = 0;
    for (var aid in lv) { var l = lv[aid] | 0; if (l > bl) { bl = l; best = aid; } }
    if (best && bl >= 6 && ART_INDEX[best]) out.push({ k: 'art', id: best, lv: Math.min(3, bl) });
    var rel = obj(ws.relations), bid = null, ba = 0;
    for (var cid in rel) { var a = (rel[cid] || {}).affinity | 0; if (a > ba) { ba = a; bid = cid; } }
    if (bid && ba >= 60 && CAST_INDEX[bid]) out.push({ k: 'bond', id: bid, aff: 30 });
    return out.slice(0, 3);
  }
  function rebirthCarry(oldWs, fresh) {
    if (!oldWs || !fresh) return null;
    var her = obj(oldWs.heritage);
    var items = arr(her.inherited).length ? arr(her.inherited).slice(0, 3) : inheritOf(oldWs);
    /* 江湖格局跨世（册241 · 世界事件卷 §五 / §十一 P7）：人物去向 / 门派声望 / 余波传闻带进来世
     * ——上世改的格局要看得见。已了结事件本身（wefate/wecyc/wseen）重置：新的一世重新赴会。 */
    var ow = obj(oldWs.world);
    fresh.world = {
      wefate: {}, wecyc: {}, wseen: {},
      wbcast: obj(ow.wbcast), wbsect: obj(ow.wbsect), wafter: arr(ow.wafter).slice(-20),
      webonus: 0, fireDays: 0, fireMs: 0, bixieMs: 0
    };
    if (!items.length) return null;
    fresh.heritage = { gen: Math.max(2, her.gen | 0), inherited: items };
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.k === 'realm') {
        fresh.exp = (fresh.exp | 0) + (it.n | 0) * 2;
        var row = realmRow((it.n | 0) - 1);
        if (row) fresh.qi = Math.max(fresh.qi || 0, row.need || 0);
      } else if (it.k === 'art' && ART_INDEX[it.id]) {
        fresh.artsKnown = arr(fresh.artsKnown);
        if (fresh.artsKnown.indexOf(it.id) < 0) fresh.artsKnown.push(it.id);
        fresh.artsLevels = obj(fresh.artsLevels);
        fresh.artsLevels[it.id] = Math.max(fresh.artsLevels[it.id] | 0, clampInt(it.lv, 1, 9, 3));
        fresh.artsSlots = arr(fresh.artsSlots);
        if (fresh.artsSlots.indexOf(it.id) < 0 && fresh.artsSlots.length < 6) fresh.artsSlots.push(it.id);
      } else if (it.k === 'bond' && CAST_INDEX[it.id]) {
        fresh.relations = obj(fresh.relations);
        fresh.relations[it.id] = { affinity: clampInt(it.aff, 0, 100, 30), kind: 'friend' };
      }
    }
    return items;
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
    if (g.extra === 'heritage' && !heritageAwake(ws)) return false;   /* 余响类：第一世不可达，来世解锁（册236） */
    return true;
  }

  /* 门槛判定（册216 P3 自 KNOTS 消费面回归）：need 每项都要过——剧情与闯荡共用 */
  function meetNeed(ws, need) {
    if (!need) return true;
    if (need.realm != null && (ws.realm | 0) < need.realm) return false;
    if (need.silver != null && (ws.stones || 0) < need.silver) return false;
    if (need.artsMin != null && maxLayer(ws) < need.artsMin) return false;
    return true;
  }
  function branchOpen(ws, br) { return meetNeed(ws, br && br.req); }

  /* ── 闯荡推图（册216 P3 · 方案卷 §五之三）──────────────────────────────────────
   * 地界解锁档（ZONES 数组序 → 境界门槛）：不入流可达前两地，此后每档境界解锁 1~2 地。
   * 闯荡一步（精力 3）：推进当前地界子场景（进度到头 = 该地「走熟」，见闻经 visited 已计）；
   *   遭遇判定按世界日确定性散列——撞 EVENTS action 条目则遇敌（CAST 对手池 tier 对表），
   *   撞 KNOTS（meetNeed 过）则入剧情分支（玩家直选，批书语义摘除）。
   * 战斗掷判（数值卷 §六）：p = 1/(1+(敌/我)^1.5) 夹 0.05~0.95，三回合取二胜；
   *   胜（拿银两/功力）/ 险胜（内伤+1）/ 败（走窄路：内伤+1~3）/ 大败 p<0.15（内伤+4~6）——
   *   Math.random 属玩家主动操作（与 attemptBreak 同口径，不入定种面）。 */
  /* ZONES 数组序（shaolin/songshan/luoyang/yanziwu/yanfulou/guangmingding/kunlun/yanmenguan/damo/wuliang/dali/lingshe/binghuo）——前三地不入流可达（开局地 luoyang 在第三位，册216 实测勘正） */
  var TRAVEL_UNLOCK = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7];
  var TRAVEL_STAMINA = 3;
  function zoneUnlocked(ws, zid) {
    var Z = (D && D.ZONES) || [];
    for (var i = 0; i < Z.length; i++) if (Z[i].i === zid) return (ws.realm | 0) >= TRAVEL_UNLOCK[i];
    return false;
  }
  function worldDayHash(ws, salt) {
    var x = ((Math.floor(ws.worldDay || 0) + 1) * 2654435761 + (salt || 0) * 2246822519) >>> 0;   /* 整日取整：worldDay 含当日进度后哈希仍按日稳定（册233） */
    x ^= x >>> 15; x = (x * 4093) >>> 0;
    return x >>> 0;
  }
  function foeTierRealm(t) { return t === 'S' ? 5 : t === 'A' ? 4 : t === 'B' ? 3 : 2; }
  function foePower(c) {
    if (c && c.power) return c.power;   /* 闯荡遭遇：EVENTS 品阶已折算成 power 直给 */
    var r = Math.min(foeTierRealm(c.t), 9);
    var row = realmRow(r);
    return row ? row.power * 1.1 : 30;
  }
  /* ── 相性（册232 · 武学全录 §一「内力四性」+ 数值卷 §六）──────────────────────
   * 环克：刚猛 → 阴柔 → 中正 → 邪异 → 刚猛。克制方 ×1.15、被克 ×0.87、同性 / 无从判 ×1.00。
   * **为什么不进 `powerOf`**：`powerOf` 回答「我有多强」，相性回答「**对他**有多强」——
   * 它依赖对手，而 `powerOf(ws)` 没有对手参数。所以接在 `battleOdds`（对战判定）层，
   * 数学上等价于战力式里的那一项（比值分子乘 1.15 = 分母除 1.15 的近似，且判定本就用比值）。
   *
   * 三处「性」的来源（正典未逐条规定，按可叙事的口径推导，逐条注依据）：
   *   · 主角 = **主修内功之性**（`artsLevels` 里 neigong 类层数最高那部的 `nat`）——
   *     正典原话是「内力四性」，内功是内力之源；无内功 ⇒ 中正（无色）。
   *   · 世界事件 boss = **门派之性**（CAST 行的 `sec` → SECT_NAT）——「他是谁的人」。
   *   · 闯荡杂鱼 = **地界之性**（EVENTS 行的 `z` → ZONE_NAT）——「你走到谁的场子」。
   */
  var NAT_CYCLE = ['gang', 'yin', 'zhong', 'xie'];
  var NAT_WIN = 1.15, NAT_LOSE = 0.87, NAT_SAME = 1.00;
  /* 门派主性（26 门全覆盖；未列 ⇒ 中正）。依据 = 该门武学的内力性质：
   * 少林/嵩山/铁掌/崆峒/丐帮 刚猛（外家与降龙一路）；武当/全真/华山/恒山/泰山/衡山/昆仑/青城/点苍/大理/红花会/天地会 中正；
   * 桃花岛/古墓/逍遥/灵鹫 阴柔（逍遥一系）；日月/星宿/血刀/天鹰/神龙/长乐/明教/侠客岛 邪异。 */
  var SECT_NAT = {
    shaolin: 'gang', songshan: 'gang', tiezhang: 'gang', kongtong: 'gang', gaibang: 'gang',
    wudang: 'zhong', quanzhen: 'zhong', huashan: 'zhong', hengshan: 'zhong', taishan: 'zhong',
    hengshan_n: 'zhong', kunlun: 'zhong', qingcheng: 'zhong', diancang: 'zhong', dali: 'zhong',
    emei: 'zhong', honghuahui: 'zhong', tiandihui: 'zhong',
    taohua: 'yin', gumu: 'yin', xiaoyao: 'yin', lingjiu: 'yin',
    riyue: 'xie', xingxiu: 'xie', xuedao: 'xie', tianying: 'xie', shenlong: 'xie',
    changle: 'xie', mingjiao: 'xie', xiake: 'xie'
  };
  /* 地界主性（13 地）：边关与大寺 刚猛 · 城郭与名山 中正 · 水乡与山谷 阴柔 · 三岛与明教圣地 邪异。
   * 四性齐（刚 3 / 中 5 / 阴 2 / 邪 3）——保证玩家修任何一性都能在闯荡里吃到克制。 */
  var ZONE_NAT = {
    shaolin: 'gang', songshan: 'gang', yanmenguan: 'gang',
    luoyang: 'zhong', yanfulou: 'zhong', kunlun: 'zhong', damo: 'zhong', dali: 'zhong',
    yanziwu: 'yin', wuliang: 'yin',
    guangmingding: 'xie', lingshe: 'xie', binghuo: 'xie'
  };
  function natBeats(a, b) {
    var i = NAT_CYCLE.indexOf(a), j = NAT_CYCLE.indexOf(b);
    if (i < 0 || j < 0) return false;
    return (i + 1) % NAT_CYCLE.length === j;
  }
  function natMult(mine, theirs) {
    if (!mine || !theirs || mine === theirs) return NAT_SAME;
    if (natBeats(mine, theirs)) return NAT_WIN;
    if (natBeats(theirs, mine)) return NAT_LOSE;
    return NAT_SAME;
  }
  function myNat(ws) {
    var lv = obj(ws && ws.artsLevels);
    var best = null, bestLv = -1;
    for (var k in lv) {
      var a = ART_INDEX[k];
      if (!a || a.k !== 'neigong') continue;
      var n = isNum(lv[k]) ? lv[k] : 0;
      if (n > bestLv) { bestLv = n; best = a; }
    }
    return best && best.nat ? best.nat : 'zhong';
  }
  function castNat(castRow) { return (castRow && SECT_NAT[castRow.sec]) || 'zhong'; }
  function zoneNat(zoneId) { return ZONE_NAT[zoneId] || 'zhong'; }
  /* 走火入魔判据（册233 · 武学全录 §一 注）：**修习槽**里同时挂着相冲两性（环上相邻、互克）
   * = 强行兼修。只看槽（正在练的），已学但不练不算——这给「学什么内功」加了真实约束。
   * **中正不参与相冲**：它是「不偏不倚」的基准性，能调和刚猛与阴柔，与谁都冲不起来——
   * 所以相冲对实际只有「刚猛 ↔ 阴柔」「刚猛 ↔ 邪异」两对（邪异与阴柔隔一位、不相克，也不冲）。
   * 这条同时保证「标准玩家」练中正入门内功 + 一路专精内功不会莫名走火（册233 sim R4 的实证）。 */
  function natClash(ws) {
    var slots = arr(ws && ws.artsSlots).slice(0, SLOTS_MAX);
    var seen = {};
    for (var i = 0; i < slots.length; i++) {
      var aid = typeof slots[i] === 'string' ? slots[i] : (slots[i] && slots[i].id);
      var a = aid ? ART_INDEX[aid] : null;
      if (a && a.nat) seen[a.nat] = 1;
    }
    var keys = Object.keys(seen);
    for (var x = 0; x < keys.length; x++) {
      if (keys[x] === 'zhong') continue;
      for (var y = x + 1; y < keys.length; y++) {
        if (keys[y] === 'zhong') continue;
        if (natBeats(keys[x], keys[y]) || natBeats(keys[y], keys[x])) {
          return { clash: true, a: keys[x], b: keys[y] };
        }
      }
    }
    return { clash: false, a: null, b: null };
  }

  function battleOdds(ws, foe) {
    /* 相性只在「对上谁」时才有意义：对手无 nat ⇒ 不乘（1.00），不当成中正去比（会凭空造出克制） */
    var fn = foe && foe.nat ? foe.nat : null;
    var mine = powerOf(ws) * (fn ? natMult(myNat(ws), fn) : 1);
    var theirs = foePower(foe);
    var p = 1 / (1 + Math.pow(theirs / mine, 1.5));
    return Math.max(0.05, Math.min(0.95, p));
  }
  /* ── 地界素材两型（册229 · 叙事引擎 §四 八种节的现行落点）────────────────────
   * 书形态退役后 EVENTS 只剩三种 kind 有真消费：action（遇敌）/ scene（到达写景）/ gain（拾遗）。
   * `scene` = 到达地界时读到的写景一句（纯展示，不改数值——正典「写景、转场」）；
   * `gain`  = 平安步里撞见的零碎银钱（判点走 h 散列，定种可复现；体量照数值卷 §七 吃住 3~10 文的尺度）。
   * 两型都按 z 每地一条（13 地），取条规则：EVENTS 顺序首个命中。 */
  function zoneSceneOf(place) {
    var E = (D && D.EVENTS) || [];
    for (var i = 0; i < E.length; i++) if (E[i].z === place && E[i].kind === 'scene') return E[i];
    return null;
  }
  function gainOf(place) {
    var E = (D && D.EVENTS) || [];
    for (var i = 0; i < E.length; i++) if (E[i].z === place && E[i].kind === 'gain') return E[i];
    return null;
  }
  var GAIN_RATE = 12;                                   /* 平安步拾遗概率（百分点） */
  function gainTip(h) { return 5 + ((h >>> 3) % 16); }  /* 5~20 文 */
  /* ── 隐世传功（册242 · 武学全录 §八「长尾武学的奇遇获得投放权重」）──────────────
   * 全表 403 部里，门派可学约 98 + 秘籍 10 + 事件主奖励约 9 ⇒ 约 305 部长尾永远拿不到。
   * 本通道把长尾接进「平安步」：只传**未学、无门派归属、且不是秘籍/事件主奖励**的武学，
   * 按品阶加权、按境界开门——黄 0 / 玄 2 / 地 4 / 天 6；平安步 1% 触发（整步约 0.3%）。
   * 只在玩家主动行走时掷（与遭遇战同口径），不占离线结算，也不改见闻/战斗曲线。 */
  var TEACH_RATE = 0.01;
  var TEACH_TIER = { huang: { r: 0, w: 60 }, xuan: { r: 2, w: 30 }, di: { r: 4, w: 8 }, tian: { r: 6, w: 2 } };
  var LT_EXCLUDE = null;
  function longTailExclude() {
    if (LT_EXCLUDE) return LT_EXCLUDE;
    var set = {};
    for (var i = 0; i < WORLD_EVENTS.length; i++) {
      var rw = WORLD_EVENTS[i].reward;
      if (rw && rw.kind === 'art') set[rw.id] = 1;
    }
    var M = (D && D.MANUALS) || [];
    for (var m = 0; m < M.length; m++) if (M[m].art) set[M[m].art] = 1;
    LT_EXCLUDE = set;
    return set;
  }
  function longTailPool(ws) {
    var out = [], known = {}, ex = longTailExclude();
    (ws && arr(ws.artsKnown)).forEach(function (id) { known[id] = 1; });
    var A = (D && D.ARTS) || [];
    var r = (ws && ws.realm) | 0;
    for (var i = 0; i < A.length; i++) {
      var a = A[i];
      if (!a || !a.i || known[a.i] || ex[a.i]) continue;
      if (arr(a.s).length) continue;                 /* 门派可学的不走私授 */
      var tt = TEACH_TIER[a.t];
      if (!tt || r < tt.r) continue;
      out.push(a);
    }
    return out;
  }
  function longTailPick(ws, h) {
    var pool = longTailPool(ws);
    if (!pool.length) return null;
    var total = 0;
    for (var i = 0; i < pool.length; i++) total += TEACH_TIER[pool[i].t].w;
    var roll = (h >>> 0) % total;
    for (var j = 0; j < pool.length; j++) {
      roll -= TEACH_TIER[pool[j].t].w;
      if (roll < 0) return pool[j];
    }
    return pool[pool.length - 1];
  }
  function grantLongTail(ws, artId) {
    if (!ws || !ART_INDEX[artId]) return null;
    ws.artsKnown = arr(ws.artsKnown);
    if (ws.artsKnown.indexOf(artId) >= 0) return null;
    ws.artsKnown.push(artId);
    ws.artsLevels = obj(ws.artsLevels);
    ws.artsLevels[artId] = 1;
    autoSlotArt(ws, artId);
    return { id: artId, t: ART_INDEX[artId].t };
  }
  function travel(ws, opt) {
    /* 押镖面（册226）：在途则本步推进一格；败战 = 劫毁（无酬）；满 3 步自动交镖得酬。
     * 三出口（battle/knot/quiet）全覆盖——胜战/剧情/平安步都计押送，只有败战断镖。 */
    var r = travelCore(ws, opt);
    if (ws && ws.escort && r) {
      if (r.kind === 'battle' && !r.win) {
        ws.escort = null;
        r.robbed = true;
        if (ws.lastReport) ws.lastReport.robbed = true;
      } else {
        ws.escort.steps = (ws.escort.steps | 0) + 1;
        if (ws.escort.steps >= 3) {
          var pay = ws.escort.pay;
          ws.stones = (ws.stones || 0) + pay;
          ws.escort = null;
          r.delivered = pay;
          if (ws.lastReport) ws.lastReport.delivered = pay;
        }
      }
    }
    return r;
  }
  function travelCore(ws, opt) {
    if (!ws) return { err: 'nows' };
    if ((ws.stamina | 0) < TRAVEL_STAMINA) return { err: 'stamina', need: TRAVEL_STAMINA, have: ws.stamina | 0 };
    if ((ws.injury || 0) >= 12) return { err: 'hurt', injury: ws.injury };   /* 咯血档不宜行走——逼疗伤/闭关（数值卷 §六「往寻医退隐方向压」） */
    var place = ws.place || PLACE_START;
    if (!zoneUnlocked(ws, place)) return { err: 'locked', zone: place };
    ws.stamina -= TRAVEL_STAMINA;
    var Z = (D && D.ZONES) || [];
    var zrow = null;
    for (var i = 0; i < Z.length; i++) if (Z[i].i === place) { zrow = Z[i]; break; }
    var scenes = (zrow && zrow.scenes) || ['1'];
    var prog = obj(ws.sceneProg);
    void done;
    var done = prog[place] | 0;
    /* 遭遇判定：世界日散列——事件线 / 剧情线 / 平安三路 */
    var h = worldDayHash(ws, (opt && opt.salt) || 0);
    var knots = (D && D.KNOTS) || [];
    var kn = null;
    var knotDone = obj(ws.knotDone);
    if (h % 100 < 25) {   /* 剧情线 25%：撞过一次的桥段不再重复（一次性名场面） */
      for (var k = 0; k < knots.length && !kn; k++) {
        if (knots[k].z === place && !knotDone[knots[k].i] && meetNeed(ws, knots[k].need)) kn = knots[k];
      }
    }
    var evs = (D && D.EVENTS) || [];
    var foe = null;
    var fx = effectsOfGear(ws);   /* 行头三槽效果（不动战力乘区；与 EVENTS 的 evs 名分开以免看混） */
    if (!kn && h % 100 < (45 - fx.evade)) {   /* 45% 遇敌（鞋履可避——快靴少撞些麻烦） */
      var pool = [];
      var MY = ws.realm | 0;
      for (var c = 0; c < evs.length; c++) {
        var e2 = evs[c];
        if (e2.z !== place || e2.kind !== 'action') continue;
        var er = e2.t === 'tian' ? 5 : e2.t === 'xuan' ? 4 : e2.t === 'di' ? 3 : 2;
        if (Math.abs(er - MY) <= 1) pool.push(e2);   /* 对手档 ≈ 主角境界 ±1（数值卷 §六 标定：越一档有戏 39~45%，两档是奇迹 ⇒ 不入流苟着） */
      }
      if (!pool.length && MY >= 1) {
        for (var c2 = 0; c2 < evs.length; c2++) {
          if (evs[c2].z === place && evs[c2].kind === 'action' && evs[c2].t === 'huang') { foe = evs[c2]; break; }
        }
      } else foe = pool[h % pool.length];
    }
    if (foe) {
      var foeRow = realmRow(foe.t === 'tian' ? 5 : foe.t === 'xuan' ? 4 : foe.t === 'di' ? 3 : 2);
      /* 杂鱼系数 0.6：闯荡遭遇是「遇袭/斗殴」级散兵（名场面级对手属 KNOTS/世界事件层），
       * 不打折扣的话 realm1 对 huang 只有一成胜率、必死无疑（册216 实测归因） */
      var foeObj = { t: foe.t, power: (foeRow ? foeRow.power : 60) * 0.6, nat: zoneNat(place) };
      var pWin = battleOdds(ws, foeObj);
      var rounds = 0, wins = 0;
      for (var r2 = 0; r2 < 3; r2++) { if (Math.random() < pWin) wins++; rounds++; }
      var win = wins >= 2;
      var big = !win && pWin < 0.15;
      var rep2 = { kind: 'battle', win: win, big: big, foe: foe.i, tier: foe.t, p: Math.round(pWin * 100) / 100 };
      if (win) {
        /* 暗器补刀（册230）：战利品按 lv 抬成 —— 不动胜负，只多捞（20%/档） */
        var lootBase = 20 + (h % 30) * 5;
        var loot = fx.loot ? Math.round(lootBase * (1 + fx.loot / 100)) : lootBase;
        ws.stones = (ws.stones || 0) + loot;
        ws.renown = clampInt((ws.renown || 0) + 5, -1000, 1000, ws.renown || 0);
        rep2.loot = loot;
        /* 夺兵（册227）：对手档越高越可能携名兵（杂鱼不携）——胜战才判，败了谈不上夺 */
        var bladeRes = bladeDrop(ws, foe.t, h);
        if (bladeRes) { rep2.blade = bladeRes.id; if (bladeRes.dupe) rep2.bladeDupe = bladeRes.cash; }
      } else if (big) {
        /* 护身挡伤（册230）：内伤按 lv 减，最低 0（软甲护要害——不改战力，只少挨） */
        ws.injury = Math.min(15, Math.max(0, (ws.injury || 0) + 4 + (h % 3) - fx.injury));
        rep2.injury = ws.injury;
      } else {
        ws.injury = Math.min(15, Math.max(0, (ws.injury || 0) + 1 + (h % 3) - fx.injury));
        rep2.injury = ws.injury;
      }
      ws.lastReport = rep2;
      return rep2;
    }
    if (kn) {
      var opts = [];
      for (var b = 0; b < kn.br.length; b++) {
        if (!branchOpen(ws, kn.br[b])) continue;
        opts.push({ k: kn.br[b].k, label: kn.br[b].label, req: kn.br[b].req || null });
      }
      if (!opts.length) opts.push({ k: 'watch', label: 'knot.' + kn.i + '.watch', req: null });
      ws.lastReport = { kind: 'knot', knot: kn.i, title: 'knot.' + kn.i + '.name', opts: opts };
      return { kind: 'knot', knot: kn.i, opts: opts };
    }
    /* 平安推进：子场景 +1（到头原地踏步但见闻已在 visited 计过） */
    if (done < scenes.length) {
      prog[place] = done + 1;
      ws.sceneProg = prog;
      ws.stones = (ws.stones || 0) + 5 + (h % 10);
    }
    /* 拾遗（册229 · gain 条落消费点）：平安步里 12% 撞见零碎银钱——与子场景推进独立结算
     * （走完场景仍可拾遗）；判点走 h，同一 (worldDay, salt, 地界) 结果可复现。 */
    var gainRow = null, gainLoot = 0;
    if (h % 100 < GAIN_RATE) {
      gainRow = gainOf(place);
      if (gainRow) {
        gainLoot = gainTip(h);
        ws.stones = (ws.stones || 0) + gainLoot;
      }
    }
    /* 隐世传功（册242）：平安步 1% 遇前辈授业——只在主动行走时掷（与遭遇战同口径），
     * 不占离线结算；本步照常推进子场景与拾遗，传功只是「路上多遇一个人」。 */
    var taught = null;
    if (Math.random() < TEACH_RATE) {
      var ta = longTailPick(ws, h);
      if (ta && grantLongTail(ws, ta.i)) taught = ta.i;
    }
    ws.lastReport = { kind: 'quiet', place: place, scene: Math.min(done + 1, scenes.length) };
    if (gainRow) { ws.lastReport.gain = gainRow.i; ws.lastReport.loot = gainLoot; }
    if (taught) ws.lastReport.teach = taught;
    return { kind: 'quiet', scene: Math.min(done + 1, scenes.length), place: place,
      gain: gainRow ? gainRow.i : null, loot: gainLoot, teach: taught };
  }
  /* KNOTS 分支直选（册216 · 批书语义摘除）：watch/help/probe/defy/join/flee 玩家直选；
   * 效果 = 性格轴微调（help=侠+4 / defy=狂+4 / join=毒+4 ——册161 AXIS_BY_K 平移）+ 保守项零效果。 */
  var AXIS_BY_K3 = { help: { xia: 4 }, defy: { kuang: 4 }, join: { du: 4 } };
  function knotChoose(ws, knotId, optK) {
    if (!ws) return { err: 'nows' };
    var kn = null;
    var ks = (D && D.KNOTS) || [];
    for (var i = 0; i < ks.length; i++) if (ks[i].i === knotId) { kn = ks[i]; break; }
    if (!kn) return { err: 'noknot' };
    var br = null;
    for (var b = 0; b < kn.br.length; b++) if (kn.br[b].k === optK) { br = kn.br[b]; break; }
    if (!br) return { err: 'nobranch' };
    if (!branchOpen(ws, br)) return { err: 'locked' };
    var p = ws.persona || (ws.persona = { xia: 0, kuang: 0, du: 0 });
    var ax = AXIS_BY_K3[optK];
    if (ax) for (var ak in ax) p[ak] = clampInt((p[ak] || 0) + ax[ak], -100, 100, p[ak] || 0);
    ws.stones = (ws.stones || 0) + (optK === 'help' || optK === 'probe' ? 10 : 0);
    var kd = obj(ws.knotDone); kd[knotId] = 1; ws.knotDone = kd;
    ws.lastReport = { kind: 'knotDone', knot: knotId, chose: optK };
    return { ok: true, chose: optK, axis: ax || null };
  }

  /* ── 悬赏榜与押镖（册226 · 数值与经济 §收入：悬赏 10~200 两 / 押镖 5~40 两按境界）────────
   * 悬赏 = 即时委托战：接下 → 精力 5 → 战斗掷判（对手满档基准 power，非杂鱼系数）→ 胜得银 + 侠名 / 败带伤 −5 侠名；
   * 档位门槛 = 侠名 renown（数值卷「悬赏档位」）：small 任意 / mid ≥0 / grand ≥50。
   * 押镖 = 3 步闯荡押送：接镖精力 3、酬金 5 + 境界×5（封 40 两）；途中败战 = 劫毁（无酬，内伤照记）。 */
  var BOUNTY_TIERS = [
    { k: 'small', need: -1000, reward: 10, fame: 5, tier: 1, mul: 0.6 },
    { k: 'mid', need: 0, reward: 60, fame: 15, tier: 3, mul: 1.0 },
    { k: 'grand', need: 50, reward: 200, fame: 40, tier: 5, mul: 1.0 }
  ];
  function bountyBoard(ws) {
    var out = [];
    for (var i = 0; i < BOUNTY_TIERS.length; i++) {
      var t2 = BOUNTY_TIERS[i];
      out.push({ k: t2.k, reward: t2.reward, need: t2.need, gate: (ws.renown || 0) < t2.need });
    }
    return out;
  }
  function bountyTake(ws, k) {
    if (!ws) return { err: 'nows' };
    var t2 = null;
    for (var i = 0; i < BOUNTY_TIERS.length; i++) if (BOUNTY_TIERS[i].k === k) t2 = BOUNTY_TIERS[i];
    if (!t2) return { err: 'notier' };
    if ((ws.renown || 0) < t2.need) return { err: 'renown', need: t2.need };
    if ((ws.stamina | 0) < 5) return { err: 'stamina' };
    ws.stamina -= 5;
    var tName = t2.tier === 1 ? 'huang' : t2.tier === 3 ? 'di' : 'tian';
    var row = realmRow(t2.tier);
    /* small 档照闯荡杂鱼系数 0.6（新手可玩——r2 满基准 20 连败实测归因）；mid/grand 满档（正经目标） */
    var p = battleOdds(ws, { t: tName, power: (row ? row.power : 60) * (t2.mul || 1) });
    var win = Math.random() < p;
    var res = { ok: true, k: k, win: win, p: Math.round(p * 100) / 100 };
    if (win) {
      ws.stones = (ws.stones || 0) + t2.reward;
      ws.renown = clampInt((ws.renown || 0) + t2.fame, -1000, 1000, ws.renown || 0);
      res.loot = t2.reward;
    } else {
      ws.injury = Math.min(15, (ws.injury || 0) + 3 + (worldDayHash(ws, i + 1) % 3));
      ws.renown = clampInt((ws.renown || 0) - 5, -1000, 1000, ws.renown || 0);
      res.injury = ws.injury;
    }
    return res;
  }
  function escortTake(ws) {
    if (!ws) return { err: 'nows' };
    if (ws.escort) return { err: 'busy', steps: ws.escort.steps };
    if ((ws.stamina | 0) < 3) return { err: 'stamina' };
    ws.stamina -= 3;
    var pay = Math.min(40, 5 + (ws.realm | 0) * 5);
    ws.escort = { steps: 0, pay: pay };
    return { ok: true, pay: pay };
  }

  /* ── 师承系统（册217 P4 · 方案卷 §五之一）：MUD 师承链正典化 ──────────────────────
   * 拜师（侠名门槛按阵营：正 20 / 中 0 / 邪·隐 −50；引荐 = relations 该门人物 aff≥20 降 20）；
   * 学艺 learn（门派武学 = ARTS s 反查；品阶锁贡献 huang 0 / xuan 100 / di 300 / tian 600；
   *   耗贡献同值 + 精力 5 → artsKnown 增一部）；辈分 = 贡献阶梯五档（派生不进档）；
   * 师门任务（精力 3 → 贡献 +20~40 确定性）；供奉（10 文 = 1 贡献）；
   * 叛门（renown −80 + betrayed 标志——追杀事件链随 P5 世界事件层）。 */
  var SECT_GATE = { zheng: 20, zhong: 0, xie: -50, yin: -50 };
  var ART_TIER_COST = { huang: 0, xuan: 100, di: 300, tian: 600 };
  var RANK_LADDER = [0, 100, 300, 600, 1000];
  function sectCamp(sectId) {
    var S = (D && D.SECTS) || [];
    for (var i = 0; i < S.length; i++) if (S[i].id === sectId) return S[i].camp;
    return null;
  }
  function joinSect(ws, sectId) {
    if (!ws) return { err: 'nows' };
    if (ws.sect && ws.sect.id && !ws.sect.betrayed) return { err: 'joined', sect: ws.sect.id };
    var camp = sectCamp(sectId);
    if (!camp) return { err: 'nosect' };
    var gate = SECT_GATE[camp] != null ? SECT_GATE[camp] : 0;
    var rel = ws.relations || {};
    for (var k in rel) {
      var c = CAST_INDEX[k];
      if (c && c.sec === sectId && isNum(rel[k].affinity) && rel[k].affinity >= 20) gate -= 20;   /* 引荐降档 */
    }
    if ((ws.renown || 0) < gate) return { err: 'renown', gate: gate, have: ws.renown || 0 };
    if ((ws.stamina | 0) < 5) return { err: 'stamina' };
    ws.stamina -= 5;
    ws.sect = { id: sectId, rank: 0, contribution: 0, joinedAt: ws.worldDay || 0, betrayed: false };
    return { ok: true, sect: sectId };
  }
  function sectRankOf(contribution) {
    var r = 0;
    for (var i = 0; i < RANK_LADDER.length; i++) if ((contribution | 0) >= RANK_LADDER[i]) r = i;
    return r;
  }
  function artsOfSectFn(sid) {
    var A = (D && D.ARTS) || [];
    var out = [];
    for (var i = 0; i < A.length; i++) if ((A[i].s || []).indexOf(sid) >= 0) out.push(A[i].i);
    return out;
  }
  function learnableArts(ws) {
    if (!ws.sect || !ws.sect.id) return [];
    var ids = artsOfSectFn(ws.sect.id);
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var a = ART_INDEX[ids[i]];
      if (!a) continue;
      var cost = ART_TIER_COST[a.t] != null ? ART_TIER_COST[a.t] : 100;
      out.push({ id: ids[i], t: a.t, cost: cost, known: (ws.artsKnown || []).indexOf(ids[i]) >= 0 });
    }
    return out;
  }
  /* 设置页自动开关（册240）：只填空位，不顶替玩家已选——自动是省手，不是替人做主。 */
  function autoSlotArt(ws, artId) {
    if (!ws || !ws.autoSlotArt) return;
    var slots = arr(ws.artsSlots);
    if (slots.length >= 6 || slots.indexOf(artId) >= 0) return;
    slots.push(artId);
    ws.artsSlots = slots;
  }
  function autoEquipGear(ws, slot, id) {
    if (!ws || !ws.autoEquipGear) return;
    ws.gear = obj(ws.gear);
    if (ws.gear[slot] && ws.gear[slot].i) return;   /* 已有着装：留给玩家自己换 */
    var st = arr(ws.stash);
    var at = st.indexOf(id);
    if (at < 0) return;
    st.splice(at, 1);
    ws.stash = st;
    ws.gear[slot] = { i: id };
  }
  function learnArt(ws, artId) {
    if (!ws || !ws.sect || !ws.sect.id) return { err: 'nosect' };
    var a = ART_INDEX[artId];
    if (!a || (a.s || []).indexOf(ws.sect.id) < 0) return { err: 'notmine' };
    if ((ws.artsKnown || []).indexOf(artId) >= 0) return { err: 'known' };
    var cost = ART_TIER_COST[a.t] != null ? ART_TIER_COST[a.t] : 100;
    if ((ws.sect.contribution | 0) < cost) return { err: 'contribution', need: cost, have: ws.sect.contribution | 0 };
    if ((ws.stamina | 0) < 5) return { err: 'stamina' };
    ws.stamina -= 5;
    ws.sect.contribution -= cost;
    ws.artsKnown = (ws.artsKnown || []).concat([artId]);
    ws.artsLevels = obj(ws.artsLevels); ws.artsLevels[artId] = 1;
    autoSlotArt(ws, artId);
    return { ok: true, art: artId, layer: 1 };
  }
  function sectTask(ws) {
    if (!ws || !ws.sect || !ws.sect.id) return { err: 'nosect' };
    if ((ws.stamina | 0) < 3) return { err: 'stamina' };
    ws.stamina -= 3;
    var h = worldDayHash(ws, 77);
    var gain = 20 + (h % 21);
    ws.sect.contribution = (ws.sect.contribution | 0) + gain;
    var pay = 30 + (h % 40);
    ws.stones = (ws.stones || 0) + pay;
    ws.sect.rank = sectRankOf(ws.sect.contribution);
    return { ok: true, contribution: gain, pay: pay };
  }
  function donateSect(ws, wen) {
    if (!ws || !ws.sect || !ws.sect.id) return { err: 'nosect' };
    var n = Math.floor(isNum(wen) ? wen : 0);
    if (n <= 0 || (ws.stones || 0) < n) return { err: 'stones', have: Math.floor(ws.stones || 0) };
    ws.stones -= n;
    ws.sect.contribution = (ws.sect.contribution | 0) + Math.floor(n / 10);
    ws.sect.rank = sectRankOf(ws.sect.contribution);
    return { ok: true, contribution: Math.floor(n / 10) };
  }
  function betraySect(ws) {
    if (!ws || !ws.sect || !ws.sect.id) return { err: 'nosect' };
    if (ws.sect.betrayed) return { err: 'betrayed' };
    ws.renown = clampInt((ws.renown || 0) - 80, -1000, 1000, ws.renown || 0);
    ws.sect.betrayed = true;
    return { ok: true, renown: ws.renown };
  }

  /* ── 市集（册217 P6 · 方案卷 §八 坊市恢复）：静态货架 + 秘籍三途之一（稀有格）──────
   * 册227：两件兵刃改走 WEAPONS 表（id `wp_tiedao`/`wp_haojian`，价 2 两/20 两照数值卷 §七）；
   * 买入不再直接上身，改**入库**（stash）+ 入谱（blades）——上身是玩家的选择（行装页换上）。 */
  var SHOP_LIST = [
    { i: 'shop_salve', kind: 'salve', cost: 50, heal: 2 },      /* 金疮药：内伤 −2 */
    { i: 'shop_ginseng', kind: 'salve', cost: 5000, heal: 8 },  /* 老山参 5 两：内伤 −8 */
    { i: 'wp_tiedao', kind: 'gear', slot: 'weapon', cost: 2000 },   /* 铁刀 2 两（寻常 1.00） */
    { i: 'wp_haojian', kind: 'gear', slot: 'weapon', cost: 20000 }, /* 好剑 20 两（好兵刃 1.10） */
    /* 行头三件（册230）：各 2 两——三槽是「功能位」，不做价格梯度（梯度留给兵刃与名兵） */
    { i: 'gm_xiujian', kind: 'misc', slot: 'ranged', cost: 2000 },
    { i: 'gm_ruanjia', kind: 'misc', slot: 'armor', cost: 2000 },
    { i: 'gm_kuaixue', kind: 'misc', slot: 'boots', cost: 2000 },
    { i: 'mnl_01', kind: 'manual', cost: 30000 },               /* 秘籍稀有格（MANUALS 抽三） */
    { i: 'mnl_05', kind: 'manual', cost: 45000 },
    { i: 'mnl_09', kind: 'manual', cost: 60000 }
  ];
  function buyItem(ws, itemId) {
    var it = null;
    for (var i = 0; i < SHOP_LIST.length; i++) if (SHOP_LIST[i].i === itemId) { it = SHOP_LIST[i]; break; }
    if (!it) return { err: 'noitem' };
    if ((ws.stones || 0) < it.cost) return { err: 'stones', need: it.cost, have: Math.floor(ws.stones || 0) };
    ws.stones -= it.cost;
    if (it.kind === 'salve') {
      ws.injury = Math.max(0, (ws.injury || 0) - it.heal);
      return { ok: true, kind: 'salve', heal: it.heal };
    }
    if (it.kind === 'gear') {
      if (!weaponRow(it.i)) return { err: 'badgear' };
      ws.stash = arr(ws.stash); ws.stash.push(it.i);
      ws.blades = arr(ws.blades); if (ws.blades.indexOf(it.i) < 0) ws.blades.push(it.i);
      autoEquipGear(ws, 'weapon', it.i);
      return { ok: true, kind: 'gear', slot: it.slot, item: it.i };
    }
    if (it.kind === 'misc') {
      /* 行头（册230）：入兵器库，不上谱（谱只收名兵）、也不上战力 */
      if (!miscRow(it.i)) return { err: 'badgear' };
      ws.stash = arr(ws.stash); ws.stash.push(it.i);
      autoEquipGear(ws, it.slot, it.i);
      return { ok: true, kind: 'misc', slot: it.slot, item: it.i };
    }
    if (it.kind === 'manual') {
      ws.shelf = arr(ws.shelf);
      ws.shelf.push(it.i);
      return { ok: true, kind: 'manual', manual: it.i };
    }
    return { err: 'kind' };
  }
  /* 研读秘籍（shelf → artsKnown）：耗精力 2；MANUALS art 必指真招式（册156 口径） */
  function studyManual(ws, manualId) {
    var M = (D && D.MANUALS) || [];
    var m = null;
    for (var i = 0; i < M.length; i++) if (M[i].i === manualId) { m = M[i]; break; }
    if (!m) return { err: 'nomanual' };
    var shelf = arr(ws.shelf);
    var at = shelf.indexOf(manualId);
    if (at < 0) return { err: 'notowned' };
    if ((ws.stamina | 0) < 2) return { err: 'stamina' };
    var artId = m.art;
    if (!ART_INDEX[artId]) return { err: 'badart' };
    ws.stamina -= 2;
    shelf.splice(at, 1);
    ws.shelf = shelf;
    if ((ws.artsKnown || []).indexOf(artId) < 0) {
      ws.artsKnown = (ws.artsKnown || []).concat([artId]);
      ws.artsLevels = obj(ws.artsLevels); ws.artsLevels[artId] = 1;
      autoSlotArt(ws, artId);
    }
    return { ok: true, art: artId };
  }

  /* ── 行装（册227 · G4 兵器槽 + G15 神兵谱）────────────────────────────────────
   * 装备口只动 gear[slot] 与 stash 两处：旧件回库、新件出库，**不做强制上身**（玩家自己选）。
   * 神兵谱（blades）是**收集面**：到手即记，卸下不减——与 MANUALS 的 shelf（物品层）分得开，
   * 谱上「有」不等于「在手」（谱只回答「见过/得过的名兵」，战力只看 gear.weapon）。 */
  function bladeProgress(ws) {
    var G = (D && D.WEAPONS) || [];
    var own = arr(ws && ws.blades);
    var total = 0, got = 0;
    for (var i = 0; i < G.length; i++) {
      if (G[i].k !== 2) continue;                 /* 谱只收名兵（寻常/好兵刃属行货，不上谱） */
      total++;
      if (own.indexOf(G[i].i) >= 0) got++;
    }
    return { owned: got, total: total };
  }
  function equipGear(ws, slot, id) {
    if (!ws) return { err: 'nows' };
    var okSlot = false;
    for (var i = 0; i < GEAR_SLOTS.length; i++) if (GEAR_SLOTS[i] === slot) okSlot = true;
    if (!okSlot) return { err: 'noslot' };
    ws.gear = obj(ws.gear);
    var curId = ws.gear[slot] && ws.gear[slot].i ? ws.gear[slot].i : null;
    var st = arr(ws.stash);
    if (!id) {                                     /* 卸下：在手件回库 */
      if (!curId) return { err: 'empty' };
      ws.gear[slot] = null;
      st.push(curId);
      ws.stash = st;
      return { ok: true, slot: slot, id: null, off: curId };
    }
    var row = gearRow(id);
    if (!row) return { err: 'badgear' };
    /* 槽位必须与件自身归属一致（暗器穿不到脚上）：兵刃无 slot 字段 ⇒ 默认 weapon，行头按 slot */
    if ((row.slot || 'weapon') !== slot) return { err: 'badslot' };
    var at = st.indexOf(id);
    if (at < 0) return { err: 'notowned' };
    st.splice(at, 1);
    if (curId) st.push(curId);                     /* 换手：旧的回库，不消失 */
    ws.stash = st;
    ws.gear[slot] = { i: id };
    return { ok: true, slot: slot, id: id, off: curId };
  }
  /* 夺兵（数值卷 §七「名兵多半不卖，只送或抢」的「抢」）：胜战按对手档掷。
   * 判点用 worldDay 散列 h（不另掷 Math.random）⇒ 同 (worldDay, salt, 地界) 可复现、判据可直测。
   * 命中从名兵池按 h 取一件：未收 → 入谱 + 入库；已收 → 折价给银（不重复入谱）。 */
  var BLADE_RATE = { huang: 0, xuan: 2, di: 6, tian: 12 };   /* 百分点：杂鱼不携名兵 */
  function bladeDrop(ws, foeT, h) {
    if (!ws) return null;
    var rate = BLADE_RATE[foeT] | 0;
    if (!rate) return null;
    if (((h >>> 3) % 100) >= rate) return null;
    var G = (D && D.WEAPONS) || [];
    var pool = [];
    for (var i = 0; i < G.length; i++) if (G[i].k === 2) pool.push(G[i].i);
    if (!pool.length) return null;
    var id = pool[(h >>> 5) % pool.length];
    var own = arr(ws.blades);
    if (own.indexOf(id) >= 0) {                    /* 谱上已有：旧兵折价 */
      var cash = 100 + ((h >>> 7) % 5) * 50;
      ws.stones = (ws.stones || 0) + cash;
      return { id: id, dupe: true, cash: cash };
    }
    own.push(id);
    ws.blades = own;
    var st = arr(ws.stash); st.push(id);
    ws.stash = st;
    autoEquipGear(ws, 'weapon', id);
    return { id: id, dupe: false };
  }

  /* ── 世界事件层（册218 P5 schema 落码 + 册221 首批 20 案补满 · 世界事件卷 §六/§七/§八）────
   * 20 案 = 正典名录首批全量；schema 简化：z 主场（ZONES id ∪ null=江湖页入口）/ tier 门槛 /
   * br canon|alt / pre 轻链 / gain 奖励。参与四档压缩为三入口：旁观（无门槛精力 3）/ 卷入 join /
   * 主导 lead（更高门槛，alt 改史仅此档）。写回 = wefate（事件 id → 结果键，只存结果键）+ renown。
   * 册221 顺手修 watch 档形状：原 `watch: 8` 数字在 `g.exp || 8` 读法下从未差异化生效（A8 同型
   * 静默失效）→ 统一改 `{ exp: N }` 对象形状，读法零改动。KNOTS 场面执行器挂接（正典 §八 挂接列）
   * 与惯例型窗口字段（§四）未落码，余量待后续批——本批只落声明层与文案层。 */
  var WORLD_EVENTS = [
    { i: 'we_huashan', z: null, knot: 'knot_huashan', cyc: 6, tier: { join: 3, lead: 6 }, pre: [], boss: 'huang_yaoshi', reward: { kind: 'art', id: 'yg_jiuyin' }, gain: { watch: { exp: 8 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 60, stones: 5000 } } },
    { i: 'we_xiangyang', z: null, knot: 'knot_xiangyang', window: [0, 8], tier: { join: 3, lead: 5 }, pre: [], boss: 'guo_jing', reward: { kind: 'art', id: 'yg_xianglong' }, gain: { watch: { exp: 8 }, join: { exp: 25, renown: 20 }, lead: { exp: 45, renown: 40, stones: 3000 } } },
    { i: 'we_weijiao_gm', z: 'guangmingding', knot: 'knot_weijiao', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'zhang_wuji', reward: { kind: 'art', id: 'yg_qiankun' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 45, stones: 4000 } } },
    { i: 'we_juxian', z: 'luoyang', knot: 'knot_juxian', window: [0, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'xiao_feng', reward: { kind: 'art', id: 'yg_dagou' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 10 }, lead: { exp: 45, renown: 30, stones: 2000 } } },
    { i: 'we_shaoshishan', z: 'shaolin', knot: 'knot_saodi', window: [2, 8], tier: { join: 4, lead: 6 }, pre: ['we_juxian'], boss: 'xu_zhu', reward: { kind: 'art', id: 'yg_liumai' }, gain: { watch: { exp: 10 }, join: { exp: 30, renown: 20 }, lead: { exp: 50, renown: 45, stones: 3000 } } },
    { i: 'we_zhenlong', z: 'wuliang', knot: 'knot_zhenlong', window: [1, 7], tier: { join: 1, lead: 5 }, pre: [], boss: 'ding_chunqiu', reward: { kind: 'art', id: 'yg_lingbo' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 5 }, lead: { exp: 50, renown: 10, stones: 0 } } },
    { i: 'we_yanmen', z: 'yanmenguan', knot: 'knot_yanmen', window: [2, 8], tier: { join: 4, lead: 7 }, pre: ['we_juxian'], boss: 'xiao_longn', reward: { kind: 'art', id: 'yg_yijin' }, gain: { watch: { exp: 12 }, join: { exp: 30, renown: 25 }, lead: { exp: 60, renown: 60, stones: 0 } } },
    { i: 'we_tushi', z: 'shaolin', knot: 'knot_tushi', window: [3, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'xie_xun', reward: { kind: 'blade', id: 'wp_yitian' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 10 }, lead: { exp: 45, renown: 35, stones: 3000 } } },
    { i: 'we_wuyue_bingpai', z: 'songshan', knot: 'knot_fengchan', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'yue_buqun', reward: { kind: 'manual', id: 'mnl_03' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 45, renown: 40, stones: 3000 } } },
    { i: 'we_heimu', z: null, knot: 'knot_heimu', window: [3, 8], tier: { join: 4, lead: 7 }, pre: ['we_wuyue_bingpai'], boss: 'dongfang_bubai', reward: { kind: 'manual', id: 'mnl_05' }, gain: { watch: { exp: 12 }, join: { exp: 30, renown: 20 }, lead: { exp: 60, renown: 60, stones: 6000 } } },
    { i: 'we_xiake', z: null, knot: 'knot_xiake', cyc: 1, tier: { join: 2, lead: 5 }, pre: [], boss: 'shi_poitian', reward: { kind: 'art', id: 'yg_dugu' }, gain: { watch: { exp: 10 }, join: { exp: 20, renown: 10 }, lead: { exp: 45, renown: 20, stones: 2000 } } },
    { i: 'we_shagui', z: 'luoyang', knot: 'knot_shagui', cyc: 3, tier: { join: 2, lead: 4 }, pre: [], boss: 'hong_antong', reward: { kind: 'blade', id: 'wp_jinshe' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 15 }, lead: { exp: 40, renown: 30, stones: 1500 } } },
    { i: 'we_wangpan', z: null, knot: 'knot_wangpan', window: [0, 2], tier: { join: 1, lead: 4 }, pre: [], boss: 'xie_xun', reward: { kind: 'blade', id: 'wp_tulong' }, gain: { watch: { exp: 8 }, join: { exp: 15, renown: 10 }, lead: { exp: 35, renown: 20, stones: 2500 } } },
    { i: 'we_jueqinggu', z: null, knot: 'knot_jueqinggu', window: [1, 7], tier: { join: 2, lead: 5 }, pre: [], boss: 'yang_guo', reward: { kind: 'blade', id: 'wp_junzi' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 25, stones: 1000 } } },
    { i: 'we_liuheta', z: null, knot: 'knot_liuheta', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'chen_jialuo', reward: { kind: 'blade', id: 'wp_ningbi' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 45, renown: 35, stones: 2000 } } },
    { i: 'we_chuangwang', z: null, knot: 'knot_chuangwang', window: [1, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'hu_fei', reward: { kind: 'blade', id: 'wp_lengyue' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 25, stones: 4000 } } },
    { i: 'we_liancheng', z: null, knot: 'knot_liancheng', window: [0, 6], tier: { join: 1, lead: 4 }, pre: [], boss: 'hua_tiegan', reward: { kind: 'manual', id: 'mnl_11' }, gain: { watch: { exp: 8 }, join: { exp: 15, renown: 5 }, lead: { exp: 35, renown: 15, stones: 3500 } } },
    { i: 'we_jiaozhu', z: 'guangmingding', knot: 'knot_jiaozhu', window: [3, 8], tier: { join: 4, lead: 6 }, pre: ['we_weijiao_gm'], boss: 'ren_woxing', reward: { kind: 'art', id: 'yg_jiuyang' }, gain: { watch: { exp: 10 }, join: { exp: 30, renown: 25 }, lead: { exp: 55, renown: 55, stones: 0 } } },
    { i: 'we_cangjing', z: 'shaolin', knot: 'knot_cangjing', window: [1, 8], tier: { join: 3, lead: 6 }, pre: [], boss: 'xiao_longn', reward: { kind: 'manual', id: 'mnl_04' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 40, stones: 2000 } } },
    { i: 'we_huanshi', z: 'yanziwu', knot: 'knot_huanshi', window: [1, 6], tier: { join: 3, lead: 4 }, pre: [], boss: 'murong_fu', reward: { kind: 'manual', id: 'mnl_06' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 40, stones: 3000 } } },
    /* 册253 · 二批 16 案（世界事件卷 §八 二批名录入码）：补十五部覆盖，全部独发窗口；
     * 窗口终点按 lead 档分级（lead≤4→year6 / 5→year7 / ≥6→year8，与首批同口径）；
     * 主奖励取首批未用尽的名兵 / 秘籍 / 天阶武学，boss 全部落 CAST。 */
    { i: 'we_siguoya', z: null, knot: 'knot_siguoya', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'feng_qingyang', reward: { kind: 'blade', id: 'wp_xuantie' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 5 }, lead: { exp: 40, renown: 20, stones: 1000 } } },
    { i: 'we_taishan', z: null, knot: 'knot_taishan', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'ding_yi', reward: { kind: 'manual', id: 'mnl_08' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 42, renown: 25, stones: 2000 } } },
    { i: 'we_junshan', z: null, knot: 'knot_junshan', window: [0, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'hong_qigong', reward: { kind: 'blade', id: 'wp_dagou' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 15 }, lead: { exp: 40, renown: 30, stones: 1500 } } },
    { i: 'we_chongyang', z: null, knot: 'knot_chongyang', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'ouyang_feng', reward: { kind: 'manual', id: 'mnl_01' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 40, stones: 2500 } } },
    { i: 'we_tiezhang', z: null, knot: 'knot_tiezhang', window: [0, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'qiu_qianren', reward: { kind: 'manual', id: 'mnl_15' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 38, renown: 25, stones: 1500 } } },
    { i: 'we_jueding', z: 'yanfulou', knot: 'knot_jueding', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'huang_yaoshi', reward: { kind: 'blade', id: 'wp_yuxiao' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 45, renown: 35, stones: 2000 } } },
    { i: 'we_lingjiu', z: 'lingshe', knot: 'knot_lingjiu', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'tonglao', reward: { kind: 'art', id: 'mn_008' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 20 }, lead: { exp: 50, renown: 45, stones: 2000 } } },
    { i: 'we_taixuan', z: null, knot: 'knot_taixuan', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'zhang_san', reward: { kind: 'art', id: 'mn_014' }, gain: { watch: { exp: 12 }, join: { exp: 30, renown: 20 }, lead: { exp: 55, renown: 50, stones: 0 } } },
    { i: 'we_xueshan', z: 'kunlun', knot: 'knot_xueshan', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'bai_zizai', reward: { kind: 'blade', id: 'wp_lvbo' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 42, renown: 25, stones: 1500 } } },
    { i: 'we_xuedao', z: 'kunlun', knot: 'knot_xuedao', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'feng_wanli', reward: { kind: 'manual', id: 'mnl_14' }, gain: { watch: { exp: 8 }, join: { exp: 22, renown: 10 }, lead: { exp: 42, renown: 30, stones: 2000 } } },
    { i: 'we_wudu', z: 'dali', knot: 'knot_wudu', window: [2, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'ding_chunqiu', reward: { kind: 'blade', id: 'wp_ezui' }, gain: { watch: { exp: 8 }, join: { exp: 22, renown: 10 }, lead: { exp: 42, renown: 25, stones: 2000 } } },
    { i: 'we_wenjia', z: 'yanfulou', knot: 'knot_wenjia', window: [0, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'hu_fei', reward: { kind: 'blade', id: 'wp_bixue' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 25, stones: 1500 } } },
    { i: 'we_siguofengbo', z: null, knot: 'knot_siguofengbo', window: [1, 6], tier: { join: 2, lead: 4 }, pre: [], boss: 'yue_buqun', reward: { kind: 'art', id: 'yg_dugu' }, gain: { watch: { exp: 8 }, join: { exp: 20, renown: 10 }, lead: { exp: 40, renown: 30, stones: 1500 } } },
    { i: 'we_dalun', z: 'kunlun', knot: 'knot_dalun', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'he_taichong', reward: { kind: 'art', id: 'mn_001' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 15 }, lead: { exp: 50, renown: 45, stones: 2000 } } },
    { i: 'we_binghuo', z: 'binghuo', knot: 'knot_binghuo', window: [2, 8], tier: { join: 4, lead: 6 }, pre: [], boss: 'xie_xun', reward: { kind: 'blade', id: 'wp_tulong' }, gain: { watch: { exp: 10 }, join: { exp: 25, renown: 20 }, lead: { exp: 50, renown: 50, stones: 3000 } } },
    { i: 'we_shenlong', z: null, knot: 'knot_shenlong', window: [1, 7], tier: { join: 3, lead: 5 }, pre: [], boss: 'hong_antong', reward: { kind: 'blade', id: 'wp_yuanyang' }, gain: { watch: { exp: 8 }, join: { exp: 22, renown: 15 }, lead: { exp: 44, renown: 35, stones: 2500 } } }
  ];
  /* 写回四写口（册236 · 世界事件卷 §五）：首批只给 §九 八案声明（逐案白名单，不开放全 CAST）。
   * ① cast 人物生死/去向（白名单短码 dead/flee/secluded/saved）② sects 门派声望增量
   * ③ rumor + ④ next 合并成一条「余波」句（展示面，不链式触发）——只存短码/数值，叙述走词表。 */
  var WB_STATE = { dead: 1, flee: 1, secluded: 1, saved: 1 };
  var WRITEBACK = {
    we_huashan: {
      canon: { sects: { huashan: 5 } },
      alt: { sects: { huashan: -5, wudang: 3 } }
    },
    we_xiangyang: {
      canon: { sects: { quanzhen: -5, gaibang: -5, shaolin: -3 } },
      alt: { sects: { quanzhen: 8, gaibang: 8, shaolin: 5 } }
    },
    we_weijiao_gm: {
      canon: { sects: { mingjiao: -40, shaolin: 10, wudang: 10, huashan: 10, kunlun: 10, kongtong: 10, emei: 10 }, next: ['we_jiaozhu'] },
      alt: { sects: { mingjiao: 50, shaolin: -10, wudang: -10, huashan: -10 }, close: ['we_jiaozhu'] }
    },
    we_juxian: {
      canon: { cast: { xiao_feng: 'flee' }, sects: { gaibang: -20 } },
      alt: { cast: { xiao_feng: 'flee' }, sects: { gaibang: -10 } }
    },
    we_yanmen: {
      canon: { cast: { xiao_feng: 'dead' }, sects: { gaibang: -10, shaolin: -5, wudang: -5 } },
      alt: { cast: { xiao_feng: 'secluded' }, sects: { gaibang: 5 } }
    },
    we_zhenlong: {
      canon: { sects: { shaolin: 5 } },
      alt: { sects: { xiaoyao: 10 } }
    },
    we_tushi: {
      canon: { sects: { shaolin: -10, wudang: -10, emei: -10 } },
      alt: { sects: { shaolin: 3, wudang: 3 } }
    },
    we_heimu: {
      canon: { cast: { dongfang_bubai: 'flee' }, sects: { riyue: -10 } },
      alt: { cast: { dongfang_bubai: 'dead' }, sects: { riyue: -30, shaolin: 10, wudang: 10, huashan: 10 } }
    },
    /* 册238：其余 12 案补齐（现役 20 案全覆盖；非 §九 重点案的写回只动门派声望，不扩 cast 白名单） */
    we_shaoshishan: {
      canon: { sects: { shaolin: -5, gaibang: -5 } },
      alt: { sects: { shaolin: 5, gaibang: 5 } }
    },
    we_wuyue_bingpai: {
      canon: { sects: { songshan: 15, taishan: -5, hengshan_n: -5, hengshan: -5, huashan: -5 }, next: ['we_heimu'] },
      alt: { sects: { songshan: -10, huashan: 5 }, close: ['we_heimu'] }
    },
    we_xiake: {
      canon: { sects: {} },
      alt: { sects: { xiaoyao: 5 } }
    },
    we_shagui: {
      canon: { sects: { tiandihui: 10, honghuahui: 5 } },
      alt: { sects: { tiandihui: 5 } }
    },
    we_wangpan: {
      canon: { sects: { riyue: -5 } },
      alt: { sects: { riyue: -10 } }
    },
    we_jueqinggu: {
      canon: { sects: { quanzhen: -3 } },
      alt: { sects: { quanzhen: 5, gumu: 5 } }
    },
    we_liuheta: {
      canon: { sects: { honghuahui: -5 } },
      alt: { sects: { honghuahui: 10 } }
    },
    we_chuangwang: {
      canon: { sects: {} },
      alt: { sects: { tiandihui: 5 } }
    },
    we_liancheng: {
      canon: { sects: {} },
      alt: { sects: { xuedao: 5 } }
    },
    we_jiaozhu: {
      canon: { sects: { mingjiao: 5 } },
      alt: { sects: { mingjiao: 20 } }
    },
    we_cangjing: {
      canon: { sects: { shaolin: -10 } },
      alt: { sects: { shaolin: 10 } }
    },
    we_huanshi: {
      canon: { sects: { murong: -5 } },
      alt: { sects: { murong: -10, xiaoyao: 5 } }
    },
    /* 册253：二批 16 案写回（只动门派声望，不扩 cast 白名单） */
    we_siguoya: {
      canon: { sects: { huashan: 5 } },
      alt: { sects: { huashan: -5 } }
    },
    we_taishan: {
      canon: { sects: { songshan: 10, taishan: -3 } },
      alt: { sects: { taishan: 8, songshan: -5 } }
    },
    we_junshan: {
      canon: { sects: { gaibang: -10 } },
      alt: { sects: { gaibang: 10 } }
    },
    we_chongyang: {
      canon: { sects: { quanzhen: -10 } },
      alt: { sects: { quanzhen: 10, gumu: 5 } }
    },
    we_tiezhang: {
      canon: { sects: { tiezhang: 10 } },
      alt: { sects: { tiezhang: -10, gaibang: 5 } }
    },
    we_jueding: {
      canon: { sects: { taohua: 5 } },
      alt: { sects: { taohua: -5, quanzhen: 5 } }
    },
    we_lingjiu: {
      canon: { sects: { lingjiu: -5 } },
      alt: { sects: { lingjiu: 10, xiaoyao: 5 } }
    },
    we_taixuan: {
      canon: { sects: { xiake: 5 } },
      alt: { sects: { xiake: 10 } }
    },
    we_xueshan: {
      canon: { sects: { xueshan: -10 } },
      alt: { sects: { xueshan: 10 } }
    },
    we_xuedao: {
      canon: { sects: { xuedao: 10, xueshan: -5 } },
      alt: { sects: { xuedao: -10, xueshan: 5 } }
    },
    we_wudu: {
      canon: { sects: { xingxiu: 5 } },
      alt: { sects: { xingxiu: -10, dali: 5 } }
    },
    we_wenjia: {
      canon: { sects: { honghuahui: -5 } },
      alt: { sects: { honghuahui: 5 } }
    },
    we_siguofengbo: {
      canon: { sects: { huashan: -5 } },
      alt: { sects: { huashan: 5 } }
    },
    we_dalun: {
      canon: { sects: { shaolin: -10 } },
      alt: { sects: { shaolin: 5, xueshan: 5 } }
    },
    we_binghuo: {
      canon: { sects: { shaolin: -3 } },
      alt: { sects: { shaolin: 3 } }
    },
    we_shenlong: {
      canon: { sects: { shenlong: 10 } },
      alt: { sects: { shenlong: -10, tiandihui: 5 } }
    }
  };
  function applyWriteback(ws, e, outcome) {
    if (!ws || !e || !WRITEBACK[e.i]) return null;
    var okey = outcome === 'alt' ? 'alt' : 'canon';
    var wb = WRITEBACK[e.i][okey];
    if (!wb) return null;
    ws.world = obj(ws.world);
    /* 一场（惯例型按本届）只写一次：同事件同结果重复调用不叠门派声望/余波 */
    var tok = e.i + ':' + okey + (e.cyc ? ':' + Math.floor(worldYearOf(ws) / e.cyc) : '');
    var after = arr(ws.world.wafter);
    if (after.indexOf(tok) >= 0) return wb;
    if (wb.cast) {
      var cast = obj(ws.world.wbcast);
      for (var cid in wb.cast) if (WB_STATE[wb.cast[cid]]) cast[cid] = wb.cast[cid];
      ws.world.wbcast = cast;
    }
    if (wb.sects) {
      var rep = obj(ws.world.wbsect);
      for (var sid in wb.sects) rep[sid] = clampInt((rep[sid] | 0) + wb.sects[sid], -100, 100, 0);
      ws.world.wbsect = rep;
    }
    after.push(tok);
    ws.world.wafter = after.slice(-20);
    return wb;
  }
  function castStateOf(ws, id) { return obj(ws && ws.world && ws.world.wbcast)[id] || null; }
  function sectRepOf(ws, id) { return obj(ws && ws.world && ws.world.wbsect)[id] | 0; }
  function aftermathOf(ws) {
    var out = [], wa = arr(ws && ws.world && ws.world.wafter);
    for (var i = 0; i < wa.length; i++) {
      var p = String(wa[i]).split(':');
      if (p[0] && (p[1] === 'alt' || p[1] === 'canon')) out.push({ i: p[0], outcome: p[1] });
    }
    return out;
  }
  function wefateOf(ws) { return obj(ws.world && ws.world.wefate); }
  /* 逐案失败代价（册237 · 世界事件卷 §六 `fail` 字段）：只覆盖 lead 档，join 维持轻败常量。
   * 主题差：论剑败者不掉名（+20「虽败犹荣」）· 黑木崖代价最重（伤 5~7 / 名 −40~−30）。 */
  var FAIL = {
    we_huashan: { injury: [4, 6], renown: [20, 20] },
    we_xiangyang: { injury: [3, 5], renown: [-20, -10] },
    we_weijiao_gm: { injury: [2, 5], renown: [-30, -15] },
    we_juxian: { injury: [3, 6], renown: [-30, -20] },
    we_yanmen: { injury: [4, 6], renown: [-20, -10] },
    we_zhenlong: { injury: [4, 4], renown: [-10, -5] },
    we_tushi: { injury: [2, 5], renown: [-30, -20] },
    we_heimu: { injury: [5, 7], renown: [-40, -30] },
    /* 册238：其余 12 案补齐（全 20 案 lead 档都有逐案代价） */
    we_shaoshishan: { injury: [4, 6], renown: [-30, -20] },
    we_wuyue_bingpai: { injury: [3, 5], renown: [-25, -15] },
    we_xiake: { injury: [3, 5], renown: [-20, -10] },
    we_shagui: { injury: [2, 4], renown: [-20, -10] },
    we_wangpan: { injury: [3, 5], renown: [-25, -15] },
    we_jueqinggu: { injury: [3, 4], renown: [-15, -5] },
    we_liuheta: { injury: [3, 5], renown: [-30, -20] },
    we_chuangwang: { injury: [2, 5], renown: [-20, -10] },
    we_liancheng: { injury: [2, 5], renown: [-20, -10] },
    we_jiaozhu: { injury: [3, 6], renown: [-30, -20] },
    we_cangjing: { injury: [3, 5], renown: [-25, -15] },
    we_huanshi: { injury: [2, 4], renown: [-20, -10] },
    /* 册253：二批 16 案 lead 代价 */
    we_siguoya: { injury: [3, 5], renown: [-25, -15] },
    we_taishan: { injury: [3, 5], renown: [-25, -15] },
    we_junshan: { injury: [2, 5], renown: [-20, -10] },
    we_chongyang: { injury: [4, 6], renown: [-30, -20] },
    we_tiezhang: { injury: [3, 6], renown: [-30, -20] },
    we_jueding: { injury: [3, 5], renown: [-25, -15] },
    we_lingjiu: { injury: [3, 6], renown: [-30, -20] },
    we_taixuan: { injury: [3, 6], renown: [-30, -20] },
    we_xueshan: { injury: [3, 5], renown: [-25, -15] },
    we_xuedao: { injury: [4, 6], renown: [-30, -20] },
    we_wudu: { injury: [2, 5], renown: [-20, -10] },
    we_wenjia: { injury: [2, 5], renown: [-20, -10] },
    we_siguofengbo: { injury: [2, 4], renown: [-20, -10] },
    we_dalun: { injury: [4, 6], renown: [-30, -20] },
    we_binghuo: { injury: [4, 7], renown: [-40, -25] },
    we_shenlong: { injury: [3, 6], renown: [-30, -20] }
  };
  function failOf(e, mode) {
    var f = mode === 'lead' && e ? FAIL[e.i] : null;
    return {
      injury: f && arr(f.injury).length === 2 ? f.injury : (mode === 'join' ? JOIN_FAIL_INJURY : LEAD_FAIL_INJURY),
      renown: f && arr(f.renown).length === 2 ? f.renown : (mode === 'join' ? JOIN_FAIL_RENOWN : LEAD_FAIL_RENOWN)
    };
  }
  /* 窗口与届次（册223 · 世界事件卷 §四）：worldDay 360 天 = 1 游戏年。
   * 惯例型 cyc（游戏年）＝周期重开——本届（floor(年/cyc)）已赴则隐藏，跨届自动重现（wecyc 存届次）；
   * 独发型 window [y0,y1] ＝一次性条件窗——未到 y0 隐藏，滑过 y1 由 sweepExpired 按「江湖传言收场」落定（wefate=echo）。 */
  function worldYearOf(ws) { return Math.floor((ws.worldDay || 0) / 360); }
  function wecycOf(ws) { return obj(ws.world && ws.world.wecyc); }
  /* next 链式（册241 · 世界事件卷 §五 蝴蝶效应）：由**已了结事件的结局**派生，不落新字段。
   * canon/alt 的 `next` 显式开门、`close` 显式关门；lose/echo 按 canon 落定（与 applyWriteback 同口径）。
   * 返回 'open' / 'close' / null（未表态）——多案冲突时 close 优先（江湖关门比开门更硬）。 */
  function nextVerdict(ws, id) {
    var fate = wefateOf(ws), seenOpen = false;
    for (var eid in fate) {
      var wb = (WRITEBACK[eid] || {})[fate[eid] === 'alt' ? 'alt' : 'canon'];
      if (!wb) continue;
      if (arr(wb.close).indexOf(id) >= 0) return 'close';
      if (arr(wb.next).indexOf(id) >= 0) seenOpen = true;
    }
    return seenOpen ? 'open' : null;
  }
  function inWindow(ws, e) {
    var yr = worldYearOf(ws);
    if (e.cyc) return true;                                  /* 惯例型常驻（本届已赴由 wecyc 管） */
    if (!e.window) return true;
    return yr >= e.window[0] && yr <= e.window[1];
  }
  function sweepExpired(ws) {
    /* 独发型滑窗收场（错过 = 江湖没有等你）：wefate=echo（回声结局）+ 见闻封顶 +2 零奖励。
     * 只做数据面；回声正文由结局展示面读词表 we.<id>.echo。 */
    if (!ws || !ws.world) return 0;
    if (!ws.world.wefate) ws.world.wefate = {};   /* claim 的 obj(ws.world) 会造出无 wefate 的空壳 */
    var fate = wefateOf(ws), n = 0;
    for (var i = 0; i < WORLD_EVENTS.length; i++) {
      var e = WORLD_EVENTS[i];
      if (e.cyc || !e.window || fate[e.i]) continue;
      if (nextVerdict(ws, e.i) === 'close') continue;   /* 被上一案的结局关掉：不算「错过」，不落回声 */
      if (worldYearOf(ws) > e.window[1]) {
        ws.world.wefate[e.i] = 'echo';   /* 江湖没有等你：按 canon 落定为回声结局（见闻 +2 走 expOf 派生） */
        applyWriteback(ws, e, 'canon');  /* 错过也照样推进江湖格局（册236 · §五「按 canon 落定」） */
        n++;
      }
    }
    return n;
  }
  /* 棋盘结果回流（册259 · 世界事件卷 §五）：游戏侧只写本地结果队列，主壳回程时单写此口。
   * 终局只有两种——胜 = alt（亲手改史）/ 错过 = echo（按 canon 落定）；游戏内败局可重试，
   * 不是终局，故不回流。已写结局的事件直接拒绝，队列重放幂等。 */
  function applyResult(ws, id, outcome) {
    if (outcome !== 'alt' && outcome !== 'echo') return { err: 'badoutcome' };
    var e = null;
    for (var i = 0; i < WORLD_EVENTS.length; i++) if (WORLD_EVENTS[i].i === id) { e = WORLD_EVENTS[i]; break; }
    if (!e) return { err: 'noevent' };
    var fate = wefateOf(ws);
    if (e.cyc) {
      if (wecycOf(ws)[id] === Math.floor(worldYearOf(ws) / e.cyc)) return { err: 'dup' };
    } else if (fate[id]) return { err: 'dup' };
    if (outcome === 'echo' && nextVerdict(ws, id) === 'close') return { err: 'closed' };
    ws.world = obj(ws.world);
    if (!ws.world.wefate) ws.world.wefate = {};
    ws.world.wefate[id] = outcome;
    if (e.cyc) {
      if (!ws.world.wecyc) ws.world.wecyc = {};
      ws.world.wecyc[id] = Math.floor(worldYearOf(ws) / e.cyc);
    }
    applyWriteback(ws, e, outcome === 'alt' ? 'alt' : 'canon');
    ws.exp = expOf(ws);
    return { ok: true, outcome: outcome };
  }
  function worldEvents(ws) {
    var fate = wefateOf(ws), cyc = wecycOf(ws);
    var out = [];
    for (var i = 0; i < WORLD_EVENTS.length; i++) {
      var e = WORLD_EVENTS[i];
      var nv = nextVerdict(ws, e.i);
      if (nv === 'close') continue;          /* 蝴蝶效应关门（含惯例型） */
      if (e.cyc) {
        var cur = Math.floor(worldYearOf(ws) / e.cyc);
        if (cyc[e.i] === cur) continue;   /* 惯例型：本届已赴——跨届重开 */
      } else {
        if (fate[e.i]) continue;          /* 独发型：已写结局（含 echo 收场）不再出现 */
        if (!inWindow(ws, e)) continue;   /* 窗口未开 / 已滑窗（sweep 未及）隐藏 */
      }
      var preOk = true;
      for (var p2 = 0; p2 < (e.pre || []).length; p2++) if (!fate[e.pre[p2]]) preOk = false;
      if (!preOk && nv !== 'open') continue;   /* next 可越过 pre 直接开门 */
      out.push(e);
    }
    return out;
  }
  /* 旁观一次性（册235）：旁观不写结局（在场不落子），原本可反复点同一案刷见闻——
   * 按「本案本届」记 wseen（惯例型随届次重开，独发型终身一次）。只挡旁观档，join/lead 不受影响。 */
  function watchKeyOf(ws, e) { return e.cyc ? String(Math.floor(worldYearOf(ws) / e.cyc)) : '1'; }
  function watchDone(ws, e) {
    return !!(e && obj(ws && ws.world && ws.world.wseen)[e.i] === watchKeyOf(ws, e));
  }
  /* 地界侧事件入口（册235）：此地此刻可赴的世界事件（行走页挂一行「此地有大事」） */
  function worldEventsAt(ws, place) {
    var out = [];
    if (!place) return out;
    var all = worldEvents(ws);
    for (var i = 0; i < all.length; i++) if (all[i].z === place) out.push(all[i]);
    return out;
  }
  /* G17 传闻预告（册224 · 世界事件卷 §四）：独发型窗口将开（≤1 游戏年）进「江湖风闻」——
   * 密度渐增两档：days ≤ 30（1 游戏月）标 soon「在即」；惯例型常驻可赴（desc 常显）不进预告。
   * 已写结局 / 窗口已开的案不在预告（分别进结局区与可赴列表）。 */
  function worldRumors(ws) {
    var fate = wefateOf(ws), out = [];
    if (!ws) return out;
    var day = Math.floor(ws.worldDay || 0);   /* 整日（worldDay 含当日进度，册233） */
    for (var i = 0; i < WORLD_EVENTS.length; i++) {
      var e = WORLD_EVENTS[i];
      if (e.cyc || !e.window || fate[e.i]) continue;
      if (nextVerdict(ws, e.i) === 'close') continue;
      var days = e.window[0] * 360 - day;
      if (days > 0 && days <= 360) out.push({ i: e.i, days: days, soon: days <= 30 });
    }
    return out;
  }
  /* ── lead 即对赌（册228 · 世界事件卷 §三 / §六 fail / §七）──────────────────────
   * 主导档不是「点一下拿奖励」——对上主场 boss（`boss` = CAST id，tier 对表折算战力，
   * 数值卷 §六 同口径）三回合取两胜。判点走 Math.random：玩家主动操作不属章号散列面
   * （与强行冲关 / 悬赏委托同口径），三回合降方差不改胜负期望。
   * 败：败走窄路表 —— 内伤 +2~6、侠名 −20~40，且**不发放 gain 与主奖励**（不是惩罚演出，
   * 是事件的另一种结局：江湖记得败者）。 */
  var LEAD_FAIL_INJURY = [2, 6];
  var LEAD_FAIL_RENOWN = [-40, -20];
  /* 卷入档轻败（册231 · 世界事件卷 §三「join 风险 = 战败走窄路（轻）」）：
   * 卷入是「助拳 / 站队 / 护送」，不是单挑 ⇒ 对手战力按 0.7 折算（胜率高于主导档）；
   * 败了也只是被波及：内伤 1~3、侠名 −5~−10，**事件的走向不变**（你没资格改史）——
   * 结局照写 canon，见闻照发（人确实在场），只有侠名不给（败了没人替你扬名）。 */
  var JOIN_SCALE = 0.7;
  var JOIN_FAIL_INJURY = [1, 3];
  var JOIN_FAIL_RENOWN = [-10, -5];
  function leadDuel(ws, e, scale) {
    if (!e || !e.boss) return null;
    var C = (D && D.CAST) || [];
    var boss = null;
    for (var i = 0; i < C.length; i++) if (C[i].i === e.boss) { boss = C[i]; break; }
    if (!boss) return null;
    var pWin = battleOdds(ws, { t: boss.t, power: foePower({ t: boss.t }) * (isNum(scale) ? scale : 1), nat: castNat(boss) });
    var wins = 0;
    for (var r = 0; r < 3; r++) if (Math.random() < pWin) wins++;
    return { win: wins >= 2, p: Math.round(pWin * 100) / 100, foe: boss.i, tier: boss.t };
  }
  /* 主奖励池发放（世界事件卷 §七「lead 胜 = 天阶武学 1 部 / 名兵 / 天~地阶秘籍」）——
   * 三种载体的重复处置：武学已学 ⇒ 升一层（封 9，满了给「已臻化境」标记）；名兵已有 ⇒ 折价 3 两；
   * 秘籍 ⇒ 入待修习架（可重复，与 MANUALS 物品层一致）。 */
  function grantReward(ws, rw) {
    if (!rw || !rw.kind || !rw.id) return null;
    if (rw.kind === 'art') {
      if (!ART_INDEX[rw.id]) return null;
      ws.artsKnown = arr(ws.artsKnown);
      ws.artsLevels = obj(ws.artsLevels);
      if (ws.artsKnown.indexOf(rw.id) < 0) {
        ws.artsKnown.push(rw.id);
        ws.artsLevels[rw.id] = 1;
        autoSlotArt(ws, rw.id);
        return { kind: 'art', id: rw.id, fresh: true, level: 1 };
      }
      var lv = ws.artsLevels[rw.id] | 0;
      if (lv < 9) { ws.artsLevels[rw.id] = lv + 1; return { kind: 'art', id: rw.id, fresh: false, level: lv + 1 }; }
      return { kind: 'art', id: rw.id, fresh: false, level: lv, capped: true };
    }
    if (rw.kind === 'blade') {
      if (!weaponRow(rw.id)) return null;
      ws.blades = arr(ws.blades);
      ws.stash = arr(ws.stash);
      if (ws.blades.indexOf(rw.id) < 0) {
        ws.blades.push(rw.id);
        ws.stash.push(rw.id);
        autoEquipGear(ws, 'weapon', rw.id);
        return { kind: 'blade', id: rw.id, fresh: true };
      }
      ws.stones = (ws.stones || 0) + 300;              /* 谱上已有：折价 3 两 */
      return { kind: 'blade', id: rw.id, dupe: true, cash: 300 };
    }
    if (rw.kind === 'manual') {
      var M = (D && D.MANUALS) || [];
      var okM = false;
      for (var m = 0; m < M.length; m++) if (M[m].i === rw.id) okM = true;
      if (!okM) return null;
      ws.shelf = arr(ws.shelf);
      ws.shelf.push(rw.id);
      return { kind: 'manual', id: rw.id, fresh: true };
    }
    return null;
  }
  /* 主导败局结仇（册256）：败给事件主使 ⇒ 该人物记仇，交情封到 −30 以下。
   * 只改既有 relations 条目的 kind/affinity，不新增落盘字段；重复败不叠。 */
  function markEnemy(ws, e) {
    if (!e || !e.boss || !CAST_INDEX[e.boss]) return null;
    ws.relations = obj(ws.relations);
    var r = ws.relations[e.boss] || { affinity: 0 };
    r.affinity = Math.min(isNum(r.affinity) ? r.affinity : 0, -30);
    r.kind = 'enemy';
    ws.relations[e.boss] = r;
    return r;
  }
  function attendEvent(ws, id, mode, alt) {
    var e = null;
    for (var i = 0; i < WORLD_EVENTS.length; i++) if (WORLD_EVENTS[i].i === id) { e = WORLD_EVENTS[i]; break; }
    if (!e) return { err: 'noevent' };
    if (nextVerdict(ws, id) === 'close') return { err: 'closed' };
    var fate = wefateOf(ws);
    /* 拒重口径按型分叉（册228 修既有缺陷）：惯例型看「本届届次」（wecyc），**不看 fate**——
     * 原先一刀切 `if (fate[id]) done` 会让惯例型（华山论剑 / 腊八 / 杀龟）赴过一届后永久点不动，
     * 而 worldEvents 又按 wecyc 跨届把它们放回可赴列表 ⇒ 列表里看得见、按下去 done（册223 埋）。
     * 独发型仍按 wefate 拒重（含 lose / echo 收场）+ 窗口守卫。 */
    if (e.cyc) {
      if (wecycOf(ws)[id] === Math.floor(worldYearOf(ws) / e.cyc)) return { err: 'done' };
    } else {
      if (fate[id]) return { err: 'done' };
      if (!inWindow(ws, e)) return { err: 'offwindow' };   /* 直调防御 */
    }
    if (mode === 'watch' && watchDone(ws, e)) return { err: 'watched' };   /* 旁观记过（册235） */
    /* 赴会须到场（册239 · 节奏试跑）：有地界的事件要先赶到——人不在就付一脚程（精力 3）并移动，
     * z:null 的全局大事（华山/襄阳等）不受此限。地界未解锁照 zoneUnlocked 拒。 */
    var trip = null;
    if (e.z && ws.place !== e.z) {
      if (!zoneUnlocked(ws, e.z)) return { err: 'locked', zone: e.z };
      trip = e.z;
    }
    var cost = (mode === 'lead' ? 10 : mode === 'watch' ? 3 : 5) + (trip ? TRAVEL_STAMINA : 0);
    if ((ws.stamina | 0) < cost) return { err: 'stamina', need: cost };
    if (mode === 'watch') {   /* 旁观：无门槛、精力 3——在场不落子（世界事件卷 §三） */
      ws.stamina = Math.max(0, (ws.stamina | 0) - 3);
      ws.world = obj(ws.world);
      if (!ws.world.wseen) ws.world.wseen = {};
      ws.world.wseen[id] = watchKeyOf(ws, e);
    } else {
      var need = e.tier[mode];
      if (need == null) return { err: 'tier' };
      if ((ws.realm | 0) < need) return { err: 'realm', need: need };
      ws.stamina -= (mode === 'lead' ? 10 : 5);
    }
    if (trip) {
      ws.stamina = Math.max(0, (ws.stamina | 0) - TRAVEL_STAMINA);
      ws.place = trip;
      ws.visited = arr(ws.visited);
      if (ws.visited.indexOf(trip) < 0) ws.visited.push(trip);
    }
    var g = e.gain[mode] || {};
    var res = { ok: true, event: id, mode: mode, alt: alt === true && mode === 'lead' ? true : false };
    if (trip) res.trip = trip;
    /* 主导档先掷对赌（册228）：败则走窄路 —— 不发放 gain / 主奖励，结局写 'lose'。
     * watch / join 不掷判：旁观无对手，卷入的「战败走窄路（轻）」留后续批（正典 §三 风险列）。 */
    var duel = null;
    var joinLose = false;
    if (mode === 'lead') {
      duel = leadDuel(ws, e);
      if (!duel) return { err: 'noboss', event: id };
      res.p = duel.p;
      res.foe = duel.foe;
      if (!duel.win) {
        var fail = failOf(e, 'lead');
        var injAdd = fail.injury[0] + Math.floor(Math.random() * (fail.injury[1] - fail.injury[0] + 1));
        var renDelta = fail.renown[0] + Math.floor(Math.random() * (fail.renown[1] - fail.renown[0] + 1));
        ws.injury = Math.min(15, (ws.injury || 0) + injAdd);
        ws.renown = clampInt((ws.renown || 0) + renDelta, -1000, 1000, ws.renown || 0);
        res.ok = true;                 /* 赴了、打了、败了 —— 这也是赴会成功的一种结局 */
        res.win = false;
        res.injury = ws.injury;
        res.renownLost = -renDelta;
        ws.world = obj(ws.world);
        if (!ws.world.wefate) ws.world.wefate = {};
        ws.world.wefate[id] = 'lose';
        if (e.cyc) {
          if (!ws.world.wecyc) ws.world.wecyc = {};
          ws.world.wecyc[id] = Math.floor(worldYearOf(ws) / e.cyc);
        }
        markEnemy(ws, e);                 /* 册256：败给主使 ⇒ 结仇 */
        applyWriteback(ws, e, 'canon');   /* 主导败 = 没改得动史，江湖按 canon 写回（册236） */
        return res;
      }
      res.win = true;
    } else if (mode === 'join' && e.boss) {
      /* 卷入轻败（册231）：对手 0.7 折，败了也只被波及——走向不变、见闻照发、侠名不给 */
      duel = leadDuel(ws, e, JOIN_SCALE);
      if (duel) {
        res.p = duel.p;
        res.foe = duel.foe;
        if (!duel.win) {
          var jInj = JOIN_FAIL_INJURY[0] + Math.floor(Math.random() * (JOIN_FAIL_INJURY[1] - JOIN_FAIL_INJURY[0] + 1));
          var jRen = JOIN_FAIL_RENOWN[0] + Math.floor(Math.random() * (JOIN_FAIL_RENOWN[1] - JOIN_FAIL_RENOWN[0] + 1));
          ws.injury = Math.min(15, (ws.injury || 0) + jInj);
          ws.renown = clampInt((ws.renown || 0) + jRen, -1000, 1000, ws.renown || 0);
          res.win = false;
          res.injury = ws.injury;
          res.renownLost = -jRen;
          joinLose = true;
        } else {
          res.win = true;
        }
      }
    }
    /* 见闻奖励落 webonus 进 expOf 派生式（册225 修）：ws.exp += 会被 claim 重算吞掉 */
    ws.world = obj(ws.world);
    ws.world.webonus = (ws.world.webonus || 0) + (g.exp || 8);
    ws.exp = expOf(ws);
    /* 卷入轻败不发侠名（败了没人替你扬名）；见闻照发——人确实在场 */
    if (!joinLose) {
      ws.renown = clampInt((ws.renown || 0) + (g.renown || 0) * (res.alt ? 2 : 1), -1000, 1000, ws.renown || 0);
    }
    if (g.stones) ws.stones = (ws.stones || 0) + g.stones;
    /* 主奖励池（世界事件卷 §七）：仅 lead 胜发放，逐事件声明在 WORLD_EVENTS[].reward */
    if (mode === 'lead') {
      var rw = grantReward(ws, e.reward);
      if (rw) res.reward = rw;
    }
    /* 写回：wefate 只存结果键（主档容量红线同型）；**旁观不写结局**——在场不落子（世界事件卷 §三） */
    if (mode !== 'watch') {
      ws.world = obj(ws.world);
      if (!ws.world.wefate) ws.world.wefate = {};
      ws.world.wefate[id] = res.alt ? 'alt' : 'canon';
      if (e.cyc) {   /* 惯例型：本届已赴——跨届由 worldEvents 放回可赴列表 */
        if (!ws.world.wecyc) ws.world.wecyc = {};
        ws.world.wecyc[id] = Math.floor(worldYearOf(ws) / e.cyc);
      }
      applyWriteback(ws, e, res.alt ? 'alt' : 'canon');
    }
    /* 场面执行器挂接（册222 · 世界事件卷 §六 `knot` 字段落码）：join/lead 赴挂接案 → 返回该 KNOTS
     * 的开放分支（branchOpen 过滤 + watch 兜底，travel 同款）供玩家「当场那段戏」直选——
     * 选支走现成 knotChoose（轴微调 + knotDone 落账 → travel 不再重复撞，同源场面不重写）；
     * 不选则场面不落账。watch 档旁观不演戏（在场不落子）。
     * 册231：**败局无戏**——卷入轻败（joinLose）不给场面，人被波及退到一边，台上还是那几个人在打。 */
    if (mode !== 'watch' && e.knot && !joinLose) {
      var kn = null;
      var ks = (D && D.KNOTS) || [];
      for (var i3 = 0; i3 < ks.length; i3++) if (ks[i3].i === e.knot) { kn = ks[i3]; break; }
      if (kn) {
        var sOpts = [];
        for (var b2 = 0; b2 < kn.br.length; b2++) {
          if (!branchOpen(ws, kn.br[b2])) continue;
          sOpts.push({ k: kn.br[b2].k, label: kn.br[b2].label, req: kn.br[b2].req || null });
        }
        if (!sOpts.length) sOpts.push({ k: 'watch', label: 'knot.' + kn.i + '.watch', req: null });
        res.scene = { knot: kn.i, opts: sOpts };
      }
    }
    return res;
  }

  /* ── 结交与退隐（册218 P7 · 方案卷 §五之五）──────────────────────────────────── */
  /* 结交拜访（精力 1 → affinity +3，封 100；kind 缺省 friend） */
  function befriend(ws, castId) {
    if (!CAST_INDEX[castId]) return { err: 'nocast' };
    if ((ws.stamina | 0) < 1) return { err: 'stamina' };
    ws.stamina -= 1;
    ws.relations = obj(ws.relations);
    var r = ws.relations[castId] || { affinity: 0, kind: 'friend' };
    r.affinity = Math.min(100, (isNum(r.affinity) ? r.affinity : 0) + 3);
    ws.relations[castId] = r;
    return { ok: true, affinity: r.affinity };
  }
  /* 退隐传世（R9 出口，方案卷 §八）：无招之后挂印归山——本世定格、余响继承口（heritage.gen+1） */
  function retire(ws) {
    if (!ws) return { err: 'nows' };
    if ((ws.realm | 0) < 9) return { err: 'realm', need: 9 };
    ws.renown = clampInt((ws.renown || 0) + 200, -1000, 1000, ws.renown || 0);
    ws.heritage = obj(ws.heritage);
    ws.heritage.inherited = inheritOf(ws);       /* 本世余响（生时即定：境界 / 最高武学 / 最深交情） */
    ws.heritage.gen = ((ws.heritage.gen || 1)) + 1;
    ws.worldDay = (ws.worldDay || 0) + 3600;   /* 退隐十年 */
    return { ok: true, gen: ws.heritage.gen };
  }

  /* 精力上限（册215 P2）：60 + 境界×10——随成长放宽；恢复 1 点/现实分钟（claim 内推进） */
  function staminaCapOf(ws) { return 60 + (ws && isNum(ws.realm) ? ws.realm : 0) * 10; }

  /* 破关口（册215 P2 · 主界面「破关」钮的引擎侧）：canBreak 全条件通过才能破；
   * 不掷骰（数值与经济 §四）；破后 exp 刷新。强行冲关走 attemptBreak（赌一把口子）。 */
  function breakThrough(ws) {
    if (!ws) return { err: 'nows' };
    if (!canBreak(ws)) return { err: 'gate' };
    ws.realm = (ws.realm | 0) + 1;
    ws.exp = expOf(ws);
    return { ok: true, realm: ws.realm };
  }

  /* ── 结算入口 ────────────────────────────────────────────────────────────────
   * claim(ws, dtMs, now, profile, settings)：只推进数值（功力产出/封顶/破关/修习练习度）。
   * 返回 {gain, broke, layers} 供探针/冒烟断言；core 不读返回值（与第一世界同口径，安全）。
   * 册214：offlineStory 闸随离线写书退役——离线结算与在线同一份纯数值链。 */
  function claim(ws, dtMs, now, profile, settings) {
    void now; void profile; void settings;
    if (!ws || !isNum(dtMs) || dtMs <= 0) return { gain: 0, broke: 0, layers: 0 };
    /* ── 世界日时钟（册234）：1 现实分钟 = 1 游戏日，离线单次封顶 12 现实小时 ─────────
     * 在 sweep 之前推进：窗口关窗与回声同一拍落账。生产/修习仍按未封顶的 dtMs 结算——
     * 两把尺子是刻意的（经济侧照全额，寿元侧别让一次回归咬掉一辈子），同第一世界口径。 */
    ws.worldDay = (ws.worldDay || 0) + Math.min(dtMs, WD_OFFLINE_CAP_MS) / GAME_DAY_MS;
    /* ── 走火入魔（册233 · 武学全录 §一 注）────────────────────────────────────
     * 修习槽里同时挂**相冲两性**（环上相邻、互克；中正不参与）＝ 强行兼修，每「行功日」内伤 +1。
     * **日尺度用行功日（10 现实分钟）而非 worldDay**：世界日走历法尺度（1 现实分钟 = 1 日，册234），
     * 走火是练功压力、按练功日结算——两件事分开办。对照既有恢复速率（内伤 1 层/30 现实分钟）：
     * 走火 +1/10 分 ≫ 恢复 −1/30 分 ⇒ 净每小时约 +4 层，3 小时走满 12 层封顶，逼玩家撤槽或疗伤。
     * **封 12 不致死**：正典「超过 3 日进濒死预警」是压力不是死刑——内伤 15 即死那条留给战斗与
     * 极端运气，别让挂机把人练死；到 12 进咯血档（行走被拒 + 页面转红）。fireDays 记连续走火日，
     * 撤槽即清零，≥3 日给预警。 */
    ws.world = obj(ws.world);
    var fireMs = isNum(ws.world.fireMs) ? ws.world.fireMs : 0;
    var fireDays0 = clampInt(ws.world.fireDays, 0, 99, 0);
    var clash = natClash(ws);
    if (clash.clash) {
      fireMs += dtMs;
      var fireAdd = Math.floor(fireMs / FIRE_DAY_MS);
      if (fireAdd > 0) {
        fireMs -= fireAdd * FIRE_DAY_MS;
        var room = 12 - (ws.injury || 0);
        if (room > 0) ws.injury = Math.min(12, (ws.injury || 0) + Math.min(fireAdd, room));
        ws.world.fireDays = clampInt(fireDays0 + fireAdd, 0, 99, 0);
      }
      ws.world.fireMs = fireMs;
    } else {
      ws.world.fireMs = 0;
      ws.world.fireDays = 0;
    }
    /* 辟邪剑法自伤（册237 · 武学全录 §2.0/§2.3「修习即损寿元」）：槽里有 yg_bixie ⇒
     * 每修满 1 游戏年折寿 1 年（世界日同尺）；撤槽即停，已经折掉的不还。 */
    var bixieIn = false;
    var bslots = arr(ws.artsSlots).slice(0, SLOTS_MAX);
    for (var bi = 0; bi < bslots.length; bi++) {
      var bid = typeof bslots[bi] === 'string' ? bslots[bi] : (bslots[bi] && bslots[bi].id);
      if (bid === 'yg_bixie') bixieIn = true;
    }
    if (bixieIn) {
      var bixieMs = (isNum(ws.world.bixieMs) ? ws.world.bixieMs : 0) + Math.min(dtMs, WD_OFFLINE_CAP_MS);
      var cutYears = Math.floor(bixieMs / (GAME_DAY_MS * 360));
      if (cutYears > 0) {
        bixieMs -= cutYears * GAME_DAY_MS * 360;
        ws.lifeCut = clampInt((ws.lifeCut || 0) + cutYears, 0, 200, 0);
      }
      ws.world.bixieMs = bixieMs;
    } else {
      ws.world.bixieMs = 0;   /* 撤槽即停；已折的寿数不还 */
    }
    sweepExpired(ws);   /* 独发型滑窗收场检查（册223）：世界日时钟已活（册234），跨过 y1 即回声 */
    ws.exp = expOf(ws);
    var before = isNum(ws.qi) ? ws.qi : 0;
    var broke = 0;
    /* 分段推进：填满一档 → 判破关 → 破成功则上限抬高继续填；心境卡住则剩余时间**白费**（封顶的本意）。
     * 一次最多连破两档（离线很久时）；再多说明门槛设计有问题，留给 S3 的定种仿真抓。 */
    var remain = dtMs / 60000;           /* 剩余时间（分钟） */
    while (remain > 0 && broke < 2) {
      var rate = rateOf(ws) * (ws.mode === 'seclude' ? 1.0 : 0.6);   /* 闭关 1.0 / 闯荡 0.6（数值卷 §五 模式系数；册216 落码） */
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
      var zhi = (ws.atts && isNum(ws.atts.zhi)) ? ws.atts.zhi : 50;
      var pv = (isNum(prac[aid]) ? prac[aid] : 0) + (dtMs / 60000) * (PRACTICE_PER_LAYER / 30) * (1 + zhi / 200);
      /* 卡层判（心境不足）：练习度停在门槛下；⚠️ 只卡真卡层场景——此前无条件 min(99) 会把
       * 非卡层的小步增量（如 99.69）也压回 99 ⇒ tick 粒度下修习永远卡死 99 度（册215 修）。 */
      var gated = !!gateExp && (ws.exp || 0) < gateExp;
      if (gated && pv > PRACTICE_PER_LAYER - 1) pv = PRACTICE_PER_LAYER - 1;
      while (pv >= PRACTICE_PER_LAYER && (ws.artsLevels[aid] || 0) < 9) {
        var nxt = (ws.artsLevels[aid] || 0) + 1;
        var g2 = GATE_LAYERS[nxt];
        if (g2 && (ws.exp || 0) < g2) { gated = true; break; }   /* 心境不满：层不动，练习度停在门槛下 */
        ws.artsLevels[aid] = nxt;
        pv -= PRACTICE_PER_LAYER;
        layered++;
      }
      prac[aid] = gated ? Math.min(pv, PRACTICE_PER_LAYER - 1) : Math.min(pv, PRACTICE_PER_LAYER - 0.001);
    }
    ws.artsPractice = prac;
    /* 精力恢复（册215 P2）：1 点/现实分钟，封上限 */
    ws.stamina = Math.min(staminaCapOf(ws), (isNum(ws.stamina) ? ws.stamina : 0) + dtMs / 60000);
    /* 内伤慢恢复（册216 P3）：1 层/30 现实分钟——疗伤药（市集，P6）加速；战报呈现面随 P3 视图 */
    if ((ws.injury || 0) > 0) ws.injury = Math.max(0, (ws.injury || 0) - dtMs / (30 * 60000));
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
    /* 册244 勘正：主壳已换 `qunxiaHome`（view/qunxia-home.js，山河棋盘自包含页）；旧 wuxia-home.js 同批退役。 */
    shell: 'qunxiaHome',
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
    breakThrough: breakThrough,
    staminaCapOf: staminaCapOf,
    travel: travel,
    knotChoose: knotChoose, bountyBoard: bountyBoard, bountyTake: bountyTake, escortTake: escortTake, BOUNTY_TIERS: BOUNTY_TIERS,
    joinSect: joinSect, learnArt: learnArt, learnableArts: learnableArts, sectTask: sectTask, donateSect: donateSect, betraySect: betraySect, sectRankOf: sectRankOf,
    shopList: SHOP_LIST, buyItem: buyItem, studyManual: studyManual,
    /* 行装与神兵谱（册227 · G4/G15）：weapons 表 / 装备口 / 收集进度 / 夺兵（判据直测口） */
    weapons: (D && D.WEAPONS) || [], weaponMult: weaponMult, weaponRow: weaponRow,
    equipGear: equipGear, bladeProgress: bladeProgress, bladeDrop: bladeDrop,
    /* 行头三槽（册230）：表 / 取行 / 效果读数 —— 效果只在判定层，不进 powerOf */
    gearMisc: (D && D.GEAR_MISC) || [], miscRow: miscRow, gearRow: gearRow, effectsOfGear: effectsOfGear,
    worldEvents: worldEvents, worldEventsAt: worldEventsAt, worldRumors: worldRumors, sweepExpired: sweepExpired, worldYearOf: worldYearOf, attendEvent: attendEvent, watchDone: watchDone, WORLD_EVENTS: WORLD_EVENTS, befriend: befriend, retire: retire,
    /* 棋盘结果回流（册259）：游戏终局 → 扩展 wefate / 写回 —— 主壳单写口 */
    applyResult: applyResult,
    /* 写回四写口（册236）：白名单表 / 写口 / 读取面 —— 判据直测口 */
    WRITEBACK: WRITEBACK, applyWriteback: applyWriteback, castStateOf: castStateOf, sectRepOf: sectRepOf, aftermathOf: aftermathOf,
    /* 逐案失败代价（册237 · 世界事件卷 §六 fail） */
    FAIL: FAIL, failOf: failOf,
    /* 余响（册236）：一世余响计算（retire / rebirthCarry 共用） */
    inheritOf: inheritOf,
    /* 主导对赌（册228）：掷判与主奖励发放拆成两口——判据直测用，视图只经 attendEvent 的返回面 */
    leadDuel: leadDuel, grantReward: grantReward,
    zoneUnlocked: zoneUnlocked,
    /* 地界素材两型（册229）：到达写景 / 拾遗取条与金额（判据直测口） */
    zoneSceneOf: zoneSceneOf, gainOf: gainOf, gainTip: gainTip, GAIN_RATE: GAIN_RATE,
    /* 隐世传功（册242 · 武学全录 §八）：长尾池 / 加权抽取 / 授予口 —— 判据直测口 */
    TEACH_RATE: TEACH_RATE, TEACH_TIER: TEACH_TIER,
    longTailExclude: longTailExclude, longTailPool: longTailPool, longTailPick: longTailPick, grantLongTail: grantLongTail,
    /* 相性（册232 · 武学全录 §一 四性环克）：环 / 乘区 / 主角性 / 对手性两源 —— 判据直测口 */
    NAT_CYCLE: NAT_CYCLE, SECT_NAT: SECT_NAT, ZONE_NAT: ZONE_NAT,
    natBeats: natBeats, natMult: natMult, myNat: myNat, castNat: castNat, zoneNat: zoneNat, battleOdds: battleOdds,
    natClash: natClash, FIRE_DAY_MS: FIRE_DAY_MS,
    travelStamina: TRAVEL_STAMINA,
    travelUnlock: TRAVEL_UNLOCK,
    /* worldSystems（册162 · S3-c）：引擎通用系统的世界侧接口——通用层只经这些口读世界语义（D3 纪律），
     * 每个口按「引擎会怎么调」实现；引擎调用点全部带空值守卫，缺口 = 安全空转（多世界契约）。 */
    worldSystems: {
      /* 生命判势（core.claimInner）：内伤满 15 = 伤重不治（对位道伤崩碎通道）；寿元上界按境界表
       * （江湖设定 §五：寿元只做两处结算——老病寿尽 / 内伤即死，不做倒计时）。age = 16 岁开局 + worldDay/360。 */
      lifeInfo: function (ws) {
        var r = Math.min(ws && isNum(ws.realm) ? ws.realm : 0, 9);
        var row = realmRow(r);
        var age = 16 + Math.floor((ws && ws.worldDay || 0) / 360) + ((ws && ws.lifeCut) | 0);
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
      /* 转世余响（册236 · Legacy.finishRebirth 在重建初始态后调用）：把本世三轴余响带进来世 */
      rebirthCarry: rebirthCarry,
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
