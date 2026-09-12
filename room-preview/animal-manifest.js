/* Only reviewed local files may be enabled. Actual clip names/checksums are tested. */
window.AnimalManifest=[
 {id:'rabbit',species:'rabbit',enabled:true,sourceURL:'https://opengameart.org/content/rabbit-0',downloadURL:'https://opengameart.org/sites/default/files/rabbit-FBX.7z',author:'Čestmír Dammer (CDmir); TinyWorlds (page collaborator); idea by Rick Hoppmann and Keppu',license:'CC0-1.0',attributionRequired:false,attribution:'Rabbit by Čestmír Dammer, Kelgar project, CC0. Converted from the author FBX using Three.js r128, 512 px textures and normalized skin weights.',localFile:'models/animals/rabbit/Rabbit.glb',fileSize:2361252,textureSize:[512,512],textureCount:3,clipNames:['Armature|Jump','Armature|Running','Armature|Guarding','Armature|Sitting.000'],defaultScale:.0004,rotationCorrection:0,footClearance:.018,checksum:'aa7abb1b0e731041e4354471a836eb1fabd213b7a789c0ebfe6e3ca7bee90d1c',compression:'Binary glTF; embedded 512 px PNGs; unused clips removed; no Draco'},
 {id:'swan',species:'swan',enabled:true,sourceURL:'../tools/animal-import/build-water-wildlife.cjs',author:'3D Room project original',license:'Project-owned original; no third-party model data',localFile:'models/animals/swan/Swan.glb',fileSize:56636,textureSize:[0,0],textureCount:0,clipNames:['Idle','Swim','Preen'],defaultScale:1,rotationCorrection:0,waterlineOffset:-.22,checksum:'0ca1219a0ca9c17754e196f43968810d2a49dba909655b0d98eb435e7a8cd9cf',compression:'282 triangle skinned GLB; vertex colors; no textures or Draco'},
 {id:'fox',species:'fox',enabled:true,sourceURL:'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox',downloadURL:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',author:'PixelMannen (model); tomkranis (rigging/animation); @AsoboStudio and @scurest (glTF conversion)',license:'CC0-1.0 model + CC-BY-4.0 animation/conversion',attributionRequired:true,attribution:'Fox model by PixelMannen, CC0. Rigging and animation by tomkranis, glTF conversion by @AsoboStudio and @scurest, CC BY 4.0. Runtime scale adapted for 3D Room; source GLB unchanged.',localFile:'models/animals/fox/Fox.glb',fileSize:162852,textureSize:[1024,1024],clipNames:['Survey','Walk','Run'],defaultScale:.011,rotationCorrection:0,checksum:'d97044e701822bac5a62696459b27d7b375aada5de8574ed4362edbba94771f7',compression:'Original binary glTF; embedded PNG; no Draco'},
 {id:'fish',species:'fish',enabled:true,sourceURL:'../tools/animal-import/build-water-wildlife.cjs',author:'3D Room project original',license:'Project-owned original; no third-party model data',localFile:'models/animals/fish/LakeFish.glb',fileSize:23260,textureSize:[0,0],textureCount:0,clipNames:['Idle','Swim'],defaultScale:1.15,rotationCorrection:0,waterlineOffset:-.18,checksum:'ea9c6557bbd1f297a1a2534377dd81e010a6f7304dc7b9a8718f83df319116cd',compression:'110 triangle skinned GLB; vertex colors; no textures or Draco'}
];
window.AnimalSpecies={
 rabbit:{label:'草地上的小兔子',story:'小兔子今天发现了窗外新长出的一小片嫩草。',medium:'land',radius:.34,moveState:'hop',strideMetres:.55,gait:[.1,.72],clipMap:{idle:'Armature|Sitting.000',lookAround:'Armature|Guarding',hop:'Armature|Jump'},route:[[-3,-4.5],[-1,-5.5],[2,-6.2],[5,-6.2]],rest:[3,7],nightThreshold:.62},
 fox:{label:'树林边的小狐狸',story:'这只狐狸每天傍晚都会路过湖边，确认窗里仍亮着灯。',medium:'land',radius:.48,moveState:'walk',strideMetres:.52,clipMap:{idle:'Survey',lookAround:'Survey',walk:'Walk',leave:'Walk'},route:[[-19,-4],[-16,-6],[-12,-7],[-9,-6]],rest:[5,9],away:[22,38],nightThreshold:.88},
 swan:{label:'白天鹅',story:'这只天鹅喜欢停在阳光倒影旁边，慢慢梳理羽毛。',medium:'water',radius:.6,shoreClearance:3,minDepth:1.1,submerge:0,bounds:{x:[-24,24],z:[-52,-25]},moveState:'swim',strideMetres:.22,clipMap:{idle:'Idle',swim:'Swim'},route:[[0,-30],[5,-34],[9,-32]],rest:[4,9],nightThreshold:1.1},
 fish:{label:'湖里的小鱼',story:'它喜欢待在湖面最亮的那一小片波光下面。',medium:'water',radius:.18,shoreClearance:2.5,minDepth:1.2,submerge:.35,bounds:{x:[-18,18],z:[-43,-21]},moveState:'swim',strideMetres:.30,clipMap:{idle:'Idle',swim:'Swim'},route:[[-3,-24],[0,-27],[5,-26]],rest:[1,3],nightThreshold:1.1}
};
// One habitat definition drives both reserved flower corridors and all cloned actors.
Object.assign(AnimalSpecies.rabbit,{strideMetres:.65,locomotionRate:1.6,rest:[1.6,4.2]});
Object.assign(AnimalSpecies.fox,{strideMetres:.60,locomotionRate:1.35,rest:[2.5,5.5],away:[9,18]});
Object.assign(AnimalSpecies.swan,{strideMetres:1.3,bounds:{x:[-80,50],z:[-88,-22]},rest:[2,5]});
Object.assign(AnimalSpecies.fish,{strideMetres:.65,submerge:.15,bounds:{x:[-24,24],z:[-45,-20]},rest:[.5,1.8]});
window.AnimalHabitats=[
 {id:'rabbit',species:'rabbit',route:[[-5,-3.8],[-3,-4.5],[-1,-5.5],[2,-6.2],[5,-6.2],[8,-7.6]]},
 {id:'rabbit-west',species:'rabbit',primary:false,route:[[-12,9],[-10,5],[-9,1],[-7,-2]]},
 {id:'rabbit-east',species:'rabbit',primary:false,route:[[12,12],[14,9],[16,6],[18,3]]},
 {id:'fox',species:'fox',route:[[-24,4],[-21,0],[-18,-4],[-14,-7],[-10,-5],[-8,-9]]},
 {id:'fox-village',species:'fox',primary:false,castShadow:false,route:[[-91,-108],[-89,-112],[-86,-116]]},
 {id:'swan',species:'swan',route:[[-2,-27],[4,-33],[13,-37],[21,-31]]},
 {id:'swan-west',species:'swan',primary:false,route:[[-15,-30],[-23,-39],[-36,-44],[-44,-36]]},
 {id:'swan-pair',species:'swan',primary:false,route:[[5,-29],[12,-34],[22,-38],[28,-33]]},
 {id:'swan-far',species:'swan',primary:false,route:[[-38,-78],[-29,-73],[-17,-77],[-10,-84]]},
 {id:'swan-far-west',species:'swan',primary:false,route:[[-61,-74],[-54,-81],[-43,-80]]},
 {id:'fish',species:'fish',route:[[-3,-24],[0,-27],[5,-26],[8,-23]]},
 {id:'fish-west',species:'fish',primary:false,route:[[-10,-24],[-16,-29],[-12,-32],[-5,-29]]},
 {id:'fish-east',species:'fish',primary:false,route:[[5,-25],[11,-30],[18,-29],[20,-24]]}
];
window.AnimalPopulation=AnimalHabitats.map(h=>({...AnimalManifest.find(d=>d.species===h.species),...h}));
