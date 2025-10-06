export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^chalk$': '<rootDir>/tests/__mocks__/chalk.ts',
    '^ora$': '<rootDir>/tests/__mocks__/ora.ts',
  },
  transform: {
    '^.+\\.tsx?$': '<rootDir>/jest-esm-transformer.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*.mjs$)',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  testMatch: [
    '**/tests/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};
