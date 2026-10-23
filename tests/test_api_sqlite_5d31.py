import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from threading import Thread
from http.server import ThreadingHTTPServer

ROOT=Path(__file__).resolve().parents[1]
def load(path,name):
    spec=spec_from_file_location(name,path); mod=module_from_spec(spec); spec.loader.exec_module(mod); return mod
api=load(ROOT/'servidor/app.py','api_local')
migration=load(ROOT/'servidor/migrar_json_sqlite.py','migracao_local')

class ApiTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.db=Path(self.tmp.name)/'db.sqlite'
        self.json=Path(self.tmp.name)/'input.json'
        self.json.write_text(json.dumps({
            'app':'gerenciador-favoritos','version':3,'exportedAt':'2026-10-22T00:00:00Z',
            'favorites':[{'id':'1','createdAt':'2026-10-22','name':'Teste','url':'https://example.com',
                          'description':'','notes':'','category':'Geral','tags':['a'],'priority':False}],
            'categories':['Geral'],'tags':['a'],'settings':{'view':'cards','theme':'dark'}
        }),encoding='utf-8')
        migration.import_backup(self.json,self.db)
        self.server=ThreadingHTTPServer(('127.0.0.1',0),api.make_handler(self.db))
        self.thread=Thread(target=self.server.serve_forever,daemon=True); self.thread.start()
        self.base=f'http://127.0.0.1:{self.server.server_port}'
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join(timeout=5); self.tmp.cleanup()
    def request(self,path,method='GET',data=None,headers=None):
        raw=json.dumps(data).encode() if data is not None else None
        req=Request(self.base+path,data=raw,headers=headers or {},method=method)
        try:
            with urlopen(req,timeout=5) as res: return res.status,json.load(res)
        except HTTPError as err: return err.code,json.load(err)
    def test_01_health(self):
        status,body=self.request('/api/health')
        self.assertEqual(status,200); self.assertFalse(body['ui_integrated'])
    def test_02_read(self):
        status,state=self.request('/api/state')
        self.assertEqual(status,200); self.assertEqual(len(state['favorites']),1)
        self.assertEqual(state['favorites'][0]['tags'],['a'])
        self.assertEqual(state['revision'],0)
    def test_03_write_and_conflict(self):
        _,state=self.request('/api/state')
        state['favorites'][0]['name']='Atualizado'
        code,result=self.request('/api/state','PUT',state,{'If-Match':'0','Content-Type':'application/json'})
        self.assertEqual(code,200); self.assertEqual(result['revision'],1)
        code,_=self.request('/api/state','PUT',state,{'If-Match':'0','Content-Type':'application/json'})
        self.assertEqual(code,409)
        _,new=self.request('/api/state')
        self.assertEqual(new['favorites'][0]['name'],'Atualizado')
        self.assertEqual(new['revision'],1)
    def test_04_invalid_data_no_changes(self):
        _,state=self.request('/api/state')
        state['favorites'][0]['category']='Inexistente'
        code,_=self.request('/api/state','PUT',state,{'If-Match':'0','Content-Type':'application/json'})
        self.assertEqual(code,400)
        _,fresh=self.request('/api/state')
        self.assertEqual(fresh['revision'],0)
    def test_05_origin_protection(self):
        _,state=self.request('/api/state')
        code,_=self.request('/api/state','PUT',state,{'If-Match':'0','Origin':'https://example.com'})
        self.assertEqual(code,403)
    def test_06_private_paths_blocked(self):
        code,_=self.request('/servidor/app.py')
        self.assertEqual(code,404)

if __name__=='__main__': unittest.main(verbosity=2)
