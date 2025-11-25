# 🖥️ 前端节点选择器集成指南

本文档说明如何在前端页面中添加节点选择功能，让用户可以选择具体哪台设备执行测试。

---

## 📦 新增文件

1. **[public/worker-selector.js](public/worker-selector.js)** - 节点选择器组件（220行）
2. **[public/worker-selector.css](public/worker-selector.css)** - 样式文件（100行）

---

## 🚀 快速集成到 index.html

### Step 1: 引入文件

在 `public/index.html` 的 `<head>` 部分添加：

```html
<!-- Worker 节点选择器样式 -->
<link rel="stylesheet" href="worker-selector.css">
```

在 `</body>` 标签前添加：

```html
<!-- Worker 节点选择器脚本 -->
<script src="worker-selector.js"></script>
```

### Step 2: 在页面中添加选择器容器

在适当位置（例如"运行配置"卡片中）添加容器：

```html
<div class="card">
    <h2>🚀 运行配置</h2>

    <!-- 节点选择器容器 -->
    <div id="workerSelectorContainer"></div>

    <!-- 其他配置... -->
</div>
```

### Step 3: 初始化选择器

在 JavaScript 部分添加：

```javascript
// 全局变量
let workerSelector = null;

// 初始化节点选择器
async function initWorkerSelector() {
    workerSelector = new WorkerSelector();
    await workerSelector.init();

    // 渲染到容器
    workerSelector.render('workerSelectorContainer');

    // 监听变化（可选）
    workerSelector.onChange((workers, selectedWorkerId) => {
        console.log('Workers updated:', workers.length);
        console.log('Selected worker:', selectedWorkerId);

        // 重新渲染选择器
        workerSelector.render('workerSelectorContainer');
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initWorkerSelector();
    // 其他初始化...
});
```

### Step 4: 修改运行函数

修改 `runCase` 函数，在发送请求时包含选中的 Worker ID：

#### 方式 1: 使用现有 API（需要修改后端）

如果使用现有的 `/api/start` 接口，需要修改它以支持分布式执行：

```javascript
async function runCase(id, testLabel = '') {
    // ... 现有代码 ...

    // 获取选中的 Worker ID
    const selectedWorkerId = workerSelector ? workerSelector.getSelectedWorkerId() : null;

    // 如果选中了 Worker，使用分布式 API
    if (selectedWorkerId) {
        await runDistributedCase(testCase, selectedWorkerId, testLabel);
    } else {
        // 原有逻辑：在本地执行
        await runLocalCase(testCase, testLabel);
    }
}

// 本地执行（原有逻辑）
async function runLocalCase(testCase, testLabel) {
    const taskName = testLabel ? `[${testLabel}] ${testCase.name}` : testCase.name;

    const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: taskName,
            testCaseId: testCase.id,
            remarks: testLabel || undefined,
            config: {
                mode: {
                    anonymous: testCase.anonymous !== undefined ? testCase.anonymous : true,
                    headless: (testCase.mode || 'headless') === 'headless'
                },
                cpuThrottlingRate: testCase.cpuThrottling || 1,
                runners: runnersConfig
            }
        })
    });

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message || result.error || '启动测试失败');
    }

    showToast(`任务已创建: ${taskName}`, 'success');
}

// 分布式执行（新逻辑）
async function runDistributedCase(testCase, workerId, testLabel) {
    const taskName = testLabel ? `[${testLabel}] ${testCase.name}` : testCase.name;

    // 获取启用的 runners
    const enabledRunners = [];
    if (testCase.runners) {
        for (const [runnerName, runnerConfig] of Object.entries(testCase.runners)) {
            if (runnerConfig.enabled) {
                enabledRunners.push(runnerName);
            }
        }
    }

    if (enabledRunners.length === 0) {
        throw new Error('测试用例没有启用任何测试类型');
    }

    // 为每个 runner 创建分布式任务
    const results = [];
    for (const runner of enabledRunners) {
        const response = await fetch('/api/distributed-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                testCaseId: testCase.id,
                workerId: workerId,
                runner: runner
            })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || result.error || '启动分布式任务失败');
        }

        results.push(result);
    }

    // 获取 Worker 名称
    const workers = workerSelector.getWorkers();
    const worker = workers.find(w => w.id === workerId);
    const workerName = worker ? worker.name : workerId;

    showToast(`任务已分配到: ${workerName}`, 'success');
    appendOutput(`[系统] 测试用例 "${taskName}" 已分配到节点: ${workerName}`);
    appendOutput(`[系统] 测试类型: ${enabledRunners.join(' + ')}`);
    appendOutput(`[系统] 任务ID: ${results.map(r => r.taskId).join(', ')}`);
}
```

