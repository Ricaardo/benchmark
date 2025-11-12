# 🚀 一键部署三端指南

真正的一键部署，支持 **Windows**、**macOS** 和 **Linux** 三大平台！

---

## ⚡ 快速开始

### Windows

```bash
deploy.bat
```

### macOS / Linux

```bash
./deploy.sh
```

### WSL (Windows Subsystem for Linux)

```bash
./deploy.sh
```

---

## ✨ 自动化功能

部署脚本会自动完成：

1. ✅ **环境检测**
   - 检测操作系统类型
   - 检测 Node.js 版本（需要 >= 18.0.0）
   - 检查端口 3000 是否可用
   - 如果端口被占用，提示终止进程

2. ✅ **依赖管理**
   - 自动安装 npm 依赖
   - 使用 `npm ci` 加速安装（如果有 package-lock.json）
   - 智能处理 `@bilibili-player/benchmark` 包缺失问题
   - 检测依赖更新，询问是否更新

3. ✅ **编译构建**
   - 自动编译 TypeScript 代码
   - 检测代码变更，按需重新编译
   - 输出到 `dist/` 目录

4. ✅ **启动服务**
   - 启动开发服务器（支持热重载）
   - 自动打开浏览器访问 http://localhost:3000
   - 显示友好的成功信息和访问地址
   - 前台运行，按 `Ctrl+C` 停止

---

## 📊 平台兼容性

| 平台 | 脚本 | 状态 | 说明 |
|------|------|------|------|
| **Windows 10/11** | `deploy.bat` | ✅ 完全支持 | CMD / PowerShell |
| **macOS** | `deploy.sh` | ✅ 完全支持 | Intel / Apple Silicon |
| **Ubuntu/Debian** | `deploy.sh` | ✅ 完全支持 | 所有版本 |
| **CentOS/RHEL** | `deploy.sh` | ✅ 完全支持 | 7.x / 8.x / 9.x |
| **WSL** | `deploy.sh` | ✅ 完全支持 | WSL 1 / WSL 2 |
| **Git Bash (Win)** | `deploy.sh` | ✅ 完全支持 | Windows Git Bash |

---

## 🎯 使用示例

### 场景 1: 首次部署

```bash
# macOS/Linux
git clone <repository-url>
cd benchmark
./deploy.sh

# Windows
git clone <repository-url>
cd benchmark
deploy.bat
```

**效果**：
- 自动安装所有依赖
- 自动编译代码
- 自动启动服务器
- 浏览器自动打开 http://localhost:3000

### 场景 2: 代码更新后重新部署

```bash
# 拉取最新代码
git pull

# 一键部署
./deploy.sh   # macOS/Linux
deploy.bat    # Windows
```

**效果**：
- 检测到依赖变更，询问是否更新
- 自动重新编译
- 重新启动服务器

### 场景 3: 端口被占用

```bash
./deploy.sh
```

**交互流程**：
```
➤ 检查端口 3000 是否可用...
⚠️  端口 3000 已被占用

请选择操作:
  1) 终止占用端口的进程
  2) 取消部署

请输入选项 [1/2]: 1

➤ 终止占用端口 3000 的进程...
✅ 端口已释放
```

---

## 🛑 停止服务

部署脚本启动服务器后，在终端按 `Ctrl+C` 即可停止。

```bash
# 终端输出
^C
ℹ️  正在停止服务器...
✅ 服务器已停止
```

---

## 💡 高级用法

### 仅检测环境

```bash
# 修改 deploy.sh，注释掉启动服务部分
# 仅运行环境检测和依赖安装
```

### 自定义端口

如果需要使用其他端口，修改 `server/index.ts`:

```typescript
const PORT = process.env.PORT || 3001; // 改为 3001
```

然后重新部署：

```bash
./deploy.sh
```

---

## 🔍 故障排查

### 问题 1: Node.js 未安装

**错误信息**：
```
❌ 未检测到 Node.js
```

**解决方案**：

**macOS**:
```bash
brew install node
```

**Ubuntu/Debian**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows**:
访问 https://nodejs.org 下载安装

### 问题 2: Node.js 版本过低

**错误信息**：
```
❌ Node.js 版本过低: v16.0.0 (需要 >= v18.0.0)
```

**解决方案**：

**macOS**:
```bash
brew upgrade node
```

**Ubuntu/Debian**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows**:
访问 https://nodejs.org 下载最新 LTS 版本

### 问题 3: 脚本没有执行权限

**错误信息**（macOS/Linux）：
```
bash: ./deploy.sh: Permission denied
```

**解决方案**：
```bash
chmod +x deploy.sh
./deploy.sh
```

### 问题 4: 浏览器没有自动打开

**原因**：部分环境下无法自动打开浏览器

**解决方案**：

手动访问 http://localhost:3000

---

## 📚 相关文档

- [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署指南（包括生产环境）
- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排查指南

---

## 🎉 总结

通过一键部署脚本，您可以：

- ✅ **节省时间** - 从手动 10 步缩减到 1 步
- ✅ **零错误** - 自动检测环境和依赖
- ✅ **跨平台** - Windows/macOS/Linux 统一体验
- ✅ **智能化** - 自动处理端口占用、依赖缺失等问题
- ✅ **友好** - 彩色输出、清晰提示

**立即开始**: `./deploy.sh` (macOS/Linux) 或 `deploy.bat` (Windows) 🚀

---

**最后更新**: 2025-10-29
