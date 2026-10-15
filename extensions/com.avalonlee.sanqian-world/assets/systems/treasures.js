/* systems/treasures.js — G15 法宝（灵宝）通用引擎
 * 规则源：《法宝全录（30件）.md》v1.2（§八 八处设计稿↔实装偏差已按实装口径定案）
 *   + 数值详设 §10.6/§10.7（双书扩容 6 + 二批 10 = 46 件口径；按件 MAX_STAGE/MAX_LV 覆盖：x18 五阶 / h19 三级）。
 * 世界无关：数据表由世界包提供（pack.treasures = 世界分卷 SQ.XTREASURES）；世界未声明法宝时
 * 所有入口安全空转（返回空加成 / false），既有行为零变化。
 * 与四槽法器（ws.gear）完全独立：法宝无 atk/resist，不参与自动择优/炼化/库藏阁，
 * 只带 1 条签名效果；效果按 scaled 挂点并入 mods（同乘区加算），脚本型走 special。
 *
 * 存档字段 worlds.<id>.treasures：
 *   { owned: [{id, lv?, stage?, st:{}}], slots: [id|null ×3], fate: {trib,check,drop,event}, bondCount }
 *   - 后天法宝 lv 1~5（祭炼）；先天法宝 stage 1~3（认主）；st = 脚本运行态（按件）——
 *     顶层键是**登记表管控**的透传面，见文末 `SQ.Treasures.ST_KEYS` 的口径注。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var FATE_BUCKETS = ['trib', 'check', 'drop', 'event'];

  /* 挂点值格式化（UI 展示口径）：pct 百分比 / pp 百分点 / int 整数 / h 时辰 / x 倍率 */
  var FX_FMT = {
    'mult:qiRate': 'pct', 'mult:qiCap': 'pct', 'mult:combatSpeed': 'pct', 'mult:stonesRate': 'pct',
    'mult:eventRate': 'pct', 'mult:eventLuck': 'pct', 'mult:shopCost': 'pct',
    'mult:offlineEff': 'pct', 'mult:artsSpeed': 'pct',
    'hook:on_negative_event': 'pct', 'hook:on_bottleneck_power': 'pct', 'hook:on_refine': 'pct',
    'hook:on_check': 'pp', 'hook:on_trib_next': 'pct', 'hook:on_crit_kill': 'pct',
    'hook:on_lockling': 'pct', 'hook:on_kill_stones': 'pct',
    'hook:on_stash_cap': 'int', 'hook:on_offline_cap_h': 'h', 'hook:on_choice_cd': 'h',
    'hook:on_kill_karma': 'int', 'hook:on_event_stones': 'x',
    /* 双书扩容/二批十六件（§10.6/§10.7）新增挂点 */
    'mult:combatPower': 'pct', 'mult:dropRate': 'pct', 'mult:tribBonus': 'pct',
    'mult:tribFailLossMod': 'pct', 'hook:on_debuff_apply': 'pct'
  };

  function T(pack) { return pack && pack.treasures; }
  function def(pack, id) { var t = T(pack); return (t && t.byId && t.byId[id]) || null; }
  function list(pack) { var t = T(pack); return (t && t.LIST) || []; }
  function karmaOf(ws, pack) {
    return (pack.worldSystems && pack.worldSystems.karmaOf) ? pack.worldSystems.karmaOf(ws) : 0;
  }

  function blank() {
    return { owned: [], slots: [null, null, null], fate: { trib: 0, check: 0, drop: 0, event: 0 }, bondCount: 0, bondHours: 0 };
  }

  var num = SQ.util.num;   /* C1：统一至 assets/util.js */
  function int(v, d) { return Math.max(0, Math.floor(num(v, d))); }

  function normalize(raw, pack) {
    var d = blank();
    if (!raw || typeof raw !== 'object') return d;
    var byId = (T(pack) && T(pack).byId) || {};
    var out = { owned: [], slots: [null, null, null], fate: {}, bondCount: int(raw.bondCount, 0),
      bondHours: Math.max(0, num(raw.bondHours, 0)) };
    var seen = {};
    (Array.isArray(raw.owned) ? raw.owned : []).forEach(function (e) {
      if (!e || !byId[e.id] || seen[e.id]) return;
      var dd = byId[e.id];
      seen[e.id] = 1;
      var rec = { id: e.id, st: (e.st && typeof e.st === 'object') ? e.st : {} };
      if (dd.kind === 'xian') rec.stage = Math.min(dd.MAX_STAGE || 3, Math.max(1, int(e.stage, 1)));
      else rec.lv = Math.min(dd.MAX_LV || 5, Math.max(1, int(e.lv, 1)));
      out.owned.push(rec);
    });
    var ownedIds = {};
    out.owned.forEach(function (e) { ownedIds[e.id] = 1; });
    var slots = Array.isArray(raw.slots) ? raw.slots : [];
    var used = {};
    for (var i = 0; i < 3; i++) {
      var id = slots[i];
      if (typeof id === 'string' && ownedIds[id] && !used[id]) { out.slots[i] = id; used[id] = 1; }
    }
    var fr = (raw.fate && typeof raw.fate === 'object') ? raw.fate : {};
    /* 上界取表（审计 #15）：原先这里硬夹 0.2，而 `XTREASURES.FATE_CAP = 0.20` 是同一件事的第二份——
     * 抬表就变成「累积得进、读档剪掉」的静默削档。0.2 只作**无法宝表的兜底**（古武型世界没有这一族），
     * 表在时一律以表为准。 */
    var capF = (T(pack) || {}).FATE_CAP;
    FATE_BUCKETS.forEach(function (b) {
      out.fate[b] = Math.max(0, Math.min(capF != null ? capF : 0.2, num(fr[b], 0)));
    });
    return out;
  }

  function ensure(ws) { if (!ws.treasures) ws.treasures = blank(); return ws.treasures; }

  function entryOf(ws, id) {
    var arr = (ws.treasures && ws.treasures.owned) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }
  function isEquipped(ws, id) { return ((ws.treasures && ws.treasures.slots) || []).indexOf(id) >= 0; }
  function equipped(ws, pack) {
    var out = [];
    ((ws.treasures && ws.treasures.slots) || []).forEach(function (id) {
      var e = id ? entryOf(ws, id) : null;
      if (e) out.push(e);
    });
    return out;
  }

  function maxOf(pack, d) {
    var t = T(pack);
    /* 按件覆盖优先（§10.6/§10.7：h19 紫金钟 3 级生效上限 / x18 镇魔链 5 阶全效），世界全局兜底 */
    if (d) return d.kind === 'xian' ? (d.MAX_STAGE || (t && t.MAX_STAGE) || 3) : (d.MAX_LV || (t && t.MAX_LV) || 5);
    return t && t.MAX_LV ? t.MAX_LV : 5;
  }
  function levelOf(e) { return e ? (e.lv || e.stage || 1) : 0; }

  /* scaled 插值：[v1, vmax] 按等级/阶线性；单值对（如先天）恒为 vmax */
  function scaled(pack, d, e, key) {
    var v = d.scaled && d.scaled[key];
    if (!v) return 0;
    var mx = maxOf(pack, d), lv = levelOf(e);
    if (mx <= 1) return v[1];
    var t = Math.max(0, Math.min(1, (lv - 1) / (mx - 1)));
    return v[0] + (v[1] - v[0]) * t;
  }

  function meetsReqs(ws, pack, D, d) {
    var r = d.reqs || {};
    if (r.realm != null && ws.realm < r.realm) return false;
    if (r.attrs) {
      for (var k in r.attrs) if (((ws.attrs || {})[k] || 0) < r.attrs[k]) return false;
    }
    var karma = karmaOf(ws, pack);
    if (r.karmaMax != null && karma > r.karmaMax) return false;
    if (r.karmaMin != null && karma < r.karmaMin) return false;
    return true;
  }

  /* 缺项文案（UI 红字）：返回词表化字符串数组 */
  function lacksTexts(ws, pack, D, d) {
    var wid = pack.worldId, r = d.reqs || {}, out = [];
    if (r.realm != null && ws.realm < r.realm) {
      out.push(SQ.t('treasure.req', { realm: SQ.t('realm.' + r.realm, null, wid) }, wid));
    }
    if (r.attrs) {
      for (var k in r.attrs) {
        if (((ws.attrs || {})[k] || 0) < r.attrs[k]) {
          out.push(SQ.t('treasure.req.attr', { attr: SQ.t('attr.' + k, null, wid), n: r.attrs[k] }, wid));
        }
      }
    }
    var karma = karmaOf(ws, pack);
    if (r.karmaMax != null && karma > r.karmaMax) out.push(SQ.t('treasure.req.karmaMax', { n: r.karmaMax }, wid));
    if (r.karmaMin != null && karma < r.karmaMin) out.push(SQ.t('treasure.req.karmaMin', { n: r.karmaMin }, wid));
    return out;
  }

  function fmtFx(key, v) {
    var f = FX_FMT[key] || 'pct';
    var n = Math.round(v * 1000) / 1000;
    if (f === 'pct') return (n >= 0 ? '+' : '') + Math.round(n * 100) + '%';
    if (f === 'pp') return (n >= 0 ? '+' : '') + Math.round(n * 100) + 'pp';
    if (f === 'int') return (n >= 0 ? '+' : '') + Math.round(n);
    if (f === 'h') return Math.round(n) + 'h';
    if (f === 'x') return 'x' + (1 + n);
    return String(n);
  }

  /* 签名效果清单（UI）：[{key, label, value, raw}] */
  function fxList(ws, pack, d, e) {
    var wid = pack.worldId, out = [];
    var sc = d.scaled || {};
    for (var k in sc) {
      var v = scaled(pack, d, e, k);
      var fk = k.split(':')[1];
      out.push({ key: k, label: SQ.t('treasure.fx.' + fk, null, wid), value: fmtFx(k, v), raw: v });
    }
    return out;
  }
  function fxText(ws, pack, d, e) {
    return fxList(ws, pack, d, e).map(function (x) { return x.label + ' ' + x.value; }).join(' · ');
  }

  function slotUnlocked(ws, pack, i) {
    var t = T(pack);
    var need = (t && t.SLOT_UNLOCK && t.SLOT_UNLOCK[i]) || 0;
    return ws.realm >= need;
  }

  /* ── 获得（先天唯一 / 后天同名合并取高）──────────────── */
  function gain(ws, pack, D, id, log) {
    var t = T(pack), d = t && t.byId[id];
    if (!d) return { ok: false, reason: 'unknown' };
    var tr = ensure(ws);
    if (entryOf(ws, id)) return { ok: false, reason: 'dup', def: d };
    var rec = { id: id, st: {} };
    if (d.kind === 'xian') rec.stage = 1; else rec.lv = 1;
    tr.owned.push(rec);
    if (log) {
      log('sys', SQ.t('treasure.gained', {
        name: SQ.t('treasure.' + id + '.name', null, pack.worldId),
        kind: SQ.t('treasure.kind.' + d.kind, null, pack.worldId),
        grade: SQ.t('treasure.grade.' + d.grade, null, pack.worldId)
      }, pack.worldId));
    }
    return { ok: true, def: d, entry: rec };
  }

  function equip(ws, pack, D, id, log) {
    var d = def(pack, id);
    if (!d) return { ok: false, reason: 'unknown' };
    var e = entryOf(ws, id);
    if (!e) return { ok: false, reason: 'notown' };
    if (isEquipped(ws, id)) return { ok: false, reason: 'already' };
    if (!meetsReqs(ws, pack, D, d)) return { ok: false, reason: 'req' };
    var tr = ensure(ws);
    var slot = -1;
    for (var i = 0; i < 3; i++) if (slotUnlocked(ws, pack, i) && !tr.slots[i]) { slot = i; break; }
    if (slot < 0) return { ok: false, reason: 'full' };
    tr.slots[slot] = id;
    if (log) log('sys', SQ.t('treasure.equipped', { name: SQ.t('treasure.' + id + '.name', null, pack.worldId) }, pack.worldId));
    return { ok: true, slot: slot };
  }

  function unequip(ws, pack, D, id, log) {
    var tr = ensure(ws);
    var i = tr.slots.indexOf(id);
    if (i < 0) return { ok: false, reason: 'notequipped' };
    tr.slots[i] = null;
    if (log) log('sys', SQ.t('treasure.unequipped', { name: SQ.t('treasure.' + id + '.name', null, pack.worldId) }, pack.worldId));
    return { ok: true };
  }

  /* ── 祭炼（后天）──────────────────────────────── */
  function refineCost(ws, pack, D, id) {
    var t = T(pack), d0 = def(pack, id), e = entryOf(ws, id);
    if (!t || !e) return null;
    var lv = levelOf(e);
    if (lv >= maxOf(pack, d0)) return null;
    return Math.ceil(t.REFINE_BASE * Math.pow(t.REFINE_GROWTH, lv - 1) * (1 + ws.realm * t.REFINE_REALM));
  }

  function refine(ws, pack, D, id, log) {
    var t = T(pack), d = def(pack, id), e = entryOf(ws, id);
    if (!t || !d || !e || d.kind !== 'hou') return { ok: false, reason: 'kind' };
    var lv = levelOf(e);
    if (lv >= maxOf(pack, d)) return { ok: false, reason: 'max' };
    var cost = refineCost(ws, pack, D, id);
    if (ws.stones < cost) return { ok: false, reason: 'stones', cost: cost };
    var st0 = ws.stones;
    ws.stones -= cost;
    SQ.Ledger.note(ws, 'out', 'treasure', st0 - ws.stones);
    var name = SQ.t('treasure.' + id + '.name', null, pack.worldId);
    if (Math.random() < t.REFINE_FAIL) {
      e.lv = Math.max(1, lv - 1);
      if (log) log('sys', SQ.t('treasure.refine.fail', { name: name, lv: e.lv }, pack.worldId));
      return { ok: true, fail: true, lv: e.lv, cost: cost };
    }
    e.lv = lv + 1;
    if (log) log('sys', SQ.t('treasure.refine.done', { name: name, lv: e.lv }, pack.worldId));
    return { ok: true, fail: false, lv: e.lv, cost: cost };
  }

  /* ── 认主（先天）：每 BOND_COST 次计数 +1 阶；计数有两条来源（数值详设 §十 + 第卌三批计时通道）
   * ① 渡劫成功 +1/次；② 每 BOND_HOURS 小时**已结算时长** +1/份。两条共用同一个 bondCount 与同一条
   * 推进口（bondAdvance），不另立升级路——计时只是「卡境渡不了劫时不再整段停摆」的下限，
   * 中期两次渡劫 ≈1~2h 仍远快于 8h/份。 */
  function bondAdvance(ws, pack, D, log) {
    var t = T(pack);
    if (!t) return;
    var tr = ensure(ws);
    if (tr.bondCount % t.BOND_COST !== 0) return;
    tr.owned.forEach(function (e) {
      var d = def(pack, e.id);
      if (!d || d.kind !== 'xian') return;
      var cur = e.stage || 1;
      if (cur >= maxOf(pack, d)) return;
      e.stage = cur + 1;
      if (log) {
        log('sys', SQ.t('treasure.bond.done', {
          name: SQ.t('treasure.' + e.id + '.name', null, pack.worldId), n: e.stage
        }, pack.worldId));
      }
    });
  }

  function bondTick(ws, pack, D, log) {
    var t = T(pack);
    if (!t) return;
    var tr = ensure(ws);
    tr.bondCount = (tr.bondCount || 0) + 1;
    bondAdvance(ws, pack, D, log);
  }

  /* 计时认主（体验批）：由世界包在 claim 结算后喂 idleRes.hours（与寿元同一条时钟、同一处口径）
   * shortcut: 计时与计数都是 ws.treasures 顶层全局一枚（看不出按件进度、多件共享同一份），
   * 要改成按件时先裁定按件 vs 全局，再把两键下沉 owned[].st 并同批改 ST_KEYS（A7 + 冒烟 #281 会抓）。 */
  function bondTime(ws, pack, D, hours, log) {
    var t = T(pack);
    if (!t || !(t.BOND_HOURS > 0) || !(hours > 0) || !ws.treasures) return;
    var tr = ensure(ws);
    /* 全数满阶（含未得先天法宝）即停表：省得 bondCount 无意义地长，也让新得之件从零起算 */
    var allMaxed = tr.owned.every(function (e) {
      var d = def(pack, e.id);
      return !d || d.kind !== 'xian' || (e.stage || 1) >= maxOf(pack, d);
    });
    if (allMaxed) return;
    tr.bondHours = (tr.bondHours || 0) + hours;
    while (tr.bondHours >= t.BOND_HOURS) {
      tr.bondHours -= t.BOND_HOURS;
      tr.bondCount = (tr.bondCount || 0) + 1;
      bondAdvance(ws, pack, D, log);
    }
  }

  /* ── 乘区收集（mods.js 消费）：同乘区加算 ──────────────── */
  function collect(ws, pack, D) {
    var out = { sum: {}, hooks: {} };
    var t = T(pack);
    if (!t || !ws || !ws.treasures) return out;
    var karma = karmaOf(ws, pack);
    equipped(ws, pack).forEach(function (e) {
      var d = def(pack, e.id);
      if (!d) return;
      var sc = d.scaled || {};
      for (var k in sc) {
        var v = scaled(pack, d, e, k);
        if (!v) continue;
        if (k.indexOf('mult:') === 0) {
          var f = k.slice(5); out.sum[f] = (out.sum[f] || 0) + v;
        } else if (k.indexOf('hook:') === 0) {
          var h = k.slice(5); out.hooks[h] = (out.hooks[h] || 0) + v;
        }
      }
      if (d.special === 'growth') {
        var g = Math.min(t.GROWTH_CAP, t.GROWTH_STEP * Math.floor((e.st.hours || 0) / 3600));
        if (g) out.sum.qiRate = (out.sum.qiRate || 0) + g;
      }
      if (d.special === 'degenerate' && karma <= t.DEGEN_THRESHOLD) {
        out.sum.combatSpeed = (out.sum.combatSpeed || 0) + 0.30;
      }
    });
    return out;
  }

  /* ── X01 气运补偿（按判定类别分桶）────────────────────── */
  function fateBonus(ws, pack, bucket) {
    var t = T(pack);
    if (!t || !ws.treasures || !isEquipped(ws, 'x01')) return 0;
    return Math.min(t.FATE_CAP, (ws.treasures.fate || {})[bucket] || 0);
  }
  function fateNote(ws, pack, bucket, ok) {
    var t = T(pack);
    if (!t || !ws.treasures || !isEquipped(ws, 'x01')) return;
    var f = ensure(ws).fate;
    if (ok) { f[bucket] = 0; return; }
    f[bucket] = Math.min(t.FATE_CAP, (f[bucket] || 0) + t.FATE_STEP);
  }

  /* ── 渡劫：失败/成功回调 ──────────────────────────────── */
  /* 返回 { retain?:number|null, skipAttempt:boolean, nextAdd:number }
   * retain = 失败修为保留系数（覆盖 tribLoss）；baseRetain = 世界包基准保留系数。 */
  function tribOnFail(ws, pack, D, mods, baseRetain, log) {
    var t = T(pack);
    var out = { retain: null, skipAttempt: false, nextAdd: 0 };
    if (!t || !ws.treasures) return out;
    fateNote(ws, pack, 'trib', false);
    if (isEquipped(ws, 'x03')) {
      var e3 = entryOf(ws, 'x03');
      out.retain = 1 - t.TOWER_LOSS;
      e3.st.tower = Math.min(Math.round(t.TOWER_CAP / t.TOWER_NEXT), (e3.st.tower || 0) + 1);
      out.nextAdd += t.TOWER_NEXT * e3.st.tower;
    }
    if (isEquipped(ws, 'x09')) {
      var e9 = entryOf(ws, 'x09');
      if (e9.st.usedRealm !== ws.realm) {
        e9.st.usedRealm = ws.realm;
        out.skipAttempt = true;
        var base = out.retain != null ? out.retain : baseRetain;
        out.retain = 1 - (1 - base) / 2;   /* 本次损失减半 */
        if (log) log('sys', SQ.t('treasure.budou.used', null, pack.worldId));
      }
    }
    return out;
  }

  function tribOnSuccess(ws, pack, D, log) {
    var t = T(pack);
    if (!t || !ws.treasures) return;
    var tr = ensure(ws);
    if (isEquipped(ws, 'x01')) tr.fate.trib = 0;
    if (isEquipped(ws, 'x03')) entryOf(ws, 'x03').st.tower = 0;
    if (isEquipped(ws, 'x09')) entryOf(ws, 'x09').st.usedRealm = -1;
    bondTick(ws, pack, D, log);
  }

  /* ── 挂机在线 tick（X02 生长 / X12 堕落）───────────────── */
  function tickIdle(ws, pack, D, dtSec, now, log) {
    var t = T(pack);
    if (!t || !ws.treasures || !(dtSec > 0)) return;
    equipped(ws, pack).forEach(function (e) {
      var d = def(pack, e.id);
      if (!d) return;
      if (d.special === 'growth' || d.special === 'degenerate') {
        e.st.hours = (e.st.hours || 0) + dtSec;
      }
      if (d.special === 'degenerate') {
        var h = Math.floor(e.st.hours / 3600);
        var paid = e.st.karmaH || 0;
        if (h > paid) {
          ws.karmaEventScore = (ws.karmaEventScore || 0) + (h - paid) * t.DEGEN_KARMA;
          e.st.karmaH = h;
        }
      }
    });
  }

  /* ── 战斗：击杀侧档案 + 单杀回调 ───────────────────────── */
  function killProfile(ws, pack, D) {
    var t = T(pack);
    var p = { stonesBonus: 0, lockP: 0, critP: 0, karmaPer: 0, slaughter: 0, active: false };
    if (!t || !ws.treasures) return p;
    equipped(ws, pack).forEach(function (e) {
      var d = def(pack, e.id);
      if (!d) return;
      var sc = d.scaled || {};
      if (sc['hook:on_kill_stones']) { p.stonesBonus += scaled(pack, d, e, 'hook:on_kill_stones'); p.active = true; }
      if (sc['hook:on_lockling']) { p.lockP += scaled(pack, d, e, 'hook:on_lockling'); p.active = true; }
      if (sc['hook:on_crit_kill']) { p.critP += scaled(pack, d, e, 'hook:on_crit_kill'); p.active = true; }
      if (sc['hook:on_kill_karma']) { p.karmaPer += scaled(pack, d, e, 'hook:on_kill_karma'); p.active = true; }
      if (d.special === 'slaughter') { p.slaughter = t.SLAUGHTER_STEP; p.active = true; }
    });
    return p;
  }

  /* 单杀回调：返回 {stonesMult, progBonus}；内部处理业力/开天一击/杀伐掉落 */
  function onKill(ws, pack, D, mods, prof, now, log) {
    var t = T(pack);
    var out = { stonesMult: 1, progBonus: 0 };
    if (!t || !prof || !prof.active) return out;
    out.stonesMult = 1 + prof.stonesBonus;
    if (prof.lockP > 0 && Math.random() < prof.lockP) {
      out.stonesMult *= 5;
      if (log) log('combat', SQ.t('treasure.lockling', null, pack.worldId));
    }
    if (prof.karmaPer) ws.karmaEventScore = (ws.karmaEventScore || 0) + prof.karmaPer;
    if (prof.critP > 0 && Math.random() < prof.critP) {
      out.progBonus = 20;
      if (SQ.Events && SQ.Events.pushBuff) SQ.Events.pushBuff(ws, 'combatPower', -0.10, now + 30 * 60 * 1000);
      if (log) log('combat', SQ.t('treasure.crit', null, pack.worldId));
    }
    if (prof.slaughter) {
      var e = entryOf(ws, 'x07');
      if (e) {
        e.st.kills = (e.st.kills || 0) + 1;
        if (e.st.kills >= prof.slaughter) {
          e.st.kills -= prof.slaughter;
          var item = SQ.Gear.roll(ws, pack, D, ws.zone, mods, {
            align: 'evil', source: { type: 'treasure', ref: 'x07' }
          });
          SQ.Gear.autoEquip(ws, pack, D, mods, item, log);
          if (log) log('combat', SQ.t('treasure.slaughter', null, pack.worldId));
        }
      }
    }
    return out;
  }

  /* ── H10 捆仙索：选择类奇遇判定直通（冷却 24h→12h）──────── */
  function choiceAutoPass(ws, pack, D, now) {
    var t = T(pack);
    if (!t || !ws.treasures || !isEquipped(ws, 'h10')) return false;
    var e = entryOf(ws, 'h10');
    if (now < (e.st.cdUntil || 0)) return false;
    var hours = scaled(pack, def(pack, 'h10'), e, 'hook:on_choice_cd') || 24;
    e.st.cdUntil = now + hours * 3600 * 1000;
    return true;
  }
  function choiceCdLeft(ws, pack, now) {
    if (!isEquipped(ws, 'h10')) return 0;
    var e = entryOf(ws, 'h10');
    return Math.max(0, (e.st.cdUntil || 0) - now);
  }

  /* ── X11 造化：修为→灵石 1:1 / 炼聚灵丹 ───────────────── */
  function convertQi(ws, pack, D, amount) {
    var t = T(pack);
    if (!t || !isEquipped(ws, 'x11')) return { ok: false, reason: 'notown' };
    var n = Math.floor(Math.max(0, num(amount, 0)));
    if (n <= 0 || ws.qi < n) return { ok: false, reason: 'qi' };
    ws.qi -= n;
    var st0 = ws.stones;
    ws.stones += n;
    SQ.Ledger.note(ws, 'in', 'offline', ws.stones - st0);
    return { ok: true, n: n };
  }

  function pillActive(ws, now) {
    return (ws.buffs || []).some(function (b) { return b.field === 'qiRate' && b.until > now; });
  }

  function makePill(ws, pack, D, now) {
    var t = T(pack);
    if (!t || !isEquipped(ws, 'x11')) return { ok: false, reason: 'notown' };
    if (pillActive(ws, now)) return { ok: false, reason: 'busy' };
    if (ws.stones < t.PILL_COST) return { ok: false, reason: 'stones' };
    var st0 = ws.stones;
    ws.stones -= t.PILL_COST;
    SQ.Ledger.note(ws, 'out', 'treasure', st0 - ws.stones);
    if (SQ.Events && SQ.Events.pushBuff) SQ.Events.pushBuff(ws, 'qiRate', t.PILL_MULT, now + t.PILL_MS);
    return { ok: true };
  }

  /* 图鉴：全部法宝的收录态（UI 消费） */
  function codex(ws, pack) {
    return list(pack).map(function (d) {
      var e = entryOf(ws, d.id);
      return { def: d, entry: e, owned: !!e, equipped: isEquipped(ws, d.id), level: levelOf(e) };
    });
  }

  SQ.Treasures = {
    FATE_BUCKETS: FATE_BUCKETS,
    blank: blank, normalize: normalize,
    def: def, list: list, codex: codex,
    entryOf: entryOf, isEquipped: isEquipped, equipped: equipped,
    maxOf: maxOf, levelOf: levelOf, scaled: scaled,
    meetsReqs: meetsReqs, lacksTexts: lacksTexts,
    fxList: fxList, fxText: fxText,
    slotUnlocked: slotUnlocked,
    gain: gain, equip: equip, unequip: unequip,
    refineCost: refineCost, refine: refine, bondTick: bondTick, bondTime: bondTime,
    collect: collect,
    fateBonus: fateBonus, fateNote: fateNote,
    tribOnFail: tribOnFail, tribOnSuccess: tribOnSuccess,
    tickIdle: tickIdle,
    killProfile: killProfile, onKill: onKill,
    choiceAutoPass: choiceAutoPass, choiceCdLeft: choiceCdLeft,
    convertQi: convertQi, makePill: makePill, pillActive: pillActive,
    /* st 顶层键登记表（2026-10-09 展示流与落档口径批 · 存档治理批 ⑨ 遗留项收口）：
     * `owned[].st` 是**无 schema 的脚本运行态透传面** —— normalize 整块带过（treasures.js:57），
     * 任何新字段写进去即永久随档。取舍裁定 = **登记制而非运行时收敛**：
     *   收敛（白名单砍键）会砍掉未来合法字段并破「读档往返无损」那一族判据，代价大于收益；
     *   改为「写点必须先登记」，由两道自动闸守：`audit.cjs` **A7**（静态扫 `\.st\.` 写点与本表
     *   双向对表，多一个少一个都红）+ 冒烟 **#281**（真跑一遍取观测键集，表外键即红，并配
     *   「塞假键必红」的反向对照）。新增条目时同批改本表与出处注释，否则闸门拦住。
     * 二级结构不在此表内：`st.spirit` 的形状归器灵卷 §schema 与其它既有断言守（本批不重复建表）。 */
    ST_KEYS: ['hours', 'karmaH', 'kills', 'cdUntil', 'tower', 'usedRealm', 'spirit']
  };
})();