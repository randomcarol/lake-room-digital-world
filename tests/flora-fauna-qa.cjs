/* Same fixed cameras, native Metal GPU, 3.2 s settle + 4 s sample as environment QA. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const phase=process.env.ROOM_PHASE||'after';if(phase!=='after')throw new Error('Before evidence is immutable; replay fixtures with the dedicated baseline workflow');const out=path.join(__dirname,'artifacts/flora-fauna',phase);
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=metal','--enable-webgl','--enable-gpu']});
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:8940/?qa=1');await page.waitForFunction(()=>window.__ROOM_APP__&&window.__ROOM_INTERACTIONS__);
 const readyMs=await page.evaluate(()=>performance.now());await page.waitForLoadState('networkidle');
 await page.evaluate(async()=>{const e=__ROOM_APP__.environment;if(e.animals.ready)await e.animals.ready;const update=e.update.bind(e);e.update=dt=>update(dt,30);});
 const report={phase,readyMs,resourcesReadyMs:await page.evaluate(()=>performance.now()),settleMs:3200,measureMs:4000,errors,cases:[],performance:{}};
 async function measure(){return page.evaluate(()=>new Promise(resolve=>{const a=__ROOM_APP__,start=performance.now();let frames=0,calls=0,triangles=0;const off=a.onFrame(()=>{frames++;calls=Math.max(calls,a.renderer.info.render.calls);triangles=Math.max(triangles,a.renderer.info.render.triangles);if(performance.now()-start>=4000){off();const gl=a.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');resolve({calls,triangles,textures:a.renderer.info.memory.textures,geometries:a.renderer.info.memory.geometries,fps:frames*1000/(performance.now()-start),gpu:ext&&gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),camera:{position:a.camera.position.toArray(),target:a.controls.target.toArray(),fov:a.camera.fov}});}});}));}
 for(const [device,season,mode] of [['desktop','summer','day'],['desktop','spring','day'],['desktop','spring','dusk'],['desktop','summer','dusk'],['desktop','summer','night'],['desktop','autumn','day'],['desktop','winter','day'],['mobile','summer','day'],['mobile','spring','day']]){
  await page.setViewportSize(device==='desktop'?{width:1280,height:900}:{width:390,height:844});
  await page.evaluate(({device,season,mode})=>{const a=__ROOM_APP__;a.controls.enabled=false;a.camera.position.fromArray(device==='desktop'?[10.7,3.9,11.7]:[13,6.5,24]);a.controls.target.set(4,1.75,2.8);a.camera.fov=device==='desktop'?45:53;a.camera.updateProjectionMatrix();a.camera.lookAt(a.controls.target);a.environment.setQuality('high');a.environment.setSeason(season);a.environment.setMode(mode);document.getElementById('world-season').value=season;document.getElementById('world-time').value=mode;},{device,season,mode});
  await page.waitForTimeout(3200);if(device==='desktop'&&mode==='day'&&['spring','summer'].includes(season))report.performance[season]=await measure();
  const name=`${device}-${season}-${mode}`;await page.screenshot({path:path.join(out,name+'.png')});report.cases.push(name);console.log('captured',name);
 }
 report.surface=await page.evaluate(()=>__ROOM_APP__.environment.surface.audit());
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({phase,performance:report.performance,errors}));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
