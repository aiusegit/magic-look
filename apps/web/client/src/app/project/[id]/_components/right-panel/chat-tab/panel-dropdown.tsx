import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import { CLAUDE_MODELS, EditorTabValue, GEMINI_MODELS, LLMProvider, type ChatSettings } from '@onlook/models'; // Added imports
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

export const ChatPanelDropdown = observer(({
    children,
    isChatHistoryOpen,
    setIsChatHistoryOpen,
}: {
    children: React.ReactNode;
    isChatHistoryOpen: boolean;
    setIsChatHistoryOpen: (isOpen: boolean) => void;
}) => {
    const userManager = useUserManager();
    const editorEngine = useEditorEngine();

    const chatManager = editorEngine.chat;
    const currentProvider = chatManager.currentLLMProvider;
    const currentModel = chatManager.currentModelId;

    const chatSettings = userManager.settings.settings.chat;
    const selectedTab = editorEngine.state.rightPanelTab;

    const providerDisplayNames = {
        [LLMProvider.ANTHROPIC]: 'Anthropic',
        [LLMProvider.GEMINI]: 'Gemini',
    };

    const availableModels = currentProvider === LLMProvider.ANTHROPIC ? CLAUDE_MODELS : GEMINI_MODELS;

    const updateChatSettings = (e: React.MouseEvent, settings: Partial<ChatSettings>) => {
        e.preventDefault();
        userManager.settings.updateChat(settings);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={selectedTab !== EditorTabValue.CHAT}>
                <div className="flex items-center">{children}</div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[220px]">

                <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            autoApplyCode: !chatSettings.autoApplyCode,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.autoApplyCode ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Auto - apply results
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            expandCodeBlocks: !chatSettings.expandCodeBlocks,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.expandCodeBlocks ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Show code while rendering
                </DropdownMenuItem>

                {/* TODO: Reenable */}
                {/* <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            showSuggestions: !chatSettings.showSuggestions,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.showSuggestions ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Show suggestions
                </DropdownMenuItem> */}

                {/* TODO: Reenable */}
                {/* <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            showMiniChat: !chatSettings.showMiniChat,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.showMiniChat ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Show mini chat
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />

                {/* Provider Selection */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Icons.Users className="mr-2 h-4 w-4" /> {/* Example Icon */}
                        <span>Provider: {providerDisplayNames[currentProvider]}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                chatManager.setLLMProvider(LLMProvider.ANTHROPIC);
                            }}
                        >
                            Anthropic
                            {currentProvider === LLMProvider.ANTHROPIC && (
                                <Icons.Check className="ml-auto h-4 w-4" />
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={(e) => {
                                e.preventDefault();
                                chatManager.setLLMProvider(LLMProvider.GEMINI);
                            }}
                        >
                            Gemini
                            {currentProvider === LLMProvider.GEMINI && (
                                <Icons.Check className="ml-auto h-4 w-4" />
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                {/* Model Selection */}
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Icons.Cpu className="mr-2 h-4 w-4" /> {/* Example Icon */}
                        <span>Model: {currentModel}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {Object.values(availableModels).map((modelId) => (
                            <DropdownMenuItem
                                key={modelId}
                                onClick={(e) => {
                                    e.preventDefault();
                                    chatManager.setModelId(modelId);
                                }}
                            >
                                {modelId}
                                {currentModel === modelId && (
                                    <Icons.Check className="ml-auto h-4 w-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}>
                    <Icons.CounterClockwiseClock className="mr-2 h-4 w-4" />
                    Chat History
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
