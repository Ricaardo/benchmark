# 文档索引

完整的文档导航和说明。

## 📚 文档分类

### 🚀 快速开始

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [README.md](README.md) | 项目概述、快速开始、核心功能 | 所有人 |
| [USAGE.md](USAGE.md) | 详细使用指南、最佳实践 | 测试人员 |

### 🚢 部署运维

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | 生产环境部署、系统配置、监控 | 运维人员 |
| [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md) | 分布式三机部署方案 | 运维人员 |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | 故障排查、常见问题 | 运维/测试人员 |

### 🏗️ 架构设计

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md) | 分布式架构设计、技术细节 | 开发人员 |
| [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md) | Worker 选择策略实现 | 开发人员 |

### 🎯 功能指南

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [USAGE_GUIDE.md](USAGE_GUIDE.md) | Per-URL 配置、高级功能 | 测试人员 |
| [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md) | 测试记录管理、查询统计 | 测试人员 |
| [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) | 预设模板使用、自定义 | 测试人员 |
| [CONFIG_PRESETS_GUIDE.md](CONFIG_PRESETS_GUIDE.md) | 配置预设详解 | 测试人员 |
| [BILIBILI_LIVE_PRESETS.md](BILIBILI_LIVE_PRESETS.md) | B站直播测试专用指南 | B站测试人员 |

### 📊 数据分析

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) | Perfcat 集成说明 | 测试/开发人员 |
| [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md) | Perfcat 配置教程 | 测试人员 |
| [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md) | 数据可视化功能 | 测试人员 |

### 📝 其他

| 文档 | 说明 | 适合人群 |
|------|------|---------|
| [CHANGELOG.md](CHANGELOG.md) | 版本更新记录 | 所有人 |
| [docs/](docs/) | 技术参考文档 | 开发人员 |

## 🎯 使用场景导航

### 场景 1: 我是新用户，想快速上手

