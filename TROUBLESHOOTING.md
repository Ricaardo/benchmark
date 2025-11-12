# 故障排查指南

## 常见问题快速解决

### ❌ 错误: 端口被占用

**错误信息**:
```
Error: listen EADDRINUSE: address already in use :::3000
```

**原因**: 端口 3000 已被其他程序占用（可能是之前未正常关闭的服务）

**解决方案**:

#### 方式 1: 使用清理脚本（推荐）

**macOS/Linux**:
```bash
./kill-port.sh
# 或指定端口
./kill-port.sh 3000
```

**Windows**:
```bash
kill-port.bat
# 或指定端口
kill-port.bat 3000
```

#### 方式 2: 手动清理端口

**macOS/Linux**:
```bash
# 查找占用端口的进程
lsof -ti :3000

# 终止进程
lsof -ti :3000 | xargs kill -9
```

**Windows**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 终止进程（替换 <PID> 为实际进程 ID）
taskkill /F /PID <PID>
```

#### 方式 3: 使用其他端口

```bash
# 临时使用其他端口
PORT=3001 npm run dev

# 或在 Windows
set PORT=3001 && npm run dev
```

#### 方式 4: 永久修改端口

编辑 `server/index.ts`:
```typescript
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001; // 改为 3001
```

---

### ❌ 错误: tsx: command not found

**错误信息**:
```
sh: tsx: command not found
```

**原因**: 项目依赖未安装

**解决方案**:

```bash
# 1. 清理旧的依赖
rm -rf node_modules package-lock.json

# 2. 重新安装
npm install

# 3. 验证安装
npm list tsx

# 4. 再次启动
npm run dev
```

---

### ❌ 错误: @bilibili-player/benchmark 安装失败

**错误信息**:
```
npm error 404 Not Found - GET https://registry.npmjs.org/@bilibili-player%2fbenchmark
```

**原因**: 这是 B站内部包，不在公共 npm 上

**解决方案**:

这是**正常现象**！该包已设置为可选依赖，不影响 Web 服务器运行。

#### 选项 1: 继续使用（推荐）

Web 服务器可以正常运行，你可以：
- ✅ 使用配置管理界面
- ✅ 配置测试用例和参数
- ✅ 生成配置文件
- ❌ 但无法实际运行 benchmark 测试

```bash
# 直接启动服务
npm install
npm run dev
```

#### 选项 2: 获取该包

查看 [INSTALL.md](INSTALL.md) 了解如何：
- 配置内部 npm registry
- 从本地路径安装
- 从 Git 仓库安装
- 联系相关人员获取权限

---

### ❌ 错误: EACCES: permission denied

**错误信息**:
```
Error: EACCES: permission denied
```

**原因**: 文件或目录权限问题

**解决方案**:

```bash
# 修复项目目录权限
sudo chown -R $USER:$USER .
chmod -R 755 .

# 清理 npm 缓存
npm cache clean --force

# 重新安装
npm install
```

---

### ❌ 错误: Cannot find module

**错误信息**:
```
Error: Cannot find module 'express'
```

**原因**: 依赖缺失或损坏

**解决方案**:

```bash
# 完全重装依赖
rm -rf node_modules package-lock.json
npm install

# 如果还不行，检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 更新 npm
npm install -g npm@latest
```

---

### ❌ 错误: 网络超时

**错误信息**:
```
npm ERR! network timeout
```

**原因**: 网络连接问题或防火墙

**解决方案**:

#### 使用国内镜像（推荐中国用户）

```bash
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install

# 恢复官方镜像（可选）
npm config set registry https://registry.npmjs.org
```

#### 使用代理

```bash
# 设置代理
npm config set proxy http://proxy-server:port
npm config set https-proxy http://proxy-server:port

# 或临时使用代理
npm install --proxy=http://proxy-server:port
```

#### 增加超时时间

```bash
npm config set fetch-timeout 60000
npm install
```

---

### ❌ 错误: 内存不足

**错误信息**:
```
FATAL ERROR: Reached heap limit Allocation failed
```

**原因**: Node.js 内存限制

**解决方案**:

```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" npm install

# 或在启动时
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

---

### ❌ 错误: 浏览器无法访问

**症状**: 服务器启动但浏览器无法打开页面

**检查清单**:

#### 1. 确认服务器正在运行

```bash
# 查看进程
ps aux | grep node

# 检查端口
lsof -i :3000
# 或 Windows
netstat -ano | findstr :3000
```

#### 2. 测试 API

```bash
curl http://localhost:3000/api/status

# 应该返回 JSON 数据
# {"status":"idle","output":"","hasProcess":false,"currentRunner":""}
```

#### 3. 检查防火墙

```bash
# macOS
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Linux (UFW)
sudo ufw status

# Windows
netsh advfirewall show allprofiles
```

#### 4. 尝试其他浏览器

有时是浏览器缓存问题，尝试：
- 清除浏览器缓存
- 使用无痕模式
- 尝试其他浏览器

