# 测试记录功能指南

## 📋 概述

测试记录模块自动保存每次测试的完整历史记录，包括测试名称、运行器类型、状态、耗时以及 Perfcat 报告链接。所有记录持久化存储，方便后续查询和分析。

## ✨ 功能特性

### 自动记录
- ✅ **自动保存**：每次测试完成后自动保存记录
- ✅ **完整信息**：记录测试名称、Runner类型、状态、时间、耗时
- ✅ **Perfcat集成**：自动关联 Perfcat 报告链接
- ✅ **持久化存储**：数据保存在 `test-records.json` 文件中
- ✅ **最多1000条**：自动维护最近1000条记录

### 数据结构

每条测试记录包含以下信息：

```json
{
  "id": "task_abc123",
  "name": "B站首页性能测试",
  "runner": "Runtime",
  "status": "completed",
  "startTime": "2025-11-17T13:00:00.000Z",
  "endTime": "2025-11-17T13:02:30.000Z",
  "duration": 150000,
  "perfcatId": "1TU_Qe",
  "perfcatUrl": "https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime",
  "perfcatChartUrl": "https://fe-perfcat.bilibili.co/utils/shorten/1TU_Qe?runner=Runtime&viewType=chart",
  "exitCode": 0
}
```

### 查询与过滤

支持多种过滤条件：
- **按 Runner 类型**：Initialization / Runtime / MemoryLeak
- **按状态**：completed（成功）/ error（失败）
- **分页显示**：20 / 50 / 100 条/页

### 统计信息

实时显示：
- 总测试数
- 成功/失败数量
- 各 Runner 类型分布
- 平均测试耗时
- Perfcat 报告数量

## 🎯 使用方法

### 1. 访问测试记录页面

在主页点击 **"📝 测试记录"** 按钮，或直接访问：
```
http://localhost:3000/records.html
```

### 2. 查看记录列表

记录列表显示：
- **测试名称**：任务的名称
- **Runner**：测试类型标签（彩色区分）
- **状态**：✅ 成功 或 ❌ 失败
- **开始时间**：格式化的日期时间
- **耗时**：自动格式化（ms / s / m s）
- **Perfcat链接**：
  - 📊 报告：标准报告视图
  - 📈 图表：图表可视化视图
- **操作**：删除按钮

### 3. 过滤记录

使用顶部过滤器：

```
┌─────────────────────────────────────────────┐
│ Runner类型: [全部 ▼]                        │
│ 状态: [全部 ▼]                              │
│ 每页显示: [50条 ▼]                          │
└─────────────────────────────────────────────┘
```

- 选择 Runner 类型：只显示特定测试类型
- 选择状态：只显示成功或失败的测试
- 调整每页数量：20 / 50 / 100 条

### 4. 查看 Perfcat 报告

点击记录中的链接：
- **📊 报告**：在新标签页打开标准报告
- **📈 图表**：在新标签页打开图表可视化

### 5. 删除记录

- **删除单条**：点击记录右侧的"删除"按钮
- **清空所有**：点击页面右上角的"🗑️ 清空记录"

⚠️ **注意**：删除操作不可恢复！

## 🔧 API 接口

### 获取记录列表

```bash
GET /api/test-records?runner=Runtime&status=completed&limit=50&offset=0
```

**查询参数**：
- `runner` (可选): Initialization | Runtime | MemoryLeak
- `status` (可选): completed | error
- `limit` (可选): 每页数量，默认50
- `offset` (可选): 偏移量，默认0

**响应**：
```json
{
  "records": [
    {
      "id": "task_abc123",
      "name": "测试名称",
      "runner": "Runtime",
      "status": "completed",
      ...
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### 获取单条记录

```bash
GET /api/test-records/:id
```

### 获取统计信息

```bash
GET /api/test-records/stats
```

**响应**：
```json
{
  "total": 150,
  "completed": 145,
  "error": 5,
  "byRunner": {
    "Initialization": 50,
    "Runtime": 80,
    "MemoryLeak": 20
  },
  "withPerfcat": 145,
  "averageDuration": 125000
}
```

### 删除记录

```bash
DELETE /api/test-records/:id
```

### 清空记录

```bash
POST /api/test-records/clear
Content-Type: application/json

{
  "runner": "Runtime",  // 可选，只清空特定Runner的记录
  "status": "error"     // 可选，只清空特定状态的记录
}
```

如果不传参数，将清空所有记录。

## 📊 统计卡片

页面顶部显示5个统计卡片：

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│总测试数  │ │  成功    │ │  失败    │ │平均耗时  │ │Perfcat   │
│   150    │ │   145    │ │    5     │ │  2.1m    │ │   145    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- **总测试数**：所有测试记录的数量
- **成功**：状态为 completed 的数量（绿色）
- **失败**：状态为 error 的数量（红色）
- **平均耗时**：所有测试的平均运行时间
- **Perfcat报告**：有 Perfcat 链接的记录数量（蓝色）

## 💾 数据存储

### 存储位置

```
benchmark/
└── test-records.json    # 测试记录数据文件
```

### 数据格式

JSON 数组，按时间倒序排列（最新的在最前面）：

```json
[
  {
    "id": "task_newest",
    "name": "最新测试",
    ...
  },
  {
    "id": "task_older",
    "name": "较早测试",
    ...
  }
]
```

### 容量限制

- **最大记录数**：1000 条
- **自动清理**：超过1000条时，自动删除最旧的记录
- **文件大小**：约 100-200 KB（1000条记录）

### 备份建议

定期备份 `test-records.json` 文件：

```bash
# 备份
cp test-records.json test-records.backup.json

