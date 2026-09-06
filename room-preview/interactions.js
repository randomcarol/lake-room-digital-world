/* Public interaction orchestration: no editing, localStorage or navigation away. */
window.Interactions = (()=>{
 function init(app,content){
  const abort=new AbortController(), signal=abort.signal;
  const root=document.getElementById('experience'),body=document.getElementById('experience-content'),back=document.getElementById('return-room');
  let cleanup=()=>{},lastFocus=null;
  const controller=new CameraController(app,type=>{
    root.hidden=false;root.classList.remove('leaving');
    cleanup=Experiences.open(type,body,content,app);
    (body.querySelector('button,a,input')||back).focus();
  },()=>{root.classList.add('leaving');cleanup();cleanup=()=>{};});
  const labels={monitor:'查看我的简历',notebook:'翻开手记',turntable:'听一张唱片',map:'探索旅行足迹',photoWall:'看看我的记忆',books:'浏览书架'};
  function activate(type){if(controller.start(type)){lastFocus=document.activeElement;back.hidden=false;document.getElementById('bubbles').inert=true;}}
  const bubbles=Object.entries(labels).map(([type,label])=>new InteractionBubble(document.getElementById('bubbles'),app,type,label,()=>activate(type)));
  let frame=0;
  const off=app.onFrame(dt=>{frame+=dt;if(frame>.08){bubbles.forEach(b=>b.update());
    // Resolve label overlaps in screen space, especially on narrow touch displays.
    const placed=[];
    bubbles.slice().sort((a,b)=>parseFloat(a.button.style.top)-parseFloat(b.button.style.top)).forEach(b=>{
      const el=b.button;if(el.hidden)return;
      let r=el.getBoundingClientRect(),top=parseFloat(el.style.top);
      for(let attempt=0;attempt<8;attempt++){
        const overlap=placed.find(p=>r.left<p.right+7&&r.right>p.left-7&&r.top<p.bottom+7&&r.bottom>p.top-7);
        if(!overlap)break;
        const offset=overlap.bottom-r.top+8;top+=offset;
        el.style.top=Math.min(innerHeight-60,top)+'px';r=el.getBoundingClientRect();
      }
      placed.push(r);
    });frame=0;}if(controller.phase==='return')root.hidden=true;});
  document.addEventListener('room-overview',()=>{back.hidden=true;root.hidden=true;document.getElementById('bubbles').inert=false;if(lastFocus)lastFocus.focus();},{signal});
  back.addEventListener('click',()=>controller.close(),{signal});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape') {if(body.querySelector('.expanded-page')){body.querySelector('.expanded-page').remove();return;}controller.close();}
    if(e.key==='Tab'&&controller.phase!=='overview'){
      const focusables=[back,...body.querySelectorAll('button:not(:disabled),a[href],input,iframe')].filter(x=>!x.hidden&&x.getClientRects().length);
      const index=focusables.indexOf(document.activeElement);
      if(e.shiftKey&&index<=0){e.preventDefault();focusables.at(-1).focus();}else if(!e.shiftKey&&(index===focusables.length-1||index===-1)){e.preventDefault();focusables[0].focus();}
    }
  },{signal});
  document.getElementById('day-night').addEventListener('click',e=>{app.environment.setNight(!app.environment.isNight);document.body.dataset.theme=app.environment.isNight?'night':'day';e.currentTarget.textContent=app.environment.isNight?'☾ Night':'☀ Day';e.currentTarget.setAttribute('aria-pressed',String(app.environment.isNight));},{signal});
  const ray=new THREE.Raycaster(),point=new THREE.Vector2();let down=null;
  app.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};},{signal});
  app.renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||down.id!==e.pointerId)return;
    const moved=Math.hypot(down.x-e.clientX,down.y-e.clientY);down=null;
    if(moved>7||controller.phase!=='overview')return;
    const r=app.renderer.domElement.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(point,app.camera);
    const hit=ray.intersectObjects(Object.values(app.hits),false)[0];if(hit)activate(hit.object.userData.action);
  },{signal});
  app.renderer.domElement.addEventListener('pointercancel',()=>down=null,{signal});
  // Pins use normalized image coordinates: x left→right, y top→bottom.
  content.travelPins.forEach(p=>{
    const pin=new THREE.Mesh(new THREE.SphereGeometry(.032,10,8),new THREE.MeshStandardMaterial({color:'#bd6346',emissive:'#7d311b',emissiveIntensity:.25}));
    pin.position.set(.035,(.5-p.y)*1.25,(.5-p.x)*2.2);pin.userData.action='map';app.mapGroup.add(pin);
  });
  if(ContentStore.url(content.map?.image))new THREE.TextureLoader().load(ContentStore.url(content.map.image),t=>{t.encoding=THREE.sRGBEncoding;app.mapMesh.material.map=t;app.mapMesh.material.needsUpdate=true;},undefined,()=>{});
  content.photos.forEach((photo,i)=>{const mesh=app.photoMeshes.find(m=>m.userData.photoId===photo.id)||app.photoMeshes[i];if(mesh&&ContentStore.url(photo.src))new THREE.TextureLoader().load(ContentStore.url(photo.src),t=>{t.encoding=THREE.sRGBEncoding;mesh.material.map=t;mesh.material.color.set('#ffffff');mesh.material.needsUpdate=true;},undefined,()=>{});});
  const aliases={resume:'monitor',music:'turntable',photos:'photoWall',notebook:'notebook',map:'map',books:'books'};
  const requested=aliases[location.hash.slice(1).split(':')[0]];if(requested)activate(requested);
  window.__ROOM_INTERACTIONS__={controller,activate};
  window.addEventListener('pagehide',()=>{cleanup();off();controller.dispose();bubbles.forEach(b=>b.dispose());abort.abort();app.dispose();},{once:true});
 }
 return {init};
})();
