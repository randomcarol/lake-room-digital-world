/* Grounded seeded wildflowers. Four solid species near the room, crossed silhouettes at the meadow edge. */
window.FlowerSystem=(()=>{
 const T=THREE,A=LandscapeAssets;
 function geometry(species){
  const positions=[],normals=[],uvs=[],masks=[],d=new T.Object3D();
  function part(g,pos,scale=[1,1,1],rot=[0,0,0],petal=0){d.position.fromArray(pos);d.scale.fromArray(scale);d.rotation.fromArray(rot);d.updateMatrix();const q=g.index?g.toNonIndexed():g.clone();q.applyMatrix4(d.matrix);positions.push(...q.attributes.position.array);normals.push(...q.attributes.normal.array);uvs.push(...q.attributes.uv.array);for(let i=0;i<q.attributes.position.count;i++)masks.push(petal);q.dispose();g.dispose();}
  const height=species==='lavender'?.57:species==='campanula'?.43:.34;
  part(new T.CylinderGeometry(.006,.011,height,5),[0,height/2,0]);
  for(const side of [-1,1])part(new T.SphereGeometry(1,4,2),[side*.047,height*.4+side*.028,0],[.078,.014,.029],[0,side*.7,side*.45]);
  if(species==='lavender'){
   for(let j=0;j<4;j++)for(let k=0;k<3;k++){const a=k*Math.PI*2/3+j*.8;part(new T.ConeGeometry(.033,.07,5,1,true),[Math.cos(a)*.023,height-.14+j*.044,Math.sin(a)*.023],[1,1,1],[.5*Math.sin(a),0,.5*Math.cos(a)],1);}
  }else if(species==='campanula'){
   for(let k=0;k<3;k++){const a=k*2.1;part(new T.CylinderGeometry(.036,.073,.09,5,1,true),[Math.cos(a)*.06,height+Math.sin(k)*.025,Math.sin(a)*.06],[1,1,1],[.25*Math.sin(a),a,.3*Math.cos(a)],1);}
  }else{
   const petals=species==='daisy'?8:5;
   for(let k=0;k<petals;k++){const a=k*Math.PI*2/petals;part(new T.SphereGeometry(1,5,3),[Math.cos(a)*.073,height,Math.sin(a)*.073],[species==='daisy'?.057:.064,.015,.035],[0,-a,0],1);}
   part(new T.SphereGeometry(.032,7,3),[0,height+.012,0],[1,.4,1],[0,0,0],.35);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('petalMask',new T.Float32BufferAttribute(masks,1));return g;
 }
 function create(parent,surface,shared){
  const root=new T.Group();root.name='seasonal-wildflower-clusters';parent.add(root);
  const stem={value:new T.Color()},wind={value:0},bloom={value:1},batches=[],entries={},clusters=[];
  const material=new T.MeshStandardMaterial({roughness:1,side:T.DoubleSide});
  material.onBeforeCompile=s=>{
   Object.assign(s.uniforms,{flowerTime:shared.time,flowerStem:stem,flowerWind:wind,flowerBloom:bloom});
   s.vertexShader='attribute float petalMask;attribute vec3 instanceBloom;varying vec3 flowerColor;uniform vec3 flowerStem;uniform float flowerTime,flowerWind,flowerBloom;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nflowerColor=mix(flowerStem,instanceBloom,petalMask);transformed.xz*=mix(1.,flowerBloom,petalMask);float phase=instanceMatrix[3].x*2.7+instanceMatrix[3].z*1.9;transformed.x+=sin(flowerTime*.85+phase)*flowerWind*pow(position.y/.6,2.);`);
   s.fragmentShader='varying vec3 flowerColor;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=flowerColor;');
  };material.customProgramCacheKey=()=> 'grounded-flowers-r128-v1';
  // Reserve two short habitat corridors before placing flower cores or individual plants.
  surface.reserve('rabbit-meadow-a',[[-3,-4.5],[-1,-5.5],[2,-6.2],[5,-6.2]],.34);
  surface.reserve('rabbit-meadow-b',[[-12,9],[-10,5],[-9,1],[-7,-2]],.34);
  surface.reserve('rabbit-meadow-c',[[12,12],[14,9],[16,6],[18,3]],.34);
  surface.reserve('fox-forest-edge',[[-24,4],[-21,0],[-18,-4],[-14,-7],[-10,-5],[-8,-9]],.48);
  const seeds=[[-8,-3],[-4,-9],[1,-9],[5,-9],[10,-8],[13,-3],[13,4],[12,10],[6,12],[0,12],[-4,8],[-4,3]];
  for(const season of ['spring','summer']){
   const cfg=WorldState.seasons[season].flower,rand=A.random(season==='spring'?7331:9441);entries[season]=[];
   for(let c=0;c<cfg.clusterCount;c++){
    let core=null;
    for(let attempt=0;attempt<1800&&!core;attempt++){
     const x=seeds[c][0]+(rand()-.5)*3.2,z=seeds[c][1]+(rand()-.5)*2.8;
     const p={id:`flower-cluster-${season}-${c}`,kind:'flower-cluster',season,x,z,baseY:surface.terrainHeight(x,z),radius:cfg.clusterRadius,clearance:.12};
     if(surface.validate(p).length||clusters.some(q=>q.season===season&&Math.hypot(x-q.x,z-q.z)<cfg.clusterRadius+q.radius+.45))continue;
     core=surface.place('flower-cluster',x,z,p);core.coreRadius=.85;core.tier=c===0||c===7?'middle':'near';clusters.push(core);surface.flowerCores.push(core);
    }
    if(!core)throw new Error('No safe flower cluster '+season+' '+c);
    const count=Math.floor(cfg.count/cfg.clusterCount)+(c<cfg.count%cfg.clusterCount?1:0),species=[c%4,(c+1)%4,(c+2)%4],palette=[c%cfg.palette.length,(c+1)%cfg.palette.length];
    for(let n=0;n<count;n++){
     let p=null;for(let tries=0;tries<2000&&!p;tries++){
      const a=rand()*Math.PI*2,r=cfg.clusterRadius*.84*Math.pow(rand(),.7)*(1+.13*Math.sin(a*3+c)),x=core.x+Math.cos(a)*r,z=core.z+Math.sin(a)*r;
      const scale=cfg.minScale+rand()*(cfg.maxScale-cfg.minScale),candidate={kind:'flower',x,z,baseY:surface.terrainHeight(x,z),radius:.15*scale+.025,clearance:.12,season,clusterId:core.id};
      if(surface.validate(candidate).length||entries[season].some(e=>Math.hypot(e.p.x-x,e.p.z-z)<.17))continue;
      p=surface.place('flower',x,z,candidate);entries[season].push({p,scale,rotation:rand()*Math.PI*2,tilt:(rand()-.5)*.10,species:cfg.speciesMix[species[n%3]],color:palette[n%2],tier:core.tier});
     }if(!p)throw new Error('Flower sampling exhausted '+core.id);
    }
   }
  }
  // Mid-tier uses two crossed planes with authored rooted stems, leaves and asymmetric blooms.
  const atlas=A.texture(128,256,c=>{c.clearRect(0,0,128,256);c.strokeStyle='#63834c';c.lineWidth=5;c.beginPath();c.moveTo(64,256);c.quadraticCurveTo(53,130,68,40);c.stroke();c.fillStyle='#709150';for(const side of [-1,1]){c.beginPath();c.ellipse(64+side*16,153+side*15,23,7,-side*.55,0,Math.PI*2);c.fill();}c.fillStyle='#fff2db';for(let j=0;j<2;j++)for(let k=0;k<6;k++){const a=k*Math.PI/3;c.beginPath();c.ellipse(64+j*7+Math.cos(a)*15,35+j*53+Math.sin(a)*15,12,6,a,0,Math.PI*2);c.fill();}c.fillStyle='#ddb65f';for(let j=0;j<2;j++){c.beginPath();c.arc(64+j*7,35+j*53,6,0,7);c.fill();}});
  const midMaterial=new T.MeshStandardMaterial({map:atlas,alphaTest:.5,roughness:1,side:T.DoubleSide});
  midMaterial.onBeforeCompile=s=>{s.uniforms.flowerTime=shared.time;s.uniforms.flowerWind=wind;s.vertexShader='uniform float flowerTime,flowerWind;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x+=sin(flowerTime*.85+instanceMatrix[3].x*2.7+instanceMatrix[3].z*1.9)*flowerWind*position.y*position.y;');};
  for(const type of ['daisy','buttercup','campanula','lavender','middle']){
   let g;if(type==='middle'){const plane=new T.PlaneGeometry(.25,.5).translate(0,.25,0);g=A.merge([[plane,new T.Matrix4()],[plane,new T.Matrix4().makeRotationY(Math.PI/2)]]);plane.dispose();}else g=geometry(type);
   g.setAttribute('instanceBloom',new T.InstancedBufferAttribute(new Float32Array(216*3),3));
   const mesh=new T.InstancedMesh(g,type==='middle'?midMaterial:material,216);mesh.name='wildflowers-'+type;mesh.count=0;mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.userData.baseAnchored=true;root.add(mesh);batches.push({type,mesh});
  }
  let current='',quality='high';const dummy=new T.Object3D(),color=new T.Color();
  function apply(season,force=false){
   if(current===season&&!force)return;current=season;const cfg=WorldState.seasons[season].flower;root.visible=cfg.enabled;stem.value.set(cfg.stem).convertSRGBToLinear();wind.value=cfg.windStrength;bloom.value=cfg.bloomAmount;
   const active=entries[season]||[],selected=quality==='low'?active.filter((e,i)=>i%2===0):active;
   for(const {type,mesh} of batches){const list=selected.filter(e=>type==='middle'?e.tier==='middle':e.tier==='near'&&e.species===type);mesh.count=list.length;mesh.userData.placementIds=list.map(e=>e.p.id);for(let i=0;i<list.length;i++){const e=list[i];dummy.position.set(e.p.x,e.p.baseY,e.p.z);dummy.rotation.set(e.tilt,e.rotation,e.tilt*.4);dummy.scale.setScalar(e.scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.set(cfg.palette[e.color]).convertSRGBToLinear();mesh.geometry.attributes.instanceBloom.setXYZ(i,color.r,color.g,color.b);if(type==='middle')mesh.setColorAt(i,color);}mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.instanceBloom.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  }
  return {root,entries,clusters,batches,apply,setQuality(v){quality=v;apply(current||'summer',true);},get count(){return batches.reduce((n,b)=>n+b.mesh.count,0);},get quality(){return quality;},get season(){return current;}};
 }
 return {create};
})();
