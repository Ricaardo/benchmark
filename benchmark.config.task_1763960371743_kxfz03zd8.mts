import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": false,
        "headless": false
    },
    reportPath: 'benchmark_report',
    runners: {
        MemoryLeak: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "首页",
                    onPageTesting: async ({ context, page, session }: any) => {
                        // 滚动页面到底部再回到顶部
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo(0, 0));
console.log('页面滚动完成');
                    }
                },
                {
                    target: "https://www.bilibili.com/video/BV1xx411c7mD",
                    description: "视频页",
                    cookie: [{"name":"DedeUserID","value":"123456","domain":".bilibili.com","path":"/"},{"name":"SESSDATA","value":"custom_session","domain":".bilibili.com","path":"/"}],
                    customCss: ".ad { display: none; }",
                    onPageTesting: async ({ context, page, session }: any) => {
                        // 滚动页面到底部再回到顶部
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1000);
await page.evaluate(() => window.scrollTo(0, 0));
console.log('页面滚动完成');
                    }
                }
            ],
            intervalMs: 60000,
            iterations: 3
        }
    }
};

export default config;