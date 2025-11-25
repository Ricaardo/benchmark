# Benchmark Web Server

通过 Web 界面管理和运行 Bilibili Player 的性能测试 - **用例驱动的性能测试平台**

## 📖 文档导航

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 📘 主文档 - 功能说明和使用指南（当前文档） |
| [QUICKSTART.md](QUICKSTART.md) | ⚡ 快速开始 - 3分钟快速上手 |
| [USAGE_GUIDE.md](USAGE_GUIDE.md) | 📖 使用指南 - 测试用例管理与Per-URL配置 |
| [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md) | 📝 测试记录 - 测试历史记录管理和查询 |
| [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) | 📊 Perfcat集成 - 自动上传测试报告到Perfcat |
| [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md) | 🔧 Perfcat设置 - 配置Perfcat集成 |
| [ONE_CLICK_DEPLOY.md](ONE_CLICK_DEPLOY.md) | 🚀 一键部署 - 三端（Win/Mac/Linux）一键部署指南 |
| [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) | 🎨 预设系统 - 测试用例模板和快速配置 |
| [BILIBILI_LIVE_PRESETS.md](BILIBILI_LIVE_PRESETS.md) | 🔴 B站直播预设 - 直播测试专用操作指南 |
| [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md) | 📈 数据可视化 - 测试报告图表和分析 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 🚢 部署指南 - 生产环境部署方案 |
| [INSTALL.md](INSTALL.md) | 📦 安装指南 - 依赖安装和环境配置 |
| [IMPORTANT.md](IMPORTANT.md) | ⚠️ 重要说明 - 关于 benchmark 包的说明 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 🔧 故障排查 - 常见问题解决方案 |
| [SUMMARY.md](SUMMARY.md) | 📊 项目总结 - 架构设计和技术说明 |
| [CHANGELOG.md](CHANGELOG.md) | 📝 更新日志 - 版本更新记录 |

## ✨ 核心功能

### 🧪 测试用例管理

- **持久化存储** - 测试用例保存在服务器，跨浏览器同步
- **模板系统** - 10+ 预设模板，快速创建常见测试场景
- **标签分类** - 使用标签组织和筛选测试用例
- **执行历史** - 自动关联每个测试用例的执行记录
- **Per-URL配置** - 同一用例中不同URL可使用不同配置（Cookie、延迟、Headers等）

### 🚀 测试执行

- **多Runner支持** - Initialization（初始化）、Runtime（运行时）、MemoryLeak（内存泄漏）
- **并发控制** - 支持多个测试任务并行执行
- **实时监控** - WebSocket实时推送测试日志和进度
- **优雅停止** - 支持正常停止和强制终止
- **重复执行** - 可配置测试重复次数

### 📊 数据分析

- **Perfcat集成** - 自动上传报告到Perfcat，生成可视化图表
- **测试记录** - 完整的执行历史，支持筛选、搜索、统计
- **数据压缩** - LZ-String压缩，减少网络传输
- **图表模式** - 支持标准和图表两种报告查看模式

### 🔧 高级配置

- **Cookie管理** - 支持字符串或对象格式的Cookie配置
- **网络模拟** - 模拟2G/3G/4G等不同网络环境
- **设备模拟** - 支持Desktop/Mobile设备配置
- **资源阻止** - 可阻止特定资源加载（图片、字体等）
- **自定义CSS** - 注入CSS样式（如隐藏广告）
- **生命周期钩子** - beforePageLoad、onPageLoaded、onPageTesting等5个钩子

### 🔐 安全与API

- **API密钥** - 支持多密钥管理，保护API接口
- **Webhook通知** - 测试完成后自动推送通知
- **CORS支持** - 允许跨域API调用

## 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- `@bilibili-player/benchmark` 包（B站内部工具）

> 💡 **首次安装**: 请先查看 [INSTALL.md](INSTALL.md) 了解如何安装依赖和 benchmark 工具。

## 快速开始

### 🚀 一键部署（推荐）

#### 方式 1: 本地部署脚本

**macOS / Linux / WSL**:
```bash
./deploy.sh
```

**Windows**:
```bash
deploy.bat
```

