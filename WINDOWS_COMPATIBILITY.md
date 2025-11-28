# 🪟 Windows 兼容性说明

本项目完全支持 Windows 系统（包括 CMD、PowerShell 和 Git Bash）。

## ✅ Windows 支持情况

### 完美支持

所有部署脚本都提供了 Windows 原生支持：

| 功能 | Windows 支持 | 说明 |
|------|-------------|------|
| **统一部署** | ✅ 完美支持 | `node deploy` |
| **同机部署** | ✅ 完美支持 | `npm run deploy:both` |
| **Master 部署** | ✅ 完美支持 | `npm run deploy:master` |
| **Worker 部署** | ✅ 完美支持 | `npm run deploy:worker` |
| **调试模式** | ✅ 完美支持 | `npm run dev` |
| **PM2 管理** | ✅ 完美支持 | `npm run pm2:start` |
| **Docker** | ✅ 完美支持 | `npm run compose:up` |

### 跨平台实现

所有 npm 命令都使用跨平台包装器，自动检测系统：

```javascript
// scripts/deploy-both.js
if (process.platform === 'win32') {
  // 使用 .bat 脚本
  execSync('scripts\\standalone-both.bat');
} else {
  // 使用 .sh 脚本
  execSync('bash scripts/standalone-both.sh');
}
```

---

## 🚀 Windows 使用方式

### 方式一: npm 命令（推荐）

适用于所有 Windows 环境（CMD/PowerShell/Git Bash）：

```bash
# 同机部署
npm run deploy:both

# Master 部署
npm run deploy:master

# Worker 部署  
npm run deploy:worker

# 调试模式
npm run dev
```

### 方式二: 直接运行脚本

**CMD / PowerShell:**
```batch
# 同机部署
scripts\standalone-both.bat

# Master 部署
scripts\standalone-deploy.bat

# Worker 部署
scripts\start-worker-medium.bat
```

**Git Bash:**
```bash
# 同机部署
bash scripts/standalone-both.sh

# Master 部署
bash scripts/standalone-deploy.sh

# Worker 部署
bash scripts/start-worker-medium.sh
```

### 方式三: 统一部署脚本

所有环境通用：

```bash
node deploy
```

---

## 💡 Windows 特性

### 1. 自动平台检测

npm 命令会自动检测 Windows 并调用 .bat 脚本：

```bash
# 在 Windows 上自动使用 .bat
npm run deploy:both
# → 实际执行: scripts\standalone-both.bat

# 在 Linux/macOS 上自动使用 .sh
npm run deploy:both
# → 实际执行: bash scripts/standalone-both.sh
```

### 2. 中文支持

Windows 脚本已配置 UTF-8 编码：

```batch
@echo off
chcp 65001 >nul
```

### 3. 颜色输出

支持 Windows 10+ 的 ANSI 颜色代码：

```batch
set "GREEN=[92m"
set "YELLOW=[93m"
echo %GREEN%✅ 部署成功%NC%
```

### 4. 路径兼容

自动处理 Windows 路径分隔符：

```batch
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
```

---

## 🔧 Windows 环境要求

### 必需组件

1. **Node.js >= 18.0.0**
   - 下载: https://nodejs.org
   - 或使用 Chocolatey: `choco install nodejs-lts`

2. **npm** (随 Node.js 安装)

### 可选组件

1. **PM2** (生产环境推荐)
   ```bash
   npm install -g pm2
   ```

2. **Git Bash** (可选，用于运行 .sh 脚本)
   - 下载: https://git-scm.com/download/win

3. **Docker Desktop** (容器部署)
   - 下载: https://www.docker.com/products/docker-desktop

---

## 📋 Windows 部署步骤

### 快速开始

1. **安装 Node.js**
   ```bash
   # 验证安装
   node -v
   npm -v
   ```

2. **克隆/下载项目**
   ```bash
   git clone <repo-url>
   cd benchmark
   ```

3. **一键部署**
   ```bash
   npm run deploy:both
   ```

4. **访问系统**
   ```
   http://localhost:3000
   ```

### 详细步骤

参考 [SAME_MACHINE_DEPLOY.md](SAME_MACHINE_DEPLOY.md) 的完整说明。

---

## ❓ Windows 常见问题

### Q: PowerShell 执行策略错误

**错误信息:**
```
无法加载文件，因为在此系统上禁止运行脚本
```

**解决方法:**
```powershell
# 管理员模式运行 PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 或直接使用 npm 命令
npm run deploy:both
```

### Q: 端口被占用

**解决方法:**
```batch
# 查看占用端口的进程
netstat -ano | findstr :3000

# 终止进程 (替换 PID)
taskkill /F /PID <PID>
```

### Q: npm 命令不识别

**解决方法:**
```batch
# 检查 Node.js 安装
node -v
npm -v

# 重新安装 Node.js
# 或将 Node.js 添加到 PATH
```

### Q: 脚本运行后立即退出

**原因:** 使用了 .sh 脚本而非 .bat

**解决方法:**
```batch
# 使用 npm 命令（推荐）
npm run deploy:both

# 或直接运行 .bat 脚本
scripts\standalone-both.bat

# 如果安装了 Git Bash
bash scripts/standalone-both.sh
```

### Q: PM2 在 Windows 上的问题

**解决方法:**
```bash
# 安装 pm2-windows-service
npm install -g pm2-windows-service

# 或使用内置的后台运行方式
# 脚本会自动处理
```

---

## 🎯 Windows 最佳实践

### 1. 使用 npm 命令

最简单、最可靠：

```bash
npm run deploy:both
```

### 2. 避免路径问题

不要手动修改路径分隔符，使用提供的脚本。

### 3. 使用 PowerShell 或 Git Bash

比 CMD 有更好的功能和兼容性。

### 4. 安装 PM2

生产环境强烈推荐：

```bash
npm install -g pm2
pm2 start npm --name "benchmark" -- start
```

---

## 📊 Windows vs Linux/macOS

| 特性 | Windows | Linux/macOS | 说明 |
|------|---------|-------------|------|
| npm 命令 | ✅ 相同 | ✅ 相同 | 完全一致 |
| 脚本扩展名 | .bat | .sh | 自动选择 |
| 路径分隔符 | `\` | `/` | 脚本自动处理 |
| 颜色输出 | ✅ 支持 | ✅ 支持 | Win10+ |
| PM2 | ✅ 支持 | ✅ 支持 | 完全兼容 |
| Docker | ✅ 支持 | ✅ 支持 | 需要 Docker Desktop |

---

## 🔗 相关资源

- [Node.js Windows 安装](https://nodejs.org/en/download/)
- [Git for Windows](https://git-scm.com/download/win)
- [PM2 Windows 指南](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

---

**💡 Windows 用户推荐流程:**

1. 安装 Node.js
2. 运行 `npm run deploy:both`
3. 访问 http://localhost:3000
4. 开始使用！

**简单高效，Windows 原生支持！** 🎉
