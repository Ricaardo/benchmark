/**
 * 分布式任务管理器
 * 负责管理分布式任务的创建、分发、执行、结果收集
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import {
    DistributedTask,
    TaskDispatchRequest,
    TaskExecutionResult,
    DistributedTaskStatus,
    WSMessage
} from './types.js';
import { WorkerManager } from './worker-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DistributedTaskManager {
    private tasks: Map<string, DistributedTask> = new Map();
    private tasksFile: string;
    private workerManager: WorkerManager;
    private taskUpdateCallbacks: Array<(task: DistributedTask) => void> = [];
    private workerMessageSender: ((workerId: string, message: WSMessage) => void) | null = null;

    constructor(
        workerManager: WorkerManager,
        dataDir: string = path.join(__dirname, '../data')
    ) {
        this.workerManager = workerManager;
        this.tasksFile = path.join(dataDir, 'distributed-tasks.json');
    }

    /**
     * 设置 Worker 消息发送器
     */
    setWorkerMessageSender(sender: (workerId: string, message: WSMessage) => void): void {
        this.workerMessageSender = sender;
    }

    /**
     * 加载任务历史
     */
    async loadTasks(): Promise<void> {
        try {
            const data = await fs.readFile(this.tasksFile, 'utf-8');
            const tasksData = JSON.parse(data);

            for (const task of tasksData) {
                this.tasks.set(task.id, task);
            }

            console.log(`✅ Loaded ${this.tasks.size} distributed tasks`);
        } catch (error) {
            if ((error as any).code !== 'ENOENT') {
                console.error('Failed to load distributed tasks:', error);
            }
        }
    }

    /**
     * 保存任务到文件
     */
    private async saveTasks(): Promise<void> {
        try {
            const tasksData = Array.from(this.tasks.values());
            await fs.writeFile(
                this.tasksFile,
                JSON.stringify(tasksData, null, 2)
            );
        } catch (error) {
            console.error('Failed to save distributed tasks:', error);
        }
    }

    /**
     * 创建分布式任务
     */
    async createTask(
        request: TaskDispatchRequest,
        testCase: any
    ): Promise<{ taskId: string; workerName: string } | null> {
        // 获取 Worker
        let worker;
        if (request.workerId) {
            worker = this.workerManager.getWorker(request.workerId);
            if (!worker || worker.status !== 'online') {
                return null;
            }
        } else {
            // 自动选择最优 Worker
            worker = this.workerManager.selectBestWorker();
            if (!worker) {
                return null;
            }
        }

        // 创建任务
        const taskId = crypto.randomUUID();
        const task: DistributedTask = {
            id: taskId,
            testCaseId: request.testCaseId,
            testCaseName: testCase.name,
            workerId: worker.id,
            workerName: worker.name,
            runner: request.runner,
            status: 'pending',
            progress: 0,
            createdAt: Date.now()
        };

        this.tasks.set(taskId, task);
        await this.saveTasks();

        // 分发任务到 Worker
        await this.dispatchTask(task, testCase);

        console.log(`✅ Task created: ${taskId} -> ${worker.name}`);

        return { taskId, workerName: worker.name };
    }

    /**
     * 分发任务到 Worker
     */
    private async dispatchTask(task: DistributedTask, testCase: any): Promise<void> {
        // 更新任务状态
        task.status = 'dispatched';
        task.dispatchedAt = Date.now();
        this.notifyTaskUpdate(task);

        // 更新 Worker 状态
        await this.workerManager.updateWorkerTask(task.workerId, task.id);

        // 通过 WebSocket 发送任务到 Worker
        if (this.workerMessageSender) {
            const message: WSMessage = {
                type: 'task-assigned',
                data: {
                    taskId: task.id,
                    testCase,
                    runner: task.runner
                },
                timestamp: Date.now()
            };

            this.workerMessageSender(task.workerId, message);
        }
    }

    /**
     * 更新任务状态
     */
    async updateTaskStatus(
        taskId: string,
        status: DistributedTaskStatus,
        data?: Partial<DistributedTask>
    ): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        task.status = status;

        if (status === 'running' && !task.startedAt) {
            task.startedAt = Date.now();
        }

        if (status === 'completed' || status === 'failed') {
            task.completedAt = Date.now();
            // 释放 Worker
            await this.workerManager.updateWorkerTask(task.workerId, undefined);
        }

        // 更新其他数据
        if (data) {
            Object.assign(task, data);
        }

        await this.saveTasks();
        this.notifyTaskUpdate(task);

        return true;
    }

    /**
     * 完成任务
     */
    async completeTask(
        taskId: string,
        result: TaskExecutionResult
    ): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        task.status = result.status === 'completed' ? 'completed' : 'failed';
        task.completedAt = Date.now();
        task.exitCode = result.exitCode;
        task.error = result.error;
        task.perfcatUrl = result.perfcatUrl;
        task.localReportPath = result.reportPath;
        task.progress = 100;

        // 释放 Worker
        await this.workerManager.updateWorkerTask(task.workerId, undefined);

        await this.saveTasks();
        this.notifyTaskUpdate(task);

        console.log(`✅ Task ${result.status}: ${taskId}`);

        return true;
    }

    /**
     * 取消任务
     */
    async cancelTask(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
            return false;
        }

        task.status = 'cancelled';
        task.completedAt = Date.now();

        // 释放 Worker
        await this.workerManager.updateWorkerTask(task.workerId, undefined);

        await this.saveTasks();
        this.notifyTaskUpdate(task);

        // 通知 Worker 取消任务
        if (this.workerMessageSender) {
            const message: WSMessage = {
                type: 'task-cancelled' as any,
                data: { taskId },
                timestamp: Date.now()
            };

            this.workerMessageSender(task.workerId, message);
        }

        return true;
    }

    /**
     * 获取单个任务
     */
    getTask(taskId: string): DistributedTask | undefined {
        return this.tasks.get(taskId);
    }

    /**
     * 获取所有任务
     */
    getAllTasks(): DistributedTask[] {
        return Array.from(this.tasks.values());
    }

    /**
     * 获取指定 Worker 的任务
     */
    getTasksByWorker(workerId: string): DistributedTask[] {
        return this.getAllTasks().filter(t => t.workerId === workerId);
    }

    /**
     * 获取指定状态的任务
     */
    getTasksByStatus(status: DistributedTaskStatus): DistributedTask[] {
        return this.getAllTasks().filter(t => t.status === status);
    }

    /**
     * 获取运行中的任务
     */
    getRunningTasks(): DistributedTask[] {
        return this.getAllTasks().filter(
            t => t.status === 'dispatched' || t.status === 'running'
        );
    }

    /**
     * 删除任务
     */
    async deleteTask(taskId: string): Promise<boolean> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        // 只能删除已完成或已取消的任务
        if (task.status !== 'completed' && task.status !== 'failed' && task.status !== 'cancelled') {
            return false;
        }

        this.tasks.delete(taskId);
        await this.saveTasks();

        return true;
    }

    /**
     * 清理已完成的任务
     */
    async clearCompletedTasks(): Promise<number> {
        const completedTasks = this.getAllTasks().filter(
            t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled'
        );

        for (const task of completedTasks) {
            this.tasks.delete(task.id);
        }

        await this.saveTasks();

        return completedTasks.length;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const tasks = this.getAllTasks();

        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            dispatched: tasks.filter(t => t.status === 'dispatched').length,
            running: tasks.filter(t => t.status === 'running').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
            cancelled: tasks.filter(t => t.status === 'cancelled').length
        };
    }

    /**
     * 注册任务更新回调
     */
    onTaskUpdate(callback: (task: DistributedTask) => void): void {
        this.taskUpdateCallbacks.push(callback);
    }

    /**
     * 通知任务更新
     */
    private notifyTaskUpdate(task: DistributedTask): void {
        for (const callback of this.taskUpdateCallbacks) {
            try {
                callback(task);
            } catch (error) {
                console.error('Error in task update callback:', error);
            }
        }
    }

    /**
     * 处理 Worker 日志
     */
    handleWorkerLog(taskId: string, log: string): void {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }

        // 这里可以存储日志或转发给前端
        // 简化处理，直接输出
        console.log(`[${task.workerName}] ${log}`);
    }

    /**
     * 更新任务进度
     */
    async updateTaskProgress(taskId: string, progress: number): Promise<void> {
        const task = this.tasks.get(taskId);
        if (!task) {
            return;
        }

        task.progress = Math.min(100, Math.max(0, progress));
        this.notifyTaskUpdate(task);
    }
}
