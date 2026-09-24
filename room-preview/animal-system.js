/* Fish is an occasional water event, never a resident or an interactable. */
window.FishJumpEffect={create(asset,surface,options=FishJumpConfig){
 const config={...options},root=new THREE.Group(),fish=asset.scene,rand=LandscapeAssets.random(93051),events=[],leases=[];root.name='occasional-fish-jump';root.add(fish);fish.scale.setScalar(1.15);fish.position.y=-.18;fish.visible=false;
 const animation=new THREE.AnimationMixer(fish);animation.clipAction(THREE.AnimationClip.findByName(asset.animations,'Swim')).play();
 const ringG=new THREE.RingGeometry(.83,1,40),ringM=new THREE.MeshBasicMaterial({color:'#d9eef0',transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}),rings=new THREE.InstancedMesh(ringG,ringM,3);rings.frustumCulled=false;root.add(rings);
 const dropsG=new THREE.BufferGeometry(),dropsPos=new Float32Array(12*3);dropsG.setAttribute('position',new THREE.BufferAttribute(dropsPos,3));
 const dropsM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:0}},vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(55./max(1.,-p.z),1.,4.);}',fragmentShader:'uniform float opacity;void main(){if(length(gl_PointCoord-.5)>.5)discard;gl_FragColor=vec4(.8,.94,1.,opacity);}'});
 const drops=new THREE.Points(dropsG,dropsM);drops.frustumCulled=false;root.add(drops);rings.visible=drops.visible=false;
 let quality='high',wait=config.firstDelay,phase='hidden',elapsed=0,total=0,event=null,disposed=false;const dummy=new THREE.Object3D();
 const water=(p,time)=>surface.waterLevel+surface.waveHeight(p[0],p[1],time);
 function release(){for(const p of leases){const i=surface.waterPlacements.indexOf(p);if(i>=0)surface.waterPlacements.splice(i,1);}leases.length=0;}
 function sample(){for(let attempt=0;attempt<80;attempt++){const zone=config.zones[Math.floor(rand()*config.zones.length)],a=[zone[0]+(rand()-.5)*config.jitter*2,zone[1]+(rand()-.5)*config.jitter*2],angle=rand()*Math.PI*2,length=config.flightDistance[0]+rand()*(config.flightDistance[1]-config.flightDistance[0]),b=[a[0]+Math.cos(angle)*length,a[1]+Math.sin(angle)*length];
  const path=surface.motionPath('fish-jump-probe',[a,b],{medium:'water',radius:config.radius,shoreClearance:config.shoreClearance,minDepth:config.minDepth,submerge:.15});if(!path.valid)continue;
  const e={id:'fish-jump-'+events.length,at:total,start:a,end:b,completed:false,invalid:0};for(const [kind,p]of [['start',a],['landing',b]]){const q={id:e.id+'-'+kind,kind:'water-effect',x:p[0],z:p[1],baseY:surface.waterLevel-.15,radius:config.radius,shoreClearance:config.shoreClearance,minDepth:config.minDepth};if(surface.validateWater(q).length)throw Error('Invalid jump endpoint');surface.waterPlacements.push(q);leases.push(q);}events.push(e);return e;
 }return null;}
 function ripple(point,u,time,splash){const y=water(point,time)+.025;rings.visible=true;ringM.opacity=(1-u)*(splash?.4:.18);for(let i=0;i<3;i++){dummy.position.set(point[0],y+i*.003,point[1]);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(.08+u*(.6+i*.22));dummy.updateMatrix();rings.setMatrixAt(i,dummy.matrix);}rings.instanceMatrix.needsUpdate=true;drops.visible=splash;dropsM.uniforms.opacity.value=(1-u)*.6;if(splash){for(let i=0;i<12;i++){const angle=i*Math.PI*2/12;dropsPos[i*3]=point[0]+Math.cos(angle)*u*.75;dropsPos[i*3+1]=y+Math.sin(Math.PI*u)*(.18+i%3*.1);dropsPos[i*3+2]=point[1]+Math.sin(angle)*u*.75;}dropsG.attributes.position.needsUpdate=true;}}
 function reset(){release();phase='hidden';fish.visible=rings.visible=drops.visible=false;wait=config.interval[0]+rand()*(config.interval[1]-config.interval[0]);elapsed=0;}
 function step(dt,time){total+=dt;if(!config.enabled||quality==='low'&&config.lowQuality==='off'){if(phase!=='hidden')reset();return;}
  if(phase==='hidden'){wait-=dt;if(wait>0)return;event=sample();if(!event){reset();return;}phase='prelude';elapsed=0;}
  elapsed+=dt;
  if(phase==='prelude'){ripple(event.start,Math.min(1,elapsed/config.prelude),time,false);if(elapsed>=config.prelude){phase='airborne';elapsed-=config.prelude;}}
  if(phase==='airborne'){const u=Math.min(1,elapsed/config.duration),x=event.start[0]*(1-u)+event.end[0]*u,z=event.start[1]*(1-u)+event.end[1]*u;fish.visible=true;rings.visible=drops.visible=false;fish.position.set(x,water([x,z],time)+4*config.height*u*(1-u)-.18,z);fish.rotation.set(-Math.atan2(4*config.height*(1-2*u),Math.hypot(event.end[0]-event.start[0],event.end[1]-event.start[1])),Math.atan2(event.end[0]-event.start[0],event.end[1]-event.start[1]),0);animation.update(dt);if(u===1){phase='splash';elapsed=0;fish.visible=false;}}
  if(phase==='splash'){ripple(event.end,Math.min(1,elapsed/config.splashDuration),time,true);if(elapsed>=config.splashDuration){event.completed=true;reset();}}
 }
 return {root,fish,rings,drops,events,config,get phase(){return phase;},update(dt,time){if(disposed)return;let left=Math.min(1,Math.max(0,dt));while(left>1e-7){const h=Math.min(left,1/60);step(h,time-left+h);left-=h;}},setQuality(q){quality=q;if(q==='low'&&config.lowQuality==='off')reset();},dispose(){if(disposed)return;disposed=true;release();animation.stopAllAction();animation.uncacheRoot(fish);asset.release();ringG.dispose();ringM.dispose();dropsG.dispose();dropsM.dispose();if(root.parent)root.parent.remove(root);}};
}};
/* Wildlife facade. Missing assets fail closed; no primitive animal construction. */
window.AnimalSystem=(()=>{
 const active=new WeakMap(),labels={idle:'正在休息',lookAround:'四处张望',walk:'慢慢散步',hop:'跳向嫩草',swim:'缓缓游过',graze:'低头吃草',preen:'梳理羽毛',leave:'正要回树林'};
 function create(scene,surface,definitions=AnimalPopulation){
  if(active.has(scene))active.get(scene).dispose();
  const root=new THREE.Group();root.name='licensed-near-wildlife';scene.add(root);
  const routeDebug=new THREE.Group();routeDebug.name='wildlife-merged-routes';routeDebug.visible=false;root.add(routeDebug);
  const animals=[],effects=[],pickables=[],status=definitions.map(d=>({id:d.id,status:d.enabled?'loading':'disabled',reason:d.blocker||null}));let disposed=false,quality='high',deferred=0;
  const api={root,routeDebug,animals,effects,pickables,status,ready:null,get quality(){return quality;},update(dt,time,world){if(disposed)return;routeDebug.visible=!!scene.getObjectByName('world-surface-debug')?.visible;deferred+=dt;const budget=quality==='low'?1/30:0;if(dt&&deferred<budget)return;for(const a of animals)a.update(dt?deferred:0,world,time);for(const e of effects)e.update(dt?deferred:0,time,world);if(dt)deferred=0;syncPickables();},setQuality(v){quality=v;animals.forEach(a=>a.setQuality(v));effects.forEach(e=>e.setQuality(v));syncPickables();},describe(a){return a.label+' · '+(labels[a.state]||a.state)+'\n'+a.story;},dispose(){if(disposed)return;disposed=true;animals.forEach(a=>a.dispose());effects.forEach(e=>e.dispose());effects.length=0;routeDebug.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});animals.length=0;pickables.length=0;scene.remove(root);if(active.get(scene)===api)active.delete(scene);}};
  function syncPickables(){pickables.length=0;for(const a of animals)if(a.group.visible)pickables.push(...a.meshes);}
  api.ready=Promise.all(definitions.map(async(d,i)=>{
   if(!d.enabled)return;let asset=null;
   try{asset=await AnimalLoader.acquire(d);if(disposed){asset.release();return;}if(d.effect==='jump'){const effect=FishJumpEffect.create(asset,surface);effect.setQuality(quality);root.add(effect.root);effects.push(effect);status[i].status='ready';return;}const actor=AnimalActor.create(asset,d,surface);actor.setQuality(quality);root.add(actor.group);animals.push(actor);status[i].status='ready';syncPickables();}
   catch(err){if(asset)asset.release();status[i].status='failed';status[i].reason=String(err.message||err);}
  })).then(()=>{if(!disposed)for(const actor of animals.filter(a=>a.config.medium==='land')){const geometry=new THREE.BufferGeometry().setFromPoints(actor.movement.route.points.map(([x,z])=>new THREE.Vector3(x,surface.terrainHeight(x,z)+.45,z))),material=new THREE.LineBasicMaterial({color:actor.config.species==='rabbit'?'#ff77cc':'#ffac50',depthTest:false});const line=new THREE.Line(geometry,material);line.name=actor.id+'-connected-route';line.renderOrder=130;routeDebug.add(line);}return status;});active.set(scene,api);return api;
 }
 function createDisabled(scene){const s=create(scene,WorldSurface.create(),[]);s.root.visible=false;return s;}
 return {create,createDisabled};
})();
