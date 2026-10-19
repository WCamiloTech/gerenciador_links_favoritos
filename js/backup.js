// Etapa 3: backup JSON, sem mudanças na lógica.
// Backup JSON v3: inclui catálogo de categorias, etiquetas não utilizadas e preferências.
const BACKUP_HISTORY_KEY='gerenciador_favoritos_import_history_v1_6';
let pendingBackup=null;
function uniqueNames(values,limit=80){
 const seen=new Set(),result=[];
 for(const value of values){if(typeof value!=='string')continue;const name=value.trim().slice(0,limit);const key=tagId(name);if(!name||seen.has(key))continue;seen.add(key);result.push(name)}
 return result;
}
function downloadBackup(){
 const data={app:'gerenciador-favoritos',version:3,exportedAt:new Date().toISOString(),
  favorites,categories:uniqueNames(categories,60),tags:allTags(),
  settings:{view,theme:document.body.classList.contains('dark')?'dark':'light'}};
 const stamp=exportTimestamp();
 downloadText('favoritos-backup-completo-'+stamp+'.json',
  JSON.stringify(data,null,2),'application/json;charset=utf-8');
}
$('exportBtn').addEventListener('click',downloadBackup);
$('importBtn').addEventListener('click',()=>$('importFile').click());
function inspectBackup(raw){
 const rows=Array.isArray(raw)?raw:raw&&raw.app==='gerenciador-favoritos'?raw.favorites:null;
 if(!Array.isArray(rows)||!rows.every(validFavorite))throw Error('Formato de favoritos inválido.');
 if(rows.length>50000)throw Error('Arquivo contém registros demais.');
 const imported=rows.map(upgrade).map(f=>({...f,url:normalizeUrl(f.url)}));
 if(imported.some(f=>!f.url))throw Error('O arquivo contém URLs inválidas.');
 const sourceCats=Array.isArray(raw.categories)?raw.categories:[];
 const sourceTags=Array.isArray(raw.tags)?raw.tags:Array.isArray(raw.managedTags)?raw.managedTags:[];
 const backupCategories=uniqueNames([...sourceCats,...imported.map(f=>f.category)],60);
 const backupTags=uniqueNames([...sourceTags,...imported.flatMap(f=>f.tags)]);
 const keys=new Set(),deduped=[];let internalDuplicates=0;
 for(const f of imported){const k=urlKey(f.url);if(keys.has(k)){internalDuplicates++;continue}keys.add(k);deduped.push(f)}
 const existingKeys=new Set(favorites.map(f=>urlKey(f.url)));
 return {favorites:deduped,categories:backupCategories,tags:backupTags,
  settings:raw&&raw.settings&&typeof raw.settings==='object'?raw.settings:{},
  duplicates:internalDuplicates,overlap:deduped.filter(f=>existingKeys.has(urlKey(f.url))).length,
  sourceVersion:raw?.version||'legado'};
}
function backupPlan(mode){
 const incoming=pendingBackup.data;
 if(mode==='restore')return {favorites:incoming.favorites,categories:incoming.categories,tags:incoming.tags,
  view:incoming.settings.view==='table'?'table':incoming.settings.view==='cards'?'cards':view,
  theme:['dark','light'].includes(incoming.settings.theme)?incoming.settings.theme:null};
 const currentKeys=new Set(favorites.map(f=>urlKey(f.url)));
 const newItems=incoming.favorites.filter(f=>!currentKeys.has(urlKey(f.url)));
 const ids=new Set(favorites.map(f=>f.id));
 const safeNew=newItems.map(f=>{if(ids.has(f.id)){f={...f,id:uid()}}ids.add(f.id);return f});
 return {favorites:[...favorites,...safeNew],categories:uniqueNames([...categories,...incoming.categories],60),
  tags:uniqueNames([...allTags(),...incoming.tags]),view,theme:null};
}
function previewBackup(){
 if(!pendingBackup)return;
 const data=pendingBackup.data,mode=$('backupMode').value,plan=backupPlan(mode);
 const existing=new Set(favorites.map(f=>urlKey(f.url)));
 const added=data.favorites.filter(f=>!existing.has(urlKey(f.url))).length;
 $('backupSummary').textContent=
  `Arquivo: ${pendingBackup.filename} · Formato: ${data.sourceVersion}\n`+
  `Favoritos no arquivo: ${data.favorites.length} · Novos: ${added} · URLs já existentes: ${data.overlap}\n`+
  `Categorias no arquivo: ${data.categories.length} · Etiquetas no arquivo: ${data.tags.length}\n`+
  `URLs repetidas dentro do arquivo ignoradas: ${data.duplicates}\n`+
  `Resultado previsto: ${plan.favorites.length} favoritos, ${plan.categories.length} categorias, ${plan.tags.length} etiquetas.`;
 $('backupWarning').textContent=mode==='restore'
  ?'ATENÇÃO: Restaurar substituirá favoritos, categorias e etiquetas atuais. Será criada uma cópia de segurança antes da alteração.'
  :'Mesclar preservará os favoritos existentes; URLs já cadastradas serão ignoradas e categorias/etiquetas serão unificadas.';
}
$('backupMode').addEventListener('change',previewBackup);
$('cancelBackup').addEventListener('click',()=>{$('backupPreview').classList.add('hidden');pendingBackup=null});
$('importFile').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(file.size>15*1024*1024)throw Error('Arquivo maior que 15 MB.');
  const data=inspectBackup(JSON.parse(await file.text()));
  pendingBackup={data,filename:file.name};
  $('backupMode').value='merge';previewBackup();$('backupPreview').classList.remove('hidden');
 }catch(err){alert('Falha ao verificar backup: '+err.message)}
 finally{e.target.value=''}
});
$('confirmBackup').addEventListener('click',()=>{
 if(!pendingBackup)return;
 const mode=$('backupMode').value,plan=backupPlan(mode);
 const message=mode==='restore'
  ?'CONFIRMAR RESTAURAÇÃO: os dados atuais serão substituídos. Continuar?'
  :'Confirmar mesclagem do backup com os dados atuais?';
 if(!confirm(message))return;
 // Pré-validação completa, antes de escrever qualquer chave do localStorage.
 const seen=new Set();
 for(const f of plan.favorites){const k=urlKey(f.url);if(!k||seen.has(k)){alert('Operação cancelada: há URLs duplicadas ou inválidas no resultado.');return}seen.add(k)}
 const snapshot={
  favorites:localStorage.getItem(STORAGE_KEY),settings:localStorage.getItem(SETTINGS_KEY),
  tags:localStorage.getItem(TAGS_KEY),theme:localStorage.getItem(THEME_KEY)
 };
 const rollback=()=>{for(const [k,key] of Object.entries({favorites:STORAGE_KEY,settings:SETTINGS_KEY,tags:TAGS_KEY,theme:THEME_KEY})){
  if(snapshot[k]===null)localStorage.removeItem(key);else localStorage.setItem(key,snapshot[k]);
 }};
 try{
  // Reserva cópia de segurança persistente para o botão Desfazer.
  const previous=JSON.stringify({favorites,categories,managedTags:allTags(),label:'Importação JSON',at:new Date().toISOString()});
  localStorage.setItem(UNDO_KEY,previous);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(plan.favorites));
  localStorage.setItem(SETTINGS_KEY,JSON.stringify({categories:plan.categories,view:plan.view}));
  localStorage.setItem(TAGS_KEY,JSON.stringify(plan.tags));
  if(plan.theme)localStorage.setItem(THEME_KEY,plan.theme);
  favorites=plan.favorites;categories=plan.categories;managedTags=plan.tags;view=plan.view;
  if(plan.theme)setTheme(plan.theme==='dark');
  undoState=previous;$('undoBtn').disabled=false;selectedIds.clear();
  const history=readJSON(BACKUP_HISTORY_KEY,[]);
  try{localStorage.setItem(BACKUP_HISTORY_KEY,JSON.stringify([{date:new Date().toISOString(),file:pendingBackup.filename,mode,count:plan.favorites.length},...history].slice(0,20)))}catch{}
  resetForm();renderCategories();render();renderHistory();
  $('backupPreview').classList.add('hidden');pendingBackup=null;
  alert('Importação JSON concluída. Categorias e etiquetas também foram restauradas.');
 }catch(err){
  try{rollback()}catch{}
  alert('Não foi possível concluir a importação. Os dados anteriores foram preservados. '+err.message);
 }
});
function renderHistory(){
 const history=readJSON(BACKUP_HISTORY_KEY,[]);
 const target=$('backupHistory');target.replaceChildren();
 if(!history.length){target.append(el('p','hint','Nenhuma importação JSON registrada.'));return}
 for(const h of history.slice(0,10)){
  const line=el('p','hint');
  line.textContent=`${localDate(h.date)} · ${h.mode==='restore'?'Restauração':'Mesclagem'} · ${h.file} · ${h.count} favoritos após a operação`;
  target.append(line);
 }
}
renderHistory();

