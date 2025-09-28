/** @type {import('jest').Config} */
export default {
    // Test environment
    testEnvironment: 'node',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],

    // Module file extensions
    moduleFileExtensions: ['js', 'json', 'ts'],

    // Transform files - for ES modules support
    transform: {},

    // Test match patterns
    testMatch: [
        '<rootDir>/__tests__/**/*.test.js',
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/app/**/__tests__/**/*.js',
        '<rootDir>/app/**/*.test.js',
        '<rootDir>/routes/**/__tests__/**/*.js',
        '<rootDir>/config/**/__tests__/**/*.js',
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/dist/',
        '<rootDir>/build/',
        '<rootDir>/.vercel/',
        // Legacy tests to be migrated
        'tests/unit/agent.test.js',
        'tests/feature/agent.test.js',
    ],

    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],

    // Coverage collection patterns
    collectCoverageFrom: [
        'app/**/*.js',
        'routes/**/*.js',
        'config/**/*.js',
        'index.js',
        '!app/**/__tests__/**/*',
        '!**/*.test.js',
        '!**/*.spec.js',
        '!**/__mocks__/**/*',
        '!**/node_modules/**',
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 75,
            functions: 80,
            lines: 80,
            statements: 80,
        },
        // Critical security middleware requires higher coverage
        './app/middleware/auth.middleware.js': {
            branches: 90,
            functions: 95,
            lines: 95,
            statements: 95,
        },
        './app/middleware/error-handler.js': {
            branches: 85,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },

    // Module directories
    moduleDirectories: ['node_modules', 'app', 'routes', 'config'],

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Verbose output
    verbose: true,

    // Test timeout
    testTimeout: 15000,

    // Force exit after tests complete
    forceExit: true,

    // Detect open handles
    detectOpenHandles: true,

    // ES modules support
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
};
