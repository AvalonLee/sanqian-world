/* systems/tiles.js — 八格动作中枢 + 本境经济（源规格 §四 #6 的 M1 切片）
 * 迁移源（view/games/qunxia/game.html）：
 *   collectTileActions :4859–:5099   pickPrimaryActions :5101–:5106
 *   meditateRest :5806   tavernDrinkRest :5816   tavernPostBounty :5836（榜文弹窗留 UI）
 *   buyMarketItem :5930   forgeEquipment :5968   sectPractice :6005
 *   sectChallengeGuardian :6032（duel 参数构造；引擎 M2）   shrineCultivate :6059
 *   exploreSecretCave :6081（传世秘境内容 triggerCanonicalSecretRealm = M4，env 钩子）
 *   strollLocalSpot :6104   triggerRoadEncounter :6300–:6390（state 效果闭包全量）
 *   startBountyDuel :6220（duel 参数构造）   joinWorldCrisis :6256（watch 全量 + 入局构造）
 *   buyTradeGood :9422   sellTradeGood :9439   getRegionalTradeGood :9397
 *   getBestTradeDeal :4798   doEscortConvoy :9455（45% 劫匪 = env.duel 钩子，M2 接引擎）
 *   checkRealmPromotion :7785（境界六档阈值 [0,180,460,900,1500,2300]）
 *   commitLocalTileMove :4637（邻格 -4内息 / 跨街 -1行脚）
 * 与原版偏差（显式登记）：
 *   ① saveGame/renderAll/showToast/spawnFloatingText/playGuqinNote = 表现层，env 注入或缺省 noop
 *   ② startDuel / triggerCanonicalSecretRealm / openBountyPosterModal / openRoadEncounter 弹窗
 *      = env 钩子（M2/M4 接引擎与弹窗），state 等价性由对表沙箱同置 stub 保证
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.tiles = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var core = (typeof module !== 'undefined' && module.exports)
    ? { time: require('../core/time.js'), player: require('../core/player.js'), data: require('../core/data.js') }
    : (root.QX3D && root.QX3D.core) || {};
  var D = core.data ? core.data.D : (root.QX3D_DATA || {});

  function rngOf(env) { return (env && env.rand) || Math.random; }
  function log(st, env, text) { (env && env.addLog || core.time.addLog)(st, text); }
  function toast(env, msg, tone) { if (env && env.showToast) env.showToast(msg, tone); }

  /* ── 境界突破（checkRealmPromotion :7785）────────────────────────────────── */
  function checkRealmPromotion(st, env) {
    const thresholds = [0, 180, 460, 900, 1500, 2300];
    const nextRealm = st.realmIdx + 1;
    if (nextRealm < D.REALM_NAMES.length && st.exp >= thresholds[nextRealm]) {
      st.realmIdx = nextRealm;
      st.maxHp += 22;
      st.maxMp += 18;
      st.hp = st.maxHp;
      st.mp = st.maxMp;
      const newRealm = D.REALM_NAMES[st.realmIdx];
      log(st, env, `✨【境界突破】你的武学修为水到渠成，正式迈入【${newRealm}】之境！气血与真气上限大增！`);
      toast(env, `境界突破：晋升为【${newRealm}】！`, 'emerald');
    }
  }

  /* ── 本境移步（commitLocalTileMove :4637）───────────────────────────────── */
  function commitLocalTileMove(st, tileIdx, isAdj, env) {
    if (isAdj) st.mp -= 4;
    else st.ap -= 1;
    st.currentTileIdx = tileIdx;
    const curReg = core.time.getRegion(st.currentRegion);
    const tile = curReg.tiles[tileIdx];
    toast(env, `移步至【${tile.name}】(${isAdj ? '-4内息' : '-1行脚'})`);
    return { tile: tile };
  }
  /* onLocalTileClick 的判定面（:4655–:4683）：isAdj 判定 + 资源门槛 */
  function canMoveToTile(st, tileIdx) {
    const curReg = core.time.getRegion(st.currentRegion);
    const curTileObj = curReg.tiles[st.currentTileIdx] || curReg.tiles[0];
    const isAdj = curTileObj.next.includes(tileIdx);
    if (isAdj && st.mp < 4) return { ok: false, reason: '内息不足 4 点，无法施展轻功漫步街巷！请先服药或吐纳过旬。' };
    if (!isAdj && st.ap < 1) return { ok: false, reason: '跨街远跃需消耗 1 点行脚精力（当前已耗尽）！请走相邻街巷或【吐纳过旬】。' };
    return { ok: true, isAdj: isAdj };
  }

  /* ── 吐纳过旬（meditateRest :5806）──────────────────────────────────────── */
  function meditateRest(st, env) {
    st.hp = Math.min(st.maxHp, st.hp + Math.round(st.maxHp * 0.45));
    st.mp = Math.min(st.maxMp, st.mp + Math.round(st.maxMp * 0.6));
    core.time.advanceTime(st, 1, true, env);
    log(st, env, `于【${core.time.getRegion(st.currentRegion).name}】盘膝吐纳过旬（进入第 ${st.turn} 旬），行脚精力与各项本旬冷却全部重置！`);
    toast(env, `已进入第 ${st.turn} 旬：行脚精力回满(${st.ap}/${st.maxAp})，本旬互动次数已刷新！`, 'emerald');
  }

  /* ── 酒肆（tavernDrinkRest :5816 / tavernPostBounty :5836）──────────────── */
  function tavernDrinkRest(st, env) {
    if (st.turnFlags && st.turnFlags.drankTavern) {
      toast(env, '本旬已在酒肆痛饮过一次！过量饮酒伤身，请待下旬再来。', 'red');
      return false;
    }
    if (st.gold < 8) {
      toast(env, '纹银不足 8 文，掌柜笑称概不赊账！', 'red');
      return false;
    }
    st.gold -= 8;
    st.turnFlags.drankTavern = true;
    st.hp = Math.min(st.maxHp, st.hp + 50);
    st.mp = Math.min(st.maxMp, st.mp + 40);
    log(st, env, `于【${core.time.getRegion(st.currentRegion).name}】酒肆耗银 8 文小酌，恢复 50 气血与 40 内息。`);
    toast(env, '好酒下肚！气血+50，内息+40（本旬限饮1次）', 'emerald');
    return true;
  }

  var BOUNTY_NAMES = ['云中鹤·穷凶极恶', '南海鳄神·岳老三', '青翼蝠王·韦一笑', '万里独行·田伯光', '血刀恶僧·宝象', '黄河鬼雄·沙通天'];

  function tavernPostBounty(st, env) {
    const curReg = core.time.getRegion(st.currentRegion);
    const existingBounty = st.bounties.find(b => b.region === curReg.id);
    if (existingBounty) {
      if (env && env.openBountyPoster) env.openBountyPoster(existingBounty);
      return null;
    }
    const cdUntil = (st.bountyCooldownUntil && st.bountyCooldownUntil[curReg.id]) || 0;
    if (st.turn < cdUntil) {
      toast(env, `本境恶徒刚被肃清，尚需等待 ${cdUntil - st.turn} 旬才有新海捕文书！`, 'red');
      return null;
    }
    if (st.ap < 1) {
      toast(env, '揭榜追查恶徒下落需消耗 1 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return null;
    }

    st.ap -= 1;
    st.bountyCooldownUntil[curReg.id] = st.turn + 2;

    const rand = rngOf(env);
    const tileIdx = Math.floor(rand() * curReg.tiles.length);
    const names = BOUNTY_NAMES;
    const chosenName = names[Math.floor(rand() * names.length)];
    const stances = ['gang', 'rou', 'qiao'];
    const stnc = stances[Math.floor(rand() * stances.length)];

    const newBounty = {
      region: curReg.id,
      tileIdx: tileIdx,
      name: chosenName,
      title: '官府海捕 · 悬赏要犯',
      stance: stnc,
      power: 36 + st.realmIdx * 12,
      hp: 85 + st.realmIdx * 22,
      rewardGold: 32 + st.realmIdx * 8,
      rewardFame: 15,
      apAlreadyPaid: true
    };

    st.bounties = st.bounties.filter(b => b.region !== curReg.id);
    st.bounties.push(newBounty);

    st.currentTileIdx = tileIdx;
    st.viewLayer = 'local';
    log(st, env, `耗 1 行脚精力揭下官府悬赏榜文：恶徒【${chosenName}】正藏匿于本境【${curReg.tiles[tileIdx].name}】！`);
    if (env && env.openBountyPoster) env.openBountyPoster(newBounty);
    return newBounty;
  }

  /* ── 市集（buyMarketItem :5930 / forgeEquipment :5968）──────────────────── */
  function buyMarketItem(st, itemId, env) {
    const item = D.ITEMS_DB[itemId];
    if (!item) return false;
    const bought = (st.purchasedCounts && st.purchasedCounts[item.id]) || 0;
    const maxStock = item.maxStock || 1;
    if (bought >= maxStock) {
      toast(env, `【${item.name}】乃稀世孤品，商铺库存已售罄！`, 'red');
      return false;
    }
    if (st.gold < item.price) {
      toast(env, `纹银不足 ${item.price} 文！`, 'red');
      return false;
    }
    st.gold -= item.price;
    st.purchasedCounts[item.id] = bought + 1;

    if (item.slot === 'weapon' || item.slot === 'armor' || item.slot === 'charm') {
      st.equipment[item.slot] = item.id;
      const bonus = core.player.calcPlayerStats(st);
      st.maxHp = 110 + bonus.hpBonus;
      st.hp = Math.min(st.maxHp, st.hp + 20);
      toast(env, `已购入并佩挂【${item.name}】！`, 'emerald');
    } else if (item.slot === 'scroll' && item.learnArt) {
      st.learnedArts[item.learnArt] = Math.min(10, (st.learnedArts[item.learnArt] || 0) + 1);
      if (D.MARTIAL_DB[item.learnArt].type === 'move' && !st.equippedMoves.includes(item.learnArt) && st.equippedMoves.length < 4) {
        st.equippedMoves.push(item.learnArt);
      }
      toast(env, `研读【${item.name}】，习得绝学《${D.MARTIAL_DB[item.learnArt].name}》！`, 'emerald');
    } else {
      st.inventory[item.id] = (st.inventory[item.id] || 0) + 1;
      toast(env, `已购入【${item.name}】放入行囊！`, 'emerald');
    }
    log(st, env, `于市集斥资 ${item.price} 文购入【${item.name}】。`);
    return true;
  }

  function forgeEquipment(st, slot, env) {
    const curLv = (st.forgeLevels && st.forgeLevels[slot]) || 0;
    if (curLv >= 5) {
      toast(env, '该部位兵甲已淬炼至【神工 +5】满级！', 'amber');
      return false;
    }
    if (st.ap < 1) {
      toast(env, '玄铁铸炉锻造需消耗 1 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return false;
    }
    const costGold = [90, 180, 300, 460, 680][curLv] || 680;
    const costExp = [60, 120, 200, 300, 450][curLv] || 450;
    if (st.gold < costGold) {
      toast(env, `玄铁淬炼需纹银 ${costGold} 文（当前 ${st.gold} 文）！`, 'red');
      return false;
    }
    if (st.exp < costExp) {
      toast(env, `催动真火淬炼需武学修为 ${costExp} 点（当前 ${st.exp} 点）！`, 'red');
      return false;
    }

    st.ap -= 1;
    st.gold -= costGold;
    st.exp -= costExp;
    st.forgeLevels[slot] = curLv + 1;
    st.maxHp += 10;
    st.hp += 10;
    log(st, env, `🔥【玄铁铸炉】耗银 ${costGold} 文与 ${costExp} 修为，将随身${slot === 'weapon' ? '兵刃' : slot === 'armor' ? '宝甲' : '奇珍'}淬炼升至 +${curLv + 1} 阶！`);
    toast(env, `淬炼成功！升至 +${curLv + 1} 阶（威力+5，气血+10）`, 'emerald');
    return true;
  }

  /* ── 宗门格（sectPractice :6005 / sectChallengeGuardian :6032）──────────── */
  function sectPractice(st, env) {
    if (st.turnFlags && st.turnFlags.sectPracticeDone) {
      toast(env, '本旬已在演武堂参悟过一次！贪多嚼不烂，请待下旬再来。', 'red');
      return false;
    }
    if (st.ap < 1) {
      toast(env, '行脚精力不足 1 点，请先点击右上角【🧘 吐纳过旬】！', 'red');
      return false;
    }
    if (st.mp < 15) {
      toast(env, '内息不足 15 点，无法演练上乘武学！', 'red');
      return false;
    }
    st.ap -= 1;
    st.mp -= 15;
    st.turnFlags.sectPracticeDone = true;
    st.exp += 25;
    st.sectMerit += 12;
    st.fame += 6;
    log(st, env, `在【${core.time.getRegion(st.currentRegion).name}】演武堂拆招参悟，武学修为 +25，宗门功绩 +12。`);
    toast(env, '演武参悟：修为 +25，宗门功绩 +12，侠名 +6！', 'emerald');
    checkRealmPromotion(st, env);
    return true;
  }

  function sectChallengeGuardian(st, env) {
    if (st.turnFlags && st.turnFlags.guardianDuelDone) {
      toast(env, '本旬已向护法首座请益过一次，护法正在闭关！请待下旬再战。', 'red');
      return null;
    }
    if (st.ap < 1) {
      toast(env, '闯阵试炼需消耗 1 点行脚精力！请先【吐纳过旬】。', 'red');
      return null;
    }
    st.ap -= 1;
    st.turnFlags.guardianDuelDone = true;
    const curReg = core.time.getRegion(st.currentRegion);
    const params = {
      enemyName: `${curReg.name}护法首座`,
      enemyTitle: `${curReg.faction} · 镇山名宿`,
      enemyAvatar: curReg.name[0],
      enemyStance: ['gang', 'rou', 'qiao'][Math.floor(rngOf(env)() * 3)],
      enemyPower: 64 + st.realmIdx * 8,
      enemyHp: 140 + st.realmIdx * 15,
      contextTitle: `${curReg.name} · 闯阵试炼`,
      rewardGold: 26,
      rewardFame: 12,
      rewardExp: 28,
      rewardMerit: 20
    };
    if (env && env.startDuel) env.startDuel(st, params);
    return params;
  }

  /* ── 灵脉/秘境格（shrineCultivate :6059 / exploreSecretCave :6081）──────── */
  function shrineCultivate(st, env) {
    if (st.turnFlags && st.turnFlags.shrineDone) {
      toast(env, '本旬已在此灵脉吐纳冲关过一次，经脉尚需温养，请下旬再来！', 'red');
      return false;
    }
    if (st.ap < 2) {
      toast(env, '灵脉深度闭关需消耗 2 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return false;
    }
    st.ap -= 2;
    st.turnFlags.shrineDone = true;
    st.maxMp += 6;
    st.mp = st.maxMp;
    st.exp += 28;
    log(st, env, `于【${core.time.getRegion(st.currentRegion).name}】灵脉耗 2 点精力打坐冲穴，真气上限永久 +6，修为 +28！`);
    toast(env, '灵脉闭关：真气上限 +6，修为 +28！', 'emerald');
    checkRealmPromotion(st, env);
    return true;
  }

  function exploreSecretCave(st, env) {
    const curReg = core.time.getRegion(st.currentRegion);
    if (st.turnFlags.exploredRegions && st.turnFlags.exploredRegions[curReg.id]) {
      toast(env, `本旬已在【${curReg.name}】探寻过机缘，待下旬云雾散开再来寻访！`, 'red');
      return false;
    }
    if (st.ap < 1) {
      toast(env, '秘境探寻需消耗 1 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return false;
    }
    st.ap -= 1;
    st.turnFlags.exploredRegions[curReg.id] = true;

    // 优先检测是否触发十二大金庸传世秘境奇遇（每局每地可触发1次完整传世大奇遇！）
    if (!st.clearedSecrets) st.clearedSecrets = {};
    const specialSecret = D.SECRET_REALMS_DB[curReg.id];
    if (specialSecret && !st.clearedSecrets[curReg.id]) {
      /* 传世秘境内容 = M4（env 钩子；state 面到时随对表补全） */
      if (env && env.canonicalSecret) env.canonicalSecret(st, curReg.id, specialSecret);
      return { secret: curReg.id };
    }
    return { encounter: triggerRoadEncounter(st, curReg, true, env) };
  }

  /* ── 名胜格（strollLocalSpot :6104）─────────────────────────────────────── */
  function strollLocalSpot(st, env) {
    const curReg = core.time.getRegion(st.currentRegion);
    if (st.turnFlags.exploredRegions && st.turnFlags.exploredRegions[curReg.id]) {
      toast(env, `本旬已在【${curReg.name}】寻幽探访过一次，请待下旬再来！`, 'red');
      return false;
    }
    if (st.ap < 1) {
      toast(env, '驻足寻幽需消耗 1 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return false;
    }
    st.ap -= 1;
    st.turnFlags.exploredRegions[curReg.id] = true;
    return { encounter: triggerRoadEncounter(st, curReg, false, env) };
  }

  /* ── 途中/本境奇遇（triggerRoadEncounter :6300–:6390 state 效果闭包全量）── */
  function roadEncounterPool(st, reg, isSecretCave) {
    return [
      {
        tag: isSecretCave ? '秘洞遗刻' : '山道奇遇',
        title: '古壁剑痕 · 前辈残篇',
        desc: `行经【${reg.name}】幽僻之处，忽见石壁上刻着数行凌厉剑痕，旁有一具枯骨怀揣半卷帛书与血衣楼腰牌。`,
        choices: [
          {
            label: '【逍遥】耗费 15 点内息潜心临摹石壁剑意（逍遥+10，武学修为 +28）',
            apply: function (s, e) {
              s.mp = Math.max(0, s.mp - 15);
              core.time.addKarma(s, { xiayi: 0, kuangao: 0, xiaoyao: 10 });
              s.exp += 28;
              log(s, e, `于【${reg.name}】临摹前辈石壁剑痕，武学修为 +28。`);
              toast(e, '剑意入心：武学修为 +28！', 'emerald');
              checkRealmPromotion(s, e);
            }
          },
          {
            label: '【侠义】安葬前辈遗骨并收起遗物（侠义+12，纹银 +20 文，侠名 +10）',
            apply: function (s, e) {
              core.time.addKarma(s, { xiayi: 12, kuangao: 0, xiaoyao: 0 });
              s.gold += 20;
              s.fame += 10;
              log(s, e, `于【${reg.name}】安葬前辈枯骨，获遗留盘缠 20 文，侠名 +10。`);
              toast(e, '义葬前辈：纹银 +20文，侠名 +10！', 'emerald');
            }
          }
        ]
      },
      {
        tag: '江湖偶遇',
        title: '雨夜破庙 · 重伤镖师',
        desc: `山雨欲来，你在【${reg.name}】古道旁破庙避雨，撞见一名老镖师正被血衣楼外围刀客逼问镖银下落。`,
        choices: [
          {
            label: '⚔️ 【侠义】拔刀相助，三招击退血衣刀客！（侠义+15）',
            apply: function (s, e) {
              core.time.addKarma(s, { xiayi: 15, kuangao: 5, xiaoyao: 0 });
              if (e && e.startDuel) e.startDuel(s, {
                enemyName: '血衣外围刀客',
                enemyTitle: '劫镖恶徒 · 凶悍刀法',
                enemyAvatar: '刀',
                enemyStance: 'gang',
                enemyPower: 58 + s.realmIdx * 6,
                enemyHp: 120 + s.realmIdx * 12,
                contextTitle: `${reg.name}破庙 · 拔刀救镖师`,
                rewardGold: 32,
                rewardFame: 16,
                rewardExp: 25
              });
            }
          },
          {
            label: '【逍遥】耗费 10 文盘缠买伤药助老镖师从后窗脱困（逍遥+12，修为+22，侠名+10）',
            apply: function (s, e) {
              s.gold = Math.max(0, s.gold - 10);
              core.time.addKarma(s, { xiayi: 5, kuangao: 0, xiaoyao: 12 });
              s.exp += 22;
              s.fame += 10;
              log(s, e, `于【${reg.name}】赠药救下重伤镖师，获赠内功心得，修为 +22。`);
              toast(e, '救人一命：侠名 +10，武学修为 +22！', 'emerald');
              checkRealmPromotion(s, e);
            }
          }
        ]
      }
    ];
  }

  function triggerRoadEncounter(st, reg, isSecretCave, env) {
    const events = roadEncounterPool(st, reg, isSecretCave);
    const ev = events[Math.floor(rngOf(env)() * events.length)];
    if (env && env.openRoadEncounter) env.openRoadEncounter(ev, reg);
    return ev;
  }

  function applyRoadEncounterChoice(st, ev, idx, env) {
    const c = ev && ev.choices && ev.choices[idx];
    if (c && c.apply) {
      c.apply(st, env);
      return true;
    }
    return false;
  }

  /* ── 悬赏/大事入局（startBountyDuel :6220 / joinWorldCrisis :6256）──────── */
  function startBountyDuel(st, regionId, tileIdx, env, freeAp) {
    let idx = st.bounties.findIndex(b => b.region === regionId && (tileIdx === undefined || b.tileIdx === tileIdx));
    if (idx === -1) {
      idx = st.bounties.findIndex(b => b.region === st.currentRegion);
    }
    if (idx === -1) {
      toast(env, '当前地界暂无悬赏恶徒，可去酒肆客栈点击【揭榜官府悬赏令】！', 'amber');
      return null;
    }
    const b = st.bounties[idx];
    const needAp = !freeAp && !b.apAlreadyPaid;
    if (needAp && st.ap < 1) {
      toast(env, '缉拿悬赏恶徒需消耗 1 点行脚精力！请先【吐纳过旬】。', 'red');
      return null;
    }
    if (needAp) st.ap -= 1;
    b.apAlreadyPaid = false;
    st.currentRegion = b.region;
    st.currentTileIdx = b.tileIdx;

    const params = {
      enemyName: b.name,
      enemyTitle: b.title,
      enemyAvatar: b.name[0],
      enemyStance: b.stance,
      enemyPower: b.power,
      enemyHp: b.hp,
      contextTitle: `官府悬赏 · 缉拿【${b.name}】`,
      rewardGold: b.rewardGold,
      rewardFame: b.rewardFame,
      rewardExp: 26,
      rewardMerit: 18,
      bountyIndex: idx
    };
    if (env && env.startDuel) env.startDuel(st, params);
    return params;
  }

  function joinWorldCrisis(st, crisisId, env, mode) {
    const idx = st.crises.findIndex(c => c.id === crisisId);
    if (idx === -1) return null;
    const c0 = st.crises[idx];
    if (c0.phase === 'aftermath') {
      return { aftermath: true };
    }
    if (st.ap < 1) {
      toast(env, '参与天下大事需消耗 1 点行脚精力！请先【吐纳过旬】。', 'red');
      return null;
    }
    const c = st.crises[idx];
    st.ap -= 1;

    if (mode === 'watch') {
      st.exp += 28;
      st.fame += 10;
      st.crises.splice(idx, 1);
      log(st, env, `耗 1 行脚亲历「${c.title}」，在旁默察群雄过招路数，武学修为 +28！`);
      toast(env, `旁观「${c.title}」有所顿悟：武学修为 +28，侠名 +10！`, 'emerald');
      checkRealmPromotion(st, env);
      return { watched: true };
    }

    const params = {
      enemyName: c.enemyName,
      enemyTitle: c.enemyTitle,
      enemyAvatar: c.enemyName[0],
      enemyStance: c.enemyStance,
      enemyPower: c.enemyPower,
      enemyHp: c.enemyHp,
      contextTitle: `🔥 天下大事 · ${c.title}`,
      rewardGold: 50,
      rewardFame: 28,
      rewardExp: 45,
      rewardMerit: 30,
      crisisId: c.id
    };
    if (env && env.startDuel) env.startDuel(st, params);
    return params;
  }

  /* ── 行商（getRegionalTradeGood :9397 / getBestTradeDeal :4798 / 买卖 :9422/:9439） */
  function getRegionalTradeGood(zone) {
    return D.TRADE_GOODS_DB[zone] || D.TRADE_GOODS_DB.zhongyuan;
  }

  function getBestTradeDeal(st) {
    if (!st.tradeCargo) return null;
    const zone = core.time.getRegion(st.currentRegion).zone;
    let best = null;
    Object.values(D.TRADE_GOODS_DB).forEach(g => {
      const qty = st.tradeCargo[g.id] || 0;
      if (qty <= 0) return;
      const isForeign = g.zone !== zone;
      const unit = isForeign ? g.sellPrice : g.buyPrice;
      const profit = isForeign ? (g.sellPrice - g.buyPrice) * qty : 0;
      const total = unit * qty;
      if (!best || profit > best.profit || (profit === best.profit && total > best.total)) {
        best = { good: g, qty: qty, isForeign: isForeign, unit: unit, profit: profit, total: total };
      }
    });
    return best && best.isForeign ? best : (best && best.qty > 0 ? best : null);
  }

  function buyTradeGood(st, goodId, env) {
    const g = Object.values(D.TRADE_GOODS_DB).find(x => x.id === goodId);
    if (!g) return false;
    if (st.gold < g.buyPrice) {
      toast(env, `收购【${g.name}】需铜钱 ${g.buyPrice} 文（当前不足）！可先走镖或上山采药。`, 'red');
      return false;
    }
    if (!st.tradeCargo) st.tradeCargo = {};
    st.gold -= g.buyPrice;
    st.tradeCargo[goodId] = (st.tradeCargo[goodId] || 0) + 1;
    log(st, env, `🐪【商队收购】耗银 ${g.buyPrice} 文购入地方特产【${g.name} ×1】，运往外州可售 ${g.sellPrice} 文！`);
    toast(env, `已购入【${g.name} ×1】！跨州即可高价售出`, 'emerald');
    return true;
  }

  function sellTradeGood(st, goodId, currentZone, env) {
    const g = Object.values(D.TRADE_GOODS_DB).find(x => x.id === goodId);
    if (!g || !st.tradeCargo || !st.tradeCargo[goodId]) return null;
    const qty = st.tradeCargo[goodId];
    const isForeign = g.zone !== currentZone;
    const totalGain = (isForeign ? g.sellPrice : g.buyPrice) * qty;
    st.gold += totalGain;
    st.totalTradeProfit = (st.totalTradeProfit || 0) + totalGain;
    delete st.tradeCargo[goodId];
    log(st, env, `💰【跨州倾销】售出【${g.name} ×${qty}】，大赚纹银 +${totalGain} 文！`);
    toast(env, `倾销成功！获纹银 +${totalGain} 文！`, 'emerald');
    return totalGain;
  }

  /* ── 走镖（doEscortConvoy :9455）────────────────────────────────────────── */
  function doEscortConvoy(st, env) {
    if (st.ap < 1) {
      toast(env, '押镖护送需消耗 1 点行脚精力（当前不足）！请先【吐纳过旬】。', 'red');
      return null;
    }
    st.ap -= 1;
    const curReg = core.time.getRegion(st.currentRegion);
    if (rngOf(env)() < 0.45) {
      const params = {
        enemyName: `${curReg.name}劫镖山贼头目`,
        enemyTitle: '绿林悍匪 · 拦路劫镖',
        enemyAvatar: '匪',
        enemyStance: ['gang', 'rou', 'qiao'][Math.floor(rngOf(env)() * 3)],
        enemyPower: 38 + st.realmIdx * 10,
        enemyHp: 85 + st.realmIdx * 20,
        contextTitle: `${curReg.name} · 押镖护送遭遇战`,
        rewardGold: 32,
        rewardFame: 10,
        rewardExp: 24
      };
      if (env && env.startDuel) env.startDuel(st, params);
      return { robbed: true, params: params };
    }
    st.gold += 24;
    st.exp += 14;
    st.fame += 4;
    checkRealmPromotion(st, env);
    log(st, env, `🚩【平安走镖】在【${curReg.name}】护送商队顺利过关，获镖银 +24 文，修为 +14。`);
    toast(env, '走镖顺遂：获镖银 +24 文，修为 +14！', 'emerald');
    return { safe: true };
  }

  /* ── 八格动作中枢（collectTileActions :4859–:5099）──────────────────────── */
  function collectTileActions(st, curReg, curTile) {
    const actions = [];
    const push = (a) => actions.push(a);

    if (st.viewLayer === 'world') {
      push({
        id: 'enter_local',
        tier: 'recommend',
        priority: 100,
        label: `进入【${curReg.name}】本境`,
        sub: '展开 7 处街景 / 山门风物',
        cost: '免费',
        disabled: false,
        act: 'enter_local'
      });
    }

    if (curTile.type === 'tavern') {
      const drank = st.turnFlags && st.turnFlags.drankTavern;
      const cdUntil = (st.bountyCooldownUntil && st.bountyCooldownUntil[curReg.id]) || 0;
      const bountyOnCd = st.turn < cdUntil;
      push({
        id: 'tavern_drink',
        tier: 'recommend',
        priority: drank ? 20 : 90,
        label: '小酌佳酿 · 活血回气',
        sub: drank ? '本旬已饮' : '恢复 50 气血与 40 内息',
        cost: drank ? '已用' : '-8文',
        disabled: !!drank,
        act: 'tavern_drink'
      });
      push({
        id: 'tavern_bounty',
        tier: 'danger',
        priority: bountyOnCd ? 15 : 80,
        label: '揭榜官府悬赏令',
        sub: bountyOnCd ? `冷却中（余 ${cdUntil - st.turn} 旬）` : '追查本境恶徒，缉拿可获赏银',
        cost: bountyOnCd ? '冷却' : '-1行脚',
        disabled: bountyOnCd,
        act: 'tavern_bounty'
      });
    } else if (curTile.type === 'market') {
      const wLv = st.forgeLevels.weapon || 0;
      const forgeCost = (wLv + 1) * 35;
      const forgeExpCost = (wLv + 1) * 15;
      const forgeMax = wLv >= 5;
      push({
        id: 'forge_weapon',
        tier: 'recommend',
        priority: forgeMax ? 25 : 85,
        label: `玄铁铸剑 · 兵刃淬炼 (+${wLv}/5)`,
        sub: forgeMax ? '已达满阶' : `耗 1 行脚 + ${forgeCost} 文 + ${forgeExpCost} 修为`,
        cost: forgeMax ? '满阶' : '-1行脚',
        disabled: forgeMax,
        act: 'forge_weapon'
      });
      // 商铺条目一律进「更多」，避免冲进主行动三槽
      Object.values(D.ITEMS_DB).forEach((item, idx) => {
        const bought = (st.purchasedCounts && st.purchasedCounts[item.id]) || 0;
        const maxStock = item.maxStock || 1;
        const soldOut = bought >= maxStock;
        push({
          id: 'buy_' + item.id,
          tier: 'secondary',
          priority: soldOut ? 2 : 12 - Math.min(idx, 8),
          label: `购入【${item.name}】`,
          sub: soldOut ? '已售罄' : item.desc,
          cost: soldOut ? '售罄' : `${item.price}文`,
          disabled: soldOut,
          act: 'buy_' + item.id,
          group: 'shop'
        });
      });
    } else if (curTile.type === 'sect') {
      const localSect = D.SECTS_DB[curReg.id];
      const pracDone = st.turnFlags && st.turnFlags.sectPracticeDone;
      const guardDone = st.turnFlags && st.turnFlags.guardianDuelDone;
      if (localSect) {
        push({
          id: 'sect_hall',
          tier: 'recommend',
          priority: 88,
          label: `步入【${localSect.name}】掌门大殿`,
          sub: '拜师、晋升位份、请益镇派绝学',
          cost: '打开',
          disabled: false,
          act: 'sect_hall'
        });
      }
      push({
        id: 'sect_practice',
        tier: 'secondary',
        priority: pracDone ? 18 : 70,
        label: '演武堂参悟拆招',
        sub: pracDone ? '本旬已演武' : '修为 +25，宗门功绩 +12，侠名 +6',
        cost: pracDone ? '已用' : '-1行脚',
        disabled: !!pracDone,
        act: 'sect_practice'
      });
      push({
        id: 'sect_guardian',
        tier: 'danger',
        priority: guardDone ? 16 : 65,
        label: '闯阵试炼 · 请益护法',
        sub: guardDone ? '本旬已闯阵' : `与【${curReg.faction}】护法过招，胜获功绩 +20`,
        cost: guardDone ? '已用' : '-1行脚',
        disabled: !!guardDone,
        act: 'sect_guardian'
      });
    } else if (curTile.type === 'shrine' || curTile.type === 'secret') {
      const shrineDone = st.turnFlags && st.turnFlags.shrineDone;
      const exploredHere = st.turnFlags && st.turnFlags.exploredRegions && st.turnFlags.exploredRegions[curReg.id];
      push({
        id: 'shrine_cultivate',
        tier: 'recommend',
        priority: shrineDone ? 20 : 86,
        label: '灵脉閉关 · 吐纳周天',
        sub: shrineDone ? '本旬已闭关' : '永久真气上限 +6，修为 +28',
        cost: shrineDone ? '已用' : '-2行脚',
        disabled: !!shrineDone,
        act: 'shrine_cultivate'
      });
      push({
        id: 'explore_secret',
        tier: 'secondary',
        priority: exploredHere ? 18 : 78,
        label: '搜寻石壁遗刻 / 幽谷秘宝',
        sub: exploredHere ? '本旬此处已探寻' : '探寻前辈残卷与奇遇机缘',
        cost: exploredHere ? '已用' : '-1行脚',
        disabled: !!exploredHere,
        act: 'explore_secret'
      });
    } else if (curTile.type === 'entry') {
      const localGood = getRegionalTradeGood(curReg.zone);
      const ownedQty = (st.tradeCargo && st.tradeCargo[localGood.id]) || 0;
      push({
        id: 'escort',
        tier: 'recommend',
        priority: 92,
        label: '镖局走镖护送',
        sub: '稳赚 +24 文、修为 +14（偶遇劫匪）',
        cost: '-1行脚',
        disabled: false,
        act: 'escort'
      });
      push({
        id: 'buy_trade',
        tier: 'secondary',
        priority: 75,
        label: `收购本境特产【${localGood.name}】`,
        sub: `已囤 ${ownedQty} · 外州可售 ${localGood.sellPrice} 文`,
        cost: `-${localGood.buyPrice}文`,
        disabled: false,
        act: 'buy_trade'
      });
      const deal = getBestTradeDeal(st);
      if (deal) {
        push({
          id: 'sell_best',
          tier: deal.isForeign ? 'recommend' : 'secondary',
          priority: deal.isForeign ? 95 : 50,
          label: `抛售【${deal.good.name}】×${deal.qty}`,
          sub: deal.isForeign ? `异地高价，预计 +${deal.total} 文` : '本地平价回收',
          cost: `+${deal.total}文`,
          disabled: false,
          act: 'sell_best'
        });
      }
    } else {
      const exploredHere = st.turnFlags && st.turnFlags.exploredRegions && st.turnFlags.exploredRegions[curReg.id];
      push({
        id: 'stroll',
        tier: 'recommend',
        priority: exploredHere ? 22 : 80,
        label: '驻足寻幽',
        sub: exploredHere ? '本旬此处已游历' : '触发本境风物奇遇',
        cost: exploredHere ? '已用' : '-1行脚',
        disabled: !!exploredHere,
        act: 'stroll'
      });
      push({
        id: 'meditate',
        tier: 'secondary',
        priority: 55,
        label: '吐纳过旬',
        sub: '重置行脚精力与冷却',
        cost: '+1旬',
        disabled: false,
        act: 'meditate'
      });
    }

    // 本境悬赏（若恶徒就在当前地格或世界层）
    const localBounty = (st.bounties || []).find(b => b.region === curReg.id);
    if (localBounty) {
      const onTile = st.viewLayer === 'world' || localBounty.tileIdx === st.currentTileIdx;
      if (onTile) {
        const myPower = core.player.calcPlayerCombatPower(st);
        const verdict = myPower >= localBounty.power ? '可挑战' : (myPower >= localBounty.power * 0.75 ? '势均' : '暂避');
        push({
          id: 'bounty_duel',
          tier: 'danger',
          priority: verdict === '可挑战' ? 97 : 60,
          label: `缉拿【${localBounty.name}】`,
          sub: `战力对比：我 ${myPower} vs 敌 ${localBounty.power}（${verdict}）· 赏 +${localBounty.rewardGold}文`,
          cost: '开战',
          disabled: false,
          act: 'bounty_duel'
        });
      }
    }

    const localCrisis = (st.crises || []).find(c => c.region === curReg.id);
    if (localCrisis) {
      if (localCrisis.phase === 'aftermath') {
        push({
          id: 'crisis_aftermath',
          tier: 'danger',
          priority: 99,
          label: `介入余波 · ${localCrisis.title}`,
          sub: `余波余 ${localCrisis.aftermathRemain || 0} 旬`,
          cost: '余波',
          disabled: false,
          act: 'crisis_aftermath'
        });
      } else {
        push({
          id: 'crisis_join',
          tier: 'danger',
          priority: 99,
          label: `挺身入局 · ${localCrisis.title}`,
          sub: `原著盛事上演中，余 ${localCrisis.remainTurns} 旬`,
          cost: '入局',
          disabled: false,
          act: 'crisis_join'
        });
      }
    }

    return actions;
  }

  /* pickPrimaryActions（:5101–:5116 逐段对写）：group=shop 永不进主槽，disabled 沉底，
   * 返回 { primary, more }（more = 主槽外全部 + 商铺组按优先级） */
  function pickPrimaryActions(actions, maxN) {
    maxN = maxN || 3;
    // 商铺购入等 group=shop 永不进主行动三槽
    const candidates = actions.filter(a => a.group !== 'shop');
    const shopOnly = actions.filter(a => a.group === 'shop');
    const sorted = candidates.slice().sort((a, b) => {
      if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
      return b.priority - a.priority;
    });
    const primary = sorted.slice(0, maxN);
    const primaryIds = new Set(primary.map(a => a.id));
    const more = sorted.filter(a => !primaryIds.has(a.id)).concat(
      shopOnly.slice().sort((a, b) => b.priority - a.priority)
    );
    return { primary: primary, more: more };
  }

  return {
    checkRealmPromotion: checkRealmPromotion,
    commitLocalTileMove: commitLocalTileMove,
    canMoveToTile: canMoveToTile,
    meditateRest: meditateRest,
    tavernDrinkRest: tavernDrinkRest,
    tavernPostBounty: tavernPostBounty,
    buyMarketItem: buyMarketItem,
    forgeEquipment: forgeEquipment,
    sectPractice: sectPractice,
    sectChallengeGuardian: sectChallengeGuardian,
    shrineCultivate: shrineCultivate,
    exploreSecretCave: exploreSecretCave,
    strollLocalSpot: strollLocalSpot,
    roadEncounterPool: roadEncounterPool,
    triggerRoadEncounter: triggerRoadEncounter,
    applyRoadEncounterChoice: applyRoadEncounterChoice,
    startBountyDuel: startBountyDuel,
    joinWorldCrisis: joinWorldCrisis,
    getRegionalTradeGood: getRegionalTradeGood,
    getBestTradeDeal: getBestTradeDeal,
    buyTradeGood: buyTradeGood,
    sellTradeGood: sellTradeGood,
    doEscortConvoy: doEscortConvoy,
    collectTileActions: collectTileActions,
    pickPrimaryActions: pickPrimaryActions
  };
});
