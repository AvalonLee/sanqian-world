/* 通用小工具（C1/C2 收口 · 单一事实源）
 * 背景：num/obj/arr/pick/randInt 曾在 10 个系统文件里各自重复定义（实现逐字相同），
 *       pickWeighted 在 events/gear/shop 三处同构重复。此文件统一收口，各文件按需取别名。
 * 纪律：实现与原重复版本逐字一致，零行为变化（pickPairs 保留原无保护实现）。 */
(function () {
  var SQ = window.SQ || (window.SQ = {});

  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function obj(v, d) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : d; }
  function arr(v, d) { return Array.isArray(v) ? v : d; }
  function pick(a) { return a && a.length ? a[Math.floor(Math.random() * a.length)] : null; }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* 加权单抽：list = [{weight|w, ...}]，权重和为 0 返回 null */
  function pickWeighted(list) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += (list[i].weight != null ? list[i].weight : list[i].w);
    if (total <= 0) return null;
    var r = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      r -= (list[i].weight != null ? list[i].weight : list[i].w);
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  }

  /* 加权单抽：pairs = [[w, v], ...]，返回 v（原 gear/shop 实现，无零和保护） */
  function pickPairs(pairs) {
    var total = 0, i;
    for (i = 0; i < pairs.length; i++) total += pairs[i][0];
    var r = Math.random() * total;
    for (i = 0; i < pairs.length; i++) { r -= pairs[i][0]; if (r < 0) return pairs[i][1]; }
    return pairs[pairs.length - 1][1];
  }

  SQ.util = {
    num: num, obj: obj, arr: arr, pick: pick, randInt: randInt,
    pickWeighted: pickWeighted, pickPairs: pickPairs
  };
})();