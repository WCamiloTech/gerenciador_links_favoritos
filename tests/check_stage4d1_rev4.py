from pathlib import Path
import re, subprocess, json
root=Path(__file__).resolve().parents[1]
c=(root/'js/categorias.js').read_text(encoding='utf-8')
t=(root/'js/tags.js').read_text(encoding='utf-8')
s=(root/'css/styles.css').read_text(encoding='utf-8')
h=(root/'docs/historico_implementacoes.md').read_text(encoding='utf-8')
a=(root/'docs/auditoria_implementacoes.jsonl').read_text(encoding='utf-8-sig')
assert "favorites.filter(f=>f.category===c).length" in c
assert "count+' site(s) associado(s)'" in c and "count+' site(s) associado(s)'" in t
assert "el('div','category-item tag-entry')" in t
assert '.tag-manager{display:grid;grid-template-columns:' in s
assert '.manager-entry-info' in s
assert '19/10/2026, 15:52:33 (-03:00)' in h
assert '## Etapa 4D.1-R4' in h
assert any(x.get('etapa')=='4D.1-R3' and x.get('situacao')=='instalada_testes_aprovados' for x in (json.loads(line) for line in a.splitlines() if line.strip()))
for f in ('js/categorias.js','js/tags.js'):
 r=subprocess.run(['node','--check',str(root/f)],capture_output=True,text=True)
 assert r.returncode==0,(f,r.stderr)
print('OK: Revisao 4 - cartoes, contadores, historico e sintaxe')
