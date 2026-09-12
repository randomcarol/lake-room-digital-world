/* Offline-only asset build tool. Uses MIT Three.js r128 import/export helpers, never production runtime. */
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const input=process.env.RABBIT_SOURCE||'/tmp/room-asset-pipeline/rabbit',output=path.resolve('room-preview/models/animals/rabbit/Rabbit.glb');
(async()=>{const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const p=await b.newPage();p.on('console',m=>console.log(m.type(),m.text()));
 await p.route('**/asset-import/**',r=>{const name=decodeURIComponent(new URL(r.request().url()).pathname).split('/').pop(),file=path.join(input,'texture',name);if(fs.existsSync(file))r.fulfill({path:file});else r.abort();});
 await p.route('**/import-page',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Local asset conversion</title>'}));await p.goto('http://127.0.0.1:8940/import-page');
 for(const file of ['room-preview/three.min.js',...['fflate.min.js','FBXLoader.js','GLTFExporter.js'].map(f=>path.join(__dirname,'vendor',f))])await p.addScriptTag({path:file});
 const result=await p.evaluate(async base64=>{
  const manager=new THREE.LoadingManager();let done;const loaded=new Promise(r=>done=r);manager.onLoad=done;
  manager.setURLModifier(url=>'/asset-import/'+url.split(/[\\/]/).pop());
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),model=new THREE.FBXLoader(manager).parse(bytes.buffer,'/asset-import/');
  await Promise.race([loaded,new Promise(r=>setTimeout(r,5000))]);
  const info={clips:model.animations.map(a=>({name:a.name,duration:a.duration,tracks:a.tracks.map(t=>t.name)})),meshes:[],bounds:new THREE.Box3().setFromObject(model)};
  model.animations=model.animations.filter(c=>['Armature|Jump','Armature|Guarding','Armature|Sitting.000','Armature|Running'].includes(c.name));
  model.animations.forEach(c=>c.optimize());model.traverse(o=>{if(o.isSkinnedMesh)o.normalizeSkinWeights();});
  model.traverse(o=>{if(o.isMesh){info.meshes.push({name:o.name,vertices:o.geometry.attributes.position.count,materials:o.material.name});const mats=Array.isArray(o.material)?o.material:[o.material];const converted=mats.map(m=>{if(m.map)m.map.encoding=THREE.sRGBEncoding;return new THREE.MeshStandardMaterial({name:m.name,color:0xffffff,map:m.map,normalMap:m.normalMap,normalScale:new THREE.Vector2(.3,.3),alphaTest:.45,side:THREE.DoubleSide,roughness:1,skinning:o.isSkinnedMesh});});o.material=Array.isArray(o.material)?converted:converted[0];}});
  const glb=await new Promise(r=>new THREE.GLTFExporter().parse(model,r,{binary:true,animations:model.animations,trs:true,onlyVisible:false,maxTextureSize:512}));
  let s='';for(const v of new Uint8Array(glb))s+=String.fromCharCode(v);return {info,base64:btoa(s)};
 },fs.readFileSync(path.join(input,'rabbit.fbx')).toString('base64'));
 fs.writeFileSync(output,Buffer.from(result.base64,'base64'));fs.writeFileSync(path.join(path.dirname(output),'conversion.json'),JSON.stringify(result.info,null,2));console.log(JSON.stringify({clips:result.info.clips.map(c=>[c.name,c.duration]),meshes:result.info.meshes,bounds:result.info.bounds}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
