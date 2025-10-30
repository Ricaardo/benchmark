# Benchmark Web Server

通过 Web 界面触发和管理 Bilibili Player 的性能测试。

## 功能特性

- 🎯 **Web 界面控制** - 通过浏览器启动/停止性能测试
- ⚙️ **在线配置编辑** - 直接在 Web 界面修改测试配置
- 📊 **实时输出监控** - 查看测试过程的实时输出日志
- 📈 **报告查看** - 浏览和访问历史测试报告
- 🔄 **状态管理** - 实时显示测试运行状态

## 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- `@bilibili-player/benchmark` 包（B站内部工具）

> 💡 **首次安装**: 请先查看 [INSTALL.md](INSTALL.md) 了解如何安装依赖和 benchmark 工具。

## 快速开始

### 方式 1: 使用启动脚本（推荐）

**macOS/Linux**:
```bash
./start.sh
```

**Windows**:
```bash
start.bat
```

脚本会自动检查依赖并启动服务。

### 方式 2: 手动启动

**1. 安装依赖**

```bash
npm install
```

> ⚠️ 如果遇到 `@bilibili-player/benchmark` 安装问题，请查看 [INSTALL.md](INSTALL.md)

**2. 启动服务器**

开发模式（支持热重载）:
```bash
npm run dev
```

生产模式:
```bash
npm start
```

**3. 访问 Web 界面**

打开浏览器访问: `http://localhost:3000`

### 方式 3: Docker 部署

```bash
# 使用 Docker Compose（推荐）
docker-compose up -d

# 或使用 Docker
docker build -t benchmark-web .
docker run -d -p 3000:3000 benchmark-web
```

详细部署说明请查看 [DEPLOYMENT.md](DEPLOYMENT.md)

## 使用说明

### 📝 配置管理 (推荐)

访问 `http://localhost:3000/config.html` 进入配置管理界面：

1. **基础配置 (Mode)**: 配置测试运行的基本选项
   - **Anonymous (匿名模式)**: 默认开启，以匿名用户身份运行，不使用登录凭证
   - **Headless (无头模式)**: 默认关闭，开启后浏览器在后台运行不显示窗口（推荐调试时关闭）

2. **启用测试模式**: 开启你需要的测试类型（可多选）
   - **Initialization**: 初始化性能测试 - 测试页面加载性能
   - **Runtime**: 运行时性能测试 - 测试长时间运行表现
   - **MemoryLeak**: 内存泄漏测试 - 检测内存泄漏问题

3. **添加测试用例**: 为每个启用的模式添加测试 URL
   - 点击"添加测试用例"按钮
   - 输入目标 URL 和描述
   - 可添加多个测试用例

4. **配置参数**:
   - **Runtime**: 设置运行时长 (durationMs) 和延迟时间 (delayMs)
   - **MemoryLeak**: 设置迭代间隔 (intervalMs)、迭代次数 (iterations) 和页面操作代码 (onPageTesting)

5. **保存配置**: 点击"保存配置"按钮，系统会自动生成 `benchmark.config.mts` 文件

**重要**:
- MemoryLeak 的 `onPageTesting` 留空表示静置页面
- 如果需要自定义页面操作，填入 JavaScript 代码（如 `await page.click('.button')`）
- `anonymous: true, headless: false` 是推荐的默认配置

### 🎮 控制面板

访问 `http://localhost:3000` 使用控制台：

1. **选择测试模式**: 从下拉菜单选择要运行的测试类型
2. **启动测试**: 点击"启动测试"按钮开始运行
3. **停止测试**: 测试运行时可随时停止
4. **查看输出**: 实时查看测试日志和结果

### 实时输出

测试运行时，"实时输出"区域会显示 benchmark 的控制台输出，包括:
- 测试进度信息
- 性能指标数据
- 错误和警告信息

### 测试报告

"测试报告"区域列出所有生成的测试报告，点击报告名称可在新窗口查看详细内容。

