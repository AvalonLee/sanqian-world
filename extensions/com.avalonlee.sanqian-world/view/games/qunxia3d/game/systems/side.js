/* systems/side.js — P4-B 配角包（册303 · B1a 首刀 · 纯逻辑 · 计划书铁律 1）
 * 迁移源 = view/games/qunxia/game.html :11897–:13363（P4-B 段，34 人 / 73 动作）。
 * 本刀只落 **基础设施 + 前 3 人 9 动作**（ping4 平四 / xiaoer 酒肆小二 / zheng_e 郑萼）；
 * 其余 31 人按册302 分刀（B1b 4 人 → B2 8 人 → B3 19 人）逐刀接。
 *
 * 与原版的偏差（显式登记）：
 *   ① `sideAvatarHtml` 不迁：3D 版出「姓名印」不渲染 <img>（头像位留空，同 P4-A 拍板）。
 *   ② `presentStreetRumor` 改走 `st.pendingRumor`（3D 无 rumor-bar）。
 *   ③ `notePotentialRelic/grantRelic`（华山夜影的残片）未接：本刀 3 人不涉，随 B1b 一并。
 *   ④ `isRookiePeriod()` 的 spawn 减权：3D 版以 `st.turn <= 4` 等价（原 :?... 首四旬）。
 * 副作用纪律：只改传入 st；存档/重渲由 app 负责。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.QX3D = root.QX3D || {};
    root.QX3D.systems = root.QX3D.systems || {};
    root.QX3D.systems.side = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../data/side-cast.js')
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));
  var LIST = D.SIDE_CAST || [];
  var BY_ID = {};
  LIST.forEach(function (c) { BY_ID[c.id] = c; });

  /* 同 streetHash（FNV-1a）：两件各持一份避免循环依赖，S36 对表钉同值 */
  function hash(str) {
    var h = 2166136261, s = String(str || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var BOOLS = ['zhuangkeIntro', 'romanceEligible', 'romanceDebt', 'giftedScarf', 'escortDone', 'tangTurned',
    'muScroll', 'shaolinRegistered', 'shuangFollow', 'shuangSettled', 'shuangHeart', 'zhengErrand', 'xiaoerTab',
    'quTalk', 'yiEscort', 'yiCalm'];

  function ensureOutcome(st) {
    var host = st;
    if (!host.outcomeFlags || typeof host.outcomeFlags !== 'object') {
      host.outcomeFlags = { clawBroken: {}, rivalryOn: {}, feudSettled: {}, bountyCleared: {} };
    }
    ['clawBroken', 'rivalryOn', 'feudSettled', 'bountyCleared'].forEach(function (k) {
      if (!host.outcomeFlags[k] || typeof host.outcomeFlags[k] !== 'object') host.outcomeFlags[k] = {};
    });
    return host.outcomeFlags;
  }

  function ensureState(st) {
    if (!st) return st;
    if (!st.sidePresence || typeof st.sidePresence !== 'object') st.sidePresence = {};
    if (!st.sideScrollBias || typeof st.sideScrollBias !== 'object') st.sideScrollBias = {};
    if (!st.sideFlags || typeof st.sideFlags !== 'object') st.sideFlags = {};
    var f = st.sideFlags;
    if (!f.met) f.met = {};
    BOOLS.forEach(function (k) { if (typeof f[k] !== 'boolean') f[k] = false; });
    ensureOutcome(st);
    return st;
  }

  function flags(st) { ensureState(st); return st.sideFlags; }

  function addBias(st, tags) {
    ensureState(st);
    (tags || []).forEach(function (t) { st.sideScrollBias[t] = Math.min(4, (st.sideScrollBias[t] || 0) + 1); });
  }

  function markClawBroken(st, id) { if (!id) return; ensureOutcome(st).clawBroken[id] = true; addBias(st, ['chousha', 'bounty']); }
  function markRivalry(st, id) { var o = ensureOutcome(st); o.rivalryOn[id] = true; delete o.feudSettled[id]; addBias(st, ['chousha']); }
  function markFeudSettled(st, id) { var o = ensureOutcome(st); o.feudSettled[id] = true; delete o.rivalryOn[id]; addBias(st, ['chivalry']); }
  function markBountyCleared(st, id) { if (!id) return; ensureOutcome(st).bountyCleared[id] = true; addBias(st, ['court', 'chivalry']); }

  /* 卷轴权重（每命中一个标签乘 1+min(0.35, n*0.08)） */
  function scrollWeight(st, tags) {
    if (!st.sideScrollBias || !tags) return 1;
    var w = 1;
    tags.forEach(function (t) {
      var n = st.sideScrollBias[t] || 0;
      if (n > 0) w *= 1 + Math.min(0.35, n * 0.08);
    });
    return w;
  }

  /* 出场权重（linger=3 底 + 卷轴标签 + 专属旗标 + 新手期危险减权） */
  function spawnWeight(st, cast) {
    var w = cast.linger ? 3 : 1;
    (cast.scrollTags || []).forEach(function (t) { w += ((st.sideScrollBias && st.sideScrollBias[t]) || 0) * 0.4; });
    var f = st.sideFlags || {};
    if (cast.id === 'feng' && f.bullyIntel) w += 2;
    if (cast.id === 'laodenuo' && f.nightShadow) w += 1;
    if (cast.id === 'guofu' && (f.letter === 'delivered' || f.letter === 'late')) w += 2;
    if (cast.danger && (st.turn || 1) <= 4) w -= 2;
    return w;
  }

  /* 本旬在场（每旬每地界最多 2 人；同旬复用，换旬按权重 + 散列重排） */
  function ensurePresence(st, region) {
    ensureState(st);
    var key = st.turn + ':' + region.id;
    if (!st.sidePresence[key]) {
      var pool = LIST.filter(function (c) { return c.region === region.id && c.linger !== false; });
      var turn = st.turn || 1;
      var ranked = pool.slice().sort(function (a, b) {
        var dw = spawnWeight(st, b) - spawnWeight(st, a);
        if (dw) return dw;
        return ((hash(region.id + ':' + b.id) + turn) % 100) - ((hash(region.id + ':' + a.id) + turn) % 100);
      });
      st.sidePresence[key] = ranked.slice(0, 2).map(function (c) { return c.id; });
    }
    return (st.sidePresence[key] || []).map(function (id) { return BY_ID[id]; }).filter(Boolean).slice(0, 2);
  }

  function castHere(st, region) {
    return ensurePresence(st, region).filter(function (c) { return c.tileIdx === st.currentTileIdx; }).slice(0, 2);
  }

  function castOf(id) { return BY_ID[id] || null; }

  /* ── 动作清单（原 sideActList 的前 3 人；其余随刀接）─────────────────────── */
  function actsFor(st, cast) {
    if (!cast) return [];
    var f = flags(st);
    if (cast.id === 'ping4') {
      var carrying = f.letter === 'carrying';
      var done = f.letter === 'delivered' || f.letter === 'late';
      return [
        { id: 'ping_letter', label: carrying ? '信还在身上' : (done ? '家书已有着落' : '传信'), primary: !done, hint: done ? (f.letter === 'late' ? '晚到，庄上仍收了' : '已送到汉水庄上') : '不看战力 · 托往汉水庄上', disabled: carrying || done, why: carrying ? '先把信送到' : '' },
        { id: 'ping_intro', label: '引荐庄客', primary: done && !f.zhuangkeIntro, hint: f.zhuangkeIntro ? '庄客已认得你' : '送达之后才肯引荐', disabled: !done || f.zhuangkeIntro },
        { id: 'ping_chat', label: '闲话', hint: '只谈庄院门口' }
      ];
    }
    if (cast.id === 'zheng_e') {
      return [
        { id: 'zheng_sword', label: '请教剑形', primary: true, hint: '只讲这座山的剑' },
        { id: 'zheng_talk', label: '门派闲话', hint: '不提外城的人在哪' },
        { id: 'zheng_errand', label: '托事', hint: f.zhengErrand ? '这旬的杂务已接过' : '一件杂务', disabled: f.zhengErrand }
      ];
    }
    if (cast.id === 'xiaoer') {
      return [
        { id: 'xiao_ask', label: '打探', primary: true, hint: '少林有约，不指哪一殿' },
        { id: 'xiao_note', label: '传口信', hint: '只在这座城里传一句' },
        { id: 'xiao_noodle', label: '赊面', hint: f.xiaoerTab ? '这旬已赊过' : '先吃，账记着', disabled: !!f.xiaoerTab }
      ];
    }
    if (cast.id === 'laodenuo') {
      var shadow = f.nightShadow || '';
      return [
        { id: 'lao_accept', label: '接夜路差事', primary: !shadow, hint: shadow ? '这桩已接过' : '帖是空白的', disabled: !!shadow },
        { id: 'lao_tracks', label: '问脚印', hint: '只指这座山的夜路' },
        { id: 'lao_expose', label: '追问空白帖', primary: shadow === 'accepted', hint: shadow === 'accepted' ? '可以拆穿他' : '先接差事再说', disabled: shadow !== 'accepted' }
      ];
    }
    if (cast.id === 'cheng') {
      return [
        { id: 'cheng_escort', label: '绣帕护卫', primary: !f.escortDone, hint: f.escortDone ? '这场已完' : '不看拳脚 · 1 行脚', needAp: 1, disabled: !!f.escortDone },
        { id: 'cheng_banquet', label: '同席', hint: '话只停在这一席' },
        { id: 'cheng_scarf', label: '收绣帕', hint: f.giftedScarf ? '帕已收下' : '情债记下', disabled: !!f.giftedScarf }
      ];
    }
    if (cast.id === 'wangui') {
      return [
        { id: 'wang_duel', label: '比武', primary: !f.wangGrudge, hint: '三招，不看家世' },
        { id: 'wang_wine', label: '请和解酒', hint: st.gold < 4 ? '纹银不足' : '4 文', needGold: 4, disabled: st.gold < 4 },
        { id: 'wang_grudge', label: '谈这个梁子', hint: f.wangGrudge === 'grudge' ? '已结怨' : (f.wangGrudge === 'refused' ? '已拒过' : '可结可拒'), disabled: !!f.wangGrudge }
      ];
    }
    if (cast.id === 'zhike') {
      return [
        { id: 'monk_reg', label: '登记山门簿', primary: !f.shaolinRegistered, hint: (st.fame || 0) < 6 ? '侠名还浅' : '一视同仁', disabled: !!f.shaolinRegistered || (st.fame || 0) < 6 },
        { id: 'monk_intro', label: '请引见', hint: '只到这座山的演武处' },
        { id: 'monk_refuse', label: '问规矩', hint: '熟客也一样要登记' }
      ];
    }
    /* ── B2a（册305）：双儿 / 曲非烟 / 仪琳 ─────────────────────────────── */
    if (cast.id === 'shuang') {
      return [
        { id: 'shuang_follow', label: '同行', primary: !f.shuangFollow, hint: f.shuangFollow ? '她已答应同行' : '不争名分', disabled: !!f.shuangFollow },
        { id: 'shuang_settle', label: '安顿', hint: f.shuangSettled ? '已安顿' : '5 文，给她一处歇脚', disabled: !!f.shuangSettled || st.gold < 5, why: st.gold < 5 ? '纹银不足' : '' },
        { id: 'shuang_heart', label: '心事', hint: f.shuangHeart ? '心事听过了' : '情债，不成亲', disabled: !!f.shuangHeart }
      ];
    }
    if (cast.id === 'qu') {
      return [
        { id: 'qu_listen', label: '听曲得讯', primary: true, hint: '一句风声，不指人' },
        { id: 'qu_learn', label: '请教琴剑', hint: '只学一个意思' },
        { id: 'qu_chat', label: '情债闲话', hint: '记下，不成亲' }
      ];
    }
    if (cast.id === 'yilin') {
      return [
        { id: 'yi_escort', label: '护送', primary: !f.yiEscort, hint: f.yiEscort ? '这一程护过了' : '不看战力 · 耗 1 行脚', disabled: !!f.yiEscort || st.ap < 1, why: st.ap < 1 ? '行脚不足' : '' },
        { id: 'yi_heart', label: '请教心法', hint: '短短几句' },
        { id: 'yi_calm', label: '安抚', hint: f.yiCalm ? '她已经稳了' : '先把惊压下去', disabled: !!f.yiCalm }
      ];
    }
    return [];
  }

  /* 弹窗型动作（原 openSideModal 三支） */
  function choicesOf(st, cast, actionId) {
    if (actionId === 'cheng_escort') return ['护在身侧（情债记下，不成亲）', '绕开人群（仍把人送到）', '贴补车马（-4 文，情债记下）'];
    if (actionId === 'wang_grudge') return ['结下这个怨', '这事我拒了'];
    if (actionId === 'lao_expose') return ['拆穿他', '把假帖交回去（吃亏）', '先离开'];
    return null;
  }

  /* 动作效果：返回 { ok, log, toast, tone, choices? }；不存档不重渲 */
  function act(st, cast, actionId, choice, env) {
    if (!st || !cast) return { ok: false, why: '人已经不在这一处了。' };
    var f = flags(st);
    var e = env || {};
    var out = { ok: true, log: '', toast: '', tone: 'amber' };
    var L = function (s) { out.log = '【' + cast.name + '】' + s; };
    if (actionId === 'ping_letter') {
      f.letter = 'carrying'; f.letterTurn = st.turn;
      addBias(st, ['qingzhai', 'escort']);
      L('平四把家书交给你，只说送到汉水那一带的庄上。');
      out.toast = '家书在身上。沿汉水送去即可，不必问门牌。'; out.tone = 'emerald';
    } else if (actionId === 'ping_intro') {
      f.zhuangkeIntro = true; st.fame += 4;
      addBias(st, ['qingzhai', 'chivalry']);
      L('平四引荐了庄客。你被认下了，没有人告诉你院子的门朝哪。');
      out.toast = '庄客认下你了。后续的人，以后再说。'; out.tone = 'emerald';
    } else if (actionId === 'ping_chat') {
      L('平四只扯了两句庄院门口的闲话，远方的事一个字不给。');
      out.toast = '闲话停在庄院门口。';
    } else if (actionId === 'zheng_sword') {
      st.exp += 10; addBias(st, ['jianyi', 'sword']);
      if (e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      L('郑萼把剑形拆成三笔，只讲这座山上看过的路数。');
      out.toast = '剑形入眼，修为 +10。'; out.tone = 'emerald';
    } else if (actionId === 'zheng_talk') {
      L('郑萼说了门派里的杂务，没有提外城谁在哪。');
      out.toast = '门派闲话停在这座山上。';
    } else if (actionId === 'zheng_errand') {
      f.zhengErrand = true; st.fame += 2; addBias(st, ['jianyi']);
      L('你接了郑萼的一件杂务，人还在这座山上。');
      out.toast = '杂务接下了。'; out.tone = 'emerald';
    } else if (actionId === 'xiao_ask') {
      var rand = e.rand || Math.random;
      var grades = ['reliable', 'stale', 'conflict'];
      var grade = grades[Math.floor(rand() * grades.length)];
      var text = grade === 'conflict'
        ? '一说少林有约，一说只是过路客随口一提，两头对不上。'
        : (grade === 'stale' ? '旬前有人提过少林有约，这话多半旧了，也没说哪一殿。'
          : '昨夜确有客说少林有约。小二只听到这一句，不指哪一殿。');
      st.rumorReliability = grade;
      st.pendingRumor = { grade: grade, text: text, aboutId: 'xiaoer' };
      addBias(st, ['road']);
      L(text);
      out.toast = '打探有了回音：' + (grade === 'reliable' ? '可靠' : grade === 'stale' ? '过时' : '矛盾');
      out.tone = grade === 'reliable' ? 'emerald' : 'amber';
    } else if (actionId === 'xiao_note') {
      f.xiaoerNote = true;
      L('小二答应在这座城里传一句口信，外城他不去。');
      out.toast = '口信只在这座城里传。';
    } else if (actionId === 'xiao_noodle') {
      f.xiaoerTab = true; st.hp = Math.min(st.maxHp, st.hp + 10);
      L('你在洛阳酒肆赊了一碗面，账记在小二那里。');
      out.toast = '面下肚了，账记着。气血 +10。'; out.tone = 'emerald';
    } else if (actionId === 'cheng_escort') {
      if (st.ap < 1 || f.escortDone) return { ok: false, why: st.ap < 1 ? '行脚不足' : '这场护卫已完' };
      if (choice == null) return { ok: true, choices: choicesOf(st, cast, actionId), log: '', toast: '' };
      st.ap -= 1;
      if (choice === 0) { f.escortDone = true; f.romanceEligible = true; f.romanceDebt = true; st.fame += 5; addKarma(st, { xiayi: 3 }); addBias(st, ['romance', 'qingzhai']); }
      else if (choice === 1) { f.escortDone = true; f.romanceDebt = true; addBias(st, ['romance']); }
      else { st.gold = Math.max(0, st.gold - 4); f.escortDone = true; f.romanceEligible = true; f.romanceDebt = true; addBias(st, ['romance', 'qingzhai']); }
      L('你护完这一程。情债记下了，没有人逼你成亲。');
      out.toast = '护卫完成。'; out.tone = 'emerald';
    } else if (actionId === 'cheng_banquet') {
      st.fame += 2; addBias(st, ['romance']);
      L('你与程瑶迦同席，话只停在这一席。');
      out.toast = '同席结束，没有外城的消息。';
    } else if (actionId === 'cheng_scarf') {
      f.giftedScarf = true; f.romanceDebt = true; addBias(st, ['romance', 'qingzhai']);
      L('你收下绣帕。情债记下了，不成亲。');
      out.toast = '帕留下了。情债旗在，没有成亲。'; out.tone = 'emerald';
    } else if (actionId === 'lao_accept') {
      f.nightShadow = 'accepted'; addBias(st, ['chousha', 'jianyi']);
      L('【华山夜影】你接了劳德诺的夜路差事。他要你去看脚印，帖却是空白的。');
      out.toast = '假任务接了。脚印在这座山的夜路上。';
    } else if (actionId === 'lao_tracks') {
      L('劳德诺说脚印就在这座山的夜路上，不提别的城。');
      out.toast = '他只指这座山。';
    } else if (actionId === 'lao_expose') {
      if (choice == null) return { ok: true, choices: choicesOf(st, cast, actionId), log: '', toast: '' };
      if (choice === 0) {
        f.nightShadow = 'exposed'; f.linghuEcho = 'warm'; st.fame += 4; addBias(st, ['chousha', 'jianyi']);
        var t1 = '华山那位剑客听说夜路的假帖被拆穿了，风声暖了半分，人却不在这条路上。';
        L('【华山夜影】' + t1);
        st.pendingRumor = { grade: 'reliable', text: t1, aboutId: 'laodenuo' };
        out.toast = '拆穿了。风声记在华山剑客那边。'; out.tone = 'emerald';
      } else if (choice === 1) {
        f.nightShadow = 'burned'; f.linghuEcho = 'cold'; st.gold = Math.max(0, st.gold - 6); addBias(st, ['chousha', 'jianyi']);
        var t2 = '有人说华山那位剑客对夜路的事皱了眉。风声冷了半截，没说他在哪一处崖。';
        L('【华山夜影】' + t2);
        st.pendingRumor = { grade: 'stale', text: t2, aboutId: 'laodenuo' };
        out.toast = '你吃了这个亏。风声冷了。';
      } else {
        L('你先离开了夜路。');
        out.toast = '你先离开了夜路。';
      }
    } else if (actionId === 'wang_duel') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '万圭', enemyTitle: '万公子 · 嘴硬比武', enemyStance: 'qiao',
        enemyPower: 62, enemyHp: 120, contextTitle: '庄园外厅 · 与万圭切磋',
        rewardGold: 8, rewardFame: 4, rewardExp: 16, sideCastResult: { kind: 'wang' }
      });
      return { ok: true, log: '', toast: '比武开始。', tone: 'amber' };
    } else if (actionId === 'wang_wine') {
      if (st.gold < 4) return { ok: false, why: '纹银不足' };
      st.gold -= 4; f.wangGrudge = 'peace'; addBias(st, ['sword']);
      L('你请万圭喝了解酒，嘴硬按下去一寸。');
      out.toast = '和解酒喝过了。'; out.tone = 'emerald';
    } else if (actionId === 'wang_grudge') {
      if (!f.wangGrudge && choice == null) return { ok: true, choices: choicesOf(st, cast, actionId), log: '', toast: '' };
      if (choice === 0) {
        f.wangGrudge = 'grudge'; addBias(st, ['revenge']);
        L('你和万圭结下了怨。账记下了，人还在这座庄园。');
        out.toast = '怨记下了。';
      } else {
        f.wangGrudge = 'refused';
        L('你拒绝和万圭结怨。他嘴硬，却没再逼。');
        out.toast = '你拒了这门怨。'; out.tone = 'emerald';
      }
    } else if (actionId === 'monk_reg') {
      if ((st.fame || 0) < 6) return { ok: false, why: '侠名还浅，山门这旬不留宿。' };
      f.shaolinRegistered = true; addBias(st, ['righteous']);
      L('少林知客把你的名字登进山门簿，过客一视同仁。');
      out.toast = '登记好了。'; out.tone = 'emerald';
    } else if (actionId === 'monk_intro') {
      L('知客引你去这座山的演武处，没有提别的山。');
      out.toast = '引见只到这座山上。';
    } else if (actionId === 'monk_refuse') {
      var why = (st.fame || 0) < 6 ? '侠名还浅，山门这旬不留宿。' : '规矩在，熟客也一样要登记。';
      L('知客说：' + why);
      out.toast = why;
    } else if (actionId === 'shuang_follow') {
      f.shuangFollow = true; addBias(st, ['romance']);
      L('双儿答应同行。她不问名分，只问下一处歇脚。');
      out.toast = '她答应同行了。'; out.tone = 'emerald';
    } else if (actionId === 'shuang_settle') {
      if (st.gold < 5) return { ok: false, why: '纹银不足' };
      st.gold -= 5; f.shuangSettled = true; addBias(st, ['qingzhai']);
      L('你安顿了双儿。她问去处，不问名分。');
      out.toast = '安顿好了。'; out.tone = 'emerald';
    } else if (actionId === 'shuang_heart') {
      f.shuangHeart = true; f.romanceDebt = true; addBias(st, ['romance', 'qingzhai']);
      L('双儿说了一句心事。情债记下了，不成亲。');
      out.toast = '心事听过了。情债在，不成亲。'; out.tone = 'emerald';
    } else if (actionId === 'qu_listen') {
      var qtext = '曲声里有一句讯：北地风紧，人却没被点出名字，也没有落在哪一城。';
      st.pendingRumor = { grade: 'stale', text: qtext, aboutId: 'qu' };
      addBias(st, ['romance']);
      L('【听曲】' + qtext);
      out.toast = '曲子听完，只有一片风。';
    } else if (actionId === 'qu_learn') {
      st.exp += 8; addBias(st, ['jianyi']);
      if (e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      L('曲非烟教了你一个琴剑的意思。');
      out.toast = '琴剑入心，修为 +8。'; out.tone = 'emerald';
    } else if (actionId === 'qu_chat') {
      f.quTalk = true; f.romanceDebt = true; addBias(st, ['romance', 'qingzhai']);
      L('曲非烟说了句情债闲话。记下了，不成亲。');
      out.toast = '闲话记下了。不成亲。'; out.tone = 'emerald';
    } else if (actionId === 'yi_escort') {
      if (st.ap < 1 || f.yiEscort) return { ok: false, why: st.ap < 1 ? '行脚不足' : '这一程护过了' };
      st.ap -= 1; f.yiEscort = true; st.fame += 3; addKarma(st, { xiayi: 2 }); addBias(st, ['chivalry']);
      L('你护送仪琳走完这一程。不看拳脚。');
      out.toast = '护送完成。'; out.tone = 'emerald';
    } else if (actionId === 'yi_heart') {
      st.exp += 8; addBias(st, ['chivalry']);
      if (e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      L('仪琳把心法说了短短几句。');
      out.toast = '心法入耳，修为 +8。'; out.tone = 'emerald';
    } else if (actionId === 'yi_calm') {
      f.yiCalm = true; addKarma(st, { xiayi: 2 });
      L('你安抚了仪琳。她还想学剑。');
      out.toast = '她稳下来了。'; out.tone = 'emerald';
    } else {
      return { ok: false, why: '这支还没接（B2/B3）' };
    }
    return out;
  }

  function addKarma(st, delta) {
    if (!delta) return;
    st.karma.xiayi = Math.max(0, (st.karma.xiayi || 0) + (delta.xiayi || 0));
    st.karma.kuangao = Math.max(0, (st.karma.kuangao || 0) + (delta.kuangao || 0));
    st.karma.xiaoyao = Math.max(0, (st.karma.xiaoyao || 0) + (delta.xiaoyao || 0));
  }

  return {
    list: LIST,
    castOf: castOf,
    ensureState: ensureState,
    ensureOutcome: ensureOutcome,
    flags: flags,
    addBias: addBias,
    markClawBroken: markClawBroken,
    markRivalry: markRivalry,
    markFeudSettled: markFeudSettled,
    markBountyCleared: markBountyCleared,
    scrollWeight: scrollWeight,
    spawnWeight: spawnWeight,
    ensurePresence: ensurePresence,
    castHere: castHere,
    actsFor: actsFor,
    choicesOf: choicesOf,
    act: act,
    hash: hash
  };
});
