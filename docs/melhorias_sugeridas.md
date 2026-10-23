# Registro de melhorias sugeridas — Gerenciador de Links Favoritos

**Data de criação:** 2026-10-20  
**Última revisão:** 2026-10-22  
**Finalidade:** registrar propostas, etapas, validações e aplicações sem perder o histórico.  
**Regra:** marcar **Aplicada** somente após instalação e validação funcional.

## Resumo

- **Total de melhorias:** 12
- **Aplicadas:** 4
- **Sugeridas:** 5
- **Planejadas / Em desenvolvimento / Em validação:** 3

## Estados padronizados

- **Sugerida:** ideia registrada, sem escopo fechado.
- **Planejada:** aprovada para implementação futura.
- **Em desenvolvimento:** implementação iniciada.
- **Em validação:** instalada, aguardando confirmação funcional.
- **Aplicada:** instalada e validada.
- **Adiada:** implementação postergada, com justificativa.
- **Descartada:** não será implementada, com justificativa.

## Melhorias

### MEL-001

- **Data da sugestão:** 2026-10-20
- **Descrição:** Sugerir automaticamente nome, descrição, categoria e tags usando IA, com revisão e confirmação do usuário.
- **Status:** Sugerida
- **Etapa:** A definir
- **Data de aplicação:** —
- **Observações:** Preservar uso offline; definir provedor, privacidade, custos e opção sem IA.

### MEL-002

- **Data da sugestão:** 2026-10-20
- **Descrição:** Ampliar filtros e pesquisa: nome do site, descrição, categoria, tags e sites sem nome.
- **Status:** Sugerida
- **Etapa:** A definir
- **Data de aplicação:** —
- **Observações:** Conferir filtros existentes antes de acrescentar novos; combinar critérios e permitir limpar filtros.

### MEL-003

- **Data da sugestão:** 2026-10-20
- **Descrição:** Disponibilizar planilha-modelo CSV e/ou XLSX para cadastro/importação de favoritos.
- **Status:** Sugerida
- **Etapa:** A definir
- **Data de aplicação:** —
- **Observações:** Alinhar colunas e validações ao importador atual; incluir exemplo e instruções.

### MEL-004

- **Data da sugestão:** 2026-10-20
- **Descrição:** Permitir selecionar várias tags existentes e aplicar todas em lote aos favoritos selecionados.
- **Status:** Aplicada
- **Etapa:** 5B
- **Data de aplicação:** 2026-10-22
- **Observações:** Preservar tags anteriores, evitar duplicatas e permitir também novas tags separadas por vírgula. Validação confirmada pelo usuário após instalação da Etapa 5B.

### MEL-005

- **Data da sugestão:** 2026-10-20
- **Descrição:** Preservar filtros e seleção dos favoritos após adicionar tags em lote, permitindo novas operações sem refazer a seleção.
- **Status:** Aplicada
- **Etapa:** 5B
- **Data de aplicação:** 2026-10-22
- **Observações:** Avaliar casos em que os itens deixam de satisfazer o filtro após alteração. Validação confirmada pelo usuário após instalação da Etapa 5B.

### MEL-006

- **Data da sugestão:** 2026-10-20
- **Descrição:** Exibir categorias com cores suaves e translúcidas, mantendo legibilidade em temas claro e escuro.
- **Status:** Sugerida
- **Etapa:** A definir
- **Data de aplicação:** —
- **Observações:** Preferir cor como atributo opcional; definir paleta acessível.

### MEL-007

- **Data da sugestão:** 2026-10-20
- **Descrição:** Manter este registro de melhorias com data, descrição, status, etapa e data de aplicação.
- **Status:** Aplicada
- **Etapa:** 5B / Processo contínuo
- **Data de aplicação:** 2026-10-22
- **Observações:** Atualizar em toda implementação; só marcar aplicada após integrar ao projeto e validar. Validação confirmada pelo usuário após instalação da Etapa 5B.

### MEL-008

