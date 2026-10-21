/* 更新公告浮层（第册四批 · 视图代码外置的第一个试点件 · 设计正典 = UI 卷 §3.4e）
 * 判定 = 「档案里已读的公告号 ≠ 本件的公告号」；关闭只认那颗按钮（点遮罩不关 ⇒ 本件刻意不进 MASKS，
 * 与「奇遇抉择」同一套纪律：要玩家亲手了结，不许一划就走把公告吞掉）。
 * ⚠️ 记的是**公告号**不是扩展版本号：升版只改 `manifest.json` 一处那条纪律（工程规范 §7.1）不被破坏，
 *    而且同一版想重发一次公告，只改这里的号即可。文案全在词表，本件只出结构与判定（视图零自造文本）。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});
  /* shortcut: 改这一行公告号 ⇒ 测试侧还有 **15 处字面 / 13 个文件**（`.tests/fixture-save.json` 1 ‖
   * `.tests/smoke/10-life-heir-jianghu.js` 2（第册二批起冒烟正文已切片，#320 在这一片，两个实参各一）‖
   * 11 篇 `verify-ui-*.cjs` 共 12（journal 那篇 2），那些串的意思是「这档已读过公告」，不改就整页被浮层盖住、
   * 点击类走查各红 30s。第册十三批实测口径：`grep -rlo 旧号 .tests view assets` = 16 处 / 14 个文件（含本件一枚）。
   * 一条命令：`grep -rl 旧号 .tests view | xargs sed -i 's/旧号/新号/g'`，改完必须再 grep 一次残留。 */
  var ID = '2026-10-21-1';
  /* 七行逐条字面取词（**不走数组拼键**）：A2 的静态引用对账与 A6 的孤儿键反向扫描都按字面 key 查，
   * 拼出来的键名它们照不到 ⇒ 一旦有人改数组，词表里就会留下没人读的键而无人报警。 */
  function lineTexts(wid) {
    return [
      SQ.t('update.note.l1', null, wid), SQ.t('update.note.l2', null, wid),
      SQ.t('update.note.l3', null, wid), SQ.t('update.note.l4', null, wid),
      SQ.t('update.note.l5', null, wid), SQ.t('update.note.l6', null, wid),
      SQ.t('update.note.l7', null, wid)
    ];
  }
  /* 已读号由调用方把**内存态里那一份**递进来（本件不碰持久层）：存档在平台上走存储桥、
   * 只有无桥预览才回退浏览器本地存储，且落盘串可能是压缩态 ⇒ 视图件自己去读那一条既读错载体、
   * 又要在本件复刻 core.js 的三态解码，纯负债。判定只看「传进来的值 ≠ 本件公告号」。 */
  function needed(seen) { return seen !== ID; }
  function show(wid) {
    var box = document.getElementById('mun-text'), go = document.getElementById('mun-go'),
      m = document.getElementById('modal-updatenote');
    if (!box || !go || !m) return false;
    document.getElementById('mun-title').textContent = SQ.t('update.note.title', null, wid);
    box.textContent = '';
    lineTexts(wid).forEach(function (txt) {
      var row = document.createElement('div');
      row.style.cssText = 'margin:7px 0;line-height:1.65';
      row.textContent = txt;
      box.appendChild(row);
    });
    go.textContent = SQ.t('update.note.close', null, wid);
    m.classList.remove('hide');
    return true;
  }
  function hide() {
    var m = document.getElementById('modal-updatenote');
    if (m) m.classList.add('hide');
  }
  SQ.UI = SQ.UI || {};                    /* 视图件命名空间，与 SQ.Idle / SQ.Mods 同一家族体例 */
  SQ.UI.updateNote = { id: ID, needed: needed, show: show, hide: hide };
})();
