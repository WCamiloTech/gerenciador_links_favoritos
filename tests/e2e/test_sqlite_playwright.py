"""Testes E2E SQLite em banco TEMPORARIO. Nao acessa o banco real."""
import json
import sqlite3
import tempfile
import threading
import unittest
from contextlib import closing
from http.server import ThreadingHTTPServer
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]

def load(path, name):
    spec = spec_from_file_location(name, path)
    mod = module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

api = load(ROOT / 'servidor' / 'app.py', 'api_e2e_b25a')
migration = load(ROOT / 'servidor' / 'migrar_json_sqlite.py', 'migration_e2e_b25a')

class SQLiteBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browsers = {}
        for name in ('chromium', 'firefox'):
            cls.browsers[name] = getattr(cls.pw, name).launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        for browser in cls.browsers.values():
            browser.close()
        cls.pw.stop()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='b25a_playwright_')
        root = Path(self.temp.name)
        self.db = root / 'EXCLUSIVO_TESTE.db'
        backup = root / 'origem.json'
        backup.write_text(json.dumps({
            'app':'gerenciador-favoritos','version':3,'exportedAt':'2026-10-23T00:00:00Z',
            'favorites':[
                {'id':'test-a','createdAt':'2026-10-23','name':'B25A Alpha','url':'https://example.com/a',
                 'description':'','notes':'','category':'Geral','tags':['Base'],'priority':False},
                {'id':'test-b','createdAt':'2026-10-23','name':'B25A Beta','url':'https://example.com/b',
                 'description':'','notes':'','category':'Geral','tags':['Base'],'priority':False},
                {'id':'test-c','createdAt':'2026-10-23','name':'B25A Preservar','url':'https://example.com/c',
                 'description':'','notes':'','category':'Geral','tags':['Base'],'priority':False}],
            'categories':['Geral','Teste Lote'], 'tags':['Base','Lote'],
            'settings':{'view':'cards','theme':'light'}
        },ensure_ascii=False),encoding='utf-8')
        migration.import_backup(backup,self.db)
        self.server = ThreadingHTTPServer(('127.0.0.1',0),api.make_handler(self.db,True))
        self.thread = threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.url = f'http://127.0.0.1:{self.server.server_port}'
        self.contexts=[]

    def tearDown(self):
        for context in self.contexts: context.close()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp.cleanup()

    def page(self, browser='chromium'):
        ctx=self.browsers[browser].new_context()
        self.contexts.append(ctx)
        page=ctx.new_page()
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.on('dialog',lambda dialog: dialog.accept())
        page.goto(self.url+'/index.html',wait_until='domcontentloaded')
        try:
            # Variaveis globais declaradas com let/const nao sao propriedades de window.
            # A aplicacao usa a variavel lexical `favorites` nos demais testes.
            page.wait_for_function(
                "typeof window.sqliteBulkBridge !== 'undefined' && "
                "typeof favorites !== 'undefined' && Array.isArray(favorites) && "
                "favorites.length === 3",
                timeout=5000
            )
        except Exception as exc:
            status=page.evaluate("""() => ({
                bulkBridge: typeof window.sqliteBulkBridge,
                favoritesType: typeof favorites,
                favoritesIsArray: typeof favorites !== 'undefined' && Array.isArray(favorites),
                favoritesCount: typeof favorites !== 'undefined' && Array.isArray(favorites) ? favorites.length : null,
                documentState: document.readyState
            })""")
            self.fail(
                'Inicializacao SQLite nao concluida. '
                f'Estado: {status}; erros JavaScript: {errors}; '
                f'erro Playwright: {exc}'
            )
        return page

    def state(self):
        with urlopen(self.url+'/api/state',timeout=5) as r:
            return json.load(r)

    def test_01_browser_initialization_and_cross_browser(self):
        for name in ('chromium','firefox'):
            with self.subTest(browser=name):
                p=self.page(name)
                self.assertEqual(p.evaluate('favorites.length'),3)
                self.assertEqual(len(self.state()['favorites']),3)

    def test_02_bulk_priority_and_persistence(self):
        p=self.page()
        p.evaluate("selectedIds.clear(); selectedIds.add('test-a'); selectedIds.add('test-b'); render()")
        p.locator('#batchPriority').select_option('yes')
        p.locator('#applyPriority').click()
        p.wait_for_function("favorites.filter(f=>f.priority).length === 2",timeout=15000)
        data={f['id']:f for f in self.state()['favorites']}
        self.assertTrue(data['test-a']['priority'])
        self.assertTrue(data['test-b']['priority'])
        self.assertFalse(data['test-c']['priority'])
        other=self.page('firefox')
        self.assertEqual(other.evaluate('favorites.filter(f=>f.priority).length'),2)
        with closing(sqlite3.connect(self.db)) as con:
            self.assertEqual(con.execute('PRAGMA integrity_check').fetchone()[0],'ok')

    def test_03_bulk_category(self):
        p=self.page()
        p.evaluate("selectedIds.clear(); selectedIds.add('test-a'); selectedIds.add('test-b'); render()")
        p.locator('#batchCategory').select_option('Teste Lote')
        p.locator('#applyCategory').click()
        p.wait_for_function("favorites.filter(f=>f.category==='Teste Lote').length === 2")
        data={f['id']:f for f in self.state()['favorites']}
        self.assertEqual(data['test-c']['category'],'Geral')

    def test_04_bulk_delete_preserves_others(self):
        p=self.page()
        p.evaluate("selectedIds.clear(); selectedIds.add('test-a'); selectedIds.add('test-b'); render()")
        p.locator('#batchDelete').click()
        p.wait_for_function('favorites.length === 1')
        self.assertEqual([f['id'] for f in self.state()['favorites']],['test-c'])

    def test_05_conflict_409_prevents_overwrite(self):
        a=self.page('chromium')
        b=self.page('firefox')
        # Grava a partir do navegador A; B fica com revisao desatualizada.
        a.evaluate("selectedIds.clear(); selectedIds.add('test-a'); render()")
        a.locator('#batchPriority').select_option('yes')
        a.locator('#applyPriority').click()
        a.wait_for_function("favorites.find(f=>f.id==='test-a').priority===true")
        b.evaluate("selectedIds.clear(); selectedIds.add('test-b'); render()")
        b.locator('#batchPriority').select_option('yes')
        b.locator('#applyPriority').click()
        b.wait_for_timeout(700)
        state=self.state()
        data={f['id']:f for f in state['favorites']}
        self.assertTrue(data['test-a']['priority'])
        self.assertFalse(data['test-b']['priority'])
        self.assertEqual(state['revision'],1)

if __name__=='__main__':
    unittest.main(verbosity=2)
