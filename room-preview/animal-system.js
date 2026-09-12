/* Wildlife facade. Missing assets fail closed; no primitive animal construction. */
window.AnimalSystem=(()=>{
 const active=new WeakMap(),labels={idle:'正在休息',lookAround:'四处张望',walk:'慢慢散步',hop:'跳向嫩草',swim:'缓缓游过',graze:'低头吃草',preen:'梳理羽毛',leave:'正要回树林'};
 function create(scene,surface,definitions=AnimalManifest){
  if(active.has(scene))active.get(scene).dispose();
  const root=new THREE.Group();root.name='licensed-near-wildlife';scene.add(root);
  const animals=[],pickables=[],status=definitions.map(d=>({id:d.id,status:d.enabled?'loading':'disabled',reason:d.blocker||null}));let disposed=false,quality='high',deferred=0;
  const api={root,animals,pickables,status,ready:null,get quality(){return quality;},update(dt,time,world){if(disposed)return;deferred+=dt;const budget=quality==='low'?1/30:0;if(deferred<budget)return;for(const a of animals)a.update(deferred,world);deferred=0;syncPickables();},setQuality(v){quality=v;syncPickables();},describe(a){return a.label+' · '+(labels[a.state]||a.state)+'\n'+a.story;},dispose(){if(disposed)return;disposed=true;animals.forEach(a=>a.dispose());animals.length=0;pickables.length=0;scene.remove(root);if(active.get(scene)===api)active.delete(scene);}};
  function syncPickables(){pickables.length=0;for(const a of animals)if(a.group.visible)pickables.push(...a.meshes);}
  api.ready=Promise.all(definitions.map(async(d,i)=>{
   if(!d.enabled)return;let asset=null;
   try{asset=await AnimalLoader.acquire(d);if(disposed){asset.release();return;}const actor=AnimalActor.create(asset,d,surface);root.add(actor.group);animals.push(actor);status[i].status='ready';syncPickables();}
   catch(err){if(asset)asset.release();status[i].status='failed';status[i].reason=String(err.message||err);}
  })).then(()=>status);active.set(scene,api);return api;
 }
 function createDisabled(scene){const s=create(scene,WorldSurface.create(),[]);s.root.visible=false;return s;}
 return {create,createDisabled};
})();
