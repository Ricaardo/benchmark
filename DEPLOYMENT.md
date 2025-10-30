# 部署指南

本文档介绍如何在不同环境下部署 Benchmark Web 系统。

## 📋 目录

- [本地部署](#本地部署)
- [生产环境部署](#生产环境部署)
- [Docker 部署](#docker-部署)
- [服务器部署](#服务器部署)
- [常见问题](#常见问题)

---

## 本地部署

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 快速开始

```bash
# 1. 克隆或下载项目（如果还没有）
cd /Users/bilibili/benchmark

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 开发模式

```bash
# 热重载模式（推荐开发时使用）
npm run dev

# 查看实时日志
# 日志会在终端实时显示
```

访问：
- 控制台: http://localhost:3000
- 配置管理: http://localhost:3000/config.html

---

## 生产环境部署

### 1. 构建项目

```bash
# 安装生产依赖
npm install --production

# 或者构建 TypeScript（可选）
npm run build
```

### 2. 使用 PM2 部署（推荐）

PM2 是一个生产环境进程管理器，可以保证服务稳定运行。

#### 安装 PM2

```bash
npm install -g pm2
```

#### 创建 PM2 配置文件

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'benchmark-web',
    script: 'server/index.ts',
    interpreter: 'node',
    interpreter_args: '--loader tsx',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

#### 启动服务

```bash
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs benchmark-web

# 停止服务
pm2 stop benchmark-web

# 重启服务
pm2 restart benchmark-web

# 开机自启动
pm2 startup
pm2 save
```

### 3. 使用 systemd 部署

适用于 Linux 系统。

#### 创建 systemd 服务文件

创建 `/etc/systemd/system/benchmark-web.service`：

```ini
[Unit]
Description=Benchmark Web Server
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/benchmark
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=benchmark-web

[Install]
WantedBy=multi-user.target
```

#### 启动服务

```bash
# 重载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start benchmark-web

# 开机自启动
sudo systemctl enable benchmark-web

# 查看状态
sudo systemctl status benchmark-web

# 查看日志
sudo journalctl -u benchmark-web -f
```

---

## Docker 部署

### 1. 创建 Dockerfile

项目已包含 `Dockerfile`，内容如下：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --production

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["npm", "start"]
```

### 2. 构建 Docker 镜像

```bash
# 构建镜像
docker build -t benchmark-web .

# 查看镜像
docker images
```

### 3. 运行容器

```bash
# 运行容器
docker run -d \
  --name benchmark-web \
  -p 3000:3000 \
  -v $(pwd)/benchmark_report:/app/benchmark_report \
  -v $(pwd)/benchmark.dynamic.json:/app/benchmark.dynamic.json \
  benchmark-web

# 查看容器状态
docker ps

# 查看日志
docker logs -f benchmark-web

# 停止容器
docker stop benchmark-web

# 启动容器
docker start benchmark-web

# 删除容器
docker rm benchmark-web
```

### 4. 使用 Docker Compose（推荐）

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  benchmark-web:
    build: .
    container_name: benchmark-web
    ports:
      - "3000:3000"
    volumes:
      - ./benchmark_report:/app/benchmark_report
      - ./benchmark.dynamic.json:/app/benchmark.dynamic.json
      - ./benchmark.config.mts:/app/benchmark.config.mts
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

启动服务：

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down

# 重启
docker-compose restart
```

---

## 服务器部署

### 1. 在云服务器上部署

#### 准备服务器

```bash
# 连接服务器
ssh user@your-server-ip

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

#### 上传项目

```bash
# 方式 1: 使用 Git
cd /var/www
sudo git clone <your-repo-url> benchmark
cd benchmark

# 方式 2: 使用 scp
# 在本地执行
scp -r /Users/bilibili/benchmark user@your-server-ip:/var/www/
```

#### 安装依赖并启动

```bash
cd /var/www/benchmark
npm install
npm start
```

### 2. 配置 Nginx 反向代理（可选）

如果需要使用域名或 80/443 端口：

#### 安装 Nginx

```bash
sudo apt install nginx -y
```

#### 创建 Nginx 配置

创建 `/etc/nginx/sites-available/benchmark`:

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/benchmark /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 配置 HTTPS（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 3. 配置防火墙

```bash
# UFW 防火墙
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # 直接访问（可选）
sudo ufw enable

# 查看状态
sudo ufw status
```

---

## 环境变量配置

创建 `.env` 文件（可选）：

```env
# 服务器端口
PORT=3000

# Node 环境
NODE_ENV=production

# 日志级别
LOG_LEVEL=info
```

在代码中使用：

```typescript
const PORT = process.env.PORT || 3000;
```

---

## 性能优化

### 1. 启用压缩

更新 `server/index.ts`，添加压缩中间件：

```typescript
import compression from 'compression';

app.use(compression());
```

### 2. 限制请求大小

```typescript
app.use(express.json({ limit: '10mb' }));
```

### 3. 配置日志

```typescript
import morgan from 'morgan';

if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}
```

---

## 监控和维护

### 1. 日志管理

```bash
# PM2 日志
pm2 logs benchmark-web

# systemd 日志
sudo journalctl -u benchmark-web -f

# Docker 日志
docker logs -f benchmark-web
```

### 2. 性能监控

```bash
# PM2 监控
pm2 monit

# 服务器资源
htop
```

### 3. 备份

```bash
# 备份配置文件
cp benchmark.dynamic.json benchmark.dynamic.json.backup

# 备份测试报告
tar -czf benchmark_report_$(date +%Y%m%d).tar.gz benchmark_report/
```

---

## 常见问题

### 1. 端口被占用

**问题**: 启动时提示端口 3000 被占用

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 或者使用
netstat -tulpn | grep 3000

# 修改端口（在 server/index.ts 中）
const PORT = 3001;
```

### 2. 权限问题

**问题**: 无法写入配置文件或报告目录

**解决**:
```bash
# 检查目录权限
ls -la

# 修改权限
chmod -R 755 benchmark_report/
chown -R $USER:$USER .
```

### 3. 依赖安装失败

**问题**: npm install 报错

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. 内存不足

**问题**: 测试时内存溢出

**解决**:
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm start

# 或在 PM2 中配置
max_memory_restart: '2G'
```

### 5. 浏览器无法访问

**问题**: 服务运行但无法访问

**解决**:
```bash
# 检查服务是否运行
ps aux | grep node

# 检查端口监听
netstat -tulpn | grep 3000

# 检查防火墙
sudo ufw status

# 检查 Nginx（如果使用）
sudo nginx -t
sudo systemctl status nginx
```

---

## 安全建议

### 1. 使用环境变量

不要在代码中硬编码敏感信息，使用 `.env` 文件。

### 2. 限制访问

```nginx
# 在 Nginx 中限制 IP
location / {
    allow 192.168.1.0/24;
    deny all;
    proxy_pass http://localhost:3000;
}
```

### 3. 定期更新

```bash
# 更新依赖
npm update

# 检查漏洞
npm audit
npm audit fix
```

### 4. 备份策略

- 定期备份配置文件
- 定期备份测试报告
- 使用版本控制（Git）

---

## 更新部署

### 从 Git 更新

```bash
cd /path/to/benchmark
git pull origin main
npm install
pm2 restart benchmark-web
```

### 手动更新

```bash
# 备份当前版本
cp -r benchmark benchmark_backup

# 上传新文件
# 重启服务
pm2 restart benchmark-web
```

---

## 卸载

### PM2 部署

```bash
pm2 stop benchmark-web
pm2 delete benchmark-web
pm2 save
```

### systemd 部署

```bash
sudo systemctl stop benchmark-web
sudo systemctl disable benchmark-web
sudo rm /etc/systemd/system/benchmark-web.service
sudo systemctl daemon-reload
```

### Docker 部署

```bash
docker-compose down
docker rmi benchmark-web
```

### 删除项目文件

```bash
cd /path/to
rm -rf benchmark
```

---

## 快速参考

### 常用命令

```bash
# 开发环境
npm run dev              # 启动开发服务器

# 生产环境
npm start                # 启动生产服务器
npm run build            # 构建项目

# PM2
pm2 start                # 启动服务
pm2 restart             # 重启服务
pm2 stop                # 停止服务
pm2 logs                # 查看日志
pm2 monit               # 监控

# Docker
docker-compose up -d     # 启动容器
docker-compose down      # 停止容器
docker-compose logs -f   # 查看日志

# systemd
sudo systemctl start benchmark-web    # 启动
sudo systemctl stop benchmark-web     # 停止
sudo systemctl restart benchmark-web  # 重启
sudo systemctl status benchmark-web   # 状态
```

### 访问地址

- 控制台: http://localhost:3000
- 配置管理: http://localhost:3000/config.html
- 测试报告: http://localhost:3000/reports/

---

## 技术支持

如有问题，请查看：
- [README.md](README.md) - 完整文档
- [QUICKSTART.md](QUICKSTART.md) - 快速指南
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

---

**最后更新**: 2025-10-29
