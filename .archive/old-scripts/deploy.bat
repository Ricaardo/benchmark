@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ################################################################################
REM 🚀 Benchmark Web Server - 智能一键部署脚本 (Windows)
REM 功能: 自动检测环境、安装依赖、启动服务
REM ################################################################################

title Benchmark Web Server - 一键部署

REM ==================== 颜色定义 ====================
REM Windows CMD 不直接支持颜色，使用符号代替

REM ==================== 工具函数 ====================

:print_header
echo.
echo ================================
echo %~1
echo ================================
echo.
goto :eof

:print_success
echo [32m✅ %~1[0m
goto :eof

:print_error
echo [31m❌ %~1[0m
goto :eof

:print_warning
echo [33m⚠️  %~1[0m
goto :eof

:print_info
echo [36mℹ️  %~1[0m
goto :eof

:print_step
echo [36m➤ %~1[0m
goto :eof

REM ==================== 主流程 ====================

:main
cls
echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║                                                   ║
echo ║   🚀 Benchmark Web Server - 一键部署脚本          ║
echo ║                                                   ║
echo ╚═══════════════════════════════════════════════════╝
echo.

REM 环境检测
call :print_header "1️⃣  环境检测"
call :check_node
if errorlevel 1 goto :error_exit
call :check_port

REM 依赖管理
call :print_header "2️⃣  依赖管理"
call :install_dependencies
call :handle_benchmark_package

REM 编译构建
call :print_header "3️⃣  编译构建"
call :build_project

REM 启动服务
call :print_header "4️⃣  启动服务"
call :start_server

goto :eof

REM ==================== 环境检测 ====================

:check_node
call :print_step "检查 Node.js 环境..."

where node >nul 2>&1
if errorlevel 1 (
    call :print_error "未检测到 Node.js"
    echo.
    echo 请先安装 Node.js ^>= 18.0.0:
    echo.
    echo   访问 https://nodejs.org 下载安装
    echo   或使用 Chocolatey: choco install nodejs-lts
    echo.
    pause
    exit /b 1
)

REM 获取 Node.js 版本
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i

REM 移除 'v' 前缀
set NODE_VERSION=%NODE_VERSION:~1%

REM 提取主版本号
for /f "tokens=1 delims=." %%a in ("%NODE_VERSION%") do set MAJOR_VERSION=%%a

if %MAJOR_VERSION% LSS 18 (
    call :print_error "Node.js 版本过低: v%NODE_VERSION% (需要 ^>= v18.0.0)"
    echo.
    echo 请升级 Node.js:
    echo   访问 https://nodejs.org 下载最新 LTS 版本
    echo.
    pause
    exit /b 1
)

call :print_success "Node.js: v%NODE_VERSION%"
call :print_success "npm: v%NPM_VERSION%"
goto :eof

:check_port
call :print_step "检查端口 3000 是否可用..."

netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if not errorlevel 1 (
    call :print_warning "端口 3000 已被占用"
    echo.
    echo 请选择操作:
    echo   1) 终止占用端口的进程
    echo   2) 取消部署
    echo.
    set /p choice="请输入选项 [1/2]: "

    if "!choice!"=="1" (
        call :print_step "终止占用端口 3000 的进程..."
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
            taskkill /F /PID %%a >nul 2>&1
        )
        timeout /t 1 >nul
        call :print_success "端口已释放"
    ) else (
        call :print_info "部署已取消"
        pause
        exit /b 0
    )
) else (
    call :print_success "端口 3000 可用"
)
goto :eof

REM ==================== 依赖安装 ====================

:install_dependencies
call :print_step "检查项目依赖..."

if not exist "node_modules\" (
    call :print_warning "未检测到 node_modules，开始安装依赖..."
    echo.

    if exist "package-lock.json" (
        call :print_info "使用 npm ci 安装依赖 (更快)..."
        npm ci || npm install
    ) else (
        call :print_info "使用 npm install 安装依赖..."
        npm install
    )

    echo.
    call :print_success "依赖安装完成"
) else (
    call :print_success "依赖已安装"
)
goto :eof

:handle_benchmark_package
call :print_step "检查 @bilibili-player/benchmark 包..."

npm list @bilibili-player/benchmark >nul 2>&1
if errorlevel 1 (
    call :print_warning "@bilibili-player/benchmark 包未安装 (这是正常的)"
    echo.
    echo 📝 说明:
    echo   • 这是 B站内部私有包，无法从公共 npm 获取
    echo   • 不影响 Web 服务器运行
    echo   • 你仍然可以使用配置管理功能
    echo   • 但无法运行实际的性能测试
    echo.
    echo 💡 如果需要运行测试，请查看: INSTALL.md
    echo.
) else (
    call :print_success "@bilibili-player/benchmark 已安装"
)
goto :eof

REM ==================== 编译构建 ====================

:build_project
call :print_step "编译 TypeScript 代码..."

if not exist "dist\" (
    npm run build
    call :print_success "编译完成"
) else (
    call :print_success "代码已是最新"
)
goto :eof

REM ==================== 启动服务 ====================

:start_server
call :print_step "启动服务器..."
echo.

REM 显示成功信息
call :show_success_info

REM 等待2秒后打开浏览器
timeout /t 2 >nul
start http://localhost:3000

REM 启动开发服务器（前台运行）
npm run dev

goto :eof

:show_success_info
echo.
echo ╔════════════════════════════════════════════════╗
echo ║                                                ║
echo ║     🎉 准备启动服务器...                      ║
echo ║                                                ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 📍 访问地址:
echo    http://localhost:3000          - 主页
echo    http://localhost:3000/config.html - 配置管理
echo.
echo 🎮 功能快速入口:
echo    • 配置测试用例
echo    • 管理测试任务
echo    • 查看实时输出
echo    • 查看测试报告
echo.
echo 📚 文档:
echo    • QUICKSTART.md          - 快速开始指南
echo    • CONFIG_PRESETS_GUIDE.md - 配置预设指南
echo    • BILIBILI_LIVE_PRESETS.md - B站直播预设
echo.
echo 🛑 停止服务:
echo    按 Ctrl+C 停止服务器
echo.
echo ⚠️  提示: 浏览器将在2秒后自动打开
echo.
goto :eof

:error_exit
echo.
call :print_error "部署失败，请检查上述错误信息"
pause
exit /b 1

REM 执行主流程
call :main