## API 接口

服务器提供以下 REST API:

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/status` | GET | 获取当前测试状态 |
| `/api/dynamic-config` | GET | 获取动态配置（JSON） |
| `/api/dynamic-config` | POST | 保存动态配置并生成 .mts |
| `/api/config` | GET | 获取原始配置文件内容 |
| `/api/config` | POST | 直接更新配置文件 |
| `/api/start` | POST | 启动测试（需传递 runner 参数） |
| `/api/stop` | POST | 停止测试 |
| `/api/reports` | GET | 获取报告列表 |
| `/reports/*` | GET | 访问报告文件 |

## 项目结构

```
benchmark/
├── server/
│   └── index.ts              # Express 服务器
├── public/
│   ├── index.html            # 控制台界面
│   └── config.html           # 配置管理界面
├── benchmark_report/         # 测试报告目录
├── benchmark.config.mts      # 生成的 Benchmark 配置
├── benchmark.dynamic.json    # 动态配置（JSON格式）
├── config.template.json      # 配置模板
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 说明文档
```

## 配置示例

### 方式 1: Web 界面配置（推荐）

访问 `http://localhost:3000/config.html`，通过可视化界面配置：
- 开启/关闭测试模式
- 添加测试用例（URL + 描述）
- 设置测试参数
- 编写 MemoryLeak 的页面操作代码

保存后自动生成 `benchmark.config.mts` 文件。

### 方式 2: JSON 配置文件

创建或编辑 `benchmark.dynamic.json`:

```json
{
  "mode": {
    "anonymous": true,
    "headless": false
  },
  "runners": {
    "Runtime": {
      "enabled": true,
      "durationMs": 60000,
      "delayMs": 10000,
      "testCases": [
        {
          "target": "https://www.bilibili.com",
          "description": "B站首页"
        }
      ]
    },
    "MemoryLeak": {
      "enabled": true,
      "intervalMs": 60000,
      "iterations": 3,
      "onPageTesting": "await page.click('.play-button');",
      "testCases": [
        {
          "target": "https://www.bilibili.com",
          "description": "B站首页"
        }
      ]
    }
  }
}
```

### 生成的配置文件示例

系统会自动生成 `benchmark.config.mts`:

```typescript
import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": true,
        "headless": false
    },
    runners: {
        Runtime: {
            testCases: [
                {
                    target: 'https://www.bilibili.com',
                    description: 'B站首页',
                }
            ],
            durationMs: 60000,
            delayMs: 10000,
        },
        MemoryLeak: {
            testCases: [
                {
                    target: 'https://www.bilibili.com',
                    description: 'B站首页',
                    onPageTesting: async ({ context, page, session }: any) => {
                        // 自定义页面操作或留空静置
                    },
                }
            ],
            intervalMs: 60000,
            iterations: 3,
        },
    },
};

export default config;
```

## 技术栈

- **后端**: Express + TypeScript
- **前端**: 原生 HTML/CSS/JavaScript
- **测试框架**: @bilibili-player/benchmark

## 注意事项

1. 确保已安装 `@bilibili-player/benchmark` 包
2. 同一时间只能运行一个测试任务
3. 测试报告会自动保存在 `benchmark_report` 目录
4. 建议在测试运行时不要修改配置文件

## 故障排查

### 端口被占用

如果 3000 端口已被占用，可以修改 [server/index.ts:11](server/index.ts#L11) 中的 `PORT` 常量:

```typescript
const PORT = 3000; // 改为其他端口号
```

### 依赖安装失败

尝试清除缓存后重新安装:

```bash
rm -rf node_modules package-lock.json
npm install
```

## 开发计划

- [ ] 支持多个测试任务队列
- [ ] 添加测试历史记录
- [ ] 支持测试结果对比
- [ ] 添加邮件/webhook 通知
- [ ] 支持自定义测试调度

## License

MIT
