@echo off
chcp 65001 >nul
REM ################################################################################
REM # Windows 单机一键部署脚本
REM # 功能: 在当前 Windows 机器上快速部署 Master 或 Worker 节点
REM ################################################################################

setlocal enabledelayedexpansion

REM ==================== 颜色定义 (Windows 10+) ====================
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "CYAN=[96m"
set "RED=[91m"
set "NC=[0m"

REM ==================== 全局变量 ====================
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "CONFIG_FILE=%PROJECT_ROOT%\.deploy-local.json"

REM ==================== 显示横幅 ====================
cls
echo.
echo %CYAN%╔════════════════════════════════════════════════════════╗%NC%
echo %CYAN%║                                                        ║%NC%
echo %CYAN%║     🚀 Benchmark 单机一键部署 (Windows)                ║%NC%
echo %CYAN%║                                                        ║%NC%
echo %CYAN%╚════════════════════════════════════════════════════════╝%NC%
echo.

REM ==================== 检查 Node.js ====================
echo %BLUE%➤ 检查 Node.js 环境...%NC%
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%❌ 未检测到 Node.js%NC%
    echo.
    echo 请先安装 Node.js ^>= 18.0.0:
    echo   下载地址: https://nodejs.org
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo %GREEN%✅ Node.js %NODE_VERSION%%NC%
echo.

REM ==================== 角色选择 ====================
:SELECT_ROLE
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%选择部署角色%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.
echo 请选择要部署的角色:
echo.
echo   1) Master 节点 (主控服务器 + Web UI)
echo   2) Worker 节点 (测试执行节点)
echo   3) Master + Worker (同机部署)
echo   4) 取消
echo.

set /p "role_choice=请输入选项 [1-4]: "

if "%role_choice%"=="1" (
    set "DEPLOY_ROLE=master"
    goto CONFIGURE_MASTER
)
if "%role_choice%"=="2" (
    set "DEPLOY_ROLE=worker"
    goto CONFIGURE_WORKER
)
if "%role_choice%"=="3" (
    set "DEPLOY_ROLE=both"
    goto CONFIGURE_BOTH
)
if "%role_choice%"=="4" (
    echo %BLUE%ℹ️  已取消%NC%
    exit /b 0
)

echo %RED%❌ 无效选项%NC%
goto SELECT_ROLE

REM ==================== 配置 Master ====================
:CONFIGURE_MASTER
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%配置 Master 节点%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

set /p "service_port=Web 服务端口 [默认: 3000]: "
if "%service_port%"=="" set "service_port=3000"

REM 获取本机 IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "local_ip=%%i"
    set "local_ip=!local_ip:~1!"
    goto IP_FOUND
)
:IP_FOUND

if "%local_ip%"=="" set "local_ip=127.0.0.1"
echo %BLUE%ℹ️  检测到本机 IP: %local_ip%%NC%

REM 保存配置
(
echo {
echo   "role": "master",
echo   "service_port": %service_port%,
echo   "local_ip": "%local_ip%",
echo   "configured_at": "%date% %time%"
echo }
) > "%CONFIG_FILE%"

echo %GREEN%✅ Master 配置已保存%NC%
goto INSTALL_DEPS

REM ==================== 配置 Worker ====================
:CONFIGURE_WORKER
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%配置 Worker 节点%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 自动扫描局域网寻找 Master
echo %BLUE%➤ 正在扫描局域网，寻找 Master 服务器...%NC%
echo.

REM 获取本机 IP 地址
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "local_ip=%%a"
    set "local_ip=!local_ip:~1!"
    goto :SCAN_IP_FOUND
)
:SCAN_IP_FOUND

