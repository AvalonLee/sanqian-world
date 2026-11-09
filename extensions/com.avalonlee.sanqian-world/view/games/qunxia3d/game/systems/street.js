/* systems/street.js — P4-A 市井层（册300 · 纯逻辑 · 计划书铁律 1）
 * 迁移源 = view/games/qunxia/game.html :11159–:11897（P4-A 市井层，头注「岗位表驱动刷名、
 * 在场卡、抽屉、打听条」）。本件只留**逻辑**：刷名 / 选槽 / 在场 / 动作校验 / 打听三档 /
 * 动作效果表。DOM 演出在 ui/panels.js（在场行 + 市井浮层），装配在 app.js。
 *
 * 与原版的偏差（显式登记）：
 *   ① 岗位头像 art 由生成器占位化为空串（用户拍板，同 SIDE_CAST 先例）——UI 不渲染 <img>，
 *      改出「职名」朱砂小印；`art` 字段保留（正典 data URI 在 game.html 源，重跑可回填）。
 *   ② 原版街面独占监听（installStreetExclusiveWatcher / rumor-bar 条）不迁：3D 版的弹窗
 *      本就单实例（ui/panels.openSheet 队列长度 1），无「被事件弹窗截胡」这一面。
 *   ③ `noteStreetFavor` 原写 `state.streetFavor` 且首行 `ensureHallState()`（P4-F 立号）；
 *      本件只做计数（封顶 4、officer 除外），立号消费面随 P4-F。
 * 副作用纪律：只改传入的 st，不碰 DOM/THREE；保存与重渲由调用方（app.afterAction）负责。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.QX3D = root.QX3D || {};
    root.QX3D.systems = root.QX3D.systems || {};
    root.QX3D.systems.street = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../data/street.js')
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));

  var JOBS = D.STREET_JOBS || [];
  var JOB_BY_ID = {};
  JOBS.forEach(function (j) { JOB_BY_ID[j.id] = j; });
  var INTEL_LABEL = D.STREET_INTEL_LABEL || ['粗听', '略熟', '较准', '耳目'];
  var ZONE_BLUR = D.STREET_ZONE_BLUR || {};
  var SURNAMES = D.STREET_SURNAMES || ['周'];
  var GIVEN = D.STREET_GIVEN || {};
  var SCENE_RULES = D.STREET_SCENE_RULES || [];
  var TILE_BIND = D.STREET_TILE_BIND || {};

  /* ── 状态归一（原 ensureP4AStateDefaults 的市井段）────────────────────── */
  function ensureState(st, getRegion) {
    if (!st) return st;
    if (!st.streetSpawn || typeof st.streetSpawn !== 'object') st.streetSpawn = {};
    if (typeof st.intelTier !== 'number' || st.intelTier < 0) st.intelTier = 0;
    st.intelTier = Math.min(3, st.intelTier);
    if (st.playerKnownNode === undefined) st.playerKnownNode = null;
    if (st.rumorReliability === undefined) st.rumorReliability = null;
    if (!st.streetActTurn || typeof st.streetActTurn !== 'object') st.streetActTurn = {};
    if (!st.pendingRumor || !st.pendingRumor.text) st.pendingRumor = null;
    if (!st.streetFavor || typeof st.streetFavor !== 'object') st.streetFavor = {};
    if (!st.playerKnownNode && st.currentRegion) {
      var reg = getRegion ? getRegion(st.currentRegion) : null;
      st.playerKnownNode = {
        source: 'seen',
        regionId: st.currentRegion,
        tileIdx: st.currentTileIdx || 0,
        turn: st.turn || 1,
        blur: reg ? zoneBlur(reg.zone) : '附近'
      };
    }
    return st;
  }

  function zoneBlur(zoneId) { return ZONE_BLUR[zoneId] || '远方某处'; }

  function otherZoneBlur(zoneId, rand) {
    var r = rand || Math.random;
    var ids = Object.keys(ZONE_BLUR).filter(function (z) { return z !== zoneId; });
    return ZONE_BLUR[ids[Math.floor(r() * ids.length)]] || '另一路';
  }

  /* 原 streetHash（FNV-1a）：刷名 / 选特岗用，同区域同岗恒同名 */
  function streetHash(str) {
    var h = 2166136261;
    var s = String(str || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function jobOf(jobId) { return JOB_BY_ID[jobId] || null; }

  function matchStreetJob(tile) {
    if (!tile) return null;
    if (TILE_BIND[tile.id] && JOB_BY_ID[TILE_BIND[tile.id]]) return TILE_BIND[tile.id];
    for (var i = 0; i < SCENE_RULES.length; i++) {
      var rule = SCENE_RULES[i];
      if (rule.re && rule.re.test(tile.name || '')) return rule.jobId;
      if (rule.type && tile.type === rule.type) return rule.jobId;
    }
    return null;
  }

  /* 选槽（最多 3）：跑堂/乞丐保底，特岗按 region.id 散列取一，不足 2 补满 */
  function planStreetSlots(region) {
    if (!region) return [];
    var byJob = {};
    (region.tiles || []).forEach(function (tile, idx) {
      var jobId = matchStreetJob(tile);
      if (!jobId || byJob[jobId]) return;
      byJob[jobId] = { jobId: jobId, tileIdx: idx, tileId: tile.id };
    });
    var slots = [];
    function pushJob(jobId) {
      if (slots.length >= 3) return;
      var slot = byJob[jobId];
      if (!slot) return;
      if (slots.some(function (s) { return s.tileIdx === slot.tileIdx || s.jobId === jobId; })) return;
      slots.push(slot);
    }
    pushJob('waiter');
    pushJob('beggar');
    var specials = ['escort', 'apothecary', 'bookseller', 'officer'].filter(function (id) { return byJob[id]; });
    if (specials.length && slots.length < 3) pushJob(specials[streetHash(region.id) % specials.length]);
    if (slots.length < 2) Object.keys(byJob).forEach(pushJob);
    return slots.slice(0, 3);
  }

  function rollStreetName(regionId, jobId) {
    var h = streetHash(regionId + ':' + jobId);
    var sur = SURNAMES[h % SURNAMES.length];
    var pool = GIVEN[jobId] || GIVEN.waiter || ['小二'];
    return sur + pool[(h >>> 8) % pool.length];
  }

  /* 在场花名册（写 st.streetSpawn[region.id].names，跨旬稳定；同区域同岗恒同名） */
  function ensureCast(st, region) {
    if (!st || !region) return [];
    ensureState(st);
    if (!st.streetSpawn[region.id]) st.streetSpawn[region.id] = { names: {}, spawnedTurn: st.turn };
    var bucket = st.streetSpawn[region.id];
    if (!bucket.names) bucket.names = {};
    var slots = planStreetSlots(region);
    return slots.map(function (slot) {
      if (!bucket.names[slot.jobId]) {
        bucket.names[slot.jobId] = rollStreetName(region.id, slot.jobId);
        if (!bucket.spawnedTurn) bucket.spawnedTurn = st.turn;
      }
      var tile = (region.tiles || [])[slot.tileIdx];
      return {
        id: region.id + ':' + slot.jobId,
        jobId: slot.jobId,
        tileIdx: slot.tileIdx,
        tileId: slot.tileId,
        tileName: tile ? tile.name : region.name,
        regionId: region.id,
        regionName: region.name,
        name: bucket.names[slot.jobId]
      };
    });
  }

  /* 当前格在场者（最多 2）：只露脚下这一处，和原版同口径 */
  function npcsHere(st, region) {
    if (!st || !region) return [];
    return ensureCast(st, region).filter(function (n) { return n.tileIdx === st.currentTileIdx; }).slice(0, 2);
  }

  function findNpc(st, region, npcId) {
    var all = ensureCast(st, region);
    for (var i = 0; i < all.length; i++) if (all[i].id === npcId) return all[i];
    return null;
  }

  function actionKey(npc, actionId) { return npc.id + ':' + actionId; }

  /* 动作可用性（原 streetActionView）：同键冷却按 gap 旬、行脚、纹银三闸 */
  function actionView(st, npc, action) {
    var gap = action.gap || 1;
    var last = st.streetActTurn[actionKey(npc, action.id)];
    if (last != null && st.turn - last < gap) {
      return { disabled: true, why: gap > 1 ? '下一旬再托' : '本旬已做过' };
    }
    if (action.needAp && st.ap < action.needAp) return { disabled: true, why: '行脚不足' };
    if (action.needGold && st.gold < action.needGold) return { disabled: true, why: '纹银不足' };
    return { disabled: false, why: '' };
  }

  function markAct(st, npc, actionId) { st.streetActTurn[actionKey(npc, actionId)] = st.turn; }

  /* ── 打听三档（原 rollRumorGrade / composeStreetRumor）──────────────────── */
  function rollRumorGrade(st, npc, rand) {
    var r = rand || Math.random;
    var job = JOB_BY_ID[npc.jobId];
    var tier = Math.max(0, Math.min(3, st.intelTier || 0));
    var pRel = (job && job.id === 'waiter' ? 0.40 : 0.26) + tier * 0.12;
    if (st.streetActTurn[actionKey(npc, 'alms')] === st.turn) pRel += 0.15;
    pRel = Math.min(0.82, pRel);
    var pStale = 0.34;
    var x = r();
    if (x < pRel) return 'reliable';
    if (x < pRel + pStale) return 'stale';
    return 'conflict';
  }

  function gradeLabel(grade) {
    if (grade === 'stale') return '过时';
    if (grade === 'conflict') return '矛盾';
    return '可靠';
  }

  /* 打听：从「不在本境的 24 名宿」里选一位，按三档给方向（不指到具体城市） */
  function composeRumor(st, npc, env) {
    var e = env || {};
    var rand = e.rand || Math.random;
    var getReg = e.getRegion;
    var distant = (st.masters || []).filter(function (m) { return m && m.region && m.region !== st.currentRegion; });
    if (!distant.length) {
      return { grade: 'stale', text: '这几日远方没什么新动静，街面上只剩些过时闲话。', aboutId: null };
    }
    var master = distant[Math.floor(rand() * distant.length)];
    var trueReg = getReg ? getReg(master.region) : null;
    var trueBlur = zoneBlur(trueReg && trueReg.zone);
    var grade = rollRumorGrade(st, npc, rand);
    var known = st.playerKnownNode;
    var staleBlur = otherZoneBlur(trueReg && trueReg.zone, rand);
    if (known && known.source === 'rumor' && known.aboutId === master.id && known.regionId && known.regionId !== master.region) {
      grade = 'stale';
      staleBlur = known.blur || staleBlur;
    }
    var text = '';
    if (grade === 'reliable') {
      text = '据闻' + master.name + '近日仍在' + trueBlur + '走动，没人说准是哪一座城。';
      st.playerKnownNode = { source: 'rumor', regionId: master.region, aboutId: master.id, turn: st.turn, blur: trueBlur };
      st.intelTier = Math.min(3, (st.intelTier || 0) + 1);
    } else if (grade === 'stale') {
      text = '有人旬前提过' + master.name + '在' + staleBlur + '露过面，这话多半已经过时。';
    } else {
      var other = otherZoneBlur(trueReg && trueReg.zone, rand);
      var guard = 0;
      while (other === trueBlur && guard < 4) { other = otherZoneBlur(trueReg && trueReg.zone, rand); guard += 1; }
      text = '一说' + master.name + '往' + trueBlur + '，一说往' + other + '，两头对不上。';
    }
    return { grade: grade, text: text, aboutId: master.id };
  }

  /* 好感计数（原 noteStreetFavor；立号消费面随 P4-F） */
  function favorKey(npc) { return npc.regionId + ':' + npc.jobId + ':' + npc.name; }
  function noteFavor(st, npc) {
    if (!npc || npc.jobId === 'officer') return;
    ensureState(st);
    var key = favorKey(npc);
    st.streetFavor[key] = Math.min(4, (st.streetFavor[key] || 0) + 1);
  }

  function addKarma(st, delta) {
    if (!delta) return;
    st.karma.xiayi = Math.max(0, (st.karma.xiayi || 0) + (delta.xiayi || 0));
    st.karma.kuangao = Math.max(0, (st.karma.kuangao || 0) + (delta.kuangao || 0));
    st.karma.xiaoyao = Math.max(0, (st.karma.xiaoyao || 0) + (delta.xiaoyao || 0));
  }

  /* ── 动作效果表（原 STREET_ACTION_FN 逐条同值）───────────────────────────── */
  var ACTIONS = {
    inquire: function (st, npc, e) {
      markAct(st, npc, 'inquire');
      var rumor = composeRumor(st, npc, e);
      st.rumorReliability = rumor.grade;
      st.pendingRumor = rumor; /* 原 presentStreetRumor：悬着的那条风声随档 */
      var line = gradeLabel(rumor.grade) + '。' + rumor.text;
      return { log: line, toast: '打听有了回音：' + gradeLabel(rumor.grade), tone: rumor.grade === 'reliable' ? 'emerald' : 'amber', rumor: rumor };
    },
    tip: function (st, npc) {
      st.gold -= 3; markAct(st, npc, 'tip'); noteFavor(st, npc);
      return { log: '只扯了几句' + npc.tileName + '今天谁来喝酒，没提外城。', toast: '闲话停在这条街上。', tone: 'amber' };
    },
    soup: function (st, npc) {
      st.gold -= 2; st.hp = Math.min(st.maxHp, st.hp + 12); markAct(st, npc, 'soup'); noteFavor(st, npc);
      return { log: '讨了一碗热汤，气血稍回。', toast: '热汤下肚，气血 +12。', tone: 'emerald' };
    },
    escort: function (st, npc, e) {
      st.ap -= 1; st.gold += 22; st.exp += 12; st.fame += 4;
      addKarma(st, { xiayi: 2 }); markAct(st, npc, 'escort'); noteFavor(st, npc);
      if (e && e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      return { log: '护送一程顺利回来，路上有人探头，被一句话劝退，并未动手。', toast: '护送完成：纹银 +22，不看战力。', tone: 'emerald' };
    },
    escort_road: function (st, npc) {
      markAct(st, npc, 'escort_road');
      return { log: '镖路只说到本城城门为止，再远的他摇头。', toast: '镖路话说到城门口就停了。', tone: 'amber' };
    },
    escort_pass: function (st, npc) {
      st.gold -= 5; st.fame += 2; markAct(st, npc, 'escort_pass'); noteFavor(st, npc);
      return { log: '买下一角路引，只证明你从这座城过过。', toast: '路引入手，侠名 +2。', tone: 'emerald' };
    },
    heal: function (st, npc) {
      st.gold -= 8; st.hp = Math.min(st.maxHp, st.hp + 32); st.mp = Math.min(st.maxMp, st.mp + 8);
      markAct(st, npc, 'heal'); noteFavor(st, npc);
      return { log: '药徒把伤口包上，没问你打不打得过谁。', toast: '医伤完成：气血 +32，内息 +8。', tone: 'emerald' };
    },
    herb_lore: function (st, npc, e) {
      st.exp += 8; markAct(st, npc, 'herb_lore');
      if (e && e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      return { log: '听了一耳朵本草，没换到任何远方地址。', toast: '药性入耳，修为 +8。', tone: 'emerald' };
    },
    salve: function (st, npc) {
      st.gold -= 6; st.hp = Math.min(st.maxHp, st.hp + 14); markAct(st, npc, 'salve'); noteFavor(st, npc);
      return { log: '买了一包金创，当场撒上。', toast: '金创药止血，气血 +14。', tone: 'emerald' };
    },
    read_page: function (st, npc, e) {
      st.exp += 12; markAct(st, npc, 'read_page');
      if (e && e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      return { log: '残页上只有半句口诀，没有地图。', toast: '残页入目，修为 +12。', tone: 'emerald' };
    },
    book_talk: function (st, npc) {
      markAct(st, npc, 'book_talk');
      var scrollName = st.scrollProposition && st.scrollProposition.name;
      var line = scrollName
        ? '书商翻到和「' + scrollName + '」有关的半页，仍说不出人在哪。'
        : '书商把话停在书名上，不肯指一条路。';
      return { log: line, toast: '书路只停在纸上。', tone: 'amber' };
    },
    buy_chap: function (st, npc, e) {
      st.gold -= 8; st.exp += 6; markAct(st, npc, 'buy_chap');
      if (e && e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      return { log: '杂抄买下，里面没有外城坐标。', toast: '杂抄入手，修为 +6。', tone: 'emerald' };
    },
    report: function (st, npc) {
      st.gold += 6; st.fame += 2; markAct(st, npc, 'report');
      return { log: '你报了本街见闻，官差的簿子上没写下外城。', toast: '街情入簿：纹银 +6，侠名 +2。', tone: 'emerald' };
    },
    check_pass: function (st, npc) {
      markAct(st, npc, 'check_pass');
      var line = st.fame >= 20
        ? '官差看过你的名号，拱了拱手，没有动手。'
        : '官差把你的路引翻了一遍，叮嘱你少惹事，没有动手。';
      return { log: line, toast: '路引核对完，没有过招。', tone: 'amber' };
    },
    ask_wall: function (st, npc) {
      markAct(st, npc, 'ask_wall');
      var localBounty = (st.bounties || []).find(function (b) { return b.region === npc.regionId; });
      var line = localBounty
        ? '官差说本城海捕上有个「' + localBounty.name + '」，人还在这座城里，没说准哪一条街。'
        : '官差说这座城眼下没有新的海捕，外城的事他不接。';
      return { log: line, toast: '城防的话停在城墙里。', tone: 'amber' };
    },
    letter: function (st, npc) {
      st.ap -= 1; st.fame += 3; addKarma(st, { xiayi: 2 }); markAct(st, npc, 'letter');
      return { log: '信送出去了。乞丐只说送到了该到的地方，不肯指城。', toast: '传信已托出，不知落在哪一座城。', tone: 'emerald' };
    },
    alms: function (st, npc) {
      st.gold -= 2; st.fame += 1; addKarma(st, { xiayi: 3 }); markAct(st, npc, 'alms');
      return { log: '施了两文。他含糊说下一句风声会更清楚些。', toast: '乞丐记住了你，侠义心性 +3。', tone: 'emerald' };
    }
  };

  /* 动作派发：校验 → 执行 → 返回 {ok, log, toast, tone, rumor}；不存档不重渲 */
  function act(st, npc, actionId, env) {
    if (!st || !npc) return { ok: false, why: '人已经不在这一处了。' };
    var job = JOB_BY_ID[npc.jobId];
    var list = (job && job.actions) || [];
    var action = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === actionId) { action = list[i]; break; }
    if (!action) return { ok: false, why: '这会儿做不了。' };
    var view = actionView(st, npc, action);
    if (view.disabled) return { ok: false, why: view.why || '这会儿做不了。' };
    var fn = ACTIONS[actionId];
    if (!fn) return { ok: false, why: '这会儿做不了。' };
    var r = fn(st, npc, env || {}) || {};
    return {
      ok: true,
      log: '【市井·' + npc.tileName + '】' + npc.name + '：' + (r.log || ''),
      toast: r.toast || '',
      tone: r.tone || 'amber',
      rumor: r.rumor || null,
      grade: st.rumorReliability
    };
  }

  return {
    ensureState: ensureState,
    zoneBlur: zoneBlur,
    otherZoneBlur: otherZoneBlur,
    streetHash: streetHash,
    jobOf: jobOf,
    matchStreetJob: matchStreetJob,
    planStreetSlots: planStreetSlots,
    rollStreetName: rollStreetName,
    ensureCast: ensureCast,
    npcsHere: npcsHere,
    findNpc: findNpc,
    actionKey: actionKey,
    actionView: actionView,
    markAct: markAct,
    rollRumorGrade: rollRumorGrade,
    gradeLabel: gradeLabel,
    composeRumor: composeRumor,
    favorKey: favorKey,
    noteFavor: noteFavor,
    act: act,
    intelLabel: function (st) { return INTEL_LABEL[Math.max(0, Math.min(3, (st && st.intelTier) || 0))]; }
  };
});
