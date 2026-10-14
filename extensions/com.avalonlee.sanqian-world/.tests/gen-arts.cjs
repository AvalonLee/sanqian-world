/* .tests/gen-arts.cjs — 功法数据生成器（node 运行，在扩展根目录）
 * 事实源：docs/玄幻修仙/功法全录（51部）.md 的五张表（2.1~2.4 品阶 + 2.5 天阶独占；唯一事实源，改词条先改文档）。
 * 产出：
 *   assets/worlds/xiuxian/arts.js          — 70 部纯机制数据（SQ.XARTS，零 CJK）
 *   assets/worlds/xiuxian/lexicon-arts.js  — skill.{id}.name/desc 词表分卷（CJK 白名单）+ 独占 3 部 skill.{id}.dao
 * 校验：总数 70、品阶分布 黄14/玄18/地22/天16(含独占3)、阵营分布 正25/左26/魔19、核心 12 部。
 * §2.6/§2.7（双书扩容 6 + 二批 10）表无品阶列——tier 按文档「词条带自检」行逐 id 显式映射（T.perId）；
 * 每级效果列含裁定括注（（副字段·裁定补）等，括注内带「，」）——解析前先剥全角括注。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
/* 仓库根现找（.tests/repo-root.cjs），不许硬编码层数——原值 '/workspace/app/docs/…' 是容器时代的绝对路径，
 *    平台壳退役后即失效：本生成器因此长期跑不动，arts.js 事实上成了无源抄本（第卅六批收口时发现并修）。 */
const REPO = require('./repo-root.cjs')();
const DOC = path.join(REPO, 'docs/玄幻修仙/功法全录（51部）.md');
if (!require('fs').existsSync(DOC)) { console.error('DOC_MISSING ' + DOC); process.exit(2); }

const ALIGN = { '正道': 'right', '左道': 'neutral', '魔道': 'evil' };
const ATTR = { '精': 'jing', '气': 'qi', '神': 'shen' };
const TIERS = [
  { h: '### 2.1 黄字阶', tier: 'huang', defPrice: 200 },
  { h: '### 2.2 玄字阶', tier: 'xuan', defPrice: 900 },
  { h: '### 2.3 地字阶', tier: 'di', defPrice: 2500 },
  { h: '### 2.4 天字阶', tier: 'tian', defPrice: 11000 },
  { h: '### 2.5 天阶独占', tier: 'tian', defPrice: 0 },
  /* 双书扩容批 §2.6（6 部）：tier 依「词条带自检」——天阶主效果 9%（大衍诀）/ 地阶 7% 三部 / 玄阶 5~7% 两部 */
  { h: '### 2.6 双书梗化扩容批', defPrice: 0, perId: {
      dayan: 'tian', qingzhu: 'di', jianyun: 'di', chunyu: 'di', xuedun: 'xuan', duoxian: 'xuan' } },
  /* 双书梗化二批 §2.7（10 部）：天 2（星辰/圣心）/ 地 6 / 玄 2（毒经/六魔）；stop = 联合验算表（防表格行误采） */
  { h: '### 2.7 双书梗化二批', defPrice: 0, stop: '- **零漂移联合验算表', perId: {
      xingchen: 'tian', shengxin: 'tian', qianjian: 'di', changcheng: 'di', zhenmo: 'di',
      wenxin: 'di', yinjian: 'di', jianlu: 'di', dujing: 'xuan', liumojue: 'xuan' } }
];
/* 特殊属性中文名 → 共享池 id（最长前缀匹配；文档用简写「遥悦」「长夜」等） */
const POOLS = [
  ['绵长内息', 'mianxi'], ['引灵入体', 'jinling'], ['御风', 'yufeng'], ['心如止水', 'zhishui'],
  ['不动明王', 'mingwang'], ['枯木逢春', 'fengchun'], ['逢凶化吉', 'huaji'], ['吃一堑', 'yiqian'],
  ['嗜血', 'shixue'], ['尸傀护主', 'shikui'], ['摄魂', 'shehun'], ['幡下聚宝', 'jubao'],
  ['炼余回生', 'huijin'], ['遥悦', 'yaoyue'], ['长夜', 'changye'],
  ['三尸宴坐', 'sanyan'], ['人间烟火', 'yanhuo'], ['枯井不波', 'kujing']
];
const GRADES = { '弱': 0, '标准': 1, '强': 2 };
/* 修仙侧字段标签（desc 生成用，与 lexicon 保持一致） */
const FIELD_ZH = {
  qiRate: '修为产出', qiCap: '修为上限', offlineEff: '离线收益', stonesRate: '灵石获取',
  combatSpeed: '斗法速度', combatPower: '战力', dropRate: '装备掉落', gearLuck: '装备品阶',
  artsSpeed: '功法修炼', shopCost: '坊市价格', eventRate: '奇遇频率', eventLuck: '奇遇运势',
  realmCost: '突破需求', tribBonus: '渡劫成功率', tribFailLossMod: '渡劫失败损失',
  checkBonus: '判定成功率', attrBonusAmp: '属性机缘获取'
};
/* 独占 3 部大道方向句（文案事实源：功法全录 §2.5） */
const DAO = {
  slay_corpses: '善尸予你清净，恶尸予你自在；不说话的那个，才是你自己。',
  red_dust: '道不在山高水远，在乞儿碗里那枚铜钱。',
  emotionless: '七情斩尽，天下再无刀兵能伤你——也再无灯火肯为你留。'
};

