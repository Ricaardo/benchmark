/**
 * Worker 节点管理器
 * 负责管理所有 Worker 节点的注册、心跳、状态监控
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
    WorkerNode,
    WorkerRegistration,
    WorkerHeartbeat,
    WorkerStatus,
    WorkerStats
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const HEARTBEAT_TIMEOUT = 90000; // 90秒无心跳判定为离线
const HEARTBEAT_CHECK_INTERVAL = 30000; // 30秒检查一次

export class WorkerManager {
    private workers: Map<string, WorkerNode> = new Map();
    private workersFile: string;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private statusChangeCallbacks: Array<(worker: WorkerNode) => void> = [];

    constructor(dataDir: string = path.join(__dirname, '../data')) {
        this.workersFile = path.join(dataDir, 'workers.json');
        this.ensureDataDir(dataDir);
    }

    /**
     * 确保数据目录存在
     */
    private async ensureDataDir(dataDir: string) {
        try {
            await fs.mkdir(dataDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create data directory:', error);
        }
    }

    /**
     * 加载已注册的 Worker 节点
     */
    async loadWorkers(): Promise<void> {
        try {
            const data = await fs.readFile(this.workersFile, 'utf-8');
            const workersData = JSON.parse(data);

            for (const worker of workersData) {
                // 恢复时标记所有节点为离线
                worker.status = 'offline';
                this.workers.set(worker.id, worker);
            }

            console.log(`✅ Loaded ${this.workers.size} workers`);
        } catch (error) {
            // 文件不存在时忽略
            if ((error as any).code !== 'ENOENT') {
                console.error('Failed to load workers:', error);
            }
        }
    }

    /**
     * 保存 Worker 节点到文件
     */
    private async saveWorkers(): Promise<void> {
        try {
            const workersData = Array.from(this.workers.values());
            await fs.writeFile(
                this.workersFile,
                JSON.stringify(workersData, null, 2)
            );
        } catch (error) {
            console.error('Failed to save workers:', error);
        }
    }

    /**
     * 注册新的 Worker 节点
     */
    async registerWorker(registration: WorkerRegistration): Promise<string> {
        // 生成唯一ID
        const workerId = crypto.randomUUID();

        const worker: WorkerNode = {
            id: workerId,
            name: registration.name,
            host: registration.host,
            port: registration.port,
            platform: registration.platform,
            arch: registration.arch,
            cpuCount: registration.cpuCount,
            memory: registration.memory,
            performanceTier: registration.performanceTier,
            description: registration.description,
            capabilities: registration.capabilities || [],
            tags: registration.tags || [],
            status: 'online',
            lastHeartbeat: Date.now(),
            registeredAt: Date.now()
        };

        this.workers.set(workerId, worker);
        await this.saveWorkers();

        console.log(`✅ Worker registered: ${worker.name} (${workerId})`);
        this.notifyStatusChange(worker);

        return workerId;
    }

    /**
     * 更新 Worker 心跳
     */
    async updateHeartbeat(workerId: string, heartbeat: WorkerHeartbeat): Promise<boolean> {
        const worker = this.workers.get(workerId);
        if (!worker) {
            return false;
        }

        worker.lastHeartbeat = Date.now();
        worker.cpuUsage = heartbeat.cpuUsage;
        worker.memoryUsage = heartbeat.memoryUsage;
        worker.currentTask = heartbeat.currentTask;

        // 如果之前是离线，现在上线了
        if (worker.status === 'offline' && heartbeat.status === 'online') {
            console.log(`✅ Worker back online: ${worker.name}`);
        }

        worker.status = heartbeat.status;
        this.notifyStatusChange(worker);

        return true;
    }

    /**
     * 注销 Worker 节点
     */
    async unregisterWorker(workerId: string): Promise<boolean> {
        const worker = this.workers.get(workerId);
        if (!worker) {
            return false;
        }

        this.workers.delete(workerId);
        await this.saveWorkers();

        console.log(`❌ Worker unregistered: ${worker.name}`);
        this.notifyStatusChange({ ...worker, status: 'offline' });

        return true;
    }

    /**
     * 获取单个 Worker 信息
     */
    getWorker(workerId: string): WorkerNode | undefined {
        return this.workers.get(workerId);
    }

    /**
     * 获取所有 Worker 节点
     */
    getAllWorkers(): WorkerNode[] {
        return Array.from(this.workers.values());
    }

    /**
     * 获取在线的 Worker 节点
     */
    getOnlineWorkers(): WorkerNode[] {
        return this.getAllWorkers().filter(w => w.status === 'online');
    }

    /**
     * 获取可用的 Worker 节点（在线且不忙）
     */
    getAvailableWorkers(): WorkerNode[] {
        return this.getAllWorkers().filter(
            w => w.status === 'online' && !w.currentTask
        );
    }

    /**
     * 更新 Worker 任务状态
     */
    async updateWorkerTask(workerId: string, taskId: string | undefined): Promise<void> {
        const worker = this.workers.get(workerId);
        if (!worker) {
            return;
        }

        worker.currentTask = taskId;
        worker.status = taskId ? 'busy' : 'online';
        this.notifyStatusChange(worker);
    }

    /**
     * 启动心跳检查
     */
    startHeartbeatMonitor(): void {
        if (this.heartbeatTimer) {
            return;
        }

        this.heartbeatTimer = setInterval(() => {
            this.checkHeartbeats();
        }, HEARTBEAT_CHECK_INTERVAL);

        console.log('✅ Heartbeat monitor started');
    }

    /**
     * 停止心跳检查
     */
    stopHeartbeatMonitor(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
            console.log('❌ Heartbeat monitor stopped');
        }
    }

    /**
     * 检查所有 Worker 的心跳
     */
    private checkHeartbeats(): void {
        const now = Date.now();

        for (const worker of this.workers.values()) {
            if (worker.status === 'offline') {
                continue;
            }

            const timeSinceLastHeartbeat = now - worker.lastHeartbeat;

            if (timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
                console.log(`⚠️  Worker offline (no heartbeat): ${worker.name}`);
                worker.status = 'offline';
                worker.currentTask = undefined;
                this.notifyStatusChange(worker);
            }
        }
    }

    /**
     * 注册状态变化回调
     */
    onStatusChange(callback: (worker: WorkerNode) => void): void {
        this.statusChangeCallbacks.push(callback);
    }

    /**
     * 通知状态变化
     */
    private notifyStatusChange(worker: WorkerNode): void {
        for (const callback of this.statusChangeCallbacks) {
            try {
                callback(worker);
            } catch (error) {
                console.error('Error in status change callback:', error);
            }
        }
    }

    /**
     * 获取统计信息
     */
    getStats(): WorkerStats {
        const workers = this.getAllWorkers();

        return {
            totalWorkers: workers.length,
            onlineWorkers: workers.filter(w => w.status === 'online').length,
            busyWorkers: workers.filter(w => w.status === 'busy').length,
            offlineWorkers: workers.filter(w => w.status === 'offline').length,
            totalTasks: 0,     // 需要从任务管理器获取
            runningTasks: 0,   // 需要从任务管理器获取
            completedTasks: 0, // 需要从任务管理器获取
            failedTasks: 0     // 需要从任务管理器获取
        };
    }

    /**
     * 自动选择最优 Worker
     */
    selectBestWorker(requirements?: {
        platform?: string;
        capabilities?: string[];
        tags?: string[];
    }): WorkerNode | null {
        let candidates = this.getAvailableWorkers();

        // 根据要求过滤
        if (requirements) {
            if (requirements.platform) {
                candidates = candidates.filter(
                    w => w.platform === requirements.platform
                );
            }

            if (requirements.capabilities) {
                candidates = candidates.filter(w =>
                    requirements.capabilities!.every(cap =>
                        w.capabilities.includes(cap)
                    )
                );
            }

            if (requirements.tags) {
                candidates = candidates.filter(w =>
                    requirements.tags!.some(tag => w.tags.includes(tag))
                );
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        // 选择 CPU 使用率最低的
        candidates.sort((a, b) => (a.cpuUsage || 0) - (b.cpuUsage || 0));

        return candidates[0];
    }
}
