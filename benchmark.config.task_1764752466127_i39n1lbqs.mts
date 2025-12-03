import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": false,
        "headless": false,
        "usrDataDir": "./usr_data/task_1764752466127_i39n1lbqs"
    },
    reportPath: 'benchmark_report',
    runners: {
        Initialization: {
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
            ]
        }
    }
};

export default config;