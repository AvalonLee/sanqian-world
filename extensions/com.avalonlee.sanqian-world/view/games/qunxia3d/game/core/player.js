/* core/player.js — 玩家派生（源规格 §四 #3）
 * 迁移源（view/games/qunxia/game.html）：
 *   calcPlayerStats :3225–:3251   calcPlayerCombatPower :3461–:3473
 *   getPowerTierLabel :3475–:3481   comparePowerVerdict :3483–:3487
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE；只读 st 与数据表。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.core = root.QX3D.core || {}; root.QX3D.core.player = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('./data.js').D
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));

  function calcPlayerStats(st) {
    const inner = D.MARTIAL_DB[st.equippedInner] || D.MARTIAL_DB.zixia_shengong;
    const innerLv = st.learnedArts[st.equippedInner] || 1;
    let atkBonus = innerLv * 4 + (st.sectRankIdx || 0) * 5;
    let hpBonus = (inner.bonusHp || 30) + innerLv * 8;
    let mpBonus = (inner.bonusMp || 30) + innerLv * 6;

    ['weapon', 'armor', 'charm'].forEach(slot => {
      const itemId = st.equipment[slot];
      const forgeLv = (st.forgeLevels && st.forgeLevels[slot]) || 0;
      if (itemId && D.ITEMS_DB[itemId]) {
        atkBonus += (D.ITEMS_DB[itemId].atk || 0) + forgeLv * 5;
        hpBonus += (D.ITEMS_DB[itemId].hp || 0) + forgeLv * 10;
      }
    });

    (st.unlockedAcupoints || []).forEach(acuId => {
      const acu = D.ACUPOINTS_DB.find(a => a.id === acuId);
      if (acu) {
        atkBonus += (acu.atk || 0);
        hpBonus += (acu.hp || 0);
        mpBonus += (acu.mp || 0);
      }
    });

    return { atkBonus, hpBonus, mpBonus, inner };
  }

  function calcPlayerCombatPower(st) {
    const stats = calcPlayerStats(st);
    const moveIds = (st.equippedMoves && st.equippedMoves.length > 0) ? st.equippedMoves : ['taizu_changquan'];
    let avgMovePower = 0;
    moveIds.forEach(mId => {
      const m = D.MARTIAL_DB[mId];
      const lv = st.learnedArts[mId] || 1;
      if (m) avgMovePower += (m.power || 25) + (lv - 1) * 4;
    });
    avgMovePower = avgMovePower / moveIds.length;
    const power = Math.round(avgMovePower + stats.atkBonus * 1.6 + st.realmIdx * 10 + (st.maxHp - 80) * 0.15 + (st.maxMp - 60) * 0.15);
    return Math.max(30, power);
  }

  function getPowerTierLabel(power) {
    if (power >= 120) return { label: '宗师', cls: 'text-amber-200' };
    if (power >= 90) return { label: '一流', cls: 'text-emerald-200' };
    if (power >= 70) return { label: '二流', cls: 'text-sky-200' };
    if (power >= 50) return { label: '三流', cls: 'text-amber-100' };
    return { label: '初窥', cls: 'text-stone-200' };
  }

  function comparePowerVerdict(myPower, enemyPower) {
    if (myPower >= enemyPower + 12) return { key: 'favor', text: '稳操胜券', cls: 'power-tier-favor' };
    if (myPower >= enemyPower - 8) return { key: 'even', text: '势均力敌', cls: 'power-tier-even' };
    return { key: 'risk', text: '险象环生', cls: 'power-tier-risk' };
  }

  return {
    calcPlayerStats: calcPlayerStats,
    calcPlayerCombatPower: calcPlayerCombatPower,
    getPowerTierLabel: getPowerTierLabel,
    comparePowerVerdict: comparePowerVerdict
  };
});
