/* assets/worlds/wuxia/data.js — 武侠世界数据表常量（注册进 SQ.WDATA，仅供本包 index.js 取用）
 *
 * 册154（S1-a）立卷：**本批只给空架子**，正典数据按批填入——
 *   · S1-b：REALMS（境界 10 档 + 功力阈值）/ ARTS（36 部 + 入门 10 + 秘籍 18）/ GEAR_TIERS
 *   · S2-b：ZONES（13 处地界 + 子场景）
 *   · S2-c：CAST（40 人）/ REL_PAIRS（70 对）/ SECTS（26 门）
 *   · S2-a：EVENTS（武侠事件池）
 * 正典出处见 docs/武侠世界/ 六卷；本文件是生成物，**不许手改**（改源卷后按批重生成）。
 *
 * ⚠️ 全局别名 `SQ.WDATA` 只许本包与专门数据件读（审计 D3 的旁路纪律）：
 *   通用层与视图一律走 `pack.data`，不许直读本全局。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.WDATA = {
    /* 正典版本锚：与 docs/武侠世界/ 各卷版本对齐，S1-b 起随批升（不是扩展版本） */
    canon: { jianghu: 'v1.1', arts: 'v1.0', cast: 'v1.0', numeric: 'v1.0', narrative: 'v1.0' },

    /* 境界 10 档（世界设定 §五 / 数值与经济 §三）—— S1-b 填 */
    REALMS: [],
    /* 武功表（武学全录 §二~§三）—— S1-b 填 */
    ARTS: [],
    /* 兵刃品阶 —— S1-b 填 */
    GEAR_TIERS: [],
    /* 地界 13 处（人物与地方 §四）—— S2-b 填 */
    ZONES: [],
    /* 门派 26 门（江湖设定 §四）—— S2-c 填 */
    SECTS: [],
    /* 人物 40 人（人物与地方 §一）—— S2-c 填 */
    CAST: [],
    /* 奇遇事件池 —— S2-a 填 */
    EVENTS: [],
    /* 通用事件位（S1-a 先指空池，接通用池时改指 SQ.Events.common 形状） */
    COMMON_EVENTS: []
  };
})();
