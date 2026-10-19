import re
import subprocess
from pathlib import Path

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
order=['js/core.js','js/export-utils.js','js/app-legacy.js','js/categorias.js','js/tags.js','js/backup.js','js/importacao-planilhas.js']
assert all(html.count('src="'+s+'"')==1 for s in order)
assert [html.index('src="'+s+'"') for s in order]==sorted(html.index('src="'+s+'"') for s in order)
for s in order:
 p=root/s
 assert p.is_file(),s
 r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 assert r.returncode==0,(s,r.stderr)
cat=(root/'js/categorias.js').read_text(encoding='utf-8')
legacy=(root/'js/app-legacy.js').read_text(encoding='utf-8')
for f in ['renderCategories','addCategory','renameCategory','removeCategory']:
 pattern=r'function\s+'+f+r'\s*\('
 assert re.search(pattern,cat),f
 assert not re.search(pattern,legacy),f
assert 'f.category===name?' in cat and "category:''" in cat
assert 'saveFavorites(next)' in cat and 'saveSettings(' in cat
assert "$('addCategory').addEventListener('click',addCategory)" in cat
print('OK: Etapa 4B - sintaxe, ordem e extracao de categorias')
