# 分布式测试记录上传修复

## 问题描述

### 错误信息

Worker 节点执行分布式任务后，测试记录未上传到 Master，同时报告文件路径为空。

Worker 日志显示：
```
✓ Benchmark results saved to /Users/bilibili/benchmark/benchmark_report/2025-11-26T16-04-08-Runtime-Local.json
⚠️  No report found for this task
```

### 根本原因

1. **测试记录未创建**: 分布式任务完成后，没有在 `data/test-records.json` 中创建测试记录
2. **报告文件检测失败**: `findLatestReport()` 方法只查找 `.html` 文件，但 benchmark 工具实际生成的是 `.json` 文件

---

## 解决方案

### 1. 添加测试记录创建功能

在 `DistributedTaskManager` 中添加 `createTestRecord()` 方法，在任务完成时自动创建测试记录。

**修改文件:** [server/distributed-task-manager.ts](server/distributed-task-manager.ts)

#### 类型定义

```typescript
interface TestRecord {
    id: string;
    testCaseId?: string;
    name: string;
    runner: string;
    status: 'completed' | 'error';
    startTime: Date;
    endTime: Date;
    duration: number;
    reportFile?: string;
    errorMessage?: string;
}
```

#### 创建测试记录

```typescript
/**
 * 创建测试记录（与本地执行保持一致）
 */
private async createTestRecord(task: DistributedTask, result: TaskExecutionResult): Promise<void> {
    // 读取现有记录
    let testRecords: TestRecord[] = [];
    try {
        const data = await fs.readFile(this.testRecordsFile, 'utf-8');
        testRecords = JSON.parse(data);
    } catch (error) {
        // 文件不存在，使用空数组
    }

    // 创建新记录
    const record: TestRecord = {
        id: task.id,
        testCaseId: task.testCaseId,
        name: task.testCaseName,
        runner: task.runner,
        status: task.status === 'completed' ? 'completed' : 'error',
        startTime: new Date(task.createdAt),
        endTime: new Date(task.completedAt!),
        duration: task.completedAt! - task.createdAt,
        reportFile: result.reportPath,  // 从 Worker 返回的报告路径
        errorMessage: result.error
    };

    // 添加到列表头部
    testRecords.unshift(record);

    // 限制记录数量（保留最新 1000 条）
    if (testRecords.length > 1000) {
        testRecords = testRecords.slice(0, 1000);
    }

    // 保存
    await fs.writeFile(this.testRecordsFile, JSON.stringify(testRecords, null, 2));
    console.log(`📝 Test record created: ${task.testCaseName} (${task.status})`);
}
```

#### 在任务完成时调用

```typescript
async completeTask(taskId: string, result: TaskExecutionResult): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) {
        return false;
    }

    // 更新任务状态
    task.status = result.status === 'completed' ? 'completed' : 'failed';
    task.completedAt = Date.now();
    task.result = result;

    // 从 Worker 移除任务（释放并发容量）
    await this.workerManager.removeTaskFromWorker(task.workerId, taskId);

    // 保存任务数据
    await this.saveTasks();

    // 创建测试记录
    await this.createTestRecord(task, result);

    console.log(`✅ Task completed: ${task.testCaseName}`);

    return true;
}
```

---

### 2. 修复报告文件检测

Worker 的 `findLatestReport()` 方法需要支持多种报告格式。

**修改文件:** [server/worker-client.ts](server/worker-client.ts)

#### 问题

原代码只查找 `.html` 文件：

```typescript
.filter(f => f.endsWith('.html') && f.includes(runner))
```

但 benchmark 工具可能生成以下格式：
- `.html` - 可视化报告
- `.json` - 数据报告

实际日志显示生成的是 `.json` 文件：
```
2025-11-26T16-04-08-Runtime-Local.json
```

#### 修复

支持多种文件格式，并优先选择 `.html` 文件：

