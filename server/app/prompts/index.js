import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Prompt constants mapped to file names
export const Prompts = {
    UNIVERSAL_KNOWLEDGE: 'universal/universal-knowledge-prompt',
};

/**
 * Loads a prompt from a text file
 * @param {string} promptName - The name of the prompt file (without .txt extension)
 * @returns {string} The prompt content
 */
const loadPrompt = (promptName) => {
    try {
        const promptPath = join(__dirname, `${promptName}.md`);
        const promptContent = readFileSync(promptPath, 'utf8');
        return promptContent.trim();
    } catch (error) {
        throw new Error(`Failed to load prompt '${promptName}': ${error.message}`);
    }
};

/**
 * Get prompt content using prompt constant
 * @param {string} promptConstant - The prompt constant from Prompts object
 * @returns {string} The prompt content
 */
export const getPrompt = (promptConstant) => {
    if (!promptConstant || typeof promptConstant !== 'string') {
        throw new Error(`Invalid prompt constant: ${promptConstant}`);
    }

    return loadPrompt(promptConstant);
};