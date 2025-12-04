import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    __internal__: {
        launchOptions: {
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox"
            ]
        }
    },
    mode: {
        "anonymous": false,
        "headless": false,
        "usrDataDir": "./usr_data/task_1764842382461_5prcrp4ho"
    },
    reportPath: 'benchmark_report',
    runners: {
        Runtime: {
            testCases: [
                {
                    target: "https://ff-uat-live.bilibili.com/460689",
                    description: "压测",
                    cookie: [{"name":"SESSDATA","value":"09cd98b2,1765108117,0fe42161","domain":".bilibili.com","path":"/"},{"name":"bili_jct","value":"ec61384dc05b4ca1df81f26f79f9b25a","domain":".bilibili.com","path":"/"},{"name":"DedeUserID","value":"110000233","domain":".bilibili.com","path":"/"},{"name":"buvid3","value":"FFFFFFFF-00FE-TEST-MAIN-FRONTWHITEBUVID00infoc","domain":".bilibili.com","path":"/"}]
                },
                {
                    target: "https://ff-uat-live.bilibili.com/460690",
                    description: "非压测",
                    customCss: ".ad { display: none; }"
                }
            ],
            durationMs: 60000
        }
    }
};

export default config;