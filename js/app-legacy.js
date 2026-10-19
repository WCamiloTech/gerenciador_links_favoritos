

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
}));
showPage('sites');

'use strict';
// Compatibilidade: mantém exatamente a chave de armazenamento da versão anterior.
let favorites=(Array.isArray(readJSON(STORAGE_KEY,[]))?readJSON(STORAGE_KEY,[]):[]).filter(validFavorite).map(upgrade);
const storedSettings=readJSON(SETTINGS_KEY,{});

let categories=Array.isArray(storedSettings.categories)?[...new Set(storedSettings.categories.filter(c=>typeof c==='string'&&c.trim()).map(c=>c.trim()))]:[];
for(const f of favorites){if(f.category&&!categories.some(c=>c.toLowerCase()===f.category.toLowerCase()))categories.push(f.category)}
let view=storedSettings.view==='table'?'table':'cards';let editingId=null;let selectedIds=new Set(),visibleIds=[],undoState=null;const UNDO_KEY='gerenciador_favoritos_undo_v1_4';
function saveFavorites(next){try{const seen=new Map();for(const f of next){const key=urlKey(f.url);if(seen.has(key)){const previous=seen.get(key);const wasExisting=favorites.some(x=>x.id===f.id&&urlKey(x.url)===key)&&favorites.some(x=>x.id===previous.id&&urlKey(x.url)===key);if(!wasExisting){alert('Operação bloqueada: URL duplicada.');return false}}else seen.set(key,f)}localStorage.setItem(STORAGE_KEY,JSON.stringify(next));favorites=next;return true}catch{alert('Não foi possível salvar. Verifique o armazenamento disponível no navegador.');return false}}
function saveSettings(nextCategories=categories,nextView=view){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({categories:nextCategories,view:nextView}));categories=nextCategories;view=nextView;return true}catch{alert('Não foi possível salvar as preferências.');return false}}
function dateForInput(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'':[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function localDate(iso){const d=new Date(iso);return Number.isNaN(d.getTime())?'Data indisponível':d.toLocaleDateString('pt-BR')}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function action(text,cls,fn){const b=el('button','btn '+(cls||''),text);b.type='button';b.addEventListener('click',fn);return b}
function resetForm(){$('formPanel').classList.remove('editing-modal');editingId=null;$('siteForm').reset();$('date').value=dateForInput(new Date().toISOString());$('formTitle').textContent='Adicionar novo site';$('saveBtn').textContent='Salvar favorito';$('cancelBtn').classList.add('hidden');checkDuplicate()}
function duplicateFor(url,id){return favorites.find(f=>f.id!==id&&urlKey(f.url)===urlKey(url))}
function checkDuplicate(){const url=normalizeUrl($('url').value);const match=url?duplicateFor(url,editingId):null;$('duplicateWarning').classList.toggle('hidden',!match);$('duplicateWarning').textContent=match?'Atenção: este endereço já está cadastrado como “'+match.name+'”. Não será permitido duplicá-lo.':'';return match}
$('url').addEventListener('input',checkDuplicate);
$('siteForm').addEventListener('submit',event=>{event.preventDefault();const url=normalizeUrl($('url').value);if(!url){alert('Informe uma URL HTTP ou HTTPS válida.');$('url').focus();return}if(checkDuplicate()){alert('Este site já está cadastrado. Edite o registro existente.');$('url').focus();return}const name=cleanText($('name').value),description=cleanText($('description').value);if(!name||!description){alert('Preencha nome e descrição.');return}const values={name,url,description,notes:cleanText($('notes').value),category:$('category').value,tags:normalizeTags($('tags').value),priority:$('priority').checked};const next=editingId?favorites.map(f=>f.id===editingId?{...f,...values}:f):[{id:uid(),createdAt:new Date().toISOString(),...values},...favorites];if(saveFavorites(next)){resetForm();render();showPage('sites')}});
$('cancelBtn').addEventListener('click',()=>{resetForm();showPage('sites')});
function editFavorite(id){const f=favorites.find(x=>x.id===id);if(!f)return;editingId=id;$('name').value=f.name;$('url').value=f.url;$('description').value=f.description;$('notes').value=f.notes;$('category').value=f.category;$('tags').value=f.tags.join(', ');$('priority').checked=f.priority;$('date').value=dateForInput(f.createdAt);$('formTitle').textContent='Editar favorito';$('saveBtn').textContent='Salvar alterações';$('cancelBtn').classList.remove('hidden');checkDuplicate();showPage('form');$('formPanel').classList.add('editing-modal');$('name').focus({preventScroll:true})}
function deleteFavorite(id){const f=favorites.find(x=>x.id===id);if(!f||!confirm('Excluir o favorito “'+f.name+'”?'))return;if(saveFavorites(favorites.filter(x=>x.id!==id))){if(editingId===id)resetForm();render()}}
function togglePriority(id){if(saveFavorites(favorites.map(f=>f.id===id?{...f,priority:!f.priority}:f)))render()}
function openSite(url){window.open(url,'_blank','noopener,noreferrer')}
async function copyUrl(url){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url)}else{const input=document.createElement('textarea');input.value=url;input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();if(!document.execCommand('copy'))throw Error('Falha ao copiar');input.remove()}alert('URL copiada!')}catch{prompt('Copie o endereço:',url)}}
function controls(f){const wrap=el('div','site-actions');wrap.append(action('Abrir','primary',()=>openSite(f.url)),action('Copiar URL','',()=>copyUrl(f.url)),action('Editar','',()=>editFavorite(f.id)),action('Excluir','danger',()=>deleteFavorite(f.id)));return wrap}
function star(f){const b=el('button','star'+(f.priority?' active':''),f.priority?'★':'☆');b.type='button';b.title=f.priority?'Remover prioridade':'Marcar como prioritário';b.setAttribute('aria-label',b.title);b.addEventListener('click',()=>togglePriority(f.id));return b}
function badges(f){const wrap=el('div','tags');if(f.category)wrap.append(el('span','chip category',f.category));for(const tag of f.tags)wrap.append(el('span','chip','#'+tag));return wrap}
function selectionBox(f){const c=el('input','select-favorite');c.type='checkbox';c.checked=selectedIds.has(f.id);c.setAttribute('aria-label','Selecionar '+f.name);c.addEventListener('change',()=>{if(c.checked)selectedIds.add(f.id);else selectedIds.delete(f.id);render()});return c}
function cardFor(f){const card=el('article','site'),head=el('div','site-head'),title=el('div','site-title');title.append(selectionBox(f),star(f),el('h3','',f.name));head.append(title,el('span','date',localDate(f.createdAt)));const link=el('a','url',f.url);link.href=f.url;link.target='_blank';link.rel='noopener noreferrer';card.append(head,link,el('p','description',f.description),badges(f));if(f.notes)card.append(el('div','notes',f.notes));card.append(controls(f));return card}
function rowFor(f){const tr=el('tr'),site=el('td'),title=el('div','site-title');title.append(star(f),el('strong','',f.name));const link=el('a','url',f.url);link.href=f.url;link.target='_blank';link.rel='noopener noreferrer';site.append(title,link);const desc=el('td','',f.description);if(f.notes)desc.append(el('div','hint','Obs.: '+f.notes));const cats=el('td');cats.append(badges(f));const date=el('td','',localDate(f.createdAt)),acts=el('td');acts.append(controls(f));const choose=el('td');choose.append(selectionBox(f));tr.append(choose,site,desc,cats,date,acts);return tr}
function renderCategories(){const select=$('category'),filter=$('filterCategory'),current=select.value,filtered=filter.value;select.replaceChildren(new Option('Sem categoria',''));filter.replaceChildren(new Option('Todas as categorias','all'),new Option('Sem categoria','none'));for(const c of categories.sort((a,b)=>a.localeCompare(b,'pt-BR'))){select.add(new Option(c,c));filter.add(new Option(c,c))}select.value=categories.includes(current)?current:'';filter.value=[...categories,'all','none'].includes(filtered)?filtered:'all';const batch=$('batchCategory'),prevBatch=batch.value;batch.replaceChildren(new Option('Sem categoria',''));for(const c of categories)batch.add(new Option(c,c));batch.value=categories.includes(prevBatch)?prevBatch:'';const list=$('categoryList');list.replaceChildren();for(const c of categories){const item=el('div','category-item');item.append(el('span','',c),action('Renomear','',()=>renameCategory(c)),action('Excluir','danger',()=>removeCategory(c)));list.append(item)}if(!categories.length)list.append(el('span','hint','Nenhuma categoria criada.'))}
function showManagerTab(tab){
 const isTags=tab==='tags';
 $('tagsPane').classList.toggle('hidden',!isTags);
 $('categoriesPane').classList.toggle('hidden',isTags);
 $('tabTags').classList.toggle('primary',isTags);
 $('tabCategories').classList.toggle('primary',!isTags);
 $('tabTags').setAttribute('aria-selected',String(isTags));
 $('tabCategories').setAttribute('aria-selected',String(!isTags));
 if(isTags)renderTags();
}
$('tabCategories').addEventListener('click',()=>showManagerTab('categories'));
$('tabTags').addEventListener('click',()=>showManagerTab('tags'));
function addCategory(){const name=cleanText($('newCategory').value);if(!name)return;if(categories.some(c=>c.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){alert('Essa categoria já existe.');return}if(saveSettings([...categories,name])){$('newCategory').value='';renderCategories();$('category').value=name;render()}}
function renameCategory(old){const answer=prompt('Novo nome para a categoria:',old);if(answer===null)return;const name=cleanText(answer);if(!name||name.length>60){alert('Informe um nome de até 60 caracteres.');return}if(categories.some(c=>c!==old&&c.toLowerCase()===name.toLowerCase())){alert('Categoria já existente.');return}const next=favorites.map(f=>f.category===old?{...f,category:name}:f);if(!saveFavorites(next))return;if(!saveSettings(categories.map(c=>c===old?name:c)))return;renderCategories();if(editingId){const edited=favorites.find(f=>f.id===editingId);if(edited)$('category').value=edited.category}render()}
function removeCategory(name){const count=favorites.filter(f=>f.category===name).length;if(!confirm('Excluir a categoria “'+name+'”? '+(count?count+' site(s) ficarão sem categoria, mas não serão excluídos.':'')))return;const next=favorites.map(f=>f.category===name?{...f,category:''}:f);if(!saveFavorites(next))return;if(!saveSettings(categories.filter(c=>c!==name)))return;renderCategories();render()}
$('addCategory').addEventListener('click',addCategory);$('newCategory').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addCategory()}});
function render(){renderTags();const term=$('search').value.trim().toLocaleLowerCase('pt-BR'),tag=$('filterTag').value.trim().toLocaleLowerCase('pt-BR'),missing=$('filterMissing').value,cat=$('filterCategory').value,onlyPriority=$('filterPriority').value==='yes',sort=$('sort').value;let list=favorites.filter(f=>(!onlyPriority||f.priority)&&(!tag||f.tags.some(t=>t.toLocaleLowerCase('pt-BR')===tag))&&(missing==='all'||(missing==='missing'&&(!f.description||f.description==='Importado de planilha'))||(missing==='categorized'&&!!f.category)||(missing==='uncategorized'&&!f.category))&&(cat==='all'||(cat==='none'?!f.category:f.category===cat))&&[f.name,f.description,f.notes,f.category,...f.tags].join(' ').toLocaleLowerCase('pt-BR').includes(term));list.sort((a,b)=>Number(b.priority)-Number(a.priority)||(sort==='az'?a.name.localeCompare(b.name,'pt-BR'):sort==='za'?b.name.localeCompare(a.name,'pt-BR'):sort==='old'?new Date(a.createdAt)-new Date(b.createdAt):new Date(b.createdAt)-new Date(a.createdAt)));visibleIds=list.map(f=>f.id);$('selectVisible').checked=!!visibleIds.length&&visibleIds.every(id=>selectedIds.has(id));$('selectedCount').textContent=selectedIds.size+' selecionados';$('batchBar').classList.toggle('hidden',selectedIds.size===0);$('count').textContent=favorites.length+' '+(favorites.length===1?'favorito':'favoritos');$('results').textContent=list.length+' resultado(s) · '+favorites.filter(f=>f.priority).length+' prioritário(s)';$('cards').replaceChildren(...(view==='cards'?list.map(cardFor):[]));$('tableBody').replaceChildren(...(view==='table'?list.map(rowFor):[]));$('cards').classList.toggle('hidden',view!=='cards'||!list.length);$('tableArea').classList.toggle('hidden',view!=='table'||!list.length);$('empty').classList.toggle('hidden',!!list.length);$('empty').textContent=favorites.length?'Nenhum site corresponde aos filtros.':'Nenhum favorito cadastrado. Adicione seu primeiro site acima.';$('viewCards').classList.toggle('active',view==='cards');$('viewTable').classList.toggle('active',view==='table');renderStats()}
for(const id of ['search','filterCategory','filterPriority','sort','filterTag','filterMissing'])$(id).addEventListener(id==='search'?'input':'change',render);
$('viewCards').addEventListener('click',()=>{if(saveSettings(categories,'cards'))render()});$('viewTable').addEventListener('click',()=>{if(saveSettings(categories,'table'))render()});
// Exportação inclui os dados e categorias. A importação também aceita o array JSON da versão 1.0.

