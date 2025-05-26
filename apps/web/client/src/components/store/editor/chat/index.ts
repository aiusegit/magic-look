import type { ProjectManager } from '@/components/store/project/manager';
import type { UserManager } from '@/components/store/user/manager';
import { sendAnalytics } from '@/utils/analytics';
import { ChatMessageRole, StreamRequestType, type AssistantChatMessage, type ChatMessageContext, type ImageMessageContext } from '@onlook/models/chat';
import type { ParsedError } from '@onlook/utility';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models'; // Added import
import { ChatCodeManager } from './code';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { SuggestionManager } from './suggestions';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    suggestions: SuggestionManager;

    // Assume these are set by UI or other logic
    public currentLLMProvider: LLMProvider = LLMProvider.ANTHROPIC; // Placeholder
    public currentModelId: string = CLAUDE_MODELS.SONNET_4; // Placeholder

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
        private userManager: UserManager,
    ) {
        this.context = new ChatContext(this.editorEngine, this.projectManager);
        this.conversation = new ConversationManager(this, this.projectManager);
        this.code = new ChatCodeManager(this, this.editorEngine);
        this.suggestions = new SuggestionManager(this.projectManager);
        makeAutoObservable(this);
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    async getCreateMessages(prompt: string, images: ImageMessageContext[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        const messages = await this.getStreamMessages(prompt, [
            ...images,
        ]);
        return messages;
    }

    async getStreamMessages(content: string, contextOverride?: ChatMessageContext[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = this.conversation.addUserMessage(content, context);
        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        sendAnalytics('send chat message', {
            content,
        });
        return this.generateStreamMessages(content);
    }

    async getFixErrorMessages(errors: ParsedError[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        if (errors.length === 0) {
            console.error('No errors found');
            return null;
        }

        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getMessageContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        this.conversation.current.updateName(errors[0]?.content ?? 'Fix errors');
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        sendAnalytics('send fix error chat message', {
            errors: errors.map((e) => e.content),
        });
        return this.generateStreamMessages(prompt);
    }

    async getResubmitMessages(id: string, newMessageContent: string) {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }
        const message = this.conversation.current.messages.find((m) => m.id === id);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        if (message.role !== ChatMessageRole.USER) {
            console.error('Can only edit user messages');
            return;
        }

        message.updateContent(newMessageContent);
        await this.conversation.current.removeAllMessagesAfter(message);
        await this.conversation.current.updateMessage(message);
        return this.generateStreamMessages(StreamRequestType.CHAT);
    }

    private async generateStreamMessages(userPrompt?: string): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }
        this.createCommit(userPrompt);
        return this.conversation.current.getMessagesForStream();
    }

    createCommit(userPrompt?: string) {
        // TODO: Reenable this
        // this.projectManager.versions?.createCommit(
        //     "Save before chat",
        //     false,
        // );
    }

    autoApplyCode(assistantMessage: AssistantChatMessage) {
        if (this.userManager.settings.settings?.chat?.autoApplyCode) {
            setTimeout(() => {
                this.code.applyCode(assistantMessage.id);
            }, 100);
        }
    }

    clear() {
        this.code.clear();
        this.context.clear();
        this.conversation.clear();
    }

    public setLLMProvider(provider: LLMProvider) {
        if (this.currentLLMProvider !== provider) {
            this.currentLLMProvider = provider;
            // When provider changes, set a default model for that provider
            if (provider === LLMProvider.ANTHROPIC) {
                this.currentModelId = CLAUDE_MODELS.SONNET_4; // Or your preferred default
            } else if (provider === LLMProvider.GEMINI) {
                // Assuming GEMINI_MODELS is available and has GEMINI_PRO
                this.currentModelId = 'gemini-pro'; // Replace with actual GEMINI_MODELS.GEMINI_PRO if available
            }
            console.log(`LLM Provider changed to: ${provider}, Model reset to: ${this.currentModelId}`);
        }
    }

    public setModelId(modelId: string) {
        // Ensure the selected model is valid for the current provider
        if (this.currentLLMProvider === LLMProvider.ANTHROPIC && !Object.values(CLAUDE_MODELS).includes(modelId as CLAUDE_MODELS)) {
            console.warn(`Attempted to set invalid Anthropic model: ${modelId}`);
            return;
        } else if (this.currentLLMProvider === LLMProvider.GEMINI && modelId !== 'gemini-pro') { // Assuming only gemini-pro for now
             console.warn(`Attempted to set invalid Gemini model: ${modelId}`);
            return;
        }

        if (this.currentModelId !== modelId) {
            this.currentModelId = modelId;
            console.log(`LLM Model changed to: ${modelId}`);
        }
    }
}
