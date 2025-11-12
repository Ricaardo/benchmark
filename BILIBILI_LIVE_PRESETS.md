# 🔴 B站直播测试预设完整指南

## 📖 概述

B站直播预设系统专为B站直播间性能测试而设计，提供了线路切换、编码切换、清晰度调节、状态检测等核心功能。

---

## 🎯 5大直播专用操作

### 1️⃣ **切换直播线路** (switchLiveLine)

**用途**：在主线和备线之间切换，测试不同线路的播放性能

#### 参数配置
| 参数 | 类型 | 选项 | 默认值 | 说明 |
|------|------|------|--------|------|
| line | 下拉选择 | 主线 / 备线 | 主线 | 选择目标线路 |

#### 使用场景
- **性能对比测试**：对比主线和备线的播放流畅度
- **容灾测试**：验证线路切换功能是否正常
- **网络波动测试**：在不稳定网络下测试备线效果

#### 生成代码示例
```javascript
// B站直播切换线路
await page.evaluate(() => {
    const settingBtn = document.querySelector('.web-player-icon-switch-quality');
    if (settingBtn) settingBtn.click();
});
await page.waitForTimeout(500);

const lineClicked = await page.evaluate((targetLine) => {
    const lineItems = document.querySelectorAll('.switch-line-list .line-item');
    for (const item of lineItems) {
        if (item.textContent.includes(targetLine)) {
            item.click();
            return true;
        }
    }
    return false;
}, '主线');

if (lineClicked) {
    console.log('[直播] 已切换到主线');
} else {
    console.warn('[直播] 未找到主线选项');
}
await page.waitForTimeout(1500);
```

---

### 2️⃣ **切换直播编码** (switchLiveCodec)

**用途**：在不同视频编码格式之间切换，测试编码性能

#### 参数配置
| 参数 | 类型 | 选项 | 默认值 | 说明 |
|------|------|------|--------|------|
| codec | 下拉选择 | AVC / HEVC / AV1 | AVC | 选择视频编码格式 |

#### 编码格式对比

| 编码 | 全称 | 压缩率 | CPU占用 | 兼容性 | 适用场景 |
|------|------|--------|---------|--------|----------|
| **AVC** | H.264 | ⭐⭐⭐ | 低 ⭐ | 最好 ⭐⭐⭐⭐⭐ | 兼容性测试、老设备 |
| **HEVC** | H.265 | ⭐⭐⭐⭐ | 中 ⭐⭐ | 较好 ⭐⭐⭐⭐ | 画质与性能平衡 |
| **AV1** | AV1 | ⭐⭐⭐⭐⭐ | 高 ⭐⭐⭐ | 一般 ⭐⭐⭐ | 新技术测试、4K直播 |

#### 使用场景
- **性能基准测试**：对比不同编码的CPU/GPU占用
- **画质测试**：相同码率下对比画质差异
- **兼容性测试**：验证不同浏览器对编码的支持

#### 生成代码示例
```javascript
// B站直播切换编码方式
await page.evaluate(() => {
    const settingBtn = document.querySelector('.web-player-icon-switch-quality');
    if (settingBtn) settingBtn.click();
});
await page.waitForTimeout(500);

const codecClicked = await page.evaluate((targetCodec) => {
    // 尝试多种可能的选择器（智能降级）
    const selectors = [
        '.switch-codec-list .codec-item',
        '.live-player-menue .codec-option',
        '[class*="codec"] [class*="item"]'
    ];

    for (const selector of selectors) {
        const items = document.querySelectorAll(selector);
        for (const item of items) {
            if (item.textContent.includes(targetCodec)) {
                item.click();
                return true;
            }
        }
    }
    return false;
}, 'HEVC');

if (codecClicked) {
    console.log('[直播] 已切换到HEVC编码');
} else {
    console.warn('[直播] 未找到HEVC编码选项');
}
await page.waitForTimeout(1500);
```

---

### 3️⃣ **切换直播清晰度** (switchLiveQuality)

**用途**：调整直播清晰度，测试不同画质的性能表现

