/* 天道系统（天道系统批 B1~B4 · 天道设计 v1.1 ‖ 第册五十三批 2026-10-19 从 view/index.html 整片搬出 · N34 第十七刀）
 * 范围 = 问天浮层（卦位六选 + 香火四档 + 奏疏生成 / 一键复制 + 自问自卜 `tdRunAsk` + 接旨粘贴解析）‖ 圣旨揭晓（卷轴 + 判词逐字 + 领旨/抗旨）
 *   ‖ 天象浮层 ‖ 天道行（问天入口 + 天象红点 + 逆天值/档位/称号/逆天盾）‖ 页游贴片彩蛋 `renderGiftPack`。共十件、196 行。
 * 导出八枚（只给「件外真的在调」的那些）：`row`（天道行，`view/idle.js` 经桥位 `renderTiandaoRow` 取）‖ `open`（问天浮层）
 *   ‖ `omen`（天象浮层）‖ `modal`（浮层重绘，派发器 `tdHex` / `tdIncense` 用）‖ `decree`（圣旨揭晓）‖ `resetMemo`（领旨 / 抗旨后清奏疏）
 *   ‖ `closeDecree`（关圣旨：清打字机定时器 + 收浮层）‖ `runAsk`（自问自卜，`mtd-memo` / `mtd-local` 两个监听用）。
 * 留内核的两族（按「动作属于哪套机器」判）：**八个 DOM 监听**（`mtd-memo` / `mtd-local` / `mtd-copy` / `mtd-parse` / `mtd-close` /
 *   `mdc-close` / `mom-close` / `mdc-accept` / `mdc-defy`，监听体一律一行转发）‖ **领旨 / 抗旨的结算链**（`SQ.Actions.tdAccept` /
 *   `tdDefy` / `autoEventOn` / `autoResolveChoice` / `showChoice`——弹层栈与结算，不是渲染）。
 * 桥 43 枚**不变**（本刀零新增键）：`tdRunAsk` 随族搬入 ⇒ 不需要桥位，`mtd-memo` / `mtd-local` 改调导出 `runAsk`。
 * ⚠️ 打字机定时器 `tdTypeTimer` 随件搬入，`closeDecree` 是它唯一收口（内核 `mdc-close` 只调导出，不再自己 clearInterval）。
 * ⚠️ 件内互调一律显式补 `c`（十件同族；D13 逐处对表）；改写器**字符串感知**（`'ui.close'` 这类词表键不许被加前缀），
 *   改完必跑「内核函数名 × 件内裸调用」全表对扫（第册五十二批立的规矩）。
 */
