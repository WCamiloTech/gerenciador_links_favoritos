# Registro de melhorias sugeridas — Gerenciador de Links Favoritos

**Data de criação:** 2026-10-20  
**Finalidade:** preservar propostas e acompanhar sua implementação.  
**Regra:** não marcar como aplicada sem instalação e validação funcional confirmadas. Não substituir o histórico de implementações nem a auditoria JSONL.

## Estados padronizados

- **Sugerida:** ideia registrada, ainda sem escopo fechado.
- **Planejada:** aprovada para etapa futura.
- **Em desenvolvimento:** implementação iniciada.
- **Em validação:** instalada, aguardando testes funcionais.
- **Aplicada:** instalada e validada.
- **Adiada:** decisão de postergar.
- **Descartada:** não será implementada; registrar motivo.

## Melhorias

| ID | Data | Descrição | Status | Etapa prevista | Data de aplicação | Observações |
|---|---|---|---|---|---|---|
| MEL-001 | 2026-10-20 | Sugerir automaticamente nome, descrição, categoria e tags usando IA, com revisão e confirmação do usuário. | Sugerida | A definir | — | Preservar uso offline; definir provedor, privacidade, custos e opção sem IA. |
| MEL-002 | 2026-10-20 | Ampliar filtros e pesquisa: nome do site, descrição, categoria, tags e sites sem nome. | Sugerida | A definir | — | Conferir filtros existentes antes de acrescentar novos; combinar critérios e permitir limpar filtros. |
| MEL-003 | 2026-10-20 | Disponibilizar planilha-modelo CSV e/ou XLSX para cadastro/importação de favoritos. | Sugerida | A definir | — | Alinhar colunas e validações ao importador atual; incluir exemplo e instruções. |
| MEL-004 | 2026-10-20 | Permitir selecionar várias tags existentes e aplicar todas em lote aos favoritos selecionados. | Em validação | 5B | — | Preservar tags anteriores, evitar duplicatas e permitir também novas tags separadas por vírgula. |
| MEL-005 | 2026-10-20 | Preservar filtros e seleção dos favoritos após adicionar tags em lote, permitindo novas operações sem refazer a seleção. | Em validação | 5B | — | Avaliar casos em que os itens deixam de satisfazer o filtro após alteração. |
| MEL-006 | 2026-10-20 | Exibir categorias com cores suaves e translúcidas, mantendo legibilidade em temas claro e escuro. | Sugerida | A definir | — | Preferir cor como atributo opcional; definir paleta acessível. |
| MEL-007 | 2026-10-20 | Manter este registro de melhorias com data, descrição, status, etapa e data de aplicação. | Em validação | 5B / Processo contínuo | — | Atualizar em toda implementação; só marcar aplicada após integrar ao projeto e validar. |
| MEL-008 | 2026-10-20 | Atualizar incrementalmente o README.md com cada funcionalidade efetivamente implementada. | Em validação | 5B / Processo contínuo | — | Documentar uso, requisitos, alterações e limitações sem anunciar funções pendentes como disponíveis. |

## Procedimento para próximas etapas

1. Registrar novas propostas aqui antes de implementá-las, com ID e data.
2. Ao aprovar escopo, alterar o status para **Planejada** e indicar a etapa.
3. Na instalação, registrar versão, arquivos e testes no histórico/auditoria; atualizar o status para **Em validação**.
4. Após confirmação funcional, marcar **Aplicada**, preencher a data e apontar o registro de implementação.
5. Atualizar `README.md` somente para funcionalidades já disponíveis e manter o modelo de documentação padronizado.

> Este arquivo foi preparado para inclusão no projeto; sua criação aqui não significa que já tenha sido instalado no computador do usuário.
