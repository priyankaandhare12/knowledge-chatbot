export default {
    testEnvironment: 'node',
    testMatch: [
        '**/tests/**/*.test.js',
        '**/__tests__/**/*.js'
    ],
    testPathIgnorePatterns: [
        'tests/unit/agent.test.js',
        'tests/feature/agent.test.js'
    ],
    collectCoverageFrom: [
        'app/**/*.js',
        '!app/**/*.test.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true
};
