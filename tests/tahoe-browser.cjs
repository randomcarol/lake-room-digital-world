const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1,reducedMotion:'reduce'});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:8932/');await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__);
 await page.locator('.world-controls summary').click();await page.locator('#world-time').selectOption('day');await page.locator('.world-controls summary').click();await page.waitForTimeout(2500);await page.screenshot({path:'/tmp/tahoe-final-day.png'});
 const saved=await page.evaluate(()=>({position:window.__ROOM_APP__.camera.position.toArray(),target:window.__ROOM_APP__.controls.target.toArray()}));
 for(const angle of [0,90,180,270]){
  const result=await page.evaluate(deg=>{const a=window.__ROOM_APP__,phi=deg*Math.PI/180;a.camera.position.set(a.controls.target.x+Math.sin(phi)*15,6,a.controls.target.z+Math.cos(phi)*15);a.controls.update();return {distance:a.camera.position.distanceTo(a.controls.target),x:a.camera.position.x,z:a.camera.position.z};},angle);
  assert(result.distance>=7.5);await page.waitForTimeout(400);await page.screenshot({path:`/tmp/tahoe-orbit-${angle}.png`});
 }
 await page.evaluate(s=>{const a=window.__ROOM_APP__;a.controls.enableDamping=false;a.controls.update();a.camera.position.fromArray(s.position);a.controls.target.fromArray(s.target);a.controls.update();a.controls.enableDamping=true;},saved);
 await page.mouse.move(650,720);await page.mouse.down();await page.mouse.move(710,720,{steps:8});await page.mouse.up();assert.equal(await page.evaluate(()=>window.__ROOM_INTERACTIONS__.controller.phase),'overview');
 await page.evaluate(s=>{const a=window.__ROOM_APP__;a.controls.enableDamping=false;a.controls.update();a.camera.position.fromArray(s.position);a.controls.target.fromArray(s.target);a.controls.update();a.controls.enableDamping=true;},saved);await page.waitForTimeout(600);
 for(const mobile of [false,true]){
  if(mobile){await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);}
  for(const type of ['monitor','notebook','turntable','map','photoWall','books']){
   await page.locator(`[data-object="${type}"]`).click();await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='experience');await page.waitForTimeout(100);
   const dimensions=await page.locator('#experience-content').boundingBox();assert(dimensions.width<=(mobile?390:1050));
   await page.screenshot({path:`/tmp/tahoe-${mobile?'mobile':'desktop'}-${type}.png`});await page.locator('#return-room').click();await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='overview');
  }
  await page.locator('.world-controls summary').click();await page.locator('#world-time').selectOption('night');await page.locator('.world-controls summary').click();await page.waitForTimeout(2500);await page.screenshot({path:`/tmp/tahoe-${mobile?'mobile':'desktop'}-night.png`});
  await page.locator('.world-controls summary').click();await page.locator('#world-season').selectOption('winter');await page.locator('#world-time').selectOption('day');await page.locator('.world-controls summary').click();await page.waitForTimeout(2500);await page.screenshot({path:`/tmp/tahoe-${mobile?'mobile':'desktop'}-winter.png`});
  await page.locator('.world-controls summary').click();await page.locator('#world-season').selectOption('summer');await page.locator('.world-controls summary').click();
 }
 const state=await page.evaluate(async()=>{const e=window.__ROOM_APP__.environment;await e.animals.ready;return {spatial:e.surface.audit(),seasons:Object.keys(e.state.seasons),animals:e.animals.animals.map(a=>({id:a.id,source:a.source})),people:e.village.agents.length};});assert.equal(state.spatial.invalid.length,0);assert.equal(state.seasons.length,4);assert.ok(state.animals.every(a=>a.source==='GLTFLoader'));assert.equal(state.people,3);assert.deepEqual(errors,[]);console.log('PASS room interactions, season APIs, spatial contracts and GLTF-only wildlife');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
