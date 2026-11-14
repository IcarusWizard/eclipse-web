import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, AppLanguage } from '../../i18n/LanguageContext';

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

/**
 * Compact EN / 中文 language toggle pill for header, lobby, and waiting room toolbars.
 */
export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
  className = '',
}) => {
  const { language, setLanguage } = useLanguage();

  const handleSelect = (lang: AppLanguage) => {
    if (lang !== language) {
      setLanguage(lang);
    }
  };

  return (
    <div
      data-testid="language-switcher"
      role="group"
      aria-label="Language Switcher"
      className={`inline-flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 select-none shrink-0 ${className}`}
    >
      {!compact && (
        <Globe className="w-3.5 h-3.5 text-slate-400 mx-1.5 shrink-0" />
      )}
      <button
        type="button"
        data-testid="lang-btn-en"
        onClick={() => handleSelect('en')}
        className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
          language === 'en'
            ? 'bg-cyan-500 text-slate-950 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        data-testid="lang-btn-zh"
        onClick={() => handleSelect('zh')}
        className={`px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold transition cursor-pointer ${
          language === 'zh'
            ? 'bg-cyan-500 text-slate-950 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        中文
      </button>
    </div>
  );
};
