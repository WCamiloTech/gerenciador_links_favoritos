from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parents[1]
app=(root/'js/app-legacy.js').read_text(encoding='utf-8')
backup=(root/'js/backup.js').read_text(encoding='utf-8')
utils=(root/'js/export-utils.js').read_text(encoding='utf-8')
hist=(root/'docs/historico_implementacoes.md').read_text(encoding='utf-8')
assert "'favoritos-'+exportTimestamp()+'.csv'" in app
assert 'const stamp=exportTimestamp();' in backup
assert 'function exportTimestamp(' in utils
assert "if(n.dataset.page==='categories')renderCategories();" in app
assert 'if(isTags)renderTags();else renderCategories();' in app
assert '## Etapa 4D.1-R2' in hist
assert '| Etapa |' not in hist
for path in ['js/app-legacy.js','js/export-utils.js','js/backup.js']:
 r=subprocess.run(['node','--check',str(root/path)],capture_output=True,text=True)
 assert r.returncode==0,(path,r.stderr)
print('OK: Revisao 2 - CSV/JSON, tabela, atualizacao de categorias, sintaxe')
