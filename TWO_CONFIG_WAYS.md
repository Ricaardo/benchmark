# 配置方式说明（已优化）

## ⚙️ 系统架构理解

**✅ 推荐的配置方式（唯一正确路径）**：

```
┌─────────────────────────────────────────┐
│  主控制台 (/)                            │
│  http://localhost:3000                  │
│  - 查看测试状态                          │
│  - 启动/停止测试                         │
│  - [前往配置管理] 按钮 ← 醒目指引        │
└──────────────┬──────────────────────────┘
               │
               ↓ 点击配置按钮
┌─────────────────────────────────────────┐
│  配置管理页面                            │
│  http://localhost:3000/config.html      │
│  - 可视化表单                            │
│  - 分步骤指引                            │
│  - 添加/删除测试用例                     │
│  - 配置所有参数                          │
└──────────────┬──────────────────────────┘
               │
               ↓ 点击"保存配置"
┌─────────────────────────────────────────┐
│  benchmark.dynamic.json (JSON)          │
│  - 存储完整配置                          │
│  - 包含所有测试用例                      │
│  - 源数据文件                            │
└──────────────┬──────────────────────────┘
               │
               ↓ 自动生成
┌─────────────────────────────────────────┐
│  benchmark.config.mts (TypeScript)      │
│  - 自动生成（启动测试时动态生成）        │
│  - benchmark 工具读取这个文件            │
│  - ⚠️ 不要手动编辑此文件                 │
└─────────────────────────────────────────┘
```

## ⚠️ 重要更新（2025-10-30）

**系统已优化！** 现在只有一个清晰的配置路径：

- ✅ **推荐**：使用配置管理页面 (`/config.html`)
- ❌ **已移除**：主页的配置编辑器（容易误导）
- ⚠️ **避免**：手动编辑生成的 `benchmark.config.mts`

## 🎯 ~~之前遇到的问题~~（已解决）

### ~~问题描述~~

~~之前的版本中，主控制台页面有一个"配置编辑"区域，允许用户直接编辑 TypeScript 配置代码。~~

**✅ 这个问题已经解决！** 我们已经：

1. ✅ 移除了主控制台的"配置编辑"区域（避免混淆）
2. ✅ 添加了醒目的配置指引卡片
3. ✅ 改进了配置管理页面的说明
4. ✅ 提供了清晰的分步骤配置流程

### ~~原因分析~~（历史记录）

之前系统有两个配置入口导致混淆：

- **系统 1**：表单配置（`/config.html`）→ 保存到 `benchmark.dynamic.json` → 生成 `benchmark.config.mts`
- **系统 2**：代码编辑器（主页）→ 直接编辑 `benchmark.config.mts`

**冲突场景**：
1. 用户在代码编辑器中编辑了 `benchmark.config.mts`
2. 用户在配置页面点击"保存配置"
3. 系统重新生成了 `benchmark.config.mts`
4. 用户的手动编辑丢失 ❌

**✅ 现在已修复**：只有一个配置入口（配置管理页面）

## ✅ 正确的配置方式

### 唯一推荐方式：使用配置管理页面 ✅

**访问配置管理页面**：

1. 打开浏览器访问 <http://localhost:3000>
2. 点击醒目的"前往配置管理"大按钮
3. 或直接访问 <http://localhost:3000/config.html>

**配置步骤**：

1. **第一步**：配置基础选项
   - 勾选"匿名模式"（推荐）
   - 根据需要选择"无头模式"

2. **第二步**：启用测试模式
   - 勾选需要的测试模式开关（Initialization / Runtime / MemoryLeak）
   - 至少启用一个

3. **第三步**：添加测试用例
   - 点击"添加测试用例"按钮
   - 填写 URL（如 `https://www.bilibili.com`）
   - 填写描述（如 "B站首页"）
   - 每个启用的模式至少添加一个测试用例

4. **第四步**：配置参数（可选）
   - Runtime：设置运行时长、延迟时间
   - MemoryLeak：设置迭代间隔、迭代次数、页面操作代码

5. **第五步**：保存配置
   - 点击"保存配置"按钮
   - 等待成功提示

6. **完成**：返回控制台启动测试

**优点**：

- ✅ 简单直观，无需编写代码
- ✅ 自动验证配置正确性
- ✅ 不会被意外覆盖
- ✅ 支持所有参数自定义
- ✅ 有清晰的步骤指引

### 高级方式：直接编辑 JSON（不推荐）

⚠️ **仅适用于高级用户**，一般用户请使用配置管理页面

**编辑 `benchmark.dynamic.json`**：

```bash
# 编辑 JSON 配置文件
vi benchmark.dynamic.json
```

```json
{
  "mode": {
    "anonymous": true,
    "headless": false
  },
  "runners": {
    "Initialization": {
      "enabled": true,
      "testCases": [
        {
          "target": "https://www.bilibili.com",
          "description": "B站首页"
        },
        {
          "target": "https://search.bilibili.com",
          "description": "B站搜索首页"
        }
      ]
    }
  }
}
```

**然后触发重新生成**：

```bash
# 方式 1: 访问配置页面点击"重新加载"
# 方式 2: 使用 API
curl -X POST http://localhost:3000/api/dynamic-config \
  -H "Content-Type: application/json" \
  -d @benchmark.dynamic.json
```

