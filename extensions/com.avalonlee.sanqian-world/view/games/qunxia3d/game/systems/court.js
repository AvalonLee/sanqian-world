/* systems/court.js — P4-C 朝廷风声（册301 · 纯逻辑 · 计划书铁律 1）
 * 迁移源 = view/games/qunxia/game.html :13364–:13918（P4-C 段：顶栏角标 + 风声结论体 +
 * 五类风声的选择器）。本件只留**逻辑**：状态归一 / 风声池 / 每旬结算 / 角标模型 /
 * 五类选择效果 / 官差三支（洗通缉·领悬赏·交人犯）。DOM 演出在 ui/panels.js，
 * 装配在 app.js（env.settleCourtOnNewTurn 由 core/time 的 advanceTime 调用）。
 *
 * 与原版的偏差（显式登记）：
 *   ① `addSideBias` 只做计数（min 4），不调 ensureP4BStateDefaults（P4-B 未迁）。
 *   ② `presentStreetRumor` 改走本仓 `st.pendingRumor`（3D 版无 rumor-bar，等价面在日志）。
 *   ③ 官差 `court_take` 的「同格当场开战」依赖 P4-B `SIDE_BY_ID/SIDE_ACTION_FN` ⇒ 本批只记
 *      接赏与去向；`court_turnin` 的 `markBountyCleared` 同样等 P4-B，现在走 flags 幂等。
 *   ④ 顶栏角标从 `hud-faction-badges` 改挂 3D 版 `#hud-court`（同一 courtBadgeModel）。
 * 副作用纪律：只改传入 st（与 env 回调），不碰 DOM/THREE；存档与重渲由 app 负责。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.QX3D = root.QX3D || {};
    root.QX3D.systems = root.QX3D.systems || {};
    root.QX3D.systems.court = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../data/court.js')
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));

  var BORDER_REGIONS = D.COURT_BORDER_REGIONS || [];
  var NORTH_REGIONS = D.COURT_NORTH_REGIONS || [];

  function clamp(n, lo, hi) {
    var v = Number(n) || 0;
    return Math.max(lo, Math.min(hi, v));
  }

  function ensureState(st) {
    if (!st) return st;
    if (!st.court || typeof st.court !== 'object') {
      st.court = {
        merit: 0, wanted: 0, border: 0, spy: false, yanyun: 0,
        flags: {}, rumorTurn: 0, rumors: [], pinId: null
      };
    }
    var c = st.court;
    c.merit = clamp(c.merit, -100, 100);
    c.wanted = clamp(c.wanted, 0, 5);
    c.border = clamp(c.border, -50, 50);
    c.yanyun = clamp(c.yanyun, 0, 2);
    if (typeof c.spy !== 'boolean') c.spy = false;
    if (!c.flags || typeof c.flags !== 'object') c.flags = {};
    if (!Array.isArray(c.rumors)) c.rumors = [];
    return c;
  }

  /* ── 短词（原 meritWord / wantedWord / borderWord / yanyunWord）──────────── */
  function meritWord(n) {
    if (n >= 60) return '功勋';
    if (n >= 25) return '有功名';
    if (n > 0) return '薄功';
    if (n === 0) return '功名未动';
    if (n > -25) return '失名';
    return '戴罪';
  }
  function wantedWord(n) { return ['无缉', '风闻', '犯官差', '海捕', '重缉', '通令'][clamp(n, 0, 5)]; }
  function borderWord(n) {
    if (n >= 20) return '边谊暖';
    if (n > 0) return '边谊和';
    if (n === 0) return '边谊持中';
    if (n > -20) return '边谊凉';
    return '边谊冷';
  }
  function yanyunWord(n) {
    if (n >= 2) return '燕云风紧';
    if (n >= 1) return '燕云紧';
    return '燕云尚缓';
  }

  function scrollIsCourt(st) {
    var sp = st.scrollProposition;
    return !!(sp && (sp.id === 'chaoting' || sp.name === '朝廷'));
  }

  /* 海捕目标（原 courtBountyTarget）——P4-B 未迁时 sideFlags 为空 ⇒ 首捕恒木高峰 */
  function bountyTarget(st) {
    var f = st.sideFlags || {};
    if (f.mu !== 'down' && f.mu !== 'slipped') return { id: 'mu', name: '木高峰', blur: '陕南一带', silver: '五十' };
    if (f.fengBounty !== 'cleared' && f.fengConfront !== 'avoid') return { id: 'feng', name: '凤天南', blur: '县衙外', silver: '四十' };
    if (f.tian && f.tian !== 'repelled' && f.tian !== 'recruited') return { id: 'tian', name: '田伯光', blur: '野路一带', silver: '三十' };
    if (f.yun && f.yun !== 'down' && f.yun !== 'fled') return { id: 'yun', name: '云中鹤', blur: '某州野路', silver: '三十' };
    if (f.eyu && f.eyu !== 'down' && f.eyu !== 'slipped') return { id: 'eyu', name: '南海鳄神', blur: '南方水路', silver: '三十' };
    return null;
  }

  /* ── 风声池（原 buildCourtRumorPool，逐条同权）────────────────────────────── */
  function buildPool(st) {
    var c = ensureState(st);
    var list = [];
    var borderHere = BORDER_REGIONS.indexOf(st.currentRegion) >= 0;
    var northHere = NORTH_REGIONS.indexOf(st.currentRegion) >= 0;
    var bias = st.sideScrollBias || {};
    var hate = (bias.chousha || 0) + (bias.bounty || 0);
    var delay = c.flags.delayBoost || 0;
    var edictW = 3 + delay;
    if (scrollIsCourt(st)) edictW += 4;
    if (!c.flags.edictClosedTurn || c.flags.edictClosedTurn !== st.turn) {
      list.push({
        id: 'edict', type: 'edict', tone: 'court', kind: '诏令', weight: edictW,
        line: '诏：限三旬内赴洛阳应召——应则功名，拒则通缉'
      });
    }
    if (borderHere || c.border !== 0 || c.spy || c.flags.borderHook) {
      list.push({
        id: 'border', type: 'border', tone: 'border', kind: '边报',
        weight: (borderHere ? 4 : 1) + (c.spy ? 2 : 0),
        line: '边报：西夏商胡滞留边关一带——可护送或回避'
      });
    }
    var f = st.sideFlags || {};
    var engaged = hate > 0 || !!(f.mu || f.tian || f.bullyIntel || f.fengConfront || c.flags.bountyAccepted);
    var target = engaged ? bountyTarget(st) : null;
    if (target) {
      list.push({
        id: 'merit-bounty', type: 'merit', tone: 'court', kind: '悬赏·功名',
        weight: 2 + hate + 2, line: '缉拿' + target.name + '，赏银' + target.silver, targetId: target.id
      });
    }
    if (c.wanted >= 1) {
      list.push({
        id: 'wanted', type: 'wanted', tone: 'court', kind: '悬赏·通缉',
        weight: 3 + c.wanted, line: '尔名在官——' + wantedWord(c.wanted)
      });
    }
    if (c.yanyun >= 1 || northHere) {
      list.push({
        id: 'yanyun', type: 'yanyun', tone: 'liao', kind: '燕云邸报',
        weight: northHere ? 4 : 2, line: '边警：燕云风紧——武林议盟声起'
      });
    }
    list.sort(function (a, b) { return b.weight - a.weight; });
    return list;
  }

  /* 每旬一份（同旬复用；换旬重算） */
  function ensureRumors(st) {
    var c = ensureState(st);
    if (c.rumorTurn === st.turn && c.rumors && c.rumors.length) return c;
    var pool = buildPool(st);
    c.rumors = pool;
    c.pinId = pool.length ? pool[0].id : null;
    c.rumorTurn = st.turn;
    return c;
  }

  /* 过旬结算（原 settleCourtOnNewTurn，由 advanceTime 的 env 钩子调用） */
  function settleOnNewTurn(st) {
    var c = ensureState(st);
    if (c.wanted >= 4) c.merit = clamp(c.merit - 4, -100, 100);
    if (c.spy) c.border = clamp(c.border - 2, -50, 50);
    if (c.yanyun > 0 && NORTH_REGIONS.indexOf(st.currentRegion) < 0) c.yanyun = Math.max(0, c.yanyun - 1);
    c.rumorTurn = 0;
    ensureRumors(st);
  }

  /* 顶栏角标（原 courtBadgeModel）：最多三枚，朝廷那枚有诏时 hot */
  function badgeModel(st) {
    var c = ensureRumors(st);
    var openEdict = (c.rumors || []).some(function (r) { return r.id === 'edict'; });
    var badges = [];
    if (c.merit !== 0 || c.wanted >= 1 || openEdict) {
      var word = '有诏';
      if (c.wanted >= 2) word = wantedWord(c.wanted);
      else if (c.merit !== 0) word = meritWord(c.merit);
      else if (c.wanted === 1) word = wantedWord(1);
      badges.push({ id: 'court', label: '朝廷·' + word, hot: openEdict });
    }
    var borderRumor = (c.rumors || []).some(function (r) { return r.id === 'border'; });
    if (c.border !== 0 || c.spy || borderRumor) {
      badges.push({ id: 'xia', label: '西夏·' + (c.spy ? '细作' : borderWord(c.border)), hot: false });
    }
    var yanRumor = (c.rumors || []).some(function (r) { return r.id === 'yanyun'; });
    if (c.yanyun >= 1 || yanRumor) {
      badges.push({ id: 'liao', label: '辽·' + yanyunWord(c.yanyun), hot: false });
    }
    return badges;
  }

  function findRumor(st, id) {
    var c = ensureRumors(st);
    var list = c.rumors || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* 风声离场（原 courtDone） */
  function done(st, id) {
    var c = ensureState(st);
    c.rumors = (c.rumors || []).filter(function (r) { return r.id !== id; });
    if (c.pinId === id) c.pinId = c.rumors.length ? c.rumors[0].id : null;
    if (id === 'edict') c.flags.edictClosedTurn = st.turn;
  }

  function addBias(st, tags) {
    if (!st.sideScrollBias || typeof st.sideScrollBias !== 'object') st.sideScrollBias = {};
    (tags || []).forEach(function (t) { st.sideScrollBias[t] = Math.min(4, (st.sideScrollBias[t] || 0) + 1); });
  }

  /* ── 五类选择（原 courtAnswerEdict / courtBorderChoice / courtMeritChoice /
   *    courtWantedChoice / courtYanyunChoice）：只改 st，返回演出文案 ─────────── */
  function answerEdict(st, which) {
    var c = ensureState(st);
    if (which === 'yes') {
      c.merit = clamp(c.merit + 18, -100, 100);
      c.flags.answered = (c.flags.answered || 0) + 1;
      c.flags.delayBoost = 0;
      addBias(st, ['court', 'chaoting']);
      done(st, 'edict');
      return { log: '【诏令】你应了召。功名厚了一截，人还得到洛阳销差，不指哪一座衙门。', toast: '应召了。功名厚了一截。', tone: 'emerald' };
    }
    if (which === 'no') {
      c.merit = clamp(c.merit - 12, -100, 100);
      c.wanted = clamp(c.wanted + 1, 0, 5);
      c.flags.refused = (c.flags.refused || 0) + 1;
      c.flags.delayBoost = 0;
      addBias(st, ['court', 'chousha']);
      done(st, 'edict');
      return { log: '【诏令】你拒了诏。通缉升了一档，名册上只有短词，没有门牌。', toast: '拒诏了。官差那边会认得你。', tone: 'amber' };
    }
    c.flags.delayed = (c.flags.delayed || 0) + 1;
    c.flags.delayBoost = (c.flags.delayBoost || 0) + 1;
    done(st, 'edict');
    return { log: '【诏令】你把诏令拖到下一旬。下次它会更靠前。', toast: '拖延了。下一旬这份诏令更沉。', tone: 'amber' };
  }

  function borderChoice(st, which) {
    var c = ensureState(st);
    if (which === 'escort') {
      c.border = clamp(c.border + 12, -50, 50);
      c.spy = false;
      st.gold += 8;
      c.flags.borderEscort = (c.flags.borderEscort || 0) + 1;
      addBias(st, ['court']);
      done(st, 'border');
      return { log: '【边报】你护送商胡过了边关一带。边谊暖了，没有交出路线。', toast: '护送完成。边谊暖了一截。', tone: 'emerald' };
    }
    if (which === 'avoid') {
      c.border = clamp(c.border - 6, -50, 50);
      c.flags.borderAvoid = (c.flags.borderAvoid || 0) + 1;
      done(st, 'border');
      return { log: '【边报】你避开了滞留的商胡。边谊凉了些。', toast: '避开了。边谊凉了一点。', tone: 'amber' };
    }
    var text = '商胡还在边关一带滞留。没人说是哪一座关，也没点出随行的人。';
    st.pendingRumor = { grade: 'stale', text: text, aboutId: 'border' };
    return { log: '【边报】' + text, toast: '再打听也只有这一句。', tone: 'amber', rumor: st.pendingRumor };
  }

  function meritChoice(st, which) {
    var c = ensureState(st);
    var target = bountyTarget(st);
    if (which === 'take') {
      c.flags.bountyAccepted = target ? target.id : 'generic';
      c.flags.bountyName = target ? target.name : '边路恶徒';
      done(st, 'merit-bounty');
      return { log: '【悬赏】你接下海捕。名字在告示上，落点仍是一片地方，不是某一格。', toast: '接赏了。去本城官差处销名，或在传闻里的那一片撞见。', tone: 'emerald' };
    }
    if (which === 'clue') {
      var blur = target ? target.blur : '边路';
      var text = (target ? target.name : '那名字') + '的风声停在' + blur + '，没有第几条街。';
      st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'merit-bounty' };
      return { log: '【悬赏】' + text, toast: '线索只有一片地方。', tone: 'amber', rumor: st.pendingRumor };
    }
    c.flags.bountyHeld = st.turn;
    done(st, 'merit-bounty');
    return { log: '', toast: '告示先搁下。', tone: 'amber' };
  }

  function wantedChoice(st, which, env) {
    var c = ensureState(st);
    if (which === 'wash') {
      var officer = env && env.officerHere ? env.officerHere() : null;
      if (officer) {
        c.flags.washIntent = true;
        return { log: '', toast: '值房就在脚下。打开官差，可以洗一笔。', tone: 'emerald', openOfficer: officer.id };
      }
      c.flags.washIntent = true;
      return { log: '【通缉】你想洗白，可本城值房不在脚下这一格。', toast: '本城值房不在脚下。找到官差再销。', tone: 'amber' };
    }
    if (which === 'hide') {
      c.merit = clamp(c.merit - 2, -100, 100);
      c.flags.hid = (c.flags.hid || 0) + 1;
      done(st, 'wanted');
      return { log: '', toast: '先躲过这一旬。', tone: 'amber' };
    }
    done(st, 'wanted');
    return { log: '', toast: '你已知自己在名册上。', tone: 'amber' };
  }

  function yanyunChoice(st, which) {
    var c = ensureState(st);
    if (which === 'watch') {
      c.flags.allianceWatch = true;
      c.merit = clamp(c.merit + 4, -100, 100);
      addBias(st, ['court']);
      done(st, 'yanyun');
      return { log: '【燕云邸报】你记下武林议盟。边警仍是一片风，不是某人的行程。', toast: '盟约先盯着。', tone: 'emerald' };
    }
    if (which === 'south') {
      c.yanyun = Math.max(0, c.yanyun - 1);
      c.flags.southAvoid = true;
      done(st, 'yanyun');
      return { log: '', toast: '你往南避开了这一阵风。', tone: 'amber' };
    }
    done(st, 'yanyun');
    return { log: '', toast: '邸报看过了。', tone: 'amber' };
  }

  /* ── 官差三支（原 syncOfficerJobActions + STREET_ACTION_FN.court_*）────────── */
  function officerActions(st) {
    var c = ensureState(st);
    var list = [];
    if (c.wanted >= 1 || c.flags.washIntent) {
      list.push({ id: 'court_wash', label: '洗通缉', primary: true, hint: '不看战力 · 12 文', needGold: 12 });
    }
    var f = st.sideFlags || {};
    var bountyLive = !!(c.flags.bountyAccepted || f.mu || f.tian || f.bullyIntel || f.fengConfront);
    if (bountyLive) {
      list.push({ id: 'court_take', label: '领悬赏', primary: list.length === 0, hint: '告示上的名字' });
    }
    var beaten = f.mu === 'down' || f.fengBounty === 'cleared' || f.yun === 'down' || f.eyu === 'down' || f.tian === 'repelled';
    if (beaten && !c.flags.turnedIn) {
      list.push({ id: 'court_turnin', label: '交人犯', primary: list.length === 0, hint: '销一笔海捕' });
    }
    return list.slice(0, 3);
  }

  /* 官差三支的效果；返回 { ok, log, toast, tone } 与 street.act 同形 */
  function actOfficer(st, npc, actionId) {
    var c = ensureState(st);
    if (actionId === 'court_wash') {
      if (c.wanted < 1 && !c.flags.washIntent) return { ok: false, why: '名册上还没有你。' };
      if (st.gold < 12) return { ok: false, why: '洗这一笔要 12 文。' };
      st.gold -= 12;
      if (c.wanted > 0) c.wanted -= 1;
      c.merit = clamp(c.merit + 4, -100, 100);
      c.flags.washed = (c.flags.washed || 0) + 1;
      c.flags.washIntent = false;
      return { ok: true, log: '【市井·' + npc.tileName + '】' + npc.name + '：官差销了一笔通缉，嘴里只用短词，不报数字。', toast: '洗白了一笔。', tone: 'emerald' };
    }
    if (actionId === 'court_take') {
      var target = bountyTarget(st);
      c.flags.bountyAccepted = c.flags.bountyAccepted || (target ? target.id : 'generic');
      var blur = target ? target.blur : '传闻里的那一片';
      return { ok: true, log: '【市井·' + npc.tileName + '】' + npc.name + '：官差只肯认名字，落点仍是' + blur + '。', toast: '名字收下了。人还在' + blur + '。', tone: 'amber' };
    }
    if (actionId === 'court_turnin') {
      c.flags.turnedIn = true;
      c.merit = clamp(c.merit + 10, -100, 100);
      st.gold += 12;
      return { ok: true, log: '【市井·' + npc.tileName + '】' + npc.name + '：人犯销进海捕簿。功名厚了一截，没有新的门牌。', toast: '人犯交了。功名厚了一截。', tone: 'emerald' };
    }
    return { ok: false, why: '这会儿做不了。' };
  }

  function isCourtAction(id) { return id === 'court_wash' || id === 'court_take' || id === 'court_turnin'; }

  return {
    ensureState: ensureState,
    clamp: clamp,
    meritWord: meritWord,
    wantedWord: wantedWord,
    borderWord: borderWord,
    yanyunWord: yanyunWord,
    scrollIsCourt: scrollIsCourt,
    bountyTarget: bountyTarget,
    buildPool: buildPool,
    ensureRumors: ensureRumors,
    settleOnNewTurn: settleOnNewTurn,
    badgeModel: badgeModel,
    findRumor: findRumor,
    done: done,
    answerEdict: answerEdict,
    borderChoice: borderChoice,
    meritChoice: meritChoice,
    wantedChoice: wantedChoice,
    yanyunChoice: yanyunChoice,
    officerActions: officerActions,
    actOfficer: actOfficer,
    isCourtAction: isCourtAction
  };
});
