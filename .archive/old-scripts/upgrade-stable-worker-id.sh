#!/bin/bash

echo "======================================"
echo "  升级到稳定 Worker ID 系统"
echo "======================================"
echo

# 1. 备份数据
echo "1️⃣  备份现有数据..."
mkdir -p data/backup
cp data/workers.json data/backup/workers-$(date +%Y%m%d-%H%M%S).json 2>/dev/null || echo "   (workers.json 不存在，跳过)"
cp data/distributed-tasks.json data/backup/distributed-tasks-$(date +%Y%m%d-%H%M%S).json 2>/dev/null || echo "   (distributed-tasks.json 不存在，跳过)"
echo "   ✅ 备份完成 (data/backup/)"
echo

# 2. 清理旧数据
echo "2️⃣  清理旧数据..."
echo "   ⚠️  这会清除所有 Worker 注册和待处理任务"
read -p "   确认继续？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo '[]' > data/workers.json
    echo '{"tasks":[]}' > data/distributed-tasks.json
    echo "   ✅ 数据已清理"
else
    echo "   ❌ 已取消"
    exit 1
fi
echo

# 3. 重新构建
echo "3️⃣  重新构建项目..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ❌ 构建失败"
    exit 1
fi
echo "   ✅ 构建完成"
echo

# 4. 提示下一步
echo "======================================"
echo "  升级完成！"
echo "======================================"
echo
echo "📋 下一步操作:"
echo
echo "1. 重启 Master 服务:"
echo "   npm start"
echo
echo "2. 重启所有 Worker 节点:"
echo "   ./scripts/start-worker-medium.sh"
echo "   (在每台 Worker 机器上执行)"
echo
echo "3. 验证修复:"
echo "   - 观察 Master 日志，应该看到 'Worker registered' 或 'Worker reconnected'"
echo "   - 创建测试用例并运行"
echo "   - 观察 Master 日志，应该看到 '📤 Sending to worker xxx: task-assigned'"
echo "   - 观察 Worker 日志，应该看到 '📋 Task assigned'"
echo
echo "4. 测试 Worker 重连:"
echo "   - 停止 Worker (Ctrl+C)"
echo "   - 重新启动 Worker"
echo "   - Master 应该显示 '🔄 Worker reconnected' (而不是新注册)"
echo "   - Worker ID 应该保持不变"
echo "   - 运行测试，应该成功"
echo
echo "======================================"
echo
echo "📖 详细文档:"
echo "   - STABLE_WORKER_ID_FIX.md (稳定 Worker ID 修复)"
echo "   - CONFIG_FORMAT_FIX.md (配置文件格式修复)"
echo "   - QUICK_TEST_GUIDE.md (快速测试指南)"
echo
echo "🔧 故障排查:"
echo "   - WORKER_TROUBLESHOOTING.md"
echo "   - TROUBLESHOOTING.md"
echo
echo "======================================"
