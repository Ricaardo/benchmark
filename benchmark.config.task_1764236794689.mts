import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": false,
        "headless": false,
        "usrDataDir": "./usr_data/task_1764236794689"
    },
    reportPath: 'benchmark_report',
    runners: {
        MemoryLeak: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "首页",
                    beforePageLoad: async ({ page, context, session }: any) => {
                        await session.send("Network.emulateNetworkConditions", {"offline":true,"downloadThroughput":0,"uploadThroughput":0,"latency":0,"connectionType":"none"});
                    }
                },
                {
                    target: "https://www.bilibili.com/video/BV1xx411c7mD",
                    description: "视频页",
                    cookie: [{"name":"DedeUserID","value":"123456","domain":".bilibili.com","path":"/"},{"name":"SESSDATA","value":"custom_session","domain":".bilibili.com","path":"/"}],
                    customCss: ".ad { display: none; }"
                }
            ],
            intervalMs: 60000,
            iterations: 3
        }
    }
};

export default config;