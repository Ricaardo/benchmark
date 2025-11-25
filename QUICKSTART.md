# Benchmark Web 快速启动指南

## 🚀 3 分钟快速开始

### 1. 一键部署

**macOS / Linux / WSL**:

```bash
./deploy.sh
```

**Windows**:

```bash
deploy.bat
```

脚本会自动完成：

- ✅ 环境检测（Node.js版本、端口占用）
- ✅ 依赖安装
- ✅ 代码编译
- ✅ 启动服务器
- ✅ 打开浏览器

> 💡 **提示**: 如果需要手动控制，可以运行 `npm install && npm run build && npm run dev`

### 2. 创建测试用例

访问 **http://localhost:3000**

#### 方式 1: 使用预设模板（推荐新手）

1. 点击"📋 预设模板"按钮
2. 从10+个预设中选择一个：
   - 🏠 B站首页性能测试
   - 🎬 视频播放页面测试
   - 📊 内存泄漏检测
   - 🌐 多页面对比测试
   - 等等...
3. 点击"应用模板"
4. 根据需要调整配置
5. 点击"保存"

#### 方式 2: 手动创建

1. 点击"➕ 添加测试用例"
2. 填写基本信息：
   - **名称**: 测试用例名称（如："B站首页性能测试"）
   - **描述**: 简要说明（如："测试首页加载和运行时性能"）
   - **标签**: 添加标签便于分类（如："bilibili", "首页"）

3. 选择 Runner 类型（可多选）：
   - ✅ **Initialization**: 初始化性能测试（页面加载）
   - ✅ **Runtime**: 运行时性能测试（长时间运行）
   - ✅ **MemoryLeak**: 内存泄漏测试

4. 配置 Runner 参数：
   - **Initialization**: 迭代次数（默认3次）
   - **Runtime**: 运行时长（默认60000ms）、延迟时间（默认10000ms）
   - **MemoryLeak**: 迭代间隔（默认60000ms）、迭代次数（默认3次）

5. 添加测试 URL：
   - 点击"➕ 添加URL"
   - 输入URL（如：`https://www.bilibili.com`）
   - 输入描述（如："B站首页"）
   - （可选）点击"▼ 独立配置"为此URL设置特殊配置

6. 点击"保存测试用例"

### 3. 运行测试

在测试用例列表中：

1. 找到你刚创建的测试用例
2. 点击"▶️ 运行"按钮
3. 选择要运行的 Runner（或"全部运行"）
4. 实时查看任务列表中的执行状态
5. 测试完成后自动保存记录

### 4. 查看结果

**方式 1: 任务列表**

- 在主界面下方的"任务列表"查看当前和历史任务
- 点击"📊 查看报告"或"📈 图表模式"查看Perfcat报告
- 查看任务输出和日志

**方式 2: 测试记录**

1. 点击右上角"📊 测试记录"
2. 查看所有历史测试记录
3. 筛选、搜索、统计分析
4. 查看Perfcat报告链接

## 📝 三种 Runner 类型说明

### Initialization - 初始化性能测试

**用途**: 测试页面首次加载性能

**适用场景**:

- 首屏加载时间优化
- 资源加载性能分析
- 初始化脚本执行效率

**配置参数**:

- `iterations`: 迭代次数（默认3次）

### Runtime - 运行时性能测试

**用途**: 测试页面长时间运行的性能表现

**适用场景**:

- 播放器长时间播放
- 页面交互性能
- CPU/内存使用情况

**配置参数**:

- `durationMs`: 测试运行时长（毫秒），默认60000（60秒）
- `delayMs`: 开始前延迟（毫秒），默认10000（10秒）

### MemoryLeak - 内存泄漏测试

**用途**: 检测页面是否存在内存泄漏

**适用场景**:

- 单页应用路由切换
- 播放器重复播放/停止
- 组件反复创建/销毁

**配置参数**:

- `intervalMs`: 迭代间隔（毫秒），默认60000（60秒）
- `iterations`: 迭代次数，默认3次
- `onPageTesting`: 页面操作代码（可选，留空表示静置）

## 💡 常见使用场景

### 场景 1: 测试首页加载性能

```text
1. 使用预设模板"B站首页性能测试"
2. 或手动创建，启用 Initialization
3. 添加测试 URL：https://www.bilibili.com
4. 点击运行，选择 Initialization
5. 查看测试报告
```

### 场景 2: 测试播放器长时间运行

```text
1. 创建新测试用例，启用 Runtime
2. 设置 durationMs = 1800000（30分钟）
3. 添加视频页面 URL
4. 在高级配置中添加 onPageLoaded 钩子：
   await page.click('.bpx-player-ctrl-play');
5. 保存并运行
```

### 场景 3: 检测内存泄漏

```text
1. 创建新测试用例，启用 MemoryLeak
2. 设置 iterations = 5（多次迭代更准确）
3. 配置 onPageTesting（选择预设或自定义）：
   - 预设：页面滚动、点击元素等
   - 自定义：编写JavaScript代码
4. 保存并运行
```

### 场景 4: 对比登录前后性能

