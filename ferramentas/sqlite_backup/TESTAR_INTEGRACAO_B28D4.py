import json
from contextlib import closing
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from AUTOMACAO_B28D2 import executar, retencao
from BACKUP_SQLITE_B28D1 import verify
from RESTAURAR_SQLITE_B28D3 import restore

class Integracao(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base=Path(self.tmp.name)
        self.db=self.base/'ativo.sqlite3'
        self.raiz=self.base/'backups'
        self.raiz.mkdir()
        with closing(sqlite3.connect(self.db)) as c, c:
            c.execute('CREATE TABLE favoritos (id INTEGER PRIMARY KEY, nome TEXT NOT NULL)')
            c.execute("INSERT INTO favoritos(nome) VALUES ('original')")

    def ler(self):
        with closing(sqlite3.connect(self.db)) as c:
            return [x[0] for x in c.execute('SELECT nome FROM favoritos ORDER BY id')]

    def test_01_ciclo_completo(self):
        b=executar(self.db,self.raiz,30)
        verify(b)
        with closing(sqlite3.connect(self.db)) as c, c:
            c.execute("INSERT INTO favoritos(nome) VALUES ('alterado')")
        anterior=restore(b,self.db,True,True)
        self.assertEqual(self.ler(),['original'])
        with closing(sqlite3.connect(anterior)) as c:
            self.assertEqual([x[0] for x in c.execute('SELECT nome FROM favoritos ORDER BY id')],['original','alterado'])

    def test_02_retencao_nao_afeta_manuais(self):
        manuais=self.raiz/'manuais'; manuais.mkdir()
        sentinela=manuais/'nao_apagar.txt'; sentinela.write_text('preservar')
        executar(self.db,self.raiz,1)
        executar(self.db,self.raiz,1)
        self.assertEqual(len(list((self.raiz/'automaticos').glob('sqlite_backup_*.sqlite3'))),1)
        self.assertEqual(sentinela.read_text(),'preservar')

    def test_03_backup_corrompido_impede_restauracao(self):
        b=executar(self.db,self.raiz,30)
        b.write_bytes(b.read_bytes()+b'ALTERADO')
        with self.assertRaises(ValueError):
            restore(b,self.db,True,True)
        self.assertEqual(self.ler(),['original'])

    def test_04_sem_confirmacao_nao_altera_destino(self):
        b=executar(self.db,self.raiz,30)
        with self.assertRaises(ValueError):
            restore(b,self.db,False,True)
        self.assertEqual(self.ler(),['original'])

    def test_05_retencao_simulada_nao_remove(self):
        executar(self.db,self.raiz,30)
        executar(self.db,self.raiz,30)
        self.assertEqual(retencao(self.raiz/'automaticos',1,False),1)
        self.assertEqual(len(list((self.raiz/'automaticos').glob('sqlite_backup_*.sqlite3'))),2)

if __name__=='__main__':
    unittest.main(verbosity=2)
