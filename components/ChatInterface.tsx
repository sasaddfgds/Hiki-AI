import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Sparkles, User, Bot, Loader2, Trash2, X, Cpu } from 'lucide-react';
import { GeminiService } from '../services/geminiService';
import { ChatMessage, User as UserType } from '../types';
import { DB } from '../services/storageService';
import { translations, Language } from '../translations';

interface ChatInterfaceProps {
  onInteraction?: () => void;
  currentUser: UserType | null;
  activeSessionId: string | null;
  language: Language;
  onDeleteSession: (id: string) => void;
  onSessionUpdate?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onInteraction, 
  currentUser, 
  activeSessionId, 
  language,
  onDeleteSession,
  onSessionUpdate
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [processingNode, setProcessingNode] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = GeminiService.getInstance();
  const t = translations[language];

  // Auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      const history = DB.getChatHistory(activeSessionId);
      setMessages(history);
    } else {
      setMessages([]);
    }
    setSelectedImage(null);
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert(language === 'RU' ? 'Поддерживаются только JPG, PNG и WEBP' : 'Only JPG, PNG and WEBP are supported');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          data: reader.result as string,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    // GUARD: Lock to prevent spam and 429 loops
    if (isLoading || !activeSessionId || !currentUser) return;
    if (!input.trim() && !selectedImage) return;

    const userContent = input.trim();
    const currentAttachment = selectedImage;

    // 1. Prepare User Message
    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: userContent,
      type: 'text',
      attachment: currentAttachment?.data,
      mimeType: currentAttachment?.mimeType,
      userId: currentUser.id,
      sessionId: activeSessionId
    };

    // 2. Update UI & Storage immediately
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    DB.saveChatHistory(activeSessionId, updatedHistory);
    
    if (messages.length === 0) {
      DB.updateSessionTitle(currentUser.id, activeSessionId, userContent || (language === 'RU' ? 'Изображение' : 'Image'));
      if (onSessionUpdate) onSessionUpdate();
    }

    // 3. Reset Inputs & Set Loading
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    setProcessingNode(gemini.getActiveNode().name);

    try {
      // 4. API Call with Node Routing
      const { text } = await gemini.generateText(
        userContent, 
        currentUser.username, 
        messages, 
        currentAttachment || undefined
      );
      
      const modelMsg: ChatMessage = {
        id: `m_${Date.now() + 1}`,
        role: 'model',
        content: text.replace(/\*\*/g, ''), // Clean markdown bold
        type: 'text',
        userId: currentUser.id,
        sessionId: activeSessionId
      };
      
      const finalHistory = [...updatedHistory, modelMsg];
      setMessages(finalHistory);
      DB.saveChatHistory(activeSessionId, finalHistory);
      if (onInteraction) onInteraction();

    } catch (error: any) {
      console.error("Hiki System Error:", error);
      
      // 5. Error Handling in UI to prevent infinite loops
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'model',
        content: `[SYSTEM ERROR]: ${error.message || "Connection lost."}`,
        type: 'text',
        userId: currentUser.id,
        sessionId: activeSessionId
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setProcessingNode(null);
    }
  };

  if (!activeSessionId && currentUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#050505]">
        <div className="w-20 h-20 rounded-3xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
          <Sparkles className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-3xl font-outfit font-bold tracking-tight mt-6 text-glow">
          {language === 'RU' ? 'Создайте свой первый чат' : 'Create your first chat'}
        </h2>
        <p className="text-white/40 text-lg font-light mt-2 max-w-sm">
          {language === 'RU' ? 'Нажмите "+" в боковом меню, чтобы начать общение.' : 'Click "+" in the sidebar to start a conversation.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full -z-10" />
      
      {/* Header */}
      <div className="px-8 py-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Neural Link Active</span>
        </div>
        {activeSessionId && (
          <button 
            onClick={() => onDeleteSession(activeSessionId)}
            className="text-[10px] font-black text-white/30 hover:text-red-400 flex items-center gap-2 transition-all uppercase tracking-widest group"
          >
            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            <span>{t.clearLog}</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
              <Bot className="w-12 h-12 text-cyan-400" />
            </div>
            <div className="space-y-3">
              <h2 className="text-5xl font-outfit font-bold tracking-tighter">
                {language === 'RU' ? 'Чем ' : 'How can '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Hiki</span> {language === 'RU' ? 'поможет?' : 'help you?'}
              </h2>
              <p className="text-white/30 text-xl font-light tracking-wide">
                {language === 'RU' ? 'Анализ данных, кодинг или визуальный поиск.' : 'Data analysis, coding, or visual search.'}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-4 duration-500`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-all duration-500 ${
                msg.role === 'user' 
                ? 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                : 'bg-white/5 border-white/10 glass-effect'
            }`}>
              {msg.role === 'user' ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-cyan-400" />}
            </div>

            <div className={`max-w-[75%] group relative ${msg.role === 'user' ? 'text-right' : ''}`}>
               {msg.attachment && (
                <div className="mb-4 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                  <img src={msg.attachment} alt="Attachment" className="max-h-80 w-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
              )}
              <div className={`inline-block p-6 rounded-[2.5rem] ${
                msg.role === 'user' 
                ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-50 rounded-tr-none' 
                : 'glass-effect border border-white/10 text-white/90 rounded-tl-none shadow-2xl'
              }`}>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium tracking-tight">
                    {msg.content}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-6 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
            <div className="max-w-[80%] rounded-[2.5rem] p-8 glass-effect rounded-tl-none border border-white/10 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:-0.3s]" />
              </div>
              {processingNode && (
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400/50">
                   <Cpu className="w-3.5 h-3.5" /> Routing through {processingNode}...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="p-10 pt-4 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent z-20">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {selectedImage && (
            <div className="flex animate-in slide-in-from-bottom-4 duration-500">
              <div className="relative group/preview rounded-[2rem] overflow-hidden border-2 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)] p-1.5 glass-effect bg-white/5">
                <img src={selectedImage.data} alt="Preview" className="h-28 w-auto rounded-[1.5rem] object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-3 right-3 p-2 bg-black/80 backdrop-blur-xl rounded-xl text-white hover:bg-red-500 transition-all shadow-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-20 transition duration-1000" />
            <div className="relative glass-effect rounded-[2rem] p-3 flex items-center gap-3 border border-white/10 transition-all focus-within:border-cyan-500/50 shadow-2xl bg-black/20">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl transition-all duration-300 ${selectedImage ? 'bg-cyan-500/20 text-cyan-400 shadow-inner' : 'text-white/20 hover:text-cyan-400 hover:bg-white/5'}`}
              >
                <Paperclip className="w-6 h-6" />
              </button>
              
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t.askPrompt}
                className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-white/10 px-3 font-medium tracking-tight"
                disabled={isLoading}
              />
              
              <button 
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage) || !activeSessionId}
                className="bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-20 disabled:grayscale text-white p-5 rounded-2xl transition-all shadow-2xl shadow-cyan-500/20 active:scale-95 group/send"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </div>
          </div>
          
          <div className="flex justify-center gap-10 opacity-20 group-hover:opacity-40 transition-opacity">
            <p className="text-[9px] font-black uppercase tracking-[0.4em]">Hiki Neural System 3.1</p>
            <p className="text-[9px] font-black uppercase tracking-[0.4em]">End-to-End Quantum Secure</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;