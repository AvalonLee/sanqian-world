/* qunxia-home.js — 武侠世界主壳（山河棋盘 · 自包含子应用）
 * 宿主只负责全屏挂载与生命周期；正文、样式、存档都在 games/qunxia/ 内自成一体。
 * 游戏侧自行处理宿主存储镜像，本件不直接调用平台 API。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.UI = SQ.UI || {};
  var frame = null;

  function mount(cf) {
    var host = document.getElementById('shell-main');
    if (!host) return;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'qunxia-frame';
      frame.src = 'games/qunxia/game.html';
      frame.setAttribute('title', 'jianghu board');
      frame.style.cssText = 'flex:1;width:100%;height:100%;border:0;display:block;background:#171310';
    }
    if (frame.parentNode !== host) host.appendChild(frame);
  }

  /* 游戏自己按回合重绘，宿主 tick 不碰 iframe 内容 */
  function refresh(cf) {}

  SQ.UI.qunxiaHome = { mount: mount, refresh: refresh };
})();
