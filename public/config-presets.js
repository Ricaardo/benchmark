/**
 * 配置预设库
 * 为常见的配置场景提供预设，简化配置流程
 */

const ConfigPresets = {
    // ==================== Cookie 预设 ====================
    cookies: {
        name: 'Cookie 预设',
        presets: {
            bilibili_login: {
                name: 'B站登录态',
                description: '使用已登录的B站Cookie',
                value: {
                    SESSDATA: 'your_sessdata_here',
                    bili_jct: 'your_bili_jct_here',
                    DedeUserID: 'your_uid_here'
                },
                instruction: '请替换为你自己的Cookie值（在浏览器开发者工具 → Application → Cookies 中获取）'
            },
            youtube_login: {
                name: 'YouTube登录态',
                description: '使用已登录的YouTube Cookie',
                value: {
                    SID: 'your_sid_here',
                    HSID: 'your_hsid_here',
                    SSID: 'your_ssid_here'
                },
                instruction: '请替换为你自己的YouTube Cookie'
            },
            custom_simple: {
                name: '简单Cookie',
                description: '单个Cookie键值对',
                value: 'session_id=abc123',
                instruction: '格式: key=value 或 key1=value1; key2=value2'
            }
        }
    },

    // ==================== HTTP Headers 预设 ====================
    headers: {
        name: 'HTTP头预设',
        presets: {
            mobile_chrome: {
                name: '移动端Chrome UA',
                description: '模拟Android Chrome浏览器',
                value: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                }
            },
            mobile_safari: {
                name: '移动端Safari UA',
                description: '模拟iPhone Safari浏览器',
                value: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
                }
            },
            desktop_chrome: {
                name: '桌面端Chrome UA',
                description: '模拟Windows Chrome浏览器',
                value: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            },
            desktop_mac: {
                name: '桌面端Mac UA',
                description: '模拟Mac Safari浏览器',
                value: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            },
            with_auth: {
                name: 'Bearer Token认证',
                description: '添加Authorization头',
                value: {
                    'Authorization': 'Bearer your_token_here',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                instruction: '请替换 your_token_here 为实际的token'
            },
            api_key: {
                name: 'API Key认证',
                description: '使用X-API-Key头',
                value: {
                    'X-API-Key': 'your_api_key_here',
                    'Content-Type': 'application/json'
                },
                instruction: '请替换 your_api_key_here 为实际的API密钥'
            }
        }
    },

    // ==================== BlockList 预设 ====================
    blocklist: {
        name: '阻止列表预设',
        presets: {
            block_images: {
                name: '阻止图片',
                description: '阻止所有图片资源加载',
                value: ['*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp', '*.svg', '*.ico', '*.bmp']
            },
            block_videos: {
                name: '阻止视频',
                description: '阻止视频文件加载（但不阻止流媒体）',
                value: ['*.mp4', '*.webm', '*.ogg', '*.avi', '*.mov']
            },
            block_ads: {
                name: '阻止广告',
                description: '阻止常见广告域名',
                value: [
                    '**/ad.js',
                    '**/ads.js',
                    '**/analytics.js',
                    '**/tracker.js',
                    'https://www.googletagmanager.com/**',
                    'https://www.google-analytics.com/**',
                    'https://pagead2.googlesyndication.com/**',
                    'https://tpc.googlesyndication.com/**',
                    '*doubleclick.net*',
                    '*googlesyndication.com*'
                ]
            },
            block_analytics: {
                name: '阻止分析统计',
                description: '阻止常见的统计分析脚本',
                value: [
                    'https://www.google-analytics.com/**',
                    'https://analytics.google.com/**',
                    'https://stats.g.doubleclick.net/**',
                    '**/ga.js',
                    '**/analytics.js',
                    '**/gtag/**',
                    'https://hm.baidu.com/**',
                    'https://s.cnzz.com/**'
                ]
            },
            block_fonts: {
                name: '阻止字体',
                description: '阻止Web字体加载',
                value: ['*.woff', '*.woff2', '*.ttf', '*.eot', '*.otf']
            },
            block_styles: {
                name: '阻止样式表',
                description: '阻止CSS文件（仅用于测试）',
                value: ['*.css']
            },
            performance_mode: {
                name: '性能模式',
                description: '阻止大部分非必要资源，提升性能',
                value: [
                    '*.jpg', '*.jpeg', '*.png', '*.gif', '*.webp', '*.svg',
                    '*.woff', '*.woff2', '*.ttf',
                    '**/analytics.js', '**/ga.js', '**/tracker.js',
                    '*doubleclick.net*', '*googlesyndication.com*'
                ]
            },
            bilibili_ads: {
                name: 'B站广告',
                description: '阻止B站广告相关请求',
                value: [
                    'https://api.bilibili.com/x/web-show/**',
                    'https://s1.hdslb.com/bfs/cm/**',
                    '**/bstar/**',
                    '**/ad/**'
                ]
            }
        }
    },

    // ==================== Device Options 预设 ====================
    devices: {
        name: '设备预设',
        presets: {
            // Desktop 预设
            desktop_fullhd: {
                name: '桌面 Full HD',
                type: 'Desktop',
                description: '1920x1080 全屏桌面',
                value: ['Desktop', { fullscreen: true }],
                displayText: '1920x1080 全屏'
            },
            desktop_normal: {
                name: '桌面 标准',
                type: 'Desktop',
                description: '1920x1080 窗口模式',
                value: ['Desktop', {}],
                displayText: '1920x1080 窗口'
            },
            desktop_2k: {
                name: '桌面 2K',
                type: 'Desktop',
                description: '2560x1440 分辨率',
                value: ['Desktop', { width: 2560, height: 1440 }],
                displayText: '2560x1440'
            },
            desktop_4k: {
                name: '桌面 4K',
                type: 'Desktop',
                description: '3840x2160 分辨率',
                value: ['Desktop', { width: 3840, height: 2160 }],
                displayText: '3840x2160'
            },
            desktop_small: {
                name: '桌面 小屏',
                type: 'Desktop',
                description: '1366x768 笔记本常见分辨率',
                value: ['Desktop', { width: 1366, height: 768 }],
                displayText: '1366x768'
            },

            // Mobile 预设
            mobile_android: {
                name: 'Android 手机',
                type: 'Mobile',
                description: '通用Android手机',
                value: ['Mobile', { preset: 'android' }],
                displayText: 'Android (360x640)'
            },
            mobile_iphone: {
                name: 'iPhone',
                type: 'Mobile',
                description: 'iPhone 标准尺寸',
                value: ['Mobile', { preset: 'iphone' }],
                displayText: 'iPhone (375x667)'
            },
            mobile_iphone_pro: {
                name: 'iPhone Pro',
                type: 'Mobile',
                description: 'iPhone Pro 大屏',
                value: ['Mobile', { preset: 'iphone', width: 390, height: 844 }],
                displayText: 'iPhone Pro (390x844)'
            },
            mobile_iphone_pro_max: {
                name: 'iPhone Pro Max',
                type: 'Mobile',
                description: 'iPhone Pro Max 超大屏',
                value: ['Mobile', { preset: 'iphone', width: 428, height: 926 }],
                displayText: 'iPhone Pro Max (428x926)'
            },
            mobile_ipad: {
                name: 'iPad',
                type: 'Mobile',
                description: 'iPad 平板',
                value: ['Mobile', { preset: 'iphone', width: 768, height: 1024 }],
                displayText: 'iPad (768x1024)'
            },
            mobile_galaxy_s21: {
                name: 'Galaxy S21',
                type: 'Mobile',
                description: 'Samsung Galaxy S21',
                value: ['Mobile', { preset: 'android', width: 360, height: 800 }],
                displayText: 'Galaxy S21 (360x800)'
            }
        }
    },

    // ==================== Custom CSS 预设 ====================
    customCss: {
        name: 'CSS预设',
        presets: {
            hide_ads: {
                name: '隐藏广告',
                description: '通过CSS隐藏常见广告元素',
                value: `
/* 隐藏常见广告容器 */
.ad, .ads, .advertisement, .adsbygoogle,
[class*="ad-"], [class*="ads-"],
[id*="ad-"], [id*="ads-"] {
    display: none !important;
}
`.trim()
            },
            hide_headers: {
                name: '隐藏头部导航',
                description: '隐藏页面顶部导航栏',
                value: `
header, .header, .nav, .navbar,
[class*="header"], [class*="nav"] {
    display: none !important;
}
body { padding-top: 0 !important; }
`.trim()
            },
            hide_footers: {
                name: '隐藏页脚',
                description: '隐藏页面底部内容',
                value: `
footer, .footer, [class*="footer"] {
    display: none !important;
}
`.trim()
            },
            focus_video: {
                name: '视频聚焦模式',
                description: '隐藏除视频外的所有内容',
                value: `
/* 只显示视频播放器 */
body > *:not([class*="video"]):not([class*="player"]) {
    display: none !important;
}
video, [class*="video"], [class*="player"] {
    display: block !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
}
`.trim()
            },
            dark_mode: {
                name: '暗黑模式',
                description: '强制暗黑主题',
                value: `
/* 暗黑模式 */
body, html {
    background: #1a1a1a !important;
    color: #e0e0e0 !important;
}
a { color: #64b5f6 !important; }
input, textarea, select {
    background: #2a2a2a !important;
    color: #e0e0e0 !important;
    border-color: #444 !important;
}
`.trim()
            },
            performance_boost: {
                name: '性能提升',
                description: '禁用动画和阴影以提升性能',
                value: `
/* 禁用所有动画和过渡效果 */
*, *::before, *::after {
    animation: none !important;
    transition: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
}
`.trim()
            },
            bilibili_clean: {
                name: 'B站净化',
                description: '净化B站页面，只保留播放器',
                value: `
/* B站页面净化 */
.bili-header, .international-footer,
.right-entry, .slide-ad-exp, .ad-report,
.rec-list, .video-page-special-card,
.recommend-video-card {
    display: none !important;
}
#bilibili-player {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
}
`.trim()
            }
        }
    },

    // ==================== 场景化配置组合 ====================
    scenarios: {
        name: '场景预设',
        presets: {
            performance_test: {
                name: '性能测试',
                description: '适合性能测试的配置组合',
                config: {
                    blocklist: ['*.jpg', '*.png', '*.gif', '*.webp', '**/analytics.js', '**/ga.js'],
                    customCss: '*, *::before, *::after { animation: none !important; transition: none !important; }',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            },
            memory_test: {
                name: '内存泄漏测试',
                description: '适合内存泄漏测试',
                config: {
                    blocklist: ['**/analytics.js', '**/tracker.js', '*doubleclick.net*'],
                    customCss: ''
                }
            },
            mobile_test: {
                name: '移动端测试',
                description: '移动端性能测试配置',
                config: {
                    deviceOptions: ['Mobile', { preset: 'iphone' }],
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
                    },
                    blocklist: ['*.jpg', '*.png', '*.gif']
                }
            },
            desktop_test: {
                name: '桌面端测试',
                description: '桌面端性能测试配置',
                config: {
                    deviceOptions: ['Desktop', { fullscreen: true }],
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            }
        }
    }
};

// 导出预设库
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigPresets;
}
