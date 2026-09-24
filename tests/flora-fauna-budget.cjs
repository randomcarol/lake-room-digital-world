const fs=require('fs'),assert=require('assert/strict'),base='tests/artifacts/flora-fauna/';
const before=JSON.parse(fs.readFileSync(base+'before/metrics.json')),after=JSON.parse(fs.readFileSync(base+'after/metrics.json')),result={};
assert.equal(before.settleMs,after.settleMs);assert.equal(before.measureMs,after.measureMs);
for(const season of ['spring','summer']){const a=after.performance[season],b=before.performance[season];assert.deepEqual(a.camera,b.camera);assert.equal(a.gpu,b.gpu);result[season]={callsPercent:(a.calls/b.calls-1)*100,trianglesPercent:(a.triangles/b.triangles-1)*100,fps:a.fps};assert.ok(a.calls<=b.calls*1.12,season+' draw call budget');assert.ok(a.triangles<=b.triangles*1.2,season+' triangle budget');assert.ok(a.fps>=55,season+' FPS budget');}
fs.writeFileSync(base+'performance-budget.json',JSON.stringify(result,null,2));console.log('PASS',result);
