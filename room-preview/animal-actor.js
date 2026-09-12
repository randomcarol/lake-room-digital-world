window.AnimalActor={create(asset,definition,surface){
 const group=new THREE.Group(),model=asset.scene,config={...AnimalSpecies[definition.species],...definition};group.name='animal-'+definition.id;group.add(model);model.scale.setScalar(definition.defaultScale);model.rotation.y=definition.rotationCorrection;
 // Correct bind-pose feet once; retain all native bone translation during animation.
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model);model.position.y-=box.min.y;model.position.y+=definition.footClearance||0;const footOffset=model.position.y;
 const animation=AnimalAnimation.create(model,asset.animations,config),movement=AnimalMovement.create(surface,config),rand=LandscapeAssets.random(definition.id==='fox'?819:519),meshes=[];
 const actor={id:definition.id,label:config.label,story:config.story,config,group,model,animation,movement,footOffset,state:'idle',source:'GLTFLoader',clipNames:asset.animations.map(c=>c.name),meshes,elapsed:0,distance:0,visible:true};
  model.traverse(o=>{if(o.isMesh){o.userData.animal=actor;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;meshes.push(o);}});
 group.position.set(movement.p.x,movement.p.baseY,movement.p.z);group.rotation.y=movement.heading;
 let dwell=2,travel=false,away=0,returning=false,settling=0;
 function setState(s){actor.state=s;animation.play(s);}
 function step(dt,world){
  actor.elapsed+=dt;const nightHidden=world.night>=config.nightThreshold;
  group.visible=!nightHidden&&away<=0;actor.visible=group.visible;if(nightHidden)return;
  if(away>0){setState('idle');away=Math.max(0,away-dt);if(!away){movement.next();travel=true;returning=false;}return;}
  if(settling>0){settling=Math.max(0,settling-dt);animation.update(dt);return;}
  if(!travel){dwell-=dt;setState(actor.id==='fox'?'lookAround':'idle');if(dwell<=0){travel=true;movement.next(returning);}}
  if(travel){
   const moveState=returning&&actor.id==='fox'?'leave':config.moveState;animation.play(moveState);
   const phase=animation.action.time/animation.mapped[config.moveState].duration;
   const gait=config.gait?(phase>config.gait[0]&&phase<config.gait[1]?Math.sin((phase-config.gait[0])/(config.gait[1]-config.gait[0])*Math.PI)*Math.PI/(2*(config.gait[1]-config.gait[0])):0):1;
   const result=movement.update(dt,animation.speed(config.moveState)*gait,group.rotation.y);
   const delta=Math.atan2(Math.sin(result.heading-group.rotation.y),Math.cos(result.heading-group.rotation.y));group.rotation.y+=Math.max(-dt*2,Math.min(dt*2,delta));
   setState(!result.turning&&!result.blocked?moveState:'idle');actor.distance+=result.distance;
   if(result.blocked){travel=false;dwell=3;setState('idle');}
   else if(result.arrived){
    if(actor.id==='fox'&&movement.atHome&&returning){travel=false;away=config.away[0]+rand()*(config.away[1]-config.away[0]);group.visible=false;actor.visible=false;}
    else if(movement.atEnd||movement.atHome){travel=false;returning=movement.atEnd;dwell=config.rest[0]+rand()*(config.rest[1]-config.rest[0]);if(config.gait)settling=Math.max(0,.78-phase)*animation.mapped[config.moveState].duration;}
    else movement.next(returning);
   }
  }
  group.position.set(movement.p.x,movement.p.baseY,movement.p.z);animation.update(dt);
 }
 actor.update=(dt,world)=>{if(dt===0){group.visible=world.night<config.nightThreshold&&away<=0;actor.visible=group.visible;return;}let left=Math.min(Math.max(dt,0),1);while(left>1e-7){const h=Math.min(left,1/30);step(h,world);left-=h;}};
 actor.dispose=()=>{animation.dispose();movement.dispose();asset.release();group.removeFromParent();meshes.length=0;};return actor;
}};
