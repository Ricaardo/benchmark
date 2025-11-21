import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": true,
        "headless": true
    },
    reportPath: 'benchmark_report',
    runners: {
        Runtime: {
            testCases: [
                {
                    target: "https://www.bilibili.com/video/BV1xx411c7mD",
                    description: "https://www.bilibili.com/video/BV1xx411c7mD",
                    onPageLoaded: async ({ page, context, session }: any) => {
                        console.log("页面加载完成，开始监控...");
                    },
                    onPageTesting: async ({ page, context, session }: any) => {
                        // 点击播放按钮
await page.click(".bpx-player-ctrl-btn");
                    }
                }
            ],
            durationMs: 30000,
            delayMs: 5000
        }
    }
};

export default config;