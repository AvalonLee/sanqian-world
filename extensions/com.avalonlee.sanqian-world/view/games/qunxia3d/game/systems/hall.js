/* systems/hall.js — P4-F 立号开宗（册316 · F1 立号与门面 · 纯逻辑）
 * 迁移源 = view/games/qunxia/game.html :14745–:15811（头注口径：立号是「挂匾」不是建立宗门模拟器；
 * 门人不加拳脚气血，经营只走饷银一条账）。F1 只落**状态 / 判据 / 立号一次**；
 * 分舵·营寨·宗旨·每旬结算随 F2，门人与市井招募随 F3。
 *
 * 偏差（显式登记）：
 *   ① 隐庐进数**不另抄一份**：直接用 `systems.romance.estateJin`（原 `hermitageJin` 同一公式，
 *      册313 已在 romance 落码）——hall → romance 单向依赖，无环。
 *   ② 原 `ensureHallState` 的 `faction` 初值 17 键逐字保留；运行键（foundedTurn/lastLedger/
 *      lastEvent/collapseShown/seizureShown/wantedShown）按用到才写，不预置。
 *   ③ 原版挂匾弹窗里的「改扯山旗」在 F1 只在**条件满足**时出来（`banditPathOpen`），
 *      落草后的营寨经营随 F2。
 *   ④ 原 `renderHallBadge` 的「本门」角标改挂 3D 版 `#hud-hall`；概览四页（门人/地盘/规矩/邸报）
 *      分 F1~F3 逐批补齐。
 *   ⑤ **招募可见性修正原版缺陷**：原 `hallRecruitVisible` 写 `fav[key] < 2`，`streetFavor` 无记录时
 *      `undefined < 2` 恒 false ⇒ 陌生人反而可劝。本仓改 `(fav[key] || 0) < 2`，并在 S42a 显式记
 *      「原版 true / 新版 false」的偏差（不修就是「立号后随便拉人」）。
 *   ⑥ 原 `openHallRecruit` 把弹窗与 street-drawer 关闭揉在一起 → 拆成 `beginRecruit`（校验 + 占
 *      「同时只劝两人」名额 + 返描述）/ `recruit`（落账）；`which='later'` **不撤占位**（原版同口径）。
 * 副作用纪律：只改传入 st（与 env 回调），不碰 DOM/THREE；存档与重渲由 app 负责。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.QX3D = root.QX3D || {};
    root.QX3D.systems = root.QX3D.systems || {};
    root.QX3D.systems.hall = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../data/hall.js')
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));
  var NAME_POOL = D.HALL_NAME_POOL || [];
  var FAME_WORDS = ['无名', '小有', '响亮', '震慑', '忌惮'];

  function romMod() {
    if (typeof module !== 'undefined' && module.exports) return require('./romance.js');
    return root.QX3D && root.QX3D.systems ? root.QX3D.systems.romance : null;
  }
  function sideMod() {
    if (typeof module !== 'undefined' && module.exports) return require('./side.js');
    return root.QX3D && root.QX3D.systems ? root.QX3D.systems.side : null;
  }

  /* ── 状态（原 ensureHallState：17 键逐字）───────────────────────────────── */
  function ensureState(st) {
    var host = st;
    if (!host) return null;
    if (!host.faction || typeof host.faction !== 'object') {
      host.faction = {
        founded: false, name: '', disciples: [], recruitLines: [], doctrine: '行侠',
        vacantManor: false, foundedTurn: 0
      };
    }
    var f = host.faction;
    if (typeof f.founded !== 'boolean') f.founded = false;
    if (!f.name) f.name = '';
    if (!Array.isArray(f.disciples)) f.disciples = [];
    if (!Array.isArray(f.recruitLines)) f.recruitLines = [];
    if (!f.doctrine) f.doctrine = '行侠';
    if (!f.doctrineId) f.doctrineId = f.doctrine === '唯利' ? 'profit' : (f.doctrine === '中立营生' ? 'trade' : 'xia');
    if (typeof f.doctrineTurn !== 'number') f.doctrineTurn = 0;
    if (!Array.isArray(f.branches)) f.branches = [];
    if (!Array.isArray(f.camps)) f.camps = [];
    if (typeof f.bandit !== 'boolean') f.bandit = false;
    if (typeof f.official !== 'boolean') f.official = false;
    if (typeof f.treasury !== 'number') f.treasury = 0;
    if (typeof f.brokeStreak !== 'number') f.brokeStreak = 0;
    if (typeof f.dissolved !== 'boolean') f.dissolved = false;
    if (typeof f.seized !== 'boolean') f.seized = false;
    if (typeof f.fameRank !== 'number') f.fameRank = 0;
    if (typeof f.vacantManor !== 'boolean') f.vacantManor = false;
    if (!host.streetFavor || typeof host.streetFavor !== 'object') host.streetFavor = {};
    return f;
  }
  function hallState(st) { ensureState(st); return st.faction; }

  /* ── 三条核心算式（原 hallOpenBranches/Camps/Houses/FameRank/Cap）───────── */
  function estateJin(st) {
    var r = romMod();
    return r && r.estateJin ? r.estateJin(st) : 1;
  }
  function openBranches(st) {
    return (hallState(st).branches || []).filter(function (b) { return !b.sealed; }).length;
  }
  function camps(st) { return (hallState(st).camps || []).length; }
  function houses(st) {
    var n = estateJin(st) + openBranches(st) + camps(st);
    if (hallState(st).seized) n = Math.max(0, n - 1);
    return n;
  }
  function fameRank(st) {
    var f = hallState(st);
    var people = (f.disciples || []).length + openBranches(st) + camps(st);
    if (people >= 8 || (f.bandit && people >= 4)) return 4;
    if (people >= 6) return 3;
    if (people >= 3 || openBranches(st) >= 1) return 2;
    if (people >= 1) return 1;
    return 0;
  }
  function fameWord(st) { return FAME_WORDS[fameRank(st)]; }
  function jinWord(n) { return n >= 3 ? '三进' : n === 2 ? '二进' : '一进'; }
  function cap(st) { return 3 + houses(st) + fameRank(st); }
  function disciples(st) { return hallState(st).disciples; }
  function member(st, id) {
    var list = disciples(st);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ── 立号五闸（原 founding* 六件；顺序即 gaps 输出顺序）─────────────────── */
  function foundingFameEased(st) {
    var s = st.scrollProposition;
    return !!(s && (s.id === 'xiaming' || s.id === 'qiyu'));
  }
  function foundingFameOk(st) {
    var fame = st.fame || 0;
    if (fame >= 48) return true;
    return foundingFameEased(st) && fame >= 36;
  }
  function jobFriendCount(st) {
    var fav = st.streetFavor || {};
    return Object.keys(fav).filter(function (k) { return fav[k] >= 2 && k.indexOf(':officer:') < 0; }).length;
  }
  /* 原版只认 pledge|wife **不认 side**（侧室已 pledged=true，但 stage 先返回 side）——
   * 这条看似 bug 的判定按原样保留，免得「纳了妾反而说人望不够」的口径被悄悄改掉。 */
  function foundingHasPledge(st) {
    var r = romMod();
    if (!r || !r.list) return false;
    return r.list.some(function (x) {
      var sg = r.stage(st, x.id);
      return sg === 'pledge' || sg === 'wife';
    });
  }
  function foundingRenownOk(st) { return foundingHasPledge(st) || jobFriendCount(st) >= 2; }
  function foundingWanted(st) { return (st.court && st.court.wanted) || 0; }
  function foundingResidenceOk(st) { return estateJin(st) >= 2 || !!hallState(st).vacantManor; }
  function foundingGaps(st) {
    var gaps = [];
    if (!foundingFameOk(st)) gaps.push({ id: 'fame', text: '立号需少侠之名' });
    var gold = st.gold || 0;
    if (gold < 200) gaps.push({ id: 'gold', text: '尚缺盘缠' + (200 - gold) + '两' });
    if (!foundingResidenceOk(st)) gaps.push({ id: 'home', text: '需一处可挂匾的住处' });
    if (!foundingRenownOk(st)) gaps.push({ id: 'renown', text: '门下尚无一人愿随' });
    if (foundingWanted(st) > 2) gaps.push({ id: 'wanted', text: '官身犯险，或改日再议' });
    return gaps;
  }
  function foundingMetLabels(st) {
    var labels = [];
    if (foundingFameOk(st)) labels.push('侠名');
    if ((st.gold || 0) >= 200) labels.push('盘缠');
    if (foundingResidenceOk(st)) labels.push('住处');
    if (foundingRenownOk(st)) labels.push('人望');
    if (foundingWanted(st) <= 2) labels.push('官身');
    return labels;
  }
  /* 山寨路线（原 banditPathOpen）：通缉 ≥3 或残卷「仇杀」 */
  function banditPathOpen(st) {
    var wanted = (st.court && st.court.wanted) || 0;
    var scroll = st.scrollProposition && st.scrollProposition.id;
    return wanted >= 3 || scroll === 'chousha';
  }

  /* ── 挂匾（原 hallPickName + hallFoundPick，去 DOM）─────────────────────── */
  function pickName(typed, rnd) {
    var clean = String(typed || '').trim().slice(0, 8);
    if (clean) return clean;
    var r = typeof rnd === 'function' ? rnd : Math.random;
    return NAME_POOL[Math.floor(r() * NAME_POOL.length)] || '本门';
  }
  function found(st, opts) {
    var o = opts || {};
    ensureState(st);
    var f = st.faction;
    if (f.founded) return { ok: false, why: '本门已经立过号了。' };
    var bandit = !!o.bandit;
    if (bandit && !banditPathOpen(st)) return { ok: false, why: '山寨路线未开。' };
    var gaps = foundingGaps(st).filter(function (g) { return !(bandit && g.id === 'wanted'); });
    if (gaps.length) return { ok: false, why: gaps[0].text, gaps: gaps };
    var name = pickName(o.name, o.rnd);
    st.gold = Math.max(0, (st.gold || 0) - 200);
    f.founded = true;
    f.name = name;
    f.foundedTurn = st.turn || 0;
    f.doctrine = bandit ? '唯利' : '行侠';
    f.doctrineId = bandit ? 'profit' : 'xia';
    f.doctrineTurn = st.turn || 0;
    var s = sideMod();
    if (s && s.grantRelic) s.grantRelic(st, 'flag_corner');
    if (bandit) {
      f.bandit = true;
      f.camps = [{ id: 'wild', name: '野路山寨' }];
      if (st.court) {
        st.court.merit = Math.max(-100, (st.court.merit || 0) - 8);
        st.court.border = Math.max(-50, (st.court.border || 0) - 6);
      }
    }
    var text = bandit ? ('江湖杂报：' + name + '扯了山旗。') : ('江湖杂报：' + name + '挂匾。');
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'hall-found' };
    return {
      ok: true, name: name, bandit: bandit, log: '【立号】' + text,
      toast: bandit ? (name + '扯了山旗。') : (name + '挂匾了。'), tone: 'emerald'
    };
  }

  /* ── F2（册317）：门派经营 —— 分舵 / 落草 / 宗旨 / 每旬结算 / 破产 / 通缉 / 抄家 / 官宣 ── */
  function hallHostilityHigh(st) {
    var court = st.court;
    if (!court) return false;
    return (court.wanted || 0) >= 3 || (court.merit || 0) <= -30;
  }
  /* 同城人望（原 cityFriendly）：有约/两个市井之交，或侠名 ≥24 或 1 个市井之交 */
  function cityFriendly(st, regionId) {
    if (!regionId || st.currentRegion !== regionId) return false;
    if (foundingRenownOk(st)) return true;
    if ((st.fame || 0) >= 24) return true;
    return jobFriendCount(st) >= 1;
  }
  function branchGaps(st, regionId) {
    var f = hallState(st);
    var gaps = [];
    if (!f.founded) gaps.push('还没立号');
    if (!cityFriendly(st, regionId)) gaps.push('这座城的人望还不够');
    if ((st.gold || 0) < 80) gaps.push('尚缺盘缠' + (80 - (st.gold || 0)) + '两');
    var here = (f.branches || []).filter(function (b) { return b.regionId === regionId && !b.sealed; })[0];
    if (here) gaps.push('这座城已有一分舵');
    return gaps;
  }
  /* 设分舵（原 branchPick 0）：−80 两，一城一处；已封的原地解封 */
  function openBranch(st, regionId) {
    var f = hallState(st);
    var gaps = branchGaps(st, regionId);
    if (gaps.length) return { ok: false, why: gaps[0], gaps: gaps };
    st.gold -= 80;
    var sealed = (f.branches || []).filter(function (b) { return b.regionId === regionId && b.sealed; })[0];
    if (sealed) sealed.sealed = false;
    else f.branches.push({ regionId: regionId, sealed: false });
    var text = '江湖杂报：' + (f.name || '本门') + '多了一处房舍。';
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'branch' };
    return { ok: true, toast: '分舵开设了。房舍加了一处。', tone: 'emerald' };
  }
  /* 撤资（原 branchPick 2）：撤一处（含被封的），退 30 两 */
  function closeBranch(st, regionId) {
    var f = hallState(st);
    var idx = -1;
    (f.branches || []).forEach(function (b, i) { if (b.regionId === regionId) idx = i; });
    if (idx < 0) return { ok: false, why: '这里还没有分舵。' };
    f.branches.splice(idx, 1);
    st.gold = (st.gold || 0) + 30;
    return { ok: true, toast: '分舵撤了，退回一些盘缠。', tone: 'amber' };
  }
  /* 落草（原 hallRaiseBandit）：营寨 +1、功名 −8、边谊 −6（`found` 的落草支复用同一后果） */
  function raiseBandit(st) {
    var f = hallState(st);
    if (f.bandit) return { ok: false, why: '山旗已经扯上了。' };
    if (!banditPathOpen(st)) return { ok: false, why: '山寨路线未开。' };
    f.bandit = true;
    if (!(f.camps || []).length) f.camps.push({ id: 'wild', name: '野路山寨' });
    if (st.court) {
      st.court.merit = Math.max(-100, (st.court.merit || 0) - 8);
      st.court.border = Math.max(-50, (st.court.border || 0) - 6);
    }
    var text = '江湖杂报：' + (f.name || '本门') + '扯了山旗。';
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'bandit' };
    return { ok: true, toast: '山旗扯上了。敌对涨了一截。', tone: 'amber' };
  }
  /* 宗旨（原 hallSetDoctrine）：三选，同旬只能改一次 */
  var DOCTRINE = { xia: '行侠', trade: '中立营生', profit: '唯利' };
  function setDoctrine(st, id) {
    var f = hallState(st);
    if (!DOCTRINE[id]) return { ok: false, why: '没有这一门规矩。' };
    if (f.doctrineTurn === (st.turn || 1) && f.doctrineId) return { ok: false, why: '这旬已经改过规矩，不能连改。' };
    if (f.doctrineId === id) return { ok: false, why: '眼下就是这个宗旨。' };
    f.doctrineId = id;
    f.doctrine = DOCTRINE[id];
    f.doctrineTurn = st.turn || 1;
    return { ok: true, toast: '规矩改成' + f.doctrine + '。', tone: 'emerald' };
  }

  /* 每旬结算（原 settleHallOnNewTurn）：敌对封舵 → 入/饷/余 → 声望档 → 破产 → 通缉两档 */
  function settleOnNewTurn(st) {
    var f = hallState(st);
    var out = { ran: false, sealed: 0, rankChanged: false, collapsed: false, wanted: false, seized: false, income: 0, payroll: 0, ledger: 0 };
    if (!f.founded || f.dissolved) return out;
    out.ran = true;
    if (hallHostilityHigh(st)) {
      (f.branches || []).forEach(function (b) { if (!b.sealed) { b.sealed = true; out.sealed += 1; } });
      if (out.sealed) {
        st.pendingRumor = { grade: 'conflict', text: '江湖杂报：分舵被封，房舍先不算那一处。', aboutId: 'seal' };
      }
    }
    var border = (st.court && st.court.border) || 0;
    var yanyun = (st.court && st.court.yanyun) || 0;
    var income = openBranches(st) * 12 + camps(st) * 22 + (estateJin(st) >= 2 ? 6 : 0);
    if (border >= 10) income += 4;
    if (yanyun >= 2) income = Math.max(0, income - 4);
    var payroll = (f.disciples || []).length * 4;
    var ledger = income - payroll;
    out.income = income;
    out.payroll = payroll;
    out.ledger = ledger;
    f.treasury = (f.treasury || 0) + ledger;
    f.lastLedger = '本旬入' + income + '，饷' + payroll + '，余' + f.treasury + '。';
    if ((f.disciples || []).length && f.eventTurn !== st.turn) {
      f.eventTurn = st.turn;
      var notes = ['有人请了半日假。', '有人把账送上来。', '有人只说了一句闲话。'];
      f.lastEvent = notes[Math.abs(st.turn) % notes.length];
    }
    var rank = fameRank(st);
    if (rank !== f.fameRank) {
      f.fameRank = rank;
      out.rankChanged = true;
      st.pendingRumor = { grade: 'reliable', text: '江湖杂报：' + (f.name || '本门') + '声望到了' + fameWord(st) + '。', aboutId: 'fame-rank' };
    }
    if (f.treasury <= 0) {
      f.brokeStreak = (f.brokeStreak || 0) + 1;
      if (f.brokeStreak >= 2 && !f.collapseShown) { f.collapseShown = true; out.collapsed = true; }
    } else {
      f.brokeStreak = 0;
      f.collapseShown = false;
    }
    var wanted = (st.court && st.court.wanted) || 0;
    if (wanted >= 4 && !f.seizureShown) {
      f.seized = true;
      f.seizureShown = true;
      out.seized = true;
    } else if (wanted >= 3 && !f.bandit && !f.wantedShown) {
      f.wantedShown = true;
      out.wanted = true;
    }
    return out;
  }

  /* 破产三选（原 collapsePick）：垫 30 / 遣散一人 / 散伙 */
  function propUp(st) {
    if ((st.gold || 0) < 30) return { ok: false, why: '尚缺盘缠' + (30 - (st.gold || 0)) + '两' };
    var f = hallState(st);
    st.gold -= 30;
    f.treasury = (f.treasury || 0) + 30;
    f.brokeStreak = 0;
    return { ok: true, toast: '垫进三十两。饷银回了一截。', tone: 'emerald' };
  }
  function dismissOne(st) {
    var f = hallState(st);
    var person = (f.disciples || []).pop();
    f.brokeStreak = 0;
    if (!person) return { ok: false, why: '没有可遣的门人。' };
    return { ok: true, toast: person.name + '离开了。拳脚不加，气血不加。', tone: 'amber' };
  }
  function dissolveHall(st) {
    var f = hallState(st);
    var s = sideMod();
    if (s && s.grantRelic) s.grantRelic(st, 'flag_corner');
    f.dissolved = true;
    f.disciples = [];
    f.branches = [];
    f.camps = [];
    f.brokeStreak = 0;
    return { ok: true, toast: '散伙了。人去楼空。', tone: 'amber' };
  }

  /* 通缉三选（原 wantedHallPick）：洗白 −40 两并解封一处 / 落草 / 躲（饷 −4） */
  function washWanted(st) {
    var f = hallState(st);
    if ((st.gold || 0) < 40) return { ok: false, why: '尚缺盘缠' + (40 - (st.gold || 0)) + '两' };
    st.gold -= 40;
    if (st.court) st.court.wanted = Math.max(0, (st.court.wanted || 0) - 1);
    var sealed = (f.branches || []).filter(function (b) { return b.sealed; })[0];
    if (sealed) sealed.sealed = false;
    return { ok: true, toast: '洗去一档。被封的分舵松开一处。', tone: 'emerald' };
  }
  function hideWanted(st) {
    var f = hallState(st);
    f.treasury = (f.treasury || 0) - 4;
    return { ok: true, toast: '先躲过这一旬。饷银又薄了一点。', tone: 'amber' };
  }

  /* 抄家三选（原 seizurePick）：抗 / 散财求情 / 逃（逃不清 seized） */
  function resistSeizure(st) {
    var f = hallState(st);
    if (st.court) st.court.merit = Math.max(-100, (st.court.merit || 0) - 6);
    st.fame = (st.fame || 0) + 2;
    f.seized = false;
    return { ok: true, toast: '抗过了。功名再沉一点，侠名厚一点。', tone: 'amber' };
  }
  function paySeizure(st) {
    var f = hallState(st);
    if ((st.gold || 0) < 30) return { ok: false, why: '尚缺盘缠' + (30 - (st.gold || 0)) + '两' };
    st.gold -= 30;
    f.treasury = (f.treasury || 0) + 10;
    f.seized = false;
    return { ok: true, toast: '散了财。房舍的扣先松开。', tone: 'emerald' };
  }
  function fleeSeizure(st) {
    var f = hallState(st);
    if (f.disciples.length) f.disciples.pop();
    return { ok: true, toast: '逃过这一遭。人少了一个。', tone: 'amber' };
  }

  /* 邸报 / 官宣门派（原 openHallGazette + gazettePick 1）：功名 ≥40 且应诏 ≥1 */
  function canOfficial(st) {
    var f = hallState(st);
    var court = st.court || {};
    var answered = (court.flags && court.flags.answered) || 0;
    return !!f.founded && !f.bandit && !f.official && (court.merit || 0) >= 40 && answered >= 1;
  }
  function goOfficial(st) {
    var f = hallState(st);
    if (!canOfficial(st)) return { ok: false, why: '功名或应诏还不够，也不能从山寨里官宣。' };
    f.official = true;
    if (st.court) st.court.merit = Math.max(-100, (st.court.merit || 0) - 10);
    var text = '江湖杂报：' + (f.name || '本门') + '得了官宣。';
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'official' };
    return { ok: true, toast: '官宣了。功名折了一截。', tone: 'emerald' };
  }

  /* ── F3（册318）：门人与市井招募（原 :15686–:15806）────────────────────────
   * 三闸：jobId ∈ 三岗 · 已立号 · favor ≥2；另有两道限：门人上限 cap、同时只劝两人。
   * 偏差：原版 `openHallRecruit` 把三件弹窗与 street-drawer 关闭揉在一起，这里拆成
   * `beginRecruit`（校验 + 挂 recruitLines，返回描述）与 `recruit`（确认落账），演出归 panels。 */
  var RECRUIT_JOBS = D.HALL_RECRUIT_JOBS || {};
  var MEMBER_LINES = D.HALL_MEMBER_LINES || {};
  function favorKey(npc) { return npc.regionId + ':' + npc.jobId + ':' + npc.name; }
  function recruitBlock(st, npc) {
    var f = hallState(st);
    if (disciples(st).length >= cap(st)) return '门人已满，先扩隐庐';
    var key = favorKey(npc);
    var lines = f.recruitLines || [];
    if (lines.length >= 2 && lines.indexOf(key) < 0) return '同时只劝两人';
    return '';
  }
  function recruitVisible(st, npc) {
    if (!npc || !RECRUIT_JOBS[npc.jobId]) return false;
    if (!hallState(st).founded) return false;
    if (((st.streetFavor || {})[favorKey(npc)] || 0) < 2) return false;
    if (disciples(st).some(function (d) { return d.id === favorKey(npc); })) return false;
    return true;
  }
  /* 市井抽屉动作注入（原 hallAdjustStreetActions）：可劝时「劝入府」置顶并整体截 3 */
  function adjustStreetActions(st, npc, actions) {
    var list = actions || [];
    if (!recruitVisible(st, npc)) return list.slice(0, 3);
    var block = recruitBlock(st, npc);
    var offer = { id: 'recruit_hall', label: '劝入府', primary: true, hint: block || '请他进府' };
    return [offer].concat(list.filter(function (a) { return a.id !== 'recruit_hall'; })).slice(0, 3);
  }
  /* 开劝（原 openHallRecruit 的校验段）：通过则占一个「同时只劝两人」名额 */
  function beginRecruit(st, npc) {
    if (!npc) return { ok: false, why: '这人不在你脚下这一处。' };
    if (npc.jobId === 'officer') return { ok: false, why: '官差劝不动。' };
    if (!recruitVisible(st, npc)) return { ok: false, why: '他还没到愿意跟你走的份上。' };
    var block = recruitBlock(st, npc);
    if (block) return { ok: false, why: block + '。' };
    var f = hallState(st);
    var key = favorKey(npc);
    if (f.recruitLines.indexOf(key) < 0) f.recruitLines.push(key);
    return {
      ok: true, key: key,
      dialog: {
        tag: '招揽', title: '劝' + npc.name + '入府', loc: RECRUIT_JOBS[npc.jobId] || '市井',
        desc: npc.name + '愿意听这一句。确认之后，他进府，原处换一个人。',
        choices: [
          { id: 'confirm', label: '确认招揽' },
          { id: 'later', label: '改日' },
          { id: 'tip', label: '送盘缠再劝（20 两）' }
        ]
      }
    };
  }
  /* 确认落账（原 hallRecruitPick 0/2；which=1 改日只关窗，**不撤占位**——原版如此） */
  function recruit(st, npc, which) {
    if (!npc) return { ok: false, why: '人已经不在这一处了。' };
    var key = favorKey(npc);
    var f = hallState(st);
    if (which === 'tip' && (st.gold || 0) < 20) return { ok: false, why: '尚缺盘缠' + (20 - (st.gold || 0)) + '两' };
    var block = recruitBlock(st, npc);
    if (block && (f.recruitLines || []).indexOf(key) < 0) return { ok: false, why: block + '。' };
    if (disciples(st).length >= cap(st)) return { ok: false, why: '门人已满，先扩隐庐。' };
    if (which === 'tip') st.gold -= 20;
    f.recruitLines = (f.recruitLines || []).filter(function (k) { return k !== key; });
    f.disciples.push({
      id: key, name: npc.name, jobId: npc.jobId, jobTitle: RECRUIT_JOBS[npc.jobId] || '门人',
      art: '', lines: (MEMBER_LINES[npc.jobId] || []).slice(0, 3), settled: false
    });
    var bucket = st.streetSpawn && st.streetSpawn[npc.regionId];
    if (bucket && bucket.names) delete bucket.names[npc.jobId];
    var s = sideMod();
    if (s && s.grantRelic) s.grantRelic(st, 'street_scrap');
    var text = '江湖杂报：' + (f.name || '本门') + '招揽第' + f.disciples.length + '人。';
    st.pendingRumor = { grade: 'reliable', text: text, aboutId: 'hall-recruit' };
    return { ok: true, log: '【招揽】' + npc.name + '入府。', toast: npc.name + '进府了。', tone: 'emerald' };
  }
  /* 门人浮层三动作（原 hallAct 的 settle/chat/dismiss 三支） */
  function actOnMember(st, id, actionId) {
    var person = member(st, id);
    if (!person) return { ok: false, why: '先点一个门人。' };
    if (actionId === 'settle') {
      person.settled = true;
      return { ok: true, toast: '安顿了。拳脚不加，气血不加。', tone: 'emerald' };
    }
    if (actionId === 'chat') return { ok: true, toast: (person.lines && person.lines[2]) || '他应了一声。', tone: 'amber' };
    if (actionId === 'dismiss') {
      var f = hallState(st);
      f.disciples = f.disciples.filter(function (d) { return d.id !== id; });
      f.recruitLines = (f.recruitLines || []).filter(function (k) { return k !== id; });
      return { ok: true, log: '【本门】' + person.name + '离开了府。', toast: person.name + '走了。', tone: 'amber' };
    }
    return { ok: false, why: '这一支没有后续。' };
  }
  function recruitJobWord(jobId) { return RECRUIT_JOBS[jobId] || '门人'; }

  /* 概览页第三行（原 hallWifeLine；主母位 + 侧室数） */
  function wifeLine(st) {
    var wifeId = st.romance && st.romance.wifeId;
    var extra = (st.romance && st.romance.concubineCount) ? ('侧室' + st.romance.concubineCount + '人。') : '';
    var r = romMod();
    if (!wifeId || !r || !r.castOf(wifeId)) return '主母位还空着。' + extra;
    return '主母位：' + r.castOf(wifeId).name + '。' + extra;
  }
  function hasBadge(st) { ensureState(st); return !!st.faction.founded; }

  return {
    ensureState: ensureState,
    hallState: hallState,
    estateJin: estateJin,
    openBranches: openBranches,
    camps: camps,
    houses: houses,
    fameRank: fameRank,
    fameWord: fameWord,
    jinWord: jinWord,
    cap: cap,
    disciples: disciples,
    member: member,
    foundingFameEased: foundingFameEased,
    foundingFameOk: foundingFameOk,
    jobFriendCount: jobFriendCount,
    foundingHasPledge: foundingHasPledge,
    foundingRenownOk: foundingRenownOk,
    foundingWanted: foundingWanted,
    foundingResidenceOk: foundingResidenceOk,
    foundingGaps: foundingGaps,
    foundingMetLabels: foundingMetLabels,
    banditPathOpen: banditPathOpen,
    pickName: pickName,
    found: found,
    wifeLine: wifeLine,
    hasBadge: hasBadge,
    /* F2：经营（册317） */
    hallHostilityHigh: hallHostilityHigh,
    cityFriendly: cityFriendly,
    branchGaps: branchGaps,
    openBranch: openBranch,
    closeBranch: closeBranch,
    raiseBandit: raiseBandit,
    setDoctrine: setDoctrine,
    doctrineWord: function (id) { return DOCTRINE[id] || '行侠'; },
    settleOnNewTurn: settleOnNewTurn,
    propUp: propUp,
    dismissOne: dismissOne,
    dissolveHall: dissolveHall,
    washWanted: washWanted,
    hideWanted: hideWanted,
    resistSeizure: resistSeizure,
    paySeizure: paySeizure,
    fleeSeizure: fleeSeizure,
    canOfficial: canOfficial,
    goOfficial: goOfficial,
    /* F3：门人与市井招募（册318） */
    favorKey: favorKey,
    recruitVisible: recruitVisible,
    recruitBlock: recruitBlock,
    adjustStreetActions: adjustStreetActions,
    beginRecruit: beginRecruit,
    recruit: recruit,
    actOnMember: actOnMember,
    recruitJobWord: recruitJobWord
  };
});
