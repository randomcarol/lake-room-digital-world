/* One deterministic surface contract for geometry, GLSL water and every outdoor placement.
 * distanceToShore is a conservative signed clearance (positive on land), in world metres. */
window.WorldSurface=(()=>{
 const waterLevel=-.47,shoreSafeBand=1.8;
 const nearShore=x=>-14-2.2*Math.sin(x*.043)-Math.abs(x+5)*.018;
 const farShore=x=>-100+3.2*Math.sin(x*.039+1.2);
 const halfWidth=z=>108+12*Math.sin((z+100)/86*Math.PI);
 const distanceToShore=(x,z)=>Math.max(z-nearShore(x),farShore(x)-z,Math.abs(x+10)-halfWidth(z));
 function baseTerrainHeight(x,z){
  const d=distanceToShore(x,z);
  if(d<0)return waterLevel-Math.min(6,-d*.42);
  const bank=.36*(1-Math.exp(-d/1.15));
  const farRise=Math.max(0,farShore(x)-z);
  return waterLevel+bank+Math.min(3.6,farRise*.10)+Math.min(1,d/5)*(.08*Math.sin(x*.19)*Math.sin(z*.17));
 }
 function mountainLayerHeight(x,z,layer){
  const front=-113-layer*58;
  if(x< -252.0001||x>228.0001||z>front+.0001||z<front-130-.0001)return -Infinity;
  const peaks=layer===0?[[-154,-177,32,39],[-96,-173,42,32],[-46,-189,48,39],[9,-169,28,30],[69,-192,47,37],[133,-181,32,39]]:[[-140,-232,49,44],[-38,-251,63,53],[67,-238,55,44],[152,-246,59,42]];
  let y=0;for(const [px,pz,h,r] of peaks){const dx=(x-px)/r,dz=(z-pz)/(r*.83),dist=Math.sqrt(dx*dx+dz*dz);y=Math.max(y,h*Math.pow(Math.max(0,1-dist*.53),1.55));}
  const fold=(Math.sin(x*.28+z*.12)+Math.sin(x*.13-z*.23)*.7+Math.sin(x*.73+z*.26)*.22)*Math.min(2.4,y*.09);
  const u=Math.max(0,Math.min(1,(front-z)/15)),fade=u*u*(3-2*u);return 1.4+(y+fold)*fade*.78;
 }
 // Match the exact triangle diagonal used by THREE.PlaneGeometry, including shore interpolation.
 function gridHeight(fn,x,z,minX,minZ,w,d,nx,nz){
  if(x<minX||x>minX+w||z<minZ||z>minZ+d)return -Infinity;
  const fx=(x-minX)/w*nx,fz=(z-minZ)/d*nz,ix=Math.min(nx-1,Math.floor(fx)),iz=Math.min(nz-1,Math.floor(fz)),u=fx-ix,v=fz-iz;
  const x0=minX+ix*w/nx,z0=minZ+iz*d/nz,x1=x0+w/nx,z1=z0+d/nz;
  const h10=fn(x1,z0),h01=fn(x0,z1);
  if(u+v<=1){const h00=fn(x0,z0);return h00+(h10-h00)*u+(h01-h00)*v;}
  const h11=fn(x1,z1);return h11+(h01-h11)*(1-u)+(h10-h11)*(1-v);
 }
 function terrainHeight(x,z){return Math.max(gridHeight(baseTerrainHeight,x,z,-290,-340,560,510,180,166),gridHeight((x,z)=>mountainLayerHeight(x,z,0),x,z,-252,-243,480,130,160,50),gridHeight((x,z)=>mountainLayerHeight(x,z,1),x,z,-252,-301,480,130,160,50));}
 const surfaceType=(x,z)=>distanceToShore(x,z)<0?'water':distanceToShore(x,z)<shoreSafeBand?'shore':'land';
 const zones={near:{x:[-40,40],z:[-12,18]},middle:{x:[-155,135],z:[-145,-25]},far:{x:[-190,160],z:[-184,-125]},village:{x:[-84,-16],z:[-122,-99]}};
 const inZone=(x,z,name)=>!name||!!zones[name]&&x>=zones[name].x[0]&&x<=zones[name].x[1]&&z>=zones[name].z[0]&&z<=zones[name].z[1];
 const glsl=`float shoreNear(float x){return -14.-2.2*sin(x*.043)-abs(x+5.)*.018;}float shoreFar(float x){return -100.+3.2*sin(x*.039+1.2);}float shoreDistance(vec2 p){return max(max(p.y-shoreNear(p.x),shoreFar(p.x)-p.y),abs(p.x+10.)-(108.+12.*sin((p.y+100.)/86.*3.14159265)));}`;
 function create(){
  const placements=[],paths=[],crossings=[],reserves=[],flowerCores=[],animalPaths=[],waterPlacements=[];
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  const waveHeight=(x,z,time)=>smooth(.7,4,-distanceToShore(x,z))*(Math.sin(x*.32+z*.51+time*.18)*.075+Math.sin(x*1.07-z*.76-time*.13)*.04);
  const waveGLSL=`float waveHeight(vec2 p,float t){return smoothstep(.7,4.,-shoreDistance(p))*(sin(p.x*.32+p.y*.51+t*.18)*.075+sin(p.x*1.07-p.y*.76-t*.13)*.04);}`;
  const segmentDistance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};
  function corridorHit(p,points,width){for(let i=1;i<points.length;i++)if(segmentDistance(p.x,p.z,points[i-1],points[i])<p.radius+width)return true;return false;}
  function obstacleErrors(p){
   const errors=[],flower=p.kind==='flower'||p.kind==='flower-cluster',animal=p.kind==='land-animal';
   if(!flower&&!animal)return errors;
   // The room slab plus a 0.35 m perimeter. No change to terrain or the existing room geometry.
   if(p.x+p.radius>-.35&&p.x-p.radius<8.35&&p.z+p.radius>-.35&&p.z-p.radius<7.05)errors.push('room footprint');
   for(const q of placements){if(!['house','rock','path-stone','fence','tree'].includes(q.kind))continue;const r=q.kind==='tree'?Math.min(.42,q.radius):q.radius;if(Math.hypot(p.x-q.x,p.z-q.z)<p.radius+r+.18)errors.push('obstacle '+q.id);}
   for(const q of paths)if(corridorHit(p,q.points,q.radius+.35))errors.push('road '+q.id);
   for(const q of crossings)if(corridorHit(p,[q.start,q.end],q.width/2+.35))errors.push('pier '+q.id);
   if(flower)for(const q of reserves)if(corridorHit(p,q.points,q.radius+.18))errors.push('animal reserve '+q.id);
   if(animal)for(const q of flowerCores)if(Math.hypot(p.x-q.x,p.z-q.z)<p.radius+q.coreRadius)errors.push('flower core '+q.id);
   return [...new Set(errors)];
  }
  function validate(p){
   const invalid=[];
   if(![p.x,p.z,p.baseY,p.radius,p.clearance].every(Number.isFinite))return ['non-finite placement'];
   if(p.baseY<waterLevel+p.clearance-1e-5)invalid.push('below water clearance');
   // Check the complete footprint, not only the centre. Radius is the root/footprint exclusion allowance; tree crowns may overhang.
   for(let i=0;i<17;i++){
    const a=i*Math.PI/8,r=i===16?0:p.radius,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
    if(surfaceType(x,z)!=='land')invalid.push('water or shore exclusion band');
    if(!inZone(x,z,p.zone))invalid.push('outside spawn zone');
   }
   if(Math.abs(p.baseY-terrainHeight(p.x,p.z))>.025)invalid.push('base does not follow terrain');
   return [...new Set(invalid.concat(obstacleErrors(p)))];
  }
  function place(kind,x,z,options={}){
   const p={id:kind+'-'+placements.length,kind,x,z,baseY:terrainHeight(x,z),radius:.2,clearance:.12,...options};
   const errors=validate(p);if(errors.length)throw new Error(p.id+': '+errors.join(', '));placements.push(p);return p;
  }
  function sample(kind,zone,rand,options={},accept=()=>true){
   const b=zones[zone];for(let i=0;i<2000;i++){const x=b.x[0]+rand()*(b.x[1]-b.x[0]),z=b.z[0]+rand()*(b.z[1]-b.z[0]);const p={kind,x,z,baseY:terrainHeight(x,z),radius:.2,clearance:.12,zone,...options};if(!validate(p).length&&accept(p))return place(kind,x,z,{zone,...options});}throw new Error('No legal spawn: '+kind+' / '+zone);
  }
  function path(id,points,radius=.35){
   const samples=[];for(let i=1;i<points.length;i++)for(let n=0;n<=40;n++){const t=n/40,x=points[i-1][0]*(1-t)+points[i][0]*t,z=points[i-1][1]*(1-t)+points[i][1]*t,p={id,kind:'path',x,z,baseY:terrainHeight(x,z),radius,clearance:.12};const errors=validate(p);if(errors.length)throw new Error('Invalid path '+id+': '+errors);samples.push(p);}
   const route={id,points,samples,radius};paths.push(route);return route;
  }
  function crossing(id,start,end,width,deckY){
   if(surfaceType(...start)!=='land'||surfaceType(...end)!=='water'||deckY<waterLevel+.15)throw new Error('Invalid shoreline crossing '+id);
   const c={id,kind:'shoreline-crossing',start,end,width,deckY};crossings.push(c);return c;
  }
  function audit(){const invalid=placements.flatMap(p=>validate(p).map(reason=>({id:p.id,reason})));for(const p of waterPlacements)for(const reason of validateWater(p))invalid.push({id:p.id,reason});for(const route of [...paths,...animalPaths,...reserves])for(const p of route.samples)for(const reason of (route.medium==='water'?validateWater(p):validate(p)))invalid.push({id:route.id,reason});return {total:placements.length,waterAnimals:waterPlacements.length,counts:placements.reduce((a,p)=>(a[p.kind]=(a[p.kind]||0)+1,a),{}),invalid,paths:[...paths,...animalPaths].map(p=>({id:p.id,samples:p.samples.length})),crossings,waterLevel,shoreSafeBand};}
  function validateWater(p){
   if(![p.x,p.z,p.baseY,p.radius].every(Number.isFinite))return ['non-finite water placement'];
   const errors=[],band=p.shoreClearance??2.5;
   for(let i=0;i<17;i++){const a=i*Math.PI/8,r=i===16?0:p.radius,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;if(distanceToShore(x,z)>-band)errors.push('water shoreline clearance');if(waterLevel-terrainHeight(x,z)<(p.minDepth??.8))errors.push('insufficient water depth');}
   if(p.bounds&&(p.x<p.bounds.x[0]||p.x>p.bounds.x[1]||p.z<p.bounds.z[0]||p.z>p.bounds.z[1]))errors.push('outside water species zone');
   if(p.baseY>waterLevel+.03||p.baseY<terrainHeight(p.x,p.z)+.15)errors.push('water vertical range');
   for(const q of crossings)if(corridorHit(p,[q.start,q.end],q.width/2+1))errors.push('water pier clearance');
   return [...new Set(errors)];
  }
  function motionPath(id,points,options={}){
   const samples=[],water=options.medium==='water';
   for(let i=1;i<points.length;i++){const n=Math.max(2,Math.ceil(Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])/.1));for(let k=0;k<=n;k++){const t=k/n,x=points[i-1][0]*(1-t)+points[i][0]*t,z=points[i-1][1]*(1-t)+points[i][1]*t;const p={kind:water?'water-animal':'land-animal',id,x,z,baseY:water?waterLevel-(options.submerge||0):terrainHeight(x,z),radius:.3,clearance:.12,...options};const errors=water?validateWater(p):validate(p);if(errors.length)return {id,valid:false,errors,samples};samples.push(p);}}
   return {id,points:points.map(p=>p.slice()),samples,valid:true,medium:options.medium||'land',radius:options.radius||.3};
  }
  function reserve(id,points,radius){const route=motionPath(id,points,{radius});if(!route.valid)throw new Error(id+': '+route.errors);reserves.push({...route,radius});return route;}
  return {waterLevel,waveHeight,waveGLSL,shoreSafeBand,nearShore,farShore,halfWidth,baseTerrainHeight,mountainLayerHeight,terrainHeight,distanceToShore,surfaceType,zones,placements,waterPlacements,paths,crossings,reserves,flowerCores,animalPaths,validate,validateWater,obstacleErrors,motionPath,reserve,place,sample,path,crossing,audit,glsl};
 }
 return {create,waterLevel,nearShore,farShore,terrainHeight,distanceToShore,surfaceType,glsl};
})();
