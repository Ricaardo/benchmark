# ⚡ 快速开始 - 30秒部署

选择最适合你的部署方式，快速启动 Benchmark 性能测试系统。

## 🎯 场景选择

### 1️⃣ 我想快速体验 → 同机部署

**一行命令搞定:**

```bash
# Linux / macOS
bash scripts/standalone-both.sh

# Windows  
scripts\standalone-both.bat

# 或使用
npm run deploy:both
```

✅ 最简单，Master + Worker 一键部署  
✅ 3分钟上手，适合学习和测试  
📖 详细说明: [SAME_MACHINE_DEPLOY.md](SAME_MACHINE_DEPLOY.md)

---

### 2️⃣ 我在开发调试 → 调试模式

```bash
npm run dev
```

✅ 自动重启，代码修改即生效  
✅ 本地开发，快速验证功能

---

### 3️⃣ 我要生产部署 → 分布式模式

**Master 服务器:**
```bash
bash scripts/standalone-deploy.sh
```

**Worker 节点 (其他机器):**
```bash
# 修改 MASTER_URL 后运行
bash scripts/start-worker-medium.sh
```

✅ 真实分布式，性能隔离  
✅ 多机协作，生产就绪  
📖 详细说明: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

### 4️⃣ 我用 Docker → 容器部署

```bash
# Docker Compose (推荐)
npm run compose:up

# 或 Docker
npm run docker:build
npm run docker:run
```

✅ 容器化，环境隔离  
✅ 快速部署，易于管理

---

## 📊 对比表格

| 场景 | 命令 | 部署时间 | 适用环境 |
|------|------|---------|---------|
| 🚀 **同机部署** | `npm run deploy:both` | 3分钟 | 学习/测试 |
| 🔧 **调试模式** | `npm run dev` | 1分钟 | 开发调试 |
| 🌐 **分布式** | `scripts/standalone-deploy.sh` | 5分钟 | 生产环境 |
| 🐳 **Docker** | `npm run compose:up` | 2分钟 | 容器环境 |

## 🎮 常用命令速查

```bash
# 部署相关
npm run deploy              # 交互式部署
npm run deploy:both         # 同机部署 ⭐
npm run deploy:master       # 仅 Master
npm run deploy:worker       # 仅 Worker

# 开发相关
npm run dev                 # 开发模式
npm run build               # 构建项目
npm start                   # 生产启动

# PM2 管理
npm run pm2:start           # PM2 启动
pm2 status                  # 查看状态
pm2 logs                    # 查看日志
pm2 restart all             # 重启服务

# Docker 管理
npm run compose:up          # 启动容器
npm run compose:down        # 停止容器
npm run compose:logs        # 查看日志
```

## 🆘 遇到问题？

### 端口被占用
```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Node.js 版本过低
```bash
node -v  # 检查版本，需要 >= 18.0.0
```

### Worker 无法连接 Master
1. 检查 Master 是否启动: `curl http://localhost:3000`
2. 检查防火墙设置
3. 验证 MASTER_URL 配置

## 📚 完整文档

- [README.md](README.md) - 项目介绍
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 完整部署指南  
- [SAME_MACHINE_DEPLOY.md](SAME_MACHINE_DEPLOY.md) - 同机部署详解
- [docs/](docs/) - 文档中心

## 💡 推荐流程

**第一次使用:**
1. 使用同机部署快速体验: `npm run deploy:both`
2. 访问 http://localhost:3000
3. 创建测试用例，运行测试
4. 查看测试报告和 Worker 管理

**正式使用:**
1. 在主服务器部署 Master
2. 在测试机部署 Worker
3. 配置性能等级和标签
4. 批量分发测试任务

---

**选择一个命令，30秒开始你的性能测试之旅！** 🚀
