window.InteractionBubble = class {
  constructor(root,app,type,label,onClick){
    this.app=app;this.type=type;this.button=document.createElement('button');this.button.className='interaction-bubble';
    this.button.textContent=label;this.button.dataset.object=type;this.button.addEventListener('click',onClick);root.append(this.button);
    this.anchor=new THREE.Box3().setFromObject(app.hits[type]).getCenter(new THREE.Vector3());
    this.anchor.y+=type==='books'?.45:type==='notebook'?.22:.48;
    this.projected=new THREE.Vector3();
  }
  update(){
    const p=this.projected.copy(this.anchor).project(this.app.camera),el=this.button;
    el.hidden=p.z>1||p.z< -1;
    const scale=Math.max(.85,Math.min(1,10/this.app.camera.position.distanceTo(this.anchor)));
    el.style.left=Math.max(78,Math.min(innerWidth-78,(p.x*.5+.5)*innerWidth))+'px';
    el.style.top=Math.max(90,Math.min(innerHeight-90,(-p.y*.5+.5)*innerHeight))+'px';
    el.style.transform=`translate(-50%,-100%) scale(${scale})`;
  }
  dispose(){this.button.remove();}
};
