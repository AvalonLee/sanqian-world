/* gate3d.js — 万界门环 · 界海虚境（册285 空间效果重设计 · 用户确认方案执行）
 * 环形回廊悬浮于界海星空中：三层宇宙景深（3000 闪烁星辰 + 星云帆 + 浮尘）
 * + 圣殿光照（环境冷蓝紫 / 半球 / 主光 / 中央圣火 / 门扇自色光五源）
 * + 黑曜石镜面地面 + 发光符文环 + 发光棱柱。
 * portal renderTarget 双 pass 不变（门内活世界缩影）；门匾 measureText 自适应缩放修复溢出。
 * 依赖：three.min.js（../games/qunxia3d/three.min.js 复用 vendored）+ world-registry.js。
 */
(function () {
  'use strict';

  var reg = window.WORLD_REGISTRY || [];
  var TAU = Math.PI * 2;
  var allGates = []; /* { world, group, door, rt, scene, cam, particles, gateLight, awake, angle } */
  var focused = -1;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('stage').appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060618); /* 界海深空底色（原 #1a1612 过黑） */
  scene.fog = new THREE.FogExp2(0x060618, 0.012); /* 雾减半——星空不被吞 */

  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 6.0, 1.2);

  /* ===== 壹 · 背景：三层宇宙景深 ===== */

  /* 远景 · 星幕：3000 颗星辰，custom shader 逐星缓慢闪烁 */
  (function buildStars() {
    var N = 3000;
    var pos = new Float32Array(N * 3);
    var sizes = new Float32Array(N);
    var phases = new Float32Array(N);
    var cols = new Float32Array(N * 3);
    var palette = [
      [1, 1, 1],       /* 白 70% */
      [1, 0.83, 0.63], /* 暖金 15% */
      [0.63, 0.77, 1]  /* 冷蓝 15% */
    ];
    for (var i = 0; i < N; i++) {
      /* 球壳均匀分布（半径 60~150） */
      var theta = Math.random() * TAU;
      var phi = Math.acos(2 * Math.random() - 1);
      var r = 60 + Math.random() * 90;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi);
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 0.5 + Math.random() * 2.0;
      phases[i] = Math.random();
      var ci = Math.random() < 0.7 ? 0 : (Math.random() < 0.5 ? 1 : 2);
      cols[i * 3] = palette[ci][0];
      cols[i * 3 + 1] = palette[ci][1];
      cols[i * 3 + 2] = palette[ci][2];
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(cols, 3));
    var mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: [
        'attribute float aSize;',
        'attribute float aPhase;',
        'attribute vec3 aColor;',
        'varying float vPhase;',
        'varying vec3 vColor;',
        'void main() {',
        '  vPhase = aPhase;',
        '  vColor = aColor;',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = aSize * (300.0 / max(1.0, -mv.z));',
        '  gl_Position = projectionMatrix * mv;',
        '  if (mv.z > -0.5) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); }',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime;',
        'varying float vPhase;',
        'varying vec3 vColor;',
        'void main() {',
        '  float tw = 0.35 + 0.65 * sin(uTime * 1.2 + vPhase * 6.28318);',
        '  vec2 uv = gl_PointCoord - vec2(0.5);',
        '  float d = length(uv);',
        '  float a = (1.0 - smoothstep(0.05, 0.5, d)) * tw;',
        '  gl_FragColor = vec4(vColor, a);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var stars = new THREE.Points(geo, mat);
    scene.add(stars);
    scene.userData.starMat = mat;
  })();

  /* 中景 · 星云帆：2 幅大型半透明渐变面（雾外自发光，不被背景吞掉） */
  (function buildNebulae() {
    var nebs = [
      { color: 'rgba(46,18,96,0.16)', size: 120, x: -30, y: 15, z: -60, rot: 0.3, spin: 0.010 },
      { color: 'rgba(14,52,88,0.12)', size: 100, x: 35, y: -10, z: -50, rot: -0.2, spin: -0.008 }
    ];
    var meshes = [];
    nebs.forEach(function (n) {
      var cnv = document.createElement('canvas');
      cnv.width = 256; cnv.height = 256;
      var ctx = cnv.getContext('2d');
      var grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, n.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      var tex = new THREE.CanvasTexture(cnv);
      var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(n.size, n.size),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      mesh.position.set(n.x, n.y, n.z);
      mesh.rotation.z = n.rot;
      mesh.userData.spin = n.spin;
      scene.add(mesh);
      meshes.push(mesh);
    });
    scene.userData.nebulae = meshes;
  })();

  /* 近景 · 浮尘：200 颗微尘——只在外环带（半径 11.5~13.5）漂浮。
   * 刻意远离相机轨道（相机半径 ≤10）：Points 中心进近平面会触发
   * ANGLE/SwiftShader 负 PointSize 黑方块伪影（册285 实测），几何隔离最稳。 */
  (function buildDust() {
    var N = 200;
    var pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var a = Math.random() * TAU;
      var rr = 11.5 + Math.random() * 2.0;
      pos[i * 3] = Math.cos(a) * rr;
      pos[i * 3 + 1] = 0.3 + Math.random() * 5.2;
      pos[i * 3 + 2] = Math.sin(a) * rr;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: 0xaabbdd, size: 0.06, map: makeSoftSprite(), transparent: true, opacity: 0.10,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var dust = new THREE.Points(geo, mat);
    scene.add(dust);
    scene.userData.dust = dust;
  })();

  /* ===== 贰 · 光照重建（圣殿星辉五源 · 告别黑乎乎） ===== */
  (function buildLights() {
    scene.add(new THREE.AmbientLight(0x8888cc, 1.5));                        /* 环境冷蓝紫 */
    scene.add(new THREE.HemisphereLight(0x4a6a8a, 0x2a1a10, 0.8));           /* 天穹冷蓝 / 地面暖暗 */
    var key = new THREE.DirectionalLight(0xfff8f0, 1.0);                     /* 主光暖白 */
    key.position.set(5, 12, 5);
    scene.add(key);
    var fire = new THREE.PointLight(0xffd4a0, 2.5, 25);                      /* 中央圣火（呼吸） */
    fire.position.set(0, 2.5, 0);
    scene.add(fire);
    scene.userData.fireLight = fire;
  })();

  /* ===== 叁 · 回廊重设计（黑曜石镜面 + 发光符文环 + 发光棱柱） ===== */
  (function buildCorridor() {
    /* 黑曜石镜面圆盘（金属高光吃灯光反光） */
    var obsidian = new THREE.MeshStandardMaterial({ color: 0x0a0a14, metalness: 0.8, roughness: 0.15 });
    var floor = new THREE.Mesh(new THREE.CircleGeometry(14, 64), obsidian);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    /* 发光符文环（暗金微透明） */
    [[5, 5.15, 0.15], [9, 9.12, 0.15]].forEach(function (rr) {
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(rr[0], rr[1], 64),
        new THREE.MeshBasicMaterial({ color: 0xc4a44a, transparent: true, opacity: rr[2], side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      scene.add(ring);
    });

    /* 发光棱柱 ×8（暗色柱体 + 柱顶灵火珠，珠为自发光不再加灯——省 8 盏灯） */
    var pilGeo = new THREE.CylinderGeometry(0.35, 0.45, 6, 8);
    var pilMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, metalness: 0.3, roughness: 0.6 });
    var tipGeo = new THREE.SphereGeometry(0.13, 8, 8);
    var tipMat = new THREE.MeshBasicMaterial({ color: 0xd8bc6a });
    for (var i = 0; i < 8; i++) {
      var ang = (i / 8) * TAU + Math.PI / 8;
      var px = Math.cos(ang) * 12, pz = Math.sin(ang) * 12;
      var pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.set(px, 3, pz);
      scene.add(pil);
      var tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(px, 6.2, pz);
      scene.add(tip);
    }

    /* 星光基座（黑曜石 + 底部发光金环） */
    var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.4, 12), obsidian);
    ped.position.y = 0.2;
    scene.add(ped);
    var pedRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0xc4a44a, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    pedRing.rotation.x = -Math.PI / 2;
    pedRing.position.y = 0.01;
    scene.add(pedRing);
  })();

  /* ===== 肆 · 门内微缩世界建造器 ===== */

  /* 修仙云海（青焰灵山 + 金粒子 + 宝塔剪影） */
  function buildXianxianScene(world) {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0x0a1a18);
    sc.fog = new THREE.FogExp2(0x0a1a18, 0.06);
    var cam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    cam.position.set(0, 3, 10);
    cam.lookAt(0, 2, 0);
    sc.add(new THREE.AmbientLight(0x668877, 1.3));
    var dl = new THREE.DirectionalLight(0xaeeedd, 0.9);
    dl.position.set(3, 8, 3);
    sc.add(dl);

    var mat = new THREE.MeshLambertMaterial({ color: world.peak });
    for (var i = 0; i < 6; i++) {
      var h = 3 + Math.sin(i * 2.4) * 2 + 1.5;
      var m = new THREE.Mesh(new THREE.ConeGeometry(1.2 + Math.sin(i * 1.7) * 0.5, h, 5), mat);
      m.position.set((i - 2.5) * 2.2, h / 2, -2 - Math.sin(i * 3.1) * 1.5);
      sc.add(m);
    }
    var pagodaMat = new THREE.MeshLambertMaterial({ color: 0x2a4a3a });
    [[1.0, 0.8, 1], [0.7, 0.6, 2.2], [0.4, 0.8, 3.2]].forEach(function (seg) {
      var t = new THREE.Mesh(new THREE.CylinderGeometry(seg[0] * 0.7, seg[0], seg[1], 4), pagodaMat);
      t.position.set(0, seg[2], 0);
      sc.add(t);
    });
    var roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.6, 4), new THREE.MeshLambertMaterial({ color: world.mist }));
    roof.position.set(0, 4.2, 0);
    sc.add(roof);

    var pGeo = new THREE.BufferGeometry();
    var pos = [];
    for (var j = 0; j < 80; j++) pos.push((Math.random() - 0.5) * 14, Math.random() * 7, (Math.random() - 0.5) * 8);
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: world.particle, size: 0.08, transparent: true, opacity: 0.7 }));
    sc.add(pts);

    sc.userData.animate = function (dt, t) { pts.rotation.y = t * 0.08; };
    return { scene: sc, cam: cam };
  }

  /* 侠影山河（水墨地形 + 小建筑 + 暗金粒子） */
  function buildWuxiaScene(world) {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0x241c12);
    sc.fog = new THREE.FogExp2(0x241c12, 0.04);
    var cam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    cam.position.set(0, 4, 10);
    cam.lookAt(0, 1, 0);
    sc.add(new THREE.AmbientLight(0x998877, 1.5));
    var dl = new THREE.DirectionalLight(0xffe8c0, 1.1);
    dl.position.set(3, 8, 3);
    sc.add(dl);

    var geo = new THREE.PlaneGeometry(16, 10, 20, 12);
    var posAttr = geo.attributes.position;
    for (var i = 0; i < posAttr.count; i++) {
      var x = posAttr.getX(i), y = posAttr.getY(i);
      var h = Math.sin(x * 0.5) * Math.cos(y * 0.4) * 0.8 + Math.sin(x * 0.2 + y * 0.3) * 0.5;
      posAttr.setZ(i, Math.max(0, h));
    }
    geo.computeVertexNormals();
    var terr = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: world.peak }));
    terr.rotation.x = -Math.PI / 2;
    terr.position.y = -1;
    sc.add(terr);

    var bMat = new THREE.MeshLambertMaterial({ color: 0x3a3025 });
    [[-3, 0, -1], [2, 0, 1], [5, 0, -2]].forEach(function (p) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), bMat);
      b.position.set(p[0], p[1], p[2]);
      sc.add(b);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 4), new THREE.MeshLambertMaterial({ color: 0x1a1410 }));
      roof.position.set(p[0], p[1] + 0.5, p[2]);
      sc.add(roof);
    });
    /* 水墨河道线（亮色条带 · 穿过地形） */
    var river = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 12),
      new THREE.MeshBasicMaterial({ color: 0x4a6a8a, transparent: true, opacity: 0.38 })
    );
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = 0.4;
    river.position.set(-1, 0.06, 0);
    sc.add(river);

    var pGeo = new THREE.BufferGeometry();
    var pos = [];
    for (var j = 0; j < 60; j++) pos.push((Math.random() - 0.5) * 14, Math.random() * 6, (Math.random() - 0.5) * 8);
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: world.particle, size: 0.06, transparent: true, opacity: 0.5 }));
    sc.add(pts);

    sc.userData.animate = function (dt, t) { pts.rotation.y = t * 0.05; };
    return { scene: sc, cam: cam };
  }

  /* ===== 伍 · 贴图工具 ===== */

  /* 软圆点精灵（32×32 径向渐变）——给所有 Points 用，杜绝方形颗粒 */
  function makeSoftSprite() {
    var cnv = document.createElement('canvas');
    cnv.width = 32; cnv.height = 32;
    var ctx = cnv.getContext('2d');
    var g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(cnv);
  }

  function makeTextTexture(text, color) {
    var cnv = document.createElement('canvas');
    cnv.width = 128; cnv.height = 128;
    var ctx = cnv.getContext('2d');
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = color || '#c4a44a';
    ctx.font = 'bold 80px KaiTi, STKaiti, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 68);
    return new THREE.CanvasTexture(cnv);
  }

  /* 门匾：384×80 大画布 + measureText 自适应缩放 + 金辉描影（册285 修「字溢出框」） */
  function makePlaqueTexture(name, seq) {
    var cnv = document.createElement('canvas');
    cnv.width = 384; cnv.height = 80;
    var ctx = cnv.getContext('2d');
    ctx.fillStyle = '#14100c';
    ctx.fillRect(0, 0, 384, 80);
    ctx.strokeStyle = '#c4a44a';
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, 374, 70);
    var fullText = seq + ' · ' + name;
    ctx.font = 'bold 30px KaiTi, STKaiti, serif';
    var measured = ctx.measureText(fullText).width;
    if (measured > 330) ctx.font = 'bold ' + Math.max(14, Math.floor(30 * 330 / measured)) + 'px KaiTi, STKaiti, serif';
    ctx.fillStyle = '#d8bc6a';
    ctx.shadowColor = '#c4a44a';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fullText, 192, 42);
    return new THREE.CanvasTexture(cnv);
  }

  /* ===== 陆 · 构建所有门扇 ===== */
  var gateAngleStep = TAU / Math.max(reg.length, 3);
  var gateRadius = 8;

  reg.forEach(function (world, idx) {
    var ang = -Math.PI / 2 + idx * gateAngleStep; /* 第一扇正前方 */
    var group = new THREE.Group();
    group.position.set(Math.cos(ang) * gateRadius, 0, Math.sin(ang) * gateRadius);
    group.lookAt(0, 0, 0); /* 面向中心 */

    /* 门框：暗铜柱 + 横梁 + 金色发光顶条 */
    var frameMat = new THREE.MeshStandardMaterial({ color: 0x2a2015, metalness: 0.4, roughness: 0.5 });
    var postGeo = new THREE.BoxGeometry(0.3, 4.5, 0.3);
    [-1.3, 1.3].forEach(function (ox) {
      var post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(ox, 2.25, 0);
      group.add(post);
    });
    var lintel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 0.3), frameMat);
    lintel.position.set(0, 4.5, 0);
    group.add(lintel);
    var trim = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.08, 0.32),
      new THREE.MeshBasicMaterial({ color: 0xc4a44a })
    );
    trim.position.set(0, 4.72, 0);
    group.add(trim);

    /* 门匾（2.2 宽 < 柱间 2.6 净空，自适应字缩放不溢出） */
    var plaqueTex = makePlaqueTexture(world.name, world.seq);
    var plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.46), new THREE.MeshBasicMaterial({ map: plaqueTex }));
    plaque.position.set(0, 4.5, 0.18);
    group.add(plaque);

    /* 门面 */
    var doorMat;
    var rt = null;
    var portalCam = null;
    var portalScene = null;

    if (world.status === 'open') {
      /* 开放世界：portal renderTarget */
      rt = new THREE.WebGLRenderTarget(512, 512);
      var mini;
      if (world.id === 'xiuxian') mini = buildXianxianScene(world);
      else if (world.id === 'wuxia') mini = buildWuxiaScene(world);
      else mini = buildXianxianScene(world);
      portalScene = mini.scene;
      portalCam = mini.cam;
      doorMat = new THREE.MeshBasicMaterial({ map: rt.texture });
    } else {
      /* coming：暗面 + ？贴图 */
      doorMat = new THREE.MeshBasicMaterial({ map: makeTextTexture('？', '#444444'), transparent: true, opacity: 0.5 });
    }

    var door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.8), doorMat);
    door.position.set(0, 2.1, 0.05);
    door.userData.worldIndex = idx;
    group.add(door);

    /* 门面光晕（世界色 Additive 微透面 · 贴地气韵） */
    if (world.status === 'open') {
      var aura = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 4.2),
        new THREE.MeshBasicMaterial({
          color: world.particle, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
        })
      );
      aura.position.set(0, 2.1, -0.05);
      group.add(aura);
    }

    /* 门扉粒子（awakening 时升起） */
    var pGeo = new THREE.BufferGeometry();
    var pp = [];
    for (var j = 0; j < 30; j++) {
      pp.push((Math.random() - 0.5) * 2.5, Math.random() * 4, (Math.random() - 0.5) * 0.5 + 0.3);
    }
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    var gateParticles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: world.particle, size: 0.12, map: makeSoftSprite(), transparent: true, opacity: 0,
      depthWrite: false
    }));
    group.add(gateParticles);

    /* 门扇自色光（awakening 渐亮 + 脉冲） */
    var gateLight = new THREE.PointLight(world.particle, 0, 8);
    gateLight.position.set(0, 2.5, 1);
    group.add(gateLight);

    scene.add(group);

    allGates.push({
      world: world,
      group: group,
      door: door,
      rt: rt,
      scene: portalScene,
      cam: portalCam,
      particles: gateParticles,
      gateLight: gateLight,
      awake: false,
      angle: ang,
      plaque: plaque
    });
  });

  /* ===== 柒 · 交互 ===== */
  /* 机位口径（册285 重设）：环内 elevated 全景 → 聚焦时推进到门扇正前。
   * lookAt 恒指「当前方位角上半径 8 处」（近侧门扇位置）——修复原版聚焦时
   * lookAt 落在环心对侧、被选门反而不在画面中央的偏差。 */
  var orbitAngle = -Math.PI / 2; /* 初始面向第一扇 */
  var orbitDist = 1.2; /* 环心附近：全景留出星空与回廊呼吸感 */
  var targetAngle = orbitAngle;
  var targetDist = orbitDist;
  var camYCur = 6.0;
  var lookYCur = 2.2;
  var isDragging = false;
  var dragStartX = 0;

  var cnv = renderer.domElement;

  cnv.addEventListener('pointerdown', function (e) {
    isDragging = true;
    dragStartX = e.clientX;
  });

  cnv.addEventListener('pointermove', function (e) {
    if (!isDragging) return;
    var dx = e.clientX - dragStartX;
    dragStartX = e.clientX;
    targetAngle += dx * 0.005;
  });

  cnv.addEventListener('pointerup', function (e) {
    isDragging = false;
    var mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    var ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    var hits = ray.intersectObjects(allGates.map(function (g) { return g.door; }));
    if (hits.length > 0) {
      var idx = hits[0].object.userData.worldIndex;
      if (allGates[idx].world.status === 'open') focusGate(idx);
    }
  });

  function focusGate(idx) {
    focused = idx;
    var g = allGates[idx];
    targetAngle = g.angle;
    targetDist = 2.4; /* 门距 = 8 - 2.4 = 5.6：整门 + 门匾全入画 */
    allGates.forEach(function (gate, i) {
      gate.awake = (i === idx);
    });
    updateUI(idx);
  }

  function updateUI(idx) {
    var g = allGates[idx];
    var info = document.getElementById('gate-info');
    var pushBtn = document.getElementById('btn-push');
    if (!g || g.world.status !== 'open') { info.classList.remove('show'); pushBtn.classList.remove('show'); return; }
    info.classList.add('show');
    pushBtn.classList.add('show');
    document.getElementById('gi-seal').textContent = g.world.seal;
    document.getElementById('gi-name').textContent = g.world.name;
    document.getElementById('gi-tag').textContent = g.world.seq + ' · ' + g.world.tagline;
    document.getElementById('gi-desc').textContent = g.world.desc;
    pushBtn.onclick = function () { pushDoor(g); };
  }

  function pushDoor(g) {
    var veil = document.getElementById('push-veil');
    veil.style.pointerEvents = 'auto';
    veil.style.opacity = '1';
    setTimeout(function () {
      window.location.href = g.world.path;
    }, 900);
  }

  /* ===== 捌 · DOM 按钮 ===== */
  document.getElementById('btn-back-main').addEventListener('click', function () {
    window.location.href = '../index.html';
  });

  /* ===== 玖 · 渲染循环 ===== */
  var clock = new THREE.Clock();
  function tick() {
    var dt = Math.min(clock.getDelta(), 0.1);
    var t = clock.getElapsedTime();

    /* 星幕逐星闪烁 */
    if (scene.userData.starMat) scene.userData.starMat.uniforms.uTime.value = t;
    /* 星云帆极缓自转 */
    if (scene.userData.nebulae) scene.userData.nebulae.forEach(function (n) { n.rotation.z += n.userData.spin * dt; });
    /* 浮尘缓漂 */
    if (scene.userData.dust) scene.userData.dust.rotation.y = t * 0.01;
    /* 中央圣火呼吸 */
    if (scene.userData.fireLight) scene.userData.fireLight.intensity = 2.5 + Math.sin(t * 2.0) * 0.3;

    /* 相机轨道平滑追踪 */
    orbitAngle += (targetAngle - orbitAngle) * 0.06;
    orbitDist += (targetDist - orbitDist) * 0.06;
    var camYT = focused >= 0 ? 4.2 : 6.0; /* 全景略俯瞰 / 聚焦平视 */
    var lookYT = 2.2;
    camYCur += (camYT - camYCur) * 0.06;
    lookYCur += (lookYT - lookYCur) * 0.06;
    camera.position.x = Math.cos(orbitAngle) * orbitDist;
    camera.position.z = Math.sin(orbitAngle) * orbitDist;
    camera.position.y = camYCur;
    camera.lookAt(
      Math.cos(orbitAngle) * gateRadius,
      lookYCur,
      Math.sin(orbitAngle) * gateRadius
    );

    /* Portal renderTarget pass */
    allGates.forEach(function (g) {
      if (!g.rt || !g.scene) return;
      if (g.scene.userData.animate) g.scene.userData.animate(dt, t);
      renderer.setRenderTarget(g.rt);
      renderer.render(g.scene, g.cam);
    });
    renderer.setRenderTarget(null);

    /* 觉醒粒子 + 门扇光脉冲 */
    allGates.forEach(function (g) {
      var target = g.awake ? 0.8 : 0;
      g.particles.material.opacity += (target - g.particles.material.opacity) * 0.05;
      g.particles.rotation.y = t * 0.3;
      var lightTarget = g.awake ? (2.0 + Math.sin(t * 3.0) * 0.4) : 0;
      g.gateLight.intensity += (lightTarget - g.gateLight.intensity) * 0.05;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  /* 调试把手（自动化走查用） */
  window.__QX3D_READY = true;
  window.__focusGate = focusGate;

  /* ===== 拾 · resize ===== */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
