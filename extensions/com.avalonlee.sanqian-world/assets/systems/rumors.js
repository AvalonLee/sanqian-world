/* systems/rumors.js — G17 江湖传闻（传闻设计卷 v1.0 · 数值详设 §十二）
 * 定位：奇遇是「江湖找上门」（被动时钟），传闻是「你听说江湖有事」（主动选择介入）。
 * 机制：在线按现实分钟节奏刷新限时传闻卡（rumorClock 每跨 REFRESH_MIN 分钟掷一批 BATCH 条，
 *   活跃上限 MAX），指向当前角色**可触发**的事件（抽取复用 natureDraw/tierW/buildPool 全过滤 +
 *   天→地→人降级回退，再滤活跃卡已指向 evId）；TTL 按品阶分档，到点作废；
 *   **离线只过期不刷新**（绝对时间戳判定，与「离线零奇遇」正典对齐）；
 *   触发 = 定向落地五件套（照抄 fire 语义：冷却/lastId/seen/pendingChoice via:'rumor'），
 *   **不清 eventClock、不消耗 eventShield**（独立通道）；抉择/判定/结算全链路与随机奇遇零差异。
 * 另承载 G16 势力冲突情报（kind:'war'，不占 MAX 名额，随 factionWar 生灭）。
 * 纪律：引擎零裸中文——模板与地点池全走词表（common `rumor.tpl.{tier}.n` / `rumor.place.n`，
 *   世界分卷可覆写）；写入只在 claim / actions.mutate 事务通道内。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var RID_SEED = 1;
  function nextRid(now) { return 'r' + (now || 0).toString(36) + (RID_SEED++).toString(36); }
  /* 天骄/宗门展示卡的「同一句话」指纹（pushProdigy 去重专用，不落盘）：tpl + 参数字典序，
   * 值一律 `String(…).slice(0,40)` —— 与 normalizeList 的清洗口径同形，否则「存前一次、读档后一次」比不中。 */
  function prodSigOf(r) {
    if (!r || typeof r !== 'object') return '';
    var v = (r.v && typeof r.v === 'object') ? r.v : {};
    return String(r.tpl || '') + '|' + Object.keys(v).sort().map(function (k) {
      return k + '=' + String(v[k]).slice(0, 40);
    }).join(',');
  }

  function cfgOf(D) { return (D && D.RUMORS) || {}; }

  function activeEventIds(ws) {
    var out = {};
    (ws.rumors || []).forEach(function (r) { if (r.evId) out[r.evId] = 1; });
    return out;
  }

  /* 传闻文案掷定：模板 key（品阶 × TPL_PER_TIER）+ 地点池（PLACES），生成时入档保证卡面稳定 */
  function rollText(D, tier) {
    var cfg = cfgOf(D);
    var nTpl = cfg.TPL_PER_TIER || 10;
    var nPlace = cfg.PLACES || 8;
    return {
      tpl: 'rumor.tpl.' + tier + '.' + (1 + Math.floor(Math.random() * nTpl)),
      place: 'rumor.place.' + (1 + Math.floor(Math.random() * nPlace))
    };
  }

  /* 抽一条可触发事件（复用事件引擎积木；exclude = 活跃卡已指向 evId 集合）：
   * ① natureDraw（阵营 natureW + eventLuck 同源）→ ② 阵营 tierW 掷品阶 → ③ buildPool 组池
   * （condOk / once-seen / 冷却 / lastId 全过滤）+ exclude 过滤 → ④ weight 加权 →
   * 空池沿 天→地→人 降级、再翻性质（与 fire 回退序一致）；仍空 → null。 */
  function drawEvent(ws, pack, D, mods, eff, now, exclude) {
    var TIERS = ['tian', 'di', 'ren'];
    var nature = SQ.Events.natureDraw(D, eff, (mods.sum && mods.sum.eventLuck) || 0,
      (mods.hooks && mods.hooks.on_negative_avoid) || 0);
    var tier = (function () {
      var tw = eff.tierW || { tian: 10, di: 30, ren: 60 };
      var total = (tw.tian || 0) + (tw.di || 0) + (tw.ren || 0);
      var r = Math.random() * total;
      r -= (tw.tian || 0); if (r < 0) return 'tian';
      r -= (tw.di || 0); if (r < 0) return 'di';
      return 'ren';
    })();
    var natures = [nature, nature === 'good' ? 'bad' : 'good'];
    for (var ni = 0; ni < natures.length; ni++) {
      var start = TIERS.indexOf(tier);
      for (var ti = (start < 0 ? 0 : start); ti < TIERS.length; ti++) {
        var pool = SQ.Events.buildPool(pack, ws, D, TIERS[ti], natures[ni], now)
          .filter(function (ev) { return !exclude[ev.id]; });
        if (!pool.length) continue;
        var totalW = 0;
        pool.forEach(function (e) { totalW += (e.weight != null ? e.weight : 1); });
        var rr = Math.random() * totalW, hit = pool[pool.length - 1];
        for (var pi = 0; pi < pool.length; pi++) {
          rr -= (pool[pi].weight != null ? pool[pi].weight : 1);
          if (rr < 0) { hit = pool[pi]; break; }
        }
        return hit;
      }
    }
    return null;
  }

  SQ.Rumors = {
    /* 活跃事件传闻卡已指向的 evId 集合（被动奇遇排除用 · 方案 B 传闻预留；与 drawEvent 同源） */
    activeEventIds: activeEventIds,
    /* 活跃事件传闻卡（kind:'war' 不计入） */
    eventCards: function (ws) {
      return (ws.rumors || []).filter(function (r) { return !r.kind; });
    },
    warCard: function (ws) {
      var out = null;
      (ws.rumors || []).forEach(function (r) { if (r.kind === 'war') out = r; });
      return out;
    },
    /* 冲突结果卡（战功制 §7.4）：视图消费 outcome 取 faction.war.result.{win|lose|draw} 文案 */
    warResultCard: function (ws) {
      var out = null;
      (ws.rumors || []).forEach(function (r) { if (r.kind === 'warResult') out = r; });
      return out;
    },

    /* 过期清扫（claim 内每 tick 调用，在线离线都扫——离线只过期不刷新）；
     * 返回过期卡数组（离线回归聚合日志「江湖事过境迁」由调用方消费） */
    sweep: function (ws, pack, D, now) {
      if (!Array.isArray(ws.rumors) || !ws.rumors.length) return [];
      var gone = [];
      ws.rumors = ws.rumors.filter(function (r) {
        if (!(r.expireAt > now)) { gone.push(r); return false; }
        return true;
      });
      return gone;
    },

    /* 在线刷新（claim 内仅在线调用；rumorClock 每跨 REFRESH_MIN 分钟边界掷一批） */
    tick: function (ws, pack, D, mods, dtSec, now, ctx) {
      var cfg = cfgOf(D);
      var refreshMin = cfg.REFRESH_MIN || 10;
      ws.rumorClock = (ws.rumorClock || 0) + dtSec;
      var crossed = Math.floor(ws.rumorClock / (refreshMin * 60));
      if (!crossed) return null;
      ws.rumorClock = ws.rumorClock % (refreshMin * 60);
      var eff = (pack.worldSystems && pack.worldSystems.effectsOf) ? pack.worldSystems.effectsOf(ws) : null;
      if (!eff) return null;
      var max = cfg.MAX || 4;
      var batch = cfg.BATCH || [1, 2];
      var n = batch[0] + Math.floor(Math.random() * (batch[1] - batch[0] + 1));
      var ttl = cfg.TTL || { ren: 40, di: 70, tian: 110 };
      var fresh = null;
      for (var i = 0; i < n; i++) {
        if (SQ.Rumors.eventCards(ws).length >= max) break;    /* 上限硬顶：不积压不补发 */
        var ev = drawEvent(ws, pack, D, mods, eff, now, activeEventIds(ws));
        if (!ev) continue;
        var txt = rollText(D, ev.tier);
        var card = {
          rid: nextRid(now), evId: ev.id, tier: ev.tier, nature: ev.nature,
          bornAt: now, expireAt: now + Math.round((ttl[ev.tier] || 40) * 60000),
          tpl: txt.tpl, place: txt.place
        };
        if (!Array.isArray(ws.rumors)) ws.rumors = [];
        ws.rumors.push(card);
        fresh = card;
      }
      if (fresh && ctx && ctx.log) {
        ctx.log('sys', SQ.t('rumor.log.fresh', {
          place: SQ.t(fresh.place, null, pack.worldId)
        }, pack.worldId));
      }
      return fresh;
    },

    /* 势力冲突情报卡（factions.warTick 开战时调用；不占 MAX 名额，TTL = 冲突剩余时长） */
    pushWar: function (ws, pack, D, now, ctx) {
      var war = ws.factionWar;
      if (!war) return null;
      if (!Array.isArray(ws.rumors)) ws.rumors = [];
      /* 旧 war 卡先清（同时至多一条） */
      ws.rumors = ws.rumors.filter(function (r) { return r.kind !== 'war'; });
      var card = { rid: nextRid(now), kind: 'war', bornAt: now, expireAt: war.until };
      ws.rumors.push(card);
      return card;
    },

    /* 势力冲突结果卡（战功制 · 势力全录卷 §7.4 · 系统深化批 A5）：warSettle 终局后推送，
     * TTL = FACTION_WAR.RESULT_RUMOR_TTL_MIN（30 现实分钟）；纯展示 + 点击转跳势力页
     * （canTrigger 沿用 war 卡放行口径），不占事件卡配额（RUMORS.MAX 只计事件卡，war 卡先例）。 */
    pushWarResult: function (ws, pack, D, now, outcome) {
      if (!Array.isArray(ws.rumors)) ws.rumors = [];
      /* 旧结果卡先清（同时至多一条） */
      ws.rumors = ws.rumors.filter(function (r) { return r.kind !== 'warResult'; });
      var ttl = ((D.FACTION_WAR || {}).RESULT_RUMOR_TTL_MIN) || 30;
      var card = {
        rid: nextRid(now), kind: 'warResult',
        outcome: (outcome === 'win' || outcome === 'lose') ? outcome : 'draw',
        bornAt: now, expireAt: now + Math.round(ttl * 60000)
      };
      ws.rumors.push(card);
      return card;
    },

    /* 天上谣传卡（天道设计 §11.2 · 天道系统批）：借既有播报面推 1 条纯风味展示卡——
     * war 卡先例口径（不占事件卡配额 RUMORS.MAX），同时至多一条（新卡替换旧卡）；
     * text 为已过敏感词校验的裁决文本（≤120 字），零机制效果、不可触发。 */
    pushSky: function (ws, D, now, text) {
      if (!Array.isArray(ws.rumors)) ws.rumors = [];
      ws.rumors = ws.rumors.filter(function (r) { return r.kind !== 'sky'; });
      var ttl = ((D.TIANDAO || {}).SKY_RUMOR_TTL_MIN) || 60;
      var card = {
        rid: nextRid(now), kind: 'sky', text: String(text || '').slice(0, 120),
        bornAt: now, expireAt: now + Math.round(ttl * 60000)
      };
      ws.rumors.push(card);
      return card;
    },

    /* 同代天骄展示卡（天骄卷 §4.3 · war 卡先例口径）：纯展示、无查证按钮、不指向事件池；
     * 不占 RUMORS.MAX 事件名额，独立上限 RUMOR_CAP(2) 溢出挤最旧；TTL 第册一百一十五批起**自成一档** `PRODIGY.RUMOR_TTL_MIN`（现 5 现实分钟，不再跟 ren 档 40） */
    pushProdigy: function (ws, pack, D, now, tplKey, vars) {
      if (!Array.isArray(ws.rumors)) ws.rumors = [];
      var cap = ((D.PRODIGY || {}).RUMOR_CAP) || 2;
      var ttl = ((D.PRODIGY || {}).RUMOR_TTL_MIN) || 5;
      /* 挤最旧（仅 prodigy 卡计数） */
      var prod = ws.rumors.filter(function (r) { return r.kind === 'prodigy'; });
      /* 同话不重推（2026-10-18 用户报「江湖传闻里同代天骄那两条一模一样」）：`tpl` 与 `v` 全同 ⇒ 渲染逐字同文，
       * 而板上限只有 2 格 ⇒ 重复一句 = 白占一格还多挂一个红点。var-free 模板（rivalry.1/3、eternal.1）本就同文，
       * 带参模板要同人同参才判同。判据现算现比、**不新增落盘字段**（写一枚 `sig` 会被 normalizeList 剪掉，
       * reload 后静默失效）；键序与数字/字符串之差按 normalizeList 的同一口径归一（`String(v).slice(0,40)`）。 */
      var sig = prodSigOf({ tpl: tplKey, v: vars });
      for (var di = 0; di < prod.length; di++) if (prodSigOf(prod[di]) === sig) return prod[di];
      while (prod.length >= cap) {
        var oldest = prod.shift();
        ws.rumors = ws.rumors.filter(function (r) { return r !== oldest; });
      }
      var card = {
        rid: nextRid(now), kind: 'prodigy', tpl: String(tplKey || ''),
        v: vars || {}, bornAt: now, expireAt: now + Math.round(ttl * 60000)
      };
      ws.rumors.push(card);
      return card;
    },

    /* 触发前校验（UI 置灰态与 actions 共用）：{ok, reason}
     * reason: 'expired' | 'busy'（pendingChoice 挂起）| 'gone'（事件已不可触发：once 已见/冷却/condOk 失配） */
    canTrigger: function (ws, pack, D, rid, now) {
      var card = null;
      (ws.rumors || []).forEach(function (r) { if (r.rid === rid) card = r; });
      if (!card) return { ok: false, reason: 'missing', card: null };
      if (card.kind === 'war' || card.kind === 'warResult') return { ok: true, card: card, war: true };
      if (card.kind === 'sky') return { ok: false, reason: 'display', card: card };   /* 纯展示卡，不可触发 */
      if (card.kind === 'prodigy') return { ok: false, reason: 'display', card: card };
      if (!(card.expireAt > now)) return { ok: false, reason: 'expired', card: card };
      if (ws.pendingChoice) return { ok: false, reason: 'busy', card: card };
      var ev = SQ.Events.findById(pack, card.evId);
      if (!ev) return { ok: false, reason: 'gone', card: card };
      if (!SQ.Events.condOk(ev, ws, pack, D)) return { ok: false, reason: 'gone', card: card };
      if (ev.once && ws.eventHistory.seen[ev.id] != null) return { ok: false, reason: 'gone', card: card };
      var cdH = ev.cooldownHours != null ? ev.cooldownHours : ev.cd;
      var cd = ws.eventCooldowns[ev.id];
      if (cdH != null && cd != null && now < cd + cdH * 3600 * 1000) return { ok: false, reason: 'gone', card: card };
      return { ok: true, card: card, ev: ev };
    },

    /* 定向触发（actions.mutate 内调用）：落地五件套照抄 fire 语义——
     * eventCooldowns/lastId/seen/pendingChoice(via:'rumor')；**不清 eventClock**（独立通道）、
     * 不消耗 eventShield（主动查证不是被动遇袭）；传闻卡出档（consumed）。 */
    trigger: function (ws, pack, D, rid, now, ctx) {
      var chk = SQ.Rumors.canTrigger(ws, pack, D, rid, now);
      if (!chk.ok) return { ok: false, reason: chk.reason };
      if (chk.war) return { ok: true, war: true };        /* war 卡由 actions 层转跳势力页/应战 */
      var ev = chk.ev;
      ws.rumors = (ws.rumors || []).filter(function (r) { return r.rid !== rid; });
      ws.eventCooldowns[ev.id] = now;
      ws.eventHistory.lastId = ev.id;
      if (ws.eventHistory.seen[ev.id] == null) ws.eventHistory.seen[ev.id] = now;
      ws.pendingChoice = { id: ev.id, at: now, tier: ev.tier, nature: ev.nature, via: 'rumor' };
      if (ctx && ctx.log) {
        ctx.log('event', SQ.t('rumor.log.trigger', {
          name: SQ.t('event.' + ev.id + '.name', null, pack.worldId)
        }, pack.worldId));
      }
      return { ok: true, id: ev.id, tier: ev.tier, nature: ev.nature, pending: true };
    },

    /* normalize 用：结构逐项校验 + 过期丢弃 + 事件卡截断至 MAX（war 卡另计） */
    normalizeList: function (raw, pack, D, now) {
      var cfg = cfgOf(D);
      var max = cfg.MAX || 4;
      var out = [];
      var evOk = {};
      if (pack) {
        SQ.Events.allIds && SQ.Events.allIds(pack).forEach(function (id) { evOk[id] = 1; });
      }
      (Array.isArray(raw) ? raw : []).forEach(function (r) {
        if (!r || typeof r !== 'object') return;
        if (!(r.expireAt > now)) return;                   /* 过期即弃 */
        if (r.kind === 'war') {
          if (typeof r.rid === 'string' && r.bornAt > 0) out.push({ rid: r.rid, kind: 'war', bornAt: r.bornAt, expireAt: r.expireAt });
          return;
        }
        if (r.kind === 'warResult') {
          if (typeof r.rid === 'string' && r.bornAt > 0) {
            out.push({ rid: r.rid, kind: 'warResult',
              outcome: (r.outcome === 'win' || r.outcome === 'lose') ? r.outcome : 'draw',
              bornAt: r.bornAt, expireAt: r.expireAt });
          }
          return;
        }
        if (r.kind === 'sky') {
          /* 天上谣传卡（天道系统批）：text 必须非空短串，否则丢弃（脏档防御） */
          if (typeof r.rid === 'string' && typeof r.text === 'string' && r.text && r.bornAt > 0) {
            out.push({ rid: r.rid, kind: 'sky', text: r.text.slice(0, 120), bornAt: r.bornAt, expireAt: r.expireAt });
          }
          return;
        }
        if (r.kind === 'prodigy') {
          /* 同代天骄展示卡（天骄卷 §4.3）：tpl key + vars 小对象，结构非法丢弃 */
          if (typeof r.rid === 'string' && typeof r.tpl === 'string' && r.tpl && r.bornAt > 0) {
            var pv = (r.v && typeof r.v === 'object') ? r.v : {};
            var sv = {};
            for (var pk2 in pv) if (typeof pv[pk2] === 'string' || typeof pv[pk2] === 'number') sv[pk2] = String(pv[pk2]).slice(0, 40);
            out.push({ rid: r.rid, kind: 'prodigy', tpl: r.tpl.slice(0, 60), v: sv, bornAt: r.bornAt, expireAt: r.expireAt });
          }
          return;
        }
        if (typeof r.rid !== 'string' || typeof r.evId !== 'string') return;
        if (pack && !evOk[r.evId]) return;                 /* 未知 evId 丢弃（世界包切换防御） */
        if (['ren', 'di', 'tian'].indexOf(r.tier) < 0) return;
        if (out.filter(function (x) { return !x.kind; }).length >= max) return;
        out.push({
          rid: r.rid, evId: r.evId, tier: r.tier,
          nature: r.nature === 'bad' ? 'bad' : 'good',
          bornAt: r.bornAt > 0 ? r.bornAt : now, expireAt: r.expireAt,
          tpl: typeof r.tpl === 'string' ? r.tpl : ('rumor.tpl.' + r.tier + '.1'),
          place: typeof r.place === 'string' ? r.place : 'rumor.place.1'
        });
      });
      return out;
    }
  };
})();
