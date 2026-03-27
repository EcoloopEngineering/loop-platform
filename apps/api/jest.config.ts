import type { Config } from 'jest';

const isCI = process.env.CI === 'true';

const config: Config = {
  testEnvironment: 'node',
  rootDir: 'src',
  maxWorkers: isCI ? '50%' : 1,
  workerIdleMemoryLimit: isCI ? '512MB' : '256MB',
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
  // SWC is 10-20x faster than ts-jest for compilation
  transform: {
    '^.+\\.ts$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
        target: 'es2022',
      },
    }],
  },
  // Silence NestJS logger noise in tests
  silent: !isCI,
};

export default config;
