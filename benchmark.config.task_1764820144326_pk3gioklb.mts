import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": false,
        "headless": false,
        "usrDataDir": "./usr_data/task_1764820144326_pk3gioklb"
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
                    cookie: [{"name":"DedeUserID","value":"123456","domain":".bilibili.com","path":"/"},{"name":"SESSDATA","value":"custom_session","domain":".bilibili.com","path":"/"}],
                    customCss: ".ad { display: none; }"
                }
            ],
            durationMs: 600000
        }
    }
};

export default config;