import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { CLAUDE_MODELS, GEMINI_MODELS, LLMProvider } from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { type LanguageModelV1 } from 'ai';

export async function initModel(
    provider: LLMProvider,
    model: CLAUDE_MODELS | GEMINI_MODELS,
): Promise<LanguageModelV1> {
    switch (provider) {
        case LLMProvider.ANTHROPIC:
            return await getAnthropicProvider(model as CLAUDE_MODELS);
        case LLMProvider.GEMINI:
            return await getGeminiProvider(model as GEMINI_MODELS);
        default:
            assertNever(provider);
    }
}

async function getAnthropicProvider(model: CLAUDE_MODELS): Promise<LanguageModelV1> {
    const anthropic = createAnthropic();
    return anthropic(model, {
        cacheControl: true,
    });
}

async function getGeminiProvider(model: GEMINI_MODELS): Promise<LanguageModelV1> {
    const google = createGoogleGenerativeAI();
    return google(model, {
        cacheControl: true,
    });
}
