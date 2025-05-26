import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { observer } from 'mobx-react-lite'; // Import observer
import { ChatPanelDropdown } from './panel-dropdown';
import { LLMProvider, CLAUDE_MODELS, GEMINI_MODELS, EditorTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons'; // Required for icons used in component

// Mock dependencies
const mockSetLLMProvider = jest.fn();
const mockSetModelId = jest.fn();
const mockUpdateChatSettings = jest.fn();

let mockChatManager = {
    currentLLMProvider: LLMProvider.ANTHROPIC,
    currentModelId: CLAUDE_MODELS.SONNET_4,
    setLLMProvider: mockSetLLMProvider,
    setModelId: mockSetModelId,
};

const mockEditorEngine = {
    chat: mockChatManager,
    state: { rightPanelTab: EditorTabValue.CHAT }, // Ensure dropdown is not disabled
};

const mockUserManager = {
    settings: {
        settings: {
            chat: { autoApplyCode: false, expandCodeBlocks: false },
        },
        updateChat: mockUpdateChatSettings,
    },
};

jest.mock('@/components/store/editor', () => ({
    useEditorEngine: () => mockEditorEngine,
}));

jest.mock('@/components/store/user', () => ({
    useUserManager: () => mockUserManager,
}));

// Mock Icons to prevent rendering issues in tests if they are complex
jest.mock('@onlook/ui/icons', () => {
    const originalIcons = jest.requireActual('@onlook/ui/icons');
    return {
        ...originalIcons,
        Icons: {
            ...originalIcons.Icons,
            Check: () => <svg data-testid="icon-check" />,
            Users: () => <svg data-testid="icon-users" />,
            Cpu: () => <svg data-testid="icon-cpu" />,
            CounterClockwiseClock: () => <svg data-testid="icon-history" />,
        },
    };
});


const TestWrapper = observer(({ children }: {children: React.ReactNode}) => <>{children}</>);

describe('ChatPanelDropdown', () => {
    let setIsChatHistoryOpenMock: jest.Mock;

    const renderComponent = () => {
        return render(
            <TestWrapper>
                <ChatPanelDropdown
                    isChatHistoryOpen={false}
                    setIsChatHistoryOpen={setIsChatHistoryOpenMock}
                >
                    <button>Open Dropdown</button>
                </ChatPanelDropdown>
            </TestWrapper>
        );
    };

    beforeEach(() => {
        setIsChatHistoryOpenMock = jest.fn();
        // Reset mockChatManager state before each test
        mockChatManager.currentLLMProvider = LLMProvider.ANTHROPIC;
        mockChatManager.currentModelId = CLAUDE_MODELS.SONNET_4;
        mockSetLLMProvider.mockClear();
        mockSetModelId.mockClear();
    });

    const openDropdown = () => {
        fireEvent.click(screen.getByText('Open Dropdown'));
    };

    describe('Rendering', () => {
        it('should display initial provider and model (Anthropic, Sonnet 4)', () => {
            renderComponent();
            openDropdown();
            expect(screen.getByText(`Provider: Anthropic`)).toBeInTheDocument();
            expect(screen.getByText(`Model: ${CLAUDE_MODELS.SONNET_4}`)).toBeInTheDocument();
        });

        it('should list Anthropic and Gemini as provider options', () => {
            renderComponent();
            openDropdown();
            fireEvent.click(screen.getByText(`Provider: Anthropic`)); // Open provider sub-menu
            expect(screen.getByText('Anthropic')).toBeInTheDocument();
            expect(screen.getByText('Gemini')).toBeInTheDocument();
        });

        it('should list Claude models when Anthropic is the provider', () => {
            renderComponent();
            openDropdown();
            fireEvent.click(screen.getByText(`Model: ${CLAUDE_MODELS.SONNET_4}`)); // Open model sub-menu
            Object.values(CLAUDE_MODELS).forEach(modelId => {
                expect(screen.getByText(modelId)).toBeInTheDocument();
            });
        });

        it('should update displayed provider and model when ChatManager state changes to Gemini', () => {
            mockChatManager.currentLLMProvider = LLMProvider.GEMINI;
            mockChatManager.currentModelId = GEMINI_MODELS.GEMINI_PRO;
            const { rerender } = renderComponent();
            
            // MobX observer should trigger re-render, but explicitly calling rerender for safety
             rerender(
                <TestWrapper>
                    <ChatPanelDropdown
                        isChatHistoryOpen={false}
                        setIsChatHistoryOpen={setIsChatHistoryOpenMock}
                    >
                        <button>Open Dropdown</button>
                    </ChatPanelDropdown>
                </TestWrapper>
            );

            openDropdown();
            expect(screen.getByText(`Provider: Gemini`)).toBeInTheDocument();
            expect(screen.getByText(`Model: ${GEMINI_MODELS.GEMINI_PRO}`)).toBeInTheDocument();
        });

        it('should list Gemini models when Gemini is the provider', () => {
            mockChatManager.currentLLMProvider = LLMProvider.GEMINI;
            mockChatManager.currentModelId = GEMINI_MODELS.GEMINI_PRO;
            renderComponent();
            openDropdown();
            fireEvent.click(screen.getByText(`Model: ${GEMINI_MODELS.GEMINI_PRO}`)); // Open model sub-menu
            Object.values(GEMINI_MODELS).forEach(modelId => {
                // Need to ensure all text variations are caught if displayed differently
                const modelElements = screen.getAllByText(modelId);
                expect(modelElements.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Interactions', () => {
        it('should call setLLMProvider with GEMINI when Gemini provider option is clicked', () => {
            renderComponent();
            openDropdown();
            fireEvent.click(screen.getByText(`Provider: Anthropic`)); // Open provider sub-menu
            fireEvent.click(screen.getByText('Gemini'));
            expect(mockSetLLMProvider).toHaveBeenCalledWith(LLMProvider.GEMINI);
        });

        it('should call setModelId with a Claude model when an Anthropic model option is clicked', () => {
            renderComponent(); // Defaults to Anthropic
            openDropdown();
            fireEvent.click(screen.getByText(`Model: ${CLAUDE_MODELS.SONNET_4}`)); // Open model sub-menu
            fireEvent.click(screen.getByText(CLAUDE_MODELS.HAIKU));
            expect(mockSetModelId).toHaveBeenCalledWith(CLAUDE_MODELS.HAIKU);
        });

        it('should call setLLMProvider with ANTHROPIC when Anthropic provider option is clicked', () => {
            // Set initial to Gemini to test switching back
            mockChatManager.currentLLMProvider = LLMProvider.GEMINI;
            mockChatManager.currentModelId = GEMINI_MODELS.GEMINI_PRO;
            renderComponent();
            openDropdown();
            fireEvent.click(screen.getByText(`Provider: Gemini`)); // Open provider sub-menu
            fireEvent.click(screen.getByText('Anthropic'));
            expect(mockSetLLMProvider).toHaveBeenCalledWith(LLMProvider.ANTHROPIC);
        });

        it('should call setModelId with a Gemini model when a Gemini model option is clicked', () => {
            mockChatManager.currentLLMProvider = LLMProvider.GEMINI;
            mockChatManager.currentModelId = GEMINI_MODELS.GEMINI_PRO; // Default for Gemini
            renderComponent();
            openDropdown();
            // The model displayed in trigger is GEMINI_PRO. Click it to open sub-menu.
            fireEvent.click(screen.getByText(`Model: ${GEMINI_MODELS.GEMINI_PRO}`));
            // Assuming GEMINI_MODELS.GEMINI_PRO is the only one for now, click it.
            // If there were others, we'd pick a different one.
            const geminiModelElements = screen.getAllByText(GEMINI_MODELS.GEMINI_PRO);
            // Find the one that is a menu item (not the trigger)
            const geminiModelItem = geminiModelElements.find(el => el.getAttribute('role') === 'menuitem');
            expect(geminiModelItem).toBeDefined();
            if (geminiModelItem) {
                 fireEvent.click(geminiModelItem);
                 expect(mockSetModelId).toHaveBeenCalledWith(GEMINI_MODELS.GEMINI_PRO);
            }
        });
    });
});
