@echo off
chcp 65001 >nul
REM ################################################################################
REM # Windows 同机部署脚本 (Master + Worker)
REM # 功能: 在同一台机器上部署 Master 和 Worker
REM ################################################################################

setlocal enabledelayedexpansion

REM ==================== 颜色定义 ====================
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "RED=[91m"
set "NC=[0m"

REM ==================== 全局变量 ====================
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "DEFAULT_PORT=3000"
set "DEFAULT_PERF_TIER=medium"

REM ==================== 显示横幅 ====================
cls
echo.
echo %CYAN%╔════════════════════════════════════════════════════════╗%NC%
echo %CYAN%║                                                        ║%NC%
echo %CYAN%║     🚀 Benchmark 同机部署 (Master + Worker)           ║%NC%
echo %CYAN%║                                                        ║%NC%
echo %CYAN%╚════════════════════════════════════════════════════════╝%NC%
echo.

REM ==================== 环境检测 ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%环境检测%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

echo %BLUE%➤ 检查 Node.js 环境...%NC%
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%❌ 未检测到 Node.js%NC%
    echo.
    echo 请先安装 Node.js ^>= 18.0.0
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo %GREEN%✅ Node.js %NODE_VERSION%%NC%
echo.

REM ==================== 配置参数 ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%配置部署参数%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 服务端口
set /p "SERVICE_PORT=Master 服务端口 [默认: %DEFAULT_PORT%]: "
if "%SERVICE_PORT%"=="" set "SERVICE_PORT=%DEFAULT_PORT%"

REM Worker 性能等级
echo.
echo Worker 性能等级:
echo   1) high   - 高配 (16核+, 32GB+)
echo   2) medium - 中配 (4-8核, 8-16GB) [推荐]
echo   3) low    - 低配 (2-4核, 4-8GB)
echo.

:SELECT_PERF
set /p "perf_choice=请选择 [1-3, 默认: 2]: "
if "%perf_choice%"=="" set "perf_choice=2"
if "%perf_choice%"=="1" set "PERF_TIER=high" & goto PERF_SELECTED
if "%perf_choice%"=="2" set "PERF_TIER=medium" & goto PERF_SELECTED
if "%perf_choice%"=="3" set "PERF_TIER=low" & goto PERF_SELECTED
echo %RED%❌ 无效选项%NC%
goto SELECT_PERF

:PERF_SELECTED

REM Worker 名称
set "DEFAULT_WORKER_NAME=LocalWorker-%COMPUTERNAME%"
set /p "WORKER_NAME=Worker 名称 [默认: %DEFAULT_WORKER_NAME%]: "
if "%WORKER_NAME%"=="" set "WORKER_NAME=%DEFAULT_WORKER_NAME%"

REM 获取本机 IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "LOCAL_IP=%%i"
    set "LOCAL_IP=!LOCAL_IP:~1!"
    goto IP_FOUND
)
:IP_FOUND
if "%LOCAL_IP%"=="" set "LOCAL_IP=127.0.0.1"

echo.
echo %GREEN%✅ 配置完成%NC%
echo.
echo   服务端口: %SERVICE_PORT%
echo   本机 IP:  %LOCAL_IP%
echo   Worker 名称: %WORKER_NAME%
echo   性能等级: %PERF_TIER%
echo.

REM ==================== 检查端口 ====================
echo %BLUE%➤ 检查端口 %SERVICE_PORT%...%NC%

netstat -ano | findstr ":%SERVICE_PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo %YELLOW%⚠️  端口 %SERVICE_PORT% 已被占用%NC%
    echo.
    set /p "kill_process=是否终止占用进程? [y/n]: "
    if /i "!kill_process!"=="y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%SERVICE_PORT%" ^| findstr "LISTENING"') do (
            taskkill /F /PID %%a >nul 2>&1
        )
        timeout /t 1 >nul
        echo %GREEN%✅ 端口已释放%NC%
    ) else (
        echo %RED%❌ 端口被占用，无法继续部署%NC%
        pause
        exit /b 1
    )
) else (
    echo %GREEN%✅ 端口 %SERVICE_PORT% 可用%NC%
)
echo.

REM ==================== 安装依赖 ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%安装依赖%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

cd /d "%PROJECT_ROOT%"

if not exist "node_modules" (
    echo %BLUE%➤ 安装 npm 依赖...%NC%
    call npm install
    echo %GREEN%✅ 依赖安装完成%NC%
) else (
    echo %BLUE%ℹ️  依赖已存在%NC%
)
echo.

REM ==================== 构建项目 ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%构建项目%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

echo %BLUE%➤ 编译 TypeScript...%NC%
call npm run build
echo %GREEN%✅ 构建完成%NC%
echo.

