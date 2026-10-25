'use strict';
// Etapa 5D.3.2-B1: leitura automatica em painel isolado. Nunca altera estado da aplicacao.
(function () {
  const status = document.getElementById('sqliteReadStatus');
  const list = document.getElementById('sqliteReadList');
  if (!status || !list) return;
  if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
    status.textContent = 'Abra pelo servidor local para consultar o SQLite.';
    return;
  }
  async function load() {
    status.textContent = 'Carregando dados do SQLite...';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let response;
      try { response = await fetch('/api/state', { cache: 'no-store', signal: controller.signal }); }
      finally { clearTimeout(timer); }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const state = await response.json();
      if (!Array.isArray(state.favorites) || !Array.isArray(state.categories) || !Array.isArray(state.tags) || !Number.isInteger(state.revision)) {
        throw new Error('Formato de resposta inesperado');
      }
      list.replaceChildren();
      const table = document.createElement('table');
      const head = document.createElement('thead');
      const row = document.createElement('tr');
      for (const label of ['Nome', 'URL', 'Categoria', 'Etiquetas']) {
        const th = document.createElement('th'); th.textContent = label; row.append(th);
      }
      head.append(row); table.append(head);
      const body = document.createElement('tbody');
      for (const fav of state.favorites) {
        const tr = document.createElement('tr');
        for (const value of [fav.name, fav.url, fav.category, Array.isArray(fav.tags) ? fav.tags.join(', ') : '']) {
          const td = document.createElement('td'); td.textContent = String(value ?? ''); tr.append(td);
        }
        body.append(tr);
      }
      table.append(body); list.append(table);
      status.textContent = `${state.favorites.length} favoritos, ${state.categories.length} categorias, ${state.tags.length} etiquetas. Revisao ${state.revision}. Painel de consulta SQLite. No modo servidor, o SQLite e a fonte principal dos favoritos.`;
    } catch (error) {
      list.replaceChildren();
      status.textContent = 'Falha na leitura SQLite (' + error.message + '). Nenhum dado foi alterado.';
    }
  }
  load();
})();
