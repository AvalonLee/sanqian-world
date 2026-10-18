/* systems/fusion.js — 功法融合与法宝器灵（修仙实现卷 · 融合器灵卷 v1.1 唯一事实源）
 * 融合：双 Lv9 父本（非 event_locked、gen<3）+ 悟道双通道（闭关累计 ≥12h 或悟道石 ×1）
 *   → p = clamp(0.60 + min(floor(神/6),8)×0.01 + min(境界,9)×0.02, 0.60, 0.86)
 *   → 词条重组（主修均值 ×1.1×GEN_MULT 三代递减 + FIELD_CAP 守恒双闸 + 独占签名与非乘区字段永不产出）
 *   → 自创部 Lv1 入持有（双亲消耗：移出等级/槽位/书阁，已知态留 artsKnown——散功同构型不退灵石）。
 * 器灵：温养三来源（祭出在线 +3/h · 渡劫 +15 · 击杀 +0.5）→ 满值六档觉醒（人格器型加权 60/10×4）
 *   → 一灵一技（护魂/剑意/吞噬/凶性/仙音，CD 7 现实天，全走既有通道）→ 判词模板池（限流 10min）。
 * 纪律：ws.fusion 与 owned[].st.spirit 唯一写口 = 本模块；不进 tick 掷判（温养 = 结算点标量累加）；
 * 自创部不入正典静态池（#105/#153 审计零漂移）；mods FIELDS 零新增。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var num = SQ.util.num;   /* C1：统一至 assets/util.js */
  function F(D) { return D.FUSE || {}; }
  function SP(D) { return D.SPIRIT || {}; }
  var TIER_IDX = { huang: 0, xuan: 1, di: 2, tian: 3 };
  var TIER_NAME = ['huang', 'xuan', 'di', 'tian'];

  /* ── ws.fusion normalize（幂等 · customs ≤4 超限保最新 · 脏档逐项清理）── */
  function normalize(raw, D) {
    if (!raw || typeof raw !== 'object') return null;
    var out = {
      lastFuseAt: Math.max(0, num(raw.lastFuseAt, 0)),
      lastReforgeAt: Math.max(0, num(raw.lastReforgeAt, 0)),   /* 混沌淬炼 CD（融合扩容批 v1.3） */
      meditate: Math.max(0, num(raw.meditate, 0)),
      seq: Math.max(0, Math.floor(num(raw.seq, 0))),
      customs: []
    };
    var FF = F(D);
    var fields = FF.FIELD_CAP || {};
    (Array.isArray(raw.customs) ? raw.customs : []).forEach(function (c) {
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !/^c\d+$/.test(c.id)) return;
      var eff = {};
      var rawEff = (c.effects && typeof c.effects === 'object') ? c.effects : {};
      for (var k in rawEff) {
        if (fields[k] == null) continue;                      /* 只收 FIELD_CAP 在册乘区字段（第二道闸） */
        var v = num(rawEff[k], 0);
        if (!v) continue;
        eff[k] = clampField(k, v, fields);
      }
      if (!Object.keys(eff).length) return;
      var gen = Math.max(1, Math.min(FF.GEN_MAX || 3, Math.floor(num(c.gen, 1))));
      var tierI = Math.max(0, Math.min(3, Math.floor(num(c.tier, 0))));
      out.customs.push({
        id: c.id,
        name: (typeof c.name === 'string' && c.name) ? c.name.slice(0, FF.NAME_LEN || 8) : c.id,
        gen: gen, tier: tierI,
        attr: (c.attr === 'jing' || c.attr === 'qi' || c.attr === 'shen') ? c.attr : 'qi',
        align: (c.align === 'right' || c.align === 'evil') ? c.align : 'neutral',
        effects: eff,
        special: (c.special && typeof c.special === 'object' && typeof c.special.pool === 'string')
          ? { pool: c.special.pool.slice(0, 24), grade: Math.max(0, Math.min(2, Math.floor(num(c.special.grade, 0)))) } : null,
        parents: (Array.isArray(c.parents) ? c.parents : []).slice(0, 2).map(function (pp) {
          return { id: String((pp && pp.id) || '').slice(0, 24), name: String((pp && pp.name) || '').slice(0, 12),
            tier: Math.max(0, Math.min(3, Math.floor(num(pp && pp.tier, 0)))) };
        }),
        createdAt: Math.max(0, num(c.createdAt, 0))
      });
      var nI = parseInt(c.id.slice(1), 10);
      if (nI > out.seq) out.seq = nI;
    });
    while (out.customs.length > (FF.CUSTOM_MAX || 4)) out.customs.shift();   /* 超限保最新 */
    return out;
  }
  function clampField(k, v, caps) {
    var cap = caps[k];
    if (cap == null) return v;
    return cap >= 0 ? Math.min(v, cap) : Math.max(v, cap);
  }

  /* ── 自创部注册（运行态入 SQ.XARTS + 名称注入 SQ.LEX——存档字段不入静态词表文件，§4.2）──
   * 每次 normalize/load 同步一次：清孤儿 custom 键（转世/散功后）+ 重注册在档 4 门。 */
  function toArt(c) {
    return {
      id: c.id, tier: TIER_NAME[c.tier] || 'huang', alignment: c.align, attr: c.attr,
      effects: c.effects, special: c.special || null,
      obtain: { type: 'custom' }, custom: true, gen: c.gen
    };
  }
  function registerCustoms(fusion, D, worldId) {
    /* shortcut: 不带 worldId 的调用点回落首发世界（SQ.WORLD_DEFAULT 单点，不再是字面量）；
     * 第二界开工时逐点补真 worldId，散功那一路已从 actions 侧带进来作正面例。 */
    var wid = worldId || SQ.WORLD_DEFAULT;
    if (!SQ.XARTS) return;
    for (var k in SQ.XARTS) {
      if (SQ.XARTS[k] && SQ.XARTS[k].custom) delete SQ.XARTS[k];
    }
    var lex = SQ.LEX[wid] || (SQ.LEX[wid] = {});
    ((fusion || {}).customs || []).forEach(function (c) {
      SQ.XARTS[c.id] = toArt(c);
      lex['skill.' + c.id + '.name'] = c.name;
      lex['skill.' + c.id + '.desc'] = SQ.t('fuse.custom.desc', {
        gen: c.gen, a: (c.parents[0] || {}).name || '', b: (c.parents[1] || {}).name || ''
      }, wid);
    });
  }
  function ensure(ws, D) {
    if (!ws.fusion || typeof ws.fusion !== 'object') {
      ws.fusion = { lastFuseAt: 0, lastReforgeAt: 0, meditate: 0, seq: 0, customs: [] };
    }
    return ws.fusion;
  }
  function customById(ws, id) {
    var out = null;
    ((ws.fusion || {}).customs || []).forEach(function (c) { if (c.id === id) out = c; });
    return out;
  }
  function artDefOf(ws, id) {
    var c = customById(ws, id);
    return c ? toArt(c) : (SQ.XARTS ? SQ.XARTS[id] : null);
  }

  /* ── 悟道通道 A 计时（claim 内累加：在线 seclude + 离线结算时长，只增不减跨渡劫不清零）── */
  function meditateAdd(ws, D, dtMs, offline) {
    var f = ensure(ws, D);
    var hours = Math.max(0, num(dtMs, 0)) / 3600000;
    if (!offline) {
      var mode = (D.MODES || {})[ws.mode];
      if (!mode || !mode.combat) f.meditate += hours;      /* 闭关领悟（seclude）在线累计 */
    } else {
      f.meditate += hours;                                  /* 离线结算叙事即「闭关」 */
    }
  }

  /* ── 融合成功率（§2.2 公式定案）── */
  function fuseP(ws, D) {
    var FF = F(D);
    var shen = (ws.attrs || {}).shen || 0;
    var pp = Math.min(Math.floor(shen / (FF.SHEN_PER || 6)), FF.SHEN_CAP_PP || 8) * 0.01 +
      Math.min(ws.realm || 0, 9) * (FF.REALM_PP || 0.02);
    var cl = FF.P_CLAMP || [0.60, 0.86];
    return Math.max(cl[0], Math.min(cl[1], (FF.BASE_P || 0.60) + pp));
  }

  function canFuse(ws, pack, D, idA, idB, now) {
    var FF = F(D);
    var f = ws.fusion || { customs: [], lastFuseAt: 0, meditate: 0 };
    if (!idA || !idB || idA === idB) return { ok: false, reason: 'ids' };
    var a = artDefOf(ws, idA), b = artDefOf(ws, idB);
    if (!a || !b) return { ok: false, reason: 'unknown' };
    if ((a.obtain || {}).type === 'event_locked' || (b.obtain || {}).type === 'event_locked') {
      return { ok: false, reason: 'locked' };               /* 天阶独占 3 部禁入融合 */
    }
    /* 双亲必须满级。原写法 `(ws.artsLevels||{})[id] < 9` 在「档里无值」时是 `undefined < 9` = false
     * ⇒ 整道关被跳过（等级起点批照出的潜在缺陷）；改走 `Arts.levelOf`，读的是入门口径而不是对象有无键。 */
    if (SQ.Arts.levelOf(ws, idA) < 9 || SQ.Arts.levelOf(ws, idB) < 9) return { ok: false, reason: 'lv' };
    var cA = customById(ws, idA), cB = customById(ws, idB);
    if ((cA && cA.gen >= (FF.GEN_MAX || 3)) || (cB && cB.gen >= (FF.GEN_MAX || 3))) return { ok: false, reason: 'gen' };
    if ((f.customs || []).length >= (FF.CUSTOM_MAX || 4)) return { ok: false, reason: 'full' };
    if (f.lastFuseAt > 0 && now - f.lastFuseAt < (FF.CD_MS || 259200000)) {
      return { ok: false, reason: 'cd', until: f.lastFuseAt + (FF.CD_MS || 259200000) };
    }
    var hasStone = ((ws.materials || {})['mat_wudao'] || 0) >= 1;
    var hasMed = (f.meditate || 0) >= (FF.MEDITATE_NEED_H || 12);
    if (!hasStone && !hasMed) return { ok: false, reason: 'wudao' };
    return { ok: true, via: hasMed ? 'meditate' : 'stone' };
  }

  function rollName(ws, pack, D) {
    var FF = F(D);
    var guard = 0;
    function taken(nm) {
      var hit = false;
      ((ws.fusion || {}).customs || []).forEach(function (c) { if (c.name === nm) hit = true; });
      for (var id in SQ.XARTS) {
        var kn = 'skill.' + id + '.name';
        if (SQ.XARTS[id] && !SQ.XARTS[id].custom && SQ.t(kn, null, pack.worldId) === nm) hit = true;
      }
      return hit;
    }
    var nm = '';
    while (guard < 10) {
      guard++;
      nm = SQ.t('fuse.name.pre.' + (1 + Math.floor(Math.random() * (FF.PRE_N || 24))), null, pack.worldId) +
        SQ.t('fuse.name.suf.' + (1 + Math.floor(Math.random() * (FF.SUF_N || 20))), null, pack.worldId);
      if (!taken(nm)) return nm;
    }
    return nm + SQ.t('fuse.name.dup', null, pack.worldId);   /* 仍撞 → 追加代数标记「·贰」 */
  }

  /* ── 融合执行（mutate 事务内一次掷判 + 词条重组同事务落账，无中间态）── */
  function fuse(ws, pack, D, mods, nameCustom, idA, idB, now, log) {
    var FF = F(D);
    var chk = canFuse(ws, pack, D, idA, idB, now);
    if (!chk.ok) return chk;
    var f = ensure(ws, D);
    /* 悟道资格随尝试消耗（§2.2 失败语义正典口径）：通道 A 扣 12h 增量 / 通道 B 耗悟道石 ×1 不返还 */
    if (chk.via === 'meditate') f.meditate -= (FF.MEDITATE_NEED_H || 12);
    else if (!SQ.Alchemy.consumeWudao(ws, D, 1)) return { ok: false, reason: 'wudao' };
    f.lastFuseAt = now;                                      /* 成败均记 CD */
    var a = artDefOf(ws, idA), b = artDefOf(ws, idB);
    var p = fuseP(ws, D);
    var success = Math.random() < p;
    if (!success) {
      if (log) log('arts', SQ.t('fuse.log.fail', { p: Math.round(p * 100) }, pack.worldId));
      return { ok: true, success: false, p: p };
    }
    /* ── 词条重组（§3.2 定案算法）── */
    var NEVER = FF.NEVER_FIELDS || ['checkBonus', 'attrBonusAmp', 'tribFailLossMod'];
    function mainOf(def) {
      var best = null, bv = -Infinity;
      for (var k in def.effects) {
        if (NEVER.indexOf(k) >= 0) continue;
        var v = Math.abs(def.effects[k]);                    /* 负字段（realmCost）按幅度比较 */
        if (v > bv) { bv = v; best = k; }
      }
      return best ? { field: best, v: def.effects[best] } : null;
    }
    var mA = mainOf(a), mB = mainOf(b);
    /* 主修双亲 = 主修字段每级值较高者（并列取先传入者 = 正典出场序代理） */
    var mainParent = (!mB || (mA && Math.abs(mA.v) >= Math.abs(mB.v))) ? a : b;
    var subParent = mainParent === a ? b : a;
    var mM = mainParent === a ? mA : mB;
    var mO = mainParent === a ? mB : mA;
    var genP = Math.max((customById(ws, idA) || {}).gen || 0, (customById(ws, idB) || {}).gen || 0);
    var gen = Math.min(genP + 1, FF.GEN_MAX || 3);
    var gm = (FF.GEN_MULT || {})[gen] != null ? FF.GEN_MULT[gen] : 1;
    var caps = FF.FIELD_CAP || {};
    var effects = {};
    if (mM) {
      var mv;
      if (mO && mO.field === mM.field) {
        mv = ((mM.v + mO.v) / 2) * (FF.MAIN_MULT != null ? FF.MAIN_MULT : 1.1) * gm;   /* 同名：均值放大 */
      } else {
        mv = mM.v * 1.0 * gm;                                                        /* 异名：不双承 */
      }
      mv = Math.round(mv * 10000) / 10000;
      effects[mM.field] = clampField(mM.field, mv, caps);
    }
    /* 副字段：双亲全部副字段并入候选池，随机保留一条（原值、不放大） */
    var subPool = [];
    [[a, mA], [b, mB]].forEach(function (pr) {
      for (var k in pr[0].effects) {
        if (NEVER.indexOf(k) >= 0) continue;
        if (pr[1] && pr[1].field === k) continue;
        if (effects[k] != null) continue;
        subPool.push({ field: k, v: pr[0].effects[k] });
      }
    });
    if (subPool.length) {
      var sub = subPool[Math.floor(Math.random() * subPool.length)];
      effects[sub.field] = clampField(sub.field, sub.v, caps);
    }
    /* 特殊词条保留表（主 special 按档位概率 / 副 special 25%；单 special 槽，主优先） */
    var special = null;
    var ms = mainParent.special, ss = subParent.special;
    if (ms && ms.pool && NEVER.indexOf(ms.pool) < 0) {
      var keepP = (FF.SPECIAL_KEEP || {})[ms.grade] != null ? FF.SPECIAL_KEEP[ms.grade] : 0.5;
      if (Math.random() < keepP) special = { pool: ms.pool, grade: ms.grade };
    }
    if (!special && ss && ss.pool && (!ms || ss.pool !== ms.pool) && NEVER.indexOf(ss.pool) < 0) {
      if (Math.random() < (FF.SPECIAL_SUB_P != null ? FF.SPECIAL_SUB_P : 0.25)) special = { pool: ss.pool, grade: ss.grade };
    }
    /* 档位 = min(floor(均值+0.5), 天) */
    var tierI = Math.min(Math.floor((TIER_IDX[a.tier] + TIER_IDX[b.tier]) / 2 + (FF.TIER_BONUS != null ? FF.TIER_BONUS : 0.5)), 3);
    /* 命名：自定义 ≤8 字（敏感词过滤复用天道库，越线回落生成名）入存档不入静态词表 */
    var nm = null;
    if (typeof nameCustom === 'string' && nameCustom.trim()) {
      var cand = nameCustom.trim().slice(0, FF.NAME_LEN || 8);
      var bad = SQ.Tiandao && SQ.Tiandao.filterText ? SQ.Tiandao.filterText(cand, pack).hit : false;
      if (cand && !bad) nm = cand;
    }
    if (!nm) nm = rollName(ws, pack, D);
    f.seq = (f.seq || 0) + 1;
    var cid = 'c' + f.seq;
    var parentsSnap = [a, b].map(function (df, i) {
      var pid = i === 0 ? idA : idB;
      return { id: pid, name: SQ.t('skill.' + pid + '.name', null, pack.worldId), tier: TIER_IDX[df.tier] || 0 };
    });
    var custom = {
      id: cid, name: nm, gen: gen, tier: tierI,
      attr: mainParent.attr || 'qi',
      align: (a.alignment === b.alignment) ? a.alignment : 'neutral',
      effects: effects, special: special, parents: parentsSnap, createdAt: now
    };
    f.customs.push(custom);
    /* 双亲消耗（散功同构型）：等级回落 Lv1（入门即 Lv1 的口径 ⇒ 「等级/槽位/书阁移除、已知态保留」
     * 现在落成回到一级，而不是留一个无键的 0——留无键正是 `canFuse` 满级关被 `undefined < 9` 跳过的源头）、
     * 槽位移出、书阁移除；不退灵石 */
    [idA, idB].forEach(function (pid) {
      ws.artsLevels[pid] = 1;
      ws.artsSlots = (ws.artsSlots || []).filter(function (x) { return x !== pid; });
      ws.shelf = (ws.shelf || []).filter(function (x) { return x !== pid; });
      if (ws.artsKnown.indexOf(pid) < 0) ws.artsKnown.push(pid);
    });
    /* 子部 Lv1 入持有（直接入门，学习要求不再校验——融合门槛已含资格；等级起点批同 gainArt） */
    if (ws.artsKnown.indexOf(cid) < 0) ws.artsKnown.push(cid);
    ws.artsLevels[cid] = 1;
    registerCustoms(f, D, pack.worldId);
    if (log) log('arts', SQ.t('fuse.log.win', { name: nm, gen: gen, tier: SQ.t('skill.tier.' + TIER_NAME[tierI], null, pack.worldId) }, pack.worldId));
    return { ok: true, success: true, p: p, art: custom };
  }

  /* 自创部散功联动（actions.salvageArt 调用）：移出 customs + 重注册（返还走 Arts.salvage 既有口径） */
  function dropCustom(ws, D, id, worldId) {
    var f = ws.fusion;
    if (!f || !customById(ws, id)) return false;
    f.customs = f.customs.filter(function (c) { return c.id !== id; });
    registerCustoms(f, D, worldId);
    return true;
  }

  /* ── 混沌淬炼（融合器灵卷 v1.3 §4.4 · 融合扩容批）：自创部混沌签名的唯一授予通道 ──
   * 消耗 = 悟道石 ×1（材料账 consumeWudao 既有口，第三消耗口）+ 灵石 REFORGE_COST[tier]
   * （out.arts 既有分类，Ledger 零新增）；随尝试消耗（成败均扣、均记 CD），失败语义与融合正典同口径。
   * 掷 CHAOS_P：命中 = 授予/升档混沌签名（选池随自创部滋养 attr，grade = gen−1 只升不降，
   * 覆盖原 special——原 special 本就是继承所得，淬炼 = 「重炼词条里的混沌残韵」）；未命中零损失。
   * CD 1 现实天（lastReforgeAt 全局共享，与融合 CD 独立互不占用）。 */
  var TIER_NAME_L = ['huang', 'xuan', 'di', 'tian'];
  function chaosPoolOf(D, c) {
    var m = (F(D).CHAOS_BY_ATTR) || {};
    return m[c.attr] || 'hundun';
  }
  /* 淬炼费用唯一取数口（第十四批审计 #9）：引擎与视图原先各写一遍「档位名数组 + 兜底数字」，
   * 而且**两处兜底不一致**（引擎 `TIER_NAME_L[c.tier] || 'huang'` = 200，视图 `|| 800` = 玄阶价）
   * ⇒ tier 越界时屏上说的价与真扣的价差 4 倍。现两处同调本函数（现被 ensure() 的 0..3 clamp 挡着，
   * 属潜在分叉而非现行故障，但形状必须只留一份）。 */
  function reforgeCostOf(c, D) {
    var FF = F(D);
    var nm = TIER_NAME_L[(c && c.tier) || 0];   /* 不加 Math.floor：复核指出取整会把「越界档」这一形改判（1.5 ⇒ 玄阶），而旧式与旧兜底都落 huang */
    /* 越界一律回 huang（与旧引擎口径逐字相同；旧视图那里回的是 800 = 玄阶价，那才是要修的不一致） */
    if (!nm) nm = TIER_NAME_L[0];
    var v = (FF.REFORGE_COST || {})[nm];
    return v != null ? v : 0;
  }

  function reforgeCustom(ws, pack, D, cid, now, log) {
    var FF = F(D);
    var f = ensure(ws, D);
    var c = customById(ws, cid);
    if (!c) return { ok: false, reason: 'unknown' };
    var cdMs = FF.REFORGE_CD_MS || 86400000;
    if (f.lastReforgeAt > 0 && now - f.lastReforgeAt < cdMs) {
      return { ok: false, reason: 'cd', until: f.lastReforgeAt + cdMs };
    }
    var cost = reforgeCostOf(c, D);
    if (ws.stones < cost) return { ok: false, reason: 'poor', cost: cost };
    if (!SQ.Alchemy || ((ws.materials || {})['mat_wudao'] || 0) < 1) return { ok: false, reason: 'wudao' };
    /* 消耗随尝试（先扣后掷，无中间态：mutate 事务内一次掷判） */
    if (!SQ.Alchemy.consumeWudao(ws, D, 1)) return { ok: false, reason: 'wudao' };
    var st0 = ws.stones;
    ws.stones -= cost;
    SQ.Ledger.note(ws, 'out', 'arts', st0 - ws.stones);
    f.lastReforgeAt = now;
    var pc = FF.CHAOS_P != null ? FF.CHAOS_P : 0.30;
    if (Math.random() >= pc) {
      if (log) log('arts', SQ.t('fuse.reforge.miss', { name: c.name }, pack.worldId));
      return { ok: true, hit: false, p: pc, cost: cost };
    }
    var pool = chaosPoolOf(D, c);
    var grade = Math.max(0, Math.min(2, (c.gen || 1) - 1));
    if (c.special && c.special.pool === pool) grade = Math.max(grade, c.special.grade || 0);   /* 同池只升不降 */
    c.special = { pool: pool, grade: grade };
    registerCustoms(f, D, pack.worldId);                     /* SQ.XARTS 运行时注册同步（mods 消费读点） */
    if (log) log('arts', SQ.t('fuse.reforge.hit', {
      name: c.name, sig: SQ.t('special.' + pool + '.name', null, pack.worldId)
    }, pack.worldId));
    return { ok: true, hit: true, p: pc, cost: cost, pool: pool, grade: grade };
  }

  /* ── 器灵：温养 / 觉醒 / 人格 / 判词 / 五技 ───────────────────── */
  function spiritOf(entry) {
    if (!entry.st || typeof entry.st !== 'object') entry.st = {};
    var sp = entry.st.spirit;
    if (!sp || typeof sp !== 'object' || !(num(sp.w, -1) >= 0)) {
      sp = { w: 0, a: 0, p: null, cd: 0, mk: 0, hun: 0, vt: {} };
      entry.st.spirit = sp;
    }
    if (sp.vt && typeof sp.vt !== 'object') sp.vt = {};
    return sp;
  }
  function needOf(D, def) {
    var need = (SP(D).NEED || {})[def.grade];
    return need != null ? need : (SP(D).NEED_DEFAULT || 600);
  }
  function equippedEntries(ws, pack) {
    var out = [];
    var T = pack.treasures;
    if (!T || !ws.treasures) return out;
    (ws.treasures.slots || []).forEach(function (id) {
      if (!id) return;
      var e = null;
      (ws.treasures.owned || []).forEach(function (x) { if (x.id === id) e = x; });
      if (e && T.byId[id]) out.push({ e: e, def: T.byId[id] });
    });
    return out;
  }
  function warm(ws, pack, D, amount, now, log) {
    /* 温养累计（只对祭出中法宝；未祭出件不累计但数值持久）+ 觉醒判定（结算点触发） */
    equippedEntries(ws, pack).forEach(function (pr) {
      var sp = spiritOf(pr.e);
      if (sp.a) return;                                      /* 觉醒后冻结（a=1 终态，保留满值展示） */
      sp.w = num(sp.w, 0) + amount;
      if (sp.w >= needOf(D, pr.def)) awaken(ws, pack, D, pr.e, pr.def, sp, now, log);
    });
  }
  function awaken(ws, pack, D, entry, def, sp, now, log) {
    sp.a = 1;
    sp.w = needOf(D, def);                                   /* 冻结在满值（展示口径） */
    /* 人格 roll：主器型 60% / 其余四档各 10%（未标 forma 五档均分兜底） */
    var personas = SP(D).PERSONAS || ['jian', 'shou', 'gu', 'yao', 'xian'];
    var PW = SP(D).PERSONA_W || { main: 60, other: 10 };
    var FORMA2P = { jian: 'jian', shou: 'shou', gu: 'gu', yao: 'yao', xian: 'xian' };
    var mainP = def.forma ? FORMA2P[def.forma] : null;
    var weights = personas.map(function (pp) {
      if (!mainP) return 20;
      return pp === mainP ? (PW.main || 60) : (PW.other || 10);
    });
    var total = 0;
    weights.forEach(function (w) { total += w; });
    var r = Math.random() * total, chosen = personas[personas.length - 1];
    for (var i = 0; i < personas.length; i++) { r -= weights[i]; if (r < 0) { chosen = personas[i]; break; } }
    sp.p = chosen;                                           /* 一次掷定永久入档，不重掷不可洗 */
    sp.awakenAt = now;
    if (log) {
      log('sys', SQ.t('spirit.awaken.' + chosen + '.' + (1 + Math.floor(Math.random() * 2)), {
        name: SQ.t('treasure.' + def.id + '.name', null, pack.worldId)
      }, pack.worldId));
    }
  }
  /* 温养三来源钩子 */
  function tick(ws, pack, D, mods, dtMs, now, ctx, offline) {
    if (!(dtMs > 0) || offline) return null;
    /* 在线 +3/现实小时（离线不累计——无「陪伴」语义，与精通离线不涨同口径） */
    warm(ws, pack, D, ((SP(D).WARM || {}).equipH || 3) * (dtMs / 3600000), now, ctx && ctx.log);
    return null;
  }
  function onTribWarm(ws, pack, D, now, log) {
    warm(ws, pack, D, (SP(D).WARM || {}).trib || 15, now, log);
  }
  function onKills(ws, pack, D, kills, now) {
    if (!(kills > 0)) return;
    warm(ws, pack, D, ((SP(D).WARM || {}).kill || 0.5) * kills, now, null);
  }

  /* 判词（V1 本地模板池 · 事件钩子产物 · 同宝同触发 10min ≤1 条 · 纯文本零机制） */
  function verdictLine(ws, pack, D, trigger, now, log) {
    var throttle = SP(D).VERDICT_THROTTLE_MS || 600000;
    var out = null;
    equippedEntries(ws, pack).forEach(function (pr) {
      if (out) return;
      var sp = spiritOf(pr.e);
      if (!sp.a || !sp.p) return;
      if (!sp.vt || typeof sp.vt !== 'object') sp.vt = {};
      if ((sp.vt[trigger] || 0) > now - throttle) return;
      sp.vt[trigger] = now;
      var txt = SQ.t('spirit.persona.' + sp.p + '.verdict.' + trigger + '.' + (1 + Math.floor(Math.random() * 3)), {
        name: SQ.t('treasure.' + pr.def.id + '.name', null, pack.worldId)
      }, pack.worldId);
      if (log) log('sys', txt);
      out = txt;
    });
    return out;
  }
  function onPickupCheck(ws, pack, D, e, now, log) {
    /* 大额拾取口径：单次灵石入账 ≥ ZONES[min(realm,9)].stones × PICKUP_K(50)，或拾得法宝 */
    var z = (D.ZONES || [])[Math.min(ws.realm || 0, (D.ZONES || []).length - 1)] || {};
    var th = (z.stones || 0) * (SP(D).PICKUP_K || 50);
    var big = (e && ((e.stones != null && Math.abs(e.stones) >= th && e.stones > 0) || e.treasure));
    if (big) verdictLine(ws, pack, D, 'pickup', now, log);
  }

  /* 器灵技（§8 五技表 · 显式动作 mutate 写口 · CD 防刷三件套） */
  function skillOf(D, persona) {
    var sk = SP(D).SKILLS || {};
    for (var k in sk) if (sk[k].persona === persona) return { id: k, def: sk[k] };
    return null;
  }
  function useSkill(ws, pack, D, treasureId, now, log) {
    var SPc = SP(D);
    var entry = null, def = null;
    equippedEntries(ws, pack).forEach(function (pr) { if (pr.e.id === treasureId) { entry = pr.e; def = pr.def; } });
    if (!entry) return { ok: false, reason: 'equip' };        /* 未祭出不可发动 */
    var sp = spiritOf(entry);
    if (!sp.a) return { ok: false, reason: 'awake' };
    var sk = skillOf(D, sp.p);
    if (!sk) return { ok: false, reason: 'skill' };
    if (now - (sp.cd || 0) < (SPc.SKILL_CD_MS || 604800000)) {
      return { ok: false, reason: 'cd', until: (sp.cd || 0) + (SPc.SKILL_CD_MS || 604800000) };
    }
    var wid = pack.worldId;
    if (sk.id === 'hun') {
      if (sp.hun) return { ok: false, reason: 'mark' };      /* 标记在位再发动拒绝（不刷新不叠加） */
      sp.hun = 1;
    } else if (sk.id === 'shi') {
      if ((sp.mk || 0) > now) return { ok: false, reason: 'mark' };
      sp.mk = now + Math.round((sk.def.mins || 30) * 60000);
    } else {
      /* buff 型：到期后方可再发动（同字段同向保留最强由 pushBuff 语义天然防叠） */
      var srcTag = 'spirit_' + sk.id;
      var active = (ws.buffs || []).some(function (b) { return b.source === srcTag && b.until > now; });
      if (active) return { ok: false, reason: 'active' };
      SQ.Events.pushBuff(ws, sk.def.field, sk.def.mult, now + Math.round(sk.def.hours * 3600000), srcTag);
      if (sk.def.karma) ws.karmaEventScore = (ws.karmaEventScore || 0) + sk.def.karma;   /* 凶性：发动瞬间一次性 */
    }
    sp.cd = now;
    if (log) log('sys', SQ.t('spirit.log.skill', {
      skill: SQ.t('spirit.skill.' + sk.id + '.name', null, wid),
      name: SQ.t('treasure.' + def.id + '.name', null, wid)
    }, wid));
    verdictLine(ws, pack, D, 'skill', now, log);
    return { ok: true, skill: sk.id };
  }
  /* 护魂加项（XTrib.info talent 同读点）：多件同持只取一份 +0.01（加项不叠加） */
  function soulGuardBonus(ws, pack, D) {
    var armed = false;
    equippedEntries(ws, pack).forEach(function (pr) {
      var sp = pr.e.st && pr.e.st.spirit;
      if (sp && sp.a && sp.hun) armed = true;
    });
    if (!armed) return 0;
    var hun = ((SP(D).SKILLS || {}).hun) || {};
    return hun.trib != null ? hun.trib : 0.01;
  }
  /* 渡劫结算窗口（realm.js 钩子）：护魂标记判后清除（吃一堑/officeGuard 同款纪律） */
  function onTribSettled(ws, pack) {
    ((ws.treasures || {}).owned || []).forEach(function (e) {
      if (e.st && e.st.spirit && e.st.spirit.hun) e.st.spirit.hun = 0;
    });
  }
  /* 吞噬限时加项（combat.js stoneEach 同消费点加算） */
  function devourBonus(ws, pack, now) {
    var out = 0;
    equippedEntries(ws, pack).forEach(function (pr) {
      var sp = pr.e.st && pr.e.st.spirit;
      if (sp && sp.a && (sp.mk || 0) > now) out = Math.max(out, 0.10);
    });
    return out;
  }

  /* ── 真灵承继（器灵卷 §九 数据契约）：meta 侧快照 + 下世还原 + 首次祭出彩蛋 ── */
  /* 快照 = 觉醒态 + 人格 + 温养满值；CD / 限时标记 / 护魂标记 / 判词节流表一律归零重记（跨世不携带冷却语义） */
  function heirSnapshot(sp) {
    if (!sp || !sp.a) return null;
    return { a: 1, p: sp.p || null, w: Math.max(0, num(sp.w, 0)), heir: 1, ru: 0 };
  }
  /* 下世还原（须在 Treasures.gain 之后调用：该件已在 fresh.ws.treasures.owned，st 为空对象） */
  function heirRestore(ws, pack, D, id, snap) {
    if (!snap || !snap.a) return false;
    var entry = null;
    (((ws.treasures || {}).owned) || []).forEach(function (e) { if (e.id === id) entry = e; });
    if (!entry) return false;
    if (!entry.st || typeof entry.st !== 'object') entry.st = {};
    var sp = spiritOf(entry);                       /* 走既有 spiritOf 建形，结构单一来源 */
    sp.a = 1;
    sp.p = ((pack && pack.data && SP(pack.data).PERSONAS) || ['jian', 'shou', 'gu', 'yao', 'xian']).indexOf(snap.p) >= 0 ? snap.p : null;
    if (!sp.p) { sp.a = 0; sp.w = 0; return false; }  /* 人格非法 → 退回未觉醒重攒（normalizeSpirits 同款降级） */
    sp.w = num(snap.w, 0);
    sp.cd = 0; sp.mk = 0; sp.hun = 0; sp.vt = {};
    sp.heir = 1; sp.ru = 0;
    return true;
  }
  /* 跨世彩蛋（§九「又见面了，主人。」）：承继件**下世首次祭出**时一次性判词，零机制效果、不重播 */
  function onEquipHeir(ws, pack, D, id, now, log) {
    var entry = null;
    (((ws.treasures || {}).owned) || []).forEach(function (e) { if (e.id === id) entry = e; });
    var sp = entry && entry.st && entry.st.spirit;
    if (!sp || !sp.a || !sp.heir || sp.ru) return null;
    sp.ru = 1;                                       /* 一次性（此后祭出/收起不再播） */
    var wid = pack.worldId;
    var txt = SQ.t('spirit.reunion.' + sp.p, null, wid);
    if (txt === 'spirit.reunion.' + sp.p) txt = SQ.t('spirit.reunion.1', null, wid);   /* 变体缺字 → 通用句兜底 */
    if (log) log('sys', txt);
    return txt;
  }

  /* 器灵 normalize（st.spirit 结构逐项清理 · p 非法重置未觉醒重攒 · index.normalize 调用） */
  function normalizeSpirits(ws, D) {
    var personas = SP(D).PERSONAS || ['jian', 'shou', 'gu', 'yao', 'xian'];
    (((ws.treasures || {}).owned) || []).forEach(function (e) {
      if (!e.st || typeof e.st !== 'object') return;
      var sp = e.st.spirit;
      if (sp == null) return;
      if (typeof sp !== 'object') { delete e.st.spirit; return; }
      sp.w = Math.max(0, num(sp.w, 0));
      sp.a = sp.a === 1 || sp.a === true ? 1 : 0;
      if (sp.a && personas.indexOf(sp.p) < 0) { sp.a = 0; sp.p = null; sp.w = 0; }   /* 人格非法 → 重攒 */
      sp.cd = Math.max(0, num(sp.cd, 0));
      sp.mk = Math.max(0, num(sp.mk, 0));
      sp.hun = sp.hun ? 1 : 0;
      sp.heir = sp.heir ? 1 : 0;                     /* 承继件标记（下世首次祭出彩蛋用） */
      sp.ru = sp.ru ? 1 : 0;                          /* 彩蛋已播（一次性） */
      if (!sp.vt || typeof sp.vt !== 'object') sp.vt = {};
      for (var tk in sp.vt) sp.vt[tk] = Math.max(0, num(sp.vt[tk], 0));
    });
  }

  SQ.Fusion = {
    normalize: normalize,
    normalizeSpirits: normalizeSpirits,
    registerCustoms: registerCustoms,
    ensure: ensure,
    customById: customById,
    reforgeCostOf: reforgeCostOf,
    artDefOf: artDefOf,
    toArt: toArt,
    meditateAdd: meditateAdd,
    fuseP: fuseP,
    canFuse: canFuse,
    fuse: fuse,
    dropCustom: dropCustom,
    reforgeCustom: reforgeCustom,
    chaosPoolOf: chaosPoolOf,
    rollName: rollName,
    tick: tick,
    warm: warm,
    onTribWarm: onTribWarm,
    onKills: onKills,
    verdictLine: verdictLine,
    onPickupCheck: onPickupCheck,
    useSkill: useSkill,
    skillOf: skillOf,
    soulGuardBonus: soulGuardBonus,
    onTribSettled: onTribSettled,
    heirSnapshot: heirSnapshot,
    heirRestore: heirRestore,
    onEquipHeir: onEquipHeir,
    devourBonus: devourBonus,
    spiritOf: spiritOf,
    needOf: needOf,
    equippedEntries: equippedEntries
  };
})();
