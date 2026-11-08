/* core/time.js — 旬时间机（源规格 §四 #2）
 * 迁移源（view/games/qunxia/game.html）：
 *   getDateStr :3057–:3061   addLog :3063–:3067   addKarma :3069–:3074
 *   getRegion :3044–:3046   getCurrentMainChapter :3048–:3051
 *   advanceTime :3281–:3412   maybeEnterCrisisAftermath :6974–:6981（state 部分）
 *   checkAndSpawnCanonWorldEvent :10866–:10892
 *   handleExpiredCanonEvent :10905–:10920（state 部分；邸报弹窗留 UI 层）
 * 与原版的偏差（全部显式登记）：
 *   ① saveGame 由调用方负责（原版函数尾自存 localStorage；state 逐字段等价不受影响）
 *   ② settleCourtOnNewTurn / settleHallOnNewTurn 走 env 钩子，M0 未接（P4 = M7+，计划书 §四 #14）
 *   ③ openExclusiveEventModal 邸报弹窗 / showToast 是纯表现，经 env 注入或缺省 noop
 * 纯函数纪律（铁律 1）：不碰 DOM/THREE。 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.QX3D = root.QX3D || {}; root.QX3D.core = root.QX3D.core || {}; root.QX3D.core.time = api; }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var D = (typeof module !== 'undefined' && module.exports)
    ? require('./data.js').D
    : (root.QX3D && root.QX3D.core && root.QX3D.core.data ? root.QX3D.core.data.D : (root.QX3D_DATA || {}));

  var SEASONS = D.SEASONS;
  var XUNS = D.XUNS;

  function getRegion(id) {
    return D.REGIONS.find(r => r.id === id) || D.REGIONS[0];
  }

  function getCurrentMainChapter(st) {
    const idx = Math.min(st.mainQuestStep, D.MAIN_QUEST_CHAPTERS.length - 1);
    return D.MAIN_QUEST_CHAPTERS[idx];
  }

  function getDateStr(st) {
    const sIdx = Math.floor(((st.turn - 1) / 3) % SEASONS.length);
    const xIdx = (st.turn - 1) % 3;
    return `第${st.turn}/${st.maxTurns}旬 · ${SEASONS[sIdx]}${XUNS[xIdx]}`;
  }

  function addLog(st, text) {
    st.logs.unshift({ time: getDateStr(st), text });
    if (st.logs.length > 60) st.logs.pop();
  }

  function addKarma(st, delta) {
    if (!delta) return;
    st.karma.xiayi = Math.max(0, (st.karma.xiayi || 0) + (delta.xiayi || 0));
    st.karma.kuangao = Math.max(0, (st.karma.kuangao || 0) + (delta.kuangao || 0));
    st.karma.xiaoyao = Math.max(0, (st.karma.xiaoyao || 0) + (delta.xiaoyao || 0));
  }

  /* 【血衣楼暗线 · 三波余波】原 :3389–:3393 函数内字面量；文案对表由 advanceTime
   * 场景的 logs 逐字段核验兜底（抄错即红）。 */
  var SHADOW_WAVES = {
    8: '【血衣楼余波 · 一】雁门关外的血案有新说法：那伙血衣刀客并非受雇于人——有人在借中原群雄的刀，清理知道《山河残卷》下落的人。',
    24: '【血衣楼余波 · 二】连番公审与会盟背后，总有人抢在天下人之前散布流言。有心人发现：那些流言的措辞，与血衣楼刺客的字条如出一辙。',
    32: '【血衣楼余波 · 三】华山之约在即。有樵夫夜里看见一队血衣人马悄悄上了华山——他们不是去论剑的，是去收网的。'
  };

  /* ── 迟到余波（maybeEnterCrisisAftermath :6974–:6981，state 部分）──────────── */
  function maybeEnterCrisisAftermath(st, expired, env) {
    expired.phase = 'aftermath';
    expired.aftermathRemain = 2;
    expired.remainTurns = 0;
    addLog(st, `🌫️【迟到余波】「${expired.title}」高潮已过，仍可在 2 旬内赶往事发地介入残局。`);
    if (env && env.showToast) env.showToast(`${expired.title.replace(/^【|】/g, '')}·可入余波·余2旬`, 'amber');
  }

  /* ── 错过结算（handleExpiredCanonEvent :10905–:10920 state 部分）──────────── */
  function handleExpiredCanonEvent(st, expired, env) {
    if (env && env.queueWorldResult) env.queueWorldResult(expired.id, 'echo');
    if (!st.canonEventReports) st.canonEventReports = [];
    const sched = D.CANON_EVENTS_SCHEDULE.find(x => x.id === expired.id);
    if (sched && sched.onCanonExpire) {
      /* 自愈绑定：canon 表内闭包逐字引用全局 state 槽位（data/canon.js 头注），
       * 调用前回填当前 st，浏览器/node 双侧同一机制，不依赖外部纪律。 */
      if (typeof D.setRuntimeState === 'function') D.setRuntimeState(st);
      sched.onCanonExpire();
    }
    const outTitle = expired.canonOutcomeTitle || `《江湖邸报 · ${expired.title}落幕》`;
    const outText = expired.canonOutcomeText || `因你未在限期内赶赴【${getRegion(expired.region).name}】，「${expired.title}」已按原著轨迹自动落幕。`;

    st.canonEventReports.push({
      title: expired.title,
      participated: false,
      summary: outText
    });
    addLog(st, `📰【错过结算】${outTitle}：${outText}`);
  }

  /* ── 江湖大事注入（checkAndSpawnCanonWorldEvent :10866–:10892）────────────── */
  function checkAndSpawnCanonWorldEvent(st, env) {
    if (!st.canonEventsTriggered) st.canonEventsTriggered = {};
    D.CANON_EVENTS_SCHEDULE.forEach(ev => {
      if (st.turn === ev.triggerTurn && !st.canonEventsTriggered[ev.id]) {
        st.canonEventsTriggered[ev.id] = true;
        st.crises.push({
          id: ev.id,
          region: ev.region,
          tileIdx: ev.tileIdx,
          title: ev.title,
          remainTurns: ev.duration,
          enemyName: ev.enemyName,
          enemyTitle: ev.enemyTitle,
          enemyStance: ev.enemyStance,
          enemyPower: ev.enemyPower,
          enemyHp: ev.enemyHp,
          desc: ev.desc,
          canonOutcomeTitle: ev.canonOutcomeTitle,
          canonOutcomeText: ev.canonOutcomeText
        });
        const regName = getRegion(ev.region).name;
        const sceneCast = (ev.sceneCast || []).join('、');
        addLog(st, `📣【江湖大事传闻】听闻【${regName}】似有大事发生：「${ev.title}」（限期 ${ev.duration} 旬可赶往参与，逾期将按原著结局演进）${sceneCast ? `。据说 ${sceneCast} 将在场。` : ''}`);
        if (env && env.showToast) env.showToast(`📣 江湖风闻：【${regName}】正酝酿「${ev.title}」（限期 ${ev.duration} 旬）！`, 'amber');
      }
    });
  }

  /* ── 旬时间机（advanceTime :3281–:3412 逐段对写）────────────────────────── */
  function advanceTime(st, turns, resetAp, env) {
    const e = env || {};
    for (let t = 0; t < turns; t++) {
      st.turn += 1;

      // 重置新一旬的限次标记
      st.turnFlags = {
        drankTavern: false,
        sectTaskDone: false,
        sectPracticeDone: false,
        shrineDone: false,
        guardianDuelDone: false,
        midRoadEventDone: false,
        exploredRegions: {}
      };

      if (resetAp) {
        st.ap = st.maxAp;
      }

      // 【洛水隐庐 · 每旬产业日常经营结算】
      if (st.estate) {
        st.estate.workDoneThisTurn = false;
        const b = st.estate.buildings || {};
        const hasWealthTalent = (st.talents || []).includes('talent_wealthy');
        const stId = st.estate.stewardId;

        let turnWineryGold = (b.winery || 0) * 9;
        if (stId === 'linghuchong') turnWineryGold = Math.round(turnWineryGold * 1.4);
        if (hasWealthTalent) turnWineryGold = Math.round(turnWineryGold * 1.25);

        let turnHerbs = (b.herbGarden || 0) * 2;
        if ((b.herbGarden || 0) > 0 && stId === 'huangyaoshi') turnHerbs += 1;

        let turnIron = (b.smithy || 0) * 1;
        if ((b.smithy || 0) > 0 && stId === 'yangguo') turnIron += 1;

        let turnAcadExp = (b.academy || 0) * 10;
        let turnAcadFame = (b.academy || 0) * 4;
        if ((b.academy || 0) > 0 && stId === 'zhangsanfeng') turnAcadExp = Math.round(turnAcadExp * 1.4);

        st.gold += turnWineryGold;
        st.estate.herbs = (st.estate.herbs || 0) + turnHerbs;
        st.estate.iron = (st.estate.iron || 0) + turnIron;
        st.exp += turnAcadExp;
        st.fame += turnAcadFame;
        if ((b.herbGarden || 0) > 0) {
          st.hp = Math.min(st.maxHp, st.hp + (b.herbGarden * 8));
        }

        const prodParts = [];
        if (turnWineryGold > 0) prodParts.push(`酒坊+${turnWineryGold}文`);
        if (turnHerbs > 0) prodParts.push(`药圃+${turnHerbs}株灵草`);
        if (turnIron > 0) prodParts.push(`铁坊+${turnIron}块玄铁`);
        if (turnAcadExp > 0) prodParts.push(`书院+${turnAcadExp}修为/+${turnAcadFame}侠名`);
        if (prodParts.length > 0) {
          addLog(st, `🏡【隐庐产出】洛水隐庐本旬经营结算：${prodParts.join('，')}。`);
        }
      }

      // 每3旬发放一次宗门俸禄
      if (st.turn % 3 === 0) {
        const stipend = (st.sectRankIdx + 1) * 6;
        st.gold += stipend;
        st.sectMerit += 4;
        addLog(st, `【宗门季俸】收到师门发放的季俸 ${stipend} 文，门派功绩 +4。`);
      }

      st.masters.forEach(m => {
        if ((e.rand || Math.random)() < 0.25) {
          const curReg = getRegion(m.region);
          m.prevRegion = m.region;
          m.lastMoveTurn = st.turn;
          if ((e.rand || Math.random)() < 0.45 && curReg.neighbors.length > 0) {
            const nextRegId = curReg.neighbors[Math.floor((e.rand || Math.random)() * curReg.neighbors.length)];
            const nextReg = getRegion(nextRegId);
            m.region = nextReg.id;
            m.tileIdx = Math.floor((e.rand || Math.random)() * nextReg.tiles.length);
          } else {
            m.tileIdx = Math.floor((e.rand || Math.random)() * curReg.tiles.length);
          }
        }
      });

      // 江湖大事倒计时：高潮归零 → 迟到余波(N=2) → 错过结算
      for (let i = st.crises.length - 1; i >= 0; i--) {
        const c = st.crises[i];
        if (c.phase === 'aftermath') {
          c.aftermathRemain = (c.aftermathRemain || 0) - 1;
          if (c.aftermathRemain <= 0) {
            const expired = st.crises.splice(i, 1)[0];
            handleExpiredCanonEvent(st, expired, e);
          }
          continue;
        }
        c.remainTurns -= 1;
        if (c.remainTurns <= 0) {
          maybeEnterCrisisAftermath(st, c, e);
        }
      }

      // 前 4 旬为【潜龙勿用·新手安心发育期】，第 5 旬起逐项触发江湖大事传闻！
      // 【血衣楼暗线 · 三波余波（世界事件卷 v3.0 §十）】序章埋点后的幕间余波；华山论剑揭底。
      if (!st.shadowWaves) st.shadowWaves = {};
      if (SHADOW_WAVES[st.turn] && !st.shadowWaves[st.turn]) {
        st.shadowWaves[st.turn] = true;
        addLog(st, SHADOW_WAVES[st.turn]);
        if (e.showToast) e.showToast('江湖风闻 · 血衣楼余波', 'amber');
      }

      checkAndSpawnCanonWorldEvent(st, e);
    }

    if (st.turn >= st.maxTurns && !st.endingUnlocked && st.mainQuestStep < 2) {
      st.endingUnlocked = true;
      addLog(st, `🔔【三年期满】华山论剑之期已至！你可立即登华山绝顶决战，或点击顶部【🏆 论剑终局】结算生平。`);
      if (e.showToast) e.showToast('三年论剑之期已至！可前往华山论剑台或查看终局画卷！', 'amber');
    }

    if (typeof e.settleCourtOnNewTurn === 'function') e.settleCourtOnNewTurn();
    if (typeof e.settleHallOnNewTurn === 'function') e.settleHallOnNewTurn();
  }

  return {
    getRegion: getRegion,
    getCurrentMainChapter: getCurrentMainChapter,
    getDateStr: getDateStr,
    addLog: addLog,
    addKarma: addKarma,
    maybeEnterCrisisAftermath: maybeEnterCrisisAftermath,
    handleExpiredCanonEvent: handleExpiredCanonEvent,
    checkAndSpawnCanonWorldEvent: checkAndSpawnCanonWorldEvent,
    advanceTime: advanceTime
  };
});
