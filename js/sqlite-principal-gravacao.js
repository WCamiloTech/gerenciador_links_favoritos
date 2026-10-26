// 5D.3.2-B2.2 — CRUD de favoritos com confirmacao do servidor.
// Outras operacoes permanecem bloqueadas ate a etapa seguinte.
'use strict';
(function () {
 if (!['localhost','127.0.0.1'].includes(location.hostname)) return;
 const banner=document.createElement('div');banner.id='sqliteMainStatus';banner.setAttribute('role','status');
 banner.style.cssText='padding:12px 16px;margin:12px 0;border:1px solid #b99f4c;border-radius:8px;background:#443b21;color:#fff';
 const page=document.querySelector('[data-section="sites"]');page.insertBefore(banner,page.firstChild);
 let revision=null, settings={}, ready=false, busy=false, undoSnapshot=null;
 const blocked=()=>{alert('Operacao ainda indisponivel na integracao SQLite B2.2.');return false};
 // Bloqueia todas as rotas antigas de persistencia; CRUD usa apenas /api/state.
 saveFavorites=blocked;saveSettings=blocked;persistTags=blocked;
 // B2.8-B: auditoria disponivel apenas apos a leitura SQLite concluir.
 function status(msg){banner.textContent=msg}
 function lock(flag){busy=flag;const b=document.getElementById('saveBtn');if(b)b.disabled=flag||!ready}
 async function fetchState(){const response=await fetch('/api/state',{cache:'no-store'});if(!response.ok)throw Error('Falha na leitura: HTTP '+response.status);return response.json()}
 function apply(s){if(!Array.isArray(s.favorites)||!Array.isArray(s.categories)||!Array.isArray(s.tags)||!Number.isInteger(s.revision)||!s.favorites.every(validFavorite))throw Error('Resposta SQLite invalida');
 favorites=s.favorites.map(upgrade);categories=[...s.categories];managedTags=[...s.tags];settings={...s.settings};revision=s.revision;
 if(['cards','table'].includes(settings.view))view=settings.view;
 selectedIds.clear();undoState=null;document.getElementById('undoBtn').disabled=!undoSnapshot;renderCategories();render();ready=true;lock(false);const auditBtn=document.getElementById('auditBtn');if(auditBtn){auditBtn.disabled=false;auditBtn.title='Auditar URLs duplicadas no SQLite';}
 status(`SQLite: ${favorites.length} favoritos, ${categories.length} categorias, ${managedTags.length} etiquetas · revisao ${revision}. Favoritos, categorias, etiquetas e operacoes em lote habilitados. Outras alteracoes bloqueadas.`)}
 async function refresh(){ready=false;lock(true);try{apply(await fetchState())}catch(e){ready=false;lock(true);status('SQLite indisponivel: '+e.message+'. Gravacao bloqueada.');throw e}}
 async function commit(next,operation,explicitCategories=null,explicitTags=null,recordUndo=true,explicitSettings=null){if(!ready||busy)return false;
  const before={favorites:JSON.parse(JSON.stringify(favorites)),categories:[...categories],tags:[...managedTags],settings:{...settings},label:operation};
  lock(true);try{
  const tags=explicitTags===null?[...new Set([...managedTags,...next.flatMap(f=>f.tags)])]:explicitTags;
  const cats=explicitCategories===null?[...new Set([...categories,...next.map(f=>f.category).filter(Boolean)])]:explicitCategories;
  const response=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':String(revision)},body:JSON.stringify({favorites:next,categories:cats,tags,settings:explicitSettings===null?settings:explicitSettings})});
  if(response.status===409){undoSnapshot=null;await refresh();alert('Conflito: outro navegador alterou os dados. O estado foi recarregado; refaca sua operacao.');return false}
  if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.error||'HTTP '+response.status)}
  await refresh();
  if(recordUndo){undoSnapshot=before;document.getElementById('undoBtn').disabled=false}
  else{undoSnapshot=null;document.getElementById('undoBtn').disabled=true}
  return true;
 }catch(e){status('Erro em '+operation+': '+e.message+'. Verifique os dados antes de tentar novamente.');alert('Nao foi possivel salvar no SQLite: '+e.message);return false}
 finally{lock(false)}}
 // B2.8-C.2: exportacoes SQLite leem snapshot atualizado; falhas bloqueiam download.
 // Captura antes dos listeners legados para evitar exportar dados em memoria desatualizados.
 let exporting=false;
 document.addEventListener('click',async event=>{
  const button=event.target.closest('button');
  if(!button||!['exportBtn','exportCsvBtn'].includes(button.id))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(exporting)return;
  exporting=true;
  try{
   const current=await fetchState();
   if(!Array.isArray(current.favorites)||!Array.isArray(current.categories)||!Array.isArray(current.tags)||
      !Number.isInteger(current.revision)||!current.favorites.every(validFavorite))throw Error('Resposta SQLite invalida');
   const rows=current.favorites.map(upgrade);
   const stamp=exportTimestamp();
   if(button.id==='exportBtn'){
    const data={app:'gerenciador-favoritos',version:3,exportedAt:new Date().toISOString(),
     favorites:rows,categories:uniqueNames(current.categories,60),tags:uniqueNames(current.tags),
     settings:{view:['cards','table'].includes(current.settings?.view)?current.settings.view:view,
      theme:document.body.classList.contains('dark')?'dark':'light'}};
    downloadText('favoritos-backup-completo-'+stamp+'.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');
   }else{
    const lines=[csvHeaders,...rows.map(f=>[f.name,f.url,f.description,dateForInput(f.createdAt),f.notes,f.category,f.tags.join(', '),f.priority?'Sim':'Não'])];
    downloadText('favoritos-'+stamp+'.csv','\uFEFF'+lines.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
   }
  }catch(error){alert('Exportacao cancelada: nao foi possivel consultar o SQLite atualizado. '+error.message)}
  finally{exporting=false}
 },true);
 // B2.8-B: auditoria SQLite; nao utiliza commitWithUndo/localStorage.
 function sqliteAuditDuplicates(){
  if(!ready||busy)return;
  const groups=new Map();
  for(const f of favorites){const key=urlKey(f.url);if(!key)continue;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f)}
  const list=document.getElementById('auditList');list.replaceChildren();let total=0;
  for(const [key,group] of groups){if(group.length<2)continue;total++;
   const section=el('div','notice');section.append(el('strong','',key));
   for(const f of group){const line=el('div','audit-item');const info=el('span','small',f.name+' · '+f.url+' · '+localDate(f.createdAt));
    const button=action('Excluir este registro','danger',async()=>{
     if(!ready||busy)return;
     if(!confirm('Excluir somente “'+f.name+'”? Os outros registros permanecerao.'))return;
     const ok=await commit(favorites.filter(x=>x.id!==f.id),'Remover duplicado SQLite');
     if(ok){if(editingId===f.id)resetForm();sqliteAuditDuplicates()}
    });line.append(info,button);section.append(line)}list.append(section)
  }
  if(!total)list.append(el('p','preview-ok','Nenhuma URL duplicada encontrada.'));
  document.getElementById('auditModal').classList.remove('hidden');
 }
 // Captura antes do listener legado, preservando-o fora do modo SQLite.
 document.addEventListener('click',function(e){
  const button=e.target.closest('button');if(!button||button.id!=='auditBtn')return;
  e.preventDefault();e.stopImmediatePropagation();sqliteAuditDuplicates();
 },true);
 // B2.8-A: preferencias de visualizacao persistidas no SQLite.
 // Intercepta os botoes antes dos handlers legados de saveSettings.
 async function changeView(nextView){
  if(!ready||busy||view===nextView)return;
  lock(true);
  try{
   const response=await fetch('/api/state',{
    method:'PUT',headers:{'Content-Type':'application/json','If-Match':String(revision)},
    body:JSON.stringify({favorites,categories,tags:managedTags,settings:{...settings,view:nextView}})
   });
   if(response.status===409){await refresh();alert('Outro navegador alterou os dados. Estado atualizado; tente novamente.');return}
   if(!response.ok)throw Error('HTTP '+response.status);
   await refresh();
  }catch(e){status('Erro ao alterar visualizacao: '+e.message);alert('Nao foi possivel salvar a visualizacao no SQLite: '+e.message)}
  finally{lock(false)}
 }
 document.addEventListener('click',function(e){
  const button=e.target.closest('button');
  if(!button||!['viewCards','viewTable'].includes(button.id))return;
  e.preventDefault();e.stopImmediatePropagation();
  void changeView(button.id==='viewTable'?'table':'cards');
 },true);
 // Desfazer e uma nova transacao SQLite, protegida por If-Match/revisao.
 window.sqliteUndoBridge={
  async undo(){
   if(!undoSnapshot||!ready||busy)return false;
   const snapshot=undoSnapshot;
   if(!confirm('Desfazer a ultima operacao ('+snapshot.label+')?'))return false;
   const ok=await commit(snapshot.favorites,'desfazer '+snapshot.label,snapshot.categories,snapshot.tags,false,snapshot.settings);
   if(ok){selectedIds.clear();resetForm();renderCategories();render();showPage('sites')}
   return ok;
  },
  available(){return !!undoSnapshot}
 };
 // B2.7-A: importacao JSON pela mesma transacao SQLite, com If-Match e Undo.
 window.sqliteJsonImportBridge={
  available(){return ready&&!busy},
  async commitPlan(plan,mode){
   if(!ready||busy)return false;
   if(!plan||!Array.isArray(plan.favorites)||!Array.isArray(plan.categories)||!Array.isArray(plan.tags))return false;
   const ids=new Set(),urls=new Set();
   for(const f of plan.favorites){
    const key=urlKey(f.url);
    if(!key||ids.has(f.id)||urls.has(key)){
     alert('Importacao cancelada: IDs ou URLs duplicados/invalidos.');return false;
    }
    ids.add(f.id);urls.add(key);
   }
   const nextSettings={...settings};
   if(mode==='restore'&&['cards','table'].includes(plan.view))nextSettings.view=plan.view;
   const ok=await commit(plan.favorites,mode==='restore'?'restaurar JSON':'mesclar JSON',plan.categories,plan.tags,true,nextSettings);
   if(ok){selectedIds.clear();resetForm();renderCategories();render();}
   return ok;
  }
 };
 // B2.7-B: CSV/XLSX utilizam a mesma transacao de favoritos, categorias e etiquetas.
 window.sqliteSpreadsheetBridge={
  available(){return ready&&!busy},
  async commitPlan(next){
   if(!ready||busy||!Array.isArray(next))return false;
   const ids=new Set(),urls=new Set();
   for(const f of next){
    const key=urlKey(f.url);
    if(!validFavorite(f)||!key||ids.has(f.id)||urls.has(key)){
     alert('Importacao cancelada: favorito invalido, ID ou URL duplicada.');return false;
    }
    ids.add(f.id);urls.add(key);
   }
   const ok=await commit(next,'importar planilha CSV/XLSX');
   if(ok){selectedIds.clear();resetForm();renderCategories();render()}
   return ok;
  }
 };
 // Captura o submit antes do manipulador legado que gravaria em localStorage.
 document.addEventListener('submit',async function(e){if(e.target.id!=='siteForm'){e.preventDefault();e.stopImmediatePropagation();blocked();return}
 e.preventDefault();e.stopImmediatePropagation();if(!ready||busy)return;
 const url=normalizeUrl(document.getElementById('url').value);
 if(!url){alert('Informe uma URL HTTP ou HTTPS valida.');return}
 if(checkDuplicate()){alert('URL duplicada.');return}
 const name=cleanText(document.getElementById('name').value),description=cleanText(document.getElementById('description').value);
 if(!name||!description){alert('Preencha nome e descricao.');return}
 const values={name,url,description,notes:cleanText(document.getElementById('notes').value),category:document.getElementById('category').value,tags:normalizeTags(document.getElementById('tags').value),priority:document.getElementById('priority').checked};
 const next=editingId?favorites.map(f=>f.id===editingId?{...f,...values}:f):[{id:uid(),createdAt:new Date().toISOString(),...values},...favorites];
 if(await commit(next,editingId?'edicao':'cadastro')){resetForm();showPage('sites')}
 },true);
 // O handler legado de exclusao e prioridade e substituido, sem gravacao local.
 deleteFavorite=async function(id){const f=favorites.find(x=>x.id===id);if(!f||!confirm('Excluir o favorito “'+f.name+'” do SQLite?'))return;
 if(await commit(favorites.filter(x=>x.id!==id),'exclusao')){if(editingId===id)resetForm()}};
 togglePriority=()=>blocked();
 // Impede renomear/excluir categorias, tags, importacoes e operacoes em lote.
 document.addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;
 const label=(b.textContent||'').trim();
 if(b.closest('#categoryList')||b.id==='addCategory'||b.closest('#tagList')||b.id==='addTag'||['applyCategory','applyTags','applyPriority','batchDelete'].includes(b.id))return;
 if(['Renomear','Adicionar','Aplicar categoria','Aplicar tags','Aplicar prioridade','Excluir selecionados','Renomear etiqueta','Excluir etiqueta'].some(s=>label===s||label.startsWith(s+' ')) || b.classList.contains('star')){
 e.preventDefault();e.stopImmediatePropagation();blocked();}
 },true);
 // B2.4-B: catalogo de categorias em uma unica gravacao transacional.
 // Nao modifica o estado local antes da confirmacao do servidor.
 window.sqliteCategoryBridge={
  async add(){
   const name=cleanText(document.getElementById('newCategory').value);
   if(!name||name.length>60){alert('Informe uma categoria de ate 60 caracteres.');return false}
   if(categories.some(c=>c.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){alert('Essa categoria ja existe.');return false}
   const ok=await commit(favorites,'criar categoria',[...categories,name]);
   if(ok){document.getElementById('newCategory').value='';document.getElementById('category').value=name}
   return ok;
  },
  async rename(old){
   const answer=prompt('Novo nome para a categoria:',old);if(answer===null)return false;
   const name=cleanText(answer);
   if(!name||name.length>60){alert('Informe um nome de ate 60 caracteres.');return false}
   if(categories.some(c=>c!==old&&c.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){alert('Categoria ja existente.');return false}
   if(name===old)return true;
   const next=favorites.map(f=>f.category===old?{...f,category:name}:f);
   const ok=await commit(next,'renomear categoria',categories.map(c=>c===old?name:c));
   if(ok&&editingId){const edited=favorites.find(f=>f.id===editingId);if(edited)document.getElementById('category').value=edited.category}
   return ok;
  },
  async remove(name){
   const count=favorites.filter(f=>f.category===name).length;
   if(!confirm('Excluir a categoria “'+name+'”? '+(count?count+' favorito(s) ficarao sem categoria, sem serem excluidos.':'')))return false;
   const next=favorites.map(f=>f.category===name?{...f,category:''}:f);
   return commit(next,'excluir categoria',categories.filter(c=>c!==name));
  }
 };

 // B2.5: todas as alteracoes em lote passam pela mesma transacao e revisao.
 // O catalogo de etiquetas e ampliado apenas quando uma etiqueta nova e aplicada.
 window.sqliteBulkBridge={
  async commit(next,operation){
   const all=[...managedTags];
   const seen=new Set(all.map(tagId));
   for(const f of next){for(const t of f.tags){if(!seen.has(tagId(t))){all.push(t);seen.add(tagId(t))}}}
   return commit(next,operation,null,all);
  }
 };
 // B2.4-C: etiquetas gravadas junto aos favoritos, em transacao unica.
 window.sqliteTagBridge={
  async add(){
   const name=cleanText(document.getElementById('newTag').value);
   if(!name||name.length>80){alert('Informe uma etiqueta de ate 80 caracteres.');return false}
   if(allTags().some(t=>tagId(t)===tagId(name))){alert('Essa etiqueta ja existe.');return false}
   const ok=await commit(favorites,'criar etiqueta',null,[...managedTags,name]);
   if(ok)document.getElementById('newTag').value='';
   return ok;
  },
  async rename(old){
   const answer=prompt('Novo nome da etiqueta:',old);if(answer===null)return false;
   const name=cleanText(answer);
   if(!name||name.length>80){alert('Informe uma etiqueta de ate 80 caracteres.');return false}
   if(tagId(old)!==tagId(name)&&allTags().some(t=>tagId(t)===tagId(name))){alert('Ja existe uma etiqueta com esse nome.');return false}
   if(name===old)return true;
   const next=favorites.map(f=>({...f,tags:normalizeTags(f.tags.map(t=>tagId(t)===tagId(old)?name:t))}));
   const registry=[...new Set([...managedTags,...favorites.flatMap(f=>f.tags)])];
   const nextTags=registry.filter(t=>tagId(t)!==tagId(old));
   if(!nextTags.some(t=>tagId(t)===tagId(name)))nextTags.push(name);
   const ok=await commit(next,'renomear etiqueta',null,nextTags);
   if(ok&&document.getElementById('tags').value.trim()){
    document.getElementById('tags').value=normalizeTags(document.getElementById('tags').value).map(t=>tagId(t)===tagId(old)?name:t).join(', ');
   }
   return ok;
  },
  async remove(tag){
   const count=favorites.filter(f=>f.tags.some(t=>tagId(t)===tagId(tag))).length;
   if(!confirm('Excluir a etiqueta “'+tag+'”? Ela sera removida de '+count+' favorito(s), mas nenhum favorito sera excluido.'))return false;
   const next=favorites.map(f=>({...f,tags:f.tags.filter(t=>tagId(t)!==tagId(tag))}));
   const nextTags=[...new Set([...managedTags,...favorites.flatMap(f=>f.tags)])].filter(t=>tagId(t)!==tagId(tag));
   const ok=await commit(next,'excluir etiqueta',null,nextTags);
   if(ok&&document.getElementById('tags').value.trim()){
    document.getElementById('tags').value=normalizeTags(document.getElementById('tags').value).filter(t=>tagId(t)!==tagId(tag)).join(', ');
   }
   return ok;
  }
 };
 refresh().catch(()=>{});
})();
