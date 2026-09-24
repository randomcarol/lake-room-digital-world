/* Crossfades are native AnimationActions; movement speed follows action cycle duration. */
window.AnimalAnimation={create(model,clips,definition){
 const mixer=new THREE.AnimationMixer(model),actions={},mapped={};let current=null;
 if(definition.species==='rabbit'&&definition.clipMap.graze){
  // Bake two small original clips onto the licensed rig. Four staggered footfalls
  // replace the airborne Run cycle; grazing bends the torso/neck toward the grass.
  const source=THREE.AnimationClip.findByName(clips,'Armature|Running'),objects=[];
  model.traverse(o=>objects.push(o));
  const snapshot=()=>objects.map(o=>({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
  const restore=pose=>{for(const {o,p,q,s}of pose){o.position.copy(p);o.quaternion.copy(q);o.scale.copy(s);}model.updateMatrixWorld(true);};
  const original=snapshot(),sample=mixer.clipAction(source);sample.reset().play();mixer.update(0);const base=snapshot(),soleRotations={};
  model.updateMatrixWorld(true);for(const side of ['L','R'])soleRotations['Back'+side]=model.getObjectByName('BackPaw_'+side).getWorldQuaternion(new THREE.Quaternion());
  sample.time=source.duration*.6;mixer.update(0);model.updateMatrixWorld(true);for(const side of ['L','R'])soleRotations['Front'+side]=model.getObjectByName('FrontPaw_'+side).getWorldQuaternion(new THREE.Quaternion());
  mixer.stopAllAction();
  const axis=new THREE.Vector3(1,0,0),parentQ=new THREE.Quaternion(),deltaQ=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3(),pivot=new THREE.Vector3();
  function rotateWorld(bone,angle){bone.parent.getWorldQuaternion(parentQ);deltaQ.setFromAxisAngle(axis,angle);bone.quaternion.premultiply(parentQ.clone().invert().multiply(deltaQ).multiply(parentQ));model.updateMatrixWorld(true);}
  const legs=[['Front','L',0],['Front','R',.5],['Back','L',.75],['Back','R',.25]].map(([part,side,offset])=>({part,side,offset,foot:model.getObjectByName(part+'Paw_'+side),chain:(part==='Front'?['FrontLeg_','FrontUpLeg_']:['BackLeg_','BackLeg001_','BackUpLeg_']).map(n=>model.getObjectByName(n+side)).filter(Boolean)}));
  // Rear joints are named BackLeg_L001 in this source (not BackLeg001_L).
  for(const leg of legs)if(leg.part==='Back')leg.chain=[model.getObjectByName('BackLeg_'+leg.side+'001'),model.getObjectByName('BackLeg_'+leg.side),model.getObjectByName('BackUpLeg_'+leg.side)];
  function solve(leg,target){for(let pass=0;pass<10;pass++)for(const joint of leg.chain){joint.getWorldPosition(pivot);leg.foot.getWorldPosition(a);a.sub(pivot).normalize();b.copy(target).sub(pivot).normalize();deltaQ.setFromUnitVectors(a,b);joint.parent.getWorldQuaternion(parentQ);joint.quaternion.premultiply(parentQ.clone().invert().multiply(deltaQ).multiply(parentQ));model.updateMatrixWorld(true);}}
  function bake(name,duration,grazing){const frames=32,times=[],values=source.tracks.map(()=>[]),origin=new THREE.Vector3();
   for(let i=0;i<=frames;i++){restore(base);const u=i/frames;times.push(u*duration);
    if(grazing){const bend=Math.min(1,Math.min(u/.22,(1-u)/.18)),chew=.025*Math.sin(u*Math.PI*16)*bend;rotateWorld(model.getObjectByName('Spine'),.35*bend);rotateWorld(model.getObjectByName('Neck'),.35*bend);rotateWorld(model.getObjectByName('Head'),.25*bend+chew);}
    model.getWorldPosition(origin);
    for(const leg of legs){const phase=(u+leg.offset)%1,stance=phase<.65,z=leg.part==='Front'?.22:-.15;let dz=0,lift=0;
     if(!grazing){dz=stance?.091-.182*phase/.65:-.091+.182*(phase-.65)/.35;lift=stance?0:.045*Math.sin((phase-.65)/.35*Math.PI);}
     solve(leg,new THREE.Vector3(leg.side==='L'?.083:-.083,.022+lift,z+dz).add(origin));leg.foot.parent.getWorldQuaternion(parentQ);leg.foot.quaternion.copy(parentQ.invert().multiply(soleRotations[leg.part+leg.side]));model.updateMatrixWorld(true);
    }
    source.tracks.forEach((track,j)=>{const dot=track.name.lastIndexOf('.'),node=model.getObjectByName(track.name.slice(0,dot)),property=track.name.slice(dot+1);values[j].push(...node[property].toArray());});
   }
   return new THREE.AnimationClip(name,duration,source.tracks.map((track,i)=>new track.constructor(track.name,times,values[i])));
  }
  const walk=bake('Room|Walk',1.6,false),graze=bake('Room|Graze',4,true);restore(original);clips=clips.concat(walk,graze);
 }
 const rate=state=>definition.stateRates?.[state]??(state===definition.moveState||state==='leave'?definition.locomotionRate||1:1);
 for(const [state,name] of Object.entries(definition.clipMap)){const clip=THREE.AnimationClip.findByName(clips,name);if(!clip)throw new Error(definition.id+' missing mapped clip '+name);actions[state]=mixer.clipAction(clip);mapped[state]=clip;}
 if(!actions.idle||!actions[definition.moveState])throw new Error('Missing idle/locomotion clips');
 function play(state,fade=.22){const action=actions[state]||actions.idle;if(action===current)return;action.reset().setEffectiveTimeScale(rate(state)).setEffectiveWeight(1).play();if(current){current.fadeOut(fade);action.fadeIn(fade);}current=action;}
 play('idle',0);
 return {mixer,actions,mapped,play,update(dt){mixer.update(dt);},get action(){return current;},speed(state){const clip=mapped[state]||mapped[definition.moveState];return (definition.stateStrides?.[state]??definition.strideMetres)*rate(state)/clip.duration;},dispose(){mixer.stopAllAction();mixer.uncacheRoot(model);}};
}};
