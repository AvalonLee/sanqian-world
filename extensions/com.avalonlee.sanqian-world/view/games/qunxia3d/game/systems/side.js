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
    'quTalk', 'yiEscort', 'yiCalm', 'yueHeart', 'hebiFake', 'yarenHired', 'yelvTalk', 'yelvYan'];

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

  /* 册307：对决结果回流（combat.finishDuel → env.onSideDuelResult → 此处）
   * kind = sideCastResult.kind（mu / tian-repel / tian-recruit / feng / wang） */
  function applyDuelResult(st, kind, victory) {
    if (!st || !kind) return;
    var f = flags(st);
    if (kind === 'mu') {
      f.mu = victory ? 'down' : 'slipped';
      if (victory) markClawBroken(st, 'mu');
    } else if (kind === 'tian-repel') {
      f.tian = victory ? 'repelled' : 'parley';
    } else if (kind === 'tian-recruit') {
      f.tian = victory ? 'recruited' : 'repelled';
    } else if (kind === 'feng') {
      f.fengBounty = victory ? 'cleared' : 'failed';
      if (victory) markBountyCleared(st, 'feng');
    } else if (kind === 'wang') {
      f.wangGrudge = victory ? 'beaten' : (f.wangGrudge || 'grudge');
    } else if (kind === 'eyu') {
      f.eyu = victory ? 'down' : 'talked';
      if (victory) markClawBroken(st, 'eyu');
    } else if (kind === 'yun') {
      f.yun = victory ? 'down' : 'faced';
      if (victory) markBountyCleared(st, 'yun');
    } else if (kind === 'hebi') {
      f.hebi = victory ? 'down' : 'checked';
    } else if (kind === 'guofu') {
      f.guofu = victory ? 'beaten' : (f.guofu || 'met');
    } else if (kind === 'yelv') {
      f.yelv = victory ? 'beaten' : (f.yelv || 'met');
    }
  }

  /* 残片/信物（册307：night_rub 等；原 grantRelic → relicCarry，state.drawScrollProposition 消费） */
  function grantRelic(st, id) {
    if (!st || !id) return;
    if (!Array.isArray(st.relicCarry)) st.relicCarry = [];
    if (st.relicCarry.indexOf(id) < 0) st.relicCarry.push(id);
    if (!st.carryRelic) st.carryRelic = id;
  }
  function noteRelic(st, source, id) {
    if (!st) return;
    if (!st.relicHint || typeof st.relicHint !== 'object') st.relicHint = {};
    st.relicHint[id] = source;
  }

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
    /* ── B2b（册306）：恶霸链 / 野路 / 水路 ─────────────────────────────── */
    if (cast.id === 'feng') {
      return [
        { id: 'feng_face', label: '对峙', primary: true, hint: '话先说完，进弹窗' },
        { id: 'feng_bounty', label: '接悬赏线', hint: f.bullyIntel ? (f.fengBounty === 'cleared' ? '海捕已销' : '换皮一战') : '先有县里的风声', disabled: !f.bullyIntel || f.fengBounty === 'cleared' },
        { id: 'feng_avoid', label: '回避', hint: f.fengConfront === 'avoid' ? '你已避开' : '这事可以不接', disabled: f.fengConfront === 'avoid' }
      ];
    }
    if (cast.id === 'tang') {
      return [
        { id: 'tang_buy', label: '买情报', primary: true, hint: f.bullyIntel ? '这旬的风声买过了' : '6 文 · 不画地图', disabled: !!f.bullyIntel || st.gold < 6, why: st.gold < 6 ? '纹银不足' : '' },
        { id: 'tang_turn', label: '策反', hint: f.tangTurned ? '他已松口' : '让他把话倒过来', disabled: !!f.tangTurned },
        { id: 'tang_dismiss', label: '打发', hint: '2 文，让他走开', disabled: st.gold < 2, why: st.gold < 2 ? '纹银不足' : '' }
      ];
    }
    if (cast.id === 'tian') {
      return [
        { id: 'tian_talk', label: '周旋', primary: !f.tian, hint: '先把笑和杀机分开' },
        { id: 'tian_repel', label: '击退', hint: f.tian === 'repelled' || f.tian === 'recruited' ? '已分出胜负' : '三招见真章', disabled: f.tian === 'repelled' || f.tian === 'recruited' },
        { id: 'tian_recruit', label: '收服', hint: f.tian === 'recruited' ? '他肯跟一句' : '高难', disabled: f.tian === 'recruited' }
      ];
    }
    if (cast.id === 'mu') {
      return [
        { id: 'mu_duel', label: '悬赏对决', primary: f.mu !== 'down', hint: f.mu === 'down' ? '海捕已了' : '换皮一战', disabled: f.mu === 'down' },
        { id: 'mu_scroll', label: '夺残谱', hint: f.muScroll ? '残谱已入手' : (f.mu === 'down' ? '他倒了，谱还在' : '他还盯着'), disabled: !!f.muScroll || f.mu !== 'down' },
        { id: 'mu_avoid', label: '回避', hint: f.mu === 'slipped' ? '你已避开' : '可以不打', disabled: f.mu === 'slipped' || f.mu === 'down' }
      ];
    }
    if (cast.id === 'lu') {
      return [
        { id: 'lu_bully', label: '委托除霸', primary: true, hint: '只给一片地方' },
        { id: 'lu_intro', label: '引荐', hint: '认一认这船上的人' },
        { id: 'lu_stay', label: '借宿', hint: f.luStay === st.turn ? '这旬已歇过' : '在舟上歇一晚', disabled: f.luStay === st.turn }
      ];
    }
    /* ── B3a（册308）：岳灵珊 / 朱子柳 / 南海鳄神 / 云中鹤 ───────────────── */
    if (cast.id === 'yue') {
      return [
        { id: 'yue_duel', label: '切磋', primary: true, hint: '比剑认真' },
        { id: 'yue_talk', label: '门派闲话', hint: '只谈这座山' },
        { id: 'yue_heart', label: '心事', hint: f.yueHeart ? '心事听过了' : '另说，不夹在剑里', disabled: !!f.yueHeart }
      ];
    }
    if (cast.id === 'zhuli') {
      return [
        { id: 'zhu_edict', label: '译诏令', primary: true, hint: '把官话译成一句' },
        { id: 'zhu_heal', label: '医伤引荐', hint: '不看战力' },
        { id: 'zhu_dali', label: '谈大理', hint: '只谈眼前这一程' }
      ];
    }
    if (cast.id === 'eyu') {
      return [
        { id: 'eyu_talk', label: '讲理', primary: true, hint: '他偶尔肯听' },
        { id: 'eyu_fight', label: '开战', hint: '换皮一战' },
        { id: 'eyu_slip', label: '绕路', hint: f.eyu === 'slipped' ? '你已绕开' : '可以不打', disabled: f.eyu === 'slipped' || f.eyu === 'down' }
      ];
    }
    if (cast.id === 'yun') {
      return [
        { id: 'yun_face', label: '对峙', primary: true, hint: '话先说完' },
        { id: 'yun_hunt', label: '接赏追杀', hint: '官面通缉，换皮一战' },
        { id: 'yun_flee', label: '逃离', hint: f.yun === 'fled' ? '你已离开' : '可以逃', disabled: f.yun === 'fled' || f.yun === 'down' }
      ];
    }
    /* ── B3b（册309）：行营 / 武当 / 牙行 / 襄阳 / 北地 ─────────────────── */
    if (cast.id === 'hebi') {
      return [
        { id: 'he_check', label: '盘查', primary: true, hint: '看你在不在名册' },
        { id: 'he_fake', label: '假任务', hint: f.hebiFake ? '假差事接过了' : '文人皮底下的差事', disabled: !!f.hebiFake },
        { id: 'he_force', label: '硬闯', hint: '不必接他的差' }
      ];
    }
    if (cast.id === 'yin') {
      return [
        { id: 'yin_sword', label: '请教剑形', primary: true, hint: '武当这一路' },
        { id: 'yin_tea', label: '茶叙', hint: f.yinTea === st.turn ? '这旬茶已喝过' : '礼数一盏', disabled: f.yinTea === st.turn },
        { id: 'yin_daily', label: '门派日常', hint: '晨课与药园，不提外城' }
      ];
    }
    if (cast.id === 'yaren') {
      return [
        { id: 'ya_buy', label: '买情报', primary: true, hint: '8 文 · 只到某州某路', disabled: st.gold < 8, why: '纹银不足' },
        { id: 'ya_wash', label: '洗通缉线索', hint: '指你去官差，不标格子' },
        { id: 'ya_hire', label: '雇人', hint: f.yarenHired ? '这旬已雇过' : '6 文', disabled: !!f.yarenHired || st.gold < 6, why: st.gold < 6 ? '纹银不足' : '' }
      ];
    }
    if (cast.id === 'guofu') {
      var letterDone = f.letter === 'delivered' || f.letter === 'late' || f.zhuangkeIntro;
      var rivalry = !!(st.outcomeFlags && st.outcomeFlags.rivalryOn && st.outcomeFlags.rivalryOn.guofu);
      if (letterDone) {
        return [
          { id: 'guo_feud', label: '结怨', primary: !rivalry, hint: '家书送到后的嘴快' },
          { id: 'guo_peace', label: '和解', primary: rivalry, hint: '把梁子按下' },
          { id: 'guo_chat', label: '闲话', hint: '只谈这座城' }
        ];
      }
      return [
        { id: 'guo_duel', label: '切磋', primary: true, hint: '点到为止' },
        { id: 'guo_feud', label: '结怨', hint: '可记下仇' },
        { id: 'guo_peace', label: '和解', hint: '把话圆回去' }
      ];
    }
    if (cast.id === 'yelv') {
      return [
        { id: 'yelv_border', label: '边报议事', primary: true, hint: '动一动边谊' },
        { id: 'yelv_duel', label: '比武', hint: '点到为止' },
        { id: 'yelv_yan', label: '谈燕云', hint: '只谈风紧不紧' }
      ];
    }
    return [];
  }

  /* 弹窗型动作（原 openSideModal 三支） */
  function choicesOf(st, cast, actionId) {
    if (actionId === 'cheng_escort') return ['护在身侧（情债记下，不成亲）', '绕开人群（仍把人送到）', '贴补车马（-4 文，情债记下）'];
    if (actionId === 'wang_grudge') return ['结下这个怨', '这事我拒了'];
    if (actionId === 'lao_expose') return ['拆穿他', '把假帖交回去（吃亏）', '先离开'];
    if (actionId === 'feng_face') return ['硬顶一句', '先退开'];
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
        noteRelic(st, '华山夜影', 'night_rub');
        grantRelic(st, 'night_rub');
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
    } else if (actionId === 'feng_face') {
      if (choice == null) return { ok: true, choices: choicesOf(st, cast, actionId), log: '', toast: '' };
      if (choice === 0) {
        f.fengConfront = 'stood'; addBias(st, ['chousha', 'court']);
        L('【恶霸链】你和凤天南对峙过了。账记下了，没有动手。');
        out.toast = '对峙记下了。';
      } else { f.fengConfront = 'later'; L('你先退开了。'); out.toast = '你先退开了。'; }
    } else if (actionId === 'feng_bounty') {
      if (!f.bullyIntel) return { ok: false, why: '还没有县里的风声。' };
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '凤天南', enemyTitle: '县衙外 · 海捕换皮', enemyStance: 'gang',
        enemyPower: 70, enemyHp: 140, contextTitle: '恶霸链 · 凤天南海捕',
        rewardGold: 26, rewardFame: 10, rewardExp: 18, sideCastResult: { kind: 'feng' }
      });
      return { ok: true, log: '', toast: '海捕换皮，一场恶战。', tone: 'amber' };
    } else if (actionId === 'feng_avoid') {
      f.fengConfront = 'avoid'; L('你避开了凤天南。这事可以不接。');
      out.toast = '你避开了。';
    } else if (actionId === 'tang_buy') {
      if (st.gold < 6 || f.bullyIntel) return { ok: false, why: st.gold < 6 ? '纹银不足' : '这旬的风声买过了' };
      st.gold -= 6;
      var tgrades = ['reliable', 'stale', 'conflict'];
      var tgrade = tgrades[Math.floor((e.rand || Math.random)() * 3)];
      f.bullyIntel = tgrade;
      var ttext = tgrade === 'conflict' ? '一说县衙外有个姓凤的拳硬，一说只是帮闲嚼舌，两头对不上。'
        : (tgrade === 'stale' ? '旬前县里有个姓凤的很霸，这话多半旧了，人也没标在哪一条街。'
          : '县衙外有个姓凤的，拳硬。人就在这座城里，没有第几条街。');
      st.rumorReliability = tgrade;
      st.pendingRumor = { grade: tgrade, text: ttext, aboutId: 'tangpei' };
      addBias(st, ['chousha', 'court']);
      L('【恶霸链】' + ttext);
      out.toast = '情报买下了：' + (tgrade === 'reliable' ? '可靠' : tgrade === 'stale' ? '过时' : '矛盾');
    } else if (actionId === 'tang_turn') {
      f.tangTurned = true; addBias(st, ['court']);
      L('汤沛松了口，愿把话倒过来说。他还是不画地图。');
      out.toast = '他松口了，仍不画地图。'; out.tone = 'emerald';
    } else if (actionId === 'tang_dismiss') {
      if (st.gold < 2) return { ok: false, why: '纹银不足' };
      st.gold -= 2; L('你打发了汤沛。他碎嘴，拿了钱就走。');
      out.toast = '打发了。';
    } else if (actionId === 'tian_talk') {
      if (!f.tian) f.tian = 'parley';
      addBias(st, ['sword']);
      L('你和田伯光周旋了一阵。笑还在，杀机也还在。');
      out.toast = '周旋过了，账还没结。';
    } else if (actionId === 'tian_repel') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '田伯光', enemyTitle: '野路 · 半笑半杀', enemyStance: 'qiao',
        enemyPower: 74, enemyHp: 145, contextTitle: '野路遭遇 · 击退田伯光',
        rewardGold: 16, rewardFame: 8, rewardExp: 18, sideCastResult: { kind: 'tian-repel' }
      });
      return { ok: true, log: '', toast: '野路上动起手来。', tone: 'amber' };
    } else if (actionId === 'tian_recruit') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '田伯光', enemyTitle: '野路 · 收服高难', enemyStance: 'qiao',
        enemyPower: 96, enemyHp: 180, contextTitle: '野路遭遇 · 收服田伯光',
        rewardGold: 20, rewardFame: 12, rewardExp: 24, sideCastResult: { kind: 'tian-recruit' }
      });
      return { ok: true, log: '', toast: '收服要比击退更难。', tone: 'amber' };
    } else if (actionId === 'mu_duel') {
      if (f.mu === 'down') return { ok: false, why: '海捕已了' };
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '木高峰', enemyTitle: '陕南山道 · 海捕换皮', enemyStance: 'rou',
        enemyPower: 68, enemyHp: 136, contextTitle: '野路遭遇 · 木高峰悬赏',
        rewardGold: 24, rewardFame: 10, rewardExp: 18, sideCastResult: { kind: 'mu' }
      });
      return { ok: true, log: '', toast: '山道上一场硬仗。', tone: 'amber' };
    } else if (actionId === 'mu_scroll') {
      if (f.mu !== 'down' || f.muScroll) return { ok: false, why: '还不到时候。' };
      f.muScroll = true; st.exp += 14; addBias(st, ['bounty', 'chousha']);
      if (e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      L('木高峰倒了之后，你从他身上摸到半页残谱。没有地名。');
      out.toast = '残谱入手，修为 +14。'; out.tone = 'emerald';
    } else if (actionId === 'mu_avoid') {
      f.mu = 'slipped'; L('你避开了木高峰。野路上这一遭可以不打。');
      out.toast = '你避开了。';
    } else if (actionId === 'lu_bully') {
      addBias(st, ['chivalry', 'bounty']);
      var ltext = '陆乘风说南方水路和县衙外都有恶名，只到某路，没有第几座渡口。';
      st.pendingRumor = { grade: 'reliable', text: ltext, aboutId: 'lu' };
      L('【委托】' + ltext);
      out.toast = '除霸的委托接下了。地方仍是模糊的。'; out.tone = 'emerald';
    } else if (actionId === 'lu_intro') {
      st.fame += 3; addBias(st, ['chivalry']);
      L('陆乘风引荐了舟上的人。没有外城的坐标。');
      out.toast = '引荐完了。'; out.tone = 'emerald';
    } else if (actionId === 'lu_stay') {
      if (f.luStay === st.turn) return { ok: false, why: '这旬已歇过' };
      f.luStay = st.turn; st.hp = Math.min(st.maxHp, st.hp + 12);
      L('你在陆乘风的舟上借宿了一晚。');
      out.toast = '借宿一夜，气血 +12。'; out.tone = 'emerald';
    } else if (actionId === 'yue_duel') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '岳灵珊', enemyTitle: '华山 · 比剑', enemyStance: 'qiao',
        enemyPower: 48, enemyHp: 100, contextTitle: '华山门下 · 与岳灵珊切磋',
        rewardGold: 4, rewardFame: 3, rewardExp: 12, sideCastResult: { kind: 'yue' }
      });
      return { ok: true, log: '', toast: '比剑开始。', tone: 'amber' };
    } else if (actionId === 'yue_talk') {
      L('岳灵珊说了这座山的门派闲话，没有提外城。');
      out.toast = '闲话停在这座山上。';
    } else if (actionId === 'yue_heart') {
      f.yueHeart = true; addBias(st, ['qingzhai']);
      L('岳灵珊另说了一句心事。不成亲。');
      out.toast = '心事听过了。'; out.tone = 'emerald';
    } else if (actionId === 'zhu_edict') {
      var courtOpen = !!(st.court && (st.court.rumors || []).some(function (r) { return r.id === 'edict'; }));
      addBias(st, ['court']);
      var ztext = courtOpen ? '朱子柳把诏令译成一句：应则功名，拒则通缉。没有人名和格子。' : '眼下没有未决诏令。朱先生只说大理的规矩在纸上。';
      L('【译诏】' + ztext);
      out.toast = ztext;
    } else if (actionId === 'zhu_heal') {
      st.hp = Math.min(st.maxHp, st.hp + 16);
      L('朱子柳引你看了伤。不看战力。');
      out.toast = '伤势缓了，气血 +16。'; out.tone = 'emerald';
    } else if (actionId === 'zhu_dali') {
      L('朱子柳谈了大理这一程的规矩，不指别人的行踪。');
      out.toast = '大理的话停在这一程。';
    } else if (actionId === 'eyu_talk') {
      f.eyu = f.eyu || 'talked'; addBias(st, ['chivalry']);
      L('南海鳄神讲了一句理。凶名还在南方水路，没有渡口编号。');
      out.toast = '他肯讲这一句。';
    } else if (actionId === 'eyu_fight') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '南海鳄神', enemyTitle: '南方水路 · 凶名', enemyStance: 'gang',
        enemyPower: 72, enemyHp: 150, contextTitle: '爪牙战 · 南海鳄神',
        rewardGold: 18, rewardFame: 8, rewardExp: 16, sideCastResult: { kind: 'eyu' }
      });
      return { ok: true, log: '', toast: '水路上一场恶战。', tone: 'amber' };
    } else if (actionId === 'eyu_slip') {
      f.eyu = 'slipped'; L('你绕开了南海鳄神。水路这一遭可以不打。');
      out.toast = '绕开了。';
    } else if (actionId === 'yun_face') {
      f.yun = f.yun || 'faced'; L('你和云中鹤对峙。他的恶名在某州野路，没有第几程。');
      out.toast = '对峙过了。';
    } else if (actionId === 'yun_hunt') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      f.yun = f.yun || 'hunted';
      if (st.court && st.court.flags) st.court.flags.bountyAccepted = 'yun';
      e.startDuel(st, {
        enemyName: '云中鹤', enemyTitle: '某州野路 · 官面通缉', enemyStance: 'qiao',
        enemyPower: 66, enemyHp: 130, contextTitle: '爪牙战 · 云中鹤',
        rewardGold: 20, rewardFame: 8, rewardExp: 16, sideCastResult: { kind: 'yun' }
      });
      return { ok: true, log: '', toast: '追杀开始。', tone: 'amber' };
    } else if (actionId === 'yun_flee') {
      f.yun = 'fled'; L('你逃离了云中鹤。野路可以不打。');
      out.toast = '你离开了。';
    } else if (actionId === 'he_check') {
      var word = st.court ? ['无缉', '风闻', '犯官差', '海捕', '重缉', '通令'][Math.max(0, Math.min(5, st.court.wanted || 0))] : '无缉';
      L('鹤笔翁盘查你：名册上是「' + word + '」。没有报出你在哪一城犯的事。');
      out.toast = '盘查完了。档词是' + word + '。';
    } else if (actionId === 'he_fake') {
      f.hebiFake = true; addBias(st, ['court', 'chousha']);
      L('【假任务】鹤笔翁塞给你一件行营差事，帖上没有落点。');
      out.toast = '假任务接了。帖上没有格子。';
    } else if (actionId === 'he_force') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '鹤笔翁', enemyTitle: '行营外 · 硬闯', enemyStance: 'qiao',
        enemyPower: 64, enemyHp: 128, contextTitle: '行营外 · 硬闯鹤笔翁',
        rewardGold: 10, rewardFame: 4, rewardExp: 14, sideCastResult: { kind: 'hebi' }
      });
      return { ok: true, log: '', toast: '硬闯行营。', tone: 'amber' };
    } else if (actionId === 'yin_sword') {
      st.exp += 10; addBias(st, ['jianyi']);
      if (e.checkRealmPromotion) e.checkRealmPromotion(st, e);
      L('殷梨亭把武当剑形拆给你看。');
      out.toast = '剑形入眼，修为 +10。'; out.tone = 'emerald';
    } else if (actionId === 'yin_tea') {
      f.yinTea = st.turn; st.hp = Math.min(st.maxHp, st.hp + 8);
      L('你和殷梨亭喝了一盏茶。');
      out.toast = '茶叙完了。'; out.tone = 'emerald';
    } else if (actionId === 'yin_daily') {
      L('殷梨亭说了武当的晨课和药园，没有外城的人。');
      out.toast = '日常停在这座山上。';
    } else if (actionId === 'ya_buy') {
      if (st.gold < 8) return { ok: false, why: '纹银不足' };
      st.gold -= 8;
      var ygrades = ['reliable', 'stale', 'conflict'];
      var ygrade = ygrades[Math.floor((e.rand || Math.random)() * 3)];
      var ytext = ygrade === 'conflict' ? '一说恶名在某州野路，一说在南方水路，两头对不上，也没有格子。'
        : (ygrade === 'stale' ? '旬前牙人说某路有恶名，这话多半旧了。'
          : '牙人只卖到某州、某路。再要格子，他摇头。');
      st.rumorReliability = ygrade;
      st.pendingRumor = { grade: ygrade, text: ytext, aboutId: 'yaren' };
      L('【牙人】' + ytext);
      out.toast = '情报买下了，仍是一片地方。';
    } else if (actionId === 'ya_wash') {
      if (!st.court || (st.court.wanted || 0) < 1) { L('名册上还没有你。'); out.toast = '名册上还没有你。'; }
      else {
        st.court.flags = st.court.flags || {};
        st.court.flags.washIntent = true;
        L('牙人说洗通缉要找官差销，不告诉你值房在第几格。');
        out.toast = '线索只有一句：去官差抽屉。'; out.tone = 'emerald';
      }
    } else if (actionId === 'ya_hire') {
      if (st.gold < 6 || f.yarenHired) return { ok: false, why: st.gold < 6 ? '纹银不足' : '这旬已雇过' };
      st.gold -= 6; f.yarenHired = true; st.fame += 1;
      L('你在牙行雇了个人跑腿。他不去外城点名。');
      out.toast = '人雇下了。'; out.tone = 'emerald';
    } else if (actionId === 'guo_duel') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '郭芙', enemyTitle: '襄阳 · 嘴快手快', enemyStance: 'gang',
        enemyPower: 52, enemyHp: 110, contextTitle: '襄阳庄上 · 与郭芙切磋',
        rewardGold: 6, rewardFame: 3, rewardExp: 12, sideCastResult: { kind: 'guofu' }
      });
      return { ok: true, log: '', toast: '切磋开始。', tone: 'amber' };
    } else if (actionId === 'guo_feud') {
      markRivalry(st, 'guofu'); f.guofu = 'feud';
      L('【襄阳家书】郭芙和你结了怨。仇记下了，没有把人钉到某一门。');
      out.toast = '结怨了。';
    } else if (actionId === 'guo_peace') {
      markFeudSettled(st, 'guofu'); f.guofu = 'peace'; st.fame += 3;
      L('【襄阳家书】你和郭芙把梁子按下。仇杀的权重松了一点。');
      out.toast = '和解了。'; out.tone = 'emerald';
    } else if (actionId === 'guo_chat') {
      L('郭芙闲话只停在襄阳这座城，不说别人下一旬去哪。');
      out.toast = '闲话停在这座城。';
    } else if (actionId === 'yelv_border') {
      if (st.court) {
        st.court.border = Math.max(-50, Math.min(50, (st.court.border || 0) + 10));
        st.court.flags = st.court.flags || {};
        st.court.flags.borderHook = true;
      }
      f.yelvTalk = true;
      noteRelic(st, '燕云腰牌', 'yanyun_token');
      grantRelic(st, 'yanyun_token');
      addBias(st, ['court', 'chivalry']);
      var btext = '耶律齐说边关一带还有商胡滞留。燕云的风紧了些，没有使者的落脚。';
      st.pendingRumor = { grade: 'reliable', text: btext, aboutId: 'yelv' };
      L('【边谊】' + btext);
      out.toast = '边谊暖了一截。'; out.tone = 'emerald';
    } else if (actionId === 'yelv_duel') {
      if (!e.startDuel) return { ok: false, why: '这会儿不方便动手。' };
      e.startDuel(st, {
        enemyName: '耶律齐', enemyTitle: '北地 · 比武', enemyStance: 'gang',
        enemyPower: 70, enemyHp: 140, contextTitle: '襄阳北地 · 与耶律齐比武',
        rewardGold: 10, rewardFame: 6, rewardExp: 16, sideCastResult: { kind: 'yelv' }
      });
      return { ok: true, log: '', toast: '比武开始。', tone: 'amber' };
    } else if (actionId === 'yelv_yan') {
      if (st.court) st.court.yanyun = Math.max(st.court.yanyun || 0, 1);
      f.yelvYan = true; addBias(st, ['court']);
      L('耶律齐谈了燕云：风已紧，人却不在某一座关上。');
      out.toast = '燕云这一档，算是紧了。';
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
    applyDuelResult: applyDuelResult,
    grantRelic: grantRelic,
    noteRelic: noteRelic,
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
