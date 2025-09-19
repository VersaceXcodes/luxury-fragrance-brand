module.exports = {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "setupFilesAfterEnv": [
        "<rootDir>/tests/setup.ts"
    ],
    "testMatch": [
        "**/__tests__/**/*.test.ts",
        "**/?(*.)+(spec|test).ts"
    ],
    "collectCoverageFrom": [
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/types/**"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": [
        "text",
        "lcov",
        "html"
    ],
    "testTimeout": 30000,
    "maxWorkers": 1,
    "verbose": true,
    "detectOpenHandles": true,
    "forceExit": true
};
export {};
//# sourceMappingURL=jest.config.js.map