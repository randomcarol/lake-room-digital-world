const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');

(async()=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'room-projects-test-'));
 const server=spawn('/Library/Frameworks/Python.framework/Versions/3.14/bin/python3',['backend/server.py','--port','8934','--data-dir',dataDir],{env:{...process.env,ROOM_OWNER_PASSWORD:'project-browser-test-password'},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('server exited '+code)));});
 let browser;
 try{
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
  const page=await browser.newPage({viewport:{width:1100,height:800},reducedMotion:'reduce'});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('http://127.0.0.1:8934/');await page.waitForFunction(()=>window.__ROOM_INTERACTIONS__?.content?.projects?.length===4);
  await page.locator('[data-object="monitor"]').click();await page.locator('.project-card').first().waitFor();assert.equal(await page.locator('.project-card').count(),4);
  await page.locator('.project-card',{hasText:'AI International School'}).click();assert.equal(await page.locator('.project-detail h1').textContent(),'AI International School');
  const layer=await page.evaluate(async()=>{const desktop=document.querySelector('.desktop'),home=document.querySelector('.desktop-home'),pane=document.querySelector('.desktop-pane'),detail=document.querySelector('.project-detail'),css=await fetch('experience.css?inspect='+Date.now()).then(response=>response.text());const selectors=[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].map(rule=>rule.selectorText).filter(Boolean);}catch{return [];}});return {className:desktop.className,paneClassName:pane.className,homeHidden:home.hidden,homeDisplay:getComputedStyle(home).display,paneOpacity:getComputedStyle(pane).opacity,panePosition:getComputedStyle(pane).position,detailBackground:getComputedStyle(detail).backgroundColor,sourceHasRule:css.includes('.desktop-pane.open'),cssomHasRule:selectors.includes('.desktop-pane.open')};});assert.match(layer.className,/pane-open/);assert.match(layer.paneClassName,/open/);assert.equal(layer.homeHidden,true);assert.equal(layer.homeDisplay,'none');assert.equal(layer.sourceHasRule,true);assert.equal(layer.cssomHasRule,true,JSON.stringify(layer));assert.equal(layer.detailBackground,'rgb(255, 250, 240)',JSON.stringify(layer));assert.equal(layer.paneOpacity,'1');assert.equal(layer.panePosition,'absolute');
  assert.equal(await page.locator('.project-actions a',{hasText:'GitHub'}).getAttribute('href'),'https://github.com/randomcarol/ai-international-school');
  assert.match(await page.locator('.project-actions a',{hasText:'校园空间概念'}).getAttribute('href'),/\/demos\/school\.html$/);
  assert.equal((await page.request.get('http://127.0.0.1:8934/demos/school.html')).status(),200);await page.screenshot({path:'/tmp/lake-room-projects-desktop.png'});
  await page.locator('.desktop-pane-toolbar button').click();await page.locator('.project-card',{hasText:'Lake Room'}).click();assert.match(await page.locator('.project-actions a',{hasText:'世界模拟实验室'}).getAttribute('href'),/\/world-model\/demo\.html$/);assert.equal((await page.request.get('http://127.0.0.1:8934/world-model/demo.html')).status(),200);
  await page.locator('.desktop-pane-toolbar button').click();await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('.project-card').count(),4);await page.locator('.project-card',{hasText:'Solo Choir Studio'}).click();await page.screenshot({path:'/tmp/lake-room-projects-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);console.log('PASS desktop/mobile project portfolio, verified GitHub links and project demo routes');
 }finally{if(browser)await browser.close();server.kill('SIGTERM');fs.rmSync(dataDir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1);});
