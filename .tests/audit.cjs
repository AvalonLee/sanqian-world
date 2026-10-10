/* .tests/audit.cjs — 交付前静态审计（词表 4.3 源码半区 + 平台关卡 4.9 八项）
 * 用法：node .tests/audit.cjs   （在扩展根目录）
 * 输出：逐项 PASS/FAIL + AUDIT_ALL_GREEN（发布预检同口径，见工程规范 §4.9/§1.3）。
 *
 * A 组 · 词表层（P3）：
 *   A1 CJK 扫描：view/module 内联脚本 + assets/**（注释剥离后），白名单 = 词表分卷与命名池文件
 *   A2 key 对账：代码静态引用 key ⊆ 词表；动态 key 族（talent.{id} / realm.{n} / world.{id} / talent.field.{k}）按数据表全覆盖
 *   A3 DOM id 对账：脚本里 $()/getElementById 引用的 id 必须在同一 HTML 静态存在（取不到即白屏）
 *   A4 界面词表拉丁词扫描：词表 value 剥占位符后零英文词（白名单 Lv/NPC/pp/AI/JSON + tiandao 提示词族豁免）
 *   A5 道友 align 必填（世界包契约字段三态守门）
 *   A6 词表键消费侧反向扫描（孤儿键 · 报告级恒 PASS、孤儿族逐条打印）
 * C 组 · 世界包词族契约（G11 · 换世界即换系统名与菜单描述）：
 *   C1 must 族覆盖（每个 live 世界分卷各自拥有）  C2 forbid 族零命中（通用文案只留 common）
 * B 组 · 平台关卡（4.9 八项 #82~#89；#86 只覆盖静态半区，三态目检需真机）：
 *   B1 manifest 合法（#82）  B2 权限对账（#83，纯文本扫 xhub.*，含注释）
 *   B3 零 CDN（#84）         B4 主题铁律（#85，页面底透明/双声明）
 *   B5 module 格子纪律（#87，无 min-height/12px/container-type/overflow）
 *   B6 外链行为（#88，零 window.open / target=_blank）
 *   B7 壁纸透底态规则（#86 静态半区）  B8 桥容错（#89，单一桥模块 + try/catch + 失败出口）
 *   B9 交付镜像一致性（源侧 ↔ extensions/com.avalonlee.sanqian-world 七项逐字节零差异；2026-10-09 版本控制纳管批立）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
/* 路径一律归一为正斜杠：白名单与文件比对按 POSIX 相对路径写死，
   直接用 path.relative 在 Windows 上会得到反斜杠，导致白名单静默失配（假阳性）。 */
const relOf = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const R = [];
function ok(id, name, cond, detail) { R.push({ id, name, ok: !!cond, detail: detail || '' }); }

/* ── 工具：注释剥离（保留字符串字面量、识别正则字面量；行号对齐用 \n 占位）── */
function stripComments(src) {
  let out = '', i = 0, n = src.length;
  let st = null; /* null | "'" | '"' | '`' | 'line' | 'block' | 'regex' */
  let inClass = false;   /* 正则字符类 [] 内 */
  let lastSig = '';      /* 最近一个非空白有效字符（正则起始判定） */
  const REGEX_PREV = '(,=:[!&|?{};+-*%~^<>';
  while (i < n) {
    const c = src[i], c2 = src.substr(i, 2);
    if (st === null) {
      if (c2 === '/*') { st = 'block'; i += 2; continue; }
      if (c2 === '//') { st = 'line'; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') { st = c; out += c; i++; continue; }
      if (c === '/' && (lastSig === '' || REGEX_PREV.includes(lastSig))) {
        st = 'regex'; inClass = false; out += c; i++; continue;
      }
      if (!/\s/.test(c)) lastSig = c;
      out += c; i++; continue;
    }
    if (st === 'block') { if (c2 === '*/') { st = null; i += 2; } else { out += (c === '\n' ? '\n' : ''); i++; } continue; }
    if (st === 'line') { if (c === '\n') { st = null; out += '\n'; } i++; continue; }
    if (st === 'regex') {
      out += c;
      if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) { st = null; lastSig = '/'; }
      else if (c === '\n') { st = null; } /* 未闭合容错：按行结束 */
      i++; continue;
    }
    /* 字符串态 */
    out += c;
    if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; }
    if (c === st) { st = null; lastSig = c; }
    i++;
  }
  return out;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    /* 开发期依赖 / 构建产物目录直接剪枝：不下钻也不读取（见下方 allFiles 注释的 OOM 实测） */
    if (e.isDirectory() && (e.name === 'node_modules' || e.name === 'dist' || e.name === 'dist-ssr' || e.name === 'build')) continue;
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
/* extensions/ = 平台打包镜像（根树的快照副本，随发布同步）——非事实源，不进审计扫描；
   根树 assets/view/module 才是唯一事实源（镜像漂移由发布流程整体刷新，见工程规范 §7.3）。 */
const allFiles = walk(ROOT, []).filter((f) => !f.includes(path.sep + '.') &&
  !relOf(f).startsWith('extensions/') &&
  /* 开发期依赖与构建产物不是事实源。.tests/README 指示「在扩展根目录安装 playwright-core」，
   * 装完 node_modules（1300+ 包）就在根树里，整树扫描会把审计撑到 4GB heap OOM（2026-10-07 实测）。 */
  !/(^|\/)(node_modules|dist|dist-ssr|build)\//.test(relOf(f)));
const jsFiles = allFiles.filter((f) => f.endsWith('.js'));
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

/* 提取 HTML 内联脚本（带行号偏移信息：返回 [{file, code, baseLine}]） */
function inlineScripts(file) {
  const src = fs.readFileSync(file, 'utf8');
  const blocks = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(src))) {
    const baseLine = src.slice(0, m.index).split('\n').length;
    blocks.push({ file, code: m[1], baseLine });
  }
  return blocks;
}

/* CJK 白名单：词表分卷 / 命名池 / 生成词表（工程规范 §1.3「词表文件本身」） */
const CJK_WHITELIST = (rel) =>
  rel === 'assets/lexicon.js' ||
  rel.startsWith('assets/lexicon/') ||
  /(^|\/)lexicon(-[a-z]+)?\.js$/.test(rel) ||
  rel === 'assets/worlds/registry.js'; /* 世界名生成池 nameParts（文本数据，非界面文案） */
const CJK_RE = /[㐀-鿿　-〿豈-﫿＀-￯]/;

/* ── A1 CJK 扫描 ── */
(function () {
  const hits = [];
  const scanJs = (file, code, baseLine) => {
    const rel = relOf(file);
    if (baseLine === 0 && CJK_WHITELIST(rel)) return;
    const stripped = stripComments(code);
    stripped.split('\n').forEach((line, idx) => {
      if (CJK_RE.test(line)) hits.push(rel + ':' + (baseLine + idx) + ' ' + line.trim().slice(0, 60));
    });
  };
  for (const f of jsFiles) scanJs(f, fs.readFileSync(f, 'utf8'), 0);
  for (const f of htmlFiles) for (const b of inlineScripts(f)) scanJs(b.file, b.code, b.baseLine);
  ok('A1', '源码 CJK 扫描（白名单外零命中）', hits.length === 0, hits.slice(0, 6).join(' | '));
})();

