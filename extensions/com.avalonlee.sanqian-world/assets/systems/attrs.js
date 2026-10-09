/* systems/attrs.js — G12 角色属性引擎（角色属性设计 §一/§四）
 * 重算式（与 karma 同款纪律）：属性 = 境界基础 + 功法滋养 + 装备滋养 + 事件永久加成 + buff；
 * 任何来源变更后整体重算（反复穿脱不变，验收 4.10 #90）。
 * 判定：p = clamp(0.5 + (attr − dc)/(2×dc), 0.05, 0.95)，dc = 境界基础×2×难度系数。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  function baseOf(ws, D) { return (ws.realm + 1) * D.ATTR_BASE_PER_REALM; }
  function dcStdOf(ws, D) { return baseOf(ws, D) * D.ATTR_DC_MULT; }

  SQ.Attrs = {
    baseOf: baseOf,
    dcStdOf: dcStdOf,
    dcOf: function (ws, D, diff) { return dcStdOf(ws, D) * D.ATTR_DIFF[diff]; },

    /* 重算三属性（buff 项含 attr.{id} 类临时增益；只读未过期 buff） */
    recalc: function (ws, pack, D, mods) {
      var artsMap = pack.artsMap();
      var now = Date.now();
      var out = {};
      D.ATTRS.forEach(function (id) {
        var v = baseOf(ws, D);
        /* 功法滋养：槽内 × 等级 × (正/左 2 | 魔 3) */
        (ws.artsSlots || []).forEach(function (aid) {
          if ((ws.artsKnown || []).indexOf(aid) < 0) return;
          var a = artsMap[aid];
          if (!a || a.attr !== id) return;
          var lv = ws.artsLevels[aid] || 0;
          v += lv * (D.ARTS_NURTURE[a.alignment] || 2);
        });
        /* 装备滋养：attrValue */
        for (var slot in ws.gear) {
          var it = ws.gear[slot];
          if (it && it.attrValue && it.attrValue.attr === id) v += it.attrValue.value;
        }
        /* 事件永久加成（只增不清） */
        v += (ws.attrEventBonus && ws.attrEventBonus[id]) || 0;
        /* buff 临时属性（field = 'attr.jing' 形态，mult 为加算值） */
        (ws.buffs || []).forEach(function (b) {
          if (b.until > now && b.field === 'attr.' + id) v += b.mult;
        });
        out[id] = Math.max(0, Math.round(v * 100) / 100);
      });
      ws.attrs = out;
      return out;
    },

    /* 统一判定入口：check(attrId, diffKey, ws, D, mods, dcMult, pack) → {p, pass}
     * dcMult = 阵营档位判定修正（正道 0.95，ALIGN_EFFECTS.checkDcMult——作用于 dc 而非成功率，
     * 属性设计 §4.1 v2.2）；由调用方经 pack.worldSystems.effectsOf 取得后传入，缺省 1。
     * 摄魂（on_check）走 hooks 加 pp；善行判定守则由调用方保证 karma 不受成败影响。
     * pack（可选）= 法宝气运补偿 X01 的 check 分桶读/写入口（法宝全录 §3.2）。 */
    check: function (attrId, diff, ws, D, mods, dcMult, pack) {
      var dc = dcStdOf(ws, D) * D.ATTR_DIFF[diff] * (dcMult || 1);
      var v = (ws.attrs || {})[attrId] || 0;
      var p = 0.5 + (v - dc) / (2 * dc);
      /* 判定加点三源合计封顶 ≤ +15pp（引擎卷 §3.4 / 冒烟 #131）：
       * 摄魂（hooks.shehun）+ 斩三尸诀（sum.checkBonus，每级 +3pp）+ 秦老丈古阶引路（bonds.checkPp）
       * + 法宝·引魂铃（hooks.on_check，法宝全录 H09） */
      var addPp = ((mods && mods.hooks && mods.hooks.shehun) || 0) +
        ((mods && mods.sum && mods.sum.checkBonus) || 0) +
        ((mods && mods.bonds && mods.bonds.checkPp) || 0) +
        ((mods && mods.hooks && mods.hooks.on_check) || 0);
      p += Math.min(addPp, D.CHECK_BONUS_CAP != null ? D.CHECK_BONUS_CAP : 0.15);
      /* 法宝·鸿蒙紫气（X01）气运补偿：同类判定失败累积、成功清零（不进判定加点封顶池） */
      var hasTr = !!(SQ.Treasures && pack && pack.treasures);
      if (hasTr) p += SQ.Treasures.fateBonus(ws, pack, 'check');
      p = Math.max(D.ATTR_P_CLAMP[0], Math.min(D.ATTR_P_CLAMP[1], p));
      var pass = Math.random() < p;
      if (hasTr) SQ.Treasures.fateNote(ws, pack, 'check', pass);
      return { p: p, pass: pass, dc: dc };
    },

    /* 成功率文案档位（角色属性设计 §六）：≥85 十拿九稳 / 65~85 十之七八 / 45~65 五五之数 / 25~45 渺茫 / <25 九死一生 */
    oddsKey: function (p) {
      if (p >= 0.85) return 'odds.1';
      if (p >= 0.65) return 'odds.2';
      if (p >= 0.45) return 'odds.3';
      if (p >= 0.25) return 'odds.4';
      return 'odds.5';
    }
  };
})();
