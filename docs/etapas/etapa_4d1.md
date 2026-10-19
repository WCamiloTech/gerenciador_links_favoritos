# Etapa 4D.1 — Backup, etiquetas e auditoria

- Situação inicial: preparada para instalação; validação no Firefox pendente.
- Motivo: distinguir backups feitos no mesmo dia, reutilizar etiquetas digitadas e manter trilha de auditoria.
- Mudanças: `js/backup.js`, `js/app-legacy.js`, `tests/check_stage4d1.py`.
- Backup JSON: `favoritos-backup-completo-AAAA-MM-DD_HH-MM-SS.json`, horário local.
- Etiquetas: após salvar favoritos, novas etiquetas são acrescentadas ao catálogo existente com comparação normalizada. Permanecem mesmo após exclusão de favoritos.
- Auditoria: o instalador registra início, backup, hashes, testes e resultado em `docs/auditoria_implementacoes.jsonl`; mantém histórico legível em `docs/historico_implementacoes.md`.
- Importante: testes estáticos não substituem validação funcional no Firefox.
- Histórico anterior: etapas 1 a 4D são anteriores ao início da auditoria automática; não serão inventados horários retroativos.
