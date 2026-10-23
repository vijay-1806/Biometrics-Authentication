@echo off
setlocal
cd /d "%~dp0"
echo Starting Biometrics Authentication...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-app.ps1"
if errorlevel 1 (
    echo.
    echo Startup failed. See the message above and the logs in scratch\startup.
    pause
)
endlocal
