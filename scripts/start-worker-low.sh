#!/bin/bash

# 低配 Worker 启动脚本
# 适用于: 低性能机器，执行轻量级测试和兼容性测试

# Master 服务器地址（修改为实际地址）
export MASTER_URL="${MASTER_URL:-http://localhost:3000}"

# Worker 配置
# 注意：不设置 WORKER_NAME，让系统使用 WORKER_DESCRIPTION 作为节点名称
export PERFORMANCE_TIER="low"
export WORKER_DESCRIPTION="低配 $(uname -m) - $(uname -s)"
export WORKER_TAGS="low-performance,compatibility"
export WORKER_PORT="0"

# 如果需要自定义名称，可以取消注释下面这行：
# export WORKER_NAME="我的自定义名称"

echo "========================================="
echo "  启动低配 Worker 节点"
echo "========================================="
echo "Master URL:     $MASTER_URL"
echo "Node Name:      ${WORKER_NAME:-$WORKER_DESCRIPTION}"
echo "Performance:    💡 $PERFORMANCE_TIER"
echo "Description:    $WORKER_DESCRIPTION"
echo "Tags:           $WORKER_TAGS"
echo "========================================="
echo ""
echo "💡 提示: 节点名称将显示为 \"$WORKER_DESCRIPTION\""
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
