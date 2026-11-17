[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$sourcePath = Join-Path (Split-Path -Parent $PSScriptRoot) '.codex\AGENTS.md'

if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
    throw "Bronbestand niet gevonden: $sourcePath"
}

$codexHome = if (-not [string]::IsNullOrWhiteSpace($env:CODEX_HOME)) {
    $env:CODEX_HOME
}
else {
    Join-Path $HOME '.codex'
}

if (-not (Test-Path -LiteralPath $codexHome -PathType Container)) {
    New-Item -ItemType Directory -Path $codexHome -Force | Out-Null
}

$destinationPath = Join-Path $codexHome 'AGENTS.md'

if (Test-Path -LiteralPath $destinationPath -PathType Leaf) {
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = "$destinationPath.backup-$timestamp"
    Copy-Item -LiteralPath $destinationPath -Destination $backupPath
    Write-Host "Bestaand bestand veiliggesteld als: $backupPath"
}

Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force

Write-Host ''
Write-Host 'Globale Codex-instructies geïnstalleerd:'
Write-Host $destinationPath
Write-Host ''
Write-Host 'Sluit Codex volledig af en start een nieuwe sessie.'
