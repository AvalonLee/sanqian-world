/* .tests/run-smoke.cjs — 无头冒烟运行器（node vm 沙箱，无浏览器依赖）
 * 沙箱与加载顺序统一由 .tests/sandbox.cjs 提供（与 view/index.html <script> 顺序同源）。
 * 用法：node .tests/run-smoke.cjs   （在扩展根目录）
 * 输出：逐项 PASS/FAIL + SMOKE_ALL_GREEN n/n（CI 判据）。
 * 第册二批起正文切片在 `.tests/smoke/NN-*.js`：装载序 = 壳（smoke.js）先、十片按文件名字典序依次；
 * 十片只注册正文，真正执行由壳把正文拼回同一个 async Function（见 smoke.js 头注）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./sandbox.cjs');

const PARTS = fs.readdirSync(path.join(__dirname, 'smoke')).filter(f => /^\d[\w-]*\.js$/.test(f)).sort();
if (PARTS.length !== 10) { console.log('SMOKE_FAILED 切片数 ' + PARTS.length + ' ≠ 10（.tests/smoke/ 缺件或多件）'); process.exit(1); }
const { sandbox } = load(['.tests/smoke.js'].concat(PARTS.map(f => '.tests/smoke/' + f)));

(async () => {
  const results = await sandbox.window.SQSmoke.run();
  /* 条数闸：漏挂一片 = 少几十条断言，而「全绿」照打 ⇒ 300 是地板不是目标值，不许随读数上调 */
  if (results.length < 300) { console.log('SMOKE_FAILED 断言 ' + results.length + ' 条 < 300（切片漏挂 ⇒ 零断言假绿）'); process.exit(1); }
  let fails = 0;
  for (const r of results) {
    if (!r.ok) fails++;
    console.log((r.ok ? 'PASS' : 'FAIL') + ' #' + r.id + ' ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
  }
  console.log(fails === 0 ? 'SMOKE_ALL_GREEN ' + results.length + '/' + results.length : 'SMOKE_FAILED ' + fails);
  process.exit(fails === 0 ? 0 : 1);
})();
