/* .tests/probe-selflearn.cjs — 自悟（自行领悟）速率诊断探针（一次性调查用，非交付走查）
 * 用法：node .tests/probe-selflearn.cjs
 * 读 .storage.json（真实存档）→ 归一 → 直接调世界包 claim(ws, dt, now, profile, settings) 推进虚拟时间，
 * 只统计自悟通道（logKey='arts.selflearn'）所得，屏蔽奇遇通道以免污染计数。
 * 自悟保底修复批后口径：时钟「掷点不扣减」→ 保底真实生效；离线按 OFFLINE_MULT 折扣推进、
 * 单次结算至多 OFFLINE_MAX_ROLLS 个掷点（下方 §4 观测）。
 * 自悟收敛批后口径：候选池只收黄/玄阶（地阶移出）；eff 再乘边际递减 1/(1+DECAY×已自悟部数)——
 * §1 体检已含递减，故 §3 在线 8h 收获随存档 n 增长而下降属预期。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { load, ROOT } = require('./sandbox.cjs');

const { SQ } = load([]);
const D = SQ.XDATA;
const pack = SQ.Worlds.xiuxian.pack;

/* 真玩家档：路径与解码口径收在 storage-read.cjs（2026-10-08 设备迁移批——实时档不在工作树内；
 * 存档瘦身批——落盘值可能是 d1: 压缩串，直接 JSON.parse 会炸） */
const { readState } = require('./storage-read.cjs');
const raw = readState('sanqian-state-v1');

/* 屏蔽奇遇/传闻通道：隔离自悟速率 */
SQ.Events.tickOnline = function () {};
if (SQ.Rumors) SQ.Rumors.tick = function () {};

function prep() {
  const s = SQ.normalize(JSON.parse(JSON.stringify(raw)));
  const ws = s.worlds[s.profile.worldId];
  if (pack.recalcDerived) pack.recalcDerived(ws, s.profile);
  return { s, ws, prof: s.profile, settings: s.settings };
}

const CFG = D.ARTS_SELFLEARN;
const IV = CFG.INTERVAL_MIN * 60, PITY = CFG.PITY_H * 3600;

/* ── 1) 现状体检 ── */
{
  const { ws, prof } = prep();
  const pool = SQ.Arts.selfLearnCands(ws, pack, D);
  const mods = SQ.Mods.collect(prof, ws, pack, D);
  const artsSpeed = (mods && mods.sum && mods.sum.artsSpeed) || 0;
  const modeCfg = D.MODES[ws.mode];
  const learnedN = ws.artsSelfLearnN || 0;
  const decay = 1 / (1 + (CFG.DECAY || 0) * learnedN);
  const eff = modeCfg.practiceMult * (1 + artsSpeed) * decay;
  const effOff = CFG.OFFLINE_MULT * (1 + artsSpeed) * decay;
  console.log('==== 现状体检 ====');
  console.log('realm            =', ws.realm);
  console.log('mode             =', ws.mode, '(practiceMult', modeCfg.practiceMult + ')');
  console.log('attrs            =', JSON.stringify(ws.attrs));
  console.log('artsKnown        =', ws.artsKnown.join(','));
  console.log('artsSpeed Σ      =', artsSpeed.toFixed(3), '→ 在线 eff =', eff.toFixed(3), '/ 离线 eff =', effOff.toFixed(3));
  console.log('artsSelfLearnN   =', learnedN, '部已自悟 → 边际递减系数', decay.toFixed(3), '(DECAY', CFG.DECAY + ')');
  console.log('artsLearnClock   =', ws.artsLearnClock.toFixed(1), '加权秒 = 自悟进度', SQ.Arts.selfLearnPct(ws, D).toFixed(1) + '%');
  console.log('候选池           =', pool.length, '部');
  console.log('参数             = 每', CFG.INTERVAL_MIN, '加权分钟掷一次 P=', CFG.P,
    '· 保底', CFG.PITY_H, '加权小时 · 离线折扣', CFG.OFFLINE_MULT, '· 单次离线至多', CFG.OFFLINE_MAX_ROLLS,
    '掷点 · 递减 DECAY', CFG.DECAY, '· 品阶', (CFG.TIERS || []).join('/'));
  console.log('换算（在线 eff） = 每', (IV / eff / 60).toFixed(1), '现实分钟掷一次 · 保底', (PITY / eff / 3600).toFixed(1),
    '现实小时 · 期望', (IV / eff / CFG.P / 3600).toFixed(1), '现实小时一部');
  console.log('换算（离线 eff） = 保底', (PITY / effOff / 3600).toFixed(1), '现实小时（受单次', CFG.OFFLINE_MAX_ROLLS, '掷点上限约束）');
  console.log('');
}

