import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { chatbotService } from '@/services/chatbotService';
import type { ChatMessage } from '@/types';

export default function ChatbotWidget() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'bot',
      content: t('chatbot.welcome'),
      suggestions: [
        t('chatbot.question1'),
        t('chatbot.question2'),
        t('chatbot.question3'),
      ],
      timestamp: new Date().toISOString(),
    };

    setMessages((current) => {
      if (current.length === 0) {
        return [welcomeMessage];
      }

      return current.map((message) =>
        message.id === 'welcome'
          ? { ...welcomeMessage, timestamp: message.timestamp }
          : message
      );
    });
  }, [t]);

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatbotService.sendMessage({ message: text, sessionId });
      
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'bot',
        content: response.response,
        suggestions: response.suggestions,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `bot-error-${Date.now()}`,
        role: 'bot',
        content: t('chatbot.error'),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-700 hover:bg-primary-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
          title={t('chatbot.title')}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fade-in">
          {/* Header */}
          <div className="bg-primary-700 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <span className="font-semibold">{t('chatbot.title')}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-secondary-400' : 'bg-primary-100'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-primary-700" />}
                </div>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary-700 text-white rounded-tr-sm' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                  
                  {/* Suggestions */}
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {msg.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(suggestion)}
                          className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors border border-primary-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-700" />
                </div>
                <div className="bg-gray-100 rounded-xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chatbot.placeholder')}
                className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-2.5 bg-primary-700 text-white rounded-xl hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