#### 参数配置
| 参数 | 类型 | 选项 | 默认值 | 说明 |
|------|------|------|--------|------|
| quality | 下拉选择 | 原画 / 蓝光 / 超清 / 高清 / 流畅 | 蓝光 | 选择清晰度档位 |

#### 清晰度档位对比

| 档位 | 分辨率（典型） | 码率（典型） | 带宽需求 | CPU占用 | 适用场景 |
|------|---------------|-------------|----------|---------|----------|
| **原画** | 1920x1080+ | 6-10 Mbps | 极高 ⭐⭐⭐⭐⭐ | 高 ⭐⭐⭐⭐ | 性能极限测试 |
| **蓝光** | 1920x1080 | 4-6 Mbps | 高 ⭐⭐⭐⭐ | 中高 ⭐⭐⭐ | **推荐测试档位** |
| **超清** | 1280x720 | 2-3 Mbps | 中 ⭐⭐⭐ | 中 ⭐⭐ | 日常测试 |
| **高清** | 854x480 | 1-2 Mbps | 低 ⭐⭐ | 低 ⭐ | 低带宽测试 |
| **流畅** | 640x360 | 0.5-1 Mbps | 极低 ⭐ | 极低 - | 极限环境测试 |

#### 使用场景
- **带宽测试**：测试不同清晰度对网络带宽的要求
- **性能分级**：为不同性能设备找到最佳清晰度
- **自适应算法**：测试清晰度自动切换逻辑

---

### 4️⃣ **检查直播状态** (checkLiveStatus)

**用途**：验证直播是否正常播放，获取播放器详细状态

#### 无参数
该操作无需配置参数，一键检测

#### 返回信息
- `status`: 播放状态（playing / paused / error）
- `currentTime`: 当前播放时间
- `duration`: 视频总时长（直播通常为Infinity）
- `paused`: 是否暂停
- `ended`: 是否结束
- `readyState`: 播放器就绪状态（0-4）

#### 使用场景
- **自动化测试前置检查**：确认直播已正常加载
- **故障诊断**：定位直播无法播放的原因
- **监控告警**：定时检查直播状态

#### 生成代码示例
```javascript
// 检查直播状态
const liveStatus = await page.evaluate(() => {
    const player = document.querySelector('video');
    if (!player) {
        return { status: 'error', message: '未找到播放器' };
    }

    const isPlaying = !player.paused && !player.ended && player.readyState > 2;

    return {
        status: isPlaying ? 'playing' : 'paused',
        currentTime: player.currentTime,
        duration: player.duration,
        paused: player.paused,
        ended: player.ended,
        readyState: player.readyState
    };
});

console.log('[直播状态]', JSON.stringify(liveStatus, null, 2));

if (liveStatus.status === 'playing') {
    console.log('✅ 直播正常播放');
} else {
    console.warn('⚠️ 直播未播放:', liveStatus.message || liveStatus.status);
}
```

#### 输出示例
```json
{
  "status": "playing",
  "currentTime": 123.45,
  "duration": Infinity,
  "paused": false,
  "ended": false,
  "readyState": 4
}
✅ 直播正常播放
```

---

### 5️⃣ **监控直播数据** (monitorLiveStats)

**用途**：实时监控直播性能指标，用于长时间性能测试

#### 参数配置
| 参数 | 类型 | 范围 | 默认值 | 说明 |
|------|------|------|--------|------|
| duration | 数字 | 1-300秒 | 10秒 | 监控持续时间 |

#### 监控指标
- **分辨率**：videoWidth x videoHeight（实时画面尺寸）
- **缓冲情况**：buffered时长（缓冲区深度）
- **播放状态**：是否在播放
- **网络状态**：networkState（0-3）
- **就绪状态**：readyState（0-4）

#### 使用场景
- **长时间稳定性测试**：监控直播卡顿、掉线情况
- **性能回归测试**：对比版本间的性能差异
- **网络质量评估**：通过缓冲情况判断网络稳定性

