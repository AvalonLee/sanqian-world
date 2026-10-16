/* systems/alchemy.js — 炼丹炼器（修仙实现卷 · 炼丹炼器卷 v1.1 唯一事实源）
 * 材料轴（击杀掉落/采集点/灵田三源）→ 炼丹（丹方六份 · 单槽队列 · 熟练度双轨 · 丹纹九转）
 * → 炼器（图纸 5 · 打造品阶 ⌊D(z)−0.5⌋ · 词条方向选择 · 灵品起 attrValue 自由指定）。
 * 纪律：一切效果走既有通道（pushBuff / breakCostNext / tribulation.next / Gear 全规则）；
 * 材料账独立两路（SQ.Ledger.noteMat，永不入灵石账）；不进 tick（炼制 = 时间戳比较）；
 * ws.alchemy / ws.materials / ws.gather / ws.ledgerMat 唯一写口 = 本模块（mutate/claim 事务通道）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var num = SQ.util.num, obj = SQ.util.obj, arr = SQ.util.arr,
      randInt = SQ.util.randInt, pick = SQ.util.pick;   /* C1：统一至 assets/util.js */
  function A(D) { return D.ALCHEMY || {}; }

  /* ── normalize（§8.1 幂等 · 脏档逐项清理零崩溃）────────── */
  function matIds(D) {
    var out = {};
    (A(D).MATS || []).forEach(function (m) { out[m.id] = m; });
    return out;
  }
  function normalizeMaterials(raw, D) {
    var ids = matIds(D);
    var out = {};
    var src = obj(raw, {});
    for (var k in src) {
      if (!ids[k]) continue;
      var v = Math.floor(num(src[k], 0));
      if (v > 0) out[k] = Math.min(A(D).MAT_STACK_CAP || 999, v);
    }
    return out;
  }
  function normalizeGather(raw, D) {
    var out = {};
    var src = obj(raw, {});
    for (var i = 0; i < ((D.ZONES || []).length); i++) {
      var v = Math.max(0, num(src[i], 0));
      if (v > 0) out[i] = v;
    }
    return out;
  }
  function normalizeLedgerMat(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var inn = obj(raw.in, {}), outo = obj(raw.out, {});
    return {
      in: { materials: Math.max(0, Math.floor(num(inn.materials, 0))) },
      out: { materials: Math.max(0, Math.floor(num(outo.materials, 0))) }
    };
  }
  function normalize(raw, D) {
    if (!raw || typeof raw !== 'object') return null;
    var ids = matIds(D);
    var recIds = {}; (A(D).RECIPES || []).forEach(function (r) { recIds[r.id] = 1; });
    var bpIds = {}; (A(D).BLUEPRINTS || []).forEach(function (b) { bpIds[b.id] = 1; });
    var pillKeys = {};
    for (var pk in (A(D).APILLS || {})) { pillKeys[pk] = 1;
      /* 丹纹版只归时限型（`buff`）——出炉处 `isRune` 本就要求 buff，非 buff 型的 `_rw` 键是纯幽灵：
       * 旧写法照单全收 ⇒ 脏档里一个 `ap_pozhang_rw` 会在丹匣上打出裸词表键（第十七批截图取证时照出） */
      if ((A(D).APILLS || {})[pk] && (A(D).APILLS || {})[pk].buff) pillKeys[pk + '_rw'] = 1; }
    /* 丹匣键空间两族合一（第十七批）：坊市 / 门中供给 / 特席 / 残片所得的成品丹（D.PILLS）也入匣，
     * 白名单必须一并认它 —— 否则 normalize 会在下一次读档时把它**静默剪掉**（玩家花钱买的丹凭空消失）。
     * 成品丹无丹纹版 ⇒ 只登记裸 id。 */
    (D.PILLS || []).forEach(function (p) { if (p && p.id) pillKeys[p.id] = 1; });
    var out = {
      furnace: raw.furnace === true,
      recipes: arr(raw.recipes, []).filter(function (x) { return recIds[x]; }).slice(0, (A(D).RECIPES || []).length),
      blueprints: arr(raw.blueprints, []).filter(function (x) { return bpIds[x]; }).slice(0, (A(D).BLUEPRINTS || []).length),
      prof: { dan: Math.max(0, Math.floor(num((obj(raw.prof, {})).dan, 0))),
        qi: Math.max(0, Math.floor(num((obj(raw.prof, {})).qi, 0))) },
      pills: {},
      pillDay: { day: Math.floor(num((obj(raw.pillDay, {})).day, -1)), n: Math.max(0, Math.floor(num((obj(raw.pillDay, {})).n, 0))) },
      pillOnce: { pozhang: Math.floor(num((obj(raw.pillOnce, {})).pozhang, -1)), zhenjie: Math.floor(num((obj(raw.pillOnce, {})).zhenjie, -1)) },
      craft: null,
      farmAt: Math.max(0, num(raw.farmAt, 0)),
      fires: Math.max(0, Math.floor(num(raw.fires, 0))),
      jiuzhuan: Math.max(0, Math.floor(num(raw.jiuzhuan, 0))),
      forgeMade: Math.max(0, Math.floor(num(raw.forgeMade, 0)))
    };
    var rawP = obj(raw.pills, {});
    for (var k2 in rawP) {
      if (!pillKeys[k2]) continue;
      var n2 = Math.floor(num(rawP[k2], 0));
      if (n2 > 0) out.pills[k2] = Math.min(A(D).PILL_STOCK_CAP || 99, n2);
    }
    var cr = obj(raw.craft, null);
    if (cr && (cr.kind === 'dan' || cr.kind === 'qi') && num(cr.doneAt, 0) > 0 &&
      ((cr.kind === 'dan' && recIds[cr.id]) || (cr.kind === 'qi' && bpIds[cr.id]))) {
      out.craft = { kind: cr.kind, id: cr.id, doneAt: num(cr.doneAt, 0),
        dir: typeof cr.dir === 'string' ? cr.dir : null,
        attr: (cr.attr === 'jing' || cr.attr === 'qi' || cr.attr === 'shen') ? cr.attr : null };
    }
    void ids;
    return out;
  }

  function ensure(ws, D) {
    if (!ws.alchemy || typeof ws.alchemy !== 'object') {
      ws.alchemy = { furnace: false, recipes: [], blueprints: [], prof: { dan: 0, qi: 0 },
        pills: {}, pillDay: { day: -1, n: 0 }, pillOnce: { pozhang: -1, zhenjie: -1 },
        craft: null, farmAt: 0, fires: 0, jiuzhuan: 0, forgeMade: 0 };
    }
    if (!ws.materials || typeof ws.materials !== 'object') ws.materials = {};
    if (!ws.gather || typeof ws.gather !== 'object') ws.gather = {};
    if (!ws.ledgerMat) ws.ledgerMat = SQ.Ledger.matBlank();
    return ws.alchemy;
  }

  /* 功能开通：realm ≥ UNLOCK_REALM 自动授予 rc_juqi（丹方渠道①，claim/mutate 内幂等调用） */
  function autoGrant(ws, D) {
    if (ws.realm >= (A(D).UNLOCK_REALM != null ? A(D).UNLOCK_REALM : 1)) {
      var al = ensure(ws, D);
      if (al.recipes.indexOf('rc_juqi') < 0) al.recipes.push('rc_juqi');
    }
  }

  function zoneMats(D, z) {
    return (A(D).MATS || []).filter(function (m) { return m.z === z; }).map(function (m) { return m.id; });
  }
  function groupOf(D, matId) {
    var m = null;
    (A(D).MATS || []).forEach(function (x) { if (x.id === matId) m = x; });
    if (!m) return 0;
    if (m.z < 0) return 3;                       /* 悟道石（跨区特殊）按 z9 组价 */
    if (m.z <= 2) return 0;
    if (m.z <= 5) return 1;
    if (m.z <= 8) return 2;
    return 3;
  }
  function sellPriceOf(D, matId) {
    return (A(D).MAT_SELL || [8, 40, 160, 600])[groupOf(D, matId)] || 8;
  }
  /* 某一提炼档的全部材料 id（第廿九批）：材料背包要告诉玩家「这把料 ×4 能炼成哪几样」，
   * 而那份候选池归 `refineMats` 自己算 ⇒ 视图再筛一遍就是第二套实现（口径一改就各说各话）。
   * 现由本口**同时**服务引擎与界面 ⇒ 屏上写的池 === 引擎真会随机抽的池（冒烟 #300 钉这一条）。
   * 顶档（g >= 3）无次组；悟道石（z < 0）按 groupOf 落 3 档卖价但**不入任何产出池**。 */
  function groupIds(D, g) {
    return (A(D).MATS || []).filter(function (m) {
      return m.z >= 0 && groupOf(D, m.id) === g;
    }).map(function (m) { return m.id; });
  }

  /* 材料入账（唯一写口）：堆叠 999 溢出折算——超出部分按组价折灵石 in.event +
   * 材料账同笔 in/out 双路（两恒等式同时不破，§2.7/#207） */
  function addMats(ws, pack, D, gains, now, log) {
    ensure(ws, D);
    var cap = A(D).MAT_STACK_CAP || 999;
    var added = {};
    var overflowStones = 0, overflowN = 0;
    for (var id in gains) {
      var n = Math.max(0, Math.floor(num(gains[id], 0)));
      if (!n) continue;
      var have = ws.materials[id] || 0;
      var room = Math.max(0, cap - have);
      var take = Math.min(n, room);
      var over = n - take;
      if (take > 0) { ws.materials[id] = have + take; added[id] = take; }
      if (over > 0) {
        overflowN += over;
        overflowStones += over * sellPriceOf(D, id);
      }
    }
    var totalIn = 0;
    for (var ak in added) totalIn += added[ak];
    if (totalIn > 0) SQ.Ledger.noteMat(ws, 'in', totalIn);
    if (overflowN > 0) {
      /* 溢出部分：材料账同笔双路 + 灵石 in.event 三账同记 */
      SQ.Ledger.noteMat(ws, 'in', overflowN);
      SQ.Ledger.noteMat(ws, 'out', overflowN);
      var s0 = ws.stones;
      ws.stones += overflowStones;
      SQ.Ledger.note(ws, 'in', 'event', ws.stones - s0);
      if (log) log('sys', SQ.t('alchemy.log.overflow', { n: overflowStones, cur: SQ.t('resource.currency', null, pack.worldId) }, pack.worldId));
    }
    return { added: added, overflowN: overflowN, overflowStones: overflowStones };
  }
  function takeMats(ws, D, costs) {
    /* 扣料前校验足额；足额才扣（out.materials 一次记账），返回 false = 材料不足 */
    ensure(ws, D);
    for (var id in costs) if ((ws.materials[id] || 0) < costs[id]) return false;
    var total = 0;
    for (var id2 in costs) {
      ws.materials[id2] -= costs[id2];
      total += costs[id2];
      if (ws.materials[id2] <= 0) delete ws.materials[id2];
    }
    SQ.Ledger.noteMat(ws, 'out', total);
    return true;
  }

  /* ── 材料三源 ────────────────────────────────────────── */
  /* ① 击杀掉落（combat.simulate 每杀独立掷判调用；p 计算在调用方 = 同消费点同乘区） */
  function killGain(ws, pack, D, zoneIdx, now) {
    var pool = zoneMats(D, zoneIdx);
    if (!pool.length) return null;
    var id = pick(pool);
    var r = addMats(ws, pack, D, (function () { var o = {}; o[id] = 1; return o; })(), now, null);
    return r.added[id] ? id : null;
  }
  /* ② 采集点（每区 1 处 · 历练自动轴）：驻区历练时每 1 游戏年入账 1~4 枚本区材料。
   * 无手动入口——锚点仅在历练模式推进，非历练/离线只重置锚点（不攒不补）。 */
  function gatherTick(ws, pack, D, now, offline, log) {
    var AL = A(D);
    var z = ws.zone;
    ensure(ws, D);
    var iv = AL.GATHER_INTERVAL_MS || 360000;
    if (ws.gather[z] == null) { ws.gather[z] = now; return null; }   /* 首次锚点初始化不产出 */
    if (offline || (D.MODES[ws.mode] || {}).combat !== true) { ws.gather[z] = now; return null; }
    if (now - ws.gather[z] < iv) return null;
    ws.gather[z] = now;
    var pool = zoneMats(D, z);
    if (!pool.length) return null;
    var n = randInt(AL.GATHER_N_MIN || 1, AL.GATHER_N_MAX || 4);
    var gains = {};
    for (var i = 0; i < n; i++) {
      var id = pick(pool);
      gains[id] = (gains[id] || 0) + 1;
    }
    var wudao = Math.random() < (AL.GATHER_WUDAO_P || 0.10);
    if (wudao) gains['mat_wudao'] = (gains['mat_wudao'] || 0) + 1;
    addMats(ws, pack, D, gains, now, null);
    if (log) log('sys', SQ.t('alchemy.log.gather', {
      zone: SQ.t('combat.zone.' + z, null, pack.worldId), n: n
    }, pack.worldId));
    return { ok: true, gains: gains, wudao: wudao, n: n };
  }
  /* ③ 灵田（caveFac 'lingtian' 既有设施的材料产出扩展轴 · §2.4）：
   * 驻留福地灵田 Lv≥1 时，在线每 6 游戏月（180 现实秒）入账 1~4 枚本区材料；
   * 离线不产不补（回线只重置锚点）；禁 qiRate 天然合规 */
  function farmTick(ws, pack, D, now, offline, log) {
    var AL = A(D);
    var cv = SQ.Cave ? SQ.Cave.current(ws, pack) : null;
    var lv = (cv && ws.cave && ws.cave.fac && ws.cave.fac[cv.id] && ws.cave.fac[cv.id].lingtian) || 0;
    ensure(ws, D);
    var iv = AL.FARM_INTERVAL_MS || 180000;
    if (!ws.alchemy.farmAt) { ws.alchemy.farmAt = now; return null; }   /* 首次锚点初始化不产出 */
    if (offline) { ws.alchemy.farmAt = now; return null; }              /* 离线不产不补 */
    if (lv <= 0 || now - ws.alchemy.farmAt < iv) return null;
    ws.alchemy.farmAt = now;
    var pool = zoneMats(D, Math.min(ws.realm, (D.ZONES || []).length - 1));
    if (!pool.length) return null;
    var n = randInt(AL.FARM_N_MIN || 1, AL.FARM_N_MAX || 4);
    var gains = {};
    for (var i = 0; i < n; i++) {
      var id = pick(pool);
      gains[id] = (gains[id] || 0) + 1;
    }
    addMats(ws, pack, D, gains, now, null);
    if (log) log('sys', SQ.t('alchemy.log.farm', { n: n }, pack.worldId));
    return { ok: true, gains: gains, n: n };
  }

  /* ── 丹炉资格（三渠道 §4.1 + 宗门丹房第四渠道 自立门户卷 §4.2 丹房①）──
   * 渠道：本世 furnace flag / meta.unlocks.alchemy（遗泽丹房资格）/ 驻留福地丹房 ≥1 级
   *      / 在任宗门丹房 ≥1 级（接线批：传位后 ws.sect.succession 已置 → 渠道自动摘除）。 */
  function sectDanfangLv(ws, D) {
    var sc = (ws || {}).sect;
    if (!sc || sc.succession) return 0;
    return Math.max(0, Math.floor(num((sc.fac || {}).danfang, 0)));
  }
  function hasFurnace(ws, pack, D, meta) {
    var al = ws.alchemy;
    if (al && al.furnace) return true;
    if (meta && meta.unlocks && meta.unlocks.alchemy === true) return true;
    var cv = SQ.Cave ? SQ.Cave.current(ws, pack) : null;
    if (cv && ws.cave && ws.cave.fac && ws.cave.fac[cv.id] && (ws.cave.fac[cv.id].danfang || 0) >= 1) return true;
    if (sectDanfangLv(ws, D) >= 1) return true;                 /* ④ 宗门丹房（自立门户卷 §4.2 ①） */
    return false;
  }

  /* 丹房成功率加项（自立门户卷 §4.2 丹房①：平坦 +5%，**不随等级缩放**——满级递进 ⏳ 未定待炼丹卷补行）。
   * 并存裁定（两卷全无规定，本批择最不意外口径）：
   *   ① 资格侧——四渠道是**布尔并集**，福地丹房与宗门丹房同在不叠出第二层资格（本就是 bool，无叠乘面）；
   *   ② 速率侧——+5% 唯一挂载对象是**宗门**丹房；福地丹房按炼丹卷 §4.1 ③ 只给「视同丹炉」+ artsSpeed
   *      +1.5%/级轴，**永不因等级追加成功率**（卷面无此数），故两路并存也只有一份 +5%，零双计。
   * 否决方案：按宗门+按福地各给一份 / 两份相加 = 文档未授权的第二数值，弃。
   * 福地丹房既有 artsSpeed +1.5%/级轴（cave.js 侧）零改动。 */
  function danfangCraftBonus(ws, D) {
    return sectDanfangLv(ws, D) >= 1 ? ((((D || {}).SECT) || {}).DANFANG_CRAFT || 0) : 0;
  }

  function profRank(D, n) {
    var ranks = A(D).PROF_RANKS || [0, 20, 60, 150, 400];
    var r = 0;
    for (var i = 0; i < ranks.length; i++) if (n >= ranks[i]) r = i;
    return r;
  }
  /* ws 为第 4 可选参（旧三参调用式全部保持有效：缺省 = 无丹房加项） */
  function craftP(D, tierKey, rank, ws) {
    var base = (A(D).CRAFT_BASE || {})[tierKey] || 0.85;
    var bonus = (A(D).PROF_BONUS || [0])[rank] || 0;
    return Math.min(A(D).CRAFT_CAP || 0.95, base + bonus + danfangCraftBonus(ws, D));
  }
  function craftMs(D, tierKey, rank) {
    var mins = (A(D).CRAFT_TIME_MIN || {})[tierKey] || 10;
    var cut = (A(D).PROF_TIME_CUT || [0])[rank] || 0;
    return Math.round(mins * 60000 * (1 - cut));
  }
  function recipeById(D, id) {
    var out = null;
    (A(D).RECIPES || []).forEach(function (r) { if (r.id === id) out = r; });
    return out;
  }
  function bpById(D, id) {
    var out = null;
    (A(D).BLUEPRINTS || []).forEach(function (b) { if (b.id === id) out = b; });
    return out;
  }
  function recipeActive(ws, D, id) {
    var r = recipeById(D, id);
    if (!r) return false;
    if ((ws.alchemy && ws.alchemy.recipes || []).indexOf(id) < 0) return false;
    return ws.realm >= r.realm;
  }

  /* ── 炼制（单槽队列 · 开工扣料 + 熟练度即时入账 · 出炉掷成功率）──── */
  function startCraft(ws, pack, D, kind, id, opts, meta, now, log) {
    var AL = A(D);
    if (ws.realm < (AL.UNLOCK_REALM != null ? AL.UNLOCK_REALM : 1)) return { ok: false, reason: 'realm' };
    ensure(ws, D);
    var al = ws.alchemy;
    if (al.craft) return { ok: false, reason: 'busy' };
    if (!hasFurnace(ws, pack, D, meta)) return { ok: false, reason: 'furnace' };
    opts = opts || {};
    if (kind === 'dan') {
      var r = recipeById(D, id);
      if (!r || !recipeActive(ws, D, id)) return { ok: false, reason: 'recipe' };
      var stockKey = r.pill;
      if ((al.pills[stockKey] || 0) >= (AL.PILL_STOCK_CAP || 99)) return { ok: false, reason: 'stock' };
      var costs = {};
      r.mats.forEach(function (m) { costs[m[0]] = m[1]; });
      if (!takeMats(ws, D, costs)) return { ok: false, reason: 'mats' };
      al.prof.dan += 1;                            /* 开工瞬间入账，成败均计 */
      al.fires = (al.fires || 0) + 1;              /* 成就 achv_danfang 事件源（首次开工） */
      al.craft = { kind: 'dan', id: id, doneAt: now + craftMs(D, r.tier, profRank(D, al.prof.dan)) };
      if (log) log('sys', SQ.t('alchemy.log.start.dan', { name: SQ.t('alchemy.recipe.' + id + '.name', null, pack.worldId) }, pack.worldId));
      return { ok: true, craft: al.craft };
    }
    if (kind === 'qi') {
      var bp = bpById(D, id);
      if (!bp || al.blueprints.indexOf(id) < 0) return { ok: false, reason: 'bp' };
      var n = bp.furnace ? (AL.FURNACE_MAT_COST || 10)
        : (bp.jing ? (AL.FORGE_MAT_COST_JING || 12) : (AL.FORGE_MAT_COST || 6));
      if (bp.furnace && al.furnace) return { ok: false, reason: 'has' };
      /* 当前区主材 ×n：在该区 2~3 种间自动均摊（玩家侧材料同质，无需逐种分配 UI） */
      var pool = zoneMats(D, Math.min(ws.realm, (D.ZONES || []).length - 1));
      if (!pool.length) return { ok: false, reason: 'mats' };
      var costs2 = {};
      var left = n;
      for (var pi = 0; left > 0; pi++) {
        var mid = pool[pi % pool.length];
        var can = Math.min(left, ws.materials[mid] || 0);
        if (can > 0) { costs2[mid] = (costs2[mid] || 0) + can; left -= can; }
        if (pi > pool.length * 2) break;
      }
      if (left > 0) return { ok: false, reason: 'mats' };
      /* 方向校验（槽位图纸才有方向；未达品阶线的方向拒绝） */
      var zc = Math.min(ws.realm, (D.ZONES || []).length - 1);
      var tierC = bpTierOf(ws, D, zc, bp);   /* 精制 +1 后口径：minTier 解锁与灵品 attr 必选同判 */
      if (!bp.furnace) {
        var dirs = (AL.FORGE_DIRS || {})[bp.slot] || [];
        var dok = false;
        dirs.forEach(function (dd) {
          if (dd.dir === opts.dir && tierC >= (dd.minTier || 0)) dok = true;
        });
        if (!dok) return { ok: false, reason: 'dir' };
        if (tierC >= 3 && !(opts.attr === 'jing' || opts.attr === 'qi' || opts.attr === 'shen')) {
          return { ok: false, reason: 'attr' };      /* 灵品起 attrValue 必选（精气神三选） */
        }
      }
      if (!takeMats(ws, D, costs2)) return { ok: false, reason: 'mats' };
      al.prof.qi += 1;
      al.craft = { kind: 'qi', id: id, dir: opts.dir || null, attr: opts.attr || null,
        doneAt: now + craftMs(D, bp.jing ? 'qi_jing' : 'qi', profRank(D, al.prof.qi)) };
      if (log) log('sys', SQ.t('alchemy.log.start.qi', { name: SQ.t('alchemy.bp.' + id + '.name', null, pack.worldId) }, pack.worldId));
      return { ok: true, craft: al.craft };
    }
    return { ok: false, reason: 'kind' };
  }

  /* 打造品阶 = clamp(⌊D(z) − 0.5⌋, 0, 4)（§6.4 逐区对照：凡×4 / 良×2 / 上×2 / 灵×2） */
  function dropExpectOf(D, z) {
    var drops = (D.ZONES[z] || {}).drops || [];
    var e = 0;
    for (var i = 0; i < drops.length; i++) e += i * (drops[i] / 100);
    return e;
  }
  function forgeTierOf(ws, D, z) {
    var e = dropExpectOf(D, z);
    return Math.max(0, Math.min(4, Math.floor(e - (A(D).FORGE_DROP_K != null ? A(D).FORGE_DROP_K : 0.5))));
  }
  /* 图纸实际打造品阶（扩容批 §十二.3）：精制图纸 +1（clamp 0~4 不破），普通/丹炉同 forgeTierOf */
  function bpTierOf(ws, D, z, bp) {
    var t = forgeTierOf(ws, D, z);
    if (bp && bp.jing) t = Math.min(4, t + 1);
    return t;
  }

  /* 打造件生成（§6.5）：词条种类由品阶+槽位+方向完全确定（无随机 special）；主词条 [50%,100%]
   * 上半区 roll；alignment='neutral'（不吃魔道 ×1.10 与 karma 代价）；attrValue 灵品起自由指定；
   * 佩戴要求与极品追加（前 10% → reqs+1 + prime）走 §3.5 同规则；source.type='forge'。 */
  function forgeItem(ws, pack, D, craft, now) {
    var AL = A(D);
    var bp = bpById(D, craft.id);
    if (!bp || bp.furnace) return null;
    var z = Math.min(ws.realm, (D.ZONES || []).length - 1);
    var tier = bpTierOf(ws, D, z, bp);   /* 精制跨阶 +1（§十二.3）；词条区间/佩戴要求/极品追加全按新档走 Gear 规则 */
    var T = D.GEAR_TIERS[tier];
    var scale = Math.max(D.REALMS[D.ZONES[z].unlock].power / 100, 1);
    var mainField = 'atk';
    var dirs = (AL.FORGE_DIRS || {})[bp.slot] || [];
    dirs.forEach(function (dd) { if (dd.dir === craft.dir) mainField = dd.field; });
    var MR = AL.FORGE_MAIN_RANGE || [0.5, 1.0];
    function rollRange(range, isMain, dp) {
      var lo = range[0], hi = range[1];
      if (isMain) lo = lo + (hi - lo) * MR[0];
      var v = lo + Math.random() * (hi - lo);
      return dp != null ? Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp) : Math.round(v);
    }
    var item = {
      slot: bp.slot, name: SQ.Gear.nameOf(bp.slot, pack.worldId), alignment: 'neutral', tier: tier,
      atk: 0, reqs: { realm: Math.max(0, T.req) }, special: null,
      source: { type: 'forge', ref: craft.id }, forged: mainField
    };
    item.atk = Math.round(rollRange(T.atk, mainField === 'atk') * scale);
    var prime = false;
    if (T.qiBonus && tier >= 1) {
      item.qiBonus = rollRange(T.qiBonus, mainField === 'qiBonus', 3);
    }
    if (T.resist && tier >= 2) {
      var rv = rollRange(T.resist, mainField === 'resist');
      if (rv >= T.resist[1] - (T.resist[1] - T.resist[0]) * D.PRIME_TOP_PCT) prime = true;
      item.resist = rv;
    }
    if (T.attr && tier >= 3) {
      var attr = (craft.attr === 'jing' || craft.attr === 'qi' || craft.attr === 'shen')
        ? craft.attr
        : pick(['jing', 'qi', 'shen']);
      var av = rollRange(T.attr, false);
      if (av >= T.attr[1] - (T.attr[1] - T.attr[0]) * D.PRIME_TOP_PCT) prime = true;
      item.attrValue = { attr: attr, value: av };
    }
    if (prime && T.req >= 0) item.reqs.realm += 1;
    if (prime) item.prime = true;
    return item;
  }

  /* 出炉（claim 读点显式收取 · 掷成功率读出炉瞬间熟练度档位） */
  function collectCraft(ws, pack, D, mods, meta, now, log) {
    ensure(ws, D);
    var al = ws.alchemy;
    var cr = al.craft;
    if (!cr) return { ok: false, reason: 'none' };
    if (now < cr.doneAt) return { ok: false, reason: 'wait', doneAt: cr.doneAt };
    var AL = A(D);
    if (cr.kind === 'dan') {
      var r = recipeById(D, cr.id);
      var rankD = profRank(D, al.prof.dan);
      var isRune = rankD >= 3 && Math.random() < (AL.RUNE_P || 0.05) &&
        !!(r && (AL.APILLS || {})[r.pill] && (AL.APILLS[r.pill]).buff);   /* 丹纹仅时限四型（双特例不参与） */
      var key = isRune ? r.pill + '_rw' : r.pill;
      if ((al.pills[key] || 0) >= (AL.PILL_STOCK_CAP || 99)) return { ok: false, reason: 'stock' };
      var pD = craftP(D, r ? r.tier : 'huang', rankD, ws);
      var winD = Math.random() < pD;
      al.craft = null;
      if (!winD) {
        if (log) log('sys', SQ.t('alchemy.log.fail.dan', { name: SQ.t('alchemy.recipe.' + cr.id + '.name', null, pack.worldId) }, pack.worldId));
        return { ok: true, success: false, p: pD };
      }
      al.pills[key] = (al.pills[key] || 0) + 1;
      if (isRune) {
        al.jiuzhuan = (al.jiuzhuan || 0) + 1;      /* 成就 achv_jiuzhuan 事件源（丹成九转） */
        if (log) log('sys', SQ.t('alchemy.log.rune', { name: SQ.t('alchemy.pill.jiuzhuan', null, pack.worldId) }, pack.worldId));
      } else if (log) {
        log('sys', SQ.t('alchemy.log.win.dan', { name: SQ.t('alchemy.pill.' + key + '.name', null, pack.worldId) }, pack.worldId));
      }
      return { ok: true, success: true, p: pD, pill: key, rune: isRune };
    }
    /* 炼器出炉（丹房加项只挂**炼丹**成功率 = 自立门户卷 §4.2 丹房① 原文，器台零波及 → 不传 ws） */
    var bp = bpById(D, cr.id);
    var rankQ = profRank(D, al.prof.qi);
    var pQ = craftP(D, (bp && bp.jing) ? 'qi_jing' : 'qi', rankQ);
    var winQ = Math.random() < pQ;
    al.craft = null;
    if (!winQ) {
      if (log) log('sys', SQ.t('alchemy.log.fail.qi', null, pack.worldId));
      return { ok: true, success: false, p: pQ };
    }
    if (bp && bp.furnace) {
      al.furnace = true;
      if (log) log('sys', SQ.t('alchemy.log.furnace', null, pack.worldId));
      return { ok: true, success: true, p: pQ, furnace: true };
    }
    var item = forgeItem(ws, pack, D, cr, now);
    if (!item) return { ok: true, success: false, p: pQ };
    al.forgeMade = (al.forgeMade || 0) + 1;        /* 成就 achv_lianqi 事件源（首次炼器成功） */
    var res = SQ.Gear.autoEquip(ws, pack, D, mods, item, log);
    return { ok: true, success: true, p: pQ, item: item, res: res };
  }

  /* ── 服用丹药（§3.6 校验链：持有 → 双特例每境界限 → 丹毒日限 → 效果落地）── */
  function gameDayOf(ws, profile, now) {
    var born = (profile && profile.createdAt) || 0;
    return born > 0 ? Math.floor((now - born) / 1000) : 0;   /* 1 游戏日 = 1 现实秒（§1.6 同源） */
  }
  /* 丹药两族合一（第十七批）：自产 APILLS（ap_*，可带 _rw 丹纹版）与成品丹 D.PILLS 在**这一处**统一描述，
   * 进匣 / 服用 / 丹毒 / 赠礼四件事同轨；两族只在「效果怎么落」上不同。 */
  function pillDefOf(D, key) {
    var AL = A(D);
    var k = String(key || '');
    var base = k.replace(/_rw$/, ''), rune = /_rw$/.test(k);
    var ap = (AL.APILLS || {})[base];
    if (ap) return { id: base, kind: 'self', rune: rune, def: ap, tier: null,
      nogift: !!(ap.once || ap.swap), giftReason: ap.once ? 'once' : 'nogift',
      nameKey: 'alchemy.pill.' + (rune ? k : base) + '.name', descKey: 'alchemy.pill.' + base + '.desc',
      buff: ap.buff || null };
    var tp = null;
    (D.PILLS || []).forEach(function (p) { if (p && p.id === base) tp = p; });
    if (!tp) return null;
    return { id: base, kind: 'trade', rune: false, def: tp, tier: tp.tier,
      nogift: !!tp.nogift, giftReason: 'nogift',
      nameKey: 'pill.' + base + '.name', descKey: 'pill.' + base + '.desc',
      buff: (tp.effect || {}).buff || null };
  }
  /* 还有没有位置：**纯谓词，不改状态**（预检若顺手把丹加了，扣钱后再来一次就是双份 —— 第十七批首跑即栽在此）
   * shortcut: 四个购买口靠 `pillRoom` 预检保证 `gainPill` 必成，故不接其返回值；
   *           若将来出现「预检与入匣之间还能加丹」的并发口（赠送入匣 / 批量兑换），必须改接 gainPill 的 {ok,reason}。 */
  function pillRoom(ws, D, key, n) {
    ensure(ws, D);
    var pd = pillDefOf(D, key);
    if (!pd) return false;
    var cap = A(D).PILL_STOCK_CAP || 99;
    return (ws.alchemy.pills[pd.id] || 0) + Math.max(1, Math.floor(Number(n) || 1)) <= cap;
  }
  /* 入匣（四口共用：坊市 / 特席 / 门中供给 / 残片兑丹——黑市只掷装备·功法·法宝，从不掷丹）：**先判库存上限再扣钱** ——
   * 扣了灵石或残片却丢一颗丹，正是本仓反复收口的那一类静默零收益。 */
  function gainPill(ws, D, key, n, log, wid) {
    ensure(ws, D);
    var pd = pillDefOf(D, key);
    if (!pd) return { ok: false, reason: 'unknown' };
    var add = Math.max(1, Math.floor(Number(n) || 1));
    var cap = A(D).PILL_STOCK_CAP || 99;
    var now2 = ws.alchemy.pills[pd.id] || 0;
    if (now2 + add > cap) return { ok: false, reason: 'pillfull', have: now2, cap: cap };
    ws.alchemy.pills[pd.id] = now2 + add;
    if (log) log('sys', SQ.t('alchemy.log.stock.in', {
      name: SQ.t(pd.nameKey, null, wid), n: add, cur: ws.alchemy.pills[pd.id]
    }, wid));
    return { ok: true, id: pd.id, n: ws.alchemy.pills[pd.id], kind: pd.kind };
  }
  function drinkPill(ws, pack, D, pillKey, now, log, profile) {
    var AL = A(D);
    ensure(ws, D);
    var al = ws.alchemy;
    var pd = pillDefOf(D, pillKey);
    var def = pd && pd.kind === 'self' ? pd.def : null;
    if (!pd || (al.pills[pillKey] || 0) < 1) return { ok: false, reason: 'stock' };
    var rune = /_rw$/.test(pillKey);
    /* 双特例每境界限 1（独立于丹毒计数；被拒时不消耗当日计数——串行校验，§3.3） */
    if (def && def.once) {
      if ((al.pillOnce[def.once] != null ? al.pillOnce[def.once] : -1) === ws.realm) {
        return { ok: false, reason: 'once' };
      }
    }
    /* 洗髓丹刻意**不套**每境界一服闸（本世上限已由 D.TALENT_SWAP.PER_LIFE 卡住，同境连服是设计意图）；
     * 但预算已满必须在扣丹之前拒 —— 先扣后赐就是「吃一颗丹、零收益、还报成功」 */
    if (def && def.swap && !SQ.Talents.swapRoom(ws, D)) return { ok: false, reason: 'swapfull' };
    /* 丹毒：每游戏日 4 颗（第十七批 3 → 4）——**自产丹与成品丹同池同计数**（跨日自动清零重计） */
    var day = gameDayOf(ws, profile, now);
    if (al.pillDay.day !== day) al.pillDay = { day: day, n: 0 };
    if (al.pillDay.n >= (AL.PILL_DAILY_CAP || 3)) return { ok: false, reason: 'daily' };
    al.pills[pillKey] -= 1;
    if (al.pills[pillKey] <= 0) delete al.pills[pillKey];
    al.pillDay.n += 1;
    var wid = pack.worldId;
    if (def && def.buff) {
      var mult = def.buff.mult * (rune ? 2 : 1);   /* 丹纹版数值 ×2、时长不变（§4.5） */
      SQ.Events.pushBuff(ws, def.buff.field, mult, now + Math.round(def.buff.hours * 3600000), 'alchemy');
      if (log) log('sys', SQ.t('alchemy.log.drink.buff', { name: SQ.t('alchemy.pill.' + pillKey + '.name', null, wid) }, wid));
    } else if (def && def.once === 'pozhang') {
      /* 数值取丹方自己那条 `mod`（审计 #14）：原先住的是 AL.POZHANG_MOD，与 PILL_EFFECTS.ap_pozhang.mod
       * 同值两份 ⇒ 改丹方静默无效。分支已按 def.once 命中，mod 与 once 同在一条定义上，不需要兜底字面量。 */
      ws.breakCostNext = (ws.breakCostNext || 0) + def.mod;
      al.pillOnce.pozhang = ws.realm;
      if (log) log('sys', SQ.t('alchemy.log.drink.pozhang', null, wid));
    } else if (def && def.once === 'zhenjie') {
      ws.tribulation.next = (ws.tribulation.next || 0) + def.mod;
      al.pillOnce.zhenjie = ws.realm;
      if (log) log('sys', SQ.t('alchemy.log.drink.zhenjie', null, wid));
    } else if (def && def.swap) {
      /* 洗髓丹：只赐缘不改属性，换不换、换哪一格都由玩家在洗髓浮层里定（天赋池设计 v1.8 §十） */
      SQ.Talents.grantSwap(ws, D);
      if (log) log('sys', SQ.t('alchemy.log.drink.xisui', null, wid));
    } else if (pd.kind === 'trade') {
      /* 成品丹（第十七批入匣）：效果字典与旧「购买即生效」逐字同一份，只是**由玩家决定何时落**。
       * 传副本 = 纪律（见 events.js applyEffects 头注）：直传 `tp.effect` 会让一次服用改坏表。 */
      SQ.Events.applyEffects(ws, pack, D, SQ.Mods.collect(profile, ws, pack, D),
        Object.assign({}, pd.def.effect),
        { log: log, now: now, silent: false, buffSource: 'alchemy',
          /* 丹名递给寿元日志（第卌八批）：applyEffects 侧没有丹药这个名字，不传就写成缺主语的半句 */
          lifeSrc: SQ.t(pd.nameKey, null, pack.worldId) });
      /* 时长口径与改前**逐字相同**：`applyEffects` 的 resolveEff 直接用 effect 里的 `hours` 原值
       * （`rollBuffHours` 只作用于奇遇掷点现生成的 buff，见 events.js:54 / :826），本处不另算一套 */
    }
    return { ok: true, rune: rune, swap: !!(def && def.swap), kind: pd.kind };
  }

  /* ── 出售材料（背包 → 系统回收：in.event，卖价 = MAT_SELL[组] 固定价）── */
  function sellMats(ws, pack, D, matId, n, now, log) {
    ensure(ws, D);
    n = Math.max(0, Math.floor(num(n, 0)));
    var have = ws.materials[matId] || 0;
    if (!have || !n) return { ok: false, reason: 'stock' };
    n = Math.min(n, have);
    ws.materials[matId] = have - n;
    if (ws.materials[matId] <= 0) delete ws.materials[matId];
    SQ.Ledger.noteMat(ws, 'out', n);
    var gain = n * sellPriceOf(D, matId);
    var s0 = ws.stones;
    ws.stones += gain;
    SQ.Ledger.note(ws, 'in', 'event', ws.stones - s0);
    if (log) log('sys', SQ.t('alchemy.log.sell', {
      name: SQ.t('alchemy.mat.' + matId + '.name', null, pack.worldId), n: n,
      v: SQ.fmt(ws.stones - s0), cur: SQ.t('resource.currency', null, pack.worldId)
    }, pack.worldId));
    return { ok: true, n: n, gain: ws.stones - s0 };
  }

  /* ── 坊市 pack 格二级权重（§2.5）：灵石包 50 / 材料包 25 / 丹方 10 / 器图纸 10 / 丹炉成品 5
   * （只上未持有；空池权重按比例摊回；黑市不入本线货格）── */
  function rollPackGood(ws, pack, D) {
    var AL = A(D);
    ensure(ws, D);
    var al = ws.alchemy;
    var W = AL.SHOP_PACK_W || { pack: 50, mat: 25, recipe: 10, bp: 10, furnace: 5 };
    var recipeC = (AL.RECIPES || []).filter(function (r) { return al.recipes.indexOf(r.id) < 0; });
    var bpC = (AL.BLUEPRINTS || []).filter(function (b) {
      if (al.blueprints.indexOf(b.id) >= 0) return false;
      if (b.furnace && al.furnace) return false;
      return true;
    });
    var pairs = [[W.pack, { type: 'pack' }], [W.mat, { type: 'mat' }]];
    if (recipeC.length) {
      var rc = pick(recipeC);
      pairs.push([W.recipe, { type: 'recipe', ref: rc.id, price: (AL.RECIPE_PRICES || {})[rc.tier] || 400 }]);
    }
    if (bpC.length) {
      var bc = pick(bpC);
      pairs.push([W.bp, { type: 'bp', ref: bc.id, price: bc.furnace ? (AL.FURNACE_BP_PRICE || 800)
        : (bc.jing ? (AL.BP_PRICE_JING || 1500) : (AL.BP_PRICE || 600)) }]);
    }
    if (!al.furnace) pairs.push([W.furnace, { type: 'furnace', price: AL.FURNACE_PRICE || 2000 }]);
    var total = 0;
    pairs.forEach(function (p) { total += p[0]; });
    var r = Math.random() * total, chosen = pairs[pairs.length - 1][1];
    for (var i = 0; i < pairs.length; i++) {
      r -= pairs[i][0];
      if (r < 0) { chosen = pairs[i][1]; break; }
    }
    if (chosen.type === 'mat') {
      var g = groupOf(D, pick(zoneMats(D, Math.min(ws.realm, (D.ZONES || []).length - 1))) || 'mat_linglu');
      chosen.price = ((AL.MAT_SELL || [8])[g] || 8) * 2 * 3;   /* 材料包 = 组价 ×2 ×3 枚 */
      chosen.zoneGroup = g;
    }
    return chosen;
  }
  /* pack 格购买兑现（shop.buy 内调用；灵石已扣、out.shop 已记） */
  /* 这手子货玩家是否已经有了（第廿六批 · 坊市购买的先判后扣用）：与 `deliverPackGood` 的三分支
   * 同口径 —— 丹方看在册、图纸看「丹炉图 → 已有炉即无意义 / 普通图看在册」、丹炉成品看炉。
   * 材料包永远可入（叠加无上限），故恒 false。 */
  function goodOwned(ws, D, good) {
    var al = ws.alchemy;
    if (!al) return false;
    if (good.type === 'recipe') return al.recipes.indexOf(good.ref) >= 0;
    if (good.type === 'bp') {
      var bp = bpById(D, good.ref);
      if (bp && bp.furnace) return !!al.furnace;
      return al.blueprints.indexOf(good.ref) >= 0;
    }
    if (good.type === 'furnace') return !!al.furnace;
    return false;
  }

  function deliverPackGood(ws, pack, D, mods, good, log) {
    ensure(ws, D);
    var al = ws.alchemy;
    if (goodOwned(ws, D, good)) return { ok: false, reason: 'dup' };   /* 第廿六批：已拥有不再重复发货（坊市侧先判后扣） */
    if (good.type === 'mat') {
      /* 发货按**定价时那一组**（审计 #9）：rollPackGood 用 groupOf 定价并把组号记进 good.zoneGroup（此前
       * 只写不读 = 嵌套死字段），而这里原先按「购买时的境界分区」重算池子 ⇒ 4h 补货窗内升境就跨组套利
       * （组 0 的价拿到组 1 的料，回收价反超买价）。老货架上没记组号的旧包仍走原口径（零迁移）。 */
      var grp = good.zoneGroup;
      var pool = (grp != null ? (A(D).MATS || []).filter(function (m) {
        return groupOf(D, m.id) === grp;
      }).map(function (m) { return m.id; }) : zoneMats(D, Math.min(ws.realm, (D.ZONES || []).length - 1)));
      if (!pool.length) pool = zoneMats(D, Math.min(ws.realm, (D.ZONES || []).length - 1));
      var gains = {};
      for (var i = 0; i < 3; i++) {
        var id = pick(pool);
        if (id) gains[id] = (gains[id] || 0) + 1;
      }
      addMats(ws, pack, D, gains, Date.now(), log);
      if (log) log('shop', SQ.t('alchemy.log.matpack', null, pack.worldId));
    } else if (good.type === 'recipe') {
      if (al.recipes.indexOf(good.ref) < 0) al.recipes.push(good.ref);
    } else if (good.type === 'bp') {
      var bp = bpById(D, good.ref);
      if (bp && bp.furnace) al.furnace = true;
      else if (al.blueprints.indexOf(good.ref) < 0) al.blueprints.push(good.ref);
    } else if (good.type === 'furnace') {
      al.furnace = true;
    }
    return { ok: true };
  }

  /* ── 材料提炼（扩容批 §十二.4 · 炼材入宝）：同材料 ×REFINE_IN(4) → 次组随机材料 ×1 ──
   * 组间 4:1 = 低组边际增益 / 平组持平 / 高组微亏（天然抑套利，无需灵石费——Ledger 分类零新增）；
   * 禁炼：悟道石（z<0 专属渠道）与 z9 组（无次组）；产出池 = 次组 z>=0 全材料随机。 */
  function refineMats(ws, pack, D, matId, now, log) {
    ensure(ws, D);
    var need = A(D).REFINE_IN || 4;
    var m = null;
    (A(D).MATS || []).forEach(function (x) { if (x.id === matId) m = x; });
    if (!m || m.z < 0) return { ok: false, reason: 'wudao' };
    var g = groupOf(D, matId);
    if (g >= 3) return { ok: false, reason: 'top' };
    if ((ws.materials[matId] || 0) < need) return { ok: false, reason: 'stock' };
    var costs = {}; costs[matId] = need;
    if (!takeMats(ws, D, costs)) return { ok: false, reason: 'stock' };
    var pool = groupIds(D, g + 1);
    if (!pool.length) return { ok: false, reason: 'pool' };   /* 理论不可达（组 0~2 均有次组池） */
    var gainId = pick(pool);
    addMats(ws, pack, D, (function () { var o = {}; o[gainId] = 1; return o; })(), now, null);
    if (log) log('sys', SQ.t('alchemy.log.refine', {
      name: SQ.t('alchemy.mat.' + matId + '.name', null, pack.worldId),
      gain: SQ.t('alchemy.mat.' + gainId + '.name', null, pack.worldId)
    }, pack.worldId));
    return { ok: true, gain: gainId };
  }

  /* 悟道石消耗口（融合器灵卷通道 B 共用：×1、失败不返还，记 out.materials） */
  function consumeWudao(ws, D, n) {
    ensure(ws, D);
    var have = ws.materials['mat_wudao'] || 0;
    n = n || 1;
    if (have < n) return false;
    ws.materials['mat_wudao'] = have - n;
    if (ws.materials['mat_wudao'] <= 0) delete ws.materials['mat_wudao'];
    SQ.Ledger.noteMat(ws, 'out', n);
    return true;
  }

  SQ.Alchemy = {
    normalizeMaterials: normalizeMaterials,
    normalizeGather: normalizeGather,
    normalizeLedgerMat: normalizeLedgerMat,
    normalize: normalize,
    ensure: ensure,
    autoGrant: autoGrant,
    zoneMats: zoneMats,
    groupOf: groupOf,
    groupIds: groupIds,   /* 第廿九批：某一提炼档的材料 id，`refineMats` 的产出池与材料背包的「下一档候选」同读这一处 */
    sellPriceOf: sellPriceOf,
    addMats: addMats,
    takeMats: takeMats,
    killGain: killGain,
    gatherTick: gatherTick,
    farmTick: farmTick,
    hasFurnace: hasFurnace,
    sectDanfangLv: sectDanfangLv,
    danfangCraftBonus: danfangCraftBonus,
    profRank: profRank,
    craftP: craftP,
    craftMs: craftMs,
    recipeById: recipeById,
    bpById: bpById,
    recipeActive: recipeActive,
    startCraft: startCraft,
    forgeTierOf: forgeTierOf,
    bpTierOf: bpTierOf,
    refineMats: refineMats,
    forgeItem: forgeItem,
    collectCraft: collectCraft,
    drinkPill: drinkPill,
    pillDefOf: pillDefOf,
    gainPill: gainPill,
    pillRoom: pillRoom,
    sellMats: sellMats,
    rollPackGood: rollPackGood,
    deliverPackGood: deliverPackGood,
    goodOwned: goodOwned,   /* 第廿六批：坊市购买「先判后扣」的重复判定口（与 deliverPackGood 同一分支口径） */
    consumeWudao: consumeWudao,
    gameDayOf: gameDayOf
  };
})();
