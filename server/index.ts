import express from 'express';
import cors from 'cors';
import { exec, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// API密钥管理
let apiKeys: string[] = [];
const apiKeysFile = path.join(__dirname, '../api-keys.json');

// Webhook配置
let webhookUrl = '';
const webhookConfigFile = path.join(__dirname, '../webhook-config.json');

// 加载API密钥
async function loadApiKeys() {
    try {
        const data = await fs.readFile(apiKeysFile, 'utf-8');
        apiKeys = JSON.parse(data);
    } catch {
        apiKeys = [];
    }
}

// 保存API密钥
async function saveApiKeys() {
    await fs.writeFile(apiKeysFile, JSON.stringify(apiKeys, null, 2));
}

// 加载Webhook配置
async function loadWebhookConfig() {
    try {
        const data = await fs.readFile(webhookConfigFile, 'utf-8');
        const config = JSON.parse(data);
        webhookUrl = config.webhookUrl || '';
    } catch {
        webhookUrl = '';
    }
}

// 保存Webhook配置
async function saveWebhookConfig() {
    await fs.writeFile(webhookConfigFile, JSON.stringify({ webhookUrl }, null, 2));
}

// 生成新的API密钥
function generateApiKey(): string {
    return 'bm_' + crypto.randomBytes(24).toString('hex');
}

// 验证API密钥中间件
function validateApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({ error: 'Missing API key. Include X-API-Key header.' });
    }

    if (!apiKeys.includes(apiKey)) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    next();
}

// 发送Webhook通知
async function sendWebhook(event: string, data: any) {
    if (!webhookUrl) return;

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'BenchmarkWebRunner/1.0'
            },
            body: JSON.stringify({
                event,
                timestamp: new Date().toISOString(),
                data
            })
        });

        console.log(`Webhook sent: ${event}, status: ${response.status}`);
    } catch (error) {
        console.error('Webhook error:', error);
    }
}

// ==================== 多任务管理系统 ====================

interface Task {
    id: string;
    name: string;
    runner: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    output: string;
    process: ChildProcess | null;
    startTime: Date;
    endTime?: Date;
    config: any;
    killTimeout?: NodeJS.Timeout;
}

// 任务存储
const tasks = new Map<string, Task>();

// 最大并发任务数
const MAX_CONCURRENT_TASKS = 3;

// 获取当前运行中的任务数
function getRunningTasksCount(): number {
    return Array.from(tasks.values()).filter(t => t.status === 'running').length;
}

// WebSocket 连接池
const wsClients = new Set<WebSocket>();

