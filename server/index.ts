import express from 'express';
import cors from 'cors';
import { exec, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';
import LZ from 'lz-string';
import * as TestCaseStorage from './testcase-storage.js';

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

// Perfcat配置
interface PerfcatConfig {
    url: string;
    cookie: string;
}

let perfcatConfig: PerfcatConfig = {
    url: 'https://fe-perfcat.bilibili.co/api/v1/perfcat/shorten',
    cookie: ''
};
const perfcatConfigFile = path.join(__dirname, '../perfcat-config.json');

// 测试记录
interface TestRecord {
    id: string;
    testCaseId?: string; // 关联的测试用例ID
    name: string;
    runner: string;
    status: 'completed' | 'error';
    startTime: Date;
    endTime: Date;
    duration: number; // 毫秒
    perfcatId?: string;
    perfcatUrl?: string;
    perfcatChartUrl?: string;
    exitCode?: number;
    remarks?: string; // 备注：测试目的、版本等信息
    reportFile?: string; // 本地报告文件名
    errorMessage?: string; // 错误信息（失败时）
}

let testRecords: TestRecord[] = [];
const testRecordsFile = path.join(__dirname, '../test-records.json');

// 加载测试记录
async function loadTestRecords() {
    try {
        const data = await fs.readFile(testRecordsFile, 'utf-8');
        const records = JSON.parse(data);
        // 转换日期字符串为Date对象
        testRecords = records.map((r: any) => ({
            ...r,
            startTime: new Date(r.startTime),
            endTime: new Date(r.endTime)
        }));
    } catch {
        testRecords = [];
    }
}

// 保存测试记录
async function saveTestRecords() {
    try {
        await fs.writeFile(testRecordsFile, JSON.stringify(testRecords, null, 2));
    } catch (error) {
        console.error('Failed to save test records:', error);
    }
}

// 添加测试记录
async function addTestRecord(record: TestRecord) {
    testRecords.unshift(record); // 最新的记录在最前面
    // 只保留最近1000条记录
    if (testRecords.length > 1000) {
        testRecords = testRecords.slice(0, 1000);
    }
    await saveTestRecords();

    // 如果有关联的测试用例，更新其执行历史
    if (record.testCaseId) {
        await TestCaseStorage.addExecutionToHistory(record.testCaseId, record.id);
    }
}

// 加载Perfcat配置
async function loadPerfcatConfig() {
    try {
        const data = await fs.readFile(perfcatConfigFile, 'utf-8');
        const config = JSON.parse(data);
        perfcatConfig = { ...perfcatConfig, ...config };
    } catch {
        // 使用默认配置
    }
}

// 保存Perfcat配置
async function savePerfcatConfig() {
    await fs.writeFile(perfcatConfigFile, JSON.stringify(perfcatConfig, null, 2));
}

// 上传测试报告到Perfcat并获取短链
async function uploadToPerfcat(reportData: any): Promise<{ success: boolean; id?: string; url?: string; error?: string }> {
    if (!perfcatConfig.cookie) {
        console.warn('[Perfcat] Cookie未配置，跳过上传');
        return { success: false, error: 'Cookie not configured' };
    }

    try {
        console.log('[Perfcat] 开始上传测试报告...');

        const response = await fetch(perfcatConfig.url, {
            method: 'POST',
            headers: {
                'Accept-Language': 'zh-CN,zh;q=0.9',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Cookie': perfcatConfig.cookie,
                'Origin': 'https://fe-perfcat.bilibili.co',
                'Pragma': 'no-cache',
                'Referer': 'https://fe-perfcat.bilibili.co/utils/upload',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                'accept': 'application/json',
                'content-type': 'application/json',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"'
            },
            body: JSON.stringify({ data: LZ.compressToBase64(JSON.stringify(reportData)) })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json() as { id: string };
        const shortId = result.id;

        console.log(`[Perfcat] ✅ 上传成功，短链ID: ${shortId}`);

        return {
            success: true,
            id: shortId,
            url: `https://fe-perfcat.bilibili.co/utils/shorten/${shortId}`
        };
    } catch (error) {
        console.error('[Perfcat] ❌ 上传失败:', error);
        return {
            success: false,
            error: (error as Error).message
        };
    }
}

// ==================== 多任务管理系统 ====================

interface Task {
    id: string;
    testCaseId?: string; // 关联的测试用例ID
    name: string;
    runner: string;
    status: 'pending' | 'running' | 'completed' | 'error';
    output: string;
    process: ChildProcess | null;
    startTime: Date;
    endTime?: Date;
    config: any;
    killTimeout?: NodeJS.Timeout;
    perfcatId?: string;
    perfcatUrl?: string;
    remarks?: string; // 备注：测试目的、版本等信息
}

// 任务存储
const tasks = new Map<string, Task>();

// 最大并发任务数
const MAX_CONCURRENT_TASKS = 10;

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
function createTask(name: string, runner: string, config: any, testCaseId?: string, remarks?: string): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: Task = {
        id: taskId,
        testCaseId, // 关联测试用例ID
        name,
        runner,
        status: 'pending',
        output: '',
        process: null,
        startTime: new Date(),
        config,
        remarks // 备注：测试目的、版本等信息
    };

    tasks.set(taskId, task);

    const runningCount = getRunningTasksCount();
    const pendingCount = Array.from(tasks.values()).filter(t => t.status === 'pending').length;
    console.log(`[TaskManager] 任务已创建: ${name} (ID: ${taskId})${testCaseId ? ` [TestCase: ${testCaseId}]` : ''}`);
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
        appendTaskOutput(taskId, `\n${'-'.repeat(60)}\n`);
        appendTaskOutput(taskId, `⏳ 等待其他任务完成...\n`);
        appendTaskOutput(taskId, `当前并发: ${runningCount}/${MAX_CONCURRENT_TASKS}\n`);
        appendTaskOutput(taskId, `${'-'.repeat(60)}\n`);
        return;
    }

    task.status = 'running';
    console.log(`[TaskManager] ▶️ 启动任务: ${task.name} (${runningCount + 1}/${MAX_CONCURRENT_TASKS})`);
    appendTaskOutput(taskId, `\n${'='.repeat(60)}\n`);
    appendTaskOutput(taskId, `  ▶️  任务开始执行\n`);
    appendTaskOutput(taskId, `${'='.repeat(60)}\n`);
    appendTaskOutput(taskId, `任务名称: ${task.name}\n`);
    appendTaskOutput(taskId, `Runner:   ${task.runner}\n`);
    appendTaskOutput(taskId, `开始时间: ${new Date().toLocaleString('zh-CN')}\n`);
    appendTaskOutput(taskId, `${'='.repeat(60)}\n\n`);

    try {
        // 处理自动Cookie：在生成配置前自动获取Cookie
        await processAutoCookies(task.config, taskId);

        // 生成配置文件
        const tempConfigCode = generateConfig(task.config);
        const tempConfigPath = path.join(__dirname, `../benchmark.config.${taskId}.mts`);
        await fs.writeFile(tempConfigPath, tempConfigCode, 'utf-8');

        // 执行 benchmark
        const command = `npx @bilibili-player/benchmark --config benchmark.config.${taskId}.mts`;
        task.process = exec(command, { cwd: path.join(__dirname, '..') });

        // 设置任务超时保护（30分钟）
        const taskTimeout = setTimeout(() => {
            if (task.process && !task.process.killed) {
                console.warn(`[TaskManager] ⏰ 任务超时，强制终止: ${task.name} (TaskID: ${taskId})`);
                appendTaskOutput(taskId, `\n${'='.repeat(60)}\n`);
                appendTaskOutput(taskId, `  ⚠️  任务执行超时\n`);
                appendTaskOutput(taskId, `${'='.repeat(60)}\n`);
                appendTaskOutput(taskId, `超时时长: 30分钟\n`);
                appendTaskOutput(taskId, `操作:     已强制终止\n`);
                appendTaskOutput(taskId, `${'='.repeat(60)}\n`);
                task.process.kill('SIGTERM');
                setTimeout(() => {
                    if (task.process && !task.process.killed) {
                        task.process.kill('SIGKILL');
                    }
                }, 5000);
            }
        }, 30 * 60 * 1000); // 30分钟

        // 保存timeout引用以便清理
        task.killTimeout = taskTimeout;

        task.process.stdout?.on('data', (data) => {
            appendTaskOutput(taskId, data.toString());
        });

        task.process.stderr?.on('data', (data) => {
            appendTaskOutput(taskId, data.toString());
        });

        task.process.on('close', async (code) => {
            console.log(`[TaskManager] 🔔 进程关闭事件触发: ${task.name}, 退出码: ${code}, TaskID: ${taskId}`);

            task.status = code === 0 ? 'completed' : 'error';
            task.endTime = new Date();
            task.process = null;

            const statusEmoji = code === 0 ? '✅' : '❌';
            console.log(`[TaskManager] ${statusEmoji} 任务${code === 0 ? '完成' : '失败'}: ${task.name} (退出码: ${code})`);
            appendTaskOutput(taskId, `\n${'='.repeat(60)}\n`);
            appendTaskOutput(taskId, `  ${statusEmoji}  任务${code === 0 ? '完成' : '失败'}\n`);
            appendTaskOutput(taskId, `${'='.repeat(60)}\n`);
            appendTaskOutput(taskId, `退出码:   ${code}\n`);
            appendTaskOutput(taskId, `结束时间: ${new Date().toLocaleString('zh-CN')}\n`);

            // 清理配置文件（优先执行，确保清理）
            // 临时禁用删除，用于调试
            console.log(`[TaskManager] 🔍 [DEBUG] 配置文件保留在: ${tempConfigPath}`);
            /*
            try {
                await fs.unlink(tempConfigPath);
                console.log(`[TaskManager] 🗑️  已删除配置文件: ${tempConfigPath}`);
            } catch (e) {
                console.error(`[TaskManager] ⚠️  删除配置文件失败: ${tempConfigPath}`, e);
            }
            */

            // 查找测试报告文件（无论成功或失败）
            try {
                // 等待一小段时间，确保报告文件已完全写入
                await new Promise(resolve => setTimeout(resolve, 1000));

                // 查找最新的测试报告文件
                const reportsDir = path.join(__dirname, '../benchmark_report');
                const files = await fs.readdir(reportsDir);

                // 改进的文件匹配逻辑：
                // 1. 必须是.json文件
                // 2. 文件修改时间在任务启动之后
                // 3. 文件名包含runner类型
                const taskStartTime = task.startTime.getTime();
                const jsonFiles = await Promise.all(
                    files
                        .filter(f => f.endsWith('.json') && f.includes(task.runner))
                        .map(async (f) => {
                            const filePath = path.join(reportsDir, f);
                            const stat = await fs.stat(filePath);
                            return {
                                name: f,
                                path: filePath,
                                mtime: stat.mtime.getTime()
                            };
                        })
                );

                // 只选择任务启动后生成的文件
                const validFiles = jsonFiles
                    .filter(f => f.mtime >= taskStartTime)
                    .sort((a, b) => b.mtime - a.mtime);

                console.log(`[TaskManager] 📂 找到 ${validFiles.length} 个有效报告文件 (任务: ${task.name})`);

                if (validFiles.length > 0) {
                    const latestReport = validFiles[0];
                    console.log(`[TaskManager] 📄 选择报告文件: ${latestReport.name}`);

                    // 保存报告文件名到任务（无论成功或失败）
                    (task as any).reportFile = latestReport.name;

                    // 只有成功时才上传到Perfcat
                    if (code === 0) {
                        // 读取并解析JSON
                        const reportContent = await fs.readFile(latestReport.path, 'utf-8');
                        const reportData = JSON.parse(reportContent);

                        // 验证报告数据
                        if (!reportData || typeof reportData !== 'object') {
                            appendTaskOutput(taskId, `\n⚠️ 测试报告格式无效\n`);
                            console.error('[TaskManager] Invalid report data:', reportData);
                        } else {
                            // 上传到Perfcat
                            appendTaskOutput(taskId, `\n${'-'.repeat(60)}\n`);
                            appendTaskOutput(taskId, `📤 正在上传测试报告到Perfcat...\n`);
                            const uploadResult = await uploadToPerfcat(reportData);

                            if (uploadResult.success && uploadResult.id) {
                                task.perfcatId = uploadResult.id;
                                // 根据runner类型构建完整的Perfcat URL
                                task.perfcatUrl = `https://fe-perfcat.bilibili.co/utils/shorten/${uploadResult.id}?runner=${task.runner}`;

                                appendTaskOutput(taskId, `✅ Perfcat上传成功！\n\n`);
                                appendTaskOutput(taskId, `📊 报告链接:\n`);
                                appendTaskOutput(taskId, `   ${task.perfcatUrl}\n\n`);
                                appendTaskOutput(taskId, `📈 图表模式:\n`);
                                appendTaskOutput(taskId, `   ${task.perfcatUrl}&viewType=chart\n`);
                                appendTaskOutput(taskId, `${'-'.repeat(60)}\n`);
                            } else {
                                appendTaskOutput(taskId, `⚠️ Perfcat上传失败: ${uploadResult.error || '未知错误'}\n`);
                                appendTaskOutput(taskId, `${'-'.repeat(60)}\n`);
                            }
                        }
                    }
                } else {
                    appendTaskOutput(taskId, `\n⚠️ 未找到测试报告文件\n`);
                    appendTaskOutput(taskId, `可能原因: 生成失败或文件名不匹配\n`);
                    console.warn(`[TaskManager] ⚠️  未找到有效报告文件，任务: ${task.name}, runner: ${task.runner}`);
                }
            } catch (error) {
                console.error('[TaskManager] 处理测试报告失败:', error);
                appendTaskOutput(taskId, `\n⚠️ 处理测试报告时出错\n`);
                appendTaskOutput(taskId, `错误信息: ${(error as Error).message}\n`);
            }

            // 清理超时定时器
            if (task.killTimeout) {
                clearTimeout(task.killTimeout);
                task.killTimeout = undefined;
            }

            broadcastTaskUpdate(taskId);
            broadcastTaskList();

            // 保存测试记录
            if (task.endTime && task.startTime) {
                const duration = task.endTime.getTime() - task.startTime.getTime();

                // 从输出中提取错误信息（如果失败）
                let errorMessage: string | undefined;
                if (code !== 0) {
                    const outputLines = task.output.split('\n');
                    // 查找包含错误信息的行
                    const errorLines = outputLines.filter(line =>
                        line.includes('Error') ||
                        line.includes('error') ||
                        line.includes('失败') ||
                        line.includes('Exception') ||
                        line.includes('ELIFECYCLE')
                    ).slice(-10); // 最后10行错误信息

                    if (errorLines.length > 0) {
                        errorMessage = errorLines.join('\n').trim();
                    } else {
                        errorMessage = `测试失败，退出码: ${code}`;
                    }
                }

                const record: TestRecord = {
                    id: task.id,
                    testCaseId: task.testCaseId, // 关联测试用例ID
                    name: task.name,
                    runner: task.runner,
                    status: task.status as 'completed' | 'error',
                    startTime: task.startTime,
                    endTime: task.endTime,
                    duration,
                    perfcatId: task.perfcatId,
                    perfcatUrl: task.perfcatUrl,
                    perfcatChartUrl: task.perfcatUrl ? `${task.perfcatUrl}&viewType=chart` : undefined,
                    exitCode: code ?? undefined,
                    remarks: task.remarks, // 从任务中获取备注
                    reportFile: (task as any).reportFile, // 报告文件名（无论成功失败都有）
                    errorMessage: errorMessage // 错误信息（仅失败时）
                };
                await addTestRecord(record);
                console.log(`[TestRecords] 📝 已保存测试记录: ${task.name} ${errorMessage ? '(含错误信息)' : ''}`);
            }

            // 发送 Webhook 通知（包含Perfcat链接）
            sendWebhook('task_completed', {
                taskId: task.id,
                name: task.name,
                runner: task.runner,
                status: task.status,
                exitCode: code,
                perfcatUrl: task.perfcatUrl,
                perfcatId: task.perfcatId
            });

            // 尝试启动下一个待执行的任务
            const pendingCount = Array.from(tasks.values()).filter(t => t.status === 'pending').length;
            console.log(`[TaskManager] 🔄 检查待执行任务... (等待中: ${pendingCount})`);
            startNextPendingTask();
        });

        task.process.on('error', (error) => {
            console.error(`[TaskManager] ❌ 进程错误: ${task.name}, 错误: ${error.message}`);
            appendTaskOutput(taskId, `\n❌ 进程错误: ${error.message}\n`);
            task.status = 'error';
            task.endTime = new Date();
            task.process = null;

            // 清理超时定时器
            if (task.killTimeout) {
                clearTimeout(task.killTimeout);
                task.killTimeout = undefined;
            }

            broadcastTaskUpdate(taskId);
            broadcastTaskList();

            // 尝试启动下一个待执行的任务
            startNextPendingTask();
        });

        // 添加exit事件作为备份（有些情况下close不会触发，但exit会）
        task.process.on('exit', (code, signal) => {
            console.log(`[TaskManager] 🚪 进程退出事件触发: ${task.name}, 退出码: ${code}, 信号: ${signal}, TaskID: ${taskId}`);

            // 如果任务还在running状态，说明close事件没触发，需要在这里处理
            if (task.status === 'running') {
                console.warn(`[TaskManager] ⚠️  检测到close事件未触发，在exit事件中处理: ${task.name}`);
                // 触发一次close的逻辑会更好，但为了避免重复，这里做简单标记
                // close事件应该会在exit后触发，所以这里只是记录
            }
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
                    appendTaskOutput(taskId, `\n⚠️ 进程未响应，已强制终止\n`);
                    broadcastTaskUpdate(taskId);
                    broadcastTaskList();
                }
            }, 5000);

            appendTaskOutput(taskId, `\n${'='.repeat(60)}\n`);
            appendTaskOutput(taskId, `  ⚠️  任务被用户停止\n`);
            appendTaskOutput(taskId, `${'='.repeat(60)}\n`);
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
    // 优先使用 tc.config.delayMs（per-URL config），其次使用 tc.delayMs（global config）
    const delayMs = tc.config?.delayMs ?? tc.delayMs;
    if (delayMs !== undefined) {
        lines.push(`delayMs: ${delayMs}`);
    }

    // Cookie - 转换为Playwright格式
    // 优先级: tc.config.cookie (per-URL) > tc.cookie (global) > tc.advancedConfig.cookie (fallback)
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
            // 已经是对象格式，直接使用
            lines.push(`cookie: ${JSON.stringify(cookieData)}`);
        }
    }

    // extraHTTPHeaders - 优先使用 per-URL config
    const extraHTTPHeaders = tc.config?.extraHTTPHeaders ?? tc.extraHTTPHeaders;
    if (extraHTTPHeaders) {
        lines.push(`extraHTTPHeaders: ${JSON.stringify(extraHTTPHeaders)}`);
    }

    // blockList - 优先使用 per-URL config
    const blockList = tc.config?.blockList ?? tc.blockList;
    if (blockList) {
        lines.push(`blockList: ${JSON.stringify(blockList)}`);
    }

    // customCss - 优先使用 per-URL config
    const customCss = tc.config?.customCss ?? tc.customCss;
    if (customCss) {
        lines.push(`customCss: ${JSON.stringify(customCss)}`);
    }

    // deviceOptions - 优先使用 per-URL config
    const deviceOptions = tc.config?.deviceOptions ?? tc.deviceOptions;
    if (deviceOptions && Array.isArray(deviceOptions)) {
        const [deviceType, options] = deviceOptions;
        if (Object.keys(options || {}).length > 0) {
            lines.push(`deviceOptions: [${JSON.stringify(deviceType)}, ${JSON.stringify(options)}]`);
        } else {
            lines.push(`deviceOptions: [${JSON.stringify(deviceType)}, {}]`);
        }
    }

    // networkConditions - 优先使用 per-URL config
    const networkConditions = tc.config?.networkConditions ?? tc.networkConditions;
    if (networkConditions && Object.keys(networkConditions).length > 0) {
        // 网络模拟必须在 beforePageLoad 钩子中应用（在导航到URL之前设置）
        const networkCode = `await session.send("Network.emulateNetworkConditions", ${JSON.stringify(networkConditions)});`;

        // 将网络模拟代码添加到 beforePageLoad 钩子中
        const existingBeforePageLoad = tc.config?.hooks?.beforePageLoad ?? tc.hooks?.beforePageLoad ?? '';
        const networkBeforePageLoad = existingBeforePageLoad
            ? `${networkCode}\n                        ${existingBeforePageLoad}`
            : networkCode;

        // 如果还没有hooks对象，创建一个临时的
        if (!tc.config) tc.config = {};
        if (!tc.config.hooks) tc.config.hooks = {};

        // 临时保存网络模拟代码，稍后在hooks部分处理
        tc.config.hooks._networkSimulation = networkBeforePageLoad;
    }

    // 生命周期钩子 - 如果有网络模拟，tc.config.hooks 已被创建并包含 _networkSimulation
    // 优先使用 tc.config.hooks（可能包含网络模拟），否则使用 tc.hooks
    const hooks = tc.config?.hooks ?? tc.hooks;

    // beforePageLoad: 处理网络模拟和用户自定义的 beforePageLoad
    const beforePageLoadCode = hooks?._networkSimulation ?? (tc.config?.hooks?.beforePageLoad ?? tc.hooks?.beforePageLoad);
    if (beforePageLoadCode) {
        lines.push(`beforePageLoad: async ({ page, context, session }: any) => {\n                        ${beforePageLoadCode}\n                    }`);
    }

    // onPageLoaded: 只处理用户自定义的 onPageLoaded（网络模拟不应该在这里）
    const onPageLoadedCode = tc.config?.hooks?.onPageLoaded ?? tc.hooks?.onPageLoaded;
    if (onPageLoadedCode) {
        lines.push(`onPageLoaded: async ({ page, context, session }: any) => {\n                        ${onPageLoadedCode}\n                    }`);
    }

    // 继续处理其他钩子
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
    const runners = config.runners || {
        Initialization: { enabled: false, testCases: [], iterations: 7, includeWarmNavigation: false },
        Runtime: { enabled: false, testCases: [], durationMs: 60000, delayMs: 10000, metrics: ['runtime', 'longtask'] },
        MemoryLeak: { enabled: false, testCases: [], intervalMs: 60000, iterations: 3, onPageTesting: '' }
    };

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
        outputLength: t.output.length,
        perfcatId: t.perfcatId,
        perfcatUrl: t.perfcatUrl
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
        endTime: task.endTime,
        perfcatId: task.perfcatId,
        perfcatUrl: task.perfcatUrl
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
    const { runner, config, name, testCaseId, remarks } = req.body;

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

        // 创建任务（传入testCaseId以便关联，传入remarks作为备注）
        const taskId = createTask(
            taskName,
            runnerNames.join(' + '),
            transformedConfig,
            testCaseId,
            remarks
        );

        // 立即尝试启动任务
        startTask(taskId);

        res.json({
            success: true,
            message: `Task created: ${taskName}`,
            taskId: taskId,
            runner: runnerNames.join(' + '),
            testCaseId: testCaseId
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

// 辅助函数：从description中提取URL
function extractUrlFromDescription(description: string): string {
    // description格式可能是: "描述文本 - https://example.com" 或直接是URL
    const urlMatch = description.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
        return urlMatch[1];
    }
    // 如果没有找到URL，返回整个description作为后备
    return description;
}

// 获取测试结果数据（用于可视化）
app.get('/api/test-results', async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, '../benchmark_report');
        console.log(`[API] __dirname:`, __dirname);
        console.log(`[API] reportsDir:`, reportsDir);

        // 确保目录存在
        await ensureReportsDir();

        let files: string[];
        try {
            files = await fs.readdir(reportsDir);
        } catch (error) {
            console.log(`[API] 读取目录失败:`, error);
            return res.json([]);
        }

        // 查找所有 JSON 报告文件
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        console.log(`[API] 找到 ${jsonFiles.length} 个JSON报告文件:`, jsonFiles);

        const results = [];

        for (const file of jsonFiles) {
            try {
                const filePath = path.join(reportsDir, file);
                const fileStats = await fs.stat(filePath);
                const content = await fs.readFile(filePath, 'utf-8');
                const data = JSON.parse(content);

                // 从文件名提取Runner类型
                // 支持两种格式：
                // 1. 新格式：2025-11-12T17-02-22-Runtime-Local.json
                // 2. 旧格式：Initialization_2024-01-01_12-00-00.json
                let runner = 'Unknown';
                const fileNameWithoutExt = file.replace('.json', '');

                // 尝试匹配新格式：包含 -Runtime-, -Initialization-, -MemoryLeak-
                const newFormatMatch = fileNameWithoutExt.match(/-(Runtime|Initialization|MemoryLeak)-/);
                if (newFormatMatch) {
                    runner = newFormatMatch[1];
                } else {
                    // 尝试旧格式：以Runner类型开头
                    const oldFormatMatch = fileNameWithoutExt.match(/^(Runtime|Initialization|MemoryLeak)/);
                    if (oldFormatMatch) {
                        runner = oldFormatMatch[1];
                    } else {
                        // 作为后备，使用第一个部分
                        const parts = fileNameWithoutExt.split(/[-_]/);
                        runner = parts[0] || 'Unknown';
                    }
                }

                // 提取测试URL列表和结果
                const urls: string[] = [];
                const urlsWithResults: Array<{url: string, description: string, metrics: any}> = [];

                if (data && typeof data === 'object') {
                    // 尝试从不同的数据结构中提取URL和结果

                    // 1. 新格式：benchmark SDK 2.x 格式（runtimeRes, initRes等）
                    if (data.runtimeRes && Array.isArray(data.runtimeRes)) {
                        console.log(`[API] ${file}: 检测到 Runtime 测试格式`);
                        data.runtimeRes.forEach((item: any) => {
                            if (item.description || item.value?.description) {
                                const desc = item.description || item.value?.description;
                                const url = extractUrlFromDescription(desc);
                                urls.push(url);
                                urlsWithResults.push({
                                    url: url,
                                    description: desc,
                                    metrics: item.value || item
                                });
                            }
                        });
                    } else if (data.initRes && Array.isArray(data.initRes)) {
                        console.log(`[API] ${file}: 检测到 Initialization 测试格式`);
                        data.initRes.forEach((item: any) => {
                            if (item.description || item.value?.description) {
                                const desc = item.description || item.value?.description;
                                const url = extractUrlFromDescription(desc);
                                urls.push(url);
                                urlsWithResults.push({
                                    url: url,
                                    description: desc,
                                    metrics: item.value || item
                                });
                            }
                        });
                    } else if (data.memLeakRes && Array.isArray(data.memLeakRes)) {
                        console.log(`[API] ${file}: 检测到 MemoryLeak 测试格式`);
                        data.memLeakRes.forEach((item: any) => {
                            if (item.description || item.value?.description) {
                                const desc = item.description || item.value?.description;
                                const url = extractUrlFromDescription(desc);
                                urls.push(url);
                                urlsWithResults.push({
                                    url: url,
                                    description: desc,
                                    metrics: item.value || item
                                });
                            }
                        });
                    }
                    // 2. 旧格式：data直接是数组
                    else if (Array.isArray(data)) {
                        console.log(`[API] ${file}: 解析数组格式，元素数量:`, data.length);
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
                    }
                    // 3. 旧格式：data.results是数组
                    else if (data.results && Array.isArray(data.results)) {
                        console.log(`[API] ${file}: 解析data.results数组格式，元素数量:`, data.results.length);
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
                    }
                    // 4. 旧格式：对象的值
                    else {
                        const values = Object.values(data);
                        console.log(`[API] ${file}: 解析对象格式，键数量:`, Object.keys(data).length);
                        values.forEach(item => {
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
                    console.log(`[API] ${file}: 提取到 ${urls.length} 个URL`);
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

// ========== Cookie自动获取 ==========

// 处理测试配置中的自动Cookie
async function processAutoCookies(config: any, taskId: string) {
    const runners = config.runners || {};

    for (const runnerName of Object.keys(runners)) {
        const runner = runners[runnerName];
        if (!runner.enabled || !runner.testCases) continue;

        for (const testCase of runner.testCases) {
            const advConfig = testCase.advancedConfig;
            if (!advConfig || !advConfig.autoCookie) continue;

            const { uid, env } = advConfig.autoCookie;

            appendTaskOutput(taskId, `\n${'-'.repeat(60)}\n`);
            appendTaskOutput(taskId, `🔄 自动获取Cookie\n`);
            appendTaskOutput(taskId, `UID:  ${uid}\n`);
            appendTaskOutput(taskId, `环境: ${env}\n`);
            console.log(`[Cookie] 为任务 ${taskId} 自动获取Cookie: UID=${uid}, 环境=${env}`);

            try {
                // 调用内部Cookie获取逻辑
                const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;

                if (isNaN(numericUid)) {
                    throw new Error(`Invalid UID: ${uid}`);
                }

                let tokenData: any;

                if (env === 'uat') {
                    const response = await fetch(cookieEnvConfig.uatUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mid: numericUid })
                    });

                    const result = await response.json() as any;

                    if (!result.data || !result.data.session || !result.data.csrf) {
                        throw new Error(`UAT Cookie获取失败: ${result.message || 'Unknown error'}`);
                    }

                    tokenData = {
                        session: result.data.session,
                        csrf: result.data.csrf,
                        mid: numericUid
                    };
                } else {
                    // 生产环境
                    const url = `${cookieEnvConfig.prodUrl}?mid=${numericUid}`;
                    const response = await fetch(url);
                    const result = await response.json() as any;

                    if (!result.data || !result.data.session || !result.data.csrf) {
                        throw new Error(`生产环境Cookie获取失败: ${result.message || 'Unknown error'}`);
                    }

                    tokenData = {
                        session: result.data.session,
                        csrf: result.data.csrf,
                        mid: result.data.mid || numericUid
                    };
                }

                // 构建Cookie字符串
                const cookieString = `SESSDATA=${tokenData.session}; bili_jct=${tokenData.csrf}; DedeUserID=${tokenData.mid}; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc`;

                // 替换 autoCookie 为实际的 cookie
                delete advConfig.autoCookie;
                advConfig.cookie = cookieString;

                appendTaskOutput(taskId, `✅ Cookie获取成功\n`);
                appendTaskOutput(taskId, `UID: ${numericUid}\n`);
                appendTaskOutput(taskId, `${'-'.repeat(60)}\n`);
                console.log(`[Cookie] 成功获取Cookie: UID=${numericUid}, 环境=${env}`);
            } catch (error) {
                const errorMsg = (error as Error).message;
                appendTaskOutput(taskId, `❌ Cookie获取失败\n`);
                appendTaskOutput(taskId, `错误: ${errorMsg}\n`);
                appendTaskOutput(taskId, `${'-'.repeat(60)}\n`);
                console.error(`[Cookie] Cookie获取失败:`, error);
                throw error; // 中断任务执行
            }
        }
    }
}

// Cookie环境配置
interface CookieEnvConfig {
    uatUrl: string;
    prodUrl: string;
}

const cookieEnvConfig: CookieEnvConfig = {
    uatUrl: 'http://hassan.bilibili.co/ep/admin/hassan/v2/uat/account/cookie/query',
    prodUrl: 'http://melloi.bilibili.co/ep/admin/melloi/v3/out/prod/account/token'
};

// 获取Cookie（基于UID和环境）
app.post('/api/cookie/fetch', async (req, res) => {
    const { uid, env = 'prod' } = req.body;

    if (!uid) {
        return res.status(400).json({ error: 'UID is required' });
    }

    try {
        let tokenData: any;
        // 确保UID是数字类型
        const numericUid = typeof uid === 'string' ? parseInt(uid, 10) : uid;

        if (isNaN(numericUid)) {
            return res.status(400).json({ error: 'Invalid UID: must be a number' });
        }

        if (env === 'uat') {
            // UAT环境 - 注意：mid必须是数字类型
            const response = await fetch(cookieEnvConfig.uatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mid: numericUid })  // 发送数字而不是字符串
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json() as any;
            console.log('[Cookie] UAT API 原始响应:', JSON.stringify(result, null, 2));

            // 检查响应结构
            if (!result.data) {
                console.error('[Cookie] UAT API 响应缺少 data 字段:', result);
                throw new Error('UAT API响应格式错误: 缺少data字段');
            }

            tokenData = {
                session: result.data.session,
                csrf: result.data.csrf,
                mid: numericUid,
                expires: result.data.expires || null
            };

            // 验证必需字段
            if (!tokenData.session || !tokenData.csrf) {
                console.error('[Cookie] UAT Token数据不完整:', tokenData);
                throw new Error(`UAT Cookie数据不完整 - session: ${!!tokenData.session}, csrf: ${!!tokenData.csrf}`);
            }
        } else {
            // 生产环境
            const url = `${cookieEnvConfig.prodUrl}?mid=${uid}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json() as any;
            console.log('[Cookie] Prod API 原始响应:', JSON.stringify(result, null, 2));

            if (!result || result.code !== 0) {
                throw new Error(result?.message || 'Failed to fetch token data');
            }

            if (!result.data) {
                console.error('[Cookie] Prod API 响应缺少 data 字段:', result);
                throw new Error('生产环境API响应格式错误: 缺少data字段');
            }

            tokenData = result.data;

            // 验证必需字段
            if (!tokenData.session || !tokenData.csrf) {
                console.error('[Cookie] Prod Token数据不完整:', tokenData);
                throw new Error(`生产环境Cookie数据不完整 - session: ${!!tokenData.session}, csrf: ${!!tokenData.csrf}`);
            }
        }

        // 构建Cookie字符串
        const cookieString = `SESSDATA=${tokenData.session}; bili_jct=${tokenData.csrf}; DedeUserID=${tokenData.mid}; buvid3=FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc`;

        // 也返回JSON格式
        const cookieJson = {
            SESSDATA: tokenData.session,
            bili_jct: tokenData.csrf,
            DedeUserID: String(tokenData.mid),
            buvid3: 'FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc'
        };

        console.log('[Cookie] 成功构建Cookie:', {
            env,
            uid: numericUid,
            hasSession: !!tokenData.session,
            hasCsrf: !!tokenData.csrf,
            cookiePreview: cookieString.substring(0, 100) + '...'
        });

        res.json({
            success: true,
            uid: numericUid,
            env: env,
            cookieString,
            cookieJson,
            tokenData
        });
    } catch (error) {
        console.error('[Cookie] 获取失败:', error);
        res.status(500).json({
            error: 'Failed to fetch cookie',
            details: (error as Error).message
        });
    }
});

// 预设的测试账号配置
app.get('/api/cookie/presets', async (_req, res) => {
    res.json({
        presets: [
            {
                name: 'UAT测试账号',
                uid: 110000233,
                env: 'uat',
                description: 'UAT环境测试账号'
            },
            {
                name: '生产测试账号',
                uid: 3546793358919882,
                env: 'prod',
                description: '生产环境测试账号'
            }
        ]
    });
});

// 验证Cookie是否有效
app.post('/api/cookie/validate', async (req, res) => {
    const { cookieString } = req.body;

    if (!cookieString) {
        return res.status(400).json({ error: 'Cookie string is required' });
    }

    try {
        // 解析Cookie
        const cookies: Record<string, string> = {};
        cookieString.split(';').forEach((item: string) => {
            const parts = item.trim().split('=');
            if (parts.length === 2) {
                cookies[parts[0]] = parts[1];
            }
        });

        // 检查必需字段
        const hasRequiredFields = !!(cookies.SESSDATA && cookies.bili_jct);

        if (!hasRequiredFields) {
            return res.json({
                valid: false,
                message: '缺少必需字段',
                details: {
                    hasSESSDATA: !!cookies.SESSDATA,
                    hasBiliJct: !!cookies.bili_jct,
                    hasDedeUserID: !!cookies.DedeUserID
                }
            });
        }

        // 尝试访问B站API验证Cookie
        const testUrl = 'https://api.bilibili.com/x/web-interface/nav';
        const response = await fetch(testUrl, {
            headers: {
                'Cookie': cookieString,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        const result = await response.json() as any;

        // 检查是否登录
        const isLoggedIn = result.code === 0 && result.data?.isLogin;

        res.json({
            valid: isLoggedIn,
            isLoggedIn,
            message: isLoggedIn ? 'Cookie有效，已登录' : 'Cookie无效或已过期',
            userInfo: isLoggedIn ? {
                mid: result.data?.mid,
                uname: result.data?.uname,
                vipStatus: result.data?.vipStatus
            } : null,
            apiResponse: result
        });
    } catch (error) {
        console.error('[Cookie] 验证失败:', error);
        res.status(500).json({
            error: 'Cookie验证失败',
            details: (error as Error).message
        });
    }
});

// ========== Perfcat配置 ==========

// 获取Perfcat配置状态（不返回cookie）
app.get('/api/perfcat', async (req, res) => {
    res.json({
        url: perfcatConfig.url,
        enabled: !!perfcatConfig.cookie,
        hasCookie: !!perfcatConfig.cookie
    });
});

// 设置Perfcat配置
app.post('/api/perfcat', async (req, res) => {
    const { url, cookie } = req.body;

    if (url) {
        perfcatConfig.url = url;
    }

    if (cookie !== undefined) {
        perfcatConfig.cookie = cookie;
    }

    await savePerfcatConfig();

    res.json({
        success: true,
        message: perfcatConfig.cookie ? 'Perfcat配置已保存' : 'Perfcat已禁用',
        enabled: !!perfcatConfig.cookie
    });
});

// 测试Perfcat上传
app.post('/api/perfcat/test', async (req, res) => {
    if (!perfcatConfig.cookie) {
        return res.status(400).json({ error: 'Perfcat Cookie未配置' });
    }

    try {
        const testData = {
            test: true,
            message: 'Test upload from Benchmark Web Runner',
            timestamp: new Date().toISOString()
        };

        const result = await uploadToPerfcat(testData);

        if (result.success) {
            res.json({
                success: true,
                message: 'Perfcat测试上传成功',
                perfcatId: result.id,
                perfcatUrl: result.url
            });
        } else {
            res.status(500).json({
                error: 'Perfcat测试上传失败',
                details: result.error
            });
        }
    } catch (error) {
        res.status(500).json({
            error: 'Perfcat测试失败',
            details: (error as Error).message
        });
    }
});

// ========== 测试记录API ==========

// 获取测试记录列表
app.get('/api/test-records', async (req, res) => {
    try {
        const { runner, status, limit = 50, offset = 0 } = req.query;

        let filteredRecords = [...testRecords];

        // 按runner过滤
        if (runner && typeof runner === 'string') {
            filteredRecords = filteredRecords.filter(r => r.runner === runner);
        }

        // 按状态过滤
        if (status && typeof status === 'string') {
            filteredRecords = filteredRecords.filter(r => r.status === status);
        }

        // 分页
        const total = filteredRecords.length;
        const limitNum = parseInt(limit as string) || 50;
        const offsetNum = parseInt(offset as string) || 0;
        const paginatedRecords = filteredRecords.slice(offsetNum, offsetNum + limitNum);

        res.json({
            records: paginatedRecords,
            total,
            limit: limitNum,
            offset: offsetNum
        });
    } catch (error) {
        console.error('Failed to get test records:', error);
        res.status(500).json({ error: 'Failed to get test records' });
    }
});

// 获取单个测试记录
app.get('/api/test-records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const record = testRecords.find(r => r.id === id);

        if (!record) {
            return res.status(404).json({ error: 'Test record not found' });
        }

        res.json(record);
    } catch (error) {
        console.error('Failed to get test record:', error);
        res.status(500).json({ error: 'Failed to get test record' });
    }
});

// 删除测试记录
app.delete('/api/test-records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const index = testRecords.findIndex(r => r.id === id);

        if (index === -1) {
            return res.status(404).json({ error: 'Test record not found' });
        }

        const record = testRecords[index];
        testRecords.splice(index, 1);
        await saveTestRecords();

        // 同时从测试用例的executionHistory中删除
        if (record.testCaseId) {
            const testCase = TestCaseStorage.getTestCaseById(record.testCaseId);
            if (testCase && testCase.executionHistory) {
                testCase.executionHistory = testCase.executionHistory.filter((r: any) => r !== id);
                await TestCaseStorage.updateTestCase(record.testCaseId, testCase);
            }
        }

        res.json({ success: true, message: 'Test record deleted' });
    } catch (error) {
        console.error('Failed to delete test record:', error);
        res.status(500).json({ error: 'Failed to delete test record' });
    }
});

// 清空测试记录
app.post('/api/test-records/clear', async (req, res) => {
    try {
        const { runner, status } = req.body;

        if (!runner && !status) {
            // 清空所有记录
            testRecords = [];
        } else {
            // 按条件清空
            testRecords = testRecords.filter(r => {
                if (runner && r.runner !== runner) return true;
                if (status && r.status !== status) return true;
                return false;
            });
        }

        await saveTestRecords();

        res.json({ success: true, message: 'Test records cleared', remaining: testRecords.length });
    } catch (error) {
        console.error('Failed to clear test records:', error);
        res.status(500).json({ error: 'Failed to clear test records' });
    }
});

// 获取测试统计信息
app.get('/api/test-records/stats', async (req, res) => {
    try {
        const stats = {
            total: testRecords.length,
            completed: testRecords.filter(r => r.status === 'completed').length,
            error: testRecords.filter(r => r.status === 'error').length,
            byRunner: {
                Initialization: testRecords.filter(r => r.runner === 'Initialization').length,
                Runtime: testRecords.filter(r => r.runner === 'Runtime').length,
                MemoryLeak: testRecords.filter(r => r.runner === 'MemoryLeak').length
            },
            withPerfcat: testRecords.filter(r => r.perfcatUrl).length,
            averageDuration: testRecords.length > 0
                ? Math.round(testRecords.reduce((sum, r) => sum + r.duration, 0) / testRecords.length)
                : 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Failed to get test statistics:', error);
        res.status(500).json({ error: 'Failed to get test statistics' });
    }
});

// 获取测试记录的报告文件内容
app.get('/api/test-records/:id/report', async (req, res) => {
    try {
        const { id } = req.params;
        const record = testRecords.find(r => r.id === id);

        if (!record) {
            return res.status(404).json({ error: 'Test record not found' });
        }

        if (!record.reportFile) {
            return res.status(404).json({ error: 'Report file not found for this record' });
        }

        // 读取报告文件
        const reportPath = path.join(__dirname, '../benchmark_report', record.reportFile);

        try {
            const reportContent = await fs.readFile(reportPath, 'utf-8');
            const reportData = JSON.parse(reportContent);

            res.json({
                success: true,
                reportFile: record.reportFile,
                data: reportData
            });
        } catch (fileError) {
            console.error('Failed to read report file:', fileError);
            res.status(404).json({ error: 'Report file not found on disk' });
        }
    } catch (error) {
        console.error('Failed to get report:', error);
        res.status(500).json({ error: 'Failed to get report' });
    }
});

// ========== 测试用例API ==========

// 获取所有测试用例
app.get('/api/testcases', async (req, res) => {
    try {
        const { tags, search } = req.query;

        let testCases = TestCaseStorage.getAllTestCases();

        // 按标签筛选
        if (tags && typeof tags === 'string') {
            const tagArray = tags.split(',').map(t => t.trim());
            testCases = TestCaseStorage.getTestCasesByTags(tagArray);
        }

        // 按关键词搜索
        if (search && typeof search === 'string') {
            testCases = TestCaseStorage.searchTestCases(search);
        }

        res.json({
            testCases,
            total: testCases.length
        });
    } catch (error) {
        console.error('Failed to get test cases:', error);
        res.status(500).json({ error: 'Failed to get test cases' });
    }
});

// 获取单个测试用例
app.get('/api/testcases/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const testCase = TestCaseStorage.getTestCaseById(id);

        if (!testCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }

        res.json(testCase);
    } catch (error) {
        console.error('Failed to get test case:', error);
        res.status(500).json({ error: 'Failed to get test case' });
    }
});

// 创建测试用例
app.post('/api/testcases', async (req, res) => {
    try {
        const testCaseData = req.body;

        // 验证必需字段
        if (!testCaseData.name || !testCaseData.runners || !testCaseData.urlsWithDesc) {
            return res.status(400).json({ error: 'Missing required fields: name, runners, urlsWithDesc' });
        }

        const newTestCase = await TestCaseStorage.createTestCase(testCaseData);

        res.status(201).json({
            success: true,
            testCase: newTestCase
        });
    } catch (error) {
        console.error('Failed to create test case:', error);
        res.status(500).json({ error: 'Failed to create test case' });
    }
});

// 更新测试用例
app.put('/api/testcases/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updatedTestCase = await TestCaseStorage.updateTestCase(id, updates);

        if (!updatedTestCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }

        res.json({
            success: true,
            testCase: updatedTestCase
        });
    } catch (error) {
        console.error('Failed to update test case:', error);
        res.status(500).json({ error: 'Failed to update test case' });
    }
});

// 删除测试用例
app.delete('/api/testcases/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const success = await TestCaseStorage.deleteTestCase(id);

        if (!success) {
            return res.status(404).json({ error: 'Test case not found' });
        }

        res.json({
            success: true,
            message: 'Test case deleted'
        });
    } catch (error) {
        console.error('Failed to delete test case:', error);
        res.status(500).json({ error: 'Failed to delete test case' });
    }
});

// 获取测试用例的执行历史
app.get('/api/testcases/:id/executions', async (req, res) => {
    try {
        const { id } = req.params;
        const testCase = TestCaseStorage.getTestCaseById(id);

        if (!testCase) {
            return res.status(404).json({ error: 'Test case not found' });
        }

        // 获取执行记录详情
        const executionRecords = testCase.executionHistory
            ? testCase.executionHistory
                .map(recordId => testRecords.find(r => r.id === recordId))
                .filter(r => r !== undefined)
            : [];

        res.json({
            testCaseId: id,
            testCaseName: testCase.name,
            executions: executionRecords,
            total: executionRecords.length
        });
    } catch (error) {
        console.error('Failed to get execution history:', error);
        res.status(500).json({ error: 'Failed to get execution history' });
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
    await loadPerfcatConfig();
    await loadTestRecords();
    await TestCaseStorage.loadTestCases();

    console.log(`📡 API Keys: ${apiKeys.length} active`);
    console.log(`🔔 Webhook: ${webhookUrl ? 'Enabled' : 'Disabled'}`);
    console.log(`📊 Perfcat: ${perfcatConfig.cookie ? 'Enabled' : 'Disabled'}`);
    console.log(`📝 Test Records: ${testRecords.length} records loaded`);
    console.log(`📋 Test Cases: ${TestCaseStorage.getAllTestCases().length} test cases loaded\n`);
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
