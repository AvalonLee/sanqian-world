/* content-merge.js — 内容桥接收端（山河棋盘侧）
 * 宿主 qunxia-home.js 在 iframe load 后调用 window.QUNXIA_MERGE(payload)：
 *   payload = { arts:[{id,name,k,nat,t,f,s}], sects:[...], cast:[...], events:[...],
 *               blades:[{id,name,k}], manuals:[{id,name,art}] }
 * 只增不覆盖：游戏自带条目与同名人物/武学优先；新门派落在对应州府。
 */
(function () {
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

  window.QUNXIA_MERGE = function (p) {
    if (!p) return;
    var arts = p.arts || [], sects = p.sects || [], cast = p.cast || [];
    var artBySect = {}, sectCamp = {}, sectName = {};

    arts.forEach(function (a) {
      if (a && a.s) a.s.forEach(function (sid) { (artBySect[sid] = artBySect[sid] || []).push(a); });
    });
    sects.forEach(function (s) { sectCamp[s.id] = s.camp; if (s.name) sectName[s.id] = s.name; });

    var artNames = {};
    for (var id in MARTIAL_DB) artNames[MARTIAL_DB[id].name] = 1;
    arts.forEach(function (a) {
      if (!a || !a.name || MARTIAL_DB[a.id] || artNames[a.name]) return;
      artNames[a.name] = 1;
      var tier = TIER[a.t] || 1;
      var stance = NAT_STANCE[a.nat] || (a.k === 'quan' ? 'gang' : (a.k === 'neigong' ? 'rou' : 'qiao'));
      if (a.k === 'neigong') {
        MARTIAL_DB[a.id] = {
          id: a.id, name: a.name, type: 'inner', tier: tier, affinity: stance,
          bonusHp: 8 + tier * 4, bonusMp: 8 + tier * 4,
          passiveDesc: '【' + TIER_LABEL[tier] + '】' + a.name + '心法，行功时缓缓生息。',
          ultName: a.name + '·全力一击', ultPower: 22 + tier * 6, ultCost: 12 + tier * 3,
          poetry: ''
        };
      } else {
        var role = ROLE[a.k] || 'qi';
        var tk = TOKEN[stance] || 'jianyi';
        MARTIAL_DB[a.id] = {
          id: a.id, name: a.name, type: 'move', tier: tier, stance: stance,
          comboRole: role, tokenType: tk, tokenGain: 1,
          power: 16 + tier * 7 + Math.min(12, Math.floor((a.f || 0) / 15)),
          mpCost: 5 + tier * 3,
          effectDesc: '【' + TIER_LABEL[tier] + '·' + ROLE_LABEL[role] + '】' + a.name + '，凝 1 层' + TOKEN_LABEL[tk] + '。',
          poetry: ''
        };
      }
    });

    /* 名兵 / 秘籍：转成游戏物品表条目；名兵进神兵行囊，秘籍研读后习得 art。
     * 非 martial 秘籍（线索/医术/乐理）没有 art 目标，不入物品表，奖励回落到游戏固定战利品。 */
    (p.blades || []).forEach(function (b) {
      if (!b || !b.name || ITEMS_DB[b.id]) return;
      var tier = b.k >= 2 ? 2 : b.k === 1 ? 1 : 0;
      ITEMS_DB[b.id] = {
        id: b.id, name: b.name, slot: 'weapon',
        atk: tier === 2 ? 34 : tier === 1 ? 18 : 10,
        hp: tier === 2 ? 15 : 0,
        price: 0, maxStock: 1,
        desc: '江湖名兵 · 扩展世界兵刃，攻击 +' + (tier === 2 ? 34 : tier === 1 ? 18 : 10) + '。'
      };
    });
    (p.manuals || []).forEach(function (m) {
      if (!m || !m.name || !m.art || !MARTIAL_DB[m.art] || ITEMS_DB[m.id]) return;
      ITEMS_DB[m.id] = {
        id: m.id, name: '《' + m.name + '》', slot: 'scroll', learnArt: m.art,
        price: 0, maxStock: 1,
        desc: '扩展世界秘籍，研读可习得《' + MARTIAL_DB[m.art].name + '》。'
      };
    });

    var sectNames = {};
    for (var sid in SECTS_DB) sectNames[SECTS_DB[sid].name] = 1;
    sects.forEach(function (s) {
      if (!s || !s.name || SECTS_DB[s.id] || sectNames[s.name]) return;
      sectNames[s.name] = 1;
      var pool = (artBySect[s.id] || []).filter(function (a) { return !!MARTIAL_DB[a.id]; }).sort(byFreq);
      var top = pool.slice(0, 3).map(function (a) { return a.id; });
      var leader = '';
      cast.forEach(function (c) {
        if (!leader && c.sec === s.id && /^(abbot|master|founder|chief)$/.test(c.role)) leader = c.name;
      });
      SECTS_DB[s.id] = {
        id: s.id, name: s.name, region: regionOf(s.id),
        leader: leader || (s.name + '掌门'),
        stance: CAMP_STANCE[s.camp] || 'rou',
        desc: s.name + '一脉，以' + (CAMP_LABEL[s.camp] || '江湖') + '立身，门中自有传承。',
        ranks: [s.name + '记名弟子', s.name + '入门弟子', s.name + '真传弟子', s.name + '首座'],
        arts: top.length ? top : ['taizu_changquan']
      };
    });

    var names = {};
    MASTERS_INIT.forEach(function (m) { names[m.name] = 1; });
    SIDE_CAST.forEach(function (m) { names[m.name] = 1; });
    ROMANCE_CAST.forEach(function (m) { names[m.name] = 1; });
    cast.forEach(function (c) {
      if (!c || !c.name || names[c.name]) return;
      names[c.name] = 1;
      var st = CAMP_STANCE[sectCamp[c.sec]] || 'rou';
      var title = ROLE_TITLE[c.role] || '江湖人';
      if (c.t === 'S' || c.t === 'A') {
        var pool = (artBySect[c.sec] || []).filter(function (a) { return !!MARTIAL_DB[a.id]; }).sort(byFreq);
        var m = {
          id: c.id, name: c.name, avatar: c.name.charAt(0), title: title + ' · ' + c.name,
          region: regionOf(c.sec), tileIdx: (hash(c.id) % 5) + 1, stance: st,
          power: c.t === 'S' ? 80 : 70, hp: c.t === 'S' ? 160 : 145,
          teachArt: pool.length ? pool[0].id : 'taizu_changquan',
          affinity: c.t === 'S' ? 15 : 20, storyStage: 0,
          lastChatTurn: -1, lastDuelTurn: -5, lastStoryTurn: -1, taughtOnce: false,
          quote: c.bio || (c.name + '看了你一眼，没有说话。')
        };
        MASTERS_INIT.push(m);
        if (typeof state !== 'undefined' && state && Array.isArray(state.masters) && !state.masters.some(function (x) { return x.id === c.id; })) {
          state.masters.push(JSON.parse(JSON.stringify(m)));
        }
      } else {
        SIDE_CAST.push({
          id: c.id, name: c.name, seal: c.name.charAt(0),
          tone: c.align === 'xie' ? 'cold' : 'warm',
          art: '', address: c.name, attitude: title, functionSlot: '线索',
          region: regionOf(c.sec), tileIdx: 2, sceneLabel: '江湖日常',
          linger: false, scrollTags: [],
          lines: [c.bio || (c.name + '行色匆匆。'), c.name + '不愿多谈。', c.name + '拱手作别。']
        });
      }
    });

    /* 世界事件：20 案按固定旬位并入日程；游戏每旬检查 triggerTurn，逾期走邸报。 */
    var EV_TURNS = [6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 29];
    var EV_REGION = { guangmingding: 'guangming', luoyang: 'luoyang', shaolin: 'shaolin', yanmenguan: 'yanmenguan', yanziwu: 'yanziwu', wuliang: 'wuliang', songshan: 'shaolin' };
    (p.events || []).forEach(function (ev, idx) {
      if (!ev || !ev.name) return;
      if (CANON_EVENTS_SCHEDULE.some(function (x) { return x.id === ev.id; })) return;
      var boss = null;
      for (var i = 0; i < cast.length; i++) if (cast[i].id === ev.boss) { boss = cast[i]; break; }
      var st = boss ? (CAMP_STANCE[sectCamp[boss.sec]] || 'rou') : 'rou';
      var tier = boss ? boss.t : 'B';
      CANON_EVENTS_SCHEDULE.push({
        id: ev.id,
        triggerTurn: EV_TURNS[idx % EV_TURNS.length],
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
        rewardKind: ev.reward ? ev.reward.kind : ''
      });
    });

    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  };

  /* 打赢扩展世界事件后的主奖励：武学即时入身；名兵 / 秘籍进神兵行囊（秘籍研读后习得）。
   * 无对应物品（线索类秘籍 / 未知 id）返回空串，沿用游戏固定战利品。 */
  window.QUNXIA_CRISIS_REWARD = function (id) {
    var ev = null;
    for (var i = 0; i < CANON_EVENTS_SCHEDULE.length; i++) {
      if (CANON_EVENTS_SCHEDULE[i].id === id) { ev = CANON_EVENTS_SCHEDULE[i]; break; }
    }
    if (!ev) return '';
    var msg = '';
    if (ev.rewardKind === 'art' && ev.rewardArt && MARTIAL_DB[ev.rewardArt]) {
      state.learnedArts[ev.rewardArt] = Math.min(10, (state.learnedArts[ev.rewardArt] || 0) + 1);
      msg = '获传《' + MARTIAL_DB[ev.rewardArt].name + '》';
    } else if (ev.rewardKind === 'blade' && ITEMS_DB[ev.rewardBlade]) {
      state.inventory[ev.rewardBlade] = (state.inventory[ev.rewardBlade] || 0) + 1;
      msg = '获神兵《' + ITEMS_DB[ev.rewardBlade].name + '》';
    } else if (ev.rewardKind === 'manual' && ITEMS_DB[ev.rewardManual]) {
      state.inventory[ev.rewardManual] = (state.inventory[ev.rewardManual] || 0) + 1;
      msg = '获秘籍' + ITEMS_DB[ev.rewardManual].name;
    }
    if (!msg) return '';
    try { addLog('🎁【江湖大事】' + msg); } catch (e) {}
    try { renderAll(); } catch (e) {}
    return msg;
  };

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.__qunxia !== 1) return;
    try { window.QUNXIA_MERGE(e.data.payload); } catch (err) {}
  });
})();
