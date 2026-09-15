# Uses the proposed diffdevil CLI; it does not install or execute a parser from this package.
param([string]$Report = 'report.json')
Set-StrictMode -Version Latest
$value = & diffdevil query --report $Report --metric changed --format value
$code = $LASTEXITCODE
if ($code -ne 0) { throw "diffdevil did not return an exact scalar (exit $code)." }
$changed = [long]$value
Write-Output $changed
