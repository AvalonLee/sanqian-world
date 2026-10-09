/* talents/engine.js — 天赋抽取引擎（G9 角色档案 · P2）
 * 规则来源：《天赋池设计》§二 抽取算法 / §六 组合期望。
 *  - 组合分布：1正1负 40%（正面 ×1.5「极致单一」）/ 2正1负 35% / 1正2负 25%
 *  - 组池：common + 当前世界专属；加权无放回抽取，同一 roll 无重复词条
 *  - amplify 只放大正面天赋 effects ×1.5（数值四舍五入到 4 位，描述由 UI 按 effects 重算）
 *  - 重抽窗口只在创角阶段：确认后写入 profile.talents 永久锁定（view 层控制）
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
