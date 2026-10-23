param([switch]$Instalar)
$ErrorActionPreference = 'Stop'
$Projeto = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $Projeto 'venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $Python)) { throw "venv nao encontrado: $Python" }
$Base = Join-Path $env:USERPROFILE 'Downloads\00_Arquivos_gerenciador_links_arquivos_19_10_2026'
New-Item -ItemType Directory -Path $Base -Force | Out-Null
$Stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
function Invoke-PythonLogged([string[]]$Arguments, [string]$Prefix) {
    $Out = Join-Path $Base "${Prefix}_${Stamp}_stdout.txt"
    $Err = Join-Path $Base "${Prefix}_${Stamp}_stderr.txt"
    $ArgsLine = ($Arguments | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"','\\"') + '"' } else { $_ } }) -join ' '
    $Process = Start-Process -FilePath $Python -ArgumentList $ArgsLine -WorkingDirectory $Projeto -Wait -PassThru -NoNewWindow -RedirectStandardOutput $Out -RedirectStandardError $Err
    if (Test-Path $Out) { Get-Content -LiteralPath $Out | ForEach-Object { Write-Host $_ } }
    if (Test-Path $Err) { Get-Content -LiteralPath $Err | ForEach-Object { Write-Host $_ } }
    Write-Host "Relatorios: $Out ; $Err"
    if ($Process.ExitCode -ne 0) { throw "Comando Python falhou (codigo $($Process.ExitCode)). Consulte os relatorios." }
}
if ($Instalar) {
    Invoke-PythonLogged @('-m','pip','install','playwright') 'B25A_pip'
    Invoke-PythonLogged @('-m','playwright','install','chromium','firefox') 'B25A_browsers'
}
Invoke-PythonLogged @('-m','unittest','discover','-s','tests/e2e','-p','test_sqlite_playwright.py','-v') 'relatorio_B25A'
Write-Host 'OK: suite Playwright aprovada.'
