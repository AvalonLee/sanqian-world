/* systems/realm.js — G8 阶位/突破通用编排（world-independent）
 * 突破模式由世界包声明（详设 §七）：修仙 = 概率渡劫（worldSystems.tribP/tribLoss），
 * 古武 = 必成攻关（P6，同一编排入口换 worldSystems 实现）。
 * 离线批量：while 循环 iter ≤ TRIB_ITER_CAP 兜底（验收 4.5 #54）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  SQ.Realm = {
    /* 有效突破需求：need × (1 + ΣrealmCost + breakCostNext)，下限 10% */
    needEffOf: function (ws, pack, D, mods) {
      var next = ws.realm + 1;
      if (next >= D.REALMS.length) return null;
      var need = D.REALMS[next].need;
      var mod = 1 + mods.sum.realmCost + (ws.breakCostNext || 0);
      return need * Math.max(0.1, mod);
    },

    /* 掷一次突破（渡劫）：一次性修正（tribulation.next / breakCostNext）先参与计算、掷判后清空
     * （验收 4.5 #55：先加总后 clamp，用后即清）。返回 {result, p, loss, realm} */
    tryBreakthrough: function (ws, pack, D, mods, now, ctx) {
      var sys = pack.worldSystems;
      var log = ctx && ctx.log;
      var info = sys.tribInfo(ws, pack, D, mods);
      if (!info) return null;
      var targetRealm = ws.realm + 1;
      var success = Math.random() < info.p;
      /* 一次性修正用后即清（无论成败）；门中护法标记同点位清除（势力全录卷 §8.3——
       * 「先加总后 clamp、用后即清」纪律沿用，info() 预估反复调用不消耗） */
      var nextMod = ws.tribulation.next || 0;
      ws.tribulation.next = 0;
      ws.tribulation.officeGuard = false;
      ws.breakCostNext = 0;
      ws.tribulation.attempts++;
      var out = { result: success ? 'success' : 'fail', p: info.p, realm: targetRealm };
      /* 护法记录（批 3 · 详情页「护法记录」段消费）：加项生效即计次，成功另计 */
      if (SQ.Bonds && (info.parts || {}).guardian > 0) {
        ws.guardLog = ws.guardLog || { count: 0, success: 0 };
        ws.guardLog.count++;
        if (success) ws.guardLog.success++;
        var gNow = SQ.Bonds.guardianOf(ws, pack, D);
        out.guardian = gNow ? gNow.npcId : null;
      }
      if (success) {
        var nowS = now || Date.now();
        /* 无漏道基判定须在 streak 清零**前**取快照（§8.3.3：一击即中 = 此前无连败） */
        var prevStreak = ws.tribulation.streak || 0;
        ws.realm = targetRealm;
        ws.qi = 0;
        ws.artsLevels = {};                 /* 功法等级清零，持有与槽位保留（详设 §4.1） */
        ws.tribulation.lastSuccessTs = nowS; /* 待重修金标 24h 窗口起点（批 2·B4，仅视觉） */
        ws.tribulation.success++;
        ws.tribulation.lastResult = 'success';
        /* streak 清零 + 心魔层清零（心魔层数 = streak 派生值，无独立字段，§8.3.1） */
        ws.tribulation.streak = 0;
        /* 法宝渡劫成功回调（X01 气运清零 / X03 塔威清零 / X09 续命复原 / 先天认主 +1 阶）：
         * 先于 recalcDerived，使认主阶跃即时进入乘区 */
        if (SQ.Treasures && pack.treasures) SQ.Treasures.tribOnSuccess(ws, pack, D, log);
        /* ── 破境高光（数值详设 §8.3.3 · TRIB_SUCCESS_BONUS 四件套）── */
        var sb = D.TRIB_SUCCESS_BONUS || {};
        /* ①「破境」buff：qiRate +50% × 30min（pushBuff 通道，增益与道伤/封固减益正负分开判互不吞掉） */
        var pj = sb.poJing || { field: 'qiRate', mult: 0.5, mins: 30 };
        if (SQ.Events && SQ.Events.pushBuff) {
          SQ.Events.pushBuff(ws, pj.field || 'qiRate', pj.mult != null ? pj.mult : 0.5,
            nowS + Math.round((pj.mins || 30) * 60000), 'tribSuccess');
          if (log) log('trib', SQ.t('tribulation.pojing', { m: pj.mins || 30 }, pack.worldId));
        }
        /* ② 一次性灵石 = ZONES[新境界].stones × 300，记 in.event（REALMS/ZONES 索引平行；Ledger #113 零新增分类） */
        var winK = sb.WIN_STONE_K != null ? sb.WIN_STONE_K : 300;
        var ziS = Math.min(targetRealm, D.ZONES.length - 1);
        var winStones = Math.round(((D.ZONES[ziS] || {}).stones || 0) * winK);
        if (winStones > 0) {
          var stS = ws.stones;
          ws.stones += winStones;
          SQ.Ledger.note(ws, 'in', 'event', ws.stones - stS);
          if (log) log('trib', SQ.t('tribulation.winstones', {
            n: SQ.fmt(winStones), cur: SQ.t('resource.currency', null, pack.worldId)
          }, pack.worldId));
        }
        /* ③「无漏道基」：一击即中 → karma +5（既有 karmaEventScore 记账通道，受 KARMA_CLAMP） */
        var wlK = sb.wuLouKarma != null ? sb.wuLouKarma : 5;
        if (prevStreak === 0 && wlK) {
          ws.karmaEventScore = (ws.karmaEventScore || 0) + wlK;
          if (log) log('trib', SQ.t('tribulation.wulou', { n: wlK }, pack.worldId));
        }
        /* ④「天道垂青」：FATE_P 10% 触发 trib_success 标签专属奇遇（独立通道——不进常规时钟、
         * 不占 eventRate、不受 eventLuck；fateSeen 同境界段排除；池空静默跳过，§8.3.3 / 事件池 v2.7） */
        var fateP = sb.FATE_P != null ? sb.FATE_P : 0.10;
        if (SQ.Events && SQ.Events.fireTagged && Math.random() < fateP) {
          SQ.Events.fireTagged(ws, pack, D, 'trib_success', targetRealm, nowS, ctx);
        }
        /* ⑤「同贺」（好感三渠道批 · 引擎卷 v1.11 §3.2a 渠道 C）：破境瞬间全体已相识道友 +N。
         * **不属** TRIB_SUCCESS_BONUS 四件套（另有常量 BOND_CHEER_ON_BREAK），置于 recalcDerived 之前
         * 使本次好感即时进乘区；只走 Bonds.gain 唯一正向口，绝交锁 / 心结锁自动拒入账。
         * 零新增落盘字段。 */
        if (SQ.Bonds && SQ.Bonds.cheer) {
          SQ.Bonds.cheer(ws, pack, D, D.BOND_CHEER_ON_BREAK != null ? D.BOND_CHEER_ON_BREAK : 2, nowS, log);
        }
        pack.recalcDerived(ws, ctx && ctx.profile);
        SQ.Arts.recheckShelf(ws, pack, D, log);
        SQ.Gear.recheckStash(ws, pack, D, mods, log);
        /* 渐进式系统解锁播报（渐次解锁批 §C3）：本次跨过的导航门槛逐条日志宣告。
         * 阈值单一事实源 = D.TAB_UNLOCK（view 导航置灰与天骄引擎 gate 同源）。 */
        var TU = D.TAB_UNLOCK || {};
        for (var tuk in TU) {
          var tr = (TU[tuk] || {}).r;
          if (tr > 0 && tr > targetRealm - 1 && tr <= targetRealm) {
            if (log) log('sys', SQ.t('meta.unlock.tab', {
              name: SQ.t(TU[tuk].k, null, pack.worldId)
            }, pack.worldId));
          }
        }
        /* 图鉴成就标记（图鉴卷 §4.2 劫数组）：无漏三连（streak=0 一击即中累计）/
         * 苦渡余生（p ≤0.15 成功）/ 连败不灭（5 连败后首次成功）——状态扫描消费，零 tick */
        ws.tribMarks = ws.tribMarks || {};
        ws.tribMarks.wulouRun = prevStreak === 0 ? (ws.tribMarks.wulouRun || 0) + 1 : 0;
        if (info.p <= 0.15) ws.tribMarks.kudu = true;
        if (prevStreak >= 5) ws.tribMarks.lianbai = true;
        if (log) log('trib', SQ.t('tribulation.success', { realm: SQ.t('realm.' + targetRealm, null, pack.worldId) }, pack.worldId));
        out.streak = 0;
        out.prevStreak = prevStreak;
        out.winStones = winStones;
      } else {
        var loss = sys.tribLoss(ws, pack, D, mods);
        /* 法宝渡劫失败回调（法宝全录 X03 渡劫护体 / X09 续命 / X01 气运记账）：
         * retain 覆盖损失系数；skipAttempt = 本次不计入 attempts（X09）；nextAdd = 下次加成累积（X03） */
        var trf = (SQ.Treasures && pack.treasures) ? SQ.Treasures.tribOnFail(ws, pack, D, mods, loss, log) : null;
        var skipped = false;
        if (trf) {
          if (trf.retain != null) loss = trf.retain;
          if (trf.nextAdd) ws.tribulation.next = (ws.tribulation.next || 0) + trf.nextAdd;
          if (trf.skipAttempt) { ws.tribulation.attempts = Math.max(0, ws.tribulation.attempts - 1); skipped = true; }
        }
        /* 逆天盾（天道设计 §6.4）：一次性 retain 下次渡劫失败（修为全数保留），消耗后消失——
         * 与法宝 retain 通道同读点；X09 续命 skipAttempt 生效（本次不计尝试）时不消耗 */
        if (!skipped && ws.tiandao && ws.tiandao.shield === true) {
          loss = 1;
          ws.tiandao.shield = false;
          out.shield = true;
          if (log) log('trib', SQ.t('tiandao.log.shield', null, pack.worldId));
        }
        ws.qi = ws.qi * loss;
        ws.tribulation.lastResult = 'fail';
        /* ── 失败惩罚阶梯（数值详设 §8.3.1/§8.3.2 · 结算顺序：streak 判定 → debuff 挂载 → 心魔记账）──
         * X09 续命 skipAttempt 生效 = 本次尝试不计 → streak 同步不 +1、阶梯不触发（与 attempts 回退同源）。 */
        var ts = D.TRIB_STREAK || {};
        if (!skipped) ws.tribulation.streak = (ws.tribulation.streak || 0) + 1;
        var streak = ws.tribulation.streak || 0;
        var nowF = now || Date.now();
        if (!skipped && ts.daoShang && streak >= (ts.daoShang.minStreak != null ? ts.daoShang.minStreak : 1) &&
            SQ.Events && SQ.Events.pushBuff) {
          /* 道伤：qiRate −15% × 12h（重犯刷新时长不叠层——pushBuff 同字段同向语义天然满足） */
          SQ.Events.pushBuff(ws, ts.daoShang.field, ts.daoShang.mult,
            nowF + Math.round((ts.daoShang.hours || 12) * 3600000), 'tribStreak');
          if (log) log('trib', SQ.t((ts.logKeys || [])[0] || 'tribulation.streak1', null, pack.worldId));
        }
        var xinmoStacks = 0;
        if (!skipped && ts.xinmo && streak >= (ts.xinmo.minStreak != null ? ts.xinmo.minStreak : 2)) {
          /* 心魔：层数 = min(streak−1, maxStacks)，派生值不落库——p 侧读点在 XTrib.info talent 加项 */
          xinmoStacks = Math.min(streak - 1, ts.xinmo.maxStacks != null ? ts.xinmo.maxStacks : 3);
          if (log) log('trib', SQ.t((ts.logKeys || [])[1] || 'tribulation.streak2', { n: xinmoStacks }, pack.worldId));
        }
        if (!skipped && ts.fengGu && streak >= (ts.fengGu.minStreak != null ? ts.fengGu.minStreak : 3) &&
            SQ.Events && SQ.Events.pushBuff) {
          /* 修为封固：qiRate −25% × 24h（与道伤同通道：同字段同向保留最强，−25% 覆盖 −15%） */
          SQ.Events.pushBuff(ws, ts.fengGu.field, ts.fengGu.mult,
            nowF + Math.round((ts.fengGu.hours || 24) * 3600000), 'tribStreak');
          if (log) log('trib', SQ.t((ts.logKeys || [])[2] || 'tribulation.streak3', null, pack.worldId));
        }
        /* 吃一堑（功法 on_trib_next）+ 法宝·养魂木（hook:on_trib_next，法宝全录 H15）：
         * 失败后下次判定一次性修正，两源同通道加算 */
        var yiqian = (mods.hooks.yiqian || 0) + (mods.hooks.on_trib_next || 0);
        if (yiqian) ws.tribulation.next = (ws.tribulation.next || 0) + yiqian;
        out.loss = loss;
        out.streak = streak;
        out.xinmo = xinmoStacks;
        if (log) log('trib', SQ.t('tribulation.fail', { p: Math.round((1 - loss) * 100) }, pack.worldId));
      }
      void nextMod;
      /* 天道钩子（天道设计 §6.2/§7.1）：渡劫结算窗口——档位态与 nextTrib 清空（defy 值保留），
       * 天象入队（成功与破境同一结算瞬间、只挂一处不双入队）。事件钩子产物，零数值侵入。 */
      if (SQ.Tiandao && SQ.Tiandao.onTribSettled) {
        SQ.Tiandao.onTribSettled(ws, pack, D, success, now || Date.now(), ctx);
      }
      /* 器灵钩子（融合器灵卷 §6.1/§7.3/§8.2）：渡劫温养 +15（成败均计）+ 判词 +
       * 护魂一次性标记判后清除（多件不叠加、与吃一堑/officeGuard 同款纪律） */
      if (SQ.Fusion) {
        SQ.Fusion.onTribWarm(ws, pack, D, now || Date.now(), ctx && ctx.log);
        SQ.Fusion.verdictLine(ws, pack, D, 'trib', now || Date.now(), ctx && ctx.log);
        SQ.Fusion.onTribSettled(ws, pack);
      }
      return out;
    }
  };

})();
