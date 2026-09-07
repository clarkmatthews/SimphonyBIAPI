# Simphony BI API helpers: PKCE auth, token cache, BI POSTs, flatten, Postgres upsert.

Set-StrictMode -Version Latest

$script:ApplicationName = 'SimphonyBIAPI-Sample'
$script:RedirectUri = 'apiaccount://callback'
$script:TokenRefreshLeadDays = 5

$script:DailyTotalSqlColumns = @(
    @{ Name = 'loc_ref';              PgType = 'text' }
    @{ Name = 'bus_dt';               PgType = 'date' }
    @{ Name = 'rvc_num';              PgType = 'integer' }
    @{ Name = 'net_sls_ttl';          PgType = 'numeric' }
    @{ Name = 'itm_dsc_ttl';          PgType = 'numeric' }
    @{ Name = 'sub_dsc_ttl';          PgType = 'numeric' }
    @{ Name = 'svc_ttl';              PgType = 'numeric' }
    @{ Name = 'non_rev_svc_ttl';      PgType = 'numeric' }
    @{ Name = 'rtn_cnt';              PgType = 'integer' }
    @{ Name = 'rtn_ttl';              PgType = 'numeric' }
    @{ Name = 'cred_ttl';             PgType = 'numeric' }
    @{ Name = 'rnd_ttl';              PgType = 'numeric' }
    @{ Name = 'chng_in_grnd_ttl';     PgType = 'numeric' }
    @{ Name = 'non_txbl_sls_ttl';     PgType = 'numeric' }
    @{ Name = 'txbl_sls_ttl';         PgType = 'numeric' }
    @{ Name = 'tax_exmpt_sls_ttl';    PgType = 'numeric' }
    @{ Name = 'tax_coll_ttl';         PgType = 'numeric' }
    @{ Name = 'sls_fcst';             PgType = 'numeric' }
    @{ Name = 'prep_cost_ttl';        PgType = 'numeric' }
    @{ Name = 'num_tbl';              PgType = 'integer' }
    @{ Name = 'tbl_turn_cnt';         PgType = 'integer' }
    @{ Name = 'chk_cnt';              PgType = 'integer' }
    @{ Name = 'wait_pty_cnt';         PgType = 'integer' }
    @{ Name = 'wait_time_in_mins';    PgType = 'numeric' }
    @{ Name = 'gst_cnt';              PgType = 'integer' }
    @{ Name = 'dine_time_in_mins';    PgType = 'numeric' }
    @{ Name = 'park_car_cnt';         PgType = 'integer' }
    @{ Name = 'drv_thru_time_in_mins'; PgType = 'numeric' }
    @{ Name = 'vd_ttl';               PgType = 'numeric' }
    @{ Name = 'vd_cnt';               PgType = 'integer' }
    @{ Name = 'err_cor_ttl';          PgType = 'numeric' }
    @{ Name = 'err_cor_cnt';          PgType = 'integer' }
    @{ Name = 'mngr_vd_ttl';          PgType = 'numeric' }
    @{ Name = 'mngr_vd_cnt';          PgType = 'integer' }
    @{ Name = 'trans_cncl_ttl';       PgType = 'numeric' }
    @{ Name = 'trans_cncl_cnt';       PgType = 'integer' }
    @{ Name = 'carryover_ttl';        PgType = 'numeric' }
    @{ Name = 'carryover_cnt';        PgType = 'integer' }
    @{ Name = 'chk_opn_ttl';          PgType = 'numeric' }
    @{ Name = 'chk_opn_cnt';          PgType = 'integer' }
    @{ Name = 'chk_xfer_in_ttl';      PgType = 'numeric' }
    @{ Name = 'chk_xfer_in_cnt';      PgType = 'integer' }
    @{ Name = 'chk_xfer_out_ttl';     PgType = 'numeric' }
    @{ Name = 'chk_xfer_out_cnt';     PgType = 'integer' }
    @{ Name = 'chk_clsd_ttl';         PgType = 'numeric' }
    @{ Name = 'chk_clsd_cnt';         PgType = 'integer' }
    @{ Name = 'over_short_ttl';       PgType = 'numeric' }
    @{ Name = 'no_sales_cnt';         PgType = 'integer' }
    @{ Name = 'trn_chk_cnt';          PgType = 'integer' }
    @{ Name = 'trn_chk_ttl';          PgType = 'numeric' }
)

