# 📚 Benchmark Web Server - 文档整理总结

> 文档整理日期: 2025-11-25

## ✅ 完成的工作

### 1. 清理临时和冗余文件

#### 删除的临时配置文件（5个）

- `benchmark.config.task_1764044972160_4kosbh3e6.mts`
- `benchmark.config.task_1764045595644_6ib64julv.mts`
- `benchmark.config.task_1764071258627_qoknu3aul.mts`
- `benchmark.config.task_1764071262709_dfftmkwo8.mts`
- `benchmark.config.task_1764071282525_9azbz70mn.mts`

#### 删除的临时数据目录（3个）

- `usr_data/task_1764071258627_qoknu3aul/`
- `usr_data/task_1764071262709_dfftmkwo8/`
- `usr_data/task_1764071282525_9azbz70mn/`

#### 删除的过时文档（30个）

**Cookie相关（10个）**:
- COOKIE_AUTO_FETCH.md
- COOKIE_AUTO_REFRESH_GUIDE.md
- COOKIE_AUTO_REFRESH_SUMMARY.md
- COOKIE_DEBUG_GUIDE.md
- COOKIE_FIX.md
- COOKIE_PLAYWRIGHT_FORMAT_FIX.md
- COOKIE_QUICK_REFERENCE.md
- COOKIE_TEST_DEBUG.md
- COOKIE_VALIDATION_GUIDE.md
- COOKIE_VALIDATION_SUMMARY.md

**编码相关（8个）**:
- ENCODING_ANALYSIS.md
- ENCODING_DOCS_INDEX.md
- ENCODING_FINDINGS.txt
- ENCODING_QUICK_REFERENCE.md
- PERFCAT_DATA_ENCODING.md
- PERFCAT_ENCODING_CHANGELOG.md
- PERFCAT_ENCODING_IMPLEMENTATION.md
- TROUBLESHOOTING_PERFCAT.md

**修复和临时文档（12个）**:
- CONCURRENT_BROWSER_FIX.md
- FAILURE_DETAILS_FIX.md
- CHART_ERROR_FIX.md
- ANALYSIS_SUMMARY.md
- IMPLEMENTATION_COMPLETE.md
- IMPLEMENTATION_SUMMARY.md
- NETWORK_SIMULATION_FEATURE.md
- NETWORK_SIMULATION_FIX.md
- NETWORK_SIMULATION_SUMMARY.md
- PARALLEL_EXECUTION.md
- TEST_LABEL_GUIDE.md
- TEST_RECORD_FIX.md
- URL_DESCRIPTIONS.md

**总计删除**: 35个文件/目录

### 2. 更新核心文档

#### README.md - 主文档（15KB）

**更新内容**:
- ✅ 重写项目介绍，突出"用例驱动的性能测试平台"定位
- ✅ 重新组织文档导航，按使用频率排序
- ✅ 详细说明5大核心功能模块
  - 🧪 测试用例管理
  - 🚀 测试执行
  - 📊 数据分析
  - 🔧 高级配置
  - 🔐 安全与API
- ✅ 更新API接口文档，补充测试用例管理API
- ✅ 添加测试用例JSON示例（4个场景）
- ✅ 更新项目结构说明
- ✅ 完善技术栈说明
- ✅ 优化故障排查指南

#### QUICKSTART.md - 快速开始（8.6KB）

**更新内容**:
- ✅ 完全重写以匹配新的测试用例管理系统
- ✅ 添加预设模板使用说明
- ✅ 详细说明手动创建测试用例的步骤
- ✅ 添加Per-URL配置功能说明
- ✅ 详细说明5个生命周期钩子
- ✅ 添加4个常见使用场景示例
- ✅ 添加Perfcat配置指南
- ✅ 更新故障排查部分

## 📋 当前文档结构

### 核心文档（必读）

