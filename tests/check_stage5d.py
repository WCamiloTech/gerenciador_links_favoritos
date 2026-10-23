from pathlib import Path
import re,subprocess
root=Path(__file__).resolve().parents[1]
legacy=(root/'js/app-legacy.js').read_text(encoding='utf-8')
bulk=(root/'js/operacoes-lote.js').read_text(encoding='utf-8')
html=(root/'index.html').read_text(encoding='utf-8')
base=(root/'backups/gerenciador_favoritos_v1_6_1_original.html').read_text(encoding='utf-8')
for name in ['bulkChange','applyCategory','applyTags','applyPriority','batchDelete','selectVisible','clearSelection']:
    assert name in bulk and name not in legacy, name
assert bulk.count('function bulkChange(')==1
assert 'if(commitWithUndo(next,label,preserveSelection))' in bulk
assert 'if(!preserveSelection)selectedIds.clear()' in bulk
assert 'false,true)' in bulk
assert "renderCategories();render();showPage('sites')" in bulk
scripts=['js/app-legacy.js','js/desfazer.js','js/operacoes-lote.js','js/favoritos.js']
assert [html.index('src="'+s+'"') for s in scripts]==sorted(html.index('src="'+s+'"') for s in scripts)
for p in ['js/app-legacy.js','js/operacoes-lote.js']:
    r=subprocess.run(['node','--check',str(root/p)],capture_output=True,text=True)
    assert r.returncode==0,r.stderr
print('OK: Etapa 5D - extracao e contrato das operacoes em lote')
