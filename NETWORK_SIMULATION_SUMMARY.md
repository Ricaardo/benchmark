# 网络模拟功能实现总结

## 实现内容

已成功为测试用例配置部分添加网络模拟功能。此功能允许在每个URL级别独立配置网络条件，用于测试页面在不同网络环境下的性能表现。

## 修改的文件

### 1. [server/testcase-storage.ts](server/testcase-storage.ts)

**修改内容**:
- 在 `PerUrlConfig` 接口中添加 `networkConditions` 字段
- 在 `AdvancedConfig` 接口中添加 `networkConditions` 字段

**新增字段**:
```typescript
networkConditions?: {
    offline?: boolean;              // 离线模式
    downloadThroughput?: number;    // 下载速度 (bytes/s)
    uploadThroughput?: number;      // 上传速度 (bytes/s)
    latency?: number;               // 延迟 (ms)
    connectionType?: string;        // 连接类型
}
```

### 2. [server/index.ts](server/index.ts)

**修改内容**:
- 在 `generateTestCase` 函数中添加网络条件处理逻辑
- ⚠️ **关键修正**: 将网络模拟代码注入到 `beforePageLoad` 生命周期钩子中（而不是 `onPageLoaded`）
- 支持 per-URL 和全局配置的优先级处理

**关键代码段**:
```typescript
// 网络条件处理 (行 995-1013)
const networkConditions = tc.config?.networkConditions ?? tc.networkConditions;
if (networkConditions && Object.keys(networkConditions).length > 0) {
    // 网络模拟必须在 beforePageLoad 钩子中应用（在导航到URL之前设置）
    const networkCode = `await session.send("Network.emulateNetworkConditions", ${JSON.stringify(networkConditions)});`;
    // 将网络模拟代码添加到 beforePageLoad 钩子
}
```

### 3. [public/index.html](public/index.html)

**修改内容**:
- 在 `renderUrlConfigPanel` 函数中添加网络模拟UI (行 2304-2365)
- 添加 `updateUrlNetworkCondition` 辅助函数 (行 2138-2160)
- 添加 `applyUrlNetworkPreset` 预设应用函数 (行 2162-2256)

**UI组件**:
- 网络预设选择器（7个预设选项）
- 离线模式复选框
- 下载速度输入框
- 上传速度输入框
- 延迟输入框
- 连接类型选择器
- 清空按钮

## 功能特性

### ✅ 支持的网络预设

1. **📵 离线模式 (Offline)** - 完全离线状态
2. **🐌 慢速3G (Slow 3G)** - 50 KB/s, 2000ms 延迟
3. **📶 快速3G (Fast 3G)** - 1.6 MB/s 下载, 750 KB/s 上传, 562.5ms 延迟
4. **📶 4G** - 4 MB/s 下载, 3 MB/s 上传, 20ms 延迟
5. **📡 WiFi** - 30 MB/s 下载, 15 MB/s 上传, 2ms 延迟
6. **🌐 DSL** - 2 MB/s 下载, 1 MB/s 上传, 5ms 延迟
7. **⚠️ 低端网络 (自定义)** - 400 KB/s, 400ms 延迟

### ✅ 配置优先级

```
Per-URL Config > Global Config > No Simulation
```

### ✅ 自动集成

网络模拟代码会自动注入到 `onPageLoaded` 钩子中，并与用户自定义的钩子代码合并。

## 使用示例

### 在UI中配置

1. 打开测试用例编辑页面
2. 点击"添加URL"或编辑现有URL
3. 展开"🔧 高级配置"面板
4. 找到"🌐 网络模拟 (networkConditions)"部分
5. 从预设选择器中选择网络环境，或手动配置各项参数
6. 保存测试用例

### JSON配置示例

```json
{
  "name": "B站性能测试 - 弱网环境",
  "urlsWithDesc": [
    {
      "url": "https://www.bilibili.com",
      "description": "首页 - 快速3G",
      "config": {
        "networkConditions": {
          "offline": false,
          "downloadThroughput": 1677721,
          "uploadThroughput": 768000,
          "latency": 562.5,
          "connectionType": "cellular3g"
        }
      }
    },
    {
      "url": "https://www.bilibili.com/video/BV1xx411c7mD",
      "description": "视频页 - 慢速3G",
      "config": {
        "networkConditions": {
          "offline": false,
          "downloadThroughput": 51200,
          "uploadThroughput": 51200,
          "latency": 2000,
          "connectionType": "cellular3g"
        }
      }
    }
  ],
  "runners": {
    "Runtime": {
      "enabled": true,
      "durationMs": 60000,
      "delayMs": 10000
    }
  }
}
```

### 生成的Playwright配置

上述配置会生成如下Playwright测试配置：

```javascript
{
    target: "https://www.bilibili.com",
    description: "首页 - 快速3G",
    beforePageLoad: async ({ page, context, session }) => {
        // ⚠️ 关键：网络模拟在页面导航之前设置
        await session.send("Network.emulateNetworkConditions", {
            "offline": false,
            "downloadThroughput": 1677721,
            "uploadThroughput": 768000,
            "latency": 562.5,
            "connectionType": "cellular3g"
        });
    }
}
```

## 技术细节

### Chrome DevTools Protocol

网络模拟通过 Chrome DevTools Protocol 的 `Network.emulateNetworkConditions` 方法实现：

```javascript
await session.send("Network.emulateNetworkConditions", {
    offline: boolean,
    downloadThroughput: number,  // bytes/s
    uploadThroughput: number,    // bytes/s
    latency: number,             // ms
    connectionType: string       // 连接类型
});
```

### 数据流转

```
用户在UI配置网络条件
    ↓
保存到 testcase.json 的 urlsWithDesc[].config.networkConditions
    ↓
服务端读取配置，生成 benchmark.config.mts
    ↓
网络条件注入到 onPageLoaded 钩子
    ↓
Playwright 执行时调用 CDP 方法设置网络模拟
    ↓
页面在模拟网络环境下运行测试
```

## 测试验证

### 构建测试
```bash
npm run build
```
✅ 无TypeScript错误

### 服务器测试
```bash
npm start
```
✅ 服务器成功启动
✅ 测试用例加载正常

### UI功能测试
- ✅ 网络预设选择器正常工作
- ✅ 自定义参数输入框正常工作
- ✅ 配置保存和加载正常
- ✅ 清空功能正常

## 适用场景

### 1. 🚀 性能优化
测试页面在低速网络下的加载性能，识别优化机会。

### 2. 📱 移动端测试
模拟真实移动网络环境（3G/4G），验证移动端用户体验。

### 3. 🌐 全球化测试
模拟不同地区的网络条件，测试全球用户的访问体验。

### 4. 💾 离线功能验证
测试 PWA、Service Worker 的离线缓存功能。

### 5. ⚡ 弱网优化
识别弱网环境下的性能瓶颈，优化资源加载策略。

## 文档

详细使用文档请参考: [NETWORK_SIMULATION_FEATURE.md](NETWORK_SIMULATION_FEATURE.md)

## 总结

✅ **完整实现**: 从数据模型、服务端逻辑到前端UI的完整实现
✅ **易用性**: 提供7种预设配置，支持自定义参数
✅ **灵活性**: Per-URL级别配置，支持不同URL使用不同网络条件
✅ **兼容性**: 与现有配置系统完美集成，不影响原有功能
✅ **文档完善**: 提供详细的使用文档和示例

网络模拟功能现已完全集成到测试用例配置系统中，可以立即使用！
