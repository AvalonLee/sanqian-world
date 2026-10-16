/* SQ.Jianghu — 江湖名录取数口（第卌七批 · 设计稿《江湖榜与角色库》①）
 * 名录文本在 `assets/worlds/xiuxian/lexicon-jianghu.js`（200 人 = 16 势力 × 4 席 + 隐世 3 + 散修与新秀 133），
 * 本件**只做取数与对表**，不写档、不掷随机：
 *   ① 世界包契约：通用层不许直读世界全局（审计 D3），名录经 `pack.jianghuPool()` 取；
 *   ② 零存档字段：名录是静态内容、身份固定 ⇒ 不需要世种子（第卌八批才用种子做世内战力浮动）；
 *   ③ 一切读数走表：境界名一律回词表 `realm.N`，战力/交互屏蔽一律不在本件里造口径。
 * ⚠️ 本件目前只被「势力卡掌门 / 太上一行」消费（第卌七批）。第卌八批会把际遇档接进战力
 *    （`REALMS[clamp(rlm+off)]`，顶档钳真仙、地板钳练气，**不新造乘区**），第卌九批把
 *    隐世三席与 NPC 宗主的「不可交互」做成一个函数供榜面问——都在各自落地的那一批再加，
 *    先写出来就是「只有测试在调」的假在跑形状。 */
(function () {
  var SQ = (window.SQ = window.SQ || {});

  function pool(pack) {
    var P = pack && pack.jianghuPool ? pack.jianghuPool() : null;
    return P || { wp: [], persons: [] };
  }
  /* 名录内 id 唯一 ⇒ 取数口按 id；认不出（脏引用）一律 null，调用方自守 */
  function of(pack, id) {
    var ps = pool(pack).persons;
    for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
    return null;
  }
  /* 某派的四席（太上 / 掌门 / 首座 / 长老）——名录里每派恰 4 人，顺序即表内顺序 */
  function seatsOf(pack, fcId) {
    return pool(pack).persons.filter(function (p) { return p.fc === fcId; });
  }
  /* 掌门（第二席）与太上（第一席）供势力卡取数：认不出该派时回落 null（视图不编名字） */
  function masterOf(pack, fcId) {
    var s = seatsOf(pack, fcId);
    return s.length > 1 ? s[1] : (s.length ? s[0] : null);
  }
  function elderOf(pack, fcId) {
    var s = seatsOf(pack, fcId);
    return s.length ? s[0] : null;
  }
  function count(pack) { return pool(pack).persons.length; }

  /* ⚠️ 本件在第卌七批只有「势力卡掌门/太上」一个真实消费者：兵刃名（池内索引）、际遇档接进战力、
   *   隐世与 NPC 宗主的「不可交互」判定都随第卌八批 / 第卌九批各自的结算与界面落地时再加——
   *   先写出来就是「只有测试在调」的假在跑形状（本仓反复登记过的那一族）。 */
  SQ.Jianghu = { of: of, seatsOf: seatsOf, masterOf: masterOf, elderOf: elderOf, count: count, pool: pool };
})();
