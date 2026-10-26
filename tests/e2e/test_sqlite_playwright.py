"""Testes E2E SQLite em banco TEMPORARIO. Nao acessa o banco real."""
import json
import io
import zipfile
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
        self.server.daemon_threads = False
        self.server.block_on_close = True
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
                "favorites.length >= 3",
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

    def test_06_undo_bulk_priority_persists(self):
        p=self.page()
        p.evaluate("selectedIds.clear(); selectedIds.add('test-a'); selectedIds.add('test-b'); render()")
        p.locator('#batchPriority').select_option('yes')
        p.locator('#applyPriority').click()
        p.wait_for_function("favorites.filter(f=>f.priority).length===2")
        self.assertTrue(p.locator('#undoBtn').is_enabled())
        p.locator('#undoBtn').click()
        p.wait_for_function("favorites.every(f=>!f.priority)")
        self.assertTrue(all(not f['priority'] for f in self.state()['favorites']))
        self.assertFalse(p.locator('#undoBtn').is_enabled())
        p.reload()
        p.wait_for_function("favorites.length===3 && favorites.every(f=>!f.priority)")
        with closing(sqlite3.connect(self.db)) as con:
            self.assertEqual(con.execute('PRAGMA integrity_check').fetchone()[0],'ok')

    def test_07_undo_bulk_delete_restores_favorites(self):
        p=self.page()
        p.evaluate("selectedIds.clear(); selectedIds.add('test-a'); selectedIds.add('test-b'); render()")
        p.locator('#batchDelete').click()
        p.wait_for_function('favorites.length===1')
        p.locator('#undoBtn').click()
        p.wait_for_function('favorites.length===3')
        self.assertEqual({f['id'] for f in self.state()['favorites']},{'test-a','test-b','test-c'})

    def test_08_undo_conflict_preserves_other_browser(self):
        a=self.page('chromium')
        b=self.page('firefox')
        a.evaluate("selectedIds.clear(); selectedIds.add('test-a'); render()")
        a.locator('#batchPriority').select_option('yes')
        a.locator('#applyPriority').click()
        a.wait_for_function("favorites.find(f=>f.id==='test-a').priority===true")
        b.reload()
        b.wait_for_function("favorites.find(f=>f.id==='test-a').priority===true")
        b.evaluate("selectedIds.clear(); selectedIds.add('test-b'); render()")
        b.locator('#batchPriority').select_option('yes')
        b.locator('#applyPriority').click()
        b.wait_for_function("favorites.find(f=>f.id==='test-b').priority===true")
        a.locator('#undoBtn').click()
        a.wait_for_function("favorites.find(f=>f.id==='test-b').priority===true")
        data={f['id']:f for f in self.state()['favorites']}
        self.assertTrue(data['test-a']['priority'])
        self.assertTrue(data['test-b']['priority'])
        self.assertFalse(a.locator('#undoBtn').is_enabled())

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

    def test_09_json_merge_sqlite_and_undo(self):
        for browser in ('chromium','firefox'):
            with self.subTest(browser=browser):
                p=self.page(browser)
                item={'id':'json-extra','createdAt':'2026-10-23','name':'JSON Extra',
                      'url':'https://example.com/new','description':'Importado','notes':'',
                      'category':'Nova categoria','tags':['Nova etiqueta'],'priority':False}
                payload={'app':'gerenciador-favoritos','version':3,'favorites':[item]}
                p.locator('#importFile').set_input_files({
                    'name':'mesclar.json','mimeType':'application/json',
                    'buffer':json.dumps(payload).encode('utf-8')})
                p.locator('#confirmBackup').click()
                p.wait_for_function("favorites.some(f=>f.id==='json-extra')")
                state=self.state()
                self.assertEqual(len(state['favorites']),4)
                self.assertIn('Nova categoria',state['categories'])
                self.assertIn('Nova etiqueta',state['tags'])
                p.locator('#undoBtn').click()
                p.wait_for_function('favorites.length===3')
                self.assertEqual(len(self.state()['favorites']),3)
                with closing(sqlite3.connect(self.db)) as con:
                    self.assertEqual(con.execute('PRAGMA integrity_check').fetchone()[0],'ok')

    def test_10_json_restore_sqlite(self):
        p=self.page('firefox')
        item={'id':'json-restore','createdAt':'2026-10-23','name':'Restaurado',
              'url':'https://example.com/restore','description':'','notes':'',
              'category':'Importada','tags':['Restaurada'],'priority':True}
        payload={'app':'gerenciador-favoritos','version':3,'favorites':[item],
                 'categories':['Importada'],'tags':['Restaurada'],
                 'settings':{'view':'cards'}}
        p.locator('#importFile').set_input_files({
            'name':'restaurar.json','mimeType':'application/json',
            'buffer':json.dumps(payload).encode('utf-8')})
        p.locator('#backupMode').select_option('restore')
        p.locator('#confirmBackup').click()
        p.wait_for_function("favorites.length===1 && favorites[0].id==='json-restore'")
        self.assertEqual(self.state()['favorites'][0]['id'],'json-restore')
        p.locator('#undoBtn').click()
        p.wait_for_function('favorites.length===3')
        self.assertEqual(len(self.state()['favorites']),3)

    def test_11_json_merge_conflict_409(self):
        a=self.page('chromium')
        b=self.page('firefox')
        item={'id':'json-conflict','createdAt':'2026-10-23','name':'Conflito',
              'url':'https://example.com/conflict','description':'','notes':'',
              'category':'Geral','tags':['Base'],'priority':False}
        payload={'app':'gerenciador-favoritos','version':3,'favorites':[item]}
        b.locator('#importFile').set_input_files({
            'name':'conflito.json','mimeType':'application/json',
            'buffer':json.dumps(payload).encode('utf-8')})
        a.evaluate("selectedIds.clear(); selectedIds.add('test-a'); render()")
        a.locator('#batchPriority').select_option('yes')
        a.locator('#applyPriority').click()
        a.wait_for_function("favorites.find(f=>f.id==='test-a').priority")
        b.locator('#confirmBackup').click()
        b.wait_for_function("favorites.find(f=>f.id==='test-a').priority")
        state=self.state()
        self.assertEqual(len(state['favorites']),3)
        self.assertFalse(any(f['id']=='json-conflict' for f in state['favorites']))
        self.assertEqual(state['revision'],1)

    def test_12_csv_merge_and_undo(self):
        csv = ('Nome;URL;Finalidade;Categoria;Etiquetas\n'
               'Novo CSV;https://example.com/csv;Importado;Categoria CSV;Etiqueta CSV\n')
        for browser in ('chromium','firefox'):
            with self.subTest(browser=browser):
                p=self.page(browser)
                p.locator('#importCsvFile').set_input_files({
                    'name':'importar.csv','mimeType':'text/csv',
                    'buffer':csv.encode('utf-8')})
                p.locator('#confirmCsv').click()
                p.wait_for_function("favorites.some(f=>f.url==='https://example.com/csv')")
                state=self.state()
                self.assertEqual(len(state['favorites']),4)
                self.assertIn('Categoria CSV',state['categories'])
                self.assertIn('Etiqueta CSV',state['tags'])
                p.locator('#undoBtn').click()
                p.wait_for_function('favorites.length===3')
                self.assertEqual(len(self.state()['favorites']),3)

    def test_13_csv_update_by_url_and_internal_duplicate(self):
        p=self.page()
        csv=('Nome;URL;Finalidade;Categoria;Etiquetas\n'
             'Alterado CSV;https://example.com/a;Atualizada;Nova CSV;Adicional\n'
             'Ignorado;https://example.com/a;Duplicado;Outra;Outra\n')
        p.locator('#importCsvFile').set_input_files({
            'name':'atualizar.csv','mimeType':'text/csv',
            'buffer':csv.encode('utf-8')})
        p.locator('#updateExisting').check()
        p.locator('#confirmCsv').click()
        p.wait_for_function("favorites.find(f=>f.id==='test-a').name==='Alterado CSV'")
        state=self.state()
        self.assertEqual(len(state['favorites']),3)
        fav=next(f for f in state['favorites'] if f['id']=='test-a')
        self.assertEqual(fav['category'],'Nova CSV')
        self.assertIn('Adicional',fav['tags'])
        p.reload()
        p.wait_for_function("favorites.find(f=>f.id==='test-a').name==='Alterado CSV'")

    def test_14_csv_conflict_409_preserves_other_browser(self):
        a=self.page('chromium')
        b=self.page('firefox')
        b.locator('#importCsvFile').set_input_files({
            'name':'conflito.csv','mimeType':'text/csv',
            'buffer':b'Nome;URL\nConflito;https://example.com/csv-conflict\n'})
        a.evaluate("selectedIds.clear(); selectedIds.add('test-a'); render()")
        a.locator('#batchPriority').select_option('yes')
        a.locator('#applyPriority').click()
        a.wait_for_function("favorites.find(f=>f.id==='test-a').priority")
        b.locator('#confirmCsv').click()
        b.wait_for_function("favorites.find(f=>f.id==='test-a').priority")
        state=self.state()
        self.assertEqual(len(state['favorites']),3)
        self.assertEqual(state['revision'],1)

    def test_15_xlsx_first_sheet_in_both_browsers(self):
        # OOXML minimo; descompactacao real ZIP deflate pelo navegador.
        xml=b"""<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Nome</t></is></c><c r="B1" t="inlineStr"><is><t>URL</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Importado XLSX</t></is></c><c r="B2" t="inlineStr"><is><t>https://example.com/xlsx</t></is></c></row></sheetData></worksheet>"""
        content=io.BytesIO()
        with zipfile.ZipFile(content,'w',compression=zipfile.ZIP_DEFLATED) as z:
            z.writestr('xl/worksheets/sheet1.xml',xml)
        for browser in ('chromium','firefox'):
            with self.subTest(browser=browser):
                p=self.page(browser)
                alerts=[]
                
                p.on('dialog',lambda dialog: (alerts.append(dialog.message),dialog.accept()))
                p.locator('#importCsvFile').set_input_files({
                    'name':'planilha.xlsx',
                    'mimeType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'buffer':content.getvalue()})
                # Aguarda o leitor assincrono concluir e a previa aparecer.
                # No segundo navegador a URL ja existe; nao devemos tentar duplicar.
                try:
                    p.wait_for_function("""() => {
                        const preview=document.querySelector('#csvPreview');
                        return preview && !preview.classList.contains('hidden');
                    }""",timeout=12000)
                except Exception as exc:
                    self.fail(f'Previa XLSX nao apareceu em {browser}; alertas={alerts}; erro={exc}')
                rows=p.locator('#previewRows').inner_text()
                self.assertIn('https://example.com/xlsx',rows,
                    f'URL ausente da previa em {browser}; previa={rows}; alertas={alerts}')
                if browser=='chromium':
                    self.assertTrue(p.locator('#confirmCsv').is_enabled(),
                        f'Confirmacao desabilitada; previa={rows}; alertas={alerts}')
                    p.locator('#confirmCsv').click()
                    try:
                        p.wait_for_function("favorites.some(f=>f.url==='https://example.com/xlsx')",timeout=12000)
                    except Exception as exc:
                        self.fail(f'XLSX nao persistiu em {browser}; alertas={alerts}; previa={rows}; estado={self.state()}; erro={exc}')
                else:
                    # Testa a leitura da mesma planilha em Firefox e identifica duplicidade.
                    self.assertIn('Já cadastrado',rows,
                        f'Firefox deveria identificar URL ja importada; previa={rows}')
                self.assertEqual(len(self.state()['favorites']),4)

if __name__=='__main__':
    unittest.main(verbosity=2)


