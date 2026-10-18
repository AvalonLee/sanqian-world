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
 *   B9 交付镜像一致性（七项逐字节零差异）〔**2026-10-14 GitHub 整理批退役**：根侧副本删除后没有第二份可比 ⇒ 由 D4 接管〕
 * D 组 · 账本与装载（2026-10-14 结构整治批B 立）：
 *   D2 加载顺序单源（view 为事实源 ⇔ 引用件存在 ⇔ module 的引擎段与 view 的 assets 段全等 ‖ 视图专属件必须在 view 下 ‖ smoke.html 与 view 的 assets 段全等 ‖ assets 无未挂载件）
 *   D3 世界专属别名封闭（通用层与视图直读 SQ.XDATA 必须挂册，例外失效同判；2026-10-14 批C 立）
 *   D7 视图外置件与内核桥 ctx() 的键集对账（第册五批 · N34 拆视图立：外置件用了 ctx 没给的键即判红）
 *   D8 日志分类表对账（LOG_CATS 项数 ⇔ 在册清单双向相等 ‖ 每项文案键在词表在册；第册二十批 · N66 立）
 *   D9 FACTS 登记表行结构对账（哨兵段之外每条 | 行恰三格且首尾有格线 ‖ 无被硬换行切断的续行；第册廿六批 · N74 立）
 *   D4 唯一事实源自洽（扩展根七项齐备 ‖ entry 件存在 ‖ 仓库根不复活第二份源；2026-10-14 整理批取代 B9 立）
 *   D1 账本漂移判据不在本件——落 `.tests/gen-ledger.cjs`（只判漂、--fix 才写），由 run-dod 直接调件；
 *   反证常驻件 = `.tests/ledger-selftest.cjs`。
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
  /* 事件族 v2（平铺池）：event.{id}.name/.story + 分支文案 = **模板自己声明的那几支**
   * （第卌四批改口：原先一律要求 right/evil/neutral 三件齐全，而「族中寻仇」按设计只给迎战一条路——
   *   照旧写法只能逼词表补两条永不消费的孤儿键，那是拿判据逼出假数据）；
   *   无 choices 的旧形仍按三件兜底，覆盖面不缩。 */
  for (const w of ['common', 'xiuxian']) {
    const list = Array.isArray(SQ.EVENTS[w]) ? SQ.EVENTS[w] : [];
    for (const ev of list) {
      if (lexAll['event.' + ev.id + '.name'] == null) missing.push('event.' + ev.id + '.name');
      if (lexAll['event.' + ev.id + '.story'] == null) missing.push('event.' + ev.id + '.story');
      const bks = Object.keys(ev.choices || {});
      (bks.length ? bks : ['right', 'evil', 'neutral']).forEach((bk) => {
        if (lexAll['event.' + ev.id + '.branch.' + bk] == null) missing.push('event.' + ev.id + '.branch.' + bk);
      });
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
    /* 第册四批：视图代码开始外置（`view/*.js` 与本页同目录）⇒ 同目录的 js 也算这页的脚本，
     * 否则「脚本引用的 id 必须静态存在」这条对账会随搬家出现盲区。 */
    const here = path.dirname(f);
    if (fs.existsSync(here)) fs.readdirSync(here).filter((x) => x.endsWith('.js'))
      .forEach((x) => code.push(fs.readFileSync(path.join(here, x), 'utf8')));
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
  /* ⚠️ 第册廿一批（C6）：这两枚路径原本写**裸相对路径**（`'assets/systems/treasures.js'`），
   * 于是本关跟着**进程 cwd** 走 —— 只有从扩展根跑才对，`cd .tests && node audit.cjs`
   * 或从仓库根跑都会误报「登记表读不到 = 纪律失守」。修法 = 一律走 ROOT（与本件其余读点同法）。 */
  var REG_REL = 'assets/systems/treasures.js';
  var REG_F = path.join(ROOT, REG_REL);
  var regSrc = fs.existsSync(REG_F) ? fs.readFileSync(REG_F, 'utf8') : '';
  var m = regSrc.match(/ST_KEYS:\s*\[([^\]]*)\]/);
  if (!m) {
    ok('A7', '法宝运行态 st 键集登记对表', false,
      '登记表读不到：' + REG_REL + ' 内没有 `ST_KEYS: [...]` 字面量（登记表本身消失 = 纪律失守，不是放行理由）');
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
  var LED_REL = 'assets/systems/ledger.js';
  var LED = path.join(ROOT, LED_REL);   /* 同 A7：不许跟进程 cwd 走（C6 · 第册廿一批）*/
  var lsrc = fs.existsSync(LED) ? fs.readFileSync(LED, 'utf8') : '';
  function catList(name) {
    var m = lsrc.match(new RegExp('var\\s+' + name + '\\s*=\\s*\\[([^\\]]*)\\]'));
    if (!m) return null;
    return (m[1].match(/'[^']*'/g) || []).map(function (x) { return x.slice(1, -1); });
  }
  var INC = catList('IN_CATS'), OUTC = catList('OUT_CATS');
  if (!INC || !OUTC) {
    ok('A8', '「静默失效」普查（账本分类 ⇔ 调用点 · ws 写点 ⇔ normalize 声明集）', false,
      '读不到 ' + LED_REL + ' 里的 IN_CATS/OUT_CATS 字面量 = 白名单本身消失，属纪律失守而非放行理由');
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
    if (relOf(f) === LED_REL) return;                   /* 白名单定义体自身不是调用点（比相对名 ⇒ 与 LED 改绝对路径无关）*/
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
 *   本批删掉那个常量（字面量即唯一取数口），并立本关让同型死桩不能再回来。
 *   在册清单现值 = 3 条（N22 ⑤ 剩下的 `EVENT_KARMA_BAND` / `FACTION_DESC_POOL` / `SHARD_REWARDS`）；
 *   N22 ④ 的 `KARMA_TIERS` 曾转入册、2026-10-11 第十三批因 `tierOf` 改读表而转正摘除 = 双向对表第一次兑现。
 * 口径：常量集 = 沙箱里 live 世界包 `pack.data` 的**顶层键**（不抄文档、不用正则扫表——装载剖面一变就假）；
 *   消费面 = `assets/**` + `view` + `module` 源码（注释剥离后、**排除声明文件 `assets/worlds/<id>/data.js`**），
 *   判据 = 键名作为**独立词元** `\bK\b` 出现过一次即算有人读（`.K` 属性 ‖ `['K']` 方括号 ‖ `{K} = D` 解构
 *   ‖ `'K'` 字符串拼键 ‖ `A(D).KEY` / `SP(D).KEY` 这类别名后置点号 全部命中）；**不含 `.tests/`**（测试读一眼
 *   就算"消费"的话，死桩永远清不干净——与 A8 同一边界口径）。**排除声明文件是必须的**：否则每个键都在
 *   自己那行 `KEY:` 里出现 = 全体自证消费 ⇒ 本关恒绿（与 A6 当年把词表分卷当代码扫同型）。
 * 判据（**双向相等**，任一命中即红）：零消费者键集 === 在册死桩清单。
 *   多一条未登记 ⇒ 红（本关要防的形状）；在册者已被消费或已删 ⇒ 也红（**在册清单自己不许腐烂**，
 *   否则关卡会慢慢变成"永远绿但对不上任何账"）。
 * 反空集护栏：顶层常量数 > 100 且扫描文件数 > 40，否则判红——沙箱或扫描面没装好时不许静默放行。
 * 已知边界（如实登记，不装作全覆盖）：① 只覆盖世界数据表**顶层**，嵌套 config（`D.LEGACY.*` /
 *   `D.RUMORS.TTL`）与数组型表体（`D.REALMS` 的行内字段）不在射程；② 不判"两侧都有消费者的同值对"——
 *   №61 的 375000 与 `REALMS[9] 真仙.power` 正是这种（后者是正典溯源，不是死桩；复核勘正旧注误标
 *   「渡劫期 / 元婴表」，实测 `[3] 元婴 = 540`、`[8] 渡劫 = 125000`、`[9] 真仙 = 375000），那属数值一致性判据；
 *   ③ **消费判据 = 剥注释后、声明文件（`assets/worlds/<id>/data.js`）之外，键名作为独立词元
 *      （`\bK\b`）出现过一次**。一支覆盖 `.K` 属性 / `['K']` 方括号 / `{K} = D` 解构 / `'K'` 字符串拼键
 *      全部写法。**声明文件必须排除**，否则每个键都在自己那行 `KEY:` 里出现 = 自证消费、本关恒绿
 *      （A6 曾把词表分卷当代码扫，犯过同一形状的错）。
 *      代价全在假阴方向，如实登记：与键名同名的裸局部变量、键名只出现在字符串里、表驱动映射写成
 *      `K: v` 的真取用，都算「有消费者」。为什么不拆多支：上一批把消费面拆成四支正则，其中解构那一支
 *      **在关卡里实测不生效**（隔离样本命中、拼好的 src 不命中），于是把真消费误报成死桩 = 假阳，
 *      而假阳比假阴危险——它教人把关卡关掉（2026-10-11 N26① 复核抓到，改成本判据）。
 *   ④ 仍不判的形（真盲区，别当成覆盖了）= `Object.keys(D)` 全表遍历、把整张 `D` 传给别名后动态取键
 *      ——那些形下所有键都「没人读」也「人人都在读」，本关只认键名。
 *   ⚠️ 判据句只承诺上面这些，不写「凡被消费 ⇒ 必不红」的无条件句（第十批「tag 永远等于 HEAD」
 *      那种被下一次合法改动弄假的复发形状）。 */
(function () {
  /* 在册死桩 = 本批取证时"零消费者"的实测集合。2026-10-11 第十三批：`KARMA_TIERS` 已接线
   * （`karma.js tierOf` 改读表 ⇒ 它不再是死桩，按本关的"在册清单也要对表"规则从册上摘除）；
   * `MERCHANT_POWER_ABS` 于上一批删除。剩 3 条属 N22 ⑤ 登记的预留量，处置需产品点头，故只登记不消费。*/
  var DEAD_LISTED = ['EVENT_KARMA_BAND', 'FACTION_DESC_POOL', 'SHARD_REWARDS'];
  var boot9 = null;
  try { boot9 = require('./sandbox.cjs').load([], { quiet: true }).sandbox.window.SQ; }
  catch (e) { ok('A9', '世界表顶层常量 ⇔ 消费面对表（死桩双向在册）', false, '沙箱装载失败：' + e.message); return; }
  var seen9 = {}, files9 = [];
  [].concat(jsFiles, htmlFiles).forEach(function (f) {
    var r = relOf(f);
    if (!(r.indexOf('assets/') === 0 || r.indexOf('view/') === 0 || r.indexOf('module/') === 0)) return;
    if (seen9[r]) return; seen9[r] = 1; files9.push(f);
  });
  /* 消费面 = 扫描面里除**声明文件本身**以外的全部源码（剥注释）。声明文件（`assets/worlds/<id>/data.js`）
   * 必须排除，否则每个键都在自己那行 `KEY:` 的声明里出现 = 自证消费、本关恒绿（A6 栽过的同类坑）。 */
  var DEF_RE = /^assets\/worlds\/[^/]+\/data\.js$/;
  var use9 = files9.filter(function (f) { return !DEF_RE.test(relOf(f)); })
    .map(function (f) { return stripComments(fs.readFileSync(f, 'utf8')); }).join('\n');
  var bad9 = [], dead9 = [], total9 = 0;
  Object.keys(boot9.Worlds).filter(function (id) { return boot9.Worlds[id].status === 'live'; })
    .forEach(function (id) {
      var d = (boot9.Worlds[id].pack || {}).data;
      if (!d) { bad9.push('世界包 ' + id + ' 取不到 pack.data（常量集为空 ⇒ 本关无从判起）'); return; }
      Object.keys(d).forEach(function (k) {
        total9++;
        /* 消费判据 = **键名作为独立词元在声明文件之外出现过一次**即算有人读。
         * 一支覆盖全部写法：`.K` 属性 ‖ `['K']`/`["K"]` 方括号 ‖ `{K} = D` 解构 ‖ `'K'` 字符串拼键 ‖ 裸同名变量。
         * 为什么不拆多支（N26① 的教训）：上一批拆了四支，其中「解构」那一支**在关卡里实测不生效**
         *   （隔离样本命中、拼好的 src 不命中），于是把真消费误报成死桩 = 假阳；
         *   假阳比假阴危险，因为它教人把关卡关掉。判据分支越多越容易漏一支，能一支判完就别拆。
         * 代价（假阴方向，如实登记）：与键名同名的裸局部变量、以及键名只出现在字符串里的，都算消费。 */
        if (!new RegExp('\\b' + k + '\\b').test(use9)) dead9.push(k);
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

/* ── A10 取数口 ⇔ 世界表键存在性（第 21 关 · 第十四批审计 #10 / #16 立）
 * 立因：本批把视图 13 处「表值兜底字面量」删干净之后，视图与引擎**完全依赖表里有那个键**；
 *   而「代码引用了表里不存在的键」此前没有任何关卡在管 —— A9 管的是反方向（表里声明了却没人读），
 *   本关管「读了却没有」。删兜底不配这一关 = 把「屏上说谎」换成「屏上 NaN」，两个都是静默形状。
 *   同一支判据还顺手抓住键名改名后的残留取数口（`MERCHANT_POWER_ABS` 那一类）。
 * 口径（刻意收窄，先测散布再定带）：
 *   · 别名只认明确指向世界表的 `D.` / `SQ.XDATA.` / `pack.data.`；视图里另认 `d.` 与 `D().`（view 的
 *     `d = D()`）。**不认** `A(D).` / `F(D).` / `FF.` 这类子表访问器 —— 实测把它们算进来会一次报出
 *     92 条假阳（`A(D).APILLS` 被当成顶层键），一支判据里塞不下「每个模块的访问器返回哪张子表」的映射。
 *   · assets 里也不认 `d.`：treasures.js:88 的 `d.MAX_LV` 是**局部法宝定义**，不是世界表（实测假阳）。
 *   · 键名门槛 `^[A-Z][A-Z0-9_]{2,}$`（世界表常量全大写），短名/驼峰一律不管 ⇒ 避开 `Math.PI`、`res.ok`。
 *   · ⚠️ **射程只到首段（当晚复核定性，别把它读成「删兜底已有覆盖」）**：`d.SECT.RECRUIT_CD_MS` 这类二级取数口
 *     只验 `SECT` 在不在表上，**子键拼错或被删依然绿**（屏上 NaN / 恒放行）；`D['KEY']`、模板串、可选链同形漏网。
 *     本批删的 13 处字面量里真被本关管到的是顶层直取的那三支（`BOND_TIERS` / `BOND_VISIT_CD_MS` /
 *     `FACTION_SUPPLY_CD_MS`），其余靠界面走查 + 冒烟 #295 直证。要扩就得先建「两级键图」⇒ 登记 N28②，不做。
 *   · 声明文件 `assets/worlds/<id>/data.js` 排除（与 A9 同口径，否则每个键在自己的声明行自证存在）。
 * 在册例外 = `SHOP_SLOTS`：坊市格数随机批退役了这个常量，但 `shop.slotCount()` 留着「旧数据形状」回落支，
 *   且冒烟 **#285(d)** 专门注入一张**只有 SHOP_SLOTS** 的表来验它 ⇒ 那不是死代码，是给合成旧表用的。
 * 判据（任一命中即红）：取用到的键名必须 ∈（live 世界包顶层键 ∪ 在册例外）。装载剖面不对（键集 < 100）
 *   直接判红，不许在空集上恒绿。 */
(function () {
  var MISSING_OK = ['SHOP_SLOTS'];
  var boot10 = null;
  try { boot10 = require('./sandbox.cjs').load([], { quiet: true }).sandbox.window.SQ; }
  catch (e) { ok('A10', '取数口 ⇔ 世界表键存在性（读了表里没有的键 = 引用悬空）', false, '沙箱装载失败：' + e.message); return; }
  var live10 = Object.keys(boot10.Worlds).filter(function (id) { return boot10.Worlds[id].status === 'live'; });
  var KEYS10 = {};
  live10.forEach(function (id) {
    var d = (boot10.Worlds[id].pack || {}).data;
    if (d) Object.keys(d).forEach(function (k) { KEYS10[k] = 1; });
  });
  if (Object.keys(KEYS10).length < 100) {
    ok('A10', '取数口 ⇔ 世界表键存在性（读了表里没有的键 = 引用悬空）', false,
      '键集只有 ' + Object.keys(KEYS10).length + ' 条 ⇒ 装载剖面不对（空集上的对表恒真，不作数）');
    return;
  }
  var seen10 = {}, miss10 = {}, refs10 = 0;
  [].concat(jsFiles, htmlFiles).forEach(function (f) {
    var r = relOf(f);
    if (!(r.indexOf('assets/') === 0 || r.indexOf('view/') === 0 || r.indexOf('module/') === 0)) return;
    if (/^assets\/worlds\/[^/]+\/data\.js$/.test(r)) return;
    if (seen10[r]) return; seen10[r] = 1;
    var alias = r.indexOf('view/') === 0 ? "(?:\\bD|\\bd|SQ\\.XDATA|pack\\.data|D\\(\\))" : "(?:\\bD|SQ\\.XDATA|pack\\.data)";
    var re = new RegExp(alias + '\\.([A-Z][A-Z0-9_]{2,})', 'g');
    var src = stripComments(fs.readFileSync(f, 'utf8')), m;
    while ((m = re.exec(src))) {
      refs10++;
      var k = m[1];
      if (KEYS10[k] || MISSING_OK.indexOf(k) >= 0) continue;
      miss10[k] = (miss10[k] || 0) + 1;
    }
  });
  var mk10 = Object.keys(miss10);
  ok('A10', '取数口 ⇔ 世界表键存在性（第十四批删兜底的配套关：读了表里没有的键 = 引用悬空 ⇒ 屏上 NaN/谎数）',
    mk10.length === 0,
    '表键 ' + Object.keys(KEYS10).length + ' ‖ 取数引用 ' + refs10 + ' 次 ‖ 悬空键 ' + mk10.length +
    '（' + (mk10.join(',') || '无') + '） ‖ 在册例外 ' + MISSING_OK.join(',') +
    (mk10.length ? ' ‖ ' + mk10.map(function (k) { return k + ' ×' + miss10[k]; }).join(' | ') : ' ‖ 零命中'));
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

  /* B4 主题铁律（module 卡为透明玻璃底，不要求 --xhub-surface）
   * ⚠️ 第册四批起 view 的样式外置成 `view/ui.css` ⇒ 本关读「HTML + 那份样式」合起来的旧字符串口径，
   *    载体搬了家、覆盖面不许缩水；样式文件本身缺失也判红（免得铁律被搬到没人查的地方）。 */
  const viewCssPath = path.join(ROOT, 'view/ui.css');
  const viewHasCss = fs.existsSync(viewCssPath);
  const viewSrc = fs.readFileSync(path.join(ROOT, 'view/index.html'), 'utf8') +
    (viewHasCss ? '\n' + fs.readFileSync(viewCssPath, 'utf8') : '');
  const modSrc = fs.readFileSync(path.join(ROOT, 'module/index.html'), 'utf8');
  const b4 = [];
  if (!viewHasCss) b4.push('view/ui.css 不在（样式若仍内联，本关口径要同批改）');
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
  /* 第二十一批当晚改判：module 卡的 `runtime.open` 已**删掉**（宿主预检判其未实现，warn 就来自这串字面量）。
   * 这条禁令是防它悄悄回来——回来 = 预检又多一条 warn，而卡片本来就不该是入口。 */
  if (/xhub\.runtime\s*\.\s*open\s*\(/.test(modSrc)) b8.push('module 卡不得调用 runtime.open（宿主未注册，删之消 warn）');
  ok('B8', '桥容错（单一桥模块 + 读写 try/catch + 失败出口被视图消费 + 未注册 API 走能力探测降级）', b8.length === 0, b8.join(';'));
})();

/* ── D4 唯一事实源自洽（2026-10-14 GitHub 整理批 · 取代 B9）
 * 立因：B9 守的是「源侧 ↔ extensions/com.avalonlee.sanqian-world 两份逐字节相同」，而两份副本本身就是一条事实
 *   抄本——122 个跟踪文件是为镜像而复制的。GitHub 整理批删掉根侧那份，只留扩展目录这一份事实源（宿主挂载路径
 *   与 .storage.json 实时存档原地不动），B9 因此失去对象。本关守住删完之后必须成立的四件事：
 *   ① 扩展根七项齐备（少任一 = 宿主加载不了）；② manifest 的 entry 路径件真实存在；
 *   ③ 仓库根不得再长出 assets/ view/ module/ manifest.json 的第二份副本（防重复源复活）；
 *   ④ 仓库根仍在原位持有 docs/VERSIONS.md 与 README.md（账本工具靠它定位，缺了必须判红而不是静默跳过）。
 * shortcut: 本关不再比对两份副本，因而失去 B9「单侧回退可用另一侧反向救回」的能力——兜底改由 git 远端与
 *   sanqian-ops tar 快照承担；若将来重新引入镜像目录，本关会红，届时再决定恢复 B9 还是删掉第二份。 */
(function () {
  const EXT_DIRS = ['assets', 'view', 'module', '.tests'];
  const EXT_FILES = ['manifest.json', 'icon.svg', 'DESIGN.md'];
  const bad = [];
  EXT_DIRS.forEach((d) => { if (!fs.existsSync(path.join(ROOT, d))) bad.push('扩展根缺目录 ' + d); });
  EXT_FILES.forEach((f) => { if (!fs.existsSync(path.join(ROOT, f))) bad.push('扩展根缺件 ' + f); });
  let entry = {};
  try { entry = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).entry || {}; }
  catch (e) { bad.push('manifest.json 解析失败'); }
  Object.keys(entry).forEach((k) => {
    const rel = String(entry[k] || '').split('/').join('/').replace(/^\.\//, '');
    if (rel && !fs.existsSync(path.join(ROOT, rel))) bad.push('entry.' + k + ' 指向不存在的件 ' + rel);
  });
  const REPO = require('./repo-root.cjs')();
  if (!REPO) bad.push('仓库根定位失败（找不到 docs/VERSIONS.md）⇒ 账本工具无所依');
  else {
    ['assets', 'view', 'module', 'manifest.json', '.tests'].forEach((f) => {   /* .tests 也算：2026-10-14 整理批就漏了一个根 .tests/repo-root.cjs（rm 之后才 git add 捞回来的）*/
      if (fs.existsSync(path.join(REPO, f))) bad.push('仓库根复活了第二份事实源 ' + f);
    });
    if (!fs.existsSync(path.join(REPO, 'README.md'))) bad.push('仓库根缺 README.md');
  }
  ok('D4', '唯一事实源自洽（扩展根七项齐备 · entry 件存在 · 仓库根无重复源 · docs 与 README 在位）',
    bad.length === 0, '事实源 ' + path.basename(ROOT) + ' ‖ ' + EXT_DIRS.length + ' 目录 + ' + EXT_FILES.length + ' 单件' +
    (bad.length ? ' ‖ ' + bad.slice(0, 8).join(' ‖ ') : ' ‖ 四判全合'));
})();

/* ── D5 内联脚本可解析（第卅七批立例 · 由一次真实漏网立证）──
 * 快速预检此前只验 `assets/**.js` 的语法与挂载关系，`view/index.html` 里那一大块内联脚本没人替它把语法：
 * 本批一处笔误（`)}))` 多写一个右括号）跑过了 `npm test` 全绿，直到起浏览器才炸成「一直卡在加载页」，
 * 代价 = 一次界面走查（分钟级）而不是一次预检（秒级）。
 * 本关用 vm 解析每个 HTML 的每段内联脚本，取块口与 A1 CJK 扫描**同一个**（`inlineScripts`，不会两关口径漂），
 * 报错行号回加 `baseLine` ⇒ 指回真文件行。 */
(function () {
  const bad = [];
  let n = 0;
  /* 第册四批：视图代码开始外置 ⇒ 本关射程 = 各 HTML 的内联块 **+ 同目录外置 js**（只查一半就是盲区） */
  const extJs = [...new Set(htmlFiles.flatMap((f) => (fs.existsSync(path.dirname(f))
    ? fs.readdirSync(path.dirname(f)).filter((x) => x.endsWith('.js')).map((x) => path.join(path.dirname(f), x))
    : [])))];
  extJs.forEach((f) => {
    n++;
    try { new vm.Script(fs.readFileSync(f, 'utf8'), { filename: relOf(f) }); }
    catch (e) { bad.push(relOf(f) + ':1 ' + e.message); }
  });
  htmlFiles.forEach((f) => {
    inlineScripts(f).forEach((b) => {
      n++;
      try { new vm.Script(b.code, { filename: relOf(f) }); }
      catch (e) {
        /* vm 的编译错误首形如 `view/index.html:3086`（**不带列号**，Node 版本差异会补 `:57`），
         * 且那个行号是**块内行** ⇒ 回加 `baseLine − 1` 才指回真文件行（本关的用处就在能直接跳过去） */
        const frames = String(e.stack || '').split('\n');
        const frame = frames.find((l) => l.indexOf(relOf(f)) >= 0) || '';
        const m = /:(\d+)(?::\d+)?\s*$/.exec(frame);
        bad.push(relOf(f) + ':' + (m ? b.baseLine + (+m[1]) - 1 : '?') + ' ' + e.message);
      }
    });
  });
  ok('D5', '内联脚本可解析（view/module 的 JS = 浏览器实际加载那一份 · 语法错不再只在真机炸）',
    bad.length === 0, 'HTML ' + htmlFiles.length + ' 件 · 脚本块 ' + n + ' 段（含外置视图件 ' + extJs.length + ' 件）' +
    (bad.length ? ' ‖ ' + bad.slice(0, 4).join(' ‖ ') : ' ‖ 全部可解析'));
})();

/* ── D6 挂点 id 全库唯一（第册批立例 · 由本批一次真实撞车立证）──
 * 本批给「盖棺之传」浮层顺手取前缀 `mrc-`，而 `mrc-title` 已被上面的「奇遇回看」浮层占用：
 * `getElementById` 只认文档里第一个 ⇒ 标题写进一个 display:none 的 h2，屏上看不见，
 * 而**只读文本值的走查断言照样绿**（它读到的正是那个暗处的元素）。最后是人眼截图抓到的。
 * 同 id 在 HTML 里本来就非法，且这里没有「模板内重复 id」的正当用法（列表行一律 class，不用 id），
 * 所以直接按文件判重，零例外。射程 = 所有 .html 原文（含内联脚本里的字符串），与 D5 同一文件集。 */
(function () {
  const bad = [];
  let n = 0;
  htmlFiles.forEach((f) => {
    const seen = Object.create(null);
    (fs.readFileSync(f, 'utf8').match(/\sid="[^"]+"/g) || []).forEach((m) => {
      const id = m.slice(5, -1);
      seen[id] = (seen[id] || 0) + 1;
      if (seen[id] === 2) { n++; bad.push(relOf(f) + ' #' + id); }
      if (seen[id] === 1) n++;
    });
  });
  ok('D6', '挂点 id 全库唯一（同 id ⇒ getElementById 只认文档第一个，写进暗处那一枚没人看得见）',
    bad.length === 0, '挂点 ' + n + ' 枚' + (bad.length ? ' ‖ 重复：' + bad.slice(0, 6).join(' ‖ ') : ' ‖ 零重复'));
})();

/* ── D7 视图外置件只用 ctx() 给过的键（第册五批 2026-10-17 · N34 第二刀立）──
 * 搬家把「闭包私有量」换成「显式参数 c」，好处是可静态对账；风险也在这条路上：
 * 桥少给一枚键 ⇒ 运行时是 undefined，而那一页只是渲染成空——本仓最贵的那族缺陷正是「引擎对、屏上错」。
 * 判据 = 从内核抓 `function ctx()` 返回的字面量键集，逐件扫 `view/*.js` 里的 `c.xxx`；
 * 用了没给的键判红，整枚桥被删（取不到键集）同样判红。反向取证 = 把 ctx 里一枚键改名 ⇒ 本关必红。 */
(function () {
  const dir = path.join(ROOT, 'view');
  const viewJs = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const m = html.match(/function ctx\(\)[\s\S]{0,400}?return \{([\s\S]{0,400}?)\};/);
  const keys = m ? (m[1].match(/(^|[,{\s])([A-Za-z0-9_$]+)\s*:/g) || [])
    .map((x) => x.replace(/[^A-Za-z0-9_$]/g, '')) : [];
  const bad = [];
  if (!m) bad.push('view/index.html 里找不到 ctx() 工厂（桥没了 ⇒ 外置件无从取数）');
  /* 第二判（第册八批立 · 本批真实漏网）：**桥里换了名字的闭包私名**不许裸读。
   * 名单不手抄，从同一枚 `ctx()` 现推：`键: 一枚裸标识符` 且两者不同名 ⇒ 那枚标识符就是闭包私名
   *（`s: state` / `date: gameDateStr` / `ask: askConfirm` … 全在这里，内核改名而桥没跟 ⇒ 本关自动换名单）。
   * `pack()` 这类带括号的取值按整项锚定排除；**首项必须按逗号切分来判**，用 `^` 配 `[{,]` 的写法会漏掉
   * 紧跟 `{` 的第一枚（本批反证第一次就栽在这上面：`state` 恰恰是首项）。
   * 成因：改跳脚本的私名清单按「顶格 var 声明」现取，而 `state` 藏在多变量声明行里，清单照不到 ⇒
   * 四条动作体整批带着裸 `state` 进了外置件，直到走查才报 ReferenceError。
   * 第一判只查 `c.X` 有没有源（方向朝外），查不到这个反向洞。 */
  const priv = [];
  if (m) m[1].split(',').forEach((e) => {
    const kv = e.match(/^\s*([A-Za-z0-9_$]+)\s*:\s*([A-Za-z0-9_$]+)\s*$/);
    if (kv && kv[1] !== kv[2] && priv.indexOf(kv[2]) < 0) priv.push(kv[2]);
  });
  let used = 0;
  viewJs.forEach((f) => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    (src.match(/\bc\.[A-Za-z0-9_$]+/g) || []).forEach((x) => {
      const k = x.slice(2);
      used++;
      if (keys.indexOf(k) < 0) bad.push('view/' + f + ' 用了 c.' + k + '，ctx 没给');
    });
    priv.forEach((nm) => {
      /* 对象键位（`{ state: … }`）不是「读」，别把它算成裸读 —— 本批 gear.js 的 toast 插值键就叫 state */
      const hits = src.match(new RegExp('(^|[^.\\w$])' + nm.replace(/[$]/g, '\\$') + '(?!\\s*[\\w$:])', 'g'));
      if (hits) bad.push('view/' + f + ' 裸读了闭包私名 ' + nm + '（' + hits.length + ' 处 ⇒ 只能走 ctx 给过的键）');
    });
  });
  ok('D7', '视图外置件只用 ctx() 给过的键 ‖ 不裸读桥里换名的私名（少给一枚 = undefined，裸读一枚 = ReferenceError）',
    bad.length === 0, 'ctx 键 ' + keys.length + ' 枚 · 外置件 ' + viewJs.length + ' 件 · 引用点 ' + used + ' 处 · 私名 ' + priv.length + ' 枚' +
    (bad.length ? ' ‖ ' + [...new Set(bad)].slice(0, 6).join(' ‖ ') : ' ‖ 全部有源、零裸读'));
})();

/* ── D2 加载顺序单源（2026-10-14 结构整治批B · 方案 §六 D2 四判）
 * 射程说明（批A 自发现的盲区，写在这里免得下次又按错口径造反证）：`view/index.html` 是装载顺序的
 * **唯一事实源**，所以「HTML 少挂一个标签」本身是有意卸载、不是漂移，本关绝不判 HTML 自比。判这四件
 * 真会静默失效的：① HTML 引用的件不存在（改名 / 漏提交 ⇒ 真机 404、沙箱装载缺件）；
 * ② `module/index.html` 的序列与 view 不同（卡片与主界面加载两套引擎顺序 = 双份事实源复活）；
 * ③ `.tests/smoke.html` 的 assets 序列必须与 view 的 assets 段**全等**（第册二批由「保序子集」收紧——
 *    子集对漏挂免疫，实测该页长期只挂 27/53 件而本关从不报警，无头页失去对照价值却零红）；
 * ④ `assets/**.js` 存在却没挂进 view（新写一个系统忘了挂上 ⇒ 引擎里有、屏上没有，零报错）。 */
(function () {
  const srcs = (rel) => {
    let t;
    try { t = fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return null; }
    return [...t.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)]
      .map((m) => m[1].replace(/^\.\.\//, '').replace(/^\.\//, ''));
  };
  const view = srcs('view/index.html');
  if (!view) { ok('D2', '加载顺序单源（view 为事实源 ⇔ 四判）', false, 'view/index.html 读不到'); return; }
  const bad = [];
  /* 引用件的存在性按「相对该 HTML 自身目录」解（第册四批起 view 下同目录有外置件），
   * 老口径一律从扩展根解 ⇒ `updatenote.js` 这类视图件会被误判成「引用不存在的件」。 */
  const base = path.dirname('view/index.html');
  view.forEach((f) => {
    const hit = fs.existsSync(path.join(ROOT, f)) || fs.existsSync(path.join(ROOT, base, f));
    if (!hit) bad.push('引用不存在的件 ' + f);
  });
  const mod = srcs('module/index.html');
  /* 第册四批改口（D2 的立身之本不变）：**引擎装载序列**仍要求两份逐字全等；
   * 而 `view/*.js` 这类**视图专属件**只属 view（module 卡没有那些浮层的 DOM，硬挂等于在卡片里造弹窗）。
   * ⇒ 判据从「两条序列全等」改成「view 里所有 assets/ 项组成的序列 === module 全序列」，
   *   并加一条「非 assets 的挂载件必须就躺在 view 目录下」，免得有人从别处拖脚本进来。 */
  if (!mod) bad.push('module/index.html 读不到');
  else {
    const eng = view.filter((x) => x.startsWith('assets/'));
    if (JSON.stringify(mod) !== JSON.stringify(eng)) {
      bad.push('module 引擎序列 ≠ view 的 assets 段（' + mod.length + ' vs ' + eng.length + '）');
    }
  }
  view.filter((x) => !x.startsWith('assets/')).forEach((x) => {
    if (!fs.existsSync(path.join(ROOT, 'view', x))) bad.push('视图专属件不在 view 目录下：' + x);
  });
  const smoke = srcs('.tests/smoke.html');
  if (smoke) {
    const only = smoke.filter((f) => f.startsWith('assets/'));
    const eng = view.filter((x) => x.startsWith('assets/'));
    /* ③ 改口（第册二批 · smoke.js 切片同批）：由「保序子集」收紧为「与 view 的 assets 段全等」。
     * 立据 = 本关上线后从没红过，而实测这页只挂了 27/53 件（缺 util / ledger / bonds / treasures /
     * legacy / codex / tiandao 与十枚词表分卷）⇒ 浏览器直开当场 TypeError、停在「运行中…」，
     * 「子集」判据对漏挂天然免疫 = 覆盖面早就缩了却零红。切片要动这份标签清单，同批把这条补严。 */
    if (JSON.stringify(only) !== JSON.stringify(eng)) {
      const miss = eng.filter((x) => only.indexOf(x) < 0), extra = only.filter((x) => eng.indexOf(x) < 0);
      bad.push('smoke.html 的 assets 序列 ≠ view（' + only.length + ' vs ' + eng.length + ' 项' +
        (miss.length ? ' ‖ 缺 ' + miss.slice(0, 4).join(', ') : '') + (extra.length ? ' ‖ 多 ' + extra.slice(0, 2).join(', ') : '') + '）');
    }
  }
  const js = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) js.push(relOf(p));
    }
  })(path.join(ROOT, 'assets'));
  js.forEach((f) => { if (view.indexOf(f) < 0) bad.push('assets 件未挂进 view/index.html：' + f); });
  ok('D2', '加载顺序单源（view 事实源 ⇔ 引用件存在 ⇔ module 引擎段全等 ⇔ 视图件落在 view ‖ smoke.html 的 assets 段与 view 全等 ⇔ assets 无未挂载件）',
    bad.length === 0, '序列 ' + view.length + ' 项 · assets ' + js.length + ' 件' + (bad.length ? ' ‖ ' + bad.slice(0, 6).join(' ‖ ') : ' ‖ 四判全合'));
})();