function ConvertTo-BiApiBase64Url {
    param([Parameter(Mandatory)][byte[]]$Bytes)
    return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function ConvertFrom-BiApiBase64Url {
    param([Parameter(Mandatory)][string]$Value)
    $padded = $Value.Replace('-', '+').Replace('_', '/')
    switch ($padded.Length % 4) {
        2 { $padded += '==' }
        3 { $padded += '=' }
    }
    return [Convert]::FromBase64String($padded)
}

function Get-BiApiProperty {
    param(
        [Parameter(Mandatory)]$Object,
        [Parameter(Mandatory)][string[]]$Names
    )
    foreach ($name in $Names) {
        $prop = $Object.PSObject.Properties[$name]
        if ($null -ne $prop -and $null -ne $prop.Value -and "$($prop.Value)" -ne '') {
            return $prop.Value
        }
    }
    return $null
}

function Join-BiApiUrl {
    param(
        [Parameter(Mandatory)][string]$Base,
        [Parameter(Mandatory)][string]$Path
    )
    return ($Base.TrimEnd('/') + '/' + $Path.TrimStart('/'))
}

function Normalize-BiApiAuthHost {
    param([Parameter(Mandatory)][string]$HostUrl)
    $normalized = $HostUrl.Trim().TrimEnd('/')
    $normalized = $normalized -replace '/oidc-provider/v1$', ''
    $normalized = $normalized -replace '/oidc-provider$', ''
    return $normalized.TrimEnd('/')
}

function Normalize-BiApiAppHost {
    param([Parameter(Mandatory)][string]$HostUrl)
    $normalized = $HostUrl.Trim().TrimEnd('/')
    $normalized = $normalized -replace '/bi/v1.*$', ''
    return $normalized.TrimEnd('/')
}

function Import-BiApiDotEnv {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Env file not found: $Path"
    }

    Get-Content -LiteralPath $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) {
            return
        }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) {
            return
        }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1)
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$key" -Value $value
    }
}

function Get-BiApiConfig {
    [CmdletBinding()]
    param(
        [string]$RepoRoot,
        [switch]$AllowIncomplete
    )

    if ($RepoRoot) {
        $envPath = Join-Path $RepoRoot '.env'
        if (Test-Path -LiteralPath $envPath) {
            Import-BiApiDotEnv -Path $envPath
        }
        elseif (-not $AllowIncomplete) {
            throw "Create .env from .env.example at $envPath"
        }
    }

    $orgName = $env:ORG_NAME
    $orgIdentifier = $env:ORG_IDENTIFIER
    if ([string]::IsNullOrWhiteSpace($orgIdentifier)) {
        $orgIdentifier = $orgName
    }

    $config = [pscustomobject]@{
        AuthHost      = if ($env:AUTH_HOST) { Normalize-BiApiAuthHost $env:AUTH_HOST } else { '' }
        AppHost       = if ($env:APP_HOST) { Normalize-BiApiAppHost $env:APP_HOST } else { '' }
        ClientId      = $env:CLIENT_ID
        Username      = $env:API_USERNAME
        Password      = $env:API_PASSWORD
        OrgName       = $orgName
        OrgIdentifier = $orgIdentifier
        BusDt         = $env:BUS_DT
        PgHost        = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
        PgPort        = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
        PgDatabase    = if ($env:PGDATABASE) { $env:PGDATABASE } else { 'biapi' }
        PgUser        = if ($env:PGUSER) { $env:PGUSER } else { 'biapiUser' }
        PgPassword    = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { '' }
        RepoRoot      = $RepoRoot
        TokenPath     = if ($RepoRoot) { Join-Path $RepoRoot '.tokens.json' } else { '.tokens.json' }
    }

    if (-not $AllowIncomplete) {
        $missing = @()
        foreach ($name in @('AuthHost', 'AppHost', 'ClientId', 'Username', 'Password', 'OrgName', 'OrgIdentifier')) {
            if ([string]::IsNullOrWhiteSpace($config.$name)) {
                $missing += $name
            }
        }
        if ($missing.Count -gt 0) {
            throw "Missing Oracle settings in .env: $($missing -join ', ')"
        }
    }

    return $config
}