| 文档 | 大小 | 用途 | 更新状态 |
|------|------|------|---------|
| [README.md](README.md) | 15KB | 主文档，功能概览 | ✅ 已更新 |
| [QUICKSTART.md](QUICKSTART.md) | 8.6KB | 3分钟快速上手 | ✅ 已更新 |
| [USAGE_GUIDE.md](USAGE_GUIDE.md) | 15KB | 详细使用指南 | ⚠️ 待验证 |
| [INSTALL.md](INSTALL.md) | 4.6KB | 安装依赖 | ✅ 保持 |

### 功能文档

| 文档 | 大小 | 用途 | 更新状态 |
|------|------|------|---------|
| [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md) | 10KB | 测试记录管理 | ✅ 保持 |
| [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) | 7.4KB | Perfcat集成 | ✅ 保持 |
| [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md) | 3.3KB | Perfcat设置 | ✅ 保持 |
| [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) | 9.1KB | 预设系统 | ✅ 保持 |
| [BILIBILI_LIVE_PRESETS.md](BILIBILI_LIVE_PRESETS.md) | 14KB | B站直播预设 | ✅ 保持 |
| [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md) | 11KB | 数据可视化 | ✅ 保持 |
| [CONFIG_PRESETS_GUIDE.md](CONFIG_PRESETS_GUIDE.md) | 11KB | 配置预设 | ✅ 保持 |

### 部署和运维

| 文档 | 大小 | 用途 | 更新状态 |
|------|------|------|---------|
| [ONE_CLICK_DEPLOY.md](ONE_CLICK_DEPLOY.md) | 4.7KB | 一键部署 | ✅ 保持 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 8.0KB | 生产部署 | ✅ 保持 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 9.1KB | 故障排查 | ✅ 保持 |

### 参考文档

| 文档 | 大小 | 用途 | 更新状态 |
|------|------|------|---------|
| [IMPORTANT.md](IMPORTANT.md) | 6.1KB | 重要说明 | ✅ 保持 |
| [SUMMARY.md](SUMMARY.md) | 9.5KB | 项目总结 | ✅ 保持 |
| [CHANGELOG.md](CHANGELOG.md) | 4.5KB | 更新日志 | ✅ 保持 |

## 🎯 项目核心特性总结

### 1. 测试用例管理系统

- **持久化存储**: 测试用例保存在服务器端（`testcases.json`）
- **模板系统**: 10+ 预设模板，快速创建常见测试场景
- **标签分类**: 使用标签组织和筛选测试用例
- **执行历史**: 自动关联每个测试用例的执行记录
- **ID格式**: `testcase_${timestamp}_${randomId}`

### 2. Per-URL配置功能

同一测试用例中的不同URL可以使用独立配置：

- Cookie（字符串或对象格式）
- 页面延迟（delayMs）
- HTTP Headers
- 网络条件（模拟2G/3G/4G）
- 自定义CSS
- 资源阻止列表（blockList）
- 设备选项（Desktop/Mobile）
- 生命周期钩子（5个）

### 3. 三种Runner类型

- **Initialization**: 初始化性能测试（页面加载）
- **Runtime**: 运行时性能测试（长时间运行）
- **MemoryLeak**: 内存泄漏测试

### 4. 生命周期钩子

5个钩子覆盖测试全过程：

1. `beforePageLoad`: 页面加载前
2. `onPageLoaded`: 页面加载完成后
3. `onPageTesting`: 测试运行期间
4. `onPageCollecting`: 数据收集期间
5. `onPageUnload`: 页面卸载前

### 5. 数据分析和可视化

- **Perfcat集成**: 自动上传报告，生成可视化图表
- **测试记录**: 完整的执行历史，支持筛选和统计
- **数据压缩**: LZ-String压缩，减少网络传输
- **双链接模式**: 标准视图 + 图表模式

## 📊 技术架构

### 后端

- **框架**: Express.js + TypeScript
- **Node.js**: 18+
- **实时通信**: WebSocket (ws库)
- **数据压缩**: LZ-String
- **进程管理**: child_process

### 前端

