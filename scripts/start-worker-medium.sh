#!/bin/bash

# 中配 Worker 启动脚本
# 适用于: 中等性能机器，执行常规测试

# Master 服务器地址（修改为实际地址）
export MASTER_URL="${MASTER_URL:-http://10.23.182.34:3000}"

# Worker 配置
export WORKER_NAME="中配测试机-1"
export PERFORMANCE_TIER="medium"
export WORKER_DESCRIPTION="中等性能工作站 - $(uname -m) CPU, $(sysctl -n hw.memsize 2>/dev/null || free -h | awk '/^Mem:/ {print $2}') RAM"
export WORKER_TAGS="medium-performance,testing"
export WORKER_PORT="0"

echo "========================================="
echo "  启动中配 Worker 节点"
echo "========================================="
echo "Master URL:     $MASTER_URL"
echo "Worker Name:    $WORKER_NAME"
echo "Performance:    ⚡ $PERFORMANCE_TIER"
echo "Description:    $WORKER_DESCRIPTION"
echo "Tags:           $WORKER_TAGS"
echo "========================================="
echo ""

# 检查 Master 服务器连通性
echo "检查 Master 连通性..."
if ! curl -s -f "$MASTER_URL/api/workers" > /dev/null 2>&1; then
    echo "⚠️  警告: 无法连接到 Master 服务器 ($MASTER_URL)"
    echo "请确认:"
    echo "  1. Master 服务器已启动"
    echo "  2. MASTER_URL 配置正确"
    echo "  3. 网络连接正常"
    echo ""
    read -p "是否继续启动? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ Master 连接正常"
fi

echo ""
echo "启动 Worker 客户端..."
echo ""

# 启动 Worker
npx tsx server/worker-client.ts
