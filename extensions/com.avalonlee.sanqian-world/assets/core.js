/* core.js — G1 存档层：load / save / normalize / claim / mutate
 * 存储契约（工程规范 §3.6）：
 *  - 宿主桥 storage 为异步 Promise、按扩展隔离、跨形态共享 → 全链路 async；
 *  - 入口一律 boot 模式：先 await 读档再首绘；
 *  - 无桥（浏览器直开预览）→ 回退 localStorage，仅此一种回退场景；
 *  - 单一写入通道：一切变更走 claim / mutate，mutate 回调抛异常则不落盘（事务性）。
 * 两键分工（存档治理批 2026-10-09 写明）：
 *  - 主档 KEY = sanqian-state-v1：**机制态**（角色 + 一世世界态 + meta 跨世账本）——落盘前剥离展示流，
 *    体积与实际游玩时长**解耦**（越玩越大的不再是主档）；
 *  - 侧档 LOG_KEY = sanqian-logs-v1：**展示流**（日志 + 奇遇叙事流 feed），各自带字节预算、超预算挤最旧。
 *    键名沿用不改（改名会孤立既有玩家日志）；载荷 v:1 = {logs, feed}，读端对缺 feed 的旧档按无该族处理。
 */
(function () {
  var SQ = window.SQ;
  var KEY = 'sanqian-state-v1';
  var LOG_KEY = 'sanqian-logs-v1';   /* 日志独立存档键（2026-10-05 日志存档批）：与主档分离，主档压缩阶梯不再裁日志 */
  var V = 1;

  function hasBridge() {
    return typeof window.xhub !== 'undefined' && !!window.xhub.storage;
  }

  function defaultProfile() {
    return {
      name: '',                /* 空 = 未入世；显示层走 t('profile.default_name')（P3 词表纪律） */
      talents: [],
      legacyTalents: [],       /* 转世天赋槽 ≤2（轮回卷 §3.3：独立于常规天赋、买断入池逐世换选） */
      worldId: 'xiuxian',
      worldName: '',
      createdAt: 0,
      alignBias: 'neutral',    /* 问道初心（创角屏 2，锁定态）：right|neutral|evil（工程规范 §3.1 v2.0） */
      gender: 'male',          /* 预留字段，本期无选择入口（工程规范 §3.1 v2.2 / 冒烟 #117） */
      race: 'human',           /* 同上 */
      seenNote: null           /* 已读更新公告的公告号（第册四批 · UI 卷 §3.4e）；null = 一次都没看过 */
    };
  }

  /* 字符串数组归一：去非字符串 / 去空 / 去重 / 限长（settings.tabOrder 等偏好项共用） */
  function strArr(a, cap) {
    var out = [], seen = {};
    if (Array.isArray(a)) {
      for (var i = 0; i < a.length && out.length < cap; i++) {
        var v = a[i];
        if (typeof v === 'string' && v && !seen[v]) { seen[v] = 1; out.push(v); }
      }
    }
    return out;
  }

  function defaultState() {
    return {
      v: V,
      profile: defaultProfile(),
      worlds: {},
      /* meta 层完整缺省（轮回卷 §8.1；Legacy 未装载时回落旧口径） */
      meta: SQ.Legacy ? SQ.Legacy.metaBlank() : { unlockedWorlds: ['xiuxian'] },
      /* 玩家偏好（非角色数据）：autoTrib 关闭 = 修为圆满不自动突破，需手动点「渡劫」；
       * autoEvent 关闭 = 奇遇触发时弹窗由玩家抉择，开启 = 自动择一可用分支并结算；
       * eventPref = 自动奇遇的分支倾向（none 无倾向 / right 正道 / evil 魔道 / neutral 左道）——
       *   优先选该分支，不可用则随机其他；
       * tabOrder = 游戏页菜单顺序（id 数组，空 = 默认序；系统页固定底部不参与，视图层负责对账） */
      settings: { autoTrib: false, autoEvent: false, eventPref: 'none', tabOrder: [] }
    };
  }

  /* 逐层 normalize（验收 4.1 #2/#3/#4/#10）：
   * v 不匹配 / 空档 → 全新 defaultState；worlds 各世界走世界包 normalize。 */
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || raw.v !== V) return defaultState();
    var s = defaultState();
    var p = raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
    var dp = defaultProfile();
    var BIAS = { right: 1, neutral: 1, evil: 1 };
    s.profile = {
      name: typeof p.name === 'string' && p.name ? p.name : dp.name,
      talents: Array.isArray(p.talents) ? p.talents : [],
      /* 转世天赋（轮回卷 §3.3）：只收 {id, effects} 结构、effects 数值键、槽位 ≤2；脏档逐项清理 */
      legacyTalents: (function () {
        var outL = [];
        (Array.isArray(p.legacyTalents) ? p.legacyTalents : []).forEach(function (lt) {
          if (!lt || typeof lt !== 'object' || typeof lt.id !== 'string' || !lt.id) return;
          if (!lt.effects || typeof lt.effects !== 'object') return;
          var eff = {};
          for (var fk in lt.effects) if (typeof lt.effects[fk] === 'number' && isFinite(lt.effects[fk])) eff[fk] = lt.effects[fk];
          if (outL.length < 2) outL.push({ id: lt.id, effects: eff });
        });
        return outL;
      })(),
      worldId: typeof p.worldId === 'string' && p.worldId ? p.worldId : 'xiuxian',
      worldName: typeof p.worldName === 'string' ? p.worldName : '',
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : 0,
      alignBias: BIAS[p.alignBias] ? p.alignBias : 'neutral',
      gender: typeof p.gender === 'string' && p.gender ? p.gender : 'male',
      race: typeof p.race === 'string' && p.race ? p.race : 'human',
      seenNote: typeof p.seenNote === 'string' && p.seenNote ? p.seenNote : null   /* 脏值（对象/数字/空串）归 null */
    };
    var m = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
    /* codices 串接还原（容量级⑦ · 扩容批启用）：落盘时九面数组可能被压成逗号串（save 侧序列化副本），
     * boot 在此 split 还原数组——读端（codex.js/view/断言）恒只见数组，格式双轨零侵入；
     * 白名单正则（id 字符集 + 逗号）才拆，脏字符串照旧交 metaNormalize 按非数组清理 */
    if (m.codices && typeof m.codices === 'object') {
      for (var cf in m.codices) {
        var cv = m.codices[cf];
        if (typeof cv === 'string' && cv.length && /^[\w\-.]+(,[\w\-.]+)*$/.test(cv)) m.codices[cf] = cv.split(',');
      }
    }
    /* meta 层（轮回卷 §8.1 唯一事实源）：遗泽/图鉴/成就/传记/称号/解锁/统计全量 normalize；
     * 轮回模块未装载时回落旧口径（只有 unlockedWorlds） */
    /* 级⑧b 还原先行（与级⑥ codices split 同点位，必须在 metaNormalize 之前——metaNormalize 只认
     * earnedKeys、未知字段一律不带出，紧凑键 ekF 若不先展开回填就会连同条目一起丢档） */
    expandFoldedEarned(m);
    s.meta = SQ.Legacy ? SQ.Legacy.metaNormalize(m)
      : { unlockedWorlds: Array.isArray(m.unlockedWorlds) ? m.unlockedWorlds : ['xiuxian'] };
    /* 级⑧还原：codices.title 落盘被折叠为差集键 titleX → 还原 = titleX ++ titles（**溢出在前 = 原插入序**：
     * 差集恰为 addTitle 的 while(>80) shift 挤出的最旧称号，titles 存的是最新 80 条，故旧在前新在后）。
     * 置于 metaNormalize 之后 = titles 已去重去脏去非字符串。无条件无损，见 withFoldedTitle 注。 */
    if (s.meta && s.meta.codices && typeof s.meta.codices === 'object' && !Array.isArray(s.meta.codices.title)) {
      var tt208 = Array.isArray(s.meta.titles) ? s.meta.titles.slice() : [];
      var ox208 = s.meta.codices.titleX;
      var oa208 = (typeof ox208 === 'string' && ox208) ? ox208.split(',') : (Array.isArray(ox208) ? ox208 : []);
      var seenT208 = {};
      tt208.forEach(function (x) { seenT208[x] = 1; });
      s.meta.codices.title = oa208.filter(function (x) {
        return typeof x === 'string' && x && !seenT208[x];
      }).concat(tt208);
      delete s.meta.codices.titleX;
    }
    var st = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    s.settings = {
      autoTrib: st.autoTrib === true, /* 缺省/脏值一律回落 false（默认关闭） */
      autoEvent: st.autoEvent === true,
      eventPref: (st.eventPref === 'right' || st.eventPref === 'evil' || st.eventPref === 'neutral') ? st.eventPref : 'none',
      tabOrder: strArr(st.tabOrder, 32) /* 去重去空、限长；未知 id 由视图层对账剔除 */
    };
    var w = raw.worlds && typeof raw.worlds === 'object' ? raw.worlds : {};
    for (var id in w) {
      var entry = SQ.Worlds[id];
      if (entry && entry.pack && entry.pack.normalize) {
        s.worlds[id] = entry.pack.normalize(w[id]);
      } else {
        s.worlds[id] = w[id]; /* 未知世界透传（只透传不解释） */
      }
    }
    return s;
  }

  /* 存档 I/O 失败登记（平台关卡 #89 桥容错）：storage 被拒/失败时不白屏、不静默丢档——
   * 记一条 {op:'read'|'write', msg}，由视图层取词表出人话提示（ui.error.storage / ui.error.save），
   * 成功后清空。读档失败仍回落新档（#4 语义），写档失败不抛（游戏可继续，只是提示未落盘）。 */
  var ioError = null;
  /* 审计 #1（第十四批）：一次写失败后，盘上就是旧态；claim/mutate 起手若无条件 `await load()`，
   * 玩家那笔操作会在 1 秒后的 tick 被旧值打回（= 进度静默回滚）。pendingSave 记住没落盘的那一态，
   * 任一写成功即清空。审计 #3：侧档读不动时跳写要能被 save 观察到（见 sideWriteSkipped）。 */
  var pendingSave = null;
  var sideWriteSkipped = false;

  async function load() {
    try {
      var raw;
      if (hasBridge()) {
        raw = await window.xhub.storage.get(KEY);
      } else {
        raw = localStorage.getItem(KEY);
      }
      /* 水位：读档时也记一次盘上真实体量（重启后第一次进设置页就有读数，不必等一次落盘） */
      saveStats.readMainBytes = storedBytes(raw == null ? '' : raw);
      saveStats.mainBytes = saveStats.readMainBytes;   /* 刚读到的就是盘上当前体量；下一次写会覆盖成落盘度量 */
      /* 解码三态全收（对象 / 明文 JSON / d1: 压缩串）⇒ 旧档与测试存档件零迁移 */      if (typeof raw === 'string' && raw.indexOf(CODEC_PREFIX) === 0 && !codecReady()) {
        /* 档是压缩写的、当前宿主读不动：显式报错走 ioError 出口（视图有提示），不静默当空档 */
        throw new Error('codec-unavailable');
      }
      var txt = await decodePayload(raw);
      var st = normalize(txt ? JSON.parse(txt) : null);
      /* 侧档回填（独立键优先）：日志 + 奇遇叙事流两族展示流
       * 缺档 / 该世界无条目时沿用主档遗留（旧档迁移：首次 save 会把沿用的内容写进侧档，
       * 此后主档不再含 log / eventHistory.feed ⇒ 主档体积与实际游玩时长解耦） */
      var store = await readLogStore();
      if (store) {
        var sf = store.feed || {};
        for (var wid in st.worlds) {
          /* 守卫：世界条目非对象（未知世界透传可能带 null）时整行跳过 ——
           * 回填发生在 normalize 之后、catch 之内，一处抛异常会让整次读档回落 defaultState（= 玩家看成失档） */
          var W = st.worlds[wid];
          if (!W || typeof W !== 'object') continue;
          var L = store.logs[wid];
          if (Array.isArray(L) && L.length) W.log = L.slice(-LOG_HARD_CAP);
          var F = sf[wid];
          if (Array.isArray(F) && F.length && W.eventHistory && typeof W.eventHistory === 'object') {
            W.eventHistory.feed = trimFeedBudget(F);   /* 纯函数：条数兜底 + 字节预算都在里面，返回新数组 */
          }
        }
      }
      ioError = null;
      return st;
    } catch (e) {
      ioError = { op: 'read', msg: (e && e.message) || String(e) };
      return defaultState(); /* 读档失败不崩溃：回落新档（#4 语义） */
    }
  }

  /* ── A7 存档容量防线（轮回卷 §8.4 压缩预案 · 触发线 ws+meta > 45KB，红线 50KB）──────
   * **日志存档批 2026-10-05**：日志改走独立键 LOG_KEY（save 前 stripLog 剥离、load 后回填），
   *   主档只剩「角色 + meta」→ 原级 ⓪/④/⑥ 里的 log 截断全部移除，阶梯重编为 ⓪~⑤ + ⑥ codices
   *   （本批再续 ⑦⑧⑨ 三级，见下）；
   *   日志自身按 256KB 字节预算在日志档内裁剪（见 SQ.Log），离线/重开不再丢早期日志。
   * 实测口径（六向批 A7 · 最坏态分解）：剥离日志后主档最坏态仍超 45KB 触发线（meta 九面 + 传记 +
   *   karmaLog + earnedKeys 是主项），故阶梯保留；正典 ② codices 位图登记不启用（实测 codices
   *   ≈9.1KB 在预算内，格式双轨侵入收益低——收口裁定登记）。
   * **级序编号校正（2026-10-05 存档容量防线批）**：日志独立存档键批把原 ⓪ log 截 400 / ④ log 100 /
   *   ⑥ log 清空三级删除后，本注与轮回卷 §8.4「实施现状」、工程规范 §3.5 容量红线行**均未重编号**
   *   （三处仍写含 log 级的「八级阶梯」，且本文件 compressForSave 注写「级⑦ codices」而实现是第 7 级）——
   *   本批统一为**就地级 ⓪~⑤ + 序列化副本级 ⑥~⑩**，两份正典同批校正。
   *   〔🔧 **2026-10-11 审计处置批（第十四批）**：级⑩（`withTrimmedFeed`）整族删除 ⇒ **现行 = 就地级 ⓪~⑤ +
   *   副本级 ⑥⑦⑧⑧b⑨**，`stages` 值域 **0..10**（`6+ci` 映射未动）。正典行 = 轮回卷 §8.4 v1.16。〕
   * 级序（每级后复测，≤45KB 即停）：
   *   ⓪ biographies 9→6 世（正典①）  ① karmaLog 20→10（正典③）
   *   ② earnedKeys trib.N 逐世键并为 trib.bulk 总额（正典④——karma 总额不变，恒等式 #197 不破，牺牲逐次幂等粒度）
   *   ③ eventCooldowns 只留未到期键
   *   ④ biographies →1 世（挤最旧语义既有先例）
   *   ⑤ 极端保底：eventHistory.seen 留最近 40 键 + tiandao.history 留最近 5 条
   *     （全部纯展示流——数学核算最坏态 ≤ 红线 50KB；seen 裁剪只放宽事件重复面，
   *       图鉴九面已入 meta.codices 永不回退；seenIds 旨意幂等键永不裁剪）
   *   ── 以上就地改 s；以下为**序列化副本级**（浅拷贝链式叠加、内存态零污染、读端零侵入）──
   *   ⑥ codices 九面串接压缩（**扩容批 2026-10-04 启用**——炼丹扩容 pill keys +290B 把阶梯耗尽后
   *     最坏态推破 51200B 红线〔实测 51270~51336B 间歇超限〕，正典②预留位激活条件「预算击穿」成立；
   *     方案 = 数组→逗号串（省 JSON 引号逗号开销 ≈3B/元素，九面 ≈707 id 省 ≈2.1KB，余量恢复 ≈2KB）
   *     而非位图（位图需各面静态池索引映射、title 面动态称号无池不可行）；boot normalize split 还原）
   *   ⑦ factions[].rel 上半三角化（**2026-10-05 存档容量防线批启用**——势力关系是 20 势力两两对称矩阵
   *     380 条，factions.js ③④ 段正反各写一遍 → 一半是纯冗余；落盘只留 owner.id < key 一侧，
   *     世界包 normalize 对称还原，读端恒见双向；**无损**格式变换，实测省 ≈3.5KB）
   *   ⑧ codices.title 折叠为差集（**同批启用**——codices.title ⊇ meta.titles 且差集恰为 addTitle 的
   *     while(>80) shift 挤出的最旧称号〔常态为空〕，落盘只存差集键 titleX、normalize 还原 titleX ++ titles，
   *     **无条件无损**、不依赖称号数 ≤ 80 前提，实测省 ≈1.1KB。⚠️ 初版为「删键 + ≤80 前提护栏」，经查
   *     图鉴传记卷 §2.9 称号墙动态面当前可获 ≈75 已逼近上限、余量仅 5 → 改存差集，护栏降级为冗余校验）
   *   ⑨ prodMarks.rankRows 榜面冻结快照裁除（**同批启用**——卡片化批新增每 10 游戏年冻结的 31 行快照，
   *     实测 1.64KB；prodigy.js rankRows() 契约本就含「无快照返回 null → 视图回落实时榜」回落路径，
   *     故裁除**零功能损失**，代价仅「区间内不重排」语义本次失效、下次到期重新冻结；
   *     slotMax〔槽位不复用〕/ myRank / rankAt / sudiWin / evf 全保留）
   *   ⑩ eventHistory.feed 叙事流裁至最近 10 条（**同批启用**——feed 满档 50 条 ≈11~14KB 是**真实存档最大单项**，
   *     CAP_WATCH 实测 10.5~11.2KB 超过 codices/factions/prodigies；纯展示流、代价 = 重载后奇遇页历史卡变少，
   *     与 `EVENT_FEED_CAP` 自然挤旧同类语义故列末级。`lastId` / `seen` 全保留）
   *     〔🔧 **2026-10-11 审计处置批：本级连同 `withTrimmedFeed` / `SAVE_FEED_KEEP` 整族删除**。两条账同时纠正：
   *     实现值是 **5** 条（`SAVE_FEED_KEEP=5`，本注原写 10 = 抄错），且 `savePayload` 必先 `stripSideFlows`
   *     ⇒ 阶梯拿不到 feed，该级**结构上不可达**；它留下的唯一痕迹是 #206 那条恒真的「级⑩=触发」空判（本批改判）。〕
   *   ⑧b meta.earnedKeys 五项收集键族折叠为紧凑容器 meta.ekF（**2026-10-07 无损序列化折叠批启用**——
   *     正典 轮回卷 §二 说收集类项复用图鉴账本作幂等键、不在 earnedKeys 二次冗余存储，但 legacy.js
   *     落的是**含历史转世通道系数的实付额**（飞升世 2 / 兵解世 floor(2×0.7)=1），故 ΣearnedKeys
   *     不可由「图鉴账本 + 常量表」重算（#197 会依赖不可复现的历史）。折中 = **无损序列化折叠**：
   *     内存态、earn 路径、#197 公式一字不动，只在落盘前把 treasure./artmax./title./achv_/codex.ms.
   *     五族按「族 → {实付额: [去前缀 id]}}」分组落盘（自描述桶键，还原侧不查表），值不合规的条目
   *     原样留在 earnedKeys 作**例外表**；normalize 在 metaNormalize 之前精确回填 → **往返深度全等**
   *     （冒烟 #258）。zone./boss./trib./ascend/realmMax/officeMax/rankMax 一律不折（累计/逐世入账）。
   *     ⚠️ 位次说明：本级与 ⑥⑦⑧ 同为**无损级**，按「语义损失递增」排在 ⑨⑩ 之前；⑨⑩ 编号已被
   *     两份正典与断言 #251 标题占用，本批不重编号，记为 **级⑧b**（无损段扩展位）
   *   副本级序按「语义损失递增」排：⑥⑦⑧⑧b 全无损（格式变换 / 对称冗余 / 差集折叠 / 键名+常量折叠），
   *   ⑨⑩ 才有展示语义代价
   * ⚠️ 三级副本级全跑完仍超红线时的下一级 = 正典②预留「codices 位图化八面（title 面除外）」（−7KB 量级），
   *   触发条件同款「阶梯耗尽仍超 45KB」；该级动的是**跨世永不清的图鉴永久数据**且引入「池扩容只许尾部
   *   追加」的永久索引稳定约束，属高风险级，须单独授权开工。 */
  /* ── 存档容量红线（2026-10-05 存档容量防线批 **重核**：50KB → 64KB、触发线 45KB → 56KB）──────
   * **重核依据（三条实测取证，非放宽纪律）**：
   * ① 50KB **无任何外部依据**——平台扩展开发指南全文无存储配额条目，`xhub.storage` 按扩展隔离持久化、
   *   只要求 value 可 JSON 序列化；平台实际落盘 `.storage.json` 就是按 key 直写的普通 JSON 文件。
   * ② **同一套存储接口上的兄弟键已在跑 256KB 预算**——日志独立存档键 `sanqian-logs-v1` 的字节预算是
   *   256KB（2026-10-05 日志存档批定），即平台侧单键体量早就不止 50KB 一个量级。
   * ③ **补全 #206 最坏态模型后实测 60024B**（补齐 stash 12 件 + shop 三架各 10 格满 gear 两处漏项），
   *   超旧红线 8824B = 17%；而正典②预留的 codices 位图化八面**只能省 ≈6.2KB、单独用仍然不够**，
   *   且要动跨世永不清的图鉴永久数据 + 引入「八个内容池只许尾部追加」的**永久索引稳定约束**
   *   （任何池重排/删除即静默损坏玩家图鉴）——为一个无外部依据的自设预算付这个代价不成立。
   * 存档变大是**游戏变大**的结果（20 势力关系矩阵 / 30 天骄 / 46 法宝 / 70 功法 / 九面图鉴 / 60 成就 /
   * 9 世传记 / 12 件背包 / 30 格货架），不是失控。重核**可逆**、位图化永久数据**不可逆**。
   * 新口径：红线 64KB、触发线 56KB（8KB 安全垫，沿用旧 50/45 的「垫在红线下方」结构）；
   * 最坏态 60024B 距红线余量 **5512B（9.2%）**，且仍高于触发线 → 阶梯在极端档上照常工作。
   * **单一事实源**：两值经 SQ.SAVE_RED / SQ.SAVE_TRIGGER 导出，全部测试脚本读它、不再各自硬编码
   * （旧口径散落 core.js + smoke #9/#206/#230 + sim-playthrough 三处 + probe 共 5 处 = 本次事故成因之一）。 */
  var SAVE_TRIGGER = 56 * 1024;
  var SAVE_RED = 64 * 1024;
  function strBytes(str) {
    var n = 0;
    for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); n += c > 0x7ff ? 3 : (c > 0x7f ? 2 : 1); }
    return n;
  }
  /* 就地级 ⓪~⑤（存档治理批 2026-10-09 改**纯函数**）：返回**新状态对象**，内存态零污染。
   * 改前缺陷（本批修）：原实现直接改 `s.meta` / `s.worlds[wk]`，而 savePayload 只浅拷贝过顶层
   *   （stripSideFlows 脱 log 那条链），meta 与各 world 对象同玩家活档**同一引用** ⇒ 一次触发有损级
   *   就同时摧毁内存态（传记 9→6、karmaLog 20→10、trib 逐世键被并、到期冷却键被删、seen 被剪）。
   * 现按 ⑥~⑩ 既有范式「只拷被改的那条路径、其余共享」；取证 = 冒烟 #277（注入极小触发线跑满
   *   就地级后，活档 biographies / karmaLog / earnedKeys / eventCooldowns / eventHistory.seen 逐字段全等）。 */
  function cpMeta(s) {
    var cp = {}, m = {}, k, mk;
    for (k in s) cp[k] = s[k];
    for (mk in s.meta) m[mk] = s.meta[mk];
    cp.meta = m;
    return cp;
  }
  function cpWorld(s, wk) {
    var cp = {}, worlds = {}, w = {}, k, f;
    for (k in s) cp[k] = s[k];
    for (k in s.worlds) worlds[k] = s.worlds[k];
    for (f in s.worlds[wk]) w[f] = s.worlds[wk][f];
    worlds[wk] = w;
    cp.worlds = worlds;
    return cp;
  }
  function compressStep(s, stage, now) {
    var m = s.meta, c, ek, sum, any, k, sub;
    /* meta 面：⓪ biographies→6 ｜ ① karmaLog→10 ｜ ② trib.N 并 trib.bulk（Σ 不变 ⇒ #197 不破）｜ ④ biographies→1 */
    if (stage === 0 || stage === 1 || stage === 2 || stage === 4) {
      if (!m) return s;
      if (stage === 0) {
        if (!(Array.isArray(m.biographies) && m.biographies.length > bioStoreCap())) return s;
        c = cpMeta(s); c.meta.biographies = m.biographies.slice(-bioStoreCap()); return c;
      }
      if (stage === 1) {
        if (!(Array.isArray(m.karmaLog) && m.karmaLog.length > 10)) return s;
        c = cpMeta(s); c.meta.karmaLog = m.karmaLog.slice(-10); return c;
      }
      if (stage === 4) {
        if (!(Array.isArray(m.biographies) && m.biographies.length > 1)) return s;
        c = cpMeta(s); c.meta.biographies = m.biographies.slice(-1); return c;
      }
      if (!m.earnedKeys) return s;
      ek = {}; sum = 0; any = false;
      for (k in m.earnedKeys) {
        if (/^trib\.\d+$/.test(k)) { sum += m.earnedKeys[k]; any = true; continue; }
        ek[k] = m.earnedKeys[k];
      }
      if (!any) return s;
      ek['trib.bulk'] = (m.earnedKeys['trib.bulk'] || 0) + sum;
      c = cpMeta(s); c.meta.earnedKeys = ek; return c;
    }
    /* world 面：③ eventCooldowns 只留未到期 ｜ ⑤ eventHistory.seen 留最近 40 键 + tiandao.history 留 5 条 */
    var out = s;
    for (var wk in (s.worlds || {})) {
      var w = s.worlds[wk];
      if (!w) continue;
      if (stage === 3) {
        if (!w.eventCooldowns) continue;
        /* 死键判据 = 触发时刻早于「now − 池内最长冷却」。两种写法都安全：
         *   fire-time（events.js:573/604 · rumors.js:236 · prodigy.js:388）⇒ 冷却必已过；
         *   expiry-time（events.js:924 的 now + cdFailHours）⇒ 该值本身已在 now 之前。
         * ⚠️ 旧规则写作 `value < now 即删`，把「刚触发」当成「已到期」⇒ 一删就是全部冷却键（本批复核抓获并修）.*/
        var deadBefore = now - COOL_MAX_HOURS * 3600 * 1000;
        var dropped = 0, cd = {}, ck;
        for (ck in w.eventCooldowns) {
          if ((w.eventCooldowns[ck] || 0) < deadBefore) dropped++;
          else cd[ck] = w.eventCooldowns[ck];
        }
        if (!dropped) continue;
        c = cpWorld(out, wk); c.worlds[wk].eventCooldowns = cd; out = c;
      } else if (stage === 5) {
        if (w.eventHistory && w.eventHistory.seen) {
          var ks = Object.keys(w.eventHistory.seen);
          if (ks.length > 40) {
            ks.sort(function (a, b) { return (w.eventHistory.seen[a] || 0) - (w.eventHistory.seen[b] || 0); });
            var seen = {};
            for (var ki = ks.length - 40; ki < ks.length; ki++) seen[ks[ki]] = w.eventHistory.seen[ks[ki]];
            c = cpWorld(out, wk);
            sub = {}; for (k in w.eventHistory) sub[k] = w.eventHistory[k];
            sub.seen = seen; c.worlds[wk].eventHistory = sub; out = c;
          }
        }
        if (w.tiandao && Array.isArray(w.tiandao.history) && w.tiandao.history.length > 5) {
          c = cpWorld(out, wk);
          sub = {}; for (k in w.tiandao) sub[k] = w.tiandao[k];
          sub.history = w.tiandao.history.slice(-5); c.worlds[wk].tiandao = sub; out = c;
        }
      }
    }
    return out;
  }

  /* 冷却键容器（`ws.eventCooldowns`）的落盘策略 —— 本批两段裁定，都写在这里防止再次踩坑：
   *   ① **恒常前置剪枝（原 L1）撤回**：首版实现按「值 < now 即到期」剪，而该容器存的其实是
   *      **触发时刻**（写口 events.js:573/604 · rumors.js:236 · prodigy.js:388），读端判据
   *      `now < cd + cooldownHours×3600e3`（events.js:498 / rumors.js:223 · 池内最大 168h），
   *      另有一种写法存的是**到期时刻**（events.js:924 `now + cdFailHours`）。⇒ 「值 < now」= 刚触发，
   *      恒常剪它等于每次存档清空活冷却、重载后同一批奇遇立刻重复出。复核（真档 + 沙箱复跑）抓获 ⇒ 撤回，
   *      落盘**恒常不剪冷却键**（一世内该容器受奇遇池规模约束 ≈124 键 / 3.1KB，量级不构成红线压力）。
   *   ② 阶梯**级③ 的规则同批改正**（见上 compressStep）：只在触发线之上跑，且只剪
   *      `值 < now − COOL_MAX_HOURS` 的**可证死键** —— 两种写法下都必然已失效，属无损。
   * 反漂移：`SQ.COOL_MAX_HOURS` 导出，冒烟 #277(d) 断言「池内 cooldownHours 最大值 ≤ 它」——
   *   日后若有奇遇把冷却调到 168h 以上，改了常量而忘改判据即红。 */
  var COOL_MAX_HOURS = 168;         /* 池内最长冷却（实测 assets/worlds/xiuxian/events.js cooldownHours 最大 168 = 7 游戏日） */

  /* 主档落盘前剥离**展示流**（日志 + 奇遇叙事流，两者同走侧键 LOG_KEY）。
   * 存档治理批 2026-10-09：原 stripLog 只脱 log。`ws.eventHistory.feed` 满档 50 条 ≈11~14KB 是
   *   **真实存档最大单项**（sim-playthrough CAP_WATCH 实测 10.5~11.2KB，超过 codices / factions /
   *   prodigies 任何一面），此前只有阶梯级⑩在触发线之上才裁、且一刀裁到 5 条 = 玩家可见的
   *   奇遇历史只剩尾巴。现与日志同法：内存态 `ws.eventHistory.feed` 契约**一字不动**
   *   （events.js:938 写口 / view 读口零改动），只在落盘时搬进侧键、读档时回填 ⇒
   *   **主档体积与实际游玩时长解耦**（这是「单文件越玩越大」的最大单项成因），feed 的容量
   *   由侧键自己的 SQ.FEED_BYTE_BUDGET 管（新在前、超预算挤最旧）。
   *   ⚠️ 原注末句「阶梯级⑩降级为侧键写失败时的保险」**已随 2026-10-11 审计处置批作废**：级⑩ 整族删除 ⇒
   *   **侧档写失败或读不动时，主档侧没有任何兜底**，展示流这批就丢——所以那条跳写/异常必须走 ioError 出口
   *   让人看见（审计 #3），而不是靠一级永不可达的阶梯假装兜着。浅拷贝只脱被剥的那条路径，内存态 s 零污染。
   * ⚠️ `lastId` / `seen` 留在主档（去重与 `once` 幂等语义，不属展示流）。 */
  function stripSideFlows(s) {
    if (!s || !s.worlds) return s;
    var cp = {}, k;
    for (k in s) cp[k] = s[k];
    var worlds = {};
    for (var wk in s.worlds) {
      var w = s.worlds[wk];
      if (!w) { worlds[wk] = w; continue; }
      var hasLog = Array.isArray(w.log) && w.log.length > 0;
      var eh = w.eventHistory;
      var hasFeed = !!(eh && Array.isArray(eh.feed) && eh.feed.length > 0);
      if (!hasLog && !hasFeed) { worlds[wk] = w; continue; }
      var wc = {};
      for (var f in w) wc[f] = w[f];
      if (hasLog) delete wc.log;
      if (hasFeed) {
        var ehc = {};
        for (var g in eh) ehc[g] = eh[g];
        delete ehc.feed;
        wc.eventHistory = ehc;
      }
      worlds[wk] = wc;
    }
    cp.worlds = worlds;
    return cp;
  }
  /* 级⑦序列化副本：codices 九面数组 → 逗号串（只用于落盘，内存态 s 零污染） */
  function withJoinedCodices(s) {
    var m = s.meta;
    if (!m || !m.codices || typeof m.codices !== 'object') return s;
    var cj = {};
    for (var cf in m.codices) {
      var cv = m.codices[cf];
      cj[cf] = Array.isArray(cv) ? cv.join(',') : cv;
    }
    var cp = {};
    for (var k in s) cp[k] = s[k];
    var cm = {};
    for (var k2 in m) cm[k2] = m[k2];
    cm.codices = cj;
    cp.meta = cm;
    return cp;
  }

  /* 级⑦序列化副本：factions[].rel 上半三角化（对称冗余回收 ≈50%），内存态零污染。
   * rel = 势力两两关系矩阵，factions.js ③④ 段写入时正反各存一遍（fa.rel[fb.id]=rel; fb.rel[fa.id]=rel），
   * 故落盘只留「对端 id 字典序更大」的一侧即上三角；世界包 normalize 对称还原（见 xiuxian/index.js
   * 「rel 对称还原」段），读端 Factions.byId(ws,fid).rel[otherId] 恒见双向——格式双轨零侵入，同级⑥范式。 */
  function withTriangleRels(s) {
    var ws = s && s.worlds;
    if (!ws) return s;
    var cp = {}, k;
    for (k in s) cp[k] = s[k];
    var worlds = {};
    for (var wk in ws) {
      var w = ws[wk];
      if (!w || !Array.isArray(w.factions) || w.factions.length < 2) { worlds[wk] = w; continue; }
      var wc = {}, f;
      for (f in w) wc[f] = w[f];
      var list = [];
      for (var i = 0; i < w.factions.length; i++) {
        var fa = w.factions[i];
        if (!fa || typeof fa !== 'object') { list.push(fa); continue; }
        var fc = {}, rel = {}, rk;
        for (var fk in fa) fc[fk] = fa[fk];
        var rawRel = (fa.rel && typeof fa.rel === 'object') ? fa.rel : {};
        for (rk in rawRel) { if (String(rk) > String(fa.id)) rel[rk] = rawRel[rk]; }
        fc.rel = rel;
        list.push(fc);
      }
      wc.factions = list;
      worlds[wk] = wc;
    }
    cp.worlds = worlds;
    return cp;
  }

  /* 级⑧序列化副本：codices.title 折叠为「与 meta.titles 的差集」，内存态零污染。
   * 同源关系：codex.js addTitle 只写 meta.titles（>80 时 while shift 挤最旧）且每次随即
   * mergeFace(meta,'title',meta.titles.slice())；mergeFace 只并不删且保插入序
   * → codices.title ⊇ meta.titles，**差集恰为被 shift 挤出的最旧称号**（常态为空）。
   * 落盘只存差集键 codices.titleX（常态空 → 直接删键、省最多），normalize 还原 = titleX ++ titles。
   * ✅ **无条件无损**：不依赖「称号数 ≤ titles 上限」前提——称号池任意扩容、titles 任意 shift 都不丢历史称号。
   * ⚠️ 初版设计为「直接删 title 键、由 titles 重建」并挂 #250「去重称号数 ≤ 80」前提护栏；经查图鉴传记卷
   *   §2.9 称号墙为**动态面**、当前可获 ≈75（成就 59 + 逆天大劫 1 + 天骄榜位 + 跨世统计类 ≈15）已**逼近 80
   *   上限、余量仅 5**，前提极脆（任何称号扩容批都会静默击穿 → 折叠还原永久丢历史称号）→ 改存差集，
   *   护栏降级为冗余校验（仍保留，越界即提示差集开始承载数据）。 */
  function withFoldedTitle(s) {
    var m = s && s.meta;
    if (!m || !m.codices) return s;
    var t = m.codices.title;
    /* 收数组与级⑥串接后的逗号串双形态（本级排在 ⑥ 之后，常态见到的是串） */
    var arr = Array.isArray(t) ? t : ((typeof t === 'string' && t) ? t.split(',') : null);
    if (!arr || !arr.length) return s;
    var have = {};
    (Array.isArray(m.titles) ? m.titles : []).forEach(function (x) { have[x] = 1; });
    var over = arr.filter(function (x) { return typeof x === 'string' && x && !have[x]; });
    var cp = {}, k;
    for (k in s) cp[k] = s[k];
    var cm = {}, k2;
    for (k2 in m) cm[k2] = m[k2];
    var cj = {}, cf;
    for (cf in m.codices) cj[cf] = m.codices[cf];
    delete cj.title;
    if (over.length) cj.titleX = over.join(','); else delete cj.titleX;
    cm.codices = cj;
    cp.meta = cm;
    return cp;
  }

  /* ══ 级⑧b 序列化副本：meta.earnedKeys 五项收集键族折叠为紧凑容器 meta.ekF ══
   * 背景（轮回卷 §二 正典口径 vs. legacy.js 实况的「账实不符」）：收集类项（法宝 / 功法满级 / 称号 /
   * 里程碑 / 成就）复用图鉴账本作幂等键，但 earnedKeys 里至今逐条存着**实付遗泽额**，而实付额含
   * **历史转世通道系数**（legacy.js `preview()` 的 `mult = channel === 'feisheng' ? 1 : BINGJIE_MULT`
   * 与 `once()` 的 `got: Math.floor(pts * mult)`——行号随该文件在飞批次漂移，故按符号引用）
   * ——同一件法宝在飞升世入账 2、兵解世入账
   * floor(2×0.7)=1。所以**不能**把 #197 恒等式的 Σ 改成「图鉴账本 + 常量表重算」（那等于让恒等式
   * 依赖不可复现的历史，真机存档的遗泽余额会在 reload 时漂移），也**不必**保留二次存储的全部字节：
   * 本级按「内存态与 earn 路径、#197 公式一字不动，只在落盘前折叠、读档后精确还原」处理——
   * 每条只需保留「实付额是多少」这一个信息（桶键 = 实付额本身），键名前缀与逐条数值结构由省到几十倍。
   * 折叠范围 = 正典点名的**五族**（256 条真机落盘值实证零越界，见冒烟 #258a）：
   *   treasure. / artmax. / title.（结算族，实付 ∈ { V, floor(V × BINGJIE_MULT) } 二选一，
   *     V = LEGACY.TREASURE_EACH / ART_MAX_EACH / TITLE_EACH）
   *   achv_*（行为成就）/ codex.ms.*（里程碑）（即时族 earnImmediate，实付 = 该 id 在
   *     CODEX.ACHV[].karma / MS_KARMA[档索引] 表里的定值，**不受通道系数影响**）
   * ⚠️ **不折** zone. / boss. / trib. / ascend / realmMax / officeMax / rankMax——前四者是逐世一次性
   *   或累计入账（earnedKeys 存的就是历史实付额本身），后三者是 earnDelta 差额补分累计值，均不可由
   *   常量表推导；
   * ⚠️ 任何实付值不落在上述合法值集合内的条目（调试直写 / 测试注入 / 未来池改动 / 脏档）**原样留在
   *   earnedKeys 作例外表**——折叠与还原都只认「恰等于推导值」的项，其余零触碰。
   * ⚠️ **净收益门**（保证「容量只降不升」）：折前按族记账 `Σ(前缀长 + 值位数 + 1) − Σ桶(值位数 + 7) −
   *   (族名长 + 9)`，**≤ 0 的族整族退让不折**——只剩一两条时紧凑容器自身开销会吃掉省下的字节，
   *   此时留在 earnedKeys 反而更短（冒烟 #258h 实证；五族条目常态数十~数百条 → 恒为正收益）。
   * 编码形态（**自描述**：桶键就是实付额 → 还原侧不查表、不依赖世界包是否装载、跨常量版本零漂移）：
   *   折叠前  "treasure.x01":2,"treasure.x02":2,"artmax.c1":3,"achv_jichu":2,"codex.ms.art.50":15
   *   折叠后  "ekF":{"treasure":{"2":["x01","x02"]},"artmax":{"3":["c1"]},
   *                  "achv":{"2":["jichu"]},"ms":{"15":["art.50"]}}
   * 还原点位 = normalize 内 metaNormalize **之前**（与级⑥ codices split 同点位，紧凑键就地摘除，
   *   metaNormalize 只认 earnedKeys 故不会带出临时键；内存态恒无 ekF，读端零侵入）。
   * 无损实证 = 冒烟 **#258**：#206 最坏态折叠落盘 → 真机读通道 `SQ.load` 同档复核 →
   *   earnedKeys **键集合 / 逐键值 / Σ** 三者与内存态深度全等，#197 恒等式与 karma 零变化。
   * 位次说明：本级与 ⑥⑦⑧ 同属**无损段**，按「语义损失递增」必须排在有展示代价的 ⑨⑩ **之前**；
   *   ⑨⑩ 编号已被两份正典与冒烟断言标题占用，故本批不重编号、以 **级⑧b**（无损段扩展位）记。 */
  var EKF_FAM = { treasure: 'treasure.', artmax: 'artmax.', title: 'title.', ms: 'codex.ms.', achv: 'achv_' };
  var EKF_SETTLE = [['treasure', 'TREASURE_EACH'], ['artmax', 'ART_MAX_EACH'], ['title', 'TITLE_EACH']];
  var EKF_EXPAND_CAP = 4000;                 /* 脏档兜底：单档还原条目总数上限（真实上界 ≈ 数百） */

  /* 世界包 data（折叠侧唯一取数口；取不到 = 不折叠，落盘保持旧形态） */
  function packDataOf(s) {
    var wid = s && s.profile && s.profile.worldId;
    var e = wid && SQ.Worlds && SQ.Worlds[wid];
    return (e && e.pack && e.pack.data) || null;
  }

  /* 折叠口径表：族 → 允许的实付值集合 / 成就 id → karma / 里程碑尾串 → karma */
  function foldSpecOf(D) {
    var L = D && D.LEGACY, C = D && D.CODEX;
    if (!L || !C) return null;
    var sp = { settle: {}, achv: {}, msPct: {}, msTitle: {}, has: false };
    var bj = L.BINGJIE_MULT, i, V, ok;
    for (i = 0; i < EKF_SETTLE.length; i++) {
      V = L[EKF_SETTLE[i][1]];
      if (typeof V !== 'number' || !isFinite(V) || V <= 0) continue;
      ok = {}; ok[V] = 1;
      if (typeof bj === 'number' && isFinite(bj)) ok[Math.floor(V * bj)] = 1;   /* 兵解折减档（可为 0 → 该值永不入档） */
      sp.settle[EKF_SETTLE[i][0]] = ok;
      sp.has = true;
    }
    (C.ACHV || []).forEach(function (a) {
      if (a && typeof a.id === 'string' && typeof a.karma === 'number' && a.karma > 0) sp.achv[a.id] = a.karma;
    });
    var MK = C.MS_KARMA || [], MP = C.MS_PCT || [], TM = C.TITLE_MS || [];
    for (i = 0; i < MK.length; i++) {
      if (typeof MK[i] !== 'number' || MK[i] <= 0) continue;
      if (typeof MP[i] === 'number') sp.msPct[Math.round(MP[i] * 100)] = MK[i];
      if (typeof TM[i] === 'number') sp.msTitle[TM[i]] = MK[i];
    }
    sp.has = sp.has || Object.keys(sp.achv).length > 0 || Object.keys(sp.msPct).length > 0;
    return sp.has ? sp : null;
  }
  function msKarmaOf(sp, tail) {
    var m = /^(.*)\.(\d+)$/.exec(tail);
    if (!m) return 0;
    var tbl = m[1] === 'title' ? sp.msTitle : sp.msPct;
    var v = tbl[Number(m[2])];
    return typeof v === 'number' ? v : 0;
  }
  /* 单条 earnedKeys → {f 族名, i 去前缀尾串, v 实付额}；不可折叠 → null（进例外表） */
  function earnFoldOf(sp, k, v) {
    if (typeof k !== 'string' || typeof v !== 'number' || !isFinite(v) || v <= 0 || v !== Math.floor(v)) return null;
    for (var fam in sp.settle) {
      var pre = EKF_FAM[fam];
      if (k.indexOf(pre) === 0) {
        if (k.length <= pre.length) return null;
        return sp.settle[fam][v] ? { f: fam, i: k.slice(pre.length), v: v } : null;
      }
    }
    if (k.indexOf(EKF_FAM.achv) === 0) {
      if (k.length <= EKF_FAM.achv.length) return null;
      return sp.achv[k] === v ? { f: 'achv', i: k.slice(EKF_FAM.achv.length), v: v } : null;
    }
    if (k.indexOf(EKF_FAM.ms) === 0) {
      if (k.length <= EKF_FAM.ms.length) return null;
      var tail = k.slice(EKF_FAM.ms.length);
      return msKarmaOf(sp, tail) === v ? { f: 'ms', i: tail, v: v } : null;
    }
    return null;
  }

  function withFoldedEarned(s) {
    var m = s && s.meta;
    var ek = m && m.earnedKeys;
    if (!ek || typeof ek !== 'object' || Array.isArray(ek)) return s;
    var sp = foldSpecOf(packDataOf(s));
    if (!sp) return s;
    /* 记账后才决定折不折（**净收益 ≤ 0 的族整族不折**，条目留回 earnedKeys）——
     * 单条净省 = 前缀长 + 实付值位数 + 1 个分隔符（与 id 长度无关：`"pre+id":v,` → `"id",`）；
     * 每桶固定开销 = 值位数 + 7（`"v":[],`）、每族固定开销 = 族名长 + 9（`"fam":{},`）。
     * 五族条目常态数十~数百条 → 恒为正收益（#206 最坏态实测省 1.8KB）；只有一两条的稀有族
     * 紧凑容器自身开销会吃掉省下的字节，此时本级对该族自动退让，保证「容量只降不升」。 */
    var bins = {}, rest = {}, fam, v, id, i;
    for (var k in ek) {
      var f = earnFoldOf(sp, k, ek[k]);
      if (!f) { rest[k] = ek[k]; continue; }
      var b = bins[f.f] || (bins[f.f] = {});
      (b[f.v] || (b[f.v] = [])).push(f.i);
    }
    var grp = {}, folded = 0;
    for (fam in bins) {
      var bb = bins[fam], pre = EKF_FAM[fam], net = -(fam.length + 9), n = 0, vs;
      for (v in bb) {
        vs = String(v).length;
        net += bb[v].length * (pre.length + vs + 1) - (vs + 7);
        n += bb[v].length;
      }
      if (net <= 0) {                                   /* 退让：该族逐条原样写回例外表 */
        for (v in bb) {
          var back = bb[v];
          for (i = 0; i < back.length; i++) rest[pre + back[i]] = Number(v);
        }
        continue;
      }
      grp[fam] = bb;
      folded += n;
    }
    if (!folded) return s;
    var cp = {}, k2;
    for (k2 in s) cp[k2] = s[k2];
    var cm = {};
    for (k2 in m) cm[k2] = m[k2];
    cm.earnedKeys = rest;
    cm.ekF = grp;
    cp.meta = cm;
    return cp;
  }

  /* 级⑧b 还原（normalize 侧）：ekF → earnedKeys 逐条精确重建 + 紧凑键摘除。
   * **不查表、不依赖世界包**（桶键即实付额），故与折叠侧的常量口径天然同步、跨版本不漂移。
   * 脏档逐项收敛（紧凑键为字符串 / 数组 / 含非字符串项 / 未知族名 / 桶键非正整数 / 重复 id /
   * 与例外表撞键 / 超上限）一律跳过该项、不抛异常；键序为族白名单序（无损折叠只重建、不重排既有键）。 */
  function expandFoldedEarned(m) {
    var xf = m && m.ekF;
    if (!xf) return;
    delete m.ekF;                                              /* 临时紧凑键恒摘除（旧档无此键 = 零操作） */
    if (typeof xf !== 'object' || Array.isArray(xf)) return;
    if (!m.earnedKeys || typeof m.earnedKeys !== 'object' || Array.isArray(m.earnedKeys)) m.earnedKeys = {};
    var ek = m.earnedKeys, n = 0;
    for (var fam in EKF_FAM) {
      var g = xf[fam];
      if (!g || typeof g !== 'object' || Array.isArray(g)) continue;
      var pre = EKF_FAM[fam];
      for (var bv in g) {
        if (!/^[1-9]\d*$/.test(bv)) continue;                   /* 桶键必须是正整数字符串 */
        var list = g[bv];
        if (!Array.isArray(list)) continue;
        for (var i = 0; i < list.length; i++) {
          var id = list[i];
          if (typeof id !== 'string' || !id) continue;
          if (n >= EKF_EXPAND_CAP) return;
          var key = pre + id;
          if (ek[key] != null) continue;                        /* 例外表 / 重复桶优先：账本已有该键不覆盖 */
          ek[key] = Number(bv);
          n++;
        }
      }
    }
  }

  /* 级⑨序列化副本：prodMarks.rankRows 榜面冻结快照裁除（纯展示流），内存态零污染。

   * 零功能损失依据 = prodigy.js rankRows() 既有契约「无快照返回 null → 视图回落实时榜」；
   * 其余 prodMarks 字段（slotMax 槽位不复用 / myRank / rankAt / sudiWin / evf 事件幂等键）全保留。 */
  function withoutRankRows(s) {
    var ws = s && s.worlds;
    if (!ws) return s;
    var cp = {}, k;
    for (k in s) cp[k] = s[k];
    var worlds = {};
    for (var wk in ws) {
      var w = ws[wk];
      var pm = w && w.prodMarks;
      if (!pm || !Array.isArray(pm.rankRows) || !pm.rankRows.length) { worlds[wk] = w; continue; }
      var wc = {}, f;
      for (f in w) wc[f] = w[f];
      var pmc = {}, pk;
      for (pk in pm) pmc[pk] = pm[pk];
      delete pmc.rankRows;
      wc.prodMarks = pmc;
      worlds[wk] = wc;
    }
    cp.worlds = worlds;
    return cp;
  }


  /* ── 落盘无损压缩编解码（存档瘦身批 2026-10-08 · 正典 = 轮回卷 §8.4 级⑴无损前置）──────
   * 动机：主档与日志档都是「单文件随游玩单调变大」，此前唯一的对策是**有损**阶梯（裁传记 / 裁 feed /
   *   裁榜面快照），每批 +2KB 的内容增量都在侵蚀同一份余量。deflate 是**纯无损**：同一份对象、
   *   读端精确还原、零语义代价，实测本档 43.5KB→15.1KB、日志 168KB→65KB（base64 后仍 ≈2.6×）。
   * 载体：`d1:` + base64(deflate(JSON))。**必须 base64**——宿主 write_storage 按 JSON 落字符串，
   *   裸二进制串会在 UTF-8 序列化时不可逆损坏。
   * API 选择：用 Web 标准 CompressionStream / DecompressionStream（Edge/Chromium 80+ 原生、
   *   Node 18+ 同源），**零 CDN、零自带压缩库**（硬纪律②不破）；`.tests/sandbox.cjs` 注入同一组
   *   标准全局，使测试跑的与真机是同一条代码路径，不是第二条。
   * 兼容：读端三态全收 —— 对象（旧桥直存）/ 纯 JSON 串（旧 localStorage）/ `d1:` 串。
   *   ⇒ **旧档零迁移**，测试存档件与玩家现有档照读。
   * 降级：宿主缺任一标准 API（无 CompressionStream / btoa / Response）⇒ 退回明文落盘，
   *   读端照旧能认 `d1:`（写了才读得到），容量红线由阶梯兜住。 */
  var CODEC_PREFIX = 'd1:';
  function codecReady() {
    return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function' &&
      typeof ReadableStream === 'function' && typeof Response === 'function' &&
      typeof TextEncoder === 'function' && typeof TextDecoder === 'function' &&
      typeof btoa === 'function' && typeof atob === 'function';
  }
  function u8ToB64(u8) {                    /* 分块避免 String.fromCharCode(...) 实参上限 */
    var s = '', CH = 0x8000;
    for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + CH, u8.length)));
    return btoa(s);
  }
  function b64ToU8(b64) {
    var s = atob(b64), u8 = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
    return u8;
  }
  function streamThrough(u8, decomp) {      /* 标准流：Uint8Array ⇄ deflate 字节 */
    var rs = new ReadableStream({ start: function (c) { c.enqueue(u8); c.close(); } });
    var stream = rs.pipeThrough(new (decomp ? DecompressionStream : CompressionStream)('deflate'));
    return new Response(stream).arrayBuffer();
  }
  async function encodePayload(str) {       /* → 落盘用的字符串（或降级时原样返回） */
    if (!codecReady()) return str;
    var buf = await streamThrough(new TextEncoder().encode(str), false);
    return CODEC_PREFIX + u8ToB64(new Uint8Array(buf));
  }
  async function decodePayload(v) {         /* → 原始 JSON 字符串；三态全收 */
    if (v && typeof v === 'object') return JSON.stringify(v);        /* 旧桥直存对象 */
    if (typeof v !== 'string') return null;
    if (v.indexOf(CODEC_PREFIX) !== 0) return v;                     /* 明文（旧档 / 降级态） */
    if (!codecReady()) return null;                                  /* 写了却读不动 = 显式失败，不静默当空档 */
    var buf = await streamThrough(b64ToU8(v.slice(CODEC_PREFIX.length)), true);
    return new TextDecoder().decode(buf);
  }
  async function decodeStoredObject(v) {    /* → 解析后的落盘对象（不解 normalize） */
    var s = await decodePayload(v);
    if (s === null || s === undefined) return null;
    try { return JSON.parse(s); } catch (e) { return null; }
  }
  /* 落盘字节数：编码后字符串的 UTF-8 字节（红线/触发线的新口径 = **编码后**） */
  function storedBytes(enc) { return strBytes(typeof enc === 'string' ? enc : JSON.stringify(enc)); }

  /* ── 存档度量（2026-10-09 存档水位批立 · **同批按用户口径撤下玩家界面呈现**）──────────
   * 用户裁定原话：「存档水位这些文字描述和用户没有直接关系，只是系统设计问题，不需要在设置中表述出来」
   *   ⇒ 设置页那四行与十个 `settings.save.level.*` 词表键当日全部撤除，view/index.html 回到撤除前状态；
   *   本对象**只留作引擎侧度量口**：冒烟 #283 与后续容量类判据要一个「报出来的字节数 == 盘上真值」的
   *   可断言出口，没有它这类判据只能各自去 `JSON.stringify` 估一遍 = 五处副本五处漂移。
   *   ⚠️ 想再把它呈现给玩家，先过产品裁定，不要顺手把度量挂回设置页。
   * 纪律：**只在内存、不进存档**。这些数就是「上一次落盘的度量」，写进档里等于自造一个增长项，
   *   与「主档只放机制态」的口径直接冲突 ⇒ normalize 不认它、savePayload 也不经它，
   *   重启后由**首次读档**用 `readMainBytes/readSideBytes` 重新填（读的是盘上真实体量）。
   * 口径：mainBytes = 编码**后**字节（与 SQ.SAVE_RED/SQ.SAVE_TRIGGER 同一条度量线，见 §3.5）；
   *   stages = 本轮实际触发的阶梯级数组，**空数组 = 解耦生效、有损保险未动用**；
   *   codec = 落盘分支标签（bridge = d1 压缩 / preview = 明文 / degraded = 原样对象）。 */
  var saveStats = { mainBytes: 0, sideBytes: 0, stages: [], codec: '', at: 0, readMainBytes: 0, readSideBytes: 0 };
  var lastSideBytes = 0;   /* 侧档最近一次落盘字节：跳过写（内容未变）时沿用它，水位不能因跳写而归零 */
  function codecLabel() { return !hasBridge() ? 'preview' : (codecReady() ? 'bridge' : 'degraded'); }

  /* 测试读端：读主档落盘原样对象（解码 + parse，不 normalize、不回填展示流两族 log / feed）。
   * 存在的理由：界面走查此前一律 `JSON.parse(localStorage.getItem(KEY))`，编码后那一行拿到的是 `d1:` 串；
   * 与其让每个测试脚本各自解码（五处副本 = 五处漂移），这里给一个与写端同源的出口。 */
  async function readStored() {
    var raw = hasBridge() ? await window.xhub.storage.get(KEY) : localStorage.getItem(KEY);
    return decodeStoredObject(raw);
  }

  /* 落盘压缩总口（存档瘦身批改异步）：**先算真落盘字节**（有桥 = 编码后、无桥预览 = 明文 JSON），
   * 压得下就不动有损级；仍超触发线才按「语义损失递增」跑阶梯，每级后复测、≤触发线即停。
   * 返回 {out, str, enc, stored, stages}——out = 落盘对象（降级态用）、str = 明文序列化（预览分支落盘）、
   * enc = 编码后字符串（有桥分支落盘）、stages = 实际触发的级号数组（判据读它，不读日志文案）。
   * 第三参 triggerOf 仅供断言注入更小的触发线来证明阶梯仍是活的保险，生产调用恒缺省。
   * 就地级 ⓪~⑤ 改 s、序列化副本级 ⑥~⑩ 链式叠加。 */
  async function compressForSave(s, now, triggerOf) {
    var trig = triggerOf || SAVE_TRIGGER;
    var useCodec = hasBridge() && codecReady();
    var out = s, str = JSON.stringify(out);
    var enc = useCodec ? await encodePayload(str) : str;
    var stages = [];
    if (storedBytes(enc) > trig) {
      for (var stage = 0; stage <= 5; stage++) {
        out = compressStep(out, stage, now);            /* 纯函数化（2026-10-09 存档治理批）：返回新态、内存态零污染 */
        stages.push(stage);
        str = JSON.stringify(out);
        enc = useCodec ? await encodePayload(str) : str;
        if (storedBytes(enc) <= trig) break;
      }
      var copies = [withJoinedCodices, withTriangleRels, withFoldedTitle, withFoldedEarned, withoutRankRows];
      for (var ci = 0; ci < copies.length && storedBytes(enc) > trig; ci++) {
        out = copies[ci](out);
        stages.push(6 + ci);
        str = JSON.stringify(out);
        enc = useCodec ? await encodePayload(str) : str;
      }
    }
    return { out: out, str: str, enc: enc, stored: storedBytes(enc), stages: stages };
  }

  /* 落盘载荷（两分支同源同阶梯，只差编码）：有桥 → 压缩串（生产路径，玩家档因此不再单调变大）；
   * 无桥预览 → 明文 JSON（devtools 可直读，测试存档件与页内注入照旧可用）；
   * 有桥但宿主缺 CompressionStream → 落对象，等价改造前的行为（降级态，非新故障）。 */
  async function savePayload(s) {
    var now = Date.now();
    /* 落盘前置：只剥展示流 log + eventHistory.feed（冷却键**不恒常剪**，理由见 COOL_MAX_HOURS 注）*/
    var base = stripSideFlows(s);
    var c = await compressForSave(base, now);
    c.bridgeValue = (hasBridge() && codecReady()) ? c.enc : c.out;
    return c;
  }

  async function save(s) {
    try {
      /* 主档剥离日志后再压缩（阶梯不裁日志，日志自带预算） */
      var c = await savePayload(s);
      /* 写序 = 先侧档、后主档（审计 #2）：主档一落盘就**不再含 log/feed**，若此刻崩在两次写之间，
       * 侧档还没写过（旧档首次迁移时尤其如此）⇒ 整世日志永久丢。反序的最坏结果只是多写一份冗余。
       * ⚠️ 复核返修：侧档写**必须关在本地的 try 里**——它原先与主档共用外层 catch，于是「侧档键被宿主
       * 拒写」这一族故障会让每次落盘都在主档写之前抛出 ⇒ 机制态永不再落盘、刷新即丢全部进度（比原缺陷
       * 更重）。吞掉侧档异常、把它折进下面那条跳写留痕，主档照写。 */
      var side;
      try { side = await writeLogsIfChanged(s); }
      catch (eSide) { side = lastSideBytes; sideWriteSkipped = true; }   /* 日志独立落盘（内容未变则跳过）；返回侧档字节 */
      if (hasBridge()) {
        await window.xhub.storage.set(KEY, c.bridgeValue);
      } else {
        localStorage.setItem(KEY, c.str);
      }
      /* 水位读数：落盘成功后一并记（失败走 catch ⇒ 不污染上一次读数，视图据此知道「最近一次成功写」是哪回） */
      saveStats.mainBytes = c.stored;
      saveStats.sideBytes = side || 0;
      saveStats.stages = c.stages.slice();
      saveStats.codec = codecLabel();
      saveStats.at = Date.now();
      saveStats.readMainBytes = c.stored;                    /* 刚写完 = 盘上当前体量，读档口径与落盘口径对齐 */
      saveStats.readSideBytes = saveStats.sideBytes;
      ioError = null;
      pendingSave = null;                                    /* 主档 + 侧档都落定 ⇒ 内存与盘对齐 */
      /* 审计 #3：跳写要在 ioError 复位**之后**落，否则这一行等于没写。
       * ⚠️ 复核返修：msg 走**内部码**（与 'codec-unavailable' 同形），由视图按码取 `ui.error.sideflow` 那句人话——
       * 原先直接把它塞进 `ui.error.save` 的 `{msg}`，屏上打出「存档写入失败：side-unreadable（本次进度恐未记下）」
       * = 裸英文 + 主档明明写成功却说「进度恐未记下」，两句都是谎。 */
      if (sideWriteSkipped) {
        ioError = { op: 'write', msg: 'sideflow' };
        sideWriteSkipped = false;
      }
    } catch (e) {
      ioError = { op: 'write', msg: (e && e.message) || String(e) };
      pendingSave = s;                                       /* 审计 #1：这一态没落到盘上，下一次写通道从它续起 */
      /* 🔧 二次复核：这一笔**整体**失败 ⇒ 「侧档跳写」那条待播留痕必须一起清掉。不清的后果 = 侧档恢复可写后
       * 的第一次成功落盘还会补打一条「历史日志没能保存」，而那一刻展示流恰恰写进去了。真跳写不需要跨笔存活：
       * 下一笔会重新算签名并重新置位。判据 = 冒烟 #294(e)；反向 R5（删这一行 ⇒ #294 如实红）。 */
      sideWriteSkipped = false;
    }
  }

  /* 最近一次存档 I/O 失败（null = 健康）；视图层每帧/tick 读一次即可 */
  function storageError() { return ioError; }

  /* ── 存档写互斥（2026-10-05 并发写修复）─────────────────────────
   * 起因：tick 的 setInterval 不等待上一次 claim 收尾，慢 tick（离线结算/大量掷判）与
   *   用户动作 mutate 会重叠；两个 save 并发写同一 .storage.json，而宿主 write_storage
   *   是「读-改-写」且 std::fs::write 的 truncate 与写入非原子 → 文件被截断交错、尾部残留
   *   上一次的旧内容；宿主 read_storage 解析失败即**视为空存储**（整档丢失）。
   * 纪律：一切写通道（claim / mutate / 重置）经此串行队列，同一时刻只有一个写在飞。
   * claim 另有「重叠复用」：tick 每秒一触，已有 claim 在跑时直接复用其结果，避免慢 tick 堆积。 */
  var opChain = Promise.resolve();
  var claimInFlight = null;
  function noop() {}
  function serialize(fn) {
    var r = opChain.then(fn, fn);
    opChain = r.then(noop, noop);
    return r;
  }

  function replaceRef(stateRef, s) {
    if (!stateRef) return;
    for (var k in stateRef) delete stateRef[k];
    Object.assign(stateRef, s);
  }

  /* 写通道起手取态（审计 #1）：有未落盘的态就续它，否则按老路从盘上读。
   * 只在这一处判（两处写通道共用一个取数口），免得「续 pending」这条规则被抄成两份。 */
  async function loadForWrite() { return pendingSave || await load(); }

  /* 时间差结算：读档 → 当前世界 claim（含 G2~G8 编排）→ 落盘 → 回填引用 */
  async function claimInner(stateRef) {
    var s = await loadForWrite();
    var id = s.profile.worldId;
    var ws = s.worlds[id];
    if (ws) {
      var now = Date.now();
      var dt = Math.max(0, now - (ws.lastSave || now));
      var entry = SQ.Worlds[id];
      if (entry && entry.pack && entry.pack.claim) entry.pack.claim(ws, dt, now, s.profile, s.settings);
      ws.lastSave = now;
      /* ── 寿元耗尽 / 道伤崩碎 ⇒ 本世了结（寿元批 2026-10-15 · 数值详设 §6.1A）──
       * 判势在世界包（worldSystems.lifeInfo 只回 cause，通用层不读世界字段含义），了结走**既有转世
       * 事务** SQ.Legacy.rebirth ⇒ 与兵解同一条通道：折分 ×BINGJIE_MULT、传记落死因、stats.deaths 计数。
       * 死因快照写进**转世后的新世 ws**（lastDeath，与 lastOffline 同款「界面按 at 键控读一次」），
       * 玩家回来先看见「身死道消」呈报，确定后进创角——不是无声无息被扔回创角屏。
       * 位置刻意在 Legacy.sync 之前：同一次 claim 的内嵌恢复/成就扫描须看到转世后的干净态。 */
      var lifeSys = entry.pack.worldSystems;
      if (lifeSys && lifeSys.lifeInfo && SQ.Legacy && SQ.Legacy.rebirth && s.profile.name) {
        var lifeNow = lifeSys.lifeInfo(ws);
        if (lifeNow && lifeNow.cause) {
          var pvLife = SQ.Legacy.rebirth(s, lifeNow.cause, now);
          s.worlds[id].lastDeath = {
            at: now, cause: lifeNow.cause, realm: ws.realm || 0,
            age: lifeNow.age, dao: lifeNow.daoLv,
            total: (pvLife || {}).total || 0
          };
        }
      }
      /* meta 层同步（轮回卷 §5.4 / 图鉴卷 §一）：脏档转世恢复 + 图鉴成就扫描 + qiRate 镜像回写——
       * 全部是状态派生的幂等后处理，无 per-tick 掷判（sim-pacing 稳态带零侵入） */
      if (SQ.Legacy && SQ.Legacy.sync) SQ.Legacy.sync(s, now);
      await save(s);
    }
    replaceRef(stateRef, s);
    return s;
  }

  /* claim 外层：经写队列串行；重叠调用复用进行中的一次（tick 不堆积） */
  function claim(stateRef) {
    if (claimInFlight) return claimInFlight;
    var p = serialize(function () { return claimInner(stateRef); });
    claimInFlight = p;
    var clear = function () { if (claimInFlight === p) claimInFlight = null; };
    p.then(clear, clear);
    return p;
  }

  /* 玩家操作通道：fn 抛异常 → 不落盘（验收 4.1 #6 事务性）；
   * 落盘前统一重算派生值（karma/attrs 缓存纪律，工程规范 §3.6） */
  async function mutateInner(stateRef, fn) {
    var s = await loadForWrite();
    fn(s);
    /* meta 层同步先行（图鉴成就/里程碑即时入账 + 镜像回写），随后派生值重算吃到最新 qiRate 来源 */
    if (SQ.Legacy && SQ.Legacy.sync) SQ.Legacy.sync(s, Date.now());
    var id = s.profile.worldId;
    var entry = SQ.Worlds[id];
    if (s.worlds[id] && entry && entry.pack && entry.pack.recalcDerived) {
      entry.pack.recalcDerived(s.worlds[id], s.profile);
    }
    s = normalize(s);
    await save(s);
    replaceRef(stateRef, s);
    return s;
  }

  /* mutate 外层：经同一写队列串行（与 claim 互斥，绝不并发落盘） */
  function mutate(stateRef, fn) {
    return serialize(function () { return mutateInner(stateRef, fn); });
  }

  /* 重置为全新档（同样走写队列，避免与进行中的 claim 并发落盘） */
  function resetSave(stateRef) {
    return serialize(async function () {
      var s = defaultState();
      resetSideSig();                     /* 清档后侧档签名归零，否则「内容相同即跳过写」会把档留在缺失态 */
      await save(s);
      replaceRef(stateRef, s);
      return s;
    });
  }

  /* 数字格式（UI 文案规范 §六）：<1万 千分位；≥1万 「X.X万」；≥1亿 「X.X亿」 */
  function fmt(n) {
    n = Math.floor(n || 0);
    if (n >= 1e8) return (n / 1e8).toFixed(1) + SQ.t('ui.number.yi');
    if (n >= 1e4) return (n / 1e4).toFixed(1) + SQ.t('ui.number.wan');
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /* ── 游戏历法（第廿八批 2026-10-13 从视图抽出）──────────────────────────
   * 口径一字未动：1 游戏日 = 现实 1 秒，自入世（profile.createdAt）起算；12 月 × 30 日 = 360
   * 日/年；起始年 = ws.calYear（创角随机 1~9000）；显示名 = 世界名去尾字（沧霄界 → 沧霄）。
   * 抽出来的理由：这段算式此前**只在 view/index.html 有一份**，而引擎侧也要写日期——人生传记的
   * 时间轴取自天道编年史模板族（「是日…」），屏上没有第二列日期可对齐 ⇒ 传记里只剩一串
   * 「是日」而不知哪天（用户报「前世书写着是日但没写具体游戏时间」）。引擎抄一份就是第三套
   * 历法，故正典落 core，视图与传记同走这一个口。
   * 兜底与视图原行为一致：createdAt 缺失（旧档）或 ts 缺失 ⇒ gameDateOf 返回 null、
   * gameDateStr 返回空串，调用方自己决定「不写日期」，绝不写「0年0月0日」那种假日期。 */
  function gameDateOf(profile, ws, ts) {
    var createdAt = (profile || {}).createdAt;
    if (!createdAt || !ws || !ts) return null;
    var days = Math.max(0, Math.floor((ts - createdAt) / 1000));
    var y = (ws.calYear || 1) + Math.floor(days / 360);
    var rem = days % 360;
    return { y: y, m: Math.floor(rem / 30) + 1, d: (rem % 30) + 1 };
  }
  function gameDateStr(profile, ws, ts, wid) {
    var g = gameDateOf(profile, ws, ts);
    if (!g) return '';
    var nm = String((profile || {}).worldName || '');
    if (nm.length >= 2) nm = nm.slice(0, -1);   /* 沧霄界 → 沧霄 */
    return SQ.t('calendar.date', { name: nm, y: g.y, m: g.m, d: g.d }, wid);
  }

  /* 显示名：未入世/空名走词表兜底（P3 词表纪律，core 内禁止裸中文） */
  function displayName(s) {
    return (s && s.profile && s.profile.name) || SQ.t('profile.default_name');
  }

  /* ── G16 日志分类制（唯一写入点）────────────────────────────────
   * 目的：日志 Tab 从「全局 FIFO 50 条」升级为「按分类保留」——
   *   高频分类（战斗/挂机）不再把低频分类（突破/渡劫/奇遇）整段挤出。
   * 存储（**日志存档批 2026-10-05**）：日志走**独立存档键 LOG_KEY**，不再进主档——
   *   ① 主档 45KB 压缩阶梯（A7）不再触碰日志，离线/重开不再丢早期日志；
   *   ② 日志档按 **LOG_BYTE_BUDGET(256KB) 字节预算**裁剪（从最旧删起），裁剪时跳过
   *      「每分类最新 LOG_CAT_CAP(200) 条」的受保护项 → 界面「每分类最新 200 条」承诺不被击穿；
   *   ③ 内存/落盘条数硬顶 LOG_HARD_CAP(4000) 仅作极端脏档兜底，主约束是字节预算。
   * 展示：界面每分类只渲染最新 LOG_CAT_CAP(200) 条（视图层 slice；存储不设分类上限）。
   * 唯一事实源：所有系统/世界包只调 SQ.Log.push，禁止各自 push ws.log（旧 50 条散点已收口）。
   * 时间戳口径（C3）：ts 一律由 push 单点打戳（缺省 Date.now()）；生产代码不显式传 ts，
   *   仅测试为确定性排序时传固定值（如 smoke #… 容量断言）。 */
  var LOG_CAT_CAP = 200;              /* 每分类展示上限，兼字节裁剪时的每分类保留底线 */
  var LOG_HARD_CAP = 4000;            /* 条数硬顶（防极端脏档；字节预算才是主约束） */
  var LOG_BYTE_BUDGET = 256 * 1024;   /* 日志档字节预算（超出从最旧裁起） */
  /* 奇遇叙事流侧档（存档治理批 2026-10-09）：feed 由主档迁入侧档，与日志同键同预算范式
   *   FEED_STORE_CAP = 条数兜底（日常上限由 D.EVENT_FEED_CAP=50 在 events.js:943 写口执行，
   *     这里只防脏档穿透）；FEED_BYTE_BUDGET = 字节预算（满档 50 条实测 ≈11~14KB ⇒ 32KB
   *     留出奇遇池扩容余量，超出从最旧即尾部挤起，与日志「最旧先丢」同向） */
  var FEED_STORE_CAP = 60;
  var FEED_BYTE_BUDGET = 32 * 1024;
  var lastLogSig = null;               /* 上次落盘侧档载荷签名（未变则跳过侧档键写入，省一次整档重写） */

  function logPush(ws, cat, text, ts) {
    if (!ws.log) ws.log = [];
    ws.log.push({ ts: ts || Date.now(), cat: cat, text: text });
    while (ws.log.length > LOG_HARD_CAP) ws.log.shift();
    return ws.log;
  }

  /* 单条日志字节估算（保守上界：JSON 骨架 {"ts":…,"cat":"…","text":"…"} ≈44B + cat + text）
   * ——估算 ≥ 实际，保证按估算裁到 ≤ 预算时，真实序列化也必然 ≤ 预算 */
  function logEntryBytes(e) {
    var n = 44;
    if (e && typeof e.text === 'string') n += strBytes(e.text);
    if (e && typeof e.cat === 'string') n += strBytes(e.cat);
    return n;
  }

  /* 字节预算裁剪（**纯函数**：返回新数组，绝不改传入 ⇒ 落盘降级不碰内存态）：
   * 从最旧删起，跳过每分类最新 LOG_CAT_CAP 条的受保护项。
   * 展示流与落档口径批 2026-10-09：本函数原为「就地裁」（`list.length = 0` 后回填），
   *   于是 `writeLogsIfChanged` 一次落盘就会把**玩家内存里的日志**按落盘预算削短 ——
   *   与同批已修的「阶梯就地级摧毁内存态」同因同型（那一族的正典口径 = 「落盘层裁剪、
   *   内存态一字不动」），而隔壁 `trimFeedBudget` 走的是副本 ⇒ 同一侧档里两族口径不一致。
   *   现统一到「两族一律返回副本」，调用侧**不需要再自己记得 slice**（记不得就是下一个同型缺陷）。
   * 内存侧上限另有其人：`logPush` 的条数硬顶 LOG_HARD_CAP(4000) 与读档 `slice(-LOG_HARD_CAP)`。 */
  function trimLogBudget(list) {
    if (!Array.isArray(list)) return [];
    if (!list.length) return [];
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += logEntryBytes(list[i]) + 1;
    if (total <= LOG_BYTE_BUDGET) return list.slice();   /* 未超预算也返回副本：调用侧拿到的永远是新数组 */
    var seen = {}, prot = {};
    for (i = list.length - 1; i >= 0; i--) {
      var c = list[i] && list[i].cat;
      seen[c] = (seen[c] || 0) + 1;
      if (seen[c] <= LOG_CAT_CAP) prot[i] = 1;
    }
    var out = [], removed = 0;
    for (i = 0; i < list.length; i++) {
      if (total - removed > LOG_BYTE_BUDGET && !prot[i]) removed += logEntryBytes(list[i]) + 1;
      else out.push(list[i]);
    }
    return out;
  }

  /* 日志签名（世界 + 条数 + 首末 ts）：内容未变则免写日志键 */
  function logSig(logs) {
    var parts = [];
    for (var wk in logs) {
      var L = logs[wk];
      if (!Array.isArray(L) || !L.length) continue;
      parts.push(wk + ':' + L.length + ':' + (L[0] && L[0].ts) + ':' + (L[L.length - 1] && L[L.length - 1].ts));
    }
    return parts.join('|');
  }

  /* 日志档读（缺/损坏 → null，不阻塞读档）：与主档同一编解码，三态全收 */
  /* 侧档「有值但读不动」标志：宿主截断 / 脏字节 / 缺标准 API 读不了 d1: 都会走到这里。
   * 置真期间 **禁止覆盖侧档** —— 主档早已不含展示流，内存态因此是空的，
   * 若照写就是把玩家的日志与奇遇史整族抹掉（复核列为 blocker，本批修）。
   * 侧档本就不存在（新档 / 迁移前）不算读不动，保持可写。 */
  var sideUnreadable = false;
  async function readLogStore() {
    var raw;
    try {
      raw = hasBridge() ? await window.xhub.storage.get(LOG_KEY) : localStorage.getItem(LOG_KEY);
    } catch (e) { raw = undefined; }
    if (raw == null || raw === '') { sideUnreadable = false; saveStats.readSideBytes = 0; lastSideBytes = 0; return null; }
    saveStats.readSideBytes = storedBytes(raw);   /* 水位读数：侧档盘上真实体量（编码后字节，与主档同一条度量线） */
    saveStats.sideBytes = saveStats.readSideBytes;
    lastSideBytes = saveStats.sideBytes;
    try {
      var obj = await decodeStoredObject(raw);
      if (obj && obj.logs && typeof obj.logs === 'object') { sideUnreadable = false; return obj; }
      sideUnreadable = true;                      /* 解得出字节但没有 logs 族 = 形态不对，同样不覆盖 */
      return null;
    } catch (e) { sideUnreadable = true; return null; }
  }
  function sideUnreadableFlag() { return sideUnreadable; }

  /* 有桥落盘值：能压则压（生产路径），宿主缺标准 API 时原样落对象（= 改造前行为） */
  async function encodeForBridge(obj) {
    return codecReady() ? await encodePayload(JSON.stringify(obj)) : obj;
  }

  /* 奇遇流单条字节估算：feed 条目含 eff 效果账、长度不定 ⇒ 直接按序列化字节算（≤50 条，成本可忽略）
   * 与日志的保守上界不同：这里取的是**实际**序列化长度 +1（分隔符），预算判定按侧档真实体量的上界走 */
  function feedEntryBytes(e) {
    try { return strBytes(JSON.stringify(e)) + 1; } catch (x) { return 1; }
  }
  /* 字节预算裁剪（**纯函数**，与上行 trimLogBudget 同口径）：feed 新在前，超预算从尾部（最旧）挤起。
   * 展示流与落档口径批 2026-10-09：条数兜底 FEED_STORE_CAP 一并收进函数内 ——
   *   原先两处调用各自写 `list.slice(0, FEED_STORE_CAP)` 再交给「就地 pop」的函数，
   *   少写一次 slice 就污染内存态；现函数自己复制，调用侧无从漏。 */
  function trimFeedBudget(list) {
    if (!Array.isArray(list)) return [];
    var out = list.slice(0, FEED_STORE_CAP), i;
    var total = 0;
    for (i = 0; i < out.length; i++) total += feedEntryBytes(out[i]);
    while (total > FEED_BYTE_BUDGET && out.length > 1) {
      total -= feedEntryBytes(out[out.length - 1]);
      out.pop();
    }
    return out;
  }

  /* 侧档签名（日志 + 奇遇流两族都计入：任一族变化即需重写侧档） */
  function feedSig(feeds) {
    var parts = [];
    for (var wk in feeds) {
      var F = feeds[wk];
      if (!Array.isArray(F) || !F.length) continue;
      parts.push(wk + ':' + F.length + ':' + (F[0] && F[0].ts) + ':' + (F[F.length - 1] && F[F.length - 1].ts));
    }
    return parts.join('|');
  }

  /* 侧档写（仅当内容变化）：按**未编码**预算就地裁剪后落盘（预算管的是保留多少条，不是文件字节）
   * 存档治理批 2026-10-09：同一侧档现承载两族展示流 = logs（日志）+ feed（奇遇叙事流）。
   * 键名与既有玩家档保持不动（'sanqian-logs-v1' 改名会孤立现有日志数据）⇒ 语义已扩为「侧档」，
   * 读端对缺 feed 字段的旧侧档按「无该族」处理、回落主档遗留，零迁移。 */
  async function writeLogsIfChanged(s) {
    var payload = { v: 1, logs: {}, feed: {} };
    var worlds = (s && s.worlds) || {};
    /* ⚠️ 复核返修（2026-10-11 第十四批）：这里原有过一条「O(1) 原态签名（每世界条数 + 首末 ts）前置跳写」，
     * 实测省 0.44ms/tick。复核指出该签名**可撞**——离线结算会在同一毫秒连出多条，条数与首末 ts 可以全同而
     * 中间条目不同 ⇒ 前置命中就跳写 ⇒ 那批展示流永不落侧档（与本批要修的「静默丢」同型）。0.44ms 买不回
     * 这个风险，整条删除；写入判据恢复只有一条 = 下面那份**逐条内容**签名。 */
    for (var wk in worlds) {
      var w = worlds[wk];
      if (!w) continue;
      if (Array.isArray(w.log) && w.log.length) {
        payload.logs[wk] = trimLogBudget(w.log);        /* 纯函数：落盘裁副本，玩家内存里的日志一条不少 */
      }
      var feed = w.eventHistory && w.eventHistory.feed;
      if (Array.isArray(feed) && feed.length) {
        payload.feed[wk] = trimFeedBudget(feed);        /* 同上（条数兜底 FEED_STORE_CAP 已在函数内） */
      }
    }
    var sig = logSig(payload.logs) + '#' + feedSig(payload.feed);
    /* 返回值 = 侧档当前落盘字节（水位读数用）：跳写时沿用上一次的值，绝不返回 0 冒充「侧档空了」 */
    if (sig === lastLogSig) return lastSideBytes;
    if (sideUnreadable) {
      /* 审计 #3：读不动就不覆盖侧档（这判断本身对），但此刻主档已经剥掉了 log/feed ⇒ 这一批展示流
       * 每次落盘都被剥掉又永不写侧档，重载全丢且原本零症状。跳过 = 有损失，必须留痕给 save 落成提示。 */
      sideWriteSkipped = true;
      return lastSideBytes;
    }
    var val = hasBridge() ? await encodeForBridge(payload) : JSON.stringify(payload);
    lastSideBytes = storedBytes(val);
    if (hasBridge()) await window.xhub.storage.set(LOG_KEY, val);
    else localStorage.setItem(LOG_KEY, val);
    lastLogSig = sig;
    return lastSideBytes;
  }

  SQ.Log = { push: logPush, CAT_CAP: LOG_CAT_CAP, HARD_CAP: LOG_HARD_CAP,
    /* ⚠️ trimBudget 自 2026-10-09 起为**纯函数**（返回新数组、不改传入）；测试与视图都按此口径调它 */
    KEY: LOG_KEY, BYTE_BUDGET: LOG_BYTE_BUDGET, trimBudget: trimLogBudget };

  /* 侧档（展示流档）单一事实源：日志 + 奇遇叙事流两族；测试与视图读它，不各自硬编码 */
  /* ── 传记条数的单一事实源（2026-10-09 展示流与落档口径批 · 治理批 ⑨「三处口径」收口）──
   * 数值正典在 `D.LEGACY.BIO_KEEP`（读档容错上界，兼容旧档 9 世）与 `D.LEGACY.BIO_STORE_CAP`
   *   （写口与阶梯的落盘上界 = 正典① 的 6 世）。此前 `codex.js:343` 与本级⓪ 各写死一个字面 6、
   *   `legacy.js:71` 写死一个字面 9，而 `BIO_KEEP` 常量**全库零消费点** = 声明了没人读的假正典。
   *   现三处一律经本对函数取值，缺表兜底 = 现值（只为装载顺序不敏感，不是第二口径）。
   * ⚠️ 已知边界：取的是 `SQ.XDATA`（当前装载的世界包）。meta 是引擎层而数值表在修仙包内，
   *   第二世界落地时须改按 pack 取数——与审计 A5「只覆盖修仙包」同型，如实登记不装作已解。 */
  function bioKeep() { var L = (SQ.XDATA && SQ.XDATA.LEGACY) || {}; return L.BIO_KEEP || 9; }
  function bioStoreCap() { var L = (SQ.XDATA && SQ.XDATA.LEGACY) || {}; return L.BIO_STORE_CAP || 6; }
  SQ.BioCaps = { keep: bioKeep, store: bioStoreCap };

  /* 侧档状态复位（签名 + 「读不动」标志）：清档（resetSave）或外部删除/修好脏键后调用。
   * 跳过写的判据是「内容与上次落盘相同」，而**外部把侧档键删掉**这件事本模块无从感知
   * ⇒ 不复位就会出现「内容照旧 ⇒ 不写 ⇒ 侧档永久缺失」。生产路径的唯一入口是 resetSave。 */
  function resetSideSig() { lastLogSig = null; sideUnreadable = false; sideWriteSkipped = false; lastSideBytes = 0; }   /* 外部修好或删掉脏侧档后须能恢复写；复核返修：那条「待发」的跳写留痕同属要抹掉的旧事实，否则清档后第一次成功落盘会打出一条假提示 */

  SQ.Side = {
    KEY: LOG_KEY,
    LOG_BYTE_BUDGET: LOG_BYTE_BUDGET, LOG_HARD_CAP: LOG_HARD_CAP, LOG_CAT_CAP: LOG_CAT_CAP,
    FEED_BYTE_BUDGET: FEED_BYTE_BUDGET, FEED_STORE_CAP: FEED_STORE_CAP,
    trimFeed: trimFeedBudget, feedBytes: feedEntryBytes,
    resetSig: resetSideSig, unreadable: sideUnreadableFlag
  };
  /* 落盘前置无损级 + 展示流剥离口（测试取证用；生产只经 savePayload 调用）
   * compressStep 自 2026-10-09 起一并导出：判据要能**单独驱动某一级**（跑满阶梯会把级⓪ 的结果
   * 盖成级④ 的 1 世，证不了「级⓪ 的 6 是从哪张表取的」）。 */
  SQ.SavePre = { stripSideFlows: stripSideFlows, compressStep: compressStep };
  SQ.COOL_MAX_HOURS = COOL_MAX_HOURS;

  SQ.KEY = KEY;
  SQ.V = V;
  /* 存档容量红线单一事实源（测试与走查一律读这两个值，禁止再各自硬编码 KB 数）
   * ⚠️ **存档瘦身批 2026-10-08 口径变更**：两值的度量对象由「编码前 JSON 字符串」改为
   *   「**落盘字节**（编码后）」。数值不变（56KB / 64KB），含义变严一档的是分母变小、
   *   同一条红线可容纳更多游戏内容；判据要读原账（编码前）时另取 c.str 的字节数。 */
  /* 存档度量出口（**只给测试与判据读**，视图不呈现 · 用户 2026-10-09 口径：系统设计问题不占玩家界面；
   * 口径见 saveStats 定义处 —— 只在内存、不进存档） */
  SQ.SaveStats = {
    get: function () {
      return {
        mainBytes: saveStats.mainBytes, sideBytes: saveStats.sideBytes,
        stages: saveStats.stages.slice(), stageCount: saveStats.stages.length,
        codec: saveStats.codec, at: saveStats.at,
        readMainBytes: saveStats.readMainBytes, readSideBytes: saveStats.readSideBytes,
        trigger: SAVE_TRIGGER, red: SAVE_RED,
        logBudget: LOG_BYTE_BUDGET, feedBudget: FEED_BYTE_BUDGET,
        mainKey: KEY, sideKey: LOG_KEY,
        sideUnreadable: sideUnreadable
      };
    }
  };

  SQ.SAVE_TRIGGER = SAVE_TRIGGER;
  SQ.SAVE_RED = SAVE_RED;
  SQ.CODEC_PREFIX = CODEC_PREFIX;
  SQ.codecReady = codecReady;
  SQ.encodePayload = encodePayload;
  SQ.decodePayload = decodePayload;
  SQ.decodeStoredObject = decodeStoredObject;
  SQ.readStored = readStored;
  SQ.storedBytes = storedBytes;
  SQ.compressForSave = compressForSave;
  SQ.savePayload = savePayload;
  SQ.encodeForBridge = encodeForBridge;
  SQ.load = load;
  SQ.save = save;
  SQ.storageError = storageError;
  SQ.normalize = normalize;
  SQ.defaultState = defaultState;
  SQ.defaultProfile = defaultProfile;
  SQ.claim = claim;
  SQ.mutate = mutate;
  SQ.resetSave = resetSave;
  SQ.fmt = fmt;
  SQ.gameDateOf = gameDateOf;
  SQ.gameDateStr = gameDateStr;
  SQ.displayName = displayName;
})();