/* ── 2) 首部耗时分布（虚拟时间，5min 步长以避开离线窗口）── */
function timeToFirstArt(mode, capH) {
  const { ws, prof, settings } = prep();
  ws.mode = mode;
  let gained = null;
  const orig = SQ.Arts.gainArt;
  SQ.Arts.gainArt = function (w, p, d, id, log, logKey) {
    if (logKey === 'arts.selflearn' && !gained) gained = id;
    return orig.apply(this, arguments);
  };
  const STEP = D.ONLINE_WINDOW_MS;              /* 5min：> 则判离线，自悟改走离线通道 */
  let now = Date.now(), h = 0;
  while (!gained && h < capH * 3600) {
    now += STEP; h += STEP / 1000;
    pack.claim(ws, STEP, now, prof, settings);
  }
  SQ.Arts.gainArt = orig;
  return gained ? h / 3600 : null;
}

function dist(mode, trials, capH) {
  const t = [];
  for (let i = 0; i < trials; i++) { const r = timeToFirstArt(mode, capH); if (r != null) t.push(r); }
  t.sort((a, b) => a - b);
  const q = (p) => t[Math.min(t.length - 1, Math.floor(t.length * p))];
  return { n: t.length, min: t[0], p25: q(.25), med: q(.5), p75: q(.75), max: t[t.length - 1] };
}

console.log('==== 首部功法耗时（虚拟时间，100 次抽样，上限 12h）====');
for (const mode of ['seclude', 'venture']) {
  const d = dist(mode, 100, 12);
  /* 候选池为空（这份真档黄/玄阶早已学满）⇒ 没有样本可统计，如实说明而不是拿 undefined 做除法 */
  if (d.n === 0) { console.log(mode.padEnd(8), '得手率 0/100 —— 候选池 0 部，无样本可统计（非缺陷：该档黄/玄阶已全部持有）'); continue; }
  console.log(mode.padEnd(8), '得手率', d.n + '/100', '| 最短', d.min.toFixed(2) + 'h', '中位', d.med.toFixed(2) + 'h',
    'P75', d.p75.toFixed(2) + 'h', '最长', d.max.toFixed(2) + 'h');
}

/* ── 3) 连续在线 8h 的期望收获 ── */
console.log('');
console.log('==== 连续在线 8h 自悟收获（20 次抽样均值）====');
for (const mode of ['seclude', 'venture']) {
  let total = 0, zero = 0;
  for (let i = 0; i < 20; i++) {
    const { ws, prof, settings } = prep();
    ws.mode = mode;
    let n = 0;
    const orig = SQ.Arts.gainArt;
    SQ.Arts.gainArt = function (w, p, d, id, log, logKey) { if (logKey === 'arts.selflearn') n++; return orig.apply(this, arguments); };
    const STEP = D.ONLINE_WINDOW_MS;
    let now = Date.now();
    for (let h = 0; h < 8 * 3600; h += STEP / 1000) { now += STEP; pack.claim(ws, STEP, now, prof, settings); }
    SQ.Arts.gainArt = orig;
    total += n; if (n === 0) zero++;
  }
  console.log(mode.padEnd(8), '平均', (total / 20).toFixed(2), '部 / 8h', '| 颗粒无收次数', zero + '/20');
}

/* ── 4) 单次离线回归收获（12h 离线，20 次抽样）── */
console.log('');
console.log('==== 单次离线 12h 回归自悟收获（20 次抽样）====');
{
  let total = 0, zero = 0, max = 0;
  for (let i = 0; i < 20; i++) {
    const { ws, prof, settings } = prep();
    ws.mode = 'venture';
    let n = 0;
    const orig = SQ.Arts.gainArt;
    SQ.Arts.gainArt = function (w, p, d, id, log, logKey) { if (logKey === 'arts.selflearn') n++; return orig.apply(this, arguments); };
    const now = Date.now() + 12 * 3600 * 1000;
    pack.claim(ws, 12 * 3600 * 1000, now, prof, settings);
    SQ.Arts.gainArt = orig;
    total += n; if (n === 0) zero++; if (n > max) max = n;
  }
  console.log('平均', (total / 20).toFixed(2), '部 / 次 12h 离线', '| 颗粒无收', zero + '/20', '| 单次最多', max, '部');
}
