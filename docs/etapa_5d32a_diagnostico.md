# Etapa 5D.3.2-A — Diagnostico de leitura SQLite

**Situacao:** pacote preparado; instalacao e validacao funcional no Windows pendentes.

## Instalacao

1. Encerre o servidor Python anterior (Ctrl+C).
2. Extraia o ZIP em Downloads, mantendo a pasta `patch` e `instalar_5D32A.ps1` juntas.
3. No PowerShell, execute `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\etapa_5D32A\instalar_5D32A.ps1"` (ajuste o caminho conforme a pasta extraida).
4. Inicie o servidor a partir da pasta do projeto:
   `python servidor/app.py --db "$env:USERPROFILE\Downloads\favoritos_piloto_5d3.db" --serve-ui`
5. Abra **http://127.0.0.1:8765/** no Chrome ou Firefox, entre em Importar / Exportar e clique em **Comparar navegador e SQLite**.

**Importante:** Chrome e Firefox possuem localStorage independente. O painel compara o armazenamento do navegador atual com o SQLite, sem sincronizar. Mesmo com a pagina servida pela API, a interface continua salvando no localStorage. Nao use a interface para gravar dados importantes durante este piloto. A etapa 5D.3.2-B tratara gravacao transacional, sincronizacao e conflitos.

## Arquivos modificados

- `index.html`: botao e painel de diagnostico.
- `js/sqlite-diagnostico.js`: GET /api/state, contadores e divergencias (somente leitura).
- `docs/melhorias_sugeridas.md`: correcao do resumo para 12 melhorias.
- `docs/historico_implementacoes.md` e `docs/auditoria_implementacoes.jsonl`: instalador acrescenta registros sem reescrever historico.

## Reversao

O instalador cria um ZIP de backup anterior em Downloads/gerenciador_links_favoritos_versoes. Para reverter, pare o servidor e restaure os arquivos a partir desse ZIP. Nenhum arquivo do SQLite e nenhum localStorage e alterado pela instalacao.
