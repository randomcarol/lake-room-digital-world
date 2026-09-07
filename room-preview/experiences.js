window.Experiences=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const image=(src,alt,cls='')=>ContentStore.url(src)?`<img class="${cls}" src="${esc(ContentStore.url(src))}" alt="${esc(alt||'')}" loading="lazy">`:'';
 const empty=(title,detail)=>`<div class="empty-state"><span class="eyebrow">A LITTLE SPACE FOR WHAT'S NEXT</span><h2>${title}</h2><p>${detail}</p></div>`;
 function open(type,root,data,app){
  root.className='experience-'+type;root.replaceChildren();
  const abort=new AbortController(),signal=abort.signal;
  const on=(el,event,fn)=>el.addEventListener(event,fn,{signal});
  let release=()=>{};
  if(type==='monitor'){
   root.innerHTML=`<section class="desktop"><div class="desktop-bar"><span>My desktop</span><span>PERSONAL FILES</span></div><div class="desktop-files"><button class="pdf-file"><span>PDF</span>Résumé.pdf</button><p>一点经历，一些正在探索的方向。</p></div><div class="pdf-area"></div></section>`;
   on(root.querySelector('.pdf-file'),'click',()=>{
    const pane=root.querySelector('.pdf-area'),url=ContentStore.url(data.resume?.pdf);
    if(!data.resume?.available||!url){pane.innerHTML=empty('简历即将放入这里','PDF 尚未发布。');return;}
    pane.innerHTML=`<div class="pdf-toolbar"><button class="pdf-back">← 桌面</button><a href="${esc(url)}" target="_blank" rel="noopener">在新窗口阅读 ↗</a></div><iframe title="个人简历 PDF" src="${esc(url)}"></iframe>`;
    on(pane.querySelector('button'),'click',()=>pane.replaceChildren());
   });
  } else if(type==='notebook'){
   let index=0,turning=false;const pages=data.notebookPages;
   root.innerHTML='<div class="notebook-heading"><span class="eyebrow">THOUGHTS, ON PAPER</span><h1>随手记</h1></div><div class="notebook-stage"><div class="notebook-spread"></div></div><nav class="page-navigation"><button aria-label="上一组页面">←</button><span></span><button aria-label="下一组页面">→</button></nav>';
   const spread=root.querySelector('.notebook-spread'),nav=root.querySelectorAll('nav button');
   function render(){
    spread.innerHTML=[0,1].map((_,side)=>{const p=pages[index+side];return `<button class="paper ${side?'right':'left'}" ${p?'':'disabled'}><span class="eyebrow">${String(index+side+1).padStart(2,'0')}</span><h2>${esc(p?.title||(side?'留一页给明天':'手记尚未发布'))}</h2>${image(p?.image,p?.title)}<p>${esc(p?.body||p?.text||(side?'':'这里将收录一些想法与记录。'))}</p>${p?'<span class="read-more">点击展开阅读 ↗</span>':''}</button>`;}).join('');
    root.querySelector('nav span').textContent=pages.length?`${index+1} – ${Math.min(index+2,pages.length)} / ${pages.length}`:'空白手记';nav[0].disabled=index===0;nav[1].disabled=index+2>=pages.length;
    spread.querySelectorAll('.paper').forEach((el,side)=>on(el,'click',()=>{
     const p=pages[index+side];if(!p||turning)return;
     const expanded=document.createElement('article');expanded.className='expanded-page';expanded.innerHTML=`<button aria-label="收起页面">↙ 收起</button><h1>${esc(p.title)}</h1>${image(p.image,p.title)}<p>${esc(p.body||p.text)}</p>`;root.append(expanded);expanded.querySelector('button').focus();on(expanded.querySelector('button'),'click',()=>{expanded.remove();el.focus();});
    }));
   }
   nav.forEach((el,i)=>on(el,'click',()=>{
    if(turning)return;turning=true;
    const page=spread.querySelector(i?'.right':'.left');
    const animation=page.animate([{transform:'rotateY(0deg)'},{transform:`rotateY(${i?-95:95}deg)`,filter:'brightness(.8)'}],{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?1:360,easing:'ease-in'});
    animation.finished.then(()=>{if(signal.aborted)return;index+=i?2:-2;render();turning=false;}).catch(()=>{});
   }));render();
  }else if(type==='turntable'){
   const tracks=data.tracks.filter(t=>ContentStore.url(t.src));let selected=-1;
   const audio=new Audio();audio.preload='metadata';
   root.innerHTML=`<section class="music-layout"><div class="record-side"><span class="eyebrow">THE LISTENING CORNER</span><div class="record"><div class="record-label">SIDE A</div></div><h2 class="now-title">留一点时间给音乐</h2><p class="now-artist"></p></div><div class="playlist"><h1>Listening room</h1>${tracks.length?tracks.map((t,i)=>`<button class="track" data-index="${i}"><span>${String(i+1).padStart(2,'0')}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.artist)}</small></span><span class="track-icon">▷</span></button>`).join(''):empty('唱片尚未上架','发布音乐后，在这里选择与播放。')}<div class="audio-controls"><button class="play-toggle" ${tracks.length?'':'disabled'} aria-label="播放或暂停">▷</button><span class="audio-time">0:00 / 0:00</span><input aria-label="播放进度" type="range" min="0" max="100" value="0" step=".1" disabled></div><p class="audio-status" role="status"></p></div></section>`;
   const record=root.querySelector('.record'),toggle=root.querySelector('.play-toggle'),progress=root.querySelector('input');
   const time=v=>`${Math.floor((v||0)/60)}:${String(Math.floor((v||0)%60)).padStart(2,'0')}`;
   async function play(){try{await audio.play();}catch{if(!signal.aborted)root.querySelector('.audio-status').textContent='音频暂时无法播放，请检查文件或再次点击播放。';}}
   function select(i){selected=i;audio.src=ContentStore.url(tracks[i].src);root.querySelector('.now-title').textContent=tracks[i].title;root.querySelector('.now-artist').textContent=tracks[i].artist||'';root.querySelector('.record-label').innerHTML=image(tracks[i].cover,tracks[i].title)||'SIDE A';root.querySelectorAll('.track').forEach((el,j)=>{el.classList.toggle('active',j===i);el.setAttribute('aria-current',String(j===i));});root.querySelector('.audio-status').textContent='';play();}
   root.querySelectorAll('.track').forEach(el=>on(el,'click',()=>{const i=Number(el.dataset.index);if(i===selected){audio.paused?play():audio.pause();}else select(i);}));
   on(toggle,'click',()=>{if(selected<0)select(0);else audio.paused?play():audio.pause();});
   function reflect(){record.classList.toggle('playing',!audio.paused);toggle.textContent=audio.paused?'▷':'Ⅱ';app.setMusicPlaying(!audio.paused);root.querySelectorAll('.track-icon').forEach((el,i)=>el.textContent=i===selected&&!audio.paused?'Ⅱ':'▷');}
   on(audio,'play',reflect);on(audio,'pause',reflect);on(audio,'error',()=>{root.querySelector('.audio-status').textContent='音频文件不可用。';reflect();});
   on(audio,'timeupdate',()=>{const duration=Number.isFinite(audio.duration)?audio.duration:0;root.querySelector('.audio-time').textContent=`${time(audio.currentTime)} / ${time(duration)}`;progress.disabled=!duration;progress.value=duration?audio.currentTime/duration*100:0;});
   on(progress,'input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(progress.value)/100*audio.duration;});
   on(audio,'ended',()=>{if(selected+1<tracks.length)select(selected+1);else reflect();});
   release=()=>{audio.pause();audio.removeAttribute('src');audio.load();app.setMusicPlaying(false);};
  }else if(type==='map'){
   const src=ContentStore.url(data.map?.image)||app.mapTex.image.toDataURL();
   root.innerHTML=`<section class="map-experience"><span class="eyebrow">PLACES & PERSPECTIVES</span><h1>世界，慢慢走</h1><div class="map-layout"><div class="world-map"><img src="${esc(src)}" alt="世界地图">${data.travelPins.map((p,i)=>`<button class="map-pin" style="left:${p.x*100}%;top:${p.y*100}%" data-index="${i}" aria-label="${esc([p.city,p.country].filter(Boolean).join(' · '))}"></button>`).join('')}</div><aside class="pin-detail" aria-live="polite">${empty(data.travelPins.length?'每一枚图钉，一段记忆':'足迹尚未发布',data.travelPins.length?'选择地图上的地点。':'旅行记录将在这里呈现。')}</aside></div></section>`;
   root.querySelectorAll('.map-pin').forEach(el=>on(el,'click',()=>{const p=data.travelPins[Number(el.dataset.index)];root.querySelectorAll('.map-pin').forEach(b=>b.classList.toggle('active',b===el));root.querySelector('.pin-detail').innerHTML=`<span class="eyebrow">${esc(p.country)}</span><h2>${esc(p.city)}</h2><small>${esc(p.date)}</small><p>${esc(p.note)}</p>${(p.photos||[]).map(src=>image(src,p.city)).join('')}`;}));
  }else if(type==='photoWall'){
   let index=0;const photos=data.photos.filter(p=>ContentStore.url(p.src));
   root.innerHTML=`<section class="gallery"><span class="eyebrow">MOMENTS, KEPT CLOSE</span><div class="gallery-stage"></div><nav class="gallery-navigation"><button aria-label="上一张照片">←</button><span></span><button aria-label="下一张照片">→</button></nav><div class="contact-sheet"></div></section>`;
   const stage=root.querySelector('.gallery-stage'),buttons=root.querySelectorAll('nav button');
   function render(){const p=photos[index];stage.innerHTML=p?`<figure>${image(p.src,p.alt||p.title||'照片')}<figcaption>${esc(p.title)} <small>${esc(p.date||p.caption)}</small></figcaption></figure>`:empty('记忆正在留白','照片发布后，会在这里展开。');root.querySelector('nav span').textContent=p?`${String(index+1).padStart(2,'0')} / ${String(photos.length).padStart(2,'0')}`:'PHOTO COLLECTION';buttons.forEach(b=>b.disabled=photos.length<2);root.querySelectorAll('.thumbnail').forEach((el,i)=>el.setAttribute('aria-current',String(i===index)));}
   root.querySelector('.contact-sheet').innerHTML=photos.map((p,i)=>`<button class="thumbnail" aria-label="查看第 ${i+1} 张">${image(p.src,p.alt||'照片缩略图')}</button>`).join('');
   root.querySelectorAll('.thumbnail').forEach((el,i)=>on(el,'click',()=>{index=i;render();}));
   function step(delta){if(!photos.length)return;index=(index+delta+photos.length)%photos.length;render();}
   buttons.forEach((el,i)=>on(el,'click',()=>step(i?1:-1)));on(document,'keydown',e=>{if(e.key==='ArrowLeft')step(-1);if(e.key==='ArrowRight')step(1);});
   let startX;on(stage,'pointerdown',e=>startX=e.clientX);on(stage,'pointerup',e=>{if(startX!==undefined&&Math.abs(e.clientX-startX)>45)step(e.clientX<startX?1:-1);startX=undefined;});render();
  }else if(type==='books'){
   const books=data.books.filter(b=>!/^示例书/.test(b.title));
   root.innerHTML=`<section class="reading-room"><span class="eyebrow">THE READING SHELF</span><h1>与文字相处</h1><div class="book-collection">${books.length?books.map(b=>`<article class="reading-book">${image(b.cover,b.title)}<h2>${esc(b.title)}</h2><p>${esc(b.author)}</p><p>${esc(b.note)}</p>${ContentStore.url(b.link)?`<a href="${esc(ContentStore.url(b.link))}" target="_blank" rel="noopener">了解这本书 ↗</a>`:''}</article>`).join(''):empty('书单尚未发布','喜欢的书，值得拥有一个安静的位置。')}</div></section>`;
  }
  // Supplemental collection items share a renderer, so every existing object can hold documents, video and links.
  const collection=data.collections?.find(c=>c.id===type);
  const nativeKinds={monitor:['pdf'],notebook:['text','image'],turntable:['audio'],map:['text','image'],photoWall:['image'],books:['text','image','link']};
  let firstPDF=true;
  const extra=collection?.items.filter(i=>{if(type==='monitor'&&i.kind==='pdf'){if(firstPDF){firstPDF=false;return false;}return true;}return !nativeKinds[type]?.includes(i.kind);})||[];
  if(extra.length){
    const details=document.createElement('details');details.className='collection-extra';details.innerHTML='<summary>更多资料 · '+extra.length+'</summary>'+extra.map(i=>{
      const src=ContentStore.url(i.media_url||i.url);let media='';
      if(src&&i.kind==='video')media=`<video controls preload="none" playsinline src="${esc(src)}"></video>`;
      else if(src&&i.kind==='audio')media=`<audio controls preload="none" src="${esc(src)}"></audio>`;
      else if(src&&i.kind==='image')media=image(src,i.title);
      else if(src)media=`<a href="${esc(src)}" target="_blank" rel="noopener">${i.kind==='pdf'?'阅读文档':'打开链接'} ↗</a>`;
      return `<article><h2>${esc(i.title)}</h2><p>${esc(i.description)}</p><p>${esc(i.body)}</p>${media}</article>`;
    }).join('');root.append(details);
  }
  return ()=>{release();root.querySelectorAll('audio,video').forEach(m=>{m.pause();m.removeAttribute('src');m.load();});abort.abort();root.getAnimations({subtree:true}).forEach(a=>a.cancel());};
 }
 return {open};
})();