**推荐阅读顺序:**
1. [README.md](README.md) - 了解项目
2. [README.md#快速开始](README.md#快速开始) - 安装运行
3. [USAGE.md#快速开始](USAGE.md#快速开始) - 创建第一个测试

**预计时间:** 10 分钟

### 场景 2: 我要部署到生产环境

**推荐阅读顺序:**
1. [DEPLOYMENT.md](DEPLOYMENT.md) - 了解部署架构和要求
2. [DEPLOYMENT.md#安装部署](DEPLOYMENT.md#安装部署) - 按步骤部署
3. [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md) - 配置分布式节点
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 常见问题排查

**预计时间:** 1-2 小时

### 场景 3: 我要配置分布式测试

**推荐阅读顺序:**
1. [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md) - 三机部署方案
2. [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md) - 了解 Worker 选择
3. [USAGE.md#分布式执行](USAGE.md#分布式执行) - 使用分布式功能
4. [USAGE.md#批量测试](USAGE.md#批量测试) - 批量分发

**预计时间:** 30 分钟

### 场景 4: 我要创建复杂的测试用例

**推荐阅读顺序:**
1. [USAGE.md#测试用例管理](USAGE.md#测试用例管理) - 基础创建
2. [USAGE_GUIDE.md](USAGE_GUIDE.md) - Per-URL 高级配置
3. [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md) - 使用预设模板
4. [CONFIG_PRESETS_GUIDE.md](CONFIG_PRESETS_GUIDE.md) - 配置预设

**预计时间:** 20 分钟

### 场景 5: 我要集成 Perfcat 数据可视化

**推荐阅读顺序:**
1. [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md) - 配置 Perfcat
2. [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) - 集成说明
3. [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md) - 查看图表

**预计时间:** 15 分钟

### 场景 6: 我要查看和管理测试历史

**推荐阅读顺序:**
1. [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md) - 测试记录详解
2. [USAGE.md#测试记录](USAGE.md#测试记录) - 基础操作

**预计时间:** 10 分钟

### 场景 7: 遇到问题需要排查

**推荐阅读:**
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 常见问题和解决方案

**预计时间:** 按需查阅

### 场景 8: 我要理解系统架构

**推荐阅读顺序:**
1. [README.md#项目结构](README.md#项目结构) - 整体结构
2. [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md) - 分布式架构
3. [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md) - Worker 策略
4. [docs/](docs/) - 技术参考

**预计时间:** 1 小时

## 📖 文档阅读建议

### 初级用户（测试人员）

**必读:**
- [README.md](README.md)
- [USAGE.md](USAGE.md)
- [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md)

**选读:**
- [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md)
- [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### 中级用户（测试负责人）

**必读:**
- 初级用户必读文档
- [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md)
- [USAGE_GUIDE.md](USAGE_GUIDE.md)
- [CONFIG_PRESETS_GUIDE.md](CONFIG_PRESETS_GUIDE.md)

**选读:**
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md)

### 高级用户（运维/开发人员）

**必读:**
- 所有核心文档
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md)
- [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md)

**选读:**
- [docs/](docs/) 技术参考

## 🔍 快速查找

### 按关键词查找

**部署相关:**
- 生产部署 → [DEPLOYMENT.md](DEPLOYMENT.md)
- 分布式部署 → [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md)
- 启动脚本 → [DEPLOYMENT.md#启动 Worker](DEPLOYMENT.md#2-worker-节点部署)

**功能使用:**
- 创建用例 → [USAGE.md#测试用例管理](USAGE.md#测试用例管理)
- 批量测试 → [USAGE.md#批量测试](USAGE.md#批量测试)
- Worker 选择 → [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md)
- 测试记录 → [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md)

**高级配置:**
- Per-URL 配置 → [USAGE_GUIDE.md](USAGE_GUIDE.md)
- Cookie 配置 → [USAGE_GUIDE.md](USAGE_GUIDE.md)
- 自定义 Hooks → [USAGE.md#自定义 Hooks](USAGE.md#自定义-hooks)

**集成功能:**
- Perfcat → [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md)
- 数据可视化 → [DATA_VISUALIZATION.md](DATA_VISUALIZATION.md)

**问题排查:**
- 故障排查 → [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Worker 问题 → [DEPLOYMENT.md#故障排查](DEPLOYMENT.md#故障排查)

**架构设计:**
- 分布式架构 → [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md)
- Worker 策略 → [WORKER_SELECTION_STRATEGY.md](WORKER_SELECTION_STRATEGY.md)

## 📋 文档维护

### 文档更新记录

当前文档版本对应项目状态：
- 分布式功能完整实现
- Worker 性能分级支持
- 批量分发功能
- 智能 Worker 选择策略
- Perfcat 集成

### 归档文档

已归档到 `.archive/` 目录的过时文档：
- `DEPLOYMENT_OPTIMIZATION_SUMMARY.md`
- `PROJECT_OPTIMIZATION_SUMMARY.md`
- `IMPLEMENTATION_COMPLETE.md`
- `SUMMARY.md`
- `DOCUMENTATION_SUMMARY.md`
- `QUICKSTART.md`
- `IMPORTANT.md`
- `INSTALL.md`
- `WORKER_SELECTOR_INTEGRATION.md`
- `DISTRIBUTED_QUICK_START.md`
- `DOCKER_DEPLOYMENT.md`
- `ONE_CLICK_DEPLOY.md`

这些文档已被新文档取代或内容已过时。

## 💡 文档反馈

如发现文档问题：
- 缺失内容
- 错误信息
- 不清晰的说明
- 需要补充的示例

欢迎提交 Issue 或 Pull Request！

## 🔗 外部资源

- Playwright 文档: https://playwright.dev
- Perfcat 文档: (根据实际 Perfcat 地址)
- Node.js 文档: https://nodejs.org

---

**文档最后更新:** 2025-11-26

**当前版本:** 分布式性能测试平台 v2.0
