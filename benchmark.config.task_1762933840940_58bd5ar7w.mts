import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": true,
        "headless": true
    },
    runners: {
        Initialization: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "🎨 示例7: 自定义CSS - 隐藏广告 - https://www.bilibili.com",
                    customCss: ".ad-report, .bili-banner, [class*=\"ad-\"] { display: none !important; }"
                }
            ],
            iterations: 5
        },
        Runtime: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "🎨 示例7: 自定义CSS - 隐藏广告 - https://www.bilibili.com",
                    customCss: ".ad-report, .bili-banner, [class*=\"ad-\"] { display: none !important; }"
                }
            ],
            durationMs: 30000,
            delayMs: 5000
        }
    }
};

export default config;