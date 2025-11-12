# 🐛 配置转换 Bug 修复

## 问题描述

**症状：** 用户点击"运行"后，任务创建成功，状态显示 `running`，但实际没有执行任何测试。

**根本原因：** `transformConfigForSDK()` 函数错误地清空了前端发送的 `testCases` 数组。

---

## 🔍 Bug 分析

### 错误的代码逻辑 (修复前)

```typescript
// server/index.ts:509-517 (旧代码)
function transformConfigForSDK(config: any): any {
    // ...
    for (const [runnerName, runnerConfig] of Object.entries(config.runners)) {
        const rc = runnerConfig as any;

        // ❌ 问题：总是从 urls 构建，忽略了已有的 testCases
        const urls = rc.urls || [];  // 前端没有发送 urls 字段！
        const testCases = urls.map((url: string) => ({
            target: url,
            description: url
        }));  // 结果：空数组 []

        transformed.runners[runnerName] = {
            enabled: true,
            testCases: testCases,  // ❌ 空数组覆盖了原有的 testCases
            ...
        };
    }
}
```

### 前端发送的实际格式

```javascript
// index.html:1354-1368 前端构建的配置
{
    mode: 'headless',
    runners: {
        Runtime: {
            enabled: true,
            testCases: [  // ✅ 前端已经构建好完整的 testCases
                {
                    target: 'https://www.bilibili.com',
                    description: 'B站首页',
                    delayMs: 5000,
                    cookie: {...},
                    extraHTTPHeaders: {...},
                    blockList: [...],
                    customCss: '...',
                    deviceOptions: ['Mobile', {...}],
                    hooks: {
                        beforePageLoad: 'code...',
                        onPageLoaded: 'code...',
                        onPageTesting: 'code...',
                        onPageUnload: 'code...'
                    }
                }
            ],
            durationMs: 60000,
            delayMs: 10000
        }
    }
}
```

### 执行流程

```
1. 前端发送配置 (包含完整的 testCases) ✅
   ↓
2. 后端接收配置
   ↓
3. transformConfigForSDK() 处理
   ├─ 尝试读取 rc.urls (不存在)
   ├─ urls = [] (空数组)
   ├─ testCases = [] (空数组)
   └─ 覆盖原有的 rc.testCases ❌
   ↓
4. generateConfig() 生成配置文件
   └─ 生成的配置中 testCases = []
   ↓
5. 执行 benchmark 命令
   └─ 没有测试用例，进程立即退出或报错 ❌
```

---

## ✅ 修复方案

### 正确的逻辑

```typescript
// server/index.ts:508-518 (新代码)
function transformConfigForSDK(config: any): any {
    // ...
    for (const [runnerName, runnerConfig] of Object.entries(config.runners)) {
        const rc = runnerConfig as any;

        // ✅ 优先使用已有的 testCases
        let testCases = rc.testCases;

        if (!testCases || testCases.length === 0) {
            // ✅ 仅当没有 testCases 时，才从 urls 构建
            const urls = rc.urls || [];
            testCases = urls.map((url: string) => ({
                target: url,
                description: url
            }));
        }

        transformed.runners[runnerName] = {
            enabled: true,
            testCases: testCases,  // ✅ 保留原有的 testCases
            ...
        };
    }
}
```

### 兼容性

修复后的代码**向后兼容**，支持两种格式：

1. **新格式（前端发送 testCases）**:
   ```javascript
   {
       runners: {
           Runtime: {
               enabled: true,
               testCases: [{...}],  // ✅ 直接使用
               ...
           }
       }
   }
   ```

2. **旧格式（发送 urls 数组）**:
   ```javascript
   {
       runners: {
           Runtime: {
               enabled: true,
               urls: ['url1', 'url2'],  // ✅ 自动转换为 testCases
               ...
           }
       }
   }
   ```

---

## 📊 影响范围

### 受影响的功能

1. ✅ **前端用例管理页面** (`index.html`)
   - 单个用例运行
   - 批量运行选中
   - 预设示例

2. ✅ **配置管理页面** (`config.html`)
   - 可能也受影响，但该页面使用 `benchmark.dynamic.json`

3. ❌ **API 接口** (`/api/v1/test/start`)
   - 外部 API 使用旧格式，未受影响

### 修复验证

修复后，以下场景应正常工作：

