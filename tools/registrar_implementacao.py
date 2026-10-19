#!/usr/bin/env python3
"""Registra uma nova implementação sem reescrever a auditoria anterior.
Uso: python tools/registrar_implementacao.py registro.json
O JSON deve conter etapa, titulo, descricao e situacao.
"""
import datetime
import json
import pathlib
import sys

BASE = pathlib.Path(__file__).resolve().parents[1]
DOCS = BASE / "docs"
FIELDS = ("etapa", "titulo", "descricao", "situacao")


def registrar(registro):
    faltantes = [k for k in FIELDS if not str(registro.get(k, "")).strip()]
    if faltantes:
        raise ValueError("Campos obrigatorios ausentes: " + ", ".join(faltantes))
    if not DOCS.joinpath("historico_implementacoes.md").is_file():
        raise FileNotFoundError("Historico nao encontrado")
    if not DOCS.joinpath("auditoria_implementacoes.jsonl").is_file():
        raise FileNotFoundError("Auditoria nao encontrada")
    registro = dict(registro)
    registro.setdefault("data_hora", datetime.datetime.now().astimezone().isoformat(timespec="seconds"))
    def value(k):
        v = registro.get(k)
        if v is None or v == "":
            return "Não documentado"
        if isinstance(v, list):
            return ", ".join(str(x) for x in v) or "Não documentado"
        return str(v).replace("\r", " ").replace("\n", " ")
    model = DOCS.joinpath("modelo_registro_implementacao.md").read_text(encoding="utf-8")
    content = model.format(**{k: value(k) for k in (
        "etapa", "titulo", "data_hora", "descricao", "arquivos", "testes",
        "validacao", "situacao", "versao_anterior", "sha256", "origem")})
    with DOCS.joinpath("historico_implementacoes.md").open("a", encoding="utf-8", newline="\n") as f:
        f.write("\n" + content)
    event = {"etapa": registro["etapa"], "data_hora": registro["data_hora"],
             "situacao": registro["situacao"], "descricao": registro["descricao"],
             "origem": registro.get("origem", "registro padronizado"),
             "detalhes": {k: v for k, v in registro.items() if k not in
                          ("etapa", "data_hora", "situacao", "descricao", "origem")}}
    with DOCS.joinpath("auditoria_implementacoes.jsonl").open("a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python tools/registrar_implementacao.py registro.json")
    with open(sys.argv[1], encoding="utf-8") as f:
        registrar(json.load(f))
