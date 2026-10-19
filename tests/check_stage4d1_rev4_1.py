from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
css=(root/'css/styles.css').read_text(encoding='utf-8')
assert 'Etapa 4D.1-R4.1' in css
for selector in ('.category-list,.tag-manager', '.category-list>.category-item,.tag-manager>.category-item.tag-entry'):
    assert selector in css
assert 'grid-auto-rows:max-content;' in css
assert 'align-content:start;' in css
assert 'align-items:start;' in css
assert 'height:auto;' in css
assert 'justify-content:flex-start;' in css
for name in ('js/categorias.js','js/tags.js','js/favoritos.js','js/renderizacao.js'):
    assert (root/name).exists()
print('OK: Revisao 4.1 - cartoes compactos e CSS responsivo')
