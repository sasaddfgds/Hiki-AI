
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings,
  Plus,
  User as UserIcon,
  LogOut,
  Database,
  Trash2,
  Clock,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { ToolType, User, ChatSession } from '../types';
import { translations, Language } from '../translations';
import { DB } from '../services/storageService';

interface SidebarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onLoginClick: () => void;
  language: Language;
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  onDeleteSession: (id: string) => void;
  sessions: ChatSession[];
  setSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTool, 
  setActiveTool, 
  onOpenSettings, 
  onNewChat,
  currentUser,
  onLogout,
  onLoginClick,
  language,
  activeSessionId,
  setActiveSessionId,
  onDeleteSession,
  sessions,
  setSessions
}) => {
  const t = translations[language];
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleDelete = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    onDeleteSession(sid);
  };

  const handleStartEdit = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    if (currentUser && editTitle.trim()) {
      DB.updateSessionTitle(currentUser.id, sid, editTitle.trim());
      setEditingSessionId(null);
      setSessions(DB.getChatSessions(currentUser.id));
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(null);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t.dashboard, type: ToolType.FLOWS },
    { icon: MessageSquare, label: t.chat, type: ToolType.CHAT },
    { icon: Database, label: t.database, type: ToolType.DATABASE },
  ];

  return (
    <aside className="w-72 border-r border-white/10 flex flex-col h-full bg-[#080808] text-sm z-20 shrink-0">
      <div className="p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.1)] overflow-hidden relative group shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&auto=format&fit=crop" 
            alt="Stability Angel Logo" 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale-[0.5] group-hover:grayscale-0"
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-cyan-400/20 blur-[2px] z-20 group-hover:bg-cyan-400/40 transition-colors" />
        </div>
        <div className="flex flex-col">
          <h1 className="font-outfit text-xl font-black tracking-tighter text-white/90 leading-none">
            Hiki <span className="text-white/30">AI</span>
          </h1>
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-cyan-500 mt-1.5 opacity-80">Stability OS</span>
        </div>
      </div>

      <div className="px-4 mb-6">
        <button 
          onClick={onNewChat}
          className="w-full py-4 px-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3 text-white/80 hover:bg-white/10 hover:text-white transition-all group active:scale-[0.98] transform shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
        >
          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
            <Plus className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-black text-[10px] tracking-[0.15em] uppercase">{t.newChat}</span>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <p className="px-4 py-3 text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">{t.explorer}</p>
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              setActiveTool(item.type);
              if (item.type === ToolType.CHAT && !activeSessionId && currentUser) {
                 if (sessions[0]) setActiveSessionId(sessions[0].id);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border ${
              activeTool === item.type 
              ? 'bg-white/10 text-white border-white/5 shadow-lg' 
              : 'text-white/30 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <item.icon className={`w-4 h-4 ${activeTool === item.type ? 'text-cyan-400' : ''}`} />
            <span className="font-bold text-xs tracking-tight">{item.label}</span>
          </button>
        ))}

        {currentUser && sessions.length > 0 && (
          <div className="mt-12 space-y-1 pb-10">
            <p className="px-4 py-3 text-[9px] font-black text-white/20 uppercase tracking-[0.4em] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 opacity-50" /> {t.recentChats}
            </p>
            {sessions.map(session => (
              <div key={session.id} className="relative group/item px-1">
                {editingSessionId === session.id ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-cyan-500/30 animate-in fade-in zoom-in duration-200">
                    <input 
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(e as any, session.id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20"
                      placeholder={t.enterTitle}
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => handleSaveEdit(e, session.id)} className="p-1.5 text-cyan-400 hover:text-white transition-colors"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={handleCancelEdit} className="p-1.5 text-white/20 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setActiveTool(ToolType.CHAT);
                    }}
                    className={`w-full group/btn flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl transition-all border ${
                      activeSessionId === session.id 
                      ? 'bg-cyan-500/5 text-cyan-400 border-cyan-500/10' 
                      : 'text-white/20 hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-30 group-hover/btn:opacity-100 transition-opacity" />
                      <span className="truncate font-semibold text-[11px] tracking-tight">{session.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all duration-300 transform translate-x-1 group-hover/item:translate-x-0">
                      <div 
                        onClick={(e) => handleStartEdit(e, session)}
                        className="p-1.5 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                        title={t.rename}
                      >
                        <Edit2 className="w-3 h-3" />
                      </div>
                      <div 
                        onClick={(e) => handleDelete(e, session.id)}
                        className="p-1.5 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title={t.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="p-4 space-y-2 border-t border-white/5 bg-[#080808]">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-[0.2em]"
        >
          <Settings className="w-4 h-4" />
          <span>{t.settings}</span>
        </button>
        
        <div className="p-3 rounded-2xl glass-effect border border-white/5 bg-white/[0.01]">
          {currentUser ? (
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-white truncate">{currentUser.username}</p>
                  <p className="text-[9px] text-cyan-400 font-black uppercase tracking-[0.2em] opacity-60">Verified Core</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                title={t.logout}
                className="p-2 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all shadow-lg active:scale-95"
            >
              {t.login}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
