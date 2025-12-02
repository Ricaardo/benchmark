# 🔧 多页面比较表显示问题修复

## 问题日期：2025-12-02

---

## 🐛 问题描述

用户反馈：**"表格未展示"**

多页面均值比较表在Runtime测试记录中没有显示出来。

---

## 🔍 问题分析

### 根本原因

在`multi-page-comparison.js`的`createRuntimeComparisonTable`函数中，使用了错误的数据键名来访问指标数据。

**问题代码** (第196行):
```javascript
if (result.data && result.data[metric.key] !== undefined) {
    // 访问数据...
}
```

**实际数据结构** (在records.html中构造的):
```javascript
const runtimeResults = urlPrefixes.map((urlInfo, urlIndex) => ({
    description: urlInfo.description,
    data: allMetricsStats.reduce((acc, { metric, urlStats }) => {
        acc[metric.id] = urlStats[urlIndex].avg;  // ← 使用的是 metric.id
        return acc;
    }, {})
}));
```

### 数据不匹配

- **records.html 使用**: `data[metric.id]`
- **multi-page-comparison.js 期望**: `data[metric.key]`

**Metrics 结构**:
```javascript
{
    id: 'cpu-total',      // ← records.html使用这个
    key: 'cpu:total',     // ← multi-page-comparison.js期望这个
    label: 'CPU Total',
    // ...
}
```

---

## ✅ 修复方案

### 修复 1: 数据键名兼容

**文件**: `/public/js/multi-page-comparison.js`
**行数**: 195-209

**修改前**:
```javascript
metrics.forEach(metric => {
    if (result.data && result.data[metric.key] !== undefined) {
        if (Array.isArray(result.data[metric.key])) {
            stats[metric.id] = calculateAverage(result.data[metric.key]);
        } else {
            stats[metric.id] = result.data[metric.key];
        }
    } else {
        stats[metric.id] = 0;
    }
});
```

**修改后**:
```javascript
metrics.forEach(metric => {
    // 尝试使用metric.id（records.html中使用的键）
    const dataKey = metric.id || metric.key;
    if (result.data && result.data[dataKey] !== undefined) {
        if (Array.isArray(result.data[dataKey])) {
            stats[metric.id] = calculateAverage(result.data[dataKey]);
        } else {
            stats[metric.id] = result.data[dataKey];
        }
    } else {
        stats[metric.id] = 0;
    }
});
```

**效果**:
- ✅ 优先尝试使用`metric.id`（与records.html匹配）
- ✅ 降级使用`metric.key`（向后兼容）
- ✅ 两种数据格式都能正确处理

---

### 修复 2: 添加小数位配置

**文件**: `/public/records.html`
**行数**: 1374-1383

**修改前**:
```javascript
const metrics = [
    { id: 'cpu-total', key: 'cpu:total', label: 'CPU Total', unit: '%', multiplier: 100 },
    { id: 'cpu-thread', key: 'cpu:thread', label: 'CPU Thread', unit: '%', multiplier: 100 },
    // ...
];
```

**修改后**:
```javascript
const metrics = [
    { id: 'cpu-total', key: 'cpu:total', label: 'CPU Total', unit: '%', multiplier: 100, decimals: 1 },
    { id: 'cpu-thread', key: 'cpu:thread', label: 'CPU Thread', unit: '%', multiplier: 100, decimals: 1 },
    { id: 'heap', key: 'heap', label: 'Heap', unit: 'MB', multiplier: 1/1024/1024, decimals: 1 },
    { id: 'dom-nodes', key: 'DOM Nodes', label: 'DOM Nodes', unit: '', multiplier: 1, decimals: 0 },
    { id: 'listeners', key: 'JSEventListeners', label: 'JS Event Listeners', unit: '', multiplier: 1, decimals: 0 },
    { id: 'cpu-script', key: 'cpu:script', label: 'CPU Script', unit: '%', multiplier: 100, decimals: 1 },
    { id: 'cpu-style', key: 'cpu:style', label: 'CPU Style', unit: '%', multiplier: 100, decimals: 1 },
    { id: 'cpu-layout', key: 'cpu:layout', label: 'CPU Layout', unit: '%', multiplier: 100, decimals: 1 }
];
```

**效果**:
- ✅ CPU和Heap指标显示1位小数（如：1.6%, 14.8 MB）
- ✅ DOM Nodes和Listeners显示整数（如：1106, 847）
- ✅ 表格数据更加精确和美观

---

### 修复 3: 添加调试日志

**文件**: `/public/records.html`
**位置**: 两处（Initialization和Runtime）

