# 更新日志

## v2.0.0 - 完全自定义配置系统

### 🎉 主要更新

#### 1. 全新配置管理界面
- 新增独立的配置管理页面 (`/config.html`)
- 可视化配置三种测试模式
- 动态添加/删除测试用例
- 实时预览配置效果

#### 2. 完全自定义的测试参数
- **Runtime 模式**: 自定义 `durationMs` 和 `delayMs`
- **MemoryLeak 模式**: 自定义 `intervalMs`、`iterations` 和 `onPageTesting`
- 所有参数都可通过 Web 界面配置

#### 3. 灵活的测试用例管理
- 每个测试模式独立配置测试用例
- 支持添加多个测试 URL
- 每个用例可设置描述信息

#### 4. 智能配置生成
- 从 JSON 配置自动生成 TypeScript 配置文件
- 保持代码格式和类型安全
- 支持自定义 `onPageTesting` 代码注入

#### 5. 默认行为优化
- MemoryLeak 的 `onPageTesting` 默认为空（静置页面）
- 提供清晰的配置说明和示例
- 支持配置模板快速开始

### 📋 新增文件

```
benchmark/
├── public/
│   └── config.html              # 新增：配置管理界面
├── benchmark.dynamic.json       # 新增：动态配置存储
├── config.template.json         # 新增：配置模板
├── QUICKSTART.md               # 新增：快速启动指南
└── CHANGELOG.md                # 新增：更新日志
```

### 🔄 修改的文件

#### server/index.ts
- 新增 `generateConfig()` 函数，动态生成配置文件
- 新增 `/api/dynamic-config` GET/POST 接口
- 优化配置文件读写逻辑

#### benchmark.config.mts
- 简化为最小模板
- 通过 Web 界面动态生成内容

#### public/index.html
- 添加导航菜单
- 优化 UI 布局
- 改进状态显示

#### README.md
- 更新使用说明
- 添加配置示例
- 完善 API 文档

### 🎨 功能特性

#### 配置方式
1. **Web 界面配置**（推荐）
   - 访问 `/config.html`
   - 可视化操作
   - 自动生成配置文件

2. **JSON 文件配置**
   - 编辑 `benchmark.dynamic.json`
   - 重启服务器自动加载

3. **直接编辑配置文件**（高级）
   - 手动编辑 `benchmark.config.mts`
   - 完全控制配置细节

#### 测试模式配置

**Initialization**
- 简单开关启用
- 添加测试用例即可

**Runtime**
- 自定义运行时长
- 自定义延迟时间
- 多个测试用例

**MemoryLeak**
- 自定义迭代间隔
- 自定义迭代次数
- 自定义页面操作代码
- 留空表示静置页面

### 💡 使用场景

#### 场景 1: 快速测试首页性能
```
1. 启用 Initialization
2. 添加首页 URL
3. 保存并运行
```

#### 场景 2: 长时间压力测试
```
1. 启用 Runtime
2. 设置 durationMs = 3600000 (1小时)
3. 添加测试页面
4. 保存并运行
```

#### 场景 3: 内存泄漏检测
```
1. 启用 MemoryLeak
2. 设置 iterations = 5
3. 在 onPageTesting 中添加操作代码或留空
4. 保存并运行
```

### 🔧 技术细节

#### 配置生成流程
```
用户配置 (Web UI)
    ↓
JSON 配置 (benchmark.dynamic.json)
    ↓
generateConfig() 函数
    ↓
TypeScript 配置 (benchmark.config.mts)
    ↓
Benchmark 执行
```

#### onPageTesting 处理
- 用户输入的代码会被注入到生成的配置中
- 留空时生成注释占位符
- 支持多行 JavaScript 代码
- 自动添加类型注解 `any`

### 📈 改进点

#### 用户体验
- ✅ 无需手动编写 TypeScript 代码
- ✅ 可视化配置所有参数
- ✅ 实时预览和验证
- ✅ 清晰的说明和提示

#### 灵活性
- ✅ 完全自定义所有参数
- ✅ 支持多种配置方式
- ✅ 独立的测试用例管理
- ✅ 自定义页面操作代码

#### 可维护性
- ✅ 配置与代码分离
- ✅ JSON 配置易于版本控制
- ✅ 自动生成保证格式一致
- ✅ 模板系统便于复用

### 🚀 下一步计划

- [ ] 支持配置预设模板
- [ ] 导入/导出配置功能
- [ ] 配置历史记录
- [ ] 测试结果对比功能
- [ ] 定时任务调度
- [ ] 邮件/Webhook 通知

### 🐛 已知问题

暂无

### 📝 迁移指南

从旧版本迁移到 v2.0.0：

1. 安装新的依赖
```bash
npm install
```

2. 访问配置页面重新配置
```
http://localhost:3000/config.html
```

3. 或者创建 `benchmark.dynamic.json` 文件
```json
{
  "mode": { "anonymous": true, "headless": false },
  "runners": {
    "Runtime": {
      "enabled": true,
      "durationMs": 60000,
      "delayMs": 10000,
      "testCases": [...]
    }
  }
}
```

4. 启动服务器
```bash
npm run dev
```

### 🙏 致谢

感谢所有使用和反馈的用户！

---

**发布日期**: 2025-10-29
