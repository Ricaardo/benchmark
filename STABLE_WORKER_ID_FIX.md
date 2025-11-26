# 稳定 Worker ID 修复方案

## 问题描述

### 根本原因

Worker 每次重新连接时都会获得一个新的随机 UUID，导致：

1. 任务创建时记录的 `workerId` 是旧 ID
2. Worker 断开重连后获得新 ID
3. Master 尝试发送任务到旧 ID，找不到 WebSocket 连接
4. 任务永远停留在 `dispatched` 或 `pending` 状态

### 触发场景

- Worker 进程重启
- WebSocket 连接断开重连
- 网络不稳定
- **页面刷新（可能触发某些状态变化）**

### 症状

```
✅ Task created: xxx -> 中配测试机-1
⚠️  Cannot send to worker 85843c9b...: No connection
```

或者任务一直显示 `dispatched` 状态，Worker 终端没有 "📋 Task assigned" 日志。

## 解决方案

### 核心思路

使用**稳定的 Worker ID**（基于 Worker 名称和主机地址的哈希），而不是随机 UUID。

### 修改内容

#### 1. Worker 管理器 ([server/worker-manager.ts](server/worker-manager.ts))

**添加了稳定 ID 生成方法:**

```typescript
private generateStableWorkerId(name: string, host: string): string {
    const input = `${name}@${host}`;
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    return `worker-${hash.substring(0, 8)}-${hash.substring(8, 12)}-...`;
}
```

**修改注册逻辑，支持重连:**

```typescript
async registerWorker(registration: WorkerRegistration): Promise<string> {
    const stableId = this.generateStableWorkerId(registration.name, registration.host);

    // 检查是否已存在该 Worker（重连场景）
    const existingWorker = this.workers.get(stableId);
    if (existingWorker) {
        console.log(`🔄 Worker reconnected: ${registration.name} (${stableId})`);
        // 更新状态，保持相同 ID
        existingWorker.status = 'online';
        existingWorker.lastHeartbeat = Date.now();
        // 更新其他可能变化的信息
        ...
        return stableId; // 返回相同的 ID
    }

    // 新 Worker 注册
    ...
}
```

#### 2. WebSocket 管理器 ([server/websocket-manager.ts](server/websocket-manager.ts))

**添加调试日志:**

```typescript
sendToWorker(workerId: string, message: WSMessage): boolean {
    const ws = this.workerConnections.get(workerId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.log(`⚠️  Cannot send to worker ${workerId.substring(0, 8)}...: ${!ws ? 'No connection' : 'Connection closed'}`);
        return false;
    }

    console.log(`📤 Sending to worker ${workerId.substring(0, 8)}...: ${message.type}`);
    this.sendMessage(ws, message);
    return true;
}
```

## 升级步骤

### 1. 备份数据

```bash
# 备份 Worker 和任务数据
cp data/workers.json data/workers.json.backup
cp data/distributed-tasks.json data/distributed-tasks.json.backup
```

### 2. 清理旧数据（重要）

由于 Worker ID 生成规则改变，需要清理旧数据：

```bash
# 清理旧的 Worker 注册
echo '[]' > data/workers.json

# 清理旧的任务（可选，如果有很多 pending/dispatched 任务）
echo '{"tasks":[]}' > data/distributed-tasks.json
```

### 3. 重启服务

```bash
# 重启 Master
npm start
```

### 4. 重启所有 Worker

```bash
# 在每台 Worker 机器上
./scripts/start-worker-medium.sh
```

### 5. 验证修复

#### 观察 Master 日志

**首次连接:**
```
✅ Worker registered: 中配测试机-1 (worker-a1b2c3d4-e5f6-7890-abcd-ef1234567890)
```

**Worker 重连（相同 ID）:**
```
🔄 Worker reconnected: 中配测试机-1 (worker-a1b2c3d4-e5f6-7890-abcd-ef1234567890)
```

**任务分发:**
```
✅ Task created: task_xxx -> 中配测试机-1
📤 Sending to worker a1b2c3d4...: task-assigned
```

