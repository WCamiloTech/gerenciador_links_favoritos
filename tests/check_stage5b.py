from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
legacy=(root/'js/app-legacy.js').read_text(encoding='utf-8')
tags=(root/'js/tags.js').read_text(encoding='utf-8')
css=(root/'css/styles.css').read_text(encoding='utf-8')
assert 'id="batchExistingTags" class="batch-tag-options"' in html
assert 'batchExistingTags" multiple' not in html
assert "querySelectorAll('input[type=\"checkbox\"]:checked')" in legacy
assert "function commitWithUndo(next,label,preserveSelection=false)" in legacy
assert "if(!preserveSelection)selectedIds.clear();render();return true;" in legacy
assert "if(commitWithUndo(next,label,preserveSelection))" in legacy
assert "remove?'Remover etiquetas':'Adicionar etiquetas',false,true)" in legacy
assert 'function renderTags()' in tags and "input.type='checkbox'" in tags
assert 'chosen.has(tagId(t))' in tags
assert '.batch-tag-options{' in css
print('OK: Etapa 5B - selecao multipla de tags e preservacao de contexto')
