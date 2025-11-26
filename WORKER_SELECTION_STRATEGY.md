# Worker 选择策略说明

## 概述

系统已实现**智能默认 Worker 选择策略**，确保测试在未明确指定 Worker 时能够自动选择最合适的执行节点。

## 默认选择规则

### 优先级

当用户未明确选择 Worker 时（或选择"本地执行"），系统按以下优先级自动选择：

1. **中配 Worker (medium)** - 首选
2. **低配 Worker (low)** - 备选1
3. **高配 Worker (high)** - 备选2
4. **自定义配置 Worker (custom)** - 备选3
5. **任意在线 Worker** - 最后备选
6. **本地执行** - 无可用 Worker 时

### 设计理念

- **中配优先**：中等性能机器通常数量最多、资源适中、稳定性好
- **低配次之**：低配机器适合兼容性测试，避免浪费高配资源
- **高配最后**：高配机器通常用于性能压测等特殊场景，不应用于常规测试

## 应用场景

### 1. 单个测试执行

**位置**: `public/index.html` - `runCase()` 函数

**行为**:
```javascript
// 用户点击"运行测试"按钮，未选择 Worker
// 系统自动选择中配 Worker（如果可用）
```

**日志输出**:
```
[系统] 🎯 自动选择中配Worker: 中配测试机-1
[系统] 🌐 使用分布式执行，目标节点: worker_xxx
```

**备选情况**:
```
[系统] ⚠️ 无中配Worker，使用备选: 低配测试机-1
```

### 2. 批量测试分发

**位置**: `public/batch-dispatcher.js` - `dispatchSingleCase()` 方法

**行为**:
- 用户选择"自动分配 - 优先中配 (推荐)"策略
- 系统为每个测试用例自动选择中配 Worker

**日志输出**:
```
[BatchDispatcher] 🎯 默认选择中配Worker: 中配测试机-1
```

**备选情况**:
```
[BatchDispatcher] ⚠️ 无中配Worker，使用备选: 低配测试机-1 (low)
```

## 用户控制

### 明确指定 Worker

用户可以通过以下方式明确指定 Worker：

1. **单个测试**: 在 Worker 选择下拉框中选择特定节点
2. **批量测试**: 在批量分发模态框中选择"指定 Worker"策略

### 强制本地执行

用户可以强制使用本地执行：

1. **单个测试**:
   - 选择"本地执行"（如果没有在线 Worker）
   - 或者删除所有 Worker 节点

2. **批量测试**: 选择"本地执行"策略

## 实现细节

### 代码位置

#### 单个测试执行
**文件**: `public/index.html`
**函数**: `runCase(id, testLabel = '')`
**行号**: 约 3226-3252

```javascript
// 检查是否选择了 Worker 节点
let selectedWorkerId = workerSelector ? workerSelector.getSelectedWorkerId() : null;

// 🆕 默认中端性能机器：如果未选择Worker，自动选择中配Worker
if (!selectedWorkerId || selectedWorkerId === 'local') {
    const workers = workerSelector ? workerSelector.getOnlineWorkers() : [];
    if (workers.length > 0) {
        // 优先选择中配Worker
        const mediumWorker = workers.find(w => w.performanceTier === 'medium');
        if (mediumWorker) {
            selectedWorkerId = mediumWorker.id;
            console.log(`[RunCase] 🎯 未选择Worker，默认使用中配Worker: ${mediumWorker.name}`);
            appendOutput(`[系统] 🎯 自动选择中配Worker: ${mediumWorker.name}`);
        } else {
            // 如果没有中配，按优先级选择：low > high > custom
            const lowWorker = workers.find(w => w.performanceTier === 'low');
            const highWorker = workers.find(w => w.performanceTier === 'high');
            const fallbackWorker = lowWorker || highWorker || workers[0];

            if (fallbackWorker) {
                selectedWorkerId = fallbackWorker.id;
                console.log(`[RunCase] ⚠️ 无中配Worker，使用备选: ${fallbackWorker.name} (${fallbackWorker.performanceTier})`);
                appendOutput(`[系统] ⚠️ 无中配Worker，使用备选: ${fallbackWorker.name}`);
            }
        }
    }
}
```

#### 批量测试分发
**文件**: `public/batch-dispatcher.js`
**函数**: `dispatchSingleCase(caseId, workerId, strategy)`
**行号**: 约 312-333

