/**
 * Worker 客户端
 * 在各台电脑上运行，连接到 Master 并执行任务
 */

import os from 'os';
import fs from 'fs';
import { WebSocket } from 'ws';
import { exec, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    WorkerRegistration,
    WorkerHeartbeat,
    WSMessage,
    TaskExecutionResult
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const HEARTBEAT_INTERVAL = 30000; // 30秒发送一次心跳
const RECONNECT_INTERVAL = 5000;  // 5秒重连间隔

export class WorkerClient {
    private workerId: string | null = null;
    private ws: WebSocket | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private currentProcess: ChildProcess | null = null;
    private currentTaskId: string | null = null;

    constructor(
        private masterUrl: string,
        private workerName: string,
        private workerPort: number = 0,
        private tags: string[] = [],
        private performanceTier?: 'high' | 'medium' | 'low' | 'custom',
        private description?: string
    ) {}

    /**
     * 启动 Worker 客户端
     */
    async start(): Promise<void> {
        console.log(`\n🚀 Starting Worker Client: ${this.workerName}`);
        console.log(`   Master URL: ${this.masterUrl}\n`);

        try {
            await this.register();
            this.connectWebSocket();
            this.startHeartbeat();
        } catch (error) {
            console.error('Failed to start worker:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * 停止 Worker 客户端
     */
    async stop(): Promise<void> {
        console.log('\n🛑 Stopping Worker Client...\n');

        // 停止心跳
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        // 停止重连
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // 停止当前任务
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
        }

        // 注销
        if (this.workerId) {
            await this.unregister();
        }

        // 关闭 WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        console.log('✅ Worker stopped');
    }

    /**
     * 注册到 Master
     */
    private async register(): Promise<void> {
        const cpuCount = os.cpus().length;

        const registration: WorkerRegistration = {
            name: this.workerName,
            host: this.getLocalIP(),
            port: this.workerPort,
            platform: os.platform(),
            arch: os.arch(),
            cpuCount: cpuCount,
            memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // GB
            performanceTier: this.performanceTier,
            description: this.description,
            maxConcurrency: Math.max(2, cpuCount),  // 默认并发数为CPU核心数，最少2
            capabilities: ['chromium'], // 可以根据实际情况添加
            tags: this.tags
        };

        const response = await fetch(`${this.masterUrl}/api/workers/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registration)
        });

        if (!response.ok) {
            throw new Error(`Registration failed: ${response.statusText}`);
        }

        const result = await response.json() as { workerId: string };
        this.workerId = result.workerId;

        console.log(`✅ Registered to Master: ${this.workerId}`);
    }

    /**
     * 从 Master 注销
     */
    private async unregister(): Promise<void> {
        if (!this.workerId) return;

        try {
            await fetch(`${this.masterUrl}/api/workers/${this.workerId}`, {
                method: 'DELETE'
            });
            console.log('✅ Unregistered from Master');
        } catch (error) {
            console.error('Failed to unregister:', error);
        }
    }

    /**
     * 连接 WebSocket
     */
    private connectWebSocket(): void {
        if (!this.workerId) {
            console.error('❌ Cannot connect WebSocket: workerId is null');
            return;
        }

        const wsUrl = this.masterUrl.replace('http', 'ws');
        const fullUrl = `${wsUrl}?workerId=${this.workerId}`;

        console.log(`🔌 Connecting WebSocket with ID: ${this.workerId.substring(0, 20)}...`);
        this.ws = new WebSocket(fullUrl);

        this.ws.on('open', () => {
            console.log('✅ WebSocket connected');
        });

        this.ws.on('message', (data: Buffer) => {
            try {
                const message: WSMessage = JSON.parse(data.toString());
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        });

        this.ws.on('close', () => {
            console.log('❌ WebSocket disconnected');
            this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }

    /**
     * 处理 WebSocket 消息
     */
    private async handleMessage(message: WSMessage): Promise<void> {
        switch (message.type) {
            case 'task-assigned':
                await this.handleTaskAssigned(message.data);
                break;

            case 'heartbeat-ack':
                // 心跳确认，无需处理
                break;

            case 'tasks':
                // Master 发送的任务列表（用于初始同步）
                // Worker 不需要处理，忽略
                break;

            case 'status':
                // Master 发送的状态更新
                // Worker 不需要处理，忽略
                break;

            case 'worker-registered':
                // Worker 注册成功确认消息
                // Worker 不需要处理，忽略
                break;

            case 'worker-status-update':
                // Worker 状态更新广播
                // Worker 不需要处理，忽略
                break;

            case 'worker-offline':
                // Worker 离线通知
                // Worker 不需要处理，忽略
                break;

            default:
                console.log(`Unknown message type: ${message.type}`);
        }
    }

    /**
     * 处理任务分配
     */
    private async handleTaskAssigned(taskData: any): Promise<void> {
        const { taskId, testCase, runner } = taskData;

        console.log(`\n📋 Task assigned: ${taskId}`);
        console.log(`   Test Case: ${testCase.name}`);
        console.log(`   Runner: ${runner}\n`);

        this.currentTaskId = taskId;

        try {
            // 通知 Master 任务开始
            await this.notifyTaskStatus(taskId, 'running');

            // 执行任务
            const result = await this.executeTask(testCase, runner);

            // 上报结果
            await this.reportTaskResult(taskId, result);

        } catch (error) {
            console.error('Task execution failed:', error);
            await this.reportTaskResult(taskId, {
                taskId,
                status: 'failed',
                exitCode: 1,
                error: (error as Error).message,
                duration: 0
            });
        } finally {
            this.currentTaskId = null;
            this.currentProcess = null;
        }
    }

    /**
     * 执行任务
     */
    private async executeTask(testCase: any, runner: string): Promise<TaskExecutionResult> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            // 构建测试命令
            const configFileName = this.createTempConfig(testCase);
            const configPath = path.join(__dirname, '..', configFileName);
            const command = `npx @bilibili-player/benchmark --config ${configFileName}`;

            console.log(`▶️  Executing: ${command}\n`);

            this.currentProcess = exec(command, {
                cwd: path.join(__dirname, '..'),
                maxBuffer: 10 * 1024 * 1024 // 10MB
            });

            let output = '';

            this.currentProcess.stdout?.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.log(text);

                // 发送实时日志到 Master
                this.sendLog(this.currentTaskId!, text);
            });

            this.currentProcess.stderr?.on('data', (data) => {
                const text = data.toString();
                output += text;
                console.error(text);
                this.sendLog(this.currentTaskId!, text);
            });

            this.currentProcess.on('close', async (code) => {
                const duration = Date.now() - startTime;

                // 清理临时配置文件
                try {
                    if (fs.existsSync(configPath)) {
                        fs.unlinkSync(configPath);
                        console.log(`🗑️  Cleaned up temp config: ${configPath}`);
                    }
                } catch (error) {
                    console.warn(`⚠️  Failed to clean up temp config: ${error}`);
                }

                if (code === 0) {
                    // 查找生成的测试报告
                    const reportPath = await this.findLatestReport(runner, startTime);

                    resolve({
                        taskId: this.currentTaskId!,
                        status: 'completed',
                        exitCode: code,
                        duration,
                        reportPath  // 添加报告路径
                    });
                } else {
                    reject(new Error(`Task failed with exit code ${code}`));
                }
            });

            this.currentProcess.on('error', (error) => {
                // 清理临时配置文件
                try {
                    if (fs.existsSync(configPath)) {
                        fs.unlinkSync(configPath);
                    }
                } catch (err) {
                    // Ignore cleanup errors on error
                }
                reject(error);
            });
        });
    }

    /**
     * 创建临时配置文件
     */
    private createTempConfig(testCase: any): string {
        const taskId = `task_${Date.now()}`;
        const tempConfigCode = this.generateConfig(testCase, taskId);
        // 在项目根目录创建临时配置文件（与本地执行保持一致）
        const configPath = path.join(__dirname, `../benchmark.config.${taskId}.mts`);

        fs.writeFileSync(configPath, tempConfigCode, 'utf-8');
        console.log(`📝 Created temp config: ${configPath}`);

        return `benchmark.config.${taskId}.mts`;
    }

    /**
     * 生成配置文件内容（TypeScript模块格式）
     */
    private generateConfig(config: any, taskId?: string): string {
        const mode = config.mode || { anonymous: true, headless: false };
        const runners = config.runners || {
            Initialization: { enabled: false, testCases: [], iterations: 7, includeWarmNavigation: false },
            Runtime: { enabled: false, testCases: [], durationMs: 60000, delayMs: 10000, metrics: ['runtime', 'longtask'] },
            MemoryLeak: { enabled: false, testCases: [], intervalMs: 60000, iterations: 3, onPageTesting: '' }
        };

        // 如果提供了taskId，为该任务设置唯一的usrDataDir以避免并发冲突
        if (taskId && !mode.anonymous && !mode.usrDataDir) {
            mode.usrDataDir = `./usr_data/${taskId}`;
        }

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
            const testCasesStr = testCases.map((tc: any) => this.generateTestCase(tc, 'Initialization')).join(',\n');

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
            const testCasesStr = testCases.map((tc: any) => this.generateTestCase(tc, 'Runtime')).join(',\n');

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

            const testCasesStr = testCasesWithGlobal.map((tc: any) => this.generateTestCase(tc, 'MemoryLeak')).join(',\n');

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

    /**
     * 生成测试用例配置
     */
    private generateTestCase(tc: any, runnerType: string): string {
        const lines: string[] = [];

        // 基础字段
        lines.push(`target: ${JSON.stringify(tc.target)}`);
        lines.push(`description: ${JSON.stringify(tc.description)}`);

        // TestCase级别的delayMs
        const delayMs = tc.config?.delayMs ?? tc.delayMs;
        if (delayMs !== undefined) {
            lines.push(`delayMs: ${delayMs}`);
        }

        // Cookie - 转换为Playwright格式
        const cookieData = tc.config?.cookie ?? tc.cookie ?? tc.advancedConfig?.cookie;
        if (cookieData) {
            if (typeof cookieData === 'string') {
                // 将字符串格式的Cookie转换为Playwright Cookie对象数组
                const cookieString = cookieData;
                const cookieArray: any[] = [];

                cookieString.split(';').forEach((item: string) => {
                    const trimmed = item.trim();
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex > 0) {
                        const name = trimmed.substring(0, eqIndex);
                        const value = trimmed.substring(eqIndex + 1);
                        cookieArray.push({
                            name,
                            value,
                            domain: '.bilibili.com',
                            path: '/'
                        });
                    }
                });

                lines.push(`cookie: ${JSON.stringify(cookieArray)}`);
            } else {
                lines.push(`cookie: ${JSON.stringify(cookieData)}`);
            }
        }

        // extraHTTPHeaders
        const extraHTTPHeaders = tc.config?.extraHTTPHeaders ?? tc.extraHTTPHeaders;
        if (extraHTTPHeaders) {
            lines.push(`extraHTTPHeaders: ${JSON.stringify(extraHTTPHeaders)}`);
        }

        // blockList
        const blockList = tc.config?.blockList ?? tc.blockList;
        if (blockList) {
            lines.push(`blockList: ${JSON.stringify(blockList)}`);
        }

        // customCss
        const customCss = tc.config?.customCss ?? tc.customCss;
        if (customCss) {
            lines.push(`customCss: ${JSON.stringify(customCss)}`);
        }

        // deviceOptions
        const deviceOptions = tc.config?.deviceOptions ?? tc.deviceOptions;
        if (deviceOptions && Array.isArray(deviceOptions)) {
            const [deviceType, options] = deviceOptions;
            if (Object.keys(options || {}).length > 0) {
                lines.push(`deviceOptions: [${JSON.stringify(deviceType)}, ${JSON.stringify(options)}]`);
            } else {
                lines.push(`deviceOptions: [${JSON.stringify(deviceType)}, {}]`);
            }
        }

        // networkConditions
        const networkConditions = tc.config?.networkConditions ?? tc.networkConditions;
        if (networkConditions && Object.keys(networkConditions).length > 0) {
            const networkCode = `await session.send("Network.emulateNetworkConditions", ${JSON.stringify(networkConditions)});`;
            const existingBeforePageLoad = tc.config?.hooks?.beforePageLoad ?? tc.hooks?.beforePageLoad ?? '';
            const networkBeforePageLoad = existingBeforePageLoad
                ? `${networkCode}\n                        ${existingBeforePageLoad}`
                : networkCode;

            if (!tc.config) tc.config = {};
            if (!tc.config.hooks) tc.config.hooks = {};
            tc.config.hooks._networkSimulation = networkBeforePageLoad;
        }

        // 生命周期钩子
        const hooks = tc.config?.hooks ?? tc.hooks;

        // beforePageLoad
        const beforePageLoadCode = hooks?._networkSimulation ?? (tc.config?.hooks?.beforePageLoad ?? tc.hooks?.beforePageLoad);
        if (beforePageLoadCode) {
            lines.push(`beforePageLoad: async ({ page, context, session }: any) => {\n                        ${beforePageLoadCode}\n                    }`);
        }

        // onPageLoaded
        const onPageLoadedCode = tc.config?.hooks?.onPageLoaded ?? tc.hooks?.onPageLoaded;
        if (onPageLoadedCode) {
            lines.push(`onPageLoaded: async ({ page, context, session }: any) => {\n                        ${onPageLoadedCode}\n                    }`);
        }

        // 其他钩子
        if (hooks) {
            if (hooks.onPageTesting && (runnerType === 'Runtime' || runnerType === 'MemoryLeak')) {
                lines.push(`onPageTesting: async ({ page, context, session }: any) => {\n                        ${hooks.onPageTesting}\n                    }`);
            }

            if (hooks.onPageCollecting && runnerType === 'MemoryLeak') {
                lines.push(`onPageCollecting: async ({ page, context, session }: any) => {\n                        ${hooks.onPageCollecting}\n                    }`);
            }

            if (hooks.onPageUnload) {
                lines.push(`onPageUnload: async ({ page, context, session }: any) => {\n                        ${hooks.onPageUnload}\n                    }`);
            }
        }

        // MemoryLeak特殊处理：向后兼容旧的onPageTesting字段
        if (runnerType === 'MemoryLeak' && tc.onPageTesting && !tc.hooks?.onPageTesting) {
            const onPageTestingCode = tc.onPageTesting.trim() || `// 在这里写你怀疑会触发内存泄露的页面操作\n                        // 若为空，则静置页面`;
            lines.push(`onPageTesting: async ({ context, page, session }: any) => {\n                        ${onPageTestingCode}\n                    }`);
        }

        return `                {\n                    ${lines.join(',\n                    ')}\n                }`;
    }

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

    /**
     * 发送任务日志
     */
    private sendLog(taskId: string, log: string): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const message: WSMessage = {
            type: 'task-log',
            data: { taskId, log },
            timestamp: Date.now()
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * 通知任务状态
     */
    private async notifyTaskStatus(taskId: string, status: string): Promise<void> {
        try {
            await fetch(`${this.masterUrl}/api/distributed-tasks/${taskId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
        } catch (error) {
            console.error('Failed to update task status:', error);
        }
    }

    /**
     * 上报任务结果
     */
    private async reportTaskResult(taskId: string, result: TaskExecutionResult): Promise<void> {
        try {
            await fetch(`${this.masterUrl}/api/distributed-tasks/${taskId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });

            console.log(`✅ Task completed: ${taskId}`);
        } catch (error) {
            console.error('Failed to report task result:', error);
        }
    }

    /**
     * 启动心跳
     */
    private startHeartbeat(): void {
        if (this.heartbeatTimer) {
            return;
        }

        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeat();
        }, HEARTBEAT_INTERVAL);

        // 立即发送一次
        this.sendHeartbeat();
    }

    /**
     * 发送心跳
     */
    private async sendHeartbeat(): Promise<void> {
        if (!this.workerId) {
            return;
        }

        const heartbeat: WorkerHeartbeat = {
            cpuUsage: await this.getCPUUsage(),
            memoryUsage: this.getMemoryUsage(),
            status: this.currentTaskId ? 'busy' : 'online',
            currentTask: this.currentTaskId || undefined
        };

        try {
            await fetch(`${this.masterUrl}/api/workers/${this.workerId}/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(heartbeat)
            });
        } catch (error) {
            console.error('Heartbeat failed:', error);
        }
    }

    /**
     * 获取 CPU 使用率
     */
    private async getCPUUsage(): Promise<number> {
        // 简化实现，返回随机值
        // 实际应该使用 os.cpus() 计算真实使用率
        return Math.random() * 100;
    }

    /**
     * 获取内存使用率
     */
    private getMemoryUsage(): number {
        const total = os.totalmem();
        const free = os.freemem();
        return ((total - free) / total) * 100;
    }

    /**
     * 获取本地 IP
     */
    private getLocalIP(): string {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            const iface = interfaces[name];
            if (!iface) continue;

            for (const alias of iface) {
                if (alias.family === 'IPv4' && !alias.internal) {
                    return alias.address;
                }
            }
        }
        return '127.0.0.1';
    }

    /**
     * 计划重连
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            return;
        }

        console.log(`⏳ Reconnecting in ${RECONNECT_INTERVAL / 1000} seconds...`);

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.start();
            } catch (error) {
                console.error('Reconnect failed:', error);
                this.scheduleReconnect();
            }
        }, RECONNECT_INTERVAL);
    }
}

// 如果直接运行此文件，启动 Worker
if (import.meta.url === `file://${process.argv[1]}`) {
    const masterUrl = process.env.MASTER_URL || 'http://localhost:3000';
    const workerPort = parseInt(process.env.WORKER_PORT || '0');
    const tags = (process.env.WORKER_TAGS || '').split(',').filter(t => t);
    const performanceTier = (process.env.PERFORMANCE_TIER || '') as 'high' | 'medium' | 'low' | 'custom' | '';
    const description = process.env.WORKER_DESCRIPTION || '';

    // 智能命名策略：
    // 1. 如果设置了 WORKER_NAME，使用它
    // 2. 如果设置了 WORKER_DESCRIPTION，使用描述作为名称（更有意义）
    // 3. 否则使用默认：Worker-主机名
    let workerName = process.env.WORKER_NAME;
    if (!workerName && description) {
        workerName = description;
    }
    if (!workerName) {
        workerName = `Worker-${os.hostname()}`;
    }

    const worker = new WorkerClient(
        masterUrl,
        workerName,
        workerPort,
        tags,
        performanceTier || undefined,
        description || undefined
    );

    // 优雅关闭
    process.on('SIGINT', async () => {
        await worker.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await worker.stop();
        process.exit(0);
    });

    worker.start().catch((error) => {
        console.error('Failed to start worker:', error);
        process.exit(1);
    });
}
