/* .tests/smoke.js — 冒烟断言的壳（正文已切片）
 *
 * 第册二批（2026-10-17）按断言族把原 10,939 行单件切成 `.tests/smoke/NN-*.js` 十片：
 * 动机 = 本项目由 AI 逐批开发，单件 842KB 意味着「改一条断言也要读整本」；切片后一次任务只碰所属那一片。
 * ⚠️ 执行语义与切分前**逐字相同**：每片只把自己的正文注册成一个函数（frag），本壳在 run() 里把十段正文拼回
 *   **同一个 async Function** 执行 ⇒ 同一作用域、同一 var 提升、同一「前片局部被后片读到」的泄漏语义。
 *   拼接结果与原 run() 体不等时，迁移件直接拒绝落盘（自检见 split2.cjs，本仓外一次性件）。
 * ⚠️ 320 案顺序共享同一沙箱态 ⇒ 单片不可独立跑；装载序 = 本件先、十片依次，由 run-smoke.cjs 与 smoke.html 同源。
 * ⚠️ 断言编号与输出顺序 = 账本锚（docs/FACTS.md 与各卷引用靠它）；新增断言写进所属族那片、按编号追加到该片末尾。
 * 编号对齐《工程规范与验收计划》§四 文档条目（P1 扩展项为 E1~E5）；#104 gateMod 属古武 P6。
 * 运行：node .tests/run-smoke.cjs（无头 vm 沙箱）‖ 浏览器直开 .tests/smoke.html（无桥 localStorage 回退分支）。
 */
(function () {
  var SQ = window.SQ;
  var R = [];
  function ok(id, name, cond, detail) { R.push({ id: id, name: name, ok: !!cond, detail: detail || '' }); }

  function seedWorld(realm, lastSaveOffsetMs) {
    var ws = SQ.Worlds.xiuxian.pack.initialState();
    ws.realm = realm || 0;
    ws.lastSave = Date.now() - (lastSaveOffsetMs || 0);
    return ws;
  }
  async function seedSave(realm, offset) {
    await SQ.save({
      v: SQ.V,
      profile: { name: '测试道人', talents: [], worldId: 'xiuxian', worldName: '测试界', createdAt: Date.now() },
      worlds: { xiuxian: seedWorld(realm, offset) },
      meta: { unlockedWorlds: ['xiuxian'] }
    });
  }

  var FRAGS = [];
  var AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
  window.SQSmoke = {
    /* 注册一片正文（fn 只取源码文本，绝不就地执行）*/
    frag: function (label, fn) { FRAGS.push({ label: label, src: String(fn) }); },
    run: async function () {
      R = [];
      if (!FRAGS.length) throw new Error("smoke: 一片正文都没挂上（.tests/smoke/*.js 漏载 ⇒ 零断言假绿）");
      /* 剥掉每片 `function () {` 的头与尾括号，拼成单一函数体后一次执行 */
      var src = FRAGS.map(function (f) { return f.src.replace(/^[^{]*\{/, "").replace(/\}\s*$/, ""); }).join("\n");
      await new AsyncFn("SQ", "ok", "seedWorld", "seedSave", src + "\n//# sourceURL=smoke.js")(SQ, ok, seedWorld, seedSave);
      return R;
    }
  };
})();