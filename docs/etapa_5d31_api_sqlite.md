# Etapa 5D.3.1 — API local SQLite

**Situação:** implementação entregue; execução no Windows e integração com interface pendentes.

## Contrato da API
- `GET /api/health` → status do servidor, `ui_integrated=false`.
- `GET /api/state` → `favorites`, `categories`, `tags`, `settings`, `revision`.
- `PUT /api/state` → estado completo, com cabeçalho `If-Match: <revision>`; gravação transacional. Retorna `409` em conflito de versões, `400` em dados inválidos.
- Servidor restrito a `127.0.0.1`, porta padrão 8765. Não há exposição à rede.
- Sem dependências Python externas para API. O aplicativo HTML/JS **não está integrado** ao banco nesta etapa.
- A API usa gravação de snapshot completo como contrato transitório para facilitar a futura camada de persistência; **não** substitui as operações existentes no front-end nesta etapa.
- Segurança: isolamento local e validação de Host/Origin; não usar em redes compartilhadas nem expor por proxy.

## Execução
1. Instale o pacote com `instalar_5d31.ps1` (backup automático, sem alterar arquivos atuais).
2. Use o banco **piloto** de Downloads para testes:
   `python servidor/app.py --db "$env:USERPROFILE\Downloads\favoritos_piloto_5d3.db"`.
3. Em outro terminal: `Invoke-RestMethod http://127.0.0.1:8765/api/health`.
4. Testes: `python -m unittest discover -s tests -p test_api_sqlite_5d31.py -v`.
5. Pare o servidor com Ctrl+C.

**Não usar `--serve-ui` para validar sincronização:** essa opção só serve os arquivos estáticos; a interface continua usando localStorage.

## Etapas seguintes
- Definir integração gradual do módulo de persistência com `GET/PUT /api/state`, gestão de revisão e falhas.
- Criar backup transacional e política de restauração do banco definitivo antes da ativação.
- Testes de regressão Chrome/Firefox, concorrência e persistência.
