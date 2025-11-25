# 网络模拟功能文档

## 概述

已为测试用例配置部分添加了网络模拟功能，允许用户在每个URL级别配置网络条件，以测试页面在不同网络环境下的性能表现。

## 功能特性

### 1. Per-URL 网络模拟配置

每个URL可以独立配置网络条件，包括：

- **离线模式** (Offline): 模拟完全离线状态
- **下载速度** (Download Throughput): 字节/秒
- **上传速度** (Upload Throughput): 字节/秒
- **网络延迟** (Latency): 毫秒
- **连接类型** (Connection Type): none, cellular2g, cellular3g, cellular4g, bluetooth, ethernet, wifi, wimax, other

### 2. 网络预设选项

提供了多种常用网络环境预设：

| 预设名称 | 下载速度 | 上传速度 | 延迟 | 连接类型 |
|---------|---------|---------|------|---------|
| 📵 离线模式 (Offline) | 0 | 0 | 0ms | none |
| 🐌 慢速3G (Slow 3G) | 50 KB/s | 50 KB/s | 2000ms | cellular3g |
| 📶 快速3G (Fast 3G) | 1.6 MB/s | 750 KB/s | 562.5ms | cellular3g |
| 📶 4G | 4 MB/s | 3 MB/s | 20ms | cellular4g |
| 📡 WiFi | 30 MB/s | 15 MB/s | 2ms | wifi |
| 🌐 DSL | 2 MB/s | 1 MB/s | 5ms | ethernet |
| ⚠️ 低端网络 (自定义) | 400 KB/s | 400 KB/s | 400ms | other |

### 3. UI 界面

网络模拟配置界面位于每个URL的高级配置面板中，包含：

- 预设选择下拉框：快速应用常用网络配置
- 离线模式复选框
- 下载速度输入框（bytes/s）
- 上传速度输入框（bytes/s）
- 延迟输入框（ms）
- 连接类型选择框
- 清空按钮：清除所有网络配置

## 使用示例

### 示例 1: 使用预设配置

```json
{
  "url": "https://www.bilibili.com",
  "description": "B站首页 - 慢速3G网络",
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
```

### 示例 2: 自定义网络配置

```json
{
  "url": "https://www.bilibili.com/video/BV1xx411c7mD",
  "description": "视频页 - 自定义低速网络",
  "config": {
    "networkConditions": {
      "offline": false,
      "downloadThroughput": 102400,
      "uploadThroughput": 51200,
      "latency": 1000,
      "connectionType": "other"
    }
  }
}
```

### 示例 3: 离线模式测试

```json
{
  "url": "https://www.bilibili.com",
  "description": "B站首页 - 离线模式",
  "config": {
    "networkConditions": {
      "offline": true,
      "downloadThroughput": 0,
      "uploadThroughput": 0,
      "latency": 0,
      "connectionType": "none"
    }
  }
}
```

## 技术实现

### 1. 数据模型更新

**PerUrlConfig 接口** (`server/testcase-storage.ts`):
```typescript
export interface PerUrlConfig {
    // ... 其他配置
    networkConditions?: {
        offline?: boolean;
        downloadThroughput?: number; // bytes/s
        uploadThroughput?: number; // bytes/s
        latency?: number; // ms
        connectionType?: string;
    };
}
```

**AdvancedConfig 接口** (`server/testcase-storage.ts`):
```typescript
export interface AdvancedConfig {
    // ... 其他配置
    networkConditions?: {
        offline?: boolean;
        downloadThroughput?: number;
        uploadThroughput?: number;
        latency?: number;
        connectionType?: string;
    };
}
```

### 2. 服务端逻辑

配置生成时，网络条件会被注入到 `beforePageLoad` 生命周期钩子中（**关键**：网络模拟必须在页面导航之前设置）：

```typescript
// 服务端代码片段 (server/index.ts)
const networkConditions = tc.config?.networkConditions ?? tc.networkConditions;
if (networkConditions && Object.keys(networkConditions).length > 0) {
    const networkCode = `await session.send("Network.emulateNetworkConditions", ${JSON.stringify(networkConditions)});`;
    // 将网络模拟代码添加到 beforePageLoad 钩子中（在导航到URL之前设置）
}
```

生成的配置示例：
```javascript
{
    target: "https://www.bilibili.com",
    description: "B站首页 - 慢速3G",
    beforePageLoad: async ({ page, context, session }) => {
        // 网络模拟在页面加载前设置，这样整个页面加载过程都会受到网络条件限制
        await session.send("Network.emulateNetworkConditions", {
            "offline": false,
            "downloadThroughput": 51200,
            "uploadThroughput": 51200,
            "latency": 2000,
            "connectionType": "cellular3g"
        });
    }
}
```

### 3. 前端实现

**UI 渲染** (`public/index.html` - renderUrlConfigPanel 函数):
- 网络预设选择器
- 离线模式开关
- 速度和延迟输入框
- 连接类型选择器

**JavaScript 辅助函数**:
- `updateUrlNetworkCondition(itemId, field, value)`: 更新单个网络条件字段
- `applyUrlNetworkPreset(itemId)`: 应用预设网络配置
- `clearUrlConfig(itemId, 'networkConditions')`: 清空网络配置

## 配置优先级

网络模拟配置遵循以下优先级（从高到低）：

1. **Per-URL config** (`tc.config.networkConditions`): 针对特定URL的配置
2. **Global config** (`tc.networkConditions`): 测试用例级别的默认配置
3. **No network simulation**: 如果都未配置，则不应用网络模拟

## 使用场景

### 1. 低速网络性能测试
测试页面在弱网环境下的加载性能和用户体验：
```
预设: 慢速3G (Slow 3G)
用途: 模拟移动端低速网络场景
```

### 2. 离线功能测试
验证PWA或Service Worker的离线缓存功能：
```
预设: 离线模式 (Offline)
用途: 测试应用的离线可用性
```

### 3. 网络波动测试
测试不同网络条件下的应用稳定性：
```
自定义配置: 高延迟 + 低带宽
用途: 模拟网络不稳定场景
```

### 4. 移动端优化验证
验证移动端优化效果：
```
预设: 4G
用途: 模拟典型移动网络环境
```

## 注意事项

1. **Chrome DevTools Protocol**: 网络模拟通过 Chrome DevTools Protocol 的 `Network.emulateNetworkConditions` 实现
2. **生命周期**: ⚠️ **重要** - 网络条件在 `beforePageLoad` 钩子中应用，确保在页面导航之前设置，这样整个页面加载过程都会受到网络条件限制
3. **组合使用**: 可以与其他配置（Cookie、自定义CSS、设备模拟等）组合使用
4. **清空配置**: 清空网络配置后，页面将使用系统默认网络（无限制）
5. **时机关键**: 如果在 `onPageLoaded` 之后设置网络条件，只会影响后续请求，不会影响初始页面加载

## 测试验证

可以通过以下方式验证网络模拟是否生效：

1. 在浏览器DevTools的Network面板查看请求时间
2. 观察页面加载时间是否符合预期延迟
3. 检查生成的配置文件中是否包含网络模拟代码
4. 运行测试并查看性能指标是否反映网络限制

## 参考文档

- [Chrome DevTools Protocol - Network.emulateNetworkConditions](https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-emulateNetworkConditions)
- [Playwright Network Emulation](https://playwright.dev/docs/network#network-emulation)