/* ── D3 世界专属全局别名封闭（2026-10-14 结构整治批C · 方案 §六 D3）
 * 立因：`assets/worlds/xiuxian/data.js` 把整张修仙表同时挂成全局 `SQ.XDATA`，通用层与视图直接吃它
 *   = 世界包契约（数据经 pack 注入）旁路。第二个世界装上后这些位置仍会读修仙的数，且零报错。
 * 口径：`assets/worlds/**` 内合法（世界包读自己的表）；其余各处的每一处都必须挂在**在册例外**上，
 *   例外同时记「命中数」——**例外失效（表里记了、实际零命中）同样算红**（A9/A10 的同型教训：
 *   白名单不复核就会腐烂）。视图与卡片内联脚本一并扫（批C 收口时视图 8 处已改回 pack 取数）。 */
(function () {
  /* 例外计数 = **出现次数**（一行两处算两处），不是行数 */
  const EXC = {
    'assets/core.js': 4,            /* BioCaps.keep/store 两行，每行各读两次 ⇒ 4 处；meta 层数值正典住在世界表内，随 N35 归位 */
    'assets/systems/legacy.js': 1,  /* legacyCap(k)：metaNormalize 无 D 形参（卷注 shortcut 已记） */
    'assets/systems/tiandao.js': 1  /* chronPush 上界：天道本属修仙专属，目录名实不符同属 N35 */
  };
  const seen = {}, bad = [];
  const count = (code) => (code.match(/SQ\.XDATA/g) || []).length;
  const note = (rel, n) => { if (!n) return; (seen[rel] = seen[rel] || 0, seen[rel] += n); };
  jsFiles.forEach((f) => {
    const rel = relOf(f);
    if (rel.startsWith('assets/worlds/')) return;
    let code;
    try { code = stripComments(fs.readFileSync(f, 'utf8')); } catch (e) { return; }
    note(rel, count(code));
  });
  htmlFiles.forEach((f) => {
    const rel = relOf(f);
    if (!/^(view|module)\/index\.html$/.test(rel)) return;
    inlineScripts(f).forEach((b) => note(rel, count(stripComments(b.code))));
  });
  Object.keys(seen).forEach((rel) => {
    if (EXC[rel] == null) bad.push(rel + ' 直读 SQ.XDATA ×' + seen[rel]);
    else if (EXC[rel] !== seen[rel]) bad.push(rel + ' 例外登记 ' + EXC[rel] + ' 处、实际 ' + seen[rel] + ' 处');
  });
  Object.keys(EXC).forEach((rel) => { if (!seen[rel]) bad.push(rel + ' 例外失效（表里记 ' + EXC[rel] + ' 处、实际零命中 ⇒ 删表项）'); });
  const total = Object.keys(seen).reduce((n, k) => n + seen[k], 0);
  ok('D3', '世界专属全局别名封闭（通用层与视图的 SQ.XDATA 直读必须挂册 · 例外失效同判）',
    bad.length === 0, '通用层+视图命中 ' + total + ' 处 ‖ 在册例外 ' + Object.keys(EXC).length + ' 件 ' +
    (bad.length ? '‖ ' + bad.slice(0, 8).join(' ‖ ') : '‖ 逐件数合'));
})();

