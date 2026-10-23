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

## Evolucao funcional (Etapa 5B - validada no Firefox)
- Cadastro e organizacao de favoritos com categorias e etiquetas; pesquisa, filtros, importacao CSV/XLSX e exportacao.
- Etiquetas em lote: marque varias caixas de selecao, acrescente tags novas separadas por virgula e aplique a todos os favoritos selecionados.
- Apos adicionar/remover etiquetas em lote, filtros e selecao dos favoritos sao preservados, inclusive quando alguns itens deixam de aparecer no filtro atual. Use **Limpar selecao** para encerrar.
- Acoes destrutivas e restauracao via Desfazer continuam limpando a selecao.
- Ideias e status: `docs/melhorias_sugeridas.md`. Historico: `docs/historico_implementacoes.md`.
- As funcionalidades 5B so devem ser marcadas como **Aplicadas** apos validacao funcional no Firefox.

## Registro de melhorias

Consulte `docs/melhorias_sugeridas.md` para propostas, prioridades, etapas e status. Na revisao documental pos-5B, MEL-004, MEL-005, MEL-007 e MEL-008 foram marcadas como aplicadas apos confirmacao funcional em 2026-10-22.

## Etapa 5C — Modularização do Desfazer

- `js/desfazer.js` concentra o ponto de restauração único, `commitWithUndo`, `restoreUndo` e a associação ao botão Desfazer.
- A chave `gerenciador_favoritos_undo_v1_4` foi preservada, sem migração do armazenamento.
- O script é carregado após `app-legacy.js` e antes dos módulos consumidores.
- A etapa não altera o comportamento funcional; a validação no Firefox deve ser confirmada após a instalação.

### Revisão 5C.1 — Compatibilidade do teste baseline

- O teste `tests/check_baseline.py` agora verifica a integridade SHA-256 do snapshot histórico, a preservação de todos os IDs da interface e a existência/ordem dos scripts modulares.
- A equivalência textual entre o JavaScript monolítico e o aplicativo modular foi retirada por não ser aplicável após a extração de módulos.
- A revisão não altera a lógica de Desfazer; os testes funcionais no Firefox continuam necessários.

### Etapa 5C.1 — Desfazer na edição individual

- Ao salvar alterações em um favorito existente (nome, URL, descrição, observações, categoria, etiquetas ou prioridade), o formulário utiliza `commitWithUndo` e habilita Desfazer.
- Salvar sem alterações não substitui o ponto de restauração anterior.
- Inclusão de novos favoritos e demais operações não foram alteradas nesta revisão.
- Validação funcional no Firefox pendente.


## Etapa 5D — Modularização das operações em lote

- `js/operacoes-lote.js` contém seleção visível, limpeza da seleção, `bulkChange` e eventos de categoria, etiquetas, prioridade e exclusão em lote.
- A lógica foi movida sem mudanças funcionais; `js/desfazer.js` continua responsável pelo ponto de restauração.
- Ordem: `app-legacy.js`, `desfazer.js`, `operacoes-lote.js`, `favoritos.js`.
- Testes antigos 5B e 5C foram atualizados **somente** para apontar para a nova localização do código.
- Validação no Firefox pendente após instalação.
- Regra anticiclos: uma etapa, uma responsabilidade; registrar pendências separadamente sem ampliar o escopo.
