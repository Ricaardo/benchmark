# Benchmark Web Platform

基于 Playwright 的分布式性能测试平台 - 用例驱动、可视化管理、分布式执行

## 特性

### 核心功能
- **测试用例管理** - 可视化创建、编辑、导入/导出测试用例
- **多Runner支持** - Initialization（冷启动）、Runtime（运行时）、MemoryLeak（内存泄漏）
- **实时监控** - WebSocket 实时推送测试进度和日志
- **测试记录** - 完整的执行历史、筛选、搜索和统计
- **Perfcat 集成** - 自动上传测试报告到 Perfcat 生成可视化图表

### 分布式执行
- **Worker 节点** - 支持多台机器作为测试执行节点
- **性能分级** - 高配/中配/低配三档性能分级，智能调度
- **批量分发** - 一次选择多个用例批量分发到 Worker 执行
- **实时状态** - Worker 节点实时状态监控和心跳检测
- **负载均衡** - 自动分配任务到最合适的 Worker 节点

### 高级配置
- **Per-URL 配置** - 同一用例中不同 URL 可使用独立配置
- **预设模板** - 10+ 内置测试场景模板
- **Cookie 管理** - 自动 Cookie 验证和用户信息展示
- **自定义 Hooks** - 支持页面加载前后自定义脚本

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地运行

```bash
# 开发模式（端口 3000）
npm start

# 生产模式
npm run build
npm run serve
```

访问: http://localhost:3000

### 分布式部署

#### 🚀 一键自动化部署（推荐）

每台机器独立运行部署脚本，无需 SSH 配置。

**在每台机器上分别运行：**

```bash
# Linux/macOS
./scripts/standalone-deploy.sh

# Windows
scripts\standalone-deploy.bat
```

**部署选项：**
1. **Master 节点** - 主控服务器 + Web UI
2. **Worker 节点** - 测试执行节点
3. **Master + Worker** - 同机部署（适合单机环境）

脚本会自动：
- ✅ 检测 Node.js 环境
- ✅ 安装依赖和构建
- ✅ 配置连接信息
- ✅ 启动服务（支持 PM2）

**详细指南：** [STANDALONE_DEPLOY.md](STANDALONE_DEPLOY.md)

---

#### 手动部署

**1. 启动主服务器（Master）**

```bash
# 在主服务器上运行
npm start
```

**2. 启动 Worker 节点**

根据机器性能选择对应的启动脚本：

**Linux/macOS:**
```bash
# 高配机器
./scripts/start-worker-high.sh

# 中配机器
./scripts/start-worker-medium.sh

# 低配机器
./scripts/start-worker-low.sh
```

**Windows:**
```batch
REM 高配机器
scripts\start-worker-high.bat

REM 中配机器
scripts\start-worker-medium.bat

REM 低配机器
scripts\start-worker-low.bat
```

**自定义 Worker 配置:**
```bash
export MASTER_URL="http://192.168.1.100:3000"  # 主服务器地址
export WORKER_NAME="我的测试机"
export PERFORMANCE_TIER="medium"               # high/medium/low/custom
export WORKER_DESCRIPTION="8核16GB - Ubuntu"
export WORKER_TAGS="linux,testing"

npx tsx server/worker-client.ts
```

## 文档

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 主文档（当前） |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 - 生产环境部署方案 |
| [USAGE.md](USAGE.md) | 使用指南 - 功能详解和最佳实践 |
| [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md) | 分布式部署 - 三机部署方案 |
| [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md) | 分布式架构 - 技术设计文档 |
| [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md) | Worker 选择策略 |
| [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) | Perfcat 集成指南 |
| [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md) | Perfcat 设置教程 |
| [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md) | 测试记录使用指南 |
| [USAGE_GUIDE.md](USAGE_GUIDE.md) | Per-URL 配置指南 |
| [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) | 预设系统使用指南 |
| [CONFIG_PRESETS_GUIDE.md](CONFIG_PRESETS_GUIDE.md) | 配置预设指南 |
| [BILIBILI_LIVE_PRESETS.md](BILIBILI_LIVE_PRESETS.md) | B站直播测试预设 |
| [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md) | 数据可视化说明 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 故障排查 |
| [CHANGELOG.md](CHANGELOG.md) | 更新日志 |

## 项目结构

