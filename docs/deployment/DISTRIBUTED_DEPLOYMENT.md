# 分布式测试部署指南

## 概述

本指南介绍如何部署分布式 Benchmark 测试系统，支持在多台机器上并行执行测试任务。

## 系统架构

```
┌─────────────┐
│   Master    │  主控节点 (运行 Web UI + API)
│  Server     │
└──────┬──────┘
       │
       ├──────────┬──────────┬──────────
       │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼────┐
  │ Worker │ │ Worker │ │ Worker │
  │  高配  │ │  中配  │ │  低配  │
  └────────┘ └────────┘ └────────┘
```

## 三机部署方案

### 机器规格建议

| 性能等级 | CPU核心 | 内存 | 适用场景 |
|---------|---------|------|---------|
| 🔥 高配 | 8核+ | 16GB+ | 高负载、复杂场景测试 |
| ⚡ 中配 | 4-8核 | 8-16GB | 常规功能测试 |
| 💡 低配 | 2-4核 | 4-8GB | 轻量级测试、兼容性测试 |

## 部署步骤

### 1. Master 节点部署

**机器要求**: 任意配置，推荐中配及以上

```bash
# 克隆项目
git clone <repository-url>
cd benchmark

# 安装依赖
npm install

# 构建项目
npm run build

# 启动 Master 服务器
PORT=3000 npm start
```

访问 `http://<master-ip>:3000` 确认服务正常运行。

### 2. Worker 节点部署

在每台 Worker 机器上执行：

```bash
# 克隆项目
git clone <repository-url>
cd benchmark

# 安装依赖
npm install

# 构建项目（Worker 也需要构建以运行 TypeScript）
npm run build
```

### 3. 启动 Worker 客户端

#### 方式一：使用环境变量

**高配机器**:
```bash
MASTER_URL=http://<master-ip>:3000 \
WORKER_NAME="高配测试机-1" \
PERFORMANCE_TIER=high \
WORKER_DESCRIPTION="MacBook Pro M2 Max, 32GB RAM, macOS" \
WORKER_TAGS="mac,high-performance" \
npx tsx server/worker-client.ts
```

**中配机器**:
```bash
MASTER_URL=http://<master-ip>:3000 \
WORKER_NAME="中配测试机-1" \
PERFORMANCE_TIER=medium \
WORKER_DESCRIPTION="Dell XPS 15, 16GB RAM, Windows 11" \
WORKER_TAGS="windows,medium-performance" \
npx tsx server/worker-client.ts
```

**低配机器**:
```bash
MASTER_URL=http://<master-ip>:3000 \
WORKER_NAME="低配测试机-1" \
PERFORMANCE_TIER=low \
WORKER_DESCRIPTION="旧款 ThinkPad, 8GB RAM, Ubuntu" \
WORKER_TAGS="linux,low-performance" \
npx tsx server/worker-client.ts
```

#### 方式二：使用启动脚本

创建 `start-worker-high.sh`:
```bash
#!/bin/bash

export MASTER_URL="http://192.168.1.100:3000"
export WORKER_NAME="高配测试机-1"
export PERFORMANCE_TIER="high"
export WORKER_DESCRIPTION="MacBook Pro M2 Max, 32GB RAM"
export WORKER_TAGS="mac,production"

npx tsx server/worker-client.ts
```

创建 `start-worker-medium.sh`:
```bash
#!/bin/bash

export MASTER_URL="http://192.168.1.100:3000"
export WORKER_NAME="中配测试机-1"
export PERFORMANCE_TIER="medium"
export WORKER_DESCRIPTION="Dell XPS 15, 16GB RAM"
export WORKER_TAGS="windows,testing"

npx tsx server/worker-client.ts
```

创建 `start-worker-low.sh`:
```bash
#!/bin/bash

export MASTER_URL="http://192.168.1.100:3000"
export WORKER_NAME="低配测试机-1"
export PERFORMANCE_TIER="low"
export WORKER_DESCRIPTION="ThinkPad T480, 8GB RAM"
export WORKER_TAGS="linux,compatibility"

npx tsx server/worker-client.ts
```

授予执行权限：
```bash
chmod +x start-worker-*.sh
```

启动 Worker：
```bash
./start-worker-high.sh
# 或
./start-worker-medium.sh
# 或
./start-worker-low.sh
```

### 4. Windows 批处理脚本

创建 `start-worker-high.bat`:
```batch
@echo off
set MASTER_URL=http://192.168.1.100:3000
set WORKER_NAME=高配测试机-1
set PERFORMANCE_TIER=high
set WORKER_DESCRIPTION=高性能工作站, 32GB RAM, Windows 11
set WORKER_TAGS=windows,high-performance

npx tsx server/worker-client.ts
```

创建 `start-worker-medium.bat`:
```batch
@echo off
set MASTER_URL=http://192.168.1.100:3000
set WORKER_NAME=中配测试机-1
set PERFORMANCE_TIER=medium
set WORKER_DESCRIPTION=Dell XPS 15, 16GB RAM, Windows 11
set WORKER_TAGS=windows,medium-performance

npx tsx server/worker-client.ts
```

创建 `start-worker-low.bat`:
```batch
@echo off
set MASTER_URL=http://192.168.1.100:3000
set WORKER_NAME=低配测试机-1
set PERFORMANCE_TIER=low
set WORKER_DESCRIPTION=旧款笔记本, 8GB RAM, Windows 10
set WORKER_TAGS=windows,low-performance

npx tsx server/worker-client.ts
```