#### 方式 2: 统一 API（推荐）

更简洁的方式是让后端统一处理，只需在请求中添加 `workerId` 参数：

```javascript
async function runCase(id, testLabel = '') {
    const testCase = testCases.find(tc => tc.id == id);
    if (!testCase) return;

    // ... 其他逻辑 ...

    // 获取选中的 Worker ID（如果有）
    const selectedWorkerId = workerSelector ? workerSelector.getSelectedWorkerId() : null;

    const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: taskName,
            testCaseId: testCase.id,
            workerId: selectedWorkerId, // 添加这一行
            remarks: testLabel || undefined,
            config: {
                mode: {
                    anonymous: testCase.anonymous !== undefined ? testCase.anonymous : true,
                    headless: mode === 'headless'
                },
                cpuThrottlingRate: testCase.cpuThrottling || 1,
                runners: runnersConfig
            }
        })
    });

    // ... 处理响应 ...
}
```

然后在后端（`server/index.ts`）修改 `/api/start` 接口：

```typescript
app.post('/api/start', async (req, res) => {
    const { workerId, ...restBody } = req.body;

    // 如果指定了 workerId，使用分布式执行
    if (workerId) {
        // 调用分布式任务 API
        // ... 分布式执行逻辑
    } else {
        // 原有的本地执行逻辑
        // ... 现有代码
    }
});
```

---

## 🎨 界面效果

### 自动分配模式（默认）
```
┌─────────────────────────────────────────┐
│ 🚀 运行配置                              │
│ ┌───────────────────────────────────┐  │
│ │ 🖥️ 执行节点：[自动分配（推荐）▼]  │  │
│ │ 在线: 3  可用: 2  查看所有节点 →  │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 手动选择模式
```
┌─────────────────────────────────────────┐
│ 🚀 运行配置                              │
│ ┌───────────────────────────────────┐  │
│ │ 🖥️ 执行节点：                       │  │
│ │   [ 自动分配（推荐）            ▼] │  │
│ │   [ 🪟 Windows-PC-1 ✅ [CPU: 25%]] │  │
│ │   [ 🍎 macOS-MBP ✅ [CPU: 15%]   ] │  │
│ │   [ 🐧 Linux-Server ⚙️ (执行中)  ] │  │
│ │   [ 🖥️ Worker-4 ❌ (离线)       ] │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 无 Worker 节点提示
```
┌─────────────────────────────────────────┐
│ 🚀 运行配置                              │
│ ┌───────────────────────────────────┐  │
│ │ 🖥️ 执行节点：[暂无 Worker 节点 ▼] │  │
│ │ ┌───────────────────────────────┐ │  │
│ │ │ 💡 提示：启动 Worker 客户端后  │ │  │
│ │ │    可以选择执行节点             │ │  │
│ │ │    查看节点管理 →              │ │  │
│ │ └───────────────────────────────┘ │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔌 API 说明

### WorkerSelector 类

#### 方法

```javascript
// 初始化
await workerSelector.init()

// 渲染到容器
workerSelector.render('containerId')

// 获取所有 Workers
const workers = workerSelector.getWorkers()

// 获取在线 Workers
const onlineWorkers = workerSelector.getOnlineWorkers()

// 获取可用 Workers
const availableWorkers = workerSelector.getAvailableWorkers()

// 获取选中的 Worker ID
const workerId = workerSelector.getSelectedWorkerId()

// 设置选中的 Worker
workerSelector.setSelectedWorkerId(workerId)

// 监听变化
workerSelector.onChange((workers, selectedWorkerId) => {
    console.log('Updated:', workers, selectedWorkerId);
})

