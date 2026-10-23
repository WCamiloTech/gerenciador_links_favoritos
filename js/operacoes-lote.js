'use strict';
// Etapa 5D: operações em lote extraídas sem alteração de lógica.
$('selectVisible').addEventListener('change',e=>{for(const id of visibleIds){if(e.target.checked)selectedIds.add(id);else selectedIds.delete(id)}render()});
$('clearSelection').addEventListener('click',()=>{selectedIds.clear();render()});
function bulkChange(transform,label,destructive=false,preserveSelection=false){if(!selectedIds.size){alert('Selecione um ou mais sites.');return}
 const count=selectedIds.size;if(!confirm(`${label} em ${count} registro(s)?${destructive?' Esta ação poderá ser desfeita.':''}`))return;
 const next=destructive?favorites.filter(f=>!selectedIds.has(f.id)):favorites.map(f=>selectedIds.has(f.id)?transform(f):f);
 if(commitWithUndo(next,label,preserveSelection)){if(!preserveSelection)selectedIds.clear();resetForm();renderCategories();render();showPage('sites')}
}
$('applyCategory').addEventListener('click',()=>bulkChange(f=>({...f,category:$('batchCategory').value}),'Alterar categoria'));
$('applyTags').addEventListener('click',()=>{
 const selected=[...$('batchExistingTags').querySelectorAll('input[type="checkbox"]:checked')].map(o=>o.value);
 const typed=normalizeTags($('batchTags').value);
 const tags=[...new Map([...selected,...typed].map(t=>[tagId(t),t])).values()];
 if(!tags.length){alert('Selecione uma ou mais etiquetas cadastradas ou digite novas etiquetas.');return}
 const remove=$('batchTagMode').value==='remove';
 bulkChange(f=>({...f,tags:remove?f.tags.filter(t=>!tags.some(x=>tagId(x)===tagId(t))):normalizeTags([...f.tags,...tags])}),remove?'Remover etiquetas':'Adicionar etiquetas',false,true);
});
$('applyPriority').addEventListener('click',()=>bulkChange(f=>({...f,priority:$('batchPriority').value==='yes'}),'Alterar prioridade'));
$('batchDelete').addEventListener('click',()=>bulkChange(null,'Excluir selecionados',true));
