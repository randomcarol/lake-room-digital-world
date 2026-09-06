/* Same-origin data layer: published collections from API, or explicit static deployment mode. */
window.ContentStore=(()=>{
 let config=null;
 function url(value){if(typeof value!=='string'||!value.trim())return '';try{const parsed=new URL(value,document.baseURI);return ['http:','https:'].includes(parsed.protocol)?parsed.href:'';}catch{return '';}}
 function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
 function adapt(base,payload){
  const data={...base,revision:payload.revision,collections:payload.collections};
  const list=id=>payload.collections.find(c=>c.id===id)?.items||[];
  const source=i=>i.media_url||i.url;
  data.notebookPages=list('notebook').map(i=>({id:i.id,title:i.title,body:i.body,description:i.description,image:i.kind==='image'?source(i):'',kind:i.kind,src:source(i)}));
  data.tracks=list('turntable').filter(i=>i.kind==='audio').map(i=>({id:i.id,title:i.title,artist:i.metadata.artist||i.description,src:source(i),cover:i.metadata.cover||''}));
  data.photos=list('photoWall').filter(i=>i.kind==='image').map((i,n)=>({id:'p'+n,contentId:i.id,title:i.title,caption:i.description,alt:i.description||i.title,date:i.metadata.date||'',src:source(i)}));
  data.travelPins=list('map').map(i=>({id:i.id,city:i.metadata.city||i.title,country:i.metadata.country||'',x:i.metadata.x,y:i.metadata.y,note:i.body||i.description,date:i.metadata.date||'',photos:i.kind==='image'&&source(i)?[source(i)]:[]}));
  data.books=list('books').map(i=>({id:i.id,title:i.title,author:i.metadata.author||'',note:i.body||i.description,link:i.url,cover:i.kind==='image'?source(i):'',kind:i.kind,src:source(i)}));
  const pdf=list('monitor').find(i=>i.kind==='pdf');data.resume={...base.resume,pdf:pdf?source(pdf):'',available:!!pdf};
  return data;
 }
 async function get(path){const response=await fetch(path,{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw Error('内容暂时无法读取，请稍后重试。');return response.json();}
 async function load(){
  if(!config)config=await get('./site-config.json');
  const base=await get('./content.json');
  const data=config.api?adapt(base,await get('./api/content')):base;
  ['notebookPages','tracks','travelPins','photos','books'].forEach(k=>{if(!Array.isArray(data[k]))data[k]=[];});
  data.travelPins=data.travelPins.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
  return freeze(data);
 }
 return {load,url,get mode(){return config?.api?'api':'static';}};
})();
