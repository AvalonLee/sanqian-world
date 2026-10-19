/* 演出族（一次性全屏演出层 ‖ 第册五十批 2026-10-19 从 view/index.html 整片搬出 · N34 第十四刀）
 * 范围 = 独占奖励演出（`exclusive`）+ 名号更迭演出（`karmaRank`）+ 洞府入驻轻演出（`caveEnter`）
 * + 坐化呈报（`deathReport` + `okDeath`）+ 盖棺之传（`recap` + `playRecap`）+ 五个收口动作
 * （`closeExcl` / `closeRank` / `closeCave` / `closeRecap`）。
 *
 * 留在内核的三件，各按「动作属于哪套机器」判：
 *   五个 DOM 监听（外置件一律不绑监听 = 既有纪律，监听体只留一行转发）‖ 创角屏重入（`MASKS` / `draft` 那套，
 *   桥位 `enterRebirth`）‖ 全量重绘入口（桥位 `renderAll`）。三者都不是演出层自己的机器。
 * 三枚定时器（`rankStageTimer` / `caveStageTimer` / `recapTimer`）随本族搬入：只服务这三个演出层，别处零引用。
 * 桥 = `ctx()` 递进来的那一枚 `c`（键集由审计 D7 逐键对账）；本刀**不新增桥键**——只用
 * `$` / `t` / `ui` / `s` / `reducedMotion` / `enterRebirth` / `renderAll`，全部在册。
 * ⚠️ `recapTimer` 是 `setInterval` 打字机：`closeRecap` 与「自然播完」两条路都必须清，否则关闭后仍在写 DOM。
 * ⚠️ `playRecap` 必须在 `enterRebirth` **之后**调用（它会把 MASKS 全关一遍，反序会把自己刚开的浮层关掉）。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  /* 三枚演出定时器（原为内核闭包 var，随本族搬入） */
  var rankStageTimer = null;
  var caveStageTimer = null;
  var recapTimer = null;

  /* 独占奖励全屏演出（获得即演；点击或 2.8s 自动收起） */
  function exclusive(c, eff) {
    var isGear = !!eff.exclusiveGear;
    var name = isGear ? c.t('gear.ex.' + eff.exclusiveGear) : c.t('skill.' + eff.exclusiveArt + '.name');
    c.$('excl-t1').textContent = isGear ? c.t('event.exclusive.title') : c.t('event.exclusive.art');
    c.$('excl-t2').textContent = name;
    c.$('excl-t3').textContent = c.t('event.exclusive.hint');
    c.$('excl-stage').classList.remove('hide');
    setTimeout(function () { c.$('excl-stage').classList.add('hide'); }, 2800);
  }
  function closeExcl(c) { c.$('excl-stage').classList.add('hide'); }

  /* 名号更迭全屏演出（善恶名号批）：跨段瞬间弹，小标 + 大名号 + 尾注；点按或 3.2s 自动收。
   * 与独占演出同「获得即演」纪律；轻幕 + 按档位着色（正/左/魔三色）。 */
  function karmaRank(c, rankId, tier) {
    c.$('rank-t1').textContent = c.t('karma.rank.show.t1');
    c.$('rank-t2').textContent = c.t('karma.rank.' + rankId);
    c.$('rank-t2').className = 'r2 ' + tier;
    c.$('rank-t3').textContent = c.t('karma.rank.show.t3');
    var st = c.$('rank-stage');
    st.className = 'rank-mask ' + tier;
    if (rankStageTimer) clearTimeout(rankStageTimer);
    rankStageTimer = setTimeout(function () { st.classList.add('hide'); }, 3200);
  }
  function closeRank(c) {
    if (rankStageTimer) { clearTimeout(rankStageTimer); rankStageTimer = null; }
    c.$('rank-stage').classList.add('hide');
  }

  /* 洞府入驻轻演出（批 2 · B3 · 稿三）：只给「第一次拥有」——洞府名 + caveMult + 灵气叙事全文，
   * 点按跳过 / 4.2s 自动收；迁居（已持有间切换）不出本演出，只弹一行 toast。 */
  function caveEnter(c, caveId, mult) {
    c.$('cvs-t1').textContent = c.t('cave.system');
    c.$('cvs-t2').textContent = c.t('cave.' + caveId + '.name');
    c.$('cvs-t3').textContent = c.t('cave.show.mult', { mult: mult.toFixed(2) });
    c.$('cvs-story').textContent = c.t('cave.' + caveId + '.desc');
    c.$('cvs-skip').textContent = c.t('cave.show.skip');
    var st = c.$('cave-stage');
    st.classList.remove('hide');
    clearTimeout(caveStageTimer);
    caveStageTimer = setTimeout(function () { st.classList.add('hide'); }, 4200);
  }
  function closeCave(c) {
    if (caveStageTimer) { clearTimeout(caveStageTimer); caveStageTimer = null; }
    c.$('cave-stage').classList.add('hide');
  }

  /* 坐化呈报（寿元批）：死亡那一世首次进主界面即弹，同一个 at 只弹一次（`ui.seenDeathAt` 键控）。
   * 确认后进创角（与兵解 / 飞升收线同一条路）：`enterRebirth` 之后再 `playRecap`，反序会把自己关掉。 */
  function deathReport(c) {
    var ld = c.w.lastDeath;
    if (!ld) return;
    c.ui.seenDeathAt = ld.at;
    c.ui.deathPending = true;
    c.$('mo-title').textContent = c.t('life.death.title');
    /* 死因取话（第卌八批）：旧写法是 `cause === 'daoshang' ? 道伤 : 寿尽` 的二元 ternary，
     * 新增的 zhesou 会被静默归成「寿元耗尽」——那句谎话正是本仓登记过的「兜底键复用
     * 三个键名都按字面量写全：A6 的反向扫描只认字面量，动态拼串会把它判成孤儿。 */
    c.$('mo-sub').textContent = c.t(ld.cause === 'daoshang' ? 'life.death.daoshang'
      : (ld.cause === 'zhesou' ? 'life.death.zhesou' : 'life.death.shoujin'));
    c.$('mo-stats').innerHTML = '';
    c.$('mo-hint').textContent = c.t('life.death.stats', {
      age: SQ.fmt(ld.age || 0),
      realm: c.t('realm.' + Math.min(ld.realm || 0, c.d.REALMS.length - 1)),
      dao: ld.dao || 0, n: SQ.fmt(ld.total || 0)
    });
    c.$('mo-ok').textContent = c.t('life.death.ok');
    c.$('modal-offline').classList.remove('hide');
  }
  function okDeath(c) {
    c.$('modal-offline').classList.add('hide');
    /* 死后的「转世重生」= 进创角（与兵解 / 飞升收线同一条路）；出关呈报仍走原路重绘 */
    if (c.ui.deathPending) { c.ui.deathPending = false; c.enterRebirth(); playRecap(c); return; }
    c.renderAll();
  }

  /* 盖棺之传：标题 + 正文打字机（`reducedMotion` 时直接全文上屏）；点「入世」收口。 */
  function recap(c, title, text) {
    var el = c.$('mrp-text');
    c.$('mrp-title').textContent = title;
    c.$('mrp-go').textContent = c.t('legacy.ui.recap.go');
    el.textContent = '';
    el.scrollTop = 0;
    if (recapTimer) { clearInterval(recapTimer); recapTimer = null; }
    if (c.reducedMotion()) el.textContent = text;
    else {
      var vi = 0;
      recapTimer = setInterval(function () {
        if (c.$('modal-recap').classList.contains('hide')) { clearInterval(recapTimer); recapTimer = null; return; }
        vi += 3;
        el.textContent = text.slice(0, vi);
        el.scrollTop = el.scrollHeight;   /* 滚的是正文那一格：标题与「入世」钮都不跟着滚走 */
        if (vi >= text.length) { clearInterval(recapTimer); recapTimer = null; }
      }, 24);
    }
    c.$('modal-recap').classList.remove('hide');
  }
  function closeRecap(c) {
    if (recapTimer) { clearInterval(recapTimer); recapTimer = null; }
    c.$('modal-recap').classList.add('hide');
  }

  /* ── 盖棺之传的通用出口（N61 · 第册十二批）：五条终局路（飞升 / 兵解 / 寿尽 / 道伤 / 折寿）
   * 演的是同一句标题、同一份正文 = 引擎刚写进 `meta.biographies` 的那一世末条 ⇒ 视图零判断
   * （第册批那条纪律沿用）。**必须在 enterRebirthCreation() 之后调用**：它会把 MASKS 全关一遍，
   * 反序就把自己刚开的浮层关掉了（兵解那一路第册批已踩过）。 ── */
  function playRecap(c) {
    var bs = c.s.meta.biographies || [];
    var bio = bs[bs.length - 1];
    if (bio && bio.text) recap(c, c.t('legacy.ui.recap.title'), bio.text);
  }

  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.show = {
    exclusive: exclusive,
    closeExcl: closeExcl,
    karmaRank: karmaRank,
    closeRank: closeRank,
    caveEnter: caveEnter,
    closeCave: closeCave,
    deathReport: deathReport,
    okDeath: okDeath,
    closeRecap: closeRecap,
    playRecap: playRecap
  };
})();