if not "%local_ip%"=="" (
    REM 提取网段前缀 (例如: 192.168.1)
    for /f "tokens=1-3 delims=." %%a in ("%local_ip%") do (
        set "subnet_prefix=%%a.%%b.%%c"
    )

    echo %BLUE%ℹ️  检测到本机网段: !subnet_prefix!.x%NC%
    echo %BLUE%ℹ️  正在扫描常见 IP...%NC%
    echo.

    set "found_count=0"
    set "found_masters="

    REM 扫描常见 IP 地址
    for %%i in (100 101 102 103 104 105 1 2 10 20 50) do (
        set "test_ip=!subnet_prefix!.%%i"
        curl -f -s --max-time 1 "http://!test_ip!:3000/" >nul 2>nul
        if !ERRORLEVEL! EQU 0 (
            set /a found_count+=1
            if !found_count! EQU 1 (
                set "found_masters=!test_ip!:3000"
            ) else (
                set "found_masters=!found_masters!,!test_ip!:3000"
            )
            echo   %GREEN%✓%NC% 发现 Master: http://!test_ip!:3000
        )
    )

    echo.
    if !found_count! GTR 0 (
        echo %GREEN%✅ 找到 !found_count! 个 Master 服务器%NC%
        echo.
        echo 请选择要连接的 Master:

        set "idx=1"
        for %%m in (!found_masters!) do (
            echo   !idx!) http://%%m
            set /a idx+=1
        )
        echo   !idx!) 手动输入其他地址
        echo.

        :SELECT_MASTER
        set /p "master_choice=请选择 [1-!idx!]: "

        if !master_choice! LSS !idx! (
            REM 使用扫描到的 Master
            set "current_idx=1"
            for %%m in (!found_masters!) do (
                if !current_idx! EQU !master_choice! (
                    for /f "tokens=1 delims=:" %%a in ("%%m") do set "master_ip=%%a"
                    for /f "tokens=2 delims=:" %%b in ("%%m") do set "master_port=%%b"
                    set "MASTER_URL=http://%%m"
                    echo %GREEN%✅ 已选择: !MASTER_URL!%NC%
                    goto :MASTER_SELECTED
                )
                set /a current_idx+=1
            )
        ) else if !master_choice! EQU !idx! (
            echo %BLUE%ℹ️  手动输入 Master 地址%NC%
            goto :MANUAL_INPUT
        ) else (
            echo %RED%❌ 无效选项%NC%
            goto :SELECT_MASTER
        )
    ) else (
        echo %YELLOW%⚠️  未找到 Master 服务器（可能不在同一网段）%NC%
        echo.
    )
)

:MANUAL_INPUT
REM 手动输入 Master 信息
echo.
echo 请手动输入 Master 服务器信息:
echo.

set /p "master_ip=Master IP 地址: "
set /p "master_port=Master 端口 [默认: 3000]: "
if "%master_port%"=="" set "master_port=3000"

set "MASTER_URL=http://%master_ip%:%master_port%"

echo %BLUE%➤ 测试连接到 Master: %MASTER_URL%%NC%
curl -f -s --max-time 5 "%MASTER_URL%/" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo %GREEN%✅ 连接成功！%NC%
) else (
    echo %YELLOW%⚠️  无法连接到 Master (将继续使用此配置)%NC%
)

:MASTER_SELECTED

REM Worker 名称
set "default_name=Worker-%COMPUTERNAME%"
set /p "worker_name=Worker 名称 [默认: %default_name%]: "
if "%worker_name%"=="" set "worker_name=%default_name%"

REM 性能等级
echo.
echo 请选择性能等级:
echo   1) high   - 高配 (16核+, 32GB+)
echo   2) medium - 中配 (4-8核, 8-16GB) [推荐]
echo   3) low    - 低配 (2-4核, 4-8GB)
echo   4) custom - 自定义
echo.

:SELECT_PERF
set /p "perf_choice=请选择 [1-4]: "
if "%perf_choice%"=="1" set "performance_tier=high" & goto PERF_SELECTED
if "%perf_choice%"=="2" set "performance_tier=medium" & goto PERF_SELECTED
if "%perf_choice%"=="3" set "performance_tier=low" & goto PERF_SELECTED
if "%perf_choice%"=="4" set "performance_tier=custom" & goto PERF_SELECTED
echo %RED%❌ 无效选项%NC%
goto SELECT_PERF

:PERF_SELECTED

REM 描述信息
set "default_desc=Windows %COMPUTERNAME%"
set /p "worker_desc=描述信息 [默认: %default_desc%]: "
if "%worker_desc%"=="" set "worker_desc=%default_desc%"

REM 标签
set /p "worker_tags=标签 (逗号分隔) [可选]: "

