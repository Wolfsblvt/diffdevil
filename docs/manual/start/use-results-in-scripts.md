# Use results in scripts

Save one complete report, then ask it for an exact value, a decision and a path list. Reusing that report keeps every question on the same captured comparison. It does not make a moving GitHub PR or worktree stay current.

Use the [local CLI setup](analyze-local-changes.md). The consumers call `diffdevil`
on PATH. Select your project's installed executable for this shell, without
changing machine-wide settings:

Bash:

```sh
export PATH="$PWD/node_modules/.bin:$PATH"
```

PowerShell:

```powershell
$env:Path = (Join-Path $PWD 'node_modules/.bin') + [System.IO.Path]::PathSeparator + $env:Path
```

## Capture once and query an exact value

From the project where you installed the package, use its supplied review patch:

```sh
diffdevil analyze --diff-file node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff --no-config --preset size@1 --format json --output report.json
diffdevil query --report report.json --metric changed --format value
```

The first command saves a canonical `diffdevil.report` artifact. The second prints **10** followed by a newline and exits 0. The [complete source patch](../../examples/diffs/review.diff) has 16 churn, four included files, and no hidden exclusions. A saved-report query retains its captured policy results unless you explicitly select a different policy.

Do not scrape the human presentation. Its job is reading; the report JSON and strict output formats are the machine interfaces. `query --format json` produces a query envelope, not another report. Query JSONL produces one plain JSON value per determined item; analysis JSONL is a different typed stream.

## Preserve the process result

| Exit | For a check | For a strict output consumer |
| --- | --- | --- |
| 0 | The condition is established as true | A representable result was produced |
| 1 | The condition is established as false | Not a fallback value |
| 2 | The operation is invalid or failed | Repair the source, expression, configuration or format |
| 3 | Evidence cannot establish the decision | The requested exact/complete representation was refused |

A successful JSON analysis can still contain uncertainty. Conversely, a valid check can return 1. Capture the exit immediately, before another native process overwrites it. Do not use `|| echo 0`, `try/catch` alone, or a pipeline whose status comes only from its final consumer.

## Complete Bash consumer

Save the complete [Bash consumer](../../examples/scripts/report-consumer.sh) below as `report-consumer.sh`. It checks each producer before using its output, retains false as exit 1, and reads arbitrary Git paths with NUL separation rather than splitting on spaces or newlines.

```bash
#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Requires diffdevil on PATH. Reads a saved report; never applies effects.
set -u
report=${1:-report.json}
limit=${2:-100}
if ! command -v diffdevil >/dev/null 2>&1; then
  printf '%s\n' 'diffdevil is not on PATH.' >&2; exit 2
fi
work=$(mktemp -d) || exit 2
trap 'rm -rf -- "$work"' EXIT

changed=$(diffdevil query --report "$report" --metric changed --format value)
code=$?
if (( code != 0 )); then exit "$code"; fi
printf 'Changed: %s\n' "$changed"

diffdevil check --report "$report" --metric changed --lt "$limit" --format json > "$work/check.json"
decision=$?
case "$decision" in
  0) printf '%s\n' "Changed is below $limit." ;;
  1) printf '%s\n' "Changed is not below $limit." ;;
  *) exit "$decision" ;;
esac

# Check the producer's exit before reading its NUL-delimited result.
diffdevil query --report "$report" --files --select path --format nul --output "$work/paths"
code=$?
if (( code != 0 )); then exit "$code"; fi
while IFS= read -r -d '' path; do
  printf 'Path: %q\n' "$path"
done < "$work/paths"
exit "$decision"
```

Run it against the captured report:

```sh
bash report-consumer.sh report.json 100
```

It prints Changed 10, a true below-100 decision, and all four included paths, then exits 0. With a limit of 10 it prints the false result, still handles the paths, and exits 1. Paths are shell-escaped for display with `printf %q`; the script never executes them.

The temporary file is important: process substitution around a producer can hide that producer's failure. This consumer verifies the strict path query before entering its loop. A valid empty collection produces no path rows; an incomplete collection refuses instead.

## Complete PowerShell consumer

Save the complete [PowerShell consumer](../../examples/scripts/report-consumer.ps1) below as `report-consumer.ps1`. It captures `$LASTEXITCODE` immediately and reads NUL-delimited UTF-8 from a temporary file instead of sending arbitrary paths through PowerShell's line-oriented native pipeline. The native application selection also avoids accidentally selecting an unrelated PowerShell function named `diffdevil`.

```powershell
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
```

Run it as a child process so its deliberate exit does not end your interactive shell:

```powershell
pwsh -NoProfile -NonInteractive -File ./report-consumer.ps1 -Report report.json -Limit 100
```

On Windows PowerShell 5.1, use `powershell` for that executable instead. The expected Changed, decision, paths and exit codes are the same; path display is JSON-escaped rather than Bash-escaped. Paths remain literal strings, including names that happen to look like timestamps. Nonzero native exits are interpreted explicitly, not mistaken for an exception or silently converted to success.

## When a strict result is unavailable

Run either consumer against the [bounded report](../../examples/reports/bounded.json). Its first scalar query exits 3 because Changed is `[60,70]`, not one exact number. That is the consumer's honest limit, even though a separate check can prove that every possible value is below 100.

Read [Evidence and uncertainty](../understand/evidence-and-uncertainty.md#try-a-decision-that-bounds-can-answer) before choosing a different representation. Canonical JSON preserves bounds. Stronger evidence may establish an exact value. `--certain` deliberately selects only definite observed members; it is not a hidden repair for a complete path list.

An invalid limit or corrupt report exits 2 rather than returning false. Inspect stderr for diagnostics. Machine output stays on stdout; `--output` validates before replacing the destination, so a refused result must not leave a new empty artifact pretending to be success.

Keep report files private when they contain private paths, repository identities, revisions or policy material. Redact deliberately before sharing, and do not use a copied report as write authority. Continue with [CLI](../use/cli.md), [Interfaces](../reference/README.md), or [Troubleshooting](../help/troubleshooting.md) for the exact selected operation.
