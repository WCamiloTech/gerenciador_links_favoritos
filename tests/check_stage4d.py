from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parents[1]
h=(root/'index.html').read_text(encoding='utf-8')
order=['js/core.js','js/export-utils.js','js/app-legacy.js','js/favoritos.js','js/categorias.js','js/tags.js','js/renderizacao.js','js/backup.js','js/importacao-planilhas.js']
assert all(h.count('src="'+p+'"')==1 for p in order)
assert [h.index('src="'+p+'"') for p in order]==sorted(h.index('src="'+p+'"') for p in order)
for p in order:
 r=subprocess.run(['node','--check',str(root/p)],capture_output=True,text=True)
 assert r.returncode==0,(p,r.stderr)
r=(root/'js/renderizacao.js').read_text(encoding='utf-8');a=(root/'js/app-legacy.js').read_text(encoding='utf-8')
for name in ['localDate','el','action','controls','star','badges','selectionBox','cardFor','rowFor','render','renderStats']:
 pat=r'function\s+'+name+r'\s*\('
 assert re.search(pat,r),name
 assert not re.search(pat,a),name
assert "$('search').value" in r and "$('filterCategory').value" in r
assert "$('viewCards').addEventListener" in r and "$('clearFilters').addEventListener" in r
assert 'renderCategories();resetForm();render();' in (root/'js/tags.js').read_text(encoding='utf-8')
print('OK: Etapa 4D - modulos, sintaxe, filtros, interface e estatisticas')