## 环境变量说明

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `MASTER_URL` | 否 | `http://localhost:3000` | Master 服务器地址 |
| `WORKER_NAME` | 否 | `Worker-<hostname>` | Worker 节点名称 |
| `PERFORMANCE_TIER` | 否 | 无 | 性能等级: `high`/`medium`/`low`/`custom` |
| `WORKER_DESCRIPTION` | 否 | 无 | 机器描述信息 |
| `WORKER_TAGS` | 否 | 无 | 自定义标签，逗号分隔 |
| `WORKER_PORT` | 否 | `0` | Worker 端口（0表示随机） |

## 使用指南

### 1. 在前端选择执行节点

1. 访问 Master Web UI: `http://<master-ip>:3000`
2. 在**执行节点选择**区域，查看已连接的 Worker
3. 选择目标节点：
   - **自动分配（推荐）**: 系统自动选择可用节点
   - **指定节点**: 选择特定性能等级的机器

### 2. 查看节点状态

点击 "查看所有节点 →" 链接，进入节点管理页面查看：
- 所有 Worker 的状态（在线/离线/忙碌）
- CPU、内存使用率
- 当前执行的任务
- 性能等级和机器描述

### 3. 执行测试

1. 选择测试用例
2. 选择执行节点（或使用自动分配）
3. 点击 "Run" 按钮
4. 实时查看测试进度和日志

## 网络配置

### 防火墙规则

确保以下端口可访问：

**Master 节点**:
- TCP 3000: Web UI + API
- WebSocket: 通过 HTTP 升级

**Worker 节点**:
- 无需开放端口（主动连接 Master）

### 内网部署

如果所有机器在同一内网：
```bash
# Master 监听所有网卡
HOST=0.0.0.0 PORT=3000 npm start

# Worker 使用内网 IP 连接
MASTER_URL=http://192.168.1.100:3000 npx tsx server/worker-client.ts
```

### 公网部署

如果 Master 在公网：
```bash
# Master 使用反向代理 (Nginx/Caddy)
# 配置 HTTPS 和域名

# Worker 通过域名连接
MASTER_URL=https://benchmark.example.com npx tsx server/worker-client.ts
```

## 故障排查

### Worker 无法连接 Master

1. 检查网络连通性:
   ```bash
   ping <master-ip>
   curl http://<master-ip>:3000/api/workers
   ```

2. 检查防火墙规则
3. 确认 MASTER_URL 配置正确

### Worker 显示离线

1. 检查 Worker 进程是否运行
2. 查看 Worker 日志中的心跳信息
3. 检查网络稳定性

### 任务执行失败

1. 查看任务详情中的错误信息
2. 检查 Worker 机器上的依赖是否完整
3. 验证测试配置是否正确

## 进阶配置

### 使用 PM2 管理 Worker

```bash
# 安装 PM2
npm install -g pm2

# 创建 ecosystem.config.js
module.exports = {
  apps: [{
    name: 'worker-high',
    script: 'server/worker-client.ts',
    interpreter: 'npx',
    interpreterArgs: 'tsx',
    env: {
      MASTER_URL: 'http://192.168.1.100:3000',
      WORKER_NAME: '高配测试机-1',
      PERFORMANCE_TIER: 'high',
      WORKER_DESCRIPTION: 'MacBook Pro M2 Max, 32GB RAM'
    },
    autorestart: true,
    watch: false
  }]
}

# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs worker-high
```

### Docker 部署

```dockerfile
# Dockerfile.worker
FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

ENV MASTER_URL=http://master:3000
ENV WORKER_NAME=Worker-Docker
ENV PERFORMANCE_TIER=medium

CMD ["npx", "tsx", "server/worker-client.ts"]
```

```bash
# 构建镜像
docker build -f Dockerfile.worker -t benchmark-worker .

# 运行 Worker
docker run -d \
  -e MASTER_URL=http://192.168.1.100:3000 \
  -e WORKER_NAME="Docker Worker 1" \
  -e PERFORMANCE_TIER=medium \
  benchmark-worker
```

## 监控和维护

### 日志查看

**Master 日志**:
```bash
# 标准输出包含：
- Worker 注册/注销
- 任务分发
- WebSocket 连接状态
```

**Worker 日志**:
```bash
# 标准输出包含：
- 连接状态
- 心跳信息
- 任务执行进度
```

### 性能监控

在 Web UI 的节点管理页面可查看：
- 实时 CPU 使用率
- 内存使用率
- 任务执行历史

## 最佳实践

1. **合理分配任务**: 重负载测试分配给高配机器
2. **标签管理**: 使用 tags 标记机器用途（如 production, testing）
3. **监控告警**: 定期检查 Worker 状态，及时发现离线节点
4. **日志保留**: 保存测试日志便于问题排查
5. **版本同步**: 确保所有 Worker 和 Master 使用相同版本

## 示例场景

### 场景 1: 三台机器并行测试

```bash
# Master: 监控和调度
PORT=3000 npm start

# Worker 1 (高配): 执行复杂场景
PERFORMANCE_TIER=high ./start-worker-high.sh

# Worker 2 (中配): 执行常规场景
PERFORMANCE_TIER=medium ./start-worker-medium.sh

# Worker 3 (低配): 执行轻量场景
PERFORMANCE_TIER=low ./start-worker-low.sh
```

### 场景 2: 跨平台兼容性测试

```bash
# Mac Worker
WORKER_TAGS=mac,macos-13 PERFORMANCE_TIER=high ./start-worker.sh

# Windows Worker
set WORKER_TAGS=windows,win11 && set PERFORMANCE_TIER=medium && start-worker.bat

# Linux Worker
WORKER_TAGS=linux,ubuntu-22.04 PERFORMANCE_TIER=medium ./start-worker.sh
```

## 技术支持

遇到问题请查看：
1. 项目文档: `README.md`
2. API 文档: `http://<master-ip>:3000/api-docs`
3. GitHub Issues: 提交问题反馈