**功能特性**:
- ✅ 自动检测操作系统和 Node.js 环境
- ✅ 自动安装依赖
- ✅ 自动编译 TypeScript
- ✅ 自动启动服务器
- ✅ 自动打开浏览器

#### 方式 2: Docker 部署（跨平台）

**使用 Docker Compose（推荐）**:
```bash
docker-compose up -d
```

**或使用 Docker 命令**:
```bash
# 构建镜像
npm run docker:build

# 运行容器
npm run docker:run
```

**优势**:

- ✅ 无需安装 Node.js
- ✅ 环境隔离，避免依赖冲突
- ✅ 一次构建，到处运行
- ✅ 支持 Windows/macOS/Linux
- ✅ 自动健康检查和重启

**访问服务**:

- 本地访问: `http://localhost:3000`
- 网络访问: `http://<你的IP>:3000`

> 📖 详细 Docker 部署指南请参考 [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)

### 📋 手动部署

如果您需要更多控制，可以手动执行以下步骤：

**1. 安装依赖**

```bash
npm install
```

> ⚠️ 如果遇到 `@bilibili-player/benchmark` 安装问题，请查看 [INSTALL.md](INSTALL.md)

**2. 编译代码**

```bash
npm run build
```

**3. 启动服务器**

开发模式（推荐，支持热重载）:
```bash
npm run dev
```

生产模式:
```bash
npm start
```

**4. 访问 Web 界面**

打开浏览器访问: `http://localhost:3000`

## 📖 使用说明

### 🎯 主界面 - 测试用例管理

访问 `http://localhost:3000` 进入主界面：

**核心功能**：

1. **测试用例列表** - 查看和管理所有测试用例
   - 按标签筛选用例
   - 搜索用例名称和描述
   - 查看用例详情和配置

2. **创建测试用例** - 点击"➕ 添加测试用例"
   - 填写基本信息（名称、描述、标签）
   - 选择Runner类型（可多选）
   - 配置测试参数（运行时长、重复次数等）
   - 添加测试URL（支持多个URL）
   - 配置高级选项（Cookie、网络、钩子等）

3. **Per-URL配置** - 为每个URL独立配置
   - Cookie（支持字符串或对象格式）
   - 页面延迟（delayMs）
   - HTTP Headers（自定义请求头）
   - 网络条件（模拟2G/3G/4G）
   - 自定义CSS（注入样式）
   - 资源阻止列表（blockList）
   - 设备选项（Desktop/Mobile）
   - 生命周期钩子（5个钩子函数）

4. **执行测试** - 直接运行或查看历史
   - 点击"运行"按钮启动测试
   - 支持选择特定Runner执行
   - 实时查看任务状态和输出
   - 查看执行历史记录

5. **预设模板** - 快速创建常见场景
   - 10+ 预设模板可选
   - 一键应用模板配置
   - 支持自定义修改

> 📖 详细教程请参考 [USAGE_GUIDE.md](USAGE_GUIDE.md)

### 📊 测试记录

访问 `http://localhost:3000/records.html` 查看执行历史：

**功能特性**：

- 📝 自动保存每次测试的完整信息
- 🔍 按Runner类型、状态、时间范围筛选
- 📊 统计信息（总数、成功率、平均耗时）
- 🔗 直接访问Perfcat报告链接（标准+图表）
- 📈 可视化图表展示趋势
- 📄 支持分页（20/50/100条/页）
- 🗑️ 删除单条或批量清空

**记录内容**：

- 测试用例名称和ID
- Runner类型
- 执行状态（成功/失败）
- 开始时间和运行时长
- Perfcat报告链接
- 退出代码和错误信息

> 📖 详细说明请参考 [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md)

### 🔧 Perfcat集成

**配置Perfcat**（可选但推荐）：

1. 在主界面点击"⚙️ 设置"
2. 进入"Perfcat配置"标签
3. 填写Perfcat URL和Cookie
4. 点击"测试连接"验证配置
5. 保存配置

**自动上传流程**：

测试完成后自动：
1. 生成JSON格式的测试报告
2. 使用LZ-String压缩数据
3. 上传到Perfcat服务
4. 返回两种链接（标准视图+图表模式）
5. 保存到测试记录

