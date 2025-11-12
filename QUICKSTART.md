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

### 2. 配置测试

访问 **http://localhost:3000/config.html**

#### 配置步骤：

**步骤 1**: 基础配置 (Mode)
- **匿名模式 (Anonymous)**: 默认开启，以匿名用户运行
- **无头模式 (Headless)**: 默认关闭，调试时建议关闭以显示浏览器窗口

**步骤 2**: 选择测试模式
- 点击开关启用你需要的测试类型
- 可以同时启用多个模式

**步骤 3**: 添加测试用例
- 点击"添加测试用例"
- 输入目标 URL（如 `https://www.bilibili.com`）
- 输入描述（如 "B站首页"）

**步骤 4**: 配置参数

**Runtime 参数**：
- `durationMs`: 测试运行时长（毫秒），默认 60000（60秒）
- `delayMs`: 开始前延迟（毫秒），默认 10000（10秒）

**MemoryLeak 参数**：
- `intervalMs`: 迭代间隔（毫秒），默认 60000（60秒）
- `iterations`: 迭代次数，默认 3 次
- `onPageTesting`: 页面操作代码（可选）

**步骤 4**: 保存配置
- 点击"保存配置"按钮
- 系统自动生成 `benchmark.config.mts`

### 3. 运行测试

访问 **http://localhost:3000**

1. 从下拉菜单选择测试模式
2. 点击"启动测试"
3. 查看实时输出
4. 测试完成后查看报告

## 📝 三种测试模式说明

### Initialization - 初始化性能测试

**用途**: 测试页面首次加载性能

**适用场景**:
- 首屏加载时间优化
- 资源加载性能分析
- 初始化脚本执行效率

**配置示例**:
```json
{
  "enabled": true,
  "testCases": [
    {
      "target": "https://www.bilibili.com",
      "description": "B站首页"
    }
  ]
}
```

### Runtime - 运行时性能测试

**用途**: 测试页面长时间运行的性能表现

**适用场景**:
- 播放器长时间播放
- 页面交互性能
- CPU/内存使用情况

**配置示例**:
```json
{
  "enabled": true,
  "durationMs": 60000,    // 运行 60 秒
  "delayMs": 10000,       // 延迟 10 秒后开始
  "testCases": [
    {
      "target": "https://www.bilibili.com",
      "description": "B站首页"
    }
  ]
}
```

### MemoryLeak - 内存泄漏测试

**用途**: 检测页面是否存在内存泄漏

**适用场景**:
- 单页应用路由切换
- 播放器重复播放/停止
- 组件反复创建/销毁

**配置示例 1 - 静置页面（留空）**:
```json
{
  "enabled": true,
  "intervalMs": 60000,     // 每次迭代间隔 60 秒
  "iterations": 3,         // 迭代 3 次
  "onPageTesting": "",     // 留空表示静置页面
  "testCases": [
    {
      "target": "https://www.bilibili.com",
      "description": "B站首页"
    }
  ]
}
```

**配置示例 2 - 自定义操作**:
```json
{
  "enabled": true,
  "intervalMs": 60000,
  "iterations": 3,
  "onPageTesting": "await page.click('.play-button');\nawait page.waitForTimeout(5000);",
  "testCases": [
    {
      "target": "https://www.bilibili.com",
      "description": "B站首页"
    }
  ]
}
```

## 💡 常见使用场景

### 场景 1: 测试首页加载性能

```
1. 访问配置页面
2. 启用 Initialization
3. 添加测试用例：https://www.bilibili.com
4. 保存配置
5. 在控制台选择 Initialization 并启动
```

### 场景 2: 测试播放器长时间运行

```
1. 启用 Runtime
2. 设置 durationMs = 1800000 (30分钟)
3. 添加视频页面 URL
4. 保存并运行
```

### 场景 3: 检测内存泄漏

```
1. 启用 MemoryLeak
2. 设置 iterations = 5 (多次迭代更准确)
3. 在 onPageTesting 中添加重复操作代码：
   await page.click('.video-item');
   await page.waitForTimeout(2000);
   await page.goBack();
4. 保存并运行
```

### 场景 4: 对比优化效果

```
1. 第一次测试：使用优化前的 URL
2. 记录测试结果
3. 修改配置，使用优化后的 URL
4. 再次运行测试
5. 对比两次报告
```

## 🔧 高级技巧

### onPageTesting 代码示例

**示例 1: 点击播放按钮**
```javascript
await page.click('.bpx-player-ctrl-play');
await page.waitForTimeout(5000);
```

**示例 2: 滚动页面**
```javascript
await page.evaluate(() => {
    window.scrollBy(0, window.innerHeight);
});
await page.waitForTimeout(1000);
```

**示例 3: 路由切换**
```javascript
await page.click('a[href="/video/BV1xx411c7mD"]');
await page.waitForTimeout(3000);
await page.goBack();
await page.waitForTimeout(1000);
```

**示例 4: 表单操作**
```javascript
await page.type('.search-input', '测试关键词');
await page.click('.search-button');
await page.waitForTimeout(2000);
```

## 📊 查看测试报告

测试完成后，在控制台的"测试报告"区域：
- 点击报告文件名查看详细结果
- HTML 报告包含图表和可视化数据
- JSON 报告包含原始数据

## ⚠️ 注意事项

1. **同一时间只能运行一个测试**
2. **MemoryLeak 测试时间较长**，请耐心等待
3. **onPageTesting 留空**表示静置页面，不执行任何操作
4. **测试期间不要修改配置**，等测试完成后再修改
5. **headless: false** 可以看到浏览器窗口，方便调试
6. **测试 URL 需要可访问**，否则测试会失败

## 🐛 故障排查

### 问题 1: 端口被占用

修改 `server/index.ts` 中的 PORT：
```typescript
const PORT = 3001; // 改为其他端口
```

### 问题 2: 测试一直 pending

检查：
1. URL 是否正确且可访问
2. 网络连接是否正常
3. 查看控制台输出的错误信息

### 问题 3: 配置保存失败

确保：
1. 至少启用一个测试模式
2. 每个测试用例都填写了 URL 和描述
3. 参数值合法（不能为负数）

## 📚 更多资源

- 完整文档: [README.md](README.md)
- 安装指南: [INSTALL.md](INSTALL.md)
- 部署指南: [DEPLOYMENT.md](DEPLOYMENT.md)
- 故障排查: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 配置模板: [config.template.json](config.template.json)

---

**祝你测试愉快！** 🎉
