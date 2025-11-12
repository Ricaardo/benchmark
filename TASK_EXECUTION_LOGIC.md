# 任务执行逻辑分析

## 📊 当前架构

### 1. 双队列系统

项目采用**前端队列 + 后端任务管理**的双层架构:

#### 前端队列 (Client-Side Queue)
- **位置**: `public/index.html:746`
- **变量**: `runningQueue: number[]` (存储用例ID)
- **用途**: 批量运行多个用例时的UI控制
- **特点**:
  - 仅在用户点击"运行选中"时启用
  - 按顺序逐个发送API请求
  - 不了解后端的实际并发状态

#### 后端任务系统 (Server-Side Task Manager)
- **位置**: `server/index.ts:100-384`
- **变量**: `tasks: Map<string, Task>`
- **并发限制**: `MAX_CONCURRENT_TASKS = 3`
- **特点**:
  - 管理所有 benchmark 进程
  - 自动处理并发限制
  - 维护任务生命周期

---

## 🔄 完整执行流程

### 场景 A: 单个任务运行

```
1. 用户操作
   └─ 点击用例的"▶ 运行"按钮

2. 前端处理 (index.html:1305)
   runCase(id)
   ├─ 获取用例配置
   ├─ 构建测试配置
   ├─ 更新UI状态 (status = 'running')
   └─ 发送 POST /api/start

3. 后端处理 (server/index.ts:897)
   POST /api/start
   ├─ 验证配置
   ├─ createTask() → 创建任务 (status = 'pending')
   ├─ startTask(taskId) → 尝试启动
   │   │
   │   ├─ 检查 status === 'pending' ✓
   │   ├─ 检查并发数量
   │   │   │
   │   │   ├─ 并发 < 3 → 启动进程
   │   │   │   ├─ task.status = 'running'
   │   │   │   ├─ 生成临时配置文件
   │   │   │   ├─ exec('npx @bilibili-player/benchmark')
   │   │   │   ├─ 监听 stdout/stderr
   │   │   │   └─ 广播状态更新 (WebSocket)
   │   │   │
   │   │   └─ 并发 >= 3 → 等待
   │   │       ├─ 输出等待消息
   │   │       ├─ task.status 保持 'pending'
   │   │       └─ return (不启动)
   │   │
   │   └─ broadcastTaskUpdate()
   │
   └─ 返回 { success: true, taskId }

4. 任务完成时
   process.on('close')
   ├─ task.status = 'completed' / 'error'
   ├─ 清理配置文件
   ├─ 发送 Webhook 通知
   ├─ broadcastTaskUpdate()
   └─ startNextPendingTask() → 启动下一个等待的任务
```

### 场景 B: 批量任务运行

```
1. 用户操作
   └─ 选中多个用例 → 点击"▶ 运行选中"

2. 前端处理 (index.html:1498)
   runSelectedCases()
   ├─ 将选中的ID添加到 runningQueue
   ├─ updateQueueDisplay() → 显示队列卡片
   └─ runNextInQueue()
       ├─ 取 runningQueue[0]
       ├─ await runCase(id) → 发送API请求(同场景A)
       └─ 等待任务完成...

3. WebSocket 接收状态
   handleWebSocketMessage({ type: 'status', status: 'completed' })
   └─ updateStatus()
       ├─ 标记当前任务完成
       ├─ runningQueue.shift() → 移除队列首位
       └─ setTimeout(() => runNextInQueue(), 2000)
```

---

## ⚠️ "触发后没执行" 的问题分析

### 可能原因

#### 1. **并发限制 - 任务卡在 pending 状态**

**现象:**
- 后端已有3个任务在运行
- 新任务创建成功,但 `startTask()` 直接返回
- 任务停留在 `pending` 状态

**根本原因:**
```typescript
// server/index.ts:231-234
if (getRunningTasksCount() >= MAX_CONCURRENT_TASKS) {
    appendTaskOutput(taskId, `[系统] 等待其他任务完成...\n`);
    return;  // ❌ 直接返回,无后续处理
}
```

**自动恢复机制:**
- 只有当其他任务**完成**时,才会触发 `startNextPendingTask()`
- 如果所有任务都卡住或长时间运行,pending 任务会一直等待

**前端表现:**
- 前端可能显示"运行中" (因为本地更新了状态)
- 但后端实际还在等待
- **UI 与实际状态不同步**

---

#### 2. **配置验证失败**

**现象:**
- 任务创建失败
- API 返回错误
- 前端收到错误响应

**可能的配置错误:**
```json
// benchmark.dynamic.json
{
  "runners": {
    "Runtime": {
      "enabled": true,
      "testCases": []  // ❌ 空数组
    }
  }
}
```

**验证逻辑:**
```typescript
// server/index.ts:456-490
function validateConfig(config, runner) {
    if (!runnerConfig.enabled) {
        return { valid: false, error: '未启用' };
    }
    if (!runnerConfig.testCases || runnerConfig.testCases.length === 0) {
        return { valid: false, error: '没有配置测试用例' };
    }
    // ... URL格式验证
}
```

---

#### 3. **进程启动失败**

**现象:**
- 任务状态变为 'running'
- 但立即变为 'error'
- 输出日志中有错误信息

