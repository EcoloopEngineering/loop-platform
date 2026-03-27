import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  maxWorkers: 1,
  workerIdleMemoryLimit: '256MB',
  testRegex: '.*\\.spec\\.ts$',
  moduleNameMapper: {
    '^@loop/shared(.*)$': '<rootDir>/../../../packages/shared/dist/cjs/index.js',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/index.ts',
    '!**/test/**',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};

export default config;
