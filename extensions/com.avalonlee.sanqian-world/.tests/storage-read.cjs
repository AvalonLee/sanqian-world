/* .tests/storage-read.cjs — 离线读平台存档文件（一次性调查脚本用，非生产解码路径）
 * 存在的理由：probe-selflearn / probe-tdmemo 这类调查件要直接吃 `.storage.json`（真玩家档）当输入。
 * 生产解码在 assets/core.js（Web CompressionStream），vm 沙箱外的 Node 主线程用不了那套注入全局，
 * 故这里用 node:zlib 做**同一格式**（`d1:` + base64(deflate)）的解码头。
 * ⚠️ 边界：本件只服务「读一份磁盘档喂给调查脚本」，**不作任何容量/无损判据** ——
 *    那些判据一律走 core.js 的编解码（见 .tests/probe-savecodec.cjs），避免第二套实现冒充正典。
 * 路径（逐一试探，第一个存在的胜出）：SQ_STORAGE 环境变量 > <ROOT>/.storage.json > <ROOT>/../xhub/extensions/<ext>/.storage.json > <ROOT>/extensions/<ext>/.storage.json
 *    （2026-10-08 设备迁移批：实时档由平台落在扩展目录，不在工作树内。⚠️ 2026-10-09 版本控制纳管批随读：宿主已移除平台安装目录，实时实例改在**仓库镜像根** `extensions/<ext>/` 跑 ⇒ 末一路才是本机现值）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..');
const EXT = 'com.avalonlee.sanqian-world';
const CODEC_PREFIX = 'd1:';

function candidates() {
  return [
    process.env.SQ_STORAGE,
    path.join(ROOT, '.storage.json'),
    path.join(ROOT, '..', 'xhub', 'extensions', EXT, '.storage.json'),
    /* 2026-10-09 版本控制纳管批补：宿主把实时实例改到**仓库镜像根**跑（平台安装目录已被移除），
       这一路现在是本机**实际命中**的那条；前三路保留给环境恢复后与显式指定。 */
    path.join(ROOT, 'extensions', EXT, '.storage.json')
  ].filter(Boolean);
}

function storagePath() {
  for (const p of candidates()) {
    try { if (fs.statSync(p).isFile()) return p; } catch (e) {}
  }
  throw new Error('storage-not-found: 试过的路径 = ' + candidates().join(' | ') +
    '（可用 SQ_STORAGE=<绝对路径> 指定）');
}

/* 落盘值 → 对象：三态全收（对象 / 明文 JSON / d1: 压缩串），与 core.js 读端口径一致 */
function decodeValue(v) {
  if (v && typeof v === 'object') return v;
  if (typeof v !== 'string') return null;
  if (v.indexOf(CODEC_PREFIX) !== 0) return JSON.parse(v);
  return JSON.parse(zlib.inflateSync(Buffer.from(v.slice(CODEC_PREFIX.length), 'base64')).toString('utf8'));
}

function readWrapped() {
  return JSON.parse(fs.readFileSync(storagePath(), 'utf8'));
}

function readState(key) {
  const wrapped = readWrapped();
  const obj = decodeValue(wrapped[key || 'sanqian-state-v1']);
  if (!obj) throw new Error('storage-empty-key ' + key);
  return obj;
}

/* 展示流读取（存档治理批 2026-10-09 补）：日志与奇遇叙事流自本批起**都不在主档里**——
 * 侧档 `sanqian-logs-v1` 载荷 = `{v:1, logs:{wid:[…]}, feed:{wid:[…]}}`。
 * 绕过 core.js 的离线调查件若要读这两族，走本函数，**不要再从主档找 `ws.log` / `ws.eventHistory.feed`**
 * （旧档迁移期两者可能仍留在主档，故这里对「侧档缺该族」回落主档遗留，与 core.js 的读端口径一致）。 */
function readFlows() {
  const wrapped = readWrapped();
  const side = decodeValue(wrapped['sanqian-logs-v1']) || {};
  const main = decodeValue(wrapped['sanqian-state-v1']) || {};
  const worlds = (main.worlds || {});
  const out = { logs: {}, feed: {} };
  for (const wid in worlds) {
    const w = worlds[wid] || {};
    out.logs[wid] = (side.logs && side.logs[wid]) || w.log || [];
    const f = (side.feed && side.feed[wid]) || ((w.eventHistory || {}).feed) || [];
    out.feed[wid] = f;
  }
  return out;
}

module.exports = { storagePath, readWrapped, readState, readFlows, decodeValue, ROOT };