REM ==================== 配置 PM2 ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%配置 PM2%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %BLUE%➤ PM2 未安装%NC%
    set /p "install_pm2=是否全局安装 PM2? [y/n]: "
    if /i "!install_pm2!"=="y" (
        call npm install -g pm2
        echo %GREEN%✅ PM2 安装完成%NC%
        set "USE_PM2=true"
    ) else (
        echo %BLUE%ℹ️  将使用前台运行模式%NC%
        set "USE_PM2=false"
    )
) else (
    echo %GREEN%✅ PM2 已安装%NC%
    set "USE_PM2=true"
)
echo.

REM ==================== 启动 Master ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%启动 Master 服务%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 停止旧服务
if "%USE_PM2%"=="true" (
    call pm2 delete benchmark-master 2>nul
)

REM 启动 Master
if "%USE_PM2%"=="true" (
    echo %BLUE%➤ 使用 PM2 启动 Master...%NC%
    set PORT=%SERVICE_PORT%
    call pm2 start "npm start" --name benchmark-master
    call pm2 save
) else (
    echo %BLUE%➤ 在后台启动 Master...%NC%
    start "benchmark-master" /MIN cmd /c "set PORT=%SERVICE_PORT% && npm start"
)

timeout /t 3 /nobreak >nul

REM 验证启动
curl -f -s "http://localhost:%SERVICE_PORT%/" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%✅ Master 启动成功！%NC%
) else (
    echo %RED%❌ Master 启动失败%NC%
    pause
    exit /b 1
)
echo.

REM ==================== 启动 Worker ====================
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%启动 Worker 服务%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 等待 Master 完全就绪
echo %BLUE%➤ 等待 Master 完全启动...%NC%
timeout /t 3 /nobreak >nul

set "retry_count=0"
:WAIT_MASTER_LOOP
curl -f -s "http://localhost:%SERVICE_PORT%/" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%✅ Master 已就绪%NC%
    goto MASTER_READY
)
set /a retry_count+=1
if %retry_count% LSS 10 (
    timeout /t 1 /nobreak >nul
    goto WAIT_MASTER_LOOP
)

:MASTER_READY

REM 停止旧服务
if "%USE_PM2%"=="true" (
    call pm2 delete benchmark-worker-local 2>nul
)

REM 设置环境变量
set "MASTER_URL=http://localhost:%SERVICE_PORT%"
set "WORKER_DESCRIPTION=本机 Worker - Windows %COMPUTERNAME%"
set "WORKER_TAGS=local,same-machine,%PERF_TIER%"

REM 启动 Worker
if "%USE_PM2%"=="true" (
    echo %BLUE%➤ 使用 PM2 启动 Worker...%NC%
    call pm2 start "npx tsx server/worker-client.ts" --name benchmark-worker-local
    call pm2 save
) else (
    echo %BLUE%➤ 在后台启动 Worker...%NC%
    start "benchmark-worker-local" /MIN cmd /c "npx tsx server/worker-client.ts"
)

timeout /t 2 /nobreak >nul
echo %GREEN%✅ Worker 启动成功！%NC%
echo.

REM ==================== 显示结果 ====================
echo.
echo %GREEN%╔════════════════════════════════════════════════════════╗%NC%
echo %GREEN%║                                                        ║%NC%
echo %GREEN%║     🎉 同机部署成功！                                 ║%NC%
echo %GREEN%║                                                        ║%NC%
echo %GREEN%╚════════════════════════════════════════════════════════╝%NC%
echo.
echo %CYAN%📡 访问地址:%NC%
echo    本机: %BLUE%http://localhost:%SERVICE_PORT%%NC%
echo    局域网: %BLUE%http://%LOCAL_IP%:%SERVICE_PORT%%NC%
echo.
echo %CYAN%🖥️  节点管理:%NC%
echo    访问 %BLUE%http://localhost:%SERVICE_PORT%/workers.html%NC%
echo    可在 Web 界面编辑 Worker 配置
echo.
echo %CYAN%💡 提示:%NC%
echo    Master 和 Worker 都在本机运行
echo    可以同时处理 Web 管理和测试执行任务
echo.
echo %CYAN%🎮 管理命令:%NC%
if "%USE_PM2%"=="true" (
    echo    查看状态: %YELLOW%pm2 status%NC%
    echo    查看日志: %YELLOW%pm2 logs%NC%
    echo    重启服务: %YELLOW%pm2 restart all%NC%
    echo    停止服务: %YELLOW%pm2 stop all%NC%
) else (
    echo    查看任务: %YELLOW%tasklist ^| findstr node%NC%
    echo    停止服务: 关闭命令行窗口或使用任务管理器
)
echo.

if "%USE_PM2%"=="false" (
    echo %YELLOW%⚠️  请保持窗口打开，关闭将停止服务%NC%
    echo.
    pause
)

endlocal
