#!/bin/bash

# 清理端口占用的脚本

PORT=${1:-3000}

echo "🔍 正在检查端口 $PORT..."

# 查找占用端口的进程
PID=$(lsof -ti :$PORT 2>/dev/null)

if [ -z "$PID" ]; then
    echo "✅ 端口 $PORT 未被占用"
    exit 0
fi

echo "📌 发现进程 PID: $PID 正在使用端口 $PORT"

# 获取进程信息
PROCESS_INFO=$(ps -p $PID -o comm= 2>/dev/null)
echo "   进程: $PROCESS_INFO"

# 询问是否终止
read -p "是否终止该进程? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kill -9 $PID 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ 端口 $PORT 已清理"
    else
        echo "❌ 清理失败，可能需要管理员权限"
        echo "   请尝试: sudo $0 $PORT"
    fi
else
    echo "⏸️  操作已取消"
fi
