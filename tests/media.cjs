const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
// Two seconds of silent PCM are test fixtures, not published portfolio music.
const pcm=Buffer.alloc(44+16000*2);pcm.write('RIFF');pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(8000,24);pcm.writeUInt32LE(16000,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(pcm.length-44,40);
await page.route('**/test-*.wav',r=>r.fulfill({contentType:'audio/wav',body:pcm}));await page.goto('http://127.0.0.1:8931/admin/');await page.addScriptTag({url:'http://127.0.0.1:8931/content-store.js'});await page.addScriptTag({url:'http://127.0.0.1:8931/experiences.js'});
await page.evaluate(()=>{const root=document.createElement('div');root.id='test';document.body.append(root);window.clean=Experiences.open('turntable',root,{tracks:[{title:'测试一',artist:'测试',src:'/test-1.wav'},{title:'测试二',artist:'测试',src:'/test-2.wav'}]},{setMusicPlaying:v=>window.playing=v});});
await page.locator('.track').first().click();await page.waitForFunction(()=>window.playing===true);await page.locator('.play-toggle').click();await page.waitForFunction(()=>window.playing===false);await page.locator('.track').nth(1).click();await page.waitForFunction(()=>window.playing===true);assert.equal(await page.locator('.now-title').textContent(),'测试二');await page.evaluate(()=>window.clean());assert.equal(await page.evaluate(()=>window.playing),false);
assert.equal(await page.evaluate(()=>ContentStore.url('javascript:alert(1)')),'');assert.equal(await page.evaluate(()=>ContentStore.url('data:text/html,test')),'');assert.deepEqual(errors,[]);console.log('PASS actual audio play, pause, track switch, cleanup and unsafe URL rejection');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
