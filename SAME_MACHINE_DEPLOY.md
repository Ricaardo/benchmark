# 💻 同机部署指南 (Master + Worker)

最简单的部署方式 - 在同一台机器上同时运行 Master 和 Worker。

## 🎯 适用场景

- ✅ **快速体验**: 快速了解系统功能
- ✅ **单机测试**: 在单台机器上进行性能测试
- ✅ **开发调试**: 本地开发和功能验证
- ✅ **资源有限**: 只有一台测试机器
- ✅ **学习使用**: 学习分布式测试系统的使用

## 🚀 一键部署

### 方式一: 使用专用脚本 (推荐)

**Linux / macOS:**
```bash
bash scripts/standalone-both.sh
```

**Windows:**
```batch
scripts\standalone-both.bat
```

### 方式二: 使用 npm 命令

```bash
npm run deploy:both
```

### 方式三: 使用统一部署脚本

```bash
node deploy
# 选择: 2) 单机模式 (Master + Worker 同机)
```

## 📋 部署流程

脚本会自动完成以下步骤:

1. **环境检测**
   - ✅ 检查 Node.js 版本 (>= 18.0.0)
   - ✅ 检查端口占用情况

2. **配置参数**
   - 🔧 Master 服务端口 (默认: 3000)
   - ⚡ Worker 性能等级 (high/medium/low)
   - 🏷️ Worker 名称 (默认: LocalWorker-主机名)

3. **安装构建**
   - 📦 安装 npm 依赖
   - 🔨 编译 TypeScript 代码

4. **启动服务**
   - 🌐 启动 Master 服务
   - ⚡ 启动 Worker 服务 (自动连接本机 Master)

## 🎮 使用示例

### 完整部署示例

```bash
# 1. 进入项目目录
cd benchmark

# 2. 运行部署脚本
bash scripts/standalone-both.sh

# 3. 按提示配置
#    Master 服务端口 [默认: 3000]: (直接回车)
#    请选择性能等级 [1-3, 默认: 2]: (直接回车)
#    Worker 名称 [默认: LocalWorker-xxx]: (直接回车)

# 4. 等待部署完成
#    ✅ Master 启动成功！
#    ✅ Worker 启动成功！

# 5. 访问 Web 界面
#    http://localhost:3000
```

### 自定义配置示例

```bash
bash scripts/standalone-both.sh

# 配置示例:
Master 服务端口 [默认: 3000]: 8080
请选择性能等级 [1-3, 默认: 2]: 1
Worker 名称 [默认: LocalWorker-xxx]: MyTestWorker
```

## 📊 部署后验证

### 1. 检查服务状态

**使用 PM2:**
```bash
pm2 status

# 应该看到两个服务:
# benchmark-master     (Master 服务)
# benchmark-worker-local (Worker 服务)
```

**不使用 PM2:**
```bash
# 检查端口占用
lsof -i:3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### 2. 访问 Web 界面

打开浏览器访问:
- **主页**: http://localhost:3000
- **Worker 管理**: http://localhost:3000/workers.html

在 Worker 管理页面应该能看到一个本地 Worker 节点。

### 3. 运行测试

1. 在主页创建一个测试用例
2. 点击"运行"按钮
3. 测试会自动在本地 Worker 上执行
4. 查看实时日志和测试结果

## 🎮 管理命令

### 使用 PM2 (推荐)

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs                      # 所有日志
pm2 logs benchmark-master     # Master 日志
pm2 logs benchmark-worker-local  # Worker 日志

# 重启服务
pm2 restart all               # 重启所有
pm2 restart benchmark-master  # 重启 Master
pm2 restart benchmark-worker-local  # 重启 Worker

# 停止服务
pm2 stop all
pm2 delete all
```

### 不使用 PM2

**Linux / macOS:**
```bash
# 查看日志
tail -f logs/master.log
tail -f logs/worker.log

# 停止服务
kill $(cat .master.pid)
kill $(cat .worker.pid)
```

**Windows:**
```batch
# 查看进程
tasklist | findstr node

# 停止服务 (关闭命令行窗口或使用任务管理器)
```

## 🔧 配置说明

