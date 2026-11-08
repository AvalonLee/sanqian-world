/* systems/masters.js — 名宿交互 + 三幕传记（源规格 §四 #9 · M5）
 * 迁移源（view/games/qunxia/game.html）：
 *   chatWithMaster :6119–:6146   learnFromMaster :6148–:6184
 *   duelMaster :6186–:6218（duel 参数构造）   resolveMasterStoryStage :5596–:5657
 *   MASTER_STAGE_REQS 已抽在 data/masters-stories.js（lazy adopt）
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE。
 * lazy adopt：MASTER_STORIES/REQS 由 app 调 core.data.adoptMasters() 注入 D（M5 消费时）。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.masters = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var core = (typeof module !== 'undefined' && module.exports)
    ? { time: require('../core/time.js'), player: require('../core/player.js'), data: require('../core/data.js'), combat: require('./combat.js'), tiles: require('./tiles.js') }
    : (root.QX3D && root.QX3D.core) || {};
  var D = core.data ? core.data.D : (root.QX3D_DATA || {});

  function log(st, env, text) { (env && env.addLog || core.time.addLog)(st, text); }
  function toast(env, msg, tone) { if (env && env.showToast) env.showToast(msg, tone); }
  var tilesSys = (typeof module !== 'undefined' && module.exports)
    ? require('./tiles.js')
    : (root.QX3D && root.QX3D.systems && root.QX3D.systems.tiles) || {};
  function promote(st, env) { (env && env.checkRealmPromotion || tilesSys.checkRealmPromotion)(st, env); }

  /* 查名宿 */
  function findMaster(st, id) { return (st.masters || []).find(function (x) { return x.id === id; }); }

  /* 查名宿在本境（region 相同即可交互；tile 相同时加成） */
  function mastersAt(st, regionId) {
    return (st.masters || []).filter(function (m) { return m.region === regionId; });
  }

  /* ── 把酒论交（chatWithMaster :6119–:6146 逐式）──────────────────────────── */
  function chatWithMaster(st, masterId, env) {
    var m = findMaster(st, masterId);
    if (!m) return false;
    if (m.lastChatTurn === st.turn) {
      toast(env, `本旬已与【${m.name}】把酒叙旧过了！频繁打扰反失礼数，请待下旬再来。`, 'red');
      return false;
    }
    if (st.ap < 1) {
      toast(env, '把酒论交需消耗 1 点行脚精力！请先点击右上角【🧘 吐纳过旬】。', 'red');
      return false;
    }
    if (st.gold < 8) {
      toast(env, '囊中羞涩（不足 8 文酒钱），难以置办好酒款待名宿！', 'red');
      return false;
    }
    st.ap -= 1;
    st.gold -= 8;
    m.lastChatTurn = st.turn;
    m.affinity = Math.min(100, m.affinity + 12);
    st.fame += 4;
    st.exp += 10;
    log(st, env, `置酒款待【${m.name}】（耗1行脚、8文），把酒论剑，好感升至 ${m.affinity}，修为+10。`);
    toast(env, `与【${m.name}】对酌畅谈！好感 +12，修为 +10（每旬限1次）`, 'emerald');
    return true;
  }

  /* ── 请益授艺（learnFromMaster :6148–:6184 逐式）────────────────────────── */
  function learnFromMaster(st, masterId, env) {
    var m = findMaster(st, masterId);
    if (!m) return false;
    var art = D.MARTIAL_DB[m.teachArt];
    if (!art) return false;

    if (m.taughtOnce) {
      toast(env, `【${m.name}】已传授过你《${art.name}》入门心要！若欲精进，请通过【经脉构筑】消耗修为突破或完成其第三幕传记。`, 'amber');
      return false;
    }
    if (m.affinity < 55) {
      toast(env, `【${m.name}】微笑道：你我交情尚浅（需好感≥55，当前 ${m.affinity}），不妨先开启传记或把酒论交。`, 'red');
      return false;
    }
    if (st.ap < 2) {
      toast(env, '请益绝学需消耗 2 点行脚精力潜心受教！请先【吐纳过旬】。', 'red');
      return false;
    }
    if (st.exp < 40) {
      toast(env, '领悟名宿真传需消耗 40 点武学修为作根基（当前不足）！', 'red');
      return false;
    }

    st.ap -= 2;
    st.exp -= 40;
    m.taughtOnce = true;
    var curLv = st.learnedArts[art.id] || 0;
    st.learnedArts[art.id] = Math.min(10, curLv + 1);
    if (art.type === 'move' && !st.equippedMoves.includes(art.id) && st.equippedMoves.length < 4) {
      st.equippedMoves.push(art.id);
    }
    log(st, env, `耗 2 行脚与 40 修为蒙【${m.name}】亲授《${art.name}》心要（第 ${st.learnedArts[art.id]} 重）！`);
    toast(env, `习得真传：《${art.name}》第 ${st.learnedArts[art.id]} 重！`, 'emerald');
    return true;
  }

  /* ── 切磋论剑（duelMaster :6186–:6218 → duel 参数构造）──────────────────── */
  function duelMaster(st, masterId, env) {
    var m = findMaster(st, masterId);
    if (!m) return null;
    var cd = Math.max(0, 2 - (st.turn - (m.lastDuelTurn != null ? m.lastDuelTurn : -5)));
    if (cd > 0) {
      toast(env, `【${m.name}】刚与你切磋不久，尚需 ${cd} 旬调息方接受再战！`, 'red');
      return null;
    }
    if (st.ap < 1) {
      toast(env, '拔剑切磋需消耗 1 点行脚精力！请先【吐纳过旬】。', 'red');
      return null;
    }
    if (st.hp < 35) {
      toast(env, '你当前气血过低（不足35），强行与名宿过招恐有性命之忧！请先服药或饮酒。', 'red');
      return null;
    }

    st.ap -= 1;
    m.lastDuelTurn = st.turn;
    var params = {
      enemyName: m.name,
      enemyTitle: m.title,
      enemyAvatar: m.avatar || m.name[0],
      enemyStance: m.stance,
      enemyPower: m.power,
      enemyHp: m.hp,
      contextTitle: `与【${m.name}】三招切磋论剑`,
      rewardGold: 22,
      rewardFame: 15,
      rewardExp: 30,
      masterId: m.id
    };
    if (env && env.startDuel) env.startDuel(st, params);
    return params;
  }

  /* ── 三幕传记（resolveMasterStoryStage :5596–:5657 逐式）─────────────────── */
  /* 传记门槛表（MASTER_STAGE_REQS） */
  function getStoryReq(stage) {
    var reqs = D.MASTER_STAGE_REQS || [{ reqAffinity: 20, reqRealm: 0, apCost: 1 }, { reqAffinity: 50, reqRealm: 1, apCost: 1 }, { reqAffinity: 80, reqRealm: 2, apCost: 2 }];
    return reqs[Math.min(stage, reqs.length - 1)] || { reqAffinity: 0, reqRealm: 0, apCost: 1 };
  }

  function getStoryEntry(masterId, stage) {
    var stories = (D.MASTER_STORIES || {})[masterId] || [];
    return stories[stage] || null;
  }

  function resolveMasterStoryStage(st, masterId, stage, branch, env) {
    var m = findMaster(st, masterId);
    var entry = getStoryEntry(masterId, stage);
    if (!m || !entry) return null;

    var req = getStoryReq(stage);
    var apCost = req.apCost || 1;
    if (st.ap < apCost) {
      toast(env, `开启传记需 ${apCost} 点行脚精力（当前不足）！`, 'red');
      return null;
    }
    st.ap = Math.max(0, st.ap - apCost);
    m.lastStoryTurn = st.turn;

    /* Karma 分支偏移 */
    if (branch === 'A') {
      core.time.addKarma(st, { xiayi: 12, kuangao: 5, xiaoyao: 5 });
    } else {
      core.time.addKarma(st, { xiayi: 5, kuangao: 8, xiaoyao: 12 });
    }

    /* 第 2 幕 A 线有对决 → 构造 duel 参数 + masterStoryAdvance 回调 */
    if (stage === 1 && branch === 'A' && entry.duelEnemy) {
      var dp = {
        enemyName: entry.duelEnemy.name,
        enemyTitle: entry.duelEnemy.title,
        enemyAvatar: (entry.duelEnemy.name || '?')[0],
        enemyStance: entry.duelEnemy.stance,
        enemyPower: entry.duelEnemy.power,
        enemyHp: entry.duelEnemy.hp,
        contextTitle: `🍶 ${m.name}传记 · ${entry.title}`,
        rewardGold: 30,
        rewardFame: 18,
        rewardExp: 35,
        masterStoryAdvance: { masterId: masterId, nextStage: stage + 1 }
      };
      if (env && env.startDuel) env.startDuel(st, dp);
      return { duel: true, params: dp };
    }

    /* 常规步进 */
    m.storyStage = stage + 1;
    m.affinity = Math.min(100, m.affinity + 20);
    st.exp += 28;
    st.fame += 14;

    if (entry.rewardArt && D.MARTIAL_DB[entry.rewardArt]) {
      var artId = entry.rewardArt;
      st.learnedArts[artId] = Math.min(10, (st.learnedArts[artId] || 0) + 1);
      if (D.MARTIAL_DB[artId].type === 'move' && !st.equippedMoves.includes(artId) && st.equippedMoves.length < 4) {
        st.equippedMoves.push(artId);
      }
      if (masterId === 'duanyu') {
        st.learnedArts.lingbo_weibu = Math.min(10, (st.learnedArts.lingbo_weibu || 0) + 1);
      }
      if (masterId === 'huangyaoshi') {
        st.inventory.jinchuang_yao = (st.inventory.jinchuang_yao || 0) + 2;
      }
      log(st, env, `🌟【传记圆满】完成【${m.name}】三幕传记「${entry.title}」，结为生死知交，获传绝学《${D.MARTIAL_DB[artId].name}》！`);
      toast(env, `与【${m.name}】结为生死莫逆！习得真传《${D.MARTIAL_DB[artId].name}》！`, 'emerald');
    } else {
      st.maxHp += 8;
      st.hp = Math.min(st.maxHp, st.hp + 16);
      log(st, env, `🍶【名宿传记】推进【${m.name}】传记「${entry.title}」（第 ${stage + 1}/3 幕完成，好感升至 ${m.affinity}）。`);
      toast(env, `已完成【${m.name}】传记第 ${stage + 1}/3 幕！`, 'emerald');
    }

    promote(st, env);
    return { advanced: true, stage: stage + 1 };
  }

  return {
    findMaster: findMaster,
    mastersAt: mastersAt,
    chatWithMaster: chatWithMaster,
    learnFromMaster: learnFromMaster,
    duelMaster: duelMaster,
    getStoryReq: getStoryReq,
    getStoryEntry: getStoryEntry,
    resolveMasterStoryStage: resolveMasterStoryStage
  };
});
