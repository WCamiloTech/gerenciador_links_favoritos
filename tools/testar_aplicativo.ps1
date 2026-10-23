param([switch]$InstalarDependencias)
$ErrorActionPreference = 'Stop'
$projeto = Split-Path -Parent $PSScriptRoot
$venv = Join-Path $projeto '.venv-testes'
$python = Join-Path $venv 'Scripts\python.exe'
$requisitos = Join-Path $projeto 'requirements.txt'

if (-not (Test-Path -LiteralPath $python)) {
    $pythonSistema = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonSistema) { throw 'Python nao encontrado. Ative seu venv ou configure o comando python.' }
    & $pythonSistema.Source -m venv $venv
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar ambiente virtual exclusivo dos testes.' }
}
if (-not (Test-Path -LiteralPath $requisitos)) { throw 'requirements.txt nao encontrado na raiz do projeto.' }

$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$logs = Join-Path $env:USERPROFILE "Downloads\favoritos_testes_$stamp"
New-Item -ItemType Directory -Path $logs -Force | Out-Null

function Executar-Python([string[]]$Argumentos, [string]$Rotulo) {
    $stdout = Join-Path $logs "$Rotulo.stdout.txt"
    $stderr = Join-Path $logs "$Rotulo.stderr.txt"
    $processo = Start-Process -FilePath $python -ArgumentList $Argumentos -WorkingDirectory $projeto -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    if (Test-Path $stdout) { Get-Content -LiteralPath $stdout | ForEach-Object { Write-Host $_ } }
    if (Test-Path $stderr) { Get-Content -LiteralPath $stderr | ForEach-Object { Write-Host $_ } }
    if ($processo.ExitCode -ne 0) { throw "$Rotulo falhou (codigo $($processo.ExitCode)). Relatorios: $logs" }
}

if ($InstalarDependencias) {
    Executar-Python -Argumentos @('-m', 'pip', 'install', '-r', 'requirements.txt') -Rotulo 'instalacao_dependencias'
    Executar-Python -Argumentos @('-m', 'playwright', 'install', 'firefox') -Rotulo 'instalacao_firefox'
}

Executar-Python -Argumentos @('-m', 'unittest', 'discover', '-s', 'tests/e2e', '-p', 'test_*.py', '-v') -Rotulo 'testes'
Write-Host "OK: Testes funcionais aprovados. Relatorios: $logs"
