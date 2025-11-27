@echo off
chcp 65001 >nul
REM High Performance Worker Startup Script (Windows)
REM For: High performance machines, complex and high-load testing

REM Master server address (modify to actual address)
if "%MASTER_URL%"=="" set MASTER_URL=http://localhost:3000

REM Worker configuration
set WORKER_NAME=High-Worker-1
set PERFORMANCE_TIER=high
set WORKER_DESCRIPTION=High Performance Workstation - Windows
set WORKER_TAGS=high-performance,production,windows
set WORKER_PORT=0

echo =========================================
echo   Starting High Performance Worker Node
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
