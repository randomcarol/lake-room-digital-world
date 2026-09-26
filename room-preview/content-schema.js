/* Object-specific content definitions shared by the Owner Studio and public adapters. */
window.RoomContentSchema=(()=>{
 const objects={
  monitor:{label:'Computer',entry:'项目 / 简历',defaultKind:'link',description:'发布作品项目、项目 demo 或简历 PDF。项目会显示在房间电脑桌面。'},
  notebook:{label:'Notebook',entry:'手账页面',defaultKind:'text',description:'一条内容对应一页竖版手账，可附日期、图片与装饰标签。'},
  turntable:{label:'Record Player',entry:'歌曲 / 歌单',defaultKind:'audio',description:'记录音乐、记忆与网易云链接；只有上传自有音频后才可手动播放。'},
  map:{label:'World Map',entry:'地图 / 旅行地点',defaultKind:'text',description:'上传一张自定义地图，或添加可拖动的旅行图钉。'},
  photoWall:{label:'Photo Wall',entry:'照片',defaultKind:'image',description:'发布照片、拍摄日期、地点、说明与长故事。'},
  books:{label:'Bookshelf',entry:'书籍',defaultKind:'image',description:'记录封面、作者、豆瓣链接、短评、标签与评分。'}
 };
 const metadata={
  monitor:['type','category','status','year','tags','demoUrl','demoLabel','accent'],
  notebook:['date','stickers'],
  turntable:['artist','moodTags','coverUrl'],
  map:['role','city','country','date','x','y','tags','photoUrls'],
  photoWall:['date','location','tags'],
  books:['author','tags','rating']
 };
 function defaults(id){const metadata=id==='map'?{role:'pin',x:.5,y:.5}:id==='monitor'?{type:'project',category:'PROJECT',accent:'#a85d3d'}:{};return {kind:objects[id]?.defaultKind||'text',metadata};}
 return {objects,metadata,defaults};
})();
