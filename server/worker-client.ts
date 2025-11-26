/**
 * Worker 客户端
 * 在各台电脑上运行，连接到 Master 并执行任务
 */

import os from 'os';
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
        const registration: WorkerRegistration = {
            name: this.workerName,
            host: this.getLocalIP(),
            port: this.workerPort,
            platform: os.platform(),
            arch: os.arch(),
            cpuCount: os.cpus().length,
            memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)), // GB
            performanceTier: this.performanceTier,
            description: this.description,
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
        const wsUrl = this.masterUrl.replace('http', 'ws');
        this.ws = new WebSocket(`${wsUrl}?workerId=${this.workerId}`);

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
            const configPath = this.createTempConfig(testCase);
            const command = `npx @bilibili-player/benchmark ${runner} --config ${configPath}`;

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

            this.currentProcess.on('close', (code) => {
                const duration = Date.now() - startTime;

                if (code === 0) {
                    resolve({
                        taskId: this.currentTaskId!,
                        status: 'completed',
                        exitCode: code,
                        duration
                    });
                } else {
                    reject(new Error(`Task failed with exit code ${code}`));
                }
            });

            this.currentProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 创建临时配置文件
     */
    private createTempConfig(testCase: any): string {
        // TODO: 创建临时配置文件
        // 这里简化处理，实际应该创建真实的配置文件
        return './temp-config.json';
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
    const workerName = process.env.WORKER_NAME || `Worker-${os.hostname()}`;
    const workerPort = parseInt(process.env.WORKER_PORT || '0');
    const tags = (process.env.WORKER_TAGS || '').split(',').filter(t => t);
    const performanceTier = (process.env.PERFORMANCE_TIER || '') as 'high' | 'medium' | 'low' | 'custom' | '';
    const description = process.env.WORKER_DESCRIPTION || '';

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
