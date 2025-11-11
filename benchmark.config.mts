import { type UserOptions } from "@bilibili-player/benchmark";

const config: UserOptions = {
    mode: "headless",
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