### Worker 性能等级

选择与机器配置匹配的性能等级:

| 等级 | 配置要求 | 并发任务 | 适用场景 |
|------|----------|----------|----------|
| **high** | 16核+, 32GB+ | 多个 | 高负载测试 |
| **medium** | 4-8核, 8-16GB | 适中 | 常规测试 (推荐) |
| **low** | 2-4核, 4-8GB | 较少 | 轻量测试 |

**💡 提示**: 性能等级可以在 Web 界面随时修改，无需重启服务。

### 端口配置

默认端口: `3000`

如需修改:
1. 部署时输入自定义端口
2. 或手动修改环境变量:
   ```bash
   PORT=8080 npm start
   ```

## 🌟 优势特点

### vs 纯本地模式

| 特性 | 本地模式 (npm run dev) | 同机部署 |
|------|----------------------|----------|
| 部署方式 | 单进程 | Master + Worker |
| 分布式功能 | ❌ | ✅ |
| Worker 管理 | ❌ | ✅ |
| 任务调度 | ❌ | ✅ |
| 适合学习分布式 | ❌ | ✅ |

### vs 真分布式部署

| 特性 | 同机部署 | 真分布式 |
|------|----------|----------|
| 机器数量 | 1 台 | 多台 |
| 网络配置 | 无需 | 需要 |
| 部署复杂度 | 简单 | 中等 |
| 性能隔离 | ❌ | ✅ |
| 适合生产 | ❌ | ✅ |

## 📝 使用技巧

### 1. 调整 Worker 配置

部署后可在 Web 界面修改 Worker 配置:

1. 访问 http://localhost:3000/workers.html
2. 点击 Worker 节点的"编辑"按钮
3. 修改性能等级、描述、标签等
4. 保存即可生效，无需重启

### 2. 查看实时日志

```bash
# Master 日志
pm2 logs benchmark-master --lines 100

# Worker 日志
pm2 logs benchmark-worker-local --lines 100

# 实时跟踪
pm2 logs --lines 0
```

### 3. 性能优化

同机部署时 Master 和 Worker 共享资源,建议:

- 选择 `medium` 或 `low` 性能等级
- 避免运行过多并发任务
- 监控系统资源使用情况

### 4. 扩展为分布式

当需要更多性能时,可轻松扩展:

1. 保持本机 Master 运行
2. 在其他机器运行 Worker 脚本
3. Worker 连接到本机 Master 的 IP

```bash
# 在其他机器上
export MASTER_URL="http://192.168.1.100:3000"
bash scripts/start-worker-medium.sh
```

## ❓ 常见问题

### Q: 端口被占用怎么办?

A: 脚本会自动检测并提示终止占用进程,或者手动修改端口。

### Q: Worker 无法连接 Master?

A: 同机部署使用 localhost,一般不会有连接问题。如果遇到,检查:
- Master 是否正常启动 (访问 http://localhost:3000)
- 防火墙设置
- 端口是否正确

### Q: 如何停止服务?

A: 
```bash
# 使用 PM2
pm2 stop all

# 不使用 PM2 (Linux/macOS)
kill $(cat .master.pid)
kill $(cat .worker.pid)

# Windows: 关闭命令行窗口或任务管理器
```

### Q: 可以同时运行多个 Worker 吗?

A: 同机部署默认只启动一个 Worker。如需多个:
1. 手动启动额外的 Worker 进程
2. 或改用真分布式部署方案

### Q: 性能等级选错了怎么办?

A: 在 Web 界面修改即可,无需重启:
1. 访问 /workers.html
2. 编辑 Worker 配置
3. 修改性能等级并保存

## 🔗 相关文档

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 完整部署指南
- [README.md](README.md) - 项目介绍
- [docs/deployment/](docs/deployment/) - 更多部署文档

## 💡 最佳实践

1. **开发阶段**: 使用同机部署快速验证功能
2. **测试阶段**: 选择 `medium` 性能等级
3. **学习阶段**: 先同机部署理解原理,再尝试分布式
4. **生产环境**: 建议使用真分布式部署方案

---

**部署简单,功能完整,快速上手！** 🚀
