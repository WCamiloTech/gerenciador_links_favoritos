from pathlib import Path
import re, hashlib
root=Path(__file__).resolve().parents[1]
original=(root/'backups/gerenciador_favoritos_v1_6_1_original.html').read_text(encoding='utf-8-sig')
html=(root/'index.html').read_text(encoding='utf-8-sig')
css=(root/'css/styles.css').read_text(encoding='utf-8')
js=(root/'js/app-legacy.js').read_text(encoding='utf-8')
assert '<link rel="stylesheet" href="css/styles.css">' in html
assert '<script src="js/app-legacy.js"></script>' in html
assert html.replace('<link rel="stylesheet" href="css/styles.css">','<style>'+css+'</style>').replace('<script src="js/app-legacy.js"></script>','<script>'+js+'</script>')==original
assert len(re.findall(r'id="([^"]+)"',html))==len(set(re.findall(r'id="([^"]+)"',html)))
print('OK: equivalência de conteúdo HTML/CSS/JS e IDs únicos')
