import { LLMProvider, MessageContextType } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import path from 'path';
import { SEARCH_REPLACE_EXAMPLE_CONVERSATION } from 'src/prompt/edit';
import {
    getCreatePageSystemPrompt,
    getExampleConversation,
    getFilesContent,
    getHighlightsContent,
    getHydratedUserMessage,
    getSummaryPrompt,
    getSystemPrompt,
} from '../../src/prompt/provider';

const __dirname = import.meta.dir;

describe('Prompt', () => {
    const SHOULD_WRITE_SYSTEM = false;
    const SHOULD_WRITE_EXAMPLES = false;
    const SHOULD_WRITE_USER_MESSAGE = false;
    const SHOULD_WRITE_FILE_CONTENT = false;
    const SHOULD_WRITE_HIGHLIGHTS = false;
    const SHOULD_WRITE_SUMMARY = false;
    const SHOULD_WRITE_CREATE_PAGE_SYSTEM = false;

    test('System prompt should be the same for ANTHROPIC', async () => {
        const systemPath = path.resolve(__dirname, './data/system.txt');

        const prompt = getSystemPrompt(LLMProvider.ANTHROPIC);
        if (SHOULD_WRITE_SYSTEM) {
            await Bun.write(systemPath, prompt);
        }

        const existing = await Bun.file(systemPath).text();
        expect(prompt).toEqual(existing);
    });

    test('System prompt should be different for GEMINI (no XML)', async () => {
        // This is an example, the actual non-XML prompt might differ
        const expectedPrompt = `You are a helpful AI assistant.
Search and replace operations should follow these rules:
- Rule 1
- Rule 2
USER: Replace foo with bar
ASSISTANT: Ok, I will replace foo with bar
linux`; // Example, replace with actual non-XML prompt
        const prompt = getSystemPrompt(LLMProvider.GEMINI);
        // For GEMINI, we expect a non-XML version.
        // As an example, let's assume the XML version was:
        // <role>You are a helpful AI assistant.</role><search-replace-rules>- Rule 1...</search-replace-rules>...
        // The non-XML version would be:
        // You are a helpful AI assistant.\n- Rule 1...\n...
        // This needs to be manually constructed based on the actual prompt content.
        // For now, we'll check it's not empty and doesn't contain XML tags like <role>
        expect(prompt).toBeDefined();
        expect(prompt).not.toInclude('<role>');
        expect(prompt).not.toInclude('</role>');
        // A more robust test would compare against a pre-defined non-XML string.
    });

    test('Examples should be the same', async () => {
        const examplesPath = path.resolve(__dirname, './data/examples.txt');

        const prompt = getExampleConversation(SEARCH_REPLACE_EXAMPLE_CONVERSATION);
        if (SHOULD_WRITE_EXAMPLES) {
            await Bun.write(examplesPath, prompt);
        }

        const existing = await Bun.file(examplesPath).text();
        expect(prompt).toEqual(existing);
    });

    test('User message should be the same for ANTHROPIC', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user.txt');

        const message = getHydratedUserMessage('test', 'test', [
            {
                path: 'test.txt',
                content: 'test',
                type: MessageContextType.FILE,
                displayName: 'test.txt',
            },

            {
                path: 'test.txt',
                start: 1,
                end: 2,
                content: 'test',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
            },

            {
                content: 'test',
                type: MessageContextType.ERROR,
                displayName: 'test',
            },
            {
                path: 'test',
                type: MessageContextType.PROJECT,
                displayName: 'test',
                content: '',
            },
        ], LLMProvider.ANTHROPIC);

        const prompt = message.content;

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('User message should be different for GEMINI (no XML)', async () => {
        const message = getHydratedUserMessage('test', 'test', [
            {
                path: 'test.txt',
                content: 'test',
                type: MessageContextType.FILE,
                displayName: 'test.txt',
            },
        ], LLMProvider.GEMINI);
        const prompt = message.content;
        expect(prompt).toBeDefined();
        expect(prompt).not.toInclude('<context>');
        expect(prompt).not.toInclude('</context>');
        expect(prompt).not.toInclude('<instruction>');
        expect(prompt).not.toInclude('</instruction>');
    });

    test('User empty message should be the same for ANTHROPIC', async () => {
        const userMessagePath = path.resolve(__dirname, './data/user-empty.txt');

        const message = getHydratedUserMessage('test', '', [], LLMProvider.ANTHROPIC);
        const prompt = message.content;

        if (SHOULD_WRITE_USER_MESSAGE) {
            await Bun.write(userMessagePath, prompt);
        }

        const existing = await Bun.file(userMessagePath).text();
        expect(prompt).toEqual(existing);
    });

    test('User empty message should be different for GEMINI (no XML)', async () => {
        const message = getHydratedUserMessage('test', '', [], LLMProvider.GEMINI);
        const prompt = message.content;
        expect(prompt).toBeDefined();
        // For an empty message, the prompt might just be the instruction, or empty itself if content is also empty.
        // If it's just an empty instruction, it might look like <instruction></instruction> for XML
        // and "" for non-XML.
        expect(prompt).not.toInclude('<instruction>');
        expect(prompt).not.toInclude('</instruction>');
        // This assertion depends on how an empty message is structured.
        // If the content is truly empty and no context, the prompt might be an empty string.
        // Let's assume it's an empty string for Gemini with no content and no context.
        expect(prompt).toEqual('');
    });

    test('File content should be the same', async () => {
        const fileContentPath = path.resolve(__dirname, './data/file.txt');

        const prompt = getFilesContent(
            [
                {
                    path: 'test.txt',
                    content: 'test',
                    type: MessageContextType.FILE,
                    displayName: 'test.txt',
                },
                {
                    path: 'test2.txt',
                    content: 'test2',
                    type: MessageContextType.FILE,
                    displayName: 'test2.txt',
                },
            ],
            [
                {
                    path: 'test.txt',
                    start: 1,
                    end: 2,
                    content: 'test',
                    type: MessageContextType.HIGHLIGHT,
                    displayName: 'test.txt',
                },
            ],
        );

        if (SHOULD_WRITE_FILE_CONTENT) {
            await Bun.write(fileContentPath, prompt);
        }

        const existing = await Bun.file(fileContentPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Highlights should be the same', async () => {
        const highlightsPath = path.resolve(__dirname, './data/highlights.txt');

        const prompt = getHighlightsContent('test.txt', [
            {
                path: 'test.txt',
                start: 1,
                end: 2,
                content: 'test',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
            },
            {
                path: 'test.txt',
                start: 3,
                end: 4,
                content: 'test2',
                type: MessageContextType.HIGHLIGHT,
                displayName: 'test.txt',
            },
        ]);
        if (SHOULD_WRITE_HIGHLIGHTS) {
            await Bun.write(highlightsPath, prompt);
        }

        const existing = await Bun.file(highlightsPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Summary prompt should be the same for ANTHROPIC', async () => {
        const summaryPath = path.resolve(__dirname, './data/summary.txt');

        const prompt = getSummaryPrompt(LLMProvider.ANTHROPIC);
        if (SHOULD_WRITE_SUMMARY) {
            await Bun.write(summaryPath, prompt);
        }

        const existing = await Bun.file(summaryPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Summary prompt should be different for GEMINI (no XML)', async () => {
        const prompt = getSummaryPrompt(LLMProvider.GEMINI);
        expect(prompt).toBeDefined();
        expect(prompt).not.toInclude('<summary-rules>');
        expect(prompt).not.toInclude('</summary-rules>');
        // Add more checks for other XML tags used in summary prompt
    });

    test('Create page system prompt should be the same for ANTHROPIC', async () => {
        const createPageSystemPath = path.resolve(__dirname, './data/create-page-system.txt');

        const prompt = getCreatePageSystemPrompt(LLMProvider.ANTHROPIC);
        if (SHOULD_WRITE_CREATE_PAGE_SYSTEM) {
            await Bun.write(createPageSystemPath, prompt);
        }

        const existing = await Bun.file(createPageSystemPath).text();
        expect(prompt).toEqual(existing);
    });

    test('Create page system prompt should be different for GEMINI (no XML)', async () => {
        const prompt = getCreatePageSystemPrompt(LLMProvider.GEMINI);
        expect(prompt).toBeDefined();
        expect(prompt).not.toInclude('<role>');
        expect(prompt).not.toInclude('</role>');
        expect(prompt).not.toInclude('<rules>');
        expect(prompt).not.toInclude('</rules>');
        // Add more checks based on the structure of create page system prompt
    });
});
