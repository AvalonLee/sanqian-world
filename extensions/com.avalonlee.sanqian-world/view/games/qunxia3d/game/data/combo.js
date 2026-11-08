/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-combo.cjs 生成，重跑覆盖
 * FORM_META 三形 + SHI_META 三势 + FORM_SHI_COMBO_NAMES 成招名表
 * 源切片（逐字节原样，仅追加导出垫片）：
 * view/games/qunxia/game.html L6416–L6420 · const FORM_META
 * view/games/qunxia/game.html L6421–L6425 · const SHI_META
 * view/games/qunxia/game.html L6426–L6433 · const FORM_SHI_COMBO_NAMES
 * ============================================================ */

    const FORM_META = {
      fist: { id: 'fist', label: '拳', icon: '👊', tip: '崩拳拍拿连环靠' },
      sword: { id: 'sword', label: '剑', icon: '🗡️', tip: '点刺云剑追风刺' },
      qinggong: { id: 'qinggong', label: '轻功', icon: '💨', tip: '踏影落絮飞踏' }
    };
    const SHI_META = {
      break: { id: 'break', label: '破防', icon: '💥', tip: '削防/硬直，连招起手' },
      parry: { id: 'parry', label: '卸力', icon: '🛡️', tip: '减伤/反震，可空过' },
      chase: { id: 'chase', label: '追击', icon: '⚡', tip: '破绽上追加段，成招收束' }
    };
    const FORM_SHI_COMBO_NAMES = {
      'fist|break|chase': '崩拳·连环靠',
      'fist|break|parry|chase': '崩拳·化劲追打',
      'sword|break|chase': '点刺·追风',
      'sword|break|parry|chase': '云剑·追风连刺',
      'qinggong|break|chase': '踏影·飞踏追影',
      'qinggong|break|parry|chase': '落絮·追影'
    };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FORM_META: FORM_META, SHI_META: SHI_META, FORM_SHI_COMBO_NAMES: FORM_SHI_COMBO_NAMES };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX3D_DATA = __g.QX3D_DATA || {};
  Object.assign(__g.QX3D_DATA, { FORM_META, SHI_META, FORM_SHI_COMBO_NAMES });
}