REM 保存配置
(
echo {
echo   "role": "worker",
echo   "master_url": "%MASTER_URL%",
echo   "worker_name": "%worker_name%",
echo   "performance_tier": "%performance_tier%",
echo   "description": "%worker_desc%",
echo   "tags": "%worker_tags%",
echo   "configured_at": "%date% %time%"
echo }
) > "%CONFIG_FILE%"

echo %GREEN%✅ Worker 配置已保存%NC%
goto INSTALL_DEPS

REM ==================== 配置同机部署 ====================
:CONFIGURE_BOTH
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%配置同机部署 (Master + Worker)%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

set /p "service_port=Web 服务端口 [默认: 3000]: "
if "%service_port%"=="" set "service_port=3000"

REM 获取本机 IP
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "local_ip=%%i"
    set "local_ip=!local_ip:~1!"
    goto :BOTH_IP_FOUND
)
:BOTH_IP_FOUND

if "%local_ip%"=="" set "local_ip=127.0.0.1"
echo %BLUE%ℹ️  检测到本机 IP: %local_ip%%NC%

REM Worker 配置
set "worker_name=Worker-%COMPUTERNAME%"
set "performance_tier=medium"
set "worker_desc=本机 Worker - Windows"

REM 保存配置
(
echo {
echo   "role": "both",
echo   "service_port": %service_port%,
echo   "local_ip": "%local_ip%",
echo   "worker_name": "%worker_name%",
echo   "performance_tier": "%performance_tier%",
echo   "worker_description": "%worker_desc%",
echo   "configured_at": "%date% %time%"
echo }
) > "%CONFIG_FILE%"

echo %GREEN%✅ 同机部署配置已保存%NC%
goto INSTALL_DEPS

REM ==================== 安装依赖 ====================
:INSTALL_DEPS
echo.
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
    set /p "reinstall=是否重新安装依赖？[y/n]: "
    if /i "%reinstall%"=="y" (
        call npm install
        echo %GREEN%✅ 依赖重新安装完成%NC%
    )
)

REM ==================== 构建项目 ====================
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%构建项目%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

echo %BLUE%➤ 编译 TypeScript...%NC%
call npm run build
echo %GREEN%✅ 构建完成%NC%

REM ==================== 安装 PM2 ====================
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%配置 PM2%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %BLUE%➤ PM2 未安装%NC%
    set /p "install_pm2=是否全局安装 PM2？[y/n]: "
    if /i "!install_pm2!"=="y" (
        call npm install -g pm2
        echo %GREEN%✅ PM2 安装完成%NC%
        set "USE_PM2=true"
    ) else (
        echo %BLUE%ℹ️  跳过 PM2，将使用 npm start%NC%
        set "USE_PM2=false"
    )
) else (
    echo %GREEN%✅ PM2 已安装%NC%
    set "USE_PM2=true"
)

REM ==================== 启动服务 ====================
if "%DEPLOY_ROLE%"=="master" goto START_MASTER
if "%DEPLOY_ROLE%"=="worker" goto START_WORKER
if "%DEPLOY_ROLE%"=="both" goto START_BOTH

REM ==================== 启动 Master ====================
:START_MASTER
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%启动 Master 服务%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 读取配置
for /f "tokens=2 delims=:, " %%i in ('type "%CONFIG_FILE%" ^| findstr "service_port"') do set "service_port=%%i"
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "local_ip"') do (
    set "local_ip=%%i"
    set "local_ip=!local_ip:~2,-2!"
)

REM 停止旧服务
if "%USE_PM2%"=="true" (
    call pm2 delete benchmark-master 2>nul
) else (
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq benchmark-master*" 2>nul
)

REM 启动服务
if "%USE_PM2%"=="true" (
    echo %BLUE%➤ 使用 PM2 启动 Master...%NC%
    REM 创建临时启动脚本
    echo @echo off > %TEMP%\start-master.bat
    echo set PORT=%service_port% >> %TEMP%\start-master.bat
    echo npm start >> %TEMP%\start-master.bat
    call pm2 start %TEMP%\start-master.bat --name benchmark-master
    call pm2 save
) else (
    echo %BLUE%➤ 使用 npm 启动 Master...%NC%
    start "benchmark-master" /MIN cmd /c "set PORT=%service_port% && npm start"
)

timeout /t 5 /nobreak >nul

