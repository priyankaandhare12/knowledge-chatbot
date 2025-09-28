/**
 * Unit tests for Web Search Tool
 */

import { jest } from '@jest/globals';
import { webSearchTool, performWebSearch, createTavilySearch } from '../../app/tools/web-search/WebSearchTool.js';

// Mock the config and dependencies
jest.mock('../../config/environment.js', () => ({
    config: {
        tavily: {
            apiKey: 'test-api-key',
        },
    },
    validateEnvironment: jest.fn(),
}));

jest.mock('@langchain/tavily', () => ({
    TavilySearch: jest.fn().mockImplementation(() => ({
        invoke: jest.fn(),
    })),
}));

jest.mock('../../app/utils/logger.js', () => ({
    info: jest.fn(),
    error: jest.fn(),
}));

describe('Web Search Tool', () => {
    let mockTavilySearch;
    let mockInvoke;

    beforeEach(async () => {
        // Reset mocks
        jest.clearAllMocks();

        // Setup TavilySearch mock
        mockInvoke = jest.fn();
        mockTavilySearch = jest.fn().mockImplementation(() => ({
            invoke: mockInvoke,
        }));

        // Mock the import
        jest.doMock('@langchain/tavily', () => ({
            TavilySearch: mockTavilySearch,
        }));
    });

    describe('webSearchTool', () => {
        it('should successfully perform a web search', async () => {
            const mockResults = [
                { title: 'Test Result 1', url: 'https://example1.com', content: 'Test content 1' },
                { title: 'Test Result 2', url: 'https://example2.com', content: 'Test content 2' },
            ];
            
            mockInvoke.mockResolvedValue(mockResults);

            const result = await webSearchTool.invoke({
                query: 'test search query',
                maxResults: 2,
                searchDepth: 'advanced',
            });

            expect(result.success).toBe(true);
            expect(result.query).toBe('test search query');
            expect(result.results).toEqual(mockResults);
            expect(result.metadata.resultCount).toBe(2);
            expect(result.metadata.maxResults).toBe(2);
            expect(result.metadata.searchDepth).toBe('advanced');
            expect(mockInvoke).toHaveBeenCalledWith('test search query');
        });

        it('should use default parameters when not provided', async () => {
            const mockResults = ['result1', 'result2'];
            mockInvoke.mockResolvedValue(mockResults);

            const result = await webSearchTool.invoke({
                query: 'simple query',
            });

            expect(result.success).toBe(true);
            expect(result.metadata.maxResults).toBe(5); // default
            expect(result.metadata.searchDepth).toBe('advanced'); // default
        });

        it('should handle search errors gracefully', async () => {
            const mockError = new Error('API rate limit exceeded');
            mockInvoke.mockRejectedValue(mockError);

            const result = await webSearchTool.invoke({
                query: 'failing query',
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('API rate limit exceeded');
            expect(result.query).toBe('failing query');
            expect(result.metadata.resultCount).toBe(0);
        });

        it('should validate input parameters', async () => {
            // Test empty query
            await expect(webSearchTool.invoke({ query: '' })).rejects.toThrow();
            
            // Test invalid maxResults
            await expect(webSearchTool.invoke({ 
                query: 'test', 
                maxResults: 15 
            })).rejects.toThrow();
            
            // Test invalid searchDepth
            await expect(webSearchTool.invoke({ 
                query: 'test', 
                searchDepth: 'invalid' 
            })).rejects.toThrow();
        });
    });

    describe('performWebSearch', () => {
        it('should perform direct web search successfully', async () => {
            const mockResults = ['result1', 'result2'];
            mockInvoke.mockResolvedValue(mockResults);

            const result = await performWebSearch('direct search query');

            expect(result.success).toBe(true);
            expect(result.query).toBe('direct search query');
            expect(result.results).toEqual(mockResults);
            expect(result.timestamp).toBeDefined();
        });

        it('should handle direct search errors', async () => {
            const mockError = new Error('Network error');
            mockInvoke.mockRejectedValue(mockError);

            const result = await performWebSearch('failing direct query');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
            expect(result.query).toBe('failing direct query');
        });
    });

    describe('createTavilySearch', () => {
        it('should create TavilySearch instance with default options', () => {
            createTavilySearch();

            expect(mockTavilySearch).toHaveBeenCalledWith({
                maxResults: 5,
                apiKey: 'test-api-key',
                searchDepth: 'advanced',
            });
        });

        it('should create TavilySearch instance with custom options', () => {
            createTavilySearch({
                maxResults: 3,
                searchDepth: 'basic',
                apiKey: 'custom-key',
            });

            expect(mockTavilySearch).toHaveBeenCalledWith({
                maxResults: 3,
                apiKey: 'custom-key',
                searchDepth: 'basic',
            });
        });

        it('should throw error when API key is missing', () => {
            expect(() => createTavilySearch({ apiKey: null })).toThrow(
                'Tavily API key is required to create TavilySearch instance'
            );
        });
    });

    describe('Tool Schema Validation', () => {
        it('should have correct tool name and description', () => {
            expect(webSearchTool.name).toBe('webSearch');
            expect(webSearchTool.description).toContain('Search the web for current information');
        });

        it('should validate schema correctly', () => {
            const schema = webSearchTool.schema;
            
            // Test valid input
            const validInput = {
                query: 'test query',
                maxResults: 3,
                searchDepth: 'basic',
            };
            
            expect(() => schema.parse(validInput)).not.toThrow();
            
            // Test invalid input
            const invalidInput = {
                query: '',
                maxResults: 15,
                searchDepth: 'invalid',
            };
            
            expect(() => schema.parse(invalidInput)).toThrow();
        });
    });
});
