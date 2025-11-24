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
                    description: "首页"
                },
                {
                    target: "https://www.bilibili.com/video/BV1xx411c7mD",
                    description: "视频页",
                    cookie: [{"name":"DedeUserID","value":"123456","domain":".bilibili.com","path":"/"},{"name":"SESSDATA","value":"custom_session","domain":".bilibili.com","path":"/"}],
                    customCss: ".ad { display: none; }"
                }
            ],
            durationMs: 60000
        }
    }
};

export default config;