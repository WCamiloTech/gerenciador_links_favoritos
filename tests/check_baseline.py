from pathlib import Path
import hashlib
import re

root = Path(__file__).resolve().parents[1]
original_path = root / 'backups/gerenciador_favoritos_v1_6_1_original.html'
html_path = root / 'index.html'
css_path = root / 'css/styles.css'

# Baseline historica imutavel: antes da modularizacao o aplicativo era monolitico.
assert hashlib.sha256(original_path.read_bytes()).hexdigest() == 'df3d52553d771a950288603bd09ebf85037028d2cbae21eca553fd3f23fb10e2', 'Snapshot historico alterado'
original = original_path.read_text(encoding='utf-8-sig')
html = html_path.read_text(encoding='utf-8-sig')
assert css_path.is_file() and css_path.stat().st_size > 0
assert '<link rel="stylesheet" href="css/styles.css">' in html

# A interface preserva todos os IDs originais, sem inclusoes/duplicacoes.
original_ids = re.findall(r'id="([^"]+)"', original)
current_ids = re.findall(r'id="([^"]+)"', html)
assert len(original_ids) == len(set(original_ids)), 'IDs repetidos no original'
assert len(current_ids) == len(set(current_ids)), 'IDs repetidos na interface atual'
assert set(current_ids) == set(original_ids), 'IDs da interface alterados'

# Em arquitetura modular, os scripts devem existir e ser carregados na ordem declarada.
scripts = re.findall(r'<script\s+src="(js/[^"]+)"\s*></script>', html)
assert scripts and len(scripts) == len(set(scripts)), 'Scripts ausentes ou repetidos'
for script in scripts:
    assert (root / script).is_file(), 'Script ausente: ' + script
assert 'js/app-legacy.js' in scripts
assert 'js/desfazer.js' in scripts
assert scripts.index('js/app-legacy.js') < scripts.index('js/desfazer.js')
print('OK: baseline historica intacta; IDs preservados; CSS e scripts modulares presentes')
