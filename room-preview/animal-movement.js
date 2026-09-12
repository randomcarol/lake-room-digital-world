/* Controllers use linear safe segments with 10 cm footprint samples; turns happen before travel. */
window.AnimalMovement={create(surface,definition){
 const config={medium:definition.medium,radius:definition.radius,shoreClearance:definition.shoreClearance,minDepth:definition.minDepth,submerge:definition.submerge||0,bounds:definition.bounds};
 const points=definition.route.map(p=>p.slice()),route=surface.motionPath(definition.id+'-route',points,config);
 if(!route.valid)throw new Error(definition.id+' path rejected: '+route.errors.join(', '));surface.animalPaths.push(route);
 const p={id:definition.id,kind:definition.medium==='water'?'water-animal':'land-animal',x:points[0][0],z:points[0][1],radius:definition.radius,clearance:.12,...config};p.baseY=definition.medium==='water'?surface.waterLevel-config.submerge:surface.terrainHeight(p.x,p.z);
 if(definition.medium==='land')surface.placements.push(p);
 let index=0,direction=1,target=points[1],heading=Math.atan2(target[0]-p.x,target[1]-p.z),arrived=false;
 const validate=q=>definition.medium==='water'?surface.validateWater(q):surface.validate(q);
 function next(choice=.5,forceHome=false){if(forceHome)direction=-1;else if(index===points.length-1)direction=-1;else if(index===0)direction=1;else if(choice<.34)direction*=-1;target=points[index+direction];arrived=false;return !!target;}
 function update(dt,speed,rotation){
  if(!target||arrived||!speed)return {distance:0,heading,arrived};
  const dx=target[0]-p.x,dz=target[1]-p.z,d=Math.hypot(dx,dz);heading=Math.atan2(dx,dz);
  // Do not slide sideways while the actor is still turning toward the next segment.
  const delta=Math.atan2(Math.sin(heading-rotation),Math.cos(heading-rotation));if(Math.abs(delta)>.12)return {distance:0,heading,turning:true};
  const step=Math.min(d,speed*dt),x=d? p.x+dx/d*step:p.x,z=d?p.z+dz/d*step:p.z,q={...p,x,z,baseY:definition.medium==='water'?surface.waterLevel-config.submerge:surface.terrainHeight(x,z)};
  if(validate(q).length)return {distance:0,heading,blocked:true};Object.assign(p,q);
  if(d<=step+.00001){index+=direction;arrived=true;}return {distance:step,heading,arrived};
 }
 return {p,route,update,next,validate,get heading(){return heading;},get index(){return index;},get atHome(){return index===0;},get atEnd(){return index===points.length-1;},dispose(){const i=surface.animalPaths.indexOf(route);if(i>=0)surface.animalPaths.splice(i,1);const j=surface.placements.indexOf(p);if(j>=0)surface.placements.splice(j,1);}};
}};