function New-BiApiPkce {
    [CmdletBinding()]
    param()

    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    }
    finally {
        $rng.Dispose()
    }
    $codeVerifier = ConvertTo-BiApiBase64Url -Bytes $bytes

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $digest = $sha.ComputeHash([System.Text.Encoding]::ASCII.GetBytes($codeVerifier))
    }
    finally {
        $sha.Dispose()
    }

    return [pscustomobject]@{
        CodeVerifier  = $codeVerifier
        CodeChallenge = (ConvertTo-BiApiBase64Url -Bytes $digest)
    }
}

function Get-BiApiJwtExpiration {
    param([Parameter(Mandatory)][string]$Jwt)

    $parts = $Jwt.Split('.')
    if ($parts.Count -lt 2) {
        return $null
    }

    try {
        $json = [System.Text.Encoding]::UTF8.GetString((ConvertFrom-BiApiBase64Url -Value $parts[1]))
        $payload = $json | ConvertFrom-Json
        if ($payload.exp) {
            return [DateTimeOffset]::FromUnixTimeSeconds([int64]$payload.exp).UtcDateTime
        }
    }
    catch {
        return $null
    }

    return $null
}

function Read-BiApiTokenCache {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    return (Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json)
}

function Write-BiApiTokenCache {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)]$TokenResponse
    )

    $expiresAt = $null
    if ($TokenResponse.id_token) {
        $expiresAt = Get-BiApiJwtExpiration -Jwt $TokenResponse.id_token
    }
    if (-not $expiresAt -and $TokenResponse.expires_in) {
        $expiresAt = [DateTime]::UtcNow.AddSeconds([int]$TokenResponse.expires_in)
    }

    $cache = [pscustomobject]@{
        id_token      = $TokenResponse.id_token
        refresh_token = $TokenResponse.refresh_token
        token_type    = $TokenResponse.token_type
        expires_in    = $TokenResponse.expires_in
        expires_at    = if ($expiresAt) { $expiresAt.ToString('o') } else { $null }
        obtained_at   = [DateTime]::UtcNow.ToString('o')
    }

    $cache | ConvertTo-Json | Set-Content -LiteralPath $Path -Encoding utf8
    return $cache
}

function Test-BiApiIdTokenFresh {
    param($Cache)

    if (-not $Cache -or -not $Cache.id_token) {
        return $false
    }

    $expiresAt = $null
    if ($Cache.expires_at) {
        $expiresAt = [DateTime]::Parse($Cache.expires_at).ToUniversalTime()
    }
    else {
        $expiresAt = Get-BiApiJwtExpiration -Jwt $Cache.id_token
    }

    if (-not $expiresAt) {
        return $false
    }

    return $expiresAt -gt [DateTime]::UtcNow.AddDays($script:TokenRefreshLeadDays)
}

function New-BiApiWebSession {
    return [Microsoft.PowerShell.Commands.WebRequestSession]::new()
}

function New-BiApiQueryString {
    param([Parameter(Mandatory)][hashtable]$Pairs)

    return (
        $Pairs.GetEnumerator() |
            ForEach-Object { '{0}={1}' -f [uri]::EscapeDataString([string]$_.Key), [uri]::EscapeDataString([string]$_.Value) }
    ) -join '&'
}

