param(
  [switch]$Quiet
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

# --- Git: avoid "dubious ownership" in managed/sandboxed environments ---
$gitGlobalConfigPath = Join-Path $projectRoot ".gitconfig.local"
$env:GIT_CONFIG_GLOBAL = $gitGlobalConfigPath

& git config --file $gitGlobalConfigPath --add safe.directory $projectRoot 2>$null | Out-Null

# --- Docker: avoid reading a locked/denied user profile config.json ---
$dockerConfigDir = Join-Path $projectRoot ".docker"
New-Item -ItemType Directory -Force -Path $dockerConfigDir | Out-Null
$env:DOCKER_CONFIG = $dockerConfigDir

$dockerConfigJson = Join-Path $dockerConfigDir "config.json"
if (Test-Path $dockerConfigJson) {
  $bytes = [System.IO.File]::ReadAllBytes($dockerConfigJson)
  $hasUtf8Bom = ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
  if ($hasUtf8Bom) {
    [System.IO.File]::WriteAllText($dockerConfigJson, "{}", (New-Object System.Text.UTF8Encoding($false)))
  }
} else {
  [System.IO.File]::WriteAllText($dockerConfigJson, "{}", (New-Object System.Text.UTF8Encoding($false)))
}

# --- Tools: ensure WinGet shims (kind, etc.) are on PATH in this shell ---
$wingetLinks = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links"
if (Test-Path $wingetLinks) {
  if (($env:PATH -split ';') -notcontains $wingetLinks) {
    $env:PATH = "$wingetLinks;$env:PATH"
  }
}

if (-not $Quiet) {
  Write-Host "Dev env configured for this session:"
  Write-Host ("- GIT_CONFIG_GLOBAL = {0}" -f $env:GIT_CONFIG_GLOBAL)
  Write-Host ("- DOCKER_CONFIG     = {0}" -f $env:DOCKER_CONFIG)
  Write-Host ""
  Write-Host "Tips:"
  Write-Host "- If Docker still fails to connect, start Docker Desktop and ensure your user is in the 'docker-users' group."
}