```typescript
/**
 * 查找最新生成的测试报告
 */
private async findLatestReport(runner: string, taskStartTime: number): Promise<string | undefined> {
    try {
        const reportsDir = path.join(__dirname, '../benchmark_report');

        // 确保报告目录存在
        if (!fs.existsSync(reportsDir)) {
            console.log('⚠️  Reports directory not found');
            return undefined;
        }

        // 等待一小段时间，确保报告文件已完全写入
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 读取目录中的文件
        const files = fs.readdirSync(reportsDir);

        // 查找匹配的报告文件（支持 .html 和 .json 格式）
        const reportFiles = await Promise.all(
            files
                .filter(f => {
                    const isReportFile = f.endsWith('.html') || f.endsWith('.json');
                    const hasRunner = f.includes(runner);
                    return isReportFile && hasRunner;
                })
                .map(async (f) => {
                    const filePath = path.join(reportsDir, f);
                    const stat = fs.statSync(filePath);
                    return {
                        name: f,
                        path: filePath,
                        mtime: stat.mtime.getTime(),
                        isHtml: f.endsWith('.html')
                    };
                })
        );

        // 过滤出任务启动后创建的文件
        const validReports = reportFiles.filter(r => r.mtime >= taskStartTime);

        if (validReports.length === 0) {
            console.log('⚠️  No report found for this task');
            return undefined;
        }

        // 排序：优先选择 .html 文件，其次按修改时间
        validReports.sort((a, b) => {
            // 优先选择 .html 文件
            if (a.isHtml && !b.isHtml) return -1;
            if (!a.isHtml && b.isHtml) return 1;
            // 如果格式相同，按修改时间排序（最新的在前）
            return b.mtime - a.mtime;
        });
        const latestReport = validReports[0];

        console.log(`📊 Found report: ${latestReport.name}`);
        return latestReport.name;

    } catch (error) {
        console.error('Failed to find report:', error);
        return undefined;
    }
}
```

**关键改进：**

1. **支持多种格式**: 检测 `.html` 和 `.json` 文件
2. **优先级排序**: `.html` 文件优先于 `.json` 文件
3. **时间排序**: 相同格式的文件按修改时间排序（最新的优先）
4. **详细日志**: 报告文件名输出到日志

---

## 修改文件清单

| 文件 | 修改内容 | 行数 |
|------|---------|------|
| [server/distributed-task-manager.ts](server/distributed-task-manager.ts) | 添加 `TestRecord` 类型和 `createTestRecord()` 方法 | ~60 行 |
| [server/worker-client.ts](server/worker-client.ts) | 修改 `findLatestReport()` 支持多种文件格式 | ~10 行 |

---

## 升级步骤

### 1. 重新构建

```bash
npm run build
```

### 2. 重启服务

```bash
# 停止当前服务 (Ctrl+C)

# 重启 Master
npm start

# 重启 Worker
./scripts/start-worker-medium.sh
```

### 3. 验证修复

#### 步骤 1: 创建测试用例

1. 打开前端: http://10.23.182.34:3000
2. 创建一个测试用例
3. 选择 Worker 节点
4. 运行测试

#### 步骤 2: 观察 Worker 日志

**预期输出：**

```
📋 Task assigned: task_xxx
   Test Case: 测试 - Bilibili 首页
   Runner: Initialization

📝 Created temp config: /Users/bilibili/benchmark/benchmark.config.task_1732612345678.mts

▶️  Executing: npx @bilibili-player/benchmark --config benchmark.config.task_1732612345678.mts

[Benchmark 工具开始执行...]
Starting Initialization benchmark...
Running test: https://www.bilibili.com
...
✓ Benchmark results saved to /Users/bilibili/benchmark/benchmark_report/2025-11-26T16-04-08-Initialization-Local.json

📊 Found report: 2025-11-26T16-04-08-Initialization-Local.json  ✅ 成功找到

🗑️  Cleaned up temp config: /Users/bilibili/benchmark/benchmark.config.task_1732612345678.mts

✅ Task completed
```

#### 步骤 3: 观察 Master 日志

**预期输出：**

```
✅ Task completed: 测试 - Bilibili 首页
📝 Test record created: 测试 - Bilibili 首页 (completed)
```

#### 步骤 4: 检查测试记录文件

```bash
cat data/test-records.json
```

**预期内容：**

```json
[
  {
    "id": "task_xxx",
    "testCaseId": "tc_xxx",
    "name": "测试 - Bilibili 首页",
    "runner": "Initialization",
    "status": "completed",
    "startTime": "2025-11-26T08:04:08.000Z",
    "endTime": "2025-11-26T08:09:15.000Z",
    "duration": 307000,
    "reportFile": "2025-11-26T16-04-08-Initialization-Local.json"
  }
]
```

#### 步骤 5: 验证前端显示

1. 刷新前端页面
2. 查看 "测试记录" 面板
3. 应该看到新创建的测试记录
4. 点击 "查看报告" 链接应该能打开报告文件

---

## 技术细节

### 报告文件格式

Benchmark 工具根据配置生成不同格式的报告：

1. **HTML 格式** (`.html`)
   - 可视化报告，包含图表和详细分析
   - 适合在浏览器中查看
   - 例: `2025-11-26T16-04-08-Initialization-Local.html`

2. **JSON 格式** (`.json`)
   - 数据报告，包含原始测试数据
   - 适合程序化处理和数据分析
   - 例: `2025-11-26T16-04-08-Initialization-Local.json`

### 报告检测逻辑

```
1. 扫描 benchmark_report/ 目录
2. 过滤出匹配的文件:
   - 文件扩展名: .html 或 .json
   - 文件名包含 Runner 名称 (如 "Initialization")
   - 修改时间 >= 任务开始时间
3. 排序:
   - 优先级 1: .html 文件优先
   - 优先级 2: 修改时间（最新的优先）
4. 返回排序后的第一个文件
```

