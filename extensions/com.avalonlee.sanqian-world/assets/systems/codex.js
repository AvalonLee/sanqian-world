/* systems/codex.js — 成就图鉴与人生传记（meta 层 · 世界无关；图鉴卷 v1.0 唯一事实源）
 * 三面一体：图鉴九面（条目=id 引用、跨世永不清、首录=列表位置只增不刷）+ 行为成就 60 条
 * （幂等键=成就 id，即时遗泽 +1~5 + 称号）+ 人生传记（转世瞬间本地三段式模板，≤500 字 ×9 世）。
 * 纪律：codices/achv/titles/biographies 四字段本模块唯一写口；遗泽入账一律经 SQ.Legacy 写口
 * （meta.karma 无第二写点）；判定 = 状态扫描（Legacy.sync 内驱动，事件钩子语义零 tick）；
 * 池数据只读——分母 = 各池正典计数（池扩容自动刷新分母，已发里程碑不回收）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  function mergeFace(meta, face, ids) {
    var cur = meta.codices[face] || (meta.codices[face] = []);
    var have = {};
    cur.forEach(function (id) { have[id] = 1; });
    (ids || []).forEach(function (id) {
      if (typeof id !== 'string' || !id || have[id]) return;
      have[id] = 1;
      cur.push(id);
    });
  }
  function faceCount(meta, face, prefix) {
    var list = meta.codices[face] || [];
    if (!prefix) return list.length;
    return list.filter(function (id) { return id.indexOf(prefix) === 0; }).length;
  }

  /* 分母 = 池正典计数（动态口径 §2.1：池扩容落地瞬间分母变大、已收集数不变） */
  function faceDenom(face, pack, D) {
    switch (face) {
      case 'event': return pack && SQ.Events && SQ.Events.allIds ? SQ.Events.allIds(pack).length : 0;
      case 'talent': {
        var n = 0;
        /* 分母 = 通用池 + **本世界**池（D4：原先硬写 'xiuxian'，第二个世界装上会零报错地数错分母） */
        ['common', (pack && pack.worldId) || SQ.WORLD_DEFAULT].forEach(function (w) {
          var t = (SQ.TALENTS || {})[w];
          if (t) n += (t.positive || []).length + (t.negative || []).length;
        });
        return n;
      }
      case 'treasure': return (pack && pack.treasures && pack.treasures.LIST) ? pack.treasures.LIST.length : 0;
      case 'art': return pack ? Object.keys(pack.artsMap()).length : 0;
      case 'bond': return (pack && pack.companions) ? pack.companions.length : 0;
      case 'zone': return (D.ZONES || []).length * 2 + ((D.ZONE_AFFIXES || []).length);
      case 'faction': return (D.FACTIONS_FIXED || []).length;
      case 'selfart': return (((D.FUSE || {}).COMBOS) || 480) + ((pack && pack.treasures && pack.treasures.LIST) ? pack.treasures.LIST.length : 0);
      default: return 0;   /* title = 动态分母（绝对数阶梯，无百分比里程碑） */
    }
  }

  function addTitle(meta, id) {
    if (typeof id !== 'string' || !id || id === '-') return false;
    if (meta.titles.indexOf(id) >= 0) return false;
    meta.titles.push(id);
    while (meta.titles.length > 80) meta.titles.shift();
    return true;
  }

  /* ── 里程碑（§2.11 通则）：每面 50/80/100% = 遗泽 15/30/50（即时入账，经 legacy 写口）；
   * 100% 档追加永久 qiRate +0.3%（'codex' 静态来源，合计 cap +3%——九面全满 2.7%）；
   * 称号墙 = 绝对数阶梯 10/25/50（顶档 50 枚视同 100% 档参与 qiRate 计数，§三 核算口径）；
   * 转世天赋子区只发遗泽不发 qiRate（cap 余量留给第 9 面）。 */
  /* 里程碑阈值与转世天赋分母的单源出口（第册二批 · 收第二事实源）：
   * 改 MS_PCT 必须同时改「引擎发哪些档」与「成就页画哪三枚点」——原先 view/achv.js 自己写死
   * [50,80,100]、talentLegacy 这一支自己写死 [0.5,0.8,1.0] 与分母 8，改表只动九面那支 ⇒ 零红。
   * 判据 = 冒烟 #321（差分法）+ 走查 verify-ui-achv 的屏上同动条。 */
  function msPcts(D) { return (((D || {}).CODEX || {}).MS_PCT) || [0.5, 0.8, 1.0]; }
  function msMarks(D) { return msPcts(D).map(function (p) { return Math.round(p * 100); }); }
  /* 转世天赋子区的分母 = 轮回卷 §3.3 独占转世天赋池**表**的条数（`D.LEGACY.TALENTS`，现 8 枚）。
   * ⚠️ 别拿天赋池的 `tier === 'epic'` 条数当分母：那是 10 枚（专属池卷 §5.4「epic 档 10 条：正 8 / 负 2」），
   * 与「可跨世买断的 8 枚 legacy_talent_*」是两回事——`data.js:929` 那句「epic 档 8 条」的混写就是这处
   * 分歧的来源，判据 #321(b) 钉的是表条数，不是池计数。 */
  function legacyCap(D) { return (((D || {}).LEGACY || {}).TALENTS || []).length; }

  function checkMilestones(meta, pack, D, now) {
    var C = D.CODEX || {};
    (C.FACES || []).forEach(function (face) {
      if (face === 'title') {
        var nT = faceCount(meta, 'title');
        (C.TITLE_MS || [10, 25, 50]).forEach(function (th, i) {
          if (nT >= th) SQ.Legacy.earnImmediate(meta, 'codex.ms.title.' + th, (C.MS_KARMA || [15, 30, 50])[i], 'milestone', now);
        });
        return;
      }
      var den = faceDenom(face, pack, D);
      if (!den) return;
      var pct = faceCount(meta, face) / den;
      msPcts(D).forEach(function (p, i) {
        if (pct >= p - 1e-9) {
          SQ.Legacy.earnImmediate(meta, 'codex.ms.' + face + '.' + Math.round(p * 100), (C.MS_KARMA || [15, 30, 50])[i], 'milestone', now);
        }
      });
    });
    /* 转世天赋子区（§2.3：epic 专属池，只发遗泽）——阈值与分母同读上面两枚出口 */
    var nL = faceCount(meta, 'talentLegacy');
    var capL = Math.max(1, legacyCap(D));                /* 表空时按 1 收着，别让除零把三档全放行 */
    msPcts(D).forEach(function (p, i) {
      if (nL / capL >= p - 1e-9) SQ.Legacy.earnImmediate(meta, 'codex.ms.talentLegacy.' + Math.round(p * 100), (C.MS_KARMA || [15, 30, 50])[i], 'milestone', now);
    });
  }

  /* 'codex' qiRate 静态来源行（§三 通道裁定：非 buff）：pct 面 100% 档 + 称号墙 50 枚顶档 */
  function qiRateOf(meta, D) {
    var C = D.CODEX || {};
    var n = 0;
    (C.FACES || []).forEach(function (face) {
      if (face === 'title') { if (meta.earnedKeys['codex.ms.title.50'] != null) n++; }
      else if (meta.earnedKeys['codex.ms.' + face + '.100'] != null) n++;
    });
    return Math.min(n * (C.MS_QIRATE_100 || 0.003), C.CODEX_QIRATE_CAP || 0.03);
  }

  /* ── 行为成就 60 条判定（状态派生 · 历史追溯 = boot 首次扫描自动补判，§四通则）── */
  function achvMet(id, s, ws, meta, pack, D, now) {
    var st = meta.stats || {};
    var td = ws.tiandao || {};
    var tm = ws.tribMarks || {};
    var tri = ws.tribulation || {};
    var totalWin = (st.tribWin || 0) + (tri.success || 0);
    var totalAtt = (st.tribAttempts || 0) + (tri.attempts || 0);
    var bondsPos = 0;
    for (var b in (ws.bonds || {})) if ((ws.bonds[b] || 0) >= 1) bondsPos++;
    var zFirst = faceCount(meta, 'zone', 'z');
    var zBoss = faceCount(meta, 'zone', 'b');
    var nTre = faceCount(meta, 'treasure');
    var nArtMax = faceCount(meta, 'artMax');
    switch (id) {
      /* 修行组「入道」 */
      case 'achv_jichu': return ws.realm >= 1;
      case 'achv_jindan': return ws.realm >= 2;
      case 'achv_yuanying': return ws.realm >= 3;
      case 'achv_huashen': return ws.realm >= 4;
      case 'achv_lianxu': return ws.realm >= 5;
      case 'achv_heti': return ws.realm >= 6;
      case 'achv_dacheng': return ws.realm >= 7;
      case 'achv_dujie': return ws.realm >= 8;
      case 'achv_zhenxian': return ws.realm >= 9;
      case 'achv_feisheng': return (st.ascensions || 0) >= 1;
      /* 劫数组「历雷」 */
      case 'achv_chujie': return totalWin >= 1;
      case 'achv_wulou': return (tm.wulouRun || 0) >= 3;
      case 'achv_kudu': return tm.kudu === true;
      case 'achv_lianbai': return tm.lianbai === true;
      case 'achv_baizhan': return totalWin >= 30;
      case 'achv_nitian': return td.title === true;
      case 'achv_fanpan': return td.title === true && (td.nijieFails || 0) >= 1;
      case 'achv_leiting': return totalAtt >= 100;
      case 'achv_yuanman': return tm.yuanman === true;
      case 'achv_bingjie': return (st.dissolutions || 0) >= 1;
      /* 尘缘组「结缘」 */
      case 'achv_chuyuan': return bondsPos >= 1;
      case 'achv_guangjie': return bondsPos >= 20;
      case 'achv_renhou': return bondsPos >= 40;
      case 'achv_daolv': return !!(ws.spouse || ws.spouseLog || (ws.spouseCdUntil || 0) > 0);
      case 'achv_hufa': {
        var g = SQ.Bonds ? SQ.Bonds.guardianOf(ws, pack, D) : null;
        return !!g && g.tier >= 3 && g.bonus > 0;
      }
      case 'achv_juefeng': {
        /* 绝交名录内任一人 bond > 0 即达成。缘尽收敛批（引擎卷 v1.10 §3.6）前本条是**死成就**
         * （内容池无任何解锁路径，绝交锁 −99 不可逆）；同批新增 Bonds.redeem 遗泽赎回后真可达——
         * 赎回**保留** juefengIds 条目正是为了本判定成立（名录是历史账，不是待办队列）。 */
        var jf = ws.juefengIds || [];
        for (var ji = 0; ji < jf.length; ji++) if ((ws.bonds || {})[jf[ji]] > 0) return true;
        return false;
      }
      case 'achv_xinjie': return Object.keys(ws.scars || {}).length > 0;
      /* 跨世之缘：ws.heirBond 有值——生产写口两条 = `Bonds.grantHeir`（承继播种，成功分支）与 `Bonds.redeem`
       * （缘尽赎回）。旧注「由 redeem 唯一写入」自 v1.13 起不实，N24 批随件勘正 */
      case 'achv_kuashi': return !!ws.heirBond;
      case 'achv_shuangxiu':
        return !!(ws.spouse && (ws.bonds || {})[ws.spouse.npcId] >= (D.BOND_MAX || 100) &&
          (now - (ws.spouse.since || now)) >= 30 * 86400000);
      case 'achv_fudi': {
        var cv = SQ.Cave ? SQ.Cave.current(ws, pack) : null;
        var g2 = SQ.Bonds ? SQ.Bonds.guardianOf(ws, pack, D) : null;
        return !!(cv && cv.id !== D.CAVE_INITIAL && g2 && g2.bonus > 0);
      }
      /* 门庭组「门庭」 */
      case 'achv_rumen': return !!ws.factionId;
      case 'achv_zhishi': return SQ.Factions && ws.factionId ? SQ.Factions.rankOf(ws, D) >= 3 : false;
      case 'achv_zhangjiao': return SQ.Factions && ws.factionId ? SQ.Factions.rankOf(ws, D) >= 4 : false;
      case 'achv_panzong': return !!ws.everDefected || (ws.factionCdUntil || 0) > 0;
      case 'achv_zhangong': return !!(ws.factionWar && ws.factionWar.joined === 'in' && (ws.factionWar.merit || 0) > 0);
      case 'achv_xuanzhan':
        return !!(ws.factionWar && ws.factionId &&
          (ws.factionWar.aId === ws.factionId || ws.factionWar.bId === ws.factionId));
      case 'achv_kaizong': return !!(ws.sect && ws.sect.name);
      case 'achv_danfang': return ((ws.alchemy || {}).fires || 0) > 0;
      case 'achv_jiuzhuan': return ((ws.alchemy || {}).jiuzhuan || 0) > 0;
      case 'achv_lianqi': return ((ws.alchemy || {}).forgeMade || 0) > 0;
      /* 秘藏组「秘藏」 */
      case 'achv_chutong': return zFirst >= 1;
      case 'achv_bantu': return zFirst >= 5;
      case 'achv_quantong': return zFirst >= 10;
      case 'achv_yuzhu': return zBoss >= 1;
      case 'achv_shizhu': return zBoss >= 10;
      case 'achv_chubao': return nTre >= 1;
      case 'achv_cangbao': return nTre >= 20;
      case 'achv_baoquan': return nTre >= 46;
      case 'achv_yifa': return nArtMax >= 1;
      case 'achv_wanfa': return nArtMax >= 10;
      /* 逆天组「逆流」 */
      case 'achv_rumo': return (ws.karma || 0) <= -500;
      case 'achv_shenmo': return (ws.karma || 0) <= -900;
      case 'achv_lingzhi': return ((td.stats || {}).accept || 0) >= 1;
      case 'achv_kangzhi': return ((td.stats || {}).defy || 0) >= 1;
      case 'achv_niman': return (td.defy || 0) >= 100 || (st.defyMax || 0) >= 100;
      case 'achv_guantian': return (st.omensSeen || 0) >= 20;
      case 'achv_sanshi': return (st.lives || 0) >= 3;
      case 'achv_sudi':
        return !!(meta.eternalProdigy && (ws.prodigies || []).some(function (p) { return p.id === meta.eternalProdigy.id; }));
      case 'achv_zhandi': return !!(ws.prodMarks && ws.prodMarks.sudiWin);
      case 'achv_bushou': return ((td.stats || {}).defy || 0) >= 10 || (st.defyTotal || 0) >= 10;
      default: return false;
    }
  }

  /* ── 主扫描（Legacy.sync 驱动：claim/mutate 后处理，状态派生零 tick 掷判）── */
  function scan(s, now) {
    if (!s || !s.meta || !s.profile) return;
    var wid = s.profile.worldId;
    var entry = SQ.Worlds[wid];
    if (!entry || !entry.pack) return;
    var pack = entry.pack;
    var D = pack.data;
    var ws = s.worlds[wid];
    var meta = s.meta;
    if (!ws) return;
    /* ① 九面入录（只增 merge：重复获得不刷新首录位置，池数据只读） */
    mergeFace(meta, 'event', Object.keys(ws.eventHistory ? ws.eventHistory.seen || {} : {}));
    mergeFace(meta, 'talent', (s.profile.talents || []).map(function (t) { return t && t.id; }));
    mergeFace(meta, 'talentLegacy', (s.profile.legacyTalents || []).map(function (t) { return t && (t.id || t); }));
    mergeFace(meta, 'treasure', ((ws.treasures || {}).owned || []).map(function (e) { return e.id; }));
    mergeFace(meta, 'art', ws.artsKnown || []);
    var amx = [];
    for (var aid in (ws.artsLevels || {})) if ((ws.artsLevels[aid] || 0) >= (D.ARTS_MAX_LV || 9)) amx.push(aid);
    mergeFace(meta, 'artMax', amx);
    mergeFace(meta, 'bond', Object.keys(ws.bonds || {}).concat(Object.keys(ws.scars || {})));
    mergeFace(meta, 'zone', (ws.cleared || []).map(function (z) { return 'z' + z; }));
    mergeFace(meta, 'zone', (ws.bossKills || []).map(function (z) { return 'b' + z; }));
    mergeFace(meta, 'zone', Object.keys(ws.affixSeen || {}).map(function (a) { return 'a' + a; }));
    var facIds = Object.keys(ws.factionRep || {});
    if (ws.factionId) facIds.push(ws.factionId);
    mergeFace(meta, 'faction', facIds);
    mergeFace(meta, 'title', meta.titles.slice());
    mergeFace(meta, 'selfart', ((ws.fusion || {}).customs || []).map(function (c) { return c.id || c; }));
    mergeFace(meta, 'selfart', ((ws.treasures || {}).owned || []).filter(function (e) {
      return e.st && e.st.spirit && e.st.spirit.a;   /* 觉醒标记落档字段 = spirit.a（器灵卷 §1.3；fusion.js 写点与 normalizeSpirits 均只认 a） */
    }).map(function (e) { return 'sp_' + e.id; }));
    /* ② 里程碑（幂等键 codex.ms.{face}.{档}，跨世只发一次） */
    checkMilestones(meta, pack, D, now);
    /* ③ 行为成就（幂等键 = 成就 id；达成 → 即时遗泽 + 称号 + 日志 toast 行） */
    var have = {};
    (meta.achv || []).forEach(function (id) { have[id] = 1; });
    (D.CODEX.ACHV || []).forEach(function (a) {
      if (have[a.id]) return;
      if (!achvMet(a.id, s, ws, meta, pack, D, now)) return;
      meta.achv.push(a.id);
      have[a.id] = 1;
      SQ.Legacy.earnImmediate(meta, a.id, a.karma, 'achv', now);
      if (a.title && a.title !== '-') addTitle(meta, a.title);
      SQ.Log.push(ws, 'sys', SQ.t('codex.achv.toast', {
        name: SQ.t('codex.achv.' + a.id + '.name', null, wid)
      }, wid));
    });
    /* ③b 榜位称号发放口（N5 收口批 · 图鉴卷 §2.9 称号墙「天骄榜位」来源补行）：
     * 首次登顶同代榜（`ws.prodMarks.myRank === 1`，prodigy.js 唯一写口、金丹前恒 0 不判）→
     * 一枚永久称号 `title_bangshou`，走 `addTitle` 既有唯一写口。
     * 幂等双保险：① `addTitle` 的 indexOf 命中即 false（同一世内每次 scan 都判也重不发）；
     * ② `meta.titles` **跨世不清** ⇒ 转世后再夺榜首亦不重发（称号墙语义 = 一次性收藏）。
     * 零遗泽、零机制、不进 Ledger；成就面里的 title_sudi / title_zhandi 是「挫败 / 斩杀宿敌」
     * 那两枚成就的 face，与本来源无关（图鉴卷 :6「榜位照旧不翻」= 卷面只登记缺口未定义条目，
     * 本批补的就是这个定义：id / 名次判据 / 幂等键）。 */
    if (((ws.prodMarks || {}).myRank) === 1) addTitle(meta, 'title_bangshou');
    mergeFace(meta, 'title', meta.titles.slice());   /* 新称号即时入墙 */
    checkMilestones(meta, pack, D, now);
    /* ④ 逆天值/声望峰值跨世追溯（成就 niman/bushou 历史补判 + 开宗门槛 factionRepPeak 供数） */
    if (ws.tiandao) {
      meta.stats.defyMax = Math.max(meta.stats.defyMax || 0, ws.tiandao.defy || 0);
    }
    var repMax = 0;
    for (var rk in (ws.factionRep || {})) repMax = Math.max(repMax, ws.factionRep[rk] || 0);
    if (repMax > (ws.factionRepPeak || 0)) ws.factionRepPeak = repMax;
  }

  /* ── 人生传记（§五 本地三段式管线：时间轴 + 统计摘要 + 起/行/终评语，≤500 字硬截）── */
  function generateBio(ws, meta, pack, D, profile, channel, now) {
    var wid = pack.worldId;
    var st = meta.stats || {};
    var life = (st.lives || 0) + 1;
    var td = ws.tiandao || {};
    var tri = ws.tribulation || {};
    var name = (profile && profile.name) || SQ.t('profile.default_name', null, wid);
    /* ② 时间轴：编年史大事（天道卷 §3.3 同源模板族）+ 通道终行
     * 「是日…」一族在编年史里靠**行位置**表意，落到传记正文里就成了「是日、是日、是日」而
     * 不知哪天（2026-10-13 用户报「前世书写着是日但没有写具体游戏时间」）⇒ 行首选补游戏日期，
     * 模板一字不动（同一族键还与问天谪星/天道编年史共用）。旧档缺 createdAt ⇒ 不补、不写假日期。 */
    var lines = [];
    (td.chron || []).slice(-7).forEach(function (c) {
      var txt = SQ.Tiandao ? SQ.Tiandao.chronText(ws, pack, D, c) : '';
      if (!txt) return;
      var gd = SQ.gameDateStr(profile, ws, c.at, wid);
      lines.push(gd ? gd + ' · ' + txt : txt);
    });
    /* 终行按通道取四行（寿元批加「寿尽 / 道伤」两行）：原式非飞升一律落「兵解转世」⇒ 死世的
     * 传记会说谎（玩家没兵解，是熬死了）。脏通道仍回落 dissolve，与 legacy.js 的白名单同口径。 */
    var BIO_LINE = { feisheng: 'codex.bio.line.ascend', bingjie: 'codex.bio.line.dissolve',
      shoujin: 'codex.bio.line.shoujin', daoshang: 'codex.bio.line.daoshang', zhesou: 'codex.bio.line.zhesou' };
    var endTxt = SQ.t(BIO_LINE[channel] || BIO_LINE.bingjie, null, wid);
    var endGd = SQ.gameDateStr(profile, ws, now, wid);
    lines.push(endGd ? endGd + ' · ' + endTxt : endTxt);
    /* ③ 统计摘要（≤60 字模板拼装） */
    var bondsN = 0;
    for (var b in (ws.bonds || {})) if ((ws.bonds[b] || 0) >= 1) bondsN++;
    var statsTxt = SQ.t('codex.bio.stats', {
      life: life,
      realm: SQ.t('realm.' + (ws.realm || 0), null, wid),
      win: tri.success || 0, lose: Math.max(0, (tri.attempts || 0) - (tri.success || 0)),
      bonds: bondsN,
      karma: SQ.t('karma.tier.' + (pack.worldSystems.tierOf(ws) || 'neutral'), null, wid)
    }, wid);
    /* ④ 三段式评语（特征加权抽取） */
    var spouseName = ws.spouse ? SQ.t('bond.' + ws.spouse.npcId + '.name', null, wid) : '';
    var qi;
    if ((st.lives || 0) > 0) qi = Math.random() < 0.6 ? 2 : 5;      /* 转世者/承继开局句式 */
    else qi = [1, 3, 4][Math.floor(Math.random() * 3)];
    var xing;
    if ((tri.attempts || 0) >= 5) xing = 1;
    else if ((td.defy || 0) >= 30 || (td.stats || {}).defy >= 3) xing = 2;
    else if (ws.spouse || bondsN >= 5) xing = 3;
    else if ((ws.karma || 0) <= -500) xing = 4;
    else if (ws.factionId && SQ.Factions && SQ.Factions.rankOf(ws, D) >= 3) xing = 5;
    else xing = 1 + Math.floor(Math.random() * 5);
    var zhong;
    if (channel === 'feisheng') zhong = ((ws.tribMarks || {}).yuanman ? 2 : 1);
    else if (channel === 'bingjie') zhong = (ws.realm >= 5 ? 4 : 3);
    /* 被动了结走五型（「未能登天，未能兵解」——三、四型都写自散修为，死世用即说谎）。
     * 五型此前**写了却抽不到**（zhong 只有 1~4 四个出口），本批第一次真把它接上。 */
    else zhong = 5;
    var officeTxt = (ws.factionId && SQ.Factions)
      ? SQ.t('faction.rank.' + SQ.Factions.rankOf(ws, D), null, wid) : '';
    var text =
      SQ.t('codex.bio.head', { name: name, life: life }, wid) + '\n' +
      SQ.t('codex.bio.qi.' + qi, { name: name, life: life, world: (profile && profile.worldName) || '', startNote: SQ.t('codex.bio.startnote', null, wid) }, wid) + '\n' +
      SQ.t('codex.bio.xing.' + xing, {
        name: name, n1: tri.attempts || 0, n2: tri.success || 0, n3: Math.max(0, (tri.attempts || 0) - (tri.success || 0)),
        n: (td.stats || {}).defy || 0, n4: bondsN, spouse: spouseName, karma: Math.round(ws.karma || 0), office: officeTxt
      }, wid) + '\n' +
      SQ.t('codex.bio.zhong.' + zhong, { name: name, realm: SQ.t('realm.' + (ws.realm || 0), null, wid) }, wid) + '\n' +
      /* 开宗附加句（图鉴卷 §传记特征键表的「开宗」项，2026-10-08 前抽取链无 `ws.sect` 分支 ⇒
       * 自立门户这一整条人生线在传记里凭空消失）。**不做成 xing 第 6 型**：卷面 xing 五型是已登记
       * 口径，附加句零计数改动、且与五型可并存（一个「性烈抗旨」的宗主仍是宗主）。 */
      (ws.sect && ws.sect.name
        ? SQ.t('codex.bio.sect', { sect: ws.sect.name, n5: (ws.sect.disciples || []).length }, wid) + '\n'
        : '') +
      lines.join('\n') + '\n' + statsTxt;
    if (text.length > (D.LEGACY.BIO_MAX || 500)) text = text.slice(0, D.LEGACY.BIO_MAX || 500);
    return {
      life: life, name: name, text: text,
      stats: { realm: ws.realm || 0, win: tri.success || 0, att: tri.attempts || 0, bonds: bondsN,
        karma: Math.round(ws.karma || 0), zones: (ws.cleared || []).length, defy: td.defy || 0,
        channel: channel, stones: Math.round(ws.stones || 0) },
      source: 'local', ts: now
    };
  }

  function pushBio(meta, bio, life, name, channel, now) {
    if (!bio) return;
    bio.life = life != null ? life : bio.life;
    bio.name = name || bio.name;
    meta.biographies.push(bio);
    var capBio2 = SQ.BioCaps ? SQ.BioCaps.store() : 6;   /* 正典① 落盘上界单一取数处（与 core.js 级⓪、legacy.js normalize 同表） */
    while (meta.biographies.length > capBio2) meta.biographies.shift();   /* 超限挤最旧 */
  }

  /* ── 「烧表请天道作传」整族下线（第册批 · 用户令「前世书有个天道做传的，这块功能去掉」）──
   * 删的是 `bioMemo`（奏疏生成）与 `adoptBio`（粘贴采纳：敏感词过滤 → 500 字硬截 → 回落本地稿）
   * 两函数 + `Actions.adoptBio` + `D.LEGACY.BIO_MEMO_LEN` + 五条词条 + 提示词键。
   * 保留的部分有意划清：`b.source` 字段与「本地史笔 / 天道亲笔」小标留着——老档里确有
   * `source:'tiandao'` 的条目，抹掉来源标记等于改史；`Tiandao.filterText` 也留着（问天谪星同读它）。
   * 反向取证 = 冒烟 #315（四个出口全部认不到 + 词表键整族不在 ⇒ A6 不会报孤儿）。 */

  SQ.Codex = {
    mergeFace: mergeFace,
    faceCount: faceCount,
    faceDenom: faceDenom,
    msPcts: msPcts, msMarks: msMarks, legacyCap: legacyCap,
    addTitle: addTitle,
    checkMilestones: checkMilestones,
    qiRateOf: qiRateOf,
    achvMet: achvMet,
    scan: scan,
    generateBio: generateBio,
    pushBio: pushBio
  };
})();
