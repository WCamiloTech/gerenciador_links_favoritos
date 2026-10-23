'use strict';
// Etapa 5C: Desfazer em um nivel, mantendo a chave historica e o contrato global.
let undoState=null;
const UNDO_KEY='gerenciador_favoritos_undo_v1_4';
// Histórico de uma etapa: antes de alterar em massa ou importar, salvar estado anterior.
function commitWithUndo(next,label,preserveSelection=false){
 const old=JSON.stringify({favorites,categories,managedTags:allTags(),label,at:new Date().toISOString()});
 try{localStorage.setItem(UNDO_KEY,old)}catch{alert('Não há espaço para criar ponto de restauração. Exporte JSON antes de continuar.');return false}
 if(!saveFavorites(next))return false;
 undoState=old;$('undoBtn').disabled=false;if(!preserveSelection)selectedIds.clear();render();return true;
}
function restoreUndo(){if(window.sqliteUndoBridge)return window.sqliteUndoBridge.undo();const raw=undoState||localStorage.getItem(UNDO_KEY);if(!raw)return;
 const data=JSON.parse(raw);if(!confirm('Desfazer a última operação ('+data.label+')? As alterações posteriores serão substituídas.'))return;
 if(!saveFavorites(data.favorites))return;
 saveSettings(data.categories);if(Array.isArray(data.managedTags))persistTags(data.managedTags);localStorage.removeItem(UNDO_KEY);undoState=null;$('undoBtn').disabled=true;selectedIds.clear();resetForm();renderCategories();render();
}
$('undoBtn').disabled=!localStorage.getItem(UNDO_KEY);$('undoBtn').addEventListener('click',restoreUndo);
