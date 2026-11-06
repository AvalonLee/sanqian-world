/* content-merge.js — 内容桥接收端（山河棋盘侧）
 * 宿主 qunxia-home.js 在 iframe load 后调用 window.QUNXIA_MERGE(payload)：
 *   payload = { arts:[{id,name,k,nat,t,f,s}], sects:[{id,name,camp,launch}], cast:[{id,name,t,sec,role,align,bio}] }
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
    var artBySect = {}, sectCamp = {};

    arts.forEach(function (a) {
      if (a && a.s) a.s.forEach(function (sid) { (artBySect[sid] = artBySect[sid] || []).push(a); });
    });
    sects.forEach(function (s) { sectCamp[s.id] = s.camp; });

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

    try { if (typeof renderAll === 'function') renderAll(); } catch (e) {}
  };

  window.addEventListener('message', function (e) {
    if (!e.data || e.data.__qunxia !== 1) return;
    try { window.QUNXIA_MERGE(e.data.payload); } catch (err) {}
  });
})();
