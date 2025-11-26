# 🐳 Docker 部署指南

本文档详细说明如何使用 Docker 部署 Benchmark Web Server。

---

## 📋 目录

- [为什么使用 Docker](#为什么使用-docker)
- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [部署方式](#部署方式)
- [配置说明](#配置说明)
- [数据持久化](#数据持久化)
- [网络访问](#网络访问)
- [常见问题](#常见问题)

---

## 🎯 为什么使用 Docker

### 优势

- ✅ **环境一致性** - 无需安装 Node.js，避免版本冲突
- ✅ **快速部署** - 一次构建，到处运行
- ✅ **隔离性好** - 不影响宿主机环境
- ✅ **易于管理** - 一键启动、停止、重启
- ✅ **跨平台** - Windows/macOS/Linux 统一部署体验
- ✅ **自动恢复** - 容器崩溃自动重启
- ✅ **健康检查** - 自动监控服务状态

### 适用场景

- 🔹 生产环境部署
- 🔹 多环境隔离（开发/测试/生产）
- 🔹 团队协作（统一开发环境）
- 🔹 云服务器部署
- 🔹 CI/CD 自动化部署

---

## 🔧 前置要求

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 安装指南 |
|------|---------|---------|----------|
| **Docker** | 20.10+ | 24.0+ | [安装 Docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | 1.29+ | 2.20+ | [安装 Compose](https://docs.docker.com/compose/install/) |

### 安装 Docker

#### Windows

1. 下载 [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
2. 运行安装程序
3. 重启电脑
4. 验证安装：
   ```bash
   docker --version
   docker-compose --version
   ```

#### macOS

```bash
# 使用 Homebrew 安装
brew install --cask docker

# 或下载 Docker Desktop
# https://docs.docker.com/desktop/install/mac-install/

# 验证安装
docker --version
docker-compose --version
```

#### Linux (Ubuntu/Debian)

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

---

## 🚀 快速开始

### 方式 1: 使用 Docker Compose（推荐）

最简单的方式，一条命令启动所有服务：

```bash
# 启动服务（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式 2: 使用 npm 脚本

项目已配置好 npm 脚本，更方便：

```bash
# 启动服务
npm run compose:up

# 查看日志
npm run compose:logs

# 停止服务
npm run compose:down
```

### 方式 3: 手动 Docker 命令

如果需要更多控制：

```bash
# 1. 构建镜像
docker build -t benchmark-web .

# 2. 运行容器
docker run -d \
  --name benchmark-web \
  -p 3000:3000 \
  -v $(pwd)/benchmark_report:/app/benchmark_report \
  -v $(pwd)/testcases.json:/app/testcases.json \
  benchmark-web

# 3. 查看日志
docker logs -f benchmark-web

# 4. 停止容器
docker stop benchmark-web

# 5. 删除容器
docker rm benchmark-web
```

---

## 📦 部署方式

### 场景 1: 开发环境

适合本地开发和测试：

```bash
# 启动服务
docker-compose up

# 代码修改后重新构建
docker-compose up --build
```

### 场景 2: 生产环境

适合生产服务器部署：

```bash
# 后台启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看资源使用
docker stats benchmark-web
```

### 场景 3: 多实例部署

在不同端口运行多个实例：

```bash
# 实例 1 (端口 3000)
docker-compose up -d

# 实例 2 (端口 3001)
PORT=3001 docker-compose -p benchmark-web-2 up -d

# 实例 3 (端口 3002)
PORT=3002 docker-compose -p benchmark-web-3 up -d
```

---

## ⚙️ 配置说明

### 环境变量

在 `docker-compose.yml` 中修改环境变量：

```yaml
environment:
  - NODE_ENV=production    # 运行模式
  - PORT=3000             # 服务端口
  - TZ=Asia/Shanghai      # 时区设置
```

### 端口映射

修改宿主机端口（如果 3000 被占用）：

```yaml
ports:
  - "8080:3000"  # 宿主机端口:容器端口
```

访问地址变为：`http://localhost:8080`

### 资源限制

调整容器资源限制：

```yaml
deploy:
  resources:
    limits:
      cpus: '4'           # CPU 限制
      memory: 4G          # 内存限制
    reservations:
      cpus: '1'           # CPU 保留
      memory: 1G          # 内存保留
```

---

## 💾 数据持久化

### 自动挂载的目录和文件

Docker Compose 配置自动挂载以下数据：

| 容器路径 | 宿主机路径 | 说明 |
|---------|-----------|------|
| `/app/benchmark_report` | `./benchmark_report` | 测试报告 |
| `/app/usr_data` | `./usr_data` | 浏览器配置 |
| `/app/testcases.json` | `./testcases.json` | 测试用例 |
| `/app/test-records.json` | `./test-records.json` | 测试记录 |
| `/app/perfcat-config.json` | `./perfcat-config.json` | Perfcat 配置 |
| `/app/api-keys.json` | `./api-keys.json` | API 密钥 |
| `/app/webhook-config.json` | `./webhook-config.json` | Webhook 配置 |
| `/app/logs` | `./logs` | 日志文件 |

### 数据备份

```bash
# 备份所有数据
tar -czf backup-$(date +%Y%m%d).tar.gz \
  benchmark_report/ \
  usr_data/ \
  testcases.json \
  test-records.json \
  perfcat-config.json \
  api-keys.json \
  webhook-config.json

# 恢复数据
tar -xzf backup-20250101.tar.gz
```

---

## 🌐 网络访问

### 本地访问

```
http://localhost:3000
```

### 局域网访问

容器默认监听所有网络接口（0.0.0.0），支持从其他设备访问。

#### 查看本机 IP

**macOS / Linux**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows**:
```bash
ipconfig | findstr IPv4
```

#### 从其他设备访问

```
http://<服务器IP>:3000
```

例如：`http://192.168.1.100:3000`

### 防火墙配置

确保防火墙允许 3000 端口：

**Ubuntu/Debian**:
```bash
sudo ufw allow 3000/tcp
```

**CentOS/RHEL**:
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

**Windows**:
```powershell
New-NetFirewallRule -DisplayName "Benchmark Web" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

## 🔍 常见问题

### Q1: 容器无法启动？

**检查日志**：
```bash
docker-compose logs
```

**常见原因**：
- 端口被占用 → 修改 `docker-compose.yml` 中的端口映射
- 权限不足 → 使用 `sudo` 或将用户加入 docker 组
- Docker 未运行 → 启动 Docker Desktop 或 Docker 服务

### Q2: 如何更新镜像？

```bash
# 停止并删除旧容器
docker-compose down

# 重新构建镜像
docker-compose build --no-cache

# 启动新容器
docker-compose up -d
```

### Q3: 如何查看容器资源使用？

```bash
# 实时资源监控
docker stats benchmark-web

# 查看详细信息
docker inspect benchmark-web
```

### Q4: 如何进入容器调试？

```bash
# 进入容器 shell
docker exec -it benchmark-web sh

# 查看容器内文件
docker exec benchmark-web ls -la /app

# 查看 Node.js 进程
docker exec benchmark-web ps aux
```

### Q5: 容器健康检查失败？

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' benchmark-web

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' benchmark-web | jq
```

**解决方案**：
- 检查服务是否正常启动
- 确认 `/api/health` 端点可访问
- 查看容器日志排查错误

### Q6: 如何清理未使用的 Docker 资源？

```bash
# 清理停止的容器
docker container prune

# 清理未使用的镜像
docker image prune

# 清理未使用的卷
docker volume prune

# 清理所有未使用的资源
docker system prune -a
```

---

## 📊 容器管理命令

### 基本操作

```bash
# 启动容器
docker-compose up -d

# 停止容器
docker-compose stop

# 重启容器
docker-compose restart

# 删除容器
docker-compose down

# 删除容器和卷
docker-compose down -v
```

### 日志查看

```bash
# 查看实时日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100

# 查看特定时间的日志
docker-compose logs --since 2024-01-01T00:00:00
```

### 状态检查

```bash
# 查看容器状态
docker-compose ps

# 查看容器详情
docker inspect benchmark-web

# 查看端口映射
docker port benchmark-web
```

---

## 🔄 升级和维护

### 升级流程

```bash
# 1. 备份数据
tar -czf backup-before-upgrade.tar.gz testcases.json test-records.json

# 2. 停止服务
docker-compose down

# 3. 拉取最新代码
git pull

# 4. 重新构建镜像
docker-compose build --no-cache

# 5. 启动服务
docker-compose up -d

# 6. 验证服务
curl http://localhost:3000/api/health
```

### 定期维护

```bash
# 每周清理日志
docker-compose exec benchmark-web sh -c "rm -rf /app/logs/*.log.old"

# 每月备份数据
./backup.sh

# 每季度更新镜像
docker-compose build --pull
```

---

## 🌟 高级配置

### 使用 Nginx 反向代理

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name benchmark.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

### 使用 Docker Swarm 部署

```bash
# 初始化 Swarm
docker swarm init

# 部署服务
docker stack deploy -c docker-compose.yml benchmark

# 查看服务
docker service ls

# 扩展服务
docker service scale benchmark_benchmark-web=3
```

---

## 📚 相关资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [项目主文档](README.md)
- [部署指南](DEPLOYMENT.md)
- [故障排查](TROUBLESHOOTING.md)

---

## ✅ 部署检查清单

部署完成后，验证以下项目：

- [ ] 容器正常运行：`docker-compose ps`
- [ ] 可以访问主界面：`http://localhost:3000`
- [ ] 健康检查通过：`docker inspect --format='{{.State.Health.Status}}' benchmark-web`
- [ ] WebSocket 连接正常（查看浏览器控制台）
- [ ] 数据卷正确挂载：`docker inspect benchmark-web | grep Mounts`
- [ ] 日志正常输出：`docker-compose logs`
- [ ] 可以从其他设备访问（如需要）

---

**最后更新**: 2025-01-25

**Docker 镜像**: benchmark-web:latest
