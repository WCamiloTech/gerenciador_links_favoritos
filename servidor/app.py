"""API SQLite local. Etapa 5D.3.1: não altera a interface existente."""
import argparse
import json
import sqlite3
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit, unquote
from threading import Lock
from datetime import datetime, timezone
import mimetypes
from contextlib import closing

ROOT = Path(__file__).resolve().parents[1]
MAX_BODY = 8 * 1024 * 1024
LOCK = Lock()
STATIC = {'/': 'index.html', '/index.html': 'index.html'}

def connection(db):
    c = sqlite3.connect(db, timeout=15)
    c.execute('PRAGMA foreign_keys=ON')
    c.execute('PRAGMA busy_timeout=15000')
    return c

def get_state(c):
    favorites=[]
    for row in c.execute('SELECT id,created_at,name,url,description,notes,category,priority FROM favorites ORDER BY rowid'):
        id_, created, name, url, description, notes, category, priority = row
        tags=[x[0] for x in c.execute('SELECT tag FROM favorite_tags WHERE favorite_id=? ORDER BY rowid',(id_,))]
        favorites.append(dict(id=id_,createdAt=created,name=name,url=url,description=description,notes=notes,category=category,tags=tags,priority=bool(priority)))
    return dict(
        favorites=favorites,
        categories=[r[0] for r in c.execute('SELECT name FROM categories ORDER BY rowid')],
        tags=[r[0] for r in c.execute('SELECT name FROM tags ORDER BY rowid')],
        settings=dict(c.execute('SELECT key,value FROM settings')),
        revision=int(c.execute("SELECT value FROM metadata WHERE key='revision'").fetchone()[0]) if c.execute("SELECT 1 FROM metadata WHERE key='revision'").fetchone() else 0
    )

def validate(state):
    if not isinstance(state,dict): raise ValueError('Estado deve ser objeto JSON')
    favs=state.get('favorites'); cats=state.get('categories'); tags=state.get('tags'); settings=state.get('settings')
    if not isinstance(favs,list) or not isinstance(cats,list) or not isinstance(tags,list) or not isinstance(settings,dict):
        raise ValueError('Estrutura inválida')
    if len(favs)>100000 or len(cats)>10000 or len(tags)>10000: raise ValueError('Limite excedido')
    def strings(xs):
        return all(isinstance(x,str) and 0<len(x)<=500 for x in xs) and len(xs)==len(set(xs))
    if not strings(cats) or not strings(tags): raise ValueError('Categorias/etiquetas inválidas ou repetidas')
    if not all(isinstance(k,str) and isinstance(v,str) and len(k)<=100 and len(v)<=1000 for k,v in settings.items()):
        raise ValueError('Configurações inválidas')
    ids=set(); urls=set()
    for f in favs:
        if not isinstance(f,dict): raise ValueError('Favorito inválido')
        for key in ('id','createdAt','name','url','description','notes','category'):
            if not isinstance(f.get(key),str): raise ValueError(f'Campo inválido: {key}')
        if not f['id'] or not f['name'].strip() or not f['url'].strip(): raise ValueError('ID, nome e URL obrigatórios')
        if len(f['id'])>100 or any(len(f[k])>10000 for k in ('createdAt','name','url','description','notes','category')):
            raise ValueError('Campo longo demais')
        parsed=urlsplit(f['url'])
        if parsed.scheme not in ('https','http') or not parsed.netloc: raise ValueError('URL inválida')
        if f['id'] in ids or f['url'] in urls: raise ValueError('ID/URL repetido')
        ids.add(f['id']); urls.add(f['url'])
        if f['category'] and f['category'] not in cats: raise ValueError('Categoria inexistente')
        if type(f.get('priority')) is not bool: raise ValueError('Prioridade inválida')
        ft=f.get('tags')
        if not isinstance(ft,list) or any(not isinstance(t,str) or t not in tags for t in ft) or len(ft)!=len(set(ft)):
            raise ValueError('Etiquetas inválidas')

