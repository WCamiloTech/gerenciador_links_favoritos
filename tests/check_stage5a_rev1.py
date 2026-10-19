from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
tags=(root/'js/tags.js').read_text(encoding='utf-8')
render=(root/'js/renderizacao.js').read_text(encoding='utf-8')
assert html.index('src="js/tags.js"')<html.index('src="js/renderizacao.js"')
assert "window.addEventListener('load',()=>{renderCategories();resetForm();render();});" in tags
assert 'function render()' in render
assert not re.search(r'(?m)^renderCategories\(\);resetForm\(\);render\(\);',tags)
print('OK: Revisao 5A.1 - inicializacao adiada ate carregar todos os modulos')
