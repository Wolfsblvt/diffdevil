# SPDX-License-Identifier: MIT
# Requires diffdevil on PATH. Reads a saved report; never applies effects.
param([string]$Report = 'report.json', [string]$Limit = '100')
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# Native nonzero exits are data here, including false (1) and unresolved (3).
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$previousEncoding = [Console]::OutputEncoding
$pathsFile = $null
try {
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $cli = (Get-Command diffdevil -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $changed = & $cli query --report $Report --metric changed --format value
    $code = $LASTEXITCODE
    if ($code -ne 0) { exit $code }
    Write-Output "Changed: $changed"

    $checkJson = & $cli check --report $Report --metric changed --lt $Limit --format json
    $decision = $LASTEXITCODE
    switch ($decision) {
        0 { Write-Output "Changed is below $Limit." }
        1 { Write-Output "Changed is not below $Limit." }
        default { exit $decision }
    }

    # Keep NUL and UTF-8 bytes out of PowerShell's native line-oriented pipeline.
    $pathsFile = [System.IO.Path]::GetTempFileName()
    & $cli query --report $Report --files --select path --format nul --output $pathsFile
    $code = $LASTEXITCODE
    if ($code -ne 0) { exit $code }
    $utf8 = [System.Text.UTF8Encoding]::new($false, $true)
    $paths = [System.IO.File]::ReadAllText($pathsFile, $utf8)
    foreach ($path in $paths.Split([char]0)) {
        if ($path.Length -gt 0) {
            Write-Output ('Path: ' + (ConvertTo-Json -InputObject $path -Compress))
        }
    }
    exit $decision
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 2
} finally {
    [Console]::OutputEncoding = $previousEncoding
    if ($null -ne $pathsFile) { [System.IO.File]::Delete($pathsFile) }
}
