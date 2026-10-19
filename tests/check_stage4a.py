from pathlib import Path
import hashlib,re,subprocess
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
files=['js/core.js','js/export-utils.js','js/app-legacy.js','js/tags.js','js/backup.js','js/importacao-planilhas.js']
assert all(html.count('src="'+f+'"')==1 for f in files)
assert [html.index('src="'+f+'"') for f in files]==sorted(html.index('src="'+f+'"') for f in files)
for f in files:
    result=subprocess.run(['node','--check',str(root/f)],capture_output=True,text=True)
    assert result.returncode==0,(f,result.stderr)
legacy=(root/'js/app-legacy.js').read_text(encoding='utf-8')
tags=(root/'js/tags.js').read_text(encoding='utf-8')
for name in ['tagId','allTags','persistTags','renderTags','addTag','renameTag','removeTag']:
    assert re.search(r'function\s+'+name+r'\s*\(',tags),name
    assert not re.search(r'function\s+'+name+r'\s*\(',legacy),name
assert "gerenciador_favoritos_tags_v1_5_1" in tags
assert "f.tags.filter(t=>tagId(t)!==tagId(tag))" in tags
assert "renderCategories();resetForm();render();" in tags
assert 'renderCategories();resetForm();render();' not in legacy
assert len(re.findall(r'id="([^"]+)"',html))==len(set(re.findall(r'id="([^"]+)"',html)))
print('OK: Etapa 4A - sintaxe, ordem, separacao de tags e inicializacao')
