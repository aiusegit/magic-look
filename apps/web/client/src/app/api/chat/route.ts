import { chatToolSet, getCreatePageSystemPrompt, getSystemPrompt, initModel } from '@onlook/ai';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { generateObject, NoSuchToolError, streamText } from 'ai';

export enum ChatType {
    ASK = 'ask',
    CREATE = 'create',
    EDIT = 'edit',
}

export async function POST(req: Request) {
    const { messages, maxSteps, chatType, provider, modelId: requestedModelId } = await req.json();

    const currentLLMProvider = provider as LLMProvider;

    // Validate provider
    if (!currentLLMProvider || !Object.values(LLMProvider).includes(currentLLMProvider)) {
        throw new Error(`Invalid LLMProvider: ${provider}`);
    }

    let currentModelId = requestedModelId;

    // Set a default model for Anthropic if no modelId is provided
    if (currentLLMProvider === LLMProvider.ANTHROPIC && !currentModelId) {
        currentModelId = CLAUDE_MODELS.SONNET_4;
    }
    // For Gemini (and potentially other providers in the future), modelId is strictly required.
    else if (currentLLMProvider === LLMProvider.GEMINI && !currentModelId) {
        // Providing a default Gemini model or throwing an error are options.
        // Let's throw an error to enforce client-side model selection for Gemini.
        throw new Error('modelId is required for Gemini provider.');
    }
    // If it's another provider and no modelId, it's an error.
    else if (!currentModelId) {
        throw new Error(`modelId is required for provider: ${currentLLMProvider}`);
    }
    
    const model = await initModel(currentLLMProvider, currentModelId);

    const systemPrompt = chatType === ChatType.CREATE ? getCreatePageSystemPrompt(currentLLMProvider) : getSystemPrompt(currentLLMProvider);

    const result = streamText({
        model,
        system: systemPrompt,
        messages,
        maxSteps,
        tools: chatToolSet,
        toolCallStreaming: true,
        maxTokens: 64000,
        experimental_repairToolCall: async ({ toolCall, tools, parameterSchema, error }) => {
            if (NoSuchToolError.isInstance(error)) {
                throw new Error(
                    `Tool "${toolCall.toolName}" not found. Available tools: ${Object.keys(tools).join(', ')}`,
                );
            }
            const tool = tools[toolCall.toolName as keyof typeof tools];

            console.warn(
                `Invalid parameter for tool ${toolCall.toolName} with args ${JSON.stringify(toolCall.args)}, attempting to fix`,
            );

            const { object: repairedArgs } = await generateObject({
                model,
                schema: tool?.parameters,
                prompt: [
                    `The model tried to call the tool "${toolCall.toolName}"` +
                    ` with the following arguments:`,
                    JSON.stringify(toolCall.args),
                    `The tool accepts the following schema:`,
                    JSON.stringify(parameterSchema(toolCall)),
                    'Please fix the arguments.',
                ].join('\n'),
            });

            return { ...toolCall, args: JSON.stringify(repairedArgs) };
        },
        onError: (error) => {
            console.error('Error in chat', error);
        },
    });

    return result.toDataStreamResponse();
}
