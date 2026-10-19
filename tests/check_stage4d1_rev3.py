from pathlib import Path
import subprocess
root=Path(__file__).resolve().parents[1]
c=(root/'js/categorias.js').read_text(encoding='utf-8')
t=(root/'js/tags.js').read_text(encoding='utf-8')
s=(root/'css/styles.css').read_text(encoding='utf-8')
h=(root/'docs/historico_implementacoes.md').read_text(encoding='utf-8')
assert "el('strong','category-name',c)" in c
assert 'manager-entry-actions' in c and 'manager-entry-actions' in t
assert '.category-name' in s and '.manager-entry-actions' in s
assert '## Etapa 4D.1-R3' in h and '| Etapa |' not in h
for f in ['js/categorias.js','js/tags.js']:
 r=subprocess.run(['node','--check',str(root/f)],capture_output=True,text=True)
 assert r.returncode==0,(f,r.stderr)
print('OK: Revisao 3 - layout e historico em registros individuais')
