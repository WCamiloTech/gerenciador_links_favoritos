#!/usr/bin/env python3
"""B2.8-D.2: backup automatico sob demanda, com retencao conservadora.
Nao cria tarefa agendada. Nao acessa o banco real por padrao.
"""
import argparse
import contextlib
import json
import os
from pathlib import Path
import sys
from BACKUP_SQLITE_B28D1 import backup, verify

PREFIX = 'sqlite_backup_'


def _candidatos(pasta):
    """Somente pares validos, regulares e identificados pelo manifesto B2.8-D.1."""
    encontrados = []
    for m in pasta.glob(PREFIX + '*.sqlite3.json'):
        b = Path(str(m)[:-5])
        if m.is_symlink() or b.is_symlink() or not m.is_file() or not b.is_file():
            continue
        try:
            info = json.loads(m.read_text(encoding='utf-8'))
            if info.get('tipo') != 'B2.8-D.1' or info.get('arquivo') != b.name:
                continue
            verify_silencioso(b)
        except (OSError, ValueError, RuntimeError, json.JSONDecodeError):
            continue
        encontrados.append((b, m))
    return sorted(encontrados, key=lambda item: item[0].name, reverse=True)


def verify_silencioso(path):
    with open(os.devnull, 'w', encoding='utf-8') as sink:
        with contextlib.redirect_stdout(sink):
            verify(path)


def retencao(pasta, manter=30, aplicar=False):
    pasta = Path(pasta).expanduser().resolve(strict=True)
    if manter < 1:
        raise ValueError('manter precisa ser >= 1')
    pares = _candidatos(pasta)
    excedentes = pares[manter:]
    for banco, manifesto in excedentes:
        print(('REMOVER' if aplicar else 'SIMULAR_REMOVER') + ':', banco.name)
        if aplicar:
            # Validar novamente imediatamente antes de remover.
            verify_silencioso(banco)
            banco.unlink()
            manifesto.unlink()
    print('RETENCAO:', 'aplicada' if aplicar else 'simulada', '| validos:', len(pares), '| excedentes:', len(excedentes))
    return len(excedentes)


def executar(origem, raiz, manter=30):
    raiz = Path(raiz).expanduser().resolve(strict=True)
    automaticos = raiz / 'automaticos'
    manuais = raiz / 'manuais'
    automaticos.mkdir(exist_ok=True)
    manuais.mkdir(exist_ok=True)
    # Bloqueia duas instancias deste executor no mesmo destino.
    trava = automaticos / '.b28d2_execucao.lock'
    fd = None
    lock_owned = False
    try:
        fd = os.open(trava, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        lock_owned = True
        os.write(fd, str(os.getpid()).encode('ascii'))
        os.close(fd)
        fd = None
        copia = backup(origem, automaticos)
        verify(copia)
        retencao(automaticos, manter=manter, aplicar=True)
        print('AUTOMACAO_OK:', copia.name)
        return copia
    finally:
        if fd is not None:
            os.close(fd)
        # Remover apenas a trava criada por esta execucao.
        if lock_owned:
            trava.unlink(missing_ok=True)


def main():
    p = argparse.ArgumentParser(description='B2.8-D.2 — executor e retencao isolada')
    sub = p.add_subparsers(dest='acao', required=True)
    r = sub.add_parser('retencao')
    r.add_argument('--pasta', required=True)
    r.add_argument('--manter', type=int, default=30)
    r.add_argument('--aplicar', action='store_true', help='Sem esta opcao, somente simula')
    e = sub.add_parser('executar')
    e.add_argument('--origem', required=True)
    e.add_argument('--raiz', required=True)
    e.add_argument('--manter', type=int, default=30)
    a = p.parse_args()
    try:
        if a.acao == 'retencao':
            retencao(a.pasta, a.manter, a.aplicar)
        else:
            executar(a.origem, a.raiz, a.manter)
    except Exception as exc:
        print('ERRO:', exc, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