```
benchmark/
├── server/                    # 后端服务
│   ├── index.ts              # 主服务器入口
│   ├── worker-client.ts      # Worker 客户端
│   ├── worker-manager.ts     # Worker 管理器
│   ├── distributed-task-manager.ts  # 分布式任务管理
│   ├── websocket-manager.ts  # WebSocket 管理
│   ├── distributed-routes.ts # 分布式 API 路由
│   └── distributed-integration.ts  # 分布式集成模块
├── public/                   # 前端静态文件
│   ├── index.html           # 主页面
│   ├── worker-selector.js   # Worker 选择组件
│   ├── batch-dispatcher.js  # 批量分发组件
│   └── test-records.html    # 测试记录页面
├── scripts/                  # 启动脚本
│   ├── start-worker-high.sh
│   ├── start-worker-medium.sh
│   └── start-worker-low.sh
├── data/                     # 数据存储
│   ├── workers/             # Worker 节点信息
│   ├── distributed-tasks/   # 分布式任务数据
│   └── test-cases/          # 测试用例数据
└── docs/                     # 详细文档

```

## 核心概念

### 测试用例（Test Case）
一个测试用例定义了：
- 要测试的 URL 列表
- 测试类型（Initialization/Runtime/MemoryLeak）
- 高级配置（Cookie、Headers、延迟等）
- Per-URL 独立配置

### Worker 节点
- **Master**: 主服务器，负责任务调度、Web UI、数据存储
- **Worker**: 执行节点，接收 Master 分发的测试任务并执行
- **性能等级**: high/medium/low/custom，用于智能任务分配

### 测试记录（Test Record）
每次测试执行生成一条记录，包含：
- 测试配置和参数
- 执行结果和性能数据
- 报告文件链接
- 执行时间和状态

## 使用场景

### 场景1: 本地单机测试
适合：开发环境、快速验证

```bash
npm start
# 访问 http://localhost:3000
# 创建测试用例 → 运行测试 → 查看报告
```

### 场景2: 分布式多机测试
适合：生产环境、大规模测试

```bash
# 主服务器
npm start

# Worker 1 (高配)
./scripts/start-worker-high.sh

# Worker 2 (中配)
./scripts/start-worker-medium.sh

# Worker 3 (低配)
./scripts/start-worker-low.sh

# 前端选择 Worker 或批量分发 → 测试在对应机器执行
```

### 场景3: 批量回归测试
适合：版本发布前、夜间批量测试

```bash
# 创建多个测试用例
# 全选测试用例 → 批量分发 → 选择"自动分配"策略
# 系统自动分配到中配 Worker 执行
```

## 默认 Worker 选择策略

当未明确选择 Worker 时，系统按以下优先级自动选择：

1. **中配 Worker (medium)** - 首选
2. **低配 Worker (low)** - 备选1
3. **高配 Worker (high)** - 备选2
4. **自定义 Worker (custom)** - 备选3
5. **本地执行** - 无可用 Worker 时

详见: [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md)

## 常见问题

### 如何配置 Worker 连接到远程 Master？

修改启动脚本中的 `MASTER_URL`:
```bash
export MASTER_URL="http://192.168.1.100:3000"
```

### 批量分发时如何选择特定 Worker？

在批量分发模态框中选择"指定 Worker"策略，然后选择目标节点。

### 如何查看历史测试记录？

访问 `/test-records.html` 页面，可筛选、搜索和统计测试记录。

### Worker 离线后任务会怎样？

任务状态会标记为 `failed`，可在前端查看详细错误信息。

### 如何调试 Worker 执行问题？

查看 Worker 终端输出，或检查 `data/distributed-tasks/` 目录下的任务文件。

更多问题参见: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 技术栈

- **前端**: HTML + Vanilla JavaScript + WebSocket
- **后端**: Node.js + Express + TypeScript
- **测试引擎**: Playwright
- **数据存储**: JSON 文件
- **实时通信**: WebSocket (ws)
- **可视化**: Perfcat

## 开发

### 构建

```bash
npm run build
```

### 开发模式

```bash
npm start
# 代码修改后自动重启
```

### 目录说明

- `server/` - TypeScript 源码
- `public/` - 前端静态文件
- `data/` - 运行时数据存储
- `scripts/` - 启动脚本
- `docs/` - 详细文档

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT
