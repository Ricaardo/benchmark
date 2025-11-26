# 部署指南

本文档提供完整的生产环境部署方案。

## 部署架构

### 单机部署

适合：开发环境、小规模测试

```
┌─────────────────┐
│  服务器 (3000)   │
│  - Master       │
│  - Web UI       │
│  - 本地执行      │
└─────────────────┘
```

### 分布式部署

适合：生产环境、大规模测试

```
┌──────────────────┐         ┌──────────────────┐
│  主服务器 (3000)  │◄───────►│  Worker 1 (高配)  │
│  - Master        │         │  - 性能压测       │
│  - Web UI        │         └──────────────────┘
│  - 数据存储       │
└──────────┬───────┘         ┌──────────────────┐
           │                 │  Worker 2 (中配)  │
           └────────────────►│  - 日常测试       │
                             └──────────────────┘

                             ┌──────────────────┐
                             │  Worker 3 (低配)  │
                             │  - 兼容性测试     │
                             └──────────────────┘
```

## 系统要求

### 主服务器 (Master)

- **操作系统**: Linux/macOS/Windows
- **Node.js**: >= 18.0.0
- **内存**: >= 4GB
- **磁盘**: >= 20GB（用于存储测试数据和报告）
- **网络**: 稳定的内网或公网 IP

### Worker 节点

#### 高配 Worker
- **CPU**: 16+ 核
- **内存**: 32+ GB
- **用途**: 性能压测、大规模并发测试

#### 中配 Worker
- **CPU**: 4-8 核
- **内存**: 8-16 GB
- **用途**: 日常测试、回归测试（推荐）

#### 低配 Worker
- **CPU**: 2-4 核
- **内存**: 4-8 GB
- **用途**: 兼容性测试、轻量级测试

## 安装部署

### 1. 主服务器部署

#### 克隆代码

```bash
git clone <repository-url>
cd benchmark
```

#### 安装依赖

```bash
npm install
```

#### 构建项目

```bash
npm run build
```

#### 启动服务

**开发模式:**
```bash
npm start
```

**生产模式 (推荐):**
```bash
# 使用 PM2 管理进程
npm install -g pm2
pm2 start npm --name "benchmark-master" -- start
pm2 save
pm2 startup  # 设置开机自启
```

**使用 systemd (Linux):**

创建服务文件 `/etc/systemd/system/benchmark.service`:

```ini
[Unit]
Description=Benchmark Master Server
After=network.target

[Service]
Type=simple
User=benchmark
WorkingDirectory=/opt/benchmark
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

启动服务:
```bash
sudo systemctl daemon-reload
sudo systemctl enable benchmark
sudo systemctl start benchmark
sudo systemctl status benchmark
```

#### 配置防火墙

```bash
# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw reload
```

### 2. Worker 节点部署

#### 安装依赖

在每台 Worker 机器上：

```bash
git clone <repository-url>
cd benchmark
npm install
npm run build
```

#### 配置 Worker

根据机器性能修改对应的启动脚本：

**Linux/macOS:**

编辑 `scripts/start-worker-medium.sh`:

```bash
#!/bin/bash

# 主服务器地址（必须修改）
export MASTER_URL="http://192.168.1.100:3000"

# Worker 配置
export WORKER_NAME="中配测试机-1"
export PERFORMANCE_TIER="medium"
export WORKER_DESCRIPTION="8核16GB - Ubuntu 22.04"
export WORKER_TAGS="linux,testing,ubuntu"
export WORKER_PORT="0"

echo "=========================================
  启动中配 Worker 节点
========================================="
echo "Master URL:     $MASTER_URL"
echo "Worker Name:    $WORKER_NAME"
echo "Performance:    ⚡ $PERFORMANCE_TIER"
echo "Description:    $WORKER_DESCRIPTION"
echo "Tags:           $WORKER_TAGS"
echo "========================================="
echo

npx tsx server/worker-client.ts
```

**Windows:**

编辑 `scripts\start-worker-medium.bat`:

```batch
@echo off
REM 主服务器地址（必须修改）
set MASTER_URL=http://192.168.1.100:3000

REM Worker 配置
set WORKER_NAME=中配测试机-1
set PERFORMANCE_TIER=medium
set WORKER_DESCRIPTION=8核16GB - Windows 11
set WORKER_TAGS=windows,testing
set WORKER_PORT=0