#### 生成代码示例
```javascript
// 监控直播数据
console.log('[监控] 开始监控直播数据，时长: 30秒');

const monitorInterval = setInterval(async () => {
    const stats = await page.evaluate(() => {
        const player = document.querySelector('video');
        if (!player) return null;

        return {
            currentTime: player.currentTime.toFixed(2),
            buffered: player.buffered.length > 0 ? player.buffered.end(0).toFixed(2) : 0,
            videoWidth: player.videoWidth,
            videoHeight: player.videoHeight,
            paused: player.paused,
            readyState: player.readyState,
            networkState: player.networkState
        };
    });

    if (stats) {
        console.log(`[监控] 分辨率:${stats.videoWidth}x${stats.videoHeight} | 缓冲:${stats.buffered}s | 播放:${!stats.paused}`);
    }
}, 2000);

// 30秒后停止监控
await page.waitForTimeout(30000);
clearInterval(monitorInterval);
console.log('[监控] 监控结束');
```

#### 输出示例
```
[监控] 开始监控直播数据，时长: 30秒
[监控] 分辨率:1920x1080 | 缓冲:15.23s | 播放:true
[监控] 分辨率:1920x1080 | 缓冲:17.45s | 播放:true
[监控] 分辨率:1920x1080 | 缓冲:19.67s | 播放:true
...
[监控] 监控结束
```

---

## 🎮 实战案例

### 案例1：直播线路性能对比测试

**目标**：对比主线和备线的播放性能

**配置步骤**：

1. **基础信息**
   - 用例名称：`B站直播线路对比`
   - URL：`https://live.bilibili.com/你的直播间号`
   - 测试类型：✅ Runtime

2. **onPageTesting 钩子**
   ```javascript
   // 测试主线
   // [插入预设] B站直播 → 切换直播线路 → 主线

   // 监控主线性能
   // [插入预设] B站直播 → 监控直播数据 → 30秒

   // 切换到备线
   // [插入预设] B站直播 → 切换直播线路 → 备线

   // 监控备线性能
   // [插入预设] B站直播 → 监控直播数据 → 30秒
   ```

3. **预期结果**
   - 输出主线和备线各30秒的性能数据
   - 对比两条线路的分辨率、缓冲情况

---

### 案例2：编码格式性能测试

**目标**：对比AVC、HEVC、AV1三种编码的CPU占用

**配置步骤**：

1. **测试用例配置**
   - 设备：Desktop Full HD
   - 清晰度：蓝光（保持一致）

2. **onPageTesting 钩子**
   ```javascript
   // 1. 测试AVC编码
   // [插入预设] B站直播 → 切换直播编码 → AVC
   // [插入预设] B站直播 → 监控直播数据 → 20秒

   // 2. 测试HEVC编码
   // [插入预设] B站直播 → 切换直播编码 → HEVC
   // [插入预设] B站直播 → 监控直播数据 → 20秒

   // 3. 测试AV1编码
   // [插入预设] B站直播 → 切换直播编码 → AV1
   // [插入预设] B站直播 → 监控直播数据 → 20秒
   ```

3. **分析方法**
   - 通过Runtime性能数据对比CPU占用
   - 观察不同编码下的帧率稳定性

---

### 案例3：清晰度自适应测试

**目标**：测试从高清晰度降级到低清晰度的流畅度

**配置步骤**：

1. **TestCase 高级配置**
   - BlockList：性能模式（阻止广告等干扰）
   - Custom CSS：性能提升（禁用动画）

2. **onPageTesting 钩子**
   ```javascript
   // 启动监控
   // [插入预设] B站直播 → 监控直播数据 → 60秒

   // 在监控期间切换清晰度（10秒间隔）
   await page.waitForTimeout(10000);
   // [插入预设] B站直播 → 切换直播清晰度 → 原画

   await page.waitForTimeout(10000);
   // [插入预设] B站直播 → 切换直播清晰度 → 蓝光

   await page.waitForTimeout(10000);
   // [插入预设] B站直播 → 切换直播清晰度 → 超清

   await page.waitForTimeout(10000);
   // [插入预设] B站直播 → 切换直播清晰度 → 高清
   ```

3. **观察指标**
   - 切换过程中是否有卡顿
   - 缓冲区变化趋势
   - 分辨率是否正确切换