# 或按日期备份
cp test-records.json "test-records.$(date +%Y%m%d).json"
```

## 🎨 UI 设计

### 颜色方案

- **成功状态**：绿色背景 (#c6f6d5)
- **失败状态**：红色背景 (#fed7d7)
- **Initialization**：橙色标签 (#fef5e7)
- **Runtime**：蓝色标签 (#e0e7ff)
- **MemoryLeak**：粉色标签 (#fce7f3)
- **Perfcat报告按钮**：紫色 (#667eea)
- **Perfcat图表按钮**：绿色 (#48bb78)

### 响应式设计

- 自适应宽度，最大1400px
- 卡片式布局，现代化设计
- 悬停效果和过渡动画
- 移动端友好

## 🔄 自动刷新

页面加载时自动获取最新数据。如需实时更新，可以：

1. **手动刷新**：点击右上角"🔄 刷新"按钮
2. **自动刷新**（可选）：编辑 records.html，取消注释：

```javascript
// 在页面底部 window.onload 中添加：
setInterval(() => {
    loadStats();
    loadRecords();
}, 30000); // 每30秒自动刷新
```

## 📈 使用场景

### 1. 性能趋势分析

通过记录历史数据，可以：
- 对比不同时间的测试结果
- 发现性能退化问题
- 验证优化效果

### 2. 测试报告分享

使用 Perfcat 链接：
- 快速分享测试结果给团队
- 无需下载/上传文件
- 支持标准和图表两种视图

### 3. 失败测试排查

筛选失败的测试：
- 快速定位问题测试
- 查看失败时间和相关信息
- 重新运行失败的用例

### 4. Runner 类型统计

查看不同测试类型的使用情况：
- Initialization：初始化性能测试
- Runtime：运行时性能测试
- MemoryLeak：内存泄漏测试

## 🚀 最佳实践

### 1. 定期清理

虽然系统自动限制1000条记录，建议定期清理旧数据：

```bash
# 清空所有失败的测试
curl -X POST http://localhost:3000/api/test-records/clear \
  -H "Content-Type: application/json" \
  -d '{"status":"error"}'

# 清空特定Runner的记录
curl -X POST http://localhost:3000/api/test-records/clear \
  -H "Content-Type: application/json" \
  -d '{"runner":"MemoryLeak"}'
```

### 2. 导出数据

定期导出数据用于长期存档：

```bash
# 导出所有记录
curl http://localhost:3000/api/test-records?limit=1000 > records_export.json

# 导出特定类型
curl http://localhost:3000/api/test-records?runner=Runtime&limit=1000 > runtime_records.json
```

### 3. 命名规范

为测试任务使用清晰的命名：
- ✅ 好：`B站首页-Runtime-移动端`
- ❌ 差：`test1`

### 4. Perfcat 集成

确保 Perfcat Cookie 已配置，这样：
- 每次测试都会自动上传
- 记录中会显示报告链接
- 方便团队协作

## 🐛 故障排查

### 问题 1：记录不显示

**检查**：
1. 确认测试已完成（不是pending或running状态）
2. 查看浏览器控制台是否有错误
3. 检查 `test-records.json` 文件是否存在

**解决**：
```bash
# 检查文件
ls -la test-records.json

# 如果文件损坏，可以重置
echo "[]" > test-records.json

# 重启服务器
npm run dev
```

### 问题 2：Perfcat 链接为空

**原因**：Perfcat 未配置或上传失败

**解决**：
1. 配置 Perfcat Cookie（参考 [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md)）
2. 重新运行测试

### 问题 3：统计信息不准确

**解决**：
1. 点击"🔄 刷新"按钮
2. 清除浏览器缓存
3. 重新加载页面

### 问题 4：删除后记录仍显示

**解决**：
1. 刷新页面
2. 检查后端日志是否有错误
3. 确认 test-records.json 文件权限正常

## 📝 示例场景

### 场景 1：查看今天的测试结果

1. 访问 http://localhost:3000/records.html
2. 查看列表，最新的测试在最上面
3. 点击 Perfcat 链接查看详细报告

### 场景 2：对比不同时间的性能

1. 筛选特定 Runner 类型（如 Runtime）
2. 查看不同时间的耗时
3. 点击 Perfcat 图表链接，查看性能趋势

### 场景 3：排查失败的测试

1. 选择状态：失败
2. 查看失败的测试列表
3. 检查失败时间和exit code
4. 重新运行相同配置进行验证

## 📚 相关文档

- [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md) - Perfcat 集成文档
- [README.md](README.md) - 主文档
- [PERFCAT_SETUP_GUIDE.md](PERFCAT_SETUP_GUIDE.md) - Perfcat 快速配置

## 🎉 总结

测试记录功能让你可以：

- ✅ 自动保存每次测试的完整信息
- ✅ 快速查询和过滤历史记录
- ✅ 一键访问 Perfcat 报告
- ✅ 分析性能趋势和问题
- ✅ 方便团队协作和报告分享

开始使用：访问 http://localhost:3000/records.html 📝
