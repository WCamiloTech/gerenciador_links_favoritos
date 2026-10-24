# Checklist de conclusao - Gerenciador de Links Favoritos
Data de referencia: 2026-10-23
Legenda: [x] confirmado pelo usuario; [ ] pendente; [~] parcialmente implementado.
Esta lista e um roteiro de trabalho, nao prova de testes executados.

## Funcionalidades ja validadas
- [x] SQLite/API local: leitura compartilhada Firefox/Chrome.
- [x] Cadastro, edicao e exclusao de favoritos com persistencia.
- [x] Controle de concorrencia HTTP 409 e aviso no Chrome; alteracao do Firefox preservada.
- [x] Criar, renomear e excluir categorias pela interface, nos dois navegadores (B2.4-B A2).
- [x] Backup manual do banco antes do cadastro de links (confirmado pelo usuario).

## Pendencias obrigatorias para uso completo
- [x] B2.4-C: integrar CRUD de etiquetas ao SQLite, incluindo associacoes, renomeacao e exclusao sem apagar favoritos.
- [x] Integrar edicao em lote, aplicacao de etiquetas e categorias, mantendo selecao/filtros.
- [x] Integrar Desfazer (undo) ao SQLite com transacoes e auditoria.
- [ ] Reabilitar e testar importacao JSON, CSV e XLSX, inclusive atualizacao por planilha e bloqueio de duplicados.
- [x] B2.7-A — JSON validado: mesclar, restaurar, duplicados, F5, Chrome/Firefox; 11/11 Playwright. CSV/XLSX continuam pendentes.
- [ ] Reabilitar e testar exportacao JSON/CSV e backup completo, com datas e restauracao.
- [ ] Criar backup automatico consistente do SQLite e restauracao testada (MEL-014).
- [ ] Preparar banco de producao: migracao sem perdas do banco atualmente denominado 'teste', backups e configuracao de inicializacao.
- [~] Ampliar testes automatizados ja existentes: API, Playwright Firefox/Chromium, persistencia, conflitos e regressao (MEL-015). (B2.6: 8/8 aprovados; ampliacao futura pendente.)
- [ ] Conferir todas as funcoes do modo tabela/cards, pesquisa, filtros, estatisticas, historico e modo escuro; reabilitar as que estiverem bloqueadas.
- [ ] Auditar todas as operacoes SQLite (incluindo categorias, etiquetas, importacoes e desfazer), sem eventos indevidos.
- [ ] Atualizar textos de interface e README que ainda mencionem localStorage como fonte principal.
- [ ] Revisar seguranca do servidor local, integridade, tratamento de erros e inicializacao simplificada.
- [ ] Consolidar documentacao e auditoria das etapas B2.3 e B2.4-B A2, inclusive falhas WinError 32 e codificacao PowerShell.
- [ ] Testes finais de regressao e restauracao, validacao do banco definitivo e entrega estavel.

## Melhorias solicitadas (nao bloqueiam uso basico)
- [ ] MEL-016: abrir em lote favoritos selecionados; confirmacao da quantidade, limite configuravel, respeito ao bloqueio de pop-ups.
- [ ] MEL-017: verificar links quebrados, distinguindo erros HTTP, timeout, redirecionamentos e bloqueios anti-bot; revisao manual antes de excluir.
- [ ] MEL-009: captura de favoritos diretamente do navegador.
- [ ] MEL-001 a MEL-006: reavaliar melhorias anteriores conforme arquivo de melhorias, sem duplicar funcionalidades ja existentes.

## Criterio de conclusao de cada etapa
- [ ] Mudanca baseada na versao instalada; sem regressao.
- [ ] Testes automaticos aprovados e recursos SQLite fechados.
- [ ] Backup previo e SHA-256.
- [ ] Instalacao concluida e validacao funcional suficiente.
- [ ] Historico, auditoria JSONL, melhorias e README atualizados.
