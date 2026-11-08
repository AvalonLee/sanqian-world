/* gate3d.js — 万界门环 · 三维世界选择器（用户拍板 C 方案 · portal renderTarget 双 pass）
 * 环形回廊 + N 扇世界之门（门内 = 设定卡驱动的活世界缩影，renderTarget 实时渲染）。
 * 交互：拖拽环视 → 点击走近门苏醒 → 推门白光 → 分流至世界入口。
 * 依赖：three.min.js（../games/qunxia3d/three.min.js 复用 vendored）+ world-registry.js。
 */
(function () {
  'use strict';

  /* ===== 0. 基础设施 ===== */
  var reg = window.WORLD_REGISTRY || [];
  var openWorlds = reg.filter(function (w) { return w.status === 'open'; });
  var allGates = []; /* { world, group, rt, scene, cam, awake, angle } */
  var focused = -1;

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('stage').appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1612);
  scene.fog = new THREE.FogExp2(0x1a1612, 0.025);

  var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 3.5, 12);

  /* ===== 1. 回廊建造 ===== */
  (function buildCorridor() {
    /* 地面：圆盘 */
    var floorGeo = new THREE.CircleGeometry(14, 48);
    var floorMat = new THREE.MeshLambertMaterial({ color: 0x2a2420 });
    var floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    /* 地面纹路（同心圆环） */
    var ringGeo = new THREE.RingGeometry(5, 5.15, 48);
    var ringMat = new THREE.MeshBasicMaterial({ color: 0x4a3f35, side: THREE.DoubleSide });
    var ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    scene.add(ring);

    var ring2Geo = new THREE.RingGeometry(9, 9.12, 48);
    var ring2 = new THREE.Mesh(ring2Geo, ringMat.clone());
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.02;
    scene.add(ring2);

    /* 石柱 ×8（环绕） */
    var pilGeo = new THREE.CylinderGeometry(0.35, 0.45, 6, 8);
    var pilMat = new THREE.MeshLambertMaterial({ color: 0x3a322a });
    for (var i = 0; i < 8; i++) {
      var ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
      var pil = new THREE.Mesh(pilGeo, pilMat);
      pil.position.set(Math.cos(ang) * 12, 3, Math.sin(ang) * 12);
      scene.add(pil);
    }

    /* 中央基座 */
    var pedGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.4, 12);
    var ped = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: 0x4a3f35 }));
    ped.position.y = 0.2;
    scene.add(ped);

    /* 灯光 */
    var amb = new THREE.AmbientLight(0x554a3a, 0.8);
    scene.add(amb);
    var key = new THREE.DirectionalLight(0xffeedd, 0.6);
    key.position.set(5, 10, 5);
    scene.add(key);
    /* 中央火盆光 */
    var fire = new THREE.PointLight(0xff8c3a, 1.2, 15);
    fire.position.set(0, 2.5, 0);
    scene.add(fire);
  })();

  /* ===== 2. 门内微缩世界建造器 ===== */

  /* 修仙云海（青焰灵山 + 金粒子 + 宝塔剪影） */
  function buildXianxianScene(world) {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0x0a1a18);
    sc.fog = new THREE.FogExp2(0x0a1a18, 0.06);
    var cam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    cam.position.set(0, 3, 10);
    cam.lookAt(0, 2, 0);

    /* 灵山尖 ×6（错落锥体） */
    var mat = new THREE.MeshLambertMaterial({ color: world.peak });
    for (var i = 0; i < 6; i++) {
      var h = 3 + Math.sin(i * 2.4) * 2 + 1.5;
      var geo = new THREE.ConeGeometry(1.2 + Math.sin(i * 1.7) * 0.5, h, 5);
      var m = new THREE.Mesh(geo, mat);
      m.position.set((i - 2.5) * 2.2, h / 2, -2 - Math.sin(i * 3.1) * 1.5);
      sc.add(m);
    }
    /* 中央宝塔（三段堆叠） */
    var pagodaMat = new THREE.MeshLambertMaterial({ color: 0x2a4a3a });
    [[1.0, 0.8, 1], [0.7, 0.6, 2.2], [0.4, 0.8, 3.2]].forEach(function (seg) {
      var t = new THREE.Mesh(new THREE.CylinderGeometry(seg[0] * 0.7, seg[0], seg[1], 4), pagodaMat);
      t.position.set(0, seg[2], 0);
      sc.add(t);
    });
    var roof = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.6, 4), new THREE.MeshLambertMaterial({ color: world.mist }));
    roof.position.set(0, 4.2, 0);
    sc.add(roof);

    /* 金色灵气粒子 */
    var pGeo = new THREE.BufferGeometry();
    var pos = [];
    for (var j = 0; j < 80; j++) {
      pos.push((Math.random() - 0.5) * 14, Math.random() * 7, (Math.random() - 0.5) * 8);
    }
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var pMat = new THREE.PointsMaterial({ color: world.particle, size: 0.08, transparent: true, opacity: 0.7 });
    var pts = new THREE.Points(pGeo, pMat);
    sc.add(pts);

    sc.userData.animate = function (dt, t) {
      pts.rotation.y = t * 0.08;
      /* 云雾缓漂 */
      sc.children.forEach(function (ch) {
        if (ch.userData.isCloud) {
          ch.position.x += dt * 0.3;
          if (ch.position.x > 8) ch.position.x = -8;
        }
      });
    };
    return { scene: sc, cam: cam };
  }

  /* 侠影山河（水墨地形 + 小建筑 + 河道线） */
  function buildWuxiaScene(world) {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0x1a1610);
    sc.fog = new THREE.FogExp2(0x1a1610, 0.05);
    var cam = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    cam.position.set(0, 4, 10);
    cam.lookAt(0, 1, 0);

    /* 低模地形（PlaneGeometry + 噪声位移） */
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

    /* 江湖小筑 ×3 */
    var bMat = new THREE.MeshLambertMaterial({ color: 0x3a3025 });
    [[-3, 0, -1], [2, 0, 1], [5, 0, -2]].forEach(function (p) {
      var b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), bMat);
      b.position.set(p[0], p[1], p[2]);
      sc.add(b);
      var roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 4), new THREE.MeshLambertMaterial({ color: 0x1a1410 }));
      roof.position.set(p[0], p[1] + 0.5, p[2]);
      sc.add(roof);
    });

    /* 暗金粒子 */
    var pGeo = new THREE.BufferGeometry();
    var pos = [];
    for (var j = 0; j < 60; j++) {
      pos.push((Math.random() - 0.5) * 14, Math.random() * 6, (Math.random() - 0.5) * 8);
    }
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    var pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: world.particle, size: 0.06, transparent: true, opacity: 0.5 }));
    sc.add(pts);

    sc.userData.animate = function (dt, t) {
      pts.rotation.y = t * 0.05;
    };
    return { scene: sc, cam: cam };
  }

  /* ===== 3. 门扇建造 ===== */
  function makeTextTexture(text, color) {
    var cnv = document.createElement('canvas');
    cnv.width = 128; cnv.height = 128;
    var ctx = cnv.getContext('2d');
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = color || '#c4a44a';
    ctx.font = 'bold 80px KaiTi, STKaiti, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 68);
    var tex = new THREE.CanvasTexture(cnv);
    return tex;
  }

  function makePlaqueTexture(name, seq) {
    var cnv = document.createElement('canvas');
    cnv.width = 256; cnv.height = 64;
    var ctx = cnv.getContext('2d');
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = '#c4a44a';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.fillStyle = '#c4a44a';
    ctx.font = 'bold 28px KaiTi, STKaiti, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(seq + ' · ' + name, 128, 34);
    return new THREE.CanvasTexture(cnv);
  }

  /* ===== 4. 构建所有门扇 ===== */
  var gateAngleStep = Math.PI * 2 / Math.max(reg.length, 3);
  var gateRadius = 8;

  reg.forEach(function (world, idx) {
    var ang = -Math.PI / 2 + idx * gateAngleStep; /* 第一扇正前方 */
    var gx = Math.cos(ang) * gateRadius;
    var gz = Math.sin(ang) * gateRadius;

    var group = new THREE.Group();
    group.position.set(gx, 0, gz);
    group.lookAt(0, 0, 0); /* 面向中心 */

    /* 门框（两侧柱 + 横梁） */
    var frameMat = new THREE.MeshLambertMaterial({ color: 0x3a322a });
    var postGeo = new THREE.BoxGeometry(0.3, 4.5, 0.3);
    [-1.3, 1.3].forEach(function (ox) {
      var post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(ox, 2.25, 0);
      group.add(post);
    });
    var lintel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 0.3), frameMat);
    lintel.position.set(0, 4.5, 0);
    group.add(lintel);

    /* 门匾 */
    var plaqueTex = makePlaqueTexture(world.name, world.seq);
    var plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: plaqueTex }));
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
      /* coming：暗面 + ? 贴图 */
      doorMat = new THREE.MeshBasicMaterial({ map: makeTextTexture('？', '#444444'), transparent: true, opacity: 0.5 });
    }

    var door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.8), doorMat);
    door.position.set(0, 2.1, 0.05);
    door.userData.worldIndex = idx;
    group.add(door);

    /* 门扉粒子（awakening 时升起） */
    var pGeo = new THREE.BufferGeometry();
    var pp = [];
    for (var j = 0; j < 30; j++) {
      pp.push((Math.random() - 0.5) * 2.5, Math.random() * 4, (Math.random() - 0.5) * 0.5 + 0.3);
    }
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    var pMat = new THREE.PointsMaterial({
      color: world.particle, size: 0.12, transparent: true, opacity: 0
    });
    var gateParticles = new THREE.Points(pGeo, pMat);
    group.add(gateParticles);

    scene.add(group);

    allGates.push({
      world: world,
      group: group,
      door: door,
      rt: rt,
      scene: portalScene,
      cam: portalCam,
      particles: gateParticles,
      awake: false,
      angle: ang,
      plaque: plaque
    });
  });

  /* ===== 5. 交互 ===== */
  var orbitAngle = -Math.PI / 2; /* 初始面向第一扇 */
  var orbitDist = 10;
  var targetAngle = orbitAngle;
  var targetDist = orbitDist;
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
    /* 点击检测：raycaster */
    var mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    var ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    var hits = ray.intersectObjects(allGates.map(g => g.door));
    if (hits.length > 0) {
      var idx = hits[0].object.userData.worldIndex;
      if (allGates[idx].world.status === 'open') {
        focusGate(idx);
      }
    }
  });

  function focusGate(idx) {
    focused = idx;
    var g = allGates[idx];
    targetAngle = g.angle;
    targetDist = gateRadius - 3.5;
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

  /* ===== 6. DOM 按钮 ===== */
  document.getElementById('btn-back-main').addEventListener('click', function () {
    window.location.href = '../index.html';
  });

  /* ===== 7. 渲染循环 ===== */
  var clock = new THREE.Clock();
  function tick() {
    var dt = Math.min(clock.getDelta(), 0.1);
    var t = clock.getElapsedTime();

    /* 相机轨道平滑追踪 */
    orbitAngle += (targetAngle - orbitAngle) * 0.06;
    orbitDist += (targetDist - orbitDist) * 0.06;
    camera.position.x = Math.cos(orbitAngle) * orbitDist;
    camera.position.z = Math.sin(orbitAngle) * orbitDist;
    camera.position.y = 3.5 + (focused >= 0 ? 0.5 : 0);
    camera.lookAt(
      Math.cos(orbitAngle) * (orbitDist - 6),
      2,
      Math.sin(orbitAngle) * (orbitDist - 6)
    );

    /* Portal renderTarget pass */
    allGates.forEach(function (g) {
      if (!g.rt || !g.scene) return;
      if (g.scene.userData.animate) g.scene.userData.animate(dt, t);
      renderer.setRenderTarget(g.rt);
      renderer.render(g.scene, g.cam);
    });
    renderer.setRenderTarget(null);

    /* 觉醒粒子 */
    allGates.forEach(function (g) {
      var target = g.awake ? 0.8 : 0;
      g.particles.material.opacity += (target - g.particles.material.opacity) * 0.05;
      g.particles.rotation.y = t * 0.3;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
  /* 调试把手（自动化走查用） */
  window.__QX3D_READY = true;
  window.__focusGate = focusGate;

  /* ===== 8. resize ===== */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
