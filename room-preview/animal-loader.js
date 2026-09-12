/* Promise cache + independent skeletons. Only local, license-reviewed glTF files may enter it. */
window.AnimalLoader=(()=>{
 const cache=new Map();let requests=0;
 function releaseAsset(gltf){
  const gs=new Set(),ms=new Set(),ts=new Set();gltf.scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){ms.add(m);for(const v of Object.values(m))if(v&&v.isTexture)ts.add(v);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());
 }
 function cloneRig(source){
  const clone=source.clone(true),map=new Map();function pair(a,b){map.set(a,b);a.children.forEach((c,i)=>pair(c,b.children[i]));}pair(source,clone);
  source.traverse(o=>{if(!o.isSkinnedMesh)return;const copy=map.get(o);copy.skeleton=o.skeleton.clone();copy.skeleton.bones=o.skeleton.bones.map(b=>map.get(b));if(copy.skeleton.bones.some(b=>!b))throw new Error('Skeleton has external bones');copy.bind(copy.skeleton,o.bindMatrix);copy.frustumCulled=false;});return clone;
 }
 async function acquire(def){
  if(!def.enabled||!def.localFile||!def.license||!def.author||!def.sourceURL)throw new Error('Unreviewed or disabled animal '+def.id);
  if(!/^models\/animals\/[a-z0-9/_\-.]+\.(glb|gltf)$/i.test(def.localFile)||def.localFile.includes('..'))throw new Error('Animal asset must be a local static file');
  const key=def.localFile;let entry=cache.get(key);
  if(!entry){entry={refs:0,status:'loading',gltf:null};cache.set(key,entry);requests++;
   entry.promise=new Promise((resolve,reject)=>new THREE.GLTFLoader().load(key,resolve,undefined,reject)).then(g=>{entry.gltf=g;entry.status='ready';return g;}).catch(err=>{entry.status='failed';if(cache.get(key)===entry)cache.delete(key);throw new Error('GLTF load failed '+def.id+': '+(err.message||err));});
  }
  entry.refs++;
  function release(){if(--entry.refs===0){if(entry.gltf)releaseAsset(entry.gltf);if(cache.get(key)===entry)cache.delete(key);}}
  try{const g=await entry.promise,scene=cloneRig(g.scene);let released=false;return {scene,animations:g.animations,release(){if(released)return;released=true;scene.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});release();}};}catch(err){release();throw err;}
 }
 return {acquire,cloneRig,stats:()=>({entries:cache.size,requests,refs:[...cache.values()].reduce((n,e)=>n+e.refs,0),states:[...cache.values()].map(e=>e.status)})};
})();
