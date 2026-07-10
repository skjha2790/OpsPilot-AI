@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
for %%I in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fI"

set "GIT_GLOBAL=%PROJECT_ROOT%\.gitconfig.local"
set "DOCKER_DIR=%PROJECT_ROOT%\.docker"

powershell -NoExit -NoProfile -ExecutionPolicy Bypass -Command ^
  "$wingetLinks = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links'; if (Test-Path $wingetLinks) { if (($env:PATH -split ';') -notcontains $wingetLinks) { $env:PATH = $wingetLinks + ';' + $env:PATH } };" ^
  "$projectRoot = '%PROJECT_ROOT%';" ^
  "$gitGlobal = '%GIT_GLOBAL%';" ^
  "$env:GIT_CONFIG_GLOBAL = $gitGlobal;" ^
  "git config --file $gitGlobal --add safe.directory $projectRoot 2>$null | Out-Null;" ^
  "$dockerDir = '%DOCKER_DIR%';" ^
  "New-Item -ItemType Directory -Force -Path $dockerDir | Out-Null;" ^
  "$env:DOCKER_CONFIG = $dockerDir;" ^
  "$cfg = Join-Path $dockerDir 'config.json';" ^
  "if (Test-Path $cfg) { $b = [System.IO.File]::ReadAllBytes($cfg); if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { [System.IO.File]::WriteAllText($cfg, '{}', (New-Object System.Text.UTF8Encoding($false))) } } else { [System.IO.File]::WriteAllText($cfg, '{}', (New-Object System.Text.UTF8Encoding($false))) };" ^
  "Write-Host 'Dev env configured for this shell.';"

endlocal
