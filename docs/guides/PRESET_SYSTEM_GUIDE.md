# ✨ 通用操作预设系统使用指南

## 📖 简介

为了简化测试配置，我们引入了**通用操作预设系统**。无需手写复杂的JavaScript代码，只需通过可视化界面选择预设操作，系统会自动生成对应的代码。

### 🎯 解决的问题

**之前**：需要手写JavaScript代码
```javascript
// 切换清晰度 - 需要了解DOM结构和Playwright API
await page.click('.bpx-player-ctrl-setting-btn');
await page.waitForTimeout(500);
await page.click('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-setting-quality');
// ... 更多复杂代码
```

**现在**：通过UI选择
1. 选择分类：`B站播放器`
2. 选择操作：`切换清晰度`
3. 选择参数：`720P 高清`
4. 点击"插入代码" ✅

---

## 🚀 快速开始

### 步骤1：打开测试用例编辑器

1. 访问 [http://localhost:3000](http://localhost:3000)
2. 点击 **"添加用例"** 或编辑现有用例
3. 在表单中勾选 **Runtime** 或 **MemoryLeak** 测试类型
4. 滚动到 **"生命周期钩子"** 部分
5. 找到 **🔄 onPageTesting** 区域

### 步骤2：选择预设操作

在 **✨ 快速预设** 区域：

```
[选择分类 ▼] → [选择操作 ▼] → [配置参数] → [插入代码]
```

### 步骤3：配置参数（如果需要）

某些操作需要参数，例如：
- 切换清晰度 → 选择清晰度级别
- 跳转时间 → 输入秒数
- 等待 → 输入等待时间（毫秒）

### 步骤4：插入或预览代码

- **插入代码**：将生成的代码添加到textarea
- **预览代码**：查看生成的代码（不插入）
- **清空**：清空当前textarea中的所有代码

---

## 📚 预设分类

### 1️⃣ B站播放器 (`bilibili`)

专门为B站播放器设计的操作预设。

| 操作 | 说明 | 参数 |
|------|------|------|
| **播放视频** | 点击播放按钮 | 无 |
| **暂停视频** | 暂停播放 | 无 |
| **切换清晰度** | 切换到指定清晰度 | 清晰度级别（1080P/720P/480P/360P/自动） |
| **全屏播放** | 进入全屏模式 | 无 |
| **退出全屏** | 退出全屏（按ESC键） | 无 |
| **跳转到指定时间** | 将播放进度跳转 | 时间（秒） |
| **调整播放速度** | 设置播放速度 | 速度（0.5x ~ 2x） |
| **开关弹幕** | 切换弹幕显示 | 无 |
| **循环点击播放** | 定时循环点击播放按钮 | 间隔时间（毫秒） |

#### 示例：切换清晰度到720P

```javascript
// 打开设置菜单
await page.click('.bpx-player-ctrl-setting-btn');
await page.waitForTimeout(500);

// 点击清晰度选项
await page.click('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-setting-quality');
await page.waitForTimeout(300);

// 选择清晰度: 720P 高清
const qualityButton = await page.$$eval('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-quality-menu-item', (items, targetQuality) => {
    const item = items.find(el => el.textContent.includes(targetQuality));
    if (item) {
        item.click();
        return true;
    }
    return false;
}, '720P 高清');

if (qualityButton) {
    console.log('[操作] 已切换清晰度到: 720P 高清');
} else {
    console.warn('[警告] 未找到清晰度选项: 720P 高清');
}
await page.waitForTimeout(1000);
```

---

### 2️⃣ 通用视频 (`generic`)

适用于任何HTML5 `<video>` 标签的通用操作。

| 操作 | 说明 |
|------|------|
| **播放视频 (通用)** | 尝试多种方法播放视频元素 |
| **暂停视频 (通用)** | 暂停页面中的video元素 |

---

### 3️⃣ 页面交互 (`interaction`)

通用的页面交互操作。

| 操作 | 说明 | 参数 |
|------|------|------|
| **向下滚动** | 滚动指定距离 | 距离（像素） |
| **滚动到底部** | 滚动到页面最底部 | 无 |
| **点击元素** | 点击指定CSS选择器的元素 | CSS选择器 |
| **输入文本** | 在输入框中输入文本 | 选择器 + 文本内容 |
| **悬停元素** | 鼠标悬停在元素上 | CSS选择器 |
| **等待** | 等待指定时间 | 时间（毫秒） |

#### 示例：点击元素

```javascript
await page.waitForSelector('.btn', { timeout: 5000 });
await page.click('.btn');
console.log('[操作] 已点击: .btn');
await page.waitForTimeout(500);
```

---

### 4️⃣ 性能测试 (`performance`)

用于性能压力测试的操作。

| 操作 | 说明 | 参数 |
|------|------|------|
| **内存压力测试** | 创建大量对象测试内存 | 无 |
| **CPU压力测试** | 执行密集计算测试CPU | 持续时间（毫秒） |

---

## 🔥 实战示例

### 示例1：B站视频播放性能测试

**目标**：测试B站视频在不同清晰度下的性能表现

**配置步骤**：
1. 创建测试用例，URL填写B站视频地址
2. 勾选 **Runtime** 测试
3. 在 **onPageTesting** 中使用预设：
   - 选择 `B站播放器` → `播放视频`
   - 点击"插入代码"
   - 再选择 `B站播放器` → `切换清晰度` → 选择 `720P 高清`
   - 点击"插入代码"（会追加到已有代码后面）

**生成的代码**：
```javascript
// 等待播放器加载
await page.waitForSelector('.bpx-player-ctrl-btn.bpx-player-ctrl-play', { timeout: 10000 });
await page.waitForTimeout(1000);

// 点击播放按钮
await page.click('.bpx-player-ctrl-btn.bpx-player-ctrl-play');
console.log('[操作] 已点击播放按钮');
await page.waitForTimeout(1000);

// 打开设置菜单
await page.click('.bpx-player-ctrl-setting-btn');
await page.waitForTimeout(500);

// 点击清晰度选项
await page.click('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-setting-quality');
await page.waitForTimeout(300);

// 选择清晰度: 720P 高清
const qualityButton = await page.$$eval('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-quality-menu-item', (items, targetQuality) => {
    const item = items.find(el => el.textContent.includes(targetQuality));
    if (item) {
        item.click();
        return true;
    }
    return false;
}, '720P 高清');

if (qualityButton) {
    console.log('[操作] 已切换清晰度到: 720P 高清');
} else {
    console.warn('[警告] 未找到清晰度选项: 720P 高清');
}
await page.waitForTimeout(1000);
```

---

### 示例2：内存泄漏测试

**目标**：测试反复播放/暂停是否会导致内存泄漏

**配置步骤**：
1. 勾选 **MemoryLeak** 测试
2. 设置 **迭代次数** = 5
3. 在 **onPageTesting** 中使用预设：
   - `B站播放器` → `播放视频`
   - `页面交互` → `等待` → 时间：3000ms
   - `B站播放器` → `暂停视频`
   - `页面交互` → `等待` → 时间：2000ms

---

## 🎨 高级用法

### 组合多个操作

预设支持组合使用，每次点击"插入代码"都会追加到已有代码后面：

```javascript
// 第一个预设：播放视频
await page.click('.play-btn');

// 第二个预设：等待2秒
await page.waitForTimeout(2000);

// 第三个预设：切换清晰度
await page.click('.quality-setting');
// ... 更多代码
```

### 混合使用预设和自定义代码

你可以：
1. 先使用预设插入基础代码
2. 然后手动编辑/添加自定义逻辑
3. 再插入其他预设

```javascript
// 使用预设
await page.click('.play-btn');

// 手动添加的自定义逻辑
if (await page.$('.ad-container')) {
    console.log('检测到广告，跳过');
    await page.click('.skip-ad');
}

// 再次使用预设
await page.waitForTimeout(5000);
```

---

## 🛠️ 扩展预设库

如果你有常用的操作想要添加到预设库，可以编辑 `/public/operation-presets.js` 文件。

### 添加新预设的模板

```javascript
yourOperation: {
    name: '操作名称',
    description: '操作描述',
    params: [  // 可选参数配置
        {
            name: 'paramName',
            label: '参数标签',
            type: 'select',  // 或 'text', 'number'
            options: [
                { value: 'val1', label: '选项1' },
                { value: 'val2', label: '选项2' }
            ],
            default: 'val1'
        }
    ],
    code: ({ paramName = 'val1' } = {}) => `
// 你的代码模板
await page.doSomething('${paramName}');
console.log('[操作] 完成');
`.trim()
}
```

---

## 💡 最佳实践

### ✅ 推荐做法

1. **先用预设打基础**：使用预设快速生成基础代码
2. **再手动调整**：根据具体需求微调参数和逻辑
3. **验证选择器**：确认CSS选择器在目标页面中有效
4. **添加日志**：使用 `console.log()` 方便调试
5. **组合使用**：多个简单预设组合实现复杂场景

### ❌ 避免的做法

1. 不要盲目使用预设，先确认目标页面支持该操作
2. 不要过度依赖默认参数，根据实际情况调整
3. 不要忘记测试生成的代码是否符合预期

---

## 📞 反馈与支持

如果你发现：
- 预设代码有bug
- 需要新的预设操作
- UI使用不便

欢迎在GitHub仓库提Issue或PR！

---

## 🎉 总结

通过预设系统，你可以：

✅ **节省时间**：无需手写重复代码
✅ **降低门槛**：非开发者也能轻松配置
✅ **提高效率**：可视化界面快速生成代码
✅ **灵活扩展**：支持自定义和组合使用

**开始使用预设系统，让测试配置变得更简单！** 🚀
