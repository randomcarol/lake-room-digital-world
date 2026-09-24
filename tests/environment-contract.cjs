const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--enable-gpu']});
 const p=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:8940/?qa=1');await p.waitForFunction(()=>window.__ROOM_INTERACTIONS__);await p.waitForLoadState('networkidle');
 const report=await p.evaluate(()=>{
  const a=window.__ROOM_APP__,e=a.environment,s=e.surface,T=THREE,fail=[],details={};
  details.threeRevision=T.REVISION;
  const check=(ok,msg)=>{if(!ok)fail.push(msg);};
  check(a.camera.position.distanceTo(new T.Vector3(...RoomQACameras.desktop.position))<.01,'initial overview differs from QA camera');
  const ids=new Map(s.placements.map(x=>[x.id,x])),covered=new Set(),matrix=new T.Matrix4(),v=new T.Vector3();
  e.root.traverse(o=>{if(!o.userData.placementIds)return;o.userData.placementIds.forEach((id,i)=>{const pos=ids.get(id);check(!!pos,'unknown placement '+id);o.getMatrixAt(i,matrix);v.setFromMatrixPosition(matrix);check(v.distanceTo(new T.Vector3(pos.x,pos.baseY,pos.z))<.0001,'mesh detached from placement '+id);covered.add(id);});});
  for(const p of s.placements)if(['tree','rock','shrub','grass','flower','path-stone'].includes(p.kind)&&(p.kind!=='flower'||p.season===e.state.season))check(covered.has(p.id),'missing rendered placement '+p.id);
  // Raycast the rendered triangle surfaces; an analytical point above water alone is insufficient.
  const land=e.root.children.filter(o=>o.name==='sampled-terrain'||o.name.startsWith('folded-rock-massif'));
  a.scene.updateMatrixWorld(true);const ray=new T.Raycaster(),down=new T.Vector3(0,-1,0);let maxError=0;
  for(const p of s.placements){ray.set(new T.Vector3(p.x,150,p.z),down);const hit=ray.intersectObjects(land)[0];check(!!hit,'no rendered terrain '+p.id);if(hit){maxError=Math.max(maxError,Math.abs(hit.point.y-p.baseY));check(Math.abs(hit.point.y-p.baseY)<.001,'base differs from rendered terrain '+p.id);}}
  details.terrainRaycastMaxError=maxError;
  details.routes=[];for(let t=0;t<=600;t+=3){e.village.update(t,WorldState.seasons.summer,0,0);for(const p of e.village.agents)check(!s.validate(p).length,'moving inhabitant left legal terrain');}details.routes.push('201 time samples / 3 walkers');
  check(e.animals.animals.every(a=>a.source==='GLTFLoader'&&a.meshes.every(m=>m.isSkinnedMesh)),'near primitive animals active');
  check(e.village.houses.length===8&&new Set(e.village.houses.map(p=>p.variant)).size===3,'house silhouettes');
  check(e.village.floats.every(p=>s.surfaceType(p.x,p.z)==='water'),'boat on land');
  details.seasons={};for(const name of ['summer','autumn','winter','spring']){
   const start=performance.now();e.setSeason(name);const tree=e.root.getObjectByName('near-conifers'),leaf=e.root.getObjectByName('near-deciduous-0'),ground=e.root.getObjectByName('sampled-terrain');
   details.seasons[name]={appliedMs:performance.now()-start,snow:e.uniforms.snow.value,conifer:tree.material.color.getHexString(),deciduous:leaf.material.color.getHexString(),grass:ground.material.color.getHexString(),roof:e.village.roof.color.getHexString()};
   check(e.uniforms.snow.value===WorldState.seasons[name].snow,'season transition delayed');
  }
  check(details.seasons.summer.deciduous!==details.seasons.autumn.deciduous,'autumn has no deciduous change');check(details.seasons.summer.grass!==details.seasons.autumn.grass,'autumn has no ground change');
  check(a.renderer.outputEncoding===T.sRGBEncoding&&a.renderer.toneMapping===T.ACESFilmicToneMapping,'colour pipeline changed');
  details.shadows={};for(const mode of ['day','dusk','night']){e.setMode(mode);const light=e.rig.light;const lightDirection=light.position.clone().sub(light.target.position).normalize();check(lightDirection.distanceTo(e.uniforms.sunDirection.value)<1e-8,'sun/water direction mismatch');check(a.renderer.shadowMap.needsUpdate,'mode change did not invalidate shadow map');a.renderer.render(a.scene,a.camera);details.shadows[mode]={direction:lightDirection.toArray(),windowEmission:e.village.litGlass.emissiveIntensity};}
  const cam=e.rig.light.shadow.camera;const projection=new T.Matrix4().multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);const frustum=new T.Frustum().setFromProjectionMatrix(projection);
  for(const x of [0,8])for(const y of [0,5])for(const z of [0,6.7])check(frustum.containsPoint(new T.Vector3(x,y,z)),'room outside shadow frustum');
  details.audit=s.audit();check(details.audit.invalid.length===0,'invalid placements');
  return {fail,details};
 });
 // Verify actual object navigation remains usable from the new overview.
 for(const device of ['desktop','mobile']){
  await p.setViewportSize(device==='desktop'?{width:1280,height:900}:{width:390,height:844});
  await p.evaluate(d=>{RoomQACameras.apply(window.__ROOM_APP__,d);window.__ROOM_APP__.environment.setMode('day');},device);await p.waitForTimeout(250);
  for(const type of ['monitor','notebook','turntable','map','photoWall','books']){await p.locator(`[data-object="${type}"]`).click();await p.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='experience');await p.locator('#return-room').click();await p.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='overview');}
  console.log('PASS all six interactive objects:',device);
 }
 report.errors=errors;fs.writeFileSync('tests/artifacts/environment/contracts.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();assert.deepEqual(report.fail,[]);assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
