/**
 * jest.config.cjs
 * Backend test runner config. Source files use NodeNext-style explicit
 * `.ts` import specifiers (see tsconfig.json's rewriteRelativeImportExtensions),
 * which only resolve under Node's real ESM loader or a build step — not
 * under Jest's default CJS module resolution. ts-jest is configured here to
 * transpile each file to CommonJS for the test run (independent of the
 * app's real runtime, which still uses ts-node/tsc for ESM), and
 * moduleNameMapper strips the trailing `.ts` so Jest's CJS resolver finds
 * the actual source file via moduleFileExtensions instead.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          ignoreDeprecations: '6.0',
          verbatimModuleSyntax: false,
          rewriteRelativeImportExtensions: false,
          esModuleInterop: true,
        },
      },
    ],
  },
};
