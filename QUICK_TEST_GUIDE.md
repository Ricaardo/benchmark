# 快速测试指南

## 验证修复后的系统

### 1. 前端错误修复验证

**已修复的问题:**
- ✅ `getStatusText is not defined` 错误

**验证步骤:**

1. 刷新浏览器页面 (Ctrl+Shift+R 硬刷新)
2. 打开开发者工具 Console (F12)
3. 检查是否还有红色错误

**预期结果:**
```
[初始化] 正在从服务器加载测试用例...
WebSocket connected
[Worker选择器] ✅ 初始化完成
[初始化] ✅ 已从服务器加载 X 个测试用例
[WorkerSelector] ✅ WebSocket connected
[Worker选择器] Workers更新: 8
[BatchDispatcher] ✅ 批量分发功能已启用
```

✅ **无红色错误**

### 2. Worker 连接验证

**检查 Worker 状态:**

在前端页面，查看 "执行节点选择" 区域：

- 应该显示："在线节点: 1"
- 下拉框中应该有："中配 - 中配测试机-1"
- 状态显示："🟢 在线"

**如果没有显示在线节点:**

```bash
# 在 Worker 机器上重启
./scripts/start-worker-medium.sh
```

### 3. 创建测试用例

**方法 1: 使用预设模板**

1. 点击"预设模板"按钮
2. 选择"B站首页 - 基础性能测试"
3. 点击"加载"
4. 用例自动创建

**方法 2: 手动创建**

1. 点击"新建用例"
2. 填写信息：
   - **用例名称**: `测试 - Bilibili 首页`
   - **描述**: `测试首页加载性能`
   - **标签**: `首页,性能`

3. 添加 URL:
   - 点击"添加 URL"
   - URL: `https://www.bilibili.com`
   - 描述: `B站首页`

4. 配置测试类型:
   - ✅ 勾选 **Initialization**
   - 迭代次数: `7`

5. 点击"保存"

### 4. 测试分布式执行（重要）

#### 步骤 1: 选择 Worker（可选）

- **自动选择:** 不选择任何 Worker，系统会自动选择中配 Worker
- **手动选择:** 在下拉框中选择"中配 - 中配测试机-1"

#### 步骤 2: 运行测试

1. 找到刚创建的测试用例
2. 点击 "▶️ 运行" 按钮
3. 输入测试标记（可选）: `Baseline`
4. 点击确定

#### 步骤 3: 观察日志

**前端应该显示:**

```
[系统] 🎯 自动选择中配Worker: 中配测试机-1
[系统] 🌐 使用分布式执行，目标节点: 9a0e627b-...
[系统] 测试标记: Baseline
[系统] 任务ID: task_xxx
[系统] 运行模式: 无头模式
[系统] 测试类型: Initialization
[系统] 测试 1 个URL, 重复 1 次
```

**Worker 终端应该显示:**

```
📋 Task assigned: task_xxx
   Test Case: 测试 - Bilibili 首页
   Runner: Initialization

▶️  Executing: npx @bilibili-player/benchmark Initialization --config /tmp/...

[测试开始执行...]
```

### 5. 测试批量分发

#### 步骤 1: 创建多个测试用例

使用预设模板快速创建 3-5 个测试用例。

#### 步骤 2: 批量选择

1. 测试用例卡片左上角出现复选框
2. 勾选 2-3 个用例
3. 或点击"全选"按钮

#### 步骤 3: 批量分发

1. 点击"批量分发"按钮
2. 在模态框中：
   - 分发策略: `自动分配 - 优先中配 (推荐)`
   - 点击"开始分发"

#### 步骤 4: 观察进度

应该看到实时进度：
```
已分发 1/3 (成功: 1, 失败: 0)
已分发 2/3 (成功: 2, 失败: 0)
已分发 3/3 (成功: 3, 失败: 0)
✅ 完成! 成功: 3, 失败: 0
```

Worker 终端应该依次显示任务分配。

### 6. 查看测试结果

#### 方法 1: 在用例卡片查看

测试完成后，用例卡片会显示：
- 上次运行时间
- "查看报告" 链接

