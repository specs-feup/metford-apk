const config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "tsconfig.jest.json", useESM: true },
    ],
  },
  collectCoverage: false,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  collectCoverageFrom: ["src/**/*[^.d].(t|j)s"],
  coverageProvider: "v8",
  moduleNameMapper: {
    "(.+)\\.js": "$1",
  },
};

export default config;