**优点**：
- ✅ 更灵活
- ✅ 可以版本控制
- ✅ 可以批量修改

### 方式 C：直接编辑 .mts（不推荐）

**直接编辑生成的配置文件**：

```bash
vi benchmark.config.mts
```

⚠️ **警告**：
- 这个文件会在启动测试时被覆盖
- 不会同步到 JSON 配置
- 只适合临时测试

## 🔄 配置同步机制

### 正确的工作流程

```
1. 编辑配置
   ↓
   方式 A: Web 表单
   方式 B: benchmark.dynamic.json
   ↓
2. 保存/生成
   ↓
3. benchmark.config.mts 自动生成
   ↓
4. 运行测试
```

### ❌ 错误的工作流程

```
1. 直接编辑 benchmark.config.mts
   ↓
2. 启动测试（或在 Web 表单保存）
   ↓
3. benchmark.config.mts 被覆盖 ❌
   ↓
4. 你的编辑丢失了
```

## 💡 最佳实践

### 新手用户

**使用 Web 表单**：
1. 访问配置页面
2. 使用可视化表单
3. 不要碰"配置编辑"区域
4. 点击"保存配置"

### 高级用户

**编辑 JSON 配置**：
1. 编辑 `benchmark.dynamic.json`
2. 使用 API 或界面触发重新生成
3. 提交到 Git 进行版本控制

### 临时测试

**直接编辑 .mts**：
1. 编辑 `benchmark.config.mts`
2. 直接运行 `npx @bilibili-player/benchmark`
3. ⚠️ 注意会被覆盖

## 📝 当前状态

### 已为你配置好

我已经帮你更新了 `benchmark.dynamic.json`，包含你的两个测试用例：

```json
{
  "runners": {
    "Initialization": {
      "enabled": true,
      "testCases": [
        {
          "target": "https://www.bilibili.com",
          "description": "B站首页"
        },
        {
          "target": "https://search.bilibili.com",
          "description": "B站搜索首页"
        }
      ]
    }
  }
}
```

并已自动生成了正确的 `benchmark.config.mts`。

### 现在可以运行

```bash
# 方式 1: Web 界面
# 访问 http://localhost:3000
# 选择 Initialization
# 点击"启动测试"

# 方式 2: 命令行
npx @bilibili-player/benchmark
```

## 🎯 配置修改指南

### 场景 1：添加新的测试用例

**使用 Web 表单**：
1. 访问配置页面
2. 点击"重新加载"（加载当前配置）
3. 点击"添加测试用例"
4. 填写 URL 和描述
5. 点击"保存配置"

**或编辑 JSON**：
```json
"testCases": [
  {"target": "https://www.bilibili.com", "description": "B站首页"},
  {"target": "https://search.bilibili.com", "description": "搜索页"},
  {"target": "https://new-url.com", "description": "新增"} // 新增
]
```

### 场景 2：修改测试参数

**使用 Web 表单**：
1. 访问配置页面
2. 启用 Runtime
3. 修改"运行时长"和"延迟时间"
4. 点击"保存配置"

**或编辑 JSON**：
```json
"Runtime": {
  "enabled": true,
  "durationMs": 120000,  // 改为 2 分钟
  "delayMs": 5000        // 改为 5 秒
}
```

### 场景 3：启用多个测试模式

**编辑 JSON**（最方便）：
```json
{
  "runners": {
    "Initialization": {
      "enabled": true,
      "testCases": [...]
    },
    "Runtime": {
      "enabled": true,
      "testCases": [...],
      "durationMs": 60000,
      "delayMs": 10000
    },
    "MemoryLeak": {
      "enabled": true,
      "testCases": [...],
      "intervalMs": 60000,
      "iterations": 3
    }
  }
}
```

## 🔧 调试技巧

### 查看当前配置

```bash
# 查看 JSON 配置（源）
cat benchmark.dynamic.json

# 查看生成的配置（实际使用）
cat benchmark.config.mts
```

### 重新生成配置

如果修改了 JSON 但没有生成：

```bash
# 方式 1: 使用 API
curl -X POST http://localhost:3000/api/dynamic-config \
  -H "Content-Type: application/json" \
  -d @benchmark.dynamic.json

# 方式 2: Web 界面
# 访问配置页面
# 点击"重新加载" → "保存配置"
```

### 验证配置

```bash
# 检查配置是否正确
npx @bilibili-player/benchmark --help

# 尝试运行
npx @bilibili-player/benchmark
```

## 📚 相关文档

- [QUICK_CONFIG.md](QUICK_CONFIG.md) - 快速配置指南
- [README.md](README.md) - 完整功能说明
- [SUMMARY.md](SUMMARY.md) - 架构设计

## ✅ 总结

**记住**：

1. ✅ **推荐**：使用 Web 表单或编辑 `benchmark.dynamic.json`
2. ❌ **避免**：直接编辑 `benchmark.config.mts`（会被覆盖）
3. 🔄 **理解**：`.mts` 是自动生成的，不应手动编辑

**你的配置现在已经正确设置好了！** 可以直接运行测试了。

---

**最后更新**: 2025-10-30
