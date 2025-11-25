# 🚀 分布式执行 - 快速开始指南

本指南将帮助您快速设置多机分布式执行环境，实现在前端选择不同电脑执行测试任务。

---

## 📋 已实现的核心模块

### ✅ 完成的组件

1. **类型定义** - [server/types.ts](server/types.ts)
   - WorkerNode: Worker 节点信息
   - DistributedTask: 分布式任务
   - WSMessage: WebSocket 消息
   - 其他核心类型定义

2. **Worker 管理器** - [server/worker-manager.ts](server/worker-manager.ts)
   - 节点注册和注销
   - 心跳监控
   - 状态管理
   - 自动节点选择

3. **Worker 客户端** - [server/worker-client.ts](server/worker-client.ts)
   - 自动注册到 Master
   - 心跳上报
   - 任务接收和执行
   - 实时日志传输

4. **架构设计文档** - [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md)
   - 完整的架构说明
   - API 设计
   - 工作流程
   - 部署方案

---

## 🔄 剩余工作

### 需要完成的部分

#### 1. Master 服务器扩展（约 1-2 天）

需要在 `server/index.ts` 中添加：

```typescript
import { WorkerManager } from './worker-manager.js';

// 初始化 Worker 管理器
const workerManager = new WorkerManager();

// 启动时加载 Workers 并开始监控
await workerManager.loadWorkers();
workerManager.startHeartbeatMonitor();

// Worker 管理 API
app.post('/api/workers/register', async (req, res) => {
    const workerId = await workerManager.registerWorker(req.body);
    res.json({ success: true, workerId });
});

app.get('/api/workers', (req, res) => {
    const workers = workerManager.getAllWorkers();
    res.json({ workers });
});

app.get('/api/workers/:workerId', (req, res) => {
    const worker = workerManager.getWorker(req.params.workerId);
    if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
    }
    res.json(worker);
});

app.post('/api/workers/:workerId/heartbeat', async (req, res) => {
    const success = await workerManager.updateHeartbeat(
        req.params.workerId,
        req.body
    );
    res.json({ success });
});

app.delete('/api/workers/:workerId', async (req, res) => {
    const success = await workerManager.unregisterWorker(req.params.workerId);
    res.json({ success });
});

// 分布式任务 API
app.post('/api/distributed-tasks', async (req, res) => {
    const { testCaseId, workerId, runner } = req.body;

    // 获取测试用例
    const testCase = TestCaseStorage.getTestCase(testCaseId);
    if (!testCase) {
        return res.status(404).json({ error: 'Test case not found' });
    }

    // 获取 Worker
    const worker = workerManager.getWorker(workerId);
    if (!worker || worker.status !== 'online') {
        return res.status(400).json({ error: 'Worker not available' });
    }

    // 创建分布式任务
    const taskId = crypto.randomUUID();
    const task = {
        id: taskId,
        testCaseId,
        workerId,
        workerName: worker.name,
        runner,
        status: 'dispatched',
        createdAt: Date.now()
    };

    // 通过 WebSocket 分发任务到 Worker
    // ... 实现任务分发逻辑

    res.json({ success: true, taskId, workerId, workerName: worker.name });
});
```

#### 2. 前端节点选择界面（约 1 天）

在 `public/index.html` 中添加节点选择器：

**HTML 部分**:
```html
<!-- 节点选择面板 -->
<div class="panel">
    <h3>🖥️ 执行节点选择</h3>

    <div id="workerSelector" class="worker-selector">
        <label>
            <input type="radio" name="worker" value="auto" checked>
            自动分配（推荐）
        </label>

        <!-- 动态加载 Worker 列表 -->
        <div id="workerList"></div>
    </div>
</div>

<!-- Worker 状态监控面板 -->
<div class="panel">
    <h3>📊 节点状态监控</h3>
    <div id="workerStats" class="worker-stats"></div>
</div>
```

**JavaScript 部分**:
```javascript
// 加载 Worker 列表
async function loadWorkers() {
    const res = await fetch('/api/workers');
    const data = await res.json();

    const workerList = document.getElementById('workerList');
    workerList.innerHTML = '';

    for (const worker of data.workers) {
        const statusClass = worker.status === 'online' ? 'online' :
                          worker.status === 'busy' ? 'busy' : 'offline';

        const disabled = worker.status !== 'online' ? 'disabled' : '';

        workerList.innerHTML += `
            <label class="worker-item ${statusClass}">
                <input type="radio" name="worker"
                       value="${worker.id}" ${disabled}>
                <span class="worker-name">${worker.name}</span>
                <span class="worker-platform">${getPlatformIcon(worker.platform)}</span>
                <span class="worker-status">${getStatusText(worker.status)}</span>
                <span class="worker-cpu">CPU: ${worker.cpuUsage?.toFixed(1) || '-'}%</span>
            </label>
        `;
    }
}

// 提交任务时获取选中的 Worker
function getSelectedWorker() {
    const selected = document.querySelector('input[name="worker"]:checked');
    return selected?.value === 'auto' ? null : selected?.value;
}

// 执行任务
async function runTest(testCaseId, runner) {
    const workerId = getSelectedWorker();

    const res = await fetch('/api/distributed-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            testCaseId,
            workerId: workerId || undefined, // 不指定则自动分配
            runner
        })
    });

    const data = await res.json();

    if (data.success) {
        alert(`任务已分配到: ${data.workerName}`);
    }
}

// WebSocket 实时更新 Worker 状态
ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'worker-status-update') {
        updateWorkerStatus(message.data);
    }
});

// 定期刷新 Worker 列表
setInterval(loadWorkers, 5000);
loadWorkers();
```

