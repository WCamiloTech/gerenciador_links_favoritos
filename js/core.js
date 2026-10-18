'use strict';
// Funções de base extraídas sem alteração de lógica.
const STORAGE_KEY='gerenciador_favoritos_v1';
const SETTINGS_KEY='gerenciador_favoritos_config_v1_1';
const $=id=>document.getElementById(id);
const uid=()=>typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const cleanText=s=>String(s||'').trim();
const normalizeTags=value=>[...new Set((Array.isArray(value)?value:cleanText(value).split(',')).map(v=>cleanText(v)).filter(Boolean))].slice(0,25);
function normalizeUrl(value){let raw=cleanText(value);const candidate=/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw)?raw:'https://'+raw;try{const u=new URL(candidate);if(!['http:','https:'].includes(u.protocol)||!u.hostname||!u.hostname.includes('.')||u.username||u.password)return null;return u.href}catch{return null}}
// A chave de comparação ignora www, barra final e fragmento; mantém query strings relevantes.
function urlKey(url){try{const u=new URL(url);const host=u.hostname.toLowerCase().replace(/^www\./,'');const path=u.pathname.replace(/\/+$/,'')||'/';const params=[...u.searchParams.entries()].filter(([k])=>!/^utm_|^(fbclid|gclid|msclkid|igshid|mc_cid|mc_eid)$/i.test(k)).sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));return host+path+(params.length?'?'+new URLSearchParams(params).toString():'')}catch{return cleanText(url).toLowerCase()}}
function validFavorite(f){return f&&typeof f==='object'&&typeof f.id==='string'&&typeof f.name==='string'&&typeof f.url==='string'&&typeof f.description==='string'&&typeof f.createdAt==='string'&&(f.notes===undefined||typeof f.notes==='string')}
function upgrade(f){return {...f,notes:f.notes||'',category:typeof f.category==='string'?f.category:'',tags:normalizeTags(f.tags),priority:f.priority===true}}
function readJSON(key,fallback){try{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value)}catch{return fallback}}
