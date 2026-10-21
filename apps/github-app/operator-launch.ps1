# SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
# PowerShell 7 entry: establish the runtime environment before starting Node.
# Leave helper flags opaque: PowerShell parameter abbreviation can consume --help.
$Helper = if ($args.Count) { $args[0] } else { '' }
$HelperArguments = @($args | Select-Object -Skip 1)
if ($Helper -cnotin @('operator', 'manifest')) {
    [Console]::Error.WriteLine('Select operator or manifest.')
    exit 2
}
$ErrorActionPreference = 'Stop'
try {
    $nodePath = (Get-Command node -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $start = [System.Diagnostics.ProcessStartInfo]::new($nodePath)
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    # PowerShell's redirected handles are not inherited reliably by Process.Start.
    # Pipe only redirected streams; an explicitly interactive console keeps its TTY.
    $start.RedirectStandardInput = [Console]::IsInputRedirected
    $start.RedirectStandardOutput = [Console]::IsOutputRedirected
    $start.RedirectStandardError = [Console]::IsErrorRedirected
    $start.WorkingDirectory = $PSScriptRoot
    $start.Environment.Clear()
    foreach ($name in @('PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'TMPDIR', 'HOME', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME', 'WRANGLER_HOME')) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($null -ne $value) { $start.Environment[$name] = $value }
    }
    $apiToken = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN')
    if ($apiToken) { $start.Environment['CLOUDFLARE_API_TOKEN'] = $apiToken }
    else {
        foreach ($name in @('CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL')) {
            $value = [Environment]::GetEnvironmentVariable($name)
            if ($null -ne $value) { $start.Environment[$name] = $value }
        }
    }
    # Resolve relative input/output paths against the caller, as the Node entry did.
    $start.WorkingDirectory = (Get-Location).ProviderPath
    $start.ArgumentList.Add((Join-Path $PSScriptRoot "$Helper-helper.mjs"))
    $forwarded = @($HelperArguments)
    $selectedNames = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    for ($index = 0; $index -lt $forwarded.Count; $index++) {
        $slot = switch ($forwarded[$index]) {
            '--seal-key-env' { 'DIFFDEVIL_OPERATOR_SEAL_INPUT' }
            '--wirt-signing-key-env' { 'DIFFDEVIL_OPERATOR_WIRT_INPUT' }
            default { $null }
        }
        if ($slot) {
            $index++
            if ($index -ge $forwarded.Count -or $forwarded[$index] -cnotmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw 'Invalid named input.' }
            $sourceName = $forwarded[$index]
            if (-not $selectedNames.Add($sourceName)) { throw 'Duplicate named input.' }
            $value = [Environment]::GetEnvironmentVariable($sourceName)
            if ($null -ne $value) { $start.Environment[$slot] = $value }
            $forwarded[$index] = $slot
        }
    }
    foreach ($argument in $forwarded) { $start.ArgumentList.Add($argument) }
    $child = [System.Diagnostics.Process]::Start($start)
    try {
        $outputCopies = @()
        if ($start.RedirectStandardOutput) { $outputCopies += $child.StandardOutput.BaseStream.CopyToAsync([Console]::OpenStandardOutput()) }
        if ($start.RedirectStandardError) { $outputCopies += $child.StandardError.BaseStream.CopyToAsync([Console]::OpenStandardError()) }
        $inputCopy = if ($start.RedirectStandardInput) { [Console]::OpenStandardInput().CopyToAsync($child.StandardInput.BaseStream) } else { $null }
        while (-not $child.WaitForExit(50)) {
            if ($null -ne $inputCopy -and $inputCopy.IsCompleted) {
                $child.StandardInput.Close()
                $inputCopy = $null
            }
        }
        foreach ($copy in $outputCopies) { [void] $copy.GetAwaiter().GetResult() }
        $result = $child.ExitCode
    }
    finally {
        if (-not $child.HasExited) { $child.Kill($true); $child.WaitForExit() }
        $child.Dispose()
    }
    exit $result
} catch {
    # Do not print raw launch exceptions or environment/input values.
    [Console]::Error.WriteLine('Clean operator launch failed before completion; retain any existing receipt and reconcile it before retrying installation.')
    exit 2
}
