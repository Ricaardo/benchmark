import express from 'express';
import cors from 'cors';
import { exec, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'crypto';

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

// 存储当前运行的benchmark进程
let currentBenchmark: ReturnType<typeof exec> | null = null;
let benchmarkStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle';
let benchmarkOutput = '';
let currentRunner = '';
let isStarting = false; // 并发控制标志
let killTimeout: NodeJS.Timeout | null = null;

// WebSocket 连接池
const wsClients = new Set<WebSocket>();

// 广播状态更新到所有 WebSocket 客户端
function broadcastStatus() {
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

// 输出缓冲区配置
const MAX_OUTPUT_LINES = 10000; // 最多保留10000行输出
const MAX_OUTPUT_CHARS = 1000000; // 最多保留1MB字符

// 限制输出大小，防止内存泄漏
function appendOutput(data: string) {
    benchmarkOutput += data;

    // 如果超过字符限制，保留后半部分
    if (benchmarkOutput.length > MAX_OUTPUT_CHARS) {
        const lines = benchmarkOutput.split('\n');
        if (lines.length > MAX_OUTPUT_LINES) {
            // 保留最后的 MAX_OUTPUT_LINES 行
            benchmarkOutput = '...(earlier output truncated)...\n' +
                lines.slice(-MAX_OUTPUT_LINES).join('\n');
        } else {
            // 如果行数不够，直接截断字符
            benchmarkOutput = '...(earlier output truncated)...\n' +
                benchmarkOutput.slice(-MAX_OUTPUT_CHARS);
        }
    }

    // 实时广播输出更新
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

            // 将urls数组转换为testCases数组
            const urls = rc.urls || [];
            const testCases = urls.map((url: string) => ({
                target: url,
                description: url
            }));

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

// 生成配置文件内容（改进版本）
function generateConfig(config: any): string {
    const mode = config.mode || { anonymous: true, headless: false };
    const { runners } = config;

    const runnersArray: string[] = [];

    if (runners.Initialization && runners.Initialization.enabled) {
        const testCases = runners.Initialization.testCases || [];
        const testCasesStr = testCases.map((tc: any) =>
            `                {\n` +
            `                    target: ${JSON.stringify(tc.target)},\n` +
            `                    description: ${JSON.stringify(tc.description)}\n` +
            `                }`
        ).join(',\n');

        runnersArray.push(
            `        Initialization: {\n` +
            `            testCases: [\n${testCasesStr}\n            ]\n` +
            `        }`
        );
    }

    if (runners.Runtime && runners.Runtime.enabled) {
        const { testCases = [], durationMs = 60000, delayMs = 10000 } = runners.Runtime;
        const testCasesStr = testCases.map((tc: any) =>
            `                {\n` +
            `                    target: ${JSON.stringify(tc.target)},\n` +
            `                    description: ${JSON.stringify(tc.description)}\n` +
            `                }`
        ).join(',\n');

        runnersArray.push(
            `        Runtime: {\n` +
            `            testCases: [\n${testCasesStr}\n            ],\n` +
            `            durationMs: ${durationMs},\n` +
            `            delayMs: ${delayMs}\n` +
            `        }`
        );
    }

    if (runners.MemoryLeak && runners.MemoryLeak.enabled) {
        const { testCases = [], intervalMs = 60000, iterations = 3, onPageTesting = '' } = runners.MemoryLeak;
        const globalOnPageTesting = onPageTesting.trim();

        const testCasesWithHandler = testCases.map((tc: any) => {
            // 优先使用testCase级别的onPageTesting，否则使用全局的onPageTesting
            let onPageTestingCode = tc.onPageTesting ? tc.onPageTesting.trim() : globalOnPageTesting;

            // 如果两者都没有，使用注释说明
            if (!onPageTestingCode) {
                onPageTestingCode = `// 在这里写你怀疑会触发内存泄露的页面操作\n                        // 若为空，则静置页面`;
            }

            return (
                `                {\n` +
                `                    target: ${JSON.stringify(tc.target)},\n` +
                `                    description: ${JSON.stringify(tc.description)},\n` +
                `                    onPageTesting: async ({ context, page, session }: any) => {\n` +
                `                        ${onPageTestingCode}\n` +
                `                    }\n` +
                `                }`
            );
        }).join(',\n');

        runnersArray.push(
            `        MemoryLeak: {\n` +
            `            testCases: [\n${testCasesWithHandler}\n            ],\n` +
            `            intervalMs: ${intervalMs},\n` +
            `            iterations: ${iterations}\n` +
            `        }`
        );
    }

    return `import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: ${JSON.stringify(mode, null, 8)},
    runners: {
${runnersArray.join(',\n')}
    }
};

export default config;`;
}

// 强制终止进程（改进版本）
function forceKillProcess(proc: ChildProcess | null) {
    if (!proc || proc.killed) return;

    try {
        // 先尝试 SIGTERM
        proc.kill('SIGTERM');

        // 设置超时，5秒后强制 SIGKILL
        killTimeout = setTimeout(() => {
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

// 获取benchmark状态
app.get('/api/status', (req, res) => {
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

// 启动benchmark（改进版本，包含验证和并发控制，支持多runner）
app.post('/api/start', async (req, res) => {
    // 并发控制
    if (isStarting) {
        return res.status(400).json({ error: '正在启动测试，请稍候...' });
    }

    if (currentBenchmark) {
        return res.status(400).json({ error: 'Benchmark is already running' });
    }

    const { runner, config } = req.body;

    isStarting = true;

    try {
        let finalConfig;
        let runnerNames: string[] = [];

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
                isStarting = false;
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
                isStarting = false;
                return res.status(400).json({
                    error: '配置文件不存在或格式错误，请先在配置页面保存配置'
                });
            }

            // 验证配置
            const validation = validateConfig(fullConfig, runner);
            if (!validation.valid) {
                isStarting = false;
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
        } else {
            isStarting = false;
            return res.status(400).json({ error: 'Runner或config参数缺失' });
        }

        // 确保报告目录存在
        await ensureReportsDir();

        // 转换前端配置为SDK期望的格式
        const transformedConfig = transformConfigForSDK(finalConfig);

        // 生成配置文件
        const tempConfigCode = generateConfig(transformedConfig);
        const tempConfigPath = path.join(__dirname, '../benchmark.config.mts');
        await fs.writeFile(tempConfigPath, tempConfigCode, 'utf-8');

        benchmarkStatus = 'running';
        benchmarkOutput = ''; // 清空之前的输出
        currentRunner = runnerNames.join(' + '); // 显示所有runner

        // 广播状态更新
        broadcastStatus();

        // 执行benchmark命令
        const command = 'npx @bilibili-player/benchmark';
        currentBenchmark = exec(command, {
            cwd: path.join(__dirname, '..')
        });

        currentBenchmark.stdout?.on('data', (data) => {
            appendOutput(data.toString());
            console.log('Benchmark output:', data.toString());
        });

        currentBenchmark.stderr?.on('data', (data) => {
            appendOutput(data.toString());
            console.error('Benchmark error:', data.toString());
        });

        currentBenchmark.on('close', (code) => {
            console.log(`Benchmark process exited with code ${code}`);
            benchmarkStatus = code === 0 ? 'completed' : 'error';

            // 发送Webhook通知
            sendWebhook('test_completed', {
                runner: currentRunner,
                status: benchmarkStatus,
                exitCode: code,
                output: benchmarkOutput.slice(-1000) // 最后1000字符
            });

            currentBenchmark = null;
            currentRunner = '';
            if (killTimeout) {
                clearTimeout(killTimeout);
                killTimeout = null;
            }
            // 广播状态更新
            broadcastStatus();
        });

        currentBenchmark.on('error', (error) => {
            console.error('Benchmark process error:', error);
            appendOutput(`\n❌ Process error: ${error.message}\n`);
            benchmarkStatus = 'error';
            currentBenchmark = null;
            currentRunner = '';
            // 广播状态更新
            broadcastStatus();
        });

        isStarting = false;
        res.json({ success: true, message: `Benchmark started with runner: ${runner}` });
    } catch (error) {
        console.error('Error starting benchmark:', error);
        benchmarkStatus = 'error';
        currentBenchmark = null;
        currentRunner = '';
        isStarting = false;
        res.status(500).json({ error: 'Failed to start benchmark: ' + (error as Error).message });
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
    if (currentBenchmark) {
        forceKillProcess(currentBenchmark);
    }

    currentBenchmark = null;
    benchmarkStatus = 'idle';
    benchmarkOutput = '';
    currentRunner = '';
    isStarting = false;

    if (killTimeout) {
        clearTimeout(killTimeout);
        killTimeout = null;
    }

    // 广播状态更新
    broadcastStatus();

    res.json({ success: true, message: 'Status reset successfully' });
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

    console.log(`📡 API Keys: ${apiKeys.length} active`);
    console.log(`🔔 Webhook: ${webhookUrl ? 'Enabled' : 'Disabled'}\n`);
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

    // 立即发送当前状态
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
