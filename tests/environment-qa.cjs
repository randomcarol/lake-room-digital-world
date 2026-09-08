/* Fixed-camera evidence runner. ROOM_PHASE=before|after; never infers visual quality from object counts. */
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const phase=process.env.ROOM_PHASE||'after', out=path.join(__dirname,'artifacts/environment',phase);
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:[`--use-angle=${process.env.ROOM_GPU||'metal'}`,'--enable-webgl','--enable-gpu']});
 const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>(errors.push(String(e)),console.error(String(e))));page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
 if(phase==='before'){for(const [name,file] of [['environment.js',path.join(__dirname,'fixtures/environment-before/environment.js')],['world-state.js',path.join(__dirname,'fixtures/environment-before/world-state.js')],['room.js',path.join(__dirname,'fixtures/environment-before/room.js')]])await page.route('**/'+name,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(file,'utf8')}));}
 await page.goto(process.env.ROOM_TEST_URL||'http://127.0.0.1:8940/?qa=1');
 await page.waitForFunction(()=>window.__ROOM_APP__&&window.__ROOM_INTERACTIONS__);
 const readyMs=await page.evaluate(()=>performance.now());
 await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{const e=window.__ROOM_APP__.environment,update=e.update.bind(e);e.update=(dt)=>update(dt,30);});
 const resourcesReadyMs=await page.evaluate(()=>performance.now());
 const report={phase,device:'local Chrome / ANGLE '+(process.env.ROOM_GPU||'metal'),viewport:'1280x900 DPR1',readyMs,resourcesReadyMs,settleMs:3200,measureMs:4000,cases:[],errors};
 for(const device of ['desktop','mobile']){
  await page.setViewportSize(device==='desktop'?{width:1280,height:900}:{width:390,height:844});
  await page.evaluate(device=>{const a=window.__ROOM_APP__;a.controls.enabled=false;a.camera.position.fromArray(device==='desktop'?[10.7,3.9,11.7]:[13,6.5,24]);a.controls.target.set(4,1.75,2.8);a.camera.fov=device==='desktop'?45:53;a.camera.updateProjectionMatrix();a.camera.lookAt(a.controls.target);},device);
  for(const season of ['summer','autumn','winter'])for(const mode of ['day','dusk','night']){
   if(process.env.ROOM_QUICK && !(device==='desktop'&&(mode==='day'||season==='summer')||device==='mobile'&&season==='summer'&&mode==='day'))continue;
   await page.evaluate(({season,mode})=>{const a=window.__ROOM_APP__;a.environment.setSeason(season);a.environment.setMode(mode);const select=document.getElementById('world-time');select.value=mode;select.dispatchEvent(new Event('change'));document.getElementById('world-season').value=season;},{season,mode});
   await page.waitForTimeout(3200);
   const name=`${device}-${season}-${mode}`;
   if(device==='desktop'&&season==='summer'&&mode==='day'){
    report.performance=await page.evaluate(()=>new Promise(resolve=>{const a=window.__ROOM_APP__,start=performance.now(),calls=[],tris=[];let frames=0;const off=a.onFrame(()=>{frames++;calls.push(a.renderer.info.render.calls);tris.push(a.renderer.info.render.triangles);if(performance.now()-start>=4000){off();const gl=a.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');resolve({fps:frames*1000/(performance.now()-start),calls:Math.max(...calls),triangles:Math.max(...tris),textures:a.renderer.info.memory.textures,geometries:a.renderer.info.memory.geometries,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,camera:{position:a.camera.position.toArray(),target:a.controls.target.toArray(),fov:a.camera.fov}});}});}));
   }
   await page.screenshot({path:path.join(out,name+'.png')});report.cases.push(name);console.log('captured',phase,name);
  }
 }
 if(phase==='after'){
  report.spatial=await page.evaluate(()=>window.__ROOM_APP__.environment.surface.audit());
  assert.equal(report.spatial.invalid.length,0,JSON.stringify(report.spatial.invalid));
  assert.ok(report.spatial.counts.house>=6&&report.spatial.counts.house<=10);
  await page.setViewportSize({width:1280,height:900});
  await page.evaluate(()=>{const a=window.__ROOM_APP__;a.environment.setSeason('summer');a.environment.setMode('day');a.environment.setDebug(true);a.camera.position.set(65,140,125);a.controls.target.set(0,0,-65);a.camera.fov=55;a.camera.far=1000;a.camera.updateProjectionMatrix();a.camera.lookAt(a.controls.target);});
  await page.addStyleTag({content:'#bubbles,.room-hint,.room-header{display:none !important}'});
  await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'debug-surface.png')});
 }
 if(phase==='after'){const before=JSON.parse(fs.readFileSync(path.join(__dirname,'artifacts/environment/before/metrics.json')));report.budget={callsRatio:report.performance.calls/before.performance.calls,trianglesRatio:report.performance.triangles/before.performance.triangles};assert.ok(report.budget.callsRatio<=1.15,'draw call budget');assert.ok(report.budget.trianglesRatio<=1.25,'triangle budget');}
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
