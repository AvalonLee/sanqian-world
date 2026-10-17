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
    var msDone = 0;
    if (face === 'title') {
      (d.CODEX.TITLE_MS || []).forEach(function (th) { if (got >= th) msDone++; });
    } else {
      [50, 80, 100].forEach(function (pc) { if ((meta.earnedKeys || {})['codex.ms.' + face + '.' + pc] != null) msDone++; });
    }
    /* 称号面无百分比分母（绝对数阶梯）：只报枚数，杜绝「22/—」 */
    var cnt = face === 'title' ? c.t('codex.ui.collected.n', { n: got }) : c.t('codex.ui.collected', { n: got, total: den });
    var pct = face === 'title' || !den ? 0 : Math.min(100, got / den * 100);
    var h = '<div class="facecard"><div class="ch"><span class="cn">' + c.esc(c.t('codex.face.' + face)) + '</span>' +
      '<span class="cc">' + c.esc(cnt) + '</span></div>';
    if (face !== 'title') h += '<div class="bar slim"><i style="width:' + pct.toFixed(1) + '%"></i></div>';
    h += '<div class="cfoot"><span class="cms">' + c.esc(msDone >= 3 ? c.t('codex.ui.ms.all') : c.t('codex.ui.ms', { done: msDone })) + '</span>' +
      '<span class="msdots">' + [0, 1, 2].map(function (i) { return '<i' + (i < msDone ? ' class="on"' : '') + '></i>'; }).join('') + '</span></div>';
    /* N20 接线：下一档阈值（正典 = UI 卷 v2.26 §3.7「取 [50,80,100] 中第一个未达者」；称号面无分母、三档齐、den 缺失都不出） */
    var nextMsD = (face === 'title' || !den || pct >= 100) ? 0 : ([50, 80, 100].filter(function (pc) { return pct < pc; })[0] || 0);
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
    var h = '<div class="pagehead split"><div class="chips"><button class="on">' + c.esc(c.t('achv.system')) + '</button></div>' +
      '<span class="tdtitle">' + c.esc(c.t('codex.ui.achv.done', { n: (meta.achv || []).length })) + '</span></div>';
    /* 图鉴九面（自轮回页迁入）：收集率 + 里程碑，卡片网格置顶 */
    h += '<div class="secbar"><span>' + c.esc(c.t('codex.system')) + '</span>' +
      '<span class="secnote">' + c.esc(c.t('codex.ui.codexnote')) + '</span></div>';
    h += '<div class="facegrid">';
    (d.CODEX.FACES || []).forEach(function (face) { h += codexFaceCard(c, face, meta, p, d); });
    /* 转世天赋子区（epic 专属池 8 格 · 只发遗泽不发 qiRate） */
    var nL = SQ.Codex.faceCount(meta, 'talentLegacy');
    var msL = 0;
    [50, 80, 100].forEach(function (pc) { if ((meta.earnedKeys || {})['codex.ms.talentLegacy.' + pc] != null) msL++; });
    h += '<div class="facecard"><div class="ch"><span class="cn">' + c.esc(c.t('codex.ui.face.talentLegacy')) + '</span>' +
      '<span class="cc">' + c.esc(c.t('codex.ui.collected', { n: nL, total: 8 })) + '</span></div>' +
      '<div class="bar slim"><i style="width:' + (nL / 8 * 100).toFixed(1) + '%"></i></div>' +
      '<div class="cfoot"><span class="cms">' + c.esc(c.t('codex.ui.ms', { done: msL })) + '</span>' +
      '<span class="msdots">' + [0, 1, 2].map(function (i) { return '<i' + (i < msL ? ' class="on"' : '') + '></i>'; }).join('') + '</span></div></div>';
    h += '</div>';
    /* 称号墙（自轮回页迁入）：已录称号 chips */
    if ((meta.titles || []).length) {
      h += '<div class="secbar"><span>' + c.esc(c.t('codex.ui.titles')) + ' · ' + (meta.titles || []).length + '</span></div>';
      h += '<div class="chips">' + (meta.titles || []).map(function (id) {
        return '<span class="tdtitle">' + c.esc(c.t('codex.title.' + id)) + '</span>';
      }).join('') + '</div>';
    }
    /* 行为成就六组 */
    var byG = {};
    (d.CODEX.ACHV || []).forEach(function (a) { (byG[a.g] = byG[a.g] || []).push(a); });
    ['xiu', 'jie', 'chen', 'men', 'mi', 'ni'].forEach(function (g) {
      var list = byG[g] || [];
      if (!list.length) return;
      var n = list.filter(function (a) { return got[a.id]; }).length;
      h += '<div class="secbar"><span>' + c.esc(c.t('codex.achv.group.' + g)) + '</span>' +
        '<span class="secnote">' + c.esc(c.t('achv.ui.gcount', { n: n, total: list.length })) + '</span></div>' +
        '<div class="achvgrid">' + list.map(function (a) { return achvCard(c, a, !!got[a.id]); }).join('') + '</div>';
    });
    c.$('tab-achv').innerHTML = h;
  }

  SQ.UI = SQ.UI || {};                    /* 视图件命名空间（与 SQ.UI.updateNote 同一家族） */
  SQ.UI.achv = { render: render };
})();