**可能原因:**
- `@bilibili-player/benchmark` 未安装或路径错误
- 配置文件生成失败
- Chrome 浏览器未安装或路径错误
- 权限问题

**检查方法:**
```bash
# 检查 benchmark 是否可用
npx @bilibili-player/benchmark --version

# 检查进程
ps aux | grep benchmark

# 查看任务输出
curl http://localhost:3000/api/tasks/{taskId}
```

---

#### 4. **WebSocket 连接问题**

**现象:**
- 任务实际在运行
- 但前端页面不更新
- 刷新页面后状态正确

**原因:**
- WebSocket 断开连接
- 自动重连延迟(5秒)
- 期间状态更新丢失

**代码:**
```javascript
// index.html:771-775
ws.onclose = () => {
    console.log('WebSocket disconnected');
    appendOutput('[系统] WebSocket连接断开,5秒后重连...');
    reconnectTimer = setTimeout(connectWebSocket, 5000);
};
```

---

## 🔍 诊断方法

### 1. 检查任务列表
```bash
curl http://localhost:3000/api/tasks | jq '.'
```

**输出示例:**
```json
{
  "tasks": [
    {
      "id": "task_1699000000000_abc123",
      "name": "Runtime Test",
      "runner": "Runtime",
      "status": "pending",  // ⚠️ 卡在 pending
      "startTime": "2025-11-12T10:00:00.000Z",
      "outputLength": 150
    }
  ],
  "runningCount": 3,  // ⚠️ 已达上限
  "maxConcurrent": 3
}
```

### 2. 查看任务详情
```bash
curl http://localhost:3000/api/tasks/{taskId} | jq '.output'
```

**pending 状态的输出:**
```
[系统] 任务创建: Runtime Test
[系统] 等待其他任务完成...(当前并发: 3/3)
```

### 3. 检查 WebSocket 连接
```javascript
// 浏览器控制台
ws.readyState
// 0: CONNECTING
// 1: OPEN ✓
// 2: CLOSING
// 3: CLOSED ❌
```

### 4. 查看浏览器 Network 面板
- 检查 `/api/start` 请求的响应
- 查看 WebSocket 消息流

---

## ✅ 解决方案

### 方案 1: 提升并发限制

```typescript
// server/index.ts:118
const MAX_CONCURRENT_TASKS = 5;  // 从 3 提升到 5
```

**优点:** 可以同时运行更多任务
**缺点:** 消耗更多系统资源

---

### 方案 2: 前端显示后端真实状态

**当前问题:**
- 前端 `runCase()` 立即设置 `task.status = 'running'`
- 但后端可能还在 `pending`

**改进方案:**
```javascript
// index.html:1310-1311
// ❌ 移除这行
// testCase.status = 'running';

// ✅ 等待 WebSocket 推送真实状态
// WebSocket 会在任务实际启动时推送 status='running'
```

---

### 方案 3: 实时显示任务队列

**添加后端任务列表展示:**
```javascript
// 监听 WebSocket 的 'tasks' 消息
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'tasks') {
        updateBackendTasksDisplay(data.data);
    }
};

function updateBackendTasksDisplay(tasks) {
    // 显示所有后端任务及其状态
    // pending / running / completed / error
}
```

---

### 方案 4: 添加任务优先级和取消机制

**当前问题:**
- pending 任务只能等待
- 无法手动调整顺序或取消

**改进:**
```typescript
// 添加任务优先级
interface Task {
    priority: number;  // 数字越小优先级越高
}

// startNextPendingTask 改为按优先级排序
function startNextPendingTask() {
    const pendingTasks = Array.from(tasks.values())
        .filter(t => t.status === 'pending')
        .sort((a, b) => a.priority - b.priority);

    if (pendingTasks.length > 0) {
        startTask(pendingTasks[0].id);
    }
}
```

---

## 📝 总结

### 当前逻辑的工作方式

1. ✅ **自动队列管理**: 后端自动管理并发,pending 任务会在有空位时自动启动
2. ✅ **双重保护**: 前端队列 + 后端并发限制
3. ⚠️ **状态同步问题**: 前端可能显示错误的状态
4. ⚠️ **用户体验**: 用户不清楚任务是在等待还是真的在运行

### 最常见的"没执行"场景

**并发限制达到上限:**
- 3个任务正在运行
- 新任务进入 pending 队列
- 等待其他任务完成后自动启动

**如何验证:**
```bash
# 1. 查看当前任务数
curl http://localhost:3000/api/tasks

# 2. 如果 runningCount >= maxConcurrent,说明在等待

# 3. 等待正在运行的任务完成,pending 任务会自动启动
```

---

## 🚀 快速诊断命令

```bash
# 运行诊断脚本
./debug-tasks.sh

# 或手动检查
curl http://localhost:3000/api/tasks | jq '{
    running: .runningCount,
    max: .maxConcurrent,
    pending: [.tasks[] | select(.status=="pending") | .name]
}'
```

**正常输出:**
```json
{
  "running": 1,
  "max": 3,
  "pending": []
}
```

**问题输出:**
```json
{
  "running": 3,
  "max": 3,
  "pending": ["任务A", "任务B", "任务C"]  // ⚠️ 有任务在等待
}
```
