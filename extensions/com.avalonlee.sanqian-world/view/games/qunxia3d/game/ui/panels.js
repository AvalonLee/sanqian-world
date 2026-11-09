/* ui/panels.js — 纸面弹窗族 + 本境动作面板（M1）
 * 内容 = systems/tiles.collectTileActions / 事件对象；本件只做演出（铁律 1 反向面）。
 * 原版对照：renderActionButton :5118（三档样式语义）、openBountyPosterModal :5889、
 * triggerRoadEncounter 弹窗 :6370–:6389、独占队列语义（同屏一弹窗）。 */
(function (root) {
  'use strict';
  var core = root.QX3D && root.QX3D.core;
  var systems = root.QX3D && root.QX3D.systems;
  if (!core || !systems) throw new Error('panels: QX3D.core/systems 未加载');

  var el = function (id) { return document.getElementById(id); };

  /* ── 通用纸面弹窗壳（单实例 + 队列长度 1 的独占语义）────────────────────── */
  var queue = [];
  function openSheet(fill) {
    var m = el('qx-modal');
    if (!m.classList.contains('hidden')) {
      if (queue.length < 2) queue.push(fill);
      return;
    }
    fill(m);
    m.classList.remove('hidden');
  }
  function closeModal() {
    el('qx-modal').classList.add('hidden');
    var nxt = queue.shift();
    if (nxt) openSheet(nxt);
  }
  function shell(m, tag, title, loc, descHtml, choicesHtml) {
    m.innerHTML =
      '<div class="qxm-sheet">' +
      '<div class="qxm-head"><span class="qxm-tag">' + tag + '</span><b class="qxm-title">' + title + '</b>' +
      (loc ? '<span class="qxm-loc">' + loc + '</span>' : '') +
      '<button class="qxm-close" data-qxm-close>✕</button></div>' +
      '<div class="qxm-body">' + descHtml + '</div>' +
      '<div class="qxm-choices">' + choicesHtml + '</div>' +
      '</div>';
    m.querySelector('[data-qxm-close]').addEventListener('click', closeModal);
  }
  function choiceBtn(label, cls) {
    return '<button class="qxm-btn ' + (cls || '') + '" data-qxm-choice>' + label + '</button>';
  }

  /* ── 本境动作面板（collectTileActions 全列 + 册300 市井在场）──────────────── */
  function openActionPanel(st, curReg, curTile, onAct, onStreet, onSide) {
    openSheet(function (m) {
      var all = systems.tiles.collectTileActions(st, curReg, curTile);
      var picked = systems.tiles.pickPrimaryActions(all);
      /* 市井在场（P4-A）：只列脚下这一处的 1~2 人；点开进市井浮层（非一级主按钮） */
      var here = systems.street ? systems.street.npcsHere(st, curReg) : [];
      var streetRows = here.map(function (n) {
        var job = systems.street.jobOf(n.jobId) || { title: '市井' };
        return '<button class="qxm-act" data-street="' + n.id + '">' +
          '<span class="qa-main"><b>' + job.title + ' · ' + n.name + '</b><i>' + n.tileName + ' · 市井在场</i></span>' +
          '<span class="qa-cost">点开</span></button>';
      }).join('');
      var sides = systems.side ? systems.side.castHere(st, curReg) : [];
      var sideRows = sides.map(function (c) {
        return '<button class="qxm-act" data-side="' + c.id + '">' +
          '<span class="qa-main"><b>' + c.name + '</b><i>' + (c.title || '江湖人') + ' · 配角在场</i></span>' +
          '<span class="qa-cost">点开</span></button>';
      }).join('');
      var tierCls = function (a) {
        if (a.disabled) return ' disabled';
        if (a.tier === 'recommend') return ' recommend';
        if (a.tier === 'danger') return ' danger';
        return '';
      };
      var row = function (a) {
        return '<button class="qxm-act' + tierCls(a) + '" data-act="' + a.act + '"' + (a.disabled ? ' disabled' : '') + '>' +
          '<span class="qa-main"><b>' + a.label + '</b><i>' + a.sub + '</i></span>' +
          '<span class="qa-cost">' + a.cost + '</span></button>';
      };
      var shopRows = picked.more.filter(function (a) { return a.group === 'shop'; });
      var moreRows = picked.more.filter(function (a) { return a.group !== 'shop'; });
      shell(m, '本境 · ' + curTile.name, curReg.name + ' · 事务', '行脚 ' + st.ap + '/' + st.maxAp,
        '<div class="qxm-acts">' +
        picked.primary.map(row).join('') +
        (streetRows ? '<div class="qxm-more-h">市井 · 在场</div>' + streetRows : '') +
        (sideRows ? '<div class="qxm-more-h">配角 · 在场</div>' + sideRows : '') +
        (moreRows.length ? '<div class="qxm-more-h">更多 · 本旬可办</div>' + moreRows.map(row).join('') : '') +
        (shopRows.length ? '<div class="qxm-more-h">商铺 · 限量货架</div>' + shopRows.map(row).join('') : '') +
        '</div>',
        '');
      Array.prototype.forEach.call(m.querySelectorAll('[data-act]'), function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          closeModal();
          onAct(b.getAttribute('data-act'));
        });
      });
      Array.prototype.forEach.call(m.querySelectorAll('[data-street]'), function (b) {
        b.addEventListener('click', function () {
          closeModal();
          if (onStreet) onStreet(b.getAttribute('data-street'));
        });
      });
      Array.prototype.forEach.call(m.querySelectorAll('[data-side]'), function (b) {
        b.addEventListener('click', function () {
          closeModal();
          if (onSide) onSide(b.getAttribute('data-side'));
        });
      });
    });
  }

  /* ── 市井浮层（册300 · P4-A）：三句场面 + 三动作（禁用态走 actionView 同源）
   * 册301：extraActions = 官差三支（朝廷线），前置后整体截 3 —— 与原版
   * syncOfficerJobActions「court 三支优先、再用原岗动作补位」同序。 */
  function openStreetNpc(st, npc, onAct, extraActions) {
    openSheet(function (m) {
      var job = systems.street.jobOf(npc.jobId) || { title: '市井', sentences: [], actions: [] };
      var lines = (job.sentences || []).slice(0, 3).map(function (fn) { return fn(npc); });
      var actions = (extraActions || []).concat(job.actions || []).slice(0, 3);
      var desc = '<div class="qxm-street">' +
        '<div class="qxm-street-seal">' + job.title + '</div>' +
        lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') +
        '</div>' +
        '<div class="qxm-dim qxm-street-meta">市井见识：' + systems.street.intelLabel(st) +
        '（' + (st.intelTier || 0) + '/3）· 打听只说方向，不指到哪一条街。</div>';
      var choices = actions.map(function (a) {
        var v = systems.street.actionView(st, npc, a);
        return '<button class="qxm-btn' + (a.primary ? ' primary' : '') + '" data-street-act="' + a.id + '"' +
          (v.disabled ? ' disabled' : '') + '>' + a.label +
          ' <small>' + (v.disabled ? v.why : (a.hint || '')) + '</small></button>';
      }).join('');
      shell(m, '市井 · ' + job.title, npc.name, npc.regionName + ' · ' + npc.tileName, desc, choices);
      Array.prototype.forEach.call(m.querySelectorAll('[data-street-act]'), function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          closeModal();
          if (onAct) onAct(b.getAttribute('data-street-act'));
        });
      });
    });
  }

  /* ── 海捕文书（openBountyPosterModal :5889 纸面重绘）────────────────────── */
  function openBountyPoster(st, bounty, corePlayer, getRegion, onFight) {
    var reg = getRegion(bounty.region);
    var tileName = (reg.tiles[bounty.tileIdx] || {}).name || reg.name;
    var myPower = corePlayer.calcPlayerCombatPower(st);
    var verdict = myPower >= bounty.power ? '稳操胜券' : (myPower >= bounty.power - 8 ? '势均力敌' : '险象环生');
    openSheet(function (m) {
      shell(m, '官府海捕文书', '缉拿要犯：【' + bounty.name + '】', reg.name + ' · ' + tileName,
        '<div class="qxm-poster">' +
        '<p>你已循线追踪至【' + tileName + '】，只见<b>' + bounty.name + '</b>正提刀冷笑。是否立即拔剑上前将其缉拿归案？</p>' +
        '<div class="qxm-poster-meta"><span>⚔️ 我 ' + myPower + ' VS 敌 ' + bounty.power + '（' + verdict + '）</span>' +
        '<span>敌气血 ' + bounty.hp + '</span><span class="qxm-reward">赏银 ' + bounty.rewardGold + ' 文</span></div>' +
        '</div>',
        choiceBtn('⚔️ 拔剑缉拿 · 立即与【' + bounty.name + '】过招！（免额外行脚）', ' primary') +
        choiceBtn('暂且按兵不动（稍后可在面板随时缉拿）'));
      var btns = m.querySelectorAll('[data-qxm-choice]');
      btns[0].addEventListener('click', function () { closeModal(); onFight(bounty); });
      btns[1].addEventListener('click', closeModal);
    });
  }

  /* ── 途中/本境奇遇（triggerRoadEncounter 弹窗 :6370 纸面重绘）────────────── */
  function openRoadEncounter(ev, reg, onChoose) {
    openSheet(function (m) {
      shell(m, ev.tag, ev.title, reg.name,
        '<p class="qxm-desc">' + ev.desc + '</p>',
        ev.choices.map(function (c) { return choiceBtn(c.label); }).join(''));
      Array.prototype.forEach.call(m.querySelectorAll('[data-qxm-choice]'), function (b, idx) {
        b.addEventListener('click', function () { closeModal(); onChoose(idx); });
      });
    });
  }

  /* ── 对手就位卡（三招对决引擎 M2 前的占位收口）──────────────────────────── */
  function openDuelPending(params, onClose) {
    openSheet(function (m) {
      shell(m, '三招对决 · 引擎 M2 接入', params.contextTitle || '过招在即', '',
        '<div class="qxm-poster"><p>对手已就位：<b>' + params.enemyName + '</b>（' + params.enemyTitle +
        '）· 架势 ' + params.enemyStance + ' · 战力 ' + params.enemyPower + ' · 气血 ' + params.enemyHp + '</p>' +
        '<p class="qxm-dim">胜获 ' + (params.rewardGold || 0) + ' 文 / 侠名 +' + (params.rewardFame || 0) +
        ' / 修为 +' + (params.rewardExp || 0) + (params.rewardMerit ? ' / 功绩 +' + params.rewardMerit : '') + '</p></div>',
        choiceBtn('收下战帖（对决引擎 M2 接入后开战）', ' primary'));
      m.querySelector('[data-qxm-choice]').addEventListener('click', function () { closeModal(); if (onClose) onClose(); });
    });
  }

  /* ── 配角浮层（册303 · P4-B）：三句自述 + 三动作（禁用态由 systems.side 定）──── */
  function openSideNpc(st, cast, onAct, actions) {
    openSheet(function (m) {
      var lines = (cast.lines || []).slice(0, 3);
      var desc = '<div class="qxm-street">' +
        '<div class="qxm-street-seal">配角</div>' +
        lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') +
        '</div>';
      var choices = (actions || []).map(function (a) {
        return '<button class="qxm-btn' + (a.primary ? ' primary' : '') + '" data-side-act="' + a.id + '"' +
          (a.disabled ? ' disabled' : '') + '>' + a.label +
          ' <small>' + (a.disabled ? (a.why || a.hint || '') : (a.hint || '')) + '</small></button>';
      }).join('');
      shell(m, '配角', cast.name, cast.title || cast.region || '', desc, choices);
      Array.prototype.forEach.call(m.querySelectorAll('[data-side-act]'), function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          closeModal();
          if (onAct) onAct(b.getAttribute('data-side-act'));
        });
      });
    });
  }

  /* ── 朝廷风声浮层（册301 · P4-C）：一屏一句结论 + 2~3 个选择 ─────────────── */
  function openCourtChoices(tag, title, loc, desc, labels, onPick) {
    openSheet(function (m) {
      var choices = (labels || []).map(function (l, i) {
        return '<button class="qxm-btn' + (i === 0 ? ' primary' : '') + '" data-court-pick="' + i + '">' + l + '</button>';
      }).join('');
      shell(m, tag, title, loc, '<p class="qxm-desc">' + desc + '</p>', choices);
      Array.prototype.forEach.call(m.querySelectorAll('[data-court-pick]'), function (b) {
        b.addEventListener('click', function () {
          closeModal();
          if (onPick) onPick(parseInt(b.getAttribute('data-court-pick'), 10));
        });
      });
    });
  }

  /* ── 传世秘境占位（M4 接内容）────────────────────────────────────────────── */
  function openSecretPending(regId, secret, onClose) {
    openSheet(function (m) {
      shell(m, '传世秘境 · 内容 M4 接入', secret.title, regId,
        '<p class="qxm-desc">' + secret.desc + '</p>',
        choiceBtn('收下机缘（M4 接奖励表与武学授予）', ' primary'));
      m.querySelector('[data-qxm-choice]').addEventListener('click', function () { closeModal(); if (onClose) onClose(); });
    });
  }

  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.panels = {
    openActionPanel: openActionPanel,
    openStreetNpc: openStreetNpc,
    openSideNpc: openSideNpc,
    openCourtChoices: openCourtChoices,
    openBountyPoster: openBountyPoster,
    openRoadEncounter: openRoadEncounter,
    openDuelPending: openDuelPending,
    openSecretPending: openSecretPending,
    closeModal: closeModal
  };
})(typeof window !== 'undefined' ? window : globalThis);
