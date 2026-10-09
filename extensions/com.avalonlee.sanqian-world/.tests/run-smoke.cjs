/* .tests/run-smoke.cjs — 无头冒烟运行器（node vm 沙箱，无浏览器依赖）
 * 沙箱与加载顺序统一由 .tests/sandbox.cjs 提供（与 view/index.html <script> 顺序同源）。
 * 用法：node .tests/run-smoke.cjs   （在扩展根目录）
 * 输出：逐项 PASS/FAIL + SMOKE_ALL_GREEN n/n（CI 判据）。
 */
'use strict';
const { load } = require('./sandbox.cjs');

const { sandbox } = load(['.tests/smoke.js']);

(async () => {
  const results = await sandbox.window.SQSmoke.run();
  let fails = 0;
  for (const r of results) {
    if (!r.ok) fails++;
    console.log((r.ok ? 'PASS' : 'FAIL') + ' #' + r.id + ' ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  }
  console.log(fails === 0 ? 'SMOKE_ALL_GREEN ' + results.length + '/' + results.length : 'SMOKE_FAILED ' + fails);
  process.exit(fails === 0 ? 0 : 1);
})();