// 广播任务列表更新
function broadcastTaskList() {
    const taskList = Array.from(tasks.values()).map(t => ({
        id: t.id,
        name: t.name,
        runner: t.runner,
        status: t.status,
        startTime: t.startTime,
        endTime: t.endTime,
        outputLength: t.output.length
    }));

    const message = JSON.stringify({
        type: 'tasks',
        data: taskList
    });

    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 广播单个任务状态更新
function broadcastTaskUpdate(taskId: string) {
    const task = tasks.get(taskId);
    if (!task) return;

    const message = JSON.stringify({
        type: 'task_update',
        data: {
            id: task.id,
            name: task.name,
            runner: task.runner,
            status: task.status,
            output: task.output,
            startTime: task.startTime,
            endTime: task.endTime
        }
    });

    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// 输出缓冲区配置
const MAX_OUTPUT_LINES = 10000;
const MAX_OUTPUT_CHARS = 1000000;

// 限制任务输出大小
function appendTaskOutput(taskId: string, data: string) {
    const task = tasks.get(taskId);
    if (!task) return;

    task.output += data;

    // 限制输出大小
    if (task.output.length > MAX_OUTPUT_CHARS) {
        const lines = task.output.split('\n');
        if (lines.length > MAX_OUTPUT_LINES) {
            task.output = '...(earlier output truncated)...\n' +
                lines.slice(-MAX_OUTPUT_LINES).join('\n');
        } else {
            task.output = '...(earlier output truncated)...\n' +
                task.output.slice(-MAX_OUTPUT_CHARS);
        }
    }

    // 广播更新
    broadcastTaskUpdate(taskId);
}

// 创建新任务
function createTask(name: string, runner: string, config: any): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: Task = {
        id: taskId,
        name,
        runner,
        status: 'pending',
        output: '',
        process: null,
        startTime: new Date(),
        config
    };

    tasks.set(taskId, task);

    const runningCount = getRunningTasksCount();
    const pendingCount = Array.from(tasks.values()).filter(t => t.status === 'pending').length;
    console.log(`[TaskManager] 任务已创建: ${name} (ID: ${taskId})`);
    console.log(`[TaskManager] 当前状态 - 运行中: ${runningCount}/${MAX_CONCURRENT_TASKS}, 等待中: ${pendingCount}`);

    broadcastTaskList();

    return taskId;
}

// 启动任务
async function startTask(taskId: string) {
    const task = tasks.get(taskId);
    if (!task) {
        console.log(`[TaskManager] ❌ 任务不存在: ${taskId}`);
        return;
    }

    if (task.status !== 'pending') {
        console.log(`[TaskManager] ⚠️ 任务状态不是 pending: ${task.name} (状态: ${task.status})`);
        return;
    }

    // 检查并发限制
    const runningCount = getRunningTasksCount();
    if (runningCount >= MAX_CONCURRENT_TASKS) {
        console.log(`[TaskManager] ⏳ 并发已满，任务等待: ${task.name} (${runningCount}/${MAX_CONCURRENT_TASKS})`);
        appendTaskOutput(taskId, `[系统] 等待其他任务完成...(当前并发: ${runningCount}/${MAX_CONCURRENT_TASKS})\n`);
        return;
    }

    task.status = 'running';
    console.log(`[TaskManager] ▶️ 启动任务: ${task.name} (${runningCount + 1}/${MAX_CONCURRENT_TASKS})`);
    appendTaskOutput(taskId, `[系统] 任务开始执行: ${task.name}\n`);
    appendTaskOutput(taskId, `[系统] Runner: ${task.runner}\n`);

    try {
        // 生成配置文件
        const tempConfigCode = generateConfig(task.config);
        const tempConfigPath = path.join(__dirname, `../benchmark.config.${taskId}.mts`);
        await fs.writeFile(tempConfigPath, tempConfigCode, 'utf-8');

        // 执行 benchmark
        const command = `npx @bilibili-player/benchmark --config benchmark.config.${taskId}.mts`;
        task.process = exec(command, { cwd: path.join(__dirname, '..') });

        task.process.stdout?.on('data', (data) => {
            appendTaskOutput(taskId, data.toString());
        });

        task.process.stderr?.on('data', (data) => {
            appendTaskOutput(taskId, data.toString());
        });

        task.process.on('close', async (code) => {
            task.status = code === 0 ? 'completed' : 'error';
            task.endTime = new Date();
            task.process = null;

            const statusEmoji = code === 0 ? '✅' : '❌';
            console.log(`[TaskManager] ${statusEmoji} 任务${code === 0 ? '完成' : '失败'}: ${task.name} (退出码: ${code})`);
            appendTaskOutput(taskId, `\n[系统] 任务${code === 0 ? '完成' : '失败'} (退出码: ${code})\n`);

            // 清理配置文件
            try {
                await fs.unlink(tempConfigPath);
            } catch (e) {
                console.error('Failed to delete temp config:', e);
            }

            // 清理超时定时器
            if (task.killTimeout) {
                clearTimeout(task.killTimeout);
                task.killTimeout = undefined;
            }

            broadcastTaskUpdate(taskId);
            broadcastTaskList();

            // 发送 Webhook 通知
            sendWebhook('task_completed', {
                taskId: task.id,
                name: task.name,
                runner: task.runner,
                status: task.status,
                exitCode: code
            });

            // 尝试启动下一个待执行的任务
            const pendingCount = Array.from(tasks.values()).filter(t => t.status === 'pending').length;
            console.log(`[TaskManager] 🔄 检查待执行任务... (等待中: ${pendingCount})`);
            startNextPendingTask();
        });

        task.process.on('error', (error) => {
            appendTaskOutput(taskId, `\n❌ 进程错误: ${error.message}\n`);
            task.status = 'error';
            task.endTime = new Date();
            task.process = null;
            broadcastTaskUpdate(taskId);
            broadcastTaskList();

            // 尝试启动下一个待执行的任务
            startNextPendingTask();
        });

        broadcastTaskUpdate(taskId);
        broadcastTaskList();

    } catch (error) {
        task.status = 'error';
        task.endTime = new Date();
        appendTaskOutput(taskId, `\n❌ 启动失败: ${(error as Error).message}\n`);
        broadcastTaskUpdate(taskId);
        broadcastTaskList();

        // 尝试启动下一个待执行的任务
        startNextPendingTask();
    }
}

// 启动下一个待执行的任务（支持填满并发空位）
function startNextPendingTask() {
    // 获取所有待执行的任务
    const pendingTasks = Array.from(tasks.values())
        .filter(t => t.status === 'pending')
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()); // 按创建时间排序

    // 计算还能启动多少任务
    const availableSlots = MAX_CONCURRENT_TASKS - getRunningTasksCount();

    if (availableSlots <= 0 || pendingTasks.length === 0) {
        return;
    }

    // 启动多个任务填满空位
    const tasksToStart = pendingTasks.slice(0, availableSlots);

    console.log(`[TaskManager] 启动 ${tasksToStart.length} 个待执行任务 (可用空位: ${availableSlots})`);

    tasksToStart.forEach((task, index) => {
        // 延迟启动，避免同时启动导致资源竞争
        setTimeout(() => {
            startTask(task.id);
        }, index * 500); // 每个任务间隔500ms启动
    });
}

// 停止任务
function stopTask(taskId: string, force: boolean = false) {
    const task = tasks.get(taskId);
    if (!task || !task.process) return false;

    try {
        if (force) {
            // 强制停止：立即发送 SIGKILL
            console.log(`[TaskManager] 💥 强制停止任务: ${task.name} (ID: ${taskId})`);
            task.process.kill('SIGKILL');
            appendTaskOutput(taskId, '\n\n💥 任务被强制停止（SIGKILL）\n');
        } else {
            // 优雅停止：先发送 SIGTERM，5秒后如果还没停止则发送 SIGKILL
            console.log(`[TaskManager] ⚠️ 停止任务: ${task.name} (ID: ${taskId})`);
            task.process.kill('SIGTERM');

            task.killTimeout = setTimeout(() => {
                if (task.process && !task.process.killed) {
                    console.warn(`Task ${taskId} did not terminate gracefully, forcing SIGKILL...`);
                    task.process.kill('SIGKILL');
                    appendTaskOutput(taskId, '\n[系统] 进程未响应，已强制终止\n');
                    broadcastTaskUpdate(taskId);
                    broadcastTaskList();
                }
            }, 5000);

            appendTaskOutput(taskId, '\n\n⚠️ 任务被用户停止\n');
        }

        // 立即广播状态更新，让前端及时看到变化
        broadcastTaskUpdate(taskId);
        broadcastTaskList();

        return true;
    } catch (error) {
        console.error('Error stopping task:', error);
        return false;
    }
}