function parseEffects(s) {
  const out = {};
  const fixed = [];
  s = s.replace(/\*\*/g, '');   /* 剥 markdown 粗体（§2.5 emotionless 校对批固定值行） */
  /* 固定值标记：字段带「（固定值 …）」括注 = Lv1 全效不随等级缩放（校对批裁定，数值详设 §4.5） */
  for (const fm of s.matchAll(/([a-zA-Z]+)\s*[+-][\d.]+(?:%|pp)（[^）]*固定值[^）]*）/g)) fixed.push(fm[1]);
  s = s.replace(/（[^）]*）/g, '');   /* 剥裁定括注（§2.7 yinjian/jianlu：括注内含「，」，先剥再切） */
  for (const part of s.split('，')) {
    const m = part.trim().match(/^([a-zA-Z]+)\s*([+-])\s*([\d.]+)(%|pp)?$/);
    if (!m) throw new Error('effects 解析失败: ' + s);
    let v = parseFloat(m[3]) * (m[2] === '-' ? -1 : 1);
    if (m[4]) v = v / 100;   /* % 与 pp 同刻度（乘区字段一律小数比例，§4.5 clamp 同口径） */
    out[m[1]] = v;
  }
  return fixed.length ? { effects: out, effectsFixed: fixed } : out;
}
function parseSpecial(s) {
  s = s.trim();
  let pool = null;
  for (const [zh, id] of POOLS) if (s.startsWith(zh)) { pool = id; s = s.slice(zh.length); break; }
  if (!pool) throw new Error('特殊属性未识别: ' + s);
  const segs = s.split('·').map((x) => x.trim()).filter((x) => x !== '');
  const grade = segs.length === 0 ? 1 : GRADES[segs[segs.length - 1]];   /* 御风（无档）→ 标准 1 */
  if (grade === undefined) throw new Error('档位未识别: ' + s);
  return { pool, grade };
}
function parseReqs(s) {
  s = s.trim();
  const reqs = {};
  if (s === '无') return reqs;
  for (const part of s.split('+').map((x) => x.trim())) {
    let m;
    if ((m = part.match(/^(.+?)\((\d)\)$/))) reqs.realm = parseInt(m[2]);
    else if ((m = part.match(/^karma\s*≤\s*(-?\d+)$/))) reqs.karmaMax = parseInt(m[1]);
    else if ((m = part.match(/^karma\s*≥\s*\+?(-?\d+)$/))) reqs.karmaMin = parseInt(m[1]);
    else if ((m = part.match(/^([精气神])\s*≥\s*(\d+)$/))) reqs.attr = { id: ATTR[m[1]], min: parseInt(m[2]) };
    else throw new Error('学习要求未识别: ' + part);
  }
  return reqs;
}
function parseObtain(s, defPrice) {
  s = s.trim();
  let m;
  if (s === '初始自带') return { type: 'initial' };
  if ((m = s.match(/^坊市\s*([\d,]+)$/))) return { type: 'shop', price: parseInt(m[1].replace(/,/g, '')) };
  if ((m = s.match(/^黑市\s*([\d,]+)$/))) return { type: 'black', price: parseInt(m[1].replace(/,/g, '')) };
  if (s === '黑市') return { type: 'black', price: defPrice }; /* 文档未标价 → 同品阶中位价（生成器登记） */
  if ((m = s.match(/^秘境\s*(\d+)\s*首通$/))) return { type: 'zone', zone: parseInt(m[1]) };
  if (s === '奇遇掉落') return { type: 'event' };
  if (s.startsWith('奇遇（魔性')) return { type: 'event_evil' };
  if (s === '稀有奇遇') return { type: 'event_rare' };
  if (s.startsWith('独占奇遇')) return { type: 'event_locked' };
  throw new Error('获取途径未识别: ' + s);
}

