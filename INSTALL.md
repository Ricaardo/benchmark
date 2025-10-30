# 安装指南

## 前置要求

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **@bilibili-player/benchmark**: B站内部 benchmark 工具包

## 安装步骤

### 1. 安装基础依赖

```bash
npm install
```

这将安装所有必需的依赖（Express、TypeScript 等）。

### 2. 安装 @bilibili-player/benchmark

这个包是 B站内部的 benchmark 工具，需要单独安装。

#### 方式 A: 从内部 npm registry 安装（推荐）

如果你有 B站内部 npm registry 的访问权限：

```bash
# 配置 registry（如果还未配置）
npm config set @bilibili-player:registry <内部-registry-url>

# 安装
npm install @bilibili-player/benchmark
```

#### 方式 B: 从本地路径安装

如果你有本地的包文件：

```bash
npm install /path/to/@bilibili-player/benchmark
```

#### 方式 C: 从 Git 仓库安装

如果包托管在 Git 仓库：

```bash
npm install git+<repository-url>
```

#### 方式 D: 手动链接（开发环境）

如果你有包的源码：

```bash
# 在包的目录中
cd /path/to/@bilibili-player/benchmark
npm link

# 在本项目中
cd /path/to/benchmark
npm link @bilibili-player/benchmark
```

### 3. 验证安装

```bash
# 检查是否安装成功
npm list @bilibili-player/benchmark

# 尝试启动服务
npm run dev
```

如果看到以下信息，说明安装成功：

```
🌐 Starting server on http://localhost:3000
📝 Config page: http://localhost:3000/config.html
```

## 常见问题

### Q1: 404 Not Found - @bilibili-player/benchmark

**问题**:
```
npm error 404 Not Found - GET https://registry.npmjs.org/@bilibili-player%2fbenchmark
```

**原因**: 这是 B站内部包，不在公共 npm registry 上。

**解决**:
1. 确认你有访问内部 registry 的权限
2. 配置内部 registry：
   ```bash
   npm config set @bilibili-player:registry <内部-url>
   ```
3. 或联系 B站相关人员获取包访问权限

### Q2: tsx: command not found

**问题**:
```
sh: tsx: command not found
```

**原因**: 依赖未安装或 node_modules 损坏。

**解决**:
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

### Q3: 权限错误

**问题**:
```
Error: EACCES: permission denied
```

**解决**:
```bash
# 修复权限
sudo chown -R $USER:$USER .
chmod -R 755 .

# 清理 npm 缓存
npm cache clean --force
```

### Q4: 网络超时

**问题**: 安装依赖时超时

**解决**:
```bash
# 使用国内镜像（如果在中国）
npm config set registry https://registry.npmmirror.com

# 或使用代理
npm config set proxy http://proxy-server:port
npm config set https-proxy http://proxy-server:port
```

## 替代方案

### 仅安装 Web 服务器（不含 benchmark 工具）

如果暂时无法安装 `@bilibili-player/benchmark`，你仍然可以：

1. **运行 Web 服务器**
   ```bash
   npm install  # 只安装基础依赖
   npm run dev
   ```

2. **使用配置管理界面**
   - 访问 http://localhost:3000/config.html
   - 配置测试用例和参数
   - 生成配置文件

3. **后续安装 benchmark 工具**
   - 等获取到包访问权限后
   - 运行 `npm install @bilibili-player/benchmark`
   - 即可执行测试

### 注意事项

⚠️ 没有 `@bilibili-player/benchmark` 包时：
- ✅ 可以使用 Web 界面
- ✅ 可以配置测试用例
- ✅ 可以生成配置文件
- ❌ 无法实际运行 benchmark 测试

## 手动配置 registry

如果需要配置特定的 registry：

### 全局配置

```bash
npm config set @bilibili-player:registry <registry-url>
```

### 项目级配置

创建 `.npmrc` 文件：

```ini
@bilibili-player:registry=<registry-url>
registry=https://registry.npmjs.org/
```

### 临时配置

```bash
npm install --registry=<registry-url> @bilibili-player/benchmark
```

## 验证清单

安装完成后，确认以下内容：

- [ ] Node.js 版本 >= 18.0.0
- [ ] npm 安装成功，没有错误
- [ ] `node_modules` 目录存在
- [ ] `@bilibili-player/benchmark` 已安装（可选）
- [ ] `npm run dev` 可以启动服务
- [ ] 浏览器可以访问 http://localhost:3000

## 完整安装示例

```bash
# 1. 克隆或进入项目目录
cd /Users/bilibili/benchmark

# 2. 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 3. 安装基础依赖
npm install

# 4. 安装 benchmark 工具（如果有权限）
npm install @bilibili-player/benchmark

# 5. 启动服务
npm run dev

# 6. 打开浏览器
open http://localhost:3000
```

## 获取帮助

如果遇到安装问题：

1. 检查 [常见问题](#常见问题) 部分
2. 查看完整日志：`npm install --verbose`
3. 联系 B站相关团队获取 `@bilibili-player/benchmark` 包访问权限
4. 查看 [README.md](README.md) 了解更多信息

---

**最后更新**: 2025-10-29
