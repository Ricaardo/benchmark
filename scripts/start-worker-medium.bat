@echo off
REM 中配 Worker 启动脚本 (Windows)
REM 适用于: 中等性能机器，执行常规测试

REM Master 服务器地址（修改为实际地址）
if "%MASTER_URL%"=="" set MASTER_URL=http://localhost:3000

REM Worker 配置
set WORKER_NAME=中配测试机-1
set PERFORMANCE_TIER=medium
set WORKER_DESCRIPTION=中等性能工作站 - Windows
set WORKER_TAGS=medium-performance,testing,windows
set WORKER_PORT=0

echo =========================================
echo   启动中配 Worker 节点
echo =========================================
echo Master URL:     %MASTER_URL%
echo Worker Name:    %WORKER_NAME%
echo Performance:    ⚡ %PERFORMANCE_TIER%
echo Description:    %WORKER_DESCRIPTION%
echo Tags:           %WORKER_TAGS%
echo =========================================
echo.

echo 启动 Worker 客户端...
echo.

REM 启动 Worker
npx tsx server/worker-client.ts

pause
