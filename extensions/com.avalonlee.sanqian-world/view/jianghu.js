/* 江湖榜页渲染与动作（原「天骄」页 · 第册七批 2026-10-17 从 view/index.html 内联块整段搬出 · 正典 = UI 卷 §3.4d）
 * 范围 = 这一页的呈现（`jbChipOf` / `jbFive` / `render`）**加属于它的三条动作**（换榜 / 切磋 / 袭杀）。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 **D7** 逐键对账）；形参名钉死 c ⇒ **本文件所有回调一律不许用 c**。
 * ⚠️ 代码是机械改写出来的（取数口一律前缀 c.），改写规则与「零残留」扫描见本批收口记录；
 *    行为面由走查 `verify-ui-jianghu`（四榜十席 / 五项文本 / 三档徽标 / 隐世全问号 / 玩家行）与
 *    `verify-ui-ambush`（切磋与袭杀那族）逐条压住 —— 这两篇读的都是渲染结果与点击后果。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* ── 江湖四榜（第册一批③ · 设计稿《江湖榜与角色库》§二 / §三）────────────────
   * 榜面五项 = 境界 / 势力 / 兵刃 / 法宝 / 主修，**战力数字整列撤除**。撤掉数字必须补一个
   * 「够不够格」的表达，否则切磋与袭杀成盲盒 ⇒ 三档徽标（可压 / 相当 / 悬殊）：档位由引擎
   * `SQ.Prodigy.board4` 用切磋表值 `HANDICAP.crush` / `brave` 同一把尺子算好送来，视图零判定口径
   *（与 N54「故意不报成算百分比」同取向：报档位，不报假精确）。
   * 席位三族各有各的形状：相识者（可点、给钮）‖ 背景席位（素不相识、无钮）‖ 隐世三席
   *（名号与一切明细都是「？？？」、零入口、恒列天榜前三 —— 用户裁定 2）。
   * ⚠️ chip 容器挂专名类 `.jbchips`（第卌六批 `.lawchips` 同型教训：走查靠文案匹配取数会撞车）。 */
  function jbChipOf(c) { var b = c.ui.jhb; return (b === 1 || b === 2 || b === 3) ? b : 0; }
  /* 五项文本片段：取不到那一栏就不 push（与「势力卡掌门一行取不到就整行不渲染」同一纪律）。
   * 兵刃 / 法宝 / 主修对**未相识者**也是确定的：名录 id 走哈希派生（`Jianghu.gearOf`，不入档、
   * 不掷随机 ⇒ 同一人同一件），玩家那一行则全取真状态。 */
  function jbFive(c, r) {
    var w = c.w, p = c.p, d = c.d, out = [];
    if (r.hid) { var q = c.t('jianghu.q'); return [q, q, q, q, q]; }
    var jp = r.rid ? SQ.Jianghu.of(p, r.rid) : null;
    var g = r.rid ? SQ.Jianghu.gearOf(p, d, r.rid, r.realm) : null;
    if (r.me) {
      var am = p.artsMap(), mid = SQ.Arts.mainArt(w), own = ((w.treasures || {}).owned || [])[0];
      out.push(c.t('realm.' + r.realm));
      out.push(w.sect && w.sect.name ? w.sect.name
        : SQ.Prodigy.factionNameOf(w, { fc: w.factionId ? 0 : -1, fid: w.factionId || null }, p));
      if (w.gear && w.gear.weapon && w.gear.weapon.name) out.push(w.gear.weapon.name);
      if (own) out.push(c.t('treasure.' + own.id + '.name'));
      if (mid && am[mid]) out.push(c.t('skill.' + mid + '.name'));
      return out;
    }
    out.push(c.t('realm.' + r.realm));
    /* 势力名：有名录按名录，无名录（旧档 prN 行）按该行自己的 fid —— 两侧都走同一个 factionNameOf 口径 */
    var pr = (r.known && r.pid) ? SQ.Prodigy.byId(w, r.pid) : null;
    out.push(pr ? SQ.Prodigy.factionNameOf(w, pr, p)
      : SQ.Prodigy.factionNameOf(w, { fc: (jp && jp.fc) ? 0 : -1, fid: (jp && jp.fc) || null }, p));
    if (g && g.wp) out.push(g.wp);
    if (g && g.tb) out.push(c.t('treasure.' + g.tb + '.name'));
    if (g && g.art) out.push(c.t('skill.' + g.art + '.name'));
    return out;
  }

  function render(c) {
    var w = c.w, d = c.d, p = c.p, m = c.mods;
    /* 「效力于你」角标数据源：宗门弟子档里的天骄来源位 `pr`（零新增存档字段，派生态） */
    var srvSet = {};
    if (w.sect && w.sect.disciples) w.sect.disciples.forEach(function (x) { if (x.pr) srvSet[x.pr] = 1; });
    /* 页头 = 四榜 chip（下方拼装时前置）：原「江湖榜 · 同代卷 + 单枚假 chip」那行随第册一批③撤除，
     * `prodigy.board.title` 键同批删除（全库唯一读点就是这一行，留着就是 A2 缺键红）。 */
    var h = '';
    /* 寻仇链在案（第卌四批）：有仇挂着就常驻一行——玩家该知道自己欠着谁、下一轮什么时候到。
     * 读数全取引擎那份单槽 ws.revenge（一槽一仇，不是容器 ⇒ 这行不会随名录变长） */
    if (w.revenge) {
      var rvLeft = (w.revenge.nextAt || 0) - Date.now();
      /* B16-r：寻仇链按设计稿改 .warstrip（朱砂小标 + 敌手/环数/余时） */
      h += '<div class="warstrip"><span class="w-t">' + c.esc(c.t('prodigy.ambush.chain.title')) + '</span>' +
        '<span class="w-v">' + c.esc(c.t('prodigy.ambush.chain.n', { n: w.revenge.n || 0 })) + ' · ' +
        c.esc(w.revenge.foe || '') + (rvLeft > 0 ? ' · ' + c.esc(c.t('prodigy.ambush.chain.cd', { t: c.timeLeft(rvLeft) })) : '') +
        '</span></div>';
    }
    /* 第册一批③：原「相识名录为空 ⇒ 只显一行提示」的早退**删除**——四榜席位由名录实时补位，
     * 榜面恒有四十个名字，「榜上无名」这一态在新口径下不存在了（走查 AT10 抓到这条：
     * 早退把新建角色的江湖榜整页压成一行字）。词表 `prodigy.board.empty` 同批下线。 */
    /* 榜面数据源（第册一批③）：引擎 `board4` 一次装配四榜（相识者 + 名录背景席位 + 隐世三席 + 玩家行），
     * 原「10 游戏年冻结快照」那条读点撤下——快照里只有相识者与玩家，装不出「每榜十人」，
     * 而榜本就是纯派生（读三次全等），留一份快照只是第二个口径（refresh 节律仍管战力重排播报）。 */
    var boards = SQ.Prodigy.board4(w, p, d, m);
    var cur = jbChipOf(c), bb = boards[cur];
    h = '<div class="chips chipsrow jbchips">' + [0, 1, 2, 3].map(function (b) {
      return '<button type="button" class="' + (b === cur ? 'on' : '') + '" data-act="jbChip" data-v="' + b + '">' +
        c.esc(c.t('jianghu.band.' + b)) + '</button>';
    }).join('') + '</div>' + h;
    var myRank = bb.myRank;          /* 名次由引擎 board4 一并给出（视图不再数第二遍 ⇒ 无第二口径） */
    /* 玩家只在一个榜上有名次：看别的榜时那一格**不渲染**（早版在此显「第 0 位」，是截图目检抓到的谎）；
     * 右侧节律行改口成「名次播报每 N 游戏年一次」——榜面本身已是实时装配，再说「榜每 10 年一刷」
     * 就与「跨带即时换榜、出榜即时递补」两条播报互相打脸（那两条走的是同一枚 RANK_REFRESH_MS 之外的即时路径）。 */
    /* UI v2 B8：自己的名次条置顶（大号名次 + 名次播报周期）；本榜无名次时不写「第 0 位」 */
    h += '<div class="selfrank' + (myRank > 0 ? '' : ' off') + '">' +
      '<span class="rankno">' + (myRank > 0 ? myRank : '·') + '</span>' +
      '<span class="sr-n">' + c.esc(myRank > 0
        ? c.t('prodigy.board.myrank', { band: c.t('jianghu.band.' + cur), n: myRank })
        : c.t('prodigy.board.norank')) + '</span>' +
      '<span class="hint sr-x">' + c.esc(c.t('prodigy.board.refresh', { y: Math.round((d.PRODIGY.RANK_REFRESH_MS) / 360000) })) + '</span></div>';
    bb.rows.forEach(function (r, rank) {
      if (r === null) { h += '<p class="hint" style="text-align:center;margin:2px 0">⋯</p>'; return; }
      var isMe = !!r.me;
      var pr = (isMe || r.hid || !r.known) ? null : SQ.Prodigy.byId(w, r.pid);
      /* 只跳「名录也认不出、又不是相识者」的脏背景席位；相识者即使没有 rid（**旧档的 prN 行**）
       * 也必须照旧渲染——早版这里写成「无 rid 即跳」，把老档的整条天骄行静默吞掉了
       * （走查 verify-ui-ambush D1 当场抓到：榜面 12 行只出 10 行、prodDetail 钮零颗）。 */
      if (!isMe && !r.known && !r.rid) return;
      var jp = r.rid ? SQ.Jianghu.of(p, r.rid) : null;
      var nm = isMe ? c.t('prodigy.board.me') : (r.hid ? c.t('jianghu.q')
        : (jp ? jp.nm : (pr ? SQ.Prodigy.nameOf(w, pr, p) : c.t('jianghu.q'))));
      /* 善恶符号：相识者取存档行 `al`，背景席位取名录 `al` 串（同一套三档，不另立口径） */
      var align = isMe || r.hid ? null : (pr ? pr.al : ['right', 'neutral', 'evil'].indexOf((jp || {}).al));
      var relTxt = '';
      if (r.hid) relTxt = ' <span class="tierbadge t4">' + c.esc(c.t('jianghu.hid.tag')) + '</span>';
      else if (!isMe && !pr) relTxt = ' <span class="hint">' + c.esc(c.t('jianghu.stranger')) + '</span>';
      else if (!isMe) {
        if (pr.feud) relTxt = '<span class="bad">' + c.esc(c.t('prodigy.rel.feud')) + '</span>';
        else {
          var aff = (w.bonds || {})[pr.id] || 0;
          if (aff >= 1) relTxt = c.esc(c.t('prodigy.rel.friend')) + ' ' + aff;
        }
        if (pr.eternal) relTxt += ' <span class="tierbadge t4">' + c.esc(c.t('prodigy.detail.eternal')) + '</span>';
        if (pr.boost) relTxt += ' <span class="tierbadge t2">' + c.esc(c.t('prodigy.detail.boost')) + '</span>';
        if (srvSet[pr.id]) relTxt += ' <span class="tierbadge t3">' + c.esc(c.t('prodigy.detail.serving')) + '</span>';
      }
      /* 玩家跌出十席时榜尾那一行显**真实名次**（`bb.myRank`），不是尾行的行号（旧榜面同一条口径） */
      h += '<div class="lrow' + (isMe ? ' cur' : '') + '"><div class="nm"><span class="rankno">' + (isMe ? myRank : rank + 1) + '.</span> ' +
        (isMe ? '<b>' + c.esc(nm) + '</b>'
          : (pr ? '<button class="linkbtn" data-act="prodDetail" data-v="' + r.pid + '">' + c.esc(nm) + '</button>' : c.esc(nm))) +
        (jp && jp.ti && !r.hid && !isMe ? ' <span class="hint">' + c.esc(jp.ti) + '</span>' : '') +
        (align != null && align >= 0 ? ' <span class="align-sym align-' + ['right', 'neutral', 'evil'][align] + '">' + c.esc(c.t('align.sym.' + ['right', 'neutral', 'evil'][align])) + '</span>' : '') +
        /* 三档徽标（可压 / 相当 / 悬殊）取代战力数字：档位由引擎按切磋表值算好送来，视图零判定；
         * 玩家自己与隐世三席不给（前者无对手可言，后者按裁定 2 一切明细都是问号） */
        (isMe || r.hid ? '' : ' <span class="tierbadge ' + ['t1', 't2', 't4'][r.lv] + '">' + c.esc(c.t('jianghu.lv.' + r.lv)) + '</span>') +
        ' ' + relTxt + '</div>' +
        '<div class="meta">' + c.esc(jbFive(c, r).join(' · ')) + '</div></div>';
      if (!isMe && pr && c.ui.prodOpen === r.pid) {
        var cdLeft = pr.lastSparAt + (d.PRODIGY.SPAR_CD_MS || 600000) - Date.now();
        /* 强弱差让展示（切磋平衡批 §5.3 v2）：ratio = 浮动前真战力比——信息全透明正典纪律 */
        var pdD = d.PRODIGY || {}, hcD = pdD.HANDICAP || {};
        var myPD = SQ.Mods.powerOf(w, p, d, m);
        var q0D = SQ.Prodigy.powerOf(w, pr, d, p);
        var ratioD = q0D > 0 ? myPD / q0D : 999;
        var crushD = ratioD >= (hcD.crush != null ? hcD.crush : 1.5);
        var braveD = !crushD && ratioD <= (hcD.brave != null ? hcD.brave : 0.8);
        var hcKey = crushD ? 'crush' : (braveD ? 'brave' : 'even');
        h += '<div class="detailbox">' +
          '<div class="kv"><span>' + c.esc(c.t('prodigy.detail.faction')) + '</span><span>' + c.esc(SQ.Prodigy.factionNameOf(w, pr, p)) + '</span></div>' +
          /* N20 接线：关系档此前只在榜行露出（relTxt），详情面整行缺席；正典 = 天骄卷 line128 详情页列「关系档与好感」 */
          (relTxt ? '<div class="kv"><span>' + c.esc(c.t('prodigy.detail.rel')) + '</span><span>' + relTxt + '</span></div>' : '') +
          '<div class="kv"><span>' + c.esc(c.t('prodigy.detail.apt')) + '</span><span>' + c.esc(c.t('prodigy.apt.' + pr.apt)) + '</span></div>' +
          '<div class="kv"><span>' + c.esc(c.t('prodigy.detail.talent')) + '</span><span>' +
          (pr.tl || []).map(function (tid) { return c.esc(c.t('talent.' + tid + '.name')); }).join(' · ') + '</span></div>' +
          '<div class="kv"><span>' + c.esc(c.t('prodigy.detail.wl', { w: pr.wl[0], l: pr.wl[1], d: pr.wl[2] })) + '</span>' +
          '<span>' + c.esc(c.t('prodigy.detail.bond', { n: (w.bonds || {})[pr.id] || 0 })) + '</span></div>' +
          (pr.feud ? '<div class="kv"><span class="bad">' + c.esc(c.t('prodigy.detail.feudstate')) + '</span></div>' : '') +
          '<div class="kv"><span>' + c.esc(c.t('prodigy.spar.vs', { a: SQ.fmt(myPD), b: SQ.fmt(q0D) })) + '</span>' +
          '<span class="tierbadge ' + (crushD ? 't1' : (braveD ? 't4' : 't2')) + '">' + c.esc(c.t('prodigy.spar.handicap.' + hcKey)) + '</span></div>' +
          '<div class="meta hint">' + c.esc(c.t('prodigy.spar.handicap.' + hcKey + '.hint')) + '</div>';
        if (cdLeft > 0) {
          h += '<button disabled style="width:100%;margin-top:6px">' + c.esc(c.t('prodigy.spar.cd', { t: c.timeLeft(cdLeft) })) + '</button>';
        } else {
          h += '<div class="acts" style="margin-top:6px">' + ['light', 'std', 'heavy'].map(function (kd) {
            var stk = SQ.Prodigy.sparStake(w, d, kd);
            return '<button data-act="sparProd" data-v="' + pr.id + '" data-c="' + kd + '"' +
              (w.stones < stk ? ' disabled' : '') + '>' +
              c.esc(c.t('prodigy.spar.kind.' + kd) + ' ' + SQ.fmt(stk)) + '</button>';
          }).join('') + '</div>' +
          '<div class="meta hint">' +
          c.esc(c.t('prodigy.spar.matp', { p: Math.round((braveD ? (hcD.braveMatP != null ? hcD.braveMatP : 0.15) : (pdD.SPAR_MAT_P || 0.10)) * 100) })) +
          ' · ' + c.esc(c.t('prodigy.spar.feudp', { p: Math.round((pdD.SPAR_FEUD_P || 0.30) * 100) })) +
          '/' + c.esc(c.t('prodigy.spar.kind.heavy')) + ' ' + Math.round((pdD.SPAR_FEUD_P_HEAVY || 0.40) * 100) + '%</div>';
        }
        /* 袭杀（第卌四批 · 天骄卷 §五B · 数值详设 §6.1B）：与切磋并排的另一只手——
         * 门槛硬得多（须压过对方 ×KILL_RATIO 才可能成）、代价写在明处（道伤 + 善恶 −），
         * 满 KILL_MAX 次此人出榜并招其族寻仇。冷却 = 全局一枚 ws.ambushKillAt（按人记会随名录长档）。 */
        var A44 = d.AMBUSH || {};
        var ambCd = Math.max(0, (w.ambushKillAt || 0) - Date.now());
        var ambN = pr.amb || 0;
        var ambMax = A44.KILL_MAX != null ? A44.KILL_MAX : 3;
        var ambRatio = A44.KILL_RATIO != null ? A44.KILL_RATIO : 1.2;
        var ambDao = A44.KILL_DAO != null ? A44.KILL_DAO : 1;
        var ambKd = Math.abs(A44.KILL_KARMA != null ? A44.KILL_KARMA : -18);
        var ambLoot = SQ.Prodigy.sparStake(w, d, 'heavy');
        h += '<div class="kv"><span>' + c.esc(c.t('prodigy.ambush.title')) + '</span><span>' +
          c.esc(c.t('prodigy.ambush.why', { r: ambRatio, dao: ambDao, k: ambKd })) + '</span></div>' +
          '<div class="kv"><span>' + c.esc(c.t('prodigy.ambush.count', { n: ambN, max: ambMax })) + '</span><span>' +
          c.esc(c.t('prodigy.ambush.loot', { cur: c.t('resource.currency'), n: SQ.fmt(ambLoot) })) + '</span></div>';
        h += ambCd > 0
          ? '<button disabled style="width:100%;margin-top:6px">' + c.esc(c.t('prodigy.ambush.cd', { t: c.timeLeft(ambCd) })) + '</button>'
          : '<div class="acts" style="margin-top:6px"><button data-act="ambushProd" data-v="' + pr.id + '">' +
            c.esc(c.t('prodigy.ambush.btn')) + '</button></div>';
        h += '</div>';
      }
    });
    /* B16-r：榜面说明按设计稿落页尾（原先夹在 chip 与名次条之间） */
    h += '<p class="hint" style="margin-top:12px">' + c.esc(c.t('prodigy.board.hint')) + '</p>';
    c.$('tab-prodigy').innerHTML = h;
  }

  /* act「jbChip」分支体（随本片搬出，分派处留一行调用）*/
  function actChip(c, v) {
        c.ui.jhb = (v === '1' || v === '2' || v === '3') ? (+v) : 0;
          c.ui.prodOpen = null;
          var jbB = document.querySelector('.tabbody');
          if (jbB) jbB.scrollTop = 0;
          render(c);
          
    }

  /* act「sparProd」分支体（随本片搬出，分派处留一行调用）*/
  function actSpar(c, v, kd) {
        var kdS = kd || 'std';                       /* 三档赌注（data-c 透传，exchangeShard 先例） */
          var prS = SQ.Prodigy.byId(c.w, v);
          var nmS = prS ? SQ.Prodigy.nameOf(c.w, prS, c.p) : '';
          var dS = c.d, pdS = dS.PRODIGY || {}, hcS = pdS.HANDICAP || {};
          var myPS = SQ.Mods.powerOf(c.w, c.p, dS, c.mods);
          var q0S = prS ? SQ.Prodigy.powerOf(c.w, prS, dS, c.p) : 0;
          var ratioS = q0S > 0 ? myPS / q0S : 999;
          var crushS = ratioS >= (hcS.crush != null ? hcS.crush : 1.5);
          var braveS = !crushS && ratioS <= (hcS.brave != null ? hcS.brave : 0.8);
          var stakeS = SQ.Prodigy.sparStake(c.w, dS, kdS);
          var retS = Math.round(stakeS * (crushS ? (hcS.crushRet != null ? hcS.crushRet : 1.5) : (braveS ? (hcS.braveRet != null ? hcS.braveRet : 3) : 2)));
          var hcapS = c.t('prodigy.spar.handicap.' + (crushS ? 'crush' : (braveS ? 'brave' : 'even')));
          var fpS = kdS === 'heavy' ? (pdS.SPAR_FEUD_P_HEAVY || 0.40) : (pdS.SPAR_FEUD_P || 0.30);
          var mpS = braveS ? (hcS.braveMatP != null ? hcS.braveMatP : 0.15) : (pdS.SPAR_MAT_P || 0.10);
          c.ask(c.t('prodigy.spar.title'), c.t('prodigy.spar.confirm2', {
            name: nmS, handicap: hcapS, n: SQ.fmt(stakeS), ret: SQ.fmt(retS),
            cur: c.t('resource.currency'), fp: Math.round(fpS * 100), mp: Math.round(mpS * 100)
          }), async function () {
            var rSp = await SQ.Actions.prodigySpar(c.s, v, kdS);
            if (rSp && rSp.ok) {
              c.toast(c.t('prodigy.log.spar.' + rSp.result, { name: nmS, n: SQ.fmt(rSp.stake), cur: c.t('resource.currency') }));
              if (rSp.mat) c.toast(c.t('prodigy.log.spar.mat', { mat: c.t('alchemy.mat.' + rSp.mat + '.name') }));
            }
            else if (rSp && rSp.reason === 'cd') c.toast(c.t('prodigy.spar.cd', { t: c.timeLeft(rSp.until - Date.now()) }));
            else if (rSp && rSp.reason === 'poor') c.toast(c.t('prodigy.spar.poor'));
            else if (rSp && rSp.reason === 'locked') c.toast(c.t('prodigy.spar.locked'));
            c.renderAll();
          });
          
    }

  /* act「ambushProd」分支体（随本片搬出，分派处留一行调用）*/
  function actAmbush(c, v) {
        /* 袭杀确认（第卌四批 · 天骄卷 §五B）：五项要素全透明——门槛倍率 / 夺资额 / 败的道伤 / 损的善恶 /
           * 满次数后必来的寻仇。引擎返回值只认 reason 白名单（N33 那条：兜底键复用会让文案说谎）。 */
          var wA = c.w, dA = c.d, AA = dA.AMBUSH || {};
          var prA = SQ.Prodigy.byId(wA, v);
          var nmA = prA ? SQ.Prodigy.nameOf(wA, prA, c.p) : '';
          c.ask(c.t('prodigy.ambush.title'), c.t('prodigy.ambush.confirm', {
            name: nmA, r: (AA.KILL_RATIO != null ? AA.KILL_RATIO : 1.2),
            dao: (AA.KILL_DAO != null ? AA.KILL_DAO : 1), k: Math.abs(AA.KILL_KARMA != null ? AA.KILL_KARMA : -18),
            max: (AA.KILL_MAX != null ? AA.KILL_MAX : 3), n: prA ? (prA.amb || 0) : 0,
            cur: c.t('resource.currency'), loot: SQ.fmt(SQ.Prodigy.sparStake(wA, dA, 'heavy'))
          }), async function () {
            var rA = await SQ.Actions.prodigyAmbush(c.s, v);
            if (rA && rA.ok) {
              /* 引擎刚把这一行写进日志，界面把**同一个 key** 拿去 toast（切磋同纪律，不另抄措辞） */
              c.toast(c.t(rA.win ? 'prodigy.log.ambush' : 'prodigy.log.ambushfail', {
                name: nmA, cur: c.t('resource.currency'), loot: SQ.fmt(rA.loot || 0), n: rA.count || 0,
                max: rA.max || (AA.KILL_MAX != null ? AA.KILL_MAX : 3),
                dao: (AA.KILL_DAO != null ? AA.KILL_DAO : 1)
              }));
              if (rA.dead) c.toast(c.t('prodigy.log.revengearm', { name: nmA }));
            } else if (rA && rA.reason === 'cd') {
              c.toast(c.t('prodigy.spar.cd', { t: c.timeLeft(Math.max(0, (rA.until || 0) - Date.now())) }));
            } else if (rA && rA.reason === 'locked') {
              c.toast(c.t('prodigy.spar.locked'));
            } else if (rA && rA.reason) {
              c.toast(c.t('prodigy.ambush.reject'));
            }
            c.renderAll();
          });
          
    }


  SQ.UI = SQ.UI || {};
  SQ.UI.jianghu = { render: render, actChip: actChip, actSpar: actSpar, actAmbush: actAmbush };
})();
