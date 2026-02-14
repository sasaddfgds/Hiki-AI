
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Sparkles, User, Bot, Loader2, Trash2, X, Image as ImageIcon } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = GeminiService.getInstance();
  const t = translations[language];

  useEffect(() => {
    if (activeSessionId) {
      setMessages(DB.getChatHistory(activeSessionId));
    } else {
      setMessages([]);
    }
    setSelectedImage(null);
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
    // Сбрасываем значение инпута, чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading || !activeSessionId || !currentUser) return;

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: input,
      type: 'text',
      attachment: selectedImage?.data,
      mimeType: selectedImage?.mimeType,
      userId: currentUser.id,
      sessionId: activeSessionId
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    DB.saveChatHistory(activeSessionId, newMessages);
    
    if (messages.length === 0) {
      DB.updateSessionTitle(currentUser.id, activeSessionId, input || (language === 'RU' ? 'Изображение' : 'Image'));
      if (onSessionUpdate) onSessionUpdate();
    }

    const currentInput = input;
    const currentAttachment = selectedImage;

    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Отправляем историю БЕЗ последнего сообщения (оно передается отдельно с картинкой)
      const response = await gemini.generateText(
        currentInput, 
        currentUser.username, 
        messages, 
        currentAttachment || undefined
      );
      
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
    if (activeSessionId) {
      onDeleteSession(activeSessionId);
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
      <div className="px-8 py-3 border-b border-white/5 flex justify-end bg-black/20">
        {activeSessionId && (
          <button 
            onClick={clearHistory}
            className="text-[11px] font-black text-white/30 hover:text-red-400 flex items-center gap-3 transition-all uppercase tracking-[0.2em] group"
          >
            <div className="p-1.5 rounded-lg group-hover:bg-red-500/10 transition-colors">
              <Trash2 className="w-4 h-4" />
            </div>
            <span className="opacity-80 group-hover:opacity-100">{t.clearLog}</span>
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 max-w-4xl mx-auto w-full scroll-smooth custom-scrollbar"
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
                {language === 'RU' ? 'Спросите о коде, анализе или прикрепите фото.' : 'Ask about code, analysis or attach a photo.'}
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
            <div className={`max-w-[85%] rounded-[2rem] overflow-hidden ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white rounded-tr-none shadow-[0_10px_40px_rgba(37,99,235,0.2)]' 
              : 'glass-effect text-white/90 rounded-tl-none border border-white/10'
            }`}>
              {msg.attachment && (
                <div className="w-full mb-2">
                  <img 
                    src={msg.attachment} 
                    alt="Attachment" 
                    className="max-h-96 w-full object-contain bg-black/20"
                  />
                </div>
              )}
              <div className="p-6">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
              </div>
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
        <div className="max-w-4xl mx-auto space-y-4">
          
          {selectedImage && (
            <div className="flex animate-in slide-in-from-bottom-2 duration-300">
              <div className="relative group/preview rounded-2xl overflow-hidden border border-white/20 shadow-2xl glass-effect p-1 bg-white/5">
                <img src={selectedImage.data} alt="Preview" className="h-24 w-auto rounded-xl object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/preview:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition duration-1000" />
            <div className="relative glass-effect rounded-[1.75rem] p-2 flex items-center gap-2 border border-white/10 transition-all focus-within:border-cyan-500/40">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 transition-colors ${selectedImage ? 'text-cyan-400' : 'text-white/20 hover:text-white'}`}
                title={language === 'RU' ? 'Прикрепить фото' : 'Attach photo'}
              >
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
                disabled={isLoading || (!input.trim() && !selectedImage) || !activeSessionId}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed text-black p-4 rounded-2xl transition-all shadow-xl shadow-cyan-500/10 active:scale-95"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
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
