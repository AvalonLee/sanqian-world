/* 成就页渲染器（第册五批 2026-10-17 从 view/index.html 内联块整段搬出 · 正典 = UI 卷 §3.4b）
 * 60 条行为成就按六组卡片化：已解锁显名/条件/遗泽 + 已达成标；未解锁遮为问号；
 * data 标 hint 的特殊成就提示达成条件。图鉴九面卡与称号墙自轮回页迁入本页。
 * 桥 = 内核 ctx() 递进来的那一枚 `c`（键集由审计 **D7** 与 ctx 工厂逐键对账，不许自取内核私有量）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function achvCard(c, a, has) {
    var h = '<div class="achvcard ' + (has ? 'got' : 'lock') + '">' +
      '<div class="ah"><span class="an">' +
      c.esc(has ? c.t('codex.achv.' + a.id + '.name') : c.t('codex.ui.silhouette')) +
      '</span><span class="ak">' + c.esc(c.t('codex.ui.achv.reward', { k: a.karma })) + '</span></div>';
    if (has) {
      h += '<div class="ad">' + c.esc(c.t('codex.achv.' + a.id + '.desc')) + '</div>' +
        '<div class="amark">' + c.esc(c.t('achv.ui.got')) + '</div>';
    } else if (a.hint) {
      h += '<div class="aq">' + c.esc(c.t('achv.ui.q')) + '</div>' +
        '<div class="ahint">' + c.esc(c.t('codex.ui.achv.hint', { t: c.t('codex.achv.' + a.id + '.desc') })) + '</div>';
    } else {
      h += '<div class="aq">' + c.esc(c.t('achv.ui.q')) + '</div>';
    }
    return h + '</div>';
  }

  /* 图鉴九面卡（收集率进度条 + 里程碑点）——自轮回页迁入成就页顶，与行为成就同页成「图鉴 + 成就」双区 */
  function codexFaceCard(c, face, meta, p, d) {
    var den = SQ.Codex.faceDenom(face, p, d);
    var got = SQ.Codex.faceCount(meta, face);
    var marks = SQ.Codex.msMarks(d);          /* 档位与分母一律走引擎单源（改 MS_PCT 即改屏）*/
    var msDone = 0;
    if (face === 'title') {
      (d.CODEX.TITLE_MS || []).forEach(function (th) { if (got >= th) msDone++; });
    } else {
      marks.forEach(function (pc) { if ((meta.earnedKeys || {})['codex.ms.' + face + '.' + pc] != null) msDone++; });
    }
    /* 称号面无百分比分母（绝对数阶梯）：只报枚数，杜绝「22/—」 */
    var cnt = face === 'title' ? c.t('codex.ui.collected.n', { n: got }) : c.t('codex.ui.collected', { n: got, total: den });
    var pct = face === 'title' || !den ? 0 : Math.min(100, got / den * 100);
    var h = '<div class="facecard"><div class="ch"><span class="cn">' + c.esc(c.t('codex.face.' + face)) + '</span>' +
      '<span class="cc">' + c.esc(cnt) + '</span></div>';
    if (face !== 'title') h += '<div class="bar slim"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
    h += '<div class="cfoot"><span class="cms">' + c.esc(msDone >= marks.length ? c.t('codex.ui.ms.all') : c.t('codex.ui.ms', { done: msDone })) + '</span>' +
      '<span class="msdots">' + marks.map(function (_m, i) { return '<i' + (i < msDone ? ' class="on"' : '') + '></i>'; }).join('') + '</span></div>';
    /* N20 接线：下一档阈值（正典 = UI 卷 v2.26 §3.7「取里程碑档表里第一个未达者」；称号面无分母、档数齐、den 缺失都不出） */
    var nextMsD = (face === 'title' || !den || pct >= 100) ? 0 : (marks.filter(function (pc) { return pct < pc; })[0] || 0);
    if (nextMsD) h += '<div class="csub">' + c.esc(c.t('codex.ui.ms.next', { pct: nextMsD })) + '</div>';
    if (face === 'zone') {
      h += '<div class="csub">' + c.esc(c.t('codex.ui.zone.layer', {
        a: SQ.Codex.faceCount(meta, 'zone', 'z'), b: SQ.Codex.faceCount(meta, 'zone', 'b'), c: SQ.Codex.faceCount(meta, 'zone', 'a')
      })) + '</div>';
    }
    return h + '</div>';
  }

  function render(c) {
    var d = c.d, meta = (c.s && c.s.meta) || {}, p = c.p;
    var got = {};
    (meta.achv || []).forEach(function (id) { got[id] = 1; });
    var h = '<div class="pagehead"><span class="tdtitle">' + c.esc(c.t('codex.ui.achv.done', { n: (meta.achv || []).length })) + '</span></div>';
    /* 三格摘要（B15-h · 设计稿 .sum3）：已得 / 遗泽 / 九面在录 —— 三个数都取存档现算，不写死 */
    var facesAll = (d.CODEX.FACES || []);
    var faceIn = facesAll.filter(function (f) { return SQ.Codex.faceCount(meta, f) > 0; }).length;
    h += '<div class="sum3">' +
      '<div><div class="k">' + c.esc(c.t('achv.ui.sum.got')) + '</div><div class="v">' +
      c.esc(c.t('codex.ui.collected', { n: (meta.achv || []).length, total: (d.CODEX.ACHV || []).length })) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('achv.ui.sum.karma')) + '</div><div class="v">' + SQ.fmt(meta.karma || 0) + '</div></div>' +
      '<div><div class="k">' + c.esc(c.t('achv.ui.sum.faces')) + '</div><div class="v">' +
      c.esc(c.t('achv.ui.sum.facesv', { n: faceIn, total: facesAll.length })) + '</div></div></div>';
    /* 图鉴九面（自轮回页迁入）：收集率 + 里程碑，卡片网格置顶 */
    /* B16-k：段标统一走 `.sechead`——`.secbar` 一族已在 B16-d 退役（CSS 删了，旧写法的段标会裸成一行文字） */
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('codex.system')) + '</span>' +
      '<span class="s">' + c.esc(c.t('codex.ui.codexnote')) + '</span></div>';
    h += '<div class="facegrid">';
    (d.CODEX.FACES || []).forEach(function (face) { h += codexFaceCard(c, face, meta, p, d); });
    /* 转世天赋子区（epic 专属池 · 只发遗泽不发 qiRate）——分母与档位同读引擎单源，不写死 8 与三档 */
    var nL = SQ.Codex.faceCount(meta, 'talentLegacy');
    var capL = Math.max(1, SQ.Codex.legacyCap(d));
    var marksL = SQ.Codex.msMarks(d);
    var msL = 0;
    marksL.forEach(function (pc) { if ((meta.earnedKeys || {})['codex.ms.talentLegacy.' + pc] != null) msL++; });
    h += '<div class="facecard"><div class="ch"><span class="cn">' + c.esc(c.t('codex.ui.face.talentLegacy')) + '</span>' +
      '<span class="cc">' + c.esc(c.t('codex.ui.collected', { n: nL, total: capL })) + '</span></div>' +
      '<div class="bar slim"><i style="width:' + (nL / capL * 100).toFixed(1) + '%"></i></div>' +
      '<div class="cfoot"><span class="cms">' + c.esc(c.t('codex.ui.ms', { done: msL })) + '</span>' +
      '<span class="msdots">' + marksL.map(function (_m, i) { return '<i' + (i < msL ? ' class="on"' : '') + '></i>'; }).join('') + '</span></div></div>';
    h += '</div>';
    /* 称号墙（自轮回页迁入）：已录称号 chips */
    if ((meta.titles || []).length) {
      h += '<div class="sechead"><span class="t">' + c.esc(c.t('codex.ui.titles')) + ' · ' + (meta.titles || []).length + '</span></div>';
      h += '<div class="chips">' + (meta.titles || []).map(function (id) {
        return '<span class="tdtitle">' + c.esc(c.t('codex.title.' + id)) + '</span>';
      }).join('') + '</div>';
    }
    /* 行为成就（B16-k · 设计稿 §成就）：六组 chips（带各组 n/total）+ **单网格**只渲染选中组。
     * 原先是六段各铺一张网格 ⇒ 一屏滚不完、也看不出「这一组还差几条」。chips 单选、纯 UI 态
     * （`ui.achvGroup`，不落盘），默认第一组。 */
    var byG = {};
    (d.CODEX.ACHV || []).forEach(function (a) { (byG[a.g] = byG[a.g] || []).push(a); });
    var gOrder = ['xiu', 'jie', 'chen', 'men', 'mi', 'ni'].filter(function (g) { return (byG[g] || []).length; });
    var curG = gOrder.indexOf(c.ui.achvGroup) >= 0 ? c.ui.achvGroup : gOrder[0];
    var allN = (meta.achv || []).length;
    h += '<div class="sechead"><span class="t">' + c.esc(c.t('achv.ui.behavior')) + '</span>' +
      '<span class="s">' + c.esc(c.t('codex.ui.collected', { n: allN, total: (d.CODEX.ACHV || []).length })) + '</span></div>';
    h += '<div class="chips achvchips">' + gOrder.map(function (g) {
      var list = byG[g] || [];
      var n = list.filter(function (a) { return got[a.id]; }).length;
      return '<button class="' + (curG === g ? 'on' : '') + '" data-act="achvGroup" data-v="' + g + '">' +
        c.esc(c.t('codex.achv.group.' + g)) + ' ' + c.esc(c.t('achv.ui.gcount', { n: n, total: list.length })) + '</button>';
    }).join('') + '</div>';
    h += '<div class="achvgrid">' + (byG[curG] || []).map(function (a) { return achvCard(c, a, !!got[a.id]); }).join('') + '</div>';
    c.$('tab-achv').innerHTML = h;
  }

  SQ.UI = SQ.UI || {};                    /* 视图件命名空间（与 SQ.UI.updateNote 同一家族） */
  SQ.UI.achv = { render: render };
})();
