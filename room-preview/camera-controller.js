/* Single sequence: overview → approach → hold → experience → closing → return. */
window.CameraController = class {
  constructor(app, onEnter, onExit) {
    this.app=app;this.onEnter=onEnter;this.onExit=onExit;this.phase='overview';this.elapsed=0;
    this.off=app.onFrame(dt=>this.update(dt));
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  start(type) {
    if(this.phase!=='overview'||!this.app.hits[type])return false;
    const {camera,controls}=this.app;
    controls.enableDamping=false;controls.update();controls.enabled=false;
    this.saved={position:camera.position.clone(),target:controls.target.clone(),narrow:camera.aspect<.8};
    this.type=type;
    this.app.focusNotebook(type==='notebook');
    const target=new THREE.Box3().setFromObject(this.app.hits[type]).getCenter(new THREE.Vector3());
    const offset=type==='map'||type==='photoWall'?new THREE.Vector3(3.3,.12,.18):type==='notebook'?new THREE.Vector3(.15,1.3,1.0):type==='turntable'?new THREE.Vector3(2.1,1.35,1.4):type==='books'?new THREE.Vector3(.6,1.0,3.7):new THREE.Vector3(0,.14,1.4);
    if(camera.aspect<.8)offset.multiplyScalar(1.35);
    this.moveTo(target.clone().add(offset),target,'approach');return true;
  }
  moveTo(position,target,phase){this.from={position:this.app.camera.position.clone(),target:this.app.controls.target.clone()};this.to={position,target};this.setPhase(phase);}
  setPhase(phase){this.phase=phase;this.elapsed=0;document.body.dataset.interactionPhase=phase;}
  close(){
    if(this.phase==='overview'||this.phase==='closing'||this.phase==='return')return;
    const narrow=this.app.camera.aspect<.8;
    if(this.saved.narrow!==narrow){const preset=RoomQACameras[narrow?'mobile':'desktop'];this.saved.position.fromArray(preset.position);this.saved.target.fromArray(preset.target);this.saved.narrow=narrow;}
    this.app.focusNotebook(false);
    this.onExit();this.setPhase('closing');
  }
  update(dt){
    this.elapsed+=dt;
    if(this.phase==='approach'||this.phase==='return'){
      const u=Math.min(1,this.elapsed/(this.reduced?.15:1.65)),ease=u*u*u*(u*(u*6-15)+10);
      this.app.camera.position.lerpVectors(this.from.position,this.to.position,ease);
      this.app.controls.target.lerpVectors(this.from.target,this.to.target,ease);
      this.app.camera.lookAt(this.app.controls.target);
      if(u===1){if(this.phase==='approach')this.setPhase('hold');else{this.setPhase('overview');this.app.controls.enabled=true;this.app.controls.enableDamping=true;this.app.controls.update();document.dispatchEvent(new Event('room-overview'));}}
    } else if(this.phase==='hold'&&this.elapsed>=(this.reduced?.1:.9)){this.setPhase('experience');this.onEnter(this.type);}
    else if(this.phase==='closing'&&this.elapsed>.32)this.moveTo(this.saved.position,this.saved.target,'return');
  }
  dispose(){this.off();}
};

/* Fixed evidence cameras, also used for initial overview. Never rescale the room for composition. */
window.RoomQACameras=Object.freeze({
 desktop:Object.freeze({position:[10.7,3.9,11.7],target:[4,1.75,2.8],fov:45}),
 mobile:Object.freeze({position:[13,6.5,24],target:[4,1.75,2.8],fov:53}),
 apply(app,device){const p=this[device];app.controls.enabled=false;app.camera.position.fromArray(p.position);app.controls.target.fromArray(p.target);app.camera.fov=p.fov;app.camera.updateProjectionMatrix();app.camera.lookAt(app.controls.target);}
});
