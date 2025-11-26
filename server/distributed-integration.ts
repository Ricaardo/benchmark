/**
 * 分布式功能集成模块
 * 将分布式执行功能集成到现有的 Express 应用中
 */

import express from 'express';
import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { WorkerManager } from './worker-manager.js';
import { DistributedTaskManager } from './distributed-task-manager.js';
import { WebSocketManager } from './websocket-manager.js';
import { createDistributedRoutes } from './distributed-routes.js';

export class DistributedIntegration {
    private workerManager: WorkerManager;
    private taskManager: DistributedTaskManager;
    private wsManager: WebSocketManager | null = null;

    constructor(
        private app: express.Application,
        private server: Server,
        private dataDir: string = './data'
    ) {
        // 初始化管理器
        this.workerManager = new WorkerManager(dataDir);
        this.taskManager = new DistributedTaskManager(this.workerManager, dataDir);
    }

    /**
     * 初始化分布式功能
     */
    async initialize(): Promise<void> {
        console.log('\n🌐 Initializing distributed execution...\n');

        // 加载数据
        await this.workerManager.loadWorkers();
        await this.taskManager.loadTasks();

        // 启动心跳监控
        this.workerManager.startHeartbeatMonitor();

        // 设置 WebSocket
        this.setupWebSocket();

        // 注册 API 路由
        this.registerRoutes();

        // 设置任务消息发送器
        this.taskManager.setWorkerMessageSender((workerId, message) => {
            this.wsManager?.sendToWorker(workerId, message);
        });

        // 设置 Worker 状态变化监听 - 推送到前端
        this.workerManager.onStatusChange((worker) => {
            this.wsManager?.broadcastToClients({
                type: 'worker-status-update',
                data: worker,
                timestamp: Date.now()
            });
        });

        console.log('✅ Distributed execution initialized\n');
        this.printStatus();
    }

    /**
     * 设置 WebSocket
     */
    private setupWebSocket(): void {
        // 创建 WebSocket 服务器（使用 noServer 模式避免与现有 WebSocket 冲突）
        const wss = new WebSocketServer({ noServer: true });

        console.log('✅ WebSocket manager initialized');

        // 创建 WebSocket 管理器
        this.wsManager = new WebSocketManager(
            wss,
            this.workerManager,
            this.taskManager
        );
    }

    /**
     * 获取 WebSocket 服务器（供主服务器的 upgrade 事件使用）
     */
    getWebSocketServer() {
        return this.wsManager ? this.wsManager.getWebSocketServer() : null;
    }

    /**
     * 注册 API 路由
     */
    private registerRoutes(): void {
        const distributedRoutes = createDistributedRoutes(
            this.workerManager,
            this.taskManager
        );

        // 挂载分布式 API 路由
        this.app.use('/api', distributedRoutes);

        console.log('✅ Distributed API routes registered');
    }

    /**
     * 打印状态信息
     */
    private printStatus(): void {
        const workerStats = this.workerManager.getStats();
        const taskStats = this.taskManager.getStats();

        console.log('📊 Distributed Status:');
        console.log(`   Workers: ${workerStats.onlineWorkers} online, ${workerStats.offlineWorkers} offline`);
        console.log(`   Tasks: ${taskStats.running} running, ${taskStats.completed} completed`);
    }

    /**
     * 获取 Worker 管理器
     */
    getWorkerManager(): WorkerManager {
        return this.workerManager;
    }

    /**
     * 获取任务管理器
     */
    getTaskManager(): DistributedTaskManager {
        return this.taskManager;
    }

    /**
     * 获取 WebSocket 管理器
     */
    getWebSocketManager(): WebSocketManager | null {
        return this.wsManager;
    }

    /**
     * 清理资源
     */
    async cleanup(): Promise<void> {
        console.log('\n🛑 Shutting down distributed execution...\n');

        this.workerManager.stopHeartbeatMonitor();
        this.wsManager?.cleanup();

        console.log('✅ Distributed execution shutdown complete');
    }
}

/**
 * 为现有应用添加分布式功能
 * 在 server/index.ts 中调用此函数
 */
export async function enableDistributedExecution(
    app: express.Application,
    server: Server,
    dataDir?: string
): Promise<DistributedIntegration> {
    const integration = new DistributedIntegration(app, server, dataDir);
    await integration.initialize();
    return integration;
}
