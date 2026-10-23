# Etapa 5D.3.2-B1 — Leitura automática isolada do SQLite

## Escopo
- GET `/api/state` automaticamente ao abrir a interface por localhost/127.0.0.1.
- Painel independente na área Importar / Exportar com tabela dos favoritos do SQLite.
- Diagnóstico 5D.3.2-A continua disponível e passa a aceitar qualquer porta local.
- Nenhum PUT; nenhuma modificação de localStorage, SQLite ou variáveis `favorites`, `categories`, `managedTags`.
- **Não é a migração da fonte principal.** Cadastro, Desfazer e demais operações ainda usam localStorage.

## Validação manual
1. Iniciar `venv` e o servidor com `--serve-ui` na porta livre.
2. Abrir a interface no Chrome e Firefox e ir a Importar / Exportar.
3. Conferir 86 favoritos, 10 categorias, 22 etiquetas e revisão 0 (se banco não tiver sido modificado).
4. Conferir que a lista é somente leitura e não altera os contadores do cadastro principal.
5. Desligar servidor e confirmar que não ocorre alteração local.

## Próxima fase
5D.3.2-B2: projetar gravações transacionais, Desfazer, conflito 409 e travamento seguro quando a API falhar. Não ativar antes dos testes.
