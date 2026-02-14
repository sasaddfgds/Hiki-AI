
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import DatabaseView from './components/DatabaseView';
import { ToolType, User, Notification, ChatSession } from './types';
import { Bell, ChevronRight, Zap, Info, ShieldCheck, X, CheckCheck, MessageSquare, Menu, Activity, Cpu, Globe } from 'lucide-react';
import { DB } from './services/storageService';
import { translations, Language } from './translations';
import { GeminiService, NodeStatus } from './services/geminiService';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.FLOWS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeNode, setActiveNode] = useState<NodeStatus | null>(null);
  
  const [language, setLanguage] = useState<Language>('RU');
  const [theme, setTheme] = useState('Classic');
  const [textSize, setTextSize] = useState('M');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const [sessionStats, setSessionStats] = useState({
    messages: 0
  });

  const t = translations[language];
  const bellRef = useRef<HTMLButtonElement>(null);
  const gemini = GeminiService.getInstance();

  useEffect(() => {
    setActiveNode(gemini.getActiveNode());
    const interval = setInterval(() => {
      setActiveNode(gemini.getActiveNode());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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
      
      const userSessions = DB.getChatSessions(user.id);
      setSessions(userSessions);
      if (userSessions[0]) setActiveSessionId(userSessions[0].id);
      
      setNotifications(DB.getNotifications(user.id));
    } else {
      setNotifications(DB.getNotifications('guest'));
    }
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-size', textSize);
    document.body.setAttribute('data-animations', String(animationsEnabled));
    localStorage.setItem('hiki_app_settings', JSON.stringify({
      language, theme, textSize, animationsEnabled
    }));
  }, [theme, language, textSize, animationsEnabled]);

  const incrementStat = () => {
    setSessionStats(prev => ({
      messages: prev.messages + 1
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('hiki_sys_session_user');
    setCurrentUser(null);
    setActiveSessionId(null);
    setSessions([]);
    setSessionStats({ messages: 0 });
    setNotifications(DB.getNotifications('guest'));
    setActiveTool(ToolType.FLOWS);
    setIsNotificationsOpen(false);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('hiki_sys_session_user', JSON.stringify(user));
    const savedStats = localStorage.getItem(`hiki_stats_${user.id}`);
    setSessionStats(savedStats ? JSON.parse(savedStats) : { messages: 0 });
    
    const userSessions = DB.getChatSessions(user.id);
    setSessions(userSessions);
    if (userSessions[0]) setActiveSessionId(userSessions[0].id);
    
    setNotifications(DB.getNotifications(user.id));
  };

  const handleNewChat = () => {
    if (currentUser) {
      const newSession = DB.createChatSession(currentUser.id);
      setSessions(DB.getChatSessions(currentUser.id));
      setActiveSessionId(newSession.id);
      setActiveTool(ToolType.CHAT);
      setIsSidebarOpen(false);
    } else {
      setIsAuthOpen(true);
    }
  };

  const handleDeleteSession = (sid: string) => {
    if (!currentUser) return;
    DB.deleteChatSession(currentUser.id, sid);
    const updated = DB.getChatSessions(currentUser.id);
    setSessions(updated);
    if (activeSessionId === sid) {
      setActiveSessionId(null);
      setActiveTool(ToolType.FLOWS);
    }
  };

  const handleMarkRead = () => {
    const userId = currentUser ? currentUser.id : 'guest';
    DB.markAllNotificationsRead(userId);
    setNotifications(DB.getNotifications(userId));
  };

  const hasUnread = notifications.some(n => !n.isRead);

  const renderContent = () => {
    switch (activeTool) {
      case ToolType.CHAT:
        return (
          <ChatInterface 
            onInteraction={incrementStat} 
            currentUser={currentUser} 
            activeSessionId={activeSessionId}
            language={language}
            onDeleteSession={handleDeleteSession}
            onSessionUpdate={() => currentUser && setSessions(DB.getChatSessions(currentUser.id))}
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
            sessions={sessions}
            gemini={gemini}
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
        setActiveTool={(tool) => { setActiveTool(tool); setIsSidebarOpen(false); }} 
        onOpenSettings={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
        onNewChat={handleNewChat}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => { setIsAuthOpen(true); setIsSidebarOpen(false); }}
        language={language}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        onDeleteSession={handleDeleteSession}
        sessions={sessions}
        setSessions={setSessions}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 bg-[#050505]/60 backdrop-blur-3xl sticky top-0 z-10">
          <div className="flex items-center gap-3 lg:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-white/40 hover:text-white transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 lg:gap-3 text-white/30 text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.2em] lg:tracking-[0.4em]">
              <span className="opacity-50 hidden xs:inline">{t.hikiIntelligence}</span>
              <ChevronRight className="w-3 h-3 opacity-30 hidden xs:inline" />
              <span className="text-cyan-400 font-black text-glow">{getToolLabel()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:gap-6 relative">
            <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/5 border border-cyan-500/10 animate-pulse-border">
              <Cpu className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-[9px] font-black text-cyan-400/80 uppercase tracking-widest">{activeNode?.name || 'SYNCING...'}</span>
            </div>

            <div className="flex items-center gap-2 lg:gap-3 px-4 lg:px-6 py-1.5 lg:py-2 rounded-full bg-black/40 border border-cyan-400/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all">
              <div className="w-1.5 h-1.5 lg:w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)] animate-pulse" />
              <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.25em] text-cyan-400 whitespace-nowrap">
                {language === 'RU' ? 'NOMINAL' : t.systemNominal}
              </span>
            </div>
            
            <button 
              ref={bellRef}
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-2 transition-all relative ${isNotificationsOpen ? 'text-white' : 'text-white/20 hover:text-white'}`}
            >
              <Bell className="w-5 h-5" />
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-blue-500 rounded-full border border-[#050505]" />
              )}
            </button>

            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsNotificationsOpen(false)} />
                <div className="absolute top-14 right-0 w-80 glass-effect border border-white/10 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="text-xs font-black uppercase tracking-widest">{t.notifications}</h3>
                    {hasUnread && (
                      <button 
                        onClick={handleMarkRead}
                        className="text-[9px] font-bold text-cyan-400 hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-widest"
                      >
                        <CheckCheck className="w-3 h-3" /> {t.markAllRead}
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-10 text-center space-y-3">
                        <Info className="w-8 h-8 text-white/5 mx-auto" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">{t.noNotifications}</p>
                      </div>
                    ) : (
                      notifications.map(n => {
                        const displayTitle = (t as any)[n.title] || n.title;
                        const displayMessage = (t as any)[n.message] || n.message;
                        
                        return (
                          <div 
                            key={n.id} 
                            className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors relative ${!n.isRead ? 'bg-cyan-500/[0.02]' : ''}`}
                          >
                            {!n.isRead && <div className="absolute top-5 left-2 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,1)]" />}
                            <div className="flex gap-3">
                              <div className="shrink-0 p-2 rounded-lg bg-cyan-500/10 h-fit">
                                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              </div>
                              <div className="space-y-1 overflow-hidden">
                                <p className="text-[11px] font-black text-white/90 truncate">{displayTitle}</p>
                                <p className="text-[10px] text-white/40 leading-relaxed">{displayMessage}</p>
                                <p className="text-[8px] font-black text-white/10 uppercase tracking-widest pt-1">
                                  {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="p-3 bg-white/[0.03] border-t border-white/5 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-cyan-400 opacity-40" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Secure OS Notifications</span>
                  </div>
                </div>
              </>
            )}
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
  setActiveSessionId: (id: string | null) => void,
  sessions: ChatSession[],
  gemini: GeminiService
}> = ({ setActiveTool, stats, currentUser, onLoginClick, language, setActiveSessionId, sessions, gemini }) => {
  const t = translations[language];
  const nodes = gemini.getAllNodes();

  return (
    <div className="p-6 lg:p-12 space-y-12 lg:space-y-16 overflow-y-auto h-full bg-transparent custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-12 lg:space-y-20 pb-20">
        <section className="space-y-6 lg:space-y-8">
          <div className="inline-flex items-center gap-3 px-4 lg:px-5 py-2 lg:py-2.5 rounded-full bg-white/5 border border-white/10 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] lg:tracking-[0.4em] text-white/40 shadow-xl">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Systems on top of stability
          </div>
          <h1 className="text-5xl lg:text-8xl font-outfit font-black tracking-tighter bg-gradient-to-r from-white via-white to-white/20 bg-clip-text text-transparent leading-[1.1]">
            {t.welcome}, <br/><span className="text-cyan-500 text-glow">{currentUser ? currentUser.username : t.guest}</span>.
          </h1>
          <p className="text-xl lg:text-3xl text-white/30 font-light max-w-3xl leading-relaxed font-outfit">
            {t.helpPrompt}
          </p>
        </section>

        {/* Neural Cluster Section */}
        <section className="space-y-8 animate-fade-up">
           <div className="flex items-center gap-4">
             <Activity className="w-5 h-5 text-cyan-400" />
             <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/30">Neural Cluster Status</h3>
           </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
             {nodes.map(node => (
               <div key={node.id} className="p-6 rounded-3xl glass-effect border border-white/5 relative group overflow-hidden transition-all hover:border-cyan-500/30">
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{node.name}</span>
                     <span className={`text-[9px] font-bold mt-1 ${node.status === 'online' ? 'text-cyan-400' : 'text-red-400'}`}>
                       {node.status.toUpperCase()}
                     </span>
                   </div>
                   <div className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]' : 'bg-red-500 animate-pulse'}`} />
                 </div>
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-bold text-white/20 uppercase">Latency</span>
                     <span className="text-xs font-black text-cyan-400 font-outfit">{node.latency}ms</span>
                   </div>
                   <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-cyan-500/40 transition-all duration-1000" style={{ width: `${node.load}%` }} />
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-[9px] font-bold text-white/20 uppercase">Core Load</span>
                     <span className="text-[9px] font-black text-white/40">{node.load}%</span>
                   </div>
                 </div>
                 <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-cyan-500/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
               </div>
             ))}
           </div>
        </section>

        {!currentUser && (
          <section className="p-8 lg:p-14 rounded-[2rem] lg:rounded-[3.5rem] bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent border border-cyan-500/20 flex flex-col md:flex-row items-center justify-between gap-8 lg:gap-10 relative overflow-hidden group shadow-[0_40px_120px_rgba(0,0,0,0.9)] transition-all hover:shadow-cyan-500/5">
            <div className="space-y-3 lg:space-y-4 relative z-10 text-center md:text-left">
              <h2 className="text-3xl lg:text-5xl font-black font-outfit tracking-tighter">{t.saveData}</h2>
              <p className="text-white/30 max-w-md text-base lg:text-xl font-light leading-relaxed">{t.authMsg}</p>
            </div>
            <button 
              onClick={onLoginClick}
              className="w-full md:w-auto px-10 lg:px-14 py-4 lg:py-6 bg-white text-black font-black uppercase tracking-widest text-[10px] lg:text-xs rounded-2xl hover:bg-cyan-500 transition-all shadow-[0_20px_60px_rgba(255,255,255,0.1)] active:scale-95 relative z-10"
            >
              {t.register}
            </button>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="p-8 lg:p-10 rounded-[2rem] lg:rounded-[3rem] glass-effect border border-white/5 group hover:border-cyan-500/40 transition-all cursor-default relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-8 lg:mb-10 relative z-10">
              <div className="p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/5 group-hover:bg-cyan-500/20 transition-all border border-white/5">
                <MessageSquare className="w-8 lg:w-12 h-8 lg:h-12 text-cyan-400" />
              </div>
              <div className="text-[8px] lg:text-[9px] font-black text-cyan-400 bg-cyan-500/10 px-4 lg:px-5 py-2 rounded-full uppercase tracking-[0.2em] lg:tracking-[0.3em] border border-cyan-500/20">{t.activeSession}</div>
            </div>
            <p className="text-5xl lg:text-7xl font-black mb-2 lg:mb-4 relative z-10 font-outfit tracking-tighter">{stats.messages}</p>
            <p className="text-[8px] lg:text-[10px] text-white/30 uppercase tracking-[0.2em] lg:tracking-[0.4em] font-black relative z-10">{t.messagesCount}</p>
            <div className="absolute -right-16 -bottom-16 w-56 h-56 bg-cyan-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </div>

          <div 
            onClick={() => {
              setActiveTool(ToolType.CHAT);
              if (sessions[0]) setActiveSessionId(sessions[0].id);
            }}
            className="p-8 lg:p-10 rounded-[2rem] lg:rounded-[3rem] glass-effect border border-white/5 group hover:border-cyan-500/60 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[250px] lg:min-h-[300px] shadow-2xl"
          >
            <h4 className="text-3xl lg:text-4xl font-black mb-3 lg:mb-4 relative z-10 font-outfit tracking-tighter">{t.newChat}</h4>
            <p className="text-white/30 leading-relaxed mb-8 lg:mb-10 relative z-10 font-light text-base lg:text-lg">{t.chatModuleDesc}</p>
            <div className="flex items-center gap-4 text-[9px] lg:text-[10px] font-black text-cyan-400 group-hover:translate-x-3 transition-all relative z-10 uppercase tracking-[0.2em] lg:tracking-[0.4em]">
              {t.startChat} <ChevronRight className="w-5 lg:w-6 h-5 lg:h-6" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div 
            onClick={() => setActiveTool(ToolType.DATABASE)}
            className="p-8 lg:p-10 rounded-[2rem] lg:rounded-[3rem] glass-effect border border-white/5 group hover:border-blue-500/60 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-end min-h-[250px] lg:min-h-[300px] shadow-2xl"
          >
            <h4 className="text-3xl lg:text-4xl font-black mb-3 lg:mb-4 relative z-10 font-outfit tracking-tighter">{t.database}</h4>
            <p className="text-white/30 leading-relaxed mb-8 lg:mb-10 relative z-10 font-light text-base lg:text-lg">{t.dbModuleDesc}</p>
            <div className="flex items-center gap-4 text-[9px] lg:text-[10px] font-black text-blue-400 group-hover:translate-x-3 transition-all relative z-10 uppercase tracking-[0.2em] lg:tracking-[0.4em]">
              {t.explorer} <ChevronRight className="w-5 lg:w-6 h-5 lg:h-6" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;