/* worlds/xiuxian/tribulation.js — 渡劫系统（修仙专属 · 主文档 §七 v2.4）
 * p = clamp(base + resistBonus + talentBonus + karmaMod + alignFlat, 0.05, 0.95)
 * alignFlat = ALIGN_EFFECTS.tribBonusFlat（正道档 +0.05，与 karmaMod 并列先加总后 clamp，数值详设 §8.1）
 * resistBonus = resist项 min(Σresist/1200, 0.20) + 战力项 min((战力/P−1)×0.15, 0.15)
 * 失败损失 = clamp(0.5 + ΣtribFailLossMod + 神修正 + 不动明王, 0.30, 0.70)
 * 神修正 = clamp(1 − 神/dc标准线, −1, +1) × 0.10（神高损四成、神低损六成，不进 p 公式）
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  SQ.XTrib = {
    /* 成功率与分解（UI 预估浮层同源）；opts.base = 基础成功率覆盖（逆天大劫 §6.4 专用——
     * 独立劫不推进境界、真仙绝顶亦可挑战，其余加成构型与破境渡劫完全同一） */
    info: function (ws, pack, D, mods, opts) {
      var next = ws.realm + 1;
      var baseOverride = (opts && opts.base != null) ? opts.base : null;
      if (next >= D.REALMS.length && baseOverride == null) return null;
      var base = baseOverride != null ? baseOverride : D.REALMS[next].tribBase;
      var resistPart = Math.min(mods.resist / D.TRIB_RESIST_DIV, D.TRIB_RESIST_CAP);
      var P = D.REALMS[ws.realm].power;
      var power = SQ.Mods.powerOf(ws, pack, D, mods);
      var powerPart = Math.min((power / P - 1) * D.TRIB_POWER_COEF, D.TRIB_POWER_CAP);
      if (powerPart < 0) powerPart = 0;
      /* 法宝·鸿蒙紫气（X01）：渡劫失败累积的下次成功率补偿（法宝全录 §3.2，按判定类别分桶） */
      var fate = (SQ.Treasures && pack.treasures) ? SQ.Treasures.fateBonus(ws, pack, 'trib') : 0;
      /* 心魔（数值详设 §8.3.2 · 系统深化批 A3）：连败税——层数 = min(streak−1, maxStacks)（streak ≥2 起），
       * −0.01/层封顶 −0.03，进 talent 加项**同读点**（与雷纹/破障丹/气运并列加算，先加总后 TRIB_P_CLAMP，
       * clamp 内生效——非新公式项；真仙裸身最坏 0.338−0.03=0.308 仍远高于下界 0.05，「苦渡」不被封死） */
      var tsCfg = D.TRIB_STREAK || {};
      var xmCfg = tsCfg.xinmo || {};
      var streakNow = (ws.tribulation && ws.tribulation.streak) || 0;
      var xinmoStacks = (streakNow >= (xmCfg.minStreak != null ? xmCfg.minStreak : 2))
        ? Math.min(streakNow - 1, xmCfg.maxStacks != null ? xmCfg.maxStacks : 3) : 0;
      var xinmo = xinmoStacks * (xmCfg.perStack != null ? xmCfg.perStack : -0.01);
      /* 天道修正（天道设计 §4.2/§6.2）：天心护佑/劫云密布（nextTrib）与天睐/天怒档位态
       * 全部走 talent 加项**同读点**——加项内部正负加数，先加总后 TRIB_P_CLAMP，非新公式项；
       * 一次性纪律：渡劫结算窗口清空（realm.js onTribSettled 同点位） */
      var tiandao = (ws.tiandao && SQ.Tiandao) ? SQ.Tiandao.tribModOf(ws, D) : 0;
      /* 宿敌心结（天骄卷 §7.1）：feud ≥1 即 −0.02 talent 加项——独立于心魔 3 层上限、
       * 恒定单份不叠加；六向批负向总预算 −0.11 内（真仙裸身 0.228 ≫ clamp 下界） */
      var feud = SQ.Prodigy ? SQ.Prodigy.tribModOf(ws, D) : 0;
      /* 器灵技·护魂（融合器灵卷 §8.2）：一次性标记 +0.01 talent 加项——多件同持只取一份，
       * 渡劫结算瞬间消费并清除（realm.js onTribSettled 同点位，判后清除纪律） */
      var soul = (SQ.Fusion && ws.treasures) ? SQ.Fusion.soulGuardBonus(ws, pack, D) : 0;
      var talent = mods.sum.tribBonus + (ws.tribulation.next || 0) + fate + xinmo + tiandao + feud + soul;
      var karmaMod = SQ.XKarma.karmaMod(ws.karma || 0, D);
      var alignFlat = SQ.XKarma.effectsOf(ws, D).tribBonusFlat || 0;
      /* 护法位加项（G14 · 引擎卷 §3.3）：档3 +0.03 / 档4 +0.06，与四项并列先加总后 clamp；
       * 魔道档位失效归零（guardianOf 内判），individual 助力保留。
       * 门中护法（势力全录卷 §8.3 · 系统深化批 A5）：officeGuard 一次性标记为真时强制生效——
       * 有护法取其 bonus + extra；无护法（或 bonus=0，含魔道归零）按档3 floor 0.03 再 + extra（=0.05）。
       * 组织权柄与 karma 档位叙事正交：魔道档位豁免失效条款不受归零（消费端豁免，bonds.js 零修改）；
       * 清除点 = realm.js 判定后与 tribulation.next 同点位（预估浮层反复调 info() 不消耗）。 */
      var guard = SQ.Bonds ? SQ.Bonds.guardianOf(ws, pack, D) : null;
      var guardianBonus = guard ? guard.bonus : 0;
      var officeGuard = !!(ws.tribulation && ws.tribulation.officeGuard);
      if (officeGuard) {
        var gcfg = (D.FACTION_OFFICE || {}).GUARD || {};
        var floorB = gcfg.floorBonus != null ? gcfg.floorBonus : ((D.GUARD_BONUS || {})[3] || 0.03);
        var extraB = gcfg.extra != null ? gcfg.extra : 0.02;
        guardianBonus = (guardianBonus > 0 ? guardianBonus : floorB) + extraB;
      }
      var p = base + resistPart + powerPart + talent + karmaMod + alignFlat + guardianBonus;
      p = Math.max(D.TRIB_P_CLAMP[0], Math.min(D.TRIB_P_CLAMP[1], p));
      return {
        p: p,
        parts: { base: base, resist: resistPart, power: powerPart, talent: talent, fate: fate, xinmo: xinmo, xinmoStacks: xinmoStacks, streak: streakNow, karma: karmaMod, alignFlat: alignFlat, guardian: guardianBonus, guardianNpc: (guard && guardianBonus > 0) ? guard.npcId : null, officeGuard: officeGuard, next: ws.tribulation.next || 0, tiandao: tiandao, feud: feud, soul: soul }
      };
    },

    /* 失败修为保留系数（损失 = 1 − 返回值）：神高损四成、神低损六成（精气神实现 §二 P5 勘误式） */
    loss: function (ws, pack, D, mods) {
      var dcStd = SQ.Attrs.dcStdOf(ws, D);
      var shen = (ws.attrs || {}).shen || 0;
      var shenMod = Math.max(-1, Math.min(1, shen / dcStd - 1)) * D.ATTR_SHEN_LOSS_COEF;
      var mingwang = mods.hooks.mingwang || 0; /* 不动明王：-2/-5/-8 pp */
      var loss = D.TRIB_LOSS_BASE + mods.sum.tribFailLossMod + shenMod + mingwang;
      return Math.max(D.TRIB_LOSS_CLAMP[0], Math.min(D.TRIB_LOSS_CLAMP[1], loss));
    }
  };
})();