- **原生技术**: HTML/CSS/JavaScript（无框架依赖）
- **UI设计**: 响应式设计，支持移动端
- **实时更新**: WebSocket推送

### 数据存储

- **测试用例**: `testcases.json`（服务器持久化）
- **执行记录**: `test-records.json`
- **报告文件**: `benchmark_report/` 目录
- **浏览器数据**: `usr_data/` 目录（每个任务独立）

## 🔌 API接口

### 测试用例管理 API

- `GET /api/testcases` - 获取所有测试用例
- `GET /api/testcases/:id` - 获取单个测试用例
- `POST /api/testcases` - 创建测试用例
- `PUT /api/testcases/:id` - 更新测试用例
- `DELETE /api/testcases/:id` - 删除测试用例
- `GET /api/testcases/:id/executions` - 获取执行历史

### 任务执行 API

- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 启动测试任务
- `POST /api/tasks/:taskId/stop` - 停止任务
- `DELETE /api/tasks/:taskId` - 删除任务

### 测试记录 API

- `GET /api/test-records` - 获取测试记录
- `GET /api/test-records/stats` - 获取统计信息
- `DELETE /api/test-records/:id` - 删除记录
- `POST /api/test-records/clear` - 清空记录

### Perfcat API

- `GET /api/perfcat` - 获取配置
- `POST /api/perfcat` - 设置配置
- `POST /api/perfcat/test` - 测试连接

### 安全 API

- `GET /api/api-keys` - 管理API密钥
- `POST /api/api-keys` - 生成密钥
- `GET /api/webhook` - Webhook配置

## 📁 数据文件

| 文件 | 用途 | 格式 |
|------|------|------|
| `testcases.json` | 测试用例存储 | JSON |
| `test-records.json` | 执行记录存储 | JSON |
| `perfcat-config.json` | Perfcat配置 | JSON |
| `api-keys.json` | API密钥 | JSON |
| `webhook-config.json` | Webhook配置 | JSON |

## ⚠️ 注意事项

1. **并发执行**: 支持多个测试任务并发运行
2. **数据持久化**: 所有数据自动保存到JSON文件
3. **浏览器配置**: 每个任务使用独立的`usr_data`目录
4. **端口配置**: 默认3000，可通过环境变量`PORT`修改
5. **安全建议**: 生产环境建议启用API密钥认证

## 🚀 快速开始

```bash
# 一键部署（推荐）
./deploy.sh  # macOS/Linux
deploy.bat   # Windows

# 或手动执行
npm install
npm run build
npm run dev
```

访问 http://localhost:3000 开始使用！

## 📚 文档使用建议

### 新手入门路径

1. [QUICKSTART.md](QUICKSTART.md) - 3分钟快速上手
2. [README.md](README.md) - 了解完整功能
3. [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) - 使用预设模板
4. [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md) - 查看测试记录

### 高级用户路径

1. [USAGE_GUIDE.md](USAGE_GUIDE.md) - Per-URL配置和API
2. [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) - 集成Perfcat
3. [BILIBILI_LIVE_PRESETS.md](BILIBILI_LIVE_PRESETS.md) - B站直播专用
4. [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md) - 数据分析

### 部署运维路径

1. [INSTALL.md](INSTALL.md) - 依赖安装
2. [ONE_CLICK_DEPLOY.md](ONE_CLICK_DEPLOY.md) - 快速部署
3. [DEPLOYMENT.md](DEPLOYMENT.md) - 生产部署
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 问题排查

## 🎉 总结

本次文档整理工作：

- ✅ 删除了35个临时/过时文件
- ✅ 更新了2个核心文档（README.md、QUICKSTART.md）
- ✅ 保留了15个有效文档
- ✅ 优化了文档结构和导航
- ✅ 补充了最新功能说明
- ✅ 统一了文档风格和格式

项目文档现在更加简洁、清晰、易用！

---

**文档维护者**: Claude Code
**最后更新**: 2025-11-25