/* ── D8 日志分类表对账（第册二十批 2026-10-18 · N66 立）─────────────────────
 * 立因：`LOG_CATS` 从 8 项长到 11 项（第册? N17 那批补了 历练/洞府/坊市 三类），但**没有任何一处钉住
 *   「表里几项」与「每项的文案键在不在」**：UI 卷那句「八分类」停在 v2.20 的历史注、FACTS 表另有一条
 *   滞后的人写读数行 ⇒ 三处各说一套。本关把这一量收成「表自己 + 在册钉值」，取数口 = `view/journal.js`。
 * 判一：**项数与 id 集与在册清单双向相等** —— 多一项红（未登记的分类）、少一项红（分类被摘而关卡没跟）、
 *   取不到数组也红（改名/搬走 ⇒ 本关失明，不许静默通过）。同 A9 在册死桩、D3 在册例外的「清单自己不许腐烂」。
 * 判二：**每项的文案键都在词表在册**（`key:` 筛选标签 与 `sys:` 系统名 两族一起查，缺键直接判红）。
 *   成因 = `SQ.t` 缺 key 时**把 key 原样返回**（`assets/lexicon.js` 的既有行为）⇒ 「分类有、文案无」的形状
 *   是屏上出现 `log.cat.xxx` 这种裸英文，属玩家可见故障，而静态扫描按「键被拼出来」照样照不到。
 * 射程边界（如实登记，不装作全覆盖）：本关**不判「每项有没有写点」**——动态 cat 传参（`log(cat, txt)` 里 cat
 *   是变量）静态认不出，硬判会假阳（假阳教人关关卡，A9 前例）。那一维属判据射程扩展，另批先证假阳面再动。
 * 反向取证 = 往表里加一项 `{ id: 'zzz', sys: 'zzz.tag' }` ⇒ 应红「多出未登记分类」+「文案键不在册」两处。 */
