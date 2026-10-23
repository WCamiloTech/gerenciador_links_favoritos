// 5D.3.2-B2.1 — espelho de leitura na interface principal, SEM escrita.
'use strict';
(function(){
 if(!['localhost','127.0.0.1'].includes(location.hostname))return;
 const banner=document.createElement('div');banner.id='sqliteMainStatus';banner.setAttribute('role','status');banner.style.cssText='padding:12px 16px;margin:12px 0;border:1px solid #b99f4c;border-radius:8px;background:#443b21;color:#fff;';
 banner.textContent='SQLite: carregando dados. Alterações bloqueadas nesta fase.';
 const page=document.querySelector('[data-section="sites"]');page.insertBefore(banner,page.firstChild);
 // Guarda explícita: nenhuma operação de alteração deve gravar no localStorage enquanto os dados exibidos são do SQLite.
 const oldSaveFavorites=saveFavorites,oldSaveSettings=saveSettings,oldPersistTags=persistTags;
 const deny=()=>{alert('Modo SQLite somente leitura (B2.1). Nenhuma alteração foi salva.');return false};
 saveFavorites=deny;saveSettings=deny;persistTags=deny;
 const ids=['importBtn','confirmBackup','confirmCsv','applyCategory','applyTags','applyPriority','batchDelete','addCategory','addTag','undoBtn','saveBtn','auditBtn'];
 function disableWrites(){for(const id of ids){const btn=document.getElementById(id);if(btn){btn.disabled=true;btn.title='Somente leitura nesta fase da integração SQLite'}}}
 disableWrites();
 // Impede ações com efeitos colaterais antes de seus handlers originais (inclusive handlers dinâmicos).
 document.addEventListener('click',function(e){const b=e.target.closest('button');if(!b)return;
 const label=(b.textContent||'').trim();
 if(['Editar','Excluir','Renomear','Adicionar','Salvar favorito','Salvar alterações','Aplicar categoria','Aplicar tags','Aplicar prioridade','Excluir selecionados','Confirmar importação','Renomear etiqueta','Excluir etiqueta'].some(s=>label===s||label.startsWith(s+' ')) || b.classList.contains('star')){e.preventDefault();e.stopImmediatePropagation();deny()}
 },true);
 document.addEventListener('submit',function(e){e.preventDefault();e.stopImmediatePropagation();deny()},true);
 async function load(){try{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);let response;
 try{response=await fetch('/api/state',{cache:'no-store',signal:controller.signal})}finally{clearTimeout(timer)}
 if(!response.ok)throw Error('HTTP '+response.status);
 const state=await response.json();
 if(!Array.isArray(state.favorites)||!Array.isArray(state.categories)||!Array.isArray(state.tags)||!Number.isInteger(state.revision))throw Error('Resposta inválida');
 if(!state.favorites.every(validFavorite))throw Error('Favoritos inválidos');
 favorites=state.favorites.map(upgrade);categories=[...state.categories];managedTags=[...state.tags];
 selectedIds.clear();undoState=null;document.getElementById('undoBtn').disabled=true;
 renderCategories();render();
 banner.textContent=`SQLite: ${favorites.length} favoritos, ${categories.length} categorias, ${managedTags.length} etiquetas · revisão ${state.revision}. SOMENTE LEITURA: cadastro, edição, exclusão e importação bloqueados.`;
 }catch(err){favorites=[];categories=[];managedTags=[];renderCategories();render();banner.textContent='Falha ao carregar SQLite ('+err.message+'). Operações bloqueadas para proteger os dados.';}}
 load();
})();
