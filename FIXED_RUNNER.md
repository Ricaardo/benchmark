# 修复 Runner 选择问题

## 问题说明

### 遇到的错误

```
error: unknown option '--runner=Runtime'
Benchmark process exited with code 1
```

### 原因分析

通过查看 `@bilibili-player/benchmark` 的帮助信息：

```bash
$ npx @bilibili-player/benchmark --help

Usage: benchmark [options] [command]

Options:
  -v, --version        output the version number
  -c, --config <path>  config path, default to cwd's benchmark.config.m[tj]s
  -h, --help           display help for command
```

**发现**：benchmark 工具**不支持 `--runner` 参数**！

### 工具的工作方式

`@bilibili-player/benchmark` 的运行机制：
1. 读取配置文件 `benchmark.config.mts`
2. **自动运行配置文件中所有启用的 runners**
3. 不接受命令行参数来指定运行哪个 runner

## 解决方案

### 修改策略

**之前的错误方法**：
```bash
npx @bilibili-player/benchmark --runner=Runtime  # ❌ 不支持
```

**正确的方法**：
```bash
npx @bilibili-player/benchmark  # ✅ 运行配置文件中所有启用的 runners
```

### 实现方案

为了让用户能在 Web 界面选择运行特定的 runner，我们采用以下策略：

**当用户点击"启动测试"并选择某个 runner 时**：

1. **读取完整配置**
   ```javascript
   const fullConfig = JSON.parse(await fs.readFile('benchmark.dynamic.json'));
   ```

2. **创建临时配置**（只包含选定的 runner）
   ```javascript
   const tempConfig = {
       mode: fullConfig.mode,
       runners: {
           [selectedRunner]: fullConfig.runners[selectedRunner]  // 只包含一个
       }
   };
   ```

3. **生成临时配置文件**
   ```javascript
   const tempConfigCode = generateConfig(tempConfig);
   await fs.writeFile('benchmark.config.mts', tempConfigCode);
   ```

4. **运行 benchmark**
   ```bash
   npx @bilibili-player/benchmark  # 会运行临时配置中的 runner
   ```

### 代码修改

#### server/index.ts - 启动测试接口

**修改前**：
```typescript
app.post('/api/start', (req, res) => {
    const { runner } = req.body;

    // 错误：使用不存在的参数
    const command = `npx @bilibili-player/benchmark --runner=${runner}`;
    currentBenchmark = exec(command);

    res.json({ success: true });
});
```

**修改后**：
```typescript
app.post('/api/start', async (req, res) => {
    const { runner } = req.body;

    try {
        // 1. 读取完整配置
        const fullConfig = JSON.parse(
            await fs.readFile('benchmark.dynamic.json', 'utf-8')
        );

        // 2. 创建只包含选定 runner 的配置
        const tempConfig = {
            mode: fullConfig.mode,
            runners: {
                [runner]: fullConfig.runners[runner]
            }
        };

        // 3. 生成并保存临时配置文件
        const tempConfigCode = generateConfig(tempConfig);
        await fs.writeFile('benchmark.config.mts', tempConfigCode);

        // 4. 运行 benchmark（不带参数）
        const command = 'npx @bilibili-player/benchmark';
        currentBenchmark = exec(command);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start benchmark' });
    }
});
```

## 工作流程

### 完整流程图

```
用户在 Web 界面选择 "Runtime"
         ↓
POST /api/start { runner: "Runtime" }
         ↓
读取 benchmark.dynamic.json
         ↓
{
  mode: {...},
  runners: {
    Initialization: {...},
    Runtime: {...},        ← 提取这个
    MemoryLeak: {...}
  }
}
         ↓
创建临时配置（只包含 Runtime）
         ↓
{
  mode: {...},
  runners: {
    Runtime: {...}         ← 只有这个
  }
}
         ↓
生成 benchmark.config.mts
         ↓
npx @bilibili-player/benchmark
         ↓
benchmark 读取配置并运行 Runtime 测试
```

## 使用说明

### 用户视角

**不需要任何改变！** 用户操作保持完全相同：

1. 访问 http://localhost:3000
2. 从下拉菜单选择测试模式（Initialization/Runtime/MemoryLeak）
3. 点击"启动测试"
4. 查看实时输出

### 配置文件变化

#### benchmark.dynamic.json（完整配置）

始终保存所有配置：
```json
{
  "mode": {...},
  "runners": {
    "Initialization": {...},
    "Runtime": {...},
    "MemoryLeak": {...}
  }
}
```

#### benchmark.config.mts（运行时配置）

**动态生成**，只包含选定的 runner：

选择 Runtime 时：
```typescript
const config: UserOptions = {
    mode: {...},
    runners: {
        Runtime: {...}  // 只有这个
    }
};
```

选择 MemoryLeak 时：
```typescript
const config: UserOptions = {
    mode: {...},
    runners: {
        MemoryLeak: {...}  // 只有这个
    }
};
```

## 优点

### 这种方案的好处

1. ✅ **符合工具设计**：按照 benchmark 工具的预期方式使用
2. ✅ **用户体验不变**：Web 界面操作完全相同
3. ✅ **配置完整保存**：所有配置保存在 `benchmark.dynamic.json`
4. ✅ **灵活性高**：可以运行任意单个 runner
5. ✅ **易于调试**：生成的配置文件可以直接查看

### 对比其他方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **使用 --runner 参数** | 简单 | ❌ 工具不支持 |
| **修改工具源码** | 直接 | ❌ 维护困难，升级麻烦 |
| **动态生成配置** ✅ | 符合工具设计，灵活 | 需要文件 I/O |

## 验证测试

### 测试步骤

1. **启动服务**
   ```bash
   npm run dev
   ```

2. **访问界面**
   ```
   http://localhost:3000
   ```

3. **选择 Runtime 并启动测试**
   - 应该正常运行
   - 不再出现 "unknown option" 错误

4. **查看生成的配置**
   ```bash
   cat benchmark.config.mts
   # 应该只包含 Runtime runner
   ```

5. **切换到 MemoryLeak**
   - 再次启动测试
   - 配置文件应该更新为只包含 MemoryLeak

### 预期结果

✅ 不再出现 `unknown option '--runner=Runtime'` 错误
✅ 可以正常运行选定的测试
✅ 实时输出显示测试进度
✅ 测试完成后生成报告

## 注意事项

### 配置文件覆盖

⚠️ **重要**：`benchmark.config.mts` 会在每次启动测试时被覆盖！

- **不要手动编辑** `benchmark.config.mts`（会被覆盖）
- **应该编辑**：
  - 在 Web 界面配置
  - 或编辑 `benchmark.dynamic.json`

### 多个 Runner 同时运行

如果需要同时运行多个 runner：

**方式 1**：命令行直接运行
```bash
# 确保 benchmark.config.mts 包含所有需要的 runners
npx @bilibili-player/benchmark
```

**方式 2**：在配置页面启用多个，然后选择其中一个运行
- Web 界面每次只能运行一个
- 如需运行多个，使用命令行

## 相关文档

- [README.md](README.md) - 使用说明
- [LINK_GLOBAL_PACKAGE.md](LINK_GLOBAL_PACKAGE.md) - 包链接说明
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - 故障排查

## 总结

**问题**：benchmark 工具不支持 `--runner` 参数

**解决**：动态生成只包含选定 runner 的配置文件

**结果**：用户可以在 Web 界面选择并运行特定的测试模式 ✅

---

**修改完成时间**: 2025-10-29
**版本**: 2.0.1
