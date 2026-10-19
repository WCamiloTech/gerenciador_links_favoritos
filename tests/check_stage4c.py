from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
order=['js/core.js','js/export-utils.js','js/app-legacy.js','js/favoritos.js','js/categorias.js','js/tags.js','js/backup.js','js/importacao-planilhas.js']
assert all(html.count('src="'+s+'"')==1 for s in order)
assert [html.index('src="'+s+'"') for s in order]==sorted(html.index('src="'+s+'"') for s in order)
for s in order:
 r=subprocess.run(['node','--check',str(root/s)],capture_output=True,text=True)
 assert r.returncode==0,(s,r.stderr)
fav=(root/'js/favoritos.js').read_text(encoding='utf-8');old=(root/'js/app-legacy.js').read_text(encoding='utf-8')
for name in ['resetForm','duplicateFor','checkDuplicate','editFavorite','deleteFavorite','togglePriority']:
 pat=r'function\s+'+name+r'\s*\('
 assert re.search(pat,fav),name
 assert not re.search(pat,old),name
assert "$('siteForm').addEventListener('submit'" in fav
assert "$('cancelBtn').addEventListener('click'" in fav
assert "$('url').addEventListener('input'" in fav
assert 'if(checkDuplicate())' in fav and 'saveFavorites(next)' in fav
assert "favorites.filter(x=>x.id!==id)" in fav
print('OK: Etapa 4C - estrutura, sintaxe, handlers, duplicidade e extracao')
