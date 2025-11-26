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
     * 生成稳定的 Worker ID（基于名称和主机）
     */
    private generateStableWorkerId(name: string, host: string): string {
        const input = `${name}@${host}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');
        // 使用前8个字符作为短 ID，保持与 UUID 格式类似
        return `worker-${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
    }

    /**
     * 注册新的 Worker 节点
     */
    async registerWorker(registration: WorkerRegistration): Promise<string> {
        // 使用稳定的 ID（基于名称和主机）以支持重连
        const stableId = this.generateStableWorkerId(registration.name, registration.host);

        // 检查是否已存在该 Worker（重连场景）
        const existingWorker = this.workers.get(stableId);
        if (existingWorker) {
            console.log(`🔄 Worker reconnected: ${registration.name} (${stableId})`);
            // 更新状态和心跳
            existingWorker.status = 'online';
            existingWorker.lastHeartbeat = Date.now();
            // 更新可能变化的信息
            existingWorker.cpuCount = registration.cpuCount;
            existingWorker.memory = registration.memory;
            existingWorker.capabilities = registration.capabilities || [];
            existingWorker.tags = registration.tags || [];
            // 更新并发配置
            existingWorker.maxConcurrency = registration.maxConcurrency || Math.max(2, registration.cpuCount);
            // 确保 currentTasks 数组存在（兼容旧版）
            if (!existingWorker.currentTasks) {
                existingWorker.currentTasks = existingWorker.currentTask ? [existingWorker.currentTask] : [];
            }
            if (registration.performanceTier) {
                existingWorker.performanceTier = registration.performanceTier;
            }
            if (registration.description) {
                existingWorker.description = registration.description;
            }
            await this.saveWorkers();
            this.notifyStatusChange(existingWorker);
            return stableId;
        }

        // 新 Worker 注册
        const workerId = stableId;

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
            registeredAt: Date.now(),
            currentTasks: [],  // 并发任务列表
            maxConcurrency: registration.maxConcurrency || Math.max(2, registration.cpuCount)  // 默认为CPU核心数，最少2
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
     * 获取可用的 Worker 节点（在线且未达到并发上限）
     */
    getAvailableWorkers(): WorkerNode[] {
        return this.getAllWorkers().filter(w => {
            if (w.status !== 'online') return false;

            // 确保 currentTasks 数组存在（兼容旧版）
            const currentTasks = w.currentTasks || (w.currentTask ? [w.currentTask] : []);

            // 检查是否还有并发容量
            return currentTasks.length < w.maxConcurrency;
        });
    }

    /**
     * 获取 Worker 的当前并发数
     */
    getWorkerConcurrency(workerId: string): number {
        const worker = this.workers.get(workerId);
        if (!worker) return 0;

        const currentTasks = worker.currentTasks || (worker.currentTask ? [worker.currentTask] : []);
        return currentTasks.length;
    }

    /**
     * 检查 Worker 是否可接受新任务
     */
    isWorkerAvailable(workerId: string): boolean {
        const worker = this.workers.get(workerId);
        if (!worker || worker.status !== 'online') return false;

        const currentTasks = worker.currentTasks || (worker.currentTask ? [worker.currentTask] : []);
        return currentTasks.length < worker.maxConcurrency;
    }

    /**
     * 添加任务到 Worker（并发支持）
     */
    async addTaskToWorker(workerId: string, taskId: string): Promise<boolean> {
        const worker = this.workers.get(workerId);
        if (!worker) {
            return false;
        }

        // 确保 currentTasks 数组存在
        if (!worker.currentTasks) {
            worker.currentTasks = [];
        }

        // 检查是否已达到并发上限
        if (worker.currentTasks.length >= worker.maxConcurrency) {
            console.log(`⚠️  Worker ${worker.name} has reached max concurrency (${worker.maxConcurrency})`);
            return false;
        }

        // 添加任务
        if (!worker.currentTasks.includes(taskId)) {
            worker.currentTasks.push(taskId);
            console.log(`📌 Task ${taskId.substring(0, 8)}... added to ${worker.name} (${worker.currentTasks.length}/${worker.maxConcurrency})`);
        }

        // 保留 currentTask 以兼容旧版（设置为第一个任务）
        worker.currentTask = worker.currentTasks[0];

        // 更新状态：如果有任务则为 busy，否则为 online
        worker.status = worker.currentTasks.length > 0 ? 'busy' : 'online';

        await this.saveWorkers();
        this.notifyStatusChange(worker);

        return true;
    }

    /**
     * 从 Worker 移除任务（并发支持）
     */
    async removeTaskFromWorker(workerId: string, taskId: string): Promise<void> {
        const worker = this.workers.get(workerId);
        if (!worker) {
            return;
        }

        // 确保 currentTasks 数组存在
        if (!worker.currentTasks) {
            worker.currentTasks = [];
        }

        // 移除任务
        const index = worker.currentTasks.indexOf(taskId);
        if (index > -1) {
            worker.currentTasks.splice(index, 1);
            console.log(`📍 Task ${taskId.substring(0, 8)}... removed from ${worker.name} (${worker.currentTasks.length}/${worker.maxConcurrency})`);
        }

        // 更新 currentTask（兼容旧版）
        worker.currentTask = worker.currentTasks.length > 0 ? worker.currentTasks[0] : undefined;

        // 更新状态：如果没有任务则为 online，否则为 busy
        worker.status = worker.currentTasks.length > 0 ? 'busy' : 'online';

        await this.saveWorkers();
        this.notifyStatusChange(worker);
    }

    /**
     * 更新 Worker 任务状态（兼容旧版 API）
     * @deprecated 使用 addTaskToWorker 和 removeTaskFromWorker 代替
     */
    async updateWorkerTask(workerId: string, taskId: string | undefined): Promise<void> {
        if (taskId) {
            await this.addTaskToWorker(workerId, taskId);
        } else {
            // 移除所有任务
            const worker = this.workers.get(workerId);
            if (worker && worker.currentTasks) {
                for (const tid of [...worker.currentTasks]) {
                    await this.removeTaskFromWorker(workerId, tid);
                }
            }
        }
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
