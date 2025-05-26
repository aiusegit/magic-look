import { CLAUDE_MODELS, GEMINI_MODELS, LLMProvider } from '@onlook/models';
import type { EditorEngine } from '../engine';
import type { ProjectManager } from '../../project/manager';
import type { UserManager } from '../../user/manager';
import { ChatManager } from './index';

// Mocks for constructor dependencies
const mockEditorEngine = {} as EditorEngine; // Cast as any or use partial mocks
const mockProjectManager = {} as ProjectManager;
const mockUserManager = {
    settings: { settings: { chat: { autoApplyCode: false } } }, // Provide default for autoApplyCode
} as UserManager;

describe('ChatManager LLM Provider and Model Selection', () => {
    let chatManager: ChatManager;

    beforeEach(() => {
        // Create a new instance before each test to ensure isolation
        chatManager = new ChatManager(mockEditorEngine, mockProjectManager, mockUserManager);
    });

    describe('Initialization', () => {
        it('should default currentLLMProvider to ANTHROPIC', () => {
            expect(chatManager.currentLLMProvider).toBe(LLMProvider.ANTHROPIC);
        });

        it('should default currentModelId to SONNET_4 for ANTHROPIC', () => {
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.SONNET_4);
        });
    });

    describe('setLLMProvider Method', () => {
        it('should switch to GEMINI and set GEMINI_PRO as default model', () => {
            chatManager.setLLMProvider(LLMProvider.GEMINI);
            expect(chatManager.currentLLMProvider).toBe(LLMProvider.GEMINI);
            expect(chatManager.currentModelId).toBe(GEMINI_MODELS.GEMINI_PRO);
        });

        it('should switch back to ANTHROPIC and set SONNET_4 as default model', () => {
            // First switch to Gemini
            chatManager.setLLMProvider(LLMProvider.GEMINI);
            // Then switch back to Anthropic
            chatManager.setLLMProvider(LLMProvider.ANTHROPIC);
            expect(chatManager.currentLLMProvider).toBe(LLMProvider.ANTHROPIC);
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.SONNET_4);
        });

        it('should not change model if provider is set to the same and model was custom', () => {
            // Set a custom Anthropic model first
            chatManager.setModelId(CLAUDE_MODELS.HAIKU);
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.HAIKU);

            // Set provider to Anthropic again
            chatManager.setLLMProvider(LLMProvider.ANTHROPIC);
            // The model should remain HAIKU, not reset to SONNET_4, because the provider didn't change.
            // This tests the `if (this.currentLLMProvider !== provider)` condition in setLLMProvider.
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.HAIKU);
        });

        it('should change model to default if provider differs, even if model was custom', () => {
            // Set a custom Anthropic model first
            chatManager.setLLMProvider(LLMProvider.ANTHROPIC);
            chatManager.setModelId(CLAUDE_MODELS.HAIKU);
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.HAIKU);

            // Switch to Gemini
            chatManager.setLLMProvider(LLMProvider.GEMINI);
            // Model should change to Gemini's default
            expect(chatManager.currentLLMProvider).toBe(LLMProvider.GEMINI);
            expect(chatManager.currentModelId).toBe(GEMINI_MODELS.GEMINI_PRO);
        });
    });

    describe('setModelId Method', () => {
        it('should set a different Anthropic model when provider is ANTHROPIC', () => {
            chatManager.setLLMProvider(LLMProvider.ANTHROPIC); // Ensure provider is Anthropic
            chatManager.setModelId(CLAUDE_MODELS.HAIKU);
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.HAIKU);
            expect(chatManager.currentLLMProvider).toBe(LLMProvider.ANTHROPIC); // Provider should not change
        });

        it('should set a Gemini model when provider is GEMINI', () => {
            chatManager.setLLMProvider(LLMProvider.GEMINI); // Ensure provider is Gemini
            // As per current ChatManager logic, GEMINI_PRO is the only valid model
            // If other Gemini models were added, this test could be updated.
            chatManager.setModelId(GEMINI_MODELS.GEMINI_PRO);
            expect(chatManager.currentModelId).toBe(GEMINI_MODELS.GEMINI_PRO);
            expect(chatManager.currentLLMProvider).toBe(LLMProvider.GEMINI); // Provider should not change
        });

        it('should not set an invalid Anthropic model', () => {
            chatManager.setLLMProvider(LLMProvider.ANTHROPIC);
            const initialModel = chatManager.currentModelId;
            chatManager.setModelId('invalid-anthropic-model');
            expect(chatManager.currentModelId).toBe(initialModel); // Model should not change
        });

        it('should not set an invalid Gemini model', () => {
            chatManager.setLLMProvider(LLMProvider.GEMINI);
            const initialModel = chatManager.currentModelId; // Should be GEMINI_PRO
            chatManager.setModelId('invalid-gemini-model');
            expect(chatManager.currentModelId).toBe(initialModel); // Model should not change
        });

        it('should not change model if setModelId is called with the current modelId', () => {
            // Provider is ANTHROPIC, model is SONNET_4 by default
            chatManager.setModelId(CLAUDE_MODELS.SONNET_4);
            expect(chatManager.currentModelId).toBe(CLAUDE_MODELS.SONNET_4);
            
            // Test with Gemini
            chatManager.setLLMProvider(LLMProvider.GEMINI); // Switches model to GEMINI_PRO
            chatManager.setModelId(GEMINI_MODELS.GEMINI_PRO);
            expect(chatManager.currentModelId).toBe(GEMINI_MODELS.GEMINI_PRO);
        });
    });
});