> 📖 详细配置请参考 [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md)

## 🔌 API 接口

服务器提供以下 REST API:

### 测试用例管理 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/testcases` | GET | 获取所有测试用例（支持tags、search查询参数） |
| `/api/testcases/:id` | GET | 获取单个测试用例详情 |
| `/api/testcases` | POST | 创建新测试用例 |
| `/api/testcases/:id` | PUT | 更新测试用例 |
| `/api/testcases/:id` | DELETE | 删除测试用例 |
| `/api/testcases/:id/executions` | GET | 获取测试用例的执行历史 |

### 任务执行 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/tasks` | GET | 获取所有任务列表 |
| `/api/tasks/:taskId` | GET | 获取单个任务详情 |
| `/api/tasks` | POST | 启动测试任务（需传递testCaseId和runner） |
| `/api/tasks/:taskId/stop` | POST | 停止指定任务（支持force参数强制停止） |
| `/api/tasks/:taskId` | DELETE | 删除任务 |

### 测试记录 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/test-records` | GET | 获取测试记录列表（支持runner、status、page、limit过滤） |
| `/api/test-records/:id` | GET | 获取单条测试记录详情 |
| `/api/test-records/:id` | DELETE | 删除指定测试记录 |
| `/api/test-records/clear` | POST | 清空测试记录（支持runner、status条件筛选） |
| `/api/test-records/stats` | GET | 获取测试统计信息 |

### Perfcat 集成 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/perfcat` | GET | 获取Perfcat配置状态 |
| `/api/perfcat` | POST | 设置Perfcat配置（URL和Cookie） |
| `/api/perfcat/test` | POST | 测试Perfcat上传功能 |

### 报告管理 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/reports` | GET | 获取报告列表 |
| `/api/reports/:filename` | DELETE | 删除指定报告文件 |
| `/reports/*` | GET | 访问报告文件（静态文件服务） |

### 安全 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/api-keys` | GET | 获取所有API密钥（需API密钥认证） |
| `/api/api-keys` | POST | 生成新的API密钥 |
| `/api/api-keys` | DELETE | 删除指定API密钥 |
| `/api/webhook` | GET | 获取Webhook配置 |
| `/api/webhook` | POST | 设置Webhook URL |

> 📖 详细 API 文档和示例请参考 [USAGE_GUIDE.md](USAGE_GUIDE.md)

## 📁 项目结构

```text
benchmark/
├── server/
│   ├── index.ts              # Express 服务器主文件（2900+ 行）
│   └── testcase-storage.ts  # 测试用例存储管理
├── public/
│   ├── index.html            # 主界面 - 测试用例管理
│   ├── records.html          # 测试记录查看界面
│   ├── debug.html            # API 调试工具
│   ├── test-console.html     # 控制台诊断工具
│   └── simple-test.html      # 简单测试页面
├── benchmark_report/         # 测试报告存储目录
├── usr_data/                 # 用户数据目录（浏览器配置文件等）
├── testcases.json            # 测试用例数据（服务器持久化）
├── test-records.json         # 测试执行记录
├── perfcat-config.json       # Perfcat 配置
├── api-keys.json             # API 密钥配置
├── webhook-config.json       # Webhook 配置
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 说明文档（当前文档）
```

## 📝 测试用例示例

### 示例 1: 基础性能测试

```json
{
  "name": "B站首页性能测试",
  "description": "测试B站首页的加载和运行时性能",
  "runners": {
    "Initialization": { "enabled": true, "iterations": 3 },
    "Runtime": { "enabled": true, "durationMs": 60000, "delayMs": 10000 }
  },
  "urlsWithDesc": [
    {
      "url": "https://www.bilibili.com",
      "description": "B站首页"
    }
  ],
  "mode": "headless",
  "repeatCount": 1,
  "anonymous": true,
  "cpuThrottling": 1,
  "tags": ["bilibili", "首页", "性能"]
}
```

### 示例 2: Per-URL配置 - 登录前后对比

