#!/bin/bash

# Benchmark Web Server 启动脚本

echo "🚀 Starting Benchmark Web Server..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# 创建必要的目录
mkdir -p benchmark_report
mkdir -p logs

# 启动服务
echo "🌐 Starting server on http://localhost:3000"
echo "📝 Config page: http://localhost:3000/config.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
