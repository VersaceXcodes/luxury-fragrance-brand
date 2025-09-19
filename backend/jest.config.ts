module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/?(*.)+(spec|test).ts"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "server.test.ts"
  ],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**"
  ],
  coverageDirectory: "coverage",
  coverageReporters: [
    "text",
    "lcov",
    "html"
  ],
  testTimeout: 30000,
  maxWorkers: 1,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};