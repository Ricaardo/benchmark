# 🚀 从这里开始

欢迎使用 Benchmark Web Server！这是一个通过 Web 界面管理和运行性能测试的系统。

> ⚠️ **重要**: 如果遇到 `@bilibili-player/benchmark` 相关问题，请先阅读 [IMPORTANT.md](IMPORTANT.md)

## ⚡ 快速开始（3 步）

### 第 1 步：安装依赖

```bash
npm install
```

> 💡 如果遇到 `@bilibili-player/benchmark` 安装问题，这是正常的。这是 B站内部包，请查看 [INSTALL.md](INSTALL.md) 了解如何获取。

### 第 2 步：启动服务

**最简单方式**（推荐）：

```bash
# macOS/Linux
./start.sh

# Windows
start.bat
```

**或者手动启动**：

```bash
npm run dev
```

### 第 3 步：配置测试用例

**⚠️ 重要**：必须先添加测试用例才能运行测试！

1. **访问配置页面**: http://localhost:3000/config.html
2. **启用测试模式**（勾选开关）
3. **添加测试用例**：
   - 点击"添加测试用例"
   - URL: `https://www.bilibili.com`
   - 描述: `B站首页`
4. **保存配置**

> 💡 详细配置说明请查看 [QUICK_CONFIG.md](QUICK_CONFIG.md)

### 第 4 步：运行测试

访问控制台: http://localhost:3000
- 选择测试模式
- 点击"启动测试"

## 📖 完整文档导航

根据你的需求选择对应文档：

| 文档 | 适用场景 | 链接 |
|------|---------|------|
| **安装指南** | 首次安装、遇到依赖问题 | [INSTALL.md](INSTALL.md) |
| **快速开始** | 5 分钟快速上手 | [QUICKSTART.md](QUICKSTART.md) |
| **使用文档** | 了解所有功能 | [README.md](README.md) |
| **部署指南** | 生产环境部署 | [DEPLOYMENT.md](DEPLOYMENT.md) |
| **快速部署** | 部署命令速查 | [DEPLOY_QUICK.md](DEPLOY_QUICK.md) |
| **项目总结** | 了解架构设计 | [SUMMARY.md](SUMMARY.md) |

## ✅ 安装验证

运行以下命令确认一切正常：

```bash
# 检查 Node.js 版本
node --version
# 应该显示: v18.x.x 或更高

# 检查依赖安装
npm list --depth=0

# 启动服务
npm run dev
```

如果看到以下信息，说明安装成功：

```
Benchmark Web Server running at http://localhost:3000
- View UI: http://localhost:3000
- API Status: http://localhost:3000/api/status
```

## 🎯 常见问题

### Q: `@bilibili-player/benchmark` 安装失败怎么办？

**A**: 这是 B站内部包，不在公共 npm 上。你可以：

1. 联系 B站相关人员获取包访问权限
2. 配置内部 npm registry
3. 或者先使用 Web 界面配置测试（不运行实际测试）

详见 [INSTALL.md](INSTALL.md)

### Q: 端口 3000 被占用怎么办？

**A**: 修改 `server/index.ts` 中的端口号：

```typescript
const PORT = 3001; // 改为你需要的端口
```

### Q: 如何部署到生产环境？

**A**: 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 了解多种部署方式：

- PM2 部署（推荐）
- Docker 部署
- systemd 服务
- Nginx 反向代理

## 🌟 主要功能

### 1. 配置管理界面

访问 http://localhost:3000/config.html

- ✅ 可视化配置测试模式
- ✅ 自定义测试用例
- ✅ 配置所有测试参数
- ✅ 自动生成配置文件

### 2. 测试控制台

访问 http://localhost:3000

- ✅ 启动/停止测试
- ✅ 实时查看输出
- ✅ 查看测试报告
- ✅ 监控测试状态

### 3. 三种测试模式

- **Initialization**: 初始化性能测试
- **Runtime**: 运行时性能测试
- **MemoryLeak**: 内存泄漏检测

## 📊 使用流程

```
1. 访问配置页面
   ↓
2. 配置基础选项 (anonymous/headless)
   ↓
3. 启用测试模式
   ↓
4. 添加测试用例（URL + 描述）
   ↓
5. 配置测试参数
   ↓
6. 保存配置
   ↓
7. 前往控制台
   ↓
8. 选择模式并启动测试
   ↓
9. 查看实时输出和报告
```

## 🔧 可配置项

所有参数都可通过 Web 界面配置：

**基础配置**:
- `anonymous`: 匿名模式（默认 true）
- `headless`: 无头模式（默认 false）

**Runtime 参数**:
- `durationMs`: 运行时长（默认 60000ms）
- `delayMs`: 延迟时间（默认 10000ms）

**MemoryLeak 参数**:
- `intervalMs`: 迭代间隔（默认 60000ms）
- `iterations`: 迭代次数（默认 3）
- `onPageTesting`: 页面操作代码（默认留空）

## 💡 提示

- 💻 **开发调试**: 建议关闭 headless 模式，可以看到浏览器窗口
- 🔄 **配置修改**: 修改配置后需要重新启动测试
- 📝 **onPageTesting**: 留空表示静置页面，不执行任何操作
- 📊 **测试报告**: 自动保存在 `benchmark_report` 目录

## 🆘 获取帮助

遇到问题？按优先级查看：

1. **安装问题** → [INSTALL.md](INSTALL.md)
2. **使用问题** → [QUICKSTART.md](QUICKSTART.md)
3. **部署问题** → [DEPLOYMENT.md](DEPLOYMENT.md)
4. **功能说明** → [README.md](README.md)
5. **架构设计** → [SUMMARY.md](SUMMARY.md)

## 📦 项目结构

```
benchmark/
├── 📄 START_HERE.md          ← 你在这里
├── 📄 INSTALL.md             ← 安装指南
├── 📄 QUICKSTART.md          ← 快速开始
├── 📄 README.md              ← 完整文档
├── 📄 DEPLOYMENT.md          ← 部署指南
├── 🚀 start.sh               ← 启动脚本
├── 🌐 server/                ← 服务器代码
├── 🎨 public/                ← Web 界面
│   ├── index.html           ← 控制台
│   └── config.html          ← 配置管理
└── ⚙️ benchmark.config.mts   ← 自动生成的配置
```

## 🎉 开始使用

现在你已经了解基础知识，可以开始使用了：

```bash
# 1. 启动服务
npm run dev

# 2. 在浏览器中打开
open http://localhost:3000/config.html

# 3. 配置并运行你的第一个测试！
```

---

**祝你测试愉快！** 如有问题，随时查看相关文档。

**版本**: 2.0.0
**最后更新**: 2025-10-29