(function () {
  var SQ = (window.SQ = window.SQ || {});
  /* ══════════ 天道系统（天道系统批 B1~B4 · 天道设计 v1.1）══════════
   * 问天浮层：卦位六选 + 香火四档 + 奏疏生成/一键复制（V1 人工中继）+ 自问自卜（V1.5 本地模拟）
   * + 接旨粘贴解析；圣旨揭晓：卷轴展开 + 判词逐字 + 领旨/抗旨（抗旨 CONFIRM 明示逆天值收益与档位后果）；
   * 天象浮层：即开即消红点；逆天大劫入口在渡劫预估浮层（detailTrib 段）。 */
  var tdTypeTimer = null;

  /* 天降礼包（B16-z）：窄屏无右栏时的中区入口；文案与扣费模型全读 SQ.Gifts，与右栏同源。 */
  function renderGiftPack(c) {
    var now = Date.now();
    if (c.ui.giftI < 0 || now >= c.ui.giftUntil) {
      c.ui.giftI = Math.floor(Math.random() * SQ.Gifts.N);
      c.ui.giftUntil = now + SQ.Gifts.ROLL_MS;
    }
    var gp = SQ.Gifts.offer(c.ui.giftI);
    var cost = SQ.Gifts.costOf(c.w, gp.idx);
    var left = Math.max(0, (c.ui.giftUntil || 0) - now);
    var mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
    var cd = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    return '<span class="giftcard" data-act="giftBuy" data-v="' + gp.idx + '">' +
      '<span class="gtag">' + c.esc(c.t('eggs.gift.tag')) + '</span>' +
      '<span class="gname">' + c.esc(c.t(gp.nameKey)) + '</span>' +
      '<span class="goffer">' + c.esc(c.t(gp.offerKey)) + '</span>' +
      '<span class="gcost">' + c.esc(c.t('eggs.gift.cost.' + gp.costType, { p: Math.round(cost.pct * 100), n: SQ.fmt(cost.n) })) +
      ' · ' + c.esc(c.t('eggs.gift.cd', { t: cd })) + '</span>' +
      '<span class="gbtn">' + c.esc(c.t('eggs.gift.btn')) + '</span></span>';
  }

  function renderTiandaoRow(c) {
    var w = c.w, d = c.d;
    if (!SQ.Tiandao || !w.tiandao) return '';
    var td = w.tiandao;
    var unseen = SQ.Tiandao.unseenOmens(w);
    var stage = SQ.Tiandao.stageOf(w, d);
    var h = '<div class="tdrow">';
    /* 问天入口（第卅九批 · 用户令「隐藏游戏问天功能」）：**用既有 .hide 工具类收掉，不删代码**——
     * 引擎（Tiandao.ask / 奏疏 / 圣旨浮层）与词表键原样留着，恢复只需去掉这一个类名；
     * 判据 = 走查 `verify-ui-tiandao` B1（在 DOM 但 `offsetParent === null` ⇒ 玩家看不见也点不着），
     * 后续链路仍由该篇以 dispatchEvent 驱动（委托挂在 document 上，隐藏元素被合成点击照跑）。 */
    h += '<button class="tdbtn hide" data-act="openTiandao">' + c.esc(c.t('tiandao.entry')) +
      (unseen ? '<i class="pdot"></i>' : '') + '</button>';
    h += '<button class="tdbtn plain" data-act="openOmens">' + c.esc(c.t('tiandao.omen.chip')) +
      (unseen ? '<i class="pdot"></i>' : '') + '</button>';
    if (td.defy > 0 || stage) h += '<span class="tddefy">' + c.esc(c.t('tiandao.defy.val', { n: td.defy })) + '</span>';
    if (stage) h += '<span class="tdstage' + (stage === 'nijie' ? ' nijie' : '') + '">' + c.esc(c.t('tiandao.stage.' + stage)) + '</span>';
    if (td.title) h += '<span class="tdtitle">' + c.esc(c.t('tiandao.title')) + '</span>';
    /* N20 接线：盾此前只有名、语义（用后即失 / 只保修为）全靠玩家自己猜；正典在天道卷 line253/325 */
    if (td.shield) h += '<span class="tdtitle">' + c.esc(c.t('tiandao.shield')) + '</span>' +
      '<span class="hint">' + c.esc(c.t('tiandao.shield.desc')) + '</span>';
    if (w.realm >= ((d.LEGACY || {}).BINGJIE_MIN_REALM || 4) && SQ.Legacy) {
      h += '<button class="tdbtn plain" data-act="dissolve">' + c.esc(c.t('legacy.ui.bingjie.btn')) + '</button>';
    }
    h += renderGiftPack(c);   /* 页游充值贴片彩蛋（恶搞，零机制） */
    h += '</div>';
    return h;
  }

  function openTiandao(c) {
    var d = c.d;
    c.ui.tdHex = c.ui.tdHex || 'wenjie';
    c.ui.tdIncense = c.ui.tdIncense || 0;
    c.$('mtd-title').textContent = c.t('tiandao.modal.title');
    c.$('mtd-hexlabel').textContent = c.t('tiandao.modal.hex');
    c.$('mtd-inclabel').textContent = c.t('tiandao.modal.incense');
    c.$('mtd-localhint').textContent = c.t('tiandao.local.hint');
    c.$('mtd-reclabel').textContent = c.t('tiandao.receive.ph');
    c.$('mtd-memo').textContent = c.t('tiandao.btn.memo');
    c.$('mtd-local').textContent = c.t('tiandao.btn.local');
    c.$('mtd-copy').textContent = c.t('tiandao.btn.copy');
    c.$('mtd-parse').textContent = c.t('tiandao.btn.receive');
    c.$('mtd-close').textContent = c.t('ui.close');
    c.$('mtd-free').placeholder = c.t('tiandao.free.ph');
    c.$('mtd-memoout').placeholder = c.t('tiandao.memo.ph');
    renderTdModal(c);
    c.$('modal-tiandao').classList.remove('hide');
  }

  function renderTdModal(c) {
    var w = c.w, d = c.d;
    var td = w.tiandao || { defy: 0, lastAskAt: 0 };
    var hx = '';
    (d.TIANDAO.HEXAGRAMS || []).forEach(function (id) {
      hx += '<button class="' + (c.ui.tdHex === id ? 'on' : '') + '" data-act="tdHex" data-v="' + id + '">' +
        c.esc(c.t('tiandao.hex.' + id)) + '<span class="hx">' + c.esc(c.t('tiandao.hexdesc.' + id)) + '</span></button>';
    });
    c.$('mtd-hex').innerHTML = hx;
    var inc = '';
    (d.TIANDAO.INCENSE_RANKS || []).forEach(function (n, i) {
      inc += '<button class="' + (c.ui.tdIncense === i ? 'on' : '') + '" data-act="tdIncense" data-v="' + i + '">' +
        c.esc(n === 0 ? c.t('tiandao.incense.0') : c.t('tiandao.incense.n', { n: SQ.fmt(n) })) + '</button>';
    });
    c.$('mtd-incense').innerHTML = inc;
    c.$('mtd-free').classList.toggle('hide', c.ui.tdHex !== 'blank');
    var left = (td.lastAskAt || 0) + d.TIANDAO.ASK_CD_MS - Date.now();
    var cooling = left > 0;
    c.$('mtd-cd').textContent = cooling ? c.t('tiandao.cd', { t: c.timeLeft(left) }) : '';
    c.$('mtd-memo').disabled = cooling;
    c.$('mtd-local').disabled = cooling;
    var stage = SQ.Tiandao.stageOf(w, d);
    c.$('mtd-defy').innerHTML = '<span>' + c.esc(c.t('tiandao.defy.val', { n: td.defy || 0 })) +
      (stage ? ' · ' + c.esc(c.t('tiandao.stage.' + stage)) + ' — ' + c.esc(c.t('tiandao.stage.' + stage + '.desc')) : '') + '</span>';
  }

  /* 奏疏文本框自适应高度：按内容撑开（上限六成屏高，超出由浮层滚动承接），
   * 避免用户只框选到可见首段就复制——「复制不全」的直接诱因 */
  function fitMemoOut(c, ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight + 2, Math.round(window.innerHeight * 0.6)) + 'px';
  }

  /* 领旨 / 抗旨后清空本轮问天残留（奏疏文本框 + 复制按钮 + 接旨粘贴框 + 圣旨缓存）：
   * 一轮问天已了结，下次打开问天不应再显示上一轮奏疏（用户反馈：领完旨后重开问天仍留着旧奏疏） */
  function resetTdMemo(c) {
    var ta = c.$('mtd-memoout');
    ta.value = '';
    ta.classList.add('hide');
    c.$('mtd-copy').classList.add('hide');
    c.$('mtd-receive').value = '';
    c.ui.tdDec = null;
  }

  async function tdRunAsk(c, local) {
    var free = c.ui.tdHex === 'blank' ? c.$('mtd-free').value : '';
    var r = await SQ.Actions.tdAsk(c.s, c.ui.tdHex, c.ui.tdIncense, free);
    if (r && r.ok) {
      if (local) {
        var dec = SQ.Tiandao.localDecree(c.w, c.p, c.d, Date.now());
        showDecree(c, dec);
      } else {
        var taM = c.$('mtd-memoout');
        taM.value = r.text;
        taM.classList.remove('hide');
        fitMemoOut(c, taM);
        c.$('mtd-copy').classList.remove('hide');
        c.toast(c.t('tiandao.memo.ready', { n: r.text.length }));
      }
    } else if (r && r.reason === 'cooldown') {
      c.toast(c.t('tiandao.cd', { t: c.timeLeft(Math.max(0, r.until - Date.now())) }));
    } else if (r && r.reason === 'stones') {
      c.toast(c.t('tiandao.stones.lack'));
    }
    renderTdModal(c);
    c.renderAll();
  }

  function decreeEffText(c, dec) {
    var p = dec.payload || {};
    switch (dec.type) {
      case 'bless': return c.t('tiandao.eff.bless', { n: '+' + (p.tribBonus || 0).toFixed(2) });
      case 'curse': return c.t('tiandao.eff.curse', { n: (p.tribBonus || 0).toFixed(2) });
      case 'gift': return c.t('tiandao.eff.gift', { n: SQ.fmt(p.stones || 0) });
      case 'punish': return c.t('tiandao.eff.punish', { n: Math.round((p.mult || 0) * 100), h: p.hours || 24 });
      case 'karma': return c.t('tiandao.eff.karma', { n: (p.karma >= 0 ? '+' : '') + (p.karma || 0) });
      case 'bond': return c.t('tiandao.eff.bond', { name: p.target ? c.t('bond.' + p.target + '.name') : c.t('tiandao.eff.bond.any'), n: p.bond || 0 });
      case 'affix': return c.t('tiandao.eff.affix', { name: p.affixId ? c.t('affix.' + p.affixId + '.name') : c.t('tiandao.eff.affix.any') });
      default: return c.t('tiandao.eff.' + dec.type);
    }
  }

  function showDecree(c, dec) {
    c.ui.tdDec = dec;
    var w = c.w;
    c.$('mdc-type').textContent = c.t('tiandao.decree.type', { type: c.t('tiandao.type.' + dec.type) });
    c.$('mdc-meta').innerHTML =
      '<span>' + c.esc(c.t('tiandao.decree.hex', { hex: c.t('tiandao.hex.' + dec.hexagram) })) + '</span>' +
      '<span>' + c.esc(c.t('tiandao.decree.tier', { tier: c.t('tiandao.tier.' + dec.tier) })) + '</span>';
    c.$('mdc-eff').textContent = decreeEffText(c, dec);
    c.$('mdc-omen').textContent = c.t('tiandao.omen.wrap', { s: dec.omen || '' });
    var vd = c.$('mdc-verdict');
    vd.textContent = '';
    if (tdTypeTimer) { clearInterval(tdTypeTimer); tdTypeTimer = null; }
    if (c.reducedMotion() || !dec.verdict) {
      vd.textContent = dec.verdict || '';
    } else {
      var vi = 0;
      tdTypeTimer = setInterval(function () {
        vi += 2;
        vd.textContent = dec.verdict.slice(0, vi);
        if (vi >= dec.verdict.length) { clearInterval(tdTypeTimer); tdTypeTimer = null; }
      }, 40);
    }
    var isSeen = SQ.Tiandao.seen(w, dec);
    c.$('mdc-btns').classList.toggle('hide', isSeen);
    c.$('mdc-seen').textContent = isSeen ? c.t('tiandao.seen') : '';
    c.$('mdc-accept').textContent = c.t('tiandao.btn.accept');
    c.$('mdc-defy').textContent = c.t('tiandao.btn.defy');
    c.$('mdc-close').textContent = c.t('ui.close');
    c.$('modal-decree').classList.remove('hide');
  }

  function openOmens(c) {
    var w = c.w;
    c.$('mom-title').textContent = c.t('tiandao.omen.title');
    var q = ((w.tiandao || {}).omenQueue || []).slice().reverse();
    c.$('mom-body').innerHTML = q.length ? q.map(function (o) {
      return '<div class="omenitem"><div class="ot">' + c.esc(c.t('tiandao.omen.node.' + o.node)) + '</div>' + c.esc(o.text) + '</div>';
    }).join('') : '<p class="hint">' + c.esc(c.t('tiandao.omen.empty')) + '</p>';
    c.$('mom-close').textContent = c.t('ui.close');
    c.$('modal-omens').classList.remove('hide');
    if (SQ.Tiandao.unseenOmens(w)) SQ.Actions.tdOmensSeen(c.s).then(c.renderAll);   /* 即开即消红点 */
  }
  /* 关圣旨：清打字机定时器 + 收浮层（内核 mdc-close 只调这一枚） */
  function closeDecree(c) {
    if (tdTypeTimer) { clearInterval(tdTypeTimer); tdTypeTimer = null; }
    c.$('modal-decree').classList.add('hide');
  }

  SQ.UI = SQ.UI || {};
  /* 导出表：D14 按「深度 1 的 key:」抽取，表内不许夹注释 */
  SQ.UI.tiandao = {
    row: renderTiandaoRow,
    open: openTiandao,
    omen: openOmens,
    modal: renderTdModal,
    decree: showDecree,
    resetMemo: resetTdMemo,
    closeDecree: closeDecree,
    runAsk: tdRunAsk
  };
})();
