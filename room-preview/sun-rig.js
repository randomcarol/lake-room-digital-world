/* Shared light direction and tightly bounded near-shore shadows; compatible with global r128. */
window.SunRig={
 config:{exposure:1.04,nightExposure:1.08,sunIntensity:2.4,ambientIntensity:.48,nightAmbient:.24,fogDensity:.0018,shadowSize:2048,shadowBounds:{min:[-37,-1,-24],max:[41,12,18]}},
 create(scene,lights){
  const T=THREE,config=this.config,direction=new T.Vector3(),color=new T.Color(),target=new T.Vector3(2,0,-5);
  const sun=lights.sun;sun.target.position.copy(target);sun.shadow.mapSize.set(config.shadowSize,config.shadowSize);
  Object.assign(sun.shadow.camera,{left:-30,right:30,top:27,bottom:-24,near:1,far:125});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00016;sun.shadow.normalBias=.045;
  let lastKey='';
  function update(sample,season){
   const night=sample.night,dusk=sample.dusk;
   // This low afternoon azimuth reflects into the overview lake and casts warm window shadows.
   direction.set(-.24,night>.6?.15:.17-dusk*.055,-.94).normalize();
   sun.position.copy(target).addScaledVector(direction,65);
   color.set(season.sun.color).lerp(new T.Color('#a9c8ed'),night);
   sun.color.copy(color);sun.intensity=config.sunIntensity*season.sun.intensity*(1-night*.88);
   lights.hemisphere.intensity=config.ambientIntensity*(1-night)+config.nightAmbient*night;
   lights.hemisphere.color.set('#b5d7f2').lerp(new T.Color('#5376a6'),night);lights.hemisphere.groundColor.set('#73604a');
   lights.fill.intensity=.10+night*.13;lights.renderer.toneMappingExposure=config.exposure*(1-night)+config.nightExposure*night;
   const key=[sample.hours.toFixed(2),season.label].join(':');
   if(key!==lastKey){
    sun.updateMatrixWorld();sun.target.updateMatrixWorld();sun.shadow.updateMatrices(sun);
    const camera=sun.shadow.camera,bounds=config.shadowBounds,lo=new T.Vector3(Infinity,Infinity,Infinity),hi=new T.Vector3(-Infinity,-Infinity,-Infinity);
    for(const x of [bounds.min[0],bounds.max[0]])for(const y of [bounds.min[1],bounds.max[1]])for(const z of [bounds.min[2],bounds.max[2]]){const p=new T.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);lo.min(p);hi.max(p);}
    Object.assign(camera,{left:lo.x-2,right:hi.x+2,bottom:lo.y-2,top:hi.y+2,near:Math.max(.5,-hi.z-3),far:-lo.z+3});camera.updateProjectionMatrix();sun.shadow.updateMatrices(sun);
    lights.renderer.shadowMap.needsUpdate=true;lastKey=key;
   }
   return {direction,color,night,dusk};
  }
  return {direction,color,config,update,light:sun,invalidate(){lastKey='';lights.renderer.shadowMap.needsUpdate=true;}};
 }
};