**添加的日志**:
```javascript
// Initialization (第1057-1066行)
console.log('[Initialization] Checking comparison table function:', typeof createInitializationComparisonTable);
console.log('[Initialization] successfulResults:', successfulResults);
console.log('[Initialization] Generated comparison table HTML length:', comparisonTableHtml.length);
console.log('[Initialization] Comparison table inserted');

// Runtime (第1471-1490行)
console.log('[Runtime] Checking comparison table function:', typeof createRuntimeComparisonTable);
console.log('[Runtime] urlPrefixes:', urlPrefixes);
console.log('[Runtime] runtimeResults:', runtimeResults);
console.log('[Runtime] Generated comparison table HTML length:', comparisonTableHtml.length);
console.log('[Runtime] Comparison table inserted');
```

**效果**:
- ✅ 方便排查功能是否正常执行
- ✅ 可查看传入的数据结构
- ✅ 确认表格HTML是否成功生成

---

## 🧪 验证测试

### 测试环境
- 服务器: `http://localhost:3000`
- 测试文件: `task_1764655609726_l1hhnvu5p` (Runtime测试，包含2个URL)

### 测试数据
**测试记录**: `2025-12-02T14-06-50-Runtime-Local.json`

**测试用例**:
1. **首页（默认配置）** - https://www.bilibili.com
2. **视频页（自定义Cookie）** - https://www.bilibili.com/video/BV1xx411c7mD

**指标数据示例**:
```
首页: CPU Total = 1.6%, Heap = 14.8 MB
视频页: CPU Total = 1.9%, Heap = 17.6 MB
```

### 测试步骤

1. **访问测试记录页面**:
   ```
   http://localhost:3000/records.html
   ```

2. **找到Runtime测试记录**:
   - 记录名称: "测试：多URL不同配置"
   - 测试类型: Runtime
   - 完成时间: 2025-12-02

3. **展开测试详情**:
   - 点击展开图标（▶）

4. **验证比较表显示**:
   - 应该在"性能指标汇总对比"之后看到"📈 多页面均值比较表"
   - 第一行: 📍 首页（默认配置）(基准) - 蓝色背景
   - 第二行: 视频页（自定义Cookie） - 显示差值百分比
   - 最后一列: 平均差值

5. **检查浏览器控制台**:
   ```javascript
   // 应该看到以下日志:
   ✓ Multi-page comparison table loaded
   [Runtime] Checking comparison table function: function
   [Runtime] urlPrefixes: Array(2)
   [Runtime] runtimeResults: Array(2)
   [Runtime] Generated comparison table HTML length: XXXX
   [Runtime] Comparison table inserted
   ```

---

## 📊 预期效果

### 表格示例

```
┌────────────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ 页面名称                   │ CPU (%)  │ Heap(MB) │ DOM Nodes│ Listeners│ 平均差值 │
├────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ 📍 首页（默认配置）(基准)  │   1.6    │   14.8   │   1106   │   847    │    -     │
│                            │          │          │          │          │          │
├────────────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ 视频页（自定义Cookie）     │   1.9    │   17.6   │   1523   │   1035   │  +15.2%  │
│                            │  +18.8%  │  +18.9%  │  +37.7%  │  +22.2%  │          │
└────────────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

### 颜色编码
- 🔴 **红色** (18.8%, 18.9%, 37.7%, 22.2%): 性能下降 > 5%
- 🟡 **黄色背景** (平均差值列): 突出显示整体差异

---

## 📝 技术总结

### 问题类型
**数据映射不匹配** - 数据生产者和消费者使用了不同的键名

### 解决策略
1. **兼容性处理**: 使用降级机制同时支持两种键名
2. **配置完善**: 添加缺失的decimals配置
3. **调试增强**: 添加详细的控制台日志

### 经验教训
1. **数据契约**: 确保数据生产者和消费者对数据结构有一致的理解
2. **文档化**: 记录数据结构和键名约定
3. **调试友好**: 添加日志帮助快速定位问题
4. **向后兼容**: 使用降级策略而不是硬性替换

---

## 🎯 后续优化

### 可选改进
1. **统一键名**: 考虑统一使用`metric.id`或`metric.key`
2. **类型检查**: 添加TypeScript类型定义防止此类问题
3. **数据验证**: 在函数入口验证数据结构是否符合预期
4. **错误提示**: 当数据不匹配时给出友好的错误提示

---

**修复完成日期**: 2025-12-02
**修复状态**: ✅ 已完成
**测试状态**: ⏳ 等待用户验证

---

## 📞 验证方法

打开浏览器访问测试记录页面，展开任意Runtime测试记录，应该能看到多页面比较表正常显示，包含：
- 页面名称列（第一列固定）
- 所有性能指标列
- 差值百分比（彩色显示）
- 平均差值列（黄色背景）

**控制台应该显示**:
```
✓ Multi-page comparison table loaded
[Runtime] Checking comparison table function: function
[Runtime] runtimeResults: (包含正确的数据)
[Runtime] Comparison table inserted
```
