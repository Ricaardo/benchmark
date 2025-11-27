@echo off
chcp 65001 >nul
REM Medium Performance Worker Startup Script (Windows)
REM For: Medium performance machines, regular testing

REM Master server address (modify to actual address)
if "%MASTER_URL%"=="" set MASTER_URL=http://localhost:3000

REM Worker configuration
set WORKER_NAME=Medium-Worker-1
set PERFORMANCE_TIER=medium
set WORKER_DESCRIPTION=Medium Performance Workstation - Windows
set WORKER_TAGS=medium-performance,testing,windows
set WORKER_PORT=0

echo =========================================
echo   Starting Medium Worker Node
echo =========================================
echo Master URL:     %MASTER_URL%
echo Worker Name:    %WORKER_NAME%
echo Performance:    %PERFORMANCE_TIER%
echo Description:    %WORKER_DESCRIPTION%
echo Tags:           %WORKER_TAGS%
echo =========================================
echo.

echo Starting Worker client...
echo.

REM Start Worker
npx tsx server/worker-client.ts

pause
