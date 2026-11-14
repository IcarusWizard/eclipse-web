import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type AppLanguage = 'en' | 'zh';

export const LANGUAGE_STORAGE_KEY = 'eclipse_language';

export function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') {
      return urlLang;
    }
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') {
      return stored;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return 'en';
}

export interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  toggleLanguage: () => void;
  /**
   * Inline bilingual selector: returns `zh` when active language is Chinese, else `en`.
   */
  l: (en: string, zh: string) => string;
}

const DEFAULT_CONTEXT: LanguageContextValue = {
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  l: (en: string) => en,
};

const LanguageContext = createContext<LanguageContextValue>(DEFAULT_CONTEXT);

export interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: AppLanguage;
}

/**
 * Provides active UI language ('en' | 'zh') with localStorage persistence and cross-tab sync.
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<AppLanguage>(
    () => initialLanguage ?? readStoredLanguage()
  );

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } catch {
        // Ignore storage write errors
      }
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      }
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  }, [language, setLanguage]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && (e.newValue === 'en' || e.newValue === 'zh')) {
        setLanguageState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      l: (en: string, zh: string) => (language === 'zh' ? zh : en),
    }),
    [language, setLanguage, toggleLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