(function () {
  const CAT_IDS = ['all', 'event', 'combat', 'trib', 'karma', 'gear', 'arts', 'bond', 'cave', 'shop', 'sys'];
  let src = '';
  try { src = fs.readFileSync(path.join(ROOT, 'view/journal.js'), 'utf8'); } catch (e) { /* 取不到走下面判红 */ }
  const m = src.match(/var LOG_CATS = \[([\s\S]*?)\n\s*\];/);
  const items = m ? (m[1].match(/\{[^{}]*\}/g) || []) : [];
  const bad = [];
  if (!m) bad.push('view/journal.js 里取不到 LOG_CATS 数组（改名或搬走 ⇒ 本关失明）');
  else {
    const ids = items.map((x) => ((x.match(/id:\s*'([^']+)'/) || [])[1] || '?'));
    CAT_IDS.forEach((id) => { if (ids.indexOf(id) < 0) bad.push('在册分类 ' + id + ' 不在表里（表被删项而关卡没跟）'); });
    ids.forEach((id) => { if (CAT_IDS.indexOf(id) < 0) bad.push('表里多出未登记分类 ' + id); });
    if (ids.length !== CAT_IDS.length) bad.push('项数 ' + ids.length + ' ≠ 在册 ' + CAT_IDS.length);
  }
  let boot = null;
  try { boot = require('./sandbox.cjs').load([], { quiet: true }).sandbox.window.SQ; } catch (e) { /* 下面判红 */ }
  if (!boot || !boot.LEX) bad.push('沙箱装载失败（词表对账没跑成 ⇒ 不当通过）');
  else if (m) {
    const have = {};
    Object.keys(boot.LEX).forEach((w) => { Object.keys(boot.LEX[w] || {}).forEach((k) => { have[k] = 1; }); });
    items.forEach((x) => {
      const id = (x.match(/id:\s*'([^']+)'/) || [])[1] || '?';
      const k = (x.match(/(?:key|sys):\s*'([^']+)'/) || [])[1];
      if (!k) bad.push('分类 ' + id + ' 既无 key 也无 sys（屏上会是空标签）');
      else if (!have[k]) bad.push('分类 ' + id + ' 的文案键 ' + k + ' 不在词表（缺 key 会把键名原样上屏）');
    });
  }
  ok('D8', '日志分类表对账（LOG_CATS 项数 ⇔ 在册清单双向相等 ‖ 每项文案键都在词表在册；「每项有无写点」不在射程，见上注）',
    bad.length === 0, '在册 ' + CAT_IDS.length + ' 项' + (bad.length ? ' ‖ ' + bad.slice(0, 5).join(' ‖ ') : ' ‖ id 集双向相等、键全在册'));
})();

/* ── D9 FACTS 登记表行结构对账（第册廿六批 2026-10-18 · N74 立）────────────────
 * 立因：E3 逐行处置时照出这张表**列数参差**（表头三格而正文 1~4 格混排），且「存储分工」一条逻辑行
 *   被硬换行切成两个物理行 ⇒ 渲染时续行掉出表外、多出来的格被吞，**读数会静默少一列**。这与 D6（挂点
 *   id 全库唯一）、D8（分类表 ⇔ 在册清单）同族：都是"只有人眼看得见、机器一直没管"的账本结构面。
 * 判一：**哨兵段之外**每条以 `|` 起头的行必须**恰三格且首尾都有 `|`**（表头行与 `|---|` 分隔行豁免，
 *   转义竖线 `\|` 算格内文本）。
 * 判二：**不许有"非表格行里含未转义竖线"** —— 那就是被切断的续行（本仓 2026-10-18 实测的这一条正是它）。
 * 判三：登记表行数须 ≥ 10，整张表被搬走 = 本关失明，判红而不是静默通过（同 D8 取不到数组也红）。
 * 射程边界：只判**行形状**，不判格内容对错（内容 = E3 的逐行裁定 + `gen-ledger` 判漂）。
 * 反向取证 = 删掉某行末格线 ⇒ 判一红；表后插一条两空格起头的 `  **实测读数**：a | b |` ⇒ 判二红。 */
(function () {
  const REPO = require('./repo-root.cjs')();
  const bad = [];
  let lines = null;
  try { lines = fs.readFileSync(path.join(REPO, 'docs/FACTS.md'), 'utf8').split('\n'); } catch (e) { bad.push('读不到 docs/FACTS.md ⇒ 本关失明'); }
  let rowN = 0;
  if (lines) {
    const gs = lines.findIndex((x) => x.indexOf('SQ:LEDGER:BEGIN') >= 0);
    const ge = lines.findIndex((x) => x.indexOf('SQ:LEDGER:END') >= 0);
    const pipesOf = (L) => { let n = 0; for (let i = 0; i < L.length; i++) if (L[i] === '|' && L[i - 1] !== '\\') n++; return n; };
    const cellsOf = (L) => pipesOf(L) - 1;
    const isSep = (x) => /^\|\s*-{2,}/.test(x);
    lines.forEach((L, i) => {
      const no = i + 1;
      if (i > gs && i < ge) return;
      if (/^\|/.test(L)) {
        if (isSep(L) || isSep(lines[i + 1] || '')) return;
        rowN++;
        const c = cellsOf(L);
        if (c !== 3 || L[L.length - 1] !== '|') bad.push('L' + no + ' 格=' + c + (L[L.length - 1] !== '|' ? '（行尾无格线）' : ''));
      } else if (pipesOf(L) >= 1 && !/^>/.test(L) && !/^#{1,3} /.test(L) && !/^---$/.test(L) && !/^```/.test(L)) {
        bad.push('L' + no + ' 疑似被切断的续行: ' + L.slice(0, 28));
      }
    });
    if (rowN < 10) bad.push('登记表只数到 ' + rowN + ' 行（<10 ⇒ 表被搬走或改名，本关失明）');
  }
  ok('D9', 'FACTS 登记表行结构对账（哨兵段之外每条 | 行恰三格且首尾有格线 ‖ 无被硬换行切断的续行 ‖ 表没整段消失；只判形状不判内容）',
    bad.length === 0, '登记表 ' + rowN + ' 行' + (bad.length ? ' ‖ ' + bad.slice(0, 6).join(' ‖ ') : ' ‖ 逐行三格、无续行'));
})();

/* ── 输出 ── */
let fails = 0;
for (const r of R) {
  if (!r.ok) fails++;
  console.log((r.ok ? 'PASS' : 'FAIL') + ' [' + r.id + '] ' + r.name + (r.detail ? ' (' + r.detail + ')' : ''));
}
console.log(fails === 0 ? 'AUDIT_ALL_GREEN ' + R.length + '/' + R.length : 'AUDIT_FAILED ' + fails);
process.exit(fails === 0 ? 0 : 1);
