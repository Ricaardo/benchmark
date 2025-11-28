# Worker 节点问题排查指南

## 问题：无法触发节点执行测试

### 症状

- Worker 节点已成功连接到 Master
- Worker 显示"在线"状态
- 但前端点击"运行测试"后，任务没有分发到 Worker

### 诊断步骤

#### 1. 验证 Worker 连接状态

**检查 Worker 是否在线:**

```bash
curl http://10.23.182.34:3000/api/workers
```

**预期结果:**
应该看到您的 Worker 节点，状态为 `"status":"online"`

**实际结果示例:**
```json
{
  "id": "9a0e627b-23bd-4bbf-8fa4-d078c8eeed97",
  "name": "中配测试机-1",
  "status": "online",
  "performanceTier": "medium"
}
```

✅ **已验证:** Worker 在线

#### 2. 检查前端 Worker 选择器

**在浏览器中:**
1. 打开 http://10.23.182.34:3000
2. 打开浏览器开发者工具（F12）
3. 切换到 Console 标签页
4. 查看是否有以下日志:

```
[WorkerSelector] ✅ WebSocket connected
[WorkerSelector] 在线节点: 1
```

**如果没有看到:**
- 刷新页面
- 检查浏览器 Console 是否有错误

#### 3. 检查测试用例配置

**在浏览器 Console 中运行:**

```javascript
// 查看所有测试用例
console.log(window.testCases);

// 查看 Worker 选择器状态
console.log(window.workerSelector);

// 查看选中的 Worker
console.log(window.workerSelector.getSelectedWorkerId());
```

**预期结果:**
- `testCases` 应该有至少一个测试用例
- `workerSelector` 应该存在
- `getSelectedWorkerId()` 返回 Worker ID 或 'local'

#### 4. 手动触发分布式任务

**在浏览器 Console 中测试 API:**

```javascript
// 测试分布式任务 API
fetch('/api/distributed-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        testCaseId: 'testcase_xxx', // 替换为实际的测试用例 ID
        workerId: '9a0e627b-23bd-4bbf-8fa4-d078c8eeed97', // 替换为实际的 Worker ID
        runner: 'Initialization',
        config: {
            mode: { headless: true, anonymous: true },
            runners: {
                Initialization: {
                    enabled: true,
                    testCases: [{
                        target: 'https://www.bilibili.com',
                        description: '测试'
                    }],
                    iterations: 7
                }
            }
        }
    })
})
.then(res => res.json())
.then(data => console.log('✅ 任务创建:', data))
.catch(err => console.error('❌ 错误:', err));
```

#### 5. 检查 Worker 日志

**在 Worker 机器的终端查看:**

如果任务成功分发，应该看到：

```
📋 Task assigned: task_xxx
   Test Case: 测试用例名称
   Runner: Initialization

▶️  Executing: npx @bilibili-player/benchmark Initialization --config ...
```

### 常见问题和解决方案

#### 问题 1: Worker 显示离线

**原因:**
- Worker 进程未运行
- 网络连接问题
- Master URL 配置错误

**解决:**
```bash
# 检查 Worker 进程
ps aux | grep worker-client

# 重启 Worker
./scripts/start-worker-medium.sh

# 检查网络连通性
curl http://10.23.182.34:3000/
```

#### 问题 2: 前端没有测试用例

**原因:**
- 测试用例未创建
- LocalStorage 被清除

**解决:**
1. 在前端点击"新建用例"
2. 或点击"预设模板"加载示例用例
3. 或导入测试用例 JSON 文件

#### 问题 3: Worker 选择器未显示 Worker

**原因:**
- WebSocket 未连接
- Worker 选择器组件未初始化

**解决:**
1. 刷新页面
2. 检查浏览器 Console 错误
3. 检查 Worker 选择器 WebSocket 连接:

```javascript
// 在 Console 中查看
window.workerSelector.ws.readyState
// 1 = OPEN (已连接)
// 0 = CONNECTING (连接中)
// 2 = CLOSING (关闭中)
// 3 = CLOSED (已关闭)
```

#### 问题 4: 点击运行后没有反应

**可能原因和检查:**

**原因 A: 测试用例配置不完整**

检查用例是否有：
- ✅ 至少一个 URL
- ✅ 至少一个启用的 Runner
- ✅ 有效的 Runner 配置

**原因 B: Worker 未被选中**

