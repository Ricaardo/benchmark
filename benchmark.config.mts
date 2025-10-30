import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        "anonymous": true,
        "headless": false
},
    runners: {
        Runtime: {
            testCases: [
          {
                    target: "https://live.bilibili.com/?spm_id_from=333.1007.0.0",
                    description: "查韦斯"
          }
],
            durationMs: 60000,
            delayMs: 10000,
        },
    },
};

export default config;