#!/bin/bash

# 任务诊断脚本
echo "=== Benchmark 任务诊断 ==="
echo ""

echo "📊 当前任务状态:"
curl -s http://localhost:3000/api/tasks | jq '.'

echo ""
echo "🔍 运行中的进程:"
ps aux | grep "@bilibili-player/benchmark" | grep -v grep

echo ""
echo "📝 最近的配置文件:"
ls -lht benchmark.config.*.mts 2>/dev/null | head -5

echo ""
echo "🗂️ 任务配置文件数量:"
ls -1 benchmark.config.task_*.mts 2>/dev/null | wc -l

echo ""
echo "💾 当前配置:"
[ -f benchmark.dynamic.json ] && cat benchmark.dynamic.json | jq '.runners | to_entries | map({runner: .key, enabled: .value.enabled})' || echo "配置文件不存在"
