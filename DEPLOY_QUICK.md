# 部署快速参考

## 🚀 一键启动

### 本地开发

```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

## 📦 部署方式对比

| 方式 | 适用场景 | 命令 | 优点 |
|------|---------|------|------|
| **本地开发** | 开发测试 | `npm run dev` | 热重载、调试方便 |
| **PM2** | 生产环境 | `npm run pm2:start` | 自动重启、进程管理 |
| **Docker** | 容器化 | `docker-compose up -d` | 隔离环境、易迁移 |
| **systemd** | Linux服务器 | `systemctl start benchmark-web` | 系统级服务 |

## 📝 快速部署命令

### 1. 本地开发（开发/测试）

```bash
npm install
npm run dev
```

访问: http://localhost:3000

### 2. PM2 部署（推荐生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
npm run pm2:start

# 查看状态
pm2 status

# 查看日志
npm run pm2:logs

# 停止服务
npm run pm2:stop

# 重启服务
npm run pm2:restart
```

### 3. Docker 部署（推荐容器化）

```bash
# 方式 A: Docker Compose（推荐）
docker-compose up -d          # 启动
docker-compose logs -f        # 查看日志
docker-compose down           # 停止

# 方式 B: 直接使用 Docker
npm run docker:build          # 构建镜像
npm run docker:run            # 运行容器
npm run docker:stop           # 停止容器
```

### 4. 生产环境部署

```bash
# 克隆项目
git clone <repo-url> benchmark
cd benchmark

# 安装依赖
npm install --production

# 使用 PM2 启动
npm run pm2:start

# 配置开机自启动
pm2 startup
pm2 save
```

## 🔧 常用命令

### npm 脚本

```bash
npm run dev              # 开发模式（热重载）
npm start                # 生产模式
npm run build            # 构建 TypeScript

# PM2 相关
npm run pm2:start        # 启动
npm run pm2:stop         # 停止
npm run pm2:restart      # 重启
npm run pm2:logs         # 查看日志
npm run pm2:monit        # 监控

# Docker 相关
npm run docker:build     # 构建镜像
npm run docker:run       # 运行容器
npm run docker:stop      # 停止容器
npm run docker:remove    # 删除容器

# Docker Compose 相关
npm run compose:up       # 启动
npm run compose:down     # 停止
npm run compose:logs     # 查看日志
```

## 🌐 访问地址

部署成功后访问以下地址：

- **控制台**: http://localhost:3000
- **配置管理**: http://localhost:3000/config.html
- **测试报告**: http://localhost:3000/reports/
- **状态 API**: http://localhost:3000/api/status

## ⚙️ 配置端口

如果需要修改端口，编辑 `server/index.ts`:

```typescript
const PORT = 3001; // 改为你需要的端口
```

或使用环境变量：

```bash
PORT=3001 npm start
```

## 🔒 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🐛 故障排查

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 权限问题

```bash
# 修改目录权限
chmod -R 755 .
chown -R $USER:$USER .
```

### 依赖安装失败

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Docker 网络问题

```bash
# 重启 Docker
docker restart

# 清理网络
docker network prune
```

## 📊 监控和日志

### PM2 监控

```bash
pm2 monit                # 实时监控
pm2 status               # 查看状态
pm2 logs                 # 查看所有日志
pm2 logs benchmark-web   # 查看特定应用日志
```

### Docker 日志

```bash
docker logs -f benchmark-web        # 实时日志
docker logs --tail 100 benchmark-web  # 最后100行
```

### 系统日志（systemd）

```bash
sudo journalctl -u benchmark-web -f
```

## 🔄 更新部署

### 从 Git 更新

```bash
git pull origin main
npm install
npm run pm2:restart
```

### Docker 更新

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## 📚 完整文档

- **完整部署指南**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **快速开始**: [QUICKSTART.md](QUICKSTART.md)
- **使用文档**: [README.md](README.md)
- **项目总结**: [SUMMARY.md](SUMMARY.md)

## 💡 推荐部署方案

### 开发环境
```bash
./start.sh
```

### 测试环境
```bash
npm run pm2:start
```

### 生产环境
```bash
docker-compose up -d
```

### 小型服务器
```bash
npm run pm2:start
pm2 startup
pm2 save
```

### 大型部署
使用 Docker + Nginx + SSL

---

**需要帮助？** 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 获取详细说明。
