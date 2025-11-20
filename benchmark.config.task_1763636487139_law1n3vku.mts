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
                    target: "https://www.bilibili.com",
                    description: "哈哈哈哈哈哈",
                    cookie: [{"name":"SESSDATA","value":"09cd98b2,1765108117,0fe42161","domain":".bilibili.com","path":"/"},{"name":"bili_jct","value":"ec61384dc05b4ca1df81f26f79f9b25a","domain":".bilibili.com","path":"/"},{"name":"DedeUserID","value":"110000233","domain":".bilibili.com","path":"/"},{"name":"buvid3","value":"FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc","domain":".bilibili.com","path":"/"}]
                }
            ],
            durationMs: 60000
        }
    }
};

export default config;