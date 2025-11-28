# 🚀 部署指南

Benchmark 提供了统一的跨平台部署脚本,支持 Windows、Linux 和 macOS。

## 📦 快速部署

### 方式一: 使用统一部署脚本 (推荐)

```bash
# Linux / macOS
node deploy

# Windows (PowerShell)
node deploy

# Windows (CMD)
node deploy
```

部署脚本会引导你完成以下步骤:
1. 环境检测 (Node.js 版本、端口占用等)
2. 选择部署模式
3. 安装依赖和构建
4. 启动服务

### 方式二: 使用 npm 命令

```bash
# 交互式部署
npm run deploy

# 调试模式 (开发)
npm run dev

# 生产模式 (PM2)
npm run pm2:start
```

## 🎯 部署模式

### 1. 🔧 调试模式

适合开发和调试:

```bash
node deploy
# 选择: 1) 调试模式
```

或直接运行:
```bash
npm run dev
```

### 2. 💻 单机模式 (Master + Worker 同机)

Master 和 Worker 部署在同一台机器:

**方式一: 使用专用脚本 (推荐)**
```bash
# Linux / macOS
bash scripts/standalone-both.sh

# Windows
scripts\standalone-both.bat

# 或使用 npm
npm run deploy:both
```

**方式二: 使用统一脚本**
```bash
node deploy
# 选择: 2) 单机模式
```

适用场景:
- 快速体验和学习
- 单机测试环境
- 资源有限的情况
- 开发调试

📖 详细说明: [SAME_MACHINE_DEPLOY.md](SAME_MACHINE_DEPLOY.md)

### 3. 🌐 分布式 - Master

部署主控服务器:

```bash
node deploy
# 选择: 3) 分布式 - Master
```

或使用专用脚本:
```bash
# Linux / macOS
bash scripts/standalone-deploy.sh

# Windows
scripts\standalone-deploy.bat
```

### 4. ⚡ 分布式 - Worker

部署执行节点:

```bash
node deploy
# 选择: 4) 分布式 - Worker
```

或使用专用脚本:
```bash
# Linux / macOS
bash scripts/start-worker-medium.sh

# Windows
scripts\start-worker-medium.bat
```

### 5. 🚀 生产模式 (PM2)

使用 PM2 进程管理:

```bash
node deploy
# 选择: 5) 生产模式

# 或直接
npm run pm2:start
```

PM2 管理命令:
```bash
pm2 status          # 查看状态
pm2 logs            # 查看日志
pm2 restart all     # 重启服务
pm2 stop all        # 停止服务
```

### 6. 🐳 Docker 模式

使用 Docker 容器部署:

```bash
# 方式一: Docker
npm run docker:build
npm run docker:run

# 方式二: Docker Compose
npm run compose:up
```

### 7. 🛑 停止服务

停止所有运行的服务:

```bash
node deploy
# 选择: 7) 停止所有服务
```

## 🔧 配置说明

### Master 配置

- **端口**: 默认 3000,可自定义
- **访问地址**: `http://localhost:3000`
- **Worker 连接**: Worker 需配置此地址

### Worker 配置

- **Master URL**: Master 服务器地址
- **Worker 名称**: 节点标识
- **性能等级**:
  - `high`: 高配 (16核+, 32GB+)
  - `medium`: 中配 (4-8核, 8-16GB)
  - `low`: 低配 (2-4核, 4-8GB)

## 📁 项目结构

```
benchmark/
├── deploy              # 统一部署脚本 (跨平台)
├── scripts/            # 专用部署脚本
│   ├── standalone-deploy.sh/bat     # Master 部署
│   ├── start-worker-high.sh/bat     # 高配 Worker
│   ├── start-worker-medium.sh/bat   # 中配 Worker
│   └── start-worker-low.sh/bat      # 低配 Worker
├── docs/               # 文档中心
│   ├── deployment/     # 部署文档
│   ├── guides/         # 使用指南
│   └── reference/      # 技术参考
└── .archive/           # 已归档的旧文件
```

## 🌟 最佳实践

### 单机开发
```bash
npm run dev
```

### 生产环境
```bash
# Master
npm run pm2:start

# Worker (在其他机器)
bash scripts/start-worker-medium.sh
```

### 容器部署
```bash
npm run compose:up
```

## 🔍 故障排查

### 端口被占用
脚本会自动检测并提示终止占用进程。

### Node.js 版本过低
需要 Node.js >= 18.0.0:
```bash
node -v  # 检查版本
```

### Worker 无法连接 Master
1. 检查 Master 是否启动
2. 检查防火墙设置
3. 验证 Master URL 配置

## 📚 更多文档

- [详细部署文档](docs/deployment/)
- [使用指南](docs/guides/)
- [故障排查](docs/guides/TROUBLESHOOTING.md)

## 💡 提示

- Windows 用户建议使用 PowerShell 或 Git Bash
- 生产环境推荐使用 PM2 或 Docker
- Worker 配置可在 Web 界面随时修改
