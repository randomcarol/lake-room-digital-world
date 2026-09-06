/* interactions.js — 房间交互层
 * 用法: Interactions.init(app)  (app 为 RoomBuilder.build 的返回值)
 * 数据: content.json + localStorage(照片/图钉/音乐配置)
 */
window.Interactions = (function(){

  var app, content, raycaster, pointer;
  var playerRoot = null;
  var hotspotRoot = null;
  var hotspotMap = {};
  var lastActivationAt = 0;
  var store = {
    get: function(k, d){ try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e){ return d; } },
    set: function(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ alert('存储空间不足,数据可能没有保存成功'); } }
  };

  function injectDOM(){
    var style = document.createElement('style');
    style.textContent = [
      '#ix-overlay{position:fixed;inset:0;background:rgba(40,32,24,.45);z-index:10;display:none;}',
      '#ix-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);background:#faf6ee;border-radius:14px;',
      '  box-shadow:0 12px 48px rgba(40,30,20,.35);z-index:11;display:none;max-width:min(680px,92vw);max-height:86vh;',
      '  overflow:auto;padding:22px 24px;color:#4a3d31;font-size:14px;}',
      '#ix-modal .ix-close{position:absolute;right:14px;top:12px;border:none;background:none;font-size:20px;cursor:pointer;color:#9a8a78;}',
      '#ix-player{position:fixed;right:18px;bottom:18px;width:min(360px,calc(100vw - 36px));background:rgba(255,248,239,.96);',
      '  border:1px solid rgba(197,170,143,.75);border-radius:18px;box-shadow:0 16px 42px rgba(70,50,34,.24);z-index:12;display:none;overflow:hidden;}',
      '#ix-player .hd{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px;color:#4a3d31;font-size:13px;gap:10px;}',
      '#ix-player .meta{display:flex;flex-direction:column;gap:4px;}',
      '#ix-player .meta strong{font-size:14px;}',
      '#ix-player .meta span{color:#8d7968;font-size:12px;}',
      '#ix-player .btns{display:flex;align-items:center;gap:8px;flex:none;}',
      '#ix-player button{border:none;border-radius:999px;background:#ead8c2;color:#4a3d31;padding:7px 11px;font-size:12px;cursor:pointer;}',
      '#ix-player iframe{display:block;width:100%;height:110px;border:0;background:#fff;}',
      '#ix-hotspots{position:fixed;inset:0;z-index:13;pointer-events:none;}',
      '.ix-hotspot{position:fixed;pointer-events:auto;background:transparent;border:none;padding:0;margin:0;cursor:pointer;}',
      '.ix-hotspot::after{content:attr(data-hint);position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%) translateY(4px);opacity:0;pointer-events:none;white-space:nowrap;background:rgba(49,39,31,.94);color:#fff7ea;border:1px solid rgba(255,224,185,.45);border-radius:10px;padding:8px 11px;font:12px/1.35 -apple-system,"PingFang SC",sans-serif;box-shadow:0 8px 24px rgba(40,30,20,.25);transition:opacity .16s ease,transform .16s ease;}',
      '.ix-hotspot:hover::after,.ix-hotspot:focus-visible::after{opacity:1;transform:translateX(-50%) translateY(0);}',
      '.ix-hotspot:focus-visible{outline:1px dashed rgba(255,217,160,.8);outline-offset:3px;}'
    ].join('\n');
    document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.id = 'ix-overlay';
    var md = document.createElement('div');
    md.id = 'ix-modal';
    playerRoot = document.createElement('div');
    playerRoot.id = 'ix-player';
    playerRoot.innerHTML = '<div class="hd"><div class="meta"><strong>唱片机</strong><span>点击房间里的唱片机切歌</span></div><div class="btns"><button type="button" data-act="open">音乐页</button><button type="button" data-act="close">收起</button></div></div><iframe title="网易云播放器" allow="autoplay"></iframe>';
    hotspotRoot = document.createElement('div');
    hotspotRoot.id = 'ix-hotspots';

    document.body.appendChild(ov);
    document.body.appendChild(md);
    document.body.appendChild(playerRoot);
    document.body.appendChild(hotspotRoot);

    ov.addEventListener('click', closeModal);
    playerRoot.addEventListener('click', function(e){
      var act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
      if (act === 'close') hideMusicPlayer();
      else if (act === 'open') location.href = './portal.html#music';
    });
    if (document.body){
      document.body.dataset.roomLastAction = '';
      document.body.dataset.roomLastHit = '';
      document.body.dataset.roomLastPointer = '';
    }
  }

  function writeDebugData(key, value){
    if (!document.body) return;
    document.body.dataset[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }

  function closeModal(){
    var md = document.getElementById('ix-modal');
    var ov = document.getElementById('ix-overlay');
    if (md) md.style.display = 'none';
    if (ov) ov.style.display = 'none';
    if (app) app.controls.enabled = true;
  }

  function applyPhotoToMesh(photoId, dataUrl){
    (app.photoMeshes || []).forEach(function(m){
      if (m.userData.photoId === photoId){
        var img = new Image();
        img.onload = function(){
          var t = new THREE.Texture(img);
          t.needsUpdate = true;
          t.encoding = THREE.sRGBEncoding;
          m.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 });
        };
        img.src = dataUrl;
      }
    });
  }

  function openPhoto(photoId){
    location.href = './portal.html#photo:' + encodeURIComponent(photoId);
  }
  function openPhotoWall(){
    location.href = './portal.html#photos';
  }
  function openNotebook(){
    location.href = './portal.html#notebook';
  }
  function openResume(){
    location.href = './portal.html#resume';
  }
  function openMap(){
    location.href = './portal.html#map';
  }
  function openBooks(){
    location.href = './portal.html#books';
  }

  function normalizeTrackList(raw){
    if (Array.isArray(raw)){
      return raw.map(function(v){ return String(v).trim(); }).filter(Boolean);
    }
    if (typeof raw === 'string'){
      return raw.split(/[\s,，|]+/).map(function(v){ return v.trim(); }).filter(Boolean);
    }
    return [];
  }

  function getMusicConfig(){
    var base = content && content.music ? content.music : ((window.__ROOM_CONTENT__ && window.__ROOM_CONTENT__.music) || {});
    var conf = store.get('music.v2', null) || store.get('music.v1', null) || base || {};
    var currentIndex = parseInt(conf.currentIndex, 10);
    if (!isFinite(currentIndex)) currentIndex = -1;
    return {
      playlistId: (conf.playlistId || base.playlistId || '').trim(),
      tracks: normalizeTrackList(conf.tracks || conf.trackIds || conf.songIds || base.tracks || base.trackIds || base.songIds || ''),
      currentIndex: currentIndex
    };
  }

  function saveMusicConfig(conf){
    store.set('music.v2', {
      playlistId: conf.playlistId || '',
      tracks: conf.tracks || [],
      currentIndex: isFinite(conf.currentIndex) ? conf.currentIndex : -1
    });
  }

  function hideMusicPlayer(){
    if (playerRoot) playerRoot.style.display = 'none';
  }

  function showMusicPlayer(trackId, index, total){
    if (!playerRoot) return;
    playerRoot.querySelector('.meta span').textContent = '第 ' + (index + 1) + ' 首 / 共 ' + total + ' 首';
    playerRoot.querySelector('iframe').src = 'https://music.163.com/outchain/player?type=2&id=' + encodeURIComponent(trackId) + '&auto=1&height=90';
    playerRoot.style.display = 'block';
  }

  function openMusic(){
    var conf = getMusicConfig();
    if (!conf.tracks.length){
      location.href = './portal.html#music';
      return;
    }
    conf.currentIndex = (conf.currentIndex + 1 + conf.tracks.length) % conf.tracks.length;
    saveMusicConfig(conf);
    showMusicPlayer(conf.tracks[conf.currentIndex], conf.currentIndex, conf.tracks.length);
  }

  function findAction(obj){
    while (obj){
      if (obj.userData){
        if (obj.userData.photoId) return { type: 'photo', id: obj.userData.photoId };
        if (obj.userData.action) return { type: obj.userData.action };
      }
      obj = obj.parent;
    }
    return null;
  }

  function describeHit(hit){
    if (!hit || !hit.object) return null;
    return {
      objectName: hit.object.name || '',
      objectType: hit.object.type || '',
      userData: hit.object.userData || {},
      action: findAction(hit.object)
    };
  }

  function getInteractiveRects(){
    if (!app || !app.camera || !app.renderer) return [];
    var rect = app.renderer.domElement.getBoundingClientRect();
    var camera = app.camera;
    var targets = [
      { type: 'monitor', object: app.hits && app.hits.monitor },
      { type: 'map', object: app.hits && app.hits.map },
      { type: 'photoWall', object: app.hits && app.hits.photoWall },
      { type: 'turntable', object: app.hits && app.hits.turntable },
      { type: 'notebook', object: app.hits && app.hits.notebook },
      { type: 'books', object: app.hits && app.hits.books }
    ];
    return targets.map(function(entry){
      if (!entry.object) return null;
      var box = new THREE.Box3().setFromObject(entry.object);
      if (box.isEmpty()) return null;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      var pts = [
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z)
      ];
      var visible = false;
      pts.forEach(function(p){
        p.project(camera);
        if (p.z > -1.2 && p.z < 1.2) visible = true;
        var sx = rect.left + (p.x * 0.5 + 0.5) * rect.width;
        var sy = rect.top + (-p.y * 0.5 + 0.5) * rect.height;
        minX = Math.min(minX, sx);
        minY = Math.min(minY, sy);
        maxX = Math.max(maxX, sx);
        maxY = Math.max(maxY, sy);
      });
      if (!visible || !isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) return null;
      return {
        type: entry.type,
        left: minX - 14,
        top: minY - 14,
        right: maxX + 14,
        bottom: maxY + 14,
        area: Math.max(1, (maxX - minX) * (maxY - minY))
      };
    }).filter(Boolean);
  }

  function ensureHotspot(type){
    if (!hotspotRoot) return null;
    if (hotspotMap[type]) return hotspotMap[type];
    var btn = document.createElement('button');
    btn.className = 'ix-hotspot';
    btn.type = 'button';
    var hints = {
      monitor: '点击查看 Resume / 简历',
      photoWall: '点击查看 Photos / 照片墙',
      map: '点击查看 Map / 足迹地图',
      turntable: '点击切换网易云歌曲',
      books: '点击查看 Books / 书架',
      notebook: '点击查看 Notebook / 本子'
    };
    btn.setAttribute('aria-label', hints[type] || type);
    btn.setAttribute('data-hint', hints[type] || '点击查看');
    btn.title = hints[type] || '点击查看';
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      runAction({ type: type, via: 'hotspot' });
    });
    hotspotRoot.appendChild(btn);
    hotspotMap[type] = btn;
    return btn;
  }

  function syncHotspots(){
    if (!hotspotRoot) return;
    var seen = {};
    getInteractiveRects().forEach(function(item){
      var btn = ensureHotspot(item.type);
      if (!btn) return;
      seen[item.type] = true;
      btn.style.display = 'block';
      btn.style.left = item.left + 'px';
      btn.style.top = item.top + 'px';
      btn.style.width = Math.max(24, item.right - item.left) + 'px';
      btn.style.height = Math.max(24, item.bottom - item.top) + 'px';
      // 重叠时让更小、更具体的物件热区优先响应。
      btn.style.zIndex = String(Math.max(1, Math.round(100000 - item.area / 10)));
    });
    Object.keys(hotspotMap).forEach(function(type){
      if (!seen[type]) hotspotMap[type].style.display = 'none';
    });
  }

  function fallbackActionAt(e){
    var matches = getInteractiveRects().filter(function(item){
      return e.clientX >= item.left && e.clientX <= item.right && e.clientY >= item.top && e.clientY <= item.bottom;
    });
    if (!matches.length) return null;
    matches.sort(function(a, b){ return a.area - b.area; });
    return { type: matches[0].type, via: 'projected' };
  }

  function castAt(e){
    var rect = app.renderer.domElement.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, app.camera);
    var hits = raycaster.intersectObjects(app.scene.children, true);
    var sampled = [];
    for (var i = 0; i < hits.length; i++){
      if (sampled.length < 5) sampled.push(describeHit(hits[i]));
      var action = findAction(hits[i].object);
      if (action){
        window.__ROOM_LAST_HIT__ = {
          clientX: e.clientX,
          clientY: e.clientY,
          action: action,
          hits: sampled
        };
        writeDebugData('roomLastHit', window.__ROOM_LAST_HIT__);
        return action;
      }
    }
    window.__ROOM_LAST_HIT__ = {
      clientX: e.clientX,
      clientY: e.clientY,
      action: null,
      hits: sampled
    };
    writeDebugData('roomLastHit', window.__ROOM_LAST_HIT__);
    return fallbackActionAt(e);
  }

  function runAction(action){
    if (!action) return;
    lastActivationAt = Date.now();
    window.__ROOM_LAST_ACTION__ = action;
    writeDebugData('roomLastAction', action);
    if (action.type === 'photo') openPhoto(action.id);
    else if (action.type === 'photoWall') openPhotoWall();
    else if (action.type === 'monitor') openResume();
    else if (action.type === 'map') openMap();
    else if (action.type === 'books') openBooks();
    else if (action.type === 'turntable') openMusic();
    else if (action.type === 'notebook') openNotebook();
  }

  function bindPointer(){
    var el = app.renderer.domElement;
    var down = null;
    el.style.touchAction = 'none';

    function insideCanvas(x, y){
      var rect = el.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    function maybeActivate(e){
      if (!down) return;
      var dx = e.clientX - down.x;
      var dy = e.clientY - down.y;
      var moved = Math.sqrt(dx * dx + dy * dy);
      var longPress = Date.now() - down.time > 500;
      var allow = moved <= 8 && !longPress && (insideCanvas(down.x, down.y) || insideCanvas(e.clientX, e.clientY));
      window.__ROOM_LAST_POINTER__ = {
        down: { x: down.x, y: down.y, time: down.time },
        up: { x: e.clientX, y: e.clientY },
        moved: moved,
        longPress: longPress,
        allow: allow
      };
      writeDebugData('roomLastPointer', window.__ROOM_LAST_POINTER__);
      if (allow) runAction(castAt(e));
      down = null;
    }

    el.addEventListener('pointerdown', function(e){
      down = { x: e.clientX, y: e.clientY, time: Date.now() };
    });
    window.addEventListener('pointerup', maybeActivate);
    window.addEventListener('pointercancel', function(){ down = null; });

    el.addEventListener('click', function(e){
      if (Date.now() - lastActivationAt < 280) return;
      if (!insideCanvas(e.clientX, e.clientY)) return;
      runAction(castAt(e));
    });

    var lastHover = 0;
    el.addEventListener('pointermove', function(e){
      var now = Date.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      el.style.cursor = castAt(e) ? 'pointer' : '';
    });
    setInterval(syncHotspots, 120);
  }

  function init(theApp){
    app = theApp;
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    injectDOM();
    bindPointer();

    var data = store.get('photoWall.v1', {});
    for (var id in data){
      if (data[id] && data[id].img) applyPhotoToMesh(id, data[id].img);
    }

    content = { resume: {}, books: [], music: {} };
    fetch('content.json').then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
      if (j){
        content = j;
        window.__ROOM_CONTENT__ = j;
      }
    }).catch(function(){});

    window.__ROOM_LAST_HIT__ = null;
    window.__ROOM_LAST_ACTION__ = null;
    window.__ROOM_LAST_POINTER__ = null;
    window.__ROOM_INTERACTIONS__ = {
      castAtClient: function(x, y){
        return castAt({ clientX: x, clientY: y });
      },
      openMusic: openMusic,
      getMusicConfig: getMusicConfig
    };
  }

  return { init: init };
})();
