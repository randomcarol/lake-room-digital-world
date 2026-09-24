window.AnimalActor={create(asset,definition,surface){
 const group=new THREE.Group(),model=asset.scene,config={...AnimalSpecies[definition.species],...definition};group.name='animal-'+definition.id;group.add(model);model.scale.setScalar(definition.defaultScale);model.rotation.y=definition.rotationCorrection;
 // The source Fur shell has its own unanimated *_1 rig. Keep the textured body only.
 if(config.species==='rabbit'){const fur=model.getObjectByName('Fur');if(fur){fur.skeleton.dispose();fur.parent.remove(fur);}}
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);model.position.y=config.medium==='water'?config.waterlineOffset||0:-box.min.y+(definition.footClearance||0);const footOffset=model.position.y;
 const seed=[...definition.id].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,519),rand=LandscapeAssets.random(seed);
 const movement=AnimalMovement.create(surface,config),animation=AnimalAnimation.create(model,asset.animations,config),meshes=[];
 const actor={id:definition.id,label:config.label,story:config.story,config,group,model,animation,movement,footOffset,state:'idle',source:'GLTFLoader',clipNames:asset.animations.map(c=>c.name),meshes,elapsed:0,distance:0,visible:true,turning:false,groundCorrection:0};
 model.traverse(o=>{if(o.isMesh){o.userData.animal=actor;o.castShadow=config.medium==='land'&&config.castShadow!==false;o.receiveShadow=o.castShadow;o.frustumCulled=false;meshes.push(o);}});
 group.position.set(movement.p.x,movement.p.baseY,movement.p.z);group.rotation.y=movement.heading;
 const groundProbes=[],probe=new THREE.Vector3();
 if(config.species==='rabbit')for(const mesh of meshes){const seen=new Set(),indices=[],g=mesh.geometry;for(let i=0;i<g.attributes.position.count;i++){const key=[0,1,2].map(k=>g.attributes.position.array[i*3+k]).concat(...[0,1,2,3].map(k=>[g.attributes.skinIndex.array[i*4+k],g.attributes.skinWeight.array[i*4+k]])).join(',');if(!seen.has(key)){seen.add(key);indices.push(i);}}groundProbes.push({mesh,indices});}
 function groundFeet(){if(!groundProbes.length)return;model.position.y=footOffset;group.updateMatrixWorld(true);let clearance=Infinity;for(const {mesh,indices}of groundProbes){mesh.skeleton.update();for(const i of indices){probe.fromBufferAttribute(mesh.geometry.attributes.position,i);mesh.boneTransform(i,probe);probe.applyMatrix4(mesh.matrixWorld);clearance=Math.min(clearance,probe.y-surface.terrainHeight(probe.x,probe.z));}}actor.groundCorrection=Math.max(0,.003-clearance);model.position.y+=actor.groundCorrection;group.updateMatrixWorld(true);}
 let dwell=1.2+rand()*1.4,travel=false,away=0,returning=false,settling=0,restIndex=0,restState='idle',qualityVisible=true,leg=0,moveState=config.moveState;
 const setState=s=>{actor.state=s;animation.play(s);};
 function rest(){travel=false;dwell=config.rest[0]+rand()*(config.rest[1]-config.rest[0]);const choices=config.species==='rabbit'?['idle','graze','lookAround']:['lookAround','idle'];restState=choices[restIndex++%choices.length];}
 function step(dt,world){
  actor.elapsed+=dt;const hidden=world.night>=config.nightThreshold||!qualityVisible;group.visible=!hidden&&away<=0;actor.visible=group.visible;if(hidden)return;
  if(away>0){setState('idle');away=Math.max(0,away-dt);if(!away){movement.next(rand());travel=true;returning=false;}return;}
  if(settling>0){settling=Math.max(0,settling-dt);animation.update(dt);return;}
  if(!travel){dwell-=dt;setState(restState);if(dwell<=0){travel=true;movement.next(rand());moveState=config.species==='rabbit'&&leg%4===2?'walk':config.moveState;}}
  if(travel){
   const heading=movement.desiredHeading,delta=Math.atan2(Math.sin(heading-group.rotation.y),Math.cos(heading-group.rotation.y));actor.turning=Math.abs(delta)>.12;
   if(actor.turning){setState('lookAround');group.rotation.y+=Math.max(-dt*2,Math.min(dt*2,delta));animation.update(dt);return;}
   // Select one action per frame only, after deciding whether the actor is turning.
   setState(moveState);const clip=animation.mapped[moveState],phase=animation.action.time/clip.duration;
   const hopping=moveState==='hop'&&config.gait,gait=hopping?(phase>config.gait[0]&&phase<config.gait[1]?Math.sin((phase-config.gait[0])/(config.gait[1]-config.gait[0])*Math.PI)*Math.PI/(2*(config.gait[1]-config.gait[0])):0):1;
   const result=movement.update(dt,animation.speed(moveState)*gait,group.rotation.y);actor.distance+=result.distance;
   if(result.blocked){rest();setState('idle');}
   else if(result.arrived){leg++;
    if(config.species==='fox'&&movement.atHome&&returning&&config.away){travel=false;away=config.away[0]+rand()*(config.away[1]-config.away[0]);group.visible=false;actor.visible=false;}
    else if(movement.atEnd||movement.atHome||config.restEvery&&leg%config.restEvery===0){returning=movement.atEnd||returning;rest();if(hopping)settling=Math.max(0,.90-phase)*clip.duration/(config.stateRates?.hop||config.locomotionRate||1);}
    else{movement.next(rand());moveState=config.species==='rabbit'&&leg%4===2?'walk':config.moveState;}
   }
  }
  group.position.set(movement.p.x,movement.p.baseY,movement.p.z);animation.update(dt);
 }
 actor.update=(dt,world,time=actor.elapsed)=>{if(dt===0){group.visible=qualityVisible&&world.night<config.nightThreshold&&away<=0;actor.visible=group.visible;}else{let left=Math.min(Math.max(dt,0),1);while(left>1e-7){const h=Math.min(left,1/30);step(h,world);left-=h;}}if(config.medium==='water'){const p=movement.p;group.position.y=p.baseY+surface.waveHeight(p.x,p.z,time);}groundFeet();};
 actor.setQuality=value=>{qualityVisible=value!=='low'||config.primary!==false;group.visible=qualityVisible&&group.visible;actor.visible=group.visible;};
 actor.dispose=()=>{animation.dispose();movement.dispose();asset.release();if(group.parent)group.parent.remove(group);meshes.length=0;};return actor;
}};
