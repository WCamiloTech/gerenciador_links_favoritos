# Etapa 5D.1 — Testes funcionais automatizados (piloto)

**Escopo:** infraestrutura de teste, sem alteração em HTML/CSS/JS do aplicativo.

Execute no PowerShell, dentro da pasta do projeto:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\testar_aplicativo.ps1 -InstalarDependencias
```

Nas próximas execuções, omita `-InstalarDependencias`.

Os testes usam um **contexto temporário e isolado** do Firefox do Playwright.
Não acessam o perfil pessoal nem o localStorage do Firefox usado diariamente.
Os testes cobrem inicialização, cadastro, persistência, edição/Desfazer,
duplicidade, busca e alteração de categoria em lote/Desfazer.

**Limitações:** testes de categorias, etiquetas, importações, exportações,
tema, filtros combinados e acessibilidade ainda precisam ser implementados.
O navegador do Playwright deve ser instalado na primeira execução (internet).
O relatório de texto é salvo em Downloads. Falhas podem revelar defeitos
no aplicativo ou suposições incorretas do teste: investigar antes de corrigir.

**Critério de aceite:** instalação e seis testes executados no Windows,
com confirmação do usuário. Não considerar validado apenas pelo teste estático.
