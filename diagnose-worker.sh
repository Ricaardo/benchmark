#!/bin/bash

echo "======================================"
echo "  Worker 分布式任务诊断工具"
echo "======================================"
echo

# 1. 检查 Worker 状态
echo "1️⃣  检查 Worker 连接状态..."
echo
curl -s http://10.23.182.34:3000/api/workers | python3 -c "
import sys, json
data = json.load(sys.stdin)
workers = data.get('workers', [])
online = [w for w in workers if w['status'] == 'online']
print(f'总Worker数: {len(workers)}')
print(f'在线Worker: {len(online)}')
print()
for w in online:
    print(f'  ✅ {w[\"name\"]} (ID: {w[\"id\"][:8]}...)')
    print(f'     性能等级: {w.get(\"performanceTier\", \"N/A\")}')
    print(f'     当前任务: {w.get(\"currentTask\", \"无\")}')
    print()
"

echo

# 2. 检查任务状态
echo "2️⃣  检查分布式任务状态..."
echo
curl -s http://10.23.182.34:3000/api/distributed-tasks | python3 -c "
import sys, json
data = json.load(sys.stdin)
tasks = data.get('tasks', [])
stats = data.get('stats', {})

print(f'总任务数: {stats.get(\"total\", 0)}')
print(f'待处理: {stats.get(\"pending\", 0)}')
print(f'已分发: {stats.get(\"dispatched\", 0)}')
print(f'运行中: {stats.get(\"running\", 0)}')
print(f'已完成: {stats.get(\"completed\", 0)}')
print(f'失败: {stats.get(\"failed\", 0)}')
print()

# 显示最近的任务
print('📋 最近的任务:')
for t in tasks[:5]:
    print(f'  - {t[\"id\"][:8]}... [{t[\"status\"]}] Worker: {t.get(\"workerName\", \"N/A\")}')
"

echo
echo

# 3. 检查 WebSocket 连接
echo "3️⃣  检查当前 Worker WebSocket 连接..."
echo "   (需要在 Worker 终端查看是否显示 '✅ WebSocket connected')"
echo

# 4. 测试任务分发
echo "4️⃣  测试手动分发任务..."
echo
echo "   运行以下命令在浏览器 Console 中测试:"
echo
echo "   // 查看在线 Worker"
echo "   fetch('/api/workers').then(r => r.json()).then(d => {"
echo "       const online = d.workers.filter(w => w.status === 'online');"
echo "       console.log('在线 Worker:', online);"
echo "       return online[0]; // 获取第一个在线 Worker"
echo "   });"
echo

# 5. 建议
echo
echo "======================================"
echo "  诊断建议"
echo "======================================"
echo
echo "✓ 如果 Worker 显示在线但收不到任务:"
echo "  1. 重启 Worker 进程 (Ctrl+C 然后重新运行)"
echo "  2. 检查 Worker 终端是否显示 'Task assigned'"
echo "  3. 检查 Master 日志是否有错误"
echo
echo "✓ 如果任务一直处于 'dispatched' 状态:"
echo "  1. Worker 可能已离线 - 检查 Worker 进程"
echo "  2. WebSocket 连接可能断开 - 重启 Worker"
echo "  3. testCase 数据可能不完整 - 检查测试用例配置"
echo
echo "✓ 查看详细日志:"
echo "  - Master 日志: npm start 的终端输出"
echo "  - Worker 日志: start-worker-*.sh 的终端输出"
echo "  - 前端日志: 浏览器 Console (F12)"
echo
echo "======================================"
echo

# 6. 快速修复
echo "🔧 快速修复步骤:"
echo
echo "1. 重启 Worker:"
echo "   ./scripts/start-worker-medium.sh"
echo
echo "2. 刷新前端页面 (Ctrl+Shift+R)"
echo
echo "3. 创建新的测试用例并运行"
echo
echo "4. 观察 Worker 终端是否显示:"
echo "   📋 Task assigned: task_xxx"
echo "   ▶️  Executing: ..."
echo
echo "======================================"
