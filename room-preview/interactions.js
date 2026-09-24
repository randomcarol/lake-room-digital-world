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
  function activate(type){if(controller.start(type)){app.pressFeedback(type);app.setHovered(null);lastFocus=document.activeElement;back.hidden=false;document.getElementById('bubbles').inert=true;}}
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
  const dayButton=document.getElementById('day-night'),timeSelect=document.getElementById('world-time');
  function syncWorldUI(){document.body.dataset.theme=app.environment.isNight?'night':'day';dayButton.textContent=app.environment.isNight?'☾ Night':'☀ Day';dayButton.setAttribute('aria-pressed',String(app.environment.isNight));timeSelect.value=app.environment.state.mode;}
  dayButton.addEventListener('click',()=>{app.environment.setNight(!app.environment.isNight);syncWorldUI();},{signal});
  timeSelect.addEventListener('change',()=>{app.environment.setMode(timeSelect.value);syncWorldUI();},{signal});
  document.getElementById('world-season').addEventListener('change',e=>app.environment.setSeason(e.target.value),{signal});
  document.getElementById('world-quality').addEventListener('change',e=>app.environment.setQuality(e.target.value),{signal});
  document.getElementById('world-volume').addEventListener('input',e=>app.environment.setVolume(Number(e.target.value)).catch(()=>{e.target.value=0;}),{signal});
  const uiTimer=setInterval(syncWorldUI,10000);syncWorldUI();
  const ray=new THREE.Raycaster(),point=new THREE.Vector2(),animalStory=document.getElementById('animal-story');let down=null,hovered=null,animalTimer=0;
  function cast(e,objects){const r=app.renderer.domElement.getBoundingClientRect();point.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(point,app.camera);return ray.intersectObjects(objects,false)[0];}
  function fullyVisible(object){let current=object;while(current){if(!current.visible)return false;current=current.parent;}return true;}
  function objectHits(){return Object.values(app.hits).filter(o=>{let current=o;while(current){if(!current.visible)return false;current=current.parent;}return true;});}
  function showAnimal(animal,locked=false){clearTimeout(animalTimer);animalStory.textContent=app.environment.animals.describe(animal);animalStory.hidden=false;animalStory.dataset.locked=locked?'true':'false';if(locked)animalTimer=setTimeout(()=>{animalStory.hidden=true;},5200);}
  app.renderer.domElement.addEventListener('pointermove',e=>{
    if(controller.phase!=='overview')return;const objectHit=cast(e,objectHits()),animalHit=cast(e,app.environment.animals.pickables.filter(fullyVisible));
    if(animalHit&&(!objectHit||animalHit.distance<objectHit.distance)){hovered={animal:animalHit.object.userData.animal};app.setHovered(null);app.renderer.domElement.style.cursor='pointer';showAnimal(hovered.animal);}
    else if(objectHit){hovered={type:objectHit.object.userData.action};app.setHovered(hovered.type);app.renderer.domElement.style.cursor='pointer';if(animalStory.dataset.locked!=='true')animalStory.hidden=true;}
    else{hovered=null;app.setHovered(null);app.renderer.domElement.style.cursor='grab';if(animalStory.dataset.locked!=='true')animalStory.hidden=true;}
  },{signal});
  app.renderer.domElement.addEventListener('pointerleave',()=>{hovered=null;app.setHovered(null);app.renderer.domElement.style.cursor='grab';if(animalStory.dataset.locked!=='true')animalStory.hidden=true;},{signal});
  app.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};if(hovered?.type)app.pressFeedback(hovered.type);},{signal});
  app.renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||down.id!==e.pointerId)return;
    const moved=Math.hypot(down.x-e.clientX,down.y-e.clientY);down=null;
    if(moved>7||controller.phase!=='overview')return;
    const hit=cast(e,objectHits()),animalHit=cast(e,app.environment.animals.pickables.filter(fullyVisible));
    if(animalHit&&(!hit||animalHit.distance<hit.distance))showAnimal(animalHit.object.userData.animal,true);else if(hit)activate(hit.object.userData.action);
  },{signal});
  app.renderer.domElement.addEventListener('pointercancel',()=>down=null,{signal});
  // Update public geometry only when the published revision changes; never retain a visitor-side editable copy.
  const pinGroup=new THREE.Group();app.mapGroup.add(pinGroup);
  const pinGeometry=new THREE.SphereGeometry(.032,10,8),pinMaterial=new THREE.MeshStandardMaterial({color:'#bd6346',emissive:'#7d311b',emissiveIntensity:.25});
  const originalColors=app.photoMeshes.map(m=>m.material.color.clone());let contentVersion=0,refreshing=false;
  function applyContent(next){
    content=next;const version=++contentVersion;
    while(pinGroup.children.length)pinGroup.remove(pinGroup.children[0]);
    content.travelPins.forEach(p=>{const pin=new THREE.Mesh(pinGeometry,pinMaterial);pin.position.set(.035,(.5-p.y)*1.25,(.5-p.x)*2.2);pin.userData.action='map';pinGroup.add(pin);});
    app.photoMeshes.forEach((mesh,i)=>{if(mesh.material.map){mesh.material.map.dispose();mesh.material.map=null;}mesh.material.color.copy(originalColors[i]);mesh.material.needsUpdate=true;});
    content.photos.forEach((photo,i)=>{const mesh=app.photoMeshes.find(m=>m.userData.photoId===photo.id)||app.photoMeshes[i];if(mesh&&ContentStore.url(photo.src))new THREE.TextureLoader().load(ContentStore.url(photo.src),t=>{if(version!==contentVersion||signal.aborted){t.dispose();return;}t.encoding=THREE.sRGBEncoding;mesh.material.map=t;mesh.material.color.set('#ffffff');mesh.material.needsUpdate=true;},undefined,()=>{});});
    if(app.mapMesh.material.map!==app.mapTex){app.mapMesh.material.map.dispose();app.mapMesh.material.map=app.mapTex;app.mapMesh.material.needsUpdate=true;}
    if(ContentStore.url(content.map?.image))new THREE.TextureLoader().load(ContentStore.url(content.map.image),t=>{if(version!==contentVersion||signal.aborted){t.dispose();return;}t.encoding=THREE.sRGBEncoding;if(app.mapMesh.material.map!==app.mapTex)app.mapMesh.material.map.dispose();app.mapMesh.material.map=t;app.mapMesh.material.needsUpdate=true;},undefined,()=>{});
  }
  async function refreshContent(){
    if(refreshing||controller.phase!=='overview'||document.hidden||ContentStore.mode!=='api')return;
    refreshing=true;try{const next=await ContentStore.load();if(!signal.aborted&&next.revision!==content.revision)applyContent(next);document.getElementById('status').hidden=true;}catch{if(!signal.aborted){const status=document.getElementById('status');status.textContent='内容同步暂时失败，将自动重试。';status.hidden=false;}}finally{refreshing=false;}
  }
  applyContent(content);const contentTimer=setInterval(refreshContent,20000);
  window.addEventListener('focus',refreshContent,{signal});document.addEventListener('room-overview',refreshContent,{signal});
  const aliases={resume:'monitor',music:'turntable',photos:'photoWall',notebook:'notebook',map:'map',books:'books'};
  const requested=aliases[location.hash.slice(1).split(':')[0]];if(requested)activate(requested);
  window.__ROOM_INTERACTIONS__={controller,activate,refreshContent,get content(){return content;}};
  window.addEventListener('pagehide',()=>{clearTimeout(animalTimer);clearInterval(contentTimer);pinGeometry.dispose();pinMaterial.dispose();clearInterval(uiTimer);cleanup();off();controller.dispose();bubbles.forEach(b=>b.dispose());abort.abort();app.dispose();},{once:true});
 }
 return {init};
})();
