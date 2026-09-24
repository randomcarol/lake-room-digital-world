/* Spatial tests exercise rejection, entire footprints and moving routes, without WebGL. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{},console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('room-preview/world-surface.js','utf8'),ctx);
const S=ctx.window.WorldSurface,s=S.create();
assert.equal(s.surfaceType(0,-50),'water');assert.throws(()=>s.place('tree',0,-50));
assert.throws(()=>s.place('house',0,s.nearShore(0)+3,{radius:3}),'footprint must not intersect safe band');
assert.throws(()=>s.place('rock',0,0,{baseY:s.waterLevel-.1}),'below water');
assert.throws(()=>s.place('person',0,0,{baseY:10}),'floating is not terrain anchored');
assert.throws(()=>s.place('house',0,0,{zone:'village'}),'wrong zone');
assert.throws(()=>s.path('unsafe',[[0,0],[0,-60]]));
assert.throws(()=>s.crossing('land-only',[0,0],[1,1],2,.1));
s.place('tree',-20,0,{radius:2});s.place('house',-50,s.farShore(-50)-9,{radius:3,zone:'village'});
s.path('safe',[[0,2],[10,2]]);s.crossing('pier',[16,s.nearShore(16)+4],[16,s.nearShore(16)-5],2,.1);
assert.equal(s.audit().invalid.length,0);
// Reproduce the reported original deterministic side-bank bug, independently of the new contract.
vm.runInContext(fs.readFileSync('room-preview/landscape-assets.js','utf8'),ctx);
const rand=ctx.window.LandscapeAssets.random(2048);function oldShore(x){return -12.5-2.7*Math.sin(x*.045)-Math.min(18,Math.abs(x-4)*.072);}
function oldHeight(x,z){let y=-.16;if(z<oldShore(x))y=-.45-Math.min(1,(oldShore(x)-z)/7)*4.2;if(z<-137)y=1.4+Math.sin(x*.038)*1.7+Math.min(11,Math.max(0,-z-143)*.095);if(Math.abs(x)>76)y+=Math.min(9,Math.pow((Math.abs(x)-76)/30,1.35)*3);if(z>10||x<-4||x>12)y+=Math.sin(x*.19)*Math.sin(z*.17)*.16;return y;}
let submerged=0,severely=0,belowMinus1_5=0;for(let batch=0;batch<3;batch++)for(let i=0;i<500;i++){const opposite=i<400,x=opposite?(rand()-.5)*320:(i%2?-1:1)*(82+rand()*30),z=opposite?-143-rand()*50:-26-rand()*100;rand();rand();if(!opposite){const base=oldHeight(x,z)-.05;if(base<-.47)submerged++;if(base<-.47-1.5)severely++;if(base<-1.5)belowMinus1_5++;}}
assert.equal(submerged,298);assert.equal(severely,221);assert.equal(belowMinus1_5,256);console.log('PASS: rejection / footprint / path / pier contracts; old bug reproduced:',{submerged,severely,belowMinus1_5});
