/* systems/romance.js — P4-E 情缘（册311 E1 基建 · 册312 E2 交互 · 册313 E3a 后院/婚嫁）
 * 迁移源 = view/games/qunxia/game.html :13921–:14739（头注：相识→成亲·正妻；无倾心不入口；
 * 不推进多房；不加攻击气血——头注 = **叙事不劝进**的口径，不是实现范围；多房/后院按用户
 * 2026-11-09 裁定**完整保留**，此前「多房不做」的登记系错误记录）。E1 = 状态与查询（ensureState/
 * person/stage/meet/here/intel/visibleList/hasBadge）；E2 = 交互（actionsFor/act/gain/once/
 * note/penalty/三选一）；E3a = 婚嫁 / 后院（纳妾缺口与家变）/ 差事（轮岗与扶正）；
 * UI 演出随 E3b（名册 / 人卡 / 顶栏角标 / 四张弹窗）。
 *
 * 偏差（显式登记）：
 *   ① `romanceHere` 复用本仓 `systems.side.castHere(st, region)`（原版 `sideCastHere()` 无参取全局）。
 *   ② 头像不渲染（同 A/B 拍板），`art` 已由生成器占位化为空串。
 *   ③ 前台只出阶段词（ROMANCE_STAGE_WORD），**好感数值不出屏**——漏出即 bug。
 *   ④ 第三房起原来靠 `state.faction.founded` + 门人/侧室 ≥2（立号线 F 未迁，`st.faction` 恒 null）
 *      ⇒ 该门槛**恒闭合**，不造假值；F 上线后自然开。
 *   ⑤ `hallHouses()`（= 隐庐 + 分舵 + 营寨）里分舵/营寨同属立号未迁 ⇒ 房舍只按隐庐建筑记。
 *   ⑥ 原 `openConcubineModal` / `openHouseholdModal`（DOM）改返 dialog 描述；原三件
 *      `window.*Pick` 全局索引合并成 `pick(st, id, which, choiceId, env)`。
 * 副作用纪律：只改传入 st；存档/重渲由 app 负责。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.QX3D = root.QX3D || {};
    root.QX3D.systems = root.QX3D.systems || {};
    root.QX3D.systems.romance = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../data/romance.js')
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));
  var LIST = D.ROMANCE_CAST || [];
  var STAGE_WORD = D.ROMANCE_STAGE_WORD || { met: '相识', warm: '好感', love: '倾心', pledge: '有约', wife: '娘子', side: '侧室' };
  var BY_ID = {};
  LIST.forEach(function (r) { BY_ID[r.id] = r; });

  function sideMod() {
    if (typeof module !== 'undefined' && module.exports) return require('./side.js');
    return root.QX3D && root.QX3D.systems ? root.QX3D.systems.side : null;
  }

  function ensureState(st) {
    var host = st;
    if (!host) return null;
    if (!host.romance || typeof host.romance !== 'object') host.romance = { wifeId: null, people: {} };
    if (!host.romance.people) host.romance.people = {};
    if (host.romance.wifeId === undefined) host.romance.wifeId = null;
    if (!Array.isArray(host.romance.concubines)) host.romance.concubines = [];
    host.romance.concubineCount = host.romance.concubines.length;
    if (host.romance.jealousy === undefined) host.romance.jealousy = null;
    if (typeof host.romance.crisisWeight !== 'number') host.romance.crisisWeight = 0;
    if (host.romance.haremPath === undefined) host.romance.haremPath = null;
    if (host.romance.jealousy === 'delayed' && (host.turn || 1) >= (host.romance.crisisDueTurn || 0)) host.romance.jealousy = 'open';
    return host.romance;
  }

  function person(st, id) {
    ensureState(st);
    if (!st.romance.people[id]) st.romance.people[id] = { affection: 0, known: false, intel: false, pledged: false, act: {} };
    var p = st.romance.people[id];
    p.affection = Math.max(0, Math.min(6, p.affection || 0));
    return p;
  }

  /* 阶段：wife > side > pledge > love(4) > warm(2) > met(known) > unknown */
  function stage(st, id) {
    var p = person(st, id);
    if (st.romance.wifeId === id) return 'wife';
    if ((st.romance.concubines || []).some(function (c) { return c.id === id; })) return 'side';
    if (p.pledged) return 'pledge';
    if (p.affection >= 4) return 'love';
    if (p.affection >= 2) return 'warm';
    if (p.known) return 'met';
    return 'unknown';
  }

  function stageWord(stageId) { return STAGE_WORD[stageId] || '未识'; }

  function meet(st, id) { if (!BY_ID[id]) return; person(st, id).known = true; }

  /* 在场：同地界同格且在本旬在场名单里（复用 P4-B side.castHere） */
  function here(st, id) {
    var s = sideMod();
    if (!s || !s.castOf(id)) return false;
    var region = { id: st.currentRegion };
    return s.castHere(st, region).some(function (c) { return c.id === id; });
  }

  /* 情报：已打探，或阶段已到 love 及以上 */
  function intel(st, id) {
    var sg = stage(st, id);
    var p = person(st, id);
    return !!(p.intel || sg === 'love' || sg === 'pledge' || sg === 'wife' || sg === 'side');
  }

  /* 可见列表：已知 + (在场或已得情报) */
  function visibleList(st) {
    ensureState(st);
    return LIST.filter(function (r) {
      var p = st.romance.people && st.romance.people[r.id];
      if (!p || !p.known) return false;
      return here(st, r.id) || intel(st, r.id);
    });
  }

  function hasBadge(st) {
    ensureState(st);
    return LIST.some(function (r) {
      var s = stage(st, r.id);
      return s === 'love' || s === 'pledge' || s === 'wife' || s === 'side';
    });
  }

  /* ── E2（册312）：交互七件（婚嫁/后院四类动作留 E3 的 act 分支）───────────── */
  function gain(st, id, n, toast) {
    var before = stage(st, id);
    var p = person(st, id);
    p.known = true;
    p.affection = Math.max(0, Math.min(6, p.affection + n));
    var after = stage(st, id);
    var msg = before !== after ? ('她的态度变成了「' + stageWord(after) + '」。') : (toast || '她记住了这一面。');
    return { toast: msg, tone: 'emerald', stageChanged: before !== after };
  }

  function once(st, id, actionId) {
    var p = person(st, id);
    if (p.act[actionId] === st.turn) return false;
    p.act[actionId] = st.turn;
    return true;
  }

  function note(st, id) {
    var r = BY_ID[id];
    if (!r) return '';
    var sg = stage(st, id);
    if (sg === 'unknown') return '';
    if (sg === 'wife') return '娘子。府里的主母位先留着。这一段不加拳脚，也不加气血。';
    if (sg === 'pledge') return '有约。心意相通。择日成亲、先侧后正或再缓一缓。';
    if (sg === 'love') return '意动。她在意。可以试探、表白，或暂缓。';
    if (sg === 'warm') return '她留意你了。称呼软了些。';
    return r.address + '｜生分。阶段是' + stageWord(sg) + '。';
  }

  /* 成亲门槛缺口（E3 消费；本刀只做判据） */
  function missingMarriage(st, id) {
    var p = person(st, id);
    var missing = [];
    if (st.romance.wifeId && st.romance.wifeId !== id) missing.push('已有娘子，本切片不再娶正妻');
    if (!p.pledged) missing.push('尚未定情');
    if ((st.gold || 0) < 40) missing.push('盘缠还薄，成亲还差一笔安家的银子');
    return missing;
  }

  /* 拒绝/改日的对手惩罚（原 romanceApplyPenalty） */
  function applyPenalty(st, r) {
    var rivals = [{ id: r.rival, name: r.rivalName }, { id: r.rival2, name: r.rival2Name }].filter(function (x) { return x.id; });
    var s = sideMod();
    rivals.forEach(function (rv) {
      var m = (st.masters || []).filter(function (x) { return x.id === rv.id; })[0];
      if (m) m.affinity = Math.max(0, (m.affinity || 0) - r.penalty);
      if (s && s.markRivalry) s.markRivalry(st, rv.id);
      if (!st.outcomeFlags) st.outcomeFlags = { clawBroken: {}, rivalryOn: {}, feudSettled: {}, bountyCleared: {} };
      if (!st.outcomeFlags.revengeHeat) st.outcomeFlags.revengeHeat = {};
      st.outcomeFlags.revengeHeat[rv.id] = (st.outcomeFlags.revengeHeat[rv.id] || 0) + (r.mustFeud ? 2 : 1);
    });
    if (r.courtLink && st.court) {
      st.court.merit = Math.max(-100, Math.min(100, (st.court.merit || 0) + 12));
      st.court.flags = st.court.flags || {};
      st.court.flags.zhaominMarriage = true;
    }
    if (r.borderLink && st.court) st.court.border = Math.max(-50, Math.min(50, (st.court.border || 0) - 8));
  }

  /* ── E3a（册313）：后院与差事（原 :14227–:14734 状态面）────────────────────── */
  var FAME_MARKS = [0, 24, 48, 96, 140];
  var FAME_WORDS = ['无名', '有名', '少侠', '闻名', '震慑'];

  /* 侠名档（原 concubineFameTier / concubineFameWord） */
  function fameTier(fame) {
    var n = fame || 0;
    var tier = 0;
    for (var i = 1; i < FAME_MARKS.length; i++) if (n >= FAME_MARKS[i]) tier = i;
    if (n >= 140) tier = 4 + Math.floor((n - 140) / 44);
    return tier;
  }
  function fameWord(tier) { return FAME_WORDS[Math.max(0, Math.min(4, tier))]; }

  /* 一房盘缠（原 concubineGoldNeed；持绣帕 ×1.1） */
  function goldNeed(st, n) {
    var gold = 80;
    if (n === 2) gold = 150;
    else if (n === 3) gold = 300;
    else if (n >= 4) {
      gold = 300;
      for (var i = 4; i <= n; i++) gold = Math.round(gold * 1.6);
    }
    if (st.relicCarry && st.relicCarry.indexOf('handkerchief') >= 0) gold = Math.round(gold * 1.1);
    return gold;
  }
  function fameNeed(n) {
    if (n <= 1) return 1;
    if (n === 2) return 2;
    if (n === 3) return 3;
    return 3 + (n - 3);
  }

  /* 隐庐进数（原 hermitageJin）：四建筑总级 ≥6 ⇒ 3 · ≥2 ⇒ 2 · 否则 1 */
  function estateJin(st) {
    var b = (st.estate && st.estate.buildings) || {};
    var sum = (b.winery || 0) + (b.herbGarden || 0) + (b.smithy || 0) + (b.academy || 0);
    if (sum >= 6) return 3;
    if (sum >= 2) return 2;
    return 1;
  }
  /* 本门声望（原 concubineRenownOk）——立号未迁 ⇒ 恒 false，见件头偏差 ④ */
  function renownOk(st) {
    var f = st.faction;
    if (!f || !f.founded) return false;
    var disciples = (f.disciples || []).length;
    return disciples + (st.romance.concubineCount || 0) >= 2;
  }
  /* 房舍够不够（原 concubineHouseOk；houses 只按隐庐记，见件头偏差 ⑤） */
  function houseOk(st, n) {
    var houses = estateJin(st);
    if (n <= 1) return houses >= 1 || !!(st.romance && st.romance.innStay);
    if (n === 2) return houses >= 1;
    if (n === 3) return houses >= 2;
    return houses >= (st.romance.concubineCount || 0);
  }
  function jealousyBlocking(st) {
    var m = st.romance && st.romance.jealousy;
    return m === 'open' || m === 'delayed';
  }

  /* 缺口清单（原 concubineGaps；顺序即原版判断顺序，勿重排） */
  function gaps(st, id) {
    ensureState(st);
    var n = (st.romance.concubineCount || 0) + 1;
    var out = [];
    var p = person(st, id);
    if (st.romance.wifeId === id) out.push('她已是正妻');
    if ((st.romance.concubines || []).some(function (c) { return c.id === id; })) out.push('她已在侧室');
    if (!p.pledged && st.romance.wifeId !== id) out.push('目标尚未定情');
    if (fameTier(st.fame) < fameNeed(n)) out.push('侠名未到' + fameWord(Math.min(4, fameNeed(n))));
    if ((st.gold || 0) < goldNeed(st, n)) out.push('盘缠还差' + (goldNeed(st, n) - (st.gold || 0)) + '两');
    if (!houseOk(st, n)) out.push('住处还不够这一房');
    if (n >= 2 && st.romance.wifeId && jealousyBlocking(st)) out.push('正妻决裂未安抚');
    if (n >= 3 && !renownOk(st)) out.push('本门声望还没到中');
    if (n >= 3 && jealousyBlocking(st)) out.push('妒忌还没处理');
    return out;
  }
  /* 缺口结论体（原 concubineConclusion；缺口为空返回空串） */
  function conclusion(st, id) {
    var n = (st.romance.concubineCount || 0) + 1;
    var g = gaps(st, id);
    if (!g.length) return '';
    var head;
    if (n <= 1) head = '再结一房：须有名、八十两、一处安稳住处';
    else if (n === 2) head = '再生一房：须少侠之名、百五十两，且府中二进/房舍';
    else if (n === 3) head = '第三房：须闻名、三百两、两处房舍';
    else head = '再生一房需' + fameWord(Math.min(4, fameNeed(n))) + '之名、' + goldNeed(st, n) + '两、房舍不少于现有侧室数';
    return head + '。' + g.join('。');
  }

  /* 下一门差事（原 nextSideDuty：四职事里第一个没人管的） */
  function nextSideDuty(st) {
    var ids = D.SIDE_DUTY_IDS || [];
    var used = {};
    (st.romance.concubines || []).forEach(function (c) { if (c.role) used[c.role] = c.id; });
    for (var i = 0; i < ids.length; i++) if (!used[ids[i]]) return ids[i];
    return 'ledger';
  }

  /* 纳为侧室（原 takeConcubine） */
  function takeConcubine(st, id) {
    var r = BY_ID[id];
    if (!r) return { ok: false, why: '没有这个人。' };
    if (gaps(st, id).length) return { ok: false, why: conclusion(st, id) };
    var n = (st.romance.concubineCount || 0) + 1;
    st.gold = Math.max(0, (st.gold || 0) - goldNeed(st, n));
    var p = person(st, id);
    p.pledged = true;
    p.known = true;
    p.affection = 6;
    p.sideFirst = !st.romance.wifeId;
    st.romance.concubines.push({ id: id, role: nextSideDuty(st), order: n });
    st.romance.concubineCount = st.romance.concubines.length;
    st.romance.haremPath = true;
    st.romance.haremEnding = true;
    st.romance.settled = false;
    if (n >= 4) st.romance.crisisWeight = (st.romance.crisisWeight || 0) + 1;
    applyPenalty(st, r);
    var text = r.name + '归君侧室。';
    if (st.romance.wifeId) {
      st.romance.jealousy = 'open';
      st.romance.crisisWeight = (st.romance.crisisWeight || 0) + 1;
    }
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'side-' + id };
    return { ok: true, log: '【侧室】' + text, toast: text, tone: 'emerald', stageChanged: true };
  }

  /* 改派职事（原 cycleConcubineDuty：跳过已有人的职事） */
  function cycleDuty(st, id) {
    var ids = D.SIDE_DUTY_IDS || [];
    var list = st.romance.concubines || [];
    var mine = null;
    list.forEach(function (c) { if (c.id === id) mine = c; });
    if (!mine) return { ok: false, why: '她不在侧室。' };
    var used = {};
    list.forEach(function (c) { if (c.id !== id && c.role) used[c.role] = true; });
    var start = Math.max(0, ids.indexOf(mine.role));
    var next = mine.role;
    for (var step = 1; step <= ids.length; step++) {
      var cand = ids[(start + step) % ids.length];
      if (!used[cand]) { next = cand; break; }
    }
    mine.role = next;
    var line = next === 'ledger' ? '管账在，旬开销示意少一笔。不加攻击。'
      : next === 'pharmacy' ? '药局帮着看伤。不改伤害。'
        : next === 'swordroom' ? '剑房只讲教学后的那一句。不改形与势。'
          : '情报职事在。远方仍只给模糊一句。';
    return { ok: true, toast: (D.DUTY_WORD || {})[next] + '。' + line, tone: 'amber' };
  }

  /* 侧室扶正（原 promoteConcubine） */
  function promote(st, id) {
    if (st.romance.wifeId) return { ok: false, why: '正妻已在，不能再扶正。' };
    st.romance.concubines = (st.romance.concubines || []).filter(function (c) { return c.id !== id; });
    st.romance.concubineCount = st.romance.concubines.length;
    st.romance.haremPath = st.romance.concubineCount > 0;
    st.romance.haremEnding = st.romance.haremPath;
    st.romance.wifeId = id;
    st.romance.settled = st.romance.concubineCount === 0;
    person(st, id).affection = 6;
    return { ok: true, toast: '扶成正妻。侧室不再占这一位。', tone: 'emerald', stageChanged: true };
  }

  /* 家变三选（原 resolveHousehold）：安抚 / 冷处理 / 推迟一旬 */
  function resolveHousehold(st, which) {
    ensureState(st);
    if (which === 'soothe') {
      st.romance.jealousy = 'soothed';
      return { ok: true, toast: '安抚过了。主母把这件事按下。', tone: 'emerald' };
    }
    if (which === 'cold') {
      st.romance.jealousy = 'cold';
      return { ok: true, toast: '冷处理。结还在，先不爆发。', tone: 'amber' };
    }
    st.romance.jealousy = 'delayed';
    st.romance.crisisDueTurn = (st.turn || 1) + 1;
    st.romance.crisisWeight = (st.romance.crisisWeight || 0) + 1;
    return { ok: true, toast: '推迟一旬。下一旬这结还会回来。', tone: 'amber' };
  }

  /* 成亲·正妻（原 romanceMarry） */
  function marry(st, id) {
    var r = BY_ID[id];
    if (!r) return { ok: false, why: '没有这个人。' };
    var missing = missingMarriage(st, id);
    if (missing.length) return { ok: false, why: missing[0] };
    var s = sideMod();
    st.gold = Math.max(0, (st.gold || 0) - 40);
    st.romance.wifeId = id;
    st.romance.settled = (st.romance.concubineCount || 0) === 0;
    st.romance.haremPath = (st.romance.concubineCount || 0) > 0;
    person(st, id).affection = 6;
    applyPenalty(st, r);
    var rivalName = [r.rivalName, r.rival2Name].filter(Boolean).join('、');
    var text = r.name + '归君——' + rivalName + '闻讯色变。';
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'marry-' + id };
    if (s) {
      if (s.noteRelic) s.noteRelic(st, '情丝反噬', 'wedding_half');
      if (s.grantRelic) {
        s.grantRelic(st, 'wedding_half');
        if ((st.romance.concubineCount || 0) === 0) s.grantRelic(st, 'handkerchief');
        st.relics = st.relics || {};
        st.relics.feudId = r.rival || null;
      }
    }
    return { ok: true, log: '【成亲】' + text, toast: text, tone: 'emerald', stageChanged: true };
  }

  /* 寻仇两式（原 romanceRevengeTalk / romanceRevengeFight） */
  function revengeTalk(st, r) {
    var text = (r.rivalName || '故人') + '放了句狠话，人还在江湖上，没有落到某一格。';
    st.pendingRumor = { grade: 'stale', text: text, aboutId: 'revenge-' + r.id };
    return { ok: true, log: '【放话】' + text, toast: '只听到放话。', tone: 'amber' };
  }
  function revengeFight(st, r, env) {
    if (!env || !env.startDuel) return { ok: false, why: '这会儿不方便动手。' };
    var m = (st.masters || []).filter(function (x) { return x.id === r.rival; })[0];
    env.startDuel(st, {
      enemyName: r.rivalName || '仇人',
      enemyTitle: '闻讯色变',
      enemyStance: (m && m.stance) || 'gang',
      enemyPower: (m && m.power) || 70,
      enemyHp: (m && m.hp) || 140,
      contextTitle: '寻仇 · ' + (r.rivalName || ''),
      rewardGold: 8, rewardFame: 4, rewardExp: 12,
      sideCastResult: { kind: 'revenge', rival: r.rival }
    });
    return { ok: true, toast: '话已说到这一步，动手。', tone: 'amber' };
  }

  /* 三张弹窗的「选择描述」（演出随 E3b；本刀只定菜单与文案） */
  function confessDialog(st, id) {
    var r = BY_ID[id] || {};
    return {
      id: 'confess', tag: '表白', title: '把心意说清楚', loc: r.name || '',
      desc: '话说出去，可以定下来，也可以改日再提。失败不锁死。',
      choices: [{ id: 'yes', label: '确认心意' }, { id: 'later', label: '改日再提' }, { id: 'no', label: '先不说' }]
    };
  }
  function concubineDialog(st, id) {
    var r = BY_ID[id] || {};
    var g = gaps(st, id);
    var c = conclusion(st, id);
    var choices = [];
    if (!g.length) choices.push({ id: 'take', label: '确认纳妾' });
    choices.push({ id: 'later', label: '改日再议' });
    choices.push({ id: 'note', label: '扶正路径说明' });
    return {
      id: 'concubine', tag: '纳妾', title: '第' + ((st.romance.concubineCount || 0) + 1) + '房', loc: r.name || '',
      desc: c || ('纳' + (r.name || '她') + '为侧室。正妻仍只一位。'),
      choices: choices.slice(0, 3), gaps: g
    };
  }
  function revengeDialog(st, id) {
    var r = BY_ID[id] || {};
    var rookie = (st.turn || 1) <= 4;
    var choices = rookie
      ? [{ id: 'talk', label: '只听放话' }, { id: 'wait', label: '改日' }]
      : [{ id: 'fight', label: '应战' }, { id: 'talk', label: '只听放话' }, { id: 'wait', label: '改日' }];
    return {
      id: 'revenge', tag: '寻仇', title: (r.rivalName || '故人') + '放话', loc: '风声',
      desc: (r.rivalName || '故人') + '闻讯色变，放了句狠话。人不在你脚下这一格。',
      choices: choices
    };
  }
  function marryDialog(st, id) {
    var r = BY_ID[id] || {};
    var miss = missingMarriage(st, id);
    return {
      id: 'marry', tag: '成亲', title: '择日', loc: r.name || '',
      desc: miss.length ? miss.join('。') + '。'
        : '正妻只此一位。确认之后，' + (r.rivalName || '故人') + '会闻讯色变。',
      choices: miss.length
        ? [{ id: 'later', label: '改日再议' }]
        : [{ id: 'marry', label: '确认成亲' }, { id: 'later', label: '改日再议' }, { id: 'side', label: '先侧后正' }]
    };
  }

  /* 弹窗选择落账（原三件 window.*Pick 合并） */
  function pick(st, id, which, choiceId, env) {
    if (!BY_ID[id]) return { ok: false, why: '没有这个人。' };
    if (which === 'confess') {
      var cr = confessPick(st, id, choiceId);
      return { ok: true, toast: cr.toast, tone: cr.tone, stageChanged: choiceId === 'yes' };
    }
    if (which === 'marry') {
      if (choiceId === 'marry') return marry(st, id);
      if (choiceId === 'side') return { ok: true, dialog: concubineDialog(st, id) };
      return { ok: true, toast: '日子先记着。', tone: 'amber' };
    }
    if (which === 'concubine') {
      if (choiceId === 'take') return takeConcubine(st, id);
      if (choiceId === 'note') {
        return {
          ok: true,
          toast: st.romance.wifeId ? '正妻已在，侧室不能当场扶正。' : '还没有正妻时，侧室可以再扶正。',
          tone: 'amber'
        };
      }
      return { ok: true, toast: gaps(st, id).length ? conclusion(st, id) : '日子先记着。', tone: 'amber' };
    }
    if (which === 'revenge') {
      var r = BY_ID[id];
      if (choiceId === 'fight') return revengeFight(st, r, env);
      if (choiceId === 'talk') return revengeTalk(st, r);
      return { ok: true, toast: '改日再说。', tone: 'amber' };
    }
    return { ok: false, why: '这一支没有后续。' };
  }

  /* 动作清单（原 romanceActionsFor，逐分支同序） */
  function actionsFor(st, id) {
    var r = BY_ID[id];
    if (!r) return null;
    var sg = stage(st, id);
    var p = person(st, id);
    function used(a) { return p.act[a] === st.turn; }
    if (sg === 'wife' && st.romance.jealousy === 'open') {
      return [
        { id: 'rom_soothe', label: '安抚', primary: true, hint: '把妒忌按下' },
        { id: 'rom_cold', label: '冷处理', hint: '先放着' },
        { id: 'rom_delay', label: '推迟一旬', hint: '家变往后挪' }
      ];
    }
    if (sg === 'side') {
      var mine = (st.romance.concubines || []).filter(function (c) { return c.id === id; })[0];
      var duty = (D.DUTY_WORD || {})[(mine && mine.role) || 'ledger'] || '';
      var third = st.romance.wifeId
        ? { id: 'rom_promote_note', label: '扶正说明', hint: '正妻已在，不能再立一位' }
        : { id: 'rom_promote', label: '扶正', hint: '正妻之位还空着' };
      return [
        { id: 'rom_duty', label: '改派职事', primary: true, hint: '眼下是' + duty },
        { id: 'rom_side_chat', label: '闲话', hint: '不加拳脚，不加气血' },
        third
      ];
    }
    if (sg === 'wife') {
      var feud = !!(r.rival && st.outcomeFlags && st.outcomeFlags.rivalryOn && st.outcomeFlags.rivalryOn[r.rival]);
      return [
        { id: 'rom_talk', label: '议事', primary: true, hint: '主母位先留一句' },
        { id: 'rom_walk', label: '出游', hint: used('rom_walk') ? '这旬出过门' : '就在这座城里走走', disabled: used('rom_walk') },
        feud ? { id: 'rom_revenge', label: '寻仇放话', hint: '教学期只听放话' } : { id: 'rom_event', label: '情感事件', hint: '不成第二房' }
      ];
    }
    if (sg === 'pledge') {
      if (st.romance.wifeId && st.romance.wifeId !== id) {
        return [
          { id: 'rom_concubine', label: '纳为侧室', primary: true, hint: '按这一房的门槛' },
          { id: 'rom_wait', label: '暂缓', hint: '日子可以再挑' },
          { id: 'rom_promote_note', label: '扶正说明', hint: '正妻仍只一位' }
        ];
      }
      return [
        { id: 'rom_marry', label: '择日成亲', primary: true, hint: '正妻只此一位' },
        { id: 'rom_side', label: '先侧后正', hint: '先入侧室，日后再扶正' },
        { id: 'rom_wait', label: '暂缓', hint: '日子可以再挑' }
      ];
    }
    if (sg === 'love') {
      return [
        { id: 'rom_probe', label: '定情试探', primary: true, hint: used('rom_probe') ? '这旬问过了' : '先看她怎么应', disabled: used('rom_probe') },
        { id: 'rom_confess', label: '表白', hint: '确认心意，也可能改日' },
        { id: 'rom_hold', label: '暂缓', hint: '先不把话说死' }
      ];
    }
    if (sg === 'warm') {
      return [
        { id: 'rom_date', label: '约会小事', primary: true, hint: used('rom_date') ? '这旬陪过了' : '一件小事', disabled: used('rom_date') },
        { id: 'rom_wish', label: '助心愿', hint: used('rom_wish') ? '这旬帮过了' : '帮她一件', disabled: used('rom_wish') },
        { id: 'rom_token', label: '赠信物', hint: used('rom_token') ? '信物已送' : '6 文', disabled: used('rom_token') || st.gold < 6, why: st.gold < 6 ? '纹银不足' : '' }
      ];
    }
    return [
      { id: 'rom_hello', label: '寒暄', primary: true, hint: used('rom_hello') ? '这旬问过安' : '生分的第一面', disabled: used('rom_hello') },
      { id: 'rom_gift', label: '赠小物', hint: used('rom_gift') ? '小物已送' : '4 文', disabled: used('rom_gift') || st.gold < 4, why: st.gold < 4 ? '纹银不足' : '' },
      { id: 'rom_invite', label: '邀同行', hint: used('rom_invite') ? '这旬同行过' : '只在这座城里', disabled: used('rom_invite') }
    ];
  }

  /* 动作效果（E2 子集：寒暄/小物/同行/小事/心愿/信物/试探/表白/闲话/出游/暂缓） */
  function act(st, id, actionId) {
    var r = BY_ID[id];
    if (!r) return { ok: false, why: '没有这个人。' };
    var list = actionsFor(st, id) || [];
    var a = list.filter(function (x) { return x.id === actionId; })[0];
    if (!a) return { ok: false, why: '这会儿做不了。' };
    if (a.disabled) return { ok: false, why: a.why || a.hint || '这会儿不行。' };
    var out = { ok: true, log: '', toast: '', tone: 'emerald', choices: null, dialog: null, stageChanged: false };
    var g;
    if (actionId === 'rom_hello') { if (!once(st, id, 'rom_hello')) return { ok: false, why: '这旬问过安' }; g = gain(st, id, 1, '寒暄过了。她还生分。'); }
    else if (actionId === 'rom_gift') { if (st.gold < 4 || !once(st, id, 'rom_gift')) return { ok: false, why: '小物已送' }; st.gold -= 4; g = gain(st, id, 1, '小物收下了。'); }
    else if (actionId === 'rom_invite') { if (!once(st, id, 'rom_invite')) return { ok: false, why: '这旬同行过' }; g = gain(st, id, 1, '她答应在这座城里走一走。'); }
    else if (actionId === 'rom_date') { if (!once(st, id, 'rom_date')) return { ok: false, why: '这旬陪过了' }; g = gain(st, id, 1, '小事做完，她留意你了。'); }
    else if (actionId === 'rom_wish') { if (!once(st, id, 'rom_wish')) return { ok: false, why: '这旬帮过了' }; g = gain(st, id, 1, '心愿帮上了。'); }
    else if (actionId === 'rom_token') { if (st.gold < 6 || !once(st, id, 'rom_token')) return { ok: false, why: '信物已送' }; st.gold -= 6; g = gain(st, id, 1, '信物到了她手里。'); }
    else if (actionId === 'rom_probe') { if (!once(st, id, 'rom_probe')) return { ok: false, why: '这旬问过了' }; g = gain(st, id, 1, '她没有躲开这个试探。'); }
    else if (actionId === 'rom_walk') { if (!once(st, id, 'rom_walk')) return { ok: false, why: '这旬出过门' }; st.fame += 1; out.toast = '就在这座城里走了走。'; }
    else if (actionId === 'rom_confess') { out.dialog = confessDialog(st, id); }
    else if (actionId === 'rom_hold') { out.toast = '先不把话说死。'; out.tone = 'amber'; }
    else if (actionId === 'rom_wait') { out.toast = '日子可以再挑。'; out.tone = 'amber'; }
    else if (actionId === 'rom_side_chat') { out.toast = '闲话一句。拳脚不加，气血不加。'; out.tone = 'amber'; }
    else if (actionId === 'rom_talk') { out.toast = '主母位先留着，不加拳脚。'; out.tone = 'amber'; }
    else if (actionId === 'rom_event') { out.toast = '这一段只是家常，不成第二房。'; out.tone = 'amber'; }
    else if (actionId === 'rom_promote_note') { out.toast = st.romance.wifeId ? '正妻已在，侧室不能当场扶正。' : '正妻之位还空着，可以扶正。'; out.tone = 'amber'; }
    /* ── E3a（册313）：婚嫁 / 后院 / 差事 接线 ── */
    else if (actionId === 'rom_marry') { out.dialog = marryDialog(st, id); }
    else if (actionId === 'rom_side' || actionId === 'rom_concubine') { out.dialog = concubineDialog(st, id); }
    else if (actionId === 'rom_revenge') { out.dialog = revengeDialog(st, id); }
    else if (actionId === 'rom_promote') { var pr = promote(st, id); if (!pr.ok) return pr; out.toast = pr.toast; out.tone = pr.tone; out.stageChanged = true; }
    else if (actionId === 'rom_duty') { var cd = cycleDuty(st, id); if (!cd.ok) return cd; out.toast = cd.toast; out.tone = cd.tone; }
    else if (actionId === 'rom_soothe' || actionId === 'rom_cold' || actionId === 'rom_delay') {
      var hh = resolveHousehold(st, actionId === 'rom_soothe' ? 'soothe' : (actionId === 'rom_cold' ? 'cold' : 'delay'));
      out.toast = hh.toast; out.tone = hh.tone;
    }
    else return { ok: false, why: '这会儿做不了。' };
    if (g) { out.toast = g.toast; out.tone = g.tone; out.stageChanged = g.stageChanged; }
    return out;
  }

  /* 表白三选一（原 romanceConfessPick） */
  function confessPick(st, id, which) {
    var p = person(st, id);
    if (which === 'yes') { p.pledged = true; p.affection = 6; p.known = true; return { toast: '有约了。心意相通。', tone: 'emerald' }; }
    if (which === 'later') { p.affection = Math.max(2, p.affection - 1); p.pledged = false; return { toast: '改日再提。事情没有锁死。', tone: 'amber' }; }
    return { toast: '话先收回来。', tone: 'amber' };
  }

  return {
    list: LIST,
    castOf: function (id) { return BY_ID[id] || null; },
    gain: gain,
    once: once,
    note: note,
    missingMarriage: missingMarriage,
    applyPenalty: applyPenalty,
    actionsFor: actionsFor,
    act: act,
    confessPick: confessPick,
    /* E3a：后院 / 差事 / 婚嫁 */
    pick: pick,
    marry: marry,
    marryDialog: marryDialog,
    takeConcubine: takeConcubine,
    concubineDialog: concubineDialog,
    revengeDialog: revengeDialog,
    revengeTalk: revengeTalk,
    revengeFight: revengeFight,
    cycleDuty: cycleDuty,
    dutyWord: function (id) { return (D.DUTY_WORD || {})[id] || '职事'; },
    promote: promote,
    resolveHousehold: resolveHousehold,
    gaps: gaps,
    conclusion: conclusion,
    nextSideDuty: nextSideDuty,
    fameTier: fameTier,
    fameWord: fameWord,
    goldNeed: goldNeed,
    fameNeed: fameNeed,
    estateJin: estateJin,
    renownOk: renownOk,
    houseOk: houseOk,
    jealousyBlocking: jealousyBlocking,
    ensureState: ensureState,
    person: person,
    stage: stage,
    stageWord: stageWord,
    meet: meet,
    here: here,
    intel: intel,
    visibleList: visibleList,
    hasBadge: hasBadge
  };
});