// 删除任务
function deleteTask(taskId: string): boolean {
    const task = tasks.get(taskId);
    if (!task) return false;

    // 如果任务正在运行，先停止
    if (task.status === 'running' && task.process) {
        stopTask(taskId);
    }

    // 清理超时定时器
    if (task.killTimeout) {
        clearTimeout(task.killTimeout);
    }

    tasks.delete(taskId);
    broadcastTaskList();
    return true;
}

// 清理所有已完成的任务
function clearCompletedTasks() {
    const completedIds = Array.from(tasks.values())
        .filter(t => t.status === 'completed' || t.status === 'error')
        .map(t => t.id);

    completedIds.forEach(id => tasks.delete(id));
    broadcastTaskList();

    return completedIds.length;
}

// ==================== 向后兼容的函数 ====================

// 为了兼容旧代码，保留这些函数
let currentBenchmark: ReturnType<typeof exec> | null = null;
let benchmarkStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle';
let benchmarkOutput = '';
let currentRunner = '';

function broadcastStatus() {
    // 使用第一个运行中的任务作为当前状态
    const runningTask = Array.from(tasks.values()).find(t => t.status === 'running');

    if (runningTask) {
        benchmarkStatus = 'running';
        benchmarkOutput = runningTask.output;
        currentRunner = runningTask.runner;
        currentBenchmark = runningTask.process;
    } else {
        const lastTask = Array.from(tasks.values()).sort((a, b) =>
            b.startTime.getTime() - a.startTime.getTime()
        )[0];

        if (lastTask) {
            benchmarkStatus = lastTask.status === 'completed' ? 'completed' :
                            lastTask.status === 'error' ? 'error' : 'idle';
            benchmarkOutput = lastTask.output;
            currentRunner = lastTask.runner;
        } else {
            benchmarkStatus = 'idle';
            benchmarkOutput = '';
            currentRunner = '';
        }
        currentBenchmark = null;
    }

    const statusData = {
        type: 'status',
        data: {
            status: benchmarkStatus,
            output: benchmarkOutput,
            hasProcess: currentBenchmark !== null,
            currentRunner
        }
    };

    const message = JSON.stringify(statusData);

    wsClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function appendOutput(data: string) {
    benchmarkOutput += data;
    broadcastStatus();
}

// 验证URL格式
function isValidURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 验证配置
function validateConfig(config: any, runner: string): { valid: boolean; error?: string } {
    if (!config || !config.runners) {
        return { valid: false, error: '配置格式无效' };
    }

    const runnerConfig = config.runners[runner];

    if (!runnerConfig) {
        return { valid: false, error: `未找到 ${runner} 的配置` };
    }

    if (!runnerConfig.enabled) {
        return { valid: false, error: `${runner} 未启用，请先在配置页面启用` };
    }

    if (!runnerConfig.testCases || runnerConfig.testCases.length === 0) {
        return { valid: false, error: `${runner} 没有配置测试用例` };
    }

    // 验证测试用例
    for (let i = 0; i < runnerConfig.testCases.length; i++) {
        const tc = runnerConfig.testCases[i];
        if (!tc.target) {
            return { valid: false, error: `${runner} 测试用例 #${i + 1} 缺少 URL` };
        }
        if (!isValidURL(tc.target)) {
            return { valid: false, error: `${runner} 测试用例 #${i + 1} URL 格式无效: ${tc.target}` };
        }
        if (!tc.description) {
            return { valid: false, error: `${runner} 测试用例 #${i + 1} 缺少描述` };
        }
    }

    return { valid: true };
}

// 转换前端配置为SDK期望的格式
function transformConfigForSDK(config: any): any {
    const transformed: any = {
        mode: config.mode,
        runners: {}
    };

    if (config.runners) {
        for (const [runnerName, runnerConfig] of Object.entries(config.runners)) {
            const rc = runnerConfig as any;

            // 跳过未启用的runner
            if (rc.enabled === false) {
                continue;
            }

            // 处理 testCases：前端可能发送 testCases 或 urls
            let testCases = rc.testCases;

            if (!testCases || testCases.length === 0) {
                // 如果没有 testCases，尝试从 urls 构建
                const urls = rc.urls || [];
                testCases = urls.map((url: string) => ({
                    target: url,
                    description: url
                }));
            }

            transformed.runners[runnerName] = {
                enabled: true,
                testCases: testCases,
                ...(rc.repeatCount !== undefined && { repeatCount: rc.repeatCount }),
                ...(rc.durationMs !== undefined && { durationMs: rc.durationMs }),
                ...(rc.delayMs !== undefined && { delayMs: rc.delayMs }),
                ...(rc.intervalMs !== undefined && { intervalMs: rc.intervalMs }),
                ...(rc.iterations !== undefined && { iterations: rc.iterations }),
                ...(rc.onPageTesting !== undefined && { onPageTesting: rc.onPageTesting })
            };
        }
    }

    return transformed;
}

// 生成单个testCase的配置字符串
function generateTestCase(tc: any, runnerType: string): string {
    const lines: string[] = [];

    // 基础字段
    lines.push(`target: ${JSON.stringify(tc.target)}`);
    lines.push(`description: ${JSON.stringify(tc.description)}`);

    // TestCase级别的delayMs
    if (tc.delayMs !== undefined) {
        lines.push(`delayMs: ${tc.delayMs}`);
    }

    // Cookie
    if (tc.cookie) {
        if (typeof tc.cookie === 'string') {
            lines.push(`cookie: ${JSON.stringify(tc.cookie)}`);
        } else {
            lines.push(`cookie: ${JSON.stringify(tc.cookie)}`);
        }
    }

    // extraHTTPHeaders
    if (tc.extraHTTPHeaders) {
        lines.push(`extraHTTPHeaders: ${JSON.stringify(tc.extraHTTPHeaders)}`);
    }

    // blockList
    if (tc.blockList) {
        lines.push(`blockList: ${JSON.stringify(tc.blockList)}`);
    }

    // customCss
    if (tc.customCss) {
        lines.push(`customCss: ${JSON.stringify(tc.customCss)}`);
    }

    // deviceOptions
    if (tc.deviceOptions && Array.isArray(tc.deviceOptions)) {
        const [deviceType, options] = tc.deviceOptions;
        if (Object.keys(options || {}).length > 0) {
            lines.push(`deviceOptions: [${JSON.stringify(deviceType)}, ${JSON.stringify(options)}]`);
        } else {
            lines.push(`deviceOptions: [${JSON.stringify(deviceType)}, {}]`);
        }
    }

    // 生命周期钩子
    if (tc.hooks) {
        if (tc.hooks.beforePageLoad) {
            lines.push(`beforePageLoad: async ({ page, context, session }: any) => {\n                        ${tc.hooks.beforePageLoad}\n                    }`);
        }

        if (tc.hooks.onPageLoaded) {
            lines.push(`onPageLoaded: async ({ page, context, session }: any) => {\n                        ${tc.hooks.onPageLoaded}\n                    }`);
        }

        if (tc.hooks.onPageTesting && (runnerType === 'Runtime' || runnerType === 'MemoryLeak')) {
            lines.push(`onPageTesting: async ({ page, context, session }: any) => {\n                        ${tc.hooks.onPageTesting}\n                    }`);
        }

        if (tc.hooks.onPageCollecting && runnerType === 'MemoryLeak') {
            lines.push(`onPageCollecting: async ({ page, context, session }: any) => {\n                        ${tc.hooks.onPageCollecting}\n                    }`);
        }

        if (tc.hooks.onPageUnload) {
            lines.push(`onPageUnload: async ({ page, context, session }: any) => {\n                        ${tc.hooks.onPageUnload}\n                    }`);
        }
    }

    // MemoryLeak特殊处理：如果有旧的onPageTesting字段（向后兼容）
    if (runnerType === 'MemoryLeak' && tc.onPageTesting && !tc.hooks?.onPageTesting) {
        const onPageTestingCode = tc.onPageTesting.trim() || `// 在这里写你怀疑会触发内存泄露的页面操作\n                        // 若为空，则静置页面`;
        lines.push(`onPageTesting: async ({ context, page, session }: any) => {\n                        ${onPageTestingCode}\n                    }`);
    }

    return `                {\n                    ${lines.join(',\n                    ')}\n                }`;
}

// 生成配置文件内容（改进版本）
function generateConfig(config: any): string {
    const mode = config.mode || { anonymous: true, headless: false };
    const { runners } = config;

    // Root级别配置
    const rootOptions: string[] = [];

    // CPU节流
    if (config.cpuThrottlingRate && config.cpuThrottlingRate !== 1) {
        rootOptions.push(`cpuThrottlingRate: ${config.cpuThrottlingRate}`);
    }

    // 本地端口
    if (config.port) {
        rootOptions.push(`port: ${config.port}`);
    }

    // Chrome可执行文件路径
    if (config.executablePath) {
        rootOptions.push(`executablePath: ${JSON.stringify(config.executablePath)}`);
    }

    // 报告路径 - 确保报告保存到benchmark_report目录
    rootOptions.push(`reportPath: 'benchmark_report'`);

    const runnersArray: string[] = [];

    if (runners.Initialization && runners.Initialization.enabled) {
        const { testCases = [], iterations = 7, includeWarmNavigation = false } = runners.Initialization;
        const testCasesStr = testCases.map((tc: any) => generateTestCase(tc, 'Initialization')).join(',\n');

        const initOptions: string[] = [
            `testCases: [\n${testCasesStr}\n            ]`
        ];

        if (iterations !== 7) {
            initOptions.push(`iterations: ${iterations}`);
        }

        if (includeWarmNavigation) {
            initOptions.push(`includeWarmNavigation: ${includeWarmNavigation}`);
        }

        runnersArray.push(
            `        Initialization: {\n` +
            `            ${initOptions.join(',\n            ')}\n` +
            `        }`
        );
    }

    if (runners.Runtime && runners.Runtime.enabled) {
        const { testCases = [], durationMs = 60000, delayMs = 10000, metrics = ['runtime', 'longtask'] } = runners.Runtime;
        const testCasesStr = testCases.map((tc: any) => generateTestCase(tc, 'Runtime')).join(',\n');

        const runtimeOptions: string[] = [
            `testCases: [\n${testCasesStr}\n            ]`,
            `durationMs: ${durationMs}`
        ];

        if (delayMs !== 10000) {
            runtimeOptions.push(`delayMs: ${delayMs}`);
        }

        if (metrics && metrics.length > 0 && JSON.stringify(metrics) !== JSON.stringify(['runtime', 'longtask'])) {
            runtimeOptions.push(`metrics: ${JSON.stringify(metrics)}`);
        }

        runnersArray.push(
            `        Runtime: {\n` +
            `            ${runtimeOptions.join(',\n            ')}\n` +
            `        }`
        );
    }

    if (runners.MemoryLeak && runners.MemoryLeak.enabled) {
        const { testCases = [], intervalMs = 60000, iterations = 3, delayMs = 10000, coolDownMs = 3000, onPageTesting = '' } = runners.MemoryLeak;
        const globalOnPageTesting = onPageTesting.trim();

        // 如果有全局的onPageTesting，将其注入到testCase中（向后兼容）
        const testCasesWithGlobal = testCases.map((tc: any) => {
            if (globalOnPageTesting && !tc.onPageTesting && !tc.hooks?.onPageTesting) {
                return { ...tc, onPageTesting: globalOnPageTesting };
            }
            return tc;
        });

        const testCasesStr = testCasesWithGlobal.map((tc: any) => generateTestCase(tc, 'MemoryLeak')).join(',\n');

        const memoryOptions: string[] = [
            `testCases: [\n${testCasesStr}\n            ]`,
            `intervalMs: ${intervalMs}`,
            `iterations: ${iterations}`
        ];

        if (delayMs !== 10000) {
            memoryOptions.push(`delayMs: ${delayMs}`);
        }

        if (coolDownMs !== 3000) {
            memoryOptions.push(`coolDownMs: ${coolDownMs}`);
        }

        runnersArray.push(
            `        MemoryLeak: {\n` +
            `            ${memoryOptions.join(',\n            ')}\n` +
            `        }`
        );
    }

    // 构建完整配置字符串
    const configParts: string[] = [];

    // Mode配置
    configParts.push(`mode: ${JSON.stringify(mode, null, 4).replace(/\n/g, '\n    ')}`);

    // Root配置
    if (rootOptions.length > 0) {
        configParts.push(...rootOptions);
    }

    // Runners配置
    configParts.push(`runners: {\n${runnersArray.join(',\n')}\n    }`);

    return `import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    ${configParts.join(',\n    ')}
};

export default config;`;
}

// 强制终止进程（已废弃，保留用于向后兼容）
function forceKillProcess(proc: ChildProcess | null) {
    if (!proc || proc.killed) return;

    try {
        proc.kill('SIGTERM');
        setTimeout(() => {
            if (proc && !proc.killed) {
                console.warn('Process did not terminate gracefully, forcing SIGKILL...');
                proc.kill('SIGKILL');
            }
        }, 5000);
    } catch (error) {
        console.error('Error killing process:', error);
    }
}

// 确保报告目录存在
async function ensureReportsDir() {
    const reportsDir = path.join(__dirname, '../benchmark_report');
    try {
        await fs.mkdir(reportsDir, { recursive: true });
    } catch (error) {
        console.error('Failed to create reports directory:', error);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ==================== 任务管理API ====================

// 获取所有任务列表
app.get('/api/tasks', (req, res) => {
    const taskList = Array.from(tasks.values()).map(t => ({
        id: t.id,
        name: t.name,
        runner: t.runner,
        status: t.status,
        startTime: t.startTime,
        endTime: t.endTime,
        outputLength: t.output.length
    }));

    res.json({
        tasks: taskList,
        runningCount: getRunningTasksCount(),
        maxConcurrent: MAX_CONCURRENT_TASKS
    });
});

// 获取单个任务详情
app.get('/api/tasks/:taskId', (req, res) => {
    const { taskId } = req.params;
    const task = tasks.get(taskId);

    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
        id: task.id,
        name: task.name,
        runner: task.runner,
        status: task.status,
        output: task.output,
        startTime: task.startTime,
        endTime: task.endTime
    });
});

// 停止任务
app.post('/api/tasks/:taskId/stop', (req, res) => {
    const { taskId } = req.params;
    const { force = false } = req.body;

    if (stopTask(taskId, force)) {
        res.json({
            success: true,
            message: force ? 'Task force stopped' : 'Task stopping...'
        });
    } else {
        res.status(400).json({ error: 'Task not found or not running' });
    }
});

// 删除任务
app.delete('/api/tasks/:taskId', (req, res) => {
    const { taskId } = req.params;

    if (deleteTask(taskId)) {
        res.json({ success: true, message: 'Task deleted' });
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// 清理所有已完成的任务
app.post('/api/tasks/clear-completed', (req, res) => {
    const count = clearCompletedTasks();
    res.json({ success: true, message: `Cleared ${count} completed tasks` });
});

// 获取benchmark状态（向后兼容）
app.get('/api/status', (req, res) => {
    broadcastStatus(); // 更新状态
    res.json({
        status: benchmarkStatus,
        output: benchmarkOutput,
        hasProcess: currentBenchmark !== null,
        currentRunner
    });
});

// 获取动态配置（JSON格式）
app.get('/api/dynamic-config', async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../benchmark.dynamic.json');
        try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            res.json(JSON.parse(configContent));
        } catch {
            // 如果文件不存在，返回默认配置
            const defaultConfig = {
                mode: { anonymous: true, headless: false },
                runners: {
                    Initialization: { enabled: false, testCases: [] },
                    Runtime: { enabled: false, testCases: [], durationMs: 60000, delayMs: 10000 },
                    MemoryLeak: { enabled: false, testCases: [], intervalMs: 60000, iterations: 3, onPageTesting: '' }
                }
            };
            res.json(defaultConfig);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read config' });
    }
});

// 保存动态配置并生成 benchmark.config.mts
app.post('/api/dynamic-config', async (req, res) => {
    try {
        const config = req.body;

        // 保存 JSON 配置
        const jsonConfigPath = path.join(__dirname, '../benchmark.dynamic.json');
        await fs.writeFile(jsonConfigPath, JSON.stringify(config, null, 2), 'utf-8');

        // 生成 TypeScript 配置文件
        const tsConfig = generateConfig(config);
        const tsConfigPath = path.join(__dirname, '../benchmark.config.mts');
        await fs.writeFile(tsConfigPath, tsConfig, 'utf-8');

        res.json({ success: true });
    } catch (error) {
        console.error('Failed to save config:', error);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

// 启动benchmark（新版本：使用任务系统，支持并发）
app.post('/api/start', async (req, res) => {
    const { runner, config, name } = req.body;

    try {
        let finalConfig;
        let runnerNames: string[] = [];
        let taskName = name || 'Benchmark Test';

        if (config) {
            // 新模式：直接使用传入的config（支持多runner）
            finalConfig = config;

            // 提取启用的runner名称
            if (finalConfig.runners) {
                for (const [name, runnerConfig] of Object.entries(finalConfig.runners)) {
                    if ((runnerConfig as any).enabled !== false) {
                        runnerNames.push(name);
                    }
                }
            }
        } else if (runner) {
            // 旧模式：基于runner参数构建配置（兼容）
            const validRunners = ['Initialization', 'Runtime', 'MemoryLeak'];

            if (!validRunners.includes(runner)) {
                return res.status(400).json({
                    error: 'Invalid runner. Must be one of: Initialization, Runtime, MemoryLeak'
                });
            }

            // 读取完整配置
            const configPath = path.join(__dirname, '../benchmark.dynamic.json');
            let fullConfig;

            try {
                const configContent = await fs.readFile(configPath, 'utf-8');
                fullConfig = JSON.parse(configContent);
            } catch (error) {
                return res.status(400).json({
                    error: '配置文件不存在或格式错误，请先在配置页面保存配置'
                });
            }

            // 验证配置
            const validation = validateConfig(fullConfig, runner);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }

            // 创建只包含选定 runner 的配置
            finalConfig = {
                mode: fullConfig.mode,
                runners: {
                    [runner]: fullConfig.runners[runner]
                }
            };

            runnerNames = [runner];
            taskName = `${runner} Test`;
        } else {
            return res.status(400).json({ error: 'Runner或config参数缺失' });
        }

        // 确保报告目录存在
        await ensureReportsDir();

        // 转换前端配置为SDK期望的格式
        const transformedConfig = transformConfigForSDK(finalConfig);

        // 创建任务
        const taskId = createTask(
            taskName,
            runnerNames.join(' + '),
            transformedConfig
        );

        // 立即尝试启动任务
        startTask(taskId);

        res.json({
            success: true,
            message: `Task created: ${taskName}`,
            taskId: taskId,
            runner: runnerNames.join(' + ')
        });

    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ error: 'Failed to create task: ' + (error as Error).message });
    }
});

// 停止benchmark（改进版本）
app.post('/api/stop', (req, res) => {
    if (!currentBenchmark) {
        return res.status(400).json({ error: 'No benchmark is running' });
    }

    forceKillProcess(currentBenchmark);

    // 立即更新状态
    benchmarkStatus = 'idle';
    appendOutput('\n\n⚠️ Benchmark stopped by user\n');

    // 等待进程清理
    setTimeout(() => {
        currentBenchmark = null;
        currentRunner = '';
        broadcastStatus();
    }, 1000);

    res.json({ success: true, message: 'Benchmark stopping...' });
});

// 强制重置状态（新增接口，用于错误恢复）
app.post('/api/reset', (req, res) => {
    // 停止所有运行中的任务
    Array.from(tasks.values())
        .filter(t => t.status === 'running')
        .forEach(t => stopTask(t.id));

    // 清空所有任务
    tasks.clear();

    // 重置向后兼容的状态变量
    if (currentBenchmark) {
        forceKillProcess(currentBenchmark);
    }

    currentBenchmark = null;
    benchmarkStatus = 'idle';
    benchmarkOutput = '';
    currentRunner = '';

    // 广播状态更新
    broadcastStatus();
    broadcastTaskList();

    res.json({ success: true, message: 'All tasks stopped and status reset successfully' });
});

// 获取测试报告列表（改进版本）
app.get('/api/reports', async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, '../benchmark_report');

        // 确保目录存在
        await ensureReportsDir();

        let files: string[];
        try {
            files = await fs.readdir(reportsDir);
        } catch (error) {
            // 如果读取失败，返回空数组
            return res.json([]);
        }

        const reports = await Promise.all(
            files.filter(f => f.endsWith('.html') || f.endsWith('.json'))
                .map(async (file) => {
                    try {
                        const stat = await fs.stat(path.join(reportsDir, file));
                        return {
                            name: file,
                            path: `/reports/${file}`,
                            modified: stat.mtime,
                            size: stat.size
                        };
                    } catch (error) {
                        return null;
                    }
                })
        );

        // 过滤掉null值并排序
        const validReports = reports.filter(r => r !== null);
        res.json(validReports.sort((a, b) => b!.modified.getTime() - a!.modified.getTime()));
    } catch (error) {
        console.error('Failed to read reports:', error);
        res.json([]); // 返回空数组而不是500错误
    }
});

