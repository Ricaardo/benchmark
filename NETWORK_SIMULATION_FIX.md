# 网络模拟功能修正说明

## ⚠️ 关键修正

### 问题
初始实现中，网络模拟代码被注入到 `onPageLoaded` 钩子中，这会导致网络条件**在页面已经开始加载之后**才生效，从而无法影响初始页面加载过程。

### 解决方案
将网络模拟代码从 `onPageLoaded` 移到 `beforePageLoad` 钩子中，确保网络条件在页面导航**之前**就已经设置好。

## 修改详情

### 文件：[server/index.ts](server/index.ts:995-1022)

**修改前（错误）**:
```typescript
// 将网络模拟代码添加到 onPageLoaded 钩子中
const existingOnPageLoaded = tc.config?.hooks?.onPageLoaded ?? tc.hooks?.onPageLoaded ?? '';
const networkOnPageLoaded = existingOnPageLoaded
    ? `${networkCode}\n${existingOnPageLoaded}`
    : networkCode;

tc.config.hooks._networkSimulation = networkOnPageLoaded;
```

生成的配置：
```javascript
{
    target: "https://www.bilibili.com",
    onPageLoaded: async ({ page, context, session }) => {
        // ❌ 太晚了！页面已经开始加载
        await session.send("Network.emulateNetworkConditions", {...});
    }
}
```

**修改后（正确）**:
```typescript
// 将网络模拟代码添加到 beforePageLoad 钩子中（在导航到URL之前设置）
const existingBeforePageLoad = tc.config?.hooks?.beforePageLoad ?? tc.hooks?.beforePageLoad ?? '';
const networkBeforePageLoad = existingBeforePageLoad
    ? `${networkCode}\n${existingBeforePageLoad}`
    : networkCode;

tc.config.hooks._networkSimulation = networkBeforePageLoad;
```

生成的配置：
```javascript
{
    target: "https://www.bilibili.com",
    beforePageLoad: async ({ page, context, session }) => {
        // ✅ 完美！在页面导航之前设置网络条件
        await session.send("Network.emulateNetworkConditions", {...});
    }
}
```

## 生命周期时序

### 错误时序（修改前）
```
1. 导航到 URL
2. 页面开始加载（使用正常网络）⬅️ 问题：这里没有网络限制
3. 页面加载完成
4. onPageLoaded 钩子执行
5. 设置网络条件 ⬅️ 太晚了！
6. 后续请求才会受到网络限制
```

### 正确时序（修改后）
```
1. beforePageLoad 钩子执行
2. 设置网络条件 ✅
3. 导航到 URL ⬅️ 整个加载过程都受网络限制
4. 页面加载（使用模拟的网络条件）✅
5. 页面加载完成
6. onPageLoaded 钩子执行（如果有）
```

## 影响范围

### 初始页面加载
- **修改前**: 不受网络模拟影响
- **修改后**: 完全受网络模拟影响 ✅

### 页面内的后续请求
- **修改前**: 受网络模拟影响
- **修改后**: 受网络模拟影响 ✅

### 性能测试准确性
- **修改前**: 测试结果不准确，无法反映真实弱网环境下的页面加载性能
- **修改后**: 测试结果准确，能够真实反映弱网环境下的性能表现 ✅

## 验证方法

### 1. 检查生成的配置文件

运行测试后，检查生成的 `benchmark.config.*.mts` 文件：

```bash
# 查找最新的配置文件
ls -lt benchmark.config.task_*.mts | head -1

# 检查网络模拟代码位置
grep -A 5 "beforePageLoad" benchmark.config.task_*.mts
```

应该看到：
```typescript
beforePageLoad: async ({ page, context, session }) => {
    await session.send("Network.emulateNetworkConditions", {
        "offline": false,
        "downloadThroughput": 51200,
        // ...
    });
}
```

### 2. 观察网络面板

在浏览器 DevTools 的 Network 面板中：

- **修改前**: 初始文档请求显示正常速度
- **修改后**: 初始文档请求显示受限速度（例如慢速3G下，第一个HTML请求就很慢）

### 3. 测试离线模式

使用离线模式配置：

```json
{
  "networkConditions": {
    "offline": true,
    "downloadThroughput": 0,
    "uploadThroughput": 0,
    "latency": 0,
    "connectionType": "none"
  }
}
```

- **修改前**: 页面能正常加载，只是后续请求失败
- **修改后**: 页面完全无法加载（这是正确的离线行为）✅

## 总结

这个修正确保了网络模拟功能按预期工作，使得性能测试能够真实反映不同网络环境下的页面表现。现在用户可以：

✅ 测试弱网环境下的初始页面加载性能
✅ 测试离线模式下的应用行为
✅ 获得准确的性能测试数据
✅ 优化针对低速网络的用户体验

**关键要点**: Chrome DevTools Protocol 的 `Network.emulateNetworkConditions` 必须在导航到URL之前调用，才能影响整个页面加载过程。