**CSS 样式**:
```css
.worker-selector {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.worker-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
}

.worker-item:hover {
    background: #f5f5f5;
}

.worker-item.online {
    border-left: 4px solid #52c41a;
}

.worker-item.busy {
    border-left: 4px solid #faad14;
}

.worker-item.offline {
    border-left: 4px solid #ff4d4f;
    opacity: 0.6;
}

.worker-item[disabled] {
    cursor: not-allowed;
}

.worker-name {
    font-weight: 600;
    flex: 1;
}

.worker-status {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.worker-status.online {
    background: #d4edda;
    color: #155724;
}

.worker-status.busy {
    background: #fff3cd;
    color: #856404;
}

.worker-status.offline {
    background: #f8d7da;
    color: #721c24;
}
```

#### 3. WebSocket 消息中转（约半天）

Master 需要中转 Worker 和前端的消息：

```typescript
// WebSocket 连接管理
const clientConnections = new Map<string, WebSocket>(); // 前端连接
const workerConnections = new Map<string, WebSocket>(); // Worker 连接

wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const workerId = url.searchParams.get('workerId');

    if (workerId) {
        // Worker 连接
        workerConnections.set(workerId, ws);
        console.log(`Worker connected: ${workerId}`);

        ws.on('close', () => {
            workerConnections.delete(workerId);
            console.log(`Worker disconnected: ${workerId}`);
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());

            // 转发 Worker 消息到所有前端客户端
            broadcastToClients(message);
        });
    } else {
        // 前端客户端连接
        const clientId = crypto.randomUUID();
        clientConnections.set(clientId, ws);

        ws.on('close', () => {
            clientConnections.delete(clientId);
        });
    }
});

function broadcastToClients(message: any) {
    for (const ws of clientConnections.values()) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
}

function sendToWorker(workerId: string, message: any) {
    const ws = workerConnections.get(workerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
```

---

## 🚀 使用指南

### 部署步骤

#### Step 1: 在服务器上启动 Master 节点

```bash
# 在电脑 A (假设 IP: 192.168.1.100)
cd benchmark
npm install
npm run build

# 启动 Master 模式（默认）
npm start

# 服务器会在 http://192.168.1.100:3000 上运行
```

#### Step 2: 在各台电脑上启动 Worker 节点

**电脑 B (Windows)**:
```bash
cd benchmark
npm install
npm run build

# 设置环境变量并启动
set WORKER_MODE=true
set MASTER_URL=http://192.168.1.100:3000
set WORKER_NAME=Windows-PC-1
set WORKER_TAGS=production,windows

# 运行 Worker
npx tsx server/worker-client.ts
```

**电脑 C (macOS)**:
```bash
cd benchmark
npm install
npm run build

# 启动 Worker
WORKER_MODE=true \
MASTER_URL=http://192.168.1.100:3000 \
WORKER_NAME=macOS-MBP \
WORKER_TAGS=production,macos \
npx tsx server/worker-client.ts
```

**电脑 D (Linux)**:
```bash
cd benchmark
npm install
npm run build

# 启动 Worker
WORKER_MODE=true \
MASTER_URL=http://192.168.1.100:3000 \
WORKER_NAME=Linux-Server \
WORKER_TAGS=production,linux \
npx tsx server/worker-client.ts
```

#### Step 3: 在浏览器中访问 Master

1. 打开浏览器访问: `http://192.168.1.100:3000`
2. 在"执行节点选择"面板中查看所有已连接的 Worker
3. 创建或选择测试用例
4. 选择要执行的 Worker 节点
5. 点击"运行"按钮
6. 实时查看执行状态和日志

---

## 📝 开发任务清单

### Phase 1: Master 服务器扩展（优先）

- [ ] 在 `server/index.ts` 中集成 Worker 管理器
- [ ] 添加 Worker 注册/注销 API
- [ ] 添加心跳接收 API
- [ ] 实现分布式任务创建 API
- [ ] 实现 WebSocket 消息中转
- [ ] 添加任务状态更新 API

### Phase 2: 前端界面开发

- [ ] 创建节点选择器组件
- [ ] 添加节点状态监控面板
- [ ] 实现实时状态更新
- [ ] 添加节点详情查看
- [ ] 创建分布式任务历史页面

### Phase 3: 测试和优化

- [ ] 本地多 Worker 测试
- [ ] 跨网络测试
- [ ] 故障恢复测试
- [ ] 性能优化
- [ ] 文档完善

---

## 🎯 预期效果

完成后，您将能够：

1. **在多台电脑上部署 Worker** - 支持 Windows/macOS/Linux
2. **实时查看所有节点状态** - 在线/离线/执行中
3. **自由选择执行节点** - 指定或自动分配
4. **实时监控任务执行** - 日志、进度、状态
5. **查看执行历史** - 哪台电脑执行了哪些任务

---

## 💡 实现建议

### 快速原型（1-2天）

如果您想快速验证概念，可以先实现最小可用版本：

1. **简化的 Worker 管理**
   - 只实现注册和心跳
   - 不实现自动离线检测

2. **简化的任务分发**
   - 只支持手动指定 Worker
   - 不实现任务队列

3. **简化的前端**
   - 只显示 Worker 列表
   - 只支持选择 Worker

### 完整实现（1-2周）

按照本文档的完整方案实现所有功能。

---

## 📞 需要帮助？

如果在实现过程中遇到问题，请参考：

- [DISTRIBUTED_ARCHITECTURE.md](DISTRIBUTED_ARCHITECTURE.md) - 完整架构设计
- [server/types.ts](server/types.ts) - 类型定义
- [server/worker-manager.ts](server/worker-manager.ts) - Worker 管理实现
- [server/worker-client.ts](server/worker-client.ts) - Worker 客户端实现

---

**下一步**: 我可以帮您完成 Master 服务器的 API 扩展，或者先创建一个简化的原型验证可行性？