/* ── 沙箱加载全量脚本（key 对账用）── */
const store = {};
const sandbox = {
  window: {}, console, Date, Math, JSON, Set,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  }
};
sandbox.window.window = sandbox.window;
sandbox.window.localStorage = sandbox.localStorage;
vm.createContext(sandbox);
for (const f of [
  'assets/util.js',
  'assets/worlds/registry.js', 'assets/lexicon.js', 'assets/worlds/xiuxian/lexicon.js',
  'assets/worlds/xiuxian/lexicon-arts.js', 'assets/worlds/xiuxian/lexicon-bonds.js', 'assets/worlds/xiuxian/lexicon-factions.js',
  'assets/worlds/xiuxian/lexicon-treasures.js',
  'assets/worlds/xiuxian/lexicon-tiandao.js',
  'assets/worlds/xiuxian/lexicon-meta.js',
  'assets/worlds/xiuxian/lexicon-alchemy.js',
  'assets/worlds/xiuxian/lexicon-prodigy.js',
  'assets/worlds/xiuxian/lexicon-spirit.js',
  'assets/worlds/xiuxian/lexicon-sect.js',
  'assets/lexicon/talents.js', 'assets/lexicon/events.js',
  'assets/talents/common.js', 'assets/talents/xiuxian.js',
  'assets/worlds/xiuxian/data.js', 'assets/worlds/xiuxian/arts.js',
  'assets/worlds/xiuxian/treasures.js',
  'assets/events/common.js', 'assets/worlds/xiuxian/events.js'
]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
const SQ = sandbox.window.SQ;

/* ── A2 key 对账 ── */
(function () {
  const lexAll = Object.assign({}, SQ.LEX.common, SQ.LEX.xiuxian);
  const missing = [];

  /* 静态字面量 key：t('xxx' / SQ.t('xxx' */
  const staticKeys = new Set();
  const dynPrefixes = new Set();   /* 以点开尾的拼接前缀（'realm.' + i）——A6 反向扫描用 */
  const litKeys = new Set();       /* 代码里出现过的任意点分字面量（含数组/对象表里的键名）——A6 宽口径 */
  const bodies = [];
  for (const f of jsFiles) {
    const rel = relOf(f);
    /* 词表分卷一律排除：A6 判据是「代码里有没有人提这个键」，而分卷**自身**就逐字写着每个键名
     * （`K['spirit.reunion.1'] = …`）——不排除则每个分卷给自己全额作保、整族永远照不出孤儿
     * （本仓十来个 `worlds/<id>/lexicon-*.js` 此前就落在排除口径之外，属 A6 的系统性盲区）。 */
    if (rel.includes('.tests') || /(^|\/)lexicon([-./])/.test(rel)) continue;
    bodies.push(stripComments(fs.readFileSync(f, 'utf8')));
  }
  for (const f of htmlFiles) for (const b of inlineScripts(f)) bodies.push(stripComments(b.code));
  for (const body of bodies) {
    const re = /\bt\(\s*['"]([a-zA-Z0-9._]+)['"]/g;
    let m;
    while ((m = re.exec(body))) {
      /* 以「.」结尾 = 动态拼接前缀（'realm.' + i 等），其 key 族由下方数据表对账覆盖 */
      if (m[1].endsWith('.')) dynPrefixes.add(m[1]);
      else staticKeys.add(m[1]);
    }
    /* A6 消费侧宽口径：视图层大量键不是内联在 t('…') 里，而是走别名取词口（`tc('k')`）、
     * 先落进数组 / 对象表再传口（LEG_KEYS、LOG_CATS），或以「族前缀 + 数据项」拼接
     * （`'creation.bias.' + b`——前缀字面量以点开尾）。只认 `t('` 会把这三类全判成孤儿
     * （实测虚报 283 条 / 106 族），故反向扫描宽收任意点分字面量，尾点者优先当前缀。 */
    /* 判据修正（2026-10-08 裁定收口批 · 用户按建议点头）：字符类**补大写**。原两类只认
     * `[a-z0-9_]`，凡键段含 camelCase（实证 `creation.talent.lockTitle/lockText/lockSummary`、
     * `creation.world.noPick`）就在大写字母处截断、整键收不进 litKeys ⇒ 被**虚报成孤儿**。
     * 方向与粗前缀的假阴相反，但 A6 恒报告级：宁可少报，不可把活文案当成待删。 */
    const re2 = /['"]([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*\.?)['"]/g;
    let m2;
    while ((m2 = re2.exec(body))) {
      if (m2[1].endsWith('.')) dynPrefixes.add(m2[1]);
      else litKeys.add(m2[1]);
    }
    /* 第三式（2026-10-07 补，实测抓到虚报）：**字面量 + 变量**拼接出的键名——
     * `nameKey: 'legacy.shop.qirate' + (i + 1)`、`'prodigy.board.' + x` 一类「键在数据层拼好、
     * 视图只拿变量取词」的构型，尾点规则照不到（字面量本身既不是完整键、也不以点收尾），
     * 不收就会把 `legacy.shop.qirate1~5` 五键虚报成孤儿。只认**含点**字面量作前缀，
     * 免得把普通文案拼接当整族覆盖。 */
    const re3 = /['"]([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)['"]\s*\+/g;
    let m3;
    while ((m3 = re3.exec(body))) dynPrefixes.add(m3[1]);
  }
  for (const k of staticKeys) if (lexAll[k] == null) missing.push('static:' + k);

  /* 动态 key 族（按数据表全覆盖） */
  for (const w of ['common', 'xiuxian']) {
    for (const kind of ['positive', 'negative']) {
      for (const el of SQ.TALENTS[w][kind]) {
        if (lexAll['talent.' + el.id + '.name'] == null) missing.push('talent.' + el.id + '.name');
        if (lexAll['talent.' + el.id + '.desc'] == null) missing.push('talent.' + el.id + '.desc');
        for (const k in el.effects) {
          if (lexAll['talent.field.' + k] == null) missing.push('talent.field.' + k);
        }
      }
    }
  }
  for (let r = 0; r < SQ.XDATA.REALMS.length; r++) {
    if (SQ.LEX.xiuxian['realm.' + r] == null) missing.push('realm.' + r);
  }
  for (const id in SQ.Worlds) {
    if (lexAll['world.' + id + '.name'] == null) missing.push('world.' + id + '.name');
    for (const tk of SQ.Worlds[id].tagsKeys || []) {
      if (lexAll[tk] == null) missing.push(tk);
    }
  }
  /* 功法族：skill.{id}.name/desc + special.{pool}.name + 品阶 */
  for (const id in SQ.XARTS) {
    if (lexAll['skill.' + id + '.name'] == null) missing.push('skill.' + id + '.name');
    if (lexAll['skill.' + id + '.desc'] == null) missing.push('skill.' + id + '.desc');
    const sp = SQ.XARTS[id].special.pool;
    if (lexAll['special.' + sp + '.name'] == null) missing.push('special.' + sp + '.name');
  }
  ['huang', 'xuan', 'di', 'tian'].forEach((tt) => {
    if (lexAll['skill.tier.' + tt] == null) missing.push('skill.tier.' + tt);
  });
  /* 事件族 v2（平铺池）：event.{id}.name/.story + 三分支 .branch.{right|evil|neutral} */
  for (const w of ['common', 'xiuxian']) {
    const list = Array.isArray(SQ.EVENTS[w]) ? SQ.EVENTS[w] : [];
    for (const ev of list) {
      if (lexAll['event.' + ev.id + '.name'] == null) missing.push('event.' + ev.id + '.name');
      if (lexAll['event.' + ev.id + '.story'] == null) missing.push('event.' + ev.id + '.story');
      for (const bk of ['right', 'evil', 'neutral']) {
        if (lexAll['event.' + ev.id + '.branch.' + bk] == null) missing.push('event.' + ev.id + '.branch.' + bk);
      }
    }
  }
  /* 事件等级/性质/分支标签族 + 独占法宝族（gear.ex.{id} 与定名 special） */
  for (const tt of ['ren', 'di', 'tian']) if (lexAll['event.tier.' + tt] == null) missing.push('event.tier.' + tt);
  for (const nn of ['good', 'bad']) if (lexAll['event.nature.' + nn] == null) missing.push('event.nature.' + nn);
  for (const bb of ['right', 'evil', 'neutral']) if (lexAll['branch.' + bb] == null) missing.push('branch.' + bb);
  for (const gid in SQ.XDATA.EXCLUSIVE_GEAR || {}) {
    if (lexAll['gear.ex.' + gid] == null) missing.push('gear.ex.' + gid);
    const sp = SQ.XDATA.EXCLUSIVE_GEAR[gid].special;
    if (sp && lexAll['gear.special.' + sp] == null) missing.push('gear.special.' + sp);
  }
  /* 装备族：品阶/特殊词条/槽位；丹药；秘境；属性；阵营；karma 档位；判定档位 */
  for (let gi = 0; gi < SQ.XDATA.GEAR_TIERS.length; gi++) {
    if (lexAll['gear.tier.' + gi] == null) missing.push('gear.tier.' + gi);
  }
  SQ.XDATA.GEAR_SPECIALS.forEach((s) => {
    if (lexAll['gear.special.' + s.id] == null) missing.push('gear.special.' + s.id);
  });
  SQ.XDATA.GEAR_SLOTS.forEach((sl) => {
    if (lexAll['gear.slot.' + sl] == null) missing.push('gear.slot.' + sl);
  });
  SQ.XDATA.PILLS.forEach((p) => {
    if (lexAll['pill.' + p.id + '.name'] == null) missing.push('pill.' + p.id + '.name');
    if (lexAll['pill.' + p.id + '.desc'] == null) missing.push('pill.' + p.id + '.desc');
  });
  for (let zi = 0; zi < SQ.XDATA.ZONES.length; zi++) {
    if (lexAll['combat.zone.' + zi] == null) missing.push('combat.zone.' + zi);
  }
  SQ.XDATA.ATTRS.forEach((a) => {
    if (lexAll['attr.' + a] == null) missing.push('attr.' + a);
    if (lexAll['attr.desc.' + a] == null) missing.push('attr.desc.' + a);
    if (lexAll['skill.nurture.' + a] == null) missing.push('skill.nurture.' + a);
  });
  ['right', 'evil', 'neutral'].forEach((al) => {
    ['align.', 'align.sym.', 'karma.tier.', 'karma.rateHint.'].forEach((pre) => {
      if (lexAll[pre + al] == null) missing.push(pre + al);
    });
  });
  ['easy', 'medium', 'hard', 'extreme'].forEach((dc) => {
    if (lexAll['dc.' + dc] == null) missing.push('dc.' + dc);
  });
  for (let oi = 1; oi <= 5; oi++) if (lexAll['odds.' + oi] == null) missing.push('odds.' + oi);
  for (let g = 0; g <= 2; g++) if (lexAll['special.grade.' + g] == null) missing.push('special.grade.' + g);
  /* 天道族（天道设计 §11.1 · 天道系统批 C1）：旨意 15 型名 / 档位 / 卦位 + 判词池 15×3 +
   * 谶语池 10 + 天象短评 6×3 + 烧空表 5 + few-shot 范本 5（动态拼接族按数据表全覆盖对账） */
  const TD = SQ.XDATA.TIANDAO;
  if (TD) {
    for (const d of TD.DECREES) {
      if (lexAll['tiandao.type.' + d.id] == null) missing.push('tiandao.type.' + d.id);
      for (let n = 1; n <= 3; n++) if (lexAll['tiandao.verdict.' + d.id + '.' + n] == null) missing.push('tiandao.verdict.' + d.id + '.' + n);
    }
    for (const tr of TD.TIERS) if (lexAll['tiandao.tier.' + tr] == null) missing.push('tiandao.tier.' + tr);
    for (const hx of TD.HEXAGRAMS) {
      if (lexAll['tiandao.hex.' + hx] == null) missing.push('tiandao.hex.' + hx);
      if (lexAll['tiandao.hexdesc.' + hx] == null) missing.push('tiandao.hexdesc.' + hx);
    }
    for (const nd of TD.OMEN_NODES) {
      for (let n = 1; n <= 3; n++) if (lexAll['tiandao.skyomen.' + nd + '.' + n] == null) missing.push('tiandao.skyomen.' + nd + '.' + n);
    }
    for (let n = 1; n <= 10; n++) if (lexAll['tiandao.omen.' + n] == null) missing.push('tiandao.omen.' + n);
    for (let n = 1; n <= 5; n++) {
      if (lexAll['tiandao.blank.' + n] == null) missing.push('tiandao.blank.' + n);
      if (lexAll['tiandao.prompt.ex.' + n] == null) missing.push('tiandao.prompt.ex.' + n);
    }
  }
  ok('A2', 'key 对账（静态引用 + 动态族 ⊆ 词表）', missing.length === 0,
    'missing=' + missing.slice(0, 8).join(',') + (missing.length > 8 ? '…' : '') + ' staticKeys=' + staticKeys.size);

  /* A5 道友 align 必填：世界包契约把 `align` 列为**必填**，但此前零断言守它——
   * 「实测 58/58 齐全」是数据自洽、不是门禁通过，扩容批漏填会静默把阵营同向判定
   * （bonds.js 拜访加成 / 天道兜底 / 图鉴取向计数）打成 undefined 比较。
   * ⚠️ 覆盖范围 = **只查修仙包**（本沙箱只 `require` 了 xiuxian 的 data.js，`SQ.XDATA` 即其导出）；
   *    古武军势等第二包落地时须把本门改成遍历 `SQ.Worlds` 各 pack 的 companions。 */
  const a5 = [];
  (SQ.XDATA.COMPANIONS || []).forEach((c) => {
    if (c.align !== 'right' && c.align !== 'evil' && c.align !== 'neutral') a5.push(c.id + '(' + c.align + ')');
  });
  if (!(SQ.XDATA.COMPANIONS || []).length) a5.push('COMPANIONS 空表 = 本门空转');
  ok('A5', '道友 align 必填（三态之一，禁 undefined / 脏值；现只覆盖修仙包）', a5.length === 0,
    a5.slice(0, 8).join(',') + ' 在册=' + (SQ.XDATA.COMPANIONS || []).length);

  /* A6 词表键消费侧反向扫描（孤儿键 · 2026-10-07 死链修复批补）：A2 只查「被引用的键必须存在于词表」，
   * 反向不查「存在的键是否被引用」，故 `break.tag`（旧「突破」死分类）/ `gear.latest`「最近拾得」两类
   * 「文案写了没人读」的孤儿键照绿出厂。判据 = 键名既没以字面量出现在任何代码/视图里，
   * 也不被任何代码里出现过的拼接前缀覆盖 → 判为不可达。
   * ⚠ 报告级恒 PASS 不判失败，两条理由：① 「词表先行、触发点后补」是本仓既有工序，硬门禁会误伤扩容批；
   * ② **本判据只有假阴没有假阳**——粗前缀会吞掉整族（实测案例：`gear.js:25 return 'gear.' + slot`
   *    使 `gear.latest` 被判「已覆盖」，而全库检索确认该键仅存在于 `lexicon.js:144` 定义行）。
   * 故清单读法 = 「列出的必死、未列出的未必活」，历史上逐条抽查过 7 键（dc.easy / ui.claim / shop.owned /
   * role.title / arts.lv / karma.value / tribulation.start）均为「仅定义行命中」= 真死文案。
   * 🔧 **N20 处置批 2026-10-10 随批刷新**：这 7 键 + 同族共 36 条已按用户授权删除、24 条已接线，
   *   孤儿读数由 **62 key / 43 族 → 3 key / 3 族**（余 = `arts.bond.discount`〔押后：mods 只给 ΣartsSpeed，
   *   「心宽 −p%」的归属需引擎先暴露 bond 通道小计，接上去就是说谎〕+ `codex.ui.newentry`〔文案先行：
   *   触发机制未实施〕+ `tribulation.system`〔词族契约点名的换皮键，删 = 废契约行〕）。
   *   ⚠️ 本关仍是**报告级恒 PASS**：孤儿数不是断言，删除动作的回归保护为零 ⇒ 逐条判定落在
   *   `docs/N20-孤儿文案逐条处置表.md`，其中 6 条被测试钉住的键（dc.* 由 A2、ui.claim 由冒烟、
   *   break.tag 由走查 C4g 反向钉「缺席」）已随批同改测试，单删词表会红的形状本轮已实测过一次。 */
  const a6 = [];
  const cov6by = {};
  for (const k of Object.keys(lexAll)) {
    if (staticKeys.has(k) || litKeys.has(k)) continue;
    let cov6 = null;
    for (const p of dynPrefixes) if (k.indexOf(p) === 0) { cov6 = p; break; }
    if (!cov6) a6.push(k); else cov6by[k] = cov6;
  }
  const fam6 = {};
  for (const k of a6) { const f6 = k.split('.').slice(0, 2).join('.'); fam6[f6] = (fam6[f6] || 0) + 1; }
  ok('A6', '词表键消费侧反向扫描（孤儿键 · 报告级恒 PASS，孤儿族逐条打印）', true,
    '孤儿 ' + a6.length + ' key / ' + Object.keys(fam6).length + ' 族 ‖ ' +
    Object.keys(fam6).sort().map((f6) => f6 + '×' + fam6[f6]).join(' '));
  if (process.env.A6_DUMP) a6.sort().forEach((k6) => console.log('  ORPHAN ' + k6 + ' = ' + lexAll[k6]));
  /* A6 校准口（A6_CHECK=k1,k2）：打印指定键的判据来源，用于自查「粗前缀吞掉整族」的假阴 */
  if (process.env.A6_CHECK) process.env.A6_CHECK.split(',').forEach((k6) => console.log(
    '  CHECK ' + k6 + ' → ' + (a6.indexOf(k6) >= 0 ? '孤儿' :
      (staticKeys.has(k6) || litKeys.has(k6) ? '字面量命中' : '前缀覆盖 ' + cov6by[k6]))));

  /* A3 DOM id 对账：脚本里取元素用的 id 必须在同一 HTML 内静态存在
   * （取不到 = null.textContent 直接白屏；动态拼接 id 如 'jline-'+i 按前缀白名单放行） */
  /* 'lawsec-' = 法与器合并页两个段标锚点（`secDiv()` 拼 'lawsec-fa'/'lawsec-qi'，由概览条
   * `lawJump` 以 `getElementById('lawsec-' + v)` 消费）——节点随 innerHTML 动态渲染，与
   * `openCave()` 取 `#cave-sec` 同因（页面整合批 2026-10-06 登记）。 */
  const DYN_PREFIX = ['jline-', 'lawsec-'];
  const a3 = [];
  for (const f of htmlFiles) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = relOf(f);
    const ids = new Set([...src.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    const code = [];
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(src))) code.push(m[1]);
    const body = code.join('\n');
    const refs = [...body.matchAll(/\$\('([^']+)'\)|getElementById\(\s*'([^']+)'\s*\)/g)]
      .map((x) => x[1] || x[2]);
    for (const r of new Set(refs)) {
      if (ids.has(r)) continue;
      if (DYN_PREFIX.some((p) => r.startsWith(p))) continue;
      a3.push(rel + ':' + r);
    }
  }
  ok('A3', 'DOM id 对账（脚本引用的 id 全部静态存在）', a3.length === 0, a3.slice(0, 8).join(','));

  /* A4 界面词表拉丁词扫描：词表 value（剥占位符后）不得含英文单词——防内部标识
   * （槽位 id / 数据字段名 / 缩写）漏进界面文案（如「打造 treasure 槽法器」「bond +3」）。
   * 白名单 = 正典既定标识 Lv / NPC / pp + 天道贴模型流程的技术名词 AI / JSON；
   * tiandao.prompt.* 与 tiandao.memo.* 为 LLM 提示词模板与贴回说明，非界面文案，整族豁免。 */
  const LATIN_OK = ['Lv', 'NPC', 'pp', 'AI', 'JSON'];
  const LATIN_EXEMPT = ['tiandao.prompt.', 'tiandao.memo.'];
  const a4 = [];
  for (const wid of Object.keys(SQ.LEX)) {
    const lex = SQ.LEX[wid] || {};
    for (const k in lex) {
      if (LATIN_EXEMPT.some((p) => k.indexOf(p) === 0)) continue;
      const v = String(lex[k]).replace(/\{[^}]*\}/g, '');
      const hit = (v.match(/[A-Za-z]+/g) || []).filter((t) => LATIN_OK.indexOf(t) < 0);
      if (hit.length) a4.push(wid + ':' + k + ' → ' + hit.join(','));
    }
  }
  ok('A4', '界面词表拉丁词扫描（白名单外零命中）', a4.length === 0, a4.slice(0, 8).join(' | '));
})();

/* ── A7 法宝运行态 st 键集登记对表（2026-10-09 展示流与落档口径批立）
 * 立因：`owned[].st` 是**无 schema 的透传面**——`treasures.js` 的 normalize 整块带过，
 *   任何新字段一旦写进去即永久随玩家档走。存档治理批把它列为遗留项（⑨），
 *   本批按「**登记制而非运行时收敛**」收口：白名单砍键会砍掉未来合法字段并破「读档往返无损」
 *   那一族判据，代价大于收益；改为「写点必须先登记」，由闸门拦。
 * 口径：只扫 `assets/**` 的 `.st.<key>` 字面引用（`.tests/` 里取证用的假键不算写点；
 *   `view/` `module/` 内联脚本的**读点**不在本表范围——写运行态是引擎侧纪律，
 *   ⚠️ 这是本关的已知盲区，与 A5「只覆盖修仙包」同类，如实登记不装作全覆盖）。
 *   登记表 = `assets/systems/treasures.js` 末段 `ST_KEYS: [...]` 字面量（不从沙箱取，
 *   免得装载顺序一变就恒真/恒假；**读不到表直接红** = 表没了就是纪律没了）。
 * 判据：写点集 ⇔ 登记表 **双向相等**——有写点未登记 = 新字段没走口径评审；
 *   有登记无写点 = 死登记（与 A6 孤儿键同型，本仓已有先例）。
 *   二级结构（`st.spirit` 内部形状）不在本表，归器灵卷 §schema 与既有断言守。 */
(function () {
  var REG_F = 'assets/systems/treasures.js';
  var regSrc = fs.existsSync(REG_F) ? fs.readFileSync(REG_F, 'utf8') : '';
  var m = regSrc.match(/ST_KEYS:\s*\[([^\]]*)\]/);
  if (!m) {
    ok('A7', '法宝运行态 st 键集登记对表', false,
      '登记表读不到：' + REG_F + ' 内没有 `ST_KEYS: [...]` 字面量（登记表本身消失 = 纪律失守，不是放行理由）');
    return;
  }
  var reg = (m[1].match(/'[^']*'/g) || []).map(function (x) { return x.slice(1, -1); });
  var wrote = {}, where = {};
  jsFiles.filter(function (f) { return relOf(f).indexOf('assets/') === 0; }).forEach(function (f) {
    var src = fs.readFileSync(f, 'utf8');
    (src.match(/\.st\.[a-zA-Z_$][\w$]*/g) || []).forEach(function (x) {
      var k = x.slice(4);
      wrote[k] = (wrote[k] || 0) + 1;
      if (!where[k]) where[k] = relOf(f);
    });
  });
  var unreg = Object.keys(wrote).filter(function (k) { return reg.indexOf(k) < 0; });
  var dead = reg.filter(function (k) { return !wrote[k]; });
  ok('A7', '法宝运行态 st 键集登记对表（写点 ⇔ ST_KEYS 双向相等 · st 为无 schema 透传面，采登记制而非运行时收敛 · 只扫 assets/** 为已知边界）',
    reg.length > 0 && unreg.length === 0 && dead.length === 0,
    '在册 ' + reg.length + ' 键 = ' + reg.join(',') +
    ' ‖ 表外写点=' + (unreg.length ? unreg.map(function (k) { return k + '@' + where[k]; }).join(', ') : '无') +
    ' ‖ 死登记（表里有而源码无写点）=' + (dead.length ? dead.join(', ') : '无'));
})();

/* ── A8 「静默失效」普查：账本分类 ⇔ 调用点、`ws.*` 写点 ⇔ normalize 声明集
 *      （2026-10-10 耦合缺陷收口批立 · 同日**独立复核返修**：复核抓到原判据自身的两处盲区——
 *        ① 用「整行正则」找 `note(ws,'in','kill',…)`，于是 `note(ws, d>0?'in':'out', d>0?'event':'event_loss',…)`
 *           这类**三元式调用点整点不入射程**（`assets/systems/events.js` 就有一处，是全仓唯一「方向自翻」的写口）；
 *        ② 字段写点只认 `ws.x =`，漏 `ws.x +=` / `ws['x'] =` / 视图侧 `nws.x =`，且扫描面只有 `assets/`。
 *       本关立来防的正是「写了没人接却零症状」，判据自己留同一种盲区不可接受 ⇒ 改为**逐调用点解析实参** +
 *       写点形态扩面，并加「调用点数 ⇔ 解析数」自证（对不上就红，不许静默少扫）。
 * 立因（原判据逐字保留）：同批抓获的两件真缺陷**都是零症状的**——
 *   ① `treasures.js` 两处 `note(ws,'out','treasure')` 而 `OUT_CATS` 从未登记该分类，
 *      而 `note()` 的设计就是「非法分类静默拒绝返 0」（防占位空类复活）⇒ 灵石真扣了、总账不记、
 *      **#113 恒等式必漂**，而冒烟全绿（既有断言没走祭炼那条路，直到本批才被发现）；
 *   ② `factions.js` 写 `ws.factionJoinedAt`，`initialState` / `normalize` 都没这个键
 *      ⇒ 下次读档即被剪掉，全仓也无人读它（死写）。
 *   两件同型：**写了、没有承接方、且没有任何一处会红**。这类只能普查，盯 diff 盯不住。
 * 口径：白名单从 `assets/systems/ledger.js` 源码字面量读（不从沙箱取——装载顺序一变就恒真/恒假，同 A7 理由）；
 *   声明集取 live 世界包 `pack.normalize({})` 的键集（**读档后真实存在的键才是真相**）。
 * 判据（任一命中即红）：
 *   ① 每个 `SQ.Ledger.note()` 调用点：方向字面量必 ∈ {in,out}、分类字面量必在**对应**白名单里；
 *      方向与分类**数量相等时按位置配对**（三元式 `d>0?'in':'out'` ⇔ `d>0?'event':'event_loss'` 同条件同序），
 *      不等时退化为「分类 ∈ in∪out」的并集判（宁松不错杀，但仍在射程内）；
 *      反向 = 白名单在册却**零调用点** ⇒ 占位空类复活（v1.2 曾清掉 sell / refine_loss 两个，本关让它不能再回来）；
 *      自证 = 扫到的 `note(` 出现次数必须与「解析成功且拿到字面量」的次数相等，且**实参非字面量的调用点直接红**
 *      （分类由变量传入 = 本关无从对表 = 不许算通过）；
 *   ② `ws.<字段> =` / `ws.<字段> +=` / `ws['<字段>'] =` / `nws.<字段> =` / `nws['<字段>'] =` 写点
 *      ⊄ 声明集 = 幽灵字段（读档即丢）。扫描面 = `assets/**` + `view` + `module`，
 *      **不含 `.tests/`**（测试 fixture 造的本就是假字段，扫它只会教人把关卡关掉——如实登记为边界）；
 *   ③ `ws.bonds[...] =` / `ws.bonds.<k> =` 元素与属性直写只许出现在 `assets/systems/bonds.js`（唯一写口所在地）
 *      与 `assets/worlds/<id>/index.js`（读档播种与旧哨兵迁移属声明流程）。
 *      ⚠️ 只认 **带前导点** 的 `.bonds`：`mods.js:148` 有个同名**局部**聚合对象（乘区汇总用的 `bonds`），
 *      裸 `bonds[pk.channel] += v` 不是好感写口——原判据靠「只匹配 `=` 不匹配 `+=`」侥幸避开，
 *      补上复合赋值后就会假红，故按「写的是世界态那个 bonds」来定形（复核给的修法）。
 *   ④ `ws.heirBond` 直写只许出现在 `assets/systems/bonds.js`（grantHeir 成功分支与 redeem 两个写口所在地）
 *      与 `assets/worlds/<id>/index.js`（声明与读档）——N23① 收口批随件扩段，防「视图调用后又自赋同值」
 *      这种把成就判定源写在天书外的形状再回来一次。
 *   反空集护栏：声明集键数必须 > 50，否则本关判红——沙箱没装好时不许静默放行。
 * 已知边界（如实登记，不装作全覆盖）：② 是「写点 ⊆ 声明集」的**单向**包含（声明了却没人写 = 死登记，
 *   本关不判——那是 A6 孤儿键那一族的形状）；③ 是白名单式禁写，无「死豁免」反向；
 *   别名（`var w = ws; w.x = …`）、`Object.assign(ws, …)`、解构赋值仍在射程外；
 *   无 schema 透传面（`owned[].st`）归 A7。 */
(function () {
  var LED = 'assets/systems/ledger.js';
  var lsrc = fs.existsSync(LED) ? fs.readFileSync(LED, 'utf8') : '';
  function catList(name) {
    var m = lsrc.match(new RegExp('var\\s+' + name + '\\s*=\\s*\\[([^\\]]*)\\]'));
    if (!m) return null;
    return (m[1].match(/'[^']*'/g) || []).map(function (x) { return x.slice(1, -1); });
  }
  var INC = catList('IN_CATS'), OUTC = catList('OUT_CATS');
  if (!INC || !OUTC) {
    ok('A8', '「静默失效」普查（账本分类 ⇔ 调用点 · ws 写点 ⇔ normalize 声明集）', false,
      '读不到 ' + LED + ' 里的 IN_CATS/OUT_CATS 字面量 = 白名单本身消失，属纪律失守而非放行理由');
    return;
  }
  var bad = [];
  var used = { in: {}, out: {} };
  /* 扫描面：assets/** + view + module（.tests 有意排除，见头部边界）*/
  var seen = {}, scanFiles = [];
  [].concat(jsFiles, htmlFiles).forEach(function (f) {
    var r = relOf(f);
    if (!(r.indexOf('assets/') === 0 || r.indexOf('view/') === 0 || r.indexOf('module/') === 0)) return;
    if (seen[r]) return; seen[r] = 1; scanFiles.push(f);
  });
  function srcOf(f) { return stripComments(fs.readFileSync(f, 'utf8')); }
  /* 顶层实参切分：从 note( 之后扫到配平的 )，引号内不切、括号深度自管 */
  function readArgs(s, i) {
    var out = [], cur = '', depth = 1, q = null;
    for (; i < s.length; i++) {
      var ch = s[i];
      if (q) { cur += ch; if (ch === q && s[i - 1] !== '\\') q = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { q = ch; cur += ch; continue; }
      if (ch === '(' || ch === '[' || ch === '{') { depth++; cur += ch; continue; }
      if (ch === ')' || ch === ']' || ch === '}') {
        depth--;
        if (depth === 0) { out.push(cur); return out; }
        cur += ch; continue;
      }
      if (ch === ',' && depth === 1) { out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    return null;                                        /* 配平失败 = 解析不了，调用方据此判红 */
  }
  function lits(expr) {
    var m, re = /'([^'\\]*)'|"([^"\\]*)"/g, a = [];
    while ((m = re.exec(expr))) a.push(m[1] !== undefined ? m[1] : m[2]);
    return a;
  }
  var noteSeen = 0, notePaired = 0;
  scanFiles.forEach(function (f) {
    if (relOf(f) === LED) return;                        /* 白名单定义体自身不是调用点 */
    var src = srcOf(f), from = 0, idx;
    while ((idx = src.indexOf('SQ.Ledger.note(', from)) >= 0) {
      from = idx + 'SQ.Ledger.note('.length; noteSeen++;
      var args = readArgs(src, from);
      if (!args || args.length < 3) { bad.push(relOf(f) + ' note() 实参解析失败（配平没走完）⇒ 扫描面残缺'); continue; }
      var dirs = lits(args[1]), cs = lits(args[2]);
      if (!dirs.length || !cs.length) {
        bad.push(relOf(f) + ' note() 的方向或分类不是字符串字面量（' + args[1].trim().slice(0, 40) +
          ' / ' + args[2].trim().slice(0, 40) + '）⇒ 本关无从对表，不许算通过');
        continue;
      }
      notePaired++;
      var pairs = [];
      if (dirs.length === cs.length) { for (var k = 0; k < dirs.length; k++) pairs.push([dirs[k], cs[k]]); }
      else cs.forEach(function (c) { pairs.push([null, c]); });     /* 退化：并集判 */
      pairs.forEach(function (p) {
        var d = p[0], c = p[1];
        if (d === null) {
          if (INC.indexOf(c) < 0 && OUTC.indexOf(c) < 0) bad.push(relOf(f) + ' note(?, ' + c + ') 分类未登记');
          if (INC.indexOf(c) >= 0) used.in[c] = true;
          if (OUTC.indexOf(c) >= 0) used.out[c] = true;
          return;
        }
        if (d !== 'in' && d !== 'out') { bad.push(relOf(f) + ' note() 方向字面量不是 in/out：' + d); return; }
        if ((d === 'in' ? INC : OUTC).indexOf(c) < 0) bad.push(relOf(f) + ' note(' + d + ', ' + c + ') 分类未登记');
        else used[d][c] = true;
      });
    }
  });
  if (noteSeen !== notePaired) bad.push('note() 调用点 ' + noteSeen + ' 处、成功对表 ' + notePaired +
    ' 处 ⇒ 有调用点没进射程，本关读数不作数');
  INC.forEach(function (c) { if (!used.in[c]) bad.push('in 分类 ' + c + ' 零调用点（占位空类复活）'); });
  OUTC.forEach(function (c) { if (!used.out[c]) bad.push('out 分类 ' + c + ' 零调用点（占位空类复活）'); });
  /* ② 声明集：要真跑 normalize 才拿得到 ⇒ 借沙箱装载器（audit 本体是静态扫描，只装词表与数据表，
   *    SQ.Worlds[id].pack 在其装载剖面里是 null）。装载失败即判红，不静默放行。 */
  var declared = {}; var boot = null;
  try { boot = require('./sandbox.cjs').load([], { quiet: true }).sandbox.window.SQ; }
  catch (e) { bad.push('沙箱装载失败（声明集取不到 = 本关无从判起）：' + e.message); }
  if (boot) {
    Object.keys(boot.Worlds).filter(function (id) { return boot.Worlds[id].status === 'live'; }).forEach(function (id) {
      try {
        Object.keys(boot.Worlds[id].pack.normalize({}) || {}).forEach(function (k) { declared[k] = true; });
      } catch (e) { bad.push('世界包 ' + id + ' normalize({}) 抛异常：' + e.message); }
    });
  }
  var dkeys = Object.keys(declared);
  if (dkeys.length <= 50) bad.push('声明集键数仅 ' + dkeys.length + '（反空集护栏：沙箱未装载好时不许静默放行）');
  var FIELD_RES = [
    /\bws\.([a-zA-Z_$]\w*)\s*=(?!=)/g,
    /\bws\.([a-zA-Z_$]\w*)\s*(?:\+|-|\*|\/|%|\|\|)=/g,
    /\bws\[\s*'([a-zA-Z_$]\w*)'\s*\]\s*=(?!=)/g,
    /\bnws\.([a-zA-Z_$]\w*)\s*=(?!=)/g,
    /\bnws\[\s*'?([a-zA-Z_$]\w*)'?\s*\]\s*=(?!=)/g
  ];
  var wroteFields = {};
  scanFiles.forEach(function (f) {
    var src = srcOf(f);
    FIELD_RES.forEach(function (re) {
      var m; re.lastIndex = 0;
      while ((m = re.exec(src))) {
        if (!m[1] || !dkeys.length) continue;
        wroteFields[m[1]] = true;
        if (!declared[m[1]]) bad.push(relOf(f) + ' 写 ws.' + m[1] + ' 未在 initialState/normalize 声明（读档即丢）');
      }
    });
  });
  /* ③ 好感元素/属性直写普查（同批第三件：势力入门与创角承继原本绕过 Bonds.gain 直写 bonds[]，
   *    绕过就等于绕过绝交锁 / 心结锁 / clamp——两处调用方各自补了一遍前置检查 = 重复实现）。
   *    豁免两处：bonds.js 自身（唯一写口所在地）与 worlds/<id>/index.js 的 normalize（读档播种与
   *    旧哨兵迁移，是声明流程的一部分）。复核返修 = 原正则 `\[[^\]]+\]` 遇嵌套下标（`bonds[a[i].id]`）
   *    会整条漏掉 ⇒ 改成括号深度扫描，并补 `bonds.<k> =` 属性写形态。 */
  var BOND_OK = ['assets/systems/bonds.js'];
  var bondBad = [];
  scanFiles.forEach(function (f) {
    var rel = relOf(f);
    if (BOND_OK.indexOf(rel) >= 0 || /^assets\/worlds\/[^/]+\/index\.js$/.test(rel)) return;
    var src = srcOf(f);
    var re = /\.bonds\s*(?:\[|\.)/g, m;
    while ((m = re.exec(src))) {
      var i = m.index + m[0].length, after;
      if (src[m.index + m[0].length - 1] === '.') {        /* 属性写 bonds.foo = …（读不算：`===` 有 (?!=) 挡）*/
        if (/^\s*[a-zA-Z_$]\w*\s*=(?!=)/.test(src.slice(i, i + 40)) ||
          /^\s*[a-zA-Z_$]\w*\s*(\+|-|\*|\/|%|\|\|)=/.test(src.slice(i, i + 40))) bondBad.push(rel);
        continue;
      }
      var depth = 1, q = null;
      for (; i < src.length; i++) {
        var c = src[i];
        if (q) { if (c === q && src[i - 1] !== '\\') q = null; continue; }
        if (c === "'" || c === '"' || c === '`') { q = c; continue; }
        if (c === '[') depth++;
        else if (c === ']') { depth--; if (!depth) break; }
      }
      after = src.slice(i + 1, i + 10);
      if (/^\s*=(?!=)/.test(after) || /^\s*(\+|-|\*|\/|%|\|\|)=/.test(after)) bondBad.push(rel);
    }
  });
  if (bondBad.length) bad.push('绕过 Bonds.gain/lose/grantHeir 的好感直写：' +
    Array.from(new Set(bondBad)).join(','));
  /* ④（N23① 收口批随件扩段）`ws.heirBond` 直写普查：判定源「缘定三生」由 Bonds.grantHeir 成功分支 /
   *    Bonds.redeem 独占。视图原先在调用后**无条件**赋同值——播种被锁拒时成就凭空成立，且没有任何一处会红；
   *    本段让"下一个调用点又这么写"当场红（豁免面与 ③ 同两处：bonds.js 与 worlds/<id>/index.js 的声明流程）。 */
  var heirBad = [];
  scanFiles.forEach(function (f) {
    var rel = relOf(f);
    if (BOND_OK.indexOf(rel) >= 0 || /^assets\/worlds\/[^/]+\/index\.js$/.test(rel)) return;
    var m = /\.heirBond\s*=(?!=)/.exec(srcOf(f));
    if (m) heirBad.push(rel);
  });
  if (heirBad.length) bad.push('绕过 Bonds.grantHeir/redeem 的 heirBond 直写：' +
    Array.from(new Set(heirBad)).join(','));
  ok('A8', '「静默失效」普查（账本分类 ⇔ 调用点 · ws/nws 写点 ⇔ normalize 声明集 · bonds 直写白名单 · heirBond 直写白名单；' +
    '① 逐调用点解析实参 + 调用点数自证，② ③ 见头部已知边界）',
    bad.length === 0,
    '白名单 in' + INC.length + '/out' + OUTC.length + ' ‖ 声明键 ' + dkeys.length +
    ' ‖ note 调用点 ' + notePaired + '/' + noteSeen + ' ‖ 扫到写点字段 ' +
    Object.keys(wroteFields).length + ' ‖ ' + (bad.slice(0, 6).join(' | ') || '零命中'));
})();

/* ── A9 世界表顶层常量 ⇔ 消费面对表（2026-10-10 N24① / N23 收口批立）
 * 立因：神秘商人 №61 的战力门槛长期有**两个事实源**——世界表常量 `D.MERCHANT_POWER_ABS`（全库零消费 = 死桩，
 *   改它不带动任何消费者）与事件表 `choices.evil.check.abs` 字面量。A7 只管法宝 `st` 写点、A8 只管
 *   「写点 ⇔ normalize 声明集」，**「声明了却没人读的常量」不在任何一关射程内** ⇒ 这一类可以一直静默成立。
 *   本批删掉那个常量（字面量即唯一取数口），并立本关让同型死桩不能再回来；N22 ⑤ 的四条死桩与
 *   N22 ④ 的 `KARMA_TIERS` 一并转为在册。
 * 口径：常量集 = 沙箱里 live 世界包 `pack.data` 的**顶层键**（不抄文档、不用正则扫表——装载剖面一变就假）；
 *   消费面 = `assets/**` + `view` + `module` 源码（注释剥离后），认 `.KEY` 与 `['KEY']` / `["KEY"]` 两种取数写法
 *   （`A(D).KEY` / `SP(D).KEY` 这类别名后置点号同样命中）；**不含 `.tests/`**（测试读一眼就算"消费"的话，
 *   死桩永远清不干净——与 A8 同一边界口径）。
 * 判据（**双向相等**，任一命中即红）：零消费者键集 === 在册死桩清单。
 *   多一条未登记 ⇒ 红（本关要防的形状）；在册者已被消费或已删 ⇒ 也红（**在册清单自己不许腐烂**，
 *   否则关卡会慢慢变成"永远绿但对不上任何账"）。
 * 反空集护栏：顶层常量数 > 100 且扫描文件数 > 40，否则判红——沙箱或扫描面没装好时不许静默放行。
 * 已知边界（如实登记，不装作全覆盖）：① 只覆盖世界数据表**顶层**，嵌套 config（`D.LEGACY.*` /
 *   `D.RUMORS.TTL`）与数组型表体（`D.REALMS` 的行内字段）不在射程；② 不判"两侧都有消费者的同值对"——
 *   №61 的 375000 与 `REALMS[元婴].power` 正是这种（后者是正典溯源，不是死桩），那属数值一致性判据；
 *   ③ 键名恰好只出现在字符串里的话会算"有消费者"（假阴方向 = 放过死桩，与 A6 同族，逐条处置仍靠人）。 */
(function () {
  /* 在册死桩 = 本批取证时"零消费者"的实测集合（N22 ⑤ 四条 + KARMA_TIERS 一条 − 本批已删的 MERCHANT_POWER_ABS）*/
  var DEAD_LISTED = ['EVENT_KARMA_BAND', 'FACTION_DESC_POOL', 'KARMA_TIERS', 'SHARD_REWARDS'];
  var boot9 = null;
  try { boot9 = require('./sandbox.cjs').load([], { quiet: true }).sandbox.window.SQ; }
  catch (e) { ok('A9', '世界表顶层常量 ⇔ 消费面对表（死桩双向在册）', false, '沙箱装载失败：' + e.message); return; }
  var seen9 = {}, files9 = [];
  [].concat(jsFiles, htmlFiles).forEach(function (f) {
    var r = relOf(f);
    if (!(r.indexOf('assets/') === 0 || r.indexOf('view/') === 0 || r.indexOf('module/') === 0)) return;
    if (seen9[r]) return; seen9[r] = 1; files9.push(f);
  });
  var src9 = files9.map(function (f) { return stripComments(fs.readFileSync(f, 'utf8')); }).join('\n');
  var bad9 = [], dead9 = [], total9 = 0;
  Object.keys(boot9.Worlds).filter(function (id) { return boot9.Worlds[id].status === 'live'; })
    .forEach(function (id) {
      var d = (boot9.Worlds[id].pack || {}).data;
      if (!d) { bad9.push('世界包 ' + id + ' 取不到 pack.data（常量集为空 ⇒ 本关无从判起）'); return; }
      Object.keys(d).forEach(function (k) {
        total9++;
        var re9 = new RegExp('\\.' + k + '\\b|\\[[\'"]' + k + '[\'"]\\]');
        if (!re9.test(src9)) dead9.push(k);
      });
    });
  dead9.sort();
  if (total9 <= 100) bad9.push('顶层常量只读到 ' + total9 + ' 条（≤100 ⇒ 数据表没装好，本关读数不作数）');
  if (files9.length <= 40) bad9.push('扫描面只读到 ' + files9.length + ' 个文件（≤40 ⇒ 扫描面塌陷）');
  dead9.forEach(function (k) {
    if (DEAD_LISTED.indexOf(k) < 0) bad9.push('新增死桩（零消费者且未登记）：D.' + k);
  });
  DEAD_LISTED.forEach(function (k) {
    if (dead9.indexOf(k) < 0) bad9.push('在册死桩 D.' + k + ' 已不在零消费集（被消费了或已删 ⇒ 在册清单该随批更新）');
  });
  ok('A9', '世界表顶层常量 ⇔ 消费面对表（零消费者 = 死桩 · 与在册清单**双向相等**；嵌套 config 与「两侧都有消费者的同值对」不在射程，见头部边界）',
    bad9.length === 0,
    '常量 ' + total9 + ' 条 ‖ 扫描文件 ' + files9.length + ' ‖ 零消费者 ' + dead9.length +
    '（' + dead9.join(',') + '） ‖ 在册 ' + DEAD_LISTED.length + ' ‖ ' + (bad9.slice(0, 6).join(' | ') || '零命中'));
})();

/* ── C 组 · 世界包词族契约（G11 · 换世界即换系统名与菜单描述）
 *   C1 must 族：每个 live 世界分卷必须各自拥有（≥1 条该前缀 key）——世界身份不缺项；
 *   C2 forbid 族：世界分卷不得出现（跨世界通用文案只留 common，防世界间漂移）。 ── */
(function () {
  const contract = SQ.LEX_CONTRACT;
  if (!contract) { ok('C1', '词族契约声明（SQ.LEX_CONTRACT）存在', false, '缺失'); return; }
  const liveIds = Object.keys(SQ.Worlds).filter((id) => SQ.Worlds[id].status === 'live');
  const c1 = [];
  for (const id of liveIds) {
    const lex = SQ.LEX[id] || {};
    for (const m of contract.must) {
      if (!Object.keys(lex).some((k) => k.indexOf(m.fam) === 0)) c1.push(id + ':' + m.fam);
    }
  }
  ok('C1', 'must 族覆盖（每个 live 世界分卷各有 ≥1 条）', c1.length === 0, c1.slice(0, 8).join(','));

  const c2 = [];
  for (const id of liveIds) {
    const lex = SQ.LEX[id] || {};
    for (const m of contract.forbid) {
      const hit = Object.keys(lex).filter((k) => k.indexOf(m.fam) === 0);
      if (hit.length) c2.push(id + ':' + hit[0]);
    }
  }
  ok('C2', 'forbid 族零命中（世界分卷不得覆写通用文案）', c2.length === 0, c2.slice(0, 8).join(','));
})();

/* ── B 组 · 平台关卡 ── */
(function () {
  /* B1 manifest */
  let mani = null, b1 = [];
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8');
    if (/\/\*|\/\//.test(raw)) b1.push('manifest 含注释');
    mani = JSON.parse(raw);
    if (!/^\d+\.\d+\.\d+$/.test(mani.version)) b1.push('version 非三段');
    for (const k of ['module', 'view']) {
      if (!fs.existsSync(path.join(ROOT, mani.entry[k]))) b1.push('entry 缺失 ' + k);
    }
    if (mani.id.startsWith('com.x-hub.')) b1.push('id 占用平台保留段');
    if (!fs.existsSync(path.join(ROOT, mani.icon))) b1.push('icon 缺失');
  } catch (e) { b1.push('manifest 解析失败 ' + e.message); }
  ok('B1', 'manifest 合法', b1.length === 0, b1.join(';'));

  /* B2 权限对账：纯文本扫（含注释——平台静态扫描同口径） */
  const ALLOWED_NS = ['storage', 'runtime', 'events', 'theme', 'config'];
  const b2 = [];
  const allSrc = jsFiles.map((f) => fs.readFileSync(f, 'utf8'))
    .concat(htmlFiles.map((f) => fs.readFileSync(f, 'utf8')));
  for (const src of allSrc) {
    const re = /xhub\.([a-zA-Z]+)\s*\./g;
    let m;
    while ((m = re.exec(src))) {
      if (!ALLOWED_NS.includes(m[1])) b2.push(m[0]);
    }
  }
  if (mani && Array.isArray(mani.permissions) && mani.permissions.length) b2.push('permissions 应为 []');
  ok('B2', '权限对账（零越权 xhub.* 字样，含注释）', b2.length === 0, b2.slice(0, 5).join(','));

  /* B3 零 CDN */
  const b3 = [];
  for (const f of htmlFiles) {
    const src = fs.readFileSync(f, 'utf8');
    if (/https?:\/\//.test(src)) b3.push(relOf(f));
  }
  ok('B3', '零 CDN（入口 HTML 无外链）', b3.length === 0, b3.join(','));

  /* B4 主题铁律（module 卡为透明玻璃底，不要求 --xhub-surface） */
  const viewSrc = fs.readFileSync(path.join(ROOT, 'view/index.html'), 'utf8');
  const modSrc = fs.readFileSync(path.join(ROOT, 'module/index.html'), 'utf8');
  const b4 = [];
  if (!viewSrc.includes('background: var(--xhub-page-bg, transparent)')) b4.push('view 页面底非透明变量');
  if (!viewSrc.includes('var(--xhub-surface')) b4.push('view 缺 --xhub-surface');
  if (!/background:\s*transparent/.test(modSrc)) b4.push('module 卡底非透明');
  for (const [n, s] of [['view', viewSrc], ['module', modSrc]]) {
    if (!s.includes(':root[data-xhub-theme="dark"]')) b4.push(n + ' 缺深色双声明');
  }
  ok('B4', '主题铁律（透明底 + 双声明）', b4.length === 0, b4.join(';'));

  /* B5 module 格子纪律 */
  const b5 = [];
  const modCss = modSrc.slice(0, modSrc.indexOf('</style>'));
  const noComment = modCss.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/min-height/.test(noComment)) b5.push('module CSS 出现 min-height');
  if (!/padding:\s*12px/.test(noComment)) b5.push('body 非 12px 内边距');
  if (!/container-type:\s*size/.test(noComment)) b5.push('缺 container-type:size');
  if (!/overflow:\s*hidden/.test(noComment)) b5.push('缺 overflow:hidden');
  ok('B5', 'module 格子纪律', b5.length === 0, b5.join(';'));

  /* B6 外链行为 */
  const b6 = [];
  for (const src of allSrc) {
    if (/window\.open\s*\(/.test(src)) b6.push('window.open');
    if (/target\s*=\s*["']_blank/.test(src)) b6.push('target=_blank');
  }
  ok('B6', '外链行为审计（零 window.open/_blank）', b6.length === 0, b6.join(','));

  /* B7 壁纸透底态（#86 静态半区：去白描边 + 留落影 + 文字黑柔光晕；三态目检仍需真机） */
  const b7 = [];
  for (const [n, s] of [['view', viewSrc], ['module', modSrc]]) {
    const m = s.match(/:root\[data-xhub-wallpaper-clear="1"\][\s\S]{0,400}?\}/);
    if (!m) { b7.push(n + ' 缺透底态规则'); continue; }
    const blk = m[0];
    if (!/border(-color)?:\s*transparent/.test(blk)) b7.push(n + ' 透底态未去描边');
    if (!/box-shadow:/.test(blk)) b7.push(n + ' 透底态缺落影');
    if (!/text-shadow:/.test(blk)) b7.push(n + ' 透底态缺文字光晕');
  }
  ok('B7', '壁纸透底态规则（去描边 + 落影 + 文字光晕）', b7.length === 0, b7.join(';'));

  /* B8 桥容错（#89）：assets 里 xhub.* 只允许出现在单一桥模块且读写各自包 try/catch；
   * HTML 内联里的桥调用（module 卡 runtime.open）必须自带 try/catch；
   * 失败经 SQ.storageError 暴露给视图出人话提示（不白屏、不静默丢档） */
  const b8 = [];
  const bridgeFiles = jsFiles.filter((f) => /xhub\./.test(fs.readFileSync(f, 'utf8')));
  for (const f of bridgeFiles) {
    if (relOf(f) !== 'assets/core.js') b8.push('桥外调用 ' + relOf(f));
  }
  const coreSrc = bridgeFiles.length ? fs.readFileSync(bridgeFiles[0], 'utf8') : '';
  if (!/try\s*\{[\s\S]{0,400}?xhub\.storage\.get/.test(coreSrc)) b8.push('storage.get 未包 try');
  if (!/try\s*\{[\s\S]{0,400}?xhub\.storage\.set/.test(coreSrc)) b8.push('storage.set 未包 try');
  if (!/SQ\.storageError\s*=/.test(coreSrc)) b8.push('缺 SQ.storageError 出口');
  if (!/SQ\.storageError\(\)/.test(viewSrc)) b8.push('view 未消费 storageError（失败无人话提示）');
  for (const f of htmlFiles) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /xhub\.[a-zA-Z]+\s*\.\s*[a-zA-Z]+\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
      /* 调用点前 240 字符内必须出现 try（同一函数体内的包裹） */
      if (!/try\s*\{/.test(src.slice(Math.max(0, m.index - 240), m.index))) {
        b8.push(relOf(f) + ' 桥调用未包 try: ' + m[0]);
      }
    }
  }
  ok('B8', '桥容错（单一桥模块 + 读写 try/catch + 失败出口被视图消费）', b8.length === 0, b8.join(';'));
})();

/* ── B9 交付镜像一致性（2026-10-09 版本控制纳管批立）─────────────────────────
 * 立因：镜像 `extensions/com.avalonlee.sanqian-world/` 与源侧的「七项 diff -rq 零差异」是本仓最强的一条不变量
 *   （工程规范 §八 记的两次单侧回退都靠这份镜像反向救回），但它**历来只靠人手敲命令 + 收口时口头承诺**——
 *   本轮存档治理批就出现过一次「改了 .tests/README 忘了同步镜像」，靠 git status 才照出来。
 *   不变量不进门闸 = 迟早漂，故收进审计。
 * 口径：四目录递归比内容（逐字节），三单件比内容；`.storage.json` 是宿主实时存档，
 *   **两侧都不参与比对**（与工程规范 §8.6 快照排除口径一致）；单侧多出来的文件同样算漂移。
 * 判据细节：只列前 8 条差异，其余计数汇总，避免镜像整棵树缺失时刷屏。 */
(function () {
  var EXT = 'com.avalonlee.sanqian-world';
  var DIRS = ['assets', 'view', 'module', '.tests'];
  var FILES = ['manifest.json', 'icon.svg', 'DESIGN.md'];
  var SKIP = { '.storage.json': 1 };
  /* 两侧都可辨才比：默认「源侧 = 当前根 / 镜像 = extensions/<EXT>」；
     若从镜像根起跑（../.. 是源码树根），反过来指 —— 同一条判据，两种起跑位置都成立。 */
  function isRoot(d) { return fs.existsSync(d + '/assets') && fs.existsSync(d + '/manifest.json'); }
  var SRC = '.', MIR = 'extensions/' + EXT;
  if (!fs.existsSync(MIR) && isRoot('../..')) { SRC = '../..'; MIR = '.'; }
  function walk(dir, base, acc) {
    var ents;
    try { ents = fs.readdirSync(dir); } catch (e) { return acc; }
    ents.forEach(function (f) {
      if (SKIP[f]) return;
      var p = dir + '/' + f, st;
      try { st = fs.statSync(p); } catch (e) { return; }
      if (st.isDirectory()) walk(p, base, acc);
      else acc[p.slice(base.length + 1)] = st.size;
    });
    return acc;
  }
  var diffs = [];
  function cmpTree(rel) {
    var A = SRC + '/' + rel, B = MIR + '/' + rel;
    var a = walk(A, A, {}), b = walk(B, B, {});
    var keys = {}, kk;
    for (kk in a) keys[kk] = 1;
    for (kk in b) keys[kk] = 1;
    Object.keys(keys).sort().forEach(function (k) {
      if (!(k in a)) { diffs.push('仅镜像有 ' + rel + '/' + k); return; }
      if (!(k in b)) { diffs.push('仅源侧有 ' + rel + '/' + k); return; }
      var ba = fs.readFileSync(A + '/' + k), bb = fs.readFileSync(B + '/' + k);
      if (ba.length !== bb.length) diffs.push('字节数不同 ' + k + '（' + ba.length + ' vs ' + bb.length + '）');
      else if (!ba.equals(bb)) diffs.push('内容不同 ' + rel + '/' + k);
    });
  }
  function cmpFile(rel) {
    var fa = SRC + '/' + rel, fb = MIR + '/' + rel;
    var ea = fs.existsSync(fa), eb = fs.existsSync(fb);
    if (!ea || !eb) { diffs.push(rel + ' ' + (ea ? '镜像缺件' : '源侧缺件')); return; }
    if (!fs.readFileSync(fa).equals(fs.readFileSync(fb))) diffs.push('内容不同 ' + rel);
  }
  try {
    if (!isRoot(SRC) || !isRoot(MIR)) {
      ok('B9', '交付镜像一致性（七项逐字节零差异）', false,
        '两侧不可辨：源侧 ' + SRC + ' / 镜像 ' + MIR + ' 有一侧缺 assets+manifest.json（audit 须从源码树根或镜像根起跑）');
      return;
    }
    DIRS.forEach(cmpTree);
    FILES.forEach(cmpFile);
    ok('B9', '交付镜像一致性（assets/view/module/.tests 四目录 + manifest/icon/DESIGN 三单件 = 七项逐字节零差异；.storage.json 实时存档按 §8.6 口径排除）',
      diffs.length === 0, diffs.slice(0, 8).join(' | ') + (diffs.length > 8 ? ' …共 ' + diffs.length + ' 处' : ''));
  } catch (e) {
    ok('B9', '交付镜像一致性（七项逐字节零差异）', false, '比对异常：' + (e && e.message));
  }
})();

/* ── 输出 ── */
let fails = 0;
for (const r of R) {
  if (!r.ok) fails++;
  console.log((r.ok ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
}
console.log(fails === 0 ? 'AUDIT_ALL_GREEN ' + R.length + '/' + R.length : 'AUDIT_FAILED ' + fails);
process.exit(fails === 0 ? 0 : 1);
