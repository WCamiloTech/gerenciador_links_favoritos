"""Testes reais de interface. Contexto novo e armazenamento fictício por teste."""
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

APP = (Path(__file__).resolve().parents[2] / "index.html").as_uri()

class TestesFavoritos(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.firefox.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.context = self.browser.new_context(accept_downloads=True)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda exc: self.errors.append(str(exc)))
        self.page.on("dialog", lambda d: d.accept())
        self.page.goto(APP)
        self.assertEqual(self.page.locator("#count").count(), 1)

    def tearDown(self):
        self.context.close()

    def cadastrar(self, nome="Exemplo A", url="https://example.com/a"):
        self.page.locator('[data-page="form"]').click()
        self.page.locator("#name").fill(nome)
        self.page.locator("#url").fill(url)
        self.page.locator("#description").fill("Descrição de teste automatizado")
        self.page.locator("#saveBtn").click()
        self.assertEqual(self.page.evaluate("favorites.length"), 1)

    def test_01_inicializacao_sem_erro(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.page.evaluate("favorites.length"), 0)

    def test_02_cadastro_persistencia(self):
        self.cadastrar()
        self.page.reload()
        self.assertEqual(self.page.evaluate("favorites.length"), 1)
        self.assertEqual(self.page.evaluate("favorites[0].name"), "Exemplo A")
        self.assertEqual(self.errors, [])

    def test_03_edicao_e_desfazer(self):
        self.cadastrar()
        self.page.evaluate("editFavorite(favorites[0].id)")
        self.page.locator("#name").fill("Exemplo editado")
        self.page.locator("#saveBtn").click()
        self.assertEqual(self.page.evaluate("favorites[0].name"), "Exemplo editado")
        self.assertTrue(self.page.locator("#undoBtn").is_enabled())
        self.page.locator("#undoBtn").click()
        self.assertEqual(self.page.evaluate("favorites[0].name"), "Exemplo A")
        self.assertEqual(self.errors, [])

    def test_04_duplicidade_bloqueada(self):
        self.cadastrar()
        self.page.locator('[data-page="form"]').click()
        self.page.locator("#name").fill("Duplicado")
        self.page.locator("#url").fill("https://example.com/a")
        self.page.locator("#description").fill("Duplicado")
        self.page.locator("#saveBtn").click()
        self.assertEqual(self.page.evaluate("favorites.length"), 1)

    def test_05_busca(self):
        self.cadastrar()
        self.page.locator("#search").fill("sem-correspondencia-xyz")
        self.assertEqual(self.page.evaluate("visibleIds.length"), 0)
        self.page.locator("#search").fill("Exemplo")
        self.assertEqual(self.page.evaluate("visibleIds.length"), 1)

    def test_06_lote_categoria_e_desfazer(self):
        self.cadastrar()
        self.page.locator('[data-page="categories"]').click()
        self.page.locator("#newCategory").fill("Categoria Teste")
        self.page.locator("#addCategory").click()
        self.page.locator('[data-page="sites"]').click()
        self.page.locator("#selectVisible").check()
        self.assertEqual(self.page.evaluate("selectedIds.size"), 1)
        self.page.locator("#batchCategory").select_option(index=1)
        categoria = self.page.locator("#batchCategory").input_value()
        self.page.locator("#applyCategory").click()
        self.assertEqual(self.page.evaluate("favorites[0].category"), categoria)
        self.page.locator("#undoBtn").click()
        self.assertNotEqual(self.page.evaluate("favorites[0].category"), categoria)

if __name__ == "__main__":
    unittest.main(verbosity=2)
