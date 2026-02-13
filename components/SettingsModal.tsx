
import React from 'react';
import { X, Palette, Languages, Type, Sliders, Check } from 'lucide-react';
import { Language } from '../translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: string;
  setTheme: (theme: string) => void;
  textSize: string;
  setTextSize: (size: string) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose,
  language,
  setLanguage,
  theme,
  setTheme,
  textSize,
  setTextSize,
  animationsEnabled,
  setAnimationsEnabled
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-effect border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-2xl font-bold font-outfit flex items-center gap-3">
            <Sliders className="w-6 h-6 text-cyan-500" />
            {language === 'RU' ? 'Параметры Hiki' : 'Hiki Settings'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-8 space-y-10">
          {/* Выбор темы */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
              <Palette className="w-4 h-4" /> {language === 'RU' ? 'Визуальная тема' : 'Visual Theme'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Classic', 'Midnight', 'Nebula'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-4 rounded-2xl border text-xs font-bold transition-all relative overflow-hidden group ${
                    theme === t 
                    ? 'border-cyan-500 bg-cyan-500/10 text-white' 
                    : 'border-white/5 bg-white/5 text-white/40 hover:border-white/20'
                  }`}
                >
                  {t}
                  {theme === t && <div className="absolute bottom-1 right-1 w-2 h-2 bg-cyan-500 rounded-full shadow-[0_0_8px_cyan]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Настройки интерфейса */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
              <Sliders className="w-4 h-4" /> {language === 'RU' ? 'Интерфейс' : 'Interface'}
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.07]">
                <div className="flex items-center gap-3">
                  <Languages className="w-5 h-5 text-white/40" />
                  <p className="text-sm font-semibold">{language === 'RU' ? 'Язык системы' : 'System Language'}</p>
                </div>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="bg-transparent text-sm font-bold outline-none cursor-pointer text-cyan-400 px-2"
                >
                  <option value="RU" className="bg-[#080808]">Русский</option>
                  <option value="EN" className="bg-[#080808]">English</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 transition-all hover:bg-white/[0.07]">
                <div className="flex items-center gap-3">
                  <Type className="w-5 h-5 text-white/40" />
                  <p className="text-sm font-semibold">{language === 'RU' ? 'Размер текста' : 'Text Size'}</p>
                </div>
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  {['S', 'M', 'L'].map(size => (
                    <button 
                      key={size} 
                      onClick={() => setTextSize(size)}
                      className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${textSize === size ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-white/20 hover:text-white/40'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Дополнительно */}
          <button 
            onClick={() => setAnimationsEnabled(!animationsEnabled)}
            className="flex items-center gap-4 px-4 py-2 w-full group select-none"
          >
            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${animationsEnabled ? 'bg-cyan-500 border-cyan-500' : 'border-white/20 bg-white/5'}`}>
              {animationsEnabled && <Check className="w-4 h-4 text-black font-black" />}
            </div>
            <p className="text-sm text-white/60 font-medium group-hover:text-white transition-colors">
              {language === 'RU' ? 'Включить расширенную анимацию меню' : 'Enable advanced menu animations'}
            </p>
          </button>
        </div>

        <div className="p-8 bg-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-white text-black font-black rounded-[1.5rem] hover:bg-cyan-500 transition-all text-sm shadow-2xl active:scale-95"
          >
            {language === 'RU' ? 'Применить' : 'Apply Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
