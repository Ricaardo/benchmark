import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": false,
        "headless": false
    },
    reportPath: 'benchmark_report',
    runners: {
        Runtime: {
            testCases: [
                {
                    target: "https://ff-uat-live.bilibili.com/460689?session_id=5185513f1f36bc8c29301c29c5686de3_44F81031-CE59-4CB7-BA8C-E6BACD1BE17C&launch_id=1000001&live_from=71001&_apiEnv_=uat",
                    description: "uat直播",
                    cookie: [{"name":"SESSDATA","value":"09cd98b2,1765108117,0fe42161","domain":".bilibili.com","path":"/"},{"name":"bili_jct","value":"ec61384dc05b4ca1df81f26f79f9b25a","domain":".bilibili.com","path":"/"},{"name":"DedeUserID","value":"110000233","domain":".bilibili.com","path":"/"},{"name":"buvid3","value":"FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc","domain":".bilibili.com","path":"/"}],
                    onPageLoaded: async ({ page, context, session }: any) => {
                        console.log("页面加载完成，开始监控...");
                    }
                }
            ],
            durationMs: 30000,
            delayMs: 5000
        }
    }
};

export default config;