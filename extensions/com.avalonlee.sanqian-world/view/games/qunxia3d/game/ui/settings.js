/* settings.js — qunxia3d 设置中心（册292 · M6 余量「settings 页」）
 *
 * 立因：册289 audio.js 偏差登记「设置中心模态不移植（随 settings 页批裁）」——本件即该批消费面：
 * 把 ui/audio.js 件内 prefs（`qunxia-audio-v1`）的四个键全部接上屏（soundEnabled / bgmVolume /
 * sfxVolume / autoSwitchBgm），音量滑块照原版 renderSettingsModalBody 的 range 形制
 * （min=0 max=100 oninput 实时回写）。
 *
 * 生效口径（引擎事实，无需 refresh 通道）：audio.js 的 BGM/SFX gain 都是**逐音符/逐音效实时读
 * prefs**（BGM vol = bgmVolume×0.14 在每个音符起振时取值；SFX = 0.16×sfxVolume 同理）⇒
 * setPref 后下一音符/下一音效立即生效。琴音开关复用 audio.toggleSound() 单一写口（它内部同步
 * toolbar 🔊 钮文案）。
 *
 * 偏差登记（对表豁免口径，件头注）：原版设置中心六键中的 particlesEnabled / largeFontMode /
 * floatingTextEnabled 三键**不移植**——qunxia3d 无对应系统（粒子为 three.js 场景常驻设计、
 * 浮字与字体缩放走 3D HUD 体系），硬塞空壳即「不可投生也要写真逻辑」的反例。设置入口 = toolbar
 * 「⚙️ 设置」钮（入世后显，与 🔊/🎵 同层）。〔册293 改口：模态壳原为本件自绘 qxm-sheet 同构
 * （panels 私有函数未导出），现改挂 🆕 ui/sheet.js 公共壳件，gazette 同用〕
 *
 * 走查：verify-ui-qunxia3d Q3D13a/13b（开模态四控件在场读数即 prefs ‖ 滑块/开关动作落
 * `qunxia-audio-v1` 且重开保持）。
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  var document = root.document;

  function audioOf() {
    return (root.QX3D && root.QX3D.ui && root.QX3D.ui.audio) || null;
  }

  /* ── 设置中心模态（册293 改挂 ui/sheet.js 公共壳——panels 私有函数不再复刻）── */
  function open() {
    var audio = audioOf();
    var sheet = (root.QX3D && root.QX3D.ui && root.QX3D.ui.sheet) || null;
    if (!audio || !sheet || !document) return;

    var p = audio.getPrefs();
    var pct = function (v) { return Math.round((Number(v) || 0) * 100); };

    var m = sheet.openSheet('设置中心', '琴房 · 音律',
      '<div class="qxm-settings">' +
      /* 琴音总开关（audio.toggleSound 单一写口） */
      '<div class="qxm-set-row"><label for="qxs-sound">🔊 琴音</label>' +
      '<input type="checkbox" class="qxm-switch" id="qxs-sound"' + (audio.isSoundEnabled() ? ' checked' : '') + '>' +
      '<span class="qxm-set-note">总开关 · 关闭后琴曲与音效俱静</span></div>' +
      /* BGM 音量（原版 range 形制 min0 max100） */
      '<div class="qxm-set-row"><label for="qxs-bgm">琴曲音量</label>' +
      '<input type="range" min="0" max="100" value="' + pct(p.bgmVolume) + '" id="qxs-bgm">' +
      '<span class="qxm-set-val" id="qxs-bgm-val">' + pct(p.bgmVolume) + '%</span></div>' +
      /* SFX 音量 */
      '<div class="qxm-set-row"><label for="qxs-sfx">音效音量</label>' +
      '<input type="range" min="0" max="100" value="' + pct(p.sfxVolume) + '" id="qxs-sfx">' +
      '<span class="qxm-set-val" id="qxs-sfx-val">' + pct(p.sfxVolume) + '%</span></div>' +
      /* 自动切曲 */
      '<div class="qxm-set-row"><label for="qxs-auto">场景切曲</label>' +
      '<input type="checkbox" class="qxm-switch" id="qxs-auto"' + (p.autoSwitchBgm ? ' checked' : '') + '>' +
      '<span class="qxm-set-note">对决自动奏《难念的经》· 地界按派系换曲</span></div>' +
      '<div class="qxm-set-note">音量改动自下一音符 / 下一音效起生效（引擎逐音实时取值）。原版设置中心的粒子特效 / 大字模式 / 浮字三键无 3D 对应系统，不移植（件头注偏差登记）。</div>' +
      '</div>');
    if (!m) return; /* 单实例独占：已有弹窗在场不覆盖 */

    var bindSwitch = function (id, apply) {
      var c = m.querySelector('#' + id);
      if (!c) return;
      c.addEventListener('change', function () { apply(!!c.checked); });
    };
    var bindRange = function (id, valId, key) {
      var r = m.querySelector('#' + id);
      var val = m.querySelector('#' + valId);
      if (!r || !val) return;
      r.addEventListener('input', function () {
        var v = (Number(r.value) || 0) / 100;
        audio.setPref(key, v);
        val.textContent = r.value + '%';
      });
    };

    bindSwitch('qxs-sound', function () { audio.toggleSound(); });
    bindRange('qxs-bgm', 'qxs-bgm-val', 'bgmVolume');
    bindRange('qxs-sfx', 'qxs-sfx-val', 'sfxVolume');
    bindSwitch('qxs-auto', function (v) { audio.setPref('autoSwitchBgm', v); });
  }

  var api = { open: open };
  if (typeof root.QX3D === 'undefined') root.QX3D = {};
  root.QX3D.ui = root.QX3D.ui || {};
  root.QX3D.ui.settings = api;
  return api;
});
