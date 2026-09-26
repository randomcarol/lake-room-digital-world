const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const content=JSON.parse(fs.readFileSync(path.join(root,'room-preview/content.json'),'utf8'));
const expected=new Set(['lake-room','ai-school','solo-choir','commute-combo']);

assert.deepEqual(new Set(content.projects.map(project=>project.id)),expected);
for(const project of content.projects){
 assert.match(project.repoUrl,/^https:\/\/github\.com\/randomcarol\//);
 assert.ok(project.summary&&project.body&&project.tags.length,project.id+' needs truthful portfolio copy');
 if(project.demoUrl){
  const routes={demos:'standalone-demos','world-model':'world-model'};
  const [prefix,...parts]=project.demoUrl.split('/');
  assert.ok(routes[prefix],project.demoUrl+' uses an unsupported static route');
  assert.match(parts.join('/'),/^[a-z-]+\.html$/);
  assert.ok(fs.existsSync(path.join(root,routes[prefix],...parts)),project.demoUrl);
 }
}

const store=fs.readFileSync(path.join(root,'room-preview/content-store.js'),'utf8');
const experiences=fs.readFileSync(path.join(root,'room-preview/experiences.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'room-preview/content-schema.js'),'utf8');
assert.match(store,/metadata\.type==='project'/);
assert.match(store,/data\.projects=/);
assert.match(experiences,/project-card/);
assert.match(experiences,/project-detail/);
assert.match(schema,/monitor:\['type','category','status','year','tags','demoUrl','demoLabel','accent'\]/);
console.log('PASS four verified projects, monitor adapter, project desktop and demo links');
