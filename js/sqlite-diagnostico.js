"use strict";
// 5D.3.2-A: diagnostico SOMENTE LEITURA. Nenhuma alteracao no localStorage ou SQLite.
(function () {
  const button = document.getElementById('sqliteCompareBtn');
  const result = document.getElementById('sqliteCompareResult');
  if (!button || !result) return;
  button.addEventListener('click', async function () {
    button.disabled = true;
    result.textContent = 'Consultando SQLite...';
    try {
      // Mesma origem evita CORS e garante que a interface foi aberta pelo servidor local.
      if (!['127.0.0.1', 'localhost'].includes(location.hostname)) {
        throw new Error('Abra o aplicativo pelo servidor local (127.0.0.1 ou localhost).');
      }
      const response = await fetch('/api/state', {method:'GET', cache:'no-store'});
      if (!response.ok) throw new Error('API retornou HTTP ' + response.status);
      const state = await response.json();
      if (!Array.isArray(state.favorites) || !Array.isArray(state.categories) || !Array.isArray(state.tags)) {
        throw new Error('Resposta da API invalida.');
      }
      const localFavs = Array.isArray(readJSON(STORAGE_KEY, [])) ? readJSON(STORAGE_KEY, []) : [];
      const localConfig = readJSON(SETTINGS_KEY, {});
      const localCats = Array.isArray(localConfig.categories) ? localConfig.categories : [];
      const localTags = Array.isArray(readJSON(TAGS_KEY, [])) ? readJSON(TAGS_KEY, []) : [];
      const localIds = new Set(localFavs.map(f => f.id));
      const remoteIds = new Set(state.favorites.map(f => f.id));
      const onlyLocal = [...localIds].filter(id => !remoteIds.has(id)).length;
      const onlySqlite = [...remoteIds].filter(id => !localIds.has(id)).length;
      const different = state.favorites.filter(f => {
        const local = localFavs.find(x => x.id === f.id);
        return local && JSON.stringify(upgrade(local)) !== JSON.stringify(upgrade(f));
      }).length;
      result.textContent = [
        'DIAGNOSTICO SOMENTE LEITURA',
        'Navegador: ' + localFavs.length + ' favoritos, ' + localCats.length + ' categorias, ' + localTags.length + ' etiquetas',
        'SQLite: ' + state.favorites.length + ' favoritos, ' + state.categories.length + ' categorias, ' + state.tags.length + ' etiquetas',
        'Revisao SQLite: ' + state.revision,
        'IDs somente no navegador: ' + onlyLocal,
        'IDs somente no SQLite: ' + onlySqlite,
        'Favoritos com campos diferentes (mesmo ID): ' + different,
        'Nenhum dado foi alterado.',
        'ATENCAO: comparacao entre navegadores deve ser feita separadamente em cada um.'
      ].join('\n');
    } catch (error) {
      result.textContent = 'Nao foi possivel consultar SQLite: ' + error.message + '\nNenhum dado foi alterado.';
    } finally { button.disabled = false; }
  });
})();
