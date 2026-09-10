/* Lake world for THREE r128. Surface placement, sun rig and village are independent contracts. */
window.OutdoorEnvironment={create(scene,lights){
 const T=THREE,A=LandscapeAssets,state=WorldState.create(),surface=WorldSurface.create(),rand=A.random(2048),rig=SunRig.create(scene,lights);
 const root=new T.Group();root.name='lake-world';scene.add(root);
 const uniforms={time:{value:0},night:{value:0},dusk:{value:0},snow:{value:0},snowLine:{value:34},sunDirection:{value:rig.direction},sunColor:{value:rig.color},sky:{value:new T.Color()},waterColor:{value:new T.Color()},villageLight:{value:0}};
 const noise=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}float fbm(vec2 p){return noise(p)*.57+noise(p*2.03)*.27+noise(p*4.07)*.12;}`;
 const skyGLSL=`vec3 skyAt(vec3 d){float h=max(d.y,0.);vec3 col=mix(vec3(.56,.71,.77),sky,pow(h,.48));col=mix(col,vec3(.72,.36,.18),dusk*pow(1.-h,3.)*.55);col=mix(col,mix(vec3(.045,.075,.12),vec3(.007,.017,.04),sqrt(h)),night);vec2 cp=d.xz/max(.18,d.y+.23)*2.;float c=smoothstep(.51,.72,fbm(cp+vec2(time*.0015,0.)))*smoothstep(.015,.25,d.y);col=mix(col,mix(vec3(.84,.88,.86),vec3(.07,.10,.15),night),c*.75);float disc=smoothstep(.9994,.99985,dot(d,sunDirection));col+=sunColor*disc*(1.-night);return col;}`;
 const skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms,vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time,night,dusk;uniform vec3 sky,sunDirection,sunColor;varying vec3 direction;${noise}${skyGLSL}void main(){gl_FragColor=vec4(skyAt(normalize(direction)),1.);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}`});
 const sky=new T.Mesh(new T.SphereGeometry(380,32,16),skyMaterial);sky.name='shared-sun-atmosphere';root.add(sky);scene.fog=new T.FogExp2('#9bb6bd',rig.config.fogDensity);
 // Shared world-space geology. Normal perturbation and strata are procedural: no third-party bitmap.
 function surfaceShader(material,kind){material.onBeforeCompile=s=>{
  s.uniforms.worldSnow=uniforms.snow;s.uniforms.worldSnowLine=uniforms.snowLine;
  s.vertexShader='varying vec3 worldP;varying vec3 worldN;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>\nvec4 wp=vec4(transformed,1.);\n#ifdef USE_INSTANCING\nwp=instanceMatrix*wp;\n#endif\nworldP=(modelMatrix*wp).xyz;worldN=normalize(mat3(modelMatrix)*objectNormal);`);
  s.fragmentShader=`varying vec3 worldP;varying vec3 worldN;uniform float worldSnow,worldSnowLine;${noise}\n`+s.fragmentShader;
  let code='';
  if(kind==='mountain')code=`float grain=fbm(worldP.xz*.32+worldP.yy*.09);float strata=sin(worldP.y*2.7+noise(worldP.xz*.30)*10.+noise(worldP.xz*.073)*18.);float slope=1.-abs(normalize(worldN).y);float cliff=smoothstep(.055,.24,slope);vec3 rock=mix(vec3(.27,.31,.32),vec3(.55,.54,.49),grain)*(.91+.09*strata);float fissure=pow(1.-abs(sin(worldP.x*.36+worldP.z*.25+noise(worldP.xz*.07)*4.)),12.);rock*=1.-fissure*.2;diffuseColor.rgb=mix(diffuseColor.rgb*(.70+grain*.48),rock,cliff*.87);float snowMask=smoothstep(worldSnowLine-4.,worldSnowLine+4.,worldP.y+noise(worldP.xz*.24)*6.)*(1.-cliff*.63);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.88,.88),snowMask);`;
  else if(kind==='terrain')code=`float grain=fbm(worldP.xz*.65);diffuseColor.rgb*=.83+grain*.3;float shore=shoreDistance(worldP.xz);diffuseColor.rgb=mix(vec3(.33,.32,.25),diffuseColor.rgb,smoothstep(0.,2.7,shore));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.80,.85,.84),worldSnow*.35*smoothstep(2.,7.,shore));`;
  else code=`float grain=noise(worldP.xz*4.+worldP.yy);diffuseColor.rgb*=.82+grain*.28;float cap=smoothstep(.05,.8,worldN.y);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.84,.88,.86),worldSnow*cap*.9);`;
  if(kind==='terrain')s.fragmentShader=surface.glsl+'\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+code);
  if(kind==='mountain')s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(noise(worldP.xz*1.4+worldP.yy)-.5,noise(worldP.yz*1.7)-.5,0.)*.06);');
 };material.customProgramCacheKey=()=>`surface-${kind}-v1`;}
 const terrainGeo=new T.PlaneGeometry(560,510,180,166);terrainGeo.rotateX(-Math.PI/2);terrainGeo.translate(-10,0,-85);
 const pos=terrainGeo.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,surface.baseTerrainHeight(pos.getX(i),pos.getZ(i)));terrainGeo.computeVertexNormals();
 const terrainMat=new T.MeshStandardMaterial({color:'#65874a',roughness:1});surfaceShader(terrainMat,'terrain');const terrain=new T.Mesh(terrainGeo,terrainMat);terrain.name='sampled-terrain';terrain.receiveShadow=true;root.add(terrain);
 // Continuous folds around independent peaks: exposed faces, subsidiary ridges and shaded gullies.
 const mountains=[];
 for(let layer=0;layer<2;layer++){
  const g=new T.PlaneGeometry(480,130,160,50);g.rotateX(-Math.PI/2);g.translate(-12,0,-178-layer*58);const p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,surface.mountainLayerHeight(p.getX(i),p.getZ(i),layer));
  g.computeVertexNormals();const vertexColors=[];for(let i=0;i<p.count;i++){const v=.78+.13*Math.sin(p.getX(i)*.41+p.getZ(i)*.13)*Math.sin(p.getY(i)*.9)+.09*g.attributes.normal.getY(i);vertexColors.push(v,v,v);}g.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));const m=new T.MeshStandardMaterial({color:'#777e73',vertexColors:true,roughness:.96,side:T.DoubleSide});surfaceShader(m,'mountain');const mesh=new T.Mesh(g,m);mesh.name='folded-rock-massif-'+layer;root.add(mesh);mountains.push(m);
 }
 const waterMat=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,fragmentShader:`uniform float time,night,dusk,villageLight;uniform vec3 sky,waterColor,sunDirection,sunColor;varying vec3 world;${noise}${surface.glsl}${skyGLSL}
 void main(){vec2 p=world.xz;float depth=-shoreDistance(p);if(depth<0.)discard;
 // Analytic derivatives of three repeating waves are the water normal (no flat colour-only ripples).
 float w1=p.x*.83+p.y*1.31+time*.65,w2=p.x*2.17-p.y*1.8-time*.42+noise(p*.4)*3.,w3=p.x*5.7+p.y*4.3+time*.8;
 vec3 n=normalize(vec3(cos(w1)*.018+cos(w2)*.014+cos(w3)*.006,1.,cos(w1)*.028-cos(w2)*.018+cos(w3)*.006));
 vec3 view=normalize(cameraPosition-world),reflected=reflect(-view,n);float fresnel=.035+.80*pow(1.-max(dot(view,n),0.),4.);
 vec3 base=mix(vec3(.075,.30,.29),waterColor,smoothstep(0.,12.,depth));base=mix(base,vec3(.009,.029,.055),night*.9);
 vec3 col=mix(base,skyAt(normalize(reflected+vec3(0.,.28,0.))),fresnel*.38);
 vec3 halfDir=normalize(view+sunDirection);float spec=pow(max(dot(n,halfDir),0.),150.);float broad=pow(max(dot(n,halfDir),0.),34.);
 float breakup=.30+.70*noise(p*vec2(1.8,8.)+time*.13);col+=mix(vec3(1.,.44,.075),vec3(.50,.68,.88),night)*(spec*1.3+broad*.10)*breakup*(1.-night*.72);
 float foam=(1.-smoothstep(.15,1.1,depth))*(.4+.6*noise(p*3.+time*.1));col=mix(col,vec3(.54,.66,.63),foam*.25);
 float distantGlow=exp(-pow((p.x+49.+sin(p.y*3.+time)*.7)/19.,2.))*exp(-pow((p.y+93.)/5.,2.));col+=vec3(.17,.072,.016)*distantGlow*villageLight*noise(p*vec2(2.,9.));
 gl_FragColor=vec4(col,smoothstep(0.,.65,depth));\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}`});
 const water=new T.Mesh(new T.PlaneGeometry(270,112),waterMat);water.rotation.x=-Math.PI/2;water.position.set(-10,surface.waterLevel,-59);water.name='shore-clipped-blue-lake';root.add(water);
 const barkMat=new T.MeshStandardMaterial({color:'#65503b',map:A.bark(),roughness:1});
 const pineMat=new T.MeshStandardMaterial({color:'#244d3c',roughness:1});surfaceShader(pineMat,'foliage');
 const leafMats=['#427839','#649342','#83a348'].map(color=>{const m=new T.MeshStandardMaterial({color,roughness:1});surfaceShader(m,'foliage');return m;});
 const pineGeo=A.solidPine(),crownGeo=A.crown(),trunkGeo=new T.CylinderGeometry(.018,.037,1,7).translate(0,.5,0),dummy=new T.Object3D(),forests=[];
 function instance(geo,mat,entries,name,shadows=false,scaleFactor=1){
  const mesh=new T.InstancedMesh(geo,mat,entries.length);mesh.name=name;mesh.userData.placementIds=entries.map(e=>e.p.id);mesh.userData.baseAnchored=true;
  entries.forEach((e,i)=>{dummy.position.set(e.p.x,e.p.baseY,e.p.z);dummy.rotation.set(0,e.rot||0,0);dummy.scale.set(e.h,e.h*scaleFactor,e.h);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=shadows;mesh.receiveShadow=shadows;root.add(mesh);return mesh;
 }
 const near=[];
 // Keep the window's central cone open. Side framing trees and their shadows remain near the room.
 for(const [x,z,h,type] of [[-6,-8,4.8,1],[-13,-5,7.5,0],[20,-4,8.3,0],[-23,-8,8.2,1],[29,-9,8.7,1],[-8,10,6,1],[21,11,7.2,0],[-32,-8,9,0],[37,-10,8,1]])near.push({p:surface.place('tree',x,z,{radius:2.5,tier:'near',species:type?'deciduous':'conifer'}),h,rot:rand()*6,type});
 function treeBatches(entries,prefix,shadows){instance(pineGeo,pineMat,entries.filter(e=>!e.type),prefix+'-conifers',shadows);for(let j=0;j<3;j++)instance(crownGeo,leafMats[j],entries.filter((e,i)=>e.type&&i%3===j),prefix+'-deciduous-'+j,shadows);instance(trunkGeo,barkMat,entries,prefix+'-trunks',shadows,.67);}
 treeBatches(near,'near',true);
 const spraysMat=new T.MeshStandardMaterial({color:'#446442',map:A.needles(),alphaTest:.35,side:T.DoubleSide,roughness:1});surfaceShader(spraysMat,'foliage');instance(A.pineGeometry(),spraysMat,near.filter(e=>!e.type),'near-needle-sprays');
 const middle=[];
 for(let i=0;i<126;i++){
  const p=surface.sample('tree','middle',rand,{radius:1.4,tier:'middle'},p=>{
   if(p.z>-102&&Math.abs(p.x+10)<127)return false;
   // Open meadow in front of the village and alternating forest clusters behind it.
   if(p.x>-89&&p.x<-12&&p.z>-125)return false;
   return p.baseY<18&&Math.sin(p.x*.13)+Math.cos(p.z*.17)>.15;
  });const type=i%3===0;p.species=type?'deciduous':'conifer';middle.push({p,h:3.6+rand()*3.6,rot:rand()*6,type});
 }
 treeBatches(middle,'middle',false);
 // Far tier: only isolated single-plane silhouettes, below ridgelines and softened by fog.
 const farMat=new T.MeshStandardMaterial({color:'#3c6050',map:A.pine(),alphaTest:.32,side:T.DoubleSide,roughness:1});
 const farEntries=[];for(let i=0;i<66;i++){const p=surface.sample('tree','far',rand,{radius:1,tier:'far',species:'conifer'},p=>p.baseY<18&&Math.sin(p.x*.11+p.z*.05)>.5);farEntries.push({p,h:1.5+rand()*1.2,rot:.48});}
 const far=instance(new T.PlaneGeometry(.9,1.8).translate(0,.9,0),farMat,farEntries,'sparse-far-impostors');forests.push(far);
 const rockGeo=new T.DodecahedronGeometry(1,0);rockGeo.translate(0,1,0);const rockMat=new T.MeshStandardMaterial({color:'#72786e',roughness:1});surfaceShader(rockMat,'foliage');const rockEntries=[];
 for(let i=0;i<18;i++){const x=-46+i*5.1,z=surface.nearShore(x)+3.3+rand()*1.8;rockEntries.push({p:surface.place('rock',x,z,{radius:.7}),h:.20+rand()*.33,rot:rand()*6});}
 instance(rockGeo,rockMat,rockEntries,'dry-shore-stones',true,.6);
 const shrubMat=new T.MeshStandardMaterial({color:'#587f3c',roughness:1});surfaceShader(shrubMat,'foliage');const shrubs=[];
 for(let i=0;i<25;i++){const p=surface.sample('shrub',i<10?'near':'village',rand,{radius:.55},p=>i<10||p.z<surface.farShore(p.x)-13);shrubs.push({p,h:.7+rand()*.6,rot:rand()*6});}instance(crownGeo,shrubMat,shrubs,'scattered-shrubs');
 const grassGeo=new T.BufferGeometry();grassGeo.setAttribute('position',new T.Float32BufferAttribute([-.12,0,0,-.05,.48,.04,.01,0,0,0,0,.03,.10,.35,0,.1,0,-.01,-.04,0,-.07,.03,.30,-.16,.03,0,0],3));grassGeo.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,0,0,0,0,1,1,0,0,0,0,1,1,0],2));grassGeo.computeVertexNormals();const grassMat=new T.MeshStandardMaterial({color:'#65874a',side:T.DoubleSide,roughness:1});const grasses=[];
 for(let i=0;i<90;i++){const x=(rand()-.5)*85,z=surface.nearShore(x)+3.6+rand()*5;grasses.push({p:surface.place('grass',x,z,{radius:.25}),h:.45+rand()*.6,rot:rand()*6});}instance(grassGeo,grassMat,grasses,'rooted-grass');
 const flowersTexture=A.texture(128,128,c=>{c.strokeStyle='#597638';c.lineWidth=3;c.beginPath();c.moveTo(63,126);c.bezierCurveTo(58,90,76,57,64,28);c.stroke();c.fillStyle='#699146';for(const side of [-1,1]){c.beginPath();c.ellipse(64+side*9,80,15,5,side*.7,0,Math.PI*2);c.fill();}for(let k=0;k<5;k++){const a=k*6.28/5;c.fillStyle='#e8c9ad';c.beginPath();c.ellipse(64+Math.cos(a)*9,27+Math.sin(a)*9,7,4,a,0,Math.PI*2);c.fill();}c.fillStyle='#b9973c';c.beginPath();c.arc(64,27,4,0,6.28);c.fill();});
 const flowerMat=new T.MeshStandardMaterial({map:flowersTexture,alphaTest:.4,side:T.DoubleSide,roughness:1}),flowerEntries=[];
 for(let i=0;i<16;i++){const x=-9+rand()*18,z=surface.nearShore(x)+4+rand()*4;flowerEntries.push({p:surface.place('flower',x,z,{radius:.2}),h:.35+rand()*.2,rot:rand()*6});}
 const flowers=instance(new T.PlaneGeometry(.5,1).translate(0,.5,0),flowerMat,flowerEntries,'rooted-spring-wildflowers');
 // A modest near-shore boardwalk: planks and supports are merged into two shadow-casting draws.
 const woodMat=new T.MeshStandardMaterial({color:'#92704f',map:A.siding(),roughness:.94}),dockParts=[];
 const dx=16,sz=surface.nearShore(dx);surface.crossing('near-pier',[dx,sz+3.5],[dx,sz-4],2.8,.02);
 for(let i=0;i<14;i++){dummy.position.set(dx,.02,sz+3.5-i*.55);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();dockParts.push([new T.BoxGeometry(2.8,.13,.51),dummy.matrix.clone()]);if(i%4===0)for(const sign of [-1,1]){dummy.position.set(dx+sign*1.15,-.75,sz+3.5-i*.55);dummy.updateMatrix();dockParts.push([new T.BoxGeometry(.16,1.8,.16),dummy.matrix.clone()]);}}
 const dock=new T.Mesh(A.merge(dockParts),woodMat);dock.name='near-shore-boardwalk';dock.castShadow=dock.receiveShadow=true;root.add(dock);
 const pathPts=[[8.7,-.5],[11.5,-4],[14,-8],[16,sz+4.5]];surface.path('room-to-pier',pathPts,.5);
 const steps=[];for(let i=0;i<9;i++){const x=8.7+i*.8,z=-.5-i*1.2;steps.push({p:surface.place('path-stone',x,z,{radius:.6}),h:.65,rot:.07*Math.sin(i)});}instance(new T.BoxGeometry(1.4,.12,.9).translate(0,.06,0),rockMat,steps,'grounded-path-stones',true);
 const village=LakesideVillage.create(scene,surface,uniforms);
 const starsGeo=new T.BufferGeometry(),starPos=[];for(let i=0;i<220;i++){const a=rand()*6.28,e=.15+rand()*1.25;starPos.push(Math.cos(a)*Math.cos(e)*300,Math.sin(e)*300,Math.sin(a)*Math.cos(e)*300);}starsGeo.setAttribute('position',new T.Float32BufferAttribute(starPos,3));const stars=new T.Points(starsGeo,new T.PointsMaterial({color:'#bcd1eb',size:.32,transparent:true,opacity:0,depthWrite:false}));root.add(stars);
 const moon=new T.Mesh(new T.SphereGeometry(2.5,16,12),new T.MeshBasicMaterial({color:'#dbe5e0'}));moon.name='moon';moon.position.set(-105,83,-205);root.add(moon);
 const particlePos=new Float32Array(64*3);for(let i=0;i<64;i++){particlePos[i*3]=(rand()-.5)*45;particlePos[i*3+1]=rand()*15;particlePos[i*3+2]=-8-rand()*25;}const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(particlePos,3));const particles=new T.Points(pg,new T.PointsMaterial({color:'#e9eeee',size:.045,transparent:true,opacity:.65,depthWrite:false}));root.add(particles);
 const animals=AnimalSystem.createDisabled(scene),lamp=new T.PointLight('#ffc181',0,7,2);lamp.position.set(3.72,1.58,1.95);root.add(lamp);
 const dev=location.hostname==='localhost'||location.hostname==='127.0.0.1';let debug=null,debugLegend=null,quality='high',appearanceKey='';
 function setDebug(enabled){
  if(!dev)return false;
  if(enabled&&!debug){debug=new T.Group();debug.name='world-surface-debug';scene.add(debug);
   const line=(points,color,loop=false)=>{const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const m=new T.LineBasicMaterial({color,depthTest:false});const l=loop?new T.LineLoop(g,m):new T.Line(g,m);l.renderOrder=100;debug.add(l);};
   for(const offset of [0,surface.shoreSafeBand]){
    const pts=[];for(let x=-118;x<=98;x+=1)pts.push([x,.35,surface.nearShore(x)+offset]);for(let z=-15;z>=-100;z--)pts.push([surface.halfWidth(z)-10+offset,.35,z]);for(let x=98;x>=-118;x--)pts.push([x,.35,surface.farShore(x)-offset]);for(let z=-100;z<=-15;z++)pts.push([-surface.halfWidth(z)-10-offset,.35,z]);line(pts,offset?'#f4c45a':'#48eaff',true);
   }
   const pointsGeo=new T.BufferGeometry().setFromPoints(surface.placements.map(p=>new T.Vector3(p.x,p.baseY+.6,p.z)));const points=new T.Points(pointsGeo,new T.PointsMaterial({color:'#f26faf',size:3,sizeAttenuation:false,depthTest:false}));points.renderOrder=110;debug.add(points);
   const v=surface.zones.village;line([[v.x[0],1,v.z[0]],[v.x[1],1,v.z[0]],[v.x[1],1,v.z[1]],[v.x[0],1,v.z[1]]],'#d8a0ff',true);
   surface.paths.forEach(p=>line(p.samples.map(p=>[p.x,p.baseY+.3,p.z]),'#ffffff'));
   const helper=new T.CameraHelper(lights.sun.shadow.camera);helper.material.depthTest=false;helper.renderOrder=105;debug.add(helper);debug.userData.shadowHelper=helper;
   const arrow=new T.ArrowHelper(rig.direction.clone().negate(),lights.sun.position,32,0xffd265,3,2);debug.add(arrow);debug.userData.sunArrow=arrow;
   debugLegend=document.createElement('div');debugLegend.style.cssText='position:fixed;left:24px;bottom:52px;background:#14202de8;color:white;padding:14px 18px;font:13px monospace;z-index:100;pointer-events:none;line-height:1.8';debugLegend.textContent='DEV · 青：湖界 | 金：岸线禁种带 / 阴影范围 | 粉：放置点 | 紫：小镇区 | 白：行人 / 动物预留路径';document.body.appendChild(debugLegend);
  }if(debug){debug.visible=enabled;debugLegend.hidden=!enabled;}return true;
 }
 function update(dt,t){
  const sample=state.sample(),season=sample.season,solar=rig.update(sample,season);uniforms.time.value=t;uniforms.night.value=sample.night;uniforms.dusk.value=sample.dusk;uniforms.sky.value.set(season.sky).convertSRGBToLinear().multiplyScalar(.9);uniforms.waterColor.value.set(season.water).multiplyScalar(.50);uniforms.snow.value=season.snow;uniforms.snowLine.value=season.snowLine;uniforms.villageLight.value=Math.max(sample.night,sample.dusk*.7);
  const key=state.season+':'+state.mode;if(key!==appearanceKey){terrainMat.color.set(season.grass).convertSRGBToLinear();grassMat.color.set(season.grass).convertSRGBToLinear();shrubMat.color.set(season.shrub).convertSRGBToLinear();pineMat.color.set(season.conifer).convertSRGBToLinear();spraysMat.color.set(season.conifer).convertSRGBToLinear();farMat.color.set(season.conifer).convertSRGBToLinear().lerp(new T.Color('#91a3a3'),.18);leafMats.forEach((m,i)=>m.color.set(season.deciduous[i]).convertSRGBToLinear());mountains.forEach((m,i)=>m.color.set(season.mountain).convertSRGBToLinear().lerp(new T.Color('#a3b8bd'),i*.19));appearanceKey=key;rig.invalidate();}
  scene.fog.color.set('#9bb6bd').lerp(new T.Color('#15263c'),sample.night);scene.fog.density=rig.config.fogDensity;stars.material.opacity=sample.night*.8;moon.visible=sample.night>.5;moon.position.copy(rig.direction).multiplyScalar(280);lamp.intensity=sample.night*1.9+sample.dusk*.7;
  village.update(t,season,sample.night,sample.dusk);
  flowers.visible=state.season==='spring';
  const n=quality==='low'?Math.min(24,season.particles.count):season.particles.count;particles.visible=n>0;pg.setDrawRange(0,n);particles.material.color.set(season.particles.kind==='leaves'?'#b76b33':season.particles.kind==='petals'?'#ddbbb7':'#eef3f3');particles.material.size=season.particles.kind==='leaves'?.065:.035;
  for(let i=0;i<n;i++){particlePos[i*3]+=Math.sin(t*.2+i)*dt*.05;particlePos[i*3+1]-=Math.min(dt,.1)*.4;if(particlePos[i*3+1]<0)particlePos[i*3+1]=15;}if(n)pg.attributes.position.needsUpdate=true;
  if(debug&&debug.visible){debug.userData.shadowHelper.update();debug.userData.sunArrow.position.copy(lights.sun.position);debug.userData.sunArrow.setDirection(rig.direction.clone().negate());}
 }
 update(0,0);
 if(dev&&new URLSearchParams(location.search).get('debug')==='surface')setDebug(true);
 return {state,surface,water,uniforms,rig,village,animals,birds:[],root,setDebug,
  setNight(v){this.setMode(v?'night':'day');},get isNight(){return state.sample().night>.5;},setMode(v){state.setMode(v);rig.invalidate();update(0,uniforms.time.value);},setSeason(v){state.setSeason(v);rig.invalidate();update(0,uniforms.time.value);},
  setQuality(v){quality=v;far.count=v==='low'?36:farEntries.length;lights.renderer.setPixelRatio(Math.min(devicePixelRatio,v==='low'?1:1.6));},async setVolume(){},update,
  dispose(){
   const geometries=new Set(),materials=new Set(),textures=new Set();
   [root,village.root,debug].filter(Boolean).forEach(group=>group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}));
   materials.forEach(m=>{Object.values(m).forEach(v=>{if(v&&v.isTexture)textures.add(v);});if(m.uniforms)Object.values(m.uniforms).forEach(u=>{if(u.value&&u.value.isTexture)textures.add(u.value);});m.dispose();});textures.forEach(t=>t.dispose());geometries.forEach(g=>g.dispose());
   animals.dispose();village.dispose();scene.remove(root);if(debug)scene.remove(debug);if(debugLegend)debugLegend.remove();
  }
 };
}};
