/* systems/arts.js — G5 技能（功法）：习得 / 修习槽 / 升级 / 精通 / 待修习架复检
 * 规则源：数值详设 §四 + 功法武学·通用规范 §一（学习要求带）。
 * 等级 0~9（修行状态批）：获得 = Lv0，升级消耗 ARTS_COST[lv]×品阶系数（**耗修为**）；
 * 渡劫成功 artsLevels 全清零（持有与槽位保留，详设 §4.1）。
 * 精通（原「练习度」，精通批更名）：槽内功法按主修快/其余槽慢增速累积，且随当前等级
 * 递减（低阶快、高阶慢）；满值顿悟 Lv+1（在线 tick 推进，模式乘区：闭关易悟 / 历练难悟）。
 * 获得 ≠ 学会：reqs（境界/属性/karma）未达 → 留待修习架，复检达标自动入门（§4.4）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  SQ.Arts = {
    /* 学习要求判定（属性引用 G12 当前缓存值；karma 引用缓存值）。
     * 情报在手（势力全录卷 §9.2 · 系统深化批 A5）：id ∈ ws.intelArts → 豁免 reqs.realm
     * （情报豁免的是**身份门**——境界资历；根骨资质 attr 与心性 karma 门槛不因情报代持）。 */
    canLearn: function (ws, pack, D, id) {
      var a = pack.artsMap()[id];
      if (!a) return false;
      var r = a.reqs || {};
      var intel = !!(ws.intelArts && ws.intelArts[id]);
      if (r.realm != null && ws.realm < r.realm && !intel) return false;
      if (r.attr && (ws.attrs[r.attr.id] || 0) < r.attr.min) return false;
      if (r.karmaMin != null || r.karmaMax != null) {
        var karma = pack.worldSystems && pack.worldSystems.karmaOf
          ? pack.worldSystems.karmaOf(ws) : 0;
        if (r.karmaMin != null && karma < r.karmaMin) return false;
        if (r.karmaMax != null && karma > r.karmaMax) return false;
      }
      return true;
    },

    /* 缺项文案（UI 标红）：返回缺项 key 列表（情报豁免 realm 与 canLearn 同口径） */
    lacks: function (ws, pack, D, id) {
      var a = pack.artsMap()[id];
      var out = [];
      if (!a) return out;
      var r = a.reqs || {};
      var intel = !!(ws.intelArts && ws.intelArts[id]);
      if (r.realm != null && ws.realm < r.realm && !intel) out.push('realm.' + r.realm);
      if (r.attr && (ws.attrs[r.attr.id] || 0) < r.attr.min) out.push('attr:' + r.attr.id + '>=' + r.attr.min);
      if (r.karmaMin != null || r.karmaMax != null) {
        var karma = pack.worldSystems && pack.worldSystems.karmaOf ? pack.worldSystems.karmaOf(ws) : 0;
        if (r.karmaMin != null && karma < r.karmaMin) out.push('karma>=' + r.karmaMin);
        if (r.karmaMax != null && karma > r.karmaMax) out.push('karma<=' + r.karmaMax);
      }
      return out;
    },

    owned: function (ws, id) {
      return (ws.artsKnown || []).indexOf(id) >= 0 || (ws.shelf || []).indexOf(id) >= 0;
    },

    /* ── 处置（道具处置打磨包 · 散功 / 弃置）────────────────────────────
     * 散功 = 处置**已入门**功法；弃置 = 处置**架上未入门**功法——同一返还口径。
     * 返还 = ceil(base × (1 + 修习等级 × ART_SALVAGE_LV))，入账 in.refine（与库藏阁炼化同通道，
     * 保恒等式 100 + Σin − Σout === stones）。base 见 salvageBase；dupValue 供架上溢出折算。 */
    salvageBase: function (pack, D, id) {
      var a = pack.artsMap()[id];
      if (!a) return 0;
      var ob = a.obtain || {};
      if (ob.price) return Math.ceil(ob.price * D.ART_SALVAGE_RATE);   /* 可售：价 × 0.4 */
      return (D.ART_SALVAGE_BASE && D.ART_SALVAGE_BASE[a.tier]) || 0; /* 非卖品：品阶定额 */
    },

    /* 重复所得折算（架上溢出）：可售 ×0.5、非卖品同品阶定额 */
    dupValue: function (pack, D, id) {
      var a = pack.artsMap()[id];
      if (!a) return 0;
      var ob = a.obtain || {};
      if (ob.price) return Math.ceil(ob.price * D.ART_DUP_RATE);
      return (D.ART_SALVAGE_BASE && D.ART_SALVAGE_BASE[a.tier]) || 0;
    },

    salvageValue: function (ws, pack, D, id) {
      var lv = (ws.artsKnown || []).indexOf(id) >= 0 ? ((ws.artsLevels || {})[id] || 0) : 0;
      return Math.ceil(SQ.Arts.salvageBase(pack, D, id) * (1 + lv * D.ART_SALVAGE_LV));
    },

    /* 可散功判定：已持有且非槽内、非初始自带（obtain.type='initial'）、非显式 noSalvage */
    canSalvage: function (ws, pack, D, id) {
      var a = pack.artsMap()[id];
      if (!a || a.noSalvage || (a.obtain || {}).type === 'initial') return false;
      if ((ws.artsSlots || []).indexOf(id) >= 0) return false;
      return SQ.Arts.owned(ws, id);
    },

    /* 散功 / 弃置：移出持有（已知 → artsKnown，架上 → shelf）并返还灵石；返回 {value, known} */
    salvage: function (ws, pack, D, id) {
      if (!SQ.Arts.canSalvage(ws, pack, D, id)) return null;
      var known = (ws.artsKnown || []).indexOf(id) >= 0;
      var v = SQ.Arts.salvageValue(ws, pack, D, id);
      if (known) ws.artsKnown.splice(ws.artsKnown.indexOf(id), 1);
      else ws.shelf.splice(ws.shelf.indexOf(id), 1);
      if (ws.artsLevels) delete ws.artsLevels[id];
      var st0 = ws.stones;
      ws.stones += v;
      SQ.Ledger.note(ws, 'in', 'refine', ws.stones - st0);
      return { value: v, known: known };
    },

    /* 获得功法：达标 → artsKnown（Lv0）；未达标 → shelf（容量 24，满则按「重复所得」转灵石）。
     * logKey 可覆写入门日志模板（自悟批：自行领悟走 `arts.selflearn`，其余走默认 `arts.learned`）。 */
    gainArt: function (ws, pack, D, id, log, logKey) {
      if (SQ.Arts.owned(ws, id)) return null;
      if (SQ.Arts.canLearn(ws, pack, D, id)) {
        ws.artsKnown.push(id);
        if (log) log('arts', SQ.t(logKey || 'arts.learned', { name: SQ.t('skill.' + id + '.name', null, pack.worldId) }, pack.worldId));
        SQ.Arts.autoSlot(ws, pack, D, log); /* 体验手感批：有空槽即自动上槽（无槽则静默留在已学列表） */
        return 'known';
      }
      if (ws.shelf.length >= D.SHELF_CAP) {
        /* 架上溢出（道具处置打磨包）：不静默丢弃，按「重复所得」口径转灵石并写日志 */
        var dv = SQ.Arts.dupValue(pack, D, id);
        if (!dv) return null;
        var st0 = ws.stones;
        ws.stones += dv;
        SQ.Ledger.note(ws, 'in', 'refine', ws.stones - st0);
        if (log) log('arts', SQ.t('arts.shelffull', {
          name: SQ.t('skill.' + id + '.name', null, pack.worldId), n: SQ.fmt(dv), cur: SQ.t('resource.currency', null, pack.worldId)
        }, pack.worldId));
        return 'overflow';
      }
      ws.shelf.push(id);
      return 'shelf';
    },

    /* 复检待修习架（境界提升 / karma 变更后调用，§4.4）：达标即入门 + 日志 */
    recheckShelf: function (ws, pack, D, log) {
      var moved = [];
      for (var i = ws.shelf.length - 1; i >= 0; i--) {
        var id = ws.shelf[i];
        if (SQ.Arts.canLearn(ws, pack, D, id)) {
          ws.shelf.splice(i, 1);
          ws.artsKnown.push(id);
          moved.push(id);
          if (log) log('arts', SQ.t('arts.learned', { name: SQ.t('skill.' + id + '.name', null, pack.worldId) }, pack.worldId));
        }
      }
      if (moved.length) SQ.Arts.autoSlot(ws, pack, D, log); /* 体验手感批：复检入门后补空槽 */
      return moved;
    },

    levelOf: function (ws, id) {
      return (ws.artsKnown.indexOf(id) >= 0 && ws.artsLevels[id]) || 0;
    },

    /* 升级消耗（修行状态批 · §4.2 v2）：
     * base = ARTS_COST[lv] × ARTS_COST_TIER[品阶]（品级越高、等级越高越贵）
     * × (1+境界×0.5) × max(50%, 1−ΣartsSpeed)；**消耗修为（ws.qi）而非灵石**。 */
    upgradeCost: function (ws, pack, D, id, mods) {
      var lv = SQ.Arts.levelOf(ws, id);
      if (lv >= D.ARTS_MAX_LV) return null;
      var a = pack.artsMap()[id];
      var tierM = (D.ARTS_COST_TIER && a) ? (D.ARTS_COST_TIER[a.tier] || 1) : 1;
      var base = D.ARTS_COST[lv] * tierM;
      var disc = Math.max(D.ARTS_SPEED_FLOOR, 1 - mods.sum.artsSpeed);
      return Math.ceil(base * (1 + ws.realm * D.ARTS_COST_REALM) * disc);
    },

    /* 升级：扣修为（不入 ledger——ledger 只记灵石流水，修为无恒等式约束） */
    upgrade: function (ws, pack, D, id, mods) {
      var cost = SQ.Arts.upgradeCost(ws, pack, D, id, mods);
      if (cost == null || ws.qi < cost) return false;
      ws.qi -= cost;
      ws.artsLevels[id] = (ws.artsLevels[id] || 0) + 1;
      return true;
    },

    /* ── 精通（原「练习度」，精通批更名 · 需求 §3）────────────────
     * 每部功法独立精通 artsPractice[id]（0~PRACTICE_MAX），只有**槽内且已入门**
     * 且未满级（Lv<ARTS_MAX_LV）才增长；满值 → 顿悟：Lv+1 并清零重来。
     * 增速 = 主修（槽位第 1 位）PRACTICE_MAIN_PER_H / 其余槽 PRACTICE_OTHER_PER_H，
     * × PRACTICE_LV_RATE[当前等级]（低阶领悟快、高阶领悟慢）
     * × (1+ΣartsSpeed) × 模式 practiceMult（闭关 1.5 易悟 / 历练 0.5 难悟）。
     * 仅在线 tick 推进（离线不涨，与战斗同口径）。返回 {id, lv} 领悟记录供日志（≤1 条/tick）。 */
    tickPractice: function (ws, pack, D, mods, dtSec, ctx) {
      var cfg = D.MODES && D.MODES[ws.mode] ? D.MODES[ws.mode] : null;
      var modeMult = cfg ? cfg.practiceMult : 1;
      var speedMult = 1 + (mods.sum.artsSpeed || 0);
      var insight = null;
      for (var i = 0; i < (ws.artsSlots || []).length; i++) {
        var id = ws.artsSlots[i];
        if (!id || (ws.artsKnown || []).indexOf(id) < 0) continue;
        var lv = ws.artsLevels[id] || 0;
        if (lv >= D.ARTS_MAX_LV) continue;   /* 满级不再练 */
        /* 精通增速随等级递减：低阶快、高阶慢（精通批） */
        var lvRate = (D.PRACTICE_LV_RATE && D.PRACTICE_LV_RATE[lv] != null) ? D.PRACTICE_LV_RATE[lv] : 1;
        var perSec = (i === 0 ? D.PRACTICE_MAIN_PER_H : D.PRACTICE_OTHER_PER_H) / 3600;
        var cur = (ws.artsPractice || {})[id] || 0;
        cur += perSec * lvRate * speedMult * modeMult * dtSec;
        if (cur >= D.PRACTICE_MAX) {
          cur = 0;
          ws.artsLevels[id] = (ws.artsLevels[id] || 0) + 1;
          insight = { id: id, lv: ws.artsLevels[id] };
          if (ctx && ctx.log) {
            ctx.log('arts', SQ.t('arts.insight', {
              name: SQ.t('skill.' + id + '.name', null, pack.worldId),
              lv: ws.artsLevels[id]
            }, pack.worldId));
          }
        }
        if (!ws.artsPractice) ws.artsPractice = {};
        ws.artsPractice[id] = cur;
      }
      return insight;
    },

    practiceOf: function (ws, id, D) {
      var cap = D ? D.PRACTICE_MAX : 100;
      var v = (ws.artsPractice || {})[id];
      if (typeof v !== 'number' || !isFinite(v)) return 0;
      return Math.max(0, Math.min(cap, v));
    },

    /* ── 自行领悟（自悟批 · 需求 §2；自悟保底修复批重写时钟语义；自悟收敛批边际递减）───
     * 修持中随机「自行领悟」一部市面传承功法（obtain.type='shop' 且品阶 ∈ ARTS_SELFLEARN.TIERS），
     * 候选 = 已达标（canLearn）且未持有（!owned）者；得手直接入门（gainArt，日志 `arts.selflearn`）。
     *
     * **时钟语义（自悟保底修复批）**：ws.artsLearnClock = 「自上次得手以来的累计加权秒」，
     * 掷点**不从中扣减**——本次应掷次数由 floor(clock/interval) 的边界跨越数决定。
     * （旧实现每次掷点 clock -= interval，而在线单 tick dtSec ≤ 300 ⇒ clock 永不超过
     * interval+ε，保底 `clock >= PITY_H` 从不成立、进度条也封顶在一个掷点内——已修。）
     * 推进 = dtSec × 模式 practiceMult（闭关 1.5 易悟 / 历练 0.5 难悟）× (1+ΣartsSpeed)
     * × 边际递减（自悟收敛批：1/(1+DECAY×已自悟部数)，越悟越难，防一口气掏空池子）；
     * 离线（opts.offline）不乘模式乘区（潜心悟道），改乘 OFFLINE_MULT 折扣，且单次结算推进
     * 上限 OFFLINE_MAX_ROLLS 个掷点（防长离线回归爆发式得手）。得手 / 池枯竭即清零。
     * 返回领悟的功法 id 或 null。 */
    tickSelfLearn: function (ws, pack, D, mods, dtSec, ctx, opts) {
      var cfg = D.ARTS_SELFLEARN;
      if (!cfg || !(dtSec > 0)) return null;
      var offline = !!(opts && opts.offline);
      var speedMult = 1 + ((mods && mods.sum && mods.sum.artsSpeed) || 0);
      /* 边际递减（自悟收敛批）：已自悟越多、新悟越难——eff × 1/(1+DECAY×n) */
      var learned = ws.artsSelfLearnN || 0;
      var decay = 1 / (1 + (cfg.DECAY != null ? cfg.DECAY : 0) * learned);
      var eff;
      if (offline) {
        eff = speedMult * (cfg.OFFLINE_MULT != null ? cfg.OFFLINE_MULT : 0.5) * decay;
      } else {
        var modeCfg = (D.MODES && D.MODES[ws.mode]) || null;
        var modeMult = (modeCfg && modeCfg.practiceMult != null) ? modeCfg.practiceMult : 1;
        eff = modeMult * speedMult * decay;
      }
      var interval = (cfg.INTERVAL_MIN || 20) * 60;
      var pity = (cfg.PITY_H || 8) * 3600;
      var prev = ws.artsLearnClock || 0;
      var adv = dtSec * eff;
      if (offline) adv = Math.min(adv, interval * (cfg.OFFLINE_MAX_ROLLS != null ? cfg.OFFLINE_MAX_ROLLS : 2));
      var clock = prev + adv;
      var got = null;
      var rolls = Math.floor(clock / interval) - Math.floor(prev / interval);
      if (clock >= pity && rolls < 1) rolls = 1;   /* 保底跨线：即便本次未跨掷点也必掷一次 */
      for (var i = 0; i < rolls && !got; i++) {
        var force = clock >= pity;               /* 保底：累计达上限必得 */
        if (!force && Math.random() >= (cfg.P || 0.1)) continue;
        var cands = SQ.Arts.selfLearnCands(ws, pack, D);
        if (!cands.length) { clock = 0; break; } /* 池枯竭（无可领悟之功法）：进度清零、静默 */
        var pick = cands[Math.floor(Math.random() * cands.length)];
        SQ.Arts.gainArt(ws, pack, D, pick, ctx && ctx.log, 'arts.selflearn');
        got = pick;
        ws.artsSelfLearnN = (ws.artsSelfLearnN || 0) + 1;   /* 边际递减计数：越悟越难 */
        clock = 0;
      }
      ws.artsLearnClock = clock;
      return got;
    },

    /* 可自行领悟的候选池：市面传承（obtain.type='shop'）+ 品阶白名单 + 已达标 + 未持有 */
    selfLearnCands: function (ws, pack, D) {
      var cfg = D.ARTS_SELFLEARN || {};
      var tiers = cfg.TIERS || ['huang', 'xuan', 'di'];
      var map = pack.artsMap(), out = [];
      for (var id in map) {
        var a = map[id];
        if (!a.obtain || a.obtain.type !== 'shop') continue;   /* 专属/首通/黑市/初始 不入此池 */
        if (tiers.indexOf(a.tier) < 0) continue;
        if (SQ.Arts.owned(ws, id)) continue;
        if (!SQ.Arts.canLearn(ws, pack, D, id)) continue;
        out.push(id);
      }
      return out;
    },

    /* 自行领悟进度（保底口径，0~100）：UI 消费——满 100 必得一部 */
    selfLearnPct: function (ws, D) {
      var cfg = (D && D.ARTS_SELFLEARN) || {};
      var pity = (cfg.PITY_H || 8) * 3600;
      var v = (ws.artsLearnClock || 0) / pity * 100;
      if (!isFinite(v)) return 0;
      return Math.max(0, Math.min(100, v));
    },

    /* 槽位管理（6 槽，自由装移无成本；只有槽内生效）
     * replaceId（批 2·B4）：满槽时的原位替换目标——替换后槽序不变（主修位语义保持，引擎卷 §4.2）。 */
    slot: function (ws, pack, D, id, replaceId) {
      if (ws.artsKnown.indexOf(id) < 0) return false;
      if (ws.artsSlots.indexOf(id) >= 0) return false;
      if (ws.artsSlots.length >= D.ARTS_SLOTS) {
        var ri = replaceId != null ? ws.artsSlots.indexOf(replaceId) : -1;
        if (ri < 0) return false;
        ws.artsSlots[ri] = id;
        return true;
      }
      ws.artsSlots.push(id);
      return true;
    },
    unslot: function (ws, id) {
      var i = ws.artsSlots.indexOf(id);
      if (i < 0) return false;
      ws.artsSlots.splice(i, 1);
      return true;
    },

    /* 自动入槽（体验手感批 · 数值详设 §4.4 v1.26）：已入门功法按 artsKnown 顺序补入空槽，
     * 只进空槽、永不挤占既有槽位（主修=第 1 位语义由 slot/mainArt 保障）。
     * 幂等：重复调用无副作用。log 传 null = 静默回填（旧档 / 入世首次结算走 recalcDerived）。 */
    autoSlot: function (ws, pack, D, log) {
      var known = ws.artsKnown || [];
      var slots = ws.artsSlots || (ws.artsSlots = []);
      var added = [];
      for (var i = 0; i < known.length && slots.length < D.ARTS_SLOTS; i++) {
        if (slots.indexOf(known[i]) < 0) {
          slots.push(known[i]);
          added.push(known[i]);
          if (log) log('arts', SQ.t('arts.autoslot', {
            name: SQ.t('skill.' + known[i] + '.name', null, pack.worldId)
          }, pack.worldId));
        }
      }
      return added;
    },

    /* 主修（引擎卷 §4.2 形式化）：**修习槽第 1 位**；槽位空 = 主修为无（不顺延到其他槽）。
     * UI 功法页首位加「主修」角标即读本函数，语义与事件收益指向同源。 */
    mainArt: function (ws) {
      var first = (ws.artsSlots || [])[0];
      if (!first) return null;
      return (ws.artsKnown || []).indexOf(first) >= 0 ? first : null;
    },

    /* artsProgress 类收益的实际指向（引擎卷 §4.2）：主修优先；主修为空或已满级 →
     * 顺延「随机槽内功法」（只在未满级的槽内功法里随机，全满级则无处可加 → null） */
    progressTarget: function (ws, maxLv) {
      var cap = maxLv || 9;
      var main = SQ.Arts.mainArt(ws);
      if (main && (ws.artsLevels[main] || 0) < cap) return main;
      var cands = (ws.artsSlots || []).filter(function (id) {
        return (ws.artsKnown || []).indexOf(id) >= 0 && (ws.artsLevels[id] || 0) < cap;
      });
      if (!cands.length) return null;
      return cands[Math.floor(Math.random() * cands.length)];
    }
  };
})();
