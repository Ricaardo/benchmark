@echo off
REM Benchmark Web Server 启动脚本 (Windows)

echo 🚀 Starting Benchmark Web Server...

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM 检查 npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: npm is not installed
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ npm version:
npm --version

REM 检查依赖
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM 创建必要的目录
if not exist "benchmark_report" mkdir benchmark_report
if not exist "logs" mkdir logs

REM 启动服务
echo.
echo 🌐 Starting server on http://localhost:3000
echo 📝 Config page: http://localhost:3000/config.html
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
