# 🚢 部署指南

本文档说明如何在不同环境中部署 Benchmark Web Server。

---

## 📋 目录

- [一键部署（推荐）](#一键部署推荐)
- [手动部署](#手动部署)
- [环境要求](#环境要求)
- [生产环境部署](#生产环境部署)
- [常见问题](#常见问题)

---

## 🚀 一键部署（推荐）

### macOS / Linux / WSL

```bash
./deploy.sh
```

### Windows

```bash
deploy.bat
```

### 功能特性

部署脚本会自动完成以下步骤：

1. **环境检测**
   - ✅ 检测操作系统类型
   - ✅ 检测 Node.js 版本（需要 >= 18.0.0）
   - ✅ 检查端口 3000 是否可用

2. **依赖管理**
   - ✅ 自动安装项目依赖
   - ✅ 处理 `@bilibili-player/benchmark` 包问题
   - ✅ 提示包缺失但不影响配置功能

3. **编译构建**
   - ✅ 编译 TypeScript 代码到 dist 目录
   - ✅ 检测代码变更，按需编译

4. **启动服务**
   - ✅ 启动开发服务器
   - ✅ 自动打开浏览器访问 http://localhost:3000
   - ✅ 显示友好的启动信息

---

## 📋 手动部署

如果您需要更多控制或在特殊环境中部署，可以手动执行以下步骤。

### 1. 克隆项目

```bash
git clone <repository-url>
cd benchmark
```

### 2. 安装依赖

```bash
npm install
```

> ⚠️ 如果遇到 `@bilibili-player/benchmark` 包安装失败，这是正常的。该包是B站内部私有包，不影响Web服务器运行。详见 [IMPORTANT.md](IMPORTANT.md)

### 3. 编译代码

```bash
npm run build
```

这会将 TypeScript 代码编译到 `dist/` 目录。

### 4. 启动服务器

#### 开发模式（推荐）

支持热重载，代码变更自动重启：

```bash
npm run dev
```

#### 生产模式

性能更优，但不支持热重载：

```bash
npm start
```

### 5. 访问应用

打开浏览器访问：

- **主页**: http://localhost:3000
- **配置管理**: http://localhost:3000/config.html

---

## 🔧 环境要求

### 必需软件

| 软件 | 最低版本 | 推荐版本 | 检测命令 |
|------|---------|---------|----------|
| **Node.js** | 18.0.0 | 20.x LTS | `node -v` |
| **npm** | 9.0.0 | 10.x | `npm -v` |

### 系统要求

| 操作系统 | 支持状态 | 说明 |
|---------|---------|------|
| **macOS** | ✅ 完全支持 | Intel 和 Apple Silicon 均支持 |
| **Linux** | ✅ 完全支持 | Ubuntu, Debian, CentOS, RHEL |
| **Windows 10/11** | ✅ 完全支持 | 原生支持，推荐使用 PowerShell |
| **WSL** | ✅ 完全支持 | Windows Subsystem for Linux |

### 端口要求

- **3000**: Web 服务器（HTTP）
- **WebSocket**: 使用相同端口（自动升级）

如果端口被占用，部署脚本会提示您终止占用进程。

---

## 🌍 不同环境部署

### macOS 部署

#### 方式 1: 一键部署（推荐）

```bash
chmod +x deploy.sh
./deploy.sh
```

#### 方式 2: 使用 Homebrew 管理 Node.js

```bash
# 安装 Node.js
brew install node

# 验证安装
node -v
npm -v

# 部署项目
./deploy.sh
```

---

### Linux 部署

#### Ubuntu / Debian

```bash
# 安装 Node.js (方式1: 官方源)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或者使用 apt (方式2)
sudo apt update
sudo apt install nodejs npm

# 部署项目
chmod +x deploy.sh
./deploy.sh
```

#### CentOS / RHEL

```bash
# 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install nodejs

# 部署项目
chmod +x deploy.sh
./deploy.sh
```

---

### Windows 部署

#### 方式 1: 使用部署脚本（推荐）

双击运行 `deploy.bat` 或在命令提示符中：

```bash
deploy.bat
```

#### 方式 2: 使用 Chocolatey

```powershell
# 安装 Chocolatey (管理员权限)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 安装 Node.js
choco install nodejs-lts

# 部署项目
.\deploy.bat
```

#### 方式 3: 手动安装

1. 访问 https://nodejs.org 下载 LTS 版本
2. 运行安装程序
3. 验证安装：`node -v` 和 `npm -v`
4. 运行 `deploy.bat`

---

### WSL (Windows Subsystem for Linux)

WSL 环境下使用 Linux 部署方式：

```bash
# 在 WSL 终端中
chmod +x deploy.sh
./deploy.sh
```

浏览器会自动打开（需要 `wslview` 工具）：

```bash
# 如果浏览器未自动打开，安装 wslu
sudo apt install wslu

# 手动打开
wslview http://localhost:3000
```

---

## 🔒 生产环境部署

### 1. 使用进程管理器

#### PM2 (推荐)

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "benchmark-web" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs benchmark-web

# 设置开机自启
pm2 startup
pm2 save

# 停止应用
pm2 stop benchmark-web

# 重启应用
pm2 restart benchmark-web
```

#### systemd (Linux)

创建服务文件 `/etc/systemd/system/benchmark-web.service`:

```ini
[Unit]
Description=Benchmark Web Server
After=network.target

[Service]
Type=simple
User=<your-user>
WorkingDirectory=/path/to/benchmark
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable benchmark-web
sudo systemctl start benchmark-web
sudo systemctl status benchmark-web
```

### 2. 反向代理（Nginx）

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

    # WebSocket 支持
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 3. 环境变量配置

创建 `.env` 文件（生产环境）：

```bash
NODE_ENV=production
PORT=3000
```

---

## ❓ 常见问题

### Q1: 端口 3000 被占用怎么办？

**解决方案**：

部署脚本会自动检测并提示终止占用进程。或手动处理：

**macOS/Linux**:
```bash
# 查找占用进程
lsof -i :3000

# 终止进程
kill -9 <PID>
```

**Windows**:
```bash
# 查找占用进程
netstat -ano | findstr :3000

# 终止进程
taskkill /PID <PID> /F
```

### Q2: Node.js 版本过低怎么办？

**解决方案**：

升级到 Node.js 18+：

**macOS**: `brew upgrade node`

**Ubuntu/Debian**: 使用 NodeSource 安装最新版本

**Windows**: 访问 https://nodejs.org 下载最新 LTS

### Q3: @bilibili-player/benchmark 安装失败？

**答案**：这是正常的！

该包是B站内部私有包，不影响 Web 服务器功能。详见 [IMPORTANT.md](IMPORTANT.md)

### Q4: 如何停止服务器？

**答案**：

- **一键部署脚本启动**: 按 `Ctrl+C`
- **手动启动**: 按 `Ctrl+C`
- **PM2 启动**: `pm2 stop benchmark-web`
- **systemd 启动**: `sudo systemctl stop benchmark-web`

### Q5: 如何查看日志？

**答案**：

- **开发模式**: 日志直接输出到终端
- **PM2**: `pm2 logs benchmark-web`
- **systemd**: `journalctl -u benchmark-web -f`

### Q6: 浏览器没有自动打开？

**答案**：

手动访问 http://localhost:3000

---

## 📞 获取帮助

遇到问题？查看以下资源：

- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排查指南
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [IMPORTANT.md](IMPORTANT.md) - 重要说明

---

## ✅ 部署检查清单

部署完成后，验证以下项目：

- [ ] 可以访问 http://localhost:3000
- [ ] 可以访问配置页面 http://localhost:3000/config.html
- [ ] 可以添加测试用例
- [ ] 可以保存配置
- [ ] WebSocket 连接正常（查看浏览器控制台）
- [ ] 可以查看实时输出（如果运行测试）

---

**最后更新**: 2025-10-29
