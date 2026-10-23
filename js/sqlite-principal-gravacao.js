// 5D.3.2-B2.2 — CRUD de favoritos com confirmacao do servidor.
// Outras operacoes permanecem bloqueadas ate a etapa seguinte.
'use strict';
(function () {
 if (!['localhost','127.0.0.1'].includes(location.hostname)) return;
 const banner=document.createElement('div');banner.id='sqliteMainStatus';banner.setAttribute('role','status');
 banner.style.cssText='padding:12px 16px;margin:12px 0;border:1px solid #b99f4c;border-radius:8px;background:#443b21;color:#fff';
 const page=document.querySelector('[data-section="sites"]');page.insertBefore(banner,page.firstChild);
 let revision=null, settings={}, ready=false, busy=false;
 const blocked=()=>{alert('Operacao ainda indisponivel na integracao SQLite B2.2.');return false};
 // Bloqueia todas as rotas antigas de persistencia; CRUD usa apenas /api/state.
 saveFavorites=blocked;saveSettings=blocked;persistTags=blocked;
 const blockIds=['importBtn','confirmBackup','confirmCsv','applyCategory','applyTags','applyPriority','batchDelete','addCategory','addTag','undoBtn','auditBtn','viewTable'];
 for(const id of blockIds){const e=document.getElementById(id);if(e){e.disabled=true;e.title='Indisponivel nesta fase SQLite'}}
 function status(msg){banner.textContent=msg}
 function lock(flag){busy=flag;const b=document.getElementById('saveBtn');if(b)b.disabled=flag||!ready}
 async function fetchState(){const response=await fetch('/api/state',{cache:'no-store'});if(!response.ok)throw Error('Falha na leitura: HTTP '+response.status);return response.json()}
 function apply(s){if(!Array.isArray(s.favorites)||!Array.isArray(s.categories)||!Array.isArray(s.tags)||!Number.isInteger(s.revision)||!s.favorites.every(validFavorite))throw Error('Resposta SQLite invalida');
 favorites=s.favorites.map(upgrade);categories=[...s.categories];managedTags=[...s.tags];settings={...s.settings};revision=s.revision;
 selectedIds.clear();undoState=null;document.getElementById('undoBtn').disabled=true;renderCategories();render();ready=true;lock(false);
 status(`SQLite: ${favorites.length} favoritos, ${categories.length} categorias, ${managedTags.length} etiquetas · revisao ${revision}. Cadastro, edicao e exclusao habilitados. Outras alteracoes bloqueadas.`)}
 async function refresh(){ready=false;lock(true);try{apply(await fetchState())}catch(e){ready=false;lock(true);status('SQLite indisponivel: '+e.message+'. Gravacao bloqueada.');throw e}}
 async function commit(next,operation){if(!ready||busy)return false;lock(true);try{
  const tags=[...new Set([...managedTags,...next.flatMap(f=>f.tags)])];
  const cats=[...new Set([...categories,...next.map(f=>f.category).filter(Boolean)])];
  const response=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','If-Match':String(revision)},body:JSON.stringify({favorites:next,categories:cats,tags,settings})});
  if(response.status===409){await refresh();alert('Conflito: outro navegador alterou os dados. O estado foi recarregado; refaca sua operacao.');return false}
  if(!response.ok){const err=await response.json().catch(()=>({}));throw Error(err.error||'HTTP '+response.status)}
  await refresh();return true;
 }catch(e){status('Erro em '+operation+': '+e.message+'. Verifique os dados antes de tentar novamente.');alert('Nao foi possivel salvar no SQLite: '+e.message);return false}
 finally{lock(false)}}
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
 if(['Renomear','Adicionar','Aplicar categoria','Aplicar tags','Aplicar prioridade','Excluir selecionados','Confirmar importação','Renomear etiqueta','Excluir etiqueta'].some(s=>label===s||label.startsWith(s+' ')) || b.classList.contains('star')){
 e.preventDefault();e.stopImmediatePropagation();blocked();}
 },true);
 refresh().catch(()=>{});
})();
