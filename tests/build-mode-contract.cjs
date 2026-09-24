const fs=require('fs'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'room-preview/assets/catalog.json'),'utf8')),index=fs.readFileSync(path.join(root,'room-preview/index.html'),'utf8'),build=fs.readFileSync(path.join(root,'room-preview/build-mode.js'),'utf8');
assert.equal(catalog.schemaVersion,1);assert.deepEqual(catalog.assets.map(a=>a.category),['flower','tree','house']);assert.equal(new Set(catalog.assets.map(a=>a.id)).size,catalog.assets.length);
for(const asset of catalog.assets){assert(asset.version&&asset.renderer&&asset.source.license);assert(asset.bounds.footprintRadius>0);assert(asset.placement.allowedZones.length);assert.equal(asset.placement.allowedSurface,'land');assert(asset.placement.shoreClearance>0);assert(asset.budget.maxInstances>0);}
assert(index.includes('asset-library.js'));assert(index.includes('build-mode.js'));assert(index.includes('await WorldBuildMode.init(app,{mode:ContentStore.mode})'));
for(const contract of ['surface.surfaceType','surface.distanceToShore','surface.terrainHeight','surface.paths','surface.animalPaths','localStorage',"request('world')",'expectedRevision','X-CSRF-Token','undo','redo'])assert(build.includes(contract),contract);
console.log('PASS asset catalog, placement boundaries, local/server persistence and undo/redo contracts');
