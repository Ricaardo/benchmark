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

// 测试记录类型
interface TestRecord {
    id: string;
    testCaseId?: string;
    name: string;
    runner: string;
    status: 'completed' | 'error';
    startTime: Date;
    endTime: Date;
    duration: number;
    perfcatId?: string;
    perfcatUrl?: string;
    perfcatChartUrl?: string;
    exitCode?: number;
    remarks?: string;
    reportFile?: string;
    errorMessage?: string;
    logFile?: string;  // 日志文件路径
}

export class DistributedTaskManager {
    private tasks: Map<string, DistributedTask> = new Map();
    private tasksFile: string;
    private testRecordsFile: string;
    private logsDir: string;
    private workerManager: WorkerManager;
    private taskUpdateCallbacks: Array<(task: DistributedTask) => void> = [];
    private workerMessageSender: ((workerId: string, message: WSMessage) => void) | null = null;

    constructor(
        workerManager: WorkerManager,
        dataDir: string = path.join(__dirname, '../data')
    ) {
        this.workerManager = workerManager;
        this.tasksFile = path.join(dataDir, 'distributed-tasks.json');
        this.testRecordsFile = path.join(dataDir, 'test-records.json');
        this.logsDir = path.join(dataDir, 'logs');

        // 确保日志目录存在
        this.ensureLogsDir();
    }

    /**
     * 确保日志目录存在
     */
    private async ensureLogsDir(): Promise<void> {
        try {
            await fs.mkdir(this.logsDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create logs directory:', error);
        }
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
            createdAt: Date.now(),
            name: testCase.name,  // 添加任务显示名称
            logs: []  // 初始化日志数组
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

        // 添加任务到 Worker（并发支持）
        const added = await this.workerManager.addTaskToWorker(task.workerId, task.id);
        if (!added) {
            console.error(`⚠️  Failed to add task to worker ${task.workerId}`);
            task.status = 'failed';
            task.error = 'Worker reached max concurrency';
            this.notifyTaskUpdate(task);
            return;
        }

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
     * 添加任务日志
     */
    appendTaskLog(taskId: string, logLine: string): boolean {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        if (!task.logs) {
            task.logs = [];
        }

        task.logs.push(logLine);

        // 保持日志在合理范围内（最多1000行）
        if (task.logs.length > 1000) {
            task.logs = task.logs.slice(-1000);
        }

        // 通知前端更新（但不保存到文件，减少I/O）
        this.notifyTaskUpdate(task);

        return true;
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
            // 初始化日志数组
            if (!task.logs) {
                task.logs = [];
            }
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

        // 从 Worker 移除任务（并发支持）
        await this.workerManager.removeTaskFromWorker(task.workerId, taskId);

        await this.saveTasks();
        this.notifyTaskUpdate(task);

        // 创建测试记录
        await this.createTestRecord(task, result);

        console.log(`✅ Task ${result.status}: ${taskId}`);

        return true;
    }

    /**
     * 保存任务日志到文件
     */
    private async saveTaskLogsToFile(task: DistributedTask): Promise<string | undefined> {
        try {
            // 确保日志目录存在
            await this.ensureLogsDir();

            if (!task.logs || task.logs.length === 0) {
                return undefined;
            }

            // 生成日志文件名: task_<taskId>_<timestamp>.log
            const timestamp = new Date().getTime();
            const logFileName = `task_${task.id}_${timestamp}.log`;
            const logFilePath = path.join(this.logsDir, logFileName);

            // 将日志数组写入文件
            const logContent = task.logs.join('\n');
            await fs.writeFile(logFilePath, logContent, 'utf-8');

            console.log(`💾 Saved task logs to: ${logFileName}`);

            return logFileName;
        } catch (error) {
            console.error('Failed to save task logs:', error);
            return undefined;
        }
    }

    /**
     * 创建测试记录
     */
    private async createTestRecord(task: DistributedTask, result: TaskExecutionResult): Promise<void> {
        try {
            // 保存日志到文件
            const logFileName = await this.saveTaskLogsToFile(task);

            // 读取现有测试记录
            let testRecords: TestRecord[] = [];
            try {
                const data = await fs.readFile(this.testRecordsFile, 'utf-8');
                testRecords = JSON.parse(data);
            } catch (error) {
                // 文件不存在，使用空数组
            }

            // 创建测试记录
            const startTime = new Date(task.createdAt);
            const endTime = new Date(task.completedAt!);
            const duration = task.completedAt! - task.createdAt;

            const record: TestRecord = {
                id: task.id,
                testCaseId: task.testCaseId,
                name: task.testCaseName,
                runner: task.runner,
                status: task.status === 'completed' ? 'completed' : 'error',
                startTime,
                endTime,
                duration,
                perfcatId: result.perfcatUrl ? result.perfcatUrl.split('/').pop() : undefined,
                perfcatUrl: result.perfcatUrl,
                perfcatChartUrl: result.perfcatUrl ? `${result.perfcatUrl}&viewType=chart` : undefined,
                exitCode: result.exitCode,
                reportFile: result.reportPath,
                errorMessage: result.error,
                logFile: logFileName  // 保存日志文件名
            };

            // 添加到记录列表
            testRecords.unshift(record);

            // 保持最多1000条记录
            if (testRecords.length > 1000) {
                testRecords = testRecords.slice(0, 1000);
            }

            // 保存
            await fs.writeFile(this.testRecordsFile, JSON.stringify(testRecords, null, 2));

            console.log(`📝 Test record created: ${task.testCaseName} (${task.status})`);

        } catch (error) {
            console.error('Failed to create test record:', error);
        }
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

        // 输出到控制台
        console.log(`[${task.workerName}] ${log}`);

        // 存储日志并通知前端更新
        this.appendTaskLog(taskId, log);
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
