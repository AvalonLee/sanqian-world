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
  /* B16-w：吐纳明细改独立浮层（设计稿 data-sheet="rate" 的口径）。
   * 加项与乘区分列标记：加项「+」、乘区「×」，末尾给合计——与顶部每秒产出一式同源。 */
  function ratePanel(c, w, m, d, rate) {
    var rows = '';
    function rr(kind, label, val) {
      return '<div class="dp-row"><span class="dp-k">' + c.esc(label) + '</span>' +
        '<i class="dp-t ' + kind + '">' + (kind === 'mul' ? '×' : kind === 'add' ? '+' : '·') + '</i>' +
        '<b class="dp-v">' + c.esc(val) + '</b></div>';
    }
    rows += rr('base', c.t('idle.base'), d.REALMS[w.realm].baseQi + '/s');
    Object.keys(m.detail.qiRate || {}).forEach(function (src) {
      var v = (m.detail.qiRate || {})[src] || 0;
      if (v) rows += rr('add', c.t('idle.' + src), (v > 0 ? '+' : '') + c.pct(v));
    });
    var sys = c.p.worldSystems;
    if (sys) rows += rr('mul', c.t('idle.align'), '×' + sys.alignMultOf(w).toFixed(2));
    var cm = SQ.Cave.multOf(w, c.p, d, m);
    if (cm !== 1) rows += rr('mul', c.t('idle.cave') + ' · ' + c.t('cave.' + SQ.Cave.current(w, c.p).id + '.name'), '×' + cm.toFixed(2));
    var modeM = (d.MODES && d.MODES[w.mode]) ? d.MODES[w.mode].qiMult : 1;
    if (modeM !== 1) rows += rr('mul', c.t('idle.mode.' + w.mode), '×' + modeM.toFixed(2));
    var rampM = (d.NEWBIE_RAMP && w.realm <= d.NEWBIE_RAMP.realms) ? d.NEWBIE_RAMP.qiMult : 1;
    if (rampM !== 1) rows += rr('mul', c.t('idle.newbie'), '×' + rampM.toFixed(2));
    return '<div class="dp-mask"><div class="dp-sheet">' +
      '<div class="dp-head"><span class="dp-t2">' + c.esc(c.t('idle.detail.title')) + '</span>' +
      '<span class="dp-total">' + c.esc(c.t('idle.rate', { n: rate.toFixed(1) })) + '</span></div>' +
      '<div class="dp-rows">' + rows + '</div>' +
      '<p class="hint">' + c.esc(c.t('idle.detail.note')) + '</p>' +
      '<button class="linkbtn" data-act="detailRate">' + c.esc(c.t('ui.close')) + '</button></div></div>';
  }
  function render(c) {
    var w = c.w, m = c.mods, p = c.p, d = c.d;
    var cap = SQ.Idle.capOf(w, p, d, m);
    var rate = SQ.Idle.effRate(w, p, d, m, false);   /* 含模式乘区与新手加速：与 settle 同一个式子（审计 #4） */
    var need = SQ.Realm.needEffOf(w, p, d, m);
    var full = need == null && w.qi >= cap;
    var h = '';
    /* B16-c（对齐设计稿修行页构图）：闭关/历练切换上移页首居中（设计稿 .mode 药丸），
     * 说明/词缀/预警浓缩成 metaline 两行；原「修行状态」两张模式卡（.modesel）退役。
     * 游戏历行（calrow）撤——世界时间已在顶栏 hd-sub（B16-b），不再重复。 */
    var mode0 = w.mode || 'seclude';
    var pwM = SQ.Mods.powerOf(w, p, d, m);
    var znM = (d.ZONES || [])[w.zone] || {};
    var ventureWeakM = !!znM.need && pwM < znM.need;
    var affM = SQ.Combat.affixDef(w, d);
    h += '<div class="mode">' +
      ['seclude', 'venture'].map(function (mk) {
        return '<button' + (mode0 === mk ? ' class="on"' : '') + ' data-act="setMode" data-v="' + mk + '">' +
          c.esc(c.t('idle.mode.' + mk)) + '</button>';
      }).join('') + '</div>';
    /* 小字以**闭关那句**为准（第册一百一十四批 · 用户令「切到历练也不要变」）：
     * 原先随模式换文案，两句话长短不同 ⇒ 圆相被顶得上下跳（B16-ae 先用定高压住，这一批直接把文案钉成一句）。
     * 右侧那一枚仍是模式态读数（正在洞府 / 正在「某秘境」历练 / 战力不足预警），模式信息不丢。 */
    h += '<div class="metaline modemeta"><span>' + c.esc(c.t('idle.mode.seclude.desc')) + '</span><span' +
      (ventureWeakM ? ' class="warnline"' : '') + '>' + (mode0 === 'venture'
        ? c.esc((affM ? c.t('zone.affix.line', { name: c.t('affix.' + affM.id + '.name'), desc: c.t('affix.' + affM.id + '.desc') }) + ' · ' : '') +
            (ventureWeakM
              ? c.t('idle.mode.venture.warn', { zone: c.t('combat.zone.' + w.zone) })
              : c.t('idle.mode.venture.at', { zone: c.t('combat.zone.' + w.zone) })))
        : c.esc(affM ? c.t('zone.affix.seclude') : c.t('idle.mode.seclude.at'))) + '</span></div>';
    /* B16-c：江湖传闻带与四柱 chip 行撤出中区（用户批）——传闻入右栏「天象 · 传闻」块，
     * 四柱入右栏可点槽位（点击弹窗功能随迁）；天道行仍留中区（问天入口 + 天象红点）。 */
    var tiandaoHtml = c.renderTiandaoRow();                    /* 天道系统批 B1/B3：问天入口 + 天象红点 + 逆天值 */
    /* 圆相 hero（UI v2 B15-b · 设计稿 .enso）：环 = 修为进度（只读派生），环心 = 修为全位数字（1 秒一跳），
     * 环下 = 吐纳速率 + 明细。修行数字从此只在这里出现一处，不再另挂 `.big` 行与进度条（环就是进度条）。
     * 几何取设计稿原值：218×218 容器 / viewBox 236 / r99 / 周长 622.035。 */
    var ringP = Math.max(0, Math.min(100, cap > 0 ? (w.qi / cap) * 100 : 0));
    var RING_C = 622.035;   /* 2π × r99 */
    var subLine;
    if (need != null) {
      subLine = c.esc(c.t('idle.next', { realm: c.t('realm.' + (w.realm + 1)), n: SQ.fmt(Math.max(0, need - w.qi)), res: c.t('resource.primary') }));
      /* 渡劫倒计时（第十八批）：差额取 needEffOf、增速取 effRate，与 settle 同一式子；增速为 0 不印 */
      if (need > w.qi && rate > 0) {
        subLine += ' · ' + c.esc(c.t('idle.trib.eta', { time: c.timeLeft((need - w.qi) / rate * 1000) }));
      }
    } else {
      subLine = c.esc(c.t('idle.maxed'));
    }
    /* 数字自适应字号：环内可用宽度约 198px（260 容器 / r99 经 236 viewBox 缩放后的内径），
     * 衬线数字按 0.62em 估宽 ⇒ 位数越多字越小。上限 42（短数字与设计稿 40 同档）、下限 20。
     * 回应实测反馈「修为过亿后数字贴近环线」——不再用固定 40px。 */
    var qiTxt = c.fmtFull(w.qi);
    var qiFs = Math.max(20, Math.min(42, Math.round(198 / (qiTxt.length * 0.62))));
    h += '<div class="stathero"><div class="enso">' +
      '<svg viewBox="0 0 236 236" aria-hidden="true">' +
      /* 几何照设计稿：刻度圈 r113（在外），轨道与进度环 r99（在内）——同一半径会叠在一起 */
      '<circle class="ticks" cx="118" cy="118" r="113"></circle>' +
      '<circle class="track" cx="118" cy="118" r="99"></circle>' +
      '<circle class="prog" cx="118" cy="118" r="99" stroke-dasharray="' + RING_C +
      '" stroke-dashoffset="' + (RING_C * (1 - ringP / 100)).toFixed(1) + '"></circle></svg>' +
      '<div class="enso-core"><div class="lab">' + c.esc(c.t('resource.primary')) + '</div>' +
      '<div class="val num-full" style="font-size:' + qiFs + 'px">' + qiTxt + '</div>' +
      '<div class="sub">' + subLine + '</div></div></div>' +
      '<div class="rate">' + c.esc(c.t('idle.rate', { n: rate.toFixed(1) })) +
      '<button class="linkbtn chip" data-act="detailRate">' + c.esc(c.t('idle.detail')) + '</button></div></div>';
    /* B16-c 渡劫 hero（设计稿 .hero-cta）：圆满时「渡劫」是唯一朱砂实心按钮，
     * 成算与明细写在按钮下方——决策依据和动作在同一视线内（设计说明「动作只有两个」）。
     * 自动渡劫开启或未圆满时不渲染按钮（口径与原 tribready 块一致：qi ≥ needEffOf 才亮）。 */
    var tiH = (need != null) ? p.worldSystems.tribInfo(w, p, d, m) : null;
    /* B16-af：飞升 hero 与渡劫 hero 同一位置（圆相 + 吐纳速率下方、四格上方）；飞升去掉外层方框 */
    var fsChk = (need == null && SQ.Legacy) ? SQ.Legacy.canFeisheng(w, p, d, c.s.meta, Date.now(), c.s.profile) : { ok: false };
    if (need != null && tiH && !(c.s.settings && c.s.settings.autoTrib) && w.qi >= need) {
      h += '<div class="hero-cta">' +
        '<div class="cta-note">' + c.esc(c.t('trib.manual.ready')) + '</div>' +
        '<button class="btn sealbtn" data-act="trib">' + c.esc(c.t('trib.manual.btn')) + '</button>' +
        '<div class="cta-note">' + c.esc(c.t('tribulation.estimate', { p: Math.round(tiH.p * 100) })) +
        '<button class="linkbtn chip" data-act="detailTrib">' + c.esc(c.t('tribulation.detail')) + '</button></div></div>';
    } else if (need == null && fsChk.ok) {
      var fsInfo0 = SQ.Legacy.feishengInfo(w, p, d, m);
      h += '<div class="hero-cta ascend">' +
        '<div class="cta-note">' + c.esc(c.t('legacy.ui.feisheng.btn')) +
        (fsInfo0 ? ' · ' + c.esc(c.t('legacy.ui.feisheng.p', { p: Math.round(fsInfo0.p * 100) })) : '') + '</div>' +
        '<button class="btn sealbtn" data-act="ascend">' + c.esc(c.t('legacy.ui.feisheng')) + '</button></div>';
    }
    /* 四格修为身元（设计稿 .statrow）：战力 / 精 / 气 / 神 —— 战力从环心挪到这里 */
    var buffHtml = '';
    h += '<div class="statrow">' +
      '<div><div class="k">' + c.esc(c.t('resource.power')) + '</div><div class="v">' + SQ.fmt(SQ.Mods.powerOf(w, p, d, m)) + '</div></div>' +
      (d.ATTRS || []).map(function (id) {
        return '<div><div class="k">' + c.esc(c.t('attr.' + id)) + '</div><div class="v">' +
          Math.floor((w.attrs || {})[id] || 0) + '</div></div>';
      }).join('') + '</div>';
    /* 临时增益行（设计稿 .buffrow，紧跟 statrow）：来源 · 字段 ±值 · 剩余时长 */
    var nowB = Date.now();
    var buffChips = (w.buffs || []).filter(function (b) { return b.until > nowB; });
    if (buffChips.length) {
      var shieldN0 = buffChips.filter(function (b) { return b.field === 'eventShield'; }).length;
      var chips0 = buffChips.filter(function (b) { return b.field !== 'eventShield'; }).map(function (b) {
        var srcKey0 = b.source ? ('buff.src.' + b.source) : '';
        var srcName0 = srcKey0 && c.t(srcKey0) !== srcKey0 ? c.t(srcKey0) : '';
        var harmful0 = (b.field === 'shopCost') ? (b.mult > 0) : (b.mult < 0);
        return '<span class="buffchip' + (harmful0 ? ' deb' : '') + '">' +
          (srcName0 ? c.esc(srcName0) + ' · ' : '') +
          c.esc(c.t('talent.field.' + b.field)) + ' ' + (b.mult >= 0 ? '+' : '−') + c.pct(Math.abs(b.mult)) +
          ' · ' + c.esc(c.timeLeft(b.until - nowB)) + '</span>';
      });
      if (shieldN0) chips0.push('<span class="buffchip">' + c.esc(c.t('buff.shield', { n: shieldN0 })) + '</span>');
      buffHtml = '<div class="buffrow">' + chips0.join('') + '</div>';
    }
    h += buffHtml;
    /* 修为数字与进度条已收进圆相（B15-b）；吐纳明细 B16-w 起走独立浮层（ratePanel，末尾按 ui.detailRate 挂） */
    if (need != null) {
      /* 「距下一境界 / 渡劫倒计时」已并入圆相 sub 行（B15-b），此处不再重复印一遍 */
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
      /* 手动渡劫入口已上移圆相下方 hero-cta（B16-c，设计稿位）；此处不再重复渲染。 */
    } else {
      h += '<div class="kv"><span class="fullcap">' + c.esc(c.t('idle.maxed')) + '</span></div>';
      /* 飞升 hero 已上移圆相下方（B16-af）；这里只留冷却提示 */
      if (fsChk.reason === 'cd') {
        h += '<div class="kv hint"><span>' + c.esc(c.t('legacy.ui.feisheng.cd', { t: c.timeLeft(Math.max(0, fsChk.until - Date.now())) })) + '</span></div>';
      }
    }
    /* B16-aa：境界 / 寿元 / 道伤 / 洞府收成设计稿 v2 的紧凑信息块——
     * 第一行「当前境界 + 境界说明」，第二行「寿元 ‖ 洞府」，第三行「道伤 ‖ 历练折算」。 */
    var li = p.worldSystems.lifeInfo(w);
    var ventTxt = '';
    if (!li.eternal && w.mode === 'venture') {
      var MSv = p.data.MODES || {};
      var skv = (MSv.seclude || {}).qiMult || 1, vkv = (MSv.venture || {}).qiMult || 1;
      ventTxt = c.t('life.venture.warn', { n: SQ.fmt(Math.max(0, Math.floor(li.left * vkv / skv))) });
    }
    var caveNow = SQ.Cave.current(w, p);
    var caveTxt = caveNow
      ? c.t('idle.cave') + ' ' + c.t('cave.' + caveNow.id + '.name') + ' ×' + SQ.Cave.multOf(w, p, d, m).toFixed(2)
      : '';
    var lifeTxt = li.eternal ? c.t('life.row.eternal', { age: SQ.fmt(li.age) })
      : c.t('life.row', { age: SQ.fmt(li.age), left: SQ.fmt(Math.max(0, Math.ceil(li.left))) });
    if (li.near) lifeTxt += ' · ' + c.t('life.near', { left: SQ.fmt(Math.ceil(li.left)) });
    var daoTxt = li.daoLv >= 1
      ? c.t('daoshang.row', { n: li.daoLv, cap: li.daoMax }) + (li.daoNear ? ' · ' + c.t('daoshang.near') : '')
      : '';
    h += '<div class="statmeta">' +
      '<div class="kv"><span class="hint">' + c.esc(c.t('realm.info.cur', { realm: c.t('realm.' + w.realm) })) + '</span>' +
      '<button class="linkbtn chip" data-act="openRealm">' + c.esc(c.t('realm.info.link')) + '</button></div>' +
      '<div class="metaline"><span class="' + (li.near ? 'bad' : '') + '">' + c.esc(lifeTxt) + '</span>' +
      '<span>' + c.esc(caveTxt) + '</span></div>' +
      ((daoTxt || ventTxt) ? '<div class="metaline"><span class="' + (li.daoNear ? 'bad' : '') + '">' + c.esc(daoTxt) +
        '</span><span class="' + (ventTxt ? 'warnline' : '') + '">' + c.esc(ventTxt) + '</span></div>' : '') +
      '</div>';
    /* B16-c：天道行仍落中区（问天入口 + 天象红点 + 逆天值）；传闻带与四柱行已移右栏（renderRail）。
     * B16-w：右栏有「天象 · 传闻」与彩蛋块时，本行由 CSS 收起（不重复显示；窄屏无右栏时仍在此）。 */
    h += tiandaoHtml;
    /* ── 离线所得（设计稿页尾 .strip；B16-w 起排在「天命」之后） ── */
    var offHtml = '';
    if (w.lastOffline) {
      var lo = w.lastOffline;
      var ventureLo = lo.mode === 'venture';
      var lsecs = isFinite(lo.secs) ? lo.secs : 0;   /* 防脏字段：NaN/undefined 一律按 0 计 */
      var lh = Math.floor(lsecs / 3600), lm = Math.floor((lsecs % 3600) / 60);
      var lt = lh > 0 ? c.t('ui.time.hm', { h: lh, m: lm }) : c.t('ui.time.m', { m: Math.max(1, lm) });
      offHtml = '<div class="offbox"><div class="ot">' +
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
    /* B15-c：天赋卡归并到「天命」段标之下（设计稿 .shelf-head；自动区已随 D6 迁设置页，不在本页）
     * B16-af：段标最右补洗髓快捷入口（同一枚 showWash） */
    var swCap = (d.TALENT_SWAP || {}).PER_LIFE || 0;
    var swLeft = Math.max(0, swCap - (w.talentUsed || 0));
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('idle.talent.title')) + '</span>' +
      (swCap > 0 ? '<button class="linkbtn" data-act="washOpen">' +
        c.esc(c.t('talent.swap.entry', { owed: w.talentOwed || 0, cap: swLeft })) + '</button>' : '') + '</div>';
    h += '<div class="cards" style="margin-top:12px">' + (c.s.profile.talents || []).map(function (el) {
      var ch = c.talentCard(el, c.wid());
      return '<div class="' + ch.className + '">' + ch.innerHTML + '</div>';
    }).join('') + '</div>';
    h += offHtml;
    /* 自动三开关与奇遇倾向已随 UI v2 B2 迁入设置页（§七A 154）；修行页尾不再挂自动区。 */
    /* B16-w：吐纳明细浮层（按需挂；点遮罩或「收起」都走 detailRate 同一动作） */
    if (c.ui.detailRate) h += ratePanel(c, w, m, d, rate);
    c.$('tab-idle').innerHTML = h;
  }
  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.idle = { render: render };
})();
