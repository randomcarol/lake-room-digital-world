/* Eight shared-material timber houses, a shoreline crossing, two rowboats and three distant walkers. */
window.LakesideVillage={create(scene,surface,uniforms){
 const T=THREE,A=LandscapeAssets,rand=A.random(712),batches=new Map(),d=new T.Object3D(),houses=[];
 const material=(color,map)=>new T.MeshStandardMaterial({color,map,roughness:.92});
 const siding=A.siding(),walls=['#87392f','#c3a05d','#58737f','#d5ceaf','#84684b'].map(c=>material(c,siding));
 const roof=material('#4c5552',siding),trim=material('#d8cdb2'),wood=material('#68503b',siding),foundation=material('#69706a');
 const darkGlass=material('#273e45'),litGlass=new T.MeshStandardMaterial({color:'#8d9d93',emissive:'#ffbd68',emissiveIntensity:0,roughness:.36});
 const geoBox=new T.BoxGeometry(1,1,1);
 function add(g,m,x,y,z,sx=1,sy=1,sz=1,rz=0,ry=0){d.position.set(x,y,z);d.rotation.set(0,ry,rz);d.scale.set(sx,sy,sz);d.updateMatrix();if(!batches.has(m))batches.set(m,[]);batches.get(m).push([g,d.matrix.clone()]);}
 const box=(m,x,y,z,w,h,depth,rz=0)=>add(geoBox,m,x,y,z,w,h,depth,rz);
 function gable(w,rise,depth){const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,rise);shape.closePath();return new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1}).translate(0,0,-depth/2);}
 for(let i=0;i<8;i++){
  const x=-79+i*7.7,z=surface.farShore(x)-8.5-(i%3)*1.25,variant=i%3,w=variant===1?4.5:3.5,h=variant===2?3.8:2.8,depth=3.6,rise=variant===0?2.2:variant===1?1.25:2.1;
  const p=surface.place('house',x,z,{radius:3.8,zone:'village',variant:['steep-gable','long-cottage','balcony-house'][variant]});houses.push(p);const y=p.baseY+.12,m=walls[i%5];
  box(foundation,x,y+.12,z,w+.18,.24,depth+.18);box(m,x,y+h/2+.24,z,w,h,depth);add(gable(w,rise,depth),m,x,y+h+.24,z);
  const angle=Math.atan2(rise,w/2),slope=Math.hypot(w/2,rise)+.24;
  for(const sign of [-1,1])box(roof,x+sign*w/4,y+h+.24+rise/2,z,slope,.15,depth+.50,-sign*angle);
  // Eaves and corner boards are actual geometry, visible at silhouette distance.
  for(const sign of [-1,1]){box(trim,x+sign*w/2,y+h/2+.24,z+depth/2+.025,.11,h,.10);box(trim,x+sign*w/4,y+h+.25+rise/2,z+depth/2+.23,slope,.11,.12,-sign*angle);}
  const glass=i<4?litGlass:darkGlass;
  for(const sign of [-1,1]){
   const wx=x+sign*w*.27,wy=y+1.65,wz=z+depth/2+.04;
   box(trim,wx,wy,wz,.91,1.18,.12);box(glass,wx,wy,wz+.075,.70,.96,.05);box(trim,wx,wy,wz+.11,.06,1,.04);box(trim,wx,wy,wz+.11,.72,.055,.04);
   box(trim,x+sign*(w/2+.04),y+1.6,z,.10,1.05,.84);box(glass,x+sign*(w/2+.11),y+1.6,z,.05,.85,.64);
  }
  box(trim,x,y+.99,z+depth/2+.08,.87,1.75,.10);box(wood,x,y+.96,z+depth/2+.145,.65,1.63,.08);box(trim,x+.23,y+1.0,z+depth/2+.2,.06,.07,.06);
  box(trim,x,y+h+.65,z+depth/2+.035,.67,.80,.09);box(glass,x,y+h+.65,z+depth/2+.095,.49,.61,.04);
  if(i%2===0)box(foundation,x+w*.27,y+h+rise*.85,z-.6,.45,1.5,.5);
  if(variant===1){box(roof,x-w*.36,y+1.85,z+2.15,1.6,.13,1.2,-.12);box(wood,x-w*.36-.65,y+.95,z+2.55,.10,1.8,.10);}
  if(variant===2){box(wood,x,y+2.55,z+2.08,2.5,.15,1.0);box(trim,x,y+3.15,z+2.5,2.5,.09,.09);for(let k=0;k<6;k++)box(trim,x-1.15+k*.46,y+2.9,z+2.5,.06,.65,.06);}
 }
 const routePoints=[];for(let i=0;i<=32;i++){const x=-83+i*2.1;routePoints.push([x,surface.farShore(x)-4.5]);}
 surface.path('village-lane',routePoints,.65);
 const roadPositions=[],roadNormals=[],roadUV=[];
 for(let i=1;i<routePoints.length;i++){const a=routePoints[i-1],b=routePoints[i];for(const [pt,side] of [[a,-1],[b,-1],[a,1],[a,1],[b,-1],[b,1]]){const z=pt[1]+side*.65;roadPositions.push(pt[0],surface.terrainHeight(pt[0],z)+.045,z);roadNormals.push(0,1,0);roadUV.push(pt[0]/4,side);}}
 const roadGeo=new T.BufferGeometry();roadGeo.setAttribute('position',new T.Float32BufferAttribute(roadPositions,3));roadGeo.setAttribute('normal',new T.Float32BufferAttribute(roadNormals,3));roadGeo.setAttribute('uv',new T.Float32BufferAttribute(roadUV,2));add(roadGeo,material('#b2a58c'),0,0,0);
 for(let i=0;i<12;i++){const x=-83+i*.7,z=surface.farShore(x)-6;const p=surface.place('fence',x,z,{radius:.15});box(wood,x,p.baseY+.45,z,.09,.9,.09);if(i<11){box(wood,x+.35,p.baseY+.4,z,.74,.08,.07);box(wood,x+.35,p.baseY+.73,z,.74,.07,.07);}}
 const dx=-46,sz=surface.farShore(dx),deckY=.28;
 surface.crossing('village-pier',[dx,sz-3.5],[dx,sz+7],2.2,deckY);
 for(let i=0;i<19;i++){const z=sz-3.5+i*.56;box(wood,dx,deckY,z,2.2,.13,.52);if(i%5===0)for(const sign of [-1,1])box(wood,dx+sign*.95,deckY-.75,z,.16,1.8,.16);}
 const floats=[];
 for(let i=0;i<2;i++){
  const x=dx+(i===0?3.8:-4),z=sz+4+i*2;if(surface.surfaceType(x,z)!=='water')throw new Error('Boat outside water');floats.push({x,z,kind:'boat'});
  const shape=new T.Shape();shape.moveTo(0,-1.65);shape.quadraticCurveTo(1.2,-.75,.7,1.15);shape.quadraticCurveTo(0,1.8,-.7,1.15);shape.quadraticCurveTo(-1.2,-.75,0,-1.65);
  const outline=shape.getPoints(10),verts=[];
  function ringPoint(k,scale,y){const p=outline[k%outline.length];return [p.x*scale,y,p.y*scale];}
  function strip(sa,ya,sb,yb){for(let k=0;k<outline.length;k++){const a=ringPoint(k,sa,ya),b=ringPoint(k+1,sa,ya),c=ringPoint(k,sb,yb),d=ringPoint(k+1,sb,yb);verts.push(...a,...b,...c,...b,...d,...c);}}
  strip(.58,0,1,.5);strip(1,.5,.86,.5);strip(.86,.5,.55,.17);
  const hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(verts,3));hull.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(verts.length/3*2),2));hull.computeVertexNormals();add(hull,walls[i===0?2:0],x,surface.waterLevel-.12,z);
  box(wood,x,surface.waterLevel+.07,z,.73,.06,2.1);
  box(wood,x,surface.waterLevel+.32,z,1.2,.07,.22);box(wood,x,surface.waterLevel+.32,z+.7,1.1,.07,.22);
 }
 const root=new T.Group();root.name='opposite-bank-village';scene.add(root);
 for(const [m,parts] of batches){const mesh=new T.Mesh(A.merge(parts),m);mesh.name='village-batch';root.add(mesh);}
 // Baked-style contact occlusion grounds distant foundations without eight realtime shadow casters.
 const aoMap=A.texture(64,64,c=>{const g=c.createRadialGradient(32,32,8,32,32,32);g.addColorStop(0,'rgba(15,24,21,.48)');g.addColorStop(1,'rgba(15,24,21,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
 const ao=new T.InstancedMesh(new T.PlaneGeometry(6.6,6.6).rotateX(-Math.PI/2),new T.MeshBasicMaterial({map:aoMap,transparent:true,depthWrite:false,opacity:.5}),houses.length);ao.name='village-foundation-occlusion';houses.forEach((p,i)=>{d.position.set(p.x,p.baseY+.018,p.z);d.rotation.set(0,0,0);d.scale.setScalar(1);d.updateMatrix();ao.setMatrixAt(i,d.matrix);});root.add(ao);
 const walkerGeo=new T.PlaneGeometry(.9,1.8).translate(0,.9,0);walkerGeo.setAttribute('agentRow',new T.InstancedBufferAttribute(new Float32Array([0,1,2]),1));
 const walkerMaterial=new T.ShaderMaterial({uniforms:{atlas:{value:A.walkers()},time:uniforms.time,night:uniforms.night},transparent:false,side:T.DoubleSide,vertexShader:`attribute float agentRow;varying vec2 vUV;varying float row;void main(){vUV=uv;row=agentRow;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy;gl_Position=projectionMatrix*center;}`,fragmentShader:`uniform sampler2D atlas;uniform float time,night;varying vec2 vUV;varying float row;void main(){float frame=mod(floor(time*3.+row),4.);vec4 c=texture2D(atlas,vec2((vUV.x+frame)/4.,1.-(1.-vUV.y+row)/4.));if(c.a<.5)discard;gl_FragColor=vec4(c.rgb*(1.-night*.65),1.);}`});
 const walkers=new T.InstancedMesh(walkerGeo,walkerMaterial,3);walkers.name='village-walking-impostors';walkers.frustumCulled=false;root.add(walkers);
 const agents=[];for(let i=0;i<3;i++){const x=-70+i*15,z=surface.farShore(x)-4.5;agents.push(surface.place('person',x,z,{radius:.4}));const pts=[];for(let k=0;k<=12;k++){const xx=x-3+k*.5;pts.push([xx,surface.farShore(xx)-4.5]);}surface.path('inhabitant-'+i,pts,.4);}
 walls.forEach(m=>m.color.convertSRGBToLinear());wood.color.convertSRGBToLinear();
 return {root,houses,agents,floats,roof,litGlass,update(t,season,night,dusk){roof.color.set(season.villageRoof).convertSRGBToLinear();litGlass.emissive.set(season.windowLight);litGlass.emissiveIntensity=Math.max(night*.95,dusk*.65);for(let i=0;i<3;i++){const a=agents[i];a.x=-70+i*15+Math.sin(t*.045+i*2)*3;a.z=surface.farShore(a.x)-4.5;a.baseY=surface.terrainHeight(a.x,a.z);d.position.set(a.x,a.baseY,a.z);d.rotation.set(0,0,0);d.scale.setScalar(1);d.updateMatrix();walkers.setMatrixAt(i,d.matrix);}walkers.instanceMatrix.needsUpdate=true;},dispose(){scene.remove(root);}};
}};
