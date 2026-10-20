/* 修行页（引擎主面板 · 挂机 / 修为 / 四柱 / 天道行 / 离线呈报 / 自动区 ‖ 第册五十二批 2026-10-19 从 view/index.html 整片搬出 · N34 第十六刀）
 * 范围 = 单一渲染器 `render`（原 `renderIdle`，295 行）；纯拼串，零监听零定时器（本刀唯一的「凑巧干净」件）。
 * 桥 35 → **43 枚**（本刀新增八枚，全是「件外调用才进桥」）：`renderPillars`（四柱 chip 行）‖ `renderTiandaoRow`（天道行）
 *   ‖ `fmtFull`（大数全写）‖ `caveSigOf`（洞府印记加成）‖ `talentCard`（天赋卡，两参）‖ `autoEventPref`（奇遇倾向现值）‖ `offlineDetail`（离线呈报的效率/时长那格）
 *   ‖ `wid`（当前世界 id）。另有两枚**已有桥名**直接复用：好感档汉字数（桥名 bondTier）、`ctx()` → `c.fresh()`。
 * ⚠️ `ctx()` 那一处是给**外置渲染器**递快照（`SQ.UI.rumor.band(ctx(), Date.now())`）：桥位 `fresh` 就是「取一份新快照」，
 *   件内不许自造，否则 D7 会把 `ctx` 判成裸读私名。
 * ⚠️ 原 `(c.s.profile.talents || []).map(function (el) { var ch = …})` 的局部 `c` 与桥位撞名 ⇒ 本刀改称 `ch`
 *   （在册硬口径「外置件不许拿 c 当回调形参」；bonds.js 第十二刀、sect.js 第十五刀同形）。
 * ⚠️ 机械改写必须**字符串感知**：第一版把 `'ui.time.hm'` 这类词表键也加了前缀（A2 当场判 key 不存在）。
 *   改写器现在把每行切成 code / str / cmt 段，只对 code 段套规则。
 * 桥 = `ctx()` 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；机械改写只当初稿，收口交给 D5/D7/D13/D14 + 走查。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});
  function render(c) {
    var w = c.w, m = c.mods, p = c.p, d = c.d;
    var cap = SQ.Idle.capOf(w, p, d, m);
    var rate = SQ.Idle.effRate(w, p, d, m, false);   /* 含模式乘区与新手加速：与 settle 同一个式子（审计 #4） */
    var need = SQ.Realm.needEffOf(w, p, d, m);
    var full = need == null && w.qi >= cap;
    var h = '';
    /* 游戏历（v2.3）：修行页顶栏——罗云历XXX年X月X日（1 游戏日 = 1 现实秒，每秒 tick 随之日进） */
    var calNow = c.date(Date.now());
    if (calNow) h += '<div class="calrow">' + c.esc(calNow) + '</div>';
    /* 江湖传闻区（传闻同步批）：紧随游戏时间之下，与奇遇页顶部同源渲染（renderRumors），
     * 信息两边完全一致——卡片/倒计时/前往查证/势力战卡全部复用，秒级 tick 自然刷新 */
    h += SQ.UI.rumor.band(c.fresh(), Date.now());
    h += c.renderPillars();                       /* 四柱 chip 行（B1）：财/法/地 激活 + 侣位灰置 */
    h += c.renderTiandaoRow();                    /* 天道系统批 B1/B3：问天入口 + 天象红点 + 逆天值/档位/称号/逆天盾 */
    /* 角色总览：战力大字重点展示 + 三维三格 + 境界说明入口（战力行自秘境页上移） */
    h += '<div class="stathero"><div class="shmain">' +
      '<span class="shv">' + SQ.fmt(SQ.Mods.powerOf(w, p, d, m)) + '</span>' +
      '<span class="shl">' + c.esc(c.t('resource.power')) + '</span></div><div class="shattr">' +
      (d.ATTRS || []).map(function (id) {
        return '<div class="sha"><span class="an">' + c.esc(c.t('attr.' + id)) + '</span>' +
          '<span class="av">' + Math.floor((w.attrs || {})[id] || 0) + '</span></div>';
      }).join('') + '</div></div>';
    h += '<div class="kv"><span class="hint">' + c.esc(c.t('realm.info.cur', { realm: c.t('realm.' + w.realm) })) + '</span>' +
      '<button class="linkbtn chip" data-act="openRealm">' + c.esc(c.t('realm.info.link')) + '</button></div>';
    /* 寿元 / 道伤两行（寿元批 §6.1A · 第卌八批改显示口径）：一律取世界包 lifeInfo 的派生数，视图零自拼口径
     * （第廿五批「同源」纪律沿用）。大限将至整行转红——引擎侧刻意**不写日志**：每秒 tick
     * 重绘会刷屏（第廿八批「转世结算刷屏」同族坑），警示只在这一屏。道伤满 1 层才报，
     * 岁月疗养中的零点几层不占行。
     * 用户令「寿元：111岁，尚余约1111年」⇒ `li.age`（= floor(lifeUsed)，含创角生年）报岁、
     * 只报剩余，不再摆「X/Y」分数：上界会随累加阶梯与 lifeBonus 动，摆出来只诱导误算。 */
    var li = p.worldSystems.lifeInfo(w);
    /* N58 定案（第册十二批落地）：历练态在寿元行旁补一句**按当前模式折算**的等效可用年——
     * 寿元阶梯按「全部闭关」定标，而历练产出只有闭关的 42% ⇒ 同一境要烧 2.4 倍岁月。
     * 不改表、不改节奏（那两案第册三批已否），只把这件事摆到屏上。折算率现取 `MODES`，不写死 2.4。 */
    var ventSpan = '';
    if (!li.eternal && w.mode === 'venture') {
      var MSv = p.data.MODES || {};
      var skv = (MSv.seclude || {}).qiMult || 1, vkv = (MSv.venture || {}).qiMult || 1;
      ventSpan = '<span class="hint"> · ' + c.esc(c.t('life.venture.warn', { n: SQ.fmt(Math.max(0, Math.floor(li.left * vkv / skv))) })) + '</span>';
    }
    h += '<div class="kv"><span' + (li.near ? ' class="bad"' : '') + '>' + c.esc(
      li.eternal ? c.t('life.row.eternal', { age: SQ.fmt(li.age) })
        : c.t('life.row', { age: SQ.fmt(li.age), left: SQ.fmt(Math.max(0, Math.ceil(li.left))) })
      ) + '</span>' + (li.near ? '<span class="bad">' + c.esc(c.t('life.near', { left: SQ.fmt(Math.ceil(li.left)) })) + '</span>' : '') + ventSpan + '</div>';
    if (li.daoLv >= 1) {
      h += '<div class="kv"><span' + (li.daoNear ? ' class="bad"' : '') + '>' +
        c.esc(c.t('daoshang.row', { n: li.daoLv, cap: li.daoMax })) + '</span>' +
        (li.daoNear ? '<span class="bad">' + c.esc(c.t('daoshang.near')) + '</span>' : '') + '</div>';
    }
    /* 修为大数字（修行状态批 v2.1）：**全位数字逐秒跳动**——不带 万/亿 缩放（缩放会把
     * 低境界产出量化到 0.1万/步，数字长时间纹丝不动）、不带「修为」单位字，只留 / 上限；
     * 每秒 tick 由 renderAll 重绘，配合全位数字形成最直观的增长动效 */
    h += '<div class="kv"><span class="big">' + c.fmtFull(w.qi) + '</span><span class="hint">/ ' + c.fmtFull(cap) + '</span></div>';
    h += '<div class="bar"><i style="width:' + Math.min(100, (w.qi / cap) * 100).toFixed(1) + '%"></i></div>';
    if (full) h += '<p class="fullcap">' + c.esc(c.t('idle.maxed')) + '</p>';
    h += '<div class="kv"><span>' + c.esc(c.t('idle.rate', { n: rate.toFixed(1) })) + '</span>' +
         '<button class="linkbtn chip" data-act="detailRate">' + c.esc(c.t('idle.detail')) + '</button></div>';
    if (c.ui.detailRate) {
      h += '<div class="detailbox">';
      h += '<div class="kv"><span>' + c.esc(c.t('idle.base')) + '</span><span>' + d.REALMS[w.realm].baseQi + '/s</span></div>';
      Object.keys(m.detail.qiRate || {}).forEach(function (src) {   /* 来源清单取 mods 自己记的键（审计 #11：原先硬列 10 项，漏 cave/caveFac/treasure/synergy/legacy ⇒ 明细相加 < 顶部数） */
        var v = (m.detail.qiRate || {})[src] || 0;
        if (v) h += '<div class="kv"><span>' + c.esc(c.t('idle.' + src)) + '</span><span>' + (v > 0 ? '+' : '') + c.pct(v) + '</span></div>';
      });
      var sys = p.worldSystems;
      if (sys) h += '<div class="kv"><span>' + c.esc(c.t('idle.align')) + '</span><span>×' + sys.alignMultOf(w).toFixed(2) + '</span></div>';
      /* caveMult 独立乘区（B7 · 数值详设 §8.2）：挂在末端单列一行，不混进 qiRate 加算池 */
      var cm = SQ.Cave.multOf(w, p, d, m);
      if (cm !== 1) {
        h += '<div class="kv"><span>' + c.esc(c.t('idle.cave')) + ' · ' + c.esc(c.t('cave.' + SQ.Cave.current(w, p).id + '.name')) +
          '</span><span>×' + cm.toFixed(2) + '</span></div>';
      }
      /* 模式乘区与初境加速（审计 #4 的可见面）：这两重以前只在引擎里乘，屏上看不见 ⇒ 明细各行相乘永远
       * 对不上顶部的 N/秒。数字一律取自表（MODES[mode].qiMult / NEWBIE_RAMP），视图不再抄字面量。 */
      var modeM225 = (d.MODES && d.MODES[w.mode]) ? d.MODES[w.mode].qiMult : 1;
      if (modeM225 !== 1) {
        h += '<div class="kv"><span>' + c.esc(c.t('idle.mode.' + w.mode)) + '</span><span>×' + modeM225.toFixed(2) + '</span></div>';
      }
      var rampM225 = (d.NEWBIE_RAMP && w.realm <= d.NEWBIE_RAMP.realms) ? d.NEWBIE_RAMP.qiMult : 1;
      if (rampM225 !== 1) {
        h += '<div class="kv"><span>' + c.esc(c.t('idle.newbie')) + '</span><span>×' + rampM225.toFixed(2) + '</span></div>';
      }
      h += '</div>';
    }
    if (need != null) {
      h += '<div class="kv"><span>' + c.esc(c.t('idle.next', { realm: c.t('realm.' + (w.realm + 1)), n: SQ.fmt(Math.max(0, need - w.qi)), res: c.t('resource.primary') })) + '</span></div>';
      /* 渡劫倒计时（第十八批 · 用户令「修行页要让人知道大约多久后可以渡劫」）：**纯派生显示量**——
       * 差额取 `needEffOf`（与手动渡劫按钮同一口径，不是 capOf 那个修为上限），增速取 `effRate`（与 settle 同一个式子），
       * 格式复用拜访/飞升冷却那一个时差文案（走桥名 timeLeft）；不入存档、不改任何结算。增速为 0（如离线效率算不进在线口径）时不印。 */
      if (need > w.qi && rate > 0) {
        h += '<div class="kv hint"><span>' + c.esc(c.t('idle.trib.eta',
          { time: c.timeLeft((need - w.qi) / rate * 1000) })) + '</span></div>';
      }
      var ti = p.worldSystems.tribInfo(w, p, d, m);
      if (ti) {
        h += '<div class="kv"><span>' + c.esc(c.t('tribulation.estimate', { p: Math.round(ti.p * 100) })) + '</span>' +
             '<button class="linkbtn chip" data-act="detailTrib">' + c.esc(c.t('tribulation.detail')) + '</button></div>';
        if (c.ui.detailTrib) {
          h += '<div class="detailbox">' +
            '<div class="kv"><span>' + c.esc(c.t('tribulation.base')) + '</span><span>' + ti.parts.base.toFixed(2) + '</span></div>' +
            '<div class="kv"><span>' + c.esc(c.t('tribulation.resist')) + '</span><span>+' + ti.parts.resist.toFixed(3) + '</span></div>' +
            '<div class="kv"><span>' + c.esc(c.t('tribulation.power')) + '</span><span>+' + ti.parts.power.toFixed(3) + '</span></div>' +
            '<div class="kv"><span>' + c.esc(c.t('tribulation.talent')) + '</span><span>' + (ti.parts.talent >= 0 ? '+' : '') + ti.parts.talent.toFixed(3) + '</span></div>' +
            /* N20 接线：一次性修正（丹方 / 奇遇 / 突破前置写入 `ws.tribulation.next`）此前只并进 talent 同池、             * 出处不列（与心魔 / 雷蕴签名同款展示纪律：并入同池仍单列出处） */
            ((w.tribulation && w.tribulation.next) ? '<div class="kv"><span>' + c.esc(c.t('tribulation.next')) + '</span><span>' +
              (w.tribulation.next >= 0 ? '+' : '') + w.tribulation.next.toFixed(3) + '</span></div>' : '') +
            /* 心魔行（系统深化批 B2 · 数值详设 §8.3.2）：层数与对 p 的影响（−0.0n）——
             * 已并入 parts.talent 同池，此处单列出处（与雷蕴签名行同款展示纪律） */
            (ti.parts.xinmoStacks > 0 ? '<div class="kv"><span>' + c.esc(c.t('tribulation.xinmo.row', { n: ti.parts.xinmoStacks })) +
              '</span><span class="bad">' + ti.parts.xinmo.toFixed(2) + '</span></div>' : '') +
            '<div class="kv"><span>' + c.esc(c.t('tribulation.karma')) + '</span><span>' + (ti.parts.karma >= 0 ? '+' : '') + ti.parts.karma.toFixed(2) + '</span></div>' +
            (ti.parts.alignFlat ? '<div class="kv"><span>' + c.esc(c.t('tribulation.alignFlat')) + '</span><span>+' + ti.parts.alignFlat.toFixed(2) + '</span></div>' : '') +
            /* 洞府签名「雷蕴」= 渡劫加项（B7）；签名已并入 parts.talent 同池，此处单列出处 */
            (c.caveSigOf('tribBonus') ? '<div class="kv"><span>' + c.esc(c.t('tribulation.caveSig')) + ' · ' +
              c.esc(c.t('cave.' + SQ.Cave.current(w, p).id + '.signature')) + '</span><span>+' + c.caveSigOf('tribBonus').toFixed(2) + '</span></div>' : '') +
            (function () {
              /* 护法加项行（B6 · 交互说明 §4.2）：生效 = 道号+档+加项；魔道/无人 = 灰字「无人护法」。
               * 职司护法标记（系统深化批 B2/B4 · 势力全录卷 §8.3）：officeGuard 为真时追加「职司护法 +0.02」
               * 分解行——门中长老坐镇，无护法道友也按档3 floor 计。 */
              var gN = ti.parts.guardianNpc;
              var gTier = gN ? SQ.Bonds.tierOf(w, gN, d) : 0;
              var ogRow = ti.parts.officeGuard
                ? '<div class="kv"><span>' + c.esc(c.t('faction.office.trib', { n: '0.02' })) + '</span><span>✓</span></div>'
                : '';
              return '<div class="kv' + (ti.parts.guardian > 0 ? '' : ' hint') + '"><span>' + c.esc(c.t('tribulation.guardian')) +
                (gN ? ' · ' + c.esc(c.t('bond.' + gN + '.name')) + c.bondTier(gTier) : '') + '</span><span>' +
                (ti.parts.guardian > 0 ? '+' + ti.parts.guardian.toFixed(2) : c.esc(c.t('tribulation.guardian.none'))) + '</span></div>' + ogRow;
            })() +
            /* 天道段（天道系统批 B3）：天道修正行（护佑/劫云 + 天睐天怒档位）+ 逆天大劫挑战入口
             * （defy ≥100 亮起、可无限期推迟——独立劫不推进境界） */
            (function () {
              var tdR = w.tiandao;
              if (!tdR || !SQ.Tiandao) return '';
              var rows = '';
              if (ti.parts.tiandao) {
                rows += '<div class="kv"><span>' + c.esc(c.t('tiandao.nextTrib')) + '</span><span>' +
                  (ti.parts.tiandao > 0 ? '+' : '') + ti.parts.tiandao.toFixed(2) + '</span></div>';
              }
              if (ti.parts.feud) {
                rows += '<div class="kv"><span>' + c.esc(c.t('prodigy.detail.feudstate')) + '</span><span class="bad">' + ti.parts.feud.toFixed(2) + '</span></div>';
              }
              if (ti.parts.soul) {
                rows += '<div class="kv"><span>' + c.esc(c.t('spirit.skill.hun.name')) + '</span><span>+' + ti.parts.soul.toFixed(2) + '</span></div>';
              }
              var stR = SQ.Tiandao.stageOf(w, d);
              /* 档位罚值取表（审计 #5）：原先这里硬编码 -0.03 / -0.01，而 `D.TIANDAO.DEFY_TRIB_MODS = [-0.01, -0.02]`
               * ⇒ 天怒那行屏上比引擎多罚 0.01，且与同一面板上方 `ti.parts.tiandao`（引擎实算）两个数打架。
               * 取不到表就不印这一行——宁缺一行，不编一个数。 */
              var dmR = d.TIANDAO && d.TIANDAO.DEFY_TRIB_MODS;
              if ((stR === 'lai' || stR === 'nu') && dmR && dmR.length >= 2) {
                /* 引擎 `tribModOf` 是**两档相加**（armed.lai 与 armed.nu 可以同时亮：实测逆天 25 + 37 = 62 ⇒ 双旗），
                 * 而 `stageOf` 只回一个档名 ⇒ 按档名取一支会少算另一支，屏上 −0.02 与同面板上方引擎实算 −0.03
                 * 打架 = 本行立时要消灭的那一类。现按引擎同一式取「已亮档之和」。 */
                var arR = (w.tiandao && w.tiandao.armed) || {};
                var penR = (arR.lai ? dmR[0] : 0) + (arR.nu ? dmR[1] : 0);
                rows += '<div class="kv"><span>' + c.esc(c.t('tiandao.tribrow')) + ' · ' + c.esc(c.t('tiandao.stage.' + stR)) +
                  '</span><span class="bad">' + penR.toFixed(2) + '</span></div>';
              }
              if (tdR.defy >= (d.TIANDAO.DEFY_STAGES || [30, 60, 100])[2]) {
                var ni = SQ.Tiandao.nijieInfo(w, p, d, m);
                rows += '<div class="tribready" style="margin-top:8px"><div class="tr-t">' + c.esc(c.t('tiandao.stage.nijie')) + '</div>' +
                  (ni ? '<div class="hint">' + c.esc(c.t('tiandao.nijie.p', { p: Math.round(ni.p * 100) })) + '</div>' : '') +
                  '<button class="primary" data-act="nijie" style="width:100%;margin-top:6px">' + c.esc(c.t('tiandao.nijie.btn')) + '</button></div>';
              }
              return rows;
            })() +
            '</div>';
        }
      }
      /* 手动渡劫入口：仅「自动渡劫已关闭」时出现；修为圆满才亮按钮（need 与 tryTrib 同一口径） */
      if (!(c.s.settings && c.s.settings.autoTrib) && w.qi >= need) {
        h += '<div class="tribready">' +
          '<div class="tr-t">' + c.esc(c.t('trib.manual.ready')) + '</div>' +
          '<div class="hint">' + c.esc(c.t('trib.manual.hint')) + '</div>' +
          '<button class="primary" data-act="trib" style="width:100%;margin-top:8px">' + c.esc(c.t('trib.manual.btn')) + '</button>' +
          '</div>';
      }
    } else {
      h += '<div class="kv"><span class="fullcap">' + c.esc(c.t('idle.maxed')) + '</span></div>';
      /* 飞升大劫入口（轮回卷 §1.2）：真仙盈满亮起——独立终局劫 base 0.25、
       * 失败不扣修为不计连败、24h 重试；成功 = 满额遗泽转世（毕业仪式） */
      var fsChk = SQ.Legacy ? SQ.Legacy.canFeisheng(w, p, d, c.s.meta, Date.now(), c.s.profile) : { ok: false };
      if (fsChk.ok) {
        var fsInfo = SQ.Legacy.feishengInfo(w, p, d, m);
        h += '<div class="tribready"><div class="tr-t">' + c.esc(c.t('legacy.ui.feisheng.btn')) + '</div>' +
          (fsInfo ? '<div class="hint">' + c.esc(c.t('legacy.ui.feisheng.p', { p: Math.round(fsInfo.p * 100) })) + '</div>' : '') +
          '<button class="primary" data-act="ascend" style="width:100%;margin-top:6px">' + c.esc(c.t('legacy.ui.feisheng')) + '</button></div>';
      } else if (fsChk.reason === 'cd') {
        h += '<div class="kv hint"><span>' + c.esc(c.t('legacy.ui.feisheng.cd', { t: c.timeLeft(Math.max(0, fsChk.until - Date.now())) })) + '</span></div>';
      }
    }
    /* ── 临时增益图标行（系统深化批 B2）：破境高光 / 道伤封固 / 声威大振 / 同门来助等来源溯源展示；
     * eventShield 为「护佑」层数 chip（冥佑层语义）。词表未登记的来源只显示字段与数值。 ── */
    var nowB = Date.now();
    var buffChips = (w.buffs || []).filter(function (b) { return b.until > nowB; });
    if (buffChips.length) {
      var shieldN = buffChips.filter(function (b) { return b.field === 'eventShield'; }).length;
      var chips = buffChips.filter(function (b) { return b.field !== 'eventShield'; }).map(function (b) {
        var srcKey = b.source ? ('buff.src.' + b.source) : '';
        var srcName = srcKey && c.t(srcKey) !== srcKey ? c.t(srcKey) : '';
        var harmful = (b.field === 'shopCost') ? (b.mult > 0) : (b.mult < 0);
        return '<span class="buffchip' + (harmful ? ' deb' : '') + '">' +
          (srcName ? c.esc(srcName) + ' · ' : '') +
          c.esc(c.t('talent.field.' + b.field)) + ' ' + (b.mult >= 0 ? '+' : '−') + c.pct(Math.abs(b.mult)) +
          ' · ' + c.esc(c.timeLeft(b.until - nowB)) + '</span>';
      });
      if (shieldN) chips.push('<span class="buffchip">' + c.esc(c.t('buff.shield', { n: shieldN })) + '</span>');
      h += '<div class="buffrow">' + chips.join('') + '</div>';
    }
    /* ── 结算区（修行状态批 v2.1 重排）：修行状态（模式卡）→ 修行所得（离线结算）→ 收功 ──
     * 三块合成一个连贯区块：玩家先选状态、再看上次离线结算、最后手动收功，
     * 概念上互为上下游；不再散落在页首与页尾。 */
    var mode = w.mode || 'seclude';
    /* 历练入口预告（体验手感批 v2.12）：当前秘境战力不足 = 与秘境页瓶颈同一 powerOf 口径 */
    var pwForMode = SQ.Mods.powerOf(w, p, d, m);
    var znCur = (d.ZONES || [])[w.zone] || {};
    var ventureWeak = !!znCur.need && pwForMode < znCur.need;
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('idle.mode.title')) + '</span></div>';
    h += '<div class="modesel">';
    /* 历练模式卡常驻词缀行（数值详设 §2.5「切入即见、不隐藏」：秘境页顶部 + 本卡双落点） */
    var affM = SQ.Combat.affixDef(w, d);
    ['seclude', 'venture'].forEach(function (mk) {
      var on = mode === mk;
      h += '<div class="modeopt' + (on ? ' on' : '') + '" data-act="setMode" data-v="' + mk + '">' +
        '<div class="mt">' + c.esc(c.t('idle.mode.' + mk)) + '</div>' +
        '<div class="md">' + c.esc(c.t('idle.mode.' + mk + '.desc')) + '</div>' +
        (mk === 'venture' && affM
          ? '<div class="mat">' + c.esc(c.t('zone.affix.line', {
              name: c.t('affix.' + affM.id + '.name'), desc: c.t('affix.' + affM.id + '.desc') })) + '</div>'
          : (mk === 'seclude' && affM
            ? '<div class="mat">' + c.esc(c.t('zone.affix.seclude')) + '</div>' : '')) +
        (mk === 'venture' && ventureWeak
          ? '<div class="mw">' + c.esc(c.t('idle.mode.venture.warn', { zone: c.t('combat.zone.' + w.zone) })) + '</div>'
          : (on ? '<div class="mat">' + c.esc(mk === 'venture'
            ? c.t('idle.mode.venture.at', { zone: c.t('combat.zone.' + w.zone) })
            : c.t('idle.mode.seclude.at')) + '</div>' : '')) +
        '</div>';
    });
    h += '</div>';
    /* 修行所得常驻面板（F4：lastOffline 为 null 不渲染）。
     * 潜心悟道叙事变体（修行状态批）：离山时在历练 → 标题/正文走 *.v 文案，数值同源不变；
     * 标题缀相对时间（v2.1），明确这是「上次归来」的结算而非实时数据 */
    if (w.lastOffline) {
      var lo = w.lastOffline;
      var ventureLo = lo.mode === 'venture';
      var lsecs = isFinite(lo.secs) ? lo.secs : 0;   /* 防脏字段：NaN/undefined 一律按 0 计 */
      var lh = Math.floor(lsecs / 3600), lm = Math.floor((lsecs % 3600) / 60);
      var lt = lh > 0 ? c.t('ui.time.hm', { h: lh, m: lm }) : c.t('ui.time.m', { m: Math.max(1, lm) });
      h += '<div class="offbox"><div class="ot">' +
        c.esc(c.t(ventureLo ? 'offline.panel.title.v' : 'offline.panel.title') + ' · ' + c.timeAgo(lo.at)) + '</div>' +
        c.esc(c.t(ventureLo ? 'offline.panel.body.v' : 'offline.panel.body', {
          t: lt, res: c.t('resource.primary'), qi: SQ.fmt(lo.qi), cur: c.t('resource.currency'),
          stones: SQ.fmt(lo.stones || 0), gate: c.t('tribulation.tag'),
          n: lo.trib ? lo.trib.n : 0, s: lo.trib ? lo.trib.s : 0, f: lo.trib ? lo.trib.f : 0
        })) +
        '<div class="hint" style="margin-top:3px">' + c.esc(c.offlineDetail(lo)) + '</div></div>';
    }
    /* 收功按钮已移除（v2.2）：自动心跳每秒做同一套结算+落盘，手动按钮语义重复——
     * 结算区收敛为「修行状态 → 修行所得」纯展示区块 */
    h += '<div class="cards" style="margin-top:12px">' + (c.s.profile.talents || []).map(function (el) {
      var ch = c.talentCard(el, c.wid());
      return '<div class="' + ch.className + '">' + ch.innerHTML + '</div>';
    }).join('') + '</div>';
    /* 自动三开关与奇遇倾向已随 UI v2 B2 迁入设置页（§七A 154）；修行页尾不再挂自动区。 */
    c.$('tab-idle').innerHTML = h;
  }
  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.idle = { render: render };
})();
