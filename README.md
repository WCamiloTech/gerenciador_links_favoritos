# Gerenciador de Favoritos — Etapa 1 da modularização

## Como executar
Abra `index.html` no Firefox, diretamente pela pasta do projeto. Não é necessário servidor.

## Escopo
Esta etapa separa **apenas** a estrutura HTML, o CSS e o JavaScript. `js/app-legacy.js` ainda contém toda a lógica antiga; a divisão em módulos independentes será feita progressivamente, depois da validação desta base. Nenhuma função foi reescrita.

## Preservação
- `backups/gerenciador_favoritos_v1_6_1_original.html`: cópia byte a byte da referência.
- `docs/manifest.json`: SHA-256 da referência e chaves de armazenamento.
- `tests/check_baseline.py`: valida equivalência de conteúdo, arquivos e chaves.
- Antes de testar com dados reais, exporte um backup JSON da versão anterior e guarde-o fora da pasta do projeto.

## Atenção ao localStorage
A abertura de um arquivo `file://` em outro caminho pode não compartilhar o mesmo armazenamento no Firefox. **Não interprete a ausência de favoritos como perda de dados.** Importe seu backup somente depois de conferir o perfil e a origem do arquivo.

## Versionamento Git (opcional)
No terminal, dentro da pasta do projeto:
```
git init
git add .
git commit -m "chore: baseline 1.6.1 e extracao HTML CSS JS"
git tag baseline-1.6.1
```
O Git não é iniciado automaticamente, pois isso alteraria o seu ambiente.

## Próximas etapas
1. Testar a base no Firefox com dados fictícios.
2. Mapear as dependências entre funções.
3. Extrair os módulos de exportação, importação, armazenamento e interface em pequenas mudanças verificáveis.
4. Criar testes automatizados de comportamento e um pacote de distribuição HTML único, se desejado.

## Evolucao funcional (Etapa 5B - aguardando validacao no Firefox)
- Cadastro e organizacao de favoritos com categorias e etiquetas; pesquisa, filtros, importacao CSV/XLSX e exportacao.
- Etiquetas em lote: marque varias caixas de selecao, acrescente tags novas separadas por virgula e aplique a todos os favoritos selecionados.
- Apos adicionar/remover etiquetas em lote, filtros e selecao dos favoritos sao preservados, inclusive quando alguns itens deixam de aparecer no filtro atual. Use **Limpar selecao** para encerrar.
- Acoes destrutivas e restauracao via Desfazer continuam limpando a selecao.
- Ideias e status: `docs/melhorias_sugeridas.md`. Historico: `docs/historico_implementacoes.md`.
- As funcionalidades 5B so devem ser marcadas como **Aplicadas** apos validacao funcional no Firefox.
