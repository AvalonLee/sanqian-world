/* systems/idle.js — G2 主资源挂机：产出/上限/离线结算 + 突破循环编排入口
 * 规则源：数值详设 §一（产出公式/上限/离线 12h×50%）+ §7.5（离线批量渡劫 iter≤64）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  SQ.Idle = {
    /* 每秒产出 = 境界基础 × (1+ΣqiRate) × 阵营倍率 × caveMult（详设 §1.1 + §八 + §8.2）
     * caveMult 是**独立乘区**（挂末端，不进 qiRate 加算池）——防击穿功法六槽乘区审计上限（#105）；
     * 在线与离线共用本函数 ⇒ 洞府对闭关同样生效（引擎卷 §2.3「洞府是闭关质量的第一变量」）。
     * ⚠️ 本函数**不含**模式乘区与新手加速 ⇒ 要显示「玩家实际每秒在涨多少」请用 effRate（审计 #4）。 */
    rateOf: function (ws, pack, D, mods) {
      var align = pack.worldSystems && pack.worldSystems.alignMultOf ? pack.worldSystems.alignMultOf(ws) : 1;
      var caveMult = SQ.Cave ? SQ.Cave.multOf(ws, pack, D, mods) : 1;
      return D.REALMS[ws.realm].baseQi * (1 + mods.sum.qiRate) * align * caveMult;
    },

    /* 实际生效的每秒产出（审计 #4 的单一取数口）= rateOf × 模式乘区 × 新手加速。
     * 立因：视图原先直接打 rateOf，而 settle 在这里还要再乘两重 ⇒ 屏上「N/秒」实测比真涨少 3.9 倍
     *   （闭关 realm0 ×1.3×3）或多 1.82 倍（历练 ×0.55）。规则只在这一份，settle 与视图同调本函数。
     * shortcut: 在线口径（offline 时两重乘区按 settle 原语义一律不生效），若离线也要显示则传 offline。 */
    effRate: function (ws, pack, D, mods, offline) {
      var r = SQ.Idle.rateOf(ws, pack, D, mods);
      if (offline) return r;
      var modeCfg = (D.MODES && D.MODES[ws.mode]) ? D.MODES[ws.mode] : null;
      r = r * (modeCfg ? modeCfg.qiMult : 1);
      if (D.NEWBIE_RAMP && ws.realm <= D.NEWBIE_RAMP.realms) r *= D.NEWBIE_RAMP.qiMult;
      return r;
    },

    /* 上限 = max(base×2h, 下一阶need×1.15) × (1+ΣqiCap)（详设 §1.2 复核修订式） */
    capOf: function (ws, pack, D, mods) {
      var r = D.REALMS[ws.realm];
      var cap = r.baseQi * D.CAP_HOURS * 3600;
      if (ws.realm < D.REALMS.length - 1) {
        cap = Math.max(cap, D.REALMS[ws.realm + 1].need * D.CAP_NEED_FACTOR);
      }
      return cap * (1 + mods.sum.qiCap);
    },

    /* 时间差结算（在线 tick / 离线批量同一入口）：
     * 离线 = dt > ONLINE_WINDOW_MS（5 分钟，体验批）：时长封顶 (12h + 长夜修行)、效率 (0.5 + ΣofflineEff)；
     * 每攒满一次突破阈值就在循环内掷一次渡劫（iter ≤ 64，详设 §7.5）。
     * autoTrib：ctx.autoTrib === false（玩家关闭自动渡劫）→ 不掷，修为只攒到上限等手动点；
     * 未显式传（引擎内部直调/仿真）按旧口径自动渡劫。
     * 返回 {gain, offline, hours, trib:{n,s,f}} */
    settle: function (ws, pack, D, dtMs, now, ctx) {
      var offline = dtMs > D.ONLINE_WINDOW_MS;
      var autoTrib = !(ctx && ctx.autoTrib === false);
      var mods = SQ.Mods.collect(ctx.profile, ws, pack, D);
      /* 离线上限：长夜修行（功法 hook）+ 法宝·时空/御风灵舟（hook:on_offline_cap_h，法宝全录 X06/H03） */
      var capH = D.OFFLINE_CAP_H + ((mods.hooks.changye || 0)) + ((mods.hooks.taiyi || 0)) + ((mods.hooks.on_offline_cap_h || 0));   /* 太一星光（自创签名）同线加算（小时） */
      var dtSec = offline ? Math.min(dtMs / 1000, capH * 3600) : dtMs / 1000;
      if (dtSec <= 0) return { gain: 0, offline: offline, hours: 0, trib: { n: 0, s: 0, f: 0 } };
      /* 法宝在线成长（X02 生长 / X12 堕落）：仅在线计时，离线冻结（法宝全录 §3.2 挂点 on_tick_idle） */
      if (!offline && SQ.Treasures && pack.treasures) SQ.Treasures.tickIdle(ws, pack, D, dtSec, now, ctx && ctx.log);
      var eff = offline ? (D.OFFLINE_EFF + mods.sum.offlineEff) : 1;
      var remaining = dtSec;
      var iter = 0;
      var totalGain = 0;
      var trib = { n: 0, s: 0, f: 0 };
      var log = ctx.log;

      while (remaining > 1e-6 && iter < D.TRIB_ITER_CAP) {
        mods = SQ.Mods.collect(ctx.profile, ws, pack, D);
        var rate = SQ.Idle.effRate(ws, pack, D, mods, offline);
        /* 乘区口径（模式 ×qiMult、新手起步 ×NEWBIE_RAMP.qiMult，均只作用在线）收在 effRate 一处，
         * 视图显示与这里结算从此同一个式子（审计 #4）。 */
        /* 绵长内息（on_tick_idle）：本段结算概率双倍 */
        var mianxi = mods.hooks.mianxi || 0;
        var segEff = eff * (mianxi > 0 && Math.random() < mianxi ? 2 : 1);
        var need = SQ.Realm.needEffOf(ws, pack, D, mods);
        var advanced = remaining;
        if (autoTrib && need != null && rate > 0) {
          var head = Math.max(0, need - ws.qi);
          var tNeed = head / (rate * segEff);
          if (tNeed <= remaining) {
            advanced = tNeed;
            var g1 = rate * segEff * advanced;
            ws.qi += g1; totalGain += g1; ws.total += g1;
            remaining -= advanced;
            var r1 = SQ.Realm.tryBreakthrough(ws, pack, D, mods, now, ctx);
            trib.n++;
            if (r1 && r1.result === 'success') trib.s++; else trib.f++;
            iter++;
            continue;
          }
        }
        var g2 = rate * segEff * advanced;
        var cap = SQ.Idle.capOf(ws, pack, D, mods);
        var applied = Math.min(cap, ws.qi + g2) - ws.qi;
        ws.qi += applied; totalGain += applied; ws.total += applied;
        remaining = 0;
        if (need == null) break; /* 真仙后：溢出水槽（P8 前只到上限「已臻化境」） */
      }

      /* 炉火纯青（鲁千斤 on_claim_qi，批 3）：收功修为增益 +1%→4%——挂在结算末端，
       * 受当前上限约束（溢出水槽语义同主循环）；先于引灵入体 ⇒ 转化基数同步受益 */
      var claimQi = (mods.bonds && mods.bonds.claimQi) || 0;
      if (claimQi > 0 && totalGain > 0) {
        var capQ2 = SQ.Idle.capOf(ws, pack, D, mods);
        var bonusQ = Math.min(Math.max(0, capQ2 - ws.qi), totalGain * claimQi);
        if (bonusQ > 0) { ws.qi += bonusQ; totalGain += bonusQ; ws.total += bonusQ; }
      }

      /* 冥佑（楚老拐 on_tick_idle 计日，批 3）：档 ≥2 每 7 天 1 层 eventShield（≤2 层） */
      if (SQ.Bonds) SQ.Bonds.blessTick(ws, pack, D, now, log);

      /* 引灵入体（on_claim_stones）：收功修为增量转化灵石。
       * 修行状态批 v2.1：闭关「不增长灵石」——该转化只在线上**历练**生效（claimStones 闸）；
       * 离线（潜心悟道）按原有规则照常转化，零触碰。 */
      var jinling = mods.hooks.jinling || 0;
      var jinlingStones = 0;
      var cfgJ = (!offline && D.MODES && D.MODES[ws.mode]) ? D.MODES[ws.mode] : null;
      var jinlingOn = jinling > 0 && totalGain > 0 && !(cfgJ && cfgJ.claimStones === false);
      if (jinlingOn) {
        jinlingStones = Math.round(totalGain * jinling);
        var st0 = ws.stones;
        ws.stones += jinlingStones;
        /* in.offline = 「修为→灵石」转化阀门（引灵入体 + 坊市灵石包同属此类，引擎卷 §4.1 口径注） */
        jinlingStones = SQ.Ledger.note(ws, 'in', 'offline', ws.stones - st0);
      }

      /* 离线汇总（详设 §1.3 v1.7）：进离线规则（dt > 5min）才写 lastOffline 供修行页面板与回线弹窗消费；
       * ≤5min（offline=false）不写、不打效率折、不弹窗。离线不触发奇遇（事件池 §四）。 */
      if (offline) {
        ws.lastOffline = {
          at: now, secs: Math.floor(dtSec),
          qi: Math.round(totalGain), stones: jinlingStones,
          trib: { n: trib.n, s: trib.s, f: trib.f },
          mode: ws.mode || 'seclude'   /* 潜心悟道叙事口径：离山时在闭关还是历练（只影响文案） */
        };
      }

      /* 离线汇总日志（详设 §1.3） */
      if (offline) {
        var h = Math.floor(dtSec / 3600), m = Math.floor((dtSec % 3600) / 60);
        if (log) log('sys', SQ.t('log.offline', {
          h: h, m: m,
          res: SQ.t('resource.primary', null, pack.worldId),
          qi: SQ.fmt(totalGain),
          gate: SQ.t('tribulation.tag', null, pack.worldId),
          n: trib.n, s: trib.s, f: trib.f
        }, pack.worldId));
      }
      return { gain: totalGain, offline: offline, hours: dtSec / 3600, trib: trib };
    }
  };
})();
