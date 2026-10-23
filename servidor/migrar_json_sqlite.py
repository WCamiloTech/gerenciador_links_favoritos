"""Importação conservadora de backup completo v3 para SQLite, sem alterar a aplicação."""
import argparse
import hashlib
import json
import sqlite3
from contextlib import closing
from pathlib import Path

SCHEMA = '''
PRAGMA foreign_keys=ON;
CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE favorites (
 id TEXT PRIMARY KEY, created_at TEXT NOT NULL, name TEXT NOT NULL,
 url TEXT NOT NULL UNIQUE, description TEXT NOT NULL, notes TEXT NOT NULL,
 category TEXT NOT NULL, priority INTEGER NOT NULL CHECK(priority IN (0,1))
);
CREATE TABLE categories (name TEXT PRIMARY KEY);
CREATE TABLE tags (name TEXT PRIMARY KEY);
CREATE TABLE favorite_tags (
 favorite_id TEXT NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
 tag TEXT NOT NULL REFERENCES tags(name),
 PRIMARY KEY(favorite_id,tag)
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
'''

def import_backup(source: Path, target: Path):
    if not source.is_file():
        raise ValueError('Arquivo JSON não encontrado')
    if target.exists():
        raise FileExistsError(f'Banco já existe; nenhuma substituição permitida: {target}')
    raw = source.read_bytes()
    data = json.loads(raw.decode('utf-8-sig'))
    if data.get('app') != 'gerenciador-favoritos' or data.get('version') != 3:
        raise ValueError('Backup não corresponde ao formato completo v3')
    favs, cats, tags = data['favorites'], data['categories'], data['tags']
    if not isinstance(favs,list) or not isinstance(cats,list) or not isinstance(tags,list):
        raise ValueError('Listas inválidas no backup')
    ids=[f['id'] for f in favs]; urls=[f['url'] for f in favs]
    if len(ids)!=len(set(ids)) or len(urls)!=len(set(urls)):
        raise ValueError('IDs ou URLs duplicadas; migração cancelada')
    if len(cats)!=len(set(cats)) or len(tags)!=len(set(tags)):
        raise ValueError('Categorias ou etiquetas duplicadas; migração cancelada')
    if any(f['category'] and f['category'] not in cats for f in favs):
        raise ValueError('Categoria não cadastrada; migração cancelada')
    if any(t not in tags for f in favs for t in f['tags']):
        raise ValueError('Etiqueta não cadastrada; migração cancelada')
    if any(type(f['priority']) is not bool for f in favs):
        raise ValueError('Prioridade inválida; migração cancelada')
    target.parent.mkdir(parents=True,exist_ok=True)
    try:
        with closing(sqlite3.connect(target)) as con:
            con.executescript(SCHEMA)
            with con:
                con.executemany('INSERT INTO categories VALUES (?)',[(c,) for c in cats])
                con.executemany('INSERT INTO tags VALUES (?)',[(t,) for t in tags])
                for f in favs:
                    con.execute('INSERT INTO favorites VALUES (?,?,?,?,?,?,?,?)',(
                        f['id'],f['createdAt'],f['name'],f['url'],f['description'],
                        f['notes'],f['category'],int(f['priority'])))
                    con.executemany('INSERT INTO favorite_tags VALUES (?,?)',[(f['id'],t) for t in f['tags']])
                con.executemany('INSERT INTO settings VALUES (?,?)',list(data['settings'].items()))
                con.executemany('INSERT INTO metadata VALUES (?,?)',[
                    ('source_sha256',hashlib.sha256(raw).hexdigest()),
                    ('source_exported_at',data['exportedAt']),
                    ('source_format','3'),
                ])
            check=con.execute('PRAGMA integrity_check').fetchone()[0]
            counts=(con.execute('SELECT count(*) FROM favorites').fetchone()[0],
                    con.execute('SELECT count(*) FROM categories').fetchone()[0],
                    con.execute('SELECT count(*) FROM tags').fetchone()[0])
            if check!='ok' or counts!=(len(favs),len(cats),len(tags)):
                raise ValueError(f'Falha de integridade: {check}, {counts}')
        return counts, hashlib.sha256(raw).hexdigest()
    except BaseException:
        target.unlink(missing_ok=True)
        raise

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('json',type=Path)
    p.add_argument('db',type=Path)
    a=p.parse_args()
    counts, sha=import_backup(a.json,a.db)
    print('OK: Migração piloto concluída; banco ainda NÃO integrado ao aplicativo')
    print('Favoritos: %s | Categorias: %s | Etiquetas: %s' % counts)
    print('SHA-256 da origem:',sha)
    print('Banco:',a.db)
