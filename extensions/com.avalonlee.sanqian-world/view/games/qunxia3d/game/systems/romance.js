/* systems/romance.js — P4-E 情缘（册311 · E1 基建八件 · 纯逻辑）
 * 迁移源 = view/games/qunxia/game.html :13921–:14739（头注：相识→成亲·正妻；无倾心不入口；
 * 不推进多房；不加攻击气血）。本刀只落**状态与查询**：ensureState / person / stage / meet /
 * here / intel / visibleList / hasBadge；交互（actionsFor/act/gain/once/penalty）随 E2，
 * 后院与差事（concubine/household/duty）随 E3。
 *
 * 偏差（显式登记）：
 *   ① `romanceHere` 复用本仓 `systems.side.castHere(st, region)`（原版 `sideCastHere()` 无参取全局）。
 *   ② 头像不渲染（同 A/B 拍板），`art` 已由生成器占位化为空串。
 *   ③ 前台只出阶段词（ROMANCE_STAGE_WORD），**好感数值不出屏**——漏出即 bug。
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

  /* 动作清单（原 romanceActionsFor，逐分支同序；E3 的四类动作照列、act 里回「尚未接入」） */
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
    var out = { ok: true, log: '', toast: '', tone: 'emerald', choices: null, stageChanged: false };
    var g;
    if (actionId === 'rom_hello') { if (!once(st, id, 'rom_hello')) return { ok: false, why: '这旬问过安' }; g = gain(st, id, 1, '寒暄过了。她还生分。'); }
    else if (actionId === 'rom_gift') { if (st.gold < 4 || !once(st, id, 'rom_gift')) return { ok: false, why: '小物已送' }; st.gold -= 4; g = gain(st, id, 1, '小物收下了。'); }
    else if (actionId === 'rom_invite') { if (!once(st, id, 'rom_invite')) return { ok: false, why: '这旬同行过' }; g = gain(st, id, 1, '她答应在这座城里走一走。'); }
    else if (actionId === 'rom_date') { if (!once(st, id, 'rom_date')) return { ok: false, why: '这旬陪过了' }; g = gain(st, id, 1, '小事做完，她留意你了。'); }
    else if (actionId === 'rom_wish') { if (!once(st, id, 'rom_wish')) return { ok: false, why: '这旬帮过了' }; g = gain(st, id, 1, '心愿帮上了。'); }
    else if (actionId === 'rom_token') { if (st.gold < 6 || !once(st, id, 'rom_token')) return { ok: false, why: '信物已送' }; st.gold -= 6; g = gain(st, id, 1, '信物到了她手里。'); }
    else if (actionId === 'rom_probe') { if (!once(st, id, 'rom_probe')) return { ok: false, why: '这旬问过了' }; g = gain(st, id, 1, '她没有躲开这个试探。'); }
    else if (actionId === 'rom_walk') { if (!once(st, id, 'rom_walk')) return { ok: false, why: '这旬出过门' }; st.fame += 1; out.toast = '就在这座城里走了走。'; }
    else if (actionId === 'rom_confess') { out.choices = ['确认心意', '改日再提', '先不说']; out.tag = '表白'; }
    else if (actionId === 'rom_hold') { out.toast = '先不把话说死。'; out.tone = 'amber'; }
    else if (actionId === 'rom_wait') { out.toast = '日子可以再挑。'; out.tone = 'amber'; }
    else if (actionId === 'rom_side_chat') { out.toast = '闲话一句。拳脚不加，气血不加。'; out.tone = 'amber'; }
    else if (actionId === 'rom_talk') { out.toast = '主母位先留着，不加拳脚。'; out.tone = 'amber'; }
    else if (actionId === 'rom_event') { out.toast = '这一段只是家常，不成第二房。'; out.tone = 'amber'; }
    else if (actionId === 'rom_promote_note') { out.toast = st.romance.wifeId ? '正妻已在，侧室不能当场扶正。' : '正妻之位还空着，可以扶正。'; out.tone = 'amber'; }
    else return { ok: false, why: '这支还没接（E3）' };
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
