from pathlib import Path
root=Path(__file__).resolve().parents[1]
f=(root/'js/favoritos.js').read_text(encoding='utf-8')
u=(root/'js/desfazer.js').read_text(encoding='utf-8')
assert "const changed=JSON.stringify(next)!==JSON.stringify(favorites)" in f
assert "editingId&&changed?commitWithUndo(next,'Editar favorito'):saveFavorites(next)" in f
assert "if(saved){resetForm();render();showPage('sites')}" in f
assert 'if(checkDuplicate())' in f
assert 'if(!name||!description)' in f
assert 'function restoreUndo()' in u
assert "$('undoBtn').disabled=false" in u
assert "const UNDO_KEY='gerenciador_favoritos_undo_v1_4'" in u
print('OK: Etapa 5C.1 - edicao individual integrada ao Desfazer')