#### 5. 检查 hosts 文件

确保 localhost 指向 127.0.0.1:
```bash
# macOS/Linux
cat /etc/hosts | grep localhost

# Windows
type C:\Windows\System32\drivers\etc\hosts | findstr localhost
```

---

### ❌ 错误: 配置保存失败

**症状**: 点击"保存配置"后报错

**可能原因**:

1. **文件权限问题**
   ```bash
   # 检查目录权限
   ls -la

   # 修复权限
   chmod 755 .
   chmod 644 benchmark.config.mts
   ```

2. **至少启用一个测试模式**
   - 确保 Initialization、Runtime 或 MemoryLeak 至少启用一个

3. **测试用例未填写**
   - 确保每个启用的模式都添加了至少一个测试用例
   - 每个测试用例都填写了 URL 和描述

---

### ❌ 错误: benchmark 执行失败

**症状**: 点击"启动测试"后立即失败

**检查清单**:

1. **确认已安装 @bilibili-player/benchmark**
   ```bash
   npm list @bilibili-player/benchmark
   ```

2. **检查配置文件**
   ```bash
   # 查看生成的配置
   cat benchmark.config.mts
   ```

3. **检查测试 URL**
   - 确保 URL 可访问
   - 检查网络连接
   - 尝试在浏览器中手动打开

4. **查看详细错误**
   - 在控制台的"实时输出"区域查看错误信息
   - 或查看终端日志

---

## 快速诊断命令

```bash
# 1. 检查环境
node --version        # 应该 >= 18.0.0
npm --version         # 应该 >= 9.0.0

# 2. 检查依赖
npm list --depth=0

# 3. 检查端口
lsof -i :3000        # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 4. 测试 API
curl http://localhost:3000/api/status

# 5. 查看日志
npm run dev          # 查看启动日志
```

## 完全重置

如果所有方法都不行，尝试完全重置：

```bash
# 1. 停止所有相关进程
lsof -ti :3000 | xargs kill -9

# 2. 清理所有缓存和依赖
rm -rf node_modules package-lock.json
npm cache clean --force

# 3. 重新安装
npm install

# 4. 启动服务
npm run dev
```

## 获取帮助

如果以上方法都无法解决问题：

1. **查看详细日志**
   ```bash
   npm run dev --verbose
   ```

2. **查看相关文档**
   - [INSTALL.md](INSTALL.md) - 安装问题
   - [DEPLOYMENT.md](DEPLOYMENT.md) - 部署问题
   - [README.md](README.md) - 功能说明

3. **收集错误信息**
   - 完整的错误信息
   - Node.js 版本
   - 操作系统版本
   - 执行的命令

## 预防措施

为避免常见问题：

1. **正确关闭服务**
   - 使用 Ctrl+C 停止服务
   - 不要直接关闭终端窗口

2. **定期更新依赖**
   ```bash
   npm update
   npm audit fix
   ```

3. **使用进程管理器**
   ```bash
   # PM2 会自动处理很多问题
   npm run pm2:start
   ```

4. **定期清理**
   ```bash
   # 每周清理一次缓存
   npm cache clean --force
   ```

---

## 📝 配置文件问题

### ❌ 错误: Type 'string' is not assignable to type 'Mode'

**错误信息**:
```
benchmark.config.mts:4:5 - error TS2322: Type 'string' is not assignable to type 'Mode'.

4     mode: "headless",
      ~~~~
```

**原因**: `mode` 字段应该是一个对象，而不是字符串

**错误示例**:
```typescript
const config: UserOptions = {
    mode: "headless",  // ❌ 错误：不能使用字符串
    runners: { ... }
};
```

**正确写法**:
```typescript
const config: UserOptions = {
    mode: {
        anonymous: true,   // 是否匿名模式
        headless: true     // 是否无头模式
    },
    runners: { ... }
};
```

**Mode 类型定义**:
```typescript
type Mode = {
    anonymous: boolean;      // 匿名模式（不使用登录凭证）
    headless: boolean;       // 无头模式（后台运行，不显示浏览器窗口）
    preparePage?: boolean;   // 可选：是否准备页面
    usrDataDir?: string;     // 可选：用户数据目录
};
```

**常用配置组合**:

| 场景 | anonymous | headless | 说明 |
|------|-----------|----------|------|
| **开发调试** | `true` | `false` | 可以看到浏览器窗口，方便调试 |
| **自动化测试** | `true` | `true` | 后台运行，速度更快 |
| **需要登录** | `false` | `false` | 使用登录态，显示浏览器 |

**解决方案**:

1. 手动修复 `benchmark.config.mts`:
   ```bash
   # 编辑文件
   vim benchmark.config.mts

   # 将 mode: "headless" 改为
   mode: {
       anonymous: true,
       headless: true
   }
   ```

2. 或者删除配置文件，在 Web 界面重新生成：
   ```bash
   rm benchmark.config.mts
   # 访问 http://localhost:3000/config.html 重新配置
   ```

---

**最后更新**: 2025-10-29
