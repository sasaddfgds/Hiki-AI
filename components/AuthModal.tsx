
import React, { useState } from 'react';
import { X, User, Lock, ArrowRight, UserPlus, LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { User as UserType } from '../types';
import { DB } from '../services/storageService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (username.trim().length < 3 || password.length < 4) {
        throw new Error('Логин (мин. 3) или пароль (мин. 4) слишком короткие');
      }

      let user: UserType;
      if (isLogin) {
        user = DB.loginUser(username.trim(), password);
      } else {
        user = DB.registerUser(username.trim(), password);
      }

      // Небольшая задержка для эффекта "входа в систему"
      setTimeout(() => {
        onAuthSuccess(user);
        setUsername('');
        setPassword('');
        setLoading(false);
        onClose();
      }, 800);

    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при входе');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
      <div className="relative w-full max-w-md glass-effect border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in duration-300">
        <div className="p-10 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <span className="font-bold text-black text-2xl font-outfit">H</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold font-outfit tracking-tight">
                {isLogin ? 'Авторизация' : 'Регистрация'}
              </h2>
              <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em] opacity-60">Hiki Intelligence OS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/20 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3 animate-bounce">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">Логин пользователя</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-cyan-400 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/10"
                placeholder="Admin"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-2">Пароль системы</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-white/20 group-focus-within:text-cyan-400 transition-colors">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/10"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 group shadow-2xl active:scale-[0.98] transform disabled:opacity-50"
          >
            {loading ? 'Входим...' : isLogin ? 'Авторизоваться' : 'Создать аккаунт'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>

          <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-white/30 hover:text-cyan-400 transition-colors flex items-center gap-2 uppercase tracking-widest"
            >
              {isLogin ? <><UserPlus className="w-3.5 h-3.5" /> Зарегистрировать новый доступ</> : <><LogIn className="w-3.5 h-3.5" /> Уже в системе? Войдите</>}
            </button>
            <div className="flex items-center gap-2 text-[9px] text-white/10 font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3" />
              Secure Encrypted Transaction
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
