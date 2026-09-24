/* Original distant wing silhouettes, one dynamic buffer and one draw call. */
window.BirdSystem={create(parent){
 const count=9,positions=new Float32Array(count*18),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.MeshBasicMaterial({color:'#34434b',side:THREE.DoubleSide,fog:true,transparent:true,opacity:.85,depthWrite:false});
 const mesh=new THREE.Mesh(g,material);mesh.name='distant-flying-birds';mesh.frustumCulled=false;parent.add(mesh);let visibleCount=count;
 function update(t,night){material.opacity=.85*(1-night*.85);for(let i=0;i<count;i++){const phase=t*(.022+i*.0017)+i*1.43,x=-27+Math.sin(phase)*31+i*1.7,z=-70+Math.cos(phase*.81)*15,y=17+i%3*3+Math.sin(phase*2)*1.4,heading=Math.atan2(Math.cos(phase),-Math.sin(phase*.81)*.4),wing=Math.sin(t*(3.1+i*.21)+i)*.24;const vertices=[[0,0,.3],[-.66,wing,-.12],[0,0,-.17],[0,0,.3],[0,0,-.17],[.66,wing,-.12]];vertices.forEach((v,k)=>{const j=i*18+k*3;positions[j]=x+v[0]*Math.cos(heading)+v[2]*Math.sin(heading);positions[j+1]=y+v[1];positions[j+2]=z-v[0]*Math.sin(heading)+v[2]*Math.cos(heading);});}g.attributes.position.needsUpdate=true;g.setDrawRange(0,visibleCount*6);}
 return {mesh,count,update,setQuality(q){visibleCount=q==='low'?4:count;},get visibleCount(){return visibleCount;}};
}};
