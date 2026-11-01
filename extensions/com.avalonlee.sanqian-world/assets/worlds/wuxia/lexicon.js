/* assets/worlds/wuxia/lexicon.js — 武侠世界词表分卷（注册进 SQ.LEX.wuxia）
 * 词表纪律（工程规范 §1.2）：本文件是 CJK 白名单；index.js / data.js 等逻辑文件禁止裸中文。
 *
 * 册154（S1-a）立卷时的取舍：**只放最小的「世界自称」四键**，其余留给按批填充。
 * 理由 = 词表键一旦立就进 A6 孤儿键射程（声明了没人读 ⇒ 审计红），而 S1-a 还没有任何
 * 消费方。世界卡上的名称与标签走 common 卷（`world.wuxia.name` / `world.tag.*`），
 * 不在这里重复——两处同键会漂。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.lexRegister('wuxia', {
    /* 资源二称（页脚与日志模板用；消费点 = assets/systems/{actions,arts,events,gear,realm,idle}.js
     * 的 `SQ.t('resource.*', null, worldId)`）。⚠️ 只收**已有消费点**的键：词表声明后无人读
     * ⇒ A6 孤儿键直接红（初稿多写一枚 `resource.fame` 就是踩这条，已删）。 */
    'resource.primary': '功力',
    'resource.currency': '银两'
  });
})();
