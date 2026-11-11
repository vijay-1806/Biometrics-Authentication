$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$logDirectory = Join-Path $projectRoot 'scratch\startup'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Test-LocalPort([int] $Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connection = $client.ConnectAsync('127.0.0.1', $Port)
        if (-not $connection.Wait(300)) { return $false }
        return $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}

function Start-AppProcess($Name, $Executable, $Arguments, $Directory) {
    Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory "$Name.log") -RedirectStandardError (Join-Path $logDirectory "$Name.error.log") | Out-Null
}

try {
    $nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
    $pythonExecutable = (Get-Command python.exe -ErrorAction Stop).Source
    foreach ($dependency in @('backend\node_modules\nodemon\bin\nodemon.js', 'frontend\node_modules\vite\bin\vite.js')) {
        if (-not (Test-Path -LiteralPath (Join-Path $projectRoot $dependency))) {
            throw 'Project dependencies are missing. Install the backend and frontend dependencies first.'
        }
    }

    if (-not (Test-LocalPort 27017)) {
        Write-Host 'Starting MongoDB...'
        try { Start-Service MongoDB -ErrorAction Stop } catch {
            $mongoExecutable = 'D:\software\bin\mongod.exe'
            $mongoConfiguration = 'D:\software\bin\mongod.cfg'
            if (-not (Test-Path -LiteralPath $mongoExecutable) -or -not (Test-Path -LiteralPath $mongoConfiguration)) {
                throw 'Start your MongoDB service, or update the MongoDB paths in scripts\start-app.ps1.'
            }
            Start-AppProcess 'mongodb' $mongoExecutable @('--config', ('"' + $mongoConfiguration + '"')) $projectRoot
        }
        $databaseDeadline = (Get-Date).AddSeconds(60)
        while (-not (Test-LocalPort 27017)) {
            if ((Get-Date) -gt $databaseDeadline) { throw 'MongoDB did not start. Check scratch\startup\mongodb.error.log.' }
            Start-Sleep -Milliseconds 500
        }
    }

    $env:MONGO_URI = 'mongodb://127.0.0.1:27017/lms_demo'
    if (-not (Test-LocalPort 5000)) {
        Write-Host 'Starting backend...'
        Start-AppProcess 'backend' $nodeExecutable @('node_modules\nodemon\bin\nodemon.js', 'src/server.js') (Join-Path $projectRoot 'backend')
    }
    if (-not (Test-LocalPort 8000)) {
        Write-Host 'Starting ML service...'
        Start-AppProcess 'ml' $pythonExecutable @('-m', 'uvicorn', 'main:app', '--reload', '--reload-dir', '.', '--port', '8000') (Join-Path $projectRoot 'behavioral-auth-ml-service\backend')
    }
    if (-not (Test-LocalPort 5173)) {
        Write-Host 'Starting frontend...'
        Start-AppProcess 'frontend' $nodeExecutable @('node_modules\vite\bin\vite.js', '--host', '0.0.0.0', '--port', '5173', '--strictPort') (Join-Path $projectRoot 'frontend')
    }

    Write-Host 'Waiting for the application...'
    $deadline = (Get-Date).AddSeconds(120)
    $endpoints = @('http://127.0.0.1:5000/', 'http://127.0.0.1:5173/', 'http://127.0.0.1:8000/v1/system/health')
    do {
        $ready = $true
        foreach ($endpoint in $endpoints) {
            try { $response = Invoke-WebRequest -Uri $endpoint -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -ne 200) { $ready = $false } }
            catch { $ready = $false }
        }
        if ($ready) { break }
        if ((Get-Date) -gt $deadline) { throw 'Application startup timed out. Check the logs in scratch\startup.' }
        Start-Sleep -Milliseconds 500
    } while ($true)

    Write-Host 'Application ready: http://localhost:5173'
    Start-Process 'http://localhost:5173'
    exit 0
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