// 删除报告（新增功能）
app.delete('/api/reports/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // 安全检查：防止路径遍历攻击
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(__dirname, '../benchmark_report', filename);
        await fs.unlink(filePath);

        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Failed to delete report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// 获取测试结果数据（用于可视化）
app.get('/api/test-results', async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, '../benchmark_report');

        // 确保目录存在
        await ensureReportsDir();

        let files: string[];
        try {
            files = await fs.readdir(reportsDir);
        } catch (error) {
            return res.json([]);
        }

        // 查找所有 JSON 报告文件
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        const results = [];

        for (const file of jsonFiles) {
            try {
                const filePath = path.join(reportsDir, file);
                const fileStats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);

                // 从文件名提取信息：格式通常为 Initialization_2024-01-01_12-00-00.json
                const fileNameParts = file.replace('.json', '').split('_');
                const runner = fileNameParts[0] || 'Unknown';

                // 提取测试URL列表和结果
                const urls: string[] = [];
                const urlsWithResults: Array<{url: string, description: string, metrics: any}> = [];

                if (data && typeof data === 'object') {
                    // 尝试从不同的数据结构中提取URL和结果
                    if (Array.isArray(data)) {
                        // 如果data直接是数组
                        data.forEach((item: any) => {
                            if (item.url) {
                                urls.push(item.url);
                                urlsWithResults.push({
                                    url: item.url,
                                    description: item.description || item.url,
                                    metrics: item
                                });
                            }
                        });
                    } else if (data.results && Array.isArray(data.results)) {
                        // 如果data.results是数组
                        data.results.forEach((item: any) => {
                            if (item.url) {
                                urls.push(item.url);
                                urlsWithResults.push({
                                    url: item.url,
                                    description: item.description || item.url,
                                    metrics: item
                                });
                            }
                        });
                    } else {
                        // 尝试从对象的值中提取
                        Object.values(data).forEach(item => {
                            if (typeof item === 'object' && item !== null && (item as any).url) {
                                const url = (item as any).url;
                                urls.push(url);
                                urlsWithResults.push({
                                    url,
                                    description: (item as any).description || url,
                                    metrics: item
                                });
                            }
                        });
                    }
                }

                results.push({
                    id: file.replace('.json', ''),
                    filename: file,
                    timestamp: fileStats.mtime.toISOString(),
                    runner: runner,
                    name: `${runner} 测试`,
                    urlCount: urls.length,
                    urls: urls,
                    urlsWithResults: urlsWithResults,
                    rawData: data
                });
            } catch (error) {
                console.error(`Failed to parse ${file}:`, error);
            }
        }

        // 按时间戳排序（最新的在前）
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(results);
    } catch (error) {
        console.error('Failed to load test results:', error);
        res.status(500).json({ error: 'Failed to load test results' });
    }
});

