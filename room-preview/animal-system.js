/* Lightweight low-poly wildlife with small deterministic state machines. */
window.AnimalSystem=(()=>{
 function create(scene,terrainHeight){
  const T=THREE,root=new T.Group(),animals=[],pickables=[];let quality='high';
  root.name='gentle-wildlife';scene.add(root);
  const matte=(color)=>new T.MeshStandardMaterial({color,roughness:.86,flatShading:true});
  const dark=matte('#332c28'),white=matte('#f4f0df'),black=matte('#242b2a'),orange=matte('#c96f3f');
  const add=(parent,geometry,material,position,scale)=>{const mesh=new T.Mesh(geometry,material);mesh.position.fromArray(position||[0,0,0]);if(scale)mesh.scale.fromArray(scale);mesh.castShadow=true;parent.add(mesh);return mesh;};
  function register(group,definition){
   const animal={group,state:'idle',...definition};group.name='animal-'+animal.id;
   group.traverse(object=>{if(object.isMesh){object.userData.animal=animal;pickables.push(object);}});
   animals.push(animal);root.add(group);return animal;
  }

  function fish(){
   const group=new T.Group();add(group,new T.SphereGeometry(.28,12,8),matte('#e99b4e'),[0,0,0],[1,.42,.55]);
   const tail=new T.BufferGeometry();tail.setAttribute('position',new T.Float32BufferAttribute([-.22,0,0,-.48,.2,0,-.48,-.2,0],3));tail.computeVertexNormals();add(group,tail,orange,[0,0,0]);
   const splash=new T.Mesh(new T.RingGeometry(.09,.28,20),new T.MeshBasicMaterial({color:'#bdefff',transparent:true,opacity:.72,side:T.DoubleSide,depthWrite:false}));splash.rotation.x=-Math.PI/2;root.add(splash);
   return register(group,{id:'fish',label:'跃出水面的鱼',story:'它总在湖面最亮的那一小片波光里跃起。',base:new T.Vector3(-9,-.38,-43),splash});
  }
  function swan(id,color,base,phase,story){
   const group=new T.Group(),material=color==='white'?white:black;
   add(group,new T.SphereGeometry(.42,14,9),material,[0,0,0],[1,.55,.62]);
   const neck=add(group,new T.CylinderGeometry(.075,.10,.62,10),material,[.28,.29,0]);neck.rotation.z=-.22;
   add(group,new T.SphereGeometry(.13,12,8),material,[.35,.62,0]);
   const beak=add(group,new T.ConeGeometry(.065,.19,8),matte('#d79a43'),[.48,.61,0]);beak.rotation.z=-Math.PI/2;
   return register(group,{id,label:color==='white'?'白天鹅':'黑天鹅',story,base:new T.Vector3(...base),phase});
  }
  function rabbit(){
   const group=new T.Group(),fur=matte('#c8b49b');
   add(group,new T.SphereGeometry(.25,12,8),fur,[0,.22,0],[1,.85,1.25]);add(group,new T.SphereGeometry(.18,12,8),fur,[.05,.46,-.18]);
   [[-.06,.72,-.18],[.12,.71,-.18]].forEach(p=>{const ear=add(group,new T.SphereGeometry(.09,10,7),fur,p,[.48,1.8,.55]);ear.rotation.z=p[0]<0?.12:-.12;});
   add(group,new T.SphereGeometry(.08,10,7),white,[0,.26,.29]);
   return register(group,{id:'rabbit',label:'草地上的小兔子',story:'小兔子今天发现了窗外新长出的一小片嫩草。',base:new T.Vector3(12,terrainHeight(12,-4),-4),phase:7});
  }
  function fox(){
   const group=new T.Group();add(group,new T.SphereGeometry(.30,12,8),orange,[0,.31,0],[1.35,.7,.68]);add(group,new T.SphereGeometry(.22,12,8),orange,[.4,.47,0],[1,.85,.82]);
   [[.34,.72,-.12],[.34,.72,.12]].forEach(p=>{const ear=add(group,new T.ConeGeometry(.10,.25,8),orange,p);ear.rotation.z=-.22;});
   const tail=add(group,new T.CylinderGeometry(.08,.16,.68,9),orange,[-.48,.34,0],[1,1,1]);tail.rotation.z=Math.PI/2.8;add(tail,new T.SphereGeometry(.13,10,7),white,[0,.34,0]);
   add(group,new T.SphereGeometry(.045,8,6),dark,[.6,.48,0]);
   return register(group,{id:'fox',label:'树林边的小狐狸',story:'这只狐狸每天傍晚都会路过湖边，确认窗里仍亮着灯。',base:new T.Vector3(-15,terrainHeight(-15,-5),-5),phase:23});
  }
  fish();
  swan('white-swan','white',[16,-.34,-66],0,'这只天鹅喜欢停在阳光倒影旁边，慢慢梳理羽毛。');
  swan('black-swan','black',[-22,-.34,-78],17,'黑天鹅总沿着安静的岸线游，像在替湖面巡夜。');
  rabbit();fox();

  const stateLabels={idle:'正在休息',wander:'慢慢散步',eat:'低头觅食',lookAround:'四处张望',sleep:'安静睡着',interact:'发现了访客',leave:'正要离开',swim:'缓缓游过',jump:'跃出湖面',preen:'梳理羽毛'};
  function update(dt,time,world){
   const night=world?.night||0;
   animals.forEach((animal,index)=>{
    const cycle=(time+animal.phase||time)%80;
    if(animal.id==='fish'){
     const leap=cycle%27;animal.group.visible=quality!=='low'&&night<.72&&leap<3.4;animal.state=animal.group.visible?'jump':'swim';
     if(animal.group.visible){const u=leap/3.4;animal.group.position.copy(animal.base);animal.group.position.x+=u*2.8;animal.group.position.y+=Math.sin(u*Math.PI)*1.25;animal.group.rotation.z=(u-.5)*1.2;animal.splash.position.set(animal.base.x+(u>.5?2.8:0),-.455,animal.base.z);animal.splash.visible=u<.16||u>.84;animal.splash.scale.setScalar(.6+Math.min(u,1-u)*3);}
     else animal.splash.visible=false;return;
    }
    if(animal.id.includes('swan')){
     const u=(time*.018+animal.phase*.01)%(Math.PI*2);animal.group.visible=true;animal.group.position.copy(animal.base).add(new T.Vector3(Math.cos(u)*8,0,Math.sin(u)*3));animal.group.rotation.y=-u;animal.state=night>.72?'sleep':cycle%22<5?'preen':'swim';animal.group.children[1].rotation.z=animal.state==='preen'?-1.05:-.22;return;
    }
    if(animal.id==='rabbit'){
     animal.group.visible=night<.62;animal.state=cycle%18<4?'wander':cycle%18<10?'eat':'idle';const hop=animal.state==='wander'?Math.abs(Math.sin(time*3.2))*.16:0;animal.group.position.copy(animal.base).add(new T.Vector3(Math.sin(time*.12)*1.4,hop,Math.cos(time*.1)*.7));animal.group.rotation.y=Math.sin(time*.12)>0?Math.PI/2:-Math.PI/2;return;
    }
    if(animal.id==='fox'){
     const visit=cycle<28;animal.group.visible=night<.88&&visit;animal.state=!visit?'leave':cycle<7?'wander':cycle<20?'lookAround':'leave';const u=cycle<14?cycle/14:Math.max(0,1-(cycle-14)/14);animal.group.position.copy(animal.base).add(new T.Vector3(u*7,Math.abs(Math.sin(time*4))*dt*.25,-u*2));animal.group.rotation.y=cycle<14?Math.PI/2:-Math.PI/2;animal.group.rotation.z=animal.state==='lookAround'?Math.sin(time*1.8)*.04:0;
    }
   });
  }
  function describe(animal){return `${animal.label} · ${stateLabels[animal.state]||animal.state}\n${animal.story}`;}
  function setQuality(value){quality=value;animals.find(a=>a.id==='fish').group.visible=value!=='low';}
  function dispose(){root.removeFromParent();}
  return {root,animals,pickables,update,describe,setQuality,dispose};
 }
 function createDisabled(scene){const root=new THREE.Group();root.name='near-wildlife-disabled';root.visible=false;scene.add(root);return {root,animals:[],pickables:[],blocker:'近景动物需有明确许可的 GLB 与动画，本轮停用 primitive 动物。',update(){},setQuality(){},describe(){return '';},dispose(){scene.remove(root);}};}
 return {create,createDisabled};
})();