系统应该自动选择中配 Worker。检查：

```javascript
// 查看当前选中的 Worker
console.log(window.workerSelector.getSelectedWorkerId());

// 手动选择 Worker
document.querySelector('#worker-selector').value = 'worker_id_here';
```

**原因 C: API 请求失败**

打开 Network 标签页，查看请求：
- `/api/distributed-tasks` POST 请求
- 检查状态码（应该是 200）
- 检查响应内容

#### 问题 5: "Unknown message type" 警告

**原因:**
Worker 收到不认识的 WebSocket 消息类型。

**解决:**
已修复。更新代码后重启 Worker：

```bash
git pull
npm run build
# 重启 Worker
```

### 完整测试流程

**1. 创建测试用例**

在前端：
1. 点击"新建用例"
2. 输入名称："测试 - Bilibili 首页"
3. 添加 URL："https://www.bilibili.com"
4. 选择测试类型："Initialization"
5. 点击"保存"

**2. 选择 Worker（可选）**

- 如果不选择，系统自动选择中配 Worker
- 或在下拉框中手动选择

**3. 运行测试**

1. 点击测试用例的"运行"按钮
2. 输入测试标记（可选）："Baseline"
3. 观察日志输出

**4. 验证任务分发**

**前端应该显示:**
```
[系统] 🎯 自动选择中配Worker: 中配测试机-1
[系统] 🌐 使用分布式执行，目标节点: 9a0e627b-...
[系统] 测试用例 "测试 - Bilibili 首页" 已提交到任务队列
```

**Worker 终端应该显示:**
```
📋 Task assigned: task_xxx
   Test Case: 测试 - Bilibili 首页
   Runner: Initialization

▶️  Executing: npx @bilibili-player/benchmark Initialization --config ...
```

### 调试技巧

#### 启用详细日志

**Worker 端:**
Worker 已经输出详细日志，无需额外配置。

**前端:**

在浏览器 Console 中：

```javascript
// 监听 Worker 选择器变化
window.workerSelector.onChange(() => {
    console.log('Worker 变化:', window.workerSelector.getSelectedWorkerId());
});

// 监听 WebSocket 消息
const originalOnMessage = window.workerSelector.ws.onmessage;
window.workerSelector.ws.onmessage = function(event) {
    console.log('📨 收到消息:', JSON.parse(event.data));
    originalOnMessage.call(this, event);
};
```

#### 检查任务状态

```bash
# 查看所有分布式任务
curl http://10.23.182.34:3000/api/distributed-tasks

# 查看特定任务
curl http://10.23.182.34:3000/api/distributed-tasks/task_xxx
```

#### 检查数据文件

```bash
# Worker 信息
cat data/workers/9a0e627b-23bd-4bbf-8fa4-d078c8eeed97.json

# 任务信息
ls data/distributed-tasks/

# 测试用例
ls data/test-cases/
```

### 下一步

如果以上步骤都无法解决问题：

1. **收集日志:**
   - Worker 终端完整输出
   - 浏览器 Console 所有日志
   - 浏览器 Network 标签页的请求/响应

2. **检查环境:**
   - Node.js 版本: `node --version`
   - NPM 版本: `npm --version`
   - 是否安装了 @bilibili-player/benchmark

3. **重启所有服务:**
   ```bash
   # 重启 Master
   npm start

   # 重启 Worker
   ./scripts/start-worker-medium.sh

   # 清除浏览器缓存并刷新
   ```

4. **查看更多文档:**
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
   - [DISTRIBUTED_DEPLOYMENT.md](DISTRIBUTED_DEPLOYMENT.md)
   - [USAGE.md](USAGE.md)

### 最常见的原因

根据经验，90% 的"无法触发节点执行"问题是由以下原因导致：

1. ❌ **没有创建测试用例** - 在前端创建至少一个用例
2. ❌ **测试用例配置不完整** - 确保有 URL 和启用的 Runner
3. ❌ **浏览器缓存** - 清除缓存或硬刷新（Ctrl+Shift+R）
4. ❌ **Worker 实际离线** - 检查 Worker 进程是否运行
5. ❌ **网络问题** - 检查防火墙和网络连接

---

**修复进度:**
- ✅ Worker WebSocket 消息处理已修复
- ✅ Worker 连接状态正常
- ⏳ 等待用户创建测试用例并验证
