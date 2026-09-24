const {chromium}=require('playwright'),fs=require('fs'),out='tests/artifacts/flora-fauna/after';
(async()=>{const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--enable-gpu']});try{
 const p=await b.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1});await p.goto('http://127.0.0.1:8940/?qa=1');await p.waitForFunction(()=>window.__ROOM_APP__);await p.waitForLoadState('networkidle');await p.evaluate(()=>__ROOM_APP__.environment.animals.ready);
 await p.evaluate(()=>{const a=__ROOM_APP__,e=a.environment;e.setMode('day');e.setSeason('spring');a.controls.enabled=false;const update=e.update;e.update=()=>{};e.captureTime=t=>update(0,t);e.captureTime(30);});
 await p.addStyleTag({content:'#bubbles,.room-header,.room-hint{display:none !important}'});const evidence={};
 async function shot(name){await p.evaluate(()=>{const a=__ROOM_APP__;a.renderer.shadowMap.needsUpdate=true;a.renderer.render(a.scene,a.camera);});await p.waitForTimeout(80);await p.screenshot({path:out+'/'+name+'.png'});}
 async function camera(position,target,fov=42){await p.evaluate(({position,target,fov})=>{const a=__ROOM_APP__;a.camera.position.fromArray(position);a.controls.target.fromArray(target);a.camera.fov=fov;a.camera.updateProjectionMatrix();a.camera.lookAt(a.controls.target);},{position,target,fov});}
 for(const season of ['spring','summer']){const c=await p.evaluate(season=>{const e=__ROOM_APP__.environment;e.setSeason(season);return e.flowers.clusters.find(c=>c.season===season&&c.z>8&&c.x<8);},season);await camera([c.x+2.1,c.baseY+1.25,c.z+2.8],[c.x,c.baseY+.25,c.z]);await shot('flowers-'+season+'-detail');await camera([23,28,30],[4,0,2],52);await shot('flowers-'+season+'-all-sides');}
 for(const id of ['rabbit','fox','swan','fish']){
  const data=await p.evaluate(id=>{const a=__ROOM_APP__,actor=a.environment.animals.animals.find(x=>x.id===id);if(!actor)return null;for(let i=0;i<1200;i++){actor.update(1/60,{night:0},30);if(actor.state===actor.config.moveState&&actor.animation.action.time>.14)break;}return {state:actor.state,position:actor.group.position.toArray(),clip:actor.animation.action.getClip().name,time:actor.animation.action.time};},id);
  evidence[id]=data;if(!data)continue;const [x,y,z]=data.position,water=id==='swan'||id==='fish';await camera([x+(water?2.7:1.8),y+(water?2.5:1.2),z+(water?3.4:2.3)],[x,y+(water?.12:.32),z]);await shot(id+'-detail');
  if(id==='rabbit')for(let frame=0;frame<4;frame++){evidence['rabbit-motion-'+frame]=await p.evaluate(()=>{const a=__ROOM_APP__.environment.animals.animals.find(x=>x.id==='rabbit');for(let i=0;i<6;i++)a.update(1/60,{night:0},30);return {position:a.group.position.toArray(),state:a.state,clipTime:a.animation.action.time};});await shot('rabbit-motion-'+frame);}
 }
 await camera([-3,6,-10],[-13,0,-43],50);for(const t of [0,8,16]){await p.evaluate(t=>__ROOM_APP__.environment.captureTime(t),t);await shot('lake-waves-'+t);}
 await camera([5,9,10],[-25,18,-76],40);await shot('flying-birds');
 await camera([-65,14,-83],[-85,2,-112],40);await shot('opposite-bank-wildlife');
 await p.evaluate(()=>__ROOM_APP__.environment.setDebug(true));await camera([4,36,20],[4,0,0],55);await shot('debug-near-surface-paths');await camera([65,140,125],[0,0,-65],55);await shot('debug-surface');
 evidence.blockers=await p.evaluate(()=>__ROOM_APP__.environment.animals.status.filter(x=>x.status!=='ready'));fs.writeFileSync(out+'/detail-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