function Get-BiApiQueryValue {
    param(
        [Parameter(Mandatory)][string]$Url,
        [Parameter(Mandatory)][string]$Name
    )

    $query = ''
    try {
        $query = ([Uri]$Url).Query
    }
    catch {
        $qIndex = $Url.IndexOf('?')
        if ($qIndex -ge 0) {
            $query = $Url.Substring($qIndex)
        }
    }

    foreach ($part in $query.TrimStart('?').Split('&')) {
        $eq = $part.IndexOf('=')
        if ($eq -lt 1) {
            continue
        }
        $key = [uri]::UnescapeDataString($part.Substring(0, $eq))
        if ($key -eq $Name) {
            return [uri]::UnescapeDataString($part.Substring($eq + 1))
        }
    }

    return $null
}

function Invoke-BiApiAuthorize {
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][string]$CodeChallenge,
        [Parameter(Mandatory)]$WebSession
    )

    $query = New-BiApiQueryString -Pairs @{
        response_type         = 'code'
        client_id             = $Config.ClientId
        scope                 = 'openid'
        redirect_uri          = $script:RedirectUri
        code_challenge        = $CodeChallenge
        code_challenge_method = 'S256'
    }
    $uri = '{0}?{1}' -f (Join-BiApiUrl -Base $Config.AuthHost -Path '/oidc-provider/v1/oauth2/authorize'), $query

    try {
        $null = Invoke-WebRequest -Method GET -Uri $uri -WebSession $WebSession -MaximumRedirection 5
    }
    catch {
        if ($_.Exception.Message -notmatch 'apiaccount') {
            throw
        }
    }
}

function Invoke-BiApiSignIn {
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)]$WebSession
    )

    $uri = Join-BiApiUrl -Base $Config.AuthHost -Path '/oidc-provider/v1/oauth2/signin'
    $body = @{
        username = $Config.Username
        password = $Config.Password
        orgname  = $Config.OrgName
    }

    $response = Invoke-RestMethod -Method POST -Uri $uri -WebSession $WebSession -Body $body -ContentType 'application/x-www-form-urlencoded'

    if ($response.nextOp -eq 'expired' -or $response.error) {
        $detail = if ($response.error) { $response.error } else { 'API account password expired.' }
        throw "Sign-in failed: $detail Reset the password from the Reporting and Analytics sign-in page."
    }

    if (-not $response.success -or -not $response.redirectUrl) {
        $message = if ($response.message) { $response.message } else { ($response | ConvertTo-Json -Compress) }
        throw "Sign-in failed: $message"
    }

    $code = Get-BiApiQueryValue -Url $response.redirectUrl -Name 'code'
    if ([string]::IsNullOrWhiteSpace($code)) {
        throw "Sign-in did not return an authorization code. redirectUrl=$($response.redirectUrl)"
    }

    return $code
}

function Invoke-BiApiToken {
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][hashtable]$Form,
        $WebSession
    )

    $uri = Join-BiApiUrl -Base $Config.AuthHost -Path '/oidc-provider/v1/oauth2/token'
    $params = @{
        Method      = 'POST'
        Uri         = $uri
        Body        = $Form
        ContentType = 'application/x-www-form-urlencoded'
    }
    if ($WebSession) {
        $params.WebSession = $WebSession
    }

    return Invoke-RestMethod @params
}