const src = fs.readFileSync(DOC, 'utf8');
const arts = {};
const order = [];
for (const T of TIERS) {
  const start = src.indexOf(T.h);
  if (start < 0) throw new Error('缺章节 ' + T.h);
  let end = src.indexOf('###', start + 5);
  if (T.stop) {
    const stopAt = src.indexOf(T.stop, start);
    if (stopAt < 0) throw new Error('缺界标 ' + T.stop);
    end = end < 0 ? stopAt : Math.min(end, stopAt);
  }
  const block = src.slice(start, end < 0 ? undefined : end);
  for (const line of block.split('\n')) {
    const m = line.match(/^\|\s*(★?)\s*\|\s*`([a-z_]+)`\s*\|(.+)$/);
    if (!m) continue;
    const cells = m[3].split('|').map((c) => c.trim());
    /* cells: 名称, 阵营, 滋养, 每级效果, 特殊属性, 学习要求, 获取 */
    const id = m[2];
    /* 直接按列取：cells = 名称, 阵营, 滋养, 每级效果, 特殊属性, 学习要求, 获取 */
    const name = cells[0];
    const tier = T.perId ? T.perId[id] : T.tier;
    if (!tier) throw new Error('§2.6/§2.7 出现未映射 tier 的 id: ' + id);
    const a = { id, tier, core: m[1] === '★' };
    a.alignment = ALIGN[cells[1]];
    a.attr = ATTR[cells[2]];
    const effParsed = parseEffects(cells[3]);
    if (effParsed.effects) { a.effects = effParsed.effects; a.effectsFixed = effParsed.effectsFixed; }
    else a.effects = effParsed;
    a.special = parseSpecial(cells[4]);
    a.reqs = parseReqs(cells[5]);
    a.obtain = parseObtain(cells[6], T.defPrice);
    if (!a.alignment || !a.attr) throw new Error(id + ' 阵营/滋养解析失败');
    arts[id] = a;
    order.push({ id, name, effects: a.effects, effectsFixed: a.effectsFixed });
  }
}

/* ── 校验 ── */
const ids = Object.keys(arts);
const byTier = {}, byAlign = { right: 0, neutral: 0, evil: 0 };
let core = 0;
for (const id of ids) {
  byTier[arts[id].tier] = (byTier[arts[id].tier] || 0) + 1;
  byAlign[arts[id].alignment]++;
  if (arts[id].core) core++;
}
console.log('total=' + ids.length, JSON.stringify(byTier), JSON.stringify(byAlign), 'core=' + core);
if (ids.length !== 70 || byTier.huang !== 14 || byTier.xuan !== 18 || byTier.di !== 22 || byTier.tian !== 16 ||
    byAlign.right !== 25 || byAlign.neutral !== 26 || byAlign.evil !== 19 || core !== 12) {
  console.error('FAIL: 分布与文档不符（70 部 = 黄14/玄18/地22/天13+独占3，正25/左26/魔19，核心12）');
  process.exit(1);
}

