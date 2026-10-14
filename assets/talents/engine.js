/* talents/engine.js — 天赋抽取引擎（G9 角色档案 · P2）
 * 规则来源：《天赋池设计》§二 抽取算法 / §六 组合期望。
 *  - 组合分布：1正1负 40%（正面 ×1.5「极致单一」）/ 2正1负 35% / 1正2负 25%
 *  - 组池：common + 当前世界专属；加权无放回抽取，同一 roll 无重复词条
 *  - amplify 只放大正面天赋 effects ×1.5（数值四舍五入到 4 位，描述由 UI 按 effects 重算）
 *  - 创角重抽窗口：点「入定」前无限免费重抽；锁定后写入 profile.talents
 *  - 一世内变更（天赋池设计 v1.8 §十 · 洗髓批 2026-10-12）：四渠道（洗髓丹 / 奇遇 / 破境 / 遗泽商店）
 *    只经 SQ.Talents.grantSwap 赐缘，消耗只经 SQ.Talents.applySwap —— 判定源与写口同在一处
 *    （与 Bonds.grantHeir 同一条纪律），预算 = D.TALENT_SWAP.PER_LIFE（本世可换枚数）
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  var COMBOS = [
    { pos: 1, neg: 1, weight: 40 },
    { pos: 2, neg: 1, weight: 35 },
    { pos: 1, neg: 2, weight: 25 }
  ];
  var AMPLIFY = 1.5;

  function pickCombo() {
    var total = 0, i;
    for (i = 0; i < COMBOS.length; i++) total += COMBOS[i].weight;
    var r = Math.random() * total;
    for (i = 0; i < COMBOS.length; i++) {
      r -= COMBOS[i].weight;
      if (r < 0) return { pos: COMBOS[i].pos, neg: COMBOS[i].neg };
    }
    return { pos: 2, neg: 1 };
  }

  /* 加权无放回抽取 n 条 */
  function pickWeighted(pool, n) {
    var bag = pool.slice();
    var out = [];
    while (out.length < n && bag.length) {
      var total = 0, i;
      for (i = 0; i < bag.length; i++) total += bag[i].weight;
      var r = Math.random() * total;
      for (i = 0; i < bag.length; i++) {
        r -= bag[i].weight;
        if (r < 0) { out.push(bag[i]); bag.splice(i, 1); break; }
      }
    }
    return out;
  }

  function copyTalent(t) {
    var effects = {};
    for (var k in t.effects) effects[k] = t.effects[k];
    /* P3 起天赋只存机制字段：name/desc 走词表 talent.{id}.name/.desc（存档瘦身 + 单一事实源） */
    return {
      id: t.id, kind: t.kind, tier: t.tier, world: t.world,
      weight: t.weight, effects: effects, amplified: false
    };
  }

  /* amplify（极致单一 ×1.5）：加算型键直接 ×1.5（有利方向，含负值减免如 mingwang −0.03→−0.045）；
   * 乘算型 hook（yufeng 唯一）按 v' = 1 + (v − 1) × 1.5 换算（0.90 → 0.85，天赋池设计 §二注记）——
   * 直接 ×1.5 会得到 1.35 的惩罚反向值（#167）。 */
  function amplify(talent) {
    for (var k in talent.effects) {
      var v = talent.effects[k];
      if (k === 'yufeng') v = 1 + (v - 1) * AMPLIFY;
      else v = v * AMPLIFY;
      talent.effects[k] = Math.round(v * 10000) / 10000;
    }
    talent.amplified = true;
  }

  /* rollTalents(worldId) → { combo, talents[] }；talents 为深拷贝（可反复重抽不污染源池） */
  SQ.rollTalents = function (worldId) {
    var T = SQ.TALENTS || {};
    var combo = pickCombo();
    var posPool = (T.common && T.common.positive ? T.common.positive : [])
      .concat(T[worldId] && T[worldId].positive ? T[worldId].positive : []);
    var negPool = (T.common && T.common.negative ? T.common.negative : [])
      .concat(T[worldId] && T[worldId].negative ? T[worldId].negative : []);
    var talents = pickWeighted(posPool, combo.pos).concat(pickWeighted(negPool, combo.neg));
    talents = talents.map(copyTalent);
    if (combo.pos === 1 && combo.neg === 1) {
      for (var i = 0; i < talents.length; i++) {
        if (talents[i].kind === 'positive') amplify(talents[i]);
      }
    }
    return { combo: combo, talents: talents };
  };

  /* ── 一世洗髓（天赋池设计 v1.8 §十）───────────────────────────────
   * 单一写口：赐缘与换骨都只认这两个函数，四渠道不各自改 profile。
   * 预算语义：used + owed ≤ PER_LIFE（本世可换枚数）；owed = 已得未用之缘。 */
  SQ.Talents = SQ.Talents || {};

  function swapCap(D) { return Math.max(0, Math.floor(Number(((D || {}).TALENT_SWAP || {}).PER_LIFE)) || 0); }
  function n0(v) { var n = Math.floor(Number(v)); return isFinite(n) && n > 0 ? n : 0; }

  /* 本池 = 创角同池同权重（common + 世界专属，正负合池）；洗髓候选不分正负档 */
  SQ.Talents.poolOf = function (worldId) {
    var T = SQ.TALENTS || {};
    var w = T[worldId] || {};
    var c = T.common || {};
    return (c.positive || []).concat(w.positive || [])
      .concat(c.negative || []).concat(w.negative || []);
  };

  /* 还有没有预算：赐缘前的**唯一**预判口 —— 丹/商店这类「先扣资源再赐缘」的渠道必须先问它，
   * 否则会吃一颗丹零收益还报成功（第十四批刚收过的那一类静默零收益）。 */
  SQ.Talents.swapRoom = function (ws, D) {
    return swapCap(D) - n0(ws.talentUsed) - n0(ws.talentOwed) > 0;
  };

  /* 赐一枚洗髓缘（四渠道共用）：预算已满即拒，成功只动 ws.talentOwed */
  SQ.Talents.grantSwap = function (ws, D) {
    var cap = swapCap(D);
    var used = n0(ws.talentUsed), owed = n0(ws.talentOwed);
    if (!cap || used + owed >= cap) return { ok: false, reason: 'cap', used: used, owed: owed, cap: cap };
    ws.talentOwed = owed + 1;
    return { ok: true, used: used, owed: ws.talentOwed, cap: cap };
  };

  /* n 枚候选：排除已持有 id（含转世天赋槽，避免与 legacyTalents 撞同一条词条） */
  SQ.Talents.candidates = function (worldId, profile, n) {
    var held = {};
    ((profile && profile.talents) || []).concat((profile && profile.legacyTalents) || [])
      .forEach(function (t) { if (t && t.id) held[t.id] = 1; });
    var pool = SQ.Talents.poolOf(worldId).filter(function (t) { return !held[t.id]; });
    return pickWeighted(pool, n || 3).map(copyTalent);
  };

  /* 换骨：只认 id（视图传回来的对象一律不信），按 id 回池重建 ⇒ 篡改档改不出不存在的词条 */
  SQ.Talents.applySwap = function (worldId, profile, ws, D, slotIdx, candId) {
    var list = (profile && profile.talents) || [];
    if (n0(ws.talentOwed) <= 0) return { ok: false, reason: 'none' };
    var slot = Math.floor(Number(slotIdx));
    if (!(slot >= 0 && slot < list.length)) return { ok: false, reason: 'badslot' };
    var held = {};
    list.forEach(function (t, i) { if (i !== slot && t && t.id) held[t.id] = 1; });
    ((profile && profile.legacyTalents) || []).forEach(function (t) { if (t && t.id) held[t.id] = 1; });
    if (held[candId]) return { ok: false, reason: 'dup' };
    var src = null;
    SQ.Talents.poolOf(worldId).forEach(function (t) { if (t.id === candId) src = t; });
    if (!src) return { ok: false, reason: 'unknown' };
    var from = list[slot] && list[slot].id;
    list[slot] = copyTalent(src);   /* amplified 恒 false：极致单一 ×1.5 是创角组合属性，不随换骨重算 */
    profile.talents = list;
    ws.talentOwed = n0(ws.talentOwed) - 1;
    ws.talentUsed = n0(ws.talentUsed) + 1;
    return { ok: true, from: from, to: candId, kind: src.kind, tier: src.tier };
  };

  /* 起名校验（UI 屏 1）：2~8 字符，去首尾空格 */
  SQ.validateName = function (name) {
    var s = (name || '').trim();
    return s.length >= 2 && s.length <= 8;
  };

  /* 随机道名：姓氏池 × 名池（世界包词表分卷提供 SQ.NAMES[worldId]，缺省回落通用池 SQ.NAMES.common） */
  SQ.randomRoleName = function (worldId) {
    var NAMES = SQ.NAMES || {};
    var parts = NAMES[worldId] || NAMES.common || { surname: ['??'], given: ['??'] };
    var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
    return pick(parts.surname) + pick(parts.given);
  };

  /* effects → 数值描述行（amplify 后由本函数重算，保证「描述同步」）
   * 字段标签走词表 talent.field.<字段>（世界词表可覆盖，如古武「战意产出」）；
   * 乘算型 hook（yufeng）非百分比口径 → 渲染为「瓶颈间隔 ×0.92」乘数句式（天赋池设计 §三·补 注记 4）。 */
  SQ.effectsToText = function (effects, worldId) {
    var parts = [];
    for (var k in effects) {
      var v = effects[k];
      var label = SQ.t ? SQ.t('talent.field.' + k, null, worldId) : k;
      if (k === 'yufeng') {
        parts.push(label + ' ×' + (Math.round(v * 1000) / 1000));
        continue;
      }
      var pct = Math.abs(v * 100);
      var num = (Math.round(pct * 10) / 10).toString().replace(/\.0$/, '');
      parts.push(label + ' ' + (v >= 0 ? '+' : '-') + num + '%');
    }
    return parts.join(SQ.t ? SQ.t('ui.sep') : ', ');
  };
})();
