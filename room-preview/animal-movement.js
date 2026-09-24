/* Private wildlife navigation; samples the existing surface without changing it. */
window.AnimalRoutePlanner={plan(surface,waypoints,definition){
 const radius=definition.radius,cache=new Map(),edges=new Map(),key=p=>p.join(',');
 const valid=p=>{const k=key(p);if(!cache.has(k))cache.set(k,!surface.validate({kind:'land-animal',x:p[0],z:p[1],baseY:surface.terrainHeight(...p),radius,clearance:.12}).length);return cache.get(k);};
 const clear=(a,b)=>{const k=key(a)+'/'+key(b);if(!edges.has(k))edges.set(k,surface.motionPath('navigation-probe',[a,b],{radius}).valid);return edges.get(k);};
 function connect(start,goal){if(!valid(start)||!valid(goal))throw Error('Invalid wildlife waypoint '+key(!valid(start)?start:goal));if(clear(start,goal))return [start,goal];
  const nearest=p=>{const candidates=[];for(let x=Math.floor(p[0])-2;x<=Math.ceil(p[0])+2;x++)for(let z=Math.floor(p[1])-2;z<=Math.ceil(p[1])+2;z++){const q=[x,z];if(valid(q)&&clear(p,q))candidates.push(q);}candidates.sort((a,b)=>Math.hypot(a[0]-p[0],a[1]-p[1])-Math.hypot(b[0]-p[0],b[1]-p[1]));if(!candidates.length)throw Error('No reachable grid waypoint');return candidates[0];};
  const from=nearest(start),to=nearest(goal),open=[from],cost=new Map([[key(from),0]]),came=new Map(),closed=new Set();let reached=false;
  const heuristic=p=>Math.hypot(p[0]-to[0],p[1]-to[1]);
  while(open.length){open.sort((a,b)=>(cost.get(key(a))+heuristic(a))-(cost.get(key(b))+heuristic(b)));const p=open.shift(),k=key(p);if(closed.has(k))continue;if(k===key(to)){reached=true;break;}closed.add(k);
   for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const q=[p[0]+dx,p[1]+dz],qk=key(q);if(q[0]<-36||q[0]>34||q[1]<-11||q[1]>26||closed.has(qk)||!valid(q)||!clear(p,q))continue;const n=cost.get(k)+Math.hypot(dx,dz);if(n<(cost.get(qk)??Infinity)){cost.set(qk,n);came.set(qk,p);open.push(q);}}
  }if(!reached)throw Error('No safe animal connection '+key(start)+' → '+key(goal));
  const raw=[goal,to];let p=to;while(key(p)!==key(from)){p=came.get(key(p));raw.push(p);}raw.push(start);raw.reverse();const smooth=[raw[0]];let i=0;while(i<raw.length-1){let j=raw.length-1;while(j>i+1&&!clear(raw[i],raw[j]))j--;if(key(raw[j])!==key(smooth[smooth.length-1]))smooth.push(raw[j]);i=j;}return smooth;
 }
 const result=[waypoints[0].slice()];for(let i=1;i<waypoints.length;i++)result.push(...connect(waypoints[i-1],waypoints[i]).slice(1));return result;
}};
/* Controllers use linear safe segments with 10 cm footprint samples; turns happen before travel. */
window.AnimalMovement={create(surface,definition){
 const config={medium:definition.medium,radius:definition.radius,shoreClearance:definition.shoreClearance,minDepth:definition.minDepth,submerge:definition.submerge||0,bounds:definition.bounds};
 const points=definition.planRoute?AnimalRoutePlanner.plan(surface,definition.route,definition):definition.route.map(p=>p.slice()),route=surface.motionPath(definition.id+'-route',points,config);
 if(!route.valid)throw new Error(definition.id+' path rejected: '+route.errors.join(', '));surface.animalPaths.push(route);
 const p={id:definition.id,kind:definition.medium==='water'?'water-animal':'land-animal',x:points[0][0],z:points[0][1],radius:definition.radius,clearance:.12,...config};p.baseY=definition.medium==='water'?surface.waterLevel-config.submerge:surface.terrainHeight(p.x,p.z);
 const registry=definition.medium==='land'?surface.placements:surface.waterPlacements;registry.push(p);
 let index=0,direction=1,target=points[1],heading=Math.atan2(target[0]-p.x,target[1]-p.z),arrived=false;
 const validate=q=>definition.medium==='water'?surface.validateWater(q):surface.validate(q);
 function next(choice=.5,forceHome=false){if(forceHome)direction=-1;else if(index===points.length-1)direction=-1;else if(index===0)direction=1;else if(choice<(definition.reverseChance??.34))direction*=-1;target=points[index+direction];arrived=false;return !!target;}
 function update(dt,speed,rotation){
  if(!target||arrived)return {distance:0,heading,arrived};
  const dx=target[0]-p.x,dz=target[1]-p.z,d=Math.hypot(dx,dz);heading=Math.atan2(dx,dz);
  // Do not slide sideways while the actor is still turning toward the next segment.
  const delta=Math.atan2(Math.sin(heading-rotation),Math.cos(heading-rotation));if(Math.abs(delta)>.12)return {distance:0,heading,turning:true};
  const step=Math.min(d,speed*dt),x=d? p.x+dx/d*step:p.x,z=d?p.z+dz/d*step:p.z,q={...p,x,z,baseY:definition.medium==='water'?surface.waterLevel-config.submerge:surface.terrainHeight(x,z)};
  if(validate(q).length)return {distance:0,heading,blocked:true};Object.assign(p,q);
  if(d<=step+.00001){index+=direction;arrived=true;}return {distance:step,heading,arrived};
 }
 return {p,route,update,next,validate,get heading(){return heading;},get desiredHeading(){return target?Math.atan2(target[0]-p.x,target[1]-p.z):heading;},get index(){return index;},get atHome(){return index===0;},get atEnd(){return index===points.length-1;},dispose(){const i=surface.animalPaths.indexOf(route);if(i>=0)surface.animalPaths.splice(i,1);const j=registry.indexOf(p);if(j>=0)registry.splice(j,1);}};
}};
