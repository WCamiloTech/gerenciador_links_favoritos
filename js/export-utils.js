'use strict';
// Utilitários de exportação preservados da versão 1.6.1.
const csvHeaders=['Nome do Site','URL','Descrição/Finalidade','Data de Cadastro','Observações','Categoria','Etiquetas','Prioritário'];
function csvCell(v){const t=String(v??'');return /[;"\r\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t}
function downloadText(filename,text,mime){const blob=new Blob([text],{type:mime}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}


// Local timestamp shared by JSON and CSV exports.
function exportTimestamp(now=new Date()){const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');const time=[now.getHours(),now.getMinutes(),now.getSeconds()].map(n=>String(n).padStart(2,'0')).join('-');return date+'_'+time}
