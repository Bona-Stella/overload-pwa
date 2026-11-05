param([ValidateSet('Status','Start','Stop')][string]$Action='Status',[switch]$AfterT02BFirstUi,[string]$JavaHome='C:\Users\Home\.jdks\temurin-25.0.5',[string]$LanAddress='')
$ErrorActionPreference='Stop'
$frontendRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$backendRoot=(Resolve-Path (Join-Path $frontendRoot '../overload-server')).Path
$archiveRoot=Join-Path $frontendRoot '.local-backups/home-review'
$pointer=Get-Content -LiteralPath (Join-Path $archiveRoot 'current.json') -Raw | ConvertFrom-Json
if($pointer.sourceRun -notmatch '^[a-f0-9-]{36}$'){throw 'Invalid local archive'}
$configPath=Join-Path $archiveRoot "$($pointer.sourceRun)/archive.json"
$config=Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if($config.resumeRun -notmatch '^[a-f0-9-]{36}$' -or $config.startupPolicy -ne 'MANUAL_AFTER_T02B_FIRST_UI_ONLY'){throw 'Invalid resume policy'}
$runDirectory=Join-Path $backendRoot "build/verification-v22/$($config.resumeRun)"
Push-Location $frontendRoot
try{
  if($Action -eq 'Status'){& node scripts/home-review-preserve.mjs status; if($LASTEXITCODE -ne 0){throw 'Archive validation failed'}; return}
  if($Action -eq 'Start'){
    if(!$AfterT02BFirstUi){throw 'Do not start until T02-B first UI is complete. Supply -AfterT02BFirstUi explicitly then.'}
    & node scripts/home-review-preserve.mjs start-db --after-t02b-first-ui
    if($LASTEXITCODE -ne 0){throw 'Preserved DB validation/start failed'}
    if(!(Test-Path -LiteralPath (Join-Path $JavaHome 'bin/java.exe'))){throw 'Installed JDK25 required'}
    try{$current=Invoke-RestMethod 'http://127.0.0.1:3000/__home_review' -TimeoutSec 2}catch{$current=$null}
    if($current){throw 'A review frontend is already running; inspect it without replacing processes'}
    $env:JAVA_HOME=$JavaHome
    Push-Location $backendRoot
    try{& ./gradlew.bat --no-daemon -I scripts/home-review.gradle homeReviewClasspath *> (Join-Path $frontendRoot 'logs/home-review/resume-compile.log');if($LASTEXITCODE -ne 0){throw 'Review compile failed'}}finally{Pop-Location}
    $classPath=(Get-Content -LiteralPath (Join-Path $backendRoot 'build/home-review/classpath.txt') -Raw).Replace('\','/')
    $argFile=Join-Path $archiveRoot "$($pointer.sourceRun)/resume.args"
    @('-cp',('"'+$classPath+'"'),'com.overload.testfixture.HomeReviewResumeEnvironment',('"'+$configPath.Replace('\','/')+'"'),'--after-t02b-first-ui') | Set-Content -LiteralPath $argFile -Encoding utf8NoBOM
    $removed=@{}
    try{
      Get-ChildItem Env: | Where-Object Name -Match '^(SPRING_|OTP_|RESEND_|GOOGLE_|AUTH_|OVERLOAD_)' | ForEach-Object {$removed[$_.Name]=$_.Value;Remove-Item -LiteralPath ('Env:'+$_.Name)}
      $java=Start-Process -FilePath (Join-Path $JavaHome 'bin/java.exe') -ArgumentList ('@"'+$argFile+'"') -WorkingDirectory $backendRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $frontendRoot 'logs/home-review/resume-backend.out.log') -RedirectStandardError (Join-Path $frontendRoot 'logs/home-review/resume-backend.err.log')
    }finally{foreach($name in $removed.Keys){Set-Item -LiteralPath ('Env:'+$name) -Value $removed[$name]}}
    $readyPath=Join-Path $runDirectory 'home-review.json';$deadline=[DateTime]::UtcNow.AddSeconds(90);$ready=$null
    while([DateTime]::UtcNow -lt $deadline){
      $java.Refresh();if($java.HasExited){throw 'Resume backend failed; read resume-backend.err.log'}
      if(Test-Path -LiteralPath $readyPath){$candidate=Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json;if($candidate.backendPid -eq $java.Id){$ready=$candidate;break}}
      Start-Sleep -Milliseconds 250
    }
    if(!$ready){throw 'Backend readiness timed out; inspect before retrying; DB remains preserved'}
    if(!$LanAddress){$LanAddress=Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up'} | ForEach-Object {$_.IPv4Address.IPAddress} | Where-Object {$_ -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)'} | Select-Object -First 1}
    if(!$LanAddress){throw 'Supply current private LAN IPv4; do not replace existing processes'}
    @{runId=$config.resumeRun} | ConvertTo-Json | Set-Content -LiteralPath 'logs/home-review/current.json' -Encoding utf8NoBOM
    Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('scripts/home-review-server.mjs',$config.resumeRun,$LanAddress) -WorkingDirectory $frontendRoot -WindowStyle Hidden -RedirectStandardOutput 'logs/home-review/resume-frontend.out.log' -RedirectStandardError 'logs/home-review/resume-frontend.err.log' | Out-Null
    Write-Output 'Manually resumed existing data without seed/migrate/reset. Review frontend uses port3000; inspect logs for readiness.'
  }else{
    try{$front=Invoke-RestMethod 'http://127.0.0.1:3000/__home_review' -TimeoutSec 2}catch{$front=$null}
    if($front){if($front.runId -ne $config.resumeRun){throw 'Another run is active; keep it'};Invoke-WebRequest 'http://127.0.0.1:3000/__review/shutdown' -Method Post -Headers @{'X-Review-Run'=$config.resumeRun} | Out-Null}
    if(Test-Path -LiteralPath (Join-Path $runDirectory 'home-review.json')){
      $ready=Get-Content -LiteralPath (Join-Path $runDirectory 'home-review.json') -Raw | ConvertFrom-Json
      Set-Content -LiteralPath (Join-Path $runDirectory 'preserve-stop') -Value $config.resumeRun -Encoding utf8NoBOM
      $deadline=[DateTime]::UtcNow.AddSeconds(30)
      while((Get-Process -Id $ready.backendPid -ErrorAction SilentlyContinue) -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 200}
      if(Get-Process -Id $ready.backendPid -ErrorAction SilentlyContinue){throw 'Backend still running; leave DB running and inspect'}
    }
    & node scripts/home-review-preserve.mjs stop-db
    if($LASTEXITCODE -ne 0){throw 'DB stop verification failed'}
  }
}finally{Pop-Location}
