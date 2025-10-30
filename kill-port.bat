@echo off
REM 清理端口占用的脚本 (Windows)

SET PORT=%1
IF "%PORT%"=="" SET PORT=3000

echo 🔍 正在检查端口 %PORT%...

REM 查找占用端口的进程
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') DO (
    SET PID=%%P
)

IF "%PID%"=="" (
    echo ✅ 端口 %PORT% 未被占用
    exit /b 0
)

echo 📌 发现进程 PID: %PID% 正在使用端口 %PORT%

REM 获取进程信息
FOR /F "tokens=1" %%N IN ('tasklist /FI "PID eq %PID%" /NH') DO (
    echo    进程: %%N
)

SET /P CONFIRM="是否终止该进程? (y/n): "
IF /I "%CONFIRM%"=="y" (
    taskkill /F /PID %PID% >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        echo ✅ 端口 %PORT% 已清理
    ) ELSE (
        echo ❌ 清理失败，可能需要管理员权限
        echo    请以管理员身份运行此脚本
    )
) ELSE (
    echo ⏸️  操作已取消
)

pause
