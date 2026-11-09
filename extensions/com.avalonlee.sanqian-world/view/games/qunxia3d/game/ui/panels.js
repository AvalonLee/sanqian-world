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
  function openActionPanel(st, curReg, curTile, onAct, onStreet, onSide, onRomance, onHall) {
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
      /* 情缘在场（P4-E）：只列已相识、且此刻同格的人（名册全表走顶栏角标） */
      var roms = systems.romance ? systems.romance.visibleList(st).filter(function (r) {
        return systems.romance.here(st, r.id);
      }) : [];
      var romanceRows = roms.map(function (r) {
        var word = systems.romance.stageWord(systems.romance.stage(st, r.id));
        return '<button class="qxm-act" data-romance="' + r.id + '">' +
          '<span class="qa-main"><b>' + r.name + '</b><i>' + r.address + ' · ' + word + '</i></span>' +
          '<span class="qa-cost">点开</span></button>';
      }).join('');
      /* 本门（P4-F · 册316 F1）：未立号 = 立号入口（列首缺），已立号 = 概览入口 */
      var hallRow = '';
      if (systems.hall) {
        systems.hall.ensureState(st);
        if (st.faction.founded) {
          hallRow = '<button class="qxm-act" data-hall="1">' +
            '<span class="qa-main"><b>本门 · ' + st.faction.name + '</b><i>声望' + systems.hall.fameWord(st) +
            ' · 门人 ' + systems.hall.disciples(st).length + '/' + systems.hall.cap(st) + '</i></span>' +
            '<span class="qa-cost">点开</span></button>';
        } else {
          var hg = systems.hall.foundingGaps(st);
          hallRow = '<button class="qxm-act" data-hall="found">' +
            '<span class="qa-main"><b>立号挂匾</b><i>' +
            (hg.length ? ('还缺 ' + hg.length + ' 项：' + hg[0].text) : '门户可立 · 二百两') +
            '</i></span><span class="qa-cost">' + (hg.length ? '查看' : '可办') + '</span></button>';
        }
      }
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
        (romanceRows ? '<div class="qxm-more-h">情缘 · 在场</div>' + romanceRows : '') +
        (hallRow ? '<div class="qxm-more-h">本门</div>' + hallRow : '') +
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
      Array.prototype.forEach.call(m.querySelectorAll('[data-romance]'), function (b) {
        b.addEventListener('click', function () {
          closeModal();
          if (onRomance) onRomance(b.getAttribute('data-romance'));
        });
      });
      Array.prototype.forEach.call(m.querySelectorAll('[data-hall]'), function (b) {
        b.addEventListener('click', function () {
          closeModal();
          if (onHall) onHall(b.getAttribute('data-hall'));
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

  /* ── 情缘名册（册314 · P4-E E3b）：只列「已相识 + 在场或心意已通」 ─────────
   * 原版 openRomanceList（street-drawer 名册）纸面重绘：行 = 姓名 + 阶段词。 */
  function openRomanceList(st, list, onPick) {
    openSheet(function (m) {
      var rom = systems.romance;
      var rows = (list || []).map(function (r) {
        var word = rom.stageWord(rom.stage(st, r.id));
        return '<button class="qxm-act" data-romance-pick="' + r.id + '">' +
          '<span class="qa-main"><b>' + r.name + '</b><i>' + r.address + ' · ' + word + '</i></span>' +
          '<span class="qa-cost">点开</span></button>';
      }).join('');
      var desc = '<div class="qxm-dim qxm-street-meta">只列已相识、且此刻在场或心意已通的人。册上没有的人，不写她在哪。</div>';
      shell(m, '情缘', '名册', '已相识 ' + (list || []).length + ' 人',
        '<div class="qxm-acts">' + (rows || '<p class="qxm-dim">还没有可写进这本册子的人。</p>') + '</div>' + desc, '');
      Array.prototype.forEach.call(m.querySelectorAll('[data-romance-pick]'), function (b) {
        b.addEventListener('click', function () {
          closeModal();
          if (onPick) onPick(b.getAttribute('data-romance-pick'));
        });
      });
    });
  }

  /* ── 情缘人卡（册314）：三句自述 + 阶段注 + 三动作（动作表由 systems.romance 定）── */
  function openRomanceNpc(st, cast, note, actions, onAct) {
    openSheet(function (m) {
      var lines = (cast.lines || []).slice(0, 3);
      var desc = '<div class="qxm-street">' +
        '<div class="qxm-street-seal">情缘</div>' +
        lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') +
        '</div>' +
        '<div class="qxm-dim qxm-street-meta">' + (note || '') + '</div>';
      var choices = (actions || []).map(function (a) {
        return '<button class="qxm-btn' + (a.primary && !a.disabled ? ' primary' : '') + '" data-romance-act="' + a.id + '"' +
          (a.disabled ? ' disabled' : '') + '>' + a.label +
          ' <small>' + (a.disabled ? (a.why || a.hint || '') : (a.hint || '')) + '</small></button>';
      }).join('');
      shell(m, '情缘', cast.name, cast.title || '', desc, choices);
      Array.prototype.forEach.call(m.querySelectorAll('[data-romance-act]'), function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          closeModal();
          if (onAct) onAct(b.getAttribute('data-romance-act'));
        });
      });
    });
  }

  /* ── 立号检定（册316 · F1）：✓ 已备 + 缺口逐条 + 门名输入 + 挂牌 ───────────
   * 原版 openFoundingCheck（条件页）与 openHallPlaque（挂匾页）合成一屏：条件不够就只列缺口。 */
  function openHallFound(st, info, onPick) {
    openSheet(function (m) {
      var met = (info.met || []).map(function (w) { return '✓ ' + w; });
      var gaps = (info.gaps || []).map(function (g) { return g.text; });
      var can = gaps.length === 0;
      var choices = '';
      if (can) choices += '<button class="qxm-btn primary" data-hall-pick="0">挂牌立门</button>';
      if (info.banditOpen) choices += '<button class="qxm-btn" data-hall-pick="2">改扯山旗 <small>通缉在身，直接落草</small></button>';
      choices += '<button class="qxm-btn" data-hall-pick="1">改日再议</button>';
      var desc = '<p class="qxm-desc">' + (met.concat(gaps).join('　') || '条件都够了。') + '</p>' +
        (can ? '<input id="hall-name-input" class="qxm-name-input" maxlength="8" placeholder="门名（留空从雅号里抽一个）">' : '');
      shell(m, '立号', '立号检定', '条件', desc, choices);
      Array.prototype.forEach.call(m.querySelectorAll('[data-hall-pick]'), function (b) {
        b.addEventListener('click', function () {
          var which = parseInt(b.getAttribute('data-hall-pick'), 10);
          var input = document.getElementById('hall-name-input');
          var name = input ? input.value : '';
          closeModal();
          if (onPick) onPick(which, name);
        });
      });
    });
  }

  /* ── 本门概览（册316 · F1）：名号 / 声望 / 宗旨 / 门人上限 / 房舍 / 主母位 ── */
  function openHallOverview(st, info) {
    openSheet(function (m) {
      var desc = '<div class="qxm-street">' +
        '<div class="qxm-street-seal">本门</div>' +
        '<p>' + info.name + '。声望' + info.fameWord + '。宗旨' + info.doctrine + '。</p>' +
        '<p>门人 ' + info.people + ' 人，上限 ' + info.cap + '。房舍 ' + info.houses + '。</p>' +
        '<p>' + info.wifeLine + '</p>' +
        '</div>' +
        '<div class="qxm-dim qxm-street-meta">' + (info.ledger || '饷银还没过第一旬。') + '</div>';
      shell(m, '本门', info.name, '概览', desc, choiceBtn('合上簿子'));
      m.querySelector('[data-qxm-choice]').addEventListener('click', closeModal);
    });
  }

  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.panels = {
    openActionPanel: openActionPanel,
    openStreetNpc: openStreetNpc,
    openSideNpc: openSideNpc,
    openRomanceList: openRomanceList,
    openRomanceNpc: openRomanceNpc,
    openHallFound: openHallFound,
    openHallOverview: openHallOverview,
    openCourtChoices: openCourtChoices,
    openBountyPoster: openBountyPoster,
    openRoadEncounter: openRoadEncounter,
    openDuelPending: openDuelPending,
    openSecretPending: openSecretPending,
    closeModal: closeModal
  };
})(typeof window !== 'undefined' ? window : globalThis);
