/**
 * 分布式执行 API 路由
 * 提供 Worker 管理和分布式任务的 REST API
 */

import express from 'express';
import { WorkerManager } from './worker-manager.js';
import { DistributedTaskManager } from './distributed-task-manager.js';
import * as TestCaseStorage from './testcase-storage.js';

export function createDistributedRoutes(
    workerManager: WorkerManager,
    taskManager: DistributedTaskManager
): express.Router {
    const router = express.Router();

    // ==================== Worker 管理 API ====================

    /**
     * 注册 Worker 节点
     * POST /api/workers/register
     */
    router.post('/workers/register', async (req, res) => {
        try {
            const workerId = await workerManager.registerWorker(req.body);
            res.json({
                success: true,
                workerId,
                message: 'Worker registered successfully'
            });
        } catch (error) {
            console.error('Worker registration failed:', error);
            res.status(500).json({
                error: 'Failed to register worker',
                message: (error as Error).message
            });
        }
    });

    /**
     * 获取所有 Worker 节点
     * GET /api/workers
     */
    router.get('/workers', (req, res) => {
        const workers = workerManager.getAllWorkers();
        const stats = workerManager.getStats();

        res.json({
            workers,
            stats
        });
    });

    /**
     * 获取单个 Worker 节点详情
     * GET /api/workers/:workerId
     */
    router.get('/workers/:workerId', (req, res) => {
        const { workerId } = req.params;
        const worker = workerManager.getWorker(workerId);

        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }

        // 获取该 Worker 的任务历史
        const tasks = taskManager.getTasksByWorker(workerId);

        res.json({
            ...worker,
            tasks: tasks.slice(0, 10), // 最近 10 个任务
            taskCount: tasks.length
        });
    });

    /**
     * Worker 心跳
     * POST /api/workers/:workerId/heartbeat
     */
    router.post('/workers/:workerId/heartbeat', async (req, res) => {
        const { workerId } = req.params;
        const success = await workerManager.updateHeartbeat(workerId, req.body);

        if (!success) {
            return res.status(404).json({ error: 'Worker not found' });
        }

        res.json({
            success: true,
            message: 'Heartbeat received'
        });
    });

    /**
     * 注销 Worker 节点
     * DELETE /api/workers/:workerId
     */
    router.delete('/workers/:workerId', async (req, res) => {
        const { workerId } = req.params;
        const success = await workerManager.unregisterWorker(workerId);

        if (!success) {
            return res.status(404).json({ error: 'Worker not found' });
        }

        res.json({
            success: true,
            message: 'Worker unregistered successfully'
        });
    });

    /**
     * 获取在线 Worker 列表
     * GET /api/workers/online
     */
    router.get('/workers/status/online', (req, res) => {
        const workers = workerManager.getOnlineWorkers();
        res.json({ workers });
    });

    /**
     * 获取可用 Worker 列表（在线且不忙）
     * GET /api/workers/available
     */
    router.get('/workers/status/available', (req, res) => {
        const workers = workerManager.getAvailableWorkers();
        res.json({ workers });
    });

    // ==================== 分布式任务 API ====================

    /**
     * 创建分布式任务
     * POST /api/distributed-tasks
     */
    router.post('/distributed-tasks', async (req, res) => {
        try {
            const { testCaseId, workerId, runner, config } = req.body;

            // 验证必填字段
            if (!testCaseId || !runner) {
                return res.status(400).json({
                    error: 'Missing required fields: testCaseId, runner'
                });
            }

            // 获取测试用例
            const testCase = TestCaseStorage.getTestCaseById(testCaseId);
            if (!testCase) {
                return res.status(404).json({ error: 'Test case not found' });
            }

            // 验证 runner
            if (!testCase.runners || !(testCase.runners as any)[runner]?.enabled) {
                return res.status(400).json({
                    error: `Runner "${runner}" is not enabled for this test case`
                });
            }

            // 合并配置：前端发送的 config 优先于测试用例中的配置
            const mergedTestCase = {
                ...testCase,
                ...(config || {})
            };

            // 创建任务
            const result = await taskManager.createTask(
                { testCaseId, workerId, runner },
                mergedTestCase
            );

            if (!result) {
                return res.status(503).json({
                    error: 'No available worker',
                    message: workerId
                        ? 'Specified worker is not available'
                        : 'No online workers found'
                });
            }

            res.json({
                success: true,
                taskId: result.taskId,
                workerName: result.workerName,
                message: `Task dispatched to ${result.workerName}`
            });
        } catch (error) {
            console.error('Task creation failed:', error);
            res.status(500).json({
                error: 'Failed to create task',
                message: (error as Error).message
            });
        }
    });

    /**
     * 获取所有分布式任务
     * GET /api/distributed-tasks
     */
    router.get('/distributed-tasks', (req, res) => {
        const { workerId, status, limit = '50' } = req.query;

        let tasks = taskManager.getAllTasks();

        // 过滤
        if (workerId) {
            tasks = tasks.filter(t => t.workerId === workerId);
        }

        if (status) {
            tasks = tasks.filter(t => t.status === status);
        }

        // 排序（最新的在前）
        tasks.sort((a, b) => b.createdAt - a.createdAt);

        // 限制数量
        const limitNum = parseInt(limit as string);
        tasks = tasks.slice(0, limitNum);

        const stats = taskManager.getStats();

        res.json({
            tasks,
            stats,
            total: tasks.length
        });
    });

    /**
     * 获取单个任务详情
     * GET /api/distributed-tasks/:taskId
     */
    router.get('/distributed-tasks/:taskId', (req, res) => {
        const { taskId } = req.params;
        const task = taskManager.getTask(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // 获取关联的 Worker 信息
        const worker = workerManager.getWorker(task.workerId);

        res.json({
            ...task,
            worker
        });
    });

    /**
     * 更新任务状态
     * PUT /api/distributed-tasks/:taskId/status
     */
    router.put('/distributed-tasks/:taskId/status', async (req, res) => {
        const { taskId } = req.params;
        const { status, ...data } = req.body;

        const success = await taskManager.updateTaskStatus(taskId, status, data);

        if (!success) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
            success: true,
            message: 'Task status updated'
        });
    });

    /**
     * 完成任务
     * POST /api/distributed-tasks/:taskId/complete
     */
    router.post('/distributed-tasks/:taskId/complete', async (req, res) => {
        const { taskId } = req.params;
        const success = await taskManager.completeTask(taskId, req.body);

        if (!success) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
            success: true,
            message: 'Task completed'
        });
    });

    /**
     * 取消任务
     * POST /api/distributed-tasks/:taskId/cancel
     */
    router.post('/distributed-tasks/:taskId/cancel', async (req, res) => {
        const { taskId } = req.params;
        const success = await taskManager.cancelTask(taskId);

        if (!success) {
            return res.status(400).json({
                error: 'Cannot cancel task',
                message: 'Task not found or already completed'
            });
        }

        res.json({
            success: true,
            message: 'Task cancelled'
        });
    });

    /**
     * 删除任务
     * DELETE /api/distributed-tasks/:taskId
     */
    router.delete('/distributed-tasks/:taskId', async (req, res) => {
        const { taskId } = req.params;
        const success = await taskManager.deleteTask(taskId);

        if (!success) {
            return res.status(400).json({
                error: 'Cannot delete task',
                message: 'Task not found or still running'
            });
        }

        res.json({
            success: true,
            message: 'Task deleted'
        });
    });

    /**
     * 清理已完成的任务
     * POST /api/distributed-tasks/clear-completed
     */
    router.post('/distributed-tasks/clear-completed', async (req, res) => {
        const count = await taskManager.clearCompletedTasks();

        res.json({
            success: true,
            message: `Cleared ${count} completed tasks`,
            count
        });
    });

    /**
     * 获取运行中的任务
     * GET /api/distributed-tasks/running
     */
    router.get('/distributed-tasks/status/running', (req, res) => {
        const tasks = taskManager.getRunningTasks();
        res.json({ tasks });
    });

    /**
     * 获取任务统计
     * GET /api/distributed-tasks/stats
     */
    router.get('/distributed-tasks/statistics', (req, res) => {
        const stats = taskManager.getStats();
        const workerStats = workerManager.getStats();

        res.json({
            tasks: stats,
            workers: workerStats
        });
    });

    return router;
}