// 清理
workerSelector.destroy()
```

#### Worker 对象结构

```javascript
{
    id: "worker-uuid",
    name: "Windows-PC-1",
    host: "192.168.1.101",
    platform: "win32",           // win32 | darwin | linux
    status: "online",            // online | busy | offline
    cpuUsage: 25.5,             // CPU 使用率 (%)
    memoryUsage: 45.2,          // 内存使用率 (%)
    currentTask: "task-id",     // 当前任务ID（如果有）
    cpuCount: 8,
    memory: 16
}
```

---

## 📝 完整集成示例

创建一个测试页面 `public/test-worker-selector.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>节点选择器测试</title>
    <link rel="stylesheet" href="worker-selector.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        .card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        button {
            padding: 10px 20px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
        }
        button:hover {
            background: #5568d3;
        }
        #result {
            margin-top: 20px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 6px;
            font-family: monospace;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <h1>🖥️ Worker 节点选择器测试</h1>

    <div class="card">
        <h2>节点选择</h2>
        <div id="workerSelectorContainer"></div>
    </div>

    <div class="card">
        <h2>操作</h2>
        <button onclick="testRun()">运行测试</button>
        <button onclick="showSelectedWorker()">显示选中节点</button>
        <button onclick="refreshWorkers()">刷新节点列表</button>
    </div>

    <div id="result"></div>

    <script src="worker-selector.js"></script>
    <script>
        let workerSelector = null;

        // 初始化
        async function init() {
            workerSelector = new WorkerSelector();
            await workerSelector.init();
            workerSelector.render('workerSelectorContainer');

            // 监听变化
            workerSelector.onChange((workers, selectedWorkerId) => {
                console.log('Workers updated:', workers.length);
                workerSelector.render('workerSelectorContainer');
            });

            log('Worker selector initialized');
        }

        // 测试运行
        async function testRun() {
            const workerId = workerSelector.getSelectedWorkerId();

            if (workerId) {
                const workers = workerSelector.getWorkers();
                const worker = workers.find(w => w.id === workerId);
                log(`将在节点 ${worker.name} (${worker.host}) 上执行`);
            } else {
                log('将自动分配节点执行');
            }

            // 这里调用实际的运行函数
            // await runCase(testCaseId, workerId);
        }

        // 显示选中的节点
        function showSelectedWorker() {
            const workerId = workerSelector.getSelectedWorkerId();
            const workers = workerSelector.getWorkers();

            if (workerId) {
                const worker = workers.find(w => w.id === workerId);
                log(`选中节点：\n${JSON.stringify(worker, null, 2)}`);
            } else {
                log('未选中节点（自动分配）');
            }
        }

        // 刷新节点列表
        async function refreshWorkers() {
            await workerSelector.loadWorkers();
            log('节点列表已刷新');
        }

        // 日志
        function log(message) {
            const result = document.getElementById('result');
            result.textContent = `[${new Date().toLocaleTimeString()}] ${message}\n` + result.textContent;
        }

        // 启动
        init();
    </script>
</body>
</html>
```

访问：http://localhost:3000/test-worker-selector.html

---

## ✅ 验证清单

集成完成后，验证以下功能：

- [ ] 页面加载时自动显示节点列表
- [ ] 可以看到在线/离线/执行中的节点状态
- [ ] 可以在下拉菜单中选择节点
- [ ] 离线节点显示为禁用状态
- [ ] 选择节点后，运行测试时使用选中的节点
- [ ] 节点状态实时更新（通过 WebSocket）
- [ ] "查看所有节点"链接跳转正确
- [ ] 无节点时显示提示信息

---

## 🎯 总结

通过添加这两个文件并简单集成，您就可以在前端页面选择执行节点了：

1. **[worker-selector.js](public/worker-selector.js)** - 提供节点选择功能
2. **[worker-selector.css](public/worker-selector.css)** - 提供美观的样式

**核心功能：**
- ✅ 自动加载节点列表
- ✅ 实时状态更新
- ✅ 可视化选择界面
- ✅ 自动分配或手动选择
- ✅ 显示节点状态（在线/离线/执行中）
- ✅ 显示节点信息（平台、CPU使用率等）

**使用简单：**
```javascript
// 初始化
const selector = new WorkerSelector();
await selector.init();
selector.render('containerId');

// 获取选中的节点
const workerId = selector.getSelectedWorkerId();

// 运行任务时传入
await runDistributedTask(testCaseId, workerId);
```

立即开始使用吧！🚀
