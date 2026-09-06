/* Lightweight, genuinely spatial garden; one shared day/night state. */
window.OutdoorEnvironment = {
  create(scene, lights) {
    const trees = [], daySky = new THREE.Color('#b7d9e5'), nightSky = new THREE.Color('#111e39');
    let night = false, blend = 0;
    scene.fog = new THREE.Fog(daySky, 22, 65);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 110), new THREE.MeshStandardMaterial({color:'#8baf76', roughness:1}));
    ground.rotation.x = -Math.PI/2; ground.position.set(4,-0.12,-20); ground.receiveShadow = true; scene.add(ground);
    const trunkGeo = new THREE.CylinderGeometry(.10,.19,2.8,7);
    const crownGeo = new THREE.IcosahedronGeometry(1,1);
    const dayGround=new THREE.Color('#8baf76'),nightGround=new THREE.Color('#273d43');
    const dayHemi=new THREE.Color('#fff4e2'),nightHemi=new THREE.Color('#7184b5');
    const bark = new THREE.MeshStandardMaterial({color:'#826447',roughness:1});
    const leafMats = ['#608747','#789f58','#91ae6a'].map(color=>new THREE.MeshStandardMaterial({color,roughness:1}));
    const dayLeaves=leafMats.map(m=>m.color.clone()),nightLeaf=new THREE.Color('#263f43');
    for(let i=0;i<22;i++) {
      const tree = new THREE.Group(), row = Math.floor(i/8);
      tree.position.set(-13+(i%8)*4.5+(row%2)*2,0,-5-row*7-(i%3));
      tree.scale.setScalar(.85+(i%5)*.16);
      const trunk = new THREE.Mesh(trunkGeo,bark); trunk.position.y=1.35; tree.add(trunk);
      const crown = new THREE.Group(); crown.position.y=2.1; tree.add(crown);
      for(let j=0;j<4;j++) {const leaf=new THREE.Mesh(crownGeo,leafMats[(i+j)%3]); leaf.position.set(Math.sin(j*2.4)*.65,j*.48,Math.cos(j*2.4)*.55);leaf.scale.set(1.05,1.3,1);crown.add(leaf);}
      trees.push(crown); scene.add(tree);
    }
    for(let i=0;i<6;i++) { const hill=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),leafMats[i%3]);hill.position.set(-24+i*13,-1.5,-35-i%2*8);hill.scale.set(12,4+i%3,8);scene.add(hill); }
    const starGeo=new THREE.BufferGeometry(), points=[];
    for(let i=0;i<160;i++){ points.push(Math.sin(i*13.7)*45,12+(i%23),-12-Math.abs(Math.cos(i*4.2))*36); }
    starGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:'#fff4d5',size:.10,transparent:true,opacity:0,depthWrite:false}));scene.add(stars);
    const moon=new THREE.Mesh(new THREE.SphereGeometry(.65,16,12),new THREE.MeshBasicMaterial({color:'#fff2cc',transparent:true,opacity:0}));moon.position.set(-5,13,-27);scene.add(moon);
    const lamp=new THREE.PointLight('#ffbc70',0,6,2);lamp.position.set(3.72,1.58,1.95);scene.add(lamp);
    return {
      setNight(value){night=!!value;},
      get isNight(){return night;},
      update(dt,t){
        blend += ((night?1:0)-blend)*(1-Math.exp(-dt*1.8));
        scene.background.copy(daySky).lerp(nightSky,blend);scene.fog.color.copy(scene.background);
        lights.hemisphere.intensity=.70-.40*blend;
        lights.hemisphere.color.copy(dayHemi).lerp(nightHemi,blend);
        ground.material.color.copy(dayGround).lerp(nightGround,blend);
        leafMats.forEach((m,i)=>m.color.copy(dayLeaves[i]).lerp(nightLeaf,blend));
        lights.sun.intensity=1.5-1.22*blend;lights.sun.color.setRGB(1-.43*blend,.88-.18*blend,.72+.28*blend);
        lights.fill.intensity=.22+.38*blend;lamp.intensity=blend*2.4;
        lights.renderer.toneMappingExposure=1.05-.12*blend;
        stars.material.opacity=blend*.8;moon.material.opacity=blend;
        trees.forEach((c,i)=>{c.rotation.z=Math.sin(t*.48+i*1.7)*.025;c.rotation.x=Math.sin(t*.32+i)*.012;});
      }
    };
  }
};
