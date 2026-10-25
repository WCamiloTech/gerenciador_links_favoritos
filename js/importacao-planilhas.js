// Etapa 3: importação CSV/XLSX, sem mudanças na lógica.
$('importCsvBtn').addEventListener('click',()=>$('importCsvFile').click());
// Parser CSV: trata aspas escapadas, quebras de linha dentro de células e ; ou , como separadores.
function parseCsv(text,delimiter){
 const rows=[],row=[];let cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted){quoted=false}else if(!cell.trim()){quoted=true}else{cell+=c}}
  else if(c===delimiter&&!quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push([...row]);row.length=0;cell=''}
  else{cell+=c}
 }
 if(quoted)throw Error('Há aspas não fechadas no CSV.');
 row.push(cell);if(row.some(x=>x.trim()))rows.push([...row]);
 return rows;
}
function headerKey(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
const aliases={
 name:['nomedosite','nome','site','titulo','title'],
 url:['url','link','endereco','enderecodosite','website','siteurl'],
 description:['descricaofinalidade','descricao','finalidade','description','resumo'],
 createdAt:['datadecadastro','cadastro','data','createdat'],
 notes:['observacoes','observacao','notas','notes','comentarios'],
 category:['categoria','category','grupo'],
 tags:['etiquetas','tags','tag','palavraschave'],
 priority:['prioritario','prioridade','favoritoprioritario','destaque']
};
function parseImportedDate(value){
 const s=cleanText(value);if(!s)return new Date().toISOString();
 const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
 const iso=br?`${br[3]}-${br[2]}-${br[1]}T12:00:00`: /^\d{4}-\d{2}-\d{2}$/.test(s)?s+'T12:00:00':s;
 const d=new Date(iso);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
}
// Importação assistida: mostra prévia e não altera nada até a confirmação.
let csvPending=null;
function generatedName(url){
 const hostname=new URL(url).hostname.replace(/^www\./i,'');
 const first=hostname.split('.')[0];
 return first?first.charAt(0).toUpperCase()+first.slice(1):hostname;
}
function showCsvPreview(items,invalid,duplicates){
 csvPending={items,invalid,duplicates};
 $('previewSummary').textContent=`${items.length} novo(s) site(s) pronto(s) para importar. ${duplicates.length} URL(s) já cadastrada(s): ignorar ou atualizar, conforme a opção abaixo. ${invalid.length} linha(s) precisam de correção. Nenhum registro existente será excluído.`;
 $('previewIssues').replaceChildren();
 if(invalid.length){
  const title=el('p','preview-error','Linhas não importadas (corrija o endereço na planilha e tente novamente):');
  $('previewIssues').append(title);
  for(const x of invalid.slice(0,12))$('previewIssues').append(el('p','preview-error',`Linha ${x.line}: ${x.reason} — ${x.raw.slice(0,110)}`));
  if(invalid.length>12)$('previewIssues').append(el('p','',`E mais ${invalid.length-12} linha(s).`));
 }
 $('previewRows').replaceChildren();
 const display=[...items.map(x=>({...x,status:'Pronto'})),...invalid.map(x=>({line:x.line,name:'—',url:x.raw,status:x.reason})),...duplicates.map(x=>({line:x.line,name:x.name,url:x.url,status:'Já cadastrado — pode atualizar'}))].sort((a,b)=>a.line-b.line).slice(0,100);
 for(const x of display){const tr=el('tr');for(const value of [x.line,x.name,x.url,x.status])tr.append(el('td','',String(value)));$('previewRows').append(tr)}
 $('confirmCsv').disabled=items.length===0 && (duplicates.length===0 || !$('updateExisting').checked);
 $('csvPreview').classList.remove('hidden');
}
$('updateExisting').addEventListener('change',()=>{if(csvPending)$('confirmCsv').disabled=csvPending.items.length===0&&(!csvPending.duplicates.length||!$('updateExisting').checked)});
$('cancelCsv').addEventListener('click',()=>{$('csvPreview').classList.add('hidden');csvPending=null});
$('confirmCsv').addEventListener('click',()=>{
 try{
  if(!csvPending){alert('Selecione novamente a planilha para importar.');return}
  const {items,invalid,duplicates}=csvPending;
  const updates=$('updateExisting').checked;
  const next=favorites.map(f=>({...f,tags:[...f.tags]}));
  const keys=new Map(next.map((f,i)=>[urlKey(f.url),i]));
  let added=0,changed=0;
  for(const x of items){
   if(!x.favorite || !x.favorite.url)continue;
   const key=urlKey(x.favorite.url);
   if(keys.has(key))continue;
   keys.set(key,next.length);next.push(x.favorite);added++;
  }
  if(updates)for(const x of duplicates){
   const idx=keys.get(urlKey(x.url));
   if(idx===undefined || !x.favorite)continue;
   const f=next[idx],src=x.favorite,merged={...f,tags:[...f.tags]};
   for(const k of ['name','description','notes','category']){
    if(src[k] && !(k==='description'&&src[k]==='Importado de planilha'))merged[k]=src[k];
   }
   if(src.tags?.length)merged.tags=normalizeTags([...f.tags,...src.tags]);
   if(src.priority)merged.priority=true;
   if(JSON.stringify(f)!==JSON.stringify(merged)){next[idx]=merged;changed++}
  }
  if(!added&&!changed){
   alert(duplicates.length&&!updates
    ?'Nenhum site novo. Os endereços já existem. Marque "Atualizar registros existentes por URL" para atualizar os dados.'
    :'Nenhuma alteração encontrada na planilha.');
   return;
  }
  if(!confirm(`Deseja importar ${added} site(s) e atualizar ${changed} registro(s)?\\n\\nSerá criado um ponto de restauração.`))return;
  if(!commitWithUndo(next,'Importação de planilha'))return;
  const nextCategories=[...new Set([...categories,...next.map(f=>f.category).filter(Boolean)])];
  saveSettings(nextCategories);
  renderCategories();resetForm();render();
  $('csvPreview').classList.add('hidden');csvPending=null;
  alert(`Importação concluída!\\nNovos: ${added}\\nAtualizados: ${changed}\\nInválidos: ${invalid.length}`);
 }catch(error){
  console.error('Falha na confirmação da importação:',error);
  alert('Não foi possível confirmar a importação: '+(error?.message||String(error))+'\\nOs dados existentes foram preservados.');
 }
});
// B2.7-B: a confirmacao SQLite intercepta o clique ANTES dos handlers legados.
// A leitura/previa continuam iguais; nenhuma gravacao localStorage no modo SQLite.
document.addEventListener('click',async event=>{
 const button=event.target.closest('button');
 if(!button||button.id!=='confirmCsv'||!['localhost','127.0.0.1'].includes(location.hostname))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(!csvPending)return;
 if(!window.sqliteSpreadsheetBridge?.available()){alert('SQLite indisponivel. Importacao cancelada sem gravacao local.');return;}
 const {items,invalid,duplicates}=csvPending;
 const updates=$('updateExisting').checked;
 // Plano baseado na revisao carregada. O servidor recusa alteracoes concorrentes (409).
 const next=favorites.map(f=>({...f,tags:[...f.tags]}));
 const keys=new Map(next.map((f,i)=>[urlKey(f.url),i]));
 let added=0,changed=0;
 for(const x of items){
  if(!x.favorite?.url)continue;
  const key=urlKey(x.favorite.url);
  if(keys.has(key))continue;
  keys.set(key,next.length);next.push(x.favorite);added++;
 }
 if(updates)for(const x of duplicates){
  const idx=keys.get(urlKey(x.url));
  if(idx===undefined||!x.favorite)continue;
  const f=next[idx],src=x.favorite,merged={...f,tags:[...f.tags]};
  for(const k of ['name','description','notes','category']){
   if(src[k]&&!(k==='description'&&src[k]==='Importado de planilha'))merged[k]=src[k];
  }
  if(src.tags?.length)merged.tags=normalizeTags([...f.tags,...src.tags]);
  if(src.priority)merged.priority=true;
  if(JSON.stringify(f)!==JSON.stringify(merged)){next[idx]=merged;changed++}
 }
 if(!added&&!changed){
  alert(duplicates.length&&!updates
   ?'Nenhum site novo. Marque "Atualizar registros existentes por URL" para atualizar.'
   :'Nenhuma alteracao encontrada na planilha.');return;
 }
 if(!confirm(`Importar ${added} site(s) e atualizar ${changed} registro(s)?\n\nA operacao podera ser desfeita.`))return;
 const ok=await window.sqliteSpreadsheetBridge.commitPlan(next);
 if(!ok){csvPending=null;$('csvPreview').classList.add('hidden');return}
 resetForm();renderCategories();render();
 $('csvPreview').classList.add('hidden');csvPending=null;
 alert(`Importacao concluida!\nNovos: ${added}\nAtualizados: ${changed}\nInvalidos: ${invalid.length}`);
},true);
$('importCsvFile').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>10*1024*1024)throw Error('O arquivo ultrapassa 10 MB.');
  const rows=await spreadsheetRows(file);
  if(rows.length<2)throw Error('A planilha deve conter cabeçalho e ao menos uma linha.');
  const header=rows.shift().map(headerKey),index={};
  for(const [field,opts] of Object.entries(aliases))index[field]=header.findIndex(h=>opts.includes(h));
  if(index.url<0)throw Error('Não encontrei a coluna URL ou Link.');
  const get=(r,k)=>index[k]<0?'':cleanText(r[index[k]]||'');
  const existing=new Set(favorites.map(f=>urlKey(f.url))),seenInFile=new Set(),items=[],invalid=[],duplicates=[];
  for(let i=0;i<rows.length;i++){
   const r=rows[i],line=i+2,rawUrl=get(r,'url');
   if(!r.some(x=>cleanText(x)))continue;
   const url=normalizeUrl(rawUrl);
   if(!url){invalid.push({line,raw:rawUrl,reason:'URL ausente ou inválida'});continue}
   const name=get(r,'name')||generatedName(url),key=urlKey(url);
   if(seenInFile.has(key)){invalid.push({line,raw:rawUrl,reason:'URL repetida dentro da planilha'});continue}
   seenInFile.add(key);
   if(existing.has(key)){duplicates.push({line,name,url,favorite:{name,url,description:get(r,'description').slice(0,1000),notes:get(r,'notes').slice(0,3000),category:get(r,'category').slice(0,60),tags:normalizeTags(get(r,'tags')),priority:/^(sim|s|yes|true|1|★)$/i.test(get(r,'priority'))}});continue}
   const favorite={id:uid(),name:name.slice(0,120),url,
    description:get(r,'description').slice(0,1000)||'Importado de planilha',
    createdAt:parseImportedDate(get(r,'createdAt')),
    notes:get(r,'notes').slice(0,3000),category:get(r,'category').slice(0,60),
    tags:normalizeTags(get(r,'tags')).map(x=>x.slice(0,80)),
    priority:/^(sim|s|yes|true|1|★)$/i.test(get(r,'priority'))};
   items.push({line,name,url,favorite});
  }
  $('updateExisting').checked=false;showCsvPreview(items,invalid,duplicates);
 }catch(err){alert('Não foi possível importar o CSV: '+err.message)}
 finally{event.target.value=''}
});

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
