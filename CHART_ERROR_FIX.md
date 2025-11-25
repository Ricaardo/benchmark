# 图表内失败URL记录显示修复

## 问题描述

在测试记录的图表中，如果某个URL测试失败（例如网络断开、页面加载失败等），该URL的记录不会显示在图表中，导致用户无法了解哪个URL失败了以及失败原因。

### 具体问题
- **Runtime图表**：失败的URL没有任何显示
- **Initialization图表**：失败的URL没有任何显示
- 图表只渲染成功的URL数据，跳过失败的URL
- 用户无法从图表中看到失败的URL及其错误信息

## 数据结构分析

### 报告数据格式（以Runtime为例）
```json
{
  "runtimeRes": [
    {
      "status": "rejected",
      "reason": {
        "name": "Error",
        "message": "page.goto: net::ERR_INTERNET_DISCONNECTED at https://www.bilibili.com/",
        "stack": "..."
      },
      "description": "首页（默认配置）"
    },
    {
      "status": "fulfilled",
      "value": {
        "description": "视频页（自定义Cookie）",
        "runtime": { ... },
        "longtask": { ... }
      }
    }
  ]
}
```

### 问题根源
- 失败的URL使用 `status: "rejected"` 和 `reason` 字段
- 成功的URL使用 `status: "fulfilled"` 和 `value` 字段
- 原代码只处理 `value` 存在的情况，忽略了 `rejected` 状态

## 修复方案

### 1. Runtime图表修复 ([public/records.html:1248-1318](public/records.html#L1248-L1318))

#### 修改前
```javascript
urlPrefixes.forEach(({ prefix, description }) => {
    const result = runtimeResults.find(...);
    const runtime = result?.value?.runtime;
    if (runtime) {
        // 只显示成功的URL
    }
});
```

#### 修改后
```javascript
runtimeResults.forEach((result, index) => {
    const isFailed = result.status === 'rejected';
    const errorReason = result.reason;

    if (isFailed) {
        // 显示失败URL的错误信息框
        metricsHtml += `<div style="border: 2px solid #feb2b2; background: #fff5f5;">
            <h4>❌ ${description}</h4>
            <pre>${escapeHtml(errorReason.message)}</pre>
        </div>`;
    } else if (runtime) {
        // 显示成功URL的指标卡片
    }
});
```

### 2. Initialization图表修复 ([public/records.html:922-980](public/records.html#L922-L980))

#### 修改前
```javascript
const allResults = reportData.initializationRes.map(res => ({
    description: res.value?.description || res.description,
    data: res.value
}));

allResults.forEach(({ description, data }) => {
    // 假设data总是存在，直接渲染
    metricsHtml += `...${data['fp-cold'].toFixed(1)}...`;
});
```

#### 修改后
```javascript
const allResults = reportData.initializationRes.map(res => ({
    description: res.value?.description || res.description,
    data: res.value,
    status: res.status,
    reason: res.reason
}));

allResults.forEach(({ description, data, status, reason }) => {
    if (status === 'rejected') {
        // 显示失败URL
        metricsHtml += `<div style="border: 2px solid #feb2b2;">
            <h4>❌ ${description}</h4>
            <pre>${escapeHtml(reason.message)}</pre>
        </div>`;
    } else if (data) {
        // 显示成功URL的性能指标
    }
});
```

### 3. 图表渲染保护 ([public/records.html:1080-1176](public/records.html#L1080-L1176))

为避免失败的URL导致图表渲染错误，增加了过滤和保护：

```javascript
// 只使用成功的URL进行图表渲染
const successfulResults = allResults.filter(r => r.data);

// 如果没有成功的URL，跳过图表
if (urlStats.length === 0) return;

// 只用successfulResults计算迭代次数
const maxIterations = Math.max(...successfulResults.map(r =>
    r.data[`${metric.key}-iterations`].length
));
```

## 修复效果

### 显示样式

#### 成功的URL
```
📄 视频页（自定义Cookie）
┌─────────────┬─────────────┬─────────────┐
│ CPU Total   │ Heap (平均) │ DOM Nodes   │
│ 21.5%       │ 55.0 MB     │ 965 - 1018  │
└─────────────┴─────────────┴─────────────┘
```

#### 失败的URL
```
❌ 首页（默认配置）
┌────────────────────────────────────────┐
│ 测试失败                                │
│ page.goto: net::ERR_INTERNET_DISCONNECTED│
│ at https://www.bilibili.com/            │
└────────────────────────────────────────┘
```

### 实际案例

在测试中设置第一个URL断网：
```javascript
beforePageLoad: async ({ session }) => {
    await session.send("Network.emulateNetworkConditions", {
        "offline": true
    });
}
```

**修复后的显示效果**：
1. ❌ 首页（默认配置） - 红色边框，显示断网错误
2. ✅ 视频页（自定义Cookie） - 正常显示性能指标
3. 图表只绘制成功的URL，不会因为失败而报错

## 关键改进点

### 1. 完整性
- 所有URL都会显示（无论成功失败）
- 失败的URL显示详细错误信息
- 用户可以清楚了解哪些URL测试失败

### 2. 稳定性
- 失败的URL不会导致图表渲染错误
- 成功的URL正常渲染图表
- 混合场景（部分成功部分失败）正确处理

### 3. 用户体验
- 失败URL使用醒目的红色边框和背景
- 错误信息可滚动查看（最大高度150px）
- 视觉上清晰区分成功和失败的URL

## 相关文件

- [public/records.html](public/records.html) - 前端图表渲染逻辑
  - Runtime图表修复：第1248-1318行
  - Initialization图表修复：第922-980行
  - 图表渲染保护：第1080-1176行

## 测试方法

1. 创建一个测试用例，包含多个URL
2. 设置其中一个URL故意失败（如断网）
3. 运行测试
4. 访问 http://localhost:3000/records.html
5. 点击展开测试记录
6. 验证：
   - ✅ 失败的URL显示红色错误框
   - ✅ 成功的URL正常显示指标
   - ✅ 图表正确渲染（不报错）

## 相关修复

此修复配合之前的 [TEST_RECORD_FIX.md](TEST_RECORD_FIX.md) 一起工作：
- TEST_RECORD_FIX: 整个测试失败时的记录和显示
- CHART_ERROR_FIX: 部分URL失败时的图表内显示