echo =========================================
echo   启动中配 Worker 节点
echo =========================================
echo Master URL:     %MASTER_URL%
echo Worker Name:    %WORKER_NAME%
echo Performance:    %PERFORMANCE_TIER%
echo Description:    %WORKER_DESCRIPTION%
echo =========================================
echo.

npx tsx server/worker-client.ts
pause
```

#### 启动 Worker

**手动启动:**
```bash
# Linux/macOS
./scripts/start-worker-medium.sh

# Windows
scripts\start-worker-medium.bat
```

**使用 PM2 (推荐):**
```bash
pm2 start scripts/start-worker-medium.sh --name "worker-medium"
pm2 save
pm2 startup
```

**使用 systemd (Linux):**

创建 `/etc/systemd/system/benchmark-worker.service`:

```ini
[Unit]
Description=Benchmark Worker Node
After=network.target

[Service]
Type=simple
User=benchmark
WorkingDirectory=/opt/benchmark
ExecStart=/bin/bash /opt/benchmark/scripts/start-worker-medium.sh
Restart=always
Environment=MASTER_URL=http://192.168.1.100:3000

[Install]
WantedBy=multi-user.target
```

启动:
```bash
sudo systemctl enable benchmark-worker
sudo systemctl start benchmark-worker
```

## 网络配置

### 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | HTTP | Web UI 和 API |
| 3000 | WebSocket | 实时通信 (路径: `/ws`, `/ws/distributed`) |

### 防火墙规则

**主服务器:**
- 开放端口 3000 (TCP)，允许 Worker 节点和用户访问

**Worker 节点:**
- 无需开放端口（主动连接 Master）
- 确保能访问 Master 的 3000 端口

### 内网部署

如果所有机器在同一内网：

```bash
# 主服务器 IP: 192.168.1.100
export MASTER_URL="http://192.168.1.100:3000"
```

### 公网部署

如果主服务器有公网 IP：

```bash
# 使用域名
export MASTER_URL="http://benchmark.example.com"

