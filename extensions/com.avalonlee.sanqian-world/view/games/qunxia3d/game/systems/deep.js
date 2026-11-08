/* systems/deep.js — 深度系统：武学升级 / 穴位 / 隐庐经营 / 秘境奖励（源规格 §四 #10~#11 · M4）
 * 迁移源（view/games/qunxia/game.html）：
 *   getArtUpgradeCost :7895–:7903   getMaxAllowedArtLevel :7905–:7908
 *   upgradeArt :8130–:8156   unlockAcupoint :8069–:8100
 *   equipInnerArt :8102–:8109   toggleEquipMove :8111–:8128
 *   upgradeEstateBuilding :8853–:8875   assignEstateSteward :8877–:8887
 *   doEstateWork :8889–:8985（六劳作：forage/alchemy_jade/alchemy_dahuan/smith_upgrade/clinic/qingxiu）
 *   triggerCanonicalSecretRealm :9564–:9585（弹窗留 UI）/ claimCanonicalSecretReward :9587–:9618
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE；副作用经 env 注入。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.deep = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var core = (typeof module !== 'undefined' && module.exports)
    ? { time: require('../core/time.js'), player: require('../core/player.js'), data: require('../core/data.js'), tiles: require('./tiles.js') }
    : (root.QX3D && root.QX3D.core) || {};
  var D = core.data ? core.data.D : (root.QX3D_DATA || {});

  function log(st, env, text) { (env && env.addLog || core.time.addLog)(st, text); }
  function toast(env, msg, tone) { if (env && env.showToast) env.showToast(msg, tone); }
  function promote(st, env) { (env && env.checkRealmPromotion || core.tiles.checkRealmPromotion)(st, env); }

  /* ── 武学升级价（getArtUpgradeCost :7895–:7903 逐式）────────────────────── */
  var TIER3_IDS = ['dugu_jiujian', 'xianglong_zhang', 'anran_zhang', 'liumai_shenjian', 'huoyan_dao', 'qiankun_nuoyi', 'jiuyang_shengong', 'beiming_shengong', 'yijin_jing', 'xiaowuxiang_gong'];
  function getArtUpgradeCost(st, artId) {
    const art = D.MARTIAL_DB[artId];
    const lv = st.learnedArts[artId] || 1;
    const tier = (art && art.tier) ? art.tier : (TIER3_IDS.includes(artId) ? 3 : 2);
    let base = tier === 1 ? (40 + lv * 28) : tier === 2 ? (85 + lv * 55) : (140 + lv * 85);
    if ((st.talents || []).includes('talent_prodigy')) base = Math.round(base * 0.85);
    if ((st.talents || []).includes('t_bad_dull')) base = Math.round(base * 1.25);
    return base;
  }

  /* 境界决定武学重数上限（getMaxAllowedArtLevel :7905–:7908） */
  function getMaxAllowedArtLevel(st) {
    return Math.min(10, (st.realmIdx + 1) * 2);
  }

  /* ── 武学升级（upgradeArt :8130–:8156 逐式）──────────────────────────────── */
  function upgradeArt(st, artId, env) {
    const art = D.MARTIAL_DB[artId];
    if (!art) return false;
    const curLv = st.learnedArts[artId] || 1;
    const maxCap = getMaxAllowedArtLevel(st);
    if (curLv >= 10) {
      toast(env, `《${art.name}》已臻至第 10 重返璞归真大圆满！`, 'amber');
      return false;
    }
    if (curLv >= maxCap) {
      toast(env, `受限于当前【${D.REALM_NAMES[st.realmIdx]}】境界，武学最高只能突破至第 ${maxCap} 重！请先积累修为提升境界。`, 'red');
      return false;
    }
    const cost = getArtUpgradeCost(st, artId);
    if (st.exp < cost) {
      toast(env, `突破至第 ${curLv + 1} 重需武学修为 ${cost} 点（当前 ${st.exp} 点）！`, 'red');
      return false;
    }
    st.exp -= cost;
    st.learnedArts[artId] = curLv + 1;
    log(st, env, `耗费 ${cost} 点修为苦修，将《${art.name}》突破至第 ${st.learnedArts[artId]} 重！`);
    toast(env, `《${art.name}》精进至第 ${st.learnedArts[artId]} 重！`, 'emerald');
    return true;
  }

  /* ── 穴位冲关（unlockAcupoint :8069–:8100 逐式）──────────────────────────── */
  function unlockAcupoint(st, acuId, env) {
    if ((st.unlockedAcupoints || []).includes(acuId)) {
      toast(env, '该处奇经八脉穴位已贯通！', 'emerald');
      return false;
    }
    const acu = (D.ACUPOINTS_DB || []).find(a => a.id === acuId);
    if (!acu) return false;
    if (st.realmIdx < (acu.reqRealm || 0)) {
      toast(env, `冲开【${acu.name}】需武学境界达到【${D.REALM_NAMES[acu.reqRealm]}】！`, 'red');
      return false;
    }
    if (st.exp < acu.cost) {
      toast(env, `冲开【${acu.name}】需 ${acu.cost} 点武学修为（当前 ${st.exp}）！`, 'red');
      return false;
    }
    st.exp -= acu.cost;
    st.unlockedAcupoints.push(acuId);
    st.maxHp += (acu.hp || 0);
    st.hp += (acu.hp || 0);
    st.maxMp += (acu.mp || 0);
    st.mp += (acu.mp || 0);
    if (acu.apUp) {
      st.maxAp += acu.apUp;
      st.ap += acu.apUp;
    }
    log(st, env, `☯️【奇经八脉】运使真气冲开【${acu.name}】（${acu.bonusDesc}）！`);
    toast(env, `已冲开【${acu.name}】！${acu.bonusDesc}`, 'emerald');
    return true;
  }

  /* ── 内功/招式佩挂（equipInnerArt :8102 / toggleEquipMove :8111）──────────── */
  function equipInnerArt(st, artId, env) {
    if (!D.MARTIAL_DB[artId]) return false;
    st.equippedInner = artId;
    toast(env, `已运转内功《${D.MARTIAL_DB[artId].name}》！`, 'emerald');
    return true;
  }

  function toggleEquipMove(st, artId, env) {
    const idx = st.equippedMoves.indexOf(artId);
    if (idx >= 0) {
      if (st.equippedMoves.length <= 1) {
        toast(env, '至少须保留 1 门防身招式！', 'red');
        return false;
      }
      st.equippedMoves.splice(idx, 1);
    } else {
      if (st.equippedMoves.length >= 4) {
        st.equippedMoves.shift();
      }
      st.equippedMoves.push(artId);
    }
    return true;
  }

  /* ── 隐庐建筑升级（upgradeEstateBuilding :8853–:8875 逐式）────────────────── */
  function upgradeEstateBuilding(st, bId, env) {
    const bMeta = (D.ESTATE_BUILDINGS_DB || []).find(x => x.id === bId);
    if (!bMeta || !st.estate) return false;
    const curLv = st.estate.buildings[bId] || 0;
    if (curLv >= 3) {
      toast(env, `【${bMeta.name}】已达最高 3 级规模！`, 'amber');
      return false;
    }
    let cost = bMeta.costs[curLv + 1];
    if (st.estate.stewardId === 'guojing') cost = Math.round(cost * 0.85);
    if (st.gold < cost) {
      toast(env, `扩建【${bMeta.name}】需纹银 ${cost} 文（当前 ${st.gold} 文）！`, 'red');
      return false;
    }
    st.gold -= cost;
    st.estate.buildings[bId] = curLv + 1;
    log(st, env, `🏡【隐庐营造】斥资 ${cost} 文将【${bMeta.name}】扩建至 ${curLv + 1} 级（${bMeta.levels[curLv + 1]}）！`);
    toast(env, `【${bMeta.name}】已升至 ${curLv + 1} 级！`, 'emerald');
    return true;
  }

  /* ── 隐庐客卿（assignEstateSteward :8877–:8887）──────────────────────────── */
  function assignEstateSteward(st, masterId, env) {
    const m = (st.masters || []).find(x => x.id === masterId);
    if (!m || !st.estate) return false;
    st.estate.stewardId = m.id;
    log(st, env, `🏡【隐庐客卿】延请【${m.name}】坐镇洛水隐庐！`);
    toast(env, `已延请【${m.name}】担任隐庐客卿！`, 'emerald');
    return true;
  }

  /* ── 隐庐六劳作（doEstateWork :8889–:8985 逐式）──────────────────────────── */
  function doEstateWork(st, workType, env) {
    const e = env || {};
    if (!st.estate) return false;
    if (st.estate.workDoneThisTurn) {
      toast(e, '本旬已在隐庐主理过一次百工营生！请待下旬再来。', 'red');
      return false;
    }
    if (st.ap < 1) {
      toast(e, '主理百工营生需消耗 1 点行脚精力！请先点击右上角【🧘 吐纳过旬】。', 'red');
      return false;
    }

    if (workType === 'forage') {
      st.ap -= 1;
      st.estate.workDoneThisTurn = true;
      st.estate.herbs = (st.estate.herbs || 0) + 1;
      st.gold += 14;
      st.exp += 8;
      log(st, e, '⛏️【邙山苦作】耗 1 行脚上山采药砍柴，采得灵草 1 株、售柴得 14 文铜钱，筋骨修为 +8。');
      toast(e, '采药砍柴完成：灵草 +1，铜钱 +14 文，修为 +8！', 'emerald');
    } else if (workType === 'alchemy_jade') {
      if ((st.estate.herbs || 0) < 2) {
        toast(e, '灵草不足 2 株！请先扩建【百草药圃】并吐纳过旬采收。', 'red');
        return false;
      }
      st.estate.herbs -= 2;
      st.ap -= 1;
      st.estate.workDoneThisTurn = true;
      st.inventory.jinchuang_yao = (st.inventory.jinchuang_yao || 0) + 1;
      st.exp += st.estate.stewardId === 'zhangwuji' ? 27 : 12;
      log(st, e, '⚗️【隐庐丹房】耗 2 株灵草炼成【九花玉露丸 ×1】，修为精进！');
      toast(e, '炼丹成功：获得【九花玉露丸 ×1】！', 'emerald');
    } else if (workType === 'alchemy_dahuan') {
      if ((st.estate.herbs || 0) < 5) {
        toast(e, '炼制少林大还丹需 5 株灵草（当前不足）！', 'red');
        return false;
      }
      st.estate.herbs -= 5;
      st.ap -= 1;
      st.estate.workDoneThisTurn = true;
      st.inventory.dahuan_dan = (st.inventory.dahuan_dan || 0) + 1;
      st.exp += 22;
      log(st, e, '🔥【隐庐丹房】耗 5 株灵草炼成佛门圣药【少林大还丹 ×1】！');
      toast(e, '大丹出炉：获得【少林大还丹 ×1】！', 'emerald');
    } else if (workType === 'smith_upgrade') {
      if ((st.estate.iron || 0) < 2) {
        toast(e, '百炼玄铁不足 2 块！请先建造【神机铁坊】并过旬产出。', 'red');
        return false;
      }
      const curW = st.forgeLevels.weapon || 0;
      if (curW >= 5) {
        toast(e, '随身兵刃已达 +5 神工满阶！已将玄铁锻成精钢售得 45 文！', 'amber');
        st.estate.iron -= 2;
        st.ap -= 1;
        st.estate.workDoneThisTurn = true;
        st.gold += 45;
      } else {
        st.estate.iron -= 2;
        st.ap -= 1;
        st.estate.workDoneThisTurn = true;
        st.forgeLevels.weapon = curW + 1;
        st.maxHp += 10;
        st.hp += 10;
        if (st.estate.stewardId === 'jiumozhi') st.exp += 15;
        log(st, e, `🔨【隐庐铸剑】耗 2 块玄铁亲自鼓风铸剑，随身兵刃免费升至 +${curW + 1} 阶！`);
        toast(e, `玄铁铸兵大成：随身兵刃升至 +${curW + 1} 阶！`, 'emerald');
      }
    } else if (workType === 'clinic') {
      if ((st.estate.herbs || 0) < 1) {
        toast(e, '悬壶义诊需至少 1 株灵草入药！', 'red');
        return false;
      }
      st.estate.herbs -= 1;
      st.ap -= 1;
      st.estate.workDoneThisTurn = true;
      const fameGain = st.estate.stewardId === 'xiaofeng' ? 21 : 14;
      st.gold += 22;
      st.fame += fameGain;
      core.time.addKarma(st, { xiayi: 10, kuangao: 0, xiaoyao: 0 });
      log(st, e, `🩺【悬壶义诊】耗 1 株灵草救治洛阳百姓，获诊金 22 文、侠名 +${fameGain}、侠义 +10。`);
      toast(e, `义诊济世：纹银 +22文，侠名 +${fameGain}，侠义 +10！`, 'emerald');
    } else {
      /* qingxiu（fallthrough） */
      st.ap -= 1;
      st.estate.workDoneThisTurn = true;
      st.mp = Math.min(st.maxMp, st.mp + 45);
      if (st.estate.stewardId === 'xiaolongnv') {
        st.hp = Math.min(st.maxHp, st.hp + 25);
      }
      st.exp += 24;
      core.time.addKarma(st, { xiayi: 0, kuangao: 0, xiaoyao: 10 });
      log(st, e, '🍵【隐庐清修】于绿竹轩抚琴烹茶，内息恢复 45，武学修为 +24，逍遥 +10。');
      toast(e, '抚琴悟道：内息 +45，修为 +24，逍遥 +10！', 'emerald');
    }

    promote(st, e);
    return true;
  }

  /* ── 传世秘境奖励（claimCanonicalSecretReward :9587–:9618 逐式）───────────── */
  function claimCanonicalSecretReward(st, regionId, env) {
    const sec = (D.SECRET_REALMS_DB || {})[regionId];
    if (!sec) return null;
    if (!st.clearedSecrets) st.clearedSecrets = {};
    st.clearedSecrets[regionId] = true;

    if (sec.artId && D.MARTIAL_DB[sec.artId]) {
      st.learnedArts[sec.artId] = Math.min(10, (st.learnedArts[sec.artId] || 0) + 1);
    }
    if (sec.secondArtId && D.MARTIAL_DB[sec.secondArtId]) {
      st.learnedArts[sec.secondArtId] = Math.min(10, (st.learnedArts[sec.secondArtId] || 0) + 1);
    }
    if (sec.grantEquipSlot && sec.grantEquipId) {
      st.equipment[sec.grantEquipSlot] = sec.grantEquipId;
    }
    if (sec.bonusGold) st.gold += sec.bonusGold;
    if (sec.bonusIron) st.estate.iron = (st.estate.iron || 0) + sec.bonusIron;
    st.exp += sec.bonusExp || 60;
    st.fame += 25;
    st.maxHp += 15;
    st.maxMp += 15;
    st.hp = st.maxHp;
    st.mp = st.maxMp;

    promote(st, env);
    log(st, env, `🌟【传世奇遇】${sec.logMsg}`);
    toast(env, `奇遇大成：习得《${(D.MARTIAL_DB[sec.artId] || {}).name || '绝世神功'}》！`, 'emerald');
    return { cleared: true, artId: sec.artId, secondArtId: sec.secondArtId };
  }

  return {
    getArtUpgradeCost: getArtUpgradeCost,
    getMaxAllowedArtLevel: getMaxAllowedArtLevel,
    upgradeArt: upgradeArt,
    unlockAcupoint: unlockAcupoint,
    equipInnerArt: equipInnerArt,
    toggleEquipMove: toggleEquipMove,
    upgradeEstateBuilding: upgradeEstateBuilding,
    assignEstateSteward: assignEstateSteward,
    doEstateWork: doEstateWork,
    claimCanonicalSecretReward: claimCanonicalSecretReward
  };
});
