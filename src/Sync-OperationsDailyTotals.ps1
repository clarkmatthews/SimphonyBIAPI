#Requires -Version 5.1
<#
.SYNOPSIS
    Authenticate to Oracle Simphony BI and upsert operations daily totals into Postgres.

.PARAMETER DryRun
    Load .env, check prerequisites, and generate a PKCE pair. Does not call Oracle or write rows.
#>
[CmdletBinding()]
param(
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Import-Module (Join-Path $PSScriptRoot 'BiApi.psm1') -Force

$config = Get-BiApiConfig -RepoRoot $RepoRoot -AllowIncomplete:$DryRun
$preflight = Test-BiApiPrerequisites -Config $config

Write-Host "PowerShell $($preflight.PowerShell)"
Write-Host "Postgres target $($preflight.PgTarget)"
if ($preflight.PsqlPath) {
    Write-Host "psql $($preflight.PsqlPath)"
}
Write-Host "PKCE verifier length $($preflight.CodeVerifier.Length); challenge $($preflight.CodeChallenge.Substring(0, [Math]::Min(12, $preflight.CodeChallenge.Length)))..."
Write-Host "Mapped sample rows $($preflight.MappedSample)"

if ($preflight.Issues.Count -gt 0) {
    throw ($preflight.Issues -join [Environment]::NewLine)
}

if ($DryRun) {
    if ($preflight.OracleReady) {
        Write-Host 'Oracle settings are present. Re-run without -DryRun to sync.'
    }
    else {
        Write-Host 'Oracle settings are incomplete. Fill AUTH_HOST, APP_HOST, CLIENT_ID, API_USERNAME, API_PASSWORD, and ORG_NAME in .env.'
    }
    Write-Host 'Dry run complete.'
    return
}

if (-not $preflight.OracleReady) {
    throw 'Oracle settings are incomplete. Fill .env from .env.example.'
}

$idToken = Connect-BiApi -Config $config
$locations = @(Get-BiApiLocationDimensions -Config $config -IdToken $idToken)
$active = @($locations | Where-Object {
        $activeProp = $_.PSObject.Properties['active']
        -not $activeProp -or $activeProp.Value -eq $true
    })

Write-Host "Found $($locations.Count) location(s); syncing $($active.Count) active."

$allRows = New-Object System.Collections.Generic.List[object]
$failed = New-Object System.Collections.Generic.List[string]

foreach ($location in $active) {
    $locRef = [string](Get-BiApiProperty -Object $location -Names @('locRef'))
    if ([string]::IsNullOrWhiteSpace($locRef)) {
        Write-Warning 'Skipping a location with no locRef.'
        continue
    }

    try {
        $busDt = $config.BusDt
        if ([string]::IsNullOrWhiteSpace($busDt)) {
            $busDt = Get-BiApiLatestBusinessDate -Config $config -IdToken $idToken -LocRef $locRef
        }
        if ([string]::IsNullOrWhiteSpace($busDt)) {
            throw 'No business date returned.'
        }

        $totals = Get-BiApiOperationsDailyTotals -Config $config -IdToken $idToken -LocRef $locRef -BusDt $busDt
        $rows = @(ConvertTo-BiApiDailyTotalRows -Totals $totals)
        foreach ($row in $rows) {
            $allRows.Add($row)
        }
        Write-Host ("{0} {1}: {2} revenue center(s)" -f $locRef, $busDt, $rows.Count)
    }
    catch {
        $failed.Add("$locRef : $($_.Exception.Message)")
        Write-Warning "Failed $locRef : $($_.Exception.Message)"
    }

    Start-Sleep -Milliseconds 200
}

if ($allRows.Count -eq 0) {
    Write-Warning 'No operations daily total rows to upsert.'
}
else {
    $written = Export-BiApiDailyTotalsToPostgres -Config $config -Rows $allRows.ToArray()
    Write-Host "Upserted $written row(s) into operations_daily_totals."
}

if ($failed.Count -gt 0) {
    throw "Completed with $($failed.Count) location error(s):`n$($failed -join [Environment]::NewLine)"
}
