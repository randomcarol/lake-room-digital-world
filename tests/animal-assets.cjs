const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync('room-preview/animal-manifest.js','utf8'),context);
const report=[];
for(const d of context.window.AnimalManifest){if(!d.enabled){assert.ok(d.blocker);continue;}for(const key of ['sourceURL','author','license','localFile','fileSize','textureSize','defaultScale','checksum'])assert.ok(d[key],d.id+' '+key);if(d.attributionRequired)assert.ok(d.attribution);
 const b=fs.readFileSync('room-preview/'+d.localFile);assert.equal(b.length,d.fileSize);assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),d.checksum);
 const n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString());assert.deepEqual(g.animations.map(a=>a.name),Array.from(d.clipNames));assert.ok(g.skins.length);assert.ok(!g.extensionsRequired?.includes('KHR_draco_mesh_compression'));
 const textures=[];for(const image of g.images||[]){assert.ok(!image.uri,'external runtime texture');const v=g.bufferViews[image.bufferView],offset=28+n+(v.byteOffset||0);assert.equal(image.mimeType,'image/png');const size=[b.readUInt32BE(offset+16),b.readUInt32BE(offset+20)];assert.ok(Math.max(...size)<=1024);textures.push(size);}
 report.push({id:d.id,fileSize:b.length,triangles:g.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+g.accessors[p.indices??p.attributes.POSITION].count/3,0),0),skins:g.skins.length,textures,clips:g.animations.map(a=>a.name),checksum:d.checksum});
}
fs.writeFileSync('tests/artifacts/flora-fauna/assets.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
