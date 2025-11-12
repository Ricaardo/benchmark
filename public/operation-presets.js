/**
 * 通用操作预设库
 * 提供常见的页面操作预设，简化测试配置
 */

const OperationPresets = {
    // ==================== B站播放器操作 ====================
    bilibili: {
        name: 'B站播放器',
        operations: {
            play: {
                name: '播放视频',
                description: '点击播放按钮开始播放',
                code: ({ selector = '.bpx-player-ctrl-btn.bpx-player-ctrl-play', wait = 1000 } = {}) => `
// 等待播放器加载
await page.waitForSelector('${selector}', { timeout: 10000 });
await page.waitForTimeout(${wait});

// 点击播放按钮
await page.click('${selector}');
console.log('[操作] 已点击播放按钮');
await page.waitForTimeout(1000);
`.trim()
            },

            pause: {
                name: '暂停视频',
                description: '点击暂停按钮',
                code: ({ selector = '.bpx-player-ctrl-btn.bpx-player-ctrl-pause' } = {}) => `
await page.click('${selector}');
console.log('[操作] 已暂停视频');
await page.waitForTimeout(500);
`.trim()
            },

            changeQuality: {
                name: '切换清晰度',
                description: '切换到指定清晰度',
                params: [
                    { name: 'quality', label: '清晰度', type: 'select', options: [
                        { value: '1080P 高清', label: '1080P 高清' },
                        { value: '720P 高清', label: '720P 高清' },
                        { value: '480P 清晰', label: '480P 清晰' },
                        { value: '360P 流畅', label: '360P 流畅' },
                        { value: '自动', label: '自动' }
                    ], default: '720P 高清' }
                ],
                code: ({ quality = '720P 高清' } = {}) => `
// 打开设置菜单
await page.click('.bpx-player-ctrl-setting-btn');
await page.waitForTimeout(500);

// 点击清晰度选项
await page.click('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-setting-quality');
await page.waitForTimeout(300);

// 选择清晰度: ${quality}
const qualityButton = await page.$$eval('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-quality-menu-item', (items, targetQuality) => {
    const item = items.find(el => el.textContent.includes(targetQuality));
    if (item) {
        item.click();
        return true;
    }
    return false;
}, '${quality}');

if (qualityButton) {
    console.log('[操作] 已切换清晰度到: ${quality}');
} else {
    console.warn('[警告] 未找到清晰度选项: ${quality}');
}
await page.waitForTimeout(1000);
`.trim()
            },

            fullscreen: {
                name: '全屏播放',
                description: '切换到全屏模式',
                code: () => `
await page.click('.bpx-player-ctrl-full');
console.log('[操作] 已切换到全屏模式');
await page.waitForTimeout(500);
`.trim()
            },

            exitFullscreen: {
                name: '退出全屏',
                description: '退出全屏模式',
                code: () => `
await page.keyboard.press('Escape');
console.log('[操作] 已退出全屏');
await page.waitForTimeout(500);
`.trim()
            },

            seekTo: {
                name: '跳转到指定时间',
                description: '将播放进度跳转到指定时间',
                params: [
                    { name: 'time', label: '时间(秒)', type: 'number', default: 30, min: 0 }
                ],
                code: ({ time = 30 } = {}) => `
// 跳转到 ${time} 秒
await page.evaluate((seconds) => {
    const player = window.player;
    if (player && player.seek) {
        player.seek(seconds);
        console.log('[操作] 已跳转到 ' + seconds + ' 秒');
    }
}, ${time});
await page.waitForTimeout(500);
`.trim()
            },

            changeSpeed: {
                name: '调整播放速度',
                description: '设置视频播放速度',
                params: [
                    { name: 'speed', label: '速度', type: 'select', options: [
                        { value: '0.5', label: '0.5x' },
                        { value: '0.75', label: '0.75x' },
                        { value: '1', label: '1x (正常)' },
                        { value: '1.25', label: '1.25x' },
                        { value: '1.5', label: '1.5x' },
                        { value: '2', label: '2x' }
                    ], default: '1.5' }
                ],
                code: ({ speed = '1.5' } = {}) => `
// 打开设置菜单
await page.click('.bpx-player-ctrl-setting-btn');
await page.waitForTimeout(500);

// 点击速度选项
await page.click('.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-setting-speed');
await page.waitForTimeout(300);

// 选择速度: ${speed}x
await page.click(\`.bpx-player-ctrl-setting-menu-right .bpx-player-ctrl-speed-menu-item[data-value="${speed}"]\`);
console.log('[操作] 已设置播放速度为: ${speed}x');
await page.waitForTimeout(500);
`.trim()
            },

            toggleDanmaku: {
                name: '开关弹幕',
                description: '切换弹幕显示状态',
                code: () => `
await page.click('.bpx-player-dm-switch');
console.log('[操作] 已切换弹幕状态');
await page.waitForTimeout(300);
`.trim()
            },

            clickLoop: {
                name: '循环点击播放',
                description: '在测试期间循环点击播放按钮',
                params: [
                    { name: 'interval', label: '间隔(毫秒)', type: 'number', default: 5000, min: 1000 }
                ],
                code: ({ interval = 5000 } = {}) => `
// 每隔 ${interval}ms 点击一次播放
const clickInterval = setInterval(async () => {
    const playBtn = await page.$('.bpx-player-ctrl-btn.bpx-player-ctrl-play');
    if (playBtn) {
        await playBtn.click();
        console.log('[循环操作] 点击播放');
    }
}, ${interval});

// 存储到 session 以便清理
session.clickInterval = clickInterval;
`.trim()
            },

            // ==================== B站直播专用操作 ====================

            switchLiveLine: {
                name: '切换直播线路',
                description: 'B站直播：切换线路（主线/备线）',
                params: [
                    { name: 'line', label: '线路', type: 'select', options: [
                        { value: '主线', label: '主线' },
                        { value: '备线', label: '备线' }
                    ], default: '主线' }
                ],
                code: ({ line = '主线' } = {}) => `
// B站直播切换线路
await page.evaluate(() => {
    // 打开设置菜单
    const settingBtn = document.querySelector('.web-player-icon-switch-quality');
    if (settingBtn) settingBtn.click();
});
await page.waitForTimeout(500);

// 查找并点击线路切换
const lineClicked = await page.evaluate((targetLine) => {
    const lineItems = document.querySelectorAll('.switch-line-list .line-item');
    for (const item of lineItems) {
        if (item.textContent.includes(targetLine)) {
            item.click();
            return true;
        }
    }
    return false;
}, '${line}');

if (lineClicked) {
    console.log('[直播] 已切换到${line}');
} else {
    console.warn('[直播] 未找到${line}选项，尝试备用方案');
    // 备用方案：通过class切换
    await page.click('.line-switch-btn').catch(() => {
        console.warn('[直播] 线路切换失败');
    });
}
await page.waitForTimeout(1500); // 等待切换完成
`.trim()
            },

            switchLiveCodec: {
                name: '切换直播编码',
                description: 'B站直播：切换编码方式（AVC/HEVC/AV1）',
                params: [
                    { name: 'codec', label: '编码格式', type: 'select', options: [
                        { value: 'AVC', label: 'AVC (H.264)' },
                        { value: 'HEVC', label: 'HEVC (H.265)' },
                        { value: 'AV1', label: 'AV1' }
                    ], default: 'AVC' }
                ],
                code: ({ codec = 'AVC' } = {}) => `
// B站直播切换编码方式
await page.evaluate(() => {
    // 打开设置菜单
    const settingBtn = document.querySelector('.web-player-icon-switch-quality, .control-panel-icon-row [title*="设置"]');
    if (settingBtn) settingBtn.click();
});
await page.waitForTimeout(500);

// 查找并点击编码选项
const codecClicked = await page.evaluate((targetCodec) => {
    // 尝试多种可能的选择器
    const selectors = [
        '.switch-quality-list .quality-item',
        '.codec-select-item',
        '[data-codec]',
        '.control-panel-content .item'
    ];

    for (const selector of selectors) {
        const items = document.querySelectorAll(selector);
        for (const item of items) {
            const text = item.textContent || item.getAttribute('data-codec') || '';
            if (text.toUpperCase().includes(targetCodec)) {
                item.click();
                return { success: true, method: selector };
            }
        }
    }
    return { success: false };
}, '${codec}');

if (codecClicked.success) {
    console.log('[直播] 已切换编码到: ${codec}', codecClicked);
    await page.waitForTimeout(2000); // 等待编码切换和加载
} else {
    console.warn('[直播] 未找到${codec}编码选项');
    console.log('[直播] 可能原因: 1) 该直播间不支持此编码 2) 需要更新选择器');
}
`.trim()
            },

            switchLiveQuality: {
                name: '切换直播清晰度',
                description: 'B站直播：切换画质（原画/蓝光/超清等）',
                params: [
                    { name: 'quality', label: '画质', type: 'select', options: [
                        { value: '原画', label: '原画' },
                        { value: '蓝光', label: '蓝光' },
                        { value: '超清', label: '超清' },
                        { value: '高清', label: '高清' },
                        { value: '流畅', label: '流畅' }
                    ], default: '原画' }
                ],
                code: ({ quality = '原画' } = {}) => `
// B站直播切换画质
await page.evaluate(() => {
    // 打开画质菜单
    const qualityBtn = document.querySelector('.web-player-icon-switch-quality');
    if (qualityBtn) qualityBtn.click();
});
await page.waitForTimeout(500);

// 查找并点击画质选项
const qualityClicked = await page.evaluate((targetQuality) => {
    const qualityItems = document.querySelectorAll('.switch-quality-list .quality-item, .quality-list-item');
    for (const item of qualityItems) {
        if (item.textContent.includes(targetQuality)) {
            item.click();
            return true;
        }
    }
    return false;
}, '${quality}');

if (qualityClicked) {
    console.log('[直播] 已切换画质到: ${quality}');
    await page.waitForTimeout(1500); // 等待画质切换
} else {
    console.warn('[直播] 未找到${quality}画质选项');
}
`.trim()
            },

            checkLiveStatus: {
                name: '检查直播状态',
                description: 'B站直播：检查直播间状态（是否在播）',
                code: () => `
// 检查直播状态
const liveStatus = await page.evaluate(() => {
    const player = document.querySelector('video');
    const statusText = document.querySelector('.room-status-text, .live-status-text');

    return {
        hasVideo: !!player,
        videoPlaying: player ? !player.paused : false,
        statusText: statusText?.textContent || '',
        isLive: !document.querySelector('.room-cover'),
        currentTime: player?.currentTime || 0,
        buffered: player?.buffered.length > 0 ? player.buffered.end(0) : 0
    };
});

console.log('[直播] 状态检查:', JSON.stringify(liveStatus, null, 2));

if (!liveStatus.isLive) {
    console.warn('[直播] ⚠️ 直播间未开播');
} else if (liveStatus.videoPlaying) {
    console.log('[直播] ✅ 直播正常播放中');
} else {
    console.warn('[直播] ⚠️ 直播已开播但视频未播放');
}
`.trim()
            },

            monitorLiveStats: {
                name: '监控直播数据',
                description: 'B站直播：实时监控播放数据（帧率、码率等）',
                code: () => `
// 监控直播播放数据
const stats = await page.evaluate(() => {
    const video = document.querySelector('video');
    if (!video) return null;

    // 获取播放统计
    const getVideoStats = () => ({
        currentTime: video.currentTime.toFixed(2),
        buffered: video.buffered.length > 0 ? video.buffered.end(0).toFixed(2) : 0,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        paused: video.paused,
        networkState: video.networkState,
        readyState: video.readyState
    });

    return getVideoStats();
});

if (stats) {
    console.log('[直播] 播放数据:');
    console.log(\`  分辨率: \${stats.videoWidth}x\${stats.videoHeight}\`);
    console.log(\`  播放时间: \${stats.currentTime}s\`);
    console.log(\`  缓冲: \${stats.buffered}s\`);
    console.log(\`  状态: \${stats.paused ? '暂停' : '播放中'}\`);
} else {
    console.warn('[直播] 无法获取播放数据');
}
`.trim()
            }
        }
    },

    // ==================== 通用视频播放器操作 ====================
    generic: {
        name: '通用视频播放器',
        operations: {
            playGeneric: {
                name: '播放视频 (通用)',
                description: '尝试多种通用方法播放视频',
                code: () => `
// 尝试点击 video 元素
const video = await page.$('video');
if (video) {
    await video.click();
    console.log('[操作] 已点击 video 元素');
}

// 尝试执行 play()
await page.evaluate(() => {
    const v = document.querySelector('video');
    if (v) {
        v.play().catch(e => console.error('播放失败:', e));
    }
});
await page.waitForTimeout(1000);
`.trim()
            },

            pauseGeneric: {
                name: '暂停视频 (通用)',
                description: '暂停页面中的视频元素',
                code: () => `
await page.evaluate(() => {
    const v = document.querySelector('video');
    if (v) v.pause();
});
console.log('[操作] 已暂停视频');
`.trim()
            }
        }
    },

    // ==================== 页面交互操作 ====================
    interaction: {
        name: '页面交互',
        operations: {
            scrollDown: {
                name: '向下滚动',
                description: '滚动页面到指定位置',
                params: [
                    { name: 'distance', label: '距离(像素)', type: 'number', default: 1000, min: 0 }
                ],
                code: ({ distance = 1000 } = {}) => `
await page.evaluate((dist) => {
    window.scrollBy(0, dist);
}, ${distance});
console.log('[操作] 已向下滚动 ${distance}px');
await page.waitForTimeout(500);
`.trim()
            },

            scrollToBottom: {
                name: '滚动到底部',
                description: '滚动页面到最底部',
                code: () => `
await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
});
console.log('[操作] 已滚动到页面底部');
await page.waitForTimeout(500);
`.trim()
            },

            click: {
                name: '点击元素',
                description: '点击指定选择器的元素',
                params: [
                    { name: 'selector', label: 'CSS选择器', type: 'text', default: '.btn' }
                ],
                code: ({ selector = '.btn' } = {}) => `
await page.waitForSelector('${selector}', { timeout: 5000 });
await page.click('${selector}');
console.log('[操作] 已点击: ${selector}');
await page.waitForTimeout(500);
`.trim()
            },

            input: {
                name: '输入文本',
                description: '在输入框中输入文本',
                params: [
                    { name: 'selector', label: 'CSS选择器', type: 'text', default: 'input' },
                    { name: 'text', label: '输入内容', type: 'text', default: 'test' }
                ],
                code: ({ selector = 'input', text = 'test' } = {}) => `
await page.waitForSelector('${selector}', { timeout: 5000 });
await page.type('${selector}', '${text}');
console.log('[操作] 已输入文本: ${text}');
await page.waitForTimeout(500);
`.trim()
            },

            hover: {
                name: '悬停元素',
                description: '鼠标悬停在指定元素上',
                params: [
                    { name: 'selector', label: 'CSS选择器', type: 'text', default: '.item' }
                ],
                code: ({ selector = '.item' } = {}) => `
await page.waitForSelector('${selector}', { timeout: 5000 });
await page.hover('${selector}');
console.log('[操作] 已悬停: ${selector}');
await page.waitForTimeout(500);
`.trim()
            },

            wait: {
                name: '等待',
                description: '等待指定时间',
                params: [
                    { name: 'time', label: '时间(毫秒)', type: 'number', default: 2000, min: 0 }
                ],
                code: ({ time = 2000 } = {}) => `
await page.waitForTimeout(${time});
console.log('[操作] 已等待 ${time}ms');
`.trim()
            }
        }
    },

    // ==================== 性能测试操作 ====================
    performance: {
        name: '性能测试',
        operations: {
            memoryStress: {
                name: '内存压力测试',
                description: '创建大量对象以测试内存处理',
                code: () => `
await page.evaluate(() => {
    // 创建内存压力
    window.testData = [];
    for (let i = 0; i < 10000; i++) {
        window.testData.push({ id: i, data: new Array(1000).fill(i) });
    }
    console.log('[压力测试] 已创建 10000 个对象');
});
await page.waitForTimeout(1000);
`.trim()
            },

            cpuStress: {
                name: 'CPU压力测试',
                description: '执行密集计算以测试CPU性能',
                params: [
                    { name: 'duration', label: '持续时间(毫秒)', type: 'number', default: 3000, min: 1000 }
                ],
                code: ({ duration = 3000 } = {}) => `
await page.evaluate((ms) => {
    const start = Date.now();
    let count = 0;
    while (Date.now() - start < ms) {
        Math.sqrt(Math.random() * 1000000);
        count++;
    }
    console.log(\`[压力测试] CPU计算 \${count} 次，耗时 \${ms}ms\`);
}, ${duration});
`.trim()
            }
        }
    },

    // ==================== B站直播操作 ====================
    bilibiliLive: {
        name: 'B站直播',
        operations: {
            switchLiveLine: {
                name: '切换直播线路',
                description: 'B站直播：切换线路（主线/备线）',
                params: [
                    { name: 'line', label: '线路', type: 'select', options: [
                        { value: '主线', label: '主线' },
                        { value: '备线', label: '备线' }
                    ], default: '主线' }
                ],
                code: ({ line = '主线' } = {}) => `
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
}, '${line}');

if (lineClicked) {
    console.log('[直播] 已切换到${line}');
} else {
    console.warn('[直播] 未找到${line}选项');
}
await page.waitForTimeout(1500);
`.trim()
            },

            switchLiveCodec: {
                name: '切换直播编码',
                description: 'B站直播：切换编码方式（AVC/HEVC/AV1）',
                params: [
                    { name: 'codec', label: '编码', type: 'select', options: [
                        { value: 'AVC', label: 'AVC (H.264)' },
                        { value: 'HEVC', label: 'HEVC (H.265)' },
                        { value: 'AV1', label: 'AV1' }
                    ], default: 'AVC' }
                ],
                code: ({ codec = 'AVC' } = {}) => `
// B站直播切换编码方式
await page.evaluate(() => {
    const settingBtn = document.querySelector('.web-player-icon-switch-quality');
    if (settingBtn) settingBtn.click();
});
await page.waitForTimeout(500);

const codecClicked = await page.evaluate((targetCodec) => {
    // 尝试多种可能的选择器
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
}, '${codec}');

if (codecClicked) {
    console.log('[直播] 已切换到${codec}编码');
} else {
    console.warn('[直播] 未找到${codec}编码选项');
}
await page.waitForTimeout(1500);
`.trim()
            },

            switchLiveQuality: {
                name: '切换直播清晰度',
                description: 'B站直播：切换清晰度',
                params: [
                    { name: 'quality', label: '清晰度', type: 'select', options: [
                        { value: '原画', label: '原画' },
                        { value: '蓝光', label: '蓝光' },
                        { value: '超清', label: '超清' },
                        { value: '高清', label: '高清' },
                        { value: '流畅', label: '流畅' }
                    ], default: '蓝光' }
                ],
                code: ({ quality = '蓝光' } = {}) => `
// B站直播切换清晰度
await page.evaluate(() => {
    const settingBtn = document.querySelector('.web-player-icon-switch-quality');
    if (settingBtn) settingBtn.click();
});
await page.waitForTimeout(500);

const qualityClicked = await page.evaluate((targetQuality) => {
    const qualityItems = document.querySelectorAll('.switch-quality-list .quality-item');
    for (const item of qualityItems) {
        if (item.textContent.includes(targetQuality)) {
            item.click();
            return true;
        }
    }
    return false;
}, '${quality}');

if (qualityClicked) {
    console.log('[直播] 已切换到${quality}清晰度');
} else {
    console.warn('[直播] 未找到${quality}清晰度选项');
}
await page.waitForTimeout(1500);
`.trim()
            },

            checkLiveStatus: {
                name: '检查直播状态',
                description: 'B站直播：检查直播是否正常播放',
                code: () => `
// 检查直播状态
const liveStatus = await page.evaluate(() => {
    // 检查播放器是否存在
    const player = document.querySelector('video');
    if (!player) {
        return { status: 'error', message: '未找到播放器' };
    }

    // 检查是否在播放
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
`.trim()
            },

            monitorLiveStats: {
                name: '监控直播数据',
                description: 'B站直播：实时监控直播数据（分辨率、缓冲、播放状态）',
                params: [
                    { name: 'duration', label: '监控时长(秒)', type: 'number', min: 1, max: 300, default: 10 }
                ],
                code: ({ duration = 10 } = {}) => `
// 监控直播数据
console.log('[监控] 开始监控直播数据，时长: ${duration}秒');

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
        console.log(\`[监控] 分辨率:\${stats.videoWidth}x\${stats.videoHeight} | 缓冲:\${stats.buffered}s | 播放:\${!stats.paused}\`);
    }
}, 2000);

// ${duration}秒后停止监控
await page.waitForTimeout(${duration * 1000});
clearInterval(monitorInterval);
console.log('[监控] 监控结束');
`.trim()
            }
        }
    }
};

// 导出预设库
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OperationPresets;
}
