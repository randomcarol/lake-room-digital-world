/* Versioned buildable asset catalog. Assets are templates; placed world objects are saved separately. */
window.WorldAssetLibrary=(()=>{
 const factories={
  'procedural-flower':()=>{
   const T=THREE,g=new T.Group(),stem=new T.MeshStandardMaterial({color:'#5e834d',roughness:1}),petal=new T.MeshStandardMaterial({color:'#fff1d0',roughness:.92}),centre=new T.MeshStandardMaterial({color:'#e4b84f',roughness:1});
   const stalk=new T.Mesh(new T.CylinderGeometry(.012,.018,.38,6),stem);stalk.position.y=.19;g.add(stalk);
   for(let i=0;i<8;i++){const a=i*Math.PI/4,p=new T.Mesh(new T.SphereGeometry(1,6,3),petal);p.scale.set(.085,.018,.038);p.position.set(Math.cos(a)*.075,.4,Math.sin(a)*.075);p.rotation.y=-a;g.add(p);}
   const c=new T.Mesh(new T.SphereGeometry(.045,8,4),centre);c.scale.y=.45;c.position.y=.41;g.add(c);return g;
  },
  'procedural-pine':()=>{
   const T=THREE,g=new T.Group(),trunk=new T.MeshStandardMaterial({color:'#70543f',roughness:1}),needles=new T.MeshStandardMaterial({color:'#52734d',roughness:.96});
   const t=new T.Mesh(new T.CylinderGeometry(.18,.28,3.7,8),trunk);t.position.y=1.85;t.castShadow=t.receiveShadow=true;g.add(t);
   for(let i=0;i<5;i++){const cone=new T.Mesh(new T.ConeGeometry(1.45-i*.16,2.2,10),needles);cone.position.y=2.15+i*.68;cone.castShadow=cone.receiveShadow=true;g.add(cone);}return g;
  },
  'procedural-cottage':()=>{
   const T=THREE,g=new T.Group(),wall=new T.MeshStandardMaterial({color:'#a95a49',roughness:.95}),trim=new T.MeshStandardMaterial({color:'#eee1c9',roughness:.9}),roof=new T.MeshStandardMaterial({color:'#465556',roughness:.95}),glass=new T.MeshStandardMaterial({color:'#e7b86a',emissive:'#d98c38',emissiveIntensity:.18,roughness:.45});
   function box(w,h,d,m,x,y,z){const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;}
   box(4.8,.35,4.2,trim,0,.175,0);box(4.5,2.9,3.9,wall,0,1.8,0);const r1=box(3.25,.18,4.35,roof,-1.15,3.7,0),r2=box(3.25,.18,4.35,roof,1.15,3.7,0);r1.rotation.z=-.62;r2.rotation.z=.62;
   box(1.05,1.85,.12,trim,0,1.25,2.02);box(.78,1.62,.1,wall,0,1.22,2.1);for(const x of [-1.45,1.45]){box(1.08,1.12,.12,trim,x,1.9,2.03);box(.82,.86,.08,glass,x,1.9,2.1);}return g;
  }
 };
 function validate(catalog){
  if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.assets))throw Error('Unsupported asset catalog');
  const ids=new Set();for(const a of catalog.assets){if(!a.id||ids.has(a.id)||!factories[a.renderer])throw Error('Invalid asset '+(a.id||''));ids.add(a.id);if(!a.bounds||!a.placement||!a.budget)throw Error('Incomplete asset '+a.id);}return catalog;
 }
 async function load(url='assets/catalog.json'){
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error('Asset catalog unavailable: '+response.status);const catalog=validate(await response.json()),byId=new Map(catalog.assets.map(a=>[a.id,a]));
  return {catalog,all:catalog.assets.slice(),get:id=>byId.get(id)||null,create(id){const asset=byId.get(id);if(!asset)return placeholder(id);const object=factories[asset.renderer]();object.name='build-asset-'+id;object.userData.assetId=id;return object;}};
 }
 function placeholder(id){const T=THREE,g=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:'#e34f91',wireframe:true}));mesh.position.y=.5;g.add(mesh);g.name='missing-build-asset';g.userData.assetId=id;g.userData.missing=true;return g;}
 return {load,validate,placeholder};
})();
