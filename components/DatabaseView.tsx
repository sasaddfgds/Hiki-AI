
import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Search, FileText, Calendar, Save, HardDrive } from 'lucide-react';
import { User, UserData } from '../types';
import { DB } from '../services/storageService';
import { translations, Language } from '../translations';

interface DatabaseViewProps {
  currentUser: User | null;
  // Fix: Added language prop to fix TypeScript error in App.tsx
  language: Language;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ currentUser, language }) => {
  const [data, setData] = useState<UserData[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const t = translations[language];

  useEffect(() => {
    if (currentUser) {
      setData(DB.getUserData(currentUser.id));
    }
  }, [currentUser]);

  const refreshData = () => {
    if (currentUser) {
      setData(DB.getUserData(currentUser.id));
    }
  };

  const handleAdd = () => {
    if (!title.trim() || !content.trim() || !currentUser) return;
    const currentData = DB.getUserData(currentUser.id);
    const newItem: UserData = {
      id: `d_${Date.now()}`,
      title,
      content,
      createdAt: Date.now()
    };
    DB.saveUserData(currentUser.id, [newItem, ...currentData]);
    setTitle('');
    setContent('');
    setIsAdding(false);
    refreshData();
  };

  const handleDelete = (id: string) => {
    const confirmMsg = language === 'RU' ? 'Удалить эту запись из базы?' : 'Delete this record from the database?';
    if (currentUser && confirm(confirmMsg)) {
      const currentData = DB.getUserData(currentUser.id);
      DB.saveUserData(currentUser.id, currentData.filter(item => item.id !== id));
      refreshData();
    }
  };

  const filteredData = data.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.content.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#050505]">
        <div className="w-24 h-24 rounded-[2.5rem] bg-cyan-500/10 flex items-center justify-center mb-8 border border-cyan-500/20">
          <Database className="w-12 h-12 text-cyan-400" />
        </div>
        <h2 className="text-4xl font-bold mb-4 font-outfit">
          {language === 'RU' ? 'База данных зашифрована' : 'Database is Encrypted'}
        </h2>
        <p className="text-white/30 max-w-sm mb-12 text-lg font-light">
          {language === 'RU' ? 'Авторизуйтесь в системе Hiki для доступа к защищенному локальному хранилищу ваших данных.' : 'Log in to the Hiki system to access the protected local storage of your data.'}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#050505] p-10 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[2rem] bg-cyan-500 flex items-center justify-center shadow-[0_10px_30px_rgba(6,182,212,0.3)]">
              <HardDrive className="w-8 h-8 text-black" />
            </div>
            <div>
              <h2 className="text-3xl font-bold font-outfit tracking-tight">
                {language === 'RU' ? 'База знаний' : 'Knowledge Base'}
              </h2>
              <p className="text-xs text-cyan-400 uppercase tracking-[0.2em] font-bold">Secure Local Storage DB</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className={`px-8 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-3 shadow-2xl active:scale-95 ${isAdding ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-white text-black hover:bg-cyan-400'}`}
          >
            {isAdding ? (language === 'RU' ? 'Закрыть панель' : 'Close Panel') : <><Plus className="w-5 h-5" /> {language === 'RU' ? 'Новая запись' : 'New Record'}</>}
          </button>
        </header>

        {isAdding && (
          <div className="glass-effect rounded-[3rem] p-10 border border-cyan-500/20 animate-in slide-in-from-top duration-500">
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2">
                    {language === 'RU' ? 'Заголовок записи' : 'Record Title'}
                  </label>
                  <input 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={language === 'RU' ? 'Назовите вашу идею или данные...' : 'Name your idea or data...'}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-sm outline-none focus:border-cyan-500/50 transition-all font-medium"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] px-2">
                    {language === 'RU' ? 'Содержание данных' : 'Data Content'}
                  </label>
                  <textarea 
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={language === 'RU' ? 'Введите текст, который нужно сохранить в защищенную базу...' : 'Enter text to be saved in the secure database...'}
                    className="w-full h-48 bg-white/[0.03] border border-white/10 rounded-3xl py-4 px-6 text-sm outline-none focus:border-cyan-500/50 transition-all resize-none font-medium leading-relaxed"
                  />
                </div>
              </div>
              <button 
                onClick={handleAdd}
                className="w-full py-5 bg-cyan-500 text-black font-bold rounded-2xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/10"
              >
                <Save className="w-5 h-5" /> {language === 'RU' ? 'Записать в систему' : 'Save to System'}
              </button>
            </div>
          </div>
        )}

        <div className="relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/10 group-focus-within:text-cyan-400 transition-colors" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'RU' ? 'Поиск по зашифрованным записям...' : 'Search encrypted records...'}
            className="w-full bg-white/[0.02] border border-white/5 rounded-[1.75rem] py-5 pl-16 pr-8 text-sm outline-none focus:border-cyan-500/20 focus:bg-white/[0.04] transition-all font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredData.length === 0 ? (
            <div className="col-span-full py-32 text-center">
              <div className="w-20 h-20 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-white/10" />
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.4em] text-white/10">
                {language === 'RU' ? 'База данных пуста' : 'Database is Empty'}
              </p>
            </div>
          ) : (
            filteredData.map(item => (
              <div key={item.id} className="glass-effect rounded-[2.5rem] p-8 border border-white/5 hover:border-cyan-500/30 transition-all group relative overflow-hidden flex flex-col min-h-[300px]">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-cyan-500/20 transition-all border border-white/5">
                    <FileText className="w-6 h-6 text-white/20 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-3 text-white/5 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="text-xl font-bold mb-4 group-hover:text-white transition-colors font-outfit tracking-tight">{item.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed line-clamp-4 flex-1 font-light">{item.content}</p>
                <div className="flex items-center gap-3 text-[10px] text-white/20 font-bold uppercase tracking-widest pt-6 mt-6 border-t border-white/5">
                  <Calendar className="w-3 h-3" />
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-1000" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseView;