function Connect-BiApi {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config
    )

    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

    $cache = Read-BiApiTokenCache -Path $Config.TokenPath
    if (Test-BiApiIdTokenFresh -Cache $cache) {
        Write-Host 'Using cached id_token.'
        return $cache.id_token
    }

    if ($cache -and $cache.refresh_token) {
        Write-Host 'Refreshing id_token...'
        try {
            $refreshed = Invoke-BiApiToken -Config $Config -Form @{
                scope         = 'openid'
                grant_type    = 'refresh_token'
                client_id     = $Config.ClientId
                refresh_token = $cache.refresh_token
                redirect_uri  = $script:RedirectUri
            }
            $saved = Write-BiApiTokenCache -Path $Config.TokenPath -TokenResponse $refreshed
            return $saved.id_token
        }
        catch {
            Write-Warning "Token refresh failed; starting a full PKCE sign-in. $($_.Exception.Message)"
        }
    }

    Write-Host 'Starting PKCE authorization...'
    $pkce = New-BiApiPkce
    $session = New-BiApiWebSession
    Invoke-BiApiAuthorize -Config $Config -CodeChallenge $pkce.CodeChallenge -WebSession $session
    $authCode = Invoke-BiApiSignIn -Config $Config -WebSession $session
    $token = Invoke-BiApiToken -Config $Config -WebSession $session -Form @{
        scope         = 'openid'
        grant_type    = 'authorization_code'
        client_id     = $Config.ClientId
        code_verifier = $pkce.CodeVerifier
        code          = $authCode
        redirect_uri  = $script:RedirectUri
    }

    if (-not $token.id_token) {
        throw 'Token response did not include id_token.'
    }

    $saved = Write-BiApiTokenCache -Path $Config.TokenPath -TokenResponse $token
    Write-Host 'Received id_token and refresh_token.'
    return $saved.id_token
}

function Invoke-BiApiJsonPost {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][string]$IdToken,
        [Parameter(Mandatory)][string]$Operation,
        $Body = @{}
    )

    $uri = Join-BiApiUrl -Base $Config.AppHost -Path "/bi/v1/$($Config.OrgIdentifier)/$Operation"
    $payload = @{}
    if ($Body) {
        foreach ($key in $Body.Keys) {
            $payload[$key] = $Body[$key]
        }
    }
    if (-not $payload.ContainsKey('applicationName')) {
        $payload['applicationName'] = $script:ApplicationName
    }

    $headers = @{
        Authorization = "Bearer $IdToken"
        Accept        = 'application/json'
    }

    return Invoke-RestMethod -Method POST -Uri $uri -Headers $headers -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Compress)
}

function Get-BiApiLocationDimensions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][string]$IdToken
    )

    $response = Invoke-BiApiJsonPost -Config $Config -IdToken $IdToken -Operation 'getLocationDimensions'
    if ($response -is [array]) {
        return @($response)
    }
    if ($response.PSObject.Properties['locations'] -and $response.locations) {
        return @($response.locations)
    }
    return @()
}

function Get-BiApiLatestBusinessDate {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][string]$IdToken,
        [Parameter(Mandatory)][string]$LocRef
    )

    $response = Invoke-BiApiJsonPost -Config $Config -IdToken $IdToken -Operation 'getLatestBusinessDate' -Body @{ locRef = $LocRef }
    return $response.latestBusDt
}

function Get-BiApiOperationsDailyTotals {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][string]$IdToken,
        [Parameter(Mandatory)][string]$LocRef,
        [Parameter(Mandatory)][string]$BusDt
    )

    return Invoke-BiApiJsonPost -Config $Config -IdToken $IdToken -Operation 'getOperationsDailyTotals' -Body @{
        locRef = $LocRef
        busDt  = $BusDt
    }
}

