// Run with NODE_PATH pointing to your Playwright installation; fixtures never alter published content.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
 const page=await browser.newPage({viewport:{width:1100,height:800},deviceScaleFactor:1});page.setDefaultTimeout(60000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.goto('http://127.0.0.1:8931');await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__);
 await page.evaluate(()=>{localStorage.setItem('roomContent.v1',JSON.stringify({resume:{name:'UNTRUSTED OVERRIDE'}}));});
 assert.equal(await page.locator('.interaction-bubble').count(),6);
 for(const type of ['monitor','notebook','turntable','map','photoWall','books']){
  await page.locator(`[data-object="${type}"]`).click();
  await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='experience');
  assert.equal(await page.locator('#experience').isVisible(),true);
  if(type==='monitor'){await page.locator('.pdf-file').click();assert.match(await page.locator('.pdf-area').innerText(),/尚未发布/);}
  if(type==='notebook')await page.screenshot({path:'/tmp/room-notebook.png'});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='overview');
  assert.equal(await page.locator('#experience').isVisible(),false);
  console.log('PASS cinematic '+type);
 }
 await page.evaluate(()=>window.__ROOM_APP__.environment.setMode('day'));
 await page.locator('#day-night').click();await page.waitForTimeout(2300);await page.screenshot({path:'/tmp/room-night.png'});
 assert.equal(await page.locator('#day-night').getAttribute('aria-pressed'),'true');
 await page.evaluate(()=>{const c=window.__ROOM_INTERACTIONS__.controller;c.start('monitor');assertion=c.start('map')===false;c.close();});
 await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='overview');assert.equal(await page.evaluate(()=>assertion),true);
 const base=JSON.parse(fs.readFileSync('room-preview/content.json','utf8'));
 const fixture={...base,notebookPages:Array.from({length:4},(_,i)=>({title:'测试页 '+i,body:'仅测试使用的正文。'})),travelPins:[{id:'test',x:.2,y:.3,city:'测试地点',country:'测试',note:'仅验证数据驱动渲染'}],photos:[{id:'p0',src:'textures/books/cover_0.jpg',title:'测试图片 1'},{id:'p1',src:'textures/books/cover_1.jpg',title:'测试图片 2'}]};
 await page.route('**/content.json',route=>route.fulfill({json:fixture}));await page.reload();await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__);
 async function enter(type){await page.locator(`[data-object="${type}"]`).click();await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='experience');}
 async function exit(){await page.locator('#return-room').click();await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__.controller.phase==='overview');}
 await enter('notebook');await page.locator('.paper.left').click();assert.equal(await page.locator('.expanded-page').isVisible(),true);await page.keyboard.press('Escape');await page.getByRole('button',{name:'下一组页面'}).click();await page.waitForFunction(()=>document.querySelector('.paper h2').textContent==='测试页 2');await exit();
 await enter('map');await page.locator('.map-pin').click();assert.match(await page.locator('.pin-detail').innerText(),/测试地点/);await exit();
 await enter('photoWall');await page.getByRole('button',{name:'下一张照片'}).click();assert.match(await page.locator('figcaption').innerText(),/测试图片 2/);await exit();
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__);await page.screenshot({path:'/tmp/room-mobile.png'});await enter('notebook');await page.screenshot({path:'/tmp/room-mobile-notebook.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await exit();
 // Owner authentication is covered by test_backend.py and admin-browser.cjs.
 const response=await page.request.post('http://127.0.0.1:8931/content.json',{data:{resume:{name:'attack'}}});assert(response.status()>=400);
 assert.deepEqual(errors,[]);console.log('PASS fixtures, mobile, repeat-click lock, static write rejection; no page/resource errors');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
