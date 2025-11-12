import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: {
        anonymous: true,
        headless: true
    },
    runners: {
        Initialization: {
            testCases: [
                {
                    target: "https://www.bilibili.com",
                    description: "https://www.bilibili.com"
                }
            ]
        }
    }
};

export default config;