```json
{
  "name": "登录状态对比测试",
  "urlsWithDesc": [
    {
      "url": "https://www.bilibili.com",
      "description": "游客模式",
      "config": {
        "cookie": ""
      }
    },
    {
      "url": "https://www.bilibili.com",
      "description": "登录模式",
      "config": {
        "cookie": "your_cookie_string_here"
      }
    }
  ],
  "runners": {
    "Runtime": { "enabled": true, "durationMs": 60000, "delayMs": 10000 }
  }
}
```

### 示例 3: 网络条件模拟

```json
{
  "name": "弱网环境测试",
  "urlsWithDesc": [
    {
      "url": "https://www.bilibili.com",
      "description": "4G网络",
      "config": {
        "networkConditions": {
          "downloadThroughput": 4000000,
          "uploadThroughput": 3000000,
          "latency": 20
        }
      }
    },
    {
      "url": "https://www.bilibili.com",
      "description": "3G网络",
      "config": {
        "networkConditions": {
          "downloadThroughput": 1600000,
          "uploadThroughput": 750000,
          "latency": 150
        }
      }
    }
  ]
}
```

### 示例 4: 生命周期钩子

```json
{
  "name": "页面交互测试",
  "urlsWithDesc": [
    {
      "url": "https://www.bilibili.com/video/BV1xx411c7Xg",
      "description": "视频页面",
      "config": {
        "hooks": {
          "onPageLoaded": "await page.waitForSelector('.bpx-player-container');",
          "onPageTesting": "await page.click('.bpx-player-primary-area'); await page.waitForTimeout(5000);"
        }
      }
    }
  ],
  "runners": {
    "Runtime": { "enabled": true, "durationMs": 30000, "delayMs": 5000 }
  }
}
```

> 📖 更多示例请参考 [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) 和 [BILIBILI_LIVE_PRESETS.md](BILIBILI_LIVE_PRESETS.md)

## 🛠️ 技术栈

- **后端**: Express.js + TypeScript + Node.js 18+
- **前端**: 原生 HTML/CSS/JavaScript（无框架依赖）
- **实时通信**: WebSocket (ws库)
- **数据压缩**: LZ-String
- **测试引擎**: @bilibili-player/benchmark (B站内部工具)
- **进程管理**: child_process (Node.js原生)

## ⚠️ 注意事项

1. **依赖要求**: 确保已安装 `@bilibili-player/benchmark` 包（参考 [INSTALL.md](INSTALL.md)）
2. **并发控制**: 支持多个测试任务并发执行，每个测试用例可独立运行
3. **数据持久化**:
   - 测试用例保存在 `testcases.json`
   - 执行记录保存在 `test-records.json`
   - 报告文件保存在 `benchmark_report/` 目录
4. **浏览器数据**: 每个任务在 `usr_data/` 目录下创建独立的浏览器配置文件
5. **端口配置**: 默认端口3000，可通过环境变量 `PORT` 修改
6. **安全建议**: 生产环境建议启用API密钥认证

## 🔧 故障排查

### 端口被占用

方法 1: 使用环境变量修改端口

```bash
PORT=3001 npm run dev
```

方法 2: 修改 [server/index.ts:16](server/index.ts#L16)

```typescript
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
```

### 依赖安装失败

尝试清除缓存后重新安装:

```bash
rm -rf node_modules package-lock.json
npm install
```

如果 `@bilibili-player/benchmark` 安装失败，请参考 [INSTALL.md](INSTALL.md)

### WebSocket连接失败

检查防火墙设置，确保允许WebSocket连接。如果使用反向代理，需要配置WebSocket支持。

### 测试无法启动

1. 检查 `testcases.json` 格式是否正确
2. 确认测试用例配置完整（必须包含name、runners、urlsWithDesc）
3. 查看浏览器控制台和服务器日志获取详细错误信息

更多问题请参考 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 📚 相关资源

- [项目仓库](https://github.com/your-repo/benchmark-web-server)
- [问题反馈](https://github.com/your-repo/benchmark-web-server/issues)
- [@bilibili-player/benchmark 文档](https://www.npmjs.com/package/@bilibili-player/benchmark)

## 📄 License

MIT License - 详见 LICENSE 文件

---

**🚀 开始使用**: 运行 `./deploy.sh` (Mac/Linux) 或 `deploy.bat` (Windows) 一键启动！