function ConvertTo-BiApiDailyTotalRows {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Totals
    )

    $locRef = [string](Get-BiApiProperty -Object $Totals -Names @('locRef', 'loc_ref'))
    $busDt = [string](Get-BiApiProperty -Object $Totals -Names @('busDt', 'bus_dt'))
    $centers = @()
    if ($Totals.revenueCenters) {
        $centers = @($Totals.revenueCenters)
    }

    $rows = foreach ($rvc in $centers) {
        [ordered]@{
            loc_ref               = $locRef
            bus_dt                = $busDt
            rvc_num               = (Get-BiApiProperty -Object $rvc -Names @('rvcNum'))
            net_sls_ttl           = (Get-BiApiProperty -Object $rvc -Names @('netSlsTtl'))
            itm_dsc_ttl           = (Get-BiApiProperty -Object $rvc -Names @('itmDscTtl'))
            sub_dsc_ttl           = (Get-BiApiProperty -Object $rvc -Names @('subDscTtl'))
            svc_ttl               = (Get-BiApiProperty -Object $rvc -Names @('svcTtl'))
            non_rev_svc_ttl       = (Get-BiApiProperty -Object $rvc -Names @('nonRevSvcTtl'))
            rtn_cnt               = (Get-BiApiProperty -Object $rvc -Names @('rtnCnt', 'rtrnCnt'))
            rtn_ttl               = (Get-BiApiProperty -Object $rvc -Names @('rtnTtl', 'rtrnTtl'))
            cred_ttl              = (Get-BiApiProperty -Object $rvc -Names @('credTtl'))
            rnd_ttl               = (Get-BiApiProperty -Object $rvc -Names @('rndTtl'))
            chng_in_grnd_ttl      = (Get-BiApiProperty -Object $rvc -Names @('chngInGrndTtl'))
            non_txbl_sls_ttl      = (Get-BiApiProperty -Object $rvc -Names @('nonTxblSlsTtl'))
            txbl_sls_ttl          = (Get-BiApiProperty -Object $rvc -Names @('txblSlsTtl'))
            tax_exmpt_sls_ttl     = (Get-BiApiProperty -Object $rvc -Names @('taxExmptSlsTtl'))
            tax_coll_ttl          = (Get-BiApiProperty -Object $rvc -Names @('taxCollTtl'))
            sls_fcst              = (Get-BiApiProperty -Object $rvc -Names @('slsFcst'))
            prep_cost_ttl         = (Get-BiApiProperty -Object $rvc -Names @('prepCostTtl'))
            num_tbl               = (Get-BiApiProperty -Object $rvc -Names @('numTbl'))
            tbl_turn_cnt          = (Get-BiApiProperty -Object $rvc -Names @('tblTurnCnt'))
            chk_cnt               = (Get-BiApiProperty -Object $rvc -Names @('chkCnt'))
            wait_pty_cnt          = (Get-BiApiProperty -Object $rvc -Names @('waitPtyCnt'))
            wait_time_in_mins     = (Get-BiApiProperty -Object $rvc -Names @('waitTimeInMins'))
            gst_cnt               = (Get-BiApiProperty -Object $rvc -Names @('gstCnt'))
            dine_time_in_mins     = (Get-BiApiProperty -Object $rvc -Names @('dineTimeInMins'))
            park_car_cnt          = (Get-BiApiProperty -Object $rvc -Names @('parkCarCnt'))
            drv_thru_time_in_mins = (Get-BiApiProperty -Object $rvc -Names @('drvThruTimeInMins'))
            vd_ttl                = (Get-BiApiProperty -Object $rvc -Names @('vdTtl'))
            vd_cnt                = (Get-BiApiProperty -Object $rvc -Names @('vdCnt'))
            err_cor_ttl           = (Get-BiApiProperty -Object $rvc -Names @('errCorTtl'))
            err_cor_cnt           = (Get-BiApiProperty -Object $rvc -Names @('errCorCnt'))
            mngr_vd_ttl           = (Get-BiApiProperty -Object $rvc -Names @('mngrVdTtl'))
            mngr_vd_cnt           = (Get-BiApiProperty -Object $rvc -Names @('mngrVdCnt'))
            trans_cncl_ttl        = (Get-BiApiProperty -Object $rvc -Names @('transCnclTtl'))
            trans_cncl_cnt        = (Get-BiApiProperty -Object $rvc -Names @('transCnclCnt'))
            carryover_ttl         = (Get-BiApiProperty -Object $rvc -Names @('carryoverTtl'))
            carryover_cnt         = (Get-BiApiProperty -Object $rvc -Names @('carryoverCnt'))
            chk_opn_ttl           = (Get-BiApiProperty -Object $rvc -Names @('chkOpnTtl'))
            chk_opn_cnt           = (Get-BiApiProperty -Object $rvc -Names @('chkOpnCnt', 'chkOpnCount'))
            chk_xfer_in_ttl       = (Get-BiApiProperty -Object $rvc -Names @('chkXferInTtl'))
            chk_xfer_in_cnt       = (Get-BiApiProperty -Object $rvc -Names @('chkXferInCnt'))
            chk_xfer_out_ttl      = (Get-BiApiProperty -Object $rvc -Names @('chkXferOutTtl'))
            chk_xfer_out_cnt      = (Get-BiApiProperty -Object $rvc -Names @('chkXferOutCnt'))
            chk_clsd_ttl          = (Get-BiApiProperty -Object $rvc -Names @('chkClsdTtl'))
            chk_clsd_cnt          = (Get-BiApiProperty -Object $rvc -Names @('chkClsdCnt'))
            over_short_ttl        = (Get-BiApiProperty -Object $rvc -Names @('overShortTtl'))
            no_sales_cnt          = (Get-BiApiProperty -Object $rvc -Names @('noSalesCnt', 'noSlsCnt'))
            trn_chk_cnt           = (Get-BiApiProperty -Object $rvc -Names @('trnChkCnt'))
            trn_chk_ttl           = (Get-BiApiProperty -Object $rvc -Names @('trnChkTtl'))
        }
    }

    return @($rows)
}

