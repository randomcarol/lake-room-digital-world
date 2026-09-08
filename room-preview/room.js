/* room.js — 房间场景构建器(index.html 与 editor.html 共用)
 * 布局完全数据驱动:RoomBuilder.build(container, layout, opts)
 */
window.RoomBuilder = (function(){
  var ROOM_LAYOUT_VERSION = 3;

  var DEFAULT_LAYOUT = {
    version: ROOM_LAYOUT_VERSION,
    room: { w: 8.0, d: 6.7, h: 5.0 },
    items: {
      rug:      { x: 4.58067430501195, z: 2.5569610428068796, ry:  0,                  s: 1.8 },
      desk:     { x: 4.623387913772874, z: 2.1928204020321127, ry:  0,                  s: 1.2 },
      lounge:   { x: 4.792261792385548, z: 3.412002107091225,  ry: -2.531,              s: 1.1 },
      bike:     { x: 0.67,              z: 4.34,               ry: -1.658,              s: 1.35 },
      cabinet:  { x: 1.36, z: 1.17, ry: -Math.PI/2,    s: 1.65 },
      plant1:   { x: 7.28, z: 1.17, ry:  0.6,          s: 1.8 },
      plant2:   { x: 0.83, z: 0.34, ry:  1.9,          s: 1.2 },
      booksRow: { x: 3.160067951074799, z: 0.2,        ry: 0,  s: 1 }
    },
    wallItems: {
      map:       { y: 2.4906424342497173, z: 2.1779075810245603, s: 1.4 },
      photoWall: { y: 2.467020952539019,  z: 5.143569204133787,  s: 1.1 }
    }
  };

  var ITEM_NAMES = {
    rug:'地毯', desk:'书桌组合', lounge:'休闲椅', bike:'公路车',
    cabinet:'唱机柜组合', plant1:'盆栽 A', plant2:'盆栽 B(窗台)', booksRow:'窗台书排',
    map:'世界地图', photoWall:'照片墙'
  };

  var SILL_H = 0.75, SILL_D = 0.55;

  function deep(o){ return JSON.parse(JSON.stringify(o)); }

  function loadLayout(){
    return deep(DEFAULT_LAYOUT); // Public layout comes from the published source, never visitor storage.
  }
  function build(container, layout, opts){
    opts = opts || {};
    var ASSET_VERSION = '20260823-4';
    var RW = layout.room.w, RD = layout.room.d, RH = layout.room.h;
    var SILL_TOP = SILL_H + 0.035;
    var WIN_TOP = RH - 0.5;   // 窗户随房高加高

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xefe7d8); // 无天花/南墙,背景即"室外天色"
    var camera = new THREE.PerspectiveCamera(opts.fov || 68, container.clientWidth/container.clientHeight, 0.05, 420);
    var cp = opts.camPos || [5.6, 1.55, 4.8];
    camera.position.set(cp[0], cp[1], cp[2]);
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    var tp = opts.target || [3.4, 1.0, 2.3];
    controls.target.set(tp[0], tp[1], tp[2]);
    controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.minDistance = camera.aspect < .8 ? 10.5 : 7.6; controls.maxDistance = opts.maxDistance || 16;
    controls.enablePan = false;
    controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
    controls.minPolarAngle = 0.78; controls.maxPolarAngle = 1.42;
    controls.update();

    function onResize(){
      var previousNarrow = camera.aspect < .8;
      camera.aspect = container.clientWidth/container.clientHeight;
      var narrow = camera.aspect < .8;
      camera.fov = narrow ? 53 : 45;
      controls.minDistance = narrow ? 10.5 : 7.6;
      controls.maxDistance = narrow ? 25 : 16;
      if(controls.enabled && narrow !== previousNarrow){
        var preset = window.RoomQACameras && RoomQACameras[narrow ? 'mobile' : 'desktop'];
        if (preset) { camera.position.fromArray(preset.position); controls.target.fromArray(preset.target); }
        else { var offset = camera.position.clone().sub(controls.target).multiplyScalar(narrow ? 1.5 : 1/1.5); camera.position.copy(controls.target).add(offset); }
      }
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    addEventListener('resize', onResize);

    // ---------- 辅助 ----------
    function mat(c, r, m){ return new THREE.MeshStandardMaterial({ color: c, roughness: r==null?0.9:r, metalness: m||0 }); }
    function box(parent, w, h, d, material, x, y, z){
      var me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
      parent.add(me); return me;
    }
    function cyl(parent, rt, rb, h, material, x, y, z, seg){
      var me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg||20), material);
      me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
      parent.add(me); return me;
    }
    function canvasTex(w, h, draw){
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      draw(cv.getContext('2d'), w, h);
      var t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    }
    // 若 textures/ 下存在真实图片则替换(手动下载放入即可)
    function tryTexture(url, apply){
      var img = new Image();
      img.onload = function(){
        var t = new THREE.Texture(img);
        t.needsUpdate = true; t.encoding = THREE.sRGBEncoding;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        apply(t);
      };
      img.src = url + (url.indexOf('?') === -1 ? '?v=' : '&v=') + ASSET_VERSION;
    }
    function markAction(obj, action, extra){
      function assign(target){
        target.userData = target.userData || {};
        if (action) target.userData.action = action;
        if (extra) for (var k in extra) target.userData[k] = extra[k];
      }
      assign(obj);
      if (obj.traverse) obj.traverse(assign);
      return obj;
    }
    function hitBox(parent, w, h, d, x, y, z, action, extra){
      var hit = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
      );
      hit.position.set(x, y, z);
      parent.add(hit);
      return markAction(hit, action, extra);
    }
    function hitPlane(parent, w, h, x, y, z, ry, action, extra){
      var hit = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
      );
      hit.position.set(x, y, z);
      hit.rotation.y = ry || 0;
      parent.add(hit);
      return markAction(hit, action, extra);
    }

    // ---------- 灯光 ----------
    var hemisphere = new THREE.HemisphereLight(0xfff4e2, 0x8a7258, 0.7); scene.add(hemisphere);
    var sun = new THREE.DirectionalLight(0xffe2b8, 1.5);
    sun.position.set(RW*0.45, 4.5, -3.5);
    sun.target.position.set(RW*0.65, 0, RD*0.6);
    sun.castShadow = true;
    // SunRig owns the shared solar direction, shadow bounds and quality settings.
    scene.add(sun); scene.add(sun.target);
    var fill = new THREE.PointLight(0xffd9b0, 0.22, 14);
    fill.position.set(RW/2, 2.4, RD*0.6); scene.add(fill);

    // ---------- 地板 ----------
    var floorTex = canvasTex(512, 512, function(c, w, h){
      c.fillStyle = '#c99a68'; c.fillRect(0, 0, w, h);
      for (var r = 0; r < 8; r++){
        c.fillStyle = r % 2 ? '#c4936a' : '#ce9f6e';
        c.fillRect(0, r * 64, w, 64);
        c.fillStyle = 'rgba(120,80,50,.5)'; c.fillRect(0, r * 64, w, 2);
        for (var i = 0; i < 30; i++){
          c.fillStyle = 'rgba(140,95,60,' + (0.04 + Math.random() * 0.08) + ')';
          var y = r * 64 + Math.random() * 62;
          c.fillRect(Math.random() * w, y, 40 + Math.random() * 120, 1);
        }
      }
    });
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }));
    floor.rotation.x = -Math.PI/2; floor.position.set(RW/2, 0, RD/2);
    floor.receiveShadow = true; scene.add(floor);

    // ---------- 墙体(西/东/北三面 + 去掉天花与南墙,视野更开阔) ----------
    var wallMat = mat(0xf3e8d8, 0.95);
    var westWall = box(scene, 0.08, RH, RD, wallMat.clone(), -0.04, RH/2, RD/2);
    var northArchitecture = new THREE.Group(); scene.add(northArchitecture);
    // Open east elevation: a slim architectural beam keeps the room connected to the garden.
    box(scene, 0.10, 0.14, RD, wallMat, RW, RH, RD/2);
    box(northArchitecture, RW, SILL_H, 0.08, wallMat, RW/2, SILL_H/2, -0.04);
    box(northArchitecture, RW, RH-WIN_TOP, 0.08, wallMat, RW/2, (RH+WIN_TOP)/2, -0.04);
    var baseMat = mat(0xe2d3bd, 0.9);
    box(scene, 0.03, 0.09, RD, baseMat, 0.015, 0.045, RD/2);
    box(scene, 0.03, 0.09, RD, baseMat, RW-0.015, 0.045, RD/2);
    box(scene, RW, 0.09, 0.03, baseMat, RW/2, 0.045, RD-0.015);

    // ---------- 飘窗(白色细窗框,随房高加高) ----------
    var frameMat = mat(0xf5f2ea, 0.55, 0.1);
    box(northArchitecture, RW, SILL_H, SILL_D, mat(0xf0e4cf, 0.85), RW/2, SILL_H/2, SILL_D/2);
    box(northArchitecture, RW, 0.035, SILL_D+0.05, mat(0xd8b98c, 0.6), RW/2, SILL_H+0.017, 0.28);
    box(northArchitecture, RW, 0.045, 0.06, frameMat, RW/2, WIN_TOP-0.022, 0);
    box(northArchitecture, RW, 0.045, 0.06, frameMat, RW/2, SILL_H+0.022, 0);
    var paneN = 6;
    for (var wi = 0; wi <= paneN; wi++){
      var wx = -0.02 + (RW + 0.04) * wi / paneN;
      box(northArchitecture, 0.045, WIN_TOP-SILL_H, 0.06, frameMat, wx, (SILL_H+WIN_TOP)/2, 0);
    }
    // 中部一道横梁
    box(northArchitecture, RW, 0.04, 0.05, frameMat, RW/2, (SILL_H+WIN_TOP)/2, 0);
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(RW, WIN_TOP-SILL_H),
      new THREE.MeshStandardMaterial({ color: 0xd6ecf2, transparent: true, opacity: 0.1, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide }));
    glass.position.set(RW/2, (SILL_H+WIN_TOP)/2, -0.02);
    northArchitecture.add(glass);

    var environment = OutdoorEnvironment.create(scene, {sun: sun, fill: fill, hemisphere: hemisphere, renderer: renderer});
    // Outdoor tree and window shadows come from the shared directional light.

    // ---------- 西墙:世界地图(修复闪面:与相框错开 1cm;支持 textures/world-map.jpg 替换) ----------
    var CONTINENTS = [
      [[-168,66],[-150,70],[-135,69],[-120,72],[-100,73],[-85,69],[-75,68],[-68,58],[-60,52],[-65,45],[-72,41],[-74,39],[-77,34],[-80,31],[-80,25],[-83,23],[-86,21],[-90,21],[-93,18],[-96,16],[-93,13],[-88,13],[-83,9],[-79,8],[-81,13],[-87,16],[-91,19],[-97,23],[-101,25],[-105,28],[-110,29],[-114,31],[-117,34],[-121,37],[-124,43],[-124,48],[-130,55],[-135,58],[-145,60],[-152,58],[-158,56],[-165,60]],
      [[-79,8],[-75,11],[-71,12],[-64,11],[-60,8],[-52,5],[-50,0],[-44,-3],[-37,-6],[-35,-9],[-38,-15],[-40,-22],[-46,-26],[-52,-33],[-58,-38],[-62,-41],[-66,-47],[-68,-52],[-71,-54],[-73,-50],[-73,-44],[-73,-37],[-71,-30],[-70,-22],[-70,-15],[-75,-10],[-79,-5],[-81,-1],[-80,3]],
      [[-6,35],[3,37],[10,37],[11,34],[20,32],[30,32],[35,28],[39,21],[43,12],[48,11],[51,12],[46,5],[42,0],[40,-6],[36,-14],[33,-20],[35,-27],[31,-34],[25,-35],[19,-34],[15,-30],[12,-20],[13,-13],[10,-6],[6,4],[0,6],[-8,6],[-13,9],[-16,15],[-17,21],[-13,28],[-9,32]],
      [[-9,37],[-9,43],[-2,44],[-5,48],[-2,50],[3,52],[8,55],[10,58],[6,62],[10,64],[18,69],[28,71],[38,68],[48,68],[58,69],[68,72],[78,73],[88,74],[98,76],[108,74],[118,73],[128,72],[138,72],[148,70],[158,70],[168,66],[178,65],[178,62],[170,60],[162,58],[158,53],[152,50],[145,48],[140,42],[135,38],[129,34],[126,38],[121,38],[120,32],[122,28],[115,23],[110,21],[108,16],[106,10],[104,8],[100,8],[98,12],[94,17],[92,21],[88,22],[85,20],[80,13],[77,8],[75,15],[72,20],[66,25],[60,25],[56,27],[54,24],[50,28],[48,30],[44,29],[50,28],[56,26],[59,22],[55,17],[52,15],[48,14],[44,12],[42,15],[39,20],[35,28],[34,31],[36,36],[30,36],[27,37],[23,36],[19,40],[15,40],[12,44],[8,44],[3,42],[0,39],[-2,37],[-6,36]],
      [[-45,60],[-42,65],[-38,68],[-32,68],[-25,70],[-22,72],[-25,76],[-35,79],[-45,80],[-55,78],[-58,74],[-55,70],[-52,64]],
      [[113,-22],[114,-28],[115,-33],[118,-35],[124,-33],[129,-32],[132,-32],[135,-35],[138,-35],[140,-38],[146,-39],[150,-37],[153,-32],[153,-27],[150,-23],[146,-19],[142,-15],[142,-11],[137,-12],[135,-15],[132,-12],[130,-13],[126,-14],[122,-17],[118,-20]],
      [[-5,50],[-3,53],[-5,56],[-3,58],[-1,57],[0,53],[1,51]],
      [[130,31],[133,34],[137,35],[140,36],[141,39],[142,43],[144,44],[142,41],[139,38],[136,34],[132,33]],
      [[44,-16],[50,-16],[48,-25],[44,-23]],
      [[167,-45],[172,-41],[174,-37],[176,-38],[173,-42],[168,-46]],
      [[109,1],[114,3],[119,0],[117,-3],[112,-2]],
      [[95,5],[100,0],[106,-4],[104,-6],[99,-3]],
      [[131,-1],[136,-2],[141,-4],[146,-7],[143,-9],[137,-7],[132,-4]],
      [[-180,-70],[-120,-72],[-60,-70],[0,-71],[60,-68],[120,-70],[180,-70],[180,-90],[-180,-90]]
    ];
    var mapTex = canvasTex(1024, 560, function(c, w, h){
      c.fillStyle = '#a9c7d4'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1;
      for (var lon = -150; lon <= 150; lon += 30){
        c.beginPath(); c.moveTo((lon+180)/360*w, 0); c.lineTo((lon+180)/360*w, h); c.stroke();
      }
      for (var lat = -60; lat <= 60; lat += 30){
        c.beginPath(); c.moveTo(0, (90-lat)/180*h); c.lineTo(w, (90-lat)/180*h); c.stroke();
      }
      c.fillStyle = '#e0d3a8'; c.strokeStyle = '#a8905f'; c.lineWidth = 1.5;
      CONTINENTS.forEach(function(poly){
        c.beginPath();
        poly.forEach(function(p, i){
          var x = (p[0]+180)/360*w, y = (90-p[1])/180*h;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        });
        c.closePath(); c.fill(); c.stroke();
      });
      c.strokeStyle = 'rgba(180,90,60,.5)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(0, h/2); c.lineTo(w, h/2); c.stroke();
    });
    // 地图挂回西墙(书桌左边),在唱机柜上方;与照片墙同墙
    // mapGroup 以地图中心为轴心,交互层可整体缩放
    var items = {}, itemKinds = {};
    function registerItem(id, group, kind){
      group.userData.itemId = id;
      group.userData.itemKind = kind;
      scene.add(group);
      items[id] = group;
      itemKinds[id] = kind;
      return group;
    }
    function itemGroup(id){
      var it = layout.items[id];
      var g = new THREE.Group();
      g.position.set(it.x, 0, it.z);
      g.rotation.y = it.ry || 0;
      g.scale.setScalar(it.s || 1);
      return registerItem(id, g, 'floor');
    }
    function wallItemGroup(id, wallX){
      var it = layout.wallItems[id];
      var g = new THREE.Group();
      g.position.set(wallX, it.y, it.z);
      g.scale.setScalar(it.s || 1);
      g.userData.wallX = wallX;
      return registerItem(id, g, 'wall');
    }

    var mapGroup = wallItemGroup('map', 0.055);
    var mapMat = new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.9 });
    var mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.25), mapMat);
    mapMesh.rotation.y = Math.PI/2;
    mapMesh.receiveShadow = true;
    mapGroup.add(mapMesh);

    box(mapGroup, 0.03, 1.33, 2.28, mat(0x8a6a48, 0.6), -0.025, 0, 0);
    var mapHit = hitPlane(mapGroup, 2.5, 1.55, 0.08, 0, 0, Math.PI/2, 'map');
    var pinColors = [0xc1593f, 0xd9a441, 0x5b7fa6, 0xb53f52, 0x4f9e94];
    markAction(mapGroup, 'map');

    // ---------- 西墙:照片墙(仿 Zhihui:整齐网格排列的拍立得,微微倾斜) ----------
    // 每张照片都带 userData.photoId,供交互层点击放大/替换
    var photoCols = [0xc47a5a,0x7fa3c4,0x8fb87f,0xd4b06a,0xa88ac4,0xc46a7a,0x6aa8a0,0xd4886a,0x7a94b8,0x9ec48f,0xc9a0b0,0x6f94a8];
    var photoMeshes = [], photoGroups = [];
    var COLS = 4, ROWS = 3, CELL_W = 0.44, CELL_H = 0.52, PW = 0.36, PH = 0.44;
    var gridZ0 = 3.05, gridY0 = 2.0;
    var wallCenterZ = 3.71, wallCenterY = 1.48;
    var photoWallGroup = wallItemGroup('photoWall', 0.045);
    var photoWallHit = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS * CELL_W + 0.42, ROWS * CELL_H + 0.34),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    photoWallHit.rotation.y = Math.PI/2;
    photoWallHit.position.set(0.09, 0, 0);
    photoWallGroup.add(photoWallHit);
    markAction(photoWallHit, 'photoWall');
    for (var pi = 0; pi < COLS * ROWS; pi++){
      var col = pi % COLS, row = Math.floor(pi / COLS);
      var pz = gridZ0 + col * CELL_W + ((pi * 37) % 10) * 0.004;
      var py = gridY0 - row * CELL_H - ((pi * 53) % 10) * 0.004;
      var tilt = (((pi * 29) % 10) - 5) * 0.008;
      var pGroup = new THREE.Group();
      pGroup.position.set(pi * 0.0005, py - wallCenterY, pz - wallCenterZ);
      pGroup.rotation.y = Math.PI/2;
      pGroup.rotation.x = tilt;
      pGroup.userData.photoId = 'p' + pi;
      photoWallGroup.add(pGroup);
      box(pGroup, PW, PH, 0.006, mat(0xf8f4ea, 0.9), 0, 0, 0);
      var inner = box(pGroup, PW * 0.84, PH * 0.72, 0.002, mat(photoCols[pi % photoCols.length], 0.85), 0, PH * 0.06, 0.006);
      inner.receiveShadow = true;
      inner.userData.photoId = 'p' + pi;
      photoMeshes.push(inner);
      var pPin = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(pinColors[pi % 5], 0.4));
      pPin.position.set(0, PH/2 - 0.015, 0.008);
      pGroup.add(pPin);
      markAction(pGroup, null, { photoId: 'p' + pi });
      photoGroups.push(pGroup);
    }
    markAction(photoWallGroup, 'photoWall');

    // ================= GLTF 模型加载 =================
    THREE.Cache.enabled = true;
    var failed = [];
    var gltfLoader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader){
      var draco = new THREE.DRACOLoader();
      draco.setDecoderPath('./libs/draco/');
      gltfLoader.setDRACOLoader(draco);
    }
    var vinylDisc = null;
    var notebookCover = null;
    var notebookOpen = 0;
    var notebookFocused = false;

    function placeModel(parent, urls, opt){
      if (!Array.isArray(urls)) urls = [urls];
      if (!urls.length) { if (opt.fail) opt.fail(); return; }
      var url = urls[0];
      gltfLoader.load(url, function(g){
        var obj = g.scene;
        obj.traverse(function(n){ if (n.isMesh){ n.castShadow = true; n.receiveShadow = true; } });
        var b = new THREE.Box3().setFromObject(obj);
        var size = b.getSize(new THREE.Vector3());
        var s = 1;
        if (opt.h) s = opt.h / size.y;
        else if (opt.len) s = opt.len / Math.max(size.x, size.z);
        else if (opt.w) s = opt.w / Math.max(size.x, size.z);
        obj.scale.setScalar(s * (opt.extraScale || 1));
        if (opt.rx) obj.rotation.x = opt.rx;
        if (opt.rz) obj.rotation.z = opt.rz;
        obj.updateMatrixWorld(true);
        b.setFromObject(obj);
        var c = b.getCenter(new THREE.Vector3());
        obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b.min.y;
        var wrap = new THREE.Group();
        wrap.add(obj);
        wrap.position.set(opt.x || 0, opt.y || 0, opt.z || 0);
        if (opt.ry) wrap.rotation.y = opt.ry;
        parent.add(wrap);
        if (opt.done) opt.done(obj);
        renderer.shadowMap.needsUpdate = true;
      }, undefined, function(){
        if (urls.length > 1) placeModel(parent, urls.slice(1), opt);
        else if (opt.fail) opt.fail();
        else {
          failed.push(url);
          if (opts.onWarn) opts.onWarn(failed);
        }
      });
    }

    // ---- 地毯 ----
    var rugG = itemGroup('rug');
    var rug = cyl(rugG, 1, 1, 0.015, mat(0xe8ddcb, 1), 0, 0.008, 0, 40);
    rug.scale.set(1.3, 1, 0.95);
    var rugRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 40), mat(0xc9a06a, 1));
    rugRing.rotation.x = -Math.PI/2; rugRing.position.y = 0.017;
    rugRing.scale.set(1.3, 0.95, 1);
    rugG.add(rugRing);

    // ---- 书桌组合(面朝西墙地图;右侧为北窗) ----
    var deskG = itemGroup('desk');
    var dw = 1.9, dd = 0.85, dh = 0.75;
    var deskMat = mat(0xa9744f, 0.6);
    var metalLight = mat(0xd8d8d8, 0.25, 0.85);
    box(deskG, dw, 0.05, dd, deskMat, 0, dh-0.025, 0);
    box(deskG, 0.05, dh-0.05, dd*0.9, deskMat, -dw/2+0.06, (dh-0.05)/2, 0);
    box(deskG, 0.05, dh-0.05, dd*0.9, deskMat,  dw/2-0.06, (dh-0.05)/2, 0);
    // 显示器在桌面 -z 侧(旋转后朝西),屏幕面向椅子
    markAction(box(deskG, 0.56, 0.35, 0.025, mat(0x2b2f33, 0.4), -0.15, dh+0.32, -dd/2+0.16), 'monitor');
    var screenMesh = box(deskG, 0.5, 0.29, 0.005, new THREE.MeshStandardMaterial({ color: 0x35424e, roughness: 0.3, emissive: 0x1c2836, emissiveIntensity: 0.7 }), -0.15, dh+0.32, -dd/2+0.177);
    markAction(screenMesh, 'monitor');
    markAction(cyl(deskG, 0.025, 0.025, 0.16, mat(0x3a3f45, 0.5), -0.15, dh+0.08, -dd/2+0.16), 'monitor');
    markAction(box(deskG, 0.2, 0.015, 0.14, mat(0x3a3f45, 0.5), -0.15, dh+0.008, -dd/2+0.16), 'monitor');
    var monitorHit = hitBox(deskG, 0.92, 0.7, 0.42, -0.15, dh + 0.24, -dd/2 + 0.12, 'monitor');
    // 键盘:数据线朝显示器(局部 -z 方向)
    placeModel(deskG, 'models/mechanical-keyboard/model.gltf', { w: 0.36, x: -0.15, y: dh, z: 0.22, ry: 0 });
    // 台灯(加大):灯头朝向显示器/键盘(局部 -z 方向)
    placeModel(deskG, 'models/desk_lamp_arm_01/model.gltf', { h: 0.62, x: -0.75, y: dh, z: -0.2, ry: Math.PI });
    // 打开的活页本(显示器右下方,原水杯位);glTF 未就绪时用程序化本子占位
    placeModel(deskG, [], { w: 0.32, x: 0.4, y: dh, z: 0.25, ry: -0.3, done: function(obj){
      markAction(obj, 'notebook');
    }, fail: function(){
      var nb = new THREE.Group(); nb.position.set(0.4, dh, 0.25); nb.rotation.y = -0.3;
      var paper = mat(0xf6f1e4, 0.95), cover = mat(0x8a4a3a, 0.7);
      var left = box(nb, 0.15, 0.008, 0.21, paper, -0.075, 0.004, 0);
      left.rotation.z = 0.06;
      var right = box(nb, 0.15, 0.008, 0.21, paper, 0.075, 0.004, 0);
      right.rotation.z = -0.06;
      box(nb, 0.31, 0.004, 0.22, cover, 0, 0.001, 0);
      for (var ri = 0; ri < 6; ri++){
        cyl(nb, 0.008, 0.008, 0.02, metalLight, 0, 0.012, -0.085 + ri * 0.034, 8).rotation.x = Math.PI/2;
      }
      notebookCover = new THREE.Group(); notebookCover.position.y = .018;
      box(notebookCover, .15, .006, .22, cover, -.075, 0, 0);
      nb.add(notebookCover);
      markAction(nb, 'notebook');
      deskG.add(nb);
    }});
    var notebookHit = hitBox(deskG, 0.66, 0.14, 0.48, 0.4, dh + 0.05, 0.25, 'notebook');

    // ---- 休闲椅(阅读角) ----
    placeModel(itemGroup('lounge'), 'models/mid_century_lounge_chair/model.gltf', { w: 0.85, ry: 0 });

    // ---- 公路车(平放:两轮着地,车把朝南墙/窗户对面) ----
    placeModel(itemGroup('bike'), 'models/bike/model.gltf', { len: 1.8, ry: 0 });

    // ---- 唱机柜组合(现代木柜 + 黑胶唱机 + 红色胶囊咖啡机) ----
    var cabG = itemGroup('cabinet');
    cabG.userData.action = 'turntable';
    placeModel(cabG, 'models/modern_wooden_cabinet/model.gltf', { w: 1.2, ry: Math.PI/2 });
    placeModel(cabG, 'models/turntable/model.gltf', { w: 0.4, y: 0.334, z: -0.32, ry: Math.PI, done: function(obj){
      vinylDisc = obj.getObjectByName('disk') || null;
      markAction(obj, 'turntable');
    }});
    var turntableHit = hitBox(cabG, 1.15, 0.58, 0.96, 0, 0.42, -0.08, 'turntable');
    var cfG = new THREE.Group(); cfG.position.set(0, 0.334, 0.32); cabG.add(cfG);
    var red = mat(0xc0392b, 0.35), darkM = mat(0x22252a, 0.4), silver = metalLight;
    box(cfG, 0.3, 0.03, 0.16, darkM, 0, 0.015, 0);
    box(cfG, 0.12, 0.03, 0.1, silver, 0.06, 0.045, 0);
    box(cfG, 0.26, 0.2, 0.13, red, -0.02, 0.13, 0);
    box(cfG, 0.26, 0.05, 0.13, darkM, -0.02, 0.245, 0);
    box(cfG, 0.05, 0.14, 0.1, darkM, 0.1, 0.145, 0);
    var dial = cyl(cfG, 0.035, 0.035, 0.02, silver, 0.105, 0.19, 0, 24);
    dial.rotation.z = Math.PI/2;
    cyl(cfG, 0.03, 0.024, 0.07, new THREE.MeshStandardMaterial({ color: 0xf0e6d2, transparent: true, opacity: 0.55, roughness: 0.1 }), 0.06, 0.095, 0, 16);

    // ---- 盆栽 ----
    var p1 = itemGroup('plant1');
    placeModel(p1, 'models/potted_plant_01/model.gltf', { h: 0.9, ry: 0 });
    var p2 = itemGroup('plant2');
    p2.position.y = SILL_TOP;
    placeModel(p2, 'models/potted_plant_02/model.gltf', { h: 0.35, ry: 0 });

    // ---- 窗台书排(decorative_book_set_01 单排,书脊朝屋内;未就绪时百科全书兜底) ----
    var rowG = itemGroup('booksRow');
    rowG.position.y = SILL_TOP;
    rowG.userData.action = 'books';
    var booksHit = hitBox(rowG, 4.6, 0.72, 0.56, 0, 0.28, 0, 'books');
    placeModel(rowG, [], {
      w: 4.0, x: 0, z: 0, ry: 0, done: function(obj){
        markAction(obj, 'books');
      }, fail: function(){
        // decorative_book_set_01 的真实封面贴图(从官方 blend 包提取),贴在书体上,书脊朝屋内(+z)
        // 尺寸放大 1.5 倍,书排总宽约 4m,摆满半个窗台
        var COVERS = 12, HALF_ROW = 2.0;
        var bx = -HALF_ROW, bi = 0;
        while (bi < 200){
          var bw = (0.045 + (bi % 3) * 0.012) * 1.5;
          if (bx + bw > HALF_ROW) break;
          (function(i, bx0, bw0){
            var bh = (0.24 + (i % 4) * 0.03) * 1.5, bd = 0.17 * 1.5;
            var book = new THREE.Mesh(new THREE.BoxGeometry(bw0, bh, bd),
              new THREE.MeshStandardMaterial({ color: 0xf0ead8, roughness: 0.85 }));
            book.position.set(bx0 + bw0/2, bh/2, 0);
            book.castShadow = book.receiveShadow = true;
            book.userData.action = 'books';
            rowG.add(book);
            new THREE.TextureLoader().load('textures/books/cover_' + (i % COVERS) + '.jpg', function(t){
              t.encoding = THREE.sRGBEncoding;
              t.anisotropy = renderer.capabilities.getMaxAnisotropy();
              // 封面贴在朝屋内的一面(+z),即书脊/封面临窗排布时可见的一面
              var mats = [
                mat(0x8a7a66, 0.85), mat(0x8a7a66, 0.85),
                mat(0xf0ead8, 0.9), mat(0xf0ead8, 0.9),
                new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }),
                mat(0x6a5a48, 0.85)
              ];
              book.material = mats;
            }, undefined, function(){});
          })(bi, bx, bw);
          bx += bw + 0.015;
          bi++;
        }
      }
    });

    // ---------- 统一物件反馈：暖色轮廓、按下脉冲与原有镜头靠近 ----------
    var hits = {map:mapHit,photoWall:photoWallHit,monitor:monitorHit,notebook:notebookHit,turntable:turntableHit,books:booksHit};
    var feedback = {}, hoveredType = null, feedbackPulse = 0;
    Object.keys(hits).forEach(function(type){
      var helper = new THREE.BoxHelper(hits[type], 0xffd58b);
      helper.material.transparent = true; helper.material.opacity = 0; helper.material.depthTest = false;
      helper.renderOrder = 20; helper.visible = false; scene.add(helper); feedback[type] = helper;
    });

    // ---------- 动画循环 ----------
    var clock = new THREE.Clock();
    var updates = new Set();
    var musicPlaying = false;
    var alive = true;
    (function tick(){
      if (!alive) return;
      requestAnimationFrame(tick);
      var dt = clock.getDelta();
      var t = clock.elapsedTime;
      if (vinylDisc && musicPlaying) vinylDisc.rotation.y += dt * 1.5;
      environment.update(dt, t);
      feedbackPulse = Math.max(0, feedbackPulse-dt);
      Object.keys(feedback).forEach(function(type){
        var helper=feedback[type],active=type===hoveredType;
        helper.visible=active;
        if(active){helper.update();helper.material.opacity=.52+Math.sin(t*3.1)*.14+(feedbackPulse>0?.22:0);helper.scale.setScalar(1+(feedbackPulse>0?Math.sin(feedbackPulse*22)*.018:0));}
      });
      // Full orbit stays outside the room footprint. Cut away the obstructing facade from its exterior.
      westWall.visible = camera.position.x > .12;
      mapGroup.visible = photoWallGroup.visible = westWall.visible;
      northArchitecture.visible = camera.position.z > .12;
      notebookOpen += ((notebookFocused ? 1 : 0)-notebookOpen)*(1-Math.exp(-dt*3));
      if(notebookCover) notebookCover.rotation.z = -Math.PI*(1-notebookOpen);
      updates.forEach(function(update){ update(Math.min(dt, 0.25), t); });
      if (controls.enabled) { controls.dampingFactor = 1-Math.exp(-5*Math.min(dt,.25)); controls.update(); }
      renderer.render(scene, camera);
    })();

    return {
      environment: environment,
      onFrame: function(fn){ updates.add(fn); return function(){ updates.delete(fn); }; },
      setHovered: function(type){ hoveredType=type&&hits[type]?type:null; },
      pressFeedback: function(type){ if(hits[type]){hoveredType=type;feedbackPulse=.36;} },
      focusNotebook: function(value){ notebookFocused=value; },
      setMusicPlaying: function(value){ musicPlaying = value; },
      scene: scene, camera: camera, renderer: renderer, controls: controls,
      items: items, layout: layout, photoMeshes: photoMeshes, photoGroups: photoGroups,
      itemKinds: itemKinds, mapMesh: mapMesh, mapGroup: mapGroup, mapTex: mapTex,
      photoWallGroup: photoWallGroup,
      hits: hits,
      dispose: function(){
        alive = false;
        removeEventListener('resize', onResize);
        updates.clear();
        environment.dispose();
        controls.dispose();
        if (draco) draco.dispose();
        var disposed = new Set();
        scene.traverse(function(o){
          if(o.geometry && !disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}
          (Array.isArray(o.material)?o.material:[o.material]).filter(Boolean).forEach(function(m){
            if(disposed.has(m))return; disposed.add(m);
            Object.keys(m).forEach(function(k){if(m[k] && m[k].isTexture && !disposed.has(m[k])){disposed.add(m[k]);m[k].dispose();}}); m.dispose();
          });
        });
        renderer.dispose();
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }

  return {
    DEFAULT_LAYOUT: DEFAULT_LAYOUT,
    ITEM_NAMES: ITEM_NAMES,
    SILL_TOP: SILL_H + 0.035,
    loadLayout: loadLayout,
    deep: deep,
    build: build
  };
})();