echo.
echo %GREEN%╔════════════════════════════════════════════════════════╗%NC%
echo %GREEN%║                    部署成功！                          ║%NC%
echo %GREEN%╚════════════════════════════════════════════════════════╝%NC%
echo.
echo %CYAN%📡 访问地址:%NC%
echo    本机: %BLUE%http://localhost:%service_port%%NC%
echo    局域网: %BLUE%http://%local_ip%:%service_port%%NC%
echo.
echo %CYAN%🖥️  节点管理:%NC%
echo    访问 %BLUE%http://localhost:%service_port%/workers.html%NC%
echo    可在 Web 界面编辑节点配置（性能等级、描述等）
echo.
echo %CYAN%🎮 管理命令:%NC%
if "%USE_PM2%"=="true" (
    echo    查看状态: %YELLOW%pm2 status%NC%
    echo    查看日志: %YELLOW%pm2 logs benchmark-master%NC%
    echo    重启服务: %YELLOW%pm2 restart benchmark-master%NC%
    echo    停止服务: %YELLOW%pm2 stop benchmark-master%NC%
) else (
    echo    停止服务: 关闭命令行窗口或使用任务管理器
)
echo.
echo %CYAN%📋 下一步:%NC%
echo    在其他机器上运行此脚本，选择 Worker 模式
echo    Worker 连接到: %BLUE%http://%local_ip%:%service_port%%NC%
echo.

if "%USE_PM2%"=="false" (
    echo %YELLOW%⚠️  请保持此窗口打开，关闭将停止服务%NC%
    echo.
    pause
)
goto END

REM ==================== 启动 Worker ====================
:START_WORKER
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%启动 Worker 服务%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 读取配置
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "master_url"') do (
    set "master_url=%%i"
    set "master_url=!master_url:~3,-2!"
)
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "worker_name"') do (
    set "worker_name=%%i"
    set "worker_name=!worker_name:~3,-2!"
)
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "performance_tier"') do (
    set "perf_tier=%%i"
    set "perf_tier=!perf_tier:~3,-2!"
)
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "description"') do (
    set "description=%%i"
    set "description=!description:~3,-2!"
)
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "tags"') do (
    set "tags=%%i"
    set "tags=!tags:~3,-2!"
)

REM 设置环境变量
set "MASTER_URL=%master_url%"
set "WORKER_NAME=%worker_name%"
set "PERFORMANCE_TIER=%perf_tier%"
set "WORKER_DESCRIPTION=%description%"
set "WORKER_TAGS=%tags%"

REM 停止旧服务
if "%USE_PM2%"=="true" (
    call pm2 delete benchmark-worker-%perf_tier% 2>nul
) else (
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq benchmark-worker*" 2>nul
)

REM 启动服务
if "%USE_PM2%"=="true" (
    echo %BLUE%➤ 使用 PM2 启动 Worker...%NC%
    call pm2 start "npx tsx server/worker-client.ts" --name benchmark-worker-%perf_tier%
    call pm2 save
) else (
    echo %BLUE%➤ 使用 npx 启动 Worker...%NC%
    start "benchmark-worker" /MIN cmd /c "npx tsx server/worker-client.ts"
)

timeout /t 3 /nobreak >nul

echo.
echo %GREEN%╔════════════════════════════════════════════════════════╗%NC%
echo %GREEN%║                    部署成功！                          ║%NC%
echo %GREEN%╚════════════════════════════════════════════════════════╝%NC%
echo.
echo %CYAN%🔧 Worker 信息:%NC%
echo    名称: %BLUE%!worker_name!%NC%
echo    性能等级: %BLUE%!perf_tier!%NC%
echo    连接到: %BLUE%!master_url!%NC%
echo.
echo %CYAN%💡 提示:%NC%
echo    可在 Master Web 界面修改节点配置
echo    访问: %BLUE%!master_url!/workers.html%NC%
echo    即使 Worker 重启，配置也会保留
echo.
echo %CYAN%🎮 管理命令:%NC%
if "%USE_PM2%"=="true" (
    echo    查看状态: %YELLOW%pm2 status%NC%
    echo    查看日志: %YELLOW%pm2 logs benchmark-worker-!perf_tier!%NC%
    echo    重启服务: %YELLOW%pm2 restart benchmark-worker-!perf_tier!%NC%
    echo    停止服务: %YELLOW%pm2 stop benchmark-worker-!perf_tier!%NC%
) else (
    echo    停止服务: 关闭命令行窗口或使用任务管理器
)
echo.
echo %CYAN%💡 提示:%NC%
echo    访问 Master Web UI 查看此 Worker 是否已连接
echo.

