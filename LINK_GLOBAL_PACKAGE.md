# 使用全局安装的 @bilibili-player/benchmark 包

## 问题说明

### 为什么全局安装的包不能直接使用？

即使你已经全局安装了 `@bilibili-player/benchmark`：

```bash
npm install -g @bilibili-player/benchmark
# ✅ 全局安装成功
```

**但是**，Node.js 项目无法自动使用全局包作为依赖！

### 原因

Node.js 的模块解析机制：
1. 项目首先查找 `./node_modules` 目录
2. 然后向上查找父目录的 `node_modules`
3. **不会查找全局 node_modules**（除非使用 `-g` 运行）

## 解决方案

### 方式 1: 使用 npm link（推荐）✅

这是最简单的方法，将全局包链接到本地项目：

```bash
# 在项目目录中执行
npm link @bilibili-player/benchmark
```

**验证链接成功**：
```bash
npm list @bilibili-player/benchmark
# 应该显示：
# └── @bilibili-player/benchmark@2.1.2 -> ./../../../opt/homebrew/lib/node_modules/@bilibili-player/benchmark
```

**优点**：
- ✅ 简单快速
- ✅ 使用全局已安装的版本
- ✅ 多个项目可以共享同一个全局包
- ✅ 全局包更新后，所有链接的项目自动更新

**缺点**：
- ⚠️ 部署到其他环境时需要重新链接
- ⚠️ 如果删除全局包，链接会失效

### 方式 2: 从本地路径安装

如果你知道全局包的安装路径：

```bash
# macOS/Linux (Homebrew Node.js)
npm install /opt/homebrew/lib/node_modules/@bilibili-player/benchmark

# macOS/Linux (官方 Node.js)
npm install /usr/local/lib/node_modules/@bilibili-player/benchmark

# Windows
npm install "C:\Users\<username>\AppData\Roaming\npm\node_modules\@bilibili-player\benchmark"
```

**查找全局包路径**：
```bash
npm root -g
# 输出全局 node_modules 路径
```

### 方式 3: 配置内部 registry（推荐团队使用）

如果你的团队有内部 npm registry：

```bash
# 配置 scope registry
npm config set @bilibili-player:registry <内部-registry-url>

# 然后正常安装
npm install @bilibili-player/benchmark
```

**创建 .npmrc 文件**：
```ini
@bilibili-player:registry=<内部-registry-url>
registry=https://registry.npmjs.org/
```

### 方式 4: 手动复制

最简单粗暴的方法：

```bash
# 复制全局包到本地
cp -r $(npm root -g)/@bilibili-player/benchmark node_modules/@bilibili-player/
```

## 当前状态

在你的项目中，我们已经使用 `npm link` 成功链接了全局包：

```bash
$ npm list @bilibili-player/benchmark
benchmark-web-server@2.0.0 /Users/bilibili/benchmark
└── @bilibili-player/benchmark@2.1.2 -> ./../../../opt/homebrew/lib/node_modules/@bilibili-player/benchmark
```

**符号链接（Symlink）**：
```bash
node_modules/@bilibili-player/benchmark -> /opt/homebrew/lib/node_modules/@bilibili-player/benchmark
```

现在项目可以正常使用 benchmark 包了！

## 验证安装

### 1. 检查包是否存在

```bash
npm list @bilibili-player/benchmark
```

应该显示版本号和链接路径。

### 2. 测试命令是否可用

```bash
npx @bilibili-player/benchmark --help
```

### 3. 在代码中测试

```javascript
import benchmark from '@bilibili-player/benchmark';
console.log('Benchmark loaded:', !!benchmark);
```

### 4. 通过 Web 界面测试

1. 启动服务：`npm run dev`
2. 访问：http://localhost:3000
3. 配置测试并点击"启动测试"
4. 应该可以正常运行

## 常见问题

### Q: link 后还是找不到包？

**A**: 尝试重启开发服务器：

```bash
# 停止服务（Ctrl+C）
# 重新启动
npm run dev
```

### Q: 全局包更新了，本地项目会自动更新吗？

**A**: 会的！因为是符号链接，全局包更新后，链接的项目会自动使用新版本。但可能需要重启服务器。

### Q: 如何取消链接？

**A**: 使用 `npm unlink`：

```bash
npm unlink @bilibili-player/benchmark
```

然后可以选择：
- 重新链接
- 或正常安装（如果有 registry）

### Q: 部署到生产环境怎么办？

**A**: 生产环境建议：

1. **使用内部 registry**（最佳）
   ```bash
   npm config set @bilibili-player:registry <url>
   npm install
   ```

2. **打包时包含**
   ```bash
   # 复制到项目中
   npm install $(npm root -g)/@bilibili-player/benchmark
   ```

3. **从 Git 安装**
   ```bash
   npm install git+<repository-url>
   ```

### Q: 为什么不建议使用全局包？

**A**: 对于应用依赖，不建议使用全局包，因为：

- ❌ 不同项目可能需要不同版本
- ❌ 部署困难（每个环境都要全局安装）
- ❌ 不利于版本管理
- ❌ CI/CD 流程复杂

**但是**，对于 CLI 工具（如 npm、pm2），全局安装是推荐的。

## 最佳实践

### 开发环境

使用 `npm link`（当前方法）：
```bash
npm link @bilibili-player/benchmark
```

### 团队协作

配置 `.npmrc`：
```ini
@bilibili-player:registry=<内部-registry-url>
```

提交到 Git，团队成员可以直接 `npm install`。

### 生产环境

1. 使用内部 registry
2. 或打包时包含所有依赖

## 更新 package.json

当前配置：

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@bilibili-player/benchmark": "^2.1.2"
  }
}
```

**注意**：
- 版本号 `^2.1.2` 表示使用 2.x.x 的最新版本
- 实际使用的是通过 link 链接的全局版本
- 如果取消链接，npm 会尝试从 registry 安装

## 检查清单

安装成功后，确认：

- [ ] `npm list @bilibili-player/benchmark` 显示已链接
- [ ] `node_modules/@bilibili-player/benchmark` 是符号链接
- [ ] `npx @bilibili-player/benchmark --help` 可以运行
- [ ] Web 界面可以启动测试
- [ ] 测试可以正常执行

## 总结

**问题**：全局安装的包不能被 Node.js 项目直接使用

**原因**：Node.js 只查找项目的 node_modules，不查找全局 node_modules

**解决**：使用 `npm link` 创建符号链接

**命令**：
```bash
npm link @bilibili-player/benchmark
```

**结果**：项目现在可以使用全局安装的 benchmark 包了！✅

---

**相关文档**：
- [INSTALL.md](INSTALL.md) - 完整安装指南
- [IMPORTANT.md](IMPORTANT.md) - 包的状态说明
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排查

**最后更新**: 2025-10-29
