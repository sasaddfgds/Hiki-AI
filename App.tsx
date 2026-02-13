
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import DatabaseView from './components/DatabaseView';
import { ToolType, User, ChatSession } from './types';
import { Bell, ChevronRight, Zap, MessageSquare } from 'lucide-react';
import { DB } from './services/storageService';
import { translations, Language } from './translations';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.FLOWS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // Settings States
  const [language, setLanguage] = useState<Language>('RU');
  const [theme, setTheme] = useState('Classic');
  const [textSize, setTextSize] = useState('M');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const [sessionStats, setSessionStats] = useState({
    messages: 0
  });

  const t = translations[language];

  useEffect(() => {
    // Load persisted settings
    const savedSettings = localStorage.getItem('hiki_app_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setLanguage(parsed.language || 'RU');
      setTheme(parsed.theme || 'Classic');
      setTextSize(parsed.textSize || 'M');
      setAnimationsEnabled(parsed.animationsEnabled !== undefined ? parsed.animationsEnabled : true);
    }

    const savedUser = localStorage.getItem('hiki_sys_session_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      const savedStats = localStorage.getItem(`hiki_stats_${user.id}`);
      if (savedStats) setSessionStats(JSON.parse(savedStats));
      
      // Load latest session
      const latest = DB.getChatSessions(user.id)[0];
      if (latest) setActiveSessionId(latest.id);
    }
  }, []);

  // Apply settings to DOM
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.body.setAttribute('data-size', textSize);
    document.body.setAttribute('data-animations', String(animationsEnabled));
    
    // Save settings
    localStorage.setItem('hiki_app_settings', JSON.stringify({
      language, theme, textSize, animationsEnabled
    }));
  }, [theme, language, textSize, animationsEnabled]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`hiki_stats_${currentUser.id}`, JSON.stringify(sessionStats));
    }
  }, [sessionStats, currentUser]);

  const incrementStat = () => {
    setSessionStats(prev => ({
      messages: prev.messages + 1
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('hiki_sys_session_user');
    setCurrentUser(null);
    setActiveSessionId(null);
    setSessionStats({ messages: 0 });
    setActiveTool(ToolType.FLOWS);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('hiki_sys_session_user', JSON.stringify(user));
    const savedStats = localStorage.getItem(`hiki_stats_${user.id}`);
    setSessionStats(savedStats ? JSON.parse(savedStats) : { messages: 0 });
    
    const latest = DB.getChatSessions(user.id)[0];
    if (latest) setActiveSessionId(latest.id);
  };

  const handleNewChat = () => {
    if (currentUser) {
      const newSession = DB.createChatSession(currentUser.id);
      setActiveSessionId(newSession.id);
      setActiveTool(ToolType.CHAT);
    } else {
      setIsAuthOpen(true);
    }
  };

  const renderContent = () => {
    switch (activeTool) {
      case ToolType.CHAT:
        return (
          <ChatInterface 
            onInteraction={incrementStat} 
            currentUser={currentUser} 
            activeSessionId={activeSessionId}
            language={language}
          />
        );
      case ToolType.DATABASE:
        return <DatabaseView currentUser={currentUser} language={language} />;
      case ToolType.FLOWS:
        return (
          <Dashboard 
            setActiveTool={setActiveTool} 
            stats={sessionStats} 
            currentUser={currentUser}
            onLoginClick={() => setIsAuthOpen(true)}
            language={language}
            setActiveSessionId={setActiveSessionId}
          />
        );
      default:
        return null;
    }
  };

  const getToolLabel = () => {
    switch (activeTool) {
      case ToolType.CHAT: return t.chat;
      case ToolType.FLOWS: return t.dashboard;
      case ToolType.DATABASE: return t.database;
      default: return 'Hiki AI';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#050505] text-white selection:bg-cyan-500 selection:text-black transition-colors duration-500">
      <Sidebar 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewChat={handleNewChat}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => setIsAuthOpen(true)}
        language={language}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/80 backdrop-blur-3xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-white/30 text-[10px] font-bold uppercase tracking-[0.4em]">
              <span className="opacity-50">{t.hikiIntelligence}</span>
              <ChevronRight className="w-3 h-3 opacity-30" />
              <span className="text-cyan-400 font-black">{getToolLabel()}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* STYLED STATUS BAR: Matching user reference */}
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-black/40 border border-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400 whitespace-nowrap">
                {t.systemNominal}
              </span>
            </div>
            <button className="p-2 text-white/20 hover:text-white transition-all relative">
              <Bell className="w-5 h-5" />
              {sessionStats.messages > 0 && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full border border-[#050505]" />
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {renderContent()}
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        textSize={textSize}
        setTextSize={setTextSize}
        animationsEnabled={animationsEnabled}
        setAnimationsEnabled={setAnimationsEnabled}
      />
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />
    </div>
  );
};

const Dashboard: React.FC<{ 
  setActiveTool: (t: ToolType) => void, 
  stats: any, 
  currentUser: User | null,
  onLoginClick: () => void,
  language: Language,
  setActiveSessionId: (id: string | null) => void
}> = ({ setActiveTool, stats, currentUser, onLoginClick, language, setActiveSessionId }) => {
  const t = translations[language];
  return (
    <div className="p-12 space-y-16 overflow-y-auto h-full bg-transparent custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-20 pb-20">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.4em] text-white/40 shadow-xl">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Systems written on top of stability
          </div>
          <h1 className="text-8xl font-outfit font-black tracking-tighter bg-gradient-to-r from-white via-white to-white/20 bg-clip-text text-transparent leading-[1.1]">
            {t.welcome}, <br/><span className="text-cyan-500">{currentUser ? currentUser.username : t.guest}</span>.
          </h1>
          <p className="text-3xl text-white/30 font-light max-w-3xl leading-relaxed font-outfit">
            {t.helpPrompt}
          </p>
        </section>

        {!currentUser && (
          <section className="p-14 rounded-[3.5rem] bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden group shadow-[0_40px_120px_rgba(0,0,0,0.9)] transition-all hover:shadow-cyan-500/5">
            <div className="space-y-4 relative z-10">
              <h2 className="text-5xl font-black font-outfit tracking-tighter">{t.saveData}</h2>
              <p className="text-white/30 max-w-md text-xl font-light leading-relaxed">{t.authMsg}</p>
            </div>
            <button 
              onClick={onLoginClick}
              className="px-14 py-6 bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-cyan-500 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.1)] active:scale-95 relative z-10"
            >
              {t.register}
            </button>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <div className="p-10 rounded-[3rem] glass-effect border border-white/5 group hover:border-cyan-500/40 transition-all cursor-default relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className="p-6 rounded-3xl bg-white/5 group-hover:bg-cyan-500/20 transition-all border border-white/5">
                <MessageSquare className="w-12 h-12 text-cyan-400" />
              </div>
              <div className="text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-5 py-2 rounded-full uppercase tracking-[0.3em] border border-cyan-500/20">{t.activeSession}</div>
            </div>
            <p className="text-7xl font-black mb-4 relative z-10 font-outfit tracking-tighter">{stats.messages}</p>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-black relative z-10">{t.messagesCount}</p>
            <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-cyan-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>

          <div 
            onClick={() => {
              setActiveTool(ToolType.CHAT);
              if (currentUser) {
                const latest = DB.getChatSessions(currentUser.id)[0];
                if (latest) setActiveSessionId(latest.id);
              }
            }}
            className="p-10 rounded-[3rem] glass-effect border border-white/5 group hover:border-cyan-500/60 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[300px] shadow-2xl"
          >
            <h4 className="text-4xl font-black mb-4 relative z-10 font-outfit tracking-tighter">{t.newChat}</h4>
            <p className="text-white/30 leading-relaxed mb-10 relative z-10 font-light text-lg">{t.chatModuleDesc}</p>
            <div className="flex items-center gap-4 text-[10px] font-black text-cyan-400 group-hover:translate-x-3 transition-all relative z-10 uppercase tracking-[0.4em]">
              {t.startChat} <ChevronRight className="w-6 h-6" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div 
            onClick={() => setActiveTool(ToolType.DATABASE)}
            className="p-10 rounded-[3rem] glass-effect border border-white/5 group hover:border-blue-500/60 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[300px] shadow-2xl"
          >
            <h4 className="text-4xl font-black mb-4 relative z-10 font-outfit tracking-tighter">{t.database}</h4>
            <p className="text-white/30 leading-relaxed mb-10 relative z-10 font-light text-lg">{t.dbModuleDesc}</p>
            <div className="flex items-center gap-4 text-[10px] font-black text-blue-400 group-hover:translate-x-3 transition-all relative z-10 uppercase tracking-[0.4em]">
              {t.explorer} <ChevronRight className="w-6 h-6" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;
