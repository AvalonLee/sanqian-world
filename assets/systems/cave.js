/* systems/cave.js — G13 洞天福地（地柱 · 引擎卷 §二 · 福地池卷 v2.0）
 * 核心循环：灵石 / 境界 / 秘境首通 → 入驻资格 → 择一驻留 → caveMult 独立乘区 + 签名效果；
 * v2.0 扩展：隐世福地（obtain 门控，claim 内自动授予所有权）+ 附属设施养成（建在已拥有
 * 福地上、随所有权永久保留、仅当前驻留福地生效，mods 来源 'caveFac'）。
 * 硬纪律（引擎卷 §2.4 / 福地池卷 v2.0）：
 *  1. caveMult 是**独立乘区**（产出公式末端 ×），不进 qiRate 加算池——防击穿功法六槽乘区审计上限（#105）；
 *  2. mult 引擎硬顶 CAVE_MULT_CAP（1.40），世界包表内数值超限即被截断；
 *  3. 签名效果走既有乘区加算（来源=洞府，mods.js 消费），驻留唯一 → 天然不叠加；
 *  4. 同时只驻留一处；迁居冷却 1 游戏年（CAVE_SWITCH_CD_MS，绝对时间戳，跨离线生效）；
 *  5. 灵石一次付清 = 获得**所有权**（owned 追加不重复），此后来回迁居不再付费，只吃冷却；
 *     隐世福地不走灵石通道——所有权由 obtain 条件达成时自动授予（grantObtain）；
 *  6. 扣费与所有权变更只发生在 enter()/grantObtain()/buildFacility()，由 actions 层包在 mutate 内（单一写入通道）；
 *  7. caveMult 的**唯一读取点**是 multOf()（挂点 on_cave_mult），禁止旁路直读 cave.mult；
 *  8. 设施效果禁 qiRate，逐字段封顶 = CAVE_FAC_BUDGET（#156 对表，不并入 #128 签名预算）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  /* 挂点求和：已装槽功法中，special 池声明了指定 hook 的档位值合计
   * （hooks 以 poolId 为键，hook 名在 SPECIAL_POOL 内声明——工程规范 §2.2 白名单） */
  function hookSum(pack, mods, hookName) {
    if (!mods || !mods.hooks || !pack || !pack.specialHooks) return 0;
    var total = 0;
    for (var pid in pack.specialHooks) {
      var def = pack.specialHooks[pid];
      if (!def || def.hook !== hookName) continue;
      total += mods.hooks[pid] || 0;
    }
    return total;
  }

  function listOf(pack) {
    return (pack && pack.caves) || [];
  }

  function facDefs(D) {
    return (D && D.CAVE_FACILITIES) || [];
  }

  SQ.Cave = {
    hookSum: hookSum,
    list: listOf,

    byId: function (pack, id) {
      var l = listOf(pack);
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },

    /* 当前驻留（缺档/脏 id 一律回落初始洞府，绝不返回 null——产出公式要读它） */
    current: function (ws, pack) {
      var id = (ws && ws.cave && ws.cave.current) || null;
      return SQ.Cave.byId(pack, id) || SQ.Cave.byId(pack, pack && pack.data && pack.data.CAVE_INITIAL) ||
        listOf(pack)[0] || { id: null, mult: 1, reqs: {}, signature: null };
    },

    /* caveMult 唯一读取点（挂点 on_cave_mult）：表值 → 硬顶截断 → 挂点修正 */
    multOf: function (ws, pack, D, mods) {
      var c = SQ.Cave.current(ws, pack);
      var cap = (D && D.CAVE_MULT_CAP) || 1.40;
      var m = typeof c.mult === 'number' && isFinite(c.mult) ? c.mult : 1;
      m = Math.min(cap, Math.max(1, m));
      var bonus = hookSum(pack, mods, 'on_cave_mult');
      if (bonus) m = Math.min(cap, m * (1 + bonus));
      return m;
    },

    owned: function (ws, id) {
      return !!((ws.cave && ws.cave.owned) || []).filter(function (x) { return x === id; }).length;
    },

    /* 迁居冷却剩余（ms）；>0 = 冷却中 */
    cooldownLeft: function (ws, now) {
      var until = (ws.cave && ws.cave.cooldownUntil) || 0;
      return Math.max(0, until - (now || Date.now()));
    },

    /* ── 隐世福地（obtain 门控 · 福地池卷 §三）────────────────
     * obtainMet 判定：factionRank = 任一势力声望职级 ≥ rank（势力深化批 §11.5）；
     * codex = 奇遇图鉴 seen 格数 ≥ seen。达成即 grantObtain 自动授予所有权（永久，
     * 叛离/回落不收回），claim 编排内每 tick 调用一次。 */
    obtainMet: function (ws, pack, D, ob) {
      if (!ob) return true;
      if (ob.type === 'factionRank') {
        if (!SQ.Factions || !SQ.Factions.maxRankOf) return false;
        return SQ.Factions.maxRankOf(ws, D) >= (ob.rank || 0);
      }
      if (ob.type === 'codex') {
        var seen = (ws.eventHistory && ws.eventHistory.seen) || {};
        return Object.keys(seen).length >= (ob.seen || 0);
      }
      return false;   /* 未知门控类型：从严不授予（内容 lint 在 smoke #155 拦截） */
    },

    /* 所有权自动授予（claim 内调用，写入走既有 ws 草稿——claim 本身即事务通道）；
     * 返回本 tick 新授予的福地数组（供日志/演出消费） */
    grantObtain: function (ws, pack, D, now, ctx) {
      var granted = [];
      listOf(pack).forEach(function (c) {
        if (!c.obtain || SQ.Cave.owned(ws, c.id)) return;
        if (!SQ.Cave.obtainMet(ws, pack, D, c.obtain)) return;
        if (!ws.cave) ws.cave = { current: (D && D.CAVE_INITIAL) || null, cooldownUntil: 0, owned: [], fac: {} };
        ws.cave.owned.push(c.id);
        granted.push(c);
        if (ctx && ctx.log) {
          ctx.log('cave', SQ.t('log.cave.grant', {
            name: SQ.t('cave.' + c.id + '.name', null, pack.worldId)
          }, pack.worldId));
        }
      });
      return granted;
    },

    /* 入驻资格校验（引擎卷 §2.3 + v2.0 obtain 门控）：返回 {ok, lack:[…], cost}
     * lack 元素 = {kind:'realm'|'zone'|'stones'|'cooldown'|'same'|'obtain', need, have, until}
     * —— UI 缺项 chips 三段红绿直接消费（B3）。已拥有的洞府不再校验灵石；
     * obtain 门控福地未获所有权 → lack 'obtain'（「缘法未至」，不进灵石通道）。 */
    canEnter: function (ws, pack, D, id, now) {
      var c = SQ.Cave.byId(pack, id);
      var lack = [];
      if (!c) return { ok: false, lack: [{ kind: 'unknown' }], cost: 0, cave: null };
      now = now || Date.now();
      var has = SQ.Cave.owned(ws, id);
      if (c.obtain && !has) lack.push({ kind: 'obtain', obtain: c.obtain });
      var reqs = c.reqs || {};
      if (reqs.realmMin != null && ws.realm < reqs.realmMin) {
        lack.push({ kind: 'realm', need: reqs.realmMin, have: ws.realm });
      }
      if (reqs.zoneCleared != null && (ws.cleared || []).indexOf(reqs.zoneCleared) < 0) {
        lack.push({ kind: 'zone', need: reqs.zoneCleared, have: -1 });
      }
      var cost = has ? 0 : (reqs.stonesCost || 0);
      if (cost > 0 && ws.stones < cost) lack.push({ kind: 'stones', need: cost, have: ws.stones });
      if ((ws.cave && ws.cave.current) === id) lack.push({ kind: 'same' });
      var left = SQ.Cave.cooldownLeft(ws, now);
      if (left > 0) lack.push({ kind: 'cooldown', until: (ws.cave && ws.cave.cooldownUntil) || 0, left: left });
      return { ok: lack.length === 0, lack: lack, cost: cost, cave: c, owned: has };
    },

    /* 入驻 / 迁居：资格全过才动账；扣灵石 + 记 ledger.out.cave + 写 owned + 起迁居冷却。
     * 只在 actions 层的 mutate 内调用（单一写入通道）。返回 {ok, reason, cost, cave} */
    enter: function (ws, pack, D, mods, id, now, ctx) {
      now = now || Date.now();
      var chk = SQ.Cave.canEnter(ws, pack, D, id, now);
      if (!chk.ok) {
        return { ok: false, reason: chk.lack[0].kind, lack: chk.lack, cost: 0, cave: chk.cave };
      }
      var c = chk.cave;
      if (chk.cost > 0) {
        ws.stones = Math.max(0, ws.stones - chk.cost);
        SQ.Ledger.note(ws, 'out', 'cave', chk.cost);
      }
      ws.cave.current = c.id;
      ws.cave.cooldownUntil = now + ((D && D.CAVE_SWITCH_CD_MS) || 360000);
      if (!SQ.Cave.owned(ws, c.id)) ws.cave.owned.push(c.id);
      /* 挂点 on_cave_enter（引擎卷 §2.5）：入驻时触发，供日志 / 一次性演出 / 未来签名内容消费 */
      var resonate = hookSum(pack, mods, 'on_cave_enter');
      if (ctx && ctx.log) {
        ctx.log('cave', SQ.t(resonate ? 'log.cave.enter.resonate' : 'log.cave.enter', {
          name: SQ.t('cave.' + c.id + '.name', null, pack.worldId),
          mult: Math.round(SQ.Cave.multOf(ws, pack, D, mods) * 100) / 100,
          p: Math.round(resonate * 100)
        }, pack.worldId));
      }
      return { ok: true, reason: null, cost: chk.cost, cave: c, resonate: resonate };
    },

    /* ── 附属设施（福地池卷 §四）────────────────────────────── */

    /* 某福地的设施等级表（只读副本语义：返回原引用，写入只经 buildFacility） */
    facOf: function (ws, caveId) {
      return (ws.cave && ws.cave.fac && ws.cave.fac[caveId]) || null;
    },

    /* 营建校验：{ok, lack:[{kind:'owned'|'max'|'stones'|'unknown'}], cost, nextLv} */
    canBuildFac: function (ws, pack, D, caveId, facId) {
      var defs = facDefs(D), def = null;
      for (var i = 0; i < defs.length; i++) if (defs[i].id === facId) def = defs[i];
      if (!def || !SQ.Cave.byId(pack, caveId)) return { ok: false, lack: [{ kind: 'unknown' }], cost: 0 };
      if (!SQ.Cave.owned(ws, caveId)) return { ok: false, lack: [{ kind: 'owned' }], cost: 0 };
      var lv = (SQ.Cave.facOf(ws, caveId) || {})[facId] || 0;
      var maxLv = (D && D.CAVE_FAC_MAX_LV) || 3;
      if (lv >= maxLv) return { ok: false, lack: [{ kind: 'max' }], cost: 0, lv: lv };
      var cost = ((D && D.CAVE_FAC_COST) || [])[lv] || 0;
      var lack = [];
      if (ws.stones < cost) lack.push({ kind: 'stones', need: cost, have: ws.stones });
      return { ok: lack.length === 0, lack: lack, cost: cost, lv: lv, def: def };
    },

    /* 营建/升级（actions.mutate 内调用）：扣灵石 + ledger.out.cave + 等级 +1（≤MAX_LV） */
    buildFacility: function (ws, pack, D, caveId, facId, now, ctx) {
      var chk = SQ.Cave.canBuildFac(ws, pack, D, caveId, facId);
      if (!chk.ok) return { ok: false, reason: (chk.lack[0] || {}).kind || 'unknown', lack: chk.lack };
      ws.stones = Math.max(0, ws.stones - chk.cost);
      SQ.Ledger.note(ws, 'out', 'cave', chk.cost);
      if (!ws.cave.fac) ws.cave.fac = {};
      if (!ws.cave.fac[caveId]) ws.cave.fac[caveId] = {};
      ws.cave.fac[caveId][facId] = chk.lv + 1;
      if (ctx && ctx.log) {
        ctx.log('cave', SQ.t('log.cave.fac.built', {
          cave: SQ.t('cave.' + caveId + '.name', null, pack.worldId),
          fac: SQ.t('cave.fac.' + facId + '.name', null, pack.worldId),
          lv: chk.lv + 1
        }, pack.worldId));
      }
      return { ok: true, lv: chk.lv + 1, cost: chk.cost };
    },

    /* 当前驻留福地的设施效果合计 {field: v}（mods.js 步骤 7.5 消费，来源 'caveFac'；
     * 驻留唯一 ⇒ 同一时刻只有一处福地的设施生效；逐字段封顶 = CAVE_FAC_BUDGET） */
    facEffects: function (ws, pack, D) {
      var out = {};
      var cur = SQ.Cave.current(ws, pack);
      if (!cur || !cur.id) return out;
      var fac = SQ.Cave.facOf(ws, cur.id);
      if (!fac) return out;
      var budget = (D && D.CAVE_FAC_BUDGET) || {};
      var maxLv = (D && D.CAVE_FAC_MAX_LV) || 3;
      facDefs(D).forEach(function (def) {
        var lv = Math.max(0, Math.min(maxLv, Math.floor(fac[def.id] || 0)));
        if (!lv || def.field === 'qiRate') return;   /* 禁 qiRate（纪律 8） */
        var v = def.per * lv;
        if (budget[def.field] != null) v = Math.min(v, budget[def.field]);
        out[def.field] = (out[def.field] || 0) + v;
      });
      return out;
    }
  };
})();
