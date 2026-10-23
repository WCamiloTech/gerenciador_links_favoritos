"""Testa auditoria transacional sem tocar no banco principal."""
import unittest, sqlite3
from test_api_sqlite_5d31 import ApiTest

class AuditCrudTest(ApiTest):
    def test_07_audit_crud(self):
        _, s = self.request('/api/state')
        s['favorites'][0]['name']='Editado'
        code, _ = self.request('/api/state','PUT',s,{'If-Match':'0'})
        self.assertEqual(code,200)
        _, s = self.request('/api/state')
        s['favorites'].append({**s['favorites'][0], 'id':'novo', 'url':'https://novo.example'})
        code, _ = self.request('/api/state','PUT',s,{'If-Match':'1'})
        self.assertEqual(code,200)
        _, s = self.request('/api/state')
        s['favorites']=[f for f in s['favorites'] if f['id']!='novo']
        code, _ = self.request('/api/state','PUT',s,{'If-Match':'2'})
        self.assertEqual(code,200)
        with sqlite3.connect(self.db) as c:
            rows=c.execute('SELECT operation, favorite_id, revision_before, revision_after FROM audit_favorites ORDER BY event_id').fetchall()
        self.assertEqual(rows,[('edicao','1',0,1),('cadastro','novo',1,2),('exclusao','novo',2,3)])

if __name__=='__main__': unittest.main()