---

### 案例4：直播稳定性测试（完整示例）

**目标**：测试直播长时间播放的稳定性

**完整配置**：

```javascript
// 1. 检查直播是否正常
// [插入预设] B站直播 → 检查直播状态

// 2. 切换到最佳配置
// [插入预设] B站直播 → 切换直播线路 → 主线
// [插入预设] B站直播 → 切换直播编码 → HEVC
// [插入预设] B站直播 → 切换直播清晰度 → 蓝光

// 3. 长时间监控
// [插入预设] B站直播 → 监控直播数据 → 180秒（3分钟）

// 4. 检查最终状态
// [插入预设] B站直播 → 检查直播状态
```

---

## 💡 最佳实践

### 1. 预设组合使用
```
✅ 推荐：先检查状态 → 切换配置 → 监控数据
❌ 避免：直接切换配置，不验证是否成功
```

### 2. 监控时长选择
| 测试场景 | 推荐时长 | 说明 |
|---------|---------|------|
| 快速验证 | 5-10秒 | 验证配置是否生效 |
| 常规测试 | 20-30秒 | 收集基本性能数据 |
| 稳定性测试 | 60-180秒 | 发现潜在问题 |
| 压力测试 | 180-300秒 | 极限场景 |

### 3. 错误处理
所有预设都内置了错误处理，例如：
```javascript
if (lineClicked) {
    console.log('[直播] 已切换到主线');
} else {
    console.warn('[直播] 未找到主线选项');
}
```
通过控制台输出判断操作是否成功。

---

## 🔧 技术细节

### DOM选择器策略
为了应对B站UI更新，预设采用多级降级策略：
```javascript
const selectors = [
    '.switch-codec-list .codec-item',        // 主选择器
    '.live-player-menue .codec-option',      // 备用选择器
    '[class*="codec"] [class*="item"]'       // 模糊匹配
];
```

### 等待时间设置
| 操作 | 等待时长 | 原因 |
|------|---------|------|
| 点击设置按钮 | 500ms | 菜单展开动画 |
| 切换配置后 | 1500ms | 播放器重新加载 |
| 监控间隔 | 2000ms | 平衡精度和性能 |

---

## 📊 输出数据说明

### readyState 状态码
| 值 | 状态 | 说明 |
|----|------|------|
| 0 | HAVE_NOTHING | 未获取到数据 |
| 1 | HAVE_METADATA | 已获取元数据 |
| 2 | HAVE_CURRENT_DATA | 当前帧可用 |
| 3 | HAVE_FUTURE_DATA | 可以播放 |
| 4 | HAVE_ENOUGH_DATA | **播放流畅** ✅ |

### networkState 状态码
| 值 | 状态 | 说明 |
|----|------|------|
| 0 | NETWORK_EMPTY | 未初始化 |
| 1 | NETWORK_IDLE | 已加载，空闲 |
| 2 | NETWORK_LOADING | **正在加载** |
| 3 | NETWORK_NO_SOURCE | 无可用源 ❌ |

---

## 🎉 总结

B站直播预设系统提供了：

✅ **5大核心操作** - 覆盖线路、编码、清晰度、状态、监控
✅ **智能降级** - 多级选择器自适应UI变化
✅ **完善错误处理** - 清晰的日志输出
✅ **灵活参数配置** - 下拉选择，零代码
✅ **实战案例丰富** - 4个完整测试场景

**立即开始使用B站直播预设，让直播性能测试变得轻松高效！** 🚀

---

## 📞 快速参考

**插入预设操作步骤**：
1. 进入用例编辑 → TestCase运行配置 → 勾选 Runtime 或 MemoryLeak
2. 展开 🔄 onPageTesting 钩子
3. 快速预设 → 选择分类："B站直播"
4. 选择操作 → 配置参数 → 点击"插入代码"
5. 代码自动追加到文本框 ✅

**组合使用示例**：
```
检查直播状态 → 切换清晰度(蓝光) → 切换编码(HEVC) → 监控数据(30秒)
```

祝测试顺利！💪
