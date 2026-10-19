const TAGS_KEY='gerenciador_favoritos_tags_v1_5_1';
let managedTags=Array.isArray(readJSON(TAGS_KEY,[]))?readJSON(TAGS_KEY,[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim().slice(0,80)):[];
function tagId(t){return cleanText(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
function allTags(){const m=new Map();for(const t of [...managedTags,...favorites.flatMap(f=>f.tags)])if(!m.has(tagId(t)))m.set(tagId(t),t);return [...m.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'))}
function persistTags(next){try{localStorage.setItem(TAGS_KEY,JSON.stringify(next));managedTags=next;return true}catch{alert('Não foi possível salvar etiquetas.');return false}}

// Gerenciamento centralizado das etiquetas. Não altera os favoritos ao cadastrar uma etiqueta vazia.
function renderTags(){
 const batchPicker=$('batchExistingTags');
 const chosen=new Set([...batchPicker.selectedOptions].map(o=>tagId(o.value)));
 const available=allTags();
 batchPicker.replaceChildren();
 if(!available.length){
  const empty=new Option('Nenhuma tag cadastrada','');empty.disabled=true;batchPicker.add(empty);
 }else{
  for(const t of available){
   const o=new Option(t,t);
   o.selected=chosen.has(tagId(t));
   batchPicker.add(o);
  }
 }
 $('batchTagsEmptyHelp').classList.toggle('hidden',available.length>0);
 const tags=allTags(),list=$('tagList'),picker=$('existingTagSelect'),previous=picker.value;
 list.replaceChildren();picker.replaceChildren(new Option('Escolha uma etiqueta...',''));
 for(const tag of tags){
  picker.add(new Option(tag,tag));
  const count=favorites.filter(f=>f.tags.some(t=>tagId(t)===tagId(tag))).length;
  const item=el('div','tag-entry');
  const info=el('div','tag-info');info.append(el('strong','',tag),el('span','hint',count+' site(s) associado(s)'));
  item.append(info,action('Renomear','',()=>renameTag(tag)),action('Excluir','danger',()=>removeTag(tag)));
  list.append(item);
 }
 if(!tags.length)list.append(el('p','hint','Nenhuma etiqueta cadastrada.'));
 picker.value=tags.includes(previous)?previous:'';
}
function addTag(){
 const name=cleanText($('newTag').value);
 if(!name||name.length>80){alert('Informe uma etiqueta de até 80 caracteres.');return}
 if(allTags().some(t=>tagId(t)===tagId(name))){alert('Essa etiqueta já existe.');return}
 if(persistTags([...managedTags,name])){$('newTag').value='';renderTags()}
}
function renameTag(old){
 const answer=prompt('Novo nome da etiqueta:',old);if(answer===null)return;
 const name=cleanText(answer);if(!name||name.length>80){alert('Informe uma etiqueta de até 80 caracteres.');return}
 if(tagId(old)!==tagId(name)&&allTags().some(t=>tagId(t)===tagId(name))){alert('Já existe uma etiqueta com esse nome.');return}
 const next=favorites.map(f=>({...f,tags:normalizeTags(f.tags.map(t=>tagId(t)===tagId(old)?name:t))}));
 const oldRegistry=[...managedTags];
 if(!commitWithUndo(next,'Renomear etiqueta: '+old))return;
 const registry=allTags().filter(t=>tagId(t)!==tagId(old));
 if(!persistTags([...registry,name])){alert('Não foi possível salvar o catálogo de etiquetas.');return}
 if($('tags').value.trim())$('tags').value=normalizeTags($('tags').value).map(t=>tagId(t)===tagId(old)?name:t).join(', ');
 renderTags();render();
}
function removeTag(tag){
 const count=favorites.filter(f=>f.tags.some(t=>tagId(t)===tagId(tag))).length;
 if(!confirm('Excluir a etiqueta “'+tag+'”? Ela será removida de '+count+' site(s), mas nenhum favorito será excluído.'))return;
 const next=favorites.map(f=>({...f,tags:f.tags.filter(t=>tagId(t)!==tagId(tag))}));
 if(!commitWithUndo(next,'Excluir etiqueta: '+tag))return;
 persistTags(managedTags.filter(t=>tagId(t)!==tagId(tag)));
 if($('tags').value.trim())$('tags').value=normalizeTags($('tags').value).filter(t=>tagId(t)!==tagId(tag)).join(', ');
 renderTags();render();
}
$('addTag').addEventListener('click',addTag);
$('newTag').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addTag()}});
$('addExistingTag').addEventListener('click',()=>{
 const name=$('existingTagSelect').value;if(!name)return;
 const values=normalizeTags([...normalizeTags($('tags').value),name]);
 $('tags').value=values.join(', ');
});

// Inicialização após a carga de ambos os módulos.
renderCategories();resetForm();render();
