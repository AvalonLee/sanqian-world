/* .tests/sandbox.cjs — 无头 vm 沙箱装载器（node，无浏览器依赖）
 * 加载顺序唯一事实源 = view/index.html 的 <script src> 序列（2026-10-14 结构整治批A 改）。
 * 立因：此前这里是 51 行硬编码抄本，与 view/module 两份 HTML + 交付镜像两份 + .tests/smoke.html
 *   共五份并列；注释虽自称「必须与 view/index.html 完全一致」，却没有任何一关在守。加一个系统文件
 *   只改 HTML ⇒ 沙箱装载缺件 = 测试假绿 + 真机白屏。删抄本优于加门禁。
 * 自校验（任一不满足即拒绝装载，绝不拿残缺顺序继续跑）：解析出 ≥50 项、末项是 core.js、每项文件真实存在。
 * 三个消费件（run-smoke / sim-pacing / sim-event-economy）共用本文件。
 * 用法：const { SQ, sandbox } = require('./sandbox.cjs').load(['.tests/smoke.js']);
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

/* 从宿主 HTML 抽装载序列：src 一律归一为相对扩展根的正斜杠路径。
 * 从交付镜像根起跑时读的是镜像自己的 view/index.html（B9 守两份逐字节相同），故无需分支。 */
function readOrder(html) {
  const src = fs.readFileSync(html, 'utf8');
  const out = [];
  const re = /<script[^>]*\bsrc="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(src))) {
    const f = m[1].replace(/^\.\.\//, '').replace(/^\.\//, '');
    /* 第册四批：视图代码开始外置 ⇒ `view/` 同目录的**视图专属件**（updatenote.js 等）不是引擎装载序列的一部分，
     * 不进本清单（沙箱只重放引擎）。它们的在位与语法由审计 D2（存在性 + 必须落在 view 目录下）、D5（可解析）、
     * A1/A3（CJK 与 DOM id 对账按同目录 js 一并扫）守，不会因为换了载体变成没人查。 */
    if (f.startsWith('assets/')) out.push(f);
  }
  if (out.length < 50) throw new Error('sandbox: <script src> 只解析出 ' + out.length + ' 项（< 50），清单或 HTML 已漂：' + html);
  if (!/core\.js$/.test(out[out.length - 1])) throw new Error('sandbox: 末项不是 core.js，装载顺序不可信：' + out[out.length - 1]);
  out.forEach((f) => { if (!fs.existsSync(path.join(ROOT, f))) throw new Error('sandbox: 清单里的文件不存在 ' + f); });
  return out;
}

const ORDER = readOrder(path.join(ROOT, 'view', 'index.html'));

/* localStorage mock（无桥预览分支） */
function mkStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
}

/**
 * @param {string[]} extra 追加加载的文件（相对扩展根，如 '.tests/smoke.js'）
 * @param {object} opts {quiet: 屏蔽沙箱内 console, noCodec: 不注入编解码所需的 Web 标准全局
 *                       （存档瘦身批用它验降级路径——宿主没有 CompressionStream 时须明文落盘）}
 */
function load(extra, opts) {
  const localStorage = mkStorage();
  const con = (opts && opts.quiet) ? { log() {}, warn() {}, error() {} } : console;
  const sandbox = { window: {}, localStorage, console: con, Date, Math, JSON, Set };
  /* 落盘无损压缩编解码要用的标准 API（Node 18+ 与 Edge/Chromium 同源同名）：
   * vm 新上下文只带 ECMAScript 内置对象，宿主 API 必须显式注入，否则沙箱里 codecReady() 恒假、
   * 测的就不是真机那条压缩路径（本仓纪律：判据必须跑在生产同一分支上）。 */
  if (!(opts && opts.noCodec)) {
    Object.assign(sandbox, {
      CompressionStream, DecompressionStream, ReadableStream, Response,
      TextEncoder, TextDecoder, btoa, atob, Uint8Array
    });
  }
  sandbox.window.window = sandbox.window;
  sandbox.window.localStorage = localStorage;
  /* 有桥分支 mock（生产路径）：opts.bridge = true → 注入 window.xhub.storage 内存实现，
   * 使「压缩落盘 + 读回解码」跑在与平台同一条分支上（存档瘦身批的判据就挂在这里）；
   * bridge 对象一并返回，判据可直接量 bridge 里的落盘字节，不必猜。 */
  const bridge = {};
  if (opts && opts.bridge) {
    sandbox.window.xhub = {
      storage: {
        get: async (k) => (k in bridge ? bridge[k] : null),
        set: async (k, v) => { bridge[k] = v; },
        remove: async (k) => { delete bridge[k]; }
      }
    };
  }
  sandbox.globalThis = sandbox.window;
  vm.createContext(sandbox);
  for (const f of ORDER.concat(extra || [])) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
  }
  return { sandbox, SQ: sandbox.window.SQ, localStorage, bridge };
}

module.exports = { load, ORDER, ROOT };
