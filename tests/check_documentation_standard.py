import pathlib, re, json
root = pathlib.Path(__file__).resolve().parents[1]
h = (root/'docs/historico_implementacoes.md').read_text(encoding='utf-8')
a = (root/'docs/auditoria_implementacoes.jsonl').read_text(encoding='utf-8-sig')
assert '## Etapa 4D.1 - Revisao 4.2' in h
assert '## Validações funcionais confirmadas posteriormente' in h
assert '- **Descrição:**' in h
assert '- **Testes automatizados:**' in h
assert (root/'docs/modelo_registro_implementacao.md').is_file()
assert (root/'tools/registrar_implementacao.py').is_file()
for line in a.splitlines():
    if line.strip(): json.loads(line)
print('OK: documentacao padronizada, auditoria JSONL valida')
