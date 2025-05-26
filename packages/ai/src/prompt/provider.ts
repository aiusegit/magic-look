import { LLMProvider } from '@onlook/models';
import type {
    ChatMessageContext,
    ErrorMessageContext,
    FileMessageContext,
    HighlightMessageContext,
    ProjectMessageContext,
} from '@onlook/models';
import type { Attachment, Message, UserContent } from 'ai';
import { CONTEXT_PROMPTS } from './context';
import { PAGE_SYSTEM_PROMPT } from './create';
import { EDIT_PROMPTS, SEARCH_REPLACE_EXAMPLE_CONVERSATION } from './edit';
import { FENCE } from './format';
import { wrapXml } from './helpers';
import { PLATFORM_SIGNATURE } from './signatures';
import { SUMMARY_PROMPTS } from './summary';

const shouldWrapXml = true;

export function getSystemPrompt(provider?: LLMProvider) {
    let prompt = '';

    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;

    if (useXml) {
        prompt += wrapXml('role', EDIT_PROMPTS.system);
        prompt += wrapXml('search-replace-rules', EDIT_PROMPTS.searchReplaceRules);
        prompt += wrapXml(
            'example-conversation',
            getExampleConversation(SEARCH_REPLACE_EXAMPLE_CONVERSATION),
        );
    } else {
        prompt += EDIT_PROMPTS.system;
        prompt += EDIT_PROMPTS.searchReplaceRules;
        prompt += getExampleConversation(SEARCH_REPLACE_EXAMPLE_CONVERSATION);
    }
    prompt = prompt.replace(PLATFORM_SIGNATURE, 'linux');
    return prompt;
}

export function getCreatePageSystemPrompt(provider?: LLMProvider) {
    let prompt = getSystemPrompt(provider) + '\n\n';

    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;

    if (useXml) {
        prompt += wrapXml('rules', PAGE_SYSTEM_PROMPT.rules);
    } else {
        prompt += PAGE_SYSTEM_PROMPT.rules;
    }

    return prompt;
}

export function getExampleConversation(
    conversation: {
        role: string;
        content: string;
    }[],
) {
    let prompt = '';
    for (const message of conversation) {
        prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
    }
    return prompt;
}

export function getHydratedUserMessage(
    id: string,
    content: UserContent,
    context: ChatMessageContext[],
    provider?: LLMProvider,
): Message {
    const files = context.filter((c) => c.type === 'file').map((c) => c);
    const highlights = context.filter((c) => c.type === 'highlight').map((c) => c);
    const errors = context.filter((c) => c.type === 'error').map((c) => c);
    const project = context.filter((c) => c.type === 'project').map((c) => c);
    const images = context.filter((c) => c.type === 'image').map((c) => c);

    let prompt = '';
    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;

    let contextPrompt = getFilesContent(files, highlights, provider);
    if (contextPrompt) {
        if (useXml) {
            contextPrompt = wrapXml('context', contextPrompt);
        }
        prompt += contextPrompt;
    }

    if (errors.length > 0) {
        let errorPrompt = getErrorsContent(errors, provider);
        prompt += errorPrompt;
    }

    if (project.length > 0) {
        const projectContext = project[0];
        if (projectContext) {
            prompt += getProjectContext(projectContext, provider);
        }
    }

    if (useXml) {
        const textContent =
            typeof content === 'string'
                ? content
                : content
                      .filter((c) => c.type === 'text')
                      .map((c) => c.text)
                      .join('\n');
        prompt += wrapXml('instruction', textContent);
    } else {
        prompt += content;
    }

    const attachments: Attachment[] = images.map((i) => ({
        type: 'image',
        contentType: i.mimeType,
        url: i.content,
    }));

    return {
        id,
        role: 'user',
        content: prompt,
        experimental_attachments: attachments,
    };
}

