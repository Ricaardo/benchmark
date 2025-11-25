/**
 * WebSocket 管理器
 * 处理 Master 与 Worker/Client 之间的 WebSocket 通信
 */

import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { WSMessage, WorkerNode, DistributedTask } from './types.js';
import { WorkerManager } from './worker-manager.js';
import { DistributedTaskManager } from './distributed-task-manager.js';

interface ConnectionInfo {
    ws: WebSocket;
    type: 'worker' | 'client';
    id: string; // workerId 或 clientId
    connectedAt: number;
}

export class WebSocketManager {
    private connections: Map<string, ConnectionInfo> = new Map();
    private workerConnections: Map<string, WebSocket> = new Map(); // workerId -> ws
    private clientConnections: Set<WebSocket> = new Set(); // 前端客户端连接

    constructor(
        private wss: WebSocketServer,
        private workerManager: WorkerManager,
        private taskManager: DistributedTaskManager
    ) {
        this.setupWebSocketServer();
        this.setupEventListeners();
    }

    /**
     * 设置 WebSocket 服务器
     */
    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            this.handleConnection(ws, req);
        });

        console.log('✅ WebSocket manager initialized');
    }

    /**
     * 处理新连接
     */
    private handleConnection(ws: WebSocket, req: IncomingMessage): void {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const workerId = url.searchParams.get('workerId');
        const clientId = url.searchParams.get('clientId') || this.generateId();

        if (workerId) {
            // Worker 连接
            this.handleWorkerConnection(ws, workerId);
        } else {
            // 前端客户端连接
            this.handleClientConnection(ws, clientId);
        }
    }

    /**
     * 处理 Worker 连接
     */
    private handleWorkerConnection(ws: WebSocket, workerId: string): void {
        console.log(`🔌 Worker connected: ${workerId}`);

        this.workerConnections.set(workerId, ws);
        this.connections.set(workerId, {
            ws,
            type: 'worker',
            id: workerId,
            connectedAt: Date.now()
        });

        // 发送欢迎消息
        this.sendToWorker(workerId, {
            type: 'worker-registered',
            data: { workerId },
            timestamp: Date.now()
        });

        // 设置消息处理
        ws.on('message', (data: Buffer) => {
            this.handleWorkerMessage(workerId, data);
        });

        // 处理断开
        ws.on('close', () => {
            console.log(`❌ Worker disconnected: ${workerId}`);
            this.workerConnections.delete(workerId);
            this.connections.delete(workerId);

            // 通知所有客户端
            this.broadcastToClients({
                type: 'worker-offline',
                data: { workerId },
                timestamp: Date.now()
            });
        });

        ws.on('error', (error) => {
            console.error(`Worker ${workerId} error:`, error);
        });
    }

    /**
     * 处理前端客户端连接
     */
    private handleClientConnection(ws: WebSocket, clientId: string): void {
        console.log(`🔌 Client connected: ${clientId}`);

        this.clientConnections.add(ws);
        this.connections.set(clientId, {
            ws,
            type: 'client',
            id: clientId,
            connectedAt: Date.now()
        });

        // 发送初始状态
        this.sendInitialState(ws);

        // 设置消息处理
        ws.on('message', (data: Buffer) => {
            this.handleClientMessage(clientId, data);
        });

        // 处理断开
        ws.on('close', () => {
            console.log(`❌ Client disconnected: ${clientId}`);
            this.clientConnections.delete(ws);
            this.connections.delete(clientId);
        });

        ws.on('error', (error) => {
            console.error(`Client ${clientId} error:`, error);
        });
    }

    /**
     * 处理 Worker 消息
     */
    private handleWorkerMessage(workerId: string, data: Buffer): void {
        try {
            const message: WSMessage = JSON.parse(data.toString());

            switch (message.type) {
                case 'task-progress':
                    this.handleTaskProgress(message.data);
                    break;

                case 'task-log':
                    this.handleTaskLog(message.data);
                    break;

                case 'task-completed':
                    this.handleTaskCompleted(message.data);
                    break;

                case 'task-failed':
                    this.handleTaskFailed(message.data);
                    break;

                default:
                    console.log(`Unknown message type from worker: ${message.type}`);
            }

            // 转发到所有客户端
            this.broadcastToClients(message);

        } catch (error) {
            console.error('Failed to parse worker message:', error);
        }
    }

    /**
     * 处理客户端消息
     */
    private handleClientMessage(clientId: string, data: Buffer): void {
        try {
            const message: WSMessage = JSON.parse(data.toString());

            // 客户端消息处理（如果需要）
            console.log(`Message from client ${clientId}:`, message.type);

        } catch (error) {
            console.error('Failed to parse client message:', error);
        }
    }

    /**
     * 处理任务进度更新
     */
    private async handleTaskProgress(data: any): Promise<void> {
        const { taskId, progress } = data;
        await this.taskManager.updateTaskProgress(taskId, progress);
    }

    /**
     * 处理任务日志
     */
    private handleTaskLog(data: any): void {
        const { taskId, log } = data;
        this.taskManager.handleWorkerLog(taskId, log);
    }

    /**
     * 处理任务完成
     */
    private async handleTaskCompleted(data: any): Promise<void> {
        // 任务完成已在 Worker client 中通过 HTTP API 上报
        // 这里只是额外的 WebSocket 通知
    }

    /**
     * 处理任务失败
     */
    private async handleTaskFailed(data: any): Promise<void> {
        // 任务失败已在 Worker client 中通过 HTTP API 上报
        // 这里只是额外的 WebSocket 通知
    }

    /**
     * 发送初始状态给客户端
     */
    private sendInitialState(ws: WebSocket): void {
        // 发送所有 Worker 状态
        const workers = this.workerManager.getAllWorkers();
        this.sendMessage(ws, {
            type: 'workers-list' as any,
            data: { workers },
            timestamp: Date.now()
        });

        // 发送运行中的任务
        const tasks = this.taskManager.getRunningTasks();
        this.sendMessage(ws, {
            type: 'tasks-list' as any,
            data: { tasks },
            timestamp: Date.now()
        });
    }

    /**
     * 发送消息到指定 Worker
     */
    sendToWorker(workerId: string, message: WSMessage): boolean {
        const ws = this.workerConnections.get(workerId);
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        this.sendMessage(ws, message);
        return true;
    }

    /**
     * 广播消息到所有客户端
     */
    broadcastToClients(message: WSMessage): void {
        for (const ws of this.clientConnections) {
            if (ws.readyState === WebSocket.OPEN) {
                this.sendMessage(ws, message);
            }
        }
    }

    /**
     * 广播消息到所有 Worker
     */
    broadcastToWorkers(message: WSMessage): void {
        for (const ws of this.workerConnections.values()) {
            if (ws.readyState === WebSocket.OPEN) {
                this.sendMessage(ws, message);
            }
        }
    }

    /**
     * 广播消息到所有连接
     */
    broadcastToAll(message: WSMessage): void {
        for (const conn of this.connections.values()) {
            if (conn.ws.readyState === WebSocket.OPEN) {
                this.sendMessage(conn.ws, message);
            }
        }
    }

    /**
     * 发送消息
     */
    private sendMessage(ws: WebSocket, message: WSMessage): void {
        try {
            ws.send(JSON.stringify(message));
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    }

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 监听 Worker 状态变化
        this.workerManager.onStatusChange((worker: WorkerNode) => {
            this.broadcastToClients({
                type: 'worker-status-update',
                data: worker,
                timestamp: Date.now()
            });
        });

        // 监听任务状态变化
        this.taskManager.onTaskUpdate((task: DistributedTask) => {
            this.broadcastToClients({
                type: task.status === 'completed' ? 'task-completed' :
                      task.status === 'failed' ? 'task-failed' :
                      'task-progress' as any,
                data: task,
                timestamp: Date.now()
            });
        });
    }

    /**
     * 生成唯一 ID
     */
    private generateId(): string {
        return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取连接统计
     */
    getStats() {
        return {
            totalConnections: this.connections.size,
            workerConnections: this.workerConnections.size,
            clientConnections: this.clientConnections.size
        };
    }

    /**
     * 清理所有连接
     */
    cleanup(): void {
        for (const conn of this.connections.values()) {
            conn.ws.close();
        }
        this.connections.clear();
        this.workerConnections.clear();
        this.clientConnections.clear();
    }
}
