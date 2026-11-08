/* =====================================================================
 * 山河棋盘 · 三维水墨演示（board3d.js）
 * ---------------------------------------------------------------------
 * 依赖：three.min.js（r159 UMD，vendored）+ demo-data.js（window.QX_DEMO）
 * 形态：classic script，file:// 双击即开；无构建、无模块、无外链。
 * 数据：30 地界坐标与文案提取自现行 game.html REGIONS 表（演示占位）。
 * ===================================================================== */
(function () {
  'use strict';

  /* ===== 0. 数据与调色板 ===== */
  const D = window.QX_DEMO;
  if (!D || !D.regions) { console.error('QX_DEMO 缺失'); return; }

  const PAL = {
    paper: 0xf0e7d3,        // 地形纸面
    paperDeep: 0xe6d9bc,    // 台基
    fog: 0xefe5cf,          // 雾 / 天幕
    inkDeep: 0x262019,      // 焦墨
    inkMid: 0x5a4d3d,       // 浓墨
    inkRoad: 0x4a4036,      // 道路墨
    cinnabar: 0xb9362c,     // 朱砂
    jade: 0x2b6b5e,         // 黛青
    indigo: 0x3f6478,       // 河水黛蓝
    gold: 0xb37e24,         // 金
  };
  const ZONE_NAMES = {
    zhongyuan: '中原', jingxiang: '荆襄', jiangnan: '江南', bashu: '巴蜀',
    dianqian: '滇黔', yanzhao: '燕赵', xiyu: '西域', haiwai: '海外',
  };
  const FONT = '"KaiTi","STKaiti","SimSun",serif';

  const byId = {};
  D.regions.forEach(r => { byId[r.id] = r; });

  /* ===== 1. 渲染器 / 场景 / 相机 ===== */
  const stage = document.getElementById('stage');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    document.getElementById('webgl-fail').style.display = 'flex';
    return;
  }
  THREE.ColorManagement.enabled = false;           // 全场景所见即所得十六进制
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(PAL.fog, 1);
  stage.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PAL.fog, 750, 2250);

  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 2, 6000);

  /* ===== 2. 数学工具：值噪声 / fBm / 缓动 ===== */
  function hash2i(ix, iy) {
    let n = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  function vnoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash2i(ix, iy), b = hash2i(ix + 1, iy);
    const c = hash2i(ix, iy + 1), d = hash2i(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function fbm(x, y, oct) {
    let sum = 0, amp = 1, freq = 1, norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += vnoise(x * freq, y * freq) * amp;
      norm += amp; amp *= 0.5; freq *= 2;
    }
    return sum / norm;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function smoothstep(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }
  const smootherstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

  /* ===== 3. 地形高度场（地图坐标 0..1000 × 0..600）===== */
  // 峰群：名山主峰挂真实地界位（峰心错开节点免成环坑）+ 真实山系走廊成链（演示占位）
  const PEAKS = [];
  const REGION_PEAKS = {
    huashan: [55, 78, -14, 6], shaolin: [70, 70, 16, -14], wudang: [45, 48, 0, -16],
    emei: [55, 66, -14, 8], qingcheng: [40, 40, -10, 10], dali: [50, 58, -16, 6],
    wuliang: [45, 52, -10, -12], lingjiu: [60, 66, 10, -10], guangming: [65, 70, 0, -20],
    xueshan: [60, 68, -14, -8], changbai: [75, 74, 10, -14], wutaishan: [45, 50, 12, 8],
    heimuya: [32, 32, -8, -10], zhongnan: [40, 36, 0, 14], changan: [30, 20, 10, 12],
    tangmen: [35, 28, 0, -14],
  };
  Object.keys(REGION_PEAKS).forEach(id => {
    const r = byId[id];
    if (!r) return;
    const p = REGION_PEAKS[id];
    PEAKS.push([r.x + p[2], r.y + p[3], p[0], p[1]]);
  });
  // 真实山系走廊（投影 px 折线，沿线撒峰）：昆仑 / 喜马拉雅 / 天山 / 祁连 / 阴山 / 太行 /
  // 秦岭 / 巫山武陵 / 南岭 / 横断 / 长白余脉 / 江南丘陵 / 武夷 / 阿尔泰
  const RANGES = [
    { pts: [[40, 296], [160, 300], [280, 304]], s: [46, 54], a: [32, 44] },
    { pts: [[40, 428], [200, 436], [320, 440]], s: [48, 56], a: [34, 46] },
    { pts: [[40, 148], [160, 142], [240, 148]], s: [46, 54], a: [34, 46] },
    { pts: [[280, 232], [380, 236], [440, 244]], s: [40, 48], a: [28, 38] },
    { pts: [[520, 176], [600, 180], [640, 188]], s: [38, 46], a: [26, 34] },
    { pts: [[656, 238], [662, 268], [654, 296]], s: [36, 44], a: [28, 38] },
    { pts: [[480, 344], [540, 348], [580, 346]], s: [40, 48], a: [28, 38] },
    { pts: [[550, 390], [570, 414], [576, 436]], s: [36, 44], a: [26, 34] },
    { pts: [[516, 506], [580, 512], [640, 510]], s: [40, 48], a: [26, 34] },
    { pts: [[354, 366], [374, 406], [392, 446], [408, 484]], s: [34, 42], a: [28, 40] },
    { pts: [[840, 96], [886, 124], [934, 142]], s: [42, 50], a: [30, 40] },
    { pts: [[710, 396], [736, 404]], s: [30, 38], a: [16, 24] },
    { pts: [[696, 450], [710, 474]], s: [30, 38], a: [16, 24] },
    { pts: [[80, 50], [160, 60]], s: [36, 44], a: [24, 32] },
  ];
  RANGES.forEach((rg, ri) => {
    for (let i = 0; i < rg.pts.length - 1; i++) {
      const a = rg.pts[i], b = rg.pts[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(len / 52));
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const h1 = hash2i(ri * 97 + i * 13 + k, ri * 31 + k * 7);
        const h2 = hash2i(ri * 53 + k * 17, ri * 71 + i);
        PEAKS.push([
          lerp(a[0], b[0], t) + (h1 - 0.5) * 26,
          lerp(a[1], b[1], t) + (h2 - 0.5) * 26,
          lerp(rg.s[0], rg.s[1], h1),
          lerp(rg.a[0], rg.a[1], h2),
        ]);
      }
    }
  });
  // 子峰衍生：主峰带 1 座卫星小峰，山势更嶙峋（确定性偏移）
  {
    const subs = [];
    PEAKS.forEach((p, i) => {
      const h1 = hash2i(i * 7 + 1, i * 13 + 5), h2 = hash2i(i * 17 + 3, i * 11 + 9);
      subs.push([
        p[0] + (h1 - 0.5) * p[2] * 1.7,
        p[1] + (h2 - 0.5) * p[2] * 1.7,
        p[2] * 0.44,
        p[3] * (0.30 + h1 * 0.22),
      ]);
    });
    PEAKS.push(...subs);
  }
  // 湖泊（真实落位）：洞庭 / 鄱阳 / 太湖 / 青海湖 + 星宿海泽畔诸池（挂星宿海节点）；水面自适应
  const LAKES = [
    { name: '洞庭湖', x: 606, y: 414, r: 30 },
    { name: '鄱阳湖', x: 686, y: 418, r: 28 },
    { name: '太湖', x: 756, y: 388, r: 20 },
    { name: '青海湖', x: 364, y: 262, r: 26 },
    { name: '星宿海', r: 11, at: 'xingxiu', ox: 8, oy: 14 },
    { name: '', r: 8, at: 'xingxiu', ox: -14, oy: 10 },
    { name: '', r: 7, at: 'xingxiu', ox: 14, oy: -6 },
  ];
  LAKES.forEach(L => {
    if (L.at && byId[L.at]) { L.x = byId[L.at].x + L.ox; L.y = byId[L.at].y + L.oy; }
  });
  const LAKES_OFF = { v: false }; // 求湖面基准时临时关闭湖洼
  // 海岸：真实东海岸折线（辽东口-山东半岛-长江口-杭州湾-闽粤）封闭成海 polygon；
  // 北上还有北隅冰海一角（极北冰火岛所在，古地图留海隅惯例）；海外三岛孤屿 punch（演示占位）
  const COAST = [
    [1035, 40], [990, 130], [950, 150], [900, 170], [790, 218], [786, 224], [812, 256],
    [770, 280], [784, 310], [798, 370], [780, 400], [760, 436], [730, 480],
    [690, 530], [630, 570], [560, 600], [1010, 600], [1010, 40],
  ];
  const ISLAND_IDS = ['taohua', 'xiakedao', 'binghuodao'];
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function seaMask(mx, my) {
    let best = 1e9;
    for (let i = 0; i < COAST.length - 1; i++) {
      const p = COAST[i], q = COAST[i + 1];
      const vx = q[0] - p[0], vy = q[1] - p[1];
      const wx = mx - p[0], wy = my - p[1];
      const len2 = vx * vx + vy * vy || 1;
      const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
      const d = Math.hypot(mx - (p[0] + vx * t), my - (p[1] + vy * t));
      if (d < best) best = d;
    }
    const side = pointInPoly(mx, my, COAST) ? 1 : -1;
    const coast = (fbm(mx * 0.008 + 3.7, my * 0.008 + 9.2, 3) - 0.5) * 70;
    let sea = smoothstep(-10, 45, side * best + coast);
    // 北隅冰海（边界带噪声，免成直线）
    const iceX = mx + (fbm(my * 0.02 + 5.1, 3.3, 2) - 0.5) * 100;
    const iceY = my + (fbm(mx * 0.02 + 9.7, 8.8, 2) - 0.5) * 22;
    const ice = smoothstep(36, 16, iceY) * smoothstep(640, 700, iceX);
    if (ice > sea) sea = ice;
    for (let i = 0; i < ISLAND_IDS.length; i++) {
      const r = byId[ISLAND_IDS[i]];
      if (!r) continue;
      const d = Math.hypot(mx - r.x, my - r.y);
      if (d < 34) { sea *= smoothstep(11, 30, d); break; }
    }
    return sea;
  }

  // 河道：贝塞尔折线加低频蜿蜒（与 2D 板同源的装饰性河道）
  function meander(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const steps = Math.max(2, Math.round(segLen / 9));
      const dx = (b[0] - a[0]) / segLen, dy = (b[1] - a[1]) / segLen;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const mx = a[0] + (b[0] - a[0]) * t, my = a[1] + (b[1] - a[1]) * t;
        // 近城收敛，免河道穿城
        let dn = 1e9;
        for (let k = 0; k < D.regions.length; k++) {
          const d = Math.hypot(mx - D.regions[k].x, my - D.regions[k].y);
          if (d < dn) dn = d;
        }
        const damp = clamp(dn / 90, 0.3, 1);
        const n = ((vnoise(mx * 0.0045 + 31.7, my * 0.0045 + 7.3) - 0.5) * 40
                 + (vnoise(mx * 0.014 + 3.1, my * 0.014 + 19.4) - 0.5) * 14) * damp;
        out.push([mx - dy * n, my + dx * n]);
      }
    }
    const last = pts[pts.length - 1];
    out.push([last[0], last[1]]);
    return out;
  }
  const RIVERS = D.rivers.map(meander);
  const riverSegs = [];
  RIVERS.forEach(pts => {
    for (let i = 0; i < pts.length - 1; i++) riverSegs.push([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]]);
  });
  function distSeg2(px, py, s) {
    const vx = s[2] - s[0], vy = s[3] - s[1];
    const wx = px - s[0], wy = py - s[1];
    const len2 = vx * vx + vy * vy;
    let t = len2 > 0 ? (wx * vx + wy * vy) / len2 : 0;
    t = clamp(t, 0, 1);
    const dx = px - (s[0] + vx * t), dy = py - (s[1] + vy * t);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function terrainH(mx, my) {
    const base = fbm(mx * 0.0062, my * 0.0062, 4);                                   // 基础丘陵
    const ridge = 1 - Math.abs(2 * fbm(mx * 0.0042 + 7.3, my * 0.0042 + 3.1, 4) - 1); // 山脊
    let mtn = 0;
    for (let i = 0; i < PEAKS.length; i++) {
      const p = PEAKS[i];
      const dx = mx - p[0], dy = my - p[1];
      const g = Math.exp(-(dx * dx + dy * dy) / (2 * p[2] * p[2])) * p[3];
      if (g > mtn) mtn = g;
    }
    const edge = Math.min(mx, my, 1000 - mx, 600 - my);
    const belt = smoothstep(150, 0, edge) * 15;                                       // 缘山余势
    let h = 2.4 + base * 10.5 + (mtn * 1.18 + belt) * (0.40 + 0.60 * Math.pow(ridge, 1.35));
    // 沟壑下切：山体愈高，冲沟愈深（嶙峋感）
    const gully = fbm(mx * 0.028 + 17.2, my * 0.028 + 31.7, 3) - 0.5;
    h -= Math.min(mtn, 30) * 0.30 * (gully + 0.25);
    // 地界台地压平（先于海：海只削不填，岸边不成环坑）
    let dn = 1e9;
    for (let i = 0; i < D.regions.length; i++) {
      const r = D.regions[i];
      const d = Math.hypot(mx - r.x, my - r.y);
      if (d < dn) dn = d;
    }
    if (dn < 92) h = lerp(3.2 + base * 1.8, h, smootherstep(14, 92, dn));
    // 东海岸海墨（海外三岛孤屿，演示占位）
    const sea = seaMask(mx, my);
    if (sea > 0) h = lerp(h, 0.5 + base * 0.8, sea * 0.92);
    // 湖泊洼地（水面自适应；近地界处护持成湖心孤屿——燕子坞 / 星宿海）
    if (!LAKES_OFF.v) {
      for (let i = 0; i < LAKES.length; i++) {
        const L = LAKES[i];
        const d = Math.hypot(mx - L.x, my - L.y);
        if (d < L.r + 14) {
          let m = smoothstep(L.r + 14, L.r * 0.3, d) * 0.96;
          if (dn < 26) m *= smootherstep(9, 26, dn);
          h = Math.max(lerp(h, L.level - 1.8, m), 0.3);
          if (dn < 22) h = Math.max(h, lerp(L.level + 1.4, h, smootherstep(9, 22, dn)));
        }
      }
    }
    // 河道下切（软岸）
    let carve = 0;
    for (let i = 0; i < riverSegs.length; i++) {
      const d = distSeg2(mx, my, riverSegs[i]);
      if (d < 18) { const t = 1 - d / 18; const c = t * t * 6.5; if (c > carve) carve = c; }
    }
    h = Math.max(h - carve, 0.4);
    return h;
  }
  // 地图坐标 → 世界坐标（y 小 = 北 = 远端，与 2D 棋盘同向）
  const worldOf = (x, y) => new THREE.Vector3(x - 500, terrainH(x, y), y - 300);

  // 湖面基准自适应：取湖心环带纯地形均值略降，保证岸在水面之上
  LAKES_OFF.v = true;
  LAKES.forEach(L => {
    let sum = 0, n = 0;
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(k => {
      sum += terrainH(L.x + k[0] * L.r * 0.9, L.y + k[1] * L.r * 0.9); n++;
    });
    L.level = sum / n - 0.35;
  });
  LAKES_OFF.v = false;

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function slopeAt(mx, my) {
    const d = 5;
    const hx = terrainH(mx + d, my) - terrainH(mx - d, my);
    const hy = terrainH(mx, my + d) - terrainH(mx, my - d);
    return Math.hypot(hx, hy) / (2 * d);
  }
  function distToRiver(mx, my) {
    let m = 1e9;
    for (let i = 0; i < riverSegs.length; i++) {
      const d = distSeg2(mx, my, riverSegs[i]);
      if (d < m) m = d;
    }
    return m;
  }

  /* ===== 4. canvas 纹理工厂 ===== */
  function roundRectPath(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // 印章（方形朱砂印 + 白文单字）
  function sealTexture(ch, color) {
    const S = 128;
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d');
    g.fillStyle = color || '#b9362c';
    roundRectPath(g, 10, 10, S - 20, S - 20, 15); g.fill();
    g.strokeStyle = 'rgba(246,239,224,0.72)'; g.lineWidth = 5;
    roundRectPath(g, 23, 23, S - 46, S - 46, 8); g.stroke();
    g.fillStyle = '#f6efe0';
    g.font = '700 74px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, S / 2, S / 2 + 6);
    const tx = new THREE.CanvasTexture(cv);
    tx.anisotropy = 4;
    return tx;
  }
  // 竖排地名（裱纸晕边保读性）
  function vlabel(text, opts) {
    opts = opts || {};
    const size = opts.size || 36, gap = 9, pad = 16;
    const w = size + pad * 2;
    const h = text.length * (size + gap) - gap + pad * 2;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.font = '700 ' + size + 'px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < text.length; i++) {
      const y = pad + size / 2 + i * (size + gap);
      if (opts.halo !== false) {
        g.strokeStyle = 'rgba(240,231,211,0.9)'; g.lineWidth = 9; g.lineJoin = 'round';
        g.strokeText(text[i], w / 2, y);
      }
      g.fillStyle = opts.color || '#241f18';
      g.fillText(text[i], w / 2, y);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return { tex, aspect: w / h };
  }
  function makeLabelSprite(text, worldCharH, color) {
    const size = 36;
    const { tex, aspect } = vlabel(text, { size, color });
    const h = text.length * worldCharH + 6;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(h * aspect, h, 1);
    sp.renderOrder = 12;
    return sp;
  }
  // 火苗（危机）
  function flameTexture() {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 128;
    const g = cv.getContext('2d');
    g.translate(48, 66);
    function flamePath(s) {
      g.beginPath();
      g.moveTo(0, -50 * s);
      g.bezierCurveTo(31 * s, -19 * s, 35 * s, 15 * s, 0, 42 * s);
      g.bezierCurveTo(-35 * s, 15 * s, -31 * s, -19 * s, 0, -50 * s);
      g.closePath();
    }
    let grad = g.createRadialGradient(0, 10, 4, 0, -4, 52);
    grad.addColorStop(0, 'rgba(233,161,60,0.95)');
    grad.addColorStop(0.5, 'rgba(200,64,46,0.88)');
    grad.addColorStop(1, 'rgba(158,40,30,0)');
    g.fillStyle = grad;
    flamePath(1); g.fill();
    grad = g.createRadialGradient(0, 12, 2, 0, 4, 24);
    grad.addColorStop(0, 'rgba(246,220,150,0.95)');
    grad.addColorStop(1, 'rgba(233,161,60,0)');
    g.fillStyle = grad;
    flamePath(0.52); g.fill();
    return new THREE.CanvasTexture(cv);
  }
  // 事件菱标（金）
  function diamondTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.translate(32, 32); g.rotate(Math.PI / 4);
    g.fillStyle = '#b37e24';
    roundRectPath(g, -15, -15, 30, 30, 5); g.fill();
    g.strokeStyle = 'rgba(246,239,224,0.8)'; g.lineWidth = 3;
    roundRectPath(g, -9, -9, 18, 18, 3); g.stroke();
    return new THREE.CanvasTexture(cv);
  }
  // 雾团
  function mistTexture() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(250,244,230,0.85)');
    grad.addColorStop(0.6, 'rgba(250,244,230,0.38)');
    grad.addColorStop(1, 'rgba(250,244,230,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  /* ===== 5. 地形网格 + 墨色着色器 ===== */
  const terrainGeo = new THREE.PlaneGeometry(1000, 600, 256, 154);
  terrainGeo.rotateX(-Math.PI / 2);
  {
    const pos = terrainGeo.attributes.position;
    const seaArr = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const mx = pos.getX(i) + 500;
      const my = pos.getZ(i) + 300;
      pos.setY(i, terrainH(mx, my));
      seaArr[i] = seaMask(mx, my);
    }
    terrainGeo.setAttribute('aSea', new THREE.BufferAttribute(seaArr, 1));
    terrainGeo.computeVertexNormals();
  }
  const terrainUniforms = {
    uPaper: { value: new THREE.Color(PAL.paper) },
    uInkMid: { value: new THREE.Color(PAL.inkMid) },
    uInkDeep: { value: new THREE.Color(PAL.inkDeep) },
    uFogColor: { value: new THREE.Color(PAL.fog) },
    uFogNear: { value: 750 },
    uFogFar: { value: 2250 },
  };
  const terrainMat = new THREE.ShaderMaterial({
    uniforms: terrainUniforms,
    vertexShader: [
      'varying vec3 vPos;',
      'varying vec3 vNorm;',
      'varying float vFogDepth;',
      'varying float vSea;',
      'attribute float aSea;',
      'void main() {',
      '  vPos = position;',
      '  vNorm = normal;',
      '  vSea = aSea;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  vFogDepth = -mv.z;',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform vec3 uPaper;',
      'uniform vec3 uInkMid;',
      'uniform vec3 uInkDeep;',
      'uniform vec3 uFogColor;',
      'uniform float uFogNear;',
      'uniform float uFogFar;',
      'varying vec3 vPos;',
      'varying vec3 vNorm;',
      'varying float vFogDepth;',
      'varying float vSea;',
      'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
      'float vnoise(vec2 p) {',
      '  vec2 i = floor(p);',
      '  vec2 f = fract(p);',
      '  vec2 u = f * f * (3.0 - 2.0 * f);',
      '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
      '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
      '}',
      'void main() {',
      '  float h01 = clamp(vPos.y / 62.0, 0.0, 1.0);',
      '  float slope = clamp(1.0 - vNorm.y, 0.0, 1.0);',
      '  float wash = vnoise(vPos.xz * 0.028) * 0.6 + vnoise(vPos.xz * 0.011) * 0.4;',
      '  float ink = h01 * 0.45 + pow(slope, 1.5) * 0.78 + (wash - 0.5) * 0.30;',
      // 皴笔：高处顺坡淡横纹（噪声扰动去机械感）
      '  float crenel = smoothstep(0.90, 1.0, sin(vPos.y * 1.35 + wash * 6.0)) * slope * 0.10 * (0.4 + 0.6 * wash);',
      '  ink = clamp(ink + crenel, 0.0, 1.0);',
      '  ink = pow(ink, 1.45);',
      '  vec3 col = mix(uPaper, uInkMid, smoothstep(0.10, 0.50, ink));',
      '  col = mix(col, uInkDeep, smoothstep(0.50, 0.88, ink));',
      // 纸纹颗粒
      '  float grain = vnoise(vPos.xz * 2.6) * 0.10 + 0.95;',
      '  col *= grain;',
      // 谷底淡黛染（近水意趣）
      '  float valley = smoothstep(6.0, 1.5, vPos.y);',
      '  col = mix(col, vec3(0.45, 0.55, 0.52), valley * 0.22);',
      // 海墨：依海度混黛青 + 淡水纹
      '  col = mix(col, vec3(0.50, 0.58, 0.56), vSea * 0.45);',
      '  float ripple = sin((vPos.x + vPos.z) * 0.16 + wash * 4.0) * 0.5 + 0.5;',
      '  col *= 1.0 - vSea * ripple * 0.05;',
      // 雪意：高山留白（大雪山大长白意趣）
      '  float snow = smoothstep(50.0, 62.0, vPos.y + (wash - 0.5) * 10.0);',
      '  col = mix(col, uPaper * 1.04, snow * 0.82);',
      // 雾
      '  float fogF = smoothstep(uFogNear, uFogFar, vFogDepth);',
      '  col = mix(col, uFogColor, fogF);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  scene.add(terrain);

  // 界格边框（装裱意）
  function frameRect(half, inset, opacity) {
    const s = half - inset;
    const pts = [
      new THREE.Vector3(-s, 0.9, -300 + inset), new THREE.Vector3(s, 0.9, -300 + inset),
      new THREE.Vector3(s, 0.9, 300 - inset), new THREE.Vector3(-s, 0.9, 300 - inset),
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
      color: PAL.inkDeep, transparent: true, opacity,
    }));
    scene.add(line);
  }
  frameRect(500, 0, 0.55);
  frameRect(500, 14, 0.26);

  /* ===== 6. 河道水幕 ===== */
  function buildRiver(pts) {
    const left = [], right = [], idx = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      let dx = next[0] - prev[0], dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const w = 8.5 + 2.0 * Math.sin(i * 0.9);
      const nx = -dy * w, ny = dx * w;
      const y = terrainH(p[0], p[1]) + 1.0;
      left.push([p[0] - 500 + nx, y, p[1] - 300 + ny]);
      right.push([p[0] - 500 - nx, y, p[1] - 300 - ny]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(left.concat(right).flat(), 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: PAL.indigo, transparent: true, opacity: 0.44, depthWrite: false,
    }));
    mesh.renderOrder = 2;
    return mesh;
  }
  RIVERS.forEach(pts => scene.add(buildRiver(pts)));

  /* ===== 7. 道路（邻接边，沿地表虚线）+ 边缓存（行脚用）===== */
  const edges = {};   // 'a|b' -> { pts:[Vector3], cum:[len...], total }
  const roadGroup = new THREE.Group();
  scene.add(roadGroup);
  D.regions.forEach(r => {
    r.neighbors.forEach(nid => {
      const key = [r.id, nid].sort().join('|');
      if (edges[key]) return;
      const n = byId[nid];
      if (!n) return;
      const a = [r.x, r.y], b = [n.x, n.y];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const count = Math.max(6, Math.round(dist / 9));
      const pts = [];
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const mx = lerp(a[0], b[0], t), my = lerp(a[1], b[1], t);
        pts.push(new THREE.Vector3(mx - 500, terrainH(mx, my) + 2.1, my - 300));
      }
      const isCapital = r.id === 'luoyang' || nid === 'luoyang';
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
        color: isCapital ? PAL.jade : PAL.inkRoad,
        dashSize: isCapital ? 6.5 : 7,
        gapSize: isCapital ? 4.5 : 5.5,
        transparent: true,
        opacity: isCapital ? 0.95 : 0.88,
      }));
      line.computeLineDistances();
      roadGroup.add(line);
      // 累积长度表（行脚采样用）
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
      edges[key] = { pts, cum, total: cum[cum.length - 1] };
    });
  });

  /* ===== 8. 地界节点 ===== */
  const regionObjs = {};
  const labelSprites = [];
  const hitMeshes = [];
  const pulseRings = [];
  const flames = [];

  D.regions.forEach(r => {
    const base = worldOf(r.x, r.y);
    const group = new THREE.Group();
    group.position.copy(base);
    const isCapital = r.id === 'luoyang';

    // 台基
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(7.5, 8.8, 1.7, 22),
      new THREE.MeshBasicMaterial({ color: PAL.paperDeep })
    );
    pad.position.y = 0.8;
    group.add(pad);

    // 印章
    const sealSize = isCapital ? 24 : 15;
    const seal = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sealTexture(r.name[0], isCapital ? '#a52c22' : '#b9362c'),
      transparent: true, depthWrite: false,
    }));
    seal.scale.set(sealSize, sealSize, 1);
    seal.position.y = 5 + sealSize / 2;
    seal.renderOrder = 10;
    group.add(seal);

    // 竖排地名
    const label = makeLabelSprite(r.name, isCapital ? 19 : 15.5, '#241f18');
    label.position.y = 6 + sealSize + label.scale.y / 2 - 2;
    group.add(label);
    labelSprites.push(label);

    // 主城脉冲环（洛阳）
    if (isCapital) {
      for (let k = 0; k < 2; k++) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(10, 11.4, 48),
          new THREE.MeshBasicMaterial({ color: PAL.cinnabar, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 1.6;
        ring.renderOrder = 3;
        ring.userData.phase = k * 0.5;
        group.add(ring);
        pulseRings.push(ring);
      }
    }

    // 拾取用隐形球
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(isCapital ? 22 : 17, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 8;
    hit.userData.regionId = r.id;
    group.add(hit);
    hitMeshes.push(hit);

    group.userData.regionId = r.id;
    scene.add(group);
    regionObjs[r.id] = { group, data: r, label, seal };
  });

  /* ===== 8.5 大地内容：湖泊水面 / 城镇村落 / 植被 / 舟楫 / 边墙（均演示占位）===== */

  // -- 湖泊水面（地形洼地在 terrainH 内；形状噪声扰动成有机岸线）--
  function lakeMesh(L) {
    const SEG = 56;
    const pos = [], idx = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const wob = (fbm(Math.cos(a) * 1.7 + L.x * 0.013, Math.sin(a) * 1.7 + L.y * 0.013, 2) - 0.5) * L.r * 0.28;
      const rr = L.r * 0.92 + wob;
      pos.push(L.x - 500 + Math.cos(a) * rr, L.level, L.y - 300 + Math.sin(a) * rr);
    }
    for (let i = 1; i < SEG - 1; i++) idx.push(0, i, i + 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: PAL.indigo, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide,
    }));
    mesh.renderOrder = 2;
    return mesh;
  }
  LAKES.forEach(L => scene.add(lakeMesh(L)));
  LAKES.forEach(L => {
    if (!L.name) return;
    const sp = makeLabelSprite(L.name, 9, '#3a5f73');
    sp.position.set(L.x - 500, L.level + 12, L.y - 300);
    scene.add(sp);
    labelSprites.push(sp);
  });
  {
    const sp = makeLabelSprite('东海', 10, '#3a5f73');
    sp.position.set(945 - 500, 1.5, 575 - 300);
    scene.add(sp);
    labelSprites.push(sp);
    const sp2 = makeLabelSprite('北海', 9, '#3a5f73');
    sp2.position.set(895 - 500, 1.5, 16 - 300);
    scene.add(sp2);
    labelSprites.push(sp2);
  }

  // -- 聚落：徽派白墙黛瓦（单几何体合并 + 实例化，顶点色区分墙面/屋瓦/台基）--
  function mergeGeoms(parts) {
    const geos = parts.map(p => {
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
      g.applyMatrix4(p.matrix);
      const n = g.attributes.position.count;
      if (!(p.keepColor && g.attributes.color)) {
        const col = new Float32Array(n * 3);
        const c = new THREE.Color(p.color);
        for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      }
      if (!g.attributes.normal) {
        g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      }
      return g;
    });
    let total = 0;
    geos.forEach(g => { total += g.attributes.position.count; });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let o = 0;
    geos.forEach(g => {
      pos.set(g.attributes.position.array, o * 3);
      nor.set(g.attributes.normal.array, o * 3);
      col.set(g.attributes.color.array, o * 3);
      o += g.attributes.position.count;
      g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }
  // 人字双坡顶（脊深檐浅 + 白色山墙），非索引逐面顶点色
  function prismGeo() {
    const W = 1.7, D = 1.6, ridgeY = 3.15, eaveY = 2.2;
    const A = [-W, ridgeY, 0], B = [W, ridgeY, 0];
    const C = [-W, eaveY, D], Dd = [W, eaveY, D];
    const E = [-W, eaveY, -D], F = [W, eaveY, -D];
    const cRidge = [0.20, 0.18, 0.15], cEave = [0.42, 0.38, 0.31], cWall = [0.953, 0.925, 0.859];
    const pos = [], col = [];
    function tri(p0, p1, p2, c0, c1, c2) {
      pos.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2]);
      col.push(c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], c2[0], c2[1], c2[2]);
    }
    tri(A, B, Dd, cRidge, cRidge, cEave); tri(A, Dd, C, cRidge, cEave, cEave);   // 南坡
    tri(B, A, E, cRidge, cRidge, cEave); tri(B, E, F, cRidge, cEave, cEave);     // 北坡
    tri(B, F, Dd, cWall, cWall, cWall); tri(A, C, E, cWall, cWall, cWall);       // 山墙（白）
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return geo;
  }
  const houseGeo = mergeGeoms([
    { geo: new THREE.BoxGeometry(3, 2.7, 2.6), matrix: new THREE.Matrix4().makeTranslation(0, 1.35, 0), color: 0xf3ecdb },   // 白墙
    { geo: prismGeo(), matrix: new THREE.Matrix4(), keepColor: true },                                                        // 双坡黛瓦 + 白山墙
    { geo: new THREE.BoxGeometry(3.5, 0.14, 3.1), matrix: new THREE.Matrix4().makeTranslation(0, 0.07, 0), color: 0xb9ad94 }, // 台基
  ]);
  const rng = mulberry32(20261107);
  const houseXf = [];
  const settleCenters = [];
  function groundOk(mx, my, opts) {
    opts = opts || {};
    const h = terrainH(mx, my);
    if (h < (opts.hMin || 2.6) || h > (opts.hMax || 13)) return null;
    if (slopeAt(mx, my) > (opts.slopeMax || 0.34)) return null;
    if (seaMask(mx, my) > 0.1) return null;
    for (let i = 0; i < LAKES.length; i++) {
      const L = LAKES[i];
      if (Math.hypot(mx - L.x, my - L.y) < L.r + 9) return null;
    }
    if (distToRiver(mx, my) < (opts.riverMin || 9)) return null;
    for (let i = 0; i < D.regions.length; i++) {
      const r = D.regions[i];
      if (Math.hypot(mx - r.x, my - r.y) < (opts.nodeMin || 27)) return null;
    }
    return h;
  }
  const edgeList = Object.keys(edges).map(k => edges[k]);
  function placeTown() {
    for (let k = 0; k < 50; k++) {
      const e = edgeList[Math.floor(rng() * edgeList.length)];
      const idx = Math.floor((e.pts.length - 1) * (0.3 + rng() * 0.4));
      const p = e.pts[idx], q = e.pts[Math.min(idx + 1, e.pts.length - 1)];
      let dx = q.x - p.x, dz = q.z - p.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len; dz /= len;
      const off = (rng() < 0.5 ? -1 : 1) * (10 + rng() * 8);
      const mx = p.x + 500 - dz * off, my = p.z + 300 + dx * off;
      if (groundOk(mx, my, { hMin: 2.6, hMax: 11 }) === null) continue;
      if (settleCenters.some(c => Math.hypot(c.x - mx, c.y - my) < 62)) continue;
      settleCenters.push({ x: mx, y: my, town: true });
      return;
    }
  }
  function placeVillage() {
    for (let k = 0; k < 90; k++) {
      const mx = 50 + rng() * 900, my = 50 + rng() * 500;
      if (groundOk(mx, my, {}) === null) continue;
      const nearWater = distToRiver(mx, my) < 55 || LAKES.some(L => Math.hypot(mx - L.x, my - L.y) < L.r + 55);
      if (!nearWater && rng() > 0.3) continue;
      if (settleCenters.some(c => Math.hypot(c.x - mx, c.y - my) < 52)) continue;
      settleCenters.push({ x: mx, y: my, town: false });
      return;
    }
  }
  for (let i = 0; i < 8; i++) placeTown();
  for (let i = 0; i < 16; i++) placeVillage();
  // 大城城郊（洛阳 / 开封 / 江南 / 长安）
  ['luoyang', 'kaifeng', 'jiangnan', 'changan'].forEach(id => {
    const r = byId[id];
    if (!r) return;
    const a = rng() * Math.PI * 2;
    const mx = r.x + Math.cos(a) * 34, my = r.y + Math.sin(a) * 34;
    if (groundOk(mx, my, { hMax: 12 }) !== null) settleCenters.push({ x: mx, y: my, town: true, fringe: true });
  });
  settleCenters.forEach(c => {
    const n = c.fringe ? 12 + Math.floor(rng() * 3) : c.town ? 9 + Math.floor(rng() * 3) : 4 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const ang = rng() * Math.PI * 2, rad = 3 + rng() * (c.town ? 11 : 8);
      const mx = c.x + Math.cos(ang) * rad, my = c.y + Math.sin(ang) * rad;
      const h = terrainH(mx, my);
      if (h < 2.2 || h > 15) continue;
      if (slopeAt(mx, my) > 0.5) continue;
      if (distToRiver(mx, my) < 4) continue;   // 临水民居亦可
      if (seaMask(mx, my) > 0.15) continue;
      let skip = false;
      for (let j = 0; j < LAKES.length; j++) {
        if (Math.hypot(mx - LAKES[j].x, my - LAKES[j].y) < LAKES[j].r + 5) { skip = true; break; }
      }
      if (!skip) {
        for (let j = 0; j < D.regions.length; j++) {
          if (Math.hypot(mx - D.regions[j].x, my - D.regions[j].y) < 21) { skip = true; break; }
        }
      }
      if (skip) continue;
      houseXf.push({ x: mx, z: my, yaw: rng() * Math.PI * 2, s: 1.05 + rng() * 0.65 });
    }
  });
  if (houseXf.length > 0) {
    const houseMesh = new THREE.InstancedMesh(houseGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), houseXf.length);
    const dummy = new THREE.Object3D();
    houseXf.forEach((h, i) => {
      dummy.position.set(h.x - 500, terrainH(h.x, h.z) - 0.15, h.z - 300);
      dummy.rotation.set(0, h.yaw, 0);
      dummy.scale.setScalar(h.s);
      dummy.updateMatrix();
      houseMesh.setMatrixAt(i, dummy.matrix);
    });
    houseMesh.instanceMatrix.needsUpdate = true;
    scene.add(houseMesh);
  }
  function distHouse(mx, my) {
    let m = 1e9;
    for (let i = 0; i < houseXf.length; i++) {
      const d = Math.hypot(mx - houseXf[i].x, my - houseXf[i].z);
      if (d < m) m = d;
    }
    return m;
  }

  // -- 植被：松 / 杂木 / 竹 / 苇（Points + 逐点尺寸与浓淡，成簇分布）--
  function vegTexture(kind) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    const g = cv.getContext('2d');
    g.lineCap = 'round';
    if (kind === 'pine') {
      g.strokeStyle = '#3d362c'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(48, 88); g.quadraticCurveTo(46, 60, 48, 34); g.stroke();
      g.filter = 'blur(1.4px)';
      [[48, 28, 19, 10, -0.35], [39, 44, 16, 8, 0.3], [57, 55, 14, 7, -0.3], [46, 70, 12, 6, 0.25]].forEach(b => {
        g.fillStyle = 'rgba(62, 88, 56, 0.92)';
        g.beginPath(); g.ellipse(b[0], b[1], b[2], b[3], b[4], 0, Math.PI * 2); g.fill();
      });
      g.filter = 'none';
    } else if (kind === 'tree') {
      g.strokeStyle = '#443c30'; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(48, 88); g.quadraticCurveTo(50, 66, 48, 50); g.stroke();
      g.filter = 'blur(1.6px)';
      g.fillStyle = 'rgba(84, 106, 62, 0.9)';
      g.beginPath(); g.ellipse(48, 40, 21, 16, 0.15, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(58, 82, 48, 0.82)';
      g.beginPath(); g.ellipse(56, 52, 12, 7, 0.3, 0, Math.PI * 2); g.fill();
      g.filter = 'none';
    } else if (kind === 'bamboo') {
      g.strokeStyle = '#486046'; g.lineWidth = 3;
      [40, 54].forEach((x, i) => {
        g.beginPath(); g.moveTo(x, 88); g.quadraticCurveTo(x + (i ? 4 : -4), 55, x + (i ? 8 : -7), 26); g.stroke();
      });
      g.lineWidth = 2.4; g.strokeStyle = '#4f6a4a';
      [[36, 40, -14, -8], [58, 48, 14, -9], [44, 30, -12, -7], [52, 58, 12, -6]].forEach(l => {
        g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[0] + l[2], l[1] + l[3]); g.stroke();
      });
    } else if (kind === 'moss') {
      g.filter = 'blur(0.6px)';
      [[46, 50, 9], [60, 42, 6], [38, 62, 7], [55, 58, 5]].forEach(b => {
        g.fillStyle = 'rgba(74, 88, 56, 0.72)';
        g.beginPath(); g.arc(b[0], b[1], b[2], 0, Math.PI * 2); g.fill();
      });
      g.filter = 'none';
    } else if (kind === 'blossom') { // 花树（淡底，uTint 定色：桃粉/杏粉/山茶红/银杏金）
      g.strokeStyle = '#4a3a30'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(48, 88); g.quadraticCurveTo(50, 66, 48, 52); g.stroke();
      g.filter = 'blur(1.2px)';
      [[44, 36, 14, 10], [58, 44, 11, 8], [40, 50, 10, 7]].forEach(b => {
        g.fillStyle = 'rgba(242, 226, 226, 0.95)';
        g.beginPath(); g.ellipse(b[0], b[1], b[2], b[3], 0.3, 0, Math.PI * 2); g.fill();
      });
      g.filter = 'none';
    } else { // reed 苇
      g.strokeStyle = '#64754a'; g.lineWidth = 2.6;
      [[38, 0], [48, 3], [58, -2]].forEach((p, i) => {
        g.beginPath(); g.moveTo(p[0], 88);
        g.quadraticCurveTo(p[0] + p[1], 55, p[0] + p[1] * 2 + i * 2, 30 + i * 6); g.stroke();
      });
    }
    return new THREE.CanvasTexture(cv);
  }
  const vegMats = [];
  function vegProjFactor() {
    return (renderer.domElement.height * 0.5) / Math.tan((camera.fov * Math.PI) / 360);
  }
  function buildVeg(kind, spots, targetScene, fogRange, tintHex) {
    const n = spots.length;
    if (n === 0) return;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), tint = new Float32Array(n);
    spots.forEach((p, i) => {
      pos[i * 3] = p.x - 500; pos[i * 3 + 1] = p.h + p.s * 0.45; pos[i * 3 + 2] = p.z - 300;
      size[i] = p.s; tint[i] = p.t;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
    const fr = fogRange || [750, 2250];
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: vegTexture(kind) },
        uProj: { value: vegProjFactor() },
        uTint: { value: new THREE.Color(tintHex || 0xffffff) },
        uFogColor: { value: new THREE.Color(PAL.fog) },
        uFogNear: { value: fr[0] },
        uFogFar: { value: fr[1] },
      },
      vertexShader: [
        'attribute float aSize;',
        'attribute float aTint;',
        'varying float vTint;',
        'varying float vFogDepth;',
        'uniform float uProj;',
        'void main() {',
        '  vTint = aTint;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  vFogDepth = -mv.z;',
        '  gl_PointSize = clamp(aSize * uProj / max(1.0, -mv.z), 1.0, 220.0);',
        '  gl_Position = projectionMatrix * mv;',
        '}',
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D uMap;',
        'uniform vec3 uTint;',
        'uniform vec3 uFogColor;',
        'uniform float uFogNear;',
        'uniform float uFogFar;',
        'varying float vTint;',
        'varying float vFogDepth;',
        'void main() {',
        '  vec4 t = texture2D(uMap, gl_PointCoord);',
        '  if (t.a < 0.38) discard;',
        '  vec3 col = t.rgb * uTint * mix(0.82, 1.15, vTint);',
        '  float fogF = smoothstep(uFogNear, uFogFar, vFogDepth);',
        '  col = mix(col, uFogColor, fogF);',
        '  gl_FragColor = vec4(col, t.a);',
        '}',
      ].join('\n'),
      transparent: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = 6;
    (targetScene || scene).add(pts);
    vegMats.push(mat);
  }
  function scatterVeg(count, accept) {
    const out = [];
    let guard = count * 40;
    while (out.length < count && guard-- > 0) {
      const mx = 30 + rng() * 940, my = 30 + rng() * 540;
      if (seaMask(mx, my) > 0.1) continue;
      const got = accept(mx, my);
      if (got) out.push({ x: mx, z: my, h: got.h, s: got.s, t: got.t });
    }
    return out;
  }
  const clump = (mx, my, f) => fbm(mx * 0.02 + f, my * 0.02 + f * 2.7, 2) > 0.52;
  const vegClear = (mx, my, houseMin, nodeMin) =>
    distHouse(mx, my) > houseMin &&
    D.regions.every(r => Math.hypot(mx - r.x, my - r.y) > nodeMin);
  buildVeg('pine', scatterVeg(950, (mx, my) => {
    const h = terrainH(mx, my);
    const sl = slopeAt(mx, my);
    if (h < 8 || h > 64 || sl > 0.66) return null;
    if (h > 20 && sl < 0.16) return null;             // 平顶不长松，松随山脊
    if (!clump(mx, my, 11.3) && h < 26) return null;
    if (distToRiver(mx, my) < 7 || !vegClear(mx, my, 7, 16)) return null;
    return { h, s: 9 + rng() * 6, t: clamp((h - 8) / 56, 0, 1) * 0.7 + rng() * 0.3 };
  }));
  buildVeg('tree', scatterVeg(380, (mx, my) => {
    const h = terrainH(mx, my);
    if (h < 3.2 || h > 11 || slopeAt(mx, my) > 0.3) return null;
    if (distToRiver(mx, my) < 8 || !vegClear(mx, my, 7, 16)) return null;
    return { h, s: 7 + rng() * 4, t: rng() * 0.5 };
  }));
  buildVeg('bamboo', scatterVeg(330, (mx, my) => {
    const h = terrainH(mx, my);
    if (h < 2.6 || h > 9 || distToRiver(mx, my) > 30) return null;
    if (!clump(mx, my, 23.1) || !vegClear(mx, my, 6, 15)) return null;
    return { h, s: 6.5 + rng() * 3.5, t: rng() * 0.4 };
  }));
  buildVeg('moss', scatterVeg(650, (mx, my) => {
    const h = terrainH(mx, my);
    if (h < 2.6 || h > 14 || slopeAt(mx, my) > 0.45) return null;
    if (!vegClear(mx, my, 5, 13)) return null;
    return { h, s: 2.2 + rng() * 1.6, t: 0.1 + rng() * 0.4 };
  }));
  buildVeg('reed', scatterVeg(140, (mx, my) => {
    let near = null;
    for (let i = 0; i < LAKES.length; i++) {
      const L = LAKES[i];
      const d = Math.hypot(mx - L.x, my - L.y);
      if (d > L.r * 0.55 && d < L.r + 16) { near = L; break; }
    }
    if (!near) return null;
    const h = terrainH(mx, my);
    if (h > near.level + 2.8 || !vegClear(mx, my, 6, 14)) return null;
    return { h, s: 6 + rng() * 3, t: 0.2 + rng() * 0.3 };
  }));
  // 桃花岛上一片粉墨桃花（孤屿点缀，演示占位）
  {
    const th = byId.taohua;
    const spots = [];
    const brng = mulberry32(77);
    if (th) {
      for (let i = 0; i < 14; i++) {
        const a = brng() * Math.PI * 2, r = 3 + brng() * 10;
        const mx = th.x + Math.cos(a) * r, my = th.y + Math.sin(a) * r * 0.8;
        spots.push({ x: mx, z: my, h: terrainH(mx, my), s: 5.5 + brng() * 3, t: 0.2 + brng() * 0.3 });
      }
      buildVeg('blossom', spots, null, null, 0xe092a4);
    }
  }

  // -- 舟楫（河上缓行，演示点缀）--
  function boatTexture() {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = 'rgba(46, 40, 33, 0.88)';
    g.beginPath();
    g.moveTo(12, 42);
    g.quadraticCurveTo(64, 58, 116, 42);
    g.quadraticCurveTo(64, 46, 12, 42);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(78, 68, 56, 0.85)';
    g.beginPath(); g.arc(64, 40, 13, Math.PI, 0); g.closePath(); g.fill();
    return new THREE.CanvasTexture(cv);
  }
  const riverWorld = RIVERS.map(pts => pts.map(p =>
    new THREE.Vector3(p[0] - 500, terrainH(p[0], p[1]) + 1.6, p[1] - 300)
  ));
  const boats = [];
  [[0, 0.25], [0, 0.62], [1, 0.5]].forEach(cfg => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: boatTexture(), transparent: true, depthWrite: false }));
    sp.scale.set(11, 5.5, 1);
    sp.renderOrder = 5;
    scene.add(sp);
    boats.push({ sp, river: riverWorld[cfg[0]], t: cfg[1], dir: rng() < 0.5 ? 1 : -1, speed: 0.008 + rng() * 0.006, ph: rng() * 6.3 });
  });
  function riverPointAt(river, t) {
    const f = clamp(t, 0, 1) * (river.length - 1);
    const i = Math.min(Math.floor(f), river.length - 2);
    return new THREE.Vector3().lerpVectors(river[i], river[i + 1], f - i);
  }
  // 海上一叶环岛舟（沿桃花岛东侧巡航，演示占位）
  {
    const th = byId.taohua;
    const cx = th ? th.x + 40 : 847, cy = th ? th.y : 401;
    const loop = [];
    for (let i = 0; i <= 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const px = cx + Math.cos(a) * 12, py = cy + Math.sin(a) * 48;
      loop.push(new THREE.Vector3(px - 500, terrainH(px, py) + 2.2, py - 300));
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: boatTexture(), transparent: true, depthWrite: false }));
    sp.scale.set(11, 5.5, 1);
    sp.renderOrder = 5;
    scene.add(sp);
    boats.push({ sp, river: loop, t: 0.2, dir: 1, speed: 0.02, ph: 2.1 });
  }

  // -- 边墙与烽燧（真实明长城走向：嘉峪关-河套-雁门关-居庸-山海关，演示占位）--
  {
    const yanmen = byId.yanmenguan;
    const WALL = [
      [360, 196], [480, 176], [566, 184],
      yanmen ? [yanmen.x, yanmen.y + 2] : [606, 216],
      [670, 192], [720, 188], [756, 200],
    ];
    const bottom = [], top = [];
    for (let i = 0; i < WALL.length - 1; i++) {
      const a = WALL[i], b = WALL[i + 1];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(2, Math.round(len / 12));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = lerp(a[0], b[0], t), my = lerp(a[1], b[1], t) + (fbm(x * 0.02, 7.7, 2) - 0.5) * 8;
        const h = terrainH(x, my);
        bottom.push(x - 500, h, my - 300);
        top.push(x - 500, h + 5.5, my - 300);
      }
    }
    const n = bottom.length / 3;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bottom.concat(top)), 3));
    const idx = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i, b = i + 1, c = i + n, d = i + n + 1;
      idx.push(a, c, b, b, c, d);
    }
    geo.setIndex(idx);
    const wall = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x4a4136, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
    }));
    wall.renderOrder = 4;
    scene.add(wall);
    const towerGeo = new THREE.BoxGeometry(6.5, 10, 6.5);
    const towerMat = new THREE.MeshBasicMaterial({ color: 0x372f27 });
    WALL.forEach(pt => {
      const tw = new THREE.Mesh(towerGeo, towerMat);
      tw.position.set(pt[0] - 500, terrainH(pt[0], pt[1]) + 5, pt[1] - 300);
      scene.add(tw);
    });
  }

  /* ===== 9. 事件点缀（危机火苗 / 事件菱标，演示占位）===== */
  const flameTex = flameTexture();
  const diamondTex = diamondTexture();
  D.events.forEach(ev => {
    const r = byId[ev.region];
    if (!r) return;
    const group = regionObjs[ev.region].group;
    const isCrisis = ev.kind === 'crisis' || ev.kind === 'finale';
    const color = ev.kind === 'finale' ? '#8a6414' : '#a52c22';

    if (isCrisis) {
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false }));
      fl.scale.set(13, 17.5, 1);
      fl.position.set(13, 16, 4);
      fl.renderOrder = 11;
      group.add(fl);
      flames.push(fl);
    } else {
      const dm = new THREE.Sprite(new THREE.SpriteMaterial({ map: diamondTex, transparent: true, depthWrite: false }));
      dm.scale.set(11, 11, 1);
      dm.position.set(13, 15, 4);
      dm.renderOrder = 11;
      group.add(dm);
    }

    let text = ev.label;
    if (ev.remain) text += ' 余' + ev.remain + '旬';
    const tag = makeLabelSprite(text, 10.5, color);
    tag.position.set(15, isCrisis ? 30 : 27, 4);
    group.add(tag);
    labelSprites.push(tag);
  });

  /* ===== 10. 行脚棋子 + 尾波 ===== */
  const traveler = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sealTexture('侠', '#a52c22'), transparent: true, depthWrite: false,
  }));
  traveler.scale.set(13, 13, 1);
  traveler.renderOrder = 11;
  scene.add(traveler);

  const wakePool = [];
  const wakeGeo = new THREE.RingGeometry(3.4, 4.4, 26);
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(wakeGeo, new THREE.MeshBasicMaterial({
      color: PAL.cinnabar, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    m.renderOrder = 3;
    scene.add(m);
    wakePool.push({ mesh: m, life: 0 });
  }
  let wakeIdx = 0;
  function dropWake(pos) {
    const w = wakePool[wakeIdx]; wakeIdx = (wakeIdx + 1) % wakePool.length;
    w.mesh.position.set(pos.x, terrainH(pos.x + 500, pos.z + 300) + 0.7, pos.z);
    w.mesh.visible = true;
    w.life = 1.1;
  }

  const walk = {
    at: 'luoyang', prev: null,
    edge: null, dir: 1, dist: 0, speed: 40,
    phase: 'pause', pauseT: 1.2, wakeT: 0,
  };
  function pickNextEdge() {
    const r = byId[walk.at];
    let options = r.neighbors.filter(n => byId[n]);
    if (options.length > 1 && walk.prev) options = options.filter(n => n !== walk.prev);
    const next = options[Math.floor(Math.random() * options.length)];
    const key = [walk.at, next].sort().join('|');
    const e = edges[key];
    walk.prev = walk.at;
    walk.at = next;
    walk.dir = e.pts[0].distanceTo(worldOf(r.x, r.y)) < 2 ? 1 : -1; // 起点是否为当前地界
    walk.edge = e;
    walk.dist = 0;
    walk.speed = clamp(e.total / 5.5, 26, 90);
    walk.phase = 'move';
  }
  function edgePointAt(e, dir, d) {
    const n = e.pts.length;
    const total = e.total;
    const dd = dir > 0 ? d : total - d;
    let i = 1;
    while (i < n - 1 && e.cum[i] < dd) i++;
    const l0 = e.cum[i - 1], l1 = e.cum[i];
    const t = l1 > l0 ? (dd - l0) / (l1 - l0) : 0;
    return new THREE.Vector3().lerpVectors(e.pts[i - 1], e.pts[i], clamp(t, 0, 1));
  }

  /* ===== 11. 雾团 ===== */
  const mistTex = mistTexture();
  const mists = [];
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: mistTex, transparent: true, depthWrite: false, opacity: 0.10 + Math.random() * 0.12,
    }));
    const s = 260 + Math.random() * 220;
    sp.scale.set(s, s * (0.5 + Math.random() * 0.25), 1);
    sp.position.set((Math.random() - 0.5) * 1050, 26 + Math.random() * 58, (Math.random() - 0.5) * 620);
    sp.renderOrder = 20;
    sp.userData.vx = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 4);
    scene.add(sp);
    mists.push(sp);
  }

  /* ===== 12. 轨道相机（自写，带阻尼与自动旋转）===== */
  const worldOrbit = {
    target: new THREE.Vector3(0, 6, 0),
    theta: -0.55, phi: 0.50, r: 1350,               // 入场起点（高远）
    tTheta: -0.55, tPhi: 0.95, tR: 800,             // 收束目标
    minPhi: 0.28, maxPhi: 1.32, minR: 240, maxR: 1500,
  };
  let orbit = worldOrbit;                           // 活动轨道（钻入本境时切到本境轨道）
  let autoRotate = true;                            // 自转开关（对活动轨道生效）
  const HOME_LOCAL = { theta: -0.55, phi: 0.84, r: 560 };
  const HOME = { theta: -0.55, phi: 0.95, r: 800 };
  let camTween = null;
  function tweenCamera(to, dur) {
    camTween = {
      t0: performance.now(), dur: dur || 900,
      from: { tx: orbit.target.x, ty: orbit.target.y, tz: orbit.target.z, theta: orbit.tTheta, phi: orbit.tPhi, r: orbit.tR },
      to,
    };
  }
  function shortestAngle(from, to) {
    let d = (to - from) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function resetView() {
    if (mode === 'local' && local) {
      tweenCamera({ tx: 0, ty: 5, tz: 0, theta: orbit.tTheta + shortestAngle(orbit.tTheta, HOME_LOCAL.theta), phi: HOME_LOCAL.phi, r: HOME_LOCAL.r }, 900);
      return;
    }
    tweenCamera({ tx: 0, ty: 6, tz: 0, theta: orbit.tTheta + shortestAngle(orbit.tTheta, HOME.theta), phi: HOME.phi, r: HOME.r }, 900);
  }
  function focusRegion(id) {
    const o = regionObjs[id];
    if (!o) return;
    const p = o.group.position;
    tweenCamera({ tx: p.x, ty: p.y + 6, tz: p.z, theta: orbit.tTheta, phi: clamp(orbit.tPhi, 0.7, 1.15), r: 400 }, 800);
  }
  function applyCamera(dt) {
    if (camTween) {
      const t = clamp((performance.now() - camTween.t0) / camTween.dur, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const f = camTween.from, o = camTween.to;
      orbit.target.set(lerp(f.tx, o.tx, e), lerp(f.ty, o.ty, e), lerp(f.tz, o.tz, e));
      orbit.tTheta = orbit.theta = lerp(f.theta, o.theta, e);
      orbit.tPhi = orbit.phi = lerp(f.phi, o.phi, e);
      orbit.tR = orbit.r = lerp(f.r, o.r, e);
      if (t >= 1) camTween = null;
    } else {
      if (autoRotate && !camTween) orbit.tTheta += dt * 0.045;
      const k = 1 - Math.pow(0.002, dt);
      orbit.theta += (orbit.tTheta - orbit.theta) * k;
      orbit.phi += (orbit.tPhi - orbit.phi) * k;
      orbit.r += (orbit.tR - orbit.r) * k;
    }
    const sp = Math.sin(orbit.phi);
    camera.position.set(
      orbit.target.x + orbit.r * sp * Math.sin(orbit.theta),
      orbit.target.y + orbit.r * Math.cos(orbit.phi),
      orbit.target.z + orbit.r * sp * Math.cos(orbit.theta)
    );
    camera.lookAt(orbit.target);
  }

  // 指针交互
  const pointers = new Map();
  let dragMoved = 0, lastPinch = 0;
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMoved = 0;
    camTween = null;
    if (autoRotate) { autoRotate = false; syncButtons(); }
    canvas.classList.add('dragging');
    if (pointers.size === 2) {
      const ps = [...pointers.values()];
      lastPinch = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
    }
  });
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId);
    if (!p) { hoverCheck(e); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    dragMoved += Math.abs(dx) + Math.abs(dy);
    if (pointers.size === 1) {
      orbit.tTheta += dx * 0.0052;
      orbit.tPhi = clamp(orbit.tPhi + dy * 0.0038, orbit.minPhi, orbit.maxPhi);
    } else if (pointers.size === 2) {
      const ps = [...pointers.values()];
      const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      if (lastPinch > 0) orbit.tR = clamp(orbit.tR * lastPinch / d, orbit.minR, orbit.maxR);
      lastPinch = d;
    }
  });
  canvas.addEventListener('pointerup', e => {
    pointers.delete(e.pointerId);
    lastPinch = 0;
    canvas.classList.remove('dragging');
    if (dragMoved < 6) clickPick(e);
  });
  canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); lastPinch = 0; canvas.classList.remove('dragging'); });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    camTween = null;
    orbit.tR = clamp(orbit.tR * Math.pow(1.0012, e.deltaY), orbit.minR, orbit.maxR);
  }, { passive: false });
  canvas.addEventListener('dblclick', resetView);

  /* ===== 13. 拾取 + 信息卡 ===== */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickAt(clientX, clientY) {
    ndc.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (mode === 'local' && local) {
      const hits = raycaster.intersectObjects(local.hits, false);
      return { kind: 'tile', idx: hits.length ? hits[0].object.userData.tileIdx : null };
    }
    const hits = raycaster.intersectObjects(hitMeshes, false);
    return { kind: 'region', id: hits.length ? hits[0].object.userData.regionId : null };
  }
  let hoverT = 0;
  function hoverCheck(e) {
    const now = performance.now();
    if (now - hoverT < 90) return;
    hoverT = now;
    const hit = pickAt(e.clientX, e.clientY);
    const on = hit.kind === 'region' ? !!hit.id : hit.idx !== null && hit.idx !== undefined;
    canvas.classList.toggle('hovering', on);
  }
  function clickPick(e) {
    const hit = pickAt(e.clientX, e.clientY);
    window.__lastPick = { x: e.clientX, y: e.clientY, hit: hit }; // 调试把手
    if (hit.kind === 'region') {
      if (hit.id) { showRegionInfo(hit.id); focusRegion(hit.id); }
      else hideInfo();
    } else if (hit.idx !== null && hit.idx !== undefined) {
      showTileInfo(hit.idx); focusTile(hit.idx);
    } else hideInfo();
  }

  const card = document.getElementById('info-card');
  const el = id => document.getElementById(id);
  function showRegionInfo(id) {
    const r = byId[id];
    if (!r) return;
    currentRegionId = id;
    el('ic-seal').textContent = r.name[0];
    el('ic-name').textContent = r.name;
    el('ic-sub').textContent = r.subtitle;
    el('ic-zone').textContent = ZONE_NAMES[r.zone] || r.zone;
    el('ic-zone').style.display = '';
    el('ic-faction').textContent = r.faction;
    el('ic-faction').style.display = '';
    el('ic-desc').textContent = r.desc;
    const ev = D.events.find(v => v.region === id);
    const evBox = el('ic-event');
    if (ev) {
      evBox.textContent = (ev.remain ? '⚠ ' : '✦ ') + ev.label + (ev.remain ? ' · 余' + ev.remain + '旬' : '');
      evBox.className = 'ic-event show ' + (ev.kind === 'event' ? 'gold' : 'crisis');
    } else {
      evBox.className = 'ic-event';
    }
    const list = el('ic-neigh-list');
    list.innerHTML = '';
    r.neighbors.forEach(nid => {
      const n = byId[nid];
      if (!n) return;
      const chip = document.createElement('button');
      chip.className = 'neigh-chip';
      chip.textContent = n.name;
      chip.addEventListener('click', () => { showRegionInfo(nid); focusRegion(nid); });
      list.appendChild(chip);
    });
    icEnter.classList.add('show');
    card.classList.add('show');
  }
  function showTileInfo(idx) {
    if (!local || !local.tiles[idx]) return;
    const t = local.tiles[idx].data;
    const tt = TILE_TYPES[t.type] || TILE_TYPES.scenic;
    el('ic-seal').textContent = t.name[0];
    el('ic-name').textContent = t.name;
    el('ic-sub').textContent = tt.name;
    el('ic-zone').style.display = 'none';
    el('ic-faction').textContent = '';
    el('ic-faction').style.display = 'none';
    el('ic-desc').textContent = t.desc;
    el('ic-event').className = 'ic-event';
    const list = el('ic-neigh-list');
    list.innerHTML = '';
    (t.next || []).forEach(ni => {
      const n = local.tiles[ni];
      if (!n) return;
      const chip = document.createElement('button');
      chip.className = 'neigh-chip';
      chip.textContent = n.data.name;
      chip.addEventListener('click', () => { showTileInfo(ni); focusTile(ni); });
      list.appendChild(chip);
    });
    icEnter.classList.remove('show');
    card.classList.add('show');
  }
  function hideInfo() { card.classList.remove('show'); }
  el('ic-close').addEventListener('click', hideInfo);

  /* ===== 14. 按钮 ===== */
  const btnAuto = el('btn-auto');
  const btnLabels = el('btn-labels');
  function syncButtons() {
    btnAuto.textContent = '自转 · ' + (autoRotate ? '开' : '关');
    btnAuto.classList.toggle('on', autoRotate);
  }
  btnAuto.addEventListener('click', () => { autoRotate = !autoRotate; syncButtons(); });
  btnLabels.addEventListener('click', () => {
    const show = !labelSprites[0].visible;
    labelSprites.forEach(s => { s.visible = show; });
    btnLabels.textContent = '地名 · ' + (show ? '显' : '隐');
    btnLabels.classList.toggle('on', show);
  });
  el('btn-reset').addEventListener('click', resetView);
  syncButtons();

  /* ===== 14.5 本境双层：7 格 3D 沙盘 + 钻入切换（演示占位）===== */
  const TILE_TYPES = {
    entry:  { name: '关津渡口', tag: '渡口', color: '#394f6b' },
    tavern: { name: '酒肆客栈', tag: '酒肆', color: '#b37e24' },
    market: { name: '兵甲铸炉', tag: '铸炉', color: '#75685a' },
    sect:   { name: '宗门大殿', tag: '宗门', color: '#2b6b5e' },
    arena:  { name: '风云演武', tag: '演武', color: '#b9362c' },
    shrine: { name: '灵脉冲穴', tag: '灵脉', color: '#3a8f7e' },
    secret: { name: '奇遇秘境', tag: '秘境', color: '#6b4f8a' },
    scenic: { name: '名胜风物', tag: '名胜', color: '#4a6b3a' },
  };
  let mode = 'world';           // world | diving | local | rising
  let local = null;             // 当前本境 bundle
  const localCache = {};
  let currentRegionId = null;

  const diveVeil = document.getElementById('dive-veil');
  const localBar = document.getElementById('local-bar');
  const lbName = document.getElementById('lb-name');
  const icEnter = document.getElementById('ic-enter');

  function inkMat(color, opts) { return new THREE.MeshBasicMaterial(Object.assign({ color: color }, opts || {})); }
  function addBox(g, w, h, d, color, x, y, z, rz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), inkMat(color));
    m.position.set(x, y, z);
    if (rz) m.rotation.z = rz;
    g.add(m);
    return m;
  }
  function addPyramid(g, r, h, color, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, r, h, 4, 1), inkMat(color));
    m.rotation.y = Math.PI / 4;
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  function makeTagSprite(text, color) {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 56;
    const g = cv.getContext('2d');
    g.font = '700 34px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeStyle = 'rgba(240,231,211,0.9)'; g.lineWidth = 8; g.lineJoin = 'round';
    g.strokeText(text, 64, 30);
    g.fillStyle = color;
    g.fillText(text, 64, 30);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    sp.scale.set(24, 10.5, 1);
    sp.renderOrder = 12;
    return sp;
  }

  // ---- 本境标志件库 + 天候粒子 + 局部地形（设定卡驱动，全墨色原语）----
  const PROP_ANCHORS = {
    back: [0, -255], backL: [-265, -205], backR: [265, -205],
    midL: [-395, -40], midR: [395, -40],
    frontL: [-300, 215], frontR: [300, 215], front: [0, 245],
  };
  function propSpot(anchor, idx, tiles) {
    const a = PROP_ANCHORS[anchor] || PROP_ANCHORS.back;
    let x = a[0] + (hash2i(idx * 31 + 7, idx * 17 + 3) - 0.5) * 80;
    let z = a[1] + (hash2i(idx * 13 + 11, idx * 41 + 5) - 0.5) * 60;
    for (let k = 0; k < 30; k++) {
      let clash = false;
      for (const t of tiles) {
        if (Math.hypot(x - (t.x - 500), z - (t.y - 280)) < 52) { clash = true; break; }
      }
      if (!clash) break;
      x = clamp(x * 1.06, -460, 460);
      z = clamp(z * 1.06 + (z < 0 ? -14 : 14), -268, 268);
    }
    return [x, z];
  }
  const PROP_BUILDERS = {
    gate(g, s, color) {
      addBox(g, 16 * s, 3.2 * s, 5 * s, 0xcabb98, 0, 1.6 * s, 0);
      addBox(g, 4.5 * s, 3.4 * s, 5.2 * s, 0x3a332a, 0, 3.2 * s, 0);
      addBox(g, 12 * s, 2.6 * s, 4.2 * s, 0xf1ebdc, 0, 4.6 * s, 0);
      addPyramid(g, 8.5 * s, 2.4 * s, 0x352e26, 0, 7.1 * s, 0);
    },
    wall(g, s) {
      addBox(g, 52 * s, 2.6 * s, 3.6 * s, 0xcabb98, 0, 1.3 * s, 0);
      for (let i = -3; i <= 3; i++) addBox(g, 3.2 * s, 1.1 * s, 3.8 * s, 0xb8a888, i * 7 * s, 3.1 * s, 0);
    },
    beacon(g, s) {
      addBox(g, 6.5 * s, 7 * s, 6.5 * s, 0xb0a488, 0, 3.5 * s, 0);
      addBox(g, 7.4 * s, 0.8 * s, 7.4 * s, 0x9a8f7c, 0, 7.4 * s, 0);
    },
    pagoda(g, s, color) {
      const body = color || 0xd8ccb0;
      let y = 0, w = 3.4;
      for (let i = 0; i < 5; i++) {
        addBox(g, w * s, 1.9 * s, w * s, body, 0, (y + 0.95) * s, 0);
        addPyramid(g, w * 0.86 * s, 0.9 * s, 0x352e26, 0, (y + 2.35) * s, 0);
        y += 2.7; w *= 0.82;
      }
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.4 * s, 8, 6), inkMat(0xb37e24));
      fin.position.y = (y + 0.7) * s; g.add(fin);
    },
    stupa(g, s) {
      addBox(g, 7 * s, 1.2 * s, 7 * s, 0xd8d0bc, 0, 0.6 * s, 0);
      const d = new THREE.Mesh(new THREE.SphereGeometry(3.2 * s, 14, 10), inkMat(0xf4f0e4));
      d.position.y = 2.6 * s; d.scale.y = 1.15; g.add(d);
      addPyramid(g, 1.9 * s, 3.4 * s, 0xd8d0bc, 0, 6.2 * s, 0);
    },
    threePagodas(g, s) {
      const one = (x, h) => {
        let y = 0, w = 1.7;
        for (let i = 0; i < 6; i++) {
          addBox(g, w * s, (h / 6) * s, w * s, 0xd8ccb0, x, (y + h / 12) * s, 0);
          y += h / 6; w *= 0.84;
        }
        addPyramid(g, w * s, 0.8 * s, 0x352e26, x, (y + 0.4) * s, 0);
      };
      one(0, 8); one(-5.4, 5.6); one(5.4, 5.6);
    },
    tower(g, s) {
      addBox(g, 7 * s, 3 * s, 5 * s, 0xf1ebdc, 0, 1.5 * s, 0);
      addPyramid(g, 5.4 * s, 1.3 * s, 0x352e26, 0, 3.6 * s, 0);
      addBox(g, 4.6 * s, 2.2 * s, 3.4 * s, 0xf1ebdc, 0, 5.2 * s, 0);
      addPyramid(g, 3.6 * s, 1.2 * s, 0x352e26, 0, 6.9 * s, 0);
      addBox(g, 0.3 * s, 1.6 * s, 0.3 * s, 0x6b5c48, 0, 8.2 * s, 0);
    },
    stairs(g, s) {
      for (let i = 0; i < 6; i++) addBox(g, 3.4 * s, 0.55 * s, 1.5 * s, 0xcabf9f, 0, (0.3 + i * 0.5) * s, (i * 1.5 - 4) * s);
    },
    bridgeRope(g, s) {
      addBox(g, 2 * s, 2.4 * s, 1.2 * s, 0x6b5c48, -7 * s, 1.2 * s, 0);
      addBox(g, 2 * s, 3.2 * s, 1.2 * s, 0x6b5c48, 7 * s, 1.6 * s, 0);
      const deck = addBox(g, 12.5 * s, 0.24 * s, 1.5 * s, 0x8a7a64, 0, 2.1 * s, 0);
      deck.rotation.z = 0.05;
    },
    bridgeArch(g, s) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(3.4 * s, 0.8 * s, 8, 18, Math.PI), inkMat(0xcabf9f));
      g.add(arc);
      addBox(g, 10 * s, 0.7 * s, 3 * s, 0xcabf9f, 0, 3.4 * s, 0);
    },
    tent(g, s) {
      addPyramid(g, 3.2 * s, 2.6 * s, 0xcabb98, 0, 1.3 * s, 0);
      addBox(g, 0.2 * s, 3.4 * s, 0.2 * s, 0x6b5c48, 0, 1.7 * s, 0);
    },
    stilt(g, s) {
      for (let i = -1; i <= 1; i += 2) for (let j = -1; j <= 1; j += 2)
        addBox(g, 0.3 * s, 2.4 * s, 0.3 * s, 0x6b5c48, i * 1.6 * s, 1.2 * s, j * 1.2 * s);
      addBox(g, 5 * s, 2.6 * s, 3.8 * s, 0xc9b890, 0, 3.7 * s, 0);
      addPyramid(g, 4.1 * s, 1.5 * s, 0x4a4036, 0, 6.2 * s, 0);
    },
    hut(g, s) {
      addBox(g, 5 * s, 2.6 * s, 3.8 * s, 0x8a7a64, 0, 1.3 * s, 0);
      const roof = addPyramid(g, 4.4 * s, 2 * s, 0xe8e4da, 0, 3.6 * s, 0);
      roof.scale.y = 0.62;
    },
    ding(g, s) {
      addBox(g, 4.4 * s, 2.6 * s, 3 * s, 0x6a5c3a, 0, 3.2 * s, 0);
      for (let i = -1; i <= 1; i++) addBox(g, 0.5 * s, 2 * s, 0.5 * s, 0x5a4e32, i * 1.6 * s, 1 * s, 0);
      addBox(g, 5.2 * s, 0.4 * s, 0.5 * s, 0x5a4e32, 0, 4.6 * s, 0);
    },
    cliff(g, s, color) {
      const m = addBox(g, 26 * s, 12 * s, 2.2 * s, color || 0x9a8f7c, 0, 6 * s, 0);
      m.rotation.y = 0.08;
      addBox(g, 28 * s, 1.6 * s, 2.8 * s, 0xb8ad94, 0, 12.4 * s, 0);
    },
    crater(g, s) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(11 * s, 9 * s, 18), inkMat(0x5a5248));
      cone.position.y = 4.5 * s; g.add(cone);
      const lava = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xe86030, transparent: true, opacity: 0.9, depthWrite: false }));
      lava.scale.set(5.5 * s, 3 * s, 1); lava.position.y = 8.6 * s;
      lava.userData.sway = true; g.add(lava); g.userData.ember = lava;
    },
    ice(g, s, color) {
      const c = color || 0xbcd4dc;
      const a = addBox(g, 3.4 * s, 5 * s, 2.6 * s, c, -1.4 * s, 2.5 * s, 0, 0.12);
      const b = addBox(g, 2.6 * s, 3.6 * s, 2.2 * s, c, 1.8 * s, 1.8 * s, 0.8 * s, -0.16);
      a.rotation.y = 0.4; b.rotation.y = -0.3;
    },
    spires(g, s) {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(3.6 * s, 13 * s, 6), inkMat(0xb0a488));
      c1.position.y = 6.5 * s; c1.rotation.y = 0.4; g.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(2.8 * s, 9.5 * s, 6), inkMat(0x9a8f7c));
      c2.position.set(4.6 * s, 4.75 * s, 1.2 * s); c2.rotation.y = -0.5; g.add(c2);
      const c3 = new THREE.Mesh(new THREE.ConeGeometry(2.2 * s, 7 * s, 6), inkMat(0x8a8070));
      c3.position.set(-4.4 * s, 3.5 * s, 0.8 * s); g.add(c3);
    },
    yinYang(g, s) {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(6.5 * s, 7 * s, 0.6 * s, 30), inkMat(0xe8e0cc));
      disc.position.y = 0.3 * s; g.add(disc);
      const halfW = new THREE.Mesh(new THREE.CircleGeometry(5.2 * s, 24, 0, Math.PI), inkMat(0x2e2a24, { side: THREE.DoubleSide }));
      halfW.rotation.x = -Math.PI / 2; halfW.position.y = 0.65 * s; g.add(halfW);
      const halfB = new THREE.Mesh(new THREE.CircleGeometry(5.2 * s, 24, Math.PI, Math.PI), inkMat(0xf1ebdc, { side: THREE.DoubleSide }));
      halfB.rotation.x = -Math.PI / 2; halfB.position.y = 0.66 * s; g.add(halfB);
    },
    mound(g, s) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(5.5 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), inkMat(0x8a8474));
      g.add(m);
      addBox(g, 3 * s, 3.4 * s, 0.8 * s, 0x4a443a, 0, 1.7 * s, 4.6 * s);
    },
    waterfall(g, s) {
      const f = addBox(g, 2.6 * s, 8 * s, 0.3 * s, 0xdfe8e6, 0, 4 * s, 0);
      f.material.transparent = true; f.material.opacity = 0.8;
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.6 * s, 3.6 * s, 0.3 * s, 18), inkMat(0x3f6478, { transparent: true, opacity: 0.55 }));
      pool.position.y = 0.3 * s; g.add(pool);
    },
    flags(g, s, color) {
      const c = color || 0xb9362c;
      for (let i = -1; i <= 1; i++) {
        addBox(g, 0.2 * s, 5 * s, 0.2 * s, 0x6b5c48, i * 2.6 * s, 2.5 * s, 0);
        addBox(g, 1.5 * s, 1 * s, 0.06 * s, c, i * 2.6 * s + 0.9 * s, 4.3 * s, 0);
      }
    },
    brazier(g, s, color) {
      addBox(g, 3.4 * s, 1.6 * s, 3.4 * s, 0x5a4e42, 0, 0.8 * s, 0);
      addBox(g, 4.2 * s, 0.5 * s, 4.2 * s, 0x4a4036, 0, 1.8 * s, 0);
      const fire = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: color || 0xe89040, transparent: true, opacity: 0.92, depthWrite: false }));
      fire.scale.set(5.5 * s, 6.5 * s, 1); fire.position.y = 3.6 * s;
      fire.userData.sway = true; g.add(fire); g.userData.ember = fire;
    },
    bed(g, s, color) {
      const c = color || 0xd67a86;
      [[-2.2, 0.6], [0.4, -1], [2.4, 0.8]].forEach(p => {
        const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: c, transparent: true, opacity: 0.8, depthWrite: false }));
        b.scale.set(4.6 * s, 3.2 * s, 1); b.position.set(p[0] * s, 1.4 * s, p[1] * s); g.add(b);
      });
    },
    columns(g, s) {
      [[-3, -1], [0.4, 0.8], [3.2, -0.6], [1.2, 1.6]].forEach((p, i) => {
        const hgt = (2.4 + (i % 3)) * s;
        addBox(g, 0.9 * s, hgt, 0.9 * s, 0xb0a488, p[0] * s, hgt / 2, p[1] * s, (i % 2 ? 0.06 : -0.05));
      });
    },
    snowpatch(g, s) {
      const sp = new THREE.Mesh(new THREE.CircleGeometry(6 * s, 22), inkMat(0xf6f4ee, { transparent: true, opacity: 0.92 }));
      sp.rotation.x = -Math.PI / 2; sp.position.y = 0.5 * s; sp.scale.x = 1.4; g.add(sp);
    },
    slabs(g, s) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.15 + i * 0.14);
        addBox(g, 2.6 * s, 4.2 * s, 0.7 * s, 0xa8a292, Math.cos(a) * 9 * s, 2.1 * s, -6 * s + Math.sin(a) * 5 * s, Math.sin(a) * 0.5);
      }
    },
    aurora(g, s) {
      const a = addBox(g, 60 * s, 10 * s, 0.2 * s, 0x7fc8a8, 0, 16 * s, -30 * s);
      a.material.transparent = true; a.material.opacity = 0.3;
      a.rotation.x = -0.12;
      a.userData.sway = true; a.userData.baseScale = a.scale.x;
      g.userData.ember = a;
    },
    pillars(g, s, color) {
      const c = color || 0x8a6a4a;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        addBox(g, 0.35 * s, 4.4 * s, 0.35 * s, c, Math.cos(a) * 7.5 * s, 2.2 * s, Math.sin(a) * 7.5 * s);
      }
    },
  };
  const dotTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const g = cv.getContext('2d');
    const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(cv);
  })();
  function makeParticles(kind, n, color) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1200;
      pos[i * 3 + 1] = Math.random() * 130 + 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 720;
      vel.push({ v: 6 + Math.random() * 8, ph: Math.random() * 6.3, sw: 0.4 + Math.random() * 0.8 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: kind === 'rain' ? 2.6 : 5.2, map: dotTex, transparent: true,
      opacity: kind === 'rain' ? 0.5 : 0.85, color: color, depthWrite: false, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = 21;
    function update(dt, t) {
      const arr = geo.attributes.position.array;
      for (let i = 0; i < n; i++) {
        const v = vel[i];
        if (kind === 'embers') {
          arr[i * 3 + 1] += v.v * 0.6 * dt;
          arr[i * 3] += Math.sin(t * 2 + v.ph) * 0.3;
          if (arr[i * 3 + 1] > 130) arr[i * 3 + 1] = 4;
        } else if (kind === 'fireflies') {
          arr[i * 3] += Math.sin(t * 0.7 + v.ph) * 0.5;
          arr[i * 3 + 2] += Math.cos(t * 0.6 + v.ph) * 0.4;
          arr[i * 3 + 1] += Math.sin(t * 0.9 + v.ph * 2) * 0.15;
        } else if (kind === 'rain') {
          arr[i * 3 + 1] -= 90 * dt;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 130;
        } else {              // snow / petals
          arr[i * 3 + 1] -= v.v * dt * (kind === 'petals' ? 0.55 : 0.8);
          arr[i * 3] += Math.sin(t * 1.1 + v.ph) * v.sw;
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 130;
        }
      }
      geo.attributes.position.needsUpdate = true;
    }
    return { pts, update };
  }
  function localTerrain(spec, tiles) {
    function hAt(mx, mz) {   // 地图坐标 0..1000 / 0..560
      let h = 1.8 + fbm(mx * 0.0058 + 3.7, mz * 0.0058 + 3.7, 3) * 9 * (spec.ridge || 0.3);
      let dn = 1e9;
      for (const t of tiles) dn = Math.min(dn, Math.hypot(mx - t.x, mz - t.y));
      if (dn < 40) h = lerp(1.4, h, smootherstep(18, 40, dn));
      if (spec.waters) {
        for (const w of spec.waters) {
          const d = Math.hypot(mx - w[0], mz - w[1]);
          if (d < w[2]) {
            let m = smoothstep(w[2], w[2] * 0.5, d) * 0.95;
            if (dn < 30) m *= smootherstep(12, 30, dn);
            h = Math.min(h, lerp(h, -1.4, m));
          }
        }
      }
      return h;
    }
    const geo = new THREE.PlaneGeometry(1400, 860, 96, 60);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const cA = new THREE.Color(spec.ground), cB = new THREE.Color(spec.groundDark || spec.ground);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = hAt(x + 500, z + 280) - 1.4;
      pos.setY(i, h);
      const k = clamp((h + 1.4) / 9, 0, 1);
      const c = cB.clone().lerp(cA, 0.35 + k * 0.65);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    return { mesh: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true })), hAt: hAt };
  }
  function localWater(w, color) {
    const SEG = 40;
    const pos = [], idx = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2;
      const wob = (fbm(Math.cos(a) * 1.6 + w[0] * 0.01, Math.sin(a) * 1.6 + w[1] * 0.01, 2) - 0.5) * w[2] * 0.3;
      const rr = w[2] * 0.96 + wob;
      pos.push(w[0] - 500, 0.9, w[1] - 280 + Math.sin(a) * rr);
    }
    for (let i = 1; i < SEG - 1; i++) idx.push(0, i, i + 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: color, transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide,
    }));
    mesh.renderOrder = 2;
    return mesh;
  }

  // 格用小景（每类一组墨色原语；mist 贴图兼作晕染/树冠/炉火）
  function iconFor(type) {
    const g = new THREE.Group();
    const WALL = 0xf1ebdc, ROOF = 0x352e26, WOOD = 0x6b5c48, STONE = 0x9a8f7c;
    if (type === 'entry') {
      addBox(g, 2.6, 0.5, 12, WOOD, 0, 2.4, 2);
      addBox(g, 2.6, 0.5, 12, WOOD, 0, 2.4, 2);
      addBox(g, 0.5, 2.2, 0.5, WOOD, -0.9, 1.1, -2.5);
      addBox(g, 0.5, 2.2, 0.5, WOOD, 0.9, 1.1, -2.5);
      addBox(g, 0.5, 2.2, 0.5, WOOD, -0.9, 1.1, 5.5);
      addBox(g, 0.5, 2.2, 0.5, WOOD, 0.9, 1.1, 5.5);
      addBox(g, 2.4, 0.8, 4.6, 0x4a4036, 3.2, 1.7, 1);
    } else if (type === 'tavern') {
      addBox(g, 4.6, 3.2, 4, WALL, 0, 1.6, 0);
      addPyramid(g, 3.9, 1.8, ROOF, 0, 4.1, 0);
      addBox(g, 0.22, 5.2, 0.22, WOOD, 2.9, 2.6, 2.2);
      addBox(g, 1.9, 1.2, 0.1, 0xb9362c, 3.9, 4.5, 2.2);
    } else if (type === 'market') {
      addBox(g, 5.4, 2.8, 3.6, WALL, 0, 1.4, 0);
      addPyramid(g, 4.3, 1.6, ROOF, 0, 3.6, 0);
      addBox(g, 1.6, 1.4, 1.4, STONE, 2.6, 0.7, 2.6);
      addBox(g, 2.2, 0.3, 1, 0x4a4036, 2.6, 1.55, 2.6);
      const em = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0xd98a3c, transparent: true, opacity: 0.85, depthWrite: false }));
      em.scale.set(3.4, 3.4, 1); em.position.set(2.6, 2.7, 2.6); g.add(em); g.userData.ember = em;
    } else if (type === 'sect') {
      addBox(g, 5.2, 3, 4.2, WALL, 0, 1.5, 0);
      addPyramid(g, 4.5, 1.7, ROOF, 0, 3.85, 0);
      addBox(g, 2.6, 1.4, 2, WALL, 0, 5.2, 0);
      addPyramid(g, 2.4, 1.3, ROOF, 0, 6.5, 0);
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), inkMat(0xb37e24));
      fin.position.y = 7.5; g.add(fin);
      addBox(g, 0.4, 2.6, 0.4, WOOD, -2.2, 1.3, 2.6);
      addBox(g, 0.4, 2.6, 0.4, WOOD, 2.2, 1.3, 2.6);
    } else if (type === 'arena') {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 1.4, 8), inkMat(0xdccab0));
      plat.position.y = 0.7; g.add(plat);
      addBox(g, 0.24, 4.6, 0.24, WOOD, -4.6, 2.3, 0);
      addBox(g, 0.24, 4.6, 0.24, WOOD, 4.6, 2.3, 0);
      addBox(g, 1.5, 0.9, 0.08, 0x2b6b5e, -5.4, 4.1, 0);
      addBox(g, 1.5, 0.9, 0.08, 0xb9362c, 5.4, 4.1, 0);
    } else if (type === 'shrine') {
      addBox(g, 0.8, 4, 0.8, STONE, -2.2, 2, 0);
      addBox(g, 0.8, 4, 0.8, STONE, 2.2, 2, 0);
      addBox(g, 5.6, 0.7, 1, STONE, 0, 4.3, 0);
      addBox(g, 3.4, 0.5, 0.8, STONE, 0, 3.4, 0);
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.35, 22), inkMat(0x3f6478, { transparent: true, opacity: 0.5 }));
      pool.position.set(0, 0.35, 4.5); g.add(pool);
    } else if (type === 'secret') {
      addBox(g, 1.6, 4.6, 1.4, STONE, -2.4, 2.3, 0, 0.08);
      addBox(g, 1.6, 4.2, 1.4, STONE, 2.4, 2.1, 0, -0.1);
      addBox(g, 6.2, 0.9, 1.6, STONE, 0, 4.7, 0, 0.05);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0x8a7cc9, transparent: true, opacity: 0.75, depthWrite: false }));
      gl.scale.set(3.2, 3.2, 1); gl.position.set(0, 2.6, 0); g.add(gl);
    } else { // scenic
      addBox(g, 0.3, 2.8, 0.3, WOOD, -1.9, 1.4, -1.4);
      addBox(g, 0.3, 2.8, 0.3, WOOD, 1.9, 1.4, -1.4);
      addBox(g, 0.3, 2.8, 0.3, WOOD, -1.9, 1.4, 1.4);
      addBox(g, 0.3, 2.8, 0.3, WOOD, 1.9, 1.4, 1.4);
      addPyramid(g, 3.1, 1.4, ROOF, 0, 3.5, 0);
      addBox(g, 0.5, 3, 0.5, 0x4a4036, 4.6, 1.5, -1);
      const can = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, color: 0x4a6b3a, transparent: true, opacity: 0.85, depthWrite: false }));
      can.scale.set(6.5, 6.5, 1); can.position.set(4.6, 4.3, -1); g.add(can);
    }
    return g;
  }

  function getLocal(id) {
    if (localCache[id]) return localCache[id];
    const r = byId[id];
    const spec = window.QX_LOCAL_SPECS[id] || {};
    const sc = new THREE.Scene();
    sc.fog = new THREE.Fog(PAL.fog, 520, 1500);
    // 设定卡：地面起伏（随卡着色）+ 水域 + 界格（随地形起伏）
    const ter = localTerrain(spec, r.tiles);
    sc.add(ter.mesh);
    (spec.waters || []).forEach(w => sc.add(localWater(w, spec.waterColor || 0x3f6478)));
    [[690, 0.5], [676, 0.24]].forEach(f => {
      const s = f[0], s2 = f[0] / 690 * 410;
      const corners = [[-s, -s2], [s, -s2], [s, s2], [-s, s2]];
      const pts = [];
      for (let cIdx = 0; cIdx < 4; cIdx++) {
        const a = corners[cIdx], b = corners[(cIdx + 1) % 4];
        for (let k = 0; k < 10; k++) {
          const t = k / 10;
          const px = lerp(a[0], b[0], t), pz = lerp(a[1], b[1], t);
          pts.push(new THREE.Vector3(px, ter.hAt(px + 500, pz + 280) + 0.5, pz));
        }
      }
      sc.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: PAL.inkDeep, transparent: true, opacity: f[1] })));
    });
    // 7 格台 + 格用小景 + 竖名 + 类型签 + 驻足印
    const tiles = [], hits = [], labels = [], pulses = [], embers = [], mists = [];
    r.tiles.forEach((t, i) => {
      const g = new THREE.Group();
      g.position.set(t.x - 500, 0, t.y - 280);
      const tt = TILE_TYPES[t.type] || TILE_TYPES.scenic;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(20, 22.5, 2.6, 28), inkMat(0xe3d6ba));
      base.position.y = 1.3; g.add(base);
      const topd = new THREE.Mesh(new THREE.CylinderGeometry(18, 18, 0.5, 28), inkMat(0xf2ead8));
      topd.position.y = 2.75; g.add(topd);
      const ring = new THREE.Mesh(new THREE.RingGeometry(16, 17.6, 36), inkMat(new THREE.Color(tt.color), { transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 3.05; g.add(ring);
      if (t.type === 'entry') {   // 渡口：台面即水岸
        const w = new THREE.Mesh(new THREE.CylinderGeometry(15.5, 15.5, 0.4, 26), inkMat(0x3f6478, { transparent: true, opacity: 0.55 }));
        w.position.y = 3.15; g.add(w);
      }
      const icon = iconFor(t.type);
      icon.position.y = 3;
      icon.scale.setScalar(3.8);
      g.add(icon);
      if (icon.userData.ember) embers.push(icon.userData.ember);
      const isStay = i === 0;
      const label = makeLabelSprite(t.name, 12, isStay ? '#a52c22' : '#241f18');
      label.position.set(0, 38, 0); g.add(label); labels.push(label);
      const tag = makeTagSprite(tt.tag, tt.color);
      tag.position.set(0, 26, 0); g.add(tag); labels.push(tag);
      if (isStay) {
        const seal = new THREE.Sprite(new THREE.SpriteMaterial({ map: sealTexture('驻', '#a52c22'), transparent: true, depthWrite: false }));
        seal.scale.set(14, 14, 1); seal.position.set(-13, 11, 7); seal.renderOrder = 11; g.add(seal);
        for (let k = 0; k < 2; k++) {
          const pr = new THREE.Mesh(new THREE.RingGeometry(10.5, 11.9, 40), inkMat(PAL.cinnabar, { transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
          pr.rotation.x = -Math.PI / 2; pr.position.y = 3.2; pr.renderOrder = 3;
          g.add(pr); pulses.push({ mesh: pr, phase: k * 0.5 });
        }
      }
      const hit = new THREE.Mesh(new THREE.SphereGeometry(24, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 10;
      hit.userData.tileIdx = i;
      g.add(hit); hits.push(hit);
      sc.add(g);
      tiles.push({ data: t, group: g });
    });
    // 格间路（驻足邻路黛青提亮）
    r.tiles.forEach((t, i) => {
      (t.next || []).forEach(ni => {
        if (ni <= i) return;
        const a = r.tiles[i], b = r.tiles[ni];
        const pts = [
          new THREE.Vector3(a.x - 500, 1.6, a.y - 280),
          new THREE.Vector3((a.x + b.x) / 2 - 500, 2.2, (a.y + b.y) / 2 - 280),
          new THREE.Vector3(b.x - 500, 1.6, b.y - 280),
        ];
        const isStayRoad = i === 0 || ni === 0;
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({
          color: isStayRoad ? PAL.jade : PAL.inkRoad, dashSize: 9, gapSize: 6, transparent: true, opacity: isStayRoad ? 0.9 : 0.7,
        }));
        line.computeLineDistances();
        sc.add(line);
      });
    });
    // 地界横匾
    const banner = makeLabelSprite(r.name, 22, '#241f18');
    banner.position.set(0, 50, -210);
    sc.add(banner); labels.push(banner);
    const bannerTag = makeTagSprite('本境', '#a52c22');
    bannerTag.position.set(50, 50, -210);
    sc.add(bannerTag); labels.push(bannerTag);
    // 苔点（贴地形）+ 设定卡植被 + 标志件 + 天候粒子 + 雾
    const mrng = mulberry32(id.length * 131 + id.charCodeAt(0) * 7);
    const mossSpots = [];
    for (let i = 0; i < 90; i++) {
      const mx = 500 + (mrng() - 0.5) * 1240, mz = 280 + (mrng() - 0.5) * 760;
      mossSpots.push({ x: mx, z: mz, h: ter.hAt(mx, mz), s: 2 + mrng() * 1.6, t: 0.2 + mrng() * 0.3 });
    }
    buildVeg('moss', mossSpots, sc, [520, 1500]);
    (spec.flora ? [spec.flora, spec.flora2] : []).filter(Boolean).forEach(fl => {
      const spots = [];
      let tries = 0;
      while (spots.length < (fl.n || 20) && tries++ < (fl.n || 20) * 10) {
        const mx = 500 + (mrng() - 0.5) * 1150, mz = 280 + (mrng() - 0.5) * 660;
        let near = false;
        for (const t of r.tiles) if (Math.hypot(mx - t.x, mz - t.y) < 42) { near = true; break; }
        if (near) continue;
        const h = ter.hAt(mx, mz);
        if (h < 1.2) continue;                       // 不长在水里
        spots.push({ x: mx, z: mz + 20, h: h, s: (fl.size || 7) * (0.75 + mrng() * 0.5), t: 0.2 + mrng() * 0.4 });
      }
      buildVeg(fl.kind, spots, sc, [520, 1500], fl.tint);
    });
    (spec.props || []).forEach((p, pi) => {
      const b = PROP_BUILDERS[p[0]];
      if (!b) return;
      const spot = propSpot(p[1], pi, r.tiles);
      const g = new THREE.Group();
      b(g, p[2] * 0.62, p[3]);                       // 件库基准 ~10 单位，spec 口径对齐格景
      g.position.set(spot[0], Math.max(ter.hAt(spot[0] + 500, spot[1] + 280), 0.4), spot[1]);
      sc.add(g);
      if (g.userData.ember) embers.push(g.userData.ember);
    });
    const parts = [];
    if (spec.particles && spec.particles.kind && spec.particles.kind !== 'none') {
      const ps = makeParticles(spec.particles.kind, spec.particles.n || 40, spec.particles.color || 0xffffff);
      sc.add(ps.pts); parts.push(ps);
    }
    const mistN = 5 + Math.round((spec.mist || 0.5) * 6);
    for (let i = 0; i < mistN; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mistTex, transparent: true, depthWrite: false,
        color: spec.mistColor || 0xffffff,
        opacity: Math.min(0.5, (0.1 + mrng() * 0.1) * (spec.mist || 0.5) * 2.2),
      }));
      const s = 220 + mrng() * 160;
      sp.scale.set(s, s * 0.55, 1);
      sp.position.set((mrng() - 0.5) * 1100, 26 + mrng() * 40, (mrng() - 0.5) * 620);
      sp.renderOrder = 20;
      sp.userData.vx = (mrng() < 0.5 ? -1 : 1) * (2 + mrng() * 3);
      sc.add(sp); mists.push(sp);
    }
    const orb = {
      target: new THREE.Vector3(0, 5, 0),
      theta: HOME_LOCAL.theta, phi: HOME_LOCAL.phi, r: HOME_LOCAL.r,
      tTheta: HOME_LOCAL.theta, tPhi: HOME_LOCAL.phi, tR: HOME_LOCAL.r,
      minPhi: 0.3, maxPhi: 1.3, minR: 220, maxR: 1150,
    };
    const bundle = { id, region: r, scene: sc, orbit: orb, tiles, hits, labels, pulses, embers, mists, parts };
    localCache[id] = bundle;
    return bundle;
  }

  function enterRegion(id) {
    if (mode !== 'world') return;
    const r = byId[id];
    if (!r || !r.tiles) return;
    currentRegionId = id;
    hideInfo();
    mode = 'diving';
    camTween = null;
    autoRotate = false; syncButtons();
    const p = regionObjs[id].group.position;
    tweenCamera({ tx: p.x, ty: p.y + 4, tz: p.z, theta: orbit.tTheta, phi: clamp(orbit.tPhi, 0.98, 1.15), r: 170 }, 780);
    diveVeil.classList.add('show');
    setTimeout(() => {
      if (mode !== 'diving') return;
      local = getLocal(id);
      orbit = local.orbit;
      camTween = null;
      orbit.theta = orbit.tTheta = HOME_LOCAL.theta + 0.4;
      orbit.phi = orbit.tPhi = 0.7;
      orbit.r = orbit.tR = 460;
      orbit.tTheta = HOME_LOCAL.theta; orbit.tPhi = HOME_LOCAL.phi; orbit.tR = HOME_LOCAL.r;
      mode = 'local';
      lbName.textContent = r.name + ' · 本境';
      localBar.classList.add('show');
      diveVeil.classList.remove('show');
    }, 640);
  }
  function exitRegion() {
    if (mode !== 'local') return;
    mode = 'rising';
    diveVeil.classList.add('show');
    localBar.classList.remove('show');
    hideInfo();
    setTimeout(() => {
      if (mode !== 'rising') return;
      orbit = worldOrbit;
      camTween = null;
      orbit.theta = orbit.tTheta = HOME.theta + 0.3;
      orbit.phi = orbit.tPhi = 0.72;
      orbit.r = orbit.tR = 430;
      orbit.tTheta = HOME.theta; orbit.tPhi = HOME.phi; orbit.tR = HOME.r;
      mode = 'world';
      diveVeil.classList.remove('show');
    }, 640);
  }
  function focusTile(idx) {
    if (!local) return;
    const t = local.tiles[idx];
    if (!t) return;
    const p = t.group.position;
    tweenCamera({ tx: p.x, ty: 6, tz: p.z, theta: orbit.tTheta, phi: clamp(orbit.tPhi, 0.7, 1.15), r: 300 }, 800);
  }
  icEnter.addEventListener('click', () => enterRegion(currentRegionId));
  document.getElementById('btn-back').addEventListener('click', exitRegion);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') exitRegion(); });

  /* ===== 15. 主循环 ===== */
  const clock = new THREE.Clock();
  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    applyCamera(dt);

    // 脉冲环
    pulseRings.forEach(ring => {
      const ph = (t * 0.7 + ring.userData.phase) % 1;
      ring.scale.setScalar(0.6 + ph * 1.7);
      ring.material.opacity = 0.6 * (1 - ph);
    });

    // 火苗摇曳
    flames.forEach((fl, i) => {
      const s = 1 + Math.sin(t * 6 + i * 1.7) * 0.09 + Math.sin(t * 11.3 + i) * 0.04;
      fl.scale.set(13 * s, 17.5 / s, 1);
      fl.material.opacity = 0.82 + Math.sin(t * 7.7 + i * 2.1) * 0.14;
    });

    // 行脚
    if (walk.phase === 'pause') {
      walk.pauseT -= dt;
      if (walk.pauseT <= 0) pickNextEdge();
    } else if (walk.edge) {
      walk.dist += walk.speed * dt;
      walk.wakeT -= dt;
      if (walk.dist >= walk.edge.total) {
        const end = walk.dir > 0 ? walk.edge.pts[walk.edge.pts.length - 1] : walk.edge.pts[0];
        traveler.position.copy(end);
        walk.phase = 'pause';
        walk.pauseT = 1.4 + Math.random() * 1.2;
        walk.edge = null;
      } else {
        const p = edgePointAt(walk.edge, walk.dir, walk.dist);
        p.y = terrainH(p.x + 500, p.z + 300) + 4.2 + Math.sin(t * 5.2) * 0.7;
        traveler.position.copy(p);
        if (walk.wakeT <= 0) { dropWake(p); walk.wakeT = 0.24; }
      }
    }

    // 尾波
    wakePool.forEach(w => {
      if (!w.mesh.visible) return;
      w.life -= dt;
      if (w.life <= 0) { w.mesh.visible = false; return; }
      const k = 1 - w.life / 1.1;
      w.mesh.scale.setScalar(0.7 + k * 1.3);
      w.mesh.material.opacity = 0.5 * (1 - k);
    });

    // 舟楫
    boats.forEach(b => {
      b.t += b.dir * b.speed * dt;
      if (b.t > 0.96) { b.t = 0.96; b.dir = -1; }
      if (b.t < 0.04) { b.t = 0.04; b.dir = 1; }
      const p = riverPointAt(b.river, b.t);
      b.sp.position.set(p.x, p.y + 0.7 + Math.sin(t * 2.2 + b.ph) * 0.35, p.z);
    });

    // 雾漂（世界）
    mists.forEach(sp => {
      sp.position.x += sp.userData.vx * dt;
      if (sp.position.x > 640) sp.position.x = -640;
      if (sp.position.x < -640) sp.position.x = 640;
      sp.material.opacity += Math.sin(t * 0.4 + sp.position.z) * 0.00012;
    });

    // 本境动态（脉冲环 / 炉火 / 雾漂）
    if (mode === 'local' && local) {
      local.pulses.forEach(ring => {
        const ph = (t * 0.7 + ring.phase) % 1;
        ring.mesh.scale.setScalar(0.6 + ph * 1.7);
        ring.mesh.material.opacity = 0.6 * (1 - ph);
      });
      local.embers.forEach((em, i) => {
        em.material.opacity = 0.7 + Math.sin(t * 5.1 + i * 1.9) * 0.2;
        if (em.userData.baseScale) em.scale.x = em.userData.baseScale * (1 + Math.sin(t * 0.8 + i) * 0.07);
      });
      local.parts.forEach(ps => ps.update(dt, t));
      local.mists.forEach(sp => {
        sp.position.x += sp.userData.vx * dt;
        if (sp.position.x > 660) sp.position.x = -660;
        if (sp.position.x < -660) sp.position.x = 660;
      });
    }

    renderer.render(mode === 'local' && local ? local.scene : scene, camera);
    requestAnimationFrame(tick);
  }

  /* ===== 16. resize + 入场 ===== */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    vegMats.forEach(m => { m.uniforms.uProj.value = vegProjFactor(); });
  });

  tick();
  // 调试把手（自动化走查 / 控制台调参用）
  window.__QX = {
    get orbit() { return orbit; },
    get mode() { return mode; },
    camera, scene, regionObjs, hitMeshes, labelSprites,
    localCache, enterRegion, exitRegion,
  };
  const veil = document.getElementById('veil');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    veil.classList.add('off');
    setTimeout(() => veil.remove(), 1600);
  }));
})();
