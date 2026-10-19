# Etapa 4D.1 - Revisao 2

Status inicial: pendente de instalacao e validacao no Firefox.

## Motivos
- CSV exportado com data mas sem horario.
- Historico Markdown com separador de tabela malformado.
- Categorias nao visiveis na area de gerenciamento segundo teste do usuario.

## Alteracoes
- `exportTimestamp()` centraliza timestamp local para JSON e CSV.
- Tabela do historico corrigida, sem apagar eventos anteriores.
- Atualizacao da lista de categorias ao entrar na secao ou selecionar a aba Categorias.

## Validacao pendente
Verificar exportacao CSV/JSON, lista de categorias, criacao/renomeacao/exclusao, etiquetas e filtros.
