#!/usr/bin/env python3
"""Single-owner content service. SQLite/files are outside the published static directory."""
import argparse, hashlib, hmac, http.cookies, json, mimetypes, os, secrets, sqlite3, ssl, threading, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote

ROOT=Path(__file__).resolve().parents[1]
COLLECTIONS={'monitor':'Computer','notebook':'Notebook','turntable':'Record Player','map':'World Map','photoWall':'Photo Wall','books':'Bookshelf'}
MAX_UPLOAD=64*1024*1024

def password_hash(password,salt):
    return hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),600_000).hex()

def connect(directory):
    db=sqlite3.connect(directory/'content.sqlite',timeout=15)
    db.row_factory=sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db

def initialize(directory):
    directory.mkdir(parents=True,exist_ok=True,mode=0o700)
    (directory/'media').mkdir(exist_ok=True,mode=0o700)
    with connect(directory) as db:
        db.executescript((ROOT/'backend/schema.sql').read_text())
        db.executemany('INSERT OR IGNORE INTO collections VALUES(?,?)',COLLECTIONS.items())
        if not db.execute('SELECT 1 FROM owner').fetchone():
            password=os.environ.get('ROOM_OWNER_PASSWORD') or secrets.token_urlsafe(20)
            if len(password)<12: raise ValueError('Owner password must be at least 12 characters')
            salt=secrets.token_hex(16)
            db.execute('INSERT INTO owner VALUES(1,?,?,1)',(salt,password_hash(password,salt)))
            if not os.environ.get('ROOM_OWNER_PASSWORD'):
                fd=os.open(directory/'owner-bootstrap.txt',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
                with os.fdopen(fd,'w') as file:file.write(password+'\n')
        db.execute('DELETE FROM sessions WHERE expires<?',(time.time(),))
    os.chmod(directory/'content.sqlite',0o600)

class APIError(Exception):
    def __init__(self,status,message):self.status=status;self.message=message

class Handler(BaseHTTPRequestHandler):
    server_version='RoomContent/1.0'
    def log_message(self,format,*args):pass  # Never log request bodies, tokens or credentials.
    def db(self):return connect(self.server.directory)
    def path_info(self):return unquote(urlsplit(self.path).path)
    def json(self,status,data,headers=None):
        body=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        for key,value in (headers or {}).items():self.send_header(key,value)
        self.send_header('Content-Length',str(len(body)));self.end_headers()
        if self.command!='HEAD':self.wfile.write(body)
    def body(self,limit=512_000):
        try:length=int(self.headers.get('Content-Length','0'))
        except ValueError:raise APIError(400,'无效请求长度')
        if length<0 or length>limit:raise APIError(413,'文件或内容超过大小限制')
        if self.headers.get('Transfer-Encoding'):raise APIError(400,'不支持分块请求')
        return self.rfile.read(length)
    def read_json(self):
        try:
            data=json.loads(self.body())
            if not isinstance(data,dict):raise ValueError()
            return data
        except (ValueError,UnicodeDecodeError):raise APIError(400,'请求必须是 JSON 对象')
    def same_origin(self):
        origin=self.headers.get('Origin')
        expected=self.server.origin or ('http://'+self.headers.get('Host',''))
        if origin and origin.rstrip('/')!=expected.rstrip('/'):raise APIError(403,'跨站请求被拒绝')
        if self.headers.get('Sec-Fetch-Site')=='cross-site':raise APIError(403,'跨站请求被拒绝')
    def session(self,required=True,write=False):
        cookie=http.cookies.SimpleCookie()
        try:cookie.load(self.headers.get('Cookie',''))
        except http.cookies.CookieError:pass
        token=cookie.get('room_session');token_hash=hashlib.sha256(token.value.encode()).hexdigest() if token else ''
        with self.db() as db:row=db.execute('SELECT * FROM sessions WHERE token_hash=? AND expires>?',(token_hash,time.time())).fetchone()
        if not row:
            if required:raise APIError(401,'请先登录 Owner 账号')
            return None
        if write:
            self.same_origin()
            if not hmac.compare_digest(self.headers.get('X-CSRF-Token',''),row['csrf']):raise APIError(403,'会话验证失败，请重新登录')
        return row
    def cookie(self,token,age=43200):
        return f'room_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age={age}'+('; Secure' if self.server.secure else '')
    def do_GET(self):self.dispatch()
    def do_HEAD(self):self.dispatch()
    def do_POST(self):self.dispatch()
    def do_PUT(self):self.dispatch()
    def do_DELETE(self):self.dispatch()
    def dispatch(self):
        try:self.route()
        except APIError as error:self.json(error.status,{'error':error.message})
        except (BrokenPipeError,ConnectionResetError):pass
        except Exception as error:
            print('Request failure:',type(error).__name__,flush=True)
            self.json(500,{'error':'服务暂时不可用，请稍后重试'})
    def route(self):
        path=self.path_info();method=self.command
        if path=='/site-config.json' and method in ('GET','HEAD'):return self.json(200,{'api':True})
        if path=='/api/health' and method in ('GET','HEAD'):return self.json(200,{'service':'room-content','version':1})
        if path=='/api/session' and method=='GET':
            session=self.session()
            with self.db() as db:owner=db.execute('SELECT must_change FROM owner').fetchone()
            return self.json(200,{'authenticated':True,'csrf':session['csrf'],'mustChangePassword':bool(owner['must_change'])})
        if path=='/api/login' and method=='POST':
            self.same_origin();data=self.read_json();ip=self.client_address[0]
            with self.server.rate_lock:
                attempts=[v for v in self.server.attempts.get(ip,[]) if time.time()-v<300]
                if len(attempts)>=8:raise APIError(429,'尝试过于频繁，请五分钟后重试')
                attempts.append(time.time());self.server.attempts[ip]=attempts
            with self.db() as db:
                owner=db.execute('SELECT * FROM owner').fetchone()
                password=data.get('password','')
                if not isinstance(password,str) or len(password)>1024 or not hmac.compare_digest(password_hash(password,owner['salt']),owner['password_hash']):raise APIError(401,'密码不正确')
                token=secrets.token_urlsafe(32);csrf=secrets.token_urlsafe(24)
                db.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),csrf,time.time()+43200))
            with self.server.rate_lock:self.server.attempts.pop(ip,None)
            return self.json(200,{'authenticated':True,'csrf':csrf,'mustChangePassword':bool(owner['must_change'])},{'Set-Cookie':self.cookie(token)})
        if path=='/api/logout' and method=='POST':
            session=self.session(write=True)
            with self.db() as db:db.execute('DELETE FROM sessions WHERE token_hash=?',(session['token_hash'],))
            return self.json(200,{'ok':True},{'Set-Cookie':self.cookie('',0)})
        if path=='/api/password' and method=='POST':
            self.session(write=True);password=self.read_json().get('password','')
            if not isinstance(password,str) or not 12<=len(password)<=1024:raise APIError(400,'密码需为 12–1024 个字符')
            salt=secrets.token_hex(16)
            with self.db() as db:
                db.execute('UPDATE owner SET salt=?,password_hash=?,must_change=0 WHERE id=1',(salt,password_hash(password,salt)))
                db.execute('DELETE FROM sessions')
            (self.server.directory/'owner-bootstrap.txt').unlink(missing_ok=True)
            return self.json(200,{'ok':True},{'Set-Cookie':self.cookie('',0)})
        if path=='/api/content' and method in ('GET','HEAD'):
            with self.db() as db:
                items=[self.serialize(r) for r in db.execute('SELECT * FROM items WHERE published=1 ORDER BY position,updated,id')]
                revision=db.execute('SELECT value FROM revisions WHERE id=1').fetchone()[0]
            return self.json(200,{'revision':revision,'collections':[{'id':k,'title':v,'items':[i for i in items if i['collection_id']==k]} for k,v in COLLECTIONS.items()]})
        if path=='/api/collections' and method=='GET':
            self.session()
            with self.db() as db:items=[self.serialize(r) for r in db.execute('SELECT * FROM items ORDER BY position,updated,id')]
            return self.json(200,{'collections':[{'id':k,'title':v,'items':[i for i in items if i['collection_id']==k]} for k,v in COLLECTIONS.items()]})
        if path=='/api/media' and method=='POST':
            self.require_write();raw=self.body(MAX_UPLOAD)
            mime=self.media_type(raw)
            if not mime:raise APIError(415,'支持 JPG、PNG、WebP、GIF、PDF、MP3、WAV、OGG、FLAC、MP4、WebM；文件内容必须匹配')
            name=Path(unquote(self.headers.get('X-File-Name','upload'))).name[:180]
            media_id=secrets.token_hex(16)
            fd=os.open(self.server.directory/'media'/media_id,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
            with os.fdopen(fd,'wb') as file:file.write(raw)
            with self.db() as db:db.execute('INSERT INTO media VALUES(?,?,?,?,?)',(media_id,name,mime,len(raw),time.time()))
            return self.json(201,{'id':media_id,'name':name,'mime':mime,'size':len(raw),'url':'api/media/'+media_id})
        if path.startswith('/api/media/') and method in ('GET','HEAD','DELETE'):
            media_id=path.split('/')[-1]
            with self.db() as db:
                row=db.execute('SELECT * FROM media WHERE id=?',(media_id,)).fetchone()
                public=db.execute('SELECT 1 FROM items WHERE media_id=? AND published=1',(media_id,)).fetchone()
            if not row:raise APIError(404,'文件不存在')
            if method=='DELETE':
                self.require_write()
                with self.db() as db:
                    if db.execute('SELECT 1 FROM items WHERE media_id=?',(media_id,)).fetchone():raise APIError(409,'请先解除内容关联再删除文件')
                    db.execute('DELETE FROM media WHERE id=?',(media_id,))
                (self.server.directory/'media'/media_id).unlink(missing_ok=True)
                return self.json(200,{'ok':True})
            if not public and not self.session(required=False):raise APIError(404,'文件不存在')
            return self.send_file(self.server.directory/'media'/media_id,row['mime'],private=True)
        if path=='/api/items' and method=='POST':
            self.require_write();item=self.validate(self.read_json());item_id=secrets.token_hex(12)
            with self.db() as db:
                self.check_media(db,item)
                db.execute('INSERT INTO items VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',(item_id,*item,time.time()))
                db.execute('UPDATE revisions SET value=value+1 WHERE id=1')
            return self.json(201,{'id':item_id})
        if path.startswith('/api/items/') and method in ('PUT','DELETE'):
            self.require_write();item_id=path.split('/')[-1]
            with self.db() as db:
                if not db.execute('SELECT 1 FROM items WHERE id=?',(item_id,)).fetchone():raise APIError(404,'内容不存在')
                if method=='DELETE':db.execute('DELETE FROM items WHERE id=?',(item_id,))
                else:
                    item=self.validate(self.read_json());self.check_media(db,item)
                    db.execute('UPDATE items SET collection_id=?,kind=?,title=?,description=?,body=?,url=?,media_id=?,published=?,position=?,metadata=?,updated=? WHERE id=?',(*item,time.time(),item_id))
                db.execute('UPDATE revisions SET value=value+1 WHERE id=1')
            return self.json(200,{'ok':True})
        if path=='/api/reorder' and method=='POST':
            self.require_write();data=self.read_json();collection=data.get('collection_id');ids=data.get('ids')
            if collection not in COLLECTIONS or not isinstance(ids,list) or not all(isinstance(i,str) for i in ids):raise APIError(400,'排序数据无效')
            with self.db() as db:
                current={r[0] for r in db.execute('SELECT id FROM items WHERE collection_id=?',(collection,))}
                if set(ids)!=current or len(ids)!=len(current):raise APIError(409,'列表已变化，请刷新后重试')
                db.executemany('UPDATE items SET position=? WHERE id=?',enumerate(ids))
                db.execute('UPDATE revisions SET value=value+1 WHERE id=1')
            return self.json(200,{'ok':True})
        if path.startswith('/api/'):raise APIError(404,'接口不存在')
        if method not in ('GET','HEAD'):raise APIError(405,'静态内容只读')
        target=(ROOT/'room-preview'/path.lstrip('/')).resolve()
        if not target.is_relative_to((ROOT/'room-preview').resolve()):raise APIError(404,'页面不存在')
        if target.is_dir():target=target/'index.html'
        if not target.is_file():raise APIError(404,'页面不存在')
        return self.send_file(target,mimetypes.guess_type(target)[0] or 'application/octet-stream')
    def require_write(self):
        self.session(write=True)
        with self.db() as db:
            if db.execute('SELECT must_change FROM owner').fetchone()[0]:raise APIError(403,'请先更换初始密码')
    def validate(self,data):
        collection=data.get('collection_id');kind=data.get('kind','text')
        if collection not in COLLECTIONS or kind not in ['text','link','image','pdf','audio','video']:raise APIError(400,'内容类型或物件无效')
        fields=[]
        for key,limit in [('title',300),('description',3000),('body',150000),('url',2048)]:
            value=data.get(key,'')
            if not isinstance(value,str) or len(value)>limit:raise APIError(400,'内容字段超过限制')
            fields.append(value)
        if not fields[0].strip():raise APIError(400,'请填写标题')
        if fields[3] and urlsplit(fields[3]).scheme not in ['http','https']:raise APIError(400,'关联链接只允许 http / https')
        media_id=data.get('media_id') or None
        if media_id and not isinstance(media_id,str):raise APIError(400,'文件标识无效')
        if not isinstance(data.get('published',False),bool):raise APIError(400,'公开状态无效')
        position=data.get('position',0)
        if not isinstance(position,int) or not -100000<=position<=100000:raise APIError(400,'排序无效')
        metadata=data.get('metadata',{})
        if not isinstance(metadata,dict) or len(json.dumps(metadata))>12000:raise APIError(400,'扩展字段无效')
        if collection=='map':
            for key in ('x','y'):
                value=metadata.get(key)
                if not isinstance(value,(float,int)) or not 0<=value<=1:raise APIError(400,'地图 x、y 必须为 0–1 坐标')
        return (collection,kind,*fields,media_id,int(data.get('published',False)),position,json.dumps(metadata,ensure_ascii=False))
    def check_media(self,db,item):
        if item[6] and not db.execute('SELECT 1 FROM media WHERE id=?',(item[6],)).fetchone():raise APIError(400,'关联文件不存在')
    def serialize(self,row):
        item=dict(row);item['metadata']=json.loads(item['metadata']);item['published']=bool(item['published']);item['media_url']='api/media/'+item['media_id'] if item['media_id'] else ''
        return item
    def send_file(self,path,mime,private=False):
        size=path.stat().st_size;start=0;end=size-1;status=200
        value=self.headers.get('Range')
        if value:
            try:
                if not value.startswith('bytes=') or ',' in value:raise ValueError()
                left,right=value[6:].split('-',1)
                if left:start=int(left);end=min(size-1,int(right)) if right else size-1
                else:start=max(0,size-int(right))
                if start<0 or start>end or start>=size:raise ValueError()
                status=206
            except ValueError:raise APIError(416,'范围无效')
        self.send_response(status);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(end-start+1));self.send_header('Accept-Ranges','bytes');self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store' if private else 'no-cache');self.send_header('X-Frame-Options','SAMEORIGIN');self.send_header('Referrer-Policy','same-origin')
        if mime=='application/pdf':self.send_header('Content-Disposition','inline')
        if status==206:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
        self.end_headers()
        if self.command=='HEAD':return
        with path.open('rb') as file:
            file.seek(start);remaining=end-start+1
            while remaining:
                chunk=file.read(min(65536,remaining))
                if not chunk:break
                self.wfile.write(chunk);remaining-=len(chunk)
    @staticmethod
    def media_type(raw):
        if raw.startswith(b'\xff\xd8\xff'):return 'image/jpeg'
        if raw.startswith(b'\x89PNG\r\n\x1a\n'):return 'image/png'
        if raw[:6] in (b'GIF87a',b'GIF89a'):return 'image/gif'
        if raw.startswith(b'RIFF') and raw[8:12]==b'WEBP':return 'image/webp'
        if raw.startswith(b'%PDF-'):return 'application/pdf'
        if raw.startswith(b'RIFF') and raw[8:12]==b'WAVE':return 'audio/wav'
        if raw.startswith(b'ID3') or (len(raw)>2 and raw[0]==255 and raw[1]&224==224):return 'audio/mpeg'
        if raw.startswith(b'OggS'):return 'audio/ogg'
        if raw.startswith(b'fLaC'):return 'audio/flac'
        if raw[4:8]==b'ftyp':return 'video/mp4'
        if raw.startswith(b'\x1aE\xdf\xa3'):return 'video/webm'
        return None

def make_server(directory,port=8932,origin='',secure=False):
    directory=Path(directory).resolve();initialize(directory)
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    server.directory=directory;server.origin=origin;server.secure=secure;server.attempts={};server.rate_lock=threading.Lock()
    return server

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8932);parser.add_argument('--data-dir',default=str(ROOT/'.room-data'));parser.add_argument('--origin',default=os.environ.get('ROOM_PUBLIC_ORIGIN',''));parser.add_argument('--secure-cookie',action='store_true');args=parser.parse_args()
    server=make_server(args.data_dir,args.port,args.origin,args.secure_cookie)
    print(f'Room: http://127.0.0.1:{args.port}/ | Owner: /admin/',flush=True)
    print('Initial password file (owner only): '+str(server.directory/'owner-bootstrap.txt'),flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