/* ── 输出数据文件 ── */
function js(v) { return JSON.stringify(v); }
const lines = ids.map((id) => {
  const a = arts[id];
  return '  ' + js(id) + ': { tier: ' + js(a.tier) + ', core: ' + a.core + ', alignment: ' + js(a.alignment) +
    ', attr: ' + js(a.attr) + ', effects: ' + js(a.effects) +
    (a.effectsFixed ? ', effectsFixed: ' + js(a.effectsFixed) : '') + ', special: ' + js(a.special) +
    ', reqs: ' + js(a.reqs) + ', obtain: ' + js(a.obtain) + ' }';
});
fs.writeFileSync(path.join(ROOT, 'assets/worlds/xiuxian/arts.js'),
`/* xiuxian/arts.js — 修仙功法全录（70 部）纯机制数据
 * ⚠ 由 .tests/gen-arts.cjs 自《玄幻修仙/功法全录（51部）》表格生成——改词条先改文档再重新生成。
 * 名称/描述在词表分卷 lexicon-arts.js（skill.{id}.name/desc）；本文件零 CJK。
 * obtain.type: initial 初始 / shop 坊市 / black 黑市 / zone 秘境N首通 / event(_evil|_rare) 奇遇 /
 *   event_locked 天阶独占（§2.5：仅指定天级特殊奇遇「指定分支+判定链全过」授予，不入商店/掉落/首通池）。
 * effectsFixed: 列内字段 Lv1 全效、不随等级缩放（校对批裁定 · 数值详设 §4.5；mods.js 消费）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.XARTS = {
${lines.join(',\n')}
  };
})();
`);

/* ── 输出词表分卷 ── */
const lexLines = [];
for (const { id, name, effects, effectsFixed } of order) {
  const eff = Object.keys(effects).map((k) => {
    const v = effects[k];
    const pct = Math.abs(v * 100);
    const num = (Math.round(pct * 10) / 10).toString().replace(/\.0$/, '');
    return (FIELD_ZH[k] || k) + ' ' + (v >= 0 ? '+' : '-') + num + '%' +
      (effectsFixed && effectsFixed.indexOf(k) >= 0 ? '（固定值）' : '');
  }).join('，');
  lexLines.push('    ' + js('skill.' + id + '.name') + ': ' + js(name) + ',');
  lexLines.push('    ' + js('skill.' + id + '.desc') + ': ' + js('每级 ' + eff) + ',');
  if (DAO[id]) lexLines.push('    ' + js('skill.' + id + '.dao') + ': ' + js(DAO[id]) + ',');
}
fs.writeFileSync(path.join(ROOT, 'assets/worlds/xiuxian/lexicon-arts.js'),
`/* xiuxian/lexicon-arts.js — 功法名/描述词表分卷
 * ⚠ 由 .tests/gen-arts.cjs 自《功法全录》生成——禁止手改；特殊属性名手写于本文件尾部（共享池 15 条 + 天阶独占签名 3 条）。
 */
(function () {
  var SQ = window.SQ || (window.SQ = {});
  SQ.lexRegister('xiuxian', {
${lexLines.join('\n')}
  });
  SQ.lexRegister('xiuxian', {
    'skill.tier.huang': '黄字阶', 'skill.tier.xuan': '玄字阶',
    'skill.tier.di': '地字阶', 'skill.tier.tian': '天字阶',
    'special.mianxi.name': '绵长内息', 'special.jinling.name': '引灵入体',
    'special.yufeng.name': '御风', 'special.zhishui.name': '心如止水',
    'special.mingwang.name': '不动明王', 'special.fengchun.name': '枯木逢春',
    'special.huaji.name': '逢凶化吉', 'special.yiqian.name': '吃一堑',
    'special.shixue.name': '嗜血', 'special.shikui.name': '尸傀护主',
    'special.shehun.name': '摄魂', 'special.jubao.name': '幡下聚宝',
    'special.huijin.name': '炼余回生', 'special.yaoyue.name': '遥悦折价',
    'special.changye.name': '长夜修行',
    'special.sanyan.name': '三尸宴坐', 'special.yanhuo.name': '人间烟火',
    'special.kujing.name': '枯井不波',
    /* 混沌三签名（融合扩容批 v1.3：自创部专属，混沌淬炼唯一授予；正典部零引用）
     * ⚠️ 这三枚原本只躺在生成物里、生成器不产出 ⇒ 跑一次 gen-arts 就把它们**静默删掉**（屏上落裸键名）。
     *    第卅六批收口时补进模板，让「生成物 = 文档 + 本模板」重新成立。 */
    'special.hundun.name': '混沌重生', 'special.zaohua.name': '造化余韵',
    'special.taiyi.name': '太一星光',
    'special.grade.0': '弱', 'special.grade.1': '标准', 'special.grade.2': '强'
  });
})();
`);
console.log('GEN_ARTS_OK ' + ids.length);
