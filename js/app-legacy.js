

// Navegação em seções: somente a seção ativa fica visível; dados e filtros permanecem.
let currentPage='sites';
function showPage(page){
 currentPage=page;
 document.querySelectorAll('.app-page').forEach(n=>n.classList.toggle('page-active',n.dataset.section===page));
 document.querySelectorAll('.nav-link').forEach(n=>{const active=n.dataset.page===page;n.classList.toggle('active',active);n.setAttribute('aria-current',active?'page':'false')});
}
document.querySelectorAll('.nav-link').forEach(n=>n.addEventListener('click',()=>{
 if(editingId && n.dataset.page!=='form'){if(!confirm('Sair da edição sem salvar?'))return;resetForm()}
 showPage(n.dataset.page);
 if(n.dataset.page==='categories')renderCategories();
}));
showPage('sites');

'use strict';
// Compatibilidade: mantém exatamente a chave de armazenamento da versão anterior.
let favorites=(Array.isArray(readJSON(STORAGE_KEY,[]))?readJSON(STORAGE_KEY,[]):[]).filter(validFavorite).map(upgrade);
const storedSettings=readJSON(SETTINGS_KEY,{});

let categories=Array.isArray(storedSettings.categories)?[...new Set(storedSettings.categories.filter(c=>typeof c==='string'&&c.trim()).map(c=>c.trim()))]:[];
for(const f of favorites){if(f.category&&!categories.some(c=>c.toLowerCase()===f.category.toLowerCase()))categories.push(f.category)}
let view=storedSettings.view==='table'?'table':'cards';let editingId=null;let selectedIds=new Set(),visibleIds=[];
function saveFavorites(next){try{const seen=new Map();for(const f of next){const key=urlKey(f.url);if(seen.has(key)){const previous=seen.get(key);const wasExisting=favorites.some(x=>x.id===f.id&&urlKey(x.url)===key)&&favorites.some(x=>x.id===previous.id&&urlKey(x.url)===key);if(!wasExisting){alert('Operação bloqueada: URL duplicada.');return false}}else seen.set(key,f)}localStorage.setItem(STORAGE_KEY,JSON.stringify(next));favorites=next;
 // Registra etiquetas novas para reutilização mesmo após excluir o favorito.
 const registry=new Map(managedTags.map(t=>[tagId(t),t]));
 for(const f of next)for(const tag of normalizeTags(f.tags))if(!registry.has(tagId(tag)))registry.set(tagId(tag),tag);
 const merged=[...registry.values()];
 if(merged.length!==managedTags.length){
  try{localStorage.setItem(TAGS_KEY,JSON.stringify(merged));managedTags=merged}
  catch{alert('Favoritos salvos, mas não foi possível atualizar o catálogo de etiquetas.')}
 }
 return true}catch{alert('Não foi possível salvar. Verifique o armazenamento disponível no navegador.');return false}}
function saveSettings(nextCategories=categories,nextView=view){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({categories:nextCategories,view:nextView}));categories=nextCategories;view=nextView;return true}catch{alert('Não foi possível salvar as preferências.');return false}}
function dateForInput(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'':[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function showManagerTab(tab){
 const isTags=tab==='tags';
 $('tagsPane').classList.toggle('hidden',!isTags);
 $('categoriesPane').classList.toggle('hidden',isTags);
 $('tabTags').classList.toggle('primary',isTags);
 $('tabCategories').classList.toggle('primary',!isTags);
 $('tabTags').setAttribute('aria-selected',String(isTags));
 $('tabCategories').setAttribute('aria-selected',String(!isTags));
 if(isTags)renderTags();else renderCategories();
}
$('tabCategories').addEventListener('click',()=>showManagerTab('categories'));
$('tabTags').addEventListener('click',()=>showManagerTab('tags'));
// Exportação inclui os dados e categorias. A importação também aceita o array JSON da versão 1.0.

$('exportCsvBtn').addEventListener('click',()=>{
 const lines=[csvHeaders,...favorites.map(f=>[f.name,f.url,f.description,dateForInput(f.createdAt),f.notes,f.category,f.tags.join(', '),f.priority?'Sim':'Não'])];
 downloadText('favoritos-'+exportTimestamp()+'.csv','\uFEFF'+lines.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
});
const THEME_KEY='gerenciador_favoritos_tema_v1_4';
function setTheme(dark){document.body.classList.toggle('dark',dark);$('themeBtn').textContent=dark?'☀ Modo claro':'☾ Modo escuro';localStorage.setItem(THEME_KEY,dark?'dark':'light')}
setTheme(localStorage.getItem(THEME_KEY)==='dark');$('themeBtn').addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
function auditDuplicates(){const groups=new Map();for(const f of favorites){const key=urlKey(f.url);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f)}
 const list=$('auditList');list.replaceChildren();let total=0;
 for(const [key,group] of groups)if(group.length>1){total++;
  const section=el('div','notice');section.append(el('strong','',key));
  for(const f of group){const line=el('div','audit-item');const info=el('span','small',f.name+' · '+f.url+' · '+localDate(f.createdAt));
   const btn=action('Excluir este registro','danger',()=>{if(!confirm('Excluir somente “'+f.name+'”? Os outros registros permanecerão.'))return;
    const next=favorites.filter(x=>x.id!==f.id);if(!commitWithUndo(next,'Remover duplicado'))return;auditDuplicates()});line.append(info,btn);section.append(line)}list.append(section)}
 if(!total)list.append(el('p','preview-ok','Nenhuma URL duplicada encontrada.'));
 $('auditModal').classList.remove('hidden');
}
$('auditBtn').addEventListener('click',auditDuplicates);$('closeAudit').addEventListener('click',()=>$('auditModal').classList.add('hidden'));


