#!/usr/bin/env python3
"""B2.8-D.1: backup consistente SQLite; nunca restaura nem altera origem."""
import argparse, datetime, hashlib, json, os, pathlib, sqlite3, sys, tempfile

def sha256(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        for block in iter(lambda:f.read(1024*1024),b''): h.update(block)
    return h.hexdigest().upper()

def check(conn):
    result=conn.execute('PRAGMA integrity_check').fetchall()
    if result != [('ok',)]: raise RuntimeError('integrity_check falhou: '+repr(result[:5]))

def backup(source, destination):
    src=pathlib.Path(source).expanduser().resolve(strict=True)
    dst_dir=pathlib.Path(destination).expanduser().resolve(strict=True)
    if not src.is_file(): raise ValueError('Origem nao e arquivo')
    if not dst_dir.is_dir(): raise ValueError('Destino nao e pasta')
    if dst_dir == src.parent: raise ValueError('Destino deve ser diferente da pasta do banco')
    if src.stat().st_size == 0: raise ValueError('Banco de origem vazio')
    timestamp=datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S_%f')
    name='sqlite_backup_'+timestamp+'_'+os.urandom(3).hex()+'.sqlite3'
    final=dst_dir/name
    tmp=dst_dir/('.'+name+'.incompleto')
    manifest=dst_dir/(name+'.json')
    conn=None; dest=None
    try:
        # mode=ro impede criar ou alterar o arquivo original.
        uri=src.as_uri()+'?mode=ro'
        conn=sqlite3.connect(uri, uri=True, timeout=10)
        conn.execute('PRAGMA busy_timeout=10000')
        dest=sqlite3.connect(str(tmp),timeout=10)
        conn.backup(dest, pages=128, sleep=0.1)
        dest.close(); dest=None
        conn.close(); conn=None
        verify=sqlite3.connect('file:'+str(tmp)+'?mode=ro',uri=True)
        try: check(verify)
        finally: verify.close()
        digest=sha256(tmp)
        os.replace(tmp,final)
        data={'tipo':'B2.8-D.1','criado_em':datetime.datetime.now().astimezone().isoformat(),
              'origem_nome':src.name,'arquivo':final.name,'tamanho_bytes':final.stat().st_size,
              'sha256':digest,'integrity_check':'ok','metodo':'sqlite3.Connection.backup'}
        temp_manifest=manifest.with_suffix('.json.tmp')
        temp_manifest.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        os.replace(temp_manifest,manifest)
        print('BACKUP_OK:',final)
        print('MANIFESTO:',manifest)
        print('SHA-256:',digest)
        return final
    except Exception:
        if dest: dest.close()
        if conn: conn.close()
        tmp.unlink(missing_ok=True)
        # Em caso de falha no manifesto, remover backup nao documentado.
        if not manifest.exists(): final.unlink(missing_ok=True)
        raise

def verify(path):
    p=pathlib.Path(path).expanduser().resolve(strict=True)
    m=pathlib.Path(str(p)+'.json')
    if not m.is_file(): raise ValueError('Manifesto nao encontrado')
    data=json.loads(m.read_text(encoding='utf-8'))
    if data.get('arquivo')!=p.name: raise ValueError('Nome no manifesto divergente')
    if data.get('tamanho_bytes')!=p.stat().st_size: raise ValueError('Tamanho divergente')
    digest=sha256(p)
    if digest!=data.get('sha256'): raise ValueError('SHA-256 divergente')
    con=sqlite3.connect(p.as_uri()+'?mode=ro',uri=True)
    try: check(con)
    finally: con.close()
    print('VERIFICACAO_OK:',p,'SHA-256:',digest)

def main():
    ap=argparse.ArgumentParser(description='Backup SQLite consistente, sem modificar origem')
    sub=ap.add_subparsers(dest='acao',required=True)
    b=sub.add_parser('backup'); b.add_argument('--origem',required=True); b.add_argument('--destino',required=True)
    v=sub.add_parser('verificar'); v.add_argument('--arquivo',required=True)
    a=ap.parse_args()
    try:
        if a.acao=='backup': backup(a.origem,a.destino)
        else: verify(a.arquivo)
    except Exception as e:
        print('ERRO:',e,file=sys.stderr); return 1
    return 0
if __name__=='__main__': sys.exit(main())
