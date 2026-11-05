param([ValidateSet('Start','Status','Inbox','Stop','StopFrontend')][string]$Action = 'Status', [string]$JavaHome = 'C:\Users\Home\.jdks\temurin-25.0.5', [string]$LanAddress = '')
$ErrorActionPreference = 'Stop'
$frontendRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendRoot = (Resolve-Path (Join-Path $frontendRoot '../overload-server')).Path
$stateDirectory = Join-Path $frontendRoot 'logs/home-review'
New-Item -ItemType Directory -Path $stateDirectory -Force | Out-Null
$pointer = Join-Path $stateDirectory 'current.json'
if ($Action -eq 'Stop') { throw 'Disposing Stop is disabled. Use the verified preservation/resume workflow in docs/tasks/ui-v09-t02a-closeout.md.' }
if ($Action -eq 'Start' -and (Test-Path -LiteralPath (Join-Path $frontendRoot '.local-backups/home-review/current.json'))) { throw 'Preserved DB exists. After T02-B first UI only, use home-review-resume.ps1 -Action Start -AfterT02BFirstUi. Never reseed.' }
function Read-Review {
    if (!(Test-Path -LiteralPath $pointer)) { return $null }
    $saved = Get-Content -LiteralPath $pointer -Raw | ConvertFrom-Json
    if ($saved.runId -notmatch '^[0-9a-f-]{36}$') { throw 'Invalid review identity' }
    $readyPath = Join-Path $backendRoot "build/verification-v22/$($saved.runId)/home-review.json"
    if (!(Test-Path -LiteralPath $readyPath)) { return $null }
    $ready = Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json
    if ($ready.runId -ne $saved.runId -or $ready.database -ne 'overload_v22_isolated' -or !$ready.freshDatabase -or $ready.backendOrigin -notmatch '^http://127\.0\.0\.1:\d+$') { throw 'Unexpected review DB target' }
    try {
        $proof = Invoke-WebRequest -Uri "$($ready.backendOrigin)/__v22_identity" -Method Post -TimeoutSec 3
        if ($proof.Headers['X-V22-Run'][0] -ne $saved.runId) { return $null }
    } catch { return $null }
    return $ready
}
$ready = Read-Review
if ($Action -eq 'Inbox') {
    if (!$ready) { throw 'Start the review environment first' }
    Invoke-RestMethod -Uri "$($ready.inboxOrigin)/inbox" -Method Post -Headers @{ 'X-Review-Run'=$ready.runId } | ConvertTo-Json -Depth 4
    exit
}
if ($Action -eq 'StopFrontend') {
    if (!$ready) { Write-Output 'No live review environment'; exit }
    try {
        $front = Invoke-RestMethod 'http://127.0.0.1:3000/__home_review' -TimeoutSec 3
        if ($front.runId -eq $ready.runId) {
            $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($front.pid)"
            if ($process.Name -eq 'node.exe' -and $process.CommandLine -like '*home-review-server.mjs*') { Stop-Process -Id $front.pid }
        }
    } catch { }
    Write-Output 'Closed the PWA server; review Backend and PostgreSQL data remain running.'
    exit
}
if ($Action -eq 'Start' -and !$ready) {
    if (!(Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))) { throw 'Supply an installed JDK 25 using -JavaHome' }
    $env:JAVA_HOME = $JavaHome
    Push-Location $backendRoot
    try {
        & ./gradlew.bat --no-daemon -I scripts/home-review.gradle homeReviewClasspath *> (Join-Path $stateDirectory 'compile.log')
        if ($LASTEXITCODE -ne 0) { throw "Review compile failed; see $stateDirectory/compile.log" }
    } finally { Pop-Location }
    $runId = [guid]::NewGuid().ToString()
    $classpath = (Get-Content -LiteralPath (Join-Path $backendRoot 'build/home-review/classpath.txt') -Raw).Replace('\','/')
    $argFile = Join-Path $stateDirectory "$runId.args"
    @('-cp',('"'+$classpath+'"'),'com.overload.testfixture.HomeReviewEnvironment',$runId) | Set-Content -LiteralPath $argFile -Encoding utf8NoBOM
    $removed = @{}
    try {
        Get-ChildItem Env: | Where-Object Name -Match '^(SPRING_|OTP_|RESEND_|GOOGLE_|AUTH_|OVERLOAD_)' | ForEach-Object { $removed[$_.Name]=$_.Value; Remove-Item -LiteralPath ("Env:"+$_.Name) }
        $java = Start-Process -FilePath (Join-Path $JavaHome 'bin/java.exe') -ArgumentList ('@"'+$argFile+'"') -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $stateDirectory "$runId.out.log") -RedirectStandardError (Join-Path $stateDirectory "$runId.err.log")
    } finally { foreach ($name in $removed.Keys) { Set-Item -LiteralPath ("Env:"+$name) -Value $removed[$name] } }
    @{runId=$runId} | ConvertTo-Json | Set-Content -LiteralPath $pointer -Encoding utf8NoBOM
    $deadline = [DateTime]::UtcNow.AddMinutes(2)
    while ([DateTime]::UtcNow -lt $deadline) {
        Start-Sleep -Milliseconds 250
        $java.Refresh(); if ($java.HasExited) { throw "Review Backend stopped; see $stateDirectory/$runId.err.log" }
        $ready = Read-Review
        if ($ready) { break }
    }
    if (!$ready) { throw 'Review Backend readiness timed out; inspect the dedicated run logs' }
}
if (!$ready) { throw 'No live review environment. Run -Action Start.' }
if ($Action -eq 'Start') {
    if (!$LanAddress) { $LanAddress = Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up'} | ForEach-Object {$_.IPv4Address.IPAddress} | Where-Object {$_ -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)'} | Select-Object -First 1 }
    if (!$LanAddress) { throw 'Supply a private Wi-Fi/Ethernet IPv4 using -LanAddress' }
    try { $front = Invoke-RestMethod 'http://127.0.0.1:3000/__home_review' -TimeoutSec 2 } catch { $front=$null }
    if ($front -and $front.runId -ne $ready.runId) { throw 'Port 3000 belongs to another run; keep that process' }
    if (!$front) {
        Push-Location $frontendRoot
        try { & npm.cmd run build *> (Join-Path $stateDirectory 'build.log'); if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' } } finally { Pop-Location }
        Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('scripts/home-review-server.mjs',$ready.runId,$LanAddress) -WorkingDirectory $frontendRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $stateDirectory 'frontend.out.log') -RedirectStandardError (Join-Path $stateDirectory 'frontend.err.log') | Out-Null
        $deadline=[DateTime]::UtcNow.AddSeconds(20)
        do { Start-Sleep -Milliseconds 250; try { $front=Invoke-RestMethod 'http://127.0.0.1:3000/__home_review' -TimeoutSec 1 } catch { $front=$null } } while (!$front -and [DateTime]::UtcNow -lt $deadline)
        if (!$front -or $front.runId -ne $ready.runId) { throw 'Review frontend readiness failed; inspect frontend.err.log' }
    }
}
try { $front = Invoke-RestMethod 'http://127.0.0.1:3000/__home_review' -TimeoutSec 2 } catch { $front=$null }
[pscustomobject]@{FrontendRunning=($front.runId -eq $ready.runId); Frontend='http://127.0.0.1:3000'; Origins=($front.origins -join ', '); Backend=$ready.backendOrigin; Database=$ready.database; DatabasePort=$ready.databasePort; Migrations=($ready.actualMigrations -join ','); ReviewDate=$ready.reviewDate; Email=$ready.reviewEmail; RunId=$ready.runId; Clock=$ready.clockMode} | Format-List
