from pathlib import Path
import re, subprocess
root=Path(__file__).resolve().parents[1]
legacy=(root/'js/app-legacy.js').read_text(encoding='utf-8')
imp=(root/'js/importacao-planilhas.js').read_text(encoding='utf-8')
html=(root/'index.html').read_text(encoding='utf-8-sig')
assert 'async function spreadsheetRows(file)' not in legacy
assert imp.count('async function spreadsheetRows(file)')==1
assert 'await spreadsheetRows(file)' in imp
assert imp.index('async function spreadsheetRows(file)')>imp.index("$('importCsvFile').addEventListener")
assert html.index('src="js/app-legacy.js"')<html.index('src="js/importacao-planilhas.js"')
for f in ('js/app-legacy.js','js/importacao-planilhas.js'):
 r=subprocess.run(['node','--check',str(root/f)],capture_output=True,text=True)
 assert r.returncode==0,(f,r.stderr)
print('OK: Etapa 5A - leitor CSV/XLSX extraido, sintaxe e ordem de carregamento')
