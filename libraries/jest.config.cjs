/** Root jest config for shared libraries */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    '<rootDir>/auth-client/src',
    '<rootDir>/payment-client/src',
    '<rootDir>/file-upload-client/src',
    '<rootDir>/rabbitmq/src',
    '<rootDir>/mail/src',
    '<rootDir>/notification/src',
    '<rootDir>/chat/src',
  ],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@alikohub/firebase-admin$': '<rootDir>/firebase-admin/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
          strict: false,
          skipLibCheck: true,
          types: ['jest', 'node'],
        },
      },
    ],
  },
};