点击"查看报告"打开 HTML 报告。

#### 方法 2: 在测试记录页面查看

1. 点击顶部导航的"测试记录"
2. 查看所有测试历史
3. 筛选、搜索特定记录
4. 点击"查看报告"

### 常见问题排查

#### 问题 1: Worker 选择器不显示在线节点

**解决:**

1. 检查 Worker 进程是否运行
2. 刷新页面
3. 查看浏览器 Console 是否有错误

#### 问题 2: 点击运行后没有反应

**检查清单:**

- [ ] 测试用例是否有 URL？
- [ ] 是否至少启用了一个 Runner？
- [ ] 浏览器 Console 是否有错误？
- [ ] Network 标签是否显示 API 请求？

**手动测试 API:**

在浏览器 Console 中：

```javascript
// 1. 检查测试用例
console.log('测试用例:', window.testCases);

// 2. 检查 Worker 选择器
console.log('Worker选择器:', window.workerSelector);
console.log('选中的Worker:', window.workerSelector.getSelectedWorkerId());
console.log('在线Workers:', window.workerSelector.getOnlineWorkers());

// 3. 手动触发测试
const testCase = window.testCases[0]; // 第一个测试用例
if (testCase) {
    window.runCase(testCase.id, 'Manual Test');
}
```

#### 问题 3: Worker 收不到任务

**检查:**

1. Worker 是否真的在线？
   ```bash
   curl http://10.23.182.34:3000/api/workers | grep "status"
   ```

2. 检查 Master 日志
3. 检查网络连接

**重启 Worker:**

```bash
# Ctrl+C 停止
# 重新启动
./scripts/start-worker-medium.sh
```

#### 问题 4: 测试失败

**可能原因:**

- URL 无法访问
- Cookie 已过期
- 网络问题
- 依赖包未安装

**检查 Worker 日志:**

Worker 终端会显示详细的错误信息。

### 完整测试流程（推荐）

#### 1. 环境准备

```bash
# 主服务器
npm start

# Worker 节点
./scripts/start-worker-medium.sh
```

#### 2. 前端验证

访问 http://10.23.182.34:3000

- [ ] 页面加载无错误
- [ ] Worker 选择器显示在线节点
- [ ] 批量分发按钮可见

#### 3. 创建测试用例

- [ ] 使用预设模板创建 3 个用例
- [ ] 所有用例都有 URL 和启用的 Runner

#### 4. 单个测试

- [ ] 选择第一个用例
- [ ] 点击运行
- [ ] 观察前端和 Worker 日志
- [ ] 等待测试完成
- [ ] 点击查看报告

#### 5. 批量测试

- [ ] 选择 2-3 个用例
- [ ] 批量分发（自动分配）
- [ ] 观察分发进度
- [ ] 检查 Worker 依次执行
- [ ] 查看测试记录页面

#### 6. 验证结果

- [ ] 测试记录页面显示所有记录
- [ ] 报告文件可以打开
- [ ] 数据统计正确

### 成功标准

✅ **前端:**
- 无 JavaScript 错误
- Worker 选择器显示在线节点
- 测试可以正常创建和运行
- 批量分发功能正常

✅ **Worker:**
- 成功连接到 Master
- 无 "Unknown message type" 警告
- 能接收并执行任务
- 任务结果正确上报

✅ **分布式执行:**
- 自动选择中配 Worker
- 手动选择 Worker 生效
- 批量分发正常
- 任务状态实时更新

### 下一步

如果以上测试都通过：

1. ✅ 系统工作正常
2. 可以开始正式使用
3. 参考 [USAGE.md](USAGE.md) 学习更多功能

如果遇到问题：

1. 查看 [WORKER_TROUBLESHOOTING.md](WORKER_TROUBLESHOOTING.md)
2. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. 检查日志和错误信息

---

**测试检查清单:**

- [ ] 前端无 JavaScript 错误
- [ ] Worker 成功连接
- [ ] 创建测试用例
- [ ] 单个测试运行成功
- [ ] 批量分发成功
- [ ] 查看测试报告
- [ ] 测试记录页面正常

**全部通过 = 系统正常工作** ✅
