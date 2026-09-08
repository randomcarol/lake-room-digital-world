/* Object-specific content definitions shared by the Owner Studio and public adapters. */
window.RoomContentSchema=(()=>{
 const objects={
  monitor:{label:'Computer',entry:'经历 / 简历',defaultKind:'pdf',description:'发布简历 PDF、个人简介或项目链接。'},
  notebook:{label:'Notebook',entry:'手账页面',defaultKind:'text',description:'一条内容对应一页竖版手账，可附日期、图片与装饰标签。'},
  turntable:{label:'Record Player',entry:'歌曲 / 歌单',defaultKind:'audio',description:'记录音乐、记忆与网易云链接；只有上传自有音频后才可手动播放。'},
  map:{label:'World Map',entry:'地图 / 旅行地点',defaultKind:'text',description:'上传一张自定义地图，或添加可拖动的旅行图钉。'},
  photoWall:{label:'Photo Wall',entry:'照片',defaultKind:'image',description:'发布照片、拍摄日期、地点、说明与长故事。'},
  books:{label:'Bookshelf',entry:'书籍',defaultKind:'image',description:'记录封面、作者、豆瓣链接、短评、标签与评分。'}
 };
 const metadata={
  monitor:[],
  notebook:['date','stickers'],
  turntable:['artist','moodTags','coverUrl'],
  map:['role','city','country','date','x','y','tags','photoUrls'],
  photoWall:['date','location','tags'],
  books:['author','tags','rating']
 };
 function defaults(id){return {kind:objects[id]?.defaultKind||'text',metadata:id==='map'?{role:'pin',x:.5,y:.5}:{}};}
 return {objects,metadata,defaults};
})();
