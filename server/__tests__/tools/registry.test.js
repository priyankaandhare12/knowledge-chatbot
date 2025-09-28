import { jest } from '@jest/globals';
import { tools, getToolByName, TOOL_NAMES } from '../../app/tools/registry.js';

// Mock the tool imports
jest.mock('../../app/tools/document-qa/DocumentQATool.js', () => ({
    documentQATool: {
        name: 'documentQA',
        description: 'Tool for document Q&A',
        parameters: {},
    },
}));

jest.mock('../../app/tools/weather/WeatherTool.js', () => ({
    weatherTool: {
        name: 'weatherLookup',
        description: 'Tool for weather information',
        parameters: {},
    },
}));

describe('Tools Registry', () => {
    describe('tools array', () => {
        it('should export tools array', () => {
            expect(Array.isArray(tools)).toBe(true);
        });

        it('should contain expected number of tools', () => {
            expect(tools.length).toBe(2);
        });

        it('should contain documentQATool', () => {
            const docTool = tools.find((tool) => tool.name === 'documentQA');
            expect(docTool).toBeDefined();
            expect(docTool.name).toBe('documentQA');
        });

        it('should contain weatherTool', () => {
            const weatherTool = tools.find((tool) => tool.name === 'weatherLookup');
            expect(weatherTool).toBeDefined();
            expect(weatherTool.name).toBe('weatherLookup');
        });

        it('should have tools with required properties', () => {
            tools.forEach((tool) => {
                expect(tool).toHaveProperty('name');
                expect(tool).toHaveProperty('description');
                expect(typeof tool.name).toBe('string');
                expect(typeof tool.description).toBe('string');
            });
        });
    });

    describe('getToolByName function', () => {
        it('should return correct tool by name', () => {
            const docTool = getToolByName('documentQA');
            expect(docTool).toBeDefined();
            expect(docTool.name).toBe('documentQA');
        });

        it('should return weather tool by name', () => {
            const weatherTool = getToolByName('weatherLookup');
            expect(weatherTool).toBeDefined();
            expect(weatherTool.name).toBe('weatherLookup');
        });

        it('should return undefined for non-existent tool', () => {
            const nonExistentTool = getToolByName('nonexistent');
            expect(nonExistentTool).toBeUndefined();
        });

        it('should return undefined for null input', () => {
            const result = getToolByName(null);
            expect(result).toBeUndefined();
        });

        it('should return undefined for empty string', () => {
            const result = getToolByName('');
            expect(result).toBeUndefined();
        });

        it('should be case sensitive', () => {
            const result = getToolByName('DOCUMENTQA');
            expect(result).toBeUndefined();
        });
    });

    describe('TOOL_NAMES constants', () => {
        it('should export TOOL_NAMES object', () => {
            expect(typeof TOOL_NAMES).toBe('object');
            expect(TOOL_NAMES).not.toBeNull();
        });

        it('should have DOCUMENT_QA constant', () => {
            expect(TOOL_NAMES).toHaveProperty('DOCUMENT_QA');
            expect(TOOL_NAMES.DOCUMENT_QA).toBe('documentQA');
        });

        it('should have WEATHER constant', () => {
            expect(TOOL_NAMES).toHaveProperty('WEATHER');
            expect(TOOL_NAMES.WEATHER).toBe('weatherLookup');
        });

        it('should have string values for all constants', () => {
            Object.values(TOOL_NAMES).forEach((value) => {
                expect(typeof value).toBe('string');
                expect(value.length).toBeGreaterThan(0);
            });
        });

        it('should match actual tool names', () => {
            const docTool = getToolByName(TOOL_NAMES.DOCUMENT_QA);
            const weatherTool = getToolByName(TOOL_NAMES.WEATHER);

            expect(docTool).toBeDefined();
            expect(weatherTool).toBeDefined();
        });
    });

    describe('registry consistency', () => {
        it('should have unique tool names', () => {
            const names = tools.map((tool) => tool.name);
            const uniqueNames = [...new Set(names)];
            expect(names.length).toBe(uniqueNames.length);
        });

        it('should have all TOOL_NAMES values present in tools', () => {
            Object.values(TOOL_NAMES).forEach((toolName) => {
                const tool = getToolByName(toolName);
                expect(tool).toBeDefined();
            });
        });

        it('should not have empty or null tool entries', () => {
            tools.forEach((tool) => {
                expect(tool).toBeDefined();
                expect(tool).not.toBeNull();
                expect(tool.name).toBeTruthy();
            });
        });
    });
});
