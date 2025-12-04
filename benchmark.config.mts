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
        "anonymous": true,
        "headless": true,
        "usrDataDir": "",
        "preparePage": false
    },
    runners: {
        Runtime: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "B站首页"
                },
                {
                    target: "https://live.bilibili.com",
                    description: "B站直播"
                }
            ],
            durationMs: 300000,
            metrics: ["runtime","longtask","longAnimationFrame","fps"]
        },
        MemoryLeak: {
            testCases: [

            ],
            intervalMs: 60000,
            iterations: 3
        }
    }
};

export default config;