function Test-BiApiPsql {
    $cmd = Get-Command psql -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    $guesses = @(
        'C:\Program Files\PostgreSQL\18\bin\psql.exe'
        'C:\Program Files\PostgreSQL\17\bin\psql.exe'
        'C:\Program Files\PostgreSQL\16\bin\psql.exe'
        'C:\Program Files\PostgreSQL\15\bin\psql.exe'
        'C:\Program Files\PostgreSQL\14\bin\psql.exe'
    )
    foreach ($guess in $guesses) {
        if (Test-Path -LiteralPath $guess) {
            return $guess
        }
    }

    throw 'psql is not on PATH. Install the PostgreSQL client tools and retry.'
}

function Invoke-BiApiPsql {
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][string]$SqlFile
    )

    $psql = Test-BiApiPsql
    $previous = $env:PGPASSWORD
    $env:PGPASSWORD = $Config.PgPassword
    try {
        $output = & $psql -h $Config.PgHost -p $Config.PgPort -U $Config.PgUser -d $Config.PgDatabase -v ON_ERROR_STOP=1 -f $SqlFile 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw ($output | Out-String)
        }
        return ($output | Out-String)
    }
    finally {
        if ($null -eq $previous) {
            Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
        }
        else {
            $env:PGPASSWORD = $previous
        }
    }
}

function Initialize-BiApiSchema {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config
    )

    $sqlFile = Join-Path $Config.RepoRoot 'sql\001_operations_daily_totals.sql'
    if (-not (Test-Path -LiteralPath $sqlFile)) {
        throw "Schema file not found: $sqlFile"
    }
    return Invoke-BiApiPsql -Config $Config -SqlFile $sqlFile
}

function Export-BiApiDailyTotalsToPostgres {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config,
        [Parameter(Mandatory)][object[]]$Rows
    )

    if (-not $Rows -or $Rows.Count -eq 0) {
        return 0
    }

    $null = Test-BiApiPsql

    $columnList = ($script:DailyTotalSqlColumns | ForEach-Object { $_.Name }) -join ', '
    $recordTypes = ($script:DailyTotalSqlColumns | ForEach-Object { "$($_.Name) $($_.PgType)" }) -join ', '
    $updates = (
        $script:DailyTotalSqlColumns |
            Where-Object { $_.Name -notin @('loc_ref', 'bus_dt', 'rvc_num') } |
            ForEach-Object { "$($_.Name) = EXCLUDED.$($_.Name)" }
    ) -join ",`n            "
    $json = $Rows | ConvertTo-Json -Depth 6 -Compress
    if ($Rows.Count -eq 1 -and -not $json.StartsWith('[')) {
        $json = "[$json]"
    }

    $tmpDir = Join-Path $Config.RepoRoot 'tmp'
    if (-not (Test-Path -LiteralPath $tmpDir)) {
        New-Item -ItemType Directory -Path $tmpDir | Out-Null
    }
    $sqlFile = Join-Path $tmpDir ("upsert-{0}.sql" -f [Guid]::NewGuid().ToString('N'))

    $sql = @"