// 提供测试报告文件
app.use('/reports', express.static(path.join(__dirname, '../benchmark_report')));

// 健康检查（新增）
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        benchmark: {
            status: benchmarkStatus,
            hasProcess: currentBenchmark !== null,
            runner: currentRunner
        }
    });
});

// ========== API密钥管理 ==========

// 获取所有API密钥（仅显示前8位）
app.get('/api/keys', async (req, res) => {
    res.json({
        keys: apiKeys.map(key => ({
            preview: key.substring(0, 12) + '...',
            fullKey: key
        })),
        count: apiKeys.length
    });
});

// 生成新的API密钥
app.post('/api/keys/generate', async (req, res) => {
    const newKey = generateApiKey();
    apiKeys.push(newKey);
    await saveApiKeys();

    res.json({
        success: true,
        apiKey: newKey,
        message: 'API密钥已生成，请妥善保存'
    });
});

// 删除API密钥
app.delete('/api/keys/:key', async (req, res) => {
    const { key } = req.params;
    const index = apiKeys.indexOf(key);

    if (index === -1) {
        return res.status(404).json({ error: 'API密钥不存在' });
    }

    apiKeys.splice(index, 1);
    await saveApiKeys();

    res.json({ success: true, message: 'API密钥已删除' });
});

// ========== Webhook配置 ==========