$('exportCsvBtn').addEventListener('click',()=>{
 const lines=[csvHeaders,...favorites.map(f=>[f.name,f.url,f.description,dateForInput(f.createdAt),f.notes,f.category,f.tags.join(', '),f.priority?'Sim':'Não'])];
 downloadText('favoritos-'+new Date().toISOString().slice(0,10)+'.csv','\uFEFF'+lines.map(r=>r.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');
});
// Histórico de uma etapa: antes de alterar em massa ou importar, salvar estado anterior.
function commitWithUndo(next,label){
 const old=JSON.stringify({favorites,categories,managedTags:allTags(),label,at:new Date().toISOString()});
 try{localStorage.setItem(UNDO_KEY,old)}catch{alert('Não há espaço para criar ponto de restauração. Exporte JSON antes de continuar.');return false}
 if(!saveFavorites(next))return false;
 undoState=old;$('undoBtn').disabled=false;selectedIds.clear();render();return true;
}
function restoreUndo(){const raw=undoState||localStorage.getItem(UNDO_KEY);if(!raw)return;
 const data=JSON.parse(raw);if(!confirm('Desfazer a última operação ('+data.label+')? As alterações posteriores serão substituídas.'))return;
 if(!saveFavorites(data.favorites))return;
 saveSettings(data.categories);if(Array.isArray(data.managedTags))persistTags(data.managedTags);localStorage.removeItem(UNDO_KEY);undoState=null;$('undoBtn').disabled=true;selectedIds.clear();resetForm();renderCategories();render();
}
$('undoBtn').disabled=!localStorage.getItem(UNDO_KEY);$('undoBtn').addEventListener('click',restoreUndo);
const THEME_KEY='gerenciador_favoritos_tema_v1_4';
function setTheme(dark){document.body.classList.toggle('dark',dark);$('themeBtn').textContent=dark?'☀ Modo claro':'☾ Modo escuro';localStorage.setItem(THEME_KEY,dark?'dark':'light')}
setTheme(localStorage.getItem(THEME_KEY)==='dark');$('themeBtn').addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
function renderStats(){const categorized=favorites.filter(f=>f.category).length,priority=favorites.filter(f=>f.priority).length,tagged=favorites.filter(f=>f.tags.length).length;
 const data=[['Total de sites',favorites.length],['Com categoria',categorized],['Prioritários',priority],['Com etiquetas',tagged]];
 $('stats').replaceChildren(...data.map(([name,n])=>{const box=el('div','stat');box.append(el('strong','',String(n)),el('span','',name));return box}));
 const counts=new Map();for(const f of favorites)counts.set(f.category||'Sem categoria',(counts.get(f.category||'Sem categoria')||0)+1);
 $('topCategories').textContent='Categorias mais utilizadas: '+([...counts].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,c])=>`${n} (${c})`).join(' · ')||'Nenhuma ainda');
}
$('selectVisible').addEventListener('change',e=>{for(const id of visibleIds){if(e.target.checked)selectedIds.add(id);else selectedIds.delete(id)}render()});
$('clearSelection').addEventListener('click',()=>{selectedIds.clear();render()});
$('clearFilters').addEventListener('click',()=>{$('search').value='';$('filterTag').value='';$('filterMissing').value='all';$('filterCategory').value='all';$('filterPriority').value='all';render()});
function bulkChange(transform,label,destructive=false){if(!selectedIds.size){alert('Selecione um ou mais sites.');return}
 const count=selectedIds.size;if(!confirm(`${label} em ${count} registro(s)?${destructive?' Esta ação poderá ser desfeita.':''}`))return;
 const next=destructive?favorites.filter(f=>!selectedIds.has(f.id)):favorites.map(f=>selectedIds.has(f.id)?transform(f):f);
 if(commitWithUndo(next,label)){selectedIds.clear();resetForm();renderCategories();render();showPage('sites')}
}
$('applyCategory').addEventListener('click',()=>bulkChange(f=>({...f,category:$('batchCategory').value}),'Alterar categoria'));
$('applyTags').addEventListener('click',()=>{
 const selected=[...$('batchExistingTags').selectedOptions].map(o=>o.value);
 const typed=normalizeTags($('batchTags').value);
 const tags=[...new Map([...selected,...typed].map(t=>[tagId(t),t])).values()];
 if(!tags.length){alert('Selecione uma ou mais etiquetas cadastradas ou digite novas etiquetas.');return}
 const remove=$('batchTagMode').value==='remove';
 bulkChange(f=>({...f,tags:remove?f.tags.filter(t=>!tags.some(x=>tagId(x)===tagId(t))):normalizeTags([...f.tags,...tags])}),remove?'Remover etiquetas':'Adicionar etiquetas');
});
$('applyPriority').addEventListener('click',()=>bulkChange(f=>({...f,priority:$('batchPriority').value==='yes'}),'Alterar prioridade'));
$('batchDelete').addEventListener('click',()=>bulkChange(null,'Excluir selecionados',true));
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
// XLSX sem CDN: leitor mínimo de arquivos OOXML ZIP com a primeira aba.
// Usa APIs nativas modernas do navegador (DecompressionStream) e limita arquivos grandes.
async function spreadsheetRows(file){
 if(!/\.xlsx$/i.test(file.name)){
  const text=(await file.text()).replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0];
  const delimiter=(first.match(/;/g)||[]).length>=(first.match(/,/g)||[]).length?';':',';return parseCsv(text,delimiter);
 }
 const buf=await file.arrayBuffer(),dv=new DataView(buf),bytes=new Uint8Array(buf);
 const u16=i=>dv.getUint16(i,true),u32=i=>dv.getUint32(i,true);
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(u32(i)===0x06054b50){end=i;break}
 if(end<0)throw Error('Arquivo XLSX não é um ZIP válido.');
 let offset=u32(end+16),count=u16(end+10);const entries=new Map();
 for(let j=0;j<count;j++){if(u32(offset)!==0x02014b50)throw Error('Índice ZIP inválido.');
  const method=u16(offset+10),size=u32(offset+20),nameLen=u16(offset+28),extra=u16(offset+30),comment=u16(offset+32),loc=u32(offset+42);
  const name=new TextDecoder().decode(bytes.slice(offset+46,offset+46+nameLen));entries.set(name,{method,size,loc});offset+=46+nameLen+extra+comment;
 }
 async function xml(name){const e=entries.get(name);if(!e)return null;if(e.size>25e6)throw Error('Planilha muito grande.');
  const off=e.loc;if(u32(off)!==0x04034b50)throw Error('Entrada ZIP inválida.');const start=off+30+u16(off+26)+u16(off+28),data=bytes.slice(start,start+e.size);
  let output;if(e.method===0)output=data;else if(e.method===8&&typeof DecompressionStream!=='undefined'){
   const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));output=new Uint8Array(await new Response(stream).arrayBuffer());
  }else throw Error('Este navegador não oferece descompactação XLSX local. Salve como CSV UTF-8.');
  return new DOMParser().parseFromString(new TextDecoder().decode(output),'application/xml');
 }
 const stringsDoc=await xml('xl/sharedStrings.xml'),shared=[];
 if(stringsDoc)for(const si of stringsDoc.getElementsByTagName('si'))shared.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join(''));
 const workbook=await xml('xl/workbook.xml'),rels=await xml('xl/_rels/workbook.xml.rels');
 let sheetPath='xl/worksheets/sheet1.xml';
 if(workbook&&rels){const first=workbook.getElementsByTagName('sheet')[0],rid=first?.getAttribute('r:id');
  for(const rel of rels.getElementsByTagName('Relationship'))if(rel.getAttribute('Id')===rid){const target=rel.getAttribute('Target')||'';sheetPath=target.startsWith('/')?target.slice(1):target.startsWith('xl/')?target:'xl/'+target;break}
 }
 const doc=await xml(sheetPath);if(!doc)throw Error('Primeira aba XLSX não encontrada.');
 const result=[];for(const row of doc.getElementsByTagName('row')){const cells=[];
  for(const c of row.getElementsByTagName('c')){const ref=c.getAttribute('r')||'A1',letters=(ref.match(/^[A-Z]+/)||['A'])[0];let idx=0;for(const char of letters)idx=idx*26+char.charCodeAt(0)-64;idx--;
   const type=c.getAttribute('t'),v=c.getElementsByTagName('v')[0]?.textContent||'';
   cells[idx]=type==='s'?(shared[Number(v)]||''):type==='inlineStr'?[...c.getElementsByTagName('t')].map(t=>t.textContent).join(''):v;
  }result.push(Array.from({length:cells.length},(_,i)=>cells[i]||''));
 }
 return result;
}

