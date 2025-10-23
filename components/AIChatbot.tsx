import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send } from 'lucide-react';

const API_BASE_URL = 'https://time.anuwat.in.th';

interface AIChatbotProps {
    contextData?: any;
}

interface Message {
    sender: 'user' | 'bot';
    text: string;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ contextData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        // When the chat window opens, display a welcome message.
        if (isOpen) {
            setMessages([
                { sender: 'bot', text: 'สวัสดีครับ! มีอะไรให้ช่วยเกี่ยวกับการจัดตารางสอนไหมครับ?' }
            ]);
        }
    }, [isOpen]);

    // Auto-resize textarea logic
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Temporarily shrink to get the correct scrollHeight
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            
            // Set the new height
            textarea.style.height = `${scrollHeight}px`;
            
            // If the textarea is scrollable, scroll to the bottom to show the cursor and latest text
            if (textarea.scrollHeight > textarea.clientHeight) {
                textarea.scrollTop = textarea.scrollHeight;
            }
        }
    }, [input]);

    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const apiResponse = await fetch(`${API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    context: contextData,
                }),
            });

            const data = await apiResponse.json();

            if (!apiResponse.ok) {
                throw new Error(data.error || 'An unknown API error occurred.');
            }

            const botMessage: Message = { sender: 'bot', text: data.text };
            setMessages(prev => [...prev, botMessage]);

        } catch (error: any) {
            console.error("Chatbot API error:", error);
            const errorMessage: Message = { sender: 'bot', text: `ขออภัยครับ เกิดข้อผิดพลาด: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
            e.preventDefault(); // Prevent new line on Enter
            handleSend();
        }
        // Shift+Enter will create a new line by default
    };
    
    // The parent component now controls if the chatbot is rendered based on a feature flag.

    return (
        <>
            {/* Floating action button to open the chat */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 z-50 no-print"
                    aria-label="Open AI Chatbot"
                >
                    <Bot size={28} />
                </button>
            )}

            {/* Main chat window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-full max-w-sm h-full max-h-[600px] bg-white rounded-xl shadow-2xl flex flex-col z-50 animate-fade-in-up no-print">
                    {/* Header */}
                    <header className="flex justify-between items-center p-4 bg-blue-600 text-white rounded-t-xl">
                        <div className="flex items-center space-x-2">
                            <Bot size={24} />
                            <h3 className="font-bold text-lg">ผู้ช่วยจัดตาราง</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-blue-700" aria-label="Close chat">
                            <X size={24} />
                        </button>
                    </header>

                    {/* Messages container */}
                    <main className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        <div className="space-y-4">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-4 py-2 rounded-xl whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                        <p>{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="px-4 py-2 rounded-xl bg-gray-200 text-gray-800">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </main>

                    {/* Input area */}
                    <footer className="p-4 border-t bg-white rounded-b-xl">
                        <div className="relative">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="พิมพ์คำถามของคุณ..."
                                className="w-full p-3 pr-14 border rounded-lg focus:ring-blue-500 focus:border-blue-500 resize-none overflow-y-auto"
                                style={{ maxHeight: '120px' }} // Approx height for 5 lines (5 * 24px)
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading || input.trim() === ''}
                                className="absolute right-2 bottom-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                                aria-label="Send message"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </>
    );
};

export default AIChatbot;
