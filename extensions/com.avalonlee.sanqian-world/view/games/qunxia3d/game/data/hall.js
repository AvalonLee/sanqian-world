/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-hall.cjs 生成，重跑覆盖
 * P4-F 立号：门派名池 6 + 招募三岗 + 门人三句（**零 base64，无占位化**）
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L14745–L14745 · const HALL_NAME_POOL
 * view/games/qunxia/game.html L14746–L14746 · const HALL_RECRUIT_JOBS
 * view/games/qunxia/game.html L14747–L14751 · const HALL_MEMBER_LINES
 * ============================================================ */

    const HALL_NAME_POOL = ['听雨门', '洗剑庐', '归云社', '拾穗门', '远山庐', '问茶社'];
    const HALL_RECRUIT_JOBS = { waiter: '跑堂', escort: '镖师', apothecary: '药徒' };
    const HALL_MEMBER_LINES = {
      waiter: ['他在府里招呼，称呼你东家。', '手上的活还是那一套，不谈外头的路。', '他愿留，也不问拳脚。'],
      escort: ['他把镖旗收进门里，称呼你东家。', '脚程还在，这一段不出城。', '他跟着来，不加一刀一剑。'],
      apothecary: ['他把药匣搁在廊下，称呼你东家。', '医伤的手还在，不看你打得过谁。', '他进府，只管药，不管战。']
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HALL_NAME_POOL: HALL_NAME_POOL, HALL_RECRUIT_JOBS: HALL_RECRUIT_JOBS, HALL_MEMBER_LINES: HALL_MEMBER_LINES };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { HALL_NAME_POOL, HALL_RECRUIT_JOBS, HALL_MEMBER_LINES });
}