WITH src AS (
    SELECT *
    FROM jsonb_to_recordset(`$biapi_json`$
$json
`$biapi_json`$::jsonb) AS x($recordTypes)
)
INSERT INTO operations_daily_totals ($columnList, synced_at)
SELECT $columnList, now()
FROM src
ON CONFLICT (loc_ref, bus_dt, rvc_num) DO UPDATE SET
            $updates,
            synced_at = now();
"@

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($sqlFile, $sql, $utf8NoBom)
    try {
        $null = Invoke-BiApiPsql -Config $Config -SqlFile $sqlFile
    }
    finally {
        Remove-Item -LiteralPath $sqlFile -ErrorAction SilentlyContinue
    }

    return $Rows.Count
}

function Test-BiApiPrerequisites {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]$Config
    )

    $issues = @()
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        $issues += "Windows PowerShell 5.1 or PowerShell 7+ is required. Current version: $($PSVersionTable.PSVersion)"
    }

    $pkce = New-BiApiPkce
    $psqlPath = $null
    try {
        $psqlPath = Test-BiApiPsql
    }
    catch {
        $issues += $_.Exception.Message
    }

    $oracleReady = -not (
        [string]::IsNullOrWhiteSpace($Config.AuthHost) -or
        [string]::IsNullOrWhiteSpace($Config.AppHost) -or
        [string]::IsNullOrWhiteSpace($Config.ClientId) -or
        [string]::IsNullOrWhiteSpace($Config.Username) -or
        [string]::IsNullOrWhiteSpace($Config.Password) -or
        [string]::IsNullOrWhiteSpace($Config.OrgName)
    )

    $sample = [pscustomobject]@{
        locRef          = '1234'
        busDt           = '2020-10-20'
        revenueCenters  = @(
            [pscustomobject]@{
                rvcNum       = 123
                netSlsTtl    = 1234.56
                rtrnCnt      = 2
                noSlsCnt     = 1
                chkOpnCount  = 4
            }
        )
    }
    $mapped = @(ConvertTo-BiApiDailyTotalRows -Totals $sample)
    if ($mapped.Count -ne 1 -or $mapped[0].rtn_cnt -ne 2 -or $mapped[0].no_sales_cnt -ne 1 -or $mapped[0].chk_opn_cnt -ne 4) {
        $issues += 'Daily totals alias mapping failed on the sample payload.'
    }

    return [pscustomobject]@{
        PowerShell    = $PSVersionTable.PSVersion.ToString()
        PsqlPath      = $psqlPath
        CodeVerifier  = $pkce.CodeVerifier
        CodeChallenge = $pkce.CodeChallenge
        MappedSample  = $mapped.Count
        OracleReady   = $oracleReady
        Issues        = $issues
        PgTarget      = "$($Config.PgUser)@$($Config.PgHost):$($Config.PgPort)/$($Config.PgDatabase)"
    }
}

Export-ModuleMember -Function @(
    'Import-BiApiDotEnv'
    'Get-BiApiConfig'
    'Get-BiApiProperty'
    'New-BiApiPkce'
    'Connect-BiApi'
    'Get-BiApiLocationDimensions'
    'Get-BiApiLatestBusinessDate'
    'Get-BiApiOperationsDailyTotals'
    'ConvertTo-BiApiDailyTotalRows'
    'Initialize-BiApiSchema'
    'Export-BiApiDailyTotalsToPostgres'
    'Test-BiApiPrerequisites'
    'Test-BiApiPsql'
)