if "%USE_PM2%"=="false" (
    echo %YELLOW%⚠️  请保持此窗口打开，关闭将停止服务%NC%
    echo.
    pause
)
goto END

REM ==================== 启动同机部署 ====================
:START_BOTH
REM 先启动 Master
call :START_MASTER_INTERNAL

echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%启动 Worker 服务 (本机)%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

REM 读取配置
for /f "tokens=2 delims=:, " %%i in ('type "%CONFIG_FILE%" ^| findstr "service_port"') do set "master_port=%%i"
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "worker_name"') do (
    set "worker_name=%%i"
    set "worker_name=!worker_name:~3,-2!"
)
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "performance_tier"') do (
    set "perf_tier=%%i"
    set "perf_tier=!perf_tier:~3,-2!"
)

REM 设置环境变量
set "MASTER_URL=http://localhost:!master_port!"
set "WORKER_NAME=!worker_name!"
set "PERFORMANCE_TIER=!perf_tier!"
set "WORKER_DESCRIPTION=本机 Worker"
set "WORKER_TAGS=local,same-machine"

REM 等待 Master 启动
echo %BLUE%➤ 等待 Master 完全启动...%NC%
timeout /t 5 /nobreak >nul

REM 验证 Master 是否启动成功
set "retry_count=0"
:WAIT_MASTER_LOOP
curl -f -s --max-time 1 "http://localhost:!master_port!/" >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    echo %GREEN%✅ Master 已就绪%NC%
    goto :MASTER_READY
)
set /a retry_count+=1
if !retry_count! LSS 10 (
    timeout /t 1 /nobreak >nul
    goto :WAIT_MASTER_LOOP
)

:MASTER_READY
REM 启动 Worker
if "%USE_PM2%"=="true" (
    echo %BLUE%➤ 使用 PM2 启动 Worker...%NC%
    call pm2 start "npx tsx server/worker-client.ts" --name benchmark-worker-local
    call pm2 save
) else (
    echo %BLUE%➤ 启动 Worker...%NC%
    start "benchmark-worker-local" /MIN cmd /c "npx tsx server/worker-client.ts"
)

timeout /t 2 /nobreak >nul

echo %GREEN%✅ Worker 已启动（连接到本机 Master）%NC%
echo.
echo %CYAN%💡 提示:%NC%
echo    Master 和 Worker 都在本机运行
echo    可以同时处理 Web 管理和测试执行任务
echo.

if "%USE_PM2%"=="false" (
    echo %YELLOW%⚠️  请保持两个窗口打开，关闭将停止服务%NC%
    echo.
    pause
)
goto END

REM ==================== 内部启动 Master (用于 both 模式) ====================
:START_MASTER_INTERNAL
echo.
echo %CYAN%════════════════════════════════════════%NC%
echo %CYAN%启动 Master 服务%NC%
echo %CYAN%════════════════════════════════════════%NC%
echo.

for /f "tokens=2 delims=:, " %%i in ('type "%CONFIG_FILE%" ^| findstr "service_port"') do set "service_port=%%i"
for /f "tokens=2 delims=:" %%i in ('type "%CONFIG_FILE%" ^| findstr "local_ip"') do (
    set "local_ip=%%i"
    set "local_ip=!local_ip:~2,-2!"
)

if "%USE_PM2%"=="true" (
    call pm2 delete benchmark-master 2>nul
    REM 创建临时启动脚本
    echo @echo off > %TEMP%\start-master.bat
    echo set PORT=%service_port% >> %TEMP%\start-master.bat
    echo npm start >> %TEMP%\start-master.bat
    call pm2 start %TEMP%\start-master.bat --name benchmark-master
    call pm2 save
) else (
    taskkill /F /IM node.exe /FI "WINDOWTITLE eq benchmark-master*" 2>nul
    start "benchmark-master" /MIN cmd /c "set PORT=%service_port% && npm start"
)

timeout /t 5 /nobreak >nul
echo %GREEN%✅ Master 已启动%NC%
goto :EOF

:END
endlocal
