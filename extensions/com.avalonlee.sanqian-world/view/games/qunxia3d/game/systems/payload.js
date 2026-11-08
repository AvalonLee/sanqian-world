/* systems/payload.js — payload 内容桥（源规格 §四 #8 的 M3 切片）
 * 迁移源（view/games/qunxia/content-merge.js QUNXIA_MERGE :30–:194 全量）：
 *   arts → MARTIAL_DB（只增不覆盖，同名/同 id 跳过；内功/招式两形按 tier/nat/freq 派生数值）
 *   blades/manuals → ITEMS_DB（名兵三档 atk 34/18/10 + hp15；秘籍 learnArt 指向真武学）
 *   sects → SECTS_DB（regionOf(SECT_REGION) + 领袖正则 + 门中 top3 武学按频次）
 *   cast → S/A 进 MASTERS_INIT（power 80/70、teachArt 取门中首位、tileIdx hash%5+1），
 *          B/C → SIDE_CAST（**M3 豁免**：SIDE_CAST 属 P4-B（base64 头像延后批），
 *          新版不接 B/C 池——对表沙箱以 SIDE_CAST=[] 对齐并登记）
 *   events → CANON_EVENTS_SCHEDULE.push（EV_TURN_MAP 旬位 + EV_REGION 地界映射 +
 *          tier→power 80/70/58/50 hp 160/145/120/105 + reward/fail/sceneCast/loseText）
 *   knots → KNOT_SCENES（当场戏 cast+opts）
 * 全程确定性（hash 函数定 tileIdx，零 Math.random）⇒ table-check 全量对表。
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE；只增不覆盖是原版语义（同名/同 id 保护逐字）。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.systems = root.QX3D.systems || {}; root.QX3D.systems.payload = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('../core/data.js').D
    : (root.QX3D_DATA || {});

  var NAT_STANCE = { gang: 'gang', yin: 'rou', xie: 'qiao' };
  var TOKEN = { gang: 'bagang', rou: 'taiji', qiao: 'jianyi' };
  var ROLE = { quan: 'qi', blade: 'cheng', qimen: 'zhuan', qing: 'zhuan' };
  var TIER = { huang: 1, xuan: 2, di: 3, tian: 3 };
  var TIER_LABEL = { 1: '黄阶', 2: '玄阶', 3: '地阶' };
  var ROLE_LABEL = { qi: '起势', cheng: '承接', zhuan: '转合' };
  var TOKEN_LABEL = { bagang: '霸罡', taiji: '太极劲', jianyi: '剑意' };
  var CAMP_STANCE = { zheng: 'gang', zhong: 'rou', xie: 'qiao', yin: 'rou' };
  var CAMP_LABEL = { zheng: '正道', zhong: '中庸', xie: '魔道', yin: '隐世' };
  var ROLE_TITLE = { abbot: '方丈', master: '掌门', founder: '祖师', chief: '帮主', elder: '长老' };
  var SECT_REGION = {
    shaolin: 'shaolin', huashan: 'huashan', hengshan: 'hengyang', wudang: 'wudang',
    qingcheng: 'qingcheng', emei: 'emei', kunlun: 'xueshan', kongtong: 'changan',
    gaibang: 'xiangyang', tiandihui: 'luoyang', honghuahui: 'luoyang', taohua: 'taohua',
    quanzhen: 'zhongnan', murong: 'yanziwu', dali: 'dali', xiaoyao: 'lingjiu',
    mingjiao: 'guangming', changle: 'xiakedao', tianying: 'guangming', xingxiu: 'xingxiu',
    shenlong: 'binghuodao', tiezhang: 'xiangyang', riyue: 'heimuya', xueshan: 'xueshan',
    lingjiu: 'lingjiu', xiake: 'xiakedao', songshan: 'shaolin', taishan: 'kaifeng',
    hengshan_n: 'hengyang', gumu: 'zhongnan', xuedao: 'xueshan', diancang: 'dali'
  };

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return h;
  }
  function regionOf(id) { return SECT_REGION[id] || 'luoyang'; }
  function byFreq(a, b) { return (b.f || 0) - (a.f || 0); }

  /* window.KNOT_SCENES 等价物：挂在 QX3D_DATA（sceneLine 读这里） */
  function mergePayload(payload) {
    if (!payload) return 0;
    var arts = payload.arts || [], sects = payload.sects || [], cast = payload.cast || [];
    var merged = 0;
    var artBySect = {}, sectCamp = {}, sectName = {};

    arts.forEach(function (a) {
      if (a && a.s) a.s.forEach(function (sid) { (artBySect[sid] = artBySect[sid] || []).push(a); });
    });
    sects.forEach(function (s) { sectCamp[s.id] = s.camp; if (s.name) sectName[s.id] = s.name; });

    var artNames = {};
    for (var id in D.MARTIAL_DB) artNames[D.MARTIAL_DB[id].name] = 1;
    arts.forEach(function (a) {
      if (!a || !a.name || D.MARTIAL_DB[a.id] || artNames[a.name]) return;
      artNames[a.name] = 1;
      var tier = TIER[a.t] || 1;
      var stance = NAT_STANCE[a.nat] || (a.k === 'quan' ? 'gang' : (a.k === 'neigong' ? 'rou' : 'qiao'));
      if (a.k === 'neigong') {
        D.MARTIAL_DB[a.id] = {
          id: a.id, name: a.name, type: 'inner', tier: tier, affinity: stance,
          bonusHp: 8 + tier * 4, bonusMp: 8 + tier * 4,
          passiveDesc: '【' + TIER_LABEL[tier] + '】' + a.name + '心法，行功时缓缓生息。',
          ultName: a.name + '·全力一击', ultPower: 22 + tier * 6, ultCost: 12 + tier * 3,
          poetry: ''
        };
      } else {
        var role = ROLE[a.k] || 'qi';
        var tk = TOKEN[stance] || 'jianyi';
        D.MARTIAL_DB[a.id] = {
          id: a.id, name: a.name, type: 'move', tier: tier, stance: stance,
          comboRole: role, tokenType: tk, tokenGain: 1,
          power: 16 + tier * 7 + Math.min(12, Math.floor((a.f || 0) / 15)),
          mpCost: 5 + tier * 3,
          effectDesc: '【' + TIER_LABEL[tier] + '·' + ROLE_LABEL[role] + '】' + a.name + '，凝 1 层' + TOKEN_LABEL[tk] + '。',
          poetry: ''
        };
      }
      merged++;
    });

    /* 名兵 / 秘籍：转成游戏物品表条目；名兵进神兵行囊，秘籍研读后习得 art。
     * 非 martial 秘籍（线索/医术/乐理）没有 art 目标，不入物品表。 */
    (payload.blades || []).forEach(function (b) {
      if (!b || !b.name || D.ITEMS_DB[b.id]) return;
      var tier = b.k >= 2 ? 2 : b.k === 1 ? 1 : 0;
      D.ITEMS_DB[b.id] = {
        id: b.id, name: b.name, slot: 'weapon',
        atk: tier === 2 ? 34 : tier === 1 ? 18 : 10,
        hp: tier === 2 ? 15 : 0,
        price: 0, maxStock: 1,
        desc: '江湖名兵 · 扩展世界兵刃，攻击 +' + (tier === 2 ? 34 : tier === 1 ? 18 : 10) + '。'
      };
      merged++;
    });
    (payload.manuals || []).forEach(function (m) {
      if (!m || !m.name || !m.art || !D.MARTIAL_DB[m.art] || D.ITEMS_DB[m.id]) return;
      D.ITEMS_DB[m.id] = {
        id: m.id, name: '《' + m.name + '》', slot: 'scroll', learnArt: m.art,
        price: 0, maxStock: 1,
        desc: '扩展世界秘籍，研读可习得《' + D.MARTIAL_DB[m.art].name + '》。'
      };
      merged++;
    });

    var sectNames = {};
    for (var sid in D.SECTS_DB) sectNames[D.SECTS_DB[sid].name] = 1;
    sects.forEach(function (s) {
      if (!s || !s.name || D.SECTS_DB[s.id] || sectNames[s.name]) return;
      sectNames[s.name] = 1;
      var pool = (artBySect[s.id] || []).filter(function (a) { return !!D.MARTIAL_DB[a.id]; }).sort(byFreq);
      var top = pool.slice(0, 3).map(function (a) { return a.id; });
      var leader = '';
      cast.forEach(function (c) {
        if (!leader && c.sec === s.id && /^(abbot|master|founder|chief)$/.test(c.role)) leader = c.name;
      });
      D.SECTS_DB[s.id] = {
        id: s.id, name: s.name, region: regionOf(s.id),
        leader: leader || (s.name + '掌门'),
        stance: CAMP_STANCE[s.camp] || 'rou',
        desc: s.name + '一脉，以' + (CAMP_LABEL[s.camp] || '江湖') + '立身，门中自有传承。',
        ranks: [s.name + '记名弟子', s.name + '入门弟子', s.name + '真传弟子', s.name + '首座'],
        arts: top.length ? top : ['taizu_changquan']
      };
      merged++;
    });

    var extMasters = [];
    var names = {};
    (D.MASTERS_INIT || []).forEach(function (m) { names[m.name] = 1; });
    /* B/C 配角池（SIDE_CAST）= P4-B 迁移批接（计划书 #14 定序）——本版只收 S/A 进名宿池，
     * B/C 落 P4-B 批（对表沙箱以 SIDE_CAST=[] 对齐此豁免）。 */
    cast.forEach(function (c) {
      if (!c || !c.name || names[c.name]) return;
      names[c.name] = 1;
      var st = CAMP_STANCE[sectCamp[c.sec]] || 'rou';
      var title = ROLE_TITLE[c.role] || '江湖人';
      if (c.t === 'S' || c.t === 'A') {
        var pool = (artBySect[c.sec] || []).filter(function (a) { return !!D.MARTIAL_DB[a.id]; }).sort(byFreq);
        var m = {
          id: c.id, name: c.name, avatar: c.name.charAt(0), title: title + ' · ' + c.name,
          region: regionOf(c.sec), tileIdx: (hash(c.id) % 5) + 1, stance: st,
          power: c.t === 'S' ? 80 : 70, hp: c.t === 'S' ? 160 : 145,
          teachArt: pool.length ? pool[0].id : 'taizu_changquan',
          affinity: c.t === 'S' ? 15 : 20, storyStage: 0,
          lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
          quote: c.bio || (c.name + '看了你一眼，没有说话。')
        };
        D.MASTERS_INIT.push(m);
        extMasters.push(m);
        merged++;
      }
    });

    /* 世界事件：36 案按固定旬位并入日程；逾期走邸报（EV_TURN_MAP v3.0 §八 排期）。
     * 按 id 映射（不按 payload 序号对位）。 */
    var EV_TURN_MAP = D.EV_TURN_MAP || {};
    var EV_REGION = { guangmingding: 'guangming', luoyang: 'luoyang', shaolin: 'shaolin', yanmenguan: 'yanmenguan', yanziwu: 'yanziwu', wuliang: 'wuliang', songshan: 'shaolin', yanfulou: 'linan', lingshe: 'lingjiu', kunlun: 'xueshan', dali: 'dali', binghuo: 'binghuodao' };
    (payload.events || []).forEach(function (ev, idx) {
      if (!ev || !ev.name) return;
      if (D.CANON_EVENTS_SCHEDULE.some(function (x) { return x.id === ev.id; })) return;
      var boss = null;
      for (var i = 0; i < cast.length; i++) if (cast[i].id === ev.boss) { boss = cast[i]; break; }
      var st = boss ? (CAMP_STANCE[sectCamp[boss.sec]] || 'rou') : 'rou';
      var tier = boss ? boss.t : 'B';
      D.CANON_EVENTS_SCHEDULE.push({
        id: ev.id,
        triggerTurn: EV_TURN_MAP[ev.id] != null ? EV_TURN_MAP[ev.id] : (6 + (idx % 30)),
        duration: 4,
        region: EV_REGION[ev.z] || 'luoyang',
        tileIdx: (hash(ev.id) % 5) + 2,
        title: ev.name,
        enemyName: boss ? (boss.name + '·' + (ROLE_TITLE[boss.role] || '江湖人')) : '江湖群豪',
        enemyTitle: boss && sectName[boss.sec] ? (sectName[boss.sec] + ' · 江湖名宿') : '天下群雄',
        enemyStance: st,
        enemyPower: tier === 'S' ? 80 : tier === 'A' ? 70 : tier === 'B' ? 58 : 50,
        enemyHp: tier === 'S' ? 160 : tier === 'A' ? 145 : tier === 'B' ? 120 : 105,
        desc: ev.desc || ev.rumor || (ev.name + '之事已在江湖传开。'),
        canonOutcomeTitle: '《江湖邸报 · ' + ev.name + '落幕》',
        canonOutcomeText: ev.canon || ('因你未在限期内赶赴，' + ev.name + '已按江湖轨迹落幕。'),
        rewardArt: ev.reward && ev.reward.kind === 'art' ? ev.reward.id : '',
        rewardBlade: ev.reward && ev.reward.kind === 'blade' ? ev.reward.id : '',
        rewardManual: ev.reward && ev.reward.kind === 'manual' ? ev.reward.id : '',
        rewardKind: ev.reward ? ev.reward.kind : '',
        failInjury: ev.fail && ev.fail.injury || null,
        sceneCast: (payload.knots && payload.knots[ev.id] && payload.knots[ev.id].cast) || [],
        sceneOpts: (payload.knots && payload.knots[ev.id] && payload.knots[ev.id].opts) || [],
        failRenown: ev.fail && ev.fail.renown || null,
        loseText: ev.lose || ''   /* 册271：败局终局回流——战报收尾用词表 lose 叙事 */
      });
      merged++;
    });

    D.KNOT_SCENES = payload.knots || {};   /* 当场戏（cast + 分支标签），赴会战报上屏用 */
    _lastExtMasters = extMasters;
    return merged;
  }

  /* 原版合并还会把扩展 S/A 名宿推进「活档」state.masters（content-merge :141–:143，
   * typeof state 守卫）——旧档收到 payload 的路径。载档后由 app 调本函数补齐
   * （id 去重，创角档会从 MASTERS_INIT 重拷已含，幂等）。 */
  var _lastExtMasters = [];
  function mergeStateMasters(st) {
    if (!st || !Array.isArray(st.masters)) return 0;
    var n = 0;
    _lastExtMasters.forEach(function (m) {
      if (!st.masters.some(function (x) { return x.id === m.id; })) {
        st.masters.push(JSON.parse(JSON.stringify(m)));
        n++;
      }
    });
    return n;
  }

  /* 当场戏一行（原 game.html sceneLine :10896–:10903） */
  function sceneLine(crisis) {
    var sc = D.KNOT_SCENES && D.KNOT_SCENES[crisis.id];
    if (!sc) return '';
    var who = (sc.cast || []).length ? `（当场：${sc.cast.join('、')}在场` : '';
    var opts = (sc.opts || []).filter(o => o.k !== 'watch').map(o => `「${o.label}」`);
    var dile = opts.length ? `——${opts.join('，')}，只在一念之间）` : who ? '）' : '';
    return who + dile;
  }

  /* 主奖励（content-merge QUNXIA_CRISIS_REWARD :197–:219） */
  function crisisReward(st, id, env) {
    var ev = null;
    var sched = D.CANON_EVENTS_SCHEDULE || [];
    for (var i = 0; i < sched.length; i++) {
      if (sched[i].id === id) { ev = sched[i]; break; }
    }
    if (!ev) return '';
    var msg = '';
    if (ev.rewardKind === 'art' && ev.rewardArt && D.MARTIAL_DB[ev.rewardArt]) {
      st.learnedArts[ev.rewardArt] = Math.min(10, (st.learnedArts[ev.rewardArt] || 0) + 1);
      msg = '获传《' + D.MARTIAL_DB[ev.rewardArt].name + '》';
    } else if (ev.rewardKind === 'blade' && ev.rewardBlade && D.ITEMS_DB[ev.rewardBlade]) {
      st.inventory[ev.rewardBlade] = (st.inventory[ev.rewardBlade] || 0) + 1;
      msg = '获神兵《' + D.ITEMS_DB[ev.rewardBlade].name + '》';
    } else if (ev.rewardKind === 'manual' && ev.rewardManual && D.ITEMS_DB[ev.rewardManual]) {
      st.inventory[ev.rewardManual] = (st.inventory[ev.rewardManual] || 0) + 1;
      msg = '获秘籍' + D.ITEMS_DB[ev.rewardManual].name;
    }
    if (!msg) return '';
    (env && env.addLog || function (s, t) { })(st, '🎁【江湖大事】' + msg);
    return msg;
  }

  return {
    mergePayload: mergePayload,
    mergeStateMasters: mergeStateMasters,
    sceneLine: sceneLine,
    crisisReward: crisisReward,
    hash: hash,
    regionOf: regionOf
  };
});
