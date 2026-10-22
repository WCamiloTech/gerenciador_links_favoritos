from pathlib import Path
root=Path(__file__).resolve().parents[1]
legacy=(root/'js/app-legacy.js').read_text(encoding='utf-8')
undo=(root/'js/desfazer.js').read_text(encoding='utf-8')
html=(root/'index.html').read_text(encoding='utf-8')
backup=(root/'js/backup.js').read_text(encoding='utf-8')
imports=(root/'js/importacao-planilhas.js').read_text(encoding='utf-8')
assert 'function commitWithUndo(next,label,preserveSelection=false)' in undo
assert 'function restoreUndo()' in undo
assert "const UNDO_KEY='gerenciador_favoritos_undo_v1_4'" in undo
assert 'let undoState=null;' in undo
assert "$('undoBtn').addEventListener('click',restoreUndo)" in undo
assert 'function commitWithUndo(' not in legacy
assert 'function restoreUndo(' not in legacy
assert 'undoState=null' not in legacy
assert 'commitWithUndo(next,label,preserveSelection)' in legacy
assert 'commitWithUndo(next,' in imports
assert 'localStorage.setItem(UNDO_KEY,previous)' in backup
assert 'undoState=previous' in backup
scripts=['js/core.js','js/export-utils.js','js/app-legacy.js','js/desfazer.js','js/favoritos.js','js/categorias.js','js/tags.js','js/renderizacao.js','js/backup.js','js/importacao-planilhas.js']
positions=[html.index('src="'+s+'"') for s in scripts]
assert positions==sorted(positions), 'Ordem dos scripts incorreta'
assert undo.count('function commitWithUndo(')==1
assert undo.count('function restoreUndo(')==1
print('OK: Etapa 5C - extracao do Desfazer e compatibilidade de consumidores')
