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
        "usrDataDir": "./usr_data/task_1764841937165_a4p0y1r8s"
    },
    reportPath: 'benchmark_report',
    runners: {
        Runtime: {
            testCases: [
                {
                    target: "https://ff-uat-live.bilibili.com/460689",
                    description: "压测"
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