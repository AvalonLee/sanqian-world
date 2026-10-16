/* SQ.Jianghu — 江湖名录取数口（第卌七批 · 设计稿《江湖榜与角色库》①）
 * 名录文本在 `assets/worlds/xiuxian/lexicon-jianghu.js`（200 人 = 16 势力 × 4 席 + 隐世 3 + 散修与新秀 133），
 * 本件**只做取数与对表**，不写档、不掷随机：
 *   ① 世界包契约：通用层不许直读世界全局（审计 D3），名录经 `pack.jianghuPool()` 取；
 *   ② 零存档字段：名录是静态内容、身份固定 ⇒ 不需要世种子（第卌八批才用种子做世内战力浮动）；
 *   ③ 一切读数走表：境界名一律回词表 `realm.N`，战力/交互屏蔽一律不在本件里造口径。
 * ⚠️ 消费者名单（第册一批②③刷新）：势力卡「掌门 / 太上」一行（第卌七批）‖ 天骄战力口径
 *    `Prodigy.powerOf` 读 `offOf`（际遇档 −1~+2 ⇒ 同境界上下限差 3 档 ≈ 27 倍）‖ 江湖榜四榜装配
 *    `Prodigy.board4` 读 `bandOf` / `fillOf` / `hermits` / `gearOf`（榜面五项与背景席位）。
 *    本件仍**不写档、不掷随机**：`gearOf` 用确定性哈希，读三次档数字不许变。 */
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

  /* ══ 第册一批②③：榜带 / 际遇战力 / 五项派生 / 榜面席位 ═════════════════
   * 一刀切在「境界带」上（设计稿 §二）：天 ≥8 ‖ 地 6~7 ‖ 玄 4~5 ‖ 黄 ≤3，
   * **序号即榜单序**（天榜 = 0），同一角色恒在一榜——跨带即换榜（播报在 prodigy.js）。
   * 这里只放「名录自己的口径」：榜面装配与播报归 `SQ.Prodigy.board4` / `tick`，
   * 因为要读玩家战力与 mods，而本件不碰 mods、不碰存档。 */
  var BANDS = [8, 6, 4, 0];
  function bandOf(rlm) {
    var r = rlm || 0;
    for (var i = 0; i < BANDS.length; i++) if (r >= BANDS[i]) return i;
    return BANDS.length - 1;
  }
  /* 际遇档：名录内 off ∈ {−1, 0, 1, 2}（实测 20/73/74/33）；认不出（旧档无 rid / 脏 rid）一律 0
   * ⇒ 旧档战力与改前**逐字相同**，这条口径只对新世的具名出场者生效。 */
  function offOf(pack, rid) {
    var p = rid ? of(pack, rid) : null;
    return p && p.off ? p.off : 0;
  }
  /* 战力口径：**不新立乘区，改偏移境界表**（第卌七批设计稿 §五 · 第卅八批「第三套战力口径」的教训）
   * 同境界上下限差 = 3 档 ≈ 27 倍（REALMS 相邻档恒 ≈3×），顶钳真仙、地板钳练气。 */
  function realmEffOf(D, rlm, off) {
    return Math.max(0, Math.min(D.REALMS.length - 1, (rlm || 0) + (off || 0)));
  }
  /* 榜面背景席（未相识者）的战力：只取名录的 rlm + off，不吃资质（资质是相识后才掷的） */
  function powerOf(pack, D, p) {
    if (!p) return 0;
    return (D.REALMS[realmEffOf(D, p.rlm, p.off)] || {}).power || 0;
  }
  /* 名号/称号/明细的屏蔽位：隐世三席一切显示「？？？」且不给任何交互入口（裁定 2） */
  function hidden(p) { return !!(p && p.hid); }

  /* 确定性哈希（**不掷随机**：榜面每次渲染必须同一人同一件法宝，读三次档数字不许变） */
  function hashOf(s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  /* 榜面「兵刃 / 法宝 / 主修」三栏（设计稿 §三：兵刃取名池索引，法宝与主修由名录 id 派生、**不入档**）
   * 法宝与功法都按该人**当前境界**过一遍门槛（`reqs.realm`）再取模 ⇒ 不会出现练气散修持先天法宝。
   * 返回 id（视图自己经词表取名 ⇒ 视图零自造文本）；池空一律 null，调用方不渲染那一栏。 */
  function gearOf(pack, D, rid, rlm) {
    var p = of(pack, rid);
    if (!p) return { wp: null, tb: null, art: null };
    var out = { wp: (pack.jianghuPool().wp || [])[p.wp] || null, tb: null, art: null };
    var h = hashOf(rid), r = rlm != null ? rlm : p.rlm;
    var tl = ((pack.treasures || {}).LIST || []).filter(function (x) {
      return ((x.reqs || {}).realm || 0) <= r;
    });
    if (tl.length) out.tb = tl[h % tl.length].id;
    var am = pack.artsMap ? pack.artsMap() : null, al = [];
    for (var k in am) if (((am[k].reqs || {}).realm || 0) <= r) al.push(k);
    al.sort();                                    /* 排序去 Object 键序依赖（跨引擎/跨构建恒等） */
    if (al.length) out.art = al[Math.floor(h / 7) % al.length];
    return out;
  }

  /* 某榜的「名录补位席」：该带内、非隐世、且**不在相识名录里**的人，按战力降序
   * （同战力按 id 升序 ⇒ 幂等：两次装配逐字同序，读档重开不会换人） */
  function fillOf(pack, D, band, excludeRid) {
    return pool(pack).persons.filter(function (p) {
      return !p.hid && bandOf(p.rlm) === band && !(excludeRid && excludeRid[p.id]);
    }).sort(function (a, b) {
      var d = powerOf(pack, D, b) - powerOf(pack, D, a);
      return d ? d : (a.id < b.id ? -1 : 1);
    });
  }
  /* 隐世三席（恒在天榜最前） */
  function hermits(pack) {
    return pool(pack).persons.filter(function (p) { return p.hid; });
  }

  SQ.Jianghu = {
    of: of, seatsOf: seatsOf, masterOf: masterOf, elderOf: elderOf, count: count, pool: pool,
    bandOf: bandOf, offOf: offOf, realmEffOf: realmEffOf, powerOf: powerOf, hidden: hidden,
    gearOf: gearOf, fillOf: fillOf, hermits: hermits, hashOf: hashOf
  };
})();