# 或使用 IP
export MASTER_URL="http://123.45.67.89:3000"
```

**配置 Nginx 反向代理 (推荐):**

```nginx
server {
    listen 80;
    server_name benchmark.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

## 数据目录

### 目录结构

```
data/
├── workers/              # Worker 节点信息
│   └── <worker-id>.json
├── distributed-tasks/    # 分布式任务数据
│   └── <task-id>.json
├── test-cases/          # 测试用例
│   └── <case-id>.json
├── test-records/        # 测试记录
│   └── <record-id>.json
└── reports/             # 测试报告
    └── <task-id>/
        ├── report.html
        └── ...
```

### 备份策略

**定期备份数据目录:**

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/benchmark"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
tar -czf "$BACKUP_DIR/benchmark_$DATE.tar.gz" \
    /opt/benchmark/data

# 保留最近 30 天的备份
find "$BACKUP_DIR" -name "benchmark_*.tar.gz" -mtime +30 -delete
```

添加到 crontab:
```bash
# 每天凌晨 2 点备份
0 2 * * * /opt/benchmark/backup.sh
```

## 监控和日志

### 日志位置

**主服务器:**
```bash
# 直接运行
npm start  # 日志输出到控制台

# PM2
pm2 logs benchmark-master

# systemd
journalctl -u benchmark -f
```

**Worker 节点:**
```bash
# 直接运行
./scripts/start-worker-medium.sh  # 输出到控制台

# PM2
pm2 logs worker-medium

# systemd
journalctl -u benchmark-worker -f
```

### 健康检查

**主服务器健康检查端点:**

```bash
# 检查服务是否运行
curl http://localhost:3000/

# 检查 Worker 列表
curl http://localhost:3000/api/workers
```

**Worker 健康检查:**

Worker 会每 30 秒向 Master 发送心跳，Master 会在 Web UI 显示 Worker 状态。

### 性能监控

使用 PM2 监控:

```bash
pm2 monit
```

查看资源使用:

```bash
pm2 status
```

## 安全建议

### 1. 网络安全

- 使用防火墙限制访问
- 生产环境建议使用 HTTPS
- Worker 节点仅允许连接到受信任的 Master

### 2. 访问控制

当前版本无内置认证，建议：

- 部署在内网环境
- 或使用 Nginx 添加 HTTP Basic Auth:

```nginx
location / {
    auth_basic "Benchmark Platform";
    auth_basic_user_file /etc/nginx/.htpasswd;

    proxy_pass http://localhost:3000;
    # ... 其他配置
}
```

创建密码文件:
```bash
sudo htpasswd -c /etc/nginx/.htpasswd admin
```

### 3. 数据安全

- 定期备份 `data/` 目录
- 限制数据目录访问权限:

```bash
chmod 700 /opt/benchmark/data
chown -R benchmark:benchmark /opt/benchmark/data
```

## 故障排查

### Worker 无法连接到 Master

**检查网络连通性:**
```bash
# 从 Worker 机器测试
curl http://<master-ip>:3000/
```

**检查防火墙:**
```bash
# 主服务器开放端口
sudo firewall-cmd --list-all
sudo ufw status
```

**检查 MASTER_URL 配置:**
确保 Worker 启动脚本中的 `MASTER_URL` 正确。

### Worker 频繁掉线

**原因:**
- 网络不稳定
- Master 服务重启
- Worker 进程崩溃

**解决方案:**
- 使用 PM2 或 systemd 自动重启 Worker
- 检查网络质量
- 查看 Worker 日志排查崩溃原因

### 测试报告无法访问

**检查报告目录权限:**
```bash
ls -la data/reports/
```

**确保静态文件服务正常:**
主服务器会自动提供 `data/reports/` 下的文件。

### 磁盘空间不足

**清理旧报告:**
```bash
# 删除 30 天前的报告
find data/reports/ -type f -mtime +30 -delete
find data/test-records/ -type f -mtime +30 -delete
```

**或在 Web UI 中批量删除测试记录。**

## 升级指南

### 升级步骤

1. **备份数据:**
   ```bash
   tar -czf backup_$(date +%Y%m%d).tar.gz data/
   ```

2. **拉取最新代码:**
   ```bash
   git pull origin main
   ```

3. **安装依赖:**
   ```bash
   npm install
   ```

4. **重新构建:**
   ```bash
   npm run build
   ```

5. **重启服务:**
   ```bash
   # PM2
   pm2 restart benchmark-master

   # systemd
   sudo systemctl restart benchmark
   ```

6. **升级 Worker 节点:**
   在每台 Worker 机器上重复步骤 2-5。

### 数据迁移

数据文件向后兼容，通常无需手动迁移。如有破坏性更新，会在 [CHANGELOG.md](CHANGELOG.md) 中说明。

## 性能优化

### 主服务器优化

**增加 Node.js 内存限制:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

**使用多核:**
Node.js 是单线程的，可通过 PM2 启动多实例：

```bash
pm2 start npm --name "benchmark-master" -i max -- start
```

### Worker 优化

**并发任务数:**
Worker 会根据 CPU 核心数自动调整并发数。

**减少内存占用:**
- 使用 headless 模式
- 减少同时运行的测试用例数量

### 网络优化

- 主服务器和 Worker 部署在同一局域网
- 使用千兆网络
- 避免通过 VPN 连接（延迟高）

## 常见部署场景

### 场景 1: 单机开发环境

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
npm start

# 3. 访问
http://localhost:3000
```

### 场景 2: 内网三机部署

**机器 1 (主服务器) - 192.168.1.100:**
```bash
npm start
```

**机器 2 (中配 Worker) - 192.168.1.101:**
```bash
export MASTER_URL="http://192.168.1.100:3000"
export WORKER_NAME="中配测试机"
export PERFORMANCE_TIER="medium"
./scripts/start-worker-medium.sh
```

**机器 3 (高配 Worker) - 192.168.1.102:**
```bash
export MASTER_URL="http://192.168.1.100:3000"
export WORKER_NAME="高配测试机"
export PERFORMANCE_TIER="high"
./scripts/start-worker-high.sh
```

### 场景 3: 公网部署 + 内网 Worker

**主服务器 (公网) - benchmark.example.com:**
```bash
# 使用 Nginx 反向代理
npm start
```

**Worker (内网):**
```bash
export MASTER_URL="http://benchmark.example.com"
./scripts/start-worker-medium.sh
```

## 总结

- **单机部署**: 适合开发和小规模测试
- **分布式部署**: 适合生产环境和大规模测试
- **使用 PM2 或 systemd**: 实现进程守护和自动重启
- **配置防火墙**: 确保网络安全
- **定期备份**: 保护测试数据
- **监控日志**: 及时发现和解决问题

更多问题参见: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