export function getFilesContent(
    files: FileMessageContext[],
    highlights: HighlightMessageContext[],
    provider?: LLMProvider,
) {
    if (files.length === 0) {
        return '';
    }
    let prompt = '';
    prompt += `${CONTEXT_PROMPTS.filesContentPrefix}\n`;
    let index = 1;
    for (const file of files) {
        let filePrompt = `${file.path}\n`;
        filePrompt += `${FENCE.code.start}${getLanguageFromFilePath(file.path)}\n`;
        filePrompt += file.content;
        filePrompt += `\n${FENCE.code.end}\n`;
        filePrompt += getHighlightsContent(file.path, highlights, provider);

        const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;
        if (useXml) {
            filePrompt = wrapXml(files.length > 1 ? `file-${index}` : 'file', filePrompt);
        }
        prompt += filePrompt;
        index++;
    }

    return prompt;
}

export function getErrorsContent(errors: ErrorMessageContext[], provider?: LLMProvider) {
    if (errors.length === 0) {
        return '';
    }
    let prompt = `${CONTEXT_PROMPTS.errorsContentPrefix}\n`;
    for (const error of errors) {
        prompt += `${error.content}\n`;
    }

    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;
    if (prompt.trim().length > 0 && useXml) {
        prompt = wrapXml('errors', prompt);
    }
    return prompt;
}

export function getLanguageFromFilePath(filePath: string): string {
    return filePath.split('.').pop() || '';
}

export function getHighlightsContent(
    filePath: string,
    highlights: HighlightMessageContext[],
    provider?: LLMProvider,
) {
    const fileHighlights = highlights.filter((h) => h.path === filePath);
    if (fileHighlights.length === 0) {
        return '';
    }
    let prompt = `${CONTEXT_PROMPTS.highlightPrefix}\n`;
    let index = 1;
    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;
    for (const highlight of fileHighlights) {
        let highlightPrompt = `${filePath}#L${highlight.start}:L${highlight.end}\n`;
        highlightPrompt += `${FENCE.code.start}\n`;
        highlightPrompt += highlight.content;
        highlightPrompt += `\n${FENCE.code.end}\n`;
        if (useXml) {
            highlightPrompt = wrapXml(
                fileHighlights.length > 1 ? `highlight-${index}` : 'highlight',
                highlightPrompt,
            );
        }
        prompt += highlightPrompt;
        index++;
    }
    return prompt;
}

export function getSummaryPrompt(provider?: LLMProvider) {
    let prompt = '';
    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;

    if (useXml) {
        prompt += wrapXml('summary-rules', SUMMARY_PROMPTS.rules);
        prompt += wrapXml('summary-guidelines', SUMMARY_PROMPTS.guidelines);
        prompt += wrapXml('summary-format', SUMMARY_PROMPTS.format);
        prompt += wrapXml('summary-reminder', SUMMARY_PROMPTS.reminder);

        prompt += wrapXml('example-conversation', getSummaryExampleConversation());
        prompt += wrapXml('example-summary-output', 'EXAMPLE SUMMARY:\n' + SUMMARY_PROMPTS.summary);
    } else {
        prompt += SUMMARY_PROMPTS.rules + '\n\n';
        prompt += SUMMARY_PROMPTS.guidelines + '\n\n';
        prompt += SUMMARY_PROMPTS.format + '\n\n';
        prompt += SUMMARY_PROMPTS.reminder + '\n\n';
        prompt += getSummaryExampleConversation();
        prompt += 'EXAMPLE SUMMARY:\n' + SUMMARY_PROMPTS.summary + '\n\n';
    }

    return prompt;
}

export function getSummaryExampleConversation() {
    let prompt = 'EXAMPLE CONVERSATION:\n';
    for (const message of SEARCH_REPLACE_EXAMPLE_CONVERSATION) {
        prompt += `${message.role.toUpperCase()}: ${message.content}\n`;
    }
    return prompt;
}

export function getProjectContext(project: ProjectMessageContext, provider?: LLMProvider) {
    const content = `${CONTEXT_PROMPTS.projectContextPrefix} ${project.path}`;
    const useXml = provider === LLMProvider.GEMINI ? false : shouldWrapXml;
    if (useXml) {
        return wrapXml('project-info', content);
    }
    return content;
}
