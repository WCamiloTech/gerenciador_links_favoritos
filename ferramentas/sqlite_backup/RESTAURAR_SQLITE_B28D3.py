#!/usr/bin/env python3
"""Restauração offline de backup SQLite validado; exige confirmação explícita."""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest().upper()


def integrity(path):
    uri = Path(path).resolve().as_uri() + '?mode=ro'
    c = sqlite3.connect(uri, uri=True, timeout=2)
    try:
        result = c.execute('PRAGMA integrity_check').fetchall()
        if result != [('ok',)]:
            raise ValueError('Falha no PRAGMA integrity_check: ' + repr(result[:3]))
    finally:
        c.close()


def validate(backup):
    backup = Path(backup).resolve(strict=True)
    manifest = Path(str(backup) + '.json')
    info = json.loads(manifest.read_text(encoding='utf-8'))
    if info.get('arquivo') != backup.name:
        raise ValueError('Nome do backup diverge do manifesto')
    if info.get('tamanho_bytes') != backup.stat().st_size:
        raise ValueError('Tamanho do backup diverge do manifesto')
    if info.get('sha256', '').upper() != digest(backup):
        raise ValueError('SHA-256 do backup diverge do manifesto')
    integrity(backup)
    return backup


def restore(backup, target, confirm=False, offline=False):
    backup = validate(backup)
    target = Path(target).resolve(strict=True)
    if not target.is_file() or not target.stat().st_size:
        raise ValueError('Destino precisa ser banco existente e não vazio')
    if backup == target:
        raise ValueError('Origem e destino são o mesmo arquivo')
    if not confirm or not offline:
        raise ValueError('Exige --confirmar e --servidor-parado')
    if any(Path(str(target) + suffix).exists() for suffix in ('-wal', '-shm', '-journal')):
        raise ValueError('Arquivos WAL/SHM/journal encontrados; restauração cancelada')
    # Não é possível garantir servidor parado por flag; bloqueia se houver transação de escrita ativa.
    integrity(target)
    con = sqlite3.connect(target.as_uri() + '?mode=rw', uri=True, timeout=0)
    try:
        con.execute('BEGIN IMMEDIATE')
        con.rollback()
    except sqlite3.OperationalError as e:
        raise ValueError('Banco de destino ocupado; pare o servidor antes de restaurar') from e
    finally:
        con.close()
    # WAL ativo exige encerramento de TODAS as conexões externas. Recusar sidecars existentes.
    if any(Path(str(target) + suffix).exists() for suffix in ('-wal', '-shm', '-journal')):
        raise ValueError('Arquivos WAL/SHM/journal encontrados. Pare o servidor e faça checkpoint seguro antes de restaurar')
    stamp = datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S_%f')
    safety = target.with_name(target.name + '.pre_restauracao_' + stamp + '.sqlite3')
    temp = target.with_name('.' + target.name + '.restauracao_' + stamp + '.tmp')
    # Usa API SQLite para cópia de segurança pré-restauração, não cópia bruta.
    original = sqlite3.connect(target.as_uri() + '?mode=ro', uri=True)
    before = sqlite3.connect(str(safety))
    try:
        original.backup(before)
    finally:
        before.close()
        original.close()
    integrity(safety)
    try:
        with backup.open('rb') as src, temp.open('xb') as dst:
            for chunk in iter(lambda: src.read(1024 * 1024), b''):
                dst.write(chunk)
            dst.flush()
            os.fsync(dst.fileno())
        if digest(temp) != digest(backup):
            raise ValueError('Cópia temporária não corresponde ao backup')
        integrity(temp)
        if any(Path(str(target) + suffix).exists() for suffix in ('-wal', '-shm', '-journal')):
            raise ValueError('Banco mudou durante preparação; restauração cancelada')
        os.replace(temp, target)
    finally:
        temp.unlink(missing_ok=True)
    print('RESTAURACAO_OK:', target)
    print('COPIA_PRE_RESTAURACAO:', safety)
    print('SHA256_RESTAURADO:', digest(target))
    return safety


def main():
    p = argparse.ArgumentParser(description='Restauração offline de SQLite com backup prévio')
    p.add_argument('--backup', required=True)
    p.add_argument('--destino', required=True)
    p.add_argument('--confirmar', action='store_true')
    p.add_argument('--servidor-parado', action='store_true', help='Declaração do operador; NÃO verifica processos')
    args = p.parse_args()
    try:
        restore(args.backup, args.destino, args.confirmar, args.servidor_parado)
        return 0
    except Exception as e:
        print('ERRO:', e, file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
