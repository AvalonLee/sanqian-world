/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-court.cjs 生成，重跑覆盖
 * P4-C 朝廷风声：边关/北地地界清单（buildCourtRumorPool 的「此处/北地」判据）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L13366–L13366 · const COURT_BORDER_REGIONS
 * view/games/qunxia/game.html L13367–L13367 · const COURT_NORTH_REGIONS
 * ============================================================ */

    const COURT_BORDER_REGIONS = ['yanmenguan', 'xingxiu', 'xueshan', 'guangming', 'lingjiu', 'changbai'];
    const COURT_NORTH_REGIONS = ['yanmenguan', 'heimuya', 'wutaishan', 'changbai'];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COURT_BORDER_REGIONS: COURT_BORDER_REGIONS, COURT_NORTH_REGIONS: COURT_NORTH_REGIONS };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { COURT_BORDER_REGIONS, COURT_NORTH_REGIONS });
}
