import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": false,
        "headless": true
    },
    reportPath: 'benchmark_report',
    runners: {
        Runtime: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "首页（默认配置）",
                    delayMs: 3000,
                    cookie: [{"name":"default_cookie","value":"value","domain":".bilibili.com","path":"/"}]
                },
                {
                    target: "https://www.bilibili.com/video/BV1xx411c7mD",
                    description: "视频页（自定义Cookie）",
                    delayMs: 3000,
                    cookie: [{"name":"DedeUserID","value":"123456","domain":".bilibili.com","path":"/"},{"name":"SESSDATA","value":"custom_session","domain":".bilibili.com","path":"/"}],
                    customCss: ".ad { display: none; }"
                }
            ],
            durationMs: 60000
        }
    }
};

export default config;