def save_state(c,state,expected_revision):
    validate(state)
    c.execute('BEGIN IMMEDIATE')
    try:
        row=c.execute("SELECT value FROM metadata WHERE key='revision'").fetchone()
        revision=int(row[0]) if row else 0
        if revision!=expected_revision:
            c.rollback()
            return None
        # Auditoria transacional de alteracoes efetivas, sem URLs nem descricoes.
        previous_state = get_state(c)
        before = {f['id']: f for f in previous_state['favorites']}
        after = {f['id']: f for f in state['favorites']}
        changes = ([("cadastro", fid) for fid in after.keys() - before.keys()] +
                   [("exclusao", fid) for fid in before.keys() - after.keys()] +
                   [("edicao", fid) for fid in before.keys() & after.keys() if before[fid] != after[fid]])
        c.execute('CREATE TABLE IF NOT EXISTS audit_favorites (event_id INTEGER PRIMARY KEY AUTOINCREMENT, at_utc TEXT NOT NULL, operation TEXT NOT NULL, favorite_id TEXT NOT NULL, revision_before INTEGER NOT NULL, revision_after INTEGER NOT NULL)')
        now_utc = datetime.now(timezone.utc).isoformat()
        c.executemany('INSERT INTO audit_favorites(at_utc,operation,favorite_id,revision_before,revision_after) VALUES (?,?,?,?,?)',
                      [(now_utc, operation, fid, revision, revision+1) for operation, fid in changes])
        # B2.4-B: auditoria de alteracoes do catalogo na mesma transacao.
        previous_categories=set(previous_state['categories'])
        current_categories=set(state['categories'])
        category_events=([('categoria_criada',x) for x in sorted(current_categories-previous_categories)] +
                         [('categoria_excluida',x) for x in sorted(previous_categories-current_categories)])
        c.execute('CREATE TABLE IF NOT EXISTS audit_categories (event_id INTEGER PRIMARY KEY AUTOINCREMENT, at_utc TEXT NOT NULL, operation TEXT NOT NULL, category_name TEXT NOT NULL, revision_before INTEGER NOT NULL, revision_after INTEGER NOT NULL)')
        c.executemany('INSERT INTO audit_categories(at_utc,operation,category_name,revision_before,revision_after) VALUES (?,?,?,?,?)',
                      [(now_utc,operation,name,revision,revision+1) for operation,name in category_events])
        # B2.4-C: auditoria do catalogo de etiquetas na mesma transacao.
        previous_tags=set(previous_state['tags'])
        current_tags=set(state['tags'])
        tag_events=([('etiqueta_criada',x) for x in sorted(current_tags-previous_tags)] +
                    [('etiqueta_excluida',x) for x in sorted(previous_tags-current_tags)])
        c.execute('CREATE TABLE IF NOT EXISTS audit_tags (event_id INTEGER PRIMARY KEY AUTOINCREMENT, at_utc TEXT NOT NULL, operation TEXT NOT NULL, tag_name TEXT NOT NULL, revision_before INTEGER NOT NULL, revision_after INTEGER NOT NULL)')
        c.executemany('INSERT INTO audit_tags(at_utc,operation,tag_name,revision_before,revision_after) VALUES (?,?,?,?,?)',
                      [(now_utc,operation,name,revision,revision+1) for operation,name in tag_events])
        c.execute('DELETE FROM favorite_tags')
        c.execute('DELETE FROM favorites')
        c.execute('DELETE FROM categories')
        c.execute('DELETE FROM tags')
        c.execute('DELETE FROM settings')
        c.executemany('INSERT INTO categories(name) VALUES (?)',[(x,) for x in state['categories']])
        c.executemany('INSERT INTO tags(name) VALUES (?)',[(x,) for x in state['tags']])
        for f in state['favorites']:
            c.execute('INSERT INTO favorites(id,created_at,name,url,description,notes,category,priority) VALUES (?,?,?,?,?,?,?,?)',
                (f['id'],f['createdAt'],f['name'],f['url'],f['description'],f['notes'],f['category'],int(f['priority'])))
            c.executemany('INSERT INTO favorite_tags(favorite_id,tag) VALUES (?,?)',[(f['id'],t) for t in f['tags']])
        c.executemany('INSERT INTO settings(key,value) VALUES (?,?)',list(state['settings'].items()))
        c.execute("INSERT INTO metadata(key,value) VALUES('revision',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",(str(revision+1),))
        c.execute("INSERT INTO metadata(key,value) VALUES('last_updated_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (datetime.now(timezone.utc).isoformat(),))
        c.commit()
        return revision+1
    except BaseException:
        c.rollback()
        raise

def make_handler(db, serve_ui=False):
    class Handler(BaseHTTPRequestHandler):
        def respond(self,code,payload):
            raw=json.dumps(payload,ensure_ascii=False).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type','application/json; charset=utf-8')
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Length',str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        def host_ok(self):
            host=self.headers.get('Host','')
            return host in (f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}')
        def origin_ok(self):
            origin=self.headers.get('Origin')
            return origin in (None,f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}')
        def do_GET(self):
            if not self.host_ok(): return self.respond(403,{'error':'Host não permitido'})
            path=urlsplit(self.path).path
            if path=='/api/health':
                return self.respond(200,{'status':'ok','storage':'sqlite','ui_integrated':False})
            if path=='/api/state':
                with closing(connection(db)) as c: state=get_state(c)
                return self.respond(200,state)
            if serve_ui:
                name=STATIC.get(path)
                if name is None and path.startswith(('/css/','/js/')):
                    name=unquote(path.lstrip('/'))
                if name:
                    file=(ROOT/name).resolve()
                    if file.is_file() and file.is_relative_to(ROOT) and file.suffix in ('.html','.css','.js'):
                        content=file.read_bytes()
                        self.send_response(200)
                        self.send_header('Content-Type',mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
                        self.send_header('Content-Length',str(len(content)))
                        self.send_header('Cache-Control','no-store')
                        self.end_headers()
                        return self.wfile.write(content)
            return self.respond(404,{'error':'Não encontrado'})
        def do_PUT(self):
            if not self.host_ok() or not self.origin_ok(): return self.respond(403,{'error':'Origem não permitida'})
            if urlsplit(self.path).path!='/api/state': return self.respond(404,{'error':'Não encontrado'})
            try:
                n=int(self.headers.get('Content-Length','-1'))
                if n<0 or n>MAX_BODY: return self.respond(413,{'error':'Tamanho inválido'})
                revision=int(self.headers.get('If-Match','-1').strip('"'))
                if revision<0: return self.respond(428,{'error':'If-Match obrigatório'})
                state=json.loads(self.rfile.read(n))
                with LOCK:
                    with closing(connection(db)) as c:
                        new_rev=save_state(c,state,revision)
                if new_rev is None: return self.respond(409,{'error':'Conflito: dados alterados por outra sessão. Recarregue antes de gravar.'})
                return self.respond(200,{'ok':True,'revision':new_rev})
            except (ValueError,TypeError,KeyError,sqlite3.IntegrityError) as e:
                return self.respond(400,{'error':str(e)})
        def do_POST(self): return self.respond(405,{'error':'Método não permitido'})
    return Handler

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--db',type=Path,required=True)
    p.add_argument('--port',type=int,default=8765)
    p.add_argument('--serve-ui',action='store_true',help='Serve a interface atual sem integrá-la ao banco')
    args=p.parse_args()
    if not args.db.is_file(): p.error(f'Banco não encontrado: {args.db}')
    with closing(connection(args.db)) as c:
        if c.execute('PRAGMA integrity_check').fetchone()[0]!='ok': p.error('Banco corrompido')
    server=ThreadingHTTPServer(('127.0.0.1',args.port),make_handler(args.db,args.serve_ui))
    print(f'API local: http://127.0.0.1:{server.server_port}/api/health',flush=True)
    print('Interface ainda NÃO integrada ao SQLite.',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()

if __name__=='__main__': main()
