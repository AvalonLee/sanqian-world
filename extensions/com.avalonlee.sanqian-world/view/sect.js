/* 宗门页（自立门户卷 B6：开宗流程 / 弟子 / 设施 / 战争 / 传位 ‖ 第册五十一批 2026-10-19 从 view/index.html 整片搬出 · N34 第十五刀）
 * 范围 = 单一渲染器 `render`（原 `renderSect`，144 行）；页内九个「宗门域」量全部走引擎公开面（`SQ.Sect.canFound` /
 * `discCap` / `discName` / `discPower` / `discipleMerit` / `foundGates` / `sectPower` / `sectRep`）与 `SQ.Factions.warSideOf`，
 * 件内直取、**零新增桥键**——引擎 API 不是内核闭包私有量，不该进桥。
 * 留内核的两件：`sectPick` 的默认态挂在 `ui`（桥位 `ui` 即活对象，件内直接读写）‖ 开宗 / 收徒 / 传位等动作分支
 * 在全局委托点击处理器里（监听器一律留内核 = 既有纪律），本件只负责把它们需要的读数字符串拼出来。
 * 桥 = `ctx()` 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；本刀**零新增键**：只用 `$` / `t` / `esc` / `w` / `d` / `p` / `mods` / `ui`。
 * ⚠️ 机械改写只当初稿：改写规则不碰注释行；搬完必跑「件内声明名 × 桥读名」对表（D13 判实参形状、D7 判键集）。
 * ⚠️ 原「请为供奉」段用 `function (c)` 拿道友对象，与外置件桥位 `c` 撞名 ⇒ 本刀一律改称 `ch`
 *   （在册硬口径「外置件不许拿 c 当回调形参」；bonds.js 第十二刀踩过同形）。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});
  function render(c) {
    var w = c.w, d = c.d, p = c.p, m = c.mods;
    c.ui.sectPick = c.ui.sectPick || { gate: 'wuyue', align: 'neutral' };
    var h = '<div class="pagehead split"><div class="chips"><button class="on">' + c.esc(c.t('sect.system')) + '</button></div></div>';
    /* B16-ac：已加入固定势力 ⇒ 宗门页 = 该势力的「我的门派」主页（介绍 + 五套日常管理） */
    if (!w.sect && w.factionId && w.factionId !== 'sect' && SQ.UI.faction && SQ.UI.faction.home) {
      SQ.UI.faction.home(c);
      return;
    }
    if (!w.sect) {
      /* 四门槛清单 + 立派三定流程 */
      var chk = SQ.Sect.canFound(w, p, d, c.s.meta);
      /* 四门槛取引擎属主函数的判定（审计 #7）：视图原先自己重写一遍，其中「身份」那条与引擎不同式
       * （有 factionId 时只看 rank，漏了 `|| everDefected`）⇒ 叛离换门的玩家按钮能点、同行却亮红 ✗。
       * 表值也不再抄：FOUND_REALM/FOUND_RANK/FOUND_REP_PEAK 连同各自的兜底字面量一并交回 sect.js。 */
      var g295 = SQ.Sect.foundGates(w, d, c.s.meta);
      var gates = [
        { ok: g295.realm, txt: c.t('sect.ui.gate.realm') },
        { ok: g295.identity, txt: c.t('sect.ui.gate.identity') },
        { ok: g295.peak, txt: c.t('sect.ui.gate.peak', { n: w.factionRepPeak || 0 }) },
        { ok: g295.unlock, txt: c.t('sect.ui.gate.unlock') }
      ];
      /* B16-j · 设计稿 §宗门空态：① `.curzone` 外壳（尚未开宗 + 一句交代 + 未立角标）
       * ② 四门槛改 `.gate` 行（圆标 + 行间细线 + 达成染色）③ 门槛未齐时给置灰的「开宗立派」
       * ④ 页尾补「立派之后」三行——空页也要有期待（设计稿 §sect 第 3 条）。 */
      h += '<div class="curzone"><div class="cz-top"><div>' +
        '<div class="cz-name">' + c.esc(c.t('sect.ui.found.name')) + '</div>' +
        '<div class="cz-meta">' + c.esc(c.t('sect.ui.nofound')) + '</div></div>' +
        '<span class="tag">' + c.esc(c.t('sect.ui.found.tag')) + '</span></div></div>';
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('sect.ui.gates')) + '</span></div>';
      gates.forEach(function (g) {
        h += '<div class="gate' + (g.ok ? ' ok' : '') + '">' +
          '<span class="g-mark">' + (g.ok ? '✓' : '·') + '</span>' +
          '<span class="g-t">' + c.esc(g.txt) + '</span></div>';
      });
      /* 原「已传位」提示写在门槛未齐那一支里不可达（外层已判 `!w.sect`，而 reason 'done' 要求
       * ws.sect.succession）⇒ 第十四批审计 #17 删；传位态由下方 `if (sec.succession)` 正常渲染。 */
      if (!chk.ok) {
        /* 门槛未齐：按钮置灰但不隐藏（设计稿 §sect 第 2 条：达成即亮，预期明确）。
         * 不用 `.primary`——实心底 + disabled 在纸面上会叠成一块浊色，与「不可点」的语义相反。 */
        h += '<button disabled style="width:100%;margin-top:16px">' +
          c.esc(c.t('sect.found.btn')) + '</button>';
      } else {
        h += '<p class="hint" style="margin-top:8px">' + c.esc(c.t('sect.ui.gate.pick')) + '</p><div class="chips">';
        (d.SECT.GATES || []).forEach(function (g) {
          h += '<button class="' + (c.ui.sectPick.gate === g ? 'on' : '') + '" data-act="sectGate" data-v="' + g + '">' + c.esc(c.t('sect.gate.' + g + '.name')) + '</button>';
        });
        h += '</div><p class="hint">' + c.esc(c.t('sect.gate.' + c.ui.sectPick.gate + '.desc')) + '</p>';
        h += '<p class="hint">' + c.esc(c.t('sect.ui.align.pick')) + '</p><div class="chips">';
        ['right', 'neutral', 'evil'].forEach(function (a) {
          h += '<button class="' + (c.ui.sectPick.align === a ? 'on' : '') + '" data-act="sectAlign" data-v="' + a + '">' + c.esc(c.t('sect.align.' + a + '.name')) + '</button>';
        });
        h += '</div><p class="hint">' + c.esc(c.t('sect.align.' + c.ui.sectPick.align + '.rule')) + '</p>';
        h += '<div class="sectnamebox"><input id="sect-name-input" class="tdta" style="min-height:38px" maxlength="6" placeholder="' + c.esc(c.t('sect.ui.name.ph')) + '" value="' + c.esc(c.ui.sectRollName || '') + '"></div>';
        /* N20 接线：正典「掷名可重掷 · 免费无限次」（自立门户卷 §2.2）此前在 UI 完全没有入口，         * sectFound 的 nameIdx 形参一直闲置 ⇒ 补钮并走引擎同一式子（SQ.Sect.rollIdx / nameOfIdx，不抄第二份表名） */
        h += '<button class="linkbtn" data-act="sectRollName" style="margin-top:6px">' + c.esc(c.t('sect.ui.name.roll')) + '</button>';
        h += '<button class="primary" data-act="sectFound" style="width:100%;margin-top:8px">' + c.esc(c.t('sect.found.btn')) + '</button>';
      }
      /* 立派之后：三行预告（门规三定 / 门中供给 / 传位）——开宗前也看得到路 */
      h += '<div class="sechead" style="margin-top:24px"><span class="t">' + c.esc(c.t('sect.ui.after')) + '</span></div>';
      ['rule', 'supply', 'succ'].forEach(function (k) {
        h += '<div class="lrow afrow"><span class="nm">' + c.esc(c.t('sect.ui.after.' + k)) + '</span>' +
          '<span class="meta">' + c.esc(c.t('sect.ui.after.' + k + '.d')) + '</span></div>';
      });
      c.$('tab-sect').innerHTML = h;
      return;
    }
    var sec = w.sect;
    if (sec.succession) {
      h += '<p class="hint">' + c.esc(c.t('sect.ui.succ.done')) + ' · ' + c.esc(sec.name || '') + '</p>';
      c.$('tab-sect').innerHTML = h;
      return;
    }
    /* B16-j · 设计稿 §已开宗：状态条（宗门 · 门规 · 声望 / 战力）+ 四格摘要（战绩 / 设施 / 门规 / 传位） */
    var facN = (d.SECT.FAC_IDS || []).filter(function (f) { return (sec.fac[f] || 0) > 0; }).length;
    h += '<div class="statestrip"><span class="s-k">' + c.esc(c.t('sect.ui.strip.k')) + '</span>' +
      '<span class="s-v">' + c.esc(sec.name) + ' · ' + c.esc(c.t('sect.gate.' + sec.gate + '.name')) +
      ' · ' + c.esc(c.t('sect.align.' + sec.align + '.name')) + '</span>' +
      '<span class="s-x">' + c.esc(c.t('sect.ui.rep', { n: SQ.fmt(SQ.Sect.sectRep(w, d)) })) + ' · ' +
      c.esc(c.t('sect.ui.power', { n: SQ.fmt(SQ.Sect.sectPower(w, p, d, m)) })) + '</span></div>';
    h += '<div class="sum4">' +
      '<div><div class="k">' + c.esc(c.t('sect.ui.sum.rec')) + '</div><div class="v">' +
      c.esc(c.t('sect.ui.war.record', { w: sec.warRecord.wins, l: sec.warRecord.loses })) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('sect.ui.sum.fac')) + '</div><div class="v">' +
      c.esc(c.t('sect.ui.fac.n', { n: facN })) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('sect.ui.sum.rule')) + '</div><div class="v">' +
      c.esc(c.t('sect.gate.' + sec.gate + '.name')) + ' · ' + c.esc(c.t('sect.align.' + sec.align + '.name')) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('sect.ui.sum.succ')) + '</div><div class="v">' +
      c.esc(sec.succession ? c.t('sect.ui.sum.set') : c.t('sect.ui.sum.none')) + '</div></div></div>';
    /* 弟子出力折算战功（N20 接线）保留为一行小字：四格摘要里已没有它的位置，但这笔贡献不能只在引擎里 */
    if (SQ.Sect.discipleMerit(w, p, d) > 0) {
      h += '<p class="hintline">' + c.esc(c.t('sect.war.merit', { n: SQ.fmt(SQ.Sect.discipleMerit(w, p, d)) })) + '</p>';
    }
    /* 弟子 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('sect.ui.disciples', { n: sec.disciples.length, cap: SQ.Sect.discCap(w, d) })) + '</span></div>';
    /* N20 接线：继位择人的规则（供奉不可继位）此前只靠按钮 disabled 隐含，无一句释文 */
    if (sec.disciples.length) h += '<p class="hint">' + c.esc(c.t('sect.ui.succ.pick')) + '</p>';
    if (!sec.disciples.length) h += '<p class="hint">' + c.esc(c.t('sect.disc.empty')) + '</p>';
    sec.disciples.forEach(function (dsc) {
      var nm = SQ.Sect.discName(w, dsc, p);
      var pw = SQ.Sect.discPower(w, p, d, dsc);
      h += '<div class="lrow"><div class="nm">' + c.esc(nm) +
        (dsc.offering ? ' <span class="tierbadge t4">' + c.esc(c.t('sect.disc.offering')) + '</span>' : '') +
        (dsc.tianjiao ? ' <span class="tierbadge t2">' + c.esc(c.t('prodigy.system')) + '</span>' : '') + '</div>' +
        '<div class="meta">' + (dsc.offering ? '' : c.esc(c.t('sect.disc.row', { name: '', apt: c.t('sect.disc.apt.' + dsc.tier), realm: c.t('realm.' + dsc.realm) }) + ' · ')) +
        c.esc(c.t('sect.disc.power', { n: SQ.fmt(pw) })) +
        /* N20 接线：升境进度引擎每月结算（sect.js PROG_NEED 余数结转），视图此前完全不显 */
        (!dsc.offering && (d.SECT.PROG_NEED || [])[dsc.realm] != null ? ' · ' +
          c.esc(c.t('sect.disc.prog', { p: SQ.fmt(Math.floor(dsc.prog || 0)), need: SQ.fmt((d.SECT.PROG_NEED || [])[dsc.realm]) })) : '') +
        '</div>' +
        '<div class="acts">';
      if (!dsc.offering) {
        [0, 1, 2].forEach(function (iv) {
          h += '<button data-act="sectInvest" data-v="' + dsc.id + '" data-c="' + iv + '" class="' + (dsc.inv === iv ? 'primary' : '') + '">' + c.esc(c.t('sect.disc.inv.' + iv)) + '</button>';
        });
      }
      h += '<button data-act="sectDispatch" data-v="' + dsc.id + '">' + c.esc(c.t('sect.ui.dispatch')) + '</button>';
      if (w.realm >= d.REALMS.length - 1) h += '<button data-act="sectSucceed" data-v="' + dsc.id + '"' + (dsc.offering ? ' disabled' : '') + '>' + c.esc(c.t('sect.ui.succ.btn')) + '</button>';
      h += '</div></div>';
    });
    /* 招收 / 供奉 */
    var cand = sec.candidate;
    if (cand) {
      h += '<div class="lrow"><div class="nm">' + c.esc(SQ.Sect.discName(w, { nm: cand.nm, offering: null }, p)) + ' · ' + c.esc(c.t('sect.disc.apt.' + cand.tier)) + '</div>' +
        '<div class="meta">' + c.esc(c.t('sect.disc.candidate', { name: '' })) + '</div>' +
        '<div class="acts"><button class="primary" data-act="sectAccept">' + c.esc(c.t('sect.ui.accept')) + '</button>' +
        '<button data-act="sectReject">' + c.esc(c.t('sect.ui.reject')) + '</button></div></div>';
    } else {
      var rCd = sec.recruitAt > 0 && Date.now() - sec.recruitAt < (d.SECT.RECRUIT_CD_MS);
      h += '<button data-act="sectRecruit"' + (rCd ? ' disabled' : '') + ' style="margin:6px 0">' +
        c.esc(rCd ? c.t('sect.ui.recruit.cd', { t: c.timeLeft(sec.recruitAt + d.SECT.RECRUIT_CD_MS - Date.now()) }) : c.t('sect.disc.recruit')) + '</button>';
    }
    /* 请为供奉（bond ≥70 道友，≤2 名） */
    var offN = sec.disciples.filter(function (x) { return x.offering; }).length;
    if (offN < (d.SECT.OFFER_CAP || 2) && sec.disciples.length < SQ.Sect.discCap(w, d)) {
      var candB = (d.COMPANIONS || []).filter(function (ch) {
        return ((w.bonds || {})[ch.id] || 0) >= (d.SECT.OFFER_BOND || 70) && !sec.disciples.some(function (x) { return x.offering === ch.id; });
      });
      if (candB.length) {
        h += '<div class="chips">';
        candB.forEach(function (ch) {
          h += '<button data-act="sectOffer" data-v="' + ch.id + '">' + c.esc(c.t('sect.disc.offer.btn')) + ' · ' + c.esc(c.t('bond.' + ch.id + '.name')) + '</button>';
        });
        h += '</div><p class="hint">' + c.esc(c.t('sect.disc.offer.need')) + '</p>';
      }
    }
    /* 四设施 */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('sect.ui.facs')) + '</span></div>';
    (d.SECT.FAC_IDS || []).forEach(function (fid) {
      var lv = sec.fac[fid] || 0;
      var maxed = lv >= (d.SECT.FAC_MAX || 5);
      var cost = maxed ? 0 : (d.SECT.FAC_COST || [])[lv];
      h += '<div class="lrow"><div class="nm">' + c.esc(c.t('sect.fac.' + fid + '.name')) + ' <span class="hint">' + c.esc(c.t('sect.fac.lv', { lv: lv })) + '</span></div>' +
        '<div class="meta">' + c.esc(c.t('sect.fac.' + fid + '.desc')) + (fid === 'danfang'
          ? (lv < 1 ? ' · ' + c.esc(c.t('sect.fac.danfang.pending'))
            : ' · ' + c.esc(c.t('sect.fac.danfang.mat', { m: ((d.ALCHEMY || {}).TRIBUTE || {}).FAC_MONTHS || 30 })))
          : '') + '</div>' +
        '<div class="acts"><button data-act="sectBuild" data-v="' + fid + '"' + ((maxed || w.stones < cost) ? ' disabled' : '') + '>' +
        c.esc(maxed ? c.t('sect.fac.max') : c.t('sect.fac.cost', { n: SQ.fmt(cost) })) + '</button></div></div>';
    });
    /* 战争：对敌下战书；进行中战争走既有应战入口（势力页/传闻卡同源） */
    var sectEntry = null;
    (w.factions || []).forEach(function (f) { if (f.id === 'sect') sectEntry = f; });
    if (sectEntry && !w.factionWar) {
      var enemies = (w.factions || []).filter(function (f) { return f.id !== 'sect' && (sectEntry.rel || {})[f.id] === 'enemy'; });
      if (enemies.length) {
        h += '<div class="sechead"><span class="t">' + c.esc(c.t('sect.war.btn')) + '</span></div><div class="chips">';
        var dCd = (sec.declareAt || 0) > 0 && Date.now() - sec.declareAt < (d.SECT.WAR_DECLARE_CD_MS);
        enemies.forEach(function (f) {
          h += '<button data-act="sectWar" data-v="' + f.id + '"' + (dCd ? ' disabled' : '') + '>' + c.esc(f.name) + '</button>';
        });
        h += '</div>';
      }
    }
    if (w.factionWar && SQ.Factions.warSideOf(w)) {
      h += '<p class="hint" style="margin-top:8px">' + c.esc(c.t('sect.war.guard')) + ' → ' + c.esc(c.t('rumor.war.go')) + '</p>';
    }
    c.$('tab-sect').innerHTML = h;
  }
  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.sect = { render: render };
})();