```javascript
// 🆕 默认中端性能机器：如果strategy是'auto'且没有指定workerId，优先选择中配Worker
if (strategy === 'auto' && !workerId) {
    const workers = window.workerSelector?.getOnlineWorkers() || [];
    if (workers.length > 0) {
        // 优先选择中配Worker
        const mediumWorker = workers.find(w => w.performanceTier === 'medium');
        if (mediumWorker) {
            workerId = mediumWorker.id;
            console.log(`[BatchDispatcher] 🎯 默认选择中配Worker: ${mediumWorker.name}`);
        } else {
            // 如果没有中配，按优先级选择：low > high > custom
            const lowWorker = workers.find(w => w.performanceTier === 'low');
            const highWorker = workers.find(w => w.performanceTier === 'high');
            const fallbackWorker = lowWorker || highWorker || workers[0];

            if (fallbackWorker) {
                workerId = fallbackWorker.id;
                console.log(`[BatchDispatcher] ⚠️ 无中配Worker，使用备选: ${fallbackWorker.name} (${fallbackWorker.performanceTier})`);
            }
        }
    }
}
```

## 测试验证

### 场景1: 有中配 Worker

**前提条件**:
- 至少有一个中配 Worker 在线

**操作步骤**:
1. 打开前端页面
2. 选择一个测试用例
3. 不选择 Worker（或选择"本地执行"）
4. 点击"运行测试"

**预期结果**:
```
[系统] 🎯 自动选择中配Worker: 中配测试机-1
[系统] 🌐 使用分布式执行，目标节点: worker_xxx
```

### 场景2: 无中配 Worker，有其他配置

**前提条件**:
- 没有中配 Worker 在线
- 有低配或高配 Worker 在线

**操作步骤**:
1. 打开前端页面
2. 选择一个测试用例
3. 不选择 Worker
4. 点击"运行测试"

**预期结果**:
```
[系统] ⚠️ 无中配Worker，使用备选: 低配测试机-1
[系统] 🌐 使用分布式执行，目标节点: worker_xxx
```

### 场景3: 批量分发

**前提条件**:
- 至少有一个中配 Worker 在线

**操作步骤**:
1. 打开前端页面
2. 选择多个测试用例（勾选复选框）
3. 点击"批量分发"按钮
4. 选择"自动分配 - 优先中配 (推荐)"
5. 点击"开始分发"

**预期结果**:
- 控制台输出: `[BatchDispatcher] 🎯 默认选择中配Worker: 中配测试机-1`
- 所有测试分发到中配 Worker

## 配置建议

### Worker 部署建议

为了充分利用默认选择策略，建议按以下方式部署 Worker：

1. **中配 Worker**: 2-4 台
   - 适合日常测试、回归测试
   - CPU: 4-8 核
   - 内存: 8-16 GB

2. **低配 Worker**: 1-2 台
   - 适合兼容性测试、轻量级测试
   - CPU: 2-4 核
   - 内存: 4-8 GB

3. **高配 Worker**: 1-2 台
   - 适合性能压测、大规模测试
   - CPU: 16+ 核
   - 内存: 32+ GB

### 环境变量配置示例

**中配 Worker**:
```bash
export PERFORMANCE_TIER="medium"
export WORKER_NAME="中配测试机-1"
export WORKER_DESCRIPTION="中等性能工作站 - 8核16GB"
```

**低配 Worker**:
```bash
export PERFORMANCE_TIER="low"
export WORKER_NAME="低配测试机-1"
export WORKER_DESCRIPTION="低配测试机 - 4核8GB"
```

**高配 Worker**:
```bash
export PERFORMANCE_TIER="high"
export WORKER_NAME="高配测试机-1"
export WORKER_DESCRIPTION="高性能工作站 - 32核64GB"
```

## FAQ

### Q: 为什么默认选择中配而不是高配？

**A**: 高配机器通常数量少、成本高，应该保留用于性能压测等特殊场景。中配机器资源适中、数量多、稳定性好，更适合日常测试。

### Q: 如果我想默认使用高配怎么办？

**A**: 有两种方式：
1. 在前端手动选择高配 Worker
2. 修改代码中的优先级顺序（`batch-dispatcher.js` 和 `index.html`）

### Q: 如果没有任何在线 Worker 会怎样？

**A**: 系统会回退到本地执行模式。

### Q: 批量分发时，会为每个测试都选择同一个 Worker 吗？

**A**: 是的。在"自动分配"模式下，所有测试会优先分配到同一个中配 Worker。如果需要负载均衡，可以使用"指定 Worker"策略手动分配。

### Q: 这个策略会影响已经在运行的测试吗？

**A**: 不会。这个策略仅在新测试启动时生效，不影响已经在运行的测试。

## 总结

默认中配 Worker 选择策略提供了：

- **智能化**: 自动选择最合适的执行节点
- **用户友好**: 无需手动选择，减少操作步骤
- **资源优化**: 合理分配测试资源，避免浪费高配机器
- **可控性**: 用户仍可手动指定 Worker 或强制本地执行

这个策略特别适合团队协作场景，让测试人员专注于测试本身，而不是节点选择。
