
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, User, Bot, Loader2, Trash2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { ChatMessage, User as UserType } from '../types';
import { DB } from '../services/storageService';
import { translations, Language } from '../translations';

interface ChatInterfaceProps {
  onInteraction?: () => void;
  currentUser: UserType | null;
  activeSessionId: string | null;
  language: Language;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onInteraction, currentUser, activeSessionId, language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gemini = GeminiService.getInstance();
  const t = translations[language];

  // Load history when activeSessionId changes
  useEffect(() => {
    if (activeSessionId) {
      setMessages(DB.getChatHistory(activeSessionId));
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  // Persistent scrolling
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !activeSessionId || !currentUser) return;

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: input,
      type: 'text',
      userId: currentUser.id,
      sessionId: activeSessionId
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    DB.saveChatHistory(activeSessionId, newMessages);
    
    // Update title on first message
    if (messages.length === 0) {
      DB.updateSessionTitle(currentUser.id, activeSessionId, input);
    }

    setInput('');
    setIsLoading(true);

    try {
      const response = await gemini.generateText(input, currentUser.username);
      
      // Clean response: remove bold markdown markers ** as requested
      const cleanedResponse = response.replace(/\*\*/g, '');
      
      const modelMsg: ChatMessage = {
        id: `m_${Date.now() + 1}`,
        role: 'model',
        content: cleanedResponse,
        type: 'text',
        userId: currentUser.id,
        sessionId: activeSessionId
      };
      
      const finalMessages = [...newMessages, modelMsg];
      setMessages(finalMessages);
      DB.saveChatHistory(activeSessionId, finalMessages);
      if (onInteraction) onInteraction();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    const confirmMsg = language === 'RU' ? 'Вы уверены, что хотите очистить этот чат?' : 'Are you sure you want to clear this chat?';
    if (activeSessionId && confirm(confirmMsg)) {
      DB.saveChatHistory(activeSessionId, []);
      setMessages([]);
    }
  };

  if (!activeSessionId && currentUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#050505]">
        <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
          <Sparkles className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-3xl font-outfit font-bold tracking-tight mt-6">
          {language === 'RU' ? 'Создайте свой первый чат' : 'Create your first chat'}
        </h2>
        <p className="text-white/40 text-lg font-light mt-2">
          {language === 'RU' ? 'Нажмите "+" в боковом меню, чтобы начать общение.' : 'Click "+" in the sidebar to start a conversation.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header with clear action */}
      <div className="px-6 py-2 border-b border-white/5 flex justify-end">
        {messages.length > 0 && activeSessionId && (
          <button 
            onClick={clearHistory}
            className="text-[10px] font-bold text-white/20 hover:text-red-400 flex items-center gap-1 transition-colors uppercase tracking-widest"
          >
            <Trash2 className="w-3 h-3" /> {t.clearLog}
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20">
              <Sparkles className="w-10 h-10 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-outfit font-bold tracking-tight">
                {language === 'RU' ? 'Чем ' : 'How can '}<strong className="font-bold text-cyan-400">Hiki</strong> {language === 'RU' ? 'может помочь сегодня?' : 'help you today?'}
              </h2>
              <p className="text-white/40 text-lg font-light">
                {language === 'RU' ? 'Спросите о коде, анализе или создайте план действий.' : 'Ask about code, analysis or create an action plan.'}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-6 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-[2rem] p-6 ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none shadow-[0_10px_40px_rgba(37,99,235,0.2)]' 
              : 'glass-effect text-white/90 rounded-tl-none border border-white/10'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-6 animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="max-w-[80%] rounded-[2rem] p-6 glass-effect rounded-tl-none border border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-100" />
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce delay-200" />
            </div>
          </div>
        )}
      </div>

      <div className="p-8 pt-0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
          <div className="relative glass-effect rounded-[1.75rem] p-2 flex items-center gap-2 border border-white/10 transition-all focus-within:border-cyan-500/40">
            <button className="p-4 text-white/20 hover:text-white transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={t.askPrompt}
              className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder:text-white/10 px-2 font-medium"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !activeSessionId}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-black p-4 rounded-2xl transition-all shadow-xl shadow-cyan-500/10 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">Hiki OS 3.1</p>
          <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">Quantum Encryption Active</p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
