import base64, http.client, json, os, sys, tempfile, threading, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from server import make_server

class ContentSecurityTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tmp=tempfile.TemporaryDirectory();os.environ['ROOM_OWNER_PASSWORD']='initial-test-password-only'
  cls.server=make_server(cls.tmp.name,0);os.environ.pop('ROOM_OWNER_PASSWORD')
  cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start();cls.port=cls.server.server_port
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();cls.tmp.cleanup()
 def req(self,path,method='GET',data=None,cookie='',csrf='',headers=None):
  conn=http.client.HTTPConnection('127.0.0.1',self.port,timeout=10);h={'Cookie':cookie,'X-CSRF-Token':csrf,**(headers or {})}
  if isinstance(data,dict):data=json.dumps(data).encode();h['Content-Type']='application/json'
  conn.request(method,path,data,h);r=conn.getresponse();raw=r.read();out=json.loads(raw) if r.getheader('Content-Type','').startswith('application/json') else raw;result=(r.status,out,dict(r.getheaders()));conn.close();return result
 def test_full_owner_and_public_boundary(self):
  self.assertEqual(self.req('/api/collections')[0],401)
  self.assertEqual(self.req('/api/items','POST',{})[0],401)
  status,s,h=self.req('/api/login','POST',{'password':'initial-test-password-only'});self.assertEqual(status,200);self.assertTrue(s['mustChangePassword']);cookie=h['Set-Cookie'].split(';')[0];csrf=s['csrf']
  self.assertIn('HttpOnly',h['Set-Cookie']);self.assertIn('SameSite=Strict',h['Set-Cookie'])
  self.assertEqual(self.req('/api/items','POST',{},cookie,csrf)[0],403)
  self.assertEqual(self.req('/api/password','POST',{'password':'a-better-test-password'},cookie,'wrong')[0],403)
  self.assertEqual(self.req('/api/password','POST',{'password':'a-better-test-password'},cookie,csrf,{'Origin':'https://attacker.invalid'})[0],403)
  self.assertEqual(self.req('/api/password','POST',{'password':'a-better-test-password'},cookie,csrf)[0],200)
  self.assertEqual(self.req('/api/collections',cookie=cookie)[0],401)
  status,s,h=self.req('/api/login','POST',{'password':'a-better-test-password'});self.assertEqual(status,200);cookie=h['Set-Cookie'].split(';')[0];csrf=s['csrf']
  png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=')
  status,map_media,_=self.req('/api/media','POST',png,cookie,csrf,{'X-File-Name':'map.png'});self.assertEqual(status,201)
  map_image={'collection_id':'map','kind':'image','title':'Custom map','description':'','body':'','url':'','media_id':map_media['id'],'published':False,'position':0,'metadata':{'role':'map-image'}}
  status,map_created,_=self.req('/api/items','POST',map_image,cookie,csrf);self.assertEqual(status,201)
  bad_pin={**map_image,'kind':'text','title':'Bad pin','media_id':None,'metadata':{'role':'pin'}};self.assertEqual(self.req('/api/items','POST',bad_pin,cookie,csrf)[0],400)
  good_pin={**bad_pin,'title':'Queenstown','metadata':{'role':'pin','x':.84,'y':.78,'city':'Queenstown','photoUrls':['https://example.com/photo.jpg']}}
  status,pin_created,_=self.req('/api/items','POST',good_pin,cookie,csrf);self.assertEqual(status,201)
  self.assertEqual(self.req('/api/items/'+pin_created['id'],'DELETE',cookie=cookie,csrf=csrf)[0],200);self.assertEqual(self.req('/api/items/'+map_created['id'],'DELETE',cookie=cookie,csrf=csrf)[0],200);self.assertEqual(self.req('/api/media/'+map_media['id'],'DELETE',cookie=cookie,csrf=csrf)[0],200)
  status,media,_=self.req('/api/media','POST',png,cookie,csrf,{'X-File-Name':'photo.png'});self.assertEqual(status,201);mid=media['id'];url='/api/media/'+mid
  self.assertEqual(self.req(url)[0],404);self.assertEqual(self.req(url,cookie=cookie)[0],200)
  self.assertEqual(self.req('/api/media','POST',b'<html>attack</html>',cookie,csrf)[0],415)
  item={'collection_id':'photoWall','kind':'image','title':'Test photo','description':'Only a fixture','body':'','url':'','media_id':mid,'published':False,'position':0,'metadata':{}}
  status,created,_=self.req('/api/items','POST',item,cookie,csrf);self.assertEqual(status,201);iid=created['id']
  self.assertEqual(sum(len(c['items']) for c in self.req('/api/content')[1]['collections']),0)
  item['published']=True;self.assertEqual(self.req('/api/items/'+iid,'PUT',item,cookie,csrf)[0],200)
  self.assertEqual(self.req(url)[0],200);self.assertEqual(self.req(url,headers={'Range':'bytes=0-5'})[0],206)
  public=self.req('/api/content')[1];self.assertEqual(public['collections'][4]['items'][0]['title'],'Test photo')
  item['title']='Second photo';second=self.req('/api/items','POST',item,cookie,csrf)[1]['id']
  self.assertEqual(self.req('/api/reorder','POST',{'collection_id':'photoWall','ids':[second,iid]},cookie,csrf)[0],200)
  self.assertEqual(self.req('/api/content')[1]['collections'][4]['items'][0]['id'],second)
  self.assertEqual(self.req('/api/reorder','POST',{'collection_id':'photoWall','ids':[second,second]},cookie,csrf)[0],409)
  self.assertEqual(self.req('/api/items/'+second,'DELETE',cookie=cookie,csrf=csrf)[0],200)
  item['published']=False;self.assertEqual(self.req('/api/items/'+iid,'PUT',item,cookie,csrf)[0],200);self.assertEqual(self.req(url)[0],404)
  self.assertEqual(self.req(url,'DELETE',cookie=cookie,csrf=csrf)[0],409)
  self.assertEqual(self.req('/api/items/'+iid,'DELETE',cookie=cookie,csrf=csrf)[0],200)
  self.assertEqual(self.req(url,'DELETE',cookie=cookie,csrf=csrf)[0],200)
  self.assertEqual(self.req('/%2e%2e/backend/server.py')[0],404)
  self.assertEqual(self.req('/.room-data/content.sqlite')[0],404)
  self.assertEqual(self.req('/content.json','POST',{})[0],405)
  self.assertEqual(self.req('/api/logout','POST',{},cookie,csrf)[0],200);self.assertEqual(self.req('/api/session',cookie=cookie)[0],401)
  with __import__('sqlite3').connect(Path(self.tmp.name)/'content.sqlite') as db:self.assertEqual(db.execute('SELECT must_change FROM owner').fetchone()[0],0)
  self.assertEqual((Path(self.tmp.name)/'content.sqlite').stat().st_mode & 0o777,0o600)

if __name__=='__main__':unittest.main()
