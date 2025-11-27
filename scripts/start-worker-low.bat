@echo off
chcp 65001 >nul
REM Low Performance Worker Startup Script (Windows)
REM For: Low performance machines, lightweight and compatibility testing

REM Master server address (modify to actual address)
if "%MASTER_URL%"=="" set MASTER_URL=http://localhost:3000

REM Worker configuration
set WORKER_NAME=Low-Worker-1
set PERFORMANCE_TIER=low
set WORKER_DESCRIPTION=Low Performance Test Machine - Windows
set WORKER_TAGS=low-performance,compatibility,windows
set WORKER_PORT=0

echo =========================================
echo   Starting Low Performance Worker Node
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