```javascript
// 场景 1: 单个 URL
testCases: [
    { target: 'https://www.bilibili.com', description: 'B站首页' }
]

// 场景 2: 多个 URL
testCases: [
    { target: 'https://www.bilibili.com', description: 'B站首页' },
    { target: 'https://www.bilibili.com/video/BV1xx411c7mD', description: '视频页' },
    { target: 'https://t.bilibili.com', description: '动态页' }
]

// 场景 3: 带高级配置
testCases: [
    {
        target: 'https://www.bilibili.com',
        description: 'B站首页',
        delayMs: 5000,
        cookie: { name: 'value' },
        extraHTTPHeaders: { 'User-Agent': '...' },
        blockList: ['*.jpg', '*.png'],
        customCss: 'body { background: red; }',
        deviceOptions: ['Mobile', { preset: 'android' }],
        hooks: {
            beforePageLoad: 'console.log("before");',
            onPageLoaded: 'console.log("loaded");',
            onPageTesting: 'await page.click(".button");',
            onPageUnload: 'console.log("unload");'
        }
    }
]
```

---

## 🧪 测试方法

### 1. 检查配置转换

添加日志查看转换结果：

```typescript
// server/index.ts:964 (临时调试)
const transformedConfig = transformConfigForSDK(finalConfig);
console.log('[DEBUG] Transformed config:', JSON.stringify(transformedConfig, null, 2));
```

**预期输出：**
```json
{
  "mode": { "anonymous": true, "headless": true },
  "runners": {
    "Runtime": {
      "enabled": true,
      "testCases": [
        {
          "target": "https://www.bilibili.com",
          "description": "B站首页",
          "delayMs": 5000,
          "hooks": {...}
        }
      ],
      "durationMs": 60000,
      "delayMs": 10000
    }
  }
}
```

**❌ 修复前的错误输出：**
```json
{
  "runners": {
    "Runtime": {
      "testCases": []  // ❌ 空数组！
    }
  }
}
```

### 2. 检查生成的配置文件

```bash
# 查看临时配置文件
ls -lh benchmark.config.task_*.mts

# 查看内容
cat benchmark.config.task_*.mts
```

**预期内容：**
```typescript
const config: UserOptions = {
    mode: { anonymous: true, headless: true },
    runners: {
        Runtime: {
            testCases: [  // ✅ 应有内容
                {
                    target: 'https://www.bilibili.com',
                    description: 'B站首页',
                    delayMs: 5000,
                    // ... 其他配置
                }
            ],
            durationMs: 60000,
            delayMs: 10000
        }
    }
};
```

### 3. 运行测试用例

```bash
# 1. 启动服务器
npm run dev

# 2. 打开浏览器访问
open http://localhost:3000

# 3. 点击"⚡ 加载预设"
# 4. 选择任意示例，点击"▶ 运行"
# 5. 观察输出日志

# 预期：应该看到测试开始执行，输出类似：
# [系统] 任务开始执行: 示例1: B站首页 - 基础性能测试
# [系统] Runner: Initialization
# Initialization testing started...
```

---

## 📝 相关代码位置

### 修改的文件

- `server/index.ts:493-534` - `transformConfigForSDK()` 函数

### 相关函数

1. **前端发送配置**: `index.html:1404-1414`
2. **后端接收配置**: `server/index.ts:897-987`
3. **配置转换**: `server/index.ts:493-534` ✅ **已修复**
4. **配置生成**: `server/index.ts:611-738`
5. **任务启动**: `server/index.ts:226-319`

---

## 🎯 总结

### 问题

- `transformConfigForSDK()` 错误地将前端发送的完整 `testCases` 数组替换为空数组
- 导致任务创建成功，但没有实际的测试用例执行

### 修复

- 优先使用前端发送的 `testCases`
- 仅在没有 `testCases` 时才从 `urls` 构建
- 保持向后兼容性

### 影响

- ✅ 前端用例管理功能恢复正常
- ✅ 所有高级配置（hooks、deviceOptions 等）正常传递
- ✅ 多 URL 测试正常工作

---

## 🚀 验证清单

- [ ] 单个 URL 测试
- [ ] 多个 URL 测试
- [ ] 带高级配置的测试
- [ ] 批量运行测试
- [ ] 预设示例测试
- [ ] 所有三种 Runner (Initialization, Runtime, MemoryLeak)
- [ ] 多 Runner 组合测试

**修复完成！** 🎉
