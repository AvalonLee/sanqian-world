/* ============================================================
 * 生成物 · 禁手改 —— 由 game/scripts/extract-demo-geo.cjs 生成，重跑覆盖
 * 来源切片：view/games/qunxia3d/demo-data.js（退役抽取源）· 投影坐标 30 条（x=(lon-82)*20 映射，
 *   三岛钉死松弛后取值）+ 真实黄河/长江折线 2 条；events 演示占位退役（crises 走 QX3D_APP.regionEvent）
 * 消费：board3d.js 世界图（REGIONS 本体走 QX3D_DATA.REGIONS，本件只补投影坐标与河道）
 * ============================================================ */

var GEO_POINTS = {"luoyang":{"x":606.5,"y":292.7},"shaolin":{"x":624.2,"y":325.9},"huashan":{"x":572,"y":308.2},"changan":{"x":535.4,"y":298.4},"zhongnan":{"x":545.1,"y":334.8},"wudang":{"x":577.7,"y":354},"xiangyang":{"x":614.4,"y":362.7},"jiangnan":{"x":777.5,"y":370.9},"taohua":{"x":807,"y":401},"emei":{"x":426.3,"y":413.8},"dali":{"x":362.2,"y":482},"guangming":{"x":90,"y":272},"xueshan":{"x":266,"y":372},"kaifeng":{"x":651.5,"y":299.7},"gumu":{"x":508.8,"y":325.2},"yanziwu":{"x":740,"y":370.3},"linan":{"x":758.1,"y":403.4},"tangmen":{"x":492,"y":406},"qingcheng":{"x":431.7,"y":376.3},"hengyang":{"x":612,"y":462},"wuliang":{"x":380.8,"y":515},"wudu":{"x":510,"y":482},"heimuya":{"x":628.3,"y":249.8},"yanmenguan":{"x":606.5,"y":214.8},"wutaishan":{"x":644.2,"y":215.4},"lingjiu":{"x":98,"y":130},"xingxiu":{"x":296,"y":296},"changbai":{"x":905,"y":160},"xiakedao":{"x":846,"y":480},"binghuodao":{"x":830,"y":17}};
var RIVERS = [[[300,296],[430,276],[494,188],[580,192],[566,270],[570,304],[632,302],[696,284],[740,240],[792,236]],[[190,330],[280,420],[340,400],[358,462],[452,424],[491,409],[586,386],[646,388],[680,406],[736,359],[798,372]]];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GEO_POINTS: GEO_POINTS, RIVERS: RIVERS };
} else {
  var __g = (typeof window !== "undefined") ? window : globalThis;
  __g.QX_DEMO_GEO = { geo: GEO_POINTS, rivers: RIVERS };
}
