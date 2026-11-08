/* ui/audio.js — 古风五声合成器 + BGM 五曲（M6 尾量 · 计划书 §四 #13）
 * 逐式移植原版（qunxia/game.html :1345 三音色 SFX + :9802–:10092 五曲合成器）：
 * 三音色（pluck/clash/seal）参数一致；BGM 五曲乐谱原样（table-check S32 逐曲深比 + S33 场景映射对表）。
 * 偏差登记（对表豁免口径，随批登记）：
 *   ① gameSettings → 件内 prefs（localStorage `qunxia-audio-v1` 持久化；settings 页余量批消费 getPrefs/setPrefs）
 *   ② state/getRegion 走形参（autoAdaptBgmToContext(mode, state, getRegion)，不再读全局；D7 桥风格）
 *   ③ 自选原声文件导入（custom-bgm-audio）与设置中心模态不移植——须文件选择器/设置页，随 settings 页批裁
 *   ④ 场景映射提为纯函数 suiteIdxForRegion(regionId)（对表判点），autoAdapt 场景段消费它——行为逐值等价由 S33 钉
 *   ⑤ 首次手势自动起奏（pointerdown once 语义同原版 :10086）；node 侧（table-check require）只导出数据与纯函数 */
(function (root) {
  'use strict';

  /* ===== 〇 · 偏好（原 gameSettings 三键 + 开关；持久化） ===== */
  var PREFS_KEY = 'qunxia-audio-v1';
  var DEFAULT_PREFS = { soundEnabled: true, bgmVolume: 0.65, sfxVolume: 0.75, autoSwitchBgm: true };
  function loadPrefs() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(PREFS_KEY);
      if (!raw) return Object.assign({}, DEFAULT_PREFS);
      var p = JSON.parse(raw);
      return Object.assign({}, DEFAULT_PREFS, p);
    } catch (e) { return Object.assign({}, DEFAULT_PREFS); }
  }
  var prefs = loadPrefs();
  function savePrefs() { try { root.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) {} }
  function getPrefs() { return prefs; }
  function setPref(key, val) { prefs[key] = val; savePrefs(); }

  /* ===== 一 · 三音色 SFX（原 :1357–:1401 参数一致） ===== */
  var audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      var AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playGuqinNote(freq, type) {
    freq = freq || 392; type = type || 'pluck';
    if (!prefs.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();

      if (type === 'pluck') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.996, now + 0.45);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.16 * prefs.sfxVolume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.58);
      } else if (type === 'clash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 1.5, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.25);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'seal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.32);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    } catch (e) { /* Ignore audio errors（原版同注） */ }
  }

  function toggleSound() {
    prefs.soundEnabled = !prefs.soundEnabled;
    savePrefs();
    var el = null;
    try { el = document.getElementById('btn-sound'); } catch (e) {}
    if (el) el.textContent = prefs.soundEnabled ? '🔊 琴音' : '🔇 静音';
    if (prefs.soundEnabled) {
      initAudio();
      playGuqinNote(523.25, 'pluck');
      restartBgmTimer();
    } else if (bgmTimer) {
      clearTimeout(bgmTimer);
      bgmTimer = null;
    }
    return prefs.soundEnabled;
  }

  /* ===== 二 · 五曲乐谱（原 :9802–:9905 原样） ===== */
  var N_REST = 0;
  var N_E3 = 164.81, N_G3 = 196.00, N_A3 = 220.00, N_B3 = 246.94;
  var N_C4 = 261.63, N_D4 = 293.66, N_E4 = 329.63, N_F4 = 349.23, N_G4 = 392.00, N_A4 = 440.00, N_B4 = 493.88;
  var N_C5 = 523.25, N_D5 = 587.33, N_E5 = 659.25;

  /* [主音频率, 持续拍数, 伴奏根音频率]；音高对照 C4=1…C5=1̇（原注） */
  var BGM_SUITES = [
    {
      id: 'canghai',
      name: '《铁血丹心》· 83射雕主题曲',
      drama: '83版《射雕英雄传》罗文/甄妮',
      desc: '“依稀往梦似曾见，心中波澜现……” 苍劲笛箫与急促弦乐交织的家国江湖金曲',
      unitMs: 250,
      leadWave: 'xiao_dizi',
      score: [
        // 依稀往梦似曾见 (3 5 6. 6 | 6 5 3 2 1 2 -)
        [N_E4, 1, N_A3], [N_G4, 1, 0], [N_A4, 3, N_A3], [N_A4, 1, 0],
        [N_A4, 1, N_G3], [N_G4, 1, 0], [N_E4, 1, N_C4], [N_D4, 1, 0], [N_C4, 1, N_D4], [N_D4, 3, N_A3],
        // 心中波澜现 (3 5 2. 3 | 1 6̣ 6̣ -)
        [N_E4, 1, N_E3], [N_G4, 1, 0], [N_D4, 3, N_G3], [N_E4, 1, 0],
        [N_C4, 2, N_A3], [N_A3, 1, 0], [N_A3, 3, N_A3],
        // 逐草四方沙漠苍茫 (6̣ 1 2. 3 | 2 1 6̣ 5̣ 3̣ -)
        [N_A3, 1, N_A3], [N_C4, 1, 0], [N_D4, 3, N_D4], [N_E4, 1, 0],
        [N_D4, 1, N_G3], [N_C4, 1, 0], [N_A3, 1, N_C4], [N_G3, 1, 0], [N_E3, 4, N_E3],
        // 哪惧雪霜扑面 (6̣ 1 3 2 | 1 6̣ 5̣ 6̣ -)
        [N_A3, 1, N_A3], [N_C4, 1, 0], [N_E4, 2, N_C4], [N_D4, 2, N_G3],
        [N_C4, 1, N_A3], [N_A3, 1, 0], [N_G3, 1, N_E3], [N_A3, 5, N_A3]
      ]
    },
    {
      id: 'lunjian',
      name: '《难念的经》· 97天龙八部主题曲',
      drama: '97版《天龙八部》周华健',
      desc: '“笑你我枉花光心计，爱竞逐镜花那美丽……” 轻快洒脱又充满宿命感的武侠巅峰神曲',
      unitMs: 210,
      leadWave: 'guzheng',
      score: [
        // 笑你我枉花光心计 (3 5 6 6 5 6 5 3 2 -)
        [N_E4, 1, N_C4], [N_G4, 1, 0], [N_A4, 1, N_A3], [N_A4, 1, 0], [N_G4, 1, N_E3], [N_A4, 1, 0], [N_G4, 1, N_G3], [N_E4, 1, 0], [N_D4, 4, N_G3],
        // 爱竞逐镜花那美丽 (2 3 5 5 3 5 3 2 1 -)
        [N_D4, 1, N_G3], [N_E4, 1, 0], [N_G4, 1, N_C4], [N_G4, 1, 0], [N_E4, 1, N_A3], [N_G4, 1, 0], [N_E4, 1, N_G3], [N_D4, 1, 0], [N_C4, 4, N_C4],
        // 怕幸运会转眼远逝 (6̣ 1 2 2 1 2 3 5 3 2 1 6̣)
        [N_A3, 1, N_A3], [N_C4, 1, 0], [N_D4, 1, N_D4], [N_D4, 1, 0], [N_C4, 1, 0], [N_D4, 1, N_G3], [N_E4, 2, N_C4], [N_G4, 1, 0], [N_E4, 1, 0], [N_D4, 1, N_A3], [N_C4, 1, 0], [N_A3, 4, N_A3],
        // 为贪嗔喜恶怒着迷 (1 2 3 5 6 5 3 2 1 -)
        [N_C4, 1, N_C4], [N_D4, 1, 0], [N_E4, 2, N_E3], [N_G4, 2, N_G3], [N_A4, 2, N_A3], [N_G4, 1, 0], [N_E4, 1, N_C4], [N_D4, 2, N_G3], [N_C4, 4, N_C4]
      ]
    },
    {
      id: 'saibei',
      name: '《刀剑如梦》· 94倚天屠龙记主题曲',
      drama: '94版《倚天屠龙记》周华健',
      desc: '“我剑何去何从，爱与恨情难独钟……来也匆匆去也匆匆，恨不能相逢！” 快意恩仇的经典旋律',
      unitMs: 240,
      leadWave: 'xiao_dizi',
      score: [
        // 我剑何去何从 (6̣ - 1 2 | 3 - - 5 | 3 2 1 6̣ | 2 - - -)
        [N_A3, 2, N_A3], [N_C4, 1, 0], [N_D4, 1, N_D4], [N_E4, 3, N_A3], [N_G4, 1, 0],
        [N_E4, 1, N_C4], [N_D4, 1, 0], [N_C4, 1, N_A3], [N_A3, 1, 0], [N_D4, 4, N_G3],
        // 爱与恨情难独钟 (6̣ - 1 2 | 3 - 5 6 | 5 3 2 1 | 6̣ - - -)
        [N_A3, 2, N_A3], [N_C4, 1, 0], [N_D4, 1, N_D4], [N_E4, 2, N_C4], [N_G4, 1, 0], [N_A4, 1, N_A3],
        [N_G4, 1, N_G3], [N_E4, 1, 0], [N_D4, 1, N_E3], [N_C4, 1, 0], [N_A3, 4, N_A3],
        // 来也匆匆去也匆匆 (3 - 5 6 | 1̇ 6 5 3 | 2 - 3 5 | 3 2 1 6̣)
        [N_E4, 2, N_C4], [N_G4, 1, 0], [N_A4, 1, N_A3], [N_C5, 1, N_C4], [N_A4, 1, 0], [N_G4, 1, N_G3], [N_E4, 1, 0],
        [N_D4, 2, N_G3], [N_E4, 1, 0], [N_G4, 1, N_E3], [N_E4, 1, N_A3], [N_D4, 1, 0], [N_C4, 1, 0], [N_A3, 3, N_A3]
      ]
    },
    {
      id: 'youlan',
      name: '《归去来/神话情话》· 95神雕主题曲',
      drama: '95古天乐版《神雕侠侣》',
      desc: '“任由沧桑转化，垢净伴着雪花……” 终南山活死人墓与绝情谷最动人的洞箫古琴曲',
      unitMs: 280,
      leadWave: 'xiao_dizi',
      score: [
        // 3 5 6 - | 1̇ 7 6 5 3 - | 2 3 5 6 5 3 | 2 - - -
        [N_E4, 1, N_A3], [N_G4, 1, 0], [N_A4, 4, N_A3],
        [N_C5, 1, N_C4], [N_B4, 1, 0], [N_A4, 1, N_A3], [N_G4, 1, 0], [N_E4, 4, N_E3],
        [N_D4, 1, N_G3], [N_E4, 1, 0], [N_G4, 1, N_C4], [N_A4, 1, 0], [N_G4, 1, N_G3], [N_E4, 1, 0], [N_D4, 4, N_G3],
        // 3 5 6 - | 1̇ 2̇ 7 5 6 -
        [N_E4, 1, N_A3], [N_G4, 1, 0], [N_A4, 4, N_A3],
        [N_C5, 1, N_D4], [N_D5, 1, 0], [N_B4, 1, N_E3], [N_G4, 1, 0], [N_A4, 6, N_A3]
      ]
    },
    {
      id: 'jiangnan',
      name: '《沧海一声笑》· 笑傲江湖主题曲',
      drama: '黄霑经典《笑傲江湖》民乐版',
      desc: '“沧海一声笑，滔滔两岸潮，浮沉随浪只记今朝！” 纯正五声宫商角徵羽古筝洞箫合奏',
      unitMs: 250,
      leadWave: 'guzheng',
      score: [
        // 沧海一声笑 (6. 5 3 2 1 - -)
        [N_A4, 3, N_A3], [N_G4, 1, 0], [N_E4, 2, N_E3], [N_D4, 2, N_G3], [N_C4, 6, N_C4],
        // 滔滔两岸潮 (3. 2 1 6̣ 5̣ - -)
        [N_E4, 3, N_E3], [N_D4, 1, 0], [N_C4, 2, N_C4], [N_A3, 2, N_A3], [N_G3, 6, N_G3],
        // 浮沉随浪只记今朝 (5̣ 6̣ 5̣ 6̣ 1 2 3 5)
        [N_G3, 2, N_G3], [N_A3, 2, 0], [N_G3, 2, N_G3], [N_A3, 2, 0],
        [N_C4, 2, N_C4], [N_D4, 2, 0], [N_E4, 2, N_E3], [N_G4, 2, N_G3],
        // 苍天笑 (6. 5 3 2 1 2 - -)
        [N_A4, 3, N_A3], [N_G4, 1, 0], [N_E4, 2, N_C4], [N_D4, 2, N_G3], [N_C4, 2, N_A3], [N_D4, 6, N_G3]
      ]
    }
  ];

  /* ===== 三 · 播放器（原 :9907–:10034 逐式；toast 走 QX3D_APP 桥） ===== */
  var bgmSuiteIdx = 0;
  var bgmStepIdx = 0;
  var bgmTimer = null;
  var bgmStartedOnce = false;
  var bgmBeforeDuelIdx = null;

  function getActiveBgmSuite() { return BGM_SUITES[bgmSuiteIdx] || BGM_SUITES[0]; }

  function scheduleNextBgmNote() {
    if (bgmTimer) clearTimeout(bgmTimer);
    bgmTimer = null;
    if (!prefs.soundEnabled || prefs.bgmVolume <= 0.01) return;

    var suite = getActiveBgmSuite();
    var step = suite.score[bgmStepIdx % suite.score.length];
    var freq = step[0], beats = step[1], bassFreq = step[2];
    var durationMs = Math.max(120, (beats || 1) * suite.unitMs);
    var durSec = durationMs / 1000;
    bgmStepIdx++;

    try {
      initAudio();
      if (audioCtx && audioCtx.state === 'running') {
        var now = audioCtx.currentTime;
        var vol = prefs.bgmVolume * 0.14;

        if (freq > 0) {
          var osc = audioCtx.createOscillator();
          var osc2 = audioCtx.createOscillator();
          var gain = audioCtx.createGain();
          var filter = audioCtx.createBiquadFilter();

          if (suite.leadWave === 'xiao_dizi') {
            /* 洞箫/竹笛：温润正弦叠加轻微泛音与气息揉弦颤音 */
            osc.type = 'sine';
            osc2.type = 'triangle';
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1800, now);
            osc.frequency.setValueAtTime(freq * 0.992, now);
            osc.frequency.linearRampToValueAtTime(freq, now + Math.min(0.08, durSec * 0.3));
            osc2.frequency.setValueAtTime(freq * 2, now);

            var g2 = audioCtx.createGain();
            g2.gain.setValueAtTime(0.18, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(vol, now + 0.045);
            gain.gain.setValueAtTime(vol * 0.85, now + durSec * 0.7);
            gain.gain.exponentialRampToValueAtTime(0.0008, now + durSec * 0.98);

            osc.connect(filter);
            osc2.connect(g2);
            g2.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + durSec);
            osc2.stop(now + durSec);
          } else {
            /* 古筝/琵琶：清亮拨弦起音 + 悠长琴弦共鸣衰减 */
            osc.type = 'triangle';
            osc2.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc2.frequency.setValueAtTime(freq * 2, now);

            var g2b = audioCtx.createGain();
            g2b.gain.setValueAtTime(0.22, now);
            g2b.gain.exponentialRampToValueAtTime(0.01, now + durSec * 0.5);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(vol * 1.15, now + 0.018);
            gain.gain.exponentialRampToValueAtTime(0.001, now + durSec * 0.96);

            osc.connect(gain);
            osc2.connect(g2b);
            g2b.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + durSec);
            osc2.stop(now + durSec);
          }
        }

        if (bassFreq > 0) {
          var bOsc = audioCtx.createOscillator();
          var bGain = audioCtx.createGain();
          bOsc.type = 'sine';
          bOsc.frequency.setValueAtTime(bassFreq, now);
          bGain.gain.setValueAtTime(0.001, now);
          bGain.gain.linearRampToValueAtTime(vol * 0.65, now + 0.03);
          bGain.gain.exponentialRampToValueAtTime(0.0008, now + Math.max(0.45, durSec * 0.9));
          bOsc.connect(bGain);
          bGain.connect(audioCtx.destination);
          bOsc.start(now);
          bOsc.stop(now + Math.max(0.48, durSec));
        }
      }
    } catch (e) {}

    bgmTimer = setTimeout(scheduleNextBgmNote, durationMs);
  }

  function suiteShortName(suite) {
    return String(suite.name.split('·')[0]).replace(/[《》]/g, '');
  }

  function restartBgmTimer() {
    if (bgmTimer) clearTimeout(bgmTimer);
    bgmTimer = null;
    var lbl = null;
    try { lbl = document.getElementById('bgm-suite-label'); } catch (e) {}
    var suite = getActiveBgmSuite();
    if (lbl) lbl.textContent = '🎵 ' + suiteShortName(suite);
    if (!prefs.soundEnabled) return;
    scheduleNextBgmNote();
  }

  function toast(msg) {
    try {
      if (root.QX3D_APP && root.QX3D_APP.env) root.QX3D_APP.env().showToast(msg, 'emerald');
    } catch (e) {}
  }

  function cycleBgmSuite(targetIdx) {
    if (typeof targetIdx === 'number') bgmSuiteIdx = targetIdx % BGM_SUITES.length;
    else bgmSuiteIdx = (bgmSuiteIdx + 1) % BGM_SUITES.length;
    bgmStepIdx = 0;
    var suite = getActiveBgmSuite();
    restartBgmTimer();
    toast('🎵 正在奏响：' + suite.name + '（' + suite.drama + '）');
    return suite.id;
  }

  /* ===== 四 · 场景自适应（原 :10054–:10084；映射提纯为 suiteIdxForRegion） ===== */
  /* 灵山派系→3 神话情话 ｜ 光明/华山/青城/唐门→2 刀剑如梦 ｜ 大理/少林/燕子坞→1 难念的经
   * ｜ 襄阳/雁门关/长白/开封→0 铁血丹心 ｜ 其余→4 沧海一声笑（原注释逐字保留） */
  function suiteIdxForRegion(regionId) {
    if (['gumu', 'zhongnan', 'emei', 'wudang', 'wuliang'].indexOf(regionId) >= 0) return 3; /* 《归去来/神话情话》 */
    if (['guangming', 'huashan', 'qingcheng', 'tangmen'].indexOf(regionId) >= 0) return 2;  /* 《刀剑如梦》 */
    if (['dali', 'shaolin', 'yanziwu'].indexOf(regionId) >= 0) return 1;                    /* 《难念的经》 */
    if (['xiangyang', 'yanmenguan', 'changbai', 'kaifeng'].indexOf(regionId) >= 0) return 0;/* 《铁血丹心》 */
    return 4; /* 《沧海一声笑》 */
  }

  function autoAdaptBgmToContext(mode, state, getRegion) {
    if (!prefs.soundEnabled || !prefs.autoSwitchBgm) return;
    if (mode === 'duel') {
      bgmBeforeDuelIdx = bgmSuiteIdx;
      bgmSuiteIdx = 1; /* 战斗自动奏响快节奏《难念的经》 */
      bgmStepIdx = 0;
      restartBgmTimer();
      return;
    }
    if (mode === 'duel_end' && bgmBeforeDuelIdx !== null) {
      bgmSuiteIdx = bgmBeforeDuelIdx;
      bgmBeforeDuelIdx = null;
      bgmStepIdx = 0;
      restartBgmTimer();
      return;
    }
    if (mode !== 'scene' || !state || !getRegion) return;
    var reg = getRegion(state.currentRegion);
    if (!reg) return;
    bgmSuiteIdx = suiteIdxForRegion(reg.id);
    restartBgmTimer();
  }

  /* ===== 五 · 首次手势起奏（原 :10086–:10092 语义；浏览器自播放策略） ===== */
  function bindAutoStart() {
    if (typeof document === 'undefined') return;
    document.addEventListener('pointerdown', function () {
      if (!bgmStartedOnce) {
        bgmStartedOnce = true;
        initAudio();
        restartBgmTimer();
      }
    }, { once: false });
  }

  var api = {
    BGM_SUITES: BGM_SUITES,
    suiteIdxForRegion: suiteIdxForRegion,
    autoAdaptBgmToContext: autoAdaptBgmToContext,
    cycleBgmSuite: cycleBgmSuite,
    toggleSound: toggleSound,
    restartBgmTimer: restartBgmTimer,
    playGuqinNote: playGuqinNote,
    sfx: playGuqinNote,
    getPrefs: getPrefs,
    setPref: setPref,
    isSoundEnabled: function () { return !!prefs.soundEnabled; },
    bindAutoStart: bindAutoStart,
    _internal: function () { return { get: function () { return bgmSuiteIdx; }, set: function (v) { bgmSuiteIdx = v; }, step: function (v) { bgmStepIdx = v; }, before: function () { return bgmBeforeDuelIdx; } }; }
  };

  if (typeof root.QX3D === 'undefined') root.QX3D = {}; /* node require（table-check）侧自建命名空间 */
  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.audio = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