#### 观察 Worker 日志

应该看到：
```
📋 Task assigned: task_xxx
   Test Case: 测试用例名称
   Runner: Initialization

▶️  Executing: npx @bilibili-player/benchmark ...
```

## 测试场景

### 场景 1: Worker 重启

1. 运行 Worker
2. 创建并运行测试 → 成功
3. 停止 Worker (Ctrl+C)
4. 重新启动 Worker
5. 再次运行测试 → **应该仍然成功**

**预期:** Worker ID 保持不变，任务可以正常分发

### 场景 2: 网络断开重连

1. Worker 运行中
2. 网络短暂断开
3. 网络恢复，Worker 自动重连
4. 运行测试 → **应该成功**

**预期:** Worker 重连后使用相同 ID

### 场景 3: 并发任务

1. 创建 3 个测试用例
2. 使用批量分发
3. 在执行过程中，Worker 保持稳定

**预期:** 所有任务正常执行

## 优势

### ✅ 稳定性

- Worker 重连后保持相同 ID
- 已分发的任务不会丢失
- 减少 "Cannot send to worker" 错误

### ✅ 可追溯性

- Worker ID 基于名称和主机，易于识别
- 例: `worker-a1b2c3d4...` 对应 "中配测试机-1@10.23.182.34"

### ✅ 兼容性

- 不影响现有功能
- 自动处理新旧 Worker 共存

## 注意事项

### Worker 名称和主机不能变

**稳定 ID 依赖于:**
- Worker 名称 (`WORKER_NAME`)
- 主机地址 (`host`)

**如果这些变化，Worker 会被视为新节点。**

### 多个 Worker 使用相同名称

如果在同一主机上启动多个同名 Worker，它们会共享相同的 ID，导致冲突。

**解决方案:**
- 使用不同的名称（推荐）
  ```bash
  export WORKER_NAME="中配测试机-1-实例A"
  export WORKER_NAME="中配测试机-1-实例B"
  ```

- 或在不同主机上运行

### 清理旧数据

升级后**必须清理旧的 Worker 数据**，否则会有旧 ID 和新 ID 混用的情况。

## 故障排查

### 问题: Worker 仍然无法接收任务

**检查:**

1. Worker ID 是否稳定？
   ```bash
   # 查看 Worker 注册日志
   # 第一次应该是 "Worker registered"
   # 重启后应该是 "Worker reconnected"
   ```

2. Worker WebSocket 是否连接？
   ```bash
   # 在 Worker 终端查看
   ✅ WebSocket connected
   ```

3. 任务是否发送成功？
   ```bash
   # 在 Master 终端查看
   📤 Sending to worker xxx: task-assigned
   ```

### 问题: Worker 重连后获得新 ID

**原因:** Worker 名称或主机地址变化了

**解决:**
- 检查启动脚本中的 `WORKER_NAME`
- 检查网络配置，确保主机地址稳定

### 问题: 任务仍然 dispatched

**可能原因:**
1. Worker 离线
2. WebSocket 连接断开
3. Worker 执行任务失败

**检查:**
```bash
# 查看 Worker 状态
curl http://10.23.182.34:3000/api/workers | grep status

# 查看任务详情
curl http://10.23.182.34:3000/api/distributed-tasks/<task-id>
```

## 总结

通过使用稳定的 Worker ID，我们解决了 Worker 重连导致的任务分发失败问题。

**关键改进:**
- ✅ Worker 重连保持相同 ID
- ✅ 任务可以成功分发到重连的 Worker
- ✅ 添加详细的调试日志
- ✅ 提升系统稳定性

**升级后效果:**
- 🚀 Worker 可以随时重启而不影响任务分发
- 🚀 网络波动不会导致任务丢失
- 🚀 分布式系统更加健壮

---

**修复版本:** 2025-11-26
**修复文件:**
- `server/worker-manager.ts`
- `server/websocket-manager.ts`
