import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// 存储当前运行的benchmark进程
let currentBenchmark: ReturnType<typeof exec> | null = null;
let benchmarkStatus: 'idle' | 'running' | 'completed' | 'error' = 'idle';
let benchmarkOutput = '';
let currentRunner = '';

// 生成配置文件内容
function generateConfig(config: any): string {
    const mode = config.mode || { anonymous: true, headless: false };
    const { runners } = config;

    let runnersCode = '';

    if (runners.Initialization && runners.Initialization.enabled) {
        const testCases = runners.Initialization.testCases || [];
        runnersCode += `        Initialization: {
            testCases: ${JSON.stringify(testCases, null, 16).replace(/"([^"]+)":/g, '$1:')},
        },\n`;
    }

    if (runners.Runtime && runners.Runtime.enabled) {
        const { testCases = [], durationMs = 60000, delayMs = 10000 } = runners.Runtime;
        runnersCode += `        Runtime: {
            testCases: ${JSON.stringify(testCases, null, 16).replace(/"([^"]+)":/g, '$1:')},
            durationMs: ${durationMs},
            delayMs: ${delayMs},
        },\n`;
    }

    if (runners.MemoryLeak && runners.MemoryLeak.enabled) {
        const { testCases = [], intervalMs = 60000, iterations = 3, onPageTesting = '' } = runners.MemoryLeak;

        const testCasesWithHandler = testCases.map((tc: any) => {
            const onPageTestingCode = onPageTesting.trim() ||
                `// 在这里写你怀疑会触发内存泄露的页面操作
                        // 若为空，则静置页面`;

            return `{
                    target: '${tc.target}',
                    description: '${tc.description}',
                    onPageTesting: async ({ context, page, session }: any) => {
                        ${onPageTestingCode}
                    },
                }`;
        }).join(',\n                ');

        runnersCode += `        MemoryLeak: {
            testCases: [
                ${testCasesWithHandler}
            ],
            intervalMs: ${intervalMs},
            iterations: ${iterations},
        },\n`;
    }

    return `import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: ${JSON.stringify(mode, null, 8)},
    runners: {
${runnersCode}    },
};

export default config;`;
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
        res.status(500).json({ error: 'Failed to save config' });
    }
});

// 获取原始配置文件（用于高级编辑）
app.get('/api/config', async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../benchmark.config.mts');
        const configContent = await fs.readFile(configPath, 'utf-8');
        res.json({ config: configContent });
    } catch (error) {
        res.status(500).json({ error: 'Failed to read config file' });
    }
});

// 直接更新原始配置文件（高级模式）
app.post('/api/config', async (req, res) => {
    try {
        const { config } = req.body;
        const configPath = path.join(__dirname, '../benchmark.config.mts');
        await fs.writeFile(configPath, config, 'utf-8');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update config file' });
    }
});

// 启动benchmark
app.post('/api/start', async (req, res) => {
    if (currentBenchmark) {
        return res.status(400).json({ error: 'Benchmark is already running' });
    }

    const { runner } = req.body;
    const validRunners = ['Initialization', 'Runtime', 'MemoryLeak'];

    if (!runner || !validRunners.includes(runner)) {
        return res.status(400).json({
            error: 'Invalid runner. Must be one of: Initialization, Runtime, MemoryLeak'
        });
    }

    try {
        // 读取完整配置
        const configPath = path.join(__dirname, '../benchmark.dynamic.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const fullConfig = JSON.parse(configContent);

        // 创建只包含选定 runner 的临时配置
        const tempConfig = {
            mode: fullConfig.mode,
            runners: {
                [runner]: fullConfig.runners[runner]
            }
        };

        // 生成临时配置文件
        const tempConfigCode = generateConfig(tempConfig);
        const tempConfigPath = path.join(__dirname, '../benchmark.config.mts');
        await fs.writeFile(tempConfigPath, tempConfigCode, 'utf-8');

        benchmarkStatus = 'running';
        benchmarkOutput = '';
        currentRunner = runner;

        // 执行benchmark命令（不需要 --runner 参数）
        const command = 'npx @bilibili-player/benchmark';
        currentBenchmark = exec(command, {
            cwd: path.join(__dirname, '..')
        });

    currentBenchmark.stdout?.on('data', (data) => {
        benchmarkOutput += data.toString();
        console.log('Benchmark output:', data.toString());
    });

    currentBenchmark.stderr?.on('data', (data) => {
        benchmarkOutput += data.toString();
        console.error('Benchmark error:', data.toString());
    });

        currentBenchmark.on('close', (code) => {
            console.log(`Benchmark process exited with code ${code}`);
            benchmarkStatus = code === 0 ? 'completed' : 'error';
            currentBenchmark = null;
        });

        res.json({ success: true, message: `Benchmark started with runner: ${runner}` });
    } catch (error) {
        console.error('Error starting benchmark:', error);
        benchmarkStatus = 'error';
        res.status(500).json({ error: 'Failed to start benchmark' });
    }
});

// 停止benchmark
app.post('/api/stop', (req, res) => {
    if (!currentBenchmark) {
        return res.status(400).json({ error: 'No benchmark is running' });
    }

    currentBenchmark.kill();
    currentBenchmark = null;
    benchmarkStatus = 'idle';
    res.json({ success: true, message: 'Benchmark stopped' });
});

// 获取测试报告列表
app.get('/api/reports', async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, '../benchmark_report');
        const files = await fs.readdir(reportsDir);

        const reports = await Promise.all(
            files.filter(f => f.endsWith('.html') || f.endsWith('.json'))
                .map(async (file) => {
                    const stat = await fs.stat(path.join(reportsDir, file));
                    return {
                        name: file,
                        path: `/reports/${file}`,
                        modified: stat.mtime
                    };
                })
        );

        res.json(reports.sort((a, b) => b.modified.getTime() - a.modified.getTime()));
    } catch (error) {
        res.status(500).json({ error: 'Failed to read reports directory' });
    }
});

// 提供测试报告文件
app.use('/reports', express.static(path.join(__dirname, '../benchmark_report')));

// 启动服务器，带端口冲突处理
const server = app.listen(PORT, () => {
    console.log(`Benchmark Web Server running at http://localhost:${PORT}`);
    console.log(`- View UI: http://localhost:${PORT}`);
    console.log(`- API Status: http://localhost:${PORT}/api/status`);
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
