/* Published JSON is the only public content source. No writes or browser overrides. */
window.ContentStore = (() => {
  function url(value) {
    if(typeof value!=='string'||!value.trim())return '';
    try {const parsed=new URL(value,location.href);return ['http:','https:'].includes(parsed.protocol)?parsed.href:'';}catch{return '';}
  }
  function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
  async function load(){
    const response=await fetch('./content.json',{cache:'no-cache'});
    if(!response.ok)throw Error('内容暂时无法读取，请刷新重试。');
    const data=await response.json();
    ['notebookPages','tracks','travelPins','photos','books'].forEach(key=>{if(!Array.isArray(data[key]))data[key]=[];});
    data.travelPins=data.travelPins.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
    return freeze(data);
  }
  return {load,url};
})();
