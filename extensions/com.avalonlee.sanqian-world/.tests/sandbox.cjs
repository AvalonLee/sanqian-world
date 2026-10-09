/* .tests/sandbox.cjs — 无头 vm 沙箱装载器（node，无浏览器依赖）
 * 唯一事实源：加载顺序必须与 view/index.html 的 <script> 顺序完全一致——
 * 三个脚本（run-smoke / sim-pacing / sim-event-economy）共用本文件，避免顺序漂移。
 * 用法：const { SQ, sandbox } = require('./sandbox.cjs').load(['.tests/smoke.js']);
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const ORDER = [
  'assets/util.js',
  'assets/worlds/registry.js',
  'assets/lexicon.js',
  'assets/worlds/xiuxian/lexicon.js',
  'assets/worlds/xiuxian/lexicon-arts.js',
  'assets/worlds/xiuxian/lexicon-bonds.js',
  'assets/worlds/xiuxian/lexicon-factions.js',
  'assets/worlds/xiuxian/lexicon-treasures.js',
  'assets/worlds/xiuxian/lexicon-tiandao.js',
  'assets/worlds/xiuxian/lexicon-meta.js',
  'assets/worlds/xiuxian/lexicon-alchemy.js',
  'assets/worlds/xiuxian/lexicon-prodigy.js',
  'assets/worlds/xiuxian/lexicon-spirit.js',
  'assets/worlds/xiuxian/lexicon-sect.js',
  'assets/lexicon/talents.js',
  'assets/lexicon/events.js',
  'assets/talents/common.js',
  'assets/talents/xiuxian.js',
  'assets/worlds/xiuxian/data.js',
  'assets/worlds/xiuxian/arts.js',
  'assets/worlds/xiuxian/treasures.js',
  'assets/events/common.js',
  'assets/worlds/xiuxian/events.js',
  'assets/systems/ledger.js',
  'assets/systems/cave.js',
  'assets/systems/bonds.js',
  'assets/systems/factions.js',
  'assets/systems/treasures.js',
  'assets/systems/mods.js',
  'assets/systems/attrs.js',
  'assets/systems/gear.js',
  'assets/systems/arts.js',
  'assets/systems/combat.js',
  'assets/systems/realm.js',
  'assets/systems/idle.js',
  'assets/systems/shop.js',
  'assets/systems/events.js',
  'assets/systems/rumors.js',
  'assets/systems/tiandao.js',
  'assets/systems/legacy.js',
  'assets/systems/codex.js',
  'assets/systems/alchemy.js',
  'assets/systems/prodigy.js',
  'assets/systems/fusion.js',
  'assets/systems/sect.js',
  'assets/systems/actions.js',
  'assets/worlds/xiuxian/karma.js',
  'assets/worlds/xiuxian/tribulation.js',
  'assets/worlds/xiuxian/index.js',
  'assets/talents/engine.js',
  'assets/core.js'
];

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
