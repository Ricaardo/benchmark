/**
 * 生命周期钩子预设库
 * 为不同的钩子函数提供常用的预设操作
 */

const HookPresets = {
    // ==================== beforePageLoad 预设 ====================
    beforePageLoad: {
        name: 'beforePageLoad 预设',
        description: '在页面加载之前执行，用于设置环境',
        presets: {
            set_viewport_1080p: {
                name: '设置视口 1080P',
                description: '设置浏览器视口为1920x1080',
                code: `
// 设置视口大小为 1920x1080
await page.setViewportSize({ width: 1920, height: 1080 });
console.log('[beforePageLoad] 视口已设置为 1920x1080');
`.trim()
            },
            set_viewport_720p: {
                name: '设置视口 720P',
                description: '设置浏览器视口为1280x720',
                code: `
// 设置视口大小为 1280x720
await page.setViewportSize({ width: 1280, height: 720 });
console.log('[beforePageLoad] 视口已设置为 1280x720');
`.trim()
            },
            set_viewport_mobile: {
                name: '设置移动端视口',
                description: '设置为典型移动端尺寸',
                code: `
// 设置移动端视口
await page.setViewportSize({ width: 375, height: 667 });
console.log('[beforePageLoad] 视口已设置为移动端尺寸');
`.trim()
            },
            enable_console_log: {
                name: '启用控制台日志',
                description: '捕获页面的console.log输出',
                code: `
// 监听页面console消息
page.on('console', msg => {
    console.log('[页面Console]', msg.type(), msg.text());
});
console.log('[beforePageLoad] 已启用控制台日志监听');
`.trim()
            },
            block_notifications: {
                name: '阻止通知权限',
                description: '自动拒绝通知权限请求',
                code: `
// 阻止通知权限
await context.grantPermissions([], { origin: page.url() });
console.log('[beforePageLoad] 已阻止通知权限');
`.trim()
            },
            set_geolocation: {
                name: '设置地理位置',
                description: '模拟地理位置（北京）',
                code: `
// 设置地理位置为北京
await context.setGeolocation({
    latitude: 39.9042,
    longitude: 116.4074
});
console.log('[beforePageLoad] 地理位置已设置为北京');
`.trim()
            },
            inject_script: {
                name: '注入全局脚本',
                description: '在所有页面注入自定义脚本',
                code: `
// 注入全局脚本
await context.addInitScript(() => {
    // 在这里添加要注入的代码
    window.customFlag = true;
    console.log('[注入脚本] 全局变量已设置');
});
console.log('[beforePageLoad] 脚本已注入');
`.trim()
            },
            disable_animations: {
                name: '禁用CSS动画',
                description: '通过注入脚本禁用所有CSS动画',
                code: `
// 禁用CSS动画和过渡效果
await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = \`
        *, *::before, *::after {
            animation-duration: 0s !important;
            transition-duration: 0s !important;
        }
    \`;
    document.head.appendChild(style);
});
console.log('[beforePageLoad] CSS动画已禁用');
`.trim()
            }
        }
    },

    // ==================== onPageLoaded 预设 ====================
    onPageLoaded: {
        name: 'onPageLoaded 预设',
        description: '页面加载完成后执行，用于验证和等待',
        presets: {
            wait_for_video: {
                name: '等待视频加载',
                description: '等待video元素出现',
                code: `
// 等待视频元素加载
await page.waitForSelector('video', { timeout: 10000 });
console.log('[onPageLoaded] 视频元素已加载');
`.trim()
            },
            wait_for_content: {
                name: '等待内容加载',
                description: '等待主要内容区域加载',
                code: `
// 等待主要内容加载
await page.waitForSelector('.content, #content, main, [role="main"]', {
    timeout: 10000
});
console.log('[onPageLoaded] 主要内容已加载');
`.trim()
            },
            wait_network_idle: {
                name: '等待网络空闲',
                description: '等待所有网络请求完成',
                code: `
// 等待网络空闲
await page.waitForLoadState('networkidle', { timeout: 30000 });
console.log('[onPageLoaded] 网络请求已完成');
`.trim()
            },
            check_no_errors: {
                name: '检查页面错误',
                description: '检查页面是否有JavaScript错误',
                code: `
// 监听页面错误
const errors = [];
page.on('pageerror', error => {
    errors.push(error.message);
    console.error('[页面错误]', error.message);
});

// 等待一段时间收集错误
await page.waitForTimeout(2000);

if (errors.length > 0) {
    console.warn(\`[onPageLoaded] 检测到 \${errors.length} 个页面错误\`);
} else {
    console.log('[onPageLoaded] 页面无错误');
}
`.trim()
            },
            scroll_to_load: {
                name: '滚动触发懒加载',
                description: '滚动页面触发图片懒加载',
                code: `
// 滚动页面触发懒加载
for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
}
await page.evaluate(() => window.scrollTo(0, 0));
console.log('[onPageLoaded] 滚动触发懒加载完成');
`.trim()
            },
            remove_overlays: {
                name: '移除弹窗遮罩',
                description: '自动关闭可能出现的弹窗',
                code: `
// 尝试关闭常见的弹窗
const selectors = [
    '.modal .close', '.modal-close', '.popup-close',
    '[class*="close"]', '[aria-label="Close"]',
    '.overlay .close-btn'
];

for (const selector of selectors) {
    try {
        const btn = await page.$(selector);
        if (btn) {
            await btn.click();
            console.log(\`[onPageLoaded] 已关闭弹窗: \${selector}\`);
            await page.waitForTimeout(500);
        }
    } catch (e) {
        // 忽略错误
    }
}
`.trim()
            },
            bilibili_wait_player: {
                name: 'B站等待播放器加载',
                description: 'B站专用：等待播放器完全加载',
                code: `
// 等待B站播放器加载
await page.waitForSelector('.bpx-player-video-wrap', { timeout: 15000 });
await page.waitForTimeout(2000); // 等待播放器初始化

// 检查播放器是否可用
const playerReady = await page.evaluate(() => {
    return !!window.player;
});

if (playerReady) {
    console.log('[onPageLoaded] B站播放器已就绪');
} else {
    console.warn('[onPageLoaded] B站播放器未检测到');
}
`.trim()
            }
        }
    },

    // ==================== onPageTesting 预设 ====================
    onPageTesting: {
        name: 'onPageTesting 预设',
        description: '仅用于Runtime测试，在性能监控期间执行用户操作',
        presets: {
            click_play: {
                name: '点击播放按钮',
                description: '点击视频播放按钮',
                code: `
// 点击播放按钮
await page.click('.bpx-player-ctrl-btn, .bilibili-player-video-btn-start, .video-play-btn, [aria-label="play"]');
console.log('[onPageTesting] 已点击播放按钮');
`.trim()
            },
            video_switch: {
                name: '切换视频',
                description: '切换到下一个视频',
                code: `
// 切换到下一个视频
await page.evaluate(() => {
    const nextBtn = document.querySelector('.next-button, .recommend-list .video-item');
    if (nextBtn) nextBtn.click();
});
await page.waitForTimeout(2000);
console.log('[onPageTesting] 已切换视频');
`.trim()
            },
            scroll_page: {
                name: '页面滚动',
                description: '滚动页面到底部再回到顶部',
                code: `
// 滚动页面到底部再回到顶部
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo(0, 0));
console.log('[onPageTesting] 页面滚动完成');
`.trim()
            },
            tab_switch: {
                name: '标签页切换',
                description: '在页面内的标签之间切换',
                code: `
// 切换标签页
await page.evaluate(() => {
    const tabs = document.querySelectorAll('.tab-item, .nav-tab');
    if (tabs.length > 1) {
        tabs[1].click();
        setTimeout(() => tabs[0].click(), 1000);
    }
});
console.log('[onPageTesting] 标签页切换完成');
`.trim()
            },
            popup_open_close: {
                name: '弹窗开关',
                description: '打开并关闭弹窗',
                code: `
// 打开并关闭弹窗
await page.evaluate(() => {
    const openBtn = document.querySelector('[data-modal], .open-modal, .popup-trigger');
    if (openBtn) {
        openBtn.click();
        setTimeout(() => {
            const closeBtn = document.querySelector('.close, .modal-close, [data-dismiss]');
            if (closeBtn) closeBtn.click();
        }, 1000);
    }
});
console.log('[onPageTesting] 弹窗操作完成');
`.trim()
            },
            list_scroll: {
                name: '列表无限滚动',
                description: '触发无限滚动加载更多内容',
                code: `
// 触发无限滚动加载
for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
        const container = document.querySelector('.infinite-list, .scroll-container');
        if (container) container.scrollTop = container.scrollHeight;
    });
    await page.waitForTimeout(1500);
}
console.log('[onPageTesting] 无限滚动完成');
`.trim()
            },
            image_load: {
                name: '动态加载图片',
                description: '滚动加载懒加载图片',
                code: `
// 滚动加载懒加载图片
await page.evaluate(() => {
    const images = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    images.forEach(img => {
        img.scrollIntoView();
    });
});
await page.waitForTimeout(2000);
console.log('[onPageTesting] 图片加载完成');
`.trim()
            },
            bilibili_danmaku: {
                name: 'B站弹幕开关',
                description: 'B站专用：开关弹幕',
                code: `
// B站弹幕开关操作
await page.click('.bpx-player-dm-switch, .bilibili-player-video-danmaku-switch');
await page.waitForTimeout(1000);
await page.click('.bpx-player-dm-switch, .bilibili-player-video-danmaku-switch');
console.log('[onPageTesting] B站弹幕开关完成');
`.trim()
            }
        }
    },

    // ==================== onPageCollecting 预设 ====================
    onPageCollecting: {
        name: 'onPageCollecting 预设',
        description: '仅用于MemoryLeak测试，在收集内存数据前执行',
        presets: {
            force_gc: {
                name: '强制垃圾回收',
                description: '触发JavaScript垃圾回收',
                code: `
// 强制垃圾回收（需要启动时添加 --expose-gc 参数）
await page.evaluate(() => {
    if (window.gc) {
        window.gc();
        console.log('[GC] 垃圾回收已触发');
    } else {
        console.warn('[GC] 垃圾回收不可用');
    }
});
console.log('[onPageCollecting] 已尝试触发GC');
`.trim()
            },
            pause_video: {
                name: '暂停视频',
                description: '在收集内存前暂停视频',
                code: `
// 暂停所有视频
await page.evaluate(() => {
    const videos = document.querySelectorAll('video');
    videos.forEach(v => v.pause());
    console.log(\`[暂停] 已暂停 \${videos.length} 个视频\`);
});
console.log('[onPageCollecting] 视频已暂停');
`.trim()
            },
            clear_cache: {
                name: '清理页面缓存',
                description: '尝试清理页面缓存对象',
                code: `
// 清理可能的缓存对象
await page.evaluate(() => {
    // 清理一些常见的缓存变量
    if (window.cache) delete window.cache;
    if (window.tempData) delete window.tempData;
    console.log('[清理] 缓存对象已清理');
});
console.log('[onPageCollecting] 缓存已清理');
`.trim()
            },
            stop_animations: {
                name: '停止所有动画',
                description: '停止页面中的动画和定时器',
                code: `
// 停止动画和定时器
await page.evaluate(() => {
    // 暂停所有动画
    const style = document.createElement('style');
    style.textContent = '* { animation-play-state: paused !important; }';
    document.head.appendChild(style);

    console.log('[停止] 动画已暂停');
});
console.log('[onPageCollecting] 动画已停止');
`.trim()
            },
            collect_metrics: {
                name: '收集性能指标',
                description: '在收集前记录当前性能指标',
                code: `
// 收集当前性能指标
const metrics = await page.evaluate(() => {
    const perf = performance.memory;
    return {
        usedJSHeapSize: perf?.usedJSHeapSize || 0,
        totalJSHeapSize: perf?.totalJSHeapSize || 0,
        jsHeapSizeLimit: perf?.jsHeapSizeLimit || 0
    };
});

console.log('[onPageCollecting] 当前内存:',
    Math.round(metrics.usedJSHeapSize / 1024 / 1024) + 'MB');
`.trim()
            }
        }
    },

    // ==================== onPageUnload 预设 ====================
    onPageUnload: {
        name: 'onPageUnload 预设',
        description: '页面卸载前执行，用于清理和保存',
        presets: {
            save_screenshot: {
                name: '保存截图',
                description: '在卸载前保存页面截图',
                code: `
// 保存页面截图
const timestamp = Date.now();
await page.screenshot({
    path: \`./screenshots/page-\${timestamp}.png\`,
    fullPage: false
});
console.log(\`[onPageUnload] 截图已保存: page-\${timestamp}.png\`);
`.trim()
            },
            log_final_state: {
                name: '记录最终状态',
                description: '记录页面的最终状态信息',
                code: `
// 记录页面最终状态
const finalState = await page.evaluate(() => {
    return {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
    };
});

console.log('[onPageUnload] 最终状态:', JSON.stringify(finalState));
`.trim()
            },
            collect_errors: {
                name: '收集错误日志',
                description: '汇总并输出所有错误',
                code: `
// 收集并输出错误日志
const errors = await page.evaluate(() => {
    // 从window对象收集错误（如果有记录）
    return window.errorLog || [];
});

if (errors.length > 0) {
    console.log(\`[onPageUnload] 发现 \${errors.length} 个错误:\`);
    errors.forEach((err, i) => {
        console.log(\`  \${i + 1}. \${err}\`);
    });
} else {
    console.log('[onPageUnload] 无错误记录');
}
`.trim()
            },
            cleanup_listeners: {
                name: '清理事件监听',
                description: '移除页面上的事件监听器',
                code: `
// 清理事件监听器
await page.evaluate(() => {
    // 移除所有事件监听器（通过克隆节点）
    const oldBody = document.body;
    const newBody = oldBody.cloneNode(true);
    oldBody.parentNode?.replaceChild(newBody, oldBody);

    console.log('[清理] 事件监听器已移除');
});
console.log('[onPageUnload] 监听器已清理');
`.trim()
            },
            close_connections: {
                name: '关闭连接',
                description: '关闭WebSocket和其他连接',
                code: `
// 关闭WebSocket和其他连接
await page.evaluate(() => {
    // 关闭WebSocket
    if (window.ws) {
        window.ws.close();
        console.log('[关闭] WebSocket已关闭');
    }

    // 清理定时器
    for (let i = 1; i < 9999; i++) {
        window.clearTimeout(i);
        window.clearInterval(i);
    }

    console.log('[关闭] 定时器已清理');
});
console.log('[onPageUnload] 连接已关闭');
`.trim()
            },
            export_data: {
                name: '导出数据',
                description: '导出测试过程中收集的数据',
                code: `
// 导出测试数据
const testData = await page.evaluate(() => {
    return {
        performance: performance.getEntries().length,
        domNodes: document.querySelectorAll('*').length,
        timestamp: Date.now()
    };
});

console.log('[onPageUnload] 测试数据:', JSON.stringify(testData));
`.trim()
            }
        }
    },

    // ==================== 通用组合预设 ====================
    combinations: {
        name: '组合预设',
        description: '常见场景的钩子组合',
        presets: {
            performance_test: {
                name: '性能测试套装',
                hooks: {
                    beforePageLoad: 'disable_animations',
                    onPageLoaded: 'wait_network_idle',
                    onPageUnload: 'log_final_state'
                }
            },
            memory_test: {
                name: '内存测试套装',
                hooks: {
                    beforePageLoad: 'enable_console_log',
                    onPageLoaded: 'wait_for_video',
                    onPageCollecting: 'force_gc',
                    onPageUnload: 'cleanup_listeners'
                }
            },
            bilibili_test: {
                name: 'B站测试套装',
                hooks: {
                    beforePageLoad: 'set_viewport_1080p',
                    onPageLoaded: 'bilibili_wait_player',
                    onPageUnload: 'save_screenshot'
                }
            }
        }
    }
};

// 导出预设库
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HookPresets;
}
