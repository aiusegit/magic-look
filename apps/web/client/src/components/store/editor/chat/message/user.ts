import { getHydratedUserMessage } from '@onlook/ai/src/prompt/provider';
import type { LLMProvider } from '@onlook/models';
import type { ChatMessageContext } from '@onlook/models/chat';
import { ChatMessageRole, type UserChatMessage } from '@onlook/models/chat';
import type { Message, TextPart } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: string;
    context: ChatMessageContext[] = [];
    parts: TextPart[] = [];
    provider: LLMProvider;

    constructor(content: string, context: ChatMessageContext[] = [], provider: LLMProvider) {
        this.id = uuidv4();
        this.content = content;
        this.parts = [{ type: 'text', text: content }];
        this.context = context;
        this.provider = provider;
    }

    static fromJSON(data: UserChatMessage, provider: LLMProvider): UserChatMessageImpl {
        // Assuming UserChatMessage might not have provider, so it's passed explicitly
        const message = new UserChatMessageImpl(data.content, data.context, provider);
        message.id = data.id;
        return message;
    }

    static toJSON(message: UserChatMessageImpl): UserChatMessage {
        // Note: The UserChatMessage type might need to be updated if provider needs to be serialized.
        // For now, following existing structure and not adding provider to JSON output.
        return {
            id: message.id,
            role: message.role,
            context: message.context,
            parts: message.parts,
            content: message.content,
        };
    }

    static fromMessage(message: Message, context: ChatMessageContext[], provider: LLMProvider): UserChatMessageImpl {
        return new UserChatMessageImpl(message.content, context, provider);
    }

    static fromStringContent(content: string, context: ChatMessageContext[], provider: LLMProvider): UserChatMessageImpl {
        return new UserChatMessageImpl(content, context, provider);
    }

    toStreamMessage(): Message {
        return getHydratedUserMessage(this.id, this.content, this.context, this.provider);
    }

    updateContent(content: string) {
        this.content = content;
        this.parts = [{ type: 'text', text: content }];
    }

    getStringContent(): string {
        return this.parts.map((part) => part.text).join('');
    }
}
