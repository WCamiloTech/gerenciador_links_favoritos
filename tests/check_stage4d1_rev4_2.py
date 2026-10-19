from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
css=(root/'css/styles.css').read_text(encoding='utf-8')
tags=(root/'js/tags.js').read_text(encoding='utf-8')
cats=(root/'js/categorias.js').read_text(encoding='utf-8')
assert "el('div','category-item')" in cats
assert "el('div','category-item')" in tags
assert "el('div','manager-entry-info')" in tags
assert "el('div','manager-entry-info')" in cats
assert "el('div','manager-entry-actions')" in tags and "el('div','manager-entry-actions')" in cats
assert "el('div','category-item tag-entry')" not in tags
assert "el('div','manager-entry-info tag-info')" not in tags
assert '.category-list,.tag-manager{display:grid;' in css
assert 'grid-auto-rows:max-content' in css
print('OK: Revisao 4.2 - mesma estrutura de cartoes em categorias e etiquetas')