// 获取Webhook配置
app.get('/api/webhook', async (req, res) => {
    res.json({
        webhookUrl: webhookUrl || '',
        enabled: !!webhookUrl
    });
});

// 设置Webhook URL
app.post('/api/webhook', async (req, res) => {
    const { url } = req.body;

    if (url && !url.startsWith('http')) {
        return res.status(400).json({ error: 'Webhook URL必须以http://或https://开头' });
    }

    webhookUrl = url || '';
    await saveWebhookConfig();

    res.json({
        success: true,
        webhookUrl,
        message: webhookUrl ? 'Webhook已配置' : 'Webhook已禁用'
    });
});

// 测试Webhook
app.post('/api/webhook/test', async (req, res) => {
    if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook未配置' });
    }

    try {
        await sendWebhook('test_event', {
            message: 'This is a test webhook from Benchmark Web Runner',
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: 'Webhook测试请求已发送' });
    } catch (error) {
        res.status(500).json({
            error: 'Webhook测试失败',
            details: (error as Error).message
        });
    }
});

// ========== 外部API接口（需要API密钥） ==========

// API: 启动测试
app.post('/api/v1/test/start', validateApiKey, async (req, res) => {
    if (currentBenchmark) {
        return res.status(400).json({ error: 'A test is already running' });
    }

    const { runner, config } = req.body;

    if (!runner) {
        return res.status(400).json({ error: 'Missing runner parameter' });
    }

    const validRunners = ['Initialization', 'Runtime', 'MemoryLeak'];
    if (!validRunners.includes(runner)) {
        return res.status(400).json({
            error: `Invalid runner. Must be one of: ${validRunners.join(', ')}`
        });
    }

    try {
        // 如果提供了配置，先保存
        if (config) {
            const jsonConfigPath = path.join(__dirname, '../benchmark.dynamic.json');
            await fs.writeFile(jsonConfigPath, JSON.stringify(config, null, 2), 'utf-8');

            const tsConfig = generateConfig(config);
            const tsConfigPath = path.join(__dirname, '../benchmark.config.mts');
            await fs.writeFile(tsConfigPath, tsConfig, 'utf-8');
        }

        // 读取配置并验证
        const configPath = path.join(__dirname, '../benchmark.dynamic.json');
        let fullConfig;

        try {
            const configContent = await fs.readFile(configPath, 'utf-8');
            fullConfig = JSON.parse(configContent);
        } catch (error) {
            return res.status(400).json({
                error: 'Configuration file not found or invalid'
            });
        }

        const validation = validateConfig(fullConfig, runner);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }

        await ensureReportsDir();

        const tempConfig = {
            mode: fullConfig.mode,
            runners: { [runner]: fullConfig.runners[runner] }
        };

        const tempConfigCode = generateConfig(tempConfig);
        const tempConfigPath = path.join(__dirname, '../benchmark.config.mts');
        await fs.writeFile(tempConfigPath, tempConfigCode, 'utf-8');

        benchmarkStatus = 'running';
        benchmarkOutput = '';
        currentRunner = runner;

        broadcastStatus();

        // 发送Webhook通知
        sendWebhook('test_started', {
            runner,
            startTime: new Date().toISOString()
        });

        const command = 'npx @bilibili-player/benchmark';
        currentBenchmark = exec(command, { cwd: path.join(__dirname, '..') });

        currentBenchmark.stdout?.on('data', (data) => {
            appendOutput(data.toString());
        });

        currentBenchmark.stderr?.on('data', (data) => {
            appendOutput(data.toString());
        });

        currentBenchmark.on('close', (code) => {
            benchmarkStatus = code === 0 ? 'completed' : 'error';

            sendWebhook('test_completed', {
                runner: currentRunner,
                status: benchmarkStatus,
                exitCode: code
            });

            currentBenchmark = null;
            currentRunner = '';
            broadcastStatus();
        });

        res.json({
            success: true,
            message: `Test started: ${runner}`,
            runner,
            status: 'running'
        });
    } catch (error) {
        benchmarkStatus = 'error';
        currentBenchmark = null;
        currentRunner = '';

        res.status(500).json({
            error: 'Failed to start test',
            details: (error as Error).message
        });
    }
});

