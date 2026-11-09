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
 *   ④ 原 `renderHallBadge` 的「本门」角标改挂 3D 版 `#hud-hall`；概览页只做只读面
 *      （门人/地盘/规矩三页随 F2/F3）。
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
    hasBadge: hasBadge
  };
});