```text
1. 创建测试用例，启用 Runtime
2. 添加两个URL：
   - URL 1: https://www.bilibili.com（游客模式）
   - URL 2: https://www.bilibili.com（登录模式）
3. 为 URL 2 点击"▼ 独立配置"：
   - 配置Cookie（登录后的Cookie字符串）
4. 保存并运行
5. 对比两个URL的测试报告
```

## 🔧 Per-URL 配置功能

同一测试用例中，不同URL可以使用不同配置！

### 可配置项

- **Cookie**: 字符串或JSON对象格式
- **页面延迟 (delayMs)**: 加载后等待时间
- **HTTP Headers**: 自定义请求头
- **网络条件**: 模拟2G/3G/4G等
- **自定义CSS**: 注入CSS样式
- **资源阻止列表**: 阻止特定资源加载
- **设备选项**: Desktop/Mobile切换
- **生命周期钩子**: 5个钩子函数

### 使用方法

1. 在添加URL后，点击"▼ 独立配置"按钮
2. 配置面板展开，填写需要的配置
3. 配置的URL会显示绿色边框和"✓ 已配置"徽章
4. 保存测试用例

> 📖 详细说明请参考 [USAGE_GUIDE.md](USAGE_GUIDE.md)

## 🎨 生命周期钩子

测试提供5个生命周期钩子，可在不同阶段执行自定义代码：

### 1. beforePageLoad

在页面加载**之前**执行

**用途**: 设置环境、配置页面参数

**示例**:

```javascript
await page.setViewportSize({ width: 1920, height: 1080 });
```

### 2. onPageLoaded

在页面加载**完成后**执行

**用途**: 等待元素、验证页面状态

**示例**:

```javascript
await page.waitForSelector('.bpx-player-container');
console.log('播放器容器已加载');
```

### 3. onPageTesting

在测试运行**期间**执行（Runtime/MemoryLeak）

**用途**: 执行页面操作、模拟用户行为

**示例**:

```javascript
await page.click('.bpx-player-ctrl-play');
await page.waitForTimeout(5000);
```

### 4. onPageCollecting

在数据收集**期间**执行

**用途**: 采集自定义指标

**示例**:

```javascript
const fps = await page.evaluate(() => window.__fps__);
console.log('FPS:', fps);
```

### 5. onPageUnload

在页面卸载**之前**执行

**用途**: 清理资源、保存数据

**示例**:

```javascript
await page.evaluate(() => localStorage.clear());
```

## 📊 配置 Perfcat（可选但推荐）

Perfcat集成可自动上传测试报告到可视化平台。

### 配置步骤

1. 在主界面点击"⚙️ 设置"按钮
2. 切换到"Perfcat配置"标签
3. 填写配置：
   - **Perfcat URL**: Perfcat服务地址
   - **Cookie**: 登录后的Cookie字符串
4. 点击"测试连接"验证配置
5. 保存配置

### 获取 Cookie

1. 在浏览器中登录Perfcat
2. 打开开发者工具（F12）
3. 切换到"Network"标签
4. 刷新页面，选择任意请求
5. 在请求头中复制"Cookie"字段的值

> 📖 详细说明请参考 [PERFCAT_INTEGRATION.md](PERFCAT_INTEGRATION.md)

## ⚠️ 注意事项

1. **并发执行**: 支持多个测试任务同时运行
2. **数据持久化**: 测试用例和记录自动保存
3. **浏览器数据**: 每个任务使用独立的浏览器配置文件
4. **测试时长**: MemoryLeak 测试时间较长，请耐心等待
5. **网络要求**: 测试 URL 需要可访问
6. **调试建议**: 首次测试建议关闭 headless 模式以观察浏览器行为

## 🐛 故障排查

### 问题 1: 端口被占用

使用环境变量修改端口：

```bash
PORT=3001 npm run dev
```

### 问题 2: 测试无法启动

检查：

1. 测试用例配置是否完整（name、runners、urlsWithDesc）
2. URL 是否正确且可访问
3. 浏览器控制台和服务器日志的错误信息

### 问题 3: WebSocket 连接失败

检查：

1. 防火墙是否允许 WebSocket 连接
2. 如使用反向代理，是否配置了 WebSocket 支持
3. 浏览器控制台是否有错误信息

### 问题 4: Perfcat 上传失败

检查：

1. Perfcat URL 和 Cookie 是否正确
2. Cookie 是否过期
3. 使用"测试连接"功能验证配置

更多问题请参考 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## 📚 更多资源

- 完整文档: [README.md](README.md)
- 使用指南: [USAGE_GUIDE.md](USAGE_GUIDE.md)
- 测试记录: [TEST_RECORDS_GUIDE.md](TEST_RECORDS_GUIDE.md)
- 预设系统: [PRESET_SYSTEM_GUIDE.md](PRESET_SYSTEM_GUIDE.md)
- 安装指南: [INSTALL.md](INSTALL.md)
- 部署指南: [DEPLOYMENT.md](DEPLOYMENT.md)

---

**祝你测试愉快！** 🎉
