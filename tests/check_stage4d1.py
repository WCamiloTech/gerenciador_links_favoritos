from pathlib import Path
import subprocess,re
root=Path(__file__).resolve().parents[1]
backup=(root/'js/backup.js').read_text(encoding='utf-8')
app=(root/'js/app-legacy.js').read_text(encoding='utf-8')
assert "const stamp=exportTimestamp();" in backup and "now.getHours()" in (root/"js/export-utils.js").read_text(encoding="utf-8")
assert "favoritos-backup-completo-'+stamp+'.json" in backup
assert "localStorage.setItem(TAGS_KEY,JSON.stringify(merged))" in app
assert "managedTags=merged" in app
assert "if(!registry.has(tagId(tag)))" in app
assert "localStorage.setItem(STORAGE_KEY,JSON.stringify(next));favorites=next;" in app
for name in ['js/app-legacy.js','js/backup.js']:
 r=subprocess.run(['node','--check',str(root/name)],capture_output=True,text=True)
 assert r.returncode==0,r.stderr
print('OK: Etapa 4D.1 - sintaxe, nome do backup e persistencia de etiquetas')