// API: 获取测试状态
app.get('/api/v1/test/status', validateApiKey, (req, res) => {
    res.json({
        status: benchmarkStatus,
        runner: currentRunner,
        hasProcess: currentBenchmark !== null,
        output: benchmarkOutput.slice(-5000) // 最后5000字符
    });
});

// API: 停止测试
app.post('/api/v1/test/stop', validateApiKey, (req, res) => {
    if (!currentBenchmark) {
        return res.status(400).json({ error: 'No test is running' });
    }

    forceKillProcess(currentBenchmark);
    benchmarkStatus = 'idle';
    appendOutput('\n\n⚠️ Test stopped via API\n');

    setTimeout(() => {
        currentBenchmark = null;
        currentRunner = '';
        broadcastStatus();
    }, 1000);

    res.json({ success: true, message: 'Test stopping...' });
});

// API: 获取报告列表
app.get('/api/v1/reports', validateApiKey, async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, '../benchmark_report');
        await ensureReportsDir();

        let files: string[];
        try {
            files = await fs.readdir(reportsDir);
        } catch (error) {
            return res.json({ reports: [], count: 0 });
        }

        const reports = await Promise.all(
            files.filter(f => f.endsWith('.html') || f.endsWith('.json'))
                .map(async (file) => {
                    try {
                        const stat = await fs.stat(path.join(reportsDir, file));
                        return {
                            name: file,
                            url: `${req.protocol}://${req.get('host')}/reports/${file}`,
                            modified: stat.mtime,
                            size: stat.size
                        };
                    } catch {
                        return null;
                    }
                })
        );

        const validReports = reports.filter(r => r !== null);

        res.json({
            reports: validReports.sort((a, b) => b!.modified.getTime() - a!.modified.getTime()),
            count: validReports.length
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to list reports',
            details: (error as Error).message
        });
    }
});

