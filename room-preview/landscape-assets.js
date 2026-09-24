/* Original procedural bark, pine needles and distant tree silhouettes. No reference photo is redistributed. */
window.LandscapeAssets=(()=>{
 function random(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
 function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;return t;}
 function needles(){return texture(256,128,(c,w,h)=>{const rand=random(12);c.strokeStyle='#b1bba0';c.lineWidth=2;c.beginPath();c.moveTo(8,64);c.lineTo(248,64);c.stroke();for(let i=0;i<280;i++){let x=8+rand()*235,y=64+(rand()-.5)*10;c.strokeStyle=['#61775b','#9eab85','#cad1a6','#788d67'][i%4];c.lineWidth=.8+rand();c.beginPath();c.moveTo(x,y);c.lineTo(x+12+rand()*22,y+(i%2?1:-1)*(8+rand()*35)*Math.sin(x/w*Math.PI));c.stroke();}});}
 function pine(){return texture(256,512,(c,w,h)=>{const rand=random(43);c.strokeStyle='#867d66';c.lineWidth=4;c.beginPath();c.moveTo(128,510);c.lineTo(128,12);c.stroke();for(let j=0;j<42;j++){const y=22+j*10,width=(y/512)*110*(.6+rand()*.4);for(let side of [-1,1]){c.strokeStyle='#698069';c.lineWidth=2;c.beginPath();c.moveTo(128,y);c.lineTo(128+side*width,y+22);c.stroke();for(let k=0;k<40;k++){const f=rand(),x=128+side*width*f,yy=y+22*f;c.strokeStyle=['#526951','#809776','#384f44'][k%3];c.lineWidth=1.5;c.beginPath();c.moveTo(x,yy);c.lineTo(x+side*(3+rand()*13),yy+7+rand()*10);c.stroke();}}}});}
 function bark(){return texture(128,256,(c,w,h)=>{const rand=random(7);c.fillStyle='#726b5e';c.fillRect(0,0,w,h);for(let i=0;i<480;i++){c.strokeStyle=i%3?'#514d45':'#969082';c.lineWidth=.4+rand()*2;c.beginPath();let x=rand()*w,y=rand()*h;c.moveTo(x,y);c.lineTo(x+rand()*4,y+4+rand()*35);c.stroke();}});}
 function merge(parts){const positions=[],normals=[],uv=[];parts.forEach(([g,m])=>{const geo=g.index?g.toNonIndexed():g.clone();geo.applyMatrix4(m);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);uv.push(...geo.attributes.uv.array);geo.dispose();});const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return g;}
 function pineGeometry(){const parts=[],dummy=new THREE.Object3D(),plane=new THREE.PlaneGeometry(1,1);for(let j=0;j<11;j++){const y=.23+j*.065,radius=(1-y)*.38;for(let k=0;k<5;k++){const a=k*Math.PI*2/5+j*2.4;dummy.position.set(Math.cos(a)*radius*.55,y,Math.sin(a)*radius*.55);dummy.rotation.set(-.25,k*1.7+j,.3);dummy.scale.set(radius*2.3,.11+.1*(1-y),1);dummy.updateMatrix();parts.push([plane,dummy.matrix.clone()]);dummy.rotation.y+=Math.PI/2;dummy.updateMatrix();parts.push([plane,dummy.matrix.clone()]);}}const out=merge(parts);plane.dispose();return out;}
 return {random,texture,needles,pine,bark,merge,pineGeometry};
})();

/* Original, code-authored additions: compact solid foliage, wood siding and walking silhouettes. */
window.LandscapeAssets.solidPine=function(){
 const T=THREE,parts=[],rand=this.random(56),d=new T.Object3D();
 for(let j=0;j<6;j++){
  const h=.27-j*.017,r=.26*(1-j*.12),g=new T.ConeGeometry(r,h,11,2),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<h*.45){const x=p.getX(i),z=p.getZ(i),k=1+.12*Math.sin(x*81+z*53+y*17);p.setX(i,x*k);p.setZ(i,z*k);}}
  g.computeVertexNormals();d.position.set((rand()-.5)*.04,.30+j*.115,0);d.rotation.set(.02,rand()*6,.02);d.scale.setScalar(1);d.updateMatrix();parts.push([g,d.matrix.clone()]);
 }
 return this.merge(parts);
};
window.LandscapeAssets.crown=function(){
 const T=THREE,parts=[],d=new T.Object3D(),rand=this.random(86);
 for(let i=0;i<7;i++){const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position;for(let j=0;j<p.count;j++){const k=.94+.06*Math.sin(p.getX(j)*19+p.getY(j)*13+p.getZ(j)*23);p.setXYZ(j,p.getX(j)*k,p.getY(j)*k,p.getZ(j)*k);}g.computeVertexNormals();const a=i*2.4;d.position.set(Math.cos(a)*.16,.60+(i%3)*.10,Math.sin(a)*.16);d.scale.set(.20,.24,.19);d.rotation.set(i,0,i*.4);d.updateMatrix();parts.push([g,d.matrix.clone()]);}
 return this.merge(parts);
};
window.LandscapeAssets.siding=function(){
 const t=this.texture(128,128,(c,w,h)=>{const rand=this.random(109);c.fillStyle='#d4d0c5';c.fillRect(0,0,w,h);for(let x=0;x<w;x+=16){c.fillStyle='#9e9b92';c.fillRect(x,0,1,h);c.fillStyle='#e1dfd8';c.fillRect(x+1,0,1,h);}for(let i=0;i<360;i++){c.fillStyle='rgba(71,57,42,.11)';c.fillRect(rand()*w,rand()*h,.5,3+rand()*13);}});t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
};
window.LandscapeAssets.walkers=function(){
 // Four gait frames, three inhabitants, 64 x 128 per frame. Boots touch the baseline.
 return this.texture(256,512,(c)=>{
  const coats=['#d0ac68','#8b3e34','#536e77'];
  for(let person=0;person<3;person++)for(let f=0;f<4;f++){
   c.save();c.translate(f*64,person*128);const gait=Math.sin(f*Math.PI/2)*8;
   c.lineCap='round';c.lineWidth=6;c.strokeStyle='#333b3f';
   c.beginPath();c.moveTo(31,77);c.lineTo(28-gait,99);c.lineTo(26-gait,122);c.moveTo(35,77);c.lineTo(37+gait,101);c.lineTo(40+gait,122);c.stroke();
   c.lineWidth=7;c.strokeStyle=coats[person];c.beginPath();c.moveTo(25,45);c.lineTo(19+gait*.6,65);c.lineTo(19+gait,81);c.moveTo(40,45);c.lineTo(46-gait*.6,65);c.lineTo(45-gait,78);c.stroke();
   c.fillStyle=coats[person];c.beginPath();c.moveTo(26,38);c.lineTo(39,38);c.lineTo(44,79);c.lineTo(22,79);c.closePath();c.fill();
   c.fillStyle='#cbb39a';c.fillRect(29,31,8,11);c.beginPath();c.ellipse(33,24,8,11,0,0,Math.PI*2);c.fill();c.fillStyle='#453c35';c.beginPath();c.ellipse(32,18,9,7,-.1,Math.PI,Math.PI*2);c.fill();
   c.strokeStyle='#222d30';c.lineWidth=4;c.beginPath();c.moveTo(22-gait,124);c.lineTo(28-gait,124);c.moveTo(37+gait,124);c.lineTo(44+gait,124);c.stroke();c.restore();
  }
 });
};