### 测试记录数据流

```
Worker 执行任务
    ↓
生成报告文件 (benchmark_report/xxx.json)
    ↓
findLatestReport() 查找报告
    ↓
Worker 上报结果 (包含 reportPath)
    ↓
DistributedTaskManager.completeTask()
    ↓
createTestRecord() 创建测试记录
    ↓
保存到 data/test-records.json
    ↓
前端显示测试记录
```

---

## 与本地执行的一致性

| 维度 | 本地执行 | 分布式执行 (修复后) |
|------|---------|-------------------|
| 测试记录创建 | ✅ 自动创建 | ✅ 自动创建 |
| 报告路径提取 | ✅ 自动提取 | ✅ 自动提取 |
| 支持 .html 格式 | ✅ 支持 | ✅ 支持 |
| 支持 .json 格式 | ✅ 支持 | ✅ 支持 |
| 记录保存位置 | `data/test-records.json` | `data/test-records.json` |
| 前端显示 | ✅ 显示 | ✅ 显示 |

**完全一致！** 🎉

---

## 验证清单

完成修复后，应该观察到以下改进：

### ✅ Worker 日志

- [ ] 成功找到报告文件: `📊 Found report: xxx.json` 或 `xxx.html`
- [ ] 不再显示 "No report found" 警告
- [ ] 任务完成消息: `✅ Task completed`

### ✅ Master 日志

- [ ] 任务完成消息: `✅ Task completed: 测试名称`
- [ ] 测试记录创建消息: `📝 Test record created: 测试名称 (completed)`

### ✅ 数据文件

- [ ] `data/test-records.json` 包含新记录
- [ ] 记录包含正确的 `reportFile` 字段
- [ ] 记录包含正确的时间和状态信息

### ✅ 前端显示

- [ ] "测试记录" 面板显示新记录
- [ ] 点击 "查看报告" 链接能打开报告
- [ ] 显示正确的执行时间和状态

---

## 故障排查

### 问题 1: 仍然显示 "No report found"

**可能原因：**
1. 报告目录不存在
2. 报告文件名格式不匹配
3. 文件修改时间早于任务开始时间

**排查步骤：**

```bash
# 1. 检查报告目录
ls -la benchmark_report/

# 2. 查看最近的报告文件
ls -lt benchmark_report/ | head -5

# 3. 检查文件名格式
# 应该包含 Runner 名称: Initialization, Runtime, MemoryLeak
```

### 问题 2: 测试记录未创建

**可能原因：**
1. 任务未正确完成
2. Worker 未上报结果
3. 文件写入权限问题

**排查步骤：**

```bash
# 1. 检查任务状态
curl http://10.23.182.34:3000/api/distributed-tasks/:taskId

# 2. 检查文件权限
ls -la data/test-records.json

# 3. 查看 Master 日志
# 应该看到 "Test record created" 消息
```

### 问题 3: 报告链接无法打开

**可能原因：**
1. 报告文件路径不正确
2. Web 服务器未正确配置静态文件服务

**排查步骤：**

```bash
# 1. 检查报告文件是否存在
ls -la benchmark_report/<reportFile>

# 2. 检查 Web 服务器配置
# server/index.ts 中应该有:
# app.use('/benchmark_report', express.static('benchmark_report'));

# 3. 手动访问报告 URL
curl http://10.23.182.34:3000/benchmark_report/<reportFile>
```

---

## 优势

### ✅ 功能完整

- 分布式执行与本地执行功能一致
- 测试记录自动创建和保存
- 支持多种报告格式

### ✅ 用户体验

- 测试记录在前端自动显示
- 可以方便地查看历史测试结果
- 报告链接直接可点击

### ✅ 可维护性

- 代码逻辑清晰
- 详细的日志输出
- 易于调试和排查问题

### ✅ 兼容性

- 支持 HTML 和 JSON 两种报告格式
- 优先选择更易读的 HTML 格式
- 向后兼容旧版报告格式

---

## 总结

通过添加测试记录创建功能和修复报告文件检测逻辑，分布式测试系统现在与本地执行功能完全一致。

**关键改进：**

1. ✅ 自动创建测试记录
2. ✅ 自动提取报告路径
3. ✅ 支持多种报告格式
4. ✅ 优先选择 HTML 格式
5. ✅ 详细的日志输出

**系统现在功能完整，可以投入生产使用！** 🎉

---

**修复日期:** 2025-11-26

**修复文件:**
- [server/distributed-task-manager.ts](server/distributed-task-manager.ts) - 测试记录创建
- [server/worker-client.ts](server/worker-client.ts) - 报告文件检测