// 启动服务器，带端口冲突处理
const server = app.listen(PORT, async () => {
    console.log(`\n🚀 Benchmark Web Server running at http://localhost:${PORT}`);
    console.log(`   - View UI: http://localhost:${PORT}`);
    console.log(`   - Config: http://localhost:${PORT}/config.html`);
    console.log(`   - API Status: http://localhost:${PORT}/api/status`);
    console.log(`   - Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   - WebSocket: ws://localhost:${PORT}`);
    console.log(`   - API Docs: http://localhost:${PORT}/api.html\n`);

    // 启动时加载配置
    await ensureReportsDir();
    await loadApiKeys();
    await loadWebhookConfig();

    console.log(`📡 API Keys: ${apiKeys.length} active`);
    console.log(`🔔 Webhook: ${webhookUrl ? 'Enabled' : 'Disabled'}\n`);
}).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use.`);
        console.error(`\n💡 Solutions:`);
        console.error(`   1. Kill the process using port ${PORT}:`);
        console.error(`      macOS/Linux: lsof -ti :${PORT} | xargs kill -9`);
        console.error(`      Windows: netstat -ano | findstr :${PORT}`);
        console.error(`   2. Or use a different port:`);
        console.error(`      PORT=3001 npm run dev\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    // 添加到连接池
    wsClients.add(ws);

    // 立即发送任务列表
    const taskList = Array.from(tasks.values()).map(t => ({
        id: t.id,
        name: t.name,
        runner: t.runner,
        status: t.status,
        startTime: t.startTime,
        endTime: t.endTime,
        outputLength: t.output.length
    }));

    ws.send(JSON.stringify({
        type: 'tasks',
        data: taskList
    }));

    // 也发送旧的状态格式（向后兼容）
    broadcastStatus();
    const statusData = {
        type: 'status',
        data: {
            status: benchmarkStatus,
            output: benchmarkOutput,
            hasProcess: currentBenchmark !== null,
            currentRunner
        }
    };
    ws.send(JSON.stringify(statusData));

    // 处理客户端消息（可选）
    ws.on('message', (message: Buffer) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('Received message from client:', data);

            // 可以在这里处理客户端发送的命令
            // 例如：{ type: 'ping' } -> 回复 { type: 'pong' }
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });

    // 处理连接关闭
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
        wsClients.delete(ws);
    });

    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        wsClients.delete(ws);
    });
});

console.log('WebSocket server initialized');

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (currentBenchmark) {
        forceKillProcess(currentBenchmark);
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received, shutting down gracefully...');
    if (currentBenchmark) {
        forceKillProcess(currentBenchmark);
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