- **Data da sugestão:** 2026-10-20
- **Descrição:** Atualizar incrementalmente o README.md com cada funcionalidade efetivamente implementada.
- **Status:** Aplicada
- **Etapa:** 5B / Processo contínuo
- **Data de aplicação:** 2026-10-22
- **Observações:** Documentar uso, requisitos, alterações e limitações sem anunciar funções pendentes como disponíveis. Validação confirmada pelo usuário após instalação da Etapa 5B.

## Procedimento para próximas etapas

1. Registrar cada sugestão com ID único, data, descrição e situação.
2. Ao planejar, indicar a etapa; ao instalar, registrar a validação pendente.
3. Somente após confirmação funcional, marcar **Aplicada** e registrar a data.
4. Atualizar o resumo e o `README.md` em cada implementação.
5. Preservar `docs/historico_implementacoes.md` e `docs/auditoria_implementacoes.jsonl` como trilha de auditoria independente.

---

### MEL-009 — Captura de favoritos diretamente do navegador

- **Data da sugestão:** 22/10/2026
- **Descrição:** Salvar links diretamente do navegador por meio de botão ou ícone, sem copiar e colar manualmente a URL.
- **Contexto:** Links descobertos em publicações do Instagram e acessados posteriormente em páginas externas.
- **Solução inicial:** Bookmarklet que captura título e URL da página e abre o formulário do gerenciador.
- **Evoluções futuras:** Extensão para navegadores e compartilhamento pelo celular.
- **Requisitos:** Prevenir duplicidades, permitir categorias e etiquetas e preservar o funcionamento local.
- **Status:** Sugerida
- **Etapa:** A definir
- **Data de aplicação:** Não aplicada
- **Observações:** Avaliar compatibilidade com Firefox, páginas HTTPS e acesso ao aplicativo local.

### MEL-013 - Armazenamento centralizado SQLite

- **Data da sugestao:** 2026-10-22
- **Descricao:** Substituir gradualmente o localStorage como fonte principal por SQLite acessado via API local; compartilhar favoritos entre Chrome e Firefox.
- **Status:** Em desenvolvimento
- **Etapa:** 5D.3 / 5D.3.2
- **Data de aplicacao:** -
- **Observacoes:** Nao marcar como aplicada antes de validacao funcional no Windows.

### MEL-014 - Backups e recuperacao do SQLite

- **Data da sugestao:** 2026-10-22
- **Descricao:** Implementar backup consistente do banco SQLite, restauracao testada, controle de conflitos e verificacao de integridade.
- **Status:** Planejada
- **Etapa:** 5D.3.2 / 5D.3.3
- **Data de aplicacao:** -
- **Observacoes:** Nao marcar como aplicada antes de validacao funcional no Windows.

### MEL-015 - Regressao automatizada e testes entre navegadores

- **Data da sugestao:** 2026-10-22
- **Descricao:** Ampliar Playwright e testes API para CRUD, categorias, etiquetas, importacao, exportacao, persistencia e uso em Chrome e Firefox.
- **Status:** Em desenvolvimento
- **Etapa:** 5D.2 / 5D.3.2
- **Data de aplicacao:** -
- **Observacoes:** Nao marcar como aplicada antes de validacao funcional no Windows.

### Acompanhamento 5D.3.2-B2.2-DOC (2026-10-23T02:38:23-03:00)
- **Identificador:** 5D.3.2-B2.2-DOC-VALID-20261023
- **MEL-013:** Em desenvolvimento. CRUD e leitura compartilhada validados em banco de teste; Desfazer, categorias, etiquetas, importacoes e operacoes em lote ainda pendentes. Nao marcar como Aplicada.
- **MEL-014:** Planejada. Backup de teste via sqlite3.backup realizado; restauracao e recuperacao completas ainda nao validadas.
- **MEL-015:** Em desenvolvimento. CRUD e auditoria validados manualmente; HTTP 409 na interface e regressao completa pendentes.
- **Observacao:** A mensagem de URL duplicada nao demonstra por si so conflito de revisao.
