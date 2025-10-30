# ⚠️ 重要说明

## 关于 `@bilibili-player/benchmark` 包

### 📦 包的状态

`@bilibili-player/benchmark` 是 **B站内部的私有包**，目前有以下情况：

| 状态 | 说明 |
|------|------|
| ❌ **未安装** | 包不在公共 npm registry 上 |
| ⚠️ **可选依赖** | 不影响 Web 服务器运行 |
| 🔒 **需要权限** | 需要 B站内部 registry 访问权限 |

### 🎯 当前可用功能

**即使没有安装该包，你仍然可以：**

✅ **完整使用 Web 服务器**
- 启动服务：`npm run dev`
- 访问界面：http://localhost:3000

✅ **完整使用配置管理**
- 配置页面：http://localhost:3000/config.html
- 配置所有测试参数
- 添加测试用例
- 自动生成配置文件

✅ **生成配置文件**
- 自动生成 `benchmark.config.mts`
- 保存 JSON 配置
- 导出配置模板

**但是无法：**

❌ **运行实际的 benchmark 测试**
- 点击"启动测试"会失败
- 无法执行性能测试
- 无法生成测试报告

### 📋 错误信息解释

如果你在 Web 界面点击"启动测试"，会看到类似的错误：

```
npm error could not determine executable to run
```

这是**正常的**！因为 benchmark 工具包未安装。

### 🔧 解决方案

#### 选项 1: 仅使用配置功能（推荐）

如果你只需要配置管理功能：

```bash
# 1. 启动服务
npm run dev

# 2. 访问配置页面
open http://localhost:3000/config.html

# 3. 配置测试用例和参数
# 4. 保存配置（生成 benchmark.config.mts）
# 5. 将配置文件用于其他环境
```

**使用场景**：
- 集中管理测试配置
- 为团队成员生成配置
- 在有 benchmark 工具的环境中使用生成的配置

#### 选项 2: 安装 benchmark 工具包

如果你需要实际运行测试，需要获取该包。

**步骤**：

1. **联系 B站相关人员**
   - 获取内部 npm registry 访问权限
   - 或获取包的安装包/源码

2. **配置 npm registry**（如果有权限）
   ```bash
   # 配置 scope registry
   npm config set @bilibili-player:registry <内部-registry-url>

   # 安装包
   npm install @bilibili-player/benchmark
   ```

3. **从本地安装**（如果有安装包）
   ```bash
   npm install /path/to/@bilibili-player/benchmark
   ```

4. **从 Git 安装**（如果托管在 Git）
   ```bash
   npm install git+<repository-url>
   ```

详见 [INSTALL.md](INSTALL.md) 获取完整安装说明。

### 🎨 推荐工作流程

#### 场景 A: 配置管理者

**你的角色**：负责配置测试用例和参数

```bash
# 1. 启动 Web 服务
npm run dev

# 2. 在 Web 界面配置测试
# 3. 保存配置文件
# 4. 将 benchmark.config.mts 分享给测试执行者
```

#### 场景 B: 测试执行者

**你的角色**：需要实际运行测试

```bash
# 1. 获取 @bilibili-player/benchmark 包
# 2. 安装依赖
npm install @bilibili-player/benchmark

# 3. 获取配置文件（从配置管理者）
# 4. 运行测试
npx @bilibili-player/benchmark --runner=Runtime
```

#### 场景 C: 完整环境

**你的角色**：拥有完整权限

```bash
# 1. 配置 registry 并安装包
npm config set @bilibili-player:registry <url>
npm install @bilibili-player/benchmark

# 2. 启动 Web 服务
npm run dev

# 3. 在 Web 界面配置并运行测试
```

### 📊 功能对比表

| 功能 | 无 benchmark 包 | 有 benchmark 包 |
|------|----------------|----------------|
| Web 服务器 | ✅ | ✅ |
| 配置管理界面 | ✅ | ✅ |
| 编辑测试用例 | ✅ | ✅ |
| 配置参数 | ✅ | ✅ |
| 生成配置文件 | ✅ | ✅ |
| **运行测试** | ❌ | ✅ |
| **生成报告** | ❌ | ✅ |

### 💡 临时解决方案

如果你现在需要测试功能但暂时无法获取包：

#### 1. 使用模拟模式（开发中）

可以在代码中添加模拟测试：

```typescript
// 在 server/index.ts 中
if (!fs.existsSync('node_modules/@bilibili-player/benchmark')) {
    console.log('⚠️  Benchmark package not installed, using mock mode');
    // 添加模拟测试逻辑
}
```

#### 2. 使用命令行（如果有包）

直接在终端运行：

```bash
# 如果你有包的话
npx @bilibili-player/benchmark --runner=Runtime
```

#### 3. 分离配置和执行

- **配置端**：使用此 Web 系统配置
- **执行端**：在有包的环境中执行

### 🆘 常见问题

**Q: 为什么点击"启动测试"没有反应？**

A: 因为 benchmark 包未安装。你可以：
- 查看终端日志确认错误
- 查看浏览器控制台
- 在 Web 界面查看"实时输出"

**Q: 我可以在没有包的情况下使用这个系统吗？**

A: 可以！你可以使用所有配置功能，只是无法运行实际测试。

**Q: 如何获取 benchmark 包？**

A: 查看 [INSTALL.md](INSTALL.md) 了解详细步骤。

**Q: 生成的配置文件可以在其他地方使用吗？**

A: 可以！`benchmark.config.mts` 是标准配置文件，可以在任何安装了 benchmark 包的环境中使用。

### 📚 相关文档

- [INSTALL.md](INSTALL.md) - 完整安装指南
- [QUICKSTART.md](QUICKSTART.md) - 快速开始（含限制说明）
- [README.md](README.md) - 功能说明
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排查

### ✅ 验证清单

**如果你只需要配置功能**：
- [ ] 可以访问 http://localhost:3000
- [ ] 可以访问配置页面
- [ ] 可以添加测试用例
- [ ] 可以保存配置
- [ ] 生成了 benchmark.config.mts 文件

**如果你需要运行测试**：
- [ ] 已安装 @bilibili-player/benchmark
- [ ] `npm list @bilibili-player/benchmark` 显示已安装
- [ ] 可以在 Web 界面启动测试
- [ ] 可以查看测试输出
- [ ] 可以查看测试报告

### 🎯 下一步

1. **阅读完整文档**：[START_HERE.md](START_HERE.md)
2. **了解安装选项**：[INSTALL.md](INSTALL.md)
3. **开始配置测试**：访问 http://localhost:3000/config.html

---

**记住**：即使没有 benchmark 包，这个 Web 系统仍然是有用的配置管理工具！

**最后更新**: 2025-